// @vitest-environment jsdom
import { readFileSync } from "node:fs";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel, auditarSerie } from "@/components/admin/admin-series-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import type { RegraDoSubstituto } from "@/lib/roster";
import { tournamentDatasetSchema, type SeriesGame, type TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, getSeriesScore } from "@/lib/tournament";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/**
 * O painel de SÉRIES com as decisões de 22/10/2026.
 *
 * Regra 6 — substituto avulso: a linha do reserva (sem time) ou do titular de outro time
 * ganha "Jogou por", que grava o `teamId` da LINHA. Sem ele o servidor recusa o reserva, e o
 * painel travava/mostrava o caso como "jogador de fora" sem dizer o que fazer. O aviso de
 * pontos (substituto acima do teto) só avisa: a organização aprova.
 *
 * W.O. no meio da série — "jogos valem, W.O. completa": aplicar o W.O. numa série com jogos
 * lançados ZERAVA `games` (e perguntava "vai remover os jogos"). Agora nada é apagado, o placar
 * é o oficial (2x1 quando quem leva o W.O. perdia) e o W.O. numa série já decidida nem é
 * oferecido — o servidor recusa.
 *
 * A auditoria tem de bater com o servidor: bloqueio é o que o schema recusa.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const servidorAceita = (d: TournamentDataset) => validar(applyAutoGameMvpsToDataset(d)).success;

/** O cenário com os jogos dados na série s1 (ALFA x BETA, MD3). */
function comJogos(jogos: SeriesGame[], ajuste?: (d: TournamentDataset) => void) {
  const d = cenario();
  d.seriesMatches[0].games = jogos;
  ajuste?.(d);
  return d;
}

/** Jogo 1 de s1: ALFA sem a TOP, com o reserva no lugar; BETA completa. */
function jogoComReserva(extra: Partial<SeriesGame["statsByPlayer"][number]> = {}): SeriesGame {
  return jogo("alfa", [
    ...linhasDoTime("alfa", [2, 1, 3], ["TOP"]),
    linha("r1", 6, 0, 6, { champion: "Ahri", ...extra }),
    ...linhasDoTime("beta", [1, 2, 1]),
  ]);
}

function montar(
  inicial: TournamentDataset,
  { compacto = false, regra }: { compacto?: boolean; regra?: RegraDoSubstituto | null } = {},
) {
  let atual = inicial;
  function Harness() {
    const [d, setD] = useState(atual);
    const mutate: MutateDraft = (recipe) => {
      const proximo = structuredClone(atual);
      recipe(proximo);
      atual = proximo;
      setD(proximo);
    };
    return (
      <ModoCompacto ativo={compacto}>
        <AdminSeriesPanel
          draft={d}
          mutateDraft={mutate}
          aplicarDoServidor={mutate}
          onVersaoDoServidor={() => {}}
          {...(regra !== undefined ? { regraDoSubstituto: regra } : {})}
        />
      </ModoCompacto>
    );
  }
  render(<Harness />);
  return { atual: () => atual };
}

/**
 * Botão pelo texto ou pelo nome acessível — pela árvore e não por `getByRole`, que no jsdom
 * leva segundos por chamada num painel deste tamanho (e estoura o tempo com a máquina cheia).
 */
function botao(texto: RegExp | string): HTMLButtonElement {
  const bate = (valor: string | null | undefined) =>
    typeof texto === "string" ? (valor ?? "").trim() === texto : texto.test(valor ?? "");
  const achado = [...document.querySelectorAll("button")].find(
    (b) => bate(b.textContent) || bate(b.getAttribute("aria-label")),
  );
  if (!achado) throw new Error(`Botão não encontrado: ${String(texto)}`);
  return achado;
}

const folhaDaSerie = () => document.querySelector<HTMLElement>('[role="dialog"]')!;

function abrirAlfaBeta() {
  const alvo = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.includes("ALFA") && b.textContent?.includes("BETA"),
  );
  fireEvent.click(alvo!);
}

/** A opção do select pelo texto. */
const opcao = (select: HTMLSelectElement, texto: RegExp) => [...select.options].find((o) => texto.test(o.text));

/** Regra 6 de mentira: o preço vem do nick; o reserva vale 9, os titulares 3. */
const regraFalsa: RegraDoSubstituto = {
  preco: (jogador) => (jogador.nick.startsWith("Reserva") ? 9 : 3),
  comparar: (sub, tit) => regraFalsa.preco(sub)! <= regraFalsa.preco(tit)!,
};

// ---------------------------------------------------------------- auditoria = servidor

