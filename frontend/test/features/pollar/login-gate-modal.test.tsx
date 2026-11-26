/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LoginGateModal } from "@/features/pollar/LoginGateModal";

describe("LoginGateModal", () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("renders nothing when closed", () => {
    const { container } = render(
      <LoginGateModal
        open={false}
        onGoogle={vi.fn()}
        onFreighter={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows Google and Freighter options when open", () => {
    render(
      <LoginGateModal open onGoogle={vi.fn()} onFreighter={vi.fn()} />,
    );
    expect(screen.getByLabelText("Iniciar sesión")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Continuar con Google/i }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: /Freighter/i })).toBeTruthy();
  });

  it("announces PetsApp as a visible document heading without aria-hidden", () => {
    render(
      <LoginGateModal open onGoogle={vi.fn()} onFreighter={vi.fn()} />,
    );
    const heading = screen.getByRole("heading", { level: 1, name: "PetsApp" });
    expect(heading).toBeTruthy();
    expect(heading.getAttribute("aria-hidden")).toBeNull();
    expect(screen.getByText(/Entrá para cuidar a Michi/i)).toBeTruthy();
  });

  it("calls Google and Freighter handlers", () => {
    const onGoogle = vi.fn();
    const onFreighter = vi.fn();
    render(
      <LoginGateModal open onGoogle={onGoogle} onFreighter={onFreighter} />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Continuar con Google/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Freighter/i }));
    expect(onGoogle).toHaveBeenCalledTimes(1);
    expect(onFreighter).toHaveBeenCalledTimes(1);
  });

  it("surfaces an error message", () => {
    render(
      <LoginGateModal
        open
        error="Freighter no está instalada"
        onGoogle={vi.fn()}
        onFreighter={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/Freighter/i);
  });

  it("focuses the first option and traps Tab inside the dialog", () => {
    render(
      <LoginGateModal open onGoogle={vi.fn()} onFreighter={vi.fn()} />,
    );
    const google = screen.getByRole("button", {
      name: /Continuar con Google/i,
    });
    const freighter = screen.getByRole("button", { name: /Freighter/i });
    expect(document.activeElement).toBe(google);

    freighter.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(google);

    google.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(freighter);
  });

  it("calls onDismiss on Escape when not busy", () => {
    const onDismiss = vi.fn();
    render(
      <LoginGateModal
        open
        onDismiss={onDismiss}
        onGoogle={vi.fn()}
        onFreighter={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not call onDismiss on Escape while busy", () => {
    const onDismiss = vi.fn();
    render(
      <LoginGateModal
        open
        busy
        onDismiss={onDismiss}
        onCancel={vi.fn()}
        onGoogle={vi.fn()}
        onFreighter={vi.fn()}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("shows Cancelar while busy and calls onCancel", () => {
    const onCancel = vi.fn();
    render(
      <LoginGateModal
        open
        busy
        onCancel={onCancel}
        onGoogle={vi.fn()}
        onFreighter={vi.fn()}
      />,
    );
    expect(screen.getByText(/Conectando/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
