/**
 * @file AdminFeedbackPage.tsx
 * @description Admin-only list of feedback sent from the site's feedback form.
 * @module frontend.pages
 */
import { useEffect, useState } from "react";
import {
  AuthRequiredError,
  NotAdminError,
  fetchAdminFeedback,
  setFeedbackResolved,
  type FeedbackEntry,
  type FeedbackType,
} from "../api";
import { COLORS } from "../utils/colors";
import AppHeader from "../components/AppHeader";
import NotFoundPage from "./NotFoundPage";
import { useAuth } from "../hooks/useAuth";
import { useDocumentTitle } from "../hooks/useDocumentTitle";

type Filter = "open" | "resolved" | "all";
type State =
  | { kind: "loading" }
  | { kind: "notAdmin" }
  | { kind: "error"; message: string }
  | { kind: "ready"; entries: FeedbackEntry[] };

const TYPE_LABELS: Record<FeedbackType, string> = { bug: "🐞 Bug", idea: "💡 Idea", other: "💬 Other" };
const TYPE_COLORS: Record<FeedbackType, string> = { bug: COLORS.loss, idea: COLORS.gold, other: COLORS.teal };

export default function AdminFeedbackPage() {
  const { isLoggedIn } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  // Only name the page once we know it's an admin looking; everyone else gets the 404 page's title
  useDocumentTitle(state.kind === "ready" || state.kind === "error" ? "Feedback" : null);
  const [filter, setFilter] = useState<Filter>("open");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    let active = true;
    // Runs again on login/logout, e.g. logging out from the header turns this into the 404 page
    fetchAdminFeedback()
      .then((entries) => active && setState({ kind: "ready", entries }))
      .catch((err) => {
        if (!active) return;
        if (err instanceof NotAdminError || err instanceof AuthRequiredError) setState({ kind: "notAdmin" });
        else setState({ kind: "error", message: err instanceof Error ? err.message : "Could not load feedback." });
      });
    return () => { active = false; };
  }, [isLoggedIn]);

  // Anyone who isn't an admin, logged in or not, sees the normal 404: the page doesn't advertise itself
  if (state.kind === "notAdmin") return <NotFoundPage />;
  // Nothing page-specific until the server confirms an admin is asking
  if (state.kind === "loading") return <div style={styles.page} />;

  async function toggle(entry: FeedbackEntry) {
    setBusyId(entry.id);
    setActionError("");
    try {
      const updated = await setFeedbackResolved(entry.id, !entry.resolved);
      setState((s) => s.kind === "ready"
        ? { ...s, entries: s.entries.map((e) => (e.id === updated.id ? updated : e)) }
        : s);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update.");
    } finally {
      setBusyId(null);
    }
  }

  const entries = state.kind === "ready" ? state.entries : [];
  const counts = {
    open: entries.filter((e) => !e.resolved).length,
    resolved: entries.filter((e) => e.resolved).length,
    all: entries.length,
  };
  const shown = entries.filter((e) => filter === "all" || (filter === "resolved") === e.resolved);

  return (
    <div style={styles.page}>
      <AppHeader />
      <div style={styles.body}>
        <div style={styles.inner}>
          <h1 style={styles.title}>Feedback</h1>

          {state.kind === "error" && <p role="alert" style={{ color: COLORS.loss }}>{state.message}</p>}

          {state.kind === "ready" && (
            <>
              <div style={styles.tabs} role="tablist">
                {(["open", "resolved", "all"] as Filter[]).map((f) => (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={filter === f}
                    onClick={() => setFilter(f)}
                    style={{ ...styles.tab, ...(filter === f ? styles.tabActive : {}) }}
                  >
                    {f[0].toUpperCase() + f.slice(1)} ({counts[f]})
                  </button>
                ))}
              </div>

              {actionError && <p role="alert" style={{ color: COLORS.loss, fontSize: 13 }}>{actionError}</p>}

              {shown.length === 0 && (
                <p style={styles.muted}>{filter === "open" ? "Nothing open. All caught up!" : "No feedback here yet."}</p>
              )}

              <div style={styles.list}>
                {shown.map((e) => (
                  <article key={e.id} style={{ ...styles.card, opacity: e.resolved ? 0.6 : 1 }}>
                    <div style={styles.cardTop}>
                      <span style={{ ...styles.badge, color: TYPE_COLORS[e.type], borderColor: TYPE_COLORS[e.type] }}>
                        {TYPE_LABELS[e.type] ?? e.type}
                      </span>
                      <time dateTime={e.createdAt} style={styles.time}>{new Date(e.createdAt).toLocaleString()}</time>
                      <button
                        style={e.resolved ? styles.secondaryBtn : styles.primaryBtn}
                        disabled={busyId === e.id}
                        onClick={() => toggle(e)}
                      >
                        {e.resolved ? "Reopen" : "Mark resolved"}
                      </button>
                    </div>
                    <p style={styles.message}>{e.message}</p>
                    <div style={styles.meta}>
                      <span>From: {e.username ?? "anonymous"}</span>
                      {e.email && <span>Email: <a href={`mailto:${e.email}`} style={styles.link}>{e.email}</a></span>}
                      {e.pageUrl && <span>Page: <a href={e.pageUrl} style={styles.link}>{e.pageUrl}</a></span>}
                    </div>
                    {e.userAgent && <div style={styles.ua} title={e.userAgent}>{e.userAgent}</div>}
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", color: COLORS.textPrimary },
  body: { padding: "24px 16px 80px", display: "flex", justifyContent: "center" },
  inner: { width: "100%", maxWidth: 900 },
  title: { fontSize: 28, fontWeight: 700, margin: "0 0 20px" },
  muted: { color: COLORS.textTertiary, fontSize: 14, margin: "8px 0 12px" },
  tabs: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tab: {
    padding: "6px 14px",
    borderRadius: 3,
    border: `1px solid ${COLORS.cardBorder}`,
    background: "transparent",
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: { borderColor: COLORS.gold, color: COLORS.gold, background: "rgba(200,155,60,0.1)" },
  list: { display: "flex", flexDirection: "column", gap: 12 },
  card: {
    background: COLORS.cardBg,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 6,
    padding: 16,
  },
  cardTop: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  badge: { fontSize: 12, fontWeight: 700, border: "1px solid", borderRadius: 3, padding: "2px 8px" },
  time: { fontSize: 12, color: COLORS.textDim, marginRight: "auto" },
  message: { margin: "12px 0", fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowWrap: "anywhere" },
  meta: { display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 12, color: COLORS.textTertiary },
  link: { color: COLORS.gold, overflowWrap: "anywhere" },
  ua: {
    marginTop: 6,
    fontSize: 11,
    color: COLORS.textDim,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  primaryBtn: {
    padding: "6px 12px",
    border: "none",
    borderRadius: 3,
    background: "#785A28",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    padding: "6px 12px",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 3,
    background: "transparent",
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
  },
};
