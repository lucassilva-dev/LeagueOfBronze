/**
 * Nomes e cores dos times do draft.
 *
 * O design entregue trazia seis: CHAMA, ÁUREA, VERDANTE, GÉLIDA, ARCANA, CARMESIM.
 * Eles continuam sendo os seis primeiros, na mesma ordem e com as mesmas cores — quem
 * jogou a edição passada reconhece. O que mudou é que agora existe continuação: com
 * ~50 inscritos fecham 10 times, e uma paleta de seis deixaria quatro sem identidade.
 *
 * As cores são escolhidas para se distinguirem UMAS DAS OUTRAS sobre o fundo escuro do
 * site, que é o problema real: numa transmissão, dois times de tons próximos viram o
 * mesmo time para quem assiste. Por isso os matizes andam em volta do círculo em vez
 * de variarem só em brilho.
 */

export type NomeDeTime = { nome: string; cor: string };

export const TIMES_DO_DRAFT: readonly NomeDeTime[] = [
  // Os seis da 4ª Edição desenhada, preservados.
  { nome: "CHAMA", cor: "#ef7d34" },
  { nome: "ÁUREA", cor: "#e0b13c" },
  { nome: "VERDANTE", cor: "#3fb27f" },
  { nome: "GÉLIDA", cor: "#45a8d8" },
  { nome: "ARCANA", cor: "#9a6ae0" },
  { nome: "CARMESIM", cor: "#d9455f" },

  // A continuação, para as edições que passarem de seis times.
  { nome: "MARÉ", cor: "#2fb3a8" },
  { nome: "SEIVA", cor: "#8fc23f" },
  { nome: "ALVORADA", cor: "#e8618c" },
  { nome: "ABISMO", cor: "#6a63d8" },
  { nome: "FORJA", cor: "#b8763a" },
  { nome: "NÉVOA", cor: "#7f93a8" },
  { nome: "BRASA", cor: "#d94f2b" },
  { nome: "ORVALHO", cor: "#4fc3d9" },
] as const;

/**
 * Identidade do time na posição `indice`.
 *
 * Passando do fim da lista, repete com um numeral — feio, mas honesto: melhor um
 * "CHAMA II" do que dois times chamados CHAMA na mesma transmissão. Com 5 jogadores
 * por time isso só aconteceria a partir de 70 inscritos aprovados.
 */
export function identidadeDoTime(indice: number): NomeDeTime {
  const base = TIMES_DO_DRAFT[indice % TIMES_DO_DRAFT.length]!;
  const volta = Math.floor(indice / TIMES_DO_DRAFT.length);
  if (volta === 0) return base;

  const numeral = ["", "II", "III", "IV", "V"][volta] ?? String(volta + 1);
  return { nome: `${base.nome} ${numeral}`, cor: base.cor };
}
