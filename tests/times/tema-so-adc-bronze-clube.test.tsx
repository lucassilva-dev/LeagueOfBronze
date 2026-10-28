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
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import { TEMA_SO_ADC_BRONZE_CLUBE } from "@/lib/temas/so-adc-bronze-clube";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática do SO ADC BRONZE CLUBE (28/10/2026), «A Mosca Intacta»: o estande de arco e
 * flecha. O que o leitor de tela lê, os textos, a ordem do elenco, a largura MEDIDA da Alfa Slab One,
 * a regra dos enfeites — e que os outros três temas no ar não ganharam nada do estande.
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
    elo: "Esmeralda",
    eloMeta: resolveElo("Esmeralda"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "verdante",
    teamName: "SO ADC BRONZE CLUBE",
    teamSlug: "so-adc-bronze-clube",
    teamColor: "#FF6A55",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("bobbie-goods", "bobbie goods", "TOP"),
  jogador("famoso-parrudao", "Famoso Parrudao", "JUNG", { captain: true }),
  jogador("presunto", "PRESUNTO", "MID"),
  jogador("weslay", "WeSlay", "ADC"),
  jogador("cacu", "Caçu", "SUP"),
];
const TIME: DesignTeam = {
  id: "verdante",
  name: "SO ADC BRONZE CLUBE",
  slug: "so-adc-bronze-clube",
  color: "#FF6A55",
  imageUrl: "/teams/so-adc-bronze-clube.webp",
  roster: ROSTER,
  captain: ROSTER[1]!,
  total: 29,
};

function paginaDoTime(tema: TemaDoTime = TEMA_SO_ADC_BRONZE_CLUBE, time: DesignTeam = TIME) {
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
      tema={TEMA_SO_ADC_BRONZE_CLUBE}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/so-adc-bronze-clube", texto: t.jogadorVoltar }}
    />,
  );
}

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

const ALFA = METRICAS["alfa-slab-one"]!;

describe("registro: o tema do SO ADC BRONZE CLUBE", () => {
  it("acha pelo slug; o id do draft (verdante) sozinho não tem tema", () => {
    expect(temaDoTime("so-adc-bronze-clube")).toBe(TEMA_SO_ADC_BRONZE_CLUBE);
    expect(temaDoTime("verdante")).toBeNull();
  });

  it("a cor do time no site é o coral-vermelho do alvo; sem o slug, a verde da VERDANTE", () => {
    expect(corDoTime({ id: "verdante", slug: "so-adc-bronze-clube" })).toBe("#FF6A55");
    expect(corDoTime({ id: "verdante", slug: "verdante" })).toBe("#3fb27f");
  });

  it("o coral DA CENA (penas, «So», fita) continua o da paleta, separado da cor do time", () => {
    expect(TEMA_SO_ADC_BRONZE_CLUBE.cor).toBe("#FF6A55");
    expect(TEMA_SO_ADC_BRONZE_CLUBE.cores.neon).toBe("#FF6B7A");
    const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/estande.module.css"), "utf8");
    expect(css).toContain("--coral: #ff6b7a;");
    expect(css).not.toMatch(/#ff6a55/i);
  });

  it("parte o nome pelo sufixo: SO ADC grande, BRONZE CLUBE embaixo", () => {
    expect(partesDoNome("SO ADC BRONZE CLUBE", undefined, "BRONZE CLUBE")).toEqual({ assinatura: "BRONZE CLUBE", marca: "SO ADC" });
    expect(partesDoNome("So ADC Bronze Clube", undefined, "BRONZE CLUBE")).toEqual({ assinatura: "Bronze Clube", marca: "So ADC" });
  });

  it("os textos do tema saem no idioma da página", () => {
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, t, "capitao")).toBe("ARQUEIRO-CHEFE");
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, MESSAGES.en.paginasHome, "estrelando")).toBe("THE QUIVER");
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, MESSAGES.en.paginasHome, "carimbo")).toBe("MMR: ???");
  });
});

