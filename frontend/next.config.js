/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Vercel Services: backend mounted at /_/backend
    if (process.env.VERCEL) {
      return [
        { source: '/api/:path*', destination: '/_/backend/api/:path*' },
      ];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
