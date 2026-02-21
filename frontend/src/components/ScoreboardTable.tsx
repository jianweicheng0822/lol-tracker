/** Shared scoreboard table used in both inline expansion and match detail page. */
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

function formatNumber(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

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
  const isArena = queueId === 1700;
  const isAram = queueId === 450;
  const showWards = !isArena && !isAram;

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
            {/* Champion + name */}
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

            {/* Wards */}
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
