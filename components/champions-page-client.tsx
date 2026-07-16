"use client";

import { useState } from "react";

import type { ChampionLeaderboardRow, ChampionMetric } from "@/types/domain";
import { formatKda, formatPercent } from "@/lib/format";
import { ChampionIcon } from "@/components/champion-icon";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { SegmentedControl } from "@/components/ui/segmented-control";

const METRICS: { value: ChampionMetric; label: string }[] = [
  { value: "picks", label: "Mais jogados" },
  { value: "bans", label: "Mais banidos" },
  { value: "banRate", label: "Taxa de ban" },
  { value: "presence", label: "Presença" },
  { value: "winRate", label: "Winrate" },
  { value: "kda", label: "KDA" },
];

function formatValue(metric: ChampionMetric, value: number) {
  if (metric === "picks" || metric === "bans") return String(value);
  if (metric === "kda") return formatKda(value);
  return formatPercent(value);
}

export function ChampionsPageClient({
  boards,
}: Readonly<{ boards: Record<ChampionMetric, ChampionLeaderboardRow[]> }>) {
  const [metric, setMetric] = useState<ChampionMetric>("picks");
  const rows = boards[metric];
  const max = rows[0]?.value ?? 0;

  return (
    <div className="space-y-4">
      <SegmentedControl label="Métrica" value={metric} onChange={setMetric} options={METRICS} />

      {rows.length === 0 ? (
        <EmptyState
          title="Sem dados de campeões ainda"
          description="Os rankings aparecem conforme os campeões escolhidos e banidos forem lançados nos jogos, no /admin."
        />
      ) : (
        <div className="grid gap-2">
          {rows.map((row) => (
            <Card key={row.champion.championId} className="flex items-center gap-3 p-3">
              <span className="w-8 shrink-0 text-center font-display text-xl text-accent">
                #{row.position}
              </span>
              <ChampionIcon champion={row.champion.championName} size={42} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.champion.championName}</p>
                <p className="text-xs text-muted">
                  {row.champion.picks} jogos • {row.champion.bans} bans •{" "}
                  {formatPercent(row.champion.winRate)} WR
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-ember"
                    style={{ width: `${max > 0 ? (row.value / max) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <span className="shrink-0 font-display text-lg tracking-wide text-accent2">
                {formatValue(metric, row.value)}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
