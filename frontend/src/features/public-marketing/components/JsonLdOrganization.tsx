import { getSiteUrl, siteDescription, siteName } from "@/config/site";

/** Organization JSON-LD for rich results / brand identity. */
export function JsonLdOrganization() {
  const json = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteName,
    url: getSiteUrl(),
    description: siteDescription,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
