// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import PainelCapitao from "@/components/draft/painel-capitao";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O painel do capitão (/capitao), com o servidor dublado.
 *
 *  - DRF-05: o clique manda o número da escolha que a tela mostrava, e com o relógio em
 *    0:00 os botões travam (o pedido chegaria depois do prazo).
 *  - DRF-09: o botão "Entre na sua conta…" quebra linha no celular.
 *  - DRF-11: a recusa do servidor aparece no idioma da tela; "N vagas abertas" no plural.
 *  - DRF-12: cada «ESCOLHER» diz de quem é, e a vez é anunciada (região viva).
 *  - DRF-13: conta sem inscrição não lê "Você não é capitão".
 */

type Pedido = { url: string; corpo: Record<string, unknown> | null };

const TIMES = [
  { id: "a", nome: "CHAMA", cor: "#ef7d34", capitaoRiotId: "CapA#BR1", gasto: 5, vagas: 4 },
  { id: "b", nome: "FORJA", cor: "#e0b13c", capitaoRiotId: "CapB#BR1", gasto: 5, vagas: 4 },
  { id: "c", nome: "BRASA", cor: "#d4574a", capitaoRiotId: "CapC#BR1", gasto: 5, vagas: 1 },
];

function draft(over: Record<string, unknown> = {}) {
  return {
    revisao: 5,
    fase: "rodando",
    times: TIMES,
    elencos: {
      a: [{ riotId: "CapA#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", capitao: true }],
      b: [{ riotId: "CapB#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", capitao: true }],
      c: [{ riotId: "CapC#BR1", pontos: 5, rota1: "MID", rota2: "TOP", elo: "Prata", capitao: true }],
    },
    disponiveis: [
      { id: "p1", riotId: "Alvo#BR1", pontos: 4, rota1: "ADC", rota2: "SUP", elo: "Ouro" },
      { id: "p2", riotId: "Outro#BR1", pontos: 3, rota1: "TOP", rota2: "MID", elo: "Prata" },
    ],
    escolhaAtual: 3,
    totalEscolhas: 8,
    timeDaVezId: "a",
    escolhiveis: ["p1", "p2"],
    prazoISO: new Date(Date.now() + 60_000).toISOString(),
    motivoDaPausa: null,
    sorteioId: "S1",
    orcamentoPorTime: 30,
    jogadoresPorTime: 5,
    historico: [],
    ...over,
  };
}

