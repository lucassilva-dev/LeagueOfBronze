/**
 * Os elencos ainda FECHAM?
 *
 * A pergunta que o draft precisa responder antes de aceitar cada escolha: existe um jeito
 * de distribuir os jogadores ainda disponíveis entre as vagas abertas de TODOS os times,
 * exatamente as vagas de cada um, sem nenhum passar do próprio orçamento?
 *
 * ⚠ POR QUE ISTO EXISTE (auditoria de 2026-10-20).
 *
 * O motor reservava 1 ponto por vaga futura (`tetoDaEscolha`). Isso só é seguro se
 * existir jogador de 1 ponto — e na 4ª Edição o mais barato do pool custa 3 (Prata), sem
 * Ferro nem Bronze. Com os pontos reais e orçamento 30, o draft TRAVAVA ao vivo em cerca
 * de 65% das simulações: um capitão gastava dentro do teto, chegava à última vaga com 1
 * ponto e ninguém cabia. O motor pausava, retomar reabria o mesmo beco, e a única saída
 * era sortear tudo de novo na frente do grupo.
 *
 * Com esta checagem, a invariante passa a ser: o estado é viável antes de cada escolha.
 * Se é viável, existe uma distribuição completa — e nela o time da vez recebe alguém;
 * escolher esse alguém mantém a viabilidade. Então, montado viável, o draft nunca trava.
 *
 * Global, e não só do time da vez: um capitão que leva o último jogador barato pode deixar
 * OUTRO time sem como completar. O regulamento fala do próprio orçamento ("reservar pontos
 * para fechar as rodadas restantes"), mas permitir essa escolha é aceitar um draft que
 * para no meio da transmissão — e quem pagaria seria o outro time.
 *
 * Exata, por busca com memória sobre a CONTAGEM de jogadores por valor de pontos: o preço
 * vem da tabela de elos, então há poucos valores distintos (≤ 10), e o que importa para a
 * pergunta é quantos de cada valor sobram, não quem são.
 */

export type VagasDoTime = { vagas: number; folga: number };

/**
 * Passos máximos da busca, por chamada. Com o pool real da 4ª (Prata para cima) e o
 * orçamento da regra, uma busca leva no máximo milhares de passos. Com Ferro/Bronze e
 * orçamento justíssimo, 1–2% das buscas chegavam ao teto (~80 ms cada) — por isso a
 * montagem, que roda uma vez, usa um orçamento muito maior (`ORCAMENTO_DA_MONTAGEM`), e a
 * lista de escolhíveis é guardada por revisão em lib/draft/store.ts.
 */
export const ORCAMENTO_DE_PASSOS = 250_000;
export const ORCAMENTO_DA_MONTAGEM = 5_000_000;

export type Viabilidade = "fecha" | "nao_fecha" | "indeterminado";

/**
 * Dá para preencher as vagas de todos os times com os custos disponíveis?
 *
 * `indeterminado` só aparece se a busca passar do orçamento de passos — edição com muito
 * mais times do que a 4ª. Quem chama trata como "fecha" (o comportamento antigo, que
 * nunca recusava por isso), para uma configuração gigante não travar o draft inteiro.
 */
export function elencosFecham(
  times: readonly VagasDoTime[],
  custos: readonly number[],
  orcamentoDePassos: number = ORCAMENTO_DE_PASSOS,
): Viabilidade {
  const comVaga = times.filter((t) => t.vagas > 0);
  if (comVaga.some((t) => t.folga < 0)) return "nao_fecha";

  const totalVagas = comVaga.reduce((s, t) => s + t.vagas, 0);
  if (totalVagas === 0) return "fecha";
  if (custos.length < totalVagas) return "nao_fecha";

  // Contagem por valor, do mais barato para o mais caro.
  const porValor = new Map<number, number>();
  for (const c of custos) porValor.set(c, (porValor.get(c) ?? 0) + 1);
  const valores = [...porValor.keys()].sort((a, b) => a - b);
  const contagem = valores.map((v) => porValor.get(v)!);

  // Cortes baratos antes da busca: cada time sozinho e todos juntos com os mais baratos.
  const ordenados = [...custos].sort((a, b) => a - b);
  const somaDosMaisBaratos = (n: number) => ordenados.slice(0, n).reduce((s, c) => s + c, 0);
  if (comVaga.some((t) => somaDosMaisBaratos(t.vagas) > t.folga)) return "nao_fecha";
  if (somaDosMaisBaratos(totalVagas) > comVaga.reduce((s, t) => s + t.folga, 0)) return "nao_fecha";

  // Times mais apertados primeiro: falham cedo e podam mais.
  const fila = [...comVaga].sort((a, b) => a.folga / a.vagas - b.folga / b.vagas || b.vagas - a.vagas);

  const falhou = new Set<string>();
  let passos = 0;
  let estourou = false;

  /** Menor soma possível de `n` jogadores a partir do índice `desde` da contagem. */
  const minimoAPartirDe = (cont: number[], desde: number, n: number): number => {
    let soma = 0;
    let falta = n;
    for (let i = desde; i < cont.length && falta > 0; i++) {
      const usa = Math.min(cont[i]!, falta);
      soma += usa * valores[i]!;
      falta -= usa;
    }
    return falta > 0 ? Infinity : soma;
  };

  const resolver = (idx: number, cont: number[]): boolean => {
    if (idx === fila.length) return true;
    if (++passos > orcamentoDePassos) {
      estourou = true;
      return false;
    }
    const chave = `${idx}|${cont.join(",")}`;
    if (falhou.has(chave)) return false;

    const time = fila[idx]!;
    // Escolhe quantos de cada valor este time leva, do mais barato para o mais caro.
    const escolher = (i: number, faltam: number, soma: number): boolean => {
      if (estourou) return false;
      if (faltam === 0) return resolver(idx + 1, cont);
      if (i >= valores.length) return false;
      if (soma + minimoAPartirDe(cont, i, faltam) > time.folga) return false;

      const maximo = Math.min(cont[i]!, faltam, Math.floor((time.folga - soma) / valores[i]!));
      // Mais caros primeiro dentro do valor: deixa os baratos para os outros times.
      for (let k = maximo; k >= 0; k--) {
        cont[i] = cont[i]! - k;
        const ok = escolher(i + 1, faltam - k, soma + k * valores[i]!);
        cont[i] = cont[i]! + k;
        if (ok) return true;
        if (estourou) return false;
      }
      return false;
    };

    const ok = escolher(0, time.vagas, 0);
    if (!ok && !estourou) falhou.add(chave);
    return ok;
  };

  const ok = resolver(0, contagem);
  if (estourou) return "indeterminado";
  return ok ? "fecha" : "nao_fecha";
}
