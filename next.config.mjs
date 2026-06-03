import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    // Product / category images are stored on UploadThing. v7 serves them from
    // `<appId>.ufs.sh` (the `ufsUrl` returned by the upload router); `utfs.io`
    // is the legacy host kept for any older rows. Without these, next/image
    // throws "hostname not configured" at render and every real photo breaks.
    remotePatterns: [
      { protocol: "https", hostname: "**.ufs.sh" },
      { protocol: "https", hostname: "utfs.io" },
    ],
  },
  async headers() {
    // Google Identity Services opens a popup that postMessages an idToken back
    // to this window. Chrome's default COOP can silently drop that handshake
    // even with "same-origin-allow-popups" in some versions — set
    // "unsafe-none" globally so the popup's postMessage is never filtered.
    // COEP "unsafe-none" keeps GSI's iframe path unblocked too.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "unsafe-none" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
        ],
      },
    ];
  },
};

export default nextConfig;
