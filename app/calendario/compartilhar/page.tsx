import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { TeamMark } from "@/components/lob/ui";
import { CALENDARIO_4A, calendarioEDestaTemporada, diaDoSlot, horaDoSlot } from "@/lib/calendario-4a";
import { buildCalendarDays, buildFinalGame, buildSemifinalGames, type CalGame, type CalTeamRef } from "@/lib/calendar";
import { semTemporadaAoVivo } from "@/lib/fase-do-site";
import { metadadosDaPagina } from "@/lib/i18n/metadados";
import { nomeDaTemporada } from "@/lib/i18n/nome-da-temporada";
import { getLocale, getMessages } from "@/lib/i18n/server";
import { getServerDataset } from "@/lib/server-data";
import { corDoTime } from "@/lib/temas/registro";

import s from "./compartilhar.module.css";

export const dynamic = "force-dynamic";

/**
 * O calendário para PRINT (o grupo do WhatsApp): um quadro compacto, sem o cabeçalho e o rodapé
 * do site. Cada jogo é uma linha (horário · A × B) e os dias se agrupam por fim de semana: no
 * computador, os fins de semana lado a lado (o calendário inteiro numa tela); no celular, um
 * embaixo do outro. O filtro por time é um link (`?time=<slug>`): sem JavaScript, e o quadro de
 * um time só cabe numa tela de celular.
 *
 * Os dados são os mesmos de /calendario: as séries do dataset ao vivo e, enquanto não existem,
 * as semifinais e a final do calendário oficial desta temporada (só no quadro de todos — no de
 * um time, ainda não se sabe se ele chega lá).
 */

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await metadadosDaPagina("calendario", "/calendario/compartilhar")), robots: { index: false } };
}

type Linha = {
  chave: string;
  hora: string;
  /** «SEMI 1», «FINAL»: só fora da fase de pontos. */
  marca?: string;
  /** A série; sem ela, o confronto previsto em texto («1º × 4º»). */
  jogo?: CalGame;
  previsto?: string;
};

type Dia = { dateKey: string; titulo: string; detalhe: string; linhas: Linha[] };

const DIA_MS = 24 * 60 * 60 * 1000;

/** Dias seguidos (até 2 dias de distância) formam um fim de semana. */
function finsDeSemana(dias: readonly Dia[]): Dia[][] {
  const grupos: Dia[][] = [];
  for (const dia of dias) {
    const ultimo = grupos.at(-1)?.at(-1);
    const perto = ultimo && Date.parse(`${dia.dateKey}T12:00:00Z`) - Date.parse(`${ultimo.dateKey}T12:00:00Z`) <= 2 * DIA_MS;
    if (perto) grupos.at(-1)!.push(dia);
    else grupos.push([dia]);
  }
  return grupos;
}

/** Um time da linha. `placar`: só no celular, ao lado do nome (no computador o placar fica no meio). */
function Time({
  time,
  lado,
  venceu,
  destaque,
  placar,
}: Readonly<{ time: CalTeamRef; lado: "a" | "b"; venceu?: boolean; destaque: boolean; placar?: number }>) {
  return (
    <span className={s.time} data-lado={lado} data-venceu={venceu === undefined ? undefined : String(venceu)} data-destaque={destaque || undefined}>
      <TeamMark imageUrl={time.imageUrl} color={time.color} name="" size={20} />
      <span className={s.nomeDoTime}>{time.name}</span>
      {placar !== undefined ? <span className={s.placarDoTime}>{placar}</span> : null}
    </span>
  );
}

