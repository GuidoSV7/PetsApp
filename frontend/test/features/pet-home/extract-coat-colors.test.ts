import { describe, it, expect } from "vitest";
import {
  DEFAULT_GREY_COAT,
  cropCenterImageData,
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

/** Edge ring = background, center ellipse = subject fur. */
function subjectOnBackground(
  width: number,
  height: number,
  subject: [number, number, number],
  background: [number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = width * 0.28;
  const ry = height * 0.28;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const inSubject = nx * nx + ny * ny <= 1;
      const [r, g, b] = inSubject ? subject : background;
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
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
      twoToneImageData(20, 20, [95, 88, 82], [196, 150, 110]),
    );
    expect(colorDistance(coat.primary, rgbToHex(95, 88, 82))).toBeLessThan(45);
    expect(colorDistance(coat.secondary, rgbToHex(196, 150, 110))).toBeLessThan(
      55,
    );
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

  it("prefers center subject color over edge background", () => {
    const coat = extractCoatColors(
      subjectOnBackground(48, 48, [150, 95, 50], [70, 130, 200]),
    );
    expect(colorDistance(coat.primary, rgbToHex(150, 95, 50))).toBeLessThan(50);
    expect(colorDistance(coat.primary, rgbToHex(70, 130, 200))).toBeGreaterThan(
      70,
    );
  });

  it("does not pick grass green when orange fur is centered", () => {
    const coat = extractCoatColors(
      subjectOnBackground(56, 56, [210, 120, 45], [55, 160, 70]),
    );
    expect(colorDistance(coat.primary, rgbToHex(210, 120, 45))).toBeLessThan(55);
    const primary = hexToRgb(coat.primary);
    expect(primary.g).toBeLessThan(primary.r);
  });

  it("accepts mid-dark grey fur", () => {
    const coat = extractCoatColors(
      solidImageData(24, 24, [70, 72, 78, 255]),
    );
    expect(colorDistance(coat.primary, rgbToHex(70, 72, 78))).toBeLessThan(35);
  });

  it("keeps red/yellow calico spots instead of collapsing to black", () => {
    // Phone photos: blown-out cream (filtered out) + large shadows/black + spots.
    const blownCream: [number, number, number] = [252, 250, 246];
    const yellow: [number, number, number] = [220, 170, 55];
    const red: [number, number, number] = [180, 70, 40];
    const shadowBlack: [number, number, number] = [28, 24, 22];
    const coat = extractCoatColors(
      calicoSpotsImage(72, 72, blownCream, yellow, red, shadowBlack),
    );
    const primary = hexToRgb(coat.primary);
    const primaryLum =
      0.2126 * primary.r + 0.7152 * primary.g + 0.0722 * primary.b;
    expect(primaryLum).toBeGreaterThan(60);
    expect(
      colorDistance(coat.primary, rgbToHex(...shadowBlack)),
    ).toBeGreaterThan(70);

    const nearYellow =
      colorDistance(coat.secondary, rgbToHex(...yellow)) < 75 ||
      colorDistance(coat.accent, rgbToHex(...yellow)) < 75 ||
      colorDistance(coat.primary, rgbToHex(...yellow)) < 75;
    const nearRed =
      colorDistance(coat.secondary, rgbToHex(...red)) < 75 ||
      colorDistance(coat.accent, rgbToHex(...red)) < 75 ||
      colorDistance(coat.primary, rgbToHex(...red)) < 75;
    expect(nearYellow).toBe(true);
    expect(nearRed).toBe(true);
  });
});

/**
 * Blown cream field + large dark patches + yellow/red spots.
 * Mirrors phone calico shots where highlights clip and shadows steal the vote.
 */
function calicoSpotsImage(
  width: number,
  height: number,
  cream: [number, number, number],
  yellow: [number, number, number],
  red: [number, number, number],
  black: [number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      let rgb = cream;
      // Large dark patches (would steal primary without chroma bias)
      if (
        (dx + 4) ** 2 + (dy - 2) ** 2 < 220 ||
        (dx - 10) ** 2 + (dy + 8) ** 2 < 160
      ) {
        rgb = black;
      }
      // Yellow spots
      if (
        (dx - 8) ** 2 + (dy + 12) ** 2 < 70 ||
        (dx + 14) ** 2 + (dy + 2) ** 2 < 55
      ) {
        rgb = yellow;
      }
      // Red / orange spots
      if (
        (dx + 4) ** 2 + (dy - 14) ** 2 < 65 ||
        (dx - 12) ** 2 + (dy - 4) ** 2 < 50
      ) {
        rgb = red;
      }
      const i = (y * width + x) * 4;
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("cropCenterImageData", () => {
  it("returns a smaller centered crop", () => {
    const source = solidImageData(40, 40, [10, 20, 30, 255]);
    const cropped = cropCenterImageData(source, 0.7);
    expect(cropped.width).toBeLessThan(source.width);
    expect(cropped.height).toBeLessThan(source.height);
    expect(cropped.width).toBeGreaterThanOrEqual(24);
    expect(cropped.data[0]).toBe(10);
  });
});
