import { useState, useEffect } from "react";
import { login, register, getOAuthUrl, fetchOAuthProviders } from "../api";
import { COLORS } from "../utils/colors";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { GoogleIcon, DiscordIcon } from "./ProviderIcons";

type Props = {
  onSuccess: () => void;
  onClose: () => void;
};

// Must match the backend's checks in AuthController.register
const PASSWORD_MIN = 8;
/** BCrypt's limit on the backend; letters outside English take 2-4 bytes each. */
const PASSWORD_MAX_BYTES = 72;
const USERNAME_MAX = 50;

export default function AuthModal({ onSuccess, onClose }: Props) {
  useBodyScrollLock();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<{ google: boolean; discord: boolean }>({ google: false, discord: false });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    fetchOAuthProviders().then(setProviders).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    // Same limits the backend enforces, checked here so people don't have to submit to find out
    if (mode === "register") {
      if (username.trim().length > USERNAME_MAX) {
        setError(`Username can be at most ${USERNAME_MAX} characters.`);
        return;
      }
      if (password.length < PASSWORD_MIN) {
        setError(`Password must be at least ${PASSWORD_MIN} characters.`);
        return;
      }
      if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
        setError("Password is too long: at most 72 characters (letters outside English count as 2 to 4).");
        return;
      }
    }
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), password);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const hasOAuth = providers.google || providers.discord;
  const submitDisabled = loading || !username.trim() || !password.trim();
  const oauthVerb = mode === "register" ? "Sign up" : "Continue";

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 380,
          background: "#0A1428",
          borderRadius: 4,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          padding: "28px 24px",
        }}
      >
        {/* Two tabs so it's obvious at a glance whether you're logging in or signing up */}
        <div role="tablist" aria-label="Log in or create an account" style={tabListStyle}>
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                ...tabStyle,
                color: mode === m ? COLORS.textPrimary : COLORS.textDim,
                borderBottomColor: mode === m ? COLORS.gold : "transparent",
              }}
            >
              {m === "login" ? "Log In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Google/Discord come first: there's no password to forget, and username accounts can't be
            recovered (we don't collect email). Username + password stays available below. */}
        {hasOAuth && (
          <>
            <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              {providers.google && (
                <button
                  type="button"
                  onClick={() => { window.location.href = getOAuthUrl("google"); }}
                  style={oauthBtnStyle}
                >
                  <GoogleIcon />
                  {oauthVerb} with Google
                </button>
              )}
              {providers.discord && (
                <button
                  type="button"
                  onClick={() => { window.location.href = getOAuthUrl("discord"); }}
                  style={{ ...oauthBtnStyle, background: "#5865F2", color: "#fff", border: "none" }}
                >
                  <DiscordIcon />
                  {oauthVerb} with Discord
                </button>
              )}
            </div>

            <div style={dividerStyle}>
              <span style={dividerLineStyle} />
              <span style={{ color: COLORS.textDim, fontSize: 12, padding: "0 12px" }}>or</span>
              <span style={dividerLineStyle} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: hasOAuth ? 0 : 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            name="username"
            autoComplete="username"
            autoFocus
            style={inputStyle}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === "register" ? `Password (${PASSWORD_MIN}+ characters)` : "Password"}
            aria-label="Password"
            type="password"
            name="password"
            // Lets password managers fill a saved password on login, or offer to generate/save one on sign-up
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            aria-describedby={mode === "register" ? "recovery-note" : undefined}
            style={inputStyle}
          />

          {/* We don't collect email, so there's no reset link to send */}
          {mode === "register" && (
            <div id="recovery-note" role="note" style={{ fontSize: 12, color: "#E8A87C", marginTop: -4 }}>
              Forgotten passwords can't be reset.
            </div>
          )}

          {error && (
            <div style={{ color: "#E84057", fontSize: 13, padding: "6px 0" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitDisabled}
            style={{
              padding: "10px 0",
              borderRadius: 3,
              // With Google/Discord above, this is the secondary option: outlined instead of solid gold
              border: hasOAuth && !submitDisabled ? "1px solid rgba(200,155,60,0.45)" : "none",
              background: submitDisabled ? "#1E2328" : hasOAuth ? "transparent" : "#785A28",
              color: submitDisabled ? COLORS.textDim : hasOAuth ? COLORS.textSecondary : "#fff",
              cursor: submitDisabled ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create account"}
          </button>
        </form>

      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 3,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#010A13",
  color: COLORS.textPrimary,
  fontSize: 14,
  outline: "none",
};

const oauthBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 10,
  padding: "10px 0",
  borderRadius: 3,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "#fff",
  color: "#333",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const tabListStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  margin: "-8px -4px 0",
};

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 0 12px",
  marginBottom: -1,
  background: "none",
  border: "none",
  borderBottom: "2px solid transparent",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  margin: "20px 0 16px",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "rgba(255,255,255,0.08)",
};
