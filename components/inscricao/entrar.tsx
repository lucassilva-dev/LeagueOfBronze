"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";

import { caminhoDaTrocaDeSenha, navegarPara } from "@/components/inscricao/navegar";
import { destinoDeVolta } from "@/lib/destino-de-volta";
import type { Messages } from "@/lib/i18n/messages";
import { avisarSessaoMudou } from "@/lib/sessao-mudou";

/** O que `GET /api/sessao` devolve — só o que esta tela usa. */
type SessaoDoSite = {
  jogador: { precisaTrocarSenha?: boolean } | null;
  organizacao: unknown;
};

/**
 * Para onde vai o JOGADOR que acabou de entrar (ou que já estava dentro): a troca de senha,
 * quando a organização gerou uma provisória; senão o `?volta=` conferido pela lista fechada
 * (lib/destino-de-volta.ts), ou a própria inscrição. A troca leva o destino junto, para a
 * pessoa seguir para ele depois de trocar — ou sem trocar: a troca cobra, mas não tranca.
 */
export function destinoDoJogador(volta: string | null | undefined, precisaTrocarSenha?: boolean): string {
  const conferida = destinoDeVolta(volta);
  return precisaTrocarSenha ? caminhoDaTrocaDeSenha(conferida) : (conferida ?? "/minha-inscricao");
}

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
export default function Entrar({
  t,
  volta = null,
}: Readonly<{
  t: Messages["inscricao"];
  /**
   * Para onde o JOGADOR volta depois de entrar — já conferido pela página contra uma lista
   * fechada. O capitão que perdeu a sessão no dia do draft chega aqui vindo de /capitao e
   * precisa voltar para lá, não para a ficha de inscrição.
   */
  volta?: string | null;
}>) {
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const ajudaDoIdentificador = useId();

  /*
   * INS-18 — a sessão que a PÁGINA não viu.
   *
   * O cookie das contas é SameSite=Strict: quem chega a /entrar por um link de outro site
   * (WhatsApp Web, Discord no navegador) já logado não manda o cookie nessa navegação, e
   * a página — que decide pela sessão lida no servidor — mostra o formulário de login a
   * quem já está dentro. Um fetch daqui é da mesma origem e leva o cookie: se ele disser
   * que há sessão, segue para onde a página teria mandado (organização primeiro, como lá).
   * Na falha, nada muda: o formulário continua aqui.
   */
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const r = await fetch("/api/sessao", { cache: "no-store" });
        if (!r.ok) return;
        const sessao = (await r.json()) as SessaoDoSite;
        if (!vivo) return;
        if (sessao.organizacao) navegarPara("/admin");
        else if (sessao.jogador) navegarPara(destinoDoJogador(volta, sessao.jogador.precisaTrocarSenha));
      } catch {
        // Silêncio proposital: sem resposta, a pessoa entra pelo formulário como sempre.
      }
    })();
    return () => {
      vivo = false;
    };
  }, [volta]);

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
      const corpo = (await resposta.json().catch(() => ({}))) as {
        error?: string;
        codigo?: string;
        jogador?: { mustChangePassword?: boolean };
      };

      if (resposta.ok) {
        avisarSessaoMudou();
        // Navegação de página inteira: o cabeçalho e as telas com sessão precisam ser
        // remontados com o cookie novo. Jogador com senha provisória vai direto trocá-la.
        navegarPara(ehJogador ? destinoDoJogador(volta, corpo.jogador?.mustChangePassword) : "/admin");
        return;
      }
      // Pelo código, quando a rota manda um que o dicionário conhece: o texto dela é fixo
      // em português.
      const traduzido =
        corpo.codigo && Object.hasOwn(t.erros, corpo.codigo)
          ? t.erros[corpo.codigo as keyof Messages["inscricao"]["erros"]]
          : undefined;
      setErro(traduzido ?? corpo.error ?? t.erroGenerico);
    } catch {
      setErro(t.erroGenerico);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="lob-card-2 lob-fade" style={{ padding: "30px 28px" }}>
      <Campo label={t.entrarIdentificador} ajuda={t.entrarIdentificadorAjuda} ajudaId={ajudaDoIdentificador}>
        <input
          style={entrada}
          type="text"
          aria-describedby={ajudaDoIdentificador}
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

      {/* O site não envia e-mail, então não existe "esqueci a senha" automático — mas a
          organização gera uma senha provisória pelo painel. Antes esta tela não dizia
          nada, e quem esqueceu a senha não sabia que tinha saída. */}
      <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--lob-muted)", lineHeight: 1.5 }}>
        {t.entrarEsqueceuSenha}
      </p>

      <p style={{ margin: "20px 0 0", fontSize: 13, color: "var(--lob-muted)" }}>
        {t.entrarSemConta}{" "}
        <Link href="/inscricao" style={{ color: "var(--lob-gold-1)" }}>
          {t.minhaIrParaInscricao}
        </Link>
      </p>
    </form>
  );
}

/** O campo de texto das telas da conta (entrar e trocar a senha), num lugar só. */
export const entrada: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  color: "var(--lob-text)",
  background: "rgba(0,0,0,.34)",
  border: "1px solid var(--lob-line)",
  borderRadius: 4,
};

export function Campo({
  label,
  ajuda,
  ajudaId,
  children,
}: Readonly<{
  label: string;
  ajuda?: string;
  /** Id da ajuda, para o campo apontar para ela com `aria-describedby`. */
  ajudaId?: string;
  children: React.ReactNode;
}>) {
  // A ajuda fica FORA do <label>: dentro, ela entrava no nome do campo, e o leitor de tela
  // lia o rótulo e a ajuda juntos como se fossem o nome (e de novo pela descrição).
  return (
    <div>
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
      {ajuda ? (
        <span id={ajudaId} style={{ display: "block", marginTop: 6, fontSize: 11.5, color: "var(--lob-muted)" }}>
          {ajuda}
        </span>
      ) : null}
    </div>
  );
}
