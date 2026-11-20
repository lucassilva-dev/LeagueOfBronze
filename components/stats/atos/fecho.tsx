import Link from "next/link";

import type { DadosDaForja } from "@/lib/stats/forja";

import b from "../forja.module.css";
import type { TextosDaTela } from "../provedor";
import s from "./fecho.module.css";

/**
 * FECHO — O RESFRIAMENTO. O metal vai para a água (a cena 3D mergulha o emblema e solta vapor) e
 * a página aponta os caminhos: jogadores, times e partidas, e a visão em tabela com todos os
 * números crus. A assinatura do campeonato fecha o espetáculo.
 */
export function AtoDoFecho({ dados, t, lema }: Readonly<{ dados: DadosDaForja; t: TextosDaTela; lema: string }>) {
  const { f } = t;
  const portas = [
    { href: "/jogadores", titulo: f.fechoJogadores, sub: f.fechoJogadoresSub, numero: dados.resumo.jogadores },
    { href: "/times", titulo: f.fechoTimes, sub: f.fechoTimesSub, numero: dados.resumo.times },
    { href: "/partidas", titulo: f.fechoPartidas, sub: f.fechoPartidasSub, numero: dados.resumo.seriesTotal },
  ];

  return (
    <section id="ato-fecho" className={`${b.ato} ${s.ato}`} data-ato="fecho" aria-labelledby="titulo-do-fecho">
      <div className={`${b.palco} ${s.palco}`}>
        <header className={s.cabeca} data-marca="0" data-som="chiado">
          <p className={s.numero}>{f.atos.fecho.numero}</p>
          <h2 id="titulo-do-fecho" className={s.titulo}>
            {f.fechoTitulo}
          </h2>
          <p className={s.texto}>{f.fechoTexto}</p>
        </header>

        <ul className={s.portas}>
          {portas.map((porta) => (
            <li key={porta.href}>
              <Link href={porta.href} className={s.porta}>
                <span className={s.portaNumero}>{porta.numero}</span>
                <span className={s.portaTitulo}>{porta.titulo}</span>
                <span className={s.portaSub}>{porta.sub}</span>
                <span className={s.enfSeta} aria-hidden />
              </Link>
            </li>
          ))}
        </ul>

        <div className={s.pe}>
          <Link href="/stats?modo=tabela" className={s.tabela}>
            {f.fechoTabela}
          </Link>
          <p className={s.lema}>{lema}</p>
        </div>
      </div>
    </section>
  );
}
