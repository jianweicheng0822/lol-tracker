# LoL Tracker

A League of Legends match history and statistics tracker built with Spring Boot and React.

Search for any player by their Riot ID and view their recent match history, KDA, and performance stats.

## Features

- **Player Search** - Search any player by Game Name and Tag (e.g., Faker#KR1)
- **Match History** - View recent matches with champion, KDA, and win/loss
- **Player Stats** - Aggregated statistics including:
  - Win rate percentage
  - Average KDA
  - Average kills, deaths, and assists
- **Multi-Region Support** - NA, EUW, KR, JP, BR, OCE

## Tech Stack

### Backend
- Java 21
- Spring Boot 3.5
- Maven
- Riot Games API

### Frontend
- React 19
- TypeScript
- Vite

### Testing
- JUnit 5
- MockMvc
- Mockito

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
| GET | `/api/stats` | Get aggregated player statistics |

## Project Structure

```
lol-tracker/
├── backend/
│   ├── src/main/java/com/jw/backend/
│   │   ├── controller/        # REST API endpoints
│   │   ├── service/           # Business logic
│   │   ├── dto/               # Data transfer objects
│   │   ├── region/            # Region enum mapping
│   │   └── exception/         # Error handling
│   └── src/test/              # Unit tests
└── frontend/
    └── src/
        ├── App.tsx            # Main application component
        └── main.tsx           # Entry point
```

## Running Tests

```bash
cd backend
./mvnw test
```

## License

This project is for educational purposes.

---

Built with the [Riot Games API](https://developer.riotgames.com)