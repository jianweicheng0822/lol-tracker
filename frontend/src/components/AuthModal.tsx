import { useState, useEffect } from "react";
import { login, register } from "../api";

type Props = {
  onSuccess: () => void;
  onClose: () => void;
};

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username, password);
      } else {
        await register(username, password);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

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
          background: "#161b22",
          borderRadius: 10,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
          padding: "28px 24px",
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e6edf3", textAlign: "center" }}>
          {mode === "login" ? "Log In" : "Create Account"}
        </h2>

        {/* Toggle between login/register */}
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 13, color: "#484f58" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              color: "#34d399",
              cursor: "pointer",
              fontSize: 13,
              textDecoration: "underline",
              padding: 0,
            }}
          >
            {mode === "login" ? "Register" : "Log in"}
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoFocus
            style={inputStyle}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            style={inputStyle}
          />

          {error && (
            <div style={{ color: "#f87171", fontSize: 13, padding: "6px 0" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              padding: "10px 0",
              borderRadius: 6,
              border: "none",
              background: loading || !username.trim() || !password.trim() ? "#21262d" : "#059669",
              color: loading || !username.trim() || !password.trim() ? "#484f58" : "#fff",
              cursor: loading || !username.trim() || !password.trim() ? "not-allowed" : "pointer",
              fontSize: 14,
              fontWeight: 600,
              marginTop: 4,
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Log In" : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 6,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "#0d1117",
  color: "#e6edf3",
  fontSize: 14,
  outline: "none",
};
