import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { CalendarioDa4a, ResumoDoCalendario4a, rotuloDoDia } from "@/components/calendario-4a";
import {
  CALENDARIO_4A,
  calendarioOficial,
  TIMES_DO_CALENDARIO_4A,
  calendarioAindaPorVir,
  calendarioDivulgado,
  calendarioEDestaTemporada,
  calendarioPorVirOuADivulgar,
  diasDoCalendario4a,
  idDaSerieDoCalendario,
  periodoDoCalendario,
  periodoDoCalendarioFuturo,
  problemasDaGrade,
  seriesDaEdicaoCom,
  seriesDaFaseDePontos,
  seriesDePontosCom,
  seriesNoCalendario4a,
  slotsDoCalendario,
  turnoDoSlot,
  type CalendarioDaEdicao,
  type SlotDoCalendario,
} from "@/lib/calendario-4a";
import { CALENDARIO_OFICIAL_4A } from "@/lib/calendario-4a-grade";
import { MESSAGES } from "@/lib/i18n/messages";
import { periodoPorExtenso } from "@/lib/i18n/messages/paginas-home";
import { seriesMatchSchema } from "@/lib/schema";

import { CALENDARIO_6_TIMES_DE_20_10, calendarioDe8TimesDeTeste } from "./_calendarios";

/**
 * O calendário da 4ª Edição (lib/calendario-4a.ts + lib/calendario-4a-grade.ts).
 *
 * Desde 2026-10-22 a 4ª tem 8 times e as datas estão "a divulgar". Este arquivo trava as
 * duas pontas: o site dizendo a verdade enquanto a grade não sai, e a grade de 8 times —
 * de teste, por enquanto; a oficial, assim que for preenchida — fechando a conta.
 */

const cal8 = calendarioDe8TimesDeTeste();
const pontosDe = (cal: CalendarioDaEdicao) => slotsDoCalendario(cal).filter((s) => s.tipo === "pontos");

describe("o calendário oficial da 4ª: 8 times", () => {
  it("8 times = 28 séries de pontos + 2 semifinais + a final = 31", () => {
    expect(TIMES_DO_CALENDARIO_4A).toBe(8);
    expect(CALENDARIO_OFICIAL_4A.times).toBe(8);
    expect(seriesDePontosCom(8)).toBe(28);
    expect(seriesDaEdicaoCom(8)).toBe(31);
    // A conta vale para os outros tamanhos que a organização já cogitou.
    expect([5, 6, 7].map(seriesDePontosCom)).toEqual([10, 15, 21]);
  });

  it("a grade oficial não tem problema nenhum (vazia enquanto a divulgar; completa depois)", () => {
    expect(problemasDaGrade(calendarioOficial())).toEqual([]);
  });

  it("a introdução de /regras e /calendario diz o formato que a grade tem que ter", () => {
    const n = TIMES_DO_CALENDARIO_4A;
    expect(MESSAGES.pt.calendario4a.intro).toContain(`${n} times e ${seriesDaEdicaoCom(n)} séries: ${seriesDePontosCom(n)} de pontos corridos`);
    expect(MESSAGES.en.calendario4a.intro).toContain(`${n} teams and ${seriesDaEdicaoCom(n)} series: ${seriesDePontosCom(n)} in the round robin`);
    if (calendarioDivulgado()) expect(seriesNoCalendario4a()).toBe(seriesDaEdicaoCom(n));
  });
});

