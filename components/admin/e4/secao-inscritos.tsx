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

import {
  ChipDoLugar,
  PassarAVaga,
  nomeDe,
  preverFila,
  primeiroDaFila,
  temFila,
  textoDaPrevisao,
  useFila,
  type PrevisaoDaFila,
} from "@/components/admin/e4/fila-no-painel";
import type { EdicaoConfig, Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
  Banner,
  Button,
  C,
  Card,
  CartaoLinha,
  Check,
  Chip,
  ChipFiltro,
  Elo,
  Empty,
  Field,
  FieldGrid,
  Input,
  Metric,
  RolagemX,
  ScrollX,
  SectionHead,
  Select,
  Textarea,
  Toolbar,
  display,
  tabular,
} from "@/components/admin/ui";
import { useCompacto } from "@/components/admin/responsivo";
import { ELO_ORDER, resolveElo, resolveRole } from "@/lib/design";
import { compararForca, forcaDoElo, type ForcaDoElo } from "@/lib/draft/capitaes";
import { eloDoJogadorDaInscricao } from "@/lib/draft/elo-da-inscricao";
import { previaDosPrecos } from "@/lib/draft/previa-de-precos";
import { rotaNoTimeDefinido } from "@/lib/draft/time-definido";
import { formatDateTimeLabel } from "@/lib/format";
import {
  alertasDoInscrito,
  escopoDaCiencia,
  pedidoDeCiencia,
  separarPorCiencia,
  TITULO_DAR_CIENCIA,
  type Alerta,
} from "@/lib/inscricoes/alertas";
import { lugarNaFila, type LugarNaFila } from "@/lib/inscricoes/fila";
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
import { AUTOR_RIOT, itemEhDoRobo } from "@/lib/riot/decidir";
import { RATE_LIMIT } from "@/lib/security/rate-limit";

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
 * 3. NÃO HÁ TETO DE INSCRIÇÕES — há teto de VAGAS. O número de times é derivado (elegíveis ÷
 *    jogadores por time, até `max_times`) e vem pronto do servidor, no panorama. Quem passa
 *    das vagas continua inscrito, na fila de reserva (decisão D1 de 2026-10-22): a coluna
 *    «Vaga» diz titular ou a posição na fila, pela mesma função do servidor (`montarFila`).
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

const SITUACOES = ["pendente", "apto", "recusado", "desistiu", "sobra", "excluido"] as const;

const ROTULO_SITUACAO: Record<Inscrito["situacao"], string> = {
  pendente: "Pendente",
  apto: "Apto",
  recusado: "Recusado",
  desistiu: "Desistiu",
  sobra: "Sobra",
  excluido: "Excluído",
};

const TOM_SITUACAO: Record<Inscrito["situacao"], TomChip> = {
  pendente: "neutro",
  apto: "ok",
  recusado: "danger",
  desistiu: "off",
  sobra: "warn",
  excluido: "danger",
};

/**
 * O "apagar" da organização. A linha continua no banco — auditoria, caixa, e a conta do
 * jogador segue barrada de se inscrever de novo —, mas some da lista: só o filtro
 * «Excluído» a mostra. Desfaz escolhendo outra situação.
 */
const EXCLUIDO = "excluido";

const DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Itens cujo veredicto depende de uma data-âncora — que pode não existir ainda, ou cuja
 * janela de medição ainda não abriu.
 *
 * Nos dois casos ninguém afirma nada sobre o item, nem "não cumpre" nem "cumpre": reprovar
 * alguém porque a organização ainda não decidiu a data seria reprovar pela nossa
 * indecisão, e aprovar o (e) em outubro com o início marcado para novembro é afirmar
 * "jogou 5 partidas nos 10 dias antes do início" antes de esses 10 dias existirem — e,
 * aprovado, ninguém volta nele (deixa de ser pendência). Ele fica PENDENTE e intocado: é o
 * robô da Riot que conta as partidas quando a janela abre, e qualquer gravação da
 * organização no item o tiraria do robô. Até o início, (e) pendente não segura ninguém
 * (`requisitosCumpridos`). Os outros cinco itens (a, b, d, f, m) se avaliam a qualquer hora.
 */
const ANCORA_DO_ITEM: Partial<
  Record<
    ItemConferencia,
    Readonly<{ campo: "abertura_inscricoes" | "inicio_campeonato"; texto: string; janelaDias: number }>
  >
> = {
  e: { campo: "inicio_campeonato", texto: "a data de início do campeonato", janelaDias: 10 },
};

/**
 * Por que o item ainda não pode ser medido — ou nulo, se pode. Fica fora da gaveta porque a
 * lista também lê: item que ninguém consegue resolver ainda não é "pendência" do filtro.
 */
function semBaseDoItem(item: ItemConferencia, config: EdicaoConfig, agoraMs: number): string | null {
  const ancora = ANCORA_DO_ITEM[item];
  if (!ancora) return null;
  const valor = config[ancora.campo];
  if (!valor) {
    return `Ainda não existe ${ancora.texto}: sem ela este item não tem como ser medido. Deixe pendente — até o início não segura ninguém, e o robô da Riot conta as partidas quando a janela abrir.`;
  }
  const abre = Date.parse(valor) - ancora.janelaDias * DIA_MS;
  if (Number.isFinite(abre) && agoraMs < abre) {
    return `Este item olha os ${ancora.janelaDias} dias antes do início, e essa janela só abre em ${diaCurto(abre)}: até lá deixe pendente — o robô da Riot conta as partidas sozinho.`;
  }
  return null;
}

/** Os itens que o robô da Riot decide sozinho (`decidirSincronizacao`): (d), (e) e (m). */
const ITENS_DO_ROBO: ReadonlySet<ItemConferencia> = new Set<ItemConferencia>(["d", "e", "m"]);

const ROTULO_TURNO: Record<Turno, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite" };

/** Os turnos na ordem do dia, ignorando qualquer valor que esta tela não conheça. */
function turnosDe(valores: readonly string[] | null | undefined): Turno[] {
  return TURNOS.filter((t) => (valores ?? []).includes(t));
}

const SEM_ESCOPO = "Falta o escopo inscricoes:conferir para editar.";

/** O banco ainda não tem a coluna da ciência (deploy antes da migração): o botão espera. */
const CIENCIA_SEM_COLUNA = "«Dar ciência» fica disponível depois da migração do banco (coluna alertas_cientes).";

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
  return { bruto, rotulo: meta?.label ?? bruto, cor: meta?.color ?? C.ink3, origem };
}

/** Os elos que não têm divisão (I–IV) na Riot. */
const SEM_DIVISAO = new Set(["Mestre", "Grão-Mestre", "Desafiante"]);

