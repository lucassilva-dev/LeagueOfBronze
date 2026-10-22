"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { UserRoundSearch } from "lucide-react";

import { EloPorRota } from "@/components/admin/e4/elo-por-rota";
import type { Inscrito, PropsSecao } from "@/components/admin/e4/painel-edicao";
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
import { contaParaTimes, distribuirTimes, viabilidadeDeOrcamento } from "@/lib/inscricoes/schema";

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
 * No celular a conta é a mesma e o arranjo é de bolso: as quatro tabelas (elos, sobra,
 * substitutos, rotas) viram listas de cartões com o emblema do elo ou o ícone da rota à
 * esquerda — tabela de 620px num telefone obrigava a rolar de lado para achar o botão
 * "Voltar para apto". No monitor as tabelas continuam, só com o emblema no lugar do nome
 * do elo e o ícone da rota no lugar da bolinha de cor.
 *
 * O quadro de elo por rota (`elo-por-rota.tsx`) é a única peça daqui feita para SAIR do
 * painel — a organização tira print e manda no grupo. Por isso ele recebe só nick, elo de
 * preço e rotas: os pontos nem chegam até ele.
 */

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

function porPontosDesc(a: Inscrito, b: Inscrito) {
  return b.pontos - a.pontos || a.nick.localeCompare(b.nick, "pt-BR");
}

/** Só para o <select> do substituto: opção nativa não mostra imagem, então o nome vai escrito. */
function rotuloElo(inscrito: Inscrito): string {
  return resolveElo(eloDePreco(inscrito))?.label ?? eloDePreco(inscrito);
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
  fim,
  children,
}: Readonly<{ inscrito: Inscrito; fim?: ReactNode; children?: ReactNode }>) {
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
            <span style={tabular}>
              {inscrito.pontos} {inscrito.pontos === 1 ? "ponto" : "pontos"}
            </span>
          </span>
        }
        fim={fim}
      >
        {children}
      </CartaoLinha>
    </li>
  );
}

