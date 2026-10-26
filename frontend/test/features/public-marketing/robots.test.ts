import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { getSiteUrl } from "@/config/site";

describe("robots", () => {
  it("points sitemap at the public origin and blocks admin", () => {
    const result = robots();
    expect(result.sitemap).toBe(`${getSiteUrl()}/sitemap.xml`);
    const disallow = Array.isArray(result.rules)
      ? result.rules.flatMap((rule) => rule.disallow ?? [])
      : (result.rules?.disallow ?? []);
    const disallowedPaths = Array.isArray(disallow) ? disallow : [disallow];
    expect(disallowedPaths.some((path) => String(path).includes("admin"))).toBe(true);
  });
});
