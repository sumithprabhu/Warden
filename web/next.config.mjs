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
    '/api/**': [
      './workers/**',
      './node_modules/@unlink-xyz/**',
      './node_modules/viem/**',
      './node_modules/abitype/**',
      './node_modules/ox/**',
      './node_modules/@scure/**',
      './node_modules/@noble/**',
      './node_modules/@adraffy/**',
      './node_modules/@zk-kit/**',
      './node_modules/isows/**',
      './node_modules/ws/**',
      './node_modules/eventemitter3/**',
      './node_modules/blakejs/**',
      './node_modules/buffer/**',
      './node_modules/base64-js/**',
      './node_modules/ieee754/**',
      './node_modules/poseidon-lite/**',
      './node_modules/openapi-fetch/**',
      './node_modules/openapi-typescript-helpers/**',
    ],
  },
}

export default nextConfig
