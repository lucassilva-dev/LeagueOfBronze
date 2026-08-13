"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import { resolveElo, resolveRole } from "@/lib/design";
import type { Messages } from "@/lib/i18n/messages";

type Rotulos = Messages["draft"];

/**
 * A transmissão pública do draft: quadro aberto, sem login, atualizado por sondagem.
 *
 * Duas plateias ao mesmo tempo, e o layout tem de servir às duas: quem abre no celular
 * pelo grupo do WhatsApp (coluna única, texto que não estoura) e quem joga na TV da
 * sala (cronômetro e time da vez legíveis do sofá). Daí `clamp()` em quase todo
 * tamanho de fonte e grades `auto-fit` em vez de contagens fixas de coluna.
 */

// ------------------------------------------------------------------ contrato

/**
 * O formato de /api/draft/estado, redeclarado aqui de propósito.
 *
 * `DraftPublico` mora em lib/draft/store.ts, que lê o banco; importar o tipo de lá
 * arrastaria o módulo inteiro (e o cliente do Supabase) para o pacote do navegador só
 * para ter uma anotação de tipo. O contrato é público e estável — se ele mudar, o
 * `tsc` não avisa, então esta cópia acompanha a rota, não o motor.
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
  fase: FaseDraft;
  times: TimePublico[];
  elencos: Record<string, JogadorDoElenco[]>;
  disponiveis: JogadorDisponivel[];
  escolhaAtual: number;
  totalEscolhas: number;
  timeDaVezId: string | null;
  prazoISO: string | null;
  orcamentoPorTime: number;
  jogadoresPorTime: number;
  historico: EntradaHistorico[];
};

type RespostaEstado = { draft: DraftPublico | null; souCapitaoDe: string | null };

// ------------------------------------------------------------------ auxiliares

/**
 * Cor do time com transparência.
 *
 * A cor vem da API, e concatenar alfa hexadecimal só funciona em `#rrggbb`. Se algum
 * dia chegar `rgb(...)` ou um nome de cor, devolver a cor crua é melhor do que
 * devolver uma string que o navegador descarta — o realce fica forte demais, mas o
 * time não perde a identidade no meio da transmissão.
 */
function comAlfa(cor: string, alfa: string): string {
  return /^#[0-9a-f]{6}$/i.test(cor) ? `${cor}${alfa}` : cor;
}

/** M:SS. Nunca negativo: prazo vencido mostra zero até o servidor virar a escolha. */
function formatarRelogio(restanteMs: number): string {
  const segundos = Math.max(0, Math.ceil(restanteMs / 1000));
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
}

const TITULO_SECAO: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  color: "var(--lob-muted)",
  margin: 0,
};

// ------------------------------------------------------------------ cronômetro

/**
 * O relógio vive num componente próprio por dois motivos.
 *
 * O primeiro é o lint: `react-hooks/purity` barra `Date.now()` no render e dentro de
 * `useMemo`, então o tempo entra como fonte externa — estado alimentado por timer, e
 * um texto neutro enquanto a primeira batida não chega. O segundo é custo: bater 4x
 * por segundo aqui repinta só o cronômetro, e não as 40 casas da trilha e os cartões
 * de todos os times.
 *
 * O prazo é ABSOLUTO (o servidor manda o instante em que a escolha vence), então
 * aba em segundo plano, relógio travado ou sondagem perdida não desalinham a
 * contagem: ela é sempre `prazo - agora`, nunca um decremento local.
 */
