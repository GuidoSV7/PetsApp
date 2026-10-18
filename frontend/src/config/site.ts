/** Public site origin for SEO (metadataBase, sitemap, robots, share cards). */

const FALLBACK_SITE_URL = "https://petsapp.io";

export const siteName = "PetsApp";

export const siteDescription =
  "Cuidá a tu michi virtual, personalizalo con fotos reales y jugá desde el celular.";

export const siteTagline = "Tu app para el cuidado de mascotas";

/** Default card image when no absolute logo is provided (Next also ships opengraph-image). */
export const SHARE_IMAGE_FALLBACK = "/opengraph-image";

/** Public origin of the site, without a trailing slash. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const origin = configured && configured.length > 0 ? configured : FALLBACK_SITE_URL;
  return origin.replace(/\/+$/, "");
}

export const siteUrl = getSiteUrl();