function LinhaDoJogo({ linha, destaque }: Readonly<{ linha: Linha; destaque?: string }>) {
  const jogo = linha.jogo;
  const jogado = jogo ? jogo.done || jogo.scoreA + jogo.scoreB > 0 : false;
  return (
    <li className={s.linha} data-previsto={linha.previsto ? "" : undefined}>
      <span className={s.hora}>{linha.hora || "—"}</span>
      {linha.marca ? <span className={s.marca}>{linha.marca}</span> : null}
      {jogo ? (
        <span className={s.confronto}>
          <Time
            time={jogo.teamA}
            lado="a"
            venceu={jogo.done ? jogo.winnerId === jogo.teamA.id : undefined}
            destaque={destaque === jogo.teamA.id}
            placar={jogado ? jogo.scoreA : undefined}
          />
          <span className={s.versus}>{jogado ? `${jogo.scoreA} × ${jogo.scoreB}` : "×"}</span>
          <Time
            time={jogo.teamB}
            lado="b"
            venceu={jogo.done ? jogo.winnerId === jogo.teamB.id : undefined}
            destaque={destaque === jogo.teamB.id}
            placar={jogado ? jogo.scoreB : undefined}
          />
        </span>
      ) : (
        <span className={s.previsto}>{linha.previsto}</span>
      )}
    </li>
  );
}

