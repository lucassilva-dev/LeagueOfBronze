"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import {
  Banner,
  Button,
  C,
  Card,
  Chip,
  Empty,
  Eyebrow,
  Field,
  Input,
  SectionHead,
  display,
  tabular,
} from "@/components/admin/ui";
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

/** Confirmação pendente de uma ação destrutiva (uma por vez, sempre nomeando a conta). */
type Confirmacao = {
  id: string;
  tipo: "desativar" | "sessoes" | "remover";
};

const ESCOPOS_ATRIBUIVEIS = SCOPES.filter((s) => !s.masterOnly);
const ESCOPOS_DO_MASTER = SCOPES.filter((s) => s.masterOnly);
const GRUPOS = [...new Set(ESCOPOS_ATRIBUIVEIS.map((s) => s.group))];

/**
 * Regra de senha ESPELHADA de validatePasswordStrength (lib/security/password.ts).
 * Antes o painel só cobrava 12 caracteres, mas o servidor também exige letras + números:
 * a pessoa preenchia tudo, clicava e tomava um erro que a interface tinha prometido que
 * não viria. Se aquela função mudar, esta lista tem que mudar junto.
 */
function avaliarSenha(senha: string) {
  return [
    { ok: senha.length >= 12, texto: "Pelo menos 12 caracteres" },
    { ok: /[a-zA-Z]/.test(senha) && /[0-9]/.test(senha), texto: "Combina letras e números" },
    { ok: senha.length <= 200, texto: "No máximo 200 caracteres" },
  ];
}

/** Mesma regra do schema da rota POST /api/admin/users. */
function usuarioValido(valor: string) {
  return valor.length >= 3 && valor.length <= 60 && /^[a-zA-Z0-9._-]+$/.test(valor);
}

function inicial(u: UsuarioAdmin) {
  const base = u.displayName.trim() || u.username;
  return (base[0] ?? "?").toUpperCase();
}

// ---------------------------------------------------------------- peças locais

