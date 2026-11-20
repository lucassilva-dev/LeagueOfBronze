"use client";

import { useEffect, useRef } from "react";

import { ATOS_DA_FORJA } from "../constantes";
import s from "../forja.module.css";
import { useForja } from "../provedor";
import type { CenaDaForja, Qualidade } from "./cena-da-forja";

/**
 * O FUNDO 3D DA /stats — carrega a cena (three.js) SÓ nesta rota, por `import()` dinâmico, depois
 * que a página já pintou: o texto e os números nunca esperam por ela.
 *
 * A cena só entra onde faz sentido. Fica o fundo 2D (o gradiente da página e o emblema em
 * imagem) quando:
 *  - a pessoa pediu movimento reduzido;
 *  - a tela é de celular (largura < 768): bateria e GPU pequena;
 *  - o navegador avisou economia de dados;
 *  - não há WebGL, ou ele cai (contexto perdido);
 *  - o monitor de desempenho desiste (nem no degrau mais baixo fecha 30 quadros por segundo).
 *
 * `?3d=alta|media|baixa` trava um degrau (para testar e para capturar a tela); `?3d=0` desliga.
 */

const DEGRAUS: readonly Qualidade[] = ["alta", "media", "baixa"];

type ComOcioso = Window & {
  requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

export function FundoDaForja() {
  const { dados, diretor, faiscas, holofote, versus } = useForja();
  const caixa = useRef<HTMLDivElement | null>(null);

  // Com o holofote ou o modo VS por cima (telas cheias, opacas), a cena não desenha: ninguém a vê.
  const coberta = useRef(false);
  useEffect(() => {
    coberta.current = holofote.aberto !== null || versus.pedido !== null;
  }, [holofote.aberto, versus.pedido]);

  useEffect(() => {
    const onde = caixa.current;
    const raiz = onde?.closest<HTMLElement>("[data-forja]");
    if (!onde || !raiz) return;

    const pedido = new URLSearchParams(window.location.search).get("3d");
    const travado = DEGRAUS.find((q) => q === pedido) ?? null;
    const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    const economia = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (pedido === "0" || (!travado && (reduzido || economia || window.innerWidth < 768))) return;

    let cena: CenaDaForja | null = null;
    let tela: HTMLCanvasElement | null = null;
    let cancelado = false;
    let soltarQuadro = () => {};

    const desligar = () => {
      soltarQuadro();
      soltarQuadro = () => {};
      cena?.descartar();
      cena = null;
      tela?.remove();
      tela = null;
      raiz.dataset["3d"] = "0";
      delete raiz.dataset.qualidade;
    };

    const iniciar = async () => {
      try {
        const modulo = await import("./cena-da-forja");
        if (cancelado) return;
        // O canvas nasce aqui (e morre com a cena): um contexto WebGL descartado não volta.
        tela = document.createElement("canvas");
        tela.className = s.enfCena ?? "";
        tela.setAttribute("aria-hidden", "true");
        tela.addEventListener("webglcontextlost", desligar);
        onde.append(tela);
        cena = new modulo.CenaDaForja(
          tela,
          {
            atos: ATOS_DA_FORJA,
            elos: dados.elos.map((elo) => elo.cor),
            times: dados.times.map((time) => ({ id: time.id, escudo: time.escudo })),
            emblema: "/emblema-recortado.png",
          },
          {
            qualidade: (q) => {
              if (q === null) desligar();
              else raiz.dataset.qualidade = q;
            },
            golpe: (x, y, forca) => {
              faiscas()?.explosao({
                x,
                y,
                cores: ["#fff3dc", "#ffc061", "#ff6a2b", "#f0c88a"],
                quantidade: Math.round(46 * forca),
                forca: 0.95 * forca,
                espessura: 2.6,
              });
            },
          },
          travado,
        );
        cena.redimensionar(window.innerWidth, window.innerHeight);
        raiz.dataset["3d"] = "1";
        soltarQuadro = diretor.aCadaQuadro((dt, estado) => {
          if (!coberta.current) cena?.quadro(dt, estado);
        });
      } catch (erro) {
        // Sem WebGL (ou qualquer tropeço na cena): a página segue com o fundo 2D.
        console.warn("[forja] cena 3D indisponível:", erro);
        desligar();
      }
    };

    const janela = window as ComOcioso;
    const idOcioso = janela.requestIdleCallback ? janela.requestIdleCallback(() => void iniciar(), { timeout: 1200 }) : null;
    const idTempo = idOcioso === null ? window.setTimeout(() => void iniciar(), 250) : null;

    const aoRedimensionar = () => cena?.redimensionar(window.innerWidth, window.innerHeight);
    window.addEventListener("resize", aoRedimensionar);

    return () => {
      cancelado = true;
      if (idOcioso !== null) janela.cancelIdleCallback?.(idOcioso);
      if (idTempo !== null) window.clearTimeout(idTempo);
      window.removeEventListener("resize", aoRedimensionar);
      desligar();
      delete raiz.dataset["3d"];
    };
  }, [dados.elos, dados.times, diretor, faiscas]);

  return <div ref={caixa} className={s.enfPalco3d} aria-hidden />;
}
