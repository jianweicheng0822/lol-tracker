import { useState } from "react";
import { COLORS } from "../utils/colors";
import { getAuthToken, createCheckoutSession } from "../api";

type Props = {
  onClose: () => void;
  onShowAuth: () => void;
};

const FEATURES = [
  { label: "AI Match Coaching", free: "\u2014", pro: "Unlimited" },
];

export default function UpgradeModal({ onClose, onShowAuth }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isLoggedIn = !!getAuthToken();

  async function handleSubscribe() {
    if (!isLoggedIn) {
      onClose();
      onShowAuth();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.proBadge}>PRO</span>
          <h2 style={styles.title}>Upgrade Your Tracker</h2>
          <p style={styles.subtitle}>
            Unlock AI coaching to improve your gameplay.
          </p>
          <button style={styles.closeBtn} onClick={onClose}>
            {"\u00d7"}
          </button>
        </div>

        {/* Comparison table */}
        <div style={styles.table}>
          <div style={styles.tableHeader}>
            <span style={styles.featureCol}>Feature</span>
            <span style={styles.tierCol}>FREE</span>
            <span style={{ ...styles.tierCol, color: COLORS.gold }}>PRO</span>
          </div>
          {FEATURES.map((f) => (
            <div key={f.label} style={styles.tableRow}>
              <span style={styles.featureCol}>{f.label}</span>
              <span style={{ ...styles.tierCol, color: COLORS.textTertiary }}>
                {f.free}
              </span>
              <span style={{ ...styles.tierCol, color: "#fff", fontWeight: 600 }}>
                {f.pro}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div style={styles.pricing}>
          <span style={styles.price}>$4.99</span>
          <span style={styles.period}>/month</span>
        </div>

        {/* CTA */}
        {error && <p style={styles.error}>{error}</p>}
        <button
          style={{
            ...styles.ctaBtn,
            opacity: loading ? 0.6 : 1,
            cursor: loading ? "not-allowed" : "pointer",
          }}
          onClick={handleSubscribe}
          disabled={loading}
        >
          {loading
            ? "Redirecting..."
            : isLoggedIn
              ? "Subscribe with Stripe"
              : "Log in to Subscribe"}
        </button>
        <p style={styles.disclaimer}>Cancel anytime. No long-term commitment.</p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    backdropFilter: "blur(4px)",
  },
  modal: {
    background: "#1e1e24",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 16,
    padding: "36px 32px 28px",
    maxWidth: 420,
    width: "90%",
    position: "relative",
  },
  header: {
    textAlign: "center",
    marginBottom: 24,
  },
  proBadge: {
    display: "inline-block",
    background: "linear-gradient(135deg, #D4A017 0%, #F5D060 100%)",
    color: "#1a1a1a",
    fontWeight: 800,
    fontSize: 13,
    padding: "4px 14px",
    borderRadius: 20,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: 700,
    margin: "8px 0 4px",
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    margin: 0,
    lineHeight: 1.5,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 16,
    background: "none",
    border: "none",
    color: COLORS.textTertiary,
    fontSize: 24,
    cursor: "pointer",
    padding: 4,
  },
  table: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 24,
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1fr 80px 80px",
    padding: "10px 16px",
    borderBottom: `1px solid ${COLORS.divider}`,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1fr 80px 80px",
    padding: "12px 16px",
    borderBottom: `1px solid ${COLORS.divider}`,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  featureCol: {
    textAlign: "left",
  },
  tierCol: {
    textAlign: "center",
  },
  pricing: {
    textAlign: "center",
    marginBottom: 20,
  },
  price: {
    fontSize: 36,
    fontWeight: 800,
    color: "#fff",
  },
  period: {
    fontSize: 16,
    color: COLORS.textTertiary,
    marginLeft: 2,
  },
  ctaBtn: {
    display: "block",
    width: "100%",
    padding: "14px 0",
    background: "linear-gradient(135deg, #D4A017 0%, #E8C84A 100%)",
    color: "#1a1a1a",
    fontWeight: 700,
    fontSize: 16,
    border: "none",
    borderRadius: 10,
    cursor: "pointer",
    marginBottom: 12,
  },
  error: {
    color: "#E84057",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  disclaimer: {
    textAlign: "center",
    color: COLORS.textDim,
    fontSize: 12,
    margin: 0,
  },
};
