/**
 * Para onde o /entrar devolve a pessoa depois do login (`?volta=`).
 *
 * Lista FECHADA, nunca o que vier na URL: aceitar qualquer caminho faria do login um
 * trampolim — `?volta=//outro-site` ou `?volta=https://...` levaria quem acabou de digitar
 * a senha para fora do site, com cara de continuação do nosso.
 *
 * Existe por causa do capitão: quem perde a sessão no dia do draft chega ao /entrar vindo
 * do /capitao e precisa voltar para lá — não para a ficha de inscrição.
 */
const DESTINOS = new Set(["/capitao", "/draft", "/minha-inscricao"]);

export function destinoDeVolta(pedido: unknown): string | null {
  return typeof pedido === "string" && DESTINOS.has(pedido) ? pedido : null;
}
