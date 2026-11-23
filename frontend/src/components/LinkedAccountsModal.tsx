/**
 * @file LinkedAccountsModal.tsx
 * @description The logged-in user's account: change the username (Google/Discord sign-ups get one
 * made from their profile name, often just "google"), see how they can sign in, and link
 * Google/Discord so a forgotten password doesn't lock them out (no email, so no reset link).
 * @module frontend.components
 */
import { useEffect, useState } from "react";
import { changeUsername, fetchLinkedAccounts, fetchOAuthProviders, startOAuthLink, type OAuthProvider } from "../api";
import { useAuth } from "../hooks/useAuth";
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
  const { username } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Escape cancels an edit first, then closes
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editing) setEditing(false);
      else onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, editing]);

  useEffect(() => {
    fetchLinkedAccounts().then(setAccounts).catch(() => setError("Couldn't load your accounts. Please try again."));
    fetchOAuthProviders().then(setAvailable).catch(() => {});
  }, []);

  function startEdit() {
    setDraft(username ?? "");
    setNameError("");
    setSaved(false);
    setEditing(true);
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    const name = draft.trim();
    if (!name) { setNameError("Username is required"); return; }
    if (name === username) { setEditing(false); return; }
    setSaving(true);
    setNameError("");
    try {
      await changeUsername(name);
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setNameError(err instanceof Error && err.message ? err.message : "Couldn't change the username. Please try again.");
    } finally {
      setSaving(false);
    }
  }

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
        aria-labelledby="account-title"
        onClick={(e) => e.stopPropagation()}
        style={styles.dialog}
      >
        <h2 id="account-title" style={styles.title}>Account</h2>

        {editing ? (
          <form onSubmit={saveName} style={{ ...styles.row, gap: 8, borderBottom: "none", paddingBottom: 4 }}>
            <input
              autoFocus
              aria-label="New username"
              value={draft}
              maxLength={50}
              onChange={(e) => setDraft(e.target.value)}
              style={styles.input}
            />
            <button type="submit" style={styles.saveBtn} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
            <button type="button" style={styles.cancelBtn} onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
          </form>
        ) : (
          <div style={{ ...styles.row, marginTop: 12 }}>
            <span style={styles.who}>
              <span style={styles.label}>Username</span>
              <span style={styles.name}>{username}</span>
            </span>
            <button type="button" style={styles.linkBtn} onClick={startEdit} aria-label="Change username">
              Change
            </button>
          </div>
        )}
        {editing && nameError && <div role="alert" style={{ ...styles.error, marginTop: 4 }}>{nameError}</div>}
        {editing && <div style={{ ...styles.muted, padding: "4px 0 12px", borderBottom: `1px solid ${COLORS.divider}` }}>You'll log in with the new name.</div>}
        {saved && !editing && <div role="status" style={{ ...styles.ok, paddingTop: 8 }}>Username changed</div>}

        {!accounts && !error && <div style={styles.muted}>Loading...</div>}

        {accounts && (
          <div style={{ marginTop: 4 }}>
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
  who: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  label: { fontSize: 13, color: COLORS.textDim },
  name: { fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  input: {
    flex: 1,
    minWidth: 0,
    padding: "7px 10px",
    borderRadius: 3,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(0,0,0,0.25)",
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  saveBtn: {
    padding: "7px 14px",
    borderRadius: 3,
    border: "none",
    background: COLORS.gold,
    color: "#1a1206",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelBtn: {
    padding: "7px 8px",
    border: "none",
    background: "transparent",
    color: COLORS.textDim,
    fontSize: 13,
    cursor: "pointer",
  },
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
