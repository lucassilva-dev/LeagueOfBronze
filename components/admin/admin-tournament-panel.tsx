"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import type { SeriesFormat, TournamentDataset } from "@/lib/schema";
import { createIndexes, getChampionshipResult, isSeriesComplete } from "@/lib/tournament";
import {
  ActionCard,
  Banner,
  BlockTitle,
  BotaoExportarBackup,
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
  display,
  tabular,
} from "@/components/admin/ui";

/**
 * Ciclo de vida da temporada — as duas ações que NÃO passam pelo botão "salvar": encerrar e
 * iniciar gravam direto no servidor.
 *
 * A decisão que organiza esta tela: o servidor trabalha sobre o dataset GRAVADO (as rotas
 * /api/admin/tournament/* chamam readDataset()), não sobre o rascunho que está na tela. Então o
 * painel busca o estado gravado e mostra os números a partir dele — mostrar os números do
 * rascunho seria mentir sobre o que vai para o arquivo.
 */

const CONFIRM_PHRASE = "INICIAR";

type StartPayload = Readonly<{
  name: string;
  format: SeriesFormat;
  keepTeams: boolean;
  keepPlayers: boolean;
  archiveCurrent: boolean;
}>;

type AdminTournamentPanelProps = Readonly<{
  draft: TournamentDataset;
  isBusy: boolean;
  onEndTournament: () => void;
  onStartTournament: (payload: StartPayload) => void;
}>;

