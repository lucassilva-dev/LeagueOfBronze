import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IndicadorDeSessao } from "@/components/sessao-no-cabecalho";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * INS-01 / DIFF-BE-04 / DIFF-UI-01 (parte do jogador), no cabeçalho.
 *
 * O aviso «Troque sua senha» era um recado fixo, sem link nem formulário: quem entrava com
 * a senha provisória da organização não tinha onde trocá-la, e o aviso nunca sumia. Agora
 * ele LEVA à troca, e o menu da conta tem «Trocar senha» para todo jogador.
 */

const t = MESSAGES.pt.comum;
const JOGADOR = { nome: "Nakay", temInscricao: true, precisaTrocarSenha: false };
const ORG = { nome: "Lucas", master: true };

function desenhar(sessao: Parameters<typeof IndicadorDeSessao>[0]["sessao"], rotulos = t) {
  return renderToStaticMarkup(
    <IndicadorDeSessao
      t={rotulos}
      sessao={sessao}
      aberto
      saindo={false}
      onAlternar={() => {}}
      onFechar={() => {}}
      onSair={() => {}}
    />,
  );
}

/** O <a> que contém o texto, ou null. */
function linkCom(html: string, texto: string): string | null {
  const achados = html.match(/<a\b[^>]*>[\s\S]*?<\/a>/g) ?? [];
  return achados.find((a) => a.includes(texto)) ?? null;
}

describe("o aviso de senha provisória leva à troca", () => {
  it("«Troque sua senha» é um link para /conta/senha", () => {
    const html = desenhar({ jogador: { ...JOGADOR, precisaTrocarSenha: true }, organizacao: null });
    const aviso = linkCom(html, t.sessaoTrocarSenha);
    expect(aviso).not.toBeNull();
    expect(aviso).toContain('href="/conta/senha"');
  });

  it("sem troca pendente, o aviso não aparece", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: null });
    expect(html).not.toContain(t.sessaoTrocarSenha);
  });
});

describe("«Trocar senha» no menu da conta", () => {
  it("todo jogador tem o item, mesmo sem troca pendente", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: null });
    expect(linkCom(html, t.sessaoMenuTrocarSenha)).toContain('href="/conta/senha"');
  });

  it("com as duas contas, também (a troca é da conta de jogador)", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: ORG });
    expect(linkCom(html, t.sessaoMenuTrocarSenha)).toContain('href="/conta/senha"');
  });

  it("só organização: não oferece a troca de senha de jogador", () => {
    const html = desenhar({ jogador: null, organizacao: ORG });
    expect(html).not.toContain('href="/conta/senha"');
  });

  it("em inglês", () => {
    const html = desenhar({ jogador: { ...JOGADOR, precisaTrocarSenha: true }, organizacao: null }, MESSAGES.en.comum);
    expect(linkCom(html, "Change your password")).toContain('href="/conta/senha"');
    expect(linkCom(html, "Change password")).toContain('href="/conta/senha"');
    expect(html).not.toContain("Troque sua senha");
  });
});
