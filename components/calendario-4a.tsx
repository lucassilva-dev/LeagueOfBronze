import Link from "next/link";
import type { CSSProperties } from "react";

import {
  diasDoCalendario4a,
  horaDoSlot,
  turnoDoSlot,
  type SlotDoCalendario,
} from "@/lib/calendario-4a";
import type { Messages } from "@/lib/i18n/messages";

/**
 * O calendário oficial da 4ª Edição, desenhado a partir de lib/calendario-4a.ts.
 *
 * Um componente só para /regras, /calendario e a home: o horário que a organização mudar
 * no arquivo muda nos três lugares de uma vez. Servidor puro — nada de estado nem efeito,
 * e nenhuma animação de opacidade (ver armadilhas do projeto: já apagou o site 4 vezes).
 *
 * Cor nunca é a única pista: cada linha diz o que é ("Semifinal…", "RESERVA…") e a
 * legenda nomeia as cores.
 */

type Textos = Messages["calendario4a"];

type Categoria = "manha" | "tarde" | "noite" | "semifinal" | "final" | "reserva";

const CORES: Record<Categoria, { borda: string; fundo: string; texto: string }> = {
  manha: { borda: "#e8c66a", fundo: "rgba(232,198,106,.07)", texto: "#e9dfcd" },
  tarde: { borda: "#e0894a", fundo: "rgba(224,137,74,.08)", texto: "#e9dfcd" },
  noite: { borda: "#8b96e8", fundo: "rgba(139,150,232,.09)", texto: "#e9dfcd" },
  semifinal: { borda: "#e8618c", fundo: "rgba(232,97,140,.10)", texto: "#f6c6d5" },
  final: { borda: "#f0c88a", fundo: "linear-gradient(90deg,rgba(240,200,138,.24),rgba(185,126,64,.10))", texto: "#f5d79a" },
  reserva: { borda: "#5fbf6a", fundo: "rgba(95,191,106,.09)", texto: "#a9e3b1" },
};

function categoria(slot: SlotDoCalendario): Categoria {
  if (slot.tipo === "semifinal" || slot.tipo === "final" || slot.tipo === "reserva") return slot.tipo;
  return turnoDoSlot(slot);
}

function rotuloDoSlot(slot: SlotDoCalendario, t: Textos): string {
  if (slot.tipo === "reserva") return t.reserva;
  if (slot.tipo === "final") return t.final;
  if (slot.tipo === "semifinal") return slot.semifinal === 1 ? t.semifinal1 : t.semifinal2;
  const [a, b] = slot.confronto ?? [0, 0];
  return `${t.time.replace("{n}", String(a))} ${t.versus} ${t.time.replace("{n}", String(b))}`;
}

/** "SEXTA 20/11" / "FRIDAY 20 NOV" — o dia da semana do calendário de Brasília. */
export function rotuloDoDia(dia: string, t: Textos, localeTag: string): { semana: string; data: string } {
  // Meio-dia em Brasília cai no mesmo dia em UTC: o getUTCDay não troca de data.
  const data = new Date(`${dia}T12:00:00-03:00`);
  const semana = t.diasDaSemana.split(",")[data.getUTCDay()] ?? "";
  const [, mes, d] = dia.split("-");
  const rotuloData = localeTag.startsWith("pt")
    ? `${d}/${mes}`
    : new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" })
        .format(data)
        .toUpperCase();
  return { semana, data: rotuloData };
}

function Legenda({ t }: Readonly<{ t: Textos }>) {
  const itens: [Categoria, string][] = [
    ["manha", t.legendaManha],
    ["tarde", t.legendaTarde],
    ["noite", t.legendaNoite],
    ["semifinal", t.legendaSemifinal],
    ["final", t.legendaFinal],
    ["reserva", t.legendaReserva],
  ];
  return (
    <ul style={{ listStyle: "none", margin: "0 0 18px", padding: 0, display: "flex", flexWrap: "wrap", gap: "8px 16px" }}>
      {itens.map(([cat, nome]) => (
        <li key={cat} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#a99e8b" }}>
          <span aria-hidden style={{ width: 14, height: 14, borderRadius: 2, borderLeft: `3px solid ${CORES[cat].borda}`, background: CORES[cat].fundo }} />
          {nome}
        </li>
      ))}
    </ul>
  );
}

