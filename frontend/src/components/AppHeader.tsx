/**
 * @file AppHeader.tsx
 * @description Top bar shared by every page: logo, player search, main navigation and the account menu.
 * @module frontend.components
 */
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SearchBar from "./SearchBar";
import AuthModal from "./AuthModal";
import Toast from "./Toast";
import FeedbackButton from "./FeedbackButton";
import { fetchAdminStatus, setAuthToken } from "../api";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "../utils/colors";
import { PAGE_MAX_WIDTH, PAGE_GUTTER } from "../utils/layout";
import type { Region } from "../types";

type Props = {
  /** Show the compact search box. Off on the home page, which has its own big search. */
  showSearch?: boolean;
  /** Pre-fill the search box (e.g. with the player whose page this is). */
  searchDefaults?: { region?: Region; gameName?: string; tag?: string };
  /** Show the "LoL Tracker" home link. Off on the home page, whose big title already says it. */
  showLogo?: boolean;
  /** No background or border, so the page behind shows through (the home page hero). */
  transparent?: boolean;
};

const NAV_LINKS = [
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/multi-search", label: "Multi-Search" },
];

export default function AppHeader({ showSearch = true, showLogo = true, searchDefaults, transparent = false }: Props) {
  const { pathname } = useLocation();
  const { isLoggedIn, username } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Which username the server said is an admin; compared to the current one so a stale answer never shows
  const [adminFor, setAdminFor] = useState<string | null>(null);
  const isAdmin = isLoggedIn && username !== null && adminFor === username;

  useEffect(() => {
    if (!isLoggedIn || !username) return;
    let active = true;
    fetchAdminStatus().then((admin) => { if (active) setAdminFor(admin ? username : null); });
    return () => { active = false; };
  }, [isLoggedIn, username]);

  // Close the account menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const logOut = () => {
    setMenuOpen(false);
    setAuthToken(null);
    setToastMsg("Logged out successfully");
  };

  return (
    <header
      className={`app-header${searchOpen ? " app-header--search-open" : ""}`}
      style={transparent ? { ...styles.bar, ...styles.barTransparent } : styles.bar}
    >
      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {showLogo && <Link to="/" className="app-header__logo" style={styles.logo}>LoL Tracker</Link>}

      {/* Phones only (index.css): the search box takes two rows, so it stays folded until asked for */}
      {showSearch && (
        <button
          className="app-header__search-toggle"
          style={styles.searchToggle}
          onClick={() => setSearchOpen((o) => !o)}
          aria-expanded={searchOpen}
          aria-controls="header-search"
          aria-label={searchOpen ? "Hide player search" : "Search for a player"}
        >
          <SearchIcon />
        </button>
      )}

      {showSearch && (
        <div id="header-search" className="app-header__search" style={styles.search}>
          <SearchBar
            // Re-mount when the player changes so the box shows the current player
            key={`${searchDefaults?.region}|${searchDefaults?.gameName}|${searchDefaults?.tag}`}
            compact
            initialRegion={searchDefaults?.region}
            initialGameName={searchDefaults?.gameName}
            initialTag={searchDefaults?.tag}
          />
        </div>
      )}

      <nav className="app-header__nav" style={{ ...styles.nav, marginLeft: showSearch ? 0 : "auto" }}>
        {NAV_LINKS.map((link) => {
          const active = pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className="app-header__link"
              aria-current={active ? "page" : undefined}
              style={{ ...styles.navLink, ...(active ? styles.navLinkActive : {}) }}
            >
              {link.label}
            </Link>
          );
        })}

        {isLoggedIn ? (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button
              style={styles.accountBtn}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={username ? `Signed in as ${username}` : "Account"}
            >
              <span style={styles.avatar} aria-hidden="true">
                {(username ?? "?").charAt(0).toUpperCase()}
              </span>
              <span className="app-header__username" style={styles.username}>{username ?? "Account"}</span>
              <span aria-hidden="true" style={{ fontSize: 10, opacity: 0.7 }}>{"▾"}</span>
            </button>
            {menuOpen && (
              <div role="menu" style={styles.menu}>
                <div style={styles.menuHeader}>
                  Signed in as
                  <div style={styles.menuUser}>{username ?? "your account"}</div>
                </div>
                {isAdmin && (
                  <Link role="menuitem" to="/admin/feedback" style={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    Feedback inbox
                  </Link>
                )}
                {isAdmin && (
                  <Link role="menuitem" to="/admin/metrics" style={styles.menuItem} onClick={() => setMenuOpen(false)}>
                    Usage metrics
                  </Link>
                )}
                <button role="menuitem" style={styles.menuItem} onClick={logOut}>
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button style={styles.loginBtn} onClick={() => setShowAuthModal(true)}>
            Log in
          </button>
        )}

        {/* Wider screens only; phones keep the floating button (index.css) */}
        <FeedbackButton variant="header" />
      </nav>

      {showAuthModal && (
        <AuthModal
          onSuccess={() => setToastMsg("Logged in successfully")}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px 20px",
    // Line the logo and buttons up with the page content on wide screens instead of the screen edges
    padding: `12px max(24px, calc((100% - ${PAGE_MAX_WIDTH}px) / 2 + ${PAGE_GUTTER}px))`,
    background: "rgba(10,20,40,0.92)",
    // Thin gold rule under the header, like the League client
    borderBottom: "1px solid rgba(200,155,60,0.25)",
  },
  barTransparent: {
    background: "transparent",
    borderBottom: "1px solid transparent",
  },
  logo: {
    fontWeight: 800,
    fontSize: 18,
    whiteSpace: "nowrap",
    color: COLORS.textPrimary,
    textDecoration: "none",
    flexShrink: 0,
    // 44px-tall touch target; the negative margins keep the layout and the text's look unchanged
    display: "inline-flex",
    alignItems: "center",
    minHeight: 44,
    padding: "0 6px",
    margin: "-12px -6px",
  },
  search: {
    // Takes the free space; wraps onto its own line on narrow screens
    flex: "1 1 360px",
    minWidth: 0,
  },
  searchToggle: {
    background: "transparent",
    color: COLORS.textSecondary,
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 3,
    width: 36,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  navLink: {
    color: COLORS.gold,
    border: `1px solid ${COLORS.gold}40`,
    borderRadius: 3,
    padding: "6px 12px",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    whiteSpace: "nowrap",
  },
  navLinkActive: {
    background: `${COLORS.gold}20`,
    borderColor: COLORS.gold,
  },
  loginBtn: {
    background: "rgba(10,200,185,0.08)",
    color: "#0AC8B9",
    border: "1px solid rgba(10,200,185,0.4)",
    borderRadius: 3,
    padding: "6px 14px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  accountBtn: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "transparent",
    color: COLORS.textPrimary,
    border: "1px solid #3C3C41",
    borderRadius: 18,
    padding: "4px 10px 4px 4px",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: `${COLORS.gold}30`,
    color: COLORS.gold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 800,
  },
  username: {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  menu: {
    position: "absolute",
    right: 0,
    top: "calc(100% + 6px)",
    minWidth: 200,
    background: "#0A1428",
    border: `1px solid ${COLORS.cardBorder}`,
    borderRadius: 4,
    boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
    padding: 6,
    zIndex: 900,
  },
  menuHeader: {
    padding: "8px 10px 10px",
    fontSize: 12,
    color: COLORS.textDim,
    borderBottom: `1px solid ${COLORS.divider}`,
    marginBottom: 4,
  },
  menuUser: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: 700,
    color: COLORS.textPrimary,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  menuItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "transparent",
    border: "none",
    color: COLORS.textSecondary,
    padding: "8px 10px",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 13,
    textDecoration: "none",
  },
};
