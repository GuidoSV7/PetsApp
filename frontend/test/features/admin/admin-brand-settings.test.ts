/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vitest";
import { siteName } from "@/config/site";
import {
  ADMIN_BRAND_STORAGE_KEY,
  defaultBrandSettings,
  loadBrandSettings,
  saveBrandSettings,
} from "@/features/admin/admin-brand-settings";

describe("admin brand settings", () => {
  afterEach(() => {
    window.localStorage.removeItem(ADMIN_BRAND_STORAGE_KEY);
  });

  it("defaults to site config and persists edits", () => {
    expect(loadBrandSettings().siteName).toBe(siteName);
    const saved = saveBrandSettings({
      ...defaultBrandSettings(),
      siteName: "PetsApp Pro",
      siteTagline: "Michis al poder",
    });
    expect(saved.siteName).toBe("PetsApp Pro");
    expect(loadBrandSettings().siteTagline).toBe("Michis al poder");
  });
});
