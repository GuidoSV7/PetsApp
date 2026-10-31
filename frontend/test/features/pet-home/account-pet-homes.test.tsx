/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { clearSession, getPetsAppSession, getSessionEpoch, savePetsAppSession } from "@/stores/auth-session";
import { createApiPetState } from "./pet-api-stub";
const mocks = vi.hoisted(() => ({ configured: false, pollar: false, ready: true, busy: false, get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("@/features/pollar/pollar-config", () => ({ isPollarConfigured: () => mocks.configured }));
vi.mock("@pollar/react", () => ({ usePollar: () => ({ isAuthenticated: mocks.pollar, wallet: null, login: vi.fn(), logout: vi.fn(), getClient: () => ({ getUserProfile: () => null, onAuthStateChange: () => () => undefined }) }) }));
vi.mock("@/features/auth/useNestSession", () => ({ useNestSession: () => ({ session: mocks.ready ? getPetsAppSession() : null, epoch: getSessionEpoch(), ready: mocks.ready, error: null, busy: mocks.busy, logout: vi.fn(), loginFreighter: vi.fn() }) }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Cat</div> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/features/auth/components/AuthDemoModal", () => ({ default: () => null }));
vi.mock("@/features/auth/components/GoogleSignInButton", () => ({ GoogleSignInButton: () => <button>Google</button> }));
import HomePage from "@/app/_components/home/HomePage";
const user = { id: "home-owner", name: "Ada", email: "ada@example.test", role: "member" as const, roles: ["member" as const], country: null };
beforeEach(() => { localStorage.clear(); clearSession(); vi.clearAllMocks(); mocks.configured = false; mocks.pollar = false; mocks.ready = true; mocks.busy = false; mocks.get.mockResolvedValue({ data: createApiPetState() }); mocks.post.mockResolvedValue({ data: { status: "confirmed", petId: "pet", coins: 0 } }); window.scrollTo = vi.fn(); });
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
it.each([false,true])("routes confirmed Nest user through private bootstrap in actual home Pollar=%s", async configured => {
 mocks.configured = configured; vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); savePetsAppSession({ user, token: "email" }); render(<HomePage />);
 await screen.findByRole("button", { name: "Alimentar" });
 await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/account/pet/state", expect.any(Object)));
 expect(mocks.post).toHaveBeenCalledExactlyOnceWith("/account/pet/claim-guest", {}, expect.any(Object));
});
it.each([false,true])("default-OFF email/Google gameplay stays guest in actual home Pollar=%s", async configured => {
 mocks.configured = configured; vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", undefined); savePetsAppSession({ user, token: "google-or-email" }); render(<HomePage />);
 await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/pet/state", expect.objectContaining({ headers: expect.any(Object) })));
 expect(mocks.post).not.toHaveBeenCalled();
});
it.each([false,true])("wallet with gate OFF unavailable, never guest in actual home Pollar=%s", async configured => {
 mocks.configured = configured; vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "false"); savePetsAppSession({ user: { ...user, email: null }, token: null, method: "stellar" }); render(<HomePage />);
 await screen.findByRole("alert"); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled();
});
it("does not turn a lost private cookie into a Pollar guest after reload", async () => {
 mocks.configured = true; mocks.pollar = true; vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); savePetsAppSession({ user, token: "jwt" }); const view = render(<HomePage />);
 await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1)); view.unmount(); clearSession(); mocks.get.mockClear(); mocks.post.mockClear(); render(<HomePage />);
 await screen.findByRole("alert"); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled();
});
it.each([false,true])("does not bootstrap the previous owner during proof-start Pollar=%s", async configured => {
 mocks.configured = configured; mocks.busy = true; vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); savePetsAppSession({ user, token: "jwt" }); render(<HomePage />);
 expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.post).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: "Alimentar" })).toBeNull();
});
it("waits for Nest hydration before Pollar-only gameplay, then preserves guest", async () => {
 mocks.configured = true; mocks.pollar = true; mocks.ready = false; const view = render(<HomePage />);
 expect(mocks.get).not.toHaveBeenCalled(); expect(screen.queryByRole("button", { name: "Alimentar" })).toBeNull();
 mocks.ready = true; view.rerender(<HomePage />); await vi.waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(1)); expect(mocks.get.mock.calls[0][0]).toBe("/pet/state"); expect(mocks.post).not.toHaveBeenCalled();
});
