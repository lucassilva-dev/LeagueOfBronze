import type { ArchivedSeason } from "@/lib/schema";

export type AlvoNoArquivo =
  | { tipo: "time"; slug: string }
  | { tipo: "jogador"; slug: string }
  | { tipo: "serie"; id: string };

function maisRecentePrimeiro(a: ArchivedSeason, b: ArchivedSeason) {
  return (b.endedAtISO ?? b.archivedAtISO).localeCompare(a.endedAtISO ?? a.archivedAtISO);
}

/**
 * Os times e jogadores AO VIVO são só os da última edição arquivada, mantidos?
 *
 * É o que "Iniciar nova temporada" produz com "manter os times/jogadores" marcados (o
 * padrão do painel): a temporada nova nasce com os MESMOS objetos de time e jogador da
 * que acabou de ser arquivada. Já a virada do draft grava times e jogadores novos — e,
 * mesmo que um nome de time ou um nick se repita (os ids saem do nome), a distribuição de
 * jogadores por time que um draft produz não reproduz a da edição anterior.
 *
 * Critério: todo time ao vivo existe (mesmo id) no snapshot mais recente, e todo
 * jogador ao vivo existe lá com o mesmo id E no mesmo time. Sem arquivo, ou sem times ao
 * vivo, não há o que comparar: `false`.
 */
export function elencosSaoDaUltimaArquivada(
  dataset: Readonly<{
    teams: readonly { id: string }[];
    players: readonly { id: string; teamId: string }[];
    archivedSeasons: readonly ArchivedSeason[];
  }>,
): boolean {
  if (dataset.teams.length === 0) return false;
  const ultima = [...dataset.archivedSeasons].sort(maisRecentePrimeiro)[0];
  if (!ultima) return false;

  const timesArquivados = new Set(ultima.snapshot.teams.map((t) => t.id));
  const timeDoJogadorArquivado = new Map(ultima.snapshot.players.map((p) => [p.id, p.teamId]));

  return (
    dataset.teams.every((t) => timesArquivados.has(t.id)) &&
    dataset.players.every((p) => timeDoJogadorArquivado.get(p.id) === p.teamId)
  );
}

/**
 * Onde um time, jogador ou série que saiu do ar está guardado no arquivo.
 *
 * Quando uma edição é arquivada, /times/<slug>, /jogadores/<slug> e /partidas/<id> deixam de
 * existir no dataset ao vivo — mas esses links continuam circulando no grupo. Em vez de 404,
 * a página manda para a cópia arquivada em /temporadas/<seasonId>/...
 *
 * Procura da temporada mais recente para a mais antiga: um slug pode se repetir entre
 * edições, e quem clica num link antigo quase sempre quer a edição que acabou de terminar.
 */
export function caminhoNoArquivo(
  arquivadas: readonly ArchivedSeason[],
  alvo: AlvoNoArquivo,
): string | null {
  for (const temporada of [...arquivadas].sort(maisRecentePrimeiro)) {
    const { snapshot } = temporada;
    const base = `/temporadas/${encodeURIComponent(temporada.seasonId)}`;

    if (alvo.tipo === "time" && snapshot.teams.some((time) => time.slug === alvo.slug)) {
      return `${base}/times/${encodeURIComponent(alvo.slug)}`;
    }
    if (alvo.tipo === "jogador" && snapshot.players.some((jogador) => jogador.slug === alvo.slug)) {
      return `${base}/jogadores/${encodeURIComponent(alvo.slug)}`;
    }
    if (alvo.tipo === "serie" && snapshot.seriesMatches.some((serie) => serie.id === alvo.id)) {
      return `${base}/partidas/${encodeURIComponent(alvo.id)}`;
    }
  }
  return null;
}
