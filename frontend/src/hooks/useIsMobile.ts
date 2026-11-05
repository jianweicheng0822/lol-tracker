/**
 * @file useIsMobile.ts
 * @description Responsive breakpoint hook that tracks viewport width changes.
 * @module frontend.hooks
 */
import { useState, useEffect } from "react";

/**
 * Below this width the player page puts the sidebar above the match list instead of beside it.
 * Beside it, the match column would be too narrow for an expanded scoreboard (tablets, small laptops).
 */
export const STACK_BREAKPOINT = 1100;

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);

  return isMobile;
}
