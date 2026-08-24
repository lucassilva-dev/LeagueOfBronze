"use client";

import { useState } from "react";

import { Banner, Button, C, Field, Input } from "@/components/admin/ui";

/**
 * Troca da própria senha, pela pessoa da organização.
 *
 * Existe porque a conta criada para outra pessoa nascia marcada como "troca pendente"
 * e não havia nada que trocasse: o único caminho era o master redefinir pelo painel,
 * o que deixa o master sabendo a senha do outro para sempre. Uma conta que a pessoa
 * não consegue tornar só dela não é dela.
 *
 * Quando a troca é obrigatória, o bloco aparece aberto e com aviso; nos outros casos
 * fica recolhido atrás de um link, para não poluir o painel de quem já trocou.
 */
export function TrocarSenha({
  obrigatoria,
  onTrocada,
}: Readonly<{ obrigatoria: boolean; onTrocada: () => void }>) {
  const [aberto, setAberto] = useState(obrigatoria);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro(null);
    if (nova !== repetida) {
      setErro("As duas senhas novas não são iguais.");
      return;
    }
    setEnviando(true);
    try {
      const r = await fetch("/api/admin/senha", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { error?: string };

      if (!r.ok) {
        setErro(corpo.error ?? "Não foi possível trocar a senha.");
        return;
      }
      setAtual("");
      setNova("");
      setRepetida("");
      setOk(true);
      onTrocada();
    } catch {
      setErro("Não foi possível falar com o servidor.");
    } finally {
      setEnviando(false);
    }
  }

  if (ok) {
    return (
      <div style={{ marginTop: 10 }}>
        <Banner tone="ok" title="Senha trocada">
          As outras sessões desta conta foram encerradas. A partir daqui, só você entra com ela.
        </Banner>
      </div>
    );
  }

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        style={{
          marginTop: 10,
          padding: 0,
          border: 0,
          background: "none",
          color: C.bronze,
          fontFamily: "inherit",
          fontSize: 11,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Trocar minha senha
      </button>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      {obrigatoria ? (
        <div style={{ marginBottom: 10 }}>
          <Banner tone="warn" title="Troque a senha provisória">
            Ela foi definida por outra pessoa e ainda é conhecida por quem a criou.
          </Banner>
        </div>
      ) : null}

      <Field label="Senha atual">
        <Input value={atual} onChange={setAtual} type="password" ariaLabel="Senha atual" />
      </Field>
      <div style={{ height: 8 }} />
      <Field label="Nova senha" hint="Ao menos 12 caracteres, com letras e números.">
        <Input value={nova} onChange={setNova} type="password" ariaLabel="Nova senha" />
      </Field>
      <div style={{ height: 8 }} />
      <Field label="Repita a nova senha">
        <Input value={repetida} onChange={setRepetida} type="password" ariaLabel="Repita a nova senha" />
      </Field>

      {erro ? (
        <div style={{ marginTop: 10 }}>
          <Banner tone="danger" title="Não deu">
            {erro}
          </Banner>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
        <Button tone="gold" small onClick={() => void enviar()} disabled={enviando}>
          {enviando ? "Trocando…" : "Trocar senha"}
        </Button>
        {obrigatoria ? null : (
          <Button tone="ghost" small onClick={() => setAberto(false)} disabled={enviando}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}
