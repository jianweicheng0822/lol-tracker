# LoL Tracker

A League of Legends match history and statistics tracker built with Spring Boot and React.

Search for any player by their Riot ID and view their recent match history, KDA, and performance stats.

## Features

- **Player Search** - Search any player by Game Name and Tag (e.g., Faker#KR1)
- **Match History** - View recent matches with champion, KDA, and win/loss
- **Match Detail View** - Click any match to see a full scoreboard with all 10 players, damage charts, gold, CS, wards, and multi-kill badges
- **Player Stats** - Aggregated statistics including:
  - Win rate percentage
  - Average KDA
  - Average kills, deaths, and assists
- **Player Avatar** - Profile icon displayed next to player name via Summoner v4 API
- **Ranked Info** - Display ranked tier, rank, LP, and win/loss for Solo/Duo and Flex queues
  - Tier icons from Community Dragon CDN
  - Graceful "Unranked" display for unranked players
- **Favorite Players** - Save players to favorites for quick access
  - Persistent storage (survives app restart)
  - Click to quickly search saved players
- **Multi-Region Support** - NA, EUW, KR, JP, BR, OCE
- **Client-Side Routing** - SPA navigation with React Router

## Tech Stack

### Backend
- Java 21
- Spring Boot 3.5
- Spring Data JPA
- H2 Database
- Maven
- Riot Games API

### Frontend
- React 19
- TypeScript
- Vite
- React Router

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

### Backend

1. Navigate to backend folder:
   ```bash
   cd backend
   ```

2. Create a `.env` file with your Riot API key:
   ```
   RIOT_API_KEY=your-api-key-here
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
        ├── utils/
        │   └── ddragon.ts     # DDragon CDN helpers, rune/spell mappings
        ├── components/        # Reusable UI components
        │   ├── SearchBar.tsx
        │   ├── MatchList.tsx
        │   ├── StatsBar.tsx
        │   ├── RankBadge.tsx
        │   └── FavoritesList.tsx
        └── pages/             # Route pages
            ├── HomePage.tsx
            ├── PlayerPage.tsx
            └── MatchDetailPage.tsx
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │ ──► │   Backend   │ ──► │  Database   │
│   (React)   │     │(Spring Boot)│     │    (H2)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  Riot API   │
                    └─────────────┘
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

## Data Sources

- **[DDragon CDN](https://ddragon.leagueoflegends.com)** - Champion, item, spell, and profile icons (version auto-detected at runtime)
- **[Community Dragon](https://communitydragon.org)** - Ranked tier icons, Arena augment icons

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com)