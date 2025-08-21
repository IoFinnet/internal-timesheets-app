use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::command;

fn should_have_body(method: &str, status: u16) -> bool {
    // HEAD responses never have a body
    if method.to_uppercase() == "HEAD" {
        return false;
    }

    // Status codes that never have a body
    match status {
        204 | 304 => false, // No Content, Not Modified
        100..=199 => false, // 1xx responses
        _ => true,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpRequest {
    pub url: String,
    pub method: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct HttpResponse {
    pub status: u16,
    pub headers: HashMap<String, String>,
    pub body: String,
}

#[command]
pub async fn http_request(request: HttpRequest) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "GET" => client.get(&request.url),
        "POST" => client.post(&request.url),
        "PUT" => client.put(&request.url),
        "DELETE" => client.delete(&request.url),
        "PATCH" => client.patch(&request.url),
        method => return Err(format!("Unsupported HTTP method: {}", method)),
    };

    for (key, value) in request.headers {
        req_builder = req_builder.header(key, value);
    }

    if let Some(body) = request.body {
        req_builder = req_builder.body(body);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status().as_u16();

    let headers = response
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();

    let body = if should_have_body(&request.method, status) {
        response
            .text()
            .await
            .map_err(|e| format!("Failed to read response body: {}", e))?
    } else {
        String::new()
    };

    Ok(HttpResponse {
        status,
        headers,
        body,
    })
}
