"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { Check, ChevronUp, Download, KeyRound, LayoutGrid, Lock, LogOut, RefreshCcw, Save } from "lucide-react";

import type { SeriesFormat, TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, calculateStandings } from "@/lib/tournament";
import { diffDatasetForScopes, type DatasetChange } from "@/lib/security/dataset-diff";
import { RATE_LIMIT } from "@/lib/security/rate-limit";
import { SCOPES, hasScope, scopeLabel, type Scope } from "@/lib/security/scopes";
import { avisarSessaoMudou } from "@/lib/sessao-mudou";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { AdminTeamsPanel } from "@/components/admin/admin-teams-panel";
import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { AdminSeriesPanel } from "@/components/admin/admin-series-panel";
import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { AdminTournamentPanel } from "@/components/admin/admin-tournament-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { TrocarSenha } from "@/components/admin/trocar-senha";
import { PainelEdicao, type SecaoEdicao } from "@/components/admin/e4/painel-edicao";
import { SecaoConfiguracao } from "@/components/admin/e4/secao-configuracao";
import { SecaoDraft } from "@/components/admin/e4/secao-draft";
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import {
  Banner,
  Button,
  C,
  Card,
  Chip,
  ContextoIconeDaSecao,
  Field,
  Folha,
  Input,
  baixarBackupDoServidor,
  display,
  tabular,
} from "@/components/admin/ui";
import {
  cloneDataset,
  proximaVersaoDoRascunho,
  type AdminTab,
  type MutateDraft,
} from "@/components/admin/shared";
import { ICONE_DA_SECAO } from "@/components/admin/icones-admin";
import {
  descreverCaminho,
  mudancaEstrutural,
  rebasearRascunho,
  resumirMudancasDoServidor,
} from "@/components/admin/rebase-do-rascunho";
import { ModoCompacto, useCompacto, useLarguraCompacta } from "@/components/admin/responsivo";
import { SeloHex } from "@/components/lob/icones";

type StartTournamentPayload = Readonly<{
  name: string;
  format: SeriesFormat;
  keepTeams: boolean;
  keepPlayers: boolean;
  archiveCurrent: boolean;
}>;

type SessionResponse = {
  configured: boolean;
  authorized: boolean;
  /** "accounts" = contas individuais (pede usuário); "legacy" = senha única */
  authMode?: "accounts" | "legacy";
  user?: {
    username: string;
    displayName: string;
    isMaster: boolean;
    scopes: string[];
    mustChangePassword: boolean;
    legacy: boolean;
  };
  dataProvider?: "local" | "supabase";
  dataProviderLabel?: string;
  supabaseConfigured?: boolean;
};

type DatasetResponse = {
  dataset?: TournamentDataset;
  /** Código estável de falha (ex.: DATASET_MISSING). */
  code?: string;
  /** Versão da linha no banco. É o token da trava de concorrência (ver lib/data-store). */
  versao?: number;
  message?: string;
  error?: string;
  missing?: string[];
  /** Só no encerramento: `true` quando a temporada já estava encerrada e o retrato foi refeito. */
  refeito?: boolean;
};

type MessageResponse = {
  ok?: boolean;
  error?: string;
};

/**
 * O 409 do Salvar, já resolvido pelo rebase: só chega aqui o que o painel NÃO pode decidir
 * sozinho (os dois mexeram no mesmo campo), com o que a outra pessoa mudou em palavras.
 */
type Conflito = Readonly<{
  /** "+6 times", "+30 jogadores", "sorteio de lado ou carta em 1 série"... */
  resumoDoServidor: string[];
  /** Campos que os dois mudaram, por nome ("Alfa x Beta › jogos"). */
  campos: string[];
  /** Times/jogadores/séries criados ou apagados, temporada encerrada: sem "Salvar por cima". */
  estrutural: boolean;
  /** Não deu para ler a versão nova (rede): o aviso sai sem o resumo. */
  semDetalhe?: boolean;
}>;

/** Qual operação está em curso — o rótulo do botão precisa dizer a verdade (auditoria #21/#22). */
type Tarefa = "login" | "salvar" | "recarregar" | "sair" | "exportar" | null;

type AdminTabContentProps = Readonly<{
  activeTab: AdminTab;
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  isBusy: boolean;
  onImportFile: (file: File) => Promise<void>;
  onImportText: (text: string) => Promise<void>;
  onEndTournament: () => void;
  onStartTournament: (payload: StartTournamentPayload) => void;
  onAlert: (kind: "ok" | "erro", text: string) => void;
  /** Aplica no rascunho E na baseline o que o servidor já gravou (sorteio ao vivo). */
  aplicarDoServidor: MutateDraft;
  /** As séries como estão GRAVADAS: o sorteio ao vivo só funciona sobre elas. */
  seriesGravadas: TournamentDataset["seriesMatches"];
  /** Escopos que decidem botões da aba Séries e da aba Importar/Exportar. */
  podeLados: boolean;
  podeCartas: boolean;
  podeRiot: boolean;
  podeImportar: boolean;
  /** Acompanha a versão da linha quando uma rota grava por fora do editor. */
  onVersaoDoServidor: (versaoLida?: number, versaoGravada?: number) => void;
  /** Formulário de Times/Jogadores preenchido e ainda não aplicado ao rascunho. */
  onFormularioSujo: (sujo: boolean) => void;
  /** Escopos da 4ª Edição, para a seção mostrar em leitura em vez de oferecer um 403. */
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
  podeConduzirDraft: boolean;
  /**
   * «Gerar senha provisória» na gaveta do inscrito. A rota (`POST /api/admin/jogadores/senha`)
   * exige `users:manage`, que é só da master — sem esta prop o bloco nunca aparecia.
   */
  podeRedefinirSenha: boolean;
  /** O draft gravou o dataset pelo servidor (virada, calendário): recarregar o rascunho. */
  onDatasetMudouNoServidor: () => void;
}>;

// ================================================================ erros de API

/**
 * Erro que carrega o que o servidor de fato respondeu.
 *
 * Antes o painel jogava fora `missing` (escopos que faltam) e o `Retry-After` do 429, e a
 * pessoa via só um texto técnico sem saber o que fazer (auditoria #27 e #43).
 */
class ApiError extends Error {
  readonly status: number;
  readonly missing: string[];
  readonly retryAfterSeconds: number | null;
  /** Código estável do servidor (ex.: DATASET_MISSING), quando ele manda um. */
  readonly code: string | null;

  constructor(
    message: string,
    status: number,
    missing: string[] = [],
    retryAfterSeconds: number | null = null,
    code: string | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.missing = missing;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function lerRetryAfter(response: Response): number | null {
  const cru = response.headers.get("Retry-After");
  if (!cru) return null;
  const segundos = Number(cru);
  return Number.isFinite(segundos) && segundos > 0 ? Math.ceil(segundos) : null;
}

/** Constrói o erro a partir da resposta, preservando tudo que o servidor mandou junto. */
function erroDaResposta(response: Response, corpo: DatasetResponse | MessageResponse, fallback: string) {
  const missing = Array.isArray((corpo as DatasetResponse).missing)
    ? ((corpo as DatasetResponse).missing as string[])
    : [];
  const code = typeof (corpo as DatasetResponse).code === "string" ? (corpo as DatasetResponse).code! : null;
  return new ApiError(corpo.error || fallback, response.status, missing, lerRetryAfter(response), code);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const SEM_CONEXAO = "Sem conexão com o servidor. Confira a internet e tente de novo.";
const SEM_CONEXAO_AO_SALVAR =
  "Sem conexão: não deu para confirmar o salvamento. Confira a internet e tente de novo — se ele chegou a gravar, o próximo Salvar percebe sozinho.";

/**
 * `fetch` + leitura do corpo, sem deixar escapar texto técnico em inglês.
 *
 * Queda de rede no 4G virava "Load failed"/"Failed to fetch" na tela, e uma resposta sem
 * JSON (500 da plataforma, 502 do proxy) virava "Unexpected end of JSON input" — a pessoa
 * não sabia se tinha salvo nem o que fazer. Aqui a rede vira `ApiError` com status 0 e o
 * corpo ilegível vira a mensagem do status HTTP.
 */
async function pedir(
  url: string,
  init: RequestInit,
  semConexao = SEM_CONEXAO,
): Promise<{ response: Response; corpo: DatasetResponse }> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (falha) {
    if (falha instanceof TypeError) throw new ApiError(semConexao, 0);
    throw falha;
  }
  const corpo = (await response
    .json()
    .catch(() => ({ error: `O servidor falhou (HTTP ${response.status}). Tente de novo em instantes.` }))) as DatasetResponse;
  return { response, corpo };
}

function formatarEspera(segundos: number) {
  if (segundos < 90) return `${segundos}s`;
  const min = Math.floor(segundos / 60);
  const seg = segundos % 60;
  return `${min}min ${String(seg).padStart(2, "0")}s`;
}

// ================================================================ rótulos

function getSaveButtonLabel(salvando: boolean, isSupabaseProvider: boolean) {
  if (salvando) return "Salvando...";
  return isSupabaseProvider ? "Salvar no Supabase" : "Salvar no arquivo";
}

function getReloadButtonLabel(recarregando: boolean, isSupabaseProvider: boolean) {
  if (recarregando) return "Recarregando...";
  return isSupabaseProvider ? "Recarregar do Supabase" : "Recarregar do arquivo";
}

/** Nome curto da área tocada por uma mudança — o escopo é técnico demais para a barra. */
const AREA_DO_ESCOPO: Record<string, string> = {
  "tournament:lifecycle": "Temporada",
  "teams:write": "Times",
  "players:write": "Jogadores",
  "series:manage": "Séries",
  "results:write": "Resultados",
  "series:cards": "Cartas",
  "series:sides": "Lados",
};

function resumirMudancas(changes: readonly DatasetChange[]) {
  const contagem = new Map<string, number>();
  for (const mudanca of changes) {
    const area = AREA_DO_ESCOPO[mudanca.scope] ?? mudanca.scope;
    contagem.set(area, (contagem.get(area) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([area, quantidade]) => `${quantidade} em ${area}`);
}

// ================================================================ peças visuais

/**
 * Marca da organização: o emblema do campeonato, o mesmo do cabeçalho do site. Antes era um
 * losango com "LB" — genérico, e de outra linguagem visual que o resto do site já largou.
 */
function MarcaLB({ size = 44 }: Readonly<{ size?: number }>) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt=""
      aria-hidden
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        objectFit: "contain",
        borderRadius: Math.round(size * 0.14),
        filter: "drop-shadow(0 0 12px rgba(232,184,120,.35))",
      }}
    />
  );
}

/**
 * Altura de um elemento, acompanhando mudanças (texto que quebra, janela que encolhe).
 *
 * Existe para as barras fixas do painel pararem DEBAIXO do cabeçalho do site, que também é
 * fixo: com `top: 0` a barra de comando se escondia atrás dele assim que a página rolava.
 */
