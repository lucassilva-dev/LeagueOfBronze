// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_DESORGANIZACAO } from "@/lib/temas/desorganizacao";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática da Desorganização (28/10/2026), «O Circo da Desorganização»: o time da
 * organização, o leão no pedestal, o nome que se organiza letra por letra (menos o DES) e o
 * capitão de cartola. O que o leitor de tela lê, os textos, a ordem do elenco, a métrica da
 * Smokum, a regra dos enfeites e que os outros três temas não ganharam nada do picadeiro.
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, nick: string, role: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${nick}#BR1`,
    displayNick: nick,
    name: nick,
    imageUrl: `/players/${slug}-4a.webp`,
    mono: false,
    captain: false,
    elo: "Bronze",
    eloMeta: resolveElo("Bronze"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "chama",
    teamName: "DESORGANIZAÇÃO",
    teamSlug: "desorganizacao",
    teamColor: "#FFE14D",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("onigami", "Onigami", "TOP"),
  jogador("nak4y", "nak4y", "JUNG", { captain: true }),
  jogador("r-a-z-e-r-a-l", "R A Z E R A L", "MID"),
  jogador("gaylord", "GayLord", "ADC"),
  jogador("thalao", "THALAO", "SUP"),
];
const TIME: DesignTeam = {
  id: "chama",
  name: "DESORGANIZAÇÃO",
  slug: "desorganizacao",
  color: "#FFE14D",
  imageUrl: "/teams/desorganizacao.webp",
  roster: ROSTER,
  captain: ROSTER[1]!,
  total: 30,
};

function paginaDoTime(tema: TemaDoTime = TEMA_DESORGANIZACAO, time: DesignTeam = TIME) {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={time}
      tema={tema}
      t={t}
      multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
      temporada="4ª Edição"
      periodo="de 13 de novembro a 6 de dezembro"
    />,
  );
}

function ficha(player: DesignPlayer = ROSTER[1]!) {
  return renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={player}
      team={TIME}
      tema={TEMA_DESORGANIZACAO}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/desorganizacao", texto: t.jogadorVoltar }}
    />,
  );
}

/** Todo elemento com classe de enfeite (CSS Modules: `_enfAlgo_hash`) é aria-hidden ou mora num; nenhum tem texto. */
function enfeitesSemTexto(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const problemas: string[] = [];
  for (const el of doc.querySelectorAll("[class]")) {
    if (!/(^|\s|_)enf[A-Z]/.test(el.getAttribute("class") ?? "")) continue;
    if (!el.closest('[aria-hidden="true"]')) problemas.push(`${el.tagName} sem aria-hidden: ${el.getAttribute("class")}`);
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).join("");
    if (texto && !el.closest("svg")) problemas.push(`${el.tagName} com texto: ${texto}`);
  }
  for (const svg of doc.querySelectorAll("svg")) {
    if (!svg.closest('[aria-hidden="true"]')) problemas.push("svg sem aria-hidden");
  }
  return problemas;
}

/** O texto que o leitor de tela ouve: tudo fora de aria-hidden. */
function lidoPeloLeitor(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  for (const oculto of copia.querySelectorAll('[aria-hidden="true"]')) oculto.remove();
  return copia.textContent ?? "";
}

const SMOKUM = METRICAS.smokum!;

