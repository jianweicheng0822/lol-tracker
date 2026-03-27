/**
 * Profile header — displays the player's icon, Riot ID, region, and action buttons.
 * Always visible above the tab bar on the player dashboard.
 * Extracted from PlayerPage to keep the tabbed layout clean.
 */
import type { Account } from "../types";
import { useDdragonVersion } from "../utils/ddragon";

type Props = {
  account: Account;
  region: string;
  isFav: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
};

export default function ProfileHeader({ account, region, isFav, onToggleFavorite, onRefresh }: Props) {
  const ddVersion = useDdragonVersion();

  return (
    <div style={styles.header}>
      {/* Left side: profile icon + Riot ID + region label */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Profile icon from DDragon CDN — circular with slate border */}
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${account.profileIconId}.png`}
          alt="Profile Icon"
          style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #334155" }}
        />
        <div>
          {/* Player name with dimmed tag portion */}
          <h2 style={{ margin: 0, fontSize: 28 }}>
            {account.gameName}
            <span style={{ color: "#64748b", fontWeight: 400 }}> #{account.tagLine}</span>
          </h2>
          <div style={{ fontSize: 13, opacity: 0.5, marginTop: 4 }}>{region}</div>
        </div>
      </div>
      {/* Right side: refresh and favorite action buttons */}
      <div style={{ display: "flex", gap: 8 }}>
        {/* Refresh button — re-fetches all player data from the Riot API */}
        <button style={styles.refreshBtn} onClick={onRefresh} title="Refresh data">
          ↻
        </button>
        {/* Favorite toggle — filled star when active, outlined when inactive */}
        <button style={isFav ? styles.favBtnActive : styles.favBtn} onClick={onToggleFavorite}>
          {isFav ? "★ Favorited" : "☆ Favorite"}
        </button>
      </div>
    </div>
  );
}

// --- Styles: indigo-tinted buttons matching the dark theme ---
const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #334155", // Slate divider below the header
  },
  favBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  favBtnActive: {
    padding: "8px 16px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.25)",
    border: "1px solid rgba(99,102,241,0.5)",
    color: "#c7d2fe",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    background: "rgba(99,102,241,0.1)",
    border: "1px solid rgba(99,102,241,0.3)",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },
};
