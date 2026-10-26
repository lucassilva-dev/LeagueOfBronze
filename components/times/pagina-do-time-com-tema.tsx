import Link from "next/link";
import type { CSSProperties } from "react";

import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import { Coroa, CoroaMini, Lascas, Raio, TracoDePincel } from "@/components/times/ornamentos";
import { BarrasDeCinema, cx, Palco } from "@/components/times/palco";
import c from "@/components/times/cenario-tempestade.module.css";
import s from "@/components/times/tema.module.css";
import { rotaCurto, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type { getOpGgMultiSearchUrlFromNicks } from "@/lib/opgg";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { partesDoNome, varsDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * A página do time com o TEMA dele (lib/temas) — hoje a Equipe RX, «A Coroa Elétrica».
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

function BlocoEscudo({ team }: Readonly<{ team: DesignTeam }>) {
  return (
    <div className={s.blocoEscudo}>
      {/* Atrás do escudo: a coroa gigante que acende com o raio, o clarão e as lascas. */}
      <Coroa className={c.enfCoroa} id="tm-coroa-gigante" />
      <Raio className={cx(c.enfRaio, c.enfRaioA)} />
      <div className={c.enfClarao} aria-hidden="true" />
      <Lascas className={cx(c.enfLascas, c.enfLascasEsq)} id="tm-lascas-esq" />
      <Lascas className={cx(c.enfLascas, c.enfLascasDir)} id="tm-lascas-dir" />
      <div className={s.enfAro} aria-hidden="true" />
      <div className={s.enfArco} aria-hidden="true" />
      <div className={cx(s.enfOnda, s.enfOnda1)} aria-hidden="true" />
      <div className={cx(s.enfOnda, s.enfOnda2)} aria-hidden="true" />
      <div className={s.escudo}>
        {team.imageUrl ? (
          // O h1 já nomeia o time: o escudo é imagem decorativa (alt vazio).
          // eslint-disable-next-line @next/next/no-img-element
          <img src={team.imageUrl} alt="" width={512} height={512} fetchPriority="high" />
        ) : (
          <span className={s.escudoVazio}>{team.name.slice(0, 2)}</span>
        )}
      </div>
      {/* O chão espelhado: o horizonte (flare) na base do escudo, o reflexo e a grade. */}
      <div className={s.enfChao} aria-hidden="true">
        <div className={s.enfHorizonte} />
        {team.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={s.enfReflexo} src={team.imageUrl} alt="" width={512} height={512} />
        ) : null}
        <div className={s.enfGrade} />
      </div>
    </div>
  );
}

function Titulo({ team, tema, id }: Readonly<{ team: DesignTeam; tema: TemaDoTime; id: string }>) {
  const { assinatura, marca } = partesDoNome(team.name, tema.prefixo);
  return (
    <h1 className={s.titulo} id={id}>
      {/* Lido uma vez, inteiro; o desenho ao lado é só visual. */}
      <span className={s.somenteLeitor}>{team.name}</span>
      <span className={s.tituloVisual} aria-hidden="true">
        <span className={s.marca} style={{ "--letras": [...marca].length } as CSSProperties}>
          <span className={s.eco}>{marca}</span>
          <span className={s.cromo}>{marca}</span>
        </span>
        {assinatura ? (
          <span className={s.assinatura}>
            <span className={s.pincel}>{assinatura}</span>
            <TracoDePincel className={s.enfTraco} />
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
  t,
  elos,
}: Readonly<{
  player: DesignPlayer;
  indice: number;
  larga: boolean;
  tema: TemaDoTime;
  t: PaginasHomeTextos;
  elos?: Record<string, string>;
}>) {
  const rota = rotaCurto(t, player.roleMeta.short);
  const foco = tema.fotos.foco?.[player.slug] ?? tema.fotos.focoPadrao;
  return (
    <li
      className={cx(s.casca, player.captain && s.cascaCapitao, larga && s.cascaLarga)}
      style={{ "--i": indice, "--col": indice % 2 } as CSSProperties}
    >
      <span className={s.enfHaloCarta} aria-hidden="true" />
      {player.captain ? <Coroa className={s.coroaDoCapitao} id={`tm-coroa-${player.slug}`} /> : null}
      <article className={s.carta}>
        <div className={s.miolo}>
          <div className={s.foto} style={{ "--foco": foco } as CSSProperties}>
            {player.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={player.imageUrl} alt="" loading="lazy" decoding="async" />
            ) : (
              <span className={s.fotoVazia}>
                <RoleIcon role={player.role1} size={96} color="var(--tm-primaria)" opacity={0.35} />
              </span>
            )}
            <span className={s.enfGradacao} aria-hidden="true" />
            <span className={s.enfRotaGigante} aria-hidden="true">
              {/* Contorno vazado da sigla: enfeite, o texto de verdade está na etiqueta. */}
              <svg viewBox="0 0 200 80" preserveAspectRatio="xMinYMax meet" aria-hidden="true" focusable="false">
                <text x="0" y="74">{rota}</text>
              </svg>
            </span>
            <span className={s.enfVarredura} aria-hidden="true" />
          </div>
          <div className={s.sobreFoto}>
            <div className={s.topo}>
              <span className={s.etiquetaRota}>
                <RoleIcon role={player.role1} size={11} color="#9CC8FF" />
                {rota}
              </span>
              <EloCrest elo={player.elo} size={34} labels={elos} />
            </div>
            <div className={s.identidade}>
              {player.captain ? (
                <span className={s.placaCapitao}>
                  <CoroaMini className={s.coroaMini} />
                  {t.timeCapitaoTema}
                </span>
              ) : null}
              <h3 className={s.nick}>
                <Link className={s.link} href={`/jogadores/${player.slug}`}>
                  {player.displayNick}
                </Link>
              </h3>
              {player.mono ? <span className={s.mono}>MONO</span> : null}
            </div>
          </div>
          <div className={s.rodape}>
            <span className={s.nome}>{player.name}</span>
            <span className={s.ficha} aria-hidden="true">
              {t.ficha}
            </span>
          </div>
        </div>
      </article>
    </li>
  );
}

export function PaginaDoTimeComTema({ team, tema, t, elos, multiOpGg, temporada, periodo }: Props) {
  const fonteTitulo = FONTES_DOS_TEMAS[tema.fontes.titulo].variable;
  const fonteAssinatura = tema.fontes.assinatura ? FONTES_DOS_TEMAS[tema.fontes.assinatura].variable : "";
  // O capitão fecha o elenco, como o último nome dos créditos; o resto na ordem das rotas.
  const elenco = [...team.roster.filter((p) => !p.captain), ...team.roster.filter((p) => p.captain)];
  const nomes = elenco.map((p) => p.displayNick.toUpperCase()).join(" · ");
  // "{temporada} · LEAGUE OF BRONZE APRESENTA": a última palavra sai no tom de destaque.
  const apresenta = t.timeApresenta.replace("{temporada}", temporada.toUpperCase());
  const corte = apresenta.lastIndexOf(" ");

  return (
    <div className={cx(s.raiz, fonteTitulo, fonteAssinatura)} style={varsDoTema(tema)} data-tema={tema.slug}>
      <Palco tema={tema} />

      <div className={s.conteudo}>
        <section className={s.heroi} aria-labelledby="tm-titulo-do-time">
          <BarrasDeCinema />
          <div className={s.conteiner}>
            <Link href="/times" className={s.voltar}>
              {t.timeVoltar}
            </Link>
            <div className={s.heroiGrade}>
              <BlocoEscudo team={team} />
              <div className={s.blocoTexto}>
                <p className={cx(s.kicker, s.sobe)} style={{ "--i": 0 } as CSSProperties}>
                  {apresenta.slice(0, corte + 1)}
                  <span className={s.kickerApresenta}>{apresenta.slice(corte + 1)}</span>
                </p>
                <p className={cx(s.nomesDoElenco, s.sobe)} style={{ "--i": 1 } as CSSProperties} aria-hidden="true">
                  {nomes}
                </p>
                <Titulo team={team} tema={tema} id="tm-titulo-do-time" />
                <div className={cx(s.chips, s.sobe)} style={{ "--i": 3 } as CSSProperties}>
                  <span className={cx(s.chip, s.chipPts)}>
                    <span className={s.chipNumero}>{team.total}</span>
                    {t.timePtsElenco}
                  </span>
                  {team.captain ? (
                    <span className={cx(s.chip, s.chipCapitao)}>
                      <CoroaMini className={s.coroaMini} />
                      {t.timeCapitaoTema} · {team.captain.displayNick}
                    </span>
                  ) : null}
                  {multiOpGg.ok ? (
                    <Link href={multiOpGg.url} target="_blank" rel="noreferrer" className={cx(s.chip, s.chipOpgg)}>
                      MULTI OP.GG ({team.roster.length}) →
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={s.elencoSecao} aria-labelledby="tm-elenco">
          <div className={s.conteiner}>
            <h2 id="tm-elenco" className={s.estrelando}>
              {t.timeEstrelando}
            </h2>
            <ul className={s.elenco} data-n={elenco.length} style={{ "--colunas": Math.min(elenco.length, 5) } as CSSProperties}>
              {elenco.map((player, i) => (
                <CartaDoElenco
                  key={player.id}
                  player={player}
                  indice={i}
                  larga={i === elenco.length - 1 && elenco.length % 2 === 1}
                  tema={tema}
                  t={t}
                  elos={elos}
                />
              ))}
            </ul>
          </div>
        </section>

        <footer className={s.cartela}>
          <div className={s.conteiner}>
            <span className={s.enfLinhaCromo} aria-hidden="true">
              <CoroaMini className={s.coroaMini} />
            </span>
            {team.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={s.cartelaEscudo} src={team.imageUrl} alt="" width={64} height={64} loading="lazy" />
            ) : null}
            <p className={s.cartelaNome}>{team.name}</p>
            <p className={s.cartelaData}>
              {temporada.toUpperCase()}
              {periodo ? ` · ${t.timeEmCartaz.replace("{periodo}", periodo.toUpperCase())}` : ""}
            </p>
            <div className={s.cartelaLinks}>
              <Link href="/calendario" className={cx(s.chip, s.chipOpgg)}>
                {t.timeVerCalendario}
              </Link>
              <Link href="/times" className={s.voltar}>
                {t.timeTodosOsTimes}
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
