mod auth_server;
mod http_client;

use auth_server::{start_auth_server, stop_auth_server, AuthState};
use http_client::http_request;
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

fn load_migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "green_iceman",
            sql: include_str!("../../src/lib/db/drizzle/0000_green_iceman.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "melted_sebastian_shaw",
            sql: include_str!("../../src/lib/db/drizzle/0001_melted_sebastian_shaw.sql"),
            kind: MigrationKind::Up,
        },
    ]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut app = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .manage(AuthState::default())
        .plugin(tauri_plugin_keyring::init())
        .plugin(
            tauri_plugin_sql::Builder::new()
                .add_migrations("sqlite:db.sqlite", load_migrations())
                .build(),
        )
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(desktop)]
            {
                use tauri_plugin_autostart::MacosLauncher;

                app.handle()
                    .plugin(tauri_plugin_autostart::init(
                        MacosLauncher::LaunchAgent,
                        Some(vec!["--flag1", "--flag2"]),
                    ))
                    .expect("failed to initialize autostart plugin");
            }
            Ok(())
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "quit" => app.exit(0),
            _ => {}
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                #[cfg(target_os = "macos")]
                {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            start_auth_server,
            stop_auth_server,
            http_request
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    #[cfg(target_os = "macos")]
    app.set_activation_policy(tauri::ActivationPolicy::Regular);

    app.run(|app_handle, e| match e {
        tauri::RunEvent::Reopen {
            has_visible_windows,
            ..
        } => {
            if !has_visible_windows {
                app_handle
                    .get_webview_window("main")
                    .unwrap()
                    .show()
                    .unwrap();
            }
        }
        _ => {}
    })
}
