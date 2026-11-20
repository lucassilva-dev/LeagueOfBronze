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
 * martelada, troca de metal conforme os elos sobem, é recunhado com o escudo de cada time,
 * esquenta quando o molde das peças raras trinca, pega a cor de cada rota, é temperado junto com
 * a régua dos jogos e termina FRIO, no fecho. Em volta: a luz da fornalha e brasas subindo.
 * Nenhum dado mora aqui — se a cena não carregar, a página perde clima, não conteúdo.
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
  /** As cores das rotas, na ordem em que os canais acendem (ato «canais»). */
  rotas: readonly string[];
  emblema: string;
}>;

type Nivel = Readonly<{ nome: Qualidade; dpr: number; bloom: boolean; brasas: number; amostras: number }>;
const NIVEIS: readonly Nivel[] = [
  { nome: "baixa", dpr: 1, bloom: false, brasas: 8, amostras: 0 },
  { nome: "media", dpr: 1.25, bloom: true, brasas: 11, amostras: 0 },
  { nome: "alta", dpr: 1.5, bloom: true, brasas: 14, amostras: 4 },
];

/** Onde a peça fica em cada ato: centro (em fração da tela, −1 a 1), altura (fração da tela),
 *  quanto a cena aparece e quanto a boca da fornalha está acesa. */
type Pose = Readonly<{ x: number; y: number; tam: number; presenca: number; fornalha: number }>;
const FORA: Pose = { x: 0.84, y: 1.75, tam: 0.19, presenca: 0.28, fornalha: 0.3 };
/** O canto de cima, à direita: onde a peça espera nos atos em que o palco é do dado. */
const CANTO: Pose = { x: 0.82, y: 0.71, tam: 0.19, presenca: 0.55, fornalha: 0.5 };
const POSES: Readonly<Record<string, Pose>> = {
  fornalha: { x: 0.63, y: 0.12, tam: 0.52, presenca: 1, fornalha: 1 },
  liga: { x: 0.8, y: 0.68, tam: 0.21, presenca: 0.6, fornalha: 0.5 },
  moldes: { ...CANTO, fornalha: 0.6 },
  pecas: CANTO,
  canais: CANTO,
  bigorna: FORA,
  arsenal: { ...FORA, presenca: 0.12, fornalha: 0 },
  tempera: CANTO,
  // no fecho o bronze ESFRIOU: a boca da fornalha apaga
  fecho: { x: 0.62, y: 0.42, tam: 0.36, presenca: 0.85, fornalha: 0 },
};
/** Em que ponto do ato «canais» cada rota acende (o mesmo roteiro do HTML). */
const CANAIS_ACESOS = [0.22, 0.36, 0.5, 0.66, 0.78] as const;

/** As marteladas da abertura (o `p` do ato em que cada placa bate — o mesmo roteiro do HTML). */
const GOLPES = [0.2, 0.35, 0.5, 0.65] as const;
/** O calor da peça depois de cada martelada: derretida → brasa → morna → fria. */
const CALOR_POR_GOLPE = [1, 0.74, 0.5, 0.26, 0.04] as const;
const RELEVO_POR_GOLPE = [0.1, 0.36, 0.6, 0.82, 1] as const;

