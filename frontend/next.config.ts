import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * CSP for what the app really loads: Google Identity Services,
 * Pollar/Stellar endpoints, blob:/data: for 3D textures and camera capture.
 * unsafe-eval stays dev-only.
 */
function contentSecurityPolicy(): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' https://accounts.google.com${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://accounts.google.com https://sdk.api.pollar.xyz https://albedo.link https://horizon.stellar.org https://horizon-testnet.stellar.org",
    "frame-src https://accounts.google.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

/** Security headers for every route; HSTS only in production (TLS at the edge). */
function cabecerasSeguridad() {
  const base = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy() },
    ...securityHeaders,
  ];
  if (process.env.NODE_ENV === "production") {
    return [
      ...base,
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains",
      },
    ];
  }
  return base;
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Dokploy builds with context `frontend/`; tracing the monorepo parent nests
  // standalone under `frontend/server.js` and breaks `CMD ["node", "server.js"]`.
  outputFileTracingRoot: frontendRoot,
  // Permite HMR y recursos de dev cuando entrás por túnel (p. ej. ngrok).
  allowedDevOrigins: ["919e-190-171-228-246.ngrok-free.app"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: cabecerasSeguridad(),
      },
    ];
  },
};

export default nextConfig;
