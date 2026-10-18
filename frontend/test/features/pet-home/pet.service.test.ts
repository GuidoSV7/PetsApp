/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { getOrCreateGuestKey } from "@/features/pet-home/api/pet.service";

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
