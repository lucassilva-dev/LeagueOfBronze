"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import type {
  Player,
  PlayerGameStats,
  SeriesMatch,
  TournamentDataset,
} from "@/lib/schema";
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

type RiotImportedParticipant = {
  participantId: number;
  side: "BLUE" | "RED";
  puuid: string;
  riotIdGameName: string | null;
  riotIdTagline: string | null;
  summonerName: string | null;
  riotId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
};

type RiotImportedMatch = {
  matchId: string;
  durationSec: number;
  durationMin: number;
  winningSide: "BLUE" | "RED" | null;
  participants: RiotImportedParticipant[];
};

type RiotImportApiResponse = {
  match?: RiotImportedMatch;
  error?: string;
};

type RiotImportStatus = {
  kind: "success" | "error";
  text: string;
};

type ApplyRiotImportResult =
  | {
      ok: true;
      gamePatch: {
        winnerTeamId: string;
        durationMin: number;
        mvpPlayerId: string;
        statsByPlayer: PlayerGameStats[];
      };
      message: string;
    }
  | {
      ok: false;
      error: string;
    };

function getGameImportKey(seriesId: string, gameIndex: number) {
  return `${seriesId}:${gameIndex}`;
}

function normalizeLookup(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function getNameVariants(value: string | null | undefined) {
  if (!value) return [];
  const trimmed = value.trim();
  if (!trimmed) return [];

  const keys = new Set<string>();
  const normalized = normalizeLookup(trimmed);
  if (normalized) keys.add(normalized);

  const hashIndex = trimmed.indexOf("#");
  if (hashIndex > 0) {
    const beforeHash = normalizeLookup(trimmed.slice(0, hashIndex));
    if (beforeHash) keys.add(beforeHash);
  }

  return [...keys];
}

function getPlayerLookupKeys(player: Player) {
  const keys = new Set<string>();
  for (const value of [player.nick, player.slug, player.id]) {
    for (const key of getNameVariants(value)) keys.add(key);
  }
  return [...keys];
}

function getParticipantLookupKeys(participant: RiotImportedParticipant) {
  const keys = new Set<string>();
  for (const value of [participant.riotId, participant.riotIdGameName, participant.summonerName]) {
    for (const key of getNameVariants(value)) keys.add(key);
  }
  return [...keys];
}

function scoreParticipantsAgainstRoster(participants: RiotImportedParticipant[], roster: Player[]) {
  const rosterKeys = new Set(roster.flatMap((player) => getPlayerLookupKeys(player)));
  let score = 0;
  for (const participant of participants) {
    if (getParticipantLookupKeys(participant).some((key) => rosterKeys.has(key))) {
      score += 1;
    }
  }
  return score;
}

function choosePlayerForParticipant(
  participant: RiotImportedParticipant,
  roster: Player[],
  usedPlayerIds: Set<string>,
) {
  const participantKeys = getParticipantLookupKeys(participant);
  if (participantKeys.length === 0) return null;

  for (const player of roster) {
    if (usedPlayerIds.has(player.id)) continue;
    const playerKeys = getPlayerLookupKeys(player);
    if (participantKeys.some((key) => playerKeys.includes(key))) {
      return player;
    }
  }

  return null;
}

function inferMvpPlayerId(rows: PlayerGameStats[]) {
  if (rows.length === 0) return "";

  const ranked = rows
    .slice()
    .sort((a, b) => {
      const aKda = (a.kills + a.assists) / Math.max(1, a.deaths);
      const bKda = (b.kills + b.assists) / Math.max(1, b.deaths);
      if (bKda !== aKda) return bKda - aKda;
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.assists !== a.assists) return b.assists - a.assists;
      if (a.deaths !== b.deaths) return a.deaths - b.deaths;
      return a.playerId.localeCompare(b.playerId);
    });

  return ranked[0]?.playerId ?? "";
}

