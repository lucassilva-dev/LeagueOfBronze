"use client";

import { useState } from "react";
import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";

/**
 * Formulário de inscrição da 4ª Edição.
 *
 * Três coisas que este componente NÃO faz, e a razão de cada uma:
 *
 * 1. NÃO calcula quantos pontos o jogador vale. O número aparece na tela porque a
 *    pessoa precisa vê-lo antes de confirmar, mas ele é recalculado no servidor a
 *    partir do elo. O formulário original do design enviava `pontos` no corpo, o que
 *    permitia declarar elo Ferro valendo 15 pontos — adulteração direta do draft.
 *
 * 2. NÃO fala com o banco. Toda escrita passa pelas nossas rotas, que validam de novo.
 *
 * 3. NÃO decide se as inscrições estão abertas. Quem decide é o servidor; aqui a
 *    janela fechada só evita mostrar um formulário que não seria aceito.
 *
 * A conta nasce junto com a inscrição, num passo só. Não é conveniência: sem dono, a
 * inscrição teria de ser reivindicada depois pelo e-mail, e como não há confirmação
 * de e-mail bastaria saber o endereço de alguém para assumir a inscrição dessa pessoa.
 */

type Rotulos = Messages["inscricao"];

export type ConfigPublica = {
  taxaCentavos: number;
  chavePix: string | null;
  prazoPagamentoDias: number;
  minRanqueadas: number;
  diasNoGrupo: number;
};

type Props = Readonly<{
  t: Rotulos;
  config: ConfigPublica;
  elos: readonly OpcaoElo[];
  /** Sessão já existente, quando a pessoa volta para completar a inscrição. */
  jogadorInicial: { displayName: string; email: string } | null;
}>;

/**
 * Elo e rota chegam prontos do servidor: `valor` é o rótulo canônico que a API
 * entende, `rotulo` é o que a pessoa lê no idioma dela. Traduzir aqui obrigaria o
 * cliente a conhecer o idioma, e mandar o texto traduzido para a API faria o
 * `resolveElo` recusar uma inscrição em inglês.
 */
export type OpcaoElo = { valor: string; rotulo: string; pts: number };
export type OpcaoRota = { valor: string; rotulo: string };

const CHAVES_ROTA = ["TOPO", "SELVA", "MEIO", "ATIRADOR", "SUPORTE"] as const;

type Problema = { campo: string; mensagem: string };

function moeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Substitui {chave} pelos valores dados — o suficiente para os textos daqui. */
function preencher(texto: string, valores: Record<string, string | number>) {
  return texto.replace(/\{(\w+)\}/g, (todo, chave) =>
    chave in valores ? String(valores[chave]) : todo,
  );
}

