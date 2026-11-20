"use client";

import { LayoutGroup, MotionConfig, motion } from "framer-motion";
import { useState, type CSSProperties } from "react";

import { formatKda } from "@/lib/format";
import { METRICAS_DE_JOGADOR, valorDoJogador, type LinhaDoRanking, type MetricaDeJogador, type TimeDaForja } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { CartaoDoAto, Medalhao, Odometro, Rosto, coresDoTime, preencher } from "../pecas";
import { useForja } from "../provedor";
import s from "./bigorna.module.css";

/** Quantas linhas aparecem antes do «ver todos» (pódio + lista). */
const TOPO = 10;

/**
 * ATO VI — A BIGORNA. O ranking de jogadores, por Abates / KDA / MVPs / Assistências / Mortes.
 *
 * Não fixa: é lista para ler. O pódio (top 3) tem tratamento próprio; do 4º em diante as linhas
 * TROCAM DE LUGAR animadas ao mudar o critério (FLIP, pelo `layout` do framer-motion: só
 * transform) e os números rolam como odômetro. Quem do elenco ainda não jogou não está no
 * ranking — e isso vai escrito na tela, com o nome.
 */
export function AtoDaBigorna() {
  const { dados, t, som } = useForja();
  const { f, s: st, localeTag } = t;
  const [metrica, setMetrica] = useState<MetricaDeJogador>("abates");
  const [invertido, setInvertido] = useState(false);
  const [aberto, setAberto] = useState(false);
  // Cada troca de régua faz o pódio BATER de novo (o CSS alterna entre dois nomes de animação).
  const [batidas, setBatidas] = useState(0);

  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const timeDe = (slug: string): TimeDaForja | null => timePorId.get(dados.jogadores[slug]?.timeId ?? "") ?? null;

  const todas = invertido ? [...dados.ranking[metrica]].reverse() : dados.ranking[metrica];
  const podio = todas.slice(0, 3);
  const lista = todas.slice(3, aberto ? undefined : TOPO);
  const escondidas = Math.max(0, todas.length - TOPO);
  const texto = (linha: LinhaDoRanking) => (metrica === "kda" ? formatKda(linha.valor, localeTag) : String(linha.valor));
  const info = st.metricasJogador[metrica];
  const jogaram = dados.resumo.jogadores - dados.semJogo.length;

  const trocar = (nova: MetricaDeJogador) => {
    if (nova === metrica) return;
    setMetrica(nova);
    setBatidas((n) => n + 1);
    som.tocar((x) => x.catraca(7));
  };

  return (
    <section id="ato-bigorna" className={`${b.ato} ${s.ato}`} data-ato="bigorna" aria-labelledby="titulo-da-bigorna">
      <div className={`${b.palco} ${s.palco}`}>
        <div className={s.topo}>
          <CartaoDoAto numero={f.atos.bigorna.numero} nome={f.atos.bigorna.nome} sub={f.atos.bigorna.sub} id="titulo-da-bigorna" />
          <p className={s.aoVivo}>
            <span className={s.enfPulso} aria-hidden />
            {st.rankAoVivo}
          </p>
        </div>

        {/* Quem falta no ranking: o titular que ainda não entrou em jogo. */}
        <p className={s.jogaram} data-grupo-de-jogadores="">
          <strong>{preencher(f.bigornaJogaram, { n: jogaram, total: dados.resumo.jogadores })}</strong>
          {dados.semJogo.length === 0 ? (
            <span>{f.bigornaTodosJogaram}</span>
          ) : (
            <>
              <span className={s.banco}>{f.bigornaBanco}:</span>
              {dados.semJogo.map((slug) => {
                const jogador = dados.jogadores[slug];
                const time = timeDe(slug);
                if (!jogador) return null;
                return (
                  <a key={slug} href={`/jogadores/${encodeURIComponent(slug)}`} data-jogador={slug} className={s.noBanco} style={coresDoTime(time)}>
                    {jogador.nick}
                    {time ? <span>{time.nome}</span> : null}
                  </a>
                );
              })}
            </>
          )}
        </p>

        <div className={s.controles}>
          <div className={s.criterios} role="group" aria-label={f.bigornaCriterio}>
            {METRICAS_DE_JOGADOR.map((chave) => (
              <button key={chave} type="button" className={s.criterio} aria-pressed={chave === metrica} onClick={() => trocar(chave)}>
                {st.metricasJogador[chave].label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={s.inverter}
            aria-pressed={invertido}
            title={invertido ? st.rankOrdemAsc : st.rankOrdemDesc}
            onClick={() => {
              setInvertido((v) => !v);
              setBatidas((n) => n + 1);
              som.tocar((x) => x.catraca(4));
            }}
          >
            <span className={s.enfSetas} aria-hidden />
            {f.bigornaInverter}
          </button>
        </div>

        {todas.length === 0 ? (
          <div className={s.vazio}>
            <p className={s.vazioTitulo}>{st.rankVazioJogadores}</p>
            <p>{st.rankVazioTexto}</p>
          </div>
        ) : (
          <MotionConfig reducedMotion="user">
            {/* ---------------------------------------------------------------- pódio */}
            <ol className={s.podio} data-grupo-de-jogadores="">
              {podio.map((linha, i) => {
                const jogador = dados.jogadores[linha.slug];
                if (!jogador) return null;
                const time = timeDe(linha.slug);
                return (
                  <li
                    // A chave é o DEGRAU, não o jogador: o odômetro continua o mesmo e rola do
                    // número antigo para o novo.
                    key={`degrau-${i + 1}`}
                    className={s.degrau}
                    data-lugar={i + 1}
                    data-bate={batidas % 2 === 0 ? "a" : "b"}
                    style={coresDoTime(time)}
                  >
                    <span className={s.lugar}>{linha.posicao}</span>
                    <span className={s.rotaDoPodio}>{jogador.rota.rotulo}</span>
                    <Rosto jogador={jogador} time={time} rotulo={preencher(f.cartaAbrir, { nick: jogador.nick })} className={s.rostoDoPodio} dica={false} />
                    <div className={s.quem}>
                      <a href={`/jogadores/${encodeURIComponent(jogador.slug)}`} data-jogador={jogador.slug} className={s.nickDoPodio}>
                        {jogador.nick}
                      </a>
                      <span className={s.timeDoPodio}>
                        {time ? <Medalhao time={time} className={s.medalhaDoPodio} cunhado={false} rotulo="" /> : null}
                        <span>{time?.nome ?? ""}</span>
                      </span>
                    </div>
                    <p className={s.valorDoPodio}>
                      <Odometro texto={texto(linha)} className={s.numeroDoPodio} />
                      <span>{info.head}</span>
                    </p>
                    {/* os outros números de quem está no pódio (as outras réguas do ranking) */}
                    <dl className={s.outros}>
                      {METRICAS_DE_JOGADOR.filter((chave) => chave !== metrica)
                        .slice(0, 3)
                        .map((chave) => {
                          const valor = valorDoJogador(jogador, chave);
                          return (
                            <div key={chave}>
                              <dt>{st.metricasJogador[chave].head}</dt>
                              <dd>{chave === "kda" ? formatKda(valor, localeTag) : valor}</dd>
                            </div>
                          );
                        })}
                    </dl>
                  </li>
                );
              })}
            </ol>

            {/* ---------------------------------------------------------------- do 4º em diante */}
            <LayoutGroup>
              <ol className={s.lista} start={4} data-grupo-de-jogadores="">
                {lista.map((linha) => {
                  const jogador = dados.jogadores[linha.slug];
                  if (!jogador) return null;
                  const time = timeDe(linha.slug);
                  return (
                    <motion.li
                      key={linha.slug}
                      layout="position"
                      initial={false}
                      transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
                      className={s.linha}
                      style={coresDoTime(time) as CSSProperties}
                    >
                      <span className={s.posicao}>{linha.posicao}</span>
                      <Rosto jogador={jogador} time={time} rotulo={preencher(f.cartaAbrir, { nick: jogador.nick })} className={s.rostoDaLinha} dica={false} />
                      <a href={`/jogadores/${encodeURIComponent(jogador.slug)}`} data-jogador={jogador.slug} className={s.nickDaLinha}>
                        {jogador.nick}
                        <span>{jogador.rota.rotulo}</span>
                      </a>
                      <span className={s.timeDaLinha}>{time?.nome ?? ""}</span>
                      <Odometro texto={texto(linha)} className={s.numeroDaLinha} />
                    </motion.li>
                  );
                })}
              </ol>
            </LayoutGroup>

            <div className={s.pe}>
              <p className={s.descricao}>{info.desc}</p>
              {escondidas > 0 ? (
                <button type="button" className={s.verTodos} aria-expanded={aberto} onClick={() => setAberto((v) => !v)}>
                  {aberto ? f.bigornaVerMenos : preencher(f.bigornaVerTodos, { n: todas.length })}
                </button>
              ) : null}
            </div>
          </MotionConfig>
        )}
      </div>
    </section>
  );
}
