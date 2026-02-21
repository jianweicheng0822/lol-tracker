/** Match history list — renders match cards with champion, KDA, items, runes, and team rosters. */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { MatchSummary, MatchParticipant, MatchDetail } from "../types";
import { fetchMatchDetail } from "../api";
import {
  useDdragonVersion,
  ddragonBase,
  championIconUrl,
  itemIconUrl,
  spellIconUrl,
  keystoneIconUrl,
  runeStyleIconUrl,
  QUEUE_NAMES,
  hideOnError,
  formatDuration,
  timeAgo,
} from "../utils/ddragon";
import { ScoreboardTeamTable, ArenaScoreboard } from "./ScoreboardTable";

// Re-export for backwards compat with PlayerPage import
export { useDdragonVersion } from "../utils/ddragon";

type MatchListProps = {
  matches: MatchSummary[];
  region?: string;
  puuid?: string;
  gameName?: string;
};

// --- Augment icons (Community Dragon) ---
type AugmentEntry = { id: number; augmentSmallIconPath: string };
let augmentCache: Record<number, string> | null = null;
let augmentFetchPromise: Promise<Record<number, string>> | null = null;

function fetchAugmentIcons(): Promise<Record<number, string>> {
  if (augmentCache) return Promise.resolve(augmentCache);
  if (augmentFetchPromise) return augmentFetchPromise;

  augmentFetchPromise = fetch(
    "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/cherry-augments.json"
  )
    .then((r) => r.json())
    .then((data: AugmentEntry[]) => {
      const map: Record<number, string> = {};
      for (const entry of data) {
        if (entry.augmentSmallIconPath) {
          const cdnPath = entry.augmentSmallIconPath
            .toLowerCase()
            .replace("/lol-game-data/assets/", "");
          map[entry.id] =
            `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${cdnPath}`;
        }
      }
      augmentCache = map;
      return map;
    })
    .catch(() => {
      augmentFetchPromise = null;
      return {} as Record<number, string>;
    });

  return augmentFetchPromise;
}

function useAugmentIcons(needed: boolean) {
  const [icons, setIcons] = useState<Record<number, string>>(
    augmentCache ?? {}
  );
  useEffect(() => {
    if (!needed) return;
    fetchAugmentIcons().then(setIcons);
  }, [needed]);
  return icons;
}

// --- Performance indicator ---
function getPerformanceTag(
  kills: number,
  deaths: number,
  assists: number,
  killParticipation: number,
  win: boolean,
): { label: string; color: string } | null {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;

  if (kda >= 5 && killParticipation >= 60)
    return { label: "MVP", color: "#b08a2e" };
  if (kda >= 3.5 || (kda >= 2.5 && killParticipation >= 55))
    return { label: "Strong", color: "#2a8a66" };
  if (kda < 1 || (deaths >= 8 && kda < 1.5))
    return { label: "Struggled", color: "#6b7585" };
  if (win && kda >= 1.5 && killParticipation >= 35)
    return { label: "Balanced", color: "#5a6575" };

  return null;
}

// --- Player row with hover ---
function PlayerRow({
  player,
  imgBase,
  isMe,
  region,
}: {
  player: MatchParticipant;
  imgBase: string;
  isMe: boolean;
  region?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const navigate = useNavigate();
  const canNavigate = !!(region && player.summonerName && player.riotIdTagline);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        if (canNavigate) {
          e.stopPropagation();
          navigate(`/player/${region}/${encodeURIComponent(player.summonerName)}/${encodeURIComponent(player.riotIdTagline!)}`);
        }
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: isMe ? "#b8c4d8" : hovered ? "#8a99ad" : "#566475",
        fontWeight: isMe ? 600 : 400,
        background: isMe
          ? "rgba(99,102,241,0.07)"
          : hovered
            ? "rgba(255,255,255,0.03)"
            : undefined,
        borderLeft: isMe ? "2px solid rgba(99,102,241,0.45)" : "2px solid transparent",
        borderRadius: 2,
        padding: "2px 5px",
        marginLeft: -5,
        transition: "background 0.15s, color 0.15s",
        cursor: canNavigate ? "pointer" : undefined,
        textDecoration: canNavigate && hovered ? "underline" : undefined,
      }}
    >
      <img
        src={championIconUrl(player.championName, imgBase)}
        width={12}
        height={12}
        style={{ borderRadius: 2, flexShrink: 0 }}
        onError={hideOnError}
      />
      <span
        style={{
          maxWidth: isMe ? 66 : 86,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {player.summonerName}
      </span>
      {isMe && (
        <span style={{ color: "#6b72a8", fontSize: 9, flexShrink: 0, opacity: 0.8 }}>
          (You)
        </span>
      )}
    </div>
  );
}

