import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EloCrest, RoleTag, TeamMark } from "@/components/lob/ui";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHeadCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatKda } from "@/lib/format";
import { buildDesignTeams } from "@/lib/roster";
import { getServerArchivedSeason } from "@/lib/server-data";
import { calculatePlayerAggregates } from "@/lib/tournament";

export const dynamic = "force-dynamic";

type PageParams = Readonly<{
  params: Promise<{ seasonId: string; teamSlug: string }>;
}>;

export default async function TemporadaTimePage({ params }: PageParams) {
  const { seasonId, teamSlug } = await params;
  const result = await getServerArchivedSeason(seasonId);
  if (!result) notFound();

  const { archived, dataset } = result;
  const team = buildDesignTeams(dataset).find((t) => t.slug === teamSlug);
  if (!team) notFound();

  const aggByPlayer = new Map(
    calculatePlayerAggregates(dataset, { teamId: team.id }).map((a) => [a.playerId, a] as const),
  );

  return (
    <PageShell className="space-y-6">
      <div>
        <Link
          href={`/temporadas/${seasonId}`}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para {archived.name}
        </Link>
      </div>

      <Card className="overflow-hidden p-0">
        <div style={{ height: 4, background: `linear-gradient(90deg,${team.color},transparent)` }} />
        <div className="flex flex-wrap items-center gap-4 p-5">
          <TeamMark imageUrl={team.imageUrl} color={team.color} name={team.name} size={64} diamond={22} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="bronze">Time · temporada arquivada</Badge>
              <Badge variant="outline">Somente leitura</Badge>
            </div>
            <h1 className="mt-2 font-heading text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: "#f4ecdd" }}>{team.name}</h1>
            <p className="mt-1 text-sm text-muted">Elenco e desempenho de cada jogador em {archived.name}.</p>
          </div>
          <div className="flex items-center gap-3">
            {team.captain ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Capitão</p>
                <p className="mt-1 font-semibold" style={{ color: "#e6c592" }}>{team.captain.displayNick}</p>
              </div>
            ) : null}
            <div className="rounded-2xl border border-accent2/20 bg-accent2/[0.06] px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Pts de elenco</p>
              <p className="mt-1 font-display text-2xl" style={{ color: "#e6c592" }}>{team.total}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="max-w-full overflow-x-auto pb-1 scrollbar-thin">
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHeadCell className="min-w-[190px]">Jogador</TableHeadCell>
                <TableHeadCell>Rota</TableHeadCell>
                <TableHeadCell>Elo</TableHeadCell>
                <TableHeadCell className="text-right">Jogos</TableHeadCell>
                <TableHeadCell className="text-right">Vitórias</TableHeadCell>
                <TableHeadCell className="whitespace-nowrap text-right">K/D/A</TableHeadCell>
                <TableHeadCell className="text-right">KDA</TableHeadCell>
                <TableHeadCell className="text-right">MVPs</TableHeadCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {team.roster.map((player) => {
                const agg = aggByPlayer.get(player.id);
                const games = agg?.gamesPlayed ?? 0;
                return (
                  <TableRow key={player.id}>
                    <TableCell className="min-w-[190px]">
                      <span className="flex items-center gap-2">
                        {player.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={player.imageUrl}
                            alt={player.displayNick}
                            width={28}
                            height={28}
                            style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                          />
                        ) : (
                          <TeamMark imageUrl={team.imageUrl} color={team.color} name={team.name} size={24} diamond={9} />
                        )}
                        <Link href={`/temporadas/${seasonId}/jogadores/${player.slug}`} className="font-semibold hover:text-accent">
                          {player.displayNick}
                        </Link>
                      </span>
                    </TableCell>
                    <TableCell><RoleTag role={player.role1} /></TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <EloCrest elo={player.eloMeta?.key} size={20} title={false} />
                        <span className="text-sm text-muted">{player.eloMeta?.label ?? player.elo}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{games}</TableCell>
                    <TableCell className="text-right">{games > 0 ? (agg?.wins ?? 0) : "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {games > 0 ? `${agg?.kills ?? 0}/${agg?.deaths ?? 0}/${agg?.assists ?? 0}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{games > 0 ? formatKda(agg?.kda ?? 0) : "—"}</TableCell>
                    <TableCell className="text-right">{agg?.gameMvps ?? 0}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </PageShell>
  );
}
