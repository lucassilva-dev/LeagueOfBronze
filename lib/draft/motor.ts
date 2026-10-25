/**
 * Motor do draft ao vivo.
 *
 * Funções PURAS, sem banco e sem relógio próprio: o "agora" entra por parâmetro. É o
 * que permite simular um draft inteiro num teste, incluindo estouro de cronômetro,
 * sem esperar tempo real — e é o que garante que servidor e transmissão cheguem
 * exatamente ao mesmo estado a partir dos mesmos eventos.
 *
 * Três coisas que este arquivo NÃO faz:
 *  1. não decide de quem é a vez pelo que o cliente diz — quem chama informa o time,
 *     e `podeEscolher` confere contra a ordem;
 *  2. não conhece o número 6. O design entregue tinha seis times cravados; aqui o
 *     número sai dos aprovados;
 *  3. não guarda pontuação vinda do cliente. Os pontos chegam prontos do banco, já
 *     derivados do elo.
 */

import { elencosFecham, type Viabilidade } from "@/lib/draft/viabilidade";

// ---------------------------------------------------------------- tipos

export type TimeDoDraft = {
  id: string;
  nome: string;
  cor: string;
  /** Id do jogador que é o capitão. Ele já ocupa uma vaga e já custa os pontos dele. */
  capitaoId: string;
  /**
   * O TIME DEFINIDO pela organização (24/10/2026, lib/draft/time-definido.ts): os ids do elenco
   * inteiro, capitão incluído. Ele já entra completo (`montarDraft`) e fica FORA da ordem de
   * escolha — não escolhe e ninguém o escolhe. Ausente nos times que disputam o draft.
   */
  elencoDefinido?: string[];
};

export type JogadorDoDraft = {
  id: string;
  riotId: string;
  pontos: number;
  rota1: string;
  rota2: string;
  elo: string;
  /**
   * A classe de preço na tabela do sorteio ("Ouro II", "Mestre · 200–299 PDL"): o preço varia
   * por divisão, e as telas mostram a classe ao lado do elo. Opcional: estados gravados antes
   * da tabela por divisão não têm, e o motor não olha para ela.
   */
  classe?: string;
  /** null enquanto não foi escolhido. */
  timeId: string | null;
};

export type EventoDraft = {
  escolha: number;
  timeId: string;
  jogadorId: string;
  /** true quando o cronômetro estourou e o motor escolheu sozinho. */
  automatica: boolean;
  emISO: string;
};

export type FaseDraft = "preparando" | "rodando" | "pausado" | "encerrado";

/**
 * Como as rodadas se sucedem. "serpentina" (o padrão): 1→N, depois N→1. "linear": 1→N em TODAS
 * as rodadas — a decisão da organização na hora do draft da 4ª (24/10/2026, 22h).
 */
export type TipoDeOrdem = "serpentina" | "linear";

/**
 * Por que o draft parou. A transmissão dizia sempre "a organização interrompeu o relógio",
 * inclusive quando foi o motor que pausou sozinho — e na TV isso vira acusação.
 */
export type MotivoDaPausa = "organizacao" | "atraso" | "sem_jogador";

export type EstadoDraft = {
  versao: 1;
  fase: FaseDraft;
  times: TimeDoDraft[];
  jogadores: JogadorDoDraft[];
  /** Um timeId por escolha, na ordem serpentina. O tamanho é o total de escolhas. */
  ordem: string[];
  /** Índice em `ordem`. Igual a `ordem.length` significa draft terminado. */
  escolhaAtual: number;
  /** Instante ABSOLUTO em que a escolha atual vence. Nulo quando não está rodando. */
  prazoISO: string | null;
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  segundosPorEscolha: number;
  historico: EventoDraft[];
  /**
   * O sorteio da ordem (quem capitaneia qual time e quem escolhe primeiro): a semente e
   * a lista de capitães ANTES de embaralhar. Com os dois, `embaralhar(semente,
   * "capitaes", capitaes)` refaz a ordem de `times` — o sorteio pode ser conferido.
   * Opcional porque drafts montados antes do sorteio não têm.
   */
  sorteio?: { semente: string; capitaes: string[]; emISO: string };
  /** Ausente = serpentina (todo estado gravado antes de 24/10/2026). */
  tipoDeOrdem?: TipoDeOrdem;
  /** Só com `fase === "pausado"`. Ausente em estados gravados antes deste campo existir. */
  motivoDaPausa?: MotivoDaPausa;
  /**
   * Quem estava no POOL (ainda não escolhido) e saiu depois do sorteio: a inscrição ficou
   * recusada, desistente ou excluída (decisão C1 de 2026-10-22). Sai dos escolhíveis NA HORA
   * — nem o capitão nem a escolha automática levam — e a transmissão mostra que saiu. Quem
   * já está num elenco (escolhido ou capitão) e sai NÃO entra aqui: o draft segue com ele
   * (C2), e a vaga é reposta depois da virada, pela saída de vez.
   *
   * Quem grava é `atualizarForaDoPool`, a partir da situação ATUAL das inscrições (a
   * sondagem lê). Opcional: estados gravados antes não têm, e lista vazia não é gravada.
   */
  foraDoPool?: string[];
};

/**
 * Por que a escolha não vale. `motivo` é o recado em português (o painel da mesa e o log
 * leem ele); `codigo` e `params` deixam a tela do capitão dizer a mesma coisa no idioma
 * dela (lib/i18n/messages/draft.ts, `erros`).
 */
export type CodigoDaRecusa =
  | "encerrado"
  | "nao_comecou"
  | "pausado"
  | "sem_escolha"
  | "nao_e_a_vez"
  | "fora_do_pool"
  | "saiu_do_pool"
  | "ja_escolhido"
  | "elenco_completo"
  | "acima_do_teto"
  | "nao_fecha_o_seu"
  | "falta_para_outro";
export type Recusa = {
  ok: false;
  motivo: string;
  codigo: CodigoDaRecusa;
  params?: Readonly<Record<string, string | number>>;
};
export type Aprovacao = { ok: true };

// ---------------------------------------------------------------- ordem

