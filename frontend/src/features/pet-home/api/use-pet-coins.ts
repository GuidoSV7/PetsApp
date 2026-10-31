"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPetsAppSession, getSessionEpoch } from "@/stores/auth-session";

/** Parent callbacks are independently fenced, even after an old stage unmounts. */
export function usePetCoins(ownerId: string | undefined, epoch: number) {
  const [value, setValue] = useState<{ ownerId: string | undefined; epoch: number; coins: number } | null>(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const onCoinsChange = useCallback((coins: number) => {
    if (mounted.current && getSessionEpoch() === epoch && getPetsAppSession()?.user.id === ownerId) setValue({ ownerId, epoch, coins });
  }, [ownerId, epoch]);
  return { coins: value?.ownerId === ownerId && value?.epoch === epoch ? value.coins : undefined, onCoinsChange, clearCoins: () => setValue(null) };
}
