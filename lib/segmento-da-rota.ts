/**
 * O segmento dinâmico da URL como ele está gravado no dado.
 *
 * O Next decodifica o segmento, menos os delimitadores ("#", "?", "/"), que chegam ainda
 * codificados: o jogador de slug "Zabulon#5020" (há nick assim no arquivo da 2ª) chegava à ficha
 * como "Zabulon%235020", não batia com o slug e a página dava 404. Antes de o link ser codificado
 * era pior: o "#" virava âncora e o endereço parava em "Zabulon". Segmento malformado volta como
 * veio — quem compara com o dado responde 404 normalmente.
 */
export function segmentoDaRota(valor: string): string {
  try {
    return decodeURIComponent(valor);
  } catch {
    return valor;
  }
}
