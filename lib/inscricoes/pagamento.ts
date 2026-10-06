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

/**
 * Cobrança que não vale mais: a pessoa foi recusada ou desistiu e ainda não pagou.
 *
 * Derivado na LEITURA, de propósito — nada é gravado. O pagamento continua "aguardando"
 * no banco até alguém cancelar à mão; o painel só deixa de contar esse valor como "a
 * receber" e de listar a pessoa entre os vencidos. Gravar sozinho exigiria desfazer
 * sozinho quando a organização voltasse atrás, e mexer no caixa sem ninguém do
 * financeiro ter clicado.
 */
export function foraDaCobranca(situacao: string, estadoDoPagamento: string | null | undefined): boolean {
  return (situacao === "recusado" || situacao === "desistiu") && estadoDoPagamento === "aguardando";
}
