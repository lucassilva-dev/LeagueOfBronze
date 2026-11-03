import type { SeriesMatch } from "@/lib/schema";

type RegistroDeSorteio = NonNullable<SeriesMatch["sorteios"]>[number];

/**
 * O último registro de CARTA (sorteio ou correção à mão) de cada time, por id do time. O sorteio
 * duplo não tem time e vale para os dois.
 *
 * A arena da página da partida mostra, em cada vaga, as letras do ABCDRAFT e a semente do
 * registro que deu aquela carta. Antes era um registro só — "o último sorteio de carta" — e
 * sortear a carta do time B apagava da tela as letras e a semente da carta do time A. A arena
 * ainda confere se a carta à vista é a que o registro deu (uma correção à mão posterior troca a
 * carta sem trocar o registro de sorteio).
 */
export function registrosDasCartasPorTime(
  serie: Pick<SeriesMatch, "sorteios" | "teamAId" | "teamBId">,
): Record<string, RegistroDeSorteio> {
  const porTime: Record<string, RegistroDeSorteio> = {};
  for (const registro of serie.sorteios ?? []) {
    if (registro.tipo !== "carta" && registro.tipo !== "carta_manual") continue;
    for (const id of registro.teamId ? [registro.teamId] : [serie.teamAId, serie.teamBId]) porTime[id] = registro;
  }
  return porTime;
}
