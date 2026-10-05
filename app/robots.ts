import type { MetadataRoute } from "next";

import { ehAmbienteDeTeste } from "@/lib/data-store";
import { SITE_URL } from "@/lib/site-url";

/**
 * robots.txt.
 *
 * O painel e a API de administração ficam fora dos buscadores. Eles já respondem com
 * `X-Robots-Tag: noindex, nofollow` (ver next.config.ts), mas o Disallow evita até a
 * visita do robô — e a ausência de robots.txt foi apontada na auditoria de conformidade.
 */
export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL;

  /*
   * O ambiente de teste sai INTEIRO dos buscadores.
   *
   * Ele tem times, jogadores e datas falsos. Indexado, apareceria em busca por "League of
   * Bronze" ao lado do site de verdade, e alguém acabaria se inscrevendo no lugar errado.
   */
  if (ehAmbienteDeTeste()) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

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
