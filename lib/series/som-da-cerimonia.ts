/**
 * O SOM DA CERIMÔNIA — tique da roda e fanfarra do resultado.
 *
 * Sintetizado com osciladores, sem nenhum arquivo de áudio: um .mp3 seria mais um pedido de
 * rede para atravessar a CSP, mais peso na página e mais uma coisa para faltar justamente na
 * hora da transmissão. Um clique e um arpejo cabem em dois osciladores.
 *
 * O `AudioContext` nasce DENTRO do clique que abre o sorteio. Navegador nenhum deixa tocar
 * som sem gesto do usuário, e esta é a única janela em que o gesto existe — criar o contexto
 * mais tarde (quando a roda já está girando) o deixaria suspenso e mudo.
 *
 * Nada aqui pode derrubar o sorteio: toda chamada é embrulhada, e um navegador sem WebAudio
 * simplesmente devolve `null` e a cerimônia roda muda.
 */

export type SomDaCerimonia = Readonly<{
  tique: () => void;
  fanfarra: () => void;
  fracasso: () => void;
  fechar: () => void;
}>;

type ComWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

export function criarSomDaCerimonia(): SomDaCerimonia | null {
  if (typeof window === "undefined") return null;

  const Construtor = window.AudioContext ?? (window as ComWebkit).webkitAudioContext;
  if (!Construtor) return null;

  let ctx: AudioContext;
  try {
    ctx = new Construtor();
  } catch {
    return null;
  }

  /** Uma nota curta. Envelope simples: sobe rápido, cai exponencial, nunca estala. */
  const nota = (
    frequencia: number,
    inicioEm: number,
    duracao: number,
    volume: number,
    forma: OscillatorType = "triangle",
  ) => {
    const t = ctx.currentTime + inicioEm;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();

    osc.type = forma;
    osc.frequency.setValueAtTime(frequencia, t);

    // Sem a rampa de subida o início da nota vira um "clique" de alto-falante.
    ganho.gain.setValueAtTime(0.0001, t);
    ganho.gain.exponentialRampToValueAtTime(volume, t + 0.008);
    ganho.gain.exponentialRampToValueAtTime(0.0001, t + duracao);

    osc.connect(ganho).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + duracao + 0.02);
  };

  const seguro = (f: () => void) => () => {
    try {
      // Alguns navegadores entregam o contexto suspenso mesmo vindo de um clique.
      if (ctx.state === "suspended") void ctx.resume();
      f();
    } catch {
      /* som é enfeite: se falhar, o sorteio continua. */
    }
  };

  return {
    tique: seguro(() => nota(1180, 0, 0.035, 0.055, "square")),

    // Arpejo maior: a resolução para cima é o que faz soar como "deu certo".
    fanfarra: seguro(() => {
      [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => nota(hz, i * 0.085, 0.34, 0.13));
      nota(1318.5, 0.36, 0.55, 0.1);
    }),

    // Duas notas descendo: o oposto reconhecível da fanfarra.
    fracasso: seguro(() => {
      nota(311.13, 0, 0.22, 0.1, "sawtooth");
      nota(233.08, 0.16, 0.4, 0.09, "sawtooth");
    }),

    fechar: () => {
      try {
        void ctx.close();
      } catch {
        /* já fechado */
      }
    },
  };
}
