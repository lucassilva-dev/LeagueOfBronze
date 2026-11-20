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

/*
 * 3. O emblema RECORTADO (public/emblema-recortado.png), para ficar por cima de luz e de cor —
 *    o herói da /stats, com a brasa atrás (2026-11-20).
 *
 *    O logo do cabeçalho (item 2) só funciona sobre fundo ESCURO: o fundo dele não some, vira um
 *    véu de ~4% de alfa, e em cima de um brilho laranja esse véu aparece como uma caixa.
 *    Aqui o fundo sai de verdade, e SEM repetir o erro de julho:
 *
 *      a) «sólido» é todo pixel claro o bastante para ser desenho (o traço dourado);
 *      b) o sólido é ENGROSSADO alguns pixels, para as frestas do contorno fecharem;
 *      c) o «lado de fora» é o que se alcança a partir das bordas da imagem sem atravessar o
 *         sólido engrossado — o preenchimento NÃO entra no escudo, porque o contorno está fechado;
 *      d) tudo que não é lado de fora é o emblema, e fica OPACO com a cor original — inclusive o
 *         interior escuro do escudo, que é o que o flood-fill de julho apagava;
 *      e) a borda é suavizada (alfa gradual), e o brilho solto do lado de fora (estrelinhas)
 *         entra por «cor para alfa», como no item 2.
 *
 *    Feito no dobro do tamanho (512 px): a silhueta sai com borda lisa em vez de serrilhada.
 */
const LADO = 512;
const LIMIAR_DO_TRACO = 34; // brilho a partir do qual o pixel é desenho (o fundo vai até ~13)
const RAIO_DO_FECHO = 5; // quanto o traço engrossa para fechar as frestas do contorno
const ampliado = await sharp(ORIGEM)
  .flatten({ background: { r: 0, g: 0, b: 0 } })
  .removeAlpha()
  .resize(LADO, LADO, { kernel: "lanczos3" })
  .raw()
  .toBuffer();

const total = LADO * LADO;
const brilho = new Uint8Array(total);
for (let i = 0; i < total; i += 1) brilho[i] = Math.max(ampliado[i * 3], ampliado[i * 3 + 1], ampliado[i * 3 + 2]);

/** Máximo (dilatar) ou mínimo (erodir) num DISCO de raio `r` — disco, e não quadrado, para a
 *  silhueta não ganhar degraus nas pontas das asas. */
function morfologia(origem, r, dilatar) {
  const vizinhos = [];
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      if (dx * dx + dy * dy <= r * r + r * 0.5) vizinhos.push([dx, dy]);
    }
  }
  const saidaLocal = new Uint8Array(total);
  for (let y = 0; y < LADO; y += 1) {
    for (let x = 0; x < LADO; x += 1) {
      let valor = dilatar ? 0 : 255;
      for (const [dx, dy] of vizinhos) {
        const xx = x + dx;
        const yy = y + dy;
        // Fora da imagem conta como «lado de fora» (0): a erosão não cria borda falsa.
        const v = xx < 0 || yy < 0 || xx >= LADO || yy >= LADO ? 0 : origem[yy * LADO + xx];
        if (dilatar ? v > valor : v < valor) {
          valor = v;
          if (valor === (dilatar ? 255 : 0)) break;
        }
      }
      saidaLocal[y * LADO + x] = valor;
    }
  }
  return saidaLocal;
}

const solido = new Uint8Array(total);
for (let i = 0; i < total; i += 1) solido[i] = brilho[i] >= LIMIAR_DO_TRACO ? 255 : 0;
const fechado = morfologia(solido, RAIO_DO_FECHO, true);

