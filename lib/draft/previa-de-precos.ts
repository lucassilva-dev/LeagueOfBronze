import { montarFila } from "@/lib/inscricoes/fila";
import { contaParaTimes, distribuirTimes } from "@/lib/inscricoes/schema";
import { rankingDeCapitaes } from "@/lib/draft/capitaes";
import { eloDoJogadorDaInscricao, temEloReconhecido, type CamposDeElo } from "@/lib/draft/elo-da-inscricao";
import {
  calcularTabela,
  classeDoElo,
  precoNaTabela,
  retratoDaTabela,
  tabelaDoRetrato,
  type RetratoDaTabela,
  type TabelaDePontos,
} from "@/lib/draft/precos";
import { tabelaQueFecha } from "@/lib/draft/tabela-que-fecha";

/**
 * A PRÉVIA da tabela de pontos no painel (abas Times e vagas e Inscritos).
 *
 * A tabela oficial é a da conferência do draft (`previaDoDraft`, no servidor): calculada
 * com os titulares da fila que estão `apto`, que só fecham quando a organização termina a
 * conferência. Antes disso o painel ainda precisa de um número — para planejar, para mostrar
 * na ficha e para a regra do substituto — e mostrar a tabela fixa da 3ª (coluna `pontos`)
 * seria mostrar um preço que o draft não usa. Então o painel calcula a mesma tabela, com a
 * mesma função (lib/draft/precos.ts, pura), sobre a melhor previsão de quem joga:
 *
 *  - "titulares": os TITULARES da fila (`montarFila`, lib/inscricoes/fila.ts — a mesma do
 *    formulário, da Minha inscrição e do draft: organizadores e os primeiros por ordem de
 *    inscrição até as vagas; quem está em «sobra» vai para a reserva), quando são exatamente
 *    as vagas. É o pool que o draft vai usar assim que a conferência acabar (ATUALIZAÇÃO de
 *    23/10, item 3a: antes eram "os elegíveis que não estão na sobra", e com mais inscritos
 *    que vagas a prévia caía nos mais fracos). Com os capitães da regra definidos, é a tabela
 *    que fecha com eles (lib/draft/tabela-que-fecha.ts) — a mesma queda de curvatura que o
 *    servidor faz, para os dois lados mostrarem o mesmo preço.
 *  - "mais_fracos": senão, os `vagas` de elo mais baixo entre os elegíveis — o mesmo cenário
 *    "mais barato possível" que a conta de orçamento desta aba sempre usou.
 *
 * Elegível é quem ainda pode jogar (`contaParaTimes`: todos menos recusado, desistente e
 * excluído), a mesma conta do número de times. Quem está fora do pool (fila de reserva)
 * recebe o preço da reta, preso entre as linhas vizinhas (`precoNaTabela`).
 *
 * CAPITÃES (23/10/2026): os DEFINIDOS pela organização (`inscricoes.capitao`) quando são um por
 * time e estão todos no pool — senão os da regra, como antes. Com o capitão SEM PREÇO (o padrão
 * da 4ª), a tabela é só de quem vai ser escolhido, o capitão custa 0 e a tela mostra a tag
 * CAPITÃO no lugar dos pontos (`semPreco`); ele também não entra na regra do substituto.
 *
 * Depois do sorteio vale outra coisa: a TABELA DO SORTEIO (`precosDoSorteio`), com os
 * preços que o draft usou — uma desistência depois do draft não pode mudar o preço de
 * ninguém na regra do substituto.
 */

export type InscricaoDaPrevia = CamposDeElo & {
  id: string;
  situacao: string;
  /**
   * Para o corte dos capitães da regra (organizador não capitaneia), o casamento com o draft e
   * a fila (organizador é sempre titular).
   */
  organizador?: boolean;
  riot_id?: string;
  /** A ordem de inscrição, que decide quem é titular na fila. Ausente vai para o fim. */
  criado_em?: string | null;
  /**
   * Capitão DEFINIDO pela organização (`inscricoes.capitao`, 23/10/2026). Ausente = banco sem a
   * coluna, e a prévia segue com os capitães da regra.
   */
  capitao?: boolean | null;
};

