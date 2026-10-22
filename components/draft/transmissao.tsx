"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { resolveElo } from "@/lib/design";
import { CORES_DOS_TIMES, D, DISPLAY, ROTAS_DO_DRAFT, alfa, emblemaDeElo } from "@/lib/draft/design";
import type { Messages } from "@/lib/i18n/messages";

type Rotulos = Messages["draft"];

/**
 * A TRANSMISSÃO DO DRAFT AO VIVO.
 *
 * Construída contra o pacote "design_handoff_draft_ao_vivo", declarado high-fidelity:
 * cor, espaçamento, tipografia e animação vêm de lá, e não do design system do site.
 * Esta é uma tela de PALCO — projetada numa TV enquanto os capitães escolhem —, e foi
 * especificada com paleta própria, quase preta, para o conteúdo brilhar sozinho.
 *
 * A primeira versão desta tela foi feita com `.lob-card` e as variáveis do site. Ficou
 * coerente com o resto e completamente diferente do combinado: uma conferência depois
 * mostrou que NENHUMA das cores do handoff aparecia no arquivo, e que 9 dos 10 elementos
 * especificados (sorteio, revelação, fim, confete, modo TV, cronômetro de urgência,
 * hexágono, grade de 6 colunas) simplesmente não existiam. Por isso os tokens agora
 * moram em `lib/draft/design.ts`, onde dá para conferir a distância num arquivo só.
 *
 * DESVIOS CONSCIENTES do handoff, e o motivo de cada um:
 *
 * · **Escolher pelo pool** não acontece aqui. No protótipo o admin clica na transmissão;
 *   no nosso sistema quem escolhe é o capitão, pelo painel dele, e o servidor valida
 *   contra a SESSÃO — não contra um campo enviado pelo navegador. Trazer o clique para
 *   cá abriria um segundo caminho de escrita para a mesma decisão. O pool aparece igual,
 *   em modo leitura.
 *
 * · **As vagas não são travadas por rota.** O handoff mostra 5 slots fixos
 *   (TOPO/SELVA/MEIO/ATIRADOR/SUPORTE), mas o nosso motor só controla pontos e vagas —
 *   não existe regra de "um por rota". Manter o rótulo fixo mostraria um jogador numa
 *   rota que não é a dele. A coluna tem as 5 linhas do desenho, e a etiqueta diz a rota
 *   REAL de quem está ali.
 *
 * · **Os keyframes ganharam o prefixo `lobd`** — `lobGlow` já existia no site com outra
 *   definição, e nome repetido em CSS quebra em silêncio o lugar errado.
 */

type TimePublico = {
  id: string;
  nome: string;
  cor: string;
  capitaoRiotId: string;
  gasto: number;
  vagas: number;
};

type JogadorDoElenco = {
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
  capitao: boolean;
};

type JogadorDisponivel = {
  id: string;
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
};

type EntradaHistorico = { escolha: number; timeId: string; riotId: string; automatica: boolean };

type FaseDraft = "preparando" | "rodando" | "pausado" | "encerrado";

type DraftPublico = {
  revisao: number;
  fase: FaseDraft;
  times: TimePublico[];
  elencos: Record<string, JogadorDoElenco[]>;
  disponiveis: JogadorDisponivel[];
  escolhaAtual: number;
  totalEscolhas: number;
  timeDaVezId: string | null;
  /** Quem o time da vez pode escolher agora, pela conta do motor. Opcional: servidor antigo. */
  escolhiveis?: string[];
  prazoISO: string | null;
  motivoDaPausa?: "organizacao" | "atraso" | "sem_jogador" | null;
  /** Muda a cada sorteio — vira a `key` da animação do sorteio. */
  sorteioId?: string | null;
  orcamentoPorTime: number;
  jogadoresPorTime: number;
  historico: EntradaHistorico[];
};

type RespostaEstado = { draft: DraftPublico | null; souCapitaoDe: string | null; agoraServidorISO?: string };

/**
 * Hora do servidor menos a do aparelho (ms), medida a cada sondagem. A TV da sala pode
 * estar com o relógio errado; sem a correção, o cronômetro projetado mostrava 0:00 com
 * tempo sobrando. Uma variável de módulo basta: a transmissão é uma por página.
 */
let defasagemDoServidorMs = 0;

// ---------------------------------------------------------------- tempos do handoff

/** Quanto os nomes rolam antes de travar no capitão. */
const ROLAGEM_MS = 2600;
/** Quanto a revelação de cada escolha fica na tela. */
const REVELACAO_MS = 2400;
/** Com mais escolhas esperando na fila, cada uma fica menos — a TV não pode se atrasar. */
const REVELACAO_EM_FILA_MS = 1500;
/**
 * Teto da fila de revelação. Duas cobrem a virada da serpentina (o mesmo time escolhe duas
 * vezes seguidas). Mais que isso só acontece quando a TV volta de queda de rede ou de aba em
 * segundo plano — e aí reprisar minutos de escolhas cobriria o quadro ao vivo por N × 1,5 s.
 */
const MAXIMO_NA_FILA = 2;
/** A partir daqui o cronômetro fica vermelho e pulsa. */
const URGENTE_S = 10;

// ---------------------------------------------------------------- peças

/**
 * O rótulo pequeno do handoff: 10–11px, caps, muito espaçado.
 *
 * `textTransform` no estilo, e não `.toUpperCase()` no texto: as traduções vêm em caixa
 * mista ("Escolha", "Rodada") e caber a decisão ao CSS mantém o texto legível no arquivo
 * de i18n — além de funcionar igual em inglês.
 */
