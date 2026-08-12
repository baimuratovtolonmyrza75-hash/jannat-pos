import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['172.20.10.2', '172.20.10.3', '172.20.*.*', '192.168.*.*'],
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|avif|woff2|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
