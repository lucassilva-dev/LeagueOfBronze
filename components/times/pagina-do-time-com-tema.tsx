import Link from "next/link";
import { Fragment, type CSSProperties } from "react";

import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { CENARIOS } from "@/components/times/cenarios";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import { Palco } from "@/components/times/palco";
import s from "@/components/times/tema.module.css";
import { comCenario, cx, type ClassesDaPeca } from "@/components/times/util";
import { rotaCurto, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type { getOpGgMultiSearchUrlFromNicks } from "@/lib/opgg";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { METRICAS, maiorPalavraEm } from "@/lib/temas/metricas";
import { partesDoNome, textoDoTema, varsDoTema } from "@/lib/temas/registro";
import type { PapelDoTexto, TemaDoTime } from "@/lib/temas/tipos";

/**
 * A página do time com o TEMA dele (lib/temas). A estrutura é a mesma para todos; o cenário do
 * tema (components/times/cenarios) dá o fundo, a moldura, o que fica em volta do escudo, a
 * insígnia do capitão — e restiliza as peças pelos ganchos (`c("peca")`, ver cenarios/tipos.ts).
 *
 * A REGRA que manda em tudo aqui: animação não decide se o conteúdo aparece (já apagou o site
 * quatro vezes — ver tests/draft/animacoes-sem-opacidade.test.ts). O quadro 0 já é o pôster
 * inteiro e legível: o conteúdo só se MEXE (transform), sem delay nem fill-mode, com a espera
 * dentro do keyframe. O que pisca, acende ou some é ENFEITE: classe `enf…`, aria-hidden, sem
 * texto, nunca por cima do conteúdo no quadro 0 (o teste tests/times confere as duas coisas).
 *
 * Server Component, sem JavaScript no navegador: tudo é CSS e SVG.
 */

type Props = Readonly<{
  team: DesignTeam;
  tema: TemaDoTime;
  t: PaginasHomeTextos;
  elos?: Record<string, string>;
  multiOpGg: ReturnType<typeof getOpGgMultiSearchUrlFromNicks>;
  /** "4ª EDIÇÃO" — o nome da temporada no idioma. */
  temporada: string;
  /** "de 13 de novembro a 6 de dezembro" — nulo sem calendário divulgado. */
  periodo: string | null;
}>;

/**
 * O rótulo do capitão: o do tema na tela ("MAQUINISTA"), e "CAPITÃO" para o leitor de tela —
 * quem não vê o trem não precisa adivinhar que o maquinista é o capitão.
 */
export function RotuloDoCapitao({ visivel, lido }: Readonly<{ visivel: string; lido: string }>) {
  if (visivel === lido) return <>{lido}</>;
  return (
    <>
      <span aria-hidden="true">{visivel}</span>
      <span className={s.somenteLeitor}>{lido}</span>
    </>
  );
}

function BlocoEscudo({ team, cenario, c }: Readonly<{ team: DesignTeam; cenario: CenarioDoTema; c: ClassesDaPeca }>) {
  const { AtrasDoEscudo, NoEscudo, Chao } = cenario;
  return (
    <div className={c("blocoEscudo")}>
      <AtrasDoEscudo />
      <div className={c("escudo")}>
        {team.imageUrl ? (
          // O h1 já nomeia o time: o escudo é imagem decorativa (alt vazio).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.imageUrl} alt="" width={512} height={512} fetchPriority="high" />
        ) : (
          <span className={c("escudoVazio")}>{team.name.slice(0, 2)}</span>
        )}
        {NoEscudo ? <NoEscudo /> : null}
      </div>
      <Chao imagem={team.imageUrl ?? null} />
    </div>
  );
}

function Titulo({
  team,
  tema,
  cenario,
  c,
  id,
}: Readonly<{ team: DesignTeam; tema: TemaDoTime; cenario: CenarioDoTema; c: ClassesDaPeca; id: string }>) {
  const partes = partesDoNome(team.name, tema.prefixo, tema.sufixo);
  // NFC: um acento gravado decomposto ("A" + U+0301) viraria uma "letra" solta.
  const marca = partes.marca.normalize("NFC");
  const { assinatura } = partes;
  const { TracoDoNome } = cenario;
  // A largura MEDIDA da maior palavra, quando a fonte do título tem métrica (lib/temas/metricas).
  const metrica = METRICAS[tema.fontes.titulo];
  // Letra por letra, palavra por palavra: o nome quebra ENTRE as palavras, e cada letra sabe o
  // lugar dela no nome todo (`--i`) para a cascata da entrada. O tamanho segue a maior palavra.
  const palavras = marca.split(/\s+/).filter(Boolean).map((p) => [...p]);
  const totalDeLetras = palavras.reduce((soma, p) => soma + p.length, 0);
  const largura = tema.letraPorLetra ? Math.max(1, ...palavras.map((p) => p.length)) : [...marca].length;
  const inicio = palavras.map((_, k) => palavras.slice(0, k).reduce((soma, p) => soma + p.length, 0));
  return (
    <h1 className={c("titulo")} id={id}>
      {/* Lido uma vez, inteiro; o desenho ao lado é só visual. */}
      <span className={s.somenteLeitor}>{team.name}</span>
      <span
        className={c("tituloVisual")}
        aria-hidden="true"
        style={
          {
            "--letras": largura,
            "--total": totalDeLetras,
            ...(metrica && { "--largura-em": maiorPalavraEm(marca, metrica) }),
          } as CSSProperties
        }
      >
        <span className={c("marca")}>
          {tema.letraPorLetra ? (
            palavras.map((letras, k) => (
              <Fragment key={k}>
                {k > 0 ? " " : null}
                <span className={c("palavra")}>
                  {letras.map((letra, j) => (
                    <span key={j} className={c("letra")} style={{ "--i": inicio[k]! + j } as CSSProperties}>
                      <span className={c("eco")}>{letra}</span>
                      <span className={c("cromo")}>{letra}</span>
                    </span>
                  ))}
                </span>
              </Fragment>
            ))
          ) : (
            <>
              <span className={c("eco")}>{marca}</span>
              <span className={c("cromo")}>{marca}</span>
            </>
          )}
        </span>
        {assinatura ? (
          <span className={c("assinatura")}>
            <span className={c("pincel")}>{assinatura}</span>
            {TracoDoNome ? <TracoDoNome className={c("enfTraco")} /> : null}
          </span>
        ) : null}
      </span>
    </h1>
  );
}

function CartaDoElenco({
  player,
  indice,
  larga,
  tema,
  cenario,
  c,
  capitao,
  t,
  elos,
}: Readonly<{
  player: DesignPlayer;
  indice: number;
  larga: boolean;
  tema: TemaDoTime;
  cenario: CenarioDoTema;
  c: ClassesDaPeca;
  /** O rótulo do capitão na tela ("CAPITÃO", "MAQUINISTA"). */
  capitao: string;
  t: PaginasHomeTextos;
  elos?: Record<string, string>;
}>) {
  const rota = rotaCurto(t, player.roleMeta.short);
  const foco = tema.fotos.foco?.[player.slug] ?? tema.fotos.focoPadrao;
  const { Insignia, InsigniaMini } = cenario;
  return (
    <li
      className={c("casca", player.captain && "cascaCapitao", larga && "cascaLarga")}
      style={{ "--i": indice, "--col": indice % 2 } as CSSProperties}
    >
      <span className={c("enfHaloCarta")} aria-hidden="true" />
      {player.captain ? <Insignia className={c("coroaDoCapitao")} id={`tm-insignia-${player.slug}`} /> : null}
      <article className={c("carta")}>
        <div className={c("miolo")}>
          <div className={c("foto")} style={{ "--foco": foco } as CSSProperties}>
            {player.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.imageUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={c("fotoVazia")}>
                <RoleIcon role={player.role1} size={96} color="var(--tm-primaria)" opacity={0.35} />
              </span>
            )}
            <span className={c("enfGradacao")} aria-hidden="true" />
            <span className={c("enfRotaGigante")} aria-hidden="true">
              {/* Contorno vazado da sigla: enfeite, o texto de verdade está na etiqueta. */}
              <svg viewBox="0 0 200 80" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">
                <text x="0" y="74">{rota}</text>
              </svg>
            </span>
            <span className={c("enfVarredura")} aria-hidden="true" />
          </div>
          <div className={c("sobreFoto")}>
            <div className={c("topo")}>
              <span className={c("etiquetaRota")}>
                <RoleIcon role={player.role1} size={11} color="var(--tm-icone)" />
                {rota}
              </span>
              <EloCrest elo={player.elo} size={34} labels={elos} />
            </div>
            <div className={c("identidade")}>
              {player.captain ? (
                <span className={c("placaCapitao")}>
                  <InsigniaMini className={c("coroaMini")} />
                  <RotuloDoCapitao visivel={capitao} lido={t.timeCapitaoTema} />
                </span>
              ) : null}
              <h3 className={c("nick")}>
                <Link className={c("link")} href={`/jogadores/${player.slug}`}>
                  {player.displayNick}
                </Link>
              </h3>
              {player.mono ? <span className={c("mono")}>MONO</span> : null}
            </div>
          </div>
          <div className={c("rodape")}>
            <span className={c("nome")}>{player.name}</span>
            <span className={c("ficha")} aria-hidden="true">
              {t.ficha}
            </span>
          </div>
        </div>
      </article>
    </li>
  );
}

