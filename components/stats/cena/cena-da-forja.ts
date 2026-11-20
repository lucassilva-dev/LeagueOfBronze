import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  PMREMGenerator,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  Points,
  SRGBColorSpace,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

import type { EstadoDoDiretor } from "../diretor";
import { relevoDe, type Relevo } from "./relevo";

/**
 * A CENA 3D DA FORJA — um canvas só, fixo atrás da página, dirigido pelo diretor da rolagem.
 *
 * O protagonista é UMA peça: o emblema do campeonato forjado em relevo de metal (sem fundo: a
 * silhueta é recortada da própria imagem). Ele nasce derretido na abertura, ganha relevo a cada
 * martelada, troca de metal conforme os elos sobem e é recunhado com o escudo de cada time. Em
 * volta: a bigorna, a luz da fornalha, brasas subindo. Nenhum dado mora aqui — se a cena não
 * carregar, a página perde clima, não conteúdo.
 *
 * Tudo procedural (nenhum modelo, nenhum HDR): a CSP do site não deixa buscar nada fora.
 *
 * DESEMPENHO. O laço é o do diretor (um `requestAnimationFrame` para a página inteira; com a aba
 * oculta ele para sozinho). O monitor mede o tempo de quadro e desce de degrau — alta → média →
 * baixa → desliga (a página fica com o fundo 2D) —, e nos atos de leitura a cena desenha um
 * quadro sim, um não.
 */

export type Qualidade = "alta" | "media" | "baixa";

export type DadosDaCena = Readonly<{
  /** Os ids dos atos, na ordem da página. */
  atos: readonly string[];
  /** As cores dos elos, de Ferro para cima (a ordem das colunas do ato «liga»). */
  elos: readonly string[];
  /** Os times, na ordem dos moldes (ato «moldes»). */
  times: readonly Readonly<{ id: string; escudo: string | null }>[];
  emblema: string;
}>;

type Nivel = Readonly<{ nome: Qualidade; dpr: number; bloom: boolean; brasas: number; amostras: number }>;
const NIVEIS: readonly Nivel[] = [
  { nome: "baixa", dpr: 1, bloom: false, brasas: 18, amostras: 0 },
  { nome: "media", dpr: 1.25, bloom: true, brasas: 30, amostras: 0 },
  { nome: "alta", dpr: 1.5, bloom: true, brasas: 44, amostras: 4 },
];

/** Onde a peça fica em cada ato: centro (em fração da tela, −1 a 1), altura (fração da tela),
 *  quanto a cena aparece e quanto a boca da fornalha está acesa. */
type Pose = Readonly<{ x: number; y: number; tam: number; presenca: number; fornalha: number }>;
const FORA: Pose = { x: 0.84, y: 1.75, tam: 0.19, presenca: 0.28, fornalha: 0.3 };
const POSES: Readonly<Record<string, Pose>> = {
  fornalha: { x: 0.63, y: 0.12, tam: 0.52, presenca: 1, fornalha: 1 },
  liga: { x: 0.8, y: 0.68, tam: 0.21, presenca: 0.6, fornalha: 0.5 },
  moldes: { x: 0.82, y: 0.71, tam: 0.19, presenca: 0.55, fornalha: 0.6 },
  pecas: FORA,
  canais: FORA,
  bigorna: FORA,
  arsenal: { ...FORA, presenca: 0.12, fornalha: 0 },
  tempera: FORA,
  fecho: { x: 0.62, y: 0.42, tam: 0.36, presenca: 0.85, fornalha: 0.25 },
};

/** As marteladas da abertura (o `p` do ato em que cada placa bate — o mesmo roteiro do HTML). */
const GOLPES = [0.2, 0.35, 0.5, 0.65] as const;
/** O calor da peça depois de cada martelada: derretida → brasa → morna → fria. */
const CALOR_POR_GOLPE = [1, 0.74, 0.5, 0.26, 0.04] as const;
const RELEVO_POR_GOLPE = [0.1, 0.36, 0.6, 0.82, 1] as const;

const FOV = 32;
const DISTANCIA = 9;
const limitar = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
const misturar = (a: number, b: number, t: number) => a + (b - a) * t;

