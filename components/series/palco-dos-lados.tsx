"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type CSSProperties, type MutableRefObject } from "react";

import { fatiaDoIndice, pinturaDasFatias } from "@/lib/series/roda";

import { EscudoDoShow, NomeDoTime, type TimeDoShow } from "./escudo-do-show";
import s from "./cerimonia.module.css";

/** O que o palco oferece ao orquestrador: a pose (ângulo do giro) e o tique do ponteiro. */
export type ApiDoPalco = Readonly<{ pose: (angulo: number) => void; tique: () => void }>;

/**
 * Seis fatias alternadas, A·B·A·B·A·B.
 *
 * Com 2 fatias a última troca sob a seta acontece 90° antes da parada — 1,5 a 2,4 s antes, e a
 * plateia já sabe o resultado. Com 6, acontece a 30° do fim: o suspense vai até o último
 * instante. E como 3 é ímpar, a fatia oposta (índice + 3) é SEMPRE do outro time: quando a seta
 * azul aponta um time, a vermelha aponta o outro.
 */
export const TOTAL_DOS_LADOS = 6;

/** Pose de abertura: a seta azul na fronteira entre duas fatias — ninguém começa favorecido. */
export const POSE_INICIAL_DOS_LADOS = 0;

/**
 * A roda está girada −90° no palco: o 0° de `lib/series/roda.ts` (onde o freio encosta o meio
 * da fatia sorteada) cai na SETA AZUL, à esquerda — e a esquerda é azul no site todo.
 */
const GIRO_DO_PALCO = -90;

