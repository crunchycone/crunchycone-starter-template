import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",

  // Allow external images for avatars
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },

  // External packages that should not be bundled
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client"],

  // Disable ESLint during builds to ignore linting errors
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