describe.runIf(!calendarioDivulgado())("enquanto as datas não saem: «a divulgar», explícito", () => {
  it("o estado é `divulgado: false`, e não uma lista vazia por engano", () => {
    expect(CALENDARIO_OFICIAL_4A.divulgado).toBe(false);
    expect("slots" in CALENDARIO_OFICIAL_4A).toBe(false);
    expect(CALENDARIO_4A).toEqual([]);
  });

  it("sem dias, sem período, sem séries — e nada é 'desta temporada'", () => {
    const agora = Date.parse("2026-11-15T12:00:00-03:00");
    expect(diasDoCalendario4a()).toEqual([]);
    expect(periodoDoCalendario()).toBeNull();
    expect(periodoDoCalendarioFuturo(agora)).toBeNull();
    expect(calendarioAindaPorVir(agora)).toBe(false);
    expect(seriesNoCalendario4a()).toBe(0);
    expect(calendarioEDestaTemporada([], agora)).toBe(false);
    expect(calendarioEDestaTemporada(["2026-11-20"], agora)).toBe(false);
    // Mas a pré-temporada ainda fala dele: as datas são desta edição, só não saíram.
    expect(calendarioPorVirOuADivulgar(agora)).toBe(true);
  });

  it("criar as séries recusa, dizendo por quê", () => {
    const times = Array.from({ length: 8 }, (_, i) => `t${i + 1}`);
    expect(() => seriesDaFaseDePontos(times)).toThrow(/calendário de 8 times ainda não foi definido/);
    expect(() => seriesDaFaseDePontos(times)).toThrow(/28 séries da fase de pontos/);
  });
});

describe.runIf(calendarioDivulgado())("a grade oficial divulgada", () => {
  it("é de 8 times, cada par uma vez, e dá as séries do sorteio", () => {
    expect(calendarioOficial().times).toBe(TIMES_DO_CALENDARIO_4A);
    const times = Array.from({ length: TIMES_DO_CALENDARIO_4A }, (_, i) => `t${i + 1}`);
    const series = seriesDaFaseDePontos(times);
    expect(series).toHaveLength(seriesDePontosCom(TIMES_DO_CALENDARIO_4A));
    for (const s of series) expect(seriesMatchSchema.safeParse(s).success).toBe(true);
  });
});

