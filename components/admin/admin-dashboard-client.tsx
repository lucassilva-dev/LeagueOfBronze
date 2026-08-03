"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LogOut, RefreshCcw, Save } from "lucide-react";

import type { SeriesFormat, TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, calculateStandings } from "@/lib/tournament";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { scopeLabel } from "@/lib/security/scopes";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { AdminTeamsPanel } from "@/components/admin/admin-teams-panel";
import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { AdminSeriesPanel } from "@/components/admin/admin-series-panel";
import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { AdminTournamentPanel } from "@/components/admin/admin-tournament-panel";
import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import {
  cloneDataset,
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
  message?: string;
  error?: string;
};

type MessageResponse = {
  ok?: boolean;
  error?: string;
};

type AlertKind = "error" | "success";

type AlertBannerProps = Readonly<{
  kind: AlertKind;
  text: string;
  className?: string;
}>;

type AdminLoginCardProps = Readonly<{
  error: string | null;
  message: string | null;
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
  isBusy: boolean;
  /** "accounts" mostra o campo de usuário; "legacy" mantém só a senha */
  authMode: "accounts" | "legacy";
}>;

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
}>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function getSaveButtonLabel(isPending: boolean, isSupabaseProvider: boolean) {
  if (isPending) return "Salvando...";
  return isSupabaseProvider ? "Salvar no Supabase" : "Salvar no arquivo";
}

function getReloadButtonLabel(isSupabaseProvider: boolean) {
  return isSupabaseProvider ? "Recarregar do Supabase" : "Recarregar do arquivo";
}

function AlertBanner({ kind, text, className }: AlertBannerProps) {
  const toneClass =
    kind === "error"
      ? "border-red-400/20 bg-red-500/10 text-red-200"
      : "border-emerald-400/20 bg-emerald-500/10 text-emerald-200";

  return (
    <p className={`rounded-xl border px-3 py-2 text-sm ${toneClass} ${className ?? ""}`.trim()}>
      {text}
    </p>
  );
}

