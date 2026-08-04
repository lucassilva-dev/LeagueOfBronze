/**
 * Helper para declarar um bloco de textos nos dois idiomas.
 *
 * O ganho é o TypeScript: `en` é tipado a partir de `pt`, então esquecer de traduzir uma
 * chave — ou escrever o nome dela errado — vira erro de compilação, não uma string faltando
 * em produção. Cada página tem o seu próprio arquivo em messages/ para que várias pessoas
 * (ou agentes) editem em paralelo sem conflito.
 *
 *   export const regras = definir({
 *     pt: { titulo: "REGRAS" },
 *     en: { titulo: "RULES" },
 *   });
 */
/**
 * Mesma forma (mesmas chaves, mesma estrutura) do bloco declarado, porém com os textos
 * alargados de volta para `string`.
 *
 * O `const` do parâmetro genérico é o que garante a checagem de chaves, mas ele também
 * transforma cada texto num tipo literal. Sem alargar: a tradução em inglês só compilaria
 * se fosse idêntica ao português, e um componente que recebe os textos por prop ficaria
 * preso ao texto exato de um dos idiomas.
 */
export type Traduzido<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : { [K in keyof T]: Traduzido<T[K]> };

type BlocoTraduzido<T> = { [K in keyof T]: Traduzido<T[K]> };

export function definir<const T extends Record<string, unknown>>(bloco: {
  pt: T;
  en: BlocoTraduzido<T>;
}): { pt: BlocoTraduzido<T>; en: BlocoTraduzido<T> } {
  // O alargamento só existe no tipo: em tempo de execução o bloco sai exatamente como veio.
  // O compilador não consegue provar `T extends BlocoTraduzido<T>` de forma genérica.
  return bloco as { pt: BlocoTraduzido<T>; en: BlocoTraduzido<T> };
}
