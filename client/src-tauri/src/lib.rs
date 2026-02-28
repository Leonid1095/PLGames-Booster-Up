mod api_client;
mod auth;
mod commands;
mod config;
mod game_detector;
mod protocol;
mod smart_monitor;
mod tray;
mod udp_proxy;

use api_client::ApiClient;
use auth::AuthTokens;
use commands::AppState;
use config::AppConfig;
use std::sync::Mutex;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    env_logger::init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let config = AppConfig::load();
            log::info!("PLGames Booster v{} starting", env!("CARGO_PKG_VERSION"));
            log::info!("API URL: {}", config.api_url);

            // Create API client
            let api = ApiClient::new(&config.api_url);

            // Try to load saved auth tokens
            let tokens = AuthTokens::load();
            if tokens.is_some() {
                log::info!("Found saved auth tokens");
            }

            // Store state
            app.manage(AppState {
                api,
                tokens: Mutex::new(tokens),
                active_proxy: tokio::sync::Mutex::new(None),
                active_session_id: Mutex::new(None),
            });
            app.manage(Mutex::new(config));

            // Setup system tray
            if let Err(e) = tray::setup_tray(app.handle()) {
                log::error!("Failed to setup tray: {}", e);
            }

            // Start smart game monitor
            smart_monitor::start_smart_monitor(app.handle());

            // DevTools in debug mode
            #[cfg(debug_assertions)]
            {
                let app_handle = app.handle().clone();
                if let Some(window) = app_handle.get_webview_window("main") {
                    window.open_devtools();
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_version,
            commands::cmd_login,
            commands::cmd_register,
            commands::cmd_logout,
            commands::cmd_get_user,
            commands::cmd_get_user_stats,
            commands::cmd_get_games,
            commands::cmd_search_games,
            commands::cmd_get_nodes,
            commands::cmd_ping_node,
            commands::cmd_start_session,
            commands::cmd_stop_session,
            commands::cmd_get_session_history,
            commands::cmd_start_boost,
            commands::cmd_stop_boost,
            commands::cmd_get_boost_status,
            commands::cmd_detect_game,
            commands::cmd_activate_trial,
            commands::cmd_get_settings,
            commands::cmd_update_settings,
            commands::cmd_quit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
