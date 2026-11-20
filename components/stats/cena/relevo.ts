import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, NoColorSpace, SRGBColorSpace, type Texture } from "three";

/**
 * O RELEVO DE UMA IMAGEM — as texturas que transformam o emblema do campeonato (ou o escudo de um
 * time) numa peça de metal em 3D, sem modelo nenhum: a própria imagem vira o molde.
 *
 *   cor     a imagem (o esmalte da peça);
 *   alfa    a silhueta (o recorte: o que não é peça some);
 *   altura  a luminância dentro da silhueta, suavizada (o que é claro fica alto);
 *   normal  as inclinações dessa altura (é o que a luz «lê» como relevo);
 *   brasa   onde o metal QUENTE brilha mais: o alto do relevo quase branco, os sulcos em laranja
 *           fundo. É o que dá forma à peça derretida — sem ela, o metal em brasa é uma silhueta
 *           chapada de luz.
 *
 * Tudo em `<canvas>`, com imagens do próprio site (mesma origem: o canvas não fica «sujo»). Nada
 * de glTF nem de HDR baixado: a CSP do site (`connect-src 'self'`, `img-src` sem `blob:`) barraria.
 */
export type Relevo = Readonly<{ cor: Texture; alfa: Texture; altura: Texture; normal: Texture; brasa: Texture; descartar: () => void }>;

function carregar(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, falha) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => falha(new Error(`não carregou: ${url}`));
    img.src = url;
  });
}

function tela(lado: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = lado;
  c.height = lado;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("sem canvas 2D");
  return [c, ctx];
}

/** Desfoque em caixa (duas passadas) num campo de alturas. */
function suavizar(campo: Float32Array, raio: number, lado: number): Float32Array {
  const saida = new Float32Array(campo.length);
  const passada = (de: Float32Array, para: Float32Array, horizontal: boolean) => {
    for (let y = 0; y < lado; y += 1) {
      for (let x = 0; x < lado; x += 1) {
        let soma = 0;
        let n = 0;
        for (let d = -raio; d <= raio; d += 1) {
          const xx = horizontal ? x + d : x;
          const yy = horizontal ? y : y + d;
          if (xx < 0 || yy < 0 || xx >= lado || yy >= lado) continue;
          soma += de[yy * lado + xx]!;
          n += 1;
        }
        para[y * lado + x] = soma / n;
      }
    }
  };
  const meio = new Float32Array(campo.length);
  passada(campo, meio, true);
  passada(meio, saida, false);
  return saida;
}

