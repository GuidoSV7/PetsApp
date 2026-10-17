import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
  // Permite HMR y recursos de dev cuando entrás por túnel (p. ej. ngrok).
  allowedDevOrigins: ["919e-190-171-228-246.ngrok-free.app"],
  transpilePackages: [
    "@solana/wallet-adapter-base",
    "@solana/wallet-adapter-react",
    "@solana/wallet-adapter-wallets",
  ],
};

export default nextConfig;
