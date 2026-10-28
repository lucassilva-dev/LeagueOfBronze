// Grava um vídeo da página temática quadro a quadro (o relógio das animações é controlado aqui,
// então sai liso mesmo com a máquina ocupada) e manda os quadros para o ffmpeg.
// Uso: node .sim/video-tema.cjs <base-url> <formato: computador|celular> <saida.mp4> [time=equipe-rx] [jogador=maxmp]
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const PW = process.env.PW || "C:/Users/Lucas Oliveira/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright";
const { chromium } = require(PW);

const [base, formato, saida, time = "equipe-rx", jogador = "maxmp"] = process.argv.slice(2);
const FPS = 30;
const CELULAR = formato === "celular";
const VIEW = CELULAR ? { width: 405, height: 720, dpr: 1080 / 405 } : { width: 1440, height: 810, dpr: 1920 / 1440 };

const suave = (x) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x)); // ease in-out

/** Rolagem por trechos: [[t0, y0], [t1, y1], …] com interpolação suave entre os pontos. */
function rolagem(pontos, t) {
  if (t <= pontos[0][0]) return pontos[0][1];
  for (let i = 1; i < pontos.length; i++) {
    const [t0, y0] = pontos[i - 1];
    const [t1, y1] = pontos[i];
    if (t <= t1) return y0 + (y1 - y0) * suave((t - t0) / Math.max(1, t1 - t0));
  }
  return pontos.at(-1)[1];
}

async function gravarCena(page, ffmpeg, { url, duracao, pontos, mouse = [] }) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  // As alturas reais da página para resolver os alvos de rolagem ("#id" → topo do elemento).
  const alvos = await page.evaluate((ids) => {
    const r = {};
    for (const id of ids) {
      if (typeof id !== "string") continue;
      const el = document.querySelector(id);
      r[id] = el ? Math.max(0, el.getBoundingClientRect().top + scrollY - 70) : 0;
    }
    r.__fim = document.documentElement.scrollHeight - innerHeight;
    return r;
  }, pontos.map(([, y]) => y));
  const pts = pontos.map(([t, y]) => [t, typeof y === "string" ? (y === "fim" ? alvos.__fim : alvos[y]) : y]);
  const total = Math.round((duracao / 1000) * FPS);
  let proximoMouse = 0;
  for (let i = 0; i < total; i++) {
    const t = (i * 1000) / FPS;
    while (proximoMouse < mouse.length && mouse[proximoMouse][0] <= t) {
      const [, alvo] = mouse[proximoMouse++];
      if (alvo) await page.hover(alvo, { force: true }).catch(() => {});
      else await page.mouse.move(5, 5);
    }
    await page.evaluate(
      ({ t, y }) => {
        window.scrollTo(0, y);
        const vistos = (window.__vistos ||= new Map());
        for (const a of document.getAnimations()) {
          if (!(a.timeline instanceof DocumentTimeline)) continue; // as de rolagem seguem a rolagem
          if (!vistos.has(a)) vistos.set(a, t);
          a.pause();
          a.currentTime = t - vistos.get(a);
        }
      },
      { t, y: Math.round(rolagem(pts, t)) },
    );
    const quadro = await page.screenshot({ type: "jpeg", quality: 93 });
    if (!ffmpeg.stdin.write(quadro)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % 60 === 0) process.stdout.write(`${url.split("/").pop()} ${Math.round(t / 100) / 10}s\n`);
  }
}

(async () => {
  const largura = Math.round(VIEW.width * VIEW.dpr);
  const altura = Math.round(VIEW.height * VIEW.dpr);
  const cenas = CELULAR
    ? [
        {
          url: `${base}/times/${time}`,
          duracao: 15500,
          pontos: [[0, 0], [5200, 0], [6800, 260], [8200, 260], [11800, "#tm-elenco"], [12600, "#tm-elenco"], [14600, "fim"]],
        },
        {
          url: `${base}/jogadores/${jogador}`,
          duracao: 10000,
          pontos: [[0, 0], [4200, 0], [6400, 470], [7600, 470], [9400, "fim"]],
        },
      ]
    : [
        {
          url: `${base}/times/${time}`,
          duracao: 15500,
          pontos: [[0, 0], [6500, 0], [9300, "#tm-elenco"], [12300, "#tm-elenco"], [14300, "fim"]],
          mouse: [[9600, 'li:last-child article'], [11000, "li:nth-child(3) article"], [12200, null]],
        },
        {
          url: `${base}/jogadores/${jogador}`,
          duracao: 9500,
          pontos: [[0, 0], [5600, 0], [8200, "fim"]],
        },
      ];

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: VIEW.width, height: VIEW.height },
    deviceScaleFactor: VIEW.dpr,
    isMobile: CELULAR,
    hasTouch: CELULAR,
  });
  const partes = [];
  for (const [n, cena] of cenas.entries()) {
    const parte = saida.replace(/\.mp4$/, `.parte${n}.mp4`);
    const ffmpeg = spawn("ffmpeg", [
      "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
      "-vf", `scale=${largura}:${altura}:flags=lanczos,format=yuv420p`,
      "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-r", String(FPS), parte,
    ]);
    ffmpeg.stderr.on("data", (d) => process.stderr.write(d));
    await gravarCena(page, ffmpeg, cena);
    ffmpeg.stdin.end();
    await new Promise((r) => ffmpeg.on("close", r));
    partes.push({ arquivo: parte, duracao: cena.duracao / 1000 });
  }
  await browser.close();

  // Junta as cenas com um corte em dissolve de 0,5 s.
  const t0 = partes[0].duracao - 0.5;
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-y", "-loglevel", "error", "-i", partes[0].arquivo, "-i", partes[1].arquivo,
      "-filter_complex", `[0:v][1:v]xfade=transition=fade:duration=0.5:offset=${t0},format=yuv420p[v]`,
      "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-movflags", "+faststart", saida,
    ]);
    ff.stderr.on("data", (d) => process.stderr.write(d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
  for (const p of partes) fs.unlinkSync(p.arquivo);
  console.log("pronto", saida, Math.round(fs.statSync(saida).size / 1024 / 1024 * 10) / 10, "MB");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
