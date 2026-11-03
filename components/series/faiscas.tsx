"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, type Ref } from "react";

/**
 * AS PARTÍCULAS DO SHOW — faíscas, ondas de choque, brasas subindo e confete, num `<canvas>`.
 *
 * Enfeite puro: `aria-hidden`, `pointer-events: none`, nenhum texto. É o único lugar da
 * cerimônia onde há transparência animada, e ela vive DENTRO do canvas (globalAlpha) — não em
 * CSS. Se o canvas nunca desenhar (aba escondida, navegador sem canvas), some o enfeite e o
 * resultado do sorteio continua na tela.
 *
 * Desempenho de transmissão (OBS a 60 fps num notebook): o laço só roda enquanto há partícula
 * viva, o total é limitado (`TETO`), as faíscas são traços curtos em modo aditivo ("lighter",
 * que dá o brilho sem filtro de blur) e o canvas acompanha o devicePixelRatio só até 1,25.
 *
 * Os `Math.random()` daqui decidem a trajetória de uma faísca. O resultado do sorteio vem do
 * servidor.
 */

export type ApiFaiscas = Readonly<{
  /** Explosão radial de faíscas. `x`/`y` em fração da tela (0,5 = centro). */
  explosao: (o: Readonly<{ x: number; y: number; cores: readonly string[]; quantidade?: number; forca?: number }>) => void;
  /** Anel de choque que se expande a partir do ponto. */
  onda: (o: Readonly<{ x: number; y: number; cor: string; raio?: number; espessura?: number; duracao?: number }>) => void;
  /** Confete caindo do alto da tela. */
  confete: (o: Readonly<{ cores: readonly string[]; quantidade?: number }>) => void;
  /** Brasas subindo continuamente (null desliga). */
  brasas: (o: Readonly<{ cores: readonly string[]; porSegundo: number }> | null) => void;
  /** Some com tudo. */
  limpar: () => void;
}>;

type Particula = {
  tipo: "faisca" | "brasa" | "confete";
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  duracao: number;
  cor: string;
  tamanho: number;
  giro: number;
  vgiro: number;
  arrasto: number;
  gravidade: number;
};

type Onda = { x: number; y: number; cor: string; raio: number; espessura: number; vida: number; duracao: number };

/** Mais que isso e um notebook começa a perder quadro junto com o OBS. */
const TETO = 700;