function useAltura(alvo: HTMLElement | null | (() => HTMLElement | null)) {
  const [altura, setAltura] = useState(0);
  useEffect(() => {
    const el = typeof alvo === "function" ? alvo() : alvo;
    if (!el || typeof ResizeObserver === "undefined") return;
    // O observador mede uma vez ao começar a observar e de novo a cada mudança.
    const observador = new ResizeObserver(() => setAltura(el.getBoundingClientRect().height));
    observador.observe(el);
    return () => observador.disconnect();
  }, [alvo]);
  return altura;
}

const cabecalhoDoSite = () => document.getElementById("lob-cabecalho");

/**
 * Contador regressivo do bloqueio por tentativas. Sem ele o 429 dizia "tente mais tarde"
 * sem dizer QUANDO — e a pessoa fica batendo no botão (auditoria #43).
 */
function ContagemRegressiva({ segundos }: Readonly<{ segundos: number }>) {
  const [restante, setRestante] = useState(segundos);
  const [baseDaEspera, setBaseDaEspera] = useState(segundos);

  // Reagir a uma prop nova ajustando o estado DURANTE a renderização é o padrão do React
  // (e o mesmo já usado no main-nav): evita o frame com o número velho e o efeito em cascata.
  if (baseDaEspera !== segundos) {
    setBaseDaEspera(segundos);
    setRestante(segundos);
  }

  useEffect(() => {
    const id = setInterval(() => {
      setRestante((valor) => (valor <= 1 ? 0 : valor - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [segundos]);

  if (restante <= 0) return <>Você já pode tentar de novo.</>;
  return (
    <>
      Tente novamente em <strong style={{ ...tabular, color: C.ink }}>{formatarEspera(restante)}</strong>.
    </>
  );
}

type AlertaProps = Readonly<{
  erro: string | null;
  faltando: string[];
  esperaSegundos: number | null;
  mensagem: string | null;
}>;

/** Área única de aviso: erro (com permissões que faltam por extenso) e confirmação. */
function Alertas({ erro, faltando, esperaSegundos, mensagem }: AlertaProps) {
  return (
    <>
      {erro ? (
        <Banner tone="danger" title={erro}>
          {faltando.length > 0 ? (
            <p style={{ margin: "0 0 6px" }}>
              Falta a permissão:{" "}
              <strong style={{ color: C.ink }}>{faltando.map(scopeLabel).join(", ")}</strong>. Peça a
              quem administra as contas.
            </p>
          ) : null}
          {esperaSegundos ? <ContagemRegressiva segundos={esperaSegundos} /> : null}
        </Banner>
      ) : null}
      {mensagem ? <Banner tone="ok" title={mensagem} /> : null}
    </>
  );
}

// ================================================================ tela de entrada

type AdminLoginCardProps = Readonly<{
  error: string | null;
  esperaSegundos: number | null;
  message: string | null;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
  isBusy: boolean;
  entrando: boolean;
  /** "accounts" mostra o campo de usuário; "legacy" mantém só a senha */
  authMode: "accounts" | "legacy";
}>;

function AdminLoginCard({
  error,
  esperaSegundos,
  message,
  username,
  setUsername,
  password,
  setPassword,
  onLogin,
  isBusy,
  entrando,
  authMode,
}: AdminLoginCardProps) {
  const usaContas = authMode === "accounts";
  const podeEnviar = Boolean(password) && (!usaContas || Boolean(username));

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "18px 0 40px" }}>
      <Card padding="30px 26px 26px" style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <MarcaLB />
        </div>
        <h2
          style={{
            fontFamily: display,
            fontSize: 27,
            lineHeight: 1.05,
            textAlign: "center",
            color: C.ink,
            margin: "0 0 6px",
          }}
        >
          Painel da organização
        </h2>
        <p
          style={{
            margin: "0 0 22px",
            textAlign: "center",
            fontSize: 11,
            letterSpacing: ".18em",
            textTransform: "uppercase",
            color: C.bronze,
          }}
        >
          League of Bronze · 4ª Edição
        </p>

        <Alertas erro={error} faltando={[]} esperaSegundos={esperaSegundos} mensagem={message} />

        {/* <form> para o Enter enviar sem depender de handler de tecla em cada campo. */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (podeEnviar && !isBusy) onLogin();
          }}
          style={{ display: "grid", gap: 14 }}
        >
          {usaContas ? (
            <Field label="Usuário">
              <Input
                value={username}
                onChange={setUsername}
                autoComplete="username"
                placeholder="seu usuário"
                disabled={isBusy}
              />
            </Field>
          ) : null}

          <Field
            label="Senha"
            hint={
              usaContas
                ? undefined
                : "Modo de transição por senha única. Configure as contas para ativar o acesso individual."
            }
          >
            <Input
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              placeholder="sua senha"
              disabled={isBusy}
            />
          </Field>

          <Button type="submit" tone="gold" fullWidth disabled={isBusy || !podeEnviar}>
            {entrando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p
          style={{
            margin: "18px 0 0",
            fontSize: 11,
            lineHeight: 1.6,
            color: C.ink4,
            textAlign: "center",
          }}
        >
          Depois de {RATE_LIMIT.maxFailuresPerIp} tentativas erradas seguidas o acesso desta rede fica
          bloqueado por {Math.round(RATE_LIMIT.windowSeconds / 60)} minutos. A sessão expira sozinha e
          pode ser revogada a qualquer momento.
        </p>
      </Card>
    </div>
  );
}

// ================================================================ trilho lateral

type Secao = Readonly<{
  value: AdminTab;
  label: string;
  grupo: string;
  contagem?: number;
  nota?: string;
  /** Escopos que a seção usa. Vazio = sempre alcançável (só leitura). */
  escopos: readonly Scope[];
}>;

type ItemTrilhoProps = Readonly<{
  secao: Secao;
  ativo: boolean;
  alcanca: boolean;
  motivoBloqueio: string;
  onClick: () => void;
}>;

function ItemTrilho({ secao, ativo, alcanca, motivoBloqueio, onClick }: ItemTrilhoProps) {
  const Desenho = ICONE_DA_SECAO[secao.value];

  return (
    <button
      type="button"
      onClick={onClick}
      // aria-current é o que anuncia a seção atual para o leitor de tela; antes a
      // seleção existia só na cor (auditoria #36).
      aria-current={ativo ? "page" : undefined}
      title={alcanca ? undefined : motivoBloqueio}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        width: "100%",
        whiteSpace: "nowrap",
        padding: "8px 10px",
        background: ativo ? "linear-gradient(90deg, rgba(201,138,75,.18), rgba(201,138,75,.04))" : "transparent",
        color: ativo ? C.ink : C.ink3,
        border: "1px solid transparent",
        borderLeft: `2px solid ${ativo ? C.bronzeHi : "transparent"}`,
        borderRadius: 3,
        fontFamily: "inherit",
        fontSize: 12.5,
        fontWeight: ativo ? 700 : 500,
        letterSpacing: ".02em",
        textAlign: "left",
        cursor: "pointer",
        opacity: alcanca ? 1 : 0.45,
      }}
    >
      {/* O desenho da seção no lugar do losango genérico. A ativa ganha o dourado E o
          fundo: não se distingue só pela cor. */}
      <Desenho
        size={16}
        strokeWidth={ativo ? 2.2 : 1.8}
        color={ativo ? C.bronzeHi : C.ink4}
        style={{ flexShrink: 0 }}
        aria-hidden
      />
      {/*
        `minWidth: 0` sozinho deixa o texto ENCOLHER, mas não o impede de transbordar:
        sem o recorte, um rótulo longo passava por cima da nota ao lado e as duas
        palavras ficavam sobrepostas. O recorte cuida do rótulo; o `flexShrink: 0`
        garante que quem espreme é o rótulo, nunca a contagem ou a nota.
      */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {secao.label}
      </span>
      {typeof secao.contagem === "number" ? (
        <span style={{ fontSize: 11, color: C.ink4, flexShrink: 0, ...tabular }}>{secao.contagem}</span>
      ) : null}
      {secao.nota ? (
        <span style={{ fontSize: 10.5, color: C.ink4, flexShrink: 0 }}>{secao.nota}</span>
      ) : null}
      {alcanca ? null : <Lock size={12} aria-hidden color={C.ink4} style={{ flexShrink: 0 }} />}
    </button>
  );
}

// ================================================================ celular

type DocaProps = Readonly<{
  secao: Secao | undefined;
  sujo: boolean;
  totalMudancas: number;
  salvando: boolean;
  isBusy: boolean;
  onAbrirSecoes: () => void;
  onSalvar: () => void;
  seletorAberto: boolean;
}>;

/**
 * Doca do celular: fica presa embaixo, no alcance do polegar.
 *
 * Duas coisas só, as que se usa o tempo todo: trocar de seção e salvar. No monitor elas
 * moram no trilho e na barra de comando; no celular a barra empilhava quatro fileiras de
 * botões no topo e o trilho virava uma faixa com barra de rolagem.
 */
function DocaCompacta({ secao, sujo, totalMudancas, salvando, isBusy, onAbrirSecoes, onSalvar, seletorAberto }: DocaProps) {
  const Desenho = secao ? ICONE_DA_SECAO[secao.value] : LayoutGrid;
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        // Mesma camada da barra de comando (30): abaixo do cabeçalho e das folhas.
        zIndex: 30,
        display: "flex",
        alignItems: "stretch",
        gap: 10,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        background: "linear-gradient(180deg, rgba(23,17,10,.97), rgba(12,8,4,.99))",
        borderTop: `1px solid ${C.line2}`,
        boxShadow: "0 -12px 30px rgba(0,0,0,.55)",
      }}
    >
      <button
        type="button"
        onClick={onAbrirSecoes}
        aria-haspopup="dialog"
        aria-expanded={seletorAberto}
        aria-label={`Seções do painel. Aberta: ${secao?.label ?? "nenhuma"}`}
        className="adm-toque"
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px 6px 8px",
          minHeight: 50,
          border: `1px solid ${C.line2}`,
          borderRadius: 6,
          background: "rgba(201,138,75,.07)",
          color: C.ink,
          fontFamily: "inherit",
          textAlign: "left",
          cursor: "pointer",
        }}
      >
        <SeloHex icone={Desenho} tamanho={34} ativo />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 9.5, letterSpacing: ".2em", textTransform: "uppercase", color: C.bronze }}>
            {secao?.grupo ?? "Seções"}
          </span>
          <span
            style={{
              display: "block",
              fontSize: 14,
              fontWeight: 700,
              color: C.ink,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {secao?.label ?? "Escolher seção"}
          </span>
        </span>
        <ChevronUp size={18} aria-hidden color={C.ink3} style={{ flexShrink: 0 }} />
      </button>

      {sujo ? (
        <button
          type="button"
          onClick={onSalvar}
          disabled={isBusy}
          className="adm-toque"
          aria-label={`Salvar ${totalMudancas} alteração(ões)`}
          style={{
            position: "relative",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 16px",
            minHeight: 50,
            border: "1px solid transparent",
            borderRadius: 6,
            background: `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})`,
            color: "#160f06",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: 13.5,
            letterSpacing: ".04em",
            cursor: isBusy ? "not-allowed" : "pointer",
            opacity: isBusy ? 0.6 : 1,
          }}
        >
          <Save size={17} aria-hidden />
          {salvando ? "Salvando..." : "Salvar"}
          {salvando ? null : (
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: -7,
                right: -6,
                minWidth: 20,
                height: 20,
                padding: "0 5px",
                display: "grid",
                placeItems: "center",
                borderRadius: 999,
                background: C.warn,
                color: "#1a1006",
                fontSize: 11,
                fontWeight: 800,
                border: "2px solid #120c06",
                ...tabular,
              }}
            >
              {totalMudancas}
            </span>
          )}
        </button>
      ) : (
        // Sem alteração não há o que salvar: em vez de um botão desligado, o estado.
        <span
          role="status"
          style={{
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "0 14px",
            minHeight: 50,
            border: "1px solid rgba(70,214,200,.35)",
            borderRadius: 6,
            background: "rgba(70,214,200,.08)",
            color: C.okSoft,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Check size={16} aria-hidden />
          Salvo
        </span>
      )}
    </div>
  );
}

