"use client";

import { useId, useState } from "react";
import Link from "next/link";

import { Campo, entrada } from "@/components/inscricao/entrar";
import { navegarPara } from "@/components/inscricao/navegar";
import type { Messages } from "@/lib/i18n/messages";
import { avisarSessaoMudou } from "@/lib/sessao-mudou";

type Rotulos = Messages["inscricao"];

/**
 * Troca de senha pelo próprio jogador (POST /api/conta/senha).
 *
 * Existe por causa da recuperação de senha: o site não envia e-mail, então quem esquece a
 * senha pede à organização, que gera uma PROVISÓRIA pelo painel. Enquanto ela valer, quem a
 * gerou também entra na conta — inclusive para escolher no draft. A rota de troca já
 * existia, mas nenhuma tela a chamava: o aviso «Troque sua senha» ficava ligado para sempre
 * e a provisória nunca deixava de valer (INS-01).
 *
 * ⚠ A troca é COBRADA, nunca exigida à força: a sessão de quem está com a provisória vale
 * normalmente no resto do site, e esta tela oferece «Agora não». No dia do draft, um
 * capitão que entrou com a provisória precisa chegar ao painel dele antes da vez.
 */

// ---------------------------------------------------------------- regras (puras)

/**
 * A mesma regra de `motivoDeSenhaFraca` (lib/security/password.ts), conferida ANTES de
 * enviar e dita no idioma da tela. Repetida aqui porque aquele módulo usa node:crypto e não
 * vem para o navegador; um teste compara as duas. O servidor confere de novo — esta é só a
 * cortesia de não esperar a ida e volta para saber que faltou um número.
 */
export function problemaDaSenhaNova(
  t: Rotulos,
  campos: Readonly<{ atual: string; nova: string; confirmacao: string }>,
): string | null {
  const { atual, nova, confirmacao } = campos;
  if (nova.length < 12) return t.erros.senha_curta;
  if (nova.length > 200) return t.erros.senha_longa;
  if (!/[a-zA-Z]/.test(nova) || !/[0-9]/.test(nova)) return t.erros.senha_fraca;
  if (nova !== confirmacao) return t.contaSenhaNaoConfere;
  if (nova === atual) return t.contaSenhaIgual;
  return null;
}

/** O corpo que a rota devolve (ver o contrato em app/api/conta/senha/route.ts). */
export type CorpoDaTroca = {
  ok?: boolean;
  entrarDeNovo?: boolean;
  error?: string;
  codigo?: string;
  ref?: string;
  problemas?: { campo?: string; mensagem?: string }[];
};

export type DesfechoDaTroca =
  /** Senha trocada, e este navegador já tem a sessão nova. */
  | { tipo: "pronto" }
  /** Senha trocada, mas a sessão nova falhou: é só entrar de novo com a senha nova. */
  | { tipo: "entrar_de_novo" }
  /** A sessão não vale mais (venceu, ou a conta mudou no meio): a saída é entrar de novo. */
  | { tipo: "sem_sessao"; mensagem: string }
  /** Erro que a pessoa resolve aqui mesmo (senha atual errada, espere, tente de novo). */
  | { tipo: "erro"; mensagem: string };

/** Texto fixo das duas respostas 401 da rota — a que tem sessão e a que não tem. */
const SENHA_ATUAL_INCORRETA_PT = "Senha atual incorreta.";

/**
 * O que fazer com a resposta da rota, no idioma da tela.
 *
 * O texto da rota é fixo em português; a tela traduz pelo `codigo` quando a rota mandar um
 * que o dicionário conhece, e pelo status no resto. O 401 tem dois sentidos na rota (sem
 * sessão / senha atual errada) e só o texto os separa enquanto não houver código.
 */