const kicker = (cor: string, espaco: string): CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: espaco,
  textTransform: "uppercase",
  color: cor,
});

/** "1º" em português, "1st/2nd/3rd/4th" em inglês: os moldes vêm do idioma da página. */
function ordinal(n: number, t: Rotulos): string {
  const resto100 = n % 100;
  const resto10 = n % 10;
  const molde =
    resto100 >= 11 && resto100 <= 13
      ? t.ordinalOutros
      : resto10 === 1
        ? t.ordinalUm
        : resto10 === 2
          ? t.ordinalDois
          : resto10 === 3
            ? t.ordinalTres
            : t.ordinalOutros;
  return molde.replace("{n}", String(n));
}

/**
 * A frase da ordem com o número REAL de times. Era cravada em "1-2-3-4-5-6 · 6-5-4-3-2-1",
 * e com 25 a 29 aprovados (5 times) a TV anunciava um 6º time que não existe.
 */
function fraseDaSerpentina(times: number, t: Rotulos): string {
  const ida = Array.from({ length: times }, (_, i) => i + 1);
  return `${t.ordemSerpentina} ${ida.join("-")} · ${[...ida].reverse().join("-")} · ${t.eRepete}`;
}

/** A cor do time por posição, do handoff — com a do banco como reserva. */
function corDoTime(time: TimePublico, indice: number): string {
  return CORES_DOS_TIMES[indice] ?? time.cor;
}

function abrevDaRota(rota: string): string {
  const chave = rota.trim().toUpperCase();
  const achada = ROTAS_DO_DRAFT.find((r) => r.chave === chave || r.abrev === chave);
  if (achada) return achada.abrev;
  // "SELVA"/"JUNGLE" e afins caem aqui: o handoff abrevia selva como JG.
  if (chave.startsWith("J") || chave.startsWith("S")) return "JG";
  return chave.slice(0, 3) || "—";
}

/** Uma linha de elenco: etiqueta de rota, nick, elo e pontos. */
function Slot({
  jogador,
  cor,
  compacto,
  t,
}: Readonly<{
  jogador: JogadorDoElenco | null;
  cor: string;
  compacto: boolean;
  t: Rotulos;
}>) {
  const capitao = jogador?.capitao === true;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: compacto ? "6px 8px" : "7px 9px",
        borderRadius: 6,
        background: jogador ? (capitao ? D.capitao : D.superficie) : D.superficieVazia,
        border: `1px solid ${capitao ? alfa(cor, "66") : D.borda4}`,
      }}
    >
      <span
        style={{
          flex: "none",
          display: "grid",
          placeItems: "center",
          width: 30,
          height: 20,
          borderRadius: 3,
          background: D.borda4,
          fontFamily: DISPLAY,
          fontSize: 9.5,
          fontWeight: 700,
          letterSpacing: ".06em",
          color: jogador ? cor : D.rotuloVazio,
        }}
      >
        {jogador ? abrevDaRota(jogador.rota1) : "—"}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: jogador ? D.texto : D.vazio,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {jogador ? jogador.riotId : "—"}
        </span>
        <span style={{ display: "block", fontSize: 10.5, color: D.mudo2 }}>
          {jogador
            ? capitao
              ? `${t.capitao.toUpperCase()} · ${resolveElo(jogador.elo)?.label ?? jogador.elo}`
              : (resolveElo(jogador.elo)?.label ?? jogador.elo)
            : t.vagaAberta}
        </span>
      </span>
      <span
        style={{
          flex: "none",
          fontFamily: DISPLAY,
          fontSize: 13,
          fontWeight: 700,
          color: jogador ? D.ouro : D.vazioPts,
        }}
      >
        {jogador ? jogador.pontos : "·"}
      </span>
    </div>
  );
}

/**
 * As 5 linhas de um time.
 *
 * O elenco vem como lista, e o desenho pede 5 linhas fixas — então as vagas vazias
 * completam até `jogadoresPorTime`. O capitão vem primeiro, como no handoff.
 */
function linhasDoTime(elenco: readonly JogadorDoElenco[], quantas: number) {
  const ordenado = [...elenco].sort((a, b) => Number(b.capitao) - Number(a.capitao));
  const linhas: (JogadorDoElenco | null)[] = [...ordenado];
  while (linhas.length < quantas) linhas.push(null);
  return linhas.slice(0, Math.max(quantas, ordenado.length));
}

// ---------------------------------------------------------------- cronômetro

function useSegundosRestantes(prazoISO: string | null, ativo: boolean): number | null {
  const [restante, setRestante] = useState<number | null>(null);

  useEffect(() => {
    /*
     * NENHUM `setState` síncrono aqui — nem para zerar.
     *
     * O caminho "sem prazo" também passa pelo relógio de 0ms: `setState` direto no corpo
     * do efeito dispara render em cascata, e este componente re-renderiza a cada sondagem
     * de 2s. O lint da casa barra, e com razão.
     */
    const alvo = prazoISO && ativo ? new Date(prazoISO).getTime() : null;
    const marcar = () =>
      setRestante(
        alvo === null ? null : Math.max(0, Math.ceil((alvo - (Date.now() + defasagemDoServidorMs)) / 1000)),
      );

    const primeira = window.setTimeout(marcar, 0);
    const cadencia = alvo === null ? null : window.setInterval(marcar, 250);

    return () => {
      window.clearTimeout(primeira);
      if (cadencia !== null) window.clearInterval(cadencia);
    };
  }, [prazoISO, ativo]);

  return restante;
}

