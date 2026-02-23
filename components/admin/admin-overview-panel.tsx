"use client";

import { Crown, Skull, Users } from "lucide-react";

import type { TournamentDataset } from "@/lib/schema";
import { calculateStandings, buildLeaderboards } from "@/lib/tournament";
import { Card } from "@/components/ui/card";
import { formatKda } from "@/lib/format";

export function AdminOverviewPanel({ draft }: { draft: TournamentDataset }) {
  const standings = calculateStandings(draft);
  const topKills = buildLeaderboards(draft).kills[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Times</p>
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <p className="font-display text-2xl font-bold">{draft.teams.length}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Jogadores</p>
          <div className="mt-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <p className="font-display text-2xl font-bold">{draft.players.length}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Séries</p>
          <div className="mt-3 flex items-center gap-2">
            <Crown className="h-4 w-4 text-accent" />
            <p className="font-display text-2xl font-bold">{draft.seriesMatches.length}</p>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Mais abates (prévia)</p>
          <div className="mt-3 flex items-center gap-2">
            <Skull className="h-4 w-4 text-accent" />
            <div>
              <p className="font-display text-base font-bold">
                {topKills?.player.playerNick ?? "—"}
              </p>
              <p className="text-xs text-muted">
                {topKills ? `${topKills.player.kills} abates • KDA ${formatKda(topKills.player.kda)}` : "Sem jogos"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-lg font-bold tracking-wide">
          Prévia da classificação (cálculo automático)
        </h3>
        <p className="mt-1 text-sm text-muted">
          Recalculada localmente ao editar. O arquivo salvo atualiza a tabela pública automaticamente.
        </p>
        <div className="mt-4 grid gap-2">
          {standings.rows.slice(0, 7).map((row) => (
            <div
              key={row.teamId}
              className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <span className="font-display text-accent">#{row.position}</span>
                <span className="font-semibold">{row.teamName}</span>
              </div>
              <div className="text-muted">
                {row.points} pts • {row.seriesWon}-{row.seriesLost}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