function applyRiotMatchToSeriesGame({
  draft,
  series,
  match,
}: {
  draft: TournamentDataset;
  series: SeriesMatch;
  match: RiotImportedMatch;
}): ApplyRiotImportResult {
  if (!series.teamAId || !series.teamBId) {
    return { ok: false, error: "Selecione Time A e Time B antes de importar da Riot." };
  }

  const teamAPlayers = draft.players.filter((player) => player.teamId === series.teamAId);
  const teamBPlayers = draft.players.filter((player) => player.teamId === series.teamBId);

  if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
    return {
      ok: false,
      error: "Os dois times precisam ter jogadores cadastrados para importar a partida da Riot.",
    };
  }

  const blueSide = match.participants.filter((participant) => participant.side === "BLUE");
  const redSide = match.participants.filter((participant) => participant.side === "RED");

  if (blueSide.length === 0 || redSide.length === 0) {
    return {
      ok: false,
      error: "A partida da Riot não retornou os dois lados corretamente (azul/vermelho).",
    };
  }

  const blueToAComposite =
    scoreParticipantsAgainstRoster(blueSide, teamAPlayers) +
    scoreParticipantsAgainstRoster(redSide, teamBPlayers);
  const redToAComposite =
    scoreParticipantsAgainstRoster(redSide, teamAPlayers) +
    scoreParticipantsAgainstRoster(blueSide, teamBPlayers);

  const teamASide = blueToAComposite >= redToAComposite ? "BLUE" : "RED";
  const teamBSide = teamASide === "BLUE" ? "RED" : "BLUE";

  const warnings: string[] = [];
  if (blueToAComposite === redToAComposite) {
    warnings.push("Mapeamento empatado; assumido Azul = Time A.");
  }

  const usedPlayerIds = new Set<string>();
  const statsByPlayer: PlayerGameStats[] = [];
  const unmatched: string[] = [];

  const mapSide = (participants: RiotImportedParticipant[], roster: Player[]) => {
    for (const participant of participants) {
      const mappedPlayer = choosePlayerForParticipant(participant, roster, usedPlayerIds);
      if (!mappedPlayer) {
        unmatched.push(participant.riotId || participant.summonerName || participant.puuid);
        continue;
      }

      usedPlayerIds.add(mappedPlayer.id);
      statsByPlayer.push({
        playerId: mappedPlayer.id,
        champion: participant.champion,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
      });
    }
  };

  mapSide(teamASide === "BLUE" ? blueSide : redSide, teamAPlayers);
  mapSide(teamBSide === "BLUE" ? blueSide : redSide, teamBPlayers);

  if (unmatched.length > 0) {
    return {
      ok: false,
      error: `Não foi possível mapear os nicks: ${unmatched.join(", ")}.`,
    };
  }

  const mvpPlayerId = inferMvpPlayerId(statsByPlayer);
  if (!mvpPlayerId) {
    return {
      ok: false,
      error: "Não foi possível sugerir MVP automaticamente a partir dos dados importados.",
    };
  }

  let winnerTeamId = "";
  if (match.winningSide) {
    winnerTeamId = match.winningSide === teamASide ? series.teamAId : series.teamBId;
  } else {
    const blueWins = blueSide.filter((participant) => participant.win).length;
    const redWins = redSide.filter((participant) => participant.win).length;
    if (blueWins === redWins) {
      return {
        ok: false,
        error: "Não foi possível identificar o vencedor da partida importada.",
      };
    }
    winnerTeamId =
      (blueWins > redWins ? "BLUE" : "RED") === teamASide ? series.teamAId : series.teamBId;
  }

  const warningText = warnings.length > 0 ? ` Aviso: ${warnings.join(" ")}` : "";

  return {
    ok: true,
    gamePatch: {
      winnerTeamId,
      durationMin: Math.max(1, match.durationMin || Math.round(match.durationSec / 60)),
      mvpPlayerId,
      statsByPlayer,
    },
    message: `Partida importada da Riot (${statsByPlayer.length} jogadores). MVP sugerido por KDA.${warningText}`,
  };
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
  const [riotMatchIdsByGame, setRiotMatchIdsByGame] = useState<Record<string, string>>({});
  const [riotImportStatusByGame, setRiotImportStatusByGame] = useState<Record<string, RiotImportStatus>>({});
  const [riotImportingGameKey, setRiotImportingGameKey] = useState<string | null>(null);

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

  const setRiotMatchIdForGame = (seriesId: string, gameIndex: number, value: string) => {
    const key = getGameImportKey(seriesId, gameIndex);
    setRiotMatchIdsByGame((prev) => ({ ...prev, [key]: value }));
  };

  const setRiotImportStatusForGame = (seriesId: string, gameIndex: number, status?: RiotImportStatus) => {
    const key = getGameImportKey(seriesId, gameIndex);
    setRiotImportStatusByGame((prev) => {
      if (!status) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: status };
    });
  };

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

  const importGameFromRiot = async (gameIndex: number) => {
    if (!selectedSeries) return;

    const gameKey = getGameImportKey(selectedSeries.id, gameIndex);
    const matchId = (riotMatchIdsByGame[gameKey] || "").trim();

    if (!matchId) {
      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "error",
        text: "Informe o ID da partida do LoL (ex.: BR1_1234567890).",
      });
      return;
    }

    setRiotImportStatusForGame(selectedSeries.id, gameIndex);
    setRiotImportingGameKey(gameKey);

    try {
      const response = await fetch("/api/admin/riot/match", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const data = (await response.json()) as RiotImportApiResponse;

      if (!response.ok || !data.match) {
        throw new Error(data.error || "Falha ao consultar a Riot.");
      }

      const mapped = applyRiotMatchToSeriesGame({
        draft,
        series: selectedSeries,
        match: data.match,
      });

      if (!mapped.ok) {
        setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
          kind: "error",
          text: mapped.error,
        });
        return;
      }

      updateSelectedSeries((series) => {
        const game = series.games[gameIndex];
        if (!game) return;

        game.winnerTeamId = mapped.gamePatch.winnerTeamId;
        game.durationMin = mapped.gamePatch.durationMin;
        game.mvpPlayerId = mapped.gamePatch.mvpPlayerId;
        game.statsByPlayer = mapped.gamePatch.statsByPlayer;
      });

      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "success",
        text: mapped.message,
      });
    } catch (error) {
      setRiotImportStatusForGame(selectedSeries.id, gameIndex, {
        kind: "error",
        text: error instanceof Error ? error.message : "Falha ao importar partida da Riot.",
      });
    } finally {
      setRiotImportingGameKey((prev) => (prev === gameKey ? null : prev));
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <Card className="min-w-0 overflow-hidden p-4">
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
                    <div className="shrink-0 text-right">
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

      <Card className="min-w-0 overflow-hidden p-4">
        {!selectedSeries ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-sm text-muted">
            Selecione uma série para editar ou clique em "Nova série".
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold tracking-wide">Editar série</h3>
              <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                <Button
                  variant="danger"
                  size="sm"
                  className="max-w-full sm:w-auto"
                  onClick={() => deleteSeries(selectedSeries.id)}
                >
                  <Trash2 className="h-4 w-4" /> Excluir série
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
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
                className="max-w-full"
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
                selectedSeries.games.map((game, gameIndex) => {
                  const riotImportKey = getGameImportKey(selectedSeries.id, gameIndex);
                  const riotImportStatus = riotImportStatusByGame[riotImportKey];
                  const riotMatchId = riotMatchIdsByGame[riotImportKey] ?? "";
                  const isImportingRiot = riotImportingGameKey === riotImportKey;

                  return (
                  <Card
                    key={`${selectedSeries.id}-game-${gameIndex}`}
                    className="min-w-0 overflow-hidden border-white/10 p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-display text-base font-bold tracking-wide">
                        Jogo {gameIndex + 1}
                      </h4>
                      <div className="flex w-full flex-wrap gap-2 sm:w-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="max-w-full"
                          onClick={() => fillRosterRowsForGame(gameIndex)}
                        >
                          Preencher elenco
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="max-w-full"
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

                    <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                      <Label htmlFor={`${selectedSeries.id}-riot-match-${gameIndex}`}>
                        ID da partida LoL (Riot)
                      </Label>
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <Input
                          id={`${selectedSeries.id}-riot-match-${gameIndex}`}
                          placeholder="Ex.: BR1_1234567890"
                          value={riotMatchId}
                          onChange={(e) =>
                            setRiotMatchIdForGame(selectedSeries.id, gameIndex, e.target.value)
                          }
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full sm:w-auto"
                          disabled={
                            isImportingRiot ||
                            !riotMatchId.trim() ||
                            !selectedSeries.teamAId ||
                            !selectedSeries.teamBId
                          }
                          onClick={() => void importGameFromRiot(gameIndex)}
                        >
                          {isImportingRiot ? "Importando..." : "Importar da Riot"}
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Preenche automaticamente vencedor, duração, campeões e K/D/A. MVP do jogo é sugerido por KDA.
                      </p>
                      {riotImportStatus ? (
                        <p
                          className={`mt-2 rounded-lg border px-2.5 py-2 text-xs ${
                            riotImportStatus.kind === "error"
                              ? "border-red-400/20 bg-red-500/10 text-red-200"
                              : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                          }`}
                        >
                          {riotImportStatus.text}
                        </p>
                      ) : null}
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
                              className="min-w-0 grid gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 md:grid-cols-[1.4fr_1.1fr_0.55fr_0.55fr_0.55fr_auto]"
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
                  );
                })
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
