/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { LoginGateModal } from "@/features/pollar/LoginGateModal";

describe("LoginGateModal", () => {
  afterEach(() => {
    cleanup();
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
});
