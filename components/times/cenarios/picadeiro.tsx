import p from "@/components/times/cenarios/picadeiro.module.css";
import pf from "@/components/times/cenarios/picadeiro-ficha.module.css";
import { Cartola, CartolaMini, Fa, Pedestal } from "@/components/times/cenarios/ornamentos-picadeiro";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/**
 * Cenário "picadeiro" — DESORGANIZAÇÃO, «O Circo da Desorganização»: o time da organização do
 * campeonato, que admite que tudo isto é um circo — e que o circo é deles. Debaixo da lona preta
 * e vinho, o canhão de luz procura o leão, ele salta para o pedestal e acorda (olhos de ouro); o
 * nome se organiza letra por letra — menos o DES, que são os palhaços e ficam tortos para sempre.
 * O elenco são os cartazes das atrações pendurados na cortina; o capitão é o mestre de picadeiro
 * (a cartola); a página fecha no cartaz da temporada com a tarja «SUJEITO A ATRASO».
 */
export const PICADEIRO: CenarioDoTema = {
  classes: p,
  classesDaFicha: pf,
  Fundo: () => (
    <>
      <div className={p.enfLona} />
      <div className={cx(p.enfTrapezio, p.enfTrapezioEsq)} />
      <div className={cx(p.enfTrapezio, p.enfTrapezioDir)} />
    </>
  ),
  // A sanefa da lona no padding de cima; a plateia (silhuetas) no padding de baixo.
  Moldura: () => (
    <>
      <span className={p.enfSanefa} aria-hidden="true" />
      <span className={p.enfPublico} aria-hidden="true">
        <Fa className={p.enfFa} />
        <Fa className={p.enfFa} />
        <Fa className={p.enfFa} />
      </span>
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={p.enfRaios} aria-hidden="true" />
      <span className={p.enfFeixe} aria-hidden="true" />
      <span className={p.enfCanhao} aria-hidden="true" />
    </>
  ),
  // Os olhos do leão, DENTRO do escudo (andam com ele no salto).
  NoEscudo: () => (
    <>
      <span className={cx(p.enfOlho, p.enfOlhoEsq)} aria-hidden="true" />
      <span className={cx(p.enfOlho, p.enfOlhoDir)} aria-hidden="true" />
    </>
  ),
  // O picadeiro (serragem com meio-fio) e o pedestal onde o leão pousa.
  Chao: () => (
    <div className={p.enfPicadeiro} aria-hidden="true">
      <span className={p.enfSerragem} />
      <Pedestal className={p.enfPedestal} id="dsg-pedestal" />
    </div>
  ),
  Insignia: ({ className, id }) => <Cartola className={className} id={id} />,
  InsigniaMini: ({ className }) => <CartolaMini className={className} />,
  AtrasDoRetrato: () => <span className={pf.enfRaiosRetrato} aria-hidden="true" />,
  AtrasDoElenco: () => (
    <div className={p.enfCortina} aria-hidden="true">
      <span className={p.enfBambinela} />
    </div>
  ),
  NaCartela: () => <span className={p.enfEstrelasCartaz} aria-hidden="true" />,
};
