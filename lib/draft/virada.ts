import { slugifyValue } from "@/components/admin/shared";
import { resolveElo, resolveRole } from "@/lib/design";
import { eloQueVale, type CamposDeElo } from "@/lib/draft/elo-da-inscricao";
import type { EstadoDraft } from "@/lib/draft/motor";
import { montarFila } from "@/lib/inscricoes/fila";
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
 * Quem vai para o dataset como RESERVA oficial, sem time (decisão C4 de 2026-10-22): o que
 * a virada precisa de cada um, e nada mais — o mesmo recorte de campo do resto da virada.
 */
export type ReservaDaVirada = Readonly<{ riotId: string; rota1: string; rota2: string; elo: string }>;

/** O que `reservasDaVirada` lê de cada inscrição. */
export type InscricaoDaVirada = Pick<CamposDeElo, "elo_declarado" | "elo_verificado" | "elo_congelado"> &
  Readonly<{
    id: string;
    riot_id?: string | null;
    situacao: string;
    criado_em?: string | null;
    organizador?: boolean | null;
    rota_primaria?: string | null;
    rota_secundaria?: string | null;
  }>;

/**
 * Os reservas que a virada leva para o dataset: TODO inscrito que está na fila (titular ou
 * reserva — quem não está fora) e não ficou num elenco do draft.
 *
 * São os reservas da fila e também o titular que não entrou no sorteio (ainda pendente, ou
 * chamado da fila depois que alguém saiu): todos podem substituir jogo a jogo, e é um deles
 * que herda a vaga de quem sair de vez (regra 6). Sem isso, a organização teria de cadastrar
 * cada reserva à mão no painel de Jogadores, no meio do campeonato.
 *
 * Na ordem da fila (por inscrição; quem está em «sobra» no fim). Sem time de propósito: o
 * reserva vira `reserva: true` SEM a chave `teamId` (ver `datasetDoDraft`).
 */
export function reservasDaVirada(
  estado: Pick<EstadoDraft, "jogadores">,
  inscritos: readonly InscricaoDaVirada[],
): ReservaDaVirada[] {
  const noElenco = new Set(estado.jogadores.filter((j) => j.timeId !== null).map((j) => j.id));
  const porId = new Map(inscritos.map((i) => [i.id, i]));
  // Sem teto: todo ativo entra, titulares na ordem de inscrição e a «sobra» no fim. A
  // separação titular/reserva da edição não muda quem vai (os dois grupos vão), só a ordem.
  const fila = montarFila(
    inscritos.map((i) => ({ id: i.id, criado_em: i.criado_em ?? null, situacao: i.situacao, organizador: i.organizador ?? false })),
    {},
  );
  return [...fila.titulares, ...fila.reservas]
    .filter((id) => !noElenco.has(id))
    .map((id) => porId.get(id)!)
    .filter((i) => typeof i.riot_id === "string" && i.riot_id.trim() !== "")
    .map((i) => ({
      riotId: i.riot_id!,
      rota1: i.rota_primaria ?? "",
      rota2: i.rota_secundaria ?? "",
      elo: eloQueVale(i),
    }));
}

/** O slug do jogador a partir do Riot ID, sem repetir nenhum já usado nesta virada. */
function slugUnico(riotId: string, usados: Set<string>): { nick: string; slug: string } {
  const [nick = riotId, tag = ""] = riotId.split("#");
  let slug = slugifyValue(nick);
  if (!slug || usados.has(slug)) {
    const comTag = slugifyValue(`${nick}-${tag}`);
    slug = comTag && !usados.has(comTag) ? comTag : `${slug || "jogador"}-${usados.size + 1}`;
  }
  usados.add(slug);
  return { nick, slug };
}

/**
 * Converte o draft encerrado em times e jogadores do dataset.
 *
 * Aceita draft em qualquer fase para permitir pré-visualização no painel — quem decide
 * se é hora de virar é a organização, não esta função.
 *
 * `reservas` (de `reservasDaVirada`) entram depois dos elencos, como `reserva: true` e SEM
 * `teamId` — nunca `teamId: ""`, que o schema recusaria como time inexistente.
 */
