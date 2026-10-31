/** @vitest-environment jsdom */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PetHomeStage } from "@/features/pet-home/components/PetHomeStage";
import { clearSession, invalidateSessionOwner, savePetsAppSession } from "@/stores/auth-session";
import { createApiPetState } from "./pet-api-stub";
const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get, post } }));
vi.mock("next/dynamic", () => ({ default: () => ({ onPetInteract }: { onPetInteract: () => void }) => <button onClick={onPetInteract}>Pet interaction</button> }));
vi.mock("@/features/pet-home/pet-purr", () => ({ createPurrPlayer: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/features/pet-home/components/PersonalizeStrip", () => ({ PersonalizeStrip: ({ disabled, onSelectCoat, onOpenCamera }: { disabled: boolean; onSelectCoat: (x: object) => void; onOpenCamera: () => void }) => <><button disabled={disabled} onClick={() => onSelectCoat({ primary: "#112233", secondary: "#445566", accent: "#778899", pattern: "calico" })}>Preset</button><button disabled={disabled} onClick={onOpenCamera}>Camera</button></> }));
vi.mock("@/features/pet-home/components/CameraCoatCapture", () => ({ CameraCoatCapture: ({ open, onColors }: { open: boolean; onColors: (x: object) => void }) => open ? <button onClick={() => onColors({ primary: "#112233", secondary: "#445566", accent: "#778899" })}>Capture</button> : null }));
const user = { id: "fence-owner", name: "Ada", email: "ada@example.test", role: "member" as const, roles: ["member" as const], country: null };
beforeEach(() => { localStorage.clear(); clearSession(); get.mockReset(); post.mockReset(); savePetsAppSession({ user, token: "jwt" }); vi.stubEnv("NEXT_PUBLIC_ACCOUNT_PET_ENABLED", "true"); get.mockResolvedValue({ data: createApiPetState() }); post.mockResolvedValue({ data: { status: "confirmed", petId: "pet", coins: 0 } }); });
afterEach(() => { cleanup(); clearSession(); vi.unstubAllEnvs(); });
async function ready() { await waitFor(() => expect((screen.getByRole("button", { name: "Alimentar" }) as HTMLButtonElement).disabled).toBe(false)); }
const actions = [
 ["Alimentar", "actions/feed", {}], ["Jugar", "actions/play", {}], ["Dormir", "actions/sleep", {}], ["Bañar", "actions/bathe", {}], ["Pet interaction", "actions/pet", {}],
 ["Preset", "coat", { primary: "#112233", secondary: "#445566", accent: "#778899", pattern: "calico" }],
 ["Capture", "coat", { primary: "#112233", secondary: "#445566", accent: "#778899" }], ["Guardar", "name", { name: "Luna" }],
] as const;
function trigger(button: string) {
 if (button === "Capture") fireEvent.click(screen.getByRole("button", { name: "Camera" }));
 if (button === "Guardar") { fireEvent.click(screen.getByRole("button", { name: /Editar nombre/ })); const input = screen.getByLabelText("Nombre") as HTMLInputElement; fireEvent.change(input, { target: { value: input.value === "Luna" ? "Nube" : "Luna" } }); }
 fireEvent.click(screen.getByRole("button", { name: button }));
}
it.each(actions)("preserves private %s serialization/effects and fences late response after unmount", async (button, path, body) => {
 const coins = vi.fn(); const view = render(<PetHomeStage ownerId={user.id} onCoinsChange={coins} />); await ready(); post.mockClear();
 post.mockResolvedValueOnce({ data: { ...createApiPetState(), name: "Luna", coins: 37, statusKey: "fed" } }); trigger(button); await ready(); expect(post).toHaveBeenCalledExactlyOnceWith(`/account/pet/${path}`, body, { signal: expect.any(AbortSignal) }); expect(coins).toHaveBeenLastCalledWith(37);
 let finish!: (x: unknown) => void; post.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })); trigger(button); const signal = post.mock.lastCall?.[2].signal as AbortSignal; view.unmount(); coins.mockClear();
 await act(async () => { finish({ data: { ...createApiPetState(), coins: 999 } }); }); expect(signal.aborted).toBe(true); expect(coins).not.toHaveBeenCalled();
});
it.each(["bootstrap", "GET"])("fences late %s, including follow-up GETs and guest-key cleanup", async phase => {
 const key = "11111111-1111-4111-8111-111111111111"; localStorage.setItem("petsapp_pet_guest", key); let finish!: (x: unknown) => void;
 (phase === "bootstrap" ? post : get).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
 const coins = vi.fn(); render(<PetHomeStage ownerId={user.id} onCoinsChange={coins} />); await waitFor(() => expect(phase === "bootstrap" ? post : get).toHaveBeenCalled()); act(() => { invalidateSessionOwner(); });
 await act(async () => { finish({ data: phase === "bootstrap" ? { status: "confirmed", petId: "old", coins: 999 } : { ...createApiPetState(), coins: 999 } }); }); expect(coins).not.toHaveBeenCalled(); if (phase === "bootstrap") { expect(get).not.toHaveBeenCalled(); expect(localStorage.getItem("petsapp_pet_guest")).toBe(key); }
});
