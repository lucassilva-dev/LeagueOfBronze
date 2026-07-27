import { StatsToggles, type ChampStatRow, type PlayerStatRow } from "@/components/lob/stats-toggles";
import { Eyebrow, EloCrest, GoldTitle, Pill } from "@/components/lob/ui";
import { ELO_ORDER, eloSvgUrl } from "@/lib/design";
import { buildDesignPlayers, buildDesignTeams } from "@/lib/roster";
import { getServerDataset } from "@/lib/server-data";
import { buildChampionLeaderboards, buildLeaderboards } from "@/lib/tournament";

export const dynamic = "force-dynamic";

function BarRow({ label, color, count, pct, eloKey }: Readonly<{ label: string; color: string; count: number; pct: number; eloKey?: string }>) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: eloKey ? "34px 1fr 24px" : "78px 1fr 24px", alignItems: "center", gap: 10 }}>
      {eloKey ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={eloSvgUrl(eloKey)}
          alt={label}
          title={label}
          width={28}
          height={28}
          style={{ width: 28, height: 28, objectFit: "contain", filter: "drop-shadow(0 3px 7px rgba(0,0,0,.8))" }}
        />
      ) : (
        <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>
      )}
      <div style={{ height: 10, background: "rgba(201,138,75,.10)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{ textAlign: "right", fontSize: 12, color: "#cdbfa8", fontWeight: 700 }}>{count}</span>
    </div>
  );
}

function StatCard({ title, children }: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="lob-card-2" style={{ padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ width: 10, height: 10, background: "#c98a4b", transform: "rotate(45deg)" }} />
        <h3 className="lob-display" style={{ fontSize: 19, color: "#f2ebdf", margin: 0 }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default async function EstatisticasPage() {
  const { dataset } = await getServerDataset();
  const players = buildDesignPlayers(dataset);
  const teams = buildDesignTeams(dataset);

  const poolTotal = players.reduce((sum, player) => sum + player.pts, 0);
  const monoCount = players.filter((player) => player.mono).length;
  const media = teams.length ? Math.round(poolTotal / teams.length) : 0;

  const statElo = ELO_ORDER.map((elo) => ({
    label: elo.label,
    color: elo.color,
    eloKey: elo.key,
    count: players.filter((player) => player.eloMeta?.label === elo.label).length,
  }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count);
  const eloMax = Math.max(1, ...statElo.map((row) => row.count));

  const statTeam = teams
    .map((team) => ({ name: team.name, color: team.color, total: team.total }))
    .sort((a, b) => b.total - a.total);
  const teamMax = Math.max(1, ...statTeam.map((row) => row.total));

  const byValue = [...players].sort((a, b) => b.pts - a.pts);
  const topPlayers = byValue.slice(0, 8);

  // Rankings reais dos jogos registrados
  const designById = new Map(players.map((p) => [p.id, p] as const));
  const pboards = buildLeaderboards(dataset);
  const toRow = (
    r: { position: number; value: number; player: { playerId: string; playerNick: string; teamName: string } },
    valueLabel: string,
  ): PlayerStatRow => {
    const d = designById.get(r.player.playerId);
    return {
      rank: r.position,
      nick: d?.displayNick ?? r.player.playerNick,
      roleLabel: d?.roleMeta.label ?? "",
      teamName: r.player.teamName,
      teamColor: d?.teamColor ?? "#c98a4b",
      teamImageUrl: d?.teamImageUrl,
      imageUrl: d?.imageUrl,
      eloKey: d?.eloMeta?.key ?? "ferro",
      eloLabel: d?.eloMeta?.label ?? "",
      valueLabel,
    };
  };
  const playerRankings: Record<string, PlayerStatRow[]> = {
    abates: pboards.kills.map((r) => toRow(r, String(r.value))),
    kda: pboards.kda.map((r) => toRow(r, r.value.toFixed(2))),
    mvps: pboards.mvps.map((r) => toRow(r, String(r.value))),
    assist: pboards.assists.map((r) => toRow(r, String(r.value))),
    mortes: pboards.deathsLeast.map((r) => toRow(r, String(r.value))),
  };

  const cboards = buildChampionLeaderboards(dataset);
  const champRankings: Record<string, ChampStatRow[]> = {
    jogados: cboards.picks.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `${r.champion.wins}V · ${r.champion.losses}D` })),
    banidos: cboards.bans.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${r.value}×`, sub: `banido ${r.value}×` })),
    taxaban: cboards.banRate.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.bans} bans` })),
    presenca: cboards.presence.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.picks}P · ${r.champion.bans}B` })),
    winrate: cboards.winRate.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: `${Math.round(r.value)}%`, sub: `${r.champion.wins}V/${r.champion.games}J` })),
    kda: cboards.kda.map((r) => ({ rank: r.position, championId: r.champion.championId, championName: r.champion.championName, valueLabel: r.value.toFixed(2), sub: `${r.champion.kills}/${r.champion.deaths}/${r.champion.assists}` })),
  };

  return (
    <div style={{ position: "relative", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px,4vw,24px) 96px" }}>
      <section className="lob-fade" style={{ padding: "clamp(40px,7vw,56px) 0 24px" }}>
        <Eyebrow>Raio-x do pool · pré-torneio</Eyebrow>
        <GoldTitle style={{ fontSize: "clamp(40px,9vw,116px)", lineHeight: 0.88, margin: "10px 0 16px" }}>ESTATÍSTICAS</GoldTitle>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 6 }}>
          <Pill dot={false}>{players.length} JOGADORES</Pill>
          <Pill dot={false}>{poolTotal} PTS NO POOL</Pill>
          <Pill dot={false}>{media} PTS · MÉDIA POR TIME</Pill>
          <Pill dot={false}>{monoCount} MONO CHAMPIONS</Pill>
        </div>
      </section>

      <section className="lob-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        <StatCard title="DISTRIBUIÇÃO POR ELO">
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {statElo.map((row) => (
              <BarRow key={row.label} label={row.label} color={row.color} eloKey={row.eloKey} count={row.count} pct={Math.round((row.count / eloMax) * 100)} />
            ))}
          </div>
        </StatCard>
        <StatCard title="FORÇA DOS TIMES">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {statTeam.map((row) => (
              <div key={row.name}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: "#e2d6c0", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
                  <span style={{ fontSize: 12, color: "#cfa877", fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{row.total} pts</span>
                </div>
                <div style={{ height: 9, background: "rgba(201,138,75,.10)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((row.total / teamMax) * 100)}%`, background: row.color, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </StatCard>
        <StatCard title="TOP JOGADORES · POR VALOR">
          {topPlayers.map((player, i) => (
            <div key={player.id} style={{ display: "grid", gridTemplateColumns: "26px 1fr auto", alignItems: "center", gap: 12, padding: "9px 0", borderTop: i === 0 ? "none" : "1px solid rgba(201,138,75,.10)" }}>
              <span className="lob-display" style={{ fontSize: 15, color: "#6f6656" }}>{i + 1}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, color: "#f0e9dd", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.displayNick}</div>
                <div style={{ fontSize: 10.5, color: "#8f8472" }}>{player.teamName}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <EloCrest elo={player.elo} size={30} title={false} />
                <span className="lob-display" style={{ fontSize: 16, color: "#e6c592", minWidth: 22, textAlign: "right" }}>{player.pts}</span>
              </div>
            </div>
          ))}
        </StatCard>
      </section>

      <StatsToggles playerRankings={playerRankings} champRankings={champRankings} />
    </div>
  );
}
