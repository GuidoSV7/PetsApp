/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearSession, getPetsAppSession, savePetsAppSession } from "@/stores/auth-session";
const mocks = vi.hoisted(() => ({ configured: false, pollarAuthenticated: false, profile: vi.fn(), signout: vi.fn(), proof: vi.fn(), login: vi.fn(), pollarLogout: vi.fn(), disconnect: vi.fn(), google: vi.fn() }));
vi.mock("@/features/pollar/pollar-config", () => ({ isPollarConfigured: () => mocks.configured }));
const client = { getUserProfile: () => ({ first_name: "Pollar", last_name: "User" }), onAuthStateChange: () => () => undefined };
vi.mock("@pollar/react", () => ({ usePollar: () => ({ isAuthenticated: mocks.pollarAuthenticated, login: mocks.login, logout: mocks.pollarLogout, wallet: null, getClient: () => client }) }));
vi.mock("@/features/auth/api/auth.service", () => ({ fetchAuthProfile: mocks.profile, signOutPetsAppUser: mocks.signout, signInWithGoogle: mocks.google }));
vi.mock("@/features/stellar-auth/stellar-auth", () => ({ authenticateWithFreighter: mocks.proof, isWalletMember: (user: { role: string }) => user.role === "member" }));
vi.mock("@/features/stellar-auth/freighter", () => ({ freighter: { disconnect: mocks.disconnect } }));
vi.mock("@/features/pet-home/components/PetHomeStage", () => ({ PetHomeStage: () => <div>Owned stage placeholder</div> }));
vi.mock("@/features/auth/components/AuthDemoModal", () => ({ default: () => null }));
vi.mock("@/features/auth/components/GoogleSignInButton", () => ({ GoogleSignInButton: ({ onCredential }: { onCredential: (token: string) => void }) => <button onClick={() => onCredential("google-id")}>Continuar con Google</button> }));
vi.mock("@/components/ui/BrandMark", () => ({ default: () => <span>mark</span> }));
import HomePage from "@/app/_components/home/HomePage";
const user = { id: "nest-member", name: "Michi", email: null, role: "member" as const, roles: ["member" as const], country: null };
beforeEach(() => {
 vi.clearAllMocks(); clearSession(); mocks.configured = false; mocks.pollarAuthenticated = false;
 mocks.profile.mockRejectedValue(new Error("Authentication required")); mocks.signout.mockRejectedValue(new Error("offline"));
 mocks.proof.mockImplementation(async () => { savePetsAppSession({ token: null, method: "stellar", user }); });
 vi.stubEnv("NEXT_PUBLIC_STELLAR_AUTH_SERVER_ACCOUNT", "G"+"A".repeat(55));
 vi.stubEnv("NEXT_PUBLIC_STELLAR_HOME_DOMAIN", "pets.example"); vi.stubEnv("NEXT_PUBLIC_STELLAR_WEB_AUTH_DOMAIN", "auth.pets.example");
 window.scrollTo = vi.fn();
});
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
it.each([false, true])("wires independent Nest Freighter login with Pollar=%s, then Nest logout even offline", async (configured) => {
 mocks.configured = configured;
 render(<HomePage />);
 const connect = await screen.findByRole("button", { name: /Freighter/i });
 fireEvent.click(connect);
 await screen.findByText("Owned stage placeholder");
 expect(mocks.proof).toHaveBeenCalledTimes(1); expect(mocks.login).not.toHaveBeenCalled();
 expect(getPetsAppSession()?.user.id).toBe(user.id);
 fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión de Michi/i }));
 await waitFor(() => expect(mocks.signout).toHaveBeenCalledTimes(1));
 expect(mocks.disconnect).toHaveBeenCalledTimes(1); expect(getPetsAppSession()).toBeNull();
 expect(screen.queryByText("Owned stage placeholder")).toBeNull();
 if (configured) expect(mocks.pollarLogout).toHaveBeenCalledTimes(1);
});
it.each([false, true])("restores a cookie session via profile with Pollar=%s, not from a local wallet marker", async (configured) => {
 mocks.configured = configured; mocks.profile.mockResolvedValue(user);
 render(<HomePage />);
 await screen.findByText("Owned stage placeholder");
 expect(mocks.profile).toHaveBeenCalledTimes(1);
 expect(getPetsAppSession()?.user.id).toBe(user.id);
 expect(mocks.proof).not.toHaveBeenCalled(); expect(mocks.login).not.toHaveBeenCalled();
});
it("preserves Nest Google login/token without routing through Freighter or Pollar", async () => {
 const email = { token: "google-token", user: { ...user, email: "ada@example.test" } };
 mocks.google.mockResolvedValue(email); render(<HomePage />);
 fireEvent.click(await screen.findByRole("button", { name: /Continuar con Google/ }));
 await screen.findByText("Owned stage placeholder");
 expect(mocks.google).toHaveBeenCalledExactlyOnceWith("google-id");
 expect(getPetsAppSession()).toEqual(email); expect(mocks.proof).not.toHaveBeenCalled(); expect(mocks.login).not.toHaveBeenCalled();
});
it("retains Pollar Google and unrelated Pollar sessions without inventing a Nest identity", async () => {
 mocks.configured = true; render(<HomePage />);
 fireEvent.click(await screen.findByRole("button", { name: /Continuar con Google/ }));
 expect(mocks.login).toHaveBeenCalledExactlyOnceWith({ provider: "google" });
 expect(mocks.proof).not.toHaveBeenCalled(); expect(getPetsAppSession()).toBeNull();
});
