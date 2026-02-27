use prometheus::{
    Encoder, IntCounter, IntGauge, Registry, TextEncoder,
};

#[derive(Clone)]
pub struct Metrics {
    pub registry: Registry,
    pub active_sessions: IntGauge,
    pub packets_received: IntCounter,
    pub packets_forwarded: IntCounter,
    pub packets_dropped: IntCounter,
    pub bytes_forwarded: IntCounter,
    pub invalid_sessions: IntCounter,
    pub keepalives: IntCounter,
}

impl Metrics {
    pub fn new() -> Self {
        let registry = Registry::new();

        let active_sessions =
            IntGauge::new("plg_active_sessions", "Number of active relay sessions").unwrap();
        let packets_received =
            IntCounter::new("plg_packets_received_total", "Total packets received from clients")
                .unwrap();
        let packets_forwarded =
            IntCounter::new("plg_packets_forwarded_total", "Total packets forwarded to game servers")
                .unwrap();
        let packets_dropped =
            IntCounter::new("plg_packets_dropped_total", "Total packets dropped").unwrap();
        let bytes_forwarded =
            IntCounter::new("plg_bytes_forwarded_total", "Total bytes forwarded").unwrap();
        let invalid_sessions =
            IntCounter::new("plg_invalid_sessions_total", "Packets with invalid session tokens")
                .unwrap();
        let keepalives =
            IntCounter::new("plg_keepalives_total", "Total keepalive packets received").unwrap();

        registry.register(Box::new(active_sessions.clone())).unwrap();
        registry.register(Box::new(packets_received.clone())).unwrap();
        registry.register(Box::new(packets_forwarded.clone())).unwrap();
        registry.register(Box::new(packets_dropped.clone())).unwrap();
        registry.register(Box::new(bytes_forwarded.clone())).unwrap();
        registry.register(Box::new(invalid_sessions.clone())).unwrap();
        registry.register(Box::new(keepalives.clone())).unwrap();

        Self {
            registry,
            active_sessions,
            packets_received,
            packets_forwarded,
            packets_dropped,
            bytes_forwarded,
            invalid_sessions,
            keepalives,
        }
    }

    pub fn gather(&self) -> String {
        let encoder = TextEncoder::new();
        let metric_families = self.registry.gather();
        let mut buffer = Vec::new();
        encoder.encode(&metric_families, &mut buffer).unwrap();
        String::from_utf8(buffer).unwrap()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_metrics_gather() {
        let m = Metrics::new();
        m.packets_received.inc();
        m.packets_received.inc();
        m.active_sessions.set(5);

        let output = m.gather();
        assert!(output.contains("plg_packets_received_total 2"));
        assert!(output.contains("plg_active_sessions 5"));
    }
}
