import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";
import { ErroDeRegra } from "@/lib/security/erros";
import { identidadeDoTime } from "@/lib/draft/times";
import {
  ajustarOrdemAoPool,
  atualizarForaDoPool,
  avisosDoSorteio,
  escolhiveisDaVez,
  estadoFecha,
  impedimentosDoSorteio,
  jogadoresDisponiveis,
  jogadoresQueSairamDoPool,
  montarDraft,
  timeDaVez,
  type EstadoDraft,
  type JogadorDoDraft,
  type MotivoDaPausa,
  type TimeDoDraft,
} from "@/lib/draft/motor";
import { montarFila } from "@/lib/inscricoes/fila";
import { estaFora } from "@/lib/inscricoes/pagamento";
import { lerConfig, listarInscricoes, type EdicaoConfig, type Inscricao } from "@/lib/inscricoes/store";
import { contaParaTimes, distribuirTimes, estadoDaJanela } from "@/lib/inscricoes/schema";
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

// ---------------------------------------------------------------- quem saiu do pool (C1)

/**
 * A última leitura das situações do pool, guardada por pouco tempo. A sondagem roda a cada
 * 2 s em TODA tela aberta (TV, capitães, mesa, plateia), e cada uma leria o banco de novo
 * sem isto. Dois segundos não mudam nada para quem desiste: a saída aparece na sondagem
 * seguinte. As escolhas (POST) leem sem guardar.
 */
const GUARDA_DAS_SITUACOES_MS = 2_000;
let situacoesGuardadas: { chave: string; ate: number; saidas: ReadonlySet<string> } | null = null;

/** Para os testes: esquece a leitura guardada. */
export function esquecerSituacoesGuardadas(): void {
  situacoesGuardadas = null;
}

/**
 * Quem do pool (ainda não escolhido) está com a inscrição FORA agora — recusado, desistiu
 * ou excluído (`estaFora`, a mesma regra da fila e da cobrança). Inscrição que não aparece
 * na leitura não conta como saída: exclusão é situação («excluido»), nunca DELETE, então
 * sumir é falha de leitura, não decisão de ninguém.
 */
