import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Solo activo en producción
  sw: "sw-push.js", // Nuestro Service Worker personalizado
  publicExcludes: ["!icons/**/*"], // No pre-caché los íconos grandes
});

const nextConfig: NextConfig = {
  /* config options here */
};

module.exports = withPWA(nextConfig);
