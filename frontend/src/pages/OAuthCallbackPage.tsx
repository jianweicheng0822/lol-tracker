import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { setAuthToken } from "../api";
import { COLORS } from "../utils/colors";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();

  // The backend puts the token in the fragment (#token=…) so it never reaches server logs;
  // navigating away with replace also keeps it out of the browser history
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  const errorParam = searchParams.get("error");

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  const error = errorParam
    ? "Authentication failed. Please try again."
    : !token
      ? "No authentication token received."
      : null;

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorText}>{error}</div>
          <button style={styles.button} onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>Logging in...</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#0A1428",
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "40px 32px",
    textAlign: "center",
    color: COLORS.textPrimary,
    fontSize: 16,
  },
  errorText: {
    color: "#E84057",
    marginBottom: 16,
  },
  button: {
    padding: "10px 24px",
    borderRadius: 3,
    border: "none",
    background: "#C89B3C",
    color: "#0F0F0F",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
};
