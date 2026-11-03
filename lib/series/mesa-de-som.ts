/**
 * A MESA DE SOM DO SHOW DO SORTEIO — as peças com que a trilha é montada.
 *
 * Tudo é sintetizado na hora (WebAudio): nenhum arquivo de áudio. Um .mp3 seria mais um pedido
 * de rede para atravessar a CSP (`media-src 'self'`), mais peso na página e mais uma coisa para
 * faltar justamente na hora da transmissão. Grave, prato, caixa, acorde e brilho cabem em
 * osciladores, ruído filtrado e envelopes.
 *
 * A cadeia é a de uma mesa de verdade, para o som chegar "de palco" na captura do OBS e não
 * estourar quando vários eventos se sobrepõem (o impacto da revelação soma grave, prato e acorde
 * no mesmo instante):
 *
 *   fontes ──► seco ─────────────┐
 *          └─► envio ► reverb ───┴─► master (volume) ► compressor ► alto-falante
 *
 * O reverb é uma convolução com uma resposta gerada aqui (ruído estéreo decaindo), que dá a
 * sensação de arena sem baixar nenhum arquivo de impulso.
 *
 * Este módulo não sabe nada de sorteio: só fabrica sons. A trilha (o que toca em cada momento)
 * mora em `som-da-cerimonia.ts`. E nada aqui pode derrubar a cerimônia: quem chama embrulha
 * cada evento em try/catch, e um navegador sem WebAudio simplesmente fica sem som.
 */

type ComWebkit = typeof globalThis & { webkitAudioContext?: typeof AudioContext };

/** Onde o som nasce: no seco, no reverb, ou nos dois (a mistura mais comum). */
export type Saida = Readonly<{ seco?: number; reverb?: number; pan?: number }>;

export type Mesa = Readonly<{
  ctx: AudioContext;
  /** Agora, no relógio do áudio. Os eventos marcam o início em segundos a partir daqui. */
  agora: () => number;
  /** Uma nota com envelope (e, se pedido, deslizando de `f` para `f2`). */
  tom: (o: OpcoesDeTom) => void;
  /** Ruído filtrado com varredura de frequência — prato, caixa, sopro, vento. */
  ruido: (o: OpcoesDeRuido) => void;
  /** Volume geral (0–1), em rampa curta para não estalar. */
  volume: (v: number) => void;
  /** Liga um nó montado à mão (cadeias com LFO, laços) às saídas seca/reverb da mesa. */
  ligar: (no: AudioNode, saida?: Saida) => void;
  /** O ruído branco compartilhado, para fontes montadas à mão. */
  branco: AudioBuffer;
  fechar: () => void;
}>;

export type OpcoesDeTom = Readonly<{
  f: number;
  /** Frequência final (deslize exponencial). */
  f2?: number;
  tipo?: OscillatorType;
  /** Segundos a partir de agora. */
  em?: number;
  dur: number;
  vol: number;
  /** Subida do envelope, em segundos. */
  ataque?: number;
  /** Desafinação em cents — dois tons iguais com ±7 cents engordam o timbre. */
  detune?: number;
  saida?: Saida;
}>;

export type OpcoesDeRuido = Readonly<{
  em?: number;
  dur: number;
  vol: number;
  filtro?: BiquadFilterType;
  f: number;
  f2?: number;
  q?: number;
  ataque?: number;
  saida?: Saida;
}>;

/** O piso de silêncio das rampas exponenciais (zero não existe numa rampa exponencial). */
const PISO = 0.0001;

/**
 * Resposta de impulso de uma sala grande: ruído estéreo com cauda exponencial. O começo é
 * levemente atrasado (pré-delay) para o reverb não embolar com o ataque do som seco.
 */
function respostaDeSala(ctx: AudioContext, segundos: number, decaimento: number): AudioBuffer {
  const taxa = ctx.sampleRate;
  const tamanho = Math.max(1, Math.floor(taxa * segundos));
  const preDelay = Math.floor(taxa * 0.018);
  const buffer = ctx.createBuffer(2, tamanho, taxa);
  for (let canal = 0; canal < 2; canal += 1) {
    const dados = buffer.getChannelData(canal);
    for (let i = 0; i < tamanho; i += 1) {
      if (i < preDelay) continue;
      const t = (i - preDelay) / (tamanho - preDelay);
      dados[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decaimento);
    }
  }
  return buffer;
}

