// frontend/next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },

  outputFileTracingIncludes: {
    "/src/app/api/keeta/route": [
      "node_modules/@keetanetwork/keetanet-client/**",
      ".pnpm/**/node_modules/@keetanetwork/keetanet-client/**",
    ],
  },

  experimental: {
    turbo: {
      resolveAlias: {
        "@keetanetwork/asn1-napi-rs": "false",
        "utf-8-validate": "false",
        bufferutil: "false",
      },
    },
  },

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@keetanetwork/asn1-napi-rs": false as unknown as string,
      "utf-8-validate": false as unknown as string,
      bufferutil: false as unknown as string,
    };
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      "@keetanetwork/asn1-napi-rs": false as unknown as string,
      "utf-8-validate": false as unknown as string,
      bufferutil: false as unknown as string,
    };
    return config;
  },
};

export default nextConfig;
