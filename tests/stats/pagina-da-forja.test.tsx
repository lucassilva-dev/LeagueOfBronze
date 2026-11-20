// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AtoDoArsenal } from "@/components/stats/atos/arsenal";
import { AtoDaBigorna } from "@/components/stats/atos/bigorna";
import { AtoDosCanais } from "@/components/stats/atos/canais";
import { AtoDoFecho } from "@/components/stats/atos/fecho";
import { AtoDaFornalha } from "@/components/stats/atos/fornalha";
import { AtoDaLiga } from "@/components/stats/atos/liga";
import { AtoDosMoldes } from "@/components/stats/atos/moldes";
import { AtoDasPecasRaras } from "@/components/stats/atos/raras";
import { AtoDaTempera } from "@/components/stats/atos/tempera";
import { ATOS_DA_FORJA, escreverPedidoDeVs, lerPedidoDeVs, type PedidoDeVs } from "@/components/stats/constantes";
import { Holofote } from "@/components/stats/holofote";
import { PainelDeBordo } from "@/components/stats/painel";
import { FiltrosDaForja, type TimeDe } from "@/components/stats/pecas";
import { Planilha } from "@/components/stats/planilha";
import { PortaDaFornalha } from "@/components/stats/porta";
import { Forja, type TextosDaTela } from "@/components/stats/provedor";
import { ModoVs } from "@/components/stats/versus";
import { MESSAGES } from "@/lib/i18n/messages";
import { montarDadosDaForja } from "@/lib/stats/forja";

import { cenario, copia, id, jogo, linha, linhasDoTime, validar } from "../torneio/_cenario-regra-6";

/*
 * A PÁGINA /stats renderizada como o servidor a entrega (renderToStaticMarkup): o que tem de
 * estar no HTML antes de qualquer JavaScript — todo texto e todo número, em PT e em EN —, a
 * porta de entrada DEPOIS do conteúdo, o modo VS que abre pelo endereço e a visão em tabela.
 */

function dataset() {
  const d = copia(cenario());
  // s1: ALFA 2x0 BETA, com tempo e campeões. O time GAMA não joga: os cinco «ainda no banco».
  d.seriesMatches.find((s) => s.id === "s1")!.games = [
    {
      ...jogo("alfa", [
        linha(id("alfa", "TOP"), 3, 2, 4, { champion: "Garen" }),
        linha(id("alfa", "JUNGLE"), 9, 1, 6, { champion: "Viego" }),
        linha(id("alfa", "MID"), 7, 2, 5, { champion: "Ahri" }),
        linha(id("alfa", "ADC"), 5, 3, 7, { champion: "Jinx" }),
        linha(id("alfa", "SUP"), 0, 4, 15, { champion: "Karma" }),
        ...linhasDoTime("beta", [2, 5, 3]),
      ]),
      durationMin: 31,
      bans: [{ teamId: "alfa", championName: "Yasuo" }],
    },
    {
      ...jogo("alfa", [
        linha(id("alfa", "TOP"), 2, 1, 9, { champion: "Garen" }),
        linha(id("alfa", "JUNGLE"), 12, 0, 4, { champion: "Viego" }),
        linha(id("alfa", "MID"), 4, 3, 8, { champion: "Lux" }),
        linha(id("alfa", "ADC"), 6, 2, 5, { champion: "Jinx" }),
        linha(id("alfa", "SUP"), 1, 2, 18, { champion: "Lulu" }),
        ...linhasDoTime("beta", [1, 5, 2]),
      ]),
      durationMin: 24,
    },
  ];
  const r = validar(d);
  if (!r.success) throw new Error("cenário inválido");
  return r.data;
}

