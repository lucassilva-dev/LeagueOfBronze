import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  alinharCobrancaComAFila,
  atualizarConferencia,
  atualizarInscricao,
  atualizarPagamento,
  congelarElos,
  darCienciaDoAlerta,
  desfazerCienciaDoAlerta,
  emailDaInscricao,
  lerConfig,
  listarAuditoria,
  listarConferencias,
  listarInscricoes,
  listarPagamentos,
  panorama,
  passarVagaPorFaltaDePagamento,
  reavaliarPendentes,
  reavaliarSituacao,
  registrarAuditoria,
  salvarConfig,
  type EdicaoConfig,
} from "@/lib/inscricoes/store";
import { z } from "zod";

import { CODIGOS_DO_ALERTA, escopoDaCiencia } from "@/lib/inscricoes/alertas";
import { ErroDeConflito } from "@/lib/inscricoes/conflito";
import { montarFila, type Fila } from "@/lib/inscricoes/fila";
import { dataDoPrazo } from "@/lib/inscricoes/pagamento";
import { falhasRecentesPorEmail, liberarLoginDaConta } from "@/lib/jogadores/store";
import {
  conferenciaPatchSchema,
  configPatchSchema,
  fichaPatchSchema,
  fichaTemMudanca,
  inscritoPatchSchema,
  motivoDaRecusaDoInscrito,
  pagamentoPatchSchema,
} from "@/lib/inscricoes/schema";
import { sincronizarComRiot, type ResumoDaRodada } from "@/lib/riot/sincronizar";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";
import { hasScope, type Scope } from "@/lib/security/scopes";

export const dynamic = "force-dynamic";
// "Atualizar da Riot agora" consulta a Riot por até 25 s; o padrão da Vercel cortaria antes.
export const maxDuration = 60;

/**
 * Painel da 4ª Edição — leitura e escrita.
 *
 * Uma rota só, com a ação no corpo, porque as quatro escritas são pequenas e
 * compartilham a mesma guarda. O que NÃO é compartilhado é a permissão: cada ação
 * declara o próprio escopo e ele é conferido ANTES de qualquer trabalho. Quem pode
 * conferir requisito não mexe em dinheiro, e quem cuida do caixa não aprova ninguém.
 *
 * Diferente do PUT do dataset, aqui não há trava de concorrência GLOBAL: cada ação toca uma
 * linha e um campo. Dois organizadores conferindo itens diferentes do mesmo inscrito
 * ao mesmo tempo é normal, e não é conflito.
 *
 * O conflito de verdade é a tela velha no MESMO campo: o financeiro com a fila aberta há
 * 15 minutos desfazendo o «pago» que outro acabou de gravar. Para isso cada escrita aceita o
 * valor que a tela viu (`estadoAnterior` no pagamento e nos requisitos, `situacaoAnterior`
 * na ficha). Presente e diferente do banco: 409 `{ error, conflito: true }` e nada muda.
 * Ausente: grava como sempre gravou.
 */

/** O que a organização vê. Bem mais do que o jogador — inclusive contato. */
export type PainelEdicao = {
  config: EdicaoConfig;
  inscritos: Awaited<ReturnType<typeof listarInscricoes>>;
  conferencias: Awaited<ReturnType<typeof listarConferencias>>;
  pagamentos: Awaited<ReturnType<typeof listarPagamentos>>;
  panorama: ReturnType<typeof panorama>;
  auditoria: Awaited<ReturnType<typeof listarAuditoria>>;
  /** Titulares, fila de reserva e o lugar de cada inscrito (D1, `montarFila`). */
  fila: Fila;
  /**
   * Falhas de login recentes (janela do limitador) que travam a conta de cada inscrito, por
   * id da inscrição — só quem tem alguma. É o número que a gaveta mostra antes do «Liberar
   * login» (F). `null` quando a leitura falhou: o painel carrega do mesmo jeito.
   */
  falhasDeLogin: Record<string, number> | null;
};

