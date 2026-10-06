"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { EdicaoConfig, Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
  Banner,
  Button,
  C,
  Card,
  Check,
  Chip,
  Empty,
  Field,
  FieldGrid,
  Input,
  Metric,
  ScrollX,
  SectionHead,
  Select,
  Textarea,
  Toolbar,
  display,
  tabular,
} from "@/components/admin/ui";
import { ELO_ORDER, resolveElo, resolveRole } from "@/lib/design";
import { formatDateTimeLabel } from "@/lib/format";
import { alertasDoInscrito, type Alerta } from "@/lib/inscricoes/alertas";
import { LIMITES_INSCRICAO } from "@/lib/inscricoes/passo1";
import {
  ESTADOS_CONFERENCIA,
  ITENS_CONFERENCIA,
  REGRA_DO_ITEM,
  estadoDaJanela,
  type EstadoConferencia,
  type ItemConferencia,
} from "@/lib/inscricoes/schema";
import { TURNOS, type Turno } from "@/lib/inscricoes/turnos";
import { getOpGgSummonerUrlFromNick } from "@/lib/opgg";
import { AUTOR_RIOT } from "@/lib/riot/decidir";

/**
 * Matriz de conferência + gaveta do inscrito.
 *
 * É a tela em que a organização passa mais tempo, e a que decide quem joga. Três
 * decisões governam o desenho:
 *
 * 1. UM "SALVAR" SÓ. Antes cada requisito tinha o próprio botão e a ficha outro — sete
 *    cliques de salvar por pessoa, numa lista de ~50. Agora a gaveta junta tudo num
 *    rascunho e grava numa requisição (ação `inscrito`). O rascunho continua guardando só
 *    o que a pessoa TOCOU, e só o que difere do banco vai no corpo: é o que impede um
 *    organizador de desfazer o que o outro acabou de gravar.
 *
 * 2. O CRITÉRIO FICA VISÍVEL, NÃO EM TOOLTIP. `REGRA_DO_ITEM[item].detalhe` aparece em
 *    cada requisito. Na 3ª Edição dois organizadores leram o mesmo requisito de jeitos
 *    diferentes (um contava flex como ranqueada, o outro não) e a discussão só apareceu
 *    depois do sorteio. Quem já sabe os critérios de cor pode ocultá-los — a escolha fica
 *    no navegador dele, e o padrão é mostrar.
 *
 * 3. NÃO HÁ TETO DE INSCRIÇÕES. Nada aqui escreve "X de N vagas": o número de times é
 *    derivado (elegíveis ÷ jogadores por time) e vem pronto do servidor, no panorama.
 *
 * A data de entrada no grupo saiu da tela: a 4ª não pede tempo mínimo (regra 1), o que
 * conta é estar no grupo — e isso é o item (a).
 */

// ---------------------------------------------------------------- tabela

