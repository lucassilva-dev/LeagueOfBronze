// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AdminSeriesPanel,
  auditarSerie,
  formatoDaEtapa,
  opcoesDeCartinha,
} from "@/components/admin/admin-series-panel";
import {
  camposBrasiliaParaIso,
  createBlankSeries,
  dataDeHojeEmBrasilia,
  isoParaCamposBrasilia,
  type MutateDraft,
} from "@/components/admin/shared";
import { CALENDARIO_4A } from "@/lib/calendario-4a";
import { CALENDARIO_6_TIMES_DE_20_10, calendarioDe8TimesDeTeste } from "@/tests/_calendarios";
import type { SeriesMatch, TournamentDataset } from "@/lib/schema";

/**
 * Painel de Séries preparado para a 4ª Edição.
 *
 * Semifinais e final são criadas NESTE painel, com hora (08:30, 10:30, 14:30), e um jogo
 * remarcado vai para a reserva de sábado 19:00. O campo antigo era `<input type="date">`
 * gravando `slice(0, 10)`: não havia como pôr hora, e editar a data APAGAVA a hora que a
 * série já tinha. A etapa também não puxava o formato — uma FINAL ficava MD3 e o site
 * declarava campeão com 2x0.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------- fixtures

function dataset(series: SeriesMatch[] = []): TournamentDataset {
  return {
    tournament: {
      name: "4ª Edição",
      lastUpdatedISO: "2026-10-20T00:00:00.000Z",
      seriesPointsRule: { win: 3, loss: 0 },
      format: "BO3",
      status: "active",
    },
    archivedSeasons: [],
    teams: [
      { id: "alfa", name: "Alfa", slug: "alfa" },
      { id: "beta", name: "Beta", slug: "beta" },
      { id: "gama", name: "Gama", slug: "gama" },
    ],
    players: [],
    seriesMatches: series,
    standingsSeed: [],
  };
}

function serie(over: Partial<SeriesMatch> & { id: string }): SeriesMatch {
  return {
    date: "2026-11-28T15:30:00-03:00",
    teamAId: "alfa",
    teamBId: "beta",
    games: [],
    ...over,
  };
}

/** Jogo encerrado sem estatística (o que importa aqui é contar jogos). */
function jogo(winnerTeamId: string) {
  return { winnerTeamId, mvpPlayerId: "", durationMin: 30, statsByPlayer: [] };
}

/** O painel com o rascunho num estado de verdade; `atual()` devolve o último rascunho. */
function montar(inicial: TournamentDataset) {
  let ultimo = inicial;
  function Harness() {
    const [draft, setDraft] = useState(inicial);
    const mutate: MutateDraft = (recipe) => {
      const proximo = structuredClone(ultimo);
      recipe(proximo);
      ultimo = proximo;
      setDraft(proximo);
    };
    return (
      <AdminSeriesPanel
        draft={draft}
        mutateDraft={mutate}
        aplicarDoServidor={mutate}
        onVersaoDoServidor={() => {}}
      />
    );
  }
  render(<Harness />);
  return { atual: () => ultimo };
}

/** Abre a série no editor clicando nela na lista (o painel lembra a seleção entre testes). */
function abrir(nomeA: string, nomeB: string) {
  const alvo = screen
    .getAllByRole("button")
    .find((botao) => botao.textContent?.includes(nomeA) && botao.textContent?.includes(nomeB));
  if (!alvo) throw new Error(`série ${nomeA} x ${nomeB} não está na lista`);
  fireEvent.click(alvo);
}

// ---------------------------------------------------------------- conversões puras

