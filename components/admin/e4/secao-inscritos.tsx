"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";

import type { EdicaoConfig, Inscrito, PropsSecao } from "@/components/admin/e4/painel-edicao";
import {
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
  Input,
  Metric,
  ScrollX,
  SectionHead,
  Select,
  SplitPane,
  Textarea,
  Toolbar,
  display,
  tabular,
} from "@/components/admin/ui";
import { ELO_ORDER, resolveElo, resolveRole } from "@/lib/design";
import { formatDateTimeLabel } from "@/lib/format";
import {
  ESTADOS_CONFERENCIA,
  ITENS_CONFERENCIA,
  REGRA_DO_ITEM,
  type EstadoConferencia,
  type ItemConferencia,
} from "@/lib/inscricoes/schema";

/**
 * Matriz de conferência + ficha do inscrito.
 *
 * É a tela em que a organização passa mais tempo, e a que decide quem joga. Duas
 * decisões governam o desenho:
 *
 * 1. O CRITÉRIO FICA VISÍVEL, NÃO EM TOOLTIP. `REGRA_DO_ITEM[item].detalhe` é escrito
 *    por inteiro dentro de cada bloco. Na 3ª Edição dois organizadores leram o mesmo
 *    requisito de jeitos diferentes (um contava flex como ranqueada, o outro não) e a
 *    discussão só apareceu depois do sorteio. Texto escondido atrás de `title` não é
 *    lido por quem está com pressa.
 *
 * 2. NÃO HÁ TETO DE INSCRIÇÕES. Nada aqui escreve "X de N vagas": o número de times é
 *    derivado (aprovados ÷ jogadores por time) e vem pronto do servidor, no panorama.
 */

// ---------------------------------------------------------------- tabela

