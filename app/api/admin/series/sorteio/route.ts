import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";

import { readDataset, saveDataset } from "@/lib/data-store";
import { isDuplaCard } from "@/lib/cards";
import { novaSemente, sortearCarta, sortearLado, sortearLetras } from "@/lib/series/sorteio";
import { requireAdmin } from "@/lib/security/route-guard";
import { respostaDeErro } from "@/lib/security/resposta-erro";
import { lerCorpoPublico } from "@/lib/security/rota-publica";
import type { SeriesMatch } from "@/lib/schema";

export const dynamic = "force-dynamic";

/**
 * O SORTEIO acontece aqui, no servidor.
 *
 * O cliente pede; o servidor produz o resultado a partir de uma semente e grava a
 * semente junto. Se a roleta girasse no navegador e depois mandasse o resultado,
 * bastaria girar até gostar e só então salvar — o mesmo furo que o formulário de
 * inscrição tinha ao mandar os pontos calculados no cliente.
 *
 * As rotas irmãs (`/sides` e `/cards`) continuam existindo para CORRIGIR à mão, mas
 * agora também deixam registro — ver o comentário sobre sobrescrita em cada uma.
 */

/** Teto do histórico. Bater nele é sinal de que algo está errado, não rotina. */
const MAX_SORTEIOS = 50;

const corpoSchema = z.object({
  seriesId: z.string().trim().min(1).max(120),
  tipo: z.enum(["lados", "carta"]),
  /** Dono da carta no sorteio individual. Ignorado nos lados e no sorteio duplo. */
  teamId: z.string().trim().min(1).max(120).optional(),
  /** true = os dois capitães usaram; uma carta só, valendo para ambos, com as 8 no pool. */
  dupla: z.boolean().optional(),
});

