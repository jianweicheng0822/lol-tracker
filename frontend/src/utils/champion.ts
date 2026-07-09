export type Champion = { id: string; name: string };

let cachedMap: Record<number, Champion> | null = null;
let cachedVersion: string | null = null;
let mapPromise: Promise<Record<number, Champion>> | null = null;

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
      for (const [objectKey, champ] of Object.entries(data.data)) {
        map[parseInt(champ.key, 10)] = { id: objectKey, name: champ.name };
      }
      cachedMap = map;
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
