import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  atributosDoCookie,
  emitirCookieDeJogador,
  getJogadorIdentity,
  pepperDeSenhaJogador,
} from "@/lib/jogadores/auth";
import { trocaSenhaJogadorSchema } from "@/lib/jogadores/schema";
import {
  acharJogadorPorId,
  revogarTudoDoJogador,
  trocarSenhaJogador,
} from "@/lib/jogadores/store";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/security/password";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { comPisoDeTempo, lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Troca de senha pelo próprio jogador.
 *
 * Existe porque a redefinição é feita pela organização (não há envio de e-mail): quem
 * redefine fica sabendo a senha temporária. Sem esta rota, essa pessoa continuaria
 * podendo entrar na conta de quem ela ajudou — inclusive para escolher no draft.
 */
export async function POST(request: NextRequest) {
  const inicio = Date.now();

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  }

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = trocaSenhaJogadorSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Confira os campos." }, { status: 400 });
  }

  const { senhaAtual, senhaNova } = parsed.data;

  const fraca = validatePasswordStrength(senhaNova);
  if (fraca) {
    return NextResponse.json({ error: fraca, problemas: [{ campo: "senhaNova", mensagem: fraca }] }, { status: 400 });
  }
  if (senhaAtual === senhaNova) {
    return NextResponse.json({ error: "A senha nova precisa ser diferente da atual." }, { status: 400 });
  }

  try {
    const conta = await acharJogadorPorId(identidade.id);
    if (!conta) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    const confere = await verifyPassword(senhaAtual, conta.password_hash, pepperDeSenhaJogador());
    if (!confere) {
      return comPisoDeTempo(inicio, NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 }));
    }

    await trocarSenhaJogador(conta.id, await hashPassword(senhaNova, pepperDeSenhaJogador()));

    // Trocar a senha derruba TODAS as sessões, inclusive a de quem tivesse copiado o
    // cookie — é justamente o que se espera de uma troca de senha. Em seguida
    // emitimos uma sessão nova, para quem trocou não ser expulso do próprio site.
    await revogarTudoDoJogador(conta.id);

    const atualizada = await acharJogadorPorId(conta.id);
    if (!atualizada) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    const cookie = await emitirCookieDeJogador(atualizada, request);
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set({ name: cookie.name, value: cookie.value, ...atributosDoCookie(cookie.maxAge) });

    return comPisoDeTempo(inicio, resposta);
  } catch (error) {
    return respostaDeErro("api/conta/senha", error, "Não foi possível trocar a senha.");
  }
}
