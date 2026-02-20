/**
 * Shared DDragon/Community Dragon helpers — version resolution, asset URL builders,
 * rune/spell/queue mappings, and display utilities used across all components.
 */
import { useState, useEffect } from "react";

// DDragon assets are versioned per game patch (e.g. "15.3.1").
// Using a hardcoded version breaks when new champions/items are released.
// We fetch the latest version once from the DDragon API and cache it
// for the lifetime of the page to keep all asset URLs up to date.
let cachedVersion: string | null = null;
let versionPromise: Promise<string> | null = null;

function fetchDdragonVersion(): Promise<string> {
  if (cachedVersion) return Promise.resolve(cachedVersion);
  if (versionPromise) return versionPromise;

  versionPromise = fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    .then((r) => r.json())
    .then((versions: string[]) => {
      cachedVersion = versions[0];
      return cachedVersion;
    })
    .catch(() => {
      versionPromise = null;
      return "15.1.1";
    });

  return versionPromise;
}

export function useDdragonVersion() {
  const [version, setVersion] = useState(cachedVersion ?? "15.1.1");
  useEffect(() => {
    fetchDdragonVersion().then(setVersion);
  }, []);
  return version;
}

export const ddragonBase = (version: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img`;

// --- Keystone rune ID → icon path mappings ---
export const KEYSTONE_ICONS: Record<number, string> = {
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

export const keystoneIconUrl = (id: number) => {
  const path = KEYSTONE_ICONS[id];
  if (!path) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/${path}`;
};

// --- Secondary rune style ID → icon filename mappings ---
export const RUNE_STYLE_ICONS: Record<number, string> = {
  8000: "7201_Precision.png",
  8100: "7200_Domination.png",
  8200: "7202_Sorcery.png",
  8300: "7203_Whimsy.png",
  8400: "7204_Resolve.png",
};

export const runeStyleIconUrl = (styleId: number) => {
  const filename = RUNE_STYLE_ICONS[styleId];
  if (!filename) return "";
  return `https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/${filename}`;
};

// --- Summoner spell ID → internal name mappings ---
export const SUMMONER_SPELLS: Record<number, string> = {
  1: "SummonerBoost",
  3: "SummonerExhaust",
  4: "SummonerFlash",
  6: "SummonerHaste",
  7: "SummonerHeal",
  11: "SummonerSmite",
  12: "SummonerTeleport",
  13: "SummonerMana",
  14: "SummonerDot",
  21: "SummonerBarrier",
  32: "SummonerSnowball",
};

export const championIconUrl = (name: string, base: string) =>
  `${base}/champion/${name}.png`;

export const itemIconUrl = (id: number, base: string) =>
  `${base}/item/${id}.png`;

export const spellIconUrl = (id: number, base: string) => {
  const name = SUMMONER_SPELLS[id] || "SummonerFlash";
  return `${base}/spell/${name}.png`;
};

// --- Queue ID → display name mappings ---
export const QUEUE_NAMES: Record<number, string> = {
  420: "Ranked Solo/Duo",
  440: "Ranked Flex",
  450: "ARAM",
  1700: "Arena",
};

export const hideOnError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  (e.target as HTMLImageElement).style.display = "none";
};

export const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${String(s).padStart(2, "0")}s`;
};

export const timeAgo = (timestamp: number) => {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};
