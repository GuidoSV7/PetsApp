import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const MAX_GLOBAL_PET_MODEL_BYTES = 12 * 1024 * 1024;
export const DEFAULT_GLOBAL_MODEL_SCALE = 0.78;
export const GLOBAL_PET_MODEL_FILE_PATH = "/pet/model/file";

export type GlobalPetModelKind = "procedural" | "glb";

export type GlobalPetModelMeta = {
  kind: GlobalPetModelKind;
  modelScale: number;
  fileName: string | null;
  mimeType: string | null;
  updatedAt: string;
  fileUrl: string | null;
};

type StoredMeta = {
  kind: GlobalPetModelKind;
  modelScale: number;
  fileName: string | null;
  mimeType: string | null;
  updatedAt: string;
};

const META_FILE = "meta.json";
const MODEL_FILE = "active.glb";

function clampScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_GLOBAL_MODEL_SCALE;
  return Math.min(2.5, Math.max(0.2, value));
}

function defaultStored(): StoredMeta {
  return {
    kind: "procedural",
    modelScale: DEFAULT_GLOBAL_MODEL_SCALE,
    fileName: null,
    mimeType: null,
    updatedAt: new Date(0).toISOString(),
  };
}

function toPublic(meta: StoredMeta): GlobalPetModelMeta {
  return {
    ...meta,
    fileUrl: meta.kind === "glb" ? GLOBAL_PET_MODEL_FILE_PATH : null,
  };
}

export function resolvePetModelStoreDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.PET_MODEL_DIR?.trim();
  if (configured) return configured;
  return join(tmpdir(), "petsapp-pet-model");
}

function isAcceptedModelName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".glb") || lower.endsWith(".gltf");
}

function guessMime(name: string): string {
  return name.toLowerCase().endsWith(".gltf")
    ? "model/gltf+json"
    : "model/gltf-binary";
}

export class GlobalPetModelStore {
  constructor(private readonly dir: string = resolvePetModelStoreDir()) {
    mkdirSync(this.dir, { recursive: true });
  }

  getMeta(): GlobalPetModelMeta {
    return toPublic(this.readStored());
  }

  getFileBuffer(): { buffer: Buffer; mimeType: string; fileName: string } {
    const meta = this.readStored();
    if (meta.kind !== "glb") {
      throw new StoreNotFoundError("No hay modelo 3D global");
    }
    const path = join(this.dir, MODEL_FILE);
    if (!existsSync(path)) {
      throw new StoreNotFoundError("No hay modelo 3D global");
    }
    return {
      buffer: readFileSync(path),
      mimeType: meta.mimeType ?? "model/gltf-binary",
      fileName: meta.fileName ?? "pet.glb",
    };
  }

  saveModel(input: {
    modelScale: number;
    file?: { buffer: Buffer; originalname: string; mimetype?: string };
  }): GlobalPetModelMeta {
    const modelScale = clampScale(input.modelScale);
    const current = this.readStored();

    if (input.file) {
      if (input.file.buffer.byteLength > MAX_GLOBAL_PET_MODEL_BYTES) {
        throw new StoreBadRequestError(
          `El archivo supera ${Math.round(MAX_GLOBAL_PET_MODEL_BYTES / (1024 * 1024))} MB.`,
        );
      }
      if (!isAcceptedModelName(input.file.originalname)) {
        throw new StoreBadRequestError(
          "Solo se aceptan archivos .glb o .gltf.",
        );
      }
      mkdirSync(this.dir, { recursive: true });
      writeFileSync(join(this.dir, MODEL_FILE), input.file.buffer);
      const next: StoredMeta = {
        kind: "glb",
        modelScale,
        fileName: input.file.originalname,
        mimeType: input.file.mimetype || guessMime(input.file.originalname),
        updatedAt: new Date().toISOString(),
      };
      this.writeStored(next);
      return toPublic(next);
    }

    const next: StoredMeta = {
      ...current,
      modelScale,
      updatedAt: new Date().toISOString(),
    };
    this.writeStored(next);
    return toPublic(next);
  }

  clearModel(): GlobalPetModelMeta {
    const path = join(this.dir, MODEL_FILE);
    if (existsSync(path)) unlinkSync(path);
    const next = defaultStored();
    next.updatedAt = new Date().toISOString();
    this.writeStored(next);
    return toPublic(next);
  }

  private metaPath() {
    return join(this.dir, META_FILE);
  }

  private readStored(): StoredMeta {
    const path = this.metaPath();
    if (!existsSync(path)) return defaultStored();
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as Partial<StoredMeta>;
      const kind: GlobalPetModelKind =
        raw.kind === "glb" && existsSync(join(this.dir, MODEL_FILE))
          ? "glb"
          : "procedural";
      return {
        kind,
        modelScale: clampScale(Number(raw.modelScale)),
        fileName: kind === "glb" ? (raw.fileName ?? "pet.glb") : null,
        mimeType:
          kind === "glb" ? (raw.mimeType ?? "model/gltf-binary") : null,
        updatedAt:
          typeof raw.updatedAt === "string"
            ? raw.updatedAt
            : new Date(0).toISOString(),
      };
    } catch {
      return defaultStored();
    }
  }

  private writeStored(meta: StoredMeta) {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.metaPath(), JSON.stringify(meta, null, 2), "utf8");
  }
}

export class StoreNotFoundError extends Error {
  readonly status = 404;
}

export class StoreBadRequestError extends Error {
  readonly status = 400;
}
