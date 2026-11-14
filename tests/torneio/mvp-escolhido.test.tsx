// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminSeriesPanel, auditarSerie } from "@/components/admin/admin-series-panel";
import { ModoCompacto } from "@/components/admin/responsivo";
import type { MutateDraft } from "@/components/admin/shared";
import { diffDatasetForScopes } from "@/lib/security/dataset-diff";
import { tournamentDatasetSchema, type SeriesGame, type TournamentDataset } from "@/lib/schema";
import {
  applyAutoGameMvpsToDataset,
  calculatePlayerAggregates,
  createIndexes,
  getGameMvpPlayerId,
  getSeriesMvp,
  mvpDoJogo,
} from "@/lib/tournament";

import { cenario, copia, id, linha, linhasDoTime, validar } from "./_cenario-regra-6";

/**
 * MVP escolhido pela organização — decisão do Lucas em 14/11/2026 ("vale o nosso").
 *
 * Na 4a-jogo-02 o MVP anunciado dos dois jogos foi o Razeral, mas o site calculava o MVP só pelo
 * maior KDA e mostrava o nak4y no jogo 1 (12/2/9 contra 6/2/6). Agora o jogo guarda
 * `mvpEscolhido`, e o escolhido vale mais que o KDA — no jogo, na série, na contagem de MVPs e
 * na gravação (que antes recarimbava o automático por cima de qualquer escolha).
 *
 * Aqui o caso real em miniatura: na ALFA, a JUNGLE faz 12/2/9 (o maior KDA) e a TOP faz 6/2/6
 * (a escolhida pela organização).
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const TOP = id("alfa", "TOP");
const JUNGLE = id("alfa", "JUNGLE");

/** Um jogo da ALFA sobre a BETA; `escolhido` marca o MVP da organização. */
function jogoDaAlfa(escolhido?: string): SeriesGame {
  return {
    winnerTeamId: "alfa",
    mvpPlayerId: escolhido ?? JUNGLE,
    ...(escolhido ? { mvpEscolhido: true } : {}),
    statsByPlayer: [
      linha(TOP, 6, 2, 6),
      linha(JUNGLE, 12, 2, 9),
      linha(id("alfa", "MID"), 3, 3, 3),
      linha(id("alfa", "ADC"), 2, 2, 2),
      linha(id("alfa", "SUP"), 1, 5, 11),
      ...linhasDoTime("beta", [1, 4, 1]),
    ],
  };
}

function comJogos(jogos: SeriesGame[]): TournamentDataset {
  const d = cenario();
  d.seriesMatches[0]!.games = jogos;
  return d;
}

const s1 = (d: TournamentDataset) => d.seriesMatches[0]!;
const jogo1 = (d: TournamentDataset) => s1(d).games[0]!;
const mvpNaPagina = (d: TournamentDataset, indice = 0) =>
  mvpDoJogo(s1(d).games[indice]!, s1(d), createIndexes(d).playersById);

// ---------------------------------------------------------------- a regra

describe("o MVP escolhido vale mais que o maior KDA", () => {
  it("sem escolha, segue o automático: o maior KDA", () => {
    expect(mvpNaPagina(comJogos([jogoDaAlfa()]))).toBe(JUNGLE);
  });

  it("com a escolha da organização, o site mostra o escolhido", () => {
    expect(mvpNaPagina(comJogos([jogoDaAlfa(TOP)]))).toBe(TOP);
  });

  it("o mesmo vale para getGameMvpPlayerId (recorte por elenco)", () => {
    const d = comJogos([jogoDaAlfa(TOP)]);
    expect(getGameMvpPlayerId(jogo1(d), new Set([TOP, JUNGLE]))).toBe(TOP);
  });

  it("escolha de quem NÃO jogou (a linha sumiu) caduca: volta o automático, nunca um MVP fora das tabelas", () => {
    const d = comJogos([jogoDaAlfa(TOP)]);
    jogo1(d).statsByPlayer = jogo1(d).statsByPlayer.filter((l) => l.playerId !== TOP);
    expect(mvpNaPagina(d)).toBe(JUNGLE);
  });

  it("a marca sem a escolha de verdade (mvpEscolhido: false) não muda nada", () => {
    const d = comJogos([{ ...jogoDaAlfa(), mvpPlayerId: TOP, mvpEscolhido: false }]);
    expect(mvpNaPagina(d)).toBe(JUNGLE);
  });

  it("MVP da série e contagem de MVPs seguem a escolha", () => {
    const automatico = comJogos([jogoDaAlfa(), jogoDaAlfa()]);
    expect(getSeriesMvp(s1(automatico), automatico)?.playerId).toBe(JUNGLE);

    const escolhido = comJogos([jogoDaAlfa(TOP), jogoDaAlfa(TOP)]);
    expect(getSeriesMvp(s1(escolhido), escolhido)).toMatchObject({ playerId: TOP, gameMvpCount: 2 });
    const mvps = new Map(calculatePlayerAggregates(escolhido).map((p) => [p.playerId, p.gameMvps]));
    expect(mvps.get(TOP)).toBe(2);
    expect(mvps.get(JUNGLE)).toBe(0);
  });
});

