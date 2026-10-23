"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { resolveRole } from "@/lib/design";
import type { Messages } from "@/lib/i18n/messages";
import { dataDoPrazo, foraDaCobranca, inscricaoEsperaPagamento } from "@/lib/inscricoes/pagamento";
import { TURNOS } from "@/lib/inscricoes/turnos";

/**
 * "Minha inscrição" — o que a organização já conferiu e o que falta.
 *
 * Busca no cliente, e não no servidor da página, por um motivo prático: o jogador
 * volta aqui várias vezes esperando a conferência mudar de estado. Recarregar a
 * página inteira para ver seis chips mudarem seria desperdício; e o dado é
 * estritamente pessoal, então nada disso pode ficar em cache de borda.
 */

type Rotulos = Messages["inscricao"];

// Carregado sob demanda: o gerador de QR (~9 KB com gzip) só serve a quem ainda tem o que
// pagar.
const PagamentoPix = dynamic(
  () => import("@/components/pix/pagamento-pix").then((m) => m.PagamentoPix),
  { ssr: false, loading: () => <p style={{ margin: 0, color: "var(--lob-muted)" }}>…</p> },
);

/**
 * Traduz a rota gravada na ficha.
 *
 * O banco guarda a chave canônica (`TOP`, `JUNG`, `MID`, `ADC`, `SUP` — ver
 * `rotaCanonica`), mas o dicionário desta área é indexado pelos nomes em português
 * (`TOPO`, `SELVA`, `MEIO`, …). Indexar um pelo outro nunca casava, então TODA ficha
 * caía no valor cru e esta tela mostrava "TOP · JUNG" — inclusive no site em inglês.
 *
 * Os dois lados são aliases da MESMA rota, então casamos pela forma canônica em vez
 * de manter um segundo mapa, que sairia do ar na primeira rota nova.
 */
function rotuloDaRota(chaveDoBanco: string, rotas: Record<string, string>) {
  const canonica = resolveRole(chaveDoBanco).key;
  if (!canonica) return chaveDoBanco;
  const equivalente = Object.keys(rotas).find((chave) => resolveRole(chave).key === canonica);
  return equivalente ? rotas[equivalente] : chaveDoBanco;
}

type Conferencia = { item: string; estado: string; observacao: string | null };
type MinhaInscricao = {
  riotId: string;
  elo: string;
  rotaPrimaria: string;
  rotaSecundaria: string;
  disponibilidade: string[];
  situacao: keyof Rotulos["situacoes"];
  /** Recado da organização para o jogador (G). A nota interna da ficha nunca vem. */
  recado?: string | null;
  /**
   * Lugar na fila (D1). Ausente = resposta de antes da fila: vale como titular. `indefinido` =
   * o servidor não conseguiu ler a fila: na dúvida, sem Pix (pode ser reserva).
   */
  fila?:
    | { tipo: "titular" }
    | { tipo: "reserva"; posicao: number }
    | { tipo: "fora" }
    | { tipo: "indefinido" }
    | null;
  criadoEm: string;
  pagamento: { estado: keyof Rotulos["pagamentos"]; valorCentavos: number; venceEm: string | null } | null;
  conferencias: Conferencia[];
};

