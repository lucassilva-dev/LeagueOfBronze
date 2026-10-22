import { MAX_SORTEIOS_POR_SERIE, type SeriesMatch, type TournamentDataset } from "@/lib/schema";

/**
 * O que o SERVIDOR decide num PUT do dataset, por cima do rascunho que o painel enviou.
 *
 * O painel manda o campeonato inteiro de volta, mas alguns campos não são do rascunho:
 *
 *  - `sorteios` e `archivedSeasons` são propriedade do servidor e nunca vêm do corpo
 *    (o histórico append-only e os retratos das temporadas — ver o PUT);
 *  - o LADO e a CARTA de um sorteio que o rascunho NÃO viu.
 *
 * O terceiro item é o dia de jogo. O painel está aberto com o K/D/A da 4a-jogo-04 digitado,
 * e o PC da transmissão sorteia a carta da 4a-jogo-05 (pela página da partida ou por outro
 * painel). O rascunho continua com a série 5 sem carta. Antes, a pessoa ficava sem saída:
 * "Salvar por cima" do master gravava a série 5 SEM a carta anunciada na live (enquanto o
 * histórico dizia que ela saiu), e quem só lança resultado levava 403 por `series:cards` —
 * um campo que ela nunca tocou —, sobrando só "trazer a versão nova", que joga fora as 10
 * linhas digitadas.
 *
 * Como saber o que o rascunho viu: o HISTÓRICO. Todo sorteio (e toda correção manual)
 * acrescenta um registro em `sorteios`, e o painel copia o histórico para o rascunho quando
 * sorteia na própria sessão. Se o servidor tem MAIS registros do que o corpo enviado, os
 * excedentes aconteceram depois que o rascunho foi aberto — e o campo que eles mexeram
 * (lado ou carta) vale o do servidor.
 *
 * Isto só COPIA valores que já estão gravados, então não dá poder a ninguém: um corpo
 * forjado com histórico curto só consegue fazer o servidor manter o que ele já tem.
 */

type RegistroDeSorteio = NonNullable<SeriesMatch["sorteios"]>[number];

const MEXE_NO_LADO = new Set<RegistroDeSorteio["tipo"]>(["lados", "lados_manual"]);
const MEXE_NA_CARTA = new Set<RegistroDeSorteio["tipo"]>(["carta", "carta_manual"]);

/**
 * Só traz o sorteio do servidor se a série ainda é o MESMO confronto.
 *
 * Trocar um time no painel limpa lado e carta de propósito (o sorteio era de outro
 * confronto); devolver o lado sorteado entre os times antigos gravaria um lado azul de um
 * time que nem está na série.
 */
function mesmoConfronto(enviada: SeriesMatch, gravada: SeriesMatch): boolean {
  return enviada.teamAId === gravada.teamAId && enviada.teamBId === gravada.teamBId;
}

/**
 * Devolve uma CÓPIA do dataset enviado com os campos do servidor reancorados a partir de
 * `gravado`. Não muda o argumento: o PUT reaplica isto a cada nova leitura quando o
 * "Salvar por cima" precisa tentar de novo, e a contagem de sorteios vistos tem de vir
 * sempre do corpo ORIGINAL.
 */
export function ancorarCamposDoServidor(
  enviado: TournamentDataset,
  gravado: TournamentDataset,
): TournamentDataset {
  const proposta = structuredClone(enviado);
  const gravadas = new Map(gravado.seriesMatches.map((serie) => [serie.id, serie]));

  for (const serie of proposta.seriesMatches) {
    const gravada = gravadas.get(serie.id);
    const historico = gravada?.sorteios ?? [];

    // Medido ANTES de reancorar `sorteios`, senão a conta compara o servidor com ele mesmo.
    const naoVistos = historico.slice(serie.sorteios?.length ?? 0);

    if (gravada && naoVistos.length > 0 && mesmoConfronto(serie, gravada)) {
      if (naoVistos.some((registro) => MEXE_NO_LADO.has(registro.tipo))) {
        if (gravada.blueSideTeamId) serie.blueSideTeamId = gravada.blueSideTeamId;
        else delete serie.blueSideTeamId;
      }
      if (naoVistos.some((registro) => MEXE_NA_CARTA.has(registro.tipo))) {
        if (gravada.cardsUsed !== undefined) serie.cardsUsed = structuredClone(gravada.cardsUsed);
        else delete serie.cardsUsed;
      }
    }

    // O histórico em si: o que chega do cliente é descartado, o gravado é preservado.
    if (historico.length > 0) serie.sorteios = structuredClone(historico);
    else delete serie.sorteios;
  }

  proposta.archivedSeasons = gravado.archivedSeasons;
  return proposta;
}

