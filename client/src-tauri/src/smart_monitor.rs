use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{interval, Duration};

use crate::api_client::{ApiClient, GameProfile, NodeInfo};
use crate::commands::AppState;
use crate::config::AppConfig;
use crate::game_detector;

/// Events emitted to frontend
const EVENT_GAME_DETECTED: &str = "smart:game-detected";
const EVENT_GAME_CLOSED: &str = "smart:game-closed";
const EVENT_AUTO_CONNECTED: &str = "smart:auto-connected";
const EVENT_AUTO_DISCONNECTED: &str = "smart:auto-disconnected";
const EVENT_BEST_NODE: &str = "smart:best-node";

#[derive(Clone, serde::Serialize)]
pub struct GameDetectedPayload {
    pub game: GameProfile,
    pub best_node: Option<NodeInfo>,
    pub auto_connecting: bool,
}

#[derive(Clone, serde::Serialize)]
pub struct AutoConnectedPayload {
    pub game_name: String,
    pub node_name: String,
    pub local_port: u16,
}

#[derive(Clone, serde::Serialize)]
pub struct BestNodePayload {
    pub node: NodeInfo,
    pub ping_ms: f64,
}

/// Start the background smart monitor.
/// Scans processes every 10 seconds. When a game is detected:
/// 1. Emits `smart:game-detected` event
/// 2. If auto_connect is enabled, pings all nodes and auto-connects
/// 3. When game closes, auto-disconnects
pub fn start_smart_monitor(app: &AppHandle) {
    let app_handle = app.clone();
    let running = Arc::new(AtomicBool::new(true));
    let running_clone = running.clone();

    tokio::spawn(async move {
        let mut ticker = interval(Duration::from_secs(10));
        let mut system = sysinfo::System::new();
        let mut last_detected_slug: Option<String> = None;
        let mut games_cache: Vec<GameProfile> = vec![];
        let mut cache_time = std::time::Instant::now();

        loop {
            ticker.tick().await;
            if !running_clone.load(Ordering::SeqCst) {
                break;
            }

            // Check if user is authenticated
            let state = match app_handle.try_state::<AppState>() {
                Some(s) => s,
                None => continue,
            };
            let has_tokens = state.tokens.lock().unwrap().is_some();
            if !has_tokens {
                last_detected_slug = None;
                continue;
            }

            // Refresh games cache every 5 minutes
            if games_cache.is_empty() || cache_time.elapsed() > std::time::Duration::from_secs(300)
            {
                match state.api.get_games(None, None).await {
                    Ok(resp) => {
                        games_cache = resp.items;
                        cache_time = std::time::Instant::now();
                        log::debug!("Smart monitor: cached {} games", games_cache.len());
                    }
                    Err(e) => {
                        log::warn!("Smart monitor: failed to fetch games: {}", e);
                        continue;
                    }
                }
            }

            // Scan processes
            let detected = game_detector::detect_running_game(&mut system, &games_cache);

            match detected {
                Some(game) => {
                    let slug = game.slug.clone();

                    // Game was already detected — skip
                    if last_detected_slug.as_deref() == Some(&slug) {
                        continue;
                    }

                    log::info!("Smart monitor: detected game '{}'", game.name);
                    last_detected_slug = Some(slug.clone());

                    // Check if already boosting
                    {
                        let proxy = state.active_proxy.lock().await;
                        if proxy.is_some() {
                            log::debug!("Smart monitor: already boosting, skip auto-connect");
                            continue;
                        }
                    }

                    // Read config for auto_connect setting
                    let config = app_handle
                        .try_state::<std::sync::Mutex<AppConfig>>()
                        .map(|c| c.lock().unwrap().clone())
                        .unwrap_or_default();

                    // Find best node by pinging all
                    let best_node = find_best_node(&state.api).await;

                    if let Some((node, ping)) = &best_node {
                        let _ = app_handle.emit(
                            EVENT_BEST_NODE,
                            BestNodePayload {
                                node: node.clone(),
                                ping_ms: *ping,
                            },
                        );
                    }

                    let best_node_info = best_node.map(|(n, _)| n);

                    // Emit game-detected event
                    let _ = app_handle.emit(
                        EVENT_GAME_DETECTED,
                        GameDetectedPayload {
                            game: game.clone(),
                            best_node: best_node_info.clone(),
                            auto_connecting: config.auto_connect,
                        },
                    );

                    // Auto-connect if enabled
                    if config.auto_connect {
                        if let Some(node) = best_node_info {
                            let result = auto_connect(
                                &app_handle,
                                &state,
                                &game,
                                &node,
                                config.multipath,
                            )
                            .await;

                            match result {
                                Ok(port) => {
                                    log::info!(
                                        "Smart monitor: auto-connected {} via {} on port {}",
                                        game.name,
                                        node.name,
                                        port
                                    );
                                    let _ = app_handle.emit(
                                        EVENT_AUTO_CONNECTED,
                                        AutoConnectedPayload {
                                            game_name: game.name.clone(),
                                            node_name: node.name.clone(),
                                            local_port: port,
                                        },
                                    );
                                }
                                Err(e) => {
                                    log::error!("Smart monitor: auto-connect failed: {}", e);
                                }
                            }
                        }
                    }
                }
                None => {
                    // Game was running but now closed
                    if last_detected_slug.is_some() {
                        log::info!("Smart monitor: game closed");
                        last_detected_slug = None;

                        let _ = app_handle.emit(EVENT_GAME_CLOSED, ());

                        // Auto-disconnect
                        let has_proxy = {
                            let proxy = state.active_proxy.lock().await;
                            proxy.is_some()
                        };

                        if has_proxy {
                            // Stop proxy
                            {
                                let mut proxy = state.active_proxy.lock().await;
                                if let Some(p) = proxy.take() {
                                    p.stop();
                                }
                            }

                            // Stop API session
                            let session_id = state.active_session_id.lock().unwrap().take();
                            if let Some(sid) = &session_id {
                                let tokens = state.tokens.lock().unwrap().clone();
                                if let Some(tokens) = tokens {
                                    let _ = crate::api_client::with_auto_refresh(
                                        &state.api,
                                        &tokens,
                                        |t| {
                                            let api = &state.api;
                                            let token = t.to_string();
                                            let session_id = sid.clone();
                                            async move {
                                                api.stop_session(&token, &session_id).await
                                            }
                                        },
                                    )
                                    .await;
                                }
                            }

                            log::info!("Smart monitor: auto-disconnected");
                            let _ = app_handle.emit(EVENT_AUTO_DISCONNECTED, ());
                        }
                    }
                }
            }
        }
    });
}

