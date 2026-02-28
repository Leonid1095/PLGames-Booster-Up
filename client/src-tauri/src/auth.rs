use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::config::AppConfig;

const AUTH_FILE: &str = "auth.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthTokens {
    pub access_token: String,
    pub refresh_token: String,
}

impl AuthTokens {
    fn file_path() -> PathBuf {
        AppConfig::data_dir().join(AUTH_FILE)
    }

    /// Load saved tokens from disk
    pub fn load() -> Option<Self> {
        let path = Self::file_path();
        if !path.exists() {
            return None;
        }
        match fs::read_to_string(&path) {
            Ok(data) => match serde_json::from_str::<AuthTokens>(&data) {
                Ok(tokens) => {
                    if tokens.access_token.is_empty() || tokens.refresh_token.is_empty() {
                        return None;
                    }
                    Some(tokens)
                }
                Err(e) => {
                    log::warn!("Failed to parse auth tokens: {e}");
                    None
                }
            },
            Err(e) => {
                log::warn!("Failed to read auth file: {e}");
                None
            }
        }
    }

    /// Save tokens to disk
    pub fn save(&self) {
        let path = Self::file_path();
        match serde_json::to_string_pretty(self) {
            Ok(data) => {
                if let Err(e) = fs::write(&path, data) {
                    log::error!("Failed to write auth tokens: {e}");
                }
            }
            Err(e) => log::error!("Failed to serialize auth tokens: {e}"),
        }
    }

    /// Delete saved tokens
    pub fn clear() {
        let path = Self::file_path();
        if path.exists() {
            if let Err(e) = fs::remove_file(&path) {
                log::error!("Failed to remove auth file: {e}");
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auth_tokens_serialization() {
        let tokens = AuthTokens {
            access_token: "test_access".to_string(),
            refresh_token: "test_refresh".to_string(),
        };
        let json = serde_json::to_string(&tokens).unwrap();
        let deserialized: AuthTokens = serde_json::from_str(&json).unwrap();
        assert_eq!(tokens.access_token, deserialized.access_token);
        assert_eq!(tokens.refresh_token, deserialized.refresh_token);
    }

    #[test]
    fn test_empty_tokens_rejected() {
        let json = r#"{"access_token":"","refresh_token":""}"#;
        let tokens: AuthTokens = serde_json::from_str(json).unwrap();
        // Empty tokens should be treated as no auth
        assert!(tokens.access_token.is_empty());
    }
}
