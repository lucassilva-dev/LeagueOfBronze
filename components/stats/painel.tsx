"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import { ATOS_DA_FORJA } from "./constantes";
import s from "./camadas.module.css";
import { useForja, useRetratoDoDiretor } from "./provedor";

/**
 * O PAINEL DE BORDO — o que fica fixo na tela enquanto a página rola, nas duas margens:
 *
 *  - à direita, o TRILHO DOS ATOS: em que cena a pessoa está e o salto para qualquer outra, com
 *    as setas de «ato anterior / próximo» nas pontas;
 *  - à esquerda, embaixo, os COMANDOS: som (com o volume), modo VS e a visão em tabela.
 *
 * Pequeno de propósito: a página passa ao vivo, e o painel não pode disputar a tela com os
 * números. Os atalhos (← → e M) são do provedor; aqui estão os mesmos comandos como botões, para
 * quem não conhece atalho nenhum.
 */

function IconeDeSom({ ligado }: Readonly<{ ligado: boolean }>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden focusable="false">
      <path d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" />
      {ligado ? (
        <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      ) : (
        <path d="M16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

function IconeDeTabela() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden focusable="false">
      <path d="M3.5 5h17v14h-17zM3.5 10h17M3.5 14.5h17M9.5 5v14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    </svg>
  );
}

function Seta({ para }: Readonly<{ para: "cima" | "baixo" }>) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden focusable="false">
      <path d={para === "cima" ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"} fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PainelDeBordo() {
  const { t, diretor, som, versus, ocupado } = useForja();
  const { f } = t;
  const retrato = useRetratoDoDiretor();
  const total = Math.max(1, retrato.total || ATOS_DA_FORJA.length);
  const viajar = (delta: 1 | -1) => {
    if (diretor.viajar(delta)) som.tocar((x) => x.sopro(delta === 1));
  };

  return (
    <div className={s.painel} data-escondido={ocupado ? "" : undefined}>
      {/* ------------------------------------------------ o trilho dos atos */}
      <nav className={s.trilho} aria-label={f.hudAtos}>
        <button type="button" className={s.passo} onClick={() => viajar(-1)} disabled={retrato.atoAtual <= 0} aria-label={f.hudAnterior} title={f.hudAnterior}>
          <Seta para="cima" />
        </button>
        <ol style={{ "--feito": (retrato.atoAtual / Math.max(1, total - 1)).toFixed(3) } as CSSProperties}>
          {ATOS_DA_FORJA.map((id, i) => (
            <li key={id}>
              <a
                href={`#ato-${id}`}
                className={s.rebite}
                aria-current={retrato.atoAtual === i ? "step" : undefined}
                onClick={(ev) => {
                  // Com a página viva, o salto é uma viagem (a cena se monta no caminho); sem
                  // JavaScript, a âncora leva ao ato.
                  if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
                  ev.preventDefault();
                  if (i === retrato.atoAtual) return;
                  diretor.irPara(i);
                  som.tocar((x) => x.sopro(i > retrato.atoAtual));
                }}
              >
                <span className={s.rebiteNome}>
                  <span>{f.atos[id].numero}</span>
                  {f.atos[id].nome}
                </span>
                <span className={s.enfRebite} aria-hidden />
              </a>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={s.passo}
          onClick={() => viajar(1)}
          disabled={retrato.atoAtual >= total - 1}
          aria-label={f.hudProximo}
          title={f.hudProximo}
        >
          <Seta para="baixo" />
        </button>
      </nav>

      {/* ------------------------------------------------ os comandos */}
      <div className={s.bordo}>
        <div className={s.item}>
          <button
            type="button"
            className={s.botao}
            aria-pressed={som.ligado}
            aria-label={som.ligado ? f.hudSomDesligar : f.hudSomLigar}
            onClick={som.alternar}
          >
            <IconeDeSom ligado={som.ligado} />
          </button>
          {som.ligado && som.desbloqueado ? (
            <label className={s.volume} data-setas-proprias="">
              <span className={s.soLeitor}>{f.hudVolume}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={Math.round(som.volume * 100)}
                onChange={(ev) => som.definirVolume(Number(ev.target.value) / 100)}
                onPointerUp={() => som.tocar((x) => x.tique(0.5))}
                onKeyUp={() => som.tocar((x) => x.tique(0.5))}
              />
            </label>
          ) : null}
          {/* Quem já escolheu «com som» antes: o navegador só solta o áudio depois de um gesto. */}
          {som.ligado && !som.desbloqueado ? <span className={s.avisoDeSom}>{f.hudSomAviso}</span> : null}
          <span className={s.botaoNome} aria-hidden>
            {som.ligado ? f.hudSomDesligar : f.hudSomLigar}
          </span>
        </div>

        <div className={s.item}>
          <button type="button" className={s.botao} onClick={() => versus.abrir()} aria-label={f.hudVs}>
            VS
          </button>
          <span className={s.botaoNome} aria-hidden>
            {f.hudVs}
          </span>
        </div>

        <div className={s.item}>
          <Link href="/stats?modo=tabela" className={s.botao} aria-label={f.fechoTabela}>
            <IconeDeTabela />
          </Link>
          <span className={s.botaoNome} aria-hidden>
            {f.fechoTabela}
          </span>
        </div>
      </div>
    </div>
  );
}
