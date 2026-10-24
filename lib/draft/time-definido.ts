import { estaFora } from "@/lib/inscricoes/pagamento";

/**
 * O TIME DEFINIDO pela organização (decisão de 24/10/2026, 4ª Edição).
 *
 * Os organizadores jogam juntos, num time que já entra pronto: os cinco com a rota de cada um
 * (`inscricoes.time_definido`, gravado pela organização — supabase/migracao-time-definido.sql).
 * Esse time NÃO participa do draft: não escolhe e ninguém o escolhe. O capitão dele é o capitão
 * definido (`inscricoes.capitao`) que está entre os cinco.
 *
 * Os outros times seguem como antes, e a conta toda olha só para eles: a tabela de pontos é
 * calculada sobre quem vai ao draft (sem os cinco), com um time a menos (`timesNoDraft`), e a
 * soma exata continua `times do draft × orçamento`. O time definido aparece na transmissão e no
 * «Aplicar no site» como qualquer outro, mas fora da ordem de escolha (lib/draft/motor.ts).
 *
 * Função PURA, sem banco: a mesma separação vale no servidor (prévia e montagem, em
 * lib/draft/store.ts) e no navegador (a prévia de preços das abas Times e vagas e Inscritos,
 * lib/draft/previa-de-precos.ts) — senão as telas mostrariam um preço e o draft usaria outro.
 */

/** As rotas que o time definido aceita, na linguagem do dataset (lib/design.ts). */
export const ROTAS_DO_TIME_DEFINIDO = ["TOP", "JUNG", "MID", "ADC", "SUP"] as const;
export type RotaDoTimeDefinido = (typeof ROTAS_DO_TIME_DEFINIDO)[number];

/** O que a separação lê de cada inscrição. `time_definido` ausente = banco sem a coluna. */
export type InscricaoDoTimeDefinido = {
  id: string;
  situacao: string;
  riot_id?: string | null;
  capitao?: boolean | null;
  time_definido?: string | null;
  rota_primaria?: string | null;
  rota_secundaria?: string | null;
};

/** A rota no time definido, ou null quando a inscrição vai ao draft. */
export function rotaNoTimeDefinido(i: Pick<InscricaoDoTimeDefinido, "time_definido">): RotaDoTimeDefinido | null {
  const rota = typeof i.time_definido === "string" ? i.time_definido.trim().toUpperCase() : "";
  return (ROTAS_DO_TIME_DEFINIDO as readonly string[]).includes(rota) ? (rota as RotaDoTimeDefinido) : null;
}

export type SeparacaoDoTimeDefinido<T extends InscricaoDoTimeDefinido> = {
  /** Há time definido marcado (válido ou não). Sem marcados, tudo segue como antes. */
  marcado: boolean;
  /** Há time definido e ele vale: os membros saem do draft e um time a menos escolhe. */
  ativo: boolean;
  /** Os membros que estão no pool, na ordem das rotas (TOP, JUNG, MID, ADC, SUP). Vazio sem `ativo`. */
  membros: T[];
  /** A rota de cada membro no time. */
  rotaDe: ReadonlyMap<string, RotaDoTimeDefinido>;
  /** O capitão do time definido (o capitão definido entre os membros). Nulo sem `ativo`. */
  capitaoId: string | null;
  /** Quem vai ao draft: o pool sem os membros (o pool inteiro sem `ativo`). */
  draft: T[];
  /** Quantos times disputam o draft: um a menos com o time definido valendo. */
  timesNoDraft: number;
  /** Todas as inscrições menos os membros — para a conta dos capitães definidos do draft. */
  inscritosDoDraft: T[];
  /**
   * O que impede o sorteio: número de membros, membro fora do pool, rota repetida, capitão.
   * Vazio quando vale ou quando não há time definido marcado.
   */
  impedimentos: string[];
};

/**
 * Separa o time definido do resto.
 *
 * `pool`: quem joga o draft (os titulares aptos, `quemJoga`). `inscritos`: todas as inscrições,
 * para achar quem foi marcado e não está no pool. `times`: o número de times da edição (o time
 * definido é um deles). Os marcados que saíram do campeonato (recusado, desistente, excluído)
 * não contam — e viram impedimento, porque o time ficaria com uma vaga a menos.
 */
