"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ALL_CARDS, CARDS, CARDS_BY_ID, type CardDef } from "@/lib/cards";
import type { CardId } from "@/lib/schema";
import {
  CURVA_DO_FREIO,
  FREIO_MS,
  MINIMO_MS,
  PASSO_GRAUS,
  PASSO_MS,
  anguloDeParada,
  fatiasCruzadas,
  pinturaDasFatias,
  posicaoDoRotulo,
} from "@/lib/series/roda";
import { criarSomDaCerimonia, type SomDaCerimonia } from "@/lib/series/som-da-cerimonia";

/**
 * A CERIMÔNIA DO SORTEIO NA PÁGINA PÚBLICA DA PARTIDA.
 *
 * ⚠ O QUE ESTA TELA **NÃO** FAZ: sortear. Quem sorteia é `POST /api/admin/series/sorteio`, no
 * servidor, a partir de uma semente de 128 bits que fica gravada na série. Aqui só se REVELA
 * um resultado que já existe.
 *
 * A distinção não é decorativa. Esta página já sorteou no navegador uma vez, com
 * `Math.random()`, e o resultado só depois ia para o banco — bastava girar até gostar do que
 * saiu e então confirmar. A roda começa a girar ANTES da resposta chegar (senão haveria um
 * congelamento estranho enquanto a rede responde), mas o FREIO é a única parte que conhece o
 * resultado. O giro livre é teatro honesto: ele não decide nada.
 *
 * Os únicos `Math.random()` daqui pintam confete.
 *
 * REGRA DA CASA, que já custou o site em branco quatro vezes: nenhuma animação decide se o
 * conteúdo é visível. Nome do time, carta sorteada e semente nascem opacos; o que anima é
 * transform, e o que anima opacidade é enfeite (brilho, confete, holofote). Se nenhum
 * keyframe rodar, o resultado continua legível.
 */

// ---------------------------------------------------------------- tipos

export type PedidoDeSorteio =
  | { tipo: "lados" }
  | { tipo: "carta"; teamId: string; dupla?: false }
  | { tipo: "carta"; teamId?: undefined; dupla: true };

type TimeRef = Readonly<{ id: string; name: string }>;

type Sorteio = Readonly<{
  tipo: string;
  semente: string;
  autor: string;
  resultado: string;
  detalhe?: { letras?: [string, string]; campeoes?: number };
}>;

type RespostaSorteio = Readonly<{
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
  girando: string;
  ladoAzul: string;
  ladoVermelho: string;
  resultado: string;
  semente: string;
  porFulano: string;
  falhou: string;
  repetido: string;
  letras: string;
  campeoesDisponiveis: string;
  cartaDupla: string;
  som: string;
  semSom: string;
  frases: readonly string[];
}>;

type Fase =
  | { nome: "contagem"; numero: number }
  | { nome: "girando" }
  | { nome: "revelado"; resposta: RespostaSorteio }
  | { nome: "erro"; mensagem: string };

type ItemDaRoda = Readonly<{ chave: string; cor: string; rotulo: string; nota?: string }>;

// ---------------------------------------------------------------- constantes de encenação

const AZUL = "#4d9bff";
const VERMELHO = "#ff5d5d";
const OURO = "#e8b878";

/** Cada número da contagem. Três números = ~2,1 s, e o pedido ao servidor já corre solto. */
const CONTAGEM_MS = 700;
/** O tremor entra só na reta final da freada — antes disso ninguém está tenso ainda. */
const TREMOR_ANTES_DO_FIM_MS = 900;
/** Confete: mais que isto vira sopa e o navegador começa a engasgar em celular. */
const CONFETES = 90;

const EMOJIS_DE_FESTA = ["🎉", "🎊", "✨", "🏆", "💥", "🔥", "🪙", "⚔️", "🎯", "🥳"];
const CORES_DE_FESTA = ["#e8b878", "#ff8a3d", "#4d9bff", "#ff5d5d", "#46d6c8", "#f3ece0"];

// ---------------------------------------------------------------- peças

/**
 * A roda.
 *
 * As fatias são um `conic-gradient` e o freio usa a MESMA conta de `lib/series/roda.ts` para
 * escolher onde parar — é o que impede a roda de encostar "quase" no resultado certo.
 */