// O lado de fora: tudo que se alcança das bordas sem atravessar o traço engrossado.
const fora = new Uint8Array(total);
const pilha = [];
const visitar = (x, y) => {
  if (x < 0 || y < 0 || x >= LADO || y >= LADO) return;
  const i = y * LADO + x;
  if (fora[i] || fechado[i]) return;
  fora[i] = 1;
  pilha.push(i);
};
for (let k = 0; k < LADO; k += 1) {
  visitar(k, 0);
  visitar(k, LADO - 1);
  visitar(0, k);
  visitar(LADO - 1, k);
}
while (pilha.length > 0) {
  const i = pilha.pop();
  const x = i % LADO;
  const y = (i - x) / LADO;
  visitar(x + 1, y);
  visitar(x - 1, y);
  visitar(x, y + 1);
  visitar(x, y - 1);
}

// O emblema: o que não é lado de fora, devolvido ao tamanho certo (desfaz o engrosso de fora).
const dentro = new Uint8Array(total);
for (let i = 0; i < total; i += 1) dentro[i] = fora[i] ? 0 : 255;
const silhueta = morfologia(dentro, RAIO_DO_FECHO, false);
for (let i = 0; i < total; i += 1) if (solido[i]) silhueta[i] = 255; // o traço nunca é roído

// Ilhas miúdas (as estrelinhas do fundo da arte) não são o emblema: sobre um fundo claro
// pareceriam sujeira. Fica só o que tem corpo.
const AREA_MINIMA = 600;
const rotulo = new Int32Array(total);
let proximoRotulo = 0;
for (let inicio = 0; inicio < total; inicio += 1) {
  if (!silhueta[inicio] || rotulo[inicio]) continue;
  proximoRotulo += 1;
  const ilha = [inicio];
  rotulo[inicio] = proximoRotulo;
  for (let k = 0; k < ilha.length; k += 1) {
    const i = ilha[k];
    const x = i % LADO;
    const y = (i - x) / LADO;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const xx = x + dx;
      const yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= LADO || yy >= LADO) continue;
      const j = yy * LADO + xx;
      if (!silhueta[j] || rotulo[j]) continue;
      rotulo[j] = proximoRotulo;
      ilha.push(j);
    }
  }
  if (ilha.length < AREA_MINIMA) for (const i of ilha) silhueta[i] = 0;
}

// Borda suave: média 3×3 da silhueta.
const suave = new Uint8Array(total);
for (let y = 0; y < LADO; y += 1) {
  for (let x = 0; x < LADO; x += 1) {
    let soma = 0;
    let n = 0;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= LADO || yy >= LADO) continue;
        soma += silhueta[yy * LADO + xx];
        n += 1;
      }
    }
    suave[y * LADO + x] = Math.round(soma / n);
  }
}

// A luz que escapa do traço (o anti-serrilhado do dourado) só vale COLADA no emblema: os
// pontinhos soltos do fundo da arte, longe dele, pareceriam sujeira sobre um fundo claro.
const perto = morfologia(silhueta, 3, true);

const recortado = Buffer.alloc(total * 4);
for (let i = 0; i < total; i += 1) {
  const r = ampliado[i * 3];
  const g = ampliado[i * 3 + 1];
  const b = ampliado[i * 3 + 2];
  const v = brilho[i];
  const corpo = suave[i];
  const luz = !perto[i] || v <= 26 ? 0 : Math.min(255, Math.round(((v - 26) / (96 - 26)) * v));
  const alfa = Math.max(corpo, luz);
  if (alfa === 0) continue;
  if (corpo >= luz) {
    recortado[i * 4] = r;
    recortado[i * 4 + 1] = g;
    recortado[i * 4 + 2] = b;
  } else {
    recortado[i * 4] = Math.min(255, Math.round((r * 255) / v));
    recortado[i * 4 + 1] = Math.min(255, Math.round((g * 255) / v));
    recortado[i * 4 + 2] = Math.min(255, Math.round((b * 255) / v));
  }
  recortado[i * 4 + 3] = alfa;
}
await sharp(recortado, { raw: { width: LADO, height: LADO, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile("public/emblema-recortado.png");

console.log(
  "ícones gerados: app/icon.png, app/apple-icon.png, app/opengraph-image.png, public/logo.png, public/emblema-recortado.png",
);
