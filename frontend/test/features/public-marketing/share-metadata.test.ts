import { afterEach, describe, expect, it, vi } from "vitest";
import {
  landingShareMetadata,
  resolveShareImageUrl,
} from "@/features/public-marketing/share-metadata";
import { SHARE_IMAGE_FALLBACK, siteName } from "@/config/site";

describe("landingShareMetadata", () => {
  it("names PetsApp on the title and social cards", () => {
    const metadata = landingShareMetadata();
    const serialized = JSON.stringify(metadata).toLowerCase();

    expect(JSON.stringify(metadata.title)).toContain(siteName);
    expect(metadata.description).toMatch(/michi|mascotas/i);
    expect(metadata.openGraph?.title).toBe(siteName);
    expect(metadata.openGraph?.siteName).toBe(siteName);
    expect(metadata.openGraph?.locale).toBe("es_LA");
    const openGraph = metadata.openGraph;
    expect(openGraph && "type" in openGraph ? openGraph.type : undefined).toBe(
      "website",
    );
    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: SHARE_IMAGE_FALLBACK }),
    ]);
    const twitter = metadata.twitter;
    expect(twitter && "card" in twitter ? twitter.card : undefined).toBe(
      "summary_large_image",
    );
    expect(metadata.twitter?.title).toBe(siteName);
    expect(metadata.twitter?.images).toEqual([SHARE_IMAGE_FALLBACK]);
    expect(serialized).not.toContain("localhost");
  });

  it("uses an absolute logo when sharing on WhatsApp or Facebook", () => {
    const metadata = landingShareMetadata({
      imageUrl: "https://cdn.example/petsapp-logo.png",
    });

    expect(metadata.openGraph?.images).toEqual([
      expect.objectContaining({ url: "https://cdn.example/petsapp-logo.png" }),
    ]);
    expect(metadata.twitter?.images).toEqual([
      "https://cdn.example/petsapp-logo.png",
    ]);
  });
});

describe("resolveShareImageUrl", () => {
  it("accepts https and relative paths and rejects unsafe values", () => {
    expect(resolveShareImageUrl("https://cdn.example/logo.png")).toBe(
      "https://cdn.example/logo.png",
    );
    expect(resolveShareImageUrl("/opengraph-image")).toBe("/opengraph-image");
    expect(resolveShareImageUrl("javascript:alert(1)")).toBeNull();
    expect(resolveShareImageUrl("data:text/html,hi")).toBeNull();
    expect(resolveShareImageUrl(null)).toBeNull();
    expect(resolveShareImageUrl("")).toBeNull();
  });
});

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("strips trailing slashes from NEXT_PUBLIC_SITE_URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pets.example.com/");
    vi.resetModules();
    const { getSiteUrl } = await import("@/config/site");
    expect(getSiteUrl()).toBe("https://pets.example.com");
  });
});
