"use client";

import { useState } from "react";
import { Shuffle } from "lucide-react";

import type { CardDef } from "@/lib/cards";
import { CARDS } from "@/lib/cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Reveal } from "@/components/ui/reveal";
import { SegmentedControl } from "@/components/ui/segmented-control";

type DrawMode = "single" | "double";

function CartaVisual({ card }: Readonly<{ card: CardDef }>) {
  return (
    <Card className="overflow-hidden p-0">
      <div
        className="flex items-center justify-center py-8"
        style={{ background: `linear-gradient(135deg, ${card.from}, ${card.to})` }}
      >
        <span className="text-6xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]" aria-hidden>
          {card.emoji}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-heading text-lg font-bold tracking-wide">{card.title}</h3>
        <p className="mt-1 text-sm text-muted">{card.description}</p>
      </div>
    </Card>
  );
}

function drawUnique(count: number): CardDef[] {
  const pool = [...CARDS];
  const out: CardDef[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

export function CartasPageClient() {
  const [mode, setMode] = useState<DrawMode>("single");
  const [drawn, setDrawn] = useState<CardDef[]>([]);
  const [drawKey, setDrawKey] = useState(0);

  const sortear = () => {
    setDrawn(drawUnique(mode === "single" ? 1 : 2));
    setDrawKey((key) => key + 1);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.16em] text-muted">Sorteio</p>
            <p className="mt-1 text-sm text-muted">
              O único revela 1 carta; o duplo revela 2 (os dois capitães podem usar a cartinha na
              mesma partida). Cada capitão pode usar no máximo 1 por série.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              label="Modo"
              value={mode}
              onChange={setMode}
              options={[
                { value: "single", label: "Sorteio Único" },
                { value: "double", label: "Sorteio Duplo" },
              ]}
            />
            <Button onClick={sortear}>
              <Shuffle className="h-4 w-4" /> Sortear
            </Button>
          </div>
        </div>

        {drawn.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {drawn.map((card, index) => (
              <Reveal key={`${drawKey}-${card.id}`} delay={index * 0.08}>
                <CartaVisual card={card} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted">
            Clique em “Sortear” para revelar a(s) cartinha(s).
          </p>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-heading text-xl font-semibold tracking-wide">Acervo de Cartas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <CartaVisual key={card.id} card={card} />
          ))}
        </div>
      </div>
    </div>
  );
}
