"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Crown, Flag, PlayCircle } from "lucide-react";

import type { SeriesFormat, TournamentDataset } from "@/lib/schema";
import { createIndexes, getChampionshipResult } from "@/lib/tournament";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";

const CONFIRM_PHRASE = "INICIAR";

type StartPayload = Readonly<{
  name: string;
  format: SeriesFormat;
  keepTeams: boolean;
  keepPlayers: boolean;
  archiveCurrent: boolean;
}>;

type AdminTournamentPanelProps = Readonly<{
  draft: TournamentDataset;
  isBusy: boolean;
  onEndTournament: () => void;
  onStartTournament: (payload: StartPayload) => void;
}>;

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

function CheckRow({
  checked,
  onChange,
  children,
}: Readonly<{
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}>) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[hsl(var(--accent))]"
      />
      <span>{children}</span>
    </label>
  );
}

function StatusCard({ draft }: Readonly<{ draft: TournamentDataset }>) {
  const isFinished = draft.tournament.status === "finished";
  const championship = getChampionshipResult(draft);
  const championName = championship
    ? createIndexes(draft).teamsById.get(championship.championTeamId)?.name ??
      championship.championTeamId
    : null;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted">Temporada atual</p>
          <h3 className="mt-1 font-heading text-xl font-semibold tracking-wide">
            {draft.tournament.name}
          </h3>
        </div>
        <Badge variant={isFinished ? "bronze" : "accent"}>
          {isFinished ? "Encerrada" : "Em andamento"}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info label="Times" value={String(draft.teams.length)} />
        <Info label="Jogadores" value={String(draft.players.length)} />
        <Info label="Séries" value={String(draft.seriesMatches.length)} />
        <Info label="Formato padrão" value={draft.tournament.format === "BO5" ? "MD5" : "MD3"} />
        <Info label="Início" value={formatDate(draft.tournament.startedAtISO)} />
        <Info label="Encerramento" value={formatDate(draft.tournament.endedAtISO)} />
        <Info label="ID da temporada" value={draft.tournament.seasonId ?? "—"} />
        <Info label="Campeão" value={championName ?? "A definir"} />
      </div>
    </Card>
  );
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-xl border border-border/60 bg-bg/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold" title={value}>
        {value}
      </p>
    </div>
  );
}

