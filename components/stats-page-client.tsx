"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import type { TournamentDataset } from "@/lib/schema";
import { buildLeaderboards } from "@/lib/tournament";
import { formatDateLabel, formatKda } from "@/lib/format";
import type { LeaderboardMetric, LeaderboardRow } from "@/types/domain";
import { DataTable } from "@/components/data-table";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Input } from "@/components/ui/input";

const metricLabels: Record<LeaderboardMetric, string> = {
  kills: "Mais Abates",
  kda: "Melhor KDA",
  mvps: "Mais MVPs (jogo)",
  assists: "Mais Assistências",
  deathsLeast: "Menos Mortes",
};

export function StatsPageClient({
  dataset,
}: {
  dataset: TournamentDataset;
}) {
  const [teamId, setTeamId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [metric, setMetric] = useState<LeaderboardMetric>("kills");

  const boards = useMemo(
    () =>
      buildLeaderboards(dataset, {
        teamId: teamId === "all" ? undefined : teamId,
        from: from || undefined,
        to: to || undefined,
      }),
    [dataset, teamId, from, to],
  );

  const rows = boards[metric];

  const columns = useMemo<ColumnDef<LeaderboardRow>[]>(
    () => [
      {
        accessorKey: "position",
        header: "Pos",
        cell: ({ row }) => <span className="font-semibold text-accent">#{row.original.position}</span>,
      },
      {
        accessorKey: "player.playerNick",
        header: "Jogador",
        cell: ({ row }) => (
          <div>
            <Link
              href={`/jogadores/${row.original.player.playerSlug}`}
              className="font-semibold hover:text-accent"
            >
              {row.original.player.playerNick}
            </Link>
            <p className="text-xs text-muted">
              <Link href={`/times/${row.original.player.teamSlug}`} className="hover:text-text">
                {row.original.player.teamName}
              </Link>
            </p>
          </div>
        ),
      },
      {
        id: "gamesPlayed",
        header: "Jogos",
        accessorFn: (row) => row.player.gamesPlayed,
        cell: ({ row }) => row.original.player.gamesPlayed,
      },
      {
        id: "value",
        header: metricLabels[metric],
        accessorFn: (row) => row.value,
        cell: ({ row }) =>
          metric === "kda" ? (
            <span className="font-display font-bold text-accent">{formatKda(row.original.value)}</span>
          ) : (
            <span className="font-display font-bold text-accent">{row.original.value}</span>
          ),
      },
      {
        id: "kda",
        header: "KDA",
        accessorFn: (row) => row.player.kda,
        cell: ({ row }) => formatKda(row.original.player.kda),
      },
      {
        id: "kda-raw",
        header: "K/D/A",
        accessorFn: (row) => row.player.kills + row.player.assists - row.player.deaths,
        cell: ({ row }) =>
          `${row.original.player.kills}/${row.original.player.deaths}/${row.original.player.assists}`,
      },
    ],
    [metric],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Label htmlFor="stats-team">Time</Label>
          <Select id="stats-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="all">Todos os times</option>
            {dataset.teams
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="stats-from">Data inicial</Label>
          <Input id="stats-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="stats-to">Data final</Label>
          <Input id="stats-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Card className="flex items-center justify-center p-4 text-center">
          <p className="text-xs text-muted">
            Filtro de datas usa a data da série. Rankings recalculam em tempo real.
          </p>
        </Card>
      </div>

      <SegmentedControl
        label="Ranking"
        value={metric}
        onChange={setMetric}
        options={[
          { value: "kills", label: "Abates" },
          { value: "kda", label: "KDA" },
          { value: "mvps", label: "MVPs" },
          { value: "assists", label: "Assistências" },
          { value: "deathsLeast", label: "Mortes" },
        ]}
      />

      <div className="grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">Sem jogos no filtro selecionado.</Card>
        ) : (
          rows.map((row) => (
            <Card key={`${metric}-${row.player.playerId}`} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-accent">#{row.position}</p>
                  <Link href={`/jogadores/${row.player.playerSlug}`} className="font-semibold hover:text-accent">
                    {row.player.playerNick}
                  </Link>
                  <p className="text-xs text-muted">{row.player.teamName}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-xl font-bold">
                    {metric === "kda" ? formatKda(row.value) : row.value}
                  </p>
                  <p className="text-xs text-muted">
                    {row.player.kills}/{row.player.deaths}/{row.player.assists}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-2 md:block">
        <DataTable columns={columns} data={rows} emptyMessage="Sem jogos no filtro selecionado." />
      </Card>

      {dataset.seriesMatches.length > 0 ? (
        <p className="text-xs text-muted">
          Período com dados disponíveis:{" "}
          {formatDateLabel(
            dataset.seriesMatches
              .slice()
              .sort((a, b) => a.date.localeCompare(b.date))[0]?.date,
          )}{" "}
          até{" "}
          {formatDateLabel(
            dataset.seriesMatches
              .slice()
              .sort((a, b) => b.date.localeCompare(a.date))[0]?.date,
          )}
        </p>
      ) : null}
    </div>
  );
}
