"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Messages } from "@/lib/i18n/messages";

/**
 * Indicador de sessão no cabeçalho.
 *
 * Duas sessões independentes convivem — organização e jogador — e podem estar ativas
 * ao mesmo tempo no mesmo navegador. Até agora nada no site dizia em qual a pessoa
 * estava: só entrando em /admin e vendo se pedia senha. No dia do draft isso deixa de
 * ser conveniência: o capitão precisa saber que está logado ANTES de a vez dele
 * chegar, não descobrir com o relógio correndo.
 *
 * BUSCA NO CLIENTE, de propósito. Ler a sessão no servidor daria um cabeçalho já
 * pronto, sem o instante de "deslogado", mas colocaria o BANCO no caminho de toda
 * página — inclusive das que não precisam dele. Este site já ficou fora do ar uma vez
 * porque o Supabase pausou; o cabeçalho não vai ser mais um motivo. Se a busca falhar,
 * o indicador simplesmente não aparece e o resto do site continua de pé.
 */

type Rotulos = Messages["comum"];

type Sessao = {
  jogador: { nome: string; temInscricao: boolean; precisaTrocarSenha: boolean } | null;
  organizacao: { nome: string; master: boolean } | null;
};

const COR = {
  texto: "#f3ece0",
  suave: "#a99e8b",
  fraco: "#6f6656",
  linha: "rgba(201,138,75,.28)",
  ouro: "#e8b878",
  jogador: "#46d6c8",
  painel: "#15100a",
};

export function SessaoNoCabecalho({ t }: Readonly<{ t: Rotulos }>) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [aberto, setAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const caixa = useRef<HTMLDivElement | null>(null);
  const caminho = usePathname();

  /**
   * Busca e DEVOLVE — não escreve estado.
   *
   * Quem chama decide o que fazer com o resultado. Além de o lint cobrar isso
   * (`react-hooks/set-state-in-effect`), separar evita o problema real: uma resposta
   * que chega depois de o componente sair da tela não tem mais onde ser escrita.
   */
  const buscar = useCallback(async (): Promise<Sessao | null> => {
    try {
      const r = await fetch("/api/sessao", { cache: "no-store" });
      if (!r.ok) return null;
      return (await r.json()) as Sessao;
    } catch {
      // Silêncio proposital: sem sessão legível, o cabeçalho fica como estava.
      return null;
    }
  }, []);

  // Recarrega ao trocar de rota: entrar ou sair acontece numa página, e o indicador
  // precisa acompanhar sem exigir F5.
  useEffect(() => {
    let vivo = true;
    void buscar().then((s) => {
      if (vivo && s) setSessao(s);
    });
    return () => {
      vivo = false;
    };
  }, [buscar, caminho]);

  // Fecha ao clicar fora e no ESC — menu que só fecha no próprio botão irrita.
  useEffect(() => {
    if (!aberto) return;
    const forA = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAberto(false);
    };
    document.addEventListener("mousedown", forA);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", forA);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  async function sair() {
    setSaindo(true);
    // Sai das DUAS: se a pessoa está nas duas e clica em sair, deixar uma de pé seria
    // exatamente o tipo de estado ambíguo que este componente existe para acabar.
    await Promise.allSettled([
      fetch("/api/conta/logout", { method: "POST" }),
      fetch("/api/admin/logout", { method: "POST" }),
    ]);
    setSaindo(false);
    setAberto(false);
    setSessao(await buscar());
    // Recarrega a página: o painel e as telas com sessão precisam refletir a saída.
    window.location.assign("/");
  }

  // Enquanto a primeira busca não volta, nada é desenhado — piscar "entrar" e depois
  // trocar para o nome é pior do que aparecer um instante depois.
  if (!sessao) return null;

  return (
    <IndicadorDeSessao
      t={t}
      sessao={sessao}
      aberto={aberto}
      saindo={saindo}
      caixa={caixa}
      onAlternar={() => setAberto((v) => !v)}
      onFechar={() => setAberto(false)}
      onSair={() => void sair()}
    />
  );
}

/**
 * O DESENHO, separado da busca.
 *
 * Puro: recebe a sessão por prop e não fala com a rede. É o que permite testar os
 * quatro estados que importam — deslogado, jogador, organização, e as duas ao mesmo
 * tempo — sem navegador e sem senha.
 */
