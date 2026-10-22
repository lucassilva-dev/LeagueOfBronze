import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getJogadorIdentity } from "@/lib/jogadores/auth";
import { criarInscricao, inscricaoIdDoJogador } from "@/lib/inscricoes/store";
import { inscricaoPublicaSchema } from "@/lib/inscricoes/schema";
import { getClientIp, hashIp } from "@/lib/security/admin-store";
import { ehErroDeRegra } from "@/lib/security/erros";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/** 409 de quem já tem inscrição: a tela mostra "Você já está inscrito", e não um erro. */
function jaInscrito() {
  return NextResponse.json(
    {
      error: "Você já tem uma inscrição nesta edição. Para corrigir algo nela, fale com a organização.",
      codigo: "ja_inscrito",
      jaInscrito: true,
    },
    { status: 409 },
  );
}

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
 * EXIGE sessão de jogador, e isso não é burocracia: sem dono, a inscrição precisaria
 * ser reivindicada depois pelo e-mail, e como não há confirmação de e-mail bastaria
 * saber o endereço de um inscrito para assumir a inscrição dele. Não é porta a mais
 * na prática — o formulário cria a conta no primeiro passo, numa tela só.
 *
 * Os erros desta rota levam um `codigo` estável além do texto: o texto é fixo em
 * português, e é pelo código que a tela mostra a mensagem no idioma de quem lê
 * (`inscricao.erros` em lib/i18n/messages/inscricao.ts).
 */
export async function POST(request: NextRequest) {
  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const identidade = await getJogadorIdentity(request);
  if (!identidade) {
    return NextResponse.json(
      {
        error: "Crie sua conta ou entre antes de enviar a inscrição.",
        codigo: "precisa_entrar",
        precisaEntrar: true,
      },
      { status: 401 },
    );
  }

  /*
   * Formulário de antes de 05/10/2026, aberto numa aba que não recarregou depois do deploy.
   * Ele nunca manda `disponibilidade` (o campo não existia), e o schema o recusaria
   * apontando para um campo que aquela tela nem tem: a pessoa leria "Confira os campos
   * destacados" sem nada destacado. Aqui ela lê o que fazer. O formulário atual sempre
   * manda o campo — vazio ou não —, então isto não alcança ninguém mais.
   */
  if (
    lido.corpo !== null &&
    typeof lido.corpo === "object" &&
    !Array.isArray(lido.corpo) &&
    !("disponibilidade" in lido.corpo)
  ) {
    return NextResponse.json(
      {
        error:
          "O formulário de inscrição foi atualizado. Recarregue a página (F5) e preencha de novo — a sua conta continua criada, é só seguir.",
        codigo: "formulario_desatualizado",
        formularioDesatualizado: true,
      },
      { status: 409 },
    );
  }

  const parsed = inscricaoPublicaSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    // Diferente das rotas de admin: aqui quem lê é o jogador preenchendo o
    // formulário, então a mensagem precisa dizer qual campo corrigir.
    const problemas = parsed.error.issues.slice(0, 6).map((i) => ({
      campo: i.path.join(".") || "formulario",
      mensagem: i.message,
    }));
    return NextResponse.json(
      { error: "Confira os campos destacados.", codigo: "campos_invalidos", problemas },
      { status: 400 },
    );
  }

  try {
    /*
     * Quem JÁ tem inscrição recebe um 409 com sinalizador, e não o 400 genérico do store.
     * O caso real: o servidor gravou, mas a resposta se perdeu (rede do celular, prazo de
     * 15 s), a pessoa viu "não foi possível enviar" e reenviou. Com o 400 ela ficava no
     * passo 3 com tom de erro, sem recibo, sem Pix e sem caminho para Minha inscrição;
     * com o sinalizador, a tela mostra "Você já está inscrito" com o link.
     *
     * O store continua barrando a duplicata por conta própria (e o índice único, por
     * baixo dele): isto só escolhe a resposta, não é a trava.
     */
    if (await inscricaoIdDoJogador(identidade.id)) return jaInscrito();

    const inscricao = await criarInscricao(parsed.data, {
      ipHash: hashIp(getClientIp(request.headers)),
      jogadorId: identidade.id,
      email: identidade.email,
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
    // O mesmo caso por outro caminho: o 1º envio ainda estava gravando (o prazo de 15 s do
    // celular venceu antes) quando o reenvio passou pela conferência acima. O store ou o
    // índice único barram o reenvio com uma regra; se a conta TEM inscrição agora, a
    // resposta certa é a mesma "já inscrito". Na dúvida (a leitura falhou), o erro original.
    if (ehErroDeRegra(error) && (await inscricaoIdDoJogador(identidade.id).catch(() => null))) {
      return jaInscrito();
    }
    return respostaDeErro("api/inscricao", error, "Não foi possível registrar a inscrição.");
  }
}
