import { ErroDeRegra } from "@/lib/security/erros";

/**
 * A tela pediu para gravar por cima de um valor que já não é o que ela viu: outra pessoa (ou
 * o robô, ou o próprio jogador) gravou no meio. Nada foi gravado.
 *
 * A rota do painel responde 409 com a mensagem. Fora dela, por ser `ErroDeRegra`, a
 * mensagem continua chegando à pessoa (400) em vez de virar "erro interno".
 *
 * Mora fora de `store.ts` de propósito: a rota precisa reconhecê-lo mesmo quando o store é
 * trocado por um simulado nos testes.
 */
export class ErroDeConflito extends ErroDeRegra {
  readonly conflito = true;

  constructor(message: string) {
    super(message);
    this.name = "ErroDeConflito";
  }
}