/**
 * Ordem serpentina: 1→N na primeira rodada, N→1 na segunda, e assim por diante.
 *
 * Sem a inversão, o primeiro time escolheria primeiro em todas as rodadas e teria
 * vantagem composta. Com ela, quem escolhe por último numa rodada abre a seguinte.
 */
export function ordemSerpentina(timeIds: readonly string[], rodadas: number): string[] {
  const ordem: string[] = [];
  for (let r = 0; r < rodadas; r++) {
    const daVez = r % 2 === 0 ? timeIds : [...timeIds].reverse();
    ordem.push(...daVez);
  }
  return ordem;
}

/** A ordem das rodadas do tipo pedido: a serpentina ou 1→N em todas (`TipoDeOrdem`). */
export function ordemDasRodadas(timeIds: readonly string[], rodadas: number, tipo: TipoDeOrdem = "serpentina"): string[] {
  if (tipo === "serpentina") return ordemSerpentina(timeIds, rodadas);
  const ordem: string[] = [];
  for (let r = 0; r < rodadas; r++) ordem.push(...timeIds);
  return ordem;
}

/** Rodadas = vagas por time menos o capitão, que já está no elenco. */
export function rodadasDoDraft(jogadoresPorTime: number): number {
  return Math.max(0, jogadoresPorTime - 1);
}

/** O time já entrou completo, definido pela organização: fora da ordem de escolha. */
export function ehTimeDefinido(time: Pick<TimeDoDraft, "elencoDefinido">): boolean {
  return Array.isArray(time.elencoDefinido) && time.elencoDefinido.length > 0;
}

/** Os ids dos times que disputam o draft (todos menos o definido), na ordem do sorteio. */
function idsQueEscolhem(times: readonly TimeDoDraft[]): string[] {
  return times.filter((t) => !ehTimeDefinido(t)).map((t) => t.id);
}

// ---------------------------------------------------------------- contas por time

export function elencoDoTime(estado: EstadoDraft, timeId: string): JogadorDoDraft[] {
  return estado.jogadores.filter((j) => j.timeId === timeId);
}

/** Pontos já comprometidos, INCLUINDO o capitão — ele sai do mesmo bolo. */
export function gastoDoTime(estado: EstadoDraft, timeId: string): number {
  return elencoDoTime(estado, timeId).reduce((soma, j) => soma + j.pontos, 0);
}

export function vagasAbertasDoTime(estado: EstadoDraft, timeId: string): number {
  return Math.max(0, estado.jogadoresPorTime - elencoDoTime(estado, timeId).length);
}

/** Quantas escolhas este time ainda tem na ordem, da escolha atual em diante. */
export function escolhasRestantesDoTime(estado: EstadoDraft, timeId: string): number {
  let n = 0;
  for (let i = estado.escolhaAtual; i < estado.ordem.length; i++) if (estado.ordem[i] === timeId) n++;
  return n;
}

/**
 * As vagas que o DRAFT ainda vai preencher neste time.
 *
 * Num draft normal é o mesmo que as vagas abertas: a serpentina dá a cada time uma escolha
 * por vaga além do capitão. Só muda quando alguém sai do pool depois do sorteio
 * (`atualizarForaDoPool`): faltando jogador para todas as vagas, a ordem perde escolhas, e o
 * time que perdeu uma termina o draft com uma vaga aberta — reposta depois, pela fila de
 * reserva. A conta de viabilidade e o teto olham ESTE número; senão pediriam um jogador que
 * não existe e o draft travaria.
 */
function vagasNoDraft(estado: EstadoDraft, timeId: string): number {
  return Math.min(vagasAbertasDoTime(estado, timeId), escolhasRestantesDoTime(estado, timeId));
}

/**
 * O máximo que este time pode gastar NESTA escolha.
 *
 * A subtração das vagas restantes é o que impede o time de gastar tudo num jogador
 * caro e depois não conseguir completar o elenco: cada vaga que sobrar depois desta
 * precisa de pelo menos 1 ponto, então esse mínimo fica reservado.
 *
 *   teto = orçamento − gasto − (vagas abertas − 1)
 *
 * "Vagas abertas" são as que o draft ainda preenche (`vagasNoDraft`).
 */
export function tetoDaEscolha(estado: EstadoDraft, timeId: string): number {
  const abertas = vagasNoDraft(estado, timeId);
  if (abertas === 0) return 0;
  return estado.orcamentoPorTime - gastoDoTime(estado, timeId) - (abertas - 1);
}

export function timeDaVez(estado: EstadoDraft): string | null {
  if (estado.fase !== "rodando" && estado.fase !== "pausado") return null;
  return estado.ordem[estado.escolhaAtual] ?? null;
}

/** Quem saiu do pool depois do sorteio (C1), como conjunto. */
function saidasDoEstado(estado: Pick<EstadoDraft, "foraDoPool">): ReadonlySet<string> {
  return new Set(estado.foraDoPool ?? []);
}

/** Quem ainda pode ser escolhido: sem time e sem ter saído do pool depois do sorteio. */
export function jogadoresDisponiveis(estado: EstadoDraft): JogadorDoDraft[] {
  const saiu = saidasDoEstado(estado);
  return estado.jogadores.filter((j) => j.timeId === null && !saiu.has(j.id));
}

/** Quem estava no pool e saiu depois do sorteio (C1): a transmissão e a mesa mostram. */
export function jogadoresQueSairamDoPool(estado: EstadoDraft): JogadorDoDraft[] {
  const saiu = saidasDoEstado(estado);
  return estado.jogadores.filter((j) => j.timeId === null && saiu.has(j.id));
}

// ---------------------------------------------------------------- validação

/**
 * A escolha vale?
 *
 * Esta é a função que o servidor chama antes de gravar. Ela confere de quem é a vez
 * contra `ordem`, e NÃO contra o que veio na requisição — é a diferença entre um
 * draft e um formulário em que qualquer um escolhe pelos outros.
 */
