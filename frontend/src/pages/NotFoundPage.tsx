/**
 * @file NotFoundPage.tsx
 * @description Fallback page for unknown routes, offering a player search and links back into the app.
 * @module frontend.pages
 */
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { COLORS } from "../utils/colors";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

export default function NotFoundPage() {
  useDocumentTitle("Page not found");
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.code}>404</div>
        <h1 style={styles.title}>Page not found</h1>
        <p style={styles.text}>
          This page doesn't exist. Search for a player or head back home.
        </p>
        <div style={styles.search}>
          <SearchBar />
        </div>
        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={() => navigate("/")}>
            Back to Home
          </button>
          <button style={styles.secondaryBtn} onClick={() => navigate("/leaderboard")}>
            Leaderboard
          </button>
        </div>
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
    maxWidth: 720,
    width: "100%",
    textAlign: "center",
  },
  code: {
    fontSize: 56,
    fontWeight: 800,
    color: COLORS.gold,
    lineHeight: 1,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: COLORS.textPrimary,
    margin: "0 0 8px",
  },
  text: {
    fontSize: 15,
    color: COLORS.textSecondary,
    margin: "0 0 24px",
  },
  search: {
    marginBottom: 24,
  },
  actions: {
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  primaryBtn: {
    background: COLORS.gold,
    color: COLORS.pageBg,
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },
  secondaryBtn: {
    background: "transparent",
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
