import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * CSP do site.
 *
 * Notas de projeto (não mexer sem ler):
 * - `style-src 'unsafe-inline'` é INEVITÁVEL aqui: o projeto usa `style={{...}}` em
 *   massa e o framer-motion escreve estilos inline em tempo de execução. Nonce de CSP
 *   vale para <style>, nunca para o atributo style="". O risco associado é injeção de
 *   CSS, e este código não tem nenhum sink de HTML (zero dangerouslySetInnerHTML/eval).
 * - `img-src` restrito fecha o vetor de "pixel de rastreio" via imageUrl do admin.
 * - `script-src` começa permissivo e será endurecido com nonce depois (todas as páginas
 *   são force-dynamic, então nonce por requisição é viável).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: https://ddragon.leagueoflegends.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const baseSecurityHeaders = [
  { key: "Content-Security-Policy", value: csp },
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