/** Recusas de regra, com o motivo que a organização precisa ler. */
function impedimento(serie: SeriesMatch, tipo: "lados" | "carta"): string | null {
  if (serie.walkoverWinnerTeamId) {
    return "Esta série foi decidida por W.O. — não há partida para sortear.";
  }
  if (tipo === "lados" && serie.games.length > 0) {
    return `Esta série já tem ${serie.games.length} jogo(s) registrado(s). Sortear os lados agora mudaria o que já aconteceu.`;
  }
  if ((serie.sorteios ?? []).length >= MAX_SORTEIOS) {
    return "Esta série já acumulou 50 registros de sorteio. Fale com a organização antes de continuar.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  const guarda = await requireAdmin(request);
  if (!guarda.ok) return guarda.response;

  const lido = await lerCorpoPublico(request);
  if (!lido.ok) return lido.response;

  const parsed = corpoSchema.safeParse(lido.corpo);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados do sorteio inválidos." }, { status: 400 });
  }
  const { seriesId, tipo, teamId, dupla = false } = parsed.data;

  // Sortear lado e sortear carta são atos distintos, com escopos distintos — a
  // separação já existia nas rotas antigas e continua valendo.
  const comEscopo = await requireAdmin(request, tipo === "lados" ? "series:sides" : "series:cards");
  if (!comEscopo.ok) return comEscopo.response;

  try {
    const dataset = await readDataset();
    const serie = dataset.seriesMatches.find((s) => s.id === seriesId);
    if (!serie) return NextResponse.json({ error: "Série não encontrada." }, { status: 404 });

    if (dataset.tournament.status === "finished") {
      return NextResponse.json(
        { error: "A temporada está encerrada. Não há mais o que sortear." },
        { status: 409 },
      );
    }

    const barrado = impedimento(serie, tipo);
    if (barrado) return NextResponse.json({ error: barrado }, { status: 409 });

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

    // Trabalha sobre uma CÓPIA: mutar a série antes de saber se a gravação deu certo
    // deixava o cache em memória (`lastGoodDataset`) com um estado que nunca chegou ao
    // banco, e as páginas passavam a servir um sorteio que não existe.
    const novaSerie: SeriesMatch = structuredClone(serie);
    let registro: NonNullable<SeriesMatch["sorteios"]>[number];

    if (tipo === "lados") {
      const azul = sortearLado(semente, serie.teamAId, serie.teamBId);
      novaSerie.blueSideTeamId = azul;
      registro = { tipo, semente, emISO: agora, autor, resultado: azul };
    } else {
      const carta = sortearCarta(semente, dupla);

      // O ABCDRAFT sorteia duas letras junto: sem elas a carta não está completa, e o
      // par precisa ser conferível depois tanto quanto a carta.
      const letras = carta === "ABCDRAFT" ? sortearLetras(semente) : null;

      // ⚠ PRESERVAR as cartas de OUTROS jogos. `cardUsageSchema` tem `gameIndex`, e a
      // versão anterior reconstruía a lista inteira — um sorteio para o jogo 2 apagava
      // em silêncio o registro do jogo 1. Só as entradas SEM gameIndex (as da série)
      // são substituídas.
      const deOutrosJogos = (novaSerie.cardsUsed ?? []).filter((c) => c.gameIndex !== undefined);
      const daSerie = (novaSerie.cardsUsed ?? []).filter((c) => c.gameIndex === undefined);

      if (dupla) {
        novaSerie.cardsUsed = [
          ...deOutrosJogos,
          { teamId: serie.teamAId, cardId: carta, dupla: true },
          { teamId: serie.teamBId, cardId: carta, dupla: true },
        ];
      } else {
        // Um sorteio individual descarta um duplo anterior — os dois não convivem.
        const outros = daSerie.filter((c) => c.teamId !== teamId && !c.dupla);
        novaSerie.cardsUsed = [...deOutrosJogos, ...outros, { teamId: teamId as string, cardId: carta }];
      }

      registro = {
        tipo,
        semente,
        emISO: agora,
        autor,
        teamId: dupla ? undefined : teamId,
        resultado: carta,
        detalhe: {
          dupla,
          ...(letras ? { letras: letras.letras, campeoes: letras.campeoes } : {}),
        },
      };

      if (!dupla && isDuplaCard(carta)) {
        return NextResponse.json({ error: "Sorteio produziu carta inválida." }, { status: 500 });
      }
    }

    // Append-only de verdade: nada é empurrado para fora. O teto é checado ANTES, e
    // bater nele recusa em vez de descartar o registro mais antigo — que é justamente
    // o que alguém tentando apagar rastro iria querer.
    novaSerie.sorteios = [...(novaSerie.sorteios ?? []), registro];

    /*
     * Trava de concorrência, a mesma que o PUT do dataset usa: `lastUpdatedISO` é
     * carimbado pelo servidor a cada gravação, então serve de versão.
     *
     * Sem ela, dois sorteios simultâneos (ou um sorteio no meio de uma edição no
     * painel) devolviam 200 e um deles sumia do dataset — o organizador via o
     * resultado na tela e ele não estava salvo.
     */
    const versaoLida = dataset.tournament.lastUpdatedISO;
    const conferencia = await readDataset();
    if (conferencia.tournament.lastUpdatedISO !== versaoLida) {
      return NextResponse.json(
        { error: "Alguém salvou o campeonato enquanto você sorteava. Recarregue e sorteie de novo." },
        { status: 409 },
      );
    }

    // Monta um dataset NOVO em vez de escrever dentro do que veio da leitura: se a
    // gravação falhar, nada do que já está em memória saiu do lugar. Antes, a série
    // era substituída no objeto lido e uma falha no banco deixava o processo servindo
    // um sorteio que nunca foi salvo.
    const paraSalvar = {
      ...dataset,
      seriesMatches: dataset.seriesMatches.map((s) => (s.id === seriesId ? novaSerie : s)),
    };
    await saveDataset(paraSalvar);

    return NextResponse.json({
      ok: true,
      sorteio: registro,
      blueSideTeamId: novaSerie.blueSideTeamId ?? null,
      cardsUsed: novaSerie.cardsUsed ?? [],
      /** Quantas vezes este mesmo sorteio já foi feito — a tela avisa na repetição. */
      vezes: novaSerie.sorteios.filter((s) => s.tipo === tipo && s.teamId === registro.teamId).length,
    });
  } catch (error) {
    return respostaDeErro("admin/series/sorteio", error, "Não foi possível sortear.");
  }
}
