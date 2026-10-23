"use client";

import { Fragment, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { UserRoundSearch } from "lucide-react";

import { EloPorRota } from "@/components/admin/e4/elo-por-rota";
import {
  ChipDoLugar,
  listaDeNomes,
  nomeDe,
  preverFila,
  temFila,
  textoDaPrevisao,
  useFila,
} from "@/components/admin/e4/fila-no-painel";
import type { Inscrito, PropsSecao } from "@/components/admin/e4/painel-edicao";
import { TabelaDePontos } from "@/components/admin/e4/tabela-de-pontos";
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
  Elo,
  Empty,
  Field,
  FieldGrid,
  Metric,
  ScrollX,
  SectionHead,
  Select,
  display,
  tabular,
} from "@/components/admin/ui";
import { RoleIcon } from "@/components/lob/ui";
import { ELO_ORDER, resolveElo, resolveRole, type EloMeta } from "@/lib/design";
import {
  podeSubstituir,
  precosDoSorteio,
  previaDosPrecos,
  retratoDaPrevia,
  type PreviaDosPrecos,
} from "@/lib/draft/previa-de-precos";
import type { RetratoDaTabela } from "@/lib/draft/precos";
import type { DraftPublico } from "@/lib/draft/store";
import { lugarNaFila, reservaADevolverSeNaoJogar, type LugarNaFila } from "@/lib/inscricoes/fila";
import { contaParaTimes, distribuirTimes } from "@/lib/inscricoes/schema";

/**
 * A conta que decide se o draft é possível.
 *
 * A tela inteira gira em torno de uma distinção que já confundiu a organização por
 * escrito: existem DUAS coisas chamadas "sobra". Uma é o resto da divisão
 * (`panorama.sobra`, elegíveis − vagas), a outra é a situação "sobra" gravada na ficha
 * de quem a organização já avisou que ficou de fora. Marcar alguém de sobra não muda a
 * divisão — sobra continua contando como aprovado no servidor, de propósito, senão o
 * número de times se moveria sozinho a cada marcação. Os dois números aparecem lado a
 * lado, nomeados, em vez de um só que finge ser os dois.
 *
 * Dois pools, de propósito:
 * - A CONTA (divisão, orçamento, elos, rotas) usa todo inscrito que ainda pode jogar —
 *   pendente incluso, só recusado e desistente saem (`contaParaTimes`). É previsão.
 * - O que é DEFINITIVO (congelar o elo, escolher substituto, a lista de sobra) continua
 *   só com aprovados: congelar o preço de quem nem foi conferido, ou oferecer um pendente
 *   como substituto, seria tratar a previsão como fato.
 *
 * FILA DE RESERVA (decisões de 2026-10-22, D1/D2): com teto de vagas, quem passa delas espera
 * numa fila COM ordem — a de inscrição, organizadores sempre dentro (`montarFila`, a mesma
 * função do servidor). A lista daqui é essa fila, na ordem em que as pessoas são chamadas; a
 * «sobra» marcada à mão vai para o fim dela. Reserva só paga se for chamado, e quem pagou
 * aparece marcado — o dinheiro dele fica fora do prêmio (aba Pagamentos).
 *
 * No celular a conta é a mesma e o arranjo é de bolso: as quatro tabelas (elos, sobra,
 * substitutos, rotas) viram listas de cartões com o emblema do elo ou o ícone da rota à
 * esquerda — tabela de 620px num telefone obrigava a rolar de lado para achar o botão
 * "Voltar para apto". No monitor as tabelas continuam, só com o emblema no lugar do nome
 * do elo e o ícone da rota no lugar da bolinha de cor.
 *
 * O quadro de elo por rota (`elo-por-rota.tsx`) é a única peça daqui feita para SAIR do
 * painel — a organização tira print e manda no grupo. Por isso ele recebe só nick, elo de
 * preço e rotas: os pontos nem chegam até ele.
 *
 * PREÇOS: desde a 4ª o preço não é mais a tabela fixa por elo (a coluna `pontos`, da 3ª) —
 * é a tabela automática calculada a partir de quem joga (lib/draft/precos.ts), com soma
 * exata `times × orçamento`. Aqui ela é PRÉVIA (`previaDosPrecos`): a mesma função do
 * servidor, sobre a melhor previsão de quem entra. A oficial sai na conferência do draft,
 * com a lista de aptos fechada. Todo número de pontos desta aba — tabela, sobra,
 * substituto — vem dessa prévia, para a organização nunca ver um preço que o draft não usa.
 *
 * Depois do sorteio, a regra 6 (quem pode substituir) passa a usar a TABELA DO SORTEIO: quem
 * está no draft custa o que custou nele, e quem está fora recebe o preço da reta do sorteio
 * (o retrato vem da rota pública do draft, /api/draft/estado). Uma desistência depois do
 * draft muda a prévia — e não pode mudar o preço com que o substituto é comparado.
 */

/**
 * O que a regra 6 precisa do draft sorteado: o retrato da tabela, o preço de cada um e os
 * capitães (Riot ID) — que, sem preço, não substituem nem são substituídos pela tabela.
 */
type TabelaDoSorteio = {
  retrato: RetratoDaTabela;
  pontos: ReadonlyMap<string, number>;
  capitaes: ReadonlySet<string>;
  capitaoGratis: boolean;
};

/**
 * Lê o draft da rota pública uma vez (e a cada mudança da lista): só a tabela do sorteio e os
 * preços por Riot ID. Sem draft, sem a tabela (draft antigo) ou sem rede, fica nulo — e a
 * regra 6 segue com a prévia, como antes do sorteio.
 */
function useTabelaDoSorteio(chave: unknown): TabelaDoSorteio | null {
  const [lida, setLida] = useState<TabelaDoSorteio | null>(null);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      try {
        const resposta = await fetch("/api/draft/estado", { cache: "no-store" });
        if (!resposta.ok) return;
        const corpo = (await resposta.json().catch(() => ({}))) as { draft?: DraftPublico | null };
        const draft = corpo.draft;
        if (!vivo) return;
        if (!draft?.tabelaDePontos) {
          setLida(null);
          return;
        }
        const pontos = new Map<string, number>();
        const elencos = Object.values(draft.elencos ?? {}).flat();
        for (const j of [...elencos, ...(draft.disponiveis ?? [])]) pontos.set(j.riotId, j.pontos);
        const capitaes = new Set(elencos.filter((j) => j.capitao).map((j) => j.riotId));
        setLida({ retrato: draft.tabelaDePontos, pontos, capitaes, capitaoGratis: draft.capitaoGratis === true });
      } catch {
        // Sem rede ou sem draft legível: a regra 6 fica com a prévia.
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chave]);
  return lida;
}

// ---------------------------------------------------------------- estilos de tabela

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
  padding: "9px 12px",
  fontSize: 13,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
};

const tdNum: CSSProperties = { ...td, textAlign: "right", ...tabular };

const nota: CSSProperties = { margin: 0, fontSize: 11.5, lineHeight: 1.65, color: C.ink4 };

/** Lista de cartões do celular — a mesma pilha de `secao-inscritos`. */
const listaDeCartoes: CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

// ---------------------------------------------------------------- apoio

/** Chaves canônicas das rotas. O banco grava JUNG, não SEL — ver `resolveRole`. */
const ROTAS = ["TOP", "JUNG", "MID", "ADC", "SUP"] as const;

