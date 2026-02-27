use std::sync::Arc;
use std::time::Instant;

use socket2::{Domain, Protocol, Socket, Type};
use tokio::net::UdpSocket;
use tracing::info;

mod api;
mod config;
mod forwarder;
mod metrics;
mod protocol;
mod session;

use config::Config;
use metrics::Metrics;
use session::SessionCache;

const SOCKET_BUF_SIZE: usize = 4 * 1024 * 1024; // 4 MB

#[tokio::main]
async fn main() {
    // Load configuration.
    let config = Config::from_env();

    // Init tracing.
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    info!("PLG Relay Server v0.1.0 starting...");
    info!(
        relay_port = config.relay_port,
        api_port = config.api_port,
        metrics_port = config.metrics_port,
        max_sessions = config.max_sessions,
        session_timeout_secs = config.session_timeout.as_secs(),
    );

    // Init metrics.
    let metrics = Metrics::new();

    // Create session cache.
    let session_cache = Arc::new(SessionCache::new(
        config.max_sessions,
        config.session_timeout,
        metrics.clone(),
    ));

    // Bind main UDP socket with optimized buffer sizes via socket2.
    let main_socket = bind_udp_socket(config.relay_port);
    let main_socket = Arc::new(main_socket);
    info!(port = config.relay_port, "UDP socket bound");

    // Spawn client listener task.
    let listener_socket = main_socket.clone();
    let listener_cache = session_cache.clone();
    let listener_metrics = metrics.clone();
    tokio::spawn(async move {
        forwarder::client_listener(listener_socket, listener_cache, listener_metrics).await;
    });

    // Spawn stale session cleanup task (every 60s).
    let cleanup_cache = session_cache.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            interval.tick().await;
            cleanup_cache.cleanup_stale();
        }
    });

    // Spawn metrics HTTP server.
    let metrics_clone = metrics.clone();
    let metrics_port = config.metrics_port;
    tokio::spawn(async move {
        let app = axum::Router::new().route(
            "/metrics",
            axum::routing::get(move || {
                let m = metrics_clone.clone();
                async move { m.gather() }
            }),
        );

        let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", metrics_port))
            .await
            .expect("failed to bind metrics port");
        info!(port = metrics_port, "metrics server started");
        axum::serve(listener, app).await.unwrap();
    });

    // Run management API (blocks).
    let api_state = Arc::new(api::ApiState {
        session_cache,
        api_key: config.api_key,
        main_socket,
        start_time: Instant::now(),
    });

    let api_router = api::build_router(api_state);
    let api_listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.api_port))
        .await
        .expect("failed to bind API port");
    info!(port = config.api_port, "management API started");
    axum::serve(api_listener, api_router).await.unwrap();
}

/// Bind a UDP socket with optimized SO_RCVBUF/SO_SNDBUF using socket2.
fn bind_udp_socket(port: u16) -> UdpSocket {
    let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))
        .expect("failed to create socket");

    // Set buffer sizes before binding.
    if let Err(e) = socket.set_recv_buffer_size(SOCKET_BUF_SIZE) {
        tracing::warn!(error = %e, "failed to set SO_RCVBUF (may need sysctl tuning)");
    }
    if let Err(e) = socket.set_send_buffer_size(SOCKET_BUF_SIZE) {
        tracing::warn!(error = %e, "failed to set SO_SNDBUF (may need sysctl tuning)");
    }

    socket.set_reuse_address(true).ok();
    socket.set_nonblocking(true).expect("failed to set nonblocking");

    let addr: std::net::SocketAddr = format!("0.0.0.0:{}", port).parse().unwrap();
    socket
        .bind(&addr.into())
        .unwrap_or_else(|e| panic!("failed to bind UDP :{} — {}", port, e));

    let std_socket: std::net::UdpSocket = socket.into();
    UdpSocket::from_std(std_socket).expect("failed to convert to tokio UdpSocket")
}
