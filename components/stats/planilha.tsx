import Link from "next/link";
import type { ReactNode } from "react";

import { formatDateLabel, formatKda, formatPercent } from "@/lib/format";
import type { DadosDaForja, JogadorDaForja, TimeDaForja } from "@/lib/stats/forja";

import { preencher } from "./pecas";
import s from "./planilha.module.css";
import type { TextosDaTela } from "./provedor";

/**
 * A /stats COMO TABELA (`/stats?modo=tabela`) — todos os números da página, crus: sem 3D, sem
 * rolagem com roteiro, sem som. É a mesma fonte de dados dos atos (lib/stats/forja.ts), então os
 * dois lados nunca discordam.
 *
 * Para quem quer conferir um número, copiar para uma planilha, usa leitor de tela ou
 * simplesmente prefere ler assim. Tabelas de verdade (`<table>`, cabeçalhos com `scope`), que
 * rolam de lado no celular dentro da própria moldura.
 */

const TRACO = "—";

function Secao({ id, titulo, nota, children }: Readonly<{ id: string; titulo: string; nota?: string; children: ReactNode }>) {
  return (
    <section className={s.secao} aria-labelledby={id}>
      <h2 id={id} className={s.secaoTitulo}>
        {titulo}
      </h2>
      {nota ? <p className={s.secaoNota}>{nota}</p> : null}
      {/* A moldura rola de lado; com foco, as setas do teclado rolam a tabela. */}
      <div className={s.moldura} role="region" aria-labelledby={id} tabIndex={0}>
        {children}
      </div>
    </section>
  );
}

