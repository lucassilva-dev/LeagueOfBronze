import Link from "next/link";

import { Eyebrow, GoldTitle } from "@/components/lob/ui";
import { teamColor } from "@/lib/design";
import { buildDesignTeams } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { calculateStandings } from "@/lib/tournament";

export const dynamic = "force-dynamic";

const GRID = "44px 1fr 46px 46px 46px 56px 60px 84px";

const INFO = [
  { k: "PONTUAÇÃO", v: <>Vitória na série (MD3) = <b style={{ color: "#e6c592" }}>3 pontos</b> · Derrota = 0.</> },
  { k: "DESEMPATE", v: <>1º confronto direto · 2º saldo de mapas (SG) · 3º sorteio.</> },
  { k: "CLASSIFICAÇÃO", v: <>Os <b style={{ color: "#e6c592" }}>2 primeiros</b> avançam para a Grande Final em MD5.</> },
];

export default async function TabelaPage() {
  const { dataset } = await getServerDataset();
  const standings = calculateStandings(dataset).rows;
  const teamsById = new Map(buildDesignTeams(dataset).map((team) => [team.id, team]));

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>Fase de pontos corridos</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(48px,11vw,128px)", lineHeight: 0.88, margin: "10px 0 16px" }}>TABELA</GoldTitle>
        <p style={{ maxWidth: 600, fontSize: 16, lineHeight: 1.55, color: "#a99e8b", margin: 0 }}>
          Classificação zerada até o apito inicial. As posições se definem a partir da 1ª rodada, em
          25 de julho.
        </p>
      </section>

      <section className="lob-fade">
        <div className="lob-scroll" style={{ overflowX: "auto", border: "1px solid rgba(201,138,75,.20)", borderRadius: 3, background: "linear-gradient(180deg,#1a150d,#120e08)" }}>
          <div style={{ minWidth: 680 }}>
            <div style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 6, padding: "13px 18px", background: "rgba(201,138,75,.08)", fontSize: 10.5, letterSpacing: ".10em", color: "#a98a5f" }}>
              <span>#</span>
              <span>TIME</span>
              <span style={{ textAlign: "center" }}>J</span>
              <span style={{ textAlign: "center" }}>V</span>
              <span style={{ textAlign: "center" }}>D</span>
              <span style={{ textAlign: "center" }}>SG</span>
              <span style={{ textAlign: "center" }}>PTS</span>
              <span style={{ textAlign: "center" }}>ELENCO</span>
            </div>
            {standings.map((row) => {
              const team = teamsById.get(row.teamId);
              const color = team?.color ?? teamColor(row.teamId);
              return (
              <Link
                key={row.teamId}
                href={`/times/${row.teamSlug}`}
                style={{ display: "grid", gridTemplateColumns: GRID, alignItems: "center", gap: 6, padding: "14px 18px", borderTop: "1px solid rgba(201,138,75,.10)", fontSize: 13, textDecoration: "none" }}
              >
                <span className="lob-display" style={{ color: row.position <= 2 ? "#cfa877" : "#6f6656", fontSize: 16 }}>{row.position}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {team?.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={team.imageUrl} alt={row.teamName} style={{ width: 30, height: 30, objectFit: "contain", borderRadius: 4 }} />
                    ) : (
                      <span style={{ width: 11, height: 11, transform: "rotate(45deg)", background: color }} />
                    )}
                  </span>
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
          {INFO.map((info) => (
            <div key={info.k} style={{ padding: 16, background: "rgba(201,138,75,.05)", border: "1px solid rgba(201,138,75,.16)", borderRadius: 3 }}>
              <div style={{ fontSize: 11, letterSpacing: ".12em", color: "#c98a4b", marginBottom: 8 }}>{info.k}</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: "#a99e8b" }}>{info.v}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