function formatDate(iso?: string) {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------- resumo de um dataset

type Resumo = Readonly<{
  nome: string;
  encerrada: boolean;
  seasonId: string;
  formato: SeriesFormat;
  times: number;
  jogadores: number;
  /** Jogadores cujo time ainda existe — são os únicos que a nova temporada consegue manter. */
  jogadoresComTime: number;
  series: number;
  seriesCompletas: number;
  arquivadas: number;
  campeao: string | null;
  inicio?: string;
  fim?: string;
}>;

function resumir(dataset: TournamentDataset): Resumo {
  const campeonato = getChampionshipResult(dataset);
  const campeao = campeonato
    ? createIndexes(dataset).teamsById.get(campeonato.championTeamId)?.name ??
      campeonato.championTeamId
    : null;
  const idsDeTime = new Set(dataset.teams.map((time) => time.id));

  return {
    nome: dataset.tournament.name,
    encerrada: dataset.tournament.status === "finished",
    seasonId: dataset.tournament.seasonId ?? "—",
    formato: dataset.tournament.format,
    times: dataset.teams.length,
    jogadores: dataset.players.length,
    jogadoresComTime: dataset.players.filter((jogador) => idsDeTime.has(jogador.teamId)).length,
    series: dataset.seriesMatches.length,
    seriesCompletas: dataset.seriesMatches.filter((serie) => isSeriesComplete(serie, dataset))
      .length,
    arquivadas: dataset.archivedSeasons.length,
    campeao,
    inicio: dataset.tournament.startedAtISO,
    fim: dataset.tournament.endedAtISO,
  };
}

type EstadoGravado =
  | Readonly<{ situacao: "carregando" }>
  | Readonly<{ situacao: "ok"; resumo: Resumo }>
  | Readonly<{ situacao: "erro"; mensagem: string }>;

/**
 * Lê o dataset GRAVADO (o mesmo que o servidor vai arquivar) sem tocar no rascunho.
 *
 * Refaz a leitura sempre que `draft` troca de identidade — o pai substitui o rascunho depois de
 * salvar, recarregar, importar, encerrar ou iniciar, que são exatamente os momentos em que o
 * estado gravado mudou.
 */
function useResumoGravado(draft: TournamentDataset) {
  const [estado, setEstado] = useState<EstadoGravado>({ situacao: "carregando" });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setEstado({ situacao: "carregando" });

    void (async () => {
      try {
        const resposta = await fetch("/api/admin/dataset", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const dados = (await resposta.json()) as { dataset?: TournamentDataset; error?: string };
        if (cancelado) return;
        if (!resposta.ok || !dados.dataset) {
          throw new Error(dados.error || "Não foi possível ler o estado gravado.");
        }
        setEstado({ situacao: "ok", resumo: resumir(dados.dataset) });
      } catch (erro) {
        if (cancelado) return;
        setEstado({
          situacao: "erro",
          mensagem: erro instanceof Error ? erro.message : "Falha ao ler o estado gravado.",
        });
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [draft, recarga]);

  return { estado, recarregar: () => setRecarga((n) => n + 1) };
}

type Divergencia = Readonly<{ campo: string; gravado: string; rascunho: string }>;

function listarDivergencias(gravado: Resumo, rascunho: Resumo): Divergencia[] {
  const linhas: Divergencia[] = [];
  const comparar = (campo: string, a: string, b: string) => {
    if (a !== b) linhas.push({ campo, gravado: a, rascunho: b });
  };

  comparar("Nome", gravado.nome, rascunho.nome);
  comparar(
    "Situação",
    gravado.encerrada ? "encerrada" : "em andamento",
    rascunho.encerrada ? "encerrada" : "em andamento",
  );
  comparar("Times", String(gravado.times), String(rascunho.times));
  comparar("Jogadores", String(gravado.jogadores), String(rascunho.jogadores));
  comparar("Séries", String(gravado.series), String(rascunho.series));
  comparar("Séries concluídas", String(gravado.seriesCompletas), String(rascunho.seriesCompletas));
  comparar("Campeão", gravado.campeao ?? "nenhum", rascunho.campeao ?? "nenhum");

  return linhas;
}

// ---------------------------------------------------------------- peças locais

/** Lista "o que vai acontecer" — sempre ANTES do botão que faz acontecer. */
function Impacto({
  titulo,
  linhas,
}: Readonly<{
  titulo: string;
  linhas: ReadonlyArray<{ rotulo: string; valor: ReactNode; tone?: "ok" | "warn" | "danger" }>;
}>) {
  const corDe = (tone?: "ok" | "warn" | "danger") =>
    tone === "ok" ? C.okSoft : tone === "warn" ? C.warnSoft : tone === "danger" ? C.dangerSoft : C.ink;

  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 3, background: "rgba(0,0,0,.24)" }}>
      <div
        style={{
          padding: "8px 12px",
          borderBottom: `1px solid ${C.line}`,
          fontSize: 10,
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: C.bronze,
        }}
      >
        {titulo}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: "4px 0" }}>
        {linhas.map((linha) => (
          <li
            key={linha.rotulo}
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              padding: "6px 12px",
              fontSize: 12.5,
            }}
          >
            <span style={{ color: C.ink3 }}>{linha.rotulo}</span>
            <span style={{ color: corDe(linha.tone), fontWeight: 600, textAlign: "right", ...tabular }}>
              {linha.valor}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SeloDaFonte({ gravado }: Readonly<{ gravado: boolean }>) {
  return gravado ? (
    <Chip tone="ok" title="Números lidos do servidor">
      estado gravado
    </Chip>
  ) : (
    <Chip tone="warn" title="Não foi possível ler o servidor; os números são os da tela">
      números da tela
    </Chip>
  );
}

// ---------------------------------------------------------------- estado atual

function StatusAtual({ rascunho }: Readonly<{ rascunho: Resumo }>) {
  return (
    <Card padding="16px 18px">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".18em",
              textTransform: "uppercase",
              color: C.ink4,
            }}
          >
            Temporada atual (rascunho na tela)
          </div>
          <h3 style={{ fontFamily: display, fontSize: 22, color: C.ink, margin: "4px 0 0" }}>
            {rascunho.nome}
          </h3>
        </div>
        <Chip tone={rascunho.encerrada ? "warn" : "ok"}>
          {rascunho.encerrada ? "Encerrada" : "Em andamento"}
        </Chip>
      </div>

      <div
        style={{
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        }}
      >
        <Metric label="Times" value={rascunho.times} small />
        <Metric label="Jogadores" value={rascunho.jogadores} small />
        <Metric
          label="Séries"
          value={rascunho.series}
          detail={`${rascunho.seriesCompletas} concluídas`}
          small
        />
        <Metric label="Formato padrão" value={rascunho.formato === "BO5" ? "MD5" : "MD3"} small />
        <Metric label="Início" value={formatDate(rascunho.inicio)} small />
        <Metric label="Encerramento" value={formatDate(rascunho.fim)} small />
        <Metric label="Campeão" value={rascunho.campeao ?? "A definir"} small />
        <Metric label="Arquivadas" value={rascunho.arquivadas} small />
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 11.5, color: C.ink4 }}>
        ID da temporada: <span style={tabular}>{rascunho.seasonId}</span>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------- encerrar

