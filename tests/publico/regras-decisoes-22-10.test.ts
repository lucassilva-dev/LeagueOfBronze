// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O regulamento publicado (/regras) com as decisões de 22/10/2026, em português E em inglês:
 *
 *  - regra 4: remake não conta;
 *  - regra 6: substituto avulso por jogo; saída de vez = um reserva herda a vaga; capitão que
 *    sai = a organização escolhe outro do time;
 *  - regra 8 (e 19, e a pontuação): W.O. no meio da série — os jogos valem, o W.O. completa;
 *  - reservas e regra 22: fila por ordem de inscrição com os organizadores dentro, reserva só
 *    paga se for chamado, titulares pagam até 31/10, chamado depois tem 48 h, reserva que
 *    pagou e não jogou recebe de volta;
 *  - draft: desistência depois do sorteio.
 *
 * Tudo no texto das regras que já existiam: continuam 22, e a âncora de cada uma não muda.
 */

const cenario = vi.hoisted(() => ({ locale: "pt" as "pt" | "en" }));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: mensagens } = await import("@/lib/i18n/messages");
  return {
    getLocale: async () => cenario.locale,
    getMessages: async () => mensagens[cenario.locale],
  };
});

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({ taxa_centavos: 2000, pct_campeao: 70 }),
}));

const { default: RegrasPage } = await import("@/app/regras/page");

const pt = MESSAGES.pt.paginasRegras;
const en = MESSAGES.en.paginasRegras;

async function montar(): Promise<HTMLDivElement> {
  const raiz = document.createElement("div");
  raiz.innerHTML = renderToStaticMarkup(await RegrasPage());
  return raiz;
}

/** Os marcadores {nome} de um texto, em ordem — têm de ser os mesmos nos dois idiomas. */
const marcadores = (texto: string) => texto.match(/\{\w+\}/g) ?? [];

beforeEach(() => {
  cenario.locale = "pt";
});

