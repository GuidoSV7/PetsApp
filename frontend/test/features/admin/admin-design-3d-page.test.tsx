/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminDesign3DPage } from "@/app/admin/_components/design-3d/AdminDesign3DPage";
import {
  clearCatDesign,
  defaultCatDesign,
  loadCatDesign,
  saveCatDesign,
  type CatDesignTunables,
} from "@/features/admin/cat-design-settings";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/axios", () => ({
  default: { get: request, post: request, put: request, delete: request },
  getPetsAppBaseUrl: () => "http://api.test",
}));

vi.mock("next/dynamic", () => ({
  default: () => ({ design }: { design: CatDesignTunables }) => (
    <div role="img" aria-label="Vista previa de Michi" data-design={JSON.stringify(design)} />
  ),
}));

const controls = [
  { label: /Escala del modelo/i, key: "modelScale", value: 0.95, min: "0.2", max: "2.5" },
  { label: /Profundidad del cuerpo/i, key: "bodyDepth", value: 1.3, min: "0.7", max: "1.6" },
  { label: /Altura de la cabeza/i, key: "headHeight", value: 0.15, min: "-0.15", max: "0.25" },
  { label: /Tamaño de orejas/i, key: "earSize", value: 1.4, min: "0.6", max: "1.6" },
] as const;
const previewDesign = () => JSON.parse(screen.getByRole("img", { name: /Vista previa de Michi/i }).getAttribute("data-design")!);

beforeEach(() => {
  clearCatDesign();
  request.mockReset();
  request.mockResolvedValue({ data: { kind: "procedural", modelScale: 0.78, fileUrl: null } });
});
afterEach(() => { cleanup(); clearCatDesign(); vi.unstubAllGlobals(); });

describe("AdminDesign3DPage", () => {
  it("shows a browser-only procedural preview without global controls or requests", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<AdminDesign3DPage />);
    await waitFor(() => expect(screen.getByRole("img", { name: /Vista previa de Michi/i })).toBeTruthy());
    expect(screen.getByRole("heading", { name: /Diseño 3D/i })).toBeTruthy();
    expect(screen.getByRole("heading", { name: /Vista previa/i })).toBeTruthy();
    expect(screen.getAllByRole("slider")).toHaveLength(4);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Confirmar/i })).toBeNull();
    expect(screen.getByText("Vista previa local. Los ajustes se guardan solo en este navegador y no cambian el gato del inicio.")).toBeTruthy();
    expect(screen.queryByText(/para todos|publica para/i)).toBeNull();
    expect(request).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("persists each slider immediately, updates preview and retains values across remount", async () => {
    let view = render(<AdminDesign3DPage />);
    await waitFor(() => expect(previewDesign()).toEqual(defaultCatDesign()));
    const expected = defaultCatDesign();
    for (const control of controls) {
      const slider = screen.getByLabelText(control.label) as HTMLInputElement;
      expect(slider.min).toBe(control.min);
      expect(slider.max).toBe(control.max);
      expect(slider.step).toBe("0.01");
      fireEvent.change(slider, { target: { value: String(control.value) } });
      expected[control.key] = control.value;
      expect(previewDesign()).toEqual(expected);
      expect(loadCatDesign()).toEqual(expected);
      view.unmount();
      view = render(<AdminDesign3DPage />);
      await waitFor(() => expect(previewDesign()).toEqual(expected));
      expect((screen.getByLabelText(control.label) as HTMLInputElement).value).toBe(String(control.value));
    }
    expect(request).not.toHaveBeenCalled();
  });

  it("resets preview, sliders and local saved values without publishing or deleting a model", async () => {
    const unrelatedKey = "petsapp.retirement-test.unrelated";
    const unrelatedValue = '{"legacyAsset":"keep-byte-for-byte"}';
    localStorage.setItem(unrelatedKey, unrelatedValue);
    saveCatDesign({ modelScale: 1.1, bodyDepth: 1.3, headHeight: 0.2, earSize: 1.4 });
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const view = render(<AdminDesign3DPage />);
    fireEvent.click(screen.getByRole("button", { name: /Restablecer/i }));
    await waitFor(() => expect(previewDesign()).toEqual(defaultCatDesign()));
    expect(loadCatDesign()).toEqual(defaultCatDesign());
    expect(screen.getByText(/Diseño restablecido/i)).toBeTruthy();
    view.unmount();
    render(<AdminDesign3DPage />);
    expect(previewDesign()).toEqual(defaultCatDesign());
    for (const control of controls) {
      expect((screen.getByLabelText(control.label) as HTMLInputElement).value).toBe(String(defaultCatDesign()[control.key]));
    }
    expect(localStorage.getItem(unrelatedKey)).toBe(unrelatedValue);
    localStorage.removeItem(unrelatedKey);
    expect(request).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    dispatch.mockRestore();
  });
});
