/**
 * OS DADOS DA /stats («A Forja») — tudo que a página mostra, num retrato só, pronto para ir do
 * servidor para o navegador.
 *
 * Nenhum número nasce aqui: cada um sai das mesmas funções que o resto do site usa
 * (`buildDesignPlayersDoElenco`, `buildDesignTeams`, `buildLeaderboards`,
 * `buildChampionLeaderboards`, `buildRoleBests`, `getGameDurations`, `calculateStandings`). Este
 * módulo só JUNTA — por jogador, por time, por campeão — para que os atos, o holofote e o modo VS
 * leiam o mesmo dado e nunca discordem entre si (nem da tabela, nem da ficha).
 *
 * Só dados e funções puras: nada de React nem de next/font. A classe da fonte de cada time entra
 * depois, na página (components/times/fontes-dos-temas.ts).
 */

import { resolveChampion } from "@/lib/champions";
import { resolveElo, resolveRole, ELO_ORDER } from "@/lib/design";
import { getDisplayNick } from "@/lib/opgg";
import { buildDesignPlayers, buildDesignTeams } from "@/lib/roster";
import type { TournamentDataset } from "@/lib/schema";
import { identidadeDoTime, type IdentidadeDoTime } from "@/lib/series/identidade-do-time";
import { buildRoleBests } from "@/lib/stats-view";
import { temaDoTime } from "@/lib/temas/registro";
import {
  buildChampionLeaderboards,
  buildLeaderboards,
  calculateChampionAggregates,
  calculatePlayerAggregates,
  calculateStandings,
  calculateTeamAggregates,
  createIndexes,
  getGameDurations,
  getSeriesScore,
  getSeriesWinnerTeamId,
  isSeriesComplete,
  linhaPontua,
  timeDaLinha,
} from "@/lib/tournament";

// ------------------------------------------------------------------------------------ tipos

/** As cinco réguas do ranking de jogadores (as mesmas chaves da página antiga). */
export const METRICAS_DE_JOGADOR = ["abates", "kda", "mvps", "assist", "mortes"] as const;
export type MetricaDeJogador = (typeof METRICAS_DE_JOGADOR)[number];

/** As cinco abas dos campeões (as mesmas chaves da página antiga). */
export const METRICAS_DE_CAMPEAO = ["jogados", "banidos", "presenca", "winrate", "kda"] as const;
export type MetricaDeCampeao = (typeof METRICAS_DE_CAMPEAO)[number];

export type EloDaForja = Readonly<{ chave: string; rotulo: string; cor: string; pts: number }>;

export type RotaDaForja = Readonly<{
  /** A sigla do design system (TOP, SEL, MID, ADC, SUP). */
  sigla: string;
  rotulo: string;
  cor: string;
  /** O valor cru do dataset (`role1`), que é o que os ícones de rota entendem. */
  chave: string;
}>;

export type CampeaoDoJogador = Readonly<{
  /** Id canônico do Data Dragon; null quando o nome digitado não foi reconhecido. */
  id: string | null;
  nome: string;
  jogos: number;
  vitorias: number;
}>;

export type JogadorDaForja = Readonly<{
  id: string;
  slug: string;
  nick: string;
  nome: string;
  foto: string | null;
  /** `object-position` da foto (o enquadramento do tema do time). */
  fotoFoco: string;
  /** A foto é um avatar redondo com fundo transparente (mostrar inteiro, sem cortar). */
  fotoMedalhao: boolean;
  /** "" para o reserva, que não tem time. */
  timeId: string;
  elo: EloDaForja | null;
  rota: RotaDaForja;
  capitao: boolean;
  mono: boolean;
  noElenco: boolean;
  reserva: boolean;
  saiu: boolean;
  /** Valor de draft (pontos do elo). */
  pts: number;
  jogos: number;
  vitorias: number;
  abates: number;
  mortes: number;
  assistencias: number;
  kda: number;
  mvps: number;
  /** Os campeões que ele jogou, do mais jogado para o menos (o primeiro é a «assinatura»). */
  campeoes: readonly CampeaoDoJogador[];
  /** A posição em cada régua do ranking; null para quem ainda não jogou. */
  posicoes: Readonly<Record<MetricaDeJogador, number>> | null;
}>;

