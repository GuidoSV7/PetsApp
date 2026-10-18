import { describe, expect, it } from "vitest";
import {
  getSiteUrl,
  siteDescription,
  siteName,
  siteUrl,
} from "@/config/site";

describe("site config", () => {
  it("expone nombre, descripción y URL base para SEO", () => {
    expect(siteName).toBe("PetsApp");
    expect(siteDescription.length).toBeGreaterThan(20);
    expect(siteUrl).toMatch(/^https?:\/\//);
    expect(siteUrl.endsWith("/")).toBe(false);
    expect(getSiteUrl()).toBe(siteUrl);
  });
});
