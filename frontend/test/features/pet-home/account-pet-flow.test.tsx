/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { clearSession, invalidateSessionOwner, savePetsAppSession } from "@/stores/auth-session";
import { createApiPetState } from "./pet-api-stub";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get, post } }));
vi.mock("next/dynamic", () => ({ default: () => () => <div>Cat</div> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
const guest = "11111111-1111-4111-8111-111111111111";
const operationId = "22222222-2222-4222-8222-222222222222";
const user = { id: "owner-a", name: "Ada", email: "ada@example.test", role: "member" as const, roles: ["member" as const], country: null };
const conflict = { response: { status: 409, data: { message: "PET_CONFLICT", operationId, options: { keep_account: { petId: "a" }, keep_guest: { petId: "b" } } } } };
const confirmed = { status: "confirmed", petId: "old-result", coins: 999, operationId };
function owner(wallet = false) { savePetsAppSession(wallet ? { user: { ...user, email: null }, token: null, method: "stellar" } : { user, token: "jwt" }); }
function stage(coins = vi.fn()) { return render(<PetHomeStage {...{ ownerId: user.id, onCoinsChange: coins }} />); }
async function ready() { await waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false)); }
beforeEach(() => { vi.clearAllMocks(); get.mockReset(); post.mockReset(); localStorage.clear(); clearSession(); owner(); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); get.mockResolvedValue({ data: createApiPetState() }); post.mockResolvedValue({ data: confirmed }); });
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
it("bootstraps with no invented guest then reads current canonical state, not replay coins", async () => {
 const coins = vi.fn(); stage(coins); await ready();
 expect(post).toHaveBeenCalledWith("/account/pet/claim-guest", {}, expect.any(Object));
 expect(get).toHaveBeenCalledWith("/account/pet/state", expect.any(Object));
 expect(localStorage.getItem("petsapp_pet_guest")).toBeNull(); expect(coins).toHaveBeenCalledExactlyOnceWith(0);
 expect(get.mock.calls.every(([url]) => url.startsWith("/account/"))).toBe(true);
});
it.each(["keep_account", "keep_guest"] as const)("requires explicit %s, retires matching key only after confirmation and reads current", async choice => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict); const coins = vi.fn(); stage(coins);
 const dialog = await screen.findByRole("dialog"); expect(dialog.textContent).toContain("archivado");
 expect(post).toHaveBeenCalledExactlyOnceWith("/account/pet/claim-guest", { guestKey: guest }, expect.any(Object));
 expect(get).not.toHaveBeenCalled(); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
 fireEvent.click(screen.getByRole("button", { name: choice === "keep_account" ? "Conservar el de mi cuenta" : "Conservar el de este dispositivo" })); await ready();
 expect(post.mock.calls[1]).toEqual(["/account/pet/claim-guest", { operationId, choice }, expect.any(Object)]);
 expect(localStorage.getItem("petsapp_pet_guest")).toBeNull(); expect(screen.queryByRole("dialog")).toBeNull(); expect(coins).toHaveBeenCalledExactlyOnceWith(0);
});
it("dismisses without choice or key retirement and retries only explicitly", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValue(conflict); stage(); await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Ahora no" }));
 expect(screen.queryByRole("dialog")).toBeNull(); expect(post).toHaveBeenCalledTimes(1); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest); expect(get).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); await screen.findByRole("dialog"); expect(post).toHaveBeenCalledTimes(2);
});
it.each([401,403,503,"network"])("private %s never falls back or changes the guest key", async status => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValue({ response: { status } }); const coins = vi.fn(); stage(coins);
 await screen.findByRole("alert"); expect(get).not.toHaveBeenCalled(); expect(post).toHaveBeenCalledTimes(1); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
});
it.each([undefined,"false","TRUE"])("gate %s preserves legacy email calls, but blocks wallet without adopting", async flag => {
 vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", flag); const view = stage(); await ready(); expect(post).not.toHaveBeenCalled(); expect(get.mock.calls[0][0]).toBe("/pet/state");
 view.unmount(); get.mockClear(); owner(true); stage(); await screen.findByRole("alert"); expect(get).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
});
it("discards late guest mutations and callbacks after epoch change even before unmount", async () => {
 vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "false"); let finish!: (x: unknown) => void; const coins = vi.fn(); stage(coins); await ready(); coins.mockClear(); post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
 fireEvent.click(screen.getByRole("button", { name: "Alimentar" })); act(() => { invalidateSessionOwner(); }); await act(async () => { finish({ data: { ...createApiPetState(), coins: 999, name: "Old owner" } }); });
 expect(coins).not.toHaveBeenCalled(); expect(screen.queryByText("Old owner")).toBeNull();
});
it("does not downgrade a confirmed private owner when rollout turns OFF", async () => {
 const view = stage(); await ready(); view.unmount(); get.mockClear(); post.mockClear(); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "false"); stage();
 await screen.findByRole("alert"); expect(get).not.toHaveBeenCalled(); expect(post).not.toHaveBeenCalled();
});
it("keeps a later device key when the original bootstrap response arrives", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); let finish!: (x: unknown) => void; post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); stage();
 const later = "33333333-3333-4333-8333-333333333333"; localStorage.setItem("petsapp_pet_guest", later); await act(async () => { finish({ data: confirmed }); }); await ready(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(later);
});
it("adopted guest 403 retains its key and never creates an alternate pet", async () => {
 vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "false"); localStorage.setItem("petsapp_pet_guest", guest); get.mockRejectedValue({ response: { status: 403, data: { message: "GUEST_PET_UNAVAILABLE" } } }); stage();
 await screen.findByRole("alert"); expect(get).toHaveBeenCalledTimes(1); expect(post).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest);
});
it.each(["PET_CONFLICT_STALE", "PET_OPERATION_DECISION_MISMATCH", "foreign"])("%s does not silently start a new adoption or apply another choice", async code => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict).mockRejectedValueOnce({ response: { status: code === "foreign" ? 403 : 409, data: { message: code } } }); const coins = vi.fn(); stage(coins);
 await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Conservar el de mi cuenta" })); await screen.findByRole("alert");
 expect(post).toHaveBeenCalledTimes(2); expect(post.mock.lastCall?.[1]).toEqual({ operationId, choice: "keep_account" }); expect(get).not.toHaveBeenCalled(); expect(coins).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest); expect(screen.queryByRole("dialog")).toBeNull();
});
it("manual retry of a stale pair prepares a fresh conflict without automatically choosing", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict).mockRejectedValueOnce({ response: { status: 409, data: { message: "PET_CONFLICT_STALE" } } }).mockRejectedValueOnce(conflict); stage();
 await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Conservar el de mi cuenta" })); await screen.findByRole("alert"); fireEvent.click(screen.getByRole("button", { name: "Reintentar" })); await screen.findByRole("dialog"); expect(post.mock.lastCall?.[1]).toEqual({ guestKey: guest }); expect(get).not.toHaveBeenCalled();
});
it("does not reopen a dismissed dialog on remount or reuse another owner's operation", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict); const view = stage(); await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Ahora no" })); view.unmount(); post.mockClear();
 const second = stage(); await screen.findByRole("button", { name: "Reintentar" }); expect(post).not.toHaveBeenCalled(); expect(screen.queryByRole("dialog")).toBeNull(); second.unmount();
 savePetsAppSession({ user: { ...user, id: "owner-b" }, token: "other" }); render(<PetHomeStage ownerId="owner-b" />); await ready(); expect(post.mock.lastCall?.[1]).toEqual({ guestKey: guest }); expect(get.mock.calls.every(([url]) => !url.includes("/claims/"))).toBe(true);
});
it("confirmed status after a lost response fetches CURRENT, never replay pet/coins or another choice", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict).mockRejectedValueOnce(new Error("lost")); const view = stage(); await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Conservar el de mi cuenta" })); await screen.findByRole("alert"); view.unmount();
 const coins = vi.fn(); get.mockImplementation(async (url: string) => ({ data: url.includes("/claims/") ? confirmed : { ...createApiPetState(), name: "Current", coins: 42 } })); stage(coins); await ready(); expect(post).toHaveBeenCalledTimes(2); expect(get.mock.calls.map(([url]) => url)).toEqual([`/account/pet/claims/${operationId}`, "/account/pet/state"]); expect(coins).toHaveBeenCalledExactlyOnceWith(42); expect(localStorage.getItem("petsapp_pet_guest")).toBeNull();
});
it("locks private gameplay for reauthentication after a mutation 401", async () => {
 stage(); await ready(); post.mockRejectedValueOnce({ response: { status: 401 } }); fireEvent.click(screen.getByRole("button", { name: "Alimentar" }));
 expect((await screen.findByRole("alert")).textContent).toBe("Volvé a iniciar sesión para continuar.");
 expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(true);
 expect(get.mock.calls.every(([url]) => url === "/account/pet/state")).toBe(true);
});
it("recovers a lost choice response after remount with the same operation and choice, not another dialog", async () => {
 localStorage.setItem("petsapp_pet_guest", guest); post.mockRejectedValueOnce(conflict).mockRejectedValueOnce(new Error("lost"));
 const view = stage(); await screen.findByRole("dialog"); fireEvent.click(screen.getByRole("button", { name: "Conservar el de este dispositivo" })); await screen.findByRole("alert");
 expect(localStorage.getItem("petsapp_pet_guest")).toBe(guest); view.unmount(); get.mockImplementation(async (url: string) => ({ data: url.includes("/claims/") ? { status: "pending", operationId } : createApiPetState() })); post.mockResolvedValue({ data: confirmed });
 stage(); await ready(); expect(screen.queryByRole("dialog")).toBeNull(); expect(post.mock.calls.at(-1)?.[1]).toEqual({ operationId, choice: "keep_guest" }); expect(localStorage.getItem("petsapp_pet_guest")).toBeNull();
});
