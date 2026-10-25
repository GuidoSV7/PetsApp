/** @vitest-environment jsdom */
import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { useReducedMotion } from "@/features/pet-home/use-reduced-motion";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function Probe() { return <output>{String(useReducedMotion())}</output>; }
it.each([false, true])("reads initial %s and live changes, cleans same subscription", (initial) => {
  let matches = initial;
  const listeners = new Set<() => void>();
  const addEventListener = vi.fn((_event: string, fn: () => void) => listeners.add(fn));
  const removeEventListener = vi.fn((_event: string, fn: () => void) => listeners.delete(fn));
  const media = { get matches() { return matches; }, addEventListener, removeEventListener };
  const matchMedia = vi.fn(() => media);
  vi.stubGlobal("matchMedia", matchMedia);
  const { unmount } = render(<Probe />);
  expect(screen.getByRole("status").textContent).toBe(String(initial));
  for (const value of [true, false]) {
    act(() => { matches = value; [...listeners].forEach((fn) => fn()); });
    expect(screen.getByRole("status").textContent).toBe(String(value));
  }
  expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  expect(listeners.size).toBe(1);
  const callback = addEventListener.mock.calls[0][1];
  unmount();
  expect(removeEventListener).toHaveBeenCalledWith("change", callback);
  expect(listeners.size).toBe(0);
});
it("has a safe stable SSR/missing API fallback", () => {
  vi.stubGlobal("matchMedia", undefined);
  expect(renderToString(<Probe />)).toContain("false");
  render(<Probe />); expect(screen.getByRole("status").textContent).toBe("false");
});
