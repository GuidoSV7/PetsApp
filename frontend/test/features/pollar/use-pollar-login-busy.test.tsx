/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import type { AuthState } from "@pollar/core";
import { WalletType } from "@pollar/core";

const { onAuthStateChange, listeners } = vi.hoisted(() => {
  const listeners = new Set<(state: AuthState) => void>();
  const onAuthStateChange = vi.fn((cb: (state: AuthState) => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  });
  return { onAuthStateChange, listeners };
});

vi.mock("@pollar/react", () => ({
  usePollar: () => ({
    getClient: () => ({ onAuthStateChange }),
  }),
}));

import {
  POLLAR_LOGIN_BUSY_TIMEOUT_MS,
  usePollarLoginBusy,
} from "@/features/pollar/usePollarLoginBusy";

function emit(state: AuthState) {
  for (const listener of listeners) listener(state);
}

describe("usePollarLoginBusy", () => {
  beforeEach(() => {
    listeners.clear();
    onAuthStateChange.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("clears busy after timeout when Freighter never reaches idle/error", async () => {
    const { result } = renderHook(() => usePollarLoginBusy());

    await act(async () => {
      emit({
        step: "connecting_wallet",
        walletType: WalletType.FREIGHTER,
      });
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLAR_LOGIN_BUSY_TIMEOUT_MS);
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.error).toMatch(/canceló|tardó|intentá/i);
  });

  it("cancelBusy clears a stuck connecting state", async () => {
    const { result } = renderHook(() => usePollarLoginBusy());

    await act(async () => {
      emit({
        step: "connecting_wallet",
        walletType: WalletType.FREIGHTER,
      });
    });
    expect(result.current.busy).toBe(true);

    await act(async () => {
      result.current.cancelBusy();
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.error).toMatch(/canceló|cancelaste/i);
  });

  it("does not timeout after authenticated clears busy", async () => {
    const { result } = renderHook(() => usePollarLoginBusy());

    await act(async () => {
      emit({
        step: "connecting_wallet",
        walletType: WalletType.FREIGHTER,
      });
    });
    await act(async () => {
      emit({
        step: "authenticated",
        session: {} as never,
        verified: true,
      });
    });
    expect(result.current.busy).toBe(false);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLLAR_LOGIN_BUSY_TIMEOUT_MS);
    });

    expect(result.current.busy).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