// ---------------------------------------------------------------- fases

/** Fase vazia: o hexágono do handoff. */
function Vazio({ t }: Readonly<{ t: Rotulos }>) {
  return (
    <div style={{ maxWidth: 640, margin: "90px auto", textAlign: "center", padding: "0 24px" }}>
      <div
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 70,
          height: 74,
          margin: "0 auto",
          background: "linear-gradient(150deg,#3a2517,#241610)",
          color: "#7a5a3a",
          fontSize: 26,
          clipPath: "polygon(50% 0,100% 26%,100% 74%,50% 100%,0 74%,0 26%)",
        }}
      >
        ◆
      </div>
      <h1
        style={{
          margin: "24px 0 0",
          fontFamily: DISPLAY,
          fontSize: 34,
          fontWeight: 700,
          color: D.titulo,
        }}
      >
        {t.vazioTitulo}
      </h1>
      <p style={{ margin: "12px 0 0", fontSize: 15, lineHeight: 1.6, color: D.secundario2 }}>
        {t.vazioTexto}
      </p>
    </div>
  );
}

/**
 * Fase de sorteio: os nomes rolam e travam nos capitães.
 *
 * A rolagem é ENCENAÇÃO — os capitães já foram sorteados no servidor quando a
 * organização montou o draft, e esta tela só revela. Mesmo princípio da roleta da
 * partida: o giro não decide nada.
 */
