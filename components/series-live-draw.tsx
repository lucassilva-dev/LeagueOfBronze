"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle, Swords, Users } from "lucide-react";

import type { CardId } from "@/lib/schema";
import { ALL_CARDS, CARDS, CARDS_BY_ID } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TeamRef = { id: string; name: string };
type Drawn = { teamId: string; cardId: string; dupla?: boolean };

const DUPLA_TARGET = "__DUPLA__";

// Declarado fora do render: componente criado durante o render perde o estado a cada
// re-render (e o lint do React barra).
function SideChip({
  label,
  color,
  team,
  spinning,
}: Readonly<{ label: string; color: string; team: TeamRef | null; spinning: boolean }>) {
  return (
    <div
      className="flex flex-1 flex-col items-center gap-1 rounded-2xl border p-3"
      style={{ borderColor: `${color}55`, background: `${color}12` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color }}>
        {label}
      </span>
      <span className="text-sm font-semibold text-center">
        {spinning ? "Sorteando…" : (team?.name ?? "—")}
      </span>
    </div>
  );
}

function CardFace({
  cardId,
  spinning,
}: Readonly<{ cardId?: string | null; spinning?: boolean }>) {
  const def = cardId ? CARDS_BY_ID[cardId as CardId] : undefined;
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div
        className={`flex h-24 w-24 items-center justify-center rounded-2xl text-5xl shadow-glow transition ${
          spinning ? "scale-105 animate-pulse" : ""
        }`}
        style={{
          background: def
            ? `linear-gradient(135deg, ${def.from}, ${def.to})`
            : "rgba(255,255,255,0.04)",
        }}
      >
        <span aria-hidden>{def?.emoji ?? "🎴"}</span>
      </div>
      <p className="text-sm font-semibold">
        {def?.title ?? (spinning ? "Sorteando…" : "Sem carta")}
      </p>
      {def?.dupla ? (
        <span className="text-[10px] uppercase tracking-[0.12em] text-accent2">
          Carta dupla · afeta os 2 times
        </span>
      ) : null}
    </div>
  );
}

