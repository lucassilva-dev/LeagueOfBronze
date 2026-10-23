import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";
import { ErroDeRegra } from "@/lib/security/erros";
import { identidadeDoTime } from "@/lib/draft/times";
import {
  escolhiveisDaVez,
  estadoFecha,
  impedimentosDoSorteio,
  montarDraft,
  timeDaVez,
  type EstadoDraft,
  type JogadorDoDraft,
  type MotivoDaPausa,
  type TimeDoDraft,
} from "@/lib/draft/motor";
import { lerConfig, listarInscricoes, type EdicaoConfig, type Inscricao } from "@/lib/inscricoes/store";
import { distribuirTimes, estadoDaJanela } from "@/lib/inscricoes/schema";
import { forcaDoElo, rankingDeCapitaes, type CandidatoACapitao } from "@/lib/draft/capitaes";
import { eloDoJogadorDaInscricao, eloQueVale, temEloReconhecido } from "@/lib/draft/elo-da-inscricao";
import {
  calcularTabela,
  precoNaTabela,
  retratoDaTabela,
  rotuloDaClasse,
  type RetratoDaTabela,
  type TabelaDePontos,
} from "@/lib/draft/precos";
import { tabelaQueFecha, tentativasDaQueda, type TabelaQueFecha } from "@/lib/draft/tabela-que-fecha";
import { ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";
import { jogadoresForaDoDraft, type ForaDoDraft } from "@/lib/draft/virada";
import { embaralhar, novaSemente } from "@/lib/series/sorteio";

/**
 * Persistência do draft.
 *
 * O estado inteiro mora numa linha jsonb (`draft_estado`), e a gravação é condicionada
 * à revisão que foi lida. O draft é o momento em que mais gente escreve ao mesmo tempo
 * — dez capitães e o cronômetro — e sem essa condição duas escolhas simultâneas se
 * sobrescrevem em silêncio.
 */

export type DraftGravado = { estado: EstadoDraft | null; revisao: number };

export async function lerDraftCompleto(): Promise<DraftGravado> {
  const { data, error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .select("estado,revisao")
    .eq("id", 1)
    .maybeSingle<{ estado: EstadoDraft | null; revisao: number }>();

  if (error) throw new Error(`Falha ao ler o draft: ${error.message}`);
  return { estado: data?.estado ?? null, revisao: data?.revisao ?? 0 };
}

/**
 * Grava SE a revisão ainda for a que foi lida.
 *
 * Devolve `false` quando alguém gravou no meio do caminho — quem chama recarrega e
 * decide. Não é erro: num draft ao vivo, perder a corrida por milissegundos é o
 * comportamento esperado, e o capitão precisa ver o estado novo, não uma falha.
 */
export async function salvarDraftSeIntacto(
  estado: EstadoDraft,
  revisaoLida: number,
): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("draft_estado")
    .update({ estado, revisao: revisaoLida + 1, atualizado_em: new Date().toISOString() })
    .eq("id", 1)
    .eq("revisao", revisaoLida)
    .select("revisao");

  if (error) throw new Error(`Falha ao salvar o draft: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

// ---------------------------------------------------------------- montagem

/**
 * Como os capitães são escolhidos.
 *
 * `maior_elo` é o do regulamento da 4ª: maior elo na solo/duo, qualquer rota, sem
 * organizador (ver lib/draft/capitaes.ts). `manual` é a saída quando há empate no corte
 * ou a organização decide outra coisa. `mid`, `adc` e `pior` vêm do design entregue e
 * continuam aceitos pela rota, mas o painel não os oferece — nenhum cumpre a regra.
 * (`voluntarios` saiu: o formulário da 4ª não pergunta mais quem quer ser capitão, e o
 * método nunca encontraria ninguém.)
 */
export type MetodoDeCapitao = "maior_elo" | "mid" | "adc" | "pior" | "manual";

/**
 * O candidato a capitão com a MESMA fotografia do preço (`eloDoJogadorDaInscricao`): depois
 * do congelamento, divisão e PDL congelados; antes, a última leitura da Riot. Sem isso o
 * corte dos capitães andaria com o robô enquanto o preço ficou parado — o capitão "de maior
 * elo" poderia mudar depois de a tabela ser divulgada.
 */
function candidatoACapitao(i: Inscricao): CandidatoACapitao {
  const elo = eloDoJogadorDaInscricao(i);
  return {
    id: i.id,
    riotId: i.riot_id,
    organizador: i.organizador,
    elo: elo.elo,
    eloRiot: elo.eloRiot ?? null,
    divisao: elo.divisao ?? null,
    pdl: elo.pdl ?? null,
  };
}

/**
 * A tabela de pontos automática de quem joga (lib/draft/precos.ts) e o preço de cada um.
 *
 * O pool são os `apto` — exatamente quem o sorteio usa. Elo que a tabela do site não
 * reconhece não tem preço: fica de fora da conta e volta como impedimento (a ficha precisa
 * ser corrigida antes de sortear), em vez de derrubar a tela inteira.
 *
 * `inscricoes.pontos` (a tabela fixa por elo da 3ª) continua no banco para o robô e os
 * alertas, mas o draft não a usa mais.
 */
function tabelaDosQueJogam(vaoJogar: readonly Inscricao[], times: number, config: EdicaoConfig) {
  const comElo = vaoJogar.filter((i) => temEloReconhecido(i));
  const tabela = calcularTabela({
    pool: comElo.map(eloDoJogadorDaInscricao),
    times,
    jogadoresPorTime: config.jogadores_por_time,
    orcamentoPorTime: config.orcamento_por_time,
  });
  const precoDe = new Map(comElo.map((i) => [i.id, precoNaTabela(tabela, eloDoJogadorDaInscricao(i))]));
  const semElo = vaoJogar
    .filter((i) => !temEloReconhecido(i))
    .map((i) => `O elo de ${i.riot_id} (${eloQueVale(i)}) não é reconhecido e não tem preço na tabela: corrija na ficha antes de sortear.`);
  return { tabela, precoDe, semElo };
}

/**
 * A tabela com OS CAPITÃES: a pedida (curvatura padrão, soma exata) se os elencos fecham com
 * eles; senão a primeira que fecha descendo a curvatura e, no limite, a soma
 * (lib/draft/tabela-que-fecha.ts). A prévia usa os capitães da regra; a montagem, os
 * escolhidos. Os dois chegam na mesma tabela para os mesmos capitães.
 */
function tabelaComOsCapitaes(vaoJogar: readonly Inscricao[], capitaes: readonly string[], times: number, config: EdicaoConfig): TabelaQueFecha {
  return tabelaQueFecha({
    pool: vaoJogar.filter((i) => temEloReconhecido(i)).map((i) => ({ id: i.id, elo: eloDoJogadorDaInscricao(i) })),
    capitaes,
    times,
    jogadoresPorTime: config.jogadores_por_time,
    orcamentoPorTime: config.orcamento_por_time,
  });
}

/** O retrato que sai do servidor: a tabela, de onde a conta desceu e se o pool é o do sorteio. */
function retratoComQueda(conta: Pick<TabelaQueFecha, "tabela" | "queda">, poolIncompleto: boolean): RetratoDaTabela {
  return {
    ...retratoDaTabela(conta.tabela),
    queda: conta.queda,
    ...(poolIncompleto ? { poolIncompleto: true } : {}),
  };
}

/**
 * Por que o sorteio não fecha, no recado de recusa da montagem. Com a soma exata o motivo é
 * outro que o de antes ("orçamento curto"): é a repartição — e subir o orçamento não resolve
 * sozinho, porque a tabela é recalculada junto. A conta já tentou descer a curvatura e a
 * soma antes de chegar aqui. A mesa diz o mesmo no aviso da prévia.
 */
function motivoDeNaoFechar(tabela: TabelaDePontos, times: number, orcamento: number): string {
  const ultima = tentativasDaQueda(tabela.curvatura, times).at(-1)?.menos ?? 0;
  const tentou = ` A conta também tentou baixar a curvatura até 0 e a soma até ${tabela.alvo - ultima}, e nenhuma fechou.`;
  return tabela.folga === 0
    ? `A tabela de pontos soma exatamente ${tabela.alvo} (${times} × ${orcamento}), então cada time precisa terminar com os ${orcamento} pontos certinhos — e com estes capitães não existe divisão dos outros jogadores que feche todos os elencos.${tentou}`
    : `Com estes capitães, não há como fechar os ${times} elencos dentro de ${orcamento} pontos por time com os jogadores aprovados.${tentou}`;
}

/** `listarInscricoes` lê `*`; o tipo não declara a conta porque o resto do código não a usa. */
function temConta(i: Inscricao): boolean {
  return Boolean((i as Inscricao & { jogador_id?: string | null }).jogador_id);
}

/**
 * Tudo o que a organização precisa ver ANTES de sortear, sem gravar nada.
 *
 * É a tela de conferência do painel do draft: quantos times, quem joga, se o orçamento
 * fecha, quem seriam os capitães pela regra — e se algum deles não tem conta de jogador,
 * o que o impediria de escolher na hora (a escolha é autenticada pela conta).
 *
 * Com um draft já sorteado, também diz quem está nele e NÃO é mais apto (`foraDoDraft`):
 * recusado ou desistente depois do sorteio continuava no pool e nos elencos sem a mesa
 * saber. `draftLido` é a leitura do draft que quem chama já fez (o GET do painel lê os dois
 * em paralelo); sem ela, a prévia lê sozinha.
 */
export async function previaDoDraft(draftLido?: DraftGravado | Promise<DraftGravado>) {
  const [config, inscritos, draft] = await Promise.all([
    lerConfig(),
    listarInscricoes(),
    draftLido ?? lerDraftCompleto(),
  ]);

  const aprovados = inscritos.filter((i) => i.situacao === "apto" || i.situacao === "sobra");
  const vaoJogar = inscritos.filter((i) => i.situacao === "apto");
  const maxTimes = config.max_times ?? null;
  const { times, vagas } = distribuirTimes(aprovados.length, config.jogadores_por_time, maxTimes);

  // O preço de cada um sai da tabela automática, calculada sobre quem joga.
  const pedida = tabelaDosQueJogam(vaoJogar, times, config);

  const impedimentos = [
    ...impedimentosDoSorteio({
      pontosDosQueJogam: vaoJogar.map((i) => pedida.precoDe.get(i.id) ?? 0),
      vagas,
      times,
      orcamentoPorTime: config.orcamento_por_time,
      totalDeAprovados: aprovados.length,
    }),
    ...pedida.semElo,
  ];

  const ranking = rankingDeCapitaes(vaoJogar.map(candidatoACapitao), times);
  const porId = new Map(vaoJogar.map((i) => [i.id, i]));

  // Com a lista certa (sem impedimento) e os capitães da regra definidos, a tabela é a que
  // fecha com eles — a pedida ou a primeira que fecha descendo a curvatura e a soma. Sem
  // isso, é a pedida, e não dá para saber ainda se fecha.
  const comCapitaes =
    impedimentos.length === 0 && ranking.escolhidos.length === times && times > 0
      ? tabelaComOsCapitaes(vaoJogar, ranking.escolhidos, times, config)
      : null;
  const conta = comCapitaes ?? { tabela: pedida.tabela, precoDe: pedida.precoDe, queda: null };
  const fechaComOsCapitaesDaRegra = comCapitaes ? comCapitaes.fecha : null;
  const precoDoInscrito = (i: Inscricao) => conta.precoDe.get(i.id) ?? 0;
  const totalDePontos = vaoJogar.reduce((soma, i) => soma + precoDoInscrito(i), 0);

  return {
    config: {
      jogadoresPorTime: config.jogadores_por_time,
      maxTimes,
      orcamentoPorTime: config.orcamento_por_time,
      segundosPorEscolha: config.segundos_por_escolha,
    },
    times,
    vagas,
    aprovados: aprovados.length,
    aptos: vaoJogar.length,
    sobra: inscritos.filter((i) => i.situacao === "sobra").length,
    pendentes: inscritos.filter((i) => i.situacao === "pendente").length,
    impedimentos,
    totalDePontos,
    /**
     * Sempre nulo: a regra antiga (média + 15%) saiu. Continua na resposta por uma versão
     * porque o painel anterior ao deploy testa `!== null` — sem a chave, ele mostrava o
     * banner "O orçamento configurado (30) não é o da regra (undefined)".
     */
    orcamentoSugerido: null,
    // A tabela de pontos desta edição (substitui a regra antiga "média + 15%"). Nula sem
    // time fechado ou sem ninguém com preço. Com aptos ≠ vagas ela vem marcada como pool
    // incompleto: dá ideia dos preços, mas a tela não a mostra como fechada.
    tabela: times > 0 && conta.precoDe.size > 0 ? retratoComQueda(conta, vaoJogar.length !== vagas) : null,
    // Os capitães da regra fecham os elencos com esta tabela (já com a queda, se houve)? Nulo
    // quando não dá para saber ainda (lista com impedimento, empate no corte, faltam capitães).
    fechaComOsCapitaesDaRegra,
    // Quem joga, do maior elo para o menor, com os organizadores no fim (não capitaneiam).
    jogadores: [
      ...ranking.ranking.map((c) => c.id),
      ...vaoJogar.filter((i) => i.organizador).map((i) => i.id),
    ].map((id) => {
      const i = porId.get(id)!;
      return {
        id: i.id,
        riotId: i.riot_id,
        elo: eloQueVale(i),
        forca: forcaDoElo(candidatoACapitao(i)).rotulo,
        pontos: precoDoInscrito(i),
        rota1: i.rota_primaria,
        rota2: i.rota_secundaria,
        organizador: i.organizador,
        temConta: temConta(i),
      };
    }),
    capitaesPelaRegra: ranking.escolhidos,
    empateNoCorte: ranking.empateNoCorte,
    faltamCapitaes: ranking.faltam,
    // O preço que entra no draft é o de agora. Sem congelar, o robô da Riot ainda mexe no
    // elo de manhã — e a tabela divulgada pode não bater com o draft.
    semEloCongelado: vaoJogar.filter((i) => !i.elo_congelado).map((i) => i.riot_id),
    // Inscrição aberta durante o draft cobra taxa de quem não tem mais vaga.
    inscricoesAbertas: estadoDaJanela(config) === "aberta",
    // Quem está no draft sorteado e a inscrição não é mais `apto` (só Riot ID e situação).
    // É aviso: o draft não tira ninguém sozinho, e a virada pede confirmação.
    foraDoDraft: jogadoresForaDoDraft(draft.estado, inscritos),
  };
}

/**
 * Os campos mais novos são opcionais no tipo: a tela aguenta a resposta de um servidor
 * anterior a eles (o painel aberto durante um deploy recebe a resposta velha).
 */
export type PreviaDoDraft = Omit<
  Awaited<ReturnType<typeof previaDoDraft>>,
  "foraDoDraft" | "tabela" | "fechaComOsCapitaesDaRegra" | "orcamentoSugerido"
> & {
  foraDoDraft?: ForaDoDraft[];
  tabela?: RetratoDaTabela | null;
  fechaComOsCapitaesDaRegra?: boolean | null;
  /**
   * O orçamento pela regra antiga (média + 15%): um número só na resposta de um servidor
   * anterior à tabela automática; o atual manda sempre nulo. A tela não usa mais — a regra
   * mudou para orçamento fixo.
   */
  orcamentoSugerido?: number | null;
};

/**
 * O estado do draft com o retrato da tabela de pontos usada no sorteio. Opcional: drafts
 * montados antes da tabela automática não têm, e o motor nem olha para ele — é o registro
 * de onde saiu cada preço, e a transmissão e o painel o leem (`paraPublico`) para
 * precificar reservas com a tabela do sorteio.
 */
export type EstadoDraftComTabela = EstadoDraft & { tabelaDePontos?: RetratoDaTabela };

/**
 * Monta o draft a partir de quem foi aprovado — e SORTEIA a ordem.
 *
 * O número de times é DERIVADO (`distribuirTimes`), com o teto `max_times` da
 * Configuração (6 na 4ª Edição). Quem sobra da divisão fica fora do sorteio. É por isso
 * que a organização precisa fechar a lista de aprovados antes de montar.
 *
 * "Um sorteio ao vivo define qual time cada capitão vai capitanear e a ordem de escolha
 * do draft" (regulamento). Antes a ordem saía da própria lista de capitães — por pontos,
 * ou pela ordem em que alguém clicou —, então o capitão de maior elo escolhia primeiro
 * em toda montagem. Agora a lista é embaralhada por uma semente nova (`embaralhar`), e a
 * semente fica gravada no estado: com ela e a lista de entrada, qualquer pessoa refaz o
 * sorteio e confere.
 */
export async function montarDraftDosAprovados(params: {
  metodo: MetodoDeCapitao;
  capitaesManuais?: string[];
}): Promise<EstadoDraftComTabela> {
  const config = await lerConfig();
  const inscritos = await listarInscricoes();

  // "sobra" também é aprovado — conta para decidir QUANTOS times cabem. Quem joga,
  // porém, são só os "apto": a sobra é justamente quem a organização decidiu deixar
  // de fora.
  const aprovados = inscritos.filter((i) => i.situacao === "apto" || i.situacao === "sobra");
  const vaoJogar = inscritos.filter((i) => i.situacao === "apto");
  const { times: quantosTimes, vagas } = distribuirTimes(
    aprovados.length,
    config.jogadores_por_time,
    config.max_times ?? null,
  );

  // O preço de cada um sai da tabela automática desta edição, calculada sobre quem joga —
  // não da coluna `pontos` do banco, que é a tabela fixa por elo da 3ª. Esta é a PEDIDA; com
  // os capitães escolhidos, mais abaixo, ela pode descer (`tabelaComOsCapitaes`).
  const { precoDe, semElo } = tabelaDosQueJogam(vaoJogar, quantosTimes, config);
  const pool: JogadorDoDraft[] = vaoJogar.map((i) => ({
    id: i.id,
    riotId: i.riot_id,
    pontos: precoDe.get(i.id) ?? 0,
    rota1: i.rota_primaria,
    rota2: i.rota_secundaria,
    elo: eloQueVale(i),
    // A classe de preço ("Ouro II", "Mestre · 200–299 PDL"): o preço varia por divisão, e a
    // transmissão mostra por que dois Ouros custam diferente.
    ...(temEloReconhecido(i) ? { classe: rotuloDaClasse(eloDoJogadorDaInscricao(i)) } : {}),
    timeId: null,
  }));

  // As duas regras que já falharam ficam numa função pura, testável sem banco:
  // quem joga tem de ser exatamente as vagas (senão a decisão da organização sobre
  // quem sobra era apagada por um corte na ordem de inscrição), e a soma dos pontos
  // tem de caber no teto (senão o draft entra ao vivo já condenado a travar).
  const impedimentos = [
    ...impedimentosDoSorteio({
      pontosDosQueJogam: pool.map((j) => j.pontos),
      vagas,
      times: quantosTimes,
      orcamentoPorTime: config.orcamento_por_time,
      totalDeAprovados: aprovados.length,
    }),
    ...semElo,
  ];

  if (impedimentos.length > 0) throw new ErroDeRegra(impedimentos.join(" "));

  const capitaes = escolherCapitaes({
    aprovados: pool,
    inscritos: vaoJogar,
    rotaPorInscrito: new Map(vaoJogar.map((i) => [i.id, i.rota_primaria])),
    quantos: quantosTimes,
    metodo: params.metodo,
    manuais: params.capitaesManuais ?? [],
  });

  // Organizador não capitaneia (regulamento) — nem à mão. Quem marcou à mão um
  // organizador estava prestes a quebrar a regra publicada na frente do grupo.
  const organizadores = new Set(vaoJogar.filter((i) => i.organizador).map((i) => i.id));
  const organizadorCapitao = capitaes.find((id) => organizadores.has(id));
  if (organizadorCapitao) {
    const riotId = pool.find((j) => j.id === organizadorCapitao)?.riotId ?? organizadorCapitao;
    throw new ErroDeRegra(`${riotId} é da organização, e organizador não é capitão nesta edição.`);
  }

  // A tabela com ESTES capitães: a pedida, se os elencos fecham com ela; senão a primeira
  // que fecha descendo a curvatura e a soma. Os preços do pool passam a ser os dela.
  const conta = tabelaComOsCapitaes(vaoJogar, capitaes, quantosTimes, config);
  const tabela = conta.tabela;
  for (const jogador of pool) jogador.pontos = conta.precoDe.get(jogador.id) ?? jogador.pontos;

  const semente = novaSemente();
  const sorteados = embaralhar(semente, "capitaes", capitaes);

  const times: TimeDoDraft[] = sorteados.map((capitaoId, i) => ({
    id: `time-${i + 1}`,
    ...identidadeDoTime(i),
    capitaoId,
  }));

  /*
   * O orçamento também tem de fechar POR TIME, e não só na soma.
   *
   * `impedimentosDoSorteio`, acima, compara o total de pontos com
   * `times × orcamentoPorTime` — o que garante que os elencos fecham na MÉDIA. Mas o
   * capitão já entra no elenco e já custa pontos, e ele só é conhecido aqui embaixo
   * (`escolherCapitaes` roda depois daquela checagem). Um capitão caro sozinho pode não
   * deixar nem o mínimo de 1 ponto por vaga restante.
   *
   * O motor tem uma rede para isso — quando ninguém cabe, `avancarPorTempo` PAUSA em vez
   * de travar calado —, e ela continua valendo. Mas pausar acontece ao vivo, na vez do
   * time, com a transmissão no ar. Conferir aqui move a descoberta para a montagem, que é
   * quando ainda dá para trocar o capitão ou subir o orçamento.
   *
   * A checagem fica NESTE fluxo, e não dentro de `montarDraft`: aquele é o construtor puro
   * e precisa continuar podendo montar qualquer estado — inclusive o insustentável que os
   * testes usam justamente para exercitar a pausa.
   */
  const jogadoresPorTime = config.jogadores_por_time;
  const orcamento = config.orcamento_por_time;
  if (jogadoresPorTime > 1) {
    for (const time of times) {
      const capitao = pool.find((j) => j.id === time.capitaoId);
      if (!capitao) continue;
      const sobra = orcamento - capitao.pontos;
      if (sobra < jogadoresPorTime - 1) {
        throw new ErroDeRegra(
          `O capitão do ${time.nome} custa ${capitao.pontos} pontos e sobrariam ${sobra} para preencher ${jogadoresPorTime - 1} vaga(s) — é preciso ao menos 1 ponto por vaga. Escolha outro capitão para esse time ou suba o orçamento por time.`,
        );
      }
    }
  }

  const estado = montarDraft({
    times,
    jogadores: pool,
    jogadoresPorTime: config.jogadores_por_time,
    orcamentoPorTime: config.orcamento_por_time,
    segundosPorEscolha: config.segundos_por_escolha,
  });

  // A conta de verdade, com os preços que existem: sem ela, a checagem acima (1 ponto por
  // vaga) deixava ir ao ar um draft que travaria no meio. Com a soma da tabela exata, é
  // aqui que aparece o pool em que os capitães não deixam os elencos fecharem.
  // Depende só de capitães e orçamento, não da ordem sorteada.
  if (!estadoFecha(estado, ORCAMENTO_DA_MONTAGEM)) {
    throw new ErroDeRegra(
      `${motivoDeNaoFechar(tabela, quantosTimes, orcamento)} Troque os capitães (à mão) ou mude o orçamento por time em Configuração — a tabela é recalculada com o orçamento novo.`,
    );
  }

  return {
    ...estado,
    sorteio: { semente, capitaes, emISO: new Date().toISOString() },
    // De onde saiu cada preço: fica gravado com o sorteio, para conferir depois — e é a
    // tabela que a regra do substituto usa depois do draft.
    tabelaDePontos: retratoComQueda(conta, false),
  };
}

/**
 * Quem capitaneia.
 *
 * A ordenação é sempre determinística (desempate por id) para que montar duas vezes com
 * a mesma lista dê os MESMOS capitães — num sorteio, "deu diferente e ninguém sabe por
 * quê" é pior do que qualquer critério. O que é aleatório é só a ordem, depois daqui.
 */
function escolherCapitaes(params: {
  aprovados: readonly JogadorDoDraft[];
  inscritos: readonly Inscricao[];
  rotaPorInscrito: Map<string, string>;
  quantos: number;
  metodo: MetodoDeCapitao;
  manuais: readonly string[];
}): string[] {
  const { aprovados, inscritos, rotaPorInscrito, quantos, metodo, manuais } = params;

  if (metodo === "manual") {
    if (manuais.length !== quantos) {
      throw new ErroDeRegra(`Escolha exatamente ${quantos} capitães (você marcou ${manuais.length}).`);
    }
    // Repetido cria um time SEM capitão alcançável: `montarDraft` liga o jogador ao
    // primeiro time que o reivindica, e o segundo nasce com o elenco vazio. Ninguém
    // consegue escolher por ele, todas as escolhas caem no auto-pick, e a virada fica
    // travada para sempre com "time X tem 4 de 5 jogadores" — descoberto no fim do
    // evento ao vivo, quando o conserto é refazer o sorteio inteiro.
    if (new Set(manuais).size !== manuais.length) {
      throw new ErroDeRegra("Um mesmo jogador foi marcado como capitão de mais de um time.");
    }

    const validos = new Set(aprovados.map((j) => j.id));
    for (const id of manuais) {
      if (!validos.has(id)) throw new ErroDeRegra("Um dos capitães escolhidos não está entre os aprovados.");
    }
    return [...manuais];
  }

  if (metodo === "maior_elo") {
    const ranking = rankingDeCapitaes(inscritos.map(candidatoACapitao), quantos);
    if (ranking.faltam > 0) {
      throw new ErroDeRegra(
        `Não há aprovados suficientes fora da organização para ${quantos} capitães (faltam ${ranking.faltam}).`,
      );
    }
    if (ranking.empateNoCorte) {
      throw new ErroDeRegra(
        `Empate de elo no corte dos capitães: ${ranking.empateNoCorte.join(", ")}. O regulamento não diz como desempatar — decida e marque os ${quantos} capitães à mão.`,
      );
    }
    return ranking.escolhidos;
  }

  // Os métodos antigos também pulam a organização: a regra de que organizador não é
  // capitão vale para qualquer método, e o manual é conferido em quem chama.
  const organizadores = new Set(inscritos.filter((i) => i.organizador).map((i) => i.id));
  const elegiveis = aprovados.filter((j) => !organizadores.has(j.id));
  const porPontosDesc = [...elegiveis].sort((a, b) => b.pontos - a.pontos || a.id.localeCompare(b.id));
  const porPontosAsc = [...elegiveis].sort((a, b) => a.pontos - b.pontos || a.id.localeCompare(b.id));

  const candidatos =
    metodo === "pior"
      ? porPontosAsc
      : porPontosDesc.filter((j) => rotaPorInscrito.get(j.id) === (metodo === "mid" ? "MID" : "ADC"));

  if (candidatos.length < quantos) {
    const oQue = metodo === "pior" ? "aprovados" : `jogadores de ${metodo === "mid" ? "meio" : "atirador"}`;
    throw new ErroDeRegra(
      `Não há ${oQue} suficientes: ${candidatos.length} para ${quantos} times. Escolha outro método ou defina à mão.`,
    );
  }

  return candidatos.slice(0, quantos).map((j) => j.id);
}

/**
 * A visão PÚBLICA do draft.
 *
 * A transmissão é aberta, então tudo o que sai daqui é lido por qualquer pessoa: nada
 * de e-mail, WhatsApp, Discord ou id de inscrição. Sai o Riot ID, que é o nome de
 * jogo, e mais nada que identifique alguém fora do jogo.
 */
export type DraftPublico = {
  /**
   * Numeração da gravação, vinda da coluna `revisao`.
   *
   * Serve às telas para descartar resposta atrasada: numa rede ruim, a resposta de um
   * POST pode chegar DEPOIS de uma sondagem mais nova e fazer o quadro andar para
   * trás — mostrando de novo, como disponível, alguém que já foi escolhido. Não dá
   * para usar `escolhaAtual` no lugar: ele volta a zero quando o draft é remontado, e
   * a tela passaria a descartar tudo o que é novo. A revisão só cresce.
   */
  revisao: number;
  fase: EstadoDraft["fase"];
  times: { id: string; nome: string; cor: string; capitaoRiotId: string; gasto: number; vagas: number }[];
  /**
   * `classe` é a classe de preço na tabela do sorteio ("Ouro II", "Mestre · 200–299 PDL"),
   * opcional porque drafts montados antes da tabela por divisão não têm.
   */
  elencos: Record<
    string,
    { riotId: string; pontos: number; rota1: string; rota2: string; elo: string; classe?: string; capitao: boolean }[]
  >;
  disponiveis: { id: string; riotId: string; pontos: number; rota1: string; rota2: string; elo: string; classe?: string }[];
  escolhaAtual: number;
  totalEscolhas: number;
  timeDaVezId: string | null;
  /**
   * Ids de quem o time da vez pode escolher agora, pela conta do motor (orçamento E
   * viabilidade dos elencos de todos). As telas apagam o resto — antes recalculavam com a
   * fórmula do teto e ofereciam jogador que o servidor recusaria.
   */
  escolhiveis: string[];
  prazoISO: string | null;
  /** Por que está pausado, quando está. */
  motivoDaPausa: MotivoDaPausa | null;
  /**
   * Identifica o sorteio: muda a cada montagem. A transmissão usa como `key` da animação
   * do sorteio — sem isso, um novo sorteio com a TV aberta trocava os nomes sem girar.
   * É a semente, que já é pública na conferência do sorteio.
   */
  sorteioId: string | null;
  orcamentoPorTime: number;
  jogadoresPorTime: number;
  historico: { escolha: number; timeId: string; riotId: string; automatica: boolean }[];
  /**
   * A tabela de pontos do SORTEIO (só classes e números, nada de quem é quem). O painel a usa
   * para precificar quem está fora do pool com os preços que valeram — a regra do substituto
   * depois do draft. Nula em drafts montados antes da tabela automática; ausente na resposta
   * de um servidor anterior a este campo.
   */
  tabelaDePontos?: RetratoDaTabela | null;
};

/**
 * `escolhiveis` guardado por estado. A conta só muda quando alguém escolhe (ou a fase
 * muda), mas `paraPublico` roda em TODA sondagem de 2 s de cada tela — TV, capitães,
 * painel. Sem guardar, cada tela refazia as buscas de viabilidade a cada 2 s.
 */
const escolhiveisGuardados = new Map<string, string[]>();

function escolhiveisDoEstado(estado: EstadoDraft, revisao: number): string[] {
  const livres = estado.jogadores.filter((j) => j.timeId === null).map((j) => j.id).join(",");
  const chave = [revisao, estado.escolhaAtual, estado.fase, estado.sorteio?.semente ?? "", estado.orcamentoPorTime, livres].join("|");
  const guardado = escolhiveisGuardados.get(chave);
  if (guardado) return guardado;
  const calculado = escolhiveisDaVez(estado);
  escolhiveisGuardados.set(chave, calculado);
  // Só os mais recentes importam: o draft anda para a frente.
  if (escolhiveisGuardados.size > 32) {
    const maisAntiga = escolhiveisGuardados.keys().next().value;
    if (maisAntiga !== undefined) escolhiveisGuardados.delete(maisAntiga);
  }
  return calculado;
}

export function paraPublico(estado: EstadoDraftComTabela, revisao: number): DraftPublico {
  const nomePor = new Map(estado.jogadores.map((j) => [j.id, j]));
  // Só com o campo: estado antigo continua saindo sem `classe`, como antes.
  const classeDe = (j: JogadorDoDraft) => (j.classe ? { classe: j.classe } : {});

  const elencos: DraftPublico["elencos"] = {};
  for (const time of estado.times) {
    elencos[time.id] = estado.jogadores
      .filter((j) => j.timeId === time.id)
      .map((j) => ({
        riotId: j.riotId,
        pontos: j.pontos,
        rota1: j.rota1,
        rota2: j.rota2,
        elo: j.elo,
        ...classeDe(j),
        capitao: j.id === time.capitaoId,
      }));
  }

  return {
    revisao,
    fase: estado.fase,
    times: estado.times.map((t) => {
      const elenco = elencos[t.id] ?? [];
      return {
        id: t.id,
        nome: t.nome,
        cor: t.cor,
        capitaoRiotId: nomePor.get(t.capitaoId)?.riotId ?? "—",
        gasto: elenco.reduce((s, j) => s + j.pontos, 0),
        vagas: Math.max(0, estado.jogadoresPorTime - elenco.length),
      };
    }),
    elencos,
    // O id do jogador disponível SAI, porque o painel do capitão precisa dele para
    // escolher. É um uuid de inscrição sem significado fora daqui, e o servidor
    // confere de quem é a vez de qualquer forma.
    disponiveis: estado.jogadores
      .filter((j) => j.timeId === null)
      .map((j) => ({ id: j.id, riotId: j.riotId, pontos: j.pontos, rota1: j.rota1, rota2: j.rota2, elo: j.elo, ...classeDe(j) })),
    escolhaAtual: estado.escolhaAtual,
    totalEscolhas: estado.ordem.length,
    // `timeDaVez` do motor, e não a indexação crua da ordem: o motor devolve null fora de
    // "rodando"/"pausado", enquanto indexar direto continua apontando um time em
    // "preparando" e em "encerrado". A visão pública e a autorização precisam responder a
    // mesma coisa — senão a transmissão anuncia "vez do time X" num draft que ainda não
    // começou, e cada tela nova teria de lembrar de reconferir a fase por conta própria.
    timeDaVezId: timeDaVez(estado),
    escolhiveis: escolhiveisDoEstado(estado, revisao),
    prazoISO: estado.prazoISO,
    motivoDaPausa: estado.fase === "pausado" ? (estado.motivoDaPausa ?? null) : null,
    sorteioId: estado.sorteio?.semente ?? null,
    orcamentoPorTime: estado.orcamentoPorTime,
    jogadoresPorTime: estado.jogadoresPorTime,
    historico: estado.historico.map((e) => ({
      escolha: e.escolha,
      timeId: e.timeId,
      riotId: nomePor.get(e.jogadorId)?.riotId ?? "—",
      automatica: e.automatica,
    })),
    tabelaDePontos: estado.tabelaDePontos ?? null,
  };
}

/** O time que este jogador capitaneia, ou null. Base da autorização da escolha. */
export function timeDoCapitao(estado: EstadoDraft, inscricaoId: string): string | null {
  return estado.times.find((t) => t.capitaoId === inscricaoId)?.id ?? null;
}
