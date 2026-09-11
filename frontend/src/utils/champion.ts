export type Champion = { id: string; name: string };

let cachedMap: Record<number, Champion> | null = null;
let cachedVersion: string | null = null;
let mapPromise: Promise<Record<number, Champion>> | null = null;

/** Reverse map: DDragon object key (e.g. "Mel") → numeric champion ID (e.g. 800) */
let reverseMap: Record<string, number> = {};

export async function loadChampionMap(version: string): Promise<Record<number, Champion>> {
  if (cachedMap && cachedVersion === version) return cachedMap;
  if (mapPromise && cachedVersion === version) return mapPromise;

  // Version changed or first load — reset and re-fetch
  cachedMap = null;
  cachedVersion = version;
  mapPromise = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  )
    .then((r) => r.json())
    .then((data: { data: Record<string, { key: string; name: string }> }) => {
      const map: Record<number, Champion> = {};
      const rev: Record<string, number> = {};
      for (const [objectKey, champ] of Object.entries(data.data)) {
        const numId = parseInt(champ.key, 10);
        map[numId] = { id: objectKey, name: champ.name };
        rev[objectKey] = numId;
      }
      cachedMap = map;
      reverseMap = rev;
      cachedVersion = version;
      return map;
    })
    .catch(() => {
      mapPromise = null;
      cachedVersion = null;
      return {};
    });

  return mapPromise;
}

/** Look up the numeric champion ID from a DDragon key (e.g. "Mel" → 800). */
export function getChampionNumericId(ddKey: string): number | undefined {
  return reverseMap[ddKey];
}