export type OrigemDaPrevia = "titulares" | "mais_fracos" | "sorteio";

export type PreviaDosPrecos = {
  /** Nula sem time fechado, ou com jogadores por time inválido. */
  tabela: TabelaDePontos | null;
  origem: OrigemDaPrevia | null;
  times: number;
  vagas: number;
  elegiveis: number;
  /** Ids de quem entrou na conta da tabela. */
  noPool: ReadonlySet<string>;
  /** O preço de prévia de qualquer inscrito; nulo sem tabela ou com elo que o site não reconhece. */
  preco: (inscricao: InscricaoDaPrevia) => number | null;
  /** Força em degraus (a régua da tabela) — para comparar quando ainda não há tabela. */
  forca: (inscricao: InscricaoDaPrevia) => number | null;
  /** De onde a conta desceu e por quê, quando a pedida não fechava com os capitães da regra. */
  queda: RetratoDaTabela["queda"];
  /** Os capitães desta prévia fecham os elencos com esta tabela? Nulo quando não se sabe (sem capitães). */
  fechaComOsCapitaes: boolean | null;
  /** Com quais capitães a tabela foi calculada: os definidos pela organização, os da regra, ou nenhum. */
  capitaesDaTabela: "definidos" | "regra" | null;
  /** Os ids desses capitães (vazio sem capitães). */
  capitaes: ReadonlySet<string>;
  /** O capitão não tem preço nesta edição (configuração `capitao_com_preco` falsa). */
  capitaoGratis: boolean;
  /**
   * Capitão sem preço: a tela mostra a tag CAPITÃO no lugar dos pontos, e ele não substitui nem
   * é substituído pela tabela (regra 6). Falso com o capitão pago, ou para quem não é capitão.
   */
  semPreco: (inscricao: InscricaoDaPrevia) => boolean;
};

function forcaDe(i: InscricaoDaPrevia): number | null {
  return temEloReconhecido(i) ? classeDoElo(eloDoJogadorDaInscricao(i)).forca : null;
}

