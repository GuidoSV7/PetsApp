/** @vitest-environment jsdom */
// S1/S3: use the real shared axios interceptor, NOT a mocked axios module.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import api from "@/lib/axios";
import { clearSession, savePetsAppSession } from "@/stores/auth-session";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { createApiPetState } from "./features/pet-home/pet-api-stub";
vi.mock("next/dynamic", () => ({ default: () => () => <div>Canvas fixture</div> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
const original = api.defaults.adapter;
const owner = "integration-owner", guest = "88888888-8888-4888-8888-888888888888", operationId = "77777777-7777-4777-8777-777777777777";
const calls: string[] = [];
function reject(config: InternalAxiosRequestConfig, status: number, message: string): never {
 throw new AxiosError("Request failed", "ERR_BAD_REQUEST", config, undefined, { config, status, statusText: "Rejected", headers: {}, data: { statusCode: status, message, operationId } });
}
beforeEach(() => { localStorage.clear(); clearSession(); calls.length = 0; savePetsAppSession({ token: "email-fixture", user: { id: owner, name: "Probe", email: "p@example.test", role: "member", roles: ["member"], country: null } }); localStorage.setItem("petsapp_pet_guest", guest); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); });
afterEach(() => { cleanup(); clearSession(); localStorage.clear(); vi.unstubAllEnvs(); api.defaults.adapter = original; });
it("real PET_CONFLICT becomes the two-choice dialog and retains the original guest", async () => {
 api.defaults.adapter = async config => { calls.push(config.url!); return reject(config, 409, "PET_CONFLICT"); }; const coins = vi.fn(); render(<PetHomeStage ownerId={owner} onCoinsChange={coins} />); await waitFor(() => expect(screen.queryByRole("dialog") || screen.queryByRole("alert")).not.toBeNull());
 expect(calls).toEqual(["/account/pet/claim-guest"]); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest); expect(screen.queryByRole("dialog")).not.toBeNull(); expect(screen.getByRole("button", { name: "Conservar el de mi cuenta" })).toBeTruthy(); expect(screen.getByRole("button", { name: "Conservar el de este dispositivo" })).toBeTruthy();
});
it("real private mutation 401 locks care and asks for reauthentication", async () => {
 api.defaults.adapter = async config => { calls.push(config.url!); if (config.url!.includes("/actions/")) return reject(config, 401, "Unauthorized"); return { config, status: 200, statusText: "OK", headers: {}, data: config.url!.endsWith("claim-guest") ? { status: "confirmed", petId: "pet", coins: 0 } : createApiPetState() }; };
 const coins = vi.fn(); render(<PetHomeStage ownerId={owner} onCoinsChange={coins} />); await waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false)); const before = JSON.stringify({ ...localStorage }); coins.mockClear(); fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); await screen.findByRole("alert");
 expect(JSON.stringify({ ...localStorage })).toBe(before); expect(coins).not.toHaveBeenCalled(); expect.soft(screen.getByRole("alert").textContent).toBe("Volvé a iniciar sesión para continuar."); expect.soft((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(true);
});
it.each([[503, "ACCOUNT_PET_DISABLED", "La mascota de tu cuenta no está disponible en este momento."], [409, "PET_CONFLICT_STALE", "El conflicto cambió. Revisalo manualmente antes de continuar."]] as const)("real recovery %s/%s preserves references and displays the required recovery state", async (status, code, message) => {
 const saved = JSON.stringify({ ownerId: owner, guestKey: guest, operationId, choice: "keep_guest" }); localStorage.setItem(`petsapp_pet_claim:${owner}`, saved);
 api.defaults.adapter = async config => { calls.push(config.url!); return reject(config, status, code); }; const coins = vi.fn(); render(<PetHomeStage ownerId={owner} onCoinsChange={coins} />); await screen.findByRole("alert");
 expect(calls).toEqual([`/account/pet/claims/${operationId}`]); expect(localStorage.getItem(`petsapp_pet_claim:${owner}`)).toBe(saved); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest); expect(coins).not.toHaveBeenCalled(); expect(screen.getByRole("alert").textContent).toBe(message);
});