describe("regulamento de 22/10/2026: o que mudou, nos dois idiomas", () => {
  it("a data de atualização é 23/10/2026 (as decisões de 22/10 e, por cima, as dos capitães de 23/10)", () => {
    expect(pt.regrasSubtitulo).toContain("Atualizado em 23/10/2026.");
    expect(en.regrasSubtitulo).toContain("Updated on 23 October 2026.");
  });

  it("regra 4: remake não conta", () => {
    expect(pt.regra4).toMatch(/partida encerrada em remake também não/);
    expect(en.regra4).toMatch(/neither do games that ended in a remake/);
    // O que já valia continua lá.
    expect(pt.regra4).toMatch(/^Jogadores precisam ter jogado no mínimo 5 partidas da fila solo\/duo/);
  });

  it("regra 6: substituto por jogo, saída de vez e capitão que sai", () => {
    expect(pt.regra6).toContain("vale só para os jogos em que o substituto entrar");
    expect(pt.regra6).toContain("inclusive MVP");
    expect(pt.regra6).toContain("o titular continua no elenco");
    expect(pt.regra6).toContain("times diferentes em séries diferentes");
    expect(pt.regra6).toContain("um reserva oficial herda a vaga");
    expect(pt.regra6).toContain("a organização escolhe outro capitão entre os jogadores do time");

    expect(en.regra6).toContain("only apply to the games the substitute plays");
    expect(en.regra6).toContain("MVP included");
    expect(en.regra6).toContain("the starter stays on the roster");
    expect(en.regra6).toContain("different teams in different series");
    expect(en.regra6).toContain("an official reserve inherits the place");
    expect(en.regra6).toContain("the organisers choose another captain from the team's players");

    // A regra de pontos do substituto não mudou.
    expect(pt.regra6).toContain("igual ou menor ao do jogador substituído");
    expect(en.regra6).toContain("equal to or lower than that of the player being replaced");
  });

  it("regra 8: W.O. no meio da série — os jogos valem e o W.O. completa", () => {
    expect(pt.regra8).toContain("No meio da série, os jogos já disputados valem e o W.O. completa a série");
    expect(pt.regra8).toContain("quem vencia por 1x0 fecha 2x0; quem perdia por 0x1 fecha 2x1");
    expect(pt.regra8).toContain("não têm estatísticas de jogador nem MVP");
    expect(en.regra8).toContain("Midway through a series, the games already played stand and the W.O. completes the series");
    expect(en.regra8).toContain("a team leading 1-0 wins 2-0; a team trailing 0-1 wins 2-1");
    expect(en.regra8).toContain("have no player stats or MVP");
    // W.O. sem jogos e W.O. duplo: como antes.
    expect(pt.regra8).toContain("vitória 2x0 e 3 pontos");
    expect(pt.regra8).toContain("W.O. duplo");
  });

  it("saldo de games e pontuação contam os jogos completados por W.O.", () => {
    expect(pt.regra19).toContain("com os jogos de W.O. contando como vitória de quem levou o W.O.");
    expect(en.regra19).toContain("with W.O. games counting as wins for the team awarded the W.O.");
    expect(pt.pontuacaoFaseV).toContain("no meio da série, os jogos disputados valem e o W.O. completa o placar");
    expect(en.pontuacaoFaseV).toContain("midway through a series, the games played stand and the W.O. completes the score");
  });

  it("reservas: fila por ordem de inscrição, organizadores entre os titulares, reserva só paga se for chamado", () => {
    expect(pt.inscricaoReservasTexto).toContain("Os titulares são todos os organizadores");
    expect(pt.inscricaoReservasTexto).toContain("pela ordem de inscrição");
    expect(pt.inscricaoReservasTexto).toContain("fila de reserva");
    expect(pt.inscricaoReservasTexto).toContain("O reserva só paga se for chamado");
    expect(en.inscricaoReservasTexto).toContain("The starters are all the organisers");
    expect(en.inscricaoReservasTexto).toContain("in sign-up order");
    expect(en.inscricaoReservasTexto).toContain("reserve queue");
    expect(en.inscricaoReservasTexto).toContain("A reserve only pays if called up");
  });

  it("regra 22: titulares até 31/10, chamado depois tem 48 h, reserva que não jogou recebe de volta", () => {
    expect(pt.regra22).toMatch(/^Inscrição:/);
    expect(pt.regra22).toContain("Os titulares pagam até 31/10/2026, às 23h59 (horário de Brasília)");
    expect(pt.regra22).toContain("e os organizadores não pagam");
    expect(en.regra22).toContain("and the organisers do not pay");
    expect(pt.regra22).toContain("pode perder a vaga para o primeiro da fila de reserva");
    expect(pt.regra22).toContain("só paga se for chamado");
    expect(pt.regra22).toContain("em até 48 horas, se for chamado depois");
    expect(pt.regra22).toContain("Reserva que pagou e não jogou recebe o valor de volta");

    expect(en.regra22).toContain("Starters pay by 31 October 2026, 23:59 (Brasília time)");
    expect(en.regra22).toContain("may lose their place to the first person in the reserve queue");
    expect(en.regra22).toContain("they only pay if called up");
    expect(en.regra22).toContain("within 48 hours if called up afterwards");
    expect(en.regra22).toContain("A reserve who paid and did not play gets the money back");
  });

  it("draft: desistência depois do sorteio", () => {
    expect(pt.draft6).toMatch(/^Jogador escolhido não pode ser escolhido por outro time\./);
    expect(pt.draft6).toContain("Se alguém desistir depois do sorteio, quem ainda não foi escolhido sai da lista na hora");
    expect(pt.draft6).toContain("o draft segue normalmente");
    expect(en.draft6).toContain("If someone withdraws after the draw, a player who has not been picked yet is removed from the list straight away");
    expect(en.draft6).toContain("the draft carries on as normal");
  });

  it("os marcadores de link são os mesmos nos dois idiomas", () => {
    for (const chave of ["regra4", "regra6", "regra8", "regra19", "regra22", "draft6", "pontuacaoFaseV", "inscricaoReservasTexto"] as const) {
      expect(marcadores(en[chave]), chave).toEqual(marcadores(pt[chave]));
    }
    expect(marcadores(pt.inscricaoReservasTexto)).toEqual(["{r22}", "{r6}"]);
  });
});

describe("/regras renderizada", () => {
  it("continuam 22 regras, sem numeração nova", async () => {
    const raiz = await montar();
    expect(raiz.querySelector("#regra-22")).not.toBeNull();
    expect(raiz.querySelector("#regra-23")).toBeNull();
  });

  it("o parágrafo das reservas linka as regras 22 e 6, sem marcador cru — nos dois idiomas", async () => {
    for (const locale of ["pt", "en"] as const) {
      cenario.locale = locale;
      const raiz = await montar();
      const secao = raiz.querySelector("#inscricao")!;
      expect(secao.textContent, locale).not.toMatch(/\{r\d+\}/);
      const links = [...secao.querySelectorAll('a[href^="#regra-"]')].map((a) => a.getAttribute("href"));
      expect(links, locale).toEqual(expect.arrayContaining(["#regra-22", "#regra-6"]));
    }
  });

  it("o texto novo aparece no cartão da regra certa", async () => {
    const raiz = await montar();
    expect(raiz.querySelector("#regra-4")!.textContent).toContain("remake também não");
    expect(raiz.querySelector("#regra-8")!.textContent).toContain("No meio da série");
    expect(raiz.querySelector("#regra-22")!.textContent).toContain("31/10/2026");
  });
});