describe("a grade de 8 times (a de teste — o formato da que vai chegar)", () => {
  it("fecha: nenhum problema na conferência", () => {
    expect(problemasDaGrade(cal8)).toEqual([]);
    expect(calendarioDivulgado(cal8)).toBe(true);
  });

  it("todos contra todos, uma vez: os 28 pares de 1..8, cada um exatamente uma vez", () => {
    const pontos = pontosDe(cal8);
    expect(pontos).toHaveLength(28);
    const pares = pontos.map((s) => [...s.confronto!].sort((a, b) => a - b).join("x"));
    expect(new Set(pares).size).toBe(28);
    for (let a = 1; a <= 8; a++) for (let b = a + 1; b <= 8; b++) expect(pares).toContain(`${a}x${b}`);
    const posicoes = new Set(pontos.flatMap((s) => [...s.confronto!]));
    expect([...posicoes].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("cada time joga 7 séries na fase de pontos", () => {
    const jogos = new Map<number, number>();
    for (const s of pontosDe(cal8)) for (const t of s.confronto!) jogos.set(t, (jogos.get(t) ?? 0) + 1);
    expect([...jogos.entries()].sort((x, y) => x[0] - y[0])).toEqual(Array.from({ length: 8 }, (_, i) => [i + 1, 7]));
  });

  it("31 séries de verdade (fora a reserva); final em MD5, o resto em MD3", () => {
    expect(seriesNoCalendario4a(cal8)).toBe(31);
    const slots = slotsDoCalendario(cal8);
    expect(slots.find((s) => s.tipo === "final")?.formato).toBe("BO5");
    for (const s of slots.filter((x) => x.tipo === "pontos" || x.tipo === "semifinal")) expect(s.formato).toBe("BO3");
  });

  it("as séries do sorteio: Time N vira o N-ésimo da lista, com data, MD3 e fase regular", () => {
    const times = ["chama", "aurea", "verdante", "gelida", "arcana", "carmesim", "mare", "seiva"];
    const series = seriesDaFaseDePontos(times, cal8);
    expect(series).toHaveLength(28);
    const primeiro = pontosDe(cal8)[0]!;
    expect(series[0]).toMatchObject({
      id: idDaSerieDoCalendario(1),
      date: primeiro.quando,
      teamAId: times[primeiro.confronto![0] - 1],
      teamBId: times[primeiro.confronto![1] - 1],
      format: "BO3",
      stage: "REGULAR_SEASON",
      games: [],
    });
    expect(series.map((s) => s.id)).toEqual(Array.from({ length: 28 }, (_, i) => idDaSerieDoCalendario(i + 1)));
    for (const s of series) expect(seriesMatchSchema.safeParse(s).success).toBe(true);
    // Os 8 times jogam 7 séries cada.
    const contagem = new Map<string, number>();
    for (const s of series) for (const t of [s.teamAId, s.teamBId]) contagem.set(t, (contagem.get(t) ?? 0) + 1);
    expect([...contagem.values()]).toEqual(Array(8).fill(7));
  });

  it("recusa número de times diferente de 8 e time repetido", () => {
    const times = ["a", "b", "c", "d", "e", "f", "g", "h"];
    expect(() => seriesDaFaseDePontos(times.slice(0, 6), cal8)).toThrow(/8 times; vieram 6/);
    expect(() => seriesDaFaseDePontos([...times.slice(0, 7), "a"], cal8)).toThrow(/duas posições/);
  });

  it("os dias se agrupam em fins de semana pela semana (aqui, quatro)", () => {
    const dias = diasDoCalendario4a(cal8);
    expect([...new Set(dias.map((d) => d.fimDeSemana))]).toEqual([1, 2, 3, 4]);
    expect(dias.filter((d) => d.fimDeSemana === 1).map((d) => d.dia)).toEqual(["2026-11-20", "2026-11-21", "2026-11-22"]);
    expect(dias.at(-1)).toMatchObject({ dia: "2026-12-13", fimDeSemana: 4 });
  });

  it("período, 'por vir' e 'desta temporada' saem da grade", () => {
    expect(periodoDoCalendario(cal8)).toEqual({ inicio: "2026-11-20", fim: "2026-12-13" });
    const antes = Date.parse("2026-11-01T12:00:00-03:00");
    const depois = Date.parse("2026-12-20T12:00:00-03:00");
    expect(calendarioAindaPorVir(antes, cal8)).toBe(true);
    expect(calendarioAindaPorVir(depois, cal8)).toBe(false);
    expect(calendarioPorVirOuADivulgar(depois, cal8)).toBe(false);
    expect(periodoDoCalendarioFuturo(antes, cal8)).toEqual({ inicio: "2026-11-20", fim: "2026-12-13" });
    expect(calendarioEDestaTemporada(["2026-11-21"], depois, cal8)).toBe(true);
    expect(calendarioEDestaTemporada(["2027-03-01"], depois, cal8)).toBe(false);
  });
});

describe("a conferência da grade (problemasDaGrade) pega o erro de quem preenche", () => {
  const base = slotsDoCalendario(cal8);
  const com = (slots: readonly SlotDoCalendario[]): CalendarioDaEdicao => ({ divulgado: true, times: 8, slots });

  it("par faltando e par repetido", () => {
    const pontos = base.filter((s) => s.tipo === "pontos");
    const repetido = base.map((s) => (s === pontos[1] ? { ...s, confronto: pontos[0]!.confronto } : s));
    const problemas = problemasDaGrade(com(repetido));
    expect(problemas.some((p) => p.startsWith("Falta o confronto"))).toBe(true);
    expect(problemas.some((p) => p.includes("aparece 2 vezes"))).toBe(true);
  });

  it("posição fora de 1..8, e time contra ele mesmo", () => {
    const pontos = base.filter((s) => s.tipo === "pontos");
    const fora = base.map((s) => (s === pontos[0] ? { ...s, confronto: [1, 9] as const } : s));
    expect(problemasDaGrade(com(fora)).join(" ")).toMatch(/1 x 9 \(as posições vão de 1 a 8\)/);
    const mesmo = base.map((s) => (s === pontos[0] ? { ...s, confronto: [3, 3] as const } : s));
    expect(problemasDaGrade(com(mesmo)).join(" ")).toMatch(/3 x 3/);
  });

  it("formato errado, fuso faltando, sem reserva, semifinal antes da fase de pontos acabar", () => {
    const finalMd3 = base.map((s) => (s.tipo === "final" ? { ...s, formato: "BO3" as const } : s));
    expect(problemasDaGrade(com(finalMd3)).join(" ")).toMatch(/final .* é em MD5/);

    const semFuso = base.map((s, i) => (i === 0 ? { ...s, quando: s.quando.replace("-03:00", "Z") } : s));
    expect(problemasDaGrade(com(semFuso)).join(" ")).toMatch(/fora do formato/);

    expect(problemasDaGrade(com(base.filter((s) => s.tipo !== "reserva"))).join(" ")).toMatch(/regra 9/);

    const semiCedo = base.map((s) => (s.tipo === "semifinal" && s.semifinal === 1 ? { ...s, quando: "2026-11-20T08:00:00-03:00" } : s));
    expect(problemasDaGrade(com(semiCedo)).join(" ")).toMatch(/semifinal está antes do último jogo/);
  });

  it("o calendário de 6 times de 20/10 também fecha — a conferência não é feita só para a grade de teste", () => {
    expect(problemasDaGrade(CALENDARIO_6_TIMES_DE_20_10)).toEqual([]);
    expect(seriesNoCalendario4a(CALENDARIO_6_TIMES_DE_20_10)).toBe(18);
    expect(diasDoCalendario4a(CALENDARIO_6_TIMES_DE_20_10).map((d) => `${d.dia.slice(8)}:${d.fimDeSemana}`)).toEqual([
      "20:1",
      "21:1",
      "22:1",
      "27:2",
      "28:2",
      "29:2",
    ]);
  });
});

describe("turno e rótulo do dia", () => {
  it("turno com as mesmas fronteiras de lib/calendar (antes das 13h manhã, antes das 18h tarde)", () => {
    expect(turnoDoSlot({ quando: "2026-11-21T08:30:00-03:00" })).toBe("manha");
    expect(turnoDoSlot({ quando: "2026-11-22T13:00:00-03:00" })).toBe("tarde");
    expect(turnoDoSlot({ quando: "2026-11-28T19:00:00-03:00" })).toBe("noite");
  });

  it("o dia da semana é o de Brasília, nos dois idiomas", () => {
    expect(rotuloDoDia("2026-11-20", MESSAGES.pt.calendario4a, "pt-BR")).toEqual({ semana: "SEXTA", data: "20/11" });
    expect(rotuloDoDia("2026-11-21", MESSAGES.en.calendario4a, "en-US")).toEqual({ semana: "SATURDAY", data: "NOV 21" });
  });
});

describe("o componente, com as datas a divulgar", () => {
  const sem = { divulgado: false, times: 8 } as const;

  it("mostra o formato de 8 times e «a divulgar» — nada de grade, de data nem de 6 times", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" calendario={sem} />);
    expect(html).toContain('data-calendario="a-divulgar"');
    expect(html).toContain("A DIVULGAR");
    expect(html).toContain("Datas e horários dos jogos a divulgar");
    expect(html).toContain("8 times de 5 jogadores (40 vagas)");
    expect(html).toContain("Todos contra todos, uma vez: 28 séries em MD3.");
    expect(html).toContain("1º x 4º e 2º x 3º colocados, em MD3.");
    expect(html).toContain("Os vencedores das semifinais, em MD5.");
    expect(html).toContain("Time 1 a Time 8");
    expect(html).not.toMatch(/\d{2}\/\d{2}|novembro|FIM DE SEMANA|Time 3 x Time 6|Time 6\b|15 séries|18 séries|30 vagas/);
    expect(html).not.toMatch(/opacity\s*:\s*0/);
  });

  it("o calendário oficial, hoje, cai nesse mesmo bloco", () => {
    const oficial = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" />);
    if (!calendarioDivulgado()) expect(oficial).toContain('data-calendario="a-divulgar"');
    else expect(oficial).toContain('data-calendario="divulgado"');
  });

  it("em inglês, sem sobra de português", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.en.calendario4a} localeTag="en-US" calendario={sem} />);
    expect(html).toContain("TO BE ANNOUNCED");
    expect(html).toContain("8 teams of 5 players (40 places)");
    expect(html).toContain("Everyone plays everyone once: 28 Bo3 series.");
    expect(html).toContain("Team 1 to Team 8");
    expect(html).not.toMatch(/jogadores|séries|DIVULGAR|Time 1/);
  });

  it("o resumo da home também: o bloco do «a divulgar», sem fichas de dia e sem levar a um calendário vazio", () => {
    const html = renderToStaticMarkup(<ResumoDoCalendario4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" calendario={sem} />);
    expect(html).toContain('data-calendario="a-divulgar"');
    expect(html).not.toMatch(/\d+ jogos?\b|semis \+ final/);
    expect(html).not.toContain('href="/calendario"');
  });
});

