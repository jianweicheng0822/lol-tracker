/**
 * @file FavoritesList.tsx
 * @description The home page's favorites row: a League-client-style avatar for each saved player,
 *   with their solo rank and last 5 ranked games. Removing one can be undone for a few seconds.
 * @module frontend.components
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { FavoritePlayer, MatchSummary, RankedEntry } from "../types";
import { fetchAccountByPuuid, fetchMatchSummaries, fetchRanked, removeFavorite } from "../api";
import { useDdragonVersion, ddragonBase, hideOnError } from "../utils/ddragon";
import { COLORS } from "../utils/colors";
import { TIER_COLORS, tierIconUrl } from "../utils/lp";

type FavoritesListProps = {
  favorites: FavoritePlayer[];
  onUpdate: () => void;
};

/** More than this and the rest hide behind "View all". */
const MAX_VISIBLE = 6;
const RECENT_GAME_COUNT = 5;
const RANKED_SOLO_QUEUE = 420;
const UNDO_MS = 6000;

/**
 * Render the favorites row, or a hint on how to add favorites when there are none.
 *
 * @param props - The saved players and a callback to reload them after a change.
 */
export default function FavoritesList({ favorites, onUpdate }: FavoritesListProps) {
  const [showAll, setShowAll] = useState(false);
  // Removal waits out the undo window before it reaches the server, so undoing keeps the player
  // in place (re-adding would move them to the end of the list)
  const [pending, setPending] = useState<FavoritePlayer | null>(null);
  const pendingRef = useRef<FavoritePlayer | null>(null);
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => { onUpdateRef.current = onUpdate; }, [onUpdate]);

  const startRemoval = (fav: FavoritePlayer) => {
    if (pendingRef.current) commitRemoval(pendingRef.current, onUpdateRef.current);
    pendingRef.current = fav;
    setPending(fav);
  };

  const undo = () => {
    pendingRef.current = null;
    setPending(null);
  };

  useEffect(() => {
    if (!pending) return;
    const t = setTimeout(() => {
      pendingRef.current = null;
      setPending(null);
      commitRemoval(pending, onUpdateRef.current);
    }, UNDO_MS);
    return () => clearTimeout(t);
  }, [pending]);

  // Leaving the page during the undo window still removes the player
  useEffect(() => () => {
    if (pendingRef.current) commitRemoval(pendingRef.current, onUpdateRef.current);
  }, []);

  const shown = favorites.filter((f) => f.puuid !== pending?.puuid);
  const visible = showAll ? shown : shown.slice(0, MAX_VISIBLE);

  return (
    <section style={styles.container} aria-label="Favorites">
      <div style={styles.titleRow}>
        <span style={{ ...styles.titleLine, background: `linear-gradient(90deg, transparent, ${COLORS.gold}66)` }} />
        <span style={styles.title}>Favorites</span>
        <span style={{ ...styles.titleLine, background: `linear-gradient(90deg, ${COLORS.gold}66, transparent)` }} />
      </div>

      {shown.length === 0 ? (
        <div style={styles.empty}>
          <div style={styles.emptyTitle}>Keep your friends and rivals one click away</div>
          Press <span style={{ color: COLORS.gold }}>☆ Favorite</span> on any player page and
          they'll show up here with their rank and recent games.
        </div>
      ) : (
        <>
          <div style={styles.row}>
            {visible.map((fav) => (
              <FavoriteAvatar key={fav.puuid} fav={fav} onRemove={() => startRemoval(fav)} />
            ))}
          </div>
          {shown.length > MAX_VISIBLE && (
            <button style={styles.moreBtn} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show less" : `View all ${shown.length} →`}
            </button>
          )}
        </>
      )}

      {pending && (
        <div style={styles.undoToast} role="status">
          Removed {pending.gameName} from favorites
          <button style={styles.undoBtn} onClick={undo}>Undo</button>
        </div>
      )}
    </section>
  );
}

function commitRemoval(fav: FavoritePlayer, onDone: () => void) {
  removeFavorite(fav.puuid)
    .then(onDone)
    .catch((err) => console.error("Failed to remove favorite:", err));
}

