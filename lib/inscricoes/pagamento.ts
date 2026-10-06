/**
 * Quando uma inscrição espera o pagamento do jogador — a regra que decide se a tela mostra
 * o Pix e o botão "JÁ PAGUEI".
 *
 * Sem dependências: a rota (servidor) e a "Minha inscrição" (navegador) usam a mesma.
 */
export function inscricaoEsperaPagamento(
  inscricao: Readonly<{ situacao: string; pagamento: { estado: string } | null }>,
): boolean {
  // Recusar ou registrar desistência mexe só na ficha — o pagamento continua "aguardando"
  // até alguém cancelar à mão. Para quem está fora, a cobrança não vale mais.
  if (inscricao.situacao === "recusado" || inscricao.situacao === "desistiu") return false;
  return inscricao.pagamento?.estado === "aguardando";
}
