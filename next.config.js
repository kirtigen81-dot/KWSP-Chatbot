/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse uses Node.js built-ins — keep it server-side only
  serverExternalPackages: ['pdf-parse'],
}

module.exports = nextConfig