function montar(idioma: "pt" | "en") {
  const mensagens = MESSAGES[idioma];
  const st = mensagens.paginasStats;
  const t: TextosDaTela = { f: mensagens.forja, s: st, localeTag: mensagens.compartilhados.localeTag };
  const dados = montarDadosDaForja(dataset(), { elos: st.elos, rotas: st.rotas, reserva: "Reserva" });
  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const timeDe: TimeDe = (jogador) => timePorId.get(jogador.timeId) ?? null;
  return { mensagens, t, dados, timeDe };
}

function pagina(idioma: "pt" | "en", opcoes: Readonly<{ porta?: boolean; vs?: PedidoDeVs | null }> = {}) {
  const { mensagens, t, dados, timeDe } = montar(idioma);
  const porta = opcoes.porta ?? false;
  return renderToStaticMarkup(
    <Forja
      dados={dados}
      t={t}
      fontes={{}}
      somInicial={porta ? null : false}
      vsInicial={opcoes.vs ?? null}
      portaFechada={porta}
      camadas={
        <>
          <PainelDeBordo />
          <Holofote />
          <ModoVs />
          {porta ? <PortaDaFornalha edicao="4ª Edição" /> : null}
        </>
      }
    >
      <FiltrosDaForja />
      <AtoDaFornalha dados={dados} t={t} edicao="4ª Edição" aviso={mensagens.conformidade.eloAviso} />
      <AtoDaLiga dados={dados} t={t} timeDe={timeDe} />
      <AtoDosMoldes dados={dados} t={t} fontes={{}} />
      <AtoDasPecasRaras dados={dados} t={t} timeDe={timeDe} />
      <AtoDosCanais dados={dados} t={t} timeDe={timeDe} />
      <AtoDaBigorna />
      <AtoDoArsenal />
      <AtoDaTempera dados={dados} t={t} />
      <AtoDoFecho dados={dados} t={t} lema={mensagens.comum.rodapeLema} />
    </Forja>,
  );
}

/** O texto que um leitor de página vê (sem as marcas). */
function texto(html: string): string {
  const caixa = document.createElement("div");
  caixa.innerHTML = html;
  return caixa.textContent ?? "";
}

