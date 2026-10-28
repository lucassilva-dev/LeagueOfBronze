// Mede a página temática depois das entradas: estouro horizontal, o título na coluna, o fator
// de largura da fonte do título (measureText) e nicks que vazam da carta.
// Uso: node .sim/medir-tema.cjs <url> [texto-da-marca=QUEIJO]
const PW = process.env.PW || "C:/Users/Lucas Oliveira/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(PW);

const [url, marca = "QUEIJO"] = process.argv.slice(2);
const tamanhos = [
  [1440, 900],
  [1366, 768],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 780],
];

(async () => {
  const browser = await chromium.launch();
  for (const [w, h] of tamanhos) {
    const page = await browser.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(3500);
    const m = await page.evaluate((marca) => {
      const r = (el) => el && el.getBoundingClientRect();
      const raiz = document.querySelector("[data-tema]");
      const fonte = getComputedStyle(document.querySelector("h1 [aria-hidden] span") || raiz).fontFamily;
      const ctx = document.createElement("canvas").getContext("2d");
      ctx.font = `100px ${fonte}`;
      const fator = ctx.measureText(marca).width / 100 / [...marca].length;
      const titulo = r(document.querySelector("h1 [aria-hidden]"));
      const marcaEl = document.querySelector("h1 [aria-hidden] > span");
      const coluna = r(marcaEl?.closest("[class*=blocoTexto]"));
      const vazam = [...document.querySelectorAll("*")]
        .filter((el) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && b.right > innerWidth + 1 && !el.closest('[aria-hidden="true"]');
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(el.getBoundingClientRect().right)}`);
      const nicks = [...document.querySelectorAll("li h3")]
        .filter((h) => h.scrollWidth > h.clientWidth + 1)
        .map((h) => h.textContent);
      return {
        scroll: `${document.documentElement.scrollWidth}/${innerWidth}`,
        fonte: fonte.split(",")[0],
        fator: fator.toFixed(3),
        marcaPx: marcaEl ? Math.round(r(marcaEl).width) : null,
        marcaFonte: marcaEl ? getComputedStyle(marcaEl).fontSize : null,
        titulo: titulo && `${Math.round(titulo.left)}–${Math.round(titulo.right)}`,
        coluna: coluna && `${Math.round(coluna.left)}–${Math.round(coluna.right)}`,
        vazam,
        nicks,
      };
    }, marca);
    console.log(w, JSON.stringify(m));
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
