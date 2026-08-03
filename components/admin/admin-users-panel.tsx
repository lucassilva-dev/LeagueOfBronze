"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ASSIGNABLE_SCOPES, SCOPES, scopeLabel } from "@/lib/security/scopes";

type UsuarioAdmin = {
  id: string;
  username: string;
  displayName: string;
  isMaster: boolean;
  scopes: string[];
  disabled: boolean;
  mustChangePassword: boolean;
  activeSessions: number;
};

const GRUPOS = [...new Set(SCOPES.filter((s) => !s.masterOnly).map((s) => s.group))];

export function AdminUsersPanel({ onAlert }: Readonly<{ onAlert: (kind: "ok" | "erro", text: string) => void }>) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const [novoUsuario, setNovoUsuario] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novosEscopos, setNovosEscopos] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/users", { credentials: "same-origin", cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao listar usuários.");
      setUsuarios(d.users ?? []);
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao listar usuários.");
    } finally {
      setCarregando(false);
    }
  }, [onAlert]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async () => {
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: novoUsuario.trim(),
          displayName: novoNome.trim() || novoUsuario.trim(),
          password: novaSenha,
          scopes: novosEscopos,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao criar usuário.");
      onAlert("ok", "Usuário criado. Entregue a senha por um canal seguro — ele terá que trocá-la no 1º acesso.");
      setNovoUsuario("");
      setNovoNome("");
      setNovaSenha("");
      setNovosEscopos([]);
      await carregar();
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao criar usuário.");
    }
  };

  const atualizar = async (id: string, patch: Record<string, unknown>, aviso: string) => {
    setSalvandoId(id);
    try {
      const r = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao atualizar.");
      onAlert("ok", aviso);
      await carregar();
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setSalvandoId(null);
    }
  };

  const alternarEscopo = (u: UsuarioAdmin, escopo: string) => {
    const novos = u.scopes.includes(escopo)
      ? u.scopes.filter((s) => s !== escopo)
      : [...u.scopes, escopo];
    void atualizar(u.id, { scopes: novos }, `Permissões de ${u.displayName} atualizadas.`);
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="font-display text-lg font-bold tracking-wide">Novo usuário</h3>
        <p className="mt-1 text-sm text-muted">
          Marque só o que a pessoa precisa. Ela será obrigada a trocar a senha no primeiro acesso.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="novo-usuario">Usuário</Label>
            <Input id="novo-usuario" value={novoUsuario} onChange={(e) => setNovoUsuario(e.target.value)} placeholder="ex: joao" />
          </div>
          <div>
            <Label htmlFor="novo-nome">Nome</Label>
            <Input id="novo-nome" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="ex: João" />
          </div>
          <div>
            <Label htmlFor="nova-senha">Senha inicial</Label>
            <Input id="nova-senha" type="password" value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} placeholder="12+ caracteres" />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {GRUPOS.map((grupo) => (
            <div key={grupo}>
              <p className="text-xs uppercase tracking-[0.14em] text-muted">{grupo}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {SCOPES.filter((s) => !s.masterOnly && s.group === grupo).map((s) => {
                  const ativo = novosEscopos.includes(s.key);
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() =>
                        setNovosEscopos((prev) =>
                          prev.includes(s.key) ? prev.filter((x) => x !== s.key) : [...prev, s.key],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        ativo ? "border-accent2/60 bg-accent2/15 text-accent2" : "border-white/10 text-muted hover:text-text"
                      }`}
                    >
                      {ativo ? "✓ " : ""}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Button onClick={criar} disabled={!novoUsuario.trim() || novaSenha.length < 12}>
            Criar usuário
          </Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold tracking-wide">Usuários</h3>
          <Button variant="secondary" size="sm" onClick={() => void carregar()} disabled={carregando}>
            {carregando ? "Carregando..." : "Atualizar"}
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          {usuarios.map((u) => (
            <div key={u.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{u.displayName}</span>
                  <span className="text-sm text-muted">@{u.username}</span>
                  {u.isMaster ? <Badge variant="bronze">MASTER</Badge> : null}
                  {u.disabled ? <Badge variant="muted">desativado</Badge> : null}
                  {u.mustChangePassword ? <Badge variant="outline">troca de senha pendente</Badge> : null}
                  {u.activeSessions > 0 ? (
                    <Badge variant="outline">{u.activeSessions} sessão(ões) ativa(s)</Badge>
                  ) : null}
                </div>
                {!u.isMaster ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={salvandoId === u.id}
                      onClick={() => void atualizar(u.id, { revokeSessions: true }, `Sessões de ${u.displayName} encerradas.`)}
                    >
                      Encerrar sessões
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={salvandoId === u.id}
                      onClick={() =>
                        void atualizar(
                          u.id,
                          { disabled: !u.disabled },
                          u.disabled ? `${u.displayName} reativado.` : `${u.displayName} desativado.`,
                        )
                      }
                    >
                      {u.disabled ? "Reativar" : "Desativar"}
                    </Button>
                  </div>
                ) : null}
              </div>

              {u.isMaster ? (
                <p className="mt-3 text-sm text-muted">
                  O master tem acesso total e não pode ser desativado nem ter permissões alteradas por aqui.
                </p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ASSIGNABLE_SCOPES.map((escopo) => {
                    const ativo = u.scopes.includes(escopo);
                    return (
                      <button
                        key={escopo}
                        type="button"
                        disabled={salvandoId === u.id}
                        onClick={() => alternarEscopo(u, escopo)}
                        className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${
                          ativo ? "border-accent2/60 bg-accent2/15 text-accent2" : "border-white/10 text-muted hover:text-text"
                        }`}
                      >
                        {ativo ? "✓ " : ""}
                        {scopeLabel(escopo)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          {usuarios.length === 0 && !carregando ? (
            <p className="text-sm text-muted">Nenhum usuário cadastrado.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
