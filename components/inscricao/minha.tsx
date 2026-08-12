"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import type { Messages } from "@/lib/i18n/messages";

/**
 * "Minha inscrição" — o que a organização já conferiu e o que falta.
 *
 * Busca no cliente, e não no servidor da página, por um motivo prático: o jogador
 * volta aqui várias vezes esperando a conferência mudar de estado. Recarregar a
 * página inteira para ver seis chips mudarem seria desperdício; e o dado é
 * estritamente pessoal, então nada disso pode ficar em cache de borda.
 */

type Rotulos = Messages["inscricao"];

type Conferencia = { item: string; estado: string; observacao: string | null };
type MinhaInscricao = {
  riotId: string;
  elo: string;
  pontos: number;
  rotaPrimaria: string;
  rotaSecundaria: string;
  querCapitao: boolean;
  situacao: keyof Rotulos["situacoes"];
  observacao: string | null;
  criadoEm: string;
  pagamento: { estado: keyof Rotulos["pagamentos"]; valorCentavos: number; venceEm: string | null } | null;
  conferencias: Conferencia[];
};

type Resposta = {
  jogador: { displayName: string; email: string } | null;
  inscricao: MinhaInscricao | null;
};

const TOM: Record<string, { cor: string; fundo: string; borda: string }> = {
  ok: { cor: "#9fe8e0", fundo: "rgba(70,214,200,.10)", borda: "rgba(70,214,200,.40)" },
  bom: { cor: "#9fe8e0", fundo: "rgba(70,214,200,.10)", borda: "rgba(70,214,200,.40)" },
  espera: { cor: "#b8ab97", fundo: "rgba(255,255,255,.03)", borda: "var(--lob-line)" },
  atencao: { cor: "#f3d69a", fundo: "rgba(224,163,58,.10)", borda: "rgba(224,163,58,.40)" },
  ruim: { cor: "#f0a79e", fundo: "rgba(212,87,74,.10)", borda: "rgba(212,87,74,.42)" },
};

const TOM_CONFERENCIA: Record<string, keyof typeof TOM> = {
  ok: "ok",
  excecao: "ok",
  provisorio: "atencao",
  risco: "atencao",
  pendente: "espera",
  nao_avaliavel: "espera",
  recusado: "ruim",
};

const TOM_SITUACAO: Record<string, keyof typeof TOM> = {
  apto: "ok",
  sobra: "atencao",
  pendente: "espera",
  recusado: "ruim",
  desistiu: "ruim",
};

const TOM_PAGAMENTO: Record<string, keyof typeof TOM> = {
  pago: "ok",
  isento: "ok",
  declarado: "atencao",
  aguardando: "espera",
  estorno_devido: "atencao",
  estornado: "espera",
  cancelado: "ruim",
};

function Chip({ tom, children }: Readonly<{ tom: keyof typeof TOM; children: React.ReactNode }>) {
  const c = TOM[tom] ?? TOM.espera;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 11px",
        borderRadius: 999,
        fontSize: 12,
        color: c.cor,
        background: c.fundo,
        border: `1px solid ${c.borda}`,
      }}
    >
      {children}
    </span>
  );
}

function moeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MinhaInscricaoCliente({ t }: Readonly<{ t: Rotulos }>) {
  const [dados, setDados] = useState<Resposta | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [avisando, setAvisando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/inscricao/minha", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      setDados((await r.json()) as Resposta);
      setErro(null);
    } catch {
      setErro(t.erroGenerico);
    } finally {
      setCarregando(false);
    }
  }, [t.erroGenerico]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function avisarPagamento() {
    setAvisando(true);
    const r = await fetch("/api/inscricao/pagamento", { method: "POST" });
    setAvisando(false);
    if (r.ok) {
      await carregar();
      return;
    }
    const corpo = (await r.json().catch(() => ({}))) as { error?: string };
    setErro(corpo.error ?? t.erroGenerico);
  }

  if (carregando) {
    return <p style={{ color: "var(--lob-muted)" }}>…</p>;
  }

  if (!dados?.jogador) {
    return (
      <div className="lob-card-2" style={{ padding: "28px 26px" }}>
        <p style={{ margin: "0 0 18px", color: "var(--lob-muted)" }}>{t.minhaSemConta}</p>
        <Link className="lob-btn-gold" href="/inscricao">
          {t.minhaIrParaInscricao}
        </Link>
      </div>
    );
  }

  if (!dados.inscricao) {
    return (
      <div className="lob-card-2" style={{ padding: "28px 26px" }}>
        <p style={{ margin: "0 0 18px", color: "var(--lob-muted)" }}>{t.minhaSemInscricao}</p>
        <Link className="lob-btn-gold" href="/inscricao">
          {t.minhaIrParaInscricao}
        </Link>
      </div>
    );
  }

  const i = dados.inscricao;
  const pag = i.pagamento;
  const podeAvisar = pag?.estado === "aguardando";

  return (
    <div className="lob-fade" style={{ display: "grid", gap: 16 }}>
      <div className="lob-card-2" style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="lob-display" style={{ fontSize: 24, color: "var(--lob-text)" }}>{i.riotId}</div>
            <div style={{ marginTop: 4, fontSize: 13, color: "var(--lob-muted)" }}>
              {[i.elo, t.rotas[i.rotaPrimaria as keyof typeof t.rotas] ?? i.rotaPrimaria,
                t.rotas[i.rotaSecundaria as keyof typeof t.rotas] ?? i.rotaSecundaria]
                .filter(Boolean)
                .join(" · ")}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>{t.valorLabel}</div>
            <div
              className="lob-display"
              style={{ fontSize: 28, color: "var(--lob-gold-1)", fontVariantNumeric: "tabular-nums" }}
            >
              {i.pontos}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
              {t.situacaoLabel}
            </div>
            <Chip tom={TOM_SITUACAO[i.situacao] ?? "espera"}>{t.situacoes[i.situacao] ?? i.situacao}</Chip>
          </div>
          {pag && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
                {t.pagamentoLabel}
              </div>
              <Chip tom={TOM_PAGAMENTO[pag.estado] ?? "espera"}>
                {t.pagamentos[pag.estado] ?? pag.estado} · {moeda(pag.valorCentavos)}
              </Chip>
              {pag.venceEm && pag.estado === "aguardando" && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--lob-muted)" }}>
                  {t.venceEm} {new Date(pag.venceEm).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>

        {i.observacao && (
          <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--lob-muted)" }}>{i.observacao}</p>
        )}

        {podeAvisar && (
          <div style={{ marginTop: 18 }}>
            <button type="button" className="lob-btn-gold" onClick={avisarPagamento} disabled={avisando}>
              {avisando ? t.enviando : t.jaPaguei}
            </button>
            <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "var(--lob-muted)" }}>{t.jaPagueiAjuda}</p>
          </div>
        )}
        {pag?.estado === "declarado" && (
          <p style={{ margin: "16px 0 0", fontSize: 12.5, color: "var(--lob-muted)" }}>{t.declarado}</p>
        )}
      </div>

      <div className="lob-card-2" style={{ padding: "22px 24px" }}>
        <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)" }}>
          {t.conferenciaTitulo}
        </div>
        <p style={{ margin: "8px 0 16px", fontSize: 12.5, color: "var(--lob-muted)", maxWidth: "62ch" }}>
          {t.conferenciaAjuda}
        </p>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {i.conferencias.map((c) => (
            <li
              key={c.item}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                paddingBottom: 10,
                borderBottom: "1px solid var(--lob-line)",
              }}
            >
              <div>
                <div style={{ fontSize: 13.5, color: "var(--lob-text)" }}>
                  {t.itens[c.item as keyof typeof t.itens] ?? c.item}
                </div>
                {c.observacao && (
                  <div style={{ marginTop: 3, fontSize: 12, color: "var(--lob-muted)" }}>{c.observacao}</div>
                )}
              </div>
              <Chip tom={TOM_CONFERENCIA[c.estado] ?? "espera"}>
                {t.conferencias[c.estado as keyof typeof t.conferencias] ?? c.estado}
              </Chip>
            </li>
          ))}
        </ul>
      </div>

      {erro && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "#f0a79e" }}>
          {erro}
        </p>
      )}
    </div>
  );
}
