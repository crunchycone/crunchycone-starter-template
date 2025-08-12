import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: "standalone",
  
  // Allow external images if needed (customize domains as needed)
  images: {
    remotePatterns: [],
  },
  
  // External packages that should not be bundled
  serverExternalPackages: ['@prisma/adapter-libsql', '@libsql/client'],
};

export default nextConfig;
