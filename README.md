# LoL Tracker

![Java](https://img.shields.io/badge/Java_21-ED8B00?style=flat&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-6DB33F?style=flat&logo=spring-boot&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)
![AWS](https://img.shields.io/badge/AWS_EC2-FF9900?style=flat&logo=amazonec2&logoColor=white)
[![codecov](https://codecov.io/gh/jianweicheng0822/lol-tracker/graph/badge.svg)](https://codecov.io/gh/jianweicheng0822/lol-tracker)

Full-stack League of Legends analytics dashboard with AI-powered match coaching. Search any player by Riot ID, explore ranked stats, match history, champion performance, and LP trends — all in a dark-themed UI with real-time AI analysis.

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

**Player Dashboard** — Tabbed profile (Overview, Performance, Champions, Match History) with URL-driven navigation, ranked badges, and persistent favorites

**Match History** — Match cards with champion icons, KDA, items, runes, and summoner spells. Expandable inline scoreboards with full 10-player stats. Arena mode support with augment icons. Cross-navigation between player profiles

**Performance Analytics** — LP progression chart, rolling win rate trend, KDA and damage trends with moving average overlays, per-champion stats grid

**AI Match Analysis** — Click the sparkle button on any match to open a chat modal. Streaming responses via SSE for real-time coaching. System prompt constructed server-side from structured match data

**Subscription Tiers** — FREE/PRO system using HttpSession identity. FREE users get 20 matches and 5 requests/minute rate limiting. PRO users get 100 matches, unlimited requests, and AI analysis access. One-click upgrade via `/api/upgrade`

## Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| Java / Spring Boot | Web framework and REST API |
| Spring Data JPA | Database access |
| Spring WebFlux | WebClient for OpenAI streaming |
| H2 Database | Embedded SQL database |

### Frontend
| Technology | Purpose |
|------------|---------|
| React / TypeScript | UI framework with type safety |
| Vite | Dev server and bundler |
| React Router | Client-side routing |
| Recharts | Trend charts |

### External APIs
- **[Riot Games API](https://developer.riotgames.com)** — Account, match, ranked, and summoner data
- **[OpenAI API](https://platform.openai.com)** — GPT-4o-mini for AI match analysis
- **[DDragon CDN](https://ddragon.leagueoflegends.com)** — Champion, item, spell, and profile icons
- **[Community Dragon](https://communitydragon.org)** — Ranked tier icons, Arena augment icons

## Architecture

```
┌── Frontend (React + TypeScript) ──────────────────────────────┐
│                                                                │
│  Pages             Components          Utilities               │
│  · HomePage         · SearchBar         · ddragon.ts ──► DDragon CDN
│  · PlayerPage       · MatchList         · trends.ts            │
│  · MatchDetailPage  · AiChatModal       · lp.ts                │
│                     · ProfileHeader     · api.ts ────► Community Dragon
│  Tabs               · ScoreboardTable                          │
│  · Overview                                                    │
│  · Performance (Recharts)                                      │
│  · Champions                                                   │
│  · MatchHistory                                                │
└────────────────────────────┬───────────────────────────────────┘
                             │ REST (JSON + SSE)
┌── Backend (Spring Boot) ───┼───────────────────────────────────┐
│                            │                                   │
│  Controllers ──► Services                                      │
│  · Summoner       · RiotApiService ──────────► Riot Games API  │
│  · Match            (in-memory TTL cache,                      │
│  · Ranked            thread pool for parallel fetch)           │
│  · Stats          · RankedService                              │
│  · Trends         · StatsService                               │
│  · Favorite       · LpTrackingService                          │
│  · AiAnalyze      · AiAnalyzeService ───────► OpenAI API      │
│  · Subscription   · SubscriptionService                        │
│  · Health         · MatchHistoryService                        │
│                   · RateLimitService                            │
│                   · FavoritePlayerService                       │
│  GlobalExceptionHandler                                        │
│                   Repositories (JPA)                            │
│                   · match_records                               │
│                   · lp_snapshots ────────────► H2 Database      │
│                   · favorite_players           (file-based)     │
│                   · app_users                                   │
│                                                                │
└── Deployment ──────────────────────────────────────────────────┘
  GitHub Actions: Push → Build & Test → GHCR → AWS EC2
  Docker: Multi-stage (Node 20 → Maven/JDK 21 → JRE 21 Alpine)
  Single container serves React SPA + Spring Boot API on :8080
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

### Running Locally

```bash
# Backend — starts at http://localhost:8080
cd backend
./mvnw spring-boot:run

# Frontend — starts at http://localhost:5173 (proxies API to backend)
cd frontend
npm install
npm run dev
```

## Production Deployment

### Docker

```bash
docker build -t lol-tracker .

docker run -p 8080:8080 \
  -e RIOT_API_KEY=your-riot-api-key \
  -e OPENAI_API_KEY=your-openai-api-key \
  lol-tracker
```

### AWS EC2

Automated via GitHub Actions (`.github/workflows/ci-cd.yml`):
- **On PR to `master`** — runs lint, build, and tests
- **On push to `master`** — builds Docker image, pushes to GHCR, deploys to EC2 via SSH

## API Endpoints

| Domain | Method | Endpoint | Description |
|--------|--------|----------|-------------|
| Summoner | GET | `/api/summoner` | Resolve Riot ID to account |
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
| AI | POST | `/api/analyze` | AI match analysis (sync, PRO only) |
| | POST | `/api/analyze/stream` | AI match analysis (SSE streaming, PRO only) |
| Subscription | GET | `/api/tier` | Get current user's subscription tier |
| | GET | `/api/upgrade` | Upgrade current user to PRO |

## Project Structure

```
lol-tracker/
├── Dockerfile
├── backend/
│   ├── src/main/java/com/jw/backend/
│   │   ├── *Controller.java
│   │   ├── service/
│   │   ├── repository/
│   │   ├── entity/
│   │   ├── dto/
│   │   ├── region/
│   │   └── exception/
│   └── src/test/
└── frontend/
    └── src/
        ├── api.ts
        ├── types.ts
        ├── hooks/
        ├── utils/
        ├── components/
        └── pages/
```

## Testing

```bash
cd backend
./mvnw test
```

**45 unit tests** covering controllers, exception handling, and region mapping.

## Database

H2 embedded file-based database with four tables: `favorite_players`, `match_records`, `lp_snapshots`, and `app_users`. Console can be enabled for debugging with `-Dspring.h2.console.enabled=true`.

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com) and [OpenAI API](https://platform.openai.com)
