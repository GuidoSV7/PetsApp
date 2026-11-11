/**
 * @vitest-environment jsdom
 */
/**
 * T3 — S6: TopNotification close button, pause on hover AND focus, ~6s default
 * duration and CSS-driven progress (no per-frame React re-render). S12: the
 * new animation respects prefers-reduced-motion in CSS.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import TopNotification from "@/app/_components/TopNotification";
import notificationCss from "@/app/_components/notification.module.css";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("S6 dismiss control", () => {
  it("renders a close button with an accessible label that dismisses the toast", () => {
    const alTerminar = vi.fn();
    render(<TopNotification mensaje="Michi comió" durationMs={60_000} alTerminar={alTerminar} />);
    const close = screen.getByRole("button", { name: "Cerrar notificación" });
    expect(close).toBeTruthy();
    act(() => {
      fireEvent.click(close);
    });
    expect(screen.queryByRole("button", { name: "Cerrar notificación" })).toBeNull();
  });
});

describe("S6 default duration ~6s", () => {
  it("auto-dismisses around six seconds by default", () => {
    const alTerminar = vi.fn();
    render(<TopNotification mensaje="Michi comió" alTerminar={alTerminar} />);
    act(() => {
      vi.advanceTimersByTime(5_500);
    });
    expect(alTerminar).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });

  it("drives progress through a CSS animation sized to the duration", () => {
    render(<TopNotification mensaje="Michi comió" durationMs={60_000} />);
    const fill = document.querySelector(
      `.${notificationCss.notificationBarFill}`,
    ) as HTMLElement | null;
    expect(fill).toBeTruthy();
    expect(fill!.style.animationDuration).toBe("60000ms");
    expect(fill!.style.animationPlayState).toBe("running");
  });
});

describe("S6 pause on hover and focus", () => {
  it("pauses on mouseenter, resumes on mouseleave", () => {
    render(<TopNotification mensaje="Michi comió" durationMs={60_000} />);
    const card = screen.getByRole("status");
    const fill = document.querySelector(
      `.${notificationCss.notificationBarFill}`,
    ) as HTMLElement;
    fireEvent.mouseEnter(card);
    expect(fill.style.animationPlayState).toBe("paused");
    act(() => {
      vi.advanceTimersByTime(120_000);
    });
    expect(screen.queryByRole("status")).not.toBeNull();
    fireEvent.mouseLeave(card);
    expect(fill.style.animationPlayState).toBe("running");
  });

  it("pauses while any element inside is focused", () => {
    const alTerminar = vi.fn();
    render(<TopNotification mensaje="Michi comió" durationMs={500} alTerminar={alTerminar} />);
    const card = screen.getByRole("status");
    const fill = document.querySelector(
      `.${notificationCss.notificationBarFill}`,
    ) as HTMLElement;
    const close = screen.getByRole("button", { name: "Cerrar notificación" });
    // React maps onFocus/onBlur from the bubbling focusin/focusout pair.
    fireEvent(close, new FocusEvent("focusin", { bubbles: true }));
    expect(fill.style.animationPlayState).toBe("paused");
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(alTerminar).not.toHaveBeenCalled();
    fireEvent(card, new FocusEvent("focusout", { bubbles: true }));
    expect(fill.style.animationPlayState).toBe("running");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(alTerminar).toHaveBeenCalledTimes(1);
  });
});

describe("S6 no per-frame React re-render for progress", () => {
  it("does not schedule animation frames to update the countdown", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    render(<TopNotification mensaje="Michi comió" durationMs={60_000} />);
    fireEvent.mouseEnter(screen.getByRole("status"));
    fireEvent.mouseLeave(screen.getByRole("status"));
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(raf).not.toHaveBeenCalled();
    raf.mockRestore();
  });
});

describe("S12 reduced motion", () => {
  it("stops the progress animation under prefers-reduced-motion", () => {
    const css = readFileSync(
      join(__dirname, "..", "..", "src", "app", "_components", "notification.module.css"),
      "utf8",
    );
    const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(reduced).toContain(".notificationBarFill");
    expect(reduced).toContain("animation");
  });
});
