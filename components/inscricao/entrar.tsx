"use client";

import { useState } from "react";
import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";
import { avisarSessaoMudou } from "@/lib/sessao-mudou";

/**
 * A porta de entrada do site — para as DUAS contas.
 *
 * Existe porque os únicos campos de login de jogador viviam dentro do formulário de
 * inscrição, e o formulário só aparece com a janela aberta: com as inscrições
 * fechadas, um capitão que perdesse a sessão no dia do draft não tinha por onde
 * voltar.
 *
 * ⚠ POR QUE UM CAMPO SÓ, E POR QUE ISSO NÃO ENFRAQUECE NADA.
 *
 * Quem é da organização entra com nome de usuário; jogador entra com e-mail. Os dois
 * formatos não se confundem: o nome de usuário aceita apenas `[a-zA-Z0-9._-]`, então
 * NUNCA contém arroba. A presença do `@` decide para qual rota o pedido vai.
 *
 * A escolha é só de roteamento — nenhuma verificação foi movida para o navegador. Cada
 * rota continua com a sua guarda de origem, o seu bloqueio por tentativas, o seu piso
 * de tempo de resposta e a mesma mensagem genérica para senha errada e conta
 * inexistente. Errar o formato não abre porta nenhuma: dá o mesmo "inválido" de
 * sempre.
 */
export default function Entrar({ t }: Readonly<{ t: Messages["inscricao"] }>) {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setEnviando(true);

    const valor = identificador.trim();
    const ehJogador = valor.includes("@");

    try {
      const resposta = await fetch(ehJogador ? "/api/conta/login" : "/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          ehJogador ? { email: valor, senha } : { username: valor, password: senha },
        ),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as { error?: string };

      if (resposta.ok) {
        avisarSessaoMudou();
        // Navegação de página inteira: o cabeçalho e as telas com sessão precisam ser
        // remontados com o cookie novo.
        window.location.assign(ehJogador ? "/minha-inscricao" : "/admin");
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
    <form onSubmit={entrar} className="lob-card-2 lob-fade" style={{ padding: "30px 28px" }}>
      <Campo label={t.entrarIdentificador} ajuda={t.entrarIdentificadorAjuda}>
        <input
          style={entrada}
          type="text"
          // `username` e não `email`: o gerenciador de senhas precisa saber que este
          // campo aceita as duas coisas, senão sugere só endereços de e-mail.
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          value={identificador}
          placeholder={t.entrarIdentificadorPlaceholder}
          onChange={(e) => setIdentificador(e.target.value)}
        />
      </Campo>

      <div style={{ height: 16 }} />

      <Campo label={t.senhaLoginLabel}>
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

function Campo({
  label,
  ajuda,
  children,
}: Readonly<{ label: string; ajuda?: string; children: React.ReactNode }>) {
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
      {ajuda ? (
        <span style={{ display: "block", marginTop: 6, fontSize: 11.5, color: "var(--lob-muted)" }}>
          {ajuda}
        </span>
      ) : null}
    </label>
  );
}