export type TimeDaForja = IdentidadeDoTime &
  Readonly<{
    slug: string;
    /** PTS de elenco (o definido pela organização, ou a soma dos elos). */
    pontos: number;
    /** Slugs do elenco de hoje, na ordem das rotas. */
    elenco: readonly string[];
    capitao: string | null;
    series: Readonly<{ v: number; d: number }>;
    jogos: Readonly<{ v: number; d: number }>;
    /** Posição na tabela; null enquanto ninguém jogou. */
    posicao: number | null;
    abates: number;
    mortes: number;
    assistencias: number;
    kda: number;
    mvps: number;
    /** Média de minutos dos jogos do time com tempo registrado; null sem nenhum. */
    duracaoMedia: number | null;
  }>;

export type LinhaDeElo = EloDaForja & Readonly<{ quantidade: number; jogadores: readonly string[] }>;

export type LinhaDeRota = Readonly<{
  slug: string;
  posicao: number;
  kda: number;
  jogos: number;
  abates: number;
  mortes: number;
  assistencias: number;
  mvps: number;
}>;

export type GrupoDeRota = RotaDaForja & Readonly<{ linhas: readonly LinhaDeRota[] }>;

export type LinhaDoRanking = Readonly<{ slug: string; posicao: number; valor: number }>;

export type CampeaoDaForja = Readonly<{
  /** Chave única: o id do Data Dragon, ou o texto digitado em minúsculas quando não reconhecido. */
  chave: string;
  /** Id do Data Dragon (para ícone e arte); null quando não reconhecido. */
  id: string | null;
  nome: string;
  picks: number;
  bans: number;
  vitorias: number;
  derrotas: number;
  winRate: number;
  presenca: number;
  banRate: number;
  kda: number;
  abates: number;
  mortes: number;
  assistencias: number;
}>;

export type JogoComTempo = Readonly<{
  serieId: string;
  jogo: number;
  min: number;
  timeA: string;
  timeB: string;
  vencedor: string;
}>;

export type SerieDaForja = Readonly<{
  id: string;
  data: string;
  timeA: string;
  timeB: string;
  placarA: number;
  placarB: number;
  completa: boolean;
  vencedor: string | null;
}>;

export type ResumoDaForja = Readonly<{
  jogadores: number;
  pool: number;
  media: number;
  monos: number;
  times: number;
  /** Jogos disputados (W.O. não é jogo). */
  jogos: number;
  seriesCompletas: number;
  seriesTotal: number;
  abates: number;
}>;

export type DadosDaForja = Readonly<{
  edicao: string;
  atualizadoEm: string;
  resumo: ResumoDaForja;
  elos: readonly LinhaDeElo[];
  times: readonly TimeDaForja[];
  /** Todos os jogadores do dataset (elenco, reserva e quem saiu), por slug. */
  jogadores: Readonly<Record<string, JogadorDaForja>>;
  /** Os 8 mais caros do draft, do mais caro para o menos (slugs). */
  topValor: readonly string[];
  rotas: readonly GrupoDeRota[];
  ranking: Readonly<Record<MetricaDeJogador, readonly LinhaDoRanking[]>>;
  /** Do elenco de hoje, quem ainda não entrou em jogo (slugs) — os que faltam no ranking. */
  semJogo: readonly string[];
  campeoes: Readonly<Record<string, CampeaoDaForja>>;
  campeoesOrdem: Readonly<Record<MetricaDeCampeao, readonly string[]>>;
  /** Do jogo mais longo para o mais curto. */
  duracoes: readonly JogoComTempo[];
  /** Todas as séries, da mais antiga para a mais nova. */
  series: readonly SerieDaForja[];
}>;

/** Rótulos que dependem do idioma. */
export type RotulosDaForja = Readonly<{
  elos: Readonly<Record<string, string>>;
  rotas: Readonly<Record<string, string>>;
  reserva: string;
}>;

const ROTULOS_PT: RotulosDaForja = { elos: {}, rotas: {}, reserva: "Reserva" };

/** Quantos entram em «top jogadores por valor» (o mesmo recorte da página antiga). */
export const TOP_POR_VALOR = 8;