function AdminLoginCard({
  error,
  message,
  username,
  setUsername,
  password,
  setPassword,
  onLogin,
  isBusy,
  authMode,
}: AdminLoginCardProps) {
  const usaContas = authMode === "accounts";
  const podeEnviar = Boolean(password) && (!usaContas || Boolean(username));

  const handleKeyDown = (key: string) => {
    if (key === "Enter" && podeEnviar) onLogin();
  };

  return (
    <Card className="mx-auto max-w-md p-5">
      <h3 className="font-display text-lg font-bold tracking-wide">Entrar no Admin</h3>
      <p className="mt-1 text-sm text-muted">
        {usaContas
          ? "Acesso por conta individual, com sessão que expira e pode ser revogada."
          : "Modo de transição por senha única. Configure as contas para ativar o acesso individual."}
      </p>
      {error ? <AlertBanner kind="error" text={error} className="mt-3" /> : null}
      {message ? <AlertBanner kind="success" text={message} className="mt-3" /> : null}

      {usaContas ? (
        <div className="mt-4">
          <Label htmlFor="admin-username">Usuário</Label>
          <Input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            onKeyDown={(event) => {
              handleKeyDown(event.key);
            }}
            placeholder="Seu usuário"
          />
        </div>
      ) : null}

      <div className="mt-4">
        <Label htmlFor="admin-password">Senha</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            handleKeyDown(event.key);
          }}
          placeholder="Digite sua senha"
        />
      </div>
      <div className="mt-4">
        <Button onClick={onLogin} disabled={isBusy || !podeEnviar}>
          {isBusy ? "Entrando..." : "Entrar"}
        </Button>
      </div>
    </Card>
  );
}

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
}: AdminTabContentProps) {
  if (activeTab === "users") return <AdminUsersPanel onAlert={onAlert} />;

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
      return <AdminTeamsPanel draft={draft} mutateDraft={mutateDraft} />;
    case "players":
      return <AdminPlayersPanel draft={draft} mutateDraft={mutateDraft} />;
    case "series":
      return <AdminSeriesPanel draft={draft} mutateDraft={mutateDraft} />;
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

export function AdminDashboardClient() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [draft, setDraft] = useState<TournamentDataset | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  /** Alguém gravou por cima enquanto este rascunho estava aberto (resposta 409). */
  const [conflict, setConflict] = useState(false);
  const [isPending, startTransition] = useTransition();

  const clearAlerts = () => {
    setMessage(null);
    setError(null);
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

  const fetchDataset = async () => {
    const response = await fetch("/api/admin/dataset", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const data = (await response.json()) as DatasetResponse;
    if (!response.ok || !data.dataset) {
      throw new Error(data.error || "Falha ao carregar os dados do campeonato.");
    }
    setDraft(data.dataset);
    return data.dataset;
  };

  const runTransitionTask = (task: () => Promise<void>, fallbackError: string) => {
    startTransition(() => {
      void task().catch((taskError) => {
        setError(getErrorMessage(taskError, fallbackError));
      });
    });
  };

  useEffect(() => {
    runTransitionTask(async () => {
      clearAlerts();
      const currentSession = await fetchSession();
      if (currentSession.authorized) {
        await fetchDataset();
      }
    }, "Falha ao iniciar admin.");
  }, []);

  const mutateDraft: MutateDraft = (recipe) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = cloneDataset(prev);
      recipe(next);
      return next;
    });
  };

  const login = () => {
    runTransitionTask(async () => {
      clearAlerts();
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = (await response.json()) as MessageResponse;
      if (!response.ok) {
        throw new Error(data.error || "Falha no login.");
      }
      setPassword("");
      await fetchSession();
      await fetchDataset();
      setMessage("Login realizado. Painel liberado.");
    }, "Falha no login.");
  };

  const logout = () => {
    runTransitionTask(async () => {
      clearAlerts();
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      setDraft(null);
      setSession({ configured: session?.configured ?? true, authorized: false });
      setMessage("Sessão encerrada.");
    }, "Falha ao sair.");
  };

  const reloadDataset = () => {
    runTransitionTask(async () => {
      clearAlerts();
      await fetchDataset();
      setConflict(false);
      setMessage(
        session?.dataProvider === "supabase"
          ? "Rascunho recarregado do Supabase."
          : "Rascunho recarregado do arquivo local.",
      );
    }, "Falha ao recarregar.");
  };

  const saveDraft = (force = false) => {
    if (!draft) return;
    runTransitionTask(async () => {
      clearAlerts();
      const datasetToSave = applyAutoGameMvpsToDataset(draft);
      const response = await fetch("/api/admin/dataset", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: datasetToSave, force }),
      });
      const data = (await response.json()) as DatasetResponse;

      // 409: outra pessoa gravou enquanto este rascunho estava aberto. O rascunho NÃO é
      // descartado — quem está editando decide entre recarregar ou sobrescrever.
      if (response.status === 409) {
        setConflict(true);
        throw new Error(data.error || "Outra pessoa salvou alterações enquanto você editava.");
      }

      if (!response.ok || !data.dataset) {
        throw new Error(data.error || "Falha ao salvar.");
      }
      setConflict(false);
      setDraft(data.dataset);
      const standings = calculateStandings(data.dataset);
      setMessage(
        `${data.message || "Salvo com sucesso."} Líder atual: ${
          standings.rows[0]?.teamName ?? "—"
        } (${standings.rows[0]?.points ?? 0} pts).`,
      );
    }, "Falha ao salvar os dados do campeonato.");
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
      throw new Error(data.error || "Falha ao importar arquivo.");
    }
    setDraft(data.dataset);
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
      throw new Error(data.error || "Falha ao importar texto.");
    }
    setDraft(data.dataset);
    setMessage(data.message || "Importação concluída.");
  };

  const endTournament = () => {
    runTransitionTask(async () => {
      clearAlerts();
      const response = await fetch("/api/admin/tournament/end", {
        method: "POST",
        credentials: "same-origin",
      });
      const data = (await response.json()) as DatasetResponse;
      if (!response.ok || !data.dataset) {
        throw new Error(data.error || "Falha ao encerrar a temporada.");
      }
      setDraft(data.dataset);
      setMessage(data.message || "Temporada encerrada.");
    }, "Falha ao encerrar a temporada.");
  };

  const startTournament = (payload: StartTournamentPayload) => {
    runTransitionTask(async () => {
      clearAlerts();
      const response = await fetch("/api/admin/tournament/start", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, confirm: true }),
      });
      const data = (await response.json()) as DatasetResponse;
      if (!response.ok || !data.dataset) {
        throw new Error(data.error || "Falha ao iniciar a temporada.");
      }
      setDraft(data.dataset);
      setActiveTab("overview");
      setMessage(data.message || "Nova temporada iniciada.");
    }, "Falha ao iniciar a temporada.");
  };

  const tabOptions = useMemo(
    () => {
      const abas: { value: AdminTab; label: string }[] = [
        { value: "tournament", label: "Torneio" },
        { value: "overview", label: "Visão geral" },
        { value: "teams", label: "Times" },
        { value: "players", label: "Jogadores" },
        { value: "series", label: "Séries" },
        { value: "backup", label: "Importar/Exportar" },
      ];
      // Aba de usuários só para o master (a decisão real é sempre do servidor).
      if (session?.user?.isMaster) abas.push({ value: "users", label: "Usuários" });
      return abas;
    },
    [session?.user?.isMaster],
  );
  const isSupabaseProvider = session?.dataProvider === "supabase";
  const isBusy = isPending || isImporting;

  const handleImportFile = async (file: File) => {
    clearAlerts();
    setIsImporting(true);
    try {
      await importJsonFile(file);
    } catch (importError) {
      setError(getErrorMessage(importError, "Falha ao importar."));
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
      setError(getErrorMessage(importError, "Falha ao importar."));
    } finally {
      setIsImporting(false);
    }
  };

  if (!session) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted">Carregando sessão do admin...</p>
      </Card>
    );
  }

  if (!session.configured) {
    return (
      <Card className="p-5">
        <h3 className="font-display text-lg font-bold tracking-wide">ADMIN_PASSWORD ausente</h3>
        <p className="mt-2 text-sm text-muted">
          Configure `ADMIN_PASSWORD` no `.env.local` para liberar o painel admin.
        </p>
      </Card>
    );
  }

  if (!session.authorized) {
    return (
      <AdminLoginCard
        error={error}
        message={message}
        username={username}
        setUsername={setUsername}
        password={password}
        setPassword={setPassword}
        onLogin={login}
        isBusy={isBusy}
        authMode={session.authMode ?? "legacy"}
      />
    );
  }

  if (!draft) {
    return (
      <Card className="p-5">
        <p className="text-sm text-muted">Carregando dados do campeonato...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <AlertBanner kind="error" text={error} /> : null}
      {message ? <AlertBanner kind="success" text={message} /> : null}

      {session.user ? (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Conectado como</span>
              <span className="font-semibold">{session.user.displayName}</span>
              <span className="text-sm text-muted">@{session.user.username}</span>
              {session.user.isMaster ? (
                <Badge variant="bronze">MASTER · acesso total</Badge>
              ) : (
                <Badge variant="outline">
                  {session.user.scopes.length} permissão(ões)
                </Badge>
              )}
              {session.user.legacy ? <Badge variant="muted">modo de transição</Badge> : null}
            </div>
            {!session.user.isMaster && session.user.scopes.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {session.user.scopes.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px]">
                    {scopeLabel(s)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {conflict ? (
        <Card className="border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-text">Alguém salvou antes de você</p>
          <p className="mt-1 text-xs text-muted">
            Outra pessoa gravou alterações enquanto este rascunho estava aberto (pode ter sido
            um sorteio de carta ou de lado). Seu rascunho continua aqui — escolha o que fazer:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={reloadDataset} disabled={isBusy}>
              <RefreshCcw className="h-4 w-4" />
              Trazer a versão nova (descarta seu rascunho)
            </Button>
            <Button onClick={() => saveDraft(true)} disabled={isBusy}>
              <Save className="h-4 w-4" />
              Salvar por cima assim mesmo
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {/* Sem a arrow, o evento do clique chegaria como `force` e a trava de
                concorrência ficaria sempre desligada. */}
            <Button onClick={() => saveDraft()} disabled={isBusy}>
              <Save className="h-4 w-4" />
              {getSaveButtonLabel(isPending, isSupabaseProvider)}
            </Button>
            <Button variant="secondary" onClick={reloadDataset} disabled={isBusy}>
              <RefreshCcw className="h-4 w-4" />
              {getReloadButtonLabel(isSupabaseProvider)}
            </Button>
            <Button variant="ghost" onClick={logout} disabled={isBusy}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
          <div className="text-xs text-muted">
            <p>
              Persistência ativa:{" "}
              <span className="font-semibold text-text">
                {session.dataProviderLabel ?? "Arquivo local (JSON)"}
              </span>
            </p>
            <p>
              Alterações ficam no rascunho e só são gravadas ao clicar em salvar.
            </p>
          </div>
        </div>
      </Card>

      <SegmentedControl
        label="Seções do admin"
        value={activeTab}
        onChange={setActiveTab}
        options={tabOptions}
      />

      <AdminTabContent
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
    </div>
  );
}