/** Dois segundos de ruído branco, reaproveitados por todo ruído da trilha. */
function ruidoBranco(ctx: AudioContext): AudioBuffer {
  const tamanho = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, tamanho, ctx.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < tamanho; i += 1) dados[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Abre a mesa. Devolve `null` se o navegador não tiver WebAudio ou recusar o contexto — e
 * a cerimônia segue muda.
 *
 * O `AudioContext` precisa nascer perto de um gesto do usuário (o clique em "Sortear"): fora
 * disso o navegador o entrega suspenso. Quem chama faz isso no efeito disparado pelo clique.
 */
export function abrirMesa(volumeInicial = 0.8): Mesa | null {
  if (typeof window === "undefined") return null;
  const Construtor = window.AudioContext ?? (window as ComWebkit).webkitAudioContext;
  if (!Construtor) return null;

  let ctx: AudioContext;
  try {
    ctx = new Construtor();
  } catch {
    return null;
  }

  const master = ctx.createGain();
  master.gain.value = volumeInicial;

  // O compressor segura o pico do impacto (grave + prato + acorde juntos) sem achatar o resto.
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 10;
  compressor.ratio.value = 4;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.24;

  master.connect(compressor).connect(ctx.destination);

  const reverb = ctx.createConvolver();
  reverb.buffer = respostaDeSala(ctx, 2.8, 3.4);
  const retornoDoReverb = ctx.createGain();
  retornoDoReverb.gain.value = 0.9;
  reverb.connect(retornoDoReverb).connect(master);

  const branco = ruidoBranco(ctx);

  /** Liga a fonte ao seco, ao reverb e ao pan pedidos. */
  const ligar = (fonte: AudioNode, saida: Saida | undefined) => {
    const seco = saida?.seco ?? 1;
    const molhado = saida?.reverb ?? 0.25;
    let ponto: AudioNode = fonte;
    if (saida?.pan && typeof ctx.createStereoPanner === "function") {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, saida.pan));
      ponto.connect(pan);
      ponto = pan;
    }
    if (seco > 0) {
      const g = ctx.createGain();
      g.gain.value = seco;
      ponto.connect(g).connect(master);
    }
    if (molhado > 0) {
      const g = ctx.createGain();
      g.gain.value = molhado;
      ponto.connect(g).connect(reverb);
    }
  };

  /** Envelope: sobe em `ataque` até `pico` e cai exponencialmente até o fim. */
  const envelope = (ganho: GainNode, inicio: number, ataque: number, pico: number, fim: number) => {
    ganho.gain.setValueAtTime(PISO, inicio);
    ganho.gain.exponentialRampToValueAtTime(Math.max(PISO, pico), inicio + Math.max(0.002, ataque));
    ganho.gain.exponentialRampToValueAtTime(PISO, Math.max(inicio + ataque + 0.004, fim));
  };

  const agora = () => ctx.currentTime;

  const tom = (o: OpcoesDeTom) => {
    const t = ctx.currentTime + (o.em ?? 0);
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = o.tipo ?? "sine";
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2 && o.f2 > 0) osc.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t);
    envelope(ganho, t, o.ataque ?? 0.006, o.vol, t + o.dur);
    osc.connect(ganho);
    ligar(ganho, o.saida);
    osc.start(t);
    osc.stop(t + o.dur + 0.05);
  };

  const ruido = (o: OpcoesDeRuido) => {
    const t = ctx.currentTime + (o.em ?? 0);
    const fonte = ctx.createBufferSource();
    fonte.buffer = branco;
    fonte.loop = true;
    const filtro = ctx.createBiquadFilter();
    filtro.type = o.filtro ?? "bandpass";
    filtro.frequency.setValueAtTime(o.f, t);
    if (o.f2 && o.f2 > 0) filtro.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    filtro.Q.value = o.q ?? 0.8;
    const ganho = ctx.createGain();
    envelope(ganho, t, o.ataque ?? 0.004, o.vol, t + o.dur);
    fonte.connect(filtro).connect(ganho);
    ligar(ganho, o.saida);
    // Começa num ponto qualquer do buffer para dois ruídos seguidos não soarem idênticos.
    fonte.start(t, Math.random() * 1.5);
    fonte.stop(t + o.dur + 0.05);
  };

  const volume = (v: number) => {
    const alvo = Math.max(0, Math.min(1, v));
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(alvo, t + 0.06);
  };

  const fechar = () => {
    try {
      void ctx.close();
    } catch {
      /* já fechado */
    }
  };

  return { ctx, agora, tom, ruido, volume, ligar, branco, fechar };
}
