import { abrirMesa, type Mesa } from "@/lib/series/mesa-de-som";

/**
 * O SOM DA FORJA — os efeitos da /stats, sintetizados na hora (WebAudio) sobre a mesma mesa do
 * show do sorteio (`lib/series/mesa-de-som.ts`): nenhum arquivo de áudio, nada para atravessar a
 * CSP nem para faltar na transmissão.
 *
 * A página passa AO VIVO com alguém narrando por cima, então a regra é a de trilha de fundo:
 *  - tudo curto (o mais longo, o chiado, dura 1,4 s) e nada em laço;
 *  - mixado baixo — os volumes abaixo já são de «cama», e o volume geral começa em 55%;
 *  - o que se repete (tique, catraca) é quase um estalo, para não virar cortina de ruído;
 *  - o compressor da mesa segura o pico quando dois efeitos caem no mesmo instante.
 *
 * O `AudioContext` só nasce depois de um gesto do usuário (o navegador o entrega suspenso fora
 * disso): quem chama `criarSomDaForja` faz isso dentro do clique ou da tecla. Nada aqui pode
 * derrubar a página: todo efeito é embrulhado, e sem WebAudio a página segue muda.
 */

export type SomDaForja = Readonly<{
  /** Martelo na bigorna. `forca` 0–1,3; `pan` −1 (esquerda) a 1 (direita). */
  clang: (forca?: number, pan?: number) => void;
  /** Peça pesada assentando (lingote, placa): grave, sem anel metálico. */
  baque: (forca?: number) => void;
  /** Um estalo de contagem. `altura` 0–1 sobe o tom. */
  tique: (altura?: number) => void;
  /** `quantos` tiques espalhados em `ms`, desacelerando no fim (contagem de número). */
  contagem: (quantos: number, ms: number) => void;
  /** Sopro de passagem (troca de ato, carta voando). `sobe` inverte a varredura. */
  sopro: (sobe?: boolean) => void;
  /** Metal na água: chiado agudo que morre devagar. */
  chiado: (segundos?: number) => void;
  /** Metal derretido correndo/enchendo: grave que afina ao encher. */
  despejo: (segundos?: number) => void;
  /** Trinca abrindo no molde. */
  trinca: () => void;
  /** O molde rachando de vez. */
  estalo: () => void;
  /** Carta saindo/virando. */
  carta: () => void;
  /** Catraca: as linhas do ranking trocando de lugar. */
  catraca: (dentes?: number) => void;
  /** O «VS» batendo na tela. */
  impacto: () => void;
  /** Sino curto do holofote. */
  brilho: () => void;
  /** Toque de interface (botão, aba). */
  clique: () => void;
  /** A porta da fornalha abrindo. */
  porta: () => void;
  /** Volume geral 0–1. */
  volume: (v: number) => void;
  fechar: () => void;
}>;

/** Volume geral de partida: baixo de propósito (a narração vem por cima). */
export const VOLUME_PADRAO = 0.55;

/** Um pouco de acaso no tom, para duas marteladas seguidas não soarem como a mesma gravação. */
function variar(valor: number, quanto = 0.018): number {
  return valor * (1 + (Math.random() * 2 - 1) * quanto);
}

function seguro<A extends unknown[]>(mesa: Mesa, f: (...args: A) => void) {
  return (...args: A) => {
    try {
      if (mesa.ctx.state === "suspended") void mesa.ctx.resume();
      f(...args);
    } catch {
      /* som é enfeite: se falhar, a página continua */
    }
  };
}