export function podeEscolher(
  estado: EstadoDraft,
  timeId: string,
  jogadorId: string,
): Aprovacao | Recusa {
  if (estado.fase === "encerrado") return { ok: false, codigo: "encerrado", motivo: "O draft já terminou." };
  if (estado.fase === "preparando") return { ok: false, codigo: "nao_comecou", motivo: "O draft ainda não começou." };
  if (estado.fase === "pausado") return { ok: false, codigo: "pausado", motivo: "O draft está pausado." };

  const daVez = timeDaVez(estado);
  if (daVez === null) return { ok: false, codigo: "sem_escolha", motivo: "Não há escolha em andamento." };
  if (daVez !== timeId) return { ok: false, codigo: "nao_e_a_vez", motivo: "Não é a vez do seu time." };

  const jogador = estado.jogadores.find((j) => j.id === jogadorId);
  if (!jogador) return { ok: false, codigo: "fora_do_pool", motivo: "Jogador não está no pool." };
  if (jogador.timeId !== null) return { ok: false, codigo: "ja_escolhido", motivo: "Esse jogador já foi escolhido." };
  if (saidasDoEstado(estado).has(jogador.id)) {
    return {
      ok: false,
      codigo: "saiu_do_pool",
      params: { riotId: jogador.riotId },
      motivo: `${jogador.riotId} saiu do draft depois do sorteio e não pode mais ser escolhido. Escolha outro jogador.`,
    };
  }

  if (vagasAbertasDoTime(estado, timeId) === 0) {
    return { ok: false, codigo: "elenco_completo", motivo: "Seu elenco já está completo." };
  }

  const teto = tetoDaEscolha(estado, timeId);
  if (jogador.pontos > teto) {
    return {
      ok: false,
      codigo: "acima_do_teto",
      params: { pontos: jogador.pontos, teto },
      motivo: `Esse jogador custa ${jogador.pontos} e você só pode gastar ${teto} nesta escolha — o resto está reservado para as vagas que faltam.`,
    };
  }

  // O teto acima reserva 1 ponto por vaga; a conta de verdade é com os jogadores que
  // existem (ver lib/draft/viabilidade.ts). Separa os dois recados: o próprio elenco não
  // fecharia, ou é OUTRO time que ficaria sem como completar.
  if (!fechaDepoisDe(estado, timeId, jogador)) {
    const soEuFecho = elencosFecham([situacaoDoTime(estado, timeId, jogador)], custosRestantes(estado, jogador.id));
    return {
      ok: false,
      codigo: soEuFecho === "nao_fecha" ? "nao_fecha_o_seu" : "falta_para_outro",
      params: { riotId: jogador.riotId, pontos: jogador.pontos },
      motivo:
        soEuFecho === "nao_fecha"
          ? `Com ${jogador.riotId} (${jogador.pontos} pts) o seu elenco não fecha: não sobraria jogador barato o bastante para as vagas que faltam. Escolha alguém mais barato.`
          : `${jogador.riotId} é o que falta para outro time conseguir fechar o elenco dentro do orçamento. Escolha outro jogador.`,
    };
  }

  return { ok: true };
}

// ---------------------------------------------------------------- viabilidade

function custosRestantes(estado: EstadoDraft, semJogadorId?: string): number[] {
  return jogadoresDisponiveis(estado)
    .filter((j) => j.id !== semJogadorId)
    .map((j) => j.pontos);
}

/** Vagas e folga de um time, opcionalmente depois de levar `levando`. */
function situacaoDoTime(estado: EstadoDraft, timeId: string, levando?: JogadorDoDraft) {
  const vagas = vagasNoDraft(estado, timeId) - (levando ? 1 : 0);
  const folga = estado.orcamentoPorTime - gastoDoTime(estado, timeId) - (levando ? levando.pontos : 0);
  return { vagas, folga };
}

/** A resposta da busca para `timeId` levar `jogador`: fecha, não fecha ou indeterminado. */
function viabilidadeDepoisDe(estado: EstadoDraft, timeId: string, jogador: JogadorDoDraft): Viabilidade {
  const times = estado.times.map((t) =>
    t.id === timeId ? situacaoDoTime(estado, t.id, jogador) : situacaoDoTime(estado, t.id),
  );
  return elencosFecham(times, custosRestantes(estado, jogador.id));
}

/**
 * Os elencos ainda fecham depois de `timeId` levar `jogador`?
 *
 * "indeterminado" (busca grande demais, edição com muito mais times) conta como "fecha":
 * é o comportamento de antes, que nunca recusava por isso.
 */
function fechaDepoisDe(estado: EstadoDraft, timeId: string, jogador: JogadorDoDraft): boolean {
  return viabilidadeDepoisDe(estado, timeId, jogador) !== "nao_fecha";
}

/**
 * Quem o time da vez pode levar, na ordem recebida: os que a busca PROVOU que fecham; só se
 * nenhum foi provado, os "indeterminados" (o comportamento de antes, que nunca travava por
 * isso). A conta é uma por valor de pontos.
 *
 * Depois que alguém sai do pool a soma deixa de ser exata, a poda da busca fica mais fraca, e
 * provar que um preço NÃO fecha passa do orçamento de passos: oferecer esse "indeterminado"
 * como se fechasse deixava o capitão (ou a escolha automática) levar justamente o jogador
 * que travava o draft algumas escolhas depois. Com um provado ao lado, ele não entra.
 */
function quemFechaParaAVez(estado: EstadoDraft, timeId: string, candidatos: readonly JogadorDoDraft[]): JogadorDoDraft[] {
  const porValor = new Map<number, Viabilidade>();
  const resposta = (j: JogadorDoDraft) => {
    if (!porValor.has(j.pontos)) porValor.set(j.pontos, viabilidadeDepoisDe(estado, timeId, j));
    return porValor.get(j.pontos)!;
  };
  const provados = candidatos.filter((j) => resposta(j) === "fecha");
  return provados.length > 0 ? provados : candidatos.filter((j) => resposta(j) === "indeterminado");
}

/**
 * O estado, do jeito que está, ainda fecha todos os elencos?
 *
 * Conferido na montagem: um sorteio que já nasce sem saída (capitães caros demais para o
 * orçamento e para o pool) não pode ir ao ar.
 */
