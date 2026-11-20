import type { CSSProperties } from "react";

import type { DadosDaForja, JogoComTempo, TimeDaForja } from "@/lib/stats/forja";

import b from "../forja.module.css";
import { CartaoDoAto, Odometro, coresDoTime, preencher } from "../pecas";
import type { TextosDaTela } from "../provedor";
import s from "./tempera.module.css";

/** Quantas linhas em cada lista (mais longas / mais curtas) — o mesmo recorte da página antiga. */
const LIMITE = 8;

type Nomes = Readonly<{ a: string; b: string; vencedor: string }>;

/**
 * ATO VIII — A TÊMPERA. A duração das partidas: todos os jogos com tempo numa régua de minutos
 * (a cor é a de quem venceu), com «O ATROPELO» numa ponta e «O ÉPICO» na outra, a média no meio
 * e, logo abaixo, as duas listas de sempre (mais longas e mais curtas), cada linha levando à
 * partida. Com o ato fixo, uma frente de calor varre a régua e acende os jogos.
 */
export function AtoDaTempera({ dados, t }: Readonly<{ dados: DadosDaForja; t: TextosDaTela }>) {
  const { f, s: st } = t;
  const jogos = dados.duracoes;
  if (jogos.length === 0) return null;

  const timePorId = new Map(dados.times.map((time) => [time.id, time] as const));
  const nomes = (jogo: JogoComTempo): Nomes => ({
    a: timePorId.get(jogo.timeA)?.nome ?? jogo.timeA,
    b: timePorId.get(jogo.timeB)?.nome ?? jogo.timeB,
    vencedor: timePorId.get(jogo.vencedor)?.nome ?? jogo.vencedor,
  });

  const epico = jogos[0]!;
  const atropelo = jogos.at(-1)!;
  const media = Math.round(jogos.reduce((n, jogo) => n + jogo.min, 0) / jogos.length);
  // A régua vai de 5 em 5 minutos, com folga nas duas pontas.
  const inicio = Math.floor(atropelo.min / 5) * 5;
  const fim = Math.max(inicio + 5, Math.ceil(epico.min / 5) * 5);
  const naRegua = (min: number) => ((min - inicio) / (fim - inicio)) * 100;
  const marcas: number[] = [];
  for (let m = inicio; m <= fim; m += 5) marcas.push(m);

  // Jogos com o mesmo minuto empilham: o mais antigo embaixo.
  const porMinuto = new Map<number, JogoComTempo[]>();
  for (const jogo of [...jogos].sort((x, y) => x.serieId.localeCompare(y.serieId) || x.jogo - y.jogo)) {
    porMinuto.set(jogo.min, [...(porMinuto.get(jogo.min) ?? []), jogo]);
  }
  const pilha = Math.max(1, ...[...porMinuto.values()].map((lista) => lista.length));

  const ponta = (jogo: JogoComTempo, rotulo: string, em: number, lado: "atropelo" | "epico") => {
    const n = nomes(jogo);
    const vencedor: TimeDaForja | null = timePorId.get(jogo.vencedor) ?? null;
    return (
      <a
        href={`/partidas/${encodeURIComponent(jogo.serieId)}`}
        className={`${s.ponta} ${lado === "epico" ? s.pontaEpico : ""}`}
        style={coresDoTime(vencedor)}
        data-marca={em.toFixed(2)}
        data-golpe=""
        data-som="clang"
        data-conta={jogo.min}
        data-faisca="forte"
      >
        <span className={s.pontaRotulo}>{rotulo}</span>
        <span className={s.pontaTempo}>
          <Odometro texto={String(jogo.min)} className={s.pontaNumero} />
          <span>{f.temperaMin}</span>
        </span>
        <span className={s.pontaJogo}>
          {n.a} <span aria-hidden>×</span> {n.b}
        </span>
        <span className={s.pontaDetalhe}>
          {st.duracaoJogo} {jogo.jogo} · {st.duracaoVitoria} <strong>{n.vencedor}</strong>
        </span>
      </a>
    );
  };

  const lista = (titulo: string, descricao: string, linhas: readonly JogoComTempo[]) => (
    <div className={s.coluna}>
      <h3 className={s.colunaTitulo}>{titulo}</h3>
      <p className={s.colunaDescricao}>{descricao}</p>
      <ol className={s.linhas}>
        {linhas.map((jogo, i) => {
          const n = nomes(jogo);
          return (
            <li key={`${jogo.serieId}-${jogo.jogo}`}>
              <a href={`/partidas/${encodeURIComponent(jogo.serieId)}`} className={s.linha} style={coresDoTime(timePorId.get(jogo.vencedor) ?? null)}>
                <span className={s.linhaPosicao}>{i + 1}</span>
                <span className={s.linhaJogo}>
                  {n.a} <span aria-hidden>×</span> {n.b}
                  <span>
                    {st.duracaoJogo} {jogo.jogo} · {st.duracaoVitoria} {n.vencedor}
                  </span>
                </span>
                <span className={s.linhaTempo}>
                  {jogo.min}
                  <span>{f.temperaMin}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );

  return (
    // As chaves não são enfeite: este fragmento chega ao provedor (um componente do cliente) como
    // LISTA, e o React pede chave em cada item.
    <>
      <section key="palco" id="ato-tempera" className={`${b.ato} ${s.ato}`} data-ato="tempera" data-fixa="" aria-labelledby="titulo-da-tempera">
        <div className={b.palco}>
          <CartaoDoAto numero={f.atos.tempera.numero} nome={f.atos.tempera.nome} sub={f.atos.tempera.sub} id="titulo-da-tempera" />

          <div className={`${b.cena} ${s.cena}`}>
            {/* no celular a régua não cabe na largura: corre de lado, com o dedo */}
            <div className={s.trilhoDaRegua}>
              <div className={s.regua} data-cena="" style={{ "--pilha": pilha, "--faixa": fim - inicio } as CSSProperties}>
                <ul className={s.jogos}>
                  {[...porMinuto.entries()].flatMap(([min, lista]) =>
                    lista.map((jogo, k) => {
                      const n = nomes(jogo);
                      const vencedor = timePorId.get(jogo.vencedor) ?? null;
                      const x = naRegua(min);
                      return (
                        <li key={`${jogo.serieId}-${jogo.jogo}`} className={s.vaga} style={{ "--x": x.toFixed(2), "--k": k } as CSSProperties}>
                          <a
                            href={`/partidas/${encodeURIComponent(jogo.serieId)}`}
                            className={`${s.jogo} ${b.dica}`}
                            style={coresDoTime(vencedor)}
                            data-dica={`${n.a} × ${n.b} · ${st.duracaoJogo} ${jogo.jogo} · ${jogo.min} ${f.temperaMin}`}
                            aria-label={`${n.a} × ${n.b}, ${st.duracaoJogo} ${jogo.jogo}: ${jogo.min} ${f.temperaMin}, ${st.duracaoVitoria} ${n.vencedor}`}
                            data-marca={(0.2 + (x / 100) * 0.58).toFixed(3)}
                            data-som="tique"
                          >
                            {vencedor?.escudo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={vencedor.escudo} alt="" loading="lazy" decoding="async" draggable={false} />
                            ) : (
                              <span aria-hidden>{vencedor?.sigla ?? "?"}</span>
                            )}
                          </a>
                        </li>
                      );
                    }),
                  )}
                </ul>
                <div className={s.barra} aria-hidden>
                  <span className={s.enfCalor} />
                  <span className={s.enfFrente} />
                </div>
                <ol className={s.minutos} aria-hidden>
                  {marcas.map((m) => (
                    <li key={m} style={{ "--x": naRegua(m).toFixed(2) } as CSSProperties}>
                      {m}
                      <span>{f.temperaMin}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            <div className={s.pontas}>
              {ponta(atropelo, f.temperaAtropelo, 0.2, "atropelo")}
              <p className={s.media} data-marca="0.5" data-som="baque" data-conta={media}>
                <span className={s.mediaRotulo}>{f.temperaMedia}</span>
                <Odometro texto={String(media)} className={s.mediaNumero} />
                <span className={s.mediaMin}>{f.temperaMin}</span>
              </p>
              {ponta(epico, f.temperaEpico, 0.8, "epico")}
            </div>
          </div>

          <p className={b.nota}>{preencher(f.temperaNota, { n: jogos.length })}</p>
        </div>
      </section>

      {/* As listas de sempre, fora do palco fixo: é o respiro para ler. */}
      <div key="listas" className={s.listas}>
        {lista(st.duracaoMaisLongas, st.duracaoMaisLongasDesc, jogos.slice(0, LIMITE))}
        {lista(st.duracaoMaisCurtas, st.duracaoMaisCurtasDesc, [...jogos].reverse().slice(0, LIMITE))}
      </div>
    </>
  );
}
