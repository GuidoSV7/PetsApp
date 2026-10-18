/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminDesign3DPage } from "@/app/admin/_components/design-3d/AdminDesign3DPage";
import {
  CAT_DESIGN_STORAGE_KEY,
  clearCatDesign,
} from "@/features/admin/cat-design-settings";

vi.mock("next/dynamic", () => ({
  default: () => () => <div role="img" aria-label="Vista previa de Michi" />,
}));

describe("AdminDesign3DPage", () => {
  afterEach(() => {
    cleanup();
    clearCatDesign();
  });

  it("shows Diseño 3D controls and persists tunables", () => {
    render(<AdminDesign3DPage />);
    expect(
      screen.getByRole("heading", { name: /Diseño 3D/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Vista previa/i })).toBeTruthy();
    expect(screen.getByLabelText(/Vista previa de Michi/i)).toBeTruthy();

    const scale = screen.getByLabelText(/Escala del modelo/i);
    fireEvent.change(scale, { target: { value: "0.95" } });
    fireEvent.click(screen.getByRole("button", { name: /Guardar diseño/i }));
    expect(screen.getByText(/Diseño guardado/i)).toBeTruthy();
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toContain(
      "0.95",
    );
  });

  it("restores defaults", () => {
    render(<AdminDesign3DPage />);
    fireEvent.change(screen.getByLabelText(/Escala del modelo/i), {
      target: { value: "1.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar diseño/i }));
    fireEvent.click(screen.getByRole("button", { name: /Restablecer/i }));
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toBeNull();
    expect(screen.getByText(/Diseño restablecido/i)).toBeTruthy();
  });
});
