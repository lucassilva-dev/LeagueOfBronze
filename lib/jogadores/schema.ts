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
  // O mesmo teto do nome na inscrição (`LIMITES_INSCRICAO.nome`): desde a 4ª o formulário
  // cria a conta com o nome e sobrenome do grupo, e um teto menor aqui travava o passo 1
  // de quem tem nome comprido — com a mensagem crua do zod, em inglês.
  nome: 120,
  senha: 200,
} as const;

/**
 * Textos de validação da conta, nos dois idiomas.
 *
 * O schema usa o português (é o que o zod devolve). O cadastro troca pelo inglês quando
 * o site está em inglês (`traduzirMensagemDaConta`) — antes, no site em inglês, o
 * jogador lia "Informe seu nome e sobrenome." sem entender o que faltava.
 */
export const MENSAGENS_DA_CONTA = {
  pt: {
    emailVazio: "Informe o e-mail.",
    emailInvalido: "E-mail inválido.",
    emailLongo: "E-mail longo demais.",
    nomeCurto: "Informe seu nome e sobrenome.",
    nomeLongo: `Use no máximo ${LIMITES_CONTA.nome} caracteres.`,
    senhaVazia: "Informe a senha.",
    senhaLonga: "Senha longa demais.",
  },
  en: {
    emailVazio: "Enter your e-mail.",
    emailInvalido: "Invalid e-mail.",
    emailLongo: "E-mail too long.",
    nomeCurto: "Enter your first and last name.",
    nomeLongo: `Use at most ${LIMITES_CONTA.nome} characters.`,
    senhaVazia: "Enter a password.",
    senhaLonga: "Password too long.",
  },
} as const satisfies Record<"pt" | "en", Record<string, string>>;

type ChaveDaConta = keyof (typeof MENSAGENS_DA_CONTA)["pt"];

/** O texto no idioma pedido, a partir do texto em português que o zod devolveu; null se não for nosso. */
export function traduzirMensagemDaConta(mensagemPt: string, locale: "pt" | "en"): string | null {
  const chaves = Object.keys(MENSAGENS_DA_CONTA.pt) as ChaveDaConta[];
  const chave = chaves.find((k) => MENSAGENS_DA_CONTA.pt[k] === mensagemPt);
  return chave ? MENSAGENS_DA_CONTA[locale][chave] : null;
}

const M = MENSAGENS_DA_CONTA.pt;

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, M.emailVazio)
  .max(LIMITES_CONTA.email, M.emailLongo)
  .email(M.emailInvalido);

// O teto existe antes do hash: scrypt sobre uma senha de 1 MB é CPU gratuita para
// quem ataca. `verifyPassword` já é caro de propósito — não pode ser caro sem limite.
const senhaField = z
  .string()
  .min(1, M.senhaVazia)
  .max(LIMITES_CONTA.senha, M.senhaLonga);

export const cadastroJogadorSchema = z.object({
  email: emailField,
  nome: z
    .string()
    .trim()
    .min(2, M.nomeCurto)
    .max(LIMITES_CONTA.nome, M.nomeLongo),
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
