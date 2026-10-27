/**
 * Para onde o «voltar» da ficha do jogador leva (app/jogadores/[slug]).
 *
 * A ficha se abre por dois caminhos, e o voltar acompanha o caminho de entrada:
 *  - pela lista de /jogadores, que marca o link com `?de=jogadores` (ORIGEM_JOGADORES): volta
 *    para a lista, já no card daquele jogador (`#jogador-<slug>`), e não para o topo;
 *  - pela página do time, ou por um link direto/compartilhado: volta para o time.
 * O reserva não tem time: volta sempre para a lista. A ficha continua com o atalho para o time
 * (temática: «<TIME> →»), então quem veio da lista também chega ao time.
 *
 * Um link de verdade, e não `history.back()`: funciona em link compartilhado, aba nova e
 * recarga, e o leitor de tela anuncia o destino.
 */

/** O valor de `?de=` que a lista de /jogadores põe no link da ficha. */
export const ORIGEM_JOGADORES = "jogadores";

/** O id do card na lista de /jogadores — o alvo da volta. */
export function ancoraDoJogador(slug: string): string {
  return `jogador-${slug}`;
}

/** O link da ficha a partir da lista de /jogadores. */
export function fichaPelaLista(slug: string): string {
  return `/jogadores/${slug}?de=${ORIGEM_JOGADORES}`;
}

export function voltarDaFicha(
  jogador: Readonly<{ slug: string; reserva: boolean; teamSlug: string }>,
  de: string | string[] | undefined,
  textos: Readonly<{ voltarAoTime: string; voltarAosJogadores: string }>,
): { href: string; texto: string } {
  if (de === ORIGEM_JOGADORES) {
    return { href: `/jogadores#${ancoraDoJogador(jogador.slug)}`, texto: textos.voltarAosJogadores };
  }
  if (jogador.reserva) return { href: "/jogadores", texto: textos.voltarAosJogadores };
  return { href: `/times/${jogador.teamSlug}`, texto: textos.voltarAoTime };
}
