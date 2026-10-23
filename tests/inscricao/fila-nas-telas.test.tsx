// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import FormularioInscricao, { Passo3, type ConfigPublica } from "@/components/inscricao/formulario";
import MinhaInscricaoCliente from "@/components/inscricao/minha";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * A fila de reserva e o prazo único nas telas públicas (decisões D2, D3 e G do Lucas,
 * 2026-10-22):
 *
 *  - formulário: com as vagas cheias, o passo 3 avisa a posição na fila e NÃO mostra a chave
 *    Pix; o recibo do reserva também não. O prazo dos titulares é a data da edição (31/10),
 *    no fuso de Brasília;
 *  - Minha inscrição: o reserva lê "fila de reserva (posição N) — só paga se for chamado",
 *    sem Pix, sem JÁ PAGUEI e sem vencimento; o recado da organização aparece, a nota
 *    interna não existe mais na resposta.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const t = MESSAGES.pt.inscricao;
const en = MESSAGES.en.inscricao;
const CHAVE = "chave@exemplo.com";
const PRAZO = "2026-11-01T02:59:59Z"; // fim de 31/10 em Brasília

const CONFIG: ConfigPublica = {
  taxaCentavos: 3000,
  chavePix: CHAVE,
  prazoPagamentoDias: 14,
  prazoPagamentoAte: PRAZO,
  minRanqueadas: 5,
  pctCampeao: 70,
};
const RESERVA: ConfigPublica = { ...CONFIG, fila: { tipo: "reserva", posicao: 4, vagas: 30 } };
const ELOS = [{ valor: "Ouro", rotulo: "Ouro" }];
const LOGADO = { displayName: "Fulano", email: "fulano@exemplo.com" };
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

function passo3(config: ConfigPublica, rotulos = t) {
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
}

describe("passo 3 com as vagas cheias (D2)", () => {
  it("avisa a fila e a posição, e NÃO mostra a chave Pix nem o prazo", () => {
    passo3(RESERVA);
    const texto = document.body.textContent ?? "";
    expect(texto).toContain(t.vagasCheiasTitulo);
    expect(texto).toContain("As 30 vagas desta edição já estão preenchidas");
    expect(texto).toContain("na posição 4");
    expect(texto).not.toContain(CHAVE);
    expect(screen.queryByRole("button", { name: t.pixCopiar })).toBeNull();
    expect(texto).not.toContain("O prazo para pagar");
  });

  it("controle: com vaga, a chave e o prazo da edição — 31/10/2026, no fuso de Brasília", () => {
    passo3({ ...CONFIG, fila: { tipo: "titular" } });
    const texto = document.body.textContent ?? "";
    expect(texto).toContain(CHAVE);
    expect(texto).toContain("O prazo para pagar vai até 31/10/2026.");
    expect(texto).not.toContain(t.vagasCheiasTitulo);
  });

  it("em inglês, o mesmo aviso", () => {
    passo3(RESERVA, en);
    expect(document.body.textContent).toContain("waiting list at position 4");
    expect(document.body.textContent).not.toContain(CHAVE);
  });

  it("sem prazo da edição, o aviso antigo em dias", () => {
    passo3({ ...CONFIG, prazoPagamentoAte: null });
    expect(document.body.textContent).toContain("Você tem 14 dias para pagar");
  });
});