function CartaoEncerrar({
  base,
  temGravado,
  carregando,
  isBusy,
  onEndTournament,
}: Readonly<{
  base: Resumo;
  temGravado: boolean;
  carregando: boolean;
  isBusy: boolean;
  onEndTournament: () => void;
}>) {
  const [confirmado, setConfirmado] = useState(false);

  if (base.encerrada) {
    return (
      <ActionCard
        tone="neutro"
        title="Encerrar temporada"
        badge={<Chip tone="off">indisponível</Chip>}
        description="Arquiva um retrato completo da temporada (fica visível em Temporadas) e a marca como encerrada."
      >
        <Banner tone="ok" title="Esta temporada já está encerrada">
          O snapshot já foi para o arquivo. Para recomeçar, use “Iniciar nova temporada”.
        </Banner>
      </ActionCard>
    );
  }

  return (
    <ActionCard
      tone="warn"
      title="Encerrar temporada"
      badge={<SeloDaFonte gravado={temGravado} />}
      description="Arquiva um retrato completo da temporada e a marca como encerrada. Nada é apagado — os dados só somem ao iniciar uma nova."
    >
      {/* #13: o servidor arquiva o que está GRAVADO e o pai troca o rascunho pela resposta. */}
      <Banner tone="warn" title="Vale o que está gravado, não o que está na tela">
        O arquivo é montado a partir dos dados gravados no servidor. Qualquer edição em aberto
        neste rascunho é <strong>descartada</strong> quando a resposta chegar — salve antes se
        quiser que ela entre no arquivo.
      </Banner>

      {/* #42: temporada sem série vira um item vazio na página pública. */}
      {base.series === 0 ? (
        <Banner tone="warn" title="Esta temporada não tem nenhuma série">
          Encerrar agora cria uma temporada <strong>vazia</strong> no arquivo, e ela aparece assim
          em /temporadas. Se foi engano, cadastre as séries antes ou use “Iniciar nova temporada”
          sem arquivar.
        </Banner>
      ) : null}

      {base.campeao === null && base.series > 0 ? (
        <Banner tone="warn" title="Nenhuma série FINAL concluída">
          A temporada será arquivada <strong>sem campeão</strong>.
        </Banner>
      ) : null}

      <Impacto
        titulo="O que vai para o arquivo"
        linhas={[
          { rotulo: "Nome arquivado", valor: base.nome },
          { rotulo: "Times", valor: base.times },
          { rotulo: "Jogadores", valor: base.jogadores },
          {
            rotulo: "Séries",
            valor: `${base.seriesCompletas} de ${base.series} concluídas`,
            tone: base.series === 0 ? "warn" : undefined,
          },
          {
            rotulo: "Campeão",
            valor: base.campeao ?? "nenhum",
            tone: base.campeao ? "ok" : "warn",
          },
          { rotulo: "Temporadas arquivadas", valor: `${base.arquivadas} → ${base.arquivadas + 1}` },
        ]}
      />

      <Check checked={confirmado} onChange={setConfirmado} tone="danger" disabled={isBusy}>
        Confirmo que quero encerrar e arquivar a temporada atual.
      </Check>

      <div>
        <Button
          tone="danger"
          onClick={onEndTournament}
          disabled={isBusy || carregando || !confirmado}
        >
          {isBusy ? "Encerrando e arquivando..." : "Encerrar e arquivar"}
        </Button>
      </div>
    </ActionCard>
  );
}

// ---------------------------------------------------------------- iniciar

