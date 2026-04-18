mod api_client;
mod auth;
mod commands;
mod config;
mod filter_builder;
mod game_detector;
mod packet_builder;
mod protocol;
mod smart_monitor;
mod tray;
mod udp_proxy;
#[cfg(target_os = "windows")]
mod windivert;

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
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let config = AppConfig::load();
            log::info!("PLGames Booster v{} starting", env!("CARGO_PKG_VERSION"));
            log::info!("API URL: {}", config.api_url);

            // Ensure WinDivert DLLs are next to the exe (required for LoadLibrary)
            #[cfg(target_os = "windows")]
            {
                if let Ok(exe_path) = std::env::current_exe() {
                    let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new("."));
                    let dll_target = exe_dir.join("WinDivert.dll");

                    if !dll_target.exists() {
                        // Try multiple source locations
                        let candidates = [
                            exe_dir.join("resources").join("windivert"),
                            exe_dir.join("_up_").join("resources").join("windivert"),
                        ];

                        // Also check Tauri resource_dir
                        let mut found = false;
                        let mut search_paths = candidates.to_vec();
                        if let Ok(res_dir) = app.path().resource_dir() {
                            search_paths.push(res_dir.join("resources").join("windivert"));
                            search_paths.push(res_dir.join("windivert"));
                        }

                        for src_dir in &search_paths {
                            let dll_src = src_dir.join("WinDivert.dll");
                            let sys_src = src_dir.join("WinDivert64.sys");
                            if dll_src.exists() {
                                log::info!("Copying WinDivert from {}", src_dir.display());
                                let _ = std::fs::copy(&dll_src, &dll_target);
                                let sys_target = exe_dir.join("WinDivert64.sys");
                                if sys_src.exists() && !sys_target.exists() {
                                    let _ = std::fs::copy(&sys_src, &sys_target);
                                }
                                found = true;
                                break;
                            }
                        }

                        if !found {
                            log::warn!(
                                "WinDivert.dll not found in any of: {:?}. WinDivert mode will be unavailable.",
                                search_paths.iter().map(|p| p.display().to_string()).collect::<Vec<_>>()
                            );
                        }
                    } else {
                        log::info!("WinDivert.dll already present at {}", dll_target.display());
                    }
                }
            }

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
            commands::cmd_check_update,
            commands::cmd_install_update,
            commands::cmd_check_admin,
            commands::cmd_launch_game,
            commands::cmd_suggest_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
