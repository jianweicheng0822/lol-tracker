import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ChampionMastery, MatchSummary, MultiSearchPlayer } from "../types";
import { fetchMatchSummaries } from "../api";
import { useDdragonVersion, ddragonBase, hideOnError, championIconFallbackUrl } from "../utils/ddragon";
import { loadChampionMap } from "../utils/champion";
import { TIER_COLORS } from "../utils/lp";
import { COLORS, winRateColor } from "../utils/colors";

const TIER_ICON_BASE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests";

const SVG_ONLY_TIERS = new Set(["EMERALD"]);
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

function tierIconUrl(tier: string): string {
  const ext = SVG_ONLY_TIERS.has(tier.toUpperCase()) ? "svg" : "png";
  return `${TIER_ICON_BASE}/${tier.toLowerCase()}.${ext}`;
}

/** Ranked solo/duo: the queue players care about when sizing up a lobby. */
const RANKED_SOLO_QUEUE = 420;
const RECENT_GAME_COUNT = 5;

function formatTier(tier: string): string {
  return tier.charAt(0) + tier.slice(1).toLowerCase();
}

export default function MultiSearchCard({ player, region }: { player: MultiSearchPlayer; region: string }) {
  const navigate = useNavigate();
  const version = useDdragonVersion();
  const base = ddragonBase(version);

  if (player.error) {
    return (
      <div style={styles.card}>
        <div style={styles.errorContent}>
          <div style={styles.name}>{player.gameName}#{player.tagLine}</div>
          <div style={styles.errorText}>{player.error}</div>
        </div>
      </div>
    );
  }

  const soloEntry = player.rankedEntries?.find(e => e.queueType === "RANKED_SOLO_5x5");
  const flexEntry = player.rankedEntries?.find(e => e.queueType === "RANKED_FLEX_SR");

  const handleClick = () => {
    navigate(`/player/${region}/${encodeURIComponent(player.gameName)}/${encodeURIComponent(player.tagLine)}`);
  };

  return (
    <div
      style={styles.card}
      onClick={handleClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${COLORS.gold}60`; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = COLORS.cardBorder; }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") handleClick(); }}
    >
      <div style={styles.header}>
        <img
          src={`${base}/profileicon/${player.profileIconId}.png`}
          alt=""
          style={styles.icon}
          onError={hideOnError}
        />
        <div>
          <div style={styles.name}>{player.gameName}</div>
          <div style={styles.tag}>#{player.tagLine}</div>
        </div>
      </div>

      <div style={styles.ranks}>
        {soloEntry ? <RankLine label="Solo/Duo" entry={soloEntry} /> : <RankLine label="Solo/Duo" />}
        {flexEntry ? <RankLine label="Flex" entry={flexEntry} /> : <RankLine label="Flex" />}
      </div>

      <div style={styles.extras}>
        {player.puuid && <RecentForm puuid={player.puuid} region={region} />}
        <Mains champions={player.topChampions ?? []} version={version} />
      </div>
    </div>
  );
}

/**
 * W/L of the player's last few ranked solo games. Loaded per card after the card is on screen,
 * so the slower match lookups never hold up the search results.
 */
function RecentForm({ puuid, region }: { puuid: string; region: string }) {
  const [games, setGames] = useState<MatchSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMatchSummaries(puuid, region, RECENT_GAME_COUNT, 0, RANKED_SOLO_QUEUE)
      .then((data) => { if (active) setGames(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [puuid, region]);

  let content: React.ReactNode;
  if (failed) {
    content = <span style={styles.muted}>Unavailable right now</span>;
  } else if (games === null) {
    content = (
      <span style={styles.formBoxes} aria-label="Loading recent games">
        {Array.from({ length: RECENT_GAME_COUNT }, (_, i) => <span key={i} style={{ ...styles.formBox, ...styles.formBoxLoading }} />)}
      </span>
    );
  } else if (games.length === 0) {
    content = <span style={styles.muted}>No recent ranked games</span>;
  } else {
    const wins = games.filter((g) => g.win).length;
    const wr = Math.round((wins / games.length) * 100);
    content = (
      <>
        {/* Most recent first, like the match history */}
        <span style={styles.formBoxes} title="Most recent first">
          {games.map((g) => (
            <span
              key={g.matchId}
              style={{ ...styles.formBox, background: g.win ? "#0B7A71" : "#7a2734" }}
              title={`${g.win ? "Win" : "Loss"} · ${g.championName} ${g.kills}/${g.deaths}/${g.assists}`}
            >
              {g.win ? "W" : "L"}
            </span>
          ))}
        </span>
        <span style={{ ...styles.winRate, color: winRateColor(wr) }}>{wr}%</span>
      </>
    );
  }

  return (
    <div style={styles.extraLine}>
      <span style={styles.queueLabel}>Last {RECENT_GAME_COUNT}</span>
      {content}
    </div>
  );
}

/** The player's most-played champions by mastery, so you can see what they're likely to pick. */
function Mains({ champions, version }: { champions: ChampionMastery[]; version: string }) {
  const [names, setNames] = useState<Record<number, string>>({});

  useEffect(() => {
    let active = true;
    loadChampionMap(version).then((map) => {
      if (!active) return;
      const byId: Record<number, string> = {};
      for (const [id, champ] of Object.entries(map)) byId[Number(id)] = champ.name;
      setNames(byId);
    });
    return () => { active = false; };
  }, [version]);

  if (champions.length === 0) return null;

  return (
    <div style={styles.extraLine}>
      <span style={styles.queueLabel}>Mains</span>
      <span style={styles.mains}>
        {champions.map((c) => {
          const name = names[c.championId] ?? "Champion";
          return (
            <span key={c.championId} style={styles.main} title={`${name} · ${c.championPoints.toLocaleString()} mastery points`}>
              <img src={championIconFallbackUrl(c.championId)} alt={name} style={styles.mainIcon} onError={hideOnError} />
              <span style={styles.mainPoints}>{formatPoints(c.championPoints)}</span>
            </span>
          );
        })}
      </span>
    </div>
  );
}

/** 1234567 -> "1.2M", 250000 -> "250k" */
function formatPoints(points: number): string {
  if (points >= 1_000_000) return `${(points / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (points >= 1_000) return `${Math.round(points / 1_000)}k`;
  return String(points);
}

function RankLine({ label, entry }: { label: string; entry?: { tier: string; rank: string; leaguePoints: number; wins: number; losses: number } }) {
  if (!entry) {
    return (
      <div style={styles.rankLine}>
        <span style={styles.queueLabel}>{label}</span>
        <span style={{ ...styles.tierText, opacity: 0.4 }}>Unranked</span>
      </div>
    );
  }

  const total = entry.wins + entry.losses;
  const wr = total > 0 ? Math.round((entry.wins / total) * 100) : 0;
  const tierColor = TIER_COLORS[entry.tier] || COLORS.textPrimary;

  return (
    <div style={styles.rankLine}>
      <img src={tierIconUrl(entry.tier)} alt={entry.tier} style={styles.tierIcon} onError={hideOnError} />
      <span style={styles.queueLabel}>{label}</span>
      <span style={{ ...styles.tierText, color: tierColor }}>
        {formatTier(entry.tier)}{APEX_TIERS.has(entry.tier) ? "" : ` ${entry.rank}`}
      </span>
      <span style={styles.lp}>{entry.leaguePoints} LP</span>
      <span style={{ ...styles.winRate, color: winRateColor(wr) }}>{wr}%</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 4,
    padding: "16px 20px",
    cursor: "pointer",
    transition: "border-color 0.15s ease",
  },
  errorContent: {
    opacity: 0.6,
  },
  errorText: {
    color: "#E84057",
    fontSize: 13,
    marginTop: 6,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.textPrimary,
  },
  tag: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  ranks: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  rankLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
  },
  tierIcon: {
    width: 24,
    height: 24,
  },
  queueLabel: {
    color: COLORS.textTertiary,
    width: 60,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tierText: {
    fontWeight: 600,
    color: COLORS.textPrimary,
    minWidth: 90,
  },
  lp: {
    color: COLORS.gold,
    fontWeight: 600,
    fontSize: 12,
    minWidth: 50,
  },
  winRate: {
    fontWeight: 600,
    fontSize: 12,
  },
  extras: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.divider}`,
  },
  extraLine: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    minHeight: 28,
  },
  formBoxes: {
    display: "flex",
    gap: 4,
  },
  formBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
  },
  formBoxLoading: {
    background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.10), rgba(255,255,255,0.04))",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
  },
  muted: {
    color: COLORS.textDim,
    fontSize: 12,
  },
  mains: {
    display: "flex",
    gap: 10,
  },
  main: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  mainIcon: {
    width: 28,
    height: 28,
    borderRadius: 3,
  },
  mainPoints: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },
};
