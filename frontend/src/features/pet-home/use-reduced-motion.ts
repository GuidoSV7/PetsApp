"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const serverSnapshot = () => false;

/** Subscribe once per mounted query source; never poll during animation frames. */
export function useReducedMotion(): boolean {
  const media = useMemo(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(QUERY) : null, []);
  const subscribe = useCallback((notify: () => void) => {
    media?.addEventListener("change", notify);
    return () => media?.removeEventListener("change", notify);
  }, [media]);
  const snapshot = useCallback(() => media?.matches ?? false, [media]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
