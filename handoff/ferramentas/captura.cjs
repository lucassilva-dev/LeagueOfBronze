// Prints de verdade (resolução cheia) da página temática, em várias larguras.
// Uso: node .sim/captura.cjs <url> <pasta-saida> [ms-de-espera]
const path = require("path");
const PW = process.env.PW || "C:/Users/Lucas Oliveira/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(PW);

const [url, saida, esperaTxt] = process.argv.slice(2);
const espera = Number(esperaTxt || 3500);
const tamanhos = [
  ["desktop-1440", 1440, 900, 1],
  ["desktop-1024", 1024, 768, 1],
  ["tablet-768", 768, 1024, 1],
  ["celular-390", 390, 844, 2],
  ["celular-360", 360, 780, 2],
].filter(([n]) => !process.env.SO || process.env.SO.split(",").includes(n));
const _sobra = [
];

(async () => {
  const browser = await chromium.launch();
  for (const [nome, w, h, dpr] of tamanhos) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, isMobile: w < 768, hasTouch: w < 768 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(espera);
    const medida = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, sh: document.documentElement.scrollHeight }));
    await page.screenshot({ path: path.join(saida, `${nome}-dobra.png`) });
    await page.screenshot({ path: path.join(saida, `${nome}-inteira.png`), fullPage: true });
    console.log(nome, JSON.stringify(medida));
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
