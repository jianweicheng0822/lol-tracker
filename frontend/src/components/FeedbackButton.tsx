/**
 * @file FeedbackButton.tsx
 * @description Floating "Feedback" button shown on every page, and the form it opens.
 * @module frontend.components
 */
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { submitFeedback, type FeedbackType } from "../api";
import { COLORS } from "../utils/colors";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import Toast from "./Toast";

// Must match the backend's checks in FeedbackRequest
export const MESSAGE_MIN = 5;
export const MESSAGE_MAX = 1000;

const TYPES: { value: FeedbackType; label: string }[] = [
  { value: "bug", label: "🐞 Bug" },
  { value: "idea", label: "💡 Idea" },
  { value: "other", label: "💬 Other" },
];

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      <button className="feedback-fab" style={styles.fab} onClick={() => setOpen(true)} aria-label="Send feedback">
        <ChatIcon />
        <span className="feedback-fab__label">Feedback</span>
      </button>
      {open && (
        <FeedbackModal
          onClose={() => setOpen(false)}
          onSent={() => {
            setOpen(false);
            setToast("Thanks! Your feedback was sent.");
          }}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

export function FeedbackModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  useBodyScrollLock();
  const { pathname, search } = useLocation();
  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const tooShort = message.trim().length < MESSAGE_MIN;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tooShort || sending) return;
    setError("");
    setSending(true);
    try {
      await submitFeedback({ type, message: message.trim(), email: email.trim(), pageUrl: pathname + search, website });
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div onClick={onClose} style={styles.backdrop}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        onClick={(e) => e.stopPropagation()}
        style={styles.modal}
      >
        <button type="button" onClick={onClose} style={styles.close} aria-label="Close">×</button>
        <h2 id="feedback-title" style={styles.title}>Send Feedback</h2>
        <div style={styles.subtitle}>Found a bug or have an idea? Tell us.</div>

        <form onSubmit={handleSubmit}>
          <div style={styles.chips} role="radiogroup" aria-label="Feedback type">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={type === t.value}
                onClick={() => setType(t.value)}
                style={{ ...styles.chip, ...(type === t.value ? styles.chipActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <textarea
            className="gold-input"
            aria-label="Your feedback"
            value={message}
            maxLength={MESSAGE_MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, or what would you like to see?"
            style={{ ...styles.input, height: 120, resize: "vertical" }}
            autoFocus
          />
          <div style={styles.count}>{message.length} / {MESSAGE_MAX}</div>

          <input
            className="gold-input"
            type="email"
            aria-label="Email (optional)"
            value={email}
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional, if you want a reply)"
            style={styles.input}
          />

          {/* Honeypot: off-screen and skipped by keyboard and screen readers, so only bots fill it */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            style={styles.honeypot}
          />

          <div style={styles.hint}>We also include the page you're on to help track down bugs.</div>

          {error && <div role="alert" style={styles.error}>{error}</div>}

          <button
            type="submit"
            disabled={tooShort || sending}
            style={{ ...styles.send, ...(tooShort || sending ? styles.sendDisabled : {}) }}
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fab: {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 900,
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 16px",
    borderRadius: 999,
    background: COLORS.surface,
    border: "1px solid rgba(200,155,60,0.6)",
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  },
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modal: {
    position: "relative",
    width: "100%",
    maxWidth: 440,
    maxHeight: "100%",
    overflowY: "auto",
    background: COLORS.surface,
    border: "1px solid rgba(255,255,255,0.08)",
    borderTop: `2px solid ${COLORS.gold}`,
    borderRadius: 4,
    boxShadow: "0 24px 48px rgba(0,0,0,0.5)",
    padding: "24px",
  },
  close: {
    position: "absolute",
    top: 8,
    right: 12,
    background: "none",
    border: "none",
    color: COLORS.textDim,
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    padding: 4,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.textPrimary,
    textAlign: "center",
    textTransform: "uppercase",
  },
  subtitle: { textAlign: "center", color: COLORS.textDim, fontSize: 13, marginTop: 6 },
  chips: { display: "flex", gap: 8, marginTop: 18 },
  chip: {
    flex: 1,
    padding: 8,
    borderRadius: 3,
    border: "1px solid rgba(255,255,255,0.12)",
    background: COLORS.pageBg,
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  chipActive: {
    borderColor: COLORS.gold,
    color: COLORS.gold,
    background: "rgba(200,155,60,0.1)",
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: 12,
    padding: "10px 12px",
    borderRadius: 3,
    border: "1px solid rgba(255,255,255,0.1)",
    background: COLORS.pageBg,
    color: COLORS.textPrimary,
    fontSize: 14,
    outline: "none",
  },
  count: { textAlign: "right", fontSize: 12, color: COLORS.textDim, marginTop: 4 },
  honeypot: { position: "absolute", left: -10000, width: 1, height: 1, opacity: 0 },
  hint: { fontSize: 12, color: COLORS.textDim, marginTop: 8 },
  error: { color: COLORS.loss, fontSize: 13, marginTop: 10 },
  send: {
    width: "100%",
    marginTop: 16,
    padding: 11,
    border: "none",
    borderRadius: 3,
    background: "#785A28",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  sendDisabled: { background: "#1E2328", color: COLORS.textDim, cursor: "default" },
};
