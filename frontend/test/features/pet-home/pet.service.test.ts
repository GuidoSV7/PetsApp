/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyPetAction, applyPetCoat, fetchPetState, getOrCreateGuestKey, renamePet } from "@/features/pet-home/api/pet.service";
import type { PetCoatInput } from "@/features/pet-home/coat-patterns";
import { createApiPetState, stubApplyCoat } from "./pet-api-stub";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { get, post } }));
const colors = { primary: "#112233", secondary: "#445566", accent: "#778899" };
const guest = "11111111-1111-4111-8111-111111111111";

const operations = [
  { name: "GET", endpoint: "/pet/state", body: undefined, call: () => fetchPetState() },
  { name: "preset save", endpoint: "/pet/coat", body: { ...colors, pattern: "calico" }, call: () => applyPetCoat({ ...colors, pattern: "calico" } as PetCoatInput) },
  { name: "colors-only save", endpoint: "/pet/coat", body: colors, call: () => applyPetCoat(colors) },
  { name: "care", endpoint: "/pet/actions/feed", body: {}, call: () => applyPetAction("feed") },
  { name: "rename", endpoint: "/pet/name", body: { name: "Luna" }, call: () => renamePet("Luna") },
];

describe("pet state boundary (S11/S12)", () => {
  afterEach(() => { get.mockReset(); post.mockReset(); window.localStorage.clear(); });

  for (const operation of operations) {
    it.each(["solid", "tabby", "tuxedo", "calico", "pointed", undefined, null, "zebra"])(`${operation.name} normalizes response pattern %s without changing unrelated data or request`, async (pattern) => {
      window.localStorage.setItem("petsapp_pet_guest", guest);
      const raw = { ...createApiPetState(), extra: { retained: true }, coat: { ...colors, ...(pattern === undefined ? {} : { pattern }) } };
      const original = structuredClone(raw);
      get.mockResolvedValueOnce({ data: raw });
      post.mockResolvedValueOnce({ data: raw });
      const result = await operation.call();
      const expectedPattern = typeof pattern === "string" && pattern !== "zebra" ? pattern : "solid";
      expect(result).toEqual({ ...original, coat: { ...colors, pattern: expectedPattern } });
      expect(raw).toEqual(original);
      const headers = { headers: { "X-Pet-Guest-Key": guest } };
      if (operation.body === undefined) expect(get).toHaveBeenCalledExactlyOnceWith(operation.endpoint, headers);
      else expect(post).toHaveBeenCalledExactlyOnceWith(operation.endpoint, operation.body, headers);
    });
  }

  it("serializes only three colors and an explicitly supplied pattern, never unrelated coat fields", async () => {
    post.mockResolvedValue({ data: createApiPetState() });
    const input = { ...colors, pattern: "calico" as const, extra: "not a coat field" };
    await applyPetCoat(input);
    expect(post.mock.lastCall?.[1]).toEqual({ ...colors, pattern: "calico" });
    await applyPetCoat({ ...colors, extra: "not a coat field" } as PetCoatInput);
    expect(post.mock.lastCall?.[1]).toEqual(colors);
    expect(Object.hasOwn(post.mock.lastCall?.[1], "pattern")).toBe(false);
  });

  it("does not silently normalize invalid writes to solid or change saved state on rejection", async () => {
    const state = createApiPetState();
    get.mockResolvedValue({ data: state });
    const before = await fetchPetState();
    post.mockRejectedValueOnce(new Error("Invalid pattern"));
    await expect(applyPetCoat({ ...colors, pattern: "zebra" } as unknown as PetCoatInput)).rejects.toThrow("Invalid pattern");
    expect(post.mock.lastCall?.[1]).toEqual({ ...colors, pattern: "zebra" });
    expect(await fetchPetState()).toEqual(before);
  });

  it("keeps saved calico after a colors-only camera save and subsequent GET", async () => {
    let saved = { ...createApiPetState(), coat: { ...colors, pattern: "calico" as const } };
    post.mockImplementationOnce(async (_url, coat) => {
      expect(coat).toEqual(colors);
      expect(Object.hasOwn(coat, "pattern")).toBe(false);
      saved = stubApplyCoat(saved, coat) as typeof saved;
      return { data: structuredClone(saved) };
    });
    get.mockImplementationOnce(async () => ({ data: structuredClone(saved) }));
    expect((await applyPetCoat(colors)).coat).toEqual({ ...colors, pattern: "calico" });
    expect((await fetchPetState()).coat).toEqual({ ...colors, pattern: "calico" });
  });
});

describe("getOrCreateGuestKey", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("creates and persists a UUID guest key", () => {
    const key = getOrCreateGuestKey();
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(window.localStorage.getItem("petsapp_pet_guest")).toBe(key);
    expect(getOrCreateGuestKey()).toBe(key);
  });

  it("replaces an invalid stored key", () => {
    window.localStorage.setItem("petsapp_pet_guest", "not-a-uuid");
    const key = getOrCreateGuestKey();
    expect(key).not.toBe("not-a-uuid");
    expect(window.localStorage.getItem("petsapp_pet_guest")).toBe(key);
  });
});
