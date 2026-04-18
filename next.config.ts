import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
};

export default nextConfig;
