/** Search bar for looking up players by region, game name, and tag. */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Region } from "../types";
import { REGIONS } from "../types";

type SearchBarProps = {
  compact?: boolean;
  initialRegion?: Region;
  initialGameName?: string;
  initialTag?: string;
};

export default function SearchBar({ compact, initialRegion, initialGameName, initialTag }: SearchBarProps) {
  const navigate = useNavigate();
  const [region, setRegion] = useState<Region>(initialRegion || "NA");
  const [gameName, setGameName] = useState(initialGameName || "");
  const [tag, setTag] = useState(initialTag || "");

  const canSearch = gameName.trim().length > 0 && tag.trim().length > 0;

  const handleSearch = () => {
    if (!canSearch) return;
    const cleanTag = tag.trim().replace(/^#/, "");
    navigate(`/player/${region}/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(cleanTag)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div style={{
      display: "flex",
      gap: compact ? 8 : 10,
      alignItems: "center",
      width: "100%",
      maxWidth: compact ? 600 : 560,
    }}>
      <select
        style={styles.select}
        value={region}
        onChange={(e) => setRegion(e.target.value as Region)}
      >
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <input
        style={{ ...styles.input, flex: 1 }}
        placeholder="Game Name"
        value={gameName}
        onChange={(e) => setGameName(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <input
        style={{ ...styles.input, width: compact ? 90 : 110 }}
        placeholder="#Tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        style={canSearch ? styles.button : styles.buttonDisabled}
        disabled={!canSearch}
        onClick={handleSearch}
      >
        Search
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  input: {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    outline: "none",
    fontSize: 14,
  },
  select: {
    padding: "10px 12px",
    borderRadius: 8,
    background: "#0f172a",
    color: "white",
    border: "1px solid #334155",
    outline: "none",
    fontSize: 14,
  },
  button: {
    padding: "10px 20px",
    borderRadius: 8,
    background: "#2563eb",
    color: "white",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
  buttonDisabled: {
    padding: "10px 20px",
    borderRadius: 8,
    background: "#334155",
    color: "#94a3b8",
    cursor: "not-allowed",
    border: "none",
    fontWeight: 700,
    fontSize: 14,
    whiteSpace: "nowrap",
  },
};