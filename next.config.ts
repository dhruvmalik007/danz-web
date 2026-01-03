import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: {},
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error'],
          }
        : false,
  },
  experimental: {
    optimizePackageImports: ['react-icons', 'motion', '@apollo/client'],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      }

      config.watchOptions = {
        ...(config.watchOptions || {}),
        ignored: [
          ...(Array.isArray(config.watchOptions?.ignored)
            ? config.watchOptions.ignored
            : config.watchOptions?.ignored
              ? [config.watchOptions.ignored]
              : []),
          '**/.next/**',
          '**/docs/**',
          '**/public/docs/**',
        ],
      }
    }

    return config
  },
}

export default nextConfig
