"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { ligarInclinacao } from "@/components/lob/inclinacao";
import { Faiscas, type ApiFaiscas } from "@/components/series/faiscas";
import type { TextosDaForja } from "@/lib/i18n/messages/forja";
import type { TextosStats } from "@/lib/i18n/messages/paginas-stats";
import type { DadosDaForja } from "@/lib/stats/forja";
import { VOLUME_PADRAO, criarSomDaForja, tocarEfeito, type SomDaForja } from "@/lib/stats/som-da-forja";

import { COOKIE_DO_SOM, type PedidoDeVs } from "./constantes";
import { Diretor, type RetratoDoDiretor } from "./diretor";
import s from "./forja.module.css";

/**
 * O PROVEDOR DA FORJA — a parte da /stats que só existe no navegador: o diretor da rolagem, o
 * som, as faíscas de tela, os atalhos e o que abre o holofote e o modo VS.
 *
 * Os atos chegam como `children`, renderizados no SERVIDOR: o HTML já vem com todo texto e todo
 * número. Aqui ninguém redesenha o conteúdo — o diretor só liga atributos e variáveis CSS nele.
 */

const CHAVE_DO_VOLUME = "lob-stats-volume";

export type TextosDaTela = Readonly<{
  f: TextosDaForja;
  s: TextosStats;
  localeTag: string;
}>;

type Contexto = Readonly<{
  dados: DadosDaForja;
  t: TextosDaTela;
  /** A classe da fonte do tema de cada time (next/font), por id do time. */
  fontes: Readonly<Record<string, string>>;
  diretor: Diretor;
  som: Readonly<{
    ligado: boolean;
    /** O navegador já liberou o áudio (houve um gesto). */
    desbloqueado: boolean;
    volume: number;
    alternar: () => void;
    ligar: (ligado: boolean) => void;
    definirVolume: (v: number) => void;
    /** Toca um efeito, se houver som. Nunca lança. */
    tocar: (f: (som: SomDaForja) => void) => void;
  }>;
  faiscas: () => ApiFaiscas | null;
  holofote: Readonly<{ aberto: string | null; lista: readonly string[]; abrir: (slug: string, origem?: Element | null) => void; fechar: () => void }>;
  versus: Readonly<{ pedido: PedidoDeVs | null; abrir: (pedido?: PedidoDeVs) => void; fechar: () => void }>;
  /** Alguma camada cheia está aberta (porta, holofote, VS): os atalhos de ato ficam em espera. */
  ocupado: boolean;
  definirPortaFechada: (fechada: boolean) => void;
}>;

const ContextoDaForja = createContext<Contexto | null>(null);

export function useForja(): Contexto {
  const ctx = useContext(ContextoDaForja);
  if (!ctx) throw new Error("useForja fora do <Forja>");
  return ctx;
}

/** O retrato do diretor (ato atual, modo) para o painel de bordo. */
export function useRetratoDoDiretor(): RetratoDoDiretor {
  const { diretor } = useForja();
  return useSyncExternalStore(diretor.assinar, diretor.retrato, diretor.retrato);
}