export function previaDosPrecos(params: {
  inscritos: readonly InscricaoDaPrevia[];
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  maxTimes: number | null;
  /**
   * `edicao_config.capitao_com_preco`: só `true` cobra o capitão do orçamento (o modelo até a
   * 3ª). Falso ou ausente = capitão sem preço, a decisão da 4ª (23/10/2026) — a mesma leitura do
   * servidor (`capitaoSemPreco`, lib/draft/store.ts).
   */
  capitaoComPreco?: boolean | null;
}): PreviaDosPrecos {
  const { inscritos, jogadoresPorTime, orcamentoPorTime, maxTimes } = params;
  const capitaoGratis = params.capitaoComPreco !== true;
  const vazia = (times = 0, vagas = 0, elegiveis = 0): PreviaDosPrecos => ({
    tabela: null,
    origem: null,
    times,
    vagas,
    elegiveis,
    noPool: new Set(),
    preco: () => null,
    forca: forcaDe,
    queda: null,
    fechaComOsCapitaes: null,
    capitaesDaTabela: null,
    capitaes: new Set(),
    capitaoGratis,
    semPreco: () => false,
  });

  if (!Number.isInteger(jogadoresPorTime) || jogadoresPorTime <= 0) return vazia();

  // A divisão conta todo elegível, com ou sem elo legível — igual ao panorama do servidor.
  const elegiveis = inscritos.filter((i) => contaParaTimes(i.situacao));
  const { times, vagas } = distribuirTimes(elegiveis.length, jogadoresPorTime, maxTimes);
  if (times === 0) return vazia(times, vagas, elegiveis.length);

  // Sem elo legível não há preço: fica fora da conta (a aba avisa a ficha a corrigir).
  const comPreco = elegiveis.filter((i) => temEloReconhecido(i));
  // Os titulares da fila, com o mesmo teto do número de times (`max_times × jogadores`).
  const fila = montarFila(inscritos, { max_times: maxTimes, jogadores_por_time: jogadoresPorTime });
  const titular = new Set(fila.titulares);
  const titulares = comPreco.filter((i) => titular.has(i.id));

  let origem: OrigemDaPrevia;
  let pool: InscricaoDaPrevia[];
  if (titulares.length === vagas) {
    origem = "titulares";
    pool = titulares;
  } else {
    origem = "mais_fracos";
    pool = [...comPreco]
      .sort((a, b) => forcaDe(a)! - forcaDe(b)! || a.id.localeCompare(b.id))
      .slice(0, vagas);
  }

  // Os capitães, na mesma ordem de preferência do servidor: os DEFINIDOS pela organização
  // (23/10/2026) quando são um por time e todos estão no pool; senão os da regra (maior elo,
  // sem organizador). Com o pool dos titulares e os capitães conhecidos, a tabela é a que fecha
  // com eles (a mesma conta do servidor). Sem isso, a pedida.
  const noPool = new Set(pool.map((i) => i.id));
  const definidos = origem === "titulares" ? pool.filter((i) => i.capitao === true).map((i) => i.id) : [];
  const marcadoForaDoPool = inscritos.some((i) => i.capitao === true && !noPool.has(i.id) && contaParaTimes(i.situacao));
  const definidosValem = origem === "titulares" && definidos.length === times && !marcadoForaDoPool;
  const ranking =
    origem === "titulares" && !definidosValem
      ? rankingDeCapitaes(
          pool.map((i) => {
            const elo = eloDoJogadorDaInscricao(i);
            return { id: i.id, riotId: i.riot_id ?? i.id, organizador: i.organizador ?? false, ...elo };
          }),
          times,
        )
      : null;
  const capitaes = definidosValem ? definidos : ranking && ranking.escolhidos.length === times ? ranking.escolhidos : null;
  const comCapitaes = capitaes
    ? tabelaQueFecha({
        pool: pool.map((i) => ({ id: i.id, elo: eloDoJogadorDaInscricao(i) })),
        capitaes,
        times,
        jogadoresPorTime,
        orcamentoPorTime,
        capitaoGratis,
      })
    : null;
  const tabela =
    comCapitaes?.tabela ??
    calcularTabela({
      pool: pool.map(eloDoJogadorDaInscricao),
      times,
      jogadoresPorTime,
      orcamentoPorTime,
    });
  const doCapitao: ReadonlySet<string> = new Set(capitaes ?? []);
  const semPreco = (i: InscricaoDaPrevia) => capitaoGratis && comCapitaes !== null && doCapitao.has(i.id);

  return {
    tabela,
    origem,
    times,
    vagas,
    elegiveis: elegiveis.length,
    noPool,
    // O capitão sem preço entra no draft com 0 — as telas mostram a tag (`semPreco`).
    preco: (i) => (semPreco(i) ? 0 : temEloReconhecido(i) ? precoNaTabela(tabela, eloDoJogadorDaInscricao(i)) : null),
    forca: forcaDe,
    queda: comCapitaes?.queda ?? null,
    fechaComOsCapitaes: comCapitaes ? comCapitaes.fecha : null,
    capitaesDaTabela: comCapitaes ? (definidosValem ? "definidos" : "regra") : null,
    capitaes: doCapitao,
    capitaoGratis,
    semPreco,
  };
}

/**
 * O retrato da prévia para a tabela de pontos do painel, com a queda e — quando o capitão ficou
 * fora da conta — a marca de capitão sem preço. Nulo sem tabela (ou sem linha nenhuma).
 */
