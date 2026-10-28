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
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_OS_5_FURIOSOS } from "@/lib/temas/os-5-furiosos";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática dos Os 5 Furiosos (28/10/2026), «A Figurinha Brilhante»: a página do time no álbum
 * de figurinhas — o pôster é a foto do time colada na vaga, FURIOSOS é colado letra por letra no tapa,
 * o capitão é a BRILHANTE e a página fecha no pacotinho «nas bancas». O que o leitor de tela lê, os
 * textos, a largura MEDIDA da Lilita One, a ordem do elenco, a regra dos enfeites, os ajustes do juiz
 * (cor, conteúdo em 2D, orçamento de laços) — e que RX, Queijo Minas e Galácticos não ganharam nada disso.
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
    elo: "Platina",
    eloMeta: resolveElo("Platina"),
    pts: 5,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "arcana",
    teamName: "OS 5 FURIOSOS",
    teamSlug: "os-5-furiosos",
    teamColor: "#E27CFE",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("bety-clarao", "BETY CLARAO", "TOP", { elo: "Ouro", eloMeta: resolveElo("Ouro"), pts: 4 }),
  jogador("samuel-venancio", "SAMUEL VENÂNCIO", "JUNG"),
  jogador("satoshi", "Satoshi", "MID"),
  jogador("gabriel-bontempo", "gabriel bontempo", "ADC", { elo: "Diamante", eloMeta: resolveElo("Diamante"), pts: 8 }),
  jogador("peidei-caldinho", "Peidei caldinho", "SUP", { elo: "Diamante", eloMeta: resolveElo("Diamante"), pts: 8, captain: true }),
];
const TIME: DesignTeam = {
  id: "arcana",
  name: "OS 5 FURIOSOS",
  slug: "os-5-furiosos",
  color: "#E27CFE",
  imageUrl: "/teams/os-5-furiosos.webp",
  roster: ROSTER,
  captain: ROSTER[4]!,
  total: 30,
};

function paginaDoTime(tema: TemaDoTime = TEMA_OS_5_FURIOSOS, time: DesignTeam = TIME, textos = t) {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={time}
      tema={tema}
      t={textos}
      multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
      temporada="4ª Edição"
      periodo="de 13 de novembro a 6 de dezembro"
    />,
  );
}

function ficha(player: DesignPlayer = ROSTER[4]!) {
  return renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={player}
      team={TIME}
      tema={TEMA_OS_5_FURIOSOS}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/os-5-furiosos", texto: t.jogadorVoltar }}
    />,
  );
}

/** Os textos que os SVG decorativos do álbum imprimem (aria-hidden, como o neon dos Galácticos). */
const IMPRESSOS_DO_ALBUM = new Set(["5F 1", "FOTO DO TIME", "5F", "FIGURINHAS"]);

/** Todo elemento com classe de enfeite (CSS Modules: `_enfAlgo_hash`) é aria-hidden ou mora num. */
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

const LILITA = METRICAS["lilita-one"]!;