export function estadoFecha(estado: EstadoDraft, orcamentoDePassos?: number): boolean {
  const times = estado.times.map((t) => situacaoDoTime(estado, t.id));
  return elencosFecham(times, custosRestantes(estado), orcamentoDePassos) !== "nao_fecha";
}

/**
 * Quem o time da vez pode escolher AGORA — a lista que as telas usam para apagar o resto.
 *
 * Antes cada tela recalculava "cabe" com a fórmula do teto, e mostrava como escolhível um
 * jogador que o servidor recusaria. Agora a resposta é a do motor. A conta é feita uma vez
 * por VALOR de pontos (jogadores do mesmo preço dão a mesma resposta), então custa poucas
 * buscas por sondagem.
 */
export function escolhiveisDaVez(estado: EstadoDraft): string[] {
  const timeId =
    estado.fase === "rodando" || estado.fase === "pausado" ? estado.ordem[estado.escolhaAtual] : undefined;
  if (!timeId || vagasAbertasDoTime(estado, timeId) === 0) return [];
  const teto = tetoDaEscolha(estado, timeId);
  return quemFechaParaAVez(
    estado,
    timeId,
    jogadoresDisponiveis(estado).filter((j) => j.pontos <= teto),
  ).map((j) => j.id);
}

/**
 * O mais barato que o time ainda pode pegar. Usado pelo auto-pick.
 *
 * Desempate por pontos, depois por Riot ID: precisa ser DETERMINÍSTICO, senão dois
 * cálculos do mesmo estado (o do servidor e o de uma reexecução) escolheriam pessoas
 * diferentes.
 */
export function maisBaratoValido(estado: EstadoDraft, timeId: string): JogadorDoDraft | null {
  const teto = tetoDaEscolha(estado, timeId);
  const candidatos = jogadoresDisponiveis(estado)
    .filter((j) => j.pontos <= teto)
    .sort((a, b) => a.pontos - b.pontos || a.riotId.localeCompare(b.riotId));

  // O mais barato quase sempre mantém tudo viável; a checagem existe para o caso em que
  // ele é justamente o que outro time precisa. O primeiro provado ganha do "indeterminado"
  // mais barato (ver `quemFechaParaAVez`); a busca para no primeiro provado.
  let incerto: JogadorDoDraft | null = null;
  const porValor = new Map<number, Viabilidade>();
  for (const j of candidatos) {
    if (!porValor.has(j.pontos)) porValor.set(j.pontos, viabilidadeDepoisDe(estado, timeId, j));
    const resposta = porValor.get(j.pontos);
    if (resposta === "fecha") return j;
    if (resposta === "indeterminado") incerto ??= j;
  }
  return incerto;
}

// ---------------------------------------------------------------- transições

/**
 * O prazo da próxima escolha.
 *
 * `baseMs` é de onde a contagem parte. Numa escolha feita por gente, parte de agora.
 * Num estouro de cronômetro, parte do prazo que venceu — e essa diferença importa:
 * se partisse de "agora", o calendário do draft dependeria de QUANDO alguém sondou o
 * servidor, e dois espectadores consultando em momentos diferentes chegariam a
 * estados diferentes. Com a corrente de prazos, o mesmo histórico sempre produz o
 * mesmo resultado, independente de quem olhou e quando.
 */
function proximoPrazo(estado: EstadoDraft, baseMs: number): string | null {
  if (estado.escolhaAtual >= estado.ordem.length) return null;
  return new Date(baseMs + estado.segundosPorEscolha * 1000).toISOString();
}

/**
 * Aplica uma escolha e devolve um estado NOVO (não muda o recebido).
 *
 * Quem chama já passou por `podeEscolher`; aqui repetimos a checagem porque esta
 * função também é usada pelo auto-pick, e um motor que confia em quem chama é um
 * motor que grava estado inválido no dia em que alguém esquecer a validação.
 */
export function aplicarEscolha(
  estado: EstadoDraft,
  timeId: string,
  jogadorId: string,
  agoraMs: number,
  automatica = false,
  /** De onde parte o prazo seguinte. Ver `proximoPrazo`. Padrão: agora. */
  baseDoProximoPrazoMs?: number,
): EstadoDraft {
  const veredito = podeEscolher(estado, timeId, jogadorId);
  if (!veredito.ok) throw new Error(veredito.motivo);

  const jogadores = estado.jogadores.map((j) => (j.id === jogadorId ? { ...j, timeId } : j));
  const escolhaAtual = estado.escolhaAtual + 1;
  const terminou = escolhaAtual >= estado.ordem.length;

  const novo: EstadoDraft = {
    ...estado,
    jogadores,
    escolhaAtual,
    fase: terminou ? "encerrado" : estado.fase,
    historico: [
      ...estado.historico,
      {
        escolha: estado.escolhaAtual,
        timeId,
        jogadorId,
        automatica,
        emISO: new Date(agoraMs).toISOString(),
      },
    ],
    prazoISO: null,
  };

  novo.prazoISO = terminou ? null : proximoPrazo(novo, baseDoProximoPrazoMs ?? agoraMs);
  return novo;
}

/**
 * O cronômetro estourou: escolhe o mais barato válido pelo time da vez.
 *
 * Devolve o estado inalterado quando ainda há tempo — quem chama pode invocar sem
 * conferir antes. Se não houver ninguém válido (orçamento apertado demais), o draft
 * PAUSA em vez de travar em silêncio: é caso de a organização intervir.
 */
export function avancarPorTempo(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase !== "rodando") return estado;
  if (!estado.prazoISO) return estado;

  const venceuEm = Date.parse(estado.prazoISO);
  if (venceuEm > agoraMs) return estado;

  const timeId = timeDaVez(estado);
  if (!timeId) return estado;

  const escolhido = maisBaratoValido(estado, timeId);
  if (!escolhido) {
    return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "sem_jogador" };
  }

  // A escolha automática é datada no instante em que o prazo venceu, não em quando
  // alguém percebeu — e o prazo seguinte parte dali. É o que faz o histórico ser o
  // mesmo para todo mundo.
  return aplicarEscolha(estado, timeId, escolhido.id, venceuEm, true, venceuEm);
}

