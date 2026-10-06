import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  atualizarConferencia,
  atualizarInscricao,
  atualizarPagamento,
  congelarElos,
  lerConfig,
  listarAuditoria,
  listarConferencias,
  listarInscricoes,
  listarPagamentos,
  panorama,
  reavaliarPendentes,
  reavaliarSituacao,
  salvarConfig,
  type EdicaoConfig,
} from "@/lib/inscricoes/store";
import { z } from "zod";

import {
  conferenciaPatchSchema,
  configPatchSchema,
  fichaPatchSchema,
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
 * Diferente do PUT do dataset, aqui não há trava de concorrência: cada ação toca uma
 * linha e um campo. Dois organizadores conferindo itens diferentes do mesmo inscrito
 * ao mesmo tempo é normal, e não é conflito.
 */

/** O que a organização vê. Bem mais do que o jogador — inclusive contato. */
export type PainelEdicao = {
  config: EdicaoConfig;
  inscritos: Awaited<ReturnType<typeof listarInscricoes>>;
  conferencias: Awaited<ReturnType<typeof listarConferencias>>;
  pagamentos: Awaited<ReturnType<typeof listarPagamentos>>;
  panorama: ReturnType<typeof panorama>;
  auditoria: Awaited<ReturnType<typeof listarAuditoria>>;
};

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
    };

    const resposta = NextResponse.json(corpo);
    resposta.headers.set("Cache-Control", "no-store, private");
    return resposta;
  } catch (error) {
    return respostaDeErro("api/admin/edicao", error, "Não foi possível carregar a edição.");
  }
}

/** Cada ação com o seu escopo. A tabela é a fonte da verdade da autorização. */
const ESCOPO_DA_ACAO: Record<string, Scope> = {
  config: "edicao:configurar",
  conferencia: "inscricoes:conferir",
  ficha: "inscricoes:conferir",
  inscrito: "inscricoes:conferir",
  congelar: "inscricoes:conferir",
  pagamento: "inscricoes:financeiro",
  sincronizar_riot: "inscricoes:conferir",
};

const sincronizarSchema = z.object({ inscricaoId: z.string().uuid().optional() }).optional();

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
  const guarda = await requireAdmin(request, ESCOPO_DA_ACAO[acao]);
  if (!guarda.ok) return guarda.response;

  const autor = guarda.identity.username;

  try {
    switch (acao) {
      case "config": {
        const parsed = configPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
        }
        const config = await salvarConfig(parsed.data);
        return NextResponse.json({ ok: true, config });
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
        const promovido = await reavaliar(inscricaoId, "ficha");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }) });
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
        if (ficha && Object.values(ficha).some((valor) => valor !== undefined)) {
          await atualizarInscricao(inscricaoId, ficha, autor);
        }
        const promovido = await reavaliar(inscricaoId, "inscrito");
        return NextResponse.json({ ok: true, promovido, ...(promovido && { mensagem: VIROU_APTO }) });
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

      default:
        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro("api/admin/edicao", error, "Não foi possível salvar.");
  }
}