describe("registro: o tema dos Os 5 Furiosos", () => {
  it("acha pelo slug; o id do draft (arcana) sozinho não tem tema", () => {
    expect(temaDoTime("os-5-furiosos")).toBe(TEMA_OS_5_FURIOSOS);
    expect(temaDoTime("arcana")).toBeNull();
  });

  it("a cor do time no site é o orquídea #E27CFE (ajuste do juiz); sem o slug, a da ARCANA", () => {
    expect(corDoTime({ id: "arcana", slug: "os-5-furiosos" })).toBe("#E27CFE");
    expect(corDoTime({ id: "arcana", slug: "arcana" })).toBe("#9a6ae0");
    // os roxos de DENTRO da página não são a cor do time
    expect(TEMA_OS_5_FURIOSOS.cores.primaria).toBe("#9B5CFF");
    expect(TEMA_OS_5_FURIOSOS.cores.neon).toBe("#C77DFF");
  });

  it("parte o nome pelo prefixo, em qualquer caixa: OS 5 no selo, FURIOSOS em adesivos", () => {
    expect(partesDoNome("OS 5 FURIOSOS", "OS 5")).toEqual({ assinatura: "OS 5", marca: "FURIOSOS" });
    expect(partesDoNome("Os 5 Furiosos", "OS 5")).toEqual({ assinatura: "Os 5", marca: "Furiosos" });
    expect(TEMA_OS_5_FURIOSOS.letraPorLetra).toBe(true);
    expect(TEMA_OS_5_FURIOSOS.cenario).toBe("album");
    expect(TEMA_OS_5_FURIOSOS.fontes).toEqual({ titulo: "lilita-one", assinatura: "baloo-2" });
  });

  it("os 9 textos do tema saem no idioma da página; o selo do pacotinho fica em português", () => {
    const en = MESSAGES.en.paginasHome;
    const esperado: [Parameters<typeof textoDoTema>[2], string, string][] = [
      ["lema", "Tem um gosto meio roxo!", "It tastes kinda purple!"],
      ["estrelando", "FIGURINHAS DO TIME", "TEAM STICKERS"],
      ["aviso", "Falta uma: a da taça.", "Still missing one: the trophy."],
      ["capitao", "BRILHANTE", "SHINY"],
      ["emCartaz", "NAS BANCAS {periodo}", "ON NEWSSTANDS {periodo}"],
      ["destino", "PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE", "PACK OF 5 STICKERS · 1 SHINY"],
      ["carimbo", "SABOR MEIO ROXO", "SABOR MEIO ROXO"],
      ["fecho", "Troco repetida por vitória.", "Will trade duplicates for wins."],
      ["companheiros", "COMPLETE O TIME", "COMPLETE THE TEAM"],
    ];
    for (const [papel, pt, ingles] of esperado) {
      expect(textoDoTema(TEMA_OS_5_FURIOSOS, t, papel)).toBe(pt);
      expect(textoDoTema(TEMA_OS_5_FURIOSOS, en, papel)).toBe(ingles);
    }
  });

  it("o foco das fotos acerta o rosto (retratos, não medalhões)", () => {
    expect(TEMA_OS_5_FURIOSOS.fotos.formato).toBeUndefined();
    expect(TEMA_OS_5_FURIOSOS.fotos.proporcao).toBeUndefined();
    expect(TEMA_OS_5_FURIOSOS.fotos.foco).toEqual({
      "bety-clarao": "55% 30%",
      "samuel-venancio": "50% 20%",
      satoshi: "50% 30%",
      "gabriel-bontempo": "50% 8%",
      "peidei-caldinho": "50% 22%",
    });
  });
});

describe("a largura medida da Lilita One (lib/temas/metricas.ts)", () => {
  it("FURIOSOS = 4,573 em de avanço + 8 × 0,06 + 0,3 de recorte e giro = 5,353 em", () => {
    expect(maiorPalavraEm("FURIOSOS", LILITA)).toBe(5.353);
    expect(maiorPalavraEm("Furiosos", LILITA)).toBe(5.353);
  });

  it("caractere fora da tabela conta como o mais largo medido (nunca estoura)", () => {
    expect(larguraEm("ㅤ", LILITA)).toBe(1.36); // 1 + 0,06 + 0,3
    expect(LILITA.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(LILITA.avancos)));
  });

  it("nick da ficha: até duas linhas, só entre palavras; Satoshi numa linha", () => {
    expect(larguraDoNickEm("BETY CLARAO", LILITA)).toBe(4.252); // BETY / CLARAO (0,61 < 0,62)
    expect(larguraDoNickEm("SAMUEL VENÂNCIO", LILITA)).toBe(5.571);
    expect(larguraDoNickEm("Satoshi", LILITA)).toBe(4.708);
    expect(larguraDoNickEm("gabriel bontempo", LILITA)).toBe(5.886);
    expect(larguraDoNickEm("Peidei caldinho", LILITA)).toBe(5.464); // PEIDEI / CALDINHO (0,60)
  });

  it("um acento gravado decomposto mede como o composto (VENÂNCIO em NFD)", () => {
    expect(larguraDoNickEm("SAMUEL VENÂNCIO".normalize("NFD"), LILITA)).toBe(5.571);
  });

  it("a Knewave dos Galácticos continua igual; RX e Queijo Minas continuam sem métrica", () => {
    expect(maiorPalavraEm("GALÁCTICOS", METRICAS.knewave!)).toBe(5.86);
    expect(METRICAS[TEMA_EQUIPE_RX.fontes.titulo]).toBeUndefined();
    expect(METRICAS[TEMA_QUEIJO_MINAS.fontes.titulo]).toBeUndefined();
  });
});

