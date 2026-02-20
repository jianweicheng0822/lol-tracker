/** Landing page with search bar and saved favorites list. */
import { useEffect, useState } from "react";
import SearchBar from "../components/SearchBar";
import FavoritesList from "../components/FavoritesList";
import { fetchFavorites } from "../api";
import type { FavoritePlayer } from "../types";

export default function HomePage() {
  const [favorites, setFavorites] = useState<FavoritePlayer[]>([]);

  const loadFavorites = async () => {
    try {
      const data = await fetchFavorites();
      setFavorites(data);
    } catch (e) {
      console.error("Failed to load favorites:", e);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.center}>
        <h1 style={styles.title}>LoL Tracker</h1>
        <p style={styles.subtitle}>Search for a player to view their match history</p>
        <SearchBar />
        <FavoritesList favorites={favorites} onUpdate={loadFavorites} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: "#0f172a",
    color: "#f8fafc",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  center: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px 20px",
    width: "100%",
  },
  title: {
    fontSize: 48,
    fontWeight: 800,
    margin: 0,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.5,
    marginTop: 8,
    marginBottom: 32,
  },
};