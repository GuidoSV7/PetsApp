/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AdminDesign3DPage } from "@/app/admin/_components/design-3d/AdminDesign3DPage";
import {
  CAT_DESIGN_STORAGE_KEY,
  clearCatDesign,
} from "@/features/admin/cat-design-settings";

vi.mock("next/dynamic", () => ({
  default: () => () => <div role="img" aria-label="Vista previa de Michi" />,
}));

const uploadGlobalPetModel = vi.fn();
const clearGlobalPetModel = vi.fn();
const fetchGlobalPetModel = vi.fn();

vi.mock("@/features/admin/pet-model.service", () => ({
  fetchGlobalPetModel: (...args: unknown[]) => fetchGlobalPetModel(...args),
  uploadGlobalPetModel: (...args: unknown[]) => uploadGlobalPetModel(...args),
  clearGlobalPetModel: (...args: unknown[]) => clearGlobalPetModel(...args),
  resolvePetModelFileUrl: (meta: {
    kind: string;
    fileUrl: string | null;
    updatedAt: string;
  }) =>
    meta.kind === "glb" && meta.fileUrl
      ? `http://api.test${meta.fileUrl}?t=${meta.updatedAt}`
      : null,
}));

vi.mock("@/features/admin/cat-model-asset", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/admin/cat-model-asset")
  >("@/features/admin/cat-model-asset");
  return {
    ...actual,
    notifyCatModelChanged: vi.fn(),
  };
});

describe("AdminDesign3DPage", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock-glb"),
      revokeObjectURL: vi.fn(),
    });
    fetchGlobalPetModel.mockResolvedValue({
      kind: "procedural",
      modelScale: 0.78,
      fileName: null,
      mimeType: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      fileUrl: null,
    });
    uploadGlobalPetModel.mockResolvedValue({
      kind: "procedural",
      modelScale: 0.95,
      fileName: null,
      mimeType: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      fileUrl: null,
    });
    clearGlobalPetModel.mockResolvedValue({
      kind: "procedural",
      modelScale: 0.78,
      fileName: null,
      mimeType: null,
      updatedAt: "2026-01-01T00:00:00.000Z",
      fileUrl: null,
    });
  });

  afterEach(() => {
    cleanup();
    clearCatDesign();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows preview, scale, and confirms changes via the global API", async () => {
    render(<AdminDesign3DPage />);
    expect(
      screen.getByRole("heading", { name: /Diseño 3D/i }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Vista previa/i })).toBeTruthy();
    expect(screen.getByLabelText(/Vista previa de Michi/i)).toBeTruthy();
    expect(screen.getByLabelText(/Elegir modelo \.glb/i)).toBeTruthy();

    const scale = screen.getByLabelText(/Escala del modelo/i);
    fireEvent.change(scale, { target: { value: "0.95" } });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar cambio/i }));
    await waitFor(() => {
      expect(screen.getByText(/Cambio confirmado/i)).toBeTruthy();
    });
    expect(uploadGlobalPetModel).toHaveBeenCalledWith({
      modelScale: 0.95,
      file: null,
    });
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toContain(
      "0.95",
    );
  });

  it("accepts a .glb file into the draft picker label", () => {
    render(<AdminDesign3DPage />);
    const input = screen.getByLabelText(/Elegir modelo \.glb/i);
    const file = new File([new Uint8Array([1, 2, 3])], "nuevo-michi.glb", {
      type: "model/gltf-binary",
    });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText("nuevo-michi.glb")).toBeTruthy();
    expect(screen.queryByLabelText(/Profundidad del cuerpo/i)).toBeNull();
  });

  it("restores defaults via the global API", async () => {
    render(<AdminDesign3DPage />);
    fireEvent.change(screen.getByLabelText(/Escala del modelo/i), {
      target: { value: "1.1" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirmar cambio/i }));
    await waitFor(() => {
      expect(screen.getByText(/Cambio confirmado/i)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole("button", { name: /Restablecer/i }));
    await waitFor(() => {
      expect(screen.getByText(/Diseño restablecido/i)).toBeTruthy();
    });
    expect(clearGlobalPetModel).toHaveBeenCalled();
    expect(window.localStorage.getItem(CAT_DESIGN_STORAGE_KEY)).toBeNull();
  });
});
