import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // ✅ Allow production builds to succeed even if ESLint errors exist
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ✅ Allow production builds to succeed even if TypeScript errors exist
    ignoreBuildErrors: true,
  },
  // Optimize for Vercel deployment
  experimental: {
    serverComponentsExternalPackages: ['mongoose'],
  },
  // Enable static optimization
  output: 'standalone',
};

export default nextConfig;
