FROM rust:1.83 as builder

WORKDIR /app
COPY Cargo.toml .
COPY src/ src/

RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/plg-relay /usr/local/bin/

EXPOSE 443/udp
EXPOSE 8443

CMD ["plg-relay"]
