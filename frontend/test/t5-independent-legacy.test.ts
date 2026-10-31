/** @vitest-environment jsdom */
// S6/S10/S15: same public guest command contract at accepted baseline and candidate.
import { beforeEach, expect, it, vi } from "vitest";
import { applyPetAction, fetchPetState } from "@/features/pet-home/api/pet.service";
import { createApiPetState } from "./features/pet-home/pet-api-stub";
const http = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() })); vi.mock("@/lib/axios", () => ({ default: http }));
const guest = "66666666-6666-4666-8666-666666666666";
beforeEach(() => { localStorage.clear(); localStorage.setItem("petsapp_pet_guest", guest); http.get.mockReset(); http.post.mockReset(); });
it("keeps legacy guest GET and all care paths, payloads and key bytes unchanged", async () => {
 const raw = createApiPetState(); http.get.mockResolvedValue({ data: raw }); http.post.mockResolvedValue({ data: raw }); const before = JSON.stringify({ ...localStorage }); expect(await fetchPetState()).toEqual(raw);
 for (const action of ["feed", "play", "sleep", "bathe", "pet"] as const) expect(await applyPetAction(action)).toEqual(raw);
 expect(http.get.mock.calls).toEqual([["/pet/state", { headers: { "X-Pet-Guest-Key": guest } }]]); expect(http.post.mock.calls).toEqual(["feed", "play", "sleep", "bathe", "pet"].map(a => [`/pet/actions/${a}`, {}, { headers: { "X-Pet-Guest-Key": guest } }])); expect(JSON.stringify({ ...localStorage })).toBe(before);
});
it("preserves storage and the exact server denial on a rejected guest GET", async () => {
 const failure = { response: { status: 403, data: { message: "GUEST_PET_UNAVAILABLE" } } }; http.get.mockRejectedValue(failure); const before = JSON.stringify({ ...localStorage }); await expect(fetchPetState()).rejects.toBe(failure); expect(JSON.stringify({ ...localStorage })).toBe(before); expect(http.get).toHaveBeenCalledTimes(1); expect(http.post).not.toHaveBeenCalled();
});
