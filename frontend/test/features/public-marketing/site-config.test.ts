import { describe, it, expect } from "vitest";
import { siteName, siteUrl } from "@/config/site";

describe("site config", () => {
  it("expone nombre y URL base para SEO", () => {
    expect(siteName).toBe("PetsApp");
    expect(siteUrl).toMatch(/^https?:\/\//);
    expect(siteUrl.endsWith("/")).toBe(false);
  });
});
