import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMultiSearch } from "../api";
import { COLORS } from "../utils/colors";
import { REGIONS } from "../types";
import type { Region, MultiSearchPlayer } from "../types";
import MultiSearchCard from "../components/MultiSearchCard";

export default function MultiSearchPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [region, setRegion] = useState<Region>("NA");
  const [results, setResults] = useState<MultiSearchPlayer[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const parseNames = (text: string): string[] => {
    return text
      .split(/[,\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  };

  const handleSearch = async () => {
    const names = parseNames(input);
    if (names.length === 0) return;

    const invalid = names.filter(n => !n.includes("#"));
    if (invalid.length > 0) {
      setErrorMsg(`Invalid format (missing #): ${invalid.join(", ")}`);
      setStatus("error");
      return;
    }
    if (names.length > 5) {
      setErrorMsg("Maximum 5 players allowed");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await fetchMultiSearch(names, region);
      setResults(data);
      setStatus("done");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Search failed");
      setStatus("error");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <span style={styles.logo} onClick={() => navigate("/")}>LoL Tracker</span>
      </div>

      <div style={styles.content}>
        <h1 style={styles.title}>Multi-Search</h1>
        <p style={styles.subtitle}>
          Paste up to 5 player names (Name#Tag) separated by commas or newlines.
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
  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    padding: "12px 24px",
    background: "#111110",
    borderBottom: "1px solid #1e1c18",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    cursor: "pointer",
    whiteSpace: "nowrap",
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 14,
    marginTop: 24,
  },
};
