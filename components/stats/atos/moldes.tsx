import type { CSSProperties } from "react";

import type { DadosDaForja, TimeDaForja } from "@/lib/stats/forja";
import { METRICAS, larguraEm } from "@/lib/temas/metricas";

import b from "../forja.module.css";
import { CartaoDoAto, Medalhao, NomeDoTime, Odometro, Rosto, coresDoTime, preencher } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./moldes.module.css";

/**
 * A largura da MARCA do time em `em`, na fonte do tema dele — para o nome caber na célula no
 * maior tamanho possível. Fonte medida (lib/temas/metricas.ts) dá a largura exata; as duas sem
 * medição (Exo 2 da RX, Bungee do Queijo Minas) e o time sem tema entram por um avanço médio.
 */
const AVANCO_MEDIO: Readonly<Record<string, number>> = { "exo2-italico": 0.66, bungee: 0.72 };
function larguraDaMarca(time: TimeDaForja): number {
  const metricas = time.fonteTitulo ? METRICAS[time.fonteTitulo] : undefined;
  if (metricas) return larguraEm(time.marca, metricas);
  return Math.max(1, time.marca.length * (time.fonteTitulo ? (AVANCO_MEDIO[time.fonteTitulo] ?? 0.6) : 0.5));
}

/**
 * ATO III — OS MOLDES. A força dos times: o bronze derretido enche o molde (um escudo) de cada
 * time até a pontuação do elenco e esfria na cor dele. Cada molde carrega a identidade do time —
 * escudo cunhado no medalhão, nome na fonte e no metal do tema, aura na cor — e os cinco do
 * elenco, clicáveis.
 *
 * Os oito aparecem SEMPRE, um por célula, cada um com o seu número: três times com a mesma
 * pontuação são três células, não uma linha repetida.
 */
export function AtoDosMoldes({
  dados,
  t,
  fontes,
}: Readonly<{ dados: DadosDaForja; t: TextosDaTela; fontes: Readonly<Record<string, string>> }>) {
  const { f, s: st } = t;
  const maior = Math.max(1, ...dados.times.map((time) => time.pontos));

  return (
    <section id="ato-moldes" className={`${b.ato} ${s.ato}`} data-ato="moldes" data-fixa="" aria-labelledby="titulo-dos-moldes">
      <div className={b.palco}>
        <CartaoDoAto numero={f.atos.moldes.numero} nome={f.atos.moldes.nome} sub={f.atos.moldes.sub} id="titulo-dos-moldes" />

        <div className={`${b.cena} ${s.cena}`}>
          <ol className={s.grade}>
            {dados.times.map((time, i) => {
              const estreou = time.series.v + time.series.d > 0 || time.jogos.v + time.jogos.d > 0;
              const campanha = estreou
                ? `${time.series.v}${st.siglaVitoria} · ${time.series.d}${st.siglaDerrota} ${f.moldesSeries}`
                : f.moldesSemJogo;
              return (
                <li
                  key={time.id}
                  className={s.molde}
                  style={{ ...coresDoTime(time), "--nivel": (time.pontos / maior).toFixed(3) } as CSSProperties}
                  data-marca={(0.19 + i * 0.078).toFixed(3)}
                  data-som="despejo"
                  data-conta={time.pontos}
                  data-faisca="time"
                  data-cor={time.neon}
                  data-time={time.id}
                >
                  <div className={s.escudo}>
                    <div className={s.miolo}>
                      <span className={s.enfDerretido} aria-hidden>
                        <span className={s.enfOnda} />
                      </span>
                      <span className={s.enfFrio} aria-hidden />
                    </div>
                    <Medalhao time={time} className={s.medalha} />
                  </div>

                  <div className={s.placar}>
                    <Odometro texto={String(time.pontos)} className={s.numero} />
                    <span className={s.pts}>{f.moldesPts}</span>
                    <span className={s.campanha}>
                      {campanha}
                      {time.posicao !== null && estreou ? <span className={s.lugar}>{preencher(f.moldesLugar, { n: time.posicao })}</span> : null}
                    </span>
                  </div>

                  <h3 className={s.nome} style={{ "--nome-em": larguraDaMarca(time).toFixed(2) } as CSSProperties}>
                    <a href={`/times/${encodeURIComponent(time.slug)}`} className={s.nomeLink} title={f.moldesVerTime}>
                      <NomeDoTime time={time} fonteClasse={fontes[time.id] ?? null} />
                    </a>
                  </h3>

                  <ul className={s.elenco} data-grupo-de-jogadores="">
                    {time.elenco.map((slug) => {
                      const jogador = dados.jogadores[slug];
                      if (!jogador) return null;
                      return (
                        <li key={slug}>
                          <Rosto jogador={jogador} time={time} rotulo={preencher(f.cartaAbrir, { nick: jogador.nick })} className={s.rosto} />
                        </li>
                      );
                    })}
                  </ul>

                  <button type="button" className={s.vs} data-vs-time={time.id} aria-label={`${f.hudVs}: ${time.nome}`}>
                    VS
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <p className={b.nota}>{f.moldesNota}</p>
      </div>
    </section>
  );
}