function gravarCookie(ligado: boolean) {
  try {
    document.cookie = `${COOKIE_DO_SOM}=${ligado ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* sem cookie: a escolha vale só nesta visita */
  }
}

/*
 * O volume mora no `localStorage` (conveniência de UM navegador). É lido como fonte externa
 * (`useSyncExternalStore`): no servidor e na hidratação vale o padrão, e logo depois o salvo.
 */
const ouvintesDoVolume = new Set<() => void>();
function assinarVolume(f: () => void): () => void {
  ouvintesDoVolume.add(f);
  return () => ouvintesDoVolume.delete(f);
}
function lerVolume(): number {
  try {
    const texto = window.localStorage.getItem(CHAVE_DO_VOLUME);
    const v = texto === null || texto === "" ? Number.NaN : Number(texto);
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : VOLUME_PADRAO;
  } catch {
    return VOLUME_PADRAO;
  }
}
function gravarVolume(v: number) {
  try {
    window.localStorage.setItem(CHAVE_DO_VOLUME, String(v));
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  for (const f of ouvintesDoVolume) f();
}
const volumeDoServidor = () => VOLUME_PADRAO;

/** Elemento em que digitar ou usar setas é do próprio controle, não atalho da página. */
function ehCampo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  if (alvo.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
}

export function Forja({
  dados,
  t,
  fontes,
  somInicial,
  vsInicial,
  portaFechada,
  children,
  camadas,
}: Readonly<{
  dados: DadosDaForja;
  t: TextosDaTela;
  fontes: Readonly<Record<string, string>>;
  /** A escolha lembrada no cookie; null na primeira visita (a porta decide). */
  somInicial: boolean | null;
  /** O `?vs=` do endereço, já lido no servidor (o link que o caster abre antes da partida). */
  vsInicial: PedidoDeVs | null;
  /** A porta da fornalha veio no HTML (primeira visita): a página começa atrás dela. */
  portaFechada: boolean;
  /** Os atos, renderizados no servidor. */
  children: ReactNode;
  /** As camadas do cliente que moram por cima dos atos (fundo, painel, holofote, VS, porta). */
  camadas?: ReactNode;
}>) {
  const raiz = useRef<HTMLDivElement | null>(null);
  const apiFaiscas = useRef<ApiFaiscas | null>(null);
  const instanciaDoSom = useRef<SomDaForja | null>(null);
  const [diretor] = useState(() => new Diretor());

  const [ligado, setLigado] = useState(somInicial === true);
  const [desbloqueado, setDesbloqueado] = useState(false);
  const volume = useSyncExternalStore(assinarVolume, lerVolume, volumeDoServidor);
  const [holofoteAberto, setHolofoteAberto] = useState<string | null>(null);
  const [listaDoHolofote, setListaDoHolofote] = useState<readonly string[]>([]);
  const [pedidoDeVs, setPedidoDeVs] = useState<PedidoDeVs | null>(vsInicial);
  const [porta, setPorta] = useState(portaFechada);

  // Espelhos para os ouvintes (que são registrados uma vez só).
  const ligadoRef = useRef(ligado);
  const volumeRef = useRef(volume);
  const ocupadoRef = useRef(false);
  const ocupado = porta || holofoteAberto !== null || pedidoDeVs !== null;
  useEffect(() => {
    ligadoRef.current = ligado;
    volumeRef.current = volume;
    ocupadoRef.current = ocupado;
  }, [ligado, volume, ocupado]);

  /** Abre o áudio. Só funciona dentro de um gesto do usuário (clique, tecla, toque). */
  const desbloquear = useCallback((): SomDaForja | null => {
    if (!instanciaDoSom.current) {
      instanciaDoSom.current = criarSomDaForja(volumeRef.current);
      if (instanciaDoSom.current) setDesbloqueado(true);
    }
    return instanciaDoSom.current;
  }, []);

  const tocar = useCallback((f: (som: SomDaForja) => void) => {
    if (!ligadoRef.current) return;
    const som = instanciaDoSom.current;
    if (!som) return;
    try {
      f(som);
    } catch {
      /* som é enfeite */
    }
  }, []);

  const ligar = useCallback(
    (novo: boolean) => {
      setLigado(novo);
      ligadoRef.current = novo;
      gravarCookie(novo);
      if (novo) {
        // Chamado de dentro de um clique/tecla: é a hora em que o navegador deixa abrir o áudio.
        const som = desbloquear();
        som?.volume(volumeRef.current);
        som?.clique();
      } else {
        instanciaDoSom.current?.volume(0);
      }
    },
    [desbloquear],
  );
  const alternar = useCallback(() => ligar(!ligadoRef.current), [ligar]);
  const obterFaiscas = useCallback(() => apiFaiscas.current, []);

  const definirVolume = useCallback((v: number) => {
    const novo = Math.max(0, Math.min(1, v));
    volumeRef.current = novo;
    gravarVolume(novo);
    if (ligadoRef.current) instanciaDoSom.current?.volume(novo);
  }, []);

  const abrirHolofote = useCallback(
    (slug: string, origem?: Element | null) => {
      if (!dados.jogadores[slug]) return;
      // A fila do «anterior/próximo»: os colegas de cena do jogador clicado, na ordem da tela.
      const grupo = origem?.closest("[data-grupo-de-jogadores]");
      const vizinhos = grupo ? [...grupo.querySelectorAll<HTMLElement>("[data-jogador]")].map((el) => el.dataset.jogador ?? "") : [];
      const unicos = [...new Set(vizinhos.filter((x) => dados.jogadores[x]))];
      setListaDoHolofote(unicos.includes(slug) ? unicos : [slug]);

      const abrir = () => setHolofoteAberto(slug);
      // View Transitions: o rosto clicado vira a carta em destaque. Sem a API (ou com movimento
      // reduzido), abre direto.
      const doc = document as Document & { startViewTransition?: (f: () => void) => unknown };
      const reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
      const alvo = origem instanceof HTMLElement ? origem : null;
      if (!doc.startViewTransition || reduzido || !alvo) {
        abrir();
      } else {
        alvo.style.setProperty("view-transition-name", "lob-holofote");
        try {
          doc.startViewTransition(() => {
            alvo.style.removeProperty("view-transition-name");
            flushSync(abrir);
          });
        } catch {
          alvo.style.removeProperty("view-transition-name");
          abrir();
        }
      }
      tocar((som) => som.brilho());
    },
    [dados.jogadores, tocar],
  );
  const fecharHolofote = useCallback(() => setHolofoteAberto(null), []);

  const abrirVs = useCallback(
    (pedido?: PedidoDeVs) => {
      setHolofoteAberto(null);
      setPedidoDeVs(pedido ?? { tipo: "times" });
      tocar((som) => som.sopro());
    },
    [tocar],
  );
  const fecharVs = useCallback(() => {
    setPedidoDeVs(null);
    // O endereço volta a ser o da página: quem copiar depois não leva um VS que já fechou.
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has("vs")) {
        url.searchParams.delete("vs");
        window.history.replaceState(window.history.state, "", url);
      }
    } catch {
      /* endereço esquisito: fica como está */
    }
  }, []);

  // ---------------------------------------------------------------- montagem: diretor + ouvintes
  useEffect(() => {
    const el = raiz.current;
    if (!el) return;
    diretor.iniciar(el);
    volumeRef.current = lerVolume();

    const desligarMarcas = diretor.ouvir((ev) => {
      if (ev.tipo !== "marca" || !ev.acesa || !ev.frente) return;
      const d = ev.el.dataset;
      const pan = ev.x * 1.2 - 0.6;
      // `data-som` aceita uma sequência: "estalo carta@180 carta@320" (o @ é o atraso em ms).
      for (const parte of (d.som ?? "").split(/\s+/).filter(Boolean)) {
        const [nome, atraso] = parte.split("@");
        const ms = Number(atraso) || 0;
        if (ms > 0) window.setTimeout(() => tocar((som) => tocarEfeito(som, nome!, pan)), ms);
        else tocar((som) => tocarEfeito(som, nome!, pan));
      }
      if (d.conta) tocar((som) => som.contagem(Number(d.conta) || 1, 900));
      if (d.faisca) {
        const quente = ["#fff3dc", "#ffc061", "#ff6a2b", "#f0c88a"];
        const cores = d.faisca === "time" && d.cor ? [d.cor, "#fff3dc", "#ffc061"] : quente;
        const forte = d.faisca === "forte";
        // Poucas e grossas: faísca fina em tela cheia vira bloco na compressão do vídeo.
        apiFaiscas.current?.explosao({ x: ev.x, y: ev.y, cores, quantidade: forte ? 54 : 28, forca: forte ? 0.8 : 0.55, espessura: 2.4 });
      }
    });

    const desligarInclinacao = ligarInclinacao(el);

    // Delegação: qualquer `[data-jogador]` da página abre o holofote; `[data-vs-…]` abre o VS.
    const aoClicar = (ev: MouseEvent) => {
      if (ev.defaultPrevented || ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const alvo = ev.target instanceof Element ? ev.target : null;
      if (!alvo) return;
      const vira = alvo.closest<HTMLElement>("[data-vira]");
      if (vira) {
        const carta = vira.closest<HTMLElement>("[data-carta]");
        if (carta) {
          ev.preventDefault();
          const virada = carta.dataset.virada === "1";
          carta.dataset.virada = virada ? "0" : "1";
          // A arte do verso só é pedida quando a carta vira pela primeira vez.
          for (const img of carta.querySelectorAll<HTMLImageElement>("img[data-src]")) {
            img.src = img.dataset.src!;
            delete img.dataset.src;
          }
          for (const lado of carta.querySelectorAll<HTMLElement>("[data-lado]")) {
            const ehVerso = lado.dataset.lado === "verso";
            lado.inert = ehVerso ? virada : !virada;
          }
          tocar((som) => som.carta());
        }
        return;
      }
      const vsTime = alvo.closest<HTMLElement>("[data-vs-time]");
      if (vsTime) {
        ev.preventDefault();
        abrirVs({ tipo: "times", a: vsTime.dataset.vsTime });
        return;
      }
      const vsJogador = alvo.closest<HTMLElement>("[data-vs-jogador]");
      if (vsJogador) {
        ev.preventDefault();
        abrirVs({ tipo: "jogadores", a: vsJogador.dataset.vsJogador });
        return;
      }
      const jogador = alvo.closest<HTMLElement>("[data-jogador]");
      if (jogador?.dataset.jogador) {
        ev.preventDefault();
        abrirHolofote(jogador.dataset.jogador, jogador);
      }
    };
    el.addEventListener("click", aoClicar);

    // Atalhos. Só ← → e M: nenhuma tecla que o navegador já usa (Espaço, PageDown, Alt+←…).
    const aoTeclar = (ev: KeyboardEvent) => {
      if (ev.defaultPrevented || ev.altKey || ev.ctrlKey || ev.metaKey || ehCampo(ev.target)) return;
      if (ev.key === "m" || ev.key === "M") {
        ev.preventDefault();
        ligar(!ligadoRef.current);
        return;
      }
      if (ocupadoRef.current) return;
      if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
        // Num controle que usa as setas (deslizador de volume), a seta é dele.
        const alvo = ev.target instanceof HTMLElement ? ev.target : null;
        if (alvo?.closest("[data-setas-proprias]")) return;
        if (diretor.viajar(ev.key === "ArrowRight" ? 1 : -1)) {
          ev.preventDefault();
          tocar((som) => som.sopro(ev.key === "ArrowRight"));
        }
      }
    };
    window.addEventListener("keydown", aoTeclar);

    return () => {
      desligarMarcas();
      desligarInclinacao();
      el.removeEventListener("click", aoClicar);
      window.removeEventListener("keydown", aoTeclar);
      diretor.parar();
      instanciaDoSom.current?.fechar();
      instanciaDoSom.current = null;
    };
  }, [abrirHolofote, abrirVs, diretor, ligar, tocar]);

  // Quem já escolheu «com som» numa visita anterior: o navegador só libera o áudio depois do
  // primeiro gesto. O primeiro toque/tecla em qualquer lugar da página abre.
  useEffect(() => {
    if (!ligado || desbloqueado) return;
    const abrir = () => {
      const som = desbloquear();
      som?.volume(volumeRef.current);
    };
    window.addEventListener("pointerdown", abrir, { once: true });
    window.addEventListener("keydown", abrir, { once: true });
    return () => {
      window.removeEventListener("pointerdown", abrir);
      window.removeEventListener("keydown", abrir);
    };
  }, [ligado, desbloqueado, desbloquear]);

  // Camada cheia aberta: a página de trás não rola.
  useEffect(() => {
    if (!ocupado) return;
    const raizDoDocumento = document.documentElement;
    const antes = raizDoDocumento.style.overflow;
    raizDoDocumento.style.overflow = "hidden";
    return () => {
      raizDoDocumento.style.overflow = antes;
    };
  }, [ocupado]);

  const valor = useMemo<Contexto>(
    () => ({
      dados,
      t,
      fontes,
      diretor,
      som: { ligado, desbloqueado, volume, alternar, ligar, definirVolume, tocar },
      faiscas: obterFaiscas,
      holofote: { aberto: holofoteAberto, lista: listaDoHolofote, abrir: abrirHolofote, fechar: fecharHolofote },
      versus: { pedido: pedidoDeVs, abrir: abrirVs, fechar: fecharVs },
      ocupado,
      definirPortaFechada: setPorta,
    }),
    [abrirHolofote, abrirVs, alternar, dados, definirVolume, desbloqueado, diretor, fecharHolofote, fecharVs, fontes, holofoteAberto, ligado, ligar, listaDoHolofote, obterFaiscas, ocupado, pedidoDeVs, t, tocar, volume],
  );

  return (
    <ContextoDaForja.Provider value={valor}>
      <div ref={raiz} className={s.raiz} data-forja="" data-cine="desarmado" data-pinos="0" data-som={ligado ? "1" : "0"}>
        <div className={s.enfFundo} aria-hidden />
        <div className={s.conteudo}>{children}</div>
        <div className={s.enfFaiscas} aria-hidden>
          <Faiscas ref={apiFaiscas} />
        </div>
        <span className={`${s.enfFaixa} ${s.enfFaixaDeCima}`} aria-hidden />
        <span className={`${s.enfFaixa} ${s.enfFaixaDeBaixo}`} aria-hidden />
        {/* Embrulhado: solto entre os irmãos, um elemento que vem do servidor conta como item de
            lista para o React, que pede chave. */}
        <div className={s.camadas}>{camadas}</div>
      </div>
    </ContextoDaForja.Provider>
  );
}
