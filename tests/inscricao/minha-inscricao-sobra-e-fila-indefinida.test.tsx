// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MinhaInscricaoCliente from "@/components/inscricao/minha";
import { MESSAGES } from "@/lib/i18n/messages";
import { montarFila } from "@/lib/inscricoes/fila";

/**
 * Minha inscrição em dois lugares da fila que a tela contava errado (auditoria da retomada,
 * 23/10):
 *
 *  - INT-7: quem a organização marcou como «sobra» vai para o FIM da fila e não é chamado
 *    sozinho (`montarFila` o marca `manual`). A tela prometia a ele «Se alguém à frente sair,
 *    você passa a titular» — o que a fila não faz.
 *  - B5: o servidor não conseguiu ler a fila (`fila: { tipo: "indefinido" }`). Na dúvida a tela
 *    não mostra Pix, «JÁ PAGUEI» nem prazo, e diz que o lugar não pôde ser conferido.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status: 200, headers: { "Content-Type": "application/json" } });

function responder(inscricao: Record<string, unknown>, pix: { chave: string } | null = null) {
  const f = vi.fn(async () =>
    json({
      jogador: { displayName: "Fulano", email: "fulano@exemplo.com" },
      pix,
      inscricao: {
        riotId: "Fulano#BR1",
        elo: "Ouro",
        rotaPrimaria: "MID",
        rotaSecundaria: "TOP",
        disponibilidade: ["noite"],
        situacao: "apto",
        recado: null,
        criadoEm: "2026-10-05T09:00:00Z",
        pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: "2026-11-01T02:59:59Z" },
        conferencias: [],
        ...inscricao,
      },
    }),
  );
  vi.stubGlobal("fetch", f);
  return f;
}

describe("Minha inscrição de quem está em «sobra» (INT-7)", () => {
  it("a fila não chama a «sobra» sozinha — e a tela não promete que chama", async () => {
    // A função pura: com 1 vaga, o titular sai e quem entra é o reserva, não a sobra.
    const config = { max_times: 1, jogadores_por_time: 1 };
    const inscritos = [
      { id: "sb", situacao: "sobra", criado_em: "2026-10-05T09:00:00Z" },
      { id: "t1", situacao: "apto", criado_em: "2026-10-05T10:00:00Z" },
      { id: "r1", situacao: "apto", criado_em: "2026-10-05T11:00:00Z" },
    ];
    expect(montarFila(inscritos, config).lugar.sb).toEqual({ tipo: "reserva", posicao: 2, manual: true });
    const semOTitular = montarFila(
      inscritos.map((i) => (i.id === "t1" ? { ...i, situacao: "desistiu" } : i)),
      config,
    );
    expect(semOTitular.titulares).toEqual(["r1"]);

    const t = MESSAGES.pt.inscricao;
    responder({ situacao: "sobra", fila: { tipo: "reserva", posicao: 2 }, pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: null } });
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText("Você está na fila de reserva (posição 2) — só paga se for chamado.");

    expect(document.body.textContent).not.toContain("Se alguém à frente sair, você passa a titular");
    expect(document.body.textContent).toContain(t.minhaSobraAjuda);
    // Continua sem cobrança: «sobra» na fila é reserva.
    expect(screen.queryByRole("button", { name: t.jaPaguei })).toBeNull();
  });

  it("em inglês, o mesmo", async () => {
    const t = MESSAGES.en.inscricao;
    responder({ situacao: "sobra", fila: { tipo: "reserva", posicao: 2 }, pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: null } });
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.minhaSobraAjuda);
    expect(document.body.textContent).not.toContain(t.minhaReservaAjuda);
  });

  it("«sobra» que já pagou: além do aviso dela, que o valor é devolvido se não for chamada", async () => {
    const t = MESSAGES.pt.inscricao;
    responder({ situacao: "sobra", fila: { tipo: "reserva", posicao: 2 }, pagamento: { estado: "pago", valorCentavos: 3000, venceEm: null } });
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText("Fulano#BR1");
    expect(document.body.textContent).toContain(t.minhaSobraAjuda);
    expect(document.body.textContent).toContain(t.reservaComPagamento);
  });

  it("controle: o reserva comum continua lendo que é chamado pela ordem", async () => {
    const t = MESSAGES.pt.inscricao;
    responder({ situacao: "apto", fila: { tipo: "reserva", posicao: 1 }, pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: null } });
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.minhaReservaAjuda);
    expect(document.body.textContent).not.toContain(t.minhaSobraAjuda);
  });
});

describe("Minha inscrição com o lugar na fila indefinido (B5)", () => {
  it("sem Pix, sem «JÁ PAGUEI» e sem prazo — e diz que o lugar não pôde ser conferido", async () => {
    const t = MESSAGES.pt.inscricao;
    // Mesmo que algo mande a chave, a tela não mostra o Pix na dúvida.
    responder({ fila: { tipo: "indefinido" } }, { chave: "chave@exemplo.com" });
    render(<MinhaInscricaoCliente t={t} />);
    expect((await screen.findByRole("status")).textContent).toBe(t.filaIndefinida);
    expect(screen.queryByRole("button", { name: t.jaPaguei })).toBeNull();
    expect(document.body.textContent).not.toContain("chave@exemplo.com");
    expect(document.body.textContent).not.toContain(t.venceEm);
    expect(document.body.textContent).toContain(t.filaIndefinidaPagamento);
    expect(document.body.textContent).not.toContain(t.pagamentos.aguardando);
  });

  it("TENTAR DE NOVO busca de novo e, com a fila lida, mostra a cobrança do titular", async () => {
    const t = MESSAGES.pt.inscricao;
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        json({
          jogador: { displayName: "Fulano", email: "fulano@exemplo.com" },
          pix: null,
          inscricao: {
            riotId: "Fulano#BR1",
            elo: "Ouro",
            rotaPrimaria: "MID",
            rotaSecundaria: "TOP",
            disponibilidade: [],
            situacao: "apto",
            recado: null,
            fila: { tipo: "indefinido" },
            criadoEm: "2026-10-05T09:00:00Z",
            pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: "2026-11-01T02:59:59Z" },
            conferencias: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        json({
          jogador: { displayName: "Fulano", email: "fulano@exemplo.com" },
          pix: null,
          inscricao: {
            riotId: "Fulano#BR1",
            elo: "Ouro",
            rotaPrimaria: "MID",
            rotaSecundaria: "TOP",
            disponibilidade: [],
            situacao: "apto",
            recado: null,
            fila: { tipo: "titular" },
            criadoEm: "2026-10-05T09:00:00Z",
            pagamento: { estado: "aguardando", valorCentavos: 3000, venceEm: "2026-11-01T02:59:59Z" },
            conferencias: [],
          },
        }),
      );
    vi.stubGlobal("fetch", f);
    render(<MinhaInscricaoCliente t={t} />);
    fireEvent.click(await screen.findByRole("button", { name: t.tentarDeNovo }));
    expect(await screen.findByRole("button", { name: t.jaPaguei })).toBeTruthy();
    expect(f).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(t.filaIndefinida)).toBeNull();
  });

  it("em inglês, o mesmo aviso", async () => {
    const t = MESSAGES.en.inscricao;
    responder({ fila: { tipo: "indefinido" } });
    render(<MinhaInscricaoCliente t={t} />);
    expect((await screen.findByRole("status")).textContent).toBe(t.filaIndefinida);
    expect(screen.queryByRole("button", { name: t.jaPaguei })).toBeNull();
  });
});
