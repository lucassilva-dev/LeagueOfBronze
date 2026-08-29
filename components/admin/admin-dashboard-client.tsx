"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { Download, LogOut, RefreshCcw, Save } from "lucide-react";

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
import { SecaoInscritos } from "@/components/admin/e4/secao-inscritos";
import { SecaoPagamentos } from "@/components/admin/e4/secao-pagamentos";
import { SecaoTimes } from "@/components/admin/e4/secao-times";
import {
  Banner,
  Button,
  C,
  Card,
  Chip,
  Field,
  Input,
  ScrollX,
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
};

type MessageResponse = {
  ok?: boolean;
  error?: string;
};

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
  /** Acompanha a versão da linha quando uma rota grava por fora do editor. */
  onVersaoDoServidor: (versaoLida?: number, versaoGravada?: number) => void;
  /** Formulário de Times/Jogadores preenchido e ainda não aplicado ao rascunho. */
  onFormularioSujo: (sujo: boolean) => void;
  /** Escopos da 4ª Edição, para a seção mostrar em leitura em vez de oferecer um 403. */
  podeConferir: boolean;
  podeFinanceiro: boolean;
  podeConfigurar: boolean;
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

/** Marca da organização: losango bronze com "LB" — o mesmo losango do site público. */
function MarcaLB({ size = 44 }: Readonly<{ size?: number }>) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(45deg)",
        background: `linear-gradient(150deg, ${C.bronzeHi}, ${C.bronzeDeep})`,
        borderRadius: 3,
      }}
    >
      <span
        style={{
          transform: "rotate(-45deg)",
          fontFamily: display,
          fontSize: size * 0.4,
          letterSpacing: ".04em",
          color: "#160f06",
        }}
      >
        LB
      </span>
    </span>
  );
}

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
          League of Bronze · 3ª Edição
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
  horizontal: boolean;
  onClick: () => void;
}>;

function ItemTrilho({ secao, ativo, alcanca, motivoBloqueio, horizontal, onClick }: ItemTrilhoProps) {
  const marcaAtiva: CSSProperties = horizontal
    ? { borderBottom: `2px solid ${ativo ? C.bronzeHi : "transparent"}` }
    : { borderLeft: `2px solid ${ativo ? C.bronzeHi : "transparent"}` };

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
        gap: 8,
        width: horizontal ? "auto" : "100%",
        whiteSpace: "nowrap",
        padding: horizontal ? "9px 12px" : "9px 10px",
        background: ativo ? "rgba(201,138,75,.12)" : "transparent",
        color: ativo ? C.ink : C.ink3,
        border: "1px solid transparent",
        borderRadius: 3,
        fontFamily: "inherit",
        fontSize: 12.5,
        fontWeight: ativo ? 700 : 500,
        letterSpacing: ".02em",
        textAlign: "left",
        cursor: "pointer",
        opacity: alcanca ? 1 : 0.45,
        ...marcaAtiva,
      }}
    >
      {/* Losango: a seção ativa não se distingue só pela cor. */}
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          flexShrink: 0,
          transform: "rotate(45deg)",
          background: ativo ? C.bronzeHi : "transparent",
          border: ativo ? "none" : `1px solid ${C.line2}`,
        }}
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
      {alcanca ? null : (
        <span aria-hidden style={{ fontSize: 10.5, color: C.ink4 }}>
          ○
        </span>
      )}
    </button>
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
  onVersaoDoServidor,
  onFormularioSujo,
  podeConferir,
  podeFinanceiro,
  podeConfigurar,
}: AdminTabContentProps) {
  if (activeTab === "users") return <AdminUsersPanel onAlert={onAlert} />;

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
        />
      );
    case "backup":
      return (
        <AdminBackupPanel
          importing={isBusy}
          onImportFile={onImportFile}
          onImportText={onImportText}
        />
      );
    default:
      return null;
  }
}

// ================================================================ painel