function Cronometro({ prazoISO, t }: Readonly<{ prazoISO: string | null; t: Rotulos }>) {
  const [agoraMs, setAgoraMs] = useState<number | null>(null);

  useEffect(() => {
    const marcar = () => setAgoraMs(Date.now());
    const inicial = window.setTimeout(marcar, 0);
    const cadencia = window.setInterval(marcar, 250);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(cadencia);
    };
  }, []);

  const prazoMs = prazoISO ? Date.parse(prazoISO) : Number.NaN;
  const temPrazo = Number.isFinite(prazoMs);
  const restanteMs = temPrazo && agoraMs !== null ? prazoMs - agoraMs : null;
  const alerta = restanteMs !== null && restanteMs <= 10_000;

  if (!temPrazo) {
    return (
      <span
        className="lob-display"
        style={{ fontSize: "clamp(15px,2.4vw,22px)", color: "var(--lob-muted)", letterSpacing: "0.1em" }}
      >
        {t.semTempo}
      </span>
    );
  }

  return (
    <span
      className="lob-display"
      style={{
        // Sem tabular-nums o relógio "dança" a cada segundo — na TV isso é o que mais
        // incomoda, porque o bloco inteiro se mexe quando o 1 vira 8.
        fontVariantNumeric: "tabular-nums",
        fontSize: "clamp(38px,7.5vw,72px)",
        lineHeight: 1,
        // Alerta por COR e por moldura. Nada de piscar com opacidade: já apagou o
        // conteúdo do site quatro vezes, e um cronômetro invisível é o pior lugar.
        color: alerta ? "#ff8f7a" : "var(--lob-gold-1)",
        textShadow: alerta ? "0 0 22px rgba(255,90,70,.35)" : "0 0 20px rgba(240,200,138,.18)",
        padding: "2px 12px",
        borderRadius: 3,
        border: alerta ? "1px solid rgba(255,120,100,.55)" : "1px solid transparent",
        background: alerta ? "rgba(212,87,74,.12)" : "transparent",
      }}
    >
      {restanteMs === null ? "—:—" : formatarRelogio(restanteMs)}
    </span>
  );
}

// ------------------------------------------------------------------ peças

function SeloRota({ rota, largura = 34 }: Readonly<{ rota: string; largura?: number }>) {
  const meta = resolveRole(rota);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: largura,
        flexShrink: 0,
        padding: "2px 0",
        borderRadius: 2,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: meta.color,
        background: comAlfa(meta.color, "14"),
        border: `1px solid ${comAlfa(meta.color, "3d")}`,
      }}
      title={meta.label}
    >
      {meta.short}
    </span>
  );
}

function SeloElo({ elo }: Readonly<{ elo: string }>) {
  const meta = resolveElo(elo);
  if (!meta) return null;
  return (
    <span style={{ fontSize: 10, letterSpacing: "0.06em", color: meta.color, whiteSpace: "nowrap" }}>
      {meta.label}
    </span>
  );
}

function LinhaDeElenco({
  jogador,
  t,
}: Readonly<{ jogador: JogadorDoElenco | null; t: Rotulos }>) {
  if (!jogador) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          borderRadius: 2,
          border: "1px dashed var(--lob-line)",
          background: "rgba(255,255,255,.015)",
          fontSize: 11,
          letterSpacing: "0.08em",
          color: "var(--lob-muted)",
        }}
      >
        <span className="lob-mark" aria-hidden />
        {t.vagaAberta}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 8px",
        borderRadius: 2,
        border: "1px solid var(--lob-line)",
        background: "rgba(255,255,255,.022)",
      }}
    >
      <SeloRota rota={jogador.rota1} />
      {/* minWidth 0 é o que permite o nick truncar em vez de esticar o cartão. */}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            color: "var(--lob-text)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={jogador.riotId}
        >
          {jogador.riotId}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <SeloElo elo={jogador.elo} />
          {jogador.capitao ? (
            <span style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--lob-gold-2)" }}>
              {t.capitao.toUpperCase()}
            </span>
          ) : null}
        </span>
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: "var(--lob-gold-1)",
          whiteSpace: "nowrap",
        }}
      >
        {jogador.pontos}
      </span>
    </div>
  );
}

