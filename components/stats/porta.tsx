"use client";

import { useEffect, useRef, useState } from "react";

import s from "./camadas.module.css";
import { preencher } from "./pecas";
import { useForja } from "./provedor";

/**
 * A PORTA DA FORNALHA — a tela de entrada, só na primeira visita.
 *
 * Existe por um motivo técnico e vira intro: o navegador só libera áudio depois de um clique, e
 * este é o clique. «Entrar com som» abre o áudio; «Entrar sem som» não. A escolha fica num cookie
 * (`lob_stats_som`), e é por isso que o SERVIDOR sabe se desenha a porta — ela já vem no primeiro
 * quadro, sem piscar, e quem volta nem a vê.
 *
 * Não atrasa nem esconde conteúdo de quem não é pessoa: o HTML da página inteira está logo antes,
 * no mesmo documento (a porta vem DEPOIS do conteúdo e leva `data-nosnippet`). Sem JavaScript os
 * botões são âncoras para `#forja`, e o CSS tira a porta pelo `:target`.
 */
export function PortaDaFornalha({ edicao }: Readonly<{ edicao: string }>) {
  const { t, som, definirPortaFechada } = useForja();
  const { f } = t;
  const [saindo, setSaindo] = useState(false);
  const [fora, setFora] = useState(false);
  const comSom = useRef<HTMLAnchorElement | null>(null);
  const semSom = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    if (window.location.hash === "#forja") {
      // Clicaram num botão antes de a página acordar: a âncora já tirou a porta pelo CSS. Ela
      // sai de vez (sem gravar escolha — não dá para saber qual foi) e a página destrava.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFora(true);
      definirPortaFechada(false);
      return;
    }
    comSom.current?.focus({ preventScroll: true });
  }, [definirPortaFechada]);

  if (fora) return null;

  const entrar = (ligado: boolean) => {
    if (saindo) return;
    som.ligar(ligado); // grava a escolha e, com som, abre o áudio (estamos dentro do clique)
    if (ligado) som.tocar((x) => x.porta());
    setSaindo(true);
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    window.setTimeout(
      () => {
        setFora(true);
        definirPortaFechada(false);
      },
      reduzido ? 0 : 1150,
    );
  };

  return (
    <div
      className={s.porta}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-da-porta"
      data-saindo={saindo ? "" : undefined}
      data-nosnippet=""
      onKeyDown={(ev) => {
        // Esc dispensa a porta do jeito discreto: entra sem som.
        if (ev.key === "Escape") {
          ev.preventDefault();
          entrar(false);
          return;
        }
        // O foco fica entre os dois botões enquanto a porta está fechada.
        if (ev.key !== "Tab") return;
        ev.preventDefault();
        (document.activeElement === comSom.current ? semSom.current : comSom.current)?.focus();
      }}
    >
      <span className={`${s.enfFolha} ${s.enfFolhaEsquerda}`} aria-hidden />
      <span className={`${s.enfFolha} ${s.enfFolhaDireita}`} aria-hidden />
      <span className={s.enfFresta} aria-hidden />

      <div className={s.portaMiolo}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={s.portaEmblema} src="/emblema-recortado.png" alt="" width={512} height={512} decoding="async" />
        <p className={s.portaSobre}>{preencher(f.portaSobre, { edicao })}</p>
        <h2 id="titulo-da-porta" className={s.portaTitulo}>
          {f.portaTitulo}
        </h2>
        <p className={s.portaTexto}>{f.portaTexto}</p>
        <p className={s.portaBotoes}>
          <a
            ref={comSom}
            href="#forja"
            className={s.portaBotao}
            data-entrada="som"
            onClick={(ev) => {
              ev.preventDefault();
              entrar(true);
            }}
          >
            {f.portaComSom}
          </a>
          <a
            ref={semSom}
            href="#forja"
            className={`${s.portaBotao} ${s.portaBotaoMudo}`}
            data-entrada="mudo"
            onClick={(ev) => {
              ev.preventDefault();
              entrar(false);
            }}
          >
            {f.portaSemSom}
          </a>
        </p>
        <p className={s.portaDica}>{f.portaDica}</p>
      </div>
    </div>
  );
}
