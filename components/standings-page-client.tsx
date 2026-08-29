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
import { compartilhados } from "@/lib/i18n/messages/compartilhados";

/** Textos da tabela. Opcional: sem eles a tabela fica em português (padrão do site). */
type TextosTabela = (typeof compartilhados)["pt"];

type StandingsPageClientProps = Readonly<{
  rows: StandingsRow[];
  source: StandingsSource;
  // Base do link do time. Default: campeonato atual (/times/). Temporadas arquivadas
  // passam /temporadas/{seasonId}/times/ para não caírem em 404 na rota do campeonato ativo.
  teamHrefBase?: string;
  textos?: TextosTabela;
}>;
type StandingsRowProps = Readonly<{ row: StandingsRow; teamHrefBase: string }>;
type PositionProps = Readonly<{ position: number }>;
type GameDiffProps = Readonly<{ value: number }>;

function StandingsPosition({ position }: PositionProps) {
  return <span className={cn("font-semibold", position <= 3 && "text-accent")}>#{position}</span>;
}

function StandingsTeamLink({ row, teamHrefBase }: StandingsRowProps) {
  return (
    <Link
      href={`${teamHrefBase}${row.teamSlug}`}
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

function MobileRowDetails({ row, t }: Readonly<{ row: StandingsRow; t: TextosTabela }>) {
  return (
    <div className="text-right text-xs text-muted">
      <p>{t.tabelaLinhaSeriesVD} {row.seriesWon}-{row.seriesLost}</p>
      <p>{t.tabelaLinhaJogos} {row.gamesWon}-{row.gamesLost}</p>
      <p>
        {t.tabelaLinhaSaldo} <GameDiffValue value={row.gameDiff} />
      </p>
      {/* O card do celular usa o MESMO idioma da tabela do desktop — sem a tag, esta
          metade continuava com vírgula decimal no site em inglês. */}
      <p>{t.tabelaLinhaVitorias} {formatPercent(row.seriesWinRate, 1, t.localeTag)}</p>
    </div>
  );
}

function SourceBadge({ source, t }: Readonly<{ source: StandingsSource; t: TextosTabela }>) {
  if (source === "seed") {
    return <Badge variant="muted">{t.tabelaFonteSeed}</Badge>;
  }

  return <Badge variant="success">{t.tabelaFonteCalculada}</Badge>;
}

function buildColumns(teamHrefBase: string, t: TextosTabela): ColumnDef<StandingsRow>[] {
  return [
  {
    accessorKey: "position",
    header: t.tabelaColPos,
    cell: ({ row }) => <StandingsPosition position={row.original.position} />,
  },
  {
    accessorKey: "teamName",
    header: t.tabelaColTime,
    cell: ({ row }) => <StandingsTeamLink row={row.original} teamHrefBase={teamHrefBase} />,
  },
  {
    id: "seriesRecord",
    header: t.tabelaColSeries,
    accessorFn: (row) => row.seriesWon - row.seriesLost,
    cell: ({ row }) => `${row.original.seriesWon}-${row.original.seriesLost}`,
  },
  {
    id: "gamesRecord",
    header: t.tabelaColJogos,
    accessorFn: (row) => row.gamesWon - row.gamesLost,
    cell: ({ row }) => `${row.original.gamesWon}-${row.original.gamesLost}`,
  },
  {
    accessorKey: "gameDiff",
    header: t.tabelaColSaldo,
    cell: ({ getValue }) => <GameDiffValue value={getValue<number>()} />,
  },
  {
    accessorKey: "seriesWinRate",
    header: t.tabelaColVitorias,
    // `t` aqui é o bloco `compartilhados`, que carrega a tag de idioma: sem ela a
    // coluna saía com vírgula decimal mesmo com o site em inglês.
    cell: ({ getValue }) => formatPercent(getValue<number>(), 1, t.localeTag),
  },
  {
    accessorKey: "points",
    header: t.tabelaColPontos,
    cell: ({ getValue }) => <StandingsPoints value={getValue<number>()} />,
  },
  ];
}

export function StandingsPageClient({
  rows,
  source,
  teamHrefBase = "/times/",
  textos: t = compartilhados.pt,
}: StandingsPageClientProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const columns = useMemo(() => buildColumns(teamHrefBase, t), [teamHrefBase, t]);

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
          {t.tabelaBuscarTime}
        </label>
        <Input
          id="team-search"
          placeholder={t.tabelaNomeDoTime}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={source} t={t} />
      </div>

      <div className="grid gap-3 md:hidden">
        {filteredRows.length === 0 ? (
          <Card className="p-5 text-sm text-muted">{t.tabelaNenhumTime}</Card>
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
                  <StandingsTeamLink row={row} teamHrefBase={teamHrefBase} />
                  <p className="mt-1 text-xs text-muted">
                    {t.tabelaLinhaSeries} {row.seriesPlayed} | {t.tabelaLinhaPontos} {row.points}
                  </p>
                </div>
                <MobileRowDetails row={row} t={t} />
              </div>
            </Card>
          ))
        )}
      </div>

      <Card className="hidden p-2 md:block">
        <DataTable
          columns={columns}
          data={filteredRows}
          emptyMessage={t.tabelaNenhumTime}
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
