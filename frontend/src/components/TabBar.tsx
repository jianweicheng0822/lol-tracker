import { useState } from "react";
import type { TabId } from "../types";

type Props = {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
};

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "champions", label: "Champions" },
  { id: "match-history", label: "Match History" },
];

function Tab({ id, label, active, onClick }: { id: TabId; label: string; active: boolean; onClick: () => void }) {
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
        borderBottom: active ? "2px solid #6366f1" : "2px solid transparent",
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
