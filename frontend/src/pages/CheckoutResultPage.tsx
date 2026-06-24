import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { fetchTier } from "../api";
import { COLORS } from "../utils/colors";

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "done">("loading");

  useEffect(() => {
    // Re-fetch tier to confirm upgrade
    fetchTier()
      .then(() => setStatus("done"))
      .catch(() => setStatus("done"));
  }, []);

  useEffect(() => {
    if (status === "done") {
      const timer = setTimeout(() => navigate("/"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>&#10003;</div>
        <h1 style={styles.title}>Welcome to PRO!</h1>
        <p style={styles.text}>
          Your subscription is now active. You have access to AI coaching,
          100 match history, and unlimited requests.
        </p>
        <p style={styles.redirect}>Redirecting to home...</p>
        <button style={styles.btn} onClick={() => navigate("/")}>
          Go Home Now
        </button>
      </div>
    </div>
  );
}

export function CheckoutCancelPage() {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Checkout Cancelled</h1>
        <p style={styles.text}>
          No changes were made to your account. You can upgrade anytime.
        </p>
        <button style={styles.btn} onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    background: COLORS.pageBg,
    padding: 24,
  },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 16,
    padding: "48px 40px",
    maxWidth: 440,
    textAlign: "center",
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #D4A017, #F5D060)",
    color: "#1a1a1a",
    fontSize: 28,
    fontWeight: 700,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: 700,
    margin: "0 0 12px",
  },
  text: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 0 20px",
  },
  redirect: {
    color: COLORS.textDim,
    fontSize: 12,
    marginBottom: 16,
  },
  btn: {
    background: "rgba(255,255,255,0.08)",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 8,
    color: "#fff",
    padding: "10px 28px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