export function separarTimeDefinido<T extends InscricaoDoTimeDefinido>(params: {
  pool: readonly T[];
  inscritos: readonly T[];
  times: number;
  jogadoresPorTime: number;
}): SeparacaoDoTimeDefinido<T> {
  const { pool, inscritos, times, jogadoresPorTime } = params;
  const semTime: SeparacaoDoTimeDefinido<T> = {
    marcado: false,
    ativo: false,
    membros: [],
    rotaDe: new Map(),
    capitaoId: null,
    draft: [...pool],
    timesNoDraft: times,
    inscritosDoDraft: [...inscritos],
    impedimentos: [],
  };

  const marcados = inscritos.filter((i) => rotaNoTimeDefinido(i) !== null);
  if (marcados.length === 0) return semTime;

  const nome = (i: T) => i.riot_id ?? i.id;
  const noPool = new Set(pool.map((i) => i.id));
  const impedimentos: string[] = [];

  const saiu = marcados.filter((i) => estaFora(i.situacao));
  if (saiu.length > 0) {
    impedimentos.push(
      `${saiu.map((i) => `${nome(i)} (${i.situacao})`).join(", ")} ${saiu.length === 1 ? "está marcado" : "estão marcados"} no time definido pela organização e ${saiu.length === 1 ? "saiu" : "saíram"} do campeonato. Troque o membro do time definido antes de sortear.`,
    );
  }
  const ativos = marcados.filter((i) => !estaFora(i.situacao));
  const foraDoPool = ativos.filter((i) => !noPool.has(i.id));
  if (foraDoPool.length > 0) {
    impedimentos.push(
      `${foraDoPool.map((i) => `${nome(i)} (${i.situacao})`).join(", ")} ${foraDoPool.length === 1 ? "está" : "estão"} no time definido pela organização, mas não entre os titulares aptos. Aprove a inscrição antes de sortear.`,
    );
  }
  if (ativos.length !== jogadoresPorTime) {
    impedimentos.push(
      `O time definido pela organização tem ${ativos.length} ${ativos.length === 1 ? "jogador" : "jogadores"} e precisa de exatamente ${jogadoresPorTime}.`,
    );
  }

  const rotaDe = new Map(ativos.map((i) => [i.id, rotaNoTimeDefinido(i)!]));
  const repetidas = ROTAS_DO_TIME_DEFINIDO.filter((r) => ativos.filter((i) => rotaDe.get(i.id) === r).length > 1);
  if (repetidas.length > 0) {
    impedimentos.push(`O time definido pela organização tem a rota ${repetidas.join(", ")} repetida: cada membro precisa de uma rota diferente.`);
  }

  const capitaes = ativos.filter((i) => i.capitao === true);
  if (capitaes.length !== 1) {
    impedimentos.push(
      capitaes.length === 0
        ? "O time definido pela organização está sem capitão: marque um dos membros em «Definir capitães»."
        : `O time definido pela organização tem ${capitaes.length} capitães (${capitaes.map(nome).join(", ")}): só um dos membros pode ser o capitão.`,
    );
  }

  if (times < 2) {
    impedimentos.push("Com o time definido pela organização é preciso pelo menos mais um time no draft.");
  }

  if (impedimentos.length > 0) return { ...semTime, marcado: true, impedimentos };

  const ordem = (i: T) => ROTAS_DO_TIME_DEFINIDO.indexOf(rotaDe.get(i.id)!);
  const membros = [...ativos].sort((a, b) => ordem(a) - ordem(b));
  const doTime = new Set(membros.map((i) => i.id));
  return {
    marcado: true,
    ativo: true,
    membros,
    rotaDe,
    capitaoId: capitaes[0]!.id,
    draft: pool.filter((i) => !doTime.has(i.id)),
    timesNoDraft: times - 1,
    inscritosDoDraft: inscritos.filter((i) => !doTime.has(i.id)),
    impedimentos: [],
  };
}

/**
 * As rotas do membro no dataset depois da virada: a do time definido primeiro, e como segunda
 * a que ele marcou na inscrição e não é a do time (a principal, se for outra; senão a secundária).
 */
export function rotasDoMembro(
  i: Pick<InscricaoDoTimeDefinido, "rota_primaria" | "rota_secundaria">,
  rota: RotaDoTimeDefinido,
): { rota1: string; rota2: string } {
  const primaria = (i.rota_primaria ?? "").toUpperCase();
  const segunda = primaria && primaria !== rota ? (i.rota_primaria ?? "") : (i.rota_secundaria ?? "");
  return { rota1: rota, rota2: segunda.toUpperCase() === rota ? "" : segunda };
}