export function datasetDoDraft(estado: EstadoDraft, reservas: readonly ReservaDaVirada[] = []): ResultadoDaVirada {
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
      const { slug } = slugUnico(jogador.riotId, usados);

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

  // Os reservas, com o mesmo recorte de campo: nick, rotas e elo — e a marca de reserva.
  for (const reserva of reservas) {
    const { slug } = slugUnico(reserva.riotId, usados);
    const role2 = resolveRole(reserva.rota2).key;
    players.push({
      id: slug,
      nick: reserva.riotId,
      slug,
      role1: resolveRole(reserva.rota1).key || "TOP",
      ...(role2 ? { role2 } : {}),
      elo: resolveElo(reserva.elo)?.label ?? reserva.elo,
      reserva: true,
    });
  }

  return { teams, players };
}

/**
 * Confere que o resultado é montável antes de qualquer escrita.
 *
 * Devolve a lista de problemas em vez de estourar no primeiro: a organização precisa
 * ver tudo o que falta de uma vez, não descobrir um por vez a cada tentativa.
 */
export function problemasDaVirada(estado: EstadoDraft, reservas: readonly ReservaDaVirada[] = []): string[] {
  const problemas: string[] = [];

  if (estado.fase !== "encerrado") {
    problemas.push("O draft ainda não terminou.");
  }

  for (const time of estado.times) {
    const elenco = estado.jogadores.filter((j) => j.timeId === time.id);
    if (elenco.length !== estado.jogadoresPorTime && !vagaCortadaPeloPool(estado, time.id)) {
      problemas.push(
        `${time.nome} tem ${elenco.length} de ${estado.jogadoresPorTime} jogadores.`,
      );
    }
  }

  const { teams, players } = datasetDoDraft(estado, reservas);

  const idsDeTime = new Set(teams.map((t) => t.id));
  if (idsDeTime.size !== teams.length) problemas.push("Dois times ficariam com o mesmo endereço.");

  const idsDeJogador = new Set(players.map((p) => p.id));
  if (idsDeJogador.size !== players.length) {
    problemas.push("Dois jogadores ficariam com o mesmo endereço.");
  }

  if (players.some((p) => !p.reserva && !p.teamId)) {
    problemas.push("Algum jogador ficaria sem time.");
  }

  return problemas;
}

/**
 * O time terminou com vaga aberta porque a ordem perdeu escolhas por falta de jogador? É o
 * único elenco incompleto que pode ir para o site: alguém saiu do pool depois do sorteio
 * (C1), ou havia menos titulares aptos do que vagas na hora de sortear (C4) — e a vaga é de
 * um reserva da fila. Qualquer outro elenco incompleto continua sendo problema (draft que
 * não terminou, capitão repetido…).
 *
 * Não depende de `foraDoPool`: quem saiu pode ter voltado a valer depois do corte (e ficado
 * sem escolha), e o corte da montagem (C4) nem passa por ele.
 */
function vagaCortadaPeloPool(estado: EstadoDraft, timeId: string): boolean {
  if (estado.fase !== "encerrado") return false;
  const elenco = estado.jogadores.filter((j) => j.timeId === timeId).length;
  const escolhas = estado.ordem.filter((id) => id === timeId).length;
  return elenco < estado.jogadoresPorTime && elenco === 1 + escolhas;
}

/**
 * O que a mesa precisa saber antes de aplicar, sem travar a virada: o time que vai para o
 * site com vaga aberta (C1), e o que fazer com ela.
 */
export function avisosDaVirada(estado: EstadoDraft): string[] {
  return estado.times
    .filter((t) => vagaCortadaPeloPool(estado, t.id))
    .map((t) => {
      const elenco = estado.jogadores.filter((j) => j.timeId === t.id).length;
      const faltam = estado.jogadoresPorTime - elenco;
      return `${t.nome} vai para o site com ${elenco} de ${estado.jogadoresPorTime}: ${faltam === 1 ? "uma escolha saiu" : `${faltam} escolhas saíram`} da ordem porque faltou jogador no pool (alguém deixou o pool depois do sorteio, ou havia menos titulares aptos do que vagas na hora de sortear). A vaga é de um reserva da fila — depois de aplicar, dê o time a ele no painel de Jogadores.`;
    });
}

