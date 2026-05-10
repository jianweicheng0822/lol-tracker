/**
 * @file ScoreboardTable.tsx
 * @description Shared scoreboard table components for match detail views. Supports both
 *   standard 5v5 modes (ScoreboardTeamTable) and Arena mode (ArenaScoreboard) with
 *   placement-based duo-team grouping. Player names are clickable for navigation.
 * @module frontend.components
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MatchDetailParticipant, MatchTeam } from "../types";
import {
  championIconUrl,
  itemIconUrl,
  spellIconUrl,
  keystoneIconUrl,
  runeStyleIconUrl,
  hideOnError,
} from "../utils/ddragon";

/**
 * Abbreviate large numbers for compact display (e.g., 12345 becomes "12.3k").
 *
 * @param n - The number to format.
 * @returns The abbreviated string representation.
 */
function formatNumber(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/**
 * Render the highest multi-kill badge earned during the match (Penta > Quadra > Triple > Double).
 *
 * @param props - The participant data containing multi-kill counts.
 * @returns The badge element, or null if no multi-kill occurred.
 */
function MultiKillBadges({ p }: { p: MatchDetailParticipant }) {
  const badges: { label: string; color: string }[] = [];
  if (p.pentaKills > 0) badges.push({ label: "PENTA", color: "#f59e0b" });
  else if (p.quadraKills > 0) badges.push({ label: "QUADRA", color: "#a78bfa" });
  else if (p.tripleKills > 0) badges.push({ label: "TRIPLE", color: "#60a5fa" });
  else if (p.doubleKills > 0) badges.push({ label: "DOUBLE", color: "#94a3b8" });
  if (badges.length === 0) return null;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: badges[0].color + "22", color: badges[0].color, marginLeft: 4 }}>
      {badges[0].label}
    </span>
  );
}

const PLACEMENT_COLORS: Record<number, string> = {
  1: "#c9952c",
  2: "#2563eb",
  3: "#2563eb",
  4: "#2563eb",
  5: "#a83232",
  6: "#a83232",
  7: "#a83232",
  8: "#a83232",
};

/**
 * Convert a placement number to an ordinal string (e.g., 1 becomes "1st").
 *
 * @param n - The placement number (1-8).
 * @returns The ordinal string representation.
 */
