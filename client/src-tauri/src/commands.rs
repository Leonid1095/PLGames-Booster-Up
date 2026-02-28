use std::sync::Mutex;
use tauri::State;

use crate::api_client::{self, ApiClient, ApiError};
use crate::auth::AuthTokens;
use crate::udp_proxy::{ProxyStats, UdpProxy};

// ── App State ───────────────────────────────────────────────────────

pub struct AppState {
    pub api: ApiClient,
    pub tokens: Mutex<Option<AuthTokens>>,
    pub active_proxy: tokio::sync::Mutex<Option<UdpProxy>>,
    pub active_session_id: Mutex<Option<String>>,
}

// ── General Commands ────────────────────────────────────────────────

#[tauri::command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn cmd_quit(app: tauri::AppHandle) {
    app.exit(0);
}

// ── Update Commands ────────────────────────────────────────────────

#[derive(serde::Serialize)]
pub struct UpdateInfo {
    pub available: bool,
    pub version: Option<String>,
    pub body: Option<String>,
}

#[tauri::command]
pub async fn cmd_check_update(app: tauri::AppHandle) -> Result<UpdateInfo, String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| format!("Updater init failed: {}", e))?;
    match updater.check().await {
        Ok(Some(update)) => Ok(UpdateInfo {
            available: true,
            version: Some(update.version.clone()),
            body: update.body.clone(),
        }),
        Ok(None) => Ok(UpdateInfo {
            available: false,
            version: None,
            body: None,
        }),
        Err(e) => {
            log::warn!("Update check failed: {}", e);
            Err(format!("Update check failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn cmd_install_update(app: tauri::AppHandle) -> Result<(), String> {
    use tauri_plugin_updater::UpdaterExt;

    let updater = app.updater().map_err(|e| format!("Updater init failed: {}", e))?;
    let update = updater
        .check()
        .await
        .map_err(|e| format!("Check failed: {}", e))?
        .ok_or("No update available")?;

    log::info!("Installing update v{}...", update.version);

    let mut downloaded = 0;
    update
        .download_and_install(
            |chunk_len, content_len| {
                downloaded += chunk_len;
                log::info!("Downloaded {} / {:?} bytes", downloaded, content_len);
            },
            || {
                log::info!("Download complete, installing...");
            },
        )
        .await
        .map_err(|e| format!("Install failed: {}", e))?;

    log::info!("Update installed, restarting...");
    app.restart();
}

// ── Auth Commands ───────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_login(
    email: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<api_client::User, String> {
    let token_resp = state
        .api
        .login(&email, &password)
        .await
        .map_err(|e| e.to_string())?;

    let auth = AuthTokens {
        access_token: token_resp.access_token.clone(),
        refresh_token: token_resp.refresh_token.clone(),
    };

    // Get user profile
    let user = state
        .api
        .get_me(&auth.access_token)
        .await
        .map_err(|e| e.to_string())?;

    // Save tokens
    auth.save();
    *state.tokens.lock().unwrap() = Some(auth);

    Ok(user)
}

#[tauri::command]
pub async fn cmd_register(
    email: String,
    username: String,
    password: String,
    state: State<'_, AppState>,
) -> Result<api_client::User, String> {
    let token_resp = state
        .api
        .register(&email, &username, &password)
        .await
        .map_err(|e| e.to_string())?;

    let auth = AuthTokens {
        access_token: token_resp.access_token.clone(),
        refresh_token: token_resp.refresh_token.clone(),
    };

    // Get user profile
    let user = state
        .api
        .get_me(&auth.access_token)
        .await
        .map_err(|e| e.to_string())?;

    // Save tokens
    auth.save();
    *state.tokens.lock().unwrap() = Some(auth);

    Ok(user)
}

#[tauri::command]
pub async fn cmd_logout(state: State<'_, AppState>) -> Result<(), String> {
    AuthTokens::clear();
    *state.tokens.lock().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn cmd_get_user(state: State<'_, AppState>) -> Result<api_client::User, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let (user, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
        let api = &state.api;
        let token = t.to_string();
        async move { api.get_me(&token).await }
    })
    .await
    .map_err(|e| match e {
        ApiError::RefreshFailed | ApiError::Unauthorized => {
            AuthTokens::clear();
            *state.tokens.lock().unwrap() = None;
            "Session expired, please login again".to_string()
        }
        other => other.to_string(),
    })?;

    // Update tokens if refreshed
    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    Ok(user)
}

#[tauri::command]
pub async fn cmd_get_user_stats(
    state: State<'_, AppState>,
) -> Result<api_client::UserStats, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let (stats, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
        let api = &state.api;
        let token = t.to_string();
        async move { api.get_me_stats(&token).await }
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    Ok(stats)
}

// ── Billing Commands ────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_activate_trial(
    state: State<'_, AppState>,
) -> Result<api_client::TrialResponse, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let (resp, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
        let api = &state.api;
        let token = t.to_string();
        async move { api.activate_trial(&token).await }
    })
    .await
    .map_err(|e| match e {
        api_client::ApiError::Forbidden(msg) => msg,
        other => other.to_string(),
    })?;

    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    Ok(resp)
}

