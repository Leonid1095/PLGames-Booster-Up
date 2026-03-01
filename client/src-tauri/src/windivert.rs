/// WinDivert-based transparent UDP interceptor (Windows only).
///
/// Captures outbound game UDP traffic at the kernel level via WinDivert,
/// wraps it in PLG Protocol, sends through relay, and injects responses
/// back into the network stack as if they came from the real game server.

use std::collections::HashMap;
use std::net::{Ipv4Addr, SocketAddr, UdpSocket as StdUdpSocket};
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

use windivert::prelude::*;
use windivert::address::WinDivertAddress;

use crate::filter_builder::build_windivert_filter;
use crate::packet_builder::build_udp_response;
use crate::protocol::PlgPacket;
use crate::udp_proxy::ProxyStats;

/// Connection key for tracking outbound game connections.
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct ConnectionKey {
    local_port: u16,
    remote_ip: Ipv4Addr,
    remote_port: u16,
}

/// Info about an intercepted connection for response routing.
#[derive(Debug, Clone)]
struct ConnectionInfo {
    local_ip: Ipv4Addr,
    last_seen: std::time::Instant,
}

/// Reverse lookup key: (remote_ip, remote_port) → local info.
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
struct ReverseKey {
    remote_ip: Ipv4Addr,
    remote_port: u16,
}

/// WinDivert-based transparent proxy.
pub struct WinDivertProxy {
    running: Arc<AtomicBool>,
    stats: Arc<RwLock<ProxyStats>>,
}

