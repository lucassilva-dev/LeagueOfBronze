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
