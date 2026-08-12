import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { LOCALE_COOKIE, LOCALE_HEADER, resolveLocale } from "@/lib/i18n/config";

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
 * ⚠ TODA PÁGINA PRECISA SER DINÂMICA. O nonce nasce por requisição; uma página estática
 * é pré-renderizada no build, quando ele ainda não existe. Os <script> dela saem sem
 * nonce, a CSP bloqueia todo o JavaScript e o React nunca troca o bloco de Suspense pelo
 * conteúdo — a página fica EM BRANCO. Já aconteceu com /regras e /legal em produção.
 * Ao criar uma página nova, marque `export const dynamic = "force-dynamic"` e confira no
 * `npm run build` que ela aparece como ƒ (Dynamic), nunca ○ (Static).
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

  // Idioma: escolha salva no cookie vence; senão, o Accept-Language do navegador.
  // Resolvido aqui e repassado por cabeçalho para os Server Components não repetirem a lógica.
  const locale = resolveLocale(
    request.cookies.get(LOCALE_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  requestHeaders.set(LOCALE_HEADER, locale);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // NÃO tente pôr `Vary: Accept-Language, Cookie` aqui.
  //
  // O conteúdo de fato varia com o idioma, então o cabeçalho seria correto — mas o
  // Next é dono do Vary em resposta de documento e escreve o dele (rsc,
  // next-router-*) DEPOIS do proxy. Testado: nem `set`, nem `append`, nem uma entrada
  // em `next.config.ts` sobrevivem (outros cabeçalhos do mesmo bloco do next.config,
  // como o X-Content-Type-Options, passam; o Vary não).
  //
  // Na prática não faz falta: toda página é dinâmica e sai com
  // `Cache-Control: no-cache, must-revalidate`, então nenhum cache compartilhado
  // guarda uma versão para servir a outra pessoa. Se um dia esse cache for afrouxado,
  // o problema volta — e a solução terá de vir de outro lugar, não daqui.
  return response;
}

export const config = {
  matcher: [
    // Roda nas páginas (documentos HTML), onde o nonce importa. Pula estáticos, imagens
    // otimizadas, favicon e as rotas de API (JSON não executa script).
    //
    // ⚠ NÃO reintroduzir um bloco `missing` para pular prefetch. Havia um aqui, com a
    // justificativa de "não gerar CSP sob prefetch do roteador", e ele custava caro:
    // uma requisição com `Purpose: prefetch` não passava por este arquivo, então o
    // documento saía SEM Content-Security-Policy nenhuma e SEM o cabeçalho de idioma
    // — ou seja, sempre em português, mesmo para quem pediu inglês. Verificado com
    // `curl -H "purpose: prefetch" -H "Accept-Language: en"`: vinha `lang="pt-BR"` e
    // resposta sem CSP. Um cabeçalho de CSP numa resposta de prefetch é inofensivo; a
    // ausência dele no documento que o navegador acaba usando não é.
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
