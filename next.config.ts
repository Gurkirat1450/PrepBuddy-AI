import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow face-api.js from jsdelivr CDN
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "unsafe-none",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