/** "II · 45 PDL", da última consulta à Riot — sem o nome do elo, que o emblema já mostra. */
function divisaoEPdl(inscrito: Inscrito): string | null {
  if (!inscrito.elo_riot) return null;
  const partes: string[] = [];
  if (inscrito.riot_divisao && !SEM_DIVISAO.has(inscrito.elo_riot)) partes.push(inscrito.riot_divisao);
  if (inscrito.riot_pdl !== null && inscrito.riot_pdl !== undefined) partes.push(`${inscrito.riot_pdl} PDL`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/**
 * "II · 45 PDL" do CONGELAMENTO: a divisão e o PDL guardados com o elo congelado, que são os
 * que dão o preço e a ordem desta lista. Nulo sem congelar (ou congelado sem leitura do mesmo
 * elo — aí o preço é o do meio do elo).
 */
function divisaoEPdlCongelados(inscrito: Inscrito): string | null {
  if (!inscrito.elo_congelado) return null;
  const partes: string[] = [];
  const divisao = inscrito.divisao_congelada ?? null;
  if (divisao && !SEM_DIVISAO.has(resolveElo(inscrito.elo_congelado)?.label ?? inscrito.elo_congelado)) partes.push(divisao);
  if (inscrito.pdl_congelado !== null && inscrito.pdl_congelado !== undefined) partes.push(`${inscrito.pdl_congelado} PDL`);
  return partes.length > 0 ? partes.join(" · ") : null;
}

/** A Riot leu o MESMO degrau do elo em uso? Só aí a divisão e os PDL dela descrevem esse elo. */
function riotNoMesmoDegrau(inscrito: Inscrito): boolean {
  const emUso = resolveElo(eloExibido(inscrito).bruto);
  const naRiot = resolveElo(inscrito.elo_riot);
  return Boolean(emUso && naRiot && emUso.key === naRiot.key);
}

/**
 * Congelado, a leitura de HOJE da Riot é outra que a do congelamento (outro elo, outra divisão
 * ou outro PDL)? É o caso em que a tela mostra "Riot hoje: …" embaixo — o preço continua o do
 * congelamento.
 */
function riotHojeDiferenteDoCongelado(inscrito: Inscrito): boolean {
  if (!inscrito.elo_congelado || !inscrito.elo_riot) return false;
  if (!riotNoMesmoDegrau(inscrito)) return true;
  const divisaoHoje = SEM_DIVISAO.has(inscrito.elo_riot) ? null : (inscrito.riot_divisao ?? null);
  const divisaoCongelada = SEM_DIVISAO.has(inscrito.elo_riot) ? null : (inscrito.divisao_congelada ?? null);
  return divisaoHoje !== divisaoCongelada || (inscrito.riot_pdl ?? null) !== (inscrito.pdl_congelado ?? null);
}

/**
 * Força do elo em uso, para "do maior elo para o menor".
 *
 * É a MESMA régua que escolhe os capitães (lib/draft/capitaes.ts): elo, depois divisão,
 * depois PDL — e divisão e PDL só contam quando a Riot leu o mesmo degrau do elo que vale
 * (se a organização travou em Ouro e a Riot mostra Platina II, a divisão da Platina não diz
 * nada sobre o Ouro). Com uma régua só, o topo desta lista é quem o draft vai sortear como
 * capitão.
 */
function forcaDoInscrito(inscrito: Inscrito): ForcaDoElo {
  // A mesma fotografia do servidor: congelado, valem a divisão e o PDL do congelamento, e
  // não o que o robô leu hoje (ver lib/draft/elo-da-inscricao.ts).
  return forcaDoElo(eloDoJogadorDaInscricao(inscrito));
}

/**
 * O elo do inscrito pelo emblema — o que a organização pediu no lugar do nome escrito.
 *
 * Ao lado, miúdo: divisão e PDL (quando a Riot leu o mesmo degrau) e de onde o elo veio.
 * Se a Riot mostra OUTRO degrau (elo travado ou congelado), a leitura dela aparece embaixo
 * com o próprio emblema — os dois podem discordar, e a tela não esconde isso.
 */
function EloDoInscrito({ inscrito, tamanho = 28 }: Readonly<{ inscrito: Inscrito; tamanho?: number }>) {
  const elo = eloExibido(inscrito);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
      <Elo elo={elo.bruto} tamanho={tamanho} detalhe={detalheDoElo(inscrito)} />
      <LeituraDaRiotDiferente inscrito={inscrito} />
    </span>
  );
}

/**
 * Divisão/PDL e a origem: "II · 45 PDL · Riot". Congelado, são os do CONGELAMENTO ("I · 82 PDL
 * · congelado") — os que dão o preço —, e não os que o robô leu hoje; sem congelar, os da Riot
 * quando ela leu o mesmo degrau.
 */
function detalheDoElo(inscrito: Inscrito): string {
  const divisao = inscrito.elo_congelado
    ? divisaoEPdlCongelados(inscrito)
    : riotNoMesmoDegrau(inscrito)
      ? divisaoEPdl(inscrito)
      : null;
  return [divisao, eloExibido(inscrito).origem].filter(Boolean).join(" · ");
}

/**
 * A leitura da Riot que NÃO é a que vale, com emblema: sem congelar, quando ela mostra outro
 * degrau que o elo em uso (travado); congelado, quando a leitura de hoje é outra que a do
 * congelamento — "Riot hoje: …", para ninguém achar que o preço está errado.
 */
function LeituraDaRiotDiferente({ inscrito }: Readonly<{ inscrito: Inscrito }>) {
  if (!inscrito.elo_riot) return null;
  const congelado = Boolean(inscrito.elo_congelado);
  if (congelado ? !riotHojeDiferenteDoCongelado(inscrito) : riotNoMesmoDegrau(inscrito)) return null;
  const daRiot = divisaoEPdl(inscrito);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: C.ink4 }}>
      {congelado ? "Riot hoje:" : "Riot:"} <Elo elo={inscrito.elo_riot} tamanho={16} />
      {daRiot ? <span style={tabular}>{daRiot}</span> : null}
    </span>
  );
}

type Ordem = "inscricao" | "elo_desc" | "elo_asc" | "nick";

const ROTULO_ORDEM: Record<Ordem, string> = {
  inscricao: "Ordem de inscrição",
  elo_desc: "Elo: do maior para o menor",
  elo_asc: "Elo: do menor para o maior",
  nick: "Nick (A–Z)",
};

/** A ordem escolhida fica no navegador de quem escolheu. Só conveniência: pode sumir sem dano. */
const CHAVE_ORDEM = "lob:inscritos:ordem";

function lerOrdem(): Ordem {
  try {
    const salva = window.localStorage.getItem(CHAVE_ORDEM);
    return salva && salva in ROTULO_ORDEM ? (salva as Ordem) : "inscricao";
  } catch {
    return "inscricao";
  }
}

function gravarOrdem(ordem: Ordem) {
  try {
    if (ordem === "inscricao") window.localStorage.removeItem(CHAVE_ORDEM);
    else window.localStorage.setItem(CHAVE_ORDEM, ordem);
  } catch {
    // Sem armazenamento (aba anônima, bloqueio): a escolha vale só até fechar.
  }
}

/** Do mais forte para o mais fraco: a ordem natural de quem procura os capitães. */
const ELOS_DO_MAIOR = [...ELO_ORDER].reverse();

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

/**
 * "time definido · MID": quem joga no time definido pela organização (24/10/2026), que não vai
 * ao draft e não tem preço. A coluna `time_definido` vem no `select *` das inscrições, mas o
 * tipo do painel (`Inscrito`) ainda não a declara.
 */
function rotuloDoTimeDefinido(inscrito: Inscrito): string {
  const rota = rotaNoTimeDefinido(inscrito as Inscrito & { time_definido?: string | null });
  return rota ? `time definido · ${resolveRole(rota).short}` : "time definido";
}

