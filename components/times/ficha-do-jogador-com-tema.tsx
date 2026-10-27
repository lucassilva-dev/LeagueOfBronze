import Link from "next/link";
import type { CSSProperties } from "react";

import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { CENARIOS } from "@/components/times/cenarios";
import f from "@/components/times/ficha.module.css";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import { Palco } from "@/components/times/palco";
import { RotuloDoCapitao } from "@/components/times/pagina-do-time-com-tema";
import s from "@/components/times/tema.module.css";
import { comCenario, cx } from "@/components/times/util";
import { eloLabel, rotaCurto, rotaLabel, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { METRICAS, larguraDoNickEm } from "@/lib/temas/metricas";
import { textoDoTema, varsDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * A ficha do jogador com o TEMA do time dele (lib/temas): o mesmo palco da página do time, a
 * foto numa moldura de metal, o nick em cromo, as estatísticas no tom do time e os
 * companheiros de elenco embaixo. Mesmas regras da página do time (ver lá): conteúdo só mexe
 * com transform; o que pisca é enfeite aria-hidden. Os ganchos do cenário valem aqui também:
 * `c("peca")` para as peças de tema.module.css, `cf("peca")` para as de ficha.module.css.
 */

type Props = Readonly<{
  player: DesignPlayer;
  team: DesignTeam | null;
  tema: TemaDoTime;
  t: PaginasHomeTextos;
  elos?: Record<string, string>;
  tiles: readonly { label: string; val: string }[];
  opggUrl: string | null;
  temporada: string;
  voltar: { href: string; texto: string };
  /** "Saiu do time", ao lado do time, para quem saiu de vez. */
  saiu?: string | null;
}>;

export function FichaDoJogadorComTema({ player, team, tema, t, elos, tiles, opggUrl, temporada, voltar, saiu }: Props) {
  const fonteTitulo = FONTES_DOS_TEMAS[tema.fontes.titulo].variable;
  const fonteAssinatura = tema.fontes.assinatura ? FONTES_DOS_TEMAS[tema.fontes.assinatura].variable : "";
  const foco = tema.fotos.foco?.[player.slug] ?? tema.fotos.focoPadrao;
  const rota = rotaLabel(t, player.roleMeta.short, player.roleMeta.label);
  const companheiros = (team?.roster ?? []).filter((p) => p.id !== player.id);
  const cenario = CENARIOS[tema.cenario];
  const c = comCenario(s, cenario.classes);
  const cf = comCenario(f, cenario.classesDaFicha);
  const { Insignia, InsigniaMini, Moldura, AtrasDoRetrato } = cenario;
  const capitao = textoDoTema(tema, t, "capitao") ?? t.timeCapitaoTema;
  // O nick pelo tamanho da MAIOR PALAVRA (quem quebra entre palavras cabe maior).
  const maiorPalavra = Math.max(4, ...player.displayNick.split(/\s+/).map((p) => [...p].length));
  // A largura MEDIDA para o nick caber em até duas linhas, quando a fonte tem métrica.
  const metrica = METRICAS[tema.fontes.titulo];

  return (
    <div
      className={cx(c("raiz"), cenario.classesDaFicha?.raiz, fonteTitulo, fonteAssinatura)}
      style={varsDoTema(tema)}
      data-tema={tema.slug}
      data-fotos={tema.fotos.formato}
    >
      <Palco tema={tema} />

      <div className={c("conteudo")}>
        <section className={cx(c("heroi"), cf("heroi"))} aria-labelledby="tm-nick">
          <Moldura />
          <div className={c("conteiner")}>
            <Link href={voltar.href} className={c("voltar")}>
              {voltar.texto}
            </Link>

            <div className={cf("grade")}>
              <div className={cf("retratoCasca", player.captain && "retratoCapitao")}>
                <span className={cf("enfHaloRetrato")} aria-hidden="true" />
                {AtrasDoRetrato ? <AtrasDoRetrato /> : null}
                {player.captain ? <Insignia className={cf("coroaDoRetrato")} id={`tm-insignia-ficha-${player.slug}`} /> : null}
                <figure className={cf("retrato")}>
                  <div
                    className={cf("retratoMiolo")}
                    style={{ "--foco": foco, "--proporcao": tema.fotos.proporcao?.[player.slug] } as CSSProperties}
                  >
                    {player.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.imageUrl} alt={player.displayNick} fetchPriority="high" />
                    ) : (
                      <span className={cf("retratoVazio")}>
                        <RoleIcon role={player.role1} size={160} color="var(--tm-primaria)" opacity={0.35} />
                      </span>
                    )}
                    <span className={cf("enfGradacao")} aria-hidden="true" />
                    <span className={cf("enfVarreduraLenta")} aria-hidden="true" />
                    <span className={cf("topo")}>
                      <span className={c("etiquetaRota")}>
                        <RoleIcon role={player.role1} size={12} color="var(--tm-icone)" />
                        {rotaCurto(t, player.roleMeta.short)}
                      </span>
                      <EloCrest elo={player.elo} size={52} title={false} labels={elos} />
                    </span>
                    {player.captain ? (
                      <span className={cf("placa")}>
                        <InsigniaMini className={c("coroaMini")} />
                        <RotuloDoCapitao visivel={capitao} lido={t.timeCapitaoTema} />
                      </span>
                    ) : null}
                  </div>
                </figure>
              </div>

              <div className={cf("texto")}>
                <p className={cx(c("kicker", "sobe"), cf("kicker"))} style={{ "--i": 0 } as CSSProperties}>
                  {team?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={cf("escudoMini")} src={team.imageUrl} alt="" width={28} height={28} />
                  ) : null}
                  <span>
                    {player.teamName}
                    {saiu ? ` · ${saiu}` : ""}
                    <span className={c("kickerApresenta")}> · {temporada.toUpperCase()}</span>
                  </span>
                </p>
                <h1 id="tm-nick" className={cf("nickTitulo")}>
                  <span className={s.somenteLeitor}>{player.displayNick}</span>
                  <span
                    className={cf("nickVisual")}
                    aria-hidden="true"
                    style={
                      {
                        "--letras": Math.max(4, [...player.displayNick].length),
                        "--maior-palavra": maiorPalavra,
                        ...(metrica && { "--largura-nick-em": larguraDoNickEm(player.displayNick, metrica) }),
                      } as CSSProperties
                    }
                  >
                    <span className={c("eco")}>{player.displayNick}</span>
                    <span className={c("cromo")}>{player.displayNick}</span>
                  </span>
                </h1>
                {player.name && player.name !== player.displayNick ? (
                  <p className={cx(cf("nomeReal"), c("sobe"))} style={{ "--i": 1 } as CSSProperties}>
                    {player.name}
                  </p>
                ) : null}

                <div className={cx(c("chips"), cf("chips"), c("sobe"))} style={{ "--i": 2 } as CSSProperties}>
                  <span className={c("chip", "chipCapitao")}>
                    <RoleIcon role={player.role1} size={14} color="var(--tm-icone)" />
                    {rota}
                  </span>
                  <span className={c("chip", "chipCapitao")}>
                    <EloCrest elo={player.elo} size={22} title={false} labels={elos} />
                    {eloLabel(t, player.eloMeta?.key, player.eloMeta?.label ?? player.elo)}
                  </span>
                  <span className={c("chip", "chipPts")}>
                    <span className={c("chipNumero")}>{player.pts}</span>
                    {t.ptsDraft}
                  </span>
                  {opggUrl ? (
                    <Link href={opggUrl} target="_blank" rel="noreferrer" className={c("chip", "chipOpgg")}>
                      OP.GG →
                    </Link>
                  ) : null}
                </div>

                <h2 className={cx(cf("performance"), c("sobe"))} style={{ "--i": 3 } as CSSProperties}>
                  {t.jogadorPerformance}
                </h2>
                <ul className={cf("estatisticas")}>
                  {tiles.map((tile, i) => (
                    <li key={tile.label} className={cx(cf("estatistica"), c("sobe"))} style={{ "--i": 4 + i * 0.6 } as CSSProperties}>
                      <span className={cf("valor")}>{tile.val}</span>
                      <span className={cf("rotulo")}>{tile.label}</span>
                    </li>
                  ))}
                </ul>
                <p className={cf("nota")}>{t.jogadorNota}</p>
              </div>
            </div>
          </div>
        </section>

        {companheiros.length > 0 && team ? (
          <section className={cf("companheirosSecao")} aria-labelledby="tm-companheiros">
            <div className={c("conteiner")}>
              <h2 id="tm-companheiros" className={c("estrelando")}>
                {textoDoTema(tema, t, "companheiros") ?? t.jogadorCompanheiros}
              </h2>
              <ul className={cf("companheiros")}>
                {companheiros.map((p) => (
                  <li key={p.id} className={cf("companheiro")}>
                    <Link href={`/jogadores/${p.slug}`} className={cf("companheiroLink")}>
                      <span
                        className={cf("companheiroFoto")}
                        style={{ "--foco": tema.fotos.foco?.[p.slug] ?? tema.fotos.focoPadrao } as CSSProperties}
                      >
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <RoleIcon role={p.role1} size={40} color="var(--tm-primaria)" opacity={0.4} />
                        )}
                      </span>
                      <span className={cf("companheiroTexto")}>
                        <span className={cf("companheiroRota")}>
                          <RoleIcon role={p.role1} size={11} color="var(--tm-icone)" />
                          {rotaCurto(t, p.roleMeta.short)}
                          {p.captain ? (
                            <>
                              <InsigniaMini className={c("coroaMini")} />
                              {/* A insígnia é desenho: o leitor de tela ouve "capitão". */}
                              <span className={s.somenteLeitor}> · {t.timeCapitaoTema}</span>
                            </>
                          ) : null}
                        </span>
                        <span className={cf("companheiroNick")}>{p.displayNick}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={cf("verTime")}>
                <Link href={`/times/${team.slug}`} className={c("chip", "chipOpgg")}>
                  {team.name} →
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
