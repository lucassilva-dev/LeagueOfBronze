import { resolveChampion } from "@/lib/champions";
import { resolveRole } from "@/lib/design";
import type { Player, PlayerGameStats, SeriesGame, SeriesMatch, SeriesStage, TournamentDataset } from "@/lib/schema";
import {
  calculatePlayerAggregates,
  calculateStandings,
  createIndexes,
  estaNoElenco,
  getKda,
  getSeriesFormatLabel,
  getSeriesMvp,
  getSeriesScore,
  getSeriesWinnerTeamId,
  isSeriesComplete,
  jogosDeWalkoverDaSerie,
  linhaDeSubstituto,
  linhaPontua,
  mvpDoJogo,
  timeDaLinha,
} from "@/lib/tournament";
import type { PlayerAggregate } from "@/types/domain";

/**
 * A CAMPANHA do jogador na edição no ar, para a ficha (/jogadores/[slug]): série a série com
 * cada jogo, os destaques (ranking, melhor jogo, participação nos abates, forma), os campeões
 * e o próximo desafio do time. Pedido do Lucas em 18/11/2026: "os dados de como estão indo no
 * campeonato, resultados, resumos e o que achar mais interessante".
 *
 * Pura, sem relógio: tudo sai do dataset. As regras de quem conta o quê são as do resto do
 * site (lib/tournament.ts) e NÃO são reescritas aqui:
 *  - do jogador só conta a linha que pontua (`linhaPontua`): o substituto que não pontua e o
 *    convidado ficam fora da ficha, como em /stats;
 *  - a linha vale pelo time em que foi jogada (`timeDaLinha`): o substituto avulso aparece com
 *    o time que cobriu, e a série dele é a desse time;
 *  - MVP do jogo = `mvpDoJogo` (escolha da organização > maior KDA); MVP da série =
 *    `getSeriesMvp`; placar com W.O. = `getSeriesScore`;
 *  - os abates do TIME (a base da participação) incluem o substituto que não pontua e o
 *    convidado, como o placar de abates da partida (`getGameTeamKills`).
 */

export type ResultadoDoJogo = "vitoria" | "derrota";
export type ResultadoDaSerie = ResultadoDoJogo | "andamento";

export type TimeDaCampanha = Readonly<{ id: string; nome: string; slug: string; imagem?: string }>;

export type CampeaoDoJogo = Readonly<{
  /** Id do Data Dragon (o ícone), ou null quando o texto gravado não é um campeão conhecido. */
  id: string | null;
  nome: string;
}>;

export type JogoDaCampanha =
  | Readonly<{
      tipo: "jogou";
      /** J1, J2… — a posição do jogo na série. */
      numero: number;
      campeao: CampeaoDoJogo | null;
      abates: number;
      mortes: number;
      assistencias: number;
      kda: number;
      resultado: ResultadoDoJogo;
      mvp: boolean;
      duracaoMin: number | null;
      /** % dos abates do time com abate ou assistência dele (0–100, inteiro); null sem abates do time. */
      participacao: number | null;
    }>
  /** O time jogou sem ele (outro entrou no lugar). */
  | Readonly<{ tipo: "ausente"; numero: number; resultado: ResultadoDoJogo | null }>
  /** Jogo que não aconteceu: o W.O. completou a série (lib/tournament.ts, `placarComWalkover`). */
  | Readonly<{ tipo: "wo"; numero: number; resultado: ResultadoDoJogo }>;

export type SerieDaCampanha = Readonly<{
  id: string;
  data: string;
  fase: SeriesStage;
  /** "MD3" | "MD5". */
  formato: string;
  /** O time pelo qual ele jogou a série (o da linha: o substituto avulso joga pelo time que cobriu). */
  time: TimeDaCampanha;
  adversario: TimeDaCampanha;
  placar: Readonly<{ time: number; adversario: number }>;
  resultado: ResultadoDaSerie;
  walkover: boolean;
  mvpDaSerie: boolean;
  /** Jogou a série como substituto avulso, por um time que não é o dele. */
  substituto: boolean;
  /** Todos os jogos da série em ordem (J1…), inclusive os que ele não jogou e os de W.O. */
  jogos: readonly JogoDaCampanha[];
}>;