// --- Team column ---
function TeamColumn({
  players,
  imgBase,
  highlightPuuid,
  region,
}: {
  players: MatchParticipant[];
  imgBase: string;
  highlightPuuid?: string;
  region?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {players.map((p, i) => (
        <PlayerRow
          key={i}
          player={p}
          imgBase={imgBase}
          isMe={p.puuid === highlightPuuid}
          region={region}
        />
      ))}
    </div>
  );
}

// --- Item icon with hover ---
function ItemIcon({ itemId, imgBase }: { itemId: number; imgBase: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 3,
        overflow: "hidden",
        background: "rgba(0,0,0,0.25)",
        transition: "transform 0.15s, box-shadow 0.15s",
        transform: hovered && itemId > 0 ? "scale(1.15)" : undefined,
        boxShadow: hovered && itemId > 0 ? "0 2px 6px rgba(0,0,0,0.3)" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {itemId > 0 && (
        <img
          src={itemIconUrl(itemId, imgBase)}
          style={{ width: "100%", height: "100%", display: "block" }}
          onError={hideOnError}
        />
      )}
    </div>
  );
}

// --- Match card wrapper with hover elevation ---
function MatchCard({
  children,
  winBg,
  winColor,
}: {
  children: React.ReactNode;
  winBg: string;
  winColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        borderRadius: 6,
        background: winBg,
        padding: "8px 12px",
        borderLeft: `4px solid ${hovered ? winColor : winColor}`,
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        boxShadow: hovered
          ? `0 6px 20px rgba(0,0,0,0.3)`
          : "0 1px 3px rgba(0,0,0,0.08)",
        transform: hovered ? "translateY(-1px)" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
    </div>
  );
}

// --- Chevron toggle button ---
function ChevronButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 4,
        color: hovered ? "#cbd5e1" : "#64748b",
        cursor: "pointer",
        padding: "4px 8px",
        fontSize: 12,
        lineHeight: 1,
        transition: "all 0.15s",
        flexShrink: 0,
        marginLeft: 8,
      }}
      title={expanded ? "Collapse scoreboard" : "Expand scoreboard"}
    >
      {expanded ? "\u25B2" : "\u25BC"}
    </button>
  );
}

