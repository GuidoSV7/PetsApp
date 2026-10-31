/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearSession, getPetsAppSession } from "@/stores/auth-session";
const mocks = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn(), router: { push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/features/auth/api/auth.service", () => ({ signInPetsAppUser: mocks.login, registerPetsAppUser: mocks.register }));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
import AuthDemoModal from "@/features/auth/components/AuthDemoModal";
const session = { token: "email-token", user: { id: "email", name: "Email", email: "email@example.test", role: "member", roles: ["member"], country: null } };
beforeEach(() => { clearSession(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); clearSession(); });
function submit() {
 render(<AuthDemoModal abierta initialMode="sign-in" onClose={() => undefined} />);
 fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "email@example.test" } });
 fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password-fixture" } });
 fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!);
}
it("discards an old-owner email response after logout instead of restoring its token and navigation", async () => {
 let resolve!: (value: unknown) => void;
 mocks.login.mockImplementation(() => new Promise((done) => { resolve = done; }));
 submit(); expect(mocks.login).toHaveBeenCalledTimes(1);
 clearSession(); resolve(session);
 await waitFor(() => expect(screen.getByRole("button", { name: "Entrar" })).toHaveProperty("disabled", false));
 expect(getPetsAppSession()).toBeNull(); expect(mocks.router.push).not.toHaveBeenCalled();
});
it("preserves successful email session/token and member navigation", async () => {
 mocks.login.mockResolvedValue(session); submit();
 await waitFor(() => expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith("/"));
 expect(getPetsAppSession()).toEqual(session);
});
it("preserves successful email registration payload, token and member navigation", async () => {
 mocks.register.mockResolvedValue(session);
 render(<AuthDemoModal abierta initialMode="sign-up" onClose={() => undefined} />);
 fireEvent.change(screen.getByLabelText("Correo"), { target: { value: "email@example.test" } });
 fireEvent.change(screen.getByLabelText("Contraseña"), { target: { value: "password-fixture" } });
 fireEvent.change(screen.getByLabelText("Nombre completo"), { target: { value: "Email" } });
 fireEvent.submit(screen.getByRole("button", { name: "Crear cuenta" }).closest("form")!);
 await waitFor(() => expect(mocks.router.push).toHaveBeenCalledExactlyOnceWith("/"));
 expect(mocks.register).toHaveBeenCalledExactlyOnceWith({ email: "email@example.test", password: "password-fixture", name: "Email", country: "BO" });
 expect(getPetsAppSession()).toEqual(session);
});