export function Planilha({
  dados,
  t,
  edicao,
  aviso,
}: Readonly<{ dados: DadosDaForja; t: TextosDaTela; edicao: string; aviso: string }>) {
  const { f, s: st, localeTag } = t;
  const r = dados.resumo;
  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const timeDe = (jogador: JogadorDaForja): TimeDaForja | null => timePorId.get(jogador.timeId) ?? null;
  const nomeDoTime = (id: string) => timePorId.get(id)?.nome ?? TRACO;
  const kda = (v: number) => formatKda(v, localeTag);
  const pct = (v: number) => formatPercent(v, 0, localeTag);
  const data = (iso: string) => formatDateLabel(iso, undefined, localeTag);

  const fichaDe = (jogador: JogadorDaForja) => (
    <a href={`/jogadores/${encodeURIComponent(jogador.slug)}`} className={s.link}>
      {jogador.nick}
    </a>
  );
  const paginaDo = (time: TimeDaForja | null) =>
    time ? (
      <a href={`/times/${encodeURIComponent(time.slug)}`} className={s.link} style={{ color: time.cor }}>
        {time.nome}
      </a>
    ) : (
      TRACO
    );

  // O ranking inteiro: quem jogou, na ordem dos abates (com os desempates do site); depois quem
  // ainda não entrou em jogo, para as 40 linhas baterem com os 40 jogadores.
  const comJogo = dados.ranking.abates.map((linha) => dados.jogadores[linha.slug]).filter((j): j is JogadorDaForja => Boolean(j));
  const semJogo = dados.semJogo.map((slug) => dados.jogadores[slug]).filter((j): j is JogadorDaForja => Boolean(j));

  // Os campeões: os escolhidos (na ordem de picks) e, depois, os que só foram banidos.
  const ordemDosCampeoes = [...new Set([...dados.campeoesOrdem.jogados, ...dados.campeoesOrdem.banidos, ...Object.keys(dados.campeoes)])];
  const campeoes = ordemDosCampeoes.map((chave) => dados.campeoes[chave]).filter((c) => c !== undefined);

  const numerosDoResumo: [string, string | number][] = [
    [st.statsPillJogadores, r.jogadores],
    [st.statsPillPool, r.pool],
    [st.statsPillMedia, r.media],
    [st.statsPillMono, r.monos],
    [f.fechoTimes, r.times],
    [f.colJogos, r.jogos],
    [f.colAbates, r.abates],
    [f.vsSeries, `${r.seriesCompletas} / ${r.seriesTotal}`],
  ];

  return (
    <div className={s.planilha}>
      <header className={s.cabeca}>
        <p className={s.sobre}>{edicao}</p>
        <h1 className={s.titulo}>{f.tabelaTitulo}</h1>
        <p className={s.intro}>{f.tabelaIntro}</p>
        <p className={s.voltar}>
          <Link href="/stats" className={s.botao}>
            <span aria-hidden>←</span> {f.tabelaVoltar}
          </Link>
        </p>
        <p className={s.aviso}>{aviso}</p>
      </header>

      {/* ------------------------------------------------ resumo */}
      <Secao id="tabela-resumo" titulo={f.tabelaResumo} nota={preencher(f.resumoFaixa, { jogos: r.jogos, abates: r.abates, series: r.seriesCompletas, total: r.seriesTotal })}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col">{f.colItem}</th>
              <th scope="col" className={s.num}>
                {f.colNumero}
              </th>
            </tr>
          </thead>
          <tbody>
            {numerosDoResumo.map(([rotulo, valor]) => (
              <tr key={rotulo}>
                <th scope="row">{rotulo}</th>
                <td className={s.num}>{valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ distribuição por elo */}
      <Secao id="tabela-elos" titulo={st.statsDistribuicaoElo}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col">{f.colElo}</th>
              <th scope="col" className={s.num}>
                {f.colPts}
              </th>
              <th scope="col" className={s.num}>
                {f.colQuantidade}
              </th>
              <th scope="col">{f.colJogador}</th>
            </tr>
          </thead>
          <tbody>
            {dados.elos.map((elo) => (
              <tr key={elo.chave}>
                <th scope="row" style={{ color: elo.cor }}>
                  {elo.rotulo}
                </th>
                <td className={s.num}>{elo.pts}</td>
                <td className={s.num}>{elo.quantidade}</td>
                <td className={s.lista}>
                  {elo.jogadores.map((slug, i) => {
                    const jogador = dados.jogadores[slug];
                    if (!jogador) return null;
                    return (
                      <span key={slug}>
                        {i > 0 ? ", " : ""}
                        {fichaDe(jogador)}
                      </span>
                    );
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ força dos times */}
      <Secao id="tabela-times" titulo={st.statsForcaTimes}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col">{f.colTime}</th>
              <th scope="col" className={s.num}>
                {f.colPts}
              </th>
              <th scope="col" className={s.num}>
                {f.vsPosicao}
              </th>
              <th scope="col" className={s.num}>
                {f.colCampanha}
              </th>
              <th scope="col" className={s.num}>
                {f.vsMapas}
              </th>
              <th scope="col" className={s.num}>
                {f.colAbates}
              </th>
              <th scope="col" className={s.num}>
                {f.colMortes}
              </th>
              <th scope="col" className={s.num}>
                {f.colAssist}
              </th>
              <th scope="col" className={s.num}>
                {f.colKda}
              </th>
              <th scope="col" className={s.num}>
                {f.colMvps}
              </th>
              <th scope="col" className={s.num}>
                {f.colMinutos}
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.times.map((time) => {
              const estreou = time.jogos.v + time.jogos.d > 0;
              return (
                <tr key={time.id}>
                  <th scope="row">{paginaDo(time)}</th>
                  <td className={s.num}>{time.pontos}</td>
                  <td className={s.num}>{time.posicao === null ? TRACO : preencher(f.holofotePosicao, { n: time.posicao })}</td>
                  <td className={s.num}>
                    {time.series.v}–{time.series.d}
                  </td>
                  <td className={s.num}>
                    {time.jogos.v}–{time.jogos.d}
                  </td>
                  <td className={s.num}>{estreou ? time.abates : TRACO}</td>
                  <td className={s.num}>{estreou ? time.mortes : TRACO}</td>
                  <td className={s.num}>{estreou ? time.assistencias : TRACO}</td>
                  <td className={s.num}>{estreou ? kda(time.kda) : TRACO}</td>
                  <td className={s.num}>{estreou ? time.mvps : TRACO}</td>
                  <td className={s.num}>{time.duracaoMedia === null ? TRACO : new Intl.NumberFormat(localeTag, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(time.duracaoMedia)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ top por valor */}
      <Secao id="tabela-valor" titulo={st.statsTopJogadores} nota={preencher(f.pecasNota, { n: dados.topValor.length })}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col" className={s.num}>
                #
              </th>
              <th scope="col">{f.colJogador}</th>
              <th scope="col">{f.colTime}</th>
              <th scope="col">{f.colRota}</th>
              <th scope="col">{f.colElo}</th>
              <th scope="col" className={s.num}>
                {f.colValor}
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.topValor.map((slug, i) => {
              const jogador = dados.jogadores[slug];
              if (!jogador) return null;
              return (
                <tr key={slug}>
                  <td className={s.num}>{i + 1}</td>
                  <th scope="row">{fichaDe(jogador)}</th>
                  <td>{paginaDo(timeDe(jogador))}</td>
                  <td>{jogador.rota.rotulo}</td>
                  <td>{jogador.elo?.rotulo ?? TRACO}</td>
                  <td className={s.num}>{jogador.pts}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ melhor por rota */}
      <Secao id="tabela-rotas" titulo={st.rotaTitulo} nota={f.canaisNota}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col">{f.colRota}</th>
              <th scope="col" className={s.num}>
                #
              </th>
              <th scope="col">{f.colJogador}</th>
              <th scope="col">{f.colTime}</th>
              <th scope="col" className={s.num}>
                {f.colKda}
              </th>
              <th scope="col" className={s.num}>
                {f.colJogos}
              </th>
              <th scope="col" className={s.num}>
                {f.colAbates}
              </th>
              <th scope="col" className={s.num}>
                {f.colMortes}
              </th>
              <th scope="col" className={s.num}>
                {f.colAssist}
              </th>
              <th scope="col" className={s.num}>
                {f.colMvps}
              </th>
            </tr>
          </thead>
          <tbody>
            {dados.rotas.flatMap((rota) =>
              rota.linhas.map((linha) => {
                const jogador = dados.jogadores[linha.slug];
                if (!jogador) return null;
                return (
                  <tr key={`${rota.sigla}-${linha.slug}`}>
                    <td style={{ color: rota.cor }}>{rota.rotulo}</td>
                    <td className={s.num}>{linha.posicao}</td>
                    <th scope="row">{fichaDe(jogador)}</th>
                    <td>{paginaDo(timeDe(jogador))}</td>
                    <td className={s.num}>{kda(linha.kda)}</td>
                    <td className={s.num}>{linha.jogos}</td>
                    <td className={s.num}>{linha.abates}</td>
                    <td className={s.num}>{linha.mortes}</td>
                    <td className={s.num}>{linha.assistencias}</td>
                    <td className={s.num}>{linha.mvps}</td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ ranking de jogadores */}
      <Secao
        id="tabela-ranking"
        titulo={st.rankJogadoresTitulo}
        nota={
          semJogo.length === 0
            ? f.bigornaTodosJogaram
            : `${preencher(f.bigornaJogaram, { n: comJogo.length, total: comJogo.length + semJogo.length })} · ${f.bigornaBanco}: ${semJogo.map((j) => j.nick).join(", ")}`
        }
      >
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col" className={s.num}>
                #
              </th>
              <th scope="col">{f.colJogador}</th>
              <th scope="col">{f.colTime}</th>
              <th scope="col">{f.colRota}</th>
              <th scope="col">{f.colElo}</th>
              <th scope="col" className={s.num}>
                {f.colValor}
              </th>
              <th scope="col" className={s.num}>
                {f.colJogos}
              </th>
              <th scope="col" className={s.num}>
                {f.colVitorias}
              </th>
              <th scope="col" className={s.num}>
                {f.colAbates}
              </th>
              <th scope="col" className={s.num}>
                {f.colMortes}
              </th>
              <th scope="col" className={s.num}>
                {f.colAssist}
              </th>
              <th scope="col" className={s.num}>
                {f.colKda}
              </th>
              <th scope="col" className={s.num}>
                {f.colMvps}
              </th>
            </tr>
          </thead>
          <tbody>
            {[...comJogo, ...semJogo].map((jogador) => {
              const jogou = jogador.jogos > 0;
              return (
                <tr key={jogador.slug} data-sem-jogo={jogou ? undefined : ""}>
                  <td className={s.num}>{jogador.posicoes ? jogador.posicoes.abates : TRACO}</td>
                  <th scope="row">{fichaDe(jogador)}</th>
                  <td>{paginaDo(timeDe(jogador))}</td>
                  <td>{jogador.rota.rotulo}</td>
                  <td>{jogador.elo?.rotulo ?? TRACO}</td>
                  <td className={s.num}>{jogador.pts}</td>
                  <td className={s.num}>{jogador.jogos}</td>
                  <td className={s.num}>{jogou ? jogador.vitorias : TRACO}</td>
                  <td className={s.num}>{jogou ? jogador.abates : TRACO}</td>
                  <td className={s.num}>{jogou ? jogador.mortes : TRACO}</td>
                  <td className={s.num}>{jogou ? jogador.assistencias : TRACO}</td>
                  <td className={s.num}>{jogou ? kda(jogador.kda) : TRACO}</td>
                  <td className={s.num}>{jogou ? jogador.mvps : TRACO}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ campeões */}
      <Secao id="tabela-campeoes" titulo={st.rankCampeoesTitulo} nota={preencher(f.arsenalNota, { n: campeoes.length, jogos: r.jogos })}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col">{f.colCampeao}</th>
              <th scope="col" className={s.num}>
                {f.colPicks}
              </th>
              <th scope="col" className={s.num}>
                {f.colBans}
              </th>
              <th scope="col" className={s.num}>
                {f.colPresenca}
              </th>
              <th scope="col" className={s.num}>
                {f.colVitorias}
              </th>
              <th scope="col" className={s.num}>
                {f.colWinrate}
              </th>
              <th scope="col" className={s.num}>
                {f.colKda}
              </th>
              <th scope="col" className={s.num}>
                {f.colAbates}
              </th>
              <th scope="col" className={s.num}>
                {f.colMortes}
              </th>
              <th scope="col" className={s.num}>
                {f.colAssist}
              </th>
            </tr>
          </thead>
          <tbody>
            {campeoes.map((c) => (
              <tr key={c.chave}>
                <th scope="row">{c.nome}</th>
                <td className={s.num}>{c.picks}</td>
                <td className={s.num}>{c.bans}</td>
                <td className={s.num}>{pct(c.presenca)}</td>
                <td className={s.num}>{c.picks > 0 ? `${c.vitorias}–${c.derrotas}` : TRACO}</td>
                <td className={s.num}>{c.picks > 0 ? pct(c.winRate) : TRACO}</td>
                <td className={s.num}>{c.picks > 0 ? kda(c.kda) : TRACO}</td>
                <td className={s.num}>{c.picks > 0 ? c.abates : TRACO}</td>
                <td className={s.num}>{c.picks > 0 ? c.mortes : TRACO}</td>
                <td className={s.num}>{c.picks > 0 ? c.assistencias : TRACO}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ duração das partidas */}
      <Secao id="tabela-duracao" titulo={st.duracaoTitulo} nota={preencher(f.temperaNota, { n: dados.duracoes.length })}>
        <table className={s.tabela}>
          <thead>
            <tr>
              <th scope="col" className={s.num}>
                {f.colMinutos}
              </th>
              <th scope="col">{f.colConfronto}</th>
              <th scope="col" className={s.num}>
                {f.colJogo}
              </th>
              <th scope="col">{f.colVencedor}</th>
              <th scope="col">{f.colSerie}</th>
            </tr>
          </thead>
          <tbody>
            {dados.duracoes.map((jogo) => {
              const serie = dados.series.find((x) => x.id === jogo.serieId);
              return (
                <tr key={`${jogo.serieId}-${jogo.jogo}`}>
                  <td className={s.num}>{jogo.min}</td>
                  <th scope="row">
                    {nomeDoTime(jogo.timeA)} × {nomeDoTime(jogo.timeB)}
                  </th>
                  <td className={s.num}>{jogo.jogo}</td>
                  <td>{paginaDo(timePorId.get(jogo.vencedor) ?? null)}</td>
                  <td>
                    <a href={`/partidas/${encodeURIComponent(jogo.serieId)}`} className={s.link}>
                      {serie ? data(serie.data) : f.temperaVerPartida}
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Secao>

      {/* ------------------------------------------------ para onde ir */}
      <nav className={s.portas} aria-label={f.atos.fecho.sub}>
        <Link href="/stats" className={s.botao}>
          <span aria-hidden>←</span> {f.tabelaVoltar}
        </Link>
        <Link href="/jogadores" className={s.botaoSecundario}>
          {f.fechoJogadores}
        </Link>
        <Link href="/times" className={s.botaoSecundario}>
          {f.fechoTimes}
        </Link>
        <Link href="/partidas" className={s.botaoSecundario}>
          {f.fechoPartidas}
        </Link>
      </nav>
    </div>
  );
}