/** A cor de um metal quente: preto → vermelho fundo → laranja → amarelo → branco. */
const RAMPA = [new Color("#000000"), new Color("#6b1606"), new Color("#ff5a1a"), new Color("#ffc061"), new Color("#fff3dc")];
function corDoCalor(calor: number, saida: Color): Color {
  const t = limitar(calor) * (RAMPA.length - 1);
  const i = Math.min(RAMPA.length - 2, Math.floor(t));
  return saida.copy(RAMPA[i]!).lerp(RAMPA[i + 1]!, t - i);
}

function texturaDeBrilho(): CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.55)");
  g.addColorStop(0.6, "rgba(255,255,255,0.12)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export class CenaDaForja {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(FOV, 1, 0.1, 60);
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private readonly peca = new Group();
  private readonly frente: Mesh<PlaneGeometry, MeshStandardMaterial>;
  private readonly costas: Mesh<PlaneGeometry, MeshStandardMaterial>[] = [];
  private readonly brilho: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly fornalha: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly luzDaPeca = new PointLight(0xff7a2a, 0, 14, 2);
  private readonly brasas: Points<BufferGeometry, ShaderMaterial>;
  private readonly vapor: Points<BufferGeometry, ShaderMaterial>;
  private readonly descartaveis: { dispose: () => void }[] = [];
  private readonly relevos = new Map<string, Relevo>();
  private relevoAtual = "";
  private relevoPedido = "";

  private nivel: number;
  private fixo: boolean;
  private largura = 1;
  private altura = 1;
  private tempo = 0;
  private quadros = 0;
  private somaDeTempo = 0;
  private janelasRuins = 0;
  private janelasBoas = 0;
  private jaSubiu = false;
  private morta = false;

  // o estado suavizado da peça
  private readonly posicao = new Vector3(4, 0.4, 0);
  private tamanho = 1.2;
  private presenca = 1;
  private fornalhaAcesa = 1;
  private calor = 1;
  private relevo = 0.1;
  private readonly tinta = new Color(1, 1, 1);
  private readonly tintaAlvo = new Color(1, 1, 1);
  private golpesVistos = 0;
  private tranco = 0;
  private giro = 1;
  private clarao = 0;
  private vaporVivo = 0;
  private mergulhou = false;

  private readonly corTemp = new Color();
  private readonly vetorTemp = new Vector3();

  constructor(
    canvas: HTMLCanvasElement,
    private readonly dados: DadosDaCena,
    private readonly avisos: Readonly<{
      /** A qualidade mudou (ou a cena desistiu: null — a página volta ao fundo 2D). */
      qualidade: (q: Qualidade | null) => void;
      /** Uma martelada bateu na peça: onde ela está na tela (0–1), para as faíscas. */
      golpe: (x: number, y: number, forca: number) => void;
    }>,
    inicial: Qualidade | null,
  ) {
    this.fixo = inicial !== null;
    const forte = (navigator.hardwareConcurrency ?? 4) >= 8 && window.innerWidth >= 1280;
    this.nivel = inicial ? NIVEIS.findIndex((n) => n.nome === inicial) : forte ? 2 : 1;

    // Canvas TRANSPARENTE: a cena compõe por cima do fundo da página (o mesmo gradiente que fica
    // quando não há 3D). Com fundo opaco, o caminho com pós-processamento passava a cor de fundo
    // pelo tone mapping e a página inteira ganhava um véu marrom.
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance", stencil: false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setClearColor(0x000000, 0);

    this.camera.position.set(0, 0, DISTANCIA);

    // ---- o ambiente: softboxes numa caixa escura, filtrados por PMREM (é o que o metal reflete)
    const ambiente = new Scene();
    const caixa = new BoxGeometry(1, 1, 1);
    this.descartaveis.push(caixa);
    const painel = (cor: number, forca: number, pos: [number, number, number], escala: [number, number, number]) => {
      const m = new MeshBasicMaterial({ color: new Color(cor).multiplyScalar(forca) });
      this.descartaveis.push(m);
      const malha = new Mesh(caixa, m);
      malha.position.set(...pos);
      malha.scale.set(...escala);
      ambiente.add(malha);
    };
    painel(0xffe2b0, 9, [-5, 4, 4], [5, 4, 0.2]); // a luz quente principal, alta à esquerda
    painel(0xff9a55, 2.4, [0, -5, 2], [9, 0.2, 6]); // a fornalha, de baixo
    painel(0x57d8cb, 3.2, [6, 2, -3], [0.2, 5, 5]); // o contraluz frio, à direita
    painel(0xfff3dc, 2.2, [0, 6, -2], [7, 0.2, 5]); // um teto morno
    painel(0x1a120a, 1, [0, 0, -8], [20, 20, 0.2]);
    const pmrem = new PMREMGenerator(this.renderer);
    const alvoDoAmbiente = pmrem.fromScene(ambiente, 0.035);
    this.scene.environment = alvoDoAmbiente.texture;
    pmrem.dispose();
    this.descartaveis.push(alvoDoAmbiente);

    // ---- luzes
    const principal = new DirectionalLight(0xffe6c2, 2.4);
    principal.position.set(-3.5, 4.5, 6);
    const contra = new DirectionalLight(0x57d8cb, 1.1);
    contra.position.set(5, 2, -4);
    this.scene.add(principal, contra, this.luzDaPeca);

    // ---- a peça: a frente em relevo e as «costas» (camadas atrás, que dão a espessura)
    const geoFrente = new PlaneGeometry(2, 2, 144, 144);
    const matFrente = new MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.92,
      roughness: 0.36,
      alphaTest: 0.5,
      emissive: new Color(0, 0, 0),
      displacementScale: 0.02,
      normalScale: new Vector2(0.1, 0.1),
      envMapIntensity: 1.25,
    });
    this.frente = new Mesh(geoFrente, matFrente);
    this.peca.add(this.frente);
    this.descartaveis.push(geoFrente, matFrente);
    const geoCostas = new PlaneGeometry(2, 2);
    this.descartaveis.push(geoCostas);
    for (let k = 1; k <= 5; k += 1) {
      const m = new MeshStandardMaterial({ color: 0x3a2412, metalness: 0.9, roughness: 0.5, alphaTest: 0.5, side: DoubleSide });
      const malha = new Mesh(geoCostas, m);
      malha.position.z = -0.014 * k;
      this.peca.add(malha);
      this.costas.push(malha);
      this.descartaveis.push(m);
    }
    this.peca.visible = false; // só aparece com o relevo carregado
    this.scene.add(this.peca);

    // ---- o brilho atrás da peça (a boca da fornalha)
    const texBrilho = texturaDeBrilho();
    const geoBrilho = new PlaneGeometry(1, 1);
    const matBrilho = new MeshBasicMaterial({ map: texBrilho, color: 0xff6a2b, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
    this.brilho = new Mesh(geoBrilho, matBrilho);
    this.scene.add(this.brilho);
    this.descartaveis.push(texBrilho, geoBrilho, matBrilho);

    // ---- a boca da fornalha: um clarão largo e baixo, embaixo da tela (é de onde a luz vem)
    const matFornalha = new MeshBasicMaterial({ map: texBrilho, color: 0xff5a1a, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5 });
    this.fornalha = new Mesh(geoBrilho, matFornalha);
    this.fornalha.position.set(0, -3.9, -2);
    this.fornalha.scale.set(26, 4.6, 1);
    this.scene.add(this.fornalha);
    this.descartaveis.push(matFornalha);

    // ---- brasas: poucas, grandes e lentas (partícula fina em tela cheia vira bloco no vídeo)
    this.brasas = this.criarParticulas(NIVEIS[2]!.brasas, true);
    this.vapor = this.criarParticulas(18, false);
    this.vapor.visible = false;
    this.scene.add(this.brasas, this.vapor);

    this.aplicarNivel();
    this.avisos.qualidade(NIVEIS[this.nivel]!.nome);
    void this.carregarRelevos();
  }

  // ------------------------------------------------------------------ partículas

  private criarParticulas(quantas: number, brasa: boolean): Points<BufferGeometry, ShaderMaterial> {
    const geo = new BufferGeometry();
    const pos = new Float32Array(quantas * 3);
    const tam = new Float32Array(quantas);
    const fase = new Float32Array(quantas);
    for (let i = 0; i < quantas; i += 1) {
      pos[i * 3] = (Math.random() * 2 - 1) * 8;
      pos[i * 3 + 1] = brasa ? Math.random() * 7 - 3.2 : -50;
      pos[i * 3 + 2] = Math.random() * 6 - 4.5;
      tam[i] = brasa ? 0.16 + Math.random() * 0.24 : 0.5 + Math.random() * 0.7;
      fase[i] = Math.random() * Math.PI * 2;
    }
    geo.setAttribute("position", new BufferAttribute(pos, 3));
    geo.setAttribute("aTam", new BufferAttribute(tam, 1));
    geo.setAttribute("aFase", new BufferAttribute(fase, 1));
    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: brasa ? AdditiveBlending : NormalBlending,
      uniforms: {
        uTempo: { value: 0 },
        uEscala: { value: 800 },
        uCor: { value: new Color(brasa ? 0xff7a2a : 0xcfc6b8) },
        uOpacidade: { value: brasa ? 0.8 : 0 },
      },
      vertexShader: /* glsl */ `
        attribute float aTam;
        attribute float aFase;
        uniform float uTempo;
        uniform float uEscala;
        varying float vPisca;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aTam * uEscala / -mv.z;
          vPisca = 0.6 + 0.4 * sin(uTempo * 1.3 + aFase);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uCor;
        uniform float uOpacidade;
        varying float vPisca;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          // miolo quente e borda bem macia: a brasa é uma mancha de luz, não um ponto
          float a = smoothstep(0.5, 0.0, d);
          a = a * a * vPisca * uOpacidade;
          gl_FragColor = vec4(uCor * (0.5 + vPisca * 0.7), a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.descartaveis.push(geo, mat);
    const pontos = new Points(geo, mat);
    pontos.frustumCulled = false;
    return pontos;
  }

  // ------------------------------------------------------------------ relevos (emblema e escudos)

  private async carregarRelevos(): Promise<void> {
    try {
      this.relevos.set("", await relevoDe(this.dados.emblema));
      if (this.morta) return;
      this.aplicarRelevo("");
      this.peca.visible = true;
      // Os escudos dos times entram depois, um por vez, sem travar a abertura.
      for (const time of this.dados.times) {
        if (!time.escudo) continue;
        await new Promise((ok) => setTimeout(ok, 120));
        if (this.morta) return;
        try {
          this.relevos.set(time.id, await relevoDe(time.escudo, "esmalte"));
        } catch {
          /* escudo que não carregou: a peça fica com o emblema */
        }
      }
    } catch {
      // Sem o relevo do emblema não há peça: a cena fica só com a fornalha e as brasas.
    }
  }

  private aplicarRelevo(chave: string): void {
    const r = this.relevos.get(chave);
    if (!r) return;
    this.relevoAtual = chave;
    const m = this.frente.material;
    m.map = r.cor;
    m.alphaMap = r.alfa;
    m.displacementMap = r.altura;
    m.normalMap = r.normal;
    m.needsUpdate = true;
    for (const costa of this.costas) {
      costa.material.alphaMap = r.alfa;
      costa.material.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------------ qualidade

  private aplicarNivel(): void {
    const nivel = NIVEIS[this.nivel]!;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nivel.dpr));
    this.renderer.setSize(this.largura, this.altura, false);
    this.composer?.dispose();
    this.bloom?.dispose();
    this.composer = null;
    this.bloom = null;
    if (nivel.bloom) {
      const composer = new EffectComposer(this.renderer);
      if (nivel.amostras > 0) {
        composer.renderTarget1.samples = nivel.amostras;
        composer.renderTarget2.samples = nivel.amostras;
      }
      composer.addPass(new RenderPass(this.scene, this.camera));
      // Só o metal quente e as brasas passam do limiar: o resto da cena não «lava».
      this.bloom = new UnrealBloomPass(new Vector2(this.largura / 2, this.altura / 2), 0.46, 0.5, 0.96);
      composer.addPass(this.bloom);
      composer.addPass(new OutputPass());
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, nivel.dpr));
      composer.setSize(this.largura, this.altura);
      this.composer = composer;
    }
    this.brasas.geometry.setDrawRange(0, nivel.brasas);
  }

  private medir(dt: number): void {
    if (this.fixo) return;
    this.quadros += 1;
    this.somaDeTempo += dt;
    if (this.quadros < 75) return;
    const media = this.somaDeTempo / this.quadros;
    this.quadros = 0;
    this.somaDeTempo = 0;
    if (this.tempo < 2.5) return; // o aquecimento (compilar shaders, subir texturas) não conta

    if (media > 21) {
      this.janelasBoas = 0;
      this.janelasRuins += 1;
      if (this.janelasRuins >= 2) {
        this.janelasRuins = 0;
        if (this.nivel > 0) {
          this.nivel -= 1;
          this.aplicarNivel();
          this.avisos.qualidade(NIVEIS[this.nivel]!.nome);
        } else if (media > 30) {
          // Nem no degrau mais baixo dá: a página fica com o fundo 2D.
          this.avisos.qualidade(null);
        }
      }
    } else {
      this.janelasRuins = 0;
      if (media < 10.5 && this.nivel < NIVEIS.length - 1 && !this.jaSubiu) {
        this.janelasBoas += 1;
        if (this.janelasBoas >= 6) {
          this.jaSubiu = true;
          this.nivel += 1;
          this.aplicarNivel();
          this.avisos.qualidade(NIVEIS[this.nivel]!.nome);
        }
      }
    }
  }

  // ------------------------------------------------------------------ comandos

  redimensionar(largura: number, altura: number): void {
    this.largura = Math.max(1, largura);
    this.altura = Math.max(1, altura);
    this.camera.aspect = this.largura / this.altura;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.largura, this.altura, false);
    this.composer?.setSize(this.largura, this.altura);
    this.bloom?.resolution.set(this.largura / 2, this.altura / 2);
    (this.brasas.material.uniforms.uEscala as { value: number }).value = this.altura * 0.9;
    (this.vapor.material.uniforms.uEscala as { value: number }).value = this.altura * 0.9;
  }

  /** O metal vai para a água: um resto de calor some de uma vez e sobe vapor. */
  private mergulhar(): void {
    if (this.mergulhou) return;
    this.mergulhou = true;
    this.calor = Math.max(this.calor, 0.55);
    this.vaporVivo = 2.4;
    this.vapor.visible = true;
    const pos = this.vapor.geometry.getAttribute("position") as BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setXYZ(i, this.posicao.x + (Math.random() - 0.5) * 2.2, this.posicao.y - 0.9 + Math.random() * 0.7, (Math.random() - 0.5) * 0.8);
    }
    pos.needsUpdate = true;
  }

  /** Onde a peça está na tela (0–1 em cada eixo). */
  private naTela(): { x: number; y: number } {
    this.vetorTemp.copy(this.posicao).project(this.camera);
    return { x: limitar(this.vetorTemp.x * 0.5 + 0.5), y: limitar(-this.vetorTemp.y * 0.5 + 0.5) };
  }

  // ------------------------------------------------------------------ o quadro

  quadro(dtMs: number, estado: EstadoDoDiretor): void {
    if (this.morta) return;
    const dt = Math.min(0.064, dtMs / 1000);
    this.tempo += dt;
    this.medir(dtMs);

    const ato = this.dados.atos[estado.atoAtual] ?? "fornalha";
    const p = estado.progresso[estado.atoAtual] ?? 0;
    const pose = POSES[ato] ?? FORA;

    // ---- o que o roteiro pede agora (tudo sai do `p`: recarregar no meio dá o estado certo)
    let golpes: number = GOLPES.length;
    let escudo = "";
    this.tintaAlvo.setRGB(1, 1, 1);
    if (ato === "fornalha") {
      golpes = GOLPES.filter((em) => p >= em).length;
    } else if (ato === "liga") {
      const i = Math.floor((p - 0.2) / 0.085);
      const cor = this.dados.elos[Math.min(this.dados.elos.length - 1, i)];
      if (i >= 0 && cor) this.tintaAlvo.set(cor).lerp(this.corTemp.setRGB(1, 1, 1), 0.25);
    } else if (ato === "moldes") {
      const i = Math.floor((p - 0.19) / 0.078);
      const time = this.dados.times[Math.min(this.dados.times.length - 1, i)];
      if (i >= 0 && time?.escudo) escudo = time.id;
    }
    // No fecho o metal vai para a água (uma vez por visita ao ato).
    if (ato === "fecho") this.mergulhar();
    else this.mergulhou = false;

    // ---- martelada: a peça leva o tranco e a página solta as faíscas onde ela está
    if (golpes > this.golpesVistos && estado.armado && !estado.reduzido) {
      this.tranco = 1;
      this.clarao = 1;
      const onde = this.naTela();
      this.avisos.golpe(onde.x, onde.y, golpes === GOLPES.length ? 1 : 0.75);
    }
    this.golpesVistos = golpes;

    // ---- recunhar: o giro troca o relevo na metade do caminho
    if (escudo !== this.relevoPedido && this.relevos.has(escudo)) {
      this.relevoPedido = escudo;
      this.giro = 0;
    }
    if (this.giro < 1) {
      this.giro = Math.min(1, this.giro + dt / 0.7);
      if (this.giro >= 0.5 && this.relevoAtual !== this.relevoPedido) {
        this.aplicarRelevo(this.relevoPedido);
        this.clarao = Math.max(this.clarao, 0.5);
      }
    }

    // ---- suavizações (constantes de tempo, não por quadro)
    const k = (tau: number) => 1 - Math.exp(-dt / tau);
    const meiaAltura = Math.tan((FOV * Math.PI) / 360) * DISTANCIA;
    const alvoX = pose.x * meiaAltura * this.camera.aspect;
    const alvoY = pose.y * meiaAltura;
    this.posicao.x = misturar(this.posicao.x, alvoX, k(0.5));
    this.posicao.y = misturar(this.posicao.y, alvoY, k(0.5));
    this.tamanho = misturar(this.tamanho, pose.tam * meiaAltura, k(0.5));
    this.presenca = misturar(this.presenca, pose.presenca, k(0.6));
    this.fornalhaAcesa = misturar(this.fornalhaAcesa, pose.fornalha, k(0.7));
    this.calor = misturar(this.calor, CALOR_POR_GOLPE[golpes]!, k(golpes === 0 ? 0.2 : 0.9));
    this.relevo = misturar(this.relevo, RELEVO_POR_GOLPE[golpes]!, k(0.35));
    this.tinta.lerp(this.tintaAlvo, k(0.45));
    this.tranco = Math.max(0, this.tranco - dt / 0.42);
    this.clarao = Math.max(0, this.clarao - dt / 0.5);

    // ---- a peça
    const sacode = this.tranco * this.tranco;
    const virada = this.giro < 1 ? (1 - Math.cos(this.giro * Math.PI)) * Math.PI : 0;
    this.peca.position.set(this.posicao.x, this.posicao.y + Math.sin(this.tempo * 0.9) * 0.05 - sacode * 0.12, sacode * -0.25);
    this.peca.scale.setScalar(this.tamanho * (1 + sacode * 0.06));
    this.peca.rotation.set(
      Math.cos(this.tempo * 0.42) * 0.05 - estado.ponteiroY * 0.14 + limitar(estado.velocidade, -2, 2) * 0.06,
      Math.sin(this.tempo * 0.5) * 0.2 + estado.ponteiroX * 0.22 + virada,
      Math.sin(this.tempo * 0.33) * 0.02 + sacode * 0.05,
    );
    const mf = this.frente.material;
    // O derretido é amarelo-laranja, não branco: a forma da peça tem de se ler desde o começo.
    const quente = limitar(this.calor + this.clarao * 0.25);
    corDoCalor(quente * 0.8, mf.emissive);
    mf.emissiveIntensity = Math.pow(quente, 1.5) * 1.75;
    // o metal quente não reflete: a cor (e o reflexo) aparecem conforme ele esfria
    const frio = 1 - limitar(this.calor * 1.15);
    mf.color.copy(this.tinta).multiplyScalar(0.12 + 0.88 * frio);
    mf.envMapIntensity = 0.2 + 1.15 * frio;
    mf.displacementScale = 0.02 + 0.13 * this.relevo;
    mf.normalScale.setScalar(0.1 + 1.25 * this.relevo);
    for (const costa of this.costas) {
      corDoCalor(quente * 0.62, costa.material.emissive);
      costa.material.emissiveIntensity = Math.pow(quente, 1.5) * 1.1;
    }

    // ---- a luz e o brilho da fornalha acompanham o calor
    const forca = limitar(this.calor + this.clarao * 0.6);
    this.luzDaPeca.position.set(this.posicao.x, this.posicao.y - 0.2, 1.3);
    // Fria, a peça é iluminada por uma luz morna (é o que a faz BRONZE, e não vermelha);
    // quente, a luz é a do próprio metal.
    this.luzDaPeca.intensity = (14 + forca * 34) * this.presenca;
    corDoCalor(0.45 + forca * 0.3, this.corTemp);
    this.luzDaPeca.color.set(0xffe0b4).lerp(this.corTemp, limitar(forca * 1.4));
    this.brilho.position.set(this.posicao.x, this.posicao.y - this.tamanho * 0.1, -1.1);
    this.brilho.scale.setScalar(this.tamanho * (2.5 + forca * 0.9));
    this.brilho.material.opacity = (0.1 + forca * 0.3) * this.presenca;

    // ---- a boca da fornalha respira (devagar: nada pisca) e apaga nos atos de leitura
    this.fornalha.material.opacity = (0.16 + Math.sin(this.tempo * 0.7) * 0.03 + forca * 0.14) * this.fornalhaAcesa;

    // ---- a câmera: desliza de leve com o mouse (as camadas se separam: é o parallax)
    this.camera.position.x = estado.ponteiroX * 0.32;
    this.camera.position.y = -estado.ponteiroY * 0.2;
    this.camera.lookAt(0, 0, 0);

    this.moverBrasas(dt);
    this.moverVapor(dt);

    // Nos atos de leitura a cena quase não aparece: desenha um quadro sim, um não.
    if (this.presenca < 0.4 && Math.round(this.tempo * 60) % 2 === 1) return;
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
  }

  private moverBrasas(dt: number): void {
    const u = this.brasas.material.uniforms;
    (u.uTempo as { value: number }).value = this.tempo;
    (u.uOpacidade as { value: number }).value = 0.3 + this.presenca * 0.5;
    const pos = this.brasas.geometry.getAttribute("position") as BufferAttribute;
    const fase = this.brasas.geometry.getAttribute("aFase") as BufferAttribute;
    const quantas = NIVEIS[this.nivel]!.brasas;
    for (let i = 0; i < quantas; i += 1) {
      let y = pos.getY(i) + (0.16 + (fase.getX(i) % 1) * 0.3) * dt;
      let x = pos.getX(i) + Math.sin(this.tempo * 0.6 + fase.getX(i)) * 0.12 * dt;
      if (y > 4.2) {
        y = -3.4;
        x = (Math.random() * 2 - 1) * 8;
      }
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
  }

  private moverVapor(dt: number): void {
    if (this.vaporVivo <= 0) {
      this.vapor.visible = false;
      return;
    }
    this.vaporVivo -= dt;
    const vida = limitar(this.vaporVivo / 2.4);
    const u = this.vapor.material.uniforms;
    (u.uOpacidade as { value: number }).value = Math.sin(vida * Math.PI) * 0.34;
    (u.uEscala as { value: number }).value = this.altura * (0.9 + (1 - vida) * 1.6);
    const pos = this.vapor.geometry.getAttribute("position") as BufferAttribute;
    const fase = this.vapor.geometry.getAttribute("aFase") as BufferAttribute;
    for (let i = 0; i < pos.count; i += 1) {
      pos.setXY(i, pos.getX(i) + Math.sin(fase.getX(i) + this.tempo) * 0.2 * dt, pos.getY(i) + (0.5 + (fase.getX(i) % 1) * 0.6) * dt);
    }
    pos.needsUpdate = true;
  }

  // ------------------------------------------------------------------ fim

  descartar(): void {
    this.morta = true;
    this.composer?.dispose();
    this.bloom?.dispose();
    for (const r of this.relevos.values()) r.descartar();
    this.relevos.clear();
    for (const d of this.descartaveis) d.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
