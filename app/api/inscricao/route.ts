import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { criarInscricao } from "@/lib/inscricoes/store";
import { inscricaoPublicaSchema } from "@/lib/inscricoes/schema";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Inscrição pública da 4ª Edição.
 *
 * É a primeira rota do site que aceita escrita de quem não é da organização. As
 * proteções que `requireAdmin` dá de graça (origem, teto de corpo) vêm de
 * `lerCorpoPublico`; as específicas ficam aqui e no store:
 *
 *  - validação por schema, com os pontos derivados do elo NO SERVIDOR;
 *  - freio por origem, dentro do store;
 *  - janela de inscrição conferida no servidor — esconder o botão não é fechar.
 *
 * O que ela deliberadamente NÃO faz: gravar direto do navegador no banco. As tabelas
 * têm RLS forçado e zero policies — nem a chave pública as alcança.
 *
 * A conta de jogador é OPCIONAL aqui. Quem já está logado tem a inscrição amarrada à
 * conta na hora; quem se inscreve sem conta é amarrado depois, pelo e-mail, quando
 * criar a conta (`vincularInscricaoPorEmail`). Exigir conta antes de inscrever só
 * colocaria uma porta a mais entre a pessoa e o campeonato.
 */
export async function POST(request: NextRequest) {
  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = inscricaoPublicaSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    // Diferente das rotas de admin: aqui quem lê é o jogador preenchendo o
    // formulário, então a mensagem precisa dizer qual campo corrigir.
    const problemas = parsed.error.issues.slice(0, 6).map((i) => ({
      campo: i.path.join(".") || "formulario",
      mensagem: i.message,
    }));
    return NextResponse.json({ error: "Confira os campos destacados.", problemas }, { status: 400 });
  }

  try {
    const identidade = await getJogadorIdentity(request);
    const inscricao = await criarInscricao(parsed.data, {
      ipHash: hashIp(getClientIp(request.headers)),
      jogadorId: identidade?.id ?? null,
    });

    // Devolve só o que a pessoa precisa ver de volta. Nada de e-mail, WhatsApp,
    // Discord ou id interno — a resposta de um endpoint público não é lugar disso.
    return NextResponse.json({
      ok: true,
      riotId: inscricao.riot_id,
      mensagem:
        "Recebemos sua inscrição. A organização vai conferir os requisitos e confirmar no Discord assim que o pagamento cair.",
    });
  } catch (error) {
    return respostaDeErro("api/inscricao", error, "Não foi possível registrar a inscrição.");
  }
}