function textura(c: HTMLCanvasElement, cor: boolean): CanvasTexture {
  const t = new CanvasTexture(c);
  t.colorSpace = cor ? SRGBColorSpace : NoColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.magFilter = LinearFilter;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/**
 * Quanto da cor ORIGINAL fica na peça. O emblema do campeonato é fundido em bronze (pouca cor
 * original: o que se vê é o metal, com o desenho no relevo); o escudo de um time é esmalte sobre
 * metal (a cor dele fica, porque é a identidade do time).
 */
export type Acabamento = "bronze" | "esmalte";
const COR_ORIGINAL: Readonly<Record<Acabamento, number>> = { bronze: 0.3, esmalte: 0.72 };
/** O bronze claro da peça fria (o metal reflete a cor dele: é o que dá o «dourado»). */
const BRONZE = [236, 176, 104] as const;

/**
 * Monta o relevo de uma imagem do site (centralizada num quadrado, sem distorcer). `lado` é a
 * resolução das texturas: o emblema, que aparece grande, pede 512; os escudos, pequenos, 384.
 */
export async function relevoDe(url: string, acabamento: Acabamento = "bronze", lado = 384): Promise<Relevo> {
  const img = await carregar(url);

  const [telaDaCor, ctxCor] = tela(lado);
  const escala = Math.min(lado / img.naturalWidth, lado / img.naturalHeight) * 0.94;
  const w = img.naturalWidth * escala;
  const h = img.naturalHeight * escala;
  ctxCor.drawImage(img, (lado - w) / 2, (lado - h) / 2, w, h);
  const pixels = ctxCor.getImageData(0, 0, lado, lado);
  const total = lado * lado;

  // Altura: toda a silhueta sobe um degrau (0,4) e o que é claro sobe mais.
  const bruta = new Float32Array(total);
  const silhueta = new Float32Array(total);
  for (let i = 0; i < total; i += 1) {
    const r = pixels.data[i * 4]! / 255;
    const g = pixels.data[i * 4 + 1]! / 255;
    const b = pixels.data[i * 4 + 2]! / 255;
    const a = pixels.data[i * 4 + 3]! / 255;
    const luz = Math.max(r, g, b) * 0.6 + (0.2126 * r + 0.7152 * g + 0.0722 * b) * 0.4;
    silhueta[i] = a;
    bruta[i] = a * (0.4 + 0.6 * luz);
  }
  // os raios do desfoque acompanham a resolução (o relevo tem o mesmo «grão» em 384 e em 512)
  const altura = suavizar(suavizar(bruta, Math.max(2, Math.round(lado / 192)), lado), Math.max(1, Math.round(lado / 384)), lado);

  // A cor da peça: bronze modelado pela luz da própria imagem, com a cor original por cima.
  const fica = COR_ORIGINAL[acabamento];
  for (let i = 0; i < total; i += 1) {
    const r = pixels.data[i * 4]!;
    const g = pixels.data[i * 4 + 1]!;
    const b = pixels.data[i * 4 + 2]!;
    const claro = 0.5 + 0.5 * (Math.max(r, g, b) / 255);
    pixels.data[i * 4] = Math.round(BRONZE[0] * claro * (1 - fica) + r * fica);
    pixels.data[i * 4 + 1] = Math.round(BRONZE[1] * claro * (1 - fica) + g * fica);
    pixels.data[i * 4 + 2] = Math.round(BRONZE[2] * claro * (1 - fica) + b * fica);
  }
  ctxCor.putImageData(pixels, 0, 0);

  const [telaDaAltura, ctxAltura] = tela(lado);
  const [telaDoNormal, ctxNormal] = tela(lado);
  const [telaDoAlfa, ctxAlfa] = tela(lado);
  const dadosAltura = ctxAltura.createImageData(lado, lado);
  const dadosNormal = ctxNormal.createImageData(lado, lado);
  const dadosAlfa = ctxAlfa.createImageData(lado, lado);
  // a inclinação é por pixel: em resolução maior o mesmo relevo tem degraus menores
  const forca = 5.5 * (lado / 384);
  const em = (x: number, y: number) => altura[Math.max(0, Math.min(lado - 1, y)) * lado + Math.max(0, Math.min(lado - 1, x))]!;

  // A brasa só existe para a peça que DERRETE (o emblema): os escudos entram frios.
  const comBrasa = acabamento === "bronze";
  const [telaDaBrasa, ctxBrasa] = comBrasa ? tela(lado) : [null, null];
  const dadosBrasa = ctxBrasa ? ctxBrasa.createImageData(lado, lado) : null;

  for (let y = 0; y < lado; y += 1) {
    for (let x = 0; x < lado; x += 1) {
      const i = y * lado + x;
      const v = Math.round(altura[i]! * 255);
      dadosAltura.data[i * 4] = v;
      dadosAltura.data[i * 4 + 1] = v;
      dadosAltura.data[i * 4 + 2] = v;
      dadosAltura.data[i * 4 + 3] = 255;

      const dx = (em(x + 1, y) - em(x - 1, y)) * forca;
      const dy = (em(x, y + 1) - em(x, y - 1)) * forca;
      const comprimento = Math.hypot(dx, dy, 1);
      dadosNormal.data[i * 4] = Math.round((-dx / comprimento) * 127.5 + 127.5);
      // o canvas cresce para baixo e a textura (flipY) é virada: o verde acompanha
      dadosNormal.data[i * 4 + 1] = Math.round((dy / comprimento) * 127.5 + 127.5);
      dadosNormal.data[i * 4 + 2] = Math.round((1 / comprimento) * 127.5 + 127.5);
      dadosNormal.data[i * 4 + 3] = 255;

      const a = Math.round(silhueta[i]! * 255);
      dadosAlfa.data[i * 4] = a;
      dadosAlfa.data[i * 4 + 1] = a;
      dadosAlfa.data[i * 4 + 2] = a;
      dadosAlfa.data[i * 4 + 3] = 255;

      if (dadosBrasa) {
        // curva íngreme: o sulco fica em 8% do brilho do topo
        const alto = Math.max(0, Math.min(1, (altura[i]! - 0.42) / 0.5));
        const brasa = Math.round((0.08 + 0.92 * Math.pow(alto, 1.7)) * 255);
        dadosBrasa.data[i * 4] = brasa;
        dadosBrasa.data[i * 4 + 1] = brasa;
        dadosBrasa.data[i * 4 + 2] = brasa;
        dadosBrasa.data[i * 4 + 3] = 255;
      }
    }
  }
  ctxAltura.putImageData(dadosAltura, 0, 0);
  ctxNormal.putImageData(dadosNormal, 0, 0);
  ctxAlfa.putImageData(dadosAlfa, 0, 0);
  if (ctxBrasa && dadosBrasa) ctxBrasa.putImageData(dadosBrasa, 0, 0);

  const alturaTex = textura(telaDaAltura, false);
  const texturas = {
    cor: textura(telaDaCor, true),
    alfa: textura(telaDoAlfa, false),
    altura: alturaTex,
    normal: textura(telaDoNormal, false),
    // sem brasa própria, o brilho do calor segue a altura (um clarão de passagem, nada mais)
    brasa: telaDaBrasa ? textura(telaDaBrasa, false) : alturaTex,
  };
  return {
    ...texturas,
    descartar: () => {
      for (const t of new Set(Object.values(texturas))) t.dispose();
    },
  };
}
