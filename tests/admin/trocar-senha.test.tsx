import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TrocarSenha } from "@/components/admin/trocar-senha";
import { validatePasswordStrength } from "@/lib/security/password";

/**
 * A troca da própria senha.
 *
 * O buraco que ela fecha: criar uma conta para outra pessoa já marcava
 * `must_change_password = true` e o painel já mostrava "troca de senha pendente" — mas
 * não existia nada que trocasse. Quem recebia a conta ficava preso nesse estado, e o
 * master seguia sabendo a senha alheia para sempre.
 */

const desenhar = (obrigatoria: boolean) =>
  renderToStaticMarkup(<TrocarSenha obrigatoria={obrigatoria} onTrocada={() => {}} />);

describe("aparece quando precisa aparecer", () => {
  it("com troca obrigatória, já vem aberta e avisando", () => {
    const html = desenhar(true);
    expect(html).toContain("Troque a senha provisória");
    expect(html).toContain("Senha atual");
    expect(html).toContain("Nova senha");
    // Sem escapatória: quem PRECISA trocar não recebe um botão de cancelar.
    expect(html).not.toContain("Cancelar");
  });

  it("sem obrigação, fica recolhida atrás de um link", () => {
    const html = desenhar(false);
    expect(html).toContain("Trocar minha senha");
    expect(html).not.toContain("Senha atual");
  });
});

describe("as senhas nunca viajam à vista", () => {
  it("os três campos são de senha", () => {
    const html = desenhar(true);
    expect(html.match(/type="password"/g)).toHaveLength(3);
  });
});

describe("a senha provisória que a pessoa recebe", () => {
  it("'1234' é recusada — e a recusa vale para quem cria a conta também", () => {
    // Vale registrar por escrito: a senha provisória é digitada por quem CRIA a conta,
    // no mesmo campo, e passa pela mesma regra. Não existe atalho para senha temporária.
    expect(validatePasswordStrength("1234")).toBe("A senha precisa ter pelo menos 12 caracteres.");
    expect(validatePasswordStrength("1234567890123")).toBe("A senha precisa combinar letras e números.");
    expect(validatePasswordStrength("bronze1234567")).toBeNull();
  });
});
