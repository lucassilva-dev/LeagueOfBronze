import type { CalendarioDaEdicao, SlotDoCalendario } from "@/lib/calendario-4a";

/** Um calendário com a grade (o `slots` é acessível sem checar `divulgado`). */
export type CalendarioDivulgado = Extract<CalendarioDaEdicao, { divulgado: true }>;

/**
 * GRADES DE TESTE do calendário da 4ª — nenhuma delas é o calendário oficial.
 *
 * O oficial (lib/calendario-4a-grade.ts) está "a divulgar" desde 2026-10-22, quando a 4ª
 * passou a 8 times. As páginas, a /tabela, a home e a criação das séries têm um caminho
 * para quando a grade existe, e esse caminho continua testado com estas grades:
 *
 *  - `CALENDARIO_6_TIMES_DE_20_10`: o calendário de 6 times publicado em 2026-10-20 (20 a
 *    29/11), guardado como cenário. Serve aos testes que usam o dataset da 3ª (6 times) de
 *    figurante.
 *  - `calendarioDe8TimesDeTeste()`: uma grade de MENTIRA com 8 times — 28 séries de pontos
 *    em MD3, todos contra todos, reserva, semifinais e final MD5 — no formato que o
 *    calendário de verdade vai ter quando as datas chegarem.
 *
 * Para usar numa página inteira, troque o módulo de dados:
 *
 *   vi.mock("@/lib/calendario-4a-grade", async () => ({
 *     CALENDARIO_OFICIAL_4A: (await import("../_calendarios")).CALENDARIO_6_TIMES_DE_20_10,
 *   }));
 */

const SLOTS_6_TIMES: readonly SlotDoCalendario[] = [
  // ---- 1º fim de semana
  { quando: "2026-11-20T20:00:00-03:00", tipo: "pontos", confronto: [3, 6], formato: "BO3" },
  { quando: "2026-11-20T22:00:00-03:00", tipo: "pontos", confronto: [2, 5], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-21T08:30:00-03:00", tipo: "pontos", confronto: [3, 4], formato: "BO3" },
  { quando: "2026-11-21T13:30:00-03:00", tipo: "pontos", confronto: [1, 3], formato: "BO3" },
  { quando: "2026-11-21T15:30:00-03:00", tipo: "pontos", confronto: [4, 6], formato: "BO3" },
  { quando: "2026-11-21T21:00:00-03:00", tipo: "pontos", confronto: [5, 6], formato: "BO3" },
  { quando: "2026-11-21T23:00:00-03:00", tipo: "pontos", confronto: [2, 4], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-22T08:30:00-03:00", tipo: "pontos", confronto: [1, 6], formato: "BO3" },
  { quando: "2026-11-22T13:00:00-03:00", tipo: "pontos", confronto: [2, 6], formato: "BO3" },
  { quando: "2026-11-22T15:00:00-03:00", tipo: "pontos", confronto: [1, 4], formato: "BO3" },

  // ---- 2º fim de semana
  { quando: "2026-11-27T20:00:00-03:00", tipo: "pontos", confronto: [4, 5], formato: "BO3" },
  { quando: "2026-11-27T22:00:00-03:00", tipo: "pontos", confronto: [2, 3], formato: "BO3", podeAtrasar: true },

  { quando: "2026-11-28T08:30:00-03:00", tipo: "pontos", confronto: [1, 5], formato: "BO3" },
  { quando: "2026-11-28T13:30:00-03:00", tipo: "pontos", confronto: [1, 2], formato: "BO3" },
  { quando: "2026-11-28T15:30:00-03:00", tipo: "pontos", confronto: [3, 5], formato: "BO3" },
  { quando: "2026-11-28T19:00:00-03:00", tipo: "reserva" },

  { quando: "2026-11-29T08:30:00-03:00", tipo: "semifinal", semifinal: 1, formato: "BO3" },
  { quando: "2026-11-29T10:30:00-03:00", tipo: "semifinal", semifinal: 2, formato: "BO3" },
  { quando: "2026-11-29T14:30:00-03:00", tipo: "final", formato: "BO5" },
];

/** O calendário de 6 times publicado em 2026-10-20 — só como cenário de teste. */
export const CALENDARIO_6_TIMES_DE_20_10: CalendarioDivulgado = { divulgado: true, times: 6, slots: SLOTS_6_TIMES };

/** Os confrontos todos contra todos pelo método do círculo: N-1 rodadas de N/2 jogos. */
function rodadasTodosContraTodos(n: number): [number, number][][] {
  const roda = Array.from({ length: n }, (_, i) => i + 1);
  const rodadas: [number, number][][] = [];
  for (let r = 0; r < n - 1; r++) {
    rodadas.push(Array.from({ length: n / 2 }, (_, i) => [roda[i]!, roda[n - 1 - i]!] as [number, number]));
    // O 1 fica parado; os outros giram uma casa.
    roda.splice(1, 0, roda.pop()!);
  }
  return rodadas;
}

/**
 * Uma grade de MENTIRA para 8 times, no formato do calendário que vai chegar: 28 séries de
 * pontos (MD3) em três fins de semana — sexta 20:00 e 22:00, sábado 08:30, 13:30, 15:30,
 * 21:00 e 23:00, domingo 08:30, 13:00 e 15:00 —, a reserva no sábado do 3º fim de semana
 * às 19:00 e, no domingo seguinte, as semifinais (MD3) e a final (MD5).
 */
export function calendarioDe8TimesDeTeste(): CalendarioDivulgado {
  const fins = [
    ["2026-11-20", "2026-11-21", "2026-11-22"],
    ["2026-11-27", "2026-11-28", "2026-11-29"],
    ["2026-12-04", "2026-12-05", "2026-12-06"],
  ];
  const horas = [
    ["20:00", "22:00"],
    ["08:30", "13:30", "15:30", "21:00", "23:00"],
    ["08:30", "13:00", "15:00"],
  ];
  const horarios: { quando: string; podeAtrasar: boolean }[] = [];
  for (const dias of fins) {
    dias.forEach((dia, d) => {
      for (const hora of horas[d]!) {
        horarios.push({ quando: `${dia}T${hora}:00-03:00`, podeAtrasar: hora === "22:00" || hora === "23:00" });
      }
    });
  }
  const jogos = rodadasTodosContraTodos(8).flat();
  const pontos: SlotDoCalendario[] = jogos.map((confronto, i) => ({
    quando: horarios[i]!.quando,
    tipo: "pontos",
    confronto,
    formato: "BO3",
    ...(horarios[i]!.podeAtrasar ? { podeAtrasar: true } : {}),
  }));
  return {
    divulgado: true,
    times: 8,
    slots: [
      ...pontos,
      { quando: "2026-12-05T19:00:00-03:00", tipo: "reserva" },
      { quando: "2026-12-13T08:30:00-03:00", tipo: "semifinal", semifinal: 1, formato: "BO3" },
      { quando: "2026-12-13T10:30:00-03:00", tipo: "semifinal", semifinal: 2, formato: "BO3" },
      { quando: "2026-12-13T14:30:00-03:00", tipo: "final", formato: "BO5" },
    ].sort((a, b) => a.quando.localeCompare(b.quando)) as SlotDoCalendario[],
  };
}
