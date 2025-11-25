import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-71e1e2623d9a4db38bd10a016a818b19.r2.dev',
      },
    ],
  },
};

export default nextConfig;
