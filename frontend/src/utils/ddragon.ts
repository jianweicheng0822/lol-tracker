/**
 * @file ddragon.ts
 * @description DDragon asset URL builders, version resolution, and static game data mappings.
 * @module frontend.utils
 *
 * Provide version-aware asset URL construction, keystone rune/spell/queue ID lookups,
 * and display utilities (duration formatting, time-ago) used across all components.
 */
import { useState, useEffect } from "react";
import { getChampionNumericId } from "./champion";

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
      return "15.18.1";
    });

  return versionPromise;
}

export function useDdragonVersion() {
  const [version, setVersion] = useState(cachedVersion ?? "15.18.1");
  useEffect(() => {
    fetchDdragonVersion().then(setVersion);
  }, []);
  return version;
}

export const ddragonBase = (version: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${version}/img`;

// --- Keystone rune ID → icon path mappings (hardcoded fallback) ---
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

export const keystoneIconUrl = (id: number, dynamicMap?: Record<number, string>) => {
  const map = dynamicMap ?? KEYSTONE_ICONS;
  const path = map[id];
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

// --- Summoner spell ID → internal name mappings (hardcoded fallback) ---
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

export const championIconFallbackUrl = (numericId: number) =>
  `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${numericId}.png`;

/**
 * onError handler for champion icon <img> elements that falls back to Community Dragon.
 * If the Community Dragon URL also fails, the image is hidden.
 *
 * @param champDdKey - The DDragon key for the champion (e.g. "Mel", "Ahri")
 * @param numericId  - Optional numeric champion ID; looked up from reverse map if omitted
 */
export const championIconOnError = (champDdKey: string, numericId?: number) => (e: React.SyntheticEvent<HTMLImageElement>) => {
  const img = e.target as HTMLImageElement;
  const id = numericId ?? getChampionNumericId(champDdKey);
  if (!img.src.includes("communitydragon.org")) {
    if (id != null) {
      img.src = championIconFallbackUrl(id);
    } else {
      img.style.display = "none";
    }
  } else {
    img.style.display = "none";
  }
};

export const itemIconUrl = (id: number, base: string) =>
  `${base}/item/${id}.png`;

export const spellIconUrl = (id: number, base: string, dynamicMap?: Record<number, string>) => {
  const map = dynamicMap ?? SUMMONER_SPELLS;
  const name = map[id] || "SummonerFlash";
  return `${base}/spell/${name}.png`;
};

// --- Dynamic summoner spell loading ---
let cachedSpells: Record<number, string> | null = null;
let cachedSpellsVersion: string | null = null;
let spellsPromise: Promise<Record<number, string>> | null = null;

export function loadSummonerSpells(version: string): Promise<Record<number, string>> {
  if (cachedSpells && cachedSpellsVersion === version) return Promise.resolve(cachedSpells);
  if (spellsPromise && cachedSpellsVersion === version) return spellsPromise;

  cachedSpells = null;
  cachedSpellsVersion = version;
  spellsPromise = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/summoner.json`
  )
    .then((r) => r.json())
    .then((data: { data: Record<string, { key: string; id: string }> }) => {
      const map: Record<number, string> = {};
      for (const spell of Object.values(data.data)) {
        map[parseInt(spell.key, 10)] = spell.id;
      }
      cachedSpells = map;
      return map;
    })
    .catch(() => {
      spellsPromise = null;
      cachedSpellsVersion = null;
      return SUMMONER_SPELLS;
    });

  return spellsPromise;
}

export function useSummonerSpells(): Record<number, string> {
  const version = useDdragonVersion();
  const [spells, setSpells] = useState<Record<number, string>>(cachedSpells ?? SUMMONER_SPELLS);
  useEffect(() => {
    loadSummonerSpells(version).then(setSpells);
  }, [version]);
  return spells;
}

// --- Dynamic keystone rune loading ---
type RuneTree = { slots: { runes: { id: number; icon: string }[] }[] };
let cachedKeystones: Record<number, string> | null = null;
let cachedKeystonesVersion: string | null = null;
let keystonesPromise: Promise<Record<number, string>> | null = null;

export function loadKeystoneRunes(version: string): Promise<Record<number, string>> {
  if (cachedKeystones && cachedKeystonesVersion === version) return Promise.resolve(cachedKeystones);
  if (keystonesPromise && cachedKeystonesVersion === version) return keystonesPromise;

  cachedKeystones = null;
  cachedKeystonesVersion = version;
  keystonesPromise = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/runesReforged.json`
  )
    .then((r) => r.json())
    .then((trees: RuneTree[]) => {
      const map: Record<number, string> = {};
      for (const tree of trees) {
        // Slot 0 contains the keystone runes
        if (tree.slots?.[0]?.runes) {
          for (const rune of tree.slots[0].runes) {
            map[rune.id] = rune.icon;
          }
        }
      }
      cachedKeystones = map;
      return map;
    })
    .catch(() => {
      keystonesPromise = null;
      cachedKeystonesVersion = null;
      return KEYSTONE_ICONS;
    });

  return keystonesPromise;
}

export function useKeystoneRunes(): Record<number, string> {
  const version = useDdragonVersion();
  const [keystones, setKeystones] = useState<Record<number, string>>(cachedKeystones ?? KEYSTONE_ICONS);
  useEffect(() => {
    loadKeystoneRunes(version).then(setKeystones);
  }, [version]);
  return keystones;
}

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
