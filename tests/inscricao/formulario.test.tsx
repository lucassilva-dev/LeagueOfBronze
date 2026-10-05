import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FormularioInscricao, { Passo2, Passo3, type ConfigPublica } from "@/components/inscricao/formulario";
import { MESSAGES } from "@/lib/i18n/messages";

/**
 * O formulário de inscrição contra o regulamento da 4ª Edição.
 *
 * Os passos 2 e 3 só aparecem na tela depois de criar uma conta, então é aqui — e não
 * no navegador — que se prova o que eles mostram e, principalmente, o que NÃO mostram.
 */

const CONFIG: ConfigPublica = {
  taxaCentavos: 3000,
  chavePix: null,
  prazoPagamentoDias: 14,
  minRanqueadas: 5,
  pctCampeao: 70,
};

const ELOS = [
  { valor: "Ferro", rotulo: "Ferro" },
  { valor: "Diamante", rotulo: "Diamante" },
];

const nada = () => {};
const semProblema = () => undefined;

function passo2(lingua: "pt" | "en", turnos: ("manha" | "tarde" | "noite")[] = []) {
  return renderToStaticMarkup(
    <Passo2
      t={MESSAGES[lingua].inscricao}
      elos={ELOS}
      elo="Diamante"
      rota1="MEIO"
      rota2="TOPO"
      turnos={turnos}
      setElo={nada}
      setRota1={nada}
      setRota2={nada}
      setTurnos={nada}
      problemaDe={semProblema}
    />,
  );
}

function passo3(lingua: "pt" | "en") {
  return renderToStaticMarkup(
    <Passo3
      t={MESSAGES[lingua].inscricao}
      config={CONFIG}
      resumo={{ riotId: "Nak4y#JPN", elo: "Diamante", rota1: "MEIO", rota2: "TOPO", turnos: ["NOITE"] }}
      aceites={[false, false, false]}
      setAceites={nada}
      pixCopiado={false}
      onCopiarPix={nada}
    />,
  );
}

describe("passo 1", () => {
  it("pede nome e sobrenome, sem o '(opcional)' de antes", () => {
    const t = MESSAGES.pt.inscricao;
    const html = renderToStaticMarkup(
      <FormularioInscricao t={t} config={CONFIG} elos={ELOS} jogadorInicial={null} />,
    );
    expect(html).toContain(t.nomeLabel);
    expect(html).not.toMatch(/opcional\)/i);
  });
});

describe("passo 2", () => {
  it("pergunta os três turnos (regra 9)", () => {
    const html = passo2("pt");
    for (const turno of ["MANHÃ", "TARDE", "NOITE"]) expect(html).toContain(turno);
    expect((html.match(/type="checkbox"/g) ?? []).length).toBe(3);
  });

  it("não tem mais a caixa QUERO SER CAPITÃO — capitão é o maior elo na solo/duo", () => {
    const html = passo2("pt");
    expect(html).not.toMatch(/quero ser capit/i);
    expect(html).toContain(MESSAGES.pt.inscricao.capitaesTitulo);
  });

  it("os botões de elo não mostram pontos: a tabela da 4ª só sai com a lista fechada", () => {
    const html = passo2("pt");
    // Antes cada botão trazia o preço da 3ª ao lado do nome ("Diamante 8").
    expect(html).not.toMatch(/Diamante<!-- -->\s*<span/);
    expect(html).not.toMatch(/>\s*8\s*</);
  });

  it("marca o turno escolhido", () => {
    const html = passo2("pt", ["noite"]);
    expect((html.match(/checked=""/g) ?? []).length).toBe(1);
  });

  it("existe em inglês também", () => {
    const html = passo2("en");
    for (const turno of ["MORNING", "AFTERNOON", "NIGHT"]) expect(html).toContain(turno);
  });
});

describe("passo 3", () => {
  it("não mostra VALOR nem PONTOS", () => {
    const html = passo3("pt");
    expect(html).not.toMatch(/\bVALOR\b|\bPONTOS\b/);
  });

  it("diz a divisão do prêmio vinda da configuração e que a organização não fica com nada", () => {
    const html = passo3("pt");
    expect(html).toContain("70% para o campeão e 30% para o vice");
    expect(html).toMatch(/organização não fica com nada/);
    expect(html).toMatch(/R\$\s*30,00/);
  });

  it("os aceites citam as regras da 4ª, com o mínimo de partidas da configuração", () => {
    const html = passo3("pt");
    expect(html).toMatch(/regra 22/);
    expect(html).toMatch(/regra 17/);
    expect(html).toMatch(/ao menos 5 partidas solo\/duo nos 10 dias/);
    // Nenhuma referência às regras por letra da 3ª, nem ao tempo mínimo no grupo.
    expect(html).not.toMatch(/\(regra [a-z]\)/i);
    expect(html).not.toMatch(/no grupo há pelo menos/);
    // Nenhum marcador sem preencher.
    expect(html).not.toMatch(/\{\w+\}/);
  });

  it("leva ao regulamento numa aba nova, para não perder o que foi preenchido", () => {
    const html = passo3("pt");
    expect(html).toMatch(/href="\/regras"[^>]*target="_blank"|target="_blank"[^>]*href="\/regras"/);
  });

  it("mostra a disponibilidade no resumo", () => {
    expect(passo3("pt")).toMatch(/DISPONIBILIDADE PARA JOGAR: NOITE/);
  });

  it("em inglês, sem marcador sem preencher", () => {
    const html = passo3("en");
    expect(html).toContain("70% to the champion and 30% to the runner-up");
    expect(html).not.toMatch(/\{\w+\}/);
  });
});
