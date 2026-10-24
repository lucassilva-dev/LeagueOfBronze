"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { RoleTag } from "@/components/lob/ui";
import { resolveElo, resolveRole } from "@/lib/design";
import type { Messages } from "@/lib/i18n/messages";

/**
 * Painel do capitão — a tela em que a escolha acontece.
 *
 * Três decisões que valem registro, porque nenhuma delas é a óbvia:
 *
 * 1. Esta tela NUNCA aplica uma escolha sozinha. O clique manda o POST e espera o
 *    `draft` que voltar. Aplicar localmente "para parecer rápido" criaria duas versões
 *    da verdade, e a divergência apareceria justamente no 409 — que aqui é rotina, não
 *    falha: dois capitães mirando o mesmo jogador é o caso comum de um draft.
 *
 * 2. Falha de rede não apaga a tela. O último estado bom fica, e o aviso é discreto.
 *    Zerar o painel a cada soluço de 2 segundos deixaria o capitão sem saber de quem é
 *    a vez bem no momento em que ele mais precisa saber.
 *
 * 3. O teto da escolha é o número grande. Não é o orçamento restante: é o restante
 *    MENOS o mínimo reservado para as vagas que ainda faltam. É a conta que impede o
 *    capitão de gastar tudo num jogador caro e não conseguir fechar o elenco.
 *
 * O capitão do TIME DEFINIDO pela organização (24/10/2026, lib/draft/time-definido.ts) também
 * chega aqui — ele é capitão de um time do draft —, mas o time dele já entrou completo e não
 * escolhe: em vez da lista, o recado e o elenco, sem orçamento, sem relógio e sem botão.
 */

type Rotulos = Messages["draft"];

type TimeDoDraft = Readonly<{
  id: string;
  nome: string;
  cor: string;
  capitaoRiotId: string;
  gasto: number;
  vagas: number;
  /** O time definido pela organização: completo, fora da ordem de escolha. Servidor antigo não manda. */
  definido?: true;
}>;

type JogadorDoElenco = Readonly<{
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
  /** A classe de preço ("Ouro II", "Mestre · 200–299 PDL"). Ausente em drafts antigos. */
  classe?: string;
  capitao: boolean;
}>;

type JogadorDisponivel = Readonly<{
  id: string;
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
  classe?: string;
}>;

type DraftPublico = Readonly<{
  /**
   * Numeração da gravação, vinda do banco. Só cresce, inclusive quando o draft é
   * remontado — por isso serve para descartar resposta que chegou fora de ordem.
   * Precisa acompanhar `DraftPublico` em lib/draft/store.ts.
   */
  revisao: number;
  fase: "preparando" | "rodando" | "pausado" | "encerrado";
  times: readonly TimeDoDraft[];
  elencos: Readonly<Record<string, readonly JogadorDoElenco[]>>;
  disponiveis: readonly JogadorDisponivel[];
  escolhaAtual: number;
  totalEscolhas: number;
  timeDaVezId: string | null;
  /** Quem o time da vez pode escolher agora, pela conta do motor. Opcional: servidor antigo. */
  escolhiveis?: readonly string[];
  prazoISO: string | null;
  motivoDaPausa?: "organizacao" | "atraso" | "sem_jogador" | null;
  orcamentoPorTime: number;
  jogadoresPorTime: number;
  historico: readonly Readonly<{
    escolha: number;
    timeId: string;
    riotId: string;
    automatica: boolean;
  }>[];
  /**
   * O capitão entrou SEM PREÇO (decisão de 23/10/2026): a tag de capitão vai no lugar dos
   * pontos, e o orçamento inteiro é das escolhas. Opcional: servidor antigo não manda.
   */
  capitaoGratis?: boolean;
}>;

type RespostaEstado = Readonly<{
  draft: DraftPublico | null;
  souCapitaoDe: string | null;
  /** Há sessão de jogador? Opcional: servidor antigo não manda. */
  logado?: boolean;
  /** Logado numa conta SEM inscrição (não é o mesmo que "não capitaneia"). Opcional: servidor antigo. */
  semInscricao?: boolean;
  /** Hora do servidor na resposta — corrige o relógio do aparelho no cronômetro. */
  agoraServidorISO?: string;
}>;

type RespostaEscolha = Readonly<{
  ok?: boolean;
  draft?: DraftPublico | null;
  /** Recado do servidor, sempre em português. */
  error?: string;
  /** O motivo da recusa, para traduzir (`t.erros`). */
  codigo?: string;
  params?: Readonly<Record<string, string | number>>;
}>;

/** Troca cada `{chave}` do texto pelo valor; chave sem valor fica como está. */
function preencher(modelo: string, valores: Readonly<Record<string, string | number>>) {
  return modelo.replace(/\{(\w+)\}/g, (inteiro, chave: string) =>
    Object.hasOwn(valores, chave) ? String(valores[chave]) : inteiro,
  );
}