export function IndicadorDeSessao({
  t,
  sessao,
  aberto,
  saindo,
  caixa,
  onAlternar,
  onFechar,
  onSair,
}: Readonly<{
  t: Rotulos;
  sessao: Sessao;
  aberto: boolean;
  saindo: boolean;
  caixa?: React.RefObject<HTMLDivElement | null>;
  onAlternar: () => void;
  onFechar: () => void;
  onSair: () => void;
}>) {
  const { jogador, organizacao } = sessao;
  const logado = Boolean(jogador || organizacao);

  if (!logado) {
    return (
      <Link
        href="/entrar"
        style={{
          padding: "6px 12px",
          borderRadius: 3,
          border: `1px solid ${COR.linha}`,
          color: COR.suave,
          fontSize: 10.5,
          letterSpacing: ".16em",
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}
      >
        {t.sessaoEntrar}
      </Link>
    );
  }

  const principal = jogador?.nome ?? organizacao?.nome ?? "";
  const inicial = principal.trim().charAt(0).toUpperCase() || "?";
  const corDaMarca = organizacao ? COR.ouro : COR.jogador;
  const papel = organizacao
    ? organizacao.master
      ? t.sessaoMaster
      : t.sessaoOrganizacao
    : t.sessaoJogador;

  return (
    <div ref={caixa} style={{ position: "relative" }}>
      <button
        type="button"
        aria-label={t.sessaoAbrirMenu}
        aria-expanded={aberto}
        onClick={onAlternar}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "5px 9px 5px 5px",
          borderRadius: 999,
          border: `1px solid ${COR.linha}`,
          background: "rgba(201,138,75,.08)",
          color: COR.texto,
          fontFamily: "inherit",
          cursor: "pointer",
          maxWidth: 190,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "grid",
            placeItems: "center",
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: corDaMarca,
            color: "#160f06",
            fontSize: 12,
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {inicial}
        </span>
        <span
          style={{
            fontSize: 12,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {principal}
        </span>
        {/* Duas sessões ao mesmo tempo é estado legítimo e precisa ser visível. */}
        {jogador && organizacao ? (
          <span
            aria-hidden
            title={t.sessaoDuasContas}
            style={{ width: 7, height: 7, borderRadius: "50%", background: COR.ouro, flexShrink: 0 }}
          />
        ) : null}
      </button>

      {aberto ? (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 226,
            padding: 6,
            borderRadius: 6,
            border: `1px solid ${COR.linha}`,
            background: COR.painel,
            boxShadow: "0 18px 40px rgba(0,0,0,.55)",
            zIndex: 60,
          }}
        >
          <div style={{ padding: "8px 10px 10px" }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".18em", color: corDaMarca }}>{papel}</div>
            <div style={{ marginTop: 3, fontSize: 13.5, color: COR.texto }}>{principal}</div>
            {jogador && organizacao ? (
              <div style={{ marginTop: 5, fontSize: 11, color: COR.fraco, lineHeight: 1.45 }}>
                {t.sessaoDuasContas}
              </div>
            ) : null}
          </div>

          {jogador?.precisaTrocarSenha ? (
            <div
              style={{
                margin: "0 4px 6px",
                padding: "7px 9px",
                borderRadius: 4,
                border: "1px solid rgba(224,163,58,.4)",
                background: "rgba(224,163,58,.1)",
                fontSize: 11.5,
                color: "#f3d69a",
              }}
            >
              {t.sessaoTrocarSenha}
            </div>
          ) : null}

          <div style={{ height: 1, background: COR.linha, margin: "0 4px 6px" }} />

          {jogador ? (
            <>
              <ItemDoMenu href="/minha-inscricao" onIr={onFechar}>
                {jogador.temInscricao ? t.sessaoMinhaInscricao : t.sessaoFazerInscricao}
              </ItemDoMenu>
              <ItemDoMenu href="/capitao" onIr={onFechar}>
                {t.sessaoPainelCapitao}
              </ItemDoMenu>
            </>
          ) : null}

          {organizacao ? (
            <ItemDoMenu href="/admin" onIr={onFechar}>
              {t.sessaoPainelAdmin}
            </ItemDoMenu>
          ) : null}

          <div style={{ height: 1, background: COR.linha, margin: "6px 4px" }} />

          <button
            type="button"
            onClick={onSair}
            disabled={saindo}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              borderRadius: 4,
              border: 0,
              background: "none",
              color: "#f0a79e",
              fontFamily: "inherit",
              fontSize: 12.5,
              cursor: saindo ? "wait" : "pointer",
            }}
          >
            {saindo ? t.sessaoSaindo : t.sessaoSair}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ItemDoMenu({
  href,
  children,
  onIr,
}: Readonly<{ href: string; children: React.ReactNode; onIr: () => void }>) {
  return (
    <Link
      href={href}
      onClick={onIr}
      style={{
        display: "block",
        padding: "8px 10px",
        borderRadius: 4,
        color: COR.suave,
        fontSize: 12.5,
        textDecoration: "none",
      }}
    >
      {children}
    </Link>
  );
}
