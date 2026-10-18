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
const BUCKET = 24;
const MIN_SECONDARY_DISTANCE = 28;

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

function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function colorDist(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Drop sky/grass-like pixels; keep greys and warm fur tones. */
function isFurCandidate(r: number, g: number, b: number, a: number): boolean {
  if (a < 180) return false;
  const lum = luminance(r, g, b);
  if (lum < 16 || lum > 244) return false;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const sat = max === 0 ? 0 : chroma / max;

  // Vegetation / lawn
  if (g > r + 22 && g > b + 12 && sat > 0.22) return false;
  // Sky / water
  if (b > r + 22 && b > g + 12 && sat > 0.25) return false;

  return true;
}

type Bucket = { r: number; g: number; b: number; weight: number };

/**
 * Center crop of an ImageData (fraction of width/height, clamped).
 * Used before camera extract so the subject fills more of the sample.
 */
export function cropCenterImageData(
  image: ImageData,
  fraction = 0.7,
): ImageData {
  const ratio = Math.max(0.35, Math.min(1, fraction));
  const width = Math.max(1, Math.floor(image.width * ratio));
  const height = Math.max(1, Math.floor(image.height * ratio));
  const x0 = Math.floor((image.width - width) / 2);
  const y0 = Math.floor((image.height - height) / 2);
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = ((y0 + y) * image.width + (x0 + x)) * 4;
      const dst = (y * width + x) * 4;
      data[dst] = image.data[src]!;
      data[dst + 1] = image.data[src + 1]!;
      data[dst + 2] = image.data[src + 2]!;
      data[dst + 3] = image.data[src + 3]!;
    }
  }

  return { data, width, height, colorSpace: image.colorSpace } as ImageData;
}

/**
 * Samples center-weighted fur-like pixels and returns a 3-stop coat palette.
 * Deterministic; down-weights edge backgrounds and strong greens/blues.
 */
export function extractCoatColors(image: ImageData): PetCoatColors {
  const { data, width, height } = image;
  if (width < 1 || height < 1) {
    return { ...DEFAULT_GREY_COAT };
  }

  const buckets = new Map<string, Bucket>();
  const step = Math.max(1, Math.floor(Math.min(width, height) / 64));
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const rx = Math.max(1, width * 0.42);
  const ry = Math.max(1, height * 0.42);

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const a = data[i + 3]!;
      if (!isFurCandidate(r, g, b, a)) continue;

      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const dist2 = nx * nx + ny * ny;
      // Soft elliptical falloff: center ~3× edge weight
      const weight = dist2 <= 1 ? 3.2 - dist2 * 1.8 : 0.35;
      if (weight < 0.2) continue;

      const key = `${Math.floor(r / BUCKET)}:${Math.floor(g / BUCKET)}:${Math.floor(b / BUCKET)}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.r += r * weight;
        existing.g += g * weight;
        existing.b += b * weight;
        existing.weight += weight;
      } else {
        buckets.set(key, {
          r: r * weight,
          g: g * weight,
          b: b * weight,
          weight,
        });
      }
    }
  }

  const ranked = [...buckets.values()]
    .map((bucket) => ({
      weight: bucket.weight,
      r: bucket.r / bucket.weight,
      g: bucket.g / bucket.weight,
      b: bucket.b / bucket.weight,
    }))
    .sort((a, b) => b.weight - a.weight);

  if (ranked.length === 0) {
    return { ...DEFAULT_GREY_COAT };
  }

  const primary = ranked[0]!;

  const secondaryMatch =
    ranked.find((candidate, index) => {
      if (index === 0) return false;
      return colorDist(candidate, primary) >= MIN_SECONDARY_DISTANCE;
    }) ?? null;

  const secondary = secondaryMatch ?? {
    r: Math.min(255, primary.r + 32),
    g: Math.min(255, primary.g + 32),
    b: Math.min(255, primary.b + 28),
  };

  const warm =
    ranked.find((c, index) => {
      if (index === 0) return false;
      if (secondaryMatch && c === secondaryMatch) return false;
      return c.r > c.g + 6 && c.r > c.b + 6 && luminance(c.r, c.g, c.b) < 200;
    }) ?? null;

  return {
    primary: rgbToHex(primary.r, primary.g, primary.b),
    secondary: rgbToHex(secondary.r, secondary.g, secondary.b),
    accent: warm
      ? rgbToHex(warm.r, warm.g, warm.b)
      : FALLBACK_ACCENT,
  };
}
