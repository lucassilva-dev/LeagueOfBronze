"use client";

import { useEffect, useRef } from "react";

function getCryptoRandom() {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] / 0xffffffff;
}

function getRandomBetween(min: number, max: number) {
  return min + getCryptoRandom() * (max - min);
}

export function StarsCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const media = globalThis.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars: Array<{ x: number; y: number; r: number; vx: number; vy: number; a: number }> = [];

    const resize = () => {
      width = globalThis.innerWidth;
      height = globalThis.innerHeight;
      dpr = Math.min(globalThis.devicePixelRatio || 1, 1.8);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(48, Math.max(18, Math.floor((width * height) / 38000)));
      stars = Array.from({ length: count }, () => ({
        x: getRandomBetween(0, width),
        y: getRandomBetween(0, height),
        r: getRandomBetween(0.4, 1.6),
        vx: getRandomBetween(-0.01, 0.01),
        vy: getRandomBetween(0.01, 0.04),
        a: getRandomBetween(0.1, 0.55),
      }));
    };

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(32, now - last);
      last = now;
      ctx.clearRect(0, 0, width, height);

      for (const s of stars) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (s.x < 0) s.x = width;
        if (s.x > width) s.x = 0;
        if (s.y > height) {
          s.y = -5;
          s.x = getRandomBetween(0, width);
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(180, 215, 255, ${s.a})`;
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    raf = requestAnimationFrame(frame);
    globalThis.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(raf);
      globalThis.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 -z-10 opacity-70" />;
}
