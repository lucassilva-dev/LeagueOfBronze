import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

/**
 * As páginas temáticas dos times (components/times) seguem a regra da casa: ANIMAÇÃO NÃO DECIDE
 * SE O CONTEÚDO APARECE (tests/draft/animacoes-sem-opacidade.test.ts conta as quatro vezes em
 * que animar opacidade apagou o site). Aqui a regra é estrutural:
 *
 *  - keyframe que mexe em opacidade, filtro, visibilidade ou clip-path só pode ser usado por
 *    ENFEITE — regra cujo último seletor começa com `.enf` (aria-hidden, sem texto);
 *  - os keyframes de entrada do conteúdo animam transform e nada que esconda;
 *  - conteúdo não usa fill-mode (é o fill-mode que prende o 1º quadro com a aba em segundo plano);
 *  - transição nomeia a propriedade, nunca opacity, filter nem all;
 *  - existe o bloco de movimento reduzido que para tudo.
 */

const PASTA = path.join(process.cwd(), "components", "times");
const ARQUIVOS = readdirSync(PASTA, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".module.css"))
  .map((f) => ({ nome: f, css: readFileSync(path.join(PASTA, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "") }));

const ESCONDE = /(^|[\s;{])(opacity|filter|visibility|clip-path)\s*:/;

type Bloco = { seletor: string; corpo: string };

/** Os @keyframes e os blocos de regra mais internos (dentro de @media/@supports também). */
function analisar(css: string): { keyframes: Map<string, string>; regras: Bloco[] } {
  const keyframes = new Map<string, string>();
  const regras: Bloco[] = [];
  const visitar = (trecho: string) => {
    let i = 0;
    while (i < trecho.length) {
      const abre = trecho.indexOf("{", i);
      if (abre < 0) break;
      const cabeca = trecho.slice(i, abre).trim();
      let nivel = 1;
      let j = abre + 1;
      for (; j < trecho.length && nivel > 0; j++) {
        if (trecho[j] === "{") nivel++;
        else if (trecho[j] === "}") nivel--;
      }
      const corpo = trecho.slice(abre + 1, j - 1);
      const kf = /^@keyframes\s+([\w-]+)/.exec(cabeca);
      if (kf) keyframes.set(kf[1]!, corpo);
      else if (cabeca.startsWith("@")) visitar(corpo);
      else regras.push({ seletor: cabeca, corpo });
      i = j;
    }
  };
  visitar(css);
  return { keyframes, regras };
}

/** Os nomes de keyframe que uma regra usa (animation-name ou o 1º nome conhecido do shorthand). */
function animacoesDa(corpo: string, nomes: ReadonlySet<string>): string[] {
  const usados: string[] = [];
  for (const m of corpo.matchAll(/animation(?:-name)?\s*:\s*([^;]+)/g)) {
    for (const parte of m[1]!.split(",")) {
      const nome = parte.trim().split(/\s+/).find((p) => nomes.has(p));
      if (nome) usados.push(nome);
    }
  }
  return usados;
}

/** O último seletor composto de cada seletor da lista começa com `.enf` (ou é um ::before dele)? */
function ehEnfeite(seletor: string): boolean {
  return seletor.split(",").every((s) => {
    const partes = s.trim().split(/\s+|>|\+|~/).filter(Boolean);
    return /^\.enf/.test(partes.at(-1) ?? "");
  });
}

describe.each(ARQUIVOS)("$nome", ({ css }) => {
  const { keyframes, regras } = analisar(css);
  const nomes = new Set(keyframes.keys());

  it("keyframe que esconde (opacidade, filtro, visibilidade, clip-path) só em enfeite", () => {
    const problemas: string[] = [];
    for (const regra of regras) {
      for (const nome of animacoesDa(regra.corpo, nomes)) {
        if (ESCONDE.test(keyframes.get(nome)!) && !ehEnfeite(regra.seletor)) problemas.push(`${regra.seletor} → ${nome}`);
      }
    }
    expect(problemas).toEqual([]);
  });

  it("conteúdo sem fill-mode", () => {
    const problemas = regras
      .filter((r) => !ehEnfeite(r.seletor) && /animation/.test(r.corpo) && /\b(both|forwards|backwards)\b|animation-fill-mode/.test(r.corpo))
      .map((r) => r.seletor);
    expect(problemas).toEqual([]);
  });

  // A espera mora DENTRO do keyframe: um delay fora dele deixa o quadro 0 parado no 1º quadro
  // (com fill-mode) ou "pula" depois de aparecer. Pintura (brilhoCromo) pode esperar.
  it("conteúdo sem animation-delay", () => {
    const problemas: string[] = [];
    for (const r of regras) {
      if (ehEnfeite(r.seletor)) continue;
      for (const m of r.corpo.matchAll(/animation-delay\s*:\s*([^;]+)/g)) {
        if (!/^\s*0m?s\s*$/.test(m[1]!)) problemas.push(`${r.seletor} → animation-delay: ${m[1]!.trim()}`);
      }
      for (const m of r.corpo.matchAll(/(?:^|[\s;])animation\s*:\s*([^;]+)/g)) {
        for (const parte of m[1]!.split(",")) {
          const nome = parte.trim().split(/\s+/).find((p) => nomes.has(p));
          const tempos = parte.match(/(^|\s)-?[\d.]+m?s\b/g) ?? [];
          if (nome && /transform/.test(keyframes.get(nome)!) && tempos.length >= 2) problemas.push(`${r.seletor} → ${parte.trim()}`);
        }
      }
    }
    expect(problemas).toEqual([]);
  });

  // "none" é permitido: é o que o bloco de movimento reduzido usa.
  it("transição sempre com a propriedade nomeada, nunca opacity, filter ou all", () => {
    for (const regra of regras) {
      for (const m of regra.corpo.matchAll(/transition\s*:\s*([^;]+)/g)) {
        for (const parte of m[1]!.split(",")) {
          const propriedade = parte.trim().split(/\s+/)[0]!;
          expect(propriedade, `${regra.seletor}: ${parte}`).not.toMatch(/^(opacity|filter|all)$/);
          expect(propriedade, `${regra.seletor}: ${parte}`).not.toMatch(/^[\d.]+m?s$/);
        }
      }
    }
  });
});

describe("os keyframes de entrada do conteúdo", () => {
  const todos = new Map(ARQUIVOS.flatMap(({ css }) => [...analisar(css).keyframes]));
  it.each([
    // a base e a RX
    "entraEscudo",
    "entraMarca",
    "entraAssinatura",
    "sobe",
    "entraCarta",
    "entraCartaRolagem",
    "tremor",
    "entraRetrato",
    "entraNick",
    // a Queijo Minas (cenarios/estacao)
    "chegaEscudo",
    "freada",
    "engata",
    "carimbo",
    "balancaPlaca",
    "chegaVagao",
    "chegaVagaoRolagem",
    "carimbada",
    "chegaRetrato",
    "chegaNick",
    "carimbaPlaca",
    // os Galácticos do Bar (cenarios/boteco)
    "brinde",
    "chacoalha",
    "pincelada",
    "bolachaPousa",
    "bolachaPousaRelogio",
    "plaquinhaBalanca",
    "aoVivo",
    "bolachaGira",
    "nickPousa",
    "tampinhaCai",
    "tampinhaGira",
    // ↓ Fãs de Rosca Esporte Clube (cenarios/academia)
    "roscaDireta",
    "letraInfla",
    "entraClube",
    "lemaPincela",
    "crachaBalanca",
    "crachaBalancaRelogio",
    "halterBalanca",
    "sacoPousa",
    "adesivoCola",
    "espelhoChega",
    "nickInfla",
    "placaEmpilha",
    "pinoEntra",
    // ↑ Fãs de Rosca Esporte Clube
    // ↓ Os 5 Furiosos (cenarios/album)
    "colaFoto",
    "bafo",
    "bafoSelo",
    "balaoPula",
    "figurinhaCola",
    "figurinhaColaRelogio",
    "pacoteCai",
    "carimbaSabor",
    "seloGiraAlbum",
    "colaRetrato",
    "bafoNick",
    "adesivoPop",
    "seloGiraAlbumFicha",
    // ↑ Os 5 Furiosos
    // ↓ So ADC Bronze Clube (cenarios/estande)
    "cravado",
    "corda",
    "assinaturaPuxa",
    "crava",
    "cravaRelogio",
    "retratoCrava",
    "nickAcertou",
    "anota",
    // ↑ So ADC Bronze Clube
    // ↓ Os 5 Sem Ping (cenarios/chamada)
    // ↑ Os 5 Sem Ping
    // ↓ Desorganização (cenarios/picadeiro)
    // ↑ Desorganização
  ])(
    "%s anima transform e nada que esconda",
    (nome) => {
      const corpo = todos.get(nome);
      expect(corpo, `@keyframes ${nome} sumiu`).toBeDefined();
      expect(corpo).toContain("transform");
      expect(corpo).not.toMatch(ESCONDE);
    },
  );

  it("nenhum @keyframes com o mesmo nome em dois módulos (o mapa acima ficaria com o do último)", () => {
    const donos = new Map<string, string[]>();
    for (const { nome, css } of ARQUIVOS) {
      for (const kf of analisar(css).keyframes.keys()) donos.set(kf, [...(donos.get(kf) ?? []), nome]);
    }
    const repetidos = [...donos].filter(([, arquivos]) => arquivos.length > 1).map(([kf, arquivos]) => `${kf}: ${arquivos.join(", ")}`);
    expect(repetidos).toEqual([]);
  });

  it("o movimento reduzido para tudo na raiz do tema", () => {
    const base = ARQUIVOS.find((a) => a.nome === "tema.module.css")!.css;
    expect(base).toMatch(/prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.raiz \*[\s\S]*?animation:\s*none !important/);
  });
});