describe("auditoria do substituto avulso bate com o servidor", () => {
  it("linha do reserva SEM “Jogou por”: trava, dizendo o que fazer — o servidor recusa", () => {
    const d = comJogos([jogoComReserva()]);
    const auditoria = auditarSerie(d.seriesMatches[0], d);
    expect(auditoria.bloqueios.join(" ")).toMatch(/Reserva#BR1 é reserva \(sem time\) — escolha em “Jogou por”/);
    expect(servidorAceita(d)).toBe(false);
  });

  it("com “Jogou por” num dos dois times: nada trava — o servidor aceita", () => {
    const d = comJogos([jogoComReserva({ teamId: "alfa" })]);
    const auditoria = auditarSerie(d.seriesMatches[0], d);
    expect(auditoria.bloqueios).toEqual([]);
    // (As linhas do cenário não têm campeão: esse aviso de sempre é o único que sobra.)
    expect(auditoria.avisos.filter((aviso) => !aviso.endsWith("falta o campeão."))).toEqual([]);
    expect(servidorAceita(d)).toBe(true);
  });

  it("“Jogou por” apontando para time de fora da série: trava — o servidor recusa", () => {
    const d = comJogos([jogoComReserva({ teamId: "gama" })]);
    expect(auditarSerie(d.seriesMatches[0], d).bloqueios.join(" ")).toMatch(/aponta para GAMA, que não disputa/);
    expect(servidorAceita(d)).toBe(false);
  });

  it("titular de OUTRO time cobrindo a vaga, com “Jogou por”: não é mais “jogador de fora”", () => {
    const d = comJogos([
      jogo("alfa", [
        ...linhasDoTime("alfa", [2, 1, 3], ["TOP"]),
        linha(id("gama", "TOP"), 1, 1, 1, { champion: "Garen", teamId: "alfa" }),
        ...linhasDoTime("beta", [1, 2, 1]),
      ]),
    ]);
    const auditoria = auditarSerie(d.seriesMatches[0], d);
    expect(auditoria.avisos.join(" ")).not.toMatch(/hoje está em/);
    expect(servidorAceita(d)).toBe(true);
  });

  it("aviso de pontos (regra 6) quando o substituto passa do teto — aviso, nunca bloqueio", () => {
    const d = comJogos([jogoComReserva({ teamId: "alfa" })]);
    const auditoria = auditarSerie(d.seriesMatches[0], d, undefined, regraFalsa);
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos.join(" ")).toMatch(/Jogo 1: Reserva#BR1 cobriu ALFA valendo 9 ponto\(s\), acima de 3/);
    expect(auditoria.substitutosPorJogo[0]).toHaveLength(1);
  });

  it("sem acesso aos preços: pede a conferência à mão, também sem travar", () => {
    const d = comJogos([jogoComReserva({ teamId: "alfa" })]);
    const auditoria = auditarSerie(d.seriesMatches[0], d, undefined, null);
    expect(auditoria.bloqueios).toEqual([]);
    expect(auditoria.avisos.join(" ")).toMatch(/não deu para ler os pontos.*Confira a regra 6 à mão/);
  });
});

describe("auditoria do W.O. no meio da série bate com o servidor", () => {
  it("W.O. com um jogo que não decidiu a série: nada trava — o servidor aceita", () => {
    const d = comJogos([jogo("beta", [...linhasDoTime("alfa", [1, 2, 1]), ...linhasDoTime("beta", [3, 1, 2])])], (x) => {
      x.seriesMatches[0].walkoverWinnerTeamId = "alfa";
    });
    expect(auditarSerie(d.seriesMatches[0], d).bloqueios).toEqual([]);
    expect(servidorAceita(d)).toBe(true);
  });

  it("os jogos de uma série com W.O. continuam auditados (eles valem): linha sem jogador trava", () => {
    const d = comJogos([jogo("beta", [...linhasDoTime("beta", [3, 1, 2]), linha("", 4, 0, 0)])], (x) => {
      x.seriesMatches[0].walkoverWinnerTeamId = "alfa";
    });
    expect(auditarSerie(d.seriesMatches[0], d).bloqueios).toContain("Jogo 1, linha 6: falta escolher o jogador.");
    expect(servidorAceita(d)).toBe(false);
  });

  it("W.O. numa série que os jogos já decidiram (2x0): trava — o servidor recusa", () => {
    const vitoria = () => jogo("alfa", [...linhasDoTime("alfa", [3, 1, 2]), ...linhasDoTime("beta", [1, 2, 1])]);
    const d = comJogos([vitoria(), vitoria()], (x) => {
      x.seriesMatches[0].walkoverWinnerTeamId = "beta";
    });
    expect(auditarSerie(d.seriesMatches[0], d).bloqueios.join(" ")).toMatch(/já estava decidida pelos jogos lançados \(2x0\)/);
    expect(servidorAceita(d)).toBe(false);
  });
});

describe("o dataset real (3ª Edição) no painel", () => {
  it("nenhuma série ganha bloqueio novo: o que o servidor aceita, o painel deixa salvar", () => {
    const real = tournamentDatasetSchema.parse(JSON.parse(readFileSync("leagueofbronze.json", "utf8")));
    for (const serie of real.seriesMatches) {
      // `gravada` = ela mesma: é o que o painel compara ao abrir o dado do servidor.
      expect(auditarSerie(serie, real, serie, null).bloqueios, serie.id).toEqual([]);
    }
  });
});

// ---------------------------------------------------------------- painel: substituto

describe("“Jogou por” no lançamento (monitor)", () => {
  it("o reserva ganha o “Jogou por”; escolher o time grava o teamId da LINHA e destrava", () => {
    const { atual } = montar(comJogos([jogoComReserva()]));
    abrirAlfaBeta();

    expect(screen.getAllByText(/é reserva \(sem time\) — escolha em “Jogou por”/).length).toBeGreaterThan(0);
    const jogouPor = screen.getByLabelText("Time pelo qual a linha 5 jogou") as HTMLSelectElement;
    fireEvent.change(jogouPor, { target: { value: "alfa" } });

    const linhaDoReserva = atual().seriesMatches[0].games[0].statsByPlayer[4];
    expect(linhaDoReserva).toMatchObject({ playerId: "r1", teamId: "alfa" });
    expect(screen.queryByText(/é reserva \(sem time\) — escolha em “Jogou por”/)).toBeNull();
    expect(servidorAceita(atual())).toBe(true);
  });

  it("trocar a linha para quem joga pelo próprio time tira o teamId da linha (como sempre foi)", () => {
    const { atual } = montar(comJogos([jogoComReserva({ teamId: "alfa" })]));
    abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Jogador da linha 5"), { target: { value: id("alfa", "TOP") } });
    const nova = atual().seriesMatches[0].games[0].statsByPlayer[4];
    expect(nova.playerId).toBe(id("alfa", "TOP"));
    expect("teamId" in nova).toBe(false);
    expect(screen.queryByLabelText("Time pelo qual a linha 5 jogou")).toBeNull();
  });

  it("trocar o Time A mantém o reserva que cobriu o Time B (a linha vale pelo time DELA)", () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    const inicial = comJogos([
      jogo("alfa", [
        ...linhasDoTime("alfa", [2, 1, 3]),
        ...linhasDoTime("beta", [1, 2, 1], ["TOP"]),
        linha("r1", 1, 1, 1, { champion: "Garen", teamId: "beta" }),
      ]),
    ]);
    const { atual } = montar(inicial);
    abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Time A"), { target: { value: "gama" } });
    const linhas = atual().seriesMatches[0].games[0].statsByPlayer;
    expect(linhas.map((l) => l.playerId)).toEqual([
      ...["JUNGLE", "MID", "ADC", "SUP"].map((rota) => id("beta", rota)),
      "r1",
    ]);
  });

  it("os reservas aparecem no select de jogador como substitutos", () => {
    montar(comJogos([jogo("alfa", [linha("", 0, 0, 0)])]));
    abrirAlfaBeta();
    const select = screen.getByLabelText("Jogador da linha 1") as HTMLSelectElement;
    const grupo = select.querySelector<HTMLOptGroupElement>('optgroup[label="Reservas (substituto)"]')!;
    expect([...grupo.querySelectorAll("option")].some((o) => /Reserva#BR1 — reserva \(sem time\)/.test(o.text))).toBe(true);
  });

  it("o aviso de pontos aparece na linha do substituto e no quadro da série, sem travar", () => {
    montar(comJogos([jogoComReserva({ teamId: "alfa" })]), { regra: regraFalsa });
    abrirAlfaBeta();
    const avisos = screen.getAllByText(/Reserva#BR1 cobriu ALFA valendo 9 ponto\(s\), acima de 3/);
    expect(avisos.length).toBe(2);
    expect(screen.queryByText("Esta série ainda não pode ser salva")).toBeNull();
  });

  it("importar da Riot reconhece o reserva e grava o time do lado em que ele jogou", async () => {
    const d = comJogos([{ winnerTeamId: "", mvpPlayerId: "", statsByPlayer: [] }]);
    const nick = (playerId: string) => d.players.find((p) => p.id === playerId)!.nick;
    const participante = (playerId: string, side: "BLUE" | "RED", win: boolean, k: number) => ({
      participantId: 0,
      side,
      puuid: playerId,
      riotIdGameName: null,
      riotIdTagline: null,
      summonerName: null,
      riotId: nick(playerId),
      champion: "Ahri",
      kills: k,
      deaths: 1,
      assists: 1,
      win,
    });
    const azul = ["JUNGLE", "MID", "ADC", "SUP"].map((rota) => participante(id("alfa", rota), "BLUE", true, 2));
    const vermelho = ["TOP", "JUNGLE", "MID", "ADC", "SUP"].map((rota) => participante(id("beta", rota), "RED", false, 1));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            match: {
              matchId: "BR1_1",
              durationSec: 1800,
              durationMin: 30,
              winningSide: "BLUE",
              participants: [...azul, participante("r1", "BLUE", true, 9), ...vermelho],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    const { atual } = montar(d);
    abrirAlfaBeta();
    fireEvent.change(screen.getByPlaceholderText("Ex.: 3210692404 ou BR1_3210692404"), { target: { value: "BR1_1" } });
    fireEvent.click(botao("Importar da Riot"));

    await waitFor(() => expect(screen.getByText(/Partida importada da Riot \(10 jogadores\)/)).toBeTruthy());
    const linhas = atual().seriesMatches[0].games[0].statsByPlayer;
    expect(linhas.find((l) => l.playerId === "r1")).toMatchObject({ teamId: "alfa", kills: 9 });
    expect(linhas.filter((l) => l.teamId !== undefined)).toHaveLength(1);
    expect(servidorAceita(atual())).toBe(true);
  });
});

describe("os preços da regra 6 no painel de séries", () => {
  const corpo = (dados: unknown, status = 200) =>
    new Response(JSON.stringify(dados), { status, headers: { "Content-Type": "application/json" } });

  /** Dez inscritos (2 times de 5): metade Ferro, metade Diamante. */
  const inscritos = Array.from({ length: 10 }, (_, i) => ({
    id: `i${i}`,
    riot_id: `Jogador${i}#BR1`,
    situacao: "apto",
    organizador: false,
    elo_declarado: i < 5 ? "Ferro" : "Diamante",
    elo_verificado: null,
    elo_congelado: null,
  }));
  const config = { jogadores_por_time: 5, orcamento_por_time: 30, max_times: 2 };

  it("lê as inscrições e, sem draft, usa a prévia: o Diamante vale mais que o Ferro", async () => {
    const { lerRegraDoSubstituto } = await import("@/components/admin/regra-do-substituto");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("/api/admin/edicao") ? corpo({ config, inscritos }) : corpo({ draft: null }),
      ),
    );
    const regra = await lerRegraDoSubstituto();
    expect(regra).not.toBeNull();
    const ferro = { nick: "jogador0#br1" };
    const diamante = { nick: "Jogador9#BR1" };
    expect(regra!.preco(ferro)).toEqual(expect.any(Number));
    expect(regra!.preco(diamante)!).toBeGreaterThan(regra!.preco(ferro)!);
    expect(regra!.comparar(diamante, ferro)).toBe(false);
    expect(regra!.comparar(ferro, diamante)).toBe(true);
    expect(regra!.comparar({ nick: "SemInscricao#BR1" }, ferro)).toBeNull();
  });

  it("sem permissão para as inscrições (403): sem regra — o painel pede a conferência à mão", async () => {
    const { lerRegraDoSubstituto } = await import("@/components/admin/regra-do-substituto");
    vi.stubGlobal("fetch", vi.fn(async () => corpo({ error: "sem permissão" }, 403)));
    expect(await lerRegraDoSubstituto()).toBeNull();
  });

  it("quem não pode ver as inscrições vê o pedido de conferência à mão no quadro da série", () => {
    const d = comJogos([jogoComReserva({ teamId: "alfa" })]);
    let atual = d;
    function Harness() {
      const [x, setX] = useState(atual);
      const mutate: MutateDraft = (recipe) => {
        const proximo = structuredClone(atual);
        recipe(proximo);
        atual = proximo;
        setX(proximo);
      };
      return (
        <AdminSeriesPanel
          draft={x}
          mutateDraft={mutate}
          aplicarDoServidor={mutate}
          onVersaoDoServidor={() => {}}
          podeVerPrecos={false}
        />
      );
    }
    render(<Harness />);
    abrirAlfaBeta();
    expect(screen.getByText(/Reserva#BR1 jogou como substituto por ALFA, e não deu para ler os pontos/)).toBeTruthy();
  });
});

describe("“Jogou por” no celular", () => {
  it("o cartão do reserva traz o “Jogou por” e a faixa passa a ser a do time coberto", () => {
    const { atual } = montar(comJogos([jogoComReserva()]), { compacto: true });
    fireEvent.click(botao(/Abrir a série ALFA x BETA/));
    const folha = folhaDaSerie();

    fireEvent.change(within(folha).getByLabelText("Time pelo qual a linha 5 jogou"), { target: { value: "alfa" } });
    expect(atual().seriesMatches[0].games[0].statsByPlayer[4].teamId).toBe("alfa");
    expect(within(folha).getAllByText("SUB").length).toBe(1);
    expect(servidorAceita(atual())).toBe(true);
  });
});

// ---------------------------------------------------------------- painel: W.O. no meio

describe("W.O. com jogos lançados (monitor e celular)", () => {
  const jogoDaBeta = () => jogo("beta", [...linhasDoTime("alfa", [1, 2, 1]), ...linhasDoTime("beta", [3, 1, 2])]);

  it.each([false, true])("aplicar W.O. não apaga o jogo 1: placar 2x1 e os jogos de W.O. numerados (celular: %s)", (compacto) => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const inicial = comJogos([jogoDaBeta()]);
    const jogoAntes = copia(inicial.seriesMatches[0].games[0]);
    const { atual } = montar(inicial, { compacto });
    if (compacto) fireEvent.click(botao(/Abrir a série ALFA x BETA/));
    else abrirAlfaBeta();

    fireEvent.change(screen.getByLabelText("Situação da série"), { target: { value: "alfa" } });

    expect(confirmar).toHaveBeenCalledOnce();
    const pergunta = String((confirmar.mock.calls as unknown as string[][])[0][0]);
    expect(pergunta).toMatch(/O jogo já lançado continua valendo/);
    expect(pergunta).toMatch(/ALFA 2 x 1 BETA/);
    expect(pergunta).not.toMatch(/remover/);

    const serie = atual().seriesMatches[0];
    expect(serie.walkoverWinnerTeamId).toBe("alfa");
    expect(serie.games).toEqual([jogoAntes]);
    expect(getSeriesScore(serie, atual())).toEqual({ teamAWins: 2, teamBWins: 1 });
    expect(servidorAceita(atual())).toBe(true);

    expect(screen.getAllByText(/W.O. para ALFA no meio da série: 2-1 para ALFA/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jogos 2 e 3 por W.O./).length).toBeGreaterThan(0);
    // B venceu o jogo 1: os jogos 2 e 3 são de ALFA por W.O.
    expect(screen.getAllByText(/Vitória de ALFA por W.O. — sem K\/D\/A nem MVP/)).toHaveLength(2);
    // O jogo disputado continua aberto para correção.
    expect(screen.getByLabelText("Jogador da linha 1")).toBeTruthy();
  });

  it("série já decidida pelos jogos (2x0): o W.O. nem é oferecido, e nada muda", () => {
    const vitoria = () => jogo("alfa", [...linhasDoTime("alfa", [3, 1, 2]), ...linhasDoTime("beta", [1, 2, 1])]);
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(comJogos([vitoria(), vitoria()]));
    abrirAlfaBeta();

    const situacao = screen.getByLabelText("Situação da série") as HTMLSelectElement;
    const opcaoBeta = opcao(situacao, /^W.O. para BETA$/)!;
    expect(opcaoBeta.disabled).toBe(true);
    expect(screen.getByText(/Os jogos lançados já decidiram a série \(2x0\): não cabe W.O./)).toBeTruthy();

    fireEvent.change(situacao, { target: { value: "beta" } });
    expect(confirmar).not.toHaveBeenCalled();
    expect(atual().seriesMatches[0].walkoverWinnerTeamId).toBeUndefined();
    expect(atual().seriesMatches[0].games).toHaveLength(2);
  });

  it("W.O. sem jogo continua como sempre: 2-0 automático, sem pergunta", () => {
    const confirmar = vi.fn(() => true);
    vi.stubGlobal("confirm", confirmar);
    const { atual } = montar(comJogos([]));
    abrirAlfaBeta();
    fireEvent.change(screen.getByLabelText("Situação da série"), { target: { value: "beta" } });
    expect(confirmar).not.toHaveBeenCalled();
    expect(getSeriesScore(atual().seriesMatches[0], atual())).toEqual({ teamAWins: 0, teamBWins: 2 });
    expect(screen.getAllByText(/placar automático de 2-0 para BETA/).length).toBeGreaterThan(0);
  });
});
