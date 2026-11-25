/**
 * @vitest-environment jsdom
 */
/**
 * T2 — App Router boundaries (S2): branded not-found, client error with retry,
 * global error fallback and route loading skeletons.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import NotFoundPage from "@/app/not-found";
import ErrorPage from "@/app/error";
import GlobalErrorPage from "@/app/global-error";
import HomeLoading from "@/app/loading";
import AccountLoading from "@/app/account/loading";

afterEach(() => cleanup());

describe("not-found boundary", () => {
  it("shows Spanish copy and a link back to the home", () => {
    render(<NotFoundPage />);
    const link = screen.getByRole("link", { name: "Volver al inicio" });
    expect(link.getAttribute("href")).toBe("/");
    expect(screen.getByRole("heading")).toBeTruthy();
    expect(document.body.textContent).toMatch(/perdimos esta página/i);
  });
});

describe("error boundary", () => {
  it("offers a retry button wired to reset() and keeps Spanish copy", () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error("boom")} reset={reset} />);
    const retry = screen.getByRole("button", { name: "Intentar de nuevo" });
    fireEvent.click(retry);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).toMatch(/algo salió mal/i);
  });

  it("renders without leaking technical details by default", () => {
    render(<ErrorPage error={new Error("stack trace secret")} reset={vi.fn()} />);
    expect(document.body.textContent).not.toContain("stack trace secret");
  });
});

describe("global-error boundary", () => {
  it("renders the shell copy with a reset action", () => {
    const reset = vi.fn();
    render(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <GlobalErrorPage error={new Error("boom")} reset={reset} /> as any,
    );
    expect(document.body.textContent).toMatch(/error inesperado/i);
    const retry = screen.getByRole("button", { name: "Intentar de nuevo" });
    fireEvent.click(retry);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});

describe("route loading skeletons", () => {
  it("root loading shows a status skeleton", () => {
    render(<HomeLoading />);
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("account loading shows a status skeleton", () => {
    render(<AccountLoading />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
