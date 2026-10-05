/**
 * Em que fase o site público está. Decide o MENU, a HOME e quando as páginas da
 * temporada mostram o aviso de pré-temporada (ver `semTemporadaAoVivo`).
 *
 * - "pre_temporada": o intervalo entre arquivar uma edição e aplicar o draft da próxima.
 *   O menu fica só com Início · Inscrição · Regras · Temporadas, e a home vira a porta da
 *   inscrição. As páginas da temporada (times, tabela...) continuam no ar pelo endereço e,
 *   enquanto a temporada ao vivo estiver vazia, mostram o aviso de pré-temporada.
 * - "temporada": campeonato em andamento — menu completo e a home do campeonato.
 *
 * É uma constante, e não uma leitura do banco, de propósito: o cabeçalho é desenhado em
 * TODA página, e o projeto já tirou o banco desse caminho uma vez (ver
 * components/sessao-no-cabecalho.tsx) para o site não cair inteiro quando o Supabase pausa.
 *
 * QUANDO TROCAR PARA "temporada" (depois de aplicar o draft da 4ª):
 *   1. a virada já pôs os times e jogadores no dataset ao vivo;
 *   2. os textos da home do campeonato (lib/i18n/messages/paginas-home.ts), do calendário
 *      e o card de desempate da /tabela ainda falam da 3ª — datas, formato, número de
 *      times, "mapas ganhos" — e precisam ser revistos contra o regulamento da 4ª.
 */
import { elencosSaoDaUltimaArquivada } from "@/lib/arquivo";

export type FaseDoSite = "pre_temporada" | "temporada";

export const FASE_DO_SITE: FaseDoSite = "pre_temporada";

export function emPreTemporada(fase: FaseDoSite = FASE_DO_SITE): boolean {
  return fase === "pre_temporada";
}

/**
 * A temporada AO VIVO ainda não tem nada a mostrar: as páginas dela (times, jogadores,
 * tabela, calendário, estatísticas) exibem o aviso de pré-temporada, e os endereços de
 * time e jogador levam à cópia no arquivo de /temporadas.
 *
 * Sem times é o caso óbvio. O outro é o que o painel produz por padrão: "Iniciar nova
 * temporada" vem com "manter os times" e "manter os jogadores" marcados, e aí a 4ª nasce
 * com os elencos da 3ª, zerados. Isso se reconhece por três coisas juntas: pré-temporada,
 * nenhuma série, e times/jogadores idênticos aos da última edição arquivada.
 *
 * As três importam. Sem a última, o intervalo entre a virada do draft (que grava os
 * times NOVOS, ainda sem série) e a troca desta constante para "temporada" escondia os
 * times da 4ª atrás do aviso — e mandava quem voltou com o mesmo nick para a ficha da 3ª.
 * (Antes de arquivar, a 3ª ainda tem as séries dela e continua visível, como sempre.)
 */
export function semTemporadaAoVivo(
  dataset: Parameters<typeof elencosSaoDaUltimaArquivada>[0] & Readonly<{ seriesMatches: readonly unknown[] }>,
  fase: FaseDoSite = FASE_DO_SITE,
): boolean {
  if (dataset.teams.length === 0) return true;
  return emPreTemporada(fase) && dataset.seriesMatches.length === 0 && elencosSaoDaUltimaArquivada(dataset);
}
