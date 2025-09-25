import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Enables static HTML export
  output: "export",

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    unoptimized: true,
  },

  transpilePackages: ["@fast-auth/browser"],
};

export default nextConfig;
