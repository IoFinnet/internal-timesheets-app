use std::{collections::HashMap, sync::Mutex};

use serde::Serialize;
use tauri::{Emitter, Manager};
use tokio::sync::oneshot;
use warp::Filter;

fn find_available_port() -> Result<u16, std::io::Error> {
    let listener = std::net::TcpListener::bind("127.0.0.1:0")?;
    Ok(listener.local_addr()?.port())
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuthCallback {
    code: String,
}

#[derive(Default)]
pub struct AuthState {
    shutdown_sender: Mutex<Option<oneshot::Sender<()>>>, // shutdown signal sender
}

#[tauri::command]
pub async fn start_auth_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let webview_window = app_handle
        .get_webview_window("main")
        .expect("failed to get main webview window");
    let port = find_available_port().expect("failed to find available port");
    let callback_url = format!("http://localhost:{}/callback", port);

    let (shutdown_tx, shutdown_rx) = oneshot::channel();
    let auth_state = app_handle.state::<AuthState>();
    {
        let mut shutdown_sender = auth_state.shutdown_sender.lock().unwrap();
        *shutdown_sender = Some(shutdown_tx);
    }

    tokio::spawn(async move {
        let callback = warp::path("callback")
            .and(warp::query::<HashMap<String, String>>())
            .map(move |params: HashMap<String, String>| {
                if let Some(code) = params.get("code") {
                    webview_window
                        .emit("auth-callback", AuthCallback { code: code.into() })
                        .expect("failed to emit auth-callback event");
                    warp::reply::html("Authentication successful! You can close this window.")
                } else {
                    warp::reply::html("Authentication failed.")
                }
            });

        let (_, server_future) =
            warp::serve(callback).bind_with_graceful_shutdown(([127, 0, 0, 1], port), async {
                shutdown_rx.await.ok();
            });

        server_future.await;
    });

    Ok(callback_url)
}

#[tauri::command]
pub async fn stop_auth_server(app_handle: tauri::AppHandle) -> Result<String, String> {
    let auth_state = app_handle.state::<AuthState>();
    let shutdown_sender = {
        let mut sender = auth_state.shutdown_sender.lock().unwrap();
        sender.take()
    };

    if let Some(sender) = shutdown_sender {
        if sender.send(()).is_ok() {
            Ok("Auth server stopped successfully".to_string())
        } else {
            Err("Failed to send shutdown signal".to_string())
        }
    } else {
        Err("No auth server is currently running".to_string())
    }
}