function sorteioEnfeite(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function Faiscas({ ref, reduzido = false }: Readonly<{ ref?: Ref<ApiFaiscas>; reduzido?: boolean }>) {
  const tela = useRef<HTMLCanvasElement | null>(null);
  const particulas = useRef<Particula[]>([]);
  const ondas = useRef<Onda[]>([]);
  const fonteDeBrasas = useRef<{ cores: readonly string[]; porSegundo: number } | null>(null);
  const quadro = useRef<number | null>(null);
  const ultimo = useRef(0);
  const acumuladoBrasas = useRef(0);
  const tamanho = useRef({ w: 1, h: 1, dpr: 1 });
  const contexto = useRef<CanvasRenderingContext2D | null | undefined>(undefined);
  /** O próprio passo do laço, para ele se reagendar sem se referir a si mesmo na declaração. */
  const proximoPasso = useRef<(agora: number) => void>(() => {});

  const medir = useCallback(() => {
    const c = tela.current;
    if (!c) return;
    // Faísca não precisa de retina: 1,25 basta e alivia a GPU com o OBS codificando junto.
    const dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const w = c.clientWidth || window.innerWidth;
    const h = c.clientHeight || window.innerHeight;
    tamanho.current = { w, h, dpr };
    c.width = Math.max(1, Math.round(w * dpr));
    c.height = Math.max(1, Math.round(h * dpr));
  }, []);

  const passo = useCallback((agora: number) => {
    const c = tela.current;
    // Pega o contexto uma vez só; sem canvas (navegador antigo, jsdom) o laço desiste e pronto.
    if (c && contexto.current === undefined) contexto.current = c.getContext("2d");
    const ctx = contexto.current;
    if (!c || !ctx) {
      quadro.current = null;
      return;
    }
    const dt = Math.min(48, ultimo.current ? agora - ultimo.current : 16) / 1000;
    ultimo.current = agora;
    const { w, h, dpr } = tamanho.current;

    // Brasas contínuas: nascem embaixo e sobem devagar, oscilando.
    const fonte = fonteDeBrasas.current;
    if (fonte && particulas.current.length < TETO) {
      acumuladoBrasas.current += fonte.porSegundo * dt;
      while (acumuladoBrasas.current >= 1) {
        acumuladoBrasas.current -= 1;
        particulas.current.push({
          tipo: "brasa",
          x: sorteioEnfeite(0, w),
          y: h + 10,
          vx: sorteioEnfeite(-12, 12),
          vy: sorteioEnfeite(-70, -30),
          vida: 0,
          duracao: sorteioEnfeite(3.2, 6.5),
          cor: fonte.cores[Math.floor(Math.random() * fonte.cores.length)] ?? "#f0c88a",
          tamanho: sorteioEnfeite(1, 2.8),
          giro: sorteioEnfeite(0, Math.PI * 2),
          vgiro: sorteioEnfeite(0.6, 1.6),
          arrasto: 0,
          gravidade: 0,
        });
      }
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Ondas de choque (aditivas).
    ctx.globalCompositeOperation = "lighter";
    ondas.current = ondas.current.filter((o) => {
      o.vida += dt;
      const s = o.vida / o.duracao;
      if (s >= 1) return false;
      const eased = 1 - Math.pow(1 - s, 3);
      ctx.globalAlpha = Math.max(0, 1 - s) * 0.9;
      ctx.strokeStyle = o.cor;
      ctx.lineWidth = Math.max(0.5, o.espessura * (1 - s * 0.7));
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.raio * eased, 0, Math.PI * 2);
      ctx.stroke();
      return true;
    });

    const vivas: Particula[] = [];
    for (const p of particulas.current) {
      p.vida += dt;
      if (p.vida >= p.duracao) continue;
      const s = p.vida / p.duracao;
      if (p.tipo === "brasa") {
        p.giro += p.vgiro * dt;
        p.x += (p.vx + Math.sin(p.giro) * 18) * dt;
        p.y += p.vy * dt;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.sin(Math.PI * s) * 0.85;
        ctx.fillStyle = p.cor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.tamanho, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.tipo === "faisca") {
        p.vx *= 1 - p.arrasto * dt;
        p.vy = p.vy * (1 - p.arrasto * dt) + p.gravidade * dt;
        const x0 = p.x;
        const y0 = p.y;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = Math.max(0, 1 - s) * 0.95;
        ctx.strokeStyle = p.cor;
        ctx.lineWidth = p.tamanho * (1 - s * 0.6);
        ctx.lineCap = "round";
        ctx.beginPath();
        // O rastro: um traço entre a posição anterior (esticada) e a atual dá o brilho de faísca.
        ctx.moveTo(x0 - p.vx * dt * 2.2, y0 - p.vy * dt * 2.2);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        p.vx *= 1 - 0.9 * dt;
        p.vy = Math.min(p.vy + p.gravidade * dt, 260);
        p.giro += p.vgiro * dt;
        p.x += (p.vx + Math.sin(p.giro * 0.7) * 30) * dt;
        p.y += p.vy * dt;
        if (p.y > h + 30) continue;
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = s > 0.85 ? Math.max(0, (1 - s) / 0.15) : 1;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.giro);
        // Achata no eixo para parecer papel girando no ar.
        ctx.scale(1, Math.abs(Math.cos(p.giro * 1.7)) * 0.85 + 0.15);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.tamanho / 2, -p.tamanho * 0.3, p.tamanho, p.tamanho * 0.6);
        ctx.restore();
      }
      vivas.push(p);
    }
    particulas.current = vivas;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (particulas.current.length > 0 || ondas.current.length > 0 || fonteDeBrasas.current) {
      quadro.current = requestAnimationFrame((t) => proximoPasso.current(t));
    } else {
      quadro.current = null;
      ultimo.current = 0;
      ctx.clearRect(0, 0, w, h);
    }
  }, []);

  useEffect(() => {
    proximoPasso.current = passo;
  }, [passo]);

  const acordar = useCallback(() => {
    if (quadro.current === null) {
      ultimo.current = 0;
      quadro.current = requestAnimationFrame(passo);
    }
  }, [passo]);

  useEffect(() => {
    medir();
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      if (quadro.current !== null) cancelAnimationFrame(quadro.current);
      quadro.current = null;
    };
  }, [medir]);

  useImperativeHandle(
    ref,
    (): ApiFaiscas => ({
      explosao: ({ x, y, cores, quantidade = 120, forca = 1 }) => {
        if (reduzido) return;
        const { w, h } = tamanho.current;
        const escala = Math.min(w, h) / 900;
        const livres = Math.max(0, TETO - particulas.current.length);
        for (let i = 0; i < Math.min(quantidade, livres); i += 1) {
          const angulo = Math.random() * Math.PI * 2;
          const velocidade = sorteioEnfeite(220, 900) * forca * Math.max(0.55, escala);
          particulas.current.push({
            tipo: "faisca",
            x: x * w,
            y: y * h,
            vx: Math.cos(angulo) * velocidade,
            vy: Math.sin(angulo) * velocidade - 60,
            vida: 0,
            duracao: sorteioEnfeite(0.5, 1.35),
            cor: cores[i % cores.length] ?? "#fff",
            tamanho: sorteioEnfeite(1.2, 3.2),
            giro: 0,
            vgiro: 0,
            arrasto: sorteioEnfeite(1.6, 3.2),
            gravidade: sorteioEnfeite(260, 520),
          });
        }
        acordar();
      },
      onda: ({ x, y, cor, raio, espessura = 6, duracao = 0.75 }) => {
        if (reduzido) return;
        const { w, h } = tamanho.current;
        ondas.current.push({ x: x * w, y: y * h, cor, raio: raio ?? Math.hypot(w, h) * 0.55, espessura, vida: 0, duracao });
        acordar();
      },
      confete: ({ cores, quantidade = 140 }) => {
        if (reduzido) return;
        const { w } = tamanho.current;
        const livres = Math.max(0, TETO - particulas.current.length);
        for (let i = 0; i < Math.min(quantidade, livres); i += 1) {
          particulas.current.push({
            tipo: "confete",
            x: sorteioEnfeite(-0.05, 1.05) * w,
            y: sorteioEnfeite(-260, -20),
            vx: sorteioEnfeite(-60, 60),
            vy: sorteioEnfeite(40, 160),
            vida: 0,
            duracao: sorteioEnfeite(3.2, 5.6),
            cor: cores[i % cores.length] ?? "#f0c88a",
            tamanho: sorteioEnfeite(7, 14),
            giro: sorteioEnfeite(0, Math.PI * 2),
            vgiro: sorteioEnfeite(-7, 7),
            arrasto: 0,
            gravidade: sorteioEnfeite(70, 140),
          });
        }
        acordar();
      },
      brasas: (o) => {
        fonteDeBrasas.current = reduzido ? null : o;
        if (o && !reduzido) acordar();
      },
      limpar: () => {
        particulas.current = [];
        ondas.current = [];
        fonteDeBrasas.current = null;
      },
    }),
    [acordar, reduzido],
  );

  return (
    <canvas
      ref={tela}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", display: "block" }}
    />
  );
}
