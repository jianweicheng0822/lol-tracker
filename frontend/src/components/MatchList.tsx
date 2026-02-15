import { useState, useEffect } from "react";
import type { MatchSummary, MatchParticipant } from "../types";

type MatchListProps = {
  matches: MatchSummary[];
};

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn/15.1.1/img";

// --- Keystone rune icon paths (DDragon CDN) ---
const KEYSTONE_ICONS: Record<number, string> = {
  // Precision
  8005: "Styles/Precision/PressTheAttack/PressTheAttack.png",
  8008: "Styles/Precision/LethalTempo/LethalTempoTemp.png",
  8021: "Styles/Precision/FleetFootwork/FleetFootwork.png",
  8010: "Styles/Precision/Conqueror/Conqueror.png",
  // Domination
  8112: "Styles/Domination/Electrocute/Electrocute.png",
  8124: "Styles/Domination/Predator/Predator.png",
  8128: "Styles/Domination/DarkHarvest/DarkHarvest.png",
  9923: "Styles/Domination/HailOfBlades/HailOfBlades.png",
  // Sorcery
  8214: "Styles/Sorcery/SummonAery/SummonAery.png",
  8229: "Styles/Sorcery/ArcaneComet/ArcaneComet.png",
  8230: "Styles/Sorcery/PhaseRush/PhaseRush.png",
  // Resolve
  8437: "Styles/Resolve/GraspOfTheUndying/GraspOfTheUndying.png",
  8439: "Styles/Resolve/VeteranAftershock/VeteranAftershock.png",
  8465: "Styles/Resolve/Guardian/Guardian.png",
  // Inspiration
  8351: "Styles/Inspiration/GlacialAugment/GlacialAugment.png",
  8360: "Styles/Inspiration/UnsealedSpellbook/UnsealedSpellbook.png",
  8369: "Styles/Inspiration/FirstStrike/FirstStrike.png",
};

const keystoneIconUrl = (id: number) => {
  const path = KEYSTONE_ICONS[id];
  if (!path) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/${path}`;
};

// --- Rune style icons ---
const RUNE_STYLE_ICONS: Record<number, string> = {
  8000: "7201_Precision.png",
  8100: "7200_Domination.png",
  8200: "7202_Sorcery.png",
  8300: "7203_Whimsy.png",
  8400: "7204_Resolve.png",
};

const runeStyleIconUrl = (styleId: number) => {
  const filename = RUNE_STYLE_ICONS[styleId];
  if (!filename) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${filename}`;
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

const championIconUrl = (name: string) =>
  `${DDRAGON}/champion/${name}.png`;

const itemIconUrl = (id: number) =>
  `${DDRAGON}/item/${id}.png`;

const SUMMONER_SPELLS: Record<number, string> = {
  1: "SummonerBoost",       // Cleanse
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",       // Ghost
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana",       // Clarity
  14: "SummonerDot",        // Ignite
  21: "SummonerBarrier",
  32: "SummonerSnowball",   // Mark (ARAM)
};

const spellIconUrl = (id: number) => {
  const name = SUMMONER_SPELLS[id] || "SummonerFlash";
  return `${DDRAGON}/spell/${name}.png`;
};

const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  450: "ARAM",
  1700: "Arena",
};

const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.target as HTMLImageElement).style.display = "none";
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

const timeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

function TeamColumn({
  players,
  muted,
}: {
  players: MatchParticipant[];
  muted?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {players.map((p, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            color: muted ? "#94a3b8" : "#e2e8f0",
          }}
        >
          <img
            src={championIconUrl(p.championName)}
            width={16}
            height={16}
            style={{ borderRadius: 3 }}
            onError={hideOnError}
          />
          <span
            style={{
              maxWidth: 95,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.summonerName}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MatchList({ matches }: MatchListProps) {
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

          return (
            <div
              key={m.matchId}
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 10,
                background: winBg,
                padding: "14px 16px",
                borderLeft: `4px solid ${winColor}`,
              }}
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
                    src={championIconUrl(m.championName)}
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
                  /* Arena: show augments in 2x2 grid */
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
                  /* Other modes: spells + runes */
                  <div style={{ display: "flex", gap: 4 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <img
                        src={spellIconUrl(m.summoner1Id)}
                        width={24}
                        height={24}
                        style={{ borderRadius: 4 }}
                        onError={hideOnError}
                      />
                      <img
                        src={spellIconUrl(m.summoner2Id)}
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
                {/* Meta Row */}
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
                    {formatDuration(
                      m.gameDurationSec
                    )}
                  </span>
                </div>

                {/* Stats Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                    }}
                  >
                    {m.kills} /{" "}
                    <span style={{ color: "#ef4444" }}>
                      {m.deaths}
                    </span>{" "}
                    / {m.assists}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color:
                        kda === "Perfect"
                          ? "#f59e0b"
                          : "#4ade80",
                    }}
                  >
                    {kda} KDA
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#eab308",
                    }}
                  >
                    P/Kill {killParticipation}%
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8",
                    }}
                  >
                    CS {cs}
                  </div>
                </div>

                {/* Items */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  {m.items.map((itemId, i) => (
                    <div
                      key={i}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        overflow: "hidden",
                        background:
                          "rgba(0,0,0,0.4)",
                      }}
                    >
                      {itemId > 0 && (
                        <img
                          src={itemIconUrl(
                            itemId
                          )}
                          style={{
                            width: "100%",
                            height: "100%",
                          }}
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
                  borderLeft:
                    "1px solid rgba(255,255,255,0.1)",
                  paddingLeft: 16,
                }}
              >
                <TeamColumn players={m.allies} />
                <TeamColumn players={m.enemies} muted />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
