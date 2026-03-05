/**
 * Horizontal tab navigation bar for the player dashboard.
 * Renders 4 tabs: Overview, Performance, Champions, Match History.
 * Active tab has an indigo (#6366f1) bottom border and bright text;
 * inactive tabs dim to slate and brighten on hover.
 * Tab state is managed via URL search params (see useTabNavigation hook).
 */
import { useState } from "react";
import type { TabId } from "../types";

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

/** Tab definitions — order here controls the visual tab order. */
const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "champions", label: "Champions" },
  { id: "match-history", label: "Match History" },
];

/** Single tab button with hover state tracking for interactive styling. */
function Tab({ label, active, onClick }: { id: TabId; label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "10px 20px",
        background: "none",
        border: "none",
        // Active: indigo bottom border; inactive: transparent (no visual shift on click)
        borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
        // Active: bright text; hover: medium brightness; default: dim slate
        color: active ? "#e2e8f0" : hovered ? "#94a3b8" : "#64748b",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        cursor: "pointer",
        transition: "color 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

export default function TabBar({ activeTab, onTabChange }: Props) {
  return (
    <div style={styles.container}>
      {TABS.map((t) => (
        <Tab key={t.id} id={t.id} label={t.label} active={activeTab === t.id} onClick={() => onTabChange(t.id)} />
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    gap: 4,
    borderBottom: "1px solid #334155",
    marginBottom: 24,
  },
};
