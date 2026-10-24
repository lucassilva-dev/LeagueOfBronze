"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Crown,
  ExternalLink,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Shuffle,
  Timer,
  UserRoundPlus,
} from "lucide-react";

import { TabelaDePontos, TotalDaTabela } from "@/components/admin/e4/tabela-de-pontos";
import { useCompacto } from "@/components/admin/responsivo";
import {
  ActionCard,
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  CartaoLinha,
  Check,
  Chip,
  ChipFiltro,
  Dados,
  Elo,
  Empty,
  Folha,
  Input,
  Metric,
  RolagemX,
  ScrollX,
  SectionHead,
  Select,
  display,
  tabular,
} from "@/components/admin/ui";
import { RoleIcon } from "@/components/lob/ui";
import {
  TIMES_DO_CALENDARIO_4A,
  calendarioDivulgado,
  diaDoSlot,
  seriesDePontosCom,
  slotsDoCalendario,
} from "@/lib/calendario-4a";
import { resolveElo, resolveRole } from "@/lib/design";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";
import { exigemConfirmacaoNaVirada, listaForaDoDraft } from "@/lib/draft/virada";
import { estaFora } from "@/lib/inscricoes/pagamento";

/**
 * Draft ao vivo — a mesa da organização.
 *
 * Antes desta tela, a rota `/api/admin/draft` existia mas nenhuma tela a chamava: não
 * havia como sortear, iniciar, pausar nem aplicar o draft sem montar uma requisição à mão
 * no dia do evento. A tela segue a ordem do dia:
 *
 *   conferir → sortear capitães e ordem → iniciar → (pausar/retomar/escolher por alguém)
 *   → conferir os elencos → aplicar no site → sortear as posições e criar o calendário
 *
 * Fica fora do `PainelEdicao` de propósito: aquele contêiner lê `/api/admin/edicao`, que
 * traz contato dos inscritos e exige conferir/financeiro. Quem só conduz o draft (a conta
 * "sorteio") não precisa — e não deve — ver e-mail e WhatsApp de ninguém.
 *
 * No celular a mesa muda de arranjo, não de regra. Com o draft sorteado, o placar da vez,
 * os botões de iniciar/pausar/retomar e o pool do time da vez sobem para o topo: quem
 * conduz pelo telefone não pode rolar a conferência e oito elencos para achar o jogador
 * que o capitão pediu no Discord. O pool vira cartões (emblema do elo, rotas, preço) com
 * busca e filtro de rota, e o `window.confirm` vira uma folha que mostra o orçamento do
 * time depois da escolha. A vez continua lida no toque e indo no pedido.
 */

type RespostaDoPainel = {
  draft: DraftPublico | null;
  sorteio: { semente: string; capitaes: string[]; emISO: string } | null;
  semSaida: { timeId: string; teto: number } | null;
  previa: PreviaDoDraft;
  error?: string;
};

type PrevisaoDaVirada = {
  problemas: string[];
  /** O que não trava, mas a mesa precisa saber (time com vaga aberta, C1). Servidor antigo não manda. */
  avisos?: string[];
  teams: { id: string; name: string }[];
  /** `reserva`: vai para o site sem time (C4) — os reservas da fila. */
  players: { id: string; nick: string; teamId?: string; role1: string; elo: string; reserva?: boolean }[];
};

type Props = Readonly<{
  onAlert: (kind: "ok" | "erro", text: string) => void;
  podeConduzir: boolean;
  /** A virada e o calendário gravam o dataset por fora do editor: o painel precisa recarregar. */
  onDatasetMudou: () => void;
}>;

/** Os métodos que a mesa oferece (a rota aceita outros, antigos, que o painel não mostra). */
type MetodoDaMesa = "definidos" | "maior_elo" | "manual";

type Disponivel = DraftPublico["disponiveis"][number];
type TimePublico = DraftPublico["times"][number];
type JogadorDaPrevia = PreviaDoDraft["jogadores"][number];
type TimeDefinidoDaPrevia = NonNullable<PreviaDoDraft["timeDefinido"]>;

/**
 * Escolha do celular à espera da confirmação na folha. A vez (time, número da escolha e
 * sorteio) é lida no TOQUE, como o desktop lê antes do `confirm`: se o relógio virar com
 * a folha aberta, o servidor recusa em vez de dar o jogador ao time seguinte.
 */
type Confirmacao = { id: string; escolha: number; timeId: string; nome: string; sorteioId: string | null };

/**
 * O que o cartão "4 · Calendário" diz, tirado da grade (lib/calendario-4a.ts): quantos
 * times, quantas séries de pontos e o período delas. Sem a grade divulgada, os números são
 * os do formato (8 times → 28 séries) e o botão fica travado.
 */
const CALENDARIO_DO_PAINEL = (() => {
  const divulgado = calendarioDivulgado();
  const dias = slotsDoCalendario()
    .filter((s) => s.tipo === "pontos")
    .map(diaDoSlot)
    .sort();
  const ddmm = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
  return {
    divulgado,
    times: TIMES_DO_CALENDARIO_4A,
    pontos: divulgado ? dias.length : seriesDePontosCom(TIMES_DO_CALENDARIO_4A),
    periodoDosPontos: dias.length > 0 ? `${ddmm(dias[0]!)} a ${ddmm(dias[dias.length - 1]!)}` : "",
  };
})();

const MOTIVO_DA_PAUSA: Record<NonNullable<DraftPublico["motivoDaPausa"]>, string> = {
  organizacao: "pausado pela organização",
  atraso:
    "pausou sozinho: ficou mais de uma escolha inteira sem ninguém acompanhando (queda de conexão). Retome quando a sala estiver de volta",
  sem_jogador: "pausou sozinho: o time da vez não tinha jogador possível",
};

const ROTULO_DA_FASE: Record<DraftPublico["fase"], { texto: string; tom: "neutro" | "gold" | "ok" | "warn" }> = {
  preparando: { texto: "Sorteado · aguardando início", tom: "gold" },
  rodando: { texto: "Ao vivo", tom: "ok" },
  pausado: { texto: "Pausado", tom: "warn" },
  encerrado: { texto: "Encerrado", tom: "neutro" },
};

/** Chaves canônicas das rotas, na ordem do mapa. O banco grava JUNG, não SEL — ver `resolveRole`. */
const ROTAS = ["TOP", "JUNG", "MID", "ADC", "SUP"] as const;

const nota: CSSProperties = { margin: 0, fontSize: 11.5, lineHeight: 1.6, color: C.ink4 };

const listaDeCartoes: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

/** Texto só para leitor de tela. O projeto não tem classe utilitária para isso. */
const somenteLeitor: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

function segundosAte(prazoISO: string | null, agoraMs: number): number | null {
  if (!prazoISO) return null;
  return Math.max(0, Math.ceil((Date.parse(prazoISO) - agoraMs) / 1000));
}

/**
 * "II · 54 PDL" a partir de "Diamante II · 54 PDL": o nome do elo o emblema já mostra.
 * Divisão e PDL continuam escritos porque são eles que desempatam o corte dos capitães.
 */
function detalheDaForca(elo: string, forca: string): string | null {
  const meta = resolveElo(elo);
  if (!meta || !forca.startsWith(meta.label)) return null;
  return forca.slice(meta.label.length).replace(/^[\s·]+/, "").trim() || null;
}

/** Riot ID com a tag apagada — o nome é o que se procura; a tag só desambigua. */
function NomeDeJogo({ riotId }: Readonly<{ riotId: string }>) {
  const corte = riotId.lastIndexOf("#");
  if (corte <= 0) return <>{riotId}</>;
  return (
    <>
      {riotId.slice(0, corte)}
      <span style={{ color: C.ink4, fontWeight: 400 }}>{riotId.slice(corte)}</span>
    </>
  );
}

/** As duas rotas com o ícone oficial: a primária na cor dela, a secundária apagada. */
function Rotas({ rota1, rota2 }: Readonly<{ rota1: string; rota2: string }>) {
  const primaria = resolveRole(rota1);
  const secundaria = resolveRole(rota2);
  return (
    <span
      title={`Primária ${primaria.label}, secundária ${secundaria.label}`}
      style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: primaria.color, fontWeight: 600 }}>
        <RoleIcon role={rota1} size={13} color={primaria.color} />
        {primaria.short}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: C.ink3 }}>
        <RoleIcon role={rota2} size={13} color={C.ink3} />
        {secundaria.short}
      </span>
    </span>
  );
}

/** O preço, grande, na ponta do cartão: é o número que decide se cabe no orçamento. */
function Preco({ pontos }: Readonly<{ pontos: number }>) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 3, ...tabular }}>
      <span style={{ fontFamily: display, fontSize: 20, lineHeight: 1, color: C.bronzeHi }}>{pontos}</span>
      <span style={{ fontSize: 9.5, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink4 }}>pts</span>
    </span>
  );
}

/**
 * A tag do capitão sem preço (decisão de 23/10/2026), no lugar dos pontos: o capitão não custa
 * nada, e cada time tem o orçamento inteiro para as escolhas.
 */
function TagCapitao() {
  return (
    <Chip tone="gold" title="Capitão: não tem preço. Cada time tem o orçamento inteiro para as escolhas.">
      <Crown size={11} aria-hidden />
      capitão
    </Chip>
  );
}

/**
 * A tag do time definido pela organização (decisão de 24/10/2026), no lugar dos pontos: os
 * membros já entram prontos, não vão ao draft e não têm preço. Na lista de quem joga ela leva a
 * rota no time; na grade do draft, sem rota, no lugar do gasto. Não é a tag de CAPITÃO de
 * propósito — a do capitão diz que o time tem o orçamento inteiro para as escolhas, e este
 * time não escolhe.
 */
function TagTimeDefinido({ rota }: Readonly<{ rota?: string | null }>) {
  const meta = rota ? resolveRole(rota) : null;
  return (
    <Chip tone="neutro" title="Time definido pela organização: já entra pronto, não participa do draft e não tem preço.">
      <ShieldCheck size={11} aria-hidden />
      time definido
      {meta && meta.key ? <span style={{ color: meta.color, fontWeight: 700 }}>· {meta.short}</span> : null}
    </Chip>
  );
}

/** O capitão do time definido na lista de quem joga: capitão do time dele, não do draft. */
function ChipCapitaoDoTimeDefinido() {
  return (
    <Chip tone="gold" title="Capitão do time definido pela organização. Não escolhe no draft.">
      <Crown size={11} aria-hidden />
      capitão do time definido
    </Chip>
  );
}

/**
 * O time definido pela organização na conferência: os membros na ordem das rotas, o capitão
 * e, enquanto ele não vale, o que falta acertar — em destaque aqui, além da lista geral de
 * impedimentos, porque é o que a organização vai procurar quando o sorteio não sai.
 */
