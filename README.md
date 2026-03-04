# LoL Tracker

A League of Legends match history and statistics tracker built with Spring Boot and React.

Search for any player by their Riot ID and view their recent match history, KDA, and performance stats.

## Features

- **Tabbed Dashboard** - Professional player profile with 4 tabs:
  - **Overview** - At-a-glance summary with rank badges, win rate donut, KDA, recent games W/L strip
  - **Performance** - Trend charts powered by Recharts: LP progression, rolling win rate, KDA trend, damage/game
  - **Champions** - Grid of champion cards with per-champion win rate, KDA, damage, and CS stats
  - **Match History** - Full match history with expandable inline scoreboards
- **AI Match Analysis** - GPT-powered coaching assistant for any match (see [details below](#ai-match-analysis))
- **URL-Driven Tabs** - Tab state persisted in URL params (`?tab=performance`), supporting browser back/forward navigation
- **Player Search** - Search any player by Game Name and Tag (e.g., Faker#KR1)
- **Match History** - View recent matches with champion, KDA, and win/loss
  - Stronger win/loss visual distinction with color-coded backgrounds (blue for victory, red for defeat)
  - Expandable inline scoreboard via chevron toggle on each match card
  - "Load More" pagination to browse beyond the initial 10 matches
- **Match Detail View** - Full scoreboard with all 10 players, damage charts, gold, CS, wards, and multi-kill badges
  - Clickable player names navigate to that player's match history
- **Arena Mode Support** - Placement-based team grouping (1st–8th) with colored headers; placement 1st–4th counts as victory, 5th–8th as defeat
- **Player Stats** - Aggregated statistics including:
  - Win rate percentage
  - Average KDA
  - Average kills, deaths, and assists
- **Player Avatar** - Profile icon displayed next to player name via Summoner v4 API
- **Ranked Info** - Display ranked tier, rank, LP, and win/loss for Solo/Duo and Flex queues
  - Tier icons from Community Dragon CDN
  - Graceful "Unranked" display for unranked players
- **LP Tracking** - Automatic LP snapshot capture on profile view; tracks rank changes over time for progression charts
- **Match Persistence** - Match records saved to local database for historical trend analysis without re-fetching from Riot API
- **Favorite Players** - Save players to favorites for quick access
  - Persistent storage (survives app restart)
  - Click to quickly search saved players
- **Multi-Region Support** - NA, EUW, KR, JP, BR, OCE
- **Client-Side Routing** - SPA navigation with React Router

## AI Match Analysis

An integrated AI coaching assistant that analyzes individual match performance using OpenAI's GPT-4o-mini model.

### How It Works

Click the sparkle (✦) button on any match card to open a ChatGPT-style modal where you can ask questions about your performance, get build advice, identify mistakes, and receive actionable improvement tips.

### Architecture

```
Frontend (structured match data + messages)
    → Backend POST /api/analyze/stream (constructs system prompt, calls OpenAI)
        → OpenAI Chat Completions API (streaming)
    ← Streams tokens back via SSE (text/event-stream)
← Frontend renders tokens incrementally in chat UI
```

### Security

- The OpenAI API key is stored server-side only (loaded from environment variable via `.env`)
- The frontend sends **structured match data** (KDA, items, team comps) — not prompt text
- The backend constructs the system prompt, preventing client-side prompt injection
- No API keys are ever exposed in network requests visible to the browser

### Design Decisions

- **Streaming over synchronous** — SSE streaming provides responsive UX where tokens appear as they're generated, rather than waiting for the full response
- **Backend prompt construction** — The system prompt is built server-side from structured data, keeping prompt engineering confidential and secure
- **Conversation history** — Full chat history is sent with each request to maintain multi-turn context, enabling natural follow-up questions
- **WebFlux coexistence** — `spring-boot-starter-webflux` is added alongside `spring-boot-starter-web` solely for `WebClient` streaming support; the app remains Servlet-based

### Technologies

- **OpenAI GPT-4o-mini** — Cost-effective model with strong analytical capabilities
- **Spring WebFlux WebClient** — Non-blocking HTTP client for streaming OpenAI responses
- **Server-Sent Events (SSE)** — Lightweight streaming protocol for real-time token delivery
- **React state management** — Local component state for conversation history (resets on modal close)

## Tech Stack

### Backend
- Java 21
- Spring Boot 3.5
- Spring Data JPA
- Spring WebFlux (WebClient for OpenAI streaming)
- H2 Database
- Maven
- Riot Games API
- OpenAI API

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Recharts (trend charts)

### Testing
- JUnit 5
- MockMvc
- Mockito
- 45 unit tests

## How to Run

### Prerequisites
- Java 21+
- Node.js 18+
- Riot API Key ([Get one here](https://developer.riotgames.com))
- OpenAI API Key ([Get one here](https://platform.openai.com/api-keys))

### Backend

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Create a `.env` file with your API keys:
   ```
   RIOT_API_KEY=your-riot-api-key
   OPENAI_API_KEY=your-openai-api-key
   ```

3. Run the application:
   ```bash
   ./mvnw spring-boot:run
   ```

4. Backend runs on `http://localhost:8080`

### Frontend

1. Navigate to frontend folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Frontend runs on `http://localhost:5173`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/summoner` | Get player account by Riot ID |
| GET | `/api/matches/recent` | Get recent match IDs |
| GET | `/api/matches/summary` | Get match summaries with KDA |
| GET | `/api/matches/detail` | Get raw match detail JSON from Riot API |
| GET | `/api/matches/full-detail` | Get parsed match detail with all participants |
| GET | `/api/stats` | Get aggregated player statistics |
| GET | `/api/favorites` | Get all favorite players |
| POST | `/api/favorites` | Add a player to favorites |
| DELETE | `/api/favorites/{puuid}` | Remove a player from favorites |
| GET | `/api/favorites/check/{puuid}` | Check if player is a favorite |
| GET | `/api/ranked` | Get ranked entries (Solo/Duo, Flex) |
| GET | `/api/trends/champions` | Get per-champion aggregated stats |
| GET | `/api/trends/matches` | Get per-match trend data points |
| GET | `/api/trends/lp` | Get LP progression history |
| POST | `/api/analyze` | AI match analysis (synchronous) |
| POST | `/api/analyze/stream` | AI match analysis (SSE streaming) |

## Project Structure

```
lol-tracker/
├── backend/
│   ├── src/main/java/com/jw/backend/
│   │   ├── *Controller.java   # REST API endpoints
│   │   ├── service/           # Business logic
│   │   ├── repository/        # Database access (JPA)
│   │   ├── entity/            # Database entities
│   │   ├── dto/               # Data transfer objects
│   │   ├── region/            # Region enum mapping
│   │   └── exception/         # Error handling
│   └── src/test/              # Unit tests (45 tests)
└── frontend/
    └── src/
        ├── App.tsx            # Router setup
        ├── main.tsx           # Entry point
        ├── api.ts             # API client functions
        ├── types.ts           # TypeScript types
        ├── hooks/
        │   └── useTabNavigation.ts  # URL-driven tab state via ?tab= search params
        ├── utils/
        │   ├── ddragon.ts     # DDragon CDN helpers, rune/spell mappings
        │   ├── lp.ts          # LP conversion (tier+rank+LP → absolute number)
        │   └── trends.ts      # Moving average and rolling win rate helpers
        ├── components/        # Reusable UI components
        │   ├── SearchBar.tsx
        │   ├── MatchList.tsx
        │   ├── AiChatModal.tsx    # AI analysis chat modal (streaming)
        │   ├── ScoreboardTable.tsx
        │   ├── StatsBar.tsx
        │   ├── RankBadge.tsx
        │   ├── ProfileHeader.tsx   # Player icon, name, region, refresh/fav buttons
        │   ├── TabBar.tsx          # 4-tab navigation bar
        │   ├── FavoritesList.tsx
        │   └── tabs/               # Tab content components
        │       ├── OverviewTab.tsx      # Rank + stats + recent games summary
        │       ├── PerformanceTab.tsx   # Recharts trend charts (LP, KDA, WR, damage)
        │       ├── ChampionsTab.tsx     # Champion stats grid
        │       └── MatchHistoryTab.tsx  # Wrapper around MatchList
        └── pages/             # Route pages
            ├── HomePage.tsx
            ├── PlayerPage.tsx       # Tabbed dashboard (refactored from linear layout)
            └── MatchDetailPage.tsx
```

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

## Running Tests

```bash
cd backend
./mvnw test
```

**Test Coverage:**
- RiotRegionTest (14 tests)
- GlobalExceptionHandlerTest (3 tests)
- SummonerControllerTest (5 tests)
- MatchControllerTest (12 tests)
- FavoriteControllerTest (10 tests)

## Database Console

While the backend is running, you can view the H2 database:

1. Go to `http://localhost:8080/h2-console`
2. JDBC URL: `jdbc:h2:file:./data/lol-tracker-db`
3. Username: `sa`
4. Password: (leave empty)

### Database Tables

| Table | Description |
|-------|-------------|
| `favorite_players` | Saved favorite players with Riot ID and region |
| `match_records` | Per-player match history for trend analysis (unique per puuid + matchId) |
| `lp_snapshots` | LP progression snapshots captured on profile view (only saved on rank changes) |

## Data Sources

- **[DDragon CDN](https://ddragon.leagueoflegends.com)** - Champion, item, spell, and profile icons (version auto-detected at runtime)
- **[Community Dragon](https://communitydragon.org)** - Ranked tier icons, Arena augment icons
- **[OpenAI API](https://platform.openai.com)** - GPT-4o-mini for AI match analysis

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com) and [OpenAI API](https://platform.openai.com)
