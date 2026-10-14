/**
 * @file multiSearch.ts
 * @description Parse the multi-search box into Riot IDs to look up, plus anything that was skipped.
 * @module frontend.utils
 */

export const MULTI_SEARCH_LIMIT = 5;

export type ParsedMultiSearch = {
  /** "Name#Tag" entries to search, deduplicated, at most MULTI_SEARCH_LIMIT. */
  names: string[];
  /** Entries that aren't a valid Name#Tag (e.g. the tag is missing). */
  invalid: string[];
  /** Valid entries beyond the limit, which were not searched. */
  overLimit: string[];
};

/**
 * Split pasted text (commas or newlines) into Riot IDs. Instead of rejecting the whole batch when
 * one line is wrong, valid IDs are kept and the rest are reported so the page can say what was skipped.
 */
export function parseMultiSearchInput(text: string): ParsedMultiSearch {
  const names: string[] = [];
  const invalid: string[] = [];
  const overLimit: string[] = [];
  const seen = new Set<string>();

  for (const raw of text.split(/[,\n]+/)) {
    const entry = raw.trim();
    if (!entry) continue;

    // Riot IDs can't contain "#", so exactly one is expected, with text on both sides
    const parts = entry.split("#");
    const name = parts[0]?.trim();
    const tag = parts[1]?.trim();
    if (parts.length !== 2 || !name || !tag) {
      invalid.push(entry);
      continue;
    }

    const id = `${name}#${tag}`;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    if (names.length < MULTI_SEARCH_LIMIT) names.push(id);
    else overLimit.push(id);
  }

  return { names, invalid, overLimit };
}
