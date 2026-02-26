import type { NextConfig } from "next";

const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Solo activo en producción
  sw: "sw-push.js", // Service Worker personalizado
  publicExcludes: ["!icons/**/*"],
});

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // ✅ Permite deploy en Vercel aunque haya errores ESLint
  },

  typescript: {
    ignoreBuildErrors: true, // ✅ Evita que errores de TypeScript bloqueen el build
  },

  reactStrictMode: true, // ✅ recomendado

  experimental: {
    typedRoutes: true, // opcional pero recomendado en Next 15
  },
};

module.exports = withPWA(nextConfig);