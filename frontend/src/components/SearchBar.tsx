import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import type { Region } from "../types";
import { REGIONS } from "../types";
import { COLORS } from "../utils/colors";
import { getAuthToken, fetchSearchHistory, removeSearchHistory, clearAllSearchHistory } from "../api";
import { getLocalHistory, removeLocalEntry, clearLocalHistory, type SearchEntry } from "../utils/searchHistory";

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
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<SearchEntry[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [hint, setHint] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const gameNameRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);
  // Set when the hint moves focus to the name box, so the history dropdown does not cover the hint
  const skipHistoryOnFocus = useRef(false);

  const canSearch = gameName.trim().length > 0 && tag.replace(/^#/, "").trim().length > 0;

  /** Riot IDs can't contain "#", so "name#tag" typed or pasted into the name box is split for the user. */
  const handleGameNameChange = (value: string) => {
    setHint(null);
    setHighlightIndex(-1);
    const hashIndex = value.indexOf("#");
    if (hashIndex === -1) {
      setGameName(value);
      return;
    }
    setGameName(value.slice(0, hashIndex));
    const tagPart = value.slice(hashIndex + 1).replace(/#/g, "");
    if (tagPart) setTag(tagPart);
    // Typed "#" with nothing after it yet: carry on typing in the tag box
    else tagRef.current?.focus();
  };

  /** Also accept the full "name#tag" pasted into the tag box when the name box is still empty. */
  const handleTagChange = (value: string) => {
    setHint(null);
    setHighlightIndex(-1);
    const hashIndex = value.indexOf("#");
    if (hashIndex > 0 && !gameName.trim()) {
      setGameName(value.slice(0, hashIndex));
      setTag(value.slice(hashIndex + 1).replace(/#/g, ""));
      return;
    }
    setTag(value);
  };

  /** Explain why nothing happened instead of silently ignoring the search. */
  const showMissingFieldHint = () => {
    setShowHistory(false);
    if (!gameName.trim()) {
      setHint("Enter a game name");
      skipHistoryOnFocus.current = true;
      gameNameRef.current?.focus();
      skipHistoryOnFocus.current = false;
    } else {
      setHint("Add the tag after # (e.g. NA1)");
      tagRef.current?.focus();
    }
  };

  const loadHistory = useCallback(async () => {
    try {
      if (getAuthToken()) {
        const data = await fetchSearchHistory();
        setHistoryItems(data.map((d) => ({
          region: d.region,
          gameName: d.gameName,
          tagLine: d.tagLine,
          searchedAt: new Date(d.searchedAt).getTime(),
        })));
      } else {
        setHistoryItems(getLocalHistory());
      }
    } catch {
      setHistoryItems(getLocalHistory());
    }
  }, []);

  const handleSearch = () => {
    if (!canSearch) {
      showMissingFieldHint();
      return;
    }
    const cleanTag = tag.trim().replace(/^#/, "");
    setShowHistory(false);
    navigate(`/player/${region}/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(cleanTag)}`);
  };

  const getFilteredItems = () => {
    const input = gameName.trim();
    if (!input) return historyItems;
    const query = tag.trim()
      ? `${input}#${tag.trim().replace(/^#/, "")}`.toLowerCase()
      : input.toLowerCase();
    return historyItems.filter((item) => {
      const candidate = `${item.gameName}#${item.tagLine}`.toLowerCase();
      return candidate.startsWith(query);
    });
  };

  const filteredItems = showHistory ? getFilteredItems() : [];

  const handleSelectItem = (item: SearchEntry) => {
    setRegion(item.region as Region);
    setGameName(item.gameName);
    setTag(item.tagLine);
    setShowHistory(false);
    navigate(`/player/${item.region}/${encodeURIComponent(item.gameName)}/${encodeURIComponent(item.tagLine)}`);
  };

  const handleRemoveItem = async (e: React.MouseEvent, item: SearchEntry) => {
    e.stopPropagation();
    try {
      if (getAuthToken()) {
        await removeSearchHistory(item.gameName, item.tagLine, item.region);
      } else {
        removeLocalEntry(item.region, item.gameName, item.tagLine);
      }
      await loadHistory();
    } catch {
      // ignore
    }
  };

  const handleClearAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (getAuthToken()) {
        await clearAllSearchHistory();
      } else {
        clearLocalHistory();
      }
      setHistoryItems([]);
      setShowHistory(false);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showHistory && filteredItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
        return;
      }
      if (e.key === "Enter" && highlightIndex >= 0) {
        e.preventDefault();
        handleSelectItem(filteredItems[highlightIndex]);
        return;
      }
    }
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowHistory(false);
  };

  const handleFocus = () => {
    if (skipHistoryOnFocus.current) return;
    loadHistory().then(() => setShowHistory(true));
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown if filtered results become empty (but not when input is empty)
  const shouldShowDropdown = showHistory && (filteredItems.length > 0 || historyItems.length === 0);

  const inputPadding = compact ? "10px 14px" : "14px 18px";
  const inputFontSize = compact ? 14 : 15;
  const gap = compact ? 8 : 12;
  const maxW = compact ? 600 : 700;

  return (
    <div ref={wrapperRef} className="search-bar" style={{ position: "relative", display: "flex", gap, alignItems: "center", width: "100%", maxWidth: maxW }}>
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

      <div className="search-bar__name" style={{ position: "relative", flex: 1, minWidth: 0 }}>
        <input
          ref={gameNameRef}
          className="gold-input"
          style={{ ...styles.input, width: "100%", padding: inputPadding, fontSize: inputFontSize }}
          placeholder="Game Name"
          value={gameName}
          onChange={(e) => handleGameNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          autoComplete="off"
        />

        {shouldShowDropdown && filteredItems.length > 0 && (
          <div style={styles.dropdown} data-testid="search-history-dropdown">
            <div style={styles.dropdownHeader}>Recent Searches</div>
            {filteredItems.map((item, idx) => (
              <div
                key={`${item.region}-${item.gameName}-${item.tagLine}`}
                style={{
                  ...styles.dropdownItem,
                  ...(idx === highlightIndex ? styles.dropdownItemHighlight : {}),
                }}
                onClick={() => handleSelectItem(item)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <span style={styles.regionTag}>{item.region}</span>
                <span style={styles.playerName}>{item.gameName}#{item.tagLine}</span>
                <button
                  style={styles.removeBtn}
                  onClick={(e) => handleRemoveItem(e, item)}
                  aria-label={`Remove ${item.gameName}#${item.tagLine}`}
                >
                  ×
                </button>
              </div>
            ))}
            <div style={styles.dropdownFooter}>
              <button style={styles.clearAllBtn} onClick={handleClearAll}>Clear All</button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={tagRef}
        className="gold-input search-bar__tag"
        style={{ ...styles.input, width: compact ? 90 : 120, padding: inputPadding, fontSize: inputFontSize }}
        placeholder="#Tag"
        value={tag}
        onChange={(e) => handleTagChange(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <button
        style={{
          ...styles.button,
          padding: compact ? "10px 20px" : "14px 28px",
          fontSize: compact ? 14 : 15,
        }}
        // Always clickable: an incomplete search shows a hint saying what's missing
        onClick={handleSearch}
      >
        Search
      </button>

      {hint && (
        <div role="alert" style={styles.hint}>
          {hint}
        </div>
      )}
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
    boxSizing: "border-box",
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
  hint: {
    position: "absolute",
    top: "calc(100% + 6px)",
    left: 0,
    fontSize: 13,
    color: "#E8A87C",
    whiteSpace: "nowrap",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 4,
    background: "#1e1e22",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 8,
    zIndex: 1000,
    maxHeight: 400,
    overflowY: "auto",
  },
  dropdownHeader: {
    padding: "8px 12px",
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: 600,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  dropdownItemHighlight: {
    background: "rgba(255,255,255,0.08)",
  },
  regionTag: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.gold,
    background: "rgba(212,160,23,0.12)",
    padding: "2px 6px",
    borderRadius: 4,
    flexShrink: 0,
  },
  playerName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  removeBtn: {
    background: "none",
    border: "none",
    color: COLORS.textDim,
    cursor: "pointer",
    fontSize: 16,
    padding: "0 4px",
    lineHeight: 1,
    flexShrink: 0,
  },
  dropdownFooter: {
    padding: "6px 12px",
    borderTop: `1px solid ${COLORS.divider}`,
    textAlign: "center",
  },
  clearAllBtn: {
    background: "none",
    border: "none",
    color: COLORS.textTertiary,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 8px",
  },
};
