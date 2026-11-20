/**
 * O que o servidor e o navegador precisam saber IGUAL sobre a /stats. Fica fora dos arquivos
 * "use client": uma constante exportada de lá chega ao servidor como referência, não como valor.
 */

/** O cookie que lembra a escolha da tela de entrada: "1" com som, "0" sem. Ausente: 1ª visita. */
export const COOKIE_DO_SOM = "lob_stats_som";

/** Quem o modo VS recebe ao abrir (os dois lados são opcionais). */
export type PedidoDeVs = Readonly<{ tipo: "jogadores" | "times"; a?: string; b?: string }>;

/** Lê o `vs` do endereço: `t:slugA,slugB` (times) ou `j:slugA,slugB` (jogadores). */
export function lerPedidoDeVs(valor: string | null | undefined): PedidoDeVs | null {
  if (!valor) return null;
  const m = /^([tj]):([^,]*)(?:,(.*))?$/.exec(valor);
  if (!m) return null;
  return { tipo: m[1] === "t" ? "times" : "jogadores", a: m[2] || undefined, b: m[3] || undefined };
}

/** O valor de `vs` para o endereço (o inverso de `lerPedidoDeVs`). */
export function escreverPedidoDeVs(pedido: PedidoDeVs): string {
  return `${pedido.tipo === "times" ? "t" : "j"}:${pedido.a ?? ""},${pedido.b ?? ""}`;
}

/** Os atos da página, na ordem (os ids batem com `data-ato` e com as âncoras `#ato-<id>`). */
export const ATOS_DA_FORJA = ["fornalha", "liga", "moldes", "pecas", "canais", "bigorna", "arsenal", "tempera", "fecho"] as const;
export type AtoDaForja = (typeof ATOS_DA_FORJA)[number];
