# PLGames Booster UP

Game network booster with custom PLG Protocol. Reduces ping, eliminates jitter, and optimizes routes for online games.

**Live:** [plgames-boost.duckdns.org](https://plgames-boost.duckdns.org)

## Architecture

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  Client   │────▶│  PLG Relay   │────▶│ Game Server │
│ (Windows) │◀────│  (Rust/UDP)  │◀────│             │
└──────────┘     └──────────────┘     └─────────────┘
      │                 │
      ▼                 ▼
┌──────────────────────────┐
│       API (FastAPI)      │
│   + PostgreSQL + Redis   │
└──────────────────────────┘
      │
      ▼
┌──────────────────────────┐
│     Web (Next.js 14)     │
│  Landing + Dashboard     │
└──────────────────────────┘
```

## Stack

| Component | Tech | Port |
|-----------|------|------|
| **API** | Python 3.12, FastAPI, SQLAlchemy 2, Alembic | 8000 |
| **Relay** | Rust, Tokio, custom PLG Protocol (UDP) | 443 (UDP), 8443 (API), 9090 (metrics) |
| **Web** | Next.js 14, React 18, Tailwind CSS, TypeScript | 3000 |
| **DB** | PostgreSQL 16 | 5432 |
| **Cache** | Redis 7 | 6379 |
| **Monitoring** | Prometheus + Grafana | 9090, 3000 |

## Key Features

- **PLG Protocol** — custom UDP protocol optimized for game traffic, minimal overhead
- **Adaptive Routing** — automatic selection of the lowest-latency route
- **Multipath** — traffic duplication across multiple paths, instant failover
- **Game Auto-Detection** — client detects running game and applies optimal settings
- **50+ Games** — CS2, Dota 2, Valorant, Apex, Fortnite, LoL, and more
- **Billing** — DonatePay integration, promo codes, trial period

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/Leonid1095/PLGames-Booster-Up.git
cd PLGames-Booster-Up
cp .env.example .env
# Edit .env with your values

# 2. Start infrastructure
cd infra
docker compose up -d db redis

# 3. Run API
cd ../api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. Run Web
cd ../web
npm install
npm run dev -- --port 3000
```

### Docker (production)

```bash
cd infra
docker compose up -d
```

## Project Structure

```
├── api/                 # Backend API (FastAPI)
│   ├── app/
│   │   ├── models/      # SQLAlchemy models
│   │   ├── routers/     # API endpoints
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── utils/       # Middleware, rate limiting, metrics
│   ├── alembic/         # Database migrations
│   └── tests/           # 64 tests
├── relay/               # PLG Relay Server (Rust)
│   └── src/             # UDP relay, management API, metrics
├── web/                 # Landing + Dashboard (Next.js 14)
│   └── src/
│       ├── app/         # Pages (landing, auth, dashboard)
│       ├── components/  # UI components
│       └── lib/         # API client, auth, utils
├── client/              # Windows client (WIP)
├── gateway-agent/       # Node agent
├── infra/               # Docker, Prometheus, Grafana
│   ├── grafana/         # Dashboards and provisioning
│   └── prometheus/      # Scrape config
└── docs/                # Specs and roadmap
```

## Tests

```bash
# API tests (64 total)
cd api && source .venv/bin/activate
pytest -v

# Relay E2E tests
cd relay && cargo test
./tests/run_e2e.sh
```

## Roadmap

See [docs/03-roadmap.md](docs/03-roadmap.md) for the full 16-phase roadmap.

**Completed:** Phases 0-3, 5-9 (Infrastructure, API, Relay, Web, Monitoring, Billing, Admin, Multipath)

**Next:** Phase 4 (Windows Client), Phase 10+ (Android, iOS, Router support)

## License

All rights reserved.