function Roda({
  itens,
  giro,
  transicao,
  tamanho,
}: Readonly<{
  itens: readonly ItemDaRoda[];
  giro: number;
  transicao: string;
  tamanho: number;
}>) {
  const poucas = itens.length <= 2;

  return (
    <div
      aria-hidden
      style={{ position: "relative", width: tamanho, height: tamanho, flexShrink: 0, maxWidth: "100%" }}
    >
      {/* Anel de brilho por trás — enfeite puro, pulsa e não segura conteúdo nenhum. */}
      <div
        className="lob-cer-pulso"
        style={{
          position: "absolute",
          inset: -26,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(232,184,120,.30), rgba(232,184,120,0) 68%)`,
          pointerEvents: "none",
        }}
      />

      {/* O prato que gira. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: pinturaDasFatias(itens.map((i) => i.cor)),
          boxShadow: `0 0 0 4px rgba(232,184,120,.45), 0 0 0 12px rgba(11,8,4,.92), 0 0 90px rgba(232,184,120,.28), inset 0 0 70px rgba(0,0,0,.5)`,
          transform: `rotate(${giro}deg)`,
          transition: transicao,
          willChange: "transform",
        }}
      >
        {itens.map((item, i) => {
          const p = posicaoDoRotulo(i, itens.length, poucas ? 0.28 : 0.34);
          return (
            <div
              key={item.chave}
              style={{
                position: "absolute",
                left: `${p.esquerda}%`,
                top: `${p.topo}%`,
                width: tamanho * (poucas ? 0.34 : 0.28),
                transform: `translate(-50%, -50%) rotate(${p.rotacao}deg)`,
                textAlign: "center",
                color: "#160f06",
                textShadow: "0 1px 0 rgba(255,255,255,.3)",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontSize: poucas ? Math.round(tamanho * 0.055) : Math.round(tamanho * 0.085),
                  fontWeight: 800,
                  lineHeight: 1.05,
                  overflowWrap: "anywhere",
                }}
              >
                {item.rotulo}
              </div>
              {item.nota ? (
                <div style={{ fontSize: 11, letterSpacing: ".14em", fontWeight: 800, marginTop: 3 }}>
                  {item.nota}
                </div>
              ) : null}
            </div>
          );
        })}

        {/* Brilho de verniz: fixo em relação ao prato, dá volume à chapa. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 32% 22%, rgba(255,255,255,.30), rgba(255,255,255,0) 46%)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Parafusos do aro. Não giram: são a moldura. */}
      {Array.from({ length: 12 }, (_, i) => {
        const ang = (i * 30 * Math.PI) / 180;
        return (
          <span
            key={i}
            className="lob-cer-faisca"
            style={{
              position: "absolute",
              left: `${50 + 51 * Math.sin(ang)}%`,
              top: `${50 - 51 * Math.cos(ang)}%`,
              width: 7,
              height: 7,
              marginLeft: -3.5,
              marginTop: -3.5,
              borderRadius: "50%",
              background: OURO,
              boxShadow: `0 0 10px ${OURO}`,
              animationDelay: `${(i % 6) * 0.18}s`,
              pointerEvents: "none",
            }}
          />
        );
      })}

      {/* Cubo central. */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: Math.round(tamanho * 0.17),
          height: Math.round(tamanho * 0.17),
          marginLeft: -Math.round(tamanho * 0.085),
          marginTop: -Math.round(tamanho * 0.085),
          borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #4a3120, #1a1108)",
          border: `3px solid ${OURO}`,
          boxShadow: "0 8px 26px rgba(0,0,0,.75), inset 0 0 18px rgba(0,0,0,.7)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.round(tamanho * 0.08),
          pointerEvents: "none",
        }}
      >
        ⚔️
      </div>
    </div>
  );
}

type PapelPicado = Readonly<{
  chave: number;
  esquerda: number;
  atraso: number;
  duracao: number;
  desvio: number;
  giro: number;
  tamanho: number;
  emoji: boolean;
  conteudo: string;
  cor: string;
}>;

/**
 * Sorteia os papéis picados.
 *
 * Roda no RELÓGIO da revelação — nunca durante o render e nunca dentro de um efeito. As duas
 * regras existem por motivos diferentes e as duas valem: `Math.random()` no render é impuro
 * (o React pode reexecutar um render sem commitar, e o confete pularia de lugar no meio da
 * queda), e `setState` síncrono num efeito dispara render em cascata.
 *
 * Este é o único sorteio do arquivo, e ele decide cor de papel picado. Quem decide o
 * resultado da partida é o servidor.
 */
function sortearConfete(): readonly PapelPicado[] {
  return Array.from({ length: CONFETES }, (_, i) => ({
    chave: i,
    esquerda: Math.random() * 100,
    atraso: Math.random() * 0.9,
    duracao: 2.2 + Math.random() * 2.2,
    desvio: (Math.random() - 0.5) * 320,
    giro: 480 + Math.random() * 1200,
    tamanho: 9 + Math.random() * 16,
    emoji: Math.random() < 0.45,
    conteudo: EMOJIS_DE_FESTA[Math.floor(Math.random() * EMOJIS_DE_FESTA.length)]!,
    cor: CORES_DE_FESTA[Math.floor(Math.random() * CORES_DE_FESTA.length)]!,
  }));
}

function Confete({ pecas }: Readonly<{ pecas: readonly PapelPicado[] }>) {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {pecas.map((p) => (
        <span
          key={p.chave}
          className="lob-cer-confete"
          style={
            {
              position: "absolute",
              left: `${p.esquerda}%`,
              top: 0,
              fontSize: p.tamanho,
              width: p.emoji ? undefined : p.tamanho * 0.55,
              height: p.emoji ? undefined : p.tamanho,
              background: p.emoji ? undefined : p.cor,
              borderRadius: p.emoji ? undefined : 2,
              "--lob-cer-desvio": `${p.desvio}px`,
              "--lob-cer-giro": `${p.giro}deg`,
              "--lob-cer-dur": `${p.duracao}s`,
              "--lob-cer-atraso": `${p.atraso}s`,
            } as React.CSSProperties
          }
        >
          {p.emoji ? p.conteudo : null}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- a cerimônia

export function CerimoniaDeSorteio({
  aberto,
  pedido,
  onFechar,
  onSorteado,
  seriesId,
  teamA,
  teamB,
  t,
  nomesCartas,
}: Readonly<{
  aberto: boolean;
  pedido: PedidoDeSorteio | null;
  onFechar: () => void;
  onSorteado: (resposta: RespostaSorteio) => void;
  seriesId: string;
  teamA: TimeRef | null;
  teamB: TimeRef | null;
  t: TextosDaCerimonia;
  nomesCartas?: Record<string, string>;
}>) {
  const [fase, setFase] = useState<Fase>({ nome: "contagem", numero: 3 });
  const [giro, setGiro] = useState(0);
  const [transicao, setTransicao] = useState("none");
  const [tremendo, setTremendo] = useState(false);
  const [frase, setFrase] = useState(0);
  const [mudo, setMudo] = useState(false);
  const [tique, setTique] = useState(0);
  const [confete, setConfete] = useState<readonly PapelPicado[]>([]);

  const palco = useRef<HTMLDivElement | null>(null);
  const som = useRef<SomDaCerimonia | null>(null);
  const relogios = useRef<ReturnType<typeof setTimeout>[]>([]);
  const intervalos = useRef<ReturnType<typeof setInterval>[]>([]);
  const rodada = useRef(0);
  /** Qual pedido já foi sorteado. Impede o mesmo clique virar dois registros. */
  const pedidoSorteado = useRef<PedidoDeSorteio | null>(null);
  const giroLido = useRef(0);

  /*
   * Memoizado por PRIMITIVOS (id e nome), nunca pelos objetos `teamA`/`teamB`.
   *
   * Depender dos objetos custou caro: `router.refresh()` devolve times novos em memória
   * — mesmos dados, outra identidade —, o `useMemo` recalculava, o efeito do sorteio via
   * dependência nova e sorteava OUTRA VEZ. Um clique virou 24 sorteios gravados em 52
   * segundos, cada um sobrescrevendo o anterior.
   */
  const teamAId = teamA?.id;
  const teamAName = teamA?.name;
  const teamBId = teamB?.id;
  const teamBName = teamB?.name;
  const dupla = pedido?.tipo === "carta" && pedido.dupla === true;
  const tipoDoPedido = pedido?.tipo;

  const itens: readonly ItemDaRoda[] = useMemo(() => {
    if (!tipoDoPedido) return [];
    if (tipoDoPedido === "lados") {
      return [
        { chave: teamAId ?? "a", cor: AZUL, rotulo: teamAName ?? "—" },
        { chave: teamBId ?? "b", cor: VERMELHO, rotulo: teamBName ?? "—" },
      ];
    }
    const baralho: CardDef[] = dupla ? ALL_CARDS : CARDS;
    return baralho.map((c) => ({
      chave: c.cardId,
      cor: c.color,
      rotulo: c.emoji,
      nota: c.letter ?? "DUPLA",
    }));
  }, [tipoDoPedido, dupla, teamAId, teamAName, teamBId, teamBName]);

  /*
   * O que o sorteio LÊ mas que não pode reiniciá-lo.
   *
   * Um efeito que depende de callback e de texto reinicia a cada render do pai — e
   * reiniciar aqui não é cosmético: a limpeza mata os relógios da roda no meio do giro E
   * o efeito dispara outro sorteio. Este efeito sem lista de dependências roda depois de
   * todo render e mantém as referências frescas, sem entrar na conta de quem reinicia.
   *
   * Declarado ANTES do efeito do sorteio de propósito: o React roda os efeitos na ordem
   * em que aparecem, então quando o sorteio começa a ler daqui o conteúdo já é o do
   * render atual.
   */
  const ultimos = useRef({ itens, onSorteado, falhou: t.falhou, mudo });
  useEffect(() => {
    ultimos.current = { itens, onSorteado, falhou: t.falhou, mudo };
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
    pedidoSorteado.current = null;
    limpar();
    som.current?.fechar();
    som.current = null;
    onFechar();
  }, [limpar, onFechar]);

  // ESC fecha, e o foco vai para o palco: leitor de tela e teclado não ficam presos atrás.
  useEffect(() => {
    if (!aberto) return;
    palco.current?.focus();
    const naTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    window.addEventListener("keydown", naTecla);
    return () => window.removeEventListener("keydown", naTecla);
  }, [aberto, fechar]);

  useEffect(() => limpar, [limpar]);

  /* ------------------------------------------------------------ o giro */

  useEffect(() => {
    if (!aberto || !pedido) return;

    /*
     * Um clique, um sorteio.
     *
     * Trava explícita além das dependências: sorteio gravado é registro, e "provavelmente
     * não reexecuta" não é garantia boa o bastante para escrever no banco. Se este efeito
     * rodar de novo para o MESMO pedido, ele não faz nada.
     */
    if (pedidoSorteado.current === pedido) return;
    pedidoSorteado.current = pedido;

    const { itens, onSorteado, falhou } = ultimos.current;
    if (itens.length === 0) return;

    rodada.current += 1;
    const minha = rodada.current;
    limpar();

    // `matchMedia` fora do render: no servidor não existe `window`, e ler mídia durante o
    // render é impuro.
    const reduzido =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    // O contexto de áudio nasce aqui porque este efeito é disparado pelo clique que abriu a
    // cerimônia — é a única janela em que o navegador deixa tocar som.
    if (!som.current && !ultimos.current.mudo) som.current = criarSomDaCerimonia();

    /*
     * Não há bloco de "zerar tudo" aqui: o pai remonta esta tela a cada clique (via `key`),
     * então o estado JÁ nasce no começo. Zerar por `setState` dentro do efeito dispararia um
     * render em cascata logo no quadro em que a roda deveria começar a girar.
     */
    giroLido.current = 0;

    /* O pedido ao servidor sai JUNTO com a contagem: quando "VAI!" aparece, o resultado
       normalmente já chegou, e o suspense da roda é encenação e não espera de rede. */
    const comecou = Date.now();
    const promessa = (async (): Promise<RespostaSorteio> => {
      const corpo =
        pedido.tipo === "lados"
          ? { seriesId, tipo: "lados" }
          : {
              seriesId,
              tipo: "carta",
              teamId: pedido.dupla === true ? undefined : pedido.teamId,
              dupla: pedido.dupla === true,
            };

      const r = await fetch("/api/admin/series/sorteio", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const dados = (await r.json().catch(() => null)) as RespostaSorteio | null;
      if (!r.ok || !dados?.sorteio) {
        const ref = dados?.ref ? ` (ref ${dados.ref})` : "";
        throw new Error(`${dados?.error ?? `Falha no sorteio (HTTP ${r.status}).`}${ref}`);
      }
      return dados;
    })();

    // Silencia a rejeição não tratada; o erro é consumido no `then` mais abaixo.
    promessa.catch(() => {});

    const freiar = (resposta: RespostaSorteio) => {
      if (rodada.current !== minha) return;
      limpar();

      const alvo = itens.findIndex((i) => i.chave === resposta.sorteio?.resultado);

      /* Resultado fora da roda não pode virar "para na fatia 0 e finge". Isso aconteceria se
         o baralho do servidor e o desta tela divergissem — e a plateia veria a roda encostar
         numa carta e o texto anunciar outra. Sem fatia correspondente, revela sem freio. */
      if (alvo < 0) {
        setConfete(sortearConfete());
        setFase({ nome: "revelado", resposta });
        if (!ultimos.current.mudo) som.current?.fanfarra();
        return;
      }

      if (reduzido) {
        setTransicao("none");
        setGiro(anguloDeParada({ giroAtual: giroLido.current, indice: alvo, total: itens.length }));
        setConfete(sortearConfete());
        setFase({ nome: "revelado", resposta });
        if (!ultimos.current.mudo) som.current?.fanfarra();
        return;
      }

      const parada = anguloDeParada({
        giroAtual: giroLido.current,
        indice: alvo,
        total: itens.length,
      });

      // Tique acompanhando a desaceleração: as fatias que ainda vão cruzar o ponteiro,
      // espaçadas pela mesma curva do freio, para o ouvido acompanhar a roda perdendo força.
      const restantes = fatiasCruzadas(giroLido.current, parada, itens.length);
      const passos = Math.min(restantes, 60);
      for (let k = 1; k <= passos; k += 1) {
        const progresso = k / passos;
        // Inversa aproximada da curva: os tiques abrem espaço perto do fim.
        const quando = FREIO_MS * (1 - Math.pow(1 - progresso, 2.4));
        marcar(() => {
          if (rodada.current !== minha) return;
          setTique((n) => n + 1);
          if (!ultimos.current.mudo) som.current?.tique();
        }, quando);
      }

      setTransicao(`transform ${FREIO_MS}ms ${CURVA_DO_FREIO}`);
      setGiro(parada);
      giroLido.current = parada;

      marcar(() => setTremendo(true), Math.max(0, FREIO_MS - TREMOR_ANTES_DO_FIM_MS));
      marcar(() => {
        if (rodada.current !== minha) return;
        setTremendo(false);
        setConfete(sortearConfete());
        setFase({ nome: "revelado", resposta });
        if (!ultimos.current.mudo) som.current?.fanfarra();
      }, FREIO_MS + 80);
    };

    const girar = () => {
      if (rodada.current !== minha) return;
      setFase({ nome: "girando" });

      if (!reduzido) {
        setTransicao(`transform ${PASSO_MS}ms linear`);
        // Um passo curto antes do ritmo: elemento que NASCE no transform final não
        // transiciona, e a roda ficaria parada os primeiros 560 ms — bem quando todo mundo
        // está olhando.
        marcar(() => {
          if (rodada.current !== minha) return;
          setGiro((a) => {
            giroLido.current = a + PASSO_GRAUS;
            return giroLido.current;
          });
          intervalos.current.push(
            setInterval(() => {
              setGiro((a) => {
                giroLido.current = a + PASSO_GRAUS;
                return giroLido.current;
              });
            }, PASSO_MS),
          );
        }, 32);

        intervalos.current.push(
          setInterval(() => setFrase((f) => f + 1), 900),
        );
      }

      void promessa.then(
        (resposta) => {
          if (rodada.current !== minha) return;
          onSorteado(resposta);
          const falta = reduzido ? 0 : Math.max(0, MINIMO_MS - (Date.now() - comecou));
          marcar(() => freiar(resposta), falta);
        },
        (erro: unknown) => {
          if (rodada.current !== minha) return;
          limpar();
          setTransicao("none");
          setFase({
            nome: "erro",
            mensagem: erro instanceof Error ? erro.message : falhou,
          });
          if (!ultimos.current.mudo) som.current?.fracasso();
        },
      );
    };

    if (reduzido) {
      girar();
      return;
    }

    // 3 · 2 · 1 · VAI!
    marcar(() => setFase({ nome: "contagem", numero: 2 }), CONTAGEM_MS);
    marcar(() => setFase({ nome: "contagem", numero: 1 }), CONTAGEM_MS * 2);
    marcar(girar, CONTAGEM_MS * 3);

    return limpar;
  }, [aberto, pedido, seriesId, limpar]);

  if (!aberto || !pedido) return null;

  const revelacao = fase.nome === "revelado" ? fase.resposta : null;
  const sorteio = revelacao?.sorteio;
  const girando = fase.nome === "girando";
  const tamanhoDaRoda = revelacao ? 200 : 380;

  const nomeDoTime = (id?: string | null) =>
    id === teamA?.id ? (teamA?.name ?? "—") : id === teamB?.id ? (teamB?.name ?? "—") : "—";

  const cartaSorteada: CardDef | undefined =
    sorteio && pedido.tipo === "carta" ? CARDS_BY_ID[sorteio.resultado as CardId] : undefined;

  return (
    <div
      ref={palco}
      role="dialog"
      aria-modal="true"
      aria-label={t.titulo}
      tabIndex={-1}
      style={{
        position: "fixed",
        inset: 0,
        // 9000 é a faixa de "cerimônia em tela cheia" na escala documentada em site-frame.tsx.
        zIndex: 9000,
        // Fundo OPACO: a cerimônia toma a tela, não flutua sobre a página.
        background: "#0b0804",
        color: "#f3ece0",
        overflowY: "auto",
        outline: "none",
      }}
    >
      {/* Holofotes girando ao fundo. */}
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div
          className="lob-cer-holofote"
          style={{
            position: "absolute",
            left: "50%",
            top: "42%",
            width: "180vmax",
            height: "180vmax",
            marginLeft: "-90vmax",
            marginTop: "-90vmax",
            background:
              "conic-gradient(from 0deg, rgba(232,184,120,.10) 0deg 14deg, rgba(0,0,0,0) 14deg 60deg, rgba(77,155,255,.08) 60deg 74deg, rgba(0,0,0,0) 74deg 180deg, rgba(255,93,93,.08) 180deg 194deg, rgba(0,0,0,0) 194deg 360deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 42%, rgba(0,0,0,0) 30%, rgba(11,8,4,.86) 76%)",
          }}
        />
      </div>

      {/* Barra de cima. */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          maxWidth: 1160,
          margin: "0 auto",
          padding: "18px clamp(16px,4vw,24px) 0",
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: ".22em",
            color: "#0b0804",
            background: OURO,
            padding: "5px 10px",
            borderRadius: 4,
          }}
        >
          {t.titulo}
        </span>
        <span style={{ fontSize: 13, color: "#b8ab97" }}>
          {teamA?.name ?? "—"} <span style={{ color: OURO }}>×</span> {teamB?.name ?? "—"}
        </span>

        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMudo((m) => !m)}
            aria-pressed={mudo}
            style={botaoDaBarra}
          >
            {mudo ? `🔇 ${t.semSom}` : `🔊 ${t.som}`}
          </button>
          <button type="button" onClick={fechar} style={botaoDaBarra}>
            ✕ {t.fechar}
          </button>
        </span>
      </div>

      {/* Palco. */}
      <div
        className={tremendo ? "lob-cer-tremor" : undefined}
        style={{
          position: "relative",
          maxWidth: 1160,
          margin: "0 auto",
          padding: "clamp(18px,4vw,34px) clamp(16px,4vw,24px) 60px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 22,
        }}
      >
        {fase.nome === "erro" ? (
          <div
            style={{
              maxWidth: 620,
              border: `1px solid rgba(255,93,93,.5)`,
              background: "rgba(255,93,93,.10)",
              borderRadius: 14,
              padding: "18px 20px",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontSize: 15, fontWeight: 800, color: VERMELHO }}>{t.falhou}</p>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: "#b8ab97", lineHeight: 1.6 }}>
              {fase.mensagem}
            </p>
          </div>
        ) : null}

        {fase.nome === "contagem" ? (
          <div
            key={fase.numero}
            className="lob-cer-contagem"
            style={{
              fontSize: "clamp(120px,26vw,260px)",
              lineHeight: 1,
              fontWeight: 900,
              color: OURO,
              textShadow: `0 0 60px rgba(232,184,120,.55)`,
            }}
          >
            {fase.numero}
          </div>
        ) : null}

        {fase.nome !== "erro" && fase.nome !== "contagem" ? (
          <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
            {/* Faixas de velocidade — só enquanto a roda está solta. */}
            {girando ? (
              <div
                aria-hidden
                className="lob-cer-velocidade"
                style={{
                  position: "absolute",
                  width: tamanhoDaRoda * 1.7,
                  height: tamanhoDaRoda * 1.7,
                  borderRadius: "50%",
                  background:
                    "repeating-conic-gradient(from 0deg, rgba(232,184,120,.16) 0deg 2deg, rgba(0,0,0,0) 2deg 16deg)",
                  maskImage: "radial-gradient(circle, rgba(0,0,0,0) 56%, rgba(0,0,0,1) 72%)",
                  WebkitMaskImage: "radial-gradient(circle, rgba(0,0,0,0) 56%, rgba(0,0,0,1) 72%)",
                  pointerEvents: "none",
                }}
              />
            ) : null}

            <Roda itens={itens} giro={giro} transicao={transicao} tamanho={tamanhoDaRoda} />

            {/* Ponteiro. Bate a cada fatia que cruza — a `key` reinicia a animação. */}
            <div
              aria-hidden
              key={tique}
              className="lob-cer-tique"
              style={{
                position: "absolute",
                top: `calc(50% - ${tamanhoDaRoda / 2 + 26}px)`,
                left: "50%",
                marginLeft: -14,
                width: 0,
                height: 0,
                transformOrigin: "50% 0%",
                borderLeft: "14px solid transparent",
                borderRight: "14px solid transparent",
                borderTop: `30px solid ${OURO}`,
                filter: "drop-shadow(0 4px 8px rgba(0,0,0,.8))",
                zIndex: 3,
              }}
            />
          </div>
        ) : null}

        {girando ? (
          <p
            key={frase}
            className="lob-cer-frase"
            style={{
              margin: 0,
              fontSize: "clamp(15px,3.2vw,21px)",
              fontWeight: 700,
              color: OURO,
              letterSpacing: ".04em",
              textAlign: "center",
            }}
          >
            {t.frases[frase % t.frases.length]}
          </p>
        ) : null}

        {/* ---------------------------------------------------------- resultado */}
        {revelacao && sorteio ? (
          <div className="lob-cer-slam" style={{ width: "100%", maxWidth: 780, textAlign: "center" }}>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 11,
                letterSpacing: ".28em",
                color: "#a98a5f",
                textTransform: "uppercase",
              }}
            >
              {t.resultado}
            </p>

            {pedido.tipo === "lados" ? (
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                <LadoRevelado
                  rotulo={t.ladoAzul}
                  cor={AZUL}
                  nome={nomeDoTime(revelacao.blueSideTeamId)}
                />
                <LadoRevelado
                  rotulo={t.ladoVermelho}
                  cor={VERMELHO}
                  nome={nomeDoTime(
                    revelacao.blueSideTeamId === teamA?.id ? teamB?.id : teamA?.id,
                  )}
                />
              </div>
            ) : (
              <CartaRevelada carta={cartaSorteada} nomesCartas={nomesCartas} duplaRotulo={t.cartaDupla} />
            )}

            {sorteio.detalhe?.letras ? (
              <div style={{ marginTop: 18 }}>
                <p style={{ margin: "0 0 8px", fontSize: 11, letterSpacing: ".2em", color: "#a98a5f" }}>
                  {t.letras.toUpperCase()}
                </p>
                <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                  {sorteio.detalhe.letras.map((letra) => (
                    <span
                      key={letra}
                      style={{
                        display: "grid",
                        placeItems: "center",
                        width: 72,
                        height: 72,
                        borderRadius: 14,
                        border: `2px solid ${OURO}`,
                        background: "rgba(232,184,120,.12)",
                        fontSize: 38,
                        fontWeight: 900,
                        color: OURO,
                      }}
                    >
                      {letra}
                    </span>
                  ))}
                </div>
                {typeof sorteio.detalhe.campeoes === "number" ? (
                  <p style={{ margin: "10px 0 0", fontSize: 13, color: "#b8ab97" }}>
                    {sorteio.detalhe.campeoes} {t.campeoesDisponiveis}
                  </p>
                ) : null}
              </div>
            ) : null}

            {(revelacao.vezes ?? 1) > 1 ? (
              <p
                style={{
                  margin: "18px auto 0",
                  maxWidth: 560,
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  color: "#e0b062",
                }}
              >
                {t.repetido}
              </p>
            ) : null}

            {/* A semente fica na tela: quem quiser conferir depois consegue. */}
            <p
              style={{
                margin: "22px 0 0",
                fontSize: 11,
                color: "#7d7263",
                wordBreak: "break-all",
                lineHeight: 1.7,
              }}
            >
              {t.semente}: <span style={{ color: "#a98a5f" }}>{sorteio.semente}</span> · {t.porFulano}{" "}
              <span style={{ color: "#a98a5f" }}>{sorteio.autor}</span>
            </p>

            <button
              type="button"
              onClick={fechar}
              style={{
                marginTop: 24,
                padding: "12px 26px",
                borderRadius: 8,
                border: `1px solid ${OURO}`,
                background: OURO,
                color: "#0b0804",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: ".1em",
                cursor: "pointer",
              }}
            >
              {t.fechar.toUpperCase()}
            </button>
          </div>
        ) : null}
      </div>

      {revelacao ? <Confete pecas={confete} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------- peças do resultado

const botaoDaBarra: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 6,
  border: "1px solid rgba(201,138,75,.35)",
  background: "rgba(201,138,75,.10)",
  color: "#d9cbb0",
  fontFamily: "inherit",
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: ".08em",
  cursor: "pointer",
};

function LadoRevelado({
  rotulo,
  cor,
  nome,
}: Readonly<{ rotulo: string; cor: string; nome: string }>) {
  return (
    <div
      style={{
        flex: "1 1 240px",
        maxWidth: 340,
        borderRadius: 18,
        border: `2px solid ${cor}`,
        background: `linear-gradient(180deg, ${cor}26, rgba(11,8,4,.6))`,
        padding: "22px 18px",
        boxShadow: `0 0 46px ${cor}44`,
      }}
    >
      <p
        style={{
          margin: "0 0 8px",
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".22em",
          textTransform: "uppercase",
          color: cor,
        }}
      >
        {rotulo}
      </p>
      <p style={{ margin: 0, fontSize: "clamp(20px,4.4vw,32px)", fontWeight: 900, lineHeight: 1.12 }}>
        {nome}
      </p>
    </div>
  );
}

function CartaRevelada({
  carta,
  nomesCartas,
  duplaRotulo,
}: Readonly<{ carta?: CardDef; nomesCartas?: Record<string, string>; duplaRotulo: string }>) {
  if (!carta) return null;
  const nome = nomesCartas?.[carta.id] ?? carta.title;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div
        style={{
          position: "relative",
          width: "min(260px, 62vw)",
          aspectRatio: "1 / 1",
          borderRadius: 22,
          overflow: "hidden",
          border: `3px solid ${carta.border}`,
          background: `linear-gradient(135deg, ${carta.from}, ${carta.to})`,
          boxShadow: `0 0 60px ${carta.color}55, 0 22px 60px rgba(0,0,0,.6)`,
          display: "grid",
          placeItems: "center",
          fontSize: 92,
        }}
      >
        {carta.imageUrl ? (
          // Mesma arte da página /cartas — o emoji fica só como reserva.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={carta.imageUrl}
            alt={carta.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span aria-hidden>{carta.emoji}</span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: "clamp(22px,5vw,38px)", fontWeight: 900, lineHeight: 1.1 }}>
        {nome}
      </p>
      {carta.letter ? (
        <span style={{ fontSize: 12, letterSpacing: ".24em", color: OURO, fontWeight: 800 }}>
          {carta.letter}
        </span>
      ) : null}
      {carta.dupla ? (
        <span style={{ fontSize: 12, letterSpacing: ".14em", color: "#46d6c8", fontWeight: 700 }}>
          {duplaRotulo}
        </span>
      ) : null}
      {carta.flavor ? (
        <p
          style={{
            margin: "4px 0 0",
            maxWidth: 520,
            fontSize: 13.5,
            fontStyle: "italic",
            lineHeight: 1.6,
            color: "#b8ab97",
          }}
        >
          “{carta.flavor}”
        </p>
      ) : null}
    </div>
  );
}
