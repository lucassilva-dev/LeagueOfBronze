"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle } from "lucide-react";

import type { CardId } from "@/lib/schema";
import { CARDS, CARDS_BY_ID } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type TeamRef = { id: string; name: string };
type Drawn = { teamId: string; cardId: string };

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
    </div>
  );
}

export function SeriesLiveDraw({
  seriesId,
  teamA,
  teamB,
  initialCards,
}: Readonly<{
  seriesId: string;
  teamA: TeamRef | null;
  teamB: TeamRef | null;
  initialCards: Drawn[];
}>) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [cardByTeam, setCardByTeam] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    for (const card of initialCards) map[card.teamId] = card.cardId;
    return map;
  });
  const [spinTeam, setSpinTeam] = useState<string | null>(null);
  const [spinFace, setSpinFace] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setIsAdmin(Boolean(data?.authorized)))
      .catch(() => {});
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  const draw = (team: TeamRef) => {
    if (spinTeam) return;
    setSpinTeam(team.id);
    let ticks = 0;
    timer.current = setInterval(() => {
      setSpinFace(CARDS[Math.floor(Math.random() * CARDS.length)].id);
      ticks += 1;
      if (ticks <= 16) return;
      if (timer.current) clearInterval(timer.current);
      const finalCard = CARDS[Math.floor(Math.random() * CARDS.length)];
      setSpinFace(null);
      setSpinTeam(null);
      setCardByTeam((prev) => ({ ...prev, [team.id]: finalCard.id }));
      void fetch("/api/admin/series/cards", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seriesId, teamId: team.id, cardId: finalCard.id }),
      }).catch(() => {});
    }, 90);
  };

  const renderTeam = (team: TeamRef | null) => {
    if (!team) return null;
    const spinning = spinTeam === team.id;
    const shown = spinning ? spinFace : cardByTeam[team.id];
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">{team.name}</p>
        <CardFace cardId={shown} spinning={spinning} />
        {isAdmin ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => draw(team)}
            disabled={Boolean(spinTeam)}
          >
            <Shuffle className="h-4 w-4" /> Sortear
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.14em] text-muted">Cartinhas da série</p>
        {isAdmin ? (
          <span className="text-[11px] text-accent2">Sorteio ao vivo — grava na partida</span>
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {renderTeam(teamA)}
        {renderTeam(teamB)}
      </div>
    </Card>
  );
}
