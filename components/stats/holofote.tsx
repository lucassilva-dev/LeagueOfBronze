"use client";

import type { KeyboardEvent } from "react";

import { championIconUrl } from "@/lib/champions";
import { formatKda } from "@/lib/format";
import { METRICAS_DE_JOGADOR, arteDoCampeao } from "@/lib/stats/forja";

import { CartaDoJogador } from "./carta-do-jogador";
import s from "./holofote.module.css";
import { EmblemaDoElo, NomeDoTime, coresDoTime, preencher } from "./pecas";
import { useForja } from "./provedor";
import { TelaCheia } from "./tela-cheia";

/**
 * O HOLOFOTE — clicar em qualquer jogador da página abre a carta dele em destaque, de tela cheia:
 * a carta holográfica grande à esquerda (inclina com o mouse) e, ao lado, tudo que a página sabe
 * dele — os números, a posição em cada régua do ranking e os campeões que jogou.
 *
 * Quem abre é o provedor (`data-jogador` em qualquer lugar da página), com View Transitions: o
 * rosto clicado VIRA a carta. Daqui sai o link para a ficha completa e o atalho para o modo VS.
 * ← → passam para o vizinho de cena do jogador (os colegas de pódio, de rota, de elenco…).
 */

/** Quantos campeões cabem na fileira sem virar lista. */
const MAXIMO_DE_CAMPEOES = 6;