function Sorteio({
  draft,
  t,
  nomesParaRolar,
}: Readonly<{ draft: DraftPublico; t: Rotulos; nomesParaRolar: readonly string[] }>) {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const relogio = window.setTimeout(() => setPronto(true), ROLAGEM_MS);
    return () => window.clearTimeout(relogio);
  }, []);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px 60px", textAlign: "center" }}>
      <div style={{ ...kicker(D.kickerOuro, ".3em"), fontSize: 11 }}>{t.sorteioKicker}</div>
      <h1
        style={{
          margin: "12px 0 0",
          fontFamily: DISPLAY,
          fontSize: "clamp(30px,5vw,52px)",
          fontWeight: 700,
          color: D.titulo,
        }}
      >
        {t.sorteioTitulo}
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(168px,1fr))",
          gap: 10,
          marginTop: 32,
        }}
      >
        {draft.times.map((time, i) => {
          const cor = corDoTime(time, i);
          const elenco = draft.elencos[time.id] ?? [];
          const capitao = elenco.find((j) => j.capitao);
          return (
            <div
              key={time.id}
              style={{
                padding: "16px 14px",
                background: D.painel,
                border: `1px solid ${pronto ? alfa(cor, "66") : D.borda}`,
                borderRadius: 10,
                // Propriedades nomeadas, nunca `all`: um `opacity` acrescentado aqui um dia
                // entraria na transição calado (ver a regra da opacidade em globals.css).
                transition: "border-color .4s, box-shadow .4s",
                boxShadow: pronto ? `0 0 30px ${alfa(cor, "1f")}` : "none",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  marginBottom: 8,
                  padding: "3px 8px",
                  borderRadius: 4,
                  background: D.borda4,
                  ...kicker(D.kicker, ".14em"),
                }}
              >
                {ordinal(i + 1, t)}
              </div>
              <div
                style={{
                  fontFamily: DISPLAY,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: ".14em",
                  color: cor,
                }}
              >
                {time.nome}
              </div>

              <div style={{ height: 34, overflow: "hidden", marginTop: 10 }}>
                <div
                  style={
                    pronto ? undefined : { animation: "lobdSpinNames .42s linear infinite" }
                  }
                >
                  {(pronto ? [time.capitaoRiotId] : nomesParaRolar).map((nome, k) => (
                    <div
                      key={`${nome}-${k}`}
                      style={{
                        height: 34,
                        lineHeight: "34px",
                        fontFamily: DISPLAY,
                        fontSize: 16,
                        fontWeight: 700,
                        color: D.tituloSuave,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {nome}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 12, color: D.mudo, marginTop: 6 }}>
                {pronto && capitao
                  ? `${resolveElo(capitao.elo)?.label ?? capitao.elo} · ${capitao.pontos} ${t.pontos} · ${abrevDaRota(capitao.rota1)}`
                  : t.sorteando}
              </div>
            </div>
          );
        })}
      </div>

      {pronto ? (
        <div style={{ marginTop: 34, animation: "lobdRise .5s ease both" }}>
          <p style={{ margin: "0 0 16px", fontSize: 14, color: D.secundario2 }}>
            {fraseDaSerpentina(draft.times.length, t)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** Fase ao vivo: barra de status, trilho, grade de times e pool. */
function AoVivo({
  draft,
  t,
  emTv,
  onAlternarTv,
}: Readonly<{
  draft: DraftPublico;
  t: Rotulos;
  emTv: boolean;
  onAlternarTv: () => void;
}>) {
  const indiceDaVez = draft.times.findIndex((x) => x.id === draft.timeDaVezId);
  const daVez = indiceDaVez >= 0 ? draft.times[indiceDaVez]! : draft.times[0]!;
  const corDaVez = corDoTime(daVez, Math.max(0, indiceDaVez));

  const rodando = draft.fase === "rodando";
  const restante = useSegundosRestantes(draft.prazoISO, rodando);
  const urgente = rodando && restante !== null && restante <= URGENTE_S;

  const rodada = Math.floor(draft.escolhaAtual / Math.max(1, draft.times.length)) + 1;
  const rodadas = Math.max(1, Math.ceil(draft.totalEscolhas / Math.max(1, draft.times.length)));

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: emTv ? "100vh" : "calc(100vh - 60px)",
      }}
    >
      {/* a) barra de status */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "14px 22px",
          background: D.barraTopo,
          borderBottom: `1px solid ${D.borda}`,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={kicker(D.kicker, ".26em")}>
            {t.rodada} {rodada} {t.de} {rodadas}
          </div>
          <div
            style={{
              fontFamily: DISPLAY,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: ".1em",
              color: D.tituloSuave,
            }}
          >
            {t.escolhaLivre}
          </div>
        </div>

        <div aria-hidden style={{ width: 1, height: 38, background: D.borda }} />

        {/* Base de 200px: abaixo disso o bloco desce para a própria linha em vez de espremer
            o nome do time da vez (a 320px ele ficava com ~44px e o nome vazava). */}
        <div style={{ flex: "1 1 200px", minWidth: 0 }}>
          <div style={kicker(D.kicker, ".26em")}>
            {t.escolha} {Math.min(draft.escolhaAtual + 1, draft.totalEscolhas)} {t.de}{" "}
            {draft.totalEscolhas} · {t.naVez}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2, flexWrap: "wrap" }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                background: corDaVez,
                animation: "lobdPulse 1.1s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: DISPLAY,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: ".08em",
                color: corDaVez,
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
            >
              {daVez.nome}
            </span>
            <span style={{ fontSize: 14, color: D.secundario2, minWidth: 0, overflowWrap: "anywhere" }}>
              {t.capitaoAbrev} {daVez.capitaoRiotId}
            </span>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={kicker(D.kicker, ".26em")}>{t.orcamentoRestante}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: D.ouro }}>
            {draft.orcamentoPorTime - daVez.gasto} {t.pontos}
          </div>
        </div>

        <div
          style={{
            flex: "none",
            minWidth: 92,
            textAlign: "center",
            fontFamily: DISPLAY,
            fontSize: 42,
            fontWeight: 700,
            lineHeight: 1,
            color: urgente ? D.urgente : D.tituloSuave,
            animation: urgente ? "lobdUrgent .7s ease-in-out infinite" : "none",
          }}
        >
          {restante === null ? "--" : String(restante).padStart(2, "0")}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            type="button"
            onClick={onAlternarTv}
            style={{
              flex: "none",
              padding: "7px 13px",
              border: `1px solid ${D.bordaBotao}`,
              borderRadius: 5,
              background: D.superficieEscura,
              color: "#a8968a",
              fontFamily: DISPLAY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: ".14em",
              cursor: "pointer",
            }}
          >
            {emTv ? t.sairDaTv : t.modoTv}
          </button>
        </div>
      </div>

      {/* b) faixa de espectador — esta tela é sempre de leitura */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "7px 22px",
          background: D.faixa,
          borderBottom: `1px solid ${D.borda3}`,
          flexWrap: "wrap",
        }}
      >
        <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: D.ouro }} />
        <span style={{ ...kicker(D.kickerOuro, ".2em") }}>{t.espectador}</span>
        <span style={{ fontSize: 12.5, color: D.secundario2 }}>{t.espectadorTexto}</span>
      </div>

      {/* c) trilho da ordem */}
      <div
        className="lob-scroll"
        style={{
          display: "flex",
          gap: 3,
          padding: "9px 22px",
          background: D.superficieEscura,
          borderBottom: `1px solid ${D.borda4}`,
          overflowX: "auto",
        }}
      >
        {Array.from({ length: draft.totalEscolhas }, (_, i) => {
          // A ordem serpentina: ímpares 1→N, pares N→1.
          const n = draft.times.length;
          const rodadaDoChip = Math.floor(i / n);
          const dentro = i % n;
          const indice = rodadaDoChip % 2 === 0 ? dentro : n - 1 - dentro;
          const time = draft.times[indice]!;
          const cor = corDoTime(time, indice);
          const feito = i < draft.escolhaAtual;
          const agora = i === draft.escolhaAtual;
          return (
            <span
              key={i}
              style={{
                flex: "none",
                display: "grid",
                placeItems: "center",
                minWidth: 26,
                height: 22,
                borderRadius: 4,
                fontFamily: DISPLAY,
                fontSize: 11,
                fontWeight: 700,
                color: agora || feito ? D.superficieEscura : cor,
                background: agora ? cor : feito ? alfa(cor, "99") : "transparent",
                border: `1px solid ${agora ? cor : alfa(cor, "55")}`,
                animation: agora ? "lobdGlow 1.6s ease-in-out infinite" : "none",
              }}
            >
              {i + 1}
            </span>
          );
        })}
      </div>

      {/* d) grade dos times
          As colunas moram na classe `.lobd-grade-times` (app/globals.css), e não no estilo
          inline: só a classe aceita @media. A partir de 900px são N colunas fixas (N vem da
          variável `--times`), então os times ficam TODOS lado a lado — na TV de 1920px, no
          notebook e no projetor de 1024×768. Abaixo de 900px (tablet em pé, celular) vale
          `auto-fit` com mínimo de 180px: quantas couberem, e o resto desce de linha.

          Só `auto-fit` em qualquer largura deixava 5 + 1 entre 976 e 1163px (6 trilhas de
          180px pedem 1164px): no projetor o 6º time descia para uma 2ª linha, e numa TV que
          ninguém rola ele saía da transmissão. E só N fixas em qualquer largura deixava cada
          coluna com ~48px no celular — o nick sumia e os pontos vazavam na vizinha. */}
      <div
        className="lob-scroll lobd-grade-times"
        style={
          {
            flex: 1,
            display: "grid",
            "--times": Math.max(1, draft.times.length),
            gap: 8,
            padding: "14px 22px",
            minHeight: 0,
            overflow: "auto",
          } as CSSProperties
        }
      >
        {draft.times.map((time, i) => {
          const cor = corDoTime(time, i);
          const naVez = time.id === draft.timeDaVezId;
          const elenco = draft.elencos[time.id] ?? [];
          const pct = Math.min(100, Math.round((time.gasto / Math.max(1, draft.orcamentoPorTime)) * 100));
          return (
            <div
              key={time.id}
              style={{
                display: "flex",
                flexDirection: "column",
                minWidth: 0,
                overflow: "hidden",
                background: D.painelColuna,
                border: `1px solid ${naVez ? cor : D.borda2}`,
                borderRadius: 9,
                boxShadow: naVez ? `0 0 34px ${alfa(cor, "26")}` : "none",
                transition: "border-color .25s, box-shadow .25s",
              }}
            >
              <div
                style={{
                  padding: "11px 12px",
                  borderBottom: `1px solid ${D.borda4}`,
                  background: naVez ? alfa(cor, "14") : "transparent",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: ".12em",
                      color: cor,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {time.nome}
                  </span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 11, color: D.mudo }}>#{i + 1}</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 5 }}>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 24,
                      fontWeight: 700,
                      lineHeight: 1,
                      color: D.tituloSuave,
                    }}
                  >
                    {draft.orcamentoPorTime - time.gasto}
                  </span>
                  <span style={{ fontSize: 11, color: D.mudo }}>
                    {t.pontosLivres} {draft.orcamentoPorTime}
                  </span>
                </div>
                <div
                  style={{
                    marginTop: 7,
                    height: 5,
                    background: D.borda4,
                    borderRadius: 99,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, ${cor}, #f7bd5c)`,
                      transition: "width .8s cubic-bezier(.22,1,.36,1)",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: 8 }}>
                {linhasDoTime(elenco, draft.jogadoresPorTime).map((jogador, k) => (
                  <Slot key={jogador?.riotId ?? `vaga-${k}`} jogador={jogador} cor={cor} compacto t={t} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* e) pool disponível */}
      <div style={{ borderTop: `1px solid ${D.borda}`, background: D.superficieEscura }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 22px 0", flexWrap: "wrap" }}>
          <span style={{ ...kicker(D.kicker, ".24em") }}>{t.poolDisponivel}</span>
          <span style={{ fontSize: 12, color: D.mudo2 }}>
            {draft.disponiveis.length} {t.jogadores} · {t.poolNota}
          </span>
        </div>
        <div
          className="lob-scroll"
          style={{ display: "flex", gap: 6, padding: "10px 22px 14px", overflowX: "auto" }}
        >
          {[...draft.disponiveis]
            .sort((a, b) => b.pontos - a.pontos)
            .map((jogador) => {
              const elo = resolveElo(jogador.elo);
              // "Cabe" é só orçamento (o motor não tem regra de rota), mas é o TETO DA
              // ESCOLHA, não o saldo: cada vaga que ainda falta preencher reserva 1
              // ponto, senão o time fica sem como completar o elenco. É a mesma conta de
              // `tetoDaEscolha` (lib/draft/motor.ts) e do painel do capitão.
              //
              // Com o saldo cru, a transmissão marcava como disponível quem o capitão da
              // vez seria RECUSADO ao escolher — a plateia via um nome ao alcance do time
              // e o clique voltava erro.
              const teto =
                daVez.vagas > 0 ? draft.orcamentoPorTime - daVez.gasto - (daVez.vagas - 1) : 0;
              // Com a lista do motor (orçamento + os elencos de todos continuarem fechando),
              // a TV não oferece à plateia quem o servidor recusaria. Sem ela, a conta antiga.
              const cabe = draft.escolhiveis ? draft.escolhiveis.includes(jogador.id) : jogador.pontos <= teto;
              return (
                <div
                  key={jogador.id}
                  style={{
                    flex: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    width: 196,
                    padding: "8px 11px",
                    borderRadius: 7,
                    background: cabe ? D.superficie : D.superficieVazia,
                    border: `1px solid ${cabe ? D.bordaPool : D.bordaPoolFora}`,
                    opacity: cabe ? 1 : 0.42,
                  }}
                >
                  <span aria-hidden style={emblemaDeElo(elo?.key ?? "ferro", 26)} />
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <span
                      style={{
                        display: "block",
                        fontFamily: DISPLAY,
                        fontSize: 13,
                        fontWeight: 600,
                        color: D.tituloSuave,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {jogador.riotId}
                    </span>
                    <span style={{ display: "block", fontSize: 10.5, color: D.mudo }}>
                      {abrevDaRota(jogador.rota1)} / {abrevDaRota(jogador.rota2)} ·{" "}
                      {elo?.label ?? jogador.elo}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 15,
                      fontWeight: 700,
                      color: cabe ? D.ouro : "#5a4a3f",
                    }}
                  >
                    {jogador.pontos}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

/** Fase final: título com brilho, elencos e confete. */
function Fim({ draft, t }: Readonly<{ draft: DraftPublico; t: Rotulos }>) {
  const [confete, setConfete] = useState<readonly { x: number; dx: number; rot: number; w: number; h: number; cor: string; dur: number; atraso: number }[]>([]);

  useEffect(() => {
    // Sorteado num efeito: `Math.random()` durante o render é impuro, e o papel picado
    // pularia de lugar a cada re-render da sondagem.
    const t0 = window.setTimeout(() => {
      setConfete(
        Array.from({ length: 90 }, () => ({
          x: Math.random() * 100,
          dx: (Math.random() - 0.5) * 260,
          rot: 360 + Math.random() * 900,
          w: 5 + Math.random() * 7,
          h: 9 + Math.random() * 13,
          cor: CORES_DOS_TIMES[Math.floor(Math.random() * CORES_DOS_TIMES.length)]!,
          dur: 3 + Math.random() * 3,
          atraso: Math.random() * 1.2,
        })),
      );
    }, 0);
    return () => window.clearTimeout(t0);
  }, []);

  return (
    <div style={{ position: "relative", padding: "44px 24px 70px", overflow: "hidden" }}>
      <div style={{ position: "relative", maxWidth: 1240, margin: "0 auto", textAlign: "center" }}>
        <div style={{ ...kicker(D.kickerOuro, ".3em"), fontSize: 11 }}>{t.fimKicker}</div>
        <h1
          style={{
            margin: "12px 0 0",
            fontFamily: DISPLAY,
            fontSize: "clamp(32px,6vw,64px)",
            fontWeight: 700,
            backgroundImage:
              "linear-gradient(100deg,#f7e7d2,#f0a83c 40%,#fff3dd 55%,#dd8324 75%,#f7e7d2)",
            backgroundSize: "220% 100%",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            // Folga para o til de "FORMADOS"/"TIMES" não ficar sem tinta: o gradiente
            // recortado só existe dentro da caixa. Mesma armadilha da `.lob-h1`.
            padding: "0.12em 0 0.2em",
            animation: "lobdSheen 7s linear infinite",
          }}
        >
          {t.timesFormados}
        </h1>
        <p style={{ margin: "12px 0 0", fontSize: 15, color: D.secundario2 }}>{t.fimTexto}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(196px,1fr))",
            gap: 10,
            marginTop: 34,
            textAlign: "left",
          }}
        >
          {draft.times.map((time, i) => {
            const cor = corDoTime(time, i);
            const elenco = draft.elencos[time.id] ?? [];
            return (
              <div
                key={time.id}
                style={{
                  background: D.painelColuna,
                  border: `1px solid ${alfa(cor, "55")}`,
                  borderRadius: 10,
                  boxShadow: `0 0 34px ${alfa(cor, "1a")}`,
                }}
              >
                <div
                  style={{
                    padding: "13px 14px",
                    borderBottom: `1px solid ${D.borda4}`,
                    background: alfa(cor, "12"),
                  }}
                >
                  <div
                    style={{
                      fontFamily: DISPLAY,
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: ".14em",
                      color: cor,
                    }}
                  >
                    {time.nome}
                  </div>
                  <div style={{ fontSize: 12, color: D.secundario2 }}>
                    {time.gasto} {t.de} {draft.orcamentoPorTime} {t.pontosUsados}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: 9 }}>
                  {linhasDoTime(elenco, draft.jogadoresPorTime).map((jogador, k) => (
                    <Slot
                      key={jogador?.riotId ?? `vaga-${k}`}
                      jogador={jogador}
                      cor={cor}
                      compacto={false}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confete.map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={
            {
              position: "absolute",
              top: 0,
              left: `${c.x}%`,
              width: c.w,
              height: c.h,
              background: c.cor,
              "--dx": `${c.dx}px`,
              "--rot": `${c.rot}deg`,
              animation: `lobdConfetti ${c.dur}s linear ${c.atraso}s forwards`,
              pointerEvents: "none",
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** A revelação de cada escolha — 2400ms, exatamente como o handoff pede. */
function Revelacao({
  entrada,
  draft,
  t,
}: Readonly<{ entrada: EntradaHistorico; draft: DraftPublico; t: Rotulos }>) {
  const indice = draft.times.findIndex((x) => x.id === entrada.timeId);
  const time = indice >= 0 ? draft.times[indice]! : draft.times[0]!;
  const cor = corDoTime(time, Math.max(0, indice));
  const jogador = (draft.elencos[entrada.timeId] ?? []).find((j) => j.riotId === entrada.riotId);
  const elo = jogador ? resolveElo(jogador.elo) : null;

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "grid",
        placeItems: "center",
        background: "rgba(6,4,3,.86)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        padding: 16,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(50% 50% at 50% 50%, ${alfa(cor, "66")}, transparent 70%)`,
          animation: "lobdFlash .9s ease-out both",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "relative",
          // No celular o cartão não passa da tela: Riot ID longo e sem espaço
          // ("Gar3naTheBestMid#BR1" a 30px tem ~345px) quebra em vez de ser cortado.
          maxWidth: "100%",
          padding: "38px clamp(20px,5vw,46px)",
          background: "linear-gradient(160deg,#1c1109,#0d0806)",
          border: `1px solid ${cor}`,
          borderRadius: 14,
          textAlign: "center",
          boxShadow: `0 0 90px ${alfa(cor, "44")}`,
          animation: "lobdSlam .62s cubic-bezier(.2,1.5,.4,1) both",
        }}
      >
        <div style={{ ...kicker(cor, ".32em"), fontSize: 11 }}>
          {entrada.automatica ? t.tempoEsgotado : t.escolhido}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <span aria-hidden style={emblemaDeElo(elo?.key ?? "ferro", 96)} />
          <div style={{ textAlign: "left", minWidth: 0, maxWidth: "100%" }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(30px,5vw,56px)",
                fontWeight: 700,
                lineHeight: 1,
                color: D.titulo,
                overflowWrap: "anywhere",
              }}
            >
              {entrada.riotId}
            </div>
            <div style={{ marginTop: 7, fontSize: 15, color: D.secundario }}>
              {elo?.label ?? jogador?.elo ?? ""}
              {jogador ? ` · ${abrevDaRota(jogador.rota1)}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "center", paddingLeft: 18, borderLeft: `1px solid ${D.bordaBotao}` }}>
            <div
              style={{
                fontFamily: DISPLAY,
                fontSize: "clamp(34px,5vw,60px)",
                fontWeight: 700,
                lineHeight: 1,
                color: D.ouro,
              }}
            >
              {jogador?.pontos ?? "—"}
            </div>
            <div style={{ ...kicker(D.kicker, ".2em"), fontSize: 11 }}>
              {t.pontos}
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: `1px solid ${D.borda3}`,
            fontFamily: DISPLAY,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: ".14em",
            color: cor,
          }}
        >
          → {time.nome}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- transmissão

export default function Transmissao({ t }: Readonly<{ t: Rotulos }>) {
  const [draft, setDraft] = useState<DraftPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falhando, setFalhando] = useState(false);
  const [emTv, setEmTv] = useState(false);
  const [revelando, setRevelando] = useState<EntradaHistorico | null>(null);

  /** Quantas escolhas já tínhamos visto — o que passar disto é notícia. */
  const vistas = useRef<number | null>(null);
  const relogioDaRevelacao = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Escolhas que já entraram e ainda esperam a vez de ser reveladas, na ordem do histórico. */
  const filaDeRevelacao = useRef<EntradaHistorico[]>([]);

  /**
   * Põe na tela a próxima da fila e agenda a seguinte; com a fila vazia, tira a revelação.
   * Com mais escolhas esperando, cada uma fica `REVELACAO_EM_FILA_MS` em vez dos 2400ms.
   */
  const revelarProxima = useCallback(function proxima() {
    const entrada = filaDeRevelacao.current.shift() ?? null;
    setRevelando(entrada);
    relogioDaRevelacao.current = entrada
      ? setTimeout(proxima, filaDeRevelacao.current.length > 0 ? REVELACAO_EM_FILA_MS : REVELACAO_MS)
      : null;
  }, []);

  /**
   * Sondagem de 2 em 2 segundos. Nada de websocket: a CSP do site tem
   * `connect-src 'self'` e derrubaria a conexão.
   *
   * Três cuidados que a transmissão não pode perder:
   * · `emVoo` evita que duas requisições se atropelem numa rede lenta e que a resposta
   *   antiga chegue depois da nova, fazendo o quadro andar para trás;
   * · `vivo` descarta a resposta que chega depois de a tela ter sido desmontada;
   * · falha de rede NÃO limpa `draft`. Dois segundos de oscilação não podem zerar o
   *   quadro na TV — fica o último estado bom e um aviso discreto.
   */
  useEffect(() => {
    let vivo = true;
    let emVoo = false;

    const sondar = async () => {
      if (emVoo) return;
      emVoo = true;
      try {
        const resposta = await fetch("/api/draft/estado", {
          // Prazo na sondagem. Sem ele, uma requisição PENDURADA (socket morto sem
          // RST — o sistema só desiste depois de minutos) trava o sinalizador de "em
          // voo": o intervalo de 2s dispara dezenas de vezes e nenhuma requisição sai.
          // A TV da sala fica parada numa escolha que já passou, com o cronômetro em
          // 0:00 e sem nenhum aviso.
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });
        if (!resposta.ok) throw new Error(String(resposta.status));
        const corpo = (await resposta.json()) as RespostaEstado;
        if (!vivo) return;
        const servidorMs = corpo.agoraServidorISO ? Date.parse(corpo.agoraServidorISO) : Number.NaN;
        if (Number.isFinite(servidorMs)) defasagemDoServidorMs = servidorMs - Date.now();
        setDraft(corpo.draft);
        setFalhando(false);
      } catch {
        if (vivo) setFalhando(true);
      } finally {
        emVoo = false;
        if (vivo) setCarregando(false);
      }
    };

    // A primeira sondagem sai num setTimeout(…, 0), e não direto no corpo do efeito:
    // além de casar com `react-hooks/set-state-in-effect`, deixa a primeira pintura
    // acontecer antes de a rede entrar em cena.
    const inicial = window.setTimeout(() => void sondar(), 0);
    const cadencia = window.setInterval(() => void sondar(), 2000);
    return () => {
      vivo = false;
      window.clearTimeout(inicial);
      window.clearInterval(cadencia);
    };
  }, []);

  /**
   * Revelação: dispara quando o histórico CRESCE entre duas sondagens.
   *
   * A primeira leitura só anota o tamanho — sem isso, quem abre a transmissão no meio do
   * draft levaria na cara a revelação de uma escolha que aconteceu dez minutos antes.
   *
   * TODAS as escolhas novas entram na fila, não só a última. Na virada da serpentina o
   * mesmo time escolhe duas vezes seguidas, e o capitão recebe o estado novo na resposta
   * do clique — a segunda escolha pode chegar antes da próxima sondagem da TV (o mesmo
   * vale para um auto-pick seguido de escolha rápida). Revelando só `historico[total - 1]`,
   * a primeira aparecia calada na coluna.
   */
  useEffect(() => {
    if (!draft) return;
    const total = draft.historico.length;

    if (vistas.current === null) {
      vistas.current = total;
      return;
    }
    if (total <= vistas.current) {
      // Encolheu: sorteio novo. O que esperava na fila era do draft anterior.
      if (total < vistas.current) filaDeRevelacao.current = [];
      vistas.current = total;
      return;
    }

    // Só as mais recentes: as anteriores já estão na grade, e a escolha ao vivo corre por baixo.
    filaDeRevelacao.current = [...filaDeRevelacao.current, ...draft.historico.slice(vistas.current, total)].slice(
      -MAXIMO_NA_FILA,
    );
    vistas.current = total;
    // Já há uma revelação na tela: as novas esperam o relógio dela.
    if (relogioDaRevelacao.current === null) revelarProxima();
  }, [draft, revelarProxima]);

  useEffect(
    () => () => {
      if (relogioDaRevelacao.current) clearTimeout(relogioDaRevelacao.current);
      relogioDaRevelacao.current = null;
    },
    [],
  );

  /* O modo TV esconde o cabeçalho do site — a classe vive no <html> porque o cabeçalho
     está fora desta árvore. */
  useEffect(() => {
    const raiz = document.documentElement;
    if (emTv) raiz.classList.add("lobd-tv");
    else raiz.classList.remove("lobd-tv");
    return () => raiz.classList.remove("lobd-tv");
  }, [emTv]);

  const alternarTv = useCallback(() => setEmTv((v) => !v), []);

  /** Nomes embaralhados para a rolagem do sorteio. Estáveis por render do draft. */
  const nomesParaRolar = useMemo(() => {
    if (!draft) return [];
    const todos = [
      ...draft.disponiveis.map((j) => j.riotId),
      ...draft.times.map((x) => x.capitaoRiotId),
    ];
    // Duplicado de propósito: `lobdSpinNames` translada -50%, então a lista precisa ter
    // duas voltas para o laço não dar um salto visível.
    return [...todos.slice(0, 8), ...todos.slice(0, 8)];
  }, [draft]);

  const aviso = falhando ? (
    <p
      role="status"
      style={{
        margin: "10px 22px 0",
        padding: "6px 10px",
        borderRadius: 4,
        border: `1px solid ${alfa(D.ouro, "59")}`,
        background: "rgba(239,166,63,.07)",
        fontSize: 11,
        color: "#f3d69a",
      }}
    >
      {t.erroGenerico}
    </p>
  ) : null;

  const palco: CSSProperties = {
    minHeight: emTv ? "100vh" : "calc(100vh - 60px)",
    display: "flex",
    flexDirection: "column",
    background: D.fundo,
    backgroundImage: D.textura,
    color: D.texto,
  };

  if (carregando) {
    return (
      <div style={palco}>
        <div style={{ margin: "90px auto", ...kicker(D.kicker, ".3em"), fontSize: 11 }}>—</div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div style={palco}>
        {aviso}
        <Vazio t={t} />
      </div>
    );
  }

  return (
    <div style={palco}>
      {aviso}
      {/*
        PAUSA na transmissão.

        O painel do capitão já tratava `pausado` (mostra `t.pausado`/`t.pausadoTexto`),
        mas a transmissão caía no `else` e desenhava a tela de draft rodando — idêntica.
        Na tela projetada, pausar não mudava NADA: o cronômetro só parava de andar, o
        que dá para confundir com atraso da sondagem. Ninguém na sala sabia se o draft
        tinha sido interrompido de propósito ou se a transmissão tinha travado.

        Faixa sólida, sem animar opacidade — a regra do projeto (ver .lob-fade e
        page-shell): estado "apagado" se comunica com cor e texto, nunca com
        transparência, que já apagou o site quatro vezes.
      */}
      {draft.fase === "pausado" ? (
        <div
          role="status"
          style={{
            margin: "10px 22px 0",
            padding: "14px 20px",
            borderRadius: 6,
            border: `2px solid ${D.ouro}`,
            background: "rgba(239,166,63,.14)",
            textAlign: "center",
          }}
        >
          <div style={{ ...kicker(D.ouro, ".3em"), fontSize: 20, fontWeight: 700 }}>
            {t.pausado}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#f3d69a" }}>
            {draft.motivoDaPausa === "atraso"
              ? t.pausadoAtrasoTexto
              : draft.motivoDaPausa === "sem_jogador"
                ? t.pausadoSemJogadorTexto
                : t.pausadoTexto}
          </div>
        </div>
      ) : null}
      {draft.fase === "preparando" ? (
        // `key` pela semente: um NOVO sorteio com a TV já na tela remonta a animação. Sem
        // isso os capitães trocavam de lugar sem girar, e a plateia nem via o re-sorteio.
        <Sorteio key={draft.sorteioId ?? "sorteio"} draft={draft} t={t} nomesParaRolar={nomesParaRolar} />
      ) : draft.fase === "encerrado" ? (
        <Fim draft={draft} t={t} />
      ) : (
        <AoVivo draft={draft} t={t} emTv={emTv} onAlternarTv={alternarTv} />
      )}
      {revelando ? <Revelacao entrada={revelando} draft={draft} t={t} /> : null}
    </div>
  );
}
