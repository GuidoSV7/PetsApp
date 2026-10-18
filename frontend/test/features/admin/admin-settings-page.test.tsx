/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AdminSettingsPage } from "@/app/admin/_components/settings/AdminSettingsPage";
import { ADMIN_BRAND_STORAGE_KEY } from "@/features/admin/admin-brand-settings";

describe("AdminSettingsPage", () => {
  afterEach(() => {
    cleanup();
    window.localStorage.removeItem(ADMIN_BRAND_STORAGE_KEY);
  });

  it("shows Configuración marca pública and saves brand draft", () => {
    render(<AdminSettingsPage />);
    expect(
      screen.getByRole("heading", { name: /^Configuración$/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Marca pública/i })).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Nombre del sitio/i), {
      target: { value: "Michi Cloud" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar marca/i }));
    expect(screen.getByText(/Marca guardada/i)).toBeTruthy();
    expect(window.localStorage.getItem(ADMIN_BRAND_STORAGE_KEY)).toContain(
      "Michi Cloud",
    );
  });
});
