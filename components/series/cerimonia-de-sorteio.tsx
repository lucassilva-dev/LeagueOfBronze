"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, Minimize2, Sparkles, Volume1, Volume2, VolumeX, X } from "lucide-react";

import { CARDS_BY_ID, baralhoDoSorteio, type CardDef } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import {
  criarSomDaCerimonia,
  type RufarEmCurso,
  type SomDaCerimonia,
  type TomDoResultado,
} from "@/lib/series/som-da-cerimonia";

import type { TimeDoShow } from "./escudo-do-show";
import { Faiscas, type ApiFaiscas } from "./faiscas";
import { PalcoDasCartas, type TextoDaCarta, type TextosDoPalcoDasCartas } from "./palco-das-cartas";
import { PalcoDosLados, POSE_INICIAL_DOS_LADOS, TOTAL_DOS_LADOS, type ApiDoPalco } from "./palco-dos-lados";
import { DEGRAUS_DE_VOLUME, podePrenderEsc, useMovimentoReduzidoDoSistema, useTelaCheia } from "./preferencias-do-show";
import { useRotor } from "./usar-rotor";
import s from "./cerimonia.module.css";

/**
 * O SHOW DO SORTEIO — a cerimônia em tela cheia da página pública da partida.
 *
 * ⚠ O QUE ESTA TELA **NÃO** FAZ: sortear. Quem sorteia é `POST /api/admin/series/sorteio`, no
 * servidor, a partir de uma semente de 128 bits que fica gravada na série. Aqui só se REVELA um
 * resultado que já existe.
 *
 * A distinção não é decorativa. Esta página já sorteou no navegador uma vez, com `Math.random()`,
 * e o resultado só depois ia para o banco — bastava girar até gostar. O pedido sai NO CLIQUE,
 * junto com a abertura; a peça começa a girar antes da resposta (giro livre, que não sabe de
 * nada), e só o FREIO conhece o resultado. Os `Math.random()` desta pasta pintam faísca e confete.
 *
 * O roteiro (show completo):
 *
 *   0 ms      abertura — os escudos/o baralho entram, grave de cinema, brasas
 *   1,6 s     3 · 2 · 1 — batida de coração, a nota sobe a cada número
 *   3,8 s     VAI! — pancada, a peça arranca (giro livre + rufar)
 *   ≥ 1,8 s   de giro livre E resposta em mãos → o freio (contínuo, sem tranco) até a fatia
 *   fim       trava → clarão, onda de choque, faíscas, confete, o resultado batendo na tela
 *
 * REGRA DA CASA, que já custou o site em branco quatro vezes: nenhuma animação decide se o
 * conteúdo é visível. Nome, escudo, carta, letras e semente nascem opacos e só animam transform;
 * o fim do freio é carimbado por relógio (ver `useRotor`), então o resultado aparece mesmo com
 * a aba atrás do OBS e o `requestAnimationFrame` parado.
 *
 * As travas que NÃO podem voltar (cada uma já custou caro):
 *  - um clique, um sorteio: o pai remonta esta tela por `key` a cada clique, e `pedidoEmCurso`
 *    guarda o pedido já enviado — o efeito pode recomeçar a encenação, nunca o POST (24 sorteios
 *    em 52 s, uma vez);
 *  - o efeito depende só de `[aberto, pedido, seriesId, limpar]`; o resto é lido de `ultimos`;
 *  - o resultado é aplicado na página ASSIM QUE CHEGA, mesmo que fechem a cerimônia no meio —
 *    senão a página mostrava "não sorteado" com o sorteio já gravado, e a organização sorteava
 *    de novo por cima.
 */

// ---------------------------------------------------------------- tipos

/**
 * O que o operador pediu. `ensaio` (o número do ensaio) liga o ENSAIO TÉCNICO: a cerimônia
 * completa com um resultado de demonstração, SEM pedido ao servidor e sem tocar na página — para
 * calibrar OBS, som e desempenho antes de entrar no ar sem sujar o histórico (que é só de
 * inclusão e acusaria "sorteio repetido").
 */
export type PedidoDeSorteio = (
  | { tipo: "lados" }
  | { tipo: "carta"; teamId: string; dupla?: false }
  | { tipo: "carta"; teamId?: undefined; dupla: true }
) & { ensaio?: number };

type Sorteio = Readonly<{
  tipo: string;
  semente: string;
  autor: string;
  resultado: string;
  detalhe?: { letras?: [string, string]; campeoes?: number };
}>;

export type RespostaSorteio = Readonly<{
  ok?: boolean;
  error?: string;
  ref?: string;
  sorteio?: Sorteio;
  blueSideTeamId?: string | null;
  cardsUsed?: ReadonlyArray<{ teamId: string; cardId: string; dupla?: boolean }>;
  vezes?: number;
}>;

