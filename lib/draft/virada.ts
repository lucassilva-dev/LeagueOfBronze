import { slugifyValue } from "@/components/admin/shared";
import { resolveElo, resolveRole } from "@/lib/design";
import type { EstadoDraft } from "@/lib/draft/motor";
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
 * quatro coisas — nick, rotas, elo e time — e nada mais. Um `...inscrito` aqui
 * publicaria o contato de cinquenta pessoas de uma vez, sem erro nenhum aparecer.
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

      return {
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