describe("o componente, com uma grade de 8 times", () => {
  it("mostra os confrontos por posição, os fins de semana, as finais e as notas da grade", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" calendario={cal8} />);
    expect(html).toContain('data-calendario="divulgado"');
    // Primeira rodada do círculo: 1x8, 2x7, 3x6, 4x5.
    expect(html).toContain("Time 1 x Time 8");
    expect(html).toContain("Time 4 x Time 5");
    for (const n of [1, 2, 3, 4]) expect(html).toContain(`${n}º FIM DE SEMANA`);
    expect(html).toContain("Semifinal: 1º x 4º colocados");
    expect(html).toContain("Semifinal: 2º x 3º colocados");
    expect(html).toContain("FINAL em MD5");
    expect(html).toContain("Time 1 a Time 8 são posições");
    // A nota da reserva diz o dia e a hora DA GRADE — nada fica escrito à mão.
    expect(html).toContain("A reserva de sábado, 05/12, às 19:00, fica vaga para remarcar imprevistos.");
    expect(html).toContain("Se o jogo das 20:00 passar do horário, este começa assim que ele acabar.");
    expect(html).toContain("nunca começam antes da hora marcada");
    expect(html).not.toContain("Time 9");
    expect(html).not.toMatch(/opacity\s*:\s*0/);
  });

  it("em inglês", () => {
    const html = renderToStaticMarkup(<CalendarioDa4a t={MESSAGES.en.calendario4a} localeTag="en-US" calendario={cal8} />);
    expect(html).toContain("Team 1 v Team 8");
    expect(html).toContain("WEEKEND 4");
    expect(html).toContain("FRIDAY");
    expect(html).toContain("The reserve slot on Saturday, Dec 5, at 19:00");
    expect(html).not.toMatch(/SEXTA|FIM DE SEMANA|Time \d/);
  });

  it("o resumo da home lista os dias e leva ao calendário", () => {
    const html = renderToStaticMarkup(<ResumoDoCalendario4a t={MESSAGES.pt.calendario4a} localeTag="pt-BR" calendario={cal8} />);
    expect(html).toContain("2 jogos");
    expect(html).toContain("5 jogos");
    expect(html).toContain("1 jogo");
    expect(html).toContain("semis + final");
    expect(html).toContain('href="/calendario"');
  });

  it("o calendário de 6 times (cenário) continua desenhando como antes", () => {
    const html = renderToStaticMarkup(
      <CalendarioDa4a t={MESSAGES.en.calendario4a} localeTag="en-US" calendario={CALENDARIO_6_TIMES_DE_20_10} />,
    );
    expect(html).toContain("Team 3 v Team 6");
    expect(html).toContain("Bo5 FINAL");
    expect(html).toContain("WEEKEND 2");
    expect(html).toContain("If the 21:00 game runs over, this one starts as soon as it ends.");
  });
});

