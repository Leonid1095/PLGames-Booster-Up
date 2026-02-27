use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};

use dashmap::DashMap;
use tokio::net::UdpSocket;
use tracing::{info, warn};

use crate::metrics::Metrics;

#[derive(Debug)]
pub struct SessionInfo {
    pub session_token: u32,
    pub client_addr: SocketAddr,
    pub game_server_ips: Vec<String>,
    pub game_ports: Vec<u16>,
    /// Current forwarding target (set by control packet or default).
    pub forward_target: Option<SocketAddr>,
    /// Per-session UDP socket for forwarding to game server.
    pub forward_socket: Arc<UdpSocket>,
    pub last_seen: Instant,
    pub packets_in: u64,
    pub packets_out: u64,
    pub bytes_in: u64,
    pub bytes_out: u64,
}

pub struct SessionCache {
    /// session_token → SessionInfo
    sessions: DashMap<u32, SessionInfo>,
    /// local_port (of forward_socket) → session_token (reverse lookup for response routing)
    port_to_token: DashMap<u16, u32>,
    pub max_sessions: usize,
    pub session_timeout: Duration,
    pub metrics: Metrics,
}

impl SessionCache {
    pub fn new(max_sessions: usize, session_timeout: Duration, metrics: Metrics) -> Self {
        Self {
            sessions: DashMap::new(),
            port_to_token: DashMap::new(),
            max_sessions,
            session_timeout,
            metrics,
        }
    }

    pub fn active_count(&self) -> usize {
        self.sessions.len()
    }

    /// Register a new session. Returns the local port of the forward socket, or None on failure.
    pub async fn register(
        &self,
        session_token: u32,
        client_addr: SocketAddr,
        game_server_ips: Vec<String>,
        game_ports: Vec<u16>,
    ) -> Option<u16> {
        if self.sessions.len() >= self.max_sessions {
            warn!(token = session_token, "max sessions reached, rejecting registration");
            return None;
        }

        // Remove existing session with same token if any.
        self.unregister(session_token);

        // Bind ephemeral UDP socket for forwarding.
        let socket = match UdpSocket::bind("0.0.0.0:0").await {
            Ok(s) => s,
            Err(e) => {
                warn!(token = session_token, error = %e, "failed to bind forward socket");
                return None;
            }
        };

        let local_port = match socket.local_addr() {
            Ok(addr) => addr.port(),
            Err(e) => {
                warn!(token = session_token, error = %e, "failed to get local addr");
                return None;
            }
        };

        // Compute default forward target from first IP + first port.
        let forward_target = default_forward_target(&game_server_ips, &game_ports);

        let forward_socket = Arc::new(socket);

        let info = SessionInfo {
            session_token,
            client_addr,
            game_server_ips,
            game_ports,
            forward_target,
            forward_socket,
            last_seen: Instant::now(),
            packets_in: 0,
            packets_out: 0,
            bytes_in: 0,
            bytes_out: 0,
        };

        self.sessions.insert(session_token, info);
        self.port_to_token.insert(local_port, session_token);
        self.metrics.active_sessions.set(self.sessions.len() as i64);

        info!(token = session_token, local_port, "session registered");
        Some(local_port)
    }

    /// Unregister and drop a session. The forward socket is dropped, causing
    /// the response listener task to terminate.
    pub fn unregister(&self, session_token: u32) {
        if let Some((_, info)) = self.sessions.remove(&session_token) {
            if let Ok(addr) = info.forward_socket.local_addr() {
                self.port_to_token.remove(&addr.port());
            }
            self.metrics.active_sessions.set(self.sessions.len() as i64);
            info!(token = session_token, "session unregistered");
        }
    }

    /// Get a reference to session info by token.
    pub fn get(&self, session_token: u32) -> Option<dashmap::mapref::one::Ref<'_, u32, SessionInfo>> {
        self.sessions.get(&session_token)
    }

    /// Get a mutable reference to session info by token.
    pub fn get_mut(
        &self,
        session_token: u32,
    ) -> Option<dashmap::mapref::one::RefMut<'_, u32, SessionInfo>> {
        self.sessions.get_mut(&session_token)
    }

    /// Look up session token by the local port of its forward socket.
    pub fn token_by_port(&self, port: u16) -> Option<u32> {
        self.port_to_token.get(&port).map(|r| *r)
    }

    /// Update the client address for a session (e.g., after NAT rebinding).
    pub fn update_client_addr(&self, session_token: u32, new_addr: SocketAddr) {
        if let Some(mut info) = self.sessions.get_mut(&session_token) {
            info.client_addr = new_addr;
        }
    }

    /// Set the forward target for a session (called from control packets).
    pub fn set_forward_target(&self, session_token: u32, target: SocketAddr) {
        if let Some(mut info) = self.sessions.get_mut(&session_token) {
            info.forward_target = Some(target);
        }
    }

    /// Remove sessions that haven't been seen within session_timeout.
    pub fn cleanup_stale(&self) -> usize {
        let now = Instant::now();
        let timeout = self.session_timeout;
        let mut removed = 0;

        let stale_tokens: Vec<u32> = self
            .sessions
            .iter()
            .filter(|entry| now.duration_since(entry.last_seen) > timeout)
            .map(|entry| entry.session_token)
            .collect();

        for token in stale_tokens {
            self.unregister(token);
            removed += 1;
        }

        if removed > 0 {
            info!(removed, remaining = self.sessions.len(), "cleaned up stale sessions");
        }

        removed
    }
}