export function desfechoDaTroca(
  t: Rotulos,
  status: number,
  corpo: CorpoDaTroca,
  retryAfter: string | null,
): DesfechoDaTroca {
  if (status >= 200 && status < 300 && corpo.ok) {
    return corpo.entrarDeNovo ? { tipo: "entrar_de_novo" } : { tipo: "pronto" };
  }

  // A conta mudou entre a leitura e a gravação (a organização gerou uma provisória no
  // meio): a sessão daqui já caiu com ela.
  if (status === 409) return { tipo: "sem_sessao", mensagem: t.contaSenhaContaMudou };

  if (status === 401) {
    const senhaErrada = corpo.codigo === "senha_atual_incorreta" || corpo.error === SENHA_ATUAL_INCORRETA_PT;
    return senhaErrada
      ? { tipo: "erro", mensagem: t.contaSenhaAtualIncorreta }
      : { tipo: "sem_sessao", mensagem: t.contaSenhaSessaoAcabou };
  }
  // 404: a conta da sessão não existe mais.
  if (status === 404) return { tipo: "sem_sessao", mensagem: t.contaSenhaSessaoAcabou };

  if (status === 429) {
    const segundos = Number(retryAfter);
    return {
      tipo: "erro",
      mensagem:
        Number.isFinite(segundos) && segundos > 0
          ? t.contaSenhaEspere.replace("{minutos}", String(Math.ceil(segundos / 60)))
          : t.erros.muitas_tentativas,
    };
  }

  if (corpo.codigo && Object.hasOwn(t.erros, corpo.codigo)) {
    return { tipo: "erro", mensagem: t.erros[corpo.codigo as keyof Rotulos["erros"]] };
  }

  if (status === 400) {
    const problemas = (corpo.problemas ?? []).map((p) => p.mensagem).filter(Boolean);
    return { tipo: "erro", mensagem: problemas.length ? problemas.join(" ") : (corpo.error ?? t.contaSenhaErro) };
  }

  // 500 e afins: a mensagem da rota é genérica e em português; o `ref` ajuda a organização
  // a achar o erro no log.
  return { tipo: "erro", mensagem: corpo.ref ? `${t.contaSenhaErro} (ref ${corpo.ref})` : t.contaSenhaErro };
}

// ---------------------------------------------------------------- tela

