import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { setAuthToken } from "../api";
import { COLORS } from "../utils/colors";
import { takeLinkReturnPath } from "../utils/linkReturn";

const PROVIDER_NAMES: Record<string, string> = { google: "Google", discord: "Discord" };

/** Why linking a Google/Discord account didn't work, in words. */
function linkErrorMessage(code: string, provider: string): string {
  const name = PROVIDER_NAMES[provider] ?? "That";
  switch (code) {
    case "taken":
      return `This ${name} account is already linked to a different account.`;
    case "provider_linked":
      return `Your account already has a different ${name} account linked.`;
    default:
      return "Couldn't link the account. Please try again.";
  }
}



export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { hash } = useLocation();
  const navigate = useNavigate();

  // The backend puts the token in the fragment (#token=…) so it never reaches server logs;
  // navigating away with replace also keeps it out of the browser history
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  const errorParam = searchParams.get("error");
  // Linking Google/Discord to an account that's already logged in: no token comes back
  const linked = searchParams.get("linked");
  const linkError = searchParams.get("link_error");

  useEffect(() => {
    if (token) {
      setAuthToken(token);
      navigate("/", { replace: true });
    } else if (linked) {
      const name = PROVIDER_NAMES[linked] ?? "Account";
      navigate(takeLinkReturnPath(), { replace: true, state: { toast: `${name} linked` } });
    }
  }, [token, linked, navigate]);

  const error = linkError
    ? linkErrorMessage(linkError, searchParams.get("provider") ?? "")
    : errorParam
      ? "Authentication failed. Please try again."
      : !token && !linked
        ? "No authentication token received."
        : null;

  if (error) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.errorText}>{error}</div>
          <button style={styles.button} onClick={() => navigate(linkError ? takeLinkReturnPath() : "/")}>
            {linkError ? "Back" : "Back to Home"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>{linked ? "Linking..." : "Logging in..."}</div>
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