describe("registro: o tema da Desorganização", () => {
  it("acha pelo slug; o id do draft (chama) sozinho não tem tema", () => {
    expect(temaDoTime("desorganizacao")).toBe(TEMA_DESORGANIZACAO);
    expect(temaDoTime("chama")).toBeNull();
  });

  it("a cor do time no site é o ouro do leão coroado; sem o slug, a da CHAMA", () => {
    expect(corDoTime({ id: "chama", slug: "desorganizacao" })).toBe("#FFE14D");
    expect(corDoTime({ id: "chama", slug: "chama" })).toBe("#ef7d34");
  });

  it("o nome é uma palavra só: marca inteira, sem assinatura", () => {
    expect(TEMA_DESORGANIZACAO.prefixo).toBeUndefined();
    expect(TEMA_DESORGANIZACAO.sufixo).toBeUndefined();
    expect(partesDoNome("DESORGANIZAÇÃO", TEMA_DESORGANIZACAO.prefixo, TEMA_DESORGANIZACAO.sufixo)).toEqual({
      assinatura: null,
      marca: "DESORGANIZAÇÃO",
    });
  });

  it("as fontes do cartaz: Smokum no título e o itálico do mestre de picadeiro na assinatura", () => {
    expect(TEMA_DESORGANIZACAO.fontes).toEqual({ titulo: "smokum", assinatura: "playfair-italico" });
    expect(TEMA_DESORGANIZACAO.cenario).toBe("picadeiro");
    expect(TEMA_DESORGANIZACAO.letraPorLetra).toBe(true);
  });

  it("os textos do tema saem no idioma da página; a tarja fica em pt nos dois", () => {
    expect(textoDoTema(TEMA_DESORGANIZACAO, t, "capitao")).toBe("MESTRE DE PICADEIRO");
    expect(textoDoTema(TEMA_DESORGANIZACAO, MESSAGES.en.paginasHome, "capitao")).toBe("RINGMASTER");
    expect(textoDoTema(TEMA_DESORGANIZACAO, t, "estrelando")).toBe("AS ATRAÇÕES");
    expect(textoDoTema(TEMA_DESORGANIZACAO, MESSAGES.en.paginasHome, "estrelando")).toBe("TONIGHT'S ACTS");
    expect(textoDoTema(TEMA_DESORGANIZACAO, t, "companheiros")).toBe("O RESTO DA TRUPE");
    expect(textoDoTema(TEMA_DESORGANIZACAO, MESSAGES.en.paginasHome, "companheiros")).toBe("THE REST OF THE TROUPE");
    expect(textoDoTema(TEMA_DESORGANIZACAO, t, "carimbo")).toBe("SUJEITO A ATRASO");
    expect(textoDoTema(TEMA_DESORGANIZACAO, MESSAGES.en.paginasHome, "carimbo")).toBe("SUJEITO A ATRASO");
  });

  it("todo papel de texto do tema existe nos dois idiomas", () => {
    for (const chave of Object.values(TEMA_DESORGANIZACAO.textos ?? {})) {
      expect(MESSAGES.pt.paginasHome[chave], chave).toBeTruthy();
      expect(MESSAGES.en.paginasHome[chave], chave).toBeTruthy();
    }
    expect(Object.keys(TEMA_DESORGANIZACAO.textos ?? {})).toHaveLength(9);
  });

  it("cada atração tem o rosto enquadrado (foco por slug)", () => {
    expect(Object.keys(TEMA_DESORGANIZACAO.fotos.foco ?? {}).sort()).toEqual(["gaylord", "nak4y", "onigami", "r-a-z-e-r-a-l", "thalao"]);
    expect(TEMA_DESORGANIZACAO.fotos.formato).toBeUndefined();
  });
});

describe("a largura medida da Smokum (lib/temas/metricas.ts)", () => {
  it("DESORGANIZAÇÃO = 5,568 em de avanço + 14 × 0,01 + 0,22 de sobra = 5,928 em", () => {
    expect(maiorPalavraEm("Desorganização", SMOKUM)).toBe(5.928);
    expect(maiorPalavraEm("DESORGANIZAÇÃO", SMOKUM)).toBe(5.928); // o acento decomposto vira um só
  });

  it("caractere fora da tabela conta como 1 em (nunca estoura)", () => {
    expect(larguraEm("ㅤ", SMOKUM)).toBe(1.23); // 1 + 0,01 + 0,22
    expect(SMOKUM.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(SMOKUM.avancos)));
  });

  it("a maior palavra do elenco é GAYLORD (o tamanho dos nicks nas cartas)", () => {
    expect(Math.max(...ROSTER.map((p) => maiorPalavraEm(p.displayNick, SMOKUM)))).toBe(3.165);
  });

  it("nick da ficha: R A Z E R A L em duas linhas (R A Z / E R A L), o resto numa", () => {
    expect(larguraDoNickEm("R A Z E R A L", SMOKUM)).toBe(2.546);
    expect(larguraDoNickEm("Onigami", SMOKUM)).toBe(3.034);
    expect(larguraDoNickEm("GayLord", SMOKUM)).toBe(3.165);
    expect(larguraDoNickEm("THALAO", SMOKUM)).toBe(2.724);
    expect(larguraDoNickEm("nak4y", SMOKUM)).toBe(2.42);
  });
});

