"use client";

import type { CSSProperties } from "react";

import type { CardDef } from "@/lib/cards";

import { useInclinacao } from "./inclinacao";
import s from "./tcg-card.module.css";

/**
 * A cartinha de regra de /cartas. A inclinação 3D, o parallax da arte e o brilho vêm do motor
 * compartilhado (./inclinacao.ts) — o mesmo das cartas de jogador da /stats. Ele escreve
 * variáveis CSS na carta e o tcg-card.module.css faz o resto: nada de `style` mexido a cada
 * movimento do mouse. De quebra, a carta ganhou o foil na cor dela.
 */
const ROT = 22; // amplitude da rotação (graus de ponta a ponta ~ ±11)

/** Selos da carta. Opcional: sem eles a carta fica em português (padrão do site). */
export type TextosTcgCard = {
  chipDupla: string;
  chipSurpresa: string;
  rodapeDupla: string;
  rodapeIndividual: string;
};

const TEXTOS_PT: TextosTcgCard = {
  chipDupla: "DUPLA",
  chipSurpresa: "SURPRESA",
  rodapeDupla: "SÓ COM 2 CARTAS · AFETA OS 2 TIMES",
  rodapeIndividual: "1× POR SÉRIE · AFETA O ADVERSÁRIO",
};

export function TcgCard({ card, t = TEXTOS_PT }: Readonly<{ card: CardDef; t?: TextosTcgCard }>) {
  const inclinacao = useInclinacao<HTMLDivElement>();

  const chip = card.dupla ? t.chipDupla : t.chipSurpresa;
  const chipBg = card.dupla ? card.color : "rgba(10,8,4,.55)";
  const chipColor = card.dupla ? "#140d05" : "#cdbfa8";
  const foot = card.dupla ? t.rodapeDupla : t.rodapeIndividual;

  return (
    <div
      ref={inclinacao}
      className={`lob-tcg ${s.carta}`}
      data-inclina={ROT}
      style={
        {
          position: "relative",
          display: "flex",
          flexDirection: "column",
          border: `2px solid ${card.border}`,
          borderRadius: 11,
          overflow: "hidden",
          background: "linear-gradient(180deg,#221a10,#0e0a05)",
          boxShadow: "0 18px 40px -20px rgba(0,0,0,.85)",
          "--tcg-cor": card.color,
          "--tcg-borda": card.border,
        } as CSSProperties
      }
    >
      <div style={{ position: "relative", padding: "13px 15px 12px", textAlign: "center", background: "linear-gradient(180deg,rgba(0,0,0,.55),transparent)" }}>
        <div style={{ display: "inline-block", margin: "0 auto 8px", padding: "3px 10px", borderRadius: 2, fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", background: chipBg, color: chipColor, border: `1px solid ${card.border}` }}>{chip}</div>
        <h3 className="lob-display" style={{ fontSize: 20, lineHeight: 1.02, color: "#f4ede1", margin: "0 4px" }}>{card.title}</h3>
        <div style={{ width: 40, height: 2, margin: "9px auto 0", background: card.color, boxShadow: `0 0 8px ${card.border}` }} />
      </div>
      <div style={{ position: "relative", margin: "0 12px", aspectRatio: "1 / 1", borderRadius: 4, overflow: "hidden", background: `linear-gradient(160deg,${card.from}33,#0b0804 70%)`, border: "1px solid rgba(201,138,75,.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {card.imageUrl ? (
          <span className={s.arte} style={{ position: "absolute", inset: 0, display: "block" }} aria-hidden>
            {/* a arte é maior que a moldura para o parallax nunca revelar as bordas */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.imageUrl}
              alt=""
              loading="lazy"
              style={{ position: "absolute", top: "-9%", left: "-9%", width: "118%", height: "118%", objectFit: "cover" }}
            />
          </span>
        ) : (
          <span className={s.arte} style={{ display: "inline-block", fontSize: 64, filter: "drop-shadow(0 4px 10px rgba(0,0,0,.5))" }} aria-hidden>{card.emoji}</span>
        )}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 -30px 40px -20px rgba(11,8,4,.9)" }} />
      </div>
      <div style={{ padding: "14px 16px 17px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontStyle: "italic", lineHeight: 1.5, color: "#c6b99f", textAlign: "center" }}>“{card.flavor}”</p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: card.color }} />
          <span style={{ fontSize: 8.5, letterSpacing: ".12em", color: "#8f8472" }}>{foot}</span>
        </div>
      </div>
      <div className={s.enfFoil} aria-hidden />
      <div className={s.enfBrilho} aria-hidden />
    </div>
  );
}
