import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { transform } from "lightningcss";
import { describe, expect, it } from "vitest";

/**
 * O CSS das páginas temáticas passa pelo MESMO minificador do build de produção (o lightningcss do
 * Turbopack; o `next dev --webpack` da prévia não minifica, então lá tudo parecia certo).
 *
 * O caso que motivou: numa regra com `translate:` e um `transform:` literal (inclusive em duas
 * regras seguidas com o mesmo seletor, que ele funde), o lightningcss DESCARTA o `translate`.
 * Em produção, os trilhos do Queijo Minas saíam jogados para a direita e o reflexo do escudo da
 * RX, torto. Correção: o recuo vai dentro do `transform`, ou a peça usa só as propriedades
 * individuais (`translate` + `scale`/`rotate`), inclusive nos keyframes.
 *
 * O lightningcss vem com o vite (dependência do vitest).
 */

const PASTA = path.join(process.cwd(), "components", "times");
const ARQUIVOS = readdirSync(PASTA, { recursive: true })
  .map(String)
  .filter((f) => f.endsWith(".module.css"));

// SEM alvos de navegador: o descarte acontece com ou sem eles, e com os alvos do Next (Firefox 111
// não tem :has) o minificador divide `a, b:has(…)` em duas regras — a contagem subiria sem defeito.
const INDIVIDUAIS = ["translate", "rotate", "scale"] as const;

function contar(css: string, prop: string): number {
  const semComentarios = css.replace(/\/\*[\s\S]*?\*\//g, "");
  return [...semComentarios.matchAll(new RegExp(`(^|[\\s;{])${prop}\\s*:`, "g"))].length;
}

describe("o minificador do build não descarta transformações (components/times)", () => {
  it("achou os módulos dos temas", () => {
    expect(ARQUIVOS.length).toBeGreaterThanOrEqual(7);
  });

  it.each(ARQUIVOS)("%s mantém todo translate/rotate/scale", (arquivo) => {
    const fonte = readFileSync(path.join(PASTA, arquivo), "utf8");
    const minificado = transform({
      filename: arquivo,
      code: Buffer.from(fonte),
      minify: true,
      cssModules: true,
    }).code.toString();
    for (const prop of INDIVIDUAIS) {
      expect({ prop, depois: contar(minificado, prop) }).toEqual({ prop, depois: contar(fonte, prop) });
    }
  });
});
