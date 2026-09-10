export type SearchEntry = {
  region: string;
  gameName: string;
  tagLine: string;
  searchedAt: number; // epoch ms
};

const STORAGE_KEY = "lol_tracker_search_history";
const MAX_ENTRIES = 10;

export function getLocalHistory(): SearchEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.sort((a: SearchEntry, b: SearchEntry) => b.searchedAt - a.searchedAt);
  } catch {
    return [];
  }
}

export function addLocalEntry(entry: SearchEntry): void {
  try {
    let history = getLocalHistory();
    const idx = history.findIndex(
      (h) =>
        h.gameName.toLowerCase() === entry.gameName.toLowerCase() &&
        h.tagLine.toLowerCase() === entry.tagLine.toLowerCase() &&
        h.region.toLowerCase() === entry.region.toLowerCase()
    );

    if (idx !== -1) {
      history[idx].gameName = entry.gameName;
      history[idx].tagLine = entry.tagLine;
      history[idx].region = entry.region;
      history[idx].searchedAt = entry.searchedAt;
    } else {
      history.push(entry);
    }

    history.sort((a, b) => b.searchedAt - a.searchedAt);
    history = history.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // graceful degradation
  }
}

export function removeLocalEntry(region: string, gameName: string, tagLine: string): void {
  try {
    const history = getLocalHistory().filter(
      (h) =>
        !(
          h.gameName.toLowerCase() === gameName.toLowerCase() &&
          h.tagLine.toLowerCase() === tagLine.toLowerCase() &&
          h.region.toLowerCase() === region.toLowerCase()
        )
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // graceful degradation
  }
}

export function clearLocalHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // graceful degradation
  }
}
