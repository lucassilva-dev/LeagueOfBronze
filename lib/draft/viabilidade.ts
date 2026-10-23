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
 * vem da tabela de elos, então há poucos valores distintos, e o que importa para a pergunta
 * é quantos de cada valor sobram, não quem são.
 *
 * Dois cortes deixam a busca rápida o bastante para nunca estourar o orçamento de passos nos
 * tamanhos da 4ª — com a tabela de soma exata, a 1ª escolha do pool real chegava a estourar
 * (e "indeterminado" conta como "fecha": foi assim que um draft com curvatura 0,1 travou):
 *
 *  1. TIMES IGUAIS (mesmas vagas e mesma folga — no início da 4ª, quatro capitães Diamante IV)
 *     são intercambiáveis: se uma distribuição serve, trocar os elencos de dois deles também
 *     serve. Então o 2º de um grupo de iguais só tenta elencos que venham DEPOIS do elenco do
 *     1º na ordem da busca, e assim por diante — cada repartição é tentada uma vez, e não em
 *     todas as permutações.
 *  2. TODO MUNDO VAI SER ESCOLHIDO (jogadores restantes = vagas restantes, como sempre no
 *     draft: o pool é exatamente as vagas). Aí a soma das sobras de todos os times é FIXA:
 *     `Σ folgas − Σ custos`. Nenhum time pode sobrar mais que isso — cada um precisa gastar
 *     pelo menos `folga − sobra total` —, e a busca corta o elenco que nem com os mais caros
 *     que restam chega lá. Com a soma exata (sobra total 0), cada time precisa fechar a folga
 *     EXATA, e quase tudo é cortado cedo. Com gente a mais que vagas, a sobra total é no
 *     máximo essa mais os que podem ficar de fora (os mais caros que restam).
 *
 * Os dois cortes só tiram ramos que não podem dar certo (ou que repetem outro ramo): a
 * resposta é a mesma da busca sem eles, só que achada antes.
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
  const somaDasFolgas = comVaga.reduce((s, t) => s + t.folga, 0);
  if (somaDosMaisBaratos(totalVagas) > somaDasFolgas) return "nao_fecha";

  // Times mais apertados primeiro: falham cedo e podam mais. Times iguais ficam lado a lado.
  const fila = [...comVaga].sort((a, b) => a.folga / a.vagas - b.folga / b.vagas || b.vagas - a.vagas);
  const igualAoAnterior = fila.map(
    (t, i) => i > 0 && t.vagas === fila[i - 1]!.vagas && t.folga === fila[i - 1]!.folga,
  );
  // Folga somada dos times de `idx` em diante.
  const folgaDaqui: number[] = new Array(fila.length + 1).fill(0);
  for (let i = fila.length - 1; i >= 0; i--) folgaDaqui[i] = folgaDaqui[i + 1]! + fila[i]!.folga;

  // Corte 2: com todo mundo escolhido, a sobra total é fixa. Com `sobrando` jogadores a mais
  // do que vagas, ela é no máximo a de antes mais os `sobrando` mais caros (os que podem ficar
  // de fora) — um limite mais frouxo, mas ainda um limite.
  const sobrando = custos.length - totalVagas;

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

  /** Maior soma possível de `n` jogadores a partir do índice `desde` (os mais caros que restam). */
  const maximoAPartirDe = (cont: number[], desde: number, n: number): number => {
    let soma = 0;
    let falta = n;
    for (let i = cont.length - 1; i >= desde && falta > 0; i--) {
      const usa = Math.min(cont[i]!, falta);
      soma += usa * valores[i]!;
      falta -= usa;
    }
    return falta > 0 ? -Infinity : soma;
  };

  /**
   * `restante`: soma dos custos que sobram em `cont`. `anterior`: o elenco (contagem por valor)
   * que o time anterior levou, quando ele é igual a este — o limite da quebra de simetria.
   */
  const resolver = (idx: number, cont: number[], restante: number, anterior: readonly number[] | null): boolean => {
    if (idx === fila.length) return true;
    if (++passos > orcamentoDePassos) {
      estourou = true;
      return false;
    }
    const limite = igualAoAnterior[idx] ? anterior : null;
    const chave = `${idx}|${cont.join(",")}${limite ? `|${limite.join(",")}` : ""}`;
    if (falhou.has(chave)) return false;

    const time = fila[idx]!;
    // O mínimo que este time precisa gastar: nenhum time sobra mais que a sobra total dos que
    // faltam — `Σ folgas − Σ custos que restam`, mais o que pode ficar de fora sem ser escolhido.
    const sobraTotal = folgaDaqui[idx]! - restante + (sobrando > 0 ? maximoAPartirDe(cont, 0, sobrando) : 0);
    const piso = time.folga - sobraTotal;
    const escolhido = new Array<number>(valores.length).fill(0);

    // Escolhe quantos de cada valor este time leva, do mais barato para o mais caro.
    // `preso`: até aqui o elenco é igual ao do time anterior (igual a este), então o próximo
    // valor não pode passar da quantidade que ele levou.
    const escolher = (i: number, faltam: number, soma: number, preso: boolean): boolean => {
      if (estourou) return false;
      if (faltam === 0) {
        if (soma < piso) return false;
        return resolver(idx + 1, cont, restante - soma, escolhido);
      }
      if (i >= valores.length) return false;
      if (soma + minimoAPartirDe(cont, i, faltam) > time.folga) return false;
      if (soma + maximoAPartirDe(cont, i, faltam) < piso) return false;

      let maximo = Math.min(cont[i]!, faltam, Math.floor((time.folga - soma) / valores[i]!));
      if (preso && limite) maximo = Math.min(maximo, limite[i]!);
      // Mais caros primeiro dentro do valor: deixa os baratos para os outros times.
      for (let k = maximo; k >= 0; k--) {
        cont[i] = cont[i]! - k;
        escolhido[i] = k;
        const ok = escolher(i + 1, faltam - k, soma + k * valores[i]!, preso && limite !== null && k === limite[i]);
        cont[i] = cont[i]! + k;
        escolhido[i] = 0;
        if (ok) return true;
        if (estourou) return false;
      }
      return false;
    };

    const ok = escolher(0, time.vagas, 0, limite !== null);
    if (!ok && !estourou) falhou.add(chave);
    return ok;
  };

  const ok = resolver(0, contagem, custos.reduce((s, c) => s + c, 0), null);
  if (estourou) return "indeterminado";
  return ok ? "fecha" : "nao_fecha";
}