/** Mistura duas cores hex (t = quanto da segunda). Para escurecer a fatia sem `color-mix`. */
function misturar(a: string, b: string, t: number): string {
  const ler = (hex: string) => {
    const h = hex.replace("#", "");
    const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
    const n = Number.parseInt(cheio, 16);
    return Number.isNaN(n) ? [201, 138, 75] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = ler(a);
  const [r2, g2, b2] = ler(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

/**
 * O PALCO DOS LADOS — «A Roleta das Duas Setas».
 *
 * Uma roda de bronze com as 6 fatias nas cores dos times e um medalhão com o escudo em cada uma
 * (sempre de pé, como cadeira de roda-gigante). A SETA AZUL fica à esquerda e a VERMELHA à
 * direita, fixas; em cima, a pergunta "Quem começa no lado azul?". O ângulo vem do motor
 * (`useRotor`) e é escrito direto no DOM: o disco gira, os medalhões orbitam.
 *
 * Na revelação a roda recua para o centro e os PAINÉIS DOS LADOS entram pelas bordas: à
 * esquerda o azul, à direita o vermelho — cada um com o escudo, o nome do time na fonte e no
 * metal do tema dele e "começa no lado azul/vermelho". A cor do painel é a do LADO; a do time
 * fica no nome e no brilho do escudo.
 */
export function PalcoDosLados({
  apiRef,
  timeA,
  timeB,
  fase,
  azulId,
  textos,
}: Readonly<{
  apiRef: MutableRefObject<ApiDoPalco | null>;
  timeA: TimeDoShow;
  timeB: TimeDoShow;
  fase: string;
  /** O time do lado azul, quando revelado (sempre o da RESPOSTA, nunca a geometria). */
  azulId: string | null;
  textos: Readonly<{ ladoAzul: string; ladoVermelho: string; comecaNo: string; pergunta: string; jogo1: string }>;
}>) {
  const roda = useRef<HTMLDivElement | null>(null);
  const disco = useRef<HTMLDivElement | null>(null);
  const medalhoes = useRef<(HTMLDivElement | null)[]>([]);
  const setas = useRef<(HTMLSpanElement | null)[]>([]);
  const raioDosMedalhoes = useRef(150);
  const ultimoAngulo = useRef(POSE_INICIAL_DOS_LADOS);

  // As cores de PALCO do confronto (contrastam entre si mesmo quando os dois times são azuis).
  const corA = timeA.corDePalco;
  const corB = timeB.corDePalco;
  const pintura = useMemo(() => {
    // Fatia = TIME, não lado: pintada de azul/vermelho pela posição, a roda pararia numa fatia
    // vermelha quando o Time B ganhasse o azul. Com a cor de cada time escurecida, a roda não
    // promete lado nenhum — quem diz o lado são as setas.
    const a = misturar(corA, "#0b0804", 0.55);
    const b = misturar(corB, "#0b0804", corB.toLowerCase() === corA.toLowerCase() ? 0.78 : 0.55);
    return pinturaDasFatias(Array.from({ length: TOTAL_DOS_LADOS }, (_, i) => (i % 2 === 0 ? a : b)));
  }, [corA, corB]);

  const pose = useCallback((angulo: number) => {
    ultimoAngulo.current = angulo;
    if (disco.current) disco.current.style.transform = `rotate(${(angulo + GIRO_DO_PALCO).toFixed(2)}deg)`;
    const r = raioDosMedalhoes.current;
    medalhoes.current.forEach((el, i) => {
      if (!el) return;
      const alfa = ((fatiaDoIndice(i, TOTAL_DOS_LADOS).meio + angulo + GIRO_DO_PALCO) * Math.PI) / 180;
      el.style.transform = `translate3d(${(r * Math.sin(alfa)).toFixed(2)}px, ${(-r * Math.cos(alfa)).toFixed(2)}px, 0)`;
    });
  }, []);

  const tique = useCallback(() => {
    for (const el of setas.current) {
      if (!el) continue;
      el.classList.remove(s.batendo!);
      // Reinicia a animação do tique sem re-render (ler o layout força o recomeço).
      void el.offsetWidth;
      el.classList.add(s.batendo!);
    }
  }, []);

  // O raio dos medalhões acompanha o tamanho real da roda (que é responsivo, em CSS).
  const medir = useCallback(() => {
    const el = roda.current;
    if (!el) return;
    // `offsetWidth` é a largura de layout: o retângulo na tela inclui a escala da entrada da roda
    // (0,82 no 1º quadro), e os medalhões ficavam encolhidos para o miolo até um resize.
    raioDosMedalhoes.current = el.offsetWidth * 0.31;
    pose(ultimoAngulo.current);
  }, [pose]);

  useLayoutEffect(() => {
    apiRef.current = { pose, tique };
    medir();
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, medir, pose, tique]);

  useEffect(() => {
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [medir]);

  const revelado = fase === "revelado" && azulId !== null;
  const azul = revelado ? (azulId === timeB.id ? timeB : timeA) : null;
  const vermelho = azul ? (azul.id === timeA.id ? timeB : timeA) : null;

  return (
    <div
      className={`${s.camada} ${revelado ? s.revelado : ""} ${fase === "girando" || fase === "vai" ? s.girando : ""} ${fase === "freando" ? s.freando : ""}`}
    >
      <div className={`${s.zona} ${s.zonaAzul}`}>
        <span aria-hidden className={s.enfLuzDoLado} />
      </div>
      <div className={`${s.zona} ${s.zonaVermelha}`}>
        <span aria-hidden className={s.enfLuzDoLado} />
      </div>
      <span aria-hidden className={s.enfCostura} />

      {/* A pergunta sai quando a resposta chega: os painéis dos lados ocupam a tela. */}
      {revelado ? null : <p className={s.pergunta}>{textos.pergunta}</p>}

      <div ref={roda} className={s.roda}>
        <span aria-hidden className={s.enfHaloDaRoda} />
        <div ref={disco} className={s.disco} style={{ background: pintura }} aria-hidden>
          <span className={s.raiosDoDisco} />
        </div>
        <span aria-hidden className={s.enfVerniz} />
        <span aria-hidden className={s.aro} />
        {Array.from({ length: TOTAL_DOS_LADOS }, (_, i) => {
          const time = i % 2 === 0 ? timeA : timeB;
          return (
            <div
              key={i}
              ref={(el) => {
                medalhoes.current[i] = el;
              }}
              className={s.medalhao}
              aria-hidden
            >
              <EscudoDoShow time={time} className={s.escudoDoMedalhao} />
            </div>
          );
        })}
        <div className={s.miolo} aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" draggable={false} />
        </div>
        <span
          ref={(el) => {
            setas.current[0] = el;
          }}
          aria-hidden
          className={`${s.seta} ${s.setaAzul}`}
        />
        <span
          ref={(el) => {
            setas.current[1] = el;
          }}
          aria-hidden
          className={`${s.seta} ${s.setaVermelha}`}
        />
      </div>

      {/* Na revelação quem diz o lado são os painéis; os rótulos laterais saem de cena. */}
      {revelado ? null : (
        <>
          <p className={`${s.rotuloLado} ${s.rotuloAzul}`}>{textos.ladoAzul}</p>
          <p className={`${s.rotuloLado} ${s.rotuloVermelho}`}>{textos.ladoVermelho}</p>
        </>
      )}

      {azul && vermelho ? (
        <div className={s.paineis}>
          <PainelDoLado time={azul} lado="azul" rotulo={textos.ladoAzul} legenda={`${textos.comecaNo} ${textos.ladoAzul} · ${textos.jogo1}`} />
          <PainelDoLado
            time={vermelho}
            lado="vermelho"
            rotulo={textos.ladoVermelho}
            legenda={`${textos.comecaNo} ${textos.ladoVermelho} · ${textos.jogo1}`}
          />
          {/* O resultado por extenso para leitor de tela sai da região viva da cerimônia, que
              existe desde a abertura (uma região que nasce junto com o texto não é anunciada). */}
        </div>
      ) : null}
    </div>
  );
}

function PainelDoLado({
  time,
  lado,
  rotulo,
  legenda,
}: Readonly<{ time: TimeDoShow; lado: "azul" | "vermelho"; rotulo: string; legenda: string }>) {
  return (
    <div
      className={`${s.painel} ${lado === "azul" ? s.painelAzul : s.painelVermelho}`}
      style={{ "--aura": `${time.neon}aa` } as CSSProperties}
    >
      <span aria-hidden className={s.enfVarredura} />
      <p className={s.painelRotulo}>{rotulo}</p>
      <EscudoDoShow time={time} className={s.escudoDoPainel} />
      <NomeDoTime time={time} className={s.nomeDoTime} />
      <p className={s.painelLegenda}>{legenda}</p>
    </div>
  );
}
