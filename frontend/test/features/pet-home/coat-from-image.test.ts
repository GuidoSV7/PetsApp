/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { coatColorsFromFile } from "@/features/pet-home/coat-from-image";
import { hexToRgb, rgbToHex } from "@/features/pet-home/extract-coat-colors";

function colorDistance(a: string, b: string) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b);
}

function solidImageData(
  width: number,
  height: number,
  rgba: [number, number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("coatColorsFromFile", () => {
  beforeEach(() => {
    const imageData = solidImageData(8, 8, [140, 90, 55, 255]);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
      getImageData: () => imageData,
    } as unknown as CanvasRenderingContext2D);

    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({
        width: 8,
        height: 8,
        close: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects non-image files", async () => {
    const file = new File(["hi"], "notes.txt", { type: "text/plain" });
    await expect(coatColorsFromFile(file)).rejects.toThrow(/imagen/i);
  });

  it("extracts a primary close to a solid brown image", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "cat.png", {
      type: "image/png",
    });
    const coat = await coatColorsFromFile(file);
    expect(colorDistance(coat.primary, rgbToHex(140, 90, 55))).toBeLessThan(40);
  });
});