// ---------------------------------------------------------------- quem saiu depois do sorteio

/** Como está a inscrição de quem segue no draft sem ser mais `apto`. */
export type SituacaoForaDoDraft = Exclude<Inscricao["situacao"], "apto"> | "sem_inscricao";

/**
 * `lugar`: onde a pessoa está no draft. `pool` = ainda não foi escolhida (com a inscrição
 * fora, ela já saiu dos escolhíveis, C1); `elenco`/`capitao` = já está num time, e o draft
 * segue com ela (C2) — a vaga é reposta pela saída de vez depois da virada, e o capitão que
 * sai dá lugar a outro do time, escolhido pela organização. `time` é o nome do time no
 * draft. Opcionais: a resposta de um servidor anterior não tem.
 */
export type ForaDoDraft = {
  riotId: string;
  situacao: SituacaoForaDoDraft;
  lugar?: "pool" | "elenco" | "capitao";
  time?: string;
};

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
 * Isto AVISA. Quem está no pool com a inscrição fora (recusado, desistiu, excluído) sai dos
 * escolhíveis pelo motor (C1, `atualizarForaDoPool`); depois que o motor gravou a saída
 * (`foraDoPool`), a pessoa não está mais no draft e não entra aqui — a mesa e a transmissão
 * a mostram pelo `saiuDoPool`, e ela não vai para o site. O resto — quem está num elenco, ou
 * voltou para sobra ou pendente — continua no draft, e o que fazer é decisão da organização
 * (a virada pede confirmação de quem está num elenco, `exigemConfirmacaoNaVirada`). O nome
 * que sai é o Riot ID que está no draft, que é o que a mesa e a transmissão mostram.
 */
export function jogadoresForaDoDraft(
  estado: (Pick<EstadoDraft, "jogadores"> & Partial<Pick<EstadoDraft, "times" | "foraDoPool">>) | null,
  inscritos: readonly Pick<Inscricao, "id" | "situacao">[],
): ForaDoDraft[] {
  if (!estado) return [];
  const situacaoPor = new Map(inscritos.map((i) => [i.id, i.situacao]));
  const timePor = new Map((estado.times ?? []).map((t) => [t.id, t]));
  const saiuDoPool = new Set(estado.foraDoPool ?? []);
  const fora: ForaDoDraft[] = [];
  for (const jogador of estado.jogadores) {
    const situacao = situacaoPor.get(jogador.id);
    if (situacao === "apto") continue;
    // Já saiu do draft (C1): não é escolhível nem vai para o site — nada a confirmar.
    if (jogador.timeId === null && saiuDoPool.has(jogador.id)) continue;
    const time = jogador.timeId !== null ? timePor.get(jogador.timeId) : undefined;
    fora.push({
      riotId: jogador.riotId,
      situacao: situacao ?? "sem_inscricao",
      lugar: jogador.timeId === null ? "pool" : time?.capitaoId === jogador.id ? "capitao" : "elenco",
      ...(time ? { time: time.nome } : {}),
    });
  }
  return fora;
}

/**
 * Quem a virada só aplica com `confirmoForaDoDraft` (decisão C2): quem está num ELENCO
 * (escolhido ou capitão), porque vai publicado no time do site. Quem está no pool não vai
 * para time nenhum — fica no aviso da mesa, sem pedir confirmação de "aplicar mesmo assim".
 * Sem `lugar` (resposta de um servidor anterior), pede: é o lado seguro.
 */
export function exigemConfirmacaoNaVirada(fora: readonly ForaDoDraft[]): ForaDoDraft[] {
  return fora.filter((f) => f.lugar !== "pool");
}

/** "recusado", "desistiu", "na sobra"… — o mesmo texto no painel e na recusa da virada. */
export function rotuloForaDoDraft(situacao: SituacaoForaDoDraft): string {
  return COMO_FICOU[situacao] ?? situacao;
}

/** "Fulano#BR1 (desistiu), Ciclano#BR1 (recusado)". */
export function listaForaDoDraft(fora: readonly ForaDoDraft[]): string {
  return fora.map((f) => `${f.riotId} (${rotuloForaDoDraft(f.situacao)})`).join(", ");
}
