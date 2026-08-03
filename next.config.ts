import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança estáticos.
 *
 * A Content-Security-Policy NÃO está aqui: ela é gerada por requisição em `proxy.ts`
 * porque carrega um nonce que muda a cada carregamento (um header estático não conseguiria).
 * O restante dos cabeçalhos é fixo e fica neste arquivo.
 */
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), midi=(), magnetometer=(), gyroscope=()",
  },
];

// Área administrativa: nunca cacheada, nunca indexada.
const adminHeaders = [
  { key: "Cache-Control", value: "no-store, max-age=0" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Remove o X-Powered-By: Next.js (fingerprint de framework/versão).
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/(.*)", headers: baseSecurityHeaders },
      { source: "/admin/:path*", headers: adminHeaders },
      { source: "/api/admin/:path*", headers: adminHeaders },
    ];
  },
};

export default nextConfig;