export default function TrocarSenha({
  t,
  obrigatoria,
  email,
  volta = null,
}: Readonly<{
  t: Rotulos;
  /** A organização gerou uma provisória (`must_change_password`): a tela explica o porquê. */
  obrigatoria: boolean;
  /** Vai num campo oculto para o gerenciador de senhas saber de qual conta é a senha nova. */
  email: string;
  /** Para onde seguir depois — já conferido pela página contra a lista fechada. */
  volta?: string | null;
}>) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [semSessao, setSemSessao] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const regraId = useId();
  const ajudaDaAtualId = useId();

  const destino = volta ?? "/minha-inscricao";
  const entrar = volta ? `/entrar?volta=${volta}` : "/entrar";

  async function trocar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const problema = problemaDaSenhaNova(t, { atual, nova, confirmacao });
    if (problema) {
      setErro(problema);
      return;
    }

    setEnviando(true);
    try {
      const resposta = await fetch("/api/conta/senha", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual: atual, senhaNova: nova }),
      });
      const corpo = (await resposta.json().catch(() => ({}))) as CorpoDaTroca;
      const desfecho = desfechoDaTroca(t, resposta.status, corpo, resposta.headers.get("Retry-After"));

      switch (desfecho.tipo) {
        case "pronto":
          // O cabeçalho tira o «Troque sua senha» sem precisar de F5.
          avisarSessaoMudou();
          setPronto(true);
          break;
        case "entrar_de_novo":
          avisarSessaoMudou();
          navegarPara(entrar);
          break;
        case "sem_sessao":
          avisarSessaoMudou();
          setSemSessao(desfecho.mensagem);
          break;
        case "erro":
          setErro(desfecho.mensagem);
          break;
      }
    } catch {
      setErro(t.contaSenhaErro);
    } finally {
      setEnviando(false);
    }
  }

  if (pronto) {
    return (
      <div className="lob-card-2" style={{ padding: "30px 28px" }}>
        <p role="status" style={{ ...aviso, ...avisoOk, margin: 0 }}>
          {t.contaSenhaPronto}
        </p>
        <Link href={destino} className="lob-btn-gold" style={{ display: "flex", width: "100%", marginTop: 20 }}>
          {t.contaSenhaContinuar}
        </Link>
      </div>
    );
  }

  if (semSessao) {
    return (
      <div className="lob-card-2" style={{ padding: "30px 28px" }}>
        <p role="alert" style={{ ...aviso, ...avisoErro, margin: 0 }}>
          {semSessao}
        </p>
        <Link href={entrar} className="lob-btn-gold" style={{ display: "flex", width: "100%", marginTop: 20 }}>
          {t.contaSenhaEntrarDeNovo}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={trocar} className="lob-card-2 lob-fade" style={{ padding: "30px 28px" }}>
      {obrigatoria ? <p style={{ ...aviso, ...avisoAtencao, margin: "0 0 20px" }}>{t.contaSenhaObrigatoria}</p> : null}

      {/* Sem isto o gerenciador de senhas guarda a senha nova sem saber de qual conta é. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

      <Campo
        label={t.contaSenhaAtualLabel}
        ajuda={obrigatoria ? t.contaSenhaAtualAjuda : undefined}
        ajudaId={obrigatoria ? ajudaDaAtualId : undefined}
      >
        <input
          style={entrada}
          type="password"
          autoComplete="current-password"
          aria-describedby={obrigatoria ? ajudaDaAtualId : undefined}
          required
          value={atual}
          onChange={(e) => setAtual(e.target.value)}
        />
      </Campo>

      <div style={{ height: 16 }} />

      {/* A regra vem ANTES de errar, e o leitor de tela a ouve ao chegar no campo. */}
      <Campo label={t.contaSenhaNovaLabel} ajuda={t.contaSenhaRegra} ajudaId={regraId}>
        <input
          style={entrada}
          type="password"
          autoComplete="new-password"
          required
          aria-describedby={regraId}
          value={nova}
          onChange={(e) => setNova(e.target.value)}
        />
      </Campo>

      <div style={{ height: 16 }} />

      <Campo label={t.contaSenhaConfirmarLabel}>
        <input
          style={entrada}
          type="password"
          autoComplete="new-password"
          required
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
      </Campo>

      {erro ? (
        <p role="alert" style={{ ...aviso, ...avisoErro, margin: "16px 0 0" }}>
          {erro}
        </p>
      ) : null}

      <button type="submit" className="lob-btn-gold" disabled={enviando} style={{ marginTop: 20, width: "100%" }}>
        {enviando ? t.contaSenhaEnviando : t.contaSenhaBotao}
      </button>

      {obrigatoria ? (
        <p style={{ margin: "16px 0 0", textAlign: "center" }}>
          <Link href={destino} style={{ color: "var(--lob-muted)", fontSize: 13 }}>
            {t.contaSenhaAgoraNao}
          </Link>
        </p>
      ) : null}
    </form>
  );
}

const aviso: React.CSSProperties = {
  padding: "11px 13px",
  borderRadius: 6,
  fontSize: 13,
  lineHeight: 1.5,
};
const avisoErro: React.CSSProperties = {
  border: "1px solid rgba(212,87,74,.45)",
  background: "rgba(212,87,74,.12)",
  color: "#f0a79e",
};
const avisoAtencao: React.CSSProperties = {
  border: "1px solid rgba(224,163,58,.4)",
  background: "rgba(224,163,58,.1)",
  color: "#f3d69a",
};
const avisoOk: React.CSSProperties = {
  border: "1px solid rgba(70,214,200,.4)",
  background: "rgba(70,214,200,.1)",
  color: "#9be8df",
};
