use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Json},
    routing::{delete, get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tracing::info;

use crate::forwarder::spawn_response_listener;
use crate::session::SessionCache;

/// Shared state for the management API.
pub struct ApiState {
    pub session_cache: Arc<SessionCache>,
    pub api_key: String,
    pub main_socket: Arc<tokio::net::UdpSocket>,
    pub start_time: Instant,
}

#[derive(Deserialize)]
pub struct RegisterRequest {
    pub session_token: u32,
    pub game_server_ips: Vec<String>,
    pub game_ports: Vec<String>,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    pub status: String,
    pub session_token: u32,
    pub local_port: u16,
}

#[derive(Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub active_sessions: usize,
    pub uptime_secs: u64,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// Build the Axum router for the management API.
pub fn build_router(state: Arc<ApiState>) -> Router {
    let protected = Router::new()
        .route("/sessions", post(register_session))
        .route("/sessions/{token}", delete(unregister_session))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            api_key_middleware,
        ));

    Router::new()
        .route("/health", get(health))
        .merge(protected)
        .with_state(state)
}

/// API key middleware — constant-time comparison.
async fn api_key_middleware(
    State(state): State<Arc<ApiState>>,
    headers: HeaderMap,
    request: axum::extract::Request,
    next: Next,
) -> impl IntoResponse {
    let provided = headers
        .get("x-api-key")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    if !constant_time_eq(provided.as_bytes(), state.api_key.as_bytes()) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse {
                error: "invalid api key".to_string(),
            }),
        )
            .into_response();
    }

    next.run(request).await
}

/// Constant-time byte comparison to prevent timing attacks.
fn constant_time_eq(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

async fn register_session(
    State(state): State<Arc<ApiState>>,
    Json(req): Json<RegisterRequest>,
) -> impl IntoResponse {
    let game_ports: Vec<u16> = req
        .game_ports
        .iter()
        .filter_map(|p| p.parse().ok())
        .collect();

    // Use 0.0.0.0:0 as placeholder client_addr — real addr comes from first UDP packet.
    let client_addr = SocketAddr::from(([0, 0, 0, 0], 0));

    let local_port = state
        .session_cache
        .register(
            req.session_token,
            client_addr,
            req.game_server_ips,
            game_ports,
        )
        .await;

    match local_port {
        Some(port) => {
            // Spawn response listener for this session's forward socket.
            if let Some(session) = state.session_cache.get(req.session_token) {
                spawn_response_listener(
                    session.forward_socket.clone(),
                    state.main_socket.clone(),
                    state.session_cache.clone(),
                );
            }

            info!(token = req.session_token, port, "session registered via API");
            (
                StatusCode::OK,
                Json(RegisterResponse {
                    status: "ok".to_string(),
                    session_token: req.session_token,
                    local_port: port,
                }),
            )
                .into_response()
        }
        None => (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ErrorResponse {
                error: "max sessions reached or socket bind failed".to_string(),
            }),
        )
            .into_response(),
    }
}

async fn unregister_session(
    State(state): State<Arc<ApiState>>,
    Path(token): Path<u32>,
) -> impl IntoResponse {
    state.session_cache.unregister(token);
    info!(token, "session unregistered via API");
    (
        StatusCode::OK,
        Json(serde_json::json!({"status": "ok", "session_token": token})),
    )
}

async fn health(State(state): State<Arc<ApiState>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        active_sessions: state.session_cache.active_count(),
        uptime_secs: state.start_time.elapsed().as_secs(),
    })
}
