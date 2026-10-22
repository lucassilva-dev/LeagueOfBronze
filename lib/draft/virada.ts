import { slugifyValue } from "@/components/admin/shared";
import { resolveElo, resolveRole } from "@/lib/design";
import type { EstadoDraft } from "@/lib/draft/motor";
import type { Inscricao } from "@/lib/inscricoes/store";
import type { Player, Team } from "@/lib/schema";

/**
 * Do draft para o dataset público do campeonato.
 *
 * ⚠ ESTA É A FRONTEIRA DE PRIVACIDADE DO PROJETO.
 *
 * As tabelas da 4ª Edição guardam e-mail, WhatsApp, Discord, nome real e hash de IP —
 * dado de terceiro, que a organização coletou para conferir requisito e cobrar taxa. O
 * dataset do campeonato é o oposto: ele é lido por qualquer visitante, vai inteiro
 * para o navegador em toda página, e é exportado em backup.
 *
 * Por isso a conversão é EXPLÍCITA e por campo, nunca um espalhamento. Atravessam
 * nick, rotas, elo e time — e, só no capitão, a marca de capitão — e nada mais. Um
 * `...inscrito` aqui publicaria o contato de cinquenta pessoas de uma vez, sem erro
 * nenhum aparecer.
 *
 * Função pura de propósito: dá para conferir num teste exatamente o que sai, que é o
 * único jeito honesto de garantir uma regra dessas.
 */

export type ResultadoDaVirada = { teams: Team[]; players: Player[] };

/**
 * Converte o draft encerrado em times e jogadores do dataset.
 *
 * Aceita draft em qualquer fase para permitir pré-visualização no painel — quem decide
 * se é hora de virar é a organização, não esta função.
 */
export function datasetDoDraft(estado: EstadoDraft): ResultadoDaVirada {
  const teams: Team[] = estado.times.map((time) => ({
    id: slugifyValue(time.nome) || time.id,
    name: time.nome,
    slug: slugifyValue(time.nome) || time.id,
  }));

  const idDoTime = new Map(estado.times.map((t, i) => [t.id, teams[i]!.id]));

  // Capitão → time que ele capitaneia. O site público lia o capitão pela rota (MID, a
  // regra da 3ª); na 4ª o capitão é o do draft, de qualquer rota, e quem é da
  // organização nunca é capitão. Sem levar a marca, depois da virada o site mostraria
  // como capitão todo MID — inclusive um organizador.
  const timeDoCapitao = new Map(estado.times.map((t) => [t.capitaoId, t.id]));

  // Dois jogadores podem ter o mesmo nick com tags diferentes ("Nak4y#BR1" e
  // "Nak4y#JPN"), e o slug vira a URL da página do jogador. Sem desempate, um
  // sobrescreveria a página do outro.
  const usados = new Set<string>();

  const players: Player[] = estado.jogadores
    .filter((j) => j.timeId !== null)
    .map((jogador) => {
      const [nick = jogador.riotId, tag = ""] = jogador.riotId.split("#");

      let slug = slugifyValue(nick);
      if (!slug || usados.has(slug)) {
        const comTag = slugifyValue(`${nick}-${tag}`);
        slug = comTag && !usados.has(comTag) ? comTag : `${slug || "jogador"}-${usados.size + 1}`;
      }
      usados.add(slug);

      const player: Player = {
        id: slug,
        // O Riot ID inteiro, que é o nome de jogo e já é público em qualquer partida.
        nick: jogador.riotId,
        slug,
        teamId: idDoTime.get(jogador.timeId!) ?? "",
        // Rota canônica (TOP/JUNG/MID/ADC/SUP), a mesma linguagem do resto do dataset.
        role1: resolveRole(jogador.rota1).key || "TOP",
        role2: resolveRole(jogador.rota2).key || undefined,
        // O rótulo resolvido, e não o texto cru: assim "GM" digitado à mão em algum
        // momento vira "Grão-Mestre" e as telas do site sabem colorir.
        elo: resolveElo(jogador.elo)?.label ?? jogador.elo,
      };

      // Só no capitão, e só `true`: nos outros o campo nem existe, para o JSON que vai a
      // todo visitante não carregar um `captain: false` por jogador. Exige que ele esteja
      // no time que capitaneia — o motor já garante, e assim a marca nunca sai em dobro
      // num time.
      if (timeDoCapitao.get(jogador.id) === jogador.timeId) player.captain = true;

      return player;

      // NÃO ATRAVESSAM, e a ausência é a regra:
      //   email, whatsapp, discord  — contato, nunca é conteúdo de campeonato;
      //   nome_real                 — o dataset tem um campo `name` opcional, e ele
      //                               fica vazio de propósito: o combinado com o grupo
      //                               foi expor o nick, não o nome civil;
      //   ip_hash, jogador_id       — dado interno de controle;
      //   pontos                    — preço no draft, que acabou quando o draft acabou.
    });

  return { teams, players };
}