describe("isoParaCamposBrasilia", () => {
  it("recorta a hora de um ISO já em Brasília (-03:00), sem passar por UTC", () => {
    expect(isoParaCamposBrasilia("2026-11-28T15:30:00-03:00")).toEqual({ data: "2026-11-28", hora: "15:30" });
    expect(isoParaCamposBrasilia("2026-11-29T08:30:00.000-03:00")).toEqual({ data: "2026-11-29", hora: "08:30" });
    expect(isoParaCamposBrasilia("2026-11-28T19:00-03:00")).toEqual({ data: "2026-11-28", hora: "19:00" });
  });

  it("converte Z e outros fusos para a hora de Brasília", () => {
    expect(isoParaCamposBrasilia("2026-11-29T17:30:00.000Z")).toEqual({ data: "2026-11-29", hora: "14:30" });
    expect(isoParaCamposBrasilia("2026-11-29T17:30:00+00:00")).toEqual({ data: "2026-11-29", hora: "14:30" });
    // 01:00 em UTC ainda é a noite ANTERIOR em Brasília: o dia também tem de virar.
    expect(isoParaCamposBrasilia("2026-11-21T01:00:00Z")).toEqual({ data: "2026-11-20", hora: "22:00" });
    expect(isoParaCamposBrasilia("2026-11-29T03:00:00Z")).toEqual({ data: "2026-11-29", hora: "00:00" });
  });

  it("data pura mostra a data com o horário vazio", () => {
    expect(isoParaCamposBrasilia("2026-07-20")).toEqual({ data: "2026-07-20", hora: "" });
  });

  it("hora sem fuso é Brasília, como o site já lê (lib/format.ts)", () => {
    expect(isoParaCamposBrasilia("2026-08-02T14:00")).toEqual({ data: "2026-08-02", hora: "14:00" });
  });

  it("vazio, nulo ou ilegível volta com os dois campos vazios", () => {
    const vazio = { data: "", hora: "" };
    expect(isoParaCamposBrasilia("")).toEqual(vazio);
    expect(isoParaCamposBrasilia("   ")).toEqual(vazio);
    expect(isoParaCamposBrasilia(null)).toEqual(vazio);
    expect(isoParaCamposBrasilia(undefined)).toEqual(vazio);
    expect(isoParaCamposBrasilia("sábado à noite")).toEqual(vazio);
    expect(isoParaCamposBrasilia("2026-02-30")).toEqual(vazio);
    expect(isoParaCamposBrasilia("2026-11-28T25:00:00-03:00")).toEqual(vazio);
  });
});

describe("camposBrasiliaParaIso", () => {
  it("com horário grava o ISO de Brasília com -03:00", () => {
    expect(camposBrasiliaParaIso("2026-11-29", "08:30")).toBe("2026-11-29T08:30:00-03:00");
    expect(camposBrasiliaParaIso("2026-11-28", "19:00:00")).toBe("2026-11-28T19:00:00-03:00");
  });

  it("sem horário grava só a data, como o campo antigo", () => {
    expect(camposBrasiliaParaIso("2026-11-28", "")).toBe("2026-11-28");
    expect(camposBrasiliaParaIso("2026-11-28", "  ")).toBe("2026-11-28");
  });

  it("data vazia/ilegível ou horário ilegível não grava (undefined)", () => {
    expect(camposBrasiliaParaIso("", "19:00")).toBeUndefined();
    expect(camposBrasiliaParaIso("", "")).toBeUndefined();
    expect(camposBrasiliaParaIso("2026-02-30", "10:00")).toBeUndefined();
    expect(camposBrasiliaParaIso("2026-11-28", "7")).toBeUndefined();
    expect(camposBrasiliaParaIso("2026-11-28", "24:00")).toBeUndefined();
  });

  it("ida e volta não anda: todos os horários do calendário oficial voltam idênticos", () => {
    // O oficial (vazio enquanto as datas não saem) e as grades de teste, de 6 e de 8 times.
    const slots = [...CALENDARIO_4A, ...CALENDARIO_6_TIMES_DE_20_10.slots, ...calendarioDe8TimesDeTeste().slots];
    expect(slots.length).toBeGreaterThan(40);
    for (const slot of slots) {
      const { data, hora } = isoParaCamposBrasilia(slot.quando);
      expect(camposBrasiliaParaIso(data, hora)).toBe(slot.quando);
    }
  });

  it("ida e volta de um instante em Z mantém o MESMO instante (não anda 3 horas)", () => {
    const original = "2026-11-29T17:30:00.000Z";
    const { data, hora } = isoParaCamposBrasilia(original);
    const regravado = camposBrasiliaParaIso(data, hora);
    expect(regravado).toBe("2026-11-29T14:30:00-03:00");
    expect(new Date(regravado as string).getTime()).toBe(new Date(original).getTime());
  });
});