function CartaoIniciar({
  base,
  temGravado,
  carregando,
  isBusy,
  onStartTournament,
}: Readonly<{
  base: Resumo;
  temGravado: boolean;
  carregando: boolean;
  isBusy: boolean;
  onStartTournament: (payload: StartPayload) => void;
}>) {
  // #34: o nome NÃO vem preenchido com o da temporada atual — vinha, e bastava um clique
  // distraído para a nova edição nascer com o nome da anterior.
  const [nome, setNome] = useState("");
  const [formato, setFormato] = useState<SeriesFormat>(base.formato);
  const [manterTimes, setManterTimes] = useState(true);
  const [manterJogadores, setManterJogadores] = useState(true);
  // null = ainda no padrão calculado; assim que a pessoa mexe, a escolha dela manda — se fosse
  // um useState comum, a chegada do estado gravado sobrescreveria o que ela acabou de marcar.
  const [arquivarEscolha, setArquivarEscolha] = useState<boolean | null>(null);
  const [backupFeito, setBackupFeito] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");

  const ativaComSeries = !base.encerrada && base.series > 0;
  // #42: temporada ativa e vazia não deve ser arquivada por padrão.
  const arquivarPadrao = ativaComSeries;
  const arquivarAtual = arquivarEscolha ?? arquivarPadrao;

  const jogadoresMantidos = manterTimes && manterJogadores ? base.jogadoresComTime : 0;
  const jogadoresSemTime = base.jogadores - base.jogadoresComTime;
  const nomeIgual = nome.trim().length > 0 && nome.trim() === base.nome.trim();

  const confirmacaoOk = confirmacao.trim().toUpperCase() === CONFIRM_PHRASE;
  const podeIniciar = nome.trim().length > 0 && backupFeito && confirmacaoOk && !isBusy && !carregando;

  const iniciar = () => {
    onStartTournament({
      name: nome.trim(),
      format: formato,
      keepTeams: manterTimes,
      keepPlayers: manterJogadores,
      archiveCurrent: arquivarAtual,
    });
  };

  return (
    <ActionCard
      tone="danger"
      title="Iniciar nova temporada"
      badge={<SeloDaFonte gravado={temGravado} />}
      description="Apaga séries e classificação para recomeçar do zero. Você escolhe manter times e jogadores."
    >
      {/* #13: mesma armadilha do encerrar — o servidor parte do gravado. */}
      <Banner tone="warn" title="Vale o que está gravado, não o que está na tela">
        O servidor limpa (e, se marcado, arquiva) os dados <strong>gravados</strong>. O rascunho
        aberto aqui é descartado quando a nova temporada nascer.
      </Banner>

      <FieldGrid min={190}>
        <Field
          label="Nome da nova temporada"
          hint={`A atual chama-se “${base.nome}”.`}
        >
          <Input
            value={nome}
            onChange={setNome}
            placeholder="Ex.: 4ª Edição da League of Bronze"
            disabled={isBusy}
          />
        </Field>
        <Field label="Formato padrão">
          <Select
            value={formato}
            onChange={(v) => setFormato(v as SeriesFormat)}
            disabled={isBusy}
          >
            <option value="BO3">MD3</option>
            <option value="BO5">MD5</option>
          </Select>
        </Field>
      </FieldGrid>

      {nomeIgual ? (
        <Banner tone="warn" title="Nome idêntico ao da temporada atual">
          Duas temporadas com o mesmo nome ficam impossíveis de distinguir em /temporadas.
        </Banner>
      ) : null}

      <div style={{ display: "grid", gap: 9 }}>
        <Check checked={manterTimes} onChange={setManterTimes} disabled={isBusy}>
          Manter os times cadastrados
        </Check>
        <Check checked={manterJogadores} onChange={setManterJogadores} disabled={isBusy}>
          Manter os jogadores cadastrados
        </Check>
        {!base.encerrada ? (
          <Check
            checked={arquivarAtual}
            onChange={setArquivarEscolha}
            tone="danger"
            disabled={isBusy}
          >
            Arquivar a temporada atual antes de limpar
            {ativaComSeries ? " (recomendado — preserva o histórico)" : ""}
          </Check>
        ) : null}
      </div>

      {manterJogadores && !manterTimes ? (
        <Banner tone="warn" title="Sem os times, os jogadores vão junto">
          Jogador precisa de um time existente: com os times apagados, os {base.jogadores}{" "}
          jogadores são descartados mesmo com a opção marcada.
        </Banner>
      ) : null}

      {manterTimes && manterJogadores && jogadoresSemTime > 0 ? (
        <Banner tone="warn" title={`${jogadoresSemTime} jogador(es) sem time válido`}>
          Eles não têm um time existente e serão descartados na virada.
        </Banner>
      ) : null}

      {ativaComSeries && !arquivarAtual ? (
        <Banner tone="danger" title="A temporada atual tem séries e não está encerrada">
          O servidor <strong>recusa</strong> iniciar uma nova assim. Marque para arquivar (ou
          encerre a temporada antes) — sem isso, o histórico não seria salvo em lugar nenhum.
        </Banner>
      ) : null}

      {/* #42 de novo: o caminho "iniciar" também consegue arquivar uma temporada vazia. */}
      {!base.encerrada && base.series === 0 && arquivarAtual ? (
        <Banner tone="warn" title="Arquivar uma temporada sem séries">
          A temporada atual não tem nenhuma série: arquivá-la cria um item vazio em /temporadas.
          Desmarque a opção acima se ela nunca chegou a acontecer.
        </Banner>
      ) : null}

      <Impacto
        titulo="O que acontece ao iniciar"
        linhas={[
          {
            rotulo: "Séries apagadas",
            valor: base.series > 0 ? `todas (${base.series})` : "nenhuma (já está vazia)",
            tone: base.series > 0 ? "danger" : undefined,
          },
          { rotulo: "Classificação", valor: "zerada", tone: "danger" },
          {
            rotulo: "Times",
            valor: manterTimes ? `${base.times} mantidos` : `${base.times} apagados`,
            tone: manterTimes ? "ok" : "danger",
          },
          {
            rotulo: "Jogadores",
            valor: `${jogadoresMantidos} mantidos · ${base.jogadores - jogadoresMantidos} apagados`,
            tone: jogadoresMantidos > 0 ? "ok" : "danger",
          },
          {
            rotulo: "Temporada atual",
            valor: base.encerrada
              ? "já encerrada"
              : arquivarAtual
                ? "arquivada antes de limpar"
                : "NÃO será arquivada",
            tone: base.encerrada ? undefined : arquivarAtual ? "ok" : "danger",
          },
          {
            rotulo: "Temporadas arquivadas",
            valor: `${base.arquivadas} → ${base.arquivadas + (!base.encerrada && arquivarAtual ? 1 : 0)}`,
          },
        ]}
      />

      <div
        style={{
          border: `1px solid rgba(212,87,74,.35)`,
          borderRadius: 3,
          background: "rgba(212,87,74,.06)",
          padding: "14px 14px 15px",
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.ink }}>Trava de segurança</p>

        {/* Fetch + blob, não navegação: um 403 aqui não pode tirar o organizador da tela no
            meio da trava de segurança. */}
        <BotaoExportarBackup tone="ghost">Exportar backup agora</BotaoExportarBackup>

        <Check checked={backupFeito} onChange={setBackupFeito} tone="danger" disabled={isBusy}>
          Já exportei/fiz o backup dos dados atuais.
        </Check>

        <Field label={`Digite ${CONFIRM_PHRASE} para confirmar`}>
          <Input
            value={confirmacao}
            onChange={setConfirmacao}
            placeholder={CONFIRM_PHRASE}
            disabled={isBusy}
          />
        </Field>
      </div>

      <div>
        <Button tone="gold" onClick={iniciar} disabled={!podeIniciar}>
          {/* #34: sem rótulo de progresso, dava para achar que o clique não pegou. */}
          {isBusy ? "Iniciando nova temporada..." : "Iniciar nova temporada"}
        </Button>
      </div>
    </ActionCard>
  );
}

