use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

pub fn setup_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let status = MenuItem::with_id(app, "status", "PLGames — Отключен", false, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show", "Открыть PLGames", true, None::<&str>)?;
    let disconnect = MenuItem::with_id(app, "disconnect", "Отключить", false, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Выход", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&status, &separator, &show, &disconnect, &separator, &quit])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("PLGames Booster — Отключен")
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "disconnect" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let _ = app.emit("tray:disconnect", ());
                });
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let tauri::tray::TrayIconEvent::DoubleClick { .. } = event {
                let app = tray.app_handle();
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
        })
        .build(app)?;

    Ok(())
}

/// Update tray menu and tooltip to reflect connection status.
pub fn update_tray_status(app: &AppHandle, connected: bool, game_name: Option<&str>, ping_ms: Option<f64>) {
    let tooltip = if connected {
        let game = game_name.unwrap_or("Игра");
        match ping_ms {
            Some(p) => format!("PLGames — {} ({:.0} ms)", game, p),
            None => format!("PLGames — {}", game),
        }
    } else {
        "PLGames Booster — Отключен".to_string()
    };

    let status_text = if connected {
        let game = game_name.unwrap_or("Подключен");
        match ping_ms {
            Some(p) => format!("{} — {:.0} ms", game, p),
            None => game.to_string(),
        }
    } else {
        "Отключен".to_string()
    };

    // Update tray items
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(&tooltip));
    }

    // Update menu items via app menu
    if let Some(item) = app.menu().and_then(|m| m.get("status")) {
        if let Some(menu_item) = item.as_menuitem() {
            let _ = menu_item.set_text(&status_text);
        }
    }
    if let Some(item) = app.menu().and_then(|m| m.get("disconnect")) {
        if let Some(menu_item) = item.as_menuitem() {
            let _ = menu_item.set_enabled(connected);
        }
    }
}
