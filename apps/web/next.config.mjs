/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "steamcommunity-a.akamaihd.net" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "steamuserimages-a.akamaihd.net" },
      { protocol: "https", hostname: "community.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "community.akamai.steamstatic.com" },
      { protocol: "https", hostname: "raw.githubusercontent.com" },
    ],
  },
}

export default nextConfig
