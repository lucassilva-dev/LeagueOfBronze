import type { CSSProperties } from "react";

import type { DadosDaForja } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { CartaoDoAto, EmblemaDoElo, Odometro, coresDoTime, preencher, type TimeDe } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./liga.module.css";

/** Luminância relativa (0–1) de uma cor #rrggbb, para escolher a tinta do rótulo do lingote. */
function luminancia(hex: string): number {
  const n = Number.parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return 0.5;
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

/**
 * ATO II — A LIGA. A distribuição por elo como a liga metálica do campeonato: uma pilha de
 * lingotes por elo, de Ferro a Mestre, e CADA LINGOTE É UM JOGADOR (com o nick e a cor do time
 * dele; o clique abre o holofote). O emblema oficial do elo sobe em cima da pilha, com a conta.
 */
export function AtoDaLiga({ dados, t, timeDe }: Readonly<{ dados: DadosDaForja; t: TextosDaTela; timeDe: TimeDe }>) {
  const { f } = t;
  const maior = Math.max(1, ...dados.elos.map((elo) => elo.quantidade));
  const bronzes = dados.elos.find((elo) => elo.chave === "bronze")?.quantidade ?? 0;
  // A piada do nome do campeonato sai do dado: quantos Bronzes de verdade há no elenco.
  const fraseDoBronze =
    bronzes === 0
      ? f.ligaBronzeZero
      : bronzes * 4 >= dados.resumo.jogadores
        ? preencher(f.ligaBronzeMuitos, { n: bronzes })
        : bronzes === 1
          ? f.ligaBronzeUm
          : preencher(f.ligaBronzeVarios, { n: bronzes });

  return (
    <section id="ato-liga" className={`${b.ato} ${s.ato}`} data-ato="liga" data-fixa="" aria-labelledby="titulo-da-liga">
      <div className={b.palco}>
        <CartaoDoAto numero={f.atos.liga.numero} nome={f.atos.liga.nome} sub={f.atos.liga.sub} id="titulo-da-liga" />

        <div className={`${b.cena} ${s.cena}`}>
          <ol className={s.bancada} style={{ "--colunas": dados.elos.length, "--max": maior } as CSSProperties}>
            {dados.elos.map((elo, i) => {
              const escuro = luminancia(elo.cor) < 0.2;
              return (
                <li
                  key={elo.chave}
                  className={s.coluna}
                  // a piada do ato é sobre ESTA coluna: ela leva a luz
                  data-destaque={elo.chave === "bronze" ? "" : undefined}
                  style={{ "--elo": elo.cor, "--n": elo.quantidade, "--tinta-do-lingote": escuro ? "#f3ece0" : "#14100a" } as CSSProperties}
                  data-marca={(0.2 + i * 0.085).toFixed(3)}
                  data-som="baque"
                  data-conta={elo.quantidade}
                >
                  <div className={s.topo}>
                    <Odometro texto={String(elo.quantidade)} className={s.conta} />
                    <span className={b.soLeitor}>{elo.quantidade === 1 ? f.ligaJogador : f.ligaJogadores}</span>
                    <EmblemaDoElo chave={elo.chave} rotulo={elo.rotulo} className={s.emblema} />
                  </div>
                  <ul className={s.pilha} data-grupo-de-jogadores="">
                    {elo.jogadores.map((slug, k) => {
                      const jogador = dados.jogadores[slug];
                      if (!jogador) return null;
                      const time = timeDe(jogador);
                      return (
                        <li key={slug} className={s.lingote} style={{ "--k": k, ...coresDoTime(time) } as CSSProperties}>
                          <a
                            href={`/jogadores/${encodeURIComponent(slug)}`}
                            className={`${s.lingoteLink} ${b.dica}`}
                            data-jogador={slug}
                            data-dica={time ? `${jogador.nick} · ${time.nome}` : jogador.nick}
                            aria-label={preencher(f.cartaAbrir, { nick: jogador.nick })}
                          >
                            <span className={s.enfTime} aria-hidden />
                            <span className={s.lingoteNick}>{jogador.nick}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                  <span className={s.nomeDoElo}>{elo.rotulo}</span>
                </li>
              );
            })}
          </ol>
        </div>

        <p className={`${b.nota} ${s.piada}`}>{fraseDoBronze}</p>
      </div>
    </section>
  );
}
