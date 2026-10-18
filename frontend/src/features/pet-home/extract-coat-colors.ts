/** Coat palette applied to the 3D cat materials. */
export type PetCoatColors = {
  primary: string;
  secondary: string;
  accent: string;
};

/** Default grey Michi before the user samples a photo. */
export const DEFAULT_GREY_COAT: PetCoatColors = {
  primary: "#8a8a8e",
  secondary: "#b4b4b8",
  accent: "#c9a0a8",
};

const FALLBACK_ACCENT = "#c9a0a8";
const BUCKET = 32;

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${clamp(r)}${clamp(g)}${clamp(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function isUsablePixel(r: number, g: number, b: number, a: number): boolean {
  if (a < 200) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (lum < 28 || lum > 235) return false;
  if (max - min < 12 && (lum < 50 || lum > 210)) return false;
  return true;
}

type Bucket = { r: number; g: number; b: number; count: number };

/**
 * Samples mid-tone pixels from an image and returns a 3-stop coat palette.
 * Deterministic; ignores near-black / near-white background.
 */
export function extractCoatColors(image: ImageData): PetCoatColors {
  const buckets = new Map<string, Bucket>();
  const { data, width, height } = image;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 48));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (!isUsablePixel(r, g, b, a)) continue;
      const key = `${Math.floor(r / BUCKET)}:${Math.floor(g / BUCKET)}:${Math.floor(b / BUCKET)}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.r += r;
        existing.g += g;
        existing.b += b;
        existing.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }
  }

  const ranked = [...buckets.values()]
    .map((bucket) => ({
      count: bucket.count,
      r: bucket.r / bucket.count,
      g: bucket.g / bucket.count,
      b: bucket.b / bucket.count,
    }))
    .sort((a, b) => b.count - a.count);

  if (ranked.length === 0) {
    return { ...DEFAULT_GREY_COAT };
  }

  const primary = ranked[0]!;
  const secondary = ranked[1] ?? {
    r: Math.min(255, primary.r + 28),
    g: Math.min(255, primary.g + 28),
    b: Math.min(255, primary.b + 28),
  };

  const warm =
    ranked.find((c, index) => {
      if (index < 2) return false;
      return c.r > c.g + 8 && c.r > c.b + 8;
    }) ?? null;

  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
    accent: warm
      ? rgbToHex(warm.r, warm.g, warm.b)
      : FALLBACK_ACCENT,
  };
}
