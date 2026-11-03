import { abrirMesa, type Mesa } from "@/lib/series/mesa-de-som";

/**
 * A TRILHA DO SHOW DO SORTEIO — o que toca em cada momento da cerimônia.
 *
 * Sintetizada na hora sobre a mesa de `mesa-de-som.ts` (osciladores, ruído filtrado, reverb por
 * convolução gerada): nenhum arquivo de áudio, nada para atravessar a CSP nem para faltar na hora
 * da transmissão.
 *
 * O roteiro sonoro acompanha o visual:
 *
 *   abertura  → grave de cinema + sopro que sobe + brilho no ar (os escudos entram)
 *   contagem  → batida de coração + nota que sobe a cada número (3 · 2 · 1)
 *   vai       → pancada com prato e acorde de metais (o giro começa)
 *   giro      → rufar de caixa contínuo + "riser" que vai subindo enquanto a peça gira;
 *               no freio o rufar desacelera junto com a peça
 *   tique     → a catraca: cada fatia/carta que passa pelo ponteiro estala, mais grave e mais
 *               alto quando a peça está quase parando
 *   revelar   → impacto (sub + corpo + prato) e um acorde com a cara do resultado: azul é
 *               maior e brilhante, vermelho é menor e pesado, carta é "lendário" (sinos)
 *   virar     → a carta girando no ar; travar → cada letra do ABCDRAFT batendo no lugar
 *   fracasso  → duas notas descendo (nada foi gravado)
 *
 * O `AudioContext` nasce no efeito disparado pelo clique em "Sortear" — fora de um gesto do
 * usuário o navegador o entrega suspenso. Nada aqui pode derrubar o sorteio: todo evento é
 * embrulhado, e sem WebAudio a cerimônia roda muda.
 */

export type TomDoResultado = "azul" | "vermelho" | "carta" | "dupla";

export type RufarEmCurso = Readonly<{
  /** O rufar e o riser desaceleram até parar em `ms` (acompanha a freada). */
  desacelerar: (ms: number) => void;
  /** Corta já (fechar, erro). */
  parar: () => void;
}>;

export type SomDaCerimonia = Readonly<{
  abertura: () => void;
  /** Pancada de letreiro (0 = o primeiro, 1 = o segundo, mais forte). */
  letreiro: (ordem?: number) => void;
  contagem: (numero: number) => void;
  vai: () => void;
  /** Começa o rufar + riser do giro livre. */
  rufar: () => RufarEmCurso;
  /** Batida de coração da reta final do freio (força 0–1). */
  coracao: (forca?: number) => void;
  /** Uma fatia/carta passou pelo ponteiro. `velocidade` em graus/ms (para o timbre). */
  tique: (velocidade?: number) => void;
  /** Sopro de passagem (troca de cena, carta voando). */
  sopro: () => void;
  revelar: (tom: TomDoResultado) => void;
  virar: () => void;
  travar: (ordem?: number) => void;
  fracasso: () => void;
  /** Volume geral 0–1 (0 = mudo). */
  volume: (v: number) => void;
  fechar: () => void;
}>;

/** Notas (Hz) usadas na trilha — nomes para quem for afinar depois. */
const NOTA = {
  D3: 146.83,
  E3: 164.81,
  A3: 220,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392,
  Gs4: 415.3,
  A4: 440,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  Fs5: 739.99,
  G5: 783.99,
  A5: 880,
  B5: 987.77,
  C6: 1046.5,
  E6: 1318.5,
  G6: 1568,
} as const;

/** Embrulha um evento: som é enfeite, nunca derruba a cerimônia. */
function seguro<A extends unknown[]>(mesa: Mesa, f: (...args: A) => void) {
  return (...args: A) => {
    try {
      if (mesa.ctx.state === "suspended") void mesa.ctx.resume();
      f(...args);
    } catch {
      /* som é enfeite: se falhar, o sorteio continua */
    }
  };
}

