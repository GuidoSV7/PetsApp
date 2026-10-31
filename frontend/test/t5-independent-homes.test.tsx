/** @vitest-environment jsdom */
// S1/S3/S6/S15: actual home + actual session hook + actual stage, HTTP doubles only.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearSession, savePetsAppSession } from "@/stores/auth-session";
import { createApiPetState } from "./features/pet-home/pet-api-stub";
const state = vi.hoisted(() => ({ configured: false, authenticated: false, get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get: state.get, post: state.post } }));
vi.mock("@/features/pollar/pollar-config", () => ({ isPollarConfigured: () => state.configured }));
vi.mock("@pollar/react", () => ({ usePollar: () => ({ isAuthenticated: state.authenticated, wallet: null, login: vi.fn(), logout: vi.fn(), getClient: () => ({ getUserProfile: () => null, onAuthStateChange: () => () => undefined }) }) }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Canvas fixture</div> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/features/auth/components/AuthDemoModal", () => ({ default: () => null }));
vi.mock("@/features/auth/components/GoogleSignInButton", () => ({ GoogleSignInButton: () => <button>Google</button> }));
import HomePage from "@/app/_components/home/HomePage";
const user = { id: "home-probe", name: "Home", email: "home@example.test", role: "member" as const, roles: ["member" as const], country: null };
beforeEach(() => { localStorage.clear(); clearSession(); state.get.mockReset(); state.post.mockReset(); state.configured = false; state.authenticated = false; window.scrollTo = vi.fn(); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", undefined); });
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
it.each([false, true])("default-OFF email/Google hydrates then preserves real care through home Pollar=%s", async pollar => {
 state.configured = pollar; savePetsAppSession({ token: "google-or-email", user }); state.get.mockImplementation(async (path: string) => ({ data: path === "/auth/profile" ? user : createApiPetState() })); state.post.mockResolvedValue({ data: createApiPetState() }); render(<HomePage />);
 await waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false)); fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
 await waitFor(() => expect(state.post).toHaveBeenCalledTimes(1)); expect(state.get.mock.calls.map(([p]) => p)).toEqual(["/auth/profile", "/pet/state"]); expect(state.post.mock.calls[0][0]).toBe("/pet/actions/feed"); expect(state.post.mock.calls[0][2].headers["X-Pet-Guest-Key"]).toBe(localStorage.getItem("petsapp_pet_guest"));
});
it.each([false, true])("default-OFF wallet cookie never downgrades to guest through home Pollar=%s", async pollar => {
 state.configured = pollar; state.authenticated = pollar; state.get.mockResolvedValue({ data: { ...user, email: null } }); render(<HomePage />); expect((await screen.findByRole("alert")).textContent).toBe("La mascota de tu cuenta no está disponible en este momento."); expect(state.get.mock.calls.map(([p]) => p)).toEqual(["/auth/profile"]); expect(state.post).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBeNull();
});
it("Pollar with an invalid existing Nest session asks for reauthentication without guest calls", async () => {
 state.configured = true; state.authenticated = true; savePetsAppSession({ token: "expired", user }); state.get.mockRejectedValue({ response: { status: 401 } }); render(<HomePage />); expect((await screen.findByRole("alert")).textContent).toBe("Volvé a iniciar sesión para continuar."); expect(state.get.mock.calls.map(([p]) => p)).toEqual(["/auth/profile"]); expect(state.post).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBeNull();
});
