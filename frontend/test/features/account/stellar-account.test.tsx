/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { clearSession, getPetsAppSession, savePetsAppSession } from "@/stores/auth-session";
const mocks = vi.hoisted(() => ({ profile: vi.fn(), logout: vi.fn(), identity: vi.fn(), proof: vi.fn(), disconnect: vi.fn(), router: { replace: vi.fn(), push: vi.fn() } }));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/features/auth/api/auth.service", () => ({ fetchAuthProfile: mocks.profile, signOutPetsAppUser: mocks.logout }));
vi.mock("@/features/stellar-auth/stellar-auth", () => ({ authenticateWithFreighter: mocks.proof, fetchStellarIdentity: mocks.identity, isWalletMember: (user: { role: string }) => user.role === "member" }));
vi.mock("@/features/stellar-auth/freighter", () => ({ freighter: { disconnect: mocks.disconnect } }));
import AccountPage from "@/app/account/page";
const user = { id: "member", name: "Ada", email: "ada@example.test", role: "member" as const, roles: ["member" as const], country: null };
const identity = { network: "testnet", address: "G-PUBLIC-FIXTURE" };
beforeEach(() => { vi.clearAllMocks(); clearSession(); savePetsAppSession({ token: "email-token", user }); mocks.profile.mockResolvedValue(user); mocks.identity.mockResolvedValue({ identity: null }); mocks.proof.mockResolvedValue({ identity }); mocks.logout.mockResolvedValue(undefined); });
afterEach(() => { cleanup(); clearSession(); });
it("hydrates and displays the available server wallet identity with NULL email", async () => {
 clearSession(); mocks.profile.mockResolvedValue({ ...user, email: null }); mocks.identity.mockResolvedValue({ identity });
 render(<AccountPage />);
 await waitFor(() => expect(mocks.profile).toHaveBeenCalledTimes(1));
 expect(await screen.findByText("Sin email · Freighter")).toBeTruthy();
 expect(await screen.findByText(identity.address)).toBeTruthy();
 expect(screen.queryByLabelText("Contraseña actual")).toBeNull();
 expect(screen.queryByRole("button", { name: /Desvincular|Reemplazar|Activar/ })).toBeNull();
 expect(mocks.router.replace).not.toHaveBeenCalled();
});
it("links an email account with its password without replacing its session or fabricating recency", async () => {
 render(<AccountPage />);
 const button = await screen.findByRole("button", { name: "Vincular Freighter" });
 fireEvent.change(screen.getByLabelText("Contraseña actual"), { target: { value: "password-fixture" } });
 fireEvent.click(button);
 await waitFor(() => expect(mocks.proof).toHaveBeenCalledExactlyOnceWith({ purpose: "link", password: "password-fixture" }));
 expect(await screen.findByText(identity.address)).toBeTruthy();
 expect(getPetsAppSession()).toEqual({ token: "email-token", user });
 expect(screen.queryByLabelText("Contraseña actual")).toBeNull();
});
it.each(["Recent authentication required", "Stellar authentication does not permit administrative access", "Identity already linked"])("shows backend link failure %s without replacing session or retrying automatically", async (message) => {
 mocks.proof.mockRejectedValue(new Error(message)); render(<AccountPage />);
 fireEvent.change(await screen.findByLabelText("Contraseña actual"), { target: { value: "password-fixture" } });
 fireEvent.click(screen.getByRole("button", { name: "Vincular Freighter" }));
 expect((await screen.findByRole("alert")).textContent).toContain(message);
 expect(mocks.proof).toHaveBeenCalledTimes(1);
 expect(getPetsAppSession()).toEqual({ token: "email-token", user });
 expect(screen.queryByText(identity.address)).toBeNull();
});
it("preserves the email admin redirect without rendering wallet linking", async () => {
 const admin = { ...user, role: "admin" as const, roles: ["admin" as const] };
 savePetsAppSession({ token: "admin-token", user: admin }); mocks.profile.mockResolvedValue(admin);
 render(<AccountPage />);
 await waitFor(() => expect(mocks.router.replace).toHaveBeenCalledWith("/admin"));
 expect(mocks.identity).not.toHaveBeenCalled(); expect(mocks.proof).not.toHaveBeenCalled();
 expect(getPetsAppSession()).toEqual({ token: "admin-token", user: admin });
});
it("logs out through Nest and adapter cleanup while keeping the email account navigation", async () => {
 render(<AccountPage />); fireEvent.click(await screen.findByRole("button", { name: "Cerrar sesión" }));
 await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
 expect(mocks.disconnect).toHaveBeenCalledTimes(1); expect(getPetsAppSession()).toBeNull();
 expect(mocks.router.push).toHaveBeenCalledWith("/");
});