/**
 * Confere que o resultado é montável antes de qualquer escrita.
 *
 * Devolve a lista de problemas em vez de estourar no primeiro: a organização precisa
 * ver tudo o que falta de uma vez, não descobrir um por vez a cada tentativa.
 */
export function problemasDaVirada(estado: EstadoDraft): string[] {
  const problemas: string[] = [];

  if (estado.fase !== "encerrado") {
    problemas.push("O draft ainda não terminou.");
  }

  for (const time of estado.times) {
    const elenco = estado.jogadores.filter((j) => j.timeId === time.id);
    if (elenco.length !== estado.jogadoresPorTime) {
      problemas.push(
        `${time.nome} tem ${elenco.length} de ${estado.jogadoresPorTime} jogadores.`,
      );
    }
  }

  const { teams, players } = datasetDoDraft(estado);

  const idsDeTime = new Set(teams.map((t) => t.id));
  if (idsDeTime.size !== teams.length) problemas.push("Dois times ficariam com o mesmo endereço.");

  const idsDeJogador = new Set(players.map((p) => p.id));
  if (idsDeJogador.size !== players.length) {
    problemas.push("Dois jogadores ficariam com o mesmo endereço.");
  }

  if (players.some((p) => p.teamId === "")) {
    problemas.push("Algum jogador ficaria sem time.");
  }

  return problemas;
}

// ---------------------------------------------------------------- quem saiu depois do sorteio

/** Como está a inscrição de quem segue no draft sem ser mais `apto`. */
export type SituacaoForaDoDraft = Exclude<Inscricao["situacao"], "apto"> | "sem_inscricao";

export type ForaDoDraft = { riotId: string; situacao: SituacaoForaDoDraft };

const COMO_FICOU: Record<SituacaoForaDoDraft, string> = {
  recusado: "recusado",
  desistiu: "desistiu",
  excluido: "excluído",
  sobra: "na sobra",
  pendente: "voltou a pendente",
  sem_inscricao: "inscrição não encontrada",
};

/**
 * Quem está no draft (no pool ou num elenco) e cuja inscrição deixou de ser `apto`.
 *
 * O sorteio copia a lista de aptos para o estado do draft, e dali em diante o draft não
 * olha mais para as inscrições: recusar alguém ou registrar a desistência depois do
 * sorteio não aparecia em lugar nenhum da mesa — a pessoa continuava escolhível, podia ser
 * escolhida e atravessava a virada para o site.
 *
 * Isto só AVISA. Não tira ninguém do draft nem muda regra: o que fazer (trocar, refazer o
 * sorteio, manter) é decisão da organização. O nome que sai é o Riot ID que está no draft,
 * que é o que a mesa e a transmissão mostram.
 */
export function jogadoresForaDoDraft(
  estado: Pick<EstadoDraft, "jogadores"> | null,
  inscritos: readonly Pick<Inscricao, "id" | "situacao">[],
): ForaDoDraft[] {
  if (!estado) return [];
  const situacaoPor = new Map(inscritos.map((i) => [i.id, i.situacao]));
  const fora: ForaDoDraft[] = [];
  for (const jogador of estado.jogadores) {
    const situacao = situacaoPor.get(jogador.id);
    if (situacao === "apto") continue;
    fora.push({ riotId: jogador.riotId, situacao: situacao ?? "sem_inscricao" });
  }
  return fora;
}

/** "recusado", "desistiu", "na sobra"… — o mesmo texto no painel e na recusa da virada. */
export function rotuloForaDoDraft(situacao: SituacaoForaDoDraft): string {
  return COMO_FICOU[situacao] ?? situacao;
}

/** "Fulano#BR1 (desistiu), Ciclano#BR1 (recusado)". */
export function listaForaDoDraft(fora: readonly ForaDoDraft[]): string {
  return fora.map((f) => `${f.riotId} (${rotuloForaDoDraft(f.situacao)})`).join(", ");
}