function EndSeasonCard({
  draft,
  isBusy,
  onEndTournament,
}: Readonly<{
  draft: TournamentDataset;
  isBusy: boolean;
  onEndTournament: () => void;
}>) {
  const [ack, setAck] = useState(false);
  const isFinished = draft.tournament.status === "finished";
  const hasChampion = getChampionshipResult(draft) !== null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-accent2" />
        <h3 className="font-heading text-lg font-semibold tracking-wide">Encerrar temporada</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Arquiva um snapshot completo desta temporada (fica visível em Temporadas) e a marca como
        encerrada. Nada é apagado — os dados só são limpos ao iniciar uma nova.
      </p>

      {isFinished ? (
        <p className="mt-3 rounded-xl border border-accent2/20 bg-accent2/10 px-3 py-2 text-sm text-accent2">
          Esta temporada já está encerrada. Inicie uma nova abaixo.
        </p>
      ) : (
        <>
          {!hasChampion ? (
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Nenhuma série FINAL concluída — a temporada será arquivada sem campeão.
            </p>
          ) : null}
          <div className="mt-3">
            <CheckRow checked={ack} onChange={setAck}>
              Confirmo que quero encerrar e arquivar a temporada atual.
            </CheckRow>
          </div>
          <div className="mt-4">
            <Button variant="secondary" onClick={onEndTournament} disabled={isBusy || !ack}>
              <Flag className="h-4 w-4" />
              Encerrar e arquivar
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function StartSeasonCard({
  draft,
  isBusy,
  onStartTournament,
}: Readonly<{
  draft: TournamentDataset;
  isBusy: boolean;
  onStartTournament: (payload: StartPayload) => void;
}>) {
  const isFinished = draft.tournament.status === "finished";
  const activeWithData = !isFinished && draft.seriesMatches.length > 0;

  const [name, setName] = useState(draft.tournament.name);
  const [format, setFormat] = useState<SeriesFormat>(draft.tournament.format);
  const [keepTeams, setKeepTeams] = useState(true);
  const [keepPlayers, setKeepPlayers] = useState(true);
  const [archiveCurrent, setArchiveCurrent] = useState(!isFinished);
  const [backupDone, setBackupDone] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const confirmOk = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;
  const canStart = name.trim().length > 0 && backupDone && confirmOk && !isBusy;

  const start = () => {
    onStartTournament({
      name: name.trim(),
      format,
      keepTeams,
      keepPlayers,
      archiveCurrent,
    });
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <PlayCircle className="h-4 w-4 text-accent" />
        <h3 className="font-heading text-lg font-semibold tracking-wide">Iniciar nova temporada</h3>
      </div>
      <p className="mt-1 text-sm text-muted">
        Limpa séries e classificação para recomeçar. Você escolhe manter times e jogadores. Esta
        ação é destrutiva — faça o backup antes.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="new-season-name">Nome da nova temporada</Label>
          <Input
            id="new-season-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: League of Bronze — Temporada 2"
          />
        </div>
        <div>
          <Label htmlFor="new-season-format">Formato padrão</Label>
          <div className="mt-1">
            <SegmentedControl
              label="Formato padrão"
              value={format}
              onChange={setFormat}
              options={[
                { value: "BO3", label: "MD3" },
                { value: "BO5", label: "MD5" },
              ]}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <CheckRow checked={keepTeams} onChange={setKeepTeams}>
          Manter os times cadastrados
        </CheckRow>
        <CheckRow checked={keepPlayers} onChange={setKeepPlayers}>
          Manter os jogadores cadastrados
        </CheckRow>
        {activeWithData ? (
          <CheckRow checked={archiveCurrent} onChange={setArchiveCurrent}>
            Arquivar a temporada atual antes de limpar (recomendado — preserva o histórico)
          </CheckRow>
        ) : null}
      </div>

      {activeWithData && !archiveCurrent ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          A temporada atual tem séries e não está encerrada. Marque para arquivar, senão o
          histórico será perdido.
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-border/60 bg-bg/40 p-4">
        <p className="text-sm font-semibold">Trava de segurança</p>
        <a
          href="/api/admin/export"
          className="mt-2 inline-flex h-9 items-center rounded-lg border border-border/80 bg-panel2/90 px-3 text-sm font-semibold tracking-wide text-text transition hover:bg-panel2"
        >
          Exportar backup agora
        </a>
        <div className="mt-3">
          <CheckRow checked={backupDone} onChange={setBackupDone}>
            Já exportei/fiz o backup dos dados atuais.
          </CheckRow>
        </div>
        <div className="mt-3">
          <Label htmlFor="confirm-start">
            Digite <span className="font-mono text-accent">{CONFIRM_PHRASE}</span> para confirmar
          </Label>
          <Input
            id="confirm-start"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={CONFIRM_PHRASE}
          />
        </div>
      </div>

      <div className="mt-4">
        <Button onClick={start} disabled={!canStart}>
          <PlayCircle className="h-4 w-4" />
          Iniciar nova temporada
        </Button>
      </div>
    </Card>
  );
}

function ArchiveList({ draft }: Readonly<{ draft: TournamentDataset }>) {
  if (draft.archivedSeasons.length === 0) {
    return (
      <Card className="p-5 text-sm text-muted">
        Nenhuma temporada arquivada ainda. Ao encerrar uma temporada, o snapshot aparece aqui e em{" "}
        <Link href="/temporadas" className="text-accent hover:underline">
          Temporadas
        </Link>
        .
      </Card>
    );
  }

  const seasons = [...draft.archivedSeasons].sort((a, b) =>
    (b.endedAtISO ?? b.archivedAtISO).localeCompare(a.endedAtISO ?? a.archivedAtISO),
  );

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2">
        <Crown className="h-4 w-4 text-accent2" />
        <h3 className="font-heading text-lg font-semibold tracking-wide">Temporadas arquivadas</h3>
      </div>
      <div className="mt-3 grid gap-2">
        {seasons.map((season) => (
          <Link
            key={season.seasonId}
            href={`/temporadas/${encodeURIComponent(season.seasonId)}`}
            className="flex items-center justify-between rounded-xl border border-border/60 bg-bg/40 px-3 py-2 text-sm transition hover:border-accent2/30"
          >
            <span className="font-semibold">{season.name}</span>
            <span className="text-xs text-muted">{formatDate(season.endedAtISO)}</span>
          </Link>
        ))}
      </div>
    </Card>
  );
}

export function AdminTournamentPanel({
  draft,
  isBusy,
  onEndTournament,
  onStartTournament,
}: AdminTournamentPanelProps) {
  return (
    <div className="space-y-4">
      <StatusCard draft={draft} />
      <div className="grid gap-4 xl:grid-cols-2">
        <EndSeasonCard draft={draft} isBusy={isBusy} onEndTournament={onEndTournament} />
        <StartSeasonCard draft={draft} isBusy={isBusy} onStartTournament={onStartTournament} />
      </div>
      <ArchiveList draft={draft} />
    </div>
  );
}