/**
 * Atraso a partir do qual paramos de escolher sozinhos e pedimos gente: UMA escolha inteira
 * (decisão C3 de 2026-10-22; antes eram 10).
 *
 * Com a transmissão no ar, alguém sonda a cada 2 s, e o capitão ausente leva a escolha
 * automática alguns segundos depois do prazo — o atraso nunca chega perto de uma escolha
 * inteira. Passar disso quer dizer que NINGUÉM estava sondando (queda de internet da mesa,
 * da TV, do servidor): com 10 escolhas de folga, uma queda de alguns minutos voltava com
 * vários times sorteados por auto-pick de uma vez, sem ninguém ver. Agora o draft pausa
 * sozinho (motivo "atraso") e a organização retoma quando a sala estiver de volta.
 */
const ESCOLHAS_DE_ATRASO_ATE_PAUSAR = 1;

/**
 * Roda os estouros pendentes — no máximo o que cabe em uma escolha de atraso.
 *
 * Necessário porque ninguém garante que o servidor foi acordado na hora exata: em
 * serverless, a sondagem chega alguns segundos depois do prazo. Atraso maior que uma
 * escolha inteira é queda, e aí o draft PAUSA (ver `ESCOLHAS_DE_ATRASO_ATE_PAUSAR`).
 */
export function alcancarORelogio(estado: EstadoDraft, agoraMs: number, maxPassos = 200): EstadoDraft {
  if (estado.fase !== "rodando" || !estado.prazoISO) return estado;

  // Freio contra a queda: a corrente de prazos é determinística, então sem isto um draft
  // que ficou sem sondagem acordaria com várias escolhas feitas por auto-pick. Atraso de
  // mais de uma escolha inteira não é capitão ausente — é a sala que caiu, e aí quem
  // decide a hora de voltar é a organização.
  const atrasoMs = agoraMs - Date.parse(estado.prazoISO);
  const limiteMs = ESCOLHAS_DE_ATRASO_ATE_PAUSAR * estado.segundosPorEscolha * 1000;
  if (atrasoMs > limiteMs) {
    return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "atraso" };
  }

  let atual = estado;
  for (let i = 0; i < maxPassos; i++) {
    const proximo = avancarPorTempo(atual, agoraMs);
    if (proximo === atual) break;
    atual = proximo;
  }
  return atual;
}

// ---------------------------------------------------------------- antes de sortear

/**
 * O sorteio pode acontecer com esta lista?
 *
 * Função pura, separada de `montarDraftDosAprovados` (que lê o banco) para que estas
 * duas regras — as que já falharam — sejam verificáveis num teste:
 *
 *  1. quem joga são os TITULARES da fila que estão "apto" (decisão C4 de 2026-10-22), e
 *     eles não podem passar das vagas. Quem fica de fora é decidido pela fila, por ordem de
 *     inscrição (lib/inscricoes/fila.ts) — não mais por "marque N como sobra". Titular que
 *     ainda não está apto NÃO impede o sorteio: é aviso na mesa (`avisosDoSorteio`), e a
 *     ordem perde as escolhas que faltam (`ajustarOrdemAoPool`);
 *  2. a soma dos pontos tem de caber no teto total. Sem isto, um draft podia entrar ao
 *     vivo já condenado a travar numa escolha em que ninguém cabe.
 *
 * Devolve a lista de impedimentos, vazia quando está tudo certo.
 */
export function impedimentosDoSorteio(params: {
  pontosDosQueJogam: readonly number[];
  vagas: number;
  times: number;
  orcamentoPorTime: number;
  /** Quantos entram na conta de times (os elegíveis: todos menos recusado, desistente e excluído). */
  totalDeElegiveis: number;
}): string[] {
  const { pontosDosQueJogam, vagas, times, orcamentoPorTime, totalDeElegiveis } = params;
  const problemas: string[] = [];
  const quantos = pontosDosQueJogam.length;

  if (times === 0) {
    problemas.push(`Não há inscritos suficientes para fechar um time: ${totalDeElegiveis}.`);
    return problemas;
  }

  if (quantos > vagas) {
    // Só acontece quando a fila não para nas vagas: sem teto de times em Configuração (todo
    // inscrito é titular), ou com um teto maior do que os times que fecham.
    problemas.push(
      `Há ${quantos} titulares aptos para ${vagas} vagas (${times} times). Quem joga é decidido pela fila, por ordem de inscrição: defina ${times} como o número de times em Configuração, e os ${quantos - vagas} últimos inscritos vão para a fila de reserva.`,
    );
  } else if (quantos < times) {
    // Menos que vagas é aviso (`avisosDoSorteio`); menos que TIMES não tem nem o capitão.
    problemas.push(
      `Há ${quantos} titulares aptos para ${times} times: cada time precisa ao menos do capitão. Confira os titulares que ainda não estão aptos.`,
    );
  }

  const total = pontosDosQueJogam.reduce((soma, p) => soma + p, 0);
  const teto = times * orcamentoPorTime;
  if (total > teto) {
    problemas.push(
      `Os ${quantos} sorteados somam ${total} pontos para um teto de ${teto} (${times} times × ${orcamentoPorTime}). Não há como fechar os elencos: troque quem entra ou suba o orçamento por time.`,
    );
  }

  return problemas;
}

/**
 * O que a mesa precisa saber antes de sortear, SEM impedir (decisão C4 de 2026-10-22): com
 * menos titulares aptos do que vagas, o sorteio segue com quem está apto, a ordem perde as
 * escolhas que faltam e um time (ou mais) termina o draft com vaga aberta — a mesma saída de
 * quem deixa o pool depois do sorteio (C1). A vaga é de um reserva da fila, depois da virada.
 */
