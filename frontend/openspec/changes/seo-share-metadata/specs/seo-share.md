# Spec: SEO + social share

- `landingShareMetadata()` sets title/description with PetsApp branding.
- `openGraph` includes siteName, locale `es_LA`, type `website`, and at least one image.
- `twitter.card` is `summary_large_image` with matching title/description/images.
- Relative share image paths resolve under `metadataBase` / siteUrl.
- Unsafe image URLs (e.g. `javascript:`) are rejected by `resolveShareImageUrl`.
- `robots` exposes sitemap at `{siteUrl}/sitemap.xml` and disallows `/admin`.
