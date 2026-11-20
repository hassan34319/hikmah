import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@hikmah/ui", "@hikmah/db"],
  images: { remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }] },
  // Posters are uploaded through a server action; allow up to 8 MB images.
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default config;
