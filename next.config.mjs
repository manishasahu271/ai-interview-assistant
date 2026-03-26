/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Prevent Next/webpack from bundling pdf-parse (pdfjs worker setup is fragile).
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