/// Parse the first IP + first port into a SocketAddr for the default forward target.
fn default_forward_target(ips: &[String], ports: &[u16]) -> Option<SocketAddr> {
    let ip = ips.first()?;
    let port = ports.first()?;
    let addr: std::net::IpAddr = ip.parse().ok()?;
    Some(SocketAddr::new(addr, *port))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr};

    fn test_metrics() -> Metrics {
        Metrics::new()
    }

    #[tokio::test]
    async fn test_register_and_get() {
        let cache = SessionCache::new(10, Duration::from_secs(300), test_metrics());
        let client = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);

        let port = cache
            .register(
                100,
                client,
                vec!["10.0.0.1".to_string()],
                vec![27015],
            )
            .await;

        assert!(port.is_some());
        assert_eq!(cache.active_count(), 1);

        let session = cache.get(100).unwrap();
        assert_eq!(session.client_addr, client);
        assert_eq!(session.game_ports, vec![27015]);
        assert!(session.forward_target.is_some());
    }

    #[tokio::test]
    async fn test_unregister() {
        let cache = SessionCache::new(10, Duration::from_secs(300), test_metrics());
        let client = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);

        let port = cache
            .register(200, client, vec!["10.0.0.1".to_string()], vec![27015])
            .await
            .unwrap();

        assert_eq!(cache.active_count(), 1);
        assert!(cache.token_by_port(port).is_some());

        cache.unregister(200);
        assert_eq!(cache.active_count(), 0);
        assert!(cache.token_by_port(port).is_none());
    }

    #[tokio::test]
    async fn test_max_sessions() {
        let cache = SessionCache::new(2, Duration::from_secs(300), test_metrics());
        let client = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);

        cache.register(1, client, vec![], vec![]).await;
        cache.register(2, client, vec![], vec![]).await;
        let result = cache.register(3, client, vec![], vec![]).await;
        assert!(result.is_none());
        assert_eq!(cache.active_count(), 2);
    }

    #[tokio::test]
    async fn test_cleanup_stale() {
        let cache = SessionCache::new(10, Duration::from_secs(0), test_metrics());
        let client = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);

        cache.register(1, client, vec![], vec![]).await;
        // timeout=0 means all sessions are stale immediately
        let removed = cache.cleanup_stale();
        assert_eq!(removed, 1);
        assert_eq!(cache.active_count(), 0);
    }

    #[tokio::test]
    async fn test_update_client_addr() {
        let cache = SessionCache::new(10, Duration::from_secs(300), test_metrics());
        let client1 = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);
        let client2 = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(5, 6, 7, 8)), 6000);

        cache
            .register(1, client1, vec![], vec![])
            .await;

        cache.update_client_addr(1, client2);
        let session = cache.get(1).unwrap();
        assert_eq!(session.client_addr, client2);
    }

    #[tokio::test]
    async fn test_port_to_token_lookup() {
        let cache = SessionCache::new(10, Duration::from_secs(300), test_metrics());
        let client = SocketAddr::new(IpAddr::V4(Ipv4Addr::new(1, 2, 3, 4)), 5000);

        let port = cache
            .register(42, client, vec![], vec![])
            .await
            .unwrap();

        assert_eq!(cache.token_by_port(port), Some(42));
        assert_eq!(cache.token_by_port(port + 1), None);
    }

    #[test]
    fn test_default_forward_target() {
        let target = default_forward_target(
            &["192.168.1.1".to_string()],
            &[27015],
        );
        assert_eq!(
            target,
            Some(SocketAddr::new(
                IpAddr::V4(Ipv4Addr::new(192, 168, 1, 1)),
                27015
            ))
        );

        assert!(default_forward_target(&[], &[27015]).is_none());
        assert!(default_forward_target(&["10.0.0.1".to_string()], &[]).is_none());
    }
}