impl WinDivertProxy {
    /// Start the WinDivert proxy.
    ///
    /// - `session_token`: PLG Protocol session token from API
    /// - `relay_addr`: primary relay "ip:port"
    /// - `backup_relay_addr`: optional backup relay for multipath
    /// - `game_server_ips`: CIDR strings from game profile
    /// - `game_ports`: port/range strings from game profile
    /// - `multipath_enabled`: if true, send to both relays
    pub async fn start(
        session_token: u32,
        relay_addr: SocketAddr,
        backup_relay_addr: Option<SocketAddr>,
        game_server_ips: &[String],
        game_ports: &[String],
        multipath_enabled: bool,
    ) -> Result<Self, String> {
        let filter = build_windivert_filter(game_server_ips, game_ports)?;
        log::info!("WinDivert filter: {}", filter);

        let running = Arc::new(AtomicBool::new(true));
        let seq_counter = Arc::new(AtomicU32::new(0));
        let duplicates_dropped = Arc::new(AtomicU64::new(0));
        let actual_multipath = multipath_enabled && backup_relay_addr.is_some();

        let stats = Arc::new(RwLock::new(ProxyStats {
            packets_sent: 0,
            packets_received: 0,
            bytes_sent: 0,
            bytes_received: 0,
            last_rtt_ms: None,
            multipath_enabled: actual_multipath,
            multipath_active: actual_multipath,
            duplicates_dropped: 0,
        }));

        // Connection tracking: (local_port, remote_ip, remote_port) → local_ip
        let connections: Arc<std::sync::RwLock<HashMap<ConnectionKey, ConnectionInfo>>> =
            Arc::new(std::sync::RwLock::new(HashMap::new()));

        // Reverse lookup: (remote_ip, remote_port) → (local_ip, local_port)
        let reverse_map: Arc<std::sync::RwLock<HashMap<ReverseKey, (Ipv4Addr, u16)>>> =
            Arc::new(std::sync::RwLock::new(HashMap::new()));

        // Control target tracking: first intercepted destination is sent as control
        let control_sent: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));

        // Bind relay socket (blocking, used in OS thread)
        let relay_socket = StdUdpSocket::bind("0.0.0.0:0")
            .map_err(|e| format!("Failed to bind relay socket: {}", e))?;
        relay_socket
            .set_nonblocking(false)
            .map_err(|e| format!("Failed to set relay socket blocking: {}", e))?;
        // Set read timeout so we can check `running` periodically
        relay_socket
            .set_read_timeout(Some(std::time::Duration::from_millis(100)))
            .ok();

        let relay_socket = Arc::new(relay_socket);

        // Bind backup relay socket
        let backup_relay_socket = if actual_multipath {
            let sock = StdUdpSocket::bind("0.0.0.0:0")
                .map_err(|e| format!("Failed to bind backup relay socket: {}", e))?;
            sock.set_nonblocking(false).ok();
            sock.set_read_timeout(Some(std::time::Duration::from_millis(100)))
                .ok();
            Some(Arc::new(sock))
        } else {
            None
        };

        // ── Capture Thread: intercept outbound game traffic ─────────
        {
            let running = running.clone();
            let seq_counter = seq_counter.clone();
            let stats = stats.clone();
            let connections = connections.clone();
            let reverse_map = reverse_map.clone();
            let control_sent = control_sent.clone();
            let relay_socket = relay_socket.clone();
            let backup_relay_socket = backup_relay_socket.clone();
            let filter = filter.clone();

            std::thread::spawn(move || {
                let handle = match WinDivert::network(&filter, 0, WinDivertFlags::new()) {
                    Ok(handle) => handle,
                    Err(e) => {
                        log::error!("WinDivert open failed: {}", e);
                        return;
                    }
                };
                if let Err(e) = handle.set_param(WinDivertParam::QueueLength, 8192) {
                    log::warn!("WinDivert set_param QueueLength failed: {}", e);
                }
                let handle = handle;

                log::info!("WinDivert capture thread started");
                let mut buf = vec![0u8; 65535];

                while running.load(Ordering::SeqCst) {
                    let packet = match handle.recv(Some(&mut buf)) {
                        Ok(p) => p,
                        Err(_) => continue,
                    };

                    let data = packet.data;
                    if data.len() < 28 {
                        // Too short for IP + UDP header
                        continue;
                    }

                    // Parse IP header (minimal)
                    let ihl = ((data[0] & 0x0F) as usize) * 4;
                    if data.len() < ihl + 8 {
                        continue;
                    }
                    let protocol = data[9];
                    if protocol != 17 {
                        // Not UDP, re-inject
                        let _ = handle.send(&WinDivertPacket {
                            address: packet.address,
                            data: data.to_vec().into(),
                        });
                        continue;
                    }

                    let src_ip = Ipv4Addr::new(data[12], data[13], data[14], data[15]);
                    let dst_ip = Ipv4Addr::new(data[16], data[17], data[18], data[19]);

                    // Parse UDP header
                    let src_port =
                        u16::from_be_bytes([data[ihl], data[ihl + 1]]);
                    let dst_port =
                        u16::from_be_bytes([data[ihl + 2], data[ihl + 3]]);
                    let udp_payload = &data[ihl + 8..];

                    // Track connection
                    let conn_key = ConnectionKey {
                        local_port: src_port,
                        remote_ip: dst_ip,
                        remote_port: dst_port,
                    };
                    {
                        let mut conns = connections.write().unwrap();
                        conns.insert(
                            conn_key,
                            ConnectionInfo {
                                local_ip: src_ip,
                                last_seen: std::time::Instant::now(),
                            },
                        );
                    }
                    {
                        let mut rev = reverse_map.write().unwrap();
                        rev.insert(
                            ReverseKey {
                                remote_ip: dst_ip,
                                remote_port: dst_port,
                            },
                            (src_ip, src_port),
                        );
                    }

                    // Send control packet on first intercepted packet
                    if !control_sent.swap(true, Ordering::SeqCst) {
                        let target = format!("{}:{}", dst_ip, dst_port);
                        let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                        let ctrl = PlgPacket::control(session_token, seq, &target);
                        let _ = relay_socket.send_to(&ctrl.encode(), relay_addr);
                        log::info!(
                            "WinDivert: sent control packet to primary: target={}",
                            target
                        );

                        if let (Some(backup_sock), Some(backup_addr)) =
                            (&backup_relay_socket, backup_relay_addr)
                        {
                            let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                            let ctrl = PlgPacket::control(session_token, seq, &target);
                            let _ = backup_sock.send_to(&ctrl.encode(), backup_addr);
                            log::info!(
                                "WinDivert: sent control packet to backup: target={}",
                                target
                            );
                        }
                    }

                    // Wrap in PLG and send to relay
                    let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                    let pkt = PlgPacket::data(session_token, seq, udp_payload.to_vec());
                    let encoded = pkt.encode();

                    if let Err(e) = relay_socket.send_to(&encoded, relay_addr) {
                        log::error!("WinDivert: failed to send to primary relay: {}", e);
                    }

                    // Multipath: send duplicate to backup
                    if let (Some(backup_sock), Some(backup_addr)) =
                        (&backup_relay_socket, backup_relay_addr)
                    {
                        let dup = PlgPacket::data(session_token, seq, udp_payload.to_vec())
                            .with_multipath(1);
                        if let Err(e) = backup_sock.send_to(&dup.encode(), backup_addr) {
                            log::error!("WinDivert: failed to send to backup relay: {}", e);
                        }
                    }

                    // Update stats
                    {
                        let stats = stats.clone();
                        let len = udp_payload.len() as u64;
                        // Use try_write to avoid blocking capture thread
                        if let Ok(mut s) = stats.try_write() {
                            s.packets_sent += 1;
                            s.bytes_sent += len;
                        }
                    }

                    // DO NOT re-inject the packet — we consumed it
                }

                log::info!("WinDivert capture thread stopped");
                drop(handle);
            });
        }

        // ── Relay Receive Thread: get responses and inject via WinDivert ─
        {
            let running = running.clone();
            let stats = stats.clone();
            let reverse_map = reverse_map.clone();
            let relay_socket = relay_socket.clone();
            let duplicates_dropped = duplicates_dropped.clone();

            std::thread::spawn(move || {
                // Open a separate WinDivert handle for injection only
                let inject_handle = match WinDivert::network("false", 0, WinDivertFlags::new().set_send_only()) {
                    Ok(handle) => handle,
                    Err(e) => {
                        log::error!("WinDivert inject handle open failed: {}", e);
                        return;
                    }
                };

                let mut seen_seqs: std::collections::HashSet<u32> =
                    std::collections::HashSet::new();
                let mut buf = [0u8; 65535];
                let keepalive_sent: std::sync::Mutex<HashMap<u32, std::time::Instant>> =
                    std::sync::Mutex::new(HashMap::new());

                log::info!("WinDivert relay receive thread started");

                while running.load(Ordering::SeqCst) {
                    let (len, _src) = match relay_socket.recv_from(&mut buf) {
                        Ok(r) => r,
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => continue,
                        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                        Err(e) => {
                            if running.load(Ordering::SeqCst) {
                                log::error!("Relay socket recv error: {}", e);
                            }
                            continue;
                        }
                    };

                    let pkt = match PlgPacket::parse(&buf[..len]) {
                        Some(p) => p,
                        None => continue,
                    };

                    // Handle keepalive response
                    if pkt.is_keepalive() {
                        if let Ok(mut ka) = keepalive_sent.lock() {
                            if let Some(sent_time) = ka.remove(&pkt.seq_number) {
                                let rtt = sent_time.elapsed().as_secs_f64() * 1000.0;
                                if let Ok(mut s) = stats.try_write() {
                                    s.last_rtt_ms = Some(rtt);
                                }
                            }
                        }
                        continue;
                    }

                    // Dedup by seq_number
                    if !seen_seqs.insert(pkt.seq_number) {
                        duplicates_dropped.fetch_add(1, Ordering::Relaxed);
                        continue;
                    }
                    if seen_seqs.len() > 10000 {
                        seen_seqs.clear();
                    }

                    // Look up original connection for response routing
                    // For now, use the first entry in reverse_map
                    // (works well for single-game-server scenarios)
                    let (local_ip, local_port, remote_ip, remote_port) = {
                        let rev = reverse_map.read().unwrap();
                        if let Some((&ref rkey, &(lip, lport))) = rev.iter().next() {
                            (lip, lport, rkey.remote_ip, rkey.remote_port)
                        } else {
                            log::warn!("WinDivert: no connection info for response routing");
                            continue;
                        }
                    };

                    // Build raw IP+UDP packet: game_server → local_machine
                    let raw_pkt = build_udp_response(
                        remote_ip,   // src = game server
                        local_ip,    // dst = local machine
                        remote_port, // src port = game server port
                        local_port,  // dst port = local app port
                        &pkt.payload,
                    );

                    // Inject as inbound packet
                    // Safety: zeroed address is valid for inbound injection
                    let addr = unsafe { <WinDivertAddress<windivert::layer::NetworkLayer>>::new() };

                    if let Err(e) = inject_handle.send(&WinDivertPacket {
                        address: addr,
                        data: raw_pkt.into(),
                    }) {
                        log::error!("WinDivert: inject failed: {}", e);
                    }

                    // Update stats
                    if let Ok(mut s) = stats.try_write() {
                        s.packets_received += 1;
                        s.bytes_received += pkt.payload.len() as u64;
                        s.duplicates_dropped = duplicates_dropped.load(Ordering::Relaxed);
                    }
                }

                log::info!("WinDivert relay receive thread stopped");
            });
        }

        // ── Backup Relay Receive Thread (multipath) ────────────────
        if let Some(backup_sock) = backup_relay_socket.clone() {
            let running = running.clone();
            let stats = stats.clone();
            let reverse_map = reverse_map.clone();
            let duplicates_dropped = duplicates_dropped.clone();

            std::thread::spawn(move || {
                let inject_handle = match WinDivert::network("false", 0, WinDivertFlags::new().set_send_only()) {
                    Ok(handle) => handle,
                    Err(e) => {
                        log::error!("WinDivert backup inject handle open failed: {}", e);
                        return;
                    }
                };

                let mut seen_seqs: std::collections::HashSet<u32> =
                    std::collections::HashSet::new();
                let mut buf = [0u8; 65535];

                while running.load(Ordering::SeqCst) {
                    let (len, _src) = match backup_sock.recv_from(&mut buf) {
                        Ok(r) => r,
                        Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => continue,
                        Err(ref e) if e.kind() == std::io::ErrorKind::TimedOut => continue,
                        Err(e) => {
                            if running.load(Ordering::SeqCst) {
                                log::error!("Backup relay recv error: {}", e);
                            }
                            continue;
                        }
                    };

                    let pkt = match PlgPacket::parse(&buf[..len]) {
                        Some(p) => p,
                        None => continue,
                    };

                    if pkt.is_keepalive() {
                        continue;
                    }

                    if !seen_seqs.insert(pkt.seq_number) {
                        duplicates_dropped.fetch_add(1, Ordering::Relaxed);
                        continue;
                    }
                    if seen_seqs.len() > 10000 {
                        seen_seqs.clear();
                    }

                    let (local_ip, local_port, remote_ip, remote_port) = {
                        let rev = reverse_map.read().unwrap();
                        if let Some((&ref rkey, &(lip, lport))) = rev.iter().next() {
                            (lip, lport, rkey.remote_ip, rkey.remote_port)
                        } else {
                            continue;
                        }
                    };

                    let raw_pkt = build_udp_response(
                        remote_ip, local_ip, remote_port, local_port, &pkt.payload,
                    );

                    let addr = unsafe { WinDivertAddress::new() };
                    let _ = inject_handle.send(&WinDivertPacket {
                        address: addr,
                        data: raw_pkt.into(),
                    });

                    if let Ok(mut s) = stats.try_write() {
                        s.packets_received += 1;
                        s.bytes_received += pkt.payload.len() as u64;
                        s.duplicates_dropped = duplicates_dropped.load(Ordering::Relaxed);
                    }
                }
            });
        }

        // ── Keepalive Task (tokio) ──────────────────────────────────
        {
            let running = running.clone();
            let seq_counter = seq_counter.clone();
            let relay_socket = relay_socket.clone();
            let backup_relay_socket = backup_relay_socket.clone();
            let stats = stats.clone();

            tokio::spawn(async move {
                let mut ticker = tokio::time::interval(tokio::time::Duration::from_secs(30));
                ticker.tick().await; // Skip immediate first tick

                // Track keepalive RTTs
                let mut keepalive_times: HashMap<u32, tokio::time::Instant> = HashMap::new();

                while running.load(Ordering::SeqCst) {
                    ticker.tick().await;
                    if !running.load(Ordering::SeqCst) {
                        break;
                    }

                    // Primary keepalive
                    let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                    let pkt = PlgPacket::keepalive(session_token, seq);
                    keepalive_times.insert(seq, tokio::time::Instant::now());
                    let _ = relay_socket.send_to(&pkt.encode(), relay_addr);

                    // Backup keepalive
                    if let (Some(backup_sock), Some(backup_addr)) =
                        (&backup_relay_socket, backup_relay_addr)
                    {
                        let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                        let pkt = PlgPacket::keepalive(session_token, seq);
                        let _ = backup_sock.send_to(&pkt.encode(), backup_addr);
                    }

                    // Clean old entries
                    keepalive_times.retain(|_, t| t.elapsed() < tokio::time::Duration::from_secs(60));
                }
            });
        }

        log::info!(
            "WinDivert proxy started (relay={}, multipath={})",
            relay_addr,
            actual_multipath
        );

        Ok(Self { running, stats })
    }

    /// Stop the WinDivert proxy.
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        log::info!("WinDivert proxy stopped");
    }

    /// Get current proxy statistics.
    pub async fn get_stats(&self) -> ProxyStats {
        self.stats.read().await.clone()
    }

    /// Check if proxy is currently running.
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

impl Drop for WinDivertProxy {
    fn drop(&mut self) {
        self.stop();
    }
}