export function avisosDoSorteio(params: { quantos: number; vagas: number; times: number }): string[] {
  const { quantos, vagas, times } = params;
  if (times === 0 || quantos >= vagas || quantos < times) return [];
  const faltam = vagas - quantos;
  return [
    `Há ${quantos} titulares aptos para ${vagas} vagas. Faltam ${faltam}: dá para sortear assim — a ordem perde ${faltam === 1 ? "1 escolha" : `${faltam} escolhas`} e ${faltam === 1 ? "um time termina" : "times terminam"} o draft com vaga aberta, que um reserva da fila ocupa depois de aplicar no site. Se o titular ainda vai ser aprovado, espere por ele; se não vai jogar, recuse ou registre a desistência, e o próximo da fila de reserva sobe.`,
  ];
}

// ---------------------------------------------------------------- quem sai do pool (C1)

/**
 * Os elencos fecham com esta ordem da vez em diante?
 *
 * Só a CONTAGEM de escolhas de cada time importa para a conta, não a posição delas.
 * `fantasmas`: quantas escolhas ainda podem ser cortadas. Entram como jogadores de 0 ponto —
 * um fantasma num time é exatamente "esse time perde mais uma escolha" —, senão todo corte
 * intermediário pareceria sem saída (faltaria jogador para as vagas).
 */
function ordemFecha(estado: EstadoDraft, futura: readonly string[], custos: readonly number[], fantasmas: number): boolean {
  const times = estado.times.map((t) => ({
    vagas: futura.filter((id) => id === t.id).length,
    folga: estado.orcamentoPorTime - gastoDoTime(estado, t.id),
  }));
  return elencosFecham(times, [...custos, ...Array<number>(fantasmas).fill(0)]) !== "nao_fecha";
}

/**
 * Fecha SEM tirar a vez corrente (`futura[0]`)? O time da vez leva alguém de verdade agora —
 * um preço por vez, que jogadores do mesmo preço dão a mesma resposta —, e o resto fecha com
 * os fantasmas. Sem fantasma, fechar já quer dizer isso: toda escolha recebe um jogador.
 *
 * É o que impede o corte de preferir tirar a vez do time no meio do relógio quando existe
 * outro jeito, mesmo que custe mais escolhas cortadas no fim da ordem.
 */
function fechaMantendoAVez(estado: EstadoDraft, futura: readonly string[], custos: readonly number[], fantasmas: number): boolean {
  const vez = futura[0];
  if (fantasmas === 0 || vez === undefined) return ordemFecha(estado, futura, custos, fantasmas);
  const folgaDaVez = estado.orcamentoPorTime - gastoDoTime(estado, vez);
  const resto = futura.slice(1);
  const vistos = new Set<number>();
  return custos.some((preco, i) => {
    if (vistos.has(preco) || preco > folgaDaVez) return false;
    vistos.add(preco);
    const times = estado.times.map((t) => ({
      vagas: resto.filter((id) => id === t.id).length,
      folga: estado.orcamentoPorTime - gastoDoTime(estado, t.id) - (t.id === vez ? preco : 0),
    }));
    const semEle = custos.filter((_, j) => j !== i);
    return elencosFecham(times, [...semEle, ...Array<number>(fantasmas).fill(0)]) !== "nao_fecha";
  });
}

/**
 * Tira uma escolha da ordem futura, sem deixar o draft sem saída.
 *
 * Qual time perde a escolha importa: a soma da tabela é exata, e tirar a escolha do time
 * errado pode deixar OUTRO sem como fechar (o jogador que saiu era o barato que cabia nele).
 * Tenta os times do fim da ordem para o começo — o normal é a última escolha do draft — e
 * fica com o primeiro corte que mantém os elencos fechando (com `fantasmas` cortes ainda por
 * vir). Com `manterAVez`, a escolha em andamento (índice 0) não sai, e a conta exige que o
 * time da vez ainda leve alguém. Devolve null quando nenhum corte serve.
 */
function cortarUmaEscolha(
  estado: EstadoDraft,
  futura: readonly string[],
  custos: readonly number[],
  fantasmas: number,
  manterAVez: boolean,
): string[] | null {
  const ultimaDe = new Map<string, number>();
  futura.forEach((id, i) => ultimaDe.set(id, i));
  const candidatos = [...ultimaDe.values()].sort((a, b) => b - a);
  const fecha = manterAVez ? fechaMantendoAVez : ordemFecha;
  // Mesmo podendo tirar a vez corrente, ela é a última tentativa: tirá-la passa a vez.
  for (const permitirAAtual of manterAVez ? [false] : [false, true]) {
    for (const indice of candidatos) {
      if (indice === 0 && !permitirAAtual) continue;
      const resto = futura.filter((_, i) => i !== indice);
      if (fecha(estado, resto, custos, fantasmas)) return resto;
    }
  }
  return null;
}

/**
 * Todas as escolhas que a serpentina ainda dá a cada time — inclusive as cortadas antes —,
 * com a vez corrente NA FRENTE. As outras seguem a ordem de sempre.
 *
 * A vez corrente fica onde está: refazer a ordem da serpentina inteira devolvia uma escolha
 * cortada ANTES dela, e a vez passava de time no meio do relógio (o prazo de um valia para
 * o outro, e a escolha que o capitão estava fazendo era recusada com «nao_e_a_vez»).
 */
function ordemMaxima(estado: EstadoDraft): string[] {
  const atual = estado.ordem[estado.escolhaAtual];
  const pular = new Map<string, number>();
  for (const id of estado.ordem.slice(0, estado.escolhaAtual)) pular.set(id, (pular.get(id) ?? 0) + 1);
  if (atual !== undefined) pular.set(atual, (pular.get(atual) ?? 0) + 1);
  const resto: string[] = [];
  for (const id of ordemDasRodadas(idsQueEscolhem(estado.times), rodadasDoDraft(estado.jogadoresPorTime), estado.tipoDeOrdem)) {
    const p = pular.get(id) ?? 0;
    if (p > 0) pular.set(id, p - 1);
    else resto.push(id);
  }
  return atual !== undefined ? [atual, ...resto] : resto;
}

/**
 * Corta de `maxima` o MENOR número de escolhas que faz os elencos fecharem (`fecha` com
 * `k` fantasmas), uma por vez. Nulo quando nenhum número de cortes serve.
 *
 * Com o menor `k`, todo jeito de fechar usa os `k` fantasmas, então sempre há um corte que
 * deixa fechando com `k − 1` — e o menor continua sendo o menor depois dele. O laço nunca
 * corta à toa nem fica sem corte possível no meio.
 */