/** One saved player. Shows the saved name immediately; icon, rank and recent games fill in as they load. */
function FavoriteAvatar({ fav, onRemove }: { fav: FavoritePlayer; onRemove: () => void }) {
  const navigate = useNavigate();
  const imgBase = ddragonBase(useDdragonVersion());
  const [iconId, setIconId] = useState<number | null>(null);
  const [solo, setSolo] = useState<RankedEntry | null | undefined>(undefined);
  const [form, setForm] = useState<boolean[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAccountByPuuid(fav.puuid, fav.region)
      .then((acc: { profileIconId: number }) => { if (!cancelled) setIconId(acc.profileIconId); })
      .catch(() => {});
    fetchRanked(fav.puuid, fav.region)
      .then((entries: RankedEntry[]) => {
        if (!cancelled) setSolo(entries.find((e) => e.queueType === "RANKED_SOLO_5x5") ?? null);
      })
      .catch(() => { if (!cancelled) setSolo(null); });
    fetchMatchSummaries(fav.puuid, fav.region, RECENT_GAME_COUNT, 0, RANKED_SOLO_QUEUE)
      .then((games: MatchSummary[]) => { if (!cancelled) setForm(games.map((g) => g.win)); })
      .catch(() => { if (!cancelled) setForm([]); });
    return () => { cancelled = true; };
  }, [fav.puuid, fav.region]);

  const tierColor = solo ? TIER_COLORS[solo.tier.toUpperCase()] ?? COLORS.gold : COLORS.textDim;
  const rankName = solo
    ? `${solo.tier.charAt(0)}${solo.tier.slice(1).toLowerCase()}${["MASTER", "GRANDMASTER", "CHALLENGER"].includes(solo.tier.toUpperCase()) ? "" : ` ${solo.rank}`}`
    : solo === null ? "Unranked" : "";

  return (
    <div className="fav-avatar" style={styles.avatarWrap}>
      <button
        className="fav-avatar__open"
        style={styles.avatarBtn}
        title={`${fav.gameName}#${fav.tagLine}${rankName ? ` · ${rankName}` : ""}`}
        onClick={() => navigate(`/player/${fav.region}/${encodeURIComponent(fav.gameName)}/${encodeURIComponent(fav.tagLine)}`)}
      >
        <span style={styles.iconWrap}>
          {iconId != null ? (
            <img
              src={`${imgBase}/profileicon/${iconId}.png`}
              alt=""
              style={{ ...styles.icon, borderColor: tierColor }}
              onError={hideOnError}
            />
          ) : (
            <span style={{ ...styles.icon, ...styles.iconPlaceholder }} />
          )}
          {solo !== undefined && (
            <span style={{ ...styles.crestBadge, borderColor: tierColor }}>
              <img src={tierIconUrl(solo ? solo.tier : "unranked")} alt="" style={styles.crest} onError={hideOnError} />
            </span>
          )}
        </span>
        <span style={styles.name}>{fav.gameName}</span>
        {/* Full rank name rather than an abbreviation, so it reads the same for every tier */}
        <span style={{ ...styles.rankName, color: tierColor }}>{rankName}</span>
        <FormDots form={form} />
      </button>
      <button
        className="fav-avatar__remove"
        style={styles.removeBtn}
        onClick={onRemove}
        title={`Remove ${fav.gameName} from favorites`}
        aria-label={`Remove ${fav.gameName} from favorites`}
      >
        ×
      </button>
    </div>
  );
}

/** Last 5 ranked games, most recent first: teal for a win, red for a loss. */
function FormDots({ form }: { form: boolean[] | null }) {
  if (form && form.length === 0) return <span style={styles.dots} />;
  const games = form ?? Array<boolean | null>(RECENT_GAME_COUNT).fill(null);
  return (
    <span style={styles.dots} title={form ? "Last 5 ranked games, most recent first" : undefined}>
      {games.map((win, i) => {
        const color = win == null ? "rgba(255,255,255,0.15)" : win ? COLORS.teal : COLORS.loss;
        return (
          <span
            key={i}
            data-testid={win == null ? "form-dot-loading" : win ? "form-dot-win" : "form-dot-loss"}
            style={{ ...styles.dot, background: color, boxShadow: win == null ? "none" : `0 0 6px ${color}88` }}
          />
        );
      })}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginTop: 30,
    width: "100%",
    maxWidth: 640,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  titleLine: {
    flex: 1,
    height: 1,
  },
  title: {
    fontFamily: "Cinzel, Georgia, serif",
    fontSize: 13,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: COLORS.gold,
  },
  row: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "16px 18px",
  },
  avatarWrap: {
    position: "relative",
    width: 80,
  },
  avatarBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    background: "none",
    border: "none",
    padding: 0,
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  },
  iconWrap: {
    position: "relative",
    width: 64,
    height: 64,
  },
  icon: {
    display: "block",
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: "2px solid",
    boxSizing: "border-box",
    boxShadow: `0 0 0 3px ${COLORS.pageBg}, 0 0 0 4px rgba(200,155,60,0.4)`,
  },
  iconPlaceholder: {
    background: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  crestBadge: {
    position: "absolute",
    left: "50%",
    bottom: -10,
    transform: "translateX(-50%)",
    display: "flex",
    padding: 2,
    background: COLORS.pageBg,
    border: "1px solid",
    borderRadius: "50%",
  },
  crest: {
    width: 16,
    height: 16,
  },
  name: {
    maxWidth: "100%",
    marginTop: 14,
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rankName: {
    // Reserves its line while the rank loads, so the dots below don't jump
    minHeight: 14,
    marginTop: 1,
    fontSize: 10.5,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  dots: {
    display: "inline-flex",
    gap: 4,
    height: 5,
    marginTop: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: "50%",
  },
  removeBtn: {
    position: "absolute",
    top: -4,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: COLORS.pageBg,
    border: `1px solid ${COLORS.cardBorder}`,
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 1,
    padding: 0,
    cursor: "pointer",
  },
  moreBtn: {
    display: "block",
    margin: "14px auto 0",
    background: "none",
    border: "none",
    color: COLORS.gold,
    fontSize: 12,
    cursor: "pointer",
  },
  empty: {
    border: "1px dashed rgba(200,155,60,0.35)",
    borderRadius: 8,
    padding: "16px 18px",
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 1.6,
  },
  emptyTitle: {
    color: COLORS.textPrimary,
    fontWeight: 600,
  },
  undoToast: {
    position: "fixed",
    left: "50%",
    bottom: 24,
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: COLORS.surface,
    border: `1px solid ${COLORS.gold}`,
    borderRadius: 6,
    padding: "10px 16px",
    color: COLORS.textPrimary,
    fontSize: 13,
    boxShadow: "0 6px 24px rgba(0,0,0,0.5)",
    zIndex: 9999,
  },
  undoBtn: {
    background: "none",
    border: "none",
    color: COLORS.gold,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    padding: 0,
  },
};
