// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Passo3, type ConfigPublica } from "@/components/inscricao/formulario";
import MinhaInscricaoCliente from "@/components/inscricao/minha";
import { MESSAGES } from "@/lib/i18n/messages";
import { listaDeQuemFaltaPagar, mensagemDeCobranca } from "@/lib/inscricoes/cobranca";
import { motivoParaManterAVaga, prazoDoChamado } from "@/lib/inscricoes/fila";
import { dataDoPrazo, prazoNoFimDoDia } from "@/lib/inscricoes/pagamento";

/**
 * O prazo de 48 h do reserva chamado depois de 31/10 (D4) aparecia só com o dia (auditoria
 * final, FB-2/FI-3): chamado em 02/11 às 15:37, ele lia «vence em 04/11/2026», pagava às 20 h
 * desse dia e já estava em «Perderam o prazo», com o botão de passar a vaga (D5).
 *
 * Agora todo prazo que não cai no fim do dia em Brasília sai com data E hora; o prazo único
 * de 31/10 (23:59:59) continua «até 31/10».
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const t = MESSAGES.pt.inscricao;
const en = MESSAGES.en.inscricao;
const FIM_DE_31_10 = "2026-11-01T02:59:59.000Z";
/** Chamado em 02/11 às 15:37 de Brasília: 48 h depois. */
const CHAMADO_EM = Date.parse("2026-11-02T18:37:00.000Z");
const QUARENTA_E_OITO = prazoDoChamado({ prazo_pagamento_ate: FIM_DE_31_10 }, CHAMADO_EM);

describe("o caso da auditoria: às 20 h do último dia a vaga já pode ser passada", () => {
  it("o prazo é 04/11 às 15:37 e, às 20 h de 04/11, o titular já perde a vaga", () => {
    expect(QUARENTA_E_OITO).toBe("2026-11-04T18:37:00.000Z");
    const as20h = Date.parse("2026-11-04T23:00:00.000Z");
    const motivo = motivoParaManterAVaga(
      { lugar: { tipo: "titular" }, organizador: false, situacao: "pendente", pagamento: { estado: "aguardando", vence_em: QUARENTA_E_OITO } },
      as20h,
    );
    expect(motivo).toBeNull();
  });
});

describe("dataDoPrazo", () => {
  it("fim do dia em Brasília (o prazo único de 31/10): só a data", () => {
    expect(prazoNoFimDoDia(FIM_DE_31_10)).toBe(true);
    expect(dataDoPrazo(FIM_DE_31_10, "pt-BR")).toBe("31/10/2026");
    expect(dataDoPrazo(FIM_DE_31_10, "pt-BR", { ano: false })).toBe("31/10");
  });

  it("as 48 h do chamado: data e hora de Brasília, em pt e em en", () => {
    expect(prazoNoFimDoDia(QUARENTA_E_OITO)).toBe(false);
    expect(dataDoPrazo(QUARENTA_E_OITO, "pt-BR")).toBe("04/11/2026 às 15:37 (horário de Brasília)");
    expect(dataDoPrazo(QUARENTA_E_OITO, "pt-BR", { ano: false, fuso: false })).toBe("04/11 às 15:37");
    expect(dataDoPrazo(QUARENTA_E_OITO, "en-US")).toBe("11/04/2026 at 15:37 (Brasília time)");
  });

  it("02/11 às 20:00 (o exemplo da decisão): «até 02/11 às 20:00»", () => {
    expect(dataDoPrazo("2026-11-02T23:00:00.000Z", "pt-BR", { ano: false })).toBe("02/11 às 20:00 (horário de Brasília)");
  });

  it("texto ilegível volta como veio", () => {
    expect(dataDoPrazo("amanhã", "pt-BR")).toBe("amanhã");
  });
});

