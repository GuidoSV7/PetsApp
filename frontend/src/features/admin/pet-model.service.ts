import api, { getPetsAppBaseUrl } from "@/lib/axios";

export type GlobalPetModelKind = "procedural" | "glb";

export type GlobalPetModelMeta = {
  kind: GlobalPetModelKind;
  modelScale: number;
  fileName: string | null;
  mimeType: string | null;
  updatedAt: string;
  fileUrl: string | null;
};

/** Absolute URL for the shared GLB, or null when procedural. */
export function resolvePetModelFileUrl(
  meta: Pick<GlobalPetModelMeta, "kind" | "fileUrl" | "updatedAt">,
  baseUrl: string = getPetsAppBaseUrl(),
): string | null {
  if (meta.kind !== "glb" || !meta.fileUrl) return null;
  const base = baseUrl.replace(/\/$/, "");
  const path = meta.fileUrl.startsWith("/")
    ? meta.fileUrl
    : `/${meta.fileUrl}`;
  const stamp = encodeURIComponent(meta.updatedAt || "0");
  return `${base}${path}?t=${stamp}`;
}

export async function fetchGlobalPetModel(): Promise<GlobalPetModelMeta> {
  const { data } = await api.get<GlobalPetModelMeta>("/pet/model");
  return data;
}

export async function uploadGlobalPetModel(input: {
  modelScale: number;
  file?: File | null;
}): Promise<GlobalPetModelMeta> {
  const form = new FormData();
  form.append("modelScale", String(input.modelScale));
  if (input.file) form.append("file", input.file, input.file.name);
  // POST is the multer-native verb; PUT alias remains on the API for older clients.
  const { data } = await api.post<GlobalPetModelMeta>(
    "/admin/pet-model",
    form,
    {
      // GLBs can be several MB; do not use the default 30s JSON timeout.
      timeout: 120_000,
      transformRequest: [
        (body, headers) => {
          // Drop the axios default application/json so the browser sets multipart boundary.
          if (headers && typeof headers === "object") {
            delete (headers as Record<string, unknown>)["Content-Type"];
          }
          return body;
        },
      ],
    },
  );
  return data;
}

export async function clearGlobalPetModel(): Promise<GlobalPetModelMeta> {
  const { data } = await api.delete<GlobalPetModelMeta>("/admin/pet-model");
  return data;
}
