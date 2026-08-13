import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { readDataset, saveDataset } from "@/lib/data-store";
import { iniciarDraft, pausarDraft, retomarDraft } from "@/lib/draft/motor";
import { datasetDoDraft, problemasDaVirada } from "@/lib/draft/virada";
import {
  lerDraftCompleto,
  montarDraftDosAprovados,
  paraPublico,
  salvarDraftSeIntacto,
  type MetodoDeCapitao,
} from "@/lib/draft/store";
import { registrarAuditoria } from "@/lib/inscricoes/store";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * Condução do draft pela organização: montar, iniciar, pausar, retomar.
 *
 * Escopo `draft:conduzir` para tudo, separado de `inscricoes:conferir` de propósito —
 * quem confere requisito não precisa poder refazer o sorteio no meio do evento.
 *
 * "Montar" é a ação perigosa: ela DESCARTA um draft em andamento. Por isso exige uma
 * confirmação explícita no corpo, e não apenas o escopo.
 */

const METODOS: MetodoDeCapitao[] = ["mid", "adc", "pior", "voluntarios", "manual"];

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "draft:conduzir");
  if (!guarda.ok) return guarda.response;

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const corpo = lido.corpo as {
    acao?: string;
    metodo?: string;
    capitaes?: unknown;
    confirmoDescartar?: unknown;
  };
  const autor = guarda.identity.username;

  try {
    const { estado, revisao } = await lerDraftCompleto();

    switch (corpo?.acao) {
      case "montar": {
        const metodo = METODOS.find((m) => m === corpo.metodo);
        if (!metodo) return NextResponse.json({ error: "Método de capitão inválido." }, { status: 400 });

        // Um draft já iniciado é histórico ao vivo: refazer apaga escolhas que já
        // foram anunciadas. Exigir a confirmação evita que um clique errado no meio
        // do evento zere tudo.
        if (estado && estado.fase !== "preparando" && corpo.confirmoDescartar !== true) {
          return NextResponse.json(
            {
              error: "Já existe um draft em andamento. Confirme que quer descartá-lo e sortear de novo.",
              precisaConfirmar: true,
            },
            { status: 409 },
          );
        }

        const capitaes = Array.isArray(corpo.capitaes)
          ? corpo.capitaes.filter((c): c is string => typeof c === "string")
          : [];

        const novo = await montarDraftDosAprovados({ metodo, capitaesManuais: capitaes });
        const gravou = await salvarDraftSeIntacto(novo, revisao);
        if (!gravou) return conflito();

        await registrarAuditoria({
          autor,
          acao: "draft_montado",
          detalhe: { metodo, times: novo.times.length, escolhas: novo.ordem.length },
        });
        return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
      }

      case "iniciar":
      case "pausar":
      case "retomar": {
        if (!estado) return NextResponse.json({ error: "Monte o draft primeiro." }, { status: 409 });

        const agora = Date.now();
        const novo =
          corpo.acao === "iniciar"
            ? iniciarDraft(estado, agora)
            : corpo.acao === "pausar"
              ? pausarDraft(estado)
              : retomarDraft(estado, agora);

        const gravou = await salvarDraftSeIntacto(novo, revisao);
        if (!gravou) return conflito();

        await registrarAuditoria({ autor, acao: `draft_${corpo.acao}` });
        return NextResponse.json({ ok: true, draft: paraPublico(novo, revisao + 1) });
      }

      case "prever":
      case "virar": {
        if (!estado) return NextResponse.json({ error: "Monte o draft primeiro." }, { status: 409 });

        const problemas = problemasDaVirada(estado);
        const resultado = datasetDoDraft(estado);

        if (corpo.acao === "prever") {
          // Só olha. A organização confere os elencos antes de qualquer escrita no
          // dataset público — que é de onde o site inteiro lê.
          return NextResponse.json({ ok: true, problemas, ...resultado });
        }

        if (problemas.length > 0) {
          return NextResponse.json({ error: "O draft ainda não está pronto para virar.", problemas }, { status: 409 });
        }

        const dataset = await readDataset();

        // ⚠ Trava que não estava no plano, e que precisa existir: trocar os jogadores
        // de uma temporada que JÁ TEM partidas registradas deixa as estatísticas
        // apontando para gente que não está mais no dataset — placar de série
        // referenciando jogador inexistente. A virada é para uma temporada recém
        // aberta, não para uma em andamento.
        if (dataset.seriesMatches.length > 0) {
          return NextResponse.json(
            {
              error:
                "Esta temporada já tem séries registradas. Arquive-a e comece a 4ª Edição antes de aplicar o draft.",
            },
            { status: 409 },
          );
        }

        await saveDataset({ ...dataset, teams: resultado.teams, players: resultado.players });

        await registrarAuditoria({
          autor,
          acao: "draft_virado_para_o_dataset",
          detalhe: { times: resultado.teams.length, jogadores: resultado.players.length },
        });

        return NextResponse.json({ ok: true, ...resultado });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 });
    }
  } catch (error) {
    return respostaDeErro("api/admin/draft", error, "Não foi possível conduzir o draft.");
  }
}

function conflito() {
  return NextResponse.json(
    { error: "O draft mudou enquanto você agia. Recarregue e tente de novo." },
    { status: 409 },
  );
}