describe("as frases FIXAS que dependem do calendário", () => {
  // Elas não saem da grade (são lidas direto por páginas e formulários): este bloco diz qual
  // ficou velha quando a grade mudar de estado.
  const pt = MESSAGES.pt;
  const en = MESSAGES.en;
  const n = TIMES_DO_CALENDARIO_4A;
  const DATA = /\d{1,2}\/\d{1,2}|\d{1,2} (de )?(novembro|dezembro)|(November|December|Nov|Dec) \d|\d{1,2} (to|a) \d{1,2}/i;

  it("o número de times do regulamento é o do calendário", () => {
    expect(pt.paginasRegras.capitaes3).toContain(`${n} nesta edição`);
    expect(en.paginasRegras.capitaes3).toContain(`${n} in this edition`);
    expect(pt.paginasRegras.inscricaoReservasTexto).toContain(`${n} times de 5 jogadores (${n * 5} vagas)`);
    expect(en.paginasRegras.inscricaoReservasTexto).toContain(`${n} teams of 5 players (${n * 5} places)`);
    // Desde 24/10/2026 o time dos organizadores já entra formado e fica fora da ordem de escolha,
    // e a ordem é 1→(n − 1) em todas as rodadas (decisão da hora do draft, no lugar da serpentina).
    const noDraft = n - 1;
    const ida = Array.from({ length: noDraft }, (_, i) => i + 1).join("-");
    expect(pt.paginasRegras.draft4).toContain(`do 1º ao ${noDraft}º time do draft (${ida}, e repete)`);
    expect(en.paginasRegras.draft4).toContain(`from the 1st to the ${noDraft}th drafting team (${ida}, then again)`);
  });

  it.runIf(!calendarioDivulgado())("sem a grade, nenhuma delas crava data — e dizem que as datas vão sair", () => {
    for (const [nome, texto] of [
      ["paginasRegras.fichaPeriodoV (pt)", pt.paginasRegras.fichaPeriodoV],
      ["paginasRegras.fichaPeriodoV (en)", en.paginasRegras.fichaPeriodoV],
      ["inscricao.disponibilidadeAjuda (pt)", pt.inscricao.disponibilidadeAjuda],
      ["inscricao.disponibilidadeAjuda (en)", en.inscricao.disponibilidadeAjuda],
      ["paginasRegras.inscricaoCampo5 (pt)", pt.paginasRegras.inscricaoCampo5],
      ["preTemporada.passo5TextoSemData (pt)", pt.preTemporada.passo5TextoSemData],
      ["preTemporada.passo5TextoSemData (en)", en.preTemporada.passo5TextoSemData],
    ] as const) {
      expect(texto, nome).not.toMatch(DATA);
    }
    expect(pt.paginasRegras.fichaPeriodoV).toMatch(/a divulgar/i);
    expect(en.paginasRegras.fichaPeriodoV).toMatch(/to be announced/i);
    expect(pt.inscricao.disponibilidadeAjuda).toMatch(/assim que a organização fechar as datas/);
    expect(en.inscricao.disponibilidadeAjuda).toMatch(/as soon as the organisers set the dates/);
  });

  it.runIf(calendarioDivulgado())("com a grade, /regras e o formulário citam o período dela", () => {
    const periodo = periodoDoCalendario()!;
    const ptPeriodo = periodoPorExtenso(pt.paginasHome, periodo.inicio, periodo.fim, "pt-BR");
    expect(pt.paginasRegras.fichaPeriodoV.toLowerCase()).toContain(ptPeriodo.replace(/^de /, ""));
    expect(pt.inscricao.disponibilidadeAjuda).not.toMatch(/assim que a organização fechar as datas/);
    expect(en.inscricao.disponibilidadeAjuda).not.toMatch(/as soon as the organisers set the dates/);
  });

  it("o passo 5 da home é molde: o número de times e o período vêm de fora", () => {
    for (const m of [pt, en]) {
      expect(m.preTemporada.passo5Texto).toContain("{times}");
      expect(m.preTemporada.passo5Texto).toContain("{periodo}");
      expect(m.preTemporada.passo5TextoSemData).toContain("{times}");
      expect(m.preTemporada.passo5TextoSemData).not.toContain("{periodo}");
    }
  });

  it("nenhum texto público do calendário, da home ou das regras ainda fala de 6 times", () => {
    const blocos = (m: typeof pt) => ({
      ...m.calendario4a,
      ...m.preTemporada,
      ...m.paginasRegras,
      ...m.conformidade,
      disponibilidadeAjuda: m.inscricao.disponibilidadeAjuda,
    });
    for (const m of [pt, en]) {
      for (const [chave, valor] of Object.entries(blocos(m))) {
        expect(String(valor), chave).not.toMatch(/\b6 (times|teams)\b|\b30 (vagas|places|jogadores|players)\b|\b(15|18) (séries|series)\b|Time 6\b|Team 6\b|1-2-3-4-5-6-6/);
      }
    }
  });
});