describe("createBlankSeries", () => {
  it("nasce com a data de hoje SEM hora, fase regular e o formato do torneio", () => {
    const nova = createBlankSeries("BO3", new Date("2026-11-20T15:00:00Z"));
    expect(nova.date).toBe("2026-11-20");
    expect(nova.stage).toBe("REGULAR_SEASON");
    expect(nova.format).toBe("BO3");
    expect(nova.games).toEqual([]);
    expect(createBlankSeries("BO5").format).toBe("BO5");
    expect(createBlankSeries().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("'hoje' é o dia de Brasília: 23:30 de sexta em Brasília ainda é sexta", () => {
    // 02:30Z de sábado = 23:30 de sexta em Brasília.
    expect(dataDeHojeEmBrasilia(new Date("2026-11-21T02:30:00Z"))).toBe("2026-11-20");
    expect(createBlankSeries("BO3", new Date("2026-11-21T02:30:00Z")).date).toBe("2026-11-20");
  });
});

// ---------------------------------------------------------------- etapa, formato e avisos

describe("formatoDaEtapa", () => {
  it("só a final é MD5", () => {
    expect(formatoDaEtapa("FINAL")).toBe("BO5");
    expect(formatoDaEtapa("SEMIFINAL")).toBe("BO3");
    expect(formatoDaEtapa("REGULAR_SEASON")).toBe("BO3");
  });
});

describe("auditarSerie: avisos de etapa e formato", () => {
  it("FINAL que não é MD5 gera aviso (e não bloqueio)", () => {
    const final = serie({ id: "final", stage: "FINAL", format: "BO3" });
    const auditoria = auditarSerie(final, dataset([final]));
    expect(auditoria.avisos.join(" ")).toMatch(/Final em MD3/);
    expect(auditoria.bloqueios).toEqual([]);

    const certa = serie({ id: "final", stage: "FINAL", format: "BO5" });
    expect(auditarSerie(certa, dataset([certa])).avisos).toEqual([]);
  });

  it("FINAL sem formato próprio herda o MD3 do torneio e também é avisada", () => {
    const final = serie({ id: "final", stage: "FINAL" });
    expect(auditarSerie(final, dataset([final])).avisos.join(" ")).toMatch(/Final em MD3/);
  });

  it("SEMIFINAL que não é MD3 gera aviso", () => {
    const semi = serie({ id: "semi", stage: "SEMIFINAL", format: "BO5" });
    expect(auditarSerie(semi, dataset([semi])).avisos.join(" ")).toMatch(/Semifinal em MD5/);

    const certa = serie({ id: "semi", stage: "SEMIFINAL", format: "BO3" });
    expect(auditarSerie(certa, dataset([certa])).avisos).toEqual([]);
  });

  it("o mesmo confronto duas vezes na Fase regular avisa nas duas séries, em qualquer ordem de times", () => {
    const turno = serie({ id: "turno", date: "2026-11-21T08:30:00-03:00", teamAId: "alfa", teamBId: "beta" });
    const esquecida = serie({ id: "esquecida", date: "2026-11-29T08:30:00-03:00", teamAId: "beta", teamBId: "alfa" });
    const d = dataset([turno, esquecida]);

    const aviso = auditarSerie(esquecida, d).avisos.join(" ");
    expect(aviso).toMatch(/já tem outra série de Fase regular/);
    expect(aviso).toMatch(/3 ponto/);
    expect(auditarSerie(turno, d).avisos.join(" ")).toMatch(/já tem outra série de Fase regular/);
    expect(auditarSerie(esquecida, d).bloqueios).toEqual([]);
  });

  it("vale para W.O. também (W.O. de Fase regular soma pontos igual)", () => {
    const turno = serie({ id: "turno", teamAId: "alfa", teamBId: "beta" });
    const wo = serie({ id: "wo", teamAId: "alfa", teamBId: "beta", walkoverWinnerTeamId: "alfa" });
    expect(auditarSerie(wo, dataset([turno, wo])).avisos.join(" ")).toMatch(/já tem outra série de Fase regular/);
  });

  it("não avisa o que está certo: confrontos diferentes, ou o mesmo par já como semifinal", () => {
    const ab = serie({ id: "ab", teamAId: "alfa", teamBId: "beta" });
    const ag = serie({ id: "ag", teamAId: "alfa", teamBId: "gama" });
    const semi = serie({ id: "semi", teamAId: "beta", teamBId: "alfa", stage: "SEMIFINAL", format: "BO3" });
    const d = dataset([ab, ag, semi]);
    expect(auditarSerie(ab, d).avisos).toEqual([]);
    expect(auditarSerie(ag, d).avisos).toEqual([]);
    expect(auditarSerie(semi, d).avisos).toEqual([]);
  });

  it("série sem os dois times escolhidos não compara confronto", () => {
    const a = serie({ id: "a", teamAId: "", teamBId: "" });
    const b = serie({ id: "b", teamAId: "", teamBId: "" });
    expect(auditarSerie(a, dataset([a, b])).avisos).toEqual([]);
  });
});

// ---------------------------------------------------------------- cartinhas retiradas

describe("opcoesDeCartinha", () => {
  const yuumi = (opcoes: ReturnType<typeof opcoesDeCartinha>) =>
    opcoes.find((opcao) => opcao.id === "INVASAO_YUUMI");

  it("desabilita a carta retirada numa linha que usa outra carta", () => {
    const opcoes = opcoesDeCartinha("ABCDRAFT");
    expect(yuumi(opcoes)?.disabled).toBe(true);
    expect(opcoes.filter((opcao) => opcao.disabled).map((opcao) => opcao.id)).toEqual(["INVASAO_YUUMI"]);
  });

  it("mantém habilitada a retirada que JÁ está gravada naquela linha (histórico da 3ª)", () => {
    expect(yuumi(opcoesDeCartinha("INVASAO_YUUMI"))?.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------- o painel de verdade

describe("painel de Séries", () => {
  it("mostra data e horário de Brasília da série (render estático)", () => {
    const s = serie({ id: "semi-1", stage: "SEMIFINAL", format: "BO3", date: "2026-11-29T11:30:00.000Z" });
    const html = renderToStaticMarkup(
      <AdminSeriesPanel
        draft={dataset([s])}
        mutateDraft={() => {}}
        aplicarDoServidor={() => {}}
        onVersaoDoServidor={() => {}}
      />,
    );
    // A lista mostra a hora de Brasília (08:30), não a de Londres (11:30).
    expect(html).toMatch(/08:30/);
    expect(html).not.toMatch(/11:30/);
  });

  it("editar a DATA de uma série com hora mantém a hora (remarcar para a reserva)", () => {
    const { atual } = montar(dataset([serie({ id: "remarcar", date: "2026-11-21T15:30:00-03:00" })]));
    abrir("Alfa", "Beta");

    const data = screen.getByLabelText("Data da série") as HTMLInputElement;
    const hora = screen.getByLabelText("Horário da série (Brasília)") as HTMLInputElement;
    expect(data.value).toBe("2026-11-21");
    expect(hora.value).toBe("15:30");

    fireEvent.change(data, { target: { value: "2026-11-28" } });
    expect(atual().seriesMatches[0].date).toBe("2026-11-28T15:30:00-03:00");

    fireEvent.change(hora, { target: { value: "19:00" } });
    expect(atual().seriesMatches[0].date).toBe("2026-11-28T19:00:00-03:00");
  });

  it("série só com data: horário vazio, e preencher o horário grava -03:00", () => {
    const { atual } = montar(dataset([serie({ id: "so-data", date: "2026-11-29" })]));
    abrir("Alfa", "Beta");

    const hora = screen.getByLabelText("Horário da série (Brasília)") as HTMLInputElement;
    expect((screen.getByLabelText("Data da série") as HTMLInputElement).value).toBe("2026-11-29");
    expect(hora.value).toBe("");

    fireEvent.change(hora, { target: { value: "14:30" } });
    expect(atual().seriesMatches[0].date).toBe("2026-11-29T14:30:00-03:00");

    // Apagar o horário volta a ser "só a data" — estado válido, não erro.
    fireEvent.change(hora, { target: { value: "" } });
    expect(atual().seriesMatches[0].date).toBe("2026-11-29");
  });

  it("apagar a data não grava texto vazio (o schema recusaria o painel inteiro)", () => {
    const { atual } = montar(dataset([serie({ id: "sem-apagar", date: "2026-11-28T19:00:00-03:00" })]));
    abrir("Alfa", "Beta");

    fireEvent.change(screen.getByLabelText("Data da série"), { target: { value: "" } });
    expect(atual().seriesMatches[0].date).toBe("2026-11-28T19:00:00-03:00");
  });

  it("Etapa = Final vira MD5; Semifinal e Fase regular voltam para MD3", () => {
    const { atual } = montar(dataset([serie({ id: "decisao", stage: "REGULAR_SEASON", format: "BO3" })]));
    abrir("Alfa", "Beta");

    const etapa = screen.getByRole("combobox", { name: "Etapa" });
    fireEvent.change(etapa, { target: { value: "FINAL" } });
    expect(atual().seriesMatches[0]).toMatchObject({ stage: "FINAL", format: "BO5" });

    fireEvent.change(etapa, { target: { value: "SEMIFINAL" } });
    expect(atual().seriesMatches[0]).toMatchObject({ stage: "SEMIFINAL", format: "BO3" });

    fireEvent.change(etapa, { target: { value: "FINAL" } });
    fireEvent.change(etapa, { target: { value: "REGULAR_SEASON" } });
    expect(atual().seriesMatches[0]).toMatchObject({ stage: "REGULAR_SEASON", format: "BO3" });

    // O formato continua editável depois da etapa.
    fireEvent.change(screen.getByRole("combobox", { name: "Formato da série" }), { target: { value: "BO5" } });
    expect(atual().seriesMatches[0]).toMatchObject({ stage: "REGULAR_SEASON", format: "BO5" });
  });

  it("trocar a etapa que cortaria jogos pergunta antes e, sem confirmação, não muda nada", () => {
    const confirmar = vi.fn(() => false);
    vi.stubGlobal("confirm", confirmar);
    const final = serie({
      id: "final-longa",
      stage: "FINAL",
      format: "BO5",
      games: [jogo("alfa"), jogo("beta"), jogo("alfa"), jogo("beta")],
    });
    const { atual } = montar(dataset([final]));
    abrir("Alfa", "Beta");

    fireEvent.change(screen.getByRole("combobox", { name: "Etapa" }), { target: { value: "SEMIFINAL" } });
    expect(confirmar).toHaveBeenCalledOnce();
    expect(atual().seriesMatches[0]).toMatchObject({ stage: "FINAL", format: "BO5" });
    expect(atual().seriesMatches[0].games).toHaveLength(4);
  });

  it("mostra o aviso de FINAL em MD3 no editor", () => {
    montar(dataset([serie({ id: "final-md3", stage: "FINAL", format: "BO3" })]));
    abrir("Alfa", "Beta");
    expect(screen.getByText(/Confira esta série/)).toBeTruthy();
    expect(screen.getByText(/Final em MD3/)).toBeTruthy();
  });

  it("no select de cartinha a Yuumi só fica habilitada na linha que já a tem", () => {
    montar(
      dataset([
        serie({
          id: "terceira",
          date: "2026-07-20",
          cardsUsed: [
            { teamId: "alfa", cardId: "INVASAO_YUUMI" },
            { teamId: "beta", cardId: "ABCDRAFT" },
          ],
        }),
      ]),
    );
    abrir("Alfa", "Beta");

    const opcaoYuumi = (select: HTMLElement) =>
      within(select)
        .getAllByRole("option", { hidden: true })
        .find((opcao) => (opcao as HTMLOptionElement).value === "INVASAO_YUUMI") as HTMLOptionElement;

    const linha1 = screen.getByRole("combobox", { name: "Cartinha 1" }) as HTMLSelectElement;
    const linha2 = screen.getByRole("combobox", { name: "Cartinha 2" }) as HTMLSelectElement;
    expect(linha1.value).toBe("INVASAO_YUUMI");
    expect(opcaoYuumi(linha1).disabled).toBe(false);
    expect(opcaoYuumi(linha2).disabled).toBe(true);
  });

  it("cartinha nova nasce com carta em vigor, nunca a retirada", () => {
    const { atual } = montar(dataset([serie({ id: "carta-nova" })]));
    abrir("Alfa", "Beta");
    fireEvent.click(screen.getByRole("button", { name: /Cartinha$/ }));
    expect(atual().seriesMatches[0].cardsUsed?.[0].cardId).not.toBe("INVASAO_YUUMI");
  });
});
