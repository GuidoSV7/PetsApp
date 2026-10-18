import type { Metadata } from "next";
import {
  SHARE_IMAGE_FALLBACK,
  siteDescription,
  siteName,
  siteTagline,
} from "@/config/site";

/**
 * HTTPS absolute image for OG/Twitter, or null if it cannot be shared safely.
 * Relative paths are allowed (resolved via metadataBase).
 */
export function resolveShareImageUrl(
  imageUrl: string | null | undefined,
): string | null {
  const raw = imageUrl?.trim() ?? "";
  if (!raw) return null;
  if (/^javascript:/i.test(raw) || /^data:/i.test(raw)) return null;
  if (raw.startsWith("/")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;
  return null;
}

/** Elena Pos–style landing share card for WhatsApp / Facebook / Twitter. */
export function landingShareMetadata(options?: {
  imageUrl?: string | null;
}): Metadata {
  const image =
    resolveShareImageUrl(options?.imageUrl) ?? SHARE_IMAGE_FALLBACK;
  const title = `${siteName} — ${siteTagline}`;

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description: siteDescription,
    openGraph: {
      title: siteName,
      description: siteDescription,
      siteName,
      images: [
        {
          url: image,
          alt: siteName,
        },
      ],
      locale: "es_LA",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteName,
      description: siteDescription,
      images: [image],
    },
  };
}