async function saidasDoPool(estado: EstadoDraft, fresco: boolean): Promise<ReadonlySet<string>> {
  const ids = estado.jogadores.filter((j) => j.timeId === null).map((j) => j.id);
  if (ids.length === 0) return new Set();
  const chave = ids.join(",");
  const agora = Date.now();
  if (!fresco && situacoesGuardadas && situacoesGuardadas.chave === chave && situacoesGuardadas.ate > agora) {
    return situacoesGuardadas.saidas;
  }

  const { data, error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .select("id,situacao")
    .in("id", ids)
    .returns<{ id: string; situacao: string }[]>();
  if (error) throw new Error(`Falha ao ler as inscrições do pool: ${error.message}`);

  const saidas: ReadonlySet<string> = new Set((data ?? []).filter((l) => estaFora(l.situacao)).map((l) => l.id));
  situacoesGuardadas = { chave, ate: agora + GUARDA_DAS_SITUACOES_MS, saidas };
  return saidas;
}

/**
 * O estado com quem saiu do pool aplicado (`atualizarForaDoPool`), lido da situação ATUAL
 * das inscrições — decisão C1: quem desiste ou é recusado depois do sorteio sai dos
 * escolhíveis na hora, sem a mesa precisar fazer nada.
 *
 * Quem chama grava o resultado (condicionado à revisão), como faz com o relógio. Se a
 * leitura falhar, devolve o estado como está: o draft não para por causa disso, e a virada
 * continua pedindo confirmação de quem não é mais apto.
 *
 * `fresco`: sem a leitura guardada — para as escolhas, que não podem levar quem acabou de sair.
 */
export async function comAsSaidasDoPool(estado: EstadoDraft, opcoes: { fresco?: boolean } = {}): Promise<EstadoDraft> {
  if (estado.fase === "encerrado") return estado;
  try {
    // O agora só pesa no caso raro em que o time da vez perde a escolha: o seguinte ganha o
    // prazo inteiro (ver `atualizarForaDoPool`).
    return atualizarForaDoPool(estado, await saidasDoPool(estado, opcoes.fresco === true), Date.now());
  } catch (erro) {
    console.error("[draft] não foi possível conferir quem saiu do pool", erro);
    return estado;
  }
}

// ---------------------------------------------------------------- montagem

/**
 * Como os capitães são escolhidos.
 *
 * `definidos` é o da 4ª desde 23/10/2026: os capitães que a ORGANIZAÇÃO marcou
 * (`inscricoes.capitao`, gravado pela mesa do draft — `salvarCapitaesDefinidos`). Pode
 * incluir organizador: quem define é a organização. É o método padrão quando há marcados.
 * `maior_elo` é a regra automática de antes: maior elo na solo/duo, qualquer rota, sem
 * organizador (ver lib/draft/capitaes.ts). `manual` é a saída quando a organização decide
 * outra coisa na hora. `mid`, `adc` e `pior` vêm do design entregue e continuam aceitos pela
 * rota, mas o painel não os oferece. (`voluntarios` saiu: o formulário da 4ª não pergunta mais
 * quem quer ser capitão, e o método nunca encontraria ninguém.)
 */
export type MetodoDeCapitao = "definidos" | "maior_elo" | "mid" | "adc" | "pior" | "manual";

/**
 * As colunas que o resto do código não declara: `listarInscricoes` e `lerConfig` leem `*`, e
 * as colunas de 23/10/2026 (supabase/migracao-capitaes-definidos.sql) vêm junto. Ficam aqui,
 * e não nos tipos de lib/inscricoes/store.ts, porque só o draft as usa.
 */
type InscricaoComCapitao = Inscricao & { capitao?: boolean | null };
type ConfigComCapitao = EdicaoConfig & { capitao_com_preco?: boolean | null };

/** A organização marcou esta inscrição como capitã (`inscricoes.capitao`). */
export function ehCapitaoDefinido(i: Inscricao): boolean {
  return (i as InscricaoComCapitao).capitao === true;
}

/**
 * O capitão NÃO tem preço nesta edição (`edicao_config.capitao_com_preco = false`, o padrão
 * desde 23/10/2026): cada time tem o orçamento inteiro para as escolhas, e a tabela é calculada
 * só sobre quem vai ser escolhido (lib/draft/tabela-que-fecha.ts). Só `true` devolve o modelo
 * antigo, com o capitão pago pelo orçamento — banco sem a coluna fica com a decisão da 4ª.
 */
export function capitaoSemPreco(config: EdicaoConfig): boolean {
  return (config as ConfigComCapitao).capitao_com_preco !== true;
}

/**
 * Os capitães definidos pela organização, do jeito que o sorteio os enxerga.
 *
 *  - `ids`: os marcados que estão no pool do sorteio (titulares aptos), na ordem da lista;
 *  - `foraDoPool`: marcados que ainda podem jogar mas NÃO estão no pool (pendente, reserva,
 *    sobra) — enquanto houver algum, os definidos não valem (seria sortear sem um capitão que a
 *    organização escolheu);
 *  - `saiu`: marcados cuja inscrição está fora (recusado, desistente, excluído) — não contam, e
 *    a mesa avisa para desmarcar;
 *  - `valem`: exatamente um por time, todos no pool.
 */
function capitaesDefinidos(inscritos: readonly Inscricao[], vaoJogar: readonly Inscricao[], times: number) {
  const noPool = new Set(vaoJogar.map((i) => i.id));
  const marcados = inscritos.filter(ehCapitaoDefinido);
  const ids = vaoJogar.filter(ehCapitaoDefinido).map((i) => i.id);
  const foraDoPool = marcados.filter((i) => !noPool.has(i.id) && !estaFora(i.situacao));
  const saiu = marcados.filter((i) => estaFora(i.situacao));
  return {
    marcados: marcados.length,
    ids,
    foraDoPool,
    saiu,
    valem: times > 0 && ids.length === times && foraDoPool.length === 0,
  };
}

/** Os recados da mesa sobre os capitães definidos (número errado, marcado fora do pool, quem saiu). */
function avisosDosCapitaes(definidos: ReturnType<typeof capitaesDefinidos>, times: number): string[] {
  if (definidos.marcados === 0) return [];
  const avisos: string[] = [];
  if (definidos.foraDoPool.length > 0) {
    const nomes = definidos.foraDoPool.map((i) => `${i.riot_id} (${i.situacao})`).join(", ");
    avisos.push(
      `${nomes} ${definidos.foraDoPool.length === 1 ? "está marcado" : "estão marcados"} como capitão, mas não ${definidos.foraDoPool.length === 1 ? "está" : "estão"} entre os titulares aptos (quem joga o draft). Aprove a inscrição ou troque o capitão em «Definir capitães».`,
    );
  }
  if (definidos.saiu.length > 0) {
    const nomes = definidos.saiu.map((i) => `${i.riot_id} (${i.situacao})`).join(", ");
    avisos.push(`${nomes} tinha a marca de capitão e saiu do campeonato: não conta. Desmarque em «Definir capitães».`);
  }
  if (definidos.ids.length !== times) {
    avisos.push(
      `Há ${definidos.ids.length} ${definidos.ids.length === 1 ? "capitão definido" : "capitães definidos"} entre os titulares aptos para ${times} times: marque exatamente ${times} em «Definir capitães». Até lá, o sorteio pelos capitães definidos é recusado.`,
    );
  }
  return avisos;
}

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
 * (lib/draft/tabela-que-fecha.ts). A prévia usa os capitães definidos (ou os da regra); a
 * montagem, os escolhidos. Os dois chegam na mesma tabela para os mesmos capitães. Com o
 * capitão sem preço (`capitaoSemPreco`), a tabela é só de quem vai ser escolhido.
 */
function tabelaComOsCapitaes(vaoJogar: readonly Inscricao[], capitaes: readonly string[], times: number, config: EdicaoConfig): TabelaQueFecha {
  return tabelaQueFecha({
    pool: vaoJogar.filter((i) => temEloReconhecido(i)).map((i) => ({ id: i.id, elo: eloDoJogadorDaInscricao(i) })),
    capitaes,
    times,
    jogadoresPorTime: config.jogadores_por_time,
    orcamentoPorTime: config.orcamento_por_time,
    capitaoGratis: capitaoSemPreco(config),
  });
}

/**
 * O retrato que sai do servidor: a tabela, de onde a conta desceu, se o pool é o do sorteio e
 * se o capitão ficou fora dela (sem preço).
 */
function retratoComQueda(
  conta: Pick<TabelaQueFecha, "tabela" | "queda">,
  poolIncompleto: boolean,
  capitaoGratis: boolean,
): RetratoDaTabela {
  return {
    ...retratoDaTabela(conta.tabela),
    queda: conta.queda,
    ...(poolIncompleto ? { poolIncompleto: true } : {}),
    ...(capitaoGratis ? { capitaoGratis: true } : {}),
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
 * Quem joga o draft: os TITULARES da fila que estão `apto` (decisão C4 de 2026-10-22).
 *
 * A fila é a de sempre (lib/inscricoes/fila.ts, a mesma do formulário, da Minha inscrição e
 * do painel): todos os organizadores e os primeiros por ordem de inscrição até as vagas da
 * edição; o resto, e quem está em «sobra», é reserva. Antes o pool eram todos os `apto`, e
 * a organização tinha de marcar à mão quem sobrava; agora quem decide é a ordem de
 * inscrição.
 *
 * O número de times sai de quantos ainda podem jogar (`contaParaTimes`, a mesma conta da
 * aba Times e vagas), com o teto da Configuração. Titular que ainda não está `apto` não
 * entra no sorteio e vira aviso na mesa (`titularesNaoAptos`).
 */
function quemJoga(inscritos: readonly Inscricao[], config: EdicaoConfig) {
  const fila = montarFila(inscritos, config);
  const titular = new Set(fila.titulares);
  // Na ordem em que as inscrições chegaram do banco (a de `criado_em`), como sempre foi.
  const titulares = inscritos.filter((i) => titular.has(i.id));
  const vaoJogar = titulares.filter((i) => i.situacao === "apto");
  const elegiveis = inscritos.filter((i) => contaParaTimes(i.situacao)).length;
  const { times, vagas } = distribuirTimes(elegiveis, config.jogadores_por_time, config.max_times ?? null);
  return {
    fila,
    titulares,
    vaoJogar,
    titularesNaoAptos: titulares.filter((i) => i.situacao !== "apto"),
    elegiveis,
    times,
    vagas,
  };
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
  const { fila, titulares, vaoJogar, titularesNaoAptos, elegiveis, times, vagas } = quemJoga(inscritos, config);
  const maxTimes = config.max_times ?? null;

  // O preço de cada um sai da tabela automática, calculada sobre quem joga.
  const pedida = tabelaDosQueJogam(vaoJogar, times, config);

  const impedimentos = [
    ...impedimentosDoSorteio({
      pontosDosQueJogam: vaoJogar.map((i) => pedida.precoDe.get(i.id) ?? 0),
      vagas,
      times,
      orcamentoPorTime: config.orcamento_por_time,
      totalDeElegiveis: elegiveis,
    }),
    ...pedida.semElo,
  ];

  const ranking = rankingDeCapitaes(vaoJogar.map(candidatoACapitao), times);
  const porId = new Map(vaoJogar.map((i) => [i.id, i]));
  const capitaoGratis = capitaoSemPreco(config);

  // Os capitães que a organização DEFINIU (decisão de 23/10/2026). Valendo — um por time,
  // todos no pool —, são eles que dão a tabela; senão, os da regra, como antes.
  const definidos = capitaesDefinidos(inscritos, vaoJogar, times);

  // Com a lista certa (sem impedimento) e os capitães conhecidos, a tabela é a que fecha com
  // eles — a pedida ou a primeira que fecha descendo a curvatura e a soma. Sem isso, é a
  // pedida, e não dá para saber ainda se fecha.
  const podeContar = impedimentos.length === 0 && times > 0;
  const comOsDefinidos =
    podeContar && definidos.valem ? tabelaComOsCapitaes(vaoJogar, definidos.ids, times, config) : null;
  const comOsDaRegra =
    podeContar && ranking.escolhidos.length === times ? tabelaComOsCapitaes(vaoJogar, ranking.escolhidos, times, config) : null;
  const capitaesDaTabela = comOsDefinidos ? "definidos" : comOsDaRegra ? "regra" : null;
  const idsDosCapitaesDaTabela = new Set(comOsDefinidos ? definidos.ids : comOsDaRegra ? ranking.escolhidos : []);
  const conta = comOsDefinidos ?? comOsDaRegra ?? { tabela: pedida.tabela, precoDe: pedida.precoDe, queda: null };
  const fechaComOsCapitaesDaRegra = comOsDaRegra ? comOsDaRegra.fecha : null;
  const fechaComOsCapitaesDefinidos = comOsDefinidos ? comOsDefinidos.fecha : null;
  const precoDoInscrito = (i: Inscricao) => conta.precoDe.get(i.id) ?? 0;
  const totalDePontos = vaoJogar.reduce((soma, i) => soma + precoDoInscrito(i), 0);
  // Sem capitães conhecidos, a tabela é a de todo mundo (a pedida): com o capitão sem preço, ela
  // não é a do sorteio — a tela avisa.
  const tabelaGratis = capitaoGratis && capitaesDaTabela !== null;

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
    /** Os titulares da fila que estão `apto`: o pool do sorteio. */
    aptos: vaoJogar.length,
    sobra: inscritos.filter((i) => i.situacao === "sobra").length,
    pendentes: inscritos.filter((i) => i.situacao === "pendente").length,
    // A fila (C4): quantos são titulares, quantos esperam na reserva, e os titulares que
    // ainda não estão aptos — não entram no sorteio, e a mesa precisa saber quem são.
    titulares: titulares.length,
    naFila: fila.reservas.length,
    titularesNaoAptos: titularesNaoAptos.map((i) => ({ riotId: i.riot_id, situacao: i.situacao })),
    impedimentos,
    // Titular que ainda não está apto não impede o sorteio (C4): é aviso, e a ordem perde a
    // escolha que falta — um time termina com vaga aberta, que a fila de reserva ocupa.
    avisosDoSorteio: avisosDoSorteio({ quantos: vaoJogar.length, vagas, times }),
    totalDePontos,
    /**
     * Sempre nulo: a regra antiga (média + 15%) saiu. Continua na resposta por uma versão
     * porque o painel anterior ao deploy testa `!== null` — sem a chave, ele mostrava o
     * banner "O orçamento configurado (30) não é o da regra (undefined)".
     */
    orcamentoSugerido: null,
    // A tabela de pontos desta edição (substitui a regra antiga "média + 15%"). Nula sem
    // time fechado ou sem ninguém com preço. Com mais aptos que vagas ela vem marcada como pool
    // incompleto: dá ideia dos preços, mas a tela não a mostra como fechada. Com MENOS (titular
    // ainda não apto, C4) ela é a do sorteio, se a organização sortear agora.
    tabela: times > 0 && conta.precoDe.size > 0 ? retratoComQueda(conta, vaoJogar.length > vagas, tabelaGratis) : null,
    // Os capitães da regra fecham os elencos com esta tabela (já com a queda, se houve)? Nulo
    // quando não dá para saber ainda (lista com impedimento, empate no corte, faltam capitães).
    fechaComOsCapitaesDaRegra,
    // O mesmo para os capitães definidos pela organização. Nulo sem eles valendo.
    fechaComOsCapitaesDefinidos,
    /** O capitão não tem preço nesta edição: a tela mostra a tag CAPITÃO no lugar dos pontos. */
    capitaoGratis,
    /** Com quais capitães a tabela foi calculada: os definidos, os da regra ou nenhum (a pedida). */
    capitaesDaTabela,
    /** Os capitães definidos pela organização que estão no pool, na ordem da lista. */
    capitaesDefinidos: definidos.ids,
    /** Quantas inscrições têm a marca de capitão (no pool ou não). */
    capitaesMarcados: definidos.marcados,
    /** Número errado, marcado fora do pool, quem saiu: o que a mesa precisa saber dos definidos. */
    avisosDosCapitaes: avisosDosCapitaes(definidos, times),
    /** O método que a mesa oferece primeiro: os definidos, quando há marcados. */
    metodoPadrao: (definidos.marcados > 0 ? "definidos" : "maior_elo") as MetodoDeCapitao,
    // Quem joga, do maior elo para o menor, com os organizadores no fim.
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
        /** Capitão na tabela desta prévia (definido ou pela regra). Sem preço: a tela mostra a tag. */
        capitao: idsDosCapitaesDaTabela.has(i.id),
        /** A organização marcou como capitão (`inscricoes.capitao`). */
        capitaoDefinido: ehCapitaoDefinido(i),
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
  | "foraDoDraft"
  | "tabela"
  | "fechaComOsCapitaesDaRegra"
  | "orcamentoSugerido"
  | "titulares"
  | "naFila"
  | "titularesNaoAptos"
  | "avisosDoSorteio"
  | "fechaComOsCapitaesDefinidos"
  | "capitaoGratis"
  | "capitaesDaTabela"
  | "capitaesDefinidos"
  | "capitaesMarcados"
  | "avisosDosCapitaes"
  | "metodoPadrao"
  | "jogadores"
> & {
  /**
   * Os campos de 23/10/2026 (capitães definidos, capitão sem preço) são opcionais: a resposta
   * de um servidor anterior não os tem, e a tela segue como antes.
   */
  jogadores: (Omit<Awaited<ReturnType<typeof previaDoDraft>>["jogadores"][number], "capitao" | "capitaoDefinido"> & {
    capitao?: boolean;
    capitaoDefinido?: boolean;
  })[];
  fechaComOsCapitaesDefinidos?: boolean | null;
  capitaoGratis?: boolean;
  capitaesDaTabela?: "definidos" | "regra" | null;
  capitaesDefinidos?: string[];
  capitaesMarcados?: number;
  avisosDosCapitaes?: string[];
  metodoPadrao?: MetodoDeCapitao;
  foraDoDraft?: ForaDoDraft[];
  /** Titulares da fila (C4). Ausente na resposta de um servidor anterior à fila. */
  titulares?: number;
  /** Quantos esperam na fila de reserva (inclusive quem está em «sobra»). */
  naFila?: number;
  /** Titulares que ainda não estão `apto`: não entram no sorteio. */
  titularesNaoAptos?: { riotId: string; situacao: string }[];
  /** O que a mesa precisa saber sem impedir o sorteio (C4: faltam titulares aptos). */
  avisosDoSorteio?: string[];
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
export type EstadoDraftComTabela = EstadoDraft & {
  tabelaDePontos?: RetratoDaTabela;
  /**
   * O capitão entrou no draft SEM PREÇO (0 ponto, decisão de 23/10/2026): as telas mostram a
   * tag CAPITÃO no lugar dos pontos, e o gasto de cada time é só o das escolhas. Ausente em
   * drafts montados antes (o capitão custava os pontos dele).
   */
  capitaoGratis?: boolean;
};

/**
 * Monta o draft a partir dos titulares aptos da fila — e SORTEIA a ordem.
 *
 * O número de times é DERIVADO (`distribuirTimes`), com o teto `max_times` da
 * Configuração (8 na 4ª Edição, desde 2026-10-22). Quem joga são os titulares da fila que
 * estão `apto` (`quemJoga`, decisão C4): a fila corta pela ordem de inscrição, e quem fica
 * na reserva vai para o site como reserva na virada.
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

  // Quem joga: os titulares da fila que estão "apto". Quem está na reserva (inclusive a
  // "sobra", que é reserva por decisão da organização) fica fora do sorteio.
  const { vaoJogar, elegiveis, times: quantosTimes, vagas } = quemJoga(inscritos, config);

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
  // quem joga não passa das vagas (a fila decide quem, pela ordem de inscrição), e a soma
  // dos pontos tem de caber no teto (senão o draft entra ao vivo já condenado a travar).
  // Faltar titular apto NÃO impede (C4): a ordem perde as escolhas que faltam, mais abaixo.
  const impedimentos = [
    ...impedimentosDoSorteio({
      pontosDosQueJogam: pool.map((j) => j.pontos),
      vagas,
      times: quantosTimes,
      orcamentoPorTime: config.orcamento_por_time,
      totalDeElegiveis: elegiveis,
    }),
    ...semElo,
  ];

  if (impedimentos.length > 0) throw new ErroDeRegra(impedimentos.join(" "));

  const capitaes = escolherCapitaes({
    aprovados: pool,
    inscritos: vaoJogar,
    todosOsInscritos: inscritos,
    rotaPorInscrito: new Map(vaoJogar.map((i) => [i.id, i.rota_primaria])),
    quantos: quantosTimes,
    metodo: params.metodo,
    manuais: params.capitaesManuais ?? [],
  });

  // Organizador não capitaneia — só no método AUTOMÁTICO (a regra do maior elo). Quando a
  // organização define os capitães (definidos ou à mão), pode escolher um organizador: foi o
  // que ela decidiu em 23/10/2026. O ranking da regra já pula a organização; isto é a rede.
  if (params.metodo === "maior_elo") {
    const organizadores = new Set(vaoJogar.filter((i) => i.organizador).map((i) => i.id));
    const organizadorCapitao = capitaes.find((id) => organizadores.has(id));
    if (organizadorCapitao) {
      const riotId = pool.find((j) => j.id === organizadorCapitao)?.riotId ?? organizadorCapitao;
      throw new ErroDeRegra(`${riotId} é da organização, e a regra do maior elo não escolhe organizador.`);
    }
  }

  // A tabela com ESTES capitães: a pedida, se os elencos fecham com ela; senão a primeira
  // que fecha descendo a curvatura e a soma. Os preços do pool passam a ser os dela — com o
  // capitão sem preço, o capitão entra com 0 e a tabela é só de quem vai ser escolhido.
  const capitaoGratis = capitaoSemPreco(config);
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

  // Com menos titulares aptos do que vagas (C4), a ordem sai sem as escolhas que não teriam
  // quem escolher — a mesma conta de quem deixa o pool (C1), a partir do fim da serpentina —,
  // e o time que fica com vaga aberta a recebe de um reserva da fila depois da virada.
  const estado = ajustarOrdemAoPool(
    montarDraft({
      times,
      jogadores: pool,
      jogadoresPorTime: config.jogadores_por_time,
      orcamentoPorTime: config.orcamento_por_time,
      segundosPorEscolha: config.segundos_por_escolha,
    }),
  );

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
    tabelaDePontos: retratoComQueda(conta, false, capitaoGratis),
    ...(capitaoGratis ? { capitaoGratis: true } : {}),
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
  /** Quem joga o draft (os titulares aptos). */
  inscritos: readonly Inscricao[];
  /** Todas as inscrições — para achar quem foi marcado como capitão e não está no pool. */
  todosOsInscritos: readonly Inscricao[];
  rotaPorInscrito: Map<string, string>;
  quantos: number;
  metodo: MetodoDeCapitao;
  manuais: readonly string[];
}): string[] {
  const { aprovados, inscritos, todosOsInscritos, rotaPorInscrito, quantos, metodo, manuais } = params;

  if (metodo === "definidos") {
    // Os capitães que a organização marcou (`inscricoes.capitao`). A recusa diz o que fazer:
    // sortear sem um capitão escolhido, ou com um a mais, não é o que a organização definiu.
    const definidos = capitaesDefinidos(todosOsInscritos, inscritos, quantos);
    if (definidos.marcados === 0) {
      throw new ErroDeRegra(
        `Nenhum capitão foi definido pela organização. Marque os ${quantos} capitães em «Definir capitães» (aba Draft ao vivo) e salve, ou sorteie pela regra ou à mão.`,
      );
    }
    if (definidos.foraDoPool.length > 0) {
      const nomes = definidos.foraDoPool.map((i) => `${i.riot_id} (${i.situacao})`).join(", ");
      throw new ErroDeRegra(
        `Capitão definido fora de quem joga o draft: ${nomes}. Só titulares aptos podem ser capitães — aprove a inscrição ou troque o capitão em «Definir capitães».`,
      );
    }
    if (definidos.ids.length !== quantos) {
      throw new ErroDeRegra(
        `Há ${definidos.ids.length} ${definidos.ids.length === 1 ? "capitão definido" : "capitães definidos"} entre os titulares aptos para ${quantos} times. Marque exatamente ${quantos} em «Definir capitães» e salve antes de sortear.`,
      );
    }
    return definidos.ids;
  }

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
      if (!validos.has(id)) throw new ErroDeRegra("Um dos capitães escolhidos não está entre os titulares aptos (quem joga o draft).");
    }
    return [...manuais];
  }

  if (metodo === "maior_elo") {
    const ranking = rankingDeCapitaes(inscritos.map(candidatoACapitao), quantos);
    if (ranking.faltam > 0) {
      throw new ErroDeRegra(
        `Não há titulares aptos suficientes fora da organização para ${quantos} capitães (faltam ${ranking.faltam}).`,
      );
    }
    if (ranking.empateNoCorte) {
      throw new ErroDeRegra(
        `Empate de elo no corte dos capitães: ${ranking.empateNoCorte.join(", ")}. O regulamento não diz como desempatar — decida e marque os ${quantos} capitães à mão.`,
      );
    }
    return ranking.escolhidos;
  }

  // Os métodos antigos também pulam a organização, como a regra do maior elo: só quem a
  // organização define (definidos, à mão) pode ser organizador.
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
  /**
   * Quem estava no pool e saiu depois do sorteio (C1): não pode mais ser escolhido, e a
   * transmissão mostra que saiu. Sem o porquê (desistência, recusa) — isso é da organização,
   * não da plateia. Opcional: a resposta de um servidor anterior não tem.
   */
  saiuDoPool?: { riotId: string; pontos: number; rota1: string; rota2: string; elo: string; classe?: string }[];
  escolhaAtual: number;
  totalEscolhas: number;
  /**
   * O time de cada escolha, na ordem. É a serpentina — menos as escolhas que saíram quando
   * faltou jogador (C1), que podem não ser as do fim. O trilho da transmissão lê daqui.
   * Opcional: a resposta de um servidor anterior não tem, e a tela refaz a serpentina.
   */
  ordem?: string[];
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
  /**
   * O capitão entrou SEM PREÇO (0 ponto): a transmissão, o painel do capitão e a mesa mostram a
   * tag CAPITÃO no lugar dos pontos, e `gasto` é só o das escolhas. Opcional: servidor anterior.
   */
  capitaoGratis?: boolean;
};

/**
 * `escolhiveis` guardado por estado. A conta só muda quando alguém escolhe (ou a fase
 * muda), mas `paraPublico` roda em TODA sondagem de 2 s de cada tela — TV, capitães,
 * painel. Sem guardar, cada tela refazia as buscas de viabilidade a cada 2 s.
 */
const escolhiveisGuardados = new Map<string, string[]>();

function escolhiveisDoEstado(estado: EstadoDraft, revisao: number): string[] {
  // Quem saiu do pool e o tamanho da ordem também mudam a conta (C1) — e entram na chave,
  // porque a sondagem calcula a visão do estado já atualizado antes de gravar.
  const livres = jogadoresDisponiveis(estado).map((j) => j.id).join(",");
  const chave = [
    revisao,
    estado.escolhaAtual,
    estado.fase,
    estado.sorteio?.semente ?? "",
    estado.orcamentoPorTime,
    estado.ordem.length,
    livres,
  ].join("|");
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
    // confere de quem é a vez de qualquer forma. Quem saiu do pool não está aqui (C1).
    disponiveis: jogadoresDisponiveis(estado).map((j) => ({
      id: j.id,
      riotId: j.riotId,
      pontos: j.pontos,
      rota1: j.rota1,
      rota2: j.rota2,
      elo: j.elo,
      ...classeDe(j),
    })),
    // Sem o id: ninguém escolhe quem saiu, e a tela só precisa mostrar o nome.
    saiuDoPool: jogadoresQueSairamDoPool(estado).map((j) => ({
      riotId: j.riotId,
      pontos: j.pontos,
      rota1: j.rota1,
      rota2: j.rota2,
      elo: j.elo,
      ...classeDe(j),
    })),
    escolhaAtual: estado.escolhaAtual,
    totalEscolhas: estado.ordem.length,
    ordem: [...estado.ordem],
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
    capitaoGratis: estado.capitaoGratis === true,
  };
}

