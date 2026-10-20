/**
 * Gera os ícones do site a partir do emblema ORIGINAL (scripts/marca/emblema-original.png).
 *
 *   node scripts/gerar-icones.mjs
 *
 * ⚠ POR QUE ESTE SCRIPT EXISTE (2026-10-20).
 *
 * O emblema é dourado sobre fundo quase preto, e o interior do escudo é quase tão escuro
 * quanto esse fundo (há pixels do escudo em (20,19,16) e do fundo em até 12). Em julho o
 * fundo foi "removido" com flood-fill a partir das bordas: o preenchimento entrou pelo
 * escudo e apagou pedaços dele — o interior em volta do cristal, partes das asas, sobrou
 * pontinho solto e borda serrilhada (transparência só 0 ou 100%). O favicon e a prévia do
 * link no WhatsApp/Discord mostravam esse emblema esburacado.
 *
 * Duas regras, para não repetir:
 *  1. Ícone e prévia de link são OPACOS, com o fundo escuro do próprio emblema. Cada app
 *     pinta transparência do jeito dela (o WhatsApp põe o card dele por trás); opaco, o
 *     emblema aparece inteiro em qualquer lugar.
 *  2. Onde precisa de transparência (o logo do cabeçalho, que fica sobre o fundo do site),
 *     ela sai por "cor para alfa" sobre preto — cada pixel vira o próprio brilho em alfa —,
 *     NUNCA por limiar ou flood-fill. Recolocado sobre preto, o resultado é o original
 *     pixel a pixel: nada do emblema some.
 *
 * tests/identidade-visual.test.ts confere as duas regras contra o original.
 */
import sharp from "sharp";

const ORIGEM = "scripts/marca/emblema-original.png";
/** O fundo do próprio original (mediana das bordas). */
export const FUNDO_DO_EMBLEMA = { r: 3, g: 3, b: 2 };

const achatado = await sharp(ORIGEM).flatten({ background: FUNDO_DO_EMBLEMA }).png().toBuffer();

// 1. Opacos: favicon, ícone de tela inicial (iOS) e a imagem da prévia de link.
await sharp(achatado).png({ compressionLevel: 9 }).toFile("app/icon.png");
await sharp(achatado).resize(180, 180, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile("app/apple-icon.png");
await sharp(achatado).resize(512, 512, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile("app/opengraph-image.png");

// 2. Logo do cabeçalho: cor para alfa sobre preto.
const { data, info } = await sharp(ORIGEM)
  .flatten({ background: { r: 0, g: 0, b: 0 } })
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const saida = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const alfa = Math.max(r, g, b);
  if (alfa === 0) continue; // preto puro = transparente (o buffer já nasce zerado)
  saida[j] = Math.min(255, Math.round((r * 255) / alfa));
  saida[j + 1] = Math.min(255, Math.round((g * 255) / alfa));
  saida[j + 2] = Math.min(255, Math.round((b * 255) / alfa));
  saida[j + 3] = alfa;
}
await sharp(saida, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile("public/logo.png");

console.log("ícones gerados: app/icon.png, app/apple-icon.png, app/opengraph-image.png, public/logo.png");
