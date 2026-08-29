import { NextResponse } from "next/server";

import { respostaDeErro } from "@/lib/security/resposta-erro";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/security/route-guard";
import { ConflitoDeVersaoError, readDatasetComVersao, saveDataset } from "@/lib/data-store";
import { MAX_SORTEIOS_POR_SERIE, type SeriesMatch } from "@/lib/schema";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  seriesId: z.string().trim().min(1),
  blueSideTeamId: z.string().trim().min(1),
});

// Grava o time que começa no lado azul no jogo 1 (sorteio de lados). O outro começa no vermelho.
export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request, "series:sides");
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
  const { seriesId, blueSideTeamId } = parsed.data;

  try {
    const { dataset, versao: versaoLida } = await readDatasetComVersao();
    const series = dataset.seriesMatches.find((row) => row.id === seriesId);
    if (!series) {
      return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });
    }
    if (blueSideTeamId !== series.teamAId && blueSideTeamId !== series.teamBId) {
      return NextResponse.json({ error: "Time não pertence a esta série." }, { status: 400 });
    }

    const anterior = series.blueSideTeamId;

    // A checagem do teto vem ANTES de qualquer mutação: recusar depois de já ter
    // mexido em `series` deixaria a alteração pendurada no objeto em memória, que é
    // a mesma instância guardada como última cópia boa (ver `readDataset`).
    if (anterior !== blueSideTeamId && (series.sorteios ?? []).length >= MAX_SORTEIOS_POR_SERIE) {
      return NextResponse.json(
        {
          error: `Esta série já acumulou ${MAX_SORTEIOS_POR_SERIE} registros de sorteio. Fale com a organização antes de continuar.`,
        },
        { status: 400 },
      );
    }

    series.blueSideTeamId = blueSideTeamId;

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
    if (anterior !== blueSideTeamId) {
      const registro: NonNullable<SeriesMatch["sorteios"]>[number] = {
        tipo: "lados_manual",
        semente: "",
        emISO: new Date().toISOString(),
        autor: guarda.identity.username,
        resultado: blueSideTeamId,
      };
      if (anterior) registro.detalhe = { sobrescreveu: anterior };
      // Sem `.slice(-50)`: no teto esta rota recusa (acima), em vez de descartar em
      // silêncio o registro mais antigo do histórico append-only.
      series.sorteios = [...(series.sorteios ?? []), registro];
    }

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
            error: "Alguém salvou o campeonato enquanto você sorteava os lados. Recarregue e tente de novo.",
            conflict: true,
            versao: erro.versaoAtual,
          },
          { status: 409 },
        );
      }
      throw erro;
    }
    const savedSeries = saved.seriesMatches.find((row) => row.id === seriesId);
    return NextResponse.json({ ok: true, blueSideTeamId: savedSeries?.blueSideTeamId ?? null });
  } catch (error) {
    return respostaDeErro("admin/series/sides", error, "Falha ao salvar os lados.", 500);
  }
}
