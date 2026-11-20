import sharp from "sharp";
import { describe, expect, it } from "vitest";

/**
 * O emblema do site tem de aparecer INTEIRO no favicon, na prévia de link (WhatsApp,
 * Discord) e no cabeçalho.
 *
 * Em julho o fundo preto foi tirado com flood-fill: como o interior do escudo é quase tão
 * escuro quanto o fundo, o preenchimento apagou pedaços do próprio emblema, e o WhatsApp
 * mostrava o escudo esburacado com o card dele aparecendo por dentro. Os ícones agora saem
 * de scripts/gerar-icones.mjs, e este teste confere cada um contra o ORIGINAL — se alguém
 * trocar um arquivo por outro recorte "sem fundo", falha aqui.
 */

const ORIGINAL = "scripts/marca/emblema-original.png";
const FUNDO_DO_EMBLEMA = { r: 3, g: 3, b: 2 };

type Raw = { data: Buffer; width: number; height: number };

async function rgba(caminho: string, tamanho?: number): Promise<Raw> {
  let imagem = sharp(caminho).ensureAlpha();
  if (tamanho) imagem = imagem.resize(tamanho, tamanho, { kernel: "lanczos3" });
  const { data, info } = await imagem.raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** A imagem recolocada sobre uma cor sólida, em RGB. */
async function sobre(caminho: string, cor: { r: number; g: number; b: number }, tamanho?: number): Promise<Raw> {
  let imagem = sharp(caminho).flatten({ background: cor });
  if (tamanho) imagem = imagem.resize(tamanho, tamanho, { kernel: "lanczos3" });
  const { data, info } = await imagem.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function maiorDiferenca(a: Raw, b: Raw): number {
  expect(a.width).toBe(b.width);
  expect(a.height).toBe(b.height);
  let maior = 0;
  for (let i = 0; i < a.data.length; i++) maior = Math.max(maior, Math.abs(a.data[i]! - b.data[i]!));
  return maior;
}

function alfas(img: Raw): number[] {
  const lista: number[] = [];
  for (let i = 3; i < img.data.length; i += 4) lista.push(img.data[i]!);
  return lista;
}

describe("ícone do site e prévia de link: opacos e com o emblema inteiro", () => {
  const arquivos = [
    { caminho: "app/icon.png", tamanho: 256 },
    { caminho: "app/apple-icon.png", tamanho: 180 },
    { caminho: "app/opengraph-image.png", tamanho: 512 },
  ];

  for (const { caminho, tamanho } of arquivos) {
    it(`${caminho} é opaco: nenhum app consegue "apagar" o fundo e mostrar o dele por dentro`, async () => {
      const img = await rgba(caminho);
      expect([img.width, img.height]).toEqual([tamanho, tamanho]);
      expect(alfas(img).reduce((menor, a) => Math.min(menor, a), 255)).toBe(255);
    });

    it(`${caminho} é o emblema original, sem pedaço faltando`, async () => {
      const arquivo = await sobre(caminho, FUNDO_DO_EMBLEMA);
      const original = await sobre(ORIGINAL, FUNDO_DO_EMBLEMA, tamanho === 256 ? undefined : tamanho);
      // Arredondamento de redimensionamento, nunca um buraco (buraco dá diferença de 100+).
      expect(maiorDiferenca(arquivo, original)).toBeLessThanOrEqual(tamanho === 256 ? 1 : 12);
    });
  }
});

describe("logo do cabeçalho: transparente sem apagar nada do emblema", () => {
  it("recolocado sobre preto, é o original pixel a pixel", async () => {
    const logo = await sobre("public/logo.png", { r: 0, g: 0, b: 0 });
    const original = await sobre(ORIGINAL, { r: 0, g: 0, b: 0 });
    expect(maiorDiferenca(logo, original)).toBeLessThanOrEqual(2);
  });

  it("a borda é suave (alfa gradual), não um recorte serrilhado de 0 ou 100%", async () => {
    const parciais = alfas(await rgba("public/logo.png")).filter((a) => a > 0 && a < 255).length;
    expect(parciais).toBeGreaterThan(10_000);
  });

  it("o interior escuro do escudo continua lá (era o que o flood-fill apagava)", async () => {
    // (128,180) fica no corpo do escudo, abaixo do cristal: no original é (20,19,16).
    const logo = await rgba("public/logo.png");
    const i = (180 * logo.width + 128) * 4;
    expect(logo.data[i + 3]).toBeGreaterThan(0);
  });
});

describe("emblema recortado: sem fundo de verdade, e inteiro", () => {
  const RECORTADO = "public/emblema-recortado.png";

  it("o fundo saiu: os cantos e a moldura são transparentes (nada de véu virando caixa)", async () => {
    const img = await rgba(RECORTADO);
    expect([img.width, img.height]).toEqual([512, 512]);
    const a = (x: number, y: number) => img.data[(y * img.width + x) * 4 + 3]!;
    for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511], [256, 6], [6, 256], [505, 256], [256, 505]] as const) {
      expect(a(x, y), `alfa em (${x},${y})`).toBe(0);
    }
    // A moldura de 6% inteira: zero. No logo do cabeçalho ela é um véu de ~4% (cor para alfa).
    let maior = 0;
    for (let y = 0; y < 512; y++) {
      for (let x = 0; x < 512; x++) {
        if (x > 30 && x < 481 && y > 30 && y < 481) continue;
        maior = Math.max(maior, a(x, y));
      }
    }
    expect(maior).toBe(0);
  });

  it("o interior escuro do escudo é OPACO e é o do original (o que o flood-fill de julho apagava)", async () => {
    const img = await rgba(RECORTADO);
    const original = await sobre(ORIGINAL, { r: 0, g: 0, b: 0 }, 512);
    // (256,360) fica no corpo do escudo, abaixo do cristal: escuro, e cercado pelo contorno.
    for (const [x, y] of [[256, 360], [200, 250], [312, 250], [256, 200]] as const) {
      const i = (y * 512 + x) * 4;
      expect(img.data[i + 3], `alfa em (${x},${y})`).toBe(255);
      const j = (y * 512 + x) * 3;
      for (let c = 0; c < 3; c++) expect(Math.abs(img.data[i + c]! - original.data[j + c]!)).toBeLessThanOrEqual(2);
    }
  });

  it("não tem buraco: todo pixel transparente se liga à borda da imagem", async () => {
    const img = await rgba(RECORTADO);
    const L = img.width;
    const vazio = (i: number) => img.data[i * 4 + 3]! < 128;
    const visto = new Uint8Array(L * L);
    const pilha: number[] = [];
    const visitar = (x: number, y: number) => {
      if (x < 0 || y < 0 || x >= L || y >= L) return;
      const i = y * L + x;
      if (visto[i] || !vazio(i)) return;
      visto[i] = 1;
      pilha.push(i);
    };
    for (let k = 0; k < L; k++) {
      visitar(k, 0);
      visitar(k, L - 1);
      visitar(0, k);
      visitar(L - 1, k);
    }
    while (pilha.length > 0) {
      const i = pilha.pop()!;
      const x = i % L;
      const y = (i - x) / L;
      visitar(x + 1, y);
      visitar(x - 1, y);
      visitar(x, y + 1);
      visitar(x, y - 1);
    }
    let presos = 0;
    for (let i = 0; i < L * L; i++) if (vazio(i) && !visto[i]) presos++;
    expect(presos).toBe(0);
  });

  it("é UMA peça só (sem pontinho solto) e a borda é suave", async () => {
    const img = await rgba(RECORTADO);
    const L = img.width;
    const cheio = (i: number) => img.data[i * 4 + 3]! >= 128;
    const rotulo = new Uint8Array(L * L);
    let pecas = 0;
    for (let inicio = 0; inicio < L * L; inicio++) {
      if (!cheio(inicio) || rotulo[inicio]) continue;
      pecas++;
      const fila = [inicio];
      rotulo[inicio] = 1;
      for (let k = 0; k < fila.length; k++) {
        const i = fila[k]!;
        const x = i % L;
        const y = (i - x) / L;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= L || yy >= L) continue;
          const j = yy * L + xx;
          if (!cheio(j) || rotulo[j]) continue;
          rotulo[j] = 1;
          fila.push(j);
        }
      }
    }
    expect(pecas).toBe(1);
    expect(alfas(img).filter((a) => a > 0 && a < 255).length).toBeGreaterThan(2_000);
  });
});
