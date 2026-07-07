import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
