"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Trophy } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { StandingsRow, StandingsSource } from "@/types/domain";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { TeamCrest } from "@/components/team-crest";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StandingsPageClientProps = Readonly<{
  rows: StandingsRow[];
  source: StandingsSource;
}>;
type StandingsRowProps = Readonly<{ row: StandingsRow }>;
type PositionProps = Readonly<{ position: number }>;
type GameDiffProps = Readonly<{ value: number }>;

function StandingsPosition({ position }: PositionProps) {
  return <span className={cn("font-semibold", position <= 3 && "text-accent")}>#{position}</span>;
}

function StandingsTeamLink({ row }: StandingsRowProps) {
  return (
    <Link
      href={`/times/${row.teamSlug}`}
      className="inline-flex items-center gap-2 font-semibold hover:text-accent"
    >
      <TeamCrest team={{ name: row.teamName, imageUrl: row.teamImageUrl }} size={26} />
      <span>{row.teamName}</span>
    </Link>
  );
}

function StandingsPoints({ value }: Readonly<{ value: number }>) {
  return <span className="font-display font-bold text-accent">{value}</span>;
}

function GameDiffValue({ value }: GameDiffProps) {
  let colorClassName = "";
  let label = String(value);

  if (value > 0) {
    colorClassName = "text-emerald-300";
    label = `+${value}`;
  } else if (value < 0) {
    colorClassName = "text-red-300";
  }

  return <span className={colorClassName}>{label}</span>;
}

function MobileRowDetails({ row }: StandingsRowProps) {
  return (
    <div className="text-right text-xs text-muted">
      <p>V-D séries: {row.seriesWon}-{row.seriesLost}</p>
      <p>Jogos: {row.gamesWon}-{row.gamesLost}</p>
      <p>
        Saldo: <GameDiffValue value={row.gameDiff} />
      </p>
      <p>% vitórias: {formatPercent(row.seriesWinRate)}</p>
    </div>
  );
}

function SourceBadge({ source }: Readonly<{ source: StandingsSource }>) {
  if (source === "seed") {
    return (
      <Badge variant="muted">
        Tabela inicial pela classificação inicial (será ignorada após a 1ª série)
      </Badge>
    );
  }

  return <Badge variant="success">Tabela calculada pelas séries registradas</Badge>;
}

const TABLE_COLUMNS: ColumnDef<StandingsRow>[] = [
  {
    accessorKey: "position",
    header: "Pos",
    cell: ({ row }) => <StandingsPosition position={row.original.position} />,
  },
  {
    accessorKey: "teamName",
    header: "Time",
    cell: ({ row }) => <StandingsTeamLink row={row.original} />,
  },
  {
    id: "seriesRecord",
    header: "Séries (V-D)",
    accessorFn: (row) => row.seriesWon - row.seriesLost,
    cell: ({ row }) => `${row.original.seriesWon}-${row.original.seriesLost}`,
  },
  {
    id: "gamesRecord",
    header: "Jogos (V-D)",
    accessorFn: (row) => row.gamesWon - row.gamesLost,
    cell: ({ row }) => `${row.original.gamesWon}-${row.original.gamesLost}`,
  },
  {
    accessorKey: "gameDiff",
    header: "Saldo",
    cell: ({ getValue }) => <GameDiffValue value={getValue<number>()} />,
  },
  {
    accessorKey: "seriesWinRate",
    header: "% Vit.",
    cell: ({ getValue }) => formatPercent(getValue<number>()),
  },
  {
    accessorKey: "points",
    header: "Pts",
    cell: ({ getValue }) => <StandingsPoints value={getValue<number>()} />,
  },
];

export function StandingsPageClient({ rows, source }: StandingsPageClientProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.teamName.toLowerCase().includes(q));
  }, [rows, deferredQuery]);

  return (
    <div className="space-y-4">
      <div className="w-full sm:w-72">
        <label
          htmlFor="team-search"
          className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
        >
          Buscar time
        </label>
        <Input
          id="team-search"
          placeholder="Nome do time"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={source} />
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredRows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">Nenhum time encontrado.</Card>
        ) : (
          filteredRows.map((row) => (
            <Card
              key={row.teamId}
              className={cn(
                "p-4",
                row.position <= 3 && "border-accent/20 bg-gradient-to-r from-accent/8 to-transparent",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-2xl text-accent">#{row.position}</span>
                    {row.position <= 3 ? <Trophy className="h-4 w-4 text-accent2" /> : null}
                  </div>
                  <StandingsTeamLink row={row} />
                  <p className="mt-1 text-xs text-muted">
                    Séries: {row.seriesPlayed} | Pontos: {row.points}
                  </p>
                </div>
                <MobileRowDetails row={row} />
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-2 md:block">
        <DataTable
          columns={TABLE_COLUMNS}
          data={filteredRows}
          emptyMessage="Nenhum time encontrado."
          rowClassName={(row) => {
            if (row.position === 1) {
              return "bg-accent/[0.06] shadow-[inset_0_0_0_1px_rgba(255,106,43,0.2)]";
            }
            if (row.position <= 3) {
              return "bg-accent2/[0.04] shadow-[inset_0_0_0_1px_rgba(200,138,69,0.14)]";
            }
            return "";
          }}
        />
      </Card>
    </div>
  );
}
