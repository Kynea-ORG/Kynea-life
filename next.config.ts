import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions default to a 1MB body limit. uploadClassImage()
    // (lib/classes/imageActions.ts) accepts raw files up to the client's
    // 5MB check — without this, anything over 1MB 500s at the framework
    // level before the action's own validation ever runs.
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/buscar', destination: '/clases', permanent: true },
      { source: '/clase/:id', destination: '/clases/:id', permanent: true },
      { source: '/auth', destination: '/login', permanent: false },
    ];
  },
};

export default nextConfig;
