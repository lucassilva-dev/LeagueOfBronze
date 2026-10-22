// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import MinhaInscricaoCliente from "@/components/inscricao/minha";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * "Minha inscrição" (components/inscricao/minha.tsx) nos casos em que a tela mentia:
 *
 *  - INS-02: falha ao carregar (500 ou rede) aparecia como "Entre na sua conta" + "FAZER
 *    MINHA INSCRIÇÃO"; agora é um aviso de erro com TENTAR DE NOVO.
 *  - INS-03: sem sessão, o botão principal levava ao formulário de inscrição; agora leva
 *    ao /entrar, com volta para cá.
 *  - INS-10: recusado ou desistente sem pagar via "Aguardando pagamento · R$ 20,00 —
 *    Vence em …"; agora vê "Sem cobrança".
 *  - INS-15: o erro do JÁ PAGUEI sai no idioma da tela, pelo `codigo` da rota.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const t = MESSAGES.pt.inscricao;
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

const JOGADOR = { displayName: "Fulano", email: "fulano@exemplo.com" };

function ficha(extra: Record<string, unknown> = {}) {
  return {
    riotId: "Fulano#BR1",
    elo: "Ouro",
    rotaPrimaria: "MID",
    rotaSecundaria: "TOP",
    disponibilidade: ["noite"],
    situacao: "pendente",
    observacao: null,
    criadoEm: "2026-10-06T12:00:00Z",
    pagamento: { estado: "aguardando", valorCentavos: 2000, venceEm: "2026-10-20T15:00:00Z" },
    conferencias: [],
    ...extra,
  };
}

describe("falha ao carregar (INS-02)", () => {
  it("500 do servidor: aviso de erro e TENTAR DE NOVO, sem 'Entre na sua conta' nem link de inscrição", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "x", ref: "abcd1234" }, 500)));
    render(<MinhaInscricaoCliente t={t} />);
    const alerta = await screen.findByRole("alert");
    expect(alerta.textContent).toBe(t.minhaErroCarregar);
    expect(screen.getByRole("button", { name: t.tentarDeNovo })).toBeTruthy();
    expect(screen.queryByText(t.minhaSemConta)).toBeNull();
    expect(document.querySelector('a[href="/inscricao"]')).toBeNull();
  });

  it("rede caída (fetch rejeita): o mesmo aviso", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("Failed to fetch"); }));
    render(<MinhaInscricaoCliente t={t} />);
    expect((await screen.findByRole("alert")).textContent).toBe(t.minhaErroCarregar);
    expect(screen.queryByText(t.minhaSemConta)).toBeNull();
  });

  it("TENTAR DE NOVO busca outra vez e, dando certo, mostra a ficha", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ error: "x" }, 500))
      .mockResolvedValueOnce(json({ jogador: JOGADOR, inscricao: ficha(), pix: null }));
    vi.stubGlobal("fetch", f);
    render(<MinhaInscricaoCliente t={t} />);
    fireEvent.click(await screen.findByRole("button", { name: t.tentarDeNovo }));
    expect(await screen.findByText("Fulano#BR1")).toBeTruthy();
    expect(f).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("sem sessão (INS-03)", () => {
  it("o botão principal é ENTRAR, com volta para /minha-inscricao; fazer inscrição fica como segunda opção", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ jogador: null, inscricao: null })));
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.minhaSemConta);
    const links = Array.from(document.querySelectorAll("a"));
    expect(links[0]?.getAttribute("href")).toBe("/entrar?volta=/minha-inscricao");
    expect(links[0]?.className).toContain("lob-btn-gold");
    expect(links[0]?.textContent).toBe(t.entrarBotao);
    expect(links[1]?.getAttribute("href")).toBe("/inscricao");
    expect(links[1]?.className).toContain("lob-btn-ghost");
  });
});

describe("recusado ou desistente sem pagar (INS-10)", () => {
  it.each(["recusado", "desistiu"] as const)("%s: chip 'Sem cobrança', sem valor e sem 'Vence em'", async (situacao) => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ jogador: JOGADOR, inscricao: ficha({ situacao }), pix: null })),
    );
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.situacoes[situacao]);
    expect(screen.getByText(t.semCobranca)).toBeTruthy();
    expect(screen.queryByText(new RegExp(`^${t.pagamentos.aguardando}`))).toBeNull();
    expect(document.body.textContent).not.toMatch(/20,00/);
    expect(screen.queryByText(new RegExp(`^${t.venceEm} `))).toBeNull();
  });

  it("controle: pendente que não pagou continua vendo valor, vencimento e JÁ PAGUEI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ jogador: JOGADOR, inscricao: ficha(), pix: null })),
    );
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText("Fulano#BR1");
    expect(screen.queryByText(t.semCobranca)).toBeNull();
    expect(document.body.textContent).toMatch(/Aguardando pagamento · R\$\s*20,00/);
    expect(screen.getByText(new RegExp(`^${t.venceEm} `))).toBeTruthy();
    expect(screen.getByRole("button", { name: t.jaPaguei })).toBeTruthy();
  });

  it("controle: recusado que JÁ pagou continua vendo 'Pago e conferido' (não é cobrança)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json({
          jogador: JOGADOR,
          inscricao: ficha({ situacao: "recusado", pagamento: { estado: "pago", valorCentavos: 2000, venceEm: null } }),
          pix: null,
        }),
      ),
    );
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.situacoes.recusado);
    expect(screen.queryByText(t.semCobranca)).toBeNull();
    expect(document.body.textContent).toContain(t.pagamentos.pago);
  });
});

describe("erro do JÁ PAGUEI no idioma da tela (INS-15)", () => {
  it("em inglês, o 409 da rota sai traduzido pelo código", async () => {
    const en = MESSAGES.en.inscricao;
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ jogador: JOGADOR, inscricao: ficha(), pix: null }))
      .mockResolvedValueOnce(
        json(
          {
            error: "Esse pagamento já foi tratado pela organização. Fale com ela se algo estiver errado.",
            codigo: "pagamento_ja_tratado",
          },
          409,
        ),
      );
    vi.stubGlobal("fetch", f);
    render(<MinhaInscricaoCliente t={en} />);
    fireEvent.click(await screen.findByRole("button", { name: en.jaPaguei }));
    expect((await screen.findByRole("alert")).textContent).toBe(en.erros.pagamento_ja_tratado);
  });

  it("código desconhecido: mostra o texto que veio", async () => {
    const f = vi
      .fn()
      .mockResolvedValueOnce(json({ jogador: JOGADOR, inscricao: ficha(), pix: null }))
      .mockResolvedValueOnce(json({ error: "Outra coisa.", codigo: "toString" }, 400));
    vi.stubGlobal("fetch", f);
    render(<MinhaInscricaoCliente t={t} />);
    fireEvent.click(await screen.findByRole("button", { name: t.jaPaguei }));
    expect((await screen.findByRole("alert")).textContent).toBe("Outra coisa.");
  });
});

describe("botões de rótulo longo no celular (INS-11)", () => {
  it("FAZER MINHA INSCRIÇÃO pode quebrar linha, com a seta presa à última palavra", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ jogador: JOGADOR, inscricao: null })));
    render(<MinhaInscricaoCliente t={t} />);
    await screen.findByText(t.minhaSemInscricao);
    const botao = document.querySelector('a[href="/inscricao"]') as HTMLElement;
    expect(botao.style.whiteSpace).toBe("normal");
    expect(botao.style.maxWidth).toBe("100%");
    expect(botao.textContent).toMatch(/INSCRIÇÃO →$/);
  });
});
