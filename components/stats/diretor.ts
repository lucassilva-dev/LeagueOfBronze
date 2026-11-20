/**
 * O DIRETOR DA /stats — o roteiro amarrado à rolagem.
 *
 * Um único `requestAnimationFrame` para a página inteira. A cada quadro ele lê a rolagem UMA vez,
 * calcula em que ponto de cada ato a pessoa está (`p`, de 0 a 1), suaviza esse número e:
 *
 *   - escreve `--p` no ato (o CSS usa para tudo que é CONTÍNUO: canais, parallax, cartão do ato);
 *   - acende/apaga as MARCAS (`data-marca="0.42"` → `data-aceso="1|0"`), que disparam o que é
 *     GOLPE: a placa que bate, a carta que sai, o som, a faísca;
 *   - avisa a cena 3D e quem mais quiser desenhar no mesmo quadro (`aCadaQuadro`).
 *
 * A rolagem é a NATIVA do navegador: nada de scroll-jacking. No computador os atos FIXAM por CSS
 * (`position: sticky`, ligado por `data-pinos`); no celular não fixam, e as marcas acendem quando
 * entram na tela.
 *
 * REGRA DE SEGURANÇA (a mesma do resto do site: animação nunca decide se o conteúdo aparece).
 * O HTML do servidor não tem `--p` nem `data-aceso`: sem eles o CSS mostra tudo no estado final.
 * Os estados «frios» só existem enquanto ESTE laço roda. Se ele parar (erro, navegador que
 * suspende o rAF), o vigia `desarma`: tira `--p`, tira `data-aceso`, e a página volta ao estado
 * final. Com movimento reduzido o diretor nem arma — só acompanha em que ato a pessoa está.
 */

export type EventoDeMarca = Readonly<{
  tipo: "marca";
  el: HTMLElement;
  ato: string;
  acesa: boolean;
  /** A pessoa está descendo a página (ou viajando para a frente): é quando o som toca. */
  frente: boolean;
  /** Centro do elemento na tela, de 0 a 1 (para a faísca e o pan do som). */
  x: number;
  y: number;
}>;

export type EventoDeAto = Readonly<{ tipo: "ato"; indice: number; id: string }>;
export type EventoDoDiretor = EventoDeMarca | EventoDeAto;

/** O que a cena 3D (e qualquer desenho por quadro) lê do diretor. É mutável: leia, não guarde. */
export type EstadoDoDiretor = {
  armado: boolean;
  pinos: boolean;
  reduzido: boolean;
  atoAtual: number;
  /** `p` suavizado de cada ato, na ordem da página. */
  progresso: number[];
  /** Posição contínua na página: índice do ato + o `p` dele (2,35 = 35% do terceiro ato). */
  posicao: number;
  /** Velocidade da rolagem, em telas por segundo (suavizada; negativa subindo). */
  velocidade: number;
  /** O ponteiro, de −1 a 1 em cada eixo (suavizado; 0 sem mouse). */
  ponteiroX: number;
  ponteiroY: number;
  viajando: boolean;
};

/** O que o painel de bordo assina (só muda quando troca de ato ou de modo). */
export type RetratoDoDiretor = Readonly<{
  atoAtual: number;
  total: number;
  armado: boolean;
  pinos: boolean;
  viajando: boolean;
}>;

type Marca = { el: HTMLElement; em: number; acesa: boolean; topo: number; golpe: boolean };
type Cena = { el: HTMLElement; topo: number; altura: number; p: number; escrito: number };
type Ato = {
  id: string;
  el: HTMLElement;
  fixa: boolean;
  topo: number;
  altura: number;
  alvo: number;
  p: number;
  escrito: number;
  visivel: boolean | null;
  marcas: Marca[];
  cenas: Cena[];
  camadas: HTMLElement[];
};