describe("página temática dos Os 5 Furiosos", () => {
  it("o leitor de tela lê o nome uma vez; as 8 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("OS 5 FURIOSOS");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(8);
    expect(visual.getAttribute("style")).toContain("--largura-em:5.353");
    // o selo OS 5 é a assinatura (o pincel) com os dois brilhinhos
    expect(visual.querySelector('[class*="pincel"]')!.textContent).toBe("OS 5");
    expect(visual.querySelector('[class*="enfTraco"]')).not.toBeNull();
  });

  it("as figurinhas: TOP, SEL, MID, ADC e a BRILHANTE (o capitão) por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["BETY CLARAO", "SAMUEL VENÂNCIO", "Satoshi", "gabriel bontempo", "Peidei caldinho"]);
    expect([...doc.querySelectorAll('li a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"))).toEqual([
      "/jogadores/bety-clarao",
      "/jogadores/samuel-venancio",
      "/jogadores/satoshi",
      "/jogadores/gabriel-bontempo",
      "/jogadores/peidei-caldinho",
    ]);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:5.886");
  });

  it("os textos do tema aparecem; BRILHANTE na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "Tem um gosto meio roxo!",
      "FIGURINHAS DO TIME",
      "Falta uma: a da taça.",
      "BRILHANTE",
      "PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE",
      "4ª EDIÇÃO · NAS BANCAS DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Troco repetida por vitória.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    // «BRILHANTE» só é lido dentro do destino do pacotinho (texto da cartela), nunca como rótulo do capitão
    expect(lido.replace("PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE", "")).not.toContain("BRILHANTE");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "SABOR MEIO ROXO")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("em inglês, a página troca os textos e o selo continua «SABOR MEIO ROXO»", () => {
    const html = paginaDoTime(TEMA_OS_5_FURIOSOS, TIME, MESSAGES.en.paginasHome);
    expect(html).toContain("It tastes kinda purple!");
    expect(html).toContain("TEAM STICKERS");
    expect(html).toContain("SABOR MEIO ROXO");
  });

  it("o cenário album: folha que vira, vaga, pacotinho, aro holográfico; retratos sem medalhão", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="os-5-furiosos"');
    expect(html).toContain('data-cenario="album"');
    expect(html).not.toContain("data-fotos");
    for (const peca of ["enfFolha", "enfVaga", "enfPacote", "enfAro", "enfPicote", "enfFitaHolo", "enfRotuloPacote"]) {
      expect(html).toMatch(new RegExp(peca));
    }
    expect(html).not.toMatch(/enfLousa|enfLua|enfCoroa|enfGrade|enfTrilhos|enfLetreiro/);
  });

  it("dois brilhos na figurinha (o orçamento de laços do herói, juiz J5) e seis estrelas no estouro", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    expect(doc.querySelectorAll('[class*="enfBrilho_"]')).toHaveLength(2);
    expect(doc.querySelectorAll('[class*="enfEstouro"]')).toHaveLength(6);
  });

  it("todo enfeite é aria-hidden e sem texto; o único texto dos SVG é o impresso do álbum", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(25);
    expect(enfeitesSemTexto(html)).toEqual([]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const textosDeSvg = [...doc.querySelectorAll("svg text")].map((x) => x.textContent?.trim() ?? "").filter(Boolean);
    expect(textosDeSvg.length).toBeGreaterThan(0);
    for (const x of textosDeSvg) {
      // o «5F» gigante, o rótulo da vaga, o pacotinho e os versos — mais a sigla da rota gigante da base
      if (!IMPRESSOS_DO_ALBUM.has(x)) expect(["TOP", "SEL", "MID", "ADC", "SUP"]).toContain(x);
    }
  });
});

describe("RX, Queijo Minas e Galácticos não ganham nada do álbum", () => {
  it.each([
    [TEMA_EQUIPE_RX, "EQUIPE RX"],
    [TEMA_QUEIJO_MINAS, "QUEIJO MINAS"],
    [TEMA_GALACTICOS_DO_BAR, "Galácticos do Bar"],
  ] as const)("%#: sem folha, vaga, pacotinho, aro holográfico nem textos do álbum", (tema, nome) => {
    const html = paginaDoTime(tema, { ...TIME, name: nome, slug: tema.slug });
    // o nome exato da classe (`_enfVaga_hash`): o vaga-lume da Queijo Minas é `enfVagaLume`
    expect(html).not.toMatch(/enf(Folha|Vaga|Pacote|AroGira|Picote|FitaHolo|Repetida)_/);
    expect(html).not.toMatch(/album_/);
    expect(html).not.toContain("FIGURINHAS DO TIME");
    expect(html).not.toContain("SABOR MEIO ROXO");
    expect(html).not.toContain("--largura-em:5.353");
  });
});

