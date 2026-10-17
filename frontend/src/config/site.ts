/** URL pública del sitio (SEO: metadataBase, sitemap, robots). */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "https://petsapp.io";

export const siteName = "PetsApp";
