// Compara a mesma página em duas origens (ex.: produção x local) com as animações CONGELADAS no
// mesmo instante: print do herói e do elenco, e a diferença pixel a pixel (sharp).
// Uso: node .sim/comparar-paginas.cjs <url-a> <url-b> <pasta-saida> [ms=8000]
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const PW = process.env.PW || "C:/Users/Lucas Oliveira/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(PW);

const [urlA, urlB, saida, msTxt] = process.argv.slice(2);
const MS = Number(msTxt || 8000);
const tamanhos = [
  ["1440", 1440, 900],
  ["1024", 1024, 768],
  ["390", 390, 844],
  ["360", 360, 780],
];

async function prints(browser, url, w, h, prefixo) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const congelar = () =>
    page.evaluate((ms) => {
      for (const a of document.getAnimations()) {
        if (!(a.timeline instanceof DocumentTimeline)) continue;
        a.pause();
        a.currentTime = ms;
      }
    }, MS);
  await congelar();
  await page.waitForTimeout(400);
  const arquivos = [];
  await page.screenshot({ path: `${prefixo}-heroi.png` });
  arquivos.push(`${prefixo}-heroi.png`);
  await page.evaluate(() => document.querySelector("#tm-elenco")?.scrollIntoView({ block: "start" }));
  // As imagens lazy do elenco: espera carregarem antes do print.
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
  await congelar();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${prefixo}-elenco.png`, fullPage: Boolean(process.env.INTEIRA) });
  arquivos.push(`${prefixo}-elenco.png`);
  await page.close();
  return arquivos;
}

async function diferenca(a, b, destino) {
  const [ia, ib] = await Promise.all([sharp(a).raw().toBuffer({ resolveWithObject: true }), sharp(b).raw().toBuffer({ resolveWithObject: true })]);
  const { width: w, height: h, channels: c } = ia.info;
  const marca = Buffer.alloc(w * h * 3);
  let diferentes = 0;
  let maior = 0;
  for (let i = 0; i < w * h; i++) {
    let d = 0;
    for (let k = 0; k < 3; k++) d = Math.max(d, Math.abs(ia.data[i * c + k] - ib.data[i * c + k]));
    maior = Math.max(maior, d);
    if (d > 24) {
      diferentes++;
      marca[i * 3] = 255;
    } else {
      const cinza = Math.round(ia.data[i * c] * 0.3);
      marca[i * 3] = marca[i * 3 + 1] = marca[i * 3 + 2] = cinza;
    }
  }
  await sharp(marca, { raw: { width: w, height: h, channels: 3 } }).png().toFile(destino);
  return { pct: ((100 * diferentes) / (w * h)).toFixed(3), maior };
}

(async () => {
  fs.mkdirSync(saida, { recursive: true });
  const browser = await chromium.launch();
  for (const [nome, w, h] of tamanhos) {
    const a = await prints(browser, urlA, w, h, path.join(saida, `${nome}-a`));
    const b = await prints(browser, urlB, w, h, path.join(saida, `${nome}-b`));
    for (let i = 0; i < a.length; i++) {
      const r = await diferenca(a[i], b[i], a[i].replace("-a-", "-diff-"));
      console.log(nome, path.basename(a[i]).replace(`${nome}-a-`, ""), `${r.pct}% dos pixels (>24), maior diferença ${r.maior}`);
    }
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
