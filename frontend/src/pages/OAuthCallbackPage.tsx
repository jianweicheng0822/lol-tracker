import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAuthToken } from "../api";
import { COLORS } from "../utils/colors";

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const errorParam = searchParams.get("error");

    if (token) {
      setAuthToken(token);
      navigate("/", { replace: true });
    } else if (errorParam) {
      setError("Authentication failed. Please try again.");
    } else {
      setError("No authentication token received.");
    }
  }, [searchParams, navigate]);

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
    background: "#121210",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    background: "#111110",
    borderRadius: 10,
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
    borderRadius: 6,
    border: "none",
    background: "#D4A017",
    color: "#0F0F0F",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 14,
  },
};