function LinhaDoSlot({ slot, t }: Readonly<{ slot: SlotDoCalendario; t: Textos }>) {
  const cat = categoria(slot);
  const cor = CORES[cat];
  const destaque = slot.tipo !== "pontos";
  const estilo: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "50px 1fr auto",
    alignItems: "center",
    gap: 10,
    padding: "9px 11px",
    borderLeft: `3px solid ${cor.borda}`,
    background: cor.fundo,
    borderRadius: 2,
  };
  return (
    <li style={estilo}>
      <span style={{ fontWeight: 700, fontSize: 13, color: "#f2ebdf", fontVariantNumeric: "tabular-nums" }}>
        {horaDoSlot(slot)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: destaque ? 700 : 500, color: cor.texto }}>
          {rotuloDoSlot(slot, t)}
        </span>
        {/* Embaixo do confronto, e não ao lado: ao lado espremia "Time 2 x Time 5" em
            duas linhas nos cartões estreitos. */}
        {slot.podeAtrasar ? (
          <span title={t.podeAtrasarTitulo} style={{ display: "inline-block", marginTop: 4, fontSize: 10, letterSpacing: ".06em", color: "#cfa877", border: "1px dashed rgba(201,138,75,.45)", borderRadius: 2, padding: "1px 6px", whiteSpace: "nowrap" }}>
            {t.podeAtrasar}
          </span>
        ) : null}
      </span>
      {slot.formato ? (
        <span style={{ fontSize: 10, letterSpacing: ".1em", color: slot.formato === "BO5" ? "#f5d79a" : "#8f8472" }}>
          {slot.formato === "BO5" ? t.formatoMd5 : t.formatoMd3}
        </span>
      ) : (
        <span />
      )}
    </li>
  );
}

/** O calendário inteiro: legenda, os dois fins de semana e as notas. */
export function CalendarioDa4a({
  t,
  localeTag,
  comNotas = true,
}: Readonly<{ t: Textos; localeTag: string; comNotas?: boolean }>) {
  const dias = diasDoCalendario4a();
  const fins: [1 | 2, string][] = [
    [1, t.fimDeSemana1],
    [2, t.fimDeSemana2],
  ];

  return (
    <div>
      <Legenda t={t} />
      {fins.map(([fim, titulo]) => (
        <section key={fim} aria-label={titulo} style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 11, letterSpacing: ".18em", color: "#c98a4b", fontWeight: 700 }}>{titulo}</span>
            <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg,rgba(201,138,75,.4),transparent)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,270px),1fr))", gap: 12 }}>
            {dias
              .filter((d) => d.fimDeSemana === fim)
              .map((d) => {
                const { semana, data } = rotuloDoDia(d.dia, t, localeTag);
                return (
                  <article key={d.dia} className="lob-card-2" style={{ padding: 0, overflow: "hidden" }}>
                    <header style={{ display: "flex", alignItems: "baseline", gap: 9, padding: "12px 14px", background: "rgba(201,138,75,.10)", borderBottom: "1px solid rgba(201,138,75,.16)" }}>
                      <span className="lob-display" style={{ fontSize: 20, color: "#f2ebdf" }}>{semana}</span>
                      <span style={{ fontSize: 13, letterSpacing: ".08em", color: "#c98a4b", fontVariantNumeric: "tabular-nums" }}>{data}</span>
                    </header>
                    <ul style={{ listStyle: "none", margin: 0, padding: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                      {d.slots.map((slot) => (
                        <LinhaDoSlot key={slot.quando} slot={slot} t={t} />
                      ))}
                    </ul>
                  </article>
                );
              })}
          </div>
        </section>
      ))}
      {comNotas ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {[t.notaPosicoes, t.notaAtraso, t.notaReserva, t.notaSemis].map((nota) => (
            <li key={nota} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>
              <span aria-hidden style={{ color: "#c98a4b", flexShrink: 0 }}>◆</span>
              <span>{nota}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Versão curta para a home: os seis dias como fichas, e o caminho para o calendário. */
export function ResumoDoCalendario4a({ t, localeTag }: Readonly<{ t: Textos; localeTag: string }>) {
  const dias = diasDoCalendario4a();
  return (
    <div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {dias.map((d) => {
          const { semana, data } = rotuloDoDia(d.dia, t, localeTag);
          const jogos = d.slots.filter((s) => s.tipo === "pontos").length;
          const finais = d.slots.some((s) => s.tipo === "final");
          const detalhe = finais ? t.resumoFinais : jogos === 1 ? t.resumoJogo : t.resumoJogos.replace("{n}", String(jogos));
          return (
            <li
              key={d.dia}
              className="lob-card-2"
              style={{ padding: "12px 14px", borderLeft: `3px solid ${finais ? "#f0c88a" : "rgba(201,138,75,.45)"}` }}
            >
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: "#c98a4b" }}>{semana}</div>
              <div className="lob-display" style={{ fontSize: 24, lineHeight: 1.1, color: finais ? "#f5d79a" : "#f2ebdf" }}>{data}</div>
              <div style={{ fontSize: 12, color: "#8f8472", marginTop: 2 }}>{detalhe}</div>
            </li>
          );
        })}
      </ul>
      <div style={{ marginTop: 16 }}>
        <Link href="/calendario" className="lob-btn-ghost" style={{ padding: "13px 20px", fontSize: 12.5 }}>
          {t.verCalendario}
        </Link>
      </div>
    </div>
  );
}
