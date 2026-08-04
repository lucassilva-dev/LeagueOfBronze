import type { MetadataRoute } from "next";

/**
 * robots.txt.
 *
 * O painel e a API de administração ficam fora dos buscadores. Eles já respondem com
 * `X-Robots-Tag: noindex, nofollow` (ver next.config.ts), mas o Disallow evita até a
 * visita do robô — e a ausência de robots.txt foi apontada na auditoria de conformidade.
 */
export default function robots(): MetadataRoute.Robots {
  const base = "https://league-of-bronze.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
