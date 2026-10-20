"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  Metric,
  ScrollX,
  SectionHead,
  Select,
  display,
  tabular,
} from "@/components/admin/ui";
import type { DraftPublico, PreviaDoDraft } from "@/lib/draft/store";

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
  teams: { id: string; name: string }[];
  players: { id: string; nick: string; teamId: string; role1: string; elo: string }[];
};

type Props = Readonly<{
  onAlert: (kind: "ok" | "erro", text: string) => void;
  podeConduzir: boolean;
  /** A virada e o calendário gravam o dataset por fora do editor: o painel precisa recarregar. */
  onDatasetMudou: () => void;
}>;

const MOTIVO_DA_PAUSA: Record<NonNullable<DraftPublico["motivoDaPausa"]>, string> = {
  organizacao: "pausado pela organização",
  atraso: "pausou sozinho: ficou mais de 10 escolhas sem ninguém acompanhando (sem sondagem)",
  sem_jogador: "pausou sozinho: o time da vez não tinha jogador possível",
};

const ROTULO_DA_FASE: Record<DraftPublico["fase"], { texto: string; tom: "neutro" | "gold" | "ok" | "warn" }> = {
  preparando: { texto: "Sorteado · aguardando início", tom: "gold" },
  rodando: { texto: "Ao vivo", tom: "ok" },
  pausado: { texto: "Pausado", tom: "warn" },
  encerrado: { texto: "Encerrado", tom: "neutro" },
};

function segundosAte(prazoISO: string | null, agoraMs: number): number | null {
  if (!prazoISO) return null;
  return Math.max(0, Math.ceil((Date.parse(prazoISO) - agoraMs) / 1000));
}

