import { useNavigate } from "react-router-dom";
import type { FavoritePlayer } from "../types";
import { removeFavorite } from "../api";

type FavoritesListProps = {
  favorites: FavoritePlayer[];
  onUpdate: () => void;
};

export default function FavoritesList({ favorites, onUpdate }: FavoritesListProps) {
  const navigate = useNavigate();

  if (favorites.length === 0) return null;

  const handleClick = (fav: FavoritePlayer) => {
    navigate(`/player/${fav.region}/${encodeURIComponent(fav.gameName)}/${encodeURIComponent(fav.tagLine)}`);
  };

  const handleRemove = async (e: React.MouseEvent, puuid: string) => {
    e.stopPropagation();
    try {
      await removeFavorite(puuid);
      onUpdate();
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.label}>Favorites</div>
      <div style={styles.chipRow}>
        {favorites.map((fav) => (
          <div key={fav.id} style={styles.chip} onClick={() => handleClick(fav)}>
            <span>{fav.gameName}#{fav.tagLine}</span>
            <button
              style={styles.removeBtn}
              onClick={(e) => handleRemove(e, fav.puuid)}
              title="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 24,
    width: "100%",
    maxWidth: 560,
  },
  label: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(99,102,241,0.12)",
    border: "1px solid rgba(99,102,241,0.25)",
    borderRadius: 20,
    padding: "6px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 16,
    padding: 0,
    lineHeight: 1,
  },
};