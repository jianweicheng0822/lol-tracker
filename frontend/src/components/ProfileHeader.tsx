import type { Account } from "../types";
import type { Streak } from "../utils/playerInsights";
import { useDdragonVersion } from "../utils/ddragon";

type Props = {
  account: Account;
  region: string;
  isFav: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
  streak?: Streak | null;
  climbStatus?: "climbing" | "falling" | "stable" | null;
};

export default function ProfileHeader({ account, region, isFav, onToggleFavorite, onRefresh, streak, climbStatus }: Props) {
  const ddVersion = useDdragonVersion();

  return (
    <div style={styles.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${account.profileIconId}.png`}
          alt="Profile Icon"
          style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid #21262d" }}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: 28 }}>
            {account.gameName}
            <span style={{ color: "#484f58", fontWeight: 400 }}> #{account.tagLine}</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.5 }}>{region}</span>
            {streak && streak.count >= 2 && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                background: streak.type === "win" ? "rgba(56,189,248,0.12)" : "rgba(248,113,113,0.12)",
                color: streak.type === "win" ? "#38bdf8" : "#f87171",
              }}>
                {streak.type === "win" ? "\u2191" : "\u2193"} {streak.count}{streak.type === "win" ? "W" : "L"} Streak
              </span>
            )}
            {climbStatus === "climbing" && (
              <span style={styles.climbBadge}>{"\u2191"} Climbing</span>
            )}
            {climbStatus === "falling" && (
              <span style={styles.fallBadge}>{"\u2193"} Falling</span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={styles.refreshBtn} onClick={onRefresh} title="Refresh data">
          {"\u21BB"}
        </button>
        <button style={isFav ? styles.favBtnActive : styles.favBtn} onClick={onToggleFavorite}>
          {isFav ? "\u2605 Favorited" : "\u2606 Favorite"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: "1px solid #21262d",
  },
  favBtn: {
    padding: "8px 16px",
    borderRadius: 6,
    background: "rgba(52,211,153,0.1)",
    border: "1px solid rgba(52,211,153,0.3)",
    color: "#34d399",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  favBtnActive: {
    padding: "8px 16px",
    borderRadius: 6,
    background: "rgba(52,211,153,0.25)",
    border: "1px solid rgba(52,211,153,0.5)",
    color: "#6ee7b7",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    background: "rgba(52,211,153,0.1)",
    border: "1px solid rgba(52,211,153,0.3)",
    color: "#34d399",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },
  climbBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    background: "rgba(52,211,153,0.15)",
    color: "#34d399",
  },
  fallBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    background: "rgba(248,113,113,0.15)",
    color: "#f87171",
  },
};
