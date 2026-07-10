# LoL Tracker

![Java](https://img.shields.io/badge/Java_21-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS_EC2-FF9900?style=flat&logo=amazonec2&logoColor=white)
[![codecov](https://codecov.io/gh/jianweicheng0822/lol-tracker/graph/badge.svg)](https://codecov.io/gh/jianweicheng0822/lol-tracker)

Full-stack League of Legends analytics dashboard with AI-powered match coaching. Search any player by Riot ID, explore ranked stats, match history, champion performance, and LP trends — all in a dark-themed UI with real-time AI analysis.

## Demo

**Live Demo:** [https://loltracker.lol](https://loltracker.lol)

> **Note:** The demo runs on an AWS EC2 instance and may be unavailable if the instance is stopped.

## Screenshots

| Home | Overview |
|------|----------|
| ![Home](screenshots/home.png) | ![Overview](screenshots/overview.png) |

| Performance | Champions |
|-------------|-----------|
| ![Performance](screenshots/performance.png) | ![Champions](screenshots/champions.png) |

| Match History | AI Analysis |
|---------------|-------------|
| ![Match History](screenshots/match-history.png) | ![AI Analysis](screenshots/ai-analysis.png) |

| Leaderboard | Multi-Search |
|-------------|--------------|
| ![Leaderboard](screenshots/leaderboard.png) | ![Multi-Search](screenshots/multi-search.png) |

## Features

**Player Dashboard** — Tabbed profile (Overview, Performance, Champions, Match History) with URL-driven navigation, ranked badges, and persistent favorites

**Match History** — Match cards with champion icons, KDA, items, runes, and summoner spells. Expandable inline scoreboards with full 10-player stats. Arena mode support with augment icons. Cross-navigation between player profiles

**Performance Analytics** — LP progression chart, rolling win rate trend, KDA and damage trends with moving average overlays, per-champion stats grid

**Leaderboard** — Regional leaderboards for Challenger, Grandmaster, and Master tiers. Click any player to jump directly to their profile

**Live Game** — Real-time in-game view for any active player via the Spectator API. Displays champions, ranks, and team compositions for the current match

**Multi-Search** — Batch player lookup. Paste multiple Riot IDs to quickly view ranked stats and recent performance side by side

**AI Match Analysis** — Click the sparkle button on any match to open a chat modal. Streaming responses via SSE for real-time coaching. System prompt constructed server-side from structured match data

**JWT Authentication** — Stateless authentication with Bearer tokens. Register/login endpoints return JWTs. Anonymous users have full access to all features except AI coaching

**Subscription Tiers** — FREE/PRO system via Stripe. All users get full match history and unlimited API access. PRO adds AI match coaching ($4.99/mo via Stripe Checkout)

## Architecture

```mermaid
graph TB
    subgraph Frontend
        Browser["React SPA<br/>(TypeScript + Vite)"]
    end

    subgraph Backend
        API["Spring Boot API"]
        Security["Spring Security<br/>JWT Auth Filter"]
        Swagger["Swagger UI<br/>/swagger-ui.html"]
    end

    subgraph Data
        DB[("PostgreSQL<br/>Flyway migrations")]
        Redis[("Redis<br/>API response cache")]
    end

    subgraph External
        Riot["Riot Games API"]
        OpenAI["OpenAI API<br/>(GPT-4o-mini)"]
        Stripe["Stripe API<br/>(Payments)"]
        DDragon["DDragon CDN"]
    end

    Browser -->|"REST (JSON) + SSE"| Security
    Security --> API
    API --> DB
    API -->|"Cache-aside reads"| Redis
    API -->|"Account / Match / Ranked"| Riot
    API -->|"Streaming analysis"| OpenAI
    API -->|"Checkout / Webhooks"| Stripe
    Browser -->|"Icons & assets"| DDragon
    Swagger -.->|"Try it out"| API
```

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Java 21 / Spring Boot | Web framework and REST API |
| Spring Security + JWT | Stateless authentication (jjwt) |
| Spring Data JPA | Database access (repositories) |
| PostgreSQL | Production relational database |
| Redis 7 | Distributed cache for Riot API responses (cache-aside, per-endpoint TTLs) |
| Flyway | Database schema migrations |
| Spring WebFlux | WebClient for OpenAI streaming |
| Lombok | Reduces boilerplate in entities and DTOs |
| Stripe Java SDK | Payment processing and subscription management |
| Springdoc OpenAPI | Swagger UI + API documentation |
| Testcontainers | Integration tests with real PostgreSQL |
| JaCoCo | Code coverage enforcement (70% minimum) |

### Frontend
| Technology | Purpose |
|------------|---------|
| React / TypeScript | UI framework with type safety |
| Vite | Dev server and bundler |
| React Router DOM | Client-side routing |
| Recharts | Trend charts |
| Vitest | Unit and component test runner |
| React Testing Library | Component rendering and interaction testing |

### External APIs
- **[Riot Games API](https://developer.riotgames.com)** — Account, match, ranked, summoner, and live game (spectator) data
- **[OpenAI API](https://platform.openai.com)** — GPT-4o-mini for AI match analysis
- **[Stripe API](https://stripe.com)** — Checkout sessions, subscription lifecycle, and webhooks
- **[DDragon CDN](https://ddragon.leagueoflegends.com)** — Champion, item, spell, and profile icons
- **[Community Dragon](https://communitydragon.org)** — Ranked tier icons, Arena augment icons

## Quick Start (Docker Compose)

```bash
# 1. Clone and configure
git clone https://github.com/jianweicheng0822/lol-tracker.git
cd lol-tracker
cp .env.example .env   # Edit .env with your API keys

# 2. Start PostgreSQL + Redis + app
docker compose up --build

# 3. Open the app and API docs
#    App:     http://localhost:8080
#    Swagger: http://localhost:8080/swagger-ui.html
```

## Manual Setup

### Prerequisites
- Java 21+
- Node.js 20+
- PostgreSQL 16+
- [Riot API Key](https://developer.riotgames.com)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### Environment Variables

Create a `backend/.env` file (or set env vars). The backend uses [spring-dotenv](https://github.com/paulschwarz/spring-dotenv) to load `.env` files automatically. For Docker Compose, the root `.env` file is used instead (see Quick Start above).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `RIOT_API_KEY` | Yes | — | Riot Games API key |
| `OPENAI_API_KEY` | Yes | — | OpenAI API key for AI analysis |
| `JWT_SECRET` | Yes | dev default | Secret for signing JWTs (min 32 chars) |
| `REDIS_HOST` | No | `localhost` | Redis host (used for Riot API response caching) |
| `DB_HOST` | No | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_NAME` | No | `lol_tracker` | PostgreSQL database name |
| `DB_USER` | No | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | No | `postgres` | PostgreSQL password |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed CORS origin |
| `STRIPE_SECRET_KEY` | No | — | Stripe secret key (required for PRO subscriptions) |
| `STRIPE_WEBHOOK_SECRET` | No | — | Stripe webhook signing secret |
| `STRIPE_PRICE_ID` | No | — | Stripe Price ID for the PRO plan |

### Running Locally

```bash
# Start PostgreSQL and Redis (via Docker or local install)
docker run -d --name lol-pg -p 5432:5432 \
  -e POSTGRES_DB=lol_tracker -e POSTGRES_PASSWORD=postgres \
  postgres:16-alpine
docker run -d --name lol-redis -p 6379:6379 redis:7-alpine

# Backend — starts at http://localhost:8080
cd backend
./mvnw spring-boot:run

# Frontend — starts at http://localhost:5173 (proxies API to backend)
cd frontend
npm install
npm run dev
```

## API Documentation

Interactive Swagger UI is available at `/swagger-ui.html` when the app is running.

### Endpoints

| Domain | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| Auth | POST | `/api/auth/register` | Register new user, returns JWT |
| | POST | `/api/auth/login` | Login, returns JWT |
| Summoner | GET | `/api/summoner` | Resolve Riot ID to account |
| | GET | `/api/summoner/by-puuid` | Resolve PUUID to account |
| Matches | GET | `/api/matches/recent` | Recent match IDs |
| | GET | `/api/matches/summary` | Match summaries with KDA and rosters |
| | GET | `/api/matches/detail` | Raw match detail from Riot API |
| | GET | `/api/matches/full-detail` | Parsed match detail with all participants |
| Stats | GET | `/api/stats` | Aggregated player statistics |
| Ranked | GET | `/api/ranked` | Ranked entries (Solo/Duo, Flex) |
| Favorites | GET | `/api/favorites` | List all favorites |
| | POST | `/api/favorites` | Add a player to favorites |
| | DELETE | `/api/favorites/{puuid}` | Remove a favorite |
| | GET | `/api/favorites/check/{puuid}` | Check if player is favorited |
| Trends | GET | `/api/trends/champions` | Per-champion aggregated stats |
| | GET | `/api/trends/matches` | Per-match trend data points |
| | GET | `/api/trends/lp` | LP progression history |
| Global | GET | `/api/global/champions` | Global champion pick/win rates |
| | GET | `/api/global/overview` | Global aggregate stats |
| AI | POST | `/api/analyze` | AI match analysis (sync, PRO only) |
| | POST | `/api/analyze/stream` | AI match analysis (SSE streaming, PRO only) |
| Subscription | GET | `/api/tier` | Get current user's subscription tier |
| | GET | `/api/subscription` | Get subscription details |
| | POST | `/api/subscription/cancel` | Cancel subscription at period end |
| Checkout | POST | `/api/checkout/session` | Create Stripe Checkout session |
| | POST | `/api/checkout/portal` | Create Stripe Customer Portal session |
| Leaderboard | GET | `/api/leaderboard` | Regional ranked leaderboard (Challenger/Grandmaster/Master) |
| Live Game | GET | `/api/live-game` | Active game data via Spectator API |
| Multi-Search | POST | `/api/multi-search` | Batch player lookup |
| Webhook | POST | `/api/stripe/webhook` | Stripe webhook handler |
| Health | GET | `/health` | Health check |

## Testing

### Backend

```bash
cd backend

# Unit tests only (MockMvc with mocked services, no Docker needed)
./mvnw test

# Unit + integration tests (requires Docker for Testcontainers)
./mvnw verify
```

| Suite | Count | Database | Docker required |
|-------|-------|----------|-----------------|
| Unit tests | 192 | None (mocked) | No |
| Integration tests | 12 | PostgreSQL (Testcontainers) | Yes |

Unit tests use `@WebMvcTest` with MockMvc and mocked service layers — no database is involved. Integration tests use Testcontainers to spin up a real PostgreSQL container and run Flyway migrations, validating the full stack end-to-end.

### Frontend

```bash
cd frontend

# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Run with coverage report
npm run test:coverage
```

| Suite | Count | Description |
|-------|-------|-------------|
| Utility tests | 37 | `playerInsights`, `trends`, `lp` conversion |
| Component tests | 159 | MatchList, ScoreboardTable, ProfileHeader, RankSummary, OverviewTab, ChampionsTab, etc. |
| Hook tests | 9 | `useIsMobile`, `useTabNavigation` |
| API module tests | 11 | Token management, login/register, error parsing |
| Page tests | 15 | HomePage, MatchDetailPage rendering and state |

Frontend tests use Vitest with jsdom and React Testing Library. Components are tested for rendering, user interaction, form validation, and navigation. API tests mock `fetch` and `localStorage` to verify request construction and token handling.

## Database

PostgreSQL with Flyway-managed migrations:

| Migration | Description |
|-----------|-------------|
| `V1__init_schema.sql` | Initial schema: `app_users`, `favorite_players`, `match_records`, `lp_snapshots` |
| `V2__add_auth_fields.sql` | Adds `username` and `password` columns to `app_users` |
| `V3__add_tracked_players.sql` | Adds `tracked_players` table for background match ingestion |
| `V4__add_user_id_to_favorites.sql` | Links `favorite_players` to `app_users` with foreign key |
| `V5__add_stripe_fields.sql` | Adds Stripe customer ID, subscription ID, and status to `app_users` |
| `V6__add_composite_match_index.sql` | Adds composite index on `match_records` for query performance |

Schema is validated at startup (`ddl-auto=validate`) — Flyway is the single source of truth for DDL.

## Production Deployment

### Docker

```bash
docker build -t lol-tracker .

docker run -p 8080:8080 \
  -e RIOT_API_KEY=your-key \
  -e OPENAI_API_KEY=your-key \
  -e JWT_SECRET=your-secret \
  -e DB_HOST=your-db-host \
  -e DB_NAME=lol_tracker \
  -e DB_USER=postgres \
  -e DB_PASSWORD=your-password \
  -e REDIS_HOST=your-redis-host \
  -e STRIPE_SECRET_KEY=your-stripe-key \
  -e STRIPE_WEBHOOK_SECRET=your-webhook-secret \
  -e STRIPE_PRICE_ID=your-price-id \
  lol-tracker
```

### AWS EC2

Automated via GitHub Actions (`.github/workflows/ci-cd.yml`):
- **On PR to `master`** — runs lint, build, and tests
- **On push to `master`** — builds Docker image, pushes to GHCR, deploys to EC2 via SSH

Production requires a PostgreSQL instance and a Redis instance (Docker containers on EC2, or managed services like RDS/ElastiCache).

## Project Structure

```
lol-tracker/
├── docker-compose.yml          # Local dev: PostgreSQL + Redis + app
├── .env.example                # Env var template
├── Dockerfile                  # Multi-stage build
├── backend/
│   ├── src/main/java/com/jw/backend/
│   │   ├── *Controller.java    # REST endpoints (Javadoc on all public methods)
│   │   ├── controller/         # Stripe checkout and webhook controllers
│   │   ├── SpaForwardingController.java  # Forwards non-API routes to React SPA
│   │   ├── security/           # JWT filter, SecurityConfig, JwtUtil
│   │   ├── config/             # OpenApiConfig (Swagger/OpenAPI)
│   │   ├── service/            # Business logic layer
│   │   ├── repository/         # Spring Data JPA interfaces
│   │   ├── entity/             # JPA entities (AppUser, MatchRecord, etc.)
│   │   ├── dto/                # Immutable records for API transport
│   │   ├── region/             # Riot region routing/platform mappings
│   │   └── exception/          # Global exception handler + custom exceptions
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   └── db/migration/       # Flyway SQL migrations
│   └── src/test/
│       ├── java/.../integration/  # Testcontainers integration tests
│       └── resources/             # Test config (Flyway disabled, mocked keys)
└── frontend/
    └── src/
        ├── api.ts              # JWT token management + API client
        ├── types.ts            # Shared TypeScript interfaces
        ├── hooks/              # Custom React hooks (useTabNavigation)
        ├── utils/              # DDragon helpers, LP conversion, trend math
        ├── components/         # Reusable UI components (JSDoc documented)
        └── pages/              # Route-level page components
```

## Code Documentation

All source files follow a consistent documentation standard:

- **Backend (Java):** Javadoc with `@file`, `@description`, `@module` headers. All public methods have `@param`, `@returns`, and `@throws` annotations where applicable.
- **Frontend (TypeScript):** JSDoc with the same file header convention. Exported functions and components include parameter and return descriptions.
- **Style:** Imperative mood, concise descriptions focused on intent and business logic rather than restating code.

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com), [OpenAI API](https://platform.openai.com), and [Stripe](https://stripe.com)
