use std::sync::Arc;
use std::time::Instant;

use socket2::{Domain, Protocol, Socket, Type};
use tokio::net::UdpSocket;
use tokio_util::sync::CancellationToken;
use tracing::{error, info};

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
    let config = match Config::try_from_env() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Configuration error: {e}");
            std::process::exit(1);
        }
    };

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

    // Graceful shutdown token.
    let cancel = CancellationToken::new();

    // Init metrics.
    let metrics = Metrics::new();

    // Create session cache.
    let session_cache = Arc::new(SessionCache::new(
        config.max_sessions,
        config.session_timeout,
        metrics.clone(),
    ));

    // Bind main UDP socket with optimized buffer sizes via socket2.
    let main_socket = match bind_udp_socket(config.relay_port) {
        Ok(s) => Arc::new(s),
        Err(e) => {
            error!(port = config.relay_port, error = %e, "failed to bind UDP socket");
            std::process::exit(1);
        }
    };
    info!(port = config.relay_port, "UDP socket bound");

    // Spawn client listener task.
    let listener_socket = main_socket.clone();
    let listener_cache = session_cache.clone();
    let listener_metrics = metrics.clone();
    let listener_cancel = cancel.clone();
    tokio::spawn(async move {
        tokio::select! {
            _ = forwarder::client_listener(listener_socket, listener_cache, listener_metrics) => {}
            _ = listener_cancel.cancelled() => {
                info!("client listener shutting down");
            }
        }
    });

    // Spawn stale session cleanup task (every 60s).
    let cleanup_cache = session_cache.clone();
    let cleanup_cancel = cancel.clone();
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(std::time::Duration::from_secs(60));
        loop {
            tokio::select! {
                _ = interval.tick() => {
                    cleanup_cache.cleanup_stale();
                }
                _ = cleanup_cancel.cancelled() => {
                    info!("cleanup task shutting down");
                    return;
                }
            }
        }
    });

    // Spawn metrics HTTP server.
    let metrics_clone = metrics.clone();
    let metrics_port = config.metrics_port;
    let metrics_cancel = cancel.clone();
    tokio::spawn(async move {
        let app = axum::Router::new().route(
            "/metrics",
            axum::routing::get(move || {
                let m = metrics_clone.clone();
                async move { m.gather() }
            }),
        );

        let listener = match tokio::net::TcpListener::bind(format!("0.0.0.0:{}", metrics_port)).await {
            Ok(l) => l,
            Err(e) => {
                error!(port = metrics_port, error = %e, "failed to bind metrics port");
                return;
            }
        };
        info!(port = metrics_port, "metrics server started");
        axum::serve(listener, app)
            .with_graceful_shutdown(metrics_cancel.cancelled_owned())
            .await
            .ok();
    });

    // Run management API.
    let api_state = Arc::new(api::ApiState {
        session_cache,
        api_key: config.api_key,
        main_socket,
        start_time: Instant::now(),
    });

    let api_router = api::build_router(api_state);
    let api_listener = match tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.api_port)).await {
        Ok(l) => l,
        Err(e) => {
            error!(port = config.api_port, error = %e, "failed to bind API port");
            std::process::exit(1);
        }
    };
    info!(port = config.api_port, "management API started");

    // Wait for either the API server or a shutdown signal.
    let api_cancel = cancel.clone();
    tokio::select! {
        result = axum::serve(api_listener, api_router).with_graceful_shutdown(api_cancel.cancelled_owned()) => {
            if let Err(e) = result {
                error!(error = %e, "API server error");
            }
        }
        _ = shutdown_signal() => {
            info!("shutdown signal received, stopping...");
            cancel.cancel();
            // Give tasks a moment to finish.
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }
    }

    info!("PLG Relay Server stopped");
}

async fn shutdown_signal() {
    let ctrl_c = tokio::signal::ctrl_c();

    #[cfg(unix)]
    {
        let mut sigterm = tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install SIGTERM handler");
        tokio::select! {
            _ = ctrl_c => {}
            _ = sigterm.recv() => {}
        }
    }

    #[cfg(not(unix))]
    {
        ctrl_c.await.ok();
    }
}

/// Bind a UDP socket with optimized SO_RCVBUF/SO_SNDBUF using socket2.
fn bind_udp_socket(port: u16) -> Result<UdpSocket, String> {
    let socket = Socket::new(Domain::IPV4, Type::DGRAM, Some(Protocol::UDP))
        .map_err(|e| format!("failed to create socket: {e}"))?;

    // Set buffer sizes before binding.
    if let Err(e) = socket.set_recv_buffer_size(SOCKET_BUF_SIZE) {
        tracing::warn!(error = %e, "failed to set SO_RCVBUF (may need sysctl tuning)");
    }
    if let Err(e) = socket.set_send_buffer_size(SOCKET_BUF_SIZE) {
        tracing::warn!(error = %e, "failed to set SO_SNDBUF (may need sysctl tuning)");
    }

    socket.set_reuse_address(true).ok();
    socket
        .set_nonblocking(true)
        .map_err(|e| format!("failed to set nonblocking: {e}"))?;

    let addr: std::net::SocketAddr = format!("0.0.0.0:{}", port)
        .parse()
        .map_err(|e| format!("failed to parse address: {e}"))?;
    socket
        .bind(&addr.into())
        .map_err(|e| format!("failed to bind UDP :{port} — {e}"))?;

    let std_socket: std::net::UdpSocket = socket.into();
    UdpSocket::from_std(std_socket).map_err(|e| format!("failed to convert to tokio UdpSocket: {e}"))
}