export type TextosDaCerimonia = Readonly<{
  titulo: string;
  fechar: string;
  vai: string;
  ladoAzul: string;
  ladoVermelho: string;
  resultado: string;
  semente: string;
  porFulano: string;
  falhou: string;
  semConexao: string;
  semResposta: string;
  repetido: string;
  sorteando: string;
  frases: readonly string[];
  tituloLados: string;
  tituloCarta: string;
  tituloDupla: string;
  perguntaLados: string;
  jogo1: string;
  comecaNo: string;
  som: string;
  volumes: readonly string[];
  telaCheia: string;
  sairDaTelaCheia: string;
  reduzidoAviso: string;
  showCompleto: string;
  atalhos: string;
  /** Na tela cheia: com o Esc preso pela página (Chrome/Edge) e sem ele. */
  atalhosTelaCheia: string;
  atalhosTelaCheiaSemTrava: string;
  aoVivo: string;
  ensaioMarca: string;
  ensaioCreditos: string;
  /** Os dois letreiros de trailer da abertura, por tipo de sorteio. */
  letreirosLados: readonly string[];
  letreirosCarta: readonly string[];
  letreirosDupla: readonly string[];
  cartas: TextosDoPalcoDasCartas;
}>;

type Fase =
  | { nome: "abertura" }
  | { nome: "contagem"; numero: number }
  | { nome: "vai" }
  | { nome: "girando" }
  | { nome: "freando" }
  | { nome: "revelado"; resposta: RespostaSorteio }
  | { nome: "erro"; titulo: string; mensagem: string };

class ErroDeSorteio extends Error {
  constructor(
    mensagem: string,
    readonly rede: boolean,
  ) {
    super(mensagem);
  }
}

// ---------------------------------------------------------------- tempos da encenação

/** Os escudos (ou o baralho) entram e respiram antes da contagem. */
const ABERTURA_MS = 1900;
/** Os dois letreiros de trailer dentro da abertura ("DOIS TIMES." → "UM SÓ LADO AZUL."). */
const LETREIRO_1_MS = 120;
const LETREIRO_2_MS = 880;
/** Cada número da contagem. */
const CONTAGEM_MS = 720;
/** Quanto tempo o "VAI!" fica na tela. */
const VAI_MS = 900;
/** Piso de giro livre, contado do VAI! — mesmo com resposta em 80 ms, a peça gira isto antes de frear. */
const GIRO_MINIMO_MS = 1800;
/** A freada: mais cartas, mais suspense. */
const FREIO_LADOS_MS = 3600;
const FREIO_CARTAS_MS = 3900;
/** O tremor entra na reta final da freada — antes disso ninguém está tenso ainda. */
const TREMOR_ANTES_DO_FIM_MS = 900;
/** Sem resposta depois disto: avisa que o sorteio PODE ter sido gravado (o pedido segue vivo). */
const SEM_RESPOSTA_MS = 20000;
/** A segunda batida da revelação dos lados (o vermelho), depois do azul. */
const SEGUNDA_BATIDA_MS = 680;

/** Lados: 6 fatias de 60° → ~9 tiques/s no giro livre, e a peça nunca "anda de ré" na câmera. */
const GIRO_DOS_LADOS = { velocidade: 0.55, arranqueMs: 700 } as const;
/** Cartas: ~1,1 volta/s — dá para ler a letra que passa pela frente. */
const GIRO_DAS_CARTAS = { velocidade: 0.4, arranqueMs: 800 } as const;

const OURO = ["#f0c88a", "#ffe2a8", "#e8b878", "#fff4dc"];

// ---------------------------------------------------------------- a cerimônia

