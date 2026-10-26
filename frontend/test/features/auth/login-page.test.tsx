/** @vitest-environment jsdom */
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { getPetsAppSession, getSessionToken, type PetsAppSessionData } from "@/stores/auth-session";
import { legacyCredentials, legacySession, sessionKeys } from "../../fixtures/legacy-admin-session";

const { replace, signInPetsAppUser, router } = vi.hoisted(() => {
  const replace = vi.fn();
  return { replace, signInPetsAppUser: vi.fn(), router: { replace, push: vi.fn() } };
});
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
vi.mock("@/features/auth/api/auth.service", () => ({ signInPetsAppUser }));
import LoginPage from "@/app/login/LoginPage";

function snapshot() {
  return sessionKeys.map((key) => localStorage.getItem(key));
}
function submit(credentials = legacyCredentials) {
  fireEvent.change(screen.getByLabelText("Correo"), { target: { value: credentials.email } });
  fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: credentials.password } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar al panel" }));
}
function realSession(role: "admin" | "super_admin" | "member"): PetsAppSessionData {
  return {
    token: "nest-response-token",
    user: { id: "nest-user", name: "Real User", email: "real@example.test", role, roles: [role], country: "BO" },
  };
}

describe("LoginPage Nest-only authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInPetsAppUser.mockReset();
    localStorage.clear();
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

  for (const failure of ["Nest rejected credentials", "Network unavailable"]) {
    for (const key of [null, ...sessionKeys]) {
      it(`S1/S3 ${failure}, storage ${key ?? "empty"}: request, error, reset, no mutation/navigation`, async () => {
        if (key) localStorage.setItem(key, JSON.stringify(legacySession));
        const before = snapshot();
        const writes = vi.spyOn(Storage.prototype, "setItem");
        const removals = vi.spyOn(Storage.prototype, "removeItem");
        let reject!: (reason: Error) => void;
        signInPetsAppUser.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
        render(<LoginPage />);
        // Ignore mount navigation here; separate S4/S5 tests prove that decision.
        replace.mockClear();
        submit();
        expect.soft(signInPetsAppUser.mock.calls.length, "one service request").toBe(1);
        expect.soft(JSON.stringify(signInPetsAppUser.mock.calls[0]) === JSON.stringify([legacyCredentials.email, legacyCredentials.password]), "exact request without credential disclosure").toBe(true);
        expect.soft((screen.getByRole("button", { name: "Entrar al panel" }) as HTMLButtonElement).disabled, "pending during request").toBe(true);
        await act(async () => { reject(new Error(failure)); });
        expect.soft(screen.queryByRole("alert")?.textContent === failure, "safe visible service error").toBe(true);
        expect.soft((screen.getByRole("button", { name: "Entrar al panel" }) as HTMLButtonElement).disabled, "pending reset").toBe(false);
        expect.soft(getPetsAppSession() === null, "no valid session").toBe(true);
        expect.soft(getSessionToken() === null, "no bearer").toBe(true);
        expect.soft(JSON.stringify(snapshot()) === JSON.stringify(before), "both stored byte strings unchanged").toBe(true);
        expect.soft(writes.mock.calls.length, "no storage writes").toBe(0);
        expect.soft(removals.mock.calls.length, "no storage removals").toBe(0);
        expect.soft(replace.mock.calls.length, "no navigation after failure").toBe(0);
      });
    }
  }

  it("S3 uses a generic safe error for a non-Error rejection without storing or navigating", async () => {
    signInPetsAppUser.mockRejectedValue(null);
    const writes = vi.spyOn(Storage.prototype, "setItem");
    const removals = vi.spyOn(Storage.prototype, "removeItem");
    render(<LoginPage />);
    await act(async () => { submit(); });
    expect(signInPetsAppUser.mock.calls.length).toBe(1);
    expect(JSON.stringify(signInPetsAppUser.mock.calls[0]) === JSON.stringify([legacyCredentials.email, legacyCredentials.password])).toBe(true);
    expect(screen.queryByRole("alert")?.textContent).toBe("No se pudo iniciar sesión.");
    expect(getPetsAppSession()).toBeNull();
    expect(getSessionToken()).toBeNull();
    expect(snapshot()).toEqual([null, null]);
    expect(writes).not.toHaveBeenCalled();
    expect(removals).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Entrar al panel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each(["admin", "super_admin"] as const)("S2 arbitrary real %s reaches Nest and saves its exact response", async (role) => {
    const response = realSession(role);
    const credentials = { email: "real@example.test", password: "real-test-password" };
    signInPetsAppUser.mockResolvedValue(response);
    render(<LoginPage />);
    await act(async () => { submit(credentials); });
    expect.soft(signInPetsAppUser).toHaveBeenCalledExactlyOnceWith(credentials.email, credentials.password);
    expect.soft(getPetsAppSession()).toEqual(response);
    expect.soft(localStorage.getItem(sessionKeys[0])).toBe(JSON.stringify(response));
    expect.soft(localStorage.getItem(sessionKeys[1])).toBeNull();
    expect.soft(replace).toHaveBeenCalledExactlyOnceWith("/admin");
    expect.soft(screen.queryByRole("alert")).toBeNull();
    expect.soft((screen.getByRole("button", { name: "Entrar al panel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("S2 preserves legitimate Nest success for the formerly public pair", async () => {
    const response = realSession("super_admin");
    signInPetsAppUser.mockResolvedValue(response);
    render(<LoginPage />);
    await act(async () => { submit(); });
    expect(signInPetsAppUser.mock.calls.length).toBe(1);
    expect(JSON.stringify(signInPetsAppUser.mock.calls[0]) === JSON.stringify([legacyCredentials.email, legacyCredentials.password])).toBe(true);
    expect(getPetsAppSession()).toEqual(response);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/admin");
  });

  it("S2 preserves member denial after a real Nest response", async () => {
    signInPetsAppUser.mockResolvedValue(realSession("member"));
    render(<LoginPage />);
    const before = snapshot();
    await act(async () => { submit(); });
    expect(signInPetsAppUser.mock.calls.length).toBe(1);
    expect(screen.queryByRole("alert")?.textContent).toBe("Esta cuenta no tiene acceso de administración.");
    expect(getPetsAppSession()).toBeNull();
    expect(snapshot()).toEqual(before);
    expect(replace).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Entrar al panel" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it.each(sessionKeys)("S4/S5 old session in %s never mount-redirects to admin", (key) => {
    localStorage.setItem(key, JSON.stringify(legacySession));
    const before = snapshot();
    render(<LoginPage />);
    expect.soft(replace.mock.calls.length, "no mount redirect").toBe(0);
    expect.soft(getPetsAppSession() === null, "old session invalid").toBe(true);
    expect.soft(getSessionToken() === null, "no bearer").toBe(true);
    expect.soft(JSON.stringify(snapshot()) === JSON.stringify(before), "stored bytes unchanged").toBe(true);
    expect(signInPetsAppUser).not.toHaveBeenCalled();
  });

  it.each(["admin", "super_admin"] as const)("S6 preserves real %s mount redirect", (role) => {
    localStorage.setItem(sessionKeys[0], JSON.stringify(realSession(role)));
    render(<LoginPage />);
    expect(replace).toHaveBeenCalledExactlyOnceWith("/admin");
    expect(signInPetsAppUser).not.toHaveBeenCalled();
  });
});