/**
 * O recado de uma recusa no idioma da tela. O servidor escreve em português; com o site
 * em inglês, o capitão lia "Não é a vez do seu time." no meio do painel traduzido. Código
 * desconhecido (servidor mais novo que a tela) cai no texto do servidor.
 */
function recadoDaRecusa(corpo: RespostaEscolha, t: Rotulos): string {
  const erros: Readonly<Record<string, string>> = t.erros;
  const modelo = corpo.codigo && Object.hasOwn(erros, corpo.codigo) ? erros[corpo.codigo] : undefined;
  if (modelo !== undefined) return preencher(modelo, corpo.params ?? {});
  return corpo.error ?? t.erroGenerico;
}

/** "1 vaga aberta" / "4 vagas abertas" — antes era "4 vaga aberta" (e "4 open slot"). */
function vagasAbertas(n: number, t: Rotulos) {
  return preencher(n === 1 ? t.vagaAbertaN : t.vagasAbertasN, { n });
}

/** Busca sem acento: quem digita "grao" tem de achar "Grão-Mestre". */
function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    // Classe Unicode em vez da faixa U+0300–U+036F escrita à mão: os caracteres
    // combinantes são invisíveis no editor, e um intervalo desses sobrevive mal a
    // cópia/colagem — vira um range vazio sem ninguém perceber.
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** M:SS, nunca negativo. `Math.ceil` para o relógio só mostrar 0:00 quando de fato acabou. */
function relogio(ms: number) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

const CAIXA: React.CSSProperties = { padding: "clamp(14px,3vw,20px)" };

function Etiqueta({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      style={{
        fontSize: 10.5,
        letterSpacing: ".22em",
        textTransform: "uppercase",
        color: "#a98a5f",
      }}
    >
      {children}
    </div>
  );
}

/**
 * O elo ao lado do preço. Com a classe de preço do draft ("Ouro II", "Mestre · 200–299 PDL"),
 * ela no lugar do nome do elo: o preço é por divisão, e dois Ouros podem custar diferente.
 * Drafts montados antes da tabela por divisão não têm a classe — fica o nome do elo.
 */
function EloTexto({ elo, classe }: Readonly<{ elo: string; classe?: string }>) {
  const meta = resolveElo(elo);
  return (
    <span style={{ fontSize: 12, color: meta?.color ?? "var(--lob-muted)", whiteSpace: "nowrap" }}>
      {classe ?? meta?.label ?? elo}
    </span>
  );
}

/**
 * O MEU ELENCO, com as vagas que faltam. `tagNoPreco` diz o que vai no lugar dos pontos de cada
 * um (nulo = os pontos): a tag de capitão quando ele entrou sem preço, e a do time definido
 * pela organização, em que ninguém passou pelo draft. Capitão COM preço leva a tag ao lado do nome.
 */
