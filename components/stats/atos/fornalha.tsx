import type { DadosDaForja } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { Odometro, preencher } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./fornalha.module.css";

/**
 * ATO I — A FORNALHA. O título da página, o medalhão derretido (a cena 3D pinta atrás) e o
 * resumo do campeonato, cravado a quatro marteladas. Fecha com a nota de conformidade: é NESTA
 * página que os pontos por elo aparecem somados, e as políticas da Riot pedem que fique claro
 * que eles são moeda de draft — por isso a nota é texto de corpo inteiro, não rodapé miúdo.
 */
export function AtoDaFornalha({
  dados,
  t,
  edicao,
  aviso,
}: Readonly<{ dados: DadosDaForja; t: TextosDaTela; edicao: string; aviso: string }>) {
  const { f, s: st } = t;
  const r = dados.resumo;
  const placas = [
    { chave: "jogadores", valor: r.jogadores, rotulo: st.statsPillJogadores, nota: f.resumoJogadoresNota },
    { chave: "pool", valor: r.pool, rotulo: st.statsPillPool, nota: f.resumoPoolNota },
    { chave: "media", valor: r.media, rotulo: st.statsPillMedia, nota: f.resumoMediaNota },
    { chave: "monos", valor: r.monos, rotulo: st.statsPillMono, nota: r.monos === 0 ? f.resumoMonoNotaZero : f.resumoMonoNota },
  ];

  return (
    <section id="ato-fornalha" className={`${b.ato} ${s.ato}`} data-ato="fornalha" data-fixa="" aria-labelledby="titulo-da-forja">
      <div className={`${b.palco} ${s.palco}`}>
        <header className={s.topo} data-paralaxe="">
          <p className={s.sobre}>
            <span className={s.sobreAto}>{f.atos.fornalha.numero}</span>
            {preencher(f.sobretitulo, { edicao, jogos: r.jogos })}
          </p>
          <h1 id="titulo-da-forja" className={`lob-h1 gold-text ${s.titulo}`}>
            {st.statsTitulo}
          </h1>
          <p className={s.lema}>
            {f.lema} <strong>{f.lema2}</strong>
          </p>
        </header>

        {/* O emblema em 2D: aparece quando a cena 3D não está no ar (celular, máquina fraca).
            É o RECORTE (scripts/gerar-icones.mjs, item 3): sem fundo, para ficar em cima da brasa
            — o logo do cabeçalho leva um véu que, sobre luz, aparece como uma caixa. */}
        <div className={s.enfMedalhao2d} aria-hidden data-paralaxe="">
          <span className={s.enfBrasa2d} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/emblema-recortado.png" alt="" width={512} height={512} decoding="async" />
        </div>

        <div className={`${b.cena} ${s.base}`}>
          <ul className={s.placas}>
            {placas.map((placa, i) => (
              <li
                key={placa.chave}
                className={s.placa}
                data-marca={(0.2 + i * 0.15).toFixed(2)}
                data-golpe=""
                data-som={i === placas.length - 1 ? "clang-forte" : "clang"}
                data-conta={Math.max(1, placa.valor)}
                data-faisca="forte"
              >
                <Odometro texto={String(placa.valor)} className={s.placaNumero} />
                <span className={s.enfFilete} aria-hidden />
                <span className={s.placaRotulo}>{placa.rotulo}</span>
                <span className={s.placaNota}>{placa.nota}</span>
              </li>
            ))}
          </ul>

          <p className={s.faixa} data-marca="0.82" data-som="sopro">
            {preencher(f.resumoFaixa, { jogos: r.jogos, abates: r.abates, series: r.seriesCompletas, total: r.seriesTotal })}
          </p>

          <p className={s.aviso} data-marca="0.9" data-som="chiado">
            {aviso}
          </p>
        </div>

        <p className={s.rolar}>
          {f.rolar}
          {/* os atalhos, para quem está no teclado (no toque não há tecla: o CSS esconde) */}
          <span className={s.atalhos}>{f.hudAtalhos}</span>
          <span className={s.enfSeta} aria-hidden />
        </p>
      </div>
    </section>
  );
}
