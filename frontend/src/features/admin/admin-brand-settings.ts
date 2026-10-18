import {
  siteDescription,
  siteName,
  siteTagline,
} from "@/config/site";

export const ADMIN_BRAND_STORAGE_KEY = "petsapp.admin.brand";

export type AdminBrandSettings = {
  siteName: string;
  siteTagline: string;
  siteDescription: string;
};

export function defaultBrandSettings(): AdminBrandSettings {
  return {
    siteName,
    siteTagline,
    siteDescription,
  };
}

function isBrandSettings(value: unknown): value is AdminBrandSettings {
  if (!value || typeof value !== "object") return false;
  const draft = value as AdminBrandSettings;
  return (
    typeof draft.siteName === "string" &&
    typeof draft.siteTagline === "string" &&
    typeof draft.siteDescription === "string"
  );
}

export function loadBrandSettings(): AdminBrandSettings {
  const defaults = defaultBrandSettings();
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(ADMIN_BRAND_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    if (!isBrandSettings(parsed)) return defaults;
    return {
      siteName: parsed.siteName.trim() || defaults.siteName,
      siteTagline: parsed.siteTagline.trim() || defaults.siteTagline,
      siteDescription: parsed.siteDescription.trim() || defaults.siteDescription,
    };
  } catch {
    return defaults;
  }
}

export function saveBrandSettings(next: AdminBrandSettings): AdminBrandSettings {
  const defaults = defaultBrandSettings();
  const cleaned: AdminBrandSettings = {
    siteName: next.siteName.trim() || defaults.siteName,
    siteTagline: next.siteTagline.trim() || defaults.siteTagline,
    siteDescription: next.siteDescription.trim() || defaults.siteDescription,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        ADMIN_BRAND_STORAGE_KEY,
        JSON.stringify(cleaned),
      );
    } catch {
      /* storage unavailable */
    }
  }
  return cleaned;
}