describe("a página, como o servidor a entrega", () => {
  const html = pagina("pt");
  const lido = texto(html);
  const { dados, t, mensagens } = montar("pt");

  it("tem os nove atos, na ordem, cada um com a sua âncora", () => {
    const posicoes = ATOS_DA_FORJA.map((ato) => html.indexOf(`id="ato-${ato}"`));
    expect(posicoes.every((p) => p >= 0)).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it("um h1 só, e é o título da página", () => {
    expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
    expect(html).toMatch(new RegExp(`<h1[^>]*>${t.s.statsTitulo}</h1>`));
  });

  it("o resumo está no HTML como número de verdade (não desenhado por script)", () => {
    const r = dados.resumo;
    for (const numero of [r.jogadores, r.pool, r.media, r.monos]) expect(lido).toContain(String(numero));
    expect(lido).toContain(t.s.statsPillJogadores);
    expect(lido).toContain(t.s.statsPillPool);
    expect(lido).toContain(t.s.statsPillMedia);
    expect(lido).toContain(t.s.statsPillMono);
  });

  it("a nota de conformidade dos pontos por elo está na página", () => {
    expect(lido).toContain(mensagens.conformidade.eloAviso);
  });

  it("todo time aparece com o nome e os pontos; todo jogador do elenco tem link para a ficha", () => {
    for (const time of dados.times) {
      expect(lido).toContain(time.marca);
      for (const slug of time.elenco) expect(html).toContain(`href="/jogadores/${slug}"`);
    }
  });

  it("quem ainda não jogou está dito na tela (o ranking não «perde» ninguém)", () => {
    expect(dados.semJogo.length).toBeGreaterThan(0);
    expect(lido).toContain(t.f.bigornaBanco);
    for (const slug of dados.semJogo) expect(lido).toContain(dados.jogadores[slug]!.nick);
  });

  it("leva para /jogadores, /times, /partidas e para a visão em tabela", () => {
    for (const destino of ["/jogadores", "/times", "/partidas", "/stats?modo=tabela"]) expect(html).toContain(`href="${destino}"`);
  });

  it("os comandos do painel de bordo têm nome para o leitor de tela", () => {
    for (const rotulo of [t.f.hudAnterior, t.f.hudProximo, t.f.hudSomLigar, t.f.hudVs, t.f.fechoTabela]) expect(html).toContain(`aria-label="${rotulo}"`);
    expect(html).toContain(`aria-label="${t.f.hudAtos}"`);
  });

  it("sem porta e sem tela cheia quando ninguém pediu", () => {
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("<dialog");
  });
});

describe("em inglês", () => {
  const html = pagina("en");
  const lido = texto(html);
  const en = MESSAGES.en.forja;
  const pt = MESSAGES.pt.forja;

  it("os atos, o painel e as notas saem em inglês", () => {
    for (const ato of ATOS_DA_FORJA) expect(lido).toContain(en.atos[ato].nome);
    expect(lido).toContain(en.bigornaBanco);
    expect(html).toContain(`aria-label="${en.hudVs}"`);
    expect(lido).not.toContain(pt.atos.fornalha.sub);
    expect(lido).not.toContain(pt.bigornaBanco);
  });
});

describe("a porta da fornalha (primeira visita)", () => {
  const html = pagina("pt", { porta: true });
  const f = MESSAGES.pt.forja;

  it("vem no HTML, DEPOIS do conteúdo, e fora dos trechos de busca", () => {
    const porta = html.indexOf('role="dialog"');
    expect(porta).toBeGreaterThan(html.indexOf('id="ato-fecho"'));
    expect(html.slice(porta - 400, porta + 600)).toContain("data-nosnippet");
  });

  it("os dois botões funcionam sem JavaScript (âncora para a raiz da página)", () => {
    expect(html).toContain('id="forja"');
    expect(html.match(/href="#forja"/g) ?? []).toHaveLength(2);
    expect(texto(html)).toContain(f.portaComSom);
    expect(texto(html)).toContain(f.portaSemSom);
  });

  it("o conteúdo NÃO sai inerte do servidor (sem JavaScript a página tem de continuar clicável)", () => {
    const caixa = document.createElement("div");
    caixa.innerHTML = html;
    const conteudo = caixa.querySelector("#forja > div[class*=conteudo]");
    expect(conteudo).not.toBeNull();
    expect(conteudo!.hasAttribute("inert")).toBe(false);
    // (o verso de cada carta é inerte de propósito, até ela virar)
    expect(conteudo!.querySelectorAll("#ato-fornalha [inert], #ato-liga [inert], #ato-moldes [inert]")).toHaveLength(0);
  });

  it("com a porta fechada, o modo VS espera (não abre por baixo dela)", () => {
    const comVs = pagina("pt", { porta: true, vs: { tipo: "times", a: "alfa", b: "beta" } });
    expect(comVs).not.toContain("<dialog");
  });
});

describe("o modo VS pelo endereço", () => {
  it("lê e escreve o pedido (`t:a,b` / `j:a,b`), e ignora lixo", () => {
    const pedidos: PedidoDeVs[] = [
      { tipo: "times", a: "alfa", b: "beta" },
      { tipo: "jogadores", a: "fulano", b: "ciclano" },
      { tipo: "times", a: "alfa" },
    ];
    for (const pedido of pedidos) expect(lerPedidoDeVs(escreverPedidoDeVs(pedido))).toEqual(pedido);
    expect(lerPedidoDeVs("t:,")).toEqual({ tipo: "times", a: undefined, b: undefined });
    for (const lixo of [null, undefined, "", "x:a,b", "alfa,beta", "t"]) expect(lerPedidoDeVs(lixo)).toBeNull();
  });

  it("dois times válidos: a tela de luta já vem montada, com os números dos dois", () => {
    const { dados, t } = montar("pt");
    const [a, b] = [dados.times.find((x) => x.jogos.v > 0)!, dados.times.find((x) => x.jogos.d > 0)!];
    const html = pagina("pt", { vs: { tipo: "times", a: a.slug, b: b.slug } });
    expect(html).toContain("<dialog");
    const lido = texto(html.slice(html.indexOf("<dialog")));
    expect(lido).toContain(`${a.nome} × ${b.nome}`);
    expect(lido).toContain(t.f.vsRotaARota);
    expect(lido).toContain(`${t.f.cartaAbates}: ${a.nome} ${a.abates}, ${b.nome} ${b.abates}`);
    // quem venceu os dois jogos leva o veredito
    expect(lido).toMatch(new RegExp(`${a.nome} leva em \\d+ de \\d+`));
  });

  it("time que não existe: cai no seletor, sem inventar adversário", () => {
    const { t } = montar("pt");
    const html = pagina("pt", { vs: { tipo: "times", a: "alfa", b: "nao-existe" } });
    const lido = texto(html.slice(html.indexOf("<dialog")));
    expect(lido).toContain(t.f.vsEscolha);
    expect(lido).toContain(t.f.vsLutar);
  });

  it("quem ainda não jogou aparece com traço, e a linha não conta para ninguém", () => {
    const { dados, t } = montar("pt");
    const semJogo = dados.jogadores[dados.semJogo[0]!]!;
    const comJogo = Object.values(dados.jogadores).find((j) => j.jogos > 0)!;
    const html = pagina("pt", { vs: { tipo: "jogadores", a: comJogo.slug, b: semJogo.slug } });
    const lido = texto(html.slice(html.indexOf("<dialog")));
    expect(lido).toContain(`${t.f.cartaAbates}: ${comJogo.nick} ${comJogo.abates}, ${semJogo.nick} —`);
    expect(lido).not.toMatch(/leva em \d+ de \d+/);
  });
});

describe("a visão em tabela (/stats?modo=tabela)", () => {
  const { dados, t, mensagens } = montar("pt");
  const html = renderToStaticMarkup(<Planilha dados={dados} t={t} edicao="4ª Edição" aviso={mensagens.conformidade.eloAviso} />);
  const caixa = document.createElement("div");
  caixa.innerHTML = html;

  it("é feita de tabelas de verdade, cada uma com título e cabeçalhos de coluna", () => {
    const tabelas = [...caixa.querySelectorAll("table")];
    expect(tabelas.length).toBeGreaterThanOrEqual(8);
    for (const tabela of tabelas) {
      expect(tabela.querySelectorAll("thead th[scope=col]").length).toBeGreaterThan(1);
      expect(tabela.closest("section")?.querySelector("h2")?.textContent).toBeTruthy();
    }
  });

  it("o ranking tem UMA linha por jogador do elenco — inclusive quem ainda não jogou", () => {
    const linhas = [...caixa.querySelectorAll("#tabela-ranking ~ div tbody tr, section[aria-labelledby=tabela-ranking] tbody tr")];
    const elenco = Object.values(dados.jogadores).filter((j) => j.noElenco);
    expect(linhas).toHaveLength(elenco.length);
    expect(linhas.filter((l) => l.hasAttribute("data-sem-jogo"))).toHaveLength(dados.semJogo.length);
  });

  it("todo campeão escolhido ou banido está na tabela dos campeões", () => {
    const lido = caixa.querySelector("section[aria-labelledby=tabela-campeoes]")?.textContent ?? "";
    for (const campeao of Object.values(dados.campeoes)) expect(lido).toContain(campeao.nome);
  });

  it("volta ao espetáculo e carrega a nota de conformidade", () => {
    expect(html).toContain('href="/stats"');
    expect(caixa.textContent).toContain(t.f.tabelaVoltar);
    expect(caixa.textContent).toContain(mensagens.conformidade.eloAviso);
  });
});