describe("ficha temática de um jogador dos Os 5 Furiosos", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; COMPLETE O TIME com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("Peidei caldinho");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:5.464");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual([
      "/jogadores/bety-clarao",
      "/jogadores/samuel-venancio",
      "/jogadores/satoshi",
      "/jogadores/gabriel-bontempo",
    ]);
    expect(doc.body.textContent).toContain("COMPLETE O TIME");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
    expect(doc.querySelector('a[href="/times/os-5-furiosos"]')).not.toBeNull();
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (a estrela é só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/peidei-caldinho"]')!)).toContain("CAPITÃO");
  });

  it("atrás do retrato: a vaga e as duas repetidas; todo enfeite é aria-hidden e sem texto", () => {
    const html = ficha();
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll('[class*="enfVagaRetrato"]')).toHaveLength(1);
    expect(doc.querySelectorAll('svg[class*="enfRepetida_"]')).toHaveLength(2);
    expect(html).not.toContain("data-fotos");
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o CSS do álbum segue os ajustes do juiz", () => {
  const ler = (arquivo: string) =>
    readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const pagina = ler("album.module.css");
  const daFicha = ler("album-ficha.module.css");
  const keyframe = (css: string, nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";

  it("conteúdo em 2D: nenhum translate3d/perspective nos keyframes de entrada (o WebKit apaga o background-clip)", () => {
    for (const nome of ["colaFoto", "bafo", "bafoSelo", "balaoPula", "figurinhaCola", "figurinhaColaRelogio", "pacoteCai", "carimbaSabor"]) {
      const corpo = keyframe(pagina, nome);
      expect(corpo, nome).toContain("transform");
      expect(corpo, nome).not.toMatch(/translate3d|perspective|rotate3d|scale3d|rotateX|rotateY/);
    }
    for (const nome of ["colaRetrato", "bafoNick", "adesivoPop"]) {
      const corpo = keyframe(daFicha, nome);
      expect(corpo, nome).toContain("transform");
      expect(corpo, nome).not.toMatch(/translate3d|perspective|rotate3d|scale3d|rotateX|rotateY/);
    }
    // o 3D mora só na folha que vira (enfeite do palco)
    expect(keyframe(pagina, "folhaVira")).toContain("perspective");
  });

  it("laços infinitos: só aro, faixa e brilhos no herói; cone e selo no elenco; brilho do pacotinho", () => {
    const infinitos = (css: string) =>
      [...css.matchAll(/animation(?:-name)?\s*:\s*([\w-]+)[^;]*;(?:[^}]*animation-iteration-count\s*:\s*infinite)?/g)]
        .filter((m) => /infinite/.test(m[0]))
        .map((m) => m[1]);
    expect(infinitos(pagina).sort()).toEqual(["aroGiraAlbum", "aroGiraAlbum", "faixaPassaAlbum", "piscaAlbum", "pacoteBrilha", "seloGiraAlbum"].sort());
    expect(infinitos(daFicha).sort()).toEqual(["aroGiraAlbumFicha", "seloGiraAlbumFicha"]);
    // cortados pelo juiz: o halo que respira, a fita que corre, o brilho do selo em laço e a 2ª faixa do capitão
    expect(pagina).not.toMatch(/haloDoAlbum|fitaCorre|holoPassa|haloNasce|@keyframes pisca\b/);
  });

  it("o serrilhado do pacotinho: o dente (a cunha opaca) aponta para dentro do ladrilho", () => {
    expect(pagina).toMatch(/mask:\s*conic-gradient\(from 135deg at 50% 0, #000 0 90deg, #0000 0\)/);
    expect(pagina).toMatch(/conic-gradient\(from -45deg at 50% 100%, #000 0 90deg, #0000 0\)/);
  });

  it("a reserva da Lilita One é a Arial a 66% (mais estreita em todo caractere)", () => {
    expect(pagina).toMatch(/@font-face\s*\{\s*font-family: "Lilita One Caixa Alta";[\s\S]*?size-adjust: 66%;/);
    expect(pagina).toMatch(/\.raiz \.marca \{[^}]*font-kerning: none;/);
    expect(daFicha).toMatch(/\.raiz \.nickVisual \{[^}]*font-kerning: none;/);
  });

  it("o retrato da ficha se mede pela altura: o nick (405×720) e a moldura (1440×810) cabem na 1ª dobra do vídeo", () => {
    expect(daFicha).toMatch(/@media \(min-width: 900px\) \{\s*\.raiz \.retratoCasca \{\s*width: min\(100%, 440px, 52svh\);/);
    expect(daFicha).toMatch(
      /@media \(min-width: 900px\) and \(max-width: 1279px\) \{\s*\.raiz \.retratoCasca \{\s*width: min\(100% - 48px, 440px, 52svh\);/,
    );
    expect(daFicha).toMatch(
      /@media \(max-width: 599px\) \{\s*\.raiz \.retratoCasca \{\s*width: min\(100% - 56px, 400px, max\(32svh, 100svh - 490px\)\);/,
    );
  });
});
