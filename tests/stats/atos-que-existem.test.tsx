// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";

import { AtoDosCanais } from "@/components/stats/atos/canais";
import { AtoDoFecho } from "@/components/stats/atos/fecho";
import { AtoDaFornalha } from "@/components/stats/atos/fornalha";
import { AtoDaLiga } from "@/components/stats/atos/liga";
import { AtoDaTempera } from "@/components/stats/atos/tempera";
import { ATOS_DA_FORJA } from "@/components/stats/constantes";
import { Diretor } from "@/components/stats/diretor";
import { PainelDeBordo } from "@/components/stats/painel";
import type { TimeDe } from "@/components/stats/pecas";
import { Forja, type TextosDaTela } from "@/components/stats/provedor";
import { MESSAGES } from "@/lib/i18n/messages";
import { montarDadosDaForja, type DadosDaForja } from "@/lib/stats/forja";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/*
 * UM ATO SEM DADO NÃO É RENDERIZADO: sem jogo com duração não há Têmpera; sem ninguém em jogo
 * não há Canais (é o começo de toda edição, e é o ambiente de teste). O diretor numera os atos
 * que EXISTEM na página — e o trilho dos atos, a barra do celular e a cena 3D têm de contar
 * pela mesma lista. Contando pelos nove fixos, o trilho mostrava rebites de atos que não
 * existem, acendia o errado e mandava a viagem para o ato vizinho.
 */

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

function paginaDe(ids: readonly string[]): HTMLElement {
  const raiz = document.createElement("div");
  raiz.innerHTML = ids.map((ato) => `<section data-ato="${ato}" data-fixa=""></section>`).join("");
  document.body.append(raiz);
  return raiz;
}

describe("o diretor", () => {
  it("antes de montar, o retrato não inventa ato nenhum", () => {
    const retrato = new Diretor().retrato();
    expect(retrato.ids).toEqual([]);
    expect(retrato.total).toBe(0);
  });

  it("o retrato leva os ids dos atos da página, na ordem do documento", () => {
    const diretor = new Diretor();
    diretor.iniciar(paginaDe(["fornalha", "liga", "bigorna", "fecho"]));
    try {
      expect(diretor.retrato().ids).toEqual(["fornalha", "liga", "bigorna", "fecho"]);
      expect(diretor.retrato().total).toBe(4);
      expect(diretor.idsDosAtos()).toBe(diretor.retrato().ids);
    } finally {
      diretor.parar();
    }
  });

  it("recolher os mesmos atos mantém a MESMA lista (quem assina não redesenha à toa)", () => {
    const diretor = new Diretor();
    diretor.iniciar(paginaDe(["fornalha", "fecho"]));
    try {
      const antes = diretor.retrato().ids;
      diretor.recoletar();
      expect(diretor.retrato().ids).toBe(antes);
    } finally {
      diretor.parar();
    }
  });
});

function dataset() {
  const d = copia(cenario());
  d.seriesMatches.find((s) => s.id === "s1")!.games = [
    {
      ...jogo("alfa", [linha(id("alfa", "MID"), 7, 2, 5, { champion: "Ahri" }), ...linhasDoTime("alfa", [1, 2, 1], ["MID"]), ...linhasDoTime("beta", [1, 2, 1])]),
      durationMin: 31,
    },
  ];
  const r = validar(d);
  if (!r.success) throw new Error("cenário inválido");
  return r.data;
}

function montar() {
  const mensagens = MESSAGES.pt;
  const st = mensagens.paginasStats;
  const t: TextosDaTela = { f: mensagens.forja, s: st, localeTag: mensagens.compartilhados.localeTag };
  const dados = montarDadosDaForja(dataset(), { elos: st.elos, rotas: st.rotas, reserva: "Reserva" });
  return { mensagens, t, dados };
}

