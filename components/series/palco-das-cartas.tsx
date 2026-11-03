"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, type CSSProperties, type MutableRefObject } from "react";

import { letraDaCarta, type CardDef } from "@/lib/cards";
import { fatiaDoIndice, fatiaNoPonteiro } from "@/lib/series/roda";

import type { ApiDoPalco } from "./palco-dos-lados";
import { EscudoDoShow, NomeDoTime, type TimeDoShow } from "./escudo-do-show";
import s from "./cerimonia.module.css";

export type TextoDaCarta = Readonly<{ nome: string; flavor: string; descricao: string; resumo: string; resumoDuplo: string }>;

export type TextosDoPalcoDasCartas = Readonly<{
  usouACarta: string;
  sofre: string;
  osDoisTimes: string;
  tituloDupla: string;
  valeParaOsDois: string;
  saiuACarta: string;
  carta: string;
  surpresa: string;
  dupla: string;
  lendaria: string;
  oQueAcontece: string;
  aRegra: string;
  letras: string;
  campeoesDisponiveis: string;
}>;

/** Letras de enfeite para a fita do rolo antes de chegar à sorteada. Não decidem nada. */
const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * A fita de um rolo: COMEÇA e TERMINA na letra sorteada e dá `voltas` inteiras pelo alfabeto no
 * meio, sempre para a frente. Parado no primeiro ou no último quadro, o rolo mostra a letra certa
 * — nunca um "A" que não saiu. Determinística (a mesma letra dá a mesma fita): o render é puro.
 */
function fitaDoRolo(letra: string, voltas: number): string[] {
  const alvo = Math.max(0, ALFABETO.indexOf(letra));
  const fita: string[] = [];
  for (let i = 0; i <= voltas * 26; i += 1) fita.push(ALFABETO[(alvo + i) % 26]!);
  return fita;
}

/** Preenche {usuario}, {vitima}, {l1}, {l2} na frase concreta da carta. */
function preencher(frase: string, valores: Record<string, string>): string {
  return frase.replace(/\{(\w+)\}/g, (_, chave: string) => valores[chave] ?? "");
}

/**
 * O PALCO DAS CARTAS — o carrossel 3D e a puxada.
 *
 * As cartas do baralho DE AGORA (`baralhoDoSorteio`) ficam num anel 3D, de VERSO para fora: o
 * verso mostra a LETRA de cada carta (A–E; «2×» nas duplas), então a plateia acompanha qual
 * passa pela frente enquanto o anel desacelera — a arte só aparece na virada. O anel é a roleta:
 * a carta i fica em `rotateY(meio_i)` e o anel em `rotateY(θ)`; ela está de frente quando
 * θ + meio_i ≡ 0, que é exatamente a parada de `anguloDeParada`. A ordem do anel é a do baralho;
 * nada é reembaralhado.
 *
 * Na revelação, a carta da frente é trocada pela carta da PUXADA no mesmo lugar: ela sobe girando
 * do verso para a face (só transform — o verso também é conteúdo, com a letra), o anel afunda, e
 * a placa da regra entra com a frase concreta ("GALÁCTICOS DO BAR não pode banir ninguém"), a
 * regra oficial traduzida e, no ABCDRAFT, os dois rolos de letras.
 */
