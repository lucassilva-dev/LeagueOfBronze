import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getAdminIdentity } from "@/lib/admin-auth";
import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { inscricaoIdDoJogador } from "@/lib/inscricoes/store";

export const dynamic = "force-dynamic";

/**
 * Quem está logado, para o cabeçalho do site.
 *
 * Existem DUAS sessões independentes — a da organização e a do jogador — e elas podem
 * coexistir no mesmo navegador. Até agora nada no site dizia em qual delas a pessoa
 * estava: só dava para descobrir entrando em /admin e vendo se pedia senha. No dia do
 * draft isso é pior, porque o capitão precisa saber que está logado ANTES de a vez
 * dele chegar, não descobrir quando o relógio já está correndo.
 *
 * Um endereço só em vez de dois: o cabeçalho aparece em toda página, e duas
 * requisições por carregamento para todo visitante seria desperdício. Para quem não
 * tem cookie válido, nenhuma das duas verificações toca o banco — a assinatura é
 * conferida antes.
 *
 * Devolve o MÍNIMO: nome para exibir e o necessário para montar os links. Nada de
 * escopo, e-mail ou id — o cabeçalho não precisa, e o que não sai não vaza.
 */
export async function GET(request: NextRequest) {
  const vazio = { jogador: null, organizacao: null };

  try {
    const [jogador, admin] = await Promise.all([
      getJogadorIdentity(request).catch(() => null),
      getAdminIdentity(request).catch(() => null),
    ]);

    // Só perguntamos pela inscrição de quem está logado — é o que decide se o menu
    // mostra "minha inscrição" ou "fazer inscrição".
    const temInscricao = jogador ? Boolean(await inscricaoIdDoJogador(jogador.id).catch(() => null)) : false;

    const resposta = NextResponse.json({
      jogador: jogador
        ? { nome: jogador.displayName, temInscricao, precisaTrocarSenha: jogador.mustChangePassword }
        : null,
      organizacao: admin ? { nome: admin.displayName, master: admin.isMaster } : null,
    });
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch {
    // O cabeçalho não pode derrubar o site. Se a sessão não puder ser lida — banco
    // fora do ar, por exemplo —, a página continua de pé sem o indicador.
    const resposta = NextResponse.json(vazio);
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  }
}
