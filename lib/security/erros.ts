/**
 * Separa erro que o usuário PODE ver de erro que ele NÃO pode.
 *
 * O problema que isso resolve: as rotas devolviam `error.message` cru. Quando a falha
 * vinha do Postgres, a resposta carregava nome de tabela, nome de policy e texto de
 * driver — um mapa do banco entregue a quem estiver logado, inclusive um admin de
 * permissão limitada ou alguém que roubou uma sessão.
 *
 * Regra de negócio ("a temporada já está encerrada") é informação do produto e deve
 * aparecer. Por isso ela é lançada como ErroDeRegra; todo o resto vira mensagem
 * genérica + código de referência, com o detalhe indo só para o log do servidor.
 *
 * O `codigo` (opcional) é o nome ESTÁVEL da regra, para a tela traduzir: a mensagem é
 * fixa em português, e no site em inglês a pessoa via «As inscrições estão encerradas.»
 * sem ter como a tela saber qual regra era. Ele vai na resposta ao lado do texto (ver
 * `respostaDeErro`); quem não conhece o código continua mostrando o texto.
 */
export class ErroDeRegra extends Error {
  readonly code = "REGRA";

  constructor(
    message: string,
    readonly codigo?: string,
  ) {
    super(message);
    this.name = "ErroDeRegra";
  }
}

export function ehErroDeRegra(error: unknown): error is ErroDeRegra {
  return error instanceof ErroDeRegra;
}
