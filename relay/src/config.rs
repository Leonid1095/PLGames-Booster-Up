use std::env;
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub api_key: String,
    pub relay_port: u16,
    pub api_port: u16,
    pub metrics_port: u16,
    pub max_sessions: usize,
    pub session_timeout: Duration,
}

impl Config {
    pub fn from_env() -> Self {
        let api_key = env::var("RELAY_API_KEY").expect("RELAY_API_KEY must be set");
        let relay_port = env::var("RELAY_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(443);
        let api_port = env::var("RELAY_API_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(8443);
        let metrics_port = env::var("RELAY_METRICS_PORT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(9090);
        let max_sessions = env::var("RELAY_MAX_SESSIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(1000);
        let session_timeout_secs: u64 = env::var("RELAY_SESSION_TIMEOUT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(300);

        Self {
            api_key,
            relay_port,
            api_port,
            metrics_port,
            max_sessions,
            session_timeout: Duration::from_secs(session_timeout_secs),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_config_defaults() {
        env::set_var("RELAY_API_KEY", "test-key-123");
        env::remove_var("RELAY_PORT");
        env::remove_var("RELAY_API_PORT");
        env::remove_var("RELAY_METRICS_PORT");
        env::remove_var("RELAY_MAX_SESSIONS");
        env::remove_var("RELAY_SESSION_TIMEOUT");

        let cfg = Config::from_env();
        assert_eq!(cfg.api_key, "test-key-123");
        assert_eq!(cfg.relay_port, 443);
        assert_eq!(cfg.api_port, 8443);
        assert_eq!(cfg.metrics_port, 9090);
        assert_eq!(cfg.max_sessions, 1000);
        assert_eq!(cfg.session_timeout, Duration::from_secs(300));
    }

    #[test]
    fn test_config_custom() {
        env::set_var("RELAY_API_KEY", "custom-key");
        env::set_var("RELAY_PORT", "9443");
        env::set_var("RELAY_API_PORT", "9444");
        env::set_var("RELAY_METRICS_PORT", "9091");
        env::set_var("RELAY_MAX_SESSIONS", "500");
        env::set_var("RELAY_SESSION_TIMEOUT", "600");

        let cfg = Config::from_env();
        assert_eq!(cfg.relay_port, 9443);
        assert_eq!(cfg.api_port, 9444);
        assert_eq!(cfg.metrics_port, 9091);
        assert_eq!(cfg.max_sessions, 500);
        assert_eq!(cfg.session_timeout, Duration::from_secs(600));
    }
}