// ------------------------------------------------------------------------------------ peças

function arredondar(valor: number, casas = 2): number {
  const fator = 10 ** casas;
  return Math.round(valor * fator) / fator;
}

/** Os campeões de cada jogador, contando só as linhas que pontuam (como a ficha e o ranking). */
function campeoesPorJogador(dataset: TournamentDataset): Map<string, CampeaoDoJogador[]> {
  const indexes = createIndexes(dataset);
  type Balde = { id: string | null; nome: string; jogos: number; vitorias: number; k: number; d: number; a: number };
  const porJogador = new Map<string, Map<string, Balde>>();

  for (const serie of dataset.seriesMatches) {
    for (const jogo of serie.games) {
      for (const linha of jogo.statsByPlayer) {
        const texto = linha.champion?.trim();
        if (!texto || !linhaPontua(linha)) continue;
        const jogador = indexes.playersById.get(linha.playerId);
        if (!jogador) continue;
        const resolvido = resolveChampion(texto);
        const chave = resolvido?.id ?? texto.toLowerCase();
        const baldes = porJogador.get(jogador.id) ?? new Map<string, Balde>();
        porJogador.set(jogador.id, baldes);
        const balde = baldes.get(chave) ?? { id: resolvido?.id ?? null, nome: resolvido?.name ?? texto, jogos: 0, vitorias: 0, k: 0, d: 0, a: 0 };
        baldes.set(chave, balde);
        balde.jogos += 1;
        balde.k += linha.kills;
        balde.d += linha.deaths;
        balde.a += linha.assists;
        if (timeDaLinha(linha, jogador) === jogo.winnerTeamId) balde.vitorias += 1;
      }
    }
  }

  const saida = new Map<string, CampeaoDoJogador[]>();
  for (const [jogadorId, baldes] of porJogador) {
    const lista = [...baldes.values()].sort((x, y) => {
      if (y.jogos !== x.jogos) return y.jogos - x.jogos;
      if (y.vitorias !== x.vitorias) return y.vitorias - x.vitorias;
      const kdaX = (x.k + x.a) / Math.max(1, x.d);
      const kdaY = (y.k + y.a) / Math.max(1, y.d);
      if (kdaY !== kdaX) return kdaY - kdaX;
      return x.nome.localeCompare(y.nome, "pt-BR");
    });
    saida.set(
      jogadorId,
      lista.map(({ id, nome, jogos, vitorias }) => ({ id, nome, jogos, vitorias })),
    );
  }
  return saida;
}

function seriesDaForja(dataset: TournamentDataset): SerieDaForja[] {
  return [...dataset.seriesMatches]
    .map<SerieDaForja>((serie) => {
      const placar = getSeriesScore(serie, dataset);
      return {
        id: serie.id,
        data: serie.date,
        timeA: serie.teamAId,
        timeB: serie.teamBId,
        placarA: placar.teamAWins,
        placarB: placar.teamBWins,
        completa: isSeriesComplete(serie, dataset),
        vencedor: getSeriesWinnerTeamId(serie, dataset),
      };
    })
    .sort((a, b) => {
      const ta = new Date(a.data).getTime();
      const tb = new Date(b.data).getTime();
      return (Number.isNaN(ta) ? 0 : ta) - (Number.isNaN(tb) ? 0 : tb) || a.id.localeCompare(b.id);
    });
}

// ------------------------------------------------------------------------------------ montagem