export function Holofote() {
  const { dados, t, fontes, holofote, versus } = useForja();
  const { f, s: st, localeTag } = t;
  const slug = holofote.aberto;
  const jogador = slug ? dados.jogadores[slug] : undefined;
  if (!slug || !jogador) return null;

  const time = dados.times.find((x) => x.id === jogador.timeId) ?? null;
  const jogou = jogador.jogos > 0;
  const assinatura = jogador.campeoes[0] ?? null;
  const arte = assinatura?.id ? arteDoCampeao(assinatura.id) : null;

  const indice = holofote.lista.indexOf(slug);
  const temVizinhos = holofote.lista.length > 1 && indice >= 0;
  const vizinho = (delta: 1 | -1) => {
    if (!temVizinhos) return;
    const n = holofote.lista.length;
    holofote.mostrar(holofote.lista[(indice + delta + n) % n]!);
  };
  const aoTeclar = (ev: KeyboardEvent<HTMLDialogElement>) => {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === "ArrowRight" || ev.key === "ArrowLeft") {
      ev.preventDefault();
      vizinho(ev.key === "ArrowRight" ? 1 : -1);
    }
  };

  const numeros: { rotulo: string; valor: string; forte?: boolean }[] = jogou
    ? [
        { rotulo: "KDA", valor: formatKda(jogador.kda, localeTag), forte: true },
        { rotulo: f.cartaAbates, valor: String(jogador.abates) },
        { rotulo: f.cartaMortes, valor: String(jogador.mortes) },
        { rotulo: f.cartaAssist, valor: String(jogador.assistencias) },
        { rotulo: "MVPs", valor: String(jogador.mvps) },
        { rotulo: f.cartaJogos, valor: String(jogador.jogos) },
        { rotulo: f.cartaVitorias, valor: String(jogador.vitorias) },
        { rotulo: f.cartaValor, valor: String(jogador.pts) },
      ]
    : [{ rotulo: f.cartaValor, valor: String(jogador.pts), forte: true }];

  return (
    <TelaCheia
      rotulo={`${f.holofoteTitulo}: ${jogador.nick}`}
      rotuloDeFechar={f.holofoteFechar}
      aoFechar={holofote.fechar}
      aoTeclar={aoTeclar}
      className={s.holofote}
      estilo={coresDoTime(time)}
    >
      {/* o cenário: a arte do campeão assinatura ao fundo e o facho de luz sobre a carta */}
      {arte ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={arte.splash} className={s.enfArte} src={arte.splash} alt="" aria-hidden decoding="async" draggable={false} />
      ) : null}
      <span className={s.enfVeu} aria-hidden />
      <span className={s.enfFacho} aria-hidden />

      {/* a carta (os mesmos dados estão ao lado, em texto: aqui ela é imagem) */}
      <div className={s.palcoDaCarta} aria-hidden>
        <CartaDoJogador key={jogador.slug} jogador={jogador} time={time} t={t} viraSozinha={false} className={s.carta} titulo="h3" />
      </div>

      <div className={s.painel} key={jogador.slug}>
        <p className={s.linhaDoTime}>
          {time ? <NomeDoTime time={time} fonteClasse={fontes[time.id] ?? null} className={s.time} /> : null}
          <span className={s.rota} style={{ color: jogador.rota.cor }}>
            {jogador.rota.rotulo}
          </span>
          {jogador.elo ? (
            <span className={s.elo}>
              <EmblemaDoElo chave={jogador.elo.chave} rotulo="" className={s.eloEmblema} />
              {jogador.elo.rotulo}
            </span>
          ) : null}
          {jogador.capitao ? <span className={s.capitao}>{f.cartaCapitao}</span> : null}
        </p>
        <h2 className={s.nick}>{jogador.nick}</h2>

        <dl className={s.numeros}>
          {numeros.map((n) => (
            <div key={n.rotulo} data-forte={n.forte ? "" : undefined}>
              <dt>{n.rotulo}</dt>
              <dd>{n.valor}</dd>
            </div>
          ))}
        </dl>

        {jogou ? null : <p className={s.semJogo}>{f.cartaSemJogo}</p>}

        {jogador.posicoes ? (
          <div className={s.bloco}>
            <h3 className={s.blocoTitulo}>{f.holofoteRanking}</h3>
            <ul className={s.posicoes}>
              {METRICAS_DE_JOGADOR.map((m) => {
                const posicao = jogador.posicoes![m];
                return (
                  <li key={m} data-podio={posicao >= 1 && posicao <= 3 ? posicao : undefined}>
                    <strong>{preencher(f.holofotePosicao, { n: posicao })}</strong>
                    <span>{st.metricasJogador[m].label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {jogador.campeoes.length > 0 ? (
          <div className={s.bloco}>
            <h3 className={s.blocoTitulo}>{f.holofoteCampeoes}</h3>
            <ul className={s.campeoes}>
              {jogador.campeoes.slice(0, MAXIMO_DE_CAMPEOES).map((c) => (
                <li key={c.nome}>
                  {c.id ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={championIconUrl(c.id)} alt="" loading="lazy" decoding="async" draggable={false} />
                  ) : (
                    <span className={s.semIcone} aria-hidden />
                  )}
                  <span className={s.campeaoNome}>{c.nome}</span>
                  <span className={s.campeaoConta}>
                    {c.jogos}× · {c.vitorias}
                    {st.siglaVitoria}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className={s.acoes}>
          <a className={s.acao} href={`/jogadores/${encodeURIComponent(jogador.slug)}`}>
            {f.cartaFicha} <span aria-hidden>→</span>
          </a>
          <button type="button" className={s.acaoSecundaria} onClick={() => versus.abrir({ tipo: "jogadores", a: jogador.slug })}>
            {f.holofoteVs}
          </button>
        </p>
      </div>

      {temVizinhos ? (
        <p className={s.vizinhos}>
          <button type="button" className={s.vizinho} onClick={() => vizinho(-1)} aria-label={f.holofoteAnterior} title={f.holofoteAnterior}>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden focusable="false">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className={s.contagem}>
            {indice + 1} / {holofote.lista.length}
          </span>
          <button type="button" className={s.vizinho} onClick={() => vizinho(1)} aria-label={f.holofoteProximo} title={f.holofoteProximo}>
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden focusable="false">
              <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </p>
      ) : null}
    </TelaCheia>
  );
}
