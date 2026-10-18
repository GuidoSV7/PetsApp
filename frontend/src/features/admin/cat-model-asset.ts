/** Persisted custom pet mesh for admin Diseño 3D (IndexedDB). */

export const CAT_MODEL_DB_NAME = "petsapp-cat-model";
export const CAT_MODEL_STORE = "assets";
export const CAT_MODEL_KEY = "active";
export const MAX_GLB_BYTES = 12 * 1024 * 1024;

export type CatModelKind = "procedural" | "glb";

export type CatModelAsset = {
  kind: CatModelKind;
  fileName?: string;
  mimeType?: string;
  /** data: URL of the GLB/GLTF bytes when kind === "glb". */
  dataUrl?: string;
};

export function defaultCatModelAsset(): CatModelAsset {
  return { kind: "procedural" };
}

export function isAcceptedModelFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".glb") || name.endsWith(".gltf")) return true;
  return (
    file.type === "model/gltf-binary" ||
    file.type === "model/gltf+json" ||
    file.type === "application/octet-stream"
  ) && (name.endsWith(".glb") || name.endsWith(".gltf"));
}

export function assertModelFileSize(file: File): void {
  if (file.size > MAX_GLB_BYTES) {
    throw new Error(
      `El archivo supera ${Math.round(MAX_GLB_BYTES / (1024 * 1024))} MB.`,
    );
  }
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("No se pudo leer el archivo."));
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }
    const request = indexedDB.open(CAT_MODEL_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CAT_MODEL_STORE)) {
        db.createObjectStore(CAT_MODEL_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("No se pudo abrir IndexedDB"));
  });
}

export async function loadCatModelAsset(): Promise<CatModelAsset> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CAT_MODEL_STORE, "readonly");
      const store = tx.objectStore(CAT_MODEL_STORE);
      const req = store.get(CAT_MODEL_KEY);
      req.onsuccess = () => {
        const value = req.result as CatModelAsset | undefined;
        if (
          value &&
          value.kind === "glb" &&
          typeof value.dataUrl === "string" &&
          value.dataUrl.length > 0
        ) {
          resolve(value);
        } else {
          resolve(defaultCatModelAsset());
        }
      };
      req.onerror = () =>
        reject(req.error ?? new Error("No se pudo leer el modelo"));
      tx.oncomplete = () => db.close();
    });
  } catch {
    return defaultCatModelAsset();
  }
}

export async function saveCatModelAsset(
  asset: CatModelAsset,
): Promise<CatModelAsset> {
  const next: CatModelAsset =
    asset.kind === "glb" && asset.dataUrl
      ? {
          kind: "glb",
          fileName: asset.fileName,
          mimeType: asset.mimeType,
          dataUrl: asset.dataUrl,
        }
      : defaultCatModelAsset();

  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(CAT_MODEL_STORE, "readwrite");
    tx.objectStore(CAT_MODEL_STORE).put(next, CAT_MODEL_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () =>
      reject(tx.error ?? new Error("No se pudo guardar el modelo"));
  });
  return next;
}

export async function clearCatModelAsset(): Promise<void> {
  await saveCatModelAsset(defaultCatModelAsset());
}

/** Broadcast so the home stage can reload without a full refresh. */
export const CAT_MODEL_CHANGED_EVENT = "petsapp:cat-model-changed";

export function notifyCatModelChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CAT_MODEL_CHANGED_EVENT));
}
