import { describe, expect, it } from "vitest";
import {
  MAX_GLB_BYTES,
  assertModelFileSize,
  isAcceptedModelFile,
} from "@/features/admin/cat-model-asset";

describe("cat-model-asset helpers", () => {
  it("accepts .glb and .gltf by name", () => {
    expect(
      isAcceptedModelFile(new File([""], "michi.glb", { type: "" })),
    ).toBe(true);
    expect(
      isAcceptedModelFile(
        new File([""], "michi.gltf", { type: "model/gltf+json" }),
      ),
    ).toBe(true);
    expect(
      isAcceptedModelFile(new File([""], "michi.png", { type: "image/png" })),
    ).toBe(false);
  });

  it("rejects oversized files", () => {
    const big = new File([new Uint8Array(MAX_GLB_BYTES + 1)], "huge.glb");
    expect(() => assertModelFileSize(big)).toThrow(/MB/i);
    const ok = new File([new Uint8Array(16)], "ok.glb");
    expect(() => assertModelFileSize(ok)).not.toThrow();
  });
});
