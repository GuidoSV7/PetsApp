import { describe, it, expect } from "vitest";
import {
  DEFAULT_GREY_COAT,
  extractCoatColors,
  hexToRgb,
  rgbToHex,
} from "@/features/pet-home/extract-coat-colors";

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

function twoToneImageData(
  width: number,
  height: number,
  majority: [number, number, number],
  minority: [number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const total = width * height;
  const majorityCount = Math.floor(total * 0.7);
  for (let p = 0; p < total; p++) {
    const [r, g, b] = p < majorityCount ? majority : minority;
    const i = p * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

function colorDistance(a: string, b: string) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return Math.hypot(A.r - B.r, A.g - B.g, A.b - B.b);
}

describe("extractCoatColors", () => {
  it("exposes a grey default coat", () => {
    expect(DEFAULT_GREY_COAT.primary.toLowerCase()).toBe("#8a8a8e");
    expect(DEFAULT_GREY_COAT.secondary.toLowerCase()).toBe("#b4b4b8");
  });

  it("returns a primary close to a solid mid brown fill", () => {
    const brown: [number, number, number, number] = [140, 90, 55, 255];
    const coat = extractCoatColors(solidImageData(16, 16, brown));
    expect(colorDistance(coat.primary, rgbToHex(140, 90, 55))).toBeLessThan(40);
  });

  it("maps majority and minority mid colors to primary and secondary", () => {
    const coat = extractCoatColors(
      twoToneImageData(20, 20, [60, 110, 160], [180, 120, 70]),
    );
    expect(colorDistance(coat.primary, rgbToHex(60, 110, 160))).toBeLessThan(45);
    expect(colorDistance(coat.secondary, rgbToHex(180, 120, 70))).toBeLessThan(55);
  });

  it("ignores near-white and near-black pixels", () => {
    const data = new Uint8ClampedArray(8 * 8 * 4);
    for (let p = 0; p < 64; p++) {
      const i = p * 4;
      if (p < 50) {
        data[i] = 250;
        data[i + 1] = 250;
        data[i + 2] = 250;
      } else if (p < 58) {
        data[i] = 5;
        data[i + 1] = 5;
        data[i + 2] = 5;
      } else {
        data[i] = 120;
        data[i + 1] = 80;
        data[i + 2] = 50;
      }
      data[i + 3] = 255;
    }
    const coat = extractCoatColors({
      data,
      width: 8,
      height: 8,
      colorSpace: "srgb",
    } as ImageData);
    expect(colorDistance(coat.primary, rgbToHex(120, 80, 50))).toBeLessThan(45);
  });
});