describe("página temática da Desorganização", () => {
  it("o leitor de tela lê o nome uma vez; as 14 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("DESORGANIZAÇÃO");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(14);
    expect(visual.getAttribute("style")).toContain("--largura-em:5.928");
    // Sem prefixo nem sufixo: nada de assinatura pequena (o DES torto é só CSS).
    expect(visual.querySelector('[class*="assinatura"]')).toBeNull();
  });

  it("as três primeiras letras são D, E e S, as que o CSS entorta", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const letras = [...doc.querySelectorAll('h1 [class*="palavra"] > [class*="letra"]')];
    expect(letras.slice(0, 3).map((l) => l.querySelector('[class*="cromo"]')!.textContent)).toEqual(["D", "E", "S"]);
  });

  it("as atrações: TOP, MID, ADC, SUP e o mestre de picadeiro (o capitão) por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["Onigami", "R A Z E R A L", "GayLord", "THALAO", "nak4y"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:3.165");
  });

  it("os textos do tema aparecem; MESTRE DE PICADEIRO na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "Respeitável público: o espetáculo vai começar (com 40 minutos de atraso).",
      "AS ATRAÇÕES",
      "Não tentem isso em casa (nem no banheiro).",
      "MESTRE DE PICADEIRO",
      "Meia-entrada para Bronze · proibido alimentar o leão", // espaço fixo: o «·» não abre linha
      "SOB A LONA DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Reclamações: falar com a organização. (Somos nós.)",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("MESTRE DE PICADEIRO");
    const tarja = [...doc.querySelectorAll("p")].find((p) => p.textContent === "SUJEITO A ATRASO")!;
    expect(tarja.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário picadeiro: cortina atrás do elenco, pedestal e canhão no escudo, fotos em retrato", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="desorganizacao"');
    expect(html).toContain('data-cenario="picadeiro"');
    expect(html).not.toContain("data-fotos");
    expect(html).toMatch(/enfCortina/);
    expect(html).toMatch(/enfPedestal/);
    expect(html).toMatch(/enfCanhao/);
    expect(html).toMatch(/enfEstrelasCartaz/);
    expect(html).toMatch(/enfSanefa/);
    expect(html).toMatch(/enfOlho/);
    expect(html).not.toMatch(/enfLousa|enfTela|enfCoroa|enfLua|enfTrilhos|enfLetreiro/);
  });

  it("a cartola do mestre de picadeiro só no cartaz do capitão", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const cartas = [...doc.querySelectorAll("li")];
    expect(cartas.map((li) => li.querySelector('svg[class*="coroaDoCapitao"]') !== null)).toEqual([false, false, false, false, true]);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(20);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });

  it("em inglês: as atrações, o mestre de picadeiro e a lona", () => {
    const html = renderToStaticMarkup(
      <PaginaDoTimeComTema
        team={TIME}
        tema={TEMA_DESORGANIZACAO}
        t={MESSAGES.en.paginasHome}
        multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
        temporada="4th Edition"
        periodo="from November 13 to December 6"
      />,
    );
    const texto = new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
    for (const trecho of ["TONIGHT'S ACTS", "RINGMASTER", "UNDER THE BIG TOP FROM NOVEMBER 13 TO DECEMBER 6", "SUJEITO A ATRASO", "(That's us.)"]) {
      expect(texto).toContain(trecho);
    }
  });
});

describe("os outros temas não ganham nada do picadeiro", () => {
  it.each([TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR])("$slug: sem cortina, pedestal, canhão nem sanefa", (tema) => {
    const html = paginaDoTime(tema, { ...TIME, name: "EQUIPE RX", slug: tema.slug });
    expect(html).not.toMatch(/enfCortina|enfPedestal|enfCanhao|enfSanefa|enfPublico|enfEstrelasCartaz/);
    expect(html).not.toContain('data-cenario="picadeiro"');
  });
});

