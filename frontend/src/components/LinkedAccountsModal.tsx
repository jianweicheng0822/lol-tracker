/**
 * @file LinkedAccountsModal.tsx
 * @description Lets a logged-in user see how they can sign in and link Google/Discord, so a
 * forgotten password doesn't lock them out (we don't collect email, so there's no reset link).
 * @module frontend.components
 */
import { useEffect, useState } from "react";
import { fetchLinkedAccounts, fetchOAuthProviders, startOAuthLink, type OAuthProvider } from "../api";
import { COLORS } from "../utils/colors";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { GoogleIcon, DiscordIcon } from "./ProviderIcons";
import { saveLinkReturnPath } from "../utils/linkReturn";

type Props = {
  onClose: () => void;
};

const PROVIDERS: { id: OAuthProvider; label: string; icon: React.ReactNode }[] = [
  { id: "google", label: "Google", icon: <GoogleIcon /> },
  { id: "discord", label: "Discord", icon: <span style={{ color: "#5865F2", display: "flex" }}><DiscordIcon /></span> },
];

export default function LinkedAccountsModal({ onClose }: Props) {
  useBodyScrollLock();
  const [accounts, setAccounts] = useState<{ hasPassword: boolean; linked: OAuthProvider[] } | null>(null);
  const [available, setAvailable] = useState<Record<OAuthProvider, boolean>>({ google: false, discord: false });
  const [linking, setLinking] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    fetchLinkedAccounts().then(setAccounts).catch(() => setError("Couldn't load your accounts. Please try again."));
    fetchOAuthProviders().then(setAvailable).catch(() => {});
  }, []);

  async function link(provider: OAuthProvider) {
    setError("");
    setLinking(provider);
    try {
      const url = await startOAuthLink(provider);
      saveLinkReturnPath(window.location.pathname + window.location.search);
      window.location.assign(url);
    } catch {
      setLinking(null);
      setError("Couldn't start linking. Please try again.");
    }
  }

  return (
    <div onClick={onClose} style={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="linked-accounts-title"
        onClick={(e) => e.stopPropagation()}
        style={styles.dialog}
      >
        <h2 id="linked-accounts-title" style={styles.title}>Linked accounts</h2>

        {!accounts && !error && <div style={styles.muted}>Loading...</div>}

        {accounts && (
          <div style={{ marginTop: 12 }}>
            <div style={styles.row}>
              <span style={styles.who}>Username &amp; password</span>
              <span style={accounts.hasPassword ? styles.ok : styles.muted}>
                {accounts.hasPassword ? "In use" : "Not set"}
              </span>
            </div>
            {PROVIDERS.map(({ id, label, icon }) => {
              const isLinked = accounts.linked.includes(id);
              // Nothing to offer for a provider the server isn't set up for
              if (!isLinked && !available[id]) return null;
              return (
                <div key={id} style={styles.row}>
                  <span style={styles.who}>{icon}{label}</span>
                  {isLinked ? (
                    <span style={styles.ok}>Linked ✓</span>
                  ) : (
                    <button
                      type="button"
                      style={styles.linkBtn}
                      disabled={linking !== null}
                      onClick={() => link(id)}
                      aria-label={`Link ${label}`}
                    >
                      {linking === id ? "Opening..." : "Link"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error && <div role="alert" style={styles.error}>{error}</div>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dialog: {
    width: 380,
    maxWidth: "calc(100vw - 32px)",
    boxSizing: "border-box",
    background: COLORS.surface,
    borderRadius: 4,
    border: "1px solid rgba(255,255,255,0.08)",
    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
    padding: "24px",
  },
  title: { margin: 0, fontSize: 18, fontWeight: 700, color: COLORS.textPrimary },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: `1px solid ${COLORS.divider}`,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  who: { display: "flex", alignItems: "center", gap: 10 },
  ok: { fontSize: 13, color: COLORS.teal },
  muted: { fontSize: 13, color: COLORS.textDim },
  linkBtn: {
    padding: "6px 14px",
    borderRadius: 3,
    border: "1px solid rgba(200,155,60,0.45)",
    background: "transparent",
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  error: { marginTop: 12, fontSize: 13, color: COLORS.loss },
};
