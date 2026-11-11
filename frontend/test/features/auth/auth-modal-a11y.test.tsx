/**
 * @vitest-environment jsdom
 */
/**
 * T4 — S4 (focus management + native country select) and S5 (password toggle,
 * visible password rule, field-level errors, server banner) and S9 (voseo,
 * accented country names) for the auth modal.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const { registerPetsAppUser, signInPetsAppUser, router } = vi.hoisted(() => ({
  registerPetsAppUser: vi.fn(),
  signInPetsAppUser: vi.fn(),
  router: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/api/auth.service", () => ({
  registerPetsAppUser,
  signInPetsAppUser,
}));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));

import AuthDemoModal from "@/features/auth/components/AuthDemoModal";

/** Host controlling the modal like the real home page does. */
function Host({ mode = "sign-up" as const }) {
  const [abierta, setAbierta] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}>
        Usar email y contraseña
      </button>
      <AuthDemoModal
        abierta={abierta}
        initialMode={mode}
        onClose={() => setAbierta(false)}
      />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
});

describe("S4 focus management", () => {
  it("moves the initial focus to the first field when it opens", () => {
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "Usar email y contraseña" }));
    const correo = screen.getByLabelText("Correo");
    expect(document.activeElement).toBe(correo);
  });

  it("traps Tab inside the dialog: last elemento wraps to the entry point", () => {
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "Usar email y contraseña" }));
    const submit = screen.getByRole("button", { name: "Crear cuenta" });
    submit.focus();
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerrar modal" }));
  });

  it("keeps closing via Escape (preserved behavior)", () => {
    render(<Host />);
    fireEvent.click(screen.getByRole("button", { name: "Usar email y contraseña" }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("restores focus to the opener when it closes", () => {
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Usar email y contraseña" });
    opener.focus();
    fireEvent.click(opener);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(document.activeElement).toBe(opener);
  });

  it("restores focus to the opener through the close button too", () => {
    render(<Host />);
    const opener = screen.getByRole("button", { name: "Usar email y contraseña" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
    expect(document.activeElement).toBe(opener);
  });
});

describe("S4 native country select", () => {
  it("renders a native select keeping the same country values", () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    const select = screen.getByLabelText("País") as HTMLSelectElement;
    expect(select.tagName).toBe("SELECT");
    const values = [...select.options].map((o) => o.value);
    expect(values).toEqual(["AR", "BO", "CL", "CO", "EC", "GT", "MX", "PE", "UY", "VE"]);
    expect(select.value).toBe("BO");
  });

  it("keeps accented country names (S9)", () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    const select = screen.getByLabelText("País") as HTMLSelectElement;
    const labels = [...select.options].map((o) => o.textContent);
    expect(labels).toContain("México");
    expect(labels).toContain("Perú");
  });
});

describe("S5 password toggle and rule", () => {
  it("toggles visibility with aria-pressed and Spanish labels", () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    const toggle = screen.getByRole("button", { name: "Mostrar contraseña" }) as HTMLButtonElement;
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    const input = screen.getByLabelText("Contraseña") as HTMLInputElement;
    expect(input.type).toBe("password");
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    expect((screen.getByRole("button", { name: "Ocultar contraseña" }) as HTMLButtonElement)).toBeTruthy();
    expect((screen.getByLabelText("Contraseña") as HTMLInputElement).type).toBe("text");
  });

  it("shows the password rule before submit and links it with aria-describedby", () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    const hint = screen.getByText("Mínimo 8 caracteres");
    const input = screen.getByLabelText("Contraseña");
    expect(input.getAttribute("aria-describedby")).toBe(hint.id);
  });

  it("marks a short password on the field, not only the banner", async () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "nueva@correo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "corta" } });
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form")!);
    });
    const input = screen.getByLabelText("Contraseña");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const mensaje = document.getElementById(input.getAttribute("aria-describedby")!);
    expect(mensaje?.textContent).toMatch(/8 caracteres/);
    expect(registerPetsAppUser).not.toHaveBeenCalled();
  });

  it("marks the empty full name on the field with the voseo copy (S9)", async () => {
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "nueva@correo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "larga-suficiente" } });
    await act(async () => {
      fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form")!);
    });
    const input = screen.getByLabelText("Nombre completo");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const mensaje = document.getElementById(input.getAttribute("aria-describedby")!);
    expect(mensaje?.textContent).toBe("Indicá tu nombre completo.");
    expect(registerPetsAppUser).not.toHaveBeenCalled();
  });

  it("keeps the server error as a role=alert banner (preserved)", async () => {
    registerPetsAppUser.mockRejectedValue(new Error("El correo ya está registrado."));
    render(
      <AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />,
    );
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "nueva@correo.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "larga-suficiente" } });
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    });
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toBe("El correo ya está registrado.");
  });

  it("preserved: successful sign-up saves the session and routes", async () => {
    registerPetsAppUser.mockResolvedValue({
      token: "t",
      user: { id: "u", name: "Ana", email: "a@a.com", role: "member", roles: ["member"], country: "BO" },
    });
    render(<Host mode="sign-up" />);
    fireEvent.click(screen.getByRole("button", { name: "Usar email y contraseña" }));
    fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "a@a.com" } });
    fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "larga-suficiente" } });
    fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Ana" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Crear cuenta" }));
    });
    expect(registerPetsAppUser).toHaveBeenCalled();
    expect(router.push).toHaveBeenCalledWith("/");
  });
});
