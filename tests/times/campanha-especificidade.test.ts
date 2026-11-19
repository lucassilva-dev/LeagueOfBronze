import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import postcss from "postcss";
import { describe, expect, it } from "vitest";

/**
 * Regra da casa (components/times/cenarios/tipos.ts): o gancho do cenário é `.raiz` + o seletor da
 * base, UM NÍVEL ACIMA — nunca a mesma especificidade da base, porque aí quem decide é a ORDEM em que
 * os CSS chegam, e o agrupamento dos chunks do build pode mudar a qualquer import.
 *
 * Na revisão de 18/11/2026 havia 50 empates entre a base da campanha (campanha.module.css) e os
 * ganchos (cenarios/*-campanha.module.css): a base escrevia estados como `.serie[data-resultado=…]`,
 * `.jogo:last-child` e `.serieLink:hover` em (0,2,0), o mesmo peso de `.raiz .serie`. Hoje os ganchos
 * venciam só porque a base era o primeiro módulo do primeiro chunk. A base passou esses estados para
 * dentro de `:where()` (peso zero).
 *
 * Este teste procura pares (gancho, base) que atingem a MESMA peça (uma classe em comum no último
 * composto, o mesmo pseudo-elemento, sem atributos que se excluam), com propriedade em comum e a
 * mesma especificidade. Sem dependência nova: só o postcss do projeto e um leitor de seletor simples
 * (os módulos só usam classe, atributo, pseudo-classe, pseudo-elemento e :where/:not/:is/:has).
 */

const PASTA = path.join(process.cwd(), "components", "times");
const BASE = path.join(PASTA, "campanha.module.css");
const GANCHOS = readdirSync(path.join(PASTA, "cenarios"))
  .filter((f) => f.endsWith("-campanha.module.css"))
  .map((f) => path.join(PASTA, "cenarios", f));

/** Os atalhos que mexem nas mesmas longas (para achar "propriedade em comum"). */
const ATALHOS: Record<string, readonly string[]> = {
  background: ["background-color", "background-image", "background-position", "background-size", "background-repeat", "background-clip"],
  border: ["border-color", "border-style", "border-width"].flatMap((p) => ["top", "right", "bottom", "left"].map((l) => p.replace("border-", `border-${l}-`))),
  "border-color": ["top", "right", "bottom", "left"].map((l) => `border-${l}-color`),
  "border-style": ["top", "right", "bottom", "left"].map((l) => `border-${l}-style`),
  "border-width": ["top", "right", "bottom", "left"].map((l) => `border-${l}-width`),
  "border-top": ["border-top-color", "border-top-style", "border-top-width"],
  "border-right": ["border-right-color", "border-right-style", "border-right-width"],
  "border-bottom": ["border-bottom-color", "border-bottom-style", "border-bottom-width"],
  "border-left": ["border-left-color", "border-left-style", "border-left-width"],
  "border-radius": ["border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius"],
  font: ["font-style", "font-weight", "font-size", "line-height", "font-family", "font-variant", "font-stretch"],
  padding: ["padding-top", "padding-right", "padding-bottom", "padding-left"],
  "padding-block": ["padding-top", "padding-bottom"],
  "padding-inline": ["padding-left", "padding-right"],
  margin: ["margin-top", "margin-right", "margin-bottom", "margin-left"],
  "margin-block": ["margin-top", "margin-bottom"],
  "margin-inline": ["margin-left", "margin-right"],
  inset: ["top", "right", "bottom", "left"],
  gap: ["row-gap", "column-gap"],
  "grid-template": ["grid-template-rows", "grid-template-columns", "grid-template-areas"],
  "grid-column": ["grid-column-start", "grid-column-end"],
  "grid-row": ["grid-row-start", "grid-row-end"],
  flex: ["flex-grow", "flex-shrink", "flex-basis"],
  "flex-flow": ["flex-direction", "flex-wrap"],
  "place-items": ["align-items", "justify-items"],
  outline: ["outline-color", "outline-style", "outline-width"],
  "inline-size": ["width"],
  "block-size": ["height"],
  "text-decoration": ["text-decoration-line", "text-decoration-color", "text-decoration-style", "text-decoration-thickness"],
  overflow: ["overflow-x", "overflow-y"],
  transition: ["transition-property", "transition-duration", "transition-timing-function", "transition-delay"],
  "list-style": ["list-style-type", "list-style-position", "list-style-image"],
};

type Especificidade = readonly [number, number, number];

/** Separa por vírgula de nível zero (fora de parênteses). */
function separar(lista: string): string[] {
  const partes: string[] = [];
  let nivel = 0;
  let atual = "";
  for (const ch of lista) {
    if (ch === "(") nivel++;
    if (ch === ")") nivel--;
    if (ch === "," && nivel === 0) {
      partes.push(atual.trim());
      atual = "";
    } else atual += ch;
  }
  if (atual.trim()) partes.push(atual.trim());
  return partes;
}

