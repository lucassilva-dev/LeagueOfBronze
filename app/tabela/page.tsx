import Link from "next/link";

import { Eyebrow, GoldTitle, TeamMark } from "@/components/lob/ui";
import { PreTemporadaAviso } from "@/components/pre-temporada-aviso";
import { buildFinalGame, buildRegularGames, buildSemifinalGames } from "@/lib/calendar";
import { calendarioEDestaTemporada } from "@/lib/calendario-4a";
import { semTemporadaAoVivo } from "@/lib/fase-do-site";
import { teamColor } from "@/lib/design";
import { diaEMes } from "@/lib/i18n/messages/paginas-home";
import { getMessages } from "@/lib/i18n/server";
import { buildDesignTeams } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { calculateStandings } from "@/lib/tournament";

export const dynamic = "force-dynamic";

const GRID = "44px 1fr 46px 46px 46px 56px 60px 84px";

/**
 * Quantos avançam da fase de pontos: na 4ª, os 4 primeiros vão às semifinais (1º x 4º e
 * 2º x 3º). Até a 3ª eram os 2 primeiros, direto para a final.
 *
 * Sai do DATASET, não de uma constante: a 3ª continua no ar (encerrada) até a organização
 * iniciar a 4ª, e uma /tabela dela dizendo "os 4 primeiros vão às semifinais" contaria uma
 * história que não aconteceu. Tem semifinal, ou é a temporada do calendário oficial → 4;
 * tem final sem semifinal → 2; sem nada ainda → o formato vigente (4).
 */
function classificadosDaTemporada(dataset: Parameters<typeof buildRegularGames>[0]): number {
  const temSemifinal = dataset.seriesMatches.some((s) => s.stage === "SEMIFINAL");
  if (temSemifinal) return 4;
  const dias = [
    ...buildRegularGames(dataset),
    ...buildSemifinalGames(dataset),
    ...[buildFinalGame(dataset)].filter((g) => g !== null),
  ]
    .map((g) => g.dateKey)
    .filter(Boolean);
  if (calendarioEDestaTemporada(dias)) return 4;
  return dataset.seriesMatches.some((s) => s.stage === "FINAL") ? 2 : 4;
}

export default async function TabelaPage() {
  const t = await getMessages();
  const textos = t.paginasCompeticao;
  const { dataset } = await getServerDataset();
  const classificados = classificadosDaTemporada(dataset);
  const info = [
    {
      k: textos.tabelaInfoPontuacaoTitulo,
      v: (
        <>
          {textos.tabelaInfoPontuacaoAntes}
          <b style={{ color: "#e6c592" }}>{textos.tabelaInfoPontuacaoDestaque}</b>
          {textos.tabelaInfoPontuacaoDepois}
        </>
      ),
    },
    { k: textos.tabelaInfoDesempateTitulo, v: <>{textos.tabelaInfoDesempateTexto}</> },
    {
      k: textos.tabelaInfoClassificacaoTitulo,
      v: (
        <>
          {textos.tabelaInfoClassificacaoAntes}
          <b style={{ color: "#e6c592" }}>
            {textos.tabelaInfoClassificacaoDestaque.replace("{n}", String(classificados))}
          </b>
          {classificados === 2 ? textos.tabelaInfoClassificacaoDepoisFinalDireta : textos.tabelaInfoClassificacaoDepois}
        </>
      ),
    },
  ];
  if (semTemporadaAoVivo(dataset)) return <PreTemporadaAviso pagina="tabela" />;
  const standings = calculateStandings(dataset).rows;
  const teamsById = new Map(buildDesignTeams(dataset).map((team) => [team.id, team]));
  // Dia da 1ª rodada: o da primeira série da temporada no ar (em Brasília).
  const primeiraSerie = buildRegularGames(dataset)[0];
  const intro = primeiraSerie?.dateKey
    ? textos.tabelaIntro.replace("{data}", diaEMes(primeiraSerie.dateKey, t.compartilhados.localeTag))
    : textos.tabelaIntroSemData;

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>{textos.tabelaEyebrow}</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88 }}>{textos.tabelaTitulo}</GoldTitle>
        <p style={{ maxWidth: 600, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          {intro}
        </p>
      </section>

      <section className="lob-fade">
        <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
          <div style={{ minWidth: 680 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 6, padding: "13px 18px", background: "rgba(201,138,75,.08)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
              <span>{textos.tabelaColPosicao}</span>
              <span>{textos.tabelaColTime}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColJogos}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColVitorias}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColDerrotas}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColSaldo}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColPontos}</span>
              <span style={{ textAlign: "center" }}>{textos.tabelaColElenco}</span>
            </div>
            {standings.map((row) => {
              const team = teamsById.get(row.teamId);
              const color = team?.color ?? teamColor(row.teamId);
              const classificado = row.position <= classificados;
              // Linha de corte: a borda de cima do primeiro que fica de fora é tracejada e dourada.
              const primeiroForaDoCorte = row.position === classificados + 1;
              return (
              <Link
                key={row.teamId}
                href={`/times/${row.teamSlug}`}
                data-classificado={classificado ? "sim" : undefined}
                style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 6, padding: "14px 18px", borderTop: primeiroForaDoCorte ? "1px dashed rgba(232,184,120,.55)" : "1px solid rgba(201,138,75,.10)", fontSize: 13, textDecoration: "none" }}
              >
                <span className="lob-display" style={{ color: classificado ? "#cfa877" : "#6f6656", fontSize: 16 }}>{row.position}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <TeamMark imageUrl={team?.imageUrl} color={color} name={row.teamName} size={30} diamond={11} />
                  <div style={{ color: "#f0e9dd", fontWeight: 600, letterSpacing: ".02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.teamName}</div>
                </div>
                <span style={{ textAlign: "center", color: "#8f8472" }}>{row.seriesPlayed}</span>
                <span style={{ textAlign: "center", color: "#8f8472" }}>{row.seriesWon}</span>
                <span style={{ textAlign: "center", color: "#8f8472" }}>{row.seriesLost}</span>
                <span style={{ textAlign: "center", color: "#8f8472" }}>{row.gameDiff > 0 ? `+${row.gameDiff}` : row.gameDiff}</span>
                <span style={{ textAlign: "center", color: "#f0e9dd", fontWeight: 700 }}>{row.points}</span>
                <span className="lob-display" style={{ textAlign: "center", color: "#cfa877" }}>{team?.total ?? 0}</span>
              </Link>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 16 }}>
          {info.map((item) => (
            <div key={item.k} style={{ padding: 16, background: "rgba(201,138,75,.05)", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 8 }}>{item.k}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a99e8b" }}>{item.v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
