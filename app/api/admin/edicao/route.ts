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
  salvarConfig,
  type EdicaoConfig,
} from "@/lib/inscricoes/store";
import {
  conferenciaPatchSchema,
  configPatchSchema,
  fichaPatchSchema,
  pagamentoPatchSchema,
} from "@/lib/inscricoes/schema";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";
import { hasScope, type Scope } from "@/lib/security/scopes";

export const dynamic = "force-dynamic";

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
  congelar: "inscricoes:conferir",
  pagamento: "inscricoes:financeiro",
};

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
        return NextResponse.json({ ok: true });
      }

      case "ficha": {
        const parsed = fichaPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Ficha inválida." }, { status: 400 });
        }
        const { inscricaoId, ...patch } = parsed.data;
        await atualizarInscricao(inscricaoId, patch, autor);
        return NextResponse.json({ ok: true });
      }

      case "pagamento": {
        const parsed = pagamentoPatchSchema.safeParse(corpo.dados);
        if (!parsed.success) {
          return NextResponse.json({ error: "Pagamento inválido." }, { status: 400 });
        }
        await atualizarPagamento({ ...parsed.data, autor });
        return NextResponse.json({ ok: true });
      }

      case "congelar": {
        const quantidade = await congelarElos(autor);
        return NextResponse.json({ ok: true, quantidade });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro("api/admin/edicao", error, "Não foi possível salvar.");
  }
}
