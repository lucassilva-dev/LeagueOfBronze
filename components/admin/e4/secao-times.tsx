"use client";

import { useMemo, useState, type CSSProperties } from "react";

import type { Inscrito, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
  ActionCard,
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  Check,
  Chip,
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
import { ELO_ORDER, resolveElo, resolveRole } from "@/lib/design";
import { viabilidadeDeOrcamento } from "@/lib/inscricoes/schema";

/**
 * A conta que decide se o draft é possível.
 *
 * A tela inteira gira em torno de uma distinção que já confundiu a organização por
 * escrito: existem DUAS coisas chamadas "sobra". Uma é o resto da divisão
 * (`panorama.sobra`, aprovados − vagas), a outra é a situação "sobra" gravada na ficha
 * de quem a organização já avisou que ficou de fora. Marcar alguém de sobra não muda a
 * divisão — sobra continua contando como aprovado no servidor, de propósito, senão o
 * número de times se moveria sozinho a cada marcação. Os dois números aparecem lado a
 * lado, nomeados, em vez de um só que finge ser os dois.
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

function rotuloElo(inscrito: Inscrito): string {
  return resolveElo(eloDePreco(inscrito))?.label ?? eloDePreco(inscrito);
}

function corElo(inscrito: Inscrito): string {
  return resolveElo(eloDePreco(inscrito))?.color ?? C.ink4;
}

/** Data-âncora só como informação. Data nula é estado legítimo, nunca um veredicto. */
function formatarData(iso: string | null): string {
  if (!iso) return "a definir";
  const quando = new Date(iso);
  return Number.isNaN(quando.getTime())
    ? "data inválida"
    : quando.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function Bolinha({ cor }: Readonly<{ cor: string }>) {
  return (
    <span
      aria-hidden
      style={{ width: 7, height: 7, borderRadius: 999, background: cor, flexShrink: 0 }}
    />
  );
}

function CelulaJogador({ inscrito }: Readonly<{ inscrito: Inscrito }>) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <Bolinha cor={corElo(inscrito)} />
      <span style={{ color: C.ink, fontWeight: 600 }}>{inscrito.nick}</span>
      <span style={{ color: C.ink4, fontSize: 11.5 }}>#{inscrito.tag}</span>
    </span>
  );
}

function CelulaRota({ rota }: Readonly<{ rota: string }>) {
  const meta = resolveRole(rota);
  return <span style={{ color: meta.color, fontSize: 12 }}>{meta.label}</span>;
}

// ---------------------------------------------------------------- seção

