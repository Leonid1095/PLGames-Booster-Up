use tracing::info;

mod protocol;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    info!("PLG Relay Server v0.1.0 starting...");
    info!("Listening on UDP :443 for PLG Protocol");
    // TODO: Phase 2 implementation
}
