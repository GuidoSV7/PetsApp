import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_GLOBAL_MODEL_SCALE,
  GLOBAL_PET_MODEL_FILE_PATH,
  GlobalPetModelStore,
  MAX_GLOBAL_PET_MODEL_BYTES,
  StoreBadRequestError,
  StoreNotFoundError,
  resolvePetModelStoreDir,
} from "@/lib/global-pet-model-store";

describe("resolvePetModelStoreDir", () => {
  it("prefers PET_MODEL_DIR", () => {
    expect(resolvePetModelStoreDir({ PET_MODEL_DIR: "/data/pet" })).toBe(
      "/data/pet",
    );
  });
});

describe("GlobalPetModelStore", () => {
  let dir: string;
  let store: GlobalPetModelStore;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "petsapp-fe-pet-model-"));
    store = new GlobalPetModelStore(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("defaults to procedural", () => {
    const meta = store.getMeta();
    expect(meta.kind).toBe("procedural");
    expect(meta.modelScale).toBe(DEFAULT_GLOBAL_MODEL_SCALE);
    expect(meta.fileUrl).toBeNull();
  });

  it("persists a GLB for every reader", () => {
    const buffer = Buffer.from([1, 2, 3]);
    const saved = store.saveModel({
      modelScale: 1.2,
      file: {
        buffer,
        originalname: "michi.glb",
        mimetype: "model/gltf-binary",
      },
    });
    expect(saved.kind).toBe("glb");
    expect(saved.fileUrl).toBe(GLOBAL_PET_MODEL_FILE_PATH);

    const again = new GlobalPetModelStore(dir);
    expect(again.getMeta().kind).toBe("glb");
    expect(again.getFileBuffer().buffer.equals(buffer)).toBe(true);
  });

  it("clears back to procedural", () => {
    store.saveModel({
      modelScale: 1,
      file: { buffer: Buffer.from("x"), originalname: "x.glb" },
    });
    expect(store.clearModel().kind).toBe("procedural");
    expect(() => store.getFileBuffer()).toThrow(StoreNotFoundError);
  });

  it("rejects oversized and bad extensions", () => {
    expect(() =>
      store.saveModel({
        modelScale: 1,
        file: {
          buffer: Buffer.alloc(MAX_GLOBAL_PET_MODEL_BYTES + 1),
          originalname: "huge.glb",
        },
      }),
    ).toThrow(StoreBadRequestError);
    expect(() =>
      store.saveModel({
        modelScale: 1,
        file: { buffer: Buffer.from("x"), originalname: "cat.png" },
      }),
    ).toThrow(StoreBadRequestError);
  });
});