export function montarDadosDaForja(dataset: TournamentDataset, rotulos: RotulosDaForja = ROTULOS_PT): DadosDaForja {
  const rotuloDoElo = (chave: string, padrao: string) => rotulos.elos[chave] ?? padrao;
  const rotuloDaRota = (sigla: string, padrao: string) => rotulos.rotas[sigla] ?? padrao;

  const design = buildDesignPlayers(dataset, { reserva: rotulos.reserva });
  const elenco = design.filter((jogador) => jogador.noElenco);
  const designTimes = buildDesignTeams(dataset);
  const agregados = new Map(calculatePlayerAggregates(dataset).map((a) => [a.playerId, a] as const));
  const quadros = buildLeaderboards(dataset);
  const campeoesDe = campeoesPorJogador(dataset);

  // ---- ranking (a ordem é a do lib, com os desempates dele)
  const ranking: Record<MetricaDeJogador, LinhaDoRanking[]> = {
    abates: quadros.kills.map((l) => ({ slug: l.player.playerSlug, posicao: l.position, valor: l.value })),
    kda: quadros.kda.map((l) => ({ slug: l.player.playerSlug, posicao: l.position, valor: arredondar(l.value, 4) })),
    mvps: quadros.mvps.map((l) => ({ slug: l.player.playerSlug, posicao: l.position, valor: l.value })),
    assist: quadros.assists.map((l) => ({ slug: l.player.playerSlug, posicao: l.position, valor: l.value })),
    mortes: quadros.deathsLeast.map((l) => ({ slug: l.player.playerSlug, posicao: l.position, valor: l.value })),
  };
  const posicoesPorSlug = new Map<string, Record<MetricaDeJogador, number>>();
  for (const metrica of METRICAS_DE_JOGADOR) {
    for (const linha of ranking[metrica]) {
      const atual = posicoesPorSlug.get(linha.slug) ?? { abates: 0, kda: 0, mvps: 0, assist: 0, mortes: 0 };
      atual[metrica] = linha.posicao;
      posicoesPorSlug.set(linha.slug, atual);
    }
  }

  // ---- jogadores
  const timePorId = new Map(dataset.teams.map((time) => [time.id, time] as const));
  const jogadores: Record<string, JogadorDaForja> = {};
  for (const j of design) {
    const agg = agregados.get(j.id);
    const time = j.teamId ? timePorId.get(j.teamId) : undefined;
    const tema = time ? temaDoTime(time.slug) : null;
    const rota = resolveRole(j.role1);
    const elo = resolveElo(j.elo);
    jogadores[j.slug] = {
      id: j.id,
      slug: j.slug,
      nick: j.displayNick,
      nome: j.name,
      foto: j.imageUrl ?? null,
      fotoFoco: tema?.fotos.foco?.[j.slug] ?? tema?.fotos.focoPadrao ?? "50% 22%",
      fotoMedalhao: tema?.fotos.formato === "medalhao",
      timeId: j.teamId,
      elo: elo ? { chave: elo.key, rotulo: rotuloDoElo(elo.key, elo.label), cor: elo.color, pts: elo.pts } : null,
      rota: { sigla: rota.short, rotulo: rotuloDaRota(rota.short, rota.label), cor: rota.color, chave: j.role1 },
      capitao: j.captain,
      mono: j.mono,
      noElenco: j.noElenco,
      reserva: j.reserva,
      saiu: j.saiu,
      pts: j.pts,
      jogos: agg?.gamesPlayed ?? 0,
      vitorias: agg?.wins ?? 0,
      abates: agg?.kills ?? 0,
      mortes: agg?.deaths ?? 0,
      assistencias: agg?.assists ?? 0,
      kda: arredondar(agg?.kda ?? 0, 4),
      mvps: agg?.gameMvps ?? 0,
      campeoes: campeoesDe.get(j.id) ?? [],
      posicoes: posicoesPorSlug.get(j.slug) ?? null,
    };
  }

  // ---- resumo (o mesmo cálculo da página antiga: pool = elenco de hoje)
  const pool = elenco.reduce((soma, jogador) => soma + jogador.pts, 0);
  const jogosDisputados = dataset.seriesMatches.reduce((n, serie) => n + serie.games.length, 0);
  const series = seriesDaForja(dataset);
  const agregadosDosTimes = new Map(calculateTeamAggregates(dataset).map((a) => [a.teamId, a] as const));
  const resumo: ResumoDaForja = {
    jogadores: elenco.length,
    pool,
    media: designTimes.length ? Math.round(pool / designTimes.length) : 0,
    monos: elenco.filter((jogador) => jogador.mono).length,
    times: designTimes.length,
    jogos: jogosDisputados,
    seriesCompletas: series.filter((serie) => serie.completa).length,
    seriesTotal: series.length,
    abates: [...agregadosDosTimes.values()].reduce((n, time) => n + time.kills, 0),
  };

  // ---- elos, de Ferro para cima, só os que têm alguém
  const elos: LinhaDeElo[] = ELO_ORDER.map((elo) => {
    const daqui = elenco.filter((jogador) => jogador.eloMeta?.key === elo.key);
    return {
      chave: elo.key,
      rotulo: rotuloDoElo(elo.key, elo.label),
      cor: elo.color,
      pts: elo.pts,
      quantidade: daqui.length,
      jogadores: daqui.map((jogador) => jogador.slug),
    };
  }).filter((linha) => linha.quantidade > 0);

  // ---- times
  const duracoesBrutas = getGameDurations(dataset);
  const tabela = calculateStandings(dataset);
  const posicaoNaTabela = new Map(tabela.rows.map((linha, i) => [linha.teamId, i + 1] as const));
  const linhaDaTabela = new Map(tabela.rows.map((linha) => [linha.teamId, linha] as const));
  const alguemJogou = series.some((serie) => serie.completa);

  const times: TimeDaForja[] = designTimes
    .map<TimeDaForja>((time) => {
      const bruto = timePorId.get(time.id) ?? null;
      const agg = agregadosDosTimes.get(time.id);
      const linha = linhaDaTabela.get(time.id);
      const tempos = duracoesBrutas.filter((d) => {
        const serie = dataset.seriesMatches.find((s) => s.id === d.seriesId);
        return serie?.teamAId === time.id || serie?.teamBId === time.id;
      });
      return {
        ...identidadeDoTime(bruto, time.id),
        slug: time.slug,
        pontos: time.total,
        elenco: time.roster.map((jogador) => jogador.slug),
        capitao: time.captain?.slug ?? null,
        series: { v: linha?.seriesWon ?? 0, d: linha?.seriesLost ?? 0 },
        jogos: { v: linha?.gamesWon ?? 0, d: linha?.gamesLost ?? 0 },
        posicao: alguemJogou ? (posicaoNaTabela.get(time.id) ?? null) : null,
        abates: agg?.kills ?? 0,
        mortes: agg?.deaths ?? 0,
        assistencias: agg?.assists ?? 0,
        kda: arredondar(agg?.kda ?? 0, 4),
        mvps: agg?.gameMvps ?? 0,
        duracaoMedia: tempos.length ? arredondar(tempos.reduce((n, d) => n + d.durationMin, 0) / tempos.length, 1) : null,
      };
    })
    // A mesma ordem de «força dos times»: do elenco mais caro para o menos; empate fica na
    // ordem do dataset (sort é estável).
    .sort((a, b) => b.pontos - a.pontos);

  // ---- top por valor (elenco de hoje; empate na ordem do dataset, como sempre foi)
  const topValor = [...elenco]
    .sort((a, b) => b.pts - a.pts)
    .slice(0, TOP_POR_VALOR)
    .map((jogador) => jogador.slug);

  // ---- melhor por rota (top 3, pela mesma função da página antiga)
  const rotas: GrupoDeRota[] = buildRoleBests(dataset, 3, { reserva: rotulos.reserva }).map((grupo) => ({
    sigla: grupo.short,
    rotulo: rotuloDaRota(grupo.short, grupo.label),
    cor: grupo.color,
    chave: grupo.role1,
    linhas: grupo.rows.map((linha) => ({
      slug: linha.slug,
      posicao: linha.rank,
      kda: arredondar(linha.kda, 4),
      jogos: linha.games,
      abates: linha.kills,
      mortes: linha.deaths,
      assistencias: linha.assists,
      mvps: linha.mvps,
    })),
  }));

  // ---- campeões
  const campeoes: Record<string, CampeaoDaForja> = {};
  for (const c of calculateChampionAggregates(dataset)) {
    const resolvido = resolveChampion(c.championId) ?? resolveChampion(c.championName);
    campeoes[c.championId] = {
      chave: c.championId,
      id: resolvido?.id ?? null,
      nome: c.championName,
      picks: c.picks,
      bans: c.bans,
      vitorias: c.wins,
      derrotas: c.losses,
      winRate: arredondar(c.winRate, 2),
      presenca: arredondar(c.presence, 2),
      banRate: arredondar(c.banRate, 2),
      kda: arredondar(c.kda, 4),
      abates: c.kills,
      mortes: c.deaths,
      assistencias: c.assists,
    };
  }
  const quadrosDeCampeao = buildChampionLeaderboards(dataset);
  const campeoesOrdem: Record<MetricaDeCampeao, string[]> = {
    jogados: quadrosDeCampeao.picks.map((l) => l.champion.championId),
    banidos: quadrosDeCampeao.bans.map((l) => l.champion.championId),
    presenca: quadrosDeCampeao.presence.map((l) => l.champion.championId),
    winrate: quadrosDeCampeao.winRate.map((l) => l.champion.championId),
    kda: quadrosDeCampeao.kda.map((l) => l.champion.championId),
  };

  // ---- duração (a ordem do lib: do mais longo para o mais curto)
  const idPorNomeDaSerie = new Map(dataset.seriesMatches.map((serie) => [serie.id, serie] as const));
  const duracoes: JogoComTempo[] = duracoesBrutas.map((d) => {
    const serie = idPorNomeDaSerie.get(d.seriesId);
    return {
      serieId: d.seriesId,
      jogo: d.gameIndex,
      min: d.durationMin,
      timeA: serie?.teamAId ?? "",
      timeB: serie?.teamBId ?? "",
      vencedor: d.winnerTeamId,
    };
  });

  // ---- quem do elenco ainda não jogou (os que «faltam» no ranking)
  const semJogo = elenco.filter((jogador) => (agregados.get(jogador.id)?.gamesPlayed ?? 0) === 0).map((jogador) => jogador.slug);

  return {
    edicao: dataset.tournament.name,
    atualizadoEm: dataset.tournament.lastUpdatedISO,
    resumo,
    elos,
    times,
    jogadores,
    topValor,
    rotas,
    ranking,
    semJogo,
    campeoes,
    campeoesOrdem,
    duracoes,
    series,
  };
}