/** O conteúdo entre o parêntese que abre em `inicio` e o que fecha com ele. */
function argumento(sel: string, inicio: number): { dentro: string; fim: number } {
  let nivel = 0;
  for (let i = inicio; i < sel.length; i++) {
    if (sel[i] === "(") nivel++;
    if (sel[i] === ")" && --nivel === 0) return { dentro: sel.slice(inicio + 1, i), fim: i + 1 };
  }
  throw new Error(`parêntese sem par em "${sel}"`);
}

function especificidade(sel: string): Especificidade {
  let a = 0;
  let b = 0;
  let c = 0;
  let i = 0;
  while (i < sel.length) {
    const ch = sel[i]!;
    if (ch === "#") {
      a++;
      i++;
      while (i < sel.length && /[\w-]/.test(sel[i]!)) i++;
    } else if (ch === ".") {
      b++;
      i++;
      while (i < sel.length && /[\w-]/.test(sel[i]!)) i++;
    } else if (ch === "[") {
      b++;
      i = sel.indexOf("]", i) + 1;
    } else if (ch === ":") {
      const elemento = sel[i + 1] === ":";
      let j = i + (elemento ? 2 : 1);
      while (j < sel.length && /[\w-]/.test(sel[j]!)) j++;
      const nome = sel.slice(i, j);
      if (elemento || /^:(before|after)$/.test(nome)) {
        c++;
        i = j;
      } else if (sel[j] === "(") {
        const { dentro, fim } = argumento(sel, j);
        if (nome === ":not" || nome === ":is" || nome === ":has") {
          const maior = separar(dentro)
            .map(especificidade)
            .sort((x, y) => y[0] - x[0] || y[1] - x[1] || y[2] - x[2])[0] ?? [0, 0, 0];
          a += maior[0];
          b += maior[1];
          c += maior[2];
        } else if (nome !== ":where") b++;
        i = fim;
      } else {
        b++;
        i = j;
      }
    } else if (/[a-z]/i.test(ch) && (i === 0 || /[\s>+~(]/.test(sel[i - 1]!))) {
      c++;
      while (i < sel.length && /[\w-]/.test(sel[i]!)) i++;
    } else i++;
  }
  return [a, b, c];
}

/** O último composto do seletor (depois do último combinador de nível zero). */
function sujeito(sel: string) {
  let nivel = 0;
  let corte = 0;
  for (let i = 0; i < sel.length; i++) {
    const ch = sel[i]!;
    if (ch === "(") nivel++;
    if (ch === ")") nivel--;
    if (nivel === 0 && /[\s>+~]/.test(ch)) corte = i + 1;
  }
  const composto = sel.slice(corte);
  // As classes e os atributos do sujeito, inclusive os de dentro de :where() (ainda atingem a peça).
  const classes = [...composto.matchAll(/\.([\w-]+)/g)].map((m) => m[1]!);
  const atributos = [...composto.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g)].map((m) => [m[1]!, m[2] ?? "*"] as const);
  const pseudoElemento = /::?(before|after)\b/.exec(composto)?.[1] ?? "";
  return { classes, atributos, pseudoElemento };
}

type Regra = Readonly<{
  arquivo: string;
  linha: number;
  seletor: string;
  esp: Especificidade;
  suj: ReturnType<typeof sujeito>;
  props: ReadonlySet<string>;
}>;

function regrasDe(arquivo: string): Regra[] {
  const raiz = postcss.parse(readFileSync(arquivo, "utf8"));
  const regras: Regra[] = [];
  raiz.walkRules((regra) => {
    if (regra.parent?.type === "atrule" && /keyframes/.test((regra.parent as postcss.AtRule).name)) return;
    const props = new Set<string>();
    regra.walkDecls((d) => {
      if (d.prop.startsWith("--")) return;
      for (const p of ATALHOS[d.prop] ?? [d.prop]) props.add(p);
    });
    for (const seletor of regra.selectors) {
      regras.push({
        arquivo: path.basename(arquivo),
        linha: regra.source?.start?.line ?? 0,
        seletor,
        esp: especificidade(seletor),
        suj: sujeito(seletor),
        props,
      });
    }
  });
  return regras;
}

function seExcluem(x: Regra, y: Regra): boolean {
  return x.suj.atributos.some(([n, v]) => y.suj.atributos.some(([n2, v2]) => n === n2 && v !== "*" && v2 !== "*" && v !== v2));
}

const igual = (x: Especificidade, y: Especificidade) => x[0] === y[0] && x[1] === y[1] && x[2] === y[2];