const SEM_ESCOPO = "Somente leitura: falta o escopo inscricoes:conferir.";

/** D2: reserva que pagou fica com o dinheiro registrado — e a organização devolve se ele não jogar. */
const TEXTO_PAGOU_NA_FILA = "pagou — fora do prêmio; devolver se não for chamado";

/**
 * O elo que vale como PREÇO, na mesma ordem que o servidor usa.
 *
 * `congelarElos` grava `elo_verificado ?? elo_declarado`; depois de congelado, o
 * congelado é o que manda. Ler na ordem errada aqui faria a tela mostrar uma
 * distribuição de elos que não é a que o draft vai usar.
 */
function eloDePreco(inscrito: Inscrito): string {
  return inscrito.elo_congelado ?? inscrito.elo_verificado ?? inscrito.elo_declarado;
}

/** Do mais forte para o mais fraco, pela régua da tabela (a ordem antiga era pelos pontos fixos). */
function porForcaDesc(previa: PreviaDosPrecos) {
  return (a: Inscrito, b: Inscrito) =>
    (previa.forca(b) ?? -1) - (previa.forca(a) ?? -1) || a.nick.localeCompare(b.nick, "pt-BR");
}

/** Só para o <select> do substituto: opção nativa não mostra imagem, então o nome vai escrito. */
function rotuloElo(inscrito: Inscrito): string {
  return resolveElo(eloDePreco(inscrito))?.label ?? eloDePreco(inscrito);
}

/**
 * O preço de prévia escrito: "—" quando ainda não há tabela (ou o elo não é reconhecido), e
 * "capitão" para o capitão sem preço — ele não tem valor na tabela.
 */
function textoDoPreco(preco: number | null, curto = false, capitao = false): string {
  if (capitao) return "capitão";
  if (preco === null) return "—";
  if (curto) return `${preco} pt`;
  return `${preco} ${preco === 1 ? "ponto" : "pontos"}`;
}

/**
 * Data-âncora só como informação. Data nula é estado legítimo, nunca um veredicto. No fuso
 * de Brasília, como o resto do painel — no do computador, um congelamento às 00:30 de
 * Brasília virava o dia anterior para quem está em Manaus.
 */
function formatarData(iso: string | null): string {
  if (!iso) return "a definir";
  const quando = new Date(iso);
  return Number.isNaN(quando.getTime())
    ? "data inválida"
    : quando.toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
}

/**
 * O nome do jogador na tabela. A bolinha da cor do elo que ficava aqui saiu: a coluna ao
 * lado já mostra o emblema, e dois marcadores do mesmo dado só disputavam o olho.
 */
function CelulaJogador({ inscrito }: Readonly<{ inscrito: Inscrito }>) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: C.ink, fontWeight: 600 }}>{inscrito.nick}</span>
      <span style={{ color: C.ink4, fontSize: 11.5 }}>#{inscrito.tag}</span>
    </span>
  );
}

function CelulaRota({ rota }: Readonly<{ rota: string }>) {
  const meta = resolveRole(rota);
  return <span style={{ color: meta.color, fontSize: 12 }}>{meta.label}</span>;
}

/**
 * Rota curta com o ícone oficial tingido (o mesmo do site público), para os cartões do
 * celular. A secundária sai apagada: é cobertura, não titular — a mesma hierarquia da
 * conta de escassez lá embaixo.
 */
