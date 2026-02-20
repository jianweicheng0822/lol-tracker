/** Match history list — renders match cards with champion, KDA, items, runes, and team rosters. */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import type { MatchSummary, MatchParticipant } from "../types";
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

function TeamColumn({
  players,
  imgBase,
  highlightPuuid,
}: {
  players: MatchParticipant[];
  imgBase: string;
  highlightPuuid?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {players.map((p, i) => {
        const isMe = p.puuid === highlightPuuid;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "#cbd5e1",
              fontWeight: isMe ? 700 : 400,
              background: isMe ? "rgba(99,102,241,0.12)" : undefined,
              borderLeft: isMe ? "2px solid #6366f1" : "2px solid transparent",
              borderRadius: 3,
              padding: "1px 4px",
              marginLeft: -4,
            }}
          >
            <img
              src={championIconUrl(p.championName, imgBase)}
              width={16}
              height={16}
              style={{ borderRadius: 3 }}
              onError={hideOnError}
            />
            <span
              style={{
                maxWidth: isMe ? 70 : 95,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.summonerName}
            </span>
            {isMe && <span style={{ color: "#818cf8", fontSize: 9, flexShrink: 0 }}>(You)</span>}
          </div>
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

  if (!matches.length) return null;

  return (
    <div>
      <h3 style={{ marginBottom: 14 }}>Recent Matches</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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

          const winColor = m.win ? "#2563eb" : "#dc2626";
          const winText = m.win ? "Victory" : "Defeat";
          const winBg = m.win
            ? "rgba(37,99,235,0.12)"
            : "rgba(220,38,38,0.12)";

          const queueName =
            QUEUE_NAMES[m.queueId] || "Normal";

          const linkTo = region && puuid
            ? `/match/${region}/${m.matchId}?puuid=${encodeURIComponent(puuid)}`
            : undefined;

          const card = (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 10,
                background: winBg,
                padding: "14px 16px",
                borderLeft: `4px solid ${winColor}`,
                cursor: linkTo ? "pointer" : undefined,
                transition: "filter 0.15s",
              }}
              onMouseEnter={linkTo ? (e) => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.15)"; } : undefined}
              onMouseLeave={linkTo ? (e) => { (e.currentTarget as HTMLElement).style.filter = ""; } : undefined}
            >
              {/* LEFT */}
              <div
                style={{
                  width: 140,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ position: "relative" }}>
                  <img
                    src={championIconUrl(m.championName, imgBase)}
                    width={56}
                    height={56}
                    style={{ borderRadius: "50%" }}
                    onError={hideOnError}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: -4,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "#0f172a",
                      fontSize: 11,
                      padding: "2px 6px",
                      borderRadius: 6,
                    }}
                  >
                    {m.championLevel}
                  </div>
                </div>

                {m.queueId === 1700 ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 26px)", gap: 3 }}>
                    {m.augments
                      .filter((a) => a > 0)
                      .map((augId, i) => (
                        <div
                          key={i}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 4,
                            overflow: "hidden",
                            background: "rgba(0,0,0,0.5)",
                          }}
                        >
                          <img
                            src={augmentIcons[augId] || ""}
                            width={26}
                            height={26}
                            onError={hideOnError}
                          />
                        </div>
                      ))}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <img
                        src={spellIconUrl(m.summoner1Id, imgBase)}
                        width={24}
                        height={24}
                        style={{ borderRadius: 4 }}
                        onError={hideOnError}
                      />
                      <img
                        src={spellIconUrl(m.summoner2Id, imgBase)}
                        width={24}
                        height={24}
                        style={{ borderRadius: 4 }}
                        onError={hideOnError}
                      />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {m.primaryRuneId > 0 && (
                        <img
                          src={keystoneIconUrl(m.primaryRuneId)}
                          width={24}
                          height={24}
                          style={{ borderRadius: 4 }}
                          onError={hideOnError}
                        />
                      )}
                      {m.secondaryRuneStyleId > 0 && (
                        <img
                          src={runeStyleIconUrl(m.secondaryRuneStyleId)}
                          width={24}
                          height={24}
                          style={{ borderRadius: 4 }}
                          onError={hideOnError}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* CENTER */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: 12,
                    color: "#94a3b8",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 600 }}>
                    {queueName}
                  </span>
                  <span
                    style={{
                      color: winColor,
                      fontWeight: 600,
                    }}
                  >
                    {winText}
                  </span>
                  <span>
                    {timeAgo(m.gameEndTimestamp)}
                  </span>
                  <span>
                    {formatDuration(m.gameDurationSec)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800 }}>
                    {m.kills} /{" "}
                    <span style={{ color: "#ef4444" }}>{m.deaths}</span>{" "}
                    / {m.assists}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: kda === "Perfect" ? "#f59e0b" : "#4ade80",
                    }}
                  >
                    {kda} KDA
                  </div>
                  <div style={{ fontSize: 12, color: "#eab308" }}>
                    P/Kill {killParticipation}%
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    CS {cs}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.items.map((itemId, i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        overflow: "hidden",
                        background: "rgba(0,0,0,0.4)",
                      }}
                    >
                      {itemId > 0 && (
                        <img
                          src={itemIconUrl(itemId, imgBase)}
                          style={{ width: "100%", height: "100%" }}
                          onError={hideOnError}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT */}
              <div
                style={{
                  width: 260,
                  display: "flex",
                  gap: 24,
                  borderLeft: "1px solid rgba(255,255,255,0.1)",
                  paddingLeft: 16,
                }}
              >
                <TeamColumn players={puuid ? [{ summonerName: gameName || m.championName, championName: m.championName, puuid }, ...m.allies] : m.allies} imgBase={imgBase} highlightPuuid={puuid} />
                <TeamColumn players={m.enemies} imgBase={imgBase} highlightPuuid={puuid} />
              </div>
            </div>
          );

          return linkTo ? (
            <Link key={m.matchId} to={linkTo} style={{ textDecoration: "none", color: "inherit" }}>
              {card}
            </Link>
          ) : (
            <div key={m.matchId}>{card}</div>
          );
        })}
      </div>
    </div>
  );
}
