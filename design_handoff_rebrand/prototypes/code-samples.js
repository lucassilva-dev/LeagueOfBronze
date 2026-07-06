// Real, drop-in components for the League of Bronze motion system.
// Stack: Next.js + React + TypeScript + Tailwind + Framer Motion + lucide-react.
// Loaded as raw text by the showcase so the JSX renders verbatim in the code panels.
window.__MS_CODE = {
  reveal: `"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
};

// Fires the entrance the first time the element scrolls into view.
export function Reveal({ children, delay = 0, y = 20 }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}`,

  counter: `"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

type CounterProps = { to: number; duration?: number; decimals?: number };

// Rolls 0 -> to when visible. pt-BR formatting, tabular-nums = no layout shift.
export function AnimatedCounter({ to, duration = 1.2, decimals = 0 }: CounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10%" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (v: number) =>
      v.toLocaleString("pt-BR", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    if (reduce) { el.textContent = fmt(to); return; }
    if (!inView) return;

    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { el.textContent = fmt(v); },
    });
    return () => controls.stop();
  }, [inView, to, duration, decimals, reduce]);

  return <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>0</span>;
}`,

  card: `"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AnimatedCardProps = {
  children: ReactNode;
  className?: string;
  champion?: boolean;
};

// The glass card that lifts into the glow on hover. Spring, not linear.
export function AnimatedCard({ children, className, champion }: AnimatedCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className={cn(
        "glass-panel glow-border rounded-2xl transition-shadow hover:shadow-glow-strong",
        champion && "champion-panel champion-glow",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}`,

  champion: `"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Crown } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type ChampionPanelProps = {
  team: string;
  runnerUp: string;
  score: [number, number];
};

const AURA =
  "conic-gradient(from 0deg, transparent, rgba(250,204,21,.16), transparent 40%, rgba(86,180,255,.14), transparent)";

export function ChampionPanel({ team, runnerUp, score }: ChampionPanelProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="champion-panel champion-glow relative overflow-hidden rounded-3xl p-8"
    >
      {/* rotating bronze aura */}
      {!reduce && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{ background: AURA, maskImage: "radial-gradient(circle,#000 30%,transparent 70%)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 18, ease: "linear", repeat: Infinity }}
        />
      )}
      {/* floating crown */}
      <motion.span
        className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100"
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={{ duration: 3.6, ease: "easeInOut", repeat: Infinity }}
      >
        <Crown className="h-7 w-7" />
      </motion.span>

      <h2 className="mt-4 font-display text-4xl font-black tracking-wide">{team}</h2>
      <p className="mt-2 text-slate-200/80">Confirmou o titulo contra {runnerUp}.</p>

      {/* counting score */}
      <p className="mt-4 font-display text-5xl font-black text-amber-100">
        <AnimatedCounter to={score[0]} /> <span className="text-white/35">-</span>{" "}
        <AnimatedCounter to={score[1]} />
      </p>
    </motion.div>
  );
}`,

  versus: `"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

type Team = { name: string; short: string };
type MatchVersusCardProps = {
  a: Team;
  b: Team;
  score: [number, number];
  games: ("a" | "b")[]; // winner of each game, in order
};

const EASE = [0.22, 1, 0.36, 1] as const;

export function MatchVersusCard({ a, b, score, games }: MatchVersusCardProps) {
  const reduce = useReducedMotion();
  const winnerA = score[0] > score[1];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={reduce ? undefined : { y: -4 }}
      viewport={{ once: true }}
      className="glass-panel glow-border grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-2xl p-6"
    >
      {/* team A slides from the left */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
        className={winnerA ? "text-right text-accent" : "text-right opacity-80"}
      >
        {a.name}
      </motion.div>

      {/* score pops in the center */}
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.5 }}
        className="font-display text-4xl font-black tabular-nums"
      >
        <AnimatedCounter to={score[0]} /> - <AnimatedCounter to={score[1]} />
      </motion.div>

      {/* team B slides from the right */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        whileInView={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
        className={!winnerA ? "text-accent" : "opacity-80"}
      >
        {b.name}
      </motion.div>

      {/* MD3/MD5 dots light up by result */}
      <div className="col-span-3 flex justify-center gap-2">
        {games.map((g, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ delay: 0.8 + i * 0.15, type: "spring", stiffness: 500, damping: 20 }}
            className={
              "h-3 w-3 rounded-full " + (g === "a" ? "bg-accent" : "bg-orange-400")
            }
          />
        ))}
      </div>
    </motion.div>
  );
}`,

  podium: `"use client";

import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

type Entry = { nick: string; value: number };
type PodiumTop3Props = { top3: [Entry, Entry, Entry] }; // [1st, 2nd, 3rd]

const ORDER = [1, 0, 2];            // render 2nd, 1st, 3rd
const HEIGHTS = [96, 150, 74];      // pedestal heights per column
const DELAYS = [0.12, 0, 0.24];

export function PodiumTop3({ top3 }: PodiumTop3Props) {
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {ORDER.map((idx, col) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 30, scaleY: 0.85 }}
          whileInView={{ opacity: 1, y: 0, scaleY: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: DELAYS[col] }}
          style={{ transformOrigin: "bottom" }}
          className="flex flex-col items-center gap-2"
        >
          {idx === 0 && <Crown className="h-5 w-5 text-accent2" />}
          <span className="text-sm font-semibold">{top3[idx].nick}</span>
          <span className="font-display text-xl font-bold text-accent">
            <AnimatedCounter to={top3[idx].value} />
          </span>
          <div
            style={{ height: HEIGHTS[col] }}
            className="w-full rounded-t-xl border border-white/10 bg-accent/15"
          />
        </motion.div>
      ))}
    </div>
  );
}`,

  barchart: `"use client";

import { motion } from "framer-motion";
import { AnimatedCounter } from "./AnimatedCounter";

type Row = { id: string; label: string; value: number };
type AnimatedBarChartProps = { rows: Row[]; accent?: string };

// layout = rows slide to their new rank when the data reorders. No FLIP by hand.
export function AnimatedBarChart({ rows, accent = "#4dabf7" }: AnimatedBarChartProps) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sorted = [...rows].sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r) => {
        const pct = Math.round((r.value / max) * 100);
        return (
          <motion.div
            key={r.id}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="flex items-center gap-3"
          >
            <span className="w-28 truncate text-sm font-semibold">{r.label}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ background: accent }}
                initial={{ width: 0 }}
                whileInView={{ width: pct + "%" }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className="w-12 text-right font-display font-bold" style={{ color: accent }}>
              <AnimatedCounter to={r.value} />
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}`,
};