function cortarOMinimo(
  estado: EstadoDraft,
  maxima: readonly string[],
  custos: readonly number[],
  manterAVez: boolean,
): string[] | null {
  const fecha = manterAVez ? fechaMantendoAVez : ordemFecha;
  // Mantendo a vez, ela não pode ser cortada: sobra ao menos uma escolha.
  const ate = manterAVez ? maxima.length - 1 : maxima.length;
  for (let k = Math.max(0, maxima.length - custos.length); k <= ate; k++) {
    if (!fecha(estado, maxima, custos, k)) continue;
    let futura: readonly string[] | null = maxima;
    for (let resta = k; resta > 0 && futura !== null; resta--) {
      futura = cortarUmaEscolha(estado, futura, custos, resta - 1, manterAVez);
    }
    if (futura !== null) return [...futura];
  }
  return null;
}

/**
 * A ordem da vez em diante que cabe no pool de agora: tira as escolhas que não teriam quem
 * escolher, devolve as que voltaram a ter, e nunca deixa os elencos sem como fechar.
 *
 *  1. Com a vez corrente onde está — sempre que existir um jeito de fechar com ela.
 *  2. Só se o time da vez não tiver mais quem levar (o que cabia nele saiu), ele perde a
 *     escolha e a vez passa — com relógio novo, ver `atualizarForaDoPool`.
 *  3. Nada fecha de jeito nenhum: tira só as escolhas que faltam de jogador, a partir do fim,
 *     e o motor pausa na vez sem saída — como sempre fez quando ninguém cabe.
 */
function ordemQueCabeNoPool(estado: EstadoDraft): string[] {
  const maxima = ordemMaxima(estado);
  const custos = jogadoresDisponiveis(estado).map((j) => j.pontos);
  const comAVez = maxima.length > 0 ? cortarOMinimo(estado, maxima, custos, true) : null;
  if (comAVez) return comAVez;
  const semAVez = cortarOMinimo(estado, maxima, custos, false);
  if (semAVez) return semAVez;
  return maxima.slice(0, Math.max(0, Math.min(maxima.length, custos.length)));
}

/** Monta o estado com a ordem refeita; se a vez passou de time, o relógio recomeça. */
function comAOrdemQueCabe(estado: EstadoDraft, agoraMs: number | undefined): EstadoDraft {
  const futura = ordemQueCabeNoPool(estado);
  const novo: EstadoDraft = { ...estado, ordem: [...estado.ordem.slice(0, estado.escolhaAtual), ...futura] };

  // Sem escolha nenhuma por fazer, o draft terminou (a mesma regra de `iniciarDraft`).
  if (novo.escolhaAtual >= novo.ordem.length) {
    novo.fase = "encerrado";
    novo.prazoISO = null;
    delete novo.motivoDaPausa;
    return novo;
  }
  // A vez só troca quando o time da vez não tinha mais quem levar: o time seguinte ganha o
  // prazo inteiro, não o resto do relógio de quem perdeu a escolha.
  if (novo.fase === "rodando" && novo.ordem[novo.escolhaAtual] !== estado.ordem[estado.escolhaAtual] && agoraMs !== undefined) {
    novo.prazoISO = proximoPrazo(novo, agoraMs);
  }
  return novo;
}

/**
 * Aplica quem saiu do pool depois do sorteio (decisão C1 de 2026-10-22).
 *
 * `saidas` são os ids cuja inscrição está fora AGORA (recusado, desistiu, excluído) — quem
 * chama lê as inscrições; o motor continua sem banco. Só vale para quem ainda não foi
 * escolhido: quem já está num elenco, ou é capitão, segue no draft (C2).
 *
 *  - Quem saiu deixa de ser escolhível na hora (`jogadoresDisponiveis`), inclusive para a
 *    escolha automática, e a transmissão mostra que saiu.
 *  - Com menos jogadores do que vagas, a ordem perde as escolhas que não teriam quem
 *    escolher (`ordemQueCabeNoPool`): o draft termina mais cedo e um time fica com uma vaga
 *    aberta, que a organização preenche com a fila de reserva depois da virada. Sem isso a
 *    conta de viabilidade pediria um jogador que não existe e o draft travaria na hora.
 *  - Quem voltar a valer (recusa desfeita) volta ao pool, e a ordem recupera as escolhas que
 *    ainda dá para fazer — DEPOIS da vez corrente, que não troca de time.
 *
 * `agoraMs`: o instante da leitura. Só é usado no caso raro em que o time da vez perde a
 * escolha (o único jogador que cabia nele saiu): o próximo time começa com o prazo inteiro.
 *
 * Devolve o MESMO objeto quando nada muda — a sondagem só grava quando algo andou.
 * Draft encerrado não muda mais: o que fazer com quem saiu é a virada que pergunta.
 */
export function atualizarForaDoPool(estado: EstadoDraft, saidas: ReadonlySet<string>, agoraMs?: number): EstadoDraft {
  if (estado.fase === "encerrado") return estado;

  const fora = estado.jogadores.filter((j) => j.timeId === null && saidas.has(j.id)).map((j) => j.id);
  const antes = saidasDoEstado(estado);
  if (fora.length === antes.size && fora.every((id) => antes.has(id))) return estado;

  const comAsSaidas: EstadoDraft = { ...estado };
  if (fora.length > 0) comAsSaidas.foraDoPool = fora;
  else delete comAsSaidas.foraDoPool;
  return comAOrdemQueCabe(comAsSaidas, agoraMs);
}

/**
 * A ordem do sorteio sem escolha para quem não existe (decisão C4 de 2026-10-22): com menos
 * titulares aptos do que vagas na hora de sortear, a ordem perde as escolhas que sobram, com
 * a mesma conta de quem sai do pool — o time que fica com vaga aberta termina o draft com ela,
 * e um reserva da fila a ocupa depois da virada. Com o pool exato, devolve o mesmo objeto.
 */
