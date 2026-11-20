import type { Metadata } from "next";
import { cookies } from "next/headers";

import { textosElenco } from "@/components/lob/textos-elenco";
import { PreTemporadaAviso } from "@/components/pre-temporada-aviso";
import { AtoDoArsenal } from "@/components/stats/atos/arsenal";
import { AtoDaBigorna } from "@/components/stats/atos/bigorna";
import { AtoDosCanais } from "@/components/stats/atos/canais";
import { AtoDoFecho } from "@/components/stats/atos/fecho";
import { AtoDaFornalha } from "@/components/stats/atos/fornalha";
import { AtoDaLiga } from "@/components/stats/atos/liga";
import { AtoDosMoldes } from "@/components/stats/atos/moldes";
import { AtoDasPecasRaras } from "@/components/stats/atos/raras";
import { AtoDaTempera } from "@/components/stats/atos/tempera";
import { COOKIE_DO_SOM, lerPedidoDeVs } from "@/components/stats/constantes";
import { FiltrosDaForja, type TimeDe } from "@/components/stats/pecas";
import { Forja, type TextosDaTela } from "@/components/stats/provedor";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import { semTemporadaAoVivo } from "@/lib/fase-do-site";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getServerDataset } from "@/lib/server-data";
import { montarDadosDaForja } from "@/lib/stats/forja";

export const dynamic = "force-dynamic";

/** Título e descrição próprios, no idioma da visita (lib/i18n/messages/metadados.ts). */
export async function generateMetadata(): Promise<Metadata> {
  return metadadosDaPagina("stats", "/stats");
}

type Parametros = Promise<Record<string, string | string[] | undefined>>;

const primeiro = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor[0] : valor);

export default async function EstatisticasPage({ searchParams }: Readonly<{ searchParams: Parametros }>) {
  const { dataset } = await getServerDataset();
  if (semTemporadaAoVivo(dataset)) return <PreTemporadaAviso pagina="estatisticas" />;

  const [mensagens, locale, parametros, biscoitos] = await Promise.all([getMessages(), getLocale(), searchParams, cookies()]);
  const st = mensagens.paginasStats;
  const localeTag = mensagens.compartilhados.localeTag;
  const t: TextosDaTela = { f: mensagens.forja, s: st, localeTag };

  // O retrato da página: sai das mesmas funções do resto do site (lib/stats/forja.ts).
  const dados = montarDadosDaForja(dataset, { elos: st.elos, rotas: st.rotas, reserva: textosElenco[locale].reserva });
  const edicao = nomeDaTemporada(dados.edicao, localeTag);

  // A fonte do tema de cada time vira classe do next/font AQUI, no servidor.
  const fontes: Record<string, string> = {};
  for (const time of dados.times) {
    if (time.fonteTitulo) fontes[time.id] = FONTES_DOS_TEMAS[time.fonteTitulo].variable;
  }

  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const timeDe: TimeDe = (jogador) => timePorId.get(jogador.timeId) ?? null;

  // A escolha da tela de entrada (cookie): o servidor sabe na hora se desenha a porta — sem piscar.
  const cookieDoSom = biscoitos.get(COOKIE_DO_SOM)?.value;
  const somInicial = cookieDoSom === "1" ? true : cookieDoSom === "0" ? false : null;
  const vsInicial = lerPedidoDeVs(primeiro(parametros.vs));

  return (
    <Forja dados={dados} t={t} fontes={fontes} somInicial={somInicial} vsInicial={vsInicial} portaFechada={false}>
      <FiltrosDaForja />
      <AtoDaFornalha dados={dados} t={t} edicao={edicao} aviso={mensagens.conformidade.eloAviso} />
      <AtoDaLiga dados={dados} t={t} timeDe={timeDe} />
      <AtoDosMoldes dados={dados} t={t} fontes={fontes} />
      <AtoDasPecasRaras dados={dados} t={t} timeDe={timeDe} />
      <AtoDosCanais dados={dados} t={t} timeDe={timeDe} />
      <AtoDaBigorna />
      <AtoDoArsenal />
      <AtoDaTempera dados={dados} t={t} />
      <AtoDoFecho dados={dados} t={t} lema={mensagens.comum.rodapeLema} />
    </Forja>
  );
}
