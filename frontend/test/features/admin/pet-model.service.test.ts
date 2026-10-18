import { describe, expect, it } from "vitest";
import { resolvePetModelFileUrl } from "@/features/admin/pet-model.service";

describe("resolvePetModelFileUrl", () => {
  it("returns null for procedural models", () => {
    expect(
      resolvePetModelFileUrl(
        {
          kind: "procedural",
          fileUrl: null,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
        "http://api.test",
      ),
    ).toBeNull();
  });

  it("builds a cache-busted absolute URL for glb", () => {
    expect(
      resolvePetModelFileUrl(
        {
          kind: "glb",
          fileUrl: "/pet/model/file",
          updatedAt: "2026-10-18T12:00:00.000Z",
        },
        "http://api.test/",
      ),
    ).toBe(
      "http://api.test/pet/model/file?t=2026-10-18T12%3A00%3A00.000Z",
    );
  });
});