function MeuElenco({
  elenco,
  quantas,
  tagNoPreco,
  automaticas,
  t,
}: Readonly<{
  elenco: readonly JogadorDoElenco[];
  /** As linhas do elenco: os jogadores por time. */
  quantas: number;
  tagNoPreco: (jogador: JogadorDoElenco) => string | null;
  /** Quem entrou pelo estouro do cronômetro. */
  automaticas: ReadonlySet<string>;
  t: Rotulos;
}>) {
  return (
    <div className="lob-card" style={{ ...CAIXA, display: "grid", gap: 12 }}>
      <Etiqueta>{t.meuElenco}</Etiqueta>
      <div style={{ display: "grid", gap: 7 }}>
        {Array.from({ length: quantas }, (_, indice) => {
          const jogador = elenco[indice];
          if (!jogador) {
            return (
              <div
                key={`vaga-${indice}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  border: "1px dashed var(--lob-line)",
                  borderRadius: 3,
                  color: "var(--lob-muted)",
                  fontSize: 13,
                }}
              >
                {t.vagaAberta}
              </div>
            );
          }
          const tag = tagNoPreco(jogador);
          return (
            <div
              key={jogador.riotId}
              className="lob-card-2"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                flexWrap: "wrap",
              }}
            >
              <RoleTag role={jogador.rota1} />
              <strong style={{ color: "var(--lob-text)", fontSize: 13.5, minWidth: 0, wordBreak: "break-word" }}>
                {jogador.riotId}
              </strong>
              {jogador.capitao && tag === null ? <span className="lob-pill">{t.capitao}</span> : null}
              {automaticas.has(jogador.riotId) ? (
                <span style={{ fontSize: 11.5, color: "#a98a5f" }}>{t.automatica}</span>
              ) : null}
              <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <EloTexto elo={jogador.elo} classe={jogador.classe} />
                {tag !== null ? (
                  // Sem preço: a tag no lugar dos pontos.
                  <span className="lob-pill">{tag}</span>
                ) : (
                  <span
                    className="lob-display"
                    style={{ color: "var(--lob-gold-1)", fontSize: 16, fontVariantNumeric: "tabular-nums" }}
                  >
                    {jogador.pontos}
                    <span style={{ fontSize: 11, color: "var(--lob-muted)" }}> {t.pontos}</span>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PainelCapitao({ t }: Readonly<{ t: Rotulos }>) {
  const [estado, setEstado] = useState<RespostaEstado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [semResposta, setSemResposta] = useState(false);
  const [agoraMs, setAgoraMs] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [escolhendoId, setEscolhendoId] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const emVoo = useRef(false);
  const vivo = useRef(false);
  /** Hora do servidor menos a do aparelho, medida na última sondagem (ms). */
  const defasagem = useRef(0);
  /**
   * Revisão do estado que está pintado na tela.
   *
   * Numa rede ruim a resposta do POST pode chegar DEPOIS de uma sondagem mais nova, e
   * aí o quadro anda para trás: alguém já escolhido reaparece disponível, com o botão
   * habilitado, e a tela volta a dizer que é a vez de quem já passou. Numa virada da
   * serpentina — quando o mesmo time escolhe duas vezes seguidas — isso faz o capitão
   * gastar a segunda escolha achando que está refazendo a primeira.
   *
   * A revisão vem do banco e só cresce, inclusive quando o draft é remontado; por isso
   * ela serve de ordenação e `escolhaAtual` não serviria.
   */
  const revisaoPintada = useRef(-1);

  /** Aceita só o que for mais novo do que já está pintado. */
  const aceitar = useCallback((revisao: number | undefined) => {
    // Sem revisão (draft ainda não montado) não há o que ordenar: passa.
    if (revisao === undefined) return true;
    if (revisao < revisaoPintada.current) return false;
    revisaoPintada.current = revisao;
    return true;
  }, []);

  const sondar = useCallback(async () => {
    // Sinalizador de "em voo": numa rede lenta, uma resposta atrasada chegando depois
    // da seguinte faria a tela voltar no tempo — e voltar no tempo aqui é mostrar como
    // disponível alguém que já foi escolhido.
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      const resposta = await fetch("/api/draft/estado", {
        // Prazo na sondagem. Sem ele, uma requisição PENDURADA (socket morto sem
        // RST — o sistema só desiste depois de minutos) trava o sinalizador de "em
        // voo": o intervalo de 2s dispara dezenas de vezes e nenhuma requisição sai.
        // A TV da sala fica parada numa escolha que já passou, com o cronômetro em
        // 0:00 e sem nenhum aviso. Abortar rejeita, libera o sinalizador e acende o
        // aviso que já existe.
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!resposta.ok) throw new Error(String(resposta.status));
      const corpo = (await resposta.json()) as RespostaEstado;
      if (!vivo.current) return;
      const servidorMs = corpo.agoraServidorISO ? Date.parse(corpo.agoraServidorISO) : Number.NaN;
      if (Number.isFinite(servidorMs)) defasagem.current = servidorMs - Date.now();
      if (!aceitar(corpo.draft?.revisao)) return;
      setEstado(corpo);
      setSemResposta(false);
    } catch {
      if (vivo.current) setSemResposta(true);
    } finally {
      emVoo.current = false;
      if (vivo.current) setCarregando(false);
    }
  }, [aceitar]);

  useEffect(() => {
    vivo.current = true;
    void sondar();
    const id = setInterval(() => void sondar(), 2000);
    return () => {
      vivo.current = false;
      clearInterval(id);
    };
  }, [sondar]);

  useEffect(() => {
    // O tempo é fonte EXTERNA: lê-lo durante o render (ou dentro de um useMemo) quebra
    // a pureza que o lint cobra. Entra por timer, sai por estado, e o render só lê.
    // Hora do SERVIDOR (relógio do aparelho + a diferença medida na última sondagem).
    const inicio = setTimeout(() => setAgoraMs(Date.now() + defasagem.current), 0);
    const passo = setInterval(() => setAgoraMs(Date.now() + defasagem.current), 250);
    return () => {
      clearTimeout(inicio);
      clearInterval(passo);
    };
  }, []);

  const draft = estado?.draft ?? null;
  const souCapitaoDe = estado?.souCapitaoDe ?? null;

  const meuTime = useMemo(
    () => draft?.times.find((time) => time.id === souCapitaoDe) ?? null,
    [draft, souCapitaoDe],
  );

  const timeDaVez = useMemo(
    () => draft?.times.find((time) => time.id === draft.timeDaVezId) ?? null,
    [draft],
  );

  const minhaVez = Boolean(meuTime && draft?.timeDaVezId === meuTime.id && draft?.fase === "rodando");

  const vagas = meuTime?.vagas ?? 0;
  const orcamento = draft?.orcamentoPorTime ?? 0;
  const restante = meuTime ? orcamento - meuTime.gasto : 0;
  /** O capitão não tem preço (decisão de 23/10/2026): o gasto do time é só o das escolhas. */
  const capitaoGratis = draft?.capitaoGratis === true;
  // teto = orçamento − gasto − (vagas abertas − 1). Cada vaga que sobrar depois desta
  // precisa de pelo menos 1 ponto, e esse mínimo fica reservado.
  const tetoPelaConta = vagas > 0 ? restante - (vagas - 1) : 0;
  // Na MINHA vez vale a lista do motor, que também confere se os elencos de todo mundo
  // continuam fechando (o pool da 4ª começa em 3 pontos, e a reserva de 1 ponto por vaga
  // deixava escolher quem travaria o draft). Fora da vez, a conta simples é só referência.
  const escolhiveis = useMemo(
    () => (minhaVez && draft?.escolhiveis ? new Set(draft.escolhiveis) : null),
    [minhaVez, draft],
  );
  const teto =
    escolhiveis && draft
      ? draft.disponiveis.filter((j) => escolhiveis.has(j.id)).reduce((m, j) => Math.max(m, j.pontos), 0)
      : tetoPelaConta;

  const msRestantes =
    draft?.prazoISO && agoraMs !== null ? Math.max(0, Date.parse(draft.prazoISO) - agoraMs) : null;
  const alerta = msRestantes !== null && msRestantes <= 10_000;

  // Só os times que escolhem: o definido pela organização não tem vez, e contá-lo adiantava a
  // rodada (com 8 times e 7 escolhendo, a 8ª escolha já aparecia como rodada 2).
  const numeroDeTimes = draft?.times.filter((time) => !time.definido).length ?? 0;
  const totalRodadas = Math.max(1, (draft?.jogadoresPorTime ?? 1) - 1);
  const rodadaAtual =
    numeroDeTimes > 0 ? Math.min(totalRodadas, Math.floor((draft?.escolhaAtual ?? 0) / numeroDeTimes) + 1) : 1;

  const meuElenco = useMemo(() => {
    if (!draft || !meuTime) return [] as JogadorDoElenco[];
    return [...(draft.elencos[meuTime.id] ?? [])].sort(
      (a, b) => Number(b.capitao) - Number(a.capitao) || b.pontos - a.pontos,
    );
  }, [draft, meuTime]);

  /** Quem entrou pelo estouro do cronômetro — o capitão merece saber por que aquele nome está lá. */
  const entraramSozinhos = useMemo(() => {
    const marcados = new Set<string>();
    if (!draft || !meuTime) return marcados;
    for (const evento of draft.historico) {
      if (evento.timeId === meuTime.id && evento.automatica) marcados.add(evento.riotId);
    }
    return marcados;
  }, [draft, meuTime]);

  const lista = useMemo(() => {
    const base = draft?.disponiveis ?? [];
    const alvo = normalizar(busca.trim());
    const filtrados = alvo
      ? base.filter((jogador) => {
          const elo = resolveElo(jogador.elo);
          const r1 = resolveRole(jogador.rota1);
          const r2 = resolveRole(jogador.rota2);
          return [jogador.riotId, jogador.elo, elo?.label ?? "", jogador.classe ?? "", r1.label, r1.short, r2.label, r2.short]
            .some((campo) => normalizar(campo).includes(alvo));
        })
      : base;
    // Mais caro primeiro: é a ordem em que o capitão pensa, porque o jogador caro é o
    // que ele perde se esperar. Riot ID desempata para a lista não dançar entre sondagens.
    return [...filtrados].sort((a, b) => b.pontos - a.pontos || a.riotId.localeCompare(b.riotId));
  }, [draft?.disponiveis, busca]);

  const escolher = useCallback(
    /** `escolha`: o número da escolha que a tela mostrava no clique (ver a rota). */
    async (jogadorId: string, escolha: number) => {
      if (escolhendoId) return;
      setEscolhendoId(jogadorId);
      setAviso(null);
      try {
        const resposta = await fetch("/api/draft/escolha", {
          method: "POST",
          // Mesmo motivo da sondagem, e aqui dói mais: sem prazo, uma requisição
          // PENDURADA (troca de Wi-Fi para 4G no meio do evento — o socket morre sem
          // RST e o sistema só desiste depois de minutos) nunca resolve, o `finally`
          // nunca roda e `escolhendoId` fica preso. Com ele preso, `podeClicar` é
          // falso e TODOS os botões da lista ficam desabilitados: o capitão vê o draft
          // andar, vê "SUA VEZ", e não consegue escolher mais nada até recarregar —
          // todas as escolhas dele caem no auto-pick. Abortar rejeita, o `catch`
          // acende o aviso e o `finally` libera para tentar de novo.
          signal: AbortSignal.timeout(10000),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jogadorId, escolha }),
        });
        const corpo = (await resposta.json().catch(() => ({}))) as RespostaEscolha;
        // O 409 vem com o estado fresco justamente para a tela se corrigir na hora, em
        // vez de passar até 2 segundos mostrando um pool que já mudou.
        if (corpo.draft && aceitar(corpo.draft.revisao)) {
          const novo = corpo.draft;
          setEstado((anterior) => ({ draft: novo, souCapitaoDe: anterior?.souCapitaoDe ?? null }));
          setSemResposta(false);
        }
        // Aviso velho é pior que nenhum: sem limpar no sucesso, a tarja de "outra
        // escolha entrou primeiro" ficava na tela rodadas depois, e o capitão a lia
        // como se fosse da tentativa nova.
        setAviso(resposta.ok ? null : recadoDaRecusa(corpo, t));
      } catch {
        setAviso(t.erroGenerico);
      } finally {
        setEscolhendoId(null);
      }
    },
    [aceitar, escolhendoId, t],
  );

  // ---------------------------------------------------------------- estados de borda

  if (carregando && !estado) {
    return (
      <div className="lob-card" style={{ ...CAIXA, display: "grid", gap: 12 }}>
        {[64, 44, 44].map((altura, i) => (
          <div
            key={i}
            style={{ height: altura, background: "rgba(255,255,255,.03)", border: "1px solid var(--lob-line)" }}
          />
        ))}
      </div>
    );
  }

  if (!draft) {
    /*
     * "Não foi montado" é uma AFIRMAÇÃO sobre o campeonato, e só pode ser dita quando o
     * servidor respondeu isso.
     *
     * Sem a distinção abaixo, uma falha de rede na primeira sondagem (Wi-Fi ruim no local
     * do evento, ou o timeout de 5 s da própria sondagem) deixava `estado` nulo e
     * `carregando` falso, e o capitão lia "O draft ainda não foi montado" — sem nenhuma
     * tarja de erro, porque a de `semResposta` só existe no return principal, lá embaixo.
     * Ele concluía que a organização ainda não sorteou, saía da página, e as escolhas dele
     * caíam no cronômetro. A transmissão já trata isto certo (mostra o aviso no próprio
     * ramo sem draft).
     */
    return (
      <div className="lob-card lob-fade" style={{ ...CAIXA, display: "grid", gap: 10 }}>
        <h2 className="lob-display" style={{ margin: 0, fontSize: 24, color: "var(--lob-text)" }}>
          {semResposta ? t.erroGenerico : t.semDraft}
        </h2>
        {semResposta ? null : (
          <p style={{ margin: 0, color: "var(--lob-muted)", maxWidth: "60ch" }}>{t.semDraftTexto}</p>
        )}
      </div>
    );
  }

  if (!meuTime) {
    // `souCapitaoDe: null` vale para quem não entrou E para quem entrou numa conta que não
    // capitaneia; `logado` separa os dois. Logado, o convite para entrar só devolveria a
    // pessoa a esta mesma tela — então ele some e fica o recado de que a conta não é de
    // capitão (a saída é o botão "sair" do cabeçalho e entrar na conta certa).
    const logado = estado?.logado === true;
    // Logado numa conta sem inscrição: quase sempre o capitão que criou outra conta. O
    // recado aponta a saída (a conta da inscrição, ou a mesa escolhendo por ele) em vez de
    // afirmar que ele não é capitão.
    const semInscricao = logado && estado?.semInscricao === true;
    return (
      <div className="lob-card lob-fade" style={{ ...CAIXA, display: "grid", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {/* O convite é o próprio botão: não há chave de rótulo curto para ele, e
              repetir a frase como texto e como botão seria ruído. Leva ao /entrar, que
              devolve o capitão para cá — /inscricao não tem login quando as inscrições
              estão fechadas, que é justamente o caso no dia do draft.
              O rótulo é longo e o .lob-btn-gold não quebra linha: no celular de 320–375px
              o botão passava da borda do cartão. Aqui ele quebra e fica dentro. */}
          {logado ? null : (
            <Link
              href="/entrar?volta=/capitao"
              className="lob-btn-gold"
              style={{
                padding: "13px 22px",
                fontSize: 13.5,
                letterSpacing: ".01em",
                textAlign: "center",
                whiteSpace: "normal",
                maxWidth: "100%",
                flex: "1 1 auto",
              }}
            >
              {t.entreParaVer}
            </Link>
          )}
          <Link href="/draft" className="lob-btn-ghost" style={{ padding: "13px 20px", fontSize: 12 }}>
            {t.verTransmissao}
          </Link>
        </div>

        <div style={{ borderTop: "1px solid var(--lob-line)", paddingTop: 16, display: "grid", gap: 6 }}>
          <Etiqueta>{semInscricao ? t.semInscricao : t.naoEhCapitao}</Etiqueta>
          <p style={{ margin: 0, color: "var(--lob-muted)", maxWidth: "60ch" }}>
            {semInscricao ? t.semInscricaoTexto : t.naoEhCapitaoTexto}
          </p>
        </div>
      </div>
    );
  }

  if (meuTime.definido) {
    // O time definido pela organização não escolhe: nada de orçamento, relógio ou lista — o
    // recado, o caminho para a transmissão e o elenco que já entrou pronto.
    return (
      <div className="lob-fade" style={{ display: "grid", gap: 16 }}>
        {semResposta ? (
          <div
            className="lob-pill"
            style={{ color: "#f3d69a", borderColor: "rgba(224,163,58,.40)", letterSpacing: 0, fontSize: 12 }}
          >
            {t.erroGenerico}
          </div>
        ) : null}

        <div
          className="lob-card"
          style={{ ...CAIXA, borderLeft: `4px solid ${meuTime.cor}`, display: "grid", gap: 14 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{ width: 11, height: 11, transform: "rotate(45deg)", background: meuTime.cor, flexShrink: 0 }}
            />
            <h2 className="lob-display" style={{ margin: 0, fontSize: 22, color: "var(--lob-text)" }}>
              {meuTime.nome}
            </h2>
            <span style={{ color: "var(--lob-muted)", fontSize: 12.5 }}>
              {meuTime.capitaoRiotId} · {t.capitao}
            </span>
          </div>
          <div data-time-definido="" style={{ display: "grid", gap: 6 }}>
            <Etiqueta>{t.timeDefinido}</Etiqueta>
            <p style={{ margin: 0, color: "var(--lob-text)", maxWidth: "60ch" }}>{t.timeDefinidoTexto}</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <Link href="/draft" className="lob-btn-ghost" style={{ padding: "13px 20px", fontSize: 12 }}>
              {t.verTransmissao}
            </Link>
          </div>
        </div>

        <MeuElenco
          elenco={meuElenco}
          quantas={draft.jogadoresPorTime}
          tagNoPreco={(jogador) => (jogador.capitao ? t.capitao : t.timeDefinido)}
          automaticas={entraramSozinhos}
          t={t}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------- painel

  const faseTitulo =
    draft.fase === "preparando" ? t.preparando : draft.fase === "pausado" ? t.pausado : t.encerrado;
  const faseTexto =
    draft.fase === "preparando"
      ? t.preparandoTexto
      : draft.fase === "pausado"
        ? draft.motivoDaPausa === "atraso"
          ? t.pausadoAtrasoTexto
          : draft.motivoDaPausa === "sem_jogador"
            ? t.pausadoSemJogadorTexto
            : t.pausadoTexto
        : t.encerradoTexto;

  // Com o relógio em 0:00 não há mais o que clicar: o pedido chegaria depois do prazo, o
  // auto-pick já teria entrado e o servidor recusaria (ver a rota de escolha).
  const tempoAcabou = msRestantes !== null && msRestantes <= 0;
  const podeClicar = minhaVez && vagas > 0 && escolhendoId === null && !tempoAcabou;

  return (
    <div className="lob-fade" style={{ display: "grid", gap: 16 }}>
      {semResposta ? (
        <div
          className="lob-pill"
          style={{ color: "#f3d69a", borderColor: "rgba(224,163,58,.40)", letterSpacing: 0, fontSize: 12 }}
        >
          {t.erroGenerico}
        </div>
      ) : null}

      {/* faixa da vez + cronômetro */}
      <div
        className="lob-card"
        style={{
          ...CAIXA,
          borderColor: minhaVez ? meuTime.cor : "var(--lob-line)",
          borderLeft: `4px solid ${minhaVez ? meuTime.cor : "var(--lob-line)"}`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Região viva: "É A SUA VEZ" é anunciado pelo leitor de tela quando a vez chega.
            O relógio fica de fora, senão cada tique seria lido. */}
        <div role="status" aria-live="polite" style={{ display: "grid", gap: 8, minWidth: 240 }}>
          <Etiqueta>
            {t.rodada} {rodadaAtual} {t.de} {totalRodadas} · {t.escolha}{" "}
            {Math.min(draft.escolhaAtual + 1, draft.totalEscolhas)} {t.de} {draft.totalEscolhas}
          </Etiqueta>

          {draft.fase !== "rodando" ? (
            <>
              <h2 className="lob-display" style={{ margin: 0, fontSize: 27, color: "var(--lob-text)" }}>
                {faseTitulo}
              </h2>
              <p style={{ margin: 0, color: "var(--lob-muted)", maxWidth: "56ch" }}>{faseTexto}</p>
            </>
          ) : minhaVez ? (
            <>
              <h2 className="lob-display gold-text" style={{ margin: 0, fontSize: "clamp(28px,5vw,40px)" }}>
                {t.suaVez}
              </h2>
              <p style={{ margin: 0, color: "var(--lob-text)", maxWidth: "56ch" }}>{t.suaVezTexto}</p>
            </>
          ) : (
            <>
              <h2 className="lob-display" style={{ margin: 0, fontSize: 27, color: "var(--lob-text)" }}>
                {t.aguardeSuaVez}
              </h2>
              <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
                <span style={{ color: "var(--lob-muted)", fontSize: 13 }}>{t.vezDe}</span>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    transform: "rotate(45deg)",
                    background: timeDaVez?.cor ?? "var(--lob-bronze)",
                    flexShrink: 0,
                  }}
                />
                <strong style={{ color: "var(--lob-text)", letterSpacing: ".04em" }}>
                  {timeDaVez?.nome ?? "—"}
                </strong>
                {timeDaVez ? (
                  <span style={{ color: "var(--lob-muted)", fontSize: 12.5 }}>{vagasAbertas(timeDaVez.vagas, t)}</span>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div style={{ display: "grid", justifyItems: "end", gap: 4 }}>
          <Etiqueta>{minhaVez ? t.naVez : t.escolha}</Etiqueta>
          <div
            className="lob-display"
            style={{
              fontSize: minhaVez ? "clamp(40px,8vw,64px)" : "clamp(30px,6vw,44px)",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: msRestantes === null ? "var(--lob-muted)" : alerta ? "#f0a79e" : "var(--lob-gold-1)",
            }}
          >
            {msRestantes === null ? t.semTempo : relogio(msRestantes)}
          </div>
        </div>
      </div>

      {/* 1. o meu orçamento */}
      <div
        className="lob-card"
        style={{ ...CAIXA, borderLeft: `4px solid ${meuTime.cor}`, display: "grid", gap: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{ width: 11, height: 11, transform: "rotate(45deg)", background: meuTime.cor, flexShrink: 0 }}
          />
          <h2 className="lob-display" style={{ margin: 0, fontSize: 22, color: "var(--lob-text)" }}>
            {meuTime.nome}
          </h2>
          <span style={{ color: "var(--lob-muted)", fontSize: 12.5 }}>
            {meuTime.capitaoRiotId} · {t.capitao}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
            alignItems: "stretch",
          }}
        >
          <div className="lob-card-2" style={{ padding: 14, display: "grid", gap: 6, alignContent: "start" }}>
            <Etiqueta>{t.orcamentoRestante}</Etiqueta>
            <div
              className="lob-display"
              style={{ fontSize: 34, lineHeight: 1, color: "var(--lob-text)", fontVariantNumeric: "tabular-nums" }}
            >
              {restante}
            </div>
            <div style={{ fontSize: 12, color: "var(--lob-muted)" }}>
              {t.pontosLivres} {orcamento}
            </div>
          </div>

          <div className="lob-card-2" style={{ padding: 14, display: "grid", gap: 6, alignContent: "start" }}>
            <Etiqueta>{vagas === 1 ? t.vagaAberta : t.vagasAbertas}</Etiqueta>
            <div
              className="lob-display"
              style={{ fontSize: 34, lineHeight: 1, color: "var(--lob-text)", fontVariantNumeric: "tabular-nums" }}
            >
              {vagas}
            </div>
            <div style={{ fontSize: 12, color: "var(--lob-muted)" }}>
              {t.de} {draft.jogadoresPorTime}
            </div>
          </div>

          {/* O número que decide o draft: grande de propósito. */}
          <div
            className="lob-card-2"
            style={{
              padding: 14,
              display: "grid",
              gap: 6,
              alignContent: "start",
              gridColumn: "span 2",
              minWidth: 0,
              borderColor: "rgba(232,184,120,.45)",
              background: "linear-gradient(180deg,#2a2113,#151009)",
            }}
          >
            <Etiqueta>{t.podeGastar}</Etiqueta>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span
                className="lob-display gold-text"
                style={{ fontSize: "clamp(44px,9vw,64px)", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}
              >
                {teto}
              </span>
              <span style={{ color: "var(--lob-text)", fontSize: 13.5 }}>
                {t.pontos} {t.nestaEscolha}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--lob-muted)", maxWidth: "48ch" }}>{t.reservado}</div>
          </div>
        </div>
      </div>

      {/* 2. meu elenco — capitão sem preço: a tag no lugar dos pontos */}
      <MeuElenco
        elenco={meuElenco}
        quantas={draft.jogadoresPorTime}
        tagNoPreco={(jogador) => (jogador.capitao && capitaoGratis ? t.capitao : null)}
        automaticas={entraramSozinhos}
        t={t}
      />

      {/* 3. a lista de escolha */}
      <div className="lob-card" style={{ ...CAIXA, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder={t.buscarJogador}
            aria-label={t.buscarJogador}
            style={{
              flex: "1 1 260px",
              minWidth: 0,
              padding: "11px 13px",
              background: "rgba(255,255,255,.03)",
              border: "1px solid var(--lob-line)",
              borderRadius: 2,
              color: "var(--lob-text)",
              fontSize: 14,
            }}
          />
          <span style={{ color: "var(--lob-muted)", fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>
            {lista.length} · {t.podeGastar} {teto} {t.pontos}
          </span>
        </div>

        {aviso ? (
          <div
            role="status"
            style={{
              padding: "11px 13px",
              border: "1px solid rgba(224,163,58,.40)",
              background: "rgba(224,163,58,.10)",
              borderRadius: 2,
              color: "#f3d69a",
              fontSize: 13,
            }}
          >
            {aviso}
          </div>
        ) : null}

        {!minhaVez && draft.fase === "rodando" ? (
          <div style={{ color: "var(--lob-muted)", fontSize: 12.5 }}>{t.aguardeSuaVez}</div>
        ) : null}

        {lista.length === 0 ? (
          <div style={{ color: "var(--lob-muted)", padding: "18px 2px" }}>{t.nenhumDisponivel}</div>
        ) : (
          <div className="lob-scroll" style={{ display: "grid", gap: 7, maxHeight: 560, overflowY: "auto" }}>
            {lista.map((jogador) => {
              // Fora do teto, ou dentro dele mas deixaria algum elenco sem fechar.
              const acimaDoTeto = jogador.pontos > tetoPelaConta;
              const caro = escolhiveis ? !escolhiveis.has(jogador.id) : acimaDoTeto;
              const habilitado = podeClicar && !caro;
              const rota2 = resolveRole(jogador.rota2);
              return (
                <div
                  key={jogador.id}
                  className="lob-card-2"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 12px",
                    flexWrap: "wrap",
                    // Sem animar opacidade: o "indisponível" é dito pela cor da borda e
                    // pelo texto, não por apagar a linha — o capitão precisa continuar
                    // vendo quem existe no pool para entender a disputa.
                    borderColor: caro ? "rgba(212,87,74,.34)" : "rgba(201,138,75,.2)",
                    background: caro
                      ? "linear-gradient(180deg,#1d1410,#130e08)"
                      : "linear-gradient(180deg,#1c1710,#130f08)",
                  }}
                >
                  <RoleTag role={jogador.rota1} />
                  <span style={{ fontSize: 11, color: "var(--lob-muted)", letterSpacing: ".06em" }}>
                    {rota2.short}
                  </span>
                  <strong
                    style={{
                      color: caro ? "var(--lob-muted)" : "var(--lob-text)",
                      fontSize: 14,
                      minWidth: 0,
                      wordBreak: "break-word",
                    }}
                  >
                    {jogador.riotId}
                  </strong>
                  <EloTexto elo={jogador.elo} classe={jogador.classe} />

                  <span
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap",
                    }}
                  >
                    {caro ? (
                      <span style={{ fontSize: 11.5, color: "#f0a79e", maxWidth: "34ch" }}>
                        {acimaDoTeto ? t.caroDemais : t.naoFecha}
                      </span>
                    ) : null}
                    <span
                      className="lob-display"
                      style={{
                        fontSize: 19,
                        color: caro ? "#f0a79e" : "var(--lob-gold-1)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {jogador.pontos}
                      <span style={{ fontSize: 11, color: "var(--lob-muted)" }}> {t.pontos}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => void escolher(jogador.id, draft.escolhaAtual)}
                      disabled={!habilitado}
                      // Sem isto o leitor de tela lia "ESCOLHER, botão" em cada linha, sem dizer de quem.
                      aria-label={preencher(t.escolherRotulo, { riotId: jogador.riotId, pontos: jogador.pontos })}
                      className={habilitado ? "lob-btn-gold" : "lob-btn-ghost"}
                      style={{
                        padding: "9px 15px",
                        fontSize: 11,
                        cursor: habilitado ? "pointer" : "not-allowed",
                        ...(habilitado
                          ? {}
                          : { color: "var(--lob-muted)", borderColor: "var(--lob-line)", background: "transparent" }),
                      }}
                    >
                      {escolhendoId === jogador.id ? t.escolhendo : t.escolher}
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. os outros times — quem ainda pode disputar o jogador que eu quero */}
      <div className="lob-card" style={{ ...CAIXA, display: "grid", gap: 12 }}>
        <Etiqueta>{t.orcamentoRestante}</Etiqueta>
        <div
          style={{
            display: "grid",
            gap: 8,
            // Grade que quebra em linhas: o número de times vem dos aprovados (6, 10, 12…),
            // então qualquer fila fixa de colunas quebraria na próxima edição.
            gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))",
          }}
        >
          {/* Sem o time definido pela organização: ele não disputa jogador nenhum, e "30 livres
              de 30 · 0 vagas" no meio dos rivais só confundiria. */}
          {draft.times
            .filter((time) => time.id !== meuTime.id && !time.definido)
            .map((time) => {
              const naVez = time.id === draft.timeDaVezId;
              return (
                <div
                  key={time.id}
                  className="lob-card-2"
                  style={{
                    padding: "10px 12px",
                    display: "grid",
                    gap: 5,
                    borderLeft: `3px solid ${time.cor}`,
                    borderColor: naVez ? time.cor : "rgba(201,138,75,.2)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        transform: "rotate(45deg)",
                        background: time.cor,
                        flexShrink: 0,
                      }}
                    />
                    <strong
                      style={{
                        color: "var(--lob-text)",
                        fontSize: 13,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {time.nome}
                    </strong>
                    {naVez ? <span style={{ fontSize: 10, color: "#f3d69a", marginLeft: "auto" }}>{t.naVez}</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--lob-muted)", fontVariantNumeric: "tabular-nums" }}>
                    {orcamento - time.gasto} {t.pontosLivres} {orcamento} · {vagasAbertas(time.vagas, t)}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
