import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  // Dokploy builds with context `frontend/`; tracing the monorepo parent nests
  // standalone under `frontend/server.js` and breaks `CMD ["node", "server.js"]`.
  outputFileTracingRoot: frontendRoot,
  // Permite HMR y recursos de dev cuando entrás por túnel (p. ej. ngrok).
  allowedDevOrigins: ["919e-190-171-228-246.ngrok-free.app"],
};

export default nextConfig;
