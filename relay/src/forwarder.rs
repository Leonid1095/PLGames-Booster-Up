use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;

use tokio::net::UdpSocket;
use tracing::{debug, trace, warn};

use crate::metrics::Metrics;
use crate::protocol::{PlgPacket, FLAG_CONTROL, FLAG_KEEPALIVE, HEADER_SIZE};
use crate::session::SessionCache;

/// Main client listener loop.
/// Receives PLG packets on the main UDP socket (:443), validates sessions,
/// and forwards payloads to game servers via per-session sockets.
pub async fn client_listener(
    main_socket: Arc<UdpSocket>,
    session_cache: Arc<SessionCache>,
    metrics: Metrics,
) {
    let mut buf = [0u8; 65535];

    loop {
        let (len, client_addr) = match main_socket.recv_from(&mut buf).await {
            Ok(result) => result,
            Err(e) => {
                warn!(error = %e, "recv_from error on main socket");
                continue;
            }
        };

        metrics.packets_received.inc();

        let packet = match PlgPacket::parse(&buf[..len]) {
            Some(p) => p,
            None => {
                metrics.packets_dropped.inc();
                trace!(len, %client_addr, "dropped: packet too short");
                continue;
            }
        };

        let token = packet.session_id;

        // Look up session.
        let mut session = match session_cache.get_mut(token) {
            Some(s) => s,
            None => {
                metrics.invalid_sessions.inc();
                trace!(token, %client_addr, "dropped: unknown session");
                continue;
            }
        };

        // Update client address (handles NAT rebinding) and last_seen.
        if session.client_addr != client_addr {
            session.client_addr = client_addr;
        }
        session.last_seen = std::time::Instant::now();
        session.packets_in += 1;
        session.bytes_in += len as u64;

        // Handle keepalive — no forwarding needed.
        if packet.flags & FLAG_KEEPALIVE != 0 {
            metrics.keepalives.inc();
            trace!(token, "keepalive received");
            continue;
        }

        // Handle control packet — set forward target.
        if packet.flags & FLAG_CONTROL != 0 {
            if let Some(target) = parse_control_payload(&packet.payload) {
                // Validate target is in allowed game server IPs.
                let ip_str = target.ip().to_string();
                if session.game_server_ips.contains(&ip_str) {
                    session.forward_target = Some(target);
                    debug!(token, %target, "forward target updated via control packet");
                } else {
                    warn!(token, %target, "control packet target not in allowed IPs");
                    metrics.packets_dropped.inc();
                }
            } else {
                warn!(token, "invalid control packet payload");
                metrics.packets_dropped.inc();
            }
            continue;
        }

        // Data packet — forward payload to game server.
        let forward_target = match session.forward_target {
            Some(t) => t,
            None => {
                metrics.packets_dropped.inc();
                trace!(token, "dropped: no forward target set");
                continue;
            }
        };

        let forward_socket = session.forward_socket.clone();
        let payload = &packet.payload;

        // Release the lock before async send.
        drop(session);

        match forward_socket.send_to(payload, forward_target).await {
            Ok(sent) => {
                metrics.packets_forwarded.inc();
                metrics.bytes_forwarded.inc_by(sent as u64);
            }
            Err(e) => {
                metrics.packets_dropped.inc();
                warn!(token, %forward_target, error = %e, "failed to forward packet");
            }
        }
    }
}

/// Spawn a response listener for a per-session forward socket.
/// Reads responses from game server and wraps them in PLG headers,
/// then sends back to the client via the main socket.
pub fn spawn_response_listener(
    forward_socket: Arc<UdpSocket>,
    main_socket: Arc<UdpSocket>,
    session_cache: Arc<SessionCache>,
) {
    tokio::spawn(async move {
        let mut buf = [0u8; 65535];

        let local_port = match forward_socket.local_addr() {
            Ok(addr) => addr.port(),
            Err(_) => return,
        };

        loop {
            let (len, _game_addr) = match forward_socket.recv_from(&mut buf).await {
                Ok(result) => result,
                Err(_) => {
                    // Socket closed (session dropped) — exit task.
                    debug!(local_port, "response listener exiting (socket closed)");
                    return;
                }
            };

            // Look up session token from local port.
            let token = match session_cache.token_by_port(local_port) {
                Some(t) => t,
                None => {
                    // Session was removed, exit.
                    return;
                }
            };

            // Get client address and update stats.
            let client_addr = {
                let mut session = match session_cache.get_mut(token) {
                    Some(s) => s,
                    None => return,
                };
                session.packets_out += 1;
                session.bytes_out += (HEADER_SIZE + len) as u64;
                session.client_addr
            };

            // Don't send to placeholder address.
            if client_addr.port() == 0 {
                continue;
            }

            // Wrap response in PLG header.
            let response_packet = PlgPacket {
                session_id: token,
                seq_number: 0, // Response packets use seq=0 (client tracks its own seq).
                flags: 0,
                path_id: 0,
                payload: buf[..len].to_vec(),
            };

            let data = response_packet.serialize();

            if let Err(e) = main_socket.send_to(&data, client_addr).await {
                warn!(token, %client_addr, error = %e, "failed to send response to client");
            }

            session_cache.metrics.packets_forwarded.inc();
            session_cache
                .metrics
                .bytes_forwarded
                .inc_by(data.len() as u64);
        }
    });
}

/// Parse control packet payload: `{dest_ip}:{dest_port}` as UTF-8 string.
/// Format: "192.168.1.1:27015"
fn parse_control_payload(payload: &[u8]) -> Option<SocketAddr> {
    let s = std::str::from_utf8(payload).ok()?;
    let parts: Vec<&str> = s.splitn(2, ':').collect();
    if parts.len() != 2 {
        return None;
    }
    let ip: IpAddr = parts[0].parse().ok()?;
    let port: u16 = parts[1].parse().ok()?;
    Some(SocketAddr::new(ip, port))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_control_payload() {
        let payload = b"192.168.1.1:27015";
        let addr = parse_control_payload(payload).unwrap();
        assert_eq!(addr.ip().to_string(), "192.168.1.1");
        assert_eq!(addr.port(), 27015);
    }

    #[test]
    fn test_parse_control_payload_ipv6() {
        // IPv6 is not expected in current use but function should handle it if formatted correctly
        let payload = b"::1:27015";
        // This won't parse as valid since splitn on ':' breaks IPv6
        // That's fine — we only support IPv4 game servers for now
        assert!(parse_control_payload(payload).is_none());
    }

    #[test]
    fn test_parse_control_payload_invalid() {
        assert!(parse_control_payload(b"invalid").is_none());
        assert!(parse_control_payload(b"").is_none());
        assert!(parse_control_payload(b"192.168.1.1").is_none());
        assert!(parse_control_payload(b"192.168.1.1:abc").is_none());
    }
}
