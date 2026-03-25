/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Клиентский код читает process.env.NEXT_PUBLIC_STORY_EDIT_TOKEN.
   * Дублировать секрет в .env не нужно: берём из STORY_EDIT_TOKEN (или явный NEXT_PUBLIC_*).
   */
  env: {
    NEXT_PUBLIC_STORY_EDIT_TOKEN:
      process.env.STORY_EDIT_TOKEN || process.env.NEXT_PUBLIC_STORY_EDIT_TOKEN || '',
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  /**
   * В dev отключаем файловый кэш Webpack — иначе после HMR/обрыва сборки часто ломаются
   * ссылки на чанки (Cannot find module './682.js', './vendor-chunks/sonner.js').
   * Инкрементальная сборка чуть медленнее, зато стабильнее.
   */
  webpack: (config, { dev }) => {
    if (dev && process.env.NEXT_WEBPACK_CACHE !== '1') {
      config.cache = false
    }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        // public + signed URLs
        pathname: '/storage/v1/object/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
