// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PainelEdicao, type DadosEdicao, type EdicaoConfig, type SecaoEdicao } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";

/**
 * O rascunho da Configuração diante da busca que chega DEPOIS de a pessoa começar a digitar
 * (DIFF-UI-03).
 *
 * O `PainelEdicao` busca a edição de novo a cada troca de aba, mas desenha a aba nova na hora
 * com os dados que já tinha. A Configuração refazia o rascunho sempre que `dados.config`
 * mudava de IDENTIDADE: no celular (4G, 1–3 s), quem entrava na aba e digitava a chave Pix
 * via o campo voltar a vazio quando a resposta chegava — com a mesma configuração.
 *
 * Agora: resposta com os mesmos valores não toca no rascunho; resposta com valores novos traz
 * só os campos que o servidor mudou e preserva o que a pessoa editou nos outros.
 */

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function config(over: Partial<EdicaoConfig> = {}): EdicaoConfig {
  return {
    nome: "4ª Edição",
    abertura_inscricoes: null,
    fechamento_inscricoes: null,
    prazo_vinculo_riot: null,
    congelamento_elo: null,
    data_draft: null,
    inicio_campeonato: null,
    inscricoes_abertas: true,
    jogadores_por_time: 5,
    orcamento_por_time: 30,
    min_ranqueadas: 5,
    dias_no_grupo: 60,
    prazo_pagamento_dias: 14,
    segundos_por_escolha: 60,
    taxa_centavos: 2000,
    pct_campeao: 70,
    chave_pix: null,
    responsavel_financeiro: null,
    ...over,
  } as EdicaoConfig;
}

function dados(c: EdicaoConfig = config()): DadosEdicao {
  return {
    config: c,
    inscritos: [],
    conferencias: [],
    pagamentos: [],
    panorama: {
      inscritos: 0,
      elegiveis: 0,
      aprovados: 0,
      pendentes: 0,
      recusados: 0,
      times: 0,
      vagas: 0,
      sobra: 0,
      caixa: { recebido: 0, estornado: 0, aDevolver: 0, emCaixa: 0, arrecadado: 0, aReceber: 0, isento: 0 },
    },
    auditoria: [],
  } as DadosEdicao;
}

/** O que o painel faz: o MESMO <PainelEdicao> para as abas, trocando só `secao` e o render. */
function Painel() {
  const [secao, setSecao] = useState<SecaoEdicao>("inscritos");
  return (
    <>
      <button type="button" onClick={() => setSecao("config")}>
        ir para configuração
      </button>
      <PainelEdicao
        secao={secao}
        onAlert={() => {}}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(props) => (secao === "config" ? <SecaoConfiguracao {...props} /> : <p>aba inscritos</p>)}
      />
    </>
  );
}

/**
 * 1ª busca (abrir Inscritos) responde na hora; a 2ª (trocar para Configuração) fica pendurada
 * até o teste soltar — é a rede do celular — e responde com `segunda`.
 */
function servidorComBuscaPendurada(segunda: EdicaoConfig) {
  let soltar: (() => void) | null = null;
  let chamadas = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      chamadas += 1;
      const corpo = chamadas >= 2 ? dados(segunda) : dados();
      if (chamadas >= 2) await new Promise<void>((r) => (soltar = r));
      return { ok: true, status: 200, json: async () => corpo } as unknown as Response;
    }),
  );
  vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
  return {
    chamadas: () => chamadas,
    soltar: async () => {
      await act(async () => {
        soltar?.();
        await Promise.resolve();
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });
    },
  };
}

const campo = (rotulo: RegExp) => screen.getByLabelText(rotulo) as HTMLInputElement;

async function entrarEDigitarAChavePix() {
  render(<Painel />);
  await screen.findByText("aba inscritos");
  fireEvent.click(screen.getByRole("button", { name: "ir para configuração" }));
  // A aba aparece JÁ (com os dados que o contêiner tinha), e a pessoa digita.
  fireEvent.change(await screen.findByLabelText(/Chave Pix/), { target: { value: "+5511987654321" } });
  expect(campo(/Chave Pix/).value).toBe("+5511987654321");
}

