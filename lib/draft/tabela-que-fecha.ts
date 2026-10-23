import {
  CURVATURA_PADRAO,
  calcularTabela,
  classeDoElo,
  precoNaTabela,
  type EloDoJogador,
  type Granularidade,
  type TabelaDePontos,
} from "@/lib/draft/precos";
import { elencosFecham, ORCAMENTO_DA_MONTAGEM } from "@/lib/draft/viabilidade";

/**
 * A TABELA QUE FECHA COM ESTES CAPITÃES.
 *
 * A tabela de pontos (lib/draft/precos.ts) soma exatamente `times × orçamento`, então todo
 * time termina o draft com o orçamento inteiro — e os elencos precisam se repartir em somas
 * exatas. Com a curvatura padrão há pools em que isso não existe com os capitães que vão
 * jogar: o caso que preocupa na 4ª é o Mestre do topo subir de PDL até o congelamento
 * (com 40 jogadores e curvatura 0,1 ele fecha até 399 PDL; com 450 a repartição deixa de
 * fechar, e com 550 ele custaria mais do que qualquer time consegue pagar numa escolha).
 * Antes, a montagem simplesmente recusava o sorteio.
 *
 * Agora quem calcula a tabela com os capitães — a prévia do servidor (capitães da regra), a
 * montagem (capitães escolhidos) e a prévia do painel — desce sozinho, nesta ordem, e fica
 * com a PRIMEIRA tabela que fecha:
 *
 *  1. a curvatura, em passos de 0,0125, até 0 — sempre com a soma exata;
 *  2. com curvatura 0, a soma: `alvo − 1`, `alvo − 2`, … até `alvo − times` (cada ponto a
 *     menos é um ponto que um time pode terminar sem gastar).
 *
 * O retrato da tabela leva a curvatura usada, a folga e o motivo em português, e a tela
 * mostra. Só se nada fechar a resposta é "não fecha" (e a tabela é a pedida).
 *
 * CAPITÃO SEM PREÇO (`capitaoGratis`, decisão da organização de 23/10/2026): o capitão não
 * custa nada e todo time tem o orçamento INTEIRO para as escolhas — sem compensar a força do
 * capitão, de propósito. A tabela é calculada SÓ sobre quem vai ser escolhido (o pool menos os
 * capitães), com `jogadoresPorTime − 1` pagos por time e a mesma soma `times × orçamento`
 * (na 4ª: 32 pessoas, 4 por time, 240 pontos, preço médio 7,5). O capitão entra no draft com
 * 0 ponto, e a viabilidade dá a cada time a folga do orçamento inteiro. Sem a chave, o capitão
 * é pago pelo orçamento, como até a 3ª — os dois caminhos continuam valendo.
 *
 * Funções PURAS, sem `server-only`: o painel chama a mesma conta no navegador.
 */

/** O passo da descida da curvatura. */
export const PASSO_DA_QUEDA = 0.0125;

export type JogadorDaConta = { id: string; elo: EloDoJogador };

export type TabelaQueFecha = {
  tabela: TabelaDePontos;
  /** O preço de cada jogador do pool nesta tabela. */
  precoDe: Map<string, number>;
  /** Os capitães fecham os elencos com ela. `false` só quando nenhuma tentativa fechou. */
  fecha: boolean;
  /** De onde a conta desceu, e por quê. Nulo quando valeu a tabela pedida (ou nada fechou). */
  queda: { curvaturaPedida: number; motivo: string } | null;
};

/** As tentativas, na ordem: a curvatura descendo com a soma exata, depois a soma descendo. */
export function tentativasDaQueda(curvaturaPedida: number, times: number): { curvatura: number; menos: number }[] {
  const lista: { curvatura: number; menos: number }[] = [];
  const pedida = Math.max(0, curvaturaPedida);
  for (let passo = 0; ; passo++) {
    const curvatura = Math.max(0, Math.round((pedida - passo * PASSO_DA_QUEDA) * 1e6) / 1e6);
    lista.push({ curvatura, menos: 0 });
    if (curvatura === 0) break;
  }
  for (let menos = 1; menos <= times; menos++) lista.push({ curvatura: 0, menos });
  return lista;
}