/** Cabeçalho de cartão (o BlockTitle tem margem própria para uso entre blocos soltos). */
function CardHead({
  eyebrow,
  title,
  description,
  right,
}: Readonly<{ eyebrow: string; title: string; description?: string; right?: ReactNode }>) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 14,
        flexWrap: "wrap",
        marginBottom: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 style={{ fontFamily: display, fontSize: 19, color: C.ink, margin: 0 }}>{title}</h3>
        {description ? (
          <p style={{ margin: "6px 0 0", fontSize: 12.5, color: C.ink3, maxWidth: "64ch", lineHeight: 1.6 }}>
            {description}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

/**
 * Chip clicável de permissão. Visualmente igual ao <Chip>, mas é um <button> de verdade:
 * teclado, aria-pressed e o outline global de foco funcionam sem gambiarra.
 */
function ChipToggle({
  ativo,
  disabled,
  onClick,
  children,
  title,
}: Readonly<{
  ativo: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}>) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={ativo}
      disabled={disabled}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 2,
        fontFamily: "inherit",
        fontSize: 10.5,
        letterSpacing: ".04em",
        whiteSpace: "nowrap",
        cursor: disabled ? "not-allowed" : "pointer",
        ...(ativo
          ? {
              border: "1px solid rgba(70,214,200,.40)",
              color: C.okSoft,
              background: "rgba(70,214,200,.09)",
            }
          : {
              border: `1px solid ${C.line}`,
              color: C.ink4,
              background: "transparent",
            }),
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span aria-hidden style={{ fontSize: 11, lineHeight: 1 }}>{ativo ? "✓" : "○"}</span>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- painel

export function AdminUsersPanel({ onAlert }: Readonly<{ onAlert: (kind: "ok" | "erro", text: string) => void }>) {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const [novoUsuario, setNovoUsuario] = useState("");
  const [novoNome, setNovoNome] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [novosEscopos, setNovosEscopos] = useState<string[]>([]);
  // Trava do envio: sem isso dava para clicar duas vezes e criar a mesma conta duplicada.
  const [criando, setCriando] = useState(false);

  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  // Para remover é preciso digitar o @usuário: é a única ação sem volta do painel.
  const [textoRemocao, setTextoRemocao] = useState("");

  /*
   * O aviso vai por REF, e `carregar` não depende dele.
   *
   * Com `onAlert` nas dependências, uma listagem que FALHA virava laço infinito: o
   * catch chama `onAlert`, que muda o estado do pai; o pai re-renderiza e cria um
   * `onAlert` novo; `carregar` ganha identidade nova; o efeito abaixo dispara de novo;
   * a busca falha outra vez. O navegador passava a martelar /api/admin/users dezenas de
   * vezes por segundo enquanto a faixa de erro piscava — e o gatilho é justamente o
   * cenário que já aconteceu neste projeto (Supabase pausado devolvendo 500) ou um 403
   * de quem não é master.
   *
   * Mesmo padrão de e4/painel-edicao.tsx.
   */
  const refAlerta = useRef(onAlert);
  useEffect(() => {
    refAlerta.current = onAlert;
  });

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch("/api/admin/users", { credentials: "same-origin", cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao listar usuários.");
      setUsuarios(d.users ?? []);
    } catch (e) {
      refAlerta.current("erro", e instanceof Error ? e.message : "Falha ao listar usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const regras = avaliarSenha(novaSenha);
  const senhaOk = novaSenha.length > 0 && regras.every((r) => r.ok);
  const podeCriar = usuarioValido(novoUsuario.trim()) && senhaOk && !criando;

  const criar = async () => {
    if (criando) return; // guarda extra: Enter repetido não passa pelo disabled do botão
    setCriando(true);
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
    } finally {
      setCriando(false);
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
      setConfirmacao(null);
      await carregar();
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setSalvandoId(null);
    }
  };

  const remover = async (u: UsuarioAdmin) => {
    setSalvandoId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Falha ao remover usuário.");
      onAlert("ok", `Conta de ${u.displayName} removida.`);
      setConfirmacao(null);
      setTextoRemocao("");
      await carregar();
    } catch (e) {
      onAlert("erro", e instanceof Error ? e.message : "Falha ao remover usuário.");
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

  const abrirConfirmacao = (id: string, tipo: Confirmacao["tipo"]) => {
    setTextoRemocao("");
    setConfirmacao((atual) => (atual?.id === id && atual.tipo === tipo ? null : { id, tipo }));
  };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <SectionHead
        eyebrow="Acesso"
        title="Contas e permissões"
        description="Cada conta enxerga só o que está marcado em verde. O que aparece apagado é o que ela não pode fazer."
        actions={
          <Button tone="ghost" small onClick={() => void carregar()} disabled={carregando}>
            {carregando ? "Carregando..." : "Atualizar lista"}
          </Button>
        }
      />

      {/* ------------------------------------------------------------ nova conta */}
      <Card padding="18px 18px 20px">
        <CardHead
          eyebrow="Cadastro"
          title="Nova conta"
          description="Marque só o que a pessoa precisa. Ela é obrigada a trocar a senha no primeiro acesso."
        />

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          }}
        >
          <Field
            label="Usuário"
            hint={
              novoUsuario.trim() && !usuarioValido(novoUsuario.trim())
                ? "3 a 60 caracteres: letras, números, ponto, hífen ou sublinhado."
                : "É o que ela digita para entrar."
            }
          >
            <Input value={novoUsuario} onChange={setNovoUsuario} placeholder="ex: joao" autoComplete="off" />
          </Field>
          <Field label="Nome exibido" hint="Se ficar vazio, repete o usuário.">
            <Input value={novoNome} onChange={setNovoNome} placeholder="ex: João" autoComplete="off" />
          </Field>
          <Field label="Senha inicial">
            <Input
              type="password"
              value={novaSenha}
              onChange={setNovaSenha}
              placeholder="senha provisória"
              autoComplete="new-password"
            />
          </Field>
        </div>

        {/* Regra de senha exatamente igual à do servidor, conferida enquanto se digita. */}
        <ul
          style={{
            listStyle: "none",
            display: "flex",
            flexWrap: "wrap",
            gap: "6px 16px",
            margin: "12px 0 0",
            padding: 0,
          }}
        >
          {regras.map((r) => (
            <li
              key={r.texto}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11.5,
                color: r.ok ? C.okSoft : C.ink4,
              }}
            >
              <span aria-hidden style={{ fontSize: 11 }}>{r.ok ? "✓" : "○"}</span>
              {r.texto}
            </li>
          ))}
        </ul>

        <div style={{ display: "grid", gap: 14, marginTop: 18 }}>
          {GRUPOS.map((grupo) => (
            <div key={grupo}>
              <p
                style={{
                  margin: "0 0 7px",
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: C.bronze,
                }}
              >
                {grupo}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {ESCOPOS_ATRIBUIVEIS.filter((s) => s.group === grupo).map((s) => (
                  <ChipToggle
                    key={s.key}
                    ativo={novosEscopos.includes(s.key)}
                    onClick={() =>
                      setNovosEscopos((prev) =>
                        prev.includes(s.key) ? prev.filter((x) => x !== s.key) : [...prev, s.key],
                      )
                    }
                  >
                    {s.label}
                  </ChipToggle>
                ))}
              </div>
            </div>
          ))}

          {/* Escopos masterOnly: apareciam escondidos, então dava para marcar no formulário e o
              servidor descartava calado. Agora ficam visíveis e explicitamente indisponíveis. */}
          <div>
            <p
              style={{
                margin: "0 0 7px",
                fontSize: 10,
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: C.ink4,
              }}
            >
              Exclusivo do master · não pode ser concedido
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {ESCOPOS_DO_MASTER.map((s) => (
                <Chip key={s.key} tone="off" title="Só a conta master exerce esta permissão.">
                  <span aria-hidden style={{ fontSize: 11 }}>🔒</span>
                  {s.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <Button tone="gold" onClick={() => void criar()} disabled={!podeCriar}>
            {criando ? "Criando..." : "Criar conta"}
          </Button>
        </div>
      </Card>

      {/* ------------------------------------------------------------ lista */}
      <div>
        <Eyebrow>Contas</Eyebrow>

        {usuarios.length === 0 && !carregando ? (
          <Empty title="Nenhuma conta cadastrada">
            Crie a primeira conta acima. O master continua existindo mesmo sem nenhuma conta comum.
          </Empty>
        ) : null}

        <div style={{ display: "grid", gap: 12 }}>
          {usuarios.map((u) => {
            const ocupado = salvandoId === u.id;
            const confirmando = confirmacao?.id === u.id ? confirmacao.tipo : null;

            return (
              <Card key={u.id} padding="16px 16px 18px" style={{ opacity: u.disabled ? 0.62 : 1 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 13, flexWrap: "wrap" }}>
                  {/* Avatar de inicial: identifica a linha de relance numa lista de contas parecidas. */}
                  <div
                    aria-hidden
                    style={{
                      width: 40,
                      height: 40,
                      flexShrink: 0,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 3,
                      fontFamily: display,
                      fontSize: 18,
                      color: u.isMaster ? "#160f06" : C.bronzeLit,
                      background: u.isMaster
                        ? `linear-gradient(180deg, ${C.bronzeHi}, ${C.bronzeDeep})`
                        : "rgba(201,138,75,.10)",
                      border: `1px solid ${u.isMaster ? "transparent" : C.line2}`,
                    }}
                  >
                    {inicial(u)}
                  </div>

                  <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: display, fontSize: 17, color: C.ink }}>{u.displayName}</span>
                      <span style={{ fontSize: 12, color: C.ink3 }}>@{u.username}</span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
                      {u.isMaster ? <Chip tone="gold">MASTER · acesso total</Chip> : null}
                      {u.disabled ? <Chip tone="warn">Conta desativada · sem acesso</Chip> : null}
                      {u.mustChangePassword ? <Chip tone="warn">Troca de senha pendente</Chip> : null}
                      {u.activeSessions > 0 ? (
                        <Chip tone="ok">
                          <span style={tabular}>{u.activeSessions}</span>
                          {u.activeSessions === 1 ? " sessão aberta" : " sessões abertas"}
                        </Chip>
                      ) : (
                        <Chip tone="off">Sem sessão aberta</Chip>
                      )}
                    </div>
                  </div>

                  {!u.isMaster ? (
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      <Button
                        tone="ghost"
                        small
                        disabled={ocupado}
                        onClick={() => abrirConfirmacao(u.id, "sessoes")}
                      >
                        Encerrar sessões
                      </Button>
                      {u.disabled ? (
                        <Button
                          tone="ghost"
                          small
                          disabled={ocupado}
                          onClick={() => void atualizar(u.id, { disabled: false }, `${u.displayName} reativado.`)}
                        >
                          Reativar
                        </Button>
                      ) : (
                        <Button
                          tone="danger"
                          small
                          disabled={ocupado}
                          onClick={() => abrirConfirmacao(u.id, "desativar")}
                        >
                          Desativar
                        </Button>
                      )}
                      <Button
                        tone="danger"
                        small
                        disabled={ocupado}
                        onClick={() => abrirConfirmacao(u.id, "remover")}
                      >
                        Remover
                      </Button>
                    </div>
                  ) : null}
                </div>

                {/* ---------------------------------------- confirmações nomeadas */}
                {confirmando === "sessoes" ? (
                  <div style={{ marginTop: 14 }}>
                    <Banner
                      tone="danger"
                      title={`Encerrar as sessões de ${u.displayName}?`}
                      actions={
                        <>
                          <Button
                            tone="danger"
                            small
                            disabled={ocupado}
                            onClick={() =>
                              void atualizar(
                                u.id,
                                { revokeSessions: true },
                                `Sessões de ${u.displayName} encerradas.`,
                              )
                            }
                          >
                            {ocupado ? "Encerrando..." : "Encerrar agora"}
                          </Button>
                          <Button tone="ghost" small disabled={ocupado} onClick={() => setConfirmacao(null)}>
                            Cancelar
                          </Button>
                        </>
                      }
                    >
                      As sessões abertas de <strong>@{u.username}</strong> caem na hora — inclusive no celular.
                      A conta continua ativa e com as mesmas permissões; ela só precisa entrar de novo.
                    </Banner>
                  </div>
                ) : null}

                {confirmando === "desativar" ? (
                  <div style={{ marginTop: 14 }}>
                    <Banner
                      tone="danger"
                      title={`Desativar a conta de ${u.displayName}?`}
                      actions={
                        <>
                          <Button
                            tone="danger"
                            small
                            disabled={ocupado}
                            onClick={() =>
                              void atualizar(u.id, { disabled: true }, `${u.displayName} desativado.`)
                            }
                          >
                            {ocupado ? "Desativando..." : "Desativar"}
                          </Button>
                          <Button tone="ghost" small disabled={ocupado} onClick={() => setConfirmacao(null)}>
                            Cancelar
                          </Button>
                        </>
                      }
                    >
                      <strong>@{u.username}</strong> perde o acesso imediatamente: as sessões abertas caem na hora
                      e ela não consegue mais entrar. As permissões ficam guardadas e dá para reativar depois.
                    </Banner>
                  </div>
                ) : null}

                {confirmando === "remover" ? (
                  <div style={{ marginTop: 14 }}>
                    <Banner
                      tone="danger"
                      title={`Remover ${u.displayName} definitivamente?`}
                      actions={
                        <>
                          <Button
                            tone="danger"
                            small
                            disabled={ocupado || textoRemocao.trim() !== u.username}
                            onClick={() => void remover(u)}
                          >
                            {ocupado ? "Removendo..." : "Remover para sempre"}
                          </Button>
                          <Button
                            tone="ghost"
                            small
                            disabled={ocupado}
                            onClick={() => {
                              setConfirmacao(null);
                              setTextoRemocao("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </>
                      }
                    >
                      A conta é apagada e <strong>não tem volta</strong>. As sessões abertas caem na hora e o
                      histórico de quem fez o quê deixa de apontar para uma conta existente. Se a ideia é só tirar
                      o acesso por enquanto, use <em>Desativar</em>.
                      <div style={{ maxWidth: 280, marginTop: 12 }}>
                        <Field label={`Digite ${u.username} para confirmar`}>
                          <Input
                            value={textoRemocao}
                            onChange={setTextoRemocao}
                            placeholder={u.username}
                            autoComplete="off"
                          />
                        </Field>
                      </div>
                    </Banner>
                  </div>
                ) : null}

                {/* ---------------------------------------- permissões */}
                <div style={{ marginTop: 14, borderTop: `1px solid ${C.line}`, paddingTop: 13 }}>
                  {u.isMaster ? (
                    <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>
                      O master faz tudo, sempre. A conta não pode ser desativada, removida nem ter permissões
                      alteradas por aqui — só direto no banco, de propósito.
                    </p>
                  ) : (
                    <>
                      <p
                        style={{
                          margin: "0 0 8px",
                          fontSize: 10,
                          letterSpacing: ".16em",
                          textTransform: "uppercase",
                          color: C.ink4,
                        }}
                      >
                        Permissões · clique para conceder ou tirar
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {ASSIGNABLE_SCOPES.map((escopo) => {
                          const ativo = u.scopes.includes(escopo);
                          return (
                            <ChipToggle
                              key={escopo}
                              ativo={ativo}
                              disabled={ocupado}
                              onClick={() => alternarEscopo(u, escopo)}
                              title={ativo ? "Tirar esta permissão" : "Conceder esta permissão"}
                            >
                              {scopeLabel(escopo)}
                            </ChipToggle>
                          );
                        })}
                        {/* Deixa claro o teto: estes escopos nunca valem para uma conta comum. */}
                        {ESCOPOS_DO_MASTER.map((s) => (
                          <Chip
                            key={s.key}
                            tone="off"
                            title="Exclusivo do master — o servidor descarta se for atribuído."
                          >
                            <span aria-hidden style={{ fontSize: 11 }}>🔒</span>
                            {s.label}
                          </Chip>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