export function ajustarOrdemAoPool(estado: EstadoDraft): EstadoDraft {
  if (estado.fase === "encerrado") return estado;
  if (jogadoresDisponiveis(estado).length >= estado.ordem.length - estado.escolhaAtual) return estado;
  return comAOrdemQueCabe(estado, undefined);
}

// ---------------------------------------------------------------- montagem

export function montarDraft(params: {
  times: readonly TimeDoDraft[];
  jogadores: readonly JogadorDoDraft[];
  jogadoresPorTime: number;
  orcamentoPorTime: number;
  segundosPorEscolha: number;
  /** Padrão: serpentina. */
  tipoDeOrdem?: TipoDeOrdem;
}): EstadoDraft {
  const { times, jogadores, jogadoresPorTime, orcamentoPorTime, segundosPorEscolha } = params;
  const tipoDeOrdem = params.tipoDeOrdem ?? "serpentina";

  if (times.length === 0) throw new Error("Não há times para o draft.");

  // O time definido pela organização já entra com o elenco inteiro (`elencoDefinido`), e o
  // capitão de cada time já entra no elenco dele: ocupa vaga e custa pontos. Se isso não
  // acontecesse aqui, o teto de gasto sairia errado desde a primeira escolha.
  const doTimeDefinido = new Map<string, string>();
  for (const time of times) {
    if (!ehTimeDefinido(time)) continue;
    if (!time.elencoDefinido!.includes(time.capitaoId)) {
      throw new Error(`O capitão do time ${time.nome} não está no elenco definido dele.`);
    }
    if (time.elencoDefinido!.length !== jogadoresPorTime) {
      throw new Error(`O time ${time.nome} foi definido com ${time.elencoDefinido!.length} jogadores para ${jogadoresPorTime} vagas.`);
    }
    for (const id of time.elencoDefinido!) {
      if (doTimeDefinido.has(id)) throw new Error("O mesmo jogador foi colocado em mais de um time definido.");
      doTimeDefinido.set(id, time.id);
    }
  }
  const comCapitaes = jogadores.map((j) => {
    const definido = doTimeDefinido.get(j.id);
    if (definido) return { ...j, timeId: definido };
    const time = times.find((t) => t.capitaoId === j.id);
    return time ? { ...j, timeId: time.id } : { ...j, timeId: null };
  });

  // Unicidade ANTES de presença: dois times com o mesmo capitão passariam na checagem
  // de presença e só quebrariam mais tarde, com um time de elenco vazio.
  if (new Set(times.map((t) => t.capitaoId)).size !== times.length) {
    throw new Error("O mesmo jogador foi indicado como capitão de mais de um time.");
  }

  for (const time of times) {
    if (!comCapitaes.some((j) => j.id === time.capitaoId)) {
      throw new Error(`O capitão do time ${time.nome} não está no pool.`);
    }
    // Capitão de um time do draft não pode estar no elenco do definido.
    if (!ehTimeDefinido(time) && doTimeDefinido.has(time.capitaoId)) {
      throw new Error(`O capitão do time ${time.nome} está no elenco do time definido.`);
    }
  }
  for (const id of doTimeDefinido.keys()) {
    if (!comCapitaes.some((j) => j.id === id)) throw new Error("Um jogador do time definido não está no pool.");
  }

  return {
    versao: 1,
    fase: "preparando",
    times: [...times],
    jogadores: comCapitaes,
    // Só os times que disputam o draft: o definido já está completo.
    ordem: ordemDasRodadas(idsQueEscolhem(times), rodadasDoDraft(jogadoresPorTime), tipoDeOrdem),
    // Gravado só quando não é a serpentina: o estado de sempre continua igual.
    ...(tipoDeOrdem !== "serpentina" ? { tipoDeOrdem } : {}),
    escolhaAtual: 0,
    prazoISO: null,
    jogadoresPorTime,
    orcamentoPorTime,
    segundosPorEscolha,
    historico: [],
  };
}

export function iniciarDraft(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase === "encerrado") throw new Error("O draft já terminou.");

  // Ordem esgotada = draft terminado (a mesma regra que o resto do arquivo já segue:
  // `escolhaAtual` igual a `ordem.length` significa acabou). Sem isto, uma ordem vazia
  // — que acontece com `jogadores_por_time = 1`, em que os capitães já preenchem os
  // times — entrava em "rodando" sem nenhuma escolha a fazer e nunca mais saía: o
  // cronômetro não tinha o que virar e a transmissão ficava presa para sempre.
  if (estado.escolhaAtual >= estado.ordem.length) {
    return { ...estado, fase: "encerrado", prazoISO: null };
  }

  const novo: EstadoDraft = { ...estado, fase: "rodando", prazoISO: null };
  delete novo.motivoDaPausa;
  novo.prazoISO = proximoPrazo(novo, agoraMs);
  return novo;
}

export function pausarDraft(estado: EstadoDraft): EstadoDraft {
  if (estado.fase !== "rodando") return estado;
  return { ...estado, fase: "pausado", prazoISO: null, motivoDaPausa: "organizacao" };
}

export function retomarDraft(estado: EstadoDraft, agoraMs: number): EstadoDraft {
  if (estado.fase !== "pausado") return estado;
  return iniciarDraft(estado, agoraMs);
}

/**
 * Para que um time sem jogador possível volte a andar.
 *
 * `avancarPorTempo` PAUSA quando o time da vez não cabe ninguém no teto — e `retomar`
 * sozinho só reabre o mesmo beco: o prazo vence de novo e pausa de novo. Esta função é
 * o diagnóstico que o painel mostra: de quem é a vez e qual o teto, para a organização
 * decidir (subir o orçamento não muda um draft já montado; o caminho é remontar).
 */
export function vezSemSaida(estado: EstadoDraft): { timeId: string; teto: number } | null {
  const timeId = estado.ordem[estado.escolhaAtual];
  if (!timeId || estado.fase === "encerrado") return null;
  return maisBaratoValido(estado, timeId) ? null : { timeId, teto: tetoDaEscolha(estado, timeId) };
}
