use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

const APP_DIR_NAME: &str = "PLGames";
const CONFIG_FILE: &str = "config.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub api_url: String,
    pub auto_start: bool,
    pub auto_connect: bool,
    pub multipath: bool,
    pub preferred_node: String,
    pub minimize_to_tray: bool,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            api_url: "https://plgames-boost.duckdns.org".to_string(),
            auto_start: false,
            auto_connect: true,
            multipath: false,
            preferred_node: "auto".to_string(),
            minimize_to_tray: true,
        }
    }
}

impl AppConfig {
    /// Get the app data directory: %APPDATA%/PLGames/
    pub fn data_dir() -> PathBuf {
        let base = directories::BaseDirs::new()
            .expect("Failed to determine base directories");
        let dir = base.data_dir().join(APP_DIR_NAME);
        if !dir.exists() {
            fs::create_dir_all(&dir).expect("Failed to create app data directory");
        }
        dir
    }

    /// Load config from disk, or return defaults
    pub fn load() -> Self {
        let path = Self::data_dir().join(CONFIG_FILE);
        if path.exists() {
            match fs::read_to_string(&path) {
                Ok(data) => {
                    match serde_json::from_str::<AppConfig>(&data) {
                        Ok(config) => return config,
                        Err(e) => log::warn!("Failed to parse config: {e}, using defaults"),
                    }
                }
                Err(e) => log::warn!("Failed to read config: {e}, using defaults"),
            }
        }
        let config = Self::default();
        config.save();
        config
    }

    /// Save config to disk
    pub fn save(&self) {
        let path = Self::data_dir().join(CONFIG_FILE);
        match serde_json::to_string_pretty(self) {
            Ok(data) => {
                if let Err(e) = fs::write(&path, data) {
                    log::error!("Failed to write config: {e}");
                }
            }
            Err(e) => log::error!("Failed to serialize config: {e}"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = AppConfig::default();
        assert_eq!(config.api_url, "https://plgames-boost.duckdns.org");
        assert!(!config.auto_start);
        assert!(config.auto_connect);
        assert!(!config.multipath);
        assert_eq!(config.preferred_node, "auto");
        assert!(config.minimize_to_tray);
    }

    #[test]
    fn test_config_serialization() {
        let config = AppConfig::default();
        let json = serde_json::to_string(&config).unwrap();
        let deserialized: AppConfig = serde_json::from_str(&json).unwrap();
        assert_eq!(config.api_url, deserialized.api_url);
        assert_eq!(config.auto_start, deserialized.auto_start);
    }
}
