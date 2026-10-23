import { CalendarClock, CalendarSync, Dices, Hourglass, Medal } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import type { Icone } from "@/components/lob/icones";
import {
  calendarioOficial,
  JOGADORES_POR_TIME_DO_CALENDARIO,
  calendarioDivulgado,
  diaDoSlot,
  diasDoCalendario4a,
  horaDoSlot,
  seriesDePontosCom,
  slotsDoCalendario,
  turnoDoSlot,
  type CalendarioDaEdicao,
  type SlotDoCalendario,
} from "@/lib/calendario-4a";
import type { Messages } from "@/lib/i18n/messages";

/**
 * O calendário oficial da 4ª Edição, desenhado a partir de lib/calendario-4a.ts.
 *
 * Um componente só para /regras, /calendario e a home: o horário que a organização mudar
 * na grade muda nos três lugares de uma vez. Servidor puro — nada de estado nem efeito,
 * e nenhuma animação de opacidade (ver armadilhas do projeto: já apagou o site 4 vezes).
 *
 * Sem as datas divulgadas (o estado desde 2026-10-22, quando a 4ª passou a 8 times), as
 * três páginas mostram `CalendarioADivulgar`: o formato e "datas a divulgar", sem grade.
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

/** "sábado, 28/11" / "Saturday, Nov 28" — o dia no meio de uma frase. */
function diaNaFrase(dia: string, localeTag: string): string {
  const data = new Date(`${dia}T12:00:00-03:00`);
  return new Intl.DateTimeFormat(
    localeTag,
    localeTag.startsWith("pt")
      ? { weekday: "long", day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" }
      : { weekday: "long", day: "numeric", month: "short", timeZone: "America/Sao_Paulo" },
  ).format(data);
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

function LinhaDoSlot({
  slot,
  anterior,
  t,
}: Readonly<{ slot: SlotDoCalendario; anterior?: SlotDoCalendario; t: Textos }>) {
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
        {/*
          Frase inteira, e não etiqueta: "pode atrasar" sozinho não dizia se o JOGO podia
          ser adiado, antecipado ou se o time é que podia chegar tarde. O que vale é: nunca
          começa antes do horário; se o jogo anterior do dia passar do tempo, este começa
          assim que ele acabar. O horário do anterior vai escrito para não deixar dúvida.
        */}
        {slot.podeAtrasar && anterior ? (
          <span style={{ display: "block", marginTop: 4, fontSize: 11, lineHeight: 1.4, color: "#b89a6e" }}>
            {t.podeAtrasar.replace("{anterior}", horaDoSlot(anterior))}
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

/**
 * As datas ainda não saíram: o formato (fichas da fase de pontos, das semifinais e da
 * final) e o aviso de "a divulgar". Nenhum dia, hora ou confronto — nada que possa ficar
 * velho quando a grade de verdade chegar.
 */
export function CalendarioADivulgar({
  t,
  calendario = calendarioOficial(),
}: Readonly<{ t: Textos; calendario?: CalendarioDaEdicao }>) {
  const times = calendario.times;
  const vagas = times * JOGADORES_POR_TIME_DO_CALENDARIO;
  const fichas: [string, string, string][] = [
    [t.aDivulgarPontosK, t.aDivulgarPontosV.replace("{pontos}", String(seriesDePontosCom(times))), "#c98a4b"],
    [t.aDivulgarSemisK, t.aDivulgarSemisV, CORES.semifinal.borda],
    [t.aDivulgarFinalK, t.aDivulgarFinalV, CORES.final.borda],
  ];
  return (
    <div
      className="lob-card-2"
      data-calendario="a-divulgar"
      style={{ padding: "clamp(18px,3.5vw,26px)", borderStyle: "dashed", borderColor: "rgba(201,138,75,.42)" }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "4px 10px",
          borderRadius: 2,
          border: "1px dashed rgba(232,184,120,.55)",
          color: "#e6c592",
          fontWeight: 700,
          fontSize: 11,
          letterSpacing: ".16em",
        }}
      >
        <CalendarClock size={13} aria-hidden />
        {t.aDivulgarSelo}
      </span>
      <h3 className="lob-display" style={{ margin: "12px 0 8px", fontSize: "clamp(19px,3vw,24px)", lineHeight: 1.15, color: "#f3ece0" }}>
        {t.aDivulgarTitulo}
      </h3>
      <p style={{ margin: "0 0 18px", maxWidth: "68ch", fontSize: 14, lineHeight: 1.6, color: "#a99e8b" }}>
        {t.aDivulgarTexto.replace("{times}", String(times)).replace("{vagas}", String(vagas))}
      </p>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
          gap: 10,
        }}
      >
        {fichas.map(([k, v, cor]) => (
          <li key={k} style={{ padding: "11px 13px", borderLeft: `3px solid ${cor}`, background: "rgba(201,138,75,.06)", borderRadius: 2 }}>
            <div style={{ fontSize: 10.5, letterSpacing: ".16em", color: "#c98a4b", fontWeight: 700 }}>{k}</div>
            <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.5, color: "#e9dfcd" }}>{v}</div>
          </li>
        ))}
      </ul>
      <p style={{ display: "flex", gap: 9, margin: "16px 0 0", fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>
        <Dices size={14} color="#c98a4b" aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
        <span>{t.aDivulgarPosicoes.replace("{times}", String(times))}</span>
      </p>
    </div>
  );
}

/** O calendário inteiro: legenda, os fins de semana e as notas — ou o "a divulgar". */
export function CalendarioDa4a({
  t,
  localeTag,
  comNotas = true,
  calendario = calendarioOficial(),
}: Readonly<{ t: Textos; localeTag: string; comNotas?: boolean; calendario?: CalendarioDaEdicao }>) {
  if (!calendarioDivulgado(calendario)) return <CalendarioADivulgar t={t} calendario={calendario} />;

  const dias = diasDoCalendario4a(calendario);
  const fins = [...new Set(dias.map((d) => d.fimDeSemana))];
  const slots = slotsDoCalendario(calendario);
  const reservas = slots.filter((s) => s.tipo === "reserva");

  /*
   * Cada nota com o desenho do que ela avisa, no lugar do losango genérico: o sorteio das
   * posições (dados), o jogo que espera o anterior acabar (ampulheta), a reserva para
   * remarcar (calendário com setas) e as semifinais (medalha — a mesma de /regras; o
   * troféu fica para a final). A do atraso e a da reserva só aparecem se a grade tiver o
   * que elas descrevem, e a da reserva diz o dia e a hora DA GRADE.
   */
  const notas: (readonly [string, Icone])[] = [
    [t.notaPosicoes.replace("{times}", String(calendario.times)), Dices],
    ...(slots.some((s) => s.podeAtrasar) ? [[t.notaAtraso, Hourglass] as const] : []),
    ...reservas.map(
      (s) =>
        [t.notaReserva.replace("{dia}", diaNaFrase(diaDoSlot(s), localeTag)).replace("{hora}", horaDoSlot(s)), CalendarSync] as const,
    ),
    [t.notaSemis, Medal],
  ];

  return (
    <div data-calendario="divulgado">
      <Legenda t={t} />
      {fins.map((fim) => {
        const titulo = t.fimDeSemana.replace("{n}", String(fim));
        return (
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
                        {d.slots.map((slot, i) => (
                          // Com o índice: dois jogos no mesmo horário não podem virar a mesma chave.
                          <LinhaDoSlot key={`${slot.quando}-${i}`} slot={slot} anterior={d.slots[i - 1]} t={t} />
                        ))}
                      </ul>
                    </article>
                  );
                })}
            </div>
          </section>
        );
      })}
      {comNotas ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {notas.map(([nota, Desenho]) => (
            <li key={nota} style={{ display: "flex", gap: 9, fontSize: 13, lineHeight: 1.55, color: "#8f8472" }}>
              {/* 13px × 1,55 ≈ 20px de linha: 3px em cima centra o ícone de 14px na 1ª linha. */}
              <Desenho size={14} color="#c98a4b" aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
              <span>{nota}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** O que acontece num dia, em poucas palavras: "5 jogos", "semis + final", "3 jogos + semis". */
function resumoDoDia(slots: readonly SlotDoCalendario[], t: Textos): string {
  const jogos = slots.filter((s) => s.tipo === "pontos").length;
  const partes = [
    ...(jogos > 0 ? [jogos === 1 ? t.resumoJogo : t.resumoJogos.replace("{n}", String(jogos))] : []),
    ...(slots.some((s) => s.tipo === "semifinal") ? [t.resumoSemis] : []),
    ...(slots.some((s) => s.tipo === "final") ? [t.resumoFinal] : []),
  ];
  return partes.join(" + ");
}

/**
 * Versão curta para a home: os dias como fichas, e o caminho para o calendário. Sem as
 * datas divulgadas, o bloco do "a divulgar" no lugar das fichas.
 */
export function ResumoDoCalendario4a({
  t,
  localeTag,
  calendario = calendarioOficial(),
}: Readonly<{ t: Textos; localeTag: string; calendario?: CalendarioDaEdicao }>) {
  if (!calendarioDivulgado(calendario)) return <CalendarioADivulgar t={t} calendario={calendario} />;

  const dias = diasDoCalendario4a(calendario);
  return (
    <div data-calendario="divulgado">
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {dias.map((d) => {
          const { semana, data } = rotuloDoDia(d.dia, t, localeTag);
          const finais = d.slots.some((s) => s.tipo === "final");
          return (
            <li
              key={d.dia}
              className="lob-card-2"
              style={{ padding: "12px 14px", borderLeft: `3px solid ${finais ? "#f0c88a" : "rgba(201,138,75,.45)"}` }}
            >
              <div style={{ fontSize: 10.5, letterSpacing: ".14em", color: "#c98a4b" }}>{semana}</div>
              <div className="lob-display" style={{ fontSize: 24, lineHeight: 1.1, color: finais ? "#f5d79a" : "#f2ebdf" }}>{data}</div>
              <div style={{ fontSize: 12, color: "#8f8472", marginTop: 2 }}>{resumoDoDia(d.slots, t)}</div>
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