/** Resultado gravado no registro quando a correção manual APAGOU o lado ou a carta. */
export const RESULTADO_REMOVIDO = "removido";

type CartaDaSerie = NonNullable<SeriesMatch["cardsUsed"]>[number];

/** Uma carta por time e por jogo (as sem `gameIndex` são as da série). */
function cartasPorChave(cartas: SeriesMatch["cardsUsed"]): Map<string, CartaDaSerie> {
  const mapa = new Map<string, CartaDaSerie>();
  for (const carta of cartas ?? []) mapa.set(`${carta.teamId}|${carta.gameIndex ?? ""}`, carta);
  return mapa;
}

/**
 * Acrescenta ao histórico da série um registro `lados_manual`/`carta_manual` para cada lado
 * ou carta que o envio mudou À MÃO em relação ao gravado.
 *
 * O painel deixa trocar a cartinha num select e salvar pelo dataset, e isso não deixava
 * rastro: a página da partida continuava mostrando, embaixo da carta nova, as letras, a
 * semente e o autor do sorteio ANTERIOR — como se a semente tivesse produzido a carta
 * exibida. As rotas de correção (`/series/cards` e `/series/sides`) já registravam; faltava
 * este caminho, que é justamente o que o painel usa.
 *
 * Roda DEPOIS da autorização: o registro é do servidor, e quem tem só `series:cards` não
 * pode ser cobrado de `series:manage` por um histórico que ele não escreveu.
 *
 * No teto do histórico, RECUSA (devolve a série) em vez de descartar registro antigo.
 */
export function registrarCorrecoesManuais(
  proposta: TournamentDataset,
  gravado: TournamentDataset,
  autor: string,
  emISO: string,
): { ok: true } | { ok: false; serieId: string } {
  const gravadas = new Map(gravado.seriesMatches.map((serie) => [serie.id, serie]));
  const quem = autor.trim().slice(0, 120) || "painel";

  for (const serie of proposta.seriesMatches) {
    const gravada = gravadas.get(serie.id);
    if (!gravada) continue;

    const novos: RegistroDeSorteio[] = [];

    const ladoAntes = gravada.blueSideTeamId || undefined;
    const ladoDepois = serie.blueSideTeamId || undefined;
    if (ladoAntes !== ladoDepois) {
      novos.push({
        tipo: "lados_manual",
        semente: "",
        emISO,
        autor: quem,
        resultado: ladoDepois ?? RESULTADO_REMOVIDO,
        ...(ladoAntes ? { detalhe: { sobrescreveu: ladoAntes } } : {}),
      });
    }

    const antes = cartasPorChave(gravada.cardsUsed);
    const depois = cartasPorChave(serie.cardsUsed);
    for (const chave of new Set([...antes.keys(), ...depois.keys()])) {
      const anterior = antes.get(chave);
      const atual = depois.get(chave);
      if (anterior?.cardId === atual?.cardId && Boolean(anterior?.dupla) === Boolean(atual?.dupla)) continue;
      novos.push({
        tipo: "carta_manual",
        semente: "",
        emISO,
        autor: quem,
        teamId: (atual ?? anterior)!.teamId,
        resultado: atual?.cardId ?? RESULTADO_REMOVIDO,
        detalhe: { dupla: Boolean(atual?.dupla), ...(anterior ? { sobrescreveu: anterior.cardId } : {}) },
      });
    }

    if (novos.length === 0) continue;
    const historico = serie.sorteios ?? [];
    if (historico.length + novos.length > MAX_SORTEIOS_POR_SERIE) return { ok: false, serieId: serie.id };
    serie.sorteios = [...historico, ...novos];
  }

  return { ok: true };
}