export function criarSomDaForja(volumeInicial = VOLUME_PADRAO): SomDaForja | null {
  const mesa = abrirMesa(volumeInicial);
  if (!mesa) return null;
  const { tom, ruido } = mesa;

  /*
   * O clang é um corpo grave curto (a pancada), um estalo de ataque e um ANEL de parciais
   * inarmônicos — as razões de uma barra de aço batida (1 : 2,76 : 5,40 : 8,93), que é o que faz
   * soar «bigorna» e não «sino» nem «nota».
   */
  const clang = (forca = 1, pan = 0) => {
    const f = Math.max(0.2, Math.min(1.3, forca));
    const base = variar(1180);
    tom({ f: 170, f2: 62, tipo: "sine", dur: 0.16, vol: 0.34 * f, saida: { reverb: 0.12, pan } });
    ruido({ dur: 0.022, vol: 0.2 * f, filtro: "highpass", f: 3200, saida: { reverb: 0.1, pan } });
    const parciais: readonly [number, number, number][] = [
      [1, 0.9, 0.075],
      [2.76, 0.62, 0.05],
      [5.4, 0.4, 0.03],
      [8.93, 0.22, 0.016],
    ];
    for (const [razao, dur, vol] of parciais) {
      tom({ f: base * razao, tipo: "sine", dur: dur * (0.7 + f * 0.3), vol: vol * f, ataque: 0.002, saida: { reverb: 0.38, pan } });
    }
  };

  const baque = (forca = 1) => {
    tom({ f: 120, f2: 48, tipo: "sine", dur: 0.26, vol: 0.4 * forca, saida: { reverb: 0.14 } });
    ruido({ dur: 0.09, vol: 0.12 * forca, filtro: "lowpass", f: 520, f2: 160, saida: { reverb: 0.18 } });
  };

  const tique = (altura = 0.5) => {
    tom({ f: variar(1700 + altura * 900, 0.01), tipo: "square", dur: 0.014, vol: 0.022, ataque: 0.001, saida: { reverb: 0.06 } });
    ruido({ dur: 0.01, vol: 0.03, filtro: "highpass", f: 4200, saida: { reverb: 0.04 } });
  };

  const contagem = (quantos: number, ms: number) => {
    // No máximo 14 estalos, não importa o número: acima disso vira chiado em vez de contagem.
    const n = Math.max(1, Math.min(14, Math.round(quantos)));
    const total = Math.max(0.12, ms / 1000);
    for (let i = 0; i < n; i += 1) {
      // Desacelera no fim (curva de saída), como um odômetro chegando.
      const s = (i + 1) / n;
      const quando = total * (1 - Math.pow(1 - s, 2.2));
      tom({ f: 1500 + s * 1100, tipo: "square", em: quando, dur: 0.013, vol: 0.018 + s * 0.012, ataque: 0.001, saida: { reverb: 0.05 } });
    }
  };

  const sopro = (sobe = true) => {
    ruido({
      dur: 0.42,
      vol: 0.11,
      filtro: "bandpass",
      f: sobe ? 320 : 2400,
      f2: sobe ? 2600 : 300,
      q: 1.3,
      ataque: 0.2,
      saida: { reverb: 0.3 },
    });
  };

  const chiado = (segundos = 1.2) => {
    ruido({ dur: segundos, vol: 0.13, filtro: "highpass", f: 5200, f2: 2100, q: 0.6, ataque: 0.012, saida: { reverb: 0.4 } });
    ruido({ dur: segundos * 0.55, vol: 0.06, filtro: "bandpass", f: 900, f2: 380, q: 1.8, ataque: 0.02, saida: { reverb: 0.25 } });
  };

  const despejo = (segundos = 0.9) => {
    ruido({ dur: segundos, vol: 0.1, filtro: "lowpass", f: 180, f2: 950, q: 1.1, ataque: segundos * 0.25, saida: { reverb: 0.3 } });
    tom({ f: 62, f2: 118, tipo: "sine", dur: segundos, vol: 0.12, ataque: segundos * 0.3, saida: { reverb: 0.15 } });
  };

  const trinca = () => {
    for (let i = 0; i < 3; i += 1) {
      ruido({ em: i * 0.045 + Math.random() * 0.02, dur: 0.03, vol: 0.12, filtro: "bandpass", f: variar(1900, 0.2), q: 2.2, saida: { reverb: 0.2 } });
    }
    tom({ f: 150, f2: 80, tipo: "triangle", dur: 0.12, vol: 0.14, saida: { reverb: 0.12 } });
  };

  const estalo = () => {
    tom({ f: 130, f2: 40, tipo: "sine", dur: 0.5, vol: 0.5, saida: { reverb: 0.25 } });
    ruido({ dur: 0.06, vol: 0.26, filtro: "highpass", f: 2200, saida: { reverb: 0.25 } });
    ruido({ dur: 0.5, vol: 0.16, filtro: "lowpass", f: 800, f2: 120, saida: { reverb: 0.4 } });
  };

  const carta = () => {
    ruido({ dur: 0.16, vol: 0.09, filtro: "bandpass", f: 1400, f2: 5200, q: 1.2, ataque: 0.09, saida: { reverb: 0.2 } });
    ruido({ em: 0.15, dur: 0.02, vol: 0.09, filtro: "highpass", f: 3000, saida: { reverb: 0.12 } });
  };

  const catraca = (dentes = 6) => {
    const n = Math.max(2, Math.min(10, dentes));
    for (let i = 0; i < n; i += 1) {
      tom({ f: 2100 - i * 90, tipo: "square", em: i * 0.034, dur: 0.012, vol: 0.02, ataque: 0.001, saida: { reverb: 0.05 } });
    }
    tom({ f: 240, f2: 150, tipo: "sine", em: n * 0.034, dur: 0.1, vol: 0.12, saida: { reverb: 0.1 } });
  };

  const impacto = () => {
    clang(1.2, -0.45);
    // 90 ms depois: o olho lê UM golpe, o ouvido ouve os dois lados chegando.
    const base = variar(1320);
    tom({ f: base, tipo: "sine", em: 0.09, dur: 0.8, vol: 0.07, ataque: 0.002, saida: { reverb: 0.4, pan: 0.45 } });
    tom({ f: base * 2.76, tipo: "sine", em: 0.09, dur: 0.5, vol: 0.045, ataque: 0.002, saida: { reverb: 0.4, pan: 0.45 } });
    ruido({ em: 0.09, dur: 0.022, vol: 0.2, filtro: "highpass", f: 3200, saida: { reverb: 0.1, pan: 0.45 } });
    tom({ f: 96, f2: 34, tipo: "sine", em: 0.09, dur: 1.1, vol: 0.5, saida: { reverb: 0.22 } });
    ruido({ em: 0.09, dur: 1.4, vol: 0.07, filtro: "highpass", f: 5600, q: 0.5, ataque: 0.004, saida: { reverb: 0.6 } });
  };

  const brilho = () => {
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      tom({ f, tipo: "sine", em: i * 0.055, dur: 0.7, vol: 0.03, ataque: 0.004, saida: { reverb: 0.7, pan: i * 0.3 - 0.45 } });
    });
  };

  const clique = () => {
    tom({ f: 1900, tipo: "square", dur: 0.016, vol: 0.022, ataque: 0.001, saida: { reverb: 0.05 } });
    tom({ f: 320, f2: 200, tipo: "sine", dur: 0.05, vol: 0.07, saida: { reverb: 0.06 } });
  };

  const porta = () => {
    // O ferro destrava (clang), o grave da fornalha respira e o ar entra.
    clang(1.1);
    tom({ f: 52, f2: 38, tipo: "sine", em: 0.05, dur: 1.5, vol: 0.34, ataque: 0.25, saida: { reverb: 0.25 } });
    ruido({ em: 0.1, dur: 1.0, vol: 0.1, filtro: "bandpass", f: 240, f2: 2200, q: 1, ataque: 0.5, saida: { reverb: 0.45 } });
  };

  return {
    clang: seguro(mesa, clang),
    baque: seguro(mesa, baque),
    tique: seguro(mesa, tique),
    contagem: seguro(mesa, contagem),
    sopro: seguro(mesa, sopro),
    chiado: seguro(mesa, chiado),
    despejo: seguro(mesa, despejo),
    trinca: seguro(mesa, trinca),
    estalo: seguro(mesa, estalo),
    carta: seguro(mesa, carta),
    catraca: seguro(mesa, catraca),
    impacto: seguro(mesa, impacto),
    brilho: seguro(mesa, brilho),
    clique: seguro(mesa, clique),
    porta: seguro(mesa, porta),
    volume: seguro(mesa, (v: number) => mesa.volume(v)),
    fechar: () => mesa.fechar(),
  };
}

/** Os nomes de efeito que uma marca do roteiro pode pedir (`data-som`). */
export type EfeitoDeMarca =
  | "clang"
  | "clang-forte"
  | "baque"
  | "tique"
  | "sopro"
  | "chiado"
  | "despejo"
  | "trinca"
  | "estalo"
  | "carta"
  | "brilho";

/** Toca o efeito pedido por uma marca. Nome desconhecido não faz nada (e não quebra). */
export function tocarEfeito(som: SomDaForja, efeito: string, pan = 0): void {
  switch (efeito as EfeitoDeMarca) {
    case "clang":
      return som.clang(0.9, pan);
    case "clang-forte":
      return som.clang(1.25, pan);
    case "baque":
      return som.baque();
    case "tique":
      return som.tique();
    case "sopro":
      return som.sopro();
    case "chiado":
      return som.chiado();
    case "despejo":
      return som.despejo();
    case "trinca":
      return som.trinca();
    case "estalo":
      return som.estalo();
    case "carta":
      return som.carta();
    case "brilho":
      return som.brilho();
    default:
      return undefined;
  }
}
