import type { CSSProperties } from "react";

import type { IdentidadeDoTime } from "@/lib/series/identidade-do-time";

import s from "./cerimonia.module.css";

/**
 * O time no show: a identidade (cores, metal, escudo), a classe da fonte do tema dele e a cor de
 * PALCO escolhida para este confronto (`coresDoConfronto`: contrasta com a do adversário).
 */
export type TimeDoShow = IdentidadeDoTime & Readonly<{ fonteClasse: string | null; corDePalco: string }>;

/** As variáveis de cor do time para o CSS do show (nome em metal, aura do escudo). */
export function varsDoTime(time: TimeDoShow): CSSProperties {
  return {
    "--metal": time.metal,
    "--metal-solido": time.metalSolido,
    "--brilho-nome": `${time.neon}66`,
    "--aura": `${time.neon}88`,
    "--cor-time": time.cor,
    "--peso-nome": time.pesoTitulo,
    "--estilo-nome": time.estiloTitulo,
  } as CSSProperties;
}

/**
 * O escudo do time com a aura da cor dele. Sem escudo, um hexágono com a sigla — o show nunca
 * mostra um buraco no lugar de um time.
 */
export function EscudoDoShow({ time, className }: Readonly<{ time: TimeDoShow; className?: string }>) {
  return (
    <div className={`${s.escudo} ${className ?? ""}`} style={varsDoTime(time)}>
      <span aria-hidden className={s.enfAura} />
      {time.escudo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={s.escudoImagem} src={time.escudo} alt={time.nome} draggable={false} />
      ) : (
        <span className={s.escudoSigla} role="img" aria-label={time.nome}>
          {time.sigla}
        </span>
      )}
    </div>
  );
}

/** O nome do time na fonte e no metal do tema dele (assinatura pequena, marca grande). */
export function NomeDoTime({
  time,
  className,
  como: Tag = "p",
}: Readonly<{ time: TimeDoShow; className?: string; como?: "p" | "h2" | "h3" | "span" }>) {
  return (
    <Tag className={`${time.fonteClasse ?? ""} ${className ?? s.nomeDoTime}`} style={varsDoTime(time)}>
      {time.assinatura && time.nome.toUpperCase().startsWith(time.assinatura.toUpperCase()) ? (
        <>
          <span className={s.assinatura}>{time.assinatura}</span> {time.marca}
        </>
      ) : time.assinatura ? (
        <>
          {time.marca} <span className={s.assinatura}>{time.assinatura}</span>
        </>
      ) : (
        time.nome
      )}
    </Tag>
  );
}