/** As falhas de login por inscrito. Nunca derruba o painel: na falha, `null`. */
async function falhasDeLoginPorInscrito(
  inscritos: readonly { id: string; email: string }[],
): Promise<Record<string, number> | null> {
  try {
    const porEmail = await falhasRecentesPorEmail();
    const resultado: Record<string, number> = {};
    for (const i of inscritos) {
      const n = porEmail.get(i.email.trim().toLowerCase()) ?? 0;
      if (n > 0) resultado[i.id] = n;
    }
    return resultado;
  } catch (erro) {
    console.error("[api/admin/edicao] falhas de login indisponíveis", erro);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  // Ler o painel exige conferir OU financeiro — qualquer um dos dois basta, e nenhum
  // outro escopo serve. `requireAdmin` só sabe exigir UM escopo; exigir "conferir"
  // aqui trancaria quem cuida só do caixa para fora da própria tela de pagamentos.
  //
  // A lista traz e-mail, WhatsApp e Discord de ~50 pessoas, então também não pode
  // ficar aberta a qualquer conta de admin.
  const pode =
    hasScope(guarda.identity, "inscricoes:conferir") ||
    hasScope(guarda.identity, "inscricoes:financeiro");

  if (!pode) {
    return NextResponse.json(
      {
        error: "Você não tem permissão para ver as inscrições da 4ª Edição.",
        missing: ["inscricoes:conferir", "inscricoes:financeiro"],
      },
      { status: 403 },
    );
  }

  try {
    const [config, inscritos, conferencias, pagamentos, auditoria] = await Promise.all([
      lerConfig(),
      listarInscricoes(),
      listarConferencias(),
      listarPagamentos(),
      listarAuditoria(),
    ]);

    const corpo: PainelEdicao = {
      config,
      inscritos,
      conferencias,
      pagamentos,
      panorama: panorama(inscritos, pagamentos, config),
      auditoria,
      fila: montarFila(inscritos, config),
      falhasDeLogin: await falhasDeLoginPorInscrito(inscritos),
    };

    const resposta = NextResponse.json(corpo);
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/admin/edicao", error, "Não foi possível carregar a edição.");
  }
}

const cienciaSchema = z.union([
  z.object({
    inscricaoId: z.string().uuid(),
    codigo: z.enum(CODIGOS_DO_ALERTA),
    // O texto que a tela mostrou: a ciência vale para ELE (o servidor confere com o de agora).
    texto: z.string().min(1).max(2000),
    // A assinatura que a tela calculou (texto + fatos: pagamento, prazo), quando vai além do
    // texto. Mesmo texto com outros fatos = 409: a tela não dá ciência do que não mostrou.
    assinatura: z.string().min(1).max(4000).optional(),
    desfazer: z.literal(false).optional(),
  }),
  z.object({
    inscricaoId: z.string().uuid(),
    codigo: z.enum(CODIGOS_DO_ALERTA),
    desfazer: z.literal(true),
  }),
]);

/**
 * Cada ação com o seu escopo. A tabela é a fonte da verdade da autorização.
 *
 * A ciência de um alerta é a única ação cujo escopo depende do corpo: alerta do caixa pede o
 * financeiro, os outros a conferência (`escopoDaCiencia`) — quem cuida só do caixa dá ciência
 * do «aprovado sem pagamento», e não do «declarou Ouro, a Riot mostra Diamante». A função lê
 * o corpo sem tocar no banco; corpo inválido = nulo = 400, antes de qualquer trabalho.
 */
const ESCOPO_DA_ACAO: Record<string, Scope | ((dados: unknown) => Scope | null)> = {
  config: "edicao:configurar",
  conferencia: "inscricoes:conferir",
  ficha: "inscricoes:conferir",
  inscrito: "inscricoes:conferir",
  congelar: "inscricoes:conferir",
  pagamento: "inscricoes:financeiro",
  sincronizar_riot: "inscricoes:conferir",
  // D5: tira da vaga quem não pagou no prazo (vira desistente) e chama o 1º da fila. Mexe na
  // situação, como a ficha — não no caixa: o pagamento dele não é tocado.
  passar_vaga: "inscricoes:conferir",
  // F: destranca a conta do inscrito (as falhas recentes deixam de contar contra ela).
  liberar_login: "inscricoes:conferir",
  // «Dar ciência» / «Desfazer» de um alerta da gaveta (pedido de 2026-10-23).
  alerta_ciencia: (dados) => {
    const parsed = cienciaSchema.safeParse(dados);
    return parsed.success ? escopoDaCiencia(parsed.data.codigo) : null;
  },
};

const sincronizarSchema = z.object({ inscricaoId: z.string().uuid().optional() }).optional();
const passarVagaSchema = z.object({ inscricaoId: z.string().uuid() });
const liberarLoginSchema = z.object({ inscricaoId: z.string().uuid() });

/**
 * Depois de toda gravação que pode mudar a fila (situação, organizador, teto de times), o
 * prazo de cada cobrança em aberto é alinhado com ela NA MESMA ação (D2 e D4): quem entrou
 * na fila perde o prazo, quem foi chamado ganha o dele (`alinharCobrancaComAFila`).
 *
 * Falhar aqui NÃO derruba o salvamento — o que a organização gravou já está no banco, e o
 * próximo alinhamento (qualquer gravação seguinte) acerta. A resposta leva o aviso.
 */
async function alinharFila(autor: string): Promise<{ chamados: number; avisoFila?: string }> {
  try {
    const { chamados } = await alinharCobrancaComAFila(autor);
    return { chamados: chamados.length };
  } catch (erro) {
    console.error("[api/admin/edicao] falha ao alinhar a fila de reserva", erro);
    return {
      chamados: 0,
      avisoFila: "Salvo, mas o prazo de pagamento da fila não foi atualizado. Salve de novo em instantes.",
    };
  }
}

/** A ficha mexe na fila só quando traz situação ou organizador. */
function fichaMexeNaFila(ficha: Readonly<{ situacao?: unknown; organizador?: unknown }> | undefined): boolean {
  return ficha?.situacao !== undefined || ficha?.organizador !== undefined;
}

/**
 * Depois de toda gravação que pode completar a lista de alguém (requisito, ficha,
 * pagamento), o sistema confere se a pessoa já pode virar apto (ver `situacaoSugerida`).
 *
 * Falhar aqui NÃO derruba o salvamento: o que a organização gravou já está no banco, e a
 * rotina diária reavalia todos os pendentes de novo. Devolver erro faria a tela dizer "não
 * foi possível salvar" sobre algo que foi salvo.
 */
const VIROU_APTO = "Salvo. Virou Apto: requisitos cumpridos e pagamento confirmado.";

/** O que a organização lê depois de "Atualizar da Riot agora". */
function mensagemDaRodada(resumo: ResumoDaRodada, promovidos: number): string {
  if (resumo.desligado === "sem_chave") return "O robô da Riot está desligado neste ambiente (sem chave da API).";
  if (resumo.desligado === "pausado") {
    return "A Riot pediu uma pausa (limite de requisições). Tente de novo em alguns minutos.";
  }
  if (resumo.desligado === "travado") return "Outra atualização da Riot está rodando agora. Tente de novo em instantes.";

  const partes = [
    `Riot: ${resumo.processados} de ${resumo.naFila} consultados`,
    `${resumo.elosMudados} elo(s) mudaram`,
    `${resumo.itensGravados} requisito(s) atualizados`,
  ];
  if (resumo.erros > 0) partes.push(`${resumo.erros} com erro`);
  let texto = partes.join(", ") + ".";
  if (resumo.parouPor === "chave_recusada") texto += " A Riot recusou a chave da API — renove a RIOT_API_KEY.";
  else if (resumo.parouPor) texto += " Parou antes do fim (tempo ou limite da Riot) — clique de novo para continuar.";
  if (promovidos > 0) texto += ` ${promovidos} virou(aram) Apto.`;
  return texto;
}

async function reavaliar(inscricaoId: string, gatilho: string): Promise<boolean> {
  try {
    return await reavaliarSituacao(inscricaoId, gatilho);
  } catch (erro) {
    console.error("[api/admin/edicao] falha ao reavaliar a situação", erro);
    return false;
  }
}

export async function PATCH(request: NextRequest) {
  // Guarda mínima primeiro (sessão + origem), sem escopo: o escopo depende da ação,
  // que só se conhece depois de ler o corpo.
  const base = await requireAdmin(request);
  if (!base.ok) return base.response;

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const corpo = lido.corpo as { acao?: string; dados?: unknown };
  const acao = corpo?.acao;
  // `Object.hasOwn`, e não `in`: o `in` enxerga o protótipo, então `{"acao":"toString"}`
  // passava por "ação conhecida" e o escopo virava a própria função `toString`. A resposta
  // saía 403 com a mensagem "Você não tem permissão para: function toString() { [native
  // code] }" e `missing: [null]` (JSON.stringify serializa função em array como null) —
  // quando o certo é 400 "Ação desconhecida.".
  if (typeof acao !== "string" || !Object.hasOwn(ESCOPO_DA_ACAO, acao)) {
    return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
  }

  // Agora sim, o escopo da ação pedida — antes de tocar no banco.
  const regra = ESCOPO_DA_ACAO[acao]!;
  const escopo = typeof regra === "function" ? regra(corpo.dados) : regra;
  if (!escopo) return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  const guarda = await requireAdmin(request, escopo);
  if (!guarda.ok) return guarda.response;

  const autor = guarda.identity.username;

  try {
    switch (acao) {
      case "config": {
        const parsed = configPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          // A chave Pix recusada diz o porquê (telefone sem +55, CPF com dígito errado…): é
          // texto nosso, em português. O resto continua genérico.
          const pix = parsed.error.issues.find((i) => i.path[0] === "chave_pix" && i.code === "custom");
          return NextResponse.json({ error: pix?.message ?? "Configuração inválida." }, { status: 400 });
        }
        const config = await salvarConfig(parsed.data, autor);
        // O teto de times e os jogadores por time mudam as vagas — e com elas a fila.
        const fila =
          parsed.data.max_times !== undefined || parsed.data.jogadores_por_time !== undefined
            ? await alinharFila(autor)
            : {};
        return NextResponse.json({ ok: true, config, ...fila });
      }

      case "conferencia": {
        const parsed = conferenciaPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Conferência inválida." }, { status: 400 });
        }
        await atualizarConferencia({ ...parsed.data, autor });
        const promovido = await reavaliar(parsed.data.inscricaoId, "conferencia");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }) });
      }

      case "ficha": {
        const parsed = fichaPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Ficha inválida." }, { status: 400 });
        }
        const { inscricaoId, ...patch } = parsed.data;
        await atualizarInscricao(inscricaoId, patch, autor);
        const fila = fichaMexeNaFila(patch) ? await alinharFila(autor) : {};
        const promovido = await reavaliar(inscricaoId, "ficha");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }), ...fila });
      }

      case "inscrito": {
        const parsed = inscritoPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          const caminho = parsed.error.issues[0]?.path ?? [];
          return NextResponse.json({ error: motivoDaRecusaDoInscrito(caminho, corpo.dados) }, { status: 400 });
        }
        const { inscricaoId, conferencias = [], ficha } = parsed.data;

        /*
         * Requisitos primeiro, ficha depois — e a ficha só se TODOS os requisitos gravaram.
         * A ordem importa porque a ficha costuma trazer a situação: "apto" não pode ficar
         * gravado se o requisito que o justifica falhou no caminho.
         *
         * Não é transação (são linhas separadas pelo cliente do Supabase). `allSettled`, e não
         * `all`: com `all` a primeira falha respondia na hora, com as outras gravações ainda
         * correndo — na Vercel, trabalho depois da resposta não tem garantia de terminar, e o
         * requisito podia ficar gravado sem a linha de auditoria. Assim a resposta só sai
         * quando tudo terminou, e a tela (que recarrega também na falha) mostra o que de fato
         * foi gravado e deixa no rascunho só o resto.
         */
        const gravacoes = await Promise.allSettled(
          conferencias.map((c) => atualizarConferencia({ inscricaoId, ...c, autor })),
        );
        const falha = gravacoes.find((g): g is PromiseRejectedResult => g.status === "rejected");
        if (falha) throw falha.reason;
        const mudouFicha = ficha !== undefined && fichaTemMudanca(ficha);
        if (mudouFicha) {
          await atualizarInscricao(inscricaoId, ficha, autor);
        }
        const fila = mudouFicha && fichaMexeNaFila(ficha) ? await alinharFila(autor) : {};
        const promovido = await reavaliar(inscricaoId, "inscrito");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }), ...fila });
      }

      case "pagamento": {
        const parsed = pagamentoPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pagamento inválido." }, { status: 400 });
        }
        await atualizarPagamento({ ...parsed.data, autor });
        const promovido = await reavaliar(parsed.data.inscricaoId, "pagamento");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }) });
      }

      case "congelar": {
        const quantidade = await congelarElos(autor);
        return NextResponse.json({ ok: true, quantidade });
      }

      case "sincronizar_riot": {
        // A mesma rodada do cron diário, curta: 25 s. A fila começa por quem está há mais
        // tempo sem consulta, então apertar de novo continua de onde parou.
        const parsed = sincronizarSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
        }
        const inscricaoId = parsed.data?.inscricaoId;
        const resumo = await sincronizarComRiot({ orcamentoMs: 25_000, inscricaoId });
        const promovidos = inscricaoId
          ? (await reavaliar(inscricaoId, "riot"))
            ? 1
            : 0
          : (await reavaliarPendentes().catch((erro) => {
              console.error("[api/admin/edicao] falha ao reavaliar os pendentes", erro);
              return [];
            })).length;
        return NextResponse.json({ ok: true, resumo, promovidos, mensagem: mensagemDaRodada(resumo, promovidos) });
      }

      case "passar_vaga": {
        // D5: um clique, com confirmação na tela. As condições (titular, não organizador,
        // «aguardando» com o prazo vencido) são conferidas de novo no servidor.
        const parsed = passarVagaSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
        }
        const { chamados, filaAlinhada } = await passarVagaPorFaltaDePagamento(parsed.data.inscricaoId, autor);
        // Com o prazo de cada chamado: depois de 31/10 ele tem 48 h contadas de AGORA, e só a
        // data faria a organização avisar «até 04/11» de um prazo que acaba às 15:37.
        const nomes = chamados
          .map((c) => `${c.riotId ?? "o próximo da fila"} (paga até ${dataDoPrazo(c.venceEm, "pt-BR", { ano: false, fuso: false })})`)
          .join(", ");
        const mensagem = !filaAlinhada
          ? "Vaga liberada, mas o prazo do próximo da fila não foi gravado. Salve qualquer ficha em instantes para chamá-lo."
          : chamados.length > 0
            ? `Vaga liberada. Chamado(s) da fila: ${nomes} — o prazo de pagamento já vale.`
            : "Vaga liberada. Ninguém na fila para chamar agora.";
        return NextResponse.json({ ok: true, chamados, filaAlinhada, mensagem });
      }

      case "liberar_login": {
        // F: as falhas recentes da conta deixam de contar contra ela; o teto por IP fica como
        // está (o IP do atacante continua bloqueado). Nada de e-mail no corpo nem na resposta:
        // a conta sai da inscrição, no servidor.
        const parsed = liberarLoginSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
        }
        const conta = await emailDaInscricao(parsed.data.inscricaoId);
        if (!conta) return NextResponse.json({ error: "Inscrição não encontrada." }, { status: 404 });
        const liberadas = await liberarLoginDaConta(conta.email);
        await registrarAuditoria({
          inscricaoId: parsed.data.inscricaoId,
          autor,
          acao: "login_liberado",
          detalhe: { falhasLiberadas: liberadas },
        });
        return NextResponse.json({
          ok: true,
          liberadas,
          mensagem:
            liberadas > 0
              ? `Login liberado: ${liberadas} falha(s) recente(s) deixaram de contar contra a conta de ${conta.riotId}.`
              : `A conta de ${conta.riotId} não tinha falhas recentes para liberar.`,
        });
      }

      case "alerta_ciencia": {
        // O escopo (pelo código do alerta) já foi conferido acima. O servidor recalcula os
        // alertas de agora e só aceita ciência de um que EXISTE com o código e o texto que a
        // tela mostrou — senão 409, e a tela recarrega para mostrar o alerta de agora.
        const parsed = cienciaSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
        }
        const { inscricaoId, codigo } = parsed.data;
        if (parsed.data.desfazer === true) {
          await desfazerCienciaDoAlerta({ inscricaoId, codigo, autor });
          return NextResponse.json({ ok: true, mensagem: "Ciência desfeita: o alerta volta a contar." });
        }
        const { jaTinha } = await darCienciaDoAlerta({
          inscricaoId,
          codigo,
          texto: parsed.data.texto,
          assinatura: parsed.data.assinatura,
          autor,
        });
        return NextResponse.json({
          ok: true,
          mensagem: jaTinha
            ? "Esse alerta já tinha ciência (outra pessoa registrou antes)."
            : "Ciência registrada: o alerta para de contar enquanto for o mesmo (o mesmo texto e os mesmos fatos por trás dele).",
        });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (error) {
    // A tela gravava por cima de um valor que já mudou: 409, para ela recarregar e mostrar o
    // valor de agora (ver `ErroDeConflito`). Antes do `respostaDeErro`, que daria 400.
    if (error instanceof ErroDeConflito) {
      return NextResponse.json({ error: error.message, conflito: true }, { status: 409 });
    }
    return respostaDeErro("api/admin/edicao", error, "Não foi possível salvar.");
  }
}
