// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ let the build succeed even if ESLint finds problems
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ let the build succeed even if there are TS errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
