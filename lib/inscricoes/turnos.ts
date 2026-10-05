/**
 * Turnos de disponibilidade da inscrição (regra 9 da 4ª Edição).
 *
 * Arquivo sem dependências de propósito: o formulário (cliente), a validação (servidor) e
 * o painel leem a mesma lista, e importar o schema inteiro num componente de cliente
 * levaria o zod e a tabela de elos para o navegador só por causa de três palavras.
 *
 * Os valores são os mesmos do `check` da coluna `inscricoes.disponibilidade` no banco.
 */
export const TURNOS = ["manha", "tarde", "noite"] as const;

export type Turno = (typeof TURNOS)[number];

export function ehTurno(valor: string): valor is Turno {
  return (TURNOS as readonly string[]).includes(valor);
}
