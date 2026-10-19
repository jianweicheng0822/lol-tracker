/**
 * @file useAuth.ts
 * @description Shared login state that updates everywhere when the user logs in or out.
 * @module frontend.hooks
 */
import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT, TOKEN_KEY, getAuthToken, isTokenUsable, usernameFromToken } from "../api";

export type AuthState = {
  isLoggedIn: boolean;
  /** Username from the token, for display. */
  username: string | null;
};

function readAuth(): AuthState {
  const token = getAuthToken();
  if (token && !isTokenUsable(token, Date.now())) {
    // Expired or unreadable: forget it, so pages don't send it and the header offers "Log in"
    localStorage.removeItem(TOKEN_KEY);
    return { isLoggedIn: false, username: null };
  }
  return { isLoggedIn: !!token, username: token ? usernameFromToken(token) : null };
}

/**
 * Current login state. Re-renders when the token changes in this tab (setAuthToken fires
 * AUTH_CHANGE_EVENT) or in another tab (the browser's storage event).
 */
export function useAuth(): AuthState {
  const [auth, setAuth] = useState<AuthState>(readAuth);

  useEffect(() => {
    const sync = () => setAuth(readAuth());
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === null) sync();
    };
    window.addEventListener(AUTH_CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return auth;
}