/** Um jogo que ele jogou, fora da série: para os destaques (melhor jogo, recorde de abates). */
export type JogoEmDestaque = Readonly<{
  serieId: string;
  data: string;
  numero: number;
  adversario: TimeDaCampanha;
  campeao: CampeaoDoJogo | null;
  abates: number;
  mortes: number;
  assistencias: number;
  kda: number;
  resultado: ResultadoDoJogo;
}>;

export type CampeaoDaCampanha = Readonly<{
  id: string | null;
  nome: string;
  jogos: number;
  vitorias: number;
  derrotas: number;
  abates: number;
  mortes: number;
  assistencias: number;
  kda: number;
}>;

export type MetricaDoRanking = "abates" | "kda" | "mvps" | "assistencias";

export type PosicaoNoRanking = Readonly<{
  metrica: MetricaDoRanking;
  /** Posição em "competição" (1, 2, 2, 4): empatados dividem o lugar. */
  posicao: number;
  valor: number;
}>;

export type ProximaSerie = Readonly<{
  id: string;
  data: string;
  fase: SeriesStage;
  formato: string;
  adversario: TimeDaCampanha;
  /** A série já tem jogo lançado, mas ainda não acabou. */
  emAndamento: boolean;
  placar: Readonly<{ time: number; adversario: number }>;
}>;

export type CampanhaDoJogador = Readonly<{
  /** Jogos que ele jogou e que pontuam. */
  jogos: number;
  vitorias: number;
  derrotas: number;
  /** Da mais recente para a mais antiga. */
  series: readonly SerieDaCampanha[];
  /** Os últimos (até 5) jogos dele, do mais antigo para o mais recente. */
  forma: readonly ResultadoDoJogo[];
  /** A sequência atual: o resultado do último jogo e quantos seguidos iguais. */
  sequencia: Readonly<{ resultado: ResultadoDoJogo; jogos: number }> | null;
  /** % (inteiro) dos abates do time nos jogos dele com abate ou assistência dele. */
  participacao: number | null;
  melhorJogo: JogoEmDestaque | null;
  /** O jogo com mais abates — null quando é o próprio melhor jogo. */
  recordeDeAbates: JogoEmDestaque | null;
  campeoes: readonly CampeaoDaCampanha[];
  /** As quatro métricas, nesta ordem: abates, KDA, MVPs, assistências. */
  ranking: readonly PosicaoNoRanking[];
  /** Quantos jogadores entram no ranking (os que jogaram). */
  totalNoRanking: number;
  /** A posição em KDA entre os da MESMA rota (a primária do jogador). */
  rankingNaRota: Readonly<{ rota: string; posicao: number; total: number }> | null;
  /** O próximo compromisso do time dele (só para quem está no elenco). */
  proximaSerie: ProximaSerie | null;
  /** O time dele na tabela, depois de ao menos uma série (só para quem está no elenco). */
  tabela: Readonly<{ posicao: number; total: number; vitorias: number; derrotas: number; pontos: number }> | null;
}>;

// ------------------------------------------------------------------ ajudantes

function tempoDa(data: string): number {
  const t = Date.parse(data);
  return Number.isNaN(t) ? 0 : t;
}

/** Ordem cronológica das séries: data, depois o id (4a-jogo-01 antes do 02 no mesmo horário). */
function compararSeries(a: Pick<SeriesMatch, "date" | "id">, b: Pick<SeriesMatch, "date" | "id">): number {
  return tempoDa(a.date) - tempoDa(b.date) || a.id.localeCompare(b.id, "pt-BR", { numeric: true });
}

function campeaoDa(texto: string | undefined): CampeaoDoJogo | null {
  const bruto = texto?.trim();
  if (!bruto) return null;
  const conhecido = resolveChampion(bruto);
  return conhecido ? { id: conhecido.id, nome: conhecido.name } : { id: null, nome: bruto };
}

