/** Prefijo same-origin: el browser no habla TLS con Traefik. */
export const API_PROXY_PREFIX = "/petsapp-api";

const API_PUBLICA_DOKPLOY =
  "https://app-hack-bluetooth-monitor-38vpk4-c29fd3-187-127-17-128.traefik.me";

export function petsappPublicClientUrl(): string {
  const cruda = process.env.NEXT_PUBLIC_PETSAPP_API_URL?.trim();
  if (!cruda) return API_PROXY_PREFIX;
  const normalizada = cruda.replace(/\/$/, "");
  if (/traefik\.me/i.test(normalizada)) return API_PROXY_PREFIX;
  return normalizada;
}

/** OpenNext no siempre define NETLIFY=true; sin esto el proxy usa el DNS de Docker y Netlify responde 500. */
export function isOnNetlify(): boolean {
  const marcas = [
    process.env.NETLIFY,
    process.env.NETLIFY_DEV,
    process.env.SITE_NAME,
    process.env.URL,
    process.env.DEPLOY_URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.CONTEXT,
  ]
    .filter(Boolean)
    .join(" ");
  if (process.env.NETLIFY === "true" || process.env.NETLIFY === "1") return true;
  return /netlify/i.test(marcas);
}

export function internalApiOrigin(): string {
  const override = process.env.PETSAPP_API_INTERNAL_URL?.trim();
  if (override) return override.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development" && !isOnNetlify()) {
    return "http://127.0.0.1:3001";
  }
  return API_PUBLICA_DOKPLOY;
}

export function buildApiProxyDestination(
  origen: string,
  segmentos: string[],
  search: string,
): string {
  const base = origen.replace(/\/$/, "");
  const path = `/${segmentos.map((s) => encodeURIComponent(s)).join("/")}`;
  const query = search.startsWith("?") || search === "" ? search : `?${search}`;
  return `${base}${path}${query}`;
}

export function shouldSkipTlsVerification(urlDestino: string): boolean {
  try {
    const u = new URL(urlDestino);
    return u.protocol === "https:" && /traefik\.me$/i.test(u.hostname);
  } catch {
    return false;
  }
}
