"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";

import type { LeaderboardMetric, LeaderboardRow } from "@/types/domain";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Card } from "@/components/ui/card";

type StatsLeaderboardVisualProps = Readonly<{
  rows: LeaderboardRow[];
  metric: LeaderboardMetric;
}>;

const PODIUM_ORDER = [1, 0, 2] as const; // renderiza 2º, 1º, 3º
const PODIUM_HEIGHTS = [96, 150, 74];
const PODIUM_DELAYS = [0.12, 0, 0.24];
const EASE = [0.22, 1, 0.36, 1] as const;

function getDecimals(metric: LeaderboardMetric) {
  return metric === "kda" ? 2 : 0;
}

function Podium({ rows, metric }: StatsLeaderboardVisualProps) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;

  const decimals = getDecimals(metric);

  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {PODIUM_ORDER.map((idx, col) => {
        const entry = top3[idx];
        if (!entry) return <div key={idx} />;

        const isLeader = idx === 0;

        return (
          <motion.div
            key={`${metric}-${entry.player.playerId}`}
            initial={{ opacity: 0, y: 30, scaleY: 0.85 }}
            whileInView={{ opacity: 1, y: 0, scaleY: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE, delay: PODIUM_DELAYS[col] }}
            style={{ transformOrigin: "bottom" }}
            className="flex flex-col items-center gap-2 text-center"
          >
            {isLeader ? <Crown className="h-5 w-5 text-accent2" /> : null}
            <Link
              href={`/jogadores/${entry.player.playerSlug}`}
              className="max-w-full truncate text-sm font-semibold hover:text-accent"
            >
              {entry.player.playerNick}
            </Link>
            <span className={isLeader ? "font-display text-2xl text-accent2" : "font-display text-xl text-accent"}>
              <AnimatedCounter to={entry.value} decimals={decimals} />
            </span>
            <div
              style={{ height: PODIUM_HEIGHTS[col] }}
              className={
                "flex w-full items-start justify-center rounded-t-xl border pt-2 text-xs font-semibold " +
                (isLeader
                  ? "border-accent2/30 bg-accent2/15 text-accent2"
                  : "border-accent/20 bg-accent/10 text-accent/90")
              }
            >
              #{entry.position}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function LeaderboardBars({ rows, metric }: StatsLeaderboardVisualProps) {
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((row) => row.value), 1);
  const decimals = getDecimals(metric);

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const pct = Math.max(3, Math.round((row.value / max) * 100));
        const isLeader = row.position === 1;

        return (
          <motion.div
            key={row.player.playerId}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="flex items-center gap-3"
          >
            <span className="w-8 shrink-0 text-xs font-semibold text-muted">#{row.position}</span>
            <Link
              href={`/jogadores/${row.player.playerSlug}`}
              className="w-28 shrink-0 truncate text-sm font-semibold hover:text-accent"
            >
              {row.player.playerNick}
            </Link>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className={
                  "absolute inset-y-0 left-0 rounded-full " + (isLeader ? "bg-bronze" : "bg-ember")
                }
                initial={{ width: 0 }}
                whileInView={{ width: `${pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
              />
            </div>
            <span
              className={
                "w-14 shrink-0 text-right font-display " + (isLeader ? "text-accent2" : "text-accent")
              }
            >
              <AnimatedCounter to={row.value} decimals={decimals} />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}

export function StatsLeaderboardVisual({ rows, metric }: StatsLeaderboardVisualProps) {
  if (rows.length === 0) return null;

  return (
    <Card className="p-5">
      <Podium rows={rows} metric={metric} />
      <div className="mt-6 border-t border-border/60 pt-5">
        <LeaderboardBars rows={rows} metric={metric} />
      </div>
    </Card>
  );
}