// ── Games Commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_get_games(
    category: Option<String>,
    popular: Option<bool>,
    state: State<'_, AppState>,
) -> Result<api_client::GameListResponse, String> {
    state
        .api
        .get_games(category.as_deref(), popular)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cmd_search_games(
    query: String,
    state: State<'_, AppState>,
) -> Result<api_client::GameListResponse, String> {
    state
        .api
        .search_games(&query)
        .await
        .map_err(|e| e.to_string())
}

// ── Nodes Commands ──────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_get_nodes(
    state: State<'_, AppState>,
) -> Result<Vec<api_client::NodeInfo>, String> {
    state.api.get_nodes().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn cmd_ping_node(
    node_id: String,
    state: State<'_, AppState>,
) -> Result<api_client::NodePingResponse, String> {
    state
        .api
        .ping_node(&node_id)
        .await
        .map_err(|e| e.to_string())
}

// ── Session Commands ────────────────────────────────────────────────

#[tauri::command]
pub async fn cmd_start_session(
    game_slug: String,
    node_id: String,
    multipath: Option<bool>,
    state: State<'_, AppState>,
) -> Result<api_client::SessionStartResponse, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let request = api_client::SessionStartRequest {
        game_slug,
        node_id,
        multipath,
    };

    let (resp, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
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

    Ok(resp)
}

#[tauri::command]
pub async fn cmd_stop_session(
    session_id: String,
    state: State<'_, AppState>,
) -> Result<api_client::SessionStopResponse, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let (resp, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
        let api = &state.api;
        let token = t.to_string();
        let sid = session_id.clone();
        async move { api.stop_session(&token, &sid).await }
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    Ok(resp)
}

#[tauri::command]
pub async fn cmd_get_session_history(
    state: State<'_, AppState>,
) -> Result<Vec<api_client::SessionHistoryItem>, String> {
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let (history, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
        let api = &state.api;
        let token = t.to_string();
        async move { api.get_session_history(&token).await }
    })
    .await
    .map_err(|e| e.to_string())?;

    if let Some(new_auth) = new_tokens {
        new_auth.save();
        *state.tokens.lock().unwrap() = Some(new_auth);
    }

    Ok(history)
}

// ── Boost Commands (start/stop UDP proxy) ───────────────────────────

#[derive(serde::Serialize)]
pub struct BoostStatus {
    pub connected: bool,
    pub session_id: Option<String>,
    pub local_port: Option<u16>,
    pub stats: Option<ProxyStats>,
    pub multipath_enabled: bool,
}

#[tauri::command]
pub async fn cmd_start_boost(
    game_slug: String,
    node_id: String,
    game_server_target: String,
    local_port: u16,
    multipath: Option<bool>,
    state: State<'_, AppState>,
) -> Result<BoostStatus, String> {
    // Check if already connected
    {
        let proxy = state.active_proxy.lock().await;
        if proxy.is_some() {
            return Err("Already connected. Stop current session first.".to_string());
        }
    }

    // Start API session
    let tokens = state.tokens.lock().unwrap().clone();
    let tokens = tokens.ok_or("Not authenticated")?;

    let request = api_client::SessionStartRequest {
        game_slug,
        node_id,
        multipath,
    };

    let (session_resp, new_tokens) = api_client::with_auto_refresh(&state.api, &tokens, |t| {
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

    // Parse backup relay address (for multipath)
    let backup_relay_addr = match (&session_resp.backup_node_ip, session_resp.backup_node_port) {
        (Some(ip), Some(port)) => {
            format!("{}:{}", ip, port)
                .parse::<std::net::SocketAddr>()
                .ok()
        }
        _ => None,
    };

    // Start UDP proxy
    let proxy = UdpProxy::start(
        session_resp.session_token,
        relay_addr,
        backup_relay_addr,
        &game_server_target,
        local_port,
        session_resp.multipath_enabled,
    )
    .await?;

    let actual_port = proxy.local_port();

    // Store state
    *state.active_proxy.lock().await = Some(proxy);
    *state.active_session_id.lock().unwrap() = Some(session_resp.session_id.clone());

    Ok(BoostStatus {
        connected: true,
        session_id: Some(session_resp.session_id),
        local_port: Some(actual_port),
        stats: None,
        multipath_enabled: session_resp.multipath_enabled,
    })
}

#[tauri::command]
pub async fn cmd_stop_boost(state: State<'_, AppState>) -> Result<BoostStatus, String> {
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
            let _ = api_client::with_auto_refresh(&state.api, &tokens, |t| {
                let api = &state.api;
                let token = t.to_string();
                let session_id = sid.clone();
                async move { api.stop_session(&token, &session_id).await }
            })
            .await;
        }
    }

    Ok(BoostStatus {
        connected: false,
        session_id: None,
        local_port: None,
        stats: None,
        multipath_enabled: false,
    })
}

