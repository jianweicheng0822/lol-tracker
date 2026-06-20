/**
 * @file SearchBar.tsx
 * @description Render the summoner search form with region selector, game name input, tag input,
 *   and search button. Navigate to the player profile page on submission.
 * @module frontend.components
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Region } from "../types";
import { REGIONS } from "../types";
import { COLORS } from "../utils/colors";

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

  const inputPadding = compact ? "10px 14px" : "14px 18px";
  const inputFontSize = compact ? 14 : 15;
  const gap = compact ? 8 : 12;
  const maxW = compact ? 600 : 700;

  return (
    <div style={{
      display: "flex",
      gap,
      alignItems: "center",
      width: "100%",
      maxWidth: maxW,
    }}>
      <select
        className="gold-input"
        style={{ ...styles.select, padding: inputPadding, fontSize: inputFontSize }}
        value={region}
        onChange={(e) => setRegion(e.target.value as Region)}
      >
        {REGIONS.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <input
        className="gold-input"
        style={{ ...styles.input, flex: 1, padding: inputPadding, fontSize: inputFontSize }}
        placeholder="Game Name"
        value={gameName}
        onChange={(e) => setGameName(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <input
        className="gold-input"
        style={{ ...styles.input, width: compact ? 90 : 120, padding: inputPadding, fontSize: inputFontSize }}
        placeholder="#Tag"
        value={tag}
        onChange={(e) => setTag(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        style={{
          ...(canSearch ? styles.button : styles.buttonDisabled),
          padding: compact ? "10px 20px" : "14px 28px",
          fontSize: compact ? 14 : 15,
        }}
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
    borderRadius: 8,
    border: `1px solid ${COLORS.cardBorder}`,
    background: "rgba(35,35,40,0.65)",
    color: COLORS.textPrimary,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  select: {
    borderRadius: 8,
    background: "rgba(35,35,40,0.65)",
    color: COLORS.textPrimary,
    border: `1px solid ${COLORS.cardBorder}`,
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  button: {
    borderRadius: 8,
    background: "#D4A017",
    color: "#0F0F0F",
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
    whiteSpace: "nowrap",
    transition: "background 0.15s",
  },
  buttonDisabled: {
    borderRadius: 8,
    background: "rgba(255,255,255,0.06)",
    color: COLORS.textDim,
    cursor: "not-allowed",
    border: "none",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};