const TITULO_DO_TIME_DEFINIDO = "Time definido pela organização: já entra pronto, não vai ao draft e não tem preço.";

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
      ? "Aprovado que a organização tirou das vagas: vai para o FIM da fila de reserva e não é chamado sozinho."
      : s === EXCLUIDO
        ? "Some da lista de inscritos (fica só no filtro «Excluído») e sai de times, caixa e robô da Riot. Para desfazer, escolha outra situação."
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
  /**
   * O item é do robô da Riot — um dos que ele decide, e ninguém da organização escreveu nele
   * ainda (ou só o atalho antigo, no (e) «não avaliável» sem observação: ver `itemEhDoRobo`).
   */
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

      {/* Também no item que o robô ainda não tocou: marcar ali (o atalho fazia isso no (e))
          tira o item dele em silêncio, e a regra deixa de ser conferida pela Riot. */}
      {doRobo ? (
        <p style={{ margin: "6px 0 0", fontSize: 11.5, lineHeight: 1.55, color: C.ink3 }}>
          {conferidoPor === AUTOR_RIOT
            ? "Conferido pela Riot e atualizado todo dia. Marcar outro estado (ou escrever uma observação) tira este item do robô — daí em diante vale o que a organização gravou."
            : "Quem confere este item é o robô da Riot, sozinho. Marcar um estado (ou escrever uma observação) aqui tira o item do robô — daí em diante vale o que a organização gravar."}
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
  /** Nota interna (coluna `observacao`): só a organização vê. */
  observacao: string;
  /** «Recado para o jogador» (coluna `recado_jogador`): aparece em Minha inscrição. */
  recadoJogador: string;
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
  if (campo === "observacao" || campo === "recadoJogador" || campo === "nomeReal") {
    return String(valor).trim() === salva[campo].trim();
  }
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
  /**
   * TODOS os alertas de agora, com e sem ciência — a gaveta separa (`separarPorCiencia`):
   * os que contam vão no aviso, com «Dar ciência»; os aceitos, apagados, com «Desfazer».
   */
  alertas: readonly Alerta[];
  conferencias: ReadonlyMap<ItemConferencia, RegistroConferencia>;
  executar: PropsSecao["executar"];
  ocupado: boolean;
  podeConferir: boolean;
  /** Dá ciência dos alertas do caixa (`escopoDaCiencia`); os outros pedem `podeConferir`. */
  podeFinanceiro: boolean;
  ultimoErro: string | null;
  /** O que a última ação que deu certo respondeu (o resumo do «atualizar da Riot»). */
  ultimaMensagem: string | null;
  /** Só a master: mostra o «Gerar senha provisória» na aba Contato. */
  podeRedefinirSenha: boolean;
  /** Posição na lista filtrada; nulo quando o filtro atual esconde quem está aberto. */
  posicao: Readonly<{ atual: number; total: number }> | null;
  /**
   * O preço na PRÉVIA da tabela automática (lib/draft/previa-de-precos.ts); nulo sem time
   * fechado ainda. Não é a coluna `pontos` — essa é a tabela fixa da 3ª, que o draft não usa.
   */
  precoNoDraft: number | null;
  /**
   * Capitão sem preço (decisão de 23/10/2026): a gaveta mostra a tag CAPITÃO no lugar dos
   * pontos. Opcional: falso quando não é capitão, ou com o capitão pago pelo orçamento.
   */
  capitaoNoDraft?: boolean;
  /**
   * No time definido pela organização (24/10/2026): não vai ao draft e não tem preço — a gaveta
   * mostra a tag TIME DEFINIDO, que vale mais que a de capitão (o capitão dele também não tem
   * preço, mas não é capitão de time do draft).
   */
  timeDefinidoNoDraft?: boolean;
  /** O lugar na fila de reserva (D1); nulo quando a edição não tem teto de vagas (não há fila). */
  lugar: LugarNaFila | null;
  /**
   * Quem a saída deste inscrito chama da fila (o 1º que pode ser chamado), para a frase de
   * confirmação do «passar a vaga» e o aviso de quando a situação o tira das vagas.
   */
  primeiroDaFila: Inscrito | null;
  /**
   * Como a fila fica se a situação/organizador da ficha forem os do rascunho — para a gaveta
   * dizer ANTES de salvar quem é chamado e quem desce para a fila (D4). Nulo sem fila.
   */
  simularFila: (mudanca: Readonly<{ situacao: Inscrito["situacao"]; organizador: boolean }>) => PrevisaoDaFila | null;
  /**
   * Falhas de login recentes da conta (janela de 15 min do limitador), para o «Liberar login».
   * `null` = a leitura falhou (ou o servidor ainda não manda): o botão funciona igual.
   */
  falhasDeLogin: number | null;
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
  podeFinanceiro,
  ultimoErro,
  ultimaMensagem,
  podeRedefinirSenha,
  posicao,
  precoNoDraft,
  capitaoNoDraft = false,
  timeDefinidoNoDraft = false,
  lugar,
  primeiroDaFila,
  simularFila,
  falhasDeLogin,
  anterior,
  proximo,
  onIr,
  onFechar,
}: PropsGaveta) {
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO);
  const [aba, setAba] = useState<Aba>("requisitos");
  const compacto = useCompacto();
  const [saida, setSaida] = useState<Saida | null>(null);
  const [resultado, setResultado] = useState<"salvo" | "falhou" | null>(null);
  /** O «atualizar da Riot» daqui: o aviso do topo fica atrás da gaveta, então a resposta vem para cá. */
  const [resultadoRiot, setResultadoRiot] = useState<"ok" | "falhou" | null>(null);
  /** Mesmo motivo, para o «passar a vaga» (D5): o botão some quando dá certo, a frase fica. */
  const [resultadoVaga, setResultadoVaga] = useState<"ok" | "falhou" | null>(null);
  /** E para o «Liberar login» (F), na aba Contato. */
  const [resultadoLogin, setResultadoLogin] = useState<"ok" | "falhou" | null>(null);
  /** E para o «Dar ciência» / «Desfazer» dos alertas. */
  const [resultadoCiencia, setResultadoCiencia] = useState<"ok" | "falhou" | null>(null);
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
    recadoJogador: inscrito.recado_jogador ?? "",
    turnos: turnosSalvos,
    nomeReal: inscrito.nome_real ?? "",
  };

  /*
   * O GET é `select *`: com a coluna no banco o recado vem (nulo quando vazio); sem ela
   * (deploy antes da migração), a chave nem vem. Aí o campo fica travado com o porquê —
   * gravar daria 400 e derrubaria a ficha inteira junto.
   */
  const recadoSemColuna = inscrito.recado_jogador === undefined;

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
  const semBaseDe = (item: ItemConferencia): string | null => semBaseDoItem(item, config, agora);

  /** O item ainda é do robô da Riot (ver `itemEhDoRobo`) — e é um dos que ele decide. */
  const doRoboDe = (item: ItemConferencia): boolean => {
    if (!ITENS_DO_ROBO.has(item)) return false;
    const salvo = itemSalvo(item);
    return itemEhDoRobo({
      item,
      estado: salvo.estado,
      observacao: salvo.observacao === "" ? null : salvo.observacao,
      conferido_por: salvo.conferidoPor,
    });
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
  const recadoJogador = rascunho.ficha.recadoJogador ?? fichaSalva.recadoJogador;
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
    recadoJogador:
      rascunho.ficha.recadoJogador !== undefined && recadoJogador.trim() !== fichaSalva.recadoJogador.trim(),
    disponibilidade:
      rascunho.ficha.turnos !== undefined && turnosDe(turnos).join(",") !== fichaSalva.turnos.join(","),
    nomeReal: rascunho.ficha.nomeReal !== undefined && nomeReal.trim() !== fichaSalva.nomeReal.trim(),
  };

  /*
   * Cada requisito leva também o estado que ESTA TELA viu (`estadoAnterior`): o servidor só
   * grava se o banco ainda estiver nele, na mesma instrução, e senão responde 409 sem gravar
   * o item. Sem isso, uma gaveta aberta antes de outro organizador (ou o robô) recusar o (A)
   * devolvia o (A) a «ok» pelo atalho sem ninguém ver a recusa. Vai mesmo quando só a
   * observação mudou: ela justifica o veredicto, e escrita sobre um veredicto que já é outro
   * vira justificativa do que a pessoa nem viu. Linha que não veio do banco (ou com um
   * estado que esta tela não conhece) vai sem a trava, como antes.
   */
  const estadoVisto = (item: ItemConferencia) => {
    const registro = conferencias.get(item);
    return ESTADOS_CONFERENCIA.find((e) => e === registro?.estado);
  };

  const conferenciasMudadas = ITENS_CONFERENCIA.flatMap((item) => {
    const doItem = rascunho.itens[item];
    const salvo = itemSalvo(item);
    const estadoMudou = doItem?.estado !== undefined && doItem.estado !== salvo.estado;
    const observacaoMudou =
      doItem?.observacao !== undefined && doItem.observacao.trim() !== salvo.observacao.trim();
    if (!estadoMudou && !observacaoMudou) return [];
    const anterior = estadoVisto(item);
    return [
      {
        item,
        ...(estadoMudou && { estado: doItem!.estado }),
        ...(observacaoMudou && { observacao: doItem!.observacao!.trim() }),
        ...(anterior !== undefined && { estadoAnterior: anterior }),
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
    // O recado só viaja quando mudou: assim o resto da ficha continua gravando no intervalo
    // entre o deploy e a migração (a rota só cita a coluna quando ela vem no pedido).
    ...(mudouNaFicha.recadoJogador && { recadoJogador: recadoJogador.trim() === "" ? null : recadoJogador.trim() }),
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

  // A mesma regra do servidor (store.ts, `atualizarInscricao`): tirar alguém de Apto/Sobra
  // para Pendente SEGURA a pessoa (`promocao_automatica = false`); qualquer outra situação
  // escolhida à mão a solta. Sem trocar a situação, vale o que está gravado.
  const seguradoAoSalvar = mudouNaFicha.situacao
    ? situacao === "pendente" && (fichaSalva.situacao === "apto" || fichaSalva.situacao === "sobra")
    : inscrito.promocao_automatica === false;

  // A fila muda com a situação e com o organizador (D1): a gaveta diz antes de salvar quem é
  // chamado e quem desce — o servidor faz isso na mesma ação do salvar (D4).
  const avisoDaFila =
    mudouNaFicha.situacao || mudouNaFicha.organizador
      ? textoDaPrevisao(simularFila({ situacao, organizador }), inscrito)
      : null;

  const pendentes = ITENS_CONFERENCIA.filter((item) => estadoDe(item) === "pendente");
  // Item pendente que ainda é do robô (ex.: (D) sem ranque na solo/duo) fica fora do atalho:
  // marcar «Cumpre» ali afirmaria o contrário do que a Riot acabou de mostrar.
  const doRoboPendentes = pendentes.filter((item) => itemSalvo(item).conferidoPor === AUTOR_RIOT);
  // O que ainda não dá para medir também fica fora — e INTOCADO. O atalho gravava ali «não
  // avaliável» com o nome do organizador, e isso tirava o (E) do robô: a regra 4 deixava de
  // ser contada pela Riot para todo mundo conferido pelo atalho.
  const pendentesSemBase = pendentes.filter((item) => !doRoboPendentes.includes(item) && semBaseDe(item));
  const pendentesDoAtalho = pendentes.filter(
    (item) => !doRoboPendentes.includes(item) && !pendentesSemBase.includes(item),
  );

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
    // Só o que dá para medir: o item sem base fica de fora da lista (ver `pendentesSemBase`).
    for (const item of pendentesDoAtalho) editarItem(item, "estado", "ok");
    segurarFoco();
  };

  /**
   * Os avisos de resposta da gaveta leem a ÚLTIMA resposta do painel (`ultimaMensagem` /
   * `ultimoErro`): toda ação nova apaga os das outras, senão um deles passaria a mostrar a
   * resposta de outra ação.
   */
  const limparResultados = () => {
    setResultadoRiot(null);
    setResultadoVaga(null);
    setResultadoLogin(null);
    setResultadoCiencia(null);
  };

  const atualizarDaRiot = async () => {
    limparResultados();
    const ok = await executar("sincronizar_riot", { inscricaoId: inscrito.id });
    if (!montada.current) return;
    setResultadoRiot(ok ? "ok" : "falhou");
  };

  /** D5: o servidor confere de novo (titular, não organizador, prazo vencido) antes de gravar. */
  const passarVaga = async (): Promise<boolean> => {
    limparResultados();
    const ok = await executar("passar_vaga", { inscricaoId: inscrito.id });
    if (montada.current) setResultadoVaga(ok ? "ok" : "falhou");
    return ok;
  };

  /*
   * Ciência dos alertas. Vai o TEXTO que a tela mostra, e a assinatura quando ela vai além do
   * texto (os fatos do pagamento, o prazo): o servidor recalcula os alertas e só aceita se o
   * de agora é o mesmo (senão 409, e o painel recarrega com o alerta novo). Não mexe na ficha
   * nem nos requisitos — o rascunho aberto fica como está.
   */
  const alertasSeparados = separarPorCiencia(alertas, inscrito.alertas_cientes);
  const cienciaSemColuna = inscrito.alertas_cientes === undefined;
  /** Alerta do caixa: financeiro. Os outros: conferência. Sem o escopo, o botão nem aparece. */
  const podeDarCiencia = (alerta: Alerta) =>
    escopoDaCiencia(alerta.codigo) === "inscricoes:financeiro" ? podeFinanceiro : podeConferir;

  const darCiencia = async (alerta: Alerta) => {
    limparResultados();
    const ok = await executar("alerta_ciencia", pedidoDeCiencia(inscrito.id, alerta));
    if (montada.current) setResultadoCiencia(ok ? "ok" : "falhou");
  };

  const desfazerCiencia = async (alerta: Alerta) => {
    limparResultados();
    const ok = await executar("alerta_ciencia", { inscricaoId: inscrito.id, codigo: alerta.codigo, desfazer: true });
    if (montada.current) setResultadoCiencia(ok ? "ok" : "falhou");
  };

  /** F: o e-mail da conta sai da inscrição no servidor — nada de e-mail no corpo. */
  const liberarLogin = async () => {
    limparResultados();
    const ok = await executar("liberar_login", { inscricaoId: inscrito.id });
    if (montada.current) setResultadoLogin(ok ? "ok" : "falhou");
  };

  const salvar = async (depois?: () => void) => {
    if (totalMudado === 0 || nomeInvalido || bloqueado) return;
    // Zera o resultado ANTES: senão, numa nova tentativa depois de uma falha, o rodapé
    // continuava dizendo "Não foi possível salvar" durante o próprio salvamento.
    setResultado(null);
    // Os avisos de Riot, vaga e login leem a última resposta do painel, que passa a ser a deste salvamento.
    limparResultados();
    const ok = await executar("inscrito", {
      inscricaoId: inscrito.id,
      ...(conferenciasMudadas.length > 0 && { conferencias: conferenciasMudadas }),
      // A ficha leva a situação que esta tela viu: mudou no banco (outra pessoa, a promoção
      // automática), o servidor responde 409 e não grava a ficha.
      ...(Object.keys(fichaPatch).length > 0 && {
        ficha: { ...fichaPatch, situacaoAnterior: fichaSalva.situacao },
      }),
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
  /** Recuo lateral: no celular a gaveta é a tela toda, e 18px de cada lado é largura perdida. */
  const lateral = compacto ? 14 : 18;
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
          {pendentesSemBase.map((item) => `(${item.toUpperCase()})`).join(", ")}{" "}
          {pendentesSemBase.length === 1 ? "fica" : "ficam"} fora do atalho: ainda não dá para medir, e quem conta as
          partidas é o robô da Riot, quando a janela abrir.
        </p>
      ) : null}
      {doRoboPendentes.length > 0 ? (
        <p style={{ margin: "6px 0 0", fontSize: 11, color: C.ink4 }}>
          O atalho pula {doRoboPendentes.map((item) => `(${item.toUpperCase()})`).join(", ")}: quem está
          acompanhando é a Riot.
        </p>
      ) : null}

      {alertasSeparados.pendentes.length > 0 ? (
        <div style={{ marginTop: 10 }}>
          <Banner
            tone="warn"
            title={plural(alertasSeparados.pendentes.length, "ponto de atenção", "pontos de atenção")}
          >
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {alertasSeparados.pendentes.map((a) => (
                <li key={a.codigo} style={{ marginBottom: 6 }}>
                  {a.texto}
                  {podeDarCiencia(a) ? (
                    <div style={{ marginTop: 6 }}>
                      <Button
                        small
                        disabled={ocupado || cienciaSemColuna}
                        title={
                          cienciaSemColuna
                            ? CIENCIA_SEM_COLUNA
                            : TITULO_DAR_CIENCIA
                        }
                        onClick={() => void darCiencia(a)}
                      >
                        Dar ciência
                      </Button>
                    </div>
                  ) : null}
                  {/* D5: o titular que perdeu o prazo — um clique, com confirmação. Com rascunho
                      aberto, não: a situação mudaria por baixo do que a pessoa está marcando. */}
                  {a.acaoFila === "passar_vaga" ? (
                    <div style={{ marginTop: 8 }}>
                      <PassarAVaga
                        nome={nomeDe(inscrito)}
                        proximo={primeiroDaFila ? nomeDe(primeiroDaFila) : null}
                        onPassar={passarVaga}
                        desabilitado={bloqueado || totalMudado > 0}
                        motivo={
                          !podeConferir
                            ? SEM_ESCOPO
                            : totalMudado > 0
                              ? "Salve ou descarte as alterações da gaveta antes."
                              : undefined
                        }
                        largo={compacto}
                      />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {cienciaSemColuna && alertasSeparados.pendentes.some(podeDarCiencia) ? (
              <p style={{ margin: "4px 0 0", fontSize: 11, color: C.ink4 }}>{CIENCIA_SEM_COLUNA}</p>
            ) : null}
          </Banner>
        </div>
      ) : null}
      {alertasSeparados.comCiencia.length > 0 ? (
        // Apagado por COR e texto, nunca por opacidade: o alerta aceito continua legível
        // (e auditável) sem disputar o olho com os que ainda pedem ação.
        <div
          role="group"
          aria-label="Alertas com ciência da organização"
          style={{ marginTop: 10, padding: "10px 14px", border: `1px dashed ${C.line}`, borderRadius: 4 }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              letterSpacing: ".16em",
              textTransform: "uppercase",
              color: C.ink4,
            }}
          >
            Com ciência da organização — não contam no ⚠
          </p>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: C.ink4 }}>
            {alertasSeparados.comCiencia.map(({ alerta, ciencia }) => (
              <li key={alerta.codigo} style={{ marginBottom: 6 }}>
                {alerta.texto}
                <span
                  style={{ display: "block", fontSize: 11, color: C.ink4 }}
                  title={`Ciência de ${ciencia.por} em ${formatDateTimeLabel(ciencia.em)} (horário de Brasília)`}
                >
                  ciente — {ciencia.por}, {quandoCurto(ciencia.em)}
                  {podeDarCiencia(alerta) && !compacto ? (
                    <>
                      {" · "}
                      <BotaoLink disabled={ocupado || cienciaSemColuna} onClick={() => void desfazerCiencia(alerta)}>
                        Desfazer
                      </BotaoLink>
                    </>
                  ) : null}
                </span>
                {/* No celular, alvo de dedo: o botão pequeno tem 40px de altura. */}
                {podeDarCiencia(alerta) && compacto ? (
                  <div style={{ marginTop: 6 }}>
                    <Button small disabled={ocupado || cienciaSemColuna} onClick={() => void desfazerCiencia(alerta)}>
                      Desfazer
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {resultadoCiencia && !ocupado ? (
        <p
          role={resultadoCiencia === "falhou" ? "alert" : "status"}
          style={{
            margin: "8px 0 0",
            fontSize: 12,
            lineHeight: 1.5,
            color: resultadoCiencia === "falhou" ? C.dangerSoft : C.okSoft,
          }}
        >
          {resultadoCiencia === "falhou"
            ? (ultimoErro ?? "Não foi possível gravar a ciência.")
            : (ultimaMensagem ?? "Ciência gravada.")}
        </p>
      ) : null}
      {resultadoVaga && !ocupado ? (
        <p
          role={resultadoVaga === "falhou" ? "alert" : "status"}
          style={{
            margin: "8px 0 0",
            fontSize: 12,
            lineHeight: 1.5,
            color: resultadoVaga === "falhou" ? C.dangerSoft : C.okSoft,
          }}
        >
          {resultadoVaga === "falhou"
            ? (ultimoErro ?? "Não foi possível passar a vaga.")
            : (ultimaMensagem ?? "Vaga liberada.")}
        </p>
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
            doRobo={doRoboDe(item)}
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
          {/* O emblema ao lado mostra o elo que vai valer com a escolha atual: o travado, ou
              o da Riot quando está no automático. */}
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Elo elo={eloVerificado || inscrito.elo_riot || inscrito.elo_declarado} tamanho={34} />
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
          </span>
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
        É da organização desta edição — <b>não paga inscrição</b>, mas joga; só é capitão se a organização definir.
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

      {/*
        Decisão G (2026-10-22): a observação da ficha virou DOIS campos, e cada um diz quem o
        lê. A nota interna (coluna `observacao`) não sai mais para o jogador; o recado (coluna
        `recado_jogador`) é o único texto da ficha que aparece em «Minha inscrição».
      */}
      <Field
        label="Nota interna — só a organização vê"
        hint="Vale para a inscrição inteira e fica só no painel: o jogador NÃO lê este campo. Para falar com ele, use o recado logo abaixo."
      >
        <Textarea
          value={observacao}
          rows={3}
          maxLength={LIMITES_INSCRICAO.texto}
          disabled={bloqueado}
          onChange={(v) => editarFicha("observacao", v)}
          placeholder="Ex.: pediu para jogar no mesmo time do irmão; combinado que não há garantia."
          ariaLabel="Nota interna"
        />
      </Field>

      <Field
        label="Recado para o jogador — aparece em «Minha inscrição»"
        hint={
          recadoSemColuna
            ? "Ainda não dá para escrever: falta a migração do banco (coluna recado_jogador). O resto da ficha salva normalmente."
            : "O jogador lê este texto em «Minha inscrição», logo abaixo da situação. Em branco, nada aparece para ele."
        }
      >
        <Textarea
          value={recadoJogador}
          rows={3}
          maxLength={LIMITES_INSCRICAO.texto}
          disabled={bloqueado || recadoSemColuna}
          onChange={(v) => editarFicha("recadoJogador", v)}
          placeholder="Ex.: falta mandar o print do perfil no privado da organização até sexta."
          ariaLabel="Recado para o jogador"
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
          <Metric small label="Elo declarado" value={<Elo elo={inscrito.elo_declarado} tamanho={30} mostrarNome />} />
          <Metric
            small
            label="Elo em uso"
            value={<Elo elo={elo.bruto} tamanho={30} mostrarNome detalhe={divisaoEPdlCongelados(inscrito)} />}
            detail={elo.origem}
          />
          {/*
            NÃO existe campo de pontos aqui, e não é esquecimento.
            O preço do jogador no draft sai da tabela automática (lib/draft/precos.ts), calculada
            a partir do elo e da divisão de quem joga — nunca digitado. Um campo editável
            reabriria pela porta dos fundos exatamente o que o formulário público fecha: mandar
            "elo: Ferro, pontos: 15" e adulterar o sorteio. Para mudar o preço de alguém,
            corrija o ELO VERIFICADO na aba Ficha.
            O número aqui é a PRÉVIA da tabela (a mesma de Times e vagas), e não a coluna
            `pontos` do banco: essa é a tabela fixa da 3ª, que o draft não usa mais.
          */}
          <Metric
            small
            label="Pontos no draft"
            value={timeDefinidoNoDraft ? "Time definido" : capitaoNoDraft ? "Capitão" : (precoNoDraft ?? "—")}
            detail={
              timeDefinidoNoDraft
                ? `${rotuloDoTimeDefinido(inscrito)}: o time da organização já entra pronto, não vai ao draft e não tem preço`
                : capitaoNoDraft
                  ? "capitão não tem preço: cada time tem o orçamento inteiro para as escolhas"
                  : precoNoDraft === null
                    ? "sai da tabela automática quando fechar um time"
                    : "prévia da tabela automática — a oficial sai na conferência do draft"
            }
          />
          <Metric
            small
            label="Na Riot (solo/duo)"
            value={
              inscrito.elo_riot ? <Elo elo={inscrito.elo_riot} tamanho={30} mostrarNome detalhe={divisaoEPdl(inscrito)} /> : "—"
            }
            detail={inscrito.riot_sincronizado_em ? `consultado em ${quandoCurto(inscrito.riot_sincronizado_em)}` : "ainda não consultado"}
          />
        </FieldGrid>
      </div>

      <LoginDaConta
        falhas={falhasDeLogin}
        bloqueado={bloqueado}
        motivo={podeConferir ? undefined : SEM_ESCOPO}
        largo={compacto}
        onLiberar={() => void liberarLogin()}
        resultado={
          resultadoLogin && !ocupado
            ? resultadoLogin === "falhou"
              ? { ok: false, texto: ultimoErro ?? "Não foi possível liberar o login." }
              : { ok: true, texto: ultimaMensagem ?? "Login liberado." }
            : null
        }
      />

      {podeRedefinirSenha ? <SenhaProvisoria inscrito={inscrito} /> : null}
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
    // A resposta pode dizer mais que "Salvo." — virou Apto, alguém foi chamado da fila, ou o
    // prazo da fila não foi alinhado. O aviso do topo fica atrás da gaveta, então vem para cá.
    situacaoDoRascunho = (
      <span style={{ color: C.okSoft }}>
        ✓ {ultimaMensagem && ultimaMensagem !== "Salvo." ? ultimaMensagem : "Salvo."}
      </span>
    );
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
      {situacao === EXCLUIDO && mudouNaFicha.situacao ? (
        <p role="alert" style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.warnSoft }}>
          Ao salvar, <b>{inscrito.nick}</b> some da lista de inscritos e sai de times, caixa e robô da Riot. Fica no
          filtro «Excluído», e dá para desfazer escolhendo outra situação.
        </p>
      ) : situacao === EXCLUIDO ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.ink3 }}>
          Inscrição excluída: não aparece na lista nem entra em conta nenhuma. Para restaurar, escolha outra situação e
          salve.
        </p>
      ) : aptoComItemRuim ? (
        <p role="alert" style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.warnSoft }}>
          Este inscrito continua <b>Apto</b> — se o requisito marcado agora o tira do campeonato, ajuste a
          situação também.
        </p>
      ) : seguradoAoSalvar && situacao === "pendente" ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11.5, color: C.ink3 }}>
          {mudouNaFicha.situacao
            ? "Ao salvar, fica segurado: o sistema não promove este inscrito a Apto sozinho — volte para Apto à mão quando for o caso."
            : "Segurado pela organização: o sistema não promove este inscrito a Apto sozinho."}
        </p>
      ) : situacao === "pendente" ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11, color: C.ink4 }}>
          Vira Apto sozinho quando todos os requisitos cumprirem e o pagamento estiver confirmado.
        </p>
      ) : null}
      {avisoDaFila ? (
        <p style={{ margin: "-4px 0 10px", fontSize: 11.5, lineHeight: 1.5, color: C.warnSoft }}>{avisoDaFila}</p>
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
        {/* Recuos de área segura: no iPhone a gaveta ocupa a tela inteira e o topo/rodapé
            ficariam sob o entalhe e a barra de gestos. */}
        <header
          style={{
            padding: `calc(12px + env(safe-area-inset-top)) ${lateral}px 0`,
            background: C.panel,
            borderBottom: `1px solid ${C.line}`,
          }}
        >
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
            {lugar ? <ChipDoLugar lugar={lugar} /> : null}
            {inscrito.organizador ? (
              <Chip tone="gold" title="Organizador desta edição — joga e não paga inscrição">
                organização
              </Chip>
            ) : null}
            {turnosSalvos.length === 0 ? (
              <Chip tone="warn" title="Inscrito antes de o formulário perguntar os turnos — preencha na aba Ficha.">
                sem disponibilidade
              </Chip>
            ) : null}
            {congelado ? <Chip tone="warn">elo congelado</Chip> : null}
            {falhasDeLogin !== null && falhasDeLogin >= RATE_LIMIT.maxFailuresPerUser ? (
              <Chip tone="danger" title="Falhas de senha demais nos últimos minutos — dá para liberar na aba Contato.">
                login trancado
              </Chip>
            ) : null}
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
            <EloDoInscrito inscrito={inscrito} tamanho={30} />
            {timeDefinidoNoDraft ? (
              <Chip tone="ok" title={TITULO_DO_TIME_DEFINIDO}>
                {rotuloDoTimeDefinido(inscrito)}
              </Chip>
            ) : capitaoNoDraft ? (
              <Chip tone="gold" title="Capitão definido pela organização: não tem preço.">
                capitão
              </Chip>
            ) : precoNoDraft !== null ? (
              <span style={{ color: C.ink3 }} title="Prévia da tabela de pontos automática">
                {precoNoDraft} pts
              </span>
            ) : null}
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
                {inscrito.elo_riot ? (
                  <Elo elo={inscrito.elo_riot} tamanho={18} detalhe={divisaoEPdl(inscrito)} />
                ) : (
                  <span>sem ranque na solo/duo</span>
                )}
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
            <BotaoLink disabled={bloqueado} onClick={() => void atualizarDaRiot()}>
              atualizar da Riot
            </BotaoLink>
          </div>
          {/* A resposta do «atualizar da Riot» mora aqui: o aviso do topo da página fica atrás
              da gaveta (e, no celular, ela é a tela inteira). "Outra atualização rodando", "a
              Riot pediu pausa" e "robô desligado" voltam como sucesso, com texto. */}
          {resultadoRiot && !ocupado ? (
            <p
              role={resultadoRiot === "falhou" ? "alert" : "status"}
              style={{
                margin: "6px 0 0",
                fontSize: 11.5,
                lineHeight: 1.5,
                color: resultadoRiot === "falhou" ? C.dangerSoft : C.ink2,
              }}
            >
              {resultadoRiot === "falhou"
                ? (ultimoErro ?? "Não foi possível atualizar da Riot.")
                : (ultimaMensagem ?? "Atualizado.")}
            </p>
          ) : null}

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
          style={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", padding: `10px ${lateral}px 22px` }}
        >
          {painelDaAba[aba]}
        </div>

        {/* ------------------------------------------------ rodapé (sempre à vista) */}
        <footer
          style={{
            padding: `12px ${lateral}px calc(12px + env(safe-area-inset-bottom))`,
            background: C.panel,
            borderTop: `1px solid ${C.line2}`,
          }}
        >
          {rodape}
        </footer>
      </div>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- liberar login

/**
 * «Liberar login» (decisão F, 2026-10-22) — para quem ficou trancado para fora da própria
 * conta: alguém martela o e-mail dele de vários IPs e as falhas travam a CONTA, e o dono, com
 * a senha certa, não entra (no dia do draft, um capitão).
 *
 * O botão marca as falhas recentes (15 min) da conta como liberadas pela organização: elas
 * deixam de contar contra a conta, mas continuam contando para o IP de onde vieram — o IP de
 * quem martelou segue bloqueado. O número mostrado ANTES é o da última leitura do painel; o
 * servidor relê na hora do clique e a resposta diz quantas liberou.
 */
function LoginDaConta({
  falhas,
  bloqueado,
  motivo,
  largo,
  onLiberar,
  resultado,
}: Readonly<{
  falhas: number | null;
  bloqueado: boolean;
  motivo?: string;
  largo: boolean;
  onLiberar: () => void;
  resultado: Readonly<{ ok: boolean; texto: string }> | null;
}>) {
  const minutos = Math.round(RATE_LIMIT.windowSeconds / 60);
  const trancada = falhas !== null && falhas >= RATE_LIMIT.maxFailuresPerUser;
  const texto: CSSProperties = { margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: C.ink3 };

  return (
    <section aria-label="Login da conta" style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: C.bronze }}>
        Login da conta
      </div>
      <p style={{ ...texto, color: trancada ? C.warnSoft : C.ink3 }}>
        {falhas === null
          ? "Não deu para ler as falhas de login agora — o botão funciona do mesmo jeito."
          : falhas === 0
            ? `Nenhuma falha de login nos últimos ${minutos} minutos (na última leitura do painel).`
            : `${plural(falhas, "falha de login", "falhas de login")} nos últimos ${minutos} minutos${
                trancada ? ": a conta está TRANCADA — o jogador não entra nem com a senha certa." : "."
              }`}
      </p>
      <p style={texto}>
        Liberar faz as falhas recentes pararem de contar contra a conta. Quem tentou de outro aparelho continua
        bloqueado nele. Não muda a senha.
      </p>
      <div style={{ marginTop: 8 }}>
        <Button small={!largo} fullWidth={largo} disabled={bloqueado} title={motivo} onClick={onLiberar}>
          Liberar login
        </Button>
      </div>
      {resultado ? (
        <p role={resultado.ok ? "status" : "alert"} style={{ ...texto, color: resultado.ok ? C.okSoft : C.dangerSoft }}>
          {resultado.texto}
        </p>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- senha provisória

/**
 * «Gerar senha provisória» — a recuperação de senha de quem perdeu a da conta de jogador.
 *
 * O site não manda e-mail, então "esqueci a senha" não tem autoatendimento: a pessoa fala
 * com a organização, e a master gera aqui uma provisória (`POST /api/admin/jogadores/senha`)
 * para repassar no privado. O servidor não guarda a provisória e a conta fica obrigada a
 * trocá-la.
 *
 * A senha aparece UMA vez: mora só no estado deste bloco e some ao trocar de aba, de
 * inscrito ou fechar a gaveta. Nada aqui a grava no navegador.
 *
 * Dois passos, como abrir as inscrições: gerar derruba na hora todas as sessões do jogador
 * (inclusive a de um capitão no meio do draft), e quem gerou passa a saber a senha dele.
 */
function SenhaProvisoria({ inscrito }: Readonly<{ inscrito: Inscrito }>) {
  const [fase, setFase] = useState<"parado" | "confirmando" | "gerando">("parado");
  const [gerada, setGerada] = useState<Readonly<{ senha: string; email: string | null }> | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiada, setCopiada] = useState<"ok" | "falhou" | null>(null);
  const contaId = inscrito.jogador_id ?? null;
  const quem = `${inscrito.nick}#${inscrito.tag}`;

  const gerar = async () => {
    if (!contaId) return;
    setFase("gerando");
    setErro(null);
    setCopiada(null);
    try {
      const r = await fetch("/api/admin/jogadores/senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contaId }),
        cache: "no-store",
      });
      const corpo = (await r.json().catch(() => ({}))) as {
        senhaProvisoria?: unknown;
        conta?: { email?: string };
        error?: string;
        missing?: string[];
      };
      if (!r.ok || typeof corpo.senhaProvisoria !== "string") {
        const falta = corpo.missing?.length ? ` (falta: ${corpo.missing.join(", ")})` : "";
        setErro(`${corpo.error ?? "Não foi possível gerar a senha provisória."}${falta}`);
        return;
      }
      setGerada({ senha: corpo.senhaProvisoria, email: corpo.conta?.email ?? null });
    } catch {
      // A resposta pode ter se perdido DEPOIS de a senha mudar: aí a antiga já não vale e a
      // nova não chegou. Gerar de novo resolve — vale sempre a última.
      setErro("Não foi possível falar com o servidor. Se a senha chegou a mudar, gere de novo: vale sempre a última gerada.");
    } finally {
      setFase("parado");
    }
  };

  const copiar = async () => {
    if (!gerada) return;
    try {
      await navigator.clipboard.writeText(gerada.senha);
      setCopiada("ok");
    } catch {
      setCopiada("falhou");
    }
  };

  const texto: CSSProperties = { margin: "6px 0 0", fontSize: 12, lineHeight: 1.6, color: C.ink3 };

  let conteudo: ReactNode;
  if (!contaId) {
    conteudo = (
      <p style={texto}>
        Esta inscrição não tem conta de jogador vinculada (foi feita antes das contas): não há senha para
        redefinir por aqui.
      </p>
    );
  } else if (gerada) {
    conteudo = (
      <div role="status">
        <p style={texto}>
          Senha provisória de <b style={{ color: C.ink }}>{quem}</b>
          {gerada.email ? ` (conta ${gerada.email})` : ""}:
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <code
            style={{
              padding: "6px 10px",
              borderRadius: 3,
              border: `1px solid ${C.line2}`,
              background: "rgba(0,0,0,.35)",
              color: C.bronzeHi,
              fontSize: 15,
              letterSpacing: ".06em",
              userSelect: "all",
              overflowWrap: "anywhere",
            }}
          >
            {gerada.senha}
          </code>
          <Button small onClick={() => void copiar()}>
            Copiar
          </Button>
          {copiada === "ok" ? (
            <span style={{ fontSize: 12, color: C.okSoft }}>Copiada.</span>
          ) : copiada === "falhou" ? (
            <span style={{ fontSize: 12, color: C.dangerSoft }}>O navegador não deixou copiar — selecione e copie à mão.</span>
          ) : null}
        </div>
        <p style={{ ...texto, color: C.warnSoft }}>
          Mande no PRIVADO do jogador, nunca no grupo. Ele entra com ela e troca a senha em seguida, na tela
          /conta/senha. Ela
          aparece só agora: ao sair desta aba ela some, e o servidor não a guarda. As sessões que ele tinha
          abertas caíram.
        </p>
      </div>
    );
  } else if (fase === "confirmando") {
    conteudo = (
      <>
        <p style={{ ...texto, color: C.warnSoft }}>
          Gerar uma senha provisória para {quem}? A senha atual dele deixa de valer e todas as sessões abertas
          caem na hora — inclusive a de capitão, se o draft estiver rodando.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <Button small tone="gold" onClick={() => void gerar()}>
            Confirmar: gerar senha
          </Button>
          <Button small onClick={() => setFase("parado")}>
            Cancelar
          </Button>
        </div>
      </>
    );
  } else {
    conteudo = (
      <>
        <p style={texto}>
          Para quem perdeu a senha da conta: gera uma provisória para você repassar. Só a master vê isto.
        </p>
        <div style={{ marginTop: 8 }}>
          <Button small disabled={fase === "gerando"} onClick={() => setFase("confirmando")}>
            {fase === "gerando" ? "Gerando…" : "Gerar senha provisória"}
          </Button>
        </div>
        {erro ? (
          <p role="alert" style={{ ...texto, color: C.dangerSoft }}>
            {erro}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <section aria-label="Senha da conta" style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontSize: 10, letterSpacing: ".16em", textTransform: "uppercase", color: C.bronze }}>
        Senha da conta
      </div>
      {conteudo}
    </section>
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

export function SecaoInscritos({
  dados,
  executar,
  ocupado,
  podeConferir,
  podeFinanceiro,
  ultimoErro = null,
  ultimaMensagem = null,
  podeRedefinirSenha = false,
}: PropsSecao) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [soPendencia, setSoPendencia] = useState(false);
  const [soAlerta, setSoAlerta] = useState(false);
  const [soFila, setSoFila] = useState(false);
  // Inicializador preguiçoso: a seção só monta no cliente (depois da sessão), então ler o
  // navegador aqui não diverge do servidor.
  const [ordem, setOrdemBruta] = useState<Ordem>(lerOrdem);
  /** Elos marcados no filtro (chave do design system). Vazio = todos. */
  const [filtroElos, setFiltroElos] = useState<ReadonlySet<string>>(() => new Set());
  const contagemId = useId();
  const agora = useAgora();
  const compacto = useCompacto();

  const setOrdem = (nova: Ordem) => {
    setOrdemBruta(nova);
    gravarOrdem(nova);
  };

  const alternarElo = (chave: string) =>
    setFiltroElos((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });

  const { config, inscritos, conferencias, pagamentos, panorama } = dados;
  const janelaAberta = estadoDaJanela(config, agora) === "aberta";

  /*
   * A fila de reserva (D1): titular ou posição na fila, para cada inscrito. Sem teto de vagas
   * todo ativo é titular — aí a coluna e os chips não aparecem, porque não diriam nada.
   */
  const fila = useFila(dados);
  const comFila = temFila(fila);
  const lugarDoInscrito = (id: string) => lugarNaFila(fila, id);
  const porId = useMemo(() => new Map(inscritos.map((i) => [i.id, i])), [inscritos]);
  const primeiro = useMemo(() => {
    const id = primeiroDaFila(fila);
    return id ? (porId.get(id) ?? null) : null;
  }, [fila, porId]);

  /** A fila depois de mudar a situação/organizador de UM inscrito — a mesma função pura. */
  const simularFila = (
    id: string,
    mudanca: Readonly<{ situacao: Inscrito["situacao"]; organizador: boolean }>,
  ): PrevisaoDaFila | null => (comFila ? preverFila(inscritos, config, id, mudanca) : null);

  const falhasDeLoginDe = (id: string): number | null =>
    dados.falhasDeLogin ? (dados.falhasDeLogin[id] ?? 0) : null;

  /**
   * O preço de cada um na PRÉVIA da tabela automática — a mesma conta de Times e vagas. A
   * coluna `pontos` do banco é a tabela fixa da 3ª, e mostrar ela aqui era mostrar um preço
   * que o draft não usa.
   */
  const previaDePrecos = useMemo(
    () =>
      previaDosPrecos({
        inscritos,
        jogadoresPorTime: config.jogadores_por_time,
        orcamentoPorTime: config.orcamento_por_time,
        maxTimes: config.max_times ?? null,
        capitaoComPreco: config.capitao_com_preco ?? null,
      }),
    [inscritos, config.jogadores_por_time, config.orcamento_por_time, config.max_times, config.capitao_com_preco],
  );
  const precoDaPrevia = (inscrito: Inscrito) => previaDePrecos.preco(inscrito);
  /**
   * No time definido pela organização (24/10/2026): a tag TIME DEFINIDO no lugar dos pontos. Vem
   * antes da de capitão — `semPreco` também é verdadeiro para os cinco, capitão dele incluído.
   * A marca (`time_definido`) chega à prévia junto com o resto da inscrição (`select *`).
   */
  const noTimeDefinido = (inscrito: Inscrito) => previaDePrecos.doTimeDefinido(inscrito);
  /** Capitão sem preço (decisão de 23/10/2026): a tag CAPITÃO no lugar dos pontos. */
  const capitaoSemPreco = (inscrito: Inscrito) => !noTimeDefinido(inscrito) && previaDePrecos.semPreco(inscrito);

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

  /**
   * O que merece olho em cada inscrito (ver `alertasDoInscrito`). Calculado, nunca gravado.
   *
   * Dois mapas: `todosOsAlertas` vai para a gaveta (que mostra também os aceitos, apagados);
   * `alertasPorInscrito` só com os que CONTAM — sem ciência da organização que valha para o
   * texto de agora (`separarPorCiencia`). É ele que dá o ⚠ N e o filtro «Só quem tem ponto
   * de atenção».
   */
  const { todosOsAlertas, alertasPorInscrito } = useMemo(() => {
    const pagamentoDe = new Map<string, Pagamento>(pagamentos.map((p) => [p.inscricao_id, p]));
    const todos = new Map<string, Alerta[]>();
    const mapa = new Map<string, Alerta[]>();
    for (const i of inscritos) {
      const alertas = alertasDoInscrito({
        inscrito: i,
        conferencias: [...(porInscrito.get(i.id)?.values() ?? [])],
        // Com `vence_em`: é ele que acende o «prazo vencido» (D5).
        pagamento: pagamentoDe.get(i.id) ?? null,
        config,
        agoraMs: agora,
        // O lugar na fila: reserva não é cobrado (D2), e titular com o prazo vencido ganha o
        // botão «Passar a vaga ao 1º da fila» (D5).
        lugar: lugarNaFila(fila, i.id),
        // A lista inteira: sem ela o alerta de conta da Riot repetida (`mesma_conta`) não é
        // calculado — o índice do banco não pega "VENANCIO" × "VENÂNCIO", e a Riot sim.
        inscritos,
      });
      if (alertas.length === 0) continue;
      todos.set(i.id, alertas);
      const { pendentes } = separarPorCiencia(alertas, i.alertas_cientes);
      if (pendentes.length > 0) mapa.set(i.id, pendentes);
    }
    return { todosOsAlertas: todos, alertasPorInscrito: mapa };
  }, [inscritos, pagamentos, porInscrito, config, agora, fila]);

  /**
   * A lista inteira na ordem escolhida. Tudo o que depende de "quem vem antes/depois"
   * (tabela, cartões, Anterior/Próximo da gaveta) lê ESTA lista — senão a gaveta pularia
   * para o vizinho da ordem de inscrição enquanto a tela mostra a ordem por elo.
   *
   * A ordenação é estável (Array#sort é estável desde o ES2019): empate de elo mantém a
   * ordem de inscrição.
   */
  const ordenados = useMemo(() => {
    if (ordem === "inscricao") return inscritos;
    const lista = [...inscritos];
    if (ordem === "nick") {
      lista.sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR", { sensitivity: "base" }));
      return lista;
    }
    const forca = new Map(lista.map((i) => [i.id, forcaDoInscrito(i)]));
    const sinal = ordem === "elo_desc" ? 1 : -1;
    lista.sort((a, b) => {
      const fa = forca.get(a.id)!;
      const fb = forca.get(b.id)!;
      // Elo ilegível vai para o FIM nas duas direções: no crescente ele não é "o mais fraco".
      if (fa.tier < 0 || fb.tier < 0) return fa.tier < 0 && fb.tier < 0 ? 0 : fa.tier < 0 ? 1 : -1;
      return sinal * compararForca(fa, fb);
    });
    return lista;
  }, [inscritos, ordem]);

  /** Quantos inscritos há em cada elo — os chips do filtro mostram só os elos presentes. */
  const contagemPorElo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const i of inscritos) {
      if (i.situacao === EXCLUIDO && filtroSituacao !== EXCLUIDO) continue;
      const chave = resolveElo(eloExibido(i).bruto)?.key;
      if (chave) mapa.set(chave, (mapa.get(chave) ?? 0) + 1);
    }
    return mapa;
  }, [inscritos, filtroSituacao]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    // "Com pendência" é só o estado `pendente` — item sem linha no banco conta como
    // pendente também. "não avaliável" fica de fora de propósito: ali não há nada que a
    // organização possa fazer enquanto a data não for decidida. Pelo mesmo motivo fica de
    // fora o pendente que ainda não tem como ser medido (o (E) antes da janela): ele espera
    // o robô, e contá-lo deixaria todo inscrito "com pendência" até novembro.
    const temPendencia = (id: string) => {
      const doInscrito = porInscrito.get(id);
      return ITENS_CONFERENCIA.some(
        (item) => comoEstado(doInscrito?.get(item)?.estado) === "pendente" && !semBaseDoItem(item, config, agora),
      );
    };

    return ordenados.filter((i) => {
      // Excluído só aparece quando se filtra por ele: em «Todas» ele some, como apagado.
      if (filtroSituacao === "todos" ? i.situacao === EXCLUIDO : i.situacao !== filtroSituacao) return false;
      if (soPendencia && !temPendencia(i.id)) return false;
      if (soAlerta && !alertasPorInscrito.has(i.id)) return false;
      if (soFila && comFila && lugarNaFila(fila, i.id).tipo !== "reserva") return false;
      if (filtroElos.size > 0 && !filtroElos.has(resolveElo(eloExibido(i).bruto)?.key ?? "")) return false;
      if (!termo) return true;
      return [i.nick, i.riot_id, i.discord, i.email, i.nome_real ?? ""].some((campo) =>
        campo.toLowerCase().includes(termo),
      );
    });
  }, [
    ordenados,
    busca,
    filtroSituacao,
    soPendencia,
    soAlerta,
    soFila,
    comFila,
    fila,
    filtroElos,
    porInscrito,
    alertasPorInscrito,
    config,
    agora,
  ]);

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
    const ondeEsta = ordenados.findIndex((i) => i.id === selecionadoId);
    const indiceVisivel = visiveis.findIndex((i) => i.id === selecionadoId);
    return {
      anterior:
        ordenados
          .slice(0, Math.max(ondeEsta, 0))
          .reverse()
          .find((i) => visivel.has(i.id)) ?? null,
      proximo: ordenados.slice(ondeEsta + 1).find((i) => visivel.has(i.id)) ?? null,
      posicao: indiceVisivel >= 0 ? { atual: indiceVisivel + 1, total: visiveis.length } : null,
    };
  }, [ordenados, visiveis, selecionadoId]);

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

      <FieldGrid min={compacto ? 100 : 140} style={{ marginBottom: 18 }}>
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
        {comFila ? (
          <>
            <Metric
              small
              label="Titulares"
              value={fila.titulares.length}
              detail={`de ${fila.vagas} vagas (organizadores sempre entram)`}
            />
            <Metric
              small
              label="Fila de reserva"
              value={fila.reservas.length}
              detail="pela ordem de inscrição — só paga se for chamado"
            />
          </>
        ) : null}
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
          <Field label="Situação" style={{ flex: compacto ? "1 1 140px" : "0 0 160px" }}>
            <Select value={filtroSituacao} onChange={setFiltroSituacao} ariaLabel="Filtrar por situação">
              <option value="todos">Todas</option>
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {s === EXCLUIDO && panorama.excluidos ? `${ROTULO_SITUACAO[s]} (${panorama.excluidos})` : ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ordenar" style={{ flex: compacto ? "1 1 180px" : "0 0 220px" }}>
            <Select value={ordem} onChange={(v) => setOrdem(v as Ordem)} ariaLabel="Ordenar inscritos">
              {(Object.keys(ROTULO_ORDEM) as Ordem[]).map((o) => (
                <option key={o} value={o}>
                  {ROTULO_ORDEM[o]}
                </option>
              ))}
            </Select>
          </Field>
        </Toolbar>

        {/* Filtro por elo pelos emblemas, do mais alto para o mais baixo — só os elos que
            existem na lista, cada um com quantos são. Marcar vários soma os elos. */}
        {contagemPorElo.size > 0 ? (
          <div style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 7,
                fontSize: 10,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: C.bronze,
              }}
            >
              Elo
              {filtroElos.size > 0 ? (
                <button
                  type="button"
                  onClick={() => setFiltroElos(new Set())}
                  style={{
                    padding: 0,
                    border: "none",
                    background: "none",
                    fontFamily: "inherit",
                    fontSize: 11,
                    letterSpacing: 0,
                    textTransform: "none",
                    color: C.bronzeLit,
                    textDecoration: "underline",
                    cursor: "pointer",
                  }}
                >
                  limpar
                </button>
              ) : null}
            </div>
            <RolagemX rotulo="Filtrar por elo" style={compacto ? undefined : { flexWrap: "wrap", overflowX: "visible" }}>
              {ELOS_DO_MAIOR.filter((meta) => contagemPorElo.has(meta.key)).map((meta) => (
                <ChipFiltro
                  key={meta.key}
                  ativo={filtroElos.has(meta.key)}
                  onClick={() => alternarElo(meta.key)}
                  rotulo={`${meta.label}: ${contagemPorElo.get(meta.key)}`}
                >
                  <Elo elo={meta.label} tamanho={compacto ? 22 : 18} />
                  <span style={tabular}>{contagemPorElo.get(meta.key)}</span>
                </ChipFiltro>
              ))}
            </RolagemX>
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "flex", gap: "8px 22px", flexWrap: "wrap" }}>
          <Check checked={soPendencia} onChange={setSoPendencia}>
            Só quem tem algum requisito pendente
          </Check>
          <Check checked={soAlerta} onChange={setSoAlerta}>
            Só quem tem ponto de atenção ({alertasPorInscrito.size})
          </Check>
          {comFila ? (
            <Check checked={soFila} onChange={setSoFila}>
              Só a fila de reserva ({fila.reservas.length})
            </Check>
          ) : null}
        </div>

        <p
          id={contagemId}
          tabIndex={-1}
          style={{ margin: "12px 0 10px", fontSize: 11.5, color: C.ink4, outline: "none", ...tabular }}
        >
          Mostrando {visiveis.length} de{" "}
          {filtroSituacao === EXCLUIDO ? inscritos.length : inscritos.filter((i) => i.situacao !== EXCLUIDO).length}.
          Clique em alguém para conferir.
        </p>

        {visiveis.length === 0 ? (
          <Empty title="Nenhum inscrito com esses filtros">
            Limpe a busca, desmarque os elos ou volte a situação para «todas».
          </Empty>
        ) : compacto ? (
          // No celular cada inscrito é um cartão: o emblema do elo à esquerda, a situação à
          // direita e os seis requisitos numa fileira embaixo. A tabela de 820px obrigava a
          // rolar de lado para achar a coluna da situação.
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {visiveis.map((inscrito) => {
              const aberto = inscrito.id === selecionadoId;
              const rotas = rotasDoInscrito(inscrito);
              const doInscrito = porInscrito.get(inscrito.id);
              const alertas = alertasPorInscrito.get(inscrito.id);
              return (
                <li key={inscrito.id}>
                  <CartaoLinha
                    idAlvo={`inscrito-${inscrito.id}`}
                    abreDialogo
                    selecionado={aberto}
                    rotuloAlvo={`Abrir a conferência de ${inscrito.nick}#${inscrito.tag}`}
                    onClick={() => setSelecionadoId(inscrito.id)}
                    inicio={<Elo elo={eloExibido(inscrito).bruto} tamanho={40} />}
                    titulo={
                      <>
                        {inscrito.nick}
                        <span style={{ color: C.ink4, fontWeight: 400 }}>#{inscrito.tag}</span>
                      </>
                    }
                    subtitulo={
                      <>
                        <span style={{ display: "block", ...tabular }}>{detalheDoElo(inscrito)}</span>
                        <LeituraDaRiotDiferente inscrito={inscrito} />
                        <span style={{ display: "block", ...tabular }} title={rotas.longo}>
                          {rotas.curto}
                          {noTimeDefinido(inscrito)
                            ? ` · ${rotuloDoTimeDefinido(inscrito)}`
                            : capitaoSemPreco(inscrito)
                              ? " · capitão"
                              : precoDaPrevia(inscrito) !== null
                                ? ` · ${precoDaPrevia(inscrito)} pts`
                                : ""}
                        </span>
                      </>
                    }
                    fim={
                      <Chip tone={TOM_SITUACAO[inscrito.situacao]}>{ROTULO_SITUACAO[inscrito.situacao]}</Chip>
                    }
                  >
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {ITENS_CONFERENCIA.map((item) => {
                        const estado = comoEstado(doInscrito?.get(item)?.estado);
                        return (
                          <Chip
                            key={item}
                            tone={TOM_CONFERENCIA[estado]}
                            title={`${REGRA_DO_ITEM[item].titulo}: ${ROTULO_CONFERENCIA[estado]}`}
                          >
                            <b style={{ textTransform: "uppercase" }}>{item}</b> {ABREV_CONFERENCIA[estado]}
                          </Chip>
                        );
                      })}
                      {comFila ? <ChipDoLugar lugar={lugarDoInscrito(inscrito.id)} /> : null}
                      {inscrito.organizador ? (
                        <Chip tone="gold" title="Organizador desta edição — joga e não paga inscrição">
                          org
                        </Chip>
                      ) : null}
                      {turnosDe(inscrito.disponibilidade).length === 0 ? (
                        <Chip tone="warn" title="Sem disponibilidade informada — preencha na aba Ficha.">
                          sem turno
                        </Chip>
                      ) : null}
                      {alertas ? (
                        <Chip tone="warn" title={alertas.map((a) => a.texto).join("\n")}>
                          ⚠ {alertas.length}
                        </Chip>
                      ) : null}
                    </span>
                  </CartaoLinha>
                </li>
              );
            })}
          </ul>
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
                  <th
                    scope="col"
                    style={{ ...th, textAlign: "right" }}
                    title="Prévia da tabela de pontos automática (a oficial sai na conferência do draft)"
                  >
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
                  {comFila ? (
                    <th
                      scope="col"
                      style={{ ...th, textAlign: "left" }}
                      title={`Titular (dentro das ${fila.vagas} vagas) ou a posição na fila de reserva, pela ordem de inscrição. Organizadores sempre entram.`}
                    >
                      Vaga
                    </th>
                  ) : null}
                  <th scope="col" style={{ ...th, textAlign: "left" }}>
                    Situação
                  </th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((inscrito) => {
                  const aberto = inscrito.id === selecionadoId;
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
                            <Chip tone="gold" title="Organizador desta edição — joga e não paga inscrição">
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
                        <EloDoInscrito inscrito={inscrito} />
                      </td>

                      <td style={{ ...td, textAlign: "right", ...tabular }}>
                        {noTimeDefinido(inscrito) ? (
                          <Chip tone="ok" title={TITULO_DO_TIME_DEFINIDO}>
                            {rotuloDoTimeDefinido(inscrito)}
                          </Chip>
                        ) : capitaoSemPreco(inscrito) ? (
                          <Chip tone="gold" title="Capitão definido pela organização: não tem preço.">
                            capitão
                          </Chip>
                        ) : (
                          (precoDaPrevia(inscrito) ?? "—")
                        )}
                      </td>

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

                      {comFila ? (
                        <td style={td}>
                          {lugarDoInscrito(inscrito.id).tipo === "fora" ? (
                            <span style={{ color: C.ink4 }}>—</span>
                          ) : (
                            <ChipDoLugar lugar={lugarDoInscrito(inscrito.id)} />
                          )}
                        </td>
                      ) : null}

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
          alertas={todosOsAlertas.get(selecionado.id) ?? SEM_ALERTAS}
          conferencias={porInscrito.get(selecionado.id) ?? SEM_CONFERENCIAS}
          executar={executar}
          ocupado={ocupado}
          podeConferir={podeConferir}
          podeFinanceiro={podeFinanceiro}
          ultimoErro={ultimoErro}
          ultimaMensagem={ultimaMensagem}
          podeRedefinirSenha={podeRedefinirSenha}
          posicao={vizinhos.posicao}
          precoNoDraft={precoDaPrevia(selecionado)}
          capitaoNoDraft={capitaoSemPreco(selecionado)}
          timeDefinidoNoDraft={noTimeDefinido(selecionado)}
          lugar={comFila ? lugarDoInscrito(selecionado.id) : null}
          primeiroDaFila={primeiro && primeiro.id !== selecionado.id ? primeiro : null}
          simularFila={(mudanca) => simularFila(selecionado.id, mudanca)}
          falhasDeLogin={falhasDeLoginDe(selecionado.id)}
          anterior={vizinhos.anterior}
          proximo={vizinhos.proximo}
          onIr={setSelecionadoId}
          onFechar={fecharGaveta}
        />
      ) : null}
    </div>
  );
}
