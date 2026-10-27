import type { CSSProperties } from "react";

import { teamColor } from "@/lib/design";
import type { PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import type { CoresDoTema, MetalDoTema, PapelDoTexto, TemaDoTime } from "@/lib/temas/tipos";

/** Os times com página temática. Time novo: um arquivo em lib/temas e uma linha aqui. */
const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR];

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

/** O texto que o tema pede para um papel (no idioma de `t`), ou null: a página usa o padrão. */
export function textoDoTema(tema: TemaDoTime, t: PaginasHomeTextos, papel: PapelDoTexto): string | null {
  const chave = tema.textos?.[papel];
  return chave ? t[chave] : null;
}

/**
 * As cores do tema como variáveis CSS na raiz da página: `--tm-breu`, `--tm-neon`… e o metal
 * como `--tm-metal-luz`, `--tm-metal-sombra`…
 */
export function varsDoTema(tema: TemaDoTime): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [nome, cor] of Object.entries(tema.cores) as [keyof CoresDoTema, string][]) {
    vars[`--tm-${nome}`] = cor;
  }
  for (const [nome, cor] of Object.entries(tema.metal) as [keyof MetalDoTema, string][]) {
    vars[`--tm-metal-${nome}`] = cor;
  }
  return vars as CSSProperties;
}

/**
 * O nome do time partido como no escudo: a MARCA grande em metal e a ASSINATURA pequena por
 * baixo. Pelo prefixo ("EQUIPE RX" → EQUIPE em pincel, RX em metal) ou pelo sufixo ("QUEIJO
 * MINAS" → QUEIJO grande, MINAS embaixo). Se o nome não bater (o time mudou de nome), a marca é
 * o nome inteiro e não há assinatura.
 */
export function partesDoNome(
  nome: string,
  prefixo?: string,
  sufixo?: string,
): { assinatura: string | null; marca: string } {
  const limpo = nome.trim();
  const maiusculo = limpo.toUpperCase();
  if (prefixo && maiusculo.startsWith(`${prefixo.toUpperCase()} `)) {
    const marca = limpo.slice(prefixo.length).trim();
    if (marca) return { assinatura: limpo.slice(0, prefixo.length), marca };
  }
  if (sufixo && maiusculo.endsWith(` ${sufixo.toUpperCase()}`)) {
    const marca = limpo.slice(0, limpo.length - sufixo.length).trim();
    if (marca) return { assinatura: limpo.slice(limpo.length - sufixo.length), marca };
  }
  return { assinatura: null, marca: limpo };
}