// ------------------------------------------------------------------------------------ leitura

/** O nick de exibição a partir do Riot ID (sem a tag). Reexportado para as telas do cliente. */
export const nickDeExibicao = getDisplayNick;

/** As artes do Data Dragon de um campeão reconhecido (a CSP do site já libera o domínio). */
export function arteDoCampeao(id: string): Readonly<{ retrato: string; splash: string }> {
  const seguro = encodeURIComponent(id);
  return {
    // Retrato de tela de carregamento (308×560): a arte vertical, leve, que cabe numa carta.
    retrato: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${seguro}_0.jpg`,
    // Splash inteira (1215×717): fundo de cena.
    splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${seguro}_0.jpg`,
  };
}

/** O valor de um campeão numa aba, já como número cru (a tela formata). */
export function valorDoCampeao(campeao: CampeaoDaForja, metrica: MetricaDeCampeao): number {
  if (metrica === "jogados") return campeao.picks;
  if (metrica === "banidos") return campeao.bans;
  if (metrica === "presenca") return campeao.presenca;
  if (metrica === "winrate") return campeao.winRate;
  return campeao.kda;
}

/** O valor de um jogador numa régua do ranking. */
export function valorDoJogador(jogador: JogadorDaForja, metrica: MetricaDeJogador): number {
  if (metrica === "abates") return jogador.abates;
  if (metrica === "kda") return jogador.kda;
  if (metrica === "mvps") return jogador.mvps;
  if (metrica === "assist") return jogador.assistencias;
  return jogador.mortes;
}

/** O confronto direto entre dois times: as séries entre eles, da mais antiga para a mais nova. */
export function confrontoDireto(dados: DadosDaForja, timeA: string, timeB: string): readonly SerieDaForja[] {
  return dados.series.filter(
    (serie) => (serie.timeA === timeA && serie.timeB === timeB) || (serie.timeA === timeB && serie.timeB === timeA),
  );
}

/** As próximas séries por jogar, da mais próxima para a mais distante. */
export function proximasSeries(dados: DadosDaForja, limite = 6): readonly SerieDaForja[] {
  return dados.series.filter((serie) => !serie.completa).slice(0, limite);
}
