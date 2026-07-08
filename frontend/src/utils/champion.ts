import { useDdragonVersion } from "./ddragon";

let cachedMap: Record<number, string> | null = null;
let mapPromise: Promise<Record<number, string>> | null = null;

export async function loadChampionMap(version: string): Promise<Record<number, string>> {
  if (cachedMap) return cachedMap;
  if (mapPromise) return mapPromise;

  mapPromise = fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`
  )
    .then((r) => r.json())
    .then((data: { data: Record<string, { key: string; name: string }> }) => {
      const map: Record<number, string> = {};
      for (const champ of Object.values(data.data)) {
        map[parseInt(champ.key, 10)] = champ.name;
      }
      cachedMap = map;
      return map;
    })
    .catch(() => {
      mapPromise = null;
      return {};
    });

  return mapPromise;
}

export function getChampionName(championId: number): string {
  if (cachedMap && cachedMap[championId]) return cachedMap[championId];
  return `Champion ${championId}`;
}
