use std::collections::HashSet;
use std::net::SocketAddr;
use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use tokio::net::UdpSocket;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration, Instant};

use crate::protocol::PlgPacket;

/// Statistics for the proxy session
#[derive(Debug, Clone, serde::Serialize)]
pub struct ProxyStats {
    pub packets_sent: u64,
    pub packets_received: u64,
    pub bytes_sent: u64,
    pub bytes_received: u64,
    pub last_rtt_ms: Option<f64>,
    pub multipath_enabled: bool,
    pub multipath_active: bool,
    pub duplicates_dropped: u64,
}

/// Running UDP proxy instance
pub struct UdpProxy {
    running: Arc<AtomicBool>,
    _seq_counter: Arc<AtomicU32>,
    stats: Arc<RwLock<ProxyStats>>,
    local_port: u16,
}

impl UdpProxy {
    /// Start the UDP proxy.
    ///
    /// - `session_token`: from /api/sessions/start
    /// - `relay_addr`: "node_ip:node_port" (primary)
    /// - `backup_relay_addr`: optional backup relay for multipath
    /// - `game_target`: "game_server_ip:port" (sent as control packet)
    /// - `local_port`: port to bind on localhost (game connects here)
    /// - `multipath_enabled`: if true, send to both relays
    pub async fn start(
        session_token: u32,
        relay_addr: SocketAddr,
        backup_relay_addr: Option<SocketAddr>,
        game_target: &str,
        local_port: u16,
        multipath_enabled: bool,
    ) -> Result<Self, String> {
        let local_bind = format!("127.0.0.1:{}", local_port);
        let local_socket = UdpSocket::bind(&local_bind)
            .await
            .map_err(|e| format!("Failed to bind local UDP socket on {}: {}", local_bind, e))?;

        let relay_socket = UdpSocket::bind("0.0.0.0:0")
            .await
            .map_err(|e| format!("Failed to bind relay UDP socket: {}", e))?;

        // Bind backup relay socket if multipath is enabled
        let backup_relay_socket = if multipath_enabled && backup_relay_addr.is_some() {
            let sock = UdpSocket::bind("0.0.0.0:0")
                .await
                .map_err(|e| format!("Failed to bind backup relay UDP socket: {}", e))?;
            Some(Arc::new(sock))
        } else {
            None
        };

        let actual_multipath = multipath_enabled && backup_relay_addr.is_some() && backup_relay_socket.is_some();

        let actual_port = local_socket.local_addr().unwrap().port();
        log::info!(
            "UDP proxy started: localhost:{} -> relay {} (token={}, multipath={})",
            actual_port,
            relay_addr,
            session_token,
            actual_multipath,
        );
        if let Some(backup) = backup_relay_addr {
            if actual_multipath {
                log::info!("Multipath backup relay: {}", backup);
            }
        }

        let running = Arc::new(AtomicBool::new(true));
        let seq_counter = Arc::new(AtomicU32::new(0));
        let duplicates_dropped = Arc::new(AtomicU64::new(0));
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

        // Shared game address (set by task 1, read by task 2)
        let game_addr: Arc<tokio::sync::Mutex<Option<SocketAddr>>> =
            Arc::new(tokio::sync::Mutex::new(None));

        // Deduplication: track recently seen seq_numbers (for multipath)
        let seen_seqs: Arc<tokio::sync::Mutex<HashSet<u32>>> =
            Arc::new(tokio::sync::Mutex::new(HashSet::new()));

        // Keepalive RTT tracking: seq -> send_time
        let keepalive_sent: Arc<tokio::sync::Mutex<std::collections::HashMap<u32, Instant>>> =
            Arc::new(tokio::sync::Mutex::new(std::collections::HashMap::new()));

        // Send control packet to set forward target on primary relay
        let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
        let control_pkt = PlgPacket::control(session_token, seq, game_target);
        relay_socket
            .send_to(&control_pkt.encode(), relay_addr)
            .await
            .map_err(|e| format!("Failed to send control packet: {}", e))?;
        log::info!("Sent control packet to primary: target={}", game_target);

        // Send control packet to backup relay too
        if let (Some(backup_sock), Some(backup_addr)) = (&backup_relay_socket, backup_relay_addr) {
            let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
            let control_pkt = PlgPacket::control(session_token, seq, game_target);
            if let Err(e) = backup_sock
                .send_to(&control_pkt.encode(), backup_addr)
                .await
            {
                log::warn!("Failed to send control packet to backup relay: {}", e);
            } else {
                log::info!("Sent control packet to backup: target={}", game_target);
            }
        }

        let local_socket = Arc::new(local_socket);
        let relay_socket = Arc::new(relay_socket);

        // Task 1: Game -> Local Socket -> PLG wrap -> Relay(s)
        {
            let running = running.clone();
            let seq_counter = seq_counter.clone();
            let stats = stats.clone();
            let local_socket = local_socket.clone();
            let relay_socket = relay_socket.clone();
            let game_addr = game_addr.clone();
            let backup_relay_socket = backup_relay_socket.clone();

            tokio::spawn(async move {
                let mut buf = [0u8; 65535];

                while running.load(Ordering::SeqCst) {
                    let result = tokio::select! {
                        r = local_socket.recv_from(&mut buf) => r,
                        _ = tokio::time::sleep(Duration::from_millis(100)) => continue,
                    };

                    match result {
                        Ok((len, src)) => {
                            *game_addr.lock().await = Some(src);
                            let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                            let pkt =
                                PlgPacket::data(session_token, seq, buf[..len].to_vec());
                            let encoded = pkt.encode();

                            // Send to primary relay
                            if let Err(e) =
                                relay_socket.send_to(&encoded, relay_addr).await
                            {
                                log::error!("Failed to send to primary relay: {}", e);
                            }

                            // Send duplicate to backup relay (multipath)
                            if let (Some(backup_sock), Some(backup_addr)) = (&backup_relay_socket, backup_relay_addr) {
                                let dup_pkt = PlgPacket::data(session_token, seq, buf[..len].to_vec())
                                    .with_multipath(1);
                                if let Err(e) = backup_sock.send_to(&dup_pkt.encode(), backup_addr).await {
                                    log::error!("Failed to send to backup relay: {}", e);
                                }
                            }

                            let mut s = stats.write().await;
                            s.packets_sent += 1;
                            s.bytes_sent += len as u64;
                        }
                        Err(e) => {
                            if running.load(Ordering::SeqCst) {
                                log::error!("Local socket recv error: {}", e);
                            }
                        }
                    }
                }
            });
        }

        // Task 2: Primary Relay -> PLG unwrap -> dedup -> Local Socket -> Game
        {
            let running = running.clone();
            let stats = stats.clone();
            let local_socket = local_socket.clone();
            let relay_socket = relay_socket.clone();
            let game_addr = game_addr.clone();
            let seen_seqs = seen_seqs.clone();
            let duplicates_dropped = duplicates_dropped.clone();
            let keepalive_sent = keepalive_sent.clone();

            tokio::spawn(async move {
                let mut buf = [0u8; 65535];

                while running.load(Ordering::SeqCst) {
                    let result = tokio::select! {
                        r = relay_socket.recv_from(&mut buf) => r,
                        _ = tokio::time::sleep(Duration::from_millis(100)) => continue,
                    };

                    match result {
                        Ok((len, _src)) => {
                            if let Some(pkt) = PlgPacket::parse(&buf[..len]) {
                                // Handle keepalive response -> measure RTT
                                if pkt.is_keepalive() {
                                    let mut ka = keepalive_sent.lock().await;
                                    if let Some(sent_time) = ka.remove(&pkt.seq_number) {
                                        let rtt = sent_time.elapsed().as_secs_f64() * 1000.0;
                                        let mut s = stats.write().await;
                                        s.last_rtt_ms = Some(rtt);
                                    }
                                    continue;
                                }

                                // Dedup by seq_number
                                {
                                    let mut seen = seen_seqs.lock().await;
                                    if !seen.insert(pkt.seq_number) {
                                        duplicates_dropped.fetch_add(1, Ordering::Relaxed);
                                        continue;
                                    }
                                    // Limit set size: remove old entries when too large
                                    if seen.len() > 10000 {
                                        seen.clear();
                                    }
                                }

                                let addr = *game_addr.lock().await;
                                if let Some(addr) = addr {
                                    if let Err(e) =
                                        local_socket.send_to(&pkt.payload, addr).await
                                    {
                                        log::error!("Failed to send to game: {}", e);
                                    }
                                    let mut s = stats.write().await;
                                    s.packets_received += 1;
                                    s.bytes_received += pkt.payload.len() as u64;
                                    s.duplicates_dropped = duplicates_dropped.load(Ordering::Relaxed);
                                }
                            }
                        }
                        Err(e) => {
                            if running.load(Ordering::SeqCst) {
                                log::error!("Relay socket recv error: {}", e);
                            }
                        }
                    }
                }
            });
        }

        // Task 2b: Backup Relay -> PLG unwrap -> dedup -> Local Socket -> Game
        if let Some(backup_sock) = backup_relay_socket.clone() {
            let running = running.clone();
            let stats = stats.clone();
            let local_socket = local_socket.clone();
            let game_addr = game_addr.clone();
            let seen_seqs = seen_seqs.clone();
            let duplicates_dropped = duplicates_dropped.clone();

            tokio::spawn(async move {
                let mut buf = [0u8; 65535];

                while running.load(Ordering::SeqCst) {
                    let result = tokio::select! {
                        r = backup_sock.recv_from(&mut buf) => r,
                        _ = tokio::time::sleep(Duration::from_millis(100)) => continue,
                    };

                    match result {
                        Ok((len, _src)) => {
                            if let Some(pkt) = PlgPacket::parse(&buf[..len]) {
                                if pkt.is_keepalive() {
                                    continue;
                                }

                                // Dedup by seq_number (shared set with primary)
                                {
                                    let mut seen = seen_seqs.lock().await;
                                    if !seen.insert(pkt.seq_number) {
                                        duplicates_dropped.fetch_add(1, Ordering::Relaxed);
                                        continue;
                                    }
                                    if seen.len() > 10000 {
                                        seen.clear();
                                    }
                                }

                                let addr = *game_addr.lock().await;
                                if let Some(addr) = addr {
                                    if let Err(e) =
                                        local_socket.send_to(&pkt.payload, addr).await
                                    {
                                        log::error!("Failed to send to game (backup path): {}", e);
                                    }
                                    let mut s = stats.write().await;
                                    s.packets_received += 1;
                                    s.bytes_received += pkt.payload.len() as u64;
                                    s.duplicates_dropped = duplicates_dropped.load(Ordering::Relaxed);
                                }
                            }
                        }
                        Err(e) => {
                            if running.load(Ordering::SeqCst) {
                                log::error!("Backup relay socket recv error: {}", e);
                            }
                        }
                    }
                }
            });
        }

        // Task 3: Keepalive every 30 seconds (both relays)
        {
            let running = running.clone();
            let seq_counter = seq_counter.clone();
            let relay_socket = relay_socket.clone();
            let keepalive_sent = keepalive_sent.clone();

            tokio::spawn(async move {
                let mut ticker = interval(Duration::from_secs(30));
                ticker.tick().await; // First tick is immediate, skip it

                while running.load(Ordering::SeqCst) {
                    ticker.tick().await;
                    if !running.load(Ordering::SeqCst) {
                        break;
                    }

                    // Primary keepalive
                    let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                    let pkt = PlgPacket::keepalive(session_token, seq);
                    keepalive_sent.lock().await.insert(seq, Instant::now());
                    if let Err(e) = relay_socket.send_to(&pkt.encode(), relay_addr).await {
                        log::error!("Failed to send keepalive to primary: {}", e);
                    }

                    // Backup keepalive
                    if let (Some(backup_sock), Some(backup_addr)) = (&backup_relay_socket, backup_relay_addr) {
                        let seq = seq_counter.fetch_add(1, Ordering::SeqCst);
                        let pkt = PlgPacket::keepalive(session_token, seq);
                        if let Err(e) = backup_sock.send_to(&pkt.encode(), backup_addr).await {
                            log::error!("Failed to send keepalive to backup: {}", e);
                        }
                    }

                    // Clean old keepalive entries (older than 60s)
                    let mut ka = keepalive_sent.lock().await;
                    ka.retain(|_, t| t.elapsed() < Duration::from_secs(60));
                }
            });
        }

        Ok(Self {
            running,
            _seq_counter: seq_counter,
            stats,
            local_port: actual_port,
        })
    }

    /// Stop the proxy
    pub fn stop(&self) {
        self.running.store(false, Ordering::SeqCst);
        log::info!("UDP proxy stopped (port={})", self.local_port);
    }

    /// Get current stats
    pub async fn get_stats(&self) -> ProxyStats {
        self.stats.read().await.clone()
    }

    /// Get the local port
    pub fn local_port(&self) -> u16 {
        self.local_port
    }

    /// Check if running
    pub fn is_running(&self) -> bool {
        self.running.load(Ordering::SeqCst)
    }
}

impl Drop for UdpProxy {
    fn drop(&mut self) {
        self.stop();
    }
}
