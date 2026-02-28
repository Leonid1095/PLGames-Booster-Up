use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::auth::AuthTokens;

// ── API Response Types ──────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub refresh_token: String,
    pub token_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub username: String,
    pub subscription_tier: String,
    pub subscription_expires_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserStats {
    pub total_sessions: i64,
    pub total_bytes_sent: i64,
    pub total_bytes_received: i64,
    pub avg_ping: Option<f64>,
    pub favorite_game: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameProfile {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub exe_names: Vec<String>,
    pub server_ips: Vec<String>,
    pub ports: Vec<String>,
    pub protocol: String,
    pub category: String,
    pub is_popular: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GameListResponse {
    pub items: Vec<GameProfile>,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeInfo {
    pub id: String,
    pub name: String,
    pub location: String,
    pub city: String,
    pub ip_address: String,
    pub status: String,
    pub current_load: i64,
    pub max_sessions: i64,
    pub relay_port: i32,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodePingResponse {
    pub node_id: String,
    pub ping_ms: Option<f64>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStartRequest {
    pub game_slug: String,
    pub node_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multipath: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStartResponse {
    pub session_id: String,
    pub session_token: u32,
    pub node_ip: String,
    pub node_port: i32,
    pub backup_node_ip: Option<String>,
    pub backup_node_port: Option<i32>,
    pub multipath_enabled: bool,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStopResponse {
    pub session_id: String,
    pub status: String,
    pub duration_seconds: Option<i64>,
    pub bytes_sent: i64,
    pub bytes_received: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionHistoryItem {
    pub id: String,
    pub game_name: String,
    pub node_location: String,
    pub status: String,
    pub started_at: Option<String>,
    pub ended_at: Option<String>,
    pub avg_ping: Option<f64>,
    pub bytes_sent: i64,
    pub bytes_received: i64,
    pub multipath_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrialResponse {
    pub tier: String,
    pub plan: String,
    pub started_at: Option<String>,
    pub expires_at: Option<String>,
    pub is_active: bool,
    pub days_remaining: i64,
}

// ── API Error ───────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiErrorDetail {
    pub detail: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("Unauthorized")]
    Unauthorized,
    #[error("Forbidden: {0}")]
    Forbidden(String),
    #[error("Not found")]
    NotFound,
    #[error("Server error: {0}")]
    Server(String),
    #[error("Token refresh failed")]
    RefreshFailed,
}

impl Serialize for ApiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

// ── API Client ──────────────────────────────────────────────────────

pub struct ApiClient {
    client: Client,
    base_url: String,
}

impl ApiClient {
    pub fn new(base_url: &str) -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    fn url(&self, path: &str) -> String {
        format!("{}{}", self.base_url, path)
    }

    // ── Auth ────────────────────────────────────────────────────

    pub async fn login(&self, email: &str, password: &str) -> Result<TokenResponse, ApiError> {
        let body = serde_json::json!({
            "email": email,
            "password": password,
        });

        let resp = self
            .client
            .post(self.url("/api/auth/login"))
            .json(&body)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    pub async fn register(
        &self,
        email: &str,
        username: &str,
        password: &str,
    ) -> Result<TokenResponse, ApiError> {
        let body = serde_json::json!({
            "email": email,
            "username": username,
            "password": password,
        });

        let resp = self
            .client
            .post(self.url("/api/auth/register"))
            .json(&body)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    pub async fn refresh_token(
        &self,
        refresh_token: &str,
    ) -> Result<TokenResponse, ApiError> {
        let body = serde_json::json!({
            "refresh_token": refresh_token,
        });

        let resp = self
            .client
            .post(self.url("/api/auth/refresh"))
            .json(&body)
            .send()
            .await?;

        if resp.status() == 401 {
            return Err(ApiError::RefreshFailed);
        }

        self.handle_response(resp).await
    }

    // ── User ────────────────────────────────────────────────────

    pub async fn get_me(&self, token: &str) -> Result<User, ApiError> {
        let resp = self
            .client
            .get(self.url("/api/me"))
            .bearer_auth(token)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    pub async fn get_me_stats(&self, token: &str) -> Result<UserStats, ApiError> {
        let resp = self
            .client
            .get(self.url("/api/me/stats"))
            .bearer_auth(token)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    // ── Games ───────────────────────────────────────────────────

    pub async fn get_games(
        &self,
        category: Option<&str>,
        popular: Option<bool>,
    ) -> Result<GameListResponse, ApiError> {
        let mut url = self.url("/api/games");
        let mut params = vec![];
        if let Some(cat) = category {
            params.push(format!("category={cat}"));
        }
        if let Some(pop) = popular {
            params.push(format!("popular={pop}"));
        }
        if !params.is_empty() {
            url = format!("{}?{}", url, params.join("&"));
        }

        let resp = self.client.get(&url).send().await?;
        self.handle_response(resp).await
    }

    pub async fn search_games(&self, query: &str) -> Result<GameListResponse, ApiError> {
        let resp = self
            .client
            .get(self.url(&format!("/api/games/search?q={}", query)))
            .send()
            .await?;

        self.handle_response(resp).await
    }

    // ── Nodes ───────────────────────────────────────────────────

    pub async fn get_nodes(&self) -> Result<Vec<NodeInfo>, ApiError> {
        let resp = self.client.get(self.url("/api/nodes")).send().await?;
        self.handle_response(resp).await
    }

    pub async fn ping_node(&self, node_id: &str) -> Result<NodePingResponse, ApiError> {
        let resp = self
            .client
            .get(self.url(&format!("/api/nodes/{}/ping", node_id)))
            .send()
            .await?;

        self.handle_response(resp).await
    }

    // ── Sessions ────────────────────────────────────────────────

    pub async fn start_session(
        &self,
        token: &str,
        request: &SessionStartRequest,
    ) -> Result<SessionStartResponse, ApiError> {
        let resp = self
            .client
            .post(self.url("/api/sessions/start"))
            .bearer_auth(token)
            .json(request)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    pub async fn stop_session(
        &self,
        token: &str,
        session_id: &str,
    ) -> Result<SessionStopResponse, ApiError> {
        let resp = self
            .client
            .post(self.url(&format!("/api/sessions/{}/stop", session_id)))
            .bearer_auth(token)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    pub async fn get_session_history(
        &self,
        token: &str,
    ) -> Result<Vec<SessionHistoryItem>, ApiError> {
        let resp = self
            .client
            .get(self.url("/api/sessions/history"))
            .bearer_auth(token)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    // ── Billing ──────────────────────────────────────────────────

    pub async fn activate_trial(&self, token: &str) -> Result<TrialResponse, ApiError> {
        let resp = self
            .client
            .post(self.url("/api/billing/trial"))
            .bearer_auth(token)
            .send()
            .await?;

        self.handle_response(resp).await
    }

    // ── Response handling ───────────────────────────────────────

    async fn handle_response<T: serde::de::DeserializeOwned>(
        &self,
        resp: reqwest::Response,
    ) -> Result<T, ApiError> {
        let status = resp.status();

        if status.is_success() {
            return Ok(resp.json::<T>().await?);
        }

        let error_text = resp.text().await.unwrap_or_default();
        let detail = serde_json::from_str::<ApiErrorDetail>(&error_text)
            .ok()
            .and_then(|e| e.detail)
            .unwrap_or(error_text);

        match status.as_u16() {
            401 => Err(ApiError::Unauthorized),
            403 => Err(ApiError::Forbidden(detail)),
            404 => Err(ApiError::NotFound),
            _ => Err(ApiError::Server(detail)),
        }
    }
}

/// Attempt an API call with auto-refresh on 401.
/// Returns (result, possibly_updated_tokens).
pub async fn with_auto_refresh<T, F, Fut>(
    api: &ApiClient,
    tokens: &AuthTokens,
    f: F,
) -> Result<(T, Option<AuthTokens>), ApiError>
where
    F: Fn(&str) -> Fut,
    Fut: std::future::Future<Output = Result<T, ApiError>>,
{
    // Try with current access token
    match f(&tokens.access_token).await {
        Ok(result) => Ok((result, None)),
        Err(ApiError::Unauthorized) => {
            // Try to refresh
            log::info!("Access token expired, refreshing...");
            let new_tokens = api.refresh_token(&tokens.refresh_token).await?;
            let new_auth = AuthTokens {
                access_token: new_tokens.access_token.clone(),
                refresh_token: new_tokens.refresh_token.clone(),
            };
            // Retry with new token
            let result = f(&new_auth.access_token).await?;
            Ok((result, Some(new_auth)))
        }
        Err(e) => Err(e),
    }
}
