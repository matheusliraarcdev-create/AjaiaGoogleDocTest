import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  serverExternalPackages: ["mammoth", "sanitize-html"],
};

export default nextConfig;