export function PalcoDasCartas({
  apiRef,
  baralho,
  textosDasCartas,
  dono,
  alvo,
  dupla,
  fase,
  resultado,
  letras,
  campeoes,
  textos,
}: Readonly<{
  apiRef: MutableRefObject<ApiDoPalco | null>;
  baralho: readonly CardDef[];
  textosDasCartas: Readonly<Record<string, TextoDaCarta>>;
  /** Quem usou a carta (individual). */
  dono: TimeDoShow | null;
  /** O adversário, que sofre a carta (individual). */
  alvo: TimeDoShow | null;
  /** Os dois times, no sorteio duplo. */
  dupla: readonly [TimeDoShow, TimeDoShow] | null;
  fase: string;
  resultado: CardDef | null;
  letras: readonly [string, string] | null;
  campeoes: number | null;
  textos: TextosDoPalcoDasCartas;
}>) {
  const anel = useRef<HTMLDivElement | null>(null);
  const ponteiro = useRef<HTMLSpanElement | null>(null);
  const cartas = useRef<(HTMLDivElement | null)[]>([]);
  const frente = useRef(-1);
  const total = baralho.length;

  const pose = useCallback(
    (angulo: number) => {
      if (anel.current) anel.current.style.transform = `rotateY(${angulo.toFixed(2)}deg)`;
      // A moldura de ouro acompanha a carta que está na frente (troca de classe, sem render).
      const agora = fatiaNoPonteiro(angulo, total);
      if (agora !== frente.current) {
        cartas.current[frente.current]?.classList.remove(s.naFrente!);
        cartas.current[agora]?.classList.add(s.naFrente!);
        frente.current = agora;
      }
    },
    [total],
  );

  const tique = useCallback(() => {
    const el = ponteiro.current;
    if (!el) return;
    el.classList.remove(s.batendo!);
    void el.offsetWidth;
    el.classList.add(s.batendo!);
  }, []);

  useLayoutEffect(() => {
    apiRef.current = { pose, tique };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, pose, tique]);

  const revelado = fase === "revelado" && resultado !== null;
  // Raio do anel em larguras de carta: largo o bastante para as vizinhas aparecerem de lado.
  const fator = total <= 5 ? 1.55 : 1.85;

  const texto = resultado ? textosDasCartas[resultado.cardId] : undefined;
  const nomeDaCarta = texto?.nome ?? resultado?.title ?? "";
  const letra = resultado ? letraDaCarta(resultado.cardId) : undefined;
  const ehDupla = dupla !== null;
  const lendaria = ehDupla && resultado?.dupla === true;

  const frase = useMemo(() => {
    if (!texto) return "";
    const base = ehDupla ? texto.resumoDuplo : texto.resumo;
    return preencher(base, {
      usuario: dono?.nome ?? "",
      vitima: alvo?.nome ?? "",
      l1: letras?.[0] ?? "?",
      l2: letras?.[1] ?? "?",
    });
  }, [texto, ehDupla, dono?.nome, alvo?.nome, letras]);

  const corDaCarta = resultado
    ? ({
        "--cor-carta": resultado.color,
        "--borda-carta": resultado.border,
        "--brilho-carta": `${resultado.color}88`,
      } as CSSProperties)
    : undefined;

  return (
    <>
    <div className={`${s.camada} ${revelado ? s.reveladoCartas : ""}`}>
      {/* Quem usou e quem sofre (ou os dois, no duplo). */}
      <div className={s.cabecalhoCartas}>
        {dupla ? (
          <>
            <div className={s.timeDoCabecalho}>
              <EscudoDoShow time={dupla[0]} className={s.escudoPequeno} />
              <NomeDoTime time={dupla[0]} className={s.nomePequeno} />
            </div>
            <p className={`${s.legendaDoCabecalho} ${s.legendaDupla}`}>{textos.tituloDupla}</p>
            <div className={s.timeDoCabecalho}>
              <NomeDoTime time={dupla[1]} className={s.nomePequeno} />
              <EscudoDoShow time={dupla[1]} className={s.escudoPequeno} />
            </div>
          </>
        ) : (
          <>
            {dono ? (
              <div className={s.timeDoCabecalho}>
                <EscudoDoShow time={dono} className={s.escudoPequeno} />
                <NomeDoTime time={dono} className={s.nomePequeno} />
              </div>
            ) : null}
            <p className={s.legendaDoCabecalho}>{textos.usouACarta}</p>
            {alvo ? (
              <div className={s.timeDoCabecalho}>
                <NomeDoTime time={alvo} className={s.nomePequeno} />
                <EscudoDoShow time={alvo} className={s.escudoPequeno} />
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* O carrossel. Enfeite para leitor de tela: a carta sorteada é dita na revelação. */}
      <div className={s.cenaCartas} aria-hidden>
        <span ref={ponteiro} className={s.ponteiroCarta} />
        <div className={s.inclinacao}>
          <div ref={anel} className={s.anel}>
            {baralho.map((carta, i) => {
              const meio = fatiaDoIndice(i, total).meio;
              const letraNoVerso = letraDaCarta(carta.cardId);
              const escondida = revelado && resultado?.cardId === carta.cardId;
              return (
                <div
                  key={carta.cardId}
                  ref={(el) => {
                    cartas.current[i] = el;
                  }}
                  className={s.cartaNoAnel}
                  style={
                    {
                      transform: `rotateY(${meio}deg) translateZ(calc(var(--carta-w) * ${fator}))`,
                      visibility: escondida ? "hidden" : undefined,
                      "--cor-carta": carta.color,
                    } as CSSProperties
                  }
                >
                  <VersoDaCarta letra={letraNoVerso ?? "2×"} cor={carta.color} />
                  <div className={`${s.face} ${s.faceDentro}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>

      {/* A revelação fica no FLUXO da cena (não na camada absoluta): ela cresce com o conteúdo, o
          rodapé com a semente vem logo depois e, no celular, o diálogo rola em vez de cortar. */}
      {revelado && resultado ? (
        <div className={s.revelacaoCarta} style={corDaCarta}>
          <div className={s.palcoDaCarta}>
            <span aria-hidden className={s.enfRaios} />
            <div className={s.puxada}>
              <div className={`${s.face} ${s.faceDaPuxada}`}>
                <div className={s.cartaGrandeTopo}>
                  <span className={s.chip}>{resultado.dupla ? textos.dupla : textos.surpresa}</span>
                  {letra ? <span className={s.chipLetra}>{letra}</span> : null}
                </div>
                <div className={s.cartaGrandeArte}>
                  {resultado.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={resultado.imageUrl} alt="" draggable={false} />
                  ) : (
                    <span className={s.cartaGrandeEmoji} aria-hidden>
                      {resultado.emoji}
                    </span>
                  )}
                </div>
                <p className={s.cartaGrandeNome}>{nomeDaCarta}</p>
                <span aria-hidden className={s.enfHolo} />
              </div>
              <div className={`${s.face} ${s.versoDaPuxada}`}>
                <VersoDaCarta letra={letra ?? "2×"} cor={resultado.color} grande />
              </div>
            </div>
          </div>

          <div className={s.regra}>
            <p className={s.regraResultado}>
              {letra ? `${textos.saiuACarta} ${letra}` : textos.saiuACarta}
              {lendaria ? <span className={s.lendaria}>{textos.lendaria}</span> : null}
            </p>
            <h2 className={s.regraNome}>{nomeDaCarta}</h2>
            {ehDupla ? <span className={s.dupla}>{textos.valeParaOsDois}</span> : null}
            {frase ? <p className={s.regraFrase}>{frase}</p> : null}

            {letras ? (
              <div className={s.letras}>
                <p className={s.regraRotulo}>{textos.letras}</p>
                <div className={s.rolos} aria-hidden>
                  {letras.map((l, i) => {
                    const fita = fitaDoRolo(l, i === 0 ? 2 : 3);
                    return (
                      <span key={`${l}-${i}`} className={s.rolo}>
                        <span
                          className={`${s.fita} ${i === 0 ? s.fitaA : s.fitaB}`}
                          style={{ "--parada": fita.length - 1 } as CSSProperties}
                        >
                          {fita.map((letraDaFita, j) => (
                            <span key={j} className={s.letraDoRolo}>
                              {letraDaFita}
                            </span>
                          ))}
                        </span>
                      </span>
                    );
                  })}
                </div>
                {/* O par num único nó de texto, para o leitor de tela (os rolos são aria-hidden). */}
                <p className="sr-only">{letras.join(" · ")}</p>
                {typeof campeoes === "number" ? (
                  <p className={s.campeoes}>
                    {campeoes} {textos.campeoesDisponiveis}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className={s.regraCaixa}>
              <p className={s.regraRotulo}>{textos.aRegra}</p>
              <p className={s.regraTexto}>{texto?.descricao ?? resultado.description}</p>
            </div>
            {texto?.flavor ? <p className={s.regraFlavor}>“{texto.flavor}”</p> : null}
            {!ehDupla && alvo ? (
              <p className={s.quemSofre}>
                {textos.sofre}: <strong>{alvo.nome}</strong>
              </p>
            ) : ehDupla ? (
              <p className={s.quemSofre}>{textos.osDoisTimes}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

/** O verso da carta: bronze, rede hexagonal, o emblema da liga e a LETRA (conteúdo). */
function VersoDaCarta({ letra, cor, grande = false }: Readonly<{ letra: string; cor: string; grande?: boolean }>) {
  return (
    <div className={`${s.face} ${s.faceVerso} ${grande ? s.versoGrande : ""}`} style={{ "--cor-carta": cor } as CSSProperties}>
      <span className={s.abaDaLetra}>{letra}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" draggable={false} />
    </div>
  );
}