describe("Minha inscrição", () => {
  const json = (corpo: unknown) =>
    new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" } });
  const ficha = (venceEm: string) => ({
    riotId: "Fulano#BR1",
    elo: "Ouro",
    rotaPrimaria: "MID",
    rotaSecundaria: "TOP",
    disponibilidade: ["noite"],
    situacao: "pendente",
    recado: null,
    fila: { tipo: "titular" },
    criadoEm: "2026-10-06T12:00:00Z",
    pagamento: { estado: "aguardando", valorCentavos: 2000, venceEm },
    conferencias: [],
  });
  const carregar = (venceEm: string) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ jogador: { displayName: "Fulano", email: "f@exemplo.com" }, inscricao: ficha(venceEm), pix: null })),
    );

  it("reserva chamado depois de 31/10: «Vence em 04/11/2026 às 15:37 (horário de Brasília)»", async () => {
    carregar(QUARENTA_E_OITO);
    render(<MinhaInscricaoCliente t={t} />);
    expect(await screen.findByText(`${t.venceEm} 04/11/2026 às 15:37 (horário de Brasília)`)).toBeTruthy();
  });

  it("titular com o prazo único: continua «Vence em 31/10/2026»", async () => {
    carregar(FIM_DE_31_10);
    render(<MinhaInscricaoCliente t={t} />);
    expect(await screen.findByText(`${t.venceEm} 31/10/2026`)).toBeTruthy();
  });
});

describe("formulário: o aviso do prazo de quem vira titular agora", () => {
  const CONFIG: ConfigPublica = {
    taxaCentavos: 2000,
    chavePix: "chave@exemplo.com",
    prazoPagamentoDias: 14,
    prazoPagamentoAte: QUARENTA_E_OITO,
    minRanqueadas: 5,
    pctCampeao: 70,
    fila: { tipo: "titular" },
  };
  const passo3 = (config: ConfigPublica, rotulos = t) => {
    const nada = () => {};
    return render(
      <Passo3
        t={rotulos}
        config={config}
        resumo={{ riotId: "Fulano#BR1", elo: "Ouro", rota1: "MEIO", rota2: "TOPO", turnos: [] }}
        aceites={[false, false, false]}
        setAceites={nada}
        pixCopiado={false}
        onCopiarPix={nada}
      />,
    );
  };

  it("depois de 31/10 (agora + 48 h): com a hora", () => {
    const { container } = passo3(CONFIG);
    expect(container.textContent).toContain("O prazo para pagar vai até 04/11/2026 às 15:37 (horário de Brasília).");
  });

  it("em inglês também", () => {
    const { container } = passo3(CONFIG, en);
    expect(container.textContent).toContain("You have until 11/04/2026 at 15:37 (Brasília time) to pay.");
  });

  it("até 31/10: continua só a data", () => {
    const { container } = passo3({ ...CONFIG, prazoPagamentoAte: FIM_DE_31_10 });
    expect(container.textContent).toContain("O prazo para pagar vai até 31/10/2026.");
  });
});

describe("cobrança no WhatsApp e lista do grupo", () => {
  const cobranca = (venceEm: string) =>
    mensagemDeCobranca({ riotId: "Fulano#BR1", valorCentavos: 2000, chavePix: null, venceEm, origem: "https://x" });

  it("48 h: «com prazo até 04/11 às 15:37 (horário de Brasília)»", () => {
    expect(cobranca(QUARENTA_E_OITO)).toContain("com prazo até 04/11 às 15:37 (horário de Brasília).");
  });

  it("31/10: «com prazo até 31/10.»", () => {
    expect(cobranca(FIM_DE_31_10)).toContain("com prazo até 31/10.");
  });

  it("a lista do grupo leva a hora só de quem tem prazo no meio do dia", () => {
    const lista = listaDeQuemFaltaPagar(
      [
        { riotId: "A#1", venceEm: FIM_DE_31_10 },
        { riotId: "B#2", venceEm: QUARENTA_E_OITO },
      ],
      2000,
    );
    expect(lista).toContain("• A#1 — até 31/10\n");
    expect(lista).toContain("• B#2 — até 04/11 às 15:37 (horário de Brasília)");
  });
});