export function AdminDashboardClient() {
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
  /** Alguém gravou por cima enquanto este rascunho estava aberto (resposta 409). */
  const [conflict, setConflict] = useState(false);
  const [estreito, setEstreito] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Abaixo de 900px o trilho vira faixa horizontal (mesmo padrão do main-nav do site).
  useEffect(() => {
    const aoRedimensionar = () => setEstreito(window.innerWidth < 900);
    aoRedimensionar();
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
    setFaltando([]);
    setEsperaSegundos(null);
  };

  const registrarErro = (erro: unknown, fallback: string) => {
    setMessage(null);
    if (erro instanceof ApiError) {
      setError(erro.message);
      setFaltando(erro.status === 403 ? erro.missing : []);
      setEsperaSegundos(erro.retryAfterSeconds);
      return;
    }
    setError(getErrorMessage(erro, fallback));
    setFaltando([]);
    setEsperaSegundos(null);
  };

  const fetchSession = async () => {
    const response = await fetch("/api/admin/session", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json()) as SessionResponse;
    setSession(data);
    return data;
  };

  /** Toda vez que o servidor devolve o dataset ele vira rascunho E referência de comparação. */
  const adotarDatasetDoServidor = (dataset: TournamentDataset, versaoDoServidor?: number) => {
    setDraft(dataset);
    setBaseline(cloneDataset(dataset));
    if (typeof versaoDoServidor === "number") setVersao(versaoDoServidor);
  };

  const fetchDataset = async () => {
    const response = await fetch("/api/admin/dataset", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json()) as DatasetResponse;
    if (!response.ok || !data.dataset) {
      throw erroDaResposta(response, data, "Falha ao carregar os dados do campeonato.");
    }
    adotarDatasetDoServidor(data.dataset, data.versao);
    return data.dataset;
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
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [temTrabalhoNaoSalvo]);

  /**
   * Troca de seção pedindo confirmação quando há ficha preenchida e não aplicada.
   *
   * Este é o caminho MAIS provável de perder o trabalho — mais que fechar a aba ou sair:
   * a pessoa preenche a ficha de um jogador, lembra de conferir outra coisa, clica noutra
   * seção e o formulário some. `beforeunload` não cobre navegação interna, e o `sujo` do
   * rascunho não enxerga a ficha.
   */
  const trocarDeSecao = (destino: AdminTab) => {
    if (destino === activeTab) return;
    if (formularioSujo) {
      const seguir = window.confirm(
        "Você preencheu uma ficha e ainda não aplicou ao rascunho. Trocar de seção vai descartá-la. Continuar?",
      );
      if (!seguir) return;
    }
    setActiveTab(destino);
  };

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
        const response = await fetch("/api/admin/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = (await response.json()) as MessageResponse;
        if (!response.ok) {
          throw erroDaResposta(response, data, "Falha no login.");
        }
        setPassword("");
        await fetchSession();
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
        await fetch("/api/admin/logout", {
          method: "POST",
          credentials: "same-origin",
        });
        avisarSessaoMudou();
        setDraft(null);
        setBaseline(null);
        setVersao(null);
        setConflict(false);
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

  const reloadDataset = () => {
    if (!confirmarDescarte("Recarregar")) return;
    runTransitionTask(
      "recarregar",
      async () => {
        clearAlerts();
        await fetchDataset();
        setConflict(false);
        setMessage(
          session?.dataProvider === "supabase"
            ? "Rascunho recarregado do Supabase."
            : "Rascunho recarregado do arquivo local.",
        );
      },
      "Falha ao recarregar.",
    );
  };

  const saveDraft = (force = false) => {
    if (!draft) return;
    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        const datasetToSave = applyAutoGameMvpsToDataset(draft);
        const response = await fetch("/api/admin/dataset", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          // A versão vai junto: é o que o servidor confere ANTES do diff e o que ele
          // condiciona a gravação. Com `force` ela é ignorada de propósito.
          body: JSON.stringify({ dataset: datasetToSave, force, versao }),
        });
        const data = (await response.json()) as DatasetResponse;

        // 409: outra pessoa gravou enquanto este rascunho estava aberto. O rascunho NÃO é
        // descartado — quem está editando decide entre recarregar ou sobrescrever.
        if (response.status === 409) {
          setConflict(true);
          throw erroDaResposta(
            response,
            data,
            "Outra pessoa salvou alterações enquanto você editava.",
          );
        }

        if (!response.ok || !data.dataset) {
          throw erroDaResposta(response, data, "Falha ao salvar.");
        }
        setConflict(false);
        adotarDatasetDoServidor(data.dataset, data.versao);
        const standings = calculateStandings(data.dataset);
        setMessage(
          `${data.message || "Salvo com sucesso."} Líder atual: ${
            standings.rows[0]?.teamName ?? "—"
          } (${standings.rows[0]?.points ?? 0} pts).`,
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
        const response = await fetch("/api/admin/export", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
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
    const response = await fetch("/api/admin/import", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    const data = (await response.json()) as DatasetResponse;
    if (!response.ok || !data.dataset) {
      throw erroDaResposta(response, data, "Falha ao importar arquivo.");
    }
    adotarDatasetDoServidor(data.dataset, data.versao);
    setMessage(data.message || "Importação concluída.");
  };

  const importJsonText = async (text: string) => {
    clearAlerts();
    const form = new FormData();
    form.append("text", text);
    const response = await fetch("/api/admin/import", {
      method: "POST",
      credentials: "same-origin",
      body: form,
    });
    const data = (await response.json()) as DatasetResponse;
    if (!response.ok || !data.dataset) {
      throw erroDaResposta(response, data, "Falha ao importar texto.");
    }
    adotarDatasetDoServidor(data.dataset, data.versao);
    setMessage(data.message || "Importação concluída.");
  };

  const endTournament = () => {
    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        const response = await fetch("/api/admin/tournament/end", {
          method: "POST",
          credentials: "same-origin",
        });
        const data = (await response.json()) as DatasetResponse;
        if (!response.ok || !data.dataset) {
          throw erroDaResposta(response, data, "Falha ao encerrar a temporada.");
        }
        adotarDatasetDoServidor(data.dataset, data.versao);
        setMessage(data.message || "Temporada encerrada.");
      },
      "Falha ao encerrar a temporada.",
    );
  };

  const startTournament = (payload: StartTournamentPayload) => {
    runTransitionTask(
      "salvar",
      async () => {
        clearAlerts();
        const response = await fetch("/api/admin/tournament/start", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, confirm: true }),
        });
        const data = (await response.json()) as DatasetResponse;
        if (!response.ok || !data.dataset) {
          throw erroDaResposta(response, data, "Falha ao iniciar a temporada.");
        }
        adotarDatasetDoServidor(data.dataset, data.versao);
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
          const resposta = await fetch("/api/admin/dataset/seed", {
            method: "POST",
            credentials: "same-origin",
          });
          const dados = (await resposta.json()) as DatasetResponse;
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

  const barra = (
    <div
      style={{
        position: "sticky",
        top: 0,
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
        <MarcaLB size={30} />
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
        {/* Só a VIRADA de estado é anunciada. Se a contagem inteira fosse região viva, o
            leitor de tela falaria a cada tecla digitada num campo. */}
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
        {sujo ? (
          <Chip tone="warn" title={resumirMudancas(changes).join(" · ")}>
            {changes.length === 1
              ? "1 alteração não salva"
              : `${changes.length} alterações não salvas`}
          </Chip>
        ) : (
          <Chip tone="ok">Tudo salvo</Chip>
        )}
        {sujo && !estreito ? (
          <span style={{ fontSize: 11, color: C.ink4, ...tabular }}>
            {resumirMudancas(changes).slice(0, 3).join(" · ")}
          </span>
        ) : null}
        {escoposPendentesSemPermissao.length > 0 ? (
          <Chip
            tone="danger"
            title={`Sem permissão para: ${escoposPendentesSemPermissao.map(scopeLabel).join(", ")}`}
          >
            sem permissão para parte das mudanças
          </Chip>
        ) : null}
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

  const itens = (horizontal: boolean) =>
    grupos.map(([nomeDoGrupo, itensDoGrupo]) => (
      <div
        key={nomeDoGrupo}
        style={
          horizontal
            ? { display: "flex", alignItems: "center", gap: 2 }
            : { marginBottom: 14 }
        }
      >
        <div
          style={{
            fontSize: 9.5,
            letterSpacing: ".2em",
            textTransform: "uppercase",
            color: C.ink4,
            padding: horizontal ? "0 8px 0 4px" : "0 0 6px 10px",
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
            horizontal={horizontal}
            onClick={() => trocarDeSecao(secao.value)}
          />
        ))}
      </div>
    ));

  const cartaoDaConta = session.user ? (
    <Card padding="12px 12px 13px" style={{ marginTop: estreito ? 14 : 6 }}>
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

      {conflict ? (
        <Banner
          tone="warn"
          title="Alguém salvou antes de você"
          actions={
            <>
              <Button onClick={reloadDataset} disabled={isBusy}>
                <RefreshCcw size={14} aria-hidden />
                Trazer a versão nova (descarta seu rascunho)
              </Button>
              <Button tone="danger" onClick={() => saveDraft(true)} disabled={isBusy}>
                <Save size={14} aria-hidden />
                Salvar por cima assim mesmo
              </Button>
            </>
          }
        >
          Outra pessoa gravou alterações enquanto este rascunho estava aberto (pode ter sido um
          sorteio de carta ou de lado). Seu rascunho continua aqui — escolha o que fazer.
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
        <AdminTabContent
          aplicarDoServidor={aplicarDoServidor}
          onVersaoDoServidor={sincronizarVersaoDoServidor}
          onFormularioSujo={setFormularioSujo}
          podeConferir={alcanca(["inscricoes:conferir"])}
          podeFinanceiro={alcanca(["inscricoes:financeiro"])}
          podeConfigurar={alcanca(["edicao:configurar"])}
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
      </section>
    </div>
  );

  if (estreito) {
    return (
      <div>
        {barra}
        <nav aria-label="Seções do painel" style={{ marginBottom: 14 }}>
          <ScrollX>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                paddingBottom: 4,
                borderBottom: `1px solid ${C.line}`,
                width: "max-content",
              }}
            >
              {itens(true)}
            </div>
          </ScrollX>
        </nav>
        {cartaoDaConta}
        <div style={{ marginTop: 14 }}>{conteudo}</div>
      </div>
    );
  }

  return (
    <div>
      {barra}
      <div style={{ display: "grid", gridTemplateColumns: "216px 1fr", gap: 22, alignItems: "start" }}>
        <div style={{ position: "sticky", top: 78 }}>
          <nav aria-label="Seções do painel">{itens(false)}</nav>
          {cartaoDaConta}
        </div>
        <div style={{ minWidth: 0 }}>{conteudo}</div>
      </div>
    </div>
  );
}
