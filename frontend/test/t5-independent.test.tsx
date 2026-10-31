/** @vitest-environment jsdom */
// S1/S3/S10/S15: real stage, durable recovery, callback and key boundaries.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { clearSession, savePetsAppSession } from "@/stores/auth-session";
import { createApiPetState } from "./features/pet-home/pet-api-stub";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: http }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Canvas fixture</div> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
const guest = "88888888-8888-4888-8888-888888888888";
const other = "99999999-9999-4999-8999-999999999999";
const operationId = "77777777-7777-4777-8777-777777777777";
const user = { id: "independent-owner", name: "Verifier", email: "v@example.test", role: "member" as const, roles: ["member" as const], country: null };
const key = `petsapp_pet_claim:${user.id}`;
const session = () => savePetsAppSession({ token: "email-fixture", user });
const mount = (coins = vi.fn()) => render(<PetHomeStage ownerId={user.id} onCoinsChange={coins} />);
const ready = () => waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false));
beforeEach(() => { localStorage.clear(); clearSession(); session(); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); http.get.mockReset(); http.post.mockReset(); http.get.mockResolvedValue({ data: createApiPetState() }); http.post.mockResolvedValue({ data: { status: "confirmed", petId: "confirmed", coins: 99 } }); });
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
it("retains a sent choice byte-for-byte through logout and changed-device retry, then recovers CURRENT", async () => {
 localStorage.setItem("petsapp_pet_guest", guest);
 http.post.mockRejectedValueOnce({ response: { status: 409, data: { message: "PET_CONFLICT", operationId } } }).mockRejectedValueOnce(new Error("response lost"));
 const first = mount(); await screen.findByRole("dialog");
 fireEvent.click(screen.getByRole("button", { name: "Conservar el de este dispositivo" })); await screen.findByRole("alert");
 const saved = localStorage.getItem(key); expect(JSON.parse(saved!)).toEqual({ ownerId: user.id, guestKey: guest, operationId, choice: "keep_guest" });
 first.unmount(); clearSession(); expect(localStorage.getItem(key)).toBe(saved); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
 session(); localStorage.setItem("petsapp_pet_guest", other); const coins = vi.fn(); const second = mount(coins); await screen.findByRole("alert");
 expect(http.post).toHaveBeenCalledTimes(2); expect(http.get).not.toHaveBeenCalled(); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem(key)).toBe(saved); expect(localStorage.getItem("petsapp_pet_guest")).toBe(other);
 second.unmount(); localStorage.setItem("petsapp_pet_guest", guest);
 http.get.mockImplementation(async (url: string) => ({ data: url.includes("/claims/") ? { status: "confirmed", petId: "archived-replay", coins: 999 } : { ...createApiPetState(), name: "Current cat", coins: 42 } }));
 mount(coins); await ready(); expect(http.get.mock.calls.map(([url]) => url)).toEqual([`/account/pet/claims/${operationId}`, "/account/pet/state"]); expect(http.post).toHaveBeenCalledTimes(2); expect(coins).toHaveBeenCalledExactlyOnceWith(42); expect(localStorage.getItem(key)).toBeNull(); expect(localStorage.getItem("petsapp_pet_guest")).toBeNull();
});
it("does not retire references or publish a recovery response after unmount", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); const saved = JSON.stringify({ ownerId: user.id, guestKey: guest, operationId, choice: "keep_account" }); localStorage.setItem(key, saved);
 let finish!: (v: unknown) => void; http.get.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); const coins = vi.fn(); const view = mount(coins);
 await waitFor(() => expect(http.get).toHaveBeenCalledTimes(1)); view.unmount(); await act(async () => { finish({ data: { status: "confirmed", petId: "old", coins: 999 } }); });
 expect(http.get).toHaveBeenCalledTimes(1); expect(http.post).not.toHaveBeenCalled(); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem(key)).toBe(saved); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
});
it.each([401, 403, 503])("rejected care %s preserves references and never emits private replay data", async status => {
 const coins = vi.fn(); mount(coins); await ready(); coins.mockClear(); localStorage.setItem("petsapp_pet_guest", other); const before = JSON.stringify({ ...localStorage });
 http.post.mockRejectedValueOnce({ response: { status, data: { message: "rejected" } } }); fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); await screen.findByRole("alert");
 expect(JSON.stringify({ ...localStorage })).toBe(before); expect(coins).not.toHaveBeenCalled(); expect(http.get).toHaveBeenCalledTimes(1); expect(http.post.mock.calls.map(([url]) => url)).toEqual(["/account/pet/claim-guest", "/account/pet/actions/feed"]);
});
it("default-OFF adopted-key denial stays on the exact original key across explicit retry", async () => {
 vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", undefined); localStorage.setItem("petsapp_pet_guest", guest); http.get.mockRejectedValue({ response: { status: 403, data: { message: "GUEST_PET_UNAVAILABLE" } } }); const coins = vi.fn(); mount(coins); await screen.findByRole("alert"); fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); await waitFor(() => expect(http.get).toHaveBeenCalledTimes(2));
 expect(http.get.mock.calls.map(([url, config]) => [url, config.headers])).toEqual([["/pet/state", { "X-Pet-Guest-Key": guest }], ["/pet/state", { "X-Pet-Guest-Key": guest }]]); expect(http.post).not.toHaveBeenCalled(); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
});