describe("a largura medida da Alfa Slab One (lib/temas/metricas.ts)", () => {
  it("ADC = 2,332 em de avanço + 3 × 0,01 + 0,22 de tinta = 2,582 em (a maior palavra do «SO ADC»)", () => {
    expect(maiorPalavraEm("SO ADC", ALFA)).toBe(2.582);
    expect(larguraEm("ADC", ALFA)).toBe(2.582);
  });

  it("o padrão é o caractere mais largo medido (o W); fora da tabela nunca estoura", () => {
    expect(ALFA.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(ALFA.avancos)));
    expect(larguraEm("ㅤ", ALFA)).toBe(1.437); // 1,207 + 0,01 + 0,22
  });

  it("nick da ficha: até duas linhas, só entre palavras", () => {
    expect(larguraDoNickEm("Famoso Parrudao", ALFA)).toBe(6.627); // FAMOSO / PARRUDAO
    expect(larguraDoNickEm("bobbie goods", ALFA)).toBe(4.53); // BOBBIE / GOODS
    expect(larguraDoNickEm("PRESUNTO", ALFA)).toBe(6.52);
    expect(larguraDoNickEm("WeSlay", ALFA)).toBe(5.109);
    expect(larguraDoNickEm("Caçu", ALFA)).toBe(3.291);
  });

  it("a reserva é mais estreita: a fonte de título pede «Alfa Slab Caixa Alta» (Arial a 88%)", () => {
    const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/estande.module.css"), "utf8");
    expect(css).toMatch(/font-family: "Alfa Slab Caixa Alta";[\s\S]*?size-adjust: 88%;/);
    // a Alfa tem kerning: todo texto medido o desliga
    expect(css).toMatch(/\.raiz \.marca \{[^}]*font-kerning: none;/);
    expect(css).toMatch(/\.raiz \.nick \{[^}]*font-kerning: none;/);
  });
});

