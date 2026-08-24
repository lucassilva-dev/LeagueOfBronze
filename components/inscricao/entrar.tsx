"use client";

import { useState } from "react";
import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";

/**
 * Login do jogador.
 *
 * Existe porque os únicos campos de login do site viviam DENTRO do formulário de
 * inscrição — e o formulário só aparece com a janela aberta. Com as inscrições
 * fechadas, um capitão que perdesse a sessão no dia do draft não tinha por onde
 * voltar. Esta página não depende de janela nenhuma.
 */
export default function Entrar({ t }: Readonly<{ t: Messages["inscricao"] }>) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const r = await fetch("/api/conta/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const corpo = (await r.json().catch(() => ({}))) as { error?: string };

      if (r.ok) {
        // Navegação de página inteira, e não do roteador: o cabeçalho e as telas com
        // sessão precisam ser remontados com o cookie novo.
        window.location.assign("/minha-inscricao");
        return;
      }
      setErro(corpo.error ?? t.erroGenerico);
    } catch {
      setErro(t.erroGenerico);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="lob-card-2 lob-fade" style={{ padding: "28px 26px", maxWidth: 460 }}>
      <Campo label={t.emailLabel}>
        <input
          style={entrada}
          type="email"
          autoComplete="email"
          required
          value={email}
          placeholder={t.emailPlaceholder}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Campo>

      <div style={{ height: 14 }} />

      <Campo label={t.senhaLabel}>
        <input
          style={entrada}
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
      </Campo>

      {erro ? (
        <p
          role="alert"
          style={{
            margin: "16px 0 0",
            padding: "11px 13px",
            borderRadius: 6,
            border: "1px solid rgba(212,87,74,.45)",
            background: "rgba(212,87,74,.12)",
            color: "#f0a79e",
            fontSize: 13,
          }}
        >
          {erro}
        </p>
      ) : null}

      <button type="submit" className="lob-btn-gold" disabled={enviando} style={{ marginTop: 20, width: "100%" }}>
        {enviando ? t.enviando : t.entrarBotao}
      </button>

      <p style={{ margin: "20px 0 0", fontSize: 13, color: "var(--lob-muted)" }}>
        {t.entrarSemConta}{" "}
        <Link href="/inscricao" style={{ color: "var(--lob-gold-1)" }}>
          {t.minhaIrParaInscricao}
        </Link>
      </p>
    </form>
  );
}

const entrada: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  color: "var(--lob-text)",
  background: "rgba(0,0,0,.34)",
  border: "1px solid var(--lob-line)",
  borderRadius: 4,
};

function Campo({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          display: "block",
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: "var(--lob-bronze)",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
