import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IndicadorDeSessao } from "@/components/sessao-no-cabecalho";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O indicador de sessão no cabeçalho.
 *
 * Ele existe porque duas sessões independentes convivem no site — organização e
 * jogador — e nada dizia em qual a pessoa estava. No dia do draft isso deixa de ser
 * conveniência: o capitão precisa saber que está logado antes de a vez dele chegar.
 *
 * Os quatro estados abaixo são os que existem de verdade, e o quarto (as duas ao mesmo
 * tempo) é o que confunde se não for dito com todas as letras.
 */

const t = MESSAGES.pt.comum;

function desenhar(
  sessao: Parameters<typeof IndicadorDeSessao>[0]["sessao"],
  aberto = false,
) {
  return renderToStaticMarkup(
    <IndicadorDeSessao
      t={t}
      sessao={sessao}
      aberto={aberto}
      saindo={false}
      onAlternar={() => {}}
      onFechar={() => {}}
      onSair={() => {}}
    />,
  );
}

const JOGADOR = { nome: "Nakay", temInscricao: true, precisaTrocarSenha: false };
const ORG = { nome: "Lucas", master: true };

describe("os quatro estados", () => {
  it("deslogado: oferece entrar, e o link leva a uma página que existe", () => {
    const html = desenhar({ jogador: null, organizacao: null });
    expect(html).toContain(t.sessaoEntrar);
    // /entrar é a página que fecha o buraco: com as inscrições fechadas, o formulário
    // some e com ele sumiam os únicos campos de login do site.
    expect(html).toContain('href="/entrar"');
  });

  it("jogador: mostra o nome e o caminho para o painel do capitão", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: null }, true);
    expect(html).toContain("Nakay");
    expect(html).toContain(t.sessaoJogador);
    expect(html).toContain('href="/capitao"');
    expect(html).toContain('href="/minha-inscricao"');
    // Quem é só jogador não pode ver o painel da organização oferecido.
    expect(html).not.toContain('href="/admin"');
  });

  it("jogador sem inscrição recebe o convite para se inscrever, não o link da ficha", () => {
    const html = desenhar(
      { jogador: { ...JOGADOR, temInscricao: false }, organizacao: null },
      true,
    );
    expect(html).toContain(t.sessaoFazerInscricao);
    expect(html).not.toContain(t.sessaoMinhaInscricao);
  });

  it("organização: diz que é master e leva ao painel", () => {
    const html = desenhar({ jogador: null, organizacao: ORG }, true);
    expect(html).toContain("Lucas");
    expect(html).toContain(t.sessaoMaster);
    expect(html).toContain('href="/admin"');
    expect(html).not.toContain('href="/capitao"');
  });

  it("AS DUAS ao mesmo tempo: diz isso com todas as letras", () => {
    // É o estado que mais confunde — a pessoa está logada como organização e como
    // jogador no mesmo navegador, e cada tela responde a uma sessão diferente.
    const html = desenhar({ jogador: JOGADOR, organizacao: ORG }, true);
    expect(html).toContain(t.sessaoDuasContas);
    expect(html).toContain('href="/admin"');
    expect(html).toContain('href="/capitao"');
  });
});

describe("o que o indicador nunca faz", () => {
  it("não mostra e-mail nem id — o cabeçalho não precisa deles", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: ORG }, true);
    expect(html).not.toMatch(/@/);
  });

  it("avisa quando a senha precisa ser trocada", () => {
    const html = desenhar(
      { jogador: { ...JOGADOR, precisaTrocarSenha: true }, organizacao: null },
      true,
    );
    expect(html).toContain(t.sessaoTrocarSenha);
  });

  it("fechado, não vaza o conteúdo do menu", () => {
    const html = desenhar({ jogador: JOGADOR, organizacao: null }, false);
    expect(html).toContain("Nakay");
    expect(html).not.toContain('href="/capitao"');
  });

  it("funciona em inglês sem sobrar português", () => {
    const html = renderToStaticMarkup(
      <IndicadorDeSessao
        t={MESSAGES.en.comum}
        sessao={{ jogador: JOGADOR, organizacao: null }}
        aberto
        saindo={false}
        onAlternar={() => {}}
        onFechar={() => {}}
        onSair={() => {}}
      />,
    );
    expect(html).toContain("Player");
    expect(html).not.toMatch(/\b(Jogador|Sair|Organização)\b/);
  });
});
