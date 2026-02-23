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

export function StandingsPageClient({
  rows,
  source,
}: {
  rows: StandingsRow[];
  source: StandingsSource;
}) {
  const [mode, setMode] = useState<StandingsMode>("simple");
  const [scope, setScope] = useState<ScopeMode>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredRows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    let next = rows;
    if (scope === "top3") next = next.filter((row) => row.position <= 3);
    if (q) next = next.filter((row) => row.teamName.toLowerCase().includes(q));
    return next;
  }, [rows, scope, deferredQuery]);

  const simpleColumns = useMemo<ColumnDef<StandingsRow>[]>(
    () => [
      {
        accessorKey: "position",
        header: "Pos",
        cell: ({ row }) => (
          <span className={cn("font-semibold", row.original.position <= 3 && "text-accent")}>
            #{row.original.position}
          </span>
        ),
      },
      {
        accessorKey: "teamName",
        header: "Time",
        cell: ({ row }) => (
          <Link
            href={`/times/${row.original.teamSlug}`}
            className="font-semibold hover:text-accent"
          >
            {row.original.teamName}
          </Link>
        ),
      },
      {
        accessorKey: "seriesPlayed",
        header: "Séries",
        cell: ({ getValue }) => getValue<number>(),
      },
      {
        accessorKey: "points",
        header: "Pontos",
        cell: ({ getValue }) => (
          <span className="font-display font-bold text-accent">{getValue<number>()}</span>
        ),
      },
    ],
    [],
  );

  const advancedColumns = useMemo<ColumnDef<StandingsRow>[]>(
    () => [
      simpleColumns[0]!,
      simpleColumns[1]!,
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
        cell: ({ getValue }) => {
          const value = getValue<number>();
          return <span className={value > 0 ? "text-emerald-300" : value < 0 ? "text-red-300" : ""}>{value > 0 ? `+${value}` : value}</span>;
        },
      },
      {
        accessorKey: "seriesWinRate",
        header: "% Vit.",
        cell: ({ getValue }) => formatPercent(getValue<number>()),
      },
      {
        accessorKey: "points",
        header: "Pts",
        cell: ({ getValue }) => (
          <span className="font-display font-bold text-accent">{getValue<number>()}</span>
        ),
      },
    ],
    [simpleColumns],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-72">
            <label htmlFor="team-search" className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
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
        {source === "seed" ? (
          <Badge variant="muted">
            Tabela inicial pela classificação inicial (será ignorada após a 1ª série)
          </Badge>
        ) : (
          <Badge variant="success">Tabela calculada pelas séries registradas</Badge>
        )}
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
                    {row.position <= 3 ? (
                      <Trophy className="h-4 w-4 text-accent" />
                    ) : null}
                  </div>
                  <Link href={`/times/${row.teamSlug}`} className="mt-1 block font-semibold hover:text-accent">
                    {row.teamName}
                  </Link>
                  <p className="mt-1 text-xs text-muted">
                    Séries: {row.seriesPlayed} | Pontos: {row.points}
                  </p>
                </div>
                {mode === "advanced" ? (
                  <div className="text-right text-xs text-muted">
                    <p>V-D séries: {row.seriesWon}-{row.seriesLost}</p>
                    <p>Jogos: {row.gamesWon}-{row.gamesLost}</p>
                    <p>Saldo: {row.gameDiff > 0 ? `+${row.gameDiff}` : row.gameDiff}</p>
                    <p>% vitórias: {formatPercent(row.seriesWinRate)}</p>
                  </div>
                ) : null}
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-2 md:block">
        <DataTable
          columns={mode === "simple" ? simpleColumns : advancedColumns}
          data={filteredRows}
          emptyMessage="Nenhum time encontrado."
          rowClassName={(row) =>
            row.position <= 3 ? "bg-accent/[0.03] shadow-[inset_0_0_0_1px_rgba(86,180,255,0.08)]" : ""
          }
        />
      </Card>
    </div>
  );
}