/** Os abates do TIME no jogo: toda linha que jogou por ele, inclusive quem não pontua. */
function abatesDoTime(game: SeriesGame, timeId: string, playersById: ReadonlyMap<string, Player>): number {
  let total = 0;
  for (const linha of game.statsByPlayer) {
    const jogador = playersById.get(linha.playerId);
    if (!jogador && linha.convidado === undefined) continue;
    if (timeDaLinha(linha, jogador) === timeId) total += linha.kills;
  }
  return total;
}

/** Posição de competição: 1 + quantos são estritamente melhores. */
function posicaoDeCompeticao(valores: readonly number[], valor: number, maiorEhMelhor = true): number {
  return 1 + valores.filter((v) => (maiorEhMelhor ? v > valor : v < valor)).length;
}

/**
 * O melhor de uma lista de jogos por um critério; o empate final fica com o MAIS RECENTE (a
 * lista chega em ordem cronológica).
 */
function melhorPor(jogos: readonly JogoEmDestaque[], comparar: (a: JogoEmDestaque, b: JogoEmDestaque) => number) {
  let melhor: JogoEmDestaque | null = null;
  for (const jogo of jogos) {
    if (!melhor || comparar(jogo, melhor) >= 0) melhor = jogo;
  }
  return melhor;
}

function timeResumo(dataset: TournamentDataset, id: string): TimeDaCampanha {
  const time = dataset.teams.find((t) => t.id === id);
  return { id, nome: time?.name ?? id, slug: time?.slug ?? id, ...(time?.imageUrl ? { imagem: time.imageUrl } : {}) };
}

// ------------------------------------------------------------------ a campanha

