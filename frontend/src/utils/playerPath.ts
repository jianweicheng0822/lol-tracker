/**
 * @file playerPath.ts
 * @description Build the URL of a player's page, preferring the readable Riot ID form.
 * @module frontend.utils
 */

/**
 * Path to a player's page: `/player/NA/Name/Tag` when the Riot ID is known, otherwise
 * `/player/puuid/NA/<puuid>`. Readable URLs are shareable and pre-fill the header search.
 *
 * @param riotId - "Name#Tag" (spaces around "#" are allowed); anything without a tag
 *   falls back to the PUUID form.
 */
export function playerPath(region: string, riotId: string | undefined, puuid: string): string {
  const hash = riotId ? riotId.lastIndexOf("#") : -1;
  const name = hash > 0 ? riotId!.slice(0, hash).trim() : "";
  const tag = hash > 0 ? riotId!.slice(hash + 1).trim() : "";
  if (name && tag) {
    return `/player/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  }
  return `/player/puuid/${region}/${encodeURIComponent(puuid)}`;
}
