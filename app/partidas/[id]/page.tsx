import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { caminhoNoArquivo } from "@/lib/arquivo";

import { ChampionIcon } from "@/components/champion-icon";
import { textosElenco, type TextosElenco } from "@/components/lob/textos-elenco";
import { SeriesLiveDraw } from "@/components/series-live-draw";
import { EscudoDoShow, type TimeDoShow } from "@/components/series/escudo-do-show";
import type { TextoDaCarta } from "@/components/series/palco-das-cartas";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import { formatKda, formatSeriesDateLabel, partesDaDataDaSerie } from "@/lib/format";
import type { Messages } from "@/lib/i18n/messages";
import { metadadosDaPagina, montarMetadados } from "@/lib/i18n/metadados";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { coresDoConfronto } from "@/lib/series/cores-do-confronto";
import { identidadeDoTime } from "@/lib/series/identidade-do-time";
import { registrosDasCartasPorTime } from "@/lib/series/procedencia-das-cartas";
import { getServerDataset } from "@/lib/server-data";
import {
  getGameTeamKills,
  getSeriesById,
  getSeriesFormatLabel,
  getSeriesGamesWithTeamRows,
  getSeriesMvp,
  getSeriesScore,
  getSeriesTeamKillTotals,
  getSeriesWinnerTeamId,
  isWalkoverSeries,
  jogosDeWalkoverDaSerie,
  mvpDoJogo,
} from "@/lib/tournament";
import type { Player, Team } from "@/lib/schema";

import p from "@/components/partida/partida.module.css";

export const dynamic = "force-dynamic";

/** Textos desta página no idioma da requisição. */
type Textos = Messages["paginasCompeticao"];

type PartidaDetalhePageParams = Readonly<{
  params: Promise<{ id: string }>;
}>;
type GameTeamBlock = Readonly<{
  time: TimeDoShow;
  rows: ReturnType<typeof getSeriesGamesWithTeamRows>[number]["teamARows"];
}>;

/** Rótulo da fase no idioma da requisição (o helper do lib devolve só em português). */
function stageLabelTraduzido(stage: string | undefined, textos: Textos) {
  const atual = stage ?? "REGULAR_SEASON";
  if (atual === "SEMIFINAL") return textos.faseSemifinal;
  if (atual === "FINAL") return textos.faseFinal;
  return textos.faseRegular;
}

/** MD3/MD5 vindos do lib viram Bo3/Bo5 em inglês. */
function formatLabelTraduzido(formatLabel: string, textos: Textos) {
  return formatLabel === "MD5" ? textos.formatoBo5 : textos.formatoBo3;
}

function getEmptyGamesText(isWalkover: boolean, walkoverReason: string | undefined, textos: Textos) {
  if (!isWalkover) return textos.detalheSemJogos;
  const reasonText = walkoverReason ? ` ${walkoverReason}` : "";
  return `${textos.detalheEncerradaWo}${reasonText}`;
}

/**
 * O time com a cara do tema dele (cor, metal, fonte, escudo) para o cartaz e para o show do
 * sorteio. A fonte do tema vira classe do next/font AQUI, no servidor: o componente do cliente
 * só recebe a string da classe.
 */
function timesDoShow(
  teamA: Team | null,
  teamB: Team | null,
  idA: string,
  idB: string,
): [TimeDoShow, TimeDoShow] {
  const a = identidadeDoTime(teamA, idA);
  const b = identidadeDoTime(teamB, idB);
  // O par de cores de palco que mais contrasta (RX e Galácticos são os dois azuis).
  const [palcoA, palcoB] = coresDoConfronto(a.candidatasDePalco, b.candidatasDePalco);
  const fonte = (chave: typeof a.fonteTitulo) => (chave ? FONTES_DOS_TEMAS[chave].variable : null);
  return [
    { ...a, fonteClasse: fonte(a.fonteTitulo), corDePalco: palcoA },
    { ...b, fonteClasse: fonte(b.fonteTitulo), corDePalco: palcoB },
  ];
}

/** As variáveis do time para o CSS do cartaz (aura, metal do nome, cor do link). */
function varsDoCartaz(time: TimeDoShow): CSSProperties {
  return {
    "--neon": time.neon,
    "--cor": time.cor,
    "--metal": time.metal,
    "--metal-solido": time.metalSolido,
    "--brilho-nome": `${time.neon}55`,
    "--peso-nome": time.pesoTitulo,
    "--estilo-nome": time.estiloTitulo,
  } as CSSProperties;
}

