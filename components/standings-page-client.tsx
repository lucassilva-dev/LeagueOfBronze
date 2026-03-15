"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Trophy } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import type { StandingsRow, StandingsSource } from "@/types/domain";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/lib/format";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";

type StandingsMode = "simple" | "advanced";
type ScopeMode = "all" | "top3";
type StandingsPageClientProps = Readonly<{
  rows: StandingsRow[];
  source: StandingsSource;
}>;
type StandingsRowProps = Readonly<{ row: StandingsRow }>;
type PositionProps = Readonly<{ position: number }>;
type GameDiffProps = Readonly<{ value: number }>;
type MobileRowDetailsProps = Readonly<{
  mode: StandingsMode;
  row: StandingsRow;
}>;

function StandingsPosition({ position }: PositionProps) {
  return <span className={cn("font-semibold", position <= 3 && "text-accent")}>#{position}</span>;
}

function StandingsTeamLink({ row }: StandingsRowProps) {
  return (
    <Link href={`/times/${row.teamSlug}`} className="font-semibold hover:text-accent">
      {row.teamName}
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

function MobileRowDetails({ mode, row }: MobileRowDetailsProps) {
  if (mode !== "advanced") return null;

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

const SIMPLE_COLUMNS: ColumnDef<StandingsRow>[] = [
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
    accessorKey: "seriesPlayed",
    header: "Séries",
    cell: ({ getValue }) => getValue<number>(),
  },
  {
    accessorKey: "points",
    header: "Pontos",
    cell: ({ getValue }) => <StandingsPoints value={getValue<number>()} />,
  },
];

const ADVANCED_COLUMNS: ColumnDef<StandingsRow>[] = [
  SIMPLE_COLUMNS[0],
  SIMPLE_COLUMNS[1],
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
  const [mode, setMode] = useState<StandingsMode>("simple");
  const [scope, setScope] = useState<ScopeMode>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let next = rows;

    if (scope === "top3") {
      next = next.filter((row) => row.position <= 3);
    }

    if (q) {
      next = next.filter((row) => row.teamName.toLowerCase().includes(q));
    }

    return next;
  }, [rows, scope, deferredQuery]);

  const tableColumns = mode === "simple" ? SIMPLE_COLUMNS : ADVANCED_COLUMNS;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <label
              htmlFor="team-search"
              className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted"
            >
              Buscar time
            </label>
            <Input
              id="team-search"
              placeholder="Ex: Zenshin"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <SegmentedControl
            label="Mostrar"
            value={scope}
            onChange={setScope}
            options={[
              { value: "all", label: "Todos" },
              { value: "top3", label: "Top 3" },
            ]}
          />
        </div>
        <SegmentedControl
          label="Modo"
          value={mode}
          onChange={setMode}
          options={[
            { value: "simple", label: "Simples" },
            { value: "advanced", label: "Avançado" },
          ]}
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
                    <span className="font-display text-xl font-bold">#{row.position}</span>
                    {row.position <= 3 ? <Trophy className="h-4 w-4 text-accent" /> : null}
                  </div>
                  <StandingsTeamLink row={row} />
                  <p className="mt-1 text-xs text-muted">
                    Séries: {row.seriesPlayed} | Pontos: {row.points}
                  </p>
                </div>
                <MobileRowDetails mode={mode} row={row} />
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-2 md:block">
        <DataTable
          columns={tableColumns}
          data={filteredRows}
          emptyMessage="Nenhum time encontrado."
          rowClassName={(row) =>
            row.position <= 3
              ? "bg-accent/[0.03] shadow-[inset_0_0_0_1px_rgba(86,180,255,0.08)]"
              : ""
          }
        />
      </Card>
    </div>
  );
}