function Pagina({ dados, t, aviso, lema }: Readonly<{ dados: DadosDaForja; t: TextosDaTela; aviso: string; lema: string }>) {
  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const timeDe: TimeDe = (jogador) => timePorId.get(jogador.timeId) ?? null;
  return (
    <Forja dados={dados} t={t} fontes={{}} somInicial={false} vsInicial={null} portaFechada={false} camadas={<PainelDeBordo />}>
      <AtoDaFornalha dados={dados} t={t} edicao="4ª Edição" aviso={aviso} />
      <AtoDaLiga dados={dados} t={t} timeDe={timeDe} />
      <AtoDosCanais dados={dados} t={t} timeDe={timeDe} />
      <AtoDaTempera dados={dados} t={t} />
      <AtoDoFecho dados={dados} t={t} lema={lema} />
    </Forja>
  );
}

const ancorasDoTrilho = (raiz: HTMLElement) => [...raiz.querySelectorAll("nav a[href^='#ato-']")].map((a) => a.getAttribute("href"));
const atosDaPagina = (raiz: HTMLElement) => [...raiz.querySelectorAll<HTMLElement>("[data-ato]")].map((el) => `#ato-${el.dataset.ato}`);

describe("o trilho dos atos", () => {
  it("com todos os dados, um rebite por ato da página", async () => {
    const { mensagens, t, dados } = montar();
    const { container } = render(<Pagina dados={dados} t={t} aviso={mensagens.conformidade.eloAviso} lema={mensagens.comum.rodapeLema} />);
    expect(atosDaPagina(container)).toEqual(["#ato-fornalha", "#ato-liga", "#ato-canais", "#ato-tempera", "#ato-fecho"]);
    await waitFor(() => expect(ancorasDoTrilho(container)).toEqual(atosDaPagina(container)));
  });

  it("sem jogo com duração não há Têmpera — e o trilho não mostra o rebite dela", async () => {
    const { mensagens, t, dados } = montar();
    const semTempo: DadosDaForja = { ...dados, duracoes: [] };
    const { container } = render(<Pagina dados={semTempo} t={t} aviso={mensagens.conformidade.eloAviso} lema={mensagens.comum.rodapeLema} />);
    expect(atosDaPagina(container)).not.toContain("#ato-tempera");
    await waitFor(() => expect(ancorasDoTrilho(container)).toEqual(atosDaPagina(container)));
    expect(ancorasDoTrilho(container)).not.toContain("#ato-tempera");
  });

  it("sem ninguém em jogo não há Canais nem Têmpera — a barra do celular nomeia o ato certo", async () => {
    const { mensagens, t, dados } = montar();
    const vazio: DadosDaForja = { ...dados, duracoes: [], rotas: [] };
    const { container } = render(<Pagina dados={vazio} t={t} aviso={mensagens.conformidade.eloAviso} lema={mensagens.comum.rodapeLema} />);
    await waitFor(() => expect(ancorasDoTrilho(container)).toEqual(["#ato-fornalha", "#ato-liga", "#ato-fecho"]));
    // os três rebites levam o nome do próprio ato (não o do ato que ocuparia aquele lugar entre os nove)
    const nomes = [...container.querySelectorAll("nav a[href^='#ato-']")].map((a) => a.textContent ?? "");
    expect(nomes[2]).toContain(t.f.atos.fecho.nome);
    expect(nomes.join(" ")).not.toContain(t.f.atos.moldes.nome);
  });

  it("no HTML do servidor (antes de o diretor montar) valem os nove, cada um com a sua âncora", () => {
    const { mensagens, t, dados } = montar();
    const html = renderToStaticMarkup(<Pagina dados={dados} t={t} aviso={mensagens.conformidade.eloAviso} lema={mensagens.comum.rodapeLema} />);
    const ancoras = [...html.matchAll(/<a href="(#ato-[a-z]+)"/g)].map((m) => m[1]);
    expect(ancoras).toEqual(ATOS_DA_FORJA.map((ato) => `#ato-${ato}`));
  });
});
