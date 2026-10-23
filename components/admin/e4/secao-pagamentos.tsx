"use client";

import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import {
  Ban,
  CalendarClock,
  Check,
  CircleArrowLeft,
  CircleCheck,
  ExternalLink,
  HandCoins,
  Hourglass,
  MessageCircle,
  ReceiptText,
  Ticket,
  Undo2,
} from "lucide-react";

import {
  ChipDoLugar,
  PassarAVaga,
  nomeDe,
  prazoUnicoEscrito,
  primeiroDaFila,
  temFila,
  useFila,
} from "@/components/admin/e4/fila-no-painel";
import type { Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import { useCompacto } from "@/components/admin/responsivo";
import {
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  CartaoLinha,
  Chip,
  ChipFiltro,
  Dados,
  display,
  Empty,
  Field,
  FieldGrid,
  Folha,
  Input,
  Metric,
  RolagemX,
  ScrollX,
  SectionHead,
  Select,
  tabular,
  Toolbar,
} from "@/components/admin/ui";
import type { Icone } from "@/components/lob/icones";
import {
  ALERTAS_DO_CAIXA,
  alertasDoInscrito,
  cienciaDoAlerta,
  pedidoDeCiencia,
  TITULO_DAR_CIENCIA,
  type Alerta,
  type CienciaDoAlerta,
} from "@/lib/inscricoes/alertas";
import { linkDeCobranca, listaDeQuemFaltaPagar } from "@/lib/inscricoes/cobranca";
import { lugarNaFila, perdeuOPrazo, reservaADevolverSeNaoJogar, type LugarNaFila } from "@/lib/inscricoes/fila";
import { foraDaCobranca, prazoNoFimDoDia } from "@/lib/inscricoes/pagamento";
import { ESTADOS_PAGAMENTO, ROTULO_PAGAMENTO, type EstadoPagamento } from "@/lib/inscricoes/schema";

/**
 * O caixa da 4ª Edição e a fila de conferência de pagamentos.
 *
 * A separação que governa esta tela: **"declarado" é a palavra do jogador e "pago" é
 * alguém da organização ter aberto o extrato.** São dois fatos diferentes sobre o
 * mundo, e por isso nunca existe um botão só que faça os dois — quem clica em
 * "Confirmar recebido" está afirmando que viu o dinheiro cair, e é o nome dessa
 * pessoa que fica na auditoria.
 *
 * No celular (`useCompacto`) as duas tabelas viram cartões: a de prazos com o «Cobrar»
 * como botão de dedo dentro do cartão, e a de todos os pagamentos com o cartão inteiro
 * tocável, abrindo uma folha com o detalhe e a troca de estado. As regras são as mesmas
 * do monitor — muda só o arranjo.
 */

// ---------------------------------------------------------------- constantes e formatos

const DIA_MS = 86_400_000;

/** Quantos dias antes do vencimento a cobrança já aparece no bloco de prazos. */
const JANELA_DE_AVISO = 7;

const ESCOPO_FALTANDO =
  "Falta o escopo inscricoes:financeiro — você vê o caixa, mas não altera pagamentos.";

/** Passar a vaga mexe na situação da inscrição, não no caixa: é o escopo da conferência. */
const SEM_ESCOPO_DA_VAGA = "Passar a vaga exige o escopo inscricoes:conferir.";

/** Banco ainda sem a coluna `alertas_cientes` (deploy antes da migração): o mesmo aviso da gaveta. */
const CIENCIA_SEM_COLUNA = "«Dar ciência» fica disponível depois da migração do banco (coluna alertas_cientes).";

const th: CSSProperties = {
  padding: "0 12px 9px",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${C.line}`,
  textAlign: "left",
};

const td: CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
  verticalAlign: "middle",
};

function moeda(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/*
 * Datas sempre no fuso de Brasília, como a mensagem de cobrança e a gaveta do inscrito. No
 * fuso do computador, um organizador em Manaus via «20 de out.» na tabela para o prazo que
 * a cobrança do WhatsApp chama de «21/10».
 */
const FUSO = "America/Sao_Paulo";

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Um prazo de pagamento: «04 de nov. de 2026» quando vence no fim do dia em Brasília (o
 * prazo único de 31/10); com a hora quando não — «04 de nov. de 2026 às 15:37». O reserva
 * chamado depois de 31/10 tem 48 h contadas do chamado (D4), e às 20 h do último dia ele já
 * está em «Perderam o prazo»: sem a hora, a tela dizia que o prazo era o dia inteiro.
 */
function prazoCurto(iso: string | null): string {
  const dia = dataCurta(iso);
  if (!iso || dia === "—" || prazoNoFimDoDia(iso)) return dia;
  const hora = new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: FUSO,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return `${dia} às ${hora}`;
}

function emMs(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : null;
}

function plural(n: number, um: string, muitos: string): string {
  return `${n} ${n === 1 ? um : muitos}`;
}

/**
 * Volta o texto do <select> para o union, sem asserção de tipo.
 * `find` compara contra a própria tupla, então lixo vindo do DOM vira `null` em vez
 * de virar um estado que o servidor não conhece.
 */
function comoEstado(valor: string): EstadoPagamento | null {
  return ESTADOS_PAGAMENTO.find((e) => e === valor) ?? null;
}

type Tom = "neutro" | "gold" | "ok" | "warn" | "danger" | "off";

const TOM_DO_ESTADO: Record<EstadoPagamento, Tom> = {
  aguardando: "neutro",
  declarado: "warn",
  pago: "ok",
  isento: "ok",
  estorno_devido: "warn",
  estornado: "neutro",
  cancelado: "off",
};

/** Cor do prazo: vencido grita, os dois últimos dias avisam, o resto só informa. */
function tomDoPrazo(dias: number): Tom {
  return dias < 0 ? "danger" : dias <= 2 ? "warn" : "neutro";
}

function textoDoPrazo(dias: number): string {
  return dias < 0
    ? `vencido há ${plural(Math.abs(dias), "dia", "dias")}`
    : dias === 0
      ? "vence hoje"
      : `vence em ${plural(dias, "dia", "dias")}`;
}

type Linha = Readonly<{
  pagamento: Pagamento;
  /** `null` quando o pagamento aponta para uma inscrição que sumiu — a tela não quebra por isso. */
  inscrito: Inscrito | null;
  nome: string;
  venceMs: number | null;
  /** Recusado ou desistente que não pagou: a cobrança não vale mais (ver `foraDaCobranca`). */
  fora: boolean;
  /**
   * Titular, fila de reserva (com a posição) ou fora (D1). Reserva só paga se for chamado
   * (D2): não entra em «a receber», nos prazos nem na lista de quem falta pagar.
   */
  lugar: LugarNaFila;
}>;

/** Na fila de reserva: não se cobra (D2). */
function naReserva(linha: Linha): boolean {
  return linha.lugar.tipo === "reserva";
}

/*
 * Os alertas que são do caixa (`ALERTAS_DO_CAIXA`, em lib/inscricoes/alertas.ts) — os de
 * requisito ficam na aba Inscritos. O «apto sem pagamento» é dos dois: o sistema só promove,
 * então um «pago» desfeito depois da promoção (ou um Apto marcado à mão) deixava a pessoa
 * apta, rumo ao draft, sem nada apontar aqui. A lista mora lá porque é também ela que diz
 * quem pode dar ciência do alerta (o financeiro).
 */

/**
 * Trocas pelo <select> que pedem confirmação: as que mexem no caixa (ou desfazem um «pago»).
 *
 * O <select> nativo grava a cada `change`, e no Chrome/Edge do Windows a seta ↓ num select
 * focado troca a opção SEM abrir a lista: navegando a tabela pelo teclado, «Declarado»
 * virava «Pago» com o nome de quem estava ali na auditoria — e a rota ainda pode promover a
 * pessoa a Apto, o que nenhuma troca de volta desfaz.
 */
const ESTADOS_QUE_MEXEM_NO_CAIXA: ReadonlySet<EstadoPagamento> = new Set<EstadoPagamento>([
  "pago",
  "isento",
  "estorno_devido",
  "estornado",
]);

function confirmaTroca(nome: string, de: EstadoPagamento, para: EstadoPagamento): boolean {
  if (!ESTADOS_QUE_MEXEM_NO_CAIXA.has(para) && de !== "pago") return true;
  const efeito =
    para === "pago" ? " Isso afirma que o dinheiro está no extrato, e pode promover a pessoa a Apto." : "";
  return window.confirm(
    `Mudar o pagamento de ${nome} de «${ROTULO_PAGAMENTO[de]}» para «${ROTULO_PAGAMENTO[para]}»?${efeito}`,
  );
}

const ROTULO_DA_ACAO: Record<NonNullable<Alerta["acaoPagamento"]>, string> = {
  isento: "Isentar",
  estorno_devido: "Marcar estorno devido",
};

const TITULO_ORGANIZACAO = "Organizador desta edição: não paga inscrição.";
const TITULO_FORA =
  "Recusado ou desistente que não pagou: não entra em «a receber» nem nos prazos. Para encerrar de vez, mude para «Cancelado».";

/** A situação da inscrição por trás do pagamento — ou o aviso de que ela não veio. */
function ChipDaInscricao({ inscrito }: Readonly<{ inscrito: Inscrito | null }>) {
  return inscrito ? (
    <Chip
      tone={
        inscrito.situacao === "apto"
          ? "ok"
          : inscrito.situacao === "recusado" || inscrito.situacao === "excluido"
            ? "danger"
            : "neutro"
      }
    >
      {inscrito.situacao}
    </Chip>
  ) : (
    <Chip tone="danger" title="Pagamento sem ficha correspondente na lista de inscritos.">
      sem ficha
    </Chip>
  );
}

// ---------------------------------------------------------------- celular: o estado em desenho

/**
 * O que aconteceu com o dinheiro, em desenho — para a lista do celular ser lida de relance,
 * antes do texto. Cada um diz a COISA, não só a cor: a ampulheta ainda espera, a mão com
 * moedas é o jogador dizendo que pagou, o visto é alguém ter aberto o extrato.
 */
const ICONE_DO_ESTADO: Record<EstadoPagamento, Icone> = {
  aguardando: Hourglass,
  declarado: HandCoins,
  pago: CircleCheck,
  // Passe livre: o organizador entra sem pagar.
  isento: Ticket,
  // A seta que volta: o dinheiro precisa sair; com o círculo, já saiu.
  estorno_devido: Undo2,
  estornado: CircleArrowLeft,
  cancelado: Ban,
};

/**
 * O nome do estado encurtado, só para os chips de filtro do celular: o oficial
 * ("Aguardando pagamento", "Cancelado sem pagamento") fazia a fileira de filtros rolar
 * três telas de lado. O oficial continua no `title` do chip e nos cartões.
 */
const ROTULO_CURTO: Record<EstadoPagamento, string> = {
  aguardando: "Aguardando",
  declarado: "Declarado",
  pago: "Pago",
  isento: "Isento",
  estorno_devido: "Estorno devido",
  estornado: "Estornado",
  cancelado: "Cancelado",
};

/** As mesmas cores dos chips do kit — o selo e o chip ao lado nunca discordam. */
const COR_DO_TOM: Record<Tom, Readonly<{ cor: string; fundo: string; borda: string }>> = {
  neutro: { cor: C.ink2, fundo: "rgba(201,138,75,.07)", borda: C.line2 },
  gold: { cor: C.bronzeHi, fundo: "rgba(240,200,138,.12)", borda: "rgba(240,200,138,.45)" },
  ok: { cor: C.okSoft, fundo: "rgba(70,214,200,.10)", borda: "rgba(70,214,200,.40)" },
  warn: { cor: C.warnSoft, fundo: "rgba(224,163,58,.11)", borda: "rgba(224,163,58,.45)" },
  danger: { cor: C.dangerSoft, fundo: "rgba(212,87,74,.11)", borda: "rgba(212,87,74,.45)" },
  off: { cor: C.ink4, fundo: "transparent", borda: C.line },
};

/** Ladrilho com o desenho, à esquerda do cartão. Decorativo: o chip ao lado dá o nome. */
function Selo({ icone: Desenho, tom, tamanho = 38 }: Readonly<{ icone: Icone; tom: Tom; tamanho?: number }>) {
  const t = COR_DO_TOM[tom];
  return (
    <span
      aria-hidden
      style={{
        width: tamanho,
        height: tamanho,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        borderRadius: 6,
        border: `1px solid ${t.borda}`,
        background: t.fundo,
        color: t.cor,
      }}
    >
      <Desenho size={Math.round(tamanho * 0.5)} strokeWidth={1.9} aria-hidden />
    </span>
  );
}

function SeloDoEstado({ estado, tamanho }: Readonly<{ estado: EstadoPagamento; tamanho?: number }>) {
  return <Selo icone={ICONE_DO_ESTADO[estado]} tom={TOM_DO_ESTADO[estado]} tamanho={tamanho} />;
}

/** O valor no canto do cartão, em bronze e com dígito tabular, igual à coluna do monitor. */
function ValorDoCartao({ centavos }: Readonly<{ centavos: number }>) {
  return (
    <span style={{ fontSize: 14, fontWeight: 700, color: C.bronzeLit, whiteSpace: "nowrap", ...tabular }}>
      {moeda(centavos)}
    </span>
  );
}

/** A linha miúda do cartão: o que aconteceu por último com aquele pagamento. */
function resumoDoPagamento(p: Pagamento): string | null {
  if (p.estado === "declarado" && p.declarado_em) return `declarou ${dataHora(p.declarado_em)}`;
  if (p.conferido_em) return `conferido ${dataCurta(p.conferido_em)}${p.conferido_por ? ` · ${p.conferido_por}` : ""}`;
  if (p.vence_em) return `vence ${prazoCurto(p.vence_em)}`;
  return null;
}

/**
 * O «Cobrar» do celular: link com cara de botão, da largura do cartão e com altura de
 * dedo. Continua sendo um <a> — abre o WhatsApp de quem cobra, não grava nada aqui.
 */
const botaoDeLink: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  width: "100%",
  minHeight: 44,
  padding: "10px 14px",
  borderRadius: 3,
  border: `1px solid ${C.line2}`,
  background: "rgba(201,138,75,.07)",
  color: C.bronzeLit,
  fontSize: 13.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  textDecoration: "none",
};

/**
 * O detalhe de um pagamento, na folha do celular: tudo o que a linha da tabela mostra no
 * monitor, mais a observação já gravada (que a tabela não tem onde pôr), e os mesmos dois
 * controles da linha — observação e troca de estado, com a mesma semântica.
 */
function DetalheDoPagamento({
  linha,
  observacao,
  onObservacao,
  onEstado,
  travado,
  motivo,
  erro,
}: Readonly<{
  linha: Linha;
  observacao: string;
  onObservacao: (texto: string) => void;
  onEstado: (estado: EstadoPagamento) => void;
  travado: boolean;
  motivo: string | undefined;
  /** Por que a última troca feita AQUI falhou. A folha cobre o aviso do topo da página. */
  erro: string | null;
}>) {
  const { pagamento, inscrito, nome, fora } = linha;
  const gravada = pagamento.observacao?.trim();
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SeloDoEstado estado={pagamento.estado} tamanho={48} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: display, fontSize: 26, lineHeight: 1.1, color: C.bronzeHi, ...tabular }}>
            {moeda(pagamento.valor_centavos)}
          </div>
          <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Chip tone={TOM_DO_ESTADO[pagamento.estado]}>{ROTULO_PAGAMENTO[pagamento.estado]}</Chip>
            {linha.lugar.tipo === "reserva" ? <ChipDoLugar lugar={linha.lugar} /> : null}
            {inscrito?.organizador ? (
              <Chip tone="gold" title={TITULO_ORGANIZACAO}>
                organização
              </Chip>
            ) : null}
            {fora ? (
              <Chip tone="off" title={TITULO_FORA}>
                fora — não cobrar
              </Chip>
            ) : null}
          </div>
        </div>
      </div>

      <Dados
        itens={[
          { rotulo: "Inscrição", valor: <ChipDaInscricao inscrito={inscrito} /> },
          { rotulo: "Vence", valor: <span style={tabular}>{prazoCurto(pagamento.vence_em)}</span> },
          { rotulo: "Declarou", valor: <span style={tabular}>{dataHora(pagamento.declarado_em)}</span> },
          {
            rotulo: "Conferido",
            valor: pagamento.conferido_em ? (
              <span style={tabular}>
                {dataCurta(pagamento.conferido_em)}
                {pagamento.conferido_por ? <span style={{ color: C.ink4 }}> · {pagamento.conferido_por}</span> : null}
              </span>
            ) : (
              "—"
            ),
          },
          { rotulo: "Observação gravada", valor: gravada ? gravada : "—", largo: true },
        ]}
      />

      <Field
        label="Observação"
        hint="Vai junto com a próxima mudança de estado e SUBSTITUI a gravada. Em branco, mantém a que já estava."
      >
        <Input
          value={observacao}
          onChange={onObservacao}
          disabled={travado}
          placeholder="grava na próxima mudança de estado"
          ariaLabel={`Observação do pagamento de ${nome}`}
        />
      </Field>

      {/* Mesma regra da tabela do monitor: o que mexe no caixa pede confirmação
          (`confirmaTroca`) — a folha também abre num navegador estreito, com teclado. O <select>
          nativo, e não uma fileira de botões de estado, que mudaria o caixa com um toque perdido. */}
      <Field
        label="Alterar estado"
        hint={
          motivo ??
          "Muda na hora e fica na auditoria com o seu nome. Dizer que o dinheiro entrou tem botão próprio na fila de declarados."
        }
      >
        <Select
          value={pagamento.estado}
          disabled={travado}
          ariaLabel={`Estado do pagamento de ${nome}`}
          onChange={(v) => {
            const proximo = comoEstado(v);
            if (proximo && proximo !== pagamento.estado) onEstado(proximo);
          }}
        >
          {ESTADOS_PAGAMENTO.map((e) => (
            <option key={e} value={e}>
              {ROTULO_PAGAMENTO[e]}
            </option>
          ))}
        </Select>
      </Field>
      {erro ? (
        <p role="alert" style={{ margin: "-8px 0 0", fontSize: 12.5, lineHeight: 1.55, color: C.dangerSoft }}>
          {erro}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- seção

export function SecaoPagamentos({
  dados,
  executar,
  ocupado,
  podeFinanceiro,
  podeConferir,
  ultimoErro = null,
  ultimaMensagem = null,
}: PropsSecao) {
  const { config, panorama, pagamentos, inscritos, conferencias } = dados;
  const caixa = panorama.caixa;
  const compacto = useCompacto();
  const contagemId = useId();
  const fila = useFila(dados);
  const comFila = temFila(fila);
  const prazoUnico = prazoUnicoEscrito(config);

  /**
   * O relógio é tratado como fonte externa, e não como valor de renderização.
   *
   * `Date.now()` é impuro: o lint (`react-hooks/purity`) barra a chamada tanto solta
   * no JSX quanto dentro de `useMemo`, e com razão — dois pontos da mesma tela
   * poderiam discordar sobre que dia é hoje. Então assinamos o tempo: uma marcação
   * imediata e uma por minuto, que é a resolução de que "vence em N dias" precisa.
   * Até a primeira marcação, `agoraMs` é `null` e a tela diz que está calculando, em
   * vez de chutar um prazo.
   */
  const [agoraMs, setAgoraMs] = useState<number | null>(null);
  // A origem do site em que o painel está aberto: o link da cobrança aponta para ELE (o site
  // de teste não pode mandar jogador para a produção). Lida junto com o relógio, no efeito.
  const [origem, setOrigem] = useState("");
  const [copiado, setCopiado] = useState<"ok" | "falhou" | null>(null);
  useEffect(() => {
    const marcar = () => setAgoraMs(Date.now());
    const inicial = window.setTimeout(() => {
      setOrigem(window.location.origin);
      marcar();
    }, 0);
    const cadencia = window.setInterval(marcar, 60_000);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(cadencia);
    };
  }, []);

  const [filtro, setFiltro] = useState<EstadoPagamento | "todos">("todos");
  const [rascunhoObs, setRascunhoObs] = useState<Record<string, string>>({});
  /** O pagamento aberto na folha do celular (id da inscrição). No monitor fica sempre nulo. */
  const [abertoId, setAbertoId] = useState<string | null>(null);
  /** A última troca feita pela folha falhou: o motivo (`ultimoErro`) aparece dentro dela. */
  const [falhouNaFolha, setFalhouNaFolha] = useState(false);

  const travado = !podeFinanceiro || ocupado;
  const motivo = podeFinanceiro ? undefined : ESCOPO_FALTANDO;

  const fichaDe = useMemo(() => {
    const mapa = new Map<string, Inscrito>();
    for (const i of inscritos) mapa.set(i.id, i);
    return mapa;
  }, [inscritos]);

  const linhas = useMemo<Linha[]>(() => {
    // Excluído some do caixa como some de Inscritos — a não ser que haja dinheiro no meio
    // (pago, declarado, estorno): aí a linha fica, para ninguém perder a devolução de vista.
    const semDinheiro = (p: Pagamento) => p.estado === "aguardando" || p.estado === "cancelado";
    const daLista = pagamentos.filter((p) => !(fichaDe.get(p.inscricao_id)?.situacao === "excluido" && semDinheiro(p)));
    const lista = daLista.map((pagamento) => {
      const inscrito = fichaDe.get(pagamento.inscricao_id) ?? null;
      return {
        pagamento,
        inscrito,
        // Sem ficha casada, o id truncado ainda permite achar a linha no banco.
        nome: inscrito ? `${inscrito.nick}#${inscrito.tag}` : `inscrição ${pagamento.inscricao_id.slice(0, 8)}`,
        venceMs: emMs(pagamento.vence_em),
        fora: inscrito ? foraDaCobranca(inscrito.situacao, pagamento.estado) : false,
        lugar: lugarNaFila(fila, pagamento.inscricao_id),
      };
    });
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pagamentos, fichaDe, fila]);

  /** Fila de trabalho: quem esperou mais tempo aparece primeiro. */
  const declarados = useMemo(
    () =>
      linhas
        .filter((l) => l.pagamento.estado === "declarado")
        .sort((a, b) => (emMs(a.pagamento.declarado_em) ?? 0) - (emMs(b.pagamento.declarado_em) ?? 0)),
    [linhas],
  );

  const prazos = useMemo(() => {
    if (agoraMs === null) return [];
    const fora: { linha: Linha; dias: number }[] = [];
    for (const linha of linhas) {
      if (linha.pagamento.estado !== "aguardando" || linha.venceMs === null) continue;
      // Fora do campeonato ou da organização: não se cobra (o alerta do caixa cuida do segundo).
      // Reserva também não: só paga se for chamado (D2) — mesmo que um prazo velho tenha
      // ficado na linha até o próximo alinhamento.
      if (linha.fora || linha.inscrito?.organizador || naReserva(linha)) continue;
      // A favor do prazo, `ceil` de propósito: faltando 3 horas, o texto certo é "vence em 1
      // dia", não "0". Passado o prazo, é vencido desde o primeiro instante: o `ceil` de 20 h
      // de atraso dava -0, que não é `< 0`, e a pessoa saía como «vence hoje», em âmbar.
      const dias =
        linha.venceMs > agoraMs
          ? Math.ceil((linha.venceMs - agoraMs) / DIA_MS)
          : -Math.max(1, Math.floor((agoraMs - linha.venceMs) / DIA_MS));
      if (dias <= JANELA_DE_AVISO) fora.push({ linha, dias });
    }
    return fora.sort((a, b) => a.dias - b.dias);
  }, [linhas, agoraMs]);

  /** Quem ainda deve: aguardando, nem fora do campeonato, nem organizador, nem na fila de reserva. */
  const devendo = useMemo(
    () =>
      linhas.filter(
        (l) => l.pagamento.estado === "aguardando" && !l.fora && !l.inscrito?.organizador && !naReserva(l),
      ),
    [linhas],
  );

  /**
   * D5: titular que não pagou até o prazo. A partir dele o painel oferece passar a vaga ao 1º
   * da fila — nada cancela sozinho. A regra é a mesma do servidor (`perdeuOPrazo`): «declarado»
   * não perde (abra o extrato antes) e organizador nunca perde.
   */
  const perderamOPrazo = useMemo(() => {
    if (agoraMs === null) return [];
    return linhas
      .filter(
        (l) =>
          l.inscrito !== null &&
          perdeuOPrazo(
            {
              lugar: l.lugar,
              organizador: l.inscrito.organizador,
              situacao: l.inscrito.situacao,
              pagamento: { estado: l.pagamento.estado, vence_em: l.pagamento.vence_em },
            },
            agoraMs,
          ),
      )
      .sort((a, b) => (a.venceMs ?? 0) - (b.venceMs ?? 0));
  }, [linhas, agoraMs]);

  /** D2: reserva que pagou (ou disse que pagou). Se não for chamado até o fim, a organização devolve. */
  const aDevolverSeNaoJogar = useMemo(
    () =>
      linhas
        .filter((l) => reservaADevolverSeNaoJogar(l.lugar, l.pagamento.estado))
        .sort(
          (a, b) =>
            (a.lugar.tipo === "reserva" ? a.lugar.posicao : 0) - (b.lugar.tipo === "reserva" ? b.lugar.posicao : 0),
        ),
    [linhas],
  );
  // O servidor separa esse valor do arrecadado (`fecharCaixa`); servidor de antes da fila não
  // manda o número, e aí a soma sai das linhas — só o «pago», como lá.
  const valorADevolverSeNaoJogar =
    caixa.aDevolverSeNaoJogar ??
    aDevolverSeNaoJogar.filter((l) => l.pagamento.estado === "pago").reduce((t, l) => t + l.pagamento.valor_centavos, 0);

  const primeiroId = primeiroDaFila(fila);
  const primeiro = primeiroId ? (fichaDe.get(primeiroId) ?? null) : null;

  /*
   * As respostas das ações desta aba: cada bloco mostra a ÚLTIMA resposta do painel
   * (`ultimaMensagem`/`ultimoErro`) enquanto o seu resultado não for nulo. Toda ação daqui
   * zera os dois antes de começar (`limparResultados`, como na gaveta de Inscritos): sem isso,
   * o bloco do «Passar a vaga» ficava de pé para sempre e, depois de uma troca de pagamento,
   * dizia «Vaga liberada.» (a troca falhou) ou «Salvo.» (deu certo) como se fosse dele.
   */
  /** D5: o servidor confere tudo de novo antes de gravar; a mensagem dele sai no aviso do topo e aqui. */
  const [resultadoVaga, setResultadoVaga] = useState<"ok" | "falhou" | null>(null);
  /** «Dar ciência» / «Desfazer» nas Pendências do caixa. */
  const [resultadoCiencia, setResultadoCiencia] = useState<"ok" | "falhou" | null>(null);
  const limparResultados = () => {
    setResultadoVaga(null);
    setResultadoCiencia(null);
  };

  const passarVaga = async (linha: Linha): Promise<boolean> => {
    limparResultados();
    const ok = await executar("passar_vaga", { inscricaoId: linha.pagamento.inscricao_id });
    setResultadoVaga(ok ? "ok" : "falhou");
    return ok;
  };

  /*
   * O que pede um clique de quem cuida do caixa (ver `alertasDoInscrito`), e os alertas do
   * caixa que a organização já aceitou. Alerta com ciência que vale (a mesma assinatura: o
   * texto e os fatos do pagamento) não pede mais clique: sai das pendências, como sai do ⚠ de
   * Inscritos, e fica listado embaixo com «Desfazer». Mudou o alerta, volta sozinho.
   */
  const { pendenciasDoCaixa, cientesDoCaixa } = useMemo(() => {
    const pendentes: { linha: Linha; alerta: Alerta }[] = [];
    const cientes: { linha: Linha; alerta: Alerta; ciencia: CienciaDoAlerta }[] = [];
    for (const linha of linhas) {
      if (!linha.inscrito) continue;
      const doInscrito = conferencias.filter((c) => c.inscricao_id === linha.inscrito!.id);
      for (const alerta of alertasDoInscrito({
        inscrito: linha.inscrito,
        conferencias: doInscrito,
        pagamento: linha.pagamento,
        config,
        agoraMs: agoraMs ?? 0,
        // Sem o lugar, reserva aprovado sem pagar acusava «aprovado sem pagamento» — e reserva
        // não paga enquanto não for chamado (D2).
        lugar: linha.lugar,
      })) {
        if (!ALERTAS_DO_CAIXA.has(alerta.codigo)) continue;
        const ciencia = cienciaDoAlerta(alerta, linha.inscrito.alertas_cientes);
        if (ciencia) cientes.push({ linha, alerta, ciencia });
        else pendentes.push({ linha, alerta });
      }
    }
    return { pendenciasDoCaixa: pendentes, cientesDoCaixa: cientes };
  }, [linhas, conferencias, config, agoraMs]);

  /*
   * A ciência dos alertas do caixa pede o escopo do financeiro (`escopoDaCiencia`) — o mesmo
   * desta aba. Antes ela só existia na gaveta de Inscritos, que pede a conferência: a conta só
   * do financeiro abria lá em modo de leitura, justamente onde estava a única ação dela.
   */
  const darCiencia = async (linha: Linha, alerta: Alerta) => {
    if (!linha.inscrito) return;
    limparResultados();
    const ok = await executar("alerta_ciencia", pedidoDeCiencia(linha.inscrito.id, alerta));
    setResultadoCiencia(ok ? "ok" : "falhou");
  };

  const desfazerCiencia = async (linha: Linha, alerta: Alerta) => {
    if (!linha.inscrito) return;
    limparResultados();
    const ok = await executar("alerta_ciencia", { inscricaoId: linha.inscrito.id, codigo: alerta.codigo, desfazer: true });
    setResultadoCiencia(ok ? "ok" : "falhou");
  };

  /** O «Dar ciência» de uma pendência: só o financeiro, e só com a coluna no banco. */
  const semColuna = (linha: Linha) => linha.inscrito?.alertas_cientes === undefined;
  const motivoDaCiencia = (linha: Linha) => motivo ?? (semColuna(linha) ? CIENCIA_SEM_COLUNA : TITULO_DAR_CIENCIA);

  const copiarLista = async () => {
    // O valor de CADA pagamento, e não a taxa da configuração: a taxa vale para inscrição
    // nova, e quem já se inscreveu deve o que ficou gravado na inscrição dele — é o que a
    // cobrança individual e o Pix pedem. Com valores diferentes (a taxa mudou no meio das
    // inscrições), sai uma lista por valor, para ninguém ler um preço que não é o seu.
    const porValor = new Map<number, { riotId: string; venceEm: string | null }[]>();
    for (const l of devendo) {
      const doValor = porValor.get(l.pagamento.valor_centavos) ?? [];
      doValor.push({ riotId: l.nome, venceEm: l.pagamento.vence_em });
      porValor.set(l.pagamento.valor_centavos, doValor);
    }
    const texto =
      porValor.size === 0
        ? listaDeQuemFaltaPagar([], config.taxa_centavos)
        : [...porValor]
            .sort(([a], [b]) => a - b)
            .map(([valor, doValor]) => listaDeQuemFaltaPagar(doValor, valor))
            .join("\n\n");
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado("ok");
    } catch {
      setCopiado("falhou");
    }
  };

  const cobranca = (linha: Linha) =>
    linha.inscrito && origem
      ? linkDeCobranca({
          whatsapp: linha.inscrito.whatsapp,
          riotId: linha.nome,
          valorCentavos: linha.pagamento.valor_centavos,
          chavePix: config.chave_pix,
          venceEm: linha.pagamento.vence_em,
          origem,
        })
      : null;

  const aDevolver = useMemo(() => linhas.filter((l) => l.pagamento.estado === "estorno_devido"), [linhas]);
  const devolvidos = useMemo(() => linhas.filter((l) => l.pagamento.estado === "estornado"), [linhas]);

  const contagem = useMemo(() => {
    const base: Record<EstadoPagamento, number> = {
      aguardando: 0,
      declarado: 0,
      pago: 0,
      isento: 0,
      estorno_devido: 0,
      estornado: 0,
      cancelado: 0,
    };
    for (const p of pagamentos) base[p.estado] = (base[p.estado] ?? 0) + 1;
    return base;
  }, [pagamentos]);

  const visiveis = useMemo(
    () => (filtro === "todos" ? linhas : linhas.filter((l) => l.pagamento.estado === filtro)),
    [linhas, filtro],
  );

  /**
   * A folha procura em TODAS as linhas, não nas visíveis: com o filtro em «Declarado»,
   * mudar alguém para «Pago» tira o cartão da lista — e não pode fechar a folha na cara de
   * quem acabou de mudar. Se o pagamento sumir de vez (recarga), a folha fecha sozinha.
   */
  const linhaAberta = abertoId ? (linhas.find((l) => l.pagamento.inscricao_id === abertoId) ?? null) : null;

  /**
   * Fecha e devolve o foco ao cartão de onde a folha saiu. Se ele saiu do filtro, vai para
   * a contagem logo acima da lista — nunca para o <body>, que manda o Tab ao topo da página.
   */
  const fecharFolha = () => {
    const id = abertoId;
    setAbertoId(null);
    setFalhouNaFolha(false);
    requestAnimationFrame(() => {
      const alvo = (id ? document.getElementById(`pagamento-${id}`) : null) ?? document.getElementById(contagemId);
      alvo?.focus();
    });
  };

  /*
   * O estorno NÃO é descontado de novo aqui.
   *
   * Os estados são exclusivos: quem foi estornado deixou de ser "pago", então
   * `arrecadado` (a soma dos "pago") já está limpo. Uma versão anterior fazia
   * `arrecadado - estornado` e mostrava R$ 160 onde havia R$ 180 — descontava o mesmo
   * dinheiro duas vezes.
   *
   * Não há mais o banner «O caixa não fecha»: `recebido − estornado − a devolver` é, por
   * construção (`fecharCaixa`), sempre igual ao arrecadado — o verificador nunca acusava nada.
   * O furo que ele parecia vigiar (estornar quem nunca pagou, inflando «Recebido» e «Em
   * caixa») agora é recusado no servidor (`atualizarPagamento`).
   */
  // 100% do arrecadado vira prêmio: o campeão fica com `pct_campeao` e o vice com o
  // resto. A organização não fica com nada — o vice é a SUBTRAÇÃO, e não um segundo
  // arredondamento, para os dois somarem exatamente o arrecadado.
  const premioCampeao = Math.round((caixa.arrecadado * config.pct_campeao) / 100);
  const premioVice = caixa.arrecadado - premioCampeao;

  // Os números do caixa ficam numa lista só: o monitor e o celular arrumam os mesmos nove
  // cartões de jeitos diferentes, e escrever cada um duas vezes é como um rótulo acaba
  // dizendo uma coisa no monitor e outra no celular.
  const metricasDoCaixa: ReadonlyArray<{ label: string; value: string; detail: string }> = [
    { label: "Arrecadado", value: moeda(caixa.arrecadado), detail: "100% vira premiação — a organização não fica com nada" },
    { label: `Prêmio do campeão (${config.pct_campeao}%)`, value: moeda(premioCampeao), detail: "sobre o arrecadado" },
    { label: `Prêmio do vice (${100 - config.pct_campeao}%)`, value: moeda(premioVice), detail: "o restante do arrecadado" },
    { label: "Em caixa", value: moeda(caixa.emCaixa), detail: "recebido − estornado" },
    {
      label: "A receber",
      value: moeda(caixa.aReceber),
      detail: comFila
        ? "aguardando + declarado (sem organizadores, recusados, desistentes e fila de reserva)"
        : "aguardando + declarado (sem organizadores, recusados e desistentes)",
    },
  ];
  const metricasMiudas: ReadonlyArray<{ label: string; value: string; detail: string }> = [
    { label: "Recebido (bruto)", value: moeda(caixa.recebido), detail: "tudo que um dia entrou" },
    { label: "Estornado", value: moeda(caixa.estornado), detail: "já devolvido" },
    { label: "A devolver", value: moeda(caixa.aDevolver), detail: "na conta, mas comprometido" },
    // D2: o pago da fila de reserva fica na conta, mas não é prêmio — volta se ele não jogar.
    ...(comFila || valorADevolverSeNaoJogar > 0
      ? [
          {
            label: "A devolver se não jogar",
            value: moeda(valorADevolverSeNaoJogar),
            detail: "pago pela fila de reserva — fora do prêmio",
          },
        ]
      : []),
    { label: "Isento", value: moeda(caixa.isento), detail: "organizadores desta edição" },
  ];

  /** Devolve se gravou — a folha do celular precisa saber para mostrar o motivo da falha. */
  const salvar = async (pagamento: Pagamento, estado: EstadoPagamento): Promise<boolean> => {
    // A resposta desta troca é a última do painel: os blocos da vaga e da ciência não podem
    // continuar lendo-a como se fosse deles.
    limparResultados();
    const inscricaoId = pagamento.inscricao_id;
    const obs = (rascunhoObs[inscricaoId] ?? "").trim();
    // O servidor grava `observacao ?? null`: mandar vazio APAGA a observação anterior.
    // Por isso o campo só viaja quando alguém realmente digitou alguma coisa.
    const ok = await executar("pagamento", {
      inscricaoId,
      estado,
      observacao: obs.length > 0 ? obs : undefined,
      // O estado que ESTA tela mostrava. Se outro financeiro (ou o jogador, no «Já paguei»)
      // gravou antes, o servidor responde 409 sem gravar e a tela recarrega: uma fila velha
      // não devolve a «aguardando» o «pago» que outra pessoa acabou de confirmar.
      estadoAnterior: pagamento.estado,
    });
    if (!ok) return false;
    setRascunhoObs((atual) => {
      const proximo = { ...atual };
      delete proximo[inscricaoId];
      return proximo;
    });
    return true;
  };

  const salvarDaFolha = async (pagamento: Pagamento, estado: EstadoPagamento) => {
    setFalhouNaFolha(false);
    setFalhouNaFolha(!(await salvar(pagamento, estado)));
  };

  const escreverObs = (id: string, texto: string) =>
    setRascunhoObs((atual) => ({ ...atual, [id]: texto }));

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Pagamentos e caixa"
        description="Duas coisas moram aqui: o dinheiro que a edição tem e a fila de quem diz que já pagou. Conferir é abrir o extrato — a declaração do jogador sozinha não move o caixa."
        actions={
          podeFinanceiro ? (
            <Chip tone="ok">financeiro liberado</Chip>
          ) : (
            <Chip tone="off" title={ESCOPO_FALTANDO}>
              somente leitura
            </Chip>
          )
        }
      />

      {compacto ? (
        // No celular os quatro chips viravam uma fileira que estourava com uma chave Pix
        // longa (e-mail, chave aleatória). Em pares rótulo/valor a chave quebra onde precisar.
        <Card padding="14px 16px" style={{ marginBottom: 16 }}>
          <Dados
            itens={[
              {
                rotulo: "Taxa",
                valor: <span style={{ color: C.bronzeLit, fontWeight: 700, ...tabular }}>{moeda(config.taxa_centavos)}</span>,
              },
              {
                rotulo: "Prazo",
                valor: prazoUnico ? `titulares até ${prazoUnico}` : plural(config.prazo_pagamento_dias, "dia", "dias"),
              },
              { rotulo: "Chave Pix", valor: config.chave_pix ?? "a definir", largo: true },
              { rotulo: "Responsável", valor: config.responsavel_financeiro ?? "a definir", largo: true },
            ]}
          />
        </Card>
      ) : (
        <Toolbar style={{ marginBottom: 16 }}>
          <Chip tone="gold">taxa {moeda(config.taxa_centavos)}</Chip>
          {prazoUnico ? (
            <Chip title="Prazo único dos titulares, até o fim do dia em Brasília. Quem for chamado da fila depois dele tem 48 horas.">
              titulares pagam até {prazoUnico}
            </Chip>
          ) : (
            <Chip>prazo de {plural(config.prazo_pagamento_dias, "dia", "dias")}</Chip>
          )}
          <Chip title="Chave usada no PIX da inscrição.">
            PIX: {config.chave_pix ?? "a definir"}
          </Chip>
          <Chip>responsável: {config.responsavel_financeiro ?? "a definir"}</Chip>
        </Toolbar>
      )}

      {!podeFinanceiro ? (
        <Banner tone="warn" title="Você está vendo o caixa, mas não pode mexer nele">
          {ESCOPO_FALTANDO} Os controles abaixo aparecem desligados de propósito: esconder o número
          não protege ninguém, e oferecer um botão que devolve 403 só faz perder tempo.
        </Banner>
      ) : null}

      {/* ------------------------------------------------------------ caixa */}

      <BlockTitle>O caixa</BlockTitle>

      {compacto ? (
        // Duas colunas fixas no celular: a grade automática de 190px dava uma coluna só e
        // empilhava nove cartões. O arrecadado — o número que vira premiação — ocupa a
        // linha inteira e fica grande; o resto vai em pares, na fonte menor.
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          {[...metricasDoCaixa, ...metricasMiudas].map((m, i) =>
            i === 0 ? (
              <div key={m.label} style={{ gridColumn: "1 / -1" }}>
                <Metric label={m.label} value={m.value} detail={m.detail} />
              </div>
            ) : (
              <Metric key={m.label} small label={m.label} value={m.value} detail={m.detail} />
            ),
          )}
        </div>
      ) : (
        <>
          <FieldGrid min={190}>
            {metricasDoCaixa.map((m) => (
              <Metric key={m.label} label={m.label} value={m.value} detail={m.detail} />
            ))}
          </FieldGrid>

          <FieldGrid min={150} style={{ marginTop: 12 }}>
            {metricasMiudas.map((m) => (
              <Metric key={m.label} small label={m.label} value={m.value} detail={m.detail} />
            ))}
          </FieldGrid>
        </>
      )}

      <Card padding="14px 16px" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 12, color: C.ink4, lineHeight: 1.7 }}>
          O estorno sai da conta UMA vez. Quem foi estornado já deixou de ser &ldquo;pago&rdquo;, então
          o arrecadado nunca desconta o estorno de novo. O isento não entra em nenhum lado: esse
          dinheiro nunca existiu. E só se estorna o que foi recebido — para quem nunca pagou, o
          estado certo é &ldquo;Cancelado&rdquo;.
        </p>
      </Card>

      {/* ------------------------------------------------------------ pendências */}

      {/*
       * O bloco fica de pé também com os alertas já aceitos (para o «Desfazer») e enquanto houver
       * a resposta da última ciência: dar ciência da ÚLTIMA pendência esvazia a lista, e sem isto
       * a resposta do servidor sumia junto.
       */}
      {pendenciasDoCaixa.length > 0 || cientesDoCaixa.length > 0 || resultadoCiencia !== null ? (
        <>
          <BlockTitle right={<Chip tone={pendenciasDoCaixa.length > 0 ? "warn" : "neutro"}>{pendenciasDoCaixa.length}</Chip>}>
            Pendências do caixa
          </BlockTitle>
          {pendenciasDoCaixa.length > 0 ? (
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
              O sistema não mexe em dinheiro sozinho: ele aponta, e quem cuida do caixa decide com um clique. Já viu e
              decidiu? «Dar ciência» tira a pendência daqui e do ⚠ de Inscritos — ela volta sozinha se o alerta mudar
              (o texto, ou o pagamento por trás dele).
            </p>
          ) : (
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink4, lineHeight: 1.7 }}>
              Nenhuma pendência em aberto.
            </p>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            {pendenciasDoCaixa.map(({ linha, alerta }) => {
              const ciencia = (
                <Button
                  small={!compacto}
                  fullWidth={compacto}
                  disabled={travado || semColuna(linha)}
                  title={motivoDaCiencia(linha)}
                  onClick={() => void darCiencia(linha, alerta)}
                >
                  Dar ciência
                </Button>
              );
              return compacto ? (
                // O estado vai na linha miúda, e não num chip à direita: "Aguardando pagamento"
                // num chip sem quebra roubava metade da largura e espremia o Riot ID.
                <CartaoLinha
                  key={`${linha.pagamento.inscricao_id}-${alerta.codigo}`}
                  destaque={C.warn}
                  inicio={<SeloDoEstado estado={linha.pagamento.estado} />}
                  titulo={linha.nome}
                  subtitulo={ROTULO_PAGAMENTO[linha.pagamento.estado]}
                >
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: C.warnSoft }}>{alerta.texto}</p>
                  {/* Um embaixo do outro, na largura toda: alvo de dedo. */}
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {alerta.acaoPagamento ? (
                      <Button
                        tone="gold"
                        fullWidth
                        disabled={travado}
                        title={motivo}
                        onClick={() => void salvar(linha.pagamento, alerta.acaoPagamento!)}
                      >
                        {ROTULO_DA_ACAO[alerta.acaoPagamento]}
                      </Button>
                    ) : null}
                    {ciencia}
                  </div>
                </CartaoLinha>
              ) : (
                <Card key={`${linha.pagamento.inscricao_id}-${alerta.codigo}`} padding="12px 16px">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: display, fontSize: 15, color: C.ink }}>{linha.nome}</span>
                    <Chip tone={TOM_DO_ESTADO[linha.pagamento.estado]}>{ROTULO_PAGAMENTO[linha.pagamento.estado]}</Chip>
                    <span style={{ flex: "1 1 260px", fontSize: 12.5, color: C.warnSoft }}>{alerta.texto}</span>
                    {alerta.acaoPagamento ? (
                      <Button
                        small
                        tone="gold"
                        disabled={travado}
                        title={motivo}
                        onClick={() => void salvar(linha.pagamento, alerta.acaoPagamento!)}
                      >
                        {ROTULO_DA_ACAO[alerta.acaoPagamento]}
                      </Button>
                    ) : null}
                    {ciencia}
                  </div>
                </Card>
              );
            })}
          </div>
          {cientesDoCaixa.length > 0 ? (
            // Apagado por COR e texto, nunca por opacidade (como na gaveta de Inscritos): o
            // alerta aceito continua legível e auditável sem disputar o olho com as pendências.
            <div
              role="group"
              aria-label="Alertas do caixa com ciência da organização"
              style={{ marginTop: 10, padding: "10px 14px", border: `1px dashed ${C.line}`, borderRadius: 4 }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: C.ink4,
                }}
              >
                Com ciência da organização — não contam como pendência
              </p>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12, lineHeight: 1.55, color: C.ink4 }}>
                {cientesDoCaixa.map(({ linha, alerta, ciencia }) => (
                  <li key={`${linha.pagamento.inscricao_id}-${alerta.codigo}`} style={{ marginBottom: 8 }}>
                    <span style={{ color: C.ink3, overflowWrap: "anywhere" }}>{linha.nome}</span> — {alerta.texto}
                    <span style={{ display: "block", fontSize: 11, color: C.ink4 }}>
                      ciente — {ciencia.por}, {dataHora(ciencia.em)}
                    </span>
                    <div style={{ marginTop: 6 }}>
                      <Button
                        small={!compacto}
                        fullWidth={compacto}
                        disabled={travado || semColuna(linha)}
                        title={motivo ?? "O alerta volta a contar como pendência."}
                        onClick={() => void desfazerCiencia(linha, alerta)}
                      >
                        Desfazer
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {resultadoCiencia && !ocupado ? (
            <p
              role={resultadoCiencia === "falhou" ? "alert" : "status"}
              style={{
                margin: "10px 0 0",
                fontSize: 12.5,
                lineHeight: 1.55,
                color: resultadoCiencia === "falhou" ? C.dangerSoft : C.okSoft,
              }}
            >
              {resultadoCiencia === "falhou"
                ? (ultimoErro ?? "Não foi possível gravar a ciência.")
                : (ultimaMensagem ?? "Ciência gravada.")}
            </p>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------------------ fila de declarados */}

      <BlockTitle right={<Chip tone={declarados.length > 0 ? "warn" : "neutro"}>{declarados.length}</Chip>}>
        Declarados, esperando conferência
      </BlockTitle>

      <Banner tone="warn" title="Declarado não é pago">
        &ldquo;Declarado&rdquo; é a palavra do jogador: ele clicou em &ldquo;já paguei&rdquo;.
        &ldquo;Pago&rdquo; é alguém da organização ter aberto o extrato e visto o dinheiro. Só o
        segundo entra no caixa, e é o seu nome que fica registrado nele.
      </Banner>

      {declarados.length === 0 ? (
        <Empty title="Ninguém esperando conferência">
          Quando um jogador avisar que pagou, ele aparece aqui com o valor e a hora da declaração.
        </Empty>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {declarados.map(({ pagamento, inscrito, nome }) => {
            const id = pagamento.inscricao_id;
            const chipDaFicha = inscrito ? (
              <Chip tone={inscrito.situacao === "apto" ? "ok" : "neutro"}>{inscrito.situacao}</Chip>
            ) : (
              <Chip tone="danger" title="O pagamento aponta para uma inscrição que não veio na lista.">
                sem ficha
              </Chip>
            );

            if (compacto) {
              // O cartão não é tocável (não abre nada): os controles moram nele, e os dois
              // botões vão um embaixo do outro, na largura toda — lado a lado, "Confirmar
              // recebido" não cabia em meia tela de 360px e quebrava em duas linhas.
              return (
                <CartaoLinha
                  key={id}
                  inicio={<SeloDoEstado estado="declarado" />}
                  titulo={nome}
                  subtitulo={<span style={tabular}>declarou em {dataHora(pagamento.declarado_em)}</span>}
                  fim={
                    <>
                      <ValorDoCartao centavos={pagamento.valor_centavos} />
                      {chipDaFicha}
                    </>
                  }
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <Field
                      label="Observação"
                      hint="Vai junto com o toque e SUBSTITUI a observação anterior. Em branco, mantém a que já estava."
                    >
                      <Input
                        value={rascunhoObs[id] ?? ""}
                        onChange={(v) => escreverObs(id, v)}
                        disabled={travado}
                        placeholder="ex.: PIX de outro CPF, conferido no extrato do dia 12"
                        ariaLabel={`Observação do pagamento de ${nome}`}
                      />
                    </Field>
                    <Button
                      tone="gold"
                      fullWidth
                      disabled={travado}
                      title={motivo ?? "Eu abri o extrato e o dinheiro está lá."}
                      onClick={() => void salvar(pagamento, "pago")}
                    >
                      Confirmar recebido
                    </Button>
                    <Button
                      tone="danger"
                      fullWidth
                      disabled={travado}
                      title={motivo ?? "Volta para aguardando: o jogador declarou, mas não achei no extrato."}
                      onClick={() => void salvar(pagamento, "aguardando")}
                    >
                      Não encontrei
                    </Button>
                  </div>
                </CartaoLinha>
              );
            }

            return (
              <Card key={id} padding="14px 16px">
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    flexWrap: "wrap",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontFamily: display, fontSize: 16, color: C.ink }}>{nome}</span>
                  <span style={{ fontSize: 13, color: C.bronzeLit, ...tabular }}>
                    {moeda(pagamento.valor_centavos)}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.ink4, ...tabular }}>
                    declarou em {dataHora(pagamento.declarado_em)}
                  </span>
                  {chipDaFicha}
                </div>

                <FieldGrid min={220}>
                  <Field
                    label="Observação"
                    hint="Vai junto com o clique e SUBSTITUI a observação anterior. Em branco, mantém a que já estava."
                  >
                    <Input
                      value={rascunhoObs[id] ?? ""}
                      onChange={(v) => escreverObs(id, v)}
                      disabled={travado}
                      placeholder="ex.: PIX de outro CPF, conferido no extrato do dia 12"
                      ariaLabel={`Observação do pagamento de ${nome}`}
                    />
                  </Field>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <Button
                      tone="gold"
                      disabled={travado}
                      title={motivo ?? "Eu abri o extrato e o dinheiro está lá."}
                      onClick={() => void salvar(pagamento, "pago")}
                    >
                      Confirmar recebido
                    </Button>
                    <Button
                      tone="danger"
                      disabled={travado}
                      title={motivo ?? "Volta para aguardando: o jogador declarou, mas não achei no extrato."}
                      onClick={() => void salvar(pagamento, "aguardando")}
                    >
                      Não encontrei
                    </Button>
                  </div>
                </FieldGrid>
              </Card>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------ prazos */}

      <BlockTitle right={<Chip tone={prazos.length > 0 ? "warn" : "neutro"}>{prazos.length}</Chip>}>
        Vencidos e a vencer
      </BlockTitle>

      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
        Quem está <strong style={{ color: C.ink2 }}>aguardando</strong> e vence nos próximos{" "}
        {plural(JANELA_DE_AVISO, "dia", "dias")} ou já venceu.{" "}
        {prazoUnico
          ? `Os titulares pagam até ${prazoUnico} (fim do dia, Brasília); quem for chamado da fila depois disso tem 48 horas.`
          : `O prazo é de ${plural(config.prazo_pagamento_dias, "dia", "dias")} a partir da inscrição.`}{" "}
        {comFila ? "Quem está na fila de reserva não aparece aqui: só paga se for chamado. " : null}
        Vencido não é recusado: é hora de cobrar. «Cobrar» abre o seu WhatsApp com a mensagem pronta (valor, Pix e
        link) — quem envia é você.
      </p>

      <Toolbar style={{ marginBottom: 12 }}>
        <Button
          small
          fullWidth={compacto}
          disabled={devendo.length === 0}
          title="Copia só os Riot IDs e os prazos — nada de contato. Para colar no grupo."
          onClick={() => void copiarLista()}
        >
          Copiar lista de quem falta pagar ({devendo.length})
        </Button>
        {copiado === "ok" ? (
          <span role="status" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: C.okSoft }}>
            <Check size={13} aria-hidden />
            Copiado.
          </span>
        ) : copiado === "falhou" ? (
          <span role="status" style={{ fontSize: 12, color: C.dangerSoft }}>
            O navegador não deixou copiar.
          </span>
        ) : null}
      </Toolbar>

      {agoraMs === null ? (
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink4 }}>Calculando os prazos…</p>
      ) : prazos.length === 0 ? (
        <Empty title="Nenhum prazo estourando">
          Ninguém em &ldquo;aguardando&rdquo; vence nos próximos {plural(JANELA_DE_AVISO, "dia", "dias")}.
        </Empty>
      ) : compacto ? (
        // A tabela de 560px rolava de lado para chegar ao «Cobrar», que é a única ação dela.
        // No cartão o «Cobrar» vira botão de dedo na largura toda, logo abaixo do prazo.
        <div style={{ display: "grid", gap: 8 }}>
          {prazos.map(({ linha, dias }) => {
            const link = cobranca(linha);
            const tom = tomDoPrazo(dias);
            return (
              <CartaoLinha
                key={linha.pagamento.inscricao_id}
                destaque={dias < 0 ? C.danger : dias <= 2 ? C.warn : undefined}
                inicio={<Selo icone={CalendarClock} tom={tom} />}
                titulo={linha.nome}
                subtitulo={<span style={tabular}>vence {prazoCurto(linha.pagamento.vence_em)}</span>}
                fim={
                  <>
                    <ValorDoCartao centavos={linha.pagamento.valor_centavos} />
                    <Chip tone={tom}>{textoDoPrazo(dias)}</Chip>
                  </>
                }
              >
                {link ? (
                  <a href={link} target="_blank" rel="noopener noreferrer" style={botaoDeLink}>
                    <MessageCircle size={17} aria-hidden />
                    Cobrar no WhatsApp
                    <ExternalLink size={14} aria-hidden />
                  </a>
                ) : (
                  <span style={{ display: "block", fontSize: 12, lineHeight: 1.5, color: C.ink4 }}>
                    sem WhatsApp válido
                    {linha.inscrito ? ` — cobre pelo Discord: ${linha.inscrito.discord}` : null}
                  </span>
                )}
              </CartaoLinha>
            );
          })}
        </div>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", ...tabular }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, width: "100%" }}>
                  Jogador
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Valor
                </th>
                <th scope="col" style={th}>
                  Vence em
                </th>
                <th scope="col" style={th}>
                  Situação do prazo
                </th>
                <th scope="col" style={th}>
                  Cobrar
                </th>
              </tr>
            </thead>
            <tbody>
              {prazos.map(({ linha, dias }) => (
                <tr key={linha.pagamento.inscricao_id}>
                  <td style={{ ...td, color: C.ink }}>{linha.nome}</td>
                  <td style={{ ...td, textAlign: "right" }}>{moeda(linha.pagamento.valor_centavos)}</td>
                  <td style={td}>{prazoCurto(linha.pagamento.vence_em)}</td>
                  <td style={td}>
                    <Chip tone={tomDoPrazo(dias)}>{textoDoPrazo(dias)}</Chip>
                  </td>
                  <td style={td}>
                    {cobranca(linha) ? (
                      <a
                        href={cobranca(linha)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5 }}
                      >
                        Cobrar no WhatsApp
                        {/* O desenho de "abre fora daqui" no lugar da setinha de texto. */}
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : (
                      <span
                        style={{ fontSize: 11.5, color: C.ink4 }}
                        title={linha.inscrito ? `Discord: ${linha.inscrito.discord}` : undefined}
                      >
                        sem WhatsApp válido
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* ------------------------------------------------------------ perderam o prazo (D5) */}

      {/*
       * O bloco fica de pé enquanto houver a resposta do último «Passar a vaga»: passar a vaga do
       * ÚLTIMO da lista (o caso comum, um titular vencido) esvazia a lista, e sem isto o bloco
       * desmontava levando junto a mensagem do servidor — quem foi chamado, ou o erro. A resposta
       * sai com «Dispensar», e qualquer outra ação da aba a apaga (`limparResultados`): ela
       * nunca mostra a resposta de outra ação.
       */}
      {perderamOPrazo.length > 0 || resultadoVaga !== null ? (
        <>
          <BlockTitle right={<Chip tone={perderamOPrazo.length > 0 ? "danger" : "neutro"}>{perderamOPrazo.length}</Chip>}>
            Perderam o prazo
          </BlockTitle>
          {perderamOPrazo.length > 0 ? (
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
              Titulares que não pagaram até o prazo. Nada cancela sozinho: com um clique e a confirmação, a vaga passa ao
              1º da fila{primeiro ? ` (agora, ${nomeDe(primeiro)})` : ""}, que é chamado na hora e ganha o prazo dele.
              Quem perde a vaga vira «Desistiu», com auditoria, e o pagamento não é tocado. Quem declarou que pagou não
              está aqui — abra o extrato antes — e organizador nunca perde a vaga.
              {podeConferir ? null : ` ${SEM_ESCOPO_DA_VAGA}`}
            </p>
          ) : (
            <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink4, lineHeight: 1.7 }}>
              Ninguém mais com o prazo vencido.
            </p>
          )}
          {resultadoVaga && !ocupado ? (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", margin: "0 0 12px" }}>
              <p
                role={resultadoVaga === "falhou" ? "alert" : "status"}
                style={{
                  margin: 0,
                  flex: "1 1 240px",
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: resultadoVaga === "falhou" ? C.dangerSoft : C.okSoft,
                }}
              >
                {resultadoVaga === "falhou"
                  ? (ultimoErro ?? "Não foi possível passar a vaga.")
                  : (ultimaMensagem ?? "Vaga liberada.")}
              </p>
              <Button small fullWidth={compacto} onClick={() => setResultadoVaga(null)}>
                Dispensar
              </Button>
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 8 }}>
            {perderamOPrazo.map((linha) => {
              const proximo = primeiro && primeiro.id !== linha.pagamento.inscricao_id ? nomeDe(primeiro) : null;
              const botao = (
                <PassarAVaga
                  nome={linha.nome}
                  proximo={proximo}
                  onPassar={() => passarVaga(linha)}
                  desabilitado={!podeConferir || ocupado}
                  motivo={podeConferir ? undefined : SEM_ESCOPO_DA_VAGA}
                  largo={compacto}
                />
              );
              return compacto ? (
                <CartaoLinha
                  key={linha.pagamento.inscricao_id}
                  destaque={C.danger}
                  inicio={<Selo icone={CalendarClock} tom="danger" />}
                  titulo={linha.nome}
                  subtitulo={<span style={tabular}>venceu {prazoCurto(linha.pagamento.vence_em)}</span>}
                  fim={<ValorDoCartao centavos={linha.pagamento.valor_centavos} />}
                >
                  {botao}
                </CartaoLinha>
              ) : (
                <Card key={linha.pagamento.inscricao_id} padding="12px 16px">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: display, fontSize: 15, color: C.ink }}>{linha.nome}</span>
                    <ChipDaInscricao inscrito={linha.inscrito} />
                    <span style={{ fontSize: 12.5, color: C.dangerSoft, ...tabular }}>
                      venceu {prazoCurto(linha.pagamento.vence_em)} · {moeda(linha.pagamento.valor_centavos)}
                    </span>
                    <span style={{ marginLeft: "auto" }}>{botao}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      ) : null}

      {/* ------------------------------------------------------------ estornos */}

      <BlockTitle right={<Chip tone={aDevolver.length > 0 ? "warn" : "neutro"}>{aDevolver.length} a fazer</Chip>}>
        Estornos
      </BlockTitle>

      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
        Isto existe porque o item E — partidas recentes na solo/duo (regra 4) — só é verificável
        nos 10 dias antes do início: alguém aprovado em outubro pode ser recusado em novembro já
        tendo pago, e aí o dinheiro precisa voltar.
      </p>

      {/* 300px no monitor; no celular o piso cai, senão num aparelho de 320px a coluna única
          de 300 passava da largura útil e a página rolava de lado. */}
      <FieldGrid min={compacto ? 200 : 300}>
        <Card padding="14px 16px">
          <p style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.warn }}>
            A devolver
          </p>
          {aDevolver.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink4 }}>Nenhum estorno pendente.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {aDevolver.map(({ pagamento, nome }) => (
                <div
                  key={pagamento.inscricao_id}
                  style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                >
                  <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: C.ink, overflowWrap: "anywhere" }}>{nome}</span>
                  <span style={{ fontSize: 13, color: C.warnSoft, ...tabular }}>
                    {moeda(pagamento.valor_centavos)}
                  </span>
                  <Button
                    small
                    tone="gold"
                    disabled={travado}
                    title={motivo ?? "Marque só depois de o PIX de volta ter saído."}
                    onClick={() => void salvar(pagamento, "estornado")}
                  >
                    Devolvi
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="14px 16px">
          <p style={{ margin: "0 0 10px", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.ink4 }}>
            Já devolvidos
          </p>
          {devolvidos.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink4 }}>Nenhum estorno feito até agora.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {devolvidos.map(({ pagamento, nome }) => (
                <div
                  key={pagamento.inscricao_id}
                  style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                >
                  <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: C.ink2, overflowWrap: "anywhere" }}>{nome}</span>
                  <span style={{ fontSize: 13, color: C.ink3, ...tabular }}>
                    {moeda(pagamento.valor_centavos)}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.ink4, ...tabular }}>
                    {dataCurta(pagamento.conferido_em)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </FieldGrid>

      {/* ------------------------------------------------------------ fila de reserva com pagamento (D2) */}

      {aDevolverSeNaoJogar.length > 0 ? (
        <>
          <BlockTitle right={<Chip tone="warn">{moeda(valorADevolverSeNaoJogar)}</Chip>}>
            A devolver se não jogar
          </BlockTitle>
          <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
            Quem está na fila de reserva e já pagou (ou disse que pagou). Reserva só paga se for chamado: o dinheiro fica
            registrado na conta, mas FORA do prêmio. Se a pessoa for chamada, passa a contar no arrecadado; se não for
            chamada até o fim, a organização devolve — mude o estado para «Estorno devido» e marque «Devolvi» quando o Pix
            sair. «Declarado» ainda pede abrir o extrato.
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            {aDevolverSeNaoJogar.map((linha) =>
              compacto ? (
                <CartaoLinha
                  key={linha.pagamento.inscricao_id}
                  inicio={<SeloDoEstado estado={linha.pagamento.estado} />}
                  titulo={linha.nome}
                  subtitulo={ROTULO_PAGAMENTO[linha.pagamento.estado]}
                  fim={<ValorDoCartao centavos={linha.pagamento.valor_centavos} />}
                >
                  <ChipDoLugar lugar={linha.lugar} />
                </CartaoLinha>
              ) : (
                <Card key={linha.pagamento.inscricao_id} padding="12px 16px">
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: display, fontSize: 15, color: C.ink }}>{linha.nome}</span>
                    <ChipDoLugar lugar={linha.lugar} />
                    <Chip tone={TOM_DO_ESTADO[linha.pagamento.estado]}>{ROTULO_PAGAMENTO[linha.pagamento.estado]}</Chip>
                    <span style={{ marginLeft: "auto", fontSize: 13, color: C.warnSoft, ...tabular }}>
                      {moeda(linha.pagamento.valor_centavos)}
                    </span>
                  </div>
                </Card>
              ),
            )}
          </div>
        </>
      ) : null}

      {/* ------------------------------------------------------------ todos */}

      <BlockTitle right={<Chip>{visiveis.length} de {linhas.length}</Chip>}>Todos os pagamentos</BlockTitle>

      {compacto ? (
        // Filtro em chips: um toque em vez de abrir o <select>, e a contagem de cada estado
        // à vista. Só aparecem os estados que existem (mais o escolhido, para dar para sair
        // dele). Tocar no chip aceso volta para «Todos».
        <RolagemX rotulo="Filtrar pagamentos por estado" style={{ marginBottom: 10 }}>
          <ChipFiltro ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos <span style={tabular}>{linhas.length}</span>
          </ChipFiltro>
          {ESTADOS_PAGAMENTO.filter((e) => contagem[e] > 0 || filtro === e).map((e) => {
            const Desenho = ICONE_DO_ESTADO[e];
            return (
              <ChipFiltro
                key={e}
                ativo={filtro === e}
                title={ROTULO_PAGAMENTO[e]}
                onClick={() => setFiltro(filtro === e ? "todos" : e)}
              >
                <Desenho size={14} aria-hidden />
                {ROTULO_CURTO[e]} <span style={tabular}>{contagem[e]}</span>
              </ChipFiltro>
            );
          })}
        </RolagemX>
      ) : (
        <Toolbar style={{ marginBottom: 12 }}>
          <Field label="Filtrar por estado" style={{ minWidth: 240 }}>
            <Select
              value={filtro}
              onChange={(v) => setFiltro(comoEstado(v) ?? "todos")}
              ariaLabel="Filtrar pagamentos por estado"
            >
              <option value="todos">Todos ({linhas.length})</option>
              {ESTADOS_PAGAMENTO.map((e) => (
                <option key={e} value={e}>
                  {ROTULO_PAGAMENTO[e]} ({contagem[e]})
                </option>
              ))}
            </Select>
          </Field>
        </Toolbar>
      )}

      {visiveis.length === 0 ? (
        <Empty title="Nada neste filtro">
          Nenhum pagamento está em{" "}
          {filtro === "todos" ? "nenhum estado" : `“${ROTULO_PAGAMENTO[filtro]}”`} agora.
        </Empty>
      ) : compacto ? (
        <>
          <p
            id={contagemId}
            tabIndex={-1}
            style={{ margin: "0 0 10px", fontSize: 11.5, color: C.ink4, outline: "none", ...tabular }}
          >
            Mostrando {visiveis.length} de {linhas.length}. Toque num pagamento para ver o detalhe e mudar o estado.
          </p>
          {/* A tabela de 1180px virava uma faixa de rolagem lateral com nove colunas. No
              cartão fica o que se lê de relance (estado, valor, o último acontecimento); o
              resto, e os controles, moram na folha que o toque abre. */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {visiveis.map((linha) => {
              const { pagamento, inscrito, nome, fora } = linha;
              const id = pagamento.inscricao_id;
              const resumo = resumoDoPagamento(pagamento);
              const linhaMiuda = [inscrito?.situacao, resumo].filter(Boolean).join(" · ");
              return (
                <li key={id}>
                  {/* À direita só o valor; o estado desce para a fileira de baixo, que tem a
                      largura toda — os rótulos oficiais são longos ("Declarado pelo jogador")
                      e, num chip sem quebra ao lado do valor, deixavam ~60px para o Riot ID. */}
                  <CartaoLinha
                    idAlvo={`pagamento-${id}`}
                    abreDialogo
                    selecionado={abertoId === id}
                    rotuloAlvo={`Abrir o pagamento de ${nome}`}
                    onClick={() => {
                      setAbertoId(id);
                      setFalhouNaFolha(false);
                    }}
                    inicio={<SeloDoEstado estado={pagamento.estado} />}
                    titulo={nome}
                    subtitulo={linhaMiuda ? <span style={tabular}>{linhaMiuda}</span> : undefined}
                    fim={<ValorDoCartao centavos={pagamento.valor_centavos} />}
                  >
                    <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      <Chip tone={TOM_DO_ESTADO[pagamento.estado]}>{ROTULO_PAGAMENTO[pagamento.estado]}</Chip>
                      {linha.lugar.tipo === "reserva" ? <ChipDoLugar lugar={linha.lugar} /> : null}
                      {inscrito?.organizador ? (
                        <Chip tone="gold" title={TITULO_ORGANIZACAO}>
                          organização
                        </Chip>
                      ) : null}
                      {fora ? (
                        <Chip tone="off" title={TITULO_FORA}>
                          fora — não cobrar
                        </Chip>
                      ) : null}
                      {!inscrito ? <ChipDaInscricao inscrito={null} /> : null}
                    </span>
                  </CartaoLinha>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse", ...tabular }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, width: "100%" }}>
                  Jogador
                </th>
                <th scope="col" style={th}>
                  Inscrição
                </th>
                <th scope="col" style={th}>
                  Estado
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Valor
                </th>
                <th scope="col" style={th}>
                  Declarou
                </th>
                <th scope="col" style={th}>
                  Vence
                </th>
                <th scope="col" style={th}>
                  Conferido
                </th>
                <th scope="col" style={th}>
                  Alterar estado
                </th>
                <th scope="col" style={th}>
                  Observação
                </th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ pagamento, inscrito, nome, lugar }) => {
                const id = pagamento.inscricao_id;
                return (
                  <tr key={id}>
                    <td style={{ ...td, color: C.ink }}>
                      {nome}
                      {lugar.tipo === "reserva" ? (
                        <span style={{ marginLeft: 8 }}>
                          <ChipDoLugar lugar={lugar} />
                        </span>
                      ) : null}
                      {inscrito?.organizador ? (
                        <span style={{ marginLeft: 8 }}>
                          <Chip tone="gold" title={TITULO_ORGANIZACAO}>
                            organização
                          </Chip>
                        </span>
                      ) : null}
                      {inscrito && foraDaCobranca(inscrito.situacao, pagamento.estado) ? (
                        <span style={{ marginLeft: 8 }}>
                          <Chip tone="off" title={TITULO_FORA}>
                            fora — não cobrar
                          </Chip>
                        </span>
                      ) : null}
                    </td>
                    <td style={td}>
                      <ChipDaInscricao inscrito={inscrito} />
                    </td>
                    <td style={td}>
                      <Chip tone={TOM_DO_ESTADO[pagamento.estado]}>{ROTULO_PAGAMENTO[pagamento.estado]}</Chip>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.bronzeLit }}>
                      {moeda(pagamento.valor_centavos)}
                    </td>
                    <td style={td}>{dataHora(pagamento.declarado_em)}</td>
                    <td style={td}>{prazoCurto(pagamento.vence_em)}</td>
                    <td style={td}>
                      {pagamento.conferido_em ? (
                        <span title={pagamento.conferido_por ?? undefined}>
                          {dataCurta(pagamento.conferido_em)}
                          {pagamento.conferido_por ? (
                            <span style={{ color: C.ink4 }}> · {pagamento.conferido_por}</span>
                          ) : null}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ ...td, minWidth: 210 }}>
                      {/* O que mexe no caixa (ou desfaz um «pago») pede confirmação: a seta do
                          teclado troca a opção deste <select> sem abrir a lista (ver
                          `confirmaTroca`). O resto grava direto e fica na auditoria. Dizer que o
                          dinheiro entrou continua tendo botão próprio lá em cima. Cancelado, o
                          <select> controlado volta sozinho ao estado gravado. */}
                      <Select
                        value={pagamento.estado}
                        disabled={travado}
                        ariaLabel={`Estado do pagamento de ${nome}`}
                        onChange={(v) => {
                          const proximo = comoEstado(v);
                          if (!proximo || proximo === pagamento.estado) return;
                          if (confirmaTroca(nome, pagamento.estado, proximo)) void salvar(pagamento, proximo);
                        }}
                      >
                        {ESTADOS_PAGAMENTO.map((e) => (
                          <option key={e} value={e}>
                            {ROTULO_PAGAMENTO[e]}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td style={{ ...td, minWidth: 230 }}>
                      <Input
                        value={rascunhoObs[id] ?? ""}
                        onChange={(v) => escreverObs(id, v)}
                        disabled={travado}
                        placeholder="grava na próxima mudança de estado"
                        ariaLabel={`Observação do pagamento de ${nome}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* A folha só existe no celular: no monitor a mesma coisa está na linha da tabela. Se a
          janela crescer com ela aberta, ela some e a tabela assume — sem estado perdido, porque
          o rascunho da observação mora aqui na seção, não na folha. */}
      <Folha
        aberta={compacto && linhaAberta !== null}
        titulo={linhaAberta?.nome ?? ""}
        icone={ReceiptText}
        onFechar={fecharFolha}
      >
        {linhaAberta ? (
          <DetalheDoPagamento
            linha={linhaAberta}
            observacao={rascunhoObs[linhaAberta.pagamento.inscricao_id] ?? ""}
            onObservacao={(texto) => escreverObs(linhaAberta.pagamento.inscricao_id, texto)}
            onEstado={(estado) => {
              if (confirmaTroca(linhaAberta.nome, linhaAberta.pagamento.estado, estado)) {
                void salvarDaFolha(linhaAberta.pagamento, estado);
              }
            }}
            travado={travado}
            motivo={motivo}
            erro={falhouNaFolha && !ocupado ? (ultimoErro ?? "Não foi possível salvar.") : null}
          />
        ) : null}
      </Folha>
    </div>
  );
}