const th: CSSProperties = {
  padding: "0 10px 9px",
  fontSize: 9.5,
  fontWeight: 600,
  letterSpacing: ".16em",
  textTransform: "uppercase",
  color: C.ink4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${C.line}`,
};

const td: CSSProperties = {
  padding: "8px 10px",
  fontSize: 12.5,
  color: C.ink2,
  whiteSpace: "nowrap",
  borderBottom: "1px solid rgba(201,138,75,.09)",
};

// ---------------------------------------------------------------- vocabulário

type TomChip = "neutro" | "gold" | "ok" | "warn" | "danger" | "off";

const ROTULO_CONFERENCIA: Record<EstadoConferencia, string> = {
  pendente: "Pendente",
  ok: "Cumpre",
  provisorio: "Provisório",
  risco: "Em risco",
  recusado: "Não cumpre",
  nao_avaliavel: "Não avaliável",
  excecao: "Exceção aberta",
};

/** Versão curta, só para a célula da matriz — a longa vai no `title` e na ficha. */
const ABREV_CONFERENCIA: Record<EstadoConferencia, string> = {
  pendente: "—",
  ok: "ok",
  provisorio: "prov",
  risco: "risco",
  recusado: "não",
  nao_avaliavel: "n/a",
  excecao: "exc",
};

/**
 * "excecao" pinta de verde junto com "ok" porque as duas liberam o jogador; a diferença
 * é o motivo, que fica escrito na observação. "provisorio" e "risco" dividem o âmbar:
 * ambas significam "entra, mas alguém precisa voltar aqui".
 */
const TOM_CONFERENCIA: Record<EstadoConferencia, TomChip> = {
  pendente: "neutro",
  ok: "ok",
  provisorio: "warn",
  risco: "warn",
  recusado: "danger",
  nao_avaliavel: "off",
  excecao: "ok",
};

const SITUACOES = ["pendente", "apto", "recusado", "desistiu", "sobra"] as const;

const ROTULO_SITUACAO: Record<Inscrito["situacao"], string> = {
  pendente: "Pendente",
  apto: "Apto",
  recusado: "Recusado",
  desistiu: "Desistiu",
  sobra: "Sobra",
};

const TOM_SITUACAO: Record<Inscrito["situacao"], TomChip> = {
  pendente: "neutro",
  apto: "ok",
  recusado: "danger",
  desistiu: "off",
  sobra: "warn",
};

/**
 * Itens cujo veredicto depende de uma data-âncora que pode não existir ainda.
 *
 * Enquanto a data for nula o item é "não avaliável", nunca "não cumpre" — a organização
 * ainda não decidiu quando é o campeonato, e reprovar alguém por isso seria reprovar
 * pela nossa indecisão. Os outros quatro itens (b, d, f, m) se avaliam a qualquer hora.
 */
const ANCORA_DO_ITEM: Partial<
  Record<ItemConferencia, Readonly<{ campo: "abertura_inscricoes" | "inicio_campeonato"; texto: string }>>
> = {
  a: { campo: "abertura_inscricoes", texto: "a data de abertura das inscrições" },
  e: { campo: "inicio_campeonato", texto: "a data de início do campeonato" },
};

const SEM_ESCOPO = "Falta o escopo inscricoes:conferir para editar.";

// ---------------------------------------------------------------- conversões

/** Linha ausente = item nunca tocado, que é exatamente "pendente". */
function comoEstado(valor: string | undefined): EstadoConferencia {
  return ESTADOS_CONFERENCIA.find((e) => e === valor) ?? "pendente";
}

function comoSituacao(valor: string): Inscrito["situacao"] {
  return SITUACOES.find((s) => s === valor) ?? "pendente";
}

/**
 * Data do Postgres (`AAAA-MM-DD`) formatada sem passar por `Date`.
 *
 * Construir um `Date` a partir de "2026-09-01" produz meia-noite em UTC, que no fuso de
 * Brasília volta um dia — a tela mostrava 31/08 para quem entrou no grupo em 01/09.
 */
function diaBR(valor: string | null): string {
  if (!valor) return "—";
  const [ano, mes, dia] = valor.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
}

/**
 * Qual elo mostrar e de onde ele veio.
 *
 * A ordem é congelado > verificado > declarado, e a origem vai junto na tela: os três
 * podem discordar, e "Ouro" sem dizer quem afirmou isso é informação pela metade.
 */
function eloExibido(inscrito: Inscrito) {
  const bruto = inscrito.elo_congelado ?? inscrito.elo_verificado ?? inscrito.elo_declarado;
  const origem = inscrito.elo_congelado
    ? "congelado"
    : inscrito.elo_verificado
      ? "verificado"
      : "declarado";
  const meta = resolveElo(bruto);
  return { rotulo: meta?.label ?? bruto, cor: meta?.color ?? C.ink3, origem };
}

function rotasDoInscrito(inscrito: Inscrito) {
  const primaria = resolveRole(inscrito.rota_primaria);
  const secundaria = resolveRole(inscrito.rota_secundaria);
  return {
    curto: `${primaria.short} · ${secundaria.short}`,
    longo: `Primária ${primaria.label}, secundária ${secundaria.label}`,
  };
}

// ---------------------------------------------------------------- peças locais

/** Par rótulo/valor só de leitura, no mesmo desenho do rótulo de `Field`. */
function Dado({ rotulo, valor }: Readonly<{ rotulo: string; valor: ReactNode }>) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.bronze,
          marginBottom: 4,
        }}
      >
        {rotulo}
      </div>
      <div style={{ fontSize: 13, color: C.ink, overflowWrap: "anywhere" }}>{valor}</div>
    </div>
  );
}

// ---------------------------------------------------------------- bloco de um item

type PropsBloco = Readonly<{
  inscricaoId: string;
  item: ItemConferencia;
  estadoSalvo: EstadoConferencia;
  observacaoSalva: string | null;
  conferidoPor: string | null;
  conferidoEm: string | null;
  faltaAncora: string | null;
  executar: PropsSecao["executar"];
  ocupado: boolean;
  podeConferir: boolean;
}>;

function BlocoItem({
  inscricaoId,
  item,
  estadoSalvo,
  observacaoSalva,
  conferidoPor,
  conferidoEm,
  faltaAncora,
  executar,
  ocupado,
  podeConferir,
}: PropsBloco) {
  const [estado, setEstado] = useState<EstadoConferencia>(estadoSalvo);
  const [observacao, setObservacao] = useState(observacaoSalva ?? "");

  const regra = REGRA_DO_ITEM[item];
  const mudou = estado !== estadoSalvo || observacao.trim() !== (observacaoSalva ?? "").trim();

  // Marcar "cumpre" num item cuja data-âncora nem existe é afirmar o que ninguém pode
  // ter verificado. Não bloqueamos (a organização pode ter checado por fora e explicado
  // na observação), mas o aviso fica na frente de quem estiver clicando rápido.
  const afirmacaoSemBase = Boolean(faltaAncora) && (estado === "ok" || estado === "provisorio");

  const salvar = async () => {
    await executar("conferencia", {
      inscricaoId,
      item,
      estado,
      observacao: observacao.trim(),
    });
  };

  return (
    <Card padding="14px 16px" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
        <Chip tone="gold" title={`Item ${item.toUpperCase()} do regulamento`}>
          {item.toUpperCase()}
        </Chip>
        <strong style={{ fontSize: 13.5, color: C.ink, fontWeight: 700 }}>{regra.titulo}</strong>
        <span style={{ marginLeft: "auto" }}>
          <Chip tone={TOM_CONFERENCIA[estadoSalvo]}>{ROTULO_CONFERENCIA[estadoSalvo]}</Chip>
        </span>
      </div>

      {/* O critério inteiro, sempre visível: é o que impede dois organizadores de lerem
          o mesmo item de jeitos diferentes. */}
      <p style={{ margin: "10px 0 0", fontSize: 12, lineHeight: 1.65, color: C.ink3 }}>
        {regra.detalhe}
      </p>

      {faltaAncora ? (
        <p style={{ margin: "9px 0 0", fontSize: 11.5, lineHeight: 1.6, color: C.warnSoft }}>
          Ainda não existe {faltaAncora}. Sem ela este item não tem como ser medido — o estado
          honesto é «não avaliável».
        </p>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
        <Field label="Estado">
          <Select
            value={estado}
            disabled={!podeConferir || ocupado}
            onChange={(v) => setEstado(comoEstado(v))}
            ariaLabel={`Estado do item ${item.toUpperCase()}`}
          >
            {ESTADOS_CONFERENCIA.map((e) => (
              <option key={e} value={e}>
                {ROTULO_CONFERENCIA[e]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Observação"
          hint="O que foi visto, e onde. Quem reabrir este item daqui a um mês depende só disto."
        >
          <Textarea
            value={observacao}
            rows={2}
            disabled={!podeConferir || ocupado}
            onChange={setObservacao}
            placeholder="Ex.: print do perfil enviado no privado em 03/09."
            ariaLabel={`Observação do item ${item.toUpperCase()}`}
          />
        </Field>
      </div>

      {afirmacaoSemBase ? (
        <p style={{ margin: "10px 0 0", fontSize: 11.5, lineHeight: 1.6, color: C.warnSoft }}>
          Você está aprovando um item sem a data que ele usa. Se foi verificado por outro
          caminho, escreva qual na observação antes de salvar.
        </p>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <span style={{ fontSize: 11, color: C.ink4 }}>
          {conferidoPor
            ? `Conferido por ${conferidoPor} em ${formatDateTimeLabel(conferidoEm)}`
            : "Ainda ninguém conferiu este item."}
        </span>
        <span style={{ marginLeft: "auto" }}>
          <Button
            tone="gold"
            small
            disabled={!podeConferir || ocupado || !mudou}
            title={podeConferir ? undefined : SEM_ESCOPO}
            onClick={() => void salvar()}
          >
            Salvar item {item.toUpperCase()}
          </Button>
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- ficha

type PropsFicha = Readonly<{
  inscrito: Inscrito;
  config: EdicaoConfig;
  conferencias: ReadonlyMap<ItemConferencia, { estado: string; observacao: string | null; conferido_por: string | null; conferido_em: string | null }>;
  executar: PropsSecao["executar"];
  ocupado: boolean;
  podeConferir: boolean;
}>;

function FichaInscrito({ inscrito, config, conferencias, executar, ocupado, podeConferir }: PropsFicha) {
  const [situacao, setSituacao] = useState<Inscrito["situacao"]>(inscrito.situacao);
  // Guardamos o RÓTULO canônico ("Grão-Mestre"), não o que veio do banco: o valor gravado
  // pode ser um alias ("GM", "diamante 2") que não casa com nenhuma <option>, e aí o
  // select apareceria vazio como se ninguém tivesse verificado nada.
  const [eloVerificado, setEloVerificado] = useState(resolveElo(inscrito.elo_verificado)?.label ?? "");
  const [entrouNoGrupo, setEntrouNoGrupo] = useState(inscrito.entrou_no_grupo ?? "");
  const [organizador, setOrganizador] = useState(inscrito.organizador);
  const [observacao, setObservacao] = useState(inscrito.observacao ?? "");

  const elo = eloExibido(inscrito);
  const rotas = rotasDoInscrito(inscrito);
  const congelado = Boolean(inscrito.elo_congelado);

  // Uma comparação por campo, reaproveitada pelo botão (habilitar) e pelo envio
  // (decidir o que vai no corpo).
  const mudou = {
    situacao: situacao !== inscrito.situacao,
    eloVerificado: eloVerificado !== (resolveElo(inscrito.elo_verificado)?.label ?? ""),
    entrouNoGrupo: entrouNoGrupo !== (inscrito.entrou_no_grupo ?? ""),
    organizador: organizador !== inscrito.organizador,
    observacao: observacao.trim() !== (inscrito.observacao ?? "").trim(),
  };

  const fichaMudou = Object.values(mudou).some(Boolean);

  /*
   * Envia SÓ o que esta tela mudou.
   *
   * Antes ia sempre o pacote inteiro dos cinco campos, montado do estado local — que é
   * uma foto de quando a ficha foi aberta. Com dois organizadores trabalhando ao mesmo
   * tempo (o modo normal aqui), quem salvasse por último devolvia os valores VELHOS dos
   * campos que nem tocou: bastava alguém abrir a ficha, o outro marcar "apto", e o
   * primeiro salvar uma observação para a situação voltar a "pendente" sem aviso nenhum.
   *
   * `PatchInscricao` já é todo opcional e `atualizarInscricao` só grava o que vem
   * definido, então omitir o campo intocado é o bastante para ele sobreviver.
   */
  const salvarFicha = async () => {
    await executar("ficha", {
      inscricaoId: inscrito.id,
      ...(mudou.situacao && { situacao }),
      ...(mudou.eloVerificado && { eloVerificado: eloVerificado === "" ? null : eloVerificado }),
      ...(mudou.entrouNoGrupo && { entrouNoGrupo: entrouNoGrupo === "" ? null : entrouNoGrupo }),
      ...(mudou.organizador && { organizador }),
      ...(mudou.observacao && {
        observacao: observacao.trim() === "" ? null : observacao.trim(),
      }),
    });
  };

  return (
    <div>
      <Card padding="16px 18px">
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: display, fontSize: 21, color: C.ink, margin: 0 }}>
            {inscrito.nick}
            <span style={{ color: C.ink4 }}>#{inscrito.tag}</span>
          </h3>
          <Chip tone={TOM_SITUACAO[inscrito.situacao]}>{ROTULO_SITUACAO[inscrito.situacao]}</Chip>
          {inscrito.organizador ? (
            <Chip tone="gold" title="Organizador — isento da taxa (regra w)">
              organização
            </Chip>
          ) : null}
          {inscrito.quer_capitao ? <Chip tone="neutro">quer ser capitão</Chip> : null}
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 11.5, color: C.ink4, ...tabular }}>
          Inscrito em {formatDateTimeLabel(inscrito.criado_em)}
        </p>

        <div style={{ marginTop: 14 }}>
          <FieldGrid min={170}>
            <Dado rotulo="Riot ID" valor={inscrito.riot_id} />
            <Dado rotulo="Nome real" valor={inscrito.nome_real ?? "não informado"} />
            <Dado rotulo="E-mail" valor={inscrito.email} />
            <Dado rotulo="Discord" valor={inscrito.discord} />
            <Dado rotulo="WhatsApp" valor={inscrito.whatsapp ?? "não informado"} />
            <Dado rotulo="Rotas" valor={<span title={rotas.longo}>{rotas.longo}</span>} />
          </FieldGrid>
          {/* Contato é dado do jogador e fica só de leitura: se o Discord está errado, quem
              corrige é ele na própria inscrição — corrigir por cima aqui apagaria a pista de
              que o que ele mandou não batia. */}
          <p style={{ margin: "10px 0 0", fontSize: 11, color: C.ink4 }}>
            Contato vem da inscrição e não se edita por aqui.
          </p>
        </div>

        <div style={{ marginTop: 14 }}>
          <FieldGrid min={150}>
            <Metric
              small
              label="Elo em uso"
              value={<span style={{ color: elo.cor }}>{elo.rotulo}</span>}
              detail={elo.origem}
            />
            {/*
              NÃO existe campo de pontos aqui, e não é esquecimento.
              O preço do jogador no draft é derivado do elo pelo servidor (`pontosDoElo`).
              Um campo editável nesta tela reabriria pela porta dos fundos exatamente o que o
              formulário público fecha: mandar "elo: Ferro, pontos: 15" e adulterar o sorteio.
              Para mudar o preço de alguém, corrija o ELO VERIFICADO abaixo.
            */}
            <Metric
              small
              label="Pontos no draft"
              value={inscrito.pontos}
              detail="derivado do elo — não editável"
            />
            <Metric small label="Entrou no grupo" value={diaBR(inscrito.entrou_no_grupo)} />
          </FieldGrid>
        </div>

        {congelado ? (
          <div style={{ marginTop: 14 }}>
            <Banner tone="warn" title="Elo congelado">
              O elo deste inscrito foi congelado em {inscrito.elo_congelado} e é esse valor que
              vale no draft. Mudar o elo verificado agora corrige o registro, mas <b>não</b> muda
              mais o preço — para isso a organização teria que congelar tudo de novo, o que
              reprecifica todo mundo.
            </Banner>
          </div>
        ) : null}
      </Card>

      <BlockTitle>Conferência dos requisitos</BlockTitle>

      {ITENS_CONFERENCIA.map((item) => {
        const registro = conferencias.get(item);
        const ancora = ANCORA_DO_ITEM[item];
        const faltaAncora = ancora && !config[ancora.campo] ? ancora.texto : null;

        return (
          <BlocoItem
            // A chave inclui o inscrito para o rascunho do bloco morrer ao trocar de pessoa:
            // sem isso, a observação digitada num jogador reaparecia no próximo selecionado.
            key={`${inscrito.id}-${item}`}
            inscricaoId={inscrito.id}
            item={item}
            estadoSalvo={comoEstado(registro?.estado)}
            observacaoSalva={registro?.observacao ?? null}
            conferidoPor={registro?.conferido_por ?? null}
            conferidoEm={registro?.conferido_em ?? null}
            faltaAncora={faltaAncora}
            executar={executar}
            ocupado={ocupado}
            podeConferir={podeConferir}
          />
        );
      })}

      <BlockTitle>Ficha</BlockTitle>

      <Card padding="16px 18px">
        <FieldGrid min={190}>
          <Field
            label="Situação"
            hint="Sobra é quem foi aprovado e ficou de fora quando os times fecharam — não é fila com ordem."
          >
            <Select
              value={situacao}
              disabled={!podeConferir || ocupado}
              onChange={(v) => setSituacao(comoSituacao(v))}
              ariaLabel="Situação do inscrito"
            >
              {SITUACOES.map((s) => (
                <option key={s} value={s}>
                  {ROTULO_SITUACAO[s]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Elo verificado"
            hint={
              congelado
                ? "O elo já está congelado: isto corrige o registro, mas não o preço no draft."
                : "Vazio = ninguém abriu o perfil ainda. É este valor que vira o preço no draft."
            }
          >
            <Select
              value={eloVerificado}
              disabled={!podeConferir || ocupado}
              onChange={setEloVerificado}
              ariaLabel="Elo verificado"
            >
              <option value="">— não verificado —</option>
              {ELO_ORDER.map((e) => (
                <option key={e.key} value={e.label}>
                  {e.label} · {e.pts} pts
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Entrou no grupo"
            hint={`Usado no item A (mínimo de ${config.dias_no_grupo} dias). No WhatsApp não há data auditável: quem preenche atesta.`}
          >
            <Input
              type="date"
              value={entrouNoGrupo}
              disabled={!podeConferir || ocupado}
              onChange={setEntrouNoGrupo}
              ariaLabel="Data de entrada no grupo"
            />
          </Field>
        </FieldGrid>

        <div style={{ marginTop: 14 }}>
          <Check
            checked={organizador}
            disabled={!podeConferir || ocupado}
            onChange={setOrganizador}
          >
            É da organização (regra w) — <b>isento da taxa</b>. Isento não é inadimplente: a
            cobrança some do caixa em vez de ficar em aberto. São cinco pessoas ao todo.
          </Check>
        </div>

        <div style={{ marginTop: 14 }}>
          <Field
            label="Observação da ficha"
            hint="Vale para a inscrição inteira. Cada requisito tem a observação dele, logo acima."
          >
            <Textarea
              value={observacao}
              rows={3}
              disabled={!podeConferir || ocupado}
              onChange={setObservacao}
              placeholder="Ex.: pediu para jogar no mesmo time do irmão; combinado que não há garantia."
              ariaLabel="Observação da ficha"
            />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <Toolbar
            right={
              <Button
                tone="gold"
                disabled={!podeConferir || ocupado || !fichaMudou}
                title={podeConferir ? undefined : SEM_ESCOPO}
                onClick={() => void salvarFicha()}
              >
                Salvar ficha
              </Button>
            }
          >
            <span style={{ fontSize: 11.5, color: C.ink4 }}>
              {fichaMudou ? "Há mudanças não salvas." : "Nada mudou desde o último salvamento."}
            </span>
          </Toolbar>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- seção

export function SecaoInscritos({ dados, executar, ocupado, podeConferir }: PropsSecao) {
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [filtroSituacao, setFiltroSituacao] = useState("todos");
  const [soPendencia, setSoPendencia] = useState(false);

  const { config, inscritos, conferencias, panorama } = dados;

  /** Conferências indexadas por inscrito e item — a tabela lê isto 6 vezes por linha. */
  const porInscrito = useMemo(() => {
    const mapa = new Map<string, Map<ItemConferencia, (typeof conferencias)[number]>>();
    for (const registro of conferencias) {
      const doInscrito = mapa.get(registro.inscricao_id) ?? new Map();
      doInscrito.set(registro.item, registro);
      mapa.set(registro.inscricao_id, doInscrito);
    }
    return mapa;
  }, [conferencias]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    // "Com pendência" é só o estado `pendente` — item sem linha no banco conta como
    // pendente também. "não avaliável" fica de fora de propósito: ali não há nada que a
    // organização possa fazer enquanto a data não for decidida.
    const temPendencia = (id: string) => {
      const doInscrito = porInscrito.get(id);
      return ITENS_CONFERENCIA.some((item) => comoEstado(doInscrito?.get(item)?.estado) === "pendente");
    };

    return inscritos.filter((i) => {
      if (filtroSituacao !== "todos" && i.situacao !== filtroSituacao) return false;
      if (soPendencia && !temPendencia(i.id)) return false;
      if (!termo) return true;
      return [i.nick, i.riot_id, i.discord, i.email, i.nome_real ?? ""].some((campo) =>
        campo.toLowerCase().includes(termo),
      );
    });
  }, [inscritos, busca, filtroSituacao, soPendencia, porInscrito]);

  // A ficha busca em TODOS os inscritos, não nos visíveis: mudar um filtro não deve fechar
  // a pessoa que está aberta ao lado no meio da conferência.
  const selecionado = inscritos.find((i) => i.id === selecionadoId) ?? null;

  const cabecalho = (
    <SectionHead
      eyebrow="4ª Edição"
      title="Inscritos e conferência"
      description="Cada requisito tem um critério escrito, e ele fica à vista na ficha. Quando a data que um item usa ainda não foi decidida, o estado certo é «não avaliável» — aprovar sem base é pior do que deixar pendente."
    />
  );

  if (inscritos.length === 0) {
    return (
      <div>
        {cabecalho}
        <Empty
          title="Nenhuma inscrição ainda"
          action={
            <Chip tone={config.inscricoes_abertas ? "ok" : "warn"}>
              {config.inscricoes_abertas ? "inscrições abertas" : "inscrições fechadas"}
            </Chip>
          }
        >
          {config.inscricoes_abertas
            ? "O formulário está no ar e ninguém enviou ainda. Assim que a primeira inscrição chegar, ela aparece aqui com os seis requisitos pendentes."
            : "As inscrições ainda não foram abertas. Abra-as na aba Configuração — enquanto a chave estiver fechada, o formulário público não aceita ninguém."}
        </Empty>
      </div>
    );
  }

  return (
    <div>
      {cabecalho}

      {!podeConferir ? (
        <Banner tone="warn" title="Somente leitura">
          Você enxerga tudo, mas não pode alterar conferência nem ficha: {SEM_ESCOPO}
        </Banner>
      ) : null}

      <FieldGrid min={140} style={{ marginBottom: 18 }}>
        <Metric small label="Inscritos" value={panorama.inscritos} />
        <Metric small label="Pendentes" value={panorama.pendentes} />
        <Metric small label="Aprovados" value={panorama.aprovados} />
        <Metric small label="Recusados" value={panorama.recusados} />
        <Metric
          small
          label="Times (derivado)"
          value={panorama.times}
          detail={`${panorama.vagas} em time · ${panorama.sobra} de sobra`}
        />
      </FieldGrid>

      <SplitPane min={420}>
        <Card padding="14px 16px">
          <Toolbar style={{ alignItems: "flex-end" }}>
            <Field label="Buscar" style={{ flex: "1 1 200px" }}>
              <Input
                value={busca}
                onChange={setBusca}
                placeholder="nick, Riot ID, Discord ou e-mail"
                ariaLabel="Buscar inscrito"
              />
            </Field>
            <Field label="Situação" style={{ flex: "0 0 160px" }}>
              <Select value={filtroSituacao} onChange={setFiltroSituacao} ariaLabel="Filtrar por situação">
                <option value="todos">Todas</option>
                {SITUACOES.map((s) => (
                  <option key={s} value={s}>
                    {ROTULO_SITUACAO[s]}
                  </option>
                ))}
              </Select>
            </Field>
          </Toolbar>

          <div style={{ marginTop: 12 }}>
            <Check checked={soPendencia} onChange={setSoPendencia}>
              Só quem tem algum requisito pendente
            </Check>
          </div>

          <p style={{ margin: "12px 0 10px", fontSize: 11.5, color: C.ink4, ...tabular }}>
            Mostrando {visiveis.length} de {inscritos.length}.
          </p>

          {visiveis.length === 0 ? (
            <Empty title="Nenhum inscrito com esses filtros">
              Limpe a busca ou volte a situação para «todas».
            </Empty>
          ) : (
            <ScrollX>
              <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ ...th, textAlign: "left", width: "100%" }}>
                      Inscrito
                    </th>
                    <th
                      scope="col"
                      style={{ ...th, textAlign: "left" }}
                      title="Congelado, se houver; senão o verificado; senão o declarado."
                    >
                      Elo
                    </th>
                    <th scope="col" style={{ ...th, textAlign: "right" }} title="Derivado do elo">
                      Pts
                    </th>
                    <th scope="col" style={{ ...th, textAlign: "left" }}>
                      Rotas
                    </th>
                    {ITENS_CONFERENCIA.map((item) => (
                      <th
                        key={item}
                        scope="col"
                        style={{ ...th, textAlign: "center" }}
                        title={REGRA_DO_ITEM[item].titulo}
                      >
                        {item}
                      </th>
                    ))}
                    <th scope="col" style={{ ...th, textAlign: "left" }}>
                      Situação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((inscrito) => {
                    const aberto = inscrito.id === selecionadoId;
                    const elo = eloExibido(inscrito);
                    const rotas = rotasDoInscrito(inscrito);
                    const doInscrito = porInscrito.get(inscrito.id);

                    return (
                      <tr
                        key={inscrito.id}
                        onClick={() => setSelecionadoId(inscrito.id)}
                        style={{
                          background: aberto ? "rgba(201,138,75,.12)" : undefined,
                          cursor: "pointer",
                        }}
                      >
                        <td style={{ ...td, whiteSpace: "normal" }}>
                          {/* O botão existe para a linha ser alcançável por teclado e ser
                              anunciada como controle — <tr onClick> sozinho não é nem uma
                              coisa nem outra. O clique na linha é atalho de mouse. */}
                          <button
                            type="button"
                            aria-pressed={aberto}
                            onClick={() => setSelecionadoId(inscrito.id)}
                            style={{
                              display: "block",
                              padding: 0,
                              border: "none",
                              background: "none",
                              textAlign: "left",
                              fontFamily: "inherit",
                              fontSize: 13,
                              fontWeight: aberto ? 700 : 600,
                              color: aberto ? C.bronzeLit : C.ink,
                              cursor: "pointer",
                            }}
                          >
                            {inscrito.nick}
                            <span style={{ color: C.ink4, fontWeight: 400 }}>#{inscrito.tag}</span>
                          </button>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                              marginTop: 3,
                            }}
                          >
                            <span style={{ fontSize: 11, color: C.ink4 }}>{inscrito.riot_id}</span>
                            {inscrito.organizador ? (
                              <Chip tone="gold" title="Organizador — isento da taxa (regra w)">
                                org
                              </Chip>
                            ) : null}
                            {inscrito.quer_capitao ? (
                              <Chip tone="neutro" title="Quer ser capitão">
                                cap
                              </Chip>
                            ) : null}
                          </div>
                        </td>

                        <td style={td}>
                          <span style={{ color: elo.cor }}>{elo.rotulo}</span>
                          <span style={{ color: C.ink4, fontSize: 10.5 }}> {elo.origem}</span>
                        </td>

                        <td style={{ ...td, textAlign: "right", ...tabular }}>{inscrito.pontos}</td>

                        <td style={td} title={rotas.longo}>
                          {rotas.curto}
                        </td>

                        {ITENS_CONFERENCIA.map((item) => {
                          const estado = comoEstado(doInscrito?.get(item)?.estado);
                          return (
                            <td key={item} style={{ ...td, textAlign: "center" }}>
                              <Chip
                                tone={TOM_CONFERENCIA[estado]}
                                title={`${REGRA_DO_ITEM[item].titulo}: ${ROTULO_CONFERENCIA[estado]}`}
                              >
                                {ABREV_CONFERENCIA[estado]}
                              </Chip>
                            </td>
                          );
                        })}

                        <td style={td}>
                          <Chip tone={TOM_SITUACAO[inscrito.situacao]}>
                            {ROTULO_SITUACAO[inscrito.situacao]}
                          </Chip>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollX>
          )}
        </Card>

        {selecionado ? (
          <FichaInscrito
            // Trocar de inscrito remonta a ficha inteira: o rascunho dos campos pertence à
            // pessoa aberta, e carregá-lo para a próxima já fez alguém salvar a observação
            // errada no jogador errado.
            key={selecionado.id}
            inscrito={selecionado}
            config={config}
            conferencias={porInscrito.get(selecionado.id) ?? new Map()}
            executar={executar}
            ocupado={ocupado}
            podeConferir={podeConferir}
          />
        ) : (
          <Empty title="Nenhum inscrito aberto">
            Clique em alguém na tabela para ver o contato, os seis requisitos com o critério
            escrito de cada um, e a ficha.
          </Empty>
        )}
      </SplitPane>
    </div>
  );
}
