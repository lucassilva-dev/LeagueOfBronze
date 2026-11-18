import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import cm from "@/components/times/campanha.module.css";
import { cx, type ClassesDaPeca } from "@/components/times/util";
import { championIconUrl } from "@/lib/champions";
import { formatKda, partesDaDataDaSerie } from "@/lib/format";
import { formatoLabel } from "@/lib/i18n/messages/compartilhados";
import { rotaCurto, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type {
  CampanhaDoJogador,
  CampeaoDoJogo,
  JogoDaCampanha,
  MetricaDoRanking,
  ResultadoDaSerie,
  SerieDaCampanha,
  TimeDaCampanha,
} from "@/lib/jogadores/campanha";
import type { SeriesStage } from "@/lib/schema";

/**
 * A CAMPANHA do jogador na ficha (/jogadores/[slug]): destaques (ranking, melhor jogo,
 * participação nos abates, forma), o próximo desafio do time, série a série com cada jogo e os
 * campeões. Os números saem de lib/jogadores/campanha.ts; aqui é só a vitrine.
 *
 * Uma estrutura para todos os times; a CARA de cada time vem do tema (as variáveis `--tm-*` da
 * raiz da ficha) e dos GANCHOS do cenário: cada peça leva a classe da base (campanha.module.css)
 * e, se o cenário tiver uma classe com o mesmo nome em `classesDaCampanha`, essa também (`c`,
 * montado com `comCenario`). Estados para o CSS: `data-resultado` (vitoria | derrota |
 * andamento) na série, no jogo e na forma; `data-mvp` no jogo; `data-tipo` (ausente | wo |
 * provisorio) no jogo sem K/D/A dele. Nada aqui anima: as entradas, se houver, são do cenário
 * (só transform).
 *
 * A ficha padrão (reserva, time sem tema) usa a mesma peça com `padrao`: as variáveis do bronze
 * do site (campanha.module.css, `.padrao`).
 */

type Props = Readonly<{
  campanha: CampanhaDoJogador;
  t: PaginasHomeTextos;
  /** "pt-BR" | "en-US" (compartilhados.localeTag). */
  localeTag: string;
  /** O texto do quadradinho sem campeão (compartilhados.campeaoNaoInformado). */
  semCampeao: string;
  /** "MD3" → "Bo3" no inglês (compartilhados.formatos); sem o mapa, o rótulo sai como veio. */
  formatos?: Readonly<Record<string, string>>;
  /** O nick como aparece no site: as frases usam o nick, nunca pronome. */
  nick: string;
  /** Prefixo dos ids (títulos e aria-labelledby). */
  idBase: string;
  /** As classes de cada peça: a da base e o gancho do cenário (`comCenario(cm, …)`). */
  c: ClassesDaPeca;
  /** O título da seção (h2): na ficha temática, o `estrelando` do tema, o mesmo do elenco. */
  tituloClasse: string;
  /** A largura do conteúdo (na ficha temática, o `conteiner` do tema). */
  conteinerClasse?: string;
  titulos: Readonly<{ campanha: string; resultados: string; campeoes: string; proximo: string }>;
  /** O cenário atrás da seção (enfeite, aria-hidden). */
  NaCampanha?: () => ReactNode;
  /** As variáveis do bronze do site, para a ficha sem tema. */
  padrao?: boolean;
}>;

/** "3º" / "3rd". */
export function ordinal(n: number, localeTag: string): string {
  if (localeTag === "pt-BR") return `${n}º`;
  const dezena = n % 100;
  const sufixo = dezena >= 11 && dezena <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${sufixo}`;
}

function preencher(molde: string, valores: Record<string, string | number>): string {
  return molde.replace(/\{(\w+)\}/g, (inteiro, chave: string) => (chave in valores ? String(valores[chave]) : inteiro));
}

function rotuloDaFase(t: PaginasHomeTextos, fase: SeriesStage): string {
  if (fase === "SEMIFINAL") return t.campanhaSemifinal;
  if (fase === "FINAL") return t.campanhaFinal;
  return t.campanhaFaseRegular;
}

function rotuloDoResultado(t: PaginasHomeTextos, resultado: ResultadoDaSerie): string {
  if (resultado === "vitoria") return t.campanhaVitoria;
  if (resultado === "derrota") return t.campanhaDerrota;
  return t.campanhaEmAndamento;
}

function rotuloDaMetrica(t: PaginasHomeTextos, metrica: MetricaDoRanking): string {
  return {
    abates: t.campanhaMetricaAbates,
    kda: t.campanhaMetricaKda,
    mvps: t.campanhaMetricaMvps,
    assistencias: t.campanhaMetricaAssistencias,
  }[metrica];
}

/** O link da partida (id com "#" ou espaço chega codificado; ver lib/segmento-da-rota.ts). */
function hrefDaPartida(id: string): string {
  return `/partidas/${encodeURIComponent(id)}`;
}

function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter((p) => !/^(de|do|da|dos|das|e)$/i.test(p));
  return (palavras.slice(0, 2).map((p) => p[0]).join("") || nome.slice(0, 2)).toUpperCase();
}

function Escudo({ time, c, tamanho }: Readonly<{ time: TimeDaCampanha; c: ClassesDaPeca; tamanho: number }>) {
  return time.imagem ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img className={c("escudo")} src={time.imagem} alt="" width={tamanho} height={tamanho} loading="lazy" decoding="async" />
  ) : (
    <span className={c("escudo", "escudoVazio")} aria-hidden="true">
      {iniciais(time.nome)}
    </span>
  );
}

function IconeDoCampeao({
  campeao,
  c,
  tamanho,
  semCampeao,
}: Readonly<{ campeao: CampeaoDoJogo | null; c: ClassesDaPeca; tamanho: number; semCampeao: string }>) {
  if (campeao?.id) {
    return (
      // O nome do campeão está ao lado, em texto: o ícone é decorativo (alt vazio).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={c("campeaoIcone")}
        src={championIconUrl(campeao.id)}
        alt=""
        width={tamanho}
        height={tamanho}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span className={c("campeaoIcone", "campeaoIconeVazio")} title={campeao?.nome ?? semCampeao} aria-hidden="true">
      {campeao ? campeao.nome.slice(0, 2).toUpperCase() : "—"}
    </span>
  );
}

function LetraDoResultado({ t, resultado, c }: Readonly<{ t: PaginasHomeTextos; resultado: "vitoria" | "derrota"; c: ClassesDaPeca }>) {
  return (
    <>
      <span aria-hidden="true">{resultado === "vitoria" ? t.campanhaVitoriaCurta : t.campanhaDerrotaCurta}</span>
      <span className={c("somenteLeitor")}>{resultado === "vitoria" ? t.campanhaVitoria : t.campanhaDerrota}</span>
    </>
  );
}

/** "J2" à vista; "Jogo 2" para o leitor de tela. */
function RotuloDoJogo({ t, numero, c }: Readonly<{ t: PaginasHomeTextos; numero: number; c: ClassesDaPeca }>) {
  return (
    <>
      <span aria-hidden="true">{preencher(t.campanhaJogoCurto, { n: numero })}</span>
      <span className={c("somenteLeitor")}>{preencher(t.campanhaJogoLongo, { n: numero })}</span>
    </>
  );
}

function NumeroDoJogo({ t, numero, c }: Readonly<{ t: PaginasHomeTextos; numero: number; c: ClassesDaPeca }>) {
  return (
    <span className={c("jogoNumero")}>
      <RotuloDoJogo t={t} numero={numero} c={c} />
    </span>
  );
}

/** "19/1/8" à vista; por extenso para o leitor de tela (que lê as barras como data). */
function KdaDoJogo({
  t,
  c,
  abates,
  mortes,
  assistencias,
}: Readonly<{ t: PaginasHomeTextos; c: ClassesDaPeca; abates: number; mortes: number; assistencias: number }>) {
  return (
    <>
      <span aria-hidden="true">
        {abates}/{mortes}/{assistencias}
      </span>
      <span className={c("somenteLeitor")}>{preencher(t.campanhaKdaLeitor, { k: abates, d: mortes, a: assistencias })}</span>
    </>
  );
}

const CLASSE_DO_JOGO_SEM_KDA = { ausente: "jogoAusente", wo: "jogoWo", provisorio: "jogoProvisorio" } as const;

/**
 * Nome com uma palavra de 10+ letras (Mordekaiser, Heimerdinger, Fiddlesticks): o cenário de
 * coluna estreita (a figurinha do álbum) encolhe só esses, em vez de partir a palavra no meio.
 */
function nomeLongo(nome: string): boolean {
  return nome.split(/\s+/).some((palavra) => palavra.length >= 10);
}

function Jogo({
  jogo,
  t,
  c,
  localeTag,
  semCampeao,
}: Readonly<{ jogo: JogoDaCampanha; t: PaginasHomeTextos; c: ClassesDaPeca; localeTag: string; semCampeao: string }>) {
  if (jogo.tipo !== "jogou") {
    const nota = jogo.tipo === "wo" ? t.campanhaWo : jogo.tipo === "provisorio" ? t.campanhaProvisorio : t.campanhaNaoJogou;
    return (
      <li
        className={c("jogo", CLASSE_DO_JOGO_SEM_KDA[jogo.tipo])}
        data-tipo={jogo.tipo}
        data-resultado={jogo.resultado ?? undefined}
      >
        <NumeroDoJogo t={t} numero={jogo.numero} c={c} />
        <span className={c("jogoNota")}>{nota}</span>
        {jogo.resultado ? (
          <span className={c("jogoResultado")}>
            <LetraDoResultado t={t} resultado={jogo.resultado} c={c} />
          </span>
        ) : null}
      </li>
    );
  }
  return (
    <li className={c("jogo")} data-resultado={jogo.resultado} data-mvp={jogo.mvp ? "" : undefined}>
      <NumeroDoJogo t={t} numero={jogo.numero} c={c} />
      <span className={c("jogoCampeao")}>
        <IconeDoCampeao campeao={jogo.campeao} c={c} tamanho={32} semCampeao={semCampeao} />
        <span className={c("campeaoNome")} data-longo={nomeLongo(jogo.campeao?.nome ?? semCampeao) ? "" : undefined}>
          {jogo.campeao?.nome ?? semCampeao}
        </span>
      </span>
      <span className={c("jogoDetalhes")}>
        <span className={c("jogoKda")}>
          <KdaDoJogo t={t} c={c} abates={jogo.abates} mortes={jogo.mortes} assistencias={jogo.assistencias} />
        </span>
        <span className={c("jogoRazao")}>{preencher(t.campanhaKda, { kda: formatKda(jogo.kda, localeTag) })}</span>
        {jogo.mvp ? <span className={c("jogoMvp")}>{t.campanhaMvp}</span> : null}
        {jogo.duracaoMin ? <span className={c("jogoDuracao")}>{preencher(t.campanhaMinutos, { n: jogo.duracaoMin })}</span> : null}
      </span>
      <span className={c("jogoResultado")}>
        <LetraDoResultado t={t} resultado={jogo.resultado} c={c} />
      </span>
    </li>
  );
}

function Serie({
  serie,
  t,
  c,
  localeTag,
  semCampeao,
  formatos,
}: Readonly<{
  serie: SerieDaCampanha;
  t: PaginasHomeTextos;
  c: ClassesDaPeca;
  localeTag: string;
  semCampeao: string;
  formatos: Readonly<Record<string, string>>;
}>) {
  const data = partesDaDataDaSerie(serie.data, localeTag);
  return (
    <li className={c("serie")} data-resultado={serie.resultado}>
      <div className={c("serieCabeca")}>
        <span className={c("serieResultado")}>{rotuloDoResultado(t, serie.resultado)}</span>
        <span className={c("seriePlacar")}>
          <span aria-hidden="true">
            <span className={c("placarTime")}>{serie.placar.time}</span>
            <span className={c("placarSeparador")}>×</span>
            <span className={c("placarAdversario")}>{serie.placar.adversario}</span>
          </span>
          <span className={c("somenteLeitor")}>
            {preencher(t.campanhaPlacar, {
              time: serie.time.nome,
              a: serie.placar.time,
              b: serie.placar.adversario,
              adversario: serie.adversario.nome,
            })}
          </span>
        </span>
        <span className={c("serieAdversario")}>
          <span className={c("vs")}>{t.campanhaVs}</span>
          <Escudo time={serie.adversario} c={c} tamanho={26} />
          <span className={c("adversarioNome")}>{serie.adversario.nome}</span>
        </span>
        <span className={c("serieInfo")}>
          {data ? (
            <span className={c("serieData")}>
              {data.semana} · {data.dia}
            </span>
          ) : null}
          <span className={c("serieFase")}>
            {formatoLabel({ formatos }, serie.formato)}
            {serie.fase === "REGULAR_SEASON" ? "" : ` · ${rotuloDaFase(t, serie.fase)}`}
          </span>
          {serie.mvpDaSerie ? <span className={c("serieMvp")}>{t.campanhaMvpDaSerie}</span> : null}
          {serie.substituto ? (
            <span className={c("serieSubstituto")}>{preencher(t.campanhaSubstitutoEm, { time: serie.time.nome })}</span>
          ) : null}
        </span>
      </div>
      <ol className={c("jogos")}>
        {serie.jogos.map((jogo) => (
          <Jogo key={jogo.numero} jogo={jogo} t={t} c={c} localeTag={localeTag} semCampeao={semCampeao} />
        ))}
      </ol>
      <Link className={c("serieLink")} href={hrefDaPartida(serie.id)}>
        {t.campanhaVerPartida}
        {/* Na lista de links do leitor de tela, cada "VER PARTIDA" diz qual é. */}
        <span className={c("somenteLeitor")}>
          {" "}
          {t.campanhaVs} {serie.adversario.nome}
        </span>
      </Link>
    </li>
  );
}

/**
 * O aviso no lugar dos destaques de quem está sem números: nunca nega que ele entrou em quadra
 * (substituto que não pontua, jogo só com o resultado) nem promete números a quem saiu do time.
 */
function avisoSemNumeros(t: PaginasHomeTextos, campanha: CampanhaDoJogador, nick: string): string {
  if (campanha.series.length > 0) return preencher(t.campanhaSoProvisorio, { nick });
  if (campanha.jogosSemPontuar > 0) {
    return preencher(campanha.jogosSemPontuar === 1 ? t.campanhaSoSubstituto1 : t.campanhaSoSubstituto, {
      nick,
      n: campanha.jogosSemPontuar,
    });
  }
  if (campanha.saiu) return preencher(t.campanhaSaiuSemJogar, { nick });
  return preencher(t.campanhaSemJogos, { nick });
}

export function CampanhaDoJogador({
  campanha,
  t,
  localeTag,
  semCampeao,
  formatos = {},
  nick,
  idBase,
  c,
  tituloClasse,
  conteinerClasse,
  titulos,
  NaCampanha,
  padrao,
}: Props) {
  const { melhorJogo, recordeDeAbates, participacao, proximaSerie, tabela, rankingNaRota } = campanha;
  const semNumeros = campanha.jogos === 0;
  // Sem números e sem série nenhuma: o aviso e (se houver) o próximo desafio lado a lado.
  const vazia = semNumeros && campanha.series.length === 0;
  const temLado = Boolean(proximaSerie || tabela);
  const dataDaProxima = proximaSerie ? partesDaDataDaSerie(proximaSerie.data, localeTag) : null;
  const ultimos =
    campanha.forma.length === 1 ? t.campanhaFormaUltimo : preencher(t.campanhaFormaUltimos, { n: campanha.forma.length });
  const sequencia = campanha.sequencia
    ? campanha.sequencia.jogos === 1
      ? campanha.sequencia.resultado === "vitoria"
        ? t.campanhaSequenciaVitoria1
        : t.campanhaSequenciaDerrota1
      : preencher(campanha.sequencia.resultado === "vitoria" ? t.campanhaSequenciaVitorias : t.campanhaSequenciaDerrotas, {
          n: campanha.sequencia.jogos,
        })
    : null;

  return (
    <section
      className={cx(c("secao"), padrao && cm.padrao)}
      aria-labelledby={`${idBase}-titulo`}
      data-campanha=""
    >
      {NaCampanha ? <NaCampanha /> : null}
      <div className={cx(conteinerClasse, c("miolo"))}>
        <h2 id={`${idBase}-titulo`} className={tituloClasse}>
          {titulos.campanha}
        </h2>

        <div className={c("grade")} data-sem-jogos={vazia ? "" : undefined} data-sem-lado={temLado ? undefined : ""}>
          {!semNumeros ? (
            <ul className={c("destaques")} aria-label={t.campanhaDestaques}>
              {campanha.ranking.length > 0 ? (
                <li className={c("destaque", "destaqueRanking")}>
                  <span className={c("destaqueRotulo")}>{t.campanhaRanking}</span>
                  <ol className={c("ranking")}>
                    {campanha.ranking.map((r) => (
                      <li
                        key={r.metrica}
                        className={c("rankingLinha")}
                        data-metrica={r.metrica}
                        data-podio={r.posicao <= 3 && !(r.metrica === "mvps" && r.valor === 0) ? "" : undefined}
                      >
                        <span className={c("rankingPosicao")}>
                          {r.metrica === "mvps" && r.valor === 0 ? "—" : ordinal(r.posicao, localeTag)}
                        </span>
                        <span className={c("rankingMetrica")}>{rotuloDaMetrica(t, r.metrica)}</span>
                        <span className={c("rankingValor")}>{r.metrica === "kda" ? formatKda(r.valor, localeTag) : r.valor}</span>
                      </li>
                    ))}
                  </ol>
                  <span className={c("destaqueDetalhe")}>{preencher(t.campanhaRankingEntre, { n: campanha.totalNoRanking })}</span>
                  {rankingNaRota ? (
                    <span className={c("destaqueExtra")}>
                      {preencher(t.campanhaRankingRota, {
                        rota: rotaCurto(t, rankingNaRota.rota),
                        posicao: ordinal(rankingNaRota.posicao, localeTag),
                        n: rankingNaRota.total,
                      })}
                    </span>
                  ) : null}
                </li>
              ) : null}

              {melhorJogo ? (
                <li className={c("destaque", "destaqueMelhorJogo")} data-resultado={melhorJogo.resultado}>
                  <span className={c("destaqueRotulo")}>{t.campanhaMelhorJogo}</span>
                  <span className={c("melhorJogoCorpo")}>
                    <IconeDoCampeao campeao={melhorJogo.campeao} c={c} tamanho={52} semCampeao={semCampeao} />
                    <span className={c("melhorJogoTexto")}>
                      <span className={c("destaqueValor")}>
                        <KdaDoJogo
                          t={t}
                          c={c}
                          abates={melhorJogo.abates}
                          mortes={melhorJogo.mortes}
                          assistencias={melhorJogo.assistencias}
                        />
                      </span>
                      <span className={c("destaqueDetalhe")}>
                        {melhorJogo.campeao?.nome ?? semCampeao} · {preencher(t.campanhaKda, { kda: formatKda(melhorJogo.kda, localeTag) })}
                      </span>
                    </span>
                  </span>
                  <Link className={c("destaqueLink")} href={hrefDaPartida(melhorJogo.serieId)}>
                    {t.campanhaVs} {melhorJogo.adversario.nome} · <RotuloDoJogo t={t} numero={melhorJogo.numero} c={c} /> ·{" "}
                    {melhorJogo.resultado === "vitoria" ? t.campanhaVitoria : t.campanhaDerrota} →
                  </Link>
                  {recordeDeAbates ? (
                    <span className={c("destaqueExtra")}>
                      {preencher(t.campanhaRecordeAbates, { n: recordeDeAbates.abates })} ·{" "}
                      {recordeDeAbates.campeao?.nome ?? semCampeao} · {t.campanhaVs} {recordeDeAbates.adversario.nome}
                    </span>
                  ) : null}
                </li>
              ) : null}

              {participacao !== null ? (
                <li className={c("destaque", "destaqueParticipacao")}>
                  <span className={c("destaqueRotulo")}>{t.campanhaParticipacao}</span>
                  <span className={c("destaqueValor")}>{participacao}%</span>
                  <span className={c("medidor")} aria-hidden="true">
                    <span className={c("medidorBarra")} style={{ "--pct": `${participacao}%` } as CSSProperties} />
                  </span>
                  <span className={c("destaqueDetalhe")}>{preencher(t.campanhaParticipacaoDetalhe, { nick })}</span>
                </li>
              ) : null}

              {campanha.forma.length > 0 ? (
                <li className={c("destaque", "destaqueForma")}>
                  <span className={c("destaqueRotulo")}>{t.campanhaForma}</span>
                  <ol className={c("forma")}>
                    {campanha.forma.map((resultado, i) => (
                      <li key={i} className={c("formaJogo")} data-resultado={resultado}>
                        <LetraDoResultado t={t} resultado={resultado} c={c} />
                      </li>
                    ))}
                  </ol>
                  <span className={c("destaqueDetalhe")}>{ultimos}</span>
                  {sequencia ? <span className={c("destaqueExtra")}>{sequencia}</span> : null}
                </li>
              ) : null}
            </ul>
          ) : (
            <p className={c("vazio")}>{avisoSemNumeros(t, campanha, nick)}</p>
          )}

          {temLado ? (
            // Um bloco com título (h3), não um <aside>: dentro da região da seção, o complementary
            // aninhado é a violação "landmark-complementary-is-top-level" do axe.
            <div className={c("proximo")}>
              <h3 id={`${idBase}-proximo`} className={c("subtitulo")}>
                {proximaSerie ? titulos.proximo : t.campanhaNaTabela}
              </h3>
              {proximaSerie ? (
                <Link
                  className={c("proximoCartao")}
                  href={hrefDaPartida(proximaSerie.id)}
                  data-em-andamento={proximaSerie.emAndamento ? "" : undefined}
                >
                  {dataDaProxima ? (
                    <span className={c("proximoData")}>
                      <span className={c("proximoSemana")}>{dataDaProxima.semana}</span>
                      <span className={c("proximoDia")}>{dataDaProxima.dia}</span>
                      {dataDaProxima.hora ? <span className={c("proximoHora")}>{dataDaProxima.hora}</span> : null}
                    </span>
                  ) : null}
                  <span className={c("proximoConfronto")}>
                    <span className={c("vs")}>{t.campanhaVs}</span>
                    <Escudo time={proximaSerie.adversario} c={c} tamanho={40} />
                    <span className={c("proximoAdversario")}>{proximaSerie.adversario.nome}</span>
                  </span>
                  <span className={c("proximoInfo")}>
                    {proximaSerie.emAndamento
                      ? preencher(t.campanhaAoVivo, { a: proximaSerie.placar.time, b: proximaSerie.placar.adversario })
                      : `${formatoLabel({ formatos }, proximaSerie.formato)} · ${rotuloDaFase(t, proximaSerie.fase)}`}
                  </span>
                  <span className={c("proximoVer")}>{t.campanhaVerPartida}</span>
                </Link>
              ) : null}
              {tabela ? (
                <p className={c("tabela")}>
                  <span className={c("tabelaPosicao")}>
                    {preencher(t.campanhaTabela, { posicao: ordinal(tabela.posicao, localeTag) })}
                  </span>
                  <span className={c("tabelaCampanha")}>
                    {preencher(t.campanhaTabelaCampanha, { v: tabela.vitorias, d: tabela.derrotas, pts: tabela.pontos })}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}

          {campanha.series.length > 0 ? (
            <div className={c("resultados")}>
              <h3 id={`${idBase}-resultados`} className={c("subtitulo")}>
                {titulos.resultados}
              </h3>
              <ol className={c("series")} aria-labelledby={`${idBase}-resultados`}>
                {campanha.series.map((serie) => (
                  <Serie
                    key={serie.id}
                    serie={serie}
                    t={t}
                    c={c}
                    localeTag={localeTag}
                    semCampeao={semCampeao}
                    formatos={formatos}
                  />
                ))}
              </ol>
            </div>
          ) : null}

          {campanha.campeoes.length > 0 ? (
            <div className={c("campeoesBloco")}>
              <h3 id={`${idBase}-campeoes`} className={c("subtitulo")}>
                {titulos.campeoes}
              </h3>
              <ul className={c("campeoes")} aria-labelledby={`${idBase}-campeoes`}>
                {campanha.campeoes.map((campeao) => (
                  <li key={campeao.id ?? campeao.nome} className={c("campeao")}>
                    <IconeDoCampeao campeao={campeao} c={c} tamanho={40} semCampeao={semCampeao} />
                    <span className={c("campeaoTexto")}>
                      <span className={c("campeaoNome")}>{campeao.nome}</span>
                      <span className={c("campeaoNumeros")}>
                        {campeao.jogos === 1 ? t.campanhaJogo : preencher(t.campanhaJogos, { n: campeao.jogos })} ·{" "}
                        {preencher(t.campanhaVd, { v: campeao.vitorias, d: campeao.derrotas })} ·{" "}
                        {preencher(t.campanhaKda, { kda: formatKda(campeao.kda, localeTag) })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
