"use client";

import type { CSSProperties } from "react";

import { C, Card, Elo, ScrollX, display, tabular } from "@/components/admin/ui";
import { precoDeTodasAsDivisoes, tabelaDoRetrato, type RetratoDaTabela } from "@/lib/draft/precos";

/**
 * A tabela de pontos automática de uma edição, do jeito que a organização confere.
 *
 * Uma peça só para as duas telas que a mostram: a conferência do draft (a tabela OFICIAL,
 * vinda do servidor) e Times e vagas (a PRÉVIA, calculada no navegador com a mesma função).
 * As duas leem o mesmo retrato (`retratoDaTabela`), então uma não pode contar a conta de um
 * jeito e a outra de outro.
 *
 * Cada linha é uma classe de preço (elo e divisão; no Mestre, a faixa de 100 PDL): quantas
 * pessoas estão nela, o preço da reta antes de arredondar e o preço que vale. Embaixo, o
 * total contra `times × orçamento` — o número que tem de bater —, o erro do arredondamento
 * e uma frase de como a conta foi feita, para quem for explicar no grupo.
 */

const th: CSSProperties = {
  padding: "0 12px 9px",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${C.line}`,
  textAlign: "left",
};

const td: CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
};

const tdNum: CSSProperties = { ...td, textAlign: "right", ...tabular };

const nota: CSSProperties = { margin: 0, fontSize: 11.5, lineHeight: 1.65, color: C.ink4 };

/** Número com vírgula, no máximo duas casas: "6,58", "1,12", "6". */
export function numeroBr(valor: number, casas = 2): string {
  return valor.toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

/** Abaixo de 2, singular: "1,12 divisão", "0,5 divisão", "2 divisões". */
function divisoes(valor: number): string {
  return `${numeroBr(valor)} ${valor < 2 ? "divisão" : "divisões"}`;
}

/** "III", "· 200–299 PDL": o que vem depois do nome do elo, que o emblema já mostra. */
function detalheDaClasse(rotulo: string, elo: string): string | null {
  if (!rotulo.startsWith(elo)) return null;
  return rotulo.slice(elo.length).replace(/^[\s·]+/, "").trim() || null;
}

/**
 * "o total bate": a soma de quem joga contra `times × orçamento`. Calculada sobre um pool que
 * não é o do sorteio (aptos ≠ vagas), não leva ✓ nem a cor de "fechou": o número é real, mas
 * não fecha nada ainda.
 */
export function TotalDaTabela({ tabela }: Readonly<{ tabela: RetratoDaTabela }>) {
  const incompleto = tabela.poolIncompleto === true;
  const bate = tabela.folga === 0 && !incompleto;
  const cor = incompleto ? C.ink3 : bate ? C.okSoft : tabela.folga > 0 ? C.warnSoft : C.dangerSoft;
  return (
    <span style={{ color: cor, ...tabular }}>
      {tabela.soma} de {tabela.alvo} ({tabela.times} × {tabela.orcamentoPorTime}){bate ? " ✓" : ""}
      {incompleto ? " · pool incompleto" : ""}
    </span>
  );
}

/**
 * A frase de como a tabela foi calculada — curta, para caber no painel e no print. Cada parte
 * só aparece quando é verdade: a dos degraus de cima só com curvatura; a da soma exata só sem
 * folga (e com o pool do sorteio).
 */
export function ComoFoiCalculada({ tabela }: Readonly<{ tabela: RetratoDaTabela }>) {
  const medio = numeroBr(tabela.reta.precoMedio);
  const conta = `${tabela.orcamentoPorTime} ÷ ${tabela.jogadoresPorTime}`;
  const total = `${tabela.times} × ${tabela.orcamentoPorTime} = ${tabela.alvo}`;
  if (tabela.reta.inclinacao === 0) {
    return (
      <p style={nota}>
        Como foi calculada: todo mundo que joga está na mesma classe, então cada um custa a média,{" "}
        {medio} ({conta}), arredondada para a soma não passar de {total}.
      </p>
    );
  }
  const exata = tabela.folga === 0 && tabela.poolIncompleto !== true;
  // Com o capitão sem preço, a régua é só de quem vai ser escolhido.
  const quem = tabela.capitaoGratis ? "Quem vai ser escolhido" : "Quem joga";
  return (
    <p style={nota}>
      Como foi calculada: cada divisão é um degrau (no Mestre, cada 100 PDL)
      {tabela.curvatura > 0
        ? ", e os degraus de cima valem um pouco mais que os de baixo, como já era na tabela da 3ª"
        : ", e todo degrau vale o mesmo"}
      . {quem} com o elo mais baixo custa 1 ponto e o jogador médio custa {medio} ({conta}); os outros
      ficam na régua entre os dois,{" "}
      {exata ? (
        <>
          arredondados para a soma dar exatamente {total}. Como todo time gasta o orçamento inteiro, o que
          sobra de diferença entre os times é o arredondamento: cada preço fica no máximo a{" "}
          {divisoes(tabela.erroMaximoEmDegraus)} (na altura de quem paga) do que a régua daria.
        </>
      ) : tabela.folga > 0 ? (
        <>
          arredondados para a soma ficar em {tabela.soma}, {tabela.folga} abaixo de {total}: um time pode terminar
          o draft gastando menos que outro. Cada preço fica no máximo a {divisoes(tabela.erroMaximoEmDegraus)} do
          que a régua daria.
        </>
      ) : (
        <>
          arredondados para a soma chegar o mais perto de {total}. Cada preço fica no máximo a{" "}
          {divisoes(tabela.erroMaximoEmDegraus)} do que a régua daria.
        </>
      )}
    </p>
  );
}

/** Por que a conta desceu da tabela pedida (curvatura, soma), quando desceu. */
export function MotivoDaQueda({ tabela }: Readonly<{ tabela: RetratoDaTabela }>) {
  if (!tabela.queda) return null;
  return <p style={{ ...nota, color: C.warnSoft }}>{tabela.queda.motivo}</p>;
}

/**
 * O capitão fora da tabela (decisão de 23/10/2026): quem lê a tabela precisa saber que os
 * capitães não estão nela e que o orçamento inteiro é das escolhas — senão "8 × 30 = 240" com
 * 32 pessoas parece conta errada.
 */
export function CapitaesForaDaTabela({ tabela }: Readonly<{ tabela: RetratoDaTabela }>) {
  if (!tabela.capitaoGratis) return null;
  const escolhas = tabela.jogadoresPorTime;
  return (
    <p style={{ ...nota, color: C.ink2 }}>
      {tabela.times === 1 ? "O capitão não entra" : `Os ${tabela.times} capitães não entram`} nesta tabela: capitão não tem
      preço, e cada time tem os{" "}
      {tabela.orcamentoPorTime} pontos para as {escolhas} {escolhas === 1 ? "escolha" : "escolhas"}. A tabela é só de
      quem vai ser escolhido ({tabela.times * escolhas} pessoas), e a soma dá exatamente {tabela.times} ×{" "}
      {tabela.orcamentoPorTime} = {tabela.alvo}.
    </p>
  );
}

/**
 * «Preço de todas as divisões»: a régua desta tabela para qualquer elo, recolhida por padrão.
 * É o que a organização consulta para reserva, substituto (regra 6) e para quem mudou de elo
 * até o congelamento, sem conta à mão. Quem não está no pool sai da reta, presa entre as
 * linhas vizinhas (`precoNaTabela`) — a mesma conta que precifica a fila de reserva.
 */
export function PrecoDeTodasAsDivisoes({ tabela }: Readonly<{ tabela: RetratoDaTabela }>) {
  const todas = precoDeTodasAsDivisoes(tabelaDoRetrato(tabela));
  return (
    <details style={{ marginTop: 10 }}>
      <summary style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 600, color: C.bronzeHi }}>
        Preço de todas as divisões
      </summary>
      <p style={{ ...nota, margin: "8px 0" }}>
        O preço de qualquer elo nesta tabela — para reserva, substituto e para quem mudar de elo até o congelamento.
        As classes marcadas com «fora do pool» não têm ninguém entre quem vai ser escolhido: o preço delas sai da
        régua, preso entre as classes vizinhas.
      </p>
      <ul
        aria-label="Preço de todas as divisões"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
          gap: "4px 14px",
        }}
      >
        {todas.map((d) => (
          <li
            key={d.chave}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              padding: "5px 0",
              borderBottom: "1px solid rgba(201,138,75,.09)",
              fontSize: 12.5,
              color: d.noPool ? C.ink2 : C.ink3,
            }}
          >
            <span style={{ minWidth: 0 }}>
              <Elo elo={d.elo} tamanho={20} mostrarNome detalhe={detalheDaClasse(d.rotulo, d.elo)} />
              {d.noPool ? null : (
                <span style={{ display: "block", fontSize: 10, color: C.ink4, marginTop: 2 }}>fora do pool</span>
              )}
            </span>
            <b style={{ color: C.bronzeHi, ...tabular }}>
              {d.pontos} <span style={{ fontSize: 10, fontWeight: 400, color: C.ink4 }}>{d.pontos === 1 ? "pt" : "pts"}</span>
            </b>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function TabelaDePontos({
  tabela,
  compacto,
}: Readonly<{ tabela: RetratoDaTabela; compacto: boolean }>) {
  const maiorGrupo = tabela.linhas.reduce((m, l) => Math.max(m, l.quantos), 0);

  const rodape = (
    <Card padding="12px 16px" style={{ marginTop: 10, display: "grid", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 18px", fontSize: 12.5, color: C.ink2 }}>
        <span>
          Total: <TotalDaTabela tabela={tabela} />
        </span>
        <span style={tabular}>
          Erro máximo do arredondamento: <b style={{ color: C.ink }}>{divisoes(tabela.erroMaximoEmDegraus)}</b>
        </span>
      </div>
      <CapitaesForaDaTabela tabela={tabela} />
      <MotivoDaQueda tabela={tabela} />
      {tabela.folga > 0 && !tabela.queda ? (
        <p style={{ ...nota, color: C.warnSoft }}>
          Não existe tabela inteira com a soma exata para este pool: sobram {tabela.folga}{" "}
          {tabela.folga === 1 ? "ponto" : "pontos"} no total, e um time pode terminar o draft gastando menos que
          outro.
        </p>
      ) : null}
      {tabela.poolIncompleto ? (
        <p style={{ ...nota, color: C.warnSoft }}>
          Pool incompleto: os aptos não batem com as vagas, então esta tabela foi calculada sobre quem está apto
          hoje e não é a do sorteio. Ela é refeita quando a lista fechar.
        </p>
      ) : null}
      {tabela.folga < 0 ? (
        <p style={{ ...nota, color: C.dangerSoft }}>
          O orçamento não paga nem 1 ponto por jogador: a soma passa do teto em {Math.abs(tabela.folga)}. Suba o
          orçamento por time em Configuração.
        </p>
      ) : null}
      <ComoFoiCalculada tabela={tabela} />
      <PrecoDeTodasAsDivisoes tabela={tabela} />
    </Card>
  );

  if (compacto) {
    return (
      <>
        <Card padding="2px 14px">
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {tabela.linhas.map((l, indice) => (
              <li
                key={l.chave}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  alignItems: "center",
                  gap: 12,
                  padding: "9px 0",
                  borderTop: indice === 0 ? undefined : "1px solid rgba(201,138,75,.09)",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <Elo elo={l.elo} tamanho={32} mostrarNome detalhe={detalheDaClasse(l.rotulo, l.elo)} />
                  <span style={{ display: "block", marginTop: 4, fontSize: 11, color: C.ink4, ...tabular }}>
                    {l.quantos} {l.quantos === 1 ? "pessoa" : "pessoas"} · reta {numeroBr(l.ideal)}
                  </span>
                </span>
                <span style={{ textAlign: "right", lineHeight: 1 }}>
                  <span style={{ display: "block", fontFamily: display, fontSize: 22, color: C.bronzeHi, ...tabular }}>
                    {l.pontos}
                  </span>
                  <span style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.ink4 }}>
                    {l.pontos === 1 ? "ponto" : "pontos"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
        {rodape}
      </>
    );
  }

  return (
    <>
      <ScrollX>
        <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th scope="col" style={th}>
                Elo
              </th>
              <th scope="col" style={{ ...th, textAlign: "right" }}>
                Pessoas
              </th>
              <th scope="col" style={{ ...th, width: "100%" }}>
                Proporção
              </th>
              <th scope="col" style={{ ...th, textAlign: "right" }} title="O preço da reta, antes de arredondar">
                Pela reta
              </th>
              <th scope="col" style={{ ...th, textAlign: "right" }}>
                Preço
              </th>
              <th scope="col" style={{ ...th, textAlign: "right" }}>
                Soma
              </th>
            </tr>
          </thead>
          <tbody>
            {tabela.linhas.map((l) => (
              <tr key={l.chave}>
                <td style={td}>
                  <Elo elo={l.elo} tamanho={24} mostrarNome detalhe={detalheDaClasse(l.rotulo, l.elo)} />
                </td>
                <td style={tdNum}>{l.quantos}</td>
                <td style={{ ...td, width: "100%" }}>
                  <span
                    aria-hidden
                    style={{ display: "block", height: 6, minWidth: 60, borderRadius: 2, background: "rgba(0,0,0,.35)" }}
                  >
                    <span
                      style={{
                        display: "block",
                        height: "100%",
                        width: `${maiorGrupo > 0 ? (l.quantos / maiorGrupo) * 100 : 0}%`,
                        borderRadius: 2,
                        background: C.bronze,
                      }}
                    />
                  </span>
                </td>
                <td style={{ ...tdNum, color: C.ink4 }}>{numeroBr(l.ideal)}</td>
                <td style={{ ...tdNum, color: C.bronzeHi, fontWeight: 700 }}>{l.pontos}</td>
                <td style={tdNum}>{l.quantos * l.pontos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
      {rodape}
    </>
  );
}
