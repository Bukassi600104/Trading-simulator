/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  ...(isProd ? { output: 'export' } : {}),
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
