"use client";

import type { CSSProperties } from "react";

import { useCompacto } from "@/components/admin/responsivo";
import { teamColor } from "@/lib/design";
import { formatKda } from "@/lib/format";
import type { TournamentDataset } from "@/lib/schema";
import { calculateStandings, buildLeaderboards } from "@/lib/tournament";

import { C, Card, Chip, display, Empty, Eyebrow, Metric, ScrollX, SectionHead, tabular } from "./ui";

/**
 * Visão geral: a primeira tela do painel. Ela não edita nada — serve para o organizador
 * conferir, em dois segundos, se o que ele acabou de digitar bateu com o que ele esperava.
 *
 * Por isso a prévia da classificação virou TABELA de verdade (e mostra TODOS os times, não
 * uma amostra): conferir posição só faz sentido comparando linhas alinhadas, e um time cortado
 * da lista é justamente o que ninguém percebe que sumiu.
 *
 * No celular ela continua tabela — pelo mesmo motivo — só que de régua apertada: seis
 * colunas cabem em 328px sem rolar de lado. Virar cartão tiraria o alinhamento, que é a
 * razão de ela existir.
 */

// Cabeçalho e célula compartilham a régua vertical; declarados fora do componente para não
// serem recriados a cada render.
const th: CSSProperties = {
  padding: "0 12px 9px",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${C.line}`,
};

const td: CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
};

/**
 * A régua do celular. Os 12px de cada lado eram 144px de vão numa tabela de seis colunas
 * — mais da metade do que sobra para o nome do time numa tela de 360px.
 */
const thCompacto: CSSProperties = { ...th, padding: "0 6px 8px", letterSpacing: ".1em" };
const tdCompacto: CSSProperties = { ...td, padding: "9px 6px", fontSize: 12.5 };

/** Plural curto, só para o detalhe da métrica de séries não sair escrito errado. */
function plural(n: number, um: string, muitos: string) {
  return `${n} ${n === 1 ? um : muitos}`;
}

export function AdminOverviewPanel({ draft }: Readonly<{ draft: TournamentDataset }>) {
  const compacto = useCompacto();
  const standings = calculateStandings(draft);
  const topKills = buildLeaderboards(draft).kills[0];

  // Série sem `stage` é da fase regular (mesma convenção do lib/tournament).
  const finais = draft.seriesMatches.filter((s) => s.stage === "FINAL").length;
  const semis = draft.seriesMatches.filter((s) => s.stage === "SEMIFINAL").length;
  const regulares = draft.seriesMatches.length - finais - semis;

  const detalheSeries = [
    `${regulares} na fase regular`,
    // Semifinal só aparece quando existe: o formato muda a cada edição e nem toda temporada tem.
    semis > 0 ? plural(semis, "semifinal", "semifinais") : null,
    plural(finais, "final", "finais"),
  ]
    .filter(Boolean)
    .join(" · ");

  const cab = compacto ? thCompacto : th;
  const cel = compacto ? tdCompacto : td;

  const tabela = (
    <table
      style={{
        width: "100%",
        // Sem piso de largura no celular: com os 480px de antes a tabela empurrava o cartão
        // (e a página) para ~518px numa tela de 390px.
        minWidth: compacto ? undefined : 480,
        borderCollapse: "collapse",
        ...tabular,
      }}
    >
      <thead>
        <tr>
          <th scope="col" style={{ ...cab, textAlign: "right", width: compacto ? 26 : 46 }}>
            #
          </th>
          <th scope="col" style={{ ...cab, textAlign: "left", width: "100%" }}>
            Time
          </th>
          <th scope="col" style={{ ...cab, textAlign: "right" }}>
            Pts
          </th>
          <th scope="col" style={{ ...cab, textAlign: "right" }}>
            V
          </th>
          <th scope="col" style={{ ...cab, textAlign: "right" }}>
            D
          </th>
          <th scope="col" style={{ ...cab, textAlign: "right" }}>
            Saldo
          </th>
        </tr>
      </thead>
      <tbody>
        {standings.rows.map((row) => {
          const cor = teamColor(row.teamId);
          const lider = row.position === 1;
          // Saldo é o único número com sinal: cor de estado ajuda a ler a coluna inteira
          // de relance, sem precisar caçar o "-".
          const corSaldo = row.gameDiff > 0 ? C.okSoft : row.gameDiff < 0 ? C.dangerSoft : C.ink3;

          return (
            <tr key={row.teamId}>
              <td
                style={{
                  ...cel,
                  textAlign: "right",
                  fontFamily: display,
                  fontSize: 15,
                  color: lider ? C.bronzeHi : C.ink4,
                }}
              >
                {row.position}
              </td>
              <td style={{ ...cel, textAlign: "left", whiteSpace: "normal" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: compacto ? 7 : 9 }}>
                  <span
                    aria-hidden
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: cor,
                      boxShadow: `0 0 0 3px ${cor}22`,
                      flexShrink: 0,
                    }}
                  />
                  {/* `anywhere`: no celular a coluna do nome é a que encolhe, e um nome sem
                      espaço não pode alargar a tabela de volta. */}
                  <span
                    style={{
                      color: C.ink,
                      fontWeight: lider ? 700 : 500,
                      overflowWrap: compacto ? "anywhere" : undefined,
                    }}
                  >
                    {row.teamName}
                  </span>
                </span>
              </td>
              <td
                style={{
                  ...cel,
                  textAlign: "right",
                  color: C.bronzeLit,
                  fontWeight: 700,
                }}
              >
                {row.points}
              </td>
              <td style={{ ...cel, textAlign: "right" }}>{row.seriesWon}</td>
              <td style={{ ...cel, textAlign: "right" }}>{row.seriesLost}</td>
              <td style={{ ...cel, textAlign: "right", color: corSaldo }}>
                {row.gameDiff > 0 ? `+${row.gameDiff}` : row.gameDiff}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <section>
      {/*
        Toda seção do painel abre com o selo e o título — a Visão geral era a única que
        começava direto nos números, sem dizer onde a pessoa estava. Vale para o celular e
        para o monitor: é a mesma identidade das outras abas.
      */}
      <SectionHead
        eyebrow="Campeonato"
        title="Visão geral"
        description="O retrato do rascunho em dois segundos: quantos times, jogadores e séries, e a classificação recalculada a cada edição. Nada aqui é editável."
      />

      {/*
        `minmax(0, 1fr)` em vez da coluna implícita: item de grade tem largura mínima
        "auto", e a coluna automática crescia até caber a tabela inteira — o `ScrollX` lá
        dentro nunca chegava a rolar, quem estourava era a página.
      */}
      <div style={{ display: "grid", gap: compacto ? 14 : 18, gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div
          style={{
            display: "grid",
            gap: compacto ? 10 : 12,
            // No celular, duas colunas fixas: com o mínimo de 190px cabia uma só, e as quatro
            // métricas empurravam a classificação para a segunda tela.
            gridTemplateColumns: compacto ? "repeat(2, minmax(0, 1fr))" : "repeat(auto-fit, minmax(190px, 1fr))",
          }}
        >
          <Metric label="Times" value={draft.teams.length} />
          <Metric label="Jogadores" value={draft.players.length} />
          <Metric label="Séries" value={draft.seriesMatches.length} detail={detalheSeries} />
          <Metric
            label="Mais abates (prévia)"
            // `small` porque aqui o valor é um nick, não um número: em 30px um nick longo quebra
            // o cartão.
            small
            value={topKills?.player.playerNick ?? "—"}
            detail={
              topKills
                ? `${topKills.player.kills} abates · KDA ${formatKda(topKills.player.kda)}`
                : "Sem jogos registrados"
            }
          />
        </div>

        <Card padding={compacto ? "14px 12px 4px" : "18px 18px 6px"}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 14,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Eyebrow>Prévia</Eyebrow>
              <h3 style={{ fontFamily: display, fontSize: compacto ? 17 : 19, color: C.ink, margin: "0 0 5px" }}>
                Classificação (cálculo automático)
              </h3>
              <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, maxWidth: "62ch", lineHeight: 1.6 }}>
                Recalculada localmente a cada edição. O que for salvo atualiza a tabela pública.
              </p>
            </div>
            {/* De onde vieram os números importa: "semente" significa que ninguém jogou ainda e
                a tabela está vindo da pontuação inicial digitada à mão. */}
            <Chip tone={standings.source === "series" ? "ok" : "warn"}>
              {standings.source === "series" ? "calculada pelas séries" : "vinda da pontuação inicial"}
            </Chip>
          </div>

          {standings.rows.length === 0 ? (
            <div style={{ paddingBottom: 12 }}>
              <Empty title="Nenhum time para classificar">
                Cadastre os times na aba Times para a prévia da classificação aparecer aqui.
              </Empty>
            </div>
          ) : compacto ? (
            // Sem `ScrollX`: a régua apertada já cabe, e uma tabela que rola de lado no
            // polegar esconde justamente a coluna do saldo.
            tabela
          ) : (
            <ScrollX>{tabela}</ScrollX>
          )}
        </Card>
      </div>
    </section>
  );
}