describe("Configuração: a busca da troca de aba não apaga o que se digita", () => {
  it("resposta com a MESMA configuração mantém a chave Pix digitada (e o «Salvar» continua com o que mandar)", async () => {
    const servidor = servidorComBuscaPendurada(config());
    await entrarEDigitarAChavePix();
    expect(servidor.chamadas()).toBe(2);

    await servidor.soltar();

    expect(campo(/Chave Pix/).value).toBe("+5511987654321");
    expect(screen.getAllByText("alterações não salvas").length).toBeGreaterThan(0);
  });

  it("resposta com OUTRO campo mudado traz esse campo do servidor e preserva a edição da pessoa", async () => {
    // Outra pessoa mudou o responsável financeiro enquanto esta digitava a chave Pix.
    const servidor = servidorComBuscaPendurada(config({ responsavel_financeiro: "Tesoureiro" }));
    await entrarEDigitarAChavePix();

    await servidor.soltar();

    expect(campo(/Respons/).value).toBe("Tesoureiro");
    expect(campo(/Chave Pix/).value).toBe("+5511987654321");
  });

  it("campo que o servidor mudou vem do servidor (é o caso de quem acabou de salvar)", async () => {
    const servidor = servidorComBuscaPendurada(config({ chave_pix: "fulano@exemplo.com" }));
    await entrarEDigitarAChavePix();

    await servidor.soltar();

    expect(campo(/Chave Pix/).value).toBe("fulano@exemplo.com");
  });
});

/**
 * INS-06: a chave Pix ambígua é recusada pelo servidor (400) com o motivo. O motivo ia só
 * para o aviso do topo — no monitor, fora da tela de quem salvou lá no fim da página.
 */
describe("Configuração: chave Pix recusada", () => {
  const MOTIVO =
    "Chave Pix: se for telefone, comece com +55 (ex.: +5511987654321); se for CPF ou CNPJ, confira os números.";

  function servidorQueRecusa() {
    const fetch = vi.fn(async (_url: string, init?: { method?: string }) =>
      init?.method === "PATCH"
        ? ({ ok: false, status: 400, json: async () => ({ error: MOTIVO }) } as unknown as Response)
        : ({ ok: true, status: 200, json: async () => dados() } as unknown as Response),
    );
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} }));
    return fetch;
  }

  function Configuracao({ onAlert = () => {} }: { onAlert?: (k: "ok" | "erro", t: string) => void }) {
    return (
      <PainelEdicao
        secao="config"
        onAlert={onAlert}
        podeConferir
        podeFinanceiro
        podeConfigurar
        render={(props) => <SecaoConfiguracao {...props} />}
      />
    );
  }

  it("o motivo aparece junto do «Salvar», e o que foi digitado continua no campo", async () => {
    const fetch = servidorQueRecusa();
    const onAlert = vi.fn();
    render(<Configuracao onAlert={onAlert} />);
    fireEvent.change(await screen.findByLabelText(/Chave Pix/), { target: { value: "11987654321" } });

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" })));

    const [, init] = fetch.mock.calls.find(([, i]) => i?.method === "PATCH")!;
    expect(JSON.parse((init as { body: string }).body)).toEqual({ acao: "config", dados: { chave_pix: "11987654321" } });
    expect(screen.getByText(`Não salvou: ${MOTIVO}`)).toBeTruthy();
    expect(onAlert).toHaveBeenCalledWith("erro", MOTIVO);
    expect(campo(/Chave Pix/).value).toBe("11987654321");
  });

  it("sem falha, nada de «Não salvou»", async () => {
    servidorComBuscaPendurada(config());
    render(<Configuracao />);
    await screen.findByLabelText(/Chave Pix/);
    expect(screen.queryByText(/Não salvou/)).toBeNull();
  });
});
