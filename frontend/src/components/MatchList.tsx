/**
 * @file MatchList.tsx
 * @description Render the match history list with expandable match cards showing champion,
 *   KDA, items, runes, team rosters, and inline scoreboards. Supports Arena mode with
 *   placement-based win/loss and "Load More" pagination via parent callback.
 * @module frontend.components
 */
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
import { kdaColor as getKdaColor, COLORS } from "../utils/colors";
import AiChatModal from "./AiChatModal";


type MatchListProps = {
  matches: MatchSummary[];
  region?: string;
  puuid?: string;
  gameName?: string;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  tier?: number;
};

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

function getPerformanceTag(
  kills: number,
  deaths: number,
  assists: number,
  killParticipation: number,
  win: boolean,
): { label: string; color: string } | null {
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths;

  if (kda >= 5 && killParticipation >= 60)
    return { label: "MVP", color: "#F5A623" };
  if (kda >= 3.5 || (kda >= 2.5 && killParticipation >= 55))
    return { label: "Strong", color: "#48D1A0" };
  if (kda < 1 || (deaths >= 8 && kda < 1.5))
    return { label: "Struggled", color: COLORS.textDim };
  if (win && kda >= 1.5 && killParticipation >= 35)
    return { label: "Balanced", color: COLORS.textDim };

  return null;
}

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
        color: isMe ? COLORS.textPrimary : hovered ? COLORS.textSecondary : COLORS.textTertiary,
        fontWeight: isMe ? 600 : 400,
        background: isMe
          ? "rgba(212,160,23,0.07)"
          : hovered
            ? "rgba(255,255,255,0.03)"
            : undefined,
        borderLeft: isMe ? "2px solid rgba(212,160,23,0.45)" : "2px solid transparent",
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
        <span style={{ color: "#D4A017", fontSize: 9, flexShrink: 0, opacity: 0.8 }}>
          (You)
        </span>
      )}
    </div>
  );
}

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
        borderLeft: `4px solid ${winColor}`,
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

function AiButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "rgba(212,160,23,0.2)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 4,
        color: hovered ? "#D4A017" : COLORS.textDim,
        cursor: "pointer",
        padding: "4px 8px",
        fontSize: 12,
        lineHeight: 1,
        transition: "all 0.15s",
        flexShrink: 0,
        marginLeft: 4,
      }}
      title="Analyze with AI"
    >
      ✦
    </button>
  );
}

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
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 4,
        color: hovered ? COLORS.textSecondary : COLORS.textDim,
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
      <div style={{ padding: "16px 12px", textAlign: "center", color: COLORS.textDim, fontSize: 13 }}>
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