function placementLabel(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * Render the Arena scoreboard grouping all 16 participants into duo-teams by playerSubteamId,
 * sorted by placement (1st-8th). Each team gets a color-coded header and the current
 * player's team is highlighted.
 *
 * @param props - Participants array, DDragon image base URL, optional highlight PUUID, and region.
 * @returns The Arena scoreboard element.
 */
export function ArenaScoreboard({
  participants,
  imgBase,
  highlightPuuid,
  region,
}: {
  participants: MatchDetailParticipant[];
  imgBase: string;
  highlightPuuid?: string;
  region?: string;
}) {
  const teamMap = new Map<number, MatchDetailParticipant[]>();
  for (const p of participants) {
    const key = p.playerSubteamId || 0;
    if (!teamMap.has(key)) teamMap.set(key, []);
    teamMap.get(key)!.push(p);
  }

  const sortedTeams = [...teamMap.entries()].sort((a, b) => {
    const pa = a[1][0]?.placement || 99;
    const pb = b[1][0]?.placement || 99;
    return pa - pb;
  });

  const allParticipants = participants;
  const maxDamage = Math.max(...allParticipants.map((p) => p.totalDamageDealtToChampions), 1);

  const gridCols = "200px 120px 80px 100px 70px 180px";

  return (
    <div>
      {sortedTeams.map(([subteamId, players]) => {
        const placement = players[0]?.placement || 0;
        const plColor = PLACEMENT_COLORS[placement] || "#64748b";
        const hasHighlight = players.some((p) => p.puuid === highlightPuuid);
        const isFirst = placement === 1;

        const headerBg = isFirst
          ? "rgba(201,149,44,0.12)"
          : hasHighlight
            ? `${plColor}18`
            : "rgba(255,255,255,0.03)";

        return (
          <div key={subteamId} style={{ marginBottom: 16 }}>
            {/* Placement header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 6,
                padding: "6px 12px",
                borderLeft: `4px solid ${plColor}`,
                background: headerBg,
                borderRadius: "0 6px 6px 0",
              }}
            >
              <span style={{ fontWeight: 800, color: plColor, fontSize: 14 }}>
                {placementLabel(placement)}
              </span>
            </div>

            {/* Column headers */}
            <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "4px 8px", fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              <span>Champion</span>
              <span style={{ textAlign: "center" }}>KDA</span>
              <span style={{ textAlign: "center" }}>Damage</span>
              <span></span>
              <span style={{ textAlign: "center" }}>Gold</span>
              <span style={{ textAlign: "center" }}>Items</span>
            </div>

            {/* Player rows */}
            {players.map((p) => (
              <ArenaPlayerRow
                key={p.puuid}
                p={p}
                imgBase={imgBase}
                isMe={p.puuid === highlightPuuid}
                maxDamage={maxDamage}
                gridCols={gridCols}
                plColor={plColor}
                region={region}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Render a single player row inside an Arena team group showing champion, KDA,
 * damage, gold, and items.
 *
 * @param props - Participant data, styling context, and navigation metadata.
 * @returns The Arena player row element.
 */
function ArenaPlayerRow({
  p,
  imgBase,
  isMe,
  maxDamage,
  gridCols,
  plColor,
  region,
}: {
  p: MatchDetailParticipant;
  imgBase: string;
  isMe: boolean;
  maxDamage: number;
  gridCols: string;
  plColor: string;
  region?: string;
}) {
  const navigate = useNavigate();
  const kda = p.deaths === 0 ? "Perfect" : ((p.kills + p.assists) / p.deaths).toFixed(1);
  const dmgPct = (p.totalDamageDealtToChampions / maxDamage) * 100;
  const canNavigate = region && p.summonerName && p.riotIdTagline;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: 4,
        padding: "6px 8px",
        alignItems: "center",
        background: isMe ? "rgba(99,102,241,0.1)" : undefined,
        borderRadius: 4,
        borderLeft: isMe ? "2px solid #6366f1" : "2px solid transparent",
      }}
    >
      {/* Champion icon with level badge + summoner spells + clickable name */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <img src={championIconUrl(p.championName, imgBase)} width={32} height={32} style={{ borderRadius: "50%" }} onError={hideOnError} />
          <div style={{ position: "absolute", bottom: -2, right: -2, background: "#0f172a", fontSize: 9, padding: "0 3px", borderRadius: 4, fontWeight: 700 }}>{p.championLevel}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ display: "flex", gap: 3 }}>
            <img src={spellIconUrl(p.summoner1Id, imgBase)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />
            <img src={spellIconUrl(p.summoner2Id, imgBase)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />
          </div>
          <PlayerName
            name={p.summonerName}
            isMe={isMe}
            canNavigate={!!canNavigate}
            onClick={() => {
              if (canNavigate) {
                navigate(`/player/${region}/${encodeURIComponent(p.summonerName)}/${encodeURIComponent(p.riotIdTagline!)}`);
              }
            }}
          />
        </div>
      </div>

      {/* KDA */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          {p.kills}<span style={{ color: "#64748b" }}>/</span><span style={{ color: "#ef4444" }}>{p.deaths}</span><span style={{ color: "#64748b" }}>/</span>{p.assists}
        </div>
        <div style={{ fontSize: 10, color: kda === "Perfect" ? "#f59e0b" : "#4ade80" }}>
          {kda} <MultiKillBadges p={p} />
        </div>
      </div>

      {/* Damage dealt and taken */}
      <div style={{ textAlign: "center", fontSize: 11 }}>
        <div>{formatNumber(p.totalDamageDealtToChampions)}</div>
        <div style={{ color: "#64748b", fontSize: 10 }}>{formatNumber(p.totalDamageTaken)}</div>
      </div>

      {/* Damage bar relative to highest damage dealer */}
      <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${dmgPct}%`, background: plColor, borderRadius: 4, opacity: 0.7 }} />
      </div>

      {/* Gold */}
      <div style={{ textAlign: "center", fontSize: 12, color: "#eab308" }}>
        {formatNumber(p.goldEarned)}
      </div>

      {/* Items */}
      <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
        {p.items.map((itemId, i) => (
          <div key={i} style={{ width: 22, height: 22, borderRadius: 3, overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
            {itemId > 0 && <img src={itemIconUrl(itemId, imgBase)} width={22} height={22} onError={hideOnError} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Render the standard team scoreboard table for non-Arena modes (Summoner's Rift, ARAM, etc.).
 * Display a Victory/Defeat header, column headers, and one row per player with KDA,
 * damage bar, gold, CS, items, and wards (hidden for ARAM).
 *
 * @param props - Team data, participants, DDragon base URL, highlight PUUID, queue ID, and region.
 * @returns The team scoreboard table element.
 */
export function ScoreboardTeamTable({
  team,
  participants,
  imgBase,
  highlightPuuid,
  queueId,
  region,
}: {
  team: MatchTeam;
  participants: MatchDetailParticipant[];
  imgBase: string;
  highlightPuuid?: string;
  queueId: number;
  region?: string;
}) {
  const navigate = useNavigate();
  const isAram = queueId === 450;
  const showWards = !isAram;

  const teamColor = team.win ? "#2563eb" : "#dc2626";
  const teamLabel = team.win ? "Victory" : "Defeat";

  const maxDamage = Math.max(...participants.map((p) => p.totalDamageDealtToChampions), 1);

  const gridCols = showWards
    ? "200px 90px 80px 100px 70px 70px 180px 70px"
    : "200px 90px 80px 100px 70px 70px 180px";

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Team header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, padding: "8px 12px", borderLeft: `4px solid ${teamColor}`, background: team.win ? "rgba(37,99,235,0.08)" : "rgba(220,38,38,0.08)", borderRadius: "0 6px 6px 0" }}>
        <span style={{ fontWeight: 700, color: teamColor, fontSize: 14 }}>{teamLabel}</span>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: gridCols, gap: 4, padding: "4px 8px", fontSize: 10, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
        <span>Champion</span>
        <span style={{ textAlign: "center" }}>KDA</span>
        <span style={{ textAlign: "center" }}>Damage</span>
        <span></span>
        <span style={{ textAlign: "center" }}>Gold</span>
        <span style={{ textAlign: "center" }}>CS</span>
        <span style={{ textAlign: "center" }}>Items</span>
        {showWards && <span style={{ textAlign: "center" }}>Wards</span>}
      </div>

      {/* Player rows */}
      {participants.map((p) => {
        const isMe = p.puuid === highlightPuuid;
        const kda = p.deaths === 0 ? "Perfect" : ((p.kills + p.assists) / p.deaths).toFixed(1);
        const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
        const dmgPct = (p.totalDamageDealtToChampions / maxDamage) * 100;
        const canNavigate = region && p.summonerName && p.riotIdTagline;

        return (
          <div
            key={p.puuid}
            style={{
              display: "grid",
              gridTemplateColumns: gridCols,
              gap: 4,
              padding: "6px 8px",
              alignItems: "center",
              background: isMe ? "rgba(99,102,241,0.1)" : undefined,
              borderRadius: 4,
              borderLeft: isMe ? "2px solid #6366f1" : "2px solid transparent",
            }}
          >
            {/* Champion icon with level badge + spells/runes + clickable name */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <img src={championIconUrl(p.championName, imgBase)} width={32} height={32} style={{ borderRadius: "50%" }} onError={hideOnError} />
                <div style={{ position: "absolute", bottom: -2, right: -2, background: "#0f172a", fontSize: 9, padding: "0 3px", borderRadius: 4, fontWeight: 700 }}>{p.championLevel}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ display: "flex", gap: 3 }}>
                  <img src={spellIconUrl(p.summoner1Id, imgBase)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />
                  <img src={spellIconUrl(p.summoner2Id, imgBase)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />
                  {p.primaryRuneId > 0 && <img src={keystoneIconUrl(p.primaryRuneId)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />}
                  {p.secondaryRuneStyleId > 0 && <img src={runeStyleIconUrl(p.secondaryRuneStyleId)} width={14} height={14} style={{ borderRadius: 2 }} onError={hideOnError} />}
                </div>
                <PlayerName
                  name={p.summonerName}
                  isMe={isMe}
                  canNavigate={!!canNavigate}
                  onClick={() => {
                    if (canNavigate) {
                      navigate(`/player/${region}/${encodeURIComponent(p.summonerName)}/${encodeURIComponent(p.riotIdTagline!)}`);
                    }
                  }}
                />
              </div>
            </div>

            {/* KDA */}
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {p.kills}<span style={{ color: "#64748b" }}>/</span><span style={{ color: "#ef4444" }}>{p.deaths}</span><span style={{ color: "#64748b" }}>/</span>{p.assists}
              </div>
              <div style={{ fontSize: 10, color: kda === "Perfect" ? "#f59e0b" : "#4ade80" }}>
                {kda} <MultiKillBadges p={p} />
              </div>
            </div>

            {/* Damage number */}
            <div style={{ textAlign: "center", fontSize: 12 }}>
              {formatNumber(p.totalDamageDealtToChampions)}
            </div>

            {/* Damage bar */}
            <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${dmgPct}%`, background: team.win ? "#3b82f6" : "#ef4444", borderRadius: 4 }} />
            </div>

            {/* Gold */}
            <div style={{ textAlign: "center", fontSize: 12, color: "#eab308" }}>
              {formatNumber(p.goldEarned)}
            </div>

            {/* CS */}
            <div style={{ textAlign: "center", fontSize: 12 }}>
              {cs}
            </div>

            {/* Items */}
            <div style={{ display: "flex", gap: 2, justifyContent: "center" }}>
              {p.items.map((itemId, i) => (
                <div key={i} style={{ width: 22, height: 22, borderRadius: 3, overflow: "hidden", background: "rgba(0,0,0,0.4)" }}>
                  {itemId > 0 && <img src={itemIconUrl(itemId, imgBase)} width={22} height={22} onError={hideOnError} />}
                </div>
              ))}
            </div>

            {/* Wards: placed / killed / control wards bought */}
            {showWards && (
              <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8" }}>
                {p.wardsPlaced}/{p.wardsKilled}/{p.visionWardsBoughtInGame}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Render a clickable player name that navigates to the player's profile page.
 * Only interactive when the Riot ID tagline is available for URL construction.
 *
 * @param props - Player name, highlight state, navigation capability flag, and click handler.
 * @returns The player name span element.
 */
function PlayerName({
  name,
  isMe,
  canNavigate,
  onClick,
}: {
  name: string;
  isMe: boolean;
  canNavigate: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onClick={(e) => {
        if (canNavigate) {
          e.stopPropagation();
          onClick();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontSize: 12,
        fontWeight: isMe ? 700 : 400,
        maxWidth: 130,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
        cursor: canNavigate ? "pointer" : undefined,
        textDecoration: canNavigate && hovered ? "underline" : undefined,
        color: canNavigate && hovered ? "#93c5fd" : undefined,
        transition: "color 0.15s",
      }}
    >
      {name}
    </span>
  );
}
