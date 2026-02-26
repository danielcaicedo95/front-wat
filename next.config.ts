import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  sw: "sw-push.js",
});

const nextConfig: NextConfig = {
  turbopack: {}, // ✅ obligatorio en Next 16
};

export default withPWA(nextConfig);