export function campanhaDoJogador(dataset: TournamentDataset, playerId: string): CampanhaDoJogador {
  const indexes = createIndexes(dataset);
  const jogador = indexes.playersById.get(playerId);

  const series: SerieDaCampanha[] = [];
  /** Os jogos dele, em ordem cronológica, para forma, destaques e participação. */
  const jogosEmOrdem: (JogoEmDestaque & { participacaoBruta: { feitos: number; doTime: number } })[] = [];

  for (const serie of [...dataset.seriesMatches].sort(compararSeries)) {
    if (!jogador) break;
    // O time pelo qual ele jogou a série: o da primeira linha DELE que pontua e é de um dos dois lados.
    let timeId: string | undefined;
    let substituto = false;
    for (const game of serie.games) {
      const linha = game.statsByPlayer.find((l) => l.playerId === playerId);
      if (!linha || !linhaPontua(linha)) continue;
      const time = timeDaLinha(linha, jogador);
      if (time !== serie.teamAId && time !== serie.teamBId) continue;
      timeId = time;
      substituto = linhaDeSubstituto(linha, jogador);
      break;
    }
    if (timeId === undefined) continue;

    const adversarioId = timeId === serie.teamAId ? serie.teamBId : serie.teamAId;
    const adversario = timeResumo(dataset, adversarioId);
    const resultadoDoJogo = (vencedor: string): ResultadoDoJogo | null =>
      vencedor === timeId ? "vitoria" : vencedor === adversarioId ? "derrota" : null;

    const jogos: JogoDaCampanha[] = serie.games.map((game, i) => {
      const numero = i + 1;
      const linha: PlayerGameStats | undefined = game.statsByPlayer.find((l) => l.playerId === playerId);
      const resultado = resultadoDoJogo(game.winnerTeamId);
      if (!linha || !linhaPontua(linha) || timeDaLinha(linha, jogador) !== timeId || resultado === null) {
        return { tipo: "ausente", numero, resultado };
      }
      const doTime = abatesDoTime(game, timeId!, indexes.playersById);
      const feitos = linha.kills + linha.assists;
      const kda = getKda(linha.kills, linha.deaths, linha.assists);
      const campeao = campeaoDa(linha.champion);
      jogosEmOrdem.push({
        serieId: serie.id,
        data: serie.date,
        numero,
        adversario,
        campeao,
        abates: linha.kills,
        mortes: linha.deaths,
        assistencias: linha.assists,
        kda,
        resultado,
        participacaoBruta: { feitos, doTime },
      });
      return {
        tipo: "jogou",
        numero,
        campeao,
        abates: linha.kills,
        mortes: linha.deaths,
        assistencias: linha.assists,
        kda,
        resultado,
        mvp: mvpDoJogo(game, serie, indexes.playersById) === playerId,
        duracaoMin: typeof game.durationMin === "number" && game.durationMin > 0 ? game.durationMin : null,
        participacao: doTime > 0 ? Math.min(100, Math.round((feitos / doTime) * 100)) : null,
      };
    });
    for (const wo of jogosDeWalkoverDaSerie(serie, dataset)) {
      jogos.push({ tipo: "wo", numero: wo.gameIndex, resultado: wo.winnerTeamId === timeId ? "vitoria" : "derrota" });
    }

    const placar = getSeriesScore(serie, dataset);
    const nosA = timeId === serie.teamAId;
    const vencedor = getSeriesWinnerTeamId(serie, dataset);
    series.push({
      id: serie.id,
      data: serie.date,
      fase: serie.stage ?? "REGULAR_SEASON",
      formato: getSeriesFormatLabel(serie, dataset),
      time: timeResumo(dataset, timeId),
      adversario,
      placar: nosA
        ? { time: placar.teamAWins, adversario: placar.teamBWins }
        : { time: placar.teamBWins, adversario: placar.teamAWins },
      resultado: vencedor === null ? "andamento" : vencedor === timeId ? "vitoria" : "derrota",
      walkover: Boolean(serie.walkoverWinnerTeamId),
      mvpDaSerie: getSeriesMvp(serie, dataset)?.playerId === playerId,
      substituto,
      jogos,
    });
  }

  // ---------------- números do jogador (a mesma conta de /stats)
  const agregados = calculatePlayerAggregates(dataset);
  const comJogos = agregados.filter((a) => a.gamesPlayed > 0);
  const meu = comJogos.find((a) => a.playerId === playerId);

  const valorDa = (a: PlayerAggregate, metrica: MetricaDoRanking) =>
    metrica === "abates" ? a.kills : metrica === "kda" ? a.kda : metrica === "mvps" ? a.gameMvps : a.assists;
  const ranking: PosicaoNoRanking[] = meu
    ? (["abates", "kda", "mvps", "assistencias"] as const).map((metrica) => ({
        metrica,
        valor: valorDa(meu, metrica),
        posicao: posicaoDeCompeticao(
          comJogos.map((a) => valorDa(a, metrica)),
          valorDa(meu, metrica),
        ),
      }))
    : [];

  let rankingNaRota: CampanhaDoJogador["rankingNaRota"] = null;
  if (meu && jogador) {
    const rota = resolveRole(jogador.role1).short;
    const daRota = comJogos.filter((a) => resolveRole(indexes.playersById.get(a.playerId)?.role1).short === rota);
    rankingNaRota = { rota, total: daRota.length, posicao: posicaoDeCompeticao(daRota.map((a) => a.kda), meu.kda) };
  }

  // ---------------- destaques
  const forma = jogosEmOrdem.slice(-5).map((j) => j.resultado);
  let sequencia: CampanhaDoJogador["sequencia"] = null;
  const ultimo = jogosEmOrdem.at(-1);
  if (ultimo) {
    let n = 0;
    for (let i = jogosEmOrdem.length - 1; i >= 0 && jogosEmOrdem[i]!.resultado === ultimo.resultado; i--) n++;
    sequencia = { resultado: ultimo.resultado, jogos: n };
  }

  let feitos = 0;
  let doTime = 0;
  for (const j of jogosEmOrdem) {
    if (j.participacaoBruta.doTime <= 0) continue;
    feitos += j.participacaoBruta.feitos;
    doTime += j.participacaoBruta.doTime;
  }
  const participacao = doTime > 0 ? Math.min(100, Math.round((feitos / doTime) * 100)) : null;

  const destaques: JogoEmDestaque[] = jogosEmOrdem.map((j) => ({
    serieId: j.serieId,
    data: j.data,
    numero: j.numero,
    adversario: j.adversario,
    campeao: j.campeao,
    abates: j.abates,
    mortes: j.mortes,
    assistencias: j.assistencias,
    kda: j.kda,
    resultado: j.resultado,
  }));
  const melhorJogo = melhorPor(destaques, (a, b) => a.kda - b.kda || a.abates - b.abates || b.mortes - a.mortes);
  const maisAbates = melhorPor(destaques, (a, b) => a.abates - b.abates || a.kda - b.kda);
  const recordeDeAbates =
    maisAbates && melhorJogo && (maisAbates.serieId !== melhorJogo.serieId || maisAbates.numero !== melhorJogo.numero)
      ? maisAbates
      : null;

  // ---------------- campeões
  const porCampeao = new Map<string, { id: string | null; nome: string; jogos: JogoEmDestaque[] }>();
  for (const jogo of destaques) {
    if (!jogo.campeao) continue;
    const chave = jogo.campeao.id ?? `?${jogo.campeao.nome.toLowerCase()}`;
    const balde = porCampeao.get(chave) ?? { id: jogo.campeao.id, nome: jogo.campeao.nome, jogos: [] };
    balde.jogos.push(jogo);
    porCampeao.set(chave, balde);
  }
  const campeoes: CampeaoDaCampanha[] = [...porCampeao.values()]
    .map(({ id, nome, jogos }) => {
      const abates = jogos.reduce((s, j) => s + j.abates, 0);
      const mortes = jogos.reduce((s, j) => s + j.mortes, 0);
      const assistencias = jogos.reduce((s, j) => s + j.assistencias, 0);
      const vitorias = jogos.filter((j) => j.resultado === "vitoria").length;
      return {
        id,
        nome,
        jogos: jogos.length,
        vitorias,
        derrotas: jogos.length - vitorias,
        abates,
        mortes,
        assistencias,
        kda: getKda(abates, mortes, assistencias),
      };
    })
    .sort((a, b) => b.jogos - a.jogos || b.vitorias - a.vitorias || b.kda - a.kda || a.nome.localeCompare(b.nome, "pt-BR"));

  // ---------------- o time dele: próximo desafio e tabela (só quem está no elenco de hoje:
  // quem saiu de vez e o reserva não têm "próximo jogo" do time)
  let proximaSerie: ProximaSerie | null = null;
  let tabela: CampanhaDoJogador["tabela"] = null;
  if (jogador?.teamId !== undefined && estaNoElenco(jogador)) {
    const meuTime = jogador.teamId;
    const proxima = [...dataset.seriesMatches]
      .filter((s) => (s.teamAId === meuTime || s.teamBId === meuTime) && !isSeriesComplete(s, dataset))
      .sort(compararSeries)[0];
    if (proxima) {
      const nosA = proxima.teamAId === meuTime;
      const placar = getSeriesScore(proxima, dataset);
      proximaSerie = {
        id: proxima.id,
        data: proxima.date,
        fase: proxima.stage ?? "REGULAR_SEASON",
        formato: getSeriesFormatLabel(proxima, dataset),
        adversario: timeResumo(dataset, nosA ? proxima.teamBId : proxima.teamAId),
        emAndamento: proxima.games.length > 0,
        placar: nosA
          ? { time: placar.teamAWins, adversario: placar.teamBWins }
          : { time: placar.teamBWins, adversario: placar.teamAWins },
      };
    }
    const { rows } = calculateStandings(dataset);
    const linha = rows.find((r) => r.teamId === meuTime);
    if (linha && linha.seriesPlayed > 0) {
      tabela = {
        posicao: linha.position,
        total: rows.length,
        vitorias: linha.seriesWon,
        derrotas: linha.seriesLost,
        pontos: linha.points,
      };
    }
  }

  return {
    jogos: jogosEmOrdem.length,
    vitorias: jogosEmOrdem.filter((j) => j.resultado === "vitoria").length,
    derrotas: jogosEmOrdem.filter((j) => j.resultado === "derrota").length,
    series: series.reverse(),
    forma,
    sequencia,
    participacao,
    melhorJogo,
    recordeDeAbates,
    campeoes,
    ranking,
    totalNoRanking: comJogos.length,
    rankingNaRota,
    proximaSerie,
    tabela,
  };
}
