import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Exclude server-only packages from client bundle
  experimental: {
    turbo: {
      resolveAlias: {
        'playwright': false,
        'playwright-core': false,
      },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude Playwright and other Node.js-only modules from client bundle
      config.resolve.alias = {
        ...config.resolve.alias,
        'playwright': false,
        'playwright-core': false,
      };
    }
    return config;
  },
  serverExternalPackages: ['playwright', 'playwright-core'],
};

export default nextConfig;