export default async function CalendarioParaPrint({
  searchParams,
}: Readonly<{ searchParams: Promise<{ time?: string | string[] }> }>) {
  const t = await getMessages();
  const locale = await getLocale();
  const textos = t.paginasCompeticao;
  const { dataset } = await getServerDataset();
  const pedido = (await searchParams).time;
  const slugPedido = typeof pedido === "string" ? pedido : undefined;

  const voltar = (
    <Link href="/calendario" className={s.voltar}>
      {textos.compartilharVoltar}
    </Link>
  );

  if (semTemporadaAoVivo(dataset) || dataset.seriesMatches.length === 0) {
    return (
      <div className={s.pagina} data-calendario-print="">
        <nav className={s.controles}>{voltar}</nav>
        <p className={s.vazio}>{textos.compartilharSemCalendario}</p>
      </div>
    );
  }

  const times = dataset.teams.map((time) => ({ ...time, cor: corDoTime({ id: time.id, slug: time.slug }) }));
  const filtro = times.find((time) => time.slug === slugPedido) ?? null;
  const doFiltro = (game: CalGame) => !filtro || game.teamA.id === filtro.id || game.teamB.id === filtro.id;
  const diaDaSemana = (dateKey: string, padrao: string) =>
    locale === "en"
      ? new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/Sao_Paulo" })
          .format(new Date(`${dateKey}T12:00:00-03:00`))
          .toUpperCase()
      : padrao;
  const ddmm = (dateKey: string) => dateKey.slice(5).split("-").reverse().join("/");

  // Um dia por data: a fase de pontos, e as semifinais e a final no dia delas (podem cair no
  // mesmo dia — viram uma seção só).
  const porData = new Map<string, Dia>();
  const diaDe = (dateKey: string, titulo: string, detalhe: string) => {
    let dia = porData.get(dateKey);
    if (!dia) {
      dia = { dateKey, titulo, detalhe, linhas: [] };
      porData.set(dateKey, dia);
    }
    return dia;
  };

  const pontos = buildCalendarDays(dataset);
  for (const day of pontos) {
    const jogos = day.games.filter(doFiltro);
    if (jogos.length === 0) continue;
    diaDe(day.dateKey, day.dateLabel, diaDaSemana(day.dateKey, day.dia)).linhas.push(
      ...jogos.map((jogo) => ({ chave: jogo.id, hora: jogo.hora, jogo })),
    );
  }

  const semis = buildSemifinalGames(dataset);
  const final = buildFinalGame(dataset);
  const oficial = calendarioEDestaTemporada([
    ...pontos.map((d) => d.dateKey),
    ...semis.map((g) => g.dateKey),
    ...(final ? [final.dateKey] : []),
  ]);
  const semana = (dateKey: string) => diaDaSemana(dateKey, new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).format(new Date(`${dateKey}T12:00:00-03:00`)).toUpperCase());

  for (const semi of semis.filter(doFiltro)) {
    diaDe(semi.dateKey, semi.dateLabel, semana(semi.dateKey)).linhas.push({
      chave: semi.id,
      hora: semi.hora,
      marca: `${textos.calendarioSemifinaisTitulo.slice(0, 4)} ${semi.n}`,
      jogo: semi,
    });
  }
  if (!filtro && oficial && semis.length === 0) {
    for (const slot of CALENDARIO_4A.filter((item) => item.tipo === "semifinal")) {
      const dateKey = diaDoSlot(slot);
      diaDe(dateKey, ddmm(dateKey), semana(dateKey)).linhas.push({
        chave: slot.quando,
        hora: horaDoSlot(slot),
        marca: `${textos.calendarioSemifinaisTitulo.slice(0, 4)} ${slot.semifinal}`,
        previsto: slot.semifinal === 1 ? "1º × 4º" : "2º × 3º",
      });
    }
  }
  if (final && doFiltro(final)) {
    diaDe(final.dateKey, final.dateLabel, semana(final.dateKey)).linhas.push({ chave: final.id, hora: final.hora, marca: "FINAL", jogo: final });
  } else if (!final && !filtro && oficial) {
    const slot = CALENDARIO_4A.find((item) => item.tipo === "final");
    if (slot) {
      const dateKey = diaDoSlot(slot);
      diaDe(dateKey, ddmm(dateKey), semana(dateKey)).linhas.push({
        chave: "final",
        hora: horaDoSlot(slot),
        marca: "FINAL",
        previsto: `${textos.calendarioFinalConfronto} · ${textos.calendarioFinalMelhorDe5}`,
      });
    }
  }

  const dias = [...porData.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  for (const dia of dias) dia.linhas.sort((a, b) => a.hora.localeCompare(b.hora));
  const grupos = finsDeSemana(dias);

  return (
    <div className={s.pagina} data-calendario-print="">
      <nav className={s.controles} aria-label={textos.compartilharFiltro}>
        {voltar}
        <p className={s.dica}>{textos.compartilharDica}</p>
        <ul className={s.filtro}>
          <li>
            <Link href="/calendario/compartilhar" className={s.chip} aria-current={filtro ? undefined : "page"} scroll={false}>
              {textos.compartilharTodos}
            </Link>
          </li>
          {times.map((time) => (
            <li key={time.id}>
              <Link
                href={`/calendario/compartilhar?time=${encodeURIComponent(time.slug)}`}
                className={s.chip}
                aria-current={filtro?.id === time.id ? "page" : undefined}
                style={{ "--cor": time.cor } as CSSProperties}
                scroll={false}
              >
                <TeamMark imageUrl={time.imageUrl} color={time.cor} name="" size={18} />
                <span>{time.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section className={s.quadro} data-filtrado={filtro ? "" : undefined} style={filtro ? ({ "--cor": filtro.cor } as CSSProperties) : undefined}>
        <header className={s.cabecalho}>
          <div>
            <p className={s.sobretitulo}>League of Bronze · {nomeDaTemporada(dataset.tournament.name, t.compartilhados.localeTag)}</p>
            <h1 className={`lob-display ${s.titulo}`}>{textos.calendarioTitulo}</h1>
          </div>
          {filtro ? (
            <div className={s.timeDoFiltro}>
              <TeamMark imageUrl={filtro.imageUrl} color={filtro.cor} name={filtro.name} size={44} />
              <span className="lob-display">{filtro.name}</span>
            </div>
          ) : null}
        </header>

        {grupos.length === 0 ? (
          <p className={s.vazio}>{textos.compartilharSemJogos}</p>
        ) : (
          <div className={s.grupos} style={{ "--grupos": grupos.length } as CSSProperties}>
            {grupos.map((grupo) => (
              <div key={grupo[0]!.dateKey} className={s.grupo}>
                {grupo.map((dia) => (
                  <section key={dia.dateKey} className={s.dia}>
                    <h2 className={s.cabecalhoDoDia}>
                      <span className="lob-display">{dia.titulo}</span>
                      <span>{dia.detalhe}</span>
                    </h2>
                    <ul className={s.linhas}>
                      {dia.linhas.map((linha) => (
                        <LinhaDoJogo key={linha.chave} linha={linha} destaque={filtro?.id} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            ))}
          </div>
        )}

        <footer className={s.rodape}>
          <span>{textos.compartilharHorario}</span>
          <span>leagueofbronze.xyz</span>
        </footer>
      </section>
    </div>
  );
}
