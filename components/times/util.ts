/** Junta classes, pulando as vazias (`cx(s.a, ativo && s.b)`). */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

type Classes = Readonly<Record<string, string>>;

/**
 * As classes de uma peça da página temática: a da estrutura (tema.module.css, ficha.module.css)
 * e, se o cenário tiver uma classe com o MESMO nome no módulo dele, essa também — é o gancho
 * que deixa o cenário restilizar a peça. `c("casca", capitao && "cascaCapitao")`.
 */
export function comCenario(base: Classes, cenario?: Classes) {
  return (...nomes: (string | false | null | undefined)[]) =>
    cx(...nomes.flatMap((nome) => (nome ? [base[nome], cenario?.[nome]] : [])));
}

export type ClassesDaPeca = ReturnType<typeof comCenario>;
