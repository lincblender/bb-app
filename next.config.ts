import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // MCP SDK uses runtime file access; externalise so Turbopack can resolve it
  serverExternalPackages: ["@modelcontextprotocol/sdk"],
  async redirects() {
    return [
      { source: "/demo", destination: "/auth/signin", permanent: true },
      { source: "/demo/", destination: "/auth/signin", permanent: true },
      { source: "/demo/signup", destination: "/auth/signup", permanent: true },
      { source: "/demo/dashboard", destination: "/console/dashboard", permanent: true },
      { source: "/demo/opportunities", destination: "/console/opportunities", permanent: true },
      { source: "/demo/opportunities/:path*", destination: "/console/opportunities/:path*", permanent: true },
      { source: "/demo/organisation", destination: "/console/organisation", permanent: true },
      { source: "/demo/network", destination: "/console/network", permanent: true },
      { source: "/demo/matrix", destination: "/console/matrix", permanent: true },
      { source: "/demo/connectors", destination: "/console/connectors", permanent: true },
      { source: "/demo/settings", destination: "/console/settings", permanent: true },
      { source: "/demo/strategy", destination: "/console/strategy", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.licdn.com", pathname: "/**" },
      { protocol: "https", hostname: "lh3.googleusercontent.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