export function tabelaQueFecha(params: {
  pool: readonly JogadorDaConta[];
  capitaes: readonly string[];
  times: number;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  granularidade?: Granularidade;
  curvatura?: number;
  /** Capitão sem preço: a tabela é só de quem vai ser escolhido, e o capitão custa 0. */
  capitaoGratis?: boolean;
}): TabelaQueFecha {
  const { pool, capitaes, times, jogadoresPorTime, orcamentoPorTime, granularidade } = params;
  const capitaoGratis = params.capitaoGratis === true;
  const curvaturaPedida = Math.max(0, params.curvatura ?? CURVATURA_PADRAO);
  const alvo = Math.max(0, times) * orcamentoPorTime;
  const doCapitao = new Set(capitaes);
  // Quem paga: com o capitão sem preço, só quem vai ser escolhido — 4 por time na 4ª.
  const pagantes = capitaoGratis ? pool.filter((j) => !doCapitao.has(j.id)) : pool;
  const pagosPorTime = capitaoGratis ? jogadoresPorTime - 1 : jogadoresPorTime;

  const calcular = (curvatura: number, menos: number) => {
    const tabela = calcularTabela({
      pool: pagantes.map((j) => j.elo),
      times,
      jogadoresPorTime: pagosPorTime,
      orcamentoPorTime,
      granularidade,
      curvatura,
      somaMaxima: menos > 0 ? alvo - menos : undefined,
    });
    const precoDe = new Map(
      pool.map((j) => [j.id, capitaoGratis && doCapitao.has(j.id) ? 0 : precoNaTabela(tabela, j.elo)]),
    );
    return { tabela, precoDe };
  };

  const pedida = calcular(curvaturaPedida, 0);
  const fechaCom = (precoDe: ReadonlyMap<string, number>) =>
    capitaesFecham({ capitaes, precoDe, jogadoresPorTime, orcamentoPorTime, capitaoGratis });

  if (fechaCom(pedida.precoDe)) return { ...pedida, fecha: true, queda: null };

  for (const tentativa of tentativasDaQueda(curvaturaPedida, times).slice(1)) {
    const tentada = calcular(tentativa.curvatura, tentativa.menos);
    // A soma pedida pode não existir (pool estreito): a tabela fica por baixo, com folga maior.
    if (!fechaCom(tentada.precoDe)) continue;
    return {
      ...tentada,
      fecha: true,
      queda: {
        curvaturaPedida,
        motivo: motivoDaQueda({
          pedida,
          usada: tentada.tabela,
          pool,
          capitaes,
          jogadoresPorTime,
          orcamentoPorTime,
          capitaoGratis,
        }),
      },
    };
  }
  return { ...pedida, fecha: false, queda: null };
}

/** "0,1", "0,0875", "0": a curvatura escrita como a organização lê. */
export function curvaturaEscrita(curvatura: number): string {
  return String(Math.round(curvatura * 1e6) / 1e6).replace(".", ",");
}

/**
 * Por que a tabela pedida não fechava — o recado que a prévia mostra.
 *
 * O caso que se espera é um jogador caro demais: o mais caro de fora dos capitães custa mais
 * do que qualquer time consegue pagar numa escolha (orçamento − capitão − 1 jogador mais
 * barato por vaga que sobra). Depois, um capitão caro demais para o próprio time completar.
 * Senão, é a repartição: os preços existem, mas não há divisão que feche todos.
 */
