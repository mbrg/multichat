/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable React StrictMode to prevent double-mounting in development
  reactStrictMode: false,
  
  // Configure external image domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

export default nextConfig