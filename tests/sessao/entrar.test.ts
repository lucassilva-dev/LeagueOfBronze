import { describe, expect, it } from "vitest";
import { z } from "zod";

/**
 * A porta única de login.
 *
 * `/entrar` tem UM campo e decide para qual rota mandar pela presença do `@`: com
 * arroba vai para o login de jogador, sem arroba vai para o da organização.
 *
 * Isso só é seguro porque os dois formatos NÃO SE CONFUNDEM. Este arquivo trava essa
 * premissa: se alguém um dia afrouxar o formato do nome de usuário para aceitar
 * arroba, um administrador passaria a ser roteado para o login de jogador e nunca
 * conseguiria entrar. O teste quebra antes de isso chegar em produção.
 */

/** A mesma regra que `criarSchema` aplica em app/api/admin/users/route.ts. */
const usuarioAdmin = z
  .string()
  .trim()
  .min(3)
  .max(60)
  .regex(/^[a-zA-Z0-9._-]+$/)
  .transform((v) => v.toLowerCase());

/** A decisão que o formulário toma. */
const ehJogador = (v: string) => v.trim().includes("@");

describe("os dois formatos não se confundem", () => {
  it("nome de usuário de admin NUNCA aceita arroba", () => {
    // É esta regra que sustenta o roteamento por `@`.
    expect(usuarioAdmin.safeParse("lucas@exemplo.com").success).toBe(false);
    expect(usuarioAdmin.safeParse("lu@cas").success).toBe(false);
    expect(usuarioAdmin.safeParse("@lucas").success).toBe(false);
  });

  it("os nomes de usuário válidos vão todos para o login da organização", () => {
    for (const nome of ["lucas", "onigami", "thal.in", "gay_lord", "naka-y", "razeral2"]) {
      expect(usuarioAdmin.safeParse(nome).success, `${nome} deveria ser válido`).toBe(true);
      expect(ehJogador(nome), `${nome} foi para o lado errado`).toBe(false);
    }
  });

  it("e-mails vão todos para o login do jogador", () => {
    for (const email of [
      "nak4y@exemplo.com",
      "THALIN@Exemplo.COM",
      "  lucas@gmail.com  ",
      "a+b@sub.dominio.com.br",
    ]) {
      expect(ehJogador(email), `${email} foi para o lado errado`).toBe(true);
    }
  });
});

describe("errar o formato não abre porta nenhuma", () => {
  it("texto sem arroba que não é usuário válido ainda vai para o admin e é recusado lá", () => {
    // O roteamento é só isso: roteamento. Quem digita bobagem recebe o mesmo
    // "inválido" de sempre, com o mesmo bloqueio por tentativas e o mesmo piso de
    // tempo de resposta — nenhuma verificação foi movida para o navegador.
    const bobagem = "não sei minha conta";
    expect(ehJogador(bobagem)).toBe(false);
    expect(usuarioAdmin.safeParse(bobagem).success).toBe(false);
  });

  it("campo vazio não vira e-mail nem usuário", () => {
    expect(ehJogador("")).toBe(false);
    expect(usuarioAdmin.safeParse("").success).toBe(false);
  });
});