// --- Inline scoreboard (expanded) ---
function InlineScoreboard({
  matchId,
  region,
  puuid,
  imgBase,
}: {
  matchId: string;
  region: string;
  puuid?: string;
  imgBase: string;
}) {
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetchMatchDetail(matchId, region)
      .then((data) => {
        if (!cancelled) {
          setMatch(data);
          setStatus("done");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [matchId, region]);

  if (status === "loading") {
    return (
      <div style={{ padding: "16px 12px", textAlign: "center", color: "#64748b", fontSize: 13 }}>
        Loading scoreboard...
      </div>
    );
  }

  if (status === "error" || !match) {
    return (
      <div style={{ padding: "12px", color: "#ef4444", fontSize: 12 }}>
        Failed to load scoreboard.
      </div>
    );
  }

  const isArena = match.queueId === 1700;

  if (isArena) {
    return (
      <div style={{ padding: "12px 0 4px" }}>
        <ArenaScoreboard
          participants={match.participants}
          imgBase={imgBase}
          highlightPuuid={puuid}
          region={region}
        />
      </div>
    );
  }

  // Sort teams so the current player's team appears first
  const myTeamId = match.participants.find((p) => p.puuid === puuid)?.teamId;
  const sortedTeams = [...match.teams].sort((a, b) => {
    if (a.teamId === myTeamId) return -1;
    if (b.teamId === myTeamId) return 1;
    return 0;
  });

  return (
    <div style={{ padding: "12px 0 4px" }}>
      {sortedTeams.map((team) => {
        const teamPlayers = match.participants.filter((p) => p.teamId === team.teamId);
        return (
          <ScoreboardTeamTable
            key={team.teamId}
            team={team}
            participants={teamPlayers}
            imgBase={imgBase}
            highlightPuuid={puuid}
            queueId={match.queueId}
            region={region}
          />
        );
      })}
    </div>
  );
}

export default function MatchList({ matches, region, puuid, gameName }: MatchListProps) {
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);
  const hasArena = matches.some((m) => m.queueId === 1700);
  const augmentIcons = useAugmentIcons(hasArena);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!matches.length) return null;

  return (
    <div>
      <h3 style={{ marginBottom: 12 }}>Recent Matches</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {matches.map((m) => {
          const kda =
            m.deaths === 0
              ? "Perfect"
              : ((m.kills + m.assists) / m.deaths).toFixed(2);

          const cs =
            m.totalMinionsKilled + m.neutralMinionsKilled;

          const killParticipation =
            m.teamTotalKills > 0
              ? Math.round(
                  ((m.kills + m.assists) /
                    m.teamTotalKills) *
                    100
                )
              : 0;

          const perfTag = getPerformanceTag(
            m.kills, m.deaths, m.assists, killParticipation, m.win,
          );

          // Arena: placement 1-4 = victory, 5-8 = defeat
          const isArena = m.queueId === 1700;
          const isWin = isArena ? (m.placement >= 1 && m.placement <= 4) : m.win;

          // Stronger accent colors
          const winColor = isWin ? "#2d6ab5" : "#a83232";
          const winTextColor = isWin ? "#4d8ad0" : "#cc5555";
          const winText = isWin ? "Victory" : "Defeat";
          // More visible backgrounds
          const winBg = isWin
            ? "linear-gradient(135deg, rgba(30,60,110,0.18) 0%, rgba(20,40,80,0.08) 100%)"
            : "linear-gradient(135deg, rgba(110,30,30,0.18) 0%, rgba(80,20,20,0.08) 100%)";

          const queueName =
            QUEUE_NAMES[m.queueId] || "Normal";

          const isExpanded = expandedId === m.matchId;

          return (
            <div key={m.matchId}>
              <MatchCard winBg={winBg} winColor={winColor}>
                {/* LEFT — champion + spells/runes */}
                <div
                  style={{
                    width: 128,
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ position: "relative" }}>
                    <img
                      src={championIconUrl(m.championName, imgBase)}
                      width={44}
                      height={44}
                      style={{ borderRadius: "50%", border: `2px solid ${winColor}55`, display: "block" }}
                      onError={hideOnError}
                    />
                    <div
                      style={{
                        position: "absolute",
                        bottom: -2,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#0f172a",
                        fontSize: 9,
                        padding: "0 4px",
                        borderRadius: 4,
                        fontWeight: 600,
                        color: "#6b7a8e",
                        lineHeight: "14px",
                      }}
                    >
                      {m.championLevel}
                    </div>
                  </div>

                  {m.queueId === 1700 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 20px)", gap: 2 }}>
                      {m.augments
                        .filter((a) => a > 0)
                        .map((augId, i) => (
                          <div
                            key={i}
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 3,
                              overflow: "hidden",
                              background: "rgba(0,0,0,0.3)",
                            }}
                          >
                            <img
                              src={augmentIcons[augId] || ""}
                              width={20}
                              height={20}
                              onError={hideOnError}
                            />
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 2 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <img
                          src={spellIconUrl(m.summoner1Id, imgBase)}
                          width={20}
                          height={20}
                          style={{ borderRadius: 3 }}
                          onError={hideOnError}
                        />
                        <img
                          src={spellIconUrl(m.summoner2Id, imgBase)}
                          width={20}
                          height={20}
                          style={{ borderRadius: 3 }}
                          onError={hideOnError}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {m.primaryRuneId > 0 && (
                          <img
                            src={keystoneIconUrl(m.primaryRuneId)}
                            width={20}
                            height={20}
                            style={{ borderRadius: 3 }}
                            onError={hideOnError}
                          />
                        )}
                        {m.secondaryRuneStyleId > 0 && (
                          <img
                            src={runeStyleIconUrl(m.secondaryRuneStyleId)}
                            width={20}
                            height={20}
                            style={{ borderRadius: 3 }}
                            onError={hideOnError}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* CENTER — KDA (primary), meta (secondary), items */}
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    minWidth: 0,
                  }}
                >
                  {/* Line 1: K / D / A — largest, most dominant */}
                  <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                    <span style={{ color: "#6ba3d6" }}>{m.kills}</span>
                    <span style={{ color: "#2e3844", fontWeight: 400 }}> / </span>
                    <span style={{ color: "#d06060" }}>{m.deaths}</span>
                    <span style={{ color: "#2e3844", fontWeight: 400 }}> / </span>
                    <span style={{ color: "#4aab9e" }}>{m.assists}</span>
                  </div>

                  {/* Line 2: KDA ratio + performance badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: kda === "Perfect" ? "#a88520" : "#3a8a64",
                      }}
                    >
                      {kda} KDA
                    </span>
                    {perfTag && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 500,
                          padding: "1px 5px",
                          borderRadius: 3,
                          background: perfTag.color + "0d",
                          color: perfTag.color,
                          letterSpacing: 0.3,
                          textTransform: "uppercase",
                          opacity: 0.65,
                        }}
                      >
                        {perfTag.label}
                      </span>
                    )}
                  </div>

                  {/* Line 3: Win/Loss label — more visible */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: winTextColor,
                      opacity: 0.75,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {winText}
                  </span>

                  {/* Secondary: metadata row — clearly lower hierarchy */}
                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      fontSize: 10,
                      color: "#3f4e5f",
                      alignItems: "center",
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ fontWeight: 500, color: "#4e5e70" }}>{queueName}</span>
                    <span>&middot;</span>
                    <span>{formatDuration(m.gameDurationSec)}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(m.gameEndTimestamp)}</span>
                    <span>&middot;</span>
                    <span>P/Kill {killParticipation}%</span>
                    <span>&middot;</span>
                    <span>CS {cs}</span>
                  </div>

                  {/* Items */}
                  <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                    {m.items.map((itemId, i) => (
                      <ItemIcon key={i} itemId={itemId} imgBase={imgBase} />
                    ))}
                  </div>
                </div>

                {/* RIGHT — team rosters + chevron */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 252,
                      display: "flex",
                      gap: 0,
                      borderLeft: "1px solid rgba(255,255,255,0.04)",
                      paddingLeft: 12,
                    }}
                  >
                    <TeamColumn
                      players={
                        puuid
                          ? [{ summonerName: gameName || m.championName, championName: m.championName, puuid }, ...m.allies]
                          : m.allies
                      }
                      imgBase={imgBase}
                      highlightPuuid={puuid}
                      region={region}
                    />
                    <div style={{ width: 1, background: "rgba(255,255,255,0.05)", margin: "4px 8px" }} />
                    <TeamColumn players={m.enemies} imgBase={imgBase} highlightPuuid={puuid} region={region} />
                  </div>

                  {region && puuid && (
                    <ChevronButton
                      expanded={isExpanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : m.matchId);
                      }}
                    />
                  )}
                </div>
              </MatchCard>

              {/* Inline scoreboard */}
              {isExpanded && region && (
                <div
                  style={{
                    background: "rgba(15,23,42,0.95)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    padding: "8px 12px",
                    marginTop: -2,
                  }}
                >
                  <InlineScoreboard
                    matchId={m.matchId}
                    region={region}
                    puuid={puuid}
                    imgBase={imgBase}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
