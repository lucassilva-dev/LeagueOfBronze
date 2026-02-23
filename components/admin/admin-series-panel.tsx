"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type { TournamentDataset } from "@/lib/schema";
import { getSeriesScore, getSeriesWinnerTeamId } from "@/lib/tournament";
import { formatDateLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBlankGame, createBlankSeries, createBlankStatsRow, type MutateDraft } from "@/components/admin/shared";

function getTeamName(dataset: TournamentDataset, teamId: string) {
  return dataset.teams.find((team) => team.id === teamId)?.name ?? teamId ?? "—";
}

export function AdminSeriesPanel({
  draft,
  mutateDraft,
}: {
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
}) {
  const sortedSeries = useMemo(
    () =>
      draft.seriesMatches
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.id.localeCompare(a.id)),
    [draft.seriesMatches],
  );

  const [selectedId, setSelectedId] = useState<string | null>(sortedSeries[0]?.id ?? null);

  useEffect(() => {
    if (selectedId && draft.seriesMatches.some((series) => series.id === selectedId)) return;
    setSelectedId(sortedSeries[0]?.id ?? null);
  }, [draft.seriesMatches, selectedId, sortedSeries]);

  const selectedSeries = draft.seriesMatches.find((series) => series.id === selectedId) ?? null;

  const currentRosters = useMemo(() => {
    if (!selectedSeries) return { teamAPlayers: [], teamBPlayers: [], combined: [] as typeof draft.players };
    const teamAPlayers = draft.players.filter((player) => player.teamId === selectedSeries.teamAId);
    const teamBPlayers = draft.players.filter((player) => player.teamId === selectedSeries.teamBId);
    return { teamAPlayers, teamBPlayers, combined: [...teamAPlayers, ...teamBPlayers] };
  }, [draft.players, selectedSeries]);

  const createSeries = () => {
    const series = createBlankSeries();
    mutateDraft((next) => {
      next.seriesMatches.push(series);
    });
    setSelectedId(series.id);
  };

  const deleteSeries = (seriesId: string) => {
    mutateDraft((next) => {
      next.seriesMatches = next.seriesMatches.filter((series) => series.id !== seriesId);
    });
    if (selectedId === seriesId) setSelectedId(null);
  };

  const updateSelectedSeries = (recipe: (series: NonNullable<typeof selectedSeries>) => void) => {
    if (!selectedSeries) return;
    mutateDraft((next) => {
      const series = next.seriesMatches.find((row) => row.id === selectedSeries.id);
      if (!series) return;
      recipe(series);
    });
  };

  const fillRosterRowsForGame = (gameIndex: number) => {
    if (!selectedSeries) return;
    updateSelectedSeries((series) => {
      const game = series.games[gameIndex];
      if (!game) return;
      const playerIds = new Set(game.statsByPlayer.map((row) => row.playerId));
      const desired = draft.players.filter(
        (player) => player.teamId === series.teamAId || player.teamId === series.teamBId,
      );
      for (const player of desired) {
        if (!playerIds.has(player.id)) {
          game.statsByPlayer.push(createBlankStatsRow(player.id));
        }
      }
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold tracking-wide">Séries (MD3)</h3>
          <Button variant="secondary" size="sm" onClick={createSeries}>
            <Plus className="h-4 w-4" /> Nova série
          </Button>
        </div>

        <div className="mt-4 grid max-h-[680px] gap-2 overflow-y-auto pr-1 scrollbar-thin">
          {sortedSeries.length === 0 ? (
            <p className="rounded-xl border border-white/8 bg-white/[0.02] p-3 text-sm text-muted">
              Nenhuma série cadastrada.
            </p>
          ) : (
            sortedSeries.map((series) => {
              const score = getSeriesScore(series);
              const winner = getSeriesWinnerTeamId(series);
              const teamA = getTeamName(draft, series.teamAId);
              const teamB = getTeamName(draft, series.teamBId);
              return (
                <button
                  key={series.id}
                  type="button"
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    selectedSeries?.id === series.id
                      ? "border-accent/30 bg-accent/10"
                      : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                  onClick={() => setSelectedId(series.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{teamA} vs {teamB}</p>
                      <p className="text-xs text-muted">
                        {series.id} • {formatDateLabel(series.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-base font-bold text-accent">
                        {score.teamAWins}-{score.teamBWins}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">
                        {winner ? "Finalizada" : "Em andamento"}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-4">
        {!selectedSeries ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-muted">
            Selecione uma série para editar ou clique em "Nova série".
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold tracking-wide">Editar série</h3>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={() => deleteSeries(selectedSeries.id)}>
                  <Trash2 className="h-4 w-4" /> Excluir série
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="series-id">ID da série</Label>
                <Input
                  id="series-id"
                  value={selectedSeries.id}
                  onChange={(e) =>
                    updateSelectedSeries((series) => {
                      series.id = e.target.value;
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="series-date">Data</Label>
                <Input
                  id="series-date"
                  type="date"
                  value={selectedSeries.date?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    updateSelectedSeries((series) => {
                      series.date = e.target.value;
                    })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="series-team-a">Time A</Label>
                <Select
                  id="series-team-a"
                  value={selectedSeries.teamAId}
                  onChange={(e) =>
                    updateSelectedSeries((series) => {
                      series.teamAId = e.target.value;
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {draft.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="series-team-b">Time B</Label>
                <Select
                  id="series-team-b"
                  value={selectedSeries.teamBId}
                  onChange={(e) =>
                    updateSelectedSeries((series) => {
                      series.teamBId = e.target.value;
                    })
                  }
                >
                  <option value="">Selecione</option>
                  {draft.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-display text-base font-bold tracking-wide">Jogos da série</p>
                <p className="text-xs text-muted">
                  Até 3 jogos. A tabela pública só conta a série quando houver vencedor (2 vitórias).
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateSelectedSeries((series) => {
                    if (series.games.length >= 3) return;
                    series.games.push(createBlankGame());
                  })
                }
              >
                <Plus className="h-4 w-4" /> Adicionar jogo
              </Button>
            </div>

            <div className="space-y-4">
              {selectedSeries.games.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-muted">
                  Nenhum jogo nesta série.
                </div>
              ) : (
                selectedSeries.games.map((game, gameIndex) => (
                  <Card key={`${selectedSeries.id}-game-${gameIndex}`} className="border-white/10 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display text-base font-bold tracking-wide">
                        Jogo {gameIndex + 1}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fillRosterRowsForGame(gameIndex)}
                        >
                          Preencher elenco
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            updateSelectedSeries((series) => {
                              series.games.splice(gameIndex, 1);
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" /> Remover jogo
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label>Time vencedor</Label>
                        <Select
                          value={game.winnerTeamId}
                          onChange={(e) =>
                            updateSelectedSeries((series) => {
                              const current = series.games[gameIndex];
                              if (!current) return;
                              current.winnerTeamId = e.target.value;
                            })
                          }
                        >
                          <option value="">Selecione</option>
                          {selectedSeries.teamAId ? (
                            <option value={selectedSeries.teamAId}>
                              {getTeamName(draft, selectedSeries.teamAId)}
                            </option>
                          ) : null}
                          {selectedSeries.teamBId ? (
                            <option value={selectedSeries.teamBId}>
                              {getTeamName(draft, selectedSeries.teamBId)}
                            </option>
                          ) : null}
                        </Select>
                      </div>
                      <div>
                        <Label>MVP do jogo</Label>
                        <Select
                          value={game.mvpPlayerId}
                          onChange={(e) =>
                            updateSelectedSeries((series) => {
                              const current = series.games[gameIndex];
                              if (!current) return;
                              current.mvpPlayerId = e.target.value;
                            })
                          }
                        >
                          <option value="">Selecione</option>
                          {currentRosters.combined.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.nick}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <Label>Duração (min)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={game.durationMin ?? ""}
                          onChange={(e) =>
                            updateSelectedSeries((series) => {
                              const current = series.games[gameIndex];
                              if (!current) return;
                              current.durationMin = e.target.value
                                ? Number(e.target.value)
                                : undefined;
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                          Estatísticas por jogador (K/D/A)
                        </p>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            updateSelectedSeries((series) => {
                              const current = series.games[gameIndex];
                              if (!current) return;
                              current.statsByPlayer.push(createBlankStatsRow());
                            })
                          }
                        >
                          <Plus className="h-4 w-4" /> Linha
                        </Button>
                      </div>

                      <div className="grid gap-2">
                        {game.statsByPlayer.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-white/10 p-3 text-sm text-muted">
                            Nenhuma linha de stats.
                          </div>
                        ) : (
                          game.statsByPlayer.map((row, rowIndex) => (
                            <div
                              key={`${selectedSeries.id}-g${gameIndex}-r${rowIndex}`}
                              className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 md:grid-cols-[1.4fr_1.1fr_0.55fr_0.55fr_0.55fr_auto]"
                            >
                              <div>
                                <Label className="sr-only">Jogador</Label>
                                <Select
                                  aria-label={`Jogador linha ${rowIndex + 1}`}
                                  value={row.playerId}
                                  onChange={(e) =>
                                    updateSelectedSeries((series) => {
                                      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
                                      if (!current) return;
                                      current.playerId = e.target.value;
                                    })
                                  }
                                >
                                  <option value="">Jogador</option>
                                  {currentRosters.combined.map((player) => (
                                    <option key={player.id} value={player.id}>
                                      {player.nick} ({getTeamName(draft, player.teamId)})
                                    </option>
                                  ))}
                                </Select>
                              </div>
                              <div>
                                <Label className="sr-only">Campeão</Label>
                                <Input
                                  aria-label={`Campeão linha ${rowIndex + 1}`}
                                  placeholder="Campeão"
                                  value={row.champion ?? ""}
                                  onChange={(e) =>
                                    updateSelectedSeries((series) => {
                                      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
                                      if (!current) return;
                                      current.champion = e.target.value;
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="sr-only">Abates</Label>
                                <Input
                                  aria-label={`Abates linha ${rowIndex + 1}`}
                                  type="number"
                                  min={0}
                                  value={row.kills}
                                  onChange={(e) =>
                                    updateSelectedSeries((series) => {
                                      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
                                      if (!current) return;
                                      current.kills = Number(e.target.value || 0);
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="sr-only">Mortes</Label>
                                <Input
                                  aria-label={`Mortes linha ${rowIndex + 1}`}
                                  type="number"
                                  min={0}
                                  value={row.deaths}
                                  onChange={(e) =>
                                    updateSelectedSeries((series) => {
                                      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
                                      if (!current) return;
                                      current.deaths = Number(e.target.value || 0);
                                    })
                                  }
                                />
                              </div>
                              <div>
                                <Label className="sr-only">Assistências</Label>
                                <Input
                                  aria-label={`Assistências linha ${rowIndex + 1}`}
                                  type="number"
                                  min={0}
                                  value={row.assists}
                                  onChange={(e) =>
                                    updateSelectedSeries((series) => {
                                      const current = series.games[gameIndex]?.statsByPlayer[rowIndex];
                                      if (!current) return;
                                      current.assists = Number(e.target.value || 0);
                                    })
                                  }
                                />
                              </div>
                              <div className="flex items-center justify-end">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    updateSelectedSeries((series) => {
                                      series.games[gameIndex]?.statsByPlayer.splice(rowIndex, 1);
                                    })
                                  }
                                  aria-label={`Remover linha ${rowIndex + 1}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