export function SeriesLiveDraw({
  seriesId,
  teamA,
  teamB,
  initialCards,
  initialBlueSideTeamId,
}: Readonly<{
  seriesId: string;
  teamA: TeamRef | null;
  teamB: TeamRef | null;
  initialCards: Drawn[];
  initialBlueSideTeamId?: string | null;
}>) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [blueSideTeamId, setBlueSideTeamId] = useState<string | null>(
    initialBlueSideTeamId ?? null,
  );
  const [sideSpinning, setSideSpinning] = useState(false);
  const sideTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cardByTeam, setCardByTeam] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const card of initialCards) map[card.teamId] = card.cardId;
    return map;
  });
  const [isDupla, setIsDupla] = useState(() => initialCards.some((card) => card.dupla));
  const [spinTarget, setSpinTarget] = useState<string | null>(null);
  const [spinFace, setSpinFace] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setIsAdmin(Boolean(data?.authorized)))
      .catch(() => {});
    return () => {
      if (timer.current) clearInterval(timer.current);
      if (sideTimer.current) clearInterval(sideTimer.current);
    };
  }, []);

  // Sorteio de lados do jogo 1: define quem começa no azul (o outro fica no vermelho).
  const drawSides = () => {
    if (!teamA || !teamB || sideSpinning || spinTarget) return;
    setSideSpinning(true);
    let ticks = 0;
    sideTimer.current = setInterval(() => {
      setBlueSideTeamId(Math.random() < 0.5 ? teamA.id : teamB.id);
      ticks += 1;
      if (ticks <= 14) return;
      if (sideTimer.current) clearInterval(sideTimer.current);
      const blueId = Math.random() < 0.5 ? teamA.id : teamB.id;
      setBlueSideTeamId(blueId);
      setSideSpinning(false);
      void fetch("/api/admin/series/sides", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, blueSideTeamId: blueId }),
      }).catch(() => {});
    }, 80);
  };

  // Roleta: sorteia entre `pool` e aplica o resultado via `onResult`.
  const spin = (target: string, pool: typeof CARDS, onResult: (cardId: CardId) => void) => {
    if (spinTarget) return;
    setSpinTarget(target);
    let ticks = 0;
    timer.current = setInterval(() => {
      setSpinFace(pool[Math.floor(Math.random() * pool.length)].id);
      ticks += 1;
      if (ticks <= 16) return;
      if (timer.current) clearInterval(timer.current);
      const finalCard = pool[Math.floor(Math.random() * pool.length)];
      setSpinFace(null);
      setSpinTarget(null);
      onResult(finalCard.cardId);
    }, 90);
  };

  // Um capitão usou: sorteio entre as 6 individuais, afeta só o adversário.
  const drawSingle = (team: TeamRef) => {
    spin(team.id, CARDS, (cardId) => {
      // Se havia um sorteio duplo, ele é descartado; senão a carta do outro time é preservada.
      setCardByTeam((prev) => (isDupla ? { [team.id]: cardId } : { ...prev, [team.id]: cardId }));
      setIsDupla(false);
      void fetch("/api/admin/series/cards", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, teamId: team.id, cardId }),
      }).catch(() => {});
    });
  };

  // Os DOIS capitães usaram: sorteio único entre as 8 cartas, vale para os dois times.
  const drawDupla = () => {
    if (!teamA || !teamB) return;
    spin(DUPLA_TARGET, ALL_CARDS, (cardId) => {
      setIsDupla(true);
      setCardByTeam({ [teamA.id]: cardId, [teamB.id]: cardId });
      void fetch("/api/admin/series/cards", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, cardId, dupla: true }),
      }).catch(() => {});
    });
  };

  const renderTeam = (team: TeamRef | null) => {
    if (!team) return null;
    const spinning = spinTarget === team.id || spinTarget === DUPLA_TARGET;
    const shown = spinning ? spinFace : cardByTeam[team.id];
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{team.name}</p>
        <CardFace cardId={shown} spinning={spinning} />
        {isAdmin ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => drawSingle(team)}
            disabled={Boolean(spinTarget)}
          >
            <Shuffle className="h-4 w-4" /> Sortear
          </Button>
        ) : null}
      </div>
    );
  };

  const blueTeam = teamA && teamB ? (blueSideTeamId === teamB.id ? teamB : blueSideTeamId === teamA.id ? teamA : null) : null;
  const redTeam = blueTeam ? (blueTeam.id === teamA?.id ? teamB : teamA) : null;

  return (
    <Card className="p-5">
      {teamA && teamB ? (
        <div className="mb-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.14em] text-muted">Lados · Jogo 1</p>
            {isAdmin ? (
              <span className="text-[11px] text-accent2">Sorteio ao vivo — grava na partida</span>
            ) : null}
          </div>
          <div className="mt-3 flex items-stretch gap-3">
            <SideChip label="Lado Azul" color="#4d9bff" team={blueTeam} spinning={sideSpinning} />
            <SideChip label="Lado Vermelho" color="#ff5d5d" team={redTeam} spinning={sideSpinning} />
          </div>
          {isAdmin ? (
            <div className="mt-3 flex justify-center">
              <Button
                variant="secondary"
                size="sm"
                onClick={drawSides}
                disabled={sideSpinning || Boolean(spinTarget)}
              >
                <Swords className="h-4 w-4" /> Sortear lados
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Cartinhas da série</p>
        {isAdmin ? (
          <span className="text-[11px] text-accent2">Sorteio ao vivo — grava na partida</span>
        ) : null}
      </div>
      {isDupla ? (
        <p className="mt-2 rounded-lg border border-accent2/30 bg-accent2/[0.06] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-accent2">
          Sorteio duplo · os dois capitães usaram · uma carta para os dois times
        </p>
      ) : null}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {renderTeam(teamA)}
        {renderTeam(teamB)}
      </div>
      {isAdmin && teamA && teamB ? (
        <div className="mt-3 flex flex-col items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={drawDupla}
            disabled={Boolean(spinTarget)}
          >
            <Users className="h-4 w-4" /> Sortear carta dupla (2 capitães)
          </Button>
          <p className="text-center text-[11px] text-muted">
            Quando os dois capitães usam a carta na mesma partida: sorteio único entre as 8 cartas
            (as 6 individuais + as 2 duplas), valendo para os dois times.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
