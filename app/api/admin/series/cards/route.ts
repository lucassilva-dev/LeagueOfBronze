import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/security/route-guard";
import { isDuplaCard } from "@/lib/cards";
import { ConflitoDeVersaoError, readDatasetComVersao, saveDataset } from "@/lib/data-store";
import { cardIdSchema, MAX_SORTEIOS_POR_SERIE, type SeriesMatch } from "@/lib/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  seriesId: z.string().trim().min(1),
  // teamId é obrigatório no sorteio individual; no sorteio duplo a carta vale para os dois times.
  teamId: z.string().trim().min(1).optional(),
  cardId: cardIdSchema,
  dupla: z.boolean().optional(),
});

// Grava a carta sorteada ao vivo numa série (1 carta por time — substitui a anterior).
// dupla: true → os DOIS capitães usaram, a carta sorteada vale para os dois times.
export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "series:cards");
  if (!guarda.ok) return guarda.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const { seriesId, teamId, cardId, dupla } = parsed.data;

  // No sorteio duplo valem as 8 cartas; no individual, só as 6 (as duplas não entram no pool).
  if (!dupla && isDuplaCard(cardId)) {
    return NextResponse.json(
      { error: "Cartas duplas só valem quando os dois capitães usam." },
      { status: 400 },
    );
  }
  if (!dupla && !teamId) {
    return NextResponse.json({ error: "Time obrigatório no sorteio individual." }, { status: 400 });
  }

  try {
    const { dataset, versao: versaoLida } = await readDatasetComVersao();
    const series = dataset.seriesMatches.find((row) => row.id === seriesId);
    if (!series) {
      return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });
    }

    if (dupla) {
      // Sorteio único que atinge os dois times — grava a mesma carta para ambos.
      series.cardsUsed = [
        { teamId: series.teamAId, cardId, dupla: true },
        { teamId: series.teamBId, cardId, dupla: true },
      ];
    } else {
      if (teamId !== series.teamAId && teamId !== series.teamBId) {
        return NextResponse.json({ error: "Time não pertence a esta série." }, { status: 400 });
      }
      // Um sorteio individual descarta um sorteio duplo anterior (não convivem na mesma série).
      const others = (series.cardsUsed ?? []).filter(
        (card) => card.teamId !== teamId && !card.dupla,
      );
      series.cardsUsed = [...others, { teamId: teamId as string, cardId }];
    }


/**
 * Registro de sobrescrita manual.
 *
 * Esta rota recebe o resultado PRONTO — ela existe para a organização corrigir um
 * registro à mão. O problema era o silêncio: dava para sortear pela rota nova, não
 * gostar, e gravar o outro resultado por aqui. O histórico continuava com um único
 * sorteio que CONFERIA pela semente, enquanto o dataset dizia o contrário. Um rastro
 * de auditoria que passa na verificação e mente é pior do que não ter rastro.
 *
 * Agora toda definição manual entra no histórico com `semente` vazia e o valor que ela
 * substituiu, então a divergência fica visível em vez de invisível.
 */
    const registro: NonNullable<SeriesMatch["sorteios"]>[number] = {
      tipo: "carta_manual",
      semente: "",
      emISO: new Date().toISOString(),
      autor: guarda.identity.username,
      resultado: cardId,
      detalhe: { dupla: Boolean(dupla) },
    };
    if (!dupla && teamId) registro.teamId = teamId;

    // No teto, RECUSA — não descarta o registro mais antigo para caber. O `.slice(-50)`
    // que estava aqui apagava em silêncio a entrada mais antiga do histórico que o
    // comentário acima defende, e ainda deixava a série presa em exatamente 50, o que
    // bloqueava para sempre o sorteio ao vivo (que recusa em `>= MAX_SORTEIOS_POR_SERIE`).
    if ((series.sorteios ?? []).length >= MAX_SORTEIOS_POR_SERIE) {
      return NextResponse.json(
        {
          error: `Esta série já acumulou ${MAX_SORTEIOS_POR_SERIE} registros de sorteio. Fale com a organização antes de continuar.`,
        },
        { status: 400 },
      );
    }
    series.sorteios = [...(series.sorteios ?? []), registro];

    /*
     * Trava de concorrência ATÔMICA: a versão lida vai junto com a gravação, e o banco
     * recusa se ela já não for a atual. Conferir antes e gravar depois deixava uma janela
     * entre os dois passos por onde outra requisição inteira passava.
     */
    let saved;
    try {
      saved = await saveDataset(dataset, { versaoEsperada: versaoLida });
    } catch (erro) {
      if (erro instanceof ConflitoDeVersaoError) {
        return NextResponse.json(
          {
            error: "Alguém salvou o campeonato enquanto você sorteava a carta. Recarregue e tente de novo.",
            conflict: true,
            versao: erro.versaoAtual,
          },
          { status: 409 },
        );
      }
      throw erro;
    }
    const savedSeries = saved.seriesMatches.find((row) => row.id === seriesId);
    return NextResponse.json({ ok: true, cardsUsed: savedSeries?.cardsUsed ?? [] });
  } catch (error) {
    return respostaDeErro("admin/series/cards", error, "Falha ao salvar a carta.", 500);
  }
}
