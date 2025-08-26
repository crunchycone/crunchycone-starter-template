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

  // Webpack configuration to ignore optional crunchycone-lib cloud provider dependencies
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark optional cloud provider SDKs as external to prevent webpack from trying to resolve them
      config.externals = config.externals || [];
      config.externals.push({
        '@aws-sdk/client-ses': 'commonjs @aws-sdk/client-ses',
        '@aws-sdk/client-s3': 'commonjs @aws-sdk/client-s3',
        '@azure/storage-blob': 'commonjs @azure/storage-blob',
        '@google-cloud/storage': 'commonjs @google-cloud/storage',
        'mailgun.js': 'commonjs mailgun.js',
        'resend': 'commonjs resend',
        'nodemailer': 'commonjs nodemailer',
      });
    }
    return config;
  },
};

export default nextConfig;