export function SecaoTimes({ dados, executar, ocupado, podeConferir }: PropsSecao) {
  const { config, inscritos, panorama } = dados;
  const [alvoId, setAlvoId] = useState("");
  const [confirmaCongelar, setConfirmaCongelar] = useState(false);

  const jogadoresPorTime = config.jogadores_por_time;
  // `distribuirTimes` lança com jogadoresPorTime ≤ 0. Um valor estragado no banco
  // derrubaria a aba inteira em branco; aqui a conta é pulada e o problema aparece.
  const configValida = Number.isInteger(jogadoresPorTime) && jogadoresPorTime > 0;

  const analise = useMemo(() => {
    // Aprovado = apto + sobra, igual ao servidor. `filter` já devolve array novo, então
    // o `sort` não mexe na lista que veio por prop.
    const pool = inscritos
      .filter((i) => i.situacao === "apto" || i.situacao === "sobra")
      .sort(porPontosDesc);

    const marcadosSobra = pool.filter((i) => i.situacao === "sobra");
    const semCongelar = pool.filter((i) => i.elo_congelado === null);
    // Mesmo `resolveElo` que o servidor usa: se ele não reconhece, `congelarElos`
    // estoura no meio do laço — e o que já passou fica congelado. Ver o cartão final.
    const eloIlegivel = pool.filter((i) => resolveElo(eloDePreco(i)) === null);

    const viabilidade = configValida
      ? viabilidadeDeOrcamento(
          pool.map((i) => i.pontos),
          jogadoresPorTime,
          config.orcamento_por_time,
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

    return {
      pool,
      marcadosSobra,
      semCongelar,
      jaCongelados: pool.length - semCongelar.length,
      eloIlegivel,
      viabilidade,
      totalDoPool,
      porElo,
      maiorGrupo,
      rotas,
      escassa,
    };
  }, [inscritos, jogadoresPorTime, config.orcamento_por_time, configValida]);

  const alvo = analise.pool.find((i) => i.id === alvoId) ?? null;

  /** Regra (g): substituto do mesmo elo ou abaixo. Pontos são o preço do elo. */
  const substitutos = useMemo(
    () => (alvo ? analise.pool.filter((i) => i.id !== alvo.id && i.pontos <= alvo.pontos) : []),
    [alvo, analise.pool],
  );

  const dataCongelamento = useMemo(
    () => formatarData(config.congelamento_elo),
    [config.congelamento_elo],
  );

  // `panorama.sobra` é o RESTO da divisão (0 … jogadoresPorTime−1), então isto é
  // sempre quanta gente falta para fechar mais um time — inclusive o primeiro.
  const faltamParaFecharTime = jogadoresPorTime - panorama.sobra;

  const congelar = async () => {
    const deuCerto = await executar("congelar");
    // Só solta a trava se deu certo: numa falha, a pessoa continua a um clique de
    // tentar de novo em vez de remarcar a confirmação.
    if (deuCerto) setConfirmaCongelar(false);
  };

  const mudarSituacao = (inscrito: Inscrito, situacao: "apto" | "sobra") => {
    void executar("ficha", { inscricaoId: inscrito.id, situacao });
  };

  const v = analise.viabilidade;
  const apertado = v !== null && v.cabe && v.times > 0 && v.folga <= v.times;

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Times e viabilidade"
        description="A conta que decide se o draft é possível: quantos times fecham, se os pontos cabem no orçamento, quem sobrou e quem pode substituir quem."
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
        <Metric label="Aprovados" value={panorama.aprovados} detail="apto + sobra" />
        <Metric label="Times" value={panorama.times} detail="fecham com o pool de hoje" />
        <Metric label="Vagas" value={panorama.vagas} detail="entram no draft" />
        <Metric label="Sobrando" value={panorama.sobra} detail="aprovados sem vaga" />
      </FieldGrid>

      <Card padding="14px 16px" style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <p style={{ margin: 0, fontSize: 13, color: C.ink2, ...tabular }}>
          times = piso(aprovados ÷ jogadores por time)
          {configValida ? (
            <>
              {" = piso("}
              {panorama.aprovados} ÷ {jogadoresPorTime}
              {") = "}
              <strong style={{ color: C.bronzeHi, fontFamily: display, fontSize: 16 }}>
                {panorama.times}
              </strong>
            </>
          ) : null}
        </p>

        {configValida ? (
          panorama.times === 0 ? (
            <p style={{ margin: 0, fontSize: 12.5, color: C.warnSoft }}>
              Nenhum time fecha ainda: faltam {faltamParaFecharTime}{" "}
              {faltamParaFecharTime === 1 ? "aprovado" : "aprovados"} para o primeiro.
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2 }}>
              Mais {faltamParaFecharTime}{" "}
              {faltamParaFecharTime === 1 ? "aprovado fecha" : "aprovados fecham"} o{" "}
              {panorama.times + 1}º time.
            </p>
          )
        ) : null}

        <p style={nota}>
          Não existe teto de inscrições nesta edição. A meta é chegar a ~50 pessoas, o que daria 10
          times; enquanto isso, o número de times acompanha quem for aprovado.
        </p>
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

          <BlockTitle>Distribuição de elos dos aprovados</BlockTitle>

          {analise.porElo.length === 0 ? (
            <Empty title="Nenhum aprovado ainda">
              A distribuição aparece quando a conferência começar a aprovar gente.
            </Empty>
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
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <Bolinha cor={meta.color} />
                          {meta.label}
                        </span>
                      </td>
                      <td style={tdNum}>{meta.pts}</td>
                      <td style={tdNum}>{quantidade}</td>
                      <td style={{ ...td, width: "100%" }}>
                        <span
                          aria-hidden
                          style={{
                            display: "block",
                            height: 6,
                            minWidth: 80,
                            borderRadius: 2,
                            background: "rgba(0,0,0,.35)",
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              height: "100%",
                              width: `${analise.maiorGrupo > 0 ? (quantidade / analise.maiorGrupo) * 100 : 0}%`,
                              borderRadius: 2,
                              background: meta.color,
                            }}
                          />
                        </span>
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
                {analise.eloIlegivel.length === 1 ? "aprovado está" : "aprovados estão"} com um elo
                que a tabela do site não resolve (
                {analise.eloIlegivel.map((i) => i.nick).join(", ")}). Esses ficam fora da
                distribuição, e o congelamento não roda enquanto isso não for corrigido na ficha.
              </Banner>
            </div>
          ) : null}
        </>
      ) : null}

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
          avisado. Marcar alguém como sobra não muda a divisão: sobra continua contando como
          aprovado, senão o número de times mudaria sozinho a cada marcação.
        </p>
      </Card>

      {analise.marcadosSobra.length === 0 ? (
        <Empty title="Ninguém marcado como sobra">
          Quando a organização decidir quem fica de fora, marque a situação na aba Inscritos — aqui
          a lista serve para revisar e desfazer.
        </Empty>
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
                  <td style={{ ...td, color: corElo(i) }}>{rotuloElo(i)}</td>
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

      <BlockTitle right={<Chip>regra (g)</Chip>}>Quem pode substituir</BlockTitle>

      <Card padding="16px 18px" style={{ display: "grid", gap: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.6 }}>
          O substituto tem de ser do mesmo elo ou abaixo. A comparação é por pontos, que são o preço
          do elo. Consulta pura: nada aqui grava nada.
        </p>

        <Field label="Jogador a substituir" hint="Só aprovados (apto ou sobra) aparecem na lista.">
          <Select
            value={alvoId}
            onChange={setAlvoId}
            ariaLabel="Jogador a substituir"
            disabled={analise.pool.length === 0}
          >
            <option value="">— escolha um jogador —</option>
            {[...analise.pool]
              .sort((a, b) => a.nick.localeCompare(b.nick, "pt-BR"))
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nick}#{i.tag} — {rotuloElo(i)} · {i.pontos} pt
                </option>
              ))}
          </Select>
        </Field>

        {alvo === null ? (
          <p style={nota}>
            Escolha alguém para ver quem, dentre os aprovados, pode entrar no lugar dele.
          </p>
        ) : substitutos.length === 0 ? (
          <Empty title="Ninguém elegível">
            {alvo.nick} é o mais barato do pool ({alvo.pontos}{" "}
            {alvo.pontos === 1 ? "ponto" : "pontos"}), então não há aprovado de elo igual ou
            inferior para substituí-lo.
          </Empty>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink2 }}>
              {substitutos.length}{" "}
              {substitutos.length === 1 ? "aprovado pode" : "aprovados podem"} entrar no lugar de{" "}
              <strong style={{ color: C.bronzeLit }}>{alvo.nick}</strong> — pontos ≤ {alvo.pontos} (
              {rotuloElo(alvo)}).
            </p>
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
                      <td style={{ ...td, color: corElo(i) }}>{rotuloElo(i)}</td>
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
                      <Bolinha cor={meta.color} />
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
          analise.semCongelar.length === 0 && analise.pool.length > 0 ? (
            <Chip tone="ok">todos congelados</Chip>
          ) : (
            <Chip tone="warn">
              {analise.jaCongelados}/{analise.pool.length} congelados
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

        {analise.eloIlegivel.length > 0 ? (
          <Banner tone="danger" title="Corrija os elos antes de congelar">
            O servidor congela uma linha de cada vez e para no primeiro elo que não reconhece — o
            que já passou fica congelado e o resto não. Com {analise.eloIlegivel.length}{" "}
            {analise.eloIlegivel.length === 1 ? "ficha" : "fichas"} nesse estado, o botão fica
            travado de propósito.
          </Banner>
        ) : null}

        {analise.pool.length === 0 ? (
          <p style={nota}>Não há aprovados: não existe nada para congelar ainda.</p>
        ) : analise.semCongelar.length === 0 ? (
          <p style={nota}>
            Todos os {analise.pool.length} aprovados já estão com elo congelado. Quem for aprovado
            depois entra sem congelamento e exige rodar isto de novo.
          </p>
        ) : (
          <>
            <Check
              tone="danger"
              checked={confirmaCongelar}
              disabled={!podeConferir || ocupado || analise.eloIlegivel.length > 0}
              onChange={setConfirmaCongelar}
            >
              Entendo que isto fixa o preço de {analise.semCongelar.length}{" "}
              {analise.semCongelar.length === 1 ? "pessoa" : "pessoas"} e que não há botão para
              descongelar — desfazer exige mexer no banco, linha por linha.
            </Check>

            <div>
              <Button
                tone="danger"
                disabled={
                  !podeConferir || ocupado || !confirmaCongelar || analise.eloIlegivel.length > 0
                }
                title={
                  !podeConferir
                    ? SEM_ESCOPO
                    : analise.eloIlegivel.length > 0
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