type Resposta = {
  jogador: { displayName: string; email: string } | null;
  inscricao: MinhaInscricao | null;
  /** Só vem enquanto o pagamento está em aberto. */
  pix?: { chave: string } | null;
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
  excluido: "ruim",
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

/*
 * Botão de rótulo longo dentro de cartão: `.lob-btn-gold` não quebra linha, e num celular
 * de 320px "FAZER MINHA INSCRIÇÃO →" passava da borda do cartão e era cortado pela borda
 * da tela. Quebra em duas linhas só quando não cabe, com a seta presa à última palavra.
 */
const BOTAO_QUE_QUEBRA: React.CSSProperties = { whiteSpace: "normal", maxWidth: "100%", textAlign: "center" };

function setaPresa(rotulo: string) {
  return rotulo.replace(/\s+→$/, "\u00a0→");
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
    // O try/finally não é enfeite: sem ele, uma falha de rede fazia o `fetch` rejeitar,
    // o `setAvisando(false)` nunca rodava e o botão "JÁ PAGUEI" ficava desabilitado
    // para sempre — a pessoa avisava o pagamento uma vez e não conseguia nunca mais,
    // sem nenhuma mensagem na tela dizendo por quê.
    setAvisando(true);
    try {
      const r = await fetch("/api/inscricao/pagamento", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      if (r.ok) {
        await carregar();
        return;
      }
      const corpo = (await r.json().catch(() => ({}))) as { error?: string; codigo?: string };
      // O texto da rota é fixo em português; pelo `codigo` a tela mostra no idioma dela.
      const traduzido =
        corpo.codigo && Object.hasOwn(t.erros, corpo.codigo)
          ? t.erros[corpo.codigo as keyof Rotulos["erros"]]
          : undefined;
      setErro(traduzido ?? corpo.error ?? t.erroGenerico);
    } catch {
      setErro(t.erroGenerico);
    } finally {
      setAvisando(false);
    }
  }

  if (carregando) {
    return <p style={{ color: "var(--lob-muted)" }}>…</p>;
  }

  // Falha ao carregar (500, rede caída) ANTES de qualquer dado: antes ela caía no ramo
  // "sem conta" abaixo, e o inscrito lia "Entre na sua conta" + "FAZER MINHA INSCRIÇÃO" —
  // achava que tinha perdido a sessão ou a inscrição. Aqui ele lê o que houve e tenta de novo.
  if (!dados && erro) {
    return (
      <div className="lob-card-2" style={{ padding: "28px 26px" }}>
        <p role="alert" style={{ margin: "0 0 18px", color: "#f0a79e" }}>
          {t.minhaErroCarregar}
        </p>
        <button
          type="button"
          className="lob-btn-gold"
          onClick={() => {
            setCarregando(true);
            void carregar();
          }}
        >
          {t.tentarDeNovo}
        </button>
      </div>
    );
  }

  if (!dados?.jogador) {
    // Sem sessão (a de 7 dias venceu, ou a pessoa chegou pelo link da cobrança em outro
    // aparelho): o caminho principal é ENTRAR, e de volta para cá. Fazer inscrição fica
    // como segunda opção — mandar um inscrito para o formulário contradizia o texto.
    return (
      <div className="lob-card-2" style={{ padding: "28px 26px" }}>
        <p style={{ margin: "0 0 18px", color: "var(--lob-muted)" }}>{t.minhaSemConta}</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link className="lob-btn-gold" href="/entrar?volta=/minha-inscricao" style={BOTAO_QUE_QUEBRA}>
            {t.entrarBotao}
          </Link>
          <Link className="lob-btn-ghost" href="/inscricao" style={BOTAO_QUE_QUEBRA}>
            {setaPresa(t.minhaIrParaInscricao)}
          </Link>
        </div>
      </div>
    );
  }

  if (!dados.inscricao) {
    return (
      <div className="lob-card-2" style={{ padding: "28px 26px" }}>
        <p style={{ margin: "0 0 18px", color: "var(--lob-muted)" }}>{t.minhaSemInscricao}</p>
        <Link className="lob-btn-gold" href="/inscricao" style={BOTAO_QUE_QUEBRA}>
          {setaPresa(t.minhaIrParaInscricao)}
        </Link>
      </div>
    );
  }

  const i = dados.inscricao;
  const pag = i.pagamento;
  // Mesma regra da rota: recusado ou desistente não tem mais o que pagar nem avisar.
  const podeAvisar = inscricaoEsperaPagamento(i);
  // Recusado ou desistente que não pagou: o pagamento segue "aguardando" no banco (recusar
  // não cancela pagamento), mas para ele a cobrança não vale mais. Mostrar "Aguardando
  // pagamento · R$ 20,00 — Vence em …" era o convite a pagar que a rota evita ao esconder
  // o QR. Mesma regra do painel (`foraDaCobranca`).
  const semCobranca = foraDaCobranca(i.situacao, pag?.estado);
  // Fila de reserva (D2): reserva só paga se for chamado — sem Pix, sem JÁ PAGUEI e sem
  // prazo. Quem já pagou ou declarou continua vendo o que fez (fica registrado).
  const reserva = i.fila?.tipo === "reserva" ? i.fila : null;
  const reservaSemPagar = reserva !== null && pag?.estado === "aguardando";
  const reservaComDinheiro = reserva !== null && (pag?.estado === "pago" || pag?.estado === "declarado");
  // «Sobra» é decisão da organização: vai para o fim da fila e NÃO é chamada sozinha quando um
  // titular sai (`montarFila` a marca como `manual`; é exatamente a situação «sobra»). Prometer
  // a ela o chamado pela ordem de inscrição seria prometer o que a fila não faz.
  const emSobra = reserva !== null && i.situacao === "sobra";
  // O servidor não conseguiu ler a fila: não se sabe se é titular ou reserva. Na dúvida, nem Pix,
  // nem «JÁ PAGUEI», nem prazo (`inscricaoEsperaPagamento` já diz não) — e a tela diz por quê.
  const filaIndefinida = i.fila?.tipo === "indefinido" && !semCobranca;
  const semPagarNaDuvida = filaIndefinida && pag?.estado === "aguardando";
  // Na ordem do dia, e só os turnos que esta tela conhece.
  const turnos = TURNOS.filter((x) => i.disponibilidade.includes(x)).map((x) => t.turnos[x]);

  return (
    <div className="lob-fade" style={{ display: "grid", gap: 16 }}>
      <div className="lob-card-2" style={{ padding: "22px 24px" }}>
        <div>
          <div className="lob-display" style={{ fontSize: 24, color: "var(--lob-text)" }}>{i.riotId}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--lob-muted)" }}>
            {[i.elo, rotuloDaRota(i.rotaPrimaria, t.rotas), rotuloDaRota(i.rotaSecundaria, t.rotas)]
              .filter(Boolean)
              .join(" · ")}
          </div>
          <div style={{ marginTop: 4, fontSize: 13, color: "var(--lob-muted)" }}>
            {t.disponibilidadeLabel}:{" "}
            {turnos.length > 0 ? turnos.join(" · ") : t.disponibilidadeNaoInformada}
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 18, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
              {t.situacaoLabel}
            </div>
            <Chip tom={TOM_SITUACAO[i.situacao] ?? "espera"}>{t.situacoes[i.situacao] ?? i.situacao}</Chip>
          </div>
          {reserva && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
                {t.filaLabel}
              </div>
              <Chip tom="atencao">{t.filaPosicao.replace("{posicao}", String(reserva.posicao))}</Chip>
            </div>
          )}
          {pag && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
                {t.pagamentoLabel}
              </div>
              {semCobranca ? (
                <Chip tom="espera">{t.semCobranca}</Chip>
              ) : reservaSemPagar ? (
                <Chip tom="espera">{t.reservaSemCobranca}</Chip>
              ) : semPagarNaDuvida ? (
                <Chip tom="espera">{t.filaIndefinidaPagamento}</Chip>
              ) : (
                <Chip tom={TOM_PAGAMENTO[pag.estado] ?? "espera"}>
                  {t.pagamentos[pag.estado] ?? pag.estado} · {moeda(pag.valorCentavos)}
                </Chip>
              )}
              {pag.venceEm && pag.estado === "aguardando" && !semCobranca && !reserva && !filaIndefinida && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--lob-muted)" }}>
                  {t.venceEm} {dataDoPrazo(pag.venceEm, t.localeDatas)}
                </div>
              )}
            </div>
          )}
        </div>

        {reserva && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: 0, fontSize: 13.5, color: "var(--lob-text)" }}>
              {t.minhaReserva.replace("{posicao}", String(reserva.posicao))}
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--lob-muted)", maxWidth: "62ch" }}>
              {emSobra
                ? [t.minhaSobraAjuda, reservaComDinheiro ? t.reservaComPagamento : null].filter(Boolean).join(" ")
                : reservaComDinheiro
                  ? t.reservaComPagamento
                  : t.minhaReservaAjuda}
            </p>
          </div>
        )}

        {filaIndefinida && (
          <div style={{ marginTop: 16 }}>
            <p role="status" style={{ margin: 0, fontSize: 13, color: "#f3d69a", maxWidth: "62ch" }}>
              {t.filaIndefinida}
            </p>
            <button
              type="button"
              className="lob-btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => {
                setCarregando(true);
                void carregar();
              }}
            >
              {t.tentarDeNovo}
            </button>
          </div>
        )}

        {i.recado && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: ".2em", color: "var(--lob-bronze)", marginBottom: 6 }}>
              {t.recadoLabel}
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--lob-muted)", whiteSpace: "pre-line" }}>{i.recado}</p>
          </div>
        )}

        {podeAvisar && pag && dados.pix ? (
          <div
            style={{
              marginTop: 18,
              padding: "16px 18px",
              borderRadius: 8,
              border: "1px solid var(--lob-line)",
            }}
          >
            <PagamentoPix t={t} chave={dados.pix.chave} valorCentavos={pag.valorCentavos} />
          </div>
        ) : null}

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