function RotaCurta({ rota, secundaria = false }: Readonly<{ rota: string; secundaria?: boolean }>) {
  const meta = resolveRole(rota);
  const cor = secundaria ? C.ink3 : meta.color;
  return (
    <span
      title={`${secundaria ? "Secundária" : "Primária"}: ${meta.label}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: cor,
        fontWeight: secundaria ? 400 : 600,
        whiteSpace: "nowrap",
      }}
    >
      <RoleIcon role={rota} size={13} color={cor} />
      {meta.short}
    </span>
  );
}

/** A barra de proporção da distribuição de elos — a mesma no monitor e no celular. */
function BarraDeProporcao({ cor, fracao, style }: Readonly<{ cor: string; fracao: number; style?: CSSProperties }>) {
  return (
    <span
      aria-hidden
      style={{
        display: "block",
        height: 6,
        borderRadius: 2,
        background: "rgba(0,0,0,.35)",
        ...style,
      }}
    >
      <span
        style={{
          display: "block",
          height: "100%",
          width: `${fracao * 100}%`,
          borderRadius: 2,
          background: cor,
        }}
      />
    </span>
  );
}

/**
 * Um aprovado em forma de cartão (celular): emblema do elo de preço à esquerda, rotas e
 * pontos embaixo do nome. O nick fica num nó só dele, como na tabela — é por ele que a
 * pessoa procura na lista.
 */
function CartaoDoAprovado({
  inscrito,
  preco,
  capitao = false,
  deOnde = "Prévia da tabela automática",
  fim,
  children,
}: Readonly<{
  inscrito: Inscrito;
  preco: number | null;
  /** Capitão sem preço: a tag CAPITÃO no lugar dos pontos. */
  capitao?: boolean;
  deOnde?: string;
  fim?: ReactNode;
  children?: ReactNode;
}>) {
  return (
    <li>
      <CartaoLinha
        inicio={<Elo elo={eloDePreco(inscrito)} tamanho={40} />}
        titulo={
          <>
            <span>{inscrito.nick}</span>
            <span style={{ color: C.ink4, fontWeight: 400 }}>#{inscrito.tag}</span>
          </>
        }
        subtitulo={
          <span style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "2px 10px" }}>
            <RotaCurta rota={inscrito.rota_primaria} />
            <RotaCurta rota={inscrito.rota_secundaria} secundaria />
            {capitao ? (
              <TagCapitao />
            ) : (
              <span style={tabular} title={deOnde}>
                {textoDoPreco(preco)}
              </span>
            )}
          </span>
        }
        fim={fim}
      >
        {children}
      </CartaoLinha>
    </li>
  );
}

/** A tag do capitão sem preço, no lugar dos pontos (decisão de 23/10/2026). */
function TagCapitao() {
  return (
    <Chip tone="gold" title="Capitão definido pela organização: não tem preço, e cada time tem o orçamento inteiro para as escolhas.">
      capitão
    </Chip>
  );
}

/**
 * O 2º passo do «Voltar para apto» quando a volta tira alguém das vagas (D1/D4). Quem estava em
 * «sobra» volta ao lugar dele pela ordem de inscrição, e quem estava nas vagas depois dele desce
 * para a fila: perde o prazo e, se já pagou, o valor vira «a devolver se não jogar». A gaveta de
 * Inscritos avisa o mesmo antes de salvar; aqui é a mesma frase (`textoDaPrevisao`), em dois
 * passos como o «Passar a vaga» — o servidor refaz a fila na mesma ação que grava.
 */
function ConfirmarVolta({
  inscrito,
  aviso,
  desabilitado,
  motivo,
  largo,
  onConfirmar,
  onCancelar,
}: Readonly<{
  inscrito: Inscrito;
  aviso: string;
  desabilitado: boolean;
  motivo?: string;
  /** No celular: botões na largura toda, um embaixo do outro. */
  largo: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}>) {
  return (
    <div
      role="group"
      aria-label={`Confirmar: voltar ${nomeDe(inscrito)} para apto`}
      style={{ display: "grid", gap: 8, whiteSpace: "normal" }}
    >
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: C.warnSoft }}>{aviso}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexDirection: largo ? "column" : "row" }}>
        <Button
          small={!largo}
          fullWidth={largo}
          tone="danger"
          disabled={desabilitado}
          title={motivo}
          onClick={onConfirmar}
        >
          Confirmar: voltar para apto
        </Button>
        <Button small={!largo} fullWidth={largo} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

/**
 * Distribuição de elos no celular: uma linha por elo, emblema · barra · quantas pessoas.
 * Sem preço: o preço é por divisão e sai da tabela de pontos, logo acima.
 */
function DistribuicaoCompacta({
  linhas,
  maiorGrupo,
}: Readonly<{ linhas: readonly { meta: EloMeta; quantidade: number }[]; maiorGrupo: number }>) {
  return (
    <Card padding="2px 14px">
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {linhas.map(({ meta, quantidade }, indice) => (
          <li
            key={meta.key}
            style={{
              display: "grid",
              gridTemplateColumns: "auto minmax(0, 1fr) auto",
              alignItems: "center",
              gap: 12,
              padding: "10px 0",
              borderTop: indice === 0 ? undefined : "1px solid rgba(201,138,75,.09)",
            }}
          >
            <Elo elo={meta.label} tamanho={36} />
            <span style={{ minWidth: 0 }}>
              <BarraDeProporcao cor={meta.color} fracao={maiorGrupo > 0 ? quantidade / maiorGrupo : 0} />
            </span>
            <span style={{ textAlign: "right", lineHeight: 1 }}>
              <span style={{ display: "block", fontFamily: display, fontSize: 22, color: C.bronzeHi, ...tabular }}>
                {quantidade}
              </span>
              <span style={{ fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.ink4 }}>
                {quantidade === 1 ? "pessoa" : "pessoas"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** O ícone da rota num quadro do tamanho do emblema de elo, para os cartões alinharem. */
function QuadroDaRota({ rota }: Readonly<{ rota: string }>) {
  const meta = resolveRole(rota);
  return (
    <span
      aria-hidden
      style={{
        width: 40,
        height: 40,
        display: "grid",
        placeItems: "center",
        borderRadius: 4,
        border: `1px solid ${meta.color}55`,
        background: "rgba(0,0,0,.32)",
      }}
    >
      <RoleIcon role={rota} size={22} color={meta.color} />
    </span>
  );
}

// ---------------------------------------------------------------- seção

export function SecaoTimes({ dados, executar, ocupado, podeConferir }: PropsSecao) {
  const compacto = useCompacto();
  const { config, inscritos, panorama, pagamentos } = dados;

  /*
   * A fila de reserva (D1): quem é titular e quem espera, na ordem em que é chamado. Mesmo
   * sem teto de vagas a lista existe — só com quem a organização marcou como sobra.
   */
  const fila = useFila(dados);
  const comFila = temFila(fila);
  const naFila = useMemo(() => {
    const porId = new Map(inscritos.map((i) => [i.id, i]));
    const estadoDe = new Map(pagamentos.map((p) => [p.inscricao_id, p.estado]));
    return fila.reservas.flatMap((id): { inscrito: Inscrito; lugar: LugarNaFila; pagou: boolean }[] => {
      const inscrito = porId.get(id);
      if (!inscrito) return [];
      const lugar = lugarNaFila(fila, id);
      return [{ inscrito, lugar, pagou: reservaADevolverSeNaoJogar(lugar, estadoDe.get(id)) }];
    });
  }, [fila, inscritos, pagamentos]);
  const [alvoId, setAlvoId] = useState("");
  const [confirmaCongelar, setConfirmaCongelar] = useState(false);

  const jogadoresPorTime = config.jogadores_por_time;
  // `distribuirTimes` lança com jogadoresPorTime ≤ 0. Um valor estragado no banco
  // derrubaria a aba inteira em branco; aqui a conta é pulada e o problema aparece.
  const configValida = Number.isInteger(jogadoresPorTime) && jogadoresPorTime > 0;

  // A prévia da tabela de pontos: a mesma função do servidor, sobre quem deve jogar.
  const previa = useMemo(
    () =>
      previaDosPrecos({
        inscritos,
        jogadoresPorTime,
        orcamentoPorTime: config.orcamento_por_time,
        maxTimes: config.max_times ?? null,
        capitaoComPreco: config.capitao_com_preco ?? null,
      }),
    [inscritos, jogadoresPorTime, config.orcamento_por_time, config.max_times, config.capitao_com_preco],
  );
  const precoDe = (i: Inscrito) => previa.preco(i);

  // A regra 6 depois do sorteio: a tabela do sorteio; antes, a prévia.
  const sorteio = useTabelaDoSorteio(inscritos);
  const precosDaRegra6 = useMemo(
    () =>
      sorteio
        ? precosDoSorteio({
            retrato: sorteio.retrato,
            pontosDoDraft: sorteio.pontos,
            inscritos,
            capitaesDoDraft: sorteio.capitaes,
            capitaoGratis: sorteio.capitaoGratis,
          })
        : previa,
    [sorteio, inscritos, previa],
  );
  const precoNaRegra6 = (i: Inscrito) => precosDaRegra6.preco(i);
  /** Capitão sem preço (na prévia ou no draft sorteado): tag no lugar dos pontos, fora da regra 6. */
  const capitaoNaRegra6 = (i: Inscrito) => precosDaRegra6.semPreco(i);
  const ondeOPreco = sorteio ? "na tabela do sorteio" : "na prévia";

  const analise = useMemo(() => {
    // A conta: todo mundo que ainda pode jogar, igual ao servidor (`panorama`). `filter`
    // já devolve array novo, então o `sort` não mexe na lista que veio por prop.
    const pool = inscritos.filter((i) => contaParaTimes(i.situacao)).sort(porForcaDesc(previa));
    // O definitivo: aprovado = apto + sobra, o mesmo pool que o servidor congela.
    const aprovados = pool.filter((i) => i.situacao === "apto" || i.situacao === "sobra");

    const semCongelar = aprovados.filter((i) => i.elo_congelado === null);
    // Mesmo `resolveElo` que o servidor usa: se ele não reconhece, `congelarElos`
    // estoura no meio do laço — e o que já passou fica congelado. Ver o cartão final.
    const eloIlegivel = pool.filter((i) => resolveElo(eloDePreco(i)) === null);
    const eloIlegivelAprovado = eloIlegivel.filter((i) => i.situacao === "apto" || i.situacao === "sobra");

    const porElo = ELO_ORDER.map((meta) => ({
      meta,
      quantidade: pool.filter((i) => resolveElo(eloDePreco(i))?.key === meta.key).length,
    })).filter((linha) => linha.quantidade > 0);
    const maiorGrupo = porElo.reduce((maior, linha) => Math.max(maior, linha.quantidade), 0);

    const rotas = ROTAS.map((chave) => ({
      meta: resolveRole(chave),
      primaria: pool.filter((i) => resolveRole(i.rota_primaria).key === chave).length,
      secundaria: pool.filter((i) => resolveRole(i.rota_secundaria).key === chave).length,
    }));
    // Escassez é medida pela PRIMÁRIA; a secundária só desempata. Quem joga a rota de
    // segunda escolha cobre um buraco, mas não é a mesma coisa que ter titular.
    const escassa = rotas.reduce(
      (pior, r) =>
        r.primaria < pior.primaria ||
        (r.primaria === pior.primaria && r.secundaria < pior.secundaria)
          ? r
          : pior,
      rotas[0],
    );

    // O quadro de elo por rota recebe só nick, elo de preço e rotas: nada de pontos.
    const jogadoresDoQuadro = pool.map((i) => ({
      nick: i.nick,
      elo: eloDePreco(i),
      primaria: i.rota_primaria,
      secundaria: i.rota_secundaria,
    }));

    return {
      pool,
      jogadoresDoQuadro,
      aprovados,
      semCongelar,
      jaCongelados: aprovados.length - semCongelar.length,
      eloIlegivel,
      eloIlegivelAprovado,
      porElo,
      maiorGrupo,
      rotas,
      escassa,
    };
  }, [inscritos, previa]);

  const alvo = analise.aprovados.find((i) => i.id === alvoId) ?? null;

  /**
   * Regra 6: substituto de valor igual ou menor ao do substituído — pelo preço da tabela
   * automática: a do SORTEIO quando já houve draft, a prévia antes. Sem tabela ainda (nenhum
   * time fecha), pela régua de força, que é a ordem em que os preços crescem.
   */
  const substitutos = useMemo(
    () => (alvo ? analise.aprovados.filter((i) => i.id !== alvo.id && podeSubstituir(precosDaRegra6, i, alvo)) : []),
    [alvo, analise.aprovados, precosDaRegra6],
  );

  const dataCongelamento = useMemo(
    () => formatarData(config.congelamento_elo),
    [config.congelamento_elo],
  );

  // `panorama.sobra` é o RESTO da divisão (0 … jogadoresPorTime−1), então isto é
  // sempre quanta gente falta para fechar mais um time — inclusive o primeiro.
  const faltamParaFecharTime = jogadoresPorTime - panorama.sobra;

  /*
   * O que o DRAFT montaria hoje, só com os aprovados (`montarDraftDosAprovados`). Com
   * pendentes na conta, a previsão e o draft divergem: 22 aptos + 3 pendentes prevêem 5
   * times e 0 de sobra, mas o draft de hoje fecha 4 e cobra 2 na sobra. Sem este número
   * ao lado, a organização planejava (e avisava gente no grupo) pelo número errado.
   */
  const comPendentes = panorama.pendentes > 0;
  const draftHoje =
    configValida && comPendentes
      ? distribuirTimes(analise.aprovados.length, jogadoresPorTime, config.max_times ?? null)
      : null;

  const congelar = async () => {
    const deuCerto = await executar("congelar");
    // Só solta a trava se deu certo: numa falha, a pessoa continua a um clique de
    // tentar de novo em vez de remarcar a confirmação.
    if (deuCerto) setConfirmaCongelar(false);
  };

  const mudarSituacao = (inscrito: Inscrito, situacao: "apto" | "sobra") =>
    // Com a situação que esta tela mostrava: se outra pessoa mudou antes (recusou, segurou),
    // o servidor responde 409 sem gravar e a tela recarrega com o valor de agora.
    executar("ficha", { inscricaoId: inscrito.id, situacao, situacaoAnterior: inscrito.situacao });

  /*
   * «Voltar para apto» com a fila (D1): a «sobra» volta ao lugar dela pela ordem de inscrição e
   * pode empurrar um titular para a fila — titular que perde o prazo e, se pagou, vira «a
   * devolver se não jogar». Quando alguém desce, a tela diz quem ANTES de gravar e pede a
   * confirmação; quando ninguém desce, grava no clique, como sempre foi.
   */
  const [voltaPendente, setVoltaPendente] = useState<string | null>(null);
  const estadoDoPagamento = useMemo(() => new Map(pagamentos.map((p) => [p.inscricao_id, p.estado])), [pagamentos]);
  const avisoDaVolta = (inscrito: Inscrito): string | null => {
    if (!comFila) return null;
    const previsao = preverFila(inscritos, config, inscrito.id, { situacao: "apto", organizador: inscrito.organizador });
    if (previsao.saem.length === 0) return null;
    const pagaram = previsao.saem.filter((i) => {
      const estado = estadoDoPagamento.get(i.id);
      return estado === "pago" || estado === "declarado";
    });
    return [
      textoDaPrevisao(previsao, inscrito, "Ao voltar para apto"),
      pagaram.length > 0
        ? pagaram.length === 1
          ? `${listaDeNomes(pagaram)} já pagou (ou declarou que pagou): o valor fica registrado, fora do prêmio, e é devolvido se ele não for chamado.`
          : `${listaDeNomes(pagaram)} já pagaram (ou declararam que pagaram): o valor fica registrado, fora do prêmio, e é devolvido a quem não for chamado.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
  };
  const pedirVoltaParaApto = (inscrito: Inscrito) => {
    if (avisoDaVolta(inscrito) === null) {
      void mudarSituacao(inscrito, "apto");
      return;
    }
    setVoltaPendente(inscrito.id);
  };
  const confirmarVolta = async (inscrito: Inscrito) => {
    const ok = await mudarSituacao(inscrito, "apto");
    // Numa falha, a confirmação fica aberta: a pessoa tenta de novo sem refazer o 1º passo.
    if (ok) setVoltaPendente(null);
  };
  /** O aviso do 2º passo aberto nesta linha, ou nulo (fechado, ou a volta não tira mais ninguém). */
  const voltaDe = (inscrito: Inscrito): string | null =>
    voltaPendente === inscrito.id && inscrito.situacao === "sobra" ? avisoDaVolta(inscrito) : null;

  const tabela = retratoDaPrevia(previa);
  const precoDoAlvo = alvo ? precoNaRegra6(alvo) : null;
  const alvoECapitao = alvo !== null && capitaoNaRegra6(alvo);
  /** Com o capitão sem preço, quantos entram na tabela: só quem vai ser escolhido. */
  const naTabela = tabela?.capitaoGratis ? previa.vagas - previa.times : previa.vagas;

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Times e viabilidade"
        description="A conta que decide se o draft é possível: quantos times fecham (contando todo inscrito que não foi recusado nem desistiu), a prévia da tabela de pontos, quem sobrou e quem pode substituir quem."
      />

      {!podeConferir ? (
        <Banner tone="warn" title="Você está vendo, não mexendo">
          Os números todos estão aqui, mas mudar situação e congelar elos exige o escopo
          inscricoes:conferir. Peça a quem administra os acessos.
        </Banner>
      ) : null}

      {!configValida ? (
        <Banner tone="danger" title="Jogadores por time inválido">
          A configuração da edição está com {String(jogadoresPorTime)} jogadores por time. Enquanto
          isso não for um número inteiro positivo, a divisão e o orçamento não podem ser calculados
          — ajuste na aba Configuração.
        </Banner>
      ) : null}

      {/* ---------------------------------------------------------------- 1. divisão */}

      <BlockTitle right={<Chip>{jogadoresPorTime} por time</Chip>}>A divisão</BlockTitle>

      <FieldGrid min={150}>
        <Metric
          label="Elegíveis"
          value={panorama.elegiveis}
          detail={`${panorama.aprovados} aprovados · ${panorama.pendentes} pendentes`}
        />
        <Metric
          label="Times"
          value={panorama.times}
          detail={comPendentes ? "previsão, com pendentes" : "fecham com o pool de hoje"}
        />
        <Metric
          label="Vagas"
          value={panorama.vagas}
          detail={comPendentes ? "previsão, com pendentes" : "entram no draft"}
        />
        <Metric label="Sobrando" value={panorama.sobra} detail="elegíveis sem vaga" />
      </FieldGrid>

      <Card padding="14px 16px" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.ink2, ...tabular }}>
          times = {config.max_times ? `mín(${config.max_times}, piso(elegíveis ÷ jogadores por time))` : "piso(elegíveis ÷ jogadores por time)"}
          {configValida ? (
            <>
              {config.max_times ? ` = mín(${config.max_times}, piso(` : " = piso("}
              {panorama.elegiveis} ÷ {jogadoresPorTime}
              {config.max_times ? ")) = " : ") = "}
              <strong style={{ color: C.bronzeHi, fontFamily: display, fontSize: 16 }}>
                {panorama.times}
              </strong>
            </>
          ) : null}
        </p>

        {configValida ? (
          config.max_times && panorama.times >= config.max_times ? (
            // No teto, "mais N fecham o 7º time" seria mentira: não existe 7º time.
            <p style={{ margin: 0, fontSize: 12.5, color: C.okSoft }}>
              Os {config.max_times} times já fecham. Quem se inscrever a mais entra na fila de reserva, pela ordem
              de inscrição — e só paga se for chamado.
            </p>
          ) : panorama.times === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: C.warnSoft }}>
              Nenhum time fecha ainda: faltam {faltamParaFecharTime}{" "}
              {faltamParaFecharTime === 1 ? "inscrito" : "inscritos"} para o primeiro.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2 }}>
              Mais {faltamParaFecharTime}{" "}
              {faltamParaFecharTime === 1 ? "inscrito fecha" : "inscritos fecham"} o{" "}
              {panorama.times + 1}º time.
            </p>
          )
        ) : null}

        <p style={nota}>
          {config.max_times
            ? `Esta edição tem teto de ${config.max_times} times (${config.max_times * jogadoresPorTime} vagas): quem passar disso vai para a fila de reserva, pela ordem de inscrição (organizadores sempre entram). Até lá, o número de times acompanha os elegíveis — todo inscrito, menos quem foi recusado, desistiu ou foi excluído. Pendente já conta.`
            : "Sem teto de times: o número de times acompanha os elegíveis — todo inscrito, menos quem foi recusado ou desistiu. Pendente já conta."}
        </p>

        {comPendentes ? (
          <p style={{ ...nota, color: C.warnSoft }}>
            Previsão: {panorama.pendentes}{" "}
            {panorama.pendentes === 1 ? "pendente entra" : "pendentes entram"} nesta conta, mas o
            draft só sorteia aprovados. Antes do draft, confira todo mundo — quem continuar
            pendente fica de fora, e a conta pode cair.
            {draftHoje ? (
              <>
                {" "}
                Só com os {analise.aprovados.length} aprovados de hoje (o que o draft usaria):{" "}
                <strong style={{ color: C.ink }}>
                  {draftHoje.times} {draftHoje.times === 1 ? "time" : "times"}, {draftHoje.vagas}{" "}
                  {draftHoje.vagas === 1 ? "vaga" : "vagas"}, {draftHoje.sobra} de sobra
                </strong>
                .
              </>
            ) : null}
          </p>
        ) : null}
      </Card>

      {/* ---------------------------------------------------- 2. tabela de pontos (prévia) */}

      <BlockTitle
        right={
          <Chip tone="warn" title="A tabela oficial sai na conferência do draft, com a lista de aptos fechada.">
            prévia
          </Chip>
        }
      >
        Tabela de pontos
      </BlockTitle>

      {!configValida ? (
        <Banner tone="warn" title="Sem tabela de pontos">
          Corrija os jogadores por time para esta conta voltar.
        </Banner>
      ) : tabela === null ? (
        <Banner tone="warn" title="Ainda não dá para calcular">
          A tabela sai de quem joga — o elo mais baixo custa 1 ponto e o jogador médio custa{" "}
          {config.orcamento_por_time} ÷ {previa.capitaoGratis ? `${jogadoresPorTime - 1} (o capitão não tem preço)` : jogadoresPorTime} —,
          então precisa de pelo menos um time fechado. Ela aparece quando o primeiro time fechar.
        </Banner>
      ) : (
        <>
          {tabela.folga === 0 ? (
            <Banner tone="ok" title="A conta fecha">
              {tabela.capitaoGratis ? (
                <>
                  Os {naTabela} que vão ser escolhidos somam exatamente {tabela.alvo} pontos ({tabela.times} ×{" "}
                  {tabela.orcamentoPorTime}):{" "}
                  {previa.times === 1 ? "o capitão entra sem preço" : `os ${previa.times} capitães entram sem preço`}, e todo time termina o draft
                  gastando os {tabela.orcamentoPorTime} nas {tabela.jogadoresPorTime} escolhas.
                </>
              ) : (
                <>
                  Os {previa.vagas} que entram somam exatamente {tabela.alvo} pontos ({tabela.times} ×{" "}
                  {tabela.orcamentoPorTime}): todo time termina o draft gastando os {tabela.orcamentoPorTime}.
                </>
              )}
            </Banner>
          ) : tabela.folga > 0 ? (
            <Banner tone="warn" title={`Sobram ${tabela.folga} ${tabela.folga === 1 ? "ponto" : "pontos"}`}>
              {tabela.queda
                ? `A soma exata não fechava os elencos com os capitães, então a conta baixou a soma: os ${naTabela} da tabela somam ${tabela.soma} de ${tabela.alvo}, e um time pode terminar gastando menos que outro.`
                : `Não existe tabela inteira com a soma exata para este pool: os ${naTabela} da tabela somam ${tabela.soma} de ${tabela.alvo}, e um time pode terminar gastando menos que outro.`}
            </Banner>
          ) : (
            <Banner tone="danger" title="O orçamento não paga 1 ponto por jogador">
              Com {tabela.orcamentoPorTime} pontos por time e {tabela.jogadoresPorTime} jogadores, nem todo
              mundo a 1 ponto cabe. Suba o orçamento por time na aba Configuração.
            </Banner>
          )}

          <TabelaDePontos tabela={tabela} compacto={compacto} />

          <Card padding="14px 16px" style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <p style={nota}>
              {previa.origem === "titulares"
                ? `Calculada com os ${previa.vagas} titulares — quem não está na fila de reserva nem marcado como sobra —, o pool que o draft vai usar quando a conferência acabar.`
                : `Calculada com os ${previa.vagas} de elo mais baixo entre os ${previa.elegiveis} elegíveis — o cenário mais barato possível, enquanto não está decidido quem fica na sobra.`}{" "}
              Quem fica de fora recebe o preço da reta, preso entre as linhas vizinhas.
            </p>
            {previa.capitaoGratis ? (
              <p style={nota}>
                {previa.capitaesDaTabela === "definidos"
                  ? `Capitães: os ${previa.times} definidos pela organização. Eles não têm preço e não entram na tabela — cada time tem ${config.orcamento_por_time} pontos para as ${jogadoresPorTime - 1} escolhas.`
                  : previa.capitaesDaTabela === "regra"
                    ? `Capitães: ainda não foram definidos pela organização, então a prévia usa os ${previa.times} de maior elo (sem organizador). Eles não têm preço e não entram na tabela — cada time tem ${config.orcamento_por_time} pontos para as ${jogadoresPorTime - 1} escolhas. Defina os capitães na aba Draft ao vivo.`
                    : `O capitão não tem preço nesta edição, mas a prévia ainda não sabe quem são os capitães: a tabela acima inclui todo mundo e muda quando eles forem definidos (aba Draft ao vivo).`}
              </p>
            ) : null}
            <p style={{ ...nota, color: C.warnSoft }}>
              Prévia: muda conforme a conferência anda, o robô da Riot lê os elos e a organização marca a
              sobra. A tabela oficial sai na conferência do draft (aba Draft), com a lista de aptos
              fechada e os elos congelados.
            </p>
          </Card>
        </>
      )}

      <BlockTitle>Distribuição de elos dos elegíveis</BlockTitle>

      {analise.porElo.length === 0 ? (
        <Empty title="Ninguém na conta ainda">
          A distribuição aparece com a primeira inscrição que não foi recusada.
        </Empty>
      ) : compacto ? (
        <DistribuicaoCompacta linhas={analise.porElo} maiorGrupo={analise.maiorGrupo} />
      ) : (
        <ScrollX>
          <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th scope="col" style={th}>
                  Elo
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Pessoas
                </th>
                <th scope="col" style={{ ...th, width: "100%" }}>
                  Proporção
                </th>
              </tr>
            </thead>
            <tbody>
              {analise.porElo.map(({ meta, quantidade }) => (
                <tr key={meta.key}>
                  <td style={td}>
                    <Elo elo={meta.label} tamanho={24} />
                  </td>
                  <td style={tdNum}>{quantidade}</td>
                  <td style={{ ...td, width: "100%" }}>
                    <BarraDeProporcao
                      cor={meta.color}
                      fracao={analise.maiorGrupo > 0 ? quantidade / analise.maiorGrupo : 0}
                      style={{ minWidth: 80 }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}

      {analise.eloIlegivel.length > 0 ? (
        <div style={{ marginTop: 12 }}>
          <Banner tone="danger" title="Elo não reconhecido em algumas fichas">
            {analise.eloIlegivel.length}{" "}
            {analise.eloIlegivel.length === 1 ? "ficha está" : "fichas estão"} com um elo que a
            tabela do site não resolve ({analise.eloIlegivel.map((i) => i.nick).join(", ")}).
            Ficam fora da distribuição e da tabela de pontos
            {analise.eloIlegivelAprovado.length > 0
              ? ", e o congelamento não roda enquanto as aprovadas não forem corrigidas na ficha."
              : "; corrija na ficha antes de aprovar."}
          </Banner>
        </div>
      ) : null}

      {/* ------------------------------------------------------- 2b. elo por rota */}

      <BlockTitle>Elo por rota</BlockTitle>

      <EloPorRota jogadores={analise.jogadoresDoQuadro} times={panorama.times} />

      {/* ---------------------------------------------------------- 3. fila de reserva */}

      <BlockTitle
        right={
          comFila ? (
            <Chip tone={fila.reservas.length > 0 ? "warn" : "neutro"} title="Na ordem em que são chamados">
              {fila.reservas.length} na fila
            </Chip>
          ) : (
            <Chip tone="off" title="Sem máximo de times na Configuração">
              sem teto de vagas
            </Chip>
          )
        }
      >
        Titulares e fila de reserva
      </BlockTitle>

      {comFila ? (
        <FieldGrid min={150} style={{ marginBottom: 12 }}>
          <Metric label="Titulares" value={fila.titulares.length} detail={`de ${fila.vagas} vagas`} />
          <Metric label="Fila de reserva" value={fila.reservas.length} detail="na ordem de inscrição" />
          <Metric
            label="Vagas abertas"
            value={Math.max(0, (fila.vagas ?? 0) - fila.titulares.length)}
            detail="quem se inscrever agora entra direto"
          />
        </FieldGrid>
      ) : null}

      <Card padding="14px 16px" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        {comFila ? (
          <>
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>
              A fila TEM ordem: titulares são todos os organizadores mais os primeiros por ordem de inscrição, até
              completar as {fila.vagas} vagas; o resto espera na ordem de inscrição. Quem sai da vaga — desiste, é
              recusado, excluído ou perde o prazo de pagamento — chama o 1º da fila na mesma hora, e ele passa a ter
              prazo de pagamento. Reserva só paga se for chamado.
            </p>
            <p style={nota}>
              «Sobra» continua valendo como decisão à mão: quem a organização marca como sobra sai das vagas e vai para o
              FIM da fila, sem ser chamado sozinho. «Voltar para apto» devolve a pessoa ao lugar dela pela ordem de
              inscrição.
            </p>
          </>
        ) : (
          <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>
            Sem máximo de times na Configuração, todo inscrito que ainda pode jogar é titular e ninguém espera vaga — só
            quem a organização marcou como sobra fica de fora.
          </p>
        )}
      </Card>

      {fila.reservas.length === 0 ? (
        <Empty title="Ninguém na fila">
          {comFila
            ? `Os ${fila.titulares.length} inscritos que ainda podem jogar estão dentro das ${fila.vagas} vagas.`
            : "Ninguém marcado como sobra."}
        </Empty>
      ) : compacto ? (
        // No celular o botão desce para a largura inteira do cartão: na tabela ele era a
        // última coluna, a que mais se perdia fora da tela.
        <ul style={listaDeCartoes}>
          {naFila.map(({ inscrito: i, lugar, pagou }) => (
            <CartaoDoAprovado
              key={i.id}
              inscrito={i}
              preco={precoDe(i)}
              capitao={previa.semPreco(i)}
              fim={<ChipDoLugar lugar={lugar} />}
            >
              {pagou ? (
                <span style={{ display: "block", fontSize: 11.5, color: C.warnSoft }}>{TEXTO_PAGOU_NA_FILA}</span>
              ) : null}
              {i.situacao === "sobra" && voltaDe(i) !== null ? (
                <ConfirmarVolta
                  inscrito={i}
                  aviso={voltaDe(i)!}
                  desabilitado={!podeConferir || ocupado}
                  motivo={podeConferir ? undefined : SEM_ESCOPO}
                  largo
                  onConfirmar={() => void confirmarVolta(i)}
                  onCancelar={() => setVoltaPendente(null)}
                />
              ) : i.situacao === "sobra" ? (
                <Button
                  small
                  fullWidth
                  disabled={!podeConferir || ocupado}
                  title={podeConferir ? "Devolve a situação para apto." : SEM_ESCOPO}
                  onClick={() => pedirVoltaParaApto(i)}
                >
                  Voltar para apto
                </Button>
              ) : null}
            </CartaoDoAprovado>
          ))}
        </ul>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th scope="col" style={th}>
                  Fila
                </th>
                <th scope="col" style={{ ...th, width: "100%" }}>
                  Jogador
                </th>
                <th scope="col" style={th}>
                  Elo
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Pontos
                </th>
                <th scope="col" style={th}>
                  Primária
                </th>
                <th scope="col" style={th}>
                  Na ficha
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {naFila.map(({ inscrito: i, lugar, pagou }) => (
                <Fragment key={i.id}>
                  <tr>
                    <td style={td}>
                      <ChipDoLugar lugar={lugar} />
                    </td>
                    <td style={{ ...td, width: "100%" }}>
                      <CelulaJogador inscrito={i} />
                      {pagou ? (
                        <span style={{ display: "block", marginTop: 2, fontSize: 11, color: C.warnSoft }}>
                          {TEXTO_PAGOU_NA_FILA}
                        </span>
                      ) : null}
                    </td>
                    <td style={td}>
                      <Elo elo={eloDePreco(i)} tamanho={24} />
                    </td>
                    <td style={tdNum}>{previa.semPreco(i) ? <TagCapitao /> : (precoDe(i) ?? "—")}</td>
                    <td style={td}>
                      <CelulaRota rota={i.rota_primaria} />
                    </td>
                    <td style={td}>{i.situacao}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {i.situacao === "sobra" && voltaDe(i) !== null ? (
                        <span style={{ fontSize: 11.5, color: C.warnSoft }}>confirme abaixo</span>
                      ) : i.situacao === "sobra" ? (
                        <Button
                          small
                          disabled={!podeConferir || ocupado}
                          title={podeConferir ? "Devolve a situação para apto." : SEM_ESCOPO}
                          onClick={() => pedirVoltaParaApto(i)}
                        >
                          Voltar para apto
                        </Button>
                      ) : (
                        <span style={{ color: C.ink4 }}>—</span>
                      )}
                    </td>
                  </tr>
                  {i.situacao === "sobra" && voltaDe(i) !== null ? (
                    <tr>
                      <td colSpan={7} style={{ ...td, whiteSpace: "normal" }}>
                        <ConfirmarVolta
                          inscrito={i}
                          aviso={voltaDe(i)!}
                          desabilitado={!podeConferir || ocupado}
                          motivo={podeConferir ? undefined : SEM_ESCOPO}
                          largo={false}
                          onConfirmar={() => void confirmarVolta(i)}
                          onCancelar={() => setVoltaPendente(null)}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* ---------------------------------------------------------- 4. substituição */}

      <BlockTitle
        right={
          <span style={{ display: "inline-flex", gap: 6 }}>
            <Chip>regra 6</Chip>
            {sorteio ? (
              <Chip tone="ok" title="Os preços que o draft usou: quem está no draft, o que custou nele; quem está fora, a reta do sorteio.">
                tabela do sorteio
              </Chip>
            ) : null}
          </span>
        }
      >
        Quem pode substituir
      </BlockTitle>

      <Card padding={compacto ? "14px 14px" : "16px 18px"} style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>
          O substituto tem de valer o mesmo ou menos em pontos — acima disso, só com aprovação da
          organização. Ele também precisa cumprir as regras 3, 4, 5 e 21, e ninguém é obrigado a
          aceitar. Consulta pura: nada aqui grava nada.
        </p>
        {sorteio ? (
          <p style={nota}>
            Com o draft sorteado, os pontos aqui são os da tabela do sorteio: quem está no draft custa o que
            custou nele, e quem está fora recebe o preço da reta daquela tabela — uma desistência depois do
            draft não muda o valor de ninguém.
          </p>
        ) : null}

        <Field label="Jogador a substituir" hint="Só aprovados (apto ou sobra) aparecem na lista.">
          {/* A opção nativa não mostra imagem: o elo vai escrito nela, e o emblema de quem
              foi escolhido aparece ao lado — o mesmo arranjo do campo de elo da ficha. */}
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {alvo ? (
              <Elo elo={eloDePreco(alvo)} tamanho={34} />
            ) : (
              <span aria-hidden style={{ width: 34, display: "grid", placeItems: "center", flexShrink: 0 }}>
                <UserRoundSearch size={22} color={C.ink4} aria-hidden />
              </span>
            )}
            <Select
              value={alvoId}
              onChange={setAlvoId}
              ariaLabel="Jogador a substituir"
              disabled={analise.aprovados.length === 0}
            >
              <option value="">— escolha um jogador —</option>
              {[...analise.aprovados]
                .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nick}#{i.tag} — {rotuloElo(i)} · {textoDoPreco(precoNaRegra6(i), true, capitaoNaRegra6(i))}
                  </option>
                ))}
            </Select>
          </span>
        </Field>

        {alvo === null ? (
          <p style={nota}>
            Escolha alguém para ver quem, dentre os aprovados, pode entrar no lugar dele.
          </p>
        ) : alvoECapitao ? (
          <Empty title="Capitão não é substituído pela tabela">
            {alvo.nick} é capitão e não tem preço: não há valor para comparar. Se um capitão sair, a organização
            escolhe outro capitão entre os jogadores do time, e a vaga dele vai para um reserva (regra 6).
          </Empty>
        ) : substitutos.length === 0 ? (
          <Empty title="Nenhum aprovado serve">
            {alvo.nick} é o aprovado mais barato
            {precoDoAlvo !== null ? ` (${textoDoPreco(precoDoAlvo)} ${ondeOPreco})` : ""}, então não há
            aprovado de valor igual ou menor para substituí-lo. Pendentes não entram nesta lista:
            confira-os primeiro.
          </Empty>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.7 }}>
              {substitutos.length}{" "}
              {substitutos.length === 1 ? "aprovado pode" : "aprovados podem"} entrar no lugar de{" "}
              <strong style={{ color: C.bronzeLit }}>{alvo.nick}</strong> —{" "}
              {precoDoAlvo !== null ? `pontos ≤ ${precoDoAlvo} ${ondeOPreco}` : "elo igual ou abaixo"}{" "}
              <Elo elo={eloDePreco(alvo)} tamanho={18} />.
            </p>
            {compacto ? (
              <ul style={listaDeCartoes}>
                {substitutos.map((i) => (
                  <CartaoDoAprovado
                    key={i.id}
                    inscrito={i}
                    preco={precoNaRegra6(i)}
                    deOnde={sorteio ? "Tabela do sorteio" : undefined}
                    fim={
                      i.situacao === "sobra" ? (
                        <Chip tone="ok" title="Aprovado sem vaga — a origem mais provável de um substituto.">
                          na sobra
                        </Chip>
                      ) : (
                        <Chip tone="neutro" title="Já entra nos times.">
                          apto
                        </Chip>
                      )
                    }
                  />
                ))}
              </ul>
            ) : (
              <ScrollX>
                <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th scope="col" style={{ ...th, width: "100%" }}>
                        Jogador
                      </th>
                      <th scope="col" style={th}>
                        Elo
                      </th>
                      <th scope="col" style={{ ...th, textAlign: "right" }}>
                        Pontos
                      </th>
                      <th scope="col" style={th}>
                        Primária
                      </th>
                      <th scope="col" style={th}>
                        Secundária
                      </th>
                      <th scope="col" style={{ ...th, textAlign: "right" }}>
                        Situação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {substitutos.map((i) => (
                      <tr key={i.id}>
                        <td style={{ ...td, width: "100%" }}>
                          <CelulaJogador inscrito={i} />
                        </td>
                        <td style={td}>
                          <Elo elo={eloDePreco(i)} tamanho={24} />
                        </td>
                        <td style={tdNum}>{precoNaRegra6(i) ?? "—"}</td>
                        <td style={td}>
                          <CelulaRota rota={i.rota_primaria} />
                        </td>
                        <td style={td}>
                          <CelulaRota rota={i.rota_secundaria} />
                        </td>
                        <td style={{ ...td, textAlign: "right" }}>
                          {i.situacao === "sobra" ? (
                            <Chip tone="ok" title="Aprovado sem vaga — a origem mais provável de um substituto.">
                              na sobra
                            </Chip>
                          ) : (
                            <Chip tone="neutro" title="Já entra nos times.">
                              apto
                            </Chip>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollX>
            )}
          </>
        )}
      </Card>

      {/* ---------------------------------------------------------------- 5. rotas */}

      <BlockTitle
        right={
          <Chip tone={panorama.times > 0 ? "neutro" : "warn"}>
            {panorama.times > 0 ? `${panorama.times} de cada rota` : "sem time fechado"}
          </Chip>
        }
      >
        Cobertura de rotas
      </BlockTitle>

      {compacto ? (
        <ul style={listaDeCartoes}>
          {analise.rotas.map(({ meta, primaria, secundaria }) => {
            const falta = Math.max(0, panorama.times - primaria);
            return (
              <li key={meta.key}>
                <CartaoLinha
                  inicio={<QuadroDaRota rota={meta.key} />}
                  titulo={meta.label}
                  subtitulo={
                    <span style={tabular}>
                      {primaria} {primaria === 1 ? "primária" : "primárias"} · {secundaria}{" "}
                      {secundaria === 1 ? "secundária" : "secundárias"}
                      {panorama.times > 0 ? ` · precisa ${panorama.times}` : ""}
                    </span>
                  }
                  fim={
                    panorama.times === 0 ? null : falta > 0 ? (
                      <Chip tone="danger">falta {falta}</Chip>
                    ) : (
                      <Chip tone="ok">ok</Chip>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", minWidth: 520, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th scope="col" style={{ ...th, width: "100%" }}>
                  Rota
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Primária
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Secundária
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Precisa
                </th>
                <th scope="col" style={{ ...th, textAlign: "right" }}>
                  Falta
                </th>
              </tr>
            </thead>
            <tbody>
              {analise.rotas.map(({ meta, primaria, secundaria }) => {
                const falta = Math.max(0, panorama.times - primaria);
                return (
                  <tr key={meta.key}>
                    <td style={{ ...td, width: "100%" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <RoleIcon role={meta.key} size={15} color={meta.color} />
                        {meta.label}
                      </span>
                    </td>
                    <td style={{ ...tdNum, color: C.ink }}>{primaria}</td>
                    <td style={tdNum}>{secundaria}</td>
                    <td style={tdNum}>{panorama.times > 0 ? panorama.times : "—"}</td>
                    <td
                      style={{
                        ...tdNum,
                        color: panorama.times === 0 ? C.ink4 : falta > 0 ? C.dangerSoft : C.okSoft,
                      }}
                    >
                      {panorama.times === 0 ? "—" : falta > 0 ? falta : "ok"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      )}

      <Card padding="14px 16px" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink2 }}>
          Rota mais escassa: <strong style={{ color: analise.escassa.meta.color }}>
            {analise.escassa.meta.label}
          </strong>{" "}
          — {analise.escassa.primaria}{" "}
          {analise.escassa.primaria === 1 ? "primária" : "primárias"}
          {panorama.times > 0
            ? `, e são precisos ${panorama.times}${
                analise.escassa.primaria < panorama.times
                  ? ` (faltam ${panorama.times - analise.escassa.primaria})`
                  : ""
              }`
            : ""}
          . Outras {analise.escassa.secundaria}{" "}
          {analise.escassa.secundaria === 1 ? "pessoa joga" : "pessoas jogam"} a rota como
          secundária.
        </p>
        <p style={nota}>
          Com N times você precisa de N de cada rota. Secundária cobre buraco, mas não é titular —
          é para não descobrir no dia do draft que não há suporte para todo mundo.
        </p>
      </Card>

      {/* ---------------------------------------------------------------- 6. congelar */}

      <BlockTitle>Congelar os elos</BlockTitle>

      <ActionCard
        tone="danger"
        title="Congelar o elo dos aprovados"
        badge={
          analise.semCongelar.length === 0 && analise.aprovados.length > 0 ? (
            <Chip tone="ok">todos congelados</Chip>
          ) : (
            <Chip tone="warn">
              {analise.jaCongelados}/{analise.aprovados.length} congelados
            </Chip>
          )
        }
        description={
          <>
            Fixa o elo de todos os aprovados que ainda não têm elo congelado — e, junto, a divisão e
            o PDL que a Riot mostra hoje, que decidem a classe de cada um na tabela de pontos. Usa o
            elo verificado, ou o declarado quando não houver verificação; a divisão só é guardada se
            a leitura da Riot for do mesmo elo (senão, conta o meio do elo). Depois disto o preço
            para de acompanhar o elo real: é o que torna o draft possível, porque elo muda todo dia
            e um sorteio em que o preço muda no meio não é sorteio. Data-âncora combinada:{" "}
            {dataCongelamento}.
          </>
        }
      >
        <FieldGrid min={150}>
          <Metric
            small
            label="Seriam congelados agora"
            value={analise.semCongelar.length}
            detail="aprovados sem elo fixo"
          />
          <Metric small label="Já congelados" value={analise.jaCongelados} detail="preço fixo" />
        </FieldGrid>

        {analise.eloIlegivelAprovado.length > 0 ? (
          <Banner tone="danger" title="Corrija os elos antes de congelar">
            O servidor congela uma linha de cada vez e para no primeiro elo que não reconhece — o
            que já passou fica congelado e o resto não. Com {analise.eloIlegivelAprovado.length}{" "}
            {analise.eloIlegivelAprovado.length === 1 ? "ficha aprovada" : "fichas aprovadas"} nesse
            estado, o botão fica travado de propósito.
          </Banner>
        ) : null}

        {analise.aprovados.length === 0 ? (
          <p style={nota}>Não há aprovados: não existe nada para congelar ainda.</p>
        ) : analise.semCongelar.length === 0 ? (
          <p style={nota}>
            Todos os {analise.aprovados.length} aprovados já estão com elo congelado. Quem for aprovado
            depois entra sem congelamento e exige rodar isto de novo.
          </p>
        ) : (
          <>
            <Check
              tone="danger"
              checked={confirmaCongelar}
              disabled={!podeConferir || ocupado || analise.eloIlegivelAprovado.length > 0}
              onChange={setConfirmaCongelar}
            >
              Entendo que isto fixa o preço de {analise.semCongelar.length}{" "}
              {analise.semCongelar.length === 1 ? "pessoa" : "pessoas"} e que não há botão para
              descongelar — desfazer exige mexer no banco, linha por linha.
            </Check>

            <div>
              <Button
                tone="danger"
                fullWidth={compacto}
                disabled={
                  !podeConferir || ocupado || !confirmaCongelar || analise.eloIlegivelAprovado.length > 0
                }
                title={
                  !podeConferir
                    ? SEM_ESCOPO
                    : analise.eloIlegivelAprovado.length > 0
                      ? "Há elo não reconhecido entre os aprovados."
                      : confirmaCongelar
                        ? "Congela agora."
                        : "Marque a confirmação acima."
                }
                onClick={() => void congelar()}
              >
                {ocupado
                  ? "Congelando…"
                  : `Congelar ${analise.semCongelar.length} ${
                      analise.semCongelar.length === 1 ? "elo" : "elos"
                    }`}
              </Button>
            </div>
          </>
        )}
      </ActionCard>
    </div>
  );
}
