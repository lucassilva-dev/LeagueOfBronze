import { ITENS_CONFERENCIA } from "@/lib/inscricoes/schema";

/**
 * Quando o sistema pode marcar alguém como "apto" sozinho.
 *
 * Decisão do Lucas (2026-10-06): apto automático quando TODOS os requisitos estão
 * cumpridos E o pagamento está pago ou isento. A regra 22 diz o mesmo: a vaga só é
 * confirmada depois do pagamento.
 *
 * Três limites que não podem cair:
 *
 *  - **Só promove.** Sai de "pendente" e vai para "apto" — nunca rebaixa, nunca recusa,
 *    nunca mexe em "sobra". Tirar alguém continua sendo decisão humana.
 *  - **"Declarado" não é pago.** O jogador dizer que pagou não aprova ninguém; alguém da
 *    organização tem de ter conferido o extrato.
 *  - **Respeita quem segurou.** Se a organização voltou a pessoa de apto para pendente,
 *    `promocao_automatica` fica falso e o sistema não a promove de novo por conta própria.
 *
 * Função pura e sem dependência de servidor: o servidor decide com ela, e o painel usa a
 * mesma para avisar "apto com requisito fora de ok".
 */

const CUMPRIDO = new Set(["ok", "excecao"]);
/** Estados do item (e) que impedem a aprovação mesmo antes de ele ser avaliável. */
const BLOQUEIA = new Set(["risco", "recusado"]);

/**
 * Todos os requisitos cumpridos?
 *
 * O item (e) — partidas nos 10 dias antes do início — só pode ser medido quando a data de
 * início existe e a janela já fechou. Até lá ele não segura ninguém, desde que não esteja
 * marcado como risco ou recusado. Foi assim que a organização já vinha tratando o item.
 */
export function requisitosCumpridos(
  conferencias: readonly { item: string; estado: string }[],
  inicioCampeonato: string | null,
  agoraMs: number,
): boolean {
  const inicioMs = inicioCampeonato ? new Date(inicioCampeonato).getTime() : NaN;
  const eAindaNaoAvaliavel = !Number.isFinite(inicioMs) || agoraMs < inicioMs;

  return ITENS_CONFERENCIA.every((item) => {
    const estado = conferencias.find((c) => c.item === item)?.estado;
    if (estado === undefined) return false;
    if (CUMPRIDO.has(estado)) return true;
    return item === "e" && eAindaNaoAvaliavel && !BLOQUEIA.has(estado);
  });
}

export function situacaoSugerida(args: {
  situacao: string;
  promocaoAutomatica: boolean;
  conferencias: readonly { item: string; estado: string }[];
  pagamento: { estado: string } | null;
  inicioCampeonato: string | null;
  agoraMs: number;
}): "apto" | null {
  if (args.situacao !== "pendente" || !args.promocaoAutomatica) return null;
  if (args.pagamento?.estado !== "pago" && args.pagamento?.estado !== "isento") return null;
  return requisitosCumpridos(args.conferencias, args.inicioCampeonato, args.agoraMs) ? "apto" : null;
}

/**
 * Autor das gravações automáticas que não vêm da Riot (promoção a apto, congelamento na
 * data). O "á" garante que nenhum admin real tenha esse nome — o cadastro de usuário só
 * aceita letras sem acento, números, ponto, hífen e sublinhado.
 */
export const AUTOR_SISTEMA = "automático";
