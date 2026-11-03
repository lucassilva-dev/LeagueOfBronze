/**
 * AS CORES DO CONFRONTO — um par de cores que se distingue de longe, para a roda dos lados e o
 * cabo de guerra dos abates.
 *
 * Cada time tem várias cores no tema (a cor do site, a primária, o neon, o metal). Dois times
 * podem ter a cor principal parecida — EQUIPE RX e GALÁCTICOS DO BAR são os dois azuis —, e numa
 * roda que gira a 9 fatias por segundo duas fatias azuis viram uma só. Aqui se escolhe, entre as
 * candidatas de cada time, o par mais distante no espaço OKLab (distância perceptual), com uma
 * leve preferência pelas primeiras candidatas (as mais "do time"). Se nem assim der contraste, o
 * segundo time fica no bronze neutro.
 *
 * Só para PALCO (fatias, barras). O painel de LADO na revelação é sempre azul/vermelho.
 */

/** Bronze neutro para quando os dois times não se separam de jeito nenhum. */
export const COR_NEUTRA_DO_CONFRONTO = "#8a7a62";

/** Abaixo disto (distância OKLab) duas cores se confundem numa fatia girando. */
const CONTRASTE_MINIMO = 0.12;

/** Quanto cada posição na lista de candidatas "custa" (preferir a cor principal do time). */
const PESO_DA_ORDEM = 0.025;

function hexParaRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace("#", "");
  const cheio = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(cheio)) return null;
  const n = Number.parseInt(cheio, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** sRGB (0–255) → OKLab (Björn Ottosson). */
export function paraOklab(hex: string): [number, number, number] | null {
  const rgb = hexParaRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Distância perceptual entre duas cores (0 = iguais). Cor inválida conta como distância 0. */
export function distanciaOklab(a: string, b: string): number {
  const x = paraOklab(a);
  const y = paraOklab(b);
  if (!x || !y) return 0;
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/**
 * O par [cor do A, cor do B] para o palco. As listas vêm em ordem de preferência (a primeira é a
 * cor principal do time) e não podem ser vazias.
 */
export function coresDoConfronto(candidatasA: readonly string[], candidatasB: readonly string[]): [string, string] {
  const a = candidatasA.length > 0 ? candidatasA : [COR_NEUTRA_DO_CONFRONTO];
  const b = candidatasB.length > 0 ? candidatasB : [COR_NEUTRA_DO_CONFRONTO];
  let melhor: { par: [string, string]; nota: number; distancia: number } | null = null;
  a.forEach((ca, i) => {
    b.forEach((cb, j) => {
      const distancia = distanciaOklab(ca, cb);
      const nota = distancia - PESO_DA_ORDEM * (i + j);
      if (!melhor || nota > melhor.nota) melhor = { par: [ca, cb], nota, distancia };
    });
  });
  const escolhido = melhor as { par: [string, string]; nota: number; distancia: number } | null;
  if (!escolhido || escolhido.distancia < CONTRASTE_MINIMO) return [a[0]!, COR_NEUTRA_DO_CONFRONTO];
  return escolhido.par;
}
