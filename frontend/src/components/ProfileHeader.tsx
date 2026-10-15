import { useEffect, useState } from "react";
import type { Account } from "../types";
import type { Streak } from "../utils/playerInsights";
import { useDdragonVersion, hideOnError } from "../utils/ddragon";
import { COLORS } from "../utils/colors";
import { formatUpdatedAgo } from "../utils/time";

type Props = {
  account: Account;
  region: string;
  isFav: boolean;
  onToggleFavorite: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  /** When the data on screen was last loaded (ms since epoch). */
  lastUpdated?: number | null;
  streak?: Streak | null;
  climbStatus?: "climbing" | "falling" | "stable" | null;
};

export default function ProfileHeader({
  account, region, isFav, onToggleFavorite, onRefresh, isRefreshing = false, lastUpdated, streak, climbStatus,
}: Props) {
  const ddVersion = useDdragonVersion();
  // Tick every 30s so the "Updated ... ago" label stays current. Right after a refresh `now` may be a
  // little older than lastUpdated; that still reads as "just now".
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={styles.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
        <img
          src={`https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${account.profileIconId}.png`}
          alt="Profile Icon"
          style={{ width: 56, height: 56, borderRadius: "50%", border: `2px solid ${COLORS.cardBorder}` }}
          onError={hideOnError}
        />
        <div>
          <h2 style={{ margin: 0, fontSize: "clamp(22px, 6vw, 28px)", overflowWrap: "anywhere" }}>
            {account.gameName}
            <span style={{ color: COLORS.textDim, fontWeight: 400 }}> #{account.tagLine}</span>
          </h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            <span style={{ fontSize: 13, opacity: 0.5 }}>{region}</span>
            {streak && streak.count >= 2 && (
              <span style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
                background: streak.type === "win" ? "rgba(72,209,160,0.12)" : "rgba(232,64,87,0.12)",
                color: streak.type === "win" ? "#48D1A0" : "#E84057",
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
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {(isRefreshing || lastUpdated) && (
          <span style={styles.updatedLabel} aria-live="polite">
            {isRefreshing ? "Refreshing\u2026" : formatUpdatedAgo(lastUpdated!, now)}
          </span>
        )}
        <button
          style={{ ...styles.refreshBtn, ...(isRefreshing ? styles.refreshBtnBusy : {}) }}
          onClick={onRefresh}
          disabled={isRefreshing}
          title={isRefreshing ? "Refreshing\u2026" : "Refresh data"}
          aria-label="Refresh data"
        >
          <span style={isRefreshing ? styles.spinning : undefined}>{"\u21BB"}</span>
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
    // On narrow screens the refresh/favorite buttons move below the name instead of off-screen
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `1px solid ${COLORS.cardBorder}`,
  },
  favBtn: {
    padding: "8px 16px",
    borderRadius: 6,
    background: "rgba(212,160,23,0.1)",
    border: "1px solid rgba(212,160,23,0.3)",
    color: "#D4A017",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  favBtnActive: {
    padding: "8px 16px",
    borderRadius: 6,
    background: "rgba(212,160,23,0.25)",
    border: "1px solid rgba(212,160,23,0.5)",
    color: "#E8C84A",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    background: "rgba(212,160,23,0.1)",
    border: "1px solid rgba(212,160,23,0.3)",
    color: "#D4A017",
    cursor: "pointer",
    fontSize: 16,
    fontWeight: 600,
    lineHeight: 1,
  },
  refreshBtnBusy: {
    cursor: "default",
    opacity: 0.7,
  },
  spinning: {
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  updatedLabel: {
    fontSize: 12,
    color: COLORS.textDim,
    whiteSpace: "nowrap",
  },
  climbBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    background: "rgba(72,209,160,0.15)",
    color: "#48D1A0",
  },
  fallBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 4,
    background: "rgba(232,64,87,0.15)",
    color: "#E84057",
  },
};
