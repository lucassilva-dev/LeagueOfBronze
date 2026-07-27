import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { EloCrest, RoleTag, TeamMark } from "@/components/lob/ui";
import { PageHero } from "@/components/page-hero";
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

      <PageHero
        badge="Time · temporada arquivada"
        title={team.name}
        description={`Elenco e desempenho de cada jogador em ${archived.name}.`}
        extra={<Badge variant="bronze">Somente leitura</Badge>}
      />

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
                        <span className="font-semibold">{player.displayNick}</span>
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
