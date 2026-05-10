/**
 * @file FavoritesList.tsx
 * @description Render clickable favorite player chips that navigate to a saved player's profile.
 *   Each chip includes a remove button to delete the favorite via the backend API.
 * @module frontend.components
 */
import { useNavigate } from "react-router-dom";
import type { FavoritePlayer } from "../types";
import { removeFavorite } from "../api";

type FavoritesListProps = {
  favorites: FavoritePlayer[];
  onUpdate: () => void;
};

/**
 * Render a horizontal row of favorite player chips. Navigate to the player's
 * profile on click, or remove the favorite when the close button is pressed.
 *
 * @param props - The list of favorite players and a callback to refresh the list after mutations.
 * @returns The favorites chip row element, or null if the list is empty.
 */
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
