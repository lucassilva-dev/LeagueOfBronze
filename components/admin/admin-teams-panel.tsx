"use client";

import { useEffect, useState } from "react";

import type { Team, TournamentDataset } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBlankTeam, slugifyValue, type MutateDraft } from "@/components/admin/shared";

export function AdminTeamsPanel({
  draft,
  mutateDraft,
}: {
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(draft.teams[0]?.id ?? null);
  const [form, setForm] = useState<Team>(() => draft.teams[0] ?? createBlankTeam());

  useEffect(() => {
    if (!selectedId) {
      setForm(createBlankTeam());
      return;
    }
    const selected = draft.teams.find((team) => team.id === selectedId);
    if (selected) setForm(selected);
  }, [draft.teams, selectedId]);

  const saveTeam = () => {
    mutateDraft((next) => {
      const index = next.teams.findIndex((team) => team.id === selectedId);
      if (index >= 0) next.teams[index] = { ...form };
      else next.teams.push({ ...form });
    });
    setSelectedId(form.id);
  };

  const deleteTeam = (teamId: string) => {
    mutateDraft((next) => {
      next.teams = next.teams.filter((team) => team.id !== teamId);
      next.players = next.players.filter((player) => player.teamId !== teamId);
      next.seriesMatches = next.seriesMatches.filter(
        (series) => series.teamAId !== teamId && series.teamBId !== teamId,
      );
      next.standingsSeed = next.standingsSeed.filter((row) => row.teamId !== teamId);
    });
    setSelectedId(null);
    setForm(createBlankTeam());
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Card className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-wide">Times</h3>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              const blank = createBlankTeam();
              setSelectedId(null);
              setForm(blank);
            }}
          >
            Novo time
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          {draft.teams
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
            .map((team) => (
              <button
                key={team.id}
                type="button"
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  form.id === team.id
                    ? "border-accent/30 bg-accent/10"
                    : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                }`}
                onClick={() => {
                  setSelectedId(team.id);
                  setForm(team);
                }}
              >
                <p className="font-semibold">{team.name}</p>
                <p className="text-xs text-muted">
                  id: {team.id} • slug: {team.slug}
                </p>
              </button>
            ))}
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-display text-lg font-bold tracking-wide">
          {selectedId ? "Editar time" : "Criar time"}
        </h3>
        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="team-id">ID</Label>
            <Input
              id="team-id"
              value={form.id}
              onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="team-name">Nome</Label>
            <Input
              id="team-name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <Label htmlFor="team-slug" className="mb-0">
                Slug
              </Label>
              <button
                type="button"
                className="text-xs font-semibold text-accent hover:underline"
                onClick={() => setForm((prev) => ({ ...prev, slug: slugifyValue(prev.name) }))}
              >
                Gerar slug
              </button>
            </div>
            <Input
              id="team-slug"
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Button onClick={saveTeam}>Salvar no rascunho</Button>
            {selectedId ? (
              <Button variant="danger" onClick={() => deleteTeam(selectedId)}>
                Excluir time
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted">
            Excluir time remove jogadores, séries e a classificação inicial relacionada.
          </p>
        </div>
      </Card>
    </div>
  );
}