// ---------------------------------------------------------------- gravação e permissão

describe("gravar não apaga a escolha", () => {
  it("o carimbo do MVP automático (feito a cada gravação) mantém o escolhido", () => {
    const gravado = applyAutoGameMvpsToDataset(comJogos([jogoDaAlfa(TOP)]));
    expect(jogo1(gravado)).toMatchObject({ mvpPlayerId: TOP, mvpEscolhido: true });
  });

  it("sem escolha, o carimbo segue o de sempre — e não cria a marca", () => {
    const gravado = applyAutoGameMvpsToDataset(comJogos([{ ...jogoDaAlfa(), mvpPlayerId: TOP }]));
    expect(jogo1(gravado).mvpPlayerId).toBe(JUNGLE);
    expect("mvpEscolhido" in jogo1(gravado)).toBe(false);
  });

  it("a escolha que caducou sai do banco na gravação (não volta sozinha se a linha reaparecer)", () => {
    const d = comJogos([jogoDaAlfa(TOP)]);
    jogo1(d).statsByPlayer = jogo1(d).statsByPlayer.filter((l) => l.playerId !== TOP);
    const gravado = applyAutoGameMvpsToDataset(d);
    expect(jogo1(gravado).mvpPlayerId).toBe(JUNGLE);
    expect("mvpEscolhido" in jogo1(gravado)).toBe(false);
  });

  it("o schema guarda a marca (o Zod descartaria um campo desconhecido em silêncio)", () => {
    const lido = tournamentDatasetSchema.parse(copia(comJogos([jogoDaAlfa(TOP)])));
    expect(jogo1(lido).mvpEscolhido).toBe(true);
  });

  it("escolher o MVP é mexer em resultado: exige results:write", () => {
    const antes = comJogos([jogoDaAlfa()]);
    const depois = copia(antes);
    jogo1(depois).mvpPlayerId = TOP;
    jogo1(depois).mvpEscolhido = true;
    expect([...new Set(diffDatasetForScopes(antes, depois).map((c) => c.scope))]).toEqual(["results:write"]);
    // E recarimbar o automático continua sem diferença nenhuma.
    expect(diffDatasetForScopes(antes, applyAutoGameMvpsToDataset(copia(antes)))).toEqual([]);
  });
});

// ---------------------------------------------------------------- painel

function montar(inicial: TournamentDataset, { compacto = false } = {}) {
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
        <AdminSeriesPanel draft={d} mutateDraft={mutate} aplicarDoServidor={mutate} onVersaoDoServidor={() => {}} />
      </ModoCompacto>
    );
  }
  render(<Harness />);
  return { atual: () => atual };
}

/** Botão pelo texto ou pelo nome acessível (sem `getByRole`, lento no jsdom com este painel). */
function botao(texto: RegExp | string): HTMLButtonElement {
  const bate = (valor: string | null | undefined) =>
    typeof texto === "string" ? (valor ?? "").trim() === texto : texto.test(valor ?? "");
  const achado = [...document.querySelectorAll("button")].find(
    (b) => bate(b.textContent) || bate(b.getAttribute("aria-label")),
  );
  if (!achado) throw new Error(`Botão não encontrado: ${String(texto)}`);
  return achado;
}

function abrirAlfaBeta() {
  const alvo = [...document.querySelectorAll("button")].find(
    (b) => b.textContent?.includes("ALFA") && b.textContent?.includes("BETA"),
  );
  fireEvent.click(alvo!);
}

const servidorAceita = (d: TournamentDataset) => validar(applyAutoGameMvpsToDataset(d)).success;

