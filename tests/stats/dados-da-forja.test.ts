import { describe, expect, it } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";
import { buildDesignPlayersDoElenco, buildDesignTeams } from "@/lib/roster";
import {
  METRICAS_DE_CAMPEAO,
  METRICAS_DE_JOGADOR,
  arteDoCampeao,
  confrontoDireto,
  montarDadosDaForja,
  proximasSeries,
  valorDoCampeao,
  valorDoJogador,
} from "@/lib/stats/forja";
import { buildRoleBests, buildStatsRows } from "@/lib/stats-view";
import { getGameDurations } from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/*
 * O RETRATO DA /stats (lib/stats/forja.ts) tem de dizer exatamente o que a página antiga dizia:
 * mesmos totais, mesma ordem, mesmos desempates — porque sai das mesmas funções. Estes testes
 * comparam o retrato com elas, e cobrem as três dúvidas levantadas na leitura da página:
 * todo time com a sua pontuação, todo jogador do top com o seu valor, e quem falta no ranking
 * (o titular que ainda não jogou) listado à parte.
 */

function dataset() {
  const d = copia(cenario());
  // Elos variados: o pool deixa de ser plano, e dois times empatam em pontos.
  const elos: Record<string, string> = {
    "alfa-top": "Ouro",
    "alfa-jungle": "Mestre",
    "alfa-mid": "Diamante",
    "alfa-adc": "Bronze",
    "alfa-sup": "Ferro",
    "beta-top": "Platina",
    "beta-mid": "Esmeralda",
    "gama-jungle": "Mestre",
    "gama-top": "Ouro",
    "gama-mid": "Diamante",
    "gama-adc": "Bronze",
    "gama-sup": "Ferro",
  };
  for (const jogador of d.players) if (elos[jogador.id]) jogador.elo = elos[jogador.id]!;

  // s1: ALFA 2x0 BETA — a MID do BETA fica de fora (não joga), no lugar entra um convidado.
  const convidado = (k: number, dd: number, a: number, campeao: string) =>
    linha("convidado-x", k, dd, a, { teamId: "beta", convidado: "Xis", champion: campeao });
  d.seriesMatches.find((s) => s.id === "s1")!.games = [
    {
      ...jogo("alfa", [
        linha(id("alfa", "TOP"), 3, 2, 4, { champion: "Garen" }),
        linha(id("alfa", "JUNGLE"), 9, 1, 6, { champion: "Viego" }),
        linha(id("alfa", "MID"), 7, 2, 5, { champion: "Ahri" }),
        linha(id("alfa", "ADC"), 5, 3, 7, { champion: "Jinx" }),
        linha(id("alfa", "SUP"), 0, 4, 15, { champion: "Karma" }),
        ...linhasDoTime("beta", [2, 5, 3], ["MID"]),
        convidado(4, 4, 2, "Lux"),
      ]),
      durationMin: 31,
      bans: [
        { teamId: "alfa", championName: "Yasuo" },
        { teamId: "beta", championName: "Yasuo" },
      ],
    },
    {
      ...jogo("alfa", [
        linha(id("alfa", "TOP"), 2, 1, 9, { champion: "Garen" }),
        linha(id("alfa", "JUNGLE"), 12, 0, 4, { champion: "Viego" }),
        linha(id("alfa", "MID"), 4, 3, 8, { champion: "Lux" }),
        linha(id("alfa", "ADC"), 6, 2, 5, { champion: "Jinx" }),
        linha(id("alfa", "SUP"), 1, 2, 18, { champion: "Lulu" }),
        ...linhasDoTime("beta", [1, 5, 2], ["MID"]),
        convidado(1, 6, 1, "Ahri"),
      ]),
      durationMin: 22,
    },
  ];
  // s2: GAMA 1x0 BETA, em andamento (um jogo só).
  d.seriesMatches.find((s) => s.id === "s2")!.games = [
    { ...jogo("gama", [...linhasDoTime("gama", [4, 2, 6]), ...linhasDoTime("beta", [2, 4, 3], ["MID"]), convidado(0, 3, 4, "Lux")]), durationMin: 44 },
  ];

  const r = validar(d);
  if (!r.success) throw new Error(`cenário inválido: ${r.error.issues.map((i) => i.message).join("; ")}`);
  return r.data;
}

const t = MESSAGES.pt.paginasStats;
const rotulos = { elos: t.elos, rotas: t.rotas, reserva: "Reserva" };