export function PaginaDoTimeComTema({ team, tema, t, elos, multiOpGg, temporada, periodo }: Props) {
  const cenario = CENARIOS[tema.cenario];
  const c = comCenario(s, cenario.classes);
  const { Moldura, InsigniaMini, AtrasDoElenco, NaCartela } = cenario;
  const texto = (papel: PapelDoTexto) => textoDoTema(tema, t, papel);
  const metrica = METRICAS[tema.fontes.titulo];
  const capitao = texto("capitao") ?? t.timeCapitaoTema;
  const lema = texto("lema");
  const aviso = texto("aviso");
  const destino = texto("destino");
  const carimbo = texto("carimbo");
  const fecho = texto("fecho");
  const emCartaz = texto("emCartaz") ?? t.timeEmCartaz;
  const fonteTitulo = FONTES_DOS_TEMAS[tema.fontes.titulo].variable;
  const fonteAssinatura = tema.fontes.assinatura ? FONTES_DOS_TEMAS[tema.fontes.assinatura].variable : "";
  // O capitão fecha o elenco — o último nome dos créditos, a locomotiva na frente do trem —; o
  // resto na ordem das rotas.
  const elenco = [...team.roster.filter((p) => !p.captain), ...team.roster.filter((p) => p.captain)];
  const nomes = elenco.map((p) => p.displayNick.toUpperCase()).join(" · ");
  // "{temporada} · LEAGUE OF BRONZE APRESENTA": a última palavra sai no tom de destaque.
  const apresenta = t.timeApresenta.replace("{temporada}", temporada.toUpperCase());
  const corte = apresenta.lastIndexOf(" ");

  return (
    <div
      className={cx(c("raiz"), fonteTitulo, fonteAssinatura)}
      style={varsDoTema(tema)}
      data-tema={tema.slug}
      data-fotos={tema.fotos.formato}
    >
      <Palco tema={tema} />

      <div className={c("conteudo")}>
        <section className={c("heroi")} aria-labelledby="tm-titulo-do-time">
          <Moldura />
          <div className={c("conteiner")}>
            <Link href="/times" className={c("voltar")}>
              {t.timeVoltar}
            </Link>
            <div className={c("heroiGrade")}>
              <BlocoEscudo team={team} cenario={cenario} c={c} />
              <div className={c("blocoTexto")}>
                <p className={c("kicker", "sobe")} style={{ "--i": 0 } as CSSProperties}>
                  {apresenta.slice(0, corte + 1)}
                  <span className={c("kickerApresenta")}>{apresenta.slice(corte + 1)}</span>
                </p>
                <p className={c("nomesDoElenco", "sobe")} style={{ "--i": 1 } as CSSProperties} aria-hidden="true">
                  {nomes}
                </p>
                <Titulo team={team} tema={tema} cenario={cenario} c={c} id="tm-titulo-do-time" />
                {lema ? (
                  <p className={c("lema", "sobe")} style={{ "--i": 2.5 } as CSSProperties}>
                    {lema}
                  </p>
                ) : null}
                <div className={c("chips", "sobe")} style={{ "--i": 3 } as CSSProperties}>
                  <span className={c("chip", "chipPts")}>
                    <span className={c("chipNumero")}>{team.total}</span>
                    {t.timePtsElenco}
                  </span>
                  {team.captain ? (
                    <span className={c("chip", "chipCapitao")}>
                      <InsigniaMini className={c("coroaMini")} />
                      <RotuloDoCapitao visivel={capitao} lido={t.timeCapitaoTema} /> · {team.captain.displayNick}
                    </span>
                  ) : null}
                  {multiOpGg.ok ? (
                    <Link href={multiOpGg.url} target="_blank" rel="noreferrer" className={c("chip", "chipOpgg")}>
                      MULTI OP.GG ({team.roster.length}) →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={c("elencoSecao")} aria-labelledby="tm-elenco">
          {AtrasDoElenco ? <AtrasDoElenco /> : null}
          <div className={c("conteiner")}>
            <h2 id="tm-elenco" className={c("estrelando")}>
              {texto("estrelando") ?? t.timeEstrelando}
            </h2>
            {aviso ? <p className={c("aviso")}>{aviso}</p> : null}
            <ul
              className={c("elenco")}
              data-n={elenco.length}
              style={
                {
                  "--colunas": Math.min(elenco.length, 5),
                  "--n": elenco.length,
                  ...(metrica && {
                    "--maior-palavra-em": Math.max(...elenco.map((p) => maiorPalavraEm(p.displayNick, metrica))),
                  }),
                } as CSSProperties
              }
            >
              {elenco.map((player, i) => (
                <CartaDoElenco
                  key={player.id}
                  player={player}
                  indice={i}
                  larga={i === elenco.length - 1 && elenco.length % 2 === 1}
                  tema={tema}
                  cenario={cenario}
                  c={c}
                  capitao={capitao}
                  t={t}
                  elos={elos}
                />
              ))}
            </ul>
          </div>
        </section>

        <footer className={c("cartela")}>
          <div className={c("conteiner")}>
            <span className={c("enfLinhaCromo")} aria-hidden="true">
              <InsigniaMini className={c("coroaMini")} />
            </span>
            <div className={c("cartelaCorpo")}>
              {NaCartela ? <NaCartela /> : null}
              {team.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className={c("cartelaEscudo")} src={team.imageUrl} alt="" width={64} height={64} loading="lazy" />
              ) : null}
              <p className={c("cartelaNome")}>{team.name}</p>
              {destino ? <p className={c("cartelaDestino")}>{destino}</p> : null}
              <p className={c("cartelaData")}>
                {temporada.toUpperCase()}
                {periodo ? ` · ${emCartaz.replace("{periodo}", periodo.toUpperCase())}` : ""}
              </p>
              {carimbo ? (
                <p className={c("cartelaCarimbo")} lang="pt-BR">
                  {carimbo}
                </p>
              ) : null}
            </div>
            {fecho ? <p className={c("cartelaFecho")}>{fecho}</p> : null}
            <div className={c("cartelaLinks")}>
              <Link href="/calendario" className={c("chip", "chipOpgg")}>
                {t.timeVerCalendario}
              </Link>
              <Link href="/times" className={c("voltar")}>
                {t.timeTodosOsTimes}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