const th: CSSProperties = {
  padding: "0 10px 9px",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${C.line}`,
};

const td: CSSProperties = {
  padding: "8px 10px",
  fontSize: 12.5,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
};

// ---------------------------------------------------------------- vocabulário

type TomChip = "neutro" | "gold" | "ok" | "warn" | "danger" | "off";

const ROTULO_CONFERENCIA: Record<EstadoConferencia, string> = {
  pendente: "Pendente",
  ok: "Cumpre",
  provisorio: "Provisório",
  risco: "Em risco",
  recusado: "Não cumpre",
  nao_avaliavel: "Não avaliável",
  excecao: "Exceção aberta",
};

/** No botão o rótulo é mais curto — os sete precisam caber numa linha. O longo vai no `title`. */
const ROTULO_BOTAO_ESTADO: Record<EstadoConferencia, string> = { ...ROTULO_CONFERENCIA, excecao: "Exceção" };

/** Versão curta, só para a célula da matriz — a longa vai no `title` e na gaveta. */
const ABREV_CONFERENCIA: Record<EstadoConferencia, string> = {
  pendente: "—",
  ok: "ok",
  provisorio: "prov",
  risco: "risco",
  recusado: "não",
  nao_avaliavel: "n/a",
  excecao: "exc",
};

/**
 * "excecao" pinta de verde junto com "ok" porque as duas liberam o jogador; a diferença
 * é o motivo, que fica escrito na observação. "provisorio" e "risco" dividem o âmbar:
 * ambas significam "entra, mas alguém precisa voltar aqui".
 */
const TOM_CONFERENCIA: Record<EstadoConferencia, TomChip> = {
  pendente: "neutro",
  ok: "ok",
  provisorio: "warn",
  risco: "warn",
  recusado: "danger",
  nao_avaliavel: "off",
  excecao: "ok",
};

/**
 * A ordem dos botões de estado: os três que resolvem quase tudo primeiro. Qualquer estado
 * que o schema ganhar e esta lista não citar entra no fim — nunca some da tela.
 */
const ESTADOS_NA_TELA: readonly EstadoConferencia[] = (() => {
  const preferidos: readonly EstadoConferencia[] = ["ok", "recusado", "pendente"];
  return [...preferidos, ...ESTADOS_CONFERENCIA.filter((e) => !preferidos.includes(e))];
})();

const SITUACOES = ["pendente", "apto", "recusado", "desistiu", "sobra"] as const;

const ROTULO_SITUACAO: Record<Inscrito["situacao"], string> = {
  pendente: "Pendente",
  apto: "Apto",
  recusado: "Recusado",
  desistiu: "Desistiu",
  sobra: "Sobra",
};

const TOM_SITUACAO: Record<Inscrito["situacao"], TomChip> = {
  pendente: "neutro",
  apto: "ok",
  recusado: "danger",
  desistiu: "off",
  sobra: "warn",
};

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Itens cujo veredicto depende de uma data-âncora — que pode não existir ainda, ou cuja
 * janela de medição ainda não abriu.
 *
 * Nos dois casos o item é "não avaliável", nunca "não cumpre" nem "cumpre": reprovar
 * alguém porque a organização ainda não decidiu a data seria reprovar pela nossa
 * indecisão, e aprovar o (e) em outubro com o início marcado para novembro é afirmar
 * "jogou 5 partidas nos 10 dias antes do início" antes de esses 10 dias existirem — e,
 * aprovado, ninguém volta nele (deixa de ser pendência). Os outros cinco itens (a, b, d,
 * f, m) se avaliam a qualquer hora.
 */
const ANCORA_DO_ITEM: Partial<
  Record<
    ItemConferencia,
    Readonly<{ campo: "abertura_inscricoes" | "inicio_campeonato"; texto: string; janelaDias: number }>
  >
> = {
  e: { campo: "inicio_campeonato", texto: "a data de início do campeonato", janelaDias: 10 },
};

const ROTULO_TURNO: Record<Turno, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

/** Os turnos na ordem do dia, ignorando qualquer valor que esta tela não conheça. */
function turnosDe(valores: readonly string[] | null | undefined): Turno[] {
  return TURNOS.filter((t) => (valores ?? []).includes(t));
}

const SEM_ESCOPO = "Falta o escopo inscricoes:conferir para editar.";

/** Mapa vazio ESTÁVEL: um `new Map()` por render faria a gaveta achar que os dados mudaram. */
const SEM_CONFERENCIAS: ReadonlyMap<ItemConferencia, RegistroConferencia> = new Map();
const SEM_ALERTAS: readonly Alerta[] = [];

/** Mais que isto sem rodada da Riot: o cron diário provavelmente parou (segredo, Vercel…). */
const ROBO_ATRASADO_MS = 26 * 60 * 60 * 1000;

/** Preferência de quem já sabe os critérios de cor. Só conveniência: pode sumir sem dano. */
const CHAVE_OCULTAR_CRITERIOS = "lob:inscritos:ocultar-criterios";

function lerOcultarCriterios(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_OCULTAR_CRITERIOS) === "1";
  } catch {
    return false;
  }
}

function gravarOcultarCriterios(ocultar: boolean) {
  try {
    if (ocultar) window.localStorage.setItem(CHAVE_OCULTAR_CRITERIOS, "1");
    else window.localStorage.removeItem(CHAVE_OCULTAR_CRITERIOS);
  } catch {
    // Navegador sem armazenamento (aba anônima, bloqueio): a escolha vale só até fechar.
  }
}

// ---------------------------------------------------------------- conversões

/** Linha ausente = item nunca tocado, que é exatamente "pendente". */
function comoEstado(valor: string | undefined): EstadoConferencia {
  return ESTADOS_CONFERENCIA.find((e) => e === valor) ?? "pendente";
}

/**
 * Qual elo mostrar e de onde ele veio.
 *
 * A ordem é congelado > verificado > declarado, e a origem vai junto na tela: os três
 * podem discordar, e "Ouro" sem dizer quem afirmou isso é informação pela metade. O
 * verificado diz também QUEM verificou: a Riot (o robô atualiza todo dia) ou a organização
 * (travado à mão — o robô não mexe mais).
 */
function eloExibido(inscrito: Inscrito) {
  const bruto = inscrito.elo_congelado ?? inscrito.elo_verificado ?? inscrito.elo_declarado;
  const origem = inscrito.elo_congelado
    ? "congelado"
    : inscrito.elo_verificado
      ? inscrito.elo_fonte === "organizacao"
        ? "travado"
        : inscrito.elo_fonte === "riot"
          ? "Riot"
          : "verificado"
      : "declarado";
  const meta = resolveElo(bruto);
  return { rotulo: meta?.label ?? bruto, cor: meta?.color ?? C.ink3, origem };
}

/** Os elos que não têm divisão (I–IV) na Riot. */
const SEM_DIVISAO = new Set(["Mestre", "Grão-Mestre", "Desafiante"]);

/** "Ouro II · 45 PDL", do que a Riot mostrou na última consulta. */
function eloNaRiot(inscrito: Inscrito): string | null {
  if (!inscrito.elo_riot) return null;
  const divisao = inscrito.riot_divisao && !SEM_DIVISAO.has(inscrito.elo_riot) ? ` ${inscrito.riot_divisao}` : "";
  const pdl = inscrito.riot_pdl !== null && inscrito.riot_pdl !== undefined ? ` · ${inscrito.riot_pdl} PDL` : "";
  return `${inscrito.elo_riot}${divisao}${pdl}`;
}

/** "há 3 h", "há 2 dias" — o quão velha está a consulta à Riot. */
function haQuanto(iso: string | null | undefined, agoraMs: number | null): string {
  if (!iso || agoraMs === null) return "";
  const decorrido = agoraMs - new Date(iso).getTime();
  if (!Number.isFinite(decorrido)) return "";
  const horas = Math.floor(decorrido / 3_600_000);
  if (horas < 1) return "há menos de 1 h";
  if (horas < 48) return `há ${horas} h`;
  return `há ${Math.floor(horas / 24)} dias`;
}

/**
 * O relógio da tela: lido UMA vez na montagem (inicializador preguiçoso, o mesmo da gaveta)
 * e remarcado a cada minuto — a resolução de que "há 3 h" e o aviso de robô parado precisam.
 */
function useAgora(): number {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const cadencia = window.setInterval(() => setAgora(Date.now()), 60_000);
    return () => window.clearInterval(cadencia);
  }, []);
  return agora;
}

function rotasDoInscrito(inscrito: Inscrito) {
  const primaria = resolveRole(inscrito.rota_primaria);
  const secundaria = resolveRole(inscrito.rota_secundaria);
  return {
    curto: `${primaria.short} · ${secundaria.short}`,
    longo: `Primária ${primaria.label}, secundária ${secundaria.label}`,
  };
}

function plural(n: number, um: string, varios: string) {
  return n === 1 ? `1 ${um}` : `${n} ${varios}`;
}

/** "28/10", no fuso de Brasília — a data de um prazo, sem a hora. */
function diaCurto(ms: number) {
  return new Date(ms).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" });
}

/** "05/10, 10:00", no fuso de Brasília — para o carimbo de quem conferiu caber numa linha. */
function quandoCurto(iso: string | null) {
  const data = iso ? new Date(iso) : null;
  if (!data || Number.isNaN(data.getTime())) return "";
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------------------------------------------------------------- peças locais

/** Par rótulo/valor só de leitura, no mesmo desenho do rótulo de `Field`. */
function Dado({ rotulo, valor }: Readonly<{ rotulo: string; valor: ReactNode }>) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.bronze,
          marginBottom: 4,
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontSize: 13, color: C.ink, overflowWrap: "anywhere" }}>{valor}</div>
    </div>
  );
}

/** Botão com cara de link, para ações pequenas que não podem competir com o "Salvar". */
function BotaoLink({
  children,
  onClick,
  disabled,
}: Readonly<{ children: ReactNode; onClick: () => void; disabled?: boolean }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: 0,
        border: 0,
        background: "none",
        fontFamily: "inherit",
        fontSize: 11.5,
        color: disabled ? C.ink4 : C.bronzeLit,
        cursor: disabled ? "not-allowed" : "pointer",
        textDecoration: "underline",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

const COR_DO_TOM: Record<TomChip, Readonly<{ borda: string; fundo: string; texto: string }>> = {
  neutro: { borda: C.bronze, fundo: "rgba(201,138,75,.18)", texto: C.bronzeLit },
  gold: { borda: C.bronze, fundo: "rgba(201,138,75,.18)", texto: C.bronzeLit },
  ok: { borda: "rgba(70,214,200,.6)", fundo: "rgba(70,214,200,.16)", texto: C.okSoft },
  warn: { borda: "rgba(224,163,58,.65)", fundo: "rgba(224,163,58,.16)", texto: C.warnSoft },
  danger: { borda: "rgba(212,87,74,.65)", fundo: "rgba(212,87,74,.16)", texto: C.dangerSoft },
  off: { borda: C.ink3, fundo: "rgba(255,255,255,.07)", texto: C.ink },
};

type Opcao<T extends string> = Readonly<{ valor: T; rotulo: string; tom: TomChip; dica?: string }>;

/**
 * Escolha de UM valor com um clique — no lugar do <select>, que pede dois (abrir e
 * escolher) e esconde as opções. É um radiogroup de verdade: setas trocam a escolha,
 * Tab entra e sai do grupo inteiro, e o leitor de tela anuncia "marcado".
 *
 * A marcada leva ✓ além da cor: cor sozinha não chega a quem não a distingue.
 */
function Opcoes<T extends string>({
  valor,
  opcoes,
  onChange,
  disabled,
  ariaLabel,
}: Readonly<{
  valor: T;
  opcoes: readonly Opcao<T>[];
  onChange: (v: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}>) {
  const temMarcada = opcoes.some((o) => o.valor === valor);

  const mover = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo =
      evento.key === "ArrowRight" || evento.key === "ArrowDown"
        ? 1
        : evento.key === "ArrowLeft" || evento.key === "ArrowUp"
          ? -1
          : 0;
    if (passo === 0) return;
    evento.preventDefault();
    const destino = (indice + passo + opcoes.length) % opcoes.length;
    onChange(opcoes[destino]!.valor);
    evento.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>("[role=radio]")
      [destino]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={ariaLabel} style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {opcoes.map((opcao, indice) => {
        const marcada = opcao.valor === valor;
        const cor = COR_DO_TOM[opcao.tom];
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={marcada}
            tabIndex={marcada || (!temMarcada && indice === 0) ? 0 : -1}
            disabled={disabled}
            title={opcao.dica}
            onClick={() => onChange(opcao.valor)}
            onKeyDown={(evento) => mover(evento, indice)}
            style={{
              padding: "6px 10px",
              borderRadius: 3,
              border: `1px solid ${marcada ? cor.borda : C.line}`,
              background: marcada ? cor.fundo : "rgba(0,0,0,.28)",
              color: marcada ? cor.texto : C.ink3,
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: marcada ? 700 : 500,
              whiteSpace: "nowrap",
              cursor: disabled ? "not-allowed" : "pointer",
            }}
          >
            {marcada ? "✓ " : ""}
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}

const OPCOES_DE_ESTADO: readonly Opcao<EstadoConferencia>[] = ESTADOS_NA_TELA.map((e) => ({
  valor: e,
  rotulo: ROTULO_BOTAO_ESTADO[e],
  tom: TOM_CONFERENCIA[e],
  dica: ROTULO_CONFERENCIA[e],
}));

const OPCOES_DE_SITUACAO: readonly Opcao<Inscrito["situacao"]>[] = SITUACOES.map((s) => ({
  valor: s,
  rotulo: ROTULO_SITUACAO[s],
  tom: TOM_SITUACAO[s],
  dica:
    s === "sobra"
      ? "Aprovado que ficou de fora quando os times fecharam — não é fila com ordem."
      : undefined,
}));

// ---------------------------------------------------------------- um requisito

type PropsRequisito = Readonly<{
  item: ItemConferencia;
  estado: EstadoConferencia;
  estadoSalvo: EstadoConferencia;
  observacao: string;
  observacaoSalva: string;
  conferidoPor: string | null;
  conferidoEm: string | null;
  /** Por que o item ainda não pode ser medido (data inexistente ou janela fechada). */
  semBase: string | null;
  /** O item é do robô da Riot: ninguém da organização escreveu nele ainda. */
  doRobo: boolean;
  verCriterio: boolean;
  observacaoAberta: boolean;
  bloqueado: boolean;
  onEstado: (estado: EstadoConferencia) => void;
  onObservacao: (texto: string) => void;
  onAbrirObservacao: () => void;
}>;

/**
 * Um requisito em duas linhas: título (com quem conferiu) e os sete estados lado a lado.
 * O critério e a observação só ocupam espaço quando existem — seis caixas de texto vazias
 * eram metade da altura da conferência antiga.
 */
function Requisito({
  item,
  estado,
  estadoSalvo,
  observacao,
  observacaoSalva,
  conferidoPor,
  conferidoEm,
  semBase,
  doRobo,
  verCriterio,
  observacaoAberta,
  bloqueado,
  onEstado,
  onObservacao,
  onAbrirObservacao,
}: PropsRequisito) {
  const regra = REGRA_DO_ITEM[item];
  const letra = item.toUpperCase();
  const tituloId = useId();
  const observacaoId = useId();

  // Marcar "cumpre" num item que ainda não dá para medir é afirmar o que ninguém pode ter
  // verificado. Não bloqueamos (a organização pode ter checado por fora e explicado na
  // observação), mas o aviso fica na frente de quem estiver clicando rápido.
  const afirmacaoSemBase = Boolean(semBase) && (estado === "ok" || estado === "provisorio");
  const estadoAlterado = estado !== estadoSalvo;
  const mostrarObservacao = observacaoAberta || observacaoSalva !== "" || observacao !== "";

  // O foco vai para a caixa SÓ no clique que a abriu. Um `autoFocus` refazia isso a cada
  // volta para esta aba — tirava o foco da lista de abas e rolava a gaveta até a caixa.
  const abrirObservacao = () => {
    onAbrirObservacao();
    requestAnimationFrame(() => document.getElementById(observacaoId)?.focus());
  };

  return (
    <section aria-labelledby={tituloId} style={{ padding: "11px 0 12px", borderBottom: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <Chip tone="gold" title={`Item ${letra} do regulamento`}>
          {letra}
        </Chip>
        <strong id={tituloId} style={{ fontSize: 13.5, color: C.ink, fontWeight: 700 }}>
          {regra.titulo}
        </strong>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11,
            color: C.ink4,
            ...tabular,
          }}
        >
          {!mostrarObservacao ? (
            <BotaoLink onClick={abrirObservacao} disabled={bloqueado}>
              + observação
            </BotaoLink>
          ) : null}
          {estadoAlterado ? (
            <Chip tone="warn" title="Ainda não foi salvo">
              era {ROTULO_CONFERENCIA[estadoSalvo].toLowerCase()}
            </Chip>
          ) : conferidoPor ? (
            <span title={`Conferido por ${conferidoPor} em ${formatDateTimeLabel(conferidoEm)}`}>
              {conferidoPor === AUTOR_RIOT ? "Riot (robô)" : conferidoPor} · {quandoCurto(conferidoEm)}
            </span>
          ) : (
            "não conferido"
          )}
        </span>
      </div>

      {/* O critério inteiro (decisão 2 do topo do arquivo). */}
      {verCriterio ? (
        <p style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.55, color: C.ink3 }}>{regra.detalhe}</p>
      ) : null}

      {semBase ? (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.55, color: C.warnSoft }}>{semBase}</p>
      ) : null}

      {doRobo && conferidoPor === AUTOR_RIOT ? (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.55, color: C.ink3 }}>
          Conferido pela Riot e atualizado todo dia. Marcar outro estado (ou escrever uma observação) tira
          este item do robô — daí em diante vale o que a organização gravou.
        </p>
      ) : null}

      <div style={{ marginTop: 8 }}>
        <Opcoes
          valor={estado}
          opcoes={OPCOES_DE_ESTADO}
          onChange={onEstado}
          disabled={bloqueado}
          ariaLabel={`Estado do item ${letra}`}
        />
      </div>

      {afirmacaoSemBase ? (
        <p style={{ margin: "7px 0 0", fontSize: 11.5, lineHeight: 1.55, color: C.warnSoft }}>
          Você está aprovando um item que ainda não dá para medir. Se foi verificado por outro
          caminho, escreva qual na observação.
        </p>
      ) : null}

      {mostrarObservacao ? (
        <div style={{ marginTop: 8 }}>
          <Textarea
            id={observacaoId}
            value={observacao}
            rows={2}
            maxLength={LIMITES_INSCRICAO.texto}
            disabled={bloqueado}
            onChange={onObservacao}
            placeholder="O que foi visto, e onde. Ex.: print do perfil enviado no privado em 03/09."
            ariaLabel={`Observação do item ${letra}`}
          />
          <p style={{ margin: "4px 0 0", fontSize: 11, color: C.ink4 }}>
            O jogador lê esta observação em «Minha inscrição».
          </p>
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- rascunho

type RegistroConferencia = Readonly<{
  estado: string;
  observacao: string | null;
  conferido_por: string | null;
  conferido_em: string | null;
}>;

/**
 * O que a pessoa mudou e ainda não salvou — SÓ os campos que ela tocou.
 *
 * Campo ausente aqui = intocado, e campo intocado mostra sempre o valor que veio do
 * servidor. Isso importa porque a gaveta não remonta quando o painel recarrega (a chave é
 * o id do inscrito): com um `useState` por campo semeado na montagem, um recarregamento
 * deixava a tela com a foto velha, e o próximo "Salvar" devolvia ao banco o valor antigo
 * de um campo que outro organizador tinha acabado de mudar — inclusive a situação.
 */
type RascunhoFicha = Partial<{
  situacao: Inscrito["situacao"];
  eloVerificado: string;
  organizador: boolean;
  observacao: string;
  turnos: Turno[];
  nomeReal: string;
}>;

type RascunhoItem = Partial<{ estado: EstadoConferencia; observacao: string }>;

type Rascunho = Readonly<{
  ficha: RascunhoFicha;
  itens: Partial<Record<ItemConferencia, RascunhoItem>>;
}>;

const RASCUNHO_VAZIO: Rascunho = { ficha: {}, itens: {} };

/** A ficha como está no banco, no formato dos controles. */
type FichaSalva = Readonly<Required<RascunhoFicha>>;

type ItemSalvo = Readonly<{
  estado: EstadoConferencia;
  observacao: string;
  conferidoPor: string | null;
  conferidoEm: string | null;
}>;

/** Um campo da ficha "não muda nada" se, gravado, deixaria o banco como está. */
function fichaIgualAoBanco(campo: keyof RascunhoFicha, valor: unknown, salva: FichaSalva) {
  if (campo === "turnos") return turnosDe(valor as Turno[]).join(",") === salva.turnos.join(",");
  if (campo === "observacao" || campo === "nomeReal") return String(valor).trim() === salva[campo].trim();
  return valor === salva[campo];
}

/**
 * Tira do rascunho o que o banco JÁ tem — chamado quando os dados recarregam.
 *
 * O caso que isto fecha: o "Salvar tudo" grava várias linhas e pode falhar no meio. A
 * tela recarrega, e os requisitos que entraram precisam SAIR do rascunho. Se ficassem,
 * parariam de acompanhar o servidor: outro organizador muda um deles, e o próximo clique
 * aqui reenviaria o valor antigo por cima do dele.
 */
function podarRascunho(atual: Rascunho, salva: FichaSalva, itemSalvo: (item: ItemConferencia) => ItemSalvo): Rascunho {
  const ficha: RascunhoFicha = {};
  for (const [campo, valor] of Object.entries(atual.ficha) as [keyof RascunhoFicha, never][]) {
    if (!fichaIgualAoBanco(campo, valor, salva)) ficha[campo] = valor;
  }

  const itens: Rascunho["itens"] = {};
  for (const item of ITENS_CONFERENCIA) {
    const doItem = atual.itens[item];
    if (!doItem) continue;
    const salvo = itemSalvo(item);
    const resto: RascunhoItem = {};
    if (doItem.estado !== undefined && doItem.estado !== salvo.estado) resto.estado = doItem.estado;
    if (doItem.observacao !== undefined && doItem.observacao.trim() !== salvo.observacao.trim()) {
      resto.observacao = doItem.observacao;
    }
    if (Object.keys(resto).length > 0) itens[item] = resto;
  }

  return { ficha, itens };
}

// ---------------------------------------------------------------- gaveta

type Aba = "requisitos" | "ficha" | "contato";

const ABAS: readonly Readonly<{ id: Aba; rotulo: string }>[] = [
  { id: "requisitos", rotulo: "Requisitos" },
  { id: "ficha", rotulo: "Ficha" },
  { id: "contato", rotulo: "Contato" },
];

/** Para onde a pessoa pediu para ir, guardado enquanto ela decide o que fazer com o rascunho. */
type Saida = Readonly<{ rotulo: string; ir: () => void }>;

const FOCAVEIS = "a[href], button, input, select, textarea, [tabindex]";

type PropsGaveta = Readonly<{
  inscrito: Inscrito;
  config: EdicaoConfig;
  alertas: readonly Alerta[];
  conferencias: ReadonlyMap<ItemConferencia, RegistroConferencia>;
  executar: PropsSecao["executar"];
  ocupado: boolean;
  podeConferir: boolean;
  ultimoErro: string | null;
  /** Posição na lista filtrada; nulo quando o filtro atual esconde quem está aberto. */
  posicao: Readonly<{ atual: number; total: number }> | null;
  anterior: Inscrito | null;
  proximo: Inscrito | null;
  onIr: (id: string) => void;
  onFechar: () => void;
}>;

function GavetaInscrito({
  inscrito,
  config,
  alertas,
  conferencias,
  executar,
  ocupado,
  podeConferir,
  ultimoErro,
  posicao,
  anterior,
  proximo,
  onIr,
  onFechar,
}: PropsGaveta) {
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO);
  const [aba, setAba] = useState<Aba>("requisitos");
  const [saida, setSaida] = useState<Saida | null>(null);
  const [resultado, setResultado] = useState<"salvo" | "falhou" | null>(null);
  const [observacoesAbertas, setObservacoesAbertas] = useState<ReadonlySet<ItemConferencia>>(
    () => new Set(),
  );
  const [verCriterios, setVerCriterios] = useState(() => !lerOcultarCriterios());
  // "Agora" fixado na abertura: decide se a janela do (E) já abriu. A gaveta remonta a
  // cada inscrito, então o valor nunca envelhece mais do que uma conferência.
  const [agora] = useState(() => Date.now());

  const painel = useRef<HTMLDivElement>(null);
  const corpo = useRef<HTMLDivElement>(null);
  const montada = useRef(false);
  const teclado = useRef<(evento: globalThis.KeyboardEvent) => void>(() => {});
  const base = useId();
  const tituloId = `${base}-titulo`;

  /*
   * Ao abrir: o foco entra na gaveta, a página de trás para de rolar (senão a roda do
   * mouse rola a tabela por baixo) e o teclado passa a ser ouvido no DOCUMENTO. Ouvir só
   * no painel falhava quando o botão focado ficava desabilitado (o "Pendentes → Cumpre"
   * depois do clique, o "Salvar" depois de salvar): o navegador joga o foco no <body>,
   * e aí nem o Esc fechava nem o Tab ficava preso aqui dentro.
   */
  useEffect(() => {
    montada.current = true;
    painel.current?.focus();
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const ouvir = (evento: globalThis.KeyboardEvent) => teclado.current(evento);
    document.addEventListener("keydown", ouvir);
    return () => {
      montada.current = false;
      document.body.style.overflow = antes;
      document.removeEventListener("keydown", ouvir);
    };
  }, []);

  const bloqueado = !podeConferir || ocupado;

  // ------------------------------------------------ o que está no banco

  const turnosSalvos = turnosDe(inscrito.disponibilidade);

  const fichaSalva: FichaSalva = {
    situacao: inscrito.situacao,
    // O select escolhe a TRAVA manual: vazio = "automático (Riot)". Só um elo travado pela
    // organização aparece selecionado; o que veio da Riot (ou de antes do robô) é automático.
    //
    // Guardamos o RÓTULO canônico ("Grão-Mestre"), não o que veio do banco: o valor
    // gravado pode ser um alias ("GM", "diamante 2") que não casa com nenhuma <option>, e
    // aí o select apareceria vazio como se ninguém tivesse travado nada.
    eloVerificado: inscrito.elo_fonte === "organizacao" ? (resolveElo(inscrito.elo_verificado)?.label ?? "") : "",
    organizador: inscrito.organizador,
    observacao: inscrito.observacao ?? "",
    turnos: turnosSalvos,
    nomeReal: inscrito.nome_real ?? "",
  };

  const itemSalvo = (item: ItemConferencia): ItemSalvo => {
    const registro = conferencias.get(item);
    return {
      estado: comoEstado(registro?.estado),
      observacao: registro?.observacao ?? "",
      conferidoPor: registro?.conferido_por ?? null,
      conferidoEm: registro?.conferido_em ?? null,
    };
  };

  // Dados novos do servidor (todo salvamento recarrega, inclusive o que falhou): sai do
  // rascunho o que o banco já tem. Ajuste durante a render, e não num efeito — mesmo
  // padrão da aba Configuração, que `react-hooks/set-state-in-effect` exige.
  const [visto, setVisto] = useState({ inscrito, conferencias });
  if (visto.inscrito !== inscrito || visto.conferencias !== conferencias) {
    setVisto({ inscrito, conferencias });
    setRascunho((atual) => podarRascunho(atual, fichaSalva, itemSalvo));
  }

  /** Por que o item ainda não pode ser medido — ou nulo, se pode. */
  const semBaseDe = (item: ItemConferencia): string | null => {
    const ancora = ANCORA_DO_ITEM[item];
    if (!ancora) return null;
    const valor = config[ancora.campo];
    if (!valor) {
      return `Ainda não existe ${ancora.texto}: sem ela este item não tem como ser medido — o estado honesto é «não avaliável».`;
    }
    const abre = Date.parse(valor) - ancora.janelaDias * DIA_MS;
    if (Number.isFinite(abre) && agora < abre) {
      return `Este item olha os ${ancora.janelaDias} dias antes do início, e essa janela só abre em ${diaCurto(abre)}: até lá o estado honesto é «não avaliável».`;
    }
    return null;
  };

  // ------------------------------------------------ edição

  /*
   * Grava o campo no rascunho — ou o TIRA de lá, se a pessoa voltou ao valor do banco.
   * Sem isso, "mudei para apto e voltei para pendente" deixava `situacao: pendente` no
   * rascunho: a tela dizia "nada mudou", mas o campo parava de acompanhar o servidor, e
   * depois de um recarregamento reenviava o "pendente" por cima do "apto" de outra pessoa.
   *
   * Igualdade EXATA (turnos na ordem do dia): comparar texto aparado aqui engoliria o
   * espaço enquanto a pessoa digita ("abc" + espaço voltaria a "abc").
   */
  const editarFicha = <K extends keyof RascunhoFicha>(campo: K, valor: NonNullable<RascunhoFicha[K]>) => {
    const igualAoBanco =
      campo === "turnos"
        ? turnosDe(valor as Turno[]).join(",") === fichaSalva.turnos.join(",")
        : valor === fichaSalva[campo];
    setResultado(null);
    setRascunho((atual) => {
      const ficha = { ...atual.ficha };
      if (igualAoBanco) delete ficha[campo];
      else ficha[campo] = valor;
      return { ...atual, ficha };
    });
  };

  /** Mesma regra de `editarFicha`, para um requisito. */
  const editarItem = <K extends keyof RascunhoItem>(
    item: ItemConferencia,
    campo: K,
    valor: NonNullable<RascunhoItem[K]>,
  ) => {
    const igualAoBanco = valor === itemSalvo(item)[campo];
    setResultado(null);
    setRascunho((atual) => {
      const doItem: RascunhoItem = { ...atual.itens[item] };
      if (igualAoBanco) delete doItem[campo];
      else doItem[campo] = valor;
      const itens = { ...atual.itens };
      if (Object.keys(doItem).length === 0) delete itens[item];
      else itens[item] = doItem;
      return { ...atual, itens };
    });
  };

  // ------------------------------------------------ o que a tela mostra

  const situacao = rascunho.ficha.situacao ?? fichaSalva.situacao;
  const eloVerificado = rascunho.ficha.eloVerificado ?? fichaSalva.eloVerificado;
  const organizador = rascunho.ficha.organizador ?? fichaSalva.organizador;
  const observacao = rascunho.ficha.observacao ?? fichaSalva.observacao;
  const turnos = rascunho.ficha.turnos ?? fichaSalva.turnos;
  const nomeReal = rascunho.ficha.nomeReal ?? fichaSalva.nomeReal;

  const estadoDe = (item: ItemConferencia) => rascunho.itens[item]?.estado ?? itemSalvo(item).estado;
  const observacaoDe = (item: ItemConferencia) =>
    rascunho.itens[item]?.observacao ?? itemSalvo(item).observacao;

  // ------------------------------------------------ o que mudou

  // Campo intocado nunca "mudou", mesmo que o servidor tenha mudado por baixo: quem mudou
  // foi outra pessoa, e não cabe a esta tela desfazer.
  const mudouNaFicha = {
    situacao: rascunho.ficha.situacao !== undefined && situacao !== fichaSalva.situacao,
    eloVerificado: rascunho.ficha.eloVerificado !== undefined && eloVerificado !== fichaSalva.eloVerificado,
    organizador: rascunho.ficha.organizador !== undefined && organizador !== fichaSalva.organizador,
    observacao: rascunho.ficha.observacao !== undefined && observacao.trim() !== fichaSalva.observacao.trim(),
    disponibilidade:
      rascunho.ficha.turnos !== undefined && turnosDe(turnos).join(",") !== fichaSalva.turnos.join(","),
    nomeReal: rascunho.ficha.nomeReal !== undefined && nomeReal.trim() !== fichaSalva.nomeReal.trim(),
  };

  const conferenciasMudadas = ITENS_CONFERENCIA.flatMap((item) => {
    const doItem = rascunho.itens[item];
    const salvo = itemSalvo(item);
    const estadoMudou = doItem?.estado !== undefined && doItem.estado !== salvo.estado;
    const observacaoMudou =
      doItem?.observacao !== undefined && doItem.observacao.trim() !== salvo.observacao.trim();
    if (!estadoMudou && !observacaoMudou) return [];
    return [
      {
        item,
        ...(estadoMudou && { estado: doItem!.estado }),
        ...(observacaoMudou && { observacao: doItem!.observacao!.trim() }),
      },
    ];
  });

  /*
   * Envia SÓ o que esta tela mudou.
   *
   * Com dois organizadores trabalhando ao mesmo tempo (o modo normal aqui), mandar o pacote
   * inteiro devolvia os valores VELHOS dos campos que nem foram tocados: bastava alguém
   * abrir a gaveta, o outro marcar "apto", e o primeiro salvar uma observação para a
   * situação voltar a "pendente" sem aviso nenhum.
   */
  const fichaPatch = {
    ...(mudouNaFicha.situacao && { situacao }),
    ...(mudouNaFicha.eloVerificado && { eloVerificado: eloVerificado === "" ? null : eloVerificado }),
    ...(mudouNaFicha.organizador && { organizador }),
    ...(mudouNaFicha.observacao && { observacao: observacao.trim() === "" ? null : observacao.trim() }),
    ...(mudouNaFicha.disponibilidade && { disponibilidade: turnosDe(turnos) }),
    ...(mudouNaFicha.nomeReal && { nomeReal: nomeReal.trim() }),
  };

  const camposDoRequisito = conferenciasMudadas.reduce(
    (soma, c) => soma + (c.estado !== undefined ? 1 : 0) + (c.observacao !== undefined ? 1 : 0),
    0,
  );
  const naAbaFicha = Object.entries(mudouNaFicha).filter(([campo, mudou]) => mudou && campo !== "situacao").length;
  const totalMudado = camposDoRequisito + (mudouNaFicha.situacao ? 1 : 0) + naAbaFicha;
  const mudadoPorAba: Record<Aba, number> = { requisitos: camposDoRequisito, ficha: naAbaFicha, contato: 0 };

  // Mesmo critério do formulário público: duas palavras. Vazio também barra — a gaveta
  // não apaga o nome de ninguém.
  const nomeInvalido =
    mudouNaFicha.nomeReal && nomeReal.trim().split(/\s+/).filter(Boolean).length < 2;

  // Quem está Apto e acabou de ganhar um requisito ruim no rascunho: o sistema não rebaixa
  // ninguém sozinho, então a tela lembra que a situação continua a mesma.
  const aptoComItemRuim =
    fichaSalva.situacao === "apto" &&
    situacao === "apto" &&
    ITENS_CONFERENCIA.some((item) => {
      const novo = rascunho.itens[item]?.estado;
      return novo === "risco" || novo === "recusado";
    });

  const pendentes = ITENS_CONFERENCIA.filter((item) => estadoDe(item) === "pendente");
  // Item pendente que ainda é do robô (ex.: (D) sem ranque na solo/duo) fica fora do atalho:
  // marcar «Cumpre» ali afirmaria o contrário do que a Riot acabou de mostrar.
  const doRoboPendentes = pendentes.filter((item) => itemSalvo(item).conferidoPor === AUTOR_RIOT);
  const pendentesDoAtalho = pendentes.filter((item) => !doRoboPendentes.includes(item));
  const pendentesSemBase = pendentesDoAtalho.filter((item) => semBaseDe(item));

  // ------------------------------------------------ ações

  /**
   * Devolve o foco à gaveta se ele caiu fora — acontece quando o botão clicado some ou
   * fica desabilitado. Sem isso o Tab seguinte começaria do topo da página coberta.
   */
  const segurarFoco = () =>
    requestAnimationFrame(() => {
      const caixa = painel.current;
      const ativo = document.activeElement;
      if (!caixa) return;
      if (!(ativo instanceof HTMLElement) || !caixa.contains(ativo) || ativo.hasAttribute("disabled")) {
        caixa.focus({ preventScroll: true });
      }
    });

  const descartar = () => {
    setRascunho(RASCUNHO_VAZIO);
    setObservacoesAbertas(new Set());
    setResultado(null);
  };

  /** Atalho do caso comum: quem cumpre tudo resolve em um clique, e ainda dá para ajustar. */
  const marcarPendentesComoCumpre = () => {
    for (const item of pendentesDoAtalho) {
      // Item que ainda não dá para medir não "cumpre": o estado honesto é «não avaliável».
      editarItem(item, "estado", semBaseDe(item) ? "nao_avaliavel" : "ok");
    }
    segurarFoco();
  };

  const salvar = async (depois?: () => void) => {
    if (totalMudado === 0 || nomeInvalido || bloqueado) return;
    // Zera o resultado ANTES: senão, numa nova tentativa depois de uma falha, o rodapé
    // continuava dizendo "Não foi possível salvar" durante o próprio salvamento.
    setResultado(null);
    const ok = await executar("inscrito", {
      inscricaoId: inscrito.id,
      ...(conferenciasMudadas.length > 0 && { conferencias: conferenciasMudadas }),
      ...(Object.keys(fichaPatch).length > 0 && { ficha: fichaPatch }),
    });
    // A gaveta pode ter sido trocada enquanto a resposta não vinha; o que vem depois é dela.
    if (!montada.current) return;
    // Falhou: o rascunho fica, para a pessoa não perder o que marcou (o painel recarregou
    // e o que chegou a ser gravado já saiu dele).
    if (!ok) {
      setResultado("falhou");
      segurarFoco();
      return;
    }
    setRascunho(RASCUNHO_VAZIO);
    setResultado("salvo");
    if (depois) depois();
    else segurarFoco();
  };

  /** Sair com rascunho pede confirmação; sem rascunho, sai direto. Salvando, espera. */
  const tentarSair = (destino: Saida) => {
    if (ocupado) return;
    if (totalMudado > 0) setSaida(destino);
    else destino.ir();
  };

  const fechar = () => tentarSair({ rotulo: "fechar", ir: onFechar });

  const irPara = (alvo: Inscrito) => tentarSair({ rotulo: `abrir ${alvo.nick}`, ir: () => onIr(alvo.id) });

  // "Salvar e próximo" usa o vizinho de AGORA: depois de salvar, quem está aberto pode
  // sumir da lista filtrada (deixou de ter pendência) e o "próximo" mudaria debaixo dela.
  const salvarEProximo = () => {
    if (!proximo || ocupado) return;
    const alvo = proximo.id;
    if (totalMudado === 0) onIr(alvo);
    else void salvar(() => onIr(alvo));
  };

  const aoTeclar = (evento: globalThis.KeyboardEvent) => {
    const caixa = painel.current;
    if (!caixa) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      if (saida) {
        setSaida(null);
        segurarFoco();
      } else {
        fechar();
      }
      return;
    }

    // O foco não escapa da gaveta pelo Tab: atrás dela está a tabela, coberta.
    if (evento.key !== "Tab") return;
    const focaveis = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS)).filter(
      (el) => el.tabIndex >= 0 && !el.hasAttribute("disabled"),
    );
    const primeiro = focaveis[0];
    const ultimo = focaveis.at(-1);
    const atual = document.activeElement;
    if (!primeiro || !ultimo) {
      evento.preventDefault();
      caixa.focus();
    } else if (!(atual instanceof Node) || !caixa.contains(atual)) {
      evento.preventDefault();
      (evento.shiftKey ? ultimo : primeiro).focus();
    } else if (evento.shiftKey && (atual === primeiro || atual === caixa)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  };

  // O ouvinte do documento chama sempre a versão desta render (com o rascunho de agora).
  useEffect(() => {
    teclado.current = aoTeclar;
  });

  const trocarAba = (destino: Aba) => {
    setAba(destino);
    corpo.current?.scrollTo?.({ top: 0 });
  };

  const teclarAba = (evento: KeyboardEvent<HTMLButtonElement>, indice: number) => {
    const passo = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (passo === 0) return;
    evento.preventDefault();
    const destino = (indice + passo + ABAS.length) % ABAS.length;
    trocarAba(ABAS[destino]!.id);
    evento.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>("[role=tab]")[destino]?.focus();
  };

  // ------------------------------------------------ desenho

  const elo = eloExibido(inscrito);
  const rotas = rotasDoInscrito(inscrito);
  const congelado = Boolean(inscrito.elo_congelado);
  const opgg = getOpGgSummonerUrlFromNick(inscrito.riot_id);

  const abaRequisitos = (
    <div>
      <Toolbar>
        <span style={{ fontSize: 12, color: C.ink3, ...tabular }}>
          {pendentes.length === 0
            ? "Nenhum requisito pendente."
            : `${plural(pendentes.length, "requisito pendente", "requisitos pendentes")}.`}
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            small
            tone="gold"
            disabled={bloqueado || pendentesDoAtalho.length === 0}
            title={podeConferir ? "Marca «Cumpre» em tudo que está pendente. Nada é gravado até você salvar." : SEM_ESCOPO}
            onClick={marcarPendentesComoCumpre}
          >
            ✓ Pendentes → Cumpre
          </Button>
          <Button
            small
            onClick={() => {
              gravarOcultarCriterios(verCriterios);
              setVerCriterios(!verCriterios);
            }}
          >
            {verCriterios ? "Ocultar critérios" : "Mostrar critérios"}
          </Button>
        </span>
      </Toolbar>
      {pendentesSemBase.length > 0 ? (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.ink4 }}>
          O atalho marca {pendentesSemBase.map((item) => `(${item.toUpperCase()})`).join(", ")} como «Não
          avaliável»: ainda não dá para medir.
        </p>
      ) : null}
      {doRoboPendentes.length > 0 ? (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.ink4 }}>
          O atalho pula {doRoboPendentes.map((item) => `(${item.toUpperCase()})`).join(", ")}: quem está
          acompanhando é a Riot.
        </p>
      ) : null}

      {alertas.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <Banner tone="warn" title={plural(alertas.length, "ponto de atenção", "pontos de atenção")}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {alertas.map((a) => (
                <li key={a.codigo}>{a.texto}</li>
              ))}
            </ul>
          </Banner>
        </div>
      ) : null}

      {ITENS_CONFERENCIA.map((item) => {
        const salvo = itemSalvo(item);
        return (
          <Requisito
            key={item}
            item={item}
            estado={estadoDe(item)}
            estadoSalvo={salvo.estado}
            observacao={observacaoDe(item)}
            observacaoSalva={salvo.observacao}
            conferidoPor={salvo.conferidoPor}
            conferidoEm={salvo.conferidoEm}
            semBase={semBaseDe(item)}
            doRobo={salvo.conferidoPor === null || salvo.conferidoPor === AUTOR_RIOT}
            verCriterio={verCriterios}
            observacaoAberta={observacoesAbertas.has(item)}
            bloqueado={bloqueado}
            onEstado={(estado) => editarItem(item, "estado", estado)}
            onObservacao={(texto) => editarItem(item, "observacao", texto)}
            onAbrirObservacao={() => setObservacoesAbertas((atual) => new Set(atual).add(item))}
          />
        );
      })}
    </div>
  );

  const abaFicha = (
    <div style={{ display: "grid", gap: 16 }}>
      <FieldGrid min={210}>
        <Field
          label="Elo"
          hint={
            congelado
              ? "O elo já está congelado: isto corrige o registro, mas não o preço no draft."
              : inscrito.elo_fonte === "organizacao"
                ? `Travado à mão${inscrito.elo_riot ? ` — a Riot mostra ${inscrito.elo_riot}` : ""}. Escolha «automático» para voltar a seguir a Riot.`
                : `Automático: segue a solo/duo na Riot todo dia${inscrito.elo_riot ? ` (hoje ${inscrito.elo_riot})` : ""}. Escolher um elo trava este inscrito nesse valor.`
          }
        >
          <Select
            value={eloVerificado}
            disabled={bloqueado}
            onChange={(v) => editarFicha("eloVerificado", v)}
            ariaLabel="Elo verificado"
          >
            <option value="">— automático (Riot) —</option>
            {ELO_ORDER.map((e) => (
              <option key={e.key} value={e.label}>
                {e.label} · {e.pts} pts
              </option>
            ))}
          </Select>
        </Field>

        {/*
          Editável porque quem se inscreveu quando o campo ainda era "Nome (opcional)" pode
          ter mandado só o apelido, e a regra 1 é conferida pelo nome do grupo do WhatsApp.
        */}
        <Field
          label="Nome e sobrenome"
          hint={
            nomeInvalido
              ? "Use nome e sobrenome — duas palavras, como no grupo do WhatsApp."
              : "Como no grupo do WhatsApp. Corrija só com o que o jogador informou."
          }
        >
          <Input
            value={nomeReal}
            disabled={bloqueado}
            maxLength={LIMITES_INSCRICAO.nome}
            onChange={(v) => editarFicha("nomeReal", v)}
            ariaLabel="Nome e sobrenome do inscrito"
          />
        </Field>
      </FieldGrid>

      {congelado ? (
        <Banner tone="warn" title="Elo congelado">
          O elo deste inscrito foi congelado em {inscrito.elo_congelado} e é esse valor que vale
          no draft. Mudar o elo verificado agora corrige o registro, mas <b>não</b> muda mais o
          preço — para isso a organização teria que congelar tudo de novo, o que reprecifica
          todo mundo.
        </Banner>
      ) : null}

      <Check checked={organizador} disabled={bloqueado} onChange={(v) => editarFicha("organizador", v)}>
        É da organização desta edição — <b>não paga inscrição e não é capitão</b>, mas joga.
        Marcar aqui não mexe no pagamento: a aba Pagamentos avisa e oferece o botão
        <b> Isentar</b> para quem cuida do caixa.
      </Check>

      {/*
        A disponibilidade é do jogador, mas fica editável aqui por um motivo só: quem se
        inscreveu antes de o formulário perguntar os turnos não tem como responder pelo
        site, e a organização registra o que ele disser no grupo.
      */}
      <fieldset style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}>
        <legend style={{ padding: 0, fontSize: 12, color: C.ink2, marginBottom: 6 }}>
          Disponibilidade (regra 9)
        </legend>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {TURNOS.map((turno) => (
            <Check
              key={turno}
              checked={turnos.includes(turno)}
              disabled={bloqueado}
              onChange={(marcado) =>
                editarFicha("turnos", marcado ? [...turnos, turno] : turnos.filter((x) => x !== turno))
              }
            >
              {ROTULO_TURNO[turno]}
            </Check>
          ))}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.ink4 }}>
          Vem do formulário. Edite só para registrar o que o jogador informou à organização.
        </p>
      </fieldset>

      <Field
        label="Observação da ficha"
        hint="Vale para a inscrição inteira. Cada requisito tem a observação dele, na aba Requisitos."
      >
        <Textarea
          value={observacao}
          rows={3}
          maxLength={LIMITES_INSCRICAO.texto}
          disabled={bloqueado}
          onChange={(v) => editarFicha("observacao", v)}
          placeholder="Ex.: pediu para jogar no mesmo time do irmão; combinado que não há garantia."
          ariaLabel="Observação da ficha"
        />
      </Field>
    </div>
  );

  const abaContato = (
    <div>
      <FieldGrid min={170}>
        <Dado rotulo="Riot ID" valor={inscrito.riot_id} />
        <Dado rotulo="Nome e sobrenome" valor={inscrito.nome_real ?? "não informado"} />
        <Dado rotulo="E-mail" valor={inscrito.email} />
        <Dado rotulo="Discord" valor={inscrito.discord} />
        <Dado rotulo="WhatsApp" valor={inscrito.whatsapp ?? "não informado"} />
        <Dado rotulo="Rotas" valor={rotas.longo} />
        <Dado
          rotulo="Disponibilidade"
          valor={
            turnosSalvos.length > 0 ? turnosSalvos.map((t) => ROTULO_TURNO[t]).join(" · ") : "não informada"
          }
        />
        <Dado rotulo="Inscrito em" valor={formatDateTimeLabel(inscrito.criado_em)} />
      </FieldGrid>
      {/* Contato é dado do jogador e fica só de leitura: se o Discord está errado, quem
          corrige é ele na própria inscrição — corrigir por cima aqui apagaria a pista de
          que o que ele mandou não batia. */}
      <p style={{ margin: "10px 0 0", fontSize: 11, color: C.ink4 }}>
        Contato vem da inscrição e não se edita por aqui.
      </p>

      <div style={{ marginTop: 16 }}>
        <FieldGrid min={150}>
          <Metric small label="Elo declarado" value={resolveElo(inscrito.elo_declarado)?.label ?? inscrito.elo_declarado} />
          <Metric
            small
            label="Elo em uso"
            value={<span style={{ color: elo.cor }}>{elo.rotulo}</span>}
            detail={elo.origem}
          />
          {/*
            NÃO existe campo de pontos aqui, e não é esquecimento.
            O preço do jogador no draft é derivado do elo pelo servidor (`pontosDoElo`).
            Um campo editável reabriria pela porta dos fundos exatamente o que o formulário
            público fecha: mandar "elo: Ferro, pontos: 15" e adulterar o sorteio.
            Para mudar o preço de alguém, corrija o ELO VERIFICADO na aba Ficha.
          */}
          <Metric small label="Pontos no draft" value={inscrito.pontos} detail="derivado do elo — não editável" />
          <Metric
            small
            label="Na Riot (solo/duo)"
            value={eloNaRiot(inscrito) ?? "—"}
            detail={inscrito.riot_sincronizado_em ? `consultado em ${quandoCurto(inscrito.riot_sincronizado_em)}` : "ainda não consultado"}
          />
        </FieldGrid>
      </div>
    </div>
  );

  const painelDaAba: Record<Aba, ReactNode> = {
    requisitos: abaRequisitos,
    ficha: abaFicha,
    contato: abaContato,
  };

  // ------------------------------------------------ rodapé

  let situacaoDoRascunho: ReactNode;
  if (!podeConferir) {
    situacaoDoRascunho = <span style={{ color: C.ink4 }}>Somente leitura. {SEM_ESCOPO}</span>;
  } else if (ocupado) {
    situacaoDoRascunho = <span style={{ color: C.ink3 }}>Salvando…</span>;
  } else if (resultado === "falhou") {
    situacaoDoRascunho = (
      <span role="alert" style={{ color: C.dangerSoft }}>
        {ultimoErro ?? "Não foi possível salvar."} O que não foi gravado continua marcado aqui.
      </span>
    );
  } else if (nomeInvalido) {
    situacaoDoRascunho = (
      <span style={{ color: C.warnSoft }}>O nome precisa de nome e sobrenome (aba Ficha).</span>
    );
  } else if (totalMudado > 0) {
    situacaoDoRascunho = (
      <span style={{ color: C.warnSoft }}>
        {plural(totalMudado, "alteração não salva", "alterações não salvas")} ·{" "}
        <BotaoLink
          onClick={() => {
            descartar();
            segurarFoco();
          }}
        >
          descartar
        </BotaoLink>
      </span>
    );
  } else if (resultado === "salvo") {
    situacaoDoRascunho = <span style={{ color: C.okSoft }}>✓ Salvo.</span>;
  } else {
    situacaoDoRascunho = <span style={{ color: C.ink4 }}>Nada alterado.</span>;
  }

  // Na confirmação de saída o SALVAR fica na ponta direita — o mesmo lugar do "Salvar tudo"
  // de um instante antes. Um clique por reflexo ali salva; nunca descarta.
  const rodape = saida ? (
    <Toolbar
      right={
        <>
          <Button
            small
            onClick={() => {
              setSaida(null);
              segurarFoco();
            }}
          >
            Continuar editando
          </Button>
          <Button
            small
            tone="danger"
            onClick={() => {
              const destino = saida;
              setSaida(null);
              descartar();
              destino.ir();
            }}
          >
            Descartar
          </Button>
          <Button
            small
            tone="gold"
            disabled={bloqueado || nomeInvalido}
            onClick={() => {
              const destino = saida;
              setSaida(null);
              void salvar(destino.ir);
            }}
          >
            Salvar e {saida.rotulo}
          </Button>
        </>
      }
    >
      <span role="alert" style={{ fontSize: 12, color: C.warnSoft }}>
        {plural(totalMudado, "alteração não salva", "alterações não salvas")}.
      </span>
    </Toolbar>
  ) : (
    <>
      {/* A decisão fica sempre à vista, em qualquer aba: é a conclusão da conferência e sai
          no mesmo "Salvar". No fim da aba Requisitos ela ficava abaixo da dobra, e o caminho
          rápido salvava sem decidir. */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px 12px", flexWrap: "wrap", marginBottom: 10 }}>
        <span
          style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: C.bronze }}
          aria-hidden
        >
          Situação
        </span>
        <Opcoes
          valor={situacao}
          opcoes={OPCOES_DE_SITUACAO}
          onChange={(v) => editarFicha("situacao", v)}
          disabled={bloqueado}
          ariaLabel="Situação do inscrito"
        />
      </div>
      {aptoComItemRuim ? (
        <p role="alert" style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.warnSoft }}>
          Este inscrito continua <b>Apto</b> — se o requisito marcado agora o tira do campeonato, ajuste a
          situação também.
        </p>
      ) : inscrito.promocao_automatica === false && situacao === "pendente" ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.ink3 }}>
          Segurado pela organização: o sistema não promove este inscrito a Apto sozinho.
        </p>
      ) : situacao === "pendente" ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11, color: C.ink4 }}>
          Vira Apto sozinho quando todos os requisitos cumprirem e o pagamento estiver confirmado.
        </p>
      ) : null}
      <Toolbar
        right={
          <>
            {proximo ? (
              <Button
                disabled={ocupado || (totalMudado > 0 && (nomeInvalido || !podeConferir))}
                title={`Próximo da lista: ${proximo.nick}#${proximo.tag}`}
                onClick={salvarEProximo}
              >
                {totalMudado > 0 ? "Salvar e próximo ›" : "Próximo ›"}
              </Button>
            ) : null}
            <Button
              tone="gold"
              disabled={bloqueado || totalMudado === 0 || nomeInvalido}
              title={podeConferir ? "Grava requisitos, situação e ficha de uma vez" : SEM_ESCOPO}
              onClick={() => void salvar()}
            >
              {ocupado ? "Salvando…" : "Salvar tudo"}
            </Button>
          </>
        }
      >
        <span aria-live="polite" style={{ fontSize: 12, ...tabular }}>
          {situacaoDoRascunho}
        </span>
      </Toolbar>
    </>
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9000 }}>
      {/* Fundo: clicar fora fecha (com a mesma confirmação do ✕ quando há rascunho). */}
      <div aria-hidden onClick={fechar} style={{ position: "absolute", inset: 0, background: "rgba(5,3,1,.72)" }} />

      <div
        ref={painel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="lob-gaveta"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "min(680px, 100vw)",
          display: "flex",
          flexDirection: "column",
          background: C.ground,
          borderLeft: `1px solid ${C.line2}`,
          boxShadow: "-24px 0 60px rgba(0,0,0,.55)",
          outline: "none",
          color: C.ink2,
        }}
      >
        {/* ------------------------------------------------ cabeçalho */}
        <header style={{ padding: "12px 18px 0", background: C.panel, borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Button
              small
              disabled={!anterior || ocupado}
              title={anterior ? `Anterior: ${anterior.nick}#${anterior.tag}` : "Início da lista"}
              onClick={() => anterior && irPara(anterior)}
            >
              ‹ Anterior
            </Button>
            <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>
              {posicao ? `${posicao.atual} de ${posicao.total}` : "fora do filtro"}
            </span>
            <Button
              small
              disabled={!proximo || ocupado}
              title={proximo ? `Próximo: ${proximo.nick}#${proximo.tag}` : "Fim da lista"}
              onClick={() => proximo && irPara(proximo)}
            >
              Próximo ›
            </Button>
            <span style={{ marginLeft: "auto" }}>
              <Button small disabled={ocupado} onClick={fechar} title="Fechar (Esc)">
                ✕ Fechar
              </Button>
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <h2 id={tituloId} style={{ fontFamily: display, fontSize: 22, color: C.ink, margin: 0 }}>
              {inscrito.nick}
              <span style={{ color: C.ink4 }}>#{inscrito.tag}</span>
            </h2>
            <Chip tone={TOM_SITUACAO[inscrito.situacao]} title="Situação gravada">
              {ROTULO_SITUACAO[inscrito.situacao]}
            </Chip>
            {inscrito.organizador ? (
              <Chip tone="gold" title="Organizador desta edição — não paga inscrição e não é capitão">
                organização
              </Chip>
            ) : null}
            {turnosSalvos.length === 0 ? (
              <Chip tone="warn" title="Inscrito antes de o formulário perguntar os turnos — preencha na aba Ficha.">
                sem disponibilidade
              </Chip>
            ) : null}
            {congelado ? <Chip tone="warn">elo congelado</Chip> : null}
          </div>

          {/* O que se olha ao conferir, sem trocar de aba. */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px 14px",
              flexWrap: "wrap",
              marginTop: 8,
              fontSize: 12.5,
              ...tabular,
            }}
          >
            <span>
              <span style={{ color: elo.cor, fontWeight: 700 }}>{elo.rotulo}</span>
              <span style={{ color: C.ink4 }}> {elo.origem}</span>
            </span>
            <span style={{ color: C.ink3 }}>{inscrito.pontos} pts</span>
            <span style={{ color: C.ink3 }} title={rotas.longo}>
              {rotas.curto}
            </span>
            {opgg ? (
              <a href={opgg} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12 }}>
                op.gg ↗
              </a>
            ) : null}
          </div>

          {/* O que a Riot mostrou: fatos para a conferência — inclusive para o (F), que a
              organização decide. Nada aqui é rótulo de suspeita. */}
          <div
            style={{ display: "flex", alignItems: "center", gap: "4px 12px", flexWrap: "wrap", marginTop: 4, fontSize: 11.5, color: C.ink3, ...tabular }}
          >
            <span style={{ color: C.bronze, letterSpacing: ".12em", textTransform: "uppercase", fontSize: 10 }}>Riot</span>
            {inscrito.riot_sincronizado_em ? (
              <>
                <span>{eloNaRiot(inscrito) ?? "sem ranque na solo/duo"}</span>
                {inscrito.riot_nivel !== null && inscrito.riot_nivel !== undefined ? (
                  <span>nível {inscrito.riot_nivel}</span>
                ) : null}
                {inscrito.riot_vitorias !== null &&
                inscrito.riot_vitorias !== undefined &&
                inscrito.riot_derrotas !== null &&
                inscrito.riot_derrotas !== undefined ? (
                  <span>
                    {inscrito.riot_vitorias}V/{inscrito.riot_derrotas}D
                    {inscrito.riot_vitorias + inscrito.riot_derrotas > 0
                      ? ` (${Math.round((100 * inscrito.riot_vitorias) / (inscrito.riot_vitorias + inscrito.riot_derrotas))}%)`
                      : ""}
                  </span>
                ) : null}
                <span style={{ color: C.ink4 }}>{haQuanto(inscrito.riot_sincronizado_em, agora)}</span>
              </>
            ) : (
              <span style={{ color: C.ink4 }}>ainda não consultado</span>
            )}
            <BotaoLink
              disabled={bloqueado}
              onClick={() => void executar("sincronizar_riot", { inscricaoId: inscrito.id })}
            >
              atualizar da Riot
            </BotaoLink>
          </div>

          <div role="tablist" aria-label="Partes da inscrição" style={{ display: "flex", gap: 4, marginTop: 10 }}>
            {ABAS.map((a, indice) => {
              const ativa = a.id === aba;
              const mudados = mudadoPorAba[a.id];
              return (
                <button
                  key={a.id}
                  id={`${base}-aba-${a.id}`}
                  type="button"
                  role="tab"
                  aria-selected={ativa}
                  aria-controls={`${base}-painel`}
                  tabIndex={ativa ? 0 : -1}
                  onClick={() => trocarAba(a.id)}
                  onKeyDown={(evento) => teclarAba(evento, indice)}
                  style={{
                    padding: "9px 14px 10px",
                    border: 0,
                    borderBottom: `2px solid ${ativa ? C.bronzeHi : "transparent"}`,
                    background: "none",
                    fontFamily: "inherit",
                    fontSize: 12.5,
                    fontWeight: ativa ? 700 : 500,
                    letterSpacing: ".04em",
                    color: ativa ? C.ink : C.ink3,
                    cursor: "pointer",
                  }}
                >
                  {a.rotulo}
                  {mudados > 0 ? (
                    <span
                      title={plural(mudados, "alteração não salva", "alterações não salvas")}
                      style={{ marginLeft: 6, color: C.warn, ...tabular }}
                    >
                      ● {mudados}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </header>

        {/* ------------------------------------------------ corpo (só ele rola) */}
        <div
          ref={corpo}
          id={`${base}-painel`}
          role="tabpanel"
          aria-labelledby={`${base}-aba-${aba}`}
          style={{ flex: 1, overflowY: "auto", padding: "10px 18px 22px" }}
        >
          {painelDaAba[aba]}
        </div>

        {/* ------------------------------------------------ rodapé (sempre à vista) */}
        <footer style={{ padding: "12px 18px", background: C.panel, borderTop: `1px solid ${C.line2}` }}>
          {rodape}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- robô da Riot

/**
 * Estado do robô da Riot e o botão de rodar agora.
 *
 * O robô roda sozinho uma vez por dia (Vercel Cron). Esta barra existe para a organização
 * saber que ele está vivo: um cron que para de rodar não dá erro em lugar nenhum — o elo
 * só fica velho em silêncio. Mais de 26 h sem rodada vira aviso.
 */
function BarraDoRobo({
  config,
  agora,
  bloqueado,
  ocupado,
  onAtualizar,
}: Readonly<{
  config: EdicaoConfig;
  agora: number | null;
  bloqueado: boolean;
  ocupado: boolean;
  onAtualizar: () => void;
}>) {
  const ultima = config.riot_ultima_execucao ?? null;
  const resumo = config.riot_ultimo_resumo ?? null;
  const pausaAte = config.riot_pausa_ate ? new Date(config.riot_pausa_ate).getTime() : NaN;
  const pausado = agora !== null && Number.isFinite(pausaAte) && pausaAte > agora;
  const atrasado = agora !== null && ultima !== null && agora - new Date(ultima).getTime() > ROBO_ATRASADO_MS;

  let texto: ReactNode;
  if (!ultima) {
    texto = "Ainda não rodou. Roda sozinho todo dia às 6h; o botão roda agora.";
  } else {
    const partes = [`última rodada ${quandoCurto(ultima)} (${haQuanto(ultima, agora)})`];
    if (resumo?.processados !== undefined) partes.push(`${resumo.processados} consultados`);
    if (resumo?.elosMudados) partes.push(`${resumo.elosMudados} elo(s) mudaram`);
    if (resumo?.erros) partes.push(`${resumo.erros} com erro`);
    texto = partes.join(" · ");
  }

  return (
    <Card padding="12px 16px" style={{ marginBottom: 12 }}>
      <Toolbar
        right={
          <Button
            small
            tone="gold"
            disabled={bloqueado || pausado}
            title={bloqueado && !ocupado ? SEM_ESCOPO : "Consulta a Riot agora — quem está há mais tempo sem consulta vai primeiro."}
            onClick={onAtualizar}
          >
            {ocupado ? "Atualizando…" : "Atualizar da Riot agora"}
          </Button>
        }
      >
        <span style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: C.bronze }}>
          Robô da Riot
        </span>
        <span style={{ fontSize: 12, color: C.ink3, ...tabular }}>{texto}</span>
      </Toolbar>
      {pausado ? (
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.warnSoft }}>
          Pausado até {quandoCurto(config.riot_pausa_ate ?? null)}: a Riot pediu para esperar (limite de requisições).
        </p>
      ) : resumo?.parouPor === "chave_recusada" ? (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 11.5, color: C.dangerSoft }}>
          A Riot recusou a chave da API na última rodada — nada foi conferido. Troque a RIOT_API_KEY nas
          variáveis da Vercel (chave pessoal, que não expira) e faça um novo deploy.
        </p>
      ) : atrasado ? (
        <p style={{ margin: "8px 0 0", fontSize: 11.5, color: C.warnSoft }}>
          Mais de 26 h sem rodada automática — a rotina diária pode ter parado. Use o botão e avise quem
          cuida do site.
        </p>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------- seção

export function SecaoInscritos({ dados, executar, ocupado, podeConferir, ultimoErro = null }: PropsSecao) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [soPendencia, setSoPendencia] = useState(false);
  const [soAlerta, setSoAlerta] = useState(false);
  const contagemId = useId();
  const agora = useAgora();

  const { config, inscritos, conferencias, pagamentos, panorama } = dados;
  const janelaAberta = estadoDaJanela(config, agora) === "aberta";

  /** Conferências indexadas por inscrito e item — a tabela lê isto 6 vezes por linha. */
  const porInscrito = useMemo(() => {
    const mapa = new Map<string, Map<ItemConferencia, (typeof conferencias)[number]>>();
    for (const registro of conferencias) {
      const doInscrito = mapa.get(registro.inscricao_id) ?? new Map();
      doInscrito.set(registro.item, registro);
      mapa.set(registro.inscricao_id, doInscrito);
    }
    return mapa;
  }, [conferencias]);

  /** O que merece olho em cada inscrito (ver `alertasDoInscrito`). Calculado, nunca gravado. */
  const alertasPorInscrito = useMemo(() => {
    const pagamentoDe = new Map<string, Pagamento>(pagamentos.map((p) => [p.inscricao_id, p]));
    const mapa = new Map<string, Alerta[]>();
    for (const i of inscritos) {
      const alertas = alertasDoInscrito({
        inscrito: i,
        conferencias: [...(porInscrito.get(i.id)?.values() ?? [])],
        pagamento: pagamentoDe.get(i.id) ?? null,
        config,
        agoraMs: agora,
      });
      if (alertas.length > 0) mapa.set(i.id, alertas);
    }
    return mapa;
  }, [inscritos, pagamentos, porInscrito, config, agora]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    // "Com pendência" é só o estado `pendente` — item sem linha no banco conta como
    // pendente também. "não avaliável" fica de fora de propósito: ali não há nada que a
    // organização possa fazer enquanto a data não for decidida.
    const temPendencia = (id: string) => {
      const doInscrito = porInscrito.get(id);
      return ITENS_CONFERENCIA.some((item) => comoEstado(doInscrito?.get(item)?.estado) === "pendente");
    };

    return inscritos.filter((i) => {
      if (filtroSituacao !== "todos" && i.situacao !== filtroSituacao) return false;
      if (soPendencia && !temPendencia(i.id)) return false;
      if (soAlerta && !alertasPorInscrito.has(i.id)) return false;
      if (!termo) return true;
      return [i.nick, i.riot_id, i.discord, i.email, i.nome_real ?? ""].some((campo) =>
        campo.toLowerCase().includes(termo),
      );
    });
  }, [inscritos, busca, filtroSituacao, soPendencia, soAlerta, porInscrito, alertasPorInscrito]);

  // A gaveta busca em TODOS os inscritos, não nos visíveis: mudar um filtro (ou salvar
  // alguém que por isso sai do filtro) não pode fechar a pessoa que está aberta.
  const selecionado = inscritos.find((i) => i.id === selecionadoId) ?? null;

  /*
   * Vizinhos na ordem da tabela, mesmo quando quem está aberto saiu do filtro: procura-se
   * pela posição na lista COMPLETA. Sem isso, salvar alguém com "só pendências" ligado o
   * tirava da lista e o "próximo" voltava para o começo.
   */
  const vizinhos = useMemo(() => {
    if (!selecionadoId) return { anterior: null, proximo: null, posicao: null };
    const visivel = new Set(visiveis.map((i) => i.id));
    const ondeEsta = inscritos.findIndex((i) => i.id === selecionadoId);
    const indiceVisivel = visiveis.findIndex((i) => i.id === selecionadoId);
    return {
      anterior:
        inscritos
          .slice(0, Math.max(ondeEsta, 0))
          .reverse()
          .find((i) => visivel.has(i.id)) ?? null,
      proximo: inscritos.slice(ondeEsta + 1).find((i) => visivel.has(i.id)) ?? null,
      posicao: indiceVisivel >= 0 ? { atual: indiceVisivel + 1, total: visiveis.length } : null,
    };
  }, [inscritos, visiveis, selecionadoId]);

  /**
   * Fecha e devolve o foco à linha de onde a gaveta saiu — quem usa teclado não se perde.
   * Se a linha sumiu (salvou e saiu do filtro), vai para a vizinha; sem vizinha, para a
   * contagem logo acima da tabela. Nunca para o <body>, que manda o Tab ao topo da página.
   */
  const fecharGaveta = () => {
    const candidatos = [selecionadoId, vizinhos.proximo?.id, vizinhos.anterior?.id];
    setSelecionadoId(null);
    requestAnimationFrame(() => {
      const linha = candidatos
        .map((id) => (id ? document.getElementById(`inscrito-${id}`) : null))
        .find((el) => el !== null);
      (linha ?? document.getElementById(contagemId))?.focus();
    });
  };

  const cabecalho = (
    <SectionHead
      eyebrow="4ª Edição"
      title="Inscritos e conferência"
      description="Clique em alguém para abrir a conferência: requisitos, ficha e contato numa gaveta, com um «Salvar tudo» só. O robô da Riot confere elo e os itens (D), (M) e (E) sozinho todo dia; quem cumpre tudo e pagou vira Apto sem clique."
    />
  );

  if (inscritos.length === 0) {
    return (
      <div>
        {cabecalho}
        <Empty
          title="Nenhuma inscrição ainda"
          action={
            <Chip tone={janelaAberta ? "ok" : "warn"}>
              {janelaAberta ? "inscrições abertas" : "inscrições fechadas"}
            </Chip>
          }
        >
          {janelaAberta
            ? "O formulário está no ar e ninguém enviou ainda. Assim que a primeira inscrição chegar, ela aparece aqui com os seis requisitos pendentes."
            : "As inscrições ainda não foram abertas. Abra-as na aba Configuração — enquanto a chave estiver fechada, o formulário público não aceita ninguém."}
        </Empty>
      </div>
    );
  }

  return (
    <div>
      {cabecalho}

      {!podeConferir ? (
        <Banner tone="warn" title="Somente leitura">
          Você enxerga tudo, mas não pode alterar conferência nem ficha: {SEM_ESCOPO}
        </Banner>
      ) : null}

      <FieldGrid min={140} style={{ marginBottom: 18 }}>
        <Metric small label="Inscritos" value={panorama.inscritos} />
        <Metric small label="Pendentes" value={panorama.pendentes} />
        <Metric small label="Aprovados" value={panorama.aprovados} />
        <Metric small label="Recusados" value={panorama.recusados} />
        <Metric
          small
          label="Times (derivado)"
          value={panorama.times}
          detail={`de ${panorama.elegiveis} (pendentes + aprovados)`}
        />
      </FieldGrid>

      <BarraDoRobo
        config={config}
        agora={agora}
        bloqueado={!podeConferir || ocupado}
        ocupado={ocupado}
        onAtualizar={() => void executar("sincronizar_riot")}
      />

      <Card padding="14px 16px">
        <Toolbar style={{ alignItems: "flex-end" }}>
          <Field label="Buscar" style={{ flex: "1 1 200px" }}>
            <Input
              value={busca}
              onChange={setBusca}
              placeholder="nick, Riot ID, Discord ou e-mail"
              ariaLabel="Buscar inscrito"
            />
          </Field>
          <Field label="Situação" style={{ flex: "0 0 160px" }}>
            <Select value={filtroSituacao} onChange={setFiltroSituacao} ariaLabel="Filtrar por situação">
              <option value="todos">Todas</option>
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Select>
          </Field>
        </Toolbar>

        <div style={{ marginTop: 12, display: "flex", gap: "8px 22px", flexWrap: "wrap" }}>
          <Check checked={soPendencia} onChange={setSoPendencia}>
            Só quem tem algum requisito pendente
          </Check>
          <Check checked={soAlerta} onChange={setSoAlerta}>
            Só quem tem ponto de atenção ({alertasPorInscrito.size})
          </Check>
        </div>

        <p
          id={contagemId}
          tabIndex={-1}
          style={{ margin: "12px 0 10px", fontSize: 11.5, color: C.ink4, outline: "none", ...tabular }}
        >
          Mostrando {visiveis.length} de {inscritos.length}. Clique em alguém para conferir.
        </p>

        {visiveis.length === 0 ? (
          <Empty title="Nenhum inscrito com esses filtros">
            Limpe a busca ou volte a situação para «todas».
          </Empty>
        ) : (
          <ScrollX>
            <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...th, textAlign: "left", width: "100%" }}>
                    Inscrito
                  </th>
                  <th
                    scope="col"
                    style={{ ...th, textAlign: "left" }}
                    title="Congelado, se houver; senão o verificado (pela Riot, ou travado pela organização); senão o declarado."
                  >
                    Elo
                  </th>
                  <th scope="col" style={{ ...th, textAlign: "right" }} title="Derivado do elo">
                    Pts
                  </th>
                  <th scope="col" style={{ ...th, textAlign: "left" }}>
                    Rotas
                  </th>
                  {ITENS_CONFERENCIA.map((item) => (
                    <th
                      key={item}
                      scope="col"
                      style={{ ...th, textAlign: "center" }}
                      title={REGRA_DO_ITEM[item].titulo}
                    >
                      {item}
                    </th>
                  ))}
                  <th scope="col" style={{ ...th, textAlign: "left" }}>
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((inscrito) => {
                  const aberto = inscrito.id === selecionadoId;
                  const elo = eloExibido(inscrito);
                  const rotas = rotasDoInscrito(inscrito);
                  const doInscrito = porInscrito.get(inscrito.id);

                  return (
                    <tr
                      key={inscrito.id}
                      onClick={() => setSelecionadoId(inscrito.id)}
                      // Hover e foco (globals.css): dizem que a linha inteira abre a gaveta.
                      className="lob-linha-abre"
                      title={`Abrir a conferência de ${inscrito.nick}`}
                      style={{
                        background: aberto ? "rgba(201,138,75,.12)" : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...td, whiteSpace: "normal" }}>
                        {/* O botão existe para a linha ser alcançável por teclado e ser
                            anunciada como controle — <tr onClick> sozinho não é nem uma
                            coisa nem outra. O clique na linha é atalho de mouse. */}
                        <button
                          id={`inscrito-${inscrito.id}`}
                          className="lob-linha-abre__nome"
                          type="button"
                          aria-haspopup="dialog"
                          aria-expanded={aberto}
                          onClick={(evento) => {
                            evento.stopPropagation();
                            setSelecionadoId(inscrito.id);
                          }}
                          style={{
                            display: "block",
                            padding: 0,
                            border: "none",
                            background: "none",
                            textAlign: "left",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: aberto ? 700 : 600,
                            color: aberto ? C.bronzeLit : C.ink,
                            cursor: "pointer",
                          }}
                        >
                          {inscrito.nick}
                          <span style={{ color: C.ink4, fontWeight: 400 }}>#{inscrito.tag}</span>
                        </button>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 3,
                          }}
                        >
                          <span style={{ fontSize: 11, color: C.ink4 }}>{inscrito.riot_id}</span>
                          {inscrito.organizador ? (
                            <Chip tone="gold" title="Organizador desta edição — não paga inscrição e não é capitão">
                              org
                            </Chip>
                          ) : null}
                          {turnosDe(inscrito.disponibilidade).length === 0 ? (
                            <Chip tone="warn" title="Sem disponibilidade informada — preencha na aba Ficha.">
                              sem turno
                            </Chip>
                          ) : null}
                          {alertasPorInscrito.has(inscrito.id) ? (
                            <Chip
                              tone="warn"
                              title={alertasPorInscrito
                                .get(inscrito.id)!
                                .map((a) => a.texto)
                                .join("\n")}
                            >
                              ⚠ {alertasPorInscrito.get(inscrito.id)!.length}
                            </Chip>
                          ) : null}
                        </div>
                      </td>

                      <td style={td}>
                        <span style={{ color: elo.cor }}>{elo.rotulo}</span>
                        <span style={{ color: C.ink4, fontSize: 10.5 }}> {elo.origem}</span>
                        {eloNaRiot(inscrito) && elo.origem !== "Riot" ? (
                          <div style={{ color: C.ink4, fontSize: 10.5 }}>Riot: {eloNaRiot(inscrito)}</div>
                        ) : eloNaRiot(inscrito) ? (
                          <div style={{ color: C.ink4, fontSize: 10.5 }}>{eloNaRiot(inscrito)}</div>
                        ) : null}
                      </td>

                      <td style={{ ...td, textAlign: "right", ...tabular }}>{inscrito.pontos}</td>

                      <td style={td} title={rotas.longo}>
                        {rotas.curto}
                      </td>

                      {ITENS_CONFERENCIA.map((item) => {
                        const estado = comoEstado(doInscrito?.get(item)?.estado);
                        return (
                          <td key={item} style={{ ...td, textAlign: "center" }}>
                            <Chip
                              tone={TOM_CONFERENCIA[estado]}
                              title={`${REGRA_DO_ITEM[item].titulo}: ${ROTULO_CONFERENCIA[estado]}`}
                            >
                              {ABREV_CONFERENCIA[estado]}
                            </Chip>
                          </td>
                        );
                      })}

                      <td style={td}>
                        <Chip tone={TOM_SITUACAO[inscrito.situacao]}>
                          {ROTULO_SITUACAO[inscrito.situacao]}
                        </Chip>
                        <span className="lob-linha-abre__seta" aria-hidden>
                          ›
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollX>
        )}
      </Card>

      {selecionado ? (
        <GavetaInscrito
          // Trocar de inscrito remonta a gaveta inteira: o rascunho pertence à pessoa
          // aberta, e carregá-lo para a próxima já fez alguém salvar a observação errada
          // no jogador errado.
          key={selecionado.id}
          inscrito={selecionado}
          config={config}
          alertas={alertasPorInscrito.get(selecionado.id) ?? SEM_ALERTAS}
          conferencias={porInscrito.get(selecionado.id) ?? SEM_CONFERENCIAS}
          executar={executar}
          ocupado={ocupado}
          podeConferir={podeConferir}
          ultimoErro={ultimoErro}
          posicao={vizinhos.posicao}
          anterior={vizinhos.anterior}
          proximo={vizinhos.proximo}
          onIr={setSelecionadoId}
          onFechar={fecharGaveta}
        />
      ) : null}
    </div>
  );
}
