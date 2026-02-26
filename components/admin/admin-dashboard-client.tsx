"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { LogOut, RefreshCcw, Save } from "lucide-react";

import type { TournamentDataset } from "@/lib/schema";
import { applyAutoGameMvpsToDataset, calculateStandings } from "@/lib/tournament";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AdminOverviewPanel } from "@/components/admin/admin-overview-panel";
import { AdminTeamsPanel } from "@/components/admin/admin-teams-panel";
import { AdminPlayersPanel } from "@/components/admin/admin-players-panel";
import { AdminSeriesPanel } from "@/components/admin/admin-series-panel";
import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import {
  cloneDataset,
  type AdminTab,
  type MutateDraft,
} from "@/components/admin/shared";

type SessionResponse = {
  configured: boolean;
  authorized: boolean;
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
  password: string;
  setPassword: (value: string) => void;
  onLogin: () => void;
  isBusy: boolean;
}>;

type AdminTabContentProps = Readonly<{
  activeTab: AdminTab;
  draft: TournamentDataset;
  mutateDraft: MutateDraft;
  isBusy: boolean;
  onImportFile: (file: File) => Promise<void>;
  onImportText: (text: string) => Promise<void>;
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
  password,
  setPassword,
  onLogin,
  isBusy,
}: AdminLoginCardProps) {
  const handlePasswordKeyDown = (key: string) => {
    if (key === "Enter") {
      onLogin();
    }
  };

  return (
    <Card className="mx-auto max-w-md p-5">
      <h3 className="font-display text-lg font-bold tracking-wide">Entrar no Admin</h3>
      <p className="mt-1 text-sm text-muted">
        Proteção simples por senha via ENV. Não é auth enterprise (intencional).
      </p>
      {error ? <AlertBanner kind="error" text={error} className="mt-3" /> : null}
      {message ? <AlertBanner kind="success" text={message} className="mt-3" /> : null}
      <div className="mt-4">
        <Label htmlFor="admin-password">Senha</Label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => {
            handlePasswordKeyDown(event.key);
          }}
          placeholder="Digite a senha do admin"
        />
      </div>
      <div className="mt-4">
        <Button onClick={onLogin} disabled={isBusy || !password}>
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
}: AdminTabContentProps) {
  switch (activeTab) {
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
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
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
        body: JSON.stringify({ password }),
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
      setMessage(
        session?.dataProvider === "supabase"
          ? "Rascunho recarregado do Supabase."
          : "Rascunho recarregado do arquivo local.",
      );
    }, "Falha ao recarregar.");
  };

  const saveDraft = () => {
    if (!draft) return;
    runTransitionTask(async () => {
      clearAlerts();
      const datasetToSave = applyAutoGameMvpsToDataset(draft);
      const response = await fetch("/api/admin/dataset", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataset: datasetToSave }),
      });
      const data = (await response.json()) as DatasetResponse;
      if (!response.ok || !data.dataset) {
        throw new Error(data.error || "Falha ao salvar.");
      }
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

  const tabOptions = useMemo(
    () => [
      { value: "overview" as const, label: "Visão geral" },
      { value: "teams" as const, label: "Times" },
      { value: "players" as const, label: "Jogadores" },
      { value: "series" as const, label: "Séries" },
      { value: "backup" as const, label: "Importar/Exportar" },
    ],
    [],
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
        password={password}
        setPassword={setPassword}
        onLogin={login}
        isBusy={isBusy}
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

      <Card className="p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveDraft} disabled={isBusy}>
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
      />
    </div>
  );
}
