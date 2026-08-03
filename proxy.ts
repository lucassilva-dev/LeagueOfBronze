import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Content-Security-Policy por requisição, com nonce.
 *
 * (Arquivo `proxy.ts` — a convenção que o Next 16 usa no lugar do antigo `middleware.ts`.)
 *
 * Por que aqui e não no next.config: um nonce muda a cada carregamento, então a CSP
 * precisa ser gerada por requisição — um header estático não consegue. O Next lê o nonce
 * a partir do header CSP da REQUISIÇÃO e o aplica sozinho a todos os <script> que ele gera;
 * como o projeto não tem nenhum <script> inline próprio (nem dangerouslySetInnerHTML), não
 * há nada para carimbar à mão.
 *
 * O ganho: em produção, `script-src` deixa de ter 'unsafe-inline'. Um <script> injetado por
 * um atacante não conhece o nonce (aleatório e imprevisível a cada request) e é RECUSADO
 * pelo navegador. 'strict-dynamic' permite que os scripts do Next carreguem seus chunks.
 *
 * O que continua com 'unsafe-inline' — e por quê:
 * - style-src: o projeto usa `style={{...}}` em massa e o framer-motion escreve estilos
 *   inline em runtime. Nonce vale para <style>, nunca para o atributo style="". Tirar isso
 *   quebraria o visual inteiro. Risco associado (injeção de CSS) é muito menor que o de
 *   script, e não há sink de HTML no código.
 *
 * Em desenvolvimento a CSP é relaxada: o HMR/React Refresh injeta scripts sem nonce e
 * precisa de 'unsafe-eval'. A CSP endurecida por nonce vale só em produção (e no
 * `next start` de um build de produção, onde ela é testada antes de subir).
 */
export function proxy(request: NextRequest) {
  const isProd = process.env.NODE_ENV === "production";
  const nonce = btoa(crypto.randomUUID());

  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: https://ddragon.leagueoflegends.com",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    scriptSrc,
    "connect-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  // O nonce vai no header CSP da REQUISIÇÃO — é daí que o Next o lê para carimbar os scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Roda nas páginas (documentos HTML), onde o nonce importa. Pula estáticos, imagens
    // otimizadas, favicon e as rotas de API (JSON não executa script). Pula também
    // requisições de prefetch, para não gerar CSP sob prefetch do roteador.
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