#[tauri::command]
pub async fn cmd_get_boost_status(state: State<'_, AppState>) -> Result<BoostStatus, String> {
    let session_id = state.active_session_id.lock().unwrap().clone();
    let proxy = state.active_proxy.lock().await;
    match proxy.as_ref() {
        Some(p) if p.is_running() => {
            let local_port = p.local_port();
            let stats = p.get_stats().await;
            let mp = stats.multipath_enabled;
            Ok(BoostStatus {
                connected: true,
                session_id,
                local_port: Some(local_port),
                stats: Some(stats),
                multipath_enabled: mp,
            })
        }
        _ => Ok(BoostStatus {
            connected: false,
            session_id: None,
            local_port: None,
            stats: None,
            multipath_enabled: false,
        }),
    }
}

// ── Game Detector Commands ──────────────────────────────────────────

#[tauri::command]
pub async fn cmd_detect_game(
    state: State<'_, AppState>,
) -> Result<Option<api_client::GameProfile>, String> {
    // Fetch games list
    let games_resp = state
        .api
        .get_games(None, None)
        .await
        .map_err(|e| e.to_string())?;

    // Scan processes
    let mut system = sysinfo::System::new();
    let detected = crate::game_detector::detect_running_game(&mut system, &games_resp.items);

    Ok(detected)
}

// ── Settings Commands ──────────────────────────────────────────────

#[tauri::command]
pub fn cmd_get_settings(
    config: State<'_, std::sync::Mutex<crate::config::AppConfig>>,
) -> crate::config::AppConfig {
    config.lock().unwrap().clone()
}

#[tauri::command]
pub fn cmd_update_settings(
    key: String,
    value: String,
    config: State<'_, std::sync::Mutex<crate::config::AppConfig>>,
) -> Result<crate::config::AppConfig, String> {
    let mut cfg = config.lock().unwrap();
    let bool_val = value == "true";
    match key.as_str() {
        "auto_start" => cfg.auto_start = bool_val,
        "auto_connect" => cfg.auto_connect = bool_val,
        "multipath" => cfg.multipath = bool_val,
        "minimize_to_tray" => cfg.minimize_to_tray = bool_val,
        "preferred_node" => cfg.preferred_node = value,
        _ => return Err(format!("Unknown setting: {}", key)),
    }
    cfg.save();

    // Handle auto-start via Windows registry
    if key == "auto_start" {
        let enabled = bool_val;
        if let Err(e) = set_auto_start(enabled) {
            log::warn!("Failed to set auto-start: {}", e);
        }
    }

    Ok(cfg.clone())
}

/// Set or remove Windows auto-start registry entry
fn set_auto_start(enabled: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let exe_path = std::env::current_exe()
            .map_err(|e| format!("Cannot get exe path: {}", e))?;
        let exe_str = exe_path.to_string_lossy();

        if enabled {
            let output = Command::new("reg")
                .args([
                    "add",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                    "/v", "PLGamesBooster",
                    "/t", "REG_SZ",
                    "/d", &format!("\"{}\"", exe_str),
                    "/f",
                ])
                .output()
                .map_err(|e| format!("reg add failed: {}", e))?;
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
        } else {
            let _ = Command::new("reg")
                .args([
                    "delete",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                    "/v", "PLGamesBooster",
                    "/f",
                ])
                .output();
        }
    }
    Ok(())
}