describe("a base vence as regras de elemento do site (app/globals.css)", () => {
  /*
   * `a:hover` (0,1,1) pinta todo link de ciano e `*:focus-visible` (0,1,0) desenha o anel do site. Os
   * estados da base que disputam a mesma propriedade têm de pesar MAIS. A auditoria de 19/11/2026 pegou o
   * hover do «VER PARTIDA» rebaixado para (0,1,0) com o :where(): o ciano vencia no álbum e na ficha
   * padrão; e o foco em (0,1,0) empatava com o do site (vencia só pela ordem dos chunks).
   */
  const GLOBAIS = regrasDe(path.join(process.cwd(), "app", "globals.css")).filter((r) =>
    /^(a:hover|\*:focus-visible)$/.test(r.seletor.trim()),
  );

  it("achou as duas regras globais", () => {
    expect(GLOBAIS.map((r) => r.seletor.trim()).sort()).toEqual(["*:focus-visible", "a:hover"]);
  });

  it("cada estado da base que disputa propriedade com elas pesa mais", () => {
    const perdendo: string[] = [];
    for (const b of regrasDe(BASE)) {
      for (const g of GLOBAIS) {
        const estado = g.seletor.includes(":hover") ? ":hover" : ":focus-visible";
        if (!b.seletor.includes(estado)) continue;
        if (![...g.props].some((p) => b.props.has(p))) continue;
        const maior = b.esp[0] - g.esp[0] || b.esp[1] - g.esp[1] || b.esp[2] - g.esp[2];
        if (maior <= 0) perdendo.push(`base:${b.linha} "${b.seletor}" (${b.esp.join(",")}) × "${g.seletor}" (${g.esp.join(",")})`);
      }
    }
    expect(perdendo).toEqual([]);
  });
});

describe("foco do teclado: no papel claro, o anel da base some", () => {
  /*
   * O anel da base é `--tm-arco` (claro: cromo, pêssego, ciano, creme), feito para o fundo escuro.
   * Onde o link fica sobre PAPEL claro, o cenário troca a cor (medido pelo Tab na revisão de
   * 18/11/2026: na Desorganização o anel #FFE3A3 no marfim dava 1,0:1 e o foco sumia). A tabela é
   * dos links que caem no papel em cada cenário; os outros ficam no escuro e usam o anel da base.
   */
  const NO_PAPEL: Readonly<Record<string, readonly string[]>> = {
    "academia-campanha.module.css": ["destaqueLink", "serieLink"],
    "boteco-campanha.module.css": ["destaqueLink", "serieLink"],
    "estacao-campanha.module.css": ["serieLink"],
    "estande-campanha.module.css": ["destaqueLink", "serieLink"],
    "picadeiro-campanha.module.css": ["destaqueLink", "serieLink", "proximoCartao"],
  };

  it.each(Object.entries(NO_PAPEL))("%s troca a cor do anel nos links do papel", (arquivo, links) => {
    const raiz = postcss.parse(readFileSync(path.join(PASTA, "cenarios", arquivo), "utf8"));
    const comCor = new Set<string>();
    raiz.walkRules((regra) => {
      const temCor = regra.nodes.some((n) => n.type === "decl" && (n.prop === "outline-color" || n.prop === "outline"));
      if (!temCor) return;
      for (const sel of regra.selectors) {
        const m = /^\.raiz \.(\w+):focus-visible$/.exec(sel.trim());
        if (m) comCor.add(m[1]!);
      }
    });
    for (const link of links) expect(comCor.has(link), `${arquivo}: .raiz .${link}:focus-visible`).toBe(true);
  });
});

describe("especificidade: gancho da campanha × base (sem empate)", () => {
  it("o leitor de seletor conta como o navegador", () => {
    expect(especificidade(".raiz .serie")).toEqual([0, 2, 0]);
    expect(especificidade(".serie:where([data-resultado=\"vitoria\"])")).toEqual([0, 1, 0]);
    expect(especificidade(".serie[data-resultado=\"vitoria\"] .serieResultado")).toEqual([0, 3, 0]);
    expect(especificidade(".raiz .jogo:not([data-tipo]):nth-child(odd)")).toEqual([0, 4, 0]);
    expect(especificidade(".raiz .destaque::before")).toEqual([0, 2, 1]);
    expect(especificidade(":where(.campeao) .campeaoNome")).toEqual([0, 1, 0]);
    expect(especificidade(".raiz .proximoCartao:has(.proximoData)")).toEqual([0, 3, 0]);
    expect(sujeito(".raiz .serie[data-resultado=\"vitoria\"] .jogo:last-child")).toMatchObject({ classes: ["jogo"] });
  });

  it("achou a base e os 8 ganchos", () => {
    expect(GANCHOS).toHaveLength(8);
  });

  it("nenhum gancho empata com a base na mesma peça e na mesma propriedade", () => {
    const base = regrasDe(BASE);
    const empates: string[] = [];
    for (const arquivo of GANCHOS) {
      for (const g of regrasDe(arquivo)) {
        if (g.suj.classes.length === 0) continue;
        for (const b of base) {
          if (b.suj.pseudoElemento !== g.suj.pseudoElemento) continue;
          if (!b.suj.classes.some((cl) => g.suj.classes.includes(cl))) continue;
          if (seExcluem(g, b)) continue;
          if (![...g.props].some((p) => b.props.has(p))) continue;
          if (igual(g.esp, b.esp)) empates.push(`${g.arquivo}:${g.linha} "${g.seletor}" × base:${b.linha} "${b.seletor}" (${g.esp.join(",")})`);
        }
      }
    }
    expect(empates).toEqual([]);
  });
});