/** Brasas do cartaz: posições fixas (o render do servidor é puro; nada de Math.random aqui). */
const BRASAS = [
  { x: 6, dur: 7.2, atraso: 0, deriva: 18, lado: "a" },
  { x: 13, dur: 8.6, atraso: 2.1, deriva: -14, lado: "a" },
  { x: 21, dur: 6.4, atraso: 4.3, deriva: 22, lado: "a" },
  { x: 29, dur: 9.1, atraso: 1.2, deriva: -20, lado: "a" },
  { x: 36, dur: 7.8, atraso: 5.6, deriva: 12, lado: "a" },
  { x: 43, dur: 8.2, atraso: 3.4, deriva: -10, lado: "a" },
  { x: 57, dur: 7.4, atraso: 0.8, deriva: 14, lado: "b" },
  { x: 64, dur: 8.9, atraso: 2.9, deriva: -18, lado: "b" },
  { x: 71, dur: 6.8, atraso: 4.9, deriva: 20, lado: "b" },
  { x: 79, dur: 9.4, atraso: 1.7, deriva: -12, lado: "b" },
  { x: 87, dur: 7.6, atraso: 6.1, deriva: 16, lado: "b" },
  { x: 94, dur: 8.4, atraso: 3.8, deriva: -22, lado: "b" },
] as const;

function LadoDoCartaz({
  time,
  lado,
  href,
  textos,
  ladoNoJogo1,
}: Readonly<{
  time: TimeDoShow;
  lado: "A" | "B";
  href: string | null;
  textos: Textos;
  ladoNoJogo1: "azul" | "vermelho" | null;
}>) {
  const conteudo = (
    <>
      <span className={p.escudoGrande}>
        <span aria-hidden className={p.enfHalo} />
        <span aria-hidden className={p.enfAnel} />
        {time.escudo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={time.escudo} alt="" />
        ) : (
          <span aria-hidden className={p.sigla}>
            {time.sigla}
          </span>
        )}
      </span>
      <span className={`${time.fonteClasse ?? ""} ${p.nomeGrande}`}>
        {time.assinatura && time.nome.toUpperCase().startsWith(time.assinatura.toUpperCase()) ? (
          <>
            <span className={p.assinatura}>{time.assinatura}</span> {time.marca}
          </>
        ) : time.assinatura ? (
          <>
            {time.marca} <span className={p.assinatura}>{time.assinatura}</span>
          </>
        ) : (
          time.nome
        )}
      </span>
      {ladoNoJogo1 ? (
        <span className={`${p.bandeiraDoLado} ${ladoNoJogo1 === "azul" ? p.bandeiraAzul : p.bandeiraVermelha}`}>
          {ladoNoJogo1 === "azul" ? textos.detalheLadoAzulJ1 : textos.detalheLadoVermelhoJ1}
        </span>
      ) : null}
      {href ? <span className={p.verTime}>{textos.detalheVerTimeSeta}</span> : null}
    </>
  );

  const classe = `${p.time} ${lado === "A" ? p.timeA : p.timeB}`;
  return href ? (
    <Link href={href} className={classe} style={varsDoCartaz(time)}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe} style={varsDoCartaz(time)}>
      {conteudo}
    </div>
  );
}