/** Servidor falso: `estado` responde a sondagem; `aoEscolher` responde o POST. */
function servidor(
  estado: Record<string, unknown>,
  aoEscolher: () => { status: number; corpo: unknown } = () => ({ status: 200, corpo: { ok: true } }),
) {
  const pedidos: Pedido[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const corpo = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
      pedidos.push({ url: String(url), corpo });
      if (String(url).includes("/api/draft/escolha")) {
        const r = aoEscolher();
        return new Response(JSON.stringify(r.corpo), { status: r.status });
      }
      return new Response(JSON.stringify({ agoraServidorISO: new Date().toISOString(), ...estado }), { status: 200 });
    }),
  );
  // jsdom não implementa; o painel usa para não pendurar a sondagem.
  vi.stubGlobal("AbortSignal", { ...AbortSignal, timeout: () => undefined });
  return pedidos;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("DRF-05 · clique com o número da escolha, e nada de clique depois do prazo", () => {
  it("o pedido leva a escolha que a tela mostrava", async () => {
    const pedidos = servidor({ draft: draft(), souCapitaoDe: "a", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    fireEvent.click(await screen.findByRole("button", { name: /Escolher Alvo#BR1/ }));
    await waitFor(() => expect(pedidos.some((p) => p.url.includes("/api/draft/escolha"))).toBe(true));
    expect(pedidos.find((p) => p.url.includes("/api/draft/escolha"))!.corpo).toEqual({ jogadorId: "p1", escolha: 3 });
  });

  it("com o prazo vencido (relógio em 0:00), os botões travam", async () => {
    servidor({
      draft: draft({ prazoISO: new Date(Date.now() - 1_000).toISOString() }),
      souCapitaoDe: "a",
      logado: true,
    });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText(MESSAGES.pt.draft.suaVez);
    await waitFor(() => {
      const botao = screen.getByRole("button", { name: /Escolher Alvo#BR1/ }) as HTMLButtonElement;
      expect(botao.disabled).toBe(true);
    });
  });
});

describe("DRF-11 · recusa no idioma da tela e plural das vagas", () => {
  it("em inglês, a recusa do servidor sai em inglês, com os números", async () => {
    servidor({ draft: draft(), souCapitaoDe: "a", logado: true }, () => ({
      status: 409,
      corpo: {
        error: "Esse jogador custa 9 e você só pode gastar 6 nesta escolha — o resto está reservado para as vagas que faltam.",
        codigo: "acima_do_teto",
        params: { pontos: 9, teto: 6 },
      },
    }));
    render(<PainelCapitao t={MESSAGES.en.draft} />);
    fireEvent.click(await screen.findByRole("button", { name: /Pick Alvo#BR1/ }));
    const aviso = await screen.findByText(/That player costs 9/);
    expect(aviso.textContent).toContain("you can only spend 6");
    expect(screen.queryByText(/Esse jogador custa/)).toBeNull();
  });

  it("código desconhecido cai no texto do servidor", async () => {
    servidor({ draft: draft(), souCapitaoDe: "a", logado: true }, () => ({
      status: 409,
      corpo: { error: "Recado novo do servidor.", codigo: "codigo_que_a_tela_nao_conhece" },
    }));
    render(<PainelCapitao t={MESSAGES.en.draft} />);
    fireEvent.click(await screen.findByRole("button", { name: /Pick Alvo#BR1/ }));
    await screen.findByText("Recado novo do servidor.");
  });

  it("'4 vagas abertas' no plural e '1 vaga aberta' no singular", async () => {
    // Sou o capitão de b; é a vez de a (4 vagas), e c tem 1 vaga.
    servidor({ draft: draft({ timeDaVezId: "a" }), souCapitaoDe: "b", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText(MESSAGES.pt.draft.aguardeSuaVez, { selector: "h2" });
    const texto = document.body.textContent ?? "";
    expect(texto).toContain("4 vagas abertas");
    expect(texto).toContain("1 vaga aberta");
    expect(texto).not.toMatch(/4 vaga aberta(?!s)/);
    expect(texto).not.toMatch(/1 vagas abertas/);
  });

  it("em inglês, 'open slots' no plural", async () => {
    servidor({ draft: draft({ timeDaVezId: "a" }), souCapitaoDe: "b", logado: true });
    render(<PainelCapitao t={MESSAGES.en.draft} />);
    await screen.findByText(MESSAGES.en.draft.aguardeSuaVez, { selector: "h2" });
    expect(document.body.textContent).toContain("4 open slots");
  });
});

describe("DRF-12 · acessibilidade", () => {
  it("cada «ESCOLHER» diz o jogador e os pontos", async () => {
    servidor({ draft: draft(), souCapitaoDe: "a", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    expect(await screen.findByRole("button", { name: "Escolher Alvo#BR1, 4 pontos" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Escolher Outro#BR1, 3 pontos" })).toBeTruthy();
  });

  it("'É A SUA VEZ' fica numa região viva, e o relógio fica de fora", async () => {
    servidor({ draft: draft(), souCapitaoDe: "a", logado: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    const titulo = await screen.findByText(MESSAGES.pt.draft.suaVez);
    const regiao = titulo.closest('[aria-live="polite"]');
    expect(regiao).not.toBeNull();
    // O cronômetro (M:SS) não está dentro dela: cada tique seria lido.
    expect(regiao!.textContent).not.toMatch(/\d:\d\d/);
  });
});

describe("DRF-09 · o botão de entrar cabe no celular", () => {
  it("quebra linha e não passa da largura do cartão", async () => {
    servidor({ draft: draft(), souCapitaoDe: null, logado: false });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    const link = (await screen.findByText(MESSAGES.pt.draft.entreParaVer)) as HTMLAnchorElement;
    // .lob-btn-gold tem `white-space: nowrap`; o estilo da linha vence a classe.
    expect(link.style.whiteSpace).toBe("normal");
    expect(link.style.maxWidth).toBe("100%");
  });
});

describe("DRF-13 · conta logada sem inscrição", () => {
  it("não lê 'Você não é capitão', e sim como sair dessa", async () => {
    servidor({ draft: draft(), souCapitaoDe: null, logado: true, semInscricao: true });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText(MESSAGES.pt.draft.semInscricao);
    expect(screen.getByText(MESSAGES.pt.draft.semInscricaoTexto)).toBeTruthy();
    expect(screen.queryByText(MESSAGES.pt.draft.naoEhCapitao)).toBeNull();
  });

  it("inscrição que não capitaneia continua lendo 'Você não é capitão'", async () => {
    servidor({ draft: draft(), souCapitaoDe: null, logado: true, semInscricao: false });
    render(<PainelCapitao t={MESSAGES.pt.draft} />);
    await screen.findByText(MESSAGES.pt.draft.naoEhCapitao);
    expect(screen.queryByText(MESSAGES.pt.draft.semInscricao)).toBeNull();
  });
});