export function CerimoniaDeSorteio({
  aberto,
  pedido,
  onFechar,
  onSorteado,
  seriesId,
  timeA,
  timeB,
  t,
  textosDasCartas,
  showCompleto,
  onShowCompleto,
  degrau,
  onProximoVolume: proximoVolume,
  onAlternarMudo: alternarMudo,
  onIncerto,
}: Readonly<{
  aberto: boolean;
  pedido: PedidoDeSorteio | null;
  onFechar: () => void;
  onSorteado: (resposta: RespostaSorteio) => void;
  seriesId: string;
  timeA: TimeDoShow;
  timeB: TimeDoShow;
  t: TextosDaCerimonia;
  textosDasCartas: Readonly<Record<string, TextoDaCarta>>;
  /**
   * O operador pediu o show completo mesmo com "reduzir movimento" no sistema. Vem da ARENA, que
   * está montada desde o carregamento: lido aqui, depois de montar, o 1º sorteio da página já
   * teria escolhido a versão calma quando a preferência chegasse.
   */
  showCompleto: boolean;
  onShowCompleto: (ligado: boolean) => void;
  /** O degrau de volume (DEGRAUS_DE_VOLUME), da arena — o mesmo do «Testar som». */
  degrau: number;
  onProximoVolume: () => void;
  onAlternarMudo: () => void;
  /**
   * O pedido falhou sem resposta conclusiva (rede, gateway, corpo ilegível): o sorteio PODE estar
   * gravado. A arena atualiza a página ao fechar, para mostrar o que o servidor tem de fato.
   */
  onIncerto?: () => void;
}>) {
  const [fase, setFase] = useState<Fase>({ nome: "abertura" });
  const [tremor, setTremor] = useState<"nenhum" | "freio" | "impacto">("nenhum");
  const [clarao, setClarao] = useState(0);
  const [frase, setFrase] = useState(0);
  const [demorou, setDemorou] = useState(false);
  /** Qual letreiro de trailer está na tela na abertura (0 = nenhum). */
  const [letreiro, setLetreiro] = useState(0);

  const reduzidoDoSistema = useMovimentoReduzidoDoSistema();
  const reduzido = reduzidoDoSistema && !showCompleto;
  const [telaCheia, alternarTelaCheia] = useTelaCheia();

  const raiz = useRef<HTMLDivElement | null>(null);
  const palco = useRef<ApiDoPalco | null>(null);
  const faiscas = useRef<ApiFaiscas | null>(null);
  const som = useRef<SomDaCerimonia | null>(null);
  const rufar = useRef<RufarEmCurso | null>(null);
  const relogios = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalos = useRef<ReturnType<typeof setInterval>[]>([]);
  const rodada = useRef(0);
  /**
   * O pedido que já foi ao servidor, com a promessa da resposta. Impede o mesmo clique virar
   * dois registros — inclusive quando o React reexecuta o efeito (StrictMode, em
   * desenvolvimento, monta, desmonta e remonta todo efeito): a ENCENAÇÃO recomeça, o pedido não.
   */
  const pedidoEmCurso = useRef<{ pedido: PedidoDeSorteio; promessa: Promise<RespostaSorteio> } | null>(null);
  /** O que fazer quando o freio terminar (revelar a resposta desta rodada). */
  const aoPararDoFreio = useRef<(() => void) | null>(null);

  const tipo = pedido?.tipo ?? "lados";
  const dupla = pedido?.tipo === "carta" && pedido.dupla === true;
  const donoId = pedido?.tipo === "carta" && pedido.dupla !== true ? pedido.teamId : undefined;

  /*
   * O baralho de AGORA, memoizado por PRIMITIVOS. Depender de objetos (times, textos) já custou
   * caro: `router.refresh()` devolve objetos novos com os mesmos dados, o memo recalculava, o
   * efeito via dependência nova e sorteava OUTRA VEZ.
   */
  const baralho: readonly CardDef[] = useMemo(() => (tipo === "carta" ? baralhoDoSorteio(dupla) : []), [tipo, dupla]);
  const total = tipo === "lados" ? TOTAL_DOS_LADOS : Math.max(1, baralho.length);

  const rotor = useRotor({
    giro: tipo === "lados" ? GIRO_DOS_LADOS : GIRO_DAS_CARTAS,
    total,
    anguloInicial: tipo === "lados" ? POSE_INICIAL_DOS_LADOS : 0,
    aplicar: (angulo) => palco.current?.pose(angulo),
    aoCruzar: (velocidade) => {
      palco.current?.tique();
      som.current?.tique(velocidade);
    },
    aoParar: () => aoPararDoFreio.current?.(),
  });

  /** As fatias que valem a resposta: as 3 do time azul (lados) ou a carta sorteada. */
  const candidatos = useCallback(
    (resposta: RespostaSorteio): number[] => {
      const resultado = resposta.sorteio?.resultado;
      if (tipo === "lados") {
        const azul = resposta.blueSideTeamId ?? resultado;
        const par = azul === timeA.id ? 0 : azul === timeB.id ? 1 : -1;
        if (par < 0) return [];
        return Array.from({ length: TOTAL_DOS_LADOS }, (_, i) => i).filter((i) => i % 2 === par);
      }
      const i = baralho.findIndex((c) => c.cardId === resultado);
      return i < 0 ? [] : [i];
    },
    [tipo, timeA.id, timeB.id, baralho],
  );

  /*
   * O que o sorteio LÊ mas que não pode reiniciá-lo. Um efeito que dependesse de callback e de
   * texto reiniciaria a cada render do pai — e reiniciar aqui não é cosmético: a limpeza mata os
   * relógios no meio do giro E o efeito dispara outro sorteio. Este efeito sem dependências
   * roda depois de todo render e mantém as referências frescas (declarado ANTES do efeito do
   * sorteio, para o React rodá-lo primeiro).
   */
  const volumeAtual = DEGRAUS_DE_VOLUME[degrau] ?? 0.65;
  const ultimos = useRef({ onSorteado, onIncerto, t, reduzido, candidatos, rotor, volume: volumeAtual, timeA, timeB, baralho });
  useEffect(() => {
    ultimos.current = { onSorteado, onIncerto, t, reduzido, candidatos, rotor, volume: volumeAtual, timeA, timeB, baralho };
  });

  const limpar = useCallback(() => {
    relogios.current.forEach(clearTimeout);
    intervalos.current.forEach(clearInterval);
    relogios.current = [];
    intervalos.current = [];
  }, []);

  const marcar = (f: () => void, ms: number) => {
    relogios.current.push(setTimeout(f, ms));
  };

  const fechar = useCallback(() => {
    rodada.current += 1;
    pedidoEmCurso.current = null;
    aoPararDoFreio.current = null;
    limpar();
    ultimos.current.rotor.parar();
    rufar.current?.parar();
    rufar.current = null;
    faiscas.current?.limpar();
    som.current?.fechar();
    som.current = null;
    onFechar();
  }, [limpar, onFechar]);

  // O volume acompanha o botão (e a tecla M) na hora, com a cerimônia rodando.
  useEffect(() => {
    som.current?.volume(DEGRAUS_DE_VOLUME[degrau] ?? 0.65);
  }, [degrau]);

  // Teclado: Esc fecha, F tela cheia, M mudo. Nenhuma tecla sorteia.
  useEffect(() => {
    if (!aberto) return;
    const naTecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        e.stopPropagation();
        fechar();
      } else if (e.key === "f" || e.key === "F") {
        alternarTelaCheia();
      } else if (e.key === "m" || e.key === "M") {
        alternarMudo();
      }
    };
    window.addEventListener("keydown", naTecla, true);
    return () => window.removeEventListener("keydown", naTecla, true);
  }, [aberto, fechar, alternarTelaCheia, alternarMudo]);

  /*
   * Show completo com "reduzir movimento" no sistema: a regra global de movimento reduzido
   * (app/globals.css) só vale em `html:not([data-show-completo])`. O atributo existe SÓ enquanto
   * a cerimônia está aberta e o operador pediu o show — o resto do site segue a preferência.
   */
  useEffect(() => {
    if (!aberto || !reduzidoDoSistema || !showCompleto) return;
    const raizDoSite = document.documentElement;
    raizDoSite.setAttribute("data-show-completo", "");
    return () => raizDoSite.removeAttribute("data-show-completo");
  }, [aberto, reduzidoDoSistema, showCompleto]);

  // Foco no palco ao abrir (leitor de tela e teclado não ficam atrás), e de volta ao fechar;
  // a página de baixo não rola enquanto o show está no ar.
  useEffect(() => {
    if (!aberto) return;
    const antes = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    // `aria-modal` não prende o foco sozinho: com Shift+Tab o operador chegava aos botões da arena
    // por trás do palco (e Enter abria um ENSAIO por cima do sorteio real). O resto do <body> fica
    // inerte enquanto a cerimônia está no ar.
    const inertes = Array.from(document.body.children).filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== raiz.current && !el.hasAttribute("inert"),
    );
    for (const el of inertes) el.setAttribute("inert", "");
    raiz.current?.focus();
    return () => {
      for (const el of inertes) el.removeAttribute("inert");
      document.documentElement.style.overflow = overflow;
      if (antes?.isConnected) antes.focus();
    };
  }, [aberto]);

  useEffect(() => limpar, [limpar]);

  /*
   * Desmontou sem passar por `fechar()` (navegação no meio do show, remontagem): o rufar é um laço
   * sem hora para acabar e o contexto de áudio segue vivo — tocariam na página seguinte e no OBS.
   */
  useEffect(
    () => () => {
      rufar.current?.parar();
      rufar.current = null;
      som.current?.fechar();
      som.current = null;
    },
    [],
  );

  /* ------------------------------------------------------------ o sorteio */

  useEffect(() => {
    if (!aberto || !pedido) return;

    const { reduzido: calmo, t: textos } = ultimos.current;
    const ehLados = pedido.tipo === "lados";
    const ehDupla = pedido.tipo === "carta" && pedido.dupla === true;

    /*
     * UM CLIQUE, UM SORTEIO. O pedido sai uma vez por clique (o pai remonta esta tela por `key`
     * a cada clique, e cada clique é um objeto `pedido` novo) e fica guardado em
     * `pedidoEmCurso`. Se o efeito rodar de novo para o MESMO pedido — o StrictMode faz isso em
     * desenvolvimento —, a promessa guardada é reaproveitada: a encenação recomeça do zero, o
     * POST não sai de novo. "Provavelmente não reexecuta" não é garantia boa o bastante para
     * escrever no banco.
     */
    let emCurso = pedidoEmCurso.current;
    if (!emCurso || emCurso.pedido !== pedido) {
      /* O pedido ao servidor sai JUNTO com a abertura: quando o VAI! aparece, o resultado
         normalmente já chegou, e o suspense é encenação, não espera de rede. */
      const ensaio = pedido.ensaio;
      const promessa = (async (): Promise<RespostaSorteio> => {
        if (ensaio !== undefined) {
          // ENSAIO: nada sai daqui. Um resultado de demonstração chega como se fosse a rede.
          await new Promise((r) => setTimeout(r, 700));
          const { timeA: a, timeB: b } = ultimos.current;
          const semente = "ensaio";
          if (ehLados) {
            const azul = ensaio % 2 === 0 ? a.id : b.id;
            return { ok: true, vezes: 1, blueSideTeamId: azul, sorteio: { tipo: "lados", semente, autor: "ensaio", resultado: azul } };
          }
          return ehDupla
            ? { ok: true, vezes: 1, sorteio: { tipo: "carta", semente, autor: "ensaio", resultado: "AMIGOS_NATUREZA" } }
            : { ok: true, vezes: 1, sorteio: { tipo: "carta", semente, autor: "ensaio", resultado: "ABCDRAFT", detalhe: { letras: ["L", "M"] } } };
        }
        const corpo = ehLados
          ? { seriesId, tipo: "lados" }
          : { seriesId, tipo: "carta", teamId: ehDupla ? undefined : pedido.teamId, dupla: ehDupla };
        let r: Response;
        try {
          r = await fetch("/api/admin/series/sorteio", {
            method: "POST",
            credentials: "same-origin",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(corpo),
          });
        } catch {
          // A conexão caiu: o servidor pode ter gravado. NÃO dizer "nada foi gravado".
          throw new ErroDeSorteio(textos.semConexao, true);
        }
        let legivel = true;
        const dados = (await r.json().catch(() => {
          legivel = false;
          return null;
        })) as RespostaSorteio | null;
        if (r.ok && dados?.sorteio) return dados;
        /*
         * "Nada foi gravado" SÓ quando a rota recusou com o JSON `{ error }` dela (403, 409…): ela
         * decide antes de gravar. Um 200 com corpo ilegível (a conexão caiu no meio da resposta)
         * quer dizer que o sorteio JÁ ESTÁ no banco, e um 502/504 do gateway não garante nada —
         * os dois viram "PODE ter sido gravado", senão a organização sorteia de novo por cima.
         */
        if (!r.ok && legivel && typeof dados?.error === "string") {
          const ref = dados.ref ? ` (ref ${dados.ref})` : "";
          throw new ErroDeSorteio(`${dados.error}${ref}`, false);
        }
        throw new ErroDeSorteio(textos.semConexao, true);
      })();
      promessa.catch(() => {});

      /*
       * O RESULTADO É APLICADO NA PÁGINA ASSIM QUE CHEGA, fora da encenação. O servidor grava
       * antes de responder; fechar a cerimônia no meio (✕ ou Esc) não pode fazer a página
       * esquecer um sorteio que já está no banco. Preso à promessa, roda UMA vez por pedido.
       */
      // (No ensaio, nada é aplicado: a página continua exatamente como estava.)
      if (ensaio === undefined) void promessa.then((resposta) => ultimos.current.onSorteado(resposta), () => {});

      emCurso = { pedido, promessa };
      pedidoEmCurso.current = emCurso;
    }

    // O contexto de áudio nasce aqui: este efeito vem do clique que abriu a cerimônia — a única
    // janela em que o navegador deixa tocar som. Fora do ramo do pedido: se o StrictMode desmontou
    // (e fechou o som), a 2ª montagem recria o contexto sem repetir o POST.
    if (!som.current) som.current = criarSomDaCerimonia(ultimos.current.volume);
    if (!calmo) som.current?.abertura();
    const promessa = emCurso.promessa;

    rodada.current += 1;
    const minha = rodada.current;
    limpar();

    let resposta: RespostaSorteio | null = null;
    let girando = false;
    let girouEm = 0;

    const efeitosDaRevelacao = (r: RespostaSorteio) => {
      const tom: TomDoResultado = ehLados ? "azul" : ehDupla ? "dupla" : "carta";
      som.current?.revelar(tom);
      if (calmo) return;
      setClarao((n) => n + 1);
      setTremor("impacto");
      marcar(() => setTremor("nenhum"), 520);
      const fx = faiscas.current;
      if (!fx) return;
      if (ehLados) {
        const { timeA: a, timeB: b } = ultimos.current;
        const azul = (r.blueSideTeamId ?? r.sorteio?.resultado) === b.id ? b : a;
        const vermelho = azul.id === a.id ? b : a;
        fx.explosao({ x: 0.27, y: 0.46, cores: ["#4d9bff", "#c7e1ff", "#ffffff", azul.neon], quantidade: 170, forca: 1.15 });
        fx.onda({ x: 0.27, y: 0.46, cor: "#4d9bff", espessura: 8 });
        marcar(() => {
          som.current?.revelar("vermelho");
          fx.explosao({ x: 0.73, y: 0.46, cores: ["#ff5d5d", "#ffc9c9", "#ffffff", vermelho.neon], quantidade: 170, forca: 1.15 });
          fx.onda({ x: 0.73, y: 0.46, cor: "#ff5d5d", espessura: 8 });
          setClarao((n) => n + 1);
        }, SEGUNDA_BATIDA_MS);
        marcar(() => fx.confete({ cores: ["#4d9bff", "#ff5d5d", azul.cor, vermelho.cor, ...OURO], quantidade: 170 }), 300);
        fx.brasas({ cores: [azul.neon, vermelho.neon, "#f0c88a"], porSegundo: 14 });
      } else {
        const carta = CARDS_BY_ID[r.sorteio?.resultado as CardId];
        const cor = carta?.color ?? "#f0c88a";
        fx.explosao({ x: 0.5, y: 0.45, cores: [cor, "#ffffff", ...OURO], quantidade: 220, forca: 1.25 });
        fx.onda({ x: 0.5, y: 0.45, cor, espessura: 9, duracao: 0.9 });
        marcar(() => fx.onda({ x: 0.5, y: 0.45, cor: "#fff4dc", espessura: 4, duracao: 1.1 }), 140);
        marcar(() => fx.confete({ cores: [cor, ...OURO, "#ffffff"], quantidade: ehDupla ? 220 : 160 }), 380);
        fx.brasas({ cores: [cor, "#f0c88a"], porSegundo: 16 });
      }
    };

    const revelar = (r: RespostaSorteio) => {
      if (rodada.current !== minha) return;
      aoPararDoFreio.current = null;
      intervalos.current.forEach(clearInterval);
      intervalos.current = [];
      rufar.current?.parar();
      rufar.current = null;
      setDemorou(false);
      setFase({ nome: "revelado", resposta: r });
      efeitosDaRevelacao(r);
    };

    const freiarQuandoPuder = () => {
      if (rodada.current !== minha || !resposta || !girando) return;
      const falta = GIRO_MINIMO_MS - (performance.now() - girouEm);
      if (falta > 0) {
        marcar(freiarQuandoPuder, falta);
        return;
      }
      const r = resposta;
      const indices = ultimos.current.candidatos(r);
      /* Resultado fora da peça (baralho do servidor diferente do desta tela) NÃO pode virar
         "para numa fatia parecida e finge": revela direto, sem freio. */
      if (indices.length === 0) {
        ultimos.current.rotor.parar();
        revelar(r);
        return;
      }
      aoPararDoFreio.current = () => revelar(r);
      const freio = ultimos.current.rotor.freiar(indices, ehLados ? TOTAL_DOS_LADOS : ultimos.current.baralho.length, ehLados ? FREIO_LADOS_MS : FREIO_CARTAS_MS);
      rufar.current?.desacelerar(freio.duracao);
      setFase({ nome: "freando" });
      marcar(() => {
        if (rodada.current === minha) setTremor("freio");
      }, Math.max(0, freio.duracao - TREMOR_ANTES_DO_FIM_MS));
      // O coração nas últimas fatias: três batidas, cada vez mais fortes, até o silêncio.
      [
        [900, 0.6],
        [540, 0.8],
        [240, 1],
      ].forEach(([antes, forca]) => {
        marcar(() => {
          if (rodada.current === minha) som.current?.coracao(forca);
        }, Math.max(0, freio.duracao - antes!));
      });
    };

    const falhar = (erro: unknown) => {
      if (rodada.current !== minha) return;
      limpar();
      aoPararDoFreio.current = null;
      ultimos.current.rotor.parar();
      rufar.current?.parar();
      rufar.current = null;
      faiscas.current?.brasas(null);
      setTremor("nenhum");
      setDemorou(false);
      const rede = erro instanceof ErroDeSorteio && erro.rede;
      if (rede) ultimos.current.onIncerto?.();
      setFase({
        nome: "erro",
        titulo: rede ? textos.semConexao : textos.falhou,
        mensagem: rede ? "" : erro instanceof Error ? erro.message : "",
      });
      som.current?.fracasso();
    };

    void promessa.then(
      (r) => {
        if (rodada.current !== minha) return;
        resposta = r;
        if (calmo) {
          // Versão calma: sem giro. A peça vai direto à fatia e o resultado monta inteiro.
          const indices = ultimos.current.candidatos(r);
          if (indices.length > 0) ultimos.current.rotor.saltar(indices[0]!, ehLados ? TOTAL_DOS_LADOS : ultimos.current.baralho.length);
          revelar(r);
          return;
        }
        freiarQuandoPuder();
      },
      (erro: unknown) => falhar(erro),
    );

    // Demorou demais: o pedido segue vivo (se a resposta chegar, ela aplica e revela), mas a
    // organização precisa saber que o sorteio PODE ter sido gravado.
    marcar(() => {
      if (rodada.current === minha && !resposta) setDemorou(true);
    }, SEM_RESPOSTA_MS);

    if (calmo) {
      // Versão calma: a abertura fica parada com "Sorteando…" até a resposta (ver o render).
      return () => {
        rodada.current += 1;
        limpar();
      };
    }

    faiscas.current?.brasas({ cores: OURO, porSegundo: 10 });

    // Os letreiros de trailer: batem no grave, um depois do outro, antes da contagem.
    marcar(() => {
      if (rodada.current !== minha) return;
      setLetreiro(1);
      som.current?.letreiro(0);
    }, LETREIRO_1_MS);
    marcar(() => {
      if (rodada.current !== minha) return;
      setLetreiro(2);
      som.current?.letreiro(1);
    }, LETREIRO_2_MS);

    // 3 · 2 · 1 · VAI!
    [3, 2, 1].forEach((numero, i) => {
      marcar(() => {
        if (rodada.current !== minha) return;
        setFase((f) => (f.nome === "erro" ? f : { nome: "contagem", numero }));
        som.current?.contagem(numero);
      }, ABERTURA_MS + i * CONTAGEM_MS);
    });

    marcar(() => {
      if (rodada.current !== minha) return;
      setFase((f) => (f.nome === "erro" ? f : { nome: "vai" }));
      som.current?.vai();
      faiscas.current?.onda({ x: 0.5, y: 0.46, cor: "#ffe2a8", espessura: 6, duracao: 0.7 });
      faiscas.current?.brasas({ cores: OURO, porSegundo: 26 });
      ultimos.current.rotor.girar();
      rufar.current = som.current?.rufar() ?? null;
      girando = true;
      girouEm = performance.now();
      intervalos.current.push(setInterval(() => setFrase((n) => n + 1), 1150));
      marcar(() => {
        if (rodada.current === minha) setFase((f) => (f.nome === "vai" ? { nome: "girando" } : f));
      }, VAI_MS);
      freiarQuandoPuder();
    }, ABERTURA_MS + 3 * CONTAGEM_MS);

    // Rodada nova: os relógios e as respostas desta encenação ficam sem efeito (fechar, ou o
    // StrictMode reexecutando o efeito — aí ele recomeça a encenação com a MESMA promessa).
    return () => {
      rodada.current += 1;
      limpar();
    };
  }, [aberto, pedido, seriesId, limpar]);

  if (!aberto || !pedido || typeof document === "undefined") return null;

  const revelacao = fase.nome === "revelado" ? fase.resposta : null;
  const sorteio = revelacao?.sorteio;
  const titulo = tipo === "lados" ? t.tituloLados : dupla ? t.tituloDupla : t.tituloCarta;
  const volume = DEGRAUS_DE_VOLUME[degrau] ?? 0.65;
  const IconeDoVolume = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const rotuloDoVolume = `${t.som}: ${t.volumes[degrau] ?? ""}`;

  const resultadoDaCarta: CardDef | null =
    sorteio && tipo === "carta" ? (CARDS_BY_ID[sorteio.resultado as CardId] ?? null) : null;
  const dono = donoId === timeB.id ? timeB : donoId === timeA.id ? timeA : null;
  const alvo = dono ? (dono.id === timeA.id ? timeB : timeA) : null;
  const mostraFrase = fase.nome === "girando" || fase.nome === "freando";

  /*
   * O resultado por extenso para leitor de tela. A região viva existe desde a abertura e só
   * ganha texto na revelação: uma região que nasce junto com o texto não é anunciada.
   */
  let anuncio = "";
  if (revelacao && sorteio) {
    if (tipo === "lados") {
      const azul = (revelacao.blueSideTeamId ?? sorteio.resultado) === timeB.id ? timeB : timeA;
      const vermelho = azul.id === timeA.id ? timeB : timeA;
      anuncio = `${azul.nome} ${t.comecaNo} ${t.ladoAzul}. ${vermelho.nome} ${t.comecaNo} ${t.ladoVermelho}.`;
    } else if (resultadoDaCarta) {
      const nome = textosDasCartas[resultadoDaCarta.cardId]?.nome ?? resultadoDaCarta.title;
      const letras = sorteio.detalhe?.letras;
      anuncio = `${t.resultado}: ${nome}${dono ? ` (${dono.nome})` : ""}${letras ? ` — ${letras.join(" · ")}` : ""}.`;
    }
  }
  const atalhos = telaCheia ? (podePrenderEsc() ? t.atalhosTelaCheia : t.atalhosTelaCheiaSemTrava) : t.atalhos;

  return createPortal(
    <div
      ref={raiz}
      role="dialog"
      aria-modal="true"
      aria-label={t.titulo}
      tabIndex={-1}
      data-fase={fase.nome}
      data-reduzido={reduzido ? "" : undefined}
      className={s.palco}
      // Fundo OPACO e na faixa de cerimônia (9000) da escala de z-index de site-frame.tsx: a
      // cerimônia toma a tela, não flutua sobre a página. Inline de propósito (o teste confere).
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "#0b0804" }}
    >
      <div aria-hidden className={s.enfFundo} />
      <p className="sr-only" role="status" aria-live="polite">
        {anuncio}
      </p>

      {/* ---------------------------------------------------------- barra do operador */}
      <div className={s.barra}>
        {/* ENSAIO: o selo de "ao vivo" vira a marca do ensaio (e a marca d'água fica na cena) —
            ninguém confunde com um sorteio de verdade, e a cena tem o MESMO enquadramento do
            show real (uma faixa a mais empurrava o resultado para fora da tela). */}
        {pedido.ensaio !== undefined ? (
          <span className={`${s.selo} ${s.seloEnsaio}`}>
            <span aria-hidden className={s.enfPontoEnsaio} />
            <span className={s.seloTexto}>{t.ensaioMarca}</span>
          </span>
        ) : (
          <span className={s.selo}>
            <span aria-hidden className={s.enfPontoAoVivo} />
            <span className={s.seloTexto}>{t.aoVivo}</span>
          </span>
        )}
        <span className={s.tituloDaBarra}>{titulo}</span>
        <span className={s.confronto}>
          {timeA.nome} × {timeB.nome}
        </span>
        <span className={s.botoes}>
          {/* Movimento reduzido no sistema e show calmo: o atalho para o show completo fica na
              barra (a explicação inteira está no painel da arena e no título do botão). */}
          {reduzidoDoSistema && !showCompleto ? (
            <button
              type="button"
              className={`${s.botao} ${s.botaoAlerta}`}
              onClick={() => onShowCompleto(true)}
              aria-label={t.showCompleto}
              title={t.reduzidoAviso}
            >
              <Sparkles aria-hidden />
              <span className={s.rotuloDoBotao}>{t.showCompleto}</span>
            </button>
          ) : null}
          <button type="button" className={s.botao} onClick={proximoVolume} aria-label={rotuloDoVolume} title={rotuloDoVolume}>
            <IconeDoVolume aria-hidden />
            <span className={s.rotuloDoBotao}>{t.volumes[degrau]}</span>
          </button>
          <button
            type="button"
            className={s.botao}
            onClick={alternarTelaCheia}
            aria-pressed={telaCheia}
            aria-label={telaCheia ? t.sairDaTelaCheia : t.telaCheia}
            title={telaCheia ? t.sairDaTelaCheia : t.telaCheia}
          >
            {telaCheia ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            <span className={s.rotuloDoBotao}>{telaCheia ? t.sairDaTelaCheia : t.telaCheia}</span>
          </button>
          <button type="button" className={s.botao} onClick={fechar} aria-label={t.fechar} title={`${t.fechar} (Esc)`}>
            <X aria-hidden />
            <span className={s.rotuloDoBotao}>{t.fechar}</span>
          </button>
        </span>
      </div>

      {/* ---------------------------------------------------------- a cena */}
      <div className={`${s.cena} ${tremor === "freio" ? s.tremendoFreio : tremor === "impacto" ? s.tremendo : ""}`}>
        <span aria-hidden className={s.enfHolofotes} />
        <span aria-hidden className={s.enfGrade} />
        <span aria-hidden className={s.enfVinheta} />
        {pedido.ensaio !== undefined ? (
          <p aria-hidden className={s.marcaDoEnsaio}>
            {t.ensaioMarca}
          </p>
        ) : null}

        {tipo === "lados" ? (
          <PalcoDosLados
            apiRef={palco}
            timeA={timeA}
            timeB={timeB}
            fase={fase.nome}
            azulId={revelacao ? (revelacao.blueSideTeamId ?? sorteio?.resultado ?? null) : null}
            textos={{ ladoAzul: t.ladoAzul, ladoVermelho: t.ladoVermelho, comecaNo: t.comecaNo, pergunta: t.perguntaLados, jogo1: t.jogo1 }}
          />
        ) : (
          <PalcoDasCartas
            apiRef={palco}
            baralho={baralho}
            textosDasCartas={textosDasCartas}
            dono={dono}
            alvo={alvo}
            dupla={dupla ? [timeA, timeB] : null}
            fase={fase.nome}
            resultado={resultadoDaCarta}
            letras={sorteio?.detalhe?.letras ?? null}
            campeoes={typeof sorteio?.detalhe?.campeoes === "number" ? sorteio.detalhe.campeoes : null}
            textos={t.cartas}
          />
        )}

        {/* As tarjas de cinema batem na abertura e saem no VAI! (enfeite). */}
        {!reduzido && (fase.nome === "abertura" || fase.nome === "contagem") ? (
          <>
            <span aria-hidden className={`${s.enfTarja} ${s.enfTarjaCima}`} />
            <span aria-hidden className={`${s.enfTarja} ${s.enfTarjaBaixo}`} />
          </>
        ) : null}
        {!reduzido && fase.nome === "abertura" && letreiro > 0 ? (
          <div className={s.letreiro}>
            <p key={letreiro} className={s.letreiroTexto}>
              {(tipo === "lados" ? t.letreirosLados : dupla ? t.letreirosDupla : t.letreirosCarta)[letreiro - 1]}
            </p>
          </div>
        ) : null}

        {fase.nome === "contagem" ? (
          <p className={s.contagem}>
            <span key={fase.numero} className={s.numero}>
              {fase.numero}
            </span>
          </p>
        ) : null}
        {fase.nome === "vai" ? (
          <p className={s.contagem}>
            <span className={s.vai}>{t.vai}</span>
          </p>
        ) : null}

        {mostraFrase && !reduzido ? (
          <p key={frase} className={s.frase}>
            {t.frases[frase % Math.max(1, t.frases.length)]}
          </p>
        ) : null}
        {fase.nome === "abertura" && reduzido ? <p className={s.frase}>{t.sorteando}</p> : null}
        {demorou && fase.nome !== "revelado" && fase.nome !== "erro" ? <p className={s.demora}>{t.semResposta}</p> : null}

        {fase.nome === "erro" ? (
          <div className={s.erro} role="alert">
            <p className={s.erroTitulo}>{fase.titulo}</p>
            {fase.mensagem ? <p className={s.erroTexto}>{fase.mensagem}</p> : null}
            <button type="button" className={s.fechar} onClick={fechar}>
              {t.fechar}
            </button>
          </div>
        ) : null}

        {/* ---------------------------------------------------------- créditos (auditoria) */}
        {revelacao && sorteio ? (
          <div className={`${s.rodape} ${tipo === "lados" ? s.rodapeLados : ""}`}>
            {(revelacao.vezes ?? 1) > 1 ? <p className={s.repetido}>{t.repetido}</p> : null}
            {/* A semente fica na tela: quem quiser conferir depois consegue. (No ensaio não há.) */}
            {pedido.ensaio !== undefined ? (
              <p className={s.semente}>{t.ensaioCreditos}</p>
            ) : (
              <p className={s.semente}>
                {t.semente}: <span>{sorteio.semente}</span> · {t.porFulano} <span>{sorteio.autor}</span>
              </p>
            )}
            <button type="button" className={s.fechar} onClick={fechar}>
              {t.fechar}
            </button>
          </div>
        ) : null}

        {clarao > 0 && !reduzido ? <span key={clarao} aria-hidden className={s.enfFlash} /> : null}
      </div>

      <div aria-hidden className={s.camadaDeFaiscas}>
        <Faiscas ref={faiscas} reduzido={reduzido} />
      </div>

      {!reduzido ? <p className={s.atalhos}>{atalhos}</p> : null}
    </div>,
    document.body,
  );
}