function CartaoDeTime({
  time,
  elenco,
  vagas,
  daVez,
  orcamento,
  t,
}: Readonly<{
  time: TimePublico;
  elenco: JogadorDoElenco[];
  vagas: number;
  daVez: boolean;
  orcamento: number;
  t: Rotulos;
}>) {
  const restante = orcamento - time.gasto;
  // Sempre `jogadoresPorTime` linhas: o cartão não pode encolher e crescer a cada
  // escolha, senão a grade inteira se remexe no meio da transmissão.
  const linhas = Array.from({ length: vagas }, (_, i) => elenco[i] ?? null);

  return (
    <article
      className="lob-card-2"
      style={{
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        border: daVez ? `2px solid ${time.cor}` : `1px solid ${comAlfa(time.cor, "3a")}`,
        boxShadow: daVez ? `0 0 30px -8px ${comAlfa(time.cor, "88")}` : undefined,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <h3
          className="lob-display"
          style={{ margin: 0, fontSize: "clamp(15px,1.7vw,20px)", color: time.cor, lineHeight: 1.1 }}
        >
          {time.nome}
        </h3>
        {daVez ? (
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.14em",
              padding: "2px 6px",
              borderRadius: 2,
              color: "#160f06",
              background: time.cor,
            }}
          >
            {t.naVez}
          </span>
        ) : null}
      </header>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
          padding: "6px 8px",
          borderRadius: 2,
          border: "1px solid var(--lob-line)",
          background: comAlfa(time.cor, "0f"),
        }}
      >
        <span style={{ ...TITULO_SECAO, fontSize: 9, width: "100%" }}>{t.orcamentoRestante}</span>
        <strong
          className="lob-display"
          style={{
            fontSize: "clamp(20px,2.6vw,28px)",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
            color: restante > 0 ? "var(--lob-gold-1)" : "var(--lob-muted)",
          }}
        >
          {restante}
        </strong>
        <span style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--lob-muted)" }}>
          {t.pontosLivres} {orcamento} {t.pontos}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {linhas.map((jogador, i) => (
          <LinhaDeElenco
            // Sem id no elenco público, a posição É a identidade da linha: o elenco só
            // cresce no fim, então o índice nunca reordena o que já estava na tela.
            key={jogador ? `${time.id}-${jogador.riotId}` : `${time.id}-vaga-${i}`}
            jogador={jogador}
            t={t}
          />
        ))}
      </div>
    </article>
  );
}

/**
 * A fila das escolhas, de 1 a `totalEscolhas`.
 *
 * A ordem é SERPENTINA e o servidor não manda a lista pronta, então ela é
 * reconstruída: rodada ímpar na ordem dos times, rodada par invertida. Com 10 times e
 * 5 por elenco são 40 casas — por isso quadradinhos com rolagem horizontal, e não uma
 * fila que estoura a largura da tela.
 */