function GameDetailsCard({
  seriesId,
  gameIndex,
  vencedor,
  durationMin,
  gameMvpNick,
  kills,
  timeA,
  timeB,
  blocks,
  playersById,
  textos,
  te,
  localeTag,
}: Readonly<{
  seriesId: string;
  gameIndex: number;
  vencedor: TimeDoShow | null;
  durationMin: number | undefined;
  gameMvpNick: string | null;
  kills: ReturnType<typeof getGameTeamKills>;
  timeA: TimeDoShow;
  timeB: TimeDoShow;
  blocks: readonly [GameTeamBlock, GameTeamBlock];
  playersById: Map<string, Player>;
  textos: Textos;
  /** Marca do substituto avulso (regra 6). */
  te: TextosElenco;
  /** Idioma para os números: sem ele o KDA saía com vírgula decimal no site em inglês. */
  localeTag: string;
}>) {
  return (
    <article className={p.jogo} style={{ "--vencedor": vencedor?.cor ?? "#c98a4b" } as CSSProperties}>
      <div className={p.jogoCabecalho}>
        <div className={p.jogoTitulos}>
          <p className={p.jogoTitulo}>
            {textos.detalheJogo} {gameIndex}
          </p>
          <p className={p.jogoDados}>
            {textos.detalheVencedor} <strong>{vencedor?.nome ?? textos.vazio}</strong> • {textos.detalheMvp}{" "}
            <strong>{gameMvpNick ?? textos.vazio}</strong>
            {typeof durationMin === "number" ? (
              <>
                {" "}
                • {textos.detalheDuracao}{" "}
                <strong>
                  {durationMin} {textos.detalheMinutos}
                </strong>
              </>
            ) : null}
          </p>
        </div>
        <div className={p.abates} aria-label={`${timeA.nome} ${kills.teamAKills} × ${kills.teamBKills} ${timeB.nome}`}>
          <span className={p.abatesNome} title={timeA.nome}>
            {timeA.nome}
          </span>
          <span className={p.abatesNumero} style={{ color: timeA.cor }}>
            {kills.teamAKills}
          </span>
          <span className={p.vazio}>×</span>
          <span className={p.abatesNumero} style={{ color: timeB.cor }}>
            {kills.teamBKills}
          </span>
          <span className={p.abatesNome} title={timeB.nome}>
            {timeB.nome}
          </span>
        </div>
      </div>

      <div className={p.blocos}>
        {blocks.map((block) => (
          <div
            key={`${seriesId}-${gameIndex}-${block.time.id}`}
            className={p.bloco}
            data-bloco-do-time={block.time.id}
            style={{ "--cor": block.time.cor } as CSSProperties}
          >
            <p className={p.blocoCabecalho}>
              <EscudoDoShow time={block.time} className={p.blocoEscudo} />
              {block.time.nome}
            </p>
            <table className={p.tabela}>
              <thead>
                <tr>
                  <th>{textos.detalheColJogador}</th>
                  <th>{textos.detalheColCampeao}</th>
                  <th>{textos.detalheColKda}</th>
                  <th className={p.direita}>{textos.detalheColKdaMedia}</th>
                </tr>
              </thead>
              <tbody>
                {block.rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className={p.vazio}>
                      {textos.detalheSemEstatisticas}
                    </td>
                  </tr>
                ) : (
                  block.rows.map((row) => (
                    <tr key={`${gameIndex}-${row.playerId}`}>
                      <td>
                        <Link href={`/jogadores/${playersById.get(row.playerId)?.slug ?? row.playerId}`} className={p.nick}>
                          {row.playerNick}
                        </Link>
                        {/* Substituto avulso: aparece na coluna do time que cobriu, marcado. */}
                        {row.substituto ? (
                          <span className={p.sub} title={te.substitutoTitulo}>
                            {te.substitutoCurto}
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <ChampionIcon champion={row.champion} size={24} showName />
                      </td>
                      <td>
                        <span className={p.kda}>
                          <span className={p.k}>{row.kills}</span>/<span className={p.d}>{row.deaths}</span>/
                          <span className={p.a}>{row.assists}</span>
                        </span>
                      </td>
                      <td className={p.direita}>
                        <span className={p.kdaMedia}>
                          {formatKda((row.kills + row.assists) / Math.max(1, row.deaths), localeTag)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </article>
  );
}

/**
 * Um jogo de W.O. (W.O. no meio da série: "jogos valem, W.O. completa"). Não foi disputado:
 * conta no placar, mas não tem K/D/A, MVP nem duração.
 */
function WalkoverGameCard({
  gameIndex,
  winnerName,
  walkoverReason,
  rotuloWalkover,
  textos,
  te,
}: Readonly<{
  gameIndex: number;
  winnerName: string;
  walkoverReason: string | undefined;
  rotuloWalkover: string;
  textos: Textos;
  te: TextosElenco;
}>) {
  return (
    <article className={`${p.jogo} ${p.jogoWo}`}>
      <p className={p.jogoTitulo}>
        {textos.detalheJogo} {gameIndex}
        <span className={p.seloWo}>{rotuloWalkover}</span>
      </p>
      <p className={p.jogoDados}>
        {textos.detalheVencedorWo} <strong>{winnerName}</strong>
      </p>
      <p className={p.jogoDados}>
        {te.jogoDeWalkoverTexto}
        {walkoverReason ? ` ${walkoverReason}` : ""}
      </p>
    </article>
  );
}

/** Os dois times na aba e na prévia do link; sem a série (ou com o banco fora), o da seção. */
export async function generateMetadata({ params }: PartidaDetalhePageParams): Promise<Metadata> {
  const { id } = await params;
  try {
    const [{ metadados, compartilhados }, { dataset, indexes }] = await Promise.all([getMessages(), getServerDataset()]);
    const series = getSeriesById(dataset, id);
    if (series) {
      return montarMetadados(metadados.serie, {
        valores: {
          timeA: indexes.teamsById.get(series.teamAId)?.name ?? series.teamAId,
          timeB: indexes.teamsById.get(series.teamBId)?.name ?? series.teamBId,
          temporada: nomeDaTemporada(dataset.tournament.name, compartilhados.localeTag),
        },
        caminho: `/partidas/${encodeURIComponent(series.id)}`,
      });
    }
  } catch {
    // Banco fora: quem decide o que mostrar é a página (e a app/error.tsx).
  }
  return metadadosDaPagina("partidas");
}

/**
 * A PÁGINA DA PARTIDA — pensada para a transmissão.
 *
 * Em cima, o CARTAZ "versus": cada time com o escudo, a fonte e o metal do tema dele (o mesmo da
 * página do time), o placar (ou o VS antes do jogo), formato, data no horário de Brasília e o
 * estado da série. Embaixo, a ARENA DO SORTEIO (lados do jogo 1 e cartinhas, com o show em tela
 * cheia para a organização), o resumo da série e os jogos.
 *
 * O título canônico ("EQUIPE RX 0–0 GALÁCTICOS DO BAR") é o <h1>, para leitor de tela e busca;
 * o cartaz o mostra em pedaços (nome, placar, nome), por isso o placar visual é aria-hidden.
 */
export default async function PartidaDetalhePage({ params }: PartidaDetalhePageParams) {
  const { id } = await params;
  const t = await getMessages();
  const textos = t.paginasCompeticao;
  const te = textosElenco[await getLocale()];
  const { dataset, indexes } = await getServerDataset();
  const series = getSeriesById(dataset, id);

  if (!series) {
    // Link antigo de uma série que saiu do ar (ex.: a final, compartilhada no grupo): manda
    // para a cópia arquivada, em vez de 404.
    const arquivado = caminhoNoArquivo(dataset.archivedSeasons, { tipo: "serie", id });
    if (arquivado) redirect(arquivado);
    notFound();
  }

  const localeTag = t.compartilhados.localeTag;
  const teamA = indexes.teamsById.get(series.teamAId) ?? null;
  const teamB = indexes.teamsById.get(series.teamBId) ?? null;
  const [timeA, timeB] = timesDoShow(teamA, teamB, series.teamAId, series.teamBId);
  const timePorId = (teamId: string) => (teamId === timeA.id ? timeA : teamId === timeB.id ? timeB : null);

  const score = getSeriesScore(series, dataset);
  const winnerTeamId = getSeriesWinnerTeamId(series, dataset);
  const vencedor = winnerTeamId ? timePorId(winnerTeamId) : null;
  const isWalkover = isWalkoverSeries(series);
  const seriesMvp = getSeriesMvp(series, dataset);
  const seriesMvpNick = seriesMvp ? indexes.playersById.get(seriesMvp.playerId)?.nick ?? seriesMvp.playerId : null;
  const seriesKillTotals = getSeriesTeamKillTotals(series, dataset);
  const gameRows = getSeriesGamesWithTeamRows(series, dataset);
  // W.O. no meio da série: os jogos que o W.O. completou, depois dos disputados. Sem jogo
  // disputado nenhum, a página continua como sempre (o cartão "encerrada por W.O.").
  const walkoverGames = gameRows.length > 0 ? jogosDeWalkoverDaSerie(series, dataset) : [];
  const isGrandFinal = (series.stage ?? "REGULAR_SEASON") === "FINAL";
  const stageLabel = stageLabelTraduzido(series.stage, textos);
  const seriesFormatLabel = formatLabelTraduzido(getSeriesFormatLabel(series, dataset), textos);
  const title = `${teamA?.name ?? series.teamAId} ${score.teamAWins}–${score.teamBWins} ${teamB?.name ?? series.teamBId}`;
  const aindaNaoComecou = gameRows.length === 0 && !isWalkover && !winnerTeamId;
  const preJogo = gameRows.length === 0 && !isWalkover;
  const data = partesDaDataDaSerie(series.date, localeTag);

  const statusTexto = isWalkover
    ? textos.detalheStatusWo
    : winnerTeamId
      ? textos.detalheStatusFinalizada
      : gameRows.length > 0
        ? textos.detalheStatusEmAndamento
        : textos.detalheStatusEmBreve;
  const statusClasse = isWalkover
    ? p.statusWo
    : winnerTeamId
      ? p.statusFinalizada
      : gameRows.length > 0
        ? p.statusAndamento
        : "";

  const azulId = series.blueSideTeamId ?? null;
  const ladoNoJogo1 = (teamId: string) => (!azulId ? null : azulId === teamId ? "azul" : "vermelho");

  const killsA = seriesKillTotals[series.teamAId] ?? 0;
  const killsB = seriesKillTotals[series.teamBId] ?? 0;
  const totalKills = killsA + killsB;

  const textosDasCartas = t.paginasStats.cartas as Record<string, TextoDaCarta>;

  // As três seções do miolo (a ordem muda com o estado da série, ver o comentário no JSX).
  const arena = (
    <SeriesLiveDraw
      key="arena"
      seriesId={series.id}
      teamA={teamA ? { id: teamA.id, name: teamA.name, slug: teamA.slug, imageUrl: teamA.imageUrl ?? null, fonteClasse: timeA.fonteClasse } : null}
      teamB={teamB ? { id: teamB.id, name: teamB.name, slug: teamB.slug, imageUrl: teamB.imageUrl ?? null, fonteClasse: timeB.fonteClasse } : null}
      initialCards={series.cardsUsed ?? []}
      initialBlueSideTeamId={series.blueSideTeamId ?? null}
      initialSorteiosDasCartas={registrosDasCartasPorTime(series)}
      initialUltimoLados={
        [...(series.sorteios ?? [])].reverse().find((s) => s.tipo === "lados" || s.tipo === "lados_manual") ?? null
      }
      textos={t.compartilhados}
      nomesCartas={Object.fromEntries(Object.entries(t.paginasStats.cartas).map(([cardId, carta]) => [cardId, carta.nome]))}
      textosDasCartas={textosDasCartas}
      ladosTravados={series.games.length > 0}
      decididaPorWo={isWalkover}
    />
  );
  const resumo = (
    <section key="resumo" className={`${p.resumo} ${preJogo ? p.resumoSoLinks : ""}`} data-fora-do-palco>
      {preJogo ? null : (
        <div className={p.cartao}>
          <p className={p.rotulo}>{textos.detalheAbatesPorTime}</p>
          <div className={p.cabo}>
            <span className={p.caboLado}>
              <EscudoDoShow time={timeA} className={p.caboEscudo} />
              <span className={p.caboNumero} style={{ color: timeA.corDePalco }}>
                {killsA}
              </span>
            </span>
            <span className={p.caboBarra} aria-hidden>
              <span style={{ width: totalKills ? `${(killsA / totalKills) * 100}%` : "50%", background: timeA.corDePalco }} />
              <span style={{ width: totalKills ? `${(killsB / totalKills) * 100}%` : "50%", background: timeB.corDePalco }} />
            </span>
            <span className={p.caboLado}>
              <span className={p.caboNumero} style={{ color: timeB.corDePalco }}>
                {killsB}
              </span>
              <EscudoDoShow time={timeB} className={p.caboEscudo} />
            </span>
          </div>
          <div className={p.caboNomes}>
            <span>{timeA.nome}</span>
            <span>{timeB.nome}</span>
          </div>
        </div>
      )}

      <nav className={`${p.cartao} ${p.links}`} aria-label={textos.detalheLinksRapidos}>
        <p className={p.rotulo}>{textos.detalheLinksRapidos}</p>
        {teamA ? (
          <Link href={`/times/${teamA.slug}`} className={p.link}>
            <EscudoDoShow time={timeA} className={p.linkEscudo} />
            {textos.detalheVerTime} {teamA.name}
          </Link>
        ) : null}
        {teamB ? (
          <Link href={`/times/${teamB.slug}`} className={p.link}>
            <EscudoDoShow time={timeB} className={p.linkEscudo} />
            {textos.detalheVerTime} {teamB.name}
          </Link>
        ) : null}
        <Link href="/partidas" className={p.link}>
          {textos.detalheTodasAsPartidas}
        </Link>
      </nav>
    </section>
  );
  const jogos = (
    <section key="jogos" className={p.jogos} data-fora-do-palco>
      <h2 className={p.jogosTitulo}>{textos.detalheJogosTitulo}</h2>
      {gameRows.length === 0 ? (
        <p className={p.semJogos}>{getEmptyGamesText(isWalkover, series.walkoverReason, textos)}</p>
      ) : (
        gameRows.map(({ game, gameIndex, teamARows, teamBRows }) => {
          const gameMvpPlayerId = mvpDoJogo(game, series, indexes.playersById);
          const gameMvpNick = indexes.playersById.get(gameMvpPlayerId)?.nick ?? gameMvpPlayerId;
          const kills = getGameTeamKills(game, series, dataset);
          const vencedorDoJogo =
            timePorId(game.winnerTeamId) ?? { ...timeA, id: game.winnerTeamId, nome: indexes.teamsById.get(game.winnerTeamId)?.name ?? game.winnerTeamId };

          return (
            <GameDetailsCard
              key={`${series.id}-g${gameIndex}`}
              seriesId={series.id}
              gameIndex={gameIndex}
              localeTag={localeTag}
              vencedor={vencedorDoJogo}
              durationMin={game.durationMin}
              gameMvpNick={gameMvpNick}
              kills={kills}
              timeA={timeA}
              timeB={timeB}
              blocks={[
                { time: timeA, rows: teamARows },
                { time: timeB, rows: teamBRows },
              ]}
              playersById={indexes.playersById}
              textos={textos}
              te={te}
            />
          );
        })
      )}
      {walkoverGames.map((jogo) => (
        <WalkoverGameCard
          key={`${series.id}-wo${jogo.gameIndex}`}
          gameIndex={jogo.gameIndex}
          winnerName={indexes.teamsById.get(jogo.winnerTeamId)?.name ?? jogo.winnerTeamId}
          walkoverReason={series.walkoverReason}
          rotuloWalkover={t.compartilhados.serieWalkover}
          textos={textos}
          te={te}
        />
      ))}
    </section>
  );

  return (
    <div className={p.pagina}>
      {/* ------------------------------------------------------------ o cartaz */}
      <section
        className={p.cartaz}
        style={
          {
            "--a-neon": timeA.neon,
            "--b-neon": timeB.neon,
            "--a-abismo": timeA.abismo,
            "--b-abismo": timeB.abismo,
          } as CSSProperties
        }
      >
        <span aria-hidden className={p.enfCeu} />
        <span aria-hidden className={p.enfGrade} />
        <span aria-hidden className={p.enfChao} />
        <span aria-hidden className={p.enfCostura} />
        <span aria-hidden className={p.enfBrasas}>
          {BRASAS.map((b) => (
            <span
              key={b.x}
              className={p.enfBrasa}
              style={
                {
                  left: `${b.x}%`,
                  "--dur": `${b.dur}s`,
                  "--atraso": `${b.atraso}s`,
                  "--deriva": `${b.deriva}px`,
                  "--cor": b.lado === "a" ? timeA.neon : timeB.neon,
                } as CSSProperties
              }
            />
          ))}
        </span>
        <span aria-hidden className={p.enfVinheta} />

        <h1 className="sr-only">{title}</h1>

        <div className={p.versus}>
          <LadoDoCartaz
            time={timeA}
            lado="A"
            href={teamA ? `/times/${teamA.slug}` : null}
            textos={textos}
            ladoNoJogo1={ladoNoJogo1(timeA.id)}
          />

          {/* O centro em duas peças: no celular a de cima (fase + VS/placar) fica entre os escudos e a
              de baixo (formato, data, estado) desce para uma linha inteira — senão a coluna do meio
              espremia os nomes até virarem uma letra por linha. */}
          <div className={p.centroTopo}>
            <p className={`${p.fase} ${isGrandFinal ? p.faseFinal : ""}`}>
              {isGrandFinal ? textos.detalheBadgeGrandeFinal : stageLabel}
            </p>
            <p className={p.placar} aria-hidden>
              {aindaNaoComecou ? textos.detalheVs : `${score.teamAWins}–${score.teamBWins}`}
            </p>
          </div>

          <div className={p.centroInfo}>
            <span className={p.formato}>{seriesFormatLabel}</span>
            {data ? (
              <p className={p.data}>
                <span className={p.dataDia}>
                  {data.semana} · {data.dia}
                  {data.hora ? (
                    <>
                      {" · "}
                      <span className={p.dataHora}>{data.hora}</span>
                    </>
                  ) : null}
                </span>
                <span className={p.fuso}>{textos.detalheHorarioBrasilia}</span>
              </p>
            ) : null}
            <span className={`${p.status} ${statusClasse}`}>{statusTexto}</span>
            {seriesMvpNick && !isWalkover ? (
              <p className={p.mvp}>
                {textos.detalheMvpSerie} {seriesMvpNick}
              </p>
            ) : null}
            <p className={p.serieId}>
              {textos.detalheSerieRotulo} {series.id}
            </p>
          </div>

          <LadoDoCartaz
            time={timeB}
            lado="B"
            href={teamB ? `/times/${teamB.slug}` : null}
            textos={textos}
            ladoNoJogo1={ladoNoJogo1(timeB.id)}
          />
        </div>
      </section>

      <div className={p.miolo}>
        {/* ------------------------------------------------------------ campeão (grande final) */}
        {isGrandFinal && vencedor && winnerTeamId ? (
          <section className={p.campeao} style={varsDoCartaz(vencedor)}>
            <span aria-hidden className={p.enfRaiosCampeao} />
            <span className={p.campeaoEscudo}>
              {vencedor.escudo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vencedor.escudo} alt="" />
              ) : null}
            </span>
            <div className={p.campeaoTexto}>
              <p className={p.campeaoOlho}>
                {textos.detalheCampeaoBadge} · {textos.detalheTituloConfirmado}
              </p>
              <h2 className={`${vencedor.fonteClasse ?? ""} ${p.campeaoNome}`}>{vencedor.nome}</h2>
              <p className={p.campeaoResumo}>
                {textos.detalheFechouFinalAntes}
                {winnerTeamId === series.teamAId ? `${score.teamAWins}-${score.teamBWins}` : `${score.teamBWins}-${score.teamAWins}`}.
                {isWalkover ? ` ${textos.detalheResultadoWo}` : seriesMvpNick ? ` ${textos.detalheMvpFinal} ${seriesMvpNick}.` : ""}
              </p>
            </div>
            <div className={p.campeaoPlacar}>
              <p className={p.rotulo}>{textos.detalhePlacarFinal}</p>
              <p className={p.campeaoPlacarNumero}>
                {winnerTeamId === series.teamAId ? `${score.teamAWins}–${score.teamBWins}` : `${score.teamBWins}–${score.teamAWins}`}
              </p>
              <Link href={`/times/${(winnerTeamId === series.teamAId ? teamA : teamB)?.slug ?? ""}`} className={p.campeaoLink}>
                {textos.detalheVerTimeCampeao}
              </Link>
              <p className={p.fuso}>{formatSeriesDateLabel(series.date, localeTag)}</p>
            </div>
          </section>
        ) : null}

        {/*
          A ORDEM depende da série. Antes do jogo, o que importa é o sorteio: a arena vem logo
          depois do cartaz. Com jogo (ou W.O.), o resumo e os jogos sobem, e a arena — agora o
          registro dos sorteios da série — desce para o fim.
        */}
        {/* Lista com `key`: a troca de ordem (o 1º jogo registrado) MOVE a arena em vez de
            remontá-la — remontar zerava o modo transmissão e a cerimônia no ar. */}
        {preJogo ? [arena, jogos, resumo] : [resumo, jogos, arena]}
      </div>
    </div>
  );
}