function TimeDefinidoNaConferencia({ time }: Readonly<{ time: TimeDefinidoDaPrevia }>) {
  // O servidor já manda na ordem das rotas quando o time vale; marcado e inválido, não.
  const posicao = (rota: string) => {
    const i = (ROTAS as readonly string[]).indexOf(resolveRole(rota).key);
    return i === -1 ? ROTAS.length : i;
  };
  const membros = [...time.membros].sort((a, b) => posicao(a.rota) - posicao(b.rota));
  return (
    <ActionCard
      tone={time.ativo ? "neutro" : "danger"}
      title="Time definido pela organização"
      description="Já entra pronto e não participa do draft: não escolhe e ninguém o escolhe. Tira o nome e a cor no sorteio como os outros times, mas fica fora da ordem de escolha, e os membros não têm preço."
      badge={time.ativo ? <Chip tone="ok">pronto</Chip> : <Chip tone="danger">falta acertar</Chip>}
      style={{ marginBottom: 14 }}
    >
      {!time.ativo && time.impedimentos.length > 0 ? (
        <Banner tone="danger" title="O time definido ainda não está pronto: o sorteio fica travado">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {time.impedimentos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Banner>
      ) : null}
      {membros.length === 0 ? (
        <p style={nota}>Nenhum membro do time definido está entre os inscritos que jogam.</p>
      ) : (
        <ul
          aria-label="Membros do time definido"
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))",
            gap: "8px 14px",
            fontSize: 12.5,
          }}
        >
          {membros.map((m) => {
            const rota = resolveRole(m.rota);
            return (
              <li key={m.riotId} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <span
                  title={rota.label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    width: 46,
                    flexShrink: 0,
                    color: rota.color,
                    fontWeight: 600,
                  }}
                >
                  <RoleIcon role={m.rota} size={13} color={rota.color} />
                  {rota.key ? rota.short : m.rota || "—"}
                </span>
                <Elo elo={m.elo} tamanho={22} />
                <span style={{ minWidth: 0, overflowWrap: "anywhere", color: C.ink }}>
                  <NomeDeJogo riotId={m.riotId} />
                </span>
                {m.capitao ? (
                  <Chip tone="gold" title="O capitão do time definido pela organização.">
                    <Crown size={11} aria-hidden />
                    capitão
                  </Chip>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </ActionCard>
  );
}

/**
 * O organizador na lista de quem joga. Pela regra do maior elo ele não capitaneia; quando a
 * organização define os capitães (definidos, à mão), pode — foi o que decidiu em 23/10/2026.
 */
function ChipDoOrganizador({ metodo }: Readonly<{ metodo: MetodoDaMesa }>) {
  return <Chip tone="off">{metodo === "maior_elo" ? "organização · não capitaneia" : "organização"}</Chip>;
}

/**
 * Placar do celular: de quem é a vez e quanto falta, em letra que se lê com o telefone
 * na mão. No monitor a mesma informação cabe numa linha só (o cartão de estado de sempre).
 */
function PlacarDaVez({
  draft,
  timeDaVez,
  restante,
}: Readonly<{ draft: DraftPublico; timeDaVez: TimePublico | null; restante: number | null }>) {
  const fase = ROTULO_DA_FASE[draft.fase];
  const correndo = restante !== null && draft.fase === "rodando";
  return (
    <Card
      padding="14px 16px"
      style={{ marginBottom: 14, boxShadow: timeDaVez ? `inset 3px 0 0 ${timeDaVez.cor}` : undefined }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <Chip tone={fase.tom}>{fase.texto}</Chip>
        <span style={{ fontSize: 12.5, color: C.ink2, ...tabular }}>
          Escolha {Math.min(draft.escolhaAtual + 1, draft.totalEscolhas)} de {draft.totalEscolhas}
        </span>
      </div>
      {draft.motivoDaPausa ? (
        <p style={{ margin: "8px 0 0", fontSize: 12, lineHeight: 1.5, color: C.warnSoft }}>
          {MOTIVO_DA_PAUSA[draft.motivoDaPausa]}
        </p>
      ) : null}
      {timeDaVez ? (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, letterSpacing: ".2em", textTransform: "uppercase", color: C.ink4 }}>Vez de</div>
            <div
              style={{
                fontFamily: display,
                fontSize: 28,
                lineHeight: 1.05,
                color: timeDaVez.cor,
                overflowWrap: "anywhere",
              }}
            >
              {timeDaVez.nome}
            </div>
            <div style={{ marginTop: 3, fontSize: 12, color: C.ink3, overflowWrap: "anywhere" }}>
              capitão {timeDaVez.capitaoRiotId}
            </div>
          </div>
          {correndo ? (
            <div
              role="timer"
              aria-label={`${restante} segundos para a escolha`}
              style={{ flexShrink: 0, textAlign: "right", color: restante <= 10 ? C.dangerSoft : C.bronzeHi }}
            >
              <Timer size={16} aria-hidden style={{ display: "block", marginLeft: "auto" }} />
              <b style={{ fontFamily: display, fontSize: 34, lineHeight: 1, ...tabular }}>{restante}s</b>
            </div>
          ) : null}
        </div>
      ) : null}
      <div style={{ marginTop: 10, fontSize: 11.5, color: C.ink4 }}>
        orçamento {draft.orcamentoPorTime} pts · {draft.jogadoresPorTime} por time
      </div>
    </Card>
  );
}

/**
 * O pool do time da vez no celular: busca pelo Riot ID, filtro de rota e um cartão por
 * jogador. Um toque abre a folha de confirmação.
 *
 * Só quem o motor aceitaria agora (`escolhiveis`) é tocável, como no <select> do monitor.
 * Os outros só aparecem quando há busca: é o caso do capitão que pede alguém pelo nome e
 * a pessoa precisa ver que ele NÃO cabe, em vez de achar que digitou errado.
 */
function PoolDaVez({
  draft,
  nomeDoTime,
  podeTocar,
  motivoSemToque,
  busca,
  onBusca,
  filtroRota,
  onFiltroRota,
  marcadoId,
  onTocar,
}: Readonly<{
  draft: DraftPublico;
  nomeDoTime: string;
  podeTocar: boolean;
  motivoSemToque: string | null;
  busca: string;
  onBusca: (valor: string) => void;
  filtroRota: string | null;
  onFiltroRota: (rota: string | null) => void;
  marcadoId: string | null;
  onTocar: (jogador: Disponivel) => void;
}>) {
  const escolhiveis = new Set(draft.escolhiveis);
  const termo = busca.trim().toLowerCase();
  const daRota = (j: Disponivel, rota: string) =>
    resolveRole(j.rota1).key === rota || resolveRole(j.rota2).key === rota;
  const passa = (j: Disponivel) =>
    (!filtroRota || daRota(j, filtroRota)) && (!termo || j.riotId.toLowerCase().includes(termo));
  // Mesma ordem do <select> do monitor (preço, depois nome). Com rota escolhida, quem a
  // joga de PRIMÁRIA vem antes: secundária cobre buraco, mas não é titular.
  const ordem = (a: Disponivel, b: Disponivel) => {
    if (filtroRota) {
      const pa = resolveRole(a.rota1).key === filtroRota ? 0 : 1;
      const pb = resolveRole(b.rota1).key === filtroRota ? 0 : 1;
      if (pa !== pb) return pa - pb;
    }
    return b.pontos - a.pontos || a.riotId.localeCompare(b.riotId);
  };

  const podem = draft.disponiveis.filter((j) => escolhiveis.has(j.id));
  const visiveis = podem.filter(passa).sort(ordem);
  const foraDoAlcance = termo ? draft.disponiveis.filter((j) => !escolhiveis.has(j.id)).filter(passa).sort(ordem) : [];
  const porRota = ROTAS.map((rota) => ({ meta: resolveRole(rota), quantos: podem.filter((j) => daRota(j, rota)).length }));

  // `cabe` é a conta do motor; tocar exige também conduzir e o draft rodando. Pausado, o
  // cartão de quem cabe continua sem selo — só não abre a folha.
  const cartao = (j: Disponivel, cabe: boolean) => (
    <li key={j.id}>
      <CartaoLinha
        inicio={<Elo elo={j.elo} tamanho={40} />}
        titulo={<NomeDeJogo riotId={j.riotId} />}
        subtitulo={<Rotas rota1={j.rota1} rota2={j.rota2} />}
        fim={
          <>
            <Preco pontos={j.pontos} />
            {cabe ? null : (
              <Chip tone="off" title="O motor recusa: o orçamento deste time ou os elencos dos outros não fechariam.">
                não cabe agora
              </Chip>
            )}
          </>
        }
        onClick={cabe && podeTocar ? () => onTocar(j) : undefined}
        abreDialogo
        selecionado={marcadoId === j.id}
        rotuloAlvo={`Escolher ${j.riotId} para ${nomeDoTime}`}
      />
    </li>
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Input
        type="search"
        value={busca}
        onChange={onBusca}
        placeholder="Buscar pelo Riot ID"
        ariaLabel="Buscar jogador no pool"
        autoComplete="off"
      />
      <RolagemX rotulo="Filtrar o pool por rota">
        <ChipFiltro ativo={filtroRota === null} onClick={() => onFiltroRota(null)}>
          Todas <span style={tabular}>{podem.length}</span>
        </ChipFiltro>
        {porRota.map(({ meta, quantos }) => {
          const ativo = filtroRota === meta.key;
          return (
            <ChipFiltro
              key={meta.key}
              ativo={ativo}
              onClick={() => onFiltroRota(ativo ? null : meta.key)}
              rotulo={`${meta.label}: ${quantos}`}
            >
              <RoleIcon role={meta.key} size={15} color={ativo ? "#160f06" : meta.color} />
              {meta.short} <span style={tabular}>{quantos}</span>
            </ChipFiltro>
          );
        })}
      </RolagemX>

      <p style={{ ...nota, ...tabular }}>
        {visiveis.length === podem.length
          ? `${podem.length} ${podem.length === 1 ? "pode ir" : "podem ir"} para ${nomeDoTime} agora.`
          : `Mostrando ${visiveis.length} de ${podem.length} que podem ir para ${nomeDoTime}.`}{" "}
        {motivoSemToque ?? "Toque em alguém para escolher."}
      </p>

      {visiveis.length === 0 ? (
        <p style={{ margin: 0, padding: "14px 0", textAlign: "center", fontSize: 12.5, color: C.ink3 }}>
          {podem.length === 0
            ? "Ninguém disponível cabe neste time agora."
            : "Ninguém com esse filtro entre quem pode ir."}
        </p>
      ) : (
        <ul style={listaDeCartoes}>{visiveis.map((j) => cartao(j, true))}</ul>
      )}

      {foraDoAlcance.length > 0 ? (
        <>
          <p style={{ ...nota, marginTop: 4 }}>Disponíveis que não cabem para {nomeDoTime} agora:</p>
          <ul style={listaDeCartoes}>{foraDoAlcance.map((j) => cartao(j, false))}</ul>
        </>
      ) : null}
    </div>
  );
}

/** O miolo da folha de confirmação: quem, quanto custa e como fica o orçamento do time. */
function FichaDaEscolha({
  alvo,
  time,
  orcamento,
  motivoInvalida,
}: Readonly<{ alvo: Disponivel | null; time: TimePublico | null; orcamento: number; motivoInvalida: string | null }>) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {motivoInvalida ? (
        <Banner tone="warn" title="Esta escolha não vale mais">
          {motivoInvalida}
        </Banner>
      ) : null}
      {alvo ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Elo elo={alvo.elo} tamanho={60} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: display, fontSize: 22, lineHeight: 1.1, color: C.ink, overflowWrap: "anywhere" }}>
                <NomeDeJogo riotId={alvo.riotId} />
              </div>
              <div style={{ marginTop: 7, fontSize: 12.5 }}>
                <Rotas rota1={alvo.rota1} rota2={alvo.rota2} />
              </div>
            </div>
          </div>
          <Dados
            itens={[
              { rotulo: "Preço", valor: `${alvo.pontos} ${alvo.pontos === 1 ? "ponto" : "pontos"}` },
              ...(time
                ? [
                    { rotulo: "Vagas depois", valor: String(Math.max(0, time.vagas - 1)) },
                    {
                      rotulo: `Orçamento do ${time.nome}`,
                      valor: (
                        <span style={tabular}>
                          {time.gasto} → <b style={{ color: C.bronzeHi }}>{time.gasto + alvo.pontos}</b> de {orcamento} pts
                        </span>
                      ),
                      largo: true,
                    },
                  ]
                : []),
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

export function SecaoDraft({ onAlert, podeConduzir, onDatasetMudou }: Props) {
  const compacto = useCompacto();
  const [dados, setDados] = useState<RespostaDoPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  /**
   * O método escolhido na tela. Nulo = o padrão do servidor (`metodoPadrao`): os capitães
   * definidos pela organização quando há marcados, senão a regra do maior elo.
   */
  const [metodoEscolhido, setMetodoEscolhido] = useState<MetodoDaMesa | null>(null);
  const [manuais, setManuais] = useState<string[]>([]);
  /** Editando os capitães definidos: a marcação aparece na lista de quem joga, e «Salvar capitães» grava. */
  const [editandoDefinidos, setEditandoDefinidos] = useState(false);
  /**
   * «Sortear de novo APAGA o draft» marcado — guardado junto do sorteio que estava na tela.
   * Se outro sorteio entrar enquanto a caixa está marcada, ela desmarca sozinha: a
   * confirmação era sobre o draft visto, não sobre o novo.
   */
  const [descarteConfirmado, setDescarteConfirmado] = useState<{ sorteioId: string | null } | null>(null);
  /**
   * O jogador marcado para "escolher pelo time" vale só para a escolha em que foi marcado.
   * Guardado junto do número da escolha: virou a vez, a seleção some sozinha — sem isso o
   * nome escolhido para um time continuava selecionado na vez do seguinte.
   */
  const [selecao, setSelecao] = useState<{ escolha: number; id: string } | null>(null);
  /** Celular: a escolha à espera de confirmação na folha (ver `Confirmacao`). */
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null);
  /** Celular: busca e filtro de rota do pool. Voltam ao zero depois de cada escolha feita aqui. */
  const [busca, setBusca] = useState("");
  const [filtroRota, setFiltroRota] = useState<string | null>(null);
  /** Celular: a lista de quem joga, recolhida depois do sorteio. Nulo = o padrão da fase. */
  const [verJogadores, setVerJogadores] = useState<boolean | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoDaVirada | null>(null);
  const [confirmoVirada, setConfirmoVirada] = useState(false);
  /** O servidor avisou que o draft já está no site: reaplicar exige a segunda confirmação. */
  const [pedeReaplicar, setPedeReaplicar] = useState(false);
  const [confirmoReaplicar, setConfirmoReaplicar] = useState(false);
  /**
   * A lista de "fora do draft" que a pessoa confirmou ao aplicar (a chave dela). Guardar a
   * lista, e não um booleano, faz a confirmação cair sozinha se mais alguém sair depois.
   */
  const [foraConfirmado, setForaConfirmado] = useState<string | null>(null);
  const [confirmoCalendario, setConfirmoCalendario] = useState(false);
  const calendario = CALENDARIO_DO_PAINEL;
  const [posicoes, setPosicoes] = useState<{ posicao: number; nome: string }[] | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  /** Hora do servidor menos a do aparelho (ms), medida a cada sondagem — mesma correção da TV. */
  const defasagem = useRef(0);
  /** Fase e motivo da pausa da última sondagem aceita — para saber quando reler o painel. */
  const ultimaSituacao = useRef<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/draft", { cache: "no-store" });
      const corpo = (await r.json().catch(() => ({}))) as RespostaDoPainel & { missing?: string[] };
      if (!r.ok) throw new Error(corpo.error ?? `Falha ${r.status}`);
      // Leitura que saiu antes da última ação e chegou depois não volta o quadro no tempo.
      setDados((atual) =>
        atual?.draft && corpo.draft && corpo.draft.revisao < atual.draft.revisao ? atual : corpo,
      );
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar o draft.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const fase = dados?.draft?.fase ?? null;
  const aoVivo = fase === "rodando" || fase === "pausado";

  /*
   * Com o draft no ar, a tela sonda a rota PÚBLICA do estado — é ela que faz o relógio
   * andar (o auto-pick acontece em quem sonda). Sem isto, com a transmissão fechada e só o
   * painel aberto, o cronômetro estourava e ninguém aplicava a escolha automática.
   */
  useEffect(() => {
    if (!aoVivo) return;
    let vivo = true;
    const sondar = async () => {
      try {
        const r = await fetch("/api/draft/estado", { cache: "no-store" });
        const corpo = (await r.json().catch(() => ({}))) as {
          draft?: DraftPublico | null;
          agoraServidorISO?: string;
        };
        if (!vivo || !r.ok || !corpo.draft) return;
        const servidorMs = corpo.agoraServidorISO ? Date.parse(corpo.agoraServidorISO) : Number.NaN;
        if (Number.isFinite(servidorMs)) defasagem.current = servidorMs - Date.now();
        setDados((atual) => {
          if (!atual) return atual;
          // Resposta atrasada não volta o quadro no tempo (mesma regra da transmissão).
          if (atual.draft && corpo.draft!.revisao < atual.draft.revisao) return atual;
          return { ...atual, draft: corpo.draft! };
        });
        // O diagnóstico de "sem saída" e a prévia vêm do GET do painel, não da sondagem
        // pública: quando a fase muda (pausou, terminou) ou alguém sai do pool (C1), relê
        // tudo — a lista de quem não é mais apto mora na prévia. A comparação fica num ref,
        // fora do updater do setState — o React pode rodar o updater depois.
        const situacao = `${corpo.draft.fase}|${corpo.draft.motivoDaPausa ?? ""}|${(corpo.draft.saiuDoPool ?? []).length}`;
        if (ultimaSituacao.current !== null && ultimaSituacao.current !== situacao) void carregar();
        ultimaSituacao.current = situacao;
      } catch {
        // Rede piscou: a próxima sondagem tenta de novo.
      }
    };
    const id = window.setInterval(() => void sondar(), 2500);
    return () => {
      vivo = false;
      window.clearInterval(id);
    };
  }, [aoVivo, carregar]);

  /*
   * Fora do ao vivo (sem draft, sorteado, encerrado) a tela também se atualiza: com duas
   * pessoas na mesa, o painel parado em "sem draft" continuava oferecendo «Sortear» depois
   * do sorteio do colega, e em "sorteado" continuava oferecendo «Iniciar» depois do início.
   * Aqui não há relógio para andar, então basta reler o painel, mais devagar.
   */
  useEffect(() => {
    if (aoVivo) return;
    const id = window.setInterval(() => void carregar(), 5000);
    return () => window.clearInterval(id);
  }, [aoVivo, carregar]);

  useEffect(() => {
    if (!aoVivo) return;
    const id = window.setInterval(() => setAgora(Date.now() + defasagem.current), 500);
    return () => window.clearInterval(id);
  }, [aoVivo]);

  const agir = async (
    corpo: Record<string, unknown>,
    ok: string,
    /** Chamado com a resposta de uma recusa, antes do aviso — para a tela reagir a ela. */
    aoRecusar?: (resposta: Record<string, unknown>) => void,
  ): Promise<Record<string, unknown> | null> => {
    setOcupado(true);
    try {
      const r = await fetch("/api/admin/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resposta = (await r.json().catch(() => ({}))) as Record<string, unknown> & {
        error?: string;
        problemas?: string[];
      };
      if (!r.ok) {
        aoRecusar?.(resposta);
        const extra = Array.isArray(resposta.problemas) && resposta.problemas.length ? ` ${resposta.problemas.join(" ")}` : "";
        onAlert("erro", `${resposta.error ?? "Não foi possível concluir."}${extra}`);
        await carregar();
        return null;
      }
      onAlert("ok", ok);
      await carregar();
      return resposta;
    } catch {
      onAlert("erro", "Não foi possível falar com o servidor.");
      return null;
    } finally {
      setOcupado(false);
    }
  };

  const previa = dados?.previa;
  const draft = dados?.draft ?? null;

  const jogadorPorId = useMemo(() => new Map((previa?.jogadores ?? []).map((j) => [j.id, j])), [previa]);
  const capitaesPelaRegra = useMemo(
    () =>
      (previa?.capitaesPelaRegra ?? [])
        .map((id) => jogadorPorId.get(id))
        .filter((j): j is JogadorDaPrevia => j !== undefined),
    [previa, jogadorPorId],
  );

  if (erro && !dados) {
    return (
      <div>
        <SectionHead eyebrow="4ª Edição" title="Draft ao vivo" />
        <Banner tone="danger" title="Não foi possível carregar o draft">
          {erro}
        </Banner>
        <Button onClick={() => void carregar()}>Tentar de novo</Button>
      </div>
    );
  }
  if (!dados || !previa) return <p style={{ color: C.ink3, fontSize: 13 }}>Carregando o draft…</p>;

  const metodo: MetodoDaMesa = metodoEscolhido ?? (previa.metodoPadrao === "definidos" ? "definidos" : "maior_elo");
  /** A marcação de capitão na lista de quem joga: à mão, ou editando os definidos. */
  const marcando = metodo === "manual" || (metodo === "definidos" && editandoDefinidos);
  /** O capitão não tem preço: a tag CAPITÃO no lugar dos pontos. Servidor anterior: sem o campo. */
  const capitaoGratis = previa.capitaoGratis === true;
  const capitaesDefinidos = (previa.capitaesDefinidos ?? [])
    .map((id) => jogadorPorId.get(id))
    .filter((j): j is JogadorDaPrevia => j !== undefined);
  const avisosDosCapitaes = previa.avisosDosCapitaes ?? [];
  const definidosNaoFecham = previa.fechaComOsCapitaesDefinidos === false;
  /**
   * Quantos times disputam o draft: todos menos o time definido pela organização (24/10/2026).
   * É deste número que saem os capitães necessários e a soma da tabela; a métrica "Times"
   * continua com todos. Servidor anterior (sem o campo): todos os times vão ao draft.
   */
  const timesNoDraft = previa.timesNoDraft ?? previa.times;
  const timeDefinido = previa.timeDefinido ?? null;
  const comTimeDefinido = timesNoDraft < previa.times;
  /** Os membros do time definido: não vão ao draft, então não se marcam como capitão do draft. */
  const doTimeDefinido = new Set(previa.jogadores.filter((j) => Boolean(j.timeDefinido)).map((j) => j.id));
  /**
   * A marcação de capitães sem quem está no time definido. A tela não deixa marcá-los, mas uma
   * marcação feita antes de o time ser definido (a tela se relê sozinha) ainda os teria.
   */
  const marcadosDoDraft = manuais.filter((id) => !doTimeDefinido.has(id));
  const podeSortear = podeConduzir && !ocupado && previa.impedimentos.length === 0 && timesNoDraft > 0;
  const precisaConfirmarDescarte = Boolean(draft && draft.fase !== "preparando");
  /** O sorteio que esta tela está mostrando — vai no pedido de «Sortear» e de «Iniciar». */
  const sorteioVisto = draft?.sorteioId ?? null;
  const confirmoDescartar = descarteConfirmado !== null && descarteConfirmado.sorteioId === sorteioVisto;
  const manuaisOk = marcadosDoDraft.length === timesNoDraft;
  /**
   * Com a tabela de soma exata, há pools em que os capitães da regra não deixam os elencos
   * fecharem (`fechaComOsCapitaesDaRegra === false`). O servidor recusaria o sorteio de
   * qualquer forma; o botão já nasce apagado e o aviso abaixo diz por quê. Servidor anterior
   * (campo ausente) não trava nada.
   */
  const regraNaoFecha = previa.fechaComOsCapitaesDaRegra === false;
  const metodoOk =
    metodo === "manual"
      ? manuaisOk
      : metodo === "definidos"
        ? !editandoDefinidos && previa.capitaesDaTabela === "definidos" && !definidosNaoFecham
        : capitaesPelaRegra.length === timesNoDraft && !regraNaoFecha;
  /**
   * «Salvar capitães» grava a marcação de agora como os capitães definidos (só antes do sorteio).
   * O capitão do time definido não vai na lista: o servidor mantém a marca dele.
   */
  const podeSalvarCapitaes = podeConduzir && !ocupado && !draft && manuaisOk;
  const salvarCapitaes = () =>
    void agir({ acao: "capitaes", capitaes: marcadosDoDraft }, `Capitães definidos: ${marcadosDoDraft.length}.`).then((r) => {
      if (!r) return;
      setEditandoDefinidos(false);
      setMetodoEscolhido("definidos");
    });
  const timeDaVez = draft?.times.find((t) => t.id === draft.timeDaVezId) ?? null;
  const escolhaPeloTime =
    draft && selecao && selecao.escolha === draft.escolhaAtual && draft.escolhiveis.includes(selecao.id)
      ? selecao.id
      : "";
  const restante = draft ? segundosAte(draft.prazoISO, agora) : null;
  const semConta = previa.jogadores.filter((j) => !j.temConta);
  // O time definido não escolhe: o capitão dele sem conta não atrapalha o draft.
  const capitaesSemConta = (draft?.times ?? [])
    .filter((t) => !t.definido)
    .map((t) => ({ time: t, jogador: previa.jogadores.find((j) => j.riotId === t.capitaoRiotId) }))
    .filter((x) => x.jogador && !x.jogador.temConta);
  /**
   * Quem está no draft e a inscrição não é mais `apto` (recusado ou desistente depois do
   * sorteio, devolvido à sobra ou a pendente). Só aviso: o draft não tira ninguém sozinho, e
   * o que fazer é decisão da organização. Aplicar no site pede a confirmação de quem está
   * num ELENCO (C2) — quem está no pool não vai para time nenhum, e o servidor não pede.
   */
  const foraDoDraft = draft ? (previa.foraDoDraft ?? []) : [];
  const foraAConfirmar = exigemConfirmacaoNaVirada(foraDoDraft);
  const chaveDoFora = foraAConfirmar.map((f) => `${f.riotId}:${f.situacao}`).join("|");
  const confirmoFora = foraAConfirmar.length > 0 && foraConfirmado === chaveDoFora;
  /*
   * Onde cada um está no draft (servidor anterior não manda `lugar`, e aí vale o texto de
   * antes). No pool com a inscrição fora: já saiu dos escolhíveis (C1). No pool com sobra
   * ou pendente: continua escolhível. Num elenco: segue no draft, e a vaga é reposta pela
   * saída de vez depois da virada (C2).
   */
  const comLugar = foraDoDraft.some((f) => f.lugar !== undefined);
  const saiuDoPoolNaPrevia = foraDoDraft.filter((f) => f.lugar === "pool" && estaFora(f.situacao));
  const voltouNoPool = foraDoDraft.filter((f) => f.lugar === "pool" && !estaFora(f.situacao));
  const foraNoElenco = foraDoDraft.filter((f) => f.lugar === "elenco" || f.lugar === "capitao");
  const capitaoFora = foraNoElenco.some((f) => f.lugar === "capitao");
  /** Quem saiu do pool, ao vivo (a sondagem): some dos escolhíveis e a transmissão mostra. */
  const saiuDoPool = draft?.saiuDoPool ?? [];
  /**
   * Escolhas que a ordem perdeu por falta de jogador (C1): cada uma é uma vaga para a reserva.
   * O time definido pela organização não conta: já entra completo e nunca teve escolha na ordem.
   */
  const timesQueEscolhem = draft ? draft.times.filter((t) => !t.definido) : [];
  const escolhasCortadas = draft
    ? Math.max(0, timesQueEscolhem.length * Math.max(0, draft.jogadoresPorTime - 1) - draft.totalEscolhas)
    : 0;
  /**
   * A grade do draft: os times que escolhem, na ordem do sorteio (o número é a posição na
   * primeira rodada), e o time definido no fim, sem número — ele não está na ordem de escolha.
   */
  const gradeDoDraft = draft ? [...timesQueEscolhem, ...draft.times.filter((t) => t.definido)] : [];
  const titularesNaoAptos = previa.titularesNaoAptos ?? [];
  /** Faltam titulares aptos (C4): dá para sortear, com vaga aberta. Servidor anterior: sem o campo. */
  const avisosDoSorteio = previa.avisosDoSorteio ?? [];
  const reservasDaPrevisao = previsao ? previsao.players.filter((p) => p.reserva) : [];

  const alternarManual = (id: string) =>
    setManuais((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  /**
   * Escolhe pelo time da vez. A vez vai no pedido: se o relógio virar enquanto a pessoa
   * confirma, o servidor recusa em vez de dar o jogador ao time seguinte.
   */
  const escolherPeloTime = (alvo: Disponivel, vez: { timeId: string | null; escolha: number; nome: string }) =>
    agir(
      { acao: "escolher", jogadorId: alvo.id, timeId: vez.timeId, escolha: vez.escolha },
      `${alvo.riotId} escolhido para ${vez.nome}.`,
    );

  // ------------------------------------------------ celular: a folha de confirmação

  /*
   * A folha só fica aberta enquanto o draft daquele toque está no ar: um sorteio novo
   * (outro `sorteioId`) ou o fim do draft a fecham sozinhos, sem efeito para limpar o
   * estado — a próxima escolha sobrescreve a confirmação velha.
   */
  const folhaAberta = Boolean(
    compacto && confirmacao && draft && aoVivo && timeDaVez && confirmacao.sorteioId === draft.sorteioId,
  );
  const alvoDaConfirmacao =
    confirmacao && draft ? (draft.disponiveis.find((j) => j.id === confirmacao.id) ?? null) : null;
  const timeDaConfirmacao = confirmacao && draft ? (draft.times.find((t) => t.id === confirmacao.timeId) ?? null) : null;
  const motivoInvalida =
    !confirmacao || !draft
      ? null
      : draft.fase !== "rodando"
        ? "O draft não está rodando: retome antes de escolher. Nada foi escolhido."
        : draft.escolhaAtual !== confirmacao.escolha || draft.timeDaVezId !== confirmacao.timeId
          ? `A vez virou: agora é de ${timeDaVez?.nome ?? "outro time"}. Nada foi escolhido — feche e escolha de novo.`
          : !alvoDaConfirmacao
            ? "Esse jogador já foi escolhido por outro caminho (capitão ou escolha automática)."
            : !draft.escolhiveis.includes(alvoDaConfirmacao.id)
              ? `Esse jogador não cabe mais no ${confirmacao.nome}.`
              : null;

  const confirmarEscolha = () => {
    if (!confirmacao || !alvoDaConfirmacao || motivoInvalida) return;
    void escolherPeloTime(alvoDaConfirmacao, confirmacao).then((r) => {
      // Fecha nos dois casos: o resultado sai no aviso acima da doca, que a folha cobriria.
      setConfirmacao(null);
      if (r) {
        setSelecao(null);
        setBusca("");
        setFiltroRota(null);
      }
    });
  };

  // ------------------------------------------------ peças que mudam de lugar no celular

  const controles = draft ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: compacto ? 0 : 14 }}>
      {draft.fase === "preparando" ? (
        <Button
          tone="gold"
          fullWidth={compacto}
          disabled={!podeConduzir || ocupado}
          onClick={() => void agir({ acao: "iniciar", sorteioVisto }, "Draft iniciado. O relógio está correndo.")}
        >
          {compacto ? <Play size={17} aria-hidden /> : null}
          Iniciar o draft
        </Button>
      ) : null}
      {draft.fase === "rodando" ? (
        <Button
          fullWidth={compacto}
          disabled={!podeConduzir || ocupado}
          onClick={() => void agir({ acao: "pausar" }, "Draft pausado.")}
        >
          {compacto ? <Pause size={17} aria-hidden /> : null}
          Pausar
        </Button>
      ) : null}
      {draft.fase === "pausado" ? (
        <Button
          tone="gold"
          fullWidth={compacto}
          disabled={!podeConduzir || ocupado}
          onClick={() => void agir({ acao: "retomar" }, "Draft retomado. O prazo da escolha recomeçou.")}
        >
          {compacto ? <Play size={17} aria-hidden /> : null}
          Retomar
        </Button>
      ) : null}
    </div>
  ) : null;

  const escolher =
    draft && aoVivo && timeDaVez ? (
      <ActionCard
        tone="warn"
        title={`Escolher pelo ${timeDaVez.nome}`}
        description="Para quando o capitão não consegue entrar e diz no Discord quem quer. Só vale para o time da vez, e fica registrado na auditoria."
        style={{ marginTop: compacto ? 0 : 14 }}
      >
        {compacto ? (
          <PoolDaVez
            draft={draft}
            nomeDoTime={timeDaVez.nome}
            podeTocar={podeConduzir && draft.fase === "rodando"}
            motivoSemToque={
              !podeConduzir
                ? "Somente leitura: sua conta não conduz o draft."
                : draft.fase !== "rodando"
                  ? "Draft pausado: retome para escolher por aqui."
                  : null
            }
            busca={busca}
            onBusca={setBusca}
            filtroRota={filtroRota}
            onFiltroRota={setFiltroRota}
            marcadoId={folhaAberta ? (confirmacao?.id ?? null) : null}
            onTocar={(j) =>
              setConfirmacao({
                id: j.id,
                escolha: draft.escolhaAtual,
                timeId: timeDaVez.id,
                nome: timeDaVez.nome,
                sorteioId: draft.sorteioId,
              })
            }
          />
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Select
              value={escolhaPeloTime}
              onChange={(id) => setSelecao(id ? { escolha: draft.escolhaAtual, id } : null)}
              ariaLabel="Jogador a escolher"
            >
              <option value="">Escolha um jogador disponível…</option>
              {/* Só quem o motor aceitaria para este time agora (orçamento e elencos de
                  todos fechando) — o servidor confere de novo de qualquer forma. */}
              {[...draft.disponiveis]
                .filter((j) => draft.escolhiveis.includes(j.id))
                .sort((a, b) => b.pontos - a.pontos || a.riotId.localeCompare(b.riotId))
                .map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.riotId} · {j.pontos} pts · {j.rota1}/{j.rota2}
                  </option>
                ))}
            </Select>
            <Button
              tone="gold"
              disabled={!podeConduzir || ocupado || !escolhaPeloTime || draft.fase !== "rodando"}
              onClick={() => {
                const alvo = draft.disponiveis.find((j) => j.id === escolhaPeloTime);
                // A vez é lida ANTES do confirm e vai no pedido: se o relógio virar
                // enquanto a caixa está aberta, o servidor recusa em vez de dar o
                // jogador ao time seguinte.
                const vez = { timeId: draft.timeDaVezId, escolha: draft.escolhaAtual, nome: timeDaVez.nome };
                if (!alvo || !window.confirm(`Escolher ${alvo.riotId} para ${vez.nome}?`)) return;
                void escolherPeloTime(alvo, vez).then((r) => {
                  if (r) setSelecao(null);
                });
              }}
            >
              Escolher
            </Button>
          </div>
        )}
      </ActionCard>
    ) : null;

  /** Celular com o draft sorteado e não encerrado: placar, controles e pool no topo. */
  const mesaNoTopo = compacto && draft !== null && draft.fase !== "encerrado";
  /** Celular depois do sorteio: a lista de quem joga recolhe, para os elencos ficarem perto. */
  const listaAberta = !compacto || (verJogadores ?? !draft);

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Draft ao vivo"
        description="Sorteio dos capitães e da ordem, o draft em si, e a passagem dos times para o site. Projete a transmissão (/draft) na live; cada capitão escolhe pelo /capitao, logado na própria conta."
        actions={
          <>
            <a
              href="/draft"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", flex: compacto ? "1 1 150px" : undefined }}
            >
              <Button small fullWidth={compacto}>
                Abrir a transmissão
                <ExternalLink size={13} aria-hidden />
              </Button>
            </a>
            <a
              href="/capitao"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", flex: compacto ? "1 1 150px" : undefined }}
            >
              <Button small fullWidth={compacto}>
                Painel do capitão
                <ExternalLink size={13} aria-hidden />
              </Button>
            </a>
            <Button
              small
              onClick={() => void carregar()}
              disabled={ocupado}
              style={compacto ? { flex: "1 1 150px" } : undefined}
            >
              {compacto ? <RefreshCw size={14} aria-hidden /> : null}
              Atualizar
            </Button>
          </>
        }
      />

      {!podeConduzir ? (
        <Banner tone="warn" title="Somente leitura">
          Sua conta não tem a permissão «Conduzir o sorteio e o draft ao vivo». Você vê tudo, mas o servidor recusa as ações.
        </Banner>
      ) : null}

      {/* ------------------------------------------------ estado atual */}
      {draft && compacto ? <PlacarDaVez draft={draft} timeDaVez={timeDaVez} restante={restante} /> : null}
      {draft && !compacto ? (
        <Card padding="16px 18px" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Chip tone={ROTULO_DA_FASE[draft.fase].tom}>{ROTULO_DA_FASE[draft.fase].texto}</Chip>
            {draft.motivoDaPausa ? (
              <span style={{ fontSize: 12, color: C.warnSoft }}>{MOTIVO_DA_PAUSA[draft.motivoDaPausa]}</span>
            ) : null}
            <span style={{ fontSize: 13, color: C.ink2, ...tabular }}>
              Escolha {Math.min(draft.escolhaAtual + 1, draft.totalEscolhas)} de {draft.totalEscolhas}
            </span>
            {timeDaVez ? (
              <span style={{ fontSize: 13, color: C.ink }}>
                Vez de <b style={{ color: timeDaVez.cor }}>{timeDaVez.nome}</b> ({timeDaVez.capitaoRiotId})
                {restante !== null && draft.fase === "rodando" ? (
                  <b style={{ marginLeft: 8, color: restante <= 10 ? C.dangerSoft : C.bronzeHi, ...tabular }}>{restante}s</b>
                ) : null}
              </span>
            ) : null}
            <span style={{ marginLeft: "auto", fontSize: 11.5, color: C.ink4 }}>
              orçamento {draft.orcamentoPorTime} pts · {draft.jogadoresPorTime} por time
            </span>
          </div>
        </Card>
      ) : null}

      {dados.semSaida && draft ? (
        <Banner tone="danger" title="O time da vez não cabe ninguém no orçamento">
          {draft.times.find((t) => t.id === dados.semSaida!.timeId)?.nome ?? dados.semSaida.timeId} só pode gastar{" "}
          {dados.semSaida.teto} ponto(s) nesta escolha e nenhum disponível custa isso. O motor pausa o draft. Retomar
          não resolve: refaça o sorteio com outro orçamento ou outros capitães.
        </Banner>
      ) : null}

      {capitaesSemConta.length > 0 ? (
        <Banner tone="warn" title="Capitão sem conta de jogador">
          {capitaesSemConta.map((x) => x.time.capitaoRiotId).join(", ")} não tem conta ligada à inscrição e não
          consegue escolher pelo /capitao. Use «Escolher pelo time da vez» abaixo quando for a vez dele.
        </Banner>
      ) : null}

      {saiuDoPool.length > 0 ? (
        <Banner tone="warn" title={`${saiuDoPool.length} jogador(es) saíram do pool depois do sorteio`}>
          {saiuDoPool.map((j) => j.riotId).join(", ")}. A inscrição ficou recusada, desistente ou excluída: não
          podem mais ser escolhidos — nem pela escolha automática —, e a transmissão mostra que saíram.
          {escolhasCortadas > 0
            ? ` Faltou jogador para todas as vagas, então a ordem perdeu ${escolhasCortadas === 1 ? "1 escolha" : `${escolhasCortadas} escolhas`}: ${escolhasCortadas === 1 ? "um time termina" : "times terminam"} com vaga aberta, que vai para a fila de reserva depois de aplicar no site.`
            : ""}
        </Banner>
      ) : null}

      {/* C4: a ordem nasceu sem escolhas porque faltava titular apto no sorteio (ou quem saiu
          do pool voltou depois do corte). Com alguém fora do pool agora, o aviso acima já
          conta as escolhas cortadas. */}
      {draft && escolhasCortadas > 0 && saiuDoPool.length === 0 && draft.fase !== "encerrado" ? (
        <Banner tone="warn" title={`A ordem tem ${escolhasCortadas === 1 ? "1 escolha" : `${escolhasCortadas} escolhas`} a menos`}>
          Faltou jogador para todas as vagas (titular que não estava apto na hora de sortear, ou alguém que saiu do
          pool): {escolhasCortadas === 1 ? "um time termina" : "times terminam"} o draft com vaga aberta, que um
          reserva da fila ocupa depois de aplicar no site.
        </Banner>
      ) : null}

      {foraDoDraft.length > 0 ? (
        <Banner tone="danger" title={`${foraDoDraft.length} jogador(es) do draft não estão mais aptos`}>
          {listaForaDoDraft(foraDoDraft)}. A inscrição mudou depois do sorteio.{" "}
          {comLugar ? (
            <>
              {saiuDoPoolNaPrevia.length > 0 ? "Quem estava no pool e saiu já não pode ser escolhido. " : ""}
              {voltouNoPool.length > 0
                ? "Quem voltou para sobra ou pendente continua no pool e ainda pode ser escolhido — o draft só tira quem desistiu, foi recusado ou excluído. "
                : ""}
              {foraNoElenco.length > 0
                ? `Quem já está num elenco segue no draft e vai para o site com o time: depois de aplicar, dê a vaga a um reserva com «Substituir de vez» no painel de Jogadores${capitaoFora ? " e escolha outro capitão do time" : ""}. `
                : ""}
              {foraAConfirmar.length > 0 ? "«Aplicar no site» pede uma confirmação a mais." : ""}
            </>
          ) : (
            <>
              O draft não tira ninguém sozinho: quem está no pool ainda pode ser escolhido, e quem está num elenco vai
              junto para o site na virada. O que fazer é decisão da organização. «Aplicar no site» pede uma confirmação a
              mais.
            </>
          )}
        </Banner>
      ) : null}

      {/* No celular, com o draft sorteado, o que se usa ao vivo vem logo abaixo do placar. */}
      {mesaNoTopo ? (
        <div style={{ display: "grid", gap: 14, marginBottom: 8 }}>
          {controles}
          {escolher}
        </div>
      ) : null}

      {/* ------------------------------------------------ conferência antes do sorteio */}
      <BlockTitle>1 · Conferência antes do sorteio</BlockTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <Metric
          label="Times"
          value={previa.times}
          detail={
            comTimeDefinido
              ? `${previa.times - timesNoDraft} definido pela organização · ${timesNoDraft} vão ao draft`
              : previa.config.maxTimes
                ? `teto de ${previa.config.maxTimes}`
                : "sem teto"
          }
        />
        {/* Quem joga são os titulares aptos da fila (C4). Servidor anterior à fila: a conta de antes. */}
        <Metric
          label={previa.titulares !== undefined ? "Titulares aptos / vagas" : "Aptos / vagas"}
          value={`${previa.aptos} / ${previa.vagas}`}
          detail={
            previa.titulares !== undefined
              ? `${previa.titulares} titular(es) na fila · ${previa.naFila ?? 0} na reserva`
              : `${previa.sobra} na sobra · ${previa.pendentes} pendente(s)`
          }
        />
        <Metric
          label={capitaoGratis ? "Pontos das escolhas" : comTimeDefinido ? "Pontos de quem vai ao draft" : "Pontos de quem joga"}
          value={previa.totalDePontos}
          detail={
            timesNoDraft > 0
              ? `${previa.tabela?.folga === 0 && !previa.tabela.poolIncompleto ? "exato: " : ""}${timesNoDraft} × ${previa.config.orcamentoPorTime} = ${timesNoDraft * previa.config.orcamentoPorTime}`
              : undefined
          }
        />
        <Metric
          label="Orçamento por time"
          value={previa.config.orcamentoPorTime}
          detail={
            capitaoGratis
              ? `fixo · para as ${Math.max(0, previa.config.jogadoresPorTime - 1)} escolhas (capitão sem preço)`
              : "fixo · os preços saem da tabela abaixo"
          }
        />
      </div>

      {/* O time que a organização já formou (24/10/2026): quem é, em que rota, e o que falta
          para ele valer. Sem nenhum marcado (ou servidor anterior), o bloco não aparece. */}
      {timeDefinido ? <TimeDefinidoNaConferencia time={timeDefinido} /> : null}

      {previa.impedimentos.length > 0 ? (
        <Banner tone="danger" title="Ainda não dá para sortear">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {previa.impedimentos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      {/* C4: o pool é dos titulares da fila que estão aptos. Titular ainda não apto não entra
          no sorteio — a mesa precisa saber quem é, e não só quantos faltam. É aviso: o sorteio
          pode seguir sem ele, com vaga aberta (`avisosDoSorteio`). */}
      {titularesNaoAptos.length > 0 && !draft ? (
        <Banner tone="warn" title={`${titularesNaoAptos.length} titular(es) da fila ainda não estão aptos`}>
          {titularesNaoAptos.map((t) => `${t.riotId} (${t.situacao})`).join(", ")}. Estão entre os primeiros da fila,
          mas só entram no sorteio aprovados. Confira a ficha deles em Inscritos — ou, se não vão jogar, recuse ou
          registre a desistência, e o próximo da fila de reserva sobe. Sortear sem eles deixa a vaga aberta para a
          fila de reserva.
        </Banner>
      ) : null}

      {avisosDoSorteio.length > 0 && !draft ? (
        <Banner tone="warn" title="Dá para sortear, com vaga aberta">
          {avisosDoSorteio.join(" ")}
        </Banner>
      ) : null}


      {semConta.length > 0 ? (
        <Banner tone="warn" title={`${semConta.length} jogador(es) aptos sem conta ligada`}>
          {semConta.map((j) => j.riotId).join(", ")}. Se algum virar capitão, não conseguirá escolher pelo /capitao.
        </Banner>
      ) : null}

      {previa.semEloCongelado.length > 0 && !draft ? (
        <Banner tone="warn" title={`${previa.semEloCongelado.length} apto(s) com o elo ainda solto`}>
          O preço que entra no draft é o de agora, e o robô da Riot ainda mexe no elo e na divisão toda manhã — a
          tabela de pontos muda junto. Congele os elos (aba Times e vagas → «Congelar o elo dos aprovados») antes de
          divulgar a tabela e de sortear:{" "}
          {previa.semEloCongelado.slice(0, 12).join(", ")}
          {previa.semEloCongelado.length > 12 ? ` e mais ${previa.semEloCongelado.length - 12}` : ""}.
        </Banner>
      ) : null}

      {previa.inscricoesAbertas ? (
        <Banner tone="warn" title="As inscrições ainda estão abertas">
          Quem se inscrever agora entra na fila (como titular, se ainda houver vaga), e a lista de quem joga pode
          mudar. Feche as inscrições em Configuração (chave ou data de fechamento) antes do draft.
        </Banner>
      ) : null}

      {/* ------------------------------------------------ a tabela de pontos */}
      {/* A regra antiga ("orçamento = média + 15%") saiu: o orçamento é fixo e os preços são
          calculados a partir de quem joga. Esta é a tabela OFICIAL — a de Times e vagas é
          prévia. Os preços de cada jogador, abaixo, já vêm dela, do servidor. */}
      <BlockTitle
        right={
          previa.tabela ? (
            <span style={{ fontSize: 11.5 }}>
              <TotalDaTabela tabela={previa.tabela} />
            </span>
          ) : undefined
        }
      >
        Tabela de pontos desta edição
      </BlockTitle>
      {previa.tabela === undefined ? (
        // Resposta de um servidor anterior à tabela automática (painel aberto durante o deploy).
        <p style={{ ...nota, marginBottom: 14 }}>
          A tabela de pontos automática não veio nesta resposta (o servidor ainda é da versão anterior). Toque em
          Atualizar depois que o site terminar de atualizar.
        </p>
      ) : previa.tabela === null ? (
        <Empty title="A tabela ainda não existe">
          Ela é calculada a partir de quem joga: aparece quando houver aptos para fechar pelo menos um time.
        </Empty>
      ) : (
        <div style={{ marginBottom: 14 }}>
          <TabelaDePontos tabela={previa.tabela} compacto={compacto} />
        </div>
      )}

      {/* Só quando NADA fecha: a conta já tentou descer a curvatura e a soma (o motivo de uma
          queda que deu certo aparece no rodapé da tabela, acima). */}
      {capitaoGratis && previa.tabela && previa.capitaesDaTabela === null && !draft ? (
        <Banner tone="warn" title="A tabela ainda inclui os capitães">
          O capitão não tem preço nesta edição, mas a conta ainda não sabe quem são os capitães (nenhum definido, e a
          regra do maior elo não fecha o corte): a tabela acima é de todo mundo. Defina os {timesNoDraft} capitães
          abaixo para ver a tabela de quem vai ser escolhido — a do sorteio.
        </Banner>
      ) : null}

      {avisosDosCapitaes.length > 0 && !draft ? (
        <Banner tone="warn" title="Capitães definidos: confira">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {avisosDosCapitaes.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      {definidosNaoFecham && metodo === "definidos" ? (
        <Banner tone="danger" title="Com os capitães definidos, os elencos não fecham">
          A tabela soma exatamente {timesNoDraft} × {previa.config.orcamentoPorTime}, e com estes capitães não existe
          divisão dos outros jogadores que feche todos os elencos, nem baixando a curvatura até 0 e a soma em até{" "}
          {timesNoDraft} {timesNoDraft === 1 ? "ponto" : "pontos"}. O sorteio seria recusado: troque um capitão em
          «Editar capitães» ou mude o orçamento por time em Configuração.
        </Banner>
      ) : null}

      {regraNaoFecha && metodo === "maior_elo" ? (
        <Banner tone="danger" title="Com os capitães da regra, os elencos não fecham">
          A tabela soma exatamente {timesNoDraft} × {previa.config.orcamentoPorTime}, então cada time precisa terminar
          com os {previa.config.orcamentoPorTime} pontos certinhos — e, com os capitães pela regra, não existe divisão
          dos outros jogadores que feche todos os elencos, nem baixando a curvatura até 0 e a soma em até{" "}
          {timesNoDraft} {timesNoDraft === 1 ? "ponto" : "pontos"}. O sorteio pela regra seria recusado. Decida com a
          organização: capitães à mão (o servidor confere de novo) ou outro orçamento por time em Configuração, que
          recalcula a tabela.
        </Banner>
      ) : null}

      <ActionCard
        tone="gold"
        title="Sortear capitães e ordem de escolha"
        description={`${
          capitaoGratis
            ? "Os capitães são os definidos pela organização (abaixo), ou saem pela regra (maior elo na solo/duo, sem organizador), ou à mão. Capitão não tem preço: cada time tem o orçamento inteiro para as escolhas. Depois o servidor sorteia qual time cada capitão capitaneia e a ordem do draft — a semente fica gravada para conferência."
            : "Os capitães são os definidos pela organização (abaixo), ou saem pela regra (maior elo na solo/duo, sem organizador), ou à mão. Depois o servidor sorteia qual time cada capitão capitaneia e a ordem do draft — a semente fica gravada para conferência."
        }${
          comTimeDefinido
            ? " O time definido pela organização também tira o nome e a cor no sorteio, mas fica fora da ordem de escolha."
            : ""
        }`}
        badge={draft ? <Chip tone="warn">já existe um sorteio</Chip> : undefined}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select
            value={metodo}
            onChange={(v) => {
              setMetodoEscolhido(v === "manual" ? "manual" : v === "definidos" ? "definidos" : "maior_elo");
              setEditandoDefinidos(false);
            }}
            ariaLabel="Como escolher os capitães"
          >
            <option value="definidos">
              Definidos pela organização ({capitaesDefinidos.length} de {timesNoDraft})
            </option>
            <option value="maior_elo">Pela regra: maior elo, sem organizador</option>
            <option value="manual">À mão</option>
          </Select>
          {marcando ? (
            <>
              <span style={{ fontSize: 12.5, color: manuaisOk ? C.okSoft : C.warnSoft, ...tabular }}>
                {marcadosDoDraft.length} de {timesNoDraft} marcados
              </span>
              {capitaesDefinidos.length > 0 && metodo === "manual" ? (
                <Button small onClick={() => setManuais(previa.capitaesDefinidos ?? [])}>
                  Partir dos definidos
                </Button>
              ) : null}
              {capitaesPelaRegra.length > 0 ? (
                <Button small onClick={() => setManuais(previa.capitaesPelaRegra)}>
                  Partir dos da regra
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

        {/* Definir capitães: a mesma marcação do «À mão», gravada no banco (`inscricoes.capitao`).
            Só antes do sorteio — depois, os capitães já estão no draft. */}
        {metodo === "definidos" ? (
          editandoDefinidos ? (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ ...nota, color: C.ink2 }}>
                Marque os {timesNoDraft} capitães na lista de quem joga, abaixo, e salve. Pode ser organizador: quem
                define é a organização.
                {comTimeDefinido
                  ? " Quem está no time definido pela organização não entra nesta marcação: o capitão dele continua marcado."
                  : ""}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button tone="gold" small disabled={!podeSalvarCapitaes} onClick={salvarCapitaes}>
                  <Crown size={13} aria-hidden />
                  Salvar capitães
                </Button>
                <Button small onClick={() => setEditandoDefinidos(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {capitaesDefinidos.length === 0 ? (
                <p style={{ ...nota, color: C.warnSoft }}>
                  Nenhum capitão definido ainda. Defina os {timesNoDraft} capitães para sortear por eles.
                </p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px", fontSize: 12.5, color: C.ink3 }}>
                  <span>Definidos:</span>
                  {capitaesDefinidos.map((j) => (
                    <span key={j.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <b style={{ color: C.ink }}>{j.riotId}</b>
                      <Elo elo={j.elo} tamanho={20} detalhe={detalheDaForca(j.elo, j.forca)} />
                    </span>
                  ))}
                </div>
              )}
              {comTimeDefinido && timeDefinido?.capitaoRiotId ? (
                <p style={nota}>
                  O capitão do time definido pela organização ({timeDefinido.capitaoRiotId}) não conta aqui: o time dele não
                  vai ao draft.
                </p>
              ) : null}
              <div>
                <Button
                  small
                  disabled={!podeConduzir || ocupado || Boolean(draft)}
                  title={draft ? "Com o draft sorteado, os capitães já estão no sorteio: para trocar, sorteie de novo à mão." : undefined}
                  onClick={() => {
                    setManuais(previa.capitaesDefinidos ?? []);
                    setEditandoDefinidos(true);
                  }}
                >
                  <Crown size={13} aria-hidden />
                  {capitaesDefinidos.length === 0 ? "Definir capitães" : "Editar capitães"}
                </Button>
              </div>
            </div>
          )
        ) : null}

        {metodo === "manual" ? (
          <div>
            <Button
              small
              disabled={!podeSalvarCapitaes}
              title="Grava estes capitães como os definidos pela organização, para o sorteio pelo método «Definidos»."
              onClick={salvarCapitaes}
            >
              <Crown size={13} aria-hidden />
              Salvar como capitães definidos
            </Button>
          </div>
        ) : null}

        {metodo === "maior_elo" ? (
          previa.empateNoCorte ? (
            <Banner tone="warn" title="Empate de elo no corte dos capitães">
              {previa.empateNoCorte.join(", ")} têm o mesmo elo, divisão e PDL (ou falta a leitura da Riot de alguém).
              O regulamento não diz como desempatar: decida com a organização e marque os capitães à mão.
            </Banner>
          ) : previa.faltamCapitaes > 0 ? (
            <Banner tone="warn" title="Faltam candidatos">
              Faltam {previa.faltamCapitaes} capitão(ães) fora da organização.
            </Banner>
          ) : (
            // O elo de cada capitão pelo emblema; divisão e PDL ficam escritos ao lado
            // porque são o desempate do corte.
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 16px", fontSize: 12.5, color: C.ink3 }}>
              <span>Pela regra:</span>
              {capitaesPelaRegra.map((j) => (
                <span key={j.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <b style={{ color: C.ink }}>{j.riotId}</b>
                  <Elo elo={j.elo} tamanho={20} detalhe={detalheDaForca(j.elo, j.forca)} />
                </span>
              ))}
            </div>
          )
        ) : null}

        {capitaoGratis && marcando ? (
          <p style={nota}>
            Os pontos na lista abaixo são os da tabela com os capitães{" "}
            {previa.capitaesDaTabela === "definidos" ? "definidos" : "da regra"}. Ao sortear com outros capitães, o servidor
            recalcula a tabela sem eles.
          </p>
        ) : null}

        {precisaConfirmarDescarte ? (
          <Check
            checked={confirmoDescartar}
            onChange={(v) => setDescarteConfirmado(v ? { sorteioId: sorteioVisto } : null)}
            tone="danger"
          >
            Já houve escolhas neste draft. Entendo que sortear de novo APAGA o draft atual.
          </Check>
        ) : null}

        <div>
          <Button
            tone="gold"
            fullWidth={compacto}
            disabled={!podeSortear || !metodoOk || (precisaConfirmarDescarte && !confirmoDescartar)}
            onClick={() =>
              void agir(
                {
                  acao: "montar",
                  metodo,
                  capitaes: metodo === "manual" ? marcadosDoDraft : undefined,
                  confirmoDescartar: precisaConfirmarDescarte ? confirmoDescartar : undefined,
                  sorteioVisto,
                },
                "Capitães e ordem sorteados. Confira na transmissão.",
              ).then((r) => {
                if (r) setDescarteConfirmado(null);
              })
            }
          >
            {compacto ? <Shuffle size={16} aria-hidden /> : null}
            {draft ? "Sortear de novo" : "Sortear"}
          </Button>
        </div>
      </ActionCard>

      <BlockTitle
        right={
          compacto ? undefined : (
            <span style={{ fontSize: 11.5, color: C.ink4 }}>
              do maior elo para o menor · {comTimeDefinido ? "organizadores e o time definido no fim" : "organizadores no fim"}
            </span>
          )
        }
      >
        Quem joga ({previa.jogadores.length})
      </BlockTitle>
      {previa.jogadores.length === 0 ? (
        <Empty title="Nenhum apto ainda">Os aptos aparecem aqui conforme a conferência avança.</Empty>
      ) : compacto ? (
        // No celular cada jogador é um cartão com o emblema do elo; na escolha à mão, a
        // marcação de capitão vira uma linha de toque inteira dentro do cartão.
        <>
          <p style={{ ...nota, margin: "-4px 0 10px" }}>
            Do maior elo para o menor · {comTimeDefinido ? "organizadores e o time definido no fim" : "organizadores no fim"}.
          </p>
          {draft ? (
            <Button small fullWidth onClick={() => setVerJogadores(!listaAberta)}>
              {listaAberta ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
              {listaAberta ? "Recolher a lista" : `Mostrar os ${previa.jogadores.length} jogadores`}
            </Button>
          ) : null}
          {listaAberta ? (
            <ul style={{ ...listaDeCartoes, marginTop: draft ? 10 : 0 }}>
              {previa.jogadores.map((j) => {
                // Membro do time definido pela organização: a tag dele no lugar do preço, nenhuma
                // marca de capitão do draft e nada de marcação — ele não vai ao draft.
                const rotaNoTime = j.timeDefinido || null;
                const capitaoDoDefinido = rotaNoTime !== null && j.capitao === true;
                const pelaRegra = !rotaNoTime && metodo === "maior_elo" && previa.capitaesPelaRegra.includes(j.id);
                const definido = !rotaNoTime && metodo === "definidos" && j.capitaoDefinido === true;
                const marcado = !rotaNoTime && manuais.includes(j.id);
                const detalhe = detalheDaForca(j.elo, j.forca);
                const semPreco = capitaoGratis && j.capitao === true;
                const temChip = pelaRegra || definido || capitaoDoDefinido || j.organizador || !j.temConta;
                const marcaAqui = marcando && !rotaNoTime;
                return (
                  <li key={j.id}>
                    <CartaoLinha
                      inicio={<Elo elo={j.elo} tamanho={40} />}
                      titulo={<NomeDeJogo riotId={j.riotId} />}
                      subtitulo={
                        <>
                          {detalhe ? <span style={{ display: "block", marginBottom: 3, ...tabular }}>{detalhe}</span> : null}
                          <Rotas rota1={j.rota1} rota2={j.rota2} />
                        </>
                      }
                      fim={
                        rotaNoTime ? (
                          <TagTimeDefinido rota={rotaNoTime} />
                        ) : semPreco ? (
                          <TagCapitao />
                        ) : (
                          <Preco pontos={j.pontos} />
                        )
                      }
                      selecionado={marcaAqui && marcado}
                    >
                      {temChip || marcaAqui ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {temChip ? (
                            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {pelaRegra ? (
                                <Chip tone="gold">
                                  <Crown size={11} aria-hidden />
                                  capitão pela regra
                                </Chip>
                              ) : null}
                              {definido && !semPreco ? (
                                <Chip tone="gold">
                                  <Crown size={11} aria-hidden />
                                  capitão definido
                                </Chip>
                              ) : null}
                              {capitaoDoDefinido ? <ChipCapitaoDoTimeDefinido /> : null}
                              {j.organizador ? (
                                rotaNoTime ? <Chip tone="off">organização</Chip> : <ChipDoOrganizador metodo={metodo} />
                              ) : null}
                              {!j.temConta ? <Chip tone="warn">sem conta</Chip> : null}
                            </span>
                          ) : null}
                          {marcaAqui ? (
                            <Check checked={marcado} onChange={() => alternarManual(j.id)}>
                              Marcar como capitão<span style={somenteLeitor}>: {j.riotId}</span>
                            </Check>
                          ) : null}
                        </div>
                      ) : null}
                    </CartaoLinha>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.bronze, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>
                {marcando ? <th style={{ padding: "8px 10px" }}>Capitão</th> : null}
                <th style={{ padding: "8px 10px" }}>Riot ID</th>
                <th style={{ padding: "8px 10px" }}>Elo (solo/duo)</th>
                <th style={{ padding: "8px 10px" }}>Pts</th>
                <th style={{ padding: "8px 10px" }}>Rotas</th>
                <th style={{ padding: "8px 10px" }} />
              </tr>
            </thead>
            <tbody>
              {previa.jogadores.map((j) => {
                // Membro do time definido: mesma regra do cartão do celular, acima.
                const rotaNoTime = j.timeDefinido || null;
                const capitaoDoDefinido = rotaNoTime !== null && j.capitao === true;
                const pelaRegra = !rotaNoTime && metodo === "maior_elo" && previa.capitaesPelaRegra.includes(j.id);
                const definido = !rotaNoTime && metodo === "definidos" && j.capitaoDefinido === true;
                const semPreco = capitaoGratis && j.capitao === true;
                return (
                  <tr key={j.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    {marcando ? (
                      <td style={{ padding: "8px 10px" }}>
                        {rotaNoTime ? (
                          <span title="Time definido pela organização: não vai ao draft." style={{ color: C.ink4 }}>
                            —
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            aria-label={`Marcar ${j.riotId} como capitão`}
                            checked={manuais.includes(j.id)}
                            onChange={() => alternarManual(j.id)}
                            style={{ accentColor: C.bronze, width: 15, height: 15 }}
                          />
                        )}
                      </td>
                    ) : null}
                    <td style={{ padding: "8px 10px", color: C.ink }}>{j.riotId}</td>
                    <td style={{ padding: "8px 10px", color: C.ink2 }}>
                      <Elo elo={j.elo} tamanho={24} detalhe={detalheDaForca(j.elo, j.forca)} />
                    </td>
                    <td style={{ padding: "8px 10px", color: C.bronzeHi, ...tabular }}>
                      {rotaNoTime ? <TagTimeDefinido rota={rotaNoTime} /> : semPreco ? <TagCapitao /> : j.pontos}
                    </td>
                    <td style={{ padding: "8px 10px", color: C.ink3 }}>
                      {j.rota1} / {j.rota2}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        {pelaRegra ? <Chip tone="gold">capitão pela regra</Chip> : null}
                        {definido && !semPreco ? <Chip tone="gold">capitão definido</Chip> : null}
                        {capitaoDoDefinido ? <ChipCapitaoDoTimeDefinido /> : null}
                        {j.organizador ? (
                          rotaNoTime ? <Chip tone="off">organização</Chip> : <ChipDoOrganizador metodo={metodo} />
                        ) : null}
                        {!j.temConta ? <Chip tone="warn">sem conta</Chip> : null}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* ------------------------------------------------ o draft */}
      <BlockTitle>2 · O draft</BlockTitle>
      {!draft ? (
        <Empty title="Ainda não houve sorteio">Sorteie os capitães acima. A transmissão mostra o resultado na hora.</Empty>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
            {gradeDoDraft.map((t, i) => (
              <Card key={t.id} padding="13px 14px" style={{ borderLeft: `3px solid ${t.cor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span style={{ fontFamily: display, fontSize: 16, color: t.cor }}>
                    {t.definido ? t.nome : `${i + 1}º · ${t.nome}`}
                  </span>
                  {/* O time definido não gasta nem escolhe: a tag no lugar do orçamento. */}
                  {t.definido ? (
                    <TagTimeDefinido />
                  ) : (
                    <span style={{ fontSize: 11.5, color: C.ink3, ...tabular }}>
                      {t.gasto}/{draft.orcamentoPorTime} pts
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>Capitão: {t.capitaoRiotId}</div>
                {t.definido ? (
                  <div style={{ fontSize: 11.5, color: C.ink4, marginTop: 2 }}>Já entra pronto · fora da ordem de escolha</div>
                ) : null}
                {/* Cada linha leva o ícone da rota primária; a coroa marca o capitão (antes
                    eram "★" e "·", que não diziam nada sobre quem é quem). */}
                <ul
                  style={{
                    margin: "8px 0 0",
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gap: compacto ? 6 : 3,
                    fontSize: compacto ? 12.5 : 12,
                    color: C.ink3,
                  }}
                >
                  {(draft.elencos[t.id] ?? []).map((j) => (
                    <li key={j.riotId} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                      <RoleIcon role={j.rota1} size={12} color={resolveRole(j.rota1).color} />
                      <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>
                        {j.riotId}{" "}
                        {/* Capitão sem preço: a tag no lugar dos pontos (o gasto do time é só das escolhas).
                            No time definido ninguém tem preço: nada de "(0)". */}
                        {t.definido || (j.capitao && draft.capitaoGratis) ? null : (
                          <span style={{ color: C.ink4 }}>({j.pontos})</span>
                        )}
                      </span>
                      {/* No time definido, a coroa: a tag de CAPITÃO fala do orçamento das escolhas,
                          e este time não escolhe. */}
                      {j.capitao && draft.capitaoGratis && !t.definido ? (
                        <TagCapitao />
                      ) : j.capitao ? (
                        <span
                          role="img"
                          aria-label="capitão"
                          title="Capitão"
                          style={{ display: "inline-flex", flexShrink: 0, color: C.bronzeHi }}
                        >
                          <Crown size={12} aria-hidden />
                        </span>
                      ) : null}
                    </li>
                  ))}
                  {t.vagas > 0 ? (
                    <li style={{ display: "flex", alignItems: "center", gap: 6, color: C.ink4 }}>
                      <CircleDashed size={12} aria-hidden style={{ flexShrink: 0 }} />
                      {/* Encerrado com vaga: a ordem perdeu a escolha por falta de jogador — alguém
                          saiu do pool (C1) ou faltava titular apto no sorteio (C4). */}
                      {draft.fase === "encerrado" ? `${t.vagas} vaga(s) para a fila de reserva` : `${t.vagas} vaga(s) abertas`}
                    </li>
                  ) : null}
                </ul>
              </Card>
            ))}
          </div>
          {dados.sorteio ? (
            <p style={{ margin: "10px 0 0", fontSize: 11.5, color: C.ink4, wordBreak: "break-all" }}>
              Semente do sorteio da ordem: <code>{dados.sorteio.semente}</code> ·{" "}
              {new Date(dados.sorteio.emISO).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
            </p>
          ) : null}

          {/* No celular os controles e a escolha moram no topo (`mesaNoTopo`). */}
          {compacto ? null : controles}
          {compacto ? null : escolher}
        </>
      )}

      {/* ------------------------------------------------ virada */}
      <BlockTitle>3 · Levar os times para o site</BlockTitle>
      <ActionCard
        tone={draft?.fase === "encerrado" ? "gold" : "neutro"}
        title="Aplicar o draft no site"
        description="Grava os times e os elencos na temporada no ar. Antes: em Torneio, inicie a 4ª Edição SEM manter times e jogadores. Só nick, rotas, elo e time atravessam — nada de contato."
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            fullWidth={compacto}
            disabled={!draft || ocupado}
            onClick={() =>
              void agir({ acao: "prever" }, "Prévia pronta.").then((r) => {
                if (r) setPrevisao(r as unknown as PrevisaoDaVirada);
              })
            }
          >
            Conferir os elencos
          </Button>
        </div>
        {previsao ? (
          <div>
            {previsao.problemas.length > 0 ? (
              <Banner tone="warn" title="Ainda não dá para aplicar">
                {previsao.problemas.join(" ")}
              </Banner>
            ) : null}
            {(previsao.avisos ?? []).length > 0 ? (
              <Banner tone="warn" title="Time com vaga aberta">
                {(previsao.avisos ?? []).join(" ")}
              </Banner>
            ) : null}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {previsao.teams.map((t) => (
                <Card key={t.id} padding="10px 12px">
                  <div style={{ fontFamily: display, color: C.ink }}>{t.name}</div>
                  <ul
                    style={{
                      margin: "6px 0 0",
                      padding: 0,
                      listStyle: "none",
                      display: "grid",
                      gap: 4,
                      fontSize: 12,
                      color: C.ink3,
                    }}
                  >
                    {previsao.players
                      .filter((p) => p.teamId === t.id)
                      .map((p) => {
                        const rota = resolveRole(p.role1);
                        return (
                          <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                            <Elo elo={p.elo} tamanho={20} />
                            <span style={{ minWidth: 0, overflowWrap: "anywhere", color: C.ink2 }}>{p.nick}</span>
                            <span
                              title={rota.label}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto", flexShrink: 0, color: rota.color }}
                            >
                              <RoleIcon role={p.role1} size={12} color={rota.color} />
                              {rota.short}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                </Card>
              ))}
            </div>
            {/* C4: quem está na fila e não ficou num elenco vai para o site como reserva, sem
                time — é quem substitui jogo a jogo e herda a vaga de quem sair de vez. */}
            {reservasDaPrevisao.length > 0 ? (
              <Card padding="10px 12px" style={{ marginTop: 8 }}>
                <div style={{ fontFamily: display, color: C.ink }}>Reservas ({reservasDaPrevisao.length}) · sem time</div>
                <p style={{ ...nota, margin: "4px 0 6px" }}>
                  Todos da fila que não ficaram num elenco, na ordem da fila. Substituem jogo a jogo, e um deles herda a
                  vaga de quem sair de vez.
                </p>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: "none",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill,minmax(180px,1fr))",
                    gap: 4,
                    fontSize: 12,
                    color: C.ink3,
                  }}
                >
                  {reservasDaPrevisao.map((p) => (
                    <li key={p.id} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                      <Elo elo={p.elo} tamanho={20} />
                      <span style={{ minWidth: 0, overflowWrap: "anywhere", color: C.ink2 }}>{p.nick}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        ) : null}
        <Check checked={confirmoVirada} onChange={setConfirmoVirada}>
          Conferi os elencos e a 4ª Edição já foi iniciada em Torneio.
        </Check>
        {foraDoDraft.length > 0 ? (
          <>
            <Banner tone={foraAConfirmar.length > 0 ? "danger" : "warn"} title="Há jogadores no draft que não estão mais aptos">
              {listaForaDoDraft(foraDoDraft)}.{" "}
              {comLugar
                ? foraNoElenco.length > 0
                  ? `Aplicar agora publica quem está num elenco no time do site (${foraNoElenco.map((f) => f.riotId).join(", ")}). Depois, «Substituir de vez» no painel de Jogadores dá a vaga a um reserva${capitaoFora ? ", e o time precisa de outro capitão" : ""}.`
                  : "Ninguém deles está num elenco: nenhum vai para time do site, e aplicar não pede confirmação a mais."
                : "Aplicar agora publica essas pessoas nos times do site."}
            </Banner>
            {foraAConfirmar.length > 0 ? (
              <Check checked={confirmoFora} onChange={(v) => setForaConfirmado(v ? chaveDoFora : null)} tone="danger">
                Sei que {foraAConfirmar.length === 1 ? "esse jogador não está mais apto" : "esses jogadores não estão mais aptos"}{" "}
                e quero aplicar o draft mesmo assim.
              </Check>
            ) : null}
          </>
        ) : null}
        {pedeReaplicar ? (
          <>
            <Banner tone="danger" title="Este draft já está aplicado no site">
              Aplicar de novo substitui times e jogadores inteiros pela saída do draft e apaga o que a organização
              editou depois da primeira aplicação: fotos dos jogadores e nomes escolhidos pelos times.
            </Banner>
            <Check checked={confirmoReaplicar} onChange={setConfirmoReaplicar} tone="danger">
              Entendo que reaplicar apaga as fotos e os nomes editados no site depois da primeira aplicação.
            </Check>
          </>
        ) : null}
        <div>
          <Button
            tone="gold"
            fullWidth={compacto}
            disabled={
              !podeConduzir ||
              ocupado ||
              draft?.fase !== "encerrado" ||
              !confirmoVirada ||
              (pedeReaplicar && !confirmoReaplicar) ||
              (foraAConfirmar.length > 0 && !confirmoFora)
            }
            onClick={() =>
              void agir(
                {
                  acao: "virar",
                  confirmoReaplicar: pedeReaplicar && confirmoReaplicar ? true : undefined,
                  confirmoForaDoDraft: confirmoFora ? true : undefined,
                },
                "Times e jogadores aplicados no site.",
                // O servidor recusa reaplicar sem a segunda confirmação: a tela passa a pedi-la.
                (resposta) => {
                  if (resposta.precisaConfirmar === true) setPedeReaplicar(true);
                },
              ).then((r) => {
                if (r) {
                  setConfirmoVirada(false);
                  setPedeReaplicar(false);
                  setConfirmoReaplicar(false);
                  setForaConfirmado(null);
                  onDatasetMudou();
                }
              })
            }
          >
            Aplicar no site
          </Button>
        </div>
      </ActionCard>

      {/* ------------------------------------------------ calendário
          Os números (times, séries, período) saem da grade de lib/calendario-4a.ts. Sem a
          grade divulgada, o cartão diz por que o botão está travado — a rota recusa do
          mesmo jeito. */}
      <BlockTitle>4 · Calendário</BlockTitle>
      <ActionCard
        tone={calendario.divulgado ? "gold" : "neutro"}
        title={`Sortear as posições e criar as ${calendario.pontos} séries`}
        description={
          calendario.divulgado
            ? `Sorteia qual time é o Time 1 … Time ${calendario.times} do calendário publicado e cria as ${calendario.pontos} séries da fase de pontos com data e hora (${calendario.periodoDosPontos}). Semifinais e final são criadas depois, no painel de Séries, quando a tabela fechar. Só funciona com os times do draft já aplicados e a temporada ainda sem séries.`
            : `O calendário de ${calendario.times} times ainda não foi definido. Quando estiver, este botão sorteia qual time é o Time 1 … Time ${calendario.times} e cria as ${calendario.pontos} séries da fase de pontos com data e hora.`
        }
        badge={calendario.divulgado ? undefined : <Chip tone="off">datas a divulgar</Chip>}
      >
        <Check checked={confirmoCalendario} onChange={setConfirmoCalendario} disabled={!calendario.divulgado}>
          Os times do draft já estão no site. Pode sortear as posições.
        </Check>
        <div>
          <Button
            tone="gold"
            fullWidth={compacto}
            disabled={!calendario.divulgado || !podeConduzir || ocupado || !confirmoCalendario}
            title={calendario.divulgado ? undefined : `O calendário de ${calendario.times} times ainda não foi definido.`}
            onClick={() =>
              void agir({ acao: "calendario" }, `Posições sorteadas e ${calendario.pontos} séries criadas.`).then((r) => {
                if (!r) return;
                setConfirmoCalendario(false);
                setPosicoes((r.posicoes as { posicao: number; nome: string }[]) ?? null);
                onDatasetMudou();
              })
            }
          >
            Sortear e criar as séries
          </Button>
        </div>
        {posicoes ? (
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.ink2 }}>
            {posicoes.map((p) => (
              <li key={p.posicao}>
                Time {p.posicao} = <b style={{ color: C.ink }}>{p.nome}</b>
              </li>
            ))}
          </ol>
        ) : null}
      </ActionCard>

      {/* Celular: a confirmação da escolha pelo time da vez (no monitor é o `window.confirm`). */}
      {compacto ? (
        <Folha
          aberta={folhaAberta}
          titulo={`Escolher para ${confirmacao?.nome ?? ""}`}
          icone={UserRoundPlus}
          subtitulo={
            confirmacao && draft ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, ...tabular }}>
                Escolha {confirmacao.escolha + 1} de {draft.totalEscolhas}
                {/* Com a vez já virada, o relógio é o da escolha seguinte: não é desta folha. */}
                {restante !== null && draft.fase === "rodando" && motivoInvalida === null ? (
                  <b
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      color: restante <= 10 ? C.dangerSoft : C.bronzeHi,
                    }}
                  >
                    <Timer size={12} aria-hidden />
                    {restante}s
                  </b>
                ) : null}
              </span>
            ) : undefined
          }
          onFechar={() => setConfirmacao(null)}
          rotuloFechar="Cancelar a escolha"
          rodape={
            <>
              <Button onClick={() => setConfirmacao(null)} style={{ flex: "1 1 110px" }}>
                Cancelar
              </Button>
              <Button
                tone="gold"
                disabled={!podeConduzir || ocupado || motivoInvalida !== null}
                onClick={confirmarEscolha}
                style={{ flex: "2 1 170px" }}
              >
                {ocupado ? "Escolhendo…" : `Escolher para ${confirmacao?.nome ?? "o time"}`}
              </Button>
            </>
          }
        >
          {folhaAberta && draft ? (
            <FichaDaEscolha
              alvo={alvoDaConfirmacao}
              time={timeDaConfirmacao}
              orcamento={draft.orcamentoPorTime}
              motivoInvalida={motivoInvalida}
            />
          ) : null}
        </Folha>
      ) : null}
    </div>
  );
}