describe("recibo do envio (D2)", () => {
  function enviar(resposta: Record<string, unknown>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ ok: true, riotId: "Fulano#BR1", ...resposta })),
    );
  }

  async function ateOEnvio() {
    const campo = (rotulo: string) =>
      screen.getByLabelText(new RegExp(rotulo.replace(/[.*+?^${}()|[\]\\#]/g, "\\$&"), "i"), {
        selector: "input,select",
      }) as HTMLInputElement;
    fireEvent.change(campo(t.nickLabel), { target: { value: "Fulano" } });
    fireEvent.change(campo(t.tagLabel), { target: { value: "BR1" } });
    fireEvent.change(campo(t.discordLabel), { target: { value: "fulano" } });
    fireEvent.change(campo(t.nomeLabel), { target: { value: "Fulano de Tal" } });
    fireEvent.click(screen.getByRole("button", { name: t.continuar }));
    fireEvent.click(await screen.findByRole("button", { name: "Ouro" }));
    fireEvent.change(campo(t.rota1Label), { target: { value: "MEIO" } });
    fireEvent.change(campo(t.rota2Label), { target: { value: "TOPO" } });
    fireEvent.click(screen.getByRole("checkbox", { name: t.turnos.noite }));
    fireEvent.click(screen.getByRole("button", { name: t.continuar }));
    await screen.findByText(t.resumoTitulo);
    for (const caixa of screen.getAllByRole("checkbox")) fireEvent.click(caixa);
    fireEvent.click(screen.getByRole("button", { name: t.enviar }));
    return (await screen.findByText(t.prontoTitulo)).closest(".lob-card-2") as HTMLElement;
  }

  it("reserva: a posição na fila, «não pague agora», e nada de Pix", async () => {
    enviar({ fila: { tipo: "reserva", posicao: 2 } });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const recibo = await ateOEnvio();
    expect(recibo.textContent).toContain("você entrou na fila de reserva, na posição 2");
    expect(recibo.textContent).not.toContain(t.taxaTitulo);
    expect(recibo.textContent).not.toContain(t.jaPaguei);
  });

  it("titular: o bloco do Pix, com o prazo da edição", async () => {
    enviar({ fila: { tipo: "titular" } });
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const recibo = await ateOEnvio();
    expect(recibo.textContent).toContain(`${t.taxaTitulo} — R$`);
    expect(recibo.textContent).toContain("31/10/2026");
  });

  it("sem o lugar (o servidor não calculou): sem Pix, e o caminho é Minha inscrição", async () => {
    enviar({});
    render(<FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={LOGADO} />);
    const recibo = await ateOEnvio();
    expect(recibo.textContent).not.toContain(t.taxaTitulo);
    expect(recibo.textContent).toContain(t.reciboSemFila);
    expect(recibo.querySelector('a[href="/minha-inscricao"]')).not.toBeNull();
  });
});

describe("Minha inscrição (D2 e G)", () => {
  const JOGADOR = { displayName: "Fulano", email: "fulano@exemplo.com" };
  function ficha(extra: Record<string, unknown> = {}) {
    return {
      riotId: "Fulano#BR1",
      elo: "Ouro",
      rotaPrimaria: "MID",
      rotaSecundaria: "TOP",
      disponibilidade: ["noite"],
      situacao: "pendente",
      recado: null,
      fila: { tipo: "titular" },
      criadoEm: "2026-10-06T12:00:00Z",
      pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: PRAZO },
      conferencias: [],
      ...extra,
    };
  }
  const carregar = (inscricao: unknown) =>
    vi.stubGlobal("fetch", vi.fn(async () => json({ jogador: JOGADOR, inscricao, pix: null })));

  it("reserva: «fila de reserva (posição 3) — só paga se for chamado», sem JÁ PAGUEI e sem vencimento", async () => {
    carregar(ficha({ fila: { tipo: "reserva", posicao: 3 }, pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: null } }));
    render(<MinhaInscricaoCliente t={t} />);
    expect(await screen.findByText("Você está na fila de reserva (posição 3) — só paga se for chamado.")).toBeTruthy();
    expect(screen.getByText(t.reservaSemCobranca)).toBeTruthy();
    expect(screen.queryByRole("button", { name: t.jaPaguei })).toBeNull();
    expect(screen.queryByText(new RegExp(`^${t.venceEm} `))).toBeNull();
    expect(document.body.textContent).not.toMatch(/30,00/);
  });

  it("reserva que já pagou: o registro fica, com o aviso de devolução se não for chamado", async () => {
    carregar(ficha({ fila: { tipo: "reserva", posicao: 1 }, pagamento: { estado: "pago", valorCentavos: 3000, venceEm: null } }));
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.reservaComPagamento);
    expect(document.body.textContent).toContain(t.pagamentos.pago);
  });

  it("controle: titular vê o vencimento em 31/10/2026 (fuso de Brasília) e o JÁ PAGUEI", async () => {
    carregar(ficha());
    render(<MinhaInscricaoCliente t={t} />);
    expect(await screen.findByText(`${t.venceEm} 31/10/2026`)).toBeTruthy();
    expect(screen.getByRole("button", { name: t.jaPaguei })).toBeTruthy();
  });

  it("o recado da organização aparece; a nota interna, mesmo se viesse, não", async () => {
    carregar(ficha({ recado: "Mande o print do vínculo no privado.", observacao: "NOTA INTERNA: suspeita de smurf" }));
    render(<MinhaInscricaoCliente t={t} />);
    expect(await screen.findByText("Mande o print do vínculo no privado.")).toBeTruthy();
    expect(screen.getByText(t.recadoLabel)).toBeTruthy();
    expect(document.body.textContent).not.toContain("NOTA INTERNA");
  });
});
