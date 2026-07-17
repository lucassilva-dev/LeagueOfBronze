"use client";

import { useRef } from "react";

import type { CardDef } from "@/lib/cards";

const ROT = 22; // amplitude da rotação (graus de ponta a ponta ~ ±11)
const PARALLAX = 16; // deslocamento (px) da arte para dar profundidade
const REST = "perspective(900px) rotateX(0deg) rotateY(0deg)";
const EASE_RETURN = "transform .6s cubic-bezier(.23,1,.32,1)";
const EASE_TRACK = "transform .1s ease-out";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function TcgCard({ card }: Readonly<{ card: CardDef }>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLSpanElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const chip = card.dupla ? "DUPLA" : "SURPRESA";
  const chipBg = card.dupla ? card.color : "rgba(10,8,4,.55)";
  const chipColor = card.dupla ? "#140d05" : "#cdbfa8";
  const foot = card.dupla ? "SÓ COM 2 CARTAS · AFETA OS 2 TIMES" : "1× POR SÉRIE · AFETA O ADVERSÁRIO";

  function handleMove(event: React.MouseEvent<HTMLDivElement>) {
    if (prefersReducedMotion()) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (event.clientX - r.left) / r.width - 0.5; // -0.5 .. 0.5
    const py = (event.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * ROT}deg) rotateX(${-py * ROT}deg)`;
    if (artRef.current) artRef.current.style.transform = `translate(${-px * PARALLAX}px, ${-py * PARALLAX}px) scale(1.06)`;
    if (glareRef.current) {
      glareRef.current.style.background = `radial-gradient(circle at ${(px + 0.5) * 100}% ${(py + 0.5) * 100}%, rgba(255,244,224,.28), transparent 46%)`;
    }
  }

  function handleEnter() {
    if (prefersReducedMotion()) return;
    if (cardRef.current) cardRef.current.style.transition = EASE_TRACK;
    if (artRef.current) artRef.current.style.transition = EASE_TRACK;
    if (glareRef.current) glareRef.current.style.opacity = "1";
  }

  function handleLeave() {
    if (cardRef.current) {
      cardRef.current.style.transition = EASE_RETURN;
      cardRef.current.style.transform = REST;
    }
    if (artRef.current) {
      artRef.current.style.transition = EASE_RETURN;
      artRef.current.style.transform = "translate(0,0) scale(1)";
    }
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }

  return (
    <div
      ref={cardRef}
      className="lob-tcg"
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        border: `2px solid ${card.border}`,
        borderRadius: 11,
        overflow: "hidden",
        background: "linear-gradient(180deg,#221a10,#0e0a05)",
        boxShadow: "0 18px 40px -20px rgba(0,0,0,.85)",
        transform: REST,
        transformStyle: "preserve-3d",
        transition: EASE_RETURN,
        willChange: "transform",
      }}
    >
      <div style={{ position: "relative", padding: "13px 15px 12px", textAlign: "center", background: "linear-gradient(180deg,rgba(0,0,0,.55),transparent)" }}>
        <div style={{ display: "inline-block", margin: "0 auto 8px", padding: "3px 10px", borderRadius: 2, fontSize: 8.5, fontWeight: 700, letterSpacing: ".14em", background: chipBg, color: chipColor, border: `1px solid ${card.border}` }}>{chip}</div>
        <h3 className="lob-display" style={{ fontSize: 20, lineHeight: 1.02, color: "#f4ede1", margin: "0 4px" }}>{card.title}</h3>
        <div style={{ width: 40, height: 2, margin: "9px auto 0", background: card.color, boxShadow: `0 0 8px ${card.border}` }} />
      </div>
      <div style={{ position: "relative", margin: "0 12px", aspectRatio: "1 / 1", borderRadius: 4, overflow: "hidden", background: `linear-gradient(160deg,${card.from}33,#0b0804 70%)`, border: "1px solid rgba(201,138,75,.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span ref={artRef} style={{ display: "inline-block", fontSize: 64, filter: "drop-shadow(0 4px 10px rgba(0,0,0,.5))", transition: EASE_RETURN, willChange: "transform" }} aria-hidden>{card.emoji}</span>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: "inset 0 -30px 40px -20px rgba(11,8,4,.9)" }} />
      </div>
      <div style={{ padding: "14px 16px 17px", display: "flex", flexDirection: "column", gap: 11, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontStyle: "italic", lineHeight: 1.5, color: "#c6b99f", textAlign: "center" }}>“{card.flavor}”</p>
        <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <span style={{ width: 6, height: 6, transform: "rotate(45deg)", background: card.color }} />
          <span style={{ fontSize: 8.5, letterSpacing: ".12em", color: "#8f8472" }}>{foot}</span>
        </div>
      </div>
      <div ref={glareRef} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0, transition: "opacity .35s ease", mixBlendMode: "overlay" }} />
    </div>
  );
}