describe("seletor de MVP no painel (monitor)", () => {
  it("abre no automático, mostra quem é, e lista só quem jogou, com o K/D/A", () => {
    montar(comJogos([jogoDaAlfa()]));
    abrirAlfaBeta();
    const select = screen.getByLabelText("MVP do jogo 1") as HTMLSelectElement;

    expect(select.value).toBe("");
    expect(select.options[0]!.text).toBe("Automático: alfaJUNGLE#BR1");
    const alfa = select.querySelector<HTMLOptGroupElement>('optgroup[label="ALFA"]')!;
    expect([...alfa.querySelectorAll("option")].map((o) => o.text)).toContain("alfaTOP#BR1 · 6/2/6");
    expect(select.querySelectorAll('optgroup[label="BETA"] option')).toHaveLength(5);
    // GAMA não disputa a série: ninguém dela aparece.
    expect([...select.options].some((o) => o.text.startsWith("gama"))).toBe(false);
  });

  it("escolher grava o MVP da organização; voltar ao automático tira a marca", () => {
    const { atual } = montar(comJogos([jogoDaAlfa()]));
    abrirAlfaBeta();
    const select = screen.getByLabelText("MVP do jogo 1") as HTMLSelectElement;

    fireEvent.change(select, { target: { value: TOP } });
    expect(jogo1(atual())).toMatchObject({ mvpPlayerId: TOP, mvpEscolhido: true });
    expect((screen.getByLabelText("MVP do jogo 1") as HTMLSelectElement).value).toBe(TOP);
    expect(servidorAceita(atual())).toBe(true);
    expect(jogo1(applyAutoGameMvpsToDataset(atual())).mvpPlayerId).toBe(TOP);

    fireEvent.change(screen.getByLabelText("MVP do jogo 1"), { target: { value: "" } });
    expect(jogo1(atual()).mvpPlayerId).toBe(JUNGLE);
    expect("mvpEscolhido" in jogo1(atual())).toBe(false);
  });

  it("escolha que caducou aparece como automático e a auditoria avisa — sem travar", () => {
    const d = comJogos([jogoDaAlfa(TOP)]);
    jogo1(d).statsByPlayer = jogo1(d).statsByPlayer.filter((l) => l.playerId !== TOP);
    const auditoria = auditarSerie(s1(d), d);
    expect(auditoria.avisos).toContain(
      "Jogo 1: o MVP escolhido (alfaTOP#BR1) não está entre quem jogou — vale o automático (maior KDA).",
    );
    expect(auditoria.bloqueios).toEqual([]);

    montar(d);
    abrirAlfaBeta();
    expect((screen.getByLabelText("MVP do jogo 1") as HTMLSelectElement).value).toBe("");
  });

  it("importar da Riot mantém o MVP escolhido quando ele está na partida importada", async () => {
    const d = comJogos([jogoDaAlfa(TOP)]);
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
    const azul = ["TOP", "JUNGLE", "MID", "ADC", "SUP"].map((rota) =>
      participante(id("alfa", rota), "BLUE", true, rota === "JUNGLE" ? 9 : 2),
    );
    const vermelho = ["TOP", "JUNGLE", "MID", "ADC", "SUP"].map((rota) => participante(id("beta", rota), "RED", false, 1));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            match: { matchId: "BR1_1", durationSec: 1800, durationMin: 30, winningSide: "BLUE", participants: [...azul, ...vermelho] },
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
    expect(jogo1(atual())).toMatchObject({ mvpPlayerId: TOP, mvpEscolhido: true });
    expect(jogo1(atual()).statsByPlayer.find((l) => l.playerId === JUNGLE)?.kills).toBe(9);
  });
});

describe("seletor de MVP no celular", () => {
  it("a folha da série tem o mesmo seletor, e a escolha grava a marca", () => {
    const { atual } = montar(comJogos([jogoDaAlfa()]), { compacto: true });
    fireEvent.click(botao(/Abrir a série ALFA x BETA/));
    const folha = document.querySelector<HTMLElement>('[role="dialog"]')!;

    const select = within(folha).getByLabelText("MVP do jogo 1") as HTMLSelectElement;
    expect(select.options[0]!.text).toBe("Automático: alfaJUNGLE#BR1");
    fireEvent.change(select, { target: { value: TOP } });
    expect(jogo1(atual())).toMatchObject({ mvpPlayerId: TOP, mvpEscolhido: true });
  });
});
