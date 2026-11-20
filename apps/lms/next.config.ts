import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hikmah/ui", "@hikmah/db"],
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
};

export default config;
