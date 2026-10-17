/**
 * @file useBodyScrollLock.ts
 * @description Stops the page behind an open dialog from scrolling.
 * @module frontend.hooks
 */
import { useEffect } from "react";

// Dialogs can open on top of each other (e.g. upgrade -> login); only the last one to close unlocks
let lockCount = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/**
 * While the calling component is mounted, the page behind it can't scroll. Without this the
 * mouse wheel or a touch swipe over the dimmed backdrop scrolls the page, so after closing the
 * dialog the user is somewhere else. Padding replaces the hidden scrollbar so nothing shifts.
 */
export function useBodyScrollLock() {
  useEffect(() => {
    const body = document.body;
    if (lockCount === 0) {
      saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
    }
    lockCount++;
    return () => {
      lockCount--;
      if (lockCount === 0 && saved) {
        body.style.overflow = saved.overflow;
        body.style.paddingRight = saved.paddingRight;
        saved = null;
      }
    };
  }, []);
}