/** Largura e altura mínimas para os atos fixarem (abaixo disso a página corre em fluxo). */
const LARGURA_DOS_PINOS = 1280;
const ALTURA_DOS_PINOS = 560;
/** Constante de tempo da suavização do `p` (ms): tira o tranco do degrau da roda do mouse. */
const TAU = 115;
/** Intervalo mínimo entre dois GOLPES (ms): nada bate — nem pisca — mais de 3 vezes por segundo. */
const INTERVALO_DE_GOLPE = 340;
/** O ponto do ato em que tudo já foi revelado e ele ainda está fixo (destino das viagens). */
const PONTO_REVELADO = 0.965;

const limitar = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
const suaveEntraSai = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export class Diretor {
  readonly estado: EstadoDoDiretor = {
    armado: false,
    pinos: false,
    reduzido: false,
    atoAtual: 0,
    progresso: [],
    posicao: 0,
    velocidade: 0,
    ponteiroX: 0,
    ponteiroY: 0,
    viajando: false,
  };

  private raiz: HTMLElement | null = null;
  private atos: Ato[] = [];
  private laco: number | null = null;
  private vigia: ReturnType<typeof setInterval> | null = null;
  private ultimoQuadro = 0;
  private ultimoY = 0;
  private vh = 1;
  private cab = 70;
  private ponteiroAlvoX = 0;
  private ponteiroAlvoY = 0;
  private ponteiroEscritoX = 99;
  private ponteiroEscritoY = 99;
  private ponteiroFino = false;
  private sincronizando = true;
  private proximoGolpe = 0;
  private filaDeGolpes: { ato: Ato; marca: Marca }[] = [];
  private viagem: { de: number; para: number; inicio: number; dur: number } | null = null;
  private ouvintes = new Set<(ev: EventoDoDiretor) => void>();
  private quadros = new Set<(dt: number, estado: EstadoDoDiretor) => void>();
  private assinantes = new Set<() => void>();
  private retratoAtual: RetratoDoDiretor = { atoAtual: 0, total: 0, armado: false, pinos: false, viajando: false };
  private observador: ResizeObserver | null = null;
  /** O vigia desarmou (o laço ficou tempo demais sem rodar): se o laço voltar, a página rearma. */
  private suspenso = false;
  private limpezas: (() => void)[] = [];

  // ------------------------------------------------------------------ assinaturas

  ouvir(f: (ev: EventoDoDiretor) => void): () => void {
    this.ouvintes.add(f);
    return () => this.ouvintes.delete(f);
  }

  aCadaQuadro(f: (dt: number, estado: EstadoDoDiretor) => void): () => void {
    this.quadros.add(f);
    return () => this.quadros.delete(f);
  }

  assinar = (f: () => void): (() => void) => {
    this.assinantes.add(f);
    return () => this.assinantes.delete(f);
  };

  retrato = (): RetratoDoDiretor => this.retratoAtual;

  /** Os ids dos atos, na ordem da página (para o painel de bordo). */
  idsDosAtos(): string[] {
    return this.atos.map((ato) => ato.id);
  }

  // ------------------------------------------------------------------ ciclo de vida

  iniciar(raiz: HTMLElement): void {
    this.parar();
    this.raiz = raiz;
    this.estado.reduzido = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    this.ponteiroFino = window.matchMedia?.("(pointer: fine)").matches === true;
    this.coletar();
    this.definirModo();
    this.medir();
    this.ultimoY = window.scrollY;
    this.ultimoQuadro = performance.now();
    this.sincronizando = true;

    if (!this.estado.reduzido) {
      this.estado.armado = true;
      raiz.dataset.cine = "armado";
    }

    const aoRedimensionar = () => {
      this.definirModo();
      this.medir();
    };
    const aoMoverPonteiro = (ev: PointerEvent) => {
      if (ev.pointerType && ev.pointerType !== "mouse") return;
      this.ponteiroAlvoX = (ev.clientX / Math.max(1, window.innerWidth)) * 2 - 1;
      this.ponteiroAlvoY = (ev.clientY / Math.max(1, window.innerHeight)) * 2 - 1;
    };
    // Qualquer gesto de rolagem da pessoa cancela a viagem: ela nunca fica presa numa animação.
    const cancelarViagem = () => this.encerrarViagem();
    const aoMudarVisibilidade = () => {
      if (document.visibilityState === "visible") this.ultimoQuadro = performance.now();
    };

    window.addEventListener("resize", aoRedimensionar);
    window.addEventListener("pointermove", aoMoverPonteiro, { passive: true });
    window.addEventListener("wheel", cancelarViagem, { passive: true });
    window.addEventListener("touchstart", cancelarViagem, { passive: true });
    document.addEventListener("visibilitychange", aoMudarVisibilidade);
    this.limpezas.push(() => {
      window.removeEventListener("resize", aoRedimensionar);
      window.removeEventListener("pointermove", aoMoverPonteiro);
      window.removeEventListener("wheel", cancelarViagem);
      window.removeEventListener("touchstart", cancelarViagem);
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    });

    // A altura da página muda sem `resize`: fonte que chega, lista que expande, imagem que carrega.
    if (typeof ResizeObserver === "function") {
      this.observador = new ResizeObserver(() => this.medir());
      this.observador.observe(raiz);
    }

    // O primeiro passo roda JÁ, antes da pintura: sem ele haveria um quadro com os pinos ligados e
    // tudo ainda no estado final (as placas acesas piscando antes de esfriar).
    try {
      this.passo(performance.now());
    } catch (erro) {
      console.error("[forja] o diretor não armou:", erro);
      this.desarmar();
      return;
    }
    this.laco = requestAnimationFrame(this.quadro);
    this.vigia = setInterval(() => {
      if (!this.estado.armado || document.visibilityState !== "visible") return;
      // Quatro segundos sem um quadro, com a aba à vista: algo travou. A página volta ao estado
      // final (tudo revelado) — e rearma sozinha se o laço retomar (`quadro`).
      if (performance.now() - this.ultimoQuadro > 4000) {
        this.desarmar();
        this.suspenso = true;
      }
    }, 1000);
    this.publicar();
  }

  parar(): void {
    if (this.laco !== null) cancelAnimationFrame(this.laco);
    this.laco = null;
    if (this.vigia !== null) clearInterval(this.vigia);
    this.vigia = null;
    this.observador?.disconnect();
    this.observador = null;
    for (const limpar of this.limpezas) limpar();
    this.limpezas = [];
    if (this.raiz) this.desarmar();
    this.suspenso = false;
    this.raiz = null;
    this.atos = [];
  }

  /** O laço voltou depois de o vigia desarmar: liga de novo, acertando tudo em silêncio. */
  private rearmar(): void {
    this.suspenso = false;
    if (!this.raiz || this.estado.reduzido) return;
    this.estado.armado = true;
    this.raiz.dataset.cine = "armado";
    for (const ato of this.atos) {
      ato.escrito = -1;
      ato.visivel = null;
      for (const cena of ato.cenas) cena.escrito = -1;
    }
    this.sincronizando = true;
    this.definirModo();
    this.medir();
    this.ultimoQuadro = performance.now();
    this.publicar();
  }

  /** Volta tudo ao estado final do HTML: sem `--p`, sem marcas apagadas, sem pinos. */
  desarmar(): void {
    this.estado.armado = false;
    this.estado.pinos = false;
    this.viagem = null;
    this.estado.viajando = false;
    this.filaDeGolpes = [];
    for (const ato of this.atos) {
      ato.el.style.removeProperty("--p");
      delete ato.el.dataset.visivel;
      for (const cena of ato.cenas) cena.el.style.removeProperty("--p");
      for (const marca of ato.marcas) {
        delete marca.el.dataset.aceso;
        delete marca.el.dataset.bateu;
      }
      for (const camada of ato.camadas) {
        camada.style.removeProperty("--mx");
        camada.style.removeProperty("--my");
      }
    }
    if (this.raiz) {
      this.raiz.dataset.cine = "desarmado";
      this.raiz.dataset.pinos = "0";
      delete this.raiz.dataset.viajando;
    }
    this.publicar();
  }

  // ------------------------------------------------------------------ medição

  private coletar(): void {
    const raiz = this.raiz;
    if (!raiz) return;
    this.atos = [...raiz.querySelectorAll<HTMLElement>("[data-ato]")].map((el) => ({
      id: el.dataset.ato ?? "",
      el,
      fixa: el.dataset.fixa !== undefined,
      topo: 0,
      altura: 1,
      alvo: 0,
      p: 0,
      escrito: -1,
      visivel: null,
      marcas: [...el.querySelectorAll<HTMLElement>("[data-marca]")].map((m) => ({
        el: m,
        em: Number(m.dataset.marca) || 0,
        acesa: true,
        topo: 0,
        golpe: m.dataset.golpe !== undefined,
      })),
      cenas: [...el.querySelectorAll<HTMLElement>("[data-cena]")].map((c) => ({ el: c, topo: 0, altura: 1, p: 1, escrito: -1 })),
      camadas: [...el.querySelectorAll<HTMLElement>("[data-paralaxe]")],
    }));
    this.estado.progresso = this.atos.map(() => 0);
  }

  /** Quem entrou na página depois de montada (lista que expandiu) é recolhido aqui. */
  recoletar(): void {
    if (!this.raiz) return;
    const apagadas = new Map<HTMLElement, boolean>();
    for (const ato of this.atos) for (const marca of ato.marcas) apagadas.set(marca.el, marca.acesa);
    const progresso = this.atos.map((ato) => ato.p);
    this.coletar();
    this.atos.forEach((ato, i) => {
      ato.p = progresso[i] ?? 0;
      for (const marca of ato.marcas) marca.acesa = apagadas.get(marca.el) ?? true;
    });
    this.medir();
  }

  private definirModo(): void {
    const raiz = this.raiz;
    if (!raiz) return;
    this.vh = window.innerHeight || 1;
    const cabecalho = document.getElementById("lob-cabecalho");
    this.cab = cabecalho ? Math.round(cabecalho.getBoundingClientRect().height) : 0;
    raiz.style.setProperty("--cab", `${this.cab}px`);
    const querPinos = !this.estado.reduzido && window.innerWidth >= LARGURA_DOS_PINOS && this.vh >= ALTURA_DOS_PINOS;
    if (this.estado.pinos !== querPinos) this.sincronizando = true;
    this.estado.pinos = querPinos;
    raiz.dataset.pinos = querPinos ? "1" : "0";
  }

  medir(): void {
    const y = window.scrollY;
    this.vh = window.innerHeight || 1;
    for (const ato of this.atos) {
      const r = ato.el.getBoundingClientRect();
      ato.topo = r.top + y;
      ato.altura = Math.max(1, r.height);
      for (const marca of ato.marcas) marca.topo = marca.el.getBoundingClientRect().top + y;
      for (const cena of ato.cenas) {
        const rc = cena.el.getBoundingClientRect();
        cena.topo = rc.top + y;
        cena.altura = Math.max(1, rc.height);
      }
    }
  }

  // ------------------------------------------------------------------ o quadro

  private quadro = (agora: number): void => {
    this.laco = requestAnimationFrame(this.quadro);
    try {
      if (this.suspenso) this.rearmar();
      this.passo(agora);
    } catch (erro) {
      // Um erro aqui não pode deixar a página presa num estado «frio».
      console.error("[forja] o diretor parou:", erro);
      this.desarmar();
      if (this.laco !== null) cancelAnimationFrame(this.laco);
      this.laco = null;
    }
  };

  private passo(agora: number): void {
    const dt = Math.min(64, Math.max(1, agora - this.ultimoQuadro));
    this.ultimoQuadro = agora;
    const estado = this.estado;
    const k = 1 - Math.exp(-dt / TAU);

    if (this.viagem) this.avancarViagem(agora);

    const y = window.scrollY;
    const vh = this.vh;
    const palco = Math.max(1, vh - this.cab);

    const bruta = ((y - this.ultimoY) / vh) * (1000 / dt);
    const frente = y > this.ultimoY || (this.viagem !== null && this.viagem.para > this.viagem.de);
    this.ultimoY = y;
    estado.velocidade += (bruta - estado.velocidade) * (1 - Math.exp(-dt / 160));

    estado.ponteiroX += (this.ponteiroAlvoX - estado.ponteiroX) * (1 - Math.exp(-dt / 220));
    estado.ponteiroY += (this.ponteiroAlvoY - estado.ponteiroY) * (1 - Math.exp(-dt / 220));
    const moverCamadas =
      estado.armado &&
      this.ponteiroFino &&
      (Math.abs(estado.ponteiroX - this.ponteiroEscritoX) > 0.004 || Math.abs(estado.ponteiroY - this.ponteiroEscritoY) > 0.004);
    if (moverCamadas) {
      this.ponteiroEscritoX = estado.ponteiroX;
      this.ponteiroEscritoY = estado.ponteiroY;
    }

    let atual = 0;
    for (let i = 0; i < this.atos.length; i += 1) {
      const ato = this.atos[i]!;
      const visivel = y + vh > ato.topo - vh * 0.2 && y < ato.topo + ato.altura + vh * 0.2;
      if (y + vh * 0.55 >= ato.topo) atual = i;

      const fixado = estado.pinos && ato.fixa;
      ato.alvo = fixado
        ? limitar((y + this.cab - ato.topo) / Math.max(1, ato.altura - palco))
        : limitar((y + vh - ato.topo) / (Math.min(ato.altura, vh) + vh * 0.2));

      if (this.sincronizando) ato.p = ato.alvo;
      else {
        ato.p += (ato.alvo - ato.p) * k;
        if (Math.abs(ato.alvo - ato.p) < 0.0004) ato.p = ato.alvo;
      }
      estado.progresso[i] = ato.p;

      if (!estado.armado) continue;

      if (ato.visivel !== visivel) {
        ato.visivel = visivel;
        ato.el.dataset.visivel = visivel ? "1" : "0";
      }
      if (!visivel && !this.sincronizando) continue;

      if (Math.abs(ato.p - ato.escrito) > 0.0005) {
        ato.escrito = ato.p;
        ato.el.style.setProperty("--p", ato.p.toFixed(4));
      }

      // Sem pinos, cada cena tem o seu próprio `p`: quanto ela já entrou na tela.
      if (!fixado) {
        for (const cena of ato.cenas) {
          const alvo = limitar((y + vh - cena.topo) / (cena.altura + vh * 0.25));
          cena.p = this.sincronizando ? alvo : cena.p + (alvo - cena.p) * k;
          if (Math.abs(cena.p - cena.escrito) > 0.0005) {
            cena.escrito = cena.p;
            cena.el.style.setProperty("--p", cena.p.toFixed(4));
          }
        }
      } else {
        for (const cena of ato.cenas) {
          if (cena.escrito !== -1) {
            cena.escrito = -1;
            cena.el.style.removeProperty("--p");
          }
        }
      }

      for (const marca of ato.marcas) {
        const acesa = fixado
          ? ato.p >= marca.em - (marca.acesa ? 0.012 : 0)
          : marca.acesa
            ? y + vh > marca.topo - 4
            : y + vh * 0.86 >= marca.topo;
        if (acesa === marca.acesa && marca.el.dataset.aceso !== undefined) continue;
        if (acesa && marca.golpe && !this.sincronizando && frente) {
          // Golpe entra na fila: um de cada vez, com o intervalo mínimo entre eles.
          if (!this.filaDeGolpes.some((item) => item.marca === marca)) this.filaDeGolpes.push({ ato, marca });
          continue;
        }
        this.acender(ato, marca, acesa, frente && !this.sincronizando);
      }

      if (moverCamadas) {
        for (const camada of ato.camadas) {
          camada.style.setProperty("--mx", estado.ponteiroX.toFixed(3));
          camada.style.setProperty("--my", estado.ponteiroY.toFixed(3));
        }
      }
    }

    // A fila de golpes: o próximo só bate quando passou o intervalo (e se a marca ainda vale).
    if (this.filaDeGolpes.length > 0 && agora >= this.proximoGolpe) {
      const item = this.filaDeGolpes.shift()!;
      const aindaVale = estado.pinos && item.ato.fixa ? item.ato.p >= item.marca.em - 0.012 : true;
      if (aindaVale && !item.marca.acesa) {
        this.acender(item.ato, item.marca, true, true);
        this.proximoGolpe = agora + INTERVALO_DE_GOLPE;
      }
    }

    this.sincronizando = false;
    estado.posicao = atual + (this.atos[atual]?.p ?? 0);
    if (atual !== estado.atoAtual) {
      estado.atoAtual = atual;
      this.emitir({ tipo: "ato", indice: atual, id: this.atos[atual]?.id ?? "" });
      this.publicar();
    }

    for (const f of this.quadros) f(dt, estado);
  }

  private acender(ato: Ato, marca: Marca, acesa: boolean, comEfeito: boolean): void {
    marca.acesa = acesa;
    marca.el.dataset.aceso = acesa ? "1" : "0";
    // `data-bateu` liga a animação de golpe: só quando a pessoa viu acontecer, nunca no acerto
    // silencioso de quem recarregou a página no meio.
    if (acesa && comEfeito) marca.el.dataset.bateu = "1";
    else delete marca.el.dataset.bateu;
    if (this.ouvintes.size === 0 || this.sincronizando) return;
    const r = marca.el.getBoundingClientRect();
    this.emitir({
      tipo: "marca",
      el: marca.el,
      ato: ato.id,
      acesa,
      frente: comEfeito,
      x: limitar((r.left + r.width / 2) / Math.max(1, window.innerWidth)),
      y: limitar((r.top + r.height / 2) / Math.max(1, this.vh)),
    });
  }

  private emitir(ev: EventoDoDiretor): void {
    for (const f of this.ouvintes) {
      try {
        f(ev);
      } catch {
        /* quem ouve não derruba o roteiro */
      }
    }
  }

  private publicar(): void {
    const e = this.estado;
    const r = this.retratoAtual;
    if (r.atoAtual === e.atoAtual && r.total === this.atos.length && r.armado === e.armado && r.pinos === e.pinos && r.viajando === e.viajando) return;
    this.retratoAtual = { atoAtual: e.atoAtual, total: this.atos.length, armado: e.armado, pinos: e.pinos, viajando: e.viajando };
    for (const f of this.assinantes) f();
  }

  // ------------------------------------------------------------------ viagens (← →, painel)

  /** Para o ato vizinho. Devolve false se não há para onde ir. */
  viajar(delta: 1 | -1): boolean {
    const destino = this.estado.atoAtual + delta;
    if (destino < 0 || destino >= this.atos.length) return false;
    this.irPara(destino);
    return true;
  }

  irPara(indice: number): void {
    const ato = this.atos[indice];
    if (!ato) return;
    this.medir();
    const palco = Math.max(1, this.vh - this.cab);
    const fixado = this.estado.pinos && ato.fixa;
    // Ato fixo: o destino é o ponto em que a cena já se montou — a viagem passa por todos os
    // quadros do meio, e é isso que faz a transição parecer um corte de cinema e não um pulo.
    const alvo = fixado ? ato.topo - this.cab + (ato.altura - palco) * PONTO_REVELADO : ato.topo - this.cab;
    const maximo = Math.max(0, document.documentElement.scrollHeight - this.vh);
    const para = limitar(Math.round(alvo), 0, maximo);
    const de = window.scrollY;
    if (Math.abs(para - de) < 2) return;

    if (this.estado.reduzido || !this.estado.armado) {
      window.scrollTo(0, para);
      return;
    }
    const telas = Math.abs(para - de) / this.vh;
    this.viagem = { de, para, inicio: performance.now(), dur: limitar(telas * 900, 1100, 4200) };
    this.estado.viajando = true;
    if (this.raiz) this.raiz.dataset.viajando = "1";
    this.publicar();
  }

  private avancarViagem(agora: number): void {
    const v = this.viagem;
    if (!v) return;
    const t = limitar((agora - v.inicio) / v.dur);
    window.scrollTo(0, v.de + (v.para - v.de) * suaveEntraSai(t));
    if (t >= 1) this.encerrarViagem();
  }

  private encerrarViagem(): void {
    if (!this.viagem) return;
    this.viagem = null;
    this.estado.viajando = false;
    if (this.raiz) delete this.raiz.dataset.viajando;
    this.publicar();
  }
}