const FOV = 32;
const DISTANCIA = 9;
/** Até que altura (em unidades da cena; 0 = meio da tela) as brasas sobem antes de apagar. */
const TETO_DAS_BRASAS = -0.55;
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
  private nascimento = 0;
  private inicioDaJanela = 0;
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
  private temperou = false;
  /** 0 = oficina acesa; 1 = o fecho (peça fria, luz fria, brasas quase apagadas). */
  private frioFinal = 0;
  /** A altura do cabeçalho fixo do site, em px: a peça nunca fica debaixo dele. */
  private cabecalho = 70;

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
      // com multiamostragem, o recorte da silhueta sai liso (sem ela, não muda nada)
      alphaToCoverage: true,
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
      const m = new MeshStandardMaterial({ color: 0x3a2412, metalness: 0.9, roughness: 0.5, alphaTest: 0.5, alphaToCoverage: true, side: DoubleSide });
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
    const matBrilho = new MeshBasicMaterial({ map: texBrilho, color: 0xff5a1a, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 });
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
      pos[i * 3 + 1] = brasa ? -3.3 + Math.random() * 2.6 : -50;
      pos[i * 3 + 2] = Math.random() * 6 - 4.5;
      tam[i] = brasa ? 0.24 + Math.random() * 0.26 : 0.5 + Math.random() * 0.7;
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
        // até onde a partícula sobe antes de apagar (a brasa morre no terço de baixo da tela:
        // subindo pela página inteira, ela passava por trás do texto e lia como pontuação)
        uTeto: { value: brasa ? TETO_DAS_BRASAS : 100 },
      },
      vertexShader: /* glsl */ `
        attribute float aTam;
        attribute float aFase;
        uniform float uTempo;
        uniform float uEscala;
        uniform float uTeto;
        varying float vPisca;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aTam * uEscala / -mv.z;
          // respira devagar e apaga ao chegar ao teto (smoothstep com as bordas na ordem certa:
          // invertidas, o resultado é indefinido pela especificação do GLSL)
          vPisca = (0.6 + 0.4 * sin(uTempo * 1.3 + aFase)) * (1.0 - smoothstep(uTeto - 1.2, uTeto, position.y));
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
      this.relevos.set("", await relevoDe(this.dados.emblema, "bronze", 512));
      if (this.morta) return;
      this.aplicarRelevo("");
      this.peca.visible = true;
      // Os escudos dos times entram depois, um por vez, sem travar a abertura.
      for (const time of this.dados.times) {
        if (!time.escudo) continue;
        await new Promise((ok) => setTimeout(ok, 120));
        if (this.morta) return;
        try {
          const relevo = await relevoDe(time.escudo, "esmalte");
          if (this.morta) {
            relevo.descartar();
            return;
          }
          // As texturas sobem para a placa AGORA, uma por quadro — e não na primeira vez que o
          // escudo aparece, no meio da rolagem dos Moldes (eram engasgos de 50–80 ms por time).
          for (const textura of [relevo.cor, relevo.alfa, relevo.altura, relevo.normal]) {
            this.renderer.initTexture(textura);
            await new Promise((ok) => requestAnimationFrame(ok));
            if (this.morta) {
              relevo.descartar();
              return;
            }
          }
          this.relevos.set(time.id, relevo);
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
    // Só a PRIMEIRA vez muda o programa do material (de sem mapa para com mapa); dali em diante
    // é troca de textura, que não pede recompilação.
    const primeiraVez = m.map === null;
    m.map = r.cor;
    m.alphaMap = r.alfa;
    m.displacementMap = r.altura;
    m.normalMap = r.normal;
    // quente, a peça brilha mais no alto do relevo e menos nos sulcos: a forma se lê desde o começo
    m.emissiveMap = r.brasa;
    if (primeiraVez) m.needsUpdate = true;
    for (const costa of this.costas) {
      costa.material.alphaMap = r.alfa;
      if (primeiraVez) costa.material.needsUpdate = true;
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

  /**
   * O monitor de desempenho. Mede em janelas de TEMPO DE RELÓGIO (1,5 s), não de quadros: numa
   * máquina que faz 3 quadros por segundo, contar 75 quadros levaria meio minuto por degrau.
   *
   *   média > 21 ms (menos de ~48 qps)  duas janelas seguidas → desce um degrau;
   *   média > 66 ms (menos de 15 qps)   desce na hora;
   *   no degrau mais baixo e ainda > 30 ms → a cena desiste (fica o fundo 2D);
   *   média < 10,5 ms por seis janelas → sobe um degrau, uma vez só.
   */
  private medir(): void {
    if (this.fixo) return;
    const agora = performance.now();
    if (this.nascimento === 0) this.nascimento = agora;
    if (this.inicioDaJanela === 0) {
      this.inicioDaJanela = agora;
      this.quadros = 0;
      return;
    }
    this.quadros += 1;
    const passou = agora - this.inicioDaJanela;
    if (passou < 1500) return;
    const media = passou / this.quadros;
    const quadros = this.quadros;
    this.inicioDaJanela = agora;
    this.quadros = 0;
    // O aquecimento (compilar shaders, subir texturas) não conta; nem a janela que atravessou
    // uma pausa (aba escondida, holofote ou VS por cima: o laço parou, não a máquina).
    if (agora - this.nascimento < 2500 || passou > 3200 + quadros * 8) return;

    if (media > 21) {
      this.janelasBoas = 0;
      this.janelasRuins += media > 66 ? 2 : 1;
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

  /** A altura do cabeçalho fixo do site (px): a peça fica sempre abaixo dele. */
  definirCabecalho(px: number): void {
    if (Number.isFinite(px) && px >= 0) this.cabecalho = px;
  }

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
    this.soltarVapor();
  }

  /** Uma baforada de vapor em volta da peça (o metal quente encontrando a água). */
  private soltarVapor(): void {
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
    this.medir();

    const ato = this.dados.atos[estado.atoAtual] ?? "fornalha";
    const p = estado.progresso[estado.atoAtual] ?? 0;
    let pose = POSES[ato] ?? FORA;
    if (ato === "fornalha") {
      // Na abertura a peça é grande, ao lado do título; quando as placas do resumo sobem, ela
      // recolhe para o alto — senão a ponta do emblema fica atrás do último número.
      const t0 = limitar((p - 0.07) / 0.16);
      const t = t0 * t0 * (3 - 2 * t0);
      pose = { x: misturar(pose.x, 0.67, t), y: misturar(pose.y, 0.43, t), tam: misturar(pose.tam, 0.37, t), presenca: 1, fornalha: 1 };
    }

    // ---- o que o roteiro pede agora (tudo sai do `p`: recarregar no meio dá o estado certo)
    let golpes: number = GOLPES.length;
    let escudo = "";
    /** O calor que o ato pede; null = o das marteladas (frio depois da abertura). */
    let calorDoAto: number | null = null;
    this.tintaAlvo.setRGB(1, 1, 1);
    if (ato === "fornalha") {
      golpes = GOLPES.filter((em) => p >= em).length;
    } else if (ato === "pecas") {
      // o molde das peças raras trinca: a peça esquenta junto, e esfria quando ele racha
      calorDoAto = p < 0.4 ? limitar((p - 0.12) / 0.26) * 0.72 : 0.04;
    } else if (ato === "canais") {
      // a peça pega a cor da rota que acabou de acender
      const acesas = CANAIS_ACESOS.filter((em) => p >= em).length;
      const cor = this.dados.rotas[acesas - 1];
      if (cor) this.tintaAlvo.set(cor).lerp(this.corTemp.setRGB(1, 1, 1), 0.3);
    } else if (ato === "tempera") {
      // a têmpera: a peça entra em brasa e esfria com a frente de calor que varre a régua
      const frente = limitar((p - 0.2) / 0.58);
      calorDoAto = 0.04 + 0.74 * (1 - frente);
      if (frente >= 1 && !this.temperou) {
        this.temperou = true;
        this.soltarVapor();
      } else if (frente < 0.9) {
        this.temperou = false;
      }
    } else if (ato === "fecho") {
      // bronze frio, com pátina
      this.tintaAlvo.setRGB(0.66, 0.68, 0.7);
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
    // o topo da peça fica sempre abaixo do cabeçalho do site (em 720p ele come 9% da tela)
    const baseDoCabecalho = meiaAltura * (1 - (2 * this.cabecalho) / Math.max(1, this.altura));
    // (só para pose que está NA tela: a de fora da tela — y acima de 1 — continua fora)
    const alvoY = pose.y > 1 ? pose.y * meiaAltura : Math.min(pose.y * meiaAltura, baseDoCabecalho - pose.tam * meiaAltura - 0.05);
    this.posicao.x = misturar(this.posicao.x, alvoX, k(0.5));
    this.posicao.y = misturar(this.posicao.y, alvoY, k(0.5));
    this.tamanho = misturar(this.tamanho, pose.tam * meiaAltura, k(0.5));
    this.presenca = misturar(this.presenca, pose.presenca, k(0.6));
    this.fornalhaAcesa = misturar(this.fornalhaAcesa, pose.fornalha, k(0.7));
    this.frioFinal = misturar(this.frioFinal, ato === "fecho" ? 1 : 0, k(1.1));
    this.calor = misturar(this.calor, calorDoAto ?? CALOR_POR_GOLPE[golpes]!, k(golpes === 0 ? 0.2 : 0.9));
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
    // O derretido tem FORMA: o mapa de brasa deixa o alto do relevo quase branco e os sulcos em
    // laranja fundo (com um emissivo liso, a peça em brasa era uma silhueta chapada de luz).
    const quente = limitar(this.calor + this.clarao * 0.25);
    corDoCalor(0.4 + quente * 0.34, mf.emissive);
    mf.emissiveIntensity = Math.pow(quente, 1.4) * 3.1;
    // o metal quente não reflete: a cor (e o reflexo) aparecem conforme ele esfria
    const frio = 1 - limitar(this.calor * 1.15);
    mf.color.copy(this.tinta).multiplyScalar((0.12 + 0.88 * frio) * (1 - 0.22 * this.frioFinal));
    mf.envMapIntensity = (0.2 + 1.15 * frio) * (1 - 0.4 * this.frioFinal);
    mf.displacementScale = 0.02 + 0.13 * this.relevo;
    mf.normalScale.setScalar(0.1 + 1.25 * this.relevo);
    for (const costa of this.costas) {
      // a espessura é sombra: acesa, ela lia como um segundo contorno deslocado da peça
      corDoCalor(quente * 0.4, costa.material.emissive);
      costa.material.emissiveIntensity = Math.pow(quente, 1.5) * 0.5;
    }

    // ---- a luz e o brilho da fornalha acompanham o calor
    const forca = limitar(this.calor + this.clarao * 0.6);
    this.luzDaPeca.position.set(this.posicao.x, this.posicao.y - 0.2, 1.3);
    // Fria, a peça é iluminada por uma luz morna (é o que a faz BRONZE, e não vermelha);
    // quente, a luz é a do próprio metal.
    this.luzDaPeca.intensity = (14 + forca * 34) * this.presenca * (1 - 0.55 * this.frioFinal);
    corDoCalor(0.45 + forca * 0.3, this.corTemp);
    this.luzDaPeca.color.set(0xffe0b4).lerp(this.corTemp, limitar(forca * 1.4));
    // no fecho a luz esfria (o teal da água)
    this.luzDaPeca.color.lerp(this.corTemp.set(0xa8d8d2), 0.6 * this.frioFinal);
    // O halo fica 1,1 atrás da peça, NA LINHA DA CÂMERA: sem a correção de perspectiva, com a
    // peça num canto ele aparecia deslocado para o meio da tela, como uma mancha solta.
    const fundo = (DISTANCIA + 1.1) / DISTANCIA;
    this.brilho.position.set(this.posicao.x * fundo, this.posicao.y * fundo, -1.1);
    this.brilho.scale.setScalar(this.tamanho * (2.1 + forca * 0.55));
    this.brilho.material.opacity = (0.07 + forca * 0.2) * this.presenca * (1 - 0.9 * this.frioFinal);

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
    (u.uOpacidade as { value: number }).value = (0.3 + this.presenca * 0.5) * (1 - 0.85 * this.frioFinal);
    const pos = this.brasas.geometry.getAttribute("position") as BufferAttribute;
    const fase = this.brasas.geometry.getAttribute("aFase") as BufferAttribute;
    const quantas = NIVEIS[this.nivel]!.brasas;
    for (let i = 0; i < quantas; i += 1) {
      let y = pos.getY(i) + (0.16 + (fase.getX(i) % 1) * 0.3) * dt;
      let x = pos.getX(i) + Math.sin(this.tempo * 0.6 + fase.getX(i)) * 0.12 * dt;
      if (y > TETO_DAS_BRASAS) {
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