export function SecaoDraft({ onAlert, podeConduzir, onDatasetMudou }: Props) {
  const [dados, setDados] = useState<RespostaDoPainel | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [metodo, setMetodo] = useState<"maior_elo" | "manual">("maior_elo");
  const [manuais, setManuais] = useState<string[]>([]);
  const [confirmoDescartar, setConfirmoDescartar] = useState(false);
  /**
   * O jogador marcado para "escolher pelo time" vale só para a escolha em que foi marcado.
   * Guardado junto do número da escolha: virou a vez, a seleção some sozinha — sem isso o
   * nome escolhido para um time continuava selecionado na vez do seguinte.
   */
  const [selecao, setSelecao] = useState<{ escolha: number; id: string } | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoDaVirada | null>(null);
  const [confirmoVirada, setConfirmoVirada] = useState(false);
  const [confirmoCalendario, setConfirmoCalendario] = useState(false);
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
      setDados(corpo);
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
        // pública: quando a fase muda (pausou, terminou), relê tudo. A comparação fica num
        // ref, fora do updater do setState — o React pode rodar o updater depois.
        const situacao = `${corpo.draft.fase}|${corpo.draft.motivoDaPausa ?? ""}`;
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

  useEffect(() => {
    if (!aoVivo) return;
    const id = window.setInterval(() => setAgora(Date.now() + defasagem.current), 500);
    return () => window.clearInterval(id);
  }, [aoVivo]);

  const agir = async (corpo: Record<string, unknown>, ok: string): Promise<Record<string, unknown> | null> => {
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
    () => (previa?.capitaesPelaRegra ?? []).map((id) => jogadorPorId.get(id)).filter(Boolean),
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

  const podeSortear = podeConduzir && !ocupado && previa.impedimentos.length === 0 && previa.times > 0;
  const precisaConfirmarDescarte = Boolean(draft && draft.fase !== "preparando");
  const manuaisOk = manuais.length === previa.times;
  const metodoOk = metodo === "manual" ? manuaisOk : capitaesPelaRegra.length === previa.times;
  const timeDaVez = draft?.times.find((t) => t.id === draft.timeDaVezId) ?? null;
  const escolhaPeloTime =
    draft && selecao && selecao.escolha === draft.escolhaAtual && draft.escolhiveis.includes(selecao.id)
      ? selecao.id
      : "";
  const restante = draft ? segundosAte(draft.prazoISO, agora) : null;
  const semConta = previa.jogadores.filter((j) => !j.temConta);
  const capitaesSemConta = (draft?.times ?? [])
    .map((t) => ({ time: t, jogador: previa.jogadores.find((j) => j.riotId === t.capitaoRiotId) }))
    .filter((x) => x.jogador && !x.jogador.temConta);

  const alternarManual = (id: string) =>
    setManuais((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));

  return (
    <div>
      <SectionHead
        eyebrow="4ª Edição"
        title="Draft ao vivo"
        description="Sorteio dos capitães e da ordem, o draft em si, e a passagem dos times para o site. Projete a transmissão (/draft) na live; cada capitão escolhe pelo /capitao, logado na própria conta."
        actions={
          <>
            <a href="/draft" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Button small>Abrir a transmissão ↗</Button>
            </a>
            <a href="/capitao" target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Button small>Painel do capitão ↗</Button>
            </a>
            <Button small onClick={() => void carregar()} disabled={ocupado}>
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
      {draft ? (
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

      {/* ------------------------------------------------ conferência antes do sorteio */}
      <BlockTitle>1 · Conferência antes do sorteio</BlockTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginBottom: 14 }}>
        <Metric label="Times" value={previa.times} detail={previa.config.maxTimes ? `teto de ${previa.config.maxTimes}` : "sem teto"} />
        <Metric label="Aptos / vagas" value={`${previa.aptos} / ${previa.vagas}`} detail={`${previa.sobra} na sobra · ${previa.pendentes} pendente(s)`} />
        <Metric
          label="Pontos de quem joga"
          value={previa.totalDePontos}
          detail={previa.times > 0 ? `teto ${previa.times * previa.config.orcamentoPorTime}` : undefined}
        />
        <Metric
          label="Orçamento por time"
          value={previa.config.orcamentoPorTime}
          detail={previa.orcamentoSugerido !== null ? `regra (média + 15%): ${previa.orcamentoSugerido}` : "regra: média + 15%"}
        />
      </div>

      {previa.impedimentos.length > 0 ? (
        <Banner tone="danger" title="Ainda não dá para sortear">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {previa.impedimentos.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Banner>
      ) : null}

      {previa.orcamentoSugerido !== null && previa.orcamentoSugerido !== previa.config.orcamentoPorTime ? (
        <Banner tone="warn" title={`O orçamento configurado (${previa.config.orcamentoPorTime}) não é o da regra (${previa.orcamentoSugerido})`}>
          O regulamento manda média de pontos por time + 15%, arredondada para cima. Ajuste em Configuração antes de
          sortear — o orçamento entra no draft no momento do sorteio e não muda depois.
        </Banner>
      ) : null}

      {semConta.length > 0 ? (
        <Banner tone="warn" title={`${semConta.length} jogador(es) aptos sem conta ligada`}>
          {semConta.map((j) => j.riotId).join(", ")}. Se algum virar capitão, não conseguirá escolher pelo /capitao.
        </Banner>
      ) : null}

      {previa.semEloCongelado.length > 0 && !draft ? (
        <Banner tone="warn" title={`${previa.semEloCongelado.length} apto(s) com o elo ainda solto`}>
          O preço que entra no draft é o de agora, e o robô da Riot ainda mexe no elo toda manhã. Congele os elos
          (aba Times e vagas → «Congelar o elo dos aprovados») antes de divulgar a tabela e de sortear:{" "}
          {previa.semEloCongelado.slice(0, 12).join(", ")}
          {previa.semEloCongelado.length > 12 ? ` e mais ${previa.semEloCongelado.length - 12}` : ""}.
        </Banner>
      ) : null}

      {previa.inscricoesAbertas ? (
        <Banner tone="warn" title="As inscrições ainda estão abertas">
          Quem se inscrever agora recebe a cobrança da taxa sem ter vaga nos times. Feche as inscrições em
          Configuração (chave ou data de fechamento) antes do draft.
        </Banner>
      ) : null}

      <ActionCard
        tone="gold"
        title="Sortear capitães e ordem de escolha"
        description="Os capitães saem pela regra (maior elo na solo/duo, sem organizador) ou à mão. Depois o servidor sorteia qual time cada capitão capitaneia e a ordem do draft — a semente fica gravada para conferência."
        badge={draft ? <Chip tone="warn">já existe um sorteio</Chip> : undefined}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Select value={metodo} onChange={(v) => setMetodo(v === "manual" ? "manual" : "maior_elo")} ariaLabel="Como escolher os capitães">
            <option value="maior_elo">Pela regra: maior elo, sem organizador</option>
            <option value="manual">À mão</option>
          </Select>
          {metodo === "manual" ? (
            <>
              <span style={{ fontSize: 12.5, color: manuaisOk ? C.okSoft : C.warnSoft, ...tabular }}>
                {manuais.length} de {previa.times} marcados
              </span>
              {capitaesPelaRegra.length > 0 ? (
                <Button small onClick={() => setManuais(previa.capitaesPelaRegra)}>
                  Partir dos da regra
                </Button>
              ) : null}
            </>
          ) : null}
        </div>

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
            <p style={{ margin: 0, fontSize: 12.5, color: C.ink3 }}>
              Pela regra:{" "}
              {capitaesPelaRegra.map((j, i) => (
                <span key={j!.id}>
                  {i > 0 ? " · " : ""}
                  <b style={{ color: C.ink }}>{j!.riotId}</b> <span style={{ color: C.ink4 }}>({j!.forca})</span>
                </span>
              ))}
            </p>
          )
        ) : null}

        {precisaConfirmarDescarte ? (
          <Check checked={confirmoDescartar} onChange={setConfirmoDescartar} tone="danger">
            Já houve escolhas neste draft. Entendo que sortear de novo APAGA o draft atual.
          </Check>
        ) : null}

        <div>
          <Button
            tone="gold"
            disabled={!podeSortear || !metodoOk || (precisaConfirmarDescarte && !confirmoDescartar)}
            onClick={() =>
              void agir(
                {
                  acao: "montar",
                  metodo,
                  capitaes: metodo === "manual" ? manuais : undefined,
                  confirmoDescartar: precisaConfirmarDescarte ? confirmoDescartar : undefined,
                },
                "Capitães e ordem sorteados. Confira na transmissão.",
              ).then((r) => {
                if (r) setConfirmoDescartar(false);
              })
            }
          >
            {draft ? "Sortear de novo" : "Sortear"}
          </Button>
        </div>
      </ActionCard>

      <BlockTitle right={<span style={{ fontSize: 11.5, color: C.ink4 }}>do maior elo para o menor · organizadores no fim</span>}>
        Quem joga ({previa.jogadores.length})
      </BlockTitle>
      {previa.jogadores.length === 0 ? (
        <Empty title="Nenhum apto ainda">Os aptos aparecem aqui conforme a conferência avança.</Empty>
      ) : (
        <ScrollX>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
            <thead>
              <tr style={{ textAlign: "left", color: C.bronze, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase" }}>
                {metodo === "manual" ? <th style={{ padding: "8px 10px" }}>Capitão</th> : null}
                <th style={{ padding: "8px 10px" }}>Riot ID</th>
                <th style={{ padding: "8px 10px" }}>Elo (solo/duo)</th>
                <th style={{ padding: "8px 10px" }}>Pts</th>
                <th style={{ padding: "8px 10px" }}>Rotas</th>
                <th style={{ padding: "8px 10px" }} />
              </tr>
            </thead>
            <tbody>
              {previa.jogadores.map((j) => {
                const pelaRegra = previa.capitaesPelaRegra.includes(j.id);
                return (
                  <tr key={j.id} style={{ borderTop: `1px solid ${C.line}` }}>
                    {metodo === "manual" ? (
                      <td style={{ padding: "8px 10px" }}>
                        <input
                          type="checkbox"
                          aria-label={`Marcar ${j.riotId} como capitão`}
                          checked={manuais.includes(j.id)}
                          disabled={j.organizador}
                          onChange={() => alternarManual(j.id)}
                          style={{ accentColor: C.bronze, width: 15, height: 15 }}
                        />
                      </td>
                    ) : null}
                    <td style={{ padding: "8px 10px", color: C.ink }}>{j.riotId}</td>
                    <td style={{ padding: "8px 10px", color: C.ink2 }}>{j.forca}</td>
                    <td style={{ padding: "8px 10px", color: C.bronzeHi, ...tabular }}>{j.pontos}</td>
                    <td style={{ padding: "8px 10px", color: C.ink3 }}>
                      {j.rota1} / {j.rota2}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                        {pelaRegra ? <Chip tone="gold">capitão pela regra</Chip> : null}
                        {j.organizador ? <Chip tone="off">organização · não capitaneia</Chip> : null}
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
            {draft.times.map((t, i) => (
              <Card key={t.id} padding="13px 14px" style={{ borderLeft: `3px solid ${t.cor}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontFamily: display, fontSize: 16, color: t.cor }}>
                    {i + 1}º · {t.nome}
                  </span>
                  <span style={{ fontSize: 11.5, color: C.ink3, ...tabular }}>
                    {t.gasto}/{draft.orcamentoPorTime} pts
                  </span>
                </div>
                <div style={{ fontSize: 12, color: C.ink2, marginTop: 4 }}>Capitão: {t.capitaoRiotId}</div>
                <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none", fontSize: 12, color: C.ink3 }}>
                  {(draft.elencos[t.id] ?? []).map((j) => (
                    <li key={j.riotId}>
                      {j.capitao ? "★ " : "· "}
                      {j.riotId} <span style={{ color: C.ink4 }}>({j.pontos})</span>
                    </li>
                  ))}
                  {t.vagas > 0 ? <li style={{ color: C.ink4 }}>{t.vagas} vaga(s) abertas</li> : null}
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

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {draft.fase === "preparando" ? (
              <Button tone="gold" disabled={!podeConduzir || ocupado} onClick={() => void agir({ acao: "iniciar" }, "Draft iniciado. O relógio está correndo.")}>
                Iniciar o draft
              </Button>
            ) : null}
            {draft.fase === "rodando" ? (
              <Button disabled={!podeConduzir || ocupado} onClick={() => void agir({ acao: "pausar" }, "Draft pausado.")}>
                Pausar
              </Button>
            ) : null}
            {draft.fase === "pausado" ? (
              <Button tone="gold" disabled={!podeConduzir || ocupado} onClick={() => void agir({ acao: "retomar" }, "Draft retomado. O prazo da escolha recomeçou.")}>
                Retomar
              </Button>
            ) : null}
          </div>

          {aoVivo && timeDaVez ? (
            <ActionCard
              tone="warn"
              title={`Escolher pelo ${timeDaVez.nome}`}
              description="Para quando o capitão não consegue entrar e diz no Discord quem quer. Só vale para o time da vez, e fica registrado na auditoria."
              style={{ marginTop: 14 }}
            >
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
                    void agir(
                      { acao: "escolher", jogadorId: escolhaPeloTime, timeId: vez.timeId, escolha: vez.escolha },
                      `${alvo.riotId} escolhido para ${vez.nome}.`,
                    ).then(
                      (r) => {
                        if (r) setSelecao(null);
                      },
                    );
                  }}
                >
                  Escolher
                </Button>
              </div>
            </ActionCard>
          ) : null}
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
              {previsao.teams.map((t) => (
                <Card key={t.id} padding="10px 12px">
                  <div style={{ fontFamily: display, color: C.ink }}>{t.name}</div>
                  <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none", fontSize: 12, color: C.ink3 }}>
                    {previsao.players
                      .filter((p) => p.teamId === t.id)
                      .map((p) => (
                        <li key={p.id}>
                          {p.nick} · {p.role1} · {p.elo}
                        </li>
                      ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        ) : null}
        <Check checked={confirmoVirada} onChange={setConfirmoVirada}>
          Conferi os elencos e a 4ª Edição já foi iniciada em Torneio.
        </Check>
        <div>
          <Button
            tone="gold"
            disabled={!podeConduzir || ocupado || draft?.fase !== "encerrado" || !confirmoVirada}
            onClick={() =>
              void agir({ acao: "virar" }, "Times e jogadores aplicados no site.").then((r) => {
                if (r) {
                  setConfirmoVirada(false);
                  onDatasetMudou();
                }
              })
            }
          >
            Aplicar no site
          </Button>
        </div>
      </ActionCard>

      {/* ------------------------------------------------ calendário */}
      <BlockTitle>4 · Calendário</BlockTitle>
      <ActionCard
        tone="gold"
        title="Sortear as posições e criar as 15 séries"
        description="Sorteia qual time é o Time 1 … Time 6 do calendário publicado e cria as 15 séries da fase de pontos com data e hora (20/11 a 28/11). Semifinais e final são criadas depois, no painel de Séries, quando a tabela fechar. Só funciona com os times do draft já aplicados e a temporada ainda sem séries."
      >
        <Check checked={confirmoCalendario} onChange={setConfirmoCalendario}>
          Os times do draft já estão no site. Pode sortear as posições.
        </Check>
        <div>
          <Button
            tone="gold"
            disabled={!podeConduzir || ocupado || !confirmoCalendario}
            onClick={() =>
              void agir({ acao: "calendario" }, "Posições sorteadas e 15 séries criadas.").then((r) => {
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
    </div>
  );
}
