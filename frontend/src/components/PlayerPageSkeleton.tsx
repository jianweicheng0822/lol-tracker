/**
 * @file PlayerPageSkeleton.tsx
 * @description Placeholder shown while a player's data loads, shaped like the real page.
 * @module frontend.components
 *
 * A cold load (nobody looked this player up recently) can take several seconds while the backend
 * asks Riot. Grey blocks in the page's layout read as "loading" instead of "stuck", and the real
 * content then appears in the same places without the page jumping around.
 */
import { useIsMobile } from "../hooks/useIsMobile";
import { COLORS } from "../utils/colors";

/** One shimmering placeholder block. */
function Bone({ width, height, round = false, style }: {
  width: number | string;
  height: number;
  round?: boolean;
  style?: React.CSSProperties;
}) {
  return <div style={{ ...styles.bone, width, height, borderRadius: round ? "50%" : 6, ...style }} />;
}

export default function PlayerPageSkeleton() {
  const isMobile = useIsMobile();

  return (
    <div role="status" aria-label="Loading player">
      {/* Profile header: icon, name, region / refresh and favorite buttons */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Bone width={56} height={56} round />
          <div>
            <Bone width={isMobile ? 140 : 220} height={26} />
            <Bone width={48} height={13} style={{ marginTop: 10 }} />
          </div>
        </div>
        <div style={styles.headerLeft}>
          <Bone width={40} height={34} />
          <Bone width={100} height={34} />
        </div>
      </div>

      {/* Live game line and tabs */}
      <Bone width={200} height={14} style={{ marginBottom: 20 }} />
      <div style={styles.tabs}>
        <Bone width={84} height={18} />
        <Bone width={84} height={18} />
      </div>

      <div style={isMobile ? styles.stack : styles.grid}>
        {/* Sidebar: ranked and LP history cards */}
        <div style={styles.column}>
          <div style={styles.card}>
            <Bone width={70} height={11} />
            <div style={{ ...styles.headerLeft, marginTop: 14 }}>
              <Bone width={52} height={52} round />
              <div>
                <Bone width={130} height={22} />
                <Bone width={90} height={12} style={{ marginTop: 8 }} />
              </div>
            </div>
          </div>
          {!isMobile && (
            <div style={styles.card}>
              <Bone width={90} height={14} />
              <Bone width="100%" height={110} style={{ marginTop: 14 }} />
            </div>
          )}
        </div>

        {/* Recent matches */}
        <div style={styles.column}>
          <Bone width={160} height={22} />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ ...styles.card, ...styles.matchCard }}>
              <Bone width={48} height={48} round />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Bone width={90} height={20} />
                <Bone width={60} height={12} style={{ marginTop: 8 }} />
                <Bone width="70%" height={22} style={{ marginTop: 10 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Same shimmer as the leaderboard's loading rows
  bone: {
    background: `linear-gradient(90deg, ${COLORS.cardBorder} 25%, rgba(255,255,255,0.06) 50%, ${COLORS.cardBorder} 75%)`,
    backgroundSize: "200% 100%",
    animation: "shimmer 1.5s infinite",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottom: `1px solid ${COLORS.cardBorder}`,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  tabs: {
    display: "flex",
    gap: 24,
    paddingBottom: 12,
    marginBottom: 20,
    borderBottom: `1px solid ${COLORS.cardBorder}`,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "280px minmax(0, 1fr)",
    gap: 20,
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  column: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minWidth: 0,
  },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 4,
    padding: "18px 20px",
  },
  matchCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
};