/// Ping all active nodes and return the one with lowest latency
async fn find_best_node(api: &ApiClient) -> Option<(NodeInfo, f64)> {
    let nodes = match api.get_nodes().await {
        Ok(n) => n,
        Err(_) => return None,
    };

    let active_nodes: Vec<&NodeInfo> = nodes
        .iter()
        .filter(|n| n.status == "active" || n.status == "online")
        .collect();

    if active_nodes.is_empty() {
        return nodes.first().map(|n| (n.clone(), 999.0));
    }

    let mut best: Option<(NodeInfo, f64)> = None;

    for node in active_nodes {
        match api.ping_node(&node.id).await {
            Ok(resp) => {
                if let Some(ping) = resp.ping_ms {
                    if best.is_none() || ping < best.as_ref().unwrap().1 {
                        best = Some((node.clone(), ping));
                    }
                }
            }
            Err(e) => {
                log::debug!("Smart monitor: ping {} failed: {}", node.name, e);
            }
        }
    }

    // Fallback to first node if all pings failed
    best.or_else(|| nodes.first().map(|n| (n.clone(), 999.0)))
}

/// Auto-connect: create session + start UDP proxy
async fn auto_connect(
    _app: &AppHandle,
    state: &AppState,
    game: &GameProfile,
    node: &NodeInfo,
    multipath: bool,
) -> Result<u16, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let request = crate::api_client::SessionStartRequest {
        game_slug: game.slug.clone(),
        node_id: node.id.clone(),
        multipath: Some(multipath),
    };

    let (session_resp, new_tokens) =
        crate::api_client::with_auto_refresh(&state.api, &tokens, |t| {
            let api = &state.api;
            let token = t.to_string();
            let req = request.clone();
            async move { api.start_session(&token, &req).await }
        })
        .await
        .map_err(|e| e.to_string())?;

    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    // Parse relay address
    let relay_addr: std::net::SocketAddr = format!(
        "{}:{}",
        session_resp.node_ip, session_resp.node_port
    )
    .parse()
    .map_err(|e| format!("Invalid relay address: {}", e))?;

    let backup_relay_addr = match (&session_resp.backup_node_ip, session_resp.backup_node_port) {
        (Some(ip), Some(port)) => format!("{}:{}", ip, port)
            .parse::<std::net::SocketAddr>()
            .ok(),
        _ => None,
    };

    // Determine game target and local port
    let game_target = if !game.server_ips.is_empty() && !game.ports.is_empty() {
        format!("{}:{}", game.server_ips[0], game.ports[0])
    } else {
        "0.0.0.0:0".to_string()
    };
    let local_port: u16 = game
        .ports
        .first()
        .and_then(|p| p.parse().ok())
        .unwrap_or(27015);

    let proxy = crate::udp_proxy::UdpProxy::start(
        session_resp.session_token,
        relay_addr,
        backup_relay_addr,
        &game_target,
        local_port,
        session_resp.multipath_enabled,
    )
    .await?;

    let actual_port = proxy.local_port();

    *state.active_proxy.lock().await = Some(proxy);
    *state.active_session_id.lock().unwrap() = Some(session_resp.session_id);

    Ok(actual_port)
}