/**
 * Distribuição de elos no celular: uma linha por elo, emblema · barra · quantas pessoas.
 * A tabela de cinco colunas não cabia; preço e soma descem para a linha miúda da barra.
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
              <span style={{ display: "block", marginTop: 6, fontSize: 11.5, color: C.ink4, ...tabular }}>
                {meta.pts} {meta.pts === 1 ? "ponto" : "pontos"} cada · soma {quantidade * meta.pts}
              </span>
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
  const { config, inscritos, panorama } = dados;
  const [alvoId, setAlvoId] = useState("");
  const [confirmaCongelar, setConfirmaCongelar] = useState(false);

  const jogadoresPorTime = config.jogadores_por_time;
  // `distribuirTimes` lança com jogadoresPorTime ≤ 0. Um valor estragado no banco
  // derrubaria a aba inteira em branco; aqui a conta é pulada e o problema aparece.
  const configValida = Number.isInteger(jogadoresPorTime) && jogadoresPorTime > 0;

  const analise = useMemo(() => {
    // A conta: todo mundo que ainda pode jogar, igual ao servidor (`panorama`). `filter`
    // já devolve array novo, então o `sort` não mexe na lista que veio por prop.
    const pool = inscritos.filter((i) => contaParaTimes(i.situacao)).sort(porPontosDesc);
    // O definitivo: aprovado = apto + sobra, o mesmo pool que o servidor congela.
    const aprovados = pool.filter((i) => i.situacao === "apto" || i.situacao === "sobra");

    const marcadosSobra = aprovados.filter((i) => i.situacao === "sobra");
    const semCongelar = aprovados.filter((i) => i.elo_congelado === null);
    // Mesmo `resolveElo` que o servidor usa: se ele não reconhece, `congelarElos`
    // estoura no meio do laço — e o que já passou fica congelado. Ver o cartão final.
    const eloIlegivel = pool.filter((i) => resolveElo(eloDePreco(i)) === null);
    const eloIlegivelAprovado = eloIlegivel.filter((i) => i.situacao === "apto" || i.situacao === "sobra");

    const viabilidade = configValida
      ? viabilidadeDeOrcamento(
          pool.map((i) => i.pontos),
          jogadoresPorTime,
          config.orcamento_por_time,
          config.max_times ?? null,
        )
      : null;

    const totalDoPool = pool.reduce((soma, i) => soma + i.pontos, 0);

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
      marcadosSobra,
      semCongelar,
      jaCongelados: aprovados.length - semCongelar.length,
      eloIlegivel,
      eloIlegivelAprovado,
      viabilidade,
      totalDoPool,
      porElo,
      maiorGrupo,
      rotas,
      escassa,
    };
  }, [inscritos, jogadoresPorTime, config.orcamento_por_time, config.max_times, configValida]);

  const alvo = analise.aprovados.find((i) => i.id === alvoId) ?? null;

  /** Regra (g): substituto do mesmo elo ou abaixo. Pontos são o preço do elo. */
  const substitutos = useMemo(
    () => (alvo ? analise.aprovados.filter((i) => i.id !== alvo.id && i.pontos <= alvo.pontos) : []),
    [alvo, analise.aprovados],
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

  const mudarSituacao = (inscrito: Inscrito, situacao: "apto" | "sobra") => {
    // Com a situação que esta tela mostrava: se outra pessoa mudou antes (recusou, segurou),
    // o servidor responde 409 sem gravar e a tela recarrega com o valor de agora.
    void executar("ficha", { inscricaoId: inscrito.id, situacao, situacaoAnterior: inscrito.situacao });
  };

  const v = analise.viabilidade;
  const apertado = v !== null && v.cabe && v.times > 0 && v.folga <= v.times;

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Times e viabilidade"
        description="A conta que decide se o draft é possível: quantos times fecham (contando todo inscrito que não foi recusado nem desistiu), se os pontos cabem no orçamento, quem sobrou e quem pode substituir quem."
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
              Os {config.max_times} times já fecham. Quem entrar a mais vira reserva (sobra) — a
              organização escolhe quem fica de fora antes do sorteio.
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
            ? `Esta edição tem teto de ${config.max_times} times (${config.max_times * jogadoresPorTime} vagas): quem passar disso vira reserva (sobra). Até lá, o número de times acompanha os elegíveis — todo inscrito, menos quem foi recusado ou desistiu. Pendente já conta.`
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

      {/* ---------------------------------------------------- 2. viabilidade de orçamento */}

      <BlockTitle right={<Chip>{config.orcamento_por_time} pontos por time</Chip>}>
        Cabe no orçamento?
      </BlockTitle>

      {v === null ? (
        <Banner tone="warn" title="Sem conta de orçamento">
          Corrija os jogadores por time para esta conta voltar.
        </Banner>
      ) : v.times === 0 ? (
        <Banner tone="warn" title="Ainda não dá para avaliar">
          Sem nenhum time fechado não existe teto para comparar — o teto é times ×{" "}
          {config.orcamento_por_time}, e times é zero. A resposta aparece quando o primeiro time
          fechar.
        </Banner>
      ) : v.cabe ? (
        <Banner
          tone={apertado ? "warn" : "ok"}
          title={apertado ? "Cabe, mas sem folga nenhuma" : "Cabe no orçamento"}
        >
          Os {v.vagas} que entram somam {v.total} pontos contra um teto de {v.teto} ({v.times} times
          × {config.orcamento_por_time}). Folga de {v.folga}{" "}
          {v.folga === 1 ? "ponto" : "pontos"} no total
          {apertado ? " — menos de um ponto por time, qualquer troca de elo derruba a conta." : "."}
        </Banner>
      ) : (
        <Banner tone="danger" title="Os pontos não cabem no teto">
          Os {v.vagas} que entram somam {v.total} pontos e o teto é {v.teto}: passa em{" "}
          {Math.abs(v.folga)}. Três saídas: aceitar gente de elo mais baixo, subir o orçamento por
          time na aba Configuração, ou tirar alguém de elo alto do pool (recusa/desistência — marcar
          como sobra não muda esta conta). Atenção: ela já monta o cenário mais barato possível,
          deixando os mais caros de fora, então se não cabe assim não cabe com nenhuma escolha de
          quem entra.
        </Banner>
      )}

      {v !== null ? (
        <>
          <FieldGrid min={150}>
            <Metric label="Pontos que entram" value={v.total} detail={`os ${v.vagas} mais baratos`} />
            <Metric
              label="Teto total"
              value={v.teto}
              detail={`${v.times} × ${config.orcamento_por_time}`}
            />
            <Metric
              label="Folga"
              value={v.cabe ? v.folga : `−${Math.abs(v.folga)}`}
              detail={v.cabe ? "sobra de pontos" : "estouro"}
            />
            <Metric
              label="Média por time"
              value={v.times > 0 ? (v.total / v.times).toFixed(1) : "—"}
              detail={`de ${config.orcamento_por_time} disponíveis`}
            />
          </FieldGrid>

          <Card padding="14px 16px" style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <p style={nota}>
              O pool inteiro soma {analise.totalDoPool} pontos; a conta usa {v.total}, dos {v.vagas}{" "}
              mais baratos, porque a sobra fica de fora dos times.
            </p>
            <p style={{ ...nota, color: C.warnSoft }}>
              Indicador, não garantia: a soma é do pool inteiro contra o teto TOTAL. Caber no total
              não prova que dê para montar cada elenco — com muita gente de elo alto, um time
              específico ainda pode estourar os {config.orcamento_por_time} pontos dele. Quem
              confirma isso é o sorteio.
            </p>
          </Card>

          <BlockTitle>Distribuição de elos dos elegíveis</BlockTitle>

          {analise.porElo.length === 0 ? (
            <Empty title="Ninguém na conta ainda">
              A distribuição aparece com a primeira inscrição que não foi recusada.
            </Empty>
          ) : compacto ? (
            <DistribuicaoCompacta linhas={analise.porElo} maiorGrupo={analise.maiorGrupo} />
          ) : (
            <ScrollX>
              <table style={{ width: "100%", minWidth: 460, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th scope="col" style={th}>
                      Elo
                    </th>
                    <th scope="col" style={{ ...th, textAlign: "right" }}>
                      Preço
                    </th>
                    <th scope="col" style={{ ...th, textAlign: "right" }}>
                      Pessoas
                    </th>
                    <th scope="col" style={{ ...th, width: "100%" }}>
                      Proporção
                    </th>
                    <th scope="col" style={{ ...th, textAlign: "right" }}>
                      Soma
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analise.porElo.map(({ meta, quantidade }) => (
                    <tr key={meta.key}>
                      <td style={td}>
                        <Elo elo={meta.label} tamanho={24} />
                      </td>
                      <td style={tdNum}>{meta.pts}</td>
                      <td style={tdNum}>{quantidade}</td>
                      <td style={{ ...td, width: "100%" }}>
                        <BarraDeProporcao
                          cor={meta.color}
                          fracao={analise.maiorGrupo > 0 ? quantidade / analise.maiorGrupo : 0}
                          style={{ minWidth: 80 }}
                        />
                      </td>
                      <td style={tdNum}>{quantidade * meta.pts}</td>
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
                Ficam fora da distribuição
                {analise.eloIlegivelAprovado.length > 0
                  ? ", e o congelamento não roda enquanto as aprovadas não forem corrigidas na ficha."
                  : "; corrija na ficha antes de aprovar."}
              </Banner>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------------- 2b. elo por rota */}

      <BlockTitle>Elo por rota</BlockTitle>

      <EloPorRota jogadores={analise.jogadoresDoQuadro} times={panorama.times} />

      {/* ---------------------------------------------------------------- 3. sobra */}

      <BlockTitle
        right={
          <Chip tone="warn" title="Situação gravada na ficha">
            {analise.marcadosSobra.length}{" "}
            {analise.marcadosSobra.length === 1 ? "marcado" : "marcados"}
          </Chip>
        }
      >
        Quem sobrou
      </BlockTitle>

      <Card padding="14px 16px" style={{ marginBottom: 12, display: "grid", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.6 }}>
          Isto NÃO é fila com ordem. Não há posição, prioridade nem antiguidade: quem entra no lugar
          de quem sai é decidido na conversa do grupo, pela organização.
        </p>
        <p style={nota}>
          A divisão diz que {panorama.sobra}{" "}
          {panorama.sobra === 1 ? "pessoa fica" : "pessoas ficam"} de fora; {analise.marcadosSobra.length}{" "}
          {analise.marcadosSobra.length === 1 ? "está marcada" : "estão marcadas"} como sobra na
          ficha. São coisas diferentes — a primeira é o resto da divisão, a segunda é quem já foi
          avisado. Marcar alguém como sobra não muda a divisão: sobra continua na conta, senão o
          número de times mudaria sozinho a cada marcação.
        </p>
        {draftHoje ? (
          <p style={{ ...nota, color: C.warnSoft }}>
            Esse resto ainda conta {panorama.pendentes}{" "}
            {panorama.pendentes === 1 ? "pendente" : "pendentes"}: não marque ninguém como sobra antes
            de conferir todo mundo, senão o número de quem fica de fora muda e alguém é avisado à
            toa. Só com os aprovados de hoje, o draft pediria {draftHoje.sobra} na sobra.
          </p>
        ) : null}
      </Card>

      {analise.marcadosSobra.length === 0 ? (
        <Empty title="Ninguém marcado como sobra">
          Quando a organização decidir quem fica de fora, marque a situação na aba Inscritos — aqui
          a lista serve para revisar e desfazer.
        </Empty>
      ) : compacto ? (
        // No celular o botão desce para a largura inteira do cartão: na tabela ele era a
        // última coluna, a que mais se perdia fora da tela.
        <ul style={listaDeCartoes}>
          {analise.marcadosSobra.map((i) => (
            <CartaoDoAprovado key={i.id} inscrito={i}>
              <Button
                small
                fullWidth
                disabled={!podeConferir || ocupado}
                title={podeConferir ? "Devolve a situação para apto." : SEM_ESCOPO}
                onClick={() => mudarSituacao(i, "apto")}
              >
                Voltar para apto
              </Button>
            </CartaoDoAprovado>
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
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {analise.marcadosSobra.map((i) => (
                <tr key={i.id}>
                  <td style={{ ...td, width: "100%" }}>
                    <CelulaJogador inscrito={i} />
                  </td>
                  <td style={td}>
                    <Elo elo={eloDePreco(i)} tamanho={24} />
                  </td>
                  <td style={tdNum}>{i.pontos}</td>
                  <td style={td}>
                    <CelulaRota rota={i.rota_primaria} />
                  </td>
                  <td style={td}>
                    <CelulaRota rota={i.rota_secundaria} />
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <Button
                      small
                      disabled={!podeConferir || ocupado}
                      title={podeConferir ? "Devolve a situação para apto." : SEM_ESCOPO}
                      onClick={() => mudarSituacao(i, "apto")}
                    >
                      Voltar para apto
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* ---------------------------------------------------------- 4. substituição */}

      <BlockTitle right={<Chip>regra 6</Chip>}>Quem pode substituir</BlockTitle>

      <Card padding={compacto ? "14px 14px" : "16px 18px"} style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>
          O substituto tem de valer o mesmo ou menos em pontos — acima disso, só com aprovação da
          organização. Ele também precisa cumprir as regras 3, 4, 5 e 21, e ninguém é obrigado a
          aceitar. Consulta pura: nada aqui grava nada.
        </p>

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
                    {i.nick}#{i.tag} — {rotuloElo(i)} · {i.pontos} pt
                  </option>
                ))}
            </Select>
          </span>
        </Field>

        {alvo === null ? (
          <p style={nota}>
            Escolha alguém para ver quem, dentre os aprovados, pode entrar no lugar dele.
          </p>
        ) : substitutos.length === 0 ? (
          <Empty title="Nenhum aprovado serve">
            {alvo.nick} é o aprovado mais barato ({alvo.pontos}{" "}
            {alvo.pontos === 1 ? "ponto" : "pontos"}), então não há aprovado de elo igual ou
            inferior para substituí-lo. Pendentes não entram nesta lista: confira-os primeiro.
          </Empty>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2, lineHeight: 1.7 }}>
              {substitutos.length}{" "}
              {substitutos.length === 1 ? "aprovado pode" : "aprovados podem"} entrar no lugar de{" "}
              <strong style={{ color: C.bronzeLit }}>{alvo.nick}</strong> — pontos ≤ {alvo.pontos}{" "}
              <Elo elo={eloDePreco(alvo)} tamanho={18} />.
            </p>
            {compacto ? (
              <ul style={listaDeCartoes}>
                {substitutos.map((i) => (
                  <CartaoDoAprovado
                    key={i.id}
                    inscrito={i}
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
                        <td style={tdNum}>{i.pontos}</td>
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
            Fixa o elo — e portanto o preço em pontos — de todos os aprovados que ainda não têm elo
            congelado. Usa o elo verificado, ou o declarado quando não houver verificação. Depois
            disto o preço para de acompanhar o elo real: é o que torna o draft possível, porque elo
            muda todo dia e um sorteio em que o preço muda no meio não é sorteio. Data-âncora
            combinada: {dataCongelamento}.
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