describe("página temática do SO ADC BRONZE CLUBE", () => {
  it("o leitor de tela lê o nome uma vez; as 5 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("SO ADC BRONZE CLUBE");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(5);
    expect(visual.querySelectorAll('[class*="palavra"]')).toHaveLength(2);
    expect(visual.getAttribute("style")).toContain("--largura-em:2.582");
  });

  it("o elenco: TOP, MID, ADC, SUP e o arqueiro-chefe (o capitão) por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["bobbie goods", "PRESUNTO", "WeSlay", "Caçu", "Famoso Parrudao"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:6.627");
  });

  it("o enquadramento das fotos: as duas caras do bobbie goods na carta (o Lucas quer os dois juntos)", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const foco = (slug: string) =>
      doc.querySelector(`a[href="/jogadores/${slug}"]`)!.closest("li")!.querySelector('[style*="--foco"]')!.getAttribute("style");
    expect(foco("bobbie-goods")).toContain("--foco:52% 50%");
    expect(foco("famoso-parrudao")).toContain("--foco:50% 62%");
  });

  it("os textos do tema aparecem; ARQUEIRO-CHEFE na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "3 ADCs improvisados · querendo vencer",
      "A ALJAVA",
      "Inscritos como ADC: 3 · jogando de ADC: 1.",
      "ARQUEIRO-CHEFE",
      "Fundado em 2024 · 3 ADCs, 1 bot lane",
      "NO ESTANDE DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "MMR: ???",
      "A mosca segue intacta desde 2024.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("ARQUEIRO-CHEFE");
  });

  it("o cenário estande: alvo, raias vizinhas, flechas, gramado e a placa", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="so-adc-bronze-clube"');
    expect(html).toContain('data-cenario="estande"');
    expect(html).not.toContain("data-fotos"); // fotos de celular, não medalhão
    for (const peca of ["enfAlvo", "enfVizinho", "enfFlecha1", "enfFlecha2", "enfFlecha3", "enfFlechaPerdida", "enfBrilhoMosca", "enfGramado", "enfCampo", "enfPlaca", "enfFita", "enfRajada", "enfLinhaDeTiro"]) {
      expect(html).toMatch(new RegExp(peca));
    }
    expect(html).not.toMatch(/enfLousa|enfTela|enfLua|enfTrilhos|enfCoroa|enfGrade/);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(30);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });

  it("os ids dos SVG não se repetem (gradientes com prefixo)", () => {
    const ids = [...paginaDoTime().matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("os outros temas não ganham nada do estande", () => {
  it.each([TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR])("$slug: sem alvo, sem flecha, sem placa", (tema) => {
    const html = paginaDoTime(tema, { ...TIME, slug: tema.slug });
    expect(html).not.toMatch(/enfAlvo|enfFlecha|enfPlaca|enfRajada/);
    expect(html).not.toContain('data-cenario="estande"');
  });
});

describe("ficha temática de um jogador do SO ADC BRONZE CLUBE", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; AS OUTRAS FLECHAS com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("Famoso Parrudao");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:6.627");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual(["/jogadores/bobbie-goods", "/jogadores/presunto", "/jogadores/weslay", "/jogadores/cacu"]);
    expect(doc.body.textContent).toContain("AS OUTRAS FLECHAS");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("a foto deitada do bobbie goods sai inteira (4:3) na ficha", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(doc.querySelector('[style*="--proporcao"]')!.getAttribute("style")).toContain("--proporcao:4 / 3");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (os louros são só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/famoso-parrudao"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (as flechas cruzadas atrás do retrato também)", () => {
    const html = ficha();
    expect(html).toMatch(/enfCruzadas/);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o último raio de sol é PINTURA que nunca esconde", () => {
  const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/estande.module.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const keyframe = (nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";

  it("ultimoRaio só mexe na posição do fundo; a face tem tinta sólida antes do background-clip", () => {
    const declaradas = [...keyframe("ultimoRaio").matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]);
    expect(new Set(declaradas)).toEqual(new Set(["background-position"]));
    expect(css).toMatch(/\.raiz \.cromo \{\s*color: #f3e3c3;/);
  });
});

/*
 * O que a conferência no navegador achou (28/10/2026) e virou regra do tema. Cada item foi medido
 * com a correção revertida: 63 de 99 pontos da carta abriam a ficha (as listras e a moldura de cedro,
 * não); em 1024 PARRUDAO e PRESUNTO vazavam pela ponta da flecha dos companheiros; sem subgrid, a raia
 * vizinha e a biruta caíam atrás do nome; a ficha rodava 5 laços infinitos (o orçamento é 4).
 */
describe("o estande conferido no navegador", () => {
  const ler = (arquivo: string) =>
    readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const pagina = ler("estande.module.css");
  const daFicha = ler("estande-ficha.module.css");

  it("a tábua inteira abre a ficha: o miolo fica sem position e o ::after do link se mede pela carta", () => {
    expect(pagina).toMatch(/\.raiz \.miolo \{\s*position: static;/);
  });

  it("sem subgrid, alvo e nome numa coluna só, ANTES do @supports que reordena (mesma especificidade)", () => {
    const fallback = pagina.search(/\.raiz \.blocoEscudo,\s*\.raiz \.blocoTexto \{\s*grid-column: 1;\s*grid-row: auto;/);
    const supports = pagina.indexOf("@supports (grid-template-rows: subgrid)");
    expect(fallback).toBeGreaterThan(-1);
    expect(supports).toBeGreaterThan(fallback);
  });

  it("os companheiros ficam em duas colunas de 900 a 1199 (em quatro, o nick vazava pela ponta)", () => {
    expect(daFicha).toMatch(
      /@media \(min-width: 900px\) and \(max-width: 1199px\) \{\s*\.raiz \.companheiros \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/,
    );
  });

  it("laços infinitos: nuvens, biruta e brilho da mosca na página; nenhum na ficha, que esconde a 3ª nuvem", () => {
    const infinitos = (css: string) => [...css.matchAll(/\binfinite\b/g)].length;
    expect(infinitos(pagina)).toBe(3);
    expect(infinitos(daFicha)).toBe(0);
    expect(daFicha).toMatch(/\.raiz \.enfNuvem:nth-child\(n \+ 4\) \{\s*display: none;/);
    // cada nuvem leva a classe dos DOIS módulos (a da ficha só vale debaixo do .raiz da ficha)
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const nuvens = [...doc.querySelectorAll('[data-cenario="estande"] [class*="enfNuvem"]')];
    expect(nuvens).toHaveLength(3);
    for (const n of nuvens) expect(n.getAttribute("class")!.split(" ").filter((c) => c.includes("enfNuvem"))).toHaveLength(2);
  });
});

describe("o estande cabe no vídeo", () => {
  const ler = (arquivo: string) =>
    readFileSync(path.join(process.cwd(), "components/times/cenarios", arquivo), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  it("o gramado atrás das cartas se dissolve antes da cartela (sem emenda reta com o céu)", () => {
    const corpo = /\n\.enfCampo \{([^}]*)\}/.exec(ler("estande.module.css"))?.[1] ?? "";
    expect(corpo).toContain("mask-image: linear-gradient(180deg, #000 calc(100% - 160px), transparent);");
    expect(corpo).toContain("-webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 160px), transparent);");
  });

  it("no celular baixo (405×720) o retrato do capitão encolhe pela altura para o nick caber na 1ª dobra", () => {
    expect(ler("estande-ficha.module.css")).toMatch(
      /@media \(max-width: 599px\) and \(max-height: 760px\) \{\s*\.raiz \.retratoCasca\.retratoCapitao \{\s*width: clamp\(180px, 28svh, min\(100% - 80px, 330px\)\);/,
    );
  });
});