export function criarSomDaCerimonia(volumeInicial = 0.8): SomDaCerimonia | null {
  const mesa = abrirMesa(volumeInicial);
  if (!mesa) return null;
  const { ctx, tom, ruido } = mesa;

  /** A pancada grave de cinema: sub que despenca + corpo + estalo. */
  const pancada = (em = 0, forca = 1) => {
    tom({ f: 150, f2: 38, tipo: "sine", em, dur: 1.5 * forca, vol: 0.95 * forca, ataque: 0.004, saida: { reverb: 0.25 } });
    tom({ f: 92, f2: 46, tipo: "triangle", em, dur: 0.55, vol: 0.4 * forca, saida: { reverb: 0.2 } });
    ruido({ em, dur: 0.05, vol: 0.32 * forca, filtro: "highpass", f: 2600, saida: { reverb: 0.1 } });
    ruido({ em, dur: 0.6, vol: 0.38 * forca, filtro: "lowpass", f: 900, f2: 140, saida: { reverb: 0.35 } });
  };

  /** Prato: ruído agudo com cauda longa no reverb. */
  const prato = (em = 0, vol = 0.3, dur = 2.2) => {
    ruido({ em, dur, vol, filtro: "highpass", f: 5200, q: 0.5, ataque: 0.002, saida: { reverb: 0.65 } });
    ruido({ em, dur: dur * 0.6, vol: vol * 0.6, filtro: "bandpass", f: 8200, q: 0.7, saida: { reverb: 0.5 } });
  };

  /** Acorde: cada nota em dois osciladores levemente desafinados (largura de "metais/cordas"). */
  const acorde = (notas: readonly number[], o: { em?: number; dur: number; vol: number; tipo?: OscillatorType; ataque?: number; reverb?: number }) => {
    notas.forEach((f, i) => {
      const pan = notas.length > 1 ? (i / (notas.length - 1)) * 1.2 - 0.6 : 0;
      for (const detune of [-7, 7]) {
        tom({
          f,
          tipo: o.tipo ?? "triangle",
          em: o.em,
          dur: o.dur,
          vol: o.vol,
          ataque: o.ataque ?? 0.02,
          detune,
          saida: { reverb: o.reverb ?? 0.6, pan },
        });
      }
    });
  };

  /** Purpurina: notas agudas curtas espalhadas no ar. */
  const brilho = (em: number, dur: number, quantas: number, base: number = NOTA.C6) => {
    for (let i = 0; i < quantas; i += 1) {
      const quando = em + (dur * i) / quantas + Math.random() * 0.03;
      const f = base * [1, 1.25, 1.5, 2, 2.5, 3][i % 6]!;
      tom({ f, tipo: "sine", em: quando, dur: 0.35, vol: 0.035, saida: { reverb: 0.9, pan: Math.random() * 1.6 - 0.8 } });
    }
  };

  /** Sino (síntese aditiva com parciais inarmônicos): o "pull lendário" da carta. */
  const sino = (f: number, em: number, vol: number) => {
    tom({ f, tipo: "sine", em, dur: 2.4, vol, saida: { reverb: 0.7 } });
    tom({ f: f * 2.76, tipo: "sine", em, dur: 1.1, vol: vol * 0.45, saida: { reverb: 0.7 } });
    tom({ f: f * 5.4, tipo: "sine", em, dur: 0.5, vol: vol * 0.22, saida: { reverb: 0.7 } });
  };

  const abertura = () => {
    // A cama da abertura: sopro subindo e um acorde grave que segura enquanto os letreiros batem
    // (as pancadas são dos letreiros, ver `letreiro`).
    ruido({ dur: 0.5, vol: 0.22, filtro: "bandpass", f: 300, f2: 4200, q: 1.1, ataque: 0.4, saida: { reverb: 0.5 } });
    acorde([NOTA.D3, NOTA.A3, NOTA.D4], { em: 0.1, dur: 2.4, vol: 0.045, tipo: "sawtooth", ataque: 0.25, reverb: 0.7 });
    tom({ f: 41.2, tipo: "sine", dur: 2.2, vol: 0.18, ataque: 0.6, saida: { reverb: 0.2 } });
    brilho(0.9, 1.2, 8, NOTA.D5 * 2);
  };

  /** O letreiro batendo na tela: pancada de trailer com um anel metálico por cima. */
  const letreiro = (ordem = 0) => {
    pancada(0, ordem === 0 ? 0.8 : 1);
    if (ordem > 0) prato(0, 0.2, 2.2);
    [392, 1047, 1663, 2489].forEach((f, i) =>
      tom({ f: f * (ordem === 0 ? 1 : 1.122), tipo: "sine", dur: [1.4, 0.8, 0.55, 0.4][i]!, vol: [0.06, 0.045, 0.03, 0.022][i]!, saida: { reverb: 0.6 } }),
    );
  };

  const contagem = (numero: number) => {
    // Batida de coração: dois golpes graves colados.
    tom({ f: 140, f2: 46, tipo: "sine", dur: 0.42, vol: 0.9, saida: { reverb: 0.15 } });
    tom({ f: 120, f2: 44, tipo: "sine", em: 0.16, dur: 0.36, vol: 0.55, saida: { reverb: 0.15 } });
    ruido({ dur: 0.03, vol: 0.2, filtro: "highpass", f: 3200 });
    // A nota sobe a cada número: 3 → G4, 2 → Bb4, 1 → D5 (tensão crescente).
    const nota = numero >= 3 ? NOTA.G4 : numero === 2 ? NOTA.Bb4 : NOTA.D5;
    tom({ f: nota, tipo: "triangle", dur: 0.9, vol: 0.16, saida: { reverb: 0.7 } });
    tom({ f: nota / 2, tipo: "sine", dur: 0.9, vol: 0.12, saida: { reverb: 0.5 } });
    ruido({ dur: 0.7, vol: 0.18, filtro: "lowpass", f: 140, saida: { reverb: 0.3 } });
  };

  /** O coração da reta final: dois golpes graves, cada vez mais fortes. */
  const coracao = (forca = 1) => {
    tom({ f: 96, f2: 42, tipo: "sine", dur: 0.3, vol: 0.75 * forca, saida: { reverb: 0.12 } });
    tom({ f: 84, f2: 40, tipo: "sine", em: 0.17, dur: 0.28, vol: 0.5 * forca, saida: { reverb: 0.12 } });
    ruido({ dur: 0.05, vol: 0.12 * forca, filtro: "lowpass", f: 300, saida: { reverb: 0.1 } });
  };

  const vai = () => {
    pancada(0, 1.1);
    prato(0, 0.34, 2);
    acorde([NOTA.D4, NOTA.A4, NOTA.D5, NOTA.Fs5], { dur: 0.75, vol: 0.05, tipo: "sawtooth", ataque: 0.01, reverb: 0.5 });
    acorde([NOTA.D3, NOTA.A3], { dur: 0.9, vol: 0.08, tipo: "square", ataque: 0.01, reverb: 0.4 });
  };

  const rufar = (): RufarEmCurso => {
    const t0 = ctx.currentTime;
    const nos: AudioScheduledSourceNode[] = [];

    // Caixa em rufo: ruído na banda da esteira, com o volume modulado por um LFO quadrado.
    const fonte = ctx.createBufferSource();
    fonte.buffer = mesa.branco;
    fonte.loop = true;
    const banda = ctx.createBiquadFilter();
    banda.type = "bandpass";
    banda.frequency.value = 1900;
    banda.Q.value = 0.9;
    const caixa = ctx.createGain();
    caixa.gain.value = 0;
    const lfo = ctx.createOscillator();
    lfo.type = "square";
    lfo.frequency.setValueAtTime(15, t0);
    lfo.frequency.linearRampToValueAtTime(24, t0 + 2.5);
    const profundidade = ctx.createGain();
    profundidade.gain.value = 0.5;
    lfo.connect(profundidade).connect(caixa.gain);
    const nivel = ctx.createGain();
    nivel.gain.setValueAtTime(0.0001, t0);
    nivel.gain.exponentialRampToValueAtTime(0.32, t0 + 0.6);
    fonte.connect(banda).connect(caixa).connect(nivel);
    mesa.ligar(nivel, { reverb: 0.3 });

    // Riser: duas serras desafinadas subindo devagar através de um passa-baixa que abre.
    const passaBaixa = ctx.createBiquadFilter();
    passaBaixa.type = "lowpass";
    passaBaixa.frequency.setValueAtTime(220, t0);
    passaBaixa.frequency.exponentialRampToValueAtTime(2600, t0 + 9);
    passaBaixa.Q.value = 2.5;
    const riser = ctx.createGain();
    riser.gain.setValueAtTime(0.0001, t0);
    riser.gain.exponentialRampToValueAtTime(0.07, t0 + 2.5);
    const serras = [-9, 9].map((detune) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(NOTA.D3 / 2, t0);
      o.frequency.exponentialRampToValueAtTime(NOTA.D3, t0 + 9);
      o.detune.value = detune;
      o.connect(passaBaixa);
      return o;
    });
    passaBaixa.connect(riser);
    mesa.ligar(riser, { reverb: 0.45 });

    fonte.start(t0);
    lfo.start(t0);
    serras.forEach((o) => o.start(t0));
    nos.push(fonte, lfo, ...serras);

    let parado = false;
    const pararEm = (quando: number) => {
      for (const no of nos) {
        try {
          no.stop(quando);
        } catch {
          /* já parado */
        }
      }
    };

    return {
      desacelerar: (ms: number) => {
        if (parado) return;
        try {
          const t = ctx.currentTime;
          // A tensão cresce até 150 ms ANTES da parada e corta: o silêncio curto antes do impacto
          // é o que faz a pancada da revelação parecer enorme (o "respira" de trailer).
          const fim = t + Math.max(0.2, ms / 1000 - 0.15);
          lfo.frequency.cancelScheduledValues(t);
          lfo.frequency.setValueAtTime(lfo.frequency.value, t);
          lfo.frequency.exponentialRampToValueAtTime(5, fim);
          riser.gain.cancelScheduledValues(t);
          riser.gain.setValueAtTime(Math.max(0.0001, riser.gain.value), t);
          riser.gain.exponentialRampToValueAtTime(0.11, fim);
          passaBaixa.frequency.cancelScheduledValues(t);
          passaBaixa.frequency.setValueAtTime(passaBaixa.frequency.value, t);
          passaBaixa.frequency.exponentialRampToValueAtTime(4200, fim);
          nivel.gain.cancelScheduledValues(t);
          nivel.gain.setValueAtTime(Math.max(0.0001, nivel.gain.value), t);
          nivel.gain.exponentialRampToValueAtTime(0.42, fim);
          nivel.gain.exponentialRampToValueAtTime(0.0001, fim + 0.03);
          riser.gain.exponentialRampToValueAtTime(0.0001, fim + 0.03);
          parado = true;
          pararEm(fim + 0.1);
        } catch {
          /* enfeite */
        }
      },
      parar: () => {
        if (parado) return;
        parado = true;
        try {
          const t = ctx.currentTime;
          for (const g of [nivel, riser]) {
            g.gain.cancelScheduledValues(t);
            g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
          }
          pararEm(t + 0.15);
        } catch {
          /* enfeite */
        }
      },
    };
  };

  const tique = (velocidade = 1) => {
    // Rápido: estalo agudo e leve. Quase parando: "toc" de madeira, mais grave e mais alto —
    // as últimas fatias são as que a plateia conta em voz alta.
    const lento = Math.max(0, Math.min(1, 1 - velocidade / 0.5));
    tom({ f: 1500 - lento * 700, tipo: "square", dur: 0.022 + lento * 0.04, vol: 0.045 + lento * 0.07, saida: { reverb: 0.12 } });
    ruido({ dur: 0.016, vol: 0.07 + lento * 0.05, filtro: "highpass", f: 3800, saida: { reverb: 0.05 } });
    if (lento > 0.4) tom({ f: 220, f2: 140, tipo: "sine", dur: 0.08, vol: 0.18 * lento, saida: { reverb: 0.1 } });
  };

  const sopro = () => {
    ruido({ dur: 0.42, vol: 0.2, filtro: "bandpass", f: 500, f2: 3600, q: 1.4, ataque: 0.2, saida: { reverb: 0.4 } });
  };

  const revelar = (tomDoResultado: TomDoResultado) => {
    pancada(0, 1.2);
    prato(0, 0.36, 2.8);
    if (tomDoResultado === "azul") {
      // Mi maior com nona: aberto, brilhante, "frio".
      acorde([NOTA.E3, NOTA.B3, NOTA.E4, NOTA.Gs4, NOTA.Fs5], { em: 0.02, dur: 2.8, vol: 0.06, tipo: "triangle", reverb: 0.75 });
      acorde([NOTA.E4, NOTA.B4], { em: 0.02, dur: 1.4, vol: 0.035, tipo: "sawtooth", reverb: 0.6 });
      brilho(0.18, 1.3, 12, NOTA.E5 * 2);
    } else if (tomDoResultado === "vermelho") {
      // Ré menor pesado: quinta grave em onda quadrada (aspereza) e a terça menor em cima.
      acorde([NOTA.D3, NOTA.A3, NOTA.D4, NOTA.F4, NOTA.A4], { em: 0.02, dur: 2.6, vol: 0.055, tipo: "sawtooth", reverb: 0.65 });
      acorde([NOTA.D3, NOTA.A3], { em: 0.02, dur: 1.6, vol: 0.06, tipo: "square", reverb: 0.4 });
      tom({ f: 73.4, f2: 55, tipo: "sine", em: 0.02, dur: 2.2, vol: 0.4, saida: { reverb: 0.3 } });
    } else {
      // A carta: sinos em arpejo (o "pull lendário") e um acorde maior com sétima por baixo.
      const arpejo = [NOTA.C5, NOTA.E5, NOTA.G5, NOTA.B5, NOTA.C6, NOTA.E6, NOTA.G6];
      arpejo.forEach((f, i) => sino(f, 0.05 + i * 0.07, 0.07));
      acorde([NOTA.C4, NOTA.E4, NOTA.G4, NOTA.B4], { em: 0.02, dur: 3, vol: 0.05, tipo: "triangle", reverb: 0.8 });
      if (tomDoResultado === "dupla") {
        acorde([NOTA.A3, NOTA.E4], { em: 0.4, dur: 2.4, vol: 0.05, tipo: "sawtooth", reverb: 0.7 });
      }
      brilho(0.5, 1.8, 16, NOTA.C6);
    }
  };

  const virar = () => {
    ruido({ dur: 0.22, vol: 0.24, filtro: "bandpass", f: 1200, f2: 6400, q: 1.2, ataque: 0.12, saida: { reverb: 0.3 } });
    ruido({ em: 0.2, dur: 0.035, vol: 0.3, filtro: "highpass", f: 2800, saida: { reverb: 0.2 } });
  };

  const travar = (ordem = 0) => {
    tom({ f: 230, f2: 90, tipo: "sine", dur: 0.18, vol: 0.6, saida: { reverb: 0.2 } });
    tom({ f: 2400 + ordem * 300, tipo: "square", dur: 0.09, vol: 0.045, saida: { reverb: 0.5 } });
    tom({ f: 3600 + ordem * 450, tipo: "triangle", dur: 0.14, vol: 0.04, saida: { reverb: 0.6 } });
    ruido({ dur: 0.04, vol: 0.25, filtro: "bandpass", f: 1800, q: 2 });
  };

  const fracasso = () => {
    tom({ f: 311.13, tipo: "sawtooth", dur: 0.26, vol: 0.09, saida: { reverb: 0.4 } });
    tom({ f: 233.08, tipo: "sawtooth", em: 0.2, dur: 0.5, vol: 0.08, saida: { reverb: 0.4 } });
    tom({ f: 110, f2: 70, tipo: "sine", em: 0.2, dur: 0.6, vol: 0.3, saida: { reverb: 0.2 } });
  };

  return {
    abertura: seguro(mesa, abertura),
    letreiro: seguro(mesa, letreiro),
    contagem: seguro(mesa, contagem),
    vai: seguro(mesa, vai),
    rufar: (() => {
      const vazio: RufarEmCurso = { desacelerar: () => {}, parar: () => {} };
      return () => {
        try {
          if (ctx.state === "suspended") void ctx.resume();
          return rufar();
        } catch {
          return vazio;
        }
      };
    })(),
    tique: seguro(mesa, tique),
    coracao: seguro(mesa, coracao),
    sopro: seguro(mesa, sopro),
    revelar: seguro(mesa, revelar),
    virar: seguro(mesa, virar),
    travar: seguro(mesa, travar),
    fracasso: seguro(mesa, fracasso),
    volume: seguro(mesa, (v: number) => mesa.volume(v)),
    fechar: () => mesa.fechar(),
  };
}