// ---------------------------------------------------------------- capitães definidos

/**
 * Grava os capitães DEFINIDOS pela organização (`inscricoes.capitao`): marca os pedidos e
 * desmarca os outros. É o que a mesa do draft salva em «Definir capitães» — e o que o sorteio
 * pelo método «definidos» usa.
 *
 * Quem chama (a rota) já confere o escopo e que o draft ainda não foi sorteado. Aqui: todo id
 * precisa ser de uma inscrição que existe e ainda pode jogar (recusado, desistente e excluído
 * não capitaneiam). O número pode ser diferente do de times — a prévia avisa e o sorteio
 * recusa —, para dar para salvar no meio da conferência. Lista vazia desmarca todo mundo.
 *
 * Duas gravações (marcar, depois desmarcar), não uma transação: se a segunda falhar, sobra
 * um capitão a mais, a prévia mostra o número errado e o sorteio recusa — nunca um capitão a
 * menos sem ninguém ver. Devolve os Riot IDs de antes e de depois, para a auditoria.
 */
export async function salvarCapitaesDefinidos(pedidos: readonly string[]): Promise<{ antes: string[]; depois: string[] }> {
  const cliente = createSupabaseAdminClient();
  const { data, error } = await cliente
    .from("inscricoes")
    .select("id,riot_id,situacao,capitao")
    .returns<{ id: string; riot_id: string; situacao: string; capitao: boolean | null }[]>();
  if (error) {
    // Sem a coluna (migração não aplicada), o recado diz o que rodar.
    if (/capitao/.test(error.message)) {
      throw new Error(`A coluna inscricoes.capitao não existe: rode supabase/migracao-capitaes-definidos.sql. (${error.message})`);
    }
    throw new Error(`Falha ao ler as inscrições: ${error.message}`);
  }

  const linhas = data ?? [];
  const porId = new Map(linhas.map((l) => [l.id, l]));
  const ids = [...new Set(pedidos)];
  for (const id of ids) {
    const linha = porId.get(id);
    if (!linha) throw new ErroDeRegra("Um dos capitães marcados não está entre os inscritos. Atualize o painel e marque de novo.");
    if (estaFora(linha.situacao)) {
      throw new ErroDeRegra(`${linha.riot_id} está fora do campeonato (${linha.situacao}) e não pode ser capitão.`);
    }
  }

  const antes = linhas.filter((l) => l.capitao === true).map((l) => l.id);
  const pedido = new Set(ids);
  const jaEra = new Set(antes);
  const marcar = ids.filter((id) => !jaEra.has(id));
  const desmarcar = antes.filter((id) => !pedido.has(id));
  const agora = new Date().toISOString();

  // Marca primeiro: se a segunda gravação falhar, sobra capitão (a prévia avisa), não falta.
  if (marcar.length > 0) {
    const { error: erro } = await cliente.from("inscricoes").update({ capitao: true, atualizado_em: agora }).in("id", marcar);
    if (erro) throw new Error(`Falha ao marcar os capitães: ${erro.message}`);
  }
  if (desmarcar.length > 0) {
    const { error: erro } = await cliente.from("inscricoes").update({ capitao: false, atualizado_em: agora }).in("id", desmarcar);
    if (erro) throw new Error(`Falha ao desmarcar os capitães antigos: ${erro.message}`);
  }

  const riotIdDe = (id: string) => porId.get(id)?.riot_id ?? id;
  return { antes: antes.map(riotIdDe), depois: ids.map(riotIdDe) };
}

/** O time que este jogador capitaneia, ou null. Base da autorização da escolha. */
export function timeDoCapitao(estado: EstadoDraft, inscricaoId: string): string | null {
  return estado.times.find((t) => t.capitaoId === inscricaoId)?.id ?? null;
}
