import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchMultiSearch } from "../api";
import { COLORS } from "../utils/colors";
import { REGIONS } from "../types";
import type { Region, MultiSearchPlayer } from "../types";
import MultiSearchCard from "../components/MultiSearchCard";
import { parseMultiSearchInput, MULTI_SEARCH_LIMIT } from "../utils/multiSearch";
import AppHeader from "../components/AppHeader";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

const toRegion = (value: string | null): Region =>
  REGIONS.includes(value as Region) ? (value as Region) : "NA";

export default function MultiSearchPage() {
  useDocumentTitle("Multi-Search");
  // The searched names live in the URL (?q=Name#Tag,...&region=NA), so going back from a player
  // page, refreshing, or sharing the link brings the same search back
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [input, setInput] = useState(() => initialQuery.split(",").filter(Boolean).join("\n"));
  const [region, setRegion] = useState<Region>(() => toRegion(searchParams.get("region")));
  const [results, setResults] = useState<MultiSearchPlayer[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  // Lines that weren't searched (bad format or over the limit), shown next to the results
  const [skipped, setSkipped] = useState<{ invalid: string[]; overLimit: string[] }>({ invalid: [], overLimit: [] });

  const runSearch = async (text: string, searchRegion: Region) => {
    if (!text.trim()) return;
    const { names, invalid, overLimit } = parseMultiSearchInput(text);
    setSkipped({ invalid, overLimit });

    if (names.length === 0) {
      setErrorMsg("No valid Riot IDs found. Use the Name#Tag format, e.g. Faker#KR1.");
      setStatus("error");
      return;
    }

    // Replace rather than push, so Back doesn't step through every search
    setSearchParams({ q: names.join(","), region: searchRegion }, { replace: true });
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await fetchMultiSearch(names, searchRegion);
      setResults(data);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Search failed");
      setStatus("error");
    }
  };

  const handleSearch = () => runSearch(input, region);

  // Coming back to (or opening) a URL with a search in it: run it again
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !initialQuery) return;
    restored.current = true;
    runSearch(initialQuery, region);
    // Only on first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={styles.page}>
      <AppHeader />

      <div style={styles.content}>
        <h1 style={styles.title}>Multi-Search</h1>
        <p style={styles.subtitle}>
          Paste up to 5 Riot IDs (Name#Tag), one per line or separated by commas. Lines copied from the lobby chat work too.
        </p>

        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"Player1#NA1\nPlayer2#EUW\nPlayer3#TAG"}
            rows={5}
          />

          <div style={styles.controls}>
            <select
              style={styles.select}
              value={region}
              onChange={(e) => setRegion(e.target.value as Region)}
            >
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <button
              style={styles.searchBtn}
              onClick={handleSearch}
              disabled={status === "loading"}
              onMouseEnter={(e) => { if (status !== "loading") e.currentTarget.style.background = "#c49415"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.gold; }}
            >
              {status === "loading" ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {status === "error" && (
          <div style={styles.errorBox}>{errorMsg}</div>
        )}

        {status !== "error" && (skipped.invalid.length > 0 || skipped.overLimit.length > 0) && (
          <div style={styles.noticeBox} role="status">
            {skipped.invalid.length > 0 && (
              <div>Skipped, not in Name#Tag format: {skipped.invalid.join(", ")}</div>
            )}
            {skipped.overLimit.length > 0 && (
              <div>
                Only the first {MULTI_SEARCH_LIMIT} players are searched. Skipped: {skipped.overLimit.join(", ")}
              </div>
            )}
          </div>
        )}

        {status === "done" && results.length > 0 && (
          <div style={styles.grid}>
            {results.map((player, i) => (
              <MultiSearchCard key={`${player.gameName}-${player.tagLine}-${i}`} player={player} region={region} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#121210",
    color: COLORS.textPrimary,
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  },
  content: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 20px",
  },
  title: {
    fontSize: 32,
    fontWeight: 800,
    margin: 0,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 0,
    marginBottom: 24,
  },
  inputArea: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  textarea: {
    width: "100%",
    background: "rgba(35,35,40,0.85)",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 8,
    color: COLORS.textPrimary,
    padding: "12px 14px",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
  },
  controls: {
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  select: {
    background: "rgba(35,35,40,0.85)",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    color: COLORS.textPrimary,
    padding: "8px 12px",
    fontSize: 13,
    outline: "none",
  },
  searchBtn: {
    background: COLORS.gold,
    color: "#000",
    border: "none",
    borderRadius: 6,
    padding: "8px 24px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.15s ease",
  },
  errorBox: {
    background: "#2d1111",
    color: "#E88A8A",
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    fontSize: 13,
  },
  noticeBox: {
    background: "rgba(212,160,23,0.08)",
    border: "1px solid rgba(212,160,23,0.25)",
    color: "#E8C46A",
    padding: 12,
    borderRadius: 6,
    marginTop: 16,
    fontSize: 13,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 14,
    marginTop: 24,
  },
};
