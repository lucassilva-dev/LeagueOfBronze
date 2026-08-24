import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { readDataset, saveDataset } from "@/lib/data-store";
import { isDuplaCard } from "@/lib/cards";
import {
  novaSemente,
  sortearCarta,
  sortearLado,
  sortearLetras,
  type RegistroDeSorteio,
} from "@/lib/series/sorteio";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";

export const dynamic = "force-dynamic";

/**
 * O SORTEIO acontece aqui, no servidor.
 *
 * As rotas irmãs (`/sides` e `/cards`) continuam existindo e recebem o resultado
 * pronto — elas servem para a organização CORRIGIR um registro à mão. Esta é
 * diferente: o cliente pede um sorteio e o servidor produz o resultado.
 *
 * A distinção importa. Se a roleta girasse no navegador e depois mandasse o resultado,
 * bastaria girar até gostar e só então salvar — o mesmo tipo de furo que o formulário
 * de inscrição tinha ao mandar os pontos calculados no cliente. Aqui o resultado já
 * vem decidido, com a semente gravada, e a animação apenas revela.
 */

const corpoSchema = z.object({
  seriesId: z.string().trim().min(1).max(120),
  tipo: z.enum(["lados", "carta"]),
  /** Dono da carta no sorteio individual. Ignorado nos lados e no sorteio duplo. */
  teamId: z.string().trim().min(1).max(120).optional(),
  /** true = os dois capitães usaram; uma carta só, valendo para ambos, com as 8 no pool. */
  dupla: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  // Sortear carta e sortear lado são atos diferentes com escopos diferentes, e a
  // separação já existia nas rotas antigas — mantida aqui.
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = corpoSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do sorteio inválidos." }, { status: 400 });
  }
  const { seriesId, tipo, teamId, dupla = false } = parsed.data;

  const escopoNecessario = tipo === "lados" ? "series:sides" : "series:cards";
  const comEscopo = await requireAdmin(request, escopoNecessario);
  if (!comEscopo.ok) return comEscopo.response;

  try {
    const dataset = await readDataset();
    const serie = dataset.seriesMatches.find((s) => s.id === seriesId);
    if (!serie) return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });

    if (tipo === "carta" && !dupla) {
      if (!teamId) {
        return NextResponse.json({ error: "Time obrigatório no sorteio individual." }, { status: 400 });
      }
      if (teamId !== serie.teamAId && teamId !== serie.teamBId) {
        return NextResponse.json({ error: "Time não pertence a esta série." }, { status: 400 });
      }
    }

    const semente = novaSemente();
    const agora = new Date().toISOString();
    const autor = comEscopo.identity.username;

    let registro: RegistroDeSorteio;

    if (tipo === "lados") {
      const azul = sortearLado(semente, serie.teamAId, serie.teamBId);
      serie.blueSideTeamId = azul;
      registro = { tipo, semente, emISO: agora, autor, resultado: azul };
    } else {
      const carta = sortearCarta(semente, dupla);

      // O ABCDRAFT sorteia duas letras junto. Elas vão no detalhe do registro porque
      // sem elas a carta não está completa — e porque o par precisa ser conferível
      // depois tanto quanto a carta em si.
      const detalhe =
        carta === "ABCDRAFT" ? { ...sortearLetras(semente) } : undefined;

      if (dupla) {
        serie.cardsUsed = [
          { teamId: serie.teamAId, cardId: carta, dupla: true },
          { teamId: serie.teamBId, cardId: carta, dupla: true },
        ];
      } else {
        // Um sorteio individual descarta um duplo anterior — os dois não convivem.
        const outros = (serie.cardsUsed ?? []).filter((c) => c.teamId !== teamId && !c.dupla);
        serie.cardsUsed = [...outros, { teamId: teamId as string, cardId: carta }];
      }

      registro = {
        tipo,
        semente,
        emISO: agora,
        autor,
        teamId: dupla ? undefined : teamId,
        resultado: carta,
        detalhe: { dupla, ...(detalhe ?? {}) },
      };

      if (!dupla && isDuplaCard(carta)) {
        // Inalcançável: `sortearCarta` já barra. Mantido porque gravar uma carta dupla
        // num sorteio individual quebraria o regulamento em silêncio.
        return NextResponse.json({ error: "Sorteio produziu carta inválida." }, { status: 500 });
      }
    }

    // Append-only: refazer é permitido, mas fica registrado que houve dois.
    serie.sorteios = [...(serie.sorteios ?? []), registro].slice(-50);

    await saveDataset(dataset);

    return NextResponse.json({
      ok: true,
      sorteio: registro,
      blueSideTeamId: serie.blueSideTeamId ?? null,
      cardsUsed: serie.cardsUsed ?? [],
      /** Quantas vezes já se sorteou isto nesta série — a tela mostra quando é repetição. */
      vezes: (serie.sorteios ?? []).filter((s) => s.tipo === tipo && s.teamId === registro.teamId).length,
    });
  } catch (error) {
    return respostaDeErro("admin/series/sorteio", error, "Não foi possível sortear.");
  }
}
