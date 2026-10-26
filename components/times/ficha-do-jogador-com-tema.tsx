import Link from "next/link";
import type { CSSProperties } from "react";

import { EloCrest, RoleIcon } from "@/components/lob/ui";
import { FONTES_DOS_TEMAS } from "@/components/times/fontes-dos-temas";
import f from "@/components/times/ficha.module.css";
import { Coroa, CoroaMini } from "@/components/times/ornamentos";
import { BarrasDeCinema, cx, Palco } from "@/components/times/palco";
import s from "@/components/times/tema.module.css";
import { eloLabel, rotaCurto, rotaLabel, type PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { varsDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * A ficha do jogador com o TEMA do time dele (lib/temas): o mesmo palco da página do time, a
 * foto numa moldura de metal, o nick em cromo, as estatísticas no tom do time e os
 * companheiros de elenco embaixo. Mesmas regras da página do time (ver lá): conteúdo só mexe
 * com transform; o que pisca é enfeite aria-hidden.
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

  return (
    <div className={cx(s.raiz, fonteTitulo, fonteAssinatura)} style={varsDoTema(tema)} data-tema={tema.slug}>
      <Palco tema={tema} />

      <div className={s.conteudo}>
        <section className={cx(s.heroi, f.heroi)} aria-labelledby="tm-nick">
          <BarrasDeCinema />
          <div className={s.conteiner}>
            <Link href={voltar.href} className={s.voltar}>
              {voltar.texto}
            </Link>

            <div className={f.grade}>
              <div className={cx(f.retratoCasca, player.captain && f.retratoCapitao)}>
                <span className={f.enfHaloRetrato} aria-hidden="true" />
                {player.captain ? <Coroa className={f.coroaDoRetrato} id={`tm-coroa-ficha-${player.slug}`} /> : null}
                <figure className={f.retrato}>
                  <div className={f.retratoMiolo} style={{ "--foco": foco } as CSSProperties}>
                    {player.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.imageUrl} alt={player.displayNick} fetchPriority="high" />
                    ) : (
                      <span className={f.retratoVazio}>
                        <RoleIcon role={player.role1} size={160} color="var(--tm-primaria)" opacity={0.35} />
                      </span>
                    )}
                    <span className={f.enfGradacao} aria-hidden="true" />
                    <span className={f.enfVarreduraLenta} aria-hidden="true" />
                    <span className={f.topo}>
                      <span className={s.etiquetaRota}>
                        <RoleIcon role={player.role1} size={12} color="#9CC8FF" />
                        {rotaCurto(t, player.roleMeta.short)}
                      </span>
                      <EloCrest elo={player.elo} size={52} title={false} labels={elos} />
                    </span>
                    {player.captain ? (
                      <span className={f.placa}>
                        <CoroaMini className={s.coroaMini} />
                        {t.timeCapitaoTema}
                      </span>
                    ) : null}
                  </div>
                </figure>
              </div>

              <div className={f.texto}>
                <p className={cx(s.kicker, s.sobe, f.kicker)} style={{ "--i": 0 } as CSSProperties}>
                  {team?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className={f.escudoMini} src={team.imageUrl} alt="" width={28} height={28} />
                  ) : null}
                  <span>
                    {player.teamName}
                    {saiu ? ` · ${saiu}` : ""}
                    <span className={s.kickerApresenta}> · {temporada.toUpperCase()}</span>
                  </span>
                </p>
                <h1 id="tm-nick" className={f.nickTitulo}>
                  <span className={s.somenteLeitor}>{player.displayNick}</span>
                  <span
                    className={f.nickVisual}
                    aria-hidden="true"
                    style={{ "--letras": Math.max(4, [...player.displayNick].length) } as CSSProperties}
                  >
                    <span className={s.eco}>{player.displayNick}</span>
                    <span className={s.cromo}>{player.displayNick}</span>
                  </span>
                </h1>
                {player.name && player.name !== player.displayNick ? (
                  <p className={cx(f.nomeReal, s.sobe)} style={{ "--i": 1 } as CSSProperties}>
                    {player.name}
                  </p>
                ) : null}

                <div className={cx(s.chips, f.chips, s.sobe)} style={{ "--i": 2 } as CSSProperties}>
                  <span className={cx(s.chip, s.chipCapitao)}>
                    <RoleIcon role={player.role1} size={14} color="#9CC8FF" />
                    {rota}
                  </span>
                  <span className={cx(s.chip, s.chipCapitao)}>
                    <EloCrest elo={player.elo} size={22} title={false} labels={elos} />
                    {eloLabel(t, player.eloMeta?.key, player.eloMeta?.label ?? player.elo)}
                  </span>
                  <span className={cx(s.chip, s.chipPts)}>
                    <span className={s.chipNumero}>{player.pts}</span>
                    {t.ptsDraft}
                  </span>
                  {opggUrl ? (
                    <Link href={opggUrl} target="_blank" rel="noreferrer" className={cx(s.chip, s.chipOpgg)}>
                      OP.GG →
                    </Link>
                  ) : null}
                </div>

                <h2 className={cx(f.performance, s.sobe)} style={{ "--i": 3 } as CSSProperties}>
                  {t.jogadorPerformance}
                </h2>
                <ul className={f.estatisticas}>
                  {tiles.map((tile, i) => (
                    <li key={tile.label} className={cx(f.estatistica, s.sobe)} style={{ "--i": 4 + i * 0.6 } as CSSProperties}>
                      <span className={f.valor}>{tile.val}</span>
                      <span className={f.rotulo}>{tile.label}</span>
                    </li>
                  ))}
                </ul>
                <p className={f.nota}>{t.jogadorNota}</p>
              </div>
            </div>
          </div>
        </section>

        {companheiros.length > 0 && team ? (
          <section className={f.companheirosSecao} aria-labelledby="tm-companheiros">
            <div className={s.conteiner}>
              <h2 id="tm-companheiros" className={s.estrelando}>
                {t.jogadorCompanheiros}
              </h2>
              <ul className={f.companheiros}>
                {companheiros.map((p) => (
                  <li key={p.id} className={f.companheiro}>
                    <Link href={`/jogadores/${p.slug}`} className={f.companheiroLink}>
                      <span className={f.companheiroFoto} style={{ "--foco": tema.fotos.foco?.[p.slug] ?? tema.fotos.focoPadrao } as CSSProperties}>
                        {p.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.imageUrl} alt="" loading="lazy" decoding="async" />
                        ) : (
                          <RoleIcon role={p.role1} size={40} color="var(--tm-primaria)" opacity={0.4} />
                        )}
                      </span>
                      <span className={f.companheiroTexto}>
                        <span className={f.companheiroRota}>
                          <RoleIcon role={p.role1} size={11} color="#9CC8FF" />
                          {rotaCurto(t, p.roleMeta.short)}
                          {p.captain ? <CoroaMini className={s.coroaMini} /> : null}
                        </span>
                        <span className={f.companheiroNick}>{p.displayNick}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={f.verTime}>
                <Link href={`/times/${team.slug}`} className={cx(s.chip, s.chipOpgg)}>
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