// ---------------------------------------------------------------- arquivo

function ListaArquivadas({ draft }: Readonly<{ draft: TournamentDataset }>) {
  if (draft.archivedSeasons.length === 0) {
    return (
      <Empty title="Nenhuma temporada arquivada ainda">
        Ao encerrar uma temporada, o retrato dela aparece aqui e em{" "}
        <Link href="/temporadas" style={{ color: C.bronzeLit, textDecoration: "underline" }}>
          Temporadas
        </Link>
        .
      </Empty>
    );
  }

  const temporadas = [...draft.archivedSeasons].sort((a, b) =>
    (b.endedAtISO ?? b.archivedAtISO).localeCompare(a.endedAtISO ?? a.archivedAtISO),
  );

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {temporadas.map((temporada) => (
        <Link
          key={temporada.seasonId}
          href={`/temporadas/${encodeURIComponent(temporada.seasonId)}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 13px",
            borderRadius: 3,
            border: `1px solid ${C.line}`,
            background: "rgba(0,0,0,.24)",
            color: C.ink,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          <span style={{ fontWeight: 600, minWidth: 0 }}>{temporada.name}</span>
          <span style={{ fontSize: 11.5, color: C.ink4, flexShrink: 0, ...tabular }}>
            {temporada.snapshot.seriesMatches.length} séries · {formatDate(temporada.endedAtISO)}
          </span>
        </Link>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- painel

export function AdminTournamentPanel({
  draft,
  isBusy,
  onEndTournament,
  onStartTournament,
}: AdminTournamentPanelProps) {
  const rascunho = resumir(draft);
  const { estado, recarregar } = useResumoGravado(draft);

  const gravado = estado.situacao === "ok" ? estado.resumo : null;
  // Sem o gravado (rede fora, sessão expirando), o painel continua utilizável com os números da
  // tela — perder a ferramenta no meio do campeonato é pior que trabalhar com número aproximado.
  const base = gravado ?? rascunho;
  const divergencias = gravado ? listarDivergencias(gravado, rascunho) : [];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <SectionHead
        eyebrow="Ciclo de vida"
        title="Torneio"
        description="Encerrar e iniciar temporada gravam direto no servidor: não passam pelo botão salvar e não podem ser desfeitas pelo painel."
        actions={
          <Button
            small
            onClick={recarregar}
            disabled={estado.situacao === "carregando"}
            title="Ler de novo o estado gravado no servidor"
          >
            {estado.situacao === "carregando" ? "Conferindo..." : "Reconferir o gravado"}
          </Button>
        }
      />

      {estado.situacao === "erro" ? (
        <Banner tone="danger" title="Não consegui ler o estado gravado">
          {estado.mensagem} Os números abaixo são os do rascunho na tela e podem não bater com o
          que o servidor vai arquivar.
        </Banner>
      ) : null}

      {divergencias.length > 0 ? (
        <Banner
          tone="warn"
          title="O rascunho na tela está diferente do que está gravado"
          actions={
            <Chip tone="warn">
              {divergencias.length} diferença{divergencias.length > 1 ? "s" : ""}
            </Chip>
          }
        >
          <p style={{ margin: "0 0 10px" }}>
            Encerrar, iniciar ou importar usam o <strong>estado gravado</strong> e descartam estas
            edições. Salve antes se quiser que elas contem.
          </p>
          <ScrollX>
            <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 340 }}>
              <thead>
                <tr>
                  {["Campo", "Gravado", "Na tela"].map((coluna) => (
                    <th
                      key={coluna}
                      style={{
                        textAlign: "left",
                        padding: "4px 14px 6px 0",
                        fontSize: 10,
                        letterSpacing: ".14em",
                        textTransform: "uppercase",
                        color: C.ink4,
                        fontWeight: 600,
                      }}
                    >
                      {coluna}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {divergencias.map((linha) => (
                  <tr key={linha.campo}>
                    <td style={{ padding: "3px 14px 3px 0", color: C.ink3 }}>{linha.campo}</td>
                    <td style={{ padding: "3px 14px 3px 0", color: C.ink, ...tabular }}>
                      {linha.gravado}
                    </td>
                    <td style={{ padding: "3px 0", color: C.warnSoft, ...tabular }}>
                      {linha.rascunho}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollX>
        </Banner>
      ) : null}

      <StatusAtual rascunho={rascunho} />

      <div
        style={{
          display: "grid",
          gap: 16,
          alignItems: "start",
          gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
        }}
      >
        <CartaoEncerrar
          base={base}
          temGravado={gravado !== null}
          carregando={estado.situacao === "carregando"}
          isBusy={isBusy}
          onEndTournament={onEndTournament}
        />
        <CartaoIniciar
          base={base}
          temGravado={gravado !== null}
          carregando={estado.situacao === "carregando"}
          isBusy={isBusy}
          onStartTournament={onStartTournament}
        />
      </div>

      <div>
        <BlockTitle right={<Chip tone="neutro">{draft.archivedSeasons.length} no arquivo</Chip>}>
          Temporadas arquivadas
        </BlockTitle>
        <ListaArquivadas draft={draft} />
      </div>
    </div>
  );
}
