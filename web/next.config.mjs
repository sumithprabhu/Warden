import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Avoid wrong root when another lockfile exists higher in the tree (e.g. home dir).
  turbopack: {
    root: __dirname,
  },
  // Use webpack for builds (turbopack has issues with thread-stream/why-is-node-running)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "why-is-node-running": false,
      "thread-stream": false,
      "tap": false,
    };
    return config;
  },
  serverExternalPackages: ['pino', 'thread-stream', 'why-is-node-running', '@unlink-xyz/sdk', '@scure/bip39'],
  outputFileTracingIncludes: {
    '/api/**': ['./workers/**', './node_modules/@unlink-xyz/**', './node_modules/viem/**', './node_modules/@scure/**', './node_modules/@noble/**'],
  },
}

export default nextConfig
