"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";

import type { Inscrito, Pagamento, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
  Banner,
  BlockTitle,
  Button,
  C,
  Card,
  Chip,
  display,
  Empty,
  Field,
  FieldGrid,
  Input,
  Metric,
  ScrollX,
  SectionHead,
  Select,
  tabular,
  Toolbar,
} from "@/components/admin/ui";
import { ESTADOS_PAGAMENTO, ROTULO_PAGAMENTO, type EstadoPagamento } from "@/lib/inscricoes/schema";

/**
 * O caixa da 4ª Edição e a fila de conferência de pagamentos.
 *
 * A separação que governa esta tela: **"declarado" é a palavra do jogador e "pago" é
 * alguém da organização ter aberto o extrato.** São dois fatos diferentes sobre o
 * mundo, e por isso nunca existe um botão só que faça os dois — quem clica em
 * "Confirmar recebido" está afirmando que viu o dinheiro cair, e é o nome dessa
 * pessoa que fica na auditoria.
 */

// ---------------------------------------------------------------- constantes e formatos

const DIA_MS = 86_400_000;

/** Quantos dias antes do vencimento a cobrança já aparece no bloco de prazos. */
const JANELA_DE_AVISO = 7;

const ESCOPO_FALTANDO =
  "Falta o escopo inscricoes:financeiro — você vê o caixa, mas não altera pagamentos.";

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

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function dataCurta(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
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

type Linha = Readonly<{
  pagamento: Pagamento;
  /** `null` quando o pagamento aponta para uma inscrição que sumiu — a tela não quebra por isso. */
  inscrito: Inscrito | null;
  nome: string;
  venceMs: number | null;
}>;

// ---------------------------------------------------------------- seção

export function SecaoPagamentos({ dados, executar, ocupado, podeFinanceiro }: PropsSecao) {
  const { config, panorama, pagamentos, inscritos } = dados;
  const caixa = panorama.caixa;

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
  useEffect(() => {
    const marcar = () => setAgoraMs(Date.now());
    const inicial = window.setTimeout(marcar, 0);
    const cadencia = window.setInterval(marcar, 60_000);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(cadencia);
    };
  }, []);

  const [filtro, setFiltro] = useState<EstadoPagamento | "todos">("todos");
  const [rascunhoObs, setRascunhoObs] = useState<Record<string, string>>({});

  const travado = !podeFinanceiro || ocupado;
  const motivo = podeFinanceiro ? undefined : ESCOPO_FALTANDO;

  const fichaDe = useMemo(() => {
    const mapa = new Map<string, Inscrito>();
    for (const i of inscritos) mapa.set(i.id, i);
    return mapa;
  }, [inscritos]);

  const linhas = useMemo<Linha[]>(() => {
    const lista = pagamentos.map((pagamento) => {
      const inscrito = fichaDe.get(pagamento.inscricao_id) ?? null;
      return {
        pagamento,
        inscrito,
        // Sem ficha casada, o id truncado ainda permite achar a linha no banco.
        nome: inscrito ? `${inscrito.nick}#${inscrito.tag}` : `inscrição ${pagamento.inscricao_id.slice(0, 8)}`,
        venceMs: emMs(pagamento.vence_em),
      };
    });
    return lista.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [pagamentos, fichaDe]);

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
      // `ceil` de propósito: faltando 3 horas, o texto certo é "vence em 1 dia", não "0".
      const dias = Math.ceil((linha.venceMs - agoraMs) / DIA_MS);
      if (dias <= JANELA_DE_AVISO) fora.push({ linha, dias });
    }
    return fora.sort((a, b) => a.dias - b.dias);
  }, [linhas, agoraMs]);

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
   * O estorno NÃO é descontado de novo aqui.
   *
   * Os estados são exclusivos: quem foi estornado deixou de ser "pago", então
   * `arrecadado` (a soma dos "pago") já está limpo. Uma versão anterior fazia
   * `arrecadado - estornado` e mostrava R$ 160 onde havia R$ 180 — descontava o mesmo
   * dinheiro duas vezes. A identidade que fecha é a de baixo, e ela é conferida na tela.
   */
  const identidade = caixa.recebido - caixa.estornado - caixa.aDevolver;
  const caixaFecha = identidade === caixa.arrecadado;
  const premiacao = Math.round((caixa.arrecadado * config.pct_campeao) / 100);

  const salvar = async (inscricaoId: string, estado: EstadoPagamento) => {
    const obs = (rascunhoObs[inscricaoId] ?? "").trim();
    // O servidor grava `observacao ?? null`: mandar vazio APAGA a observação anterior.
    // Por isso o campo só viaja quando alguém realmente digitou alguma coisa.
    const ok = await executar("pagamento", {
      inscricaoId,
      estado,
      observacao: obs.length > 0 ? obs : undefined,
    });
    if (!ok) return;
    setRascunhoObs((atual) => {
      const proximo = { ...atual };
      delete proximo[inscricaoId];
      return proximo;
    });
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

      <Toolbar style={{ marginBottom: 16 }}>
        <Chip tone="gold">taxa {moeda(config.taxa_centavos)}</Chip>
        <Chip>prazo de {plural(config.prazo_pagamento_dias, "dia", "dias")}</Chip>
        <Chip title="Chave usada no PIX da inscrição.">
          PIX: {config.chave_pix ?? "a definir"}
        </Chip>
        <Chip>responsável: {config.responsavel_financeiro ?? "a definir"}</Chip>
      </Toolbar>

      {!podeFinanceiro ? (
        <Banner tone="warn" title="Você está vendo o caixa, mas não pode mexer nele">
          {ESCOPO_FALTANDO} Os controles abaixo aparecem desligados de propósito: esconder o número
          não protege ninguém, e oferecer um botão que devolve 403 só faz perder tempo.
        </Banner>
      ) : null}

      {!caixaFecha ? (
        <Banner tone="danger" title="O caixa não fecha">
          recebido − estornado − a devolver dá {moeda(identidade)}, mas o arrecadado está em{" "}
          {moeda(caixa.arrecadado)}. Enquanto os dois discordarem, não use nenhum dos dois para
          prometer premiação — avise quem cuida do financeiro.
        </Banner>
      ) : null}

      {/* ------------------------------------------------------------ caixa */}

      <BlockTitle>O caixa</BlockTitle>

      <FieldGrid min={190}>
        <Metric
          label="Arrecadado"
          value={moeda(caixa.arrecadado)}
          detail="da organização — é este que vira premiação"
        />
        <Metric
          label={`Premiação do campeão (${config.pct_campeao}%)`}
          value={moeda(premiacao)}
          detail={`${100 - config.pct_campeao}% ficam com a organização`}
        />
        <Metric label="Em caixa" value={moeda(caixa.emCaixa)} detail="recebido − estornado" />
        <Metric label="A receber" value={moeda(caixa.aReceber)} detail="aguardando + declarado" />
      </FieldGrid>

      <FieldGrid min={150} style={{ marginTop: 12 }}>
        <Metric small label="Recebido (bruto)" value={moeda(caixa.recebido)} detail="tudo que um dia entrou" />
        <Metric small label="Estornado" value={moeda(caixa.estornado)} detail="já devolvido" />
        <Metric small label="A devolver" value={moeda(caixa.aDevolver)} detail="na conta, mas comprometido" />
        <Metric small label="Isento" value={moeda(caixa.isento)} detail="organizadores (regra w)" />
      </FieldGrid>

      <Card padding="14px 16px" style={{ marginTop: 12 }}>
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
          A conta que precisa fechar:{" "}
          <span style={{ color: C.ink, ...tabular }}>
            {moeda(caixa.recebido)} − {moeda(caixa.estornado)} − {moeda(caixa.aDevolver)} ={" "}
            <strong style={{ color: caixaFecha ? C.okSoft : C.dangerSoft }}>
              {moeda(caixa.arrecadado)}
            </strong>
          </span>
          .
        </p>
        <p style={{ margin: "6px 0 0", fontSize: 12, color: C.ink4, lineHeight: 1.7 }}>
          O estorno sai da conta UMA vez. Quem foi estornado já deixou de ser &ldquo;pago&rdquo;, então
          o arrecadado nunca desconta o estorno de novo. O isento não entra em nenhum lado: esse
          dinheiro nunca existiu.
        </p>
      </Card>

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
                  {inscrito ? (
                    <Chip tone={inscrito.situacao === "apto" ? "ok" : "neutro"}>{inscrito.situacao}</Chip>
                  ) : (
                    <Chip tone="danger" title="O pagamento aponta para uma inscrição que não veio na lista.">
                      sem ficha
                    </Chip>
                  )}
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
                      onClick={() => void salvar(id, "pago")}
                    >
                      Confirmar recebido
                    </Button>
                    <Button
                      tone="danger"
                      disabled={travado}
                      title={motivo ?? "Volta para aguardando: o jogador declarou, mas não achei no extrato."}
                      onClick={() => void salvar(id, "aguardando")}
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
        {plural(JANELA_DE_AVISO, "dia", "dias")} ou já venceu. O prazo é de{" "}
        {plural(config.prazo_pagamento_dias, "dia", "dias")} a partir da inscrição. Vencido não é
        recusado: é hora de cobrar no grupo.
      </p>

      {agoraMs === null ? (
        <p style={{ margin: 0, fontSize: 12.5, color: C.ink4 }}>Calculando os prazos…</p>
      ) : prazos.length === 0 ? (
        <Empty title="Nenhum prazo estourando">
          Ninguém em &ldquo;aguardando&rdquo; vence nos próximos {plural(JANELA_DE_AVISO, "dia", "dias")}.
        </Empty>
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
              </tr>
            </thead>
            <tbody>
              {prazos.map(({ linha, dias }) => {
                const vencido = dias < 0;
                return (
                  <tr key={linha.pagamento.inscricao_id}>
                    <td style={{ ...td, color: C.ink }}>{linha.nome}</td>
                    <td style={{ ...td, textAlign: "right" }}>{moeda(linha.pagamento.valor_centavos)}</td>
                    <td style={td}>{dataCurta(linha.pagamento.vence_em)}</td>
                    <td style={td}>
                      <Chip tone={vencido ? "danger" : dias <= 2 ? "warn" : "neutro"}>
                        {vencido
                          ? `vencido há ${plural(Math.abs(dias), "dia", "dias")}`
                          : dias === 0
                            ? "vence hoje"
                            : `vence em ${plural(dias, "dia", "dias")}`}
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollX>
      )}

      {/* ------------------------------------------------------------ estornos */}

      <BlockTitle right={<Chip tone={aDevolver.length > 0 ? "warn" : "neutro"}>{aDevolver.length} a fazer</Chip>}>
        Estornos
      </BlockTitle>

      <p style={{ margin: "0 0 12px", fontSize: 12.5, color: C.ink3, lineHeight: 1.7 }}>
        Isto existe porque as regras (d) colocação concluída e (e) atividade ranqueada recente só
        são verificáveis perto do início: alguém aprovado em setembro pode ser recusado em outubro
        já tendo pago — e recebe o dinheiro de volta.
      </p>

      <FieldGrid min={300}>
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
                  <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: C.ink }}>{nome}</span>
                  <span style={{ fontSize: 13, color: C.warnSoft, ...tabular }}>
                    {moeda(pagamento.valor_centavos)}
                  </span>
                  <Button
                    small
                    tone="gold"
                    disabled={travado}
                    title={motivo ?? "Marque só depois de o PIX de volta ter saído."}
                    onClick={() => void salvar(pagamento.inscricao_id, "estornado")}
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
                  <span style={{ flex: 1, minWidth: 130, fontSize: 13, color: C.ink2 }}>{nome}</span>
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

      {/* ------------------------------------------------------------ todos */}

      <BlockTitle right={<Chip>{visiveis.length} de {linhas.length}</Chip>}>Todos os pagamentos</BlockTitle>

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

      {visiveis.length === 0 ? (
        <Empty title="Nada neste filtro">
          Nenhum pagamento está em{" "}
          {filtro === "todos" ? "nenhum estado" : `“${ROTULO_PAGAMENTO[filtro]}”`} agora.
        </Empty>
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
              {visiveis.map(({ pagamento, inscrito, nome }) => {
                const id = pagamento.inscricao_id;
                return (
                  <tr key={id}>
                    <td style={{ ...td, color: C.ink }}>
                      {nome}
                      {inscrito?.organizador ? (
                        <span style={{ marginLeft: 8 }}>
                          <Chip tone="gold" title="Organizador: isento da taxa pela regra (w).">
                            organização
                          </Chip>
                        </span>
                      ) : null}
                    </td>
                    <td style={td}>
                      {inscrito ? (
                        <Chip tone={inscrito.situacao === "apto" ? "ok" : inscrito.situacao === "recusado" ? "danger" : "neutro"}>
                          {inscrito.situacao}
                        </Chip>
                      ) : (
                        <Chip tone="danger" title="Pagamento sem ficha correspondente na lista de inscritos.">
                          sem ficha
                        </Chip>
                      )}
                    </td>
                    <td style={td}>
                      <Chip tone={TOM_DO_ESTADO[pagamento.estado]}>{ROTULO_PAGAMENTO[pagamento.estado]}</Chip>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: C.bronzeLit }}>
                      {moeda(pagamento.valor_centavos)}
                    </td>
                    <td style={td}>{dataHora(pagamento.declarado_em)}</td>
                    <td style={td}>{dataCurta(pagamento.vence_em)}</td>
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
                      {/* Sem diálogo de confirmação: toda transição aqui é reversível e fica na
                          auditoria com autor e hora. O que exige cuidado — dizer que o dinheiro
                          entrou — tem botão próprio lá em cima, não um item de lista. */}
                      <Select
                        value={pagamento.estado}
                        disabled={travado}
                        ariaLabel={`Estado do pagamento de ${nome}`}
                        onChange={(v) => {
                          const proximo = comoEstado(v);
                          if (proximo && proximo !== pagamento.estado) void salvar(id, proximo);
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
    </div>
  );
}