export function retratoDaPrevia(previa: PreviaDosPrecos): RetratoDaTabela | null {
  if (!previa.tabela || previa.tabela.linhas.length === 0) return null;
  return {
    ...retratoDaTabela(previa.tabela),
    queda: previa.queda,
    ...(previa.capitaoGratis && previa.capitaesDaTabela !== null ? { capitaoGratis: true } : {}),
  };
}

/**
 * Os preços da TABELA DO SORTEIO, para depois do draft: quem está no draft custa o que
 * custou nele (casado pelo Riot ID, `pontosDoDraft`); quem está fora (sobra, fila de
 * reserva) recebe o preço da reta do sorteio, preso entre as linhas vizinhas — a tabela é
 * reconstruída do retrato gravado no estado (`tabelaDoRetrato`).
 */
export function precosDoSorteio(params: {
  retrato: RetratoDaTabela;
  pontosDoDraft: ReadonlyMap<string, number>;
  inscritos: readonly InscricaoDaPrevia[];
  /**
   * Os Riot IDs dos capitães do draft e se eles entraram sem preço (`capitaoGratis` do draft).
   * Sem preço, o capitão não tem valor na regra do substituto. Ausentes: draft antigo.
   */
  capitaesDoDraft?: ReadonlySet<string>;
  capitaoGratis?: boolean;
}): PreviaDosPrecos {
  const { retrato, pontosDoDraft, inscritos } = params;
  const tabela = tabelaDoRetrato(retrato);
  const noPool = new Set(inscritos.filter((i) => i.riot_id !== undefined && pontosDoDraft.has(i.riot_id)).map((i) => i.id));
  const capitaoGratis = params.capitaoGratis === true;
  const capitaesDoDraft = params.capitaesDoDraft ?? new Set<string>();
  const capitaes = new Set(inscritos.filter((i) => i.riot_id !== undefined && capitaesDoDraft.has(i.riot_id)).map((i) => i.id));
  return {
    tabela,
    origem: "sorteio",
    times: retrato.times,
    // Com o capitão sem preço o retrato conta só os pagos por time (4): as vagas são uma a mais.
    vagas: retrato.times * (retrato.jogadoresPorTime + (retrato.capitaoGratis ? 1 : 0)),
    elegiveis: inscritos.filter((i) => contaParaTimes(i.situacao)).length,
    noPool,
    preco: (i) => {
      const doDraft = i.riot_id !== undefined ? pontosDoDraft.get(i.riot_id) : undefined;
      if (doDraft !== undefined) return doDraft;
      return temEloReconhecido(i) ? precoNaTabela(tabela, eloDoJogadorDaInscricao(i)) : null;
    },
    forca: forcaDe,
    queda: retrato.queda ?? null,
    fechaComOsCapitaes: null,
    capitaesDaTabela: null,
    capitaes,
    capitaoGratis,
    semPreco: (i) => capitaoGratis && capitaes.has(i.id),
  };
}

/**
 * Regra do substituto ("valor igual ou menor ao do substituído") pela prévia: o preço da
 * tabela automática quando ela existe; antes de fechar um time, a força (a mesma régua da
 * tabela, que nunca desce de preço quando a força sobe). Elo ilegível não substitui nem é
 * substituído — sem elo não há valor para comparar. Capitão SEM PREÇO também não: ele não
 * tem valor na tabela, e a troca de um capitão é decisão da organização (regra 6).
 */
export function podeSubstituir(previa: PreviaDosPrecos, substituto: InscricaoDaPrevia, substituido: InscricaoDaPrevia): boolean {
  if (previa.semPreco(substituto) || previa.semPreco(substituido)) return false;
  if (previa.tabela) {
    const ps = previa.preco(substituto);
    const pa = previa.preco(substituido);
    return ps !== null && pa !== null && ps <= pa;
  }
  const fs = previa.forca(substituto);
  const fa = previa.forca(substituido);
  return fs !== null && fa !== null && fs <= fa;
}
