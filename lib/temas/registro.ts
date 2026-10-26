import type { CSSProperties } from "react";

import { teamColor } from "@/lib/design";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import type { CoresDoTema, TemaDoTime } from "@/lib/temas/tipos";

/** Os times com página temática. Time novo: um arquivo em lib/temas e uma linha aqui. */
const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX];

/** O tema do time pelo slug — ou null, e a página fica com o visual padrão do site. */
export function temaDoTime(slug: string): TemaDoTime | null {
  return TEMAS.find((tema) => tema.slug === slug) ?? null;
}

/**
 * A cor do time no site: a do tema dele, quando tem; senão a de sempre, pelo id (lib/design.ts).
 * Pelo slug, como o tema: o id do draft ("carmesim") volta na edição seguinte para outro time.
 */
export function corDoTime(time: Readonly<{ id: string; slug?: string | null }>): string {
  const tema = time.slug ? temaDoTime(time.slug) : null;
  return tema?.cor ?? teamColor(time.id);
}

/** As cores do tema como variáveis CSS (`--tm-breu`, `--tm-neon`…) na raiz da página. */
export function varsDoTema(tema: TemaDoTime): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [nome, cor] of Object.entries(tema.cores) as [keyof CoresDoTema, string][]) {
    vars[`--tm-${nome}`] = cor;
  }
  return vars as CSSProperties;
}

/**
 * O nome do time partido como no escudo: a assinatura em pincel ("EQUIPE") e a marca em metal
 * ("RX"). Sem o prefixo no começo do nome, a marca é o nome inteiro e não há assinatura.
 */
export function partesDoNome(nome: string, prefixo?: string): { assinatura: string | null; marca: string } {
  const limpo = nome.trim();
  if (prefixo && limpo.toUpperCase().startsWith(`${prefixo.toUpperCase()} `)) {
    const marca = limpo.slice(prefixo.length).trim();
    if (marca) return { assinatura: limpo.slice(0, prefixo.length), marca };
  }
  return { assinatura: null, marca: limpo };
}
