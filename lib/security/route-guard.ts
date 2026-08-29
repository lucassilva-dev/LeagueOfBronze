import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAdminIdentity, isAdminConfigured, type AdminIdentity } from "@/lib/admin-auth";
import { hasScope, scopeLabel, type Scope } from "@/lib/security/scopes";

/**
 * Porta de entrada única das rotas de admin: confere configuração, sessão e permissão.
 *
 * Uso:
 *   const guarda = await requireAdmin(request, "series:cards");
 *   if (!guarda.ok) return guarda.response;
 *   // guarda.identity está disponível daqui pra frente
 */
export type GuardResult =
  | { ok: true; identity: AdminIdentity }
  | { ok: false; response: NextResponse };

/**
 * Barreira contra CSRF.
 *
 * Antes a única defesa era o SameSite do cookie. O buraco concreto: a rota de
 * importação aceita `multipart/form-data`, um tipo que um formulário hospedado em
 * OUTRO site consegue enviar — e ela substitui o dataset inteiro. Aqui exigimos que
 * requisições que gravam venham comprovadamente da própria origem.
 */
export function mesmaOrigem(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;

  // Navegadores modernos mandam este cabeçalho e ele não é forjável por script.
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite === "same-origin" || secFetchSite === "none") return true;

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === request.headers.get("host");
    } catch {
      return false;
    }
  }

  // Sem Origin e sem Sec-Fetch-Site: pode ser cliente não-navegador. Aceitamos apenas
  // se o Referer for da própria origem; caso contrário, recusamos.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === request.headers.get("host");
    } catch {
      return false;
    }
  }

  return false;
}

export async function requireAdmin(request: NextRequest, scope?: Scope): Promise<GuardResult> {
  if (!mesmaOrigem(request)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Requisição bloqueada: origem não confere." },
        { status: 403 },
      ),
    };
  }

  if (!isAdminConfigured()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Autenticação não configurada no ambiente." },
        { status: 500 },
      ),
    };
  }

  const identity = await getAdminIdentity(request);
  if (!identity) {
    return { ok: false, response: NextResponse.json({ error: "Não autorizado." }, { status: 401 }) };
  }

  /*
   * Senha temporária é exigência do SERVIDOR, não só da tela — mas só para ESCREVER.
   *
   * Quando a organização redefine a senha de alguém, a conta nasce com
   * `must_change_password` e o painel mostra o formulário de troca. Só que a exigência
   * parava aí: quem chamasse as rotas direto (fetch pelo console, cliente fora do
   * navegador, ou simplesmente ignorando o formulário) usava o painel inteiro com a
   * senha provisória — que a pessoa que redefiniu ainda conhece. Uma exigência que só o
   * navegador aplica não é exigência.
   *
   * ⚠ POR QUE SÓ ESCRITA: barrar TAMBÉM a leitura tranca a pessoa fora da própria tela
   * que resolveria o problema. `GET /api/admin/dataset` é o que carrega o editor, e o
   * painel só monta depois que ele responde; com o 403 na leitura, a tela parava no
   * cartão "Não foi possível abrir o painel" e o formulário de troca — que fica mais
   * abaixo na mesma página — nunca chegava a ser renderizado. A pessoa ficava sem
   * NENHUM caminho no site para trocar a senha, e se isso acontecesse com a única conta
   * master, ninguém mais operaria o painel sem mexer no banco à mão.
   *
   * Deixar a leitura passar não enfraquece o objetivo: o que precisa ser impedido é
   * AGIR com a senha provisória, e toda ação do painel é POST/PUT/PATCH/DELETE.
   *
   * As rotas do fluxo de recuperação (`/api/admin/senha`, `session`, `logout`) também
   * não passam por aqui — resolvem a identidade por conta própria.
   *
   * O modo legado nunca cai aqui: `mustChangePassword` é sempre falso nele.
   */
  const ehLeitura = request.method === "GET" || request.method === "HEAD";
  if (!ehLeitura && identity.mustChangePassword && !identity.legacy) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "Troque a senha provisória antes de usar o painel.",
          code: "SENHA_PENDENTE",
        },
        { status: 403 },
      ),
    };
  }

  if (scope && !hasScope(identity, scope)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Você não tem permissão para: ${scopeLabel(scope)}.`,
          missing: [scope],
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, identity };
}