export default function FormularioInscricao({ t, config, elos, jogadorInicial }: Props) {
  const [passo, setPasso] = useState(1);
  const [jogador, setJogador] = useState(jogadorInicial);
  const [modoEntrar, setModoEntrar] = useState(false);

  const [nick, setNick] = useState("");
  const [tag, setTag] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState(jogadorInicial?.email ?? "");
  const [senha, setSenha] = useState("");
  const [discord, setDiscord] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  const [elo, setElo] = useState("");
  const [rota1, setRota1] = useState("");
  const [rota2, setRota2] = useState("");
  const [querCapitao, setQuerCapitao] = useState(false);

  const [aceites, setAceites] = useState([false, false, false]);
  const [problemas, setProblemas] = useState<Problema[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<string | null>(null);
  const [pixCopiado, setPixCopiado] = useState(false);

  const eloEscolhido = elos.find((e) => e.valor === elo) ?? null;
  const problemaDe = (campo: string) => problemas.find((p) => p.campo === campo)?.mensagem;

  function limparAvisos() {
    setProblemas([]);
    setErro(null);
  }

  async function postar(url: string, corpo: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dados = (await r.json().catch(() => ({}))) as {
      error?: string;
      problemas?: Problema[];
      jogador?: { displayName: string; email: string };
    };
    return { ok: r.ok, status: r.status, dados };
  }

  // ------------------------------------------------------------------ passo 1

  async function avancarDoPasso1() {
    limparAvisos();

    // Quem já tem sessão pula a criação de conta e vai direto ao passo 2.
    if (jogador) {
      setPasso(2);
      return;
    }

    setEnviando(true);
    const r = await postar("/api/conta/cadastro", { email, nome: nome.trim() || nick, senha });
    setEnviando(false);

    if (r.ok && r.dados.jogador) {
      setJogador(r.dados.jogador);
      setPasso(2);
      return;
    }

    // 409 = e-mail já cadastrado. Em vez de barrar, abrimos o login ali mesmo: é o
    // caso de quem começou a inscrição, fechou a aba e voltou depois.
    if (r.status === 409) {
      setModoEntrar(true);
      setErro(r.dados.error ?? null);
      return;
    }

    setProblemas(r.dados.problemas ?? []);
    setErro(r.dados.error ?? t.erroGenerico);
  }

  async function entrar() {
    limparAvisos();
    setEnviando(true);
    const r = await postar("/api/conta/login", { email, senha });
    setEnviando(false);

    if (r.ok && r.dados.jogador) {
      setJogador(r.dados.jogador);
      setModoEntrar(false);
      setPasso(2);
      return;
    }
    setErro(r.dados.error ?? t.erroGenerico);
  }

  // ------------------------------------------------------------------ envio

  async function enviar() {
    limparAvisos();

    if (!aceites.every(Boolean)) {
      setErro(t.aceitesFaltando);
      return;
    }

    setEnviando(true);
    // Repare no que NÃO vai no corpo: nem `pontos` nem `email`. Os dois nascem no
    // servidor — um a partir do elo, o outro a partir da sessão.
    const r = await postar("/api/inscricao", {
      nick,
      tag,
      nomeReal: nome.trim() || undefined,
      discord,
      whatsapp: whatsapp.trim() || undefined,
      elo,
      rotaPrimaria: rota1,
      rotaSecundaria: rota2,
      querCapitao,
      aceiteRegulamento: aceites[0],
      aceiteImagem: aceites[1],
      aceiteRequisitos: aceites[2],
    });
    setEnviando(false);

    if (r.ok) {
      setPronto(t.prontoTitulo);
      return;
    }
    setProblemas(r.dados.problemas ?? []);
    setErro(r.dados.error ?? t.erroGenerico);
  }

  // ------------------------------------------------------------------ recibo

  if (pronto) {
    return (
      <div className="lob-card-2 lob-fade" style={{ padding: "34px 30px", textAlign: "center" }}>
        <div className="lob-display" style={{ fontSize: 26, color: "var(--lob-gold-1)" }}>
          {t.prontoTitulo}
        </div>
        <p style={{ margin: "12px auto 22px", maxWidth: "52ch", color: "var(--lob-muted)" }}>
          {t.pagamentoAjuda}
        </p>
        <Link className="lob-btn-gold" href="/minha-inscricao">
          {t.prontoVer}
        </Link>
      </div>
    );
  }

  const passos = [t.passo1, t.passo2, t.passo3];

  return (
    <div className="lob-fade">
      <ol
        aria-label={t.titulo}
        style={{ display: "flex", gap: 10, listStyle: "none", margin: "0 0 22px", padding: 0, flexWrap: "wrap" }}
      >
        {passos.map((rotulo, i) => {
          const n = i + 1;
          const atual = n === passo;
          return (
            <li key={rotulo} style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 180px" }}>
              <span
                aria-hidden
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  fontSize: 12,
                  fontWeight: 700,
                  color: atual ? "#160f06" : "var(--lob-muted)",
                  background: atual ? "var(--lob-gold-1)" : "transparent",
                  border: `1px solid ${atual ? "transparent" : "var(--lob-line)"}`,
                }}
              >
                {n}
              </span>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: ".18em",
                  color: atual ? "var(--lob-text)" : "var(--lob-muted)",
                }}
              >
                {rotulo}
              </span>
              <span aria-hidden style={{ flex: 1, height: 1, background: "var(--lob-line)" }} />
            </li>
          );
        })}
      </ol>

      <div className="lob-card-2" style={{ padding: "26px 24px" }}>
        {passo === 1 && (
          <Passo1
            t={t}
            jogador={jogador}
            modoEntrar={modoEntrar}
            campos={{ nick, tag, nome, email, senha, discord, whatsapp }}
            setters={{ setNick, setTag, setNome, setEmail, setSenha, setDiscord, setWhatsapp }}
            problemaDe={problemaDe}
            onEntrarModo={() => {
              limparAvisos();
              setModoEntrar((v) => !v);
            }}
          />
        )}

        {passo === 2 && (
          <Passo2
            t={t}
            elos={elos}
            elo={elo}
            rota1={rota1}
            rota2={rota2}
            querCapitao={querCapitao}
            setElo={setElo}
            setRota1={setRota1}
            setRota2={setRota2}
            setQuerCapitao={setQuerCapitao}
            problemaDe={problemaDe}
          />
        )}

        {passo === 3 && (
          <Passo3
            t={t}
            config={config}
            resumo={{
              riotId: `${nick}#${tag.toUpperCase()}`,
              elo: eloEscolhido?.rotulo ?? "",
              rota1: rota1 ? t.rotas[rota1 as keyof typeof t.rotas] : "",
              rota2: rota2 ? t.rotas[rota2 as keyof typeof t.rotas] : "",
            }}
            pontos={eloEscolhido?.pts ?? null}
            aceites={aceites}
            setAceites={setAceites}
            pixCopiado={pixCopiado}
            onCopiarPix={async () => {
              if (!config.chavePix) return;
              try {
                await navigator.clipboard.writeText(config.chavePix);
                setPixCopiado(true);
              } catch {
                // Sem permissão de área de transferência a chave continua visível na
                // tela para copiar à mão — não vale quebrar o fluxo por causa disso.
                setPixCopiado(false);
              }
            }}
          />
        )}

        {erro && (
          <p
            role="alert"
            style={{
              margin: "18px 0 0",
              padding: "12px 14px",
              borderRadius: 6,
              border: "1px solid rgba(212,87,74,.45)",
              background: "rgba(212,87,74,.12)",
              color: "#f0a79e",
              fontSize: 13,
            }}
          >
            {erro}
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          {passo > 1 && (
            <button type="button" className="lob-btn-ghost" onClick={() => { limparAvisos(); setPasso(passo - 1); }}>
              {t.voltar}
            </button>
          )}

          {passo === 1 && modoEntrar && (
            <button type="button" className="lob-btn-gold" onClick={entrar} disabled={enviando}>
              {enviando ? t.enviando : t.entrarBotao}
            </button>
          )}

          {passo === 1 && !modoEntrar && (
            <button type="button" className="lob-btn-gold" onClick={avancarDoPasso1} disabled={enviando}>
              {enviando ? t.enviando : t.continuar}
            </button>
          )}

          {passo === 2 && (
            <button type="button" className="lob-btn-gold" onClick={() => { limparAvisos(); setPasso(3); }}>
              {t.continuar}
            </button>
          )}

          {passo === 3 && (
            <button type="button" className="lob-btn-gold" onClick={enviar} disabled={enviando}>
              {enviando ? t.enviando : t.enviar}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- peças

function Campo({
  label,
  hint,
  erro,
  children,
}: Readonly<{ label: string; hint?: string; erro?: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
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
      {erro ? (
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, color: "#f0a79e" }}>{erro}</span>
      ) : hint ? (
        <span style={{ display: "block", marginTop: 5, fontSize: 11.5, color: "var(--lob-muted)" }}>{hint}</span>
      ) : null}
    </label>
  );
}

const entradaEstilo: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  fontFamily: "inherit",
  fontSize: 14,
  color: "var(--lob-text)",
  background: "rgba(0,0,0,.34)",
  border: "1px solid var(--lob-line)",
  borderRadius: 4,
  minWidth: 0,
};

function Grade({ children, colunas = "1fr 1fr" }: Readonly<{ children: React.ReactNode; colunas?: string }>) {
  return (
    <div style={{ display: "grid", gap: 16, gridTemplateColumns: colunas, marginBottom: 16 }}>{children}</div>
  );
}

function Passo1({
  t,
  jogador,
  modoEntrar,
  campos,
  setters,
  problemaDe,
  onEntrarModo,
}: Readonly<{
  t: Rotulos;
  jogador: { displayName: string; email: string } | null;
  modoEntrar: boolean;
  campos: Record<"nick" | "tag" | "nome" | "email" | "senha" | "discord" | "whatsapp", string>;
  setters: Record<string, (v: string) => void>;
  problemaDe: (campo: string) => string | undefined;
  onEntrarModo: () => void;
}>) {
  if (modoEntrar) {
    return (
      <>
        <h2 className="lob-display" style={{ fontSize: 20, margin: "0 0 6px", color: "var(--lob-text)" }}>
          {t.entrarTitulo}
        </h2>
        <p style={{ margin: "0 0 18px", fontSize: 13, color: "var(--lob-muted)" }}>{t.entrarAjuda}</p>
        <Grade>
          <Campo label={t.emailLabel}>
            <input
              style={entradaEstilo}
              type="email"
              autoComplete="email"
              value={campos.email}
              onChange={(e) => setters.setEmail(e.target.value)}
            />
          </Campo>
          <Campo label={t.senhaLabel}>
            <input
              style={entradaEstilo}
              type="password"
              autoComplete="current-password"
              value={campos.senha}
              onChange={(e) => setters.setSenha(e.target.value)}
            />
          </Campo>
        </Grade>
        <button type="button" className="lob-btn-ghost" onClick={onEntrarModo} style={{ fontSize: 12 }}>
          ←
        </button>
      </>
    );
  }

  return (
    <>
      <Grade colunas="1fr 120px">
        <Campo label={t.nickLabel} erro={problemaDe("nick")}>
          <input
            style={entradaEstilo}
            value={campos.nick}
            placeholder={t.nickPlaceholder}
            onChange={(e) => setters.setNick(e.target.value)}
          />
        </Campo>
        <Campo label={t.tagLabel} erro={problemaDe("tag")}>
          <input
            style={entradaEstilo}
            value={campos.tag}
            placeholder={t.tagPlaceholder}
            onChange={(e) => setters.setTag(e.target.value)}
          />
        </Campo>
      </Grade>
      <p style={{ margin: "-6px 0 18px", fontSize: 12, color: "var(--lob-muted)" }}>{t.riotAjuda}</p>

      {jogador ? (
        <p
          style={{
            margin: "0 0 18px",
            padding: "10px 13px",
            borderRadius: 6,
            border: "1px solid var(--lob-line)",
            fontSize: 13,
            color: "var(--lob-muted)",
          }}
        >
          {t.logadoComo} <strong style={{ color: "var(--lob-text)" }}>{jogador.email}</strong>
        </p>
      ) : (
        <>
          <Grade>
            <Campo label={t.emailLabel} erro={problemaDe("email")}>
              <input
                style={entradaEstilo}
                type="email"
                autoComplete="email"
                value={campos.email}
                placeholder={t.emailPlaceholder}
                onChange={(e) => setters.setEmail(e.target.value)}
              />
            </Campo>
            <Campo label={t.senhaLabel} erro={problemaDe("senha")}>
              <input
                style={entradaEstilo}
                type="password"
                autoComplete="new-password"
                value={campos.senha}
                onChange={(e) => setters.setSenha(e.target.value)}
              />
            </Campo>
          </Grade>
          <p style={{ margin: "-6px 0 10px", fontSize: 12, color: "var(--lob-muted)" }}>{t.contaAjuda}</p>
          <button
            type="button"
            onClick={onEntrarModo}
            style={{
              margin: "0 0 18px",
              padding: 0,
              border: 0,
              background: "none",
              color: "var(--lob-gold-1)",
              fontFamily: "inherit",
              fontSize: 12.5,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            {t.jaTenhoConta}
          </button>
        </>
      )}

      <Grade>
        <Campo label={t.discordLabel} erro={problemaDe("discord")}>
          <input
            style={entradaEstilo}
            value={campos.discord}
            placeholder={t.discordPlaceholder}
            onChange={(e) => setters.setDiscord(e.target.value)}
          />
        </Campo>
        <Campo label={t.whatsappLabel} hint={t.whatsappAjuda} erro={problemaDe("whatsapp")}>
          <input
            style={entradaEstilo}
            value={campos.whatsapp}
            placeholder={t.whatsappPlaceholder}
            onChange={(e) => setters.setWhatsapp(e.target.value)}
          />
        </Campo>
      </Grade>

      <Campo label={t.nomeLabel} erro={problemaDe("nomeReal")}>
        <input
          style={entradaEstilo}
          value={campos.nome}
          placeholder={t.nomePlaceholder}
          onChange={(e) => setters.setNome(e.target.value)}
        />
      </Campo>
    </>
  );
}

function Passo2({
  t,
  elos,
  elo,
  rota1,
  rota2,
  querCapitao,
  setElo,
  setRota1,
  setRota2,
  setQuerCapitao,
  problemaDe,
}: Readonly<{
  t: Rotulos;
  elos: readonly OpcaoElo[];
  elo: string;
  rota1: string;
  rota2: string;
  querCapitao: boolean;
  setElo: (v: string) => void;
  setRota1: (v: string) => void;
  setRota2: (v: string) => void;
  setQuerCapitao: (v: boolean) => void;
  problemaDe: (campo: string) => string | undefined;
}>) {
  const rotasIguais = rota1 !== "" && rota1 === rota2;

  return (
    <>
      <Campo label={t.eloLabel} hint={t.eloAjuda} erro={problemaDe("elo")}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
          {elos.map((e) => {
            const ativo = elo === e.valor;
            return (
              <button
                key={e.valor}
                type="button"
                onClick={() => setElo(e.valor)}
                aria-pressed={ativo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  color: ativo ? "var(--lob-text)" : "var(--lob-muted)",
                  background: ativo ? "rgba(201,138,75,.16)" : "rgba(0,0,0,.28)",
                  border: `1px solid ${ativo ? "var(--lob-gold-1)" : "var(--lob-line)"}`,
                }}
              >
                {e.rotulo}
                <span style={{ fontVariantNumeric: "tabular-nums", color: "var(--lob-bronze)" }}>{e.pts}</span>
              </button>
            );
          })}
        </div>
      </Campo>

      <div style={{ height: 18 }} />

      <Grade>
        <Campo label={t.rota1Label} erro={problemaDe("rotaPrimaria")}>
          <select style={entradaEstilo} value={rota1} onChange={(e) => setRota1(e.target.value)}>
            <option value="">—</option>
            {CHAVES_ROTA.map((chave) => (
              <option key={chave} value={chave}>
                {t.rotas[chave]}
              </option>
            ))}
          </select>
        </Campo>
        <Campo
          label={t.rota2Label}
          erro={rotasIguais ? t.rotasIguais : problemaDe("rotaSecundaria")}
        >
          <select style={entradaEstilo} value={rota2} onChange={(e) => setRota2(e.target.value)}>
            <option value="">—</option>
            {CHAVES_ROTA.map((chave) => (
              <option key={chave} value={chave}>
                {t.rotas[chave]}
              </option>
            ))}
          </select>
        </Campo>
      </Grade>

      <label style={{ display: "flex", alignItems: "flex-start", gap: 11, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={querCapitao}
          onChange={(e) => setQuerCapitao(e.target.checked)}
          style={{ marginTop: 3, width: 17, height: 17, accentColor: "var(--lob-gold-1)" }}
        />
        <span>
          <span style={{ display: "block", fontSize: 13.5, color: "var(--lob-text)" }}>{t.capitaoLabel}</span>
          <span style={{ display: "block", marginTop: 3, fontSize: 12, color: "var(--lob-muted)" }}>
            {t.capitaoAjuda}
          </span>
        </span>
      </label>
    </>
  );
}

function Passo3({
  t,
  config,
  resumo,
  pontos,
  aceites,
  setAceites,
  pixCopiado,
  onCopiarPix,
}: Readonly<{
  t: Rotulos;
  config: ConfigPublica;
  resumo: { riotId: string; elo: string; rota1: string; rota2: string };
  pontos: number | null;
  aceites: boolean[];
  setAceites: (v: boolean[]) => void;
  pixCopiado: boolean;
  onCopiarPix: () => void;
}>) {
  const meses = Math.max(1, Math.round(config.diasNoGrupo / 30));
  const textos = [
    t.aceite1,
    t.aceite2,
    preencher(t.aceite3, {
      meses: `${meses} ${meses === 1 ? "mês" : "meses"}`,
      partidas: config.minRanqueadas,
    }),
  ];

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          padding: "16px 18px",
          borderRadius: 8,
          border: "1px solid var(--lob-line)",
          background: "rgba(0,0,0,.24)",
        }}
      >
        <div>
          <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>{t.resumoTitulo}</div>
          <div className="lob-display" style={{ fontSize: 20, color: "var(--lob-text)", marginTop: 4 }}>
            {resumo.riotId}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--lob-muted)", marginTop: 2 }}>
            {[resumo.elo, resumo.rota1, resumo.rota2].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>{t.valorLabel}</div>
          <div
            className="lob-display"
            style={{ fontSize: 30, color: "var(--lob-gold-1)", fontVariantNumeric: "tabular-nums" }}
          >
            {pontos ?? "—"}
          </div>
          <div style={{ fontSize: 10, letterSpacing: ".18em", color: "var(--lob-muted)" }}>{t.pontosSufixo}</div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div style={{ padding: "16px 18px", borderRadius: 8, border: "1px solid var(--lob-line)" }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>
          {t.taxaTitulo} — {moeda(config.taxaCentavos)}
        </div>
        <p style={{ margin: "8px 0 14px", fontSize: 12.5, color: "var(--lob-muted)" }}>{t.taxaTexto}</p>

        {config.chavePix ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 220px", minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>{t.pixLabel}</div>
              <div style={{ marginTop: 4, fontSize: 15, color: "var(--lob-text)", overflowWrap: "anywhere" }}>
                {config.chavePix}
              </div>
            </div>
            <button type="button" className="lob-btn-ghost" onClick={onCopiarPix}>
              {pixCopiado ? t.pixCopiado : t.pixCopiar}
            </button>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--lob-muted)" }}>{t.pixIndisponivel}</p>
        )}

        <p style={{ margin: "14px 0 0", fontSize: 12.5, color: "var(--lob-muted)" }}>{t.pagamentoAjuda}</p>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--lob-muted)" }}>
          {preencher(t.prazoAviso, { dias: config.prazoPagamentoDias })}
        </p>
      </div>

      <div style={{ height: 16 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {textos.map((texto, i) => (
          <label
            key={texto}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 11,
              padding: "12px 14px",
              borderRadius: 8,
              cursor: "pointer",
              border: `1px solid ${aceites[i] ? "rgba(70,214,200,.45)" : "var(--lob-line)"}`,
              background: aceites[i] ? "rgba(70,214,200,.08)" : "rgba(0,0,0,.2)",
            }}
          >
            <input
              type="checkbox"
              checked={aceites[i]}
              onChange={(e) => setAceites(aceites.map((v, j) => (j === i ? e.target.checked : v)))}
              style={{ marginTop: 2, width: 17, height: 17, accentColor: "var(--lob-teal)" }}
            />
            <span style={{ fontSize: 13, lineHeight: 1.55, color: "var(--lob-muted)" }}>{texto}</span>
          </label>
        ))}
      </div>
    </>
  );
}
