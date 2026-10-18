# Design: SEO share metadata (from Elena Pos)

## Pattern (Elena Pos)

1. `getSiteUrl()` / `siteUrl` — public origin, no trailing slash.
2. `landingShareMetadata({ imageUrl? })` — title, description, `openGraph`, `twitter`.
3. Fallback share image when no CMS logo (`SHARE_IMAGE_FALLBACK`).
4. Root layout merges share metadata + `metadataBase` + `openGraph.url`.
5. `robots.ts` + `sitemap.ts` use the same origin.

## PetsApp adaptation

- No CMS logo API → Next.js `opengraph-image.tsx` (1200×630) as the default card.
- Brand copy in `config/site.ts` + `share-metadata.ts`.
- Json-LD Organization keeps name + url (+ logo when absolute).
- Disallow `/admin` (and account) in robots; allow home.