type SeletorProps = Readonly<{
  aberto: boolean;
  onFechar: () => void;
  grupos: [string, Secao[]][];
  ativa: AdminTab;
  alcanca: (escopos: readonly Scope[]) => boolean;
  onEscolher: (destino: AdminTab) => void;
  conta: ReactNode;
  acoes: ReactNode;
}>;

/**
 * Todas as seções numa folha, em grade de selos — o mesmo desenho do trilho do monitor,
 * maior e com alvo de dedo. A conta e as ações raras (recarregar, exportar, sair) moram no
 * fim da folha: estão a um toque, mas não ocupam a tela de trabalho.
 */
function SeletorDeSecoes({ aberto, onFechar, grupos, ativa, alcanca, onEscolher, conta, acoes }: SeletorProps) {
  return (
    <Folha aberta={aberto} onFechar={onFechar} titulo="Seções do painel" icone={LayoutGrid} rotuloFechar="Fechar seções">
      <nav aria-label="Seções do painel">
        {grupos.map(([nomeDoGrupo, itensDoGrupo]) => (
          <section key={nomeDoGrupo} style={{ marginBottom: 18 }}>
            <h3
              style={{
                margin: "0 0 9px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: ".22em",
                textTransform: "uppercase",
                color: C.bronze,
              }}
            >
              {nomeDoGrupo}
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: 8 }}>
              {itensDoGrupo.map((secao) => {
                const ehAtiva = secao.value === ativa;
                const pode = alcanca(secao.escopos);
                return (
                  <button
                    key={secao.value}
                    type="button"
                    onClick={() => onEscolher(secao.value)}
                    aria-current={ehAtiva ? "page" : undefined}
                    className="adm-toque"
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      minHeight: 96,
                      padding: "12px 6px 10px",
                      borderRadius: 6,
                      border: `1px solid ${ehAtiva ? C.bronze : C.line}`,
                      background: ehAtiva
                        ? "linear-gradient(180deg, rgba(201,138,75,.20), rgba(201,138,75,.06))"
                        : "rgba(0,0,0,.26)",
                      color: pode ? C.ink : C.ink4,
                      fontFamily: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <SeloHex icone={ICONE_DA_SECAO[secao.value]} tamanho={38} ativo={ehAtiva} />
                    <span style={{ fontSize: 12.5, fontWeight: ehAtiva ? 700 : 600, lineHeight: 1.2, textAlign: "center" }}>
                      {secao.label}
                    </span>
                    {typeof secao.contagem === "number" || secao.nota ? (
                      <span style={{ fontSize: 10.5, color: C.ink4, lineHeight: 1.2, ...tabular }}>
                        {typeof secao.contagem === "number" ? secao.contagem : secao.nota}
                      </span>
                    ) : null}
                    {pode ? null : (
                      <span
                        title="Sem permissão: abre em modo de leitura"
                        style={{ position: "absolute", top: 7, right: 7, display: "flex" }}
                      >
                        <Lock size={13} aria-label="sem permissão, só leitura" color={C.ink4} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "4px 0 14px" }}>{acoes}</div>
      {conta}
    </Folha>
  );
}

/**
 * Aviso que flutua acima da doca, no celular.
 *
 * Quem salva pela doca está, em geral, rolado lá embaixo — e o aviso de verdade (o
 * `Banner`, que é região viva para o leitor de tela) nasce no TOPO do conteúdo, fora da
 * vista. Este é só o eco visual dele: tocar leva até o aviso completo. Por isso é
 * `aria-hidden` — o leitor de tela já ouviu o original.
 */
function AvisoFlutuante({ tom, texto, onTocar }: Readonly<{ tom: "ok" | "erro"; texto: string; onTocar: () => void }>) {
  const cor = tom === "ok" ? C.ok : C.danger;
  return (
    <div
      aria-hidden
      onClick={onTocar}
      className="adm-folha-baixo"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(84px + env(safe-area-inset-bottom))",
        zIndex: 31,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "11px 14px",
        borderRadius: 6,
        border: `1px solid ${cor}88`,
        background: tom === "ok" ? "rgba(10,30,28,.96)" : "rgba(40,12,10,.96)",
        boxShadow: "0 10px 28px rgba(0,0,0,.55)",
        color: C.ink,
        fontSize: 13,
        lineHeight: 1.4,
        cursor: "pointer",
      }}
    >
      <span style={{ width: 3, alignSelf: "stretch", borderRadius: 2, background: cor, flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{texto}</span>
      <span style={{ fontSize: 10.5, color: C.ink4, flexShrink: 0 }}>ver ↑</span>
    </div>
  );
}

// ================================================================ conteúdo

function AdminTabContent({
  activeTab,
  draft,
  mutateDraft,
  isBusy,
  onImportFile,
  onImportText,
  onEndTournament,
  onStartTournament,
  onAlert,
  aplicarDoServidor,
  seriesGravadas,
  podeLados,
  podeCartas,
  podeRiot,
  podeImportar,
  onVersaoDoServidor,
  onFormularioSujo,
  podeConferir,
  podeFinanceiro,
  podeConfigurar,
  podeConduzirDraft,
  podeRedefinirSenha,
  onDatasetMudouNoServidor,
}: AdminTabContentProps) {
  if (activeTab === "users") return <AdminUsersPanel onAlert={onAlert} />;
  if (activeTab === "e4-draft") {
    return <SecaoDraft onAlert={onAlert} podeConduzir={podeConduzirDraft} onDatasetMudou={onDatasetMudouNoServidor} />;
  }

  // As quatro seções da 4ª Edição compartilham o mesmo contêiner: ele busca uma vez e
  // entrega os dados prontos. Ficam fora do `switch` abaixo porque nenhuma delas usa
  // `draft` — os dados estão em tabelas próprias, não no rascunho do campeonato.
  const secoesDaEdicao: Partial<Record<AdminTab, { secao: SecaoEdicao; render: typeof SecaoTimes }>> = {
    "e4-config": { secao: "config", render: SecaoConfiguracao },
    "e4-inscritos": { secao: "inscritos", render: SecaoInscritos },
    "e4-pagamentos": { secao: "pagamentos", render: SecaoPagamentos },
    "e4-times": { secao: "times", render: SecaoTimes },
  };

  const daEdicao = secoesDaEdicao[activeTab];
  if (daEdicao) {
    const Secao = daEdicao.render;
    return (
      <PainelEdicao
        secao={daEdicao.secao}
        onAlert={onAlert}
        podeConferir={podeConferir}
        podeFinanceiro={podeFinanceiro}
        podeConfigurar={podeConfigurar}
        podeRedefinirSenha={podeRedefinirSenha}
        render={(props) => <Secao {...props} />}
      />
    );
  }

  switch (activeTab) {
    case "tournament":
      return (
        <AdminTournamentPanel
          draft={draft}
          isBusy={isBusy}
          onEndTournament={onEndTournament}
          onStartTournament={onStartTournament}
        />
      );
    case "overview":
      return <AdminOverviewPanel draft={draft} />;
    case "teams":
      return <AdminTeamsPanel draft={draft} mutateDraft={mutateDraft} onSujoChange={onFormularioSujo} />;
    case "players":
      return <AdminPlayersPanel draft={draft} mutateDraft={mutateDraft} onSujoChange={onFormularioSujo} />;
    case "series":
      return (
        <AdminSeriesPanel
          draft={draft}
          mutateDraft={mutateDraft}
          aplicarDoServidor={aplicarDoServidor}
          onVersaoDoServidor={onVersaoDoServidor}
          seriesGravadas={seriesGravadas}
          podeLados={podeLados}
          podeCartas={podeCartas}
          podeRiot={podeRiot}
        />
      );
    case "backup":
      return (
        <AdminBackupPanel
          importing={isBusy}
          onImportFile={onImportFile}
          onImportText={onImportText}
          podeImportar={podeImportar}
        />
      );
    default:
      return null;
  }
}

// ================================================================ painel

/**
 * O painel decide UMA vez se está no celular e passa a resposta para baixo por contexto:
 * botões, campos e listas de todas as seções leem `useCompacto()` em vez de cada um medir
 * a janela.
 */
export function AdminDashboardClient() {
  const compacto = useLarguraCompacta();
  return (
    <ModoCompacto ativo={compacto}>
      <PainelDoAdmin />
    </ModoCompacto>
  );
}

function PainelDoAdmin() {
  const compacto = useCompacto();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [draft, setDraft] = useState<TournamentDataset | null>(null);
  /**
   * Cópia do dataset como o servidor devolveu. É contra ela que o rascunho é comparado —
   * com a MESMA função de diferença que o servidor usa para autorizar o PUT, então a conta
   * que aparece na barra é a mesma que vai ser checada na hora de salvar.
   */
  const [baseline, setBaseline] = useState<TournamentDataset | null>(null);
  /**
   * Versão do dataset no banco, como estava quando este rascunho foi carregado.
   *
   * Vive FORA do dataset porque é atributo da linha, não do documento. Vai de volta no PUT
   * e é o que permite ao banco recusar a gravação quando outra pessoa gravou no intervalo.
   */
  const [versao, setVersao] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faltando, setFaltando] = useState<string[]>([]);
  const [esperaSegundos, setEsperaSegundos] = useState<number | null>(null);
  /** Falha na CARGA INICIAL: sem isto a tela ficava em "Carregando..." para sempre (#10). */
  const [bootError, setBootError] = useState<string | null>(null);
  /** Código do erro de carga, quando o servidor mandou um (ver ApiError.code). */
  const [bootCode, setBootCode] = useState<string | null>(null);
  const [semeando, setSemeando] = useState(false);
  /**
   * Formulário de Times/Jogadores preenchido mas ainda NÃO aplicado ao rascunho.
   *
   * O `sujo` abaixo compara rascunho com baseline e não enxerga esse formulário: sem isto,
   * sair ou fechar a aba com uma ficha inteira digitada não pedia confirmação nenhuma.
   */
  const [formularioSujo, setFormularioSujo] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [tarefa, setTarefa] = useState<Tarefa>(null);
  /**
   * Alguém gravou por cima enquanto este rascunho estava aberto (resposta 409) E mexeu nos
   * mesmos campos — o 409 sem sobreposição é resolvido sozinho pelo rebase.
   */
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const conflict = conflito !== null;
  /**
   * A sessão expirou (401) com o rascunho aberto. O editor continua montado e o cartão de
   * entrar aparece por cima dele: entrar de novo NÃO recarrega o campeonato.
   */
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  /**
   * O draft (virada, calendário) gravou no site enquanto havia alteração não salva aqui. O
   * rascunho é de ANTES da virada: num conflito, salvar por cima apagaria times e séries.
   */
  const [rascunhoAnteriorAoDraft, setRascunhoAnteriorAoDraft] = useState(false);
  /** "Sair da página" já confirmado por um clique em link: o beforeunload não pergunta de novo. */
  const saidaConfirmada = useRef(false);
  /** Folha de seções do celular aberta. */
  const [seletorAberto, setSeletorAberto] = useState(false);
  /** Texto do aviso flutuante que a pessoa já dispensou (ou que já expirou). */
  const [avisoDispensado, setAvisoDispensado] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  // A barra só existe depois de a sessão e o campeonato carregarem: ref por estado, para a
  // medição começar quando ela aparece.
  const [barraEl, setBarraEl] = useState<HTMLDivElement | null>(null);
  const alturaDoCabecalho = useAltura(cabecalhoDoSite);
  const alturaDaBarra = useAltura(barraEl);

  // Toda tentativa nova zera o "já dispensado" do eco do celular. A dispensa é guardada pelo
  // TEXTO: sem zerar, o mesmo erro numa segunda tentativa (ou o mesmo "Salvo... Líder atual"
  // de dois salvamentos seguidos) não aparecia acima da doca — quem salvou lá embaixo ficava
  // sem saber que falhou de novo.
  const clearAlerts = () => {
    setMessage(null);
    setError(null);
    setFaltando([]);
    setEsperaSegundos(null);
    setAvisoDispensado(null);
  };

  const registrarErro = (erro: unknown, fallback: string) => {
    setMessage(null);
    setAvisoDispensado(null);
    if (erro instanceof ApiError) {
      setError(erro.message);
      setFaltando(erro.status === 403 ? erro.missing : []);
      setEsperaSegundos(erro.retryAfterSeconds);
      // Sessão expirada no meio do trabalho: o cartão de entrar aparece SEM desmontar o
      // editor. Antes só aparecia "Não autorizado." e a saída era redigitar tudo.
      if (erro.status === 401 && session?.authorized) {
        setSessaoExpirada(true);
        if (!username && session.user?.username) setUsername(session.user.username);
      }
      // No celular o formulário de troca mora na folha de seções, longe da tela de trabalho.
      if (erro.code === "SENHA_PENDENTE" && compacto) setSeletorAberto(true);
      return;
    }
    setError(getErrorMessage(erro, fallback));
    setFaltando([]);
    setEsperaSegundos(null);
  };

  const fetchSession = async () => {
    const { response, corpo } = await pedir("/api/admin/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok) throw erroDaResposta(response, corpo, "Falha ao consultar a sessão.");
    const data = corpo as unknown as SessionResponse;
    setSession(data);
    return data;
  };

  /** Toda vez que o servidor devolve o dataset ele vira rascunho E referência de comparação. */
  const adotarDatasetDoServidor = (dataset: TournamentDataset, versaoDoServidor?: number) => {
    setDraft(dataset);
    setBaseline(cloneDataset(dataset));
    if (typeof versaoDoServidor === "number") setVersao(versaoDoServidor);
    setRascunhoAnteriorAoDraft(false);
  };

  /** Lê o campeonato e a versão do servidor SEM mexer no rascunho (o rebase do 409 usa). */
  const lerDoServidor = async () => {
    const { response, corpo } = await pedir("/api/admin/dataset", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!response.ok || !corpo.dataset) {
      throw erroDaResposta(response, corpo, "Falha ao carregar os dados do campeonato.");
    }
    return { dataset: corpo.dataset, versao: corpo.versao };
  };

  const fetchDataset = async () => {
    const lido = await lerDoServidor();
    adotarDatasetDoServidor(lido.dataset, lido.versao);
    return lido.dataset;
  };

  /**
   * A função passada ao startTransition é ASSÍNCRONA de propósito: assim o `isPending` fica
   * ligado até a requisição terminar. Com o callback síncrono de antes o pendente apagava no
   * mesmo instante e os botões voltavam a ficar clicáveis no meio de um salvamento.
   */
  const runTransitionTask = (qual: Tarefa, task: () => Promise<void>, fallbackError: string) => {
    setTarefa(qual);
    startTransition(async () => {
      try {
        await task();
      } catch (taskError) {
        registrarErro(taskError, fallbackError);
      } finally {
        setTarefa(null);
      }
    });
  };

  const carregarPainel = () => {
    setBootError(null);
    setBootCode(null);
    startTransition(async () => {
      try {
        clearAlerts();
        const currentSession = await fetchSession();
        if (currentSession.authorized) {
          await fetchDataset();
        }
      } catch (bootFailure) {
        // Erro da carga inicial fica em estado próprio: a tela precisa MOSTRAR a falha e
        // oferecer "tentar de novo" em vez de ficar presa no "Carregando...".
        setBootError(getErrorMessage(bootFailure, "Falha ao iniciar o painel."));
        setBootCode(bootFailure instanceof ApiError ? bootFailure.code : null);
      }
    });
  };

  useEffect(() => {
    carregarPainel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mutateDraft: MutateDraft = (recipe) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = cloneDataset(prev);
      recipe(next);
      return next;
    });
  };

  /**
   * Aplica uma mudança no rascunho E na baseline.
   *
   * Para o que o SERVIDOR já gravou por fora do editor — hoje, o resultado do sorteio ao
   * vivo. Mexer só no rascunho (como `mutateDraft`) fazia o painel contar aquilo como
   * alteração pendente: depois de qualquer sorteio o chip de "alterações não salvas"
   * ficava aceso para sempre, o aviso de sair da página passava a disparar à toa, e a
   * pessoa não tinha como distinguir o que ela mudou do que o sorteio trouxe.
   */
  const aplicarDoServidor: MutateDraft = (recipe) => {
    const aplicar = (prev: TournamentDataset | null) => {
      if (!prev) return prev;
      const next = cloneDataset(prev);
      recipe(next);
      return next;
    };
    setDraft(aplicar);
    setBaseline(aplicar);
  };

  /**
   * Acompanha a versão quando uma rota grava por fora do editor (o sorteio ao vivo).
   *
   * Só adota a versão nova se o rascunho estava exatamente na versão que a rota leu —
   * ver `proximaVersaoDoRascunho`. Adotar cego carimbaria um rascunho velho com um número
   * novo e faria a trava do PUT parar de disparar.
   */
  const sincronizarVersaoDoServidor = (versaoLida?: number, versaoGravada?: number) => {
    setVersao((atual) => proximaVersaoDoRascunho(atual, versaoLida, versaoGravada));
  };

  // ------------------------------------------------------------ estado do rascunho

  const changes = useMemo<DatasetChange[]>(() => {
    if (!draft || !baseline) return [];
    try {
      return diffDatasetForScopes(baseline, draft);
    } catch {
      // Um rascunho pela metade (série sem time, por exemplo) não pode derrubar a barra.
      return [];
    }
  }, [draft, baseline]);

  const sujo = changes.length > 0;
  /** Há trabalho a perder: rascunho alterado OU ficha preenchida e não aplicada. */
  const temTrabalhoNaoSalvo = sujo || formularioSujo;

  // #1: fechar a aba ou recarregar apagava o rascunho em silêncio.
  useEffect(() => {
    if (!temTrabalhoNaoSalvo) return;
    const aoSair = (event: BeforeUnloadEvent) => {
      // A pessoa já respondeu "sim" ao aviso do link — ou ao do "Sair" do menu da conta,
      // que marca o <html> com `data-lob-saida-confirmada`: perguntar de novo seria em dobro
      // e, se ela escolhesse "Ficar", continuaria aqui já sem sessão.
      if (saidaConfirmada.current || document.documentElement.dataset.lobSaidaConfirmada === "1") return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [temTrabalhoNaoSalvo]);

  /** O texto do aviso de sair: diz QUANTO se perde, como o de recarregar e o de sair da conta. */
  const avisoDeSaida = sujo
    ? `Você tem ${changes.length} alteração(ões) não salva(s) no painel. Sair desta página vai descartar tudo. Continuar?`
    : "Você preencheu uma ficha e ainda não aplicou ao rascunho. Sair desta página vai descartá-la. Continuar?";

  /*
   * Links do site (logo, menu, "Minha inscrição") navegam pelo next/link, sem recarregar a
   * página — e o `beforeunload` não dispara nesse caso. O painel era desmontado e o rascunho
   * sumia sem pergunta nenhuma. A guarda escuta o clique na CAPTURA, no `document`: roda
   * antes do React (que escuta no contêiner da raiz), então recusar aqui impede tanto a
   * navegação do navegador quanto a do next/link, sem mexer no cabeçalho do site.
   *
   * O atributo `data-lob-painel-sujo` no <html> é o sinal para quem está fora do painel
   * (o "Sair" do menu da conta) poder perguntar antes de agir.
   */
  useEffect(() => {
    if (!temTrabalhoNaoSalvo) return;
    const raiz = document.documentElement;
    raiz.dataset.lobPainelSujo = "1";

    const guarda = (evento: MouseEvent) => {
      if (evento.defaultPrevented || evento.button !== 0) return;
      // Ctrl/⌘/Shift/Alt abrem em outra aba ou baixam: o painel continua aqui.
      if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
      const alvo = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
      if (!(alvo instanceof HTMLAnchorElement)) return;
      if ((alvo.target && alvo.target !== "_self") || alvo.hasAttribute("download")) return;

      const destino = new URL(alvo.href, window.location.href);
      // Outro site: a navegação é de verdade e o `beforeunload` já pergunta.
      if (destino.origin !== window.location.origin) return;
      // Âncora na própria página não tira ninguém do painel.
      if (destino.pathname === window.location.pathname && destino.search === window.location.search) return;

      if (window.confirm(avisoDeSaida)) {
        saidaConfirmada.current = true;
        window.setTimeout(() => {
          saidaConfirmada.current = false;
        }, 1500);
        return;
      }
      evento.preventDefault();
      evento.stopPropagation();
    };

    document.addEventListener("click", guarda, true);
    return () => {
      document.removeEventListener("click", guarda, true);
      delete raiz.dataset.lobPainelSujo;
    };
  }, [temTrabalhoNaoSalvo, avisoDeSaida]);

  /**
   * Troca de seção pedindo confirmação quando há ficha preenchida e não aplicada.
   *
   * Este é o caminho MAIS provável de perder o trabalho — mais que fechar a aba ou sair:
   * a pessoa preenche a ficha de um jogador, lembra de conferir outra coisa, clica noutra
   * seção e o formulário some. `beforeunload` não cobre navegação interna, e o `sujo` do
   * rascunho não enxerga a ficha.
   */
  /** Devolve se trocou — no celular, a folha de seções só fecha quando a troca aconteceu. */
  const trocarDeSecao = (destino: AdminTab) => {
    if (destino === activeTab) return true;
    if (formularioSujo) {
      const seguir = window.confirm(
        "Você preencheu uma ficha e ainda não aplicou ao rascunho. Trocar de seção vai descartá-la. Continuar?",
      );
      if (!seguir) return false;
    }
    setActiveTab(destino);
    return true;
  };

  // ------------------------------------------------------------ celular

  /*
   * A doca é `fixed` e cobriria o fim da página — o rodapé do site, onde mora o aviso
   * obrigatório da Riot. O respiro vai no <body>, depois do rodapé, e só enquanto a doca
   * existe.
   */
  const temDoca = compacto && Boolean(session?.authorized && draft);
  useEffect(() => {
    if (!temDoca) return;
    const antes = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "calc(78px + env(safe-area-inset-bottom))";
    return () => {
      document.body.style.paddingBottom = antes;
    };
  }, [temDoca]);

  /** O eco do aviso acima da doca: confirmação some sozinha; erro fica até a pessoa tocar. */
  const textoDoAviso = conflict ? "Alguém salvou antes de você — veja as opções no topo." : (error ?? message);
  const tomDoAviso: "ok" | "erro" = conflict || error ? "erro" : "ok";
  const mostrarAviso = compacto && Boolean(textoDoAviso) && textoDoAviso !== avisoDispensado;
  useEffect(() => {
    if (!mostrarAviso || tomDoAviso !== "ok" || !textoDoAviso) return;
    const id = setTimeout(() => setAvisoDispensado(textoDoAviso), 4500);
    return () => clearTimeout(id);
  }, [mostrarAviso, tomDoAviso, textoDoAviso]);

  const confirmarDescarte = (acao: string) => {
    if (!temTrabalhoNaoSalvo) return true;
    // A ficha preenchida e não aplicada conta como trabalho a perder, mas não entra na
    // contagem de `changes` — por isso o texto muda quando ela é a única coisa pendente.
    const oQueSePerde = sujo
      ? `${changes.length} alteração(ões) não salva(s)`
      : "uma ficha preenchida e ainda não aplicada ao rascunho";
    return window.confirm(`Você tem ${oQueSePerde}. ${acao} vai descartar tudo. Continuar?`);
  };

  // ------------------------------------------------------------ identidade e permissões

  const identity = useMemo(() => {
    const usuario = session?.user;
    if (!usuario) return null;
    return {
      id: usuario.username,
      username: usuario.username,
      displayName: usuario.displayName,
      isMaster: usuario.isMaster,
      scopes: usuario.scopes,
      mustChangePassword: usuario.mustChangePassword,
      legacy: usuario.legacy,
    };
  }, [session?.user]);

  /**
   * Alcance da pessoa numa seção. Sem identidade (caso teórico) devolve `true`: quem manda
   * é o servidor, e esconder tudo por falta de dado seria pior do que mostrar demais.
   */
  const alcanca = (escopos: readonly Scope[]) => {
    if (escopos.length === 0) return true;
    if (!identity) return true;
    return escopos.some((escopo) => hasScope(identity, escopo));
  };

  /** Escopos exigidos pelo rascunho atual que esta pessoa NÃO tem — avisa antes do 403. */
  const escoposPendentesSemPermissao = useMemo(() => {
    if (!identity || changes.length === 0) return [];
    const exigidos = new Set<Scope>(changes.map((mudanca) => mudanca.scope));
    return [...exigidos].filter((escopo) => !hasScope(identity, escopo));
  }, [changes, identity]);

  // ------------------------------------------------------------ ações

  const login = () => {
    runTransitionTask(
      "login",
      async () => {
        clearAlerts();
        const { response, corpo: data } = await pedir("/api/admin/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        if (!response.ok) {
          throw erroDaResposta(response, data, "Falha no login.");
        }
        setPassword("");
        setSessaoExpirada(false);
        await fetchSession();
        // Rascunho com trabalho pendente (a sessão caiu e a tela de entrar apareceu por
        // cima dele) não é trocado pelo do servidor: ele é justamente o que a pessoa
        // entrou de novo para salvar.
        if (draft && temTrabalhoNaoSalvo) {
          avisarSessaoMudou();
          setMessage("Login realizado. Seu rascunho continua aqui — salve quando quiser.");
          return;
        }
        /*
         * A falha AQUI precisa virar `bootError`, e não o erro comum da barra.
         *
         * Se a busca do dataset falhasse logo depois de um login bem-sucedido (Supabase
         * pausado, queda de rede entre as duas requisições), o erro ia para `error`,
         * `bootError` continuava nulo e a tela de exceção — a que traz o botão "Tentar
         * de novo" — não aparecia. Com sessão autorizada e `draft` nulo, o painel ficava
         * preso em "Carregando dados do campeonato..." para sempre, sem mensagem e sem
         * saída a não ser recarregar a página na mão.
         */
        try {
          await fetchDataset();
        } catch (falhaNoDataset) {
          setBootError(getErrorMessage(falhaNoDataset, "Falha ao carregar os dados do campeonato."));
          setBootCode(falhaNoDataset instanceof ApiError ? falhaNoDataset.code : null);
          throw falhaNoDataset;
        }
        // O cabeçalho do site não sabe que isto aconteceu: o login é aqui dentro, sem
        // trocar de rota. Sem o aviso, ele continuava oferecendo "ENTRAR" para quem
        // acabou de entrar, até alguém apertar F5.
        avisarSessaoMudou();
        setMessage("Login realizado. Painel liberado.");
      },
      "Falha no login.",
    );
  };

  const logout = () => {
    if (!confirmarDescarte("Sair")) return;
    runTransitionTask(
      "sair",
      async () => {
        clearAlerts();
        await pedir("/api/admin/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        avisarSessaoMudou();
        setDraft(null);
        setBaseline(null);
        setVersao(null);
        setConflito(null);
        setSessaoExpirada(false);
        // A seção volta para o começo. Sem isto, o master que saiu da aba "Usuários"
        // deixava a próxima pessoa caindo direto nela — e quem não é master leva 403
        // ali. No notebook da organização, num dia de jogo, isso é a troca normal de
        // quem está no painel.
        setActiveTab("overview");
        // #9: o authMode PRECISA sobreviver ao logout. Sem ele o formulário perde o campo
        // de usuário e a pessoa fica presa num 401 até recarregar a página na mão.
        setSession({
          configured: session?.configured ?? true,
          authorized: false,
          authMode: session?.authMode ?? "legacy",
        });
        setMessage("Sessão encerrada.");
      },
      "Falha ao sair.",
    );
  };

  /**
   * Entrar de novo depois de a sessão expirar, SEM recarregar o campeonato.
   *
   * A sessão é absoluta (12 h) e o 21/11 tem grade de 08:30 às 23:00: quem entrou de manhã
   * cai no 401 à noite, no meio de um lançamento. O `login` normal busca o dataset e
   * trocaria o rascunho pelo do servidor; este só renova a sessão, e a pessoa toca em
   * Salvar de novo.
   */
  const reentrar = () => {
    runTransitionTask(
      "login",
      async () => {
        clearAlerts();
        const { response, corpo } = await pedir("/api/admin/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        if (!response.ok) throw erroDaResposta(response, corpo, "Falha no login.");
        setPassword("");
        const renovada = await fetchSession();
        if (!renovada.authorized) throw new ApiError("Não autorizado.", 401);
        setSessaoExpirada(false);
        avisarSessaoMudou();
        setMessage("Sessão renovada. Seu rascunho continua aqui — toque em Salvar de novo.");
      },
      "Falha no login.",
    );
  };

  /**
   * A virada do draft e o calendário gravam o dataset pelo servidor. O rascunho aberto no
   * painel ficou para trás — e o próximo "Salvar" cairia em 409 ou, pior, mandaria os times
   * velhos de volta. Sem nada pendente, adota o do servidor; com trabalho não salvo, avisa
   * em vez de descartar sozinho.
   */
  const recarregarDepoisDoDraft = () => {
    if (temTrabalhoNaoSalvo) {
      // O rascunho fica, mas marcado como anterior à virada: no Salvar, o que ele mudou é
      // reaplicado sobre a versão nova, e um conflito NÃO oferece "salvar por cima".
      setRascunhoAnteriorAoDraft(true);
      setMessage(
        "O draft gravou no site. Você tem alterações não salvas aqui: ao salvar, elas são aplicadas sobre a versão nova — se alguma bater com o que o draft mudou, o painel avisa.",
      );
      return;
    }
    runTransitionTask(
      "recarregar",
      async () => {
        await fetchDataset();
        setConflito(null);
      },
      "O draft gravou no site, mas o rascunho não recarregou. Clique em Recarregar.",
    );
  };

  const reloadDataset = () => {
    if (!confirmarDescarte("Recarregar")) return;
    runTransitionTask(
      "recarregar",
      async () => {
        clearAlerts();
        await fetchDataset();
        setConflito(null);
        setMessage(
          session?.dataProvider === "supabase"
            ? "Rascunho recarregado do Supabase."
            : "Rascunho recarregado do arquivo local.",
        );
      },
      "Falha ao recarregar.",
    );
  };

  /**
   * Salva o rascunho. No 409 não devolve o problema para a pessoa: relê o servidor e
   * REAPLICA por cima da versão nova só o que este rascunho mudou (ver
   * components/admin/rebase-do-rascunho.ts). O aviso de conflito só aparece quando os dois
   * mexeram no mesmo campo.
   *
   * `porCima` é o "Salvar por cima assim mesmo" do aviso: nos campos em conflito vale o
   * deste rascunho — e SÓ neles. O resto do que a outra pessoa gravou fica. Não usa o
   * `force` do servidor, que mandaria o rascunho inteiro e desfaria o trabalho dela fora do
   * conflito; a gravação continua condicionada à versão que acabou de ser lida.
   */
  const saveDraft = (porCima = false) => {
    if (!draft || !baseline) return;
    // Capturados no clique: o que se digita com o PUT em voo NÃO é o que foi enviado, e
    // não pode ser trocado pela resposta (ver `adotarGravado`).
    const enviado = draft;
    const base = baseline;
    const versaoDoRascunho = versao;
    const anteriorAoDraft = rascunhoAnteriorAoDraft;

    /** O dataset gravado vira a baseline; no rascunho, as edições feitas depois do clique ficam. */
    const adotarGravado = (gravado: TournamentDataset, versaoGravada?: number) => {
      setBaseline(cloneDataset(gravado));
      if (typeof versaoGravada === "number") setVersao(versaoGravada);
      setDraft((atual) => {
        if (!atual || atual === enviado) return gravado;
        return rebasearRascunho(enviado, atual, gravado).dataset;
      });
      setRascunhoAnteriorAoDraft(false);
      setConflito(null);
    };

    /** O 409 que o rebase não resolve sozinho: vira o aviso, com o que a outra pessoa mudou. */
    const avisarConflito = (servidor: TournamentDataset, campos: string[]) => {
      setConflito({
        resumoDoServidor: resumirMudancasDoServidor(base, servidor),
        campos: campos.map((caminho) => descreverCaminho(caminho, servidor)),
        estrutural: anteriorAoDraft || mudancaEstrutural(base, servidor),
      });
    };

    const enviar = (dataset: TournamentDataset, versaoDoEnvio: number | null) =>
      pedir(
        "/api/admin/dataset",
        {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          // A versão vai junto: é o que o servidor confere ANTES do diff e o que ele
          // condiciona a gravação.
          body: JSON.stringify({ dataset: applyAutoGameMvpsToDataset(dataset), versao: versaoDoEnvio }),
        },
        SEM_CONEXAO_AO_SALVAR,
      );

    /** Relê o servidor; sem conseguir, o aviso de conflito sai sem detalhe (e o erro aparece). */
    const lerParaRebase = async () => {
      try {
        return await lerDoServidor();
      } catch (falha) {
        setConflito({ resumoDoServidor: [], campos: [], estrutural: anteriorAoDraft, semDetalhe: true });
        throw falha;
      }
    };

    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        let paraEnviar = enviado;
        let versaoDoEnvio = versaoDoRascunho;
        let reaplicado = false;

        if (porCima) {
          // Sempre sobre a versão MAIS NOVA: entre o aviso e o clique pode ter entrado outra.
          const servidor = await lerParaRebase();
          const rebase = rebasearRascunho(base, enviado, servidor.dataset);
          if (rebase.conflitos.length > 0 && (anteriorAoDraft || mudancaEstrutural(base, servidor.dataset))) {
            avisarConflito(servidor.dataset, rebase.conflitos);
            return;
          }
          if (rebase.jaSalvo) {
            adotarGravado(servidor.dataset, servidor.versao);
            setMessage("Suas alterações já estavam gravadas no servidor. Nada se perdeu.");
            return;
          }
          paraEnviar = rebase.dataset;
          versaoDoEnvio = servidor.versao ?? null;
          reaplicado = true;
        }

        // Poucas voltas: cada 409 relê e reaplica. Um servidor que muda sem parar vira aviso.
        for (let volta = 0; volta < 3; volta++) {
          const { response, corpo } = await enviar(paraEnviar, versaoDoEnvio);

          if (response.ok && corpo.dataset) {
            adotarGravado(corpo.dataset, corpo.versao);
            const standings = calculateStandings(corpo.dataset);
            const lider = `Líder atual: ${standings.rows[0]?.teamName ?? "—"} (${standings.rows[0]?.points ?? 0} pts).`;
            setMessage(
              reaplicado
                ? `${corpo.message || "Salvo com sucesso."} Outra pessoa tinha salvo antes: suas alterações foram aplicadas sobre a versão nova, sem desfazer as dela. ${lider}`
                : `${corpo.message || "Salvo com sucesso."} ${lider}`,
            );
            return;
          }

          if (response.status !== 409) throw erroDaResposta(response, corpo, "Falha ao salvar.");

          // 409: alguém gravou no meio. Relê e reaplica SÓ o que este rascunho mudou.
          const servidor = await lerParaRebase();
          const rebase = rebasearRascunho(base, enviado, servidor.dataset);
          if (rebase.jaSalvo) {
            // Tudo o que o rascunho mudou já está lá: em geral, o Salvar anterior gravou e
            // só a resposta se perdeu na rede. Não houve "outra pessoa".
            adotarGravado(servidor.dataset, servidor.versao);
            setMessage("Suas alterações já estavam gravadas no servidor (a resposta anterior não chegou). Nada se perdeu.");
            return;
          }
          if (rebase.conflitos.length > 0 && !porCima) {
            avisarConflito(servidor.dataset, rebase.conflitos);
            return;
          }
          if (rebase.conflitos.length > 0 && (anteriorAoDraft || mudancaEstrutural(base, servidor.dataset))) {
            avisarConflito(servidor.dataset, rebase.conflitos);
            return;
          }
          paraEnviar = rebase.dataset;
          versaoDoEnvio = servidor.versao ?? null;
          reaplicado = true;
        }

        throw new ApiError(
          "O campeonato recebeu outras gravações seguidas enquanto você salvava. Seu rascunho continua aqui — tente de novo em instantes.",
          409,
        );
      },
      "Falha ao salvar os dados do campeonato.",
    );
  };

  /**
   * #29: exportar era um <a href> de navegação. Se o servidor respondesse erro (ou 403), o
   * navegador SAÍA do painel e o rascunho ia junto. Agora o arquivo vem por fetch e desce
   * como blob, sem tirar ninguém da página.
   */
  const exportarBackup = () => {
    runTransitionTask(
      "exportar",
      async () => {
        clearAlerts();
        let response: Response;
        try {
          response = await fetch("/api/admin/export", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
          });
        } catch (falha) {
          if (falha instanceof TypeError) throw new ApiError(SEM_CONEXAO, 0);
          throw falha;
        }
        if (!response.ok) {
          const corpo = (await response.json().catch(() => ({}))) as DatasetResponse;
          throw erroDaResposta(response, corpo, "Falha ao exportar o backup.");
        }
        const nome = await baixarBackupDoServidor(response);
        setMessage(`Backup baixado: ${nome}`);
      },
      "Falha ao exportar o backup.",
    );
  };

  const importJsonFile = async (file: File) => {
    clearAlerts();
    const form = new FormData();
    form.append("file", file);
    const { response, corpo: data } = await pedir("/api/admin/import", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    if (!response.ok || !data.dataset) {
      throw erroDaResposta(response, data, "Falha ao importar arquivo.");
    }
    adotarDatasetDoServidor(data.dataset, data.versao);
    setConflito(null);
    setMessage(data.message || "Importação concluída.");
  };

  const importJsonText = async (text: string) => {
    clearAlerts();
    const form = new FormData();
    form.append("text", text);
    const { response, corpo: data } = await pedir("/api/admin/import", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    if (!response.ok || !data.dataset) {
      throw erroDaResposta(response, data, "Falha ao importar texto.");
    }
    adotarDatasetDoServidor(data.dataset, data.versao);
    setConflito(null);
    setMessage(data.message || "Importação concluída.");
  };

  /**
   * Encerrar a temporada — e, com ela JÁ encerrada, a ação explícita de refazer o retrato
   * arquivado (a final corrigida depois do encerramento precisa chegar ao arquivo). É a
   * mesma rota: o servidor responde `refeito: true` nesse caso.
   */
  const endTournament = () => {
    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        const { response, corpo: data } = await pedir("/api/admin/tournament/end", {
          method: "POST",
          credentials: "same-origin",
        });
        if (!response.ok || !data.dataset) {
          throw erroDaResposta(response, data, "Falha ao encerrar a temporada.");
        }
        adotarDatasetDoServidor(data.dataset, data.versao);
        setConflito(null);
        setMessage(data.message || (data.refeito ? "Retrato arquivado atualizado." : "Temporada encerrada."));
      },
      "Falha ao encerrar a temporada.",
    );
  };

  const startTournament = (payload: StartTournamentPayload) => {
    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        const { response, corpo: data } = await pedir("/api/admin/tournament/start", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirm: true }),
        });
        if (!response.ok || !data.dataset) {
          throw erroDaResposta(response, data, "Falha ao iniciar a temporada.");
        }
        adotarDatasetDoServidor(data.dataset, data.versao);
        setConflito(null);
        setActiveTab("overview");
        setMessage(data.message || "Nova temporada iniciada.");
      },
      "Falha ao iniciar a temporada.",
    );
  };

  const isSupabaseProvider = session?.dataProvider === "supabase";
  const isBusy = isPending || isImporting;

  const handleImportFile = async (file: File) => {
    clearAlerts();
    setIsImporting(true);
    try {
      await importJsonFile(file);
    } catch (importError) {
      registrarErro(importError, "Falha ao importar.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportText = async (text: string) => {
    clearAlerts();
    setIsImporting(true);
    try {
      await importJsonText(text);
    } catch (importError) {
      registrarErro(importError, "Falha ao importar.");
    } finally {
      setIsImporting(false);
    }
  };

  // ------------------------------------------------------------ seções do trilho

  const secoes = useMemo<Secao[]>(() => {
    const lista: Secao[] = [
      { value: "overview", label: "Visão geral", grupo: "Campeonato", escopos: [] },
      {
        value: "tournament",
        label: "Torneio",
        grupo: "Campeonato",
        nota: draft?.tournament.status === "finished" ? "encerrada" : "ativa",
        escopos: ["tournament:lifecycle"],
      },
      {
        value: "teams",
        label: "Times",
        grupo: "Cadastro",
        contagem: draft?.teams.length,
        escopos: ["teams:write"],
      },
      {
        value: "players",
        label: "Jogadores",
        grupo: "Cadastro",
        contagem: draft?.players.length,
        escopos: ["players:write"],
      },
      {
        value: "series",
        label: "Séries",
        grupo: "Competição",
        contagem: draft?.seriesMatches.length,
        escopos: ["series:manage", "results:write", "series:cards", "series:sides"],
      },
      {
        value: "backup",
        label: "Importar/Exportar",
        grupo: "Administração",
        escopos: ["dataset:export", "dataset:import"],
      },
      // 4ª Edição. Ficam num grupo próprio porque não são o campeonato que está no ar
      // — são a inscrição do próximo, que roda em paralelo com a temporada corrente.
      {
        value: "e4-inscritos",
        label: "Inscritos",
        grupo: "4ª Edição",
        escopos: ["inscricoes:conferir"],
      },
      {
        value: "e4-pagamentos",
        label: "Pagamentos",
        grupo: "4ª Edição",
        escopos: ["inscricoes:financeiro"],
      },
      {
        value: "e4-times",
        label: "Times e vagas",
        grupo: "4ª Edição",
        escopos: ["inscricoes:conferir"],
      },
      {
        value: "e4-draft",
        label: "Draft ao vivo",
        grupo: "4ª Edição",
        escopos: ["draft:conduzir"],
      },
      {
        value: "e4-config",
        label: "Configuração",
        grupo: "4ª Edição",
        nota: "abre inscrições",
        escopos: ["edicao:configurar"],
      },
    ];
    // Aba de usuários só para o master (a decisão real é sempre do servidor).
    if (session?.user?.isMaster) {
      lista.push({
        value: "users",
        label: "Usuários",
        grupo: "Administração",
        escopos: ["users:manage"],
      });
    }
    return lista;
  }, [draft, session?.user?.isMaster]);

  const grupos = useMemo(() => {
    const mapa = new Map<string, Secao[]>();
    for (const secao of secoes) {
      const atual = mapa.get(secao.grupo) ?? [];
      atual.push(secao);
      mapa.set(secao.grupo, atual);
    }
    return [...mapa.entries()];
  }, [secoes]);

  const secaoAtiva = secoes.find((secao) => secao.value === activeTab) ?? secoes[0];
  const escoposDaSecaoAtiva = secaoAtiva?.escopos ?? [];
  const secaoAtivaAlcancada = alcanca(escoposDaSecaoAtiva);
  const escoposFaltantesDaSecao = identity
    ? escoposDaSecaoAtiva.filter((escopo) => !hasScope(identity, escopo))
    : [];

  const motivoBloqueio = (secao: Secao) =>
    `Você não tem permissão para: ${secao.escopos.map(scopeLabel).join(", ")}. A seção abre em modo de leitura.`;

  // ------------------------------------------------------------ telas de exceção

  if (bootError && (!session || (session.authorized && !draft))) {
    /*
     * "A linha não existe" tem conserto, e o conserto precisa estar NESTA tela.
     *
     * A semeadura (`POST /api/admin/dataset/seed`) sempre existiu, mas não havia como
     * chegar nela: o painel não abre sem dataset, e a importação vive numa aba do painel.
     * A pessoa ficava num cartão de erro com um "Tentar de novo" que falharia para
     * sempre — e a própria mensagem do servidor mandava "use a semeadura no painel".
     */
    const faltaODataset = bootCode === "DATASET_MISSING";
    const podeSemear = !identity || hasScope(identity, "dataset:import");

    const semear = () => {
      setSemeando(true);
      void (async () => {
        try {
          const { response: resposta, corpo: dados } = await pedir("/api/admin/dataset/seed", {
            method: "POST",
            credentials: "same-origin",
          });
          if (!resposta.ok || !dados.dataset) {
            throw erroDaResposta(resposta, dados, "Falha ao semear o banco.");
          }
          setBootError(null);
          setBootCode(null);
          carregarPainel();
        } catch (falha) {
          setBootError(getErrorMessage(falha, "Falha ao semear o banco."));
        } finally {
          setSemeando(false);
        }
      })();
    };

    return (
      <Card padding="26px 24px">
        <Banner
          tone={faltaODataset ? "warn" : "danger"}
          title={faltaODataset ? "Este banco ainda não tem o campeonato" : "Não foi possível abrir o painel"}
        >
          {bootError}
          {faltaODataset && !podeSemear ? (
            <>
              <br />
              Semear exige a permissão de importar dados — peça ao responsável pelo campeonato.
            </>
          ) : null}
        </Banner>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button tone="gold" onClick={carregarPainel} disabled={isPending || semeando}>
            {isPending ? "Tentando..." : "Tentar de novo"}
          </Button>
          {faltaODataset && podeSemear ? (
            <Button onClick={semear} disabled={semeando || isPending}>
              {semeando ? "Semeando..." : "Semear a partir do arquivo do repositório"}
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card padding="26px 24px">
        <p style={{ margin: 0, fontSize: 13, color: C.ink3 }}>Carregando sessão do admin...</p>
      </Card>
    );
  }

  if (!session.configured) {
    return (
      <Card padding="26px 24px">
        <h3 style={{ fontFamily: display, fontSize: 20, color: C.ink, margin: "0 0 8px" }}>
          ADMIN_PASSWORD ausente
        </h3>
        <p style={{ margin: 0, fontSize: 13, color: C.ink3 }}>
          Configure <code>ADMIN_PASSWORD</code> no <code>.env.local</code> para liberar o painel
          admin.
        </p>
      </Card>
    );
  }

  if (!session.authorized) {
    return (
      <AdminLoginCard
        error={error}
        esperaSegundos={esperaSegundos}
        message={message}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        onLogin={login}
        isBusy={isBusy}
        entrando={tarefa === "login"}
        authMode={session.authMode ?? "legacy"}
      />
    );
  }

  if (!draft) {
    return (
      <Card padding="26px 24px">
        <p style={{ margin: 0, fontSize: 13, color: C.ink3 }}>Carregando dados do campeonato...</p>
      </Card>
    );
  }

  // ------------------------------------------------------------ barra de comando

  const resumo = resumirMudancas(changes);

  // Só a VIRADA de estado é anunciada. Se a contagem inteira fosse região viva, o leitor de
  // tela falaria a cada tecla digitada num campo. Existe uma vez só, nos dois arranjos.
  const anuncioDoRascunho = (
    <span
      role="status"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        overflow: "hidden",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      }}
    >
      {sujo ? "Rascunho com alterações não salvas." : "Rascunho salvo."}
    </span>
  );

  const chipDoRascunho = sujo ? (
    <Chip tone="warn" title={resumo.join(" · ")}>
      {changes.length === 1 ? "1 alteração não salva" : `${changes.length} alterações não salvas`}
    </Chip>
  ) : (
    <Chip tone="ok">Tudo salvo</Chip>
  );

  const chipSemPermissao =
    escoposPendentesSemPermissao.length > 0 ? (
      <Chip tone="danger" title={`Sem permissão para: ${escoposPendentesSemPermissao.map(scopeLabel).join(", ")}`}>
        sem permissão para parte das mudanças
      </Chip>
    ) : null;

  const barra = (
    <div
      ref={setBarraEl}
      style={{
        position: "sticky",
        // Logo abaixo do cabeçalho do site, que também é fixo. Com `top: 0` a barra parava
        // atrás dele e sumia assim que a página rolava.
        top: alturaDoCabecalho,
        // 30, abaixo do cabeçalho do site (40). Estavam empatadas em 40, e o empate
        // se resolvia pela ordem do DOM: esta barra vinha depois e cobria o menu da
        // conta. Ver a escala em components/site-frame.tsx.
        zIndex: 30,
        marginBottom: 14,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        background: "linear-gradient(180deg, #17110a, #100b06)",
        border: `1px solid ${C.line}`,
        borderRadius: 4,
        boxShadow: "0 10px 26px rgba(0,0,0,.45)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
        <MarcaLB size={34} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: display, fontSize: 15, lineHeight: 1.1, color: C.ink }}>
            Painel da organização
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".14em",
              textTransform: "uppercase",
              color: C.bronze,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {draft.tournament.name}
          </div>
        </div>
      </div>

      {/* Estado do rascunho: a peça central. Antes NADA indicava alteração pendente. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
        {anuncioDoRascunho}
        {chipDoRascunho}
        {sujo ? <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>{resumo.slice(0, 3).join(" · ")}</span> : null}
        {chipSemPermissao}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {/* Sem a arrow, o evento do clique chegaria como `force` e a trava de
            concorrência ficaria sempre desligada. */}
        <Button
          tone="gold"
          small
          onClick={() => saveDraft()}
          disabled={isBusy || !sujo}
          title={sujo ? undefined : "Não há alterações para salvar."}
        >
          <Save size={14} aria-hidden />
          {getSaveButtonLabel(tarefa === "salvar", isSupabaseProvider)}
        </Button>
        <Button small onClick={reloadDataset} disabled={isBusy}>
          <RefreshCcw size={14} aria-hidden />
          {getReloadButtonLabel(tarefa === "recarregar", isSupabaseProvider)}
        </Button>
        {alcanca(["dataset:export"]) ? (
          <Button small onClick={exportarBackup} disabled={isBusy} title="Baixa o JSON do campeonato">
            <Download size={14} aria-hidden />
            {tarefa === "exportar" ? "Baixando..." : "Exportar"}
          </Button>
        ) : null}
        <Button small onClick={logout} disabled={isBusy}>
          <LogOut size={14} aria-hidden />
          {tarefa === "sair" ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </div>
  );

  // ------------------------------------------------------------ trilho

  const trilho = grupos.map(([nomeDoGrupo, itensDoGrupo]) => (
    <div key={nomeDoGrupo} style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 9.5,
          letterSpacing: ".2em",
          textTransform: "uppercase",
          color: C.ink4,
          padding: "0 0 6px 10px",
          whiteSpace: "nowrap",
        }}
      >
        {nomeDoGrupo}
      </div>
      {itensDoGrupo.map((secao) => (
        <ItemTrilho
          key={secao.value}
          secao={secao}
          ativo={activeTab === secao.value}
          alcanca={alcanca(secao.escopos)}
          motivoBloqueio={motivoBloqueio(secao)}
          onClick={() => trocarDeSecao(secao.value)}
        />
      ))}
    </div>
  ));

  const cartaoDaConta = session.user ? (
    <Card padding="12px 12px 13px" style={{ marginTop: compacto ? 0 : 6 }}>
      <div style={{ fontSize: 9.5, letterSpacing: ".18em", textTransform: "uppercase", color: C.ink4 }}>
        Conectado como
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.ink, marginTop: 5 }}>
        {session.user.displayName}
      </div>
      <div style={{ fontSize: 11, color: C.ink4, marginBottom: 9 }}>@{session.user.username}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {session.user.isMaster ? (
          <Chip tone="gold">MASTER · acesso total</Chip>
        ) : (
          // #17: mostrar TODAS as permissões, com as que faltam apagadas. Assim a pessoa
          // sabe o que não alcança antes de esbarrar num 403 no fim do trabalho.
          SCOPES.filter((escopo) => !escopo.masterOnly).map((escopo) => {
            const tem = hasScope(identity, escopo.key);
            return (
              <Chip
                key={escopo.key}
                tone={tem ? "neutro" : "off"}
                title={tem ? escopo.label : `Você não tem: ${escopo.label}`}
              >
                {escopo.label}
              </Chip>
            );
          })
        )}
        {session.user.legacy ? <Chip tone="warn">modo de transição</Chip> : null}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: 10.5, lineHeight: 1.55, color: C.ink4 }}>
        Persistência:{" "}
        <span style={{ color: C.ink3 }}>{session.dataProviderLabel ?? "Arquivo local (JSON)"}</span>.
        Alterações ficam no rascunho até você salvar.
      </p>

      {/*
        Fica aqui, no cartão da conta, porque é o único lugar do painel que fala da
        PESSOA e não do campeonato. No modo de transição não aparece: lá a "conta" é
        uma senha única do ambiente, e não há o que trocar por dentro do site.
      */}
      {session.user.legacy ? null : (
        <TrocarSenha
          obrigatoria={session.user.mustChangePassword}
          onTrocada={() => void fetchSession()}
        />
      )}
    </Card>
  ) : null;

  const conteudo = (
    <div>
      <Alertas
        erro={error}
        faltando={faltando}
        esperaSegundos={esperaSegundos}
        mensagem={message}
      />

      {sessaoExpirada ? (
        <Banner tone="warn" title="Sua sessão expirou — o rascunho continua aqui">
          <p style={{ margin: "0 0 10px" }}>
            Entre de novo para salvar. Nada do que você digitou foi perdido, e entrar aqui não
            recarrega o campeonato.
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (password && !isBusy) reentrar();
            }}
            style={{ display: "grid", gap: 10, maxWidth: 360 }}
          >
            {session.authMode === "accounts" ? (
              <Field label="Usuário">
                <Input value={username} onChange={setUsername} autoComplete="username" disabled={isBusy} />
              </Field>
            ) : null}
            <Field label="Senha">
              <Input
                type="password"
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                placeholder="sua senha"
                disabled={isBusy}
              />
            </Field>
            <div>
              <Button type="submit" tone="gold" small disabled={isBusy || !password}>
                <KeyRound size={14} aria-hidden />
                {tarefa === "login" ? "Entrando..." : "Entrar de novo"}
              </Button>
            </div>
          </form>
        </Banner>
      ) : null}

      {session.user?.mustChangePassword && !session.user.legacy ? (
        <Banner
          tone="warn"
          title="Troque a senha provisória antes de salvar"
          actions={
            compacto ? (
              <Button small onClick={() => setSeletorAberto(true)}>
                <KeyRound size={14} aria-hidden />
                Trocar a senha agora
              </Button>
            ) : undefined
          }
        >
          O servidor recusa qualquer gravação desta conta até a senha provisória ser trocada.{" "}
          {compacto
            ? "O formulário fica na folha de seções, junto da sua conta."
            : "O formulário fica no cartão da sua conta, à esquerda."}
        </Banner>
      ) : null}

      {conflito ? (
        <Banner
          tone="warn"
          title="Alguém salvou antes de você"
          actions={
            <>
              <Button onClick={reloadDataset} disabled={isBusy}>
                <RefreshCcw size={14} aria-hidden />
                Trazer a versão nova (descarta seu rascunho)
              </Button>
              {conflito.estrutural ? null : (
                <Button tone="danger" onClick={() => saveDraft(true)} disabled={isBusy}>
                  <Save size={14} aria-hidden />
                  Salvar por cima assim mesmo
                </Button>
              )}
            </>
          }
        >
          {conflito.semDetalhe ? (
            <p style={{ margin: 0 }}>
              Outra pessoa gravou alterações enquanto este rascunho estava aberto, e não deu para
              ler a versão nova agora. Seu rascunho continua aqui — escolha o que fazer.
            </p>
          ) : (
            <>
              <p style={{ margin: "0 0 6px" }}>
                Outra pessoa gravou alterações enquanto este rascunho estava aberto
                {conflito.resumoDoServidor.length > 0 ? (
                  <>
                    : <strong style={{ color: C.ink }}>{conflito.resumoDoServidor.join(", ")}</strong>
                  </>
                ) : null}
                . O que não bate com o seu rascunho já foi juntado sozinho; sobrou o que vocês dois
                mudaram:
              </p>
              <ul style={{ margin: "0 0 6px", paddingLeft: 18 }}>
                {conflito.campos.slice(0, 6).map((campo) => (
                  <li key={campo}>{campo}</li>
                ))}
                {conflito.campos.length > 6 ? <li>+ {conflito.campos.length - 6} outro(s)</li> : null}
              </ul>
              {conflito.estrutural ? (
                <p style={{ margin: 0 }}>
                  A versão nova cria ou apaga times, jogadores ou séries (a virada do draft, por
                  exemplo) ou mudou o estado da temporada. Salvar por cima desfaria isso, então essa
                  opção não aparece: traga a versão nova e refaça só o que está listado acima.
                </p>
              ) : (
                <p style={{ margin: 0 }}>
                  “Salvar por cima” grava a sua versão SÓ nesses campos; o resto do que a outra pessoa
                  salvou continua.
                </p>
              )}
            </>
          )}
        </Banner>
      ) : null}

      {!secaoAtivaAlcancada && escoposFaltantesDaSecao.length > 0 ? (
        <Banner tone="warn" title="Seção em modo de leitura">
          Falta a permissão{" "}
          <strong style={{ color: C.ink }}>
            {escoposFaltantesDaSecao.map(scopeLabel).join(", ")}
          </strong>
          . Você pode olhar, mas o servidor vai recusar qualquer alteração daqui.
        </Banner>
      ) : null}

      <section role="region" aria-label={secaoAtiva?.label ?? "Conteúdo do painel"}>
        {/* O selo da seção vai por contexto: o cabeçalho de cada seção o desenha sozinho. */}
        <ContextoIconeDaSecao.Provider value={ICONE_DA_SECAO[activeTab]}>
          <AdminTabContent
            aplicarDoServidor={aplicarDoServidor}
            seriesGravadas={baseline?.seriesMatches ?? draft.seriesMatches}
            podeLados={alcanca(["series:sides"])}
            podeCartas={alcanca(["series:cards"])}
            podeRiot={alcanca(["riot:import"])}
            podeImportar={alcanca(["dataset:import"])}
            onVersaoDoServidor={sincronizarVersaoDoServidor}
            onFormularioSujo={setFormularioSujo}
            podeConferir={alcanca(["inscricoes:conferir"])}
            podeFinanceiro={alcanca(["inscricoes:financeiro"])}
            podeConfigurar={alcanca(["edicao:configurar"])}
            podeConduzirDraft={alcanca(["draft:conduzir"])}
            // `users:manage` é masterOnly: `hasScope` só o dá à master.
            podeRedefinirSenha={alcanca(["users:manage"])}
            onDatasetMudouNoServidor={recarregarDepoisDoDraft}
            activeTab={activeTab}
            draft={draft}
            mutateDraft={mutateDraft}
            isBusy={isBusy}
            onImportFile={handleImportFile}
            onImportText={handleImportText}
            onEndTournament={endTournament}
            onStartTournament={startTournament}
            onAlert={(kind, text) => {
              clearAlerts();
              if (kind === "ok") setMessage(text);
              else setError(text);
            }}
          />
        </ContextoIconeDaSecao.Provider>
      </section>
    </div>
  );

  // ------------------------------------------------------------ celular

  if (compacto) {
    /** Ações raras, no fim da folha de seções. Fecham a folha antes: podem pedir confirmação. */
    const acoesDaConta = (
      <>
        <Button
          small
          disabled={isBusy}
          onClick={() => {
            setSeletorAberto(false);
            reloadDataset();
          }}
        >
          <RefreshCcw size={14} aria-hidden />
          {getReloadButtonLabel(tarefa === "recarregar", isSupabaseProvider)}
        </Button>
        {alcanca(["dataset:export"]) ? (
          <Button small onClick={exportarBackup} disabled={isBusy} title="Baixa o JSON do campeonato">
            <Download size={14} aria-hidden />
            {tarefa === "exportar" ? "Baixando..." : "Exportar"}
          </Button>
        ) : null}
        <Button
          small
          disabled={isBusy}
          onClick={() => {
            setSeletorAberto(false);
            logout();
          }}
        >
          <LogOut size={14} aria-hidden />
          {tarefa === "sair" ? "Saindo..." : "Sair"}
        </Button>
      </>
    );

    return (
      <div>
        {/* Cabeçalho do painel no celular: rola junto com a página. Fixos, só o cabeçalho
            do site em cima e a doca embaixo — três barras presas comiam um terço da tela. */}
        <div
          style={{
            marginBottom: 14,
            padding: "12px 14px",
            background: "linear-gradient(180deg, #17110a, #100b06)",
            border: `1px solid ${C.line}`,
            borderRadius: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <MarcaLB size={38} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: display, fontSize: 16, lineHeight: 1.1, color: C.ink }}>
                Painel da organização
              </div>
              <div
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: C.bronze,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {draft.tournament.name}
              </div>
            </div>
            {anuncioDoRascunho}
            {chipDoRascunho}
          </div>
          {sujo ? (
            <p style={{ margin: "9px 0 0", fontSize: 11.5, lineHeight: 1.5, color: C.ink3, ...tabular }}>
              {resumo.slice(0, 3).join(" · ")}
            </p>
          ) : null}
          {chipSemPermissao ? <div style={{ marginTop: 8 }}>{chipSemPermissao}</div> : null}
        </div>

        {conteudo}

        <DocaCompacta
          secao={secaoAtiva}
          sujo={sujo}
          totalMudancas={changes.length}
          salvando={tarefa === "salvar"}
          isBusy={isBusy}
          seletorAberto={seletorAberto}
          onAbrirSecoes={() => setSeletorAberto(true)}
          onSalvar={() => saveDraft()}
        />

        <SeletorDeSecoes
          aberto={seletorAberto}
          onFechar={() => setSeletorAberto(false)}
          grupos={grupos}
          ativa={activeTab}
          alcanca={alcanca}
          onEscolher={(destino) => {
            if (!trocarDeSecao(destino)) return;
            setSeletorAberto(false);
            // Depois que a folha solta a rolagem do <body>.
            requestAnimationFrame(() => window.scrollTo({ top: 0 }));
          }}
          conta={cartaoDaConta}
          acoes={acoesDaConta}
        />

        {mostrarAviso && textoDoAviso ? (
          <AvisoFlutuante
            tom={tomDoAviso}
            texto={textoDoAviso}
            onTocar={() => {
              setAvisoDispensado(textoDoAviso);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : null}
      </div>
    );
  }

  // ------------------------------------------------------------ monitor

  const topoDoTrilho = Math.round(alturaDoCabecalho + alturaDaBarra + 14);

  return (
    <div>
      {barra}
      {/* 236px: o desenho de cada seção ocupa mais que o losango de antes, e com 216 o
          rótulo "Configuração" era cortado pela nota ao lado. */}
      <div style={{ display: "grid", gridTemplateColumns: "236px 1fr", gap: 22, alignItems: "start" }}>
        {/* O trilho acompanha a rolagem logo abaixo da barra. Num monitor baixo ele é mais
            alto que a janela — então rola por dentro, em vez de cortar a conta lá embaixo. */}
        <div
          style={{
            position: "sticky",
            top: topoDoTrilho,
            maxHeight: `calc(100vh - ${topoDoTrilho + 12}px)`,
            overflowY: "auto",
            overscrollBehavior: "contain",
            scrollbarWidth: "thin",
            scrollbarColor: `${C.line2} transparent`,
            paddingBottom: 4,
          }}
        >
          <nav aria-label="Seções do painel">{trilho}</nav>
          {cartaoDaConta}
        </div>
        <div style={{ minWidth: 0 }}>{conteudo}</div>
      </div>
    </div>
  );
}