describe("montarDadosDaForja", () => {
  const d = dataset();
  const dados = montarDadosDaForja(d, rotulos);

  it("o resumo é o da página antiga: elenco de hoje, pool, média por time e monos", () => {
    const elenco = buildDesignPlayersDoElenco(d);
    const pool = elenco.reduce((n, j) => n + j.pts, 0);
    expect(dados.resumo.jogadores).toBe(15);
    expect(dados.resumo.pool).toBe(pool);
    expect(dados.resumo.media).toBe(Math.round(pool / 3));
    expect(dados.resumo.monos).toBe(0);
    expect(dados.resumo.jogos).toBe(3);
    expect(dados.resumo.seriesCompletas).toBe(1);
    expect(dados.resumo.seriesTotal).toBe(3);
  });

  it("TODO time aparece com a sua pontuação, inclusive os empatados", () => {
    const esperado = buildDesignTeams(d);
    expect(dados.times).toHaveLength(esperado.length);
    for (const time of esperado) {
      const achado = dados.times.find((x) => x.id === time.id);
      expect(achado, time.name).toBeDefined();
      expect(achado!.pontos).toBe(time.total);
      expect(achado!.elenco).toHaveLength(5);
    }
    // ALFA e GAMA têm o mesmo elenco de elos: mesmos pontos, e os DOIS continuam na lista.
    const alfa = dados.times.find((x) => x.id === "alfa")!;
    const gama = dados.times.find((x) => x.id === "gama")!;
    expect(alfa.pontos).toBe(gama.pontos);
    // Do mais caro para o menos, empate na ordem do dataset.
    expect(dados.times.map((x) => x.pontos)).toEqual([...dados.times.map((x) => x.pontos)].sort((a, b) => b - a));
    expect(dados.times.findIndex((x) => x.id === "alfa")).toBeLessThan(dados.times.findIndex((x) => x.id === "gama"));
  });

  it("a campanha de cada time vem da tabela", () => {
    const alfa = dados.times.find((x) => x.id === "alfa")!;
    const beta = dados.times.find((x) => x.id === "beta")!;
    expect(alfa.series).toEqual({ v: 1, d: 0 });
    expect(alfa.jogos).toEqual({ v: 2, d: 0 });
    expect(beta.series).toEqual({ v: 0, d: 1 });
    expect(alfa.posicao).toBe(1);
    expect(alfa.duracaoMedia).toBe(26.5);
  });

  it("os elos vão de Ferro para cima e só entram os que têm alguém", () => {
    const chaves = dados.elos.map((e) => e.chave);
    expect(chaves).toEqual(["ferro", "bronze", "prata", "ouro", "platina", "esmeralda", "diamante", "mestre"]);
    expect(dados.elos.reduce((n, e) => n + e.quantidade, 0)).toBe(dados.resumo.jogadores);
    expect([...dados.elos.find((e) => e.chave === "mestre")!.jogadores].sort()).toEqual(["alfa-jungle", "gama-jungle"]);
  });

  it("o top por valor traz o valor de cada um, com os empates na ordem do dataset", () => {
    expect(dados.topValor).toHaveLength(8);
    const valores = dados.topValor.map((slug) => dados.jogadores[slug]!.pts);
    expect(valores.every((v) => v > 0)).toBe(true);
    expect(valores).toEqual([...valores].sort((a, b) => b - a));
    expect(dados.topValor.slice(0, 4)).toEqual(["alfa-jungle", "gama-jungle", "alfa-mid", "gama-mid"]);
  });

  it("o ranking é o do site, régua por régua", () => {
    const antigo = buildStatsRows(d, { vitoria: "V", derrota: "D", jogo: "J", pick: "P", ban: "B", dosJogos: "dos jogos" });
    for (const metrica of METRICAS_DE_JOGADOR) {
      const linhas = dados.ranking[metrica];
      expect(linhas.map((l) => l.posicao)).toEqual(antigo.playerRankings[metrica]!.map((l) => l.rank));
      expect(linhas.map((l) => dados.jogadores[l.slug]!.nick)).toEqual(antigo.playerRankings[metrica]!.map((l) => l.nick));
      for (const l of linhas) expect(l.valor).toBeCloseTo(valorDoJogador(dados.jogadores[l.slug]!, metrica), 3);
    }
  });

  it("quem do elenco ainda não jogou falta no ranking e é listado à parte", () => {
    expect(dados.semJogo).toEqual(["beta-mid"]);
    expect(dados.ranking.abates).toHaveLength(dados.resumo.jogadores - dados.semJogo.length);
    expect(dados.ranking.abates.some((l) => l.slug === "beta-mid")).toBe(false);
    expect(dados.jogadores["beta-mid"]!.posicoes).toBeNull();
    // O reserva (sem time) não é do elenco: não entra na conta dos que faltam.
    expect(dados.jogadores["reserva"]!.noElenco).toBe(false);
  });

  it("melhor por rota: as cinco rotas, pela mesma função da página antiga", () => {
    const antigo = buildRoleBests(d, 3);
    expect(dados.rotas.map((r) => r.sigla)).toEqual(["TOP", "SEL", "MID", "ADC", "SUP"]);
    expect(dados.rotas.map((r) => r.linhas.map((l) => l.slug))).toEqual(antigo.map((g) => g.rows.map((r) => r.slug)));
    expect(dados.rotas[1]!.rotulo).toBe("Selva");
  });

  it("os campeões de cada jogador: o mais jogado primeiro, só linhas que pontuam", () => {
    const viego = dados.jogadores["alfa-jungle"]!.campeoes;
    expect(viego[0]).toEqual({ id: "Viego", nome: "Viego", jogos: 2, vitorias: 2 });
    // Ahri e Lux, um jogo cada: desempata pelo KDA do jogo (Ahri 7/2/5 = 6,0; Lux 4/3/8 = 4,0).
    expect(dados.jogadores["alfa-mid"]!.campeoes.map((c) => c.id)).toEqual(["Ahri", "Lux"]);
    expect(dados.jogadores["beta-mid"]!.campeoes).toEqual([]);
  });

  it("os campeões e as cinco abas, com o convidado contando para o campeão", () => {
    for (const metrica of METRICAS_DE_CAMPEAO) {
      const ordem = dados.campeoesOrdem[metrica];
      const valores = ordem.map((chave) => valorDoCampeao(dados.campeoes[chave]!, metrica));
      expect(valores).toEqual([...valores].sort((a, b) => b - a));
    }
    // Lux: alfa-mid (1) + o convidado (2) = 3 picks.
    expect(dados.campeoes["Lux"]!.picks).toBe(3);
    expect(dados.campeoes["Yasuo"]!.bans).toBe(2);
    expect(dados.campeoesOrdem.banidos).toEqual(["Yasuo"]);
  });

  it("as durações vêm do mais longo para o mais curto, com os times de cada jogo", () => {
    expect(dados.duracoes.map((x) => x.min)).toEqual(getGameDurations(d).map((x) => x.durationMin));
    expect(dados.duracoes[0]).toMatchObject({ serieId: "s2", jogo: 1, min: 44, timeA: "gama", timeB: "beta", vencedor: "gama" });
    expect(dados.duracoes.at(-1)).toMatchObject({ serieId: "s1", jogo: 2, min: 22 });
  });

  it("confronto direto e próximas séries saem das séries, em ordem de data", () => {
    expect(confrontoDireto(dados, "beta", "alfa").map((s) => s.id)).toEqual(["s1"]);
    expect(confrontoDireto(dados, "alfa", "beta")[0]).toMatchObject({ placarA: 2, placarB: 0, vencedor: "alfa", completa: true });
    expect(proximasSeries(dados).map((s) => s.id)).toEqual(["s2", "s3"]);
  });

  it("os rótulos saem no idioma pedido", () => {
    const en = MESSAGES.en.paginasStats;
    const emIngles = montarDadosDaForja(d, { elos: en.elos, rotas: en.rotas, reserva: "Substitute" });
    expect(emIngles.elos.find((e) => e.chave === "prata")!.rotulo).toBe("Silver");
    expect(emIngles.jogadores["alfa-jungle"]!.rota.rotulo).toBe("Jungle");
    expect(emIngles.jogadores["alfa-jungle"]!.elo!.rotulo).toBe("Master");
  });

  it("o retrato é só dado: passa por JSON sem perder nada", () => {
    expect(JSON.parse(JSON.stringify(dados))).toEqual(dados);
  });
});

describe("arteDoCampeao", () => {
  it("monta os endereços do Data Dragon, com o id codificado", () => {
    expect(arteDoCampeao("Viego").retrato).toBe("https://ddragon.leagueoflegends.com/cdn/img/champion/loading/Viego_0.jpg");
    expect(arteDoCampeao("Kai'Sa").splash).toBe("https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Kai'Sa_0.jpg");
  });
});
