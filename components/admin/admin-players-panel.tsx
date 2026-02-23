"use client";

import { useEffect, useMemo, useState } from "react";

import type { Player, TournamentDataset } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBlankPlayer, slugifyValue, type MutateDraft } from "@/components/admin/shared";

export function AdminPlayersPanel({
  draft,
  mutateDraft,
}: {
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(draft.players[0]?.id ?? null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [form, setForm] = useState<Player>(() => draft.players[0] ?? createBlankPlayer());

  const filteredPlayers = useMemo(
    () =>
      draft.players
        .filter((player) => teamFilter === "all" || player.teamId === teamFilter)
        .slice()
        .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR")),
    [draft.players, teamFilter],
  );

  useEffect(() => {
    if (!selectedId) return;
    const selected = draft.players.find((player) => player.id === selectedId);
    if (selected) setForm(selected);
  }, [draft.players, selectedId]);

  const savePlayer = () => {
    mutateDraft((next) => {
      const idx = next.players.findIndex((player) => player.id === selectedId);
      if (idx >= 0) next.players[idx] = { ...form };
      else next.players.push({ ...form });
    });
    setSelectedId(form.id);
  };

  const deletePlayer = (playerId: string) => {
    mutateDraft((next) => {
      next.players = next.players.filter((player) => player.id !== playerId);
      next.seriesMatches = next.seriesMatches.map((series) => ({
        ...series,
        games: series.games.map((game) => ({
          ...game,
          mvpPlayerId: game.mvpPlayerId === playerId ? "" : game.mvpPlayerId,
          statsByPlayer: game.statsByPlayer.filter((row) => row.playerId !== playerId),
        })),
      }));
    });
    setSelectedId(null);
    setForm(createBlankPlayer(form.teamId || draft.teams[0]?.id));
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-wide">Jogadores</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const blank = createBlankPlayer(draft.teams[0]?.id);
              setSelectedId(null);
              setForm(blank);
            }}
          >
            Novo jogador
          </Button>
        </div>

        <div className="mt-3">
          <Label htmlFor="player-team-filter">Filtro por time</Label>
          <Select
            id="player-team-filter"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {draft.teams
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
              .map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
          </Select>
        </div>

        <div className="mt-4 grid max-h-[540px] gap-2 overflow-y-auto pr-1 scrollbar-thin">
          {filteredPlayers.map((player) => {
            const teamName = draft.teams.find((team) => team.id === player.teamId)?.name ?? player.teamId;
            return (
              <button
                key={player.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  form.id === player.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
                onClick={() => {
                  setSelectedId(player.id);
                  setForm(player);
                }}
              >
                <p className="font-semibold">{player.nick}</p>
                <p className="text-xs text-muted">
                  {teamName} • {player.role1}
                  {player.role2 ? `/${player.role2}` : ""} • {player.elo}
                </p>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-display text-lg font-bold tracking-wide">
          {selectedId ? "Editar jogador" : "Criar jogador"}
        </h3>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="player-id">ID</Label>
            <Input id="player-id" value={form.id} onChange={(e) => setForm((p) => ({ ...p, id: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="player-nick">Nick</Label>
            <Input id="player-nick" value={form.nick} onChange={(e) => setForm((p) => ({ ...p, nick: e.target.value }))} />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label htmlFor="player-slug" className="mb-0">
                Slug
              </Label>
              <button type="button" className="text-xs font-semibold text-accent hover:underline" onClick={() => setForm((p) => ({ ...p, slug: slugifyValue(p.nick) }))}>
                Gerar slug
              </button>
            </div>
            <Input id="player-slug" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="player-team">Time</Label>
            <Select id="player-team" value={form.teamId} onChange={(e) => setForm((p) => ({ ...p, teamId: e.target.value }))}>
              <option value="">Selecione</option>
              {draft.teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="player-role1">Rota 1</Label>
              <Input id="player-role1" value={form.role1} onChange={(e) => setForm((p) => ({ ...p, role1: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="player-role2">Rota 2</Label>
              <Input id="player-role2" value={form.role2 ?? ""} onChange={(e) => setForm((p) => ({ ...p, role2: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="player-elo">Elo</Label>
              <Input id="player-elo" value={form.elo} onChange={(e) => setForm((p) => ({ ...p, elo: e.target.value }))} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={savePlayer}>Salvar no rascunho</Button>
            {selectedId ? (
              <Button variant="danger" onClick={() => deletePlayer(selectedId)}>
                Excluir jogador
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            Excluir jogador remove stats e MVPs de jogos onde ele aparecia.
          </p>
        </div>
      </Card>
    </div>
  );
}
