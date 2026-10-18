# RDD: SEO share metadata

## Checks

- [x] Elena Pos pattern: `landingShareMetadata` + OG/Twitter cards
- [x] `resolveShareImageUrl` rejects javascript/data URLs
- [x] `opengraph-image` / `twitter-image` for WhatsApp/Facebook previews
- [x] robots sitemap + admin disallow
- [x] Vitest public-marketing green (6)

## Deploy

Set `NEXT_PUBLIC_SITE_URL` to the public HTTPS origin (no trailing slash) so
crawlers and share previews resolve absolute image URLs.
