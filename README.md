# LoL Tracker

A full-stack League of Legends match history and performance analytics dashboard with AI-powered coaching.

Search any player by Riot ID, explore their ranked stats, match history, champion performance, and LP trends — all in a polished dark-themed UI with real-time AI match analysis.

## Demo

**Live Demo:** [http://54.170.131.128](http://54.170.131.128)

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

## Features

### Player Dashboard
- **Tabbed profile** with Overview, Performance, Champions, and Match History views
- **URL-driven tabs** (`?tab=performance`) with full browser back/forward support
- **Ranked display** with tier icons, LP, and win/loss for Solo/Duo and Flex queues
- **Favorite players** saved to database for quick access across sessions

### Match History
- Match cards with champion icon, KDA, items, runes, summoner spells, and team rosters
- **Expandable inline scoreboards** with full 10-player stats, damage, gold, CS, and vision
- **Arena mode** support with placement-based results and augment icons
- Clickable player names for cross-navigation between profiles
- "Load More" pagination beyond the initial 10 matches

### Performance Analytics
- **LP progression** chart tracking rank changes over time
- **Rolling win rate** trend (10-game window) with 50% reference line
- **KDA and damage trends** with 5-game moving average overlays
- **Per-champion stats** grid with win rate, KDA, damage, and CS breakdowns

### AI Match Analysis
- Click the sparkle button on any match card to open a chat modal
- Ask questions about your performance, get build advice, and receive coaching tips
- Streaming responses via SSE for responsive UX
- System prompt constructed server-side from structured match data (no prompt injection)

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Java | 21 | Runtime |
| Spring Boot | 3.5.10 | Web framework |
| Spring Data JPA | — | Database access |
| Spring WebFlux | — | WebClient for OpenAI streaming |
| H2 Database | — | Embedded SQL database |
| Maven | — | Build tool |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2 | UI framework |
| TypeScript | 5.9 | Type safety |
| Vite | 7.2 | Dev server and bundler |
| React Router | 7.13 | Client-side routing |
| Recharts | 3.7 | Trend charts |

### External APIs
- **[Riot Games API](https://developer.riotgames.com)** — Account, match, ranked, and summoner data
- **[OpenAI API](https://platform.openai.com)** — GPT-4o-mini for AI match analysis
- **[DDragon CDN](https://ddragon.leagueoflegends.com)** — Champion, item, spell, and profile icons
- **[Community Dragon](https://communitydragon.org)** — Ranked tier icons, Arena augment icons

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │ ──► │   Backend   │ ──► │  Database   │
│   (React)   │     │(Spring Boot)│     │    (H2)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                      ┌────┴────┐
                      ▼         ▼
               ┌──────────┐ ┌──────────┐
               │ Riot API │ │ OpenAI   │
               └──────────┘ └──────────┘
```

## Local Development Setup

### Prerequisites

- Java 21+
- Node.js 18+
- [Riot API Key](https://developer.riotgames.com)
- [OpenAI API Key](https://platform.openai.com/api-keys)

### Environment Variables

Create a `backend/.env` file:

```env
RIOT_API_KEY=your-riot-api-key
OPENAI_API_KEY=your-openai-api-key
```

### Running the Backend

```bash
cd backend
./mvnw spring-boot:run
```

The Spring Boot server starts at **http://localhost:8080**.

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server starts at **http://localhost:5173** and proxies API requests to the backend.

### Local Development URLs

| Service  | URL                     | Purpose                        |
|----------|-------------------------|--------------------------------|
| Frontend | `http://localhost:5173`  | React dev server (hot reload)  |
| Backend  | `http://localhost:8080`  | Spring Boot API server         |

## Production Deployment

### Docker Build

The project uses a **multi-stage Dockerfile** at the repository root to produce a single optimized image:

1. **Stage 1 — Frontend build:** Node.js 20 Alpine compiles the React app to static assets
2. **Stage 2 — Backend build:** Maven 3.9 + Java 21 compiles the Spring Boot application and copies the frontend build into `src/main/resources/static`
3. **Stage 3 — Runtime:** Eclipse Temurin JRE 21 Alpine runs the final JAR with minimal image size

```bash
docker build -t lol-tracker .
```

### Running the Container

Pass API keys as environment variables at runtime — they are never baked into the image:

```bash
docker run -p 8080:8080 \
  -e RIOT_API_KEY=your-riot-api-key \
  -e OPENAI_API_KEY=your-openai-api-key \
  lol-tracker
```

The application serves both the API and the React frontend on **port 8080**.

### AWS EC2 Deployment

The project is deployed to an **AWS EC2** instance with automated CI/CD via GitHub Actions (`.github/workflows/ci-cd.yml`):

1. **On pull request to `master`** — runs frontend lint/build and backend tests
2. **On push to `master`** — runs CI checks, builds a Docker image, pushes it to **GitHub Container Registry (GHCR)**, and deploys to EC2 via SSH

The deployment step SSHs into the EC2 instance, pulls the latest image from GHCR, stops the old container, and starts a new one with the required environment variables.

**Required GitHub Secrets:**

| Secret         | Purpose                          |
|----------------|----------------------------------|
| `EC2_HOST`     | EC2 instance public IP/hostname  |
| `EC2_USER`     | SSH username (e.g., `ec2-user`)  |
| `EC2_SSH_KEY`  | Private key for SSH access       |
| `RIOT_API_KEY` | Riot Games API key               |
| `OPENAI_API_KEY` | OpenAI API key                 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summoner` | Resolve Riot ID to account with profile icon |
| GET | `/api/matches/recent` | Get recent match IDs |
| GET | `/api/matches/summary` | Get match summaries with KDA and team rosters |
| GET | `/api/matches/detail` | Get raw match detail JSON from Riot API |
| GET | `/api/matches/full-detail` | Get parsed match detail with all participants |
| GET | `/api/stats` | Get aggregated player statistics |
| GET | `/api/ranked` | Get ranked entries (Solo/Duo, Flex) |
| GET | `/api/favorites` | List all favorite players |
| POST | `/api/favorites` | Add a player to favorites |
| DELETE | `/api/favorites/{puuid}` | Remove a player from favorites |
| GET | `/api/favorites/check/{puuid}` | Check if a player is favorited |
| GET | `/api/trends/champions` | Per-champion aggregated stats |
| GET | `/api/trends/matches` | Per-match trend data points |
| GET | `/api/trends/lp` | LP progression history |
| POST | `/api/analyze` | AI match analysis (synchronous) |
| POST | `/api/analyze/stream` | AI match analysis (SSE streaming) |

## Project Structure

```
lol-tracker/
├── Dockerfile                    # Multi-stage production build
├── backend/
│   ├── src/main/java/com/jw/backend/
│   │   ├── *Controller.java      # REST API endpoints
│   │   ├── service/              # Business logic (Riot API, stats, LP tracking)
│   │   ├── repository/           # JPA data access
│   │   ├── entity/               # Database entities
│   │   ├── dto/                  # Data transfer objects
│   │   ├── region/               # Region enum mapping
│   │   └── exception/            # Global error handling
│   └── src/test/                 # Unit tests (45 tests)
└── frontend/
    └── src/
        ├── api.ts                # API client functions
        ├── types.ts              # TypeScript type definitions
        ├── hooks/
        │   └── useTabNavigation.ts
        ├── utils/
        │   ├── ddragon.ts        # DDragon CDN helpers and icon URL builders
        │   ├── lp.ts             # LP → absolute number conversion
        │   └── trends.ts         # Moving average and rolling win rate
        ├── components/
        │   ├── MatchList.tsx      # Match cards with expandable scoreboards
        │   ├── AiChatModal.tsx    # AI analysis chat (streaming)
        │   ├── ScoreboardTable.tsx
        │   ├── ProfileHeader.tsx  # Player icon, name, refresh/favorite
        │   ├── TabBar.tsx         # Tab navigation bar
        │   └── tabs/
        │       ├── OverviewTab.tsx
        │       ├── PerformanceTab.tsx
        │       ├── ChampionsTab.tsx
        │       └── MatchHistoryTab.tsx
        └── pages/
            ├── HomePage.tsx
            ├── PlayerPage.tsx     # Tabbed dashboard
            └── MatchDetailPage.tsx
```

## Testing

```bash
cd backend
./mvnw test
```

**45 unit tests** across 5 test classes:
- `RiotRegionTest` (14 tests) — Region enum mapping
- `GlobalExceptionHandlerTest` (3 tests) — Error response formatting
- `SummonerControllerTest` (5 tests) — Account lookup endpoint
- `MatchControllerTest` (12 tests) — Match data endpoints
- `FavoriteControllerTest` (10 tests) — Favorites CRUD

## Database

H2 console is disabled by default. Enable it for local debugging with `-Dspring.h2.console.enabled=true`.

| Setting | Value |
|---------|-------|
| JDBC URL | `jdbc:h2:file:./data/lol-tracker-db` |
| Username | `sa` |
| Password | *(empty)* |

**Tables:**

| Table | Purpose |
|-------|---------|
| `favorite_players` | Saved players with Riot ID and region |
| `match_records` | Per-player match history for trend analysis |
| `lp_snapshots` | LP progression snapshots (saved only on rank changes) |

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com) and [OpenAI API](https://platform.openai.com)