describe("ficha temática de um jogador da Desorganização", () => {
  it("o nick é o h1, lido uma vez, com a largura medida; O RESTO DA TRUPE com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("nak4y");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:2.42");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual(["/jogadores/onigami", "/jogadores/r-a-z-e-r-a-l", "/jogadores/gaylord", "/jogadores/thalao"]);
    expect(doc.body.textContent).toContain("O RESTO DA TRUPE");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("R A Z E R A L ganha a largura de duas linhas", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[2]!), "text/html");
    expect(doc.querySelector("h1 [aria-hidden]")!.getAttribute("style")).toContain("--largura-nick-em:2.546");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (a cartola é só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/nak4y"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (os raios atrás do retrato também)", () => {
    const html = ficha();
    expect(html).toMatch(/enfRaiosRetrato/);
    expect(html).toMatch(/enfSanefa/);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o CSS do picadeiro", () => {
  const ler = (arquivo: string) =>
    readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const css = ler("picadeiro.module.css");
  const cssFicha = ler("picadeiro-ficha.module.css");
  const keyframe = (fonte: string, nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(fonte)?.[1] ?? "";
  const declaradas = (corpo: string) =>
    new Set([...corpo.matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]).filter((p) => p !== "animation-timing-function"));

  it("as três primeiras letras declaram o torto como transform de repouso e usam palhacos + tremelique", () => {
    expect(css).toMatch(
      /\.raiz \.palavra > \.letra:nth-child\(-n \+ 3\) \{[^}]*transform: translateY\(var\(--y\)\) rotate\(var\(--r\)\);[^}]*animation-name: palhacos, tremelique;/,
    );
  });

  it("tremelique só mexe em rotate, e o 1º pulso cai aos ~4,2 s de 11 s (o herói ainda no vídeo)", () => {
    const corpo = keyframe(css, "tremelique");
    expect(declaradas(corpo)).toEqual(new Set(["rotate"]));
    expect(corpo).toMatch(/0%,\s*38% \{\s*rotate: 0deg;/);
    expect(corpo).toMatch(/40% \{\s*rotate: 3deg;/);
    expect(corpo).toMatch(/47%,\s*100% \{\s*rotate: 0deg;/);
  });

  it("organiza termina em transform: none; o salto do leão é 2D", () => {
    expect(keyframe(css, "organiza")).toMatch(/100% \{\s*transform: none;/);
    const salto = keyframe(css, "saltoDoLeao");
    expect(salto).toContain("transform");
    expect(salto).not.toMatch(/translate3d|scale3d|rotate3d|perspective/);
  });

  it("nenhum keyframe de conteúdo do picadeiro usa 3D", () => {
    for (const [fonte, nomes] of [
      [css, ["saltoDoLeao", "organiza", "palhacos", "cartazBalanca", "cartazBalancaRelogio", "tarjaCola"]],
      [cssFicha, ["cartazDesce", "nickOrganiza", "cartazinhoCai"]],
    ] as const) {
      for (const nome of nomes) {
        const corpo = keyframe(fonte, nome);
        expect(corpo, nome).toContain("transform");
        expect(corpo, nome).not.toMatch(/translate3d|scale3d|rotate3d|perspective/);
      }
    }
  });

  it("os trapézios balançam com nome próprio (trapezioBalanca)", () => {
    expect(css).toMatch(/@keyframes trapezioBalanca\b/);
    expect(css).not.toMatch(/@keyframes balanca\b/);
  });

  it("as reservas da Smokum (mais estreitas) moram no módulo", () => {
    expect(css).toMatch(/@font-face \{\s*font-family: "Smokum Reserva Estreita";[^}]*size-adjust: 60%;/);
    expect(css).toMatch(/@font-face \{\s*font-family: "Smokum Reserva";[^}]*size-adjust: 48%;/);
  });

  it("a moldura de papel do cartaz também abre a ficha (o ::after do link cobre o padding da carta)", () => {
    expect(css).toMatch(/\.raiz \.carta \{[^}]*padding: 5px;/);
    expect(css).toMatch(/\.raiz \.link::after \{\s*inset: -5px;/);
  });

  it("na ficha, tela baixa no computador (1440×810): o cartaz encolhe e cabe na 1ª dobra", () => {
    expect(cssFicha).toMatch(
      /@media \(min-width: 1024px\) and \(max-height: 860px\) \{\s*\.raiz \.retratoCasca \{\s*width: min\(100% - 24px, 400px\);\s*\}\s*\.raiz \.retratoCapitao \{\s*margin-top: 58px;/,
    );
    // Depois da regra base do retrato (mesma especificidade: vence a ordem).
    expect(cssFicha.indexOf("and (max-height: 860px)")).toBeGreaterThan(cssFicha.indexOf("width: min(100% - 24px, 470px)"));
  });

  it("na ficha, celular baixo (405×720): o cartaz do capitão encolhe pela altura e o kicker cabe na 1ª dobra", () => {
    expect(cssFicha).toMatch(
      /@media \(max-width: 599px\) and \(max-height: 760px\) \{\s*\.raiz \.retratoCasca\.retratoCapitao \{\s*width: clamp\(230px, 33svh, min\(100% - 24px, 470px\)\);/,
    );
  });

  it("tela baixa no computador: o herói encolhe para caber na 1ª dobra (1440×810 do vídeo, 1536×864, 1440×900)", () => {
    expect(css).toMatch(
      /@media \(min-width: 1024px\) and \(max-height: 956px\) \{\s*\.raiz \.heroiGrade \{\s*--escudo: clamp\(200px, 27svh, 300px\);\s*\}\s*\.raiz \.tituloVisual \{\s*--tm-titulo-max: min\(168px, 13svh\);/,
    );
    // Depois da regra de 1024 que declara o mesmo --tm-titulo-max (vence a ordem).
    expect(css.indexOf("and (max-height: 956px)")).toBeGreaterThan(css.indexOf("--tm-titulo-max: min(168px, 14svh)"));
  });
});
