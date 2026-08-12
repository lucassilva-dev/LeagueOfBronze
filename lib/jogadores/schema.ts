import { z } from "zod";

/**
 * Validação da conta de jogador.
 *
 * A conta existe por um motivo só, e ele veio do requisito: **ninguém pode escolher
 * no lugar do capitão**. A escolha do draft é validada no servidor contra a sessão de
 * quem enviou — nunca contra um campo do corpo da requisição, que qualquer um forja.
 * Tudo aqui serve a isso.
 */

export const LIMITES_CONTA = {
  email: 254,
  nome: 60,
  senha: 200,
} as const;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Informe o e-mail.")
  .max(LIMITES_CONTA.email)
  .email("E-mail inválido.");

// O teto existe antes do hash: scrypt sobre uma senha de 1 MB é CPU gratuita para
// quem ataca. `verifyPassword` já é caro de propósito — não pode ser caro sem limite.
const senhaField = z
  .string()
  .min(1, "Informe a senha.")
  .max(LIMITES_CONTA.senha, "Senha longa demais.");

export const cadastroJogadorSchema = z.object({
  email: emailField,
  nome: z.string().trim().min(2, "Informe como quer ser chamado.").max(LIMITES_CONTA.nome),
  senha: senhaField,
});

export const loginJogadorSchema = z.object({
  email: emailField,
  senha: senhaField,
});

export const trocaSenhaJogadorSchema = z.object({
  senhaAtual: senhaField,
  senhaNova: senhaField,
});

export type CadastroJogador = z.infer<typeof cadastroJogadorSchema>;
export type LoginJogador = z.infer<typeof loginJogadorSchema>;