function motivoDaQueda(params: {
  pedida: { tabela: TabelaDePontos; precoDe: ReadonlyMap<string, number> };
  usada: TabelaDePontos;
  pool: readonly JogadorDaConta[];
  capitaes: readonly string[];
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  capitaoGratis: boolean;
}): string {
  const { pedida, usada, pool, capitaes, jogadoresPorTime, orcamentoPorTime, capitaoGratis } = params;
  const de = curvaturaEscrita(pedida.tabela.curvatura);
  const rotuloDe = (j: JogadorDaConta) => {
    const forca = classeDoElo(j.elo, pedida.tabela.granularidade).forca;
    return pedida.tabela.linhas.find((l) => l.classe.forca === forca)?.classe.rotulo ?? j.elo.elo;
  };
  const preco = (j: JogadorDaConta) => pedida.precoDe.get(j.id) ?? 0;

  const doCapitao = new Set(capitaes);
  const outros = pool.filter((j) => !doCapitao.has(j.id));
  const deCapitao = pool.filter((j) => doCapitao.has(j.id));
  const maisBarato = outros.reduce((m, j) => Math.min(m, preco(j)), Infinity);
  const vagas = jogadoresPorTime - 1;

  let razao = `não existe divisão dos outros jogadores que feche os elencos de todos os capitães (cada time precisa terminar com os ${orcamentoPorTime} pontos certinhos)`;
  const caroDemais = [...outros].sort((a, b) => preco(b) - preco(a))[0];
  const capitaoCaro = [...deCapitao].sort((a, b) => preco(b) - preco(a))[0];
  const maximoNumaEscolha =
    deCapitao.length > 0 && Number.isFinite(maisBarato)
      ? Math.max(...deCapitao.map((c) => orcamentoPorTime - preco(c) - (vagas - 1) * maisBarato))
      : Infinity;
  if (caroDemais && vagas > 0 && preco(caroDemais) > maximoNumaEscolha) {
    razao = `o ${rotuloDe(caroDemais)} custaria ${preco(caroDemais)} e nenhum time conseguiria pagá-lo (cabem no máximo ${maximoNumaEscolha} numa escolha)`;
  } else if (
    // Capitão sem preço não pesa no orçamento de ninguém: o recado do capitão caro não existe.
    !capitaoGratis &&
    capitaoCaro &&
    vagas > 0 &&
    Number.isFinite(maisBarato) &&
    orcamentoPorTime - preco(capitaoCaro) < vagas * maisBarato
  ) {
    razao = `o capitão ${rotuloDe(capitaoCaro)} custaria ${preco(capitaoCaro)} e o time dele não conseguiria completar as outras ${vagas} vagas`;
  }

  if (usada.folga > 0) {
    const pontos = usada.folga === 1 ? "ponto" : "pontos";
    return `A curvatura caiu de ${de} para 0 e a soma ficou ${usada.folga} ${pontos} abaixo de ${usada.alvo} (${usada.soma}): com a soma exata, nenhuma curvatura deixava os elencos fecharem com estes capitães — com ${de}, ${razao}. Com a folga, um time pode terminar o draft gastando até ${usada.folga} ${pontos} a menos que outro.`;
  }
  return `A curvatura caiu de ${de} para ${curvaturaEscrita(usada.curvatura)}: com ${de}, ${razao}.`;
}

/**
 * Os capitães conseguem fechar os elencos com estes preços?
 *
 * É a mesma conta que a montagem faz (`estadoFecha`): cada time com as vagas que faltam e o
 * orçamento menos o preço do capitão, e os outros jogadores para repartir. Com o capitão sem
 * preço (`capitaoGratis`), a folga de cada time é o orçamento inteiro — o capitão entra no
 * draft com 0 ponto. "indeterminado" conta como "fecha", como no motor.
 *
 * Guardado por entrada: a prévia do servidor roda a cada sondagem do painel, a do painel a
 * cada mudança da lista, e cada uma tenta várias tabelas — a resposta só muda quando mudam
 * os preços, os capitães ou a configuração.
 */
const fechamentoGuardado = new Map<string, boolean>();

export function capitaesFecham(params: {
  capitaes: readonly string[];
  precoDe: ReadonlyMap<string, number>;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  capitaoGratis?: boolean;
}): boolean {
  const { capitaes, precoDe, jogadoresPorTime, orcamentoPorTime } = params;
  const doCapitao = new Set(capitaes);
  const precoDoCapitao = (id: string) => (params.capitaoGratis === true ? 0 : (precoDe.get(id) ?? 0));
  const times = capitaes.map((id) => ({ vagas: jogadoresPorTime - 1, folga: orcamentoPorTime - precoDoCapitao(id) }));
  const custos = [...precoDe].filter(([id]) => !doCapitao.has(id)).map(([, p]) => p);
  // Menos jogadores do que vagas (titular ainda não apto na hora de sortear, decisão C4): a
  // ordem perde as escolhas que faltam (lib/draft/motor.ts, `ajustarOrdemAoPool`). Cada uma
  // entra aqui como um "fantasma" de 0 ponto — o time que o leva termina com a vaga aberta —,
  // a mesma conta do motor. Sem isso, nenhuma tabela fecharia com um titular a menos.
  const vagasNoTotal = times.reduce((soma, t) => soma + Math.max(0, t.vagas), 0);
  for (let falta = vagasNoTotal - custos.length; falta > 0; falta--) custos.push(0);
  const chave = [
    jogadoresPorTime,
    orcamentoPorTime,
    times.map((t) => t.folga).sort((a, b) => a - b).join(","),
    [...custos].sort((a, b) => a - b).join(","),
  ].join("|");
  const guardado = fechamentoGuardado.get(chave);
  if (guardado !== undefined) return guardado;
  const fecha = elencosFecham(times, custos, ORCAMENTO_DA_MONTAGEM) !== "nao_fecha";
  fechamentoGuardado.set(chave, fecha);
  if (fechamentoGuardado.size > 64) {
    const maisAntiga = fechamentoGuardado.keys().next().value;
    if (maisAntiga !== undefined) fechamentoGuardado.delete(maisAntiga);
  }
  return fecha;
}
