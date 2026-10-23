import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A página /inscricao passa ao formulário a previsão da fila (D2) e o prazo único (D3) — e
 * nenhuma das duas pode derrubar a página pública.
 */

const cenario = vi.hoisted(() => ({
  previsao: null as unknown,
  previsaoFalha: false,
  prazoAte: null as string | null,
  props: null as null | { config: Record<string, unknown> },
}));

vi.mock("@/lib/i18n/server", async () => {
  const { MESSAGES: M } = await import("@/lib/i18n/messages");
  return { getLocale: async () => "pt", getMessages: async () => M.pt };
});

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

vi.mock("@/lib/jogadores/auth", () => ({
  JOGADOR_COOKIE: "lob_jogador",
  identidadePorToken: async () => null,
}));

vi.mock("@/lib/inscricoes/store", () => ({
  lerConfigOuNulo: async () => ({
    inscricoes_abertas: true,
    fechamento_inscricoes: null,
    abertura_inscricoes: "2026-10-05T12:00:00Z",
    taxa_centavos: 3000,
    chave_pix: "chave@exemplo.com",
    prazo_pagamento_dias: 14,
    prazo_pagamento_ate: cenario.prazoAte,
    min_ranqueadas: 5,
    pct_campeao: 70,
  }),
  inscricaoIdDoJogador: async () => null,
  previsaoParaNovoInscrito: async () => {
    if (cenario.previsaoFalha) throw new Error("banco caiu");
    return cenario.previsao;
  },
}));

// O formulário é trocado por um dublê que guarda as props: o que se mede é o que a página
// entrega a ele.
vi.mock("@/components/inscricao/formulario", () => ({
  default: (props: { config: Record<string, unknown> }) => {
    cenario.props = props;
    return <div>formulario</div>;
  },
}));

const pagina = await import("@/app/inscricao/page");

beforeEach(() => {
  cenario.previsao = null;
  cenario.previsaoFalha = false;
  cenario.prazoAte = null;
  cenario.props = null;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T15:00:00Z"));
});

async function render() {
  const html = renderToStaticMarkup(await pagina.default());
  vi.useRealTimers();
  return html;
}

describe("/inscricao com a fila", () => {
  it("vagas cheias: o formulário recebe a previsão de reserva, com a posição e as vagas", async () => {
    cenario.previsao = { tipo: "reserva", posicao: 7, vagas: 30 };
    expect(await render()).toContain("formulario");
    expect(cenario.props?.config.fila).toEqual({ tipo: "reserva", posicao: 7, vagas: 30 });
  });

  it("a previsão falhou: a página fica de pé, sem previsão (o passo 3 fica como era)", async () => {
    cenario.previsaoFalha = true;
    expect(await render()).toContain("formulario");
    expect(cenario.props?.config.fila).toBeNull();
  });

  it("prazo da edição no futuro: o formulário recebe a data", async () => {
    cenario.prazoAte = "2026-11-01T02:59:59Z";
    await render();
    expect(cenario.props?.config.prazoPagamentoAte).toBe("2026-11-01T02:59:59Z");
    expect(cenario.props?.config.prazoPagamentoHoras).toBeNull();
  });

  it("prazo da edição já vencido: o aviso diz 48 h a partir do ENVIO, sem uma hora exata da abertura da página", async () => {
    cenario.prazoAte = "2026-11-01T02:59:59Z";
    vi.setSystemTime(new Date("2026-11-04T10:00:00Z"));
    await render();
    expect(cenario.props?.config.prazoPagamentoAte).toBeNull();
    expect(cenario.props?.config.prazoPagamentoHoras).toBe(48);
  });

  it("sem prazo da edição (banco sem a migração): nulo, e o aviso antigo em dias", async () => {
    await render();
    expect(cenario.props?.config.prazoPagamentoAte).toBeNull();
  });
});