export default function MatchList({ matches, region, puuid, gameName, onLoadMore, isLoadingMore, hasMore, tier = 0 }: MatchListProps) {
  const ddVersion = useDdragonVersion();
  const imgBase = ddragonBase(ddVersion);
  const hasArena = matches.some((m) => m.queueId === 1700);
  const augmentIcons = useAugmentIcons(hasArena);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aiMatch, setAiMatch] = useState<MatchSummary | null>(null);

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

          const kdaNum = m.deaths === 0 ? m.kills + m.assists : (m.kills + m.assists) / m.deaths;

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

          const isArena = m.queueId === 1700;
          const isWin = isArena ? (m.placement >= 1 && m.placement <= 4) : m.win;

          const winColor = isWin ? "#D4A017" : "#E84057";
          const winTextColor = isWin ? "#D4A017" : "#E84057";
          const winText = isWin ? "Victory" : "Defeat";
          const winBg = isWin
            ? "linear-gradient(135deg, rgba(212,160,23,0.12) 0%, rgba(212,160,23,0.04) 100%)"
            : "linear-gradient(135deg, rgba(232,64,87,0.12) 0%, rgba(232,64,87,0.04) 100%)";

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
                        background: COLORS.pageBg,
                        fontSize: 9,
                        padding: "0 4px",
                        borderRadius: 4,
                        fontWeight: 600,
                        color: COLORS.textDim,
                        lineHeight: "14px",
                      }}
                    >
                      {m.championLevel}
                    </div>
                  </div>

                  {m.queueId === 1700 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 22px)", gap: 2 }}>
                      {m.augments
                        .filter((a) => a > 0)
                        .map((augId, i) => (
                       <div
                         key={i}
                         style={{
                           width: 22,
                           height: 22,
                           borderRadius: 4,
                           overflow: "hidden",
                           background: "rgba(35,35,40,0.6)",
                           border: "1px solid rgba(255,255,255,0.15)",
                           boxShadow: "0 0 6px rgba(255,255,255,0.15)",
                         }}
                       >
                          <img
                            src={augmentIcons[augId] || ""}
                            width={22}
                            height={22}
                            style={{ filter: "saturate(1.4)" }}
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
                          style={{ borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}
                          onError={hideOnError}
                        />
                        <img
                          src={spellIconUrl(m.summoner2Id, imgBase)}
                          width={20}
                          height={20}
                          style={{ borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}
                          onError={hideOnError}
                        />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {m.primaryRuneId > 0 && (
                          <img
                            src={keystoneIconUrl(m.primaryRuneId)}
                            width={20}
                            height={20}
                            style={{ borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}
                            onError={hideOnError}
                          />
                        )}
                        {m.secondaryRuneStyleId > 0 && (
                          <img
                            src={runeStyleIconUrl(m.secondaryRuneStyleId)}
                            width={20}
                            height={20}
                            style={{ borderRadius: 3, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}
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
                  <div style={{ fontSize: 21, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                    <span style={{ color: COLORS.textPrimary }}>{m.kills}</span>
                    <span style={{ color: COLORS.textDim, fontWeight: 400 }}> / </span>
                    <span style={{ color: "#E84057" }}>{m.deaths}</span>
                    <span style={{ color: COLORS.textDim, fontWeight: 400 }}> / </span>
                    <span style={{ color: COLORS.textPrimary }}>{m.assists}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: kda === "Perfect" ? "#F5A623" : getKdaColor(kdaNum),
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

                  <div
                    style={{
                      display: "flex",
                      gap: 7,
                      fontSize: 10,
                      color: COLORS.textDim,
                      alignItems: "center",
                      opacity: 0.85,
                    }}
                  >
                    <span style={{ fontWeight: 500, color: COLORS.textDim }}>{queueName}</span>
                    <span>&middot;</span>
                    <span>{formatDuration(m.gameDurationSec)}</span>
                    <span>&middot;</span>
                    <span>{timeAgo(m.gameEndTimestamp)}</span>
                    <span>&middot;</span>
                    <span>P/Kill {killParticipation}%</span>
                    <span>&middot;</span>
                    <span>CS {cs}</span>
                  </div>

                  <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                    {m.items.map((itemId, i) => (
                      <ItemIcon key={i} itemId={itemId} imgBase={imgBase} />
                    ))}
                  </div>
                </div>

                {/* RIGHT — action buttons */}
                {region && puuid && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    {tier === 1 && (
                      <AiButton
                        onClick={(e) => {
                          e.stopPropagation();
                          setAiMatch(m);
                        }}
                      />
                    )}
                    <ChevronButton
                      expanded={isExpanded}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : m.matchId);
                      }}
                    />
                  </div>
                )}
              </MatchCard>

              {/* Expanded section: team rosters + inline scoreboard */}
              {isExpanded && region && (
                <div
                  style={{
                    background: "rgba(20,20,24,0.95)",
                    border: `1px solid ${COLORS.divider}`,
                    borderTop: "none",
                    borderRadius: "0 0 6px 6px",
                    padding: "8px 12px",
                    marginTop: -2,
                  }}
                >
                  <div style={{ display: "flex", gap: 0, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${COLORS.divider}` }}>
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

      {/* Load More button */}
      {onLoadMore && hasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            style={{
              padding: "10px 32px",
              borderRadius: 6,
              background: isLoadingMore ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${COLORS.cardBorder}`,
              color: isLoadingMore ? COLORS.textDim : COLORS.textSecondary,
              cursor: isLoadingMore ? "not-allowed" : "pointer",
              fontSize: 13,
              fontWeight: 600,
              transition: "background 0.15s",
            }}
          >
            {isLoadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {aiMatch && (
        <AiChatModal match={aiMatch} onClose={() => setAiMatch(null)} />
      )}
    </div>
  );
}
