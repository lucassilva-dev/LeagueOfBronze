import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import Entrar from "@/components/inscricao/entrar";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * INS-01 (tela): quem esqueceu a senha não tinha saída nenhuma em /entrar — nem
 * "esqueci a senha", nem um aviso de a quem pedir. O site não envia e-mail, então a
 * recuperação é a organização gerar uma senha provisória; a tela precisa dizer isso.
 *
 * DIFF-UI-02: o texto vinha de uma constante em português, porque a chave não existia no
 * dicionário — o site em inglês mostrava «Esqueceu a senha?». Agora o texto é do
 * dicionário REAL, sem injeção, nos dois idiomas.
 */

describe("/entrar diz o que fazer quando a senha foi esquecida", () => {
  it("em português: falar com a organização, que gera uma senha provisória", () => {
    const html = renderToStaticMarkup(<Entrar t={MESSAGES.pt.inscricao} />);
    expect(html).toContain("Esqueceu a senha? Fale com a organização no grupo — ela gera uma senha provisória.");
  });

  it("em inglês, com o dicionário real: a frase sai em inglês, e nada dela em português", () => {
    const html = renderToStaticMarkup(<Entrar t={MESSAGES.en.inscricao} />);
    expect(html).toContain("SIGN IN");
    expect(html).toContain(
      "Forgot your password? Message the organisers in the group — they will generate a temporary one.",
    );
    expect(html).not.toContain("Esqueceu a senha?");
  });

  it("a chave existe nos dois dicionários", () => {
    expect(Object.hasOwn(MESSAGES.pt.inscricao, "entrarEsqueceuSenha")).toBe(true);
    expect(Object.hasOwn(MESSAGES.en.inscricao, "entrarEsqueceuSenha")).toBe(true);
  });
});
