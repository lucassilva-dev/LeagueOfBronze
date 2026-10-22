import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { inscricaoIdDoJogador, registrarAuditoria } from "@/lib/inscricoes/store";
import { contaDeJogadorDisponivel, pepperDeSenhaJogador } from "@/lib/jogadores/auth";
import { LIMITES_CONTA } from "@/lib/jogadores/schema";
import { redefinirSenhaJogador } from "@/lib/jogadores/store";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { requireAdmin } from "@/lib/security/route-guard";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Recuperação de senha de JOGADOR, feita pela organização.
 *
 * O site não envia e-mail, então "esqueci a senha" não tem como ser autoatendimento: o
 * capitão que não guardou a senha ficava sem /capitao e sem "Minha inscrição" para
 * sempre — o cadastro e a troca de senha já mandavam "fale com a organização", e a
 * organização não tinha ferramenta nenhuma.
 *
 * Aqui a organização gera uma senha PROVISÓRIA forte e a repassa à pessoa (no privado).
 * A conta fica com `must_change_password`, e todas as sessões abertas caem na hora
 * (epoch novo). Quem redefine fica sabendo a provisória — por isso a troca obrigatória,
 * em `POST /api/conta/senha`, que tira de quem redefiniu o acesso à conta.
 *
 * Só a master (`users:manage` é masterOnly): entregar a senha de outra pessoa é tomar a
 * conta dela, inclusive a escolha do draft se ela for capitã.
 *
 * Corpo: `{ id }` (id da conta) OU `{ email }` — um dos dois, nunca os dois.
 */
const corpoSchema = z.union([
  z.object({ id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) }).strict(),
  z.object({ email: z.string().trim().toLowerCase().max(LIMITES_CONTA.email).email() }).strict(),
]);

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "users:manage");
  if (!guarda.ok) return guarda.response;

  if (!contaDeJogadorDisponivel()) {
    return NextResponse.json({ error: "Contas de jogador não estão disponíveis neste ambiente." }, { status: 503 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = corpoSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe o id da conta ou o e-mail do jogador (um dos dois)." },
      { status: 400 },
    );
  }

  try {
    const resultado = await redefinirSenhaJogador(parsed.data, pepperDeSenhaJogador());
    if (!resultado) {
      return NextResponse.json({ error: "Conta de jogador não encontrada." }, { status: 404 });
    }
    const { conta, senhaProvisoria } = resultado;

    // Rastro de quem entregou a senha de quem. Sem a senha, claro. Falhar aqui não
    // desfaz a redefinição: a senha já mudou e a organização precisa recebê-la.
    const inscricaoId = await inscricaoIdDoJogador(conta.id).catch(() => null);
    await registrarAuditoria({
      inscricaoId,
      autor: guarda.identity.username,
      acao: "senha_da_conta_redefinida",
      detalhe: { jogadorId: conta.id },
    }).catch((error: unknown) => console.error("[api/admin/jogadores/senha] falha na auditoria", error));

    // A provisória sai UMA vez, nesta resposta, e não pode ficar guardada em cache
    // nenhum — nem no navegador, nem na borda.
    const resposta = NextResponse.json({
      ok: true,
      conta: { id: conta.id, email: conta.email, nome: conta.display_name },
      senhaProvisoria,
    });
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/admin/jogadores/senha", error, "Não foi possível redefinir a senha.");
  }
}