function Trilha({
  draft,
  emAndamento,
}: Readonly<{ draft: DraftPublico; emAndamento: boolean }>) {
  const trilhaRef = useRef<HTMLDivElement | null>(null);
  const atualRef = useRef<HTMLDivElement | null>(null);

  const casas = useMemo(() => {
    const ids = draft.times.map((time) => time.id);
    const rodadas = Math.max(0, draft.jogadoresPorTime - 1);
    const ordem: string[] = [];
    for (let r = 0; r < rodadas; r += 1) {
      const daVez = r % 2 === 0 ? ids : [...ids].reverse();
      ordem.push(...daVez);
    }
    // Quem manda no tamanho é `totalEscolhas`, que veio do servidor. Se a conta local
    // divergir (formato alterado no meio do caminho), sobra casa sem dono em vez de
    // uma trilha com tamanho errado.
    return Array.from({ length: draft.totalEscolhas }, (_, i) => ordem[i] ?? null);
  }, [draft.times, draft.jogadoresPorTime, draft.totalEscolhas]);

  const corPorTime = useMemo(
    () => new Map(draft.times.map((time) => [time.id, time.cor])),
    [draft.times],
  );
  const nomePorTime = useMemo(
    () => new Map(draft.times.map((time) => [time.id, time.nome])),
    [draft.times],
  );

  // Mexer em `scrollLeft` do contêiner, e NÃO `scrollIntoView`: este último pode
  // rolar a página inteira para achar o elemento, e a transmissão daria um solavanco
  // a cada escolha em quem estivesse lendo o pool lá embaixo.
  useEffect(() => {
    const caixa = trilhaRef.current;
    const alvo = atualRef.current;
    if (!caixa || !alvo) return;
    caixa.scrollLeft = alvo.offsetLeft - caixa.clientWidth / 2 + alvo.clientWidth / 2;
  }, [draft.escolhaAtual]);

  return (
    <div
      ref={trilhaRef}
      className="lob-scroll"
      style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 6 }}
    >
      {casas.map((timeId, i) => {
        const cor = timeId ? (corPorTime.get(timeId) ?? "var(--lob-bronze)") : "var(--lob-bronze)";
        const passada = i < draft.escolhaAtual;
        const atual = emAndamento && i === draft.escolhaAtual;
        const nome = timeId ? (nomePorTime.get(timeId) ?? "—") : "—";

        return (
          <div
            key={`casa-${i}`}
            ref={atual ? atualRef : undefined}
            title={`${i + 1} · ${nome}`}
            style={{
              flex: "0 0 auto",
              width: atual ? 34 : 26,
              height: atual ? 34 : 26,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              fontSize: atual ? 12 : 10,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              // Três estados sem depender de opacidade: passada é cheia, a atual ganha
              // moldura grossa e brilho, a futura fica só com o contorno da cor.
              color: atual || passada ? cor : "var(--lob-muted)",
              background: atual ? comAlfa(cor, "3a") : passada ? comAlfa(cor, "22") : "rgba(255,255,255,.02)",
              border: atual ? `2px solid ${cor}` : `1px solid ${comAlfa(cor, passada ? "77" : "33")}`,
              boxShadow: atual ? `0 0 18px -4px ${comAlfa(cor, "cc")}` : undefined,
            }}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ quadro

/**
 * O quadro em si. Recebe um draft NÃO nulo para que os hooks de dentro sejam sempre
 * chamados — quem decide entre quadro, vazio e carregando é o componente de fora.
 */
function Quadro({ draft, t }: Readonly<{ draft: DraftPublico; t: Rotulos }>) {
  const numeroDeTimes = draft.times.length;
  const emAndamento = draft.fase === "rodando" || draft.fase === "pausado";

  // Rodadas = vagas por time menos o capitão, que já entra no elenco.
  const rodadas = Math.max(1, draft.jogadoresPorTime - 1);
  const rodadaAtual =
    numeroDeTimes > 0 ? Math.min(rodadas, Math.floor(draft.escolhaAtual / numeroDeTimes) + 1) : 1;
  const escolhaAtualHumana = Math.min(draft.escolhaAtual + 1, draft.totalEscolhas);

  const timeDaVez = useMemo(
    () => (emAndamento ? (draft.times.find((time) => time.id === draft.timeDaVezId) ?? null) : null),
    [draft.times, draft.timeDaVezId, emAndamento],
  );

  /**
   * Teto da escolha do time da vez: orçamento − gasto − (vagas abertas − 1).
   *
   * A subtração das vagas restantes é o que impede o time de gastar tudo num nome caro
   * e não conseguir fechar o elenco. Na transmissão isso não é enfeite: é exatamente a
   * conta que a plateia precisa para adivinhar quem pode ser chamado agora.
   */
  const teto = useMemo(() => {
    if (!timeDaVez || timeDaVez.vagas <= 0) return null;
    return draft.orcamentoPorTime - timeDaVez.gasto - (timeDaVez.vagas - 1);
  }, [timeDaVez, draft.orcamentoPorTime]);

  const pool = useMemo(
    () =>
      [...draft.disponiveis].sort(
        (a, b) => b.pontos - a.pontos || a.riotId.localeCompare(b.riotId, "pt-BR"),
      ),
    [draft.disponiveis],
  );

  const ultimas = useMemo(() => [...draft.historico].slice(-8).reverse(), [draft.historico]);

  const timePorId = useMemo(
    () => new Map(draft.times.map((time) => [time.id, time])),
    [draft.times],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* 1 — BARRA DE ESTADO. Gruda abaixo do cabeçalho do site (que é sticky em
          top:0 com z-index 40): daí o topo em 68 e um z-index menor, para ela passar
          POR BAIXO do menu em vez de brigar com ele. */}
      <section
        className="lob-card"
        style={{
          position: "sticky",
          top: 68,
          zIndex: 20,
          padding: "12px clamp(12px,2.4vw,18px)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "clamp(10px,2vw,24px)",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              className="lob-display"
              style={{
                fontSize: "clamp(15px,2vw,22px)",
                color: "var(--lob-text)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t.rodada} {rodadaAtual} {t.de} {rodadas}
            </span>
            <span
              style={{
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "var(--lob-muted)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {t.escolha} {escolhaAtualHumana} {t.de} {draft.totalEscolhas}
            </span>
          </div>

          {timeDaVez ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 12px",
                borderRadius: 3,
                border: `2px solid ${timeDaVez.cor}`,
                background: comAlfa(timeDaVez.cor, "1c"),
                boxShadow: `0 0 26px -10px ${comAlfa(timeDaVez.cor, "cc")}`,
                minWidth: 0,
              }}
            >
              <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 9, letterSpacing: "0.18em", color: timeDaVez.cor }}>
                  {t.naVez}
                </span>
                <span
                  className="lob-display"
                  style={{
                    fontSize: "clamp(18px,3vw,32px)",
                    lineHeight: 1.05,
                    color: timeDaVez.cor,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeDaVez.nome}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: "var(--lob-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {timeDaVez.capitaoRiotId} · {t.capitao}
                </span>
              </span>
            </div>
          ) : null}

          <Cronometro prazoISO={draft.prazoISO} t={t} />
        </div>

        {/* O selo de espectador fica DENTRO da barra: é aqui que alguém olharia
            procurando um botão de escolher, e não existe botão nenhum nesta tela. */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="lob-pill" style={{ padding: "5px 10px", fontSize: 10 }}>
            <span className="lob-mark" aria-hidden />
            {t.espectador}
          </span>
          <span style={{ fontSize: 11, color: "var(--lob-muted)", minWidth: 0 }}>
            {t.espectadorTexto}
          </span>
        </div>
      </section>

      {/* 2 — TRILHA DAS ESCOLHAS */}
      <section className="lob-card" style={{ padding: "10px clamp(10px,2vw,14px)" }}>
        <Trilha draft={draft} emAndamento={emAndamento} />
      </section>

      {/* 3 — OS TIMES. auto-fit resolve de 2 a 14 times sem número mágico de coluna. */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {draft.times.map((time) => (
          <CartaoDeTime
            key={time.id}
            time={time}
            elenco={draft.elencos[time.id] ?? []}
            vagas={draft.jogadoresPorTime}
            daVez={timeDaVez?.id === time.id}
            orcamento={draft.orcamentoPorTime}
            t={t}
          />
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* 4 — QUEM AINDA ESTÁ NO POOL.
            Sem título escrito: não existe chave para ele em `t`, e texto cravado em
            português apareceria igual na versão em inglês. O contador e o teto do time
            da vez são números — dizem o que a lista é sem depender de idioma. */}
        <div className="lob-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className="lob-pill" style={{ padding: "5px 10px", fontSize: 11 }}>
              <span className="lob-diamond" aria-hidden style={{ width: 8, height: 8 }} />
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{pool.length}</span>
            </span>
            {timeDaVez && teto !== null ? (
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  color: timeDaVez.cor,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {timeDaVez.nome} ≤ {teto} {t.pontos}
              </span>
            ) : null}
          </header>

          {pool.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--lob-muted)" }}>{t.nenhumDisponivel}</p>
          ) : (
            <div
              className="lob-scroll"
              style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 460, overflowY: "auto" }}
            >
              {pool.map((jogador) => {
                const caro = teto !== null && jogador.pontos > teto;
                return (
                  <div
                    key={jogador.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "5px 8px",
                      borderRadius: 2,
                      border: "1px solid var(--lob-line)",
                      background: caro ? "rgba(212,87,74,.07)" : "rgba(255,255,255,.02)",
                    }}
                    title={caro ? t.caroDemais : undefined}
                  >
                    <SeloRota rota={jogador.rota1} />
                    <SeloRota rota={jogador.rota2} largura={30} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: caro ? "var(--lob-muted)" : "var(--lob-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={jogador.riotId}
                      >
                        {jogador.riotId}
                      </span>
                      <SeloElo elo={jogador.elo} />
                    </span>
                    {caro ? (
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.08em",
                          color: "#f0a79e",
                          textAlign: "right",
                          maxWidth: 120,
                        }}
                      >
                        {t.caroDemais}
                      </span>
                    ) : null}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: caro ? "var(--lob-muted)" : "var(--lob-gold-1)",
                      }}
                    >
                      {jogador.pontos}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5 — AS ÚLTIMAS ESCOLHAS, da mais nova para a mais velha. */}
        <div className="lob-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          <h2 className="lob-display" style={{ ...TITULO_SECAO, fontSize: 12 }}>
            {t.escolha}
          </h2>
          {ultimas.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--lob-muted)" }}>—</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {ultimas.map((entrada) => {
                const time = timePorId.get(entrada.timeId);
                const cor = time?.cor ?? "var(--lob-bronze)";
                return (
                  <div
                    key={entrada.escolha}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 8px",
                      borderRadius: 2,
                      border: `1px solid ${comAlfa(cor, "33")}`,
                      // Faixa lateral na cor do time: identifica o destino da escolha
                      // mesmo com o cartão cortado numa tela estreita.
                      borderLeftWidth: 3,
                      borderLeftColor: cor,
                      background: comAlfa(cor, "0d"),
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontVariantNumeric: "tabular-nums",
                        color: "var(--lob-muted)",
                        width: 24,
                        flexShrink: 0,
                      }}
                    >
                      {/* `escolha` é 0-based no histórico; a plateia conta a partir de 1. */}
                      {entrada.escolha + 1}
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "var(--lob-text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={entrada.riotId}
                      >
                        {entrada.riotId}
                      </span>
                      <span style={{ fontSize: 10, letterSpacing: "0.08em", color: cor }}>
                        {time?.nome ?? "—"}
                      </span>
                    </span>
                    {entrada.automatica ? (
                      <span
                        style={{
                          fontSize: 9,
                          letterSpacing: "0.08em",
                          color: "#f3d69a",
                          border: "1px solid rgba(224,163,58,.4)",
                          background: "rgba(224,163,58,.10)",
                          borderRadius: 2,
                          padding: "2px 5px",
                          textAlign: "center",
                          maxWidth: 110,
                        }}
                      >
                        {t.automatica}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ faixas

function Faixa({
  titulo,
  texto,
  cor,
  fundo,
}: Readonly<{ titulo: string; texto: string; cor: string; fundo: string }>) {
  return (
    <section
      className="lob-card"
      style={{ padding: "10px 14px", border: `1px solid ${cor}`, background: fundo }}
    >
      <p className="lob-display" style={{ margin: 0, fontSize: "clamp(13px,1.8vw,17px)", color: cor }}>
        {titulo}
      </p>
      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--lob-muted)" }}>{texto}</p>
    </section>
  );
}

function faixaDaFase(fase: FaseDraft, t: Rotulos) {
  // "rodando" não tem faixa: a barra de estado já conta tudo o que há para contar.
  if (fase === "preparando") {
    return { titulo: t.preparando, texto: t.preparandoTexto, cor: "rgba(87,216,203,.55)", fundo: "rgba(87,216,203,.07)" };
  }
  if (fase === "pausado") {
    return { titulo: t.pausado, texto: t.pausadoTexto, cor: "rgba(224,163,58,.55)", fundo: "rgba(224,163,58,.08)" };
  }
  if (fase === "encerrado") {
    return { titulo: t.encerrado, texto: t.encerradoTexto, cor: "rgba(240,200,138,.5)", fundo: "rgba(240,200,138,.06)" };
  }
  return null;
}

// ------------------------------------------------------------------ transmissão

export default function Transmissao({ t }: Readonly<{ t: Rotulos }>) {
  const [draft, setDraft] = useState<DraftPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [falhando, setFalhando] = useState(false);

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
        const resposta = await fetch("/api/draft/estado", { cache: "no-store" });
        if (!resposta.ok) throw new Error(String(resposta.status));
        const corpo = (await resposta.json()) as RespostaEstado;
        if (!vivo) return;
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

  const aviso = falhando ? (
    <p
      style={{
        margin: 0,
        padding: "6px 10px",
        borderRadius: 2,
        border: "1px solid rgba(224,163,58,.35)",
        background: "rgba(224,163,58,.07)",
        fontSize: 11,
        color: "#f3d69a",
      }}
      role="status"
    >
      {t.erroGenerico}
    </p>
  ) : null;

  if (carregando) {
    return (
      <div className="lob-card" style={{ padding: 18 }}>
        <p className="lob-display" style={{ margin: 0, fontSize: 20, color: "var(--lob-muted)" }}>
          —
        </p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="lob-fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {aviso}
        <div className="lob-card" style={{ padding: "18px clamp(14px,3vw,22px)" }}>
          <h2 className="lob-display" style={{ margin: 0, fontSize: "clamp(16px,2.4vw,24px)", color: "var(--lob-gold-1)" }}>
            {t.semDraft}
          </h2>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--lob-muted)", maxWidth: 560 }}>
            {t.semDraftTexto}
          </p>
        </div>
      </div>
    );
  }

  const faixa = faixaDaFase(draft.fase, t);

  return (
    <div className="lob-fade" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {aviso}
      {/* As fases paradas mostram o quadro do mesmo jeito — as pessoas entram aqui
          para ver os elencos, e esconder tudo atrás de um aviso seria pior. */}
      {faixa ? <Faixa {...faixa} /> : null}
      <Quadro draft={draft} t={t} />
    </div>
  );
}
