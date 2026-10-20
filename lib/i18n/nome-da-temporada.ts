/**
 * O nome da temporada no idioma da página.
 *
 * O nome vem do dataset ("4ª Edição", digitado no painel ao iniciar a temporada), e as
 * páginas o usam no lugar de cravar o número da edição. Em inglês isso deixava
 * "League of Bronze — 4ª Edição" no meio de um texto em inglês — e o /calendario trocava de
 * "4th Edition" para "4ª Edição" no momento em que as séries eram criadas.
 *
 * Só o formato "Nª Edição" é traduzido; qualquer outro nome ("2º Campeonato do Grupo")
 * passa como está, porque é nome próprio.
 */
export function nomeDaTemporada(nome: string, localeTag: string): string {
  if (!localeTag.toLowerCase().startsWith("en")) return nome;
  const m = /^(\d+)\s*[ªº°]?\s*edi[çc][ãa]o$/i.exec(nome.trim());
  if (!m) return nome;
  const n = Number(m[1]);
  const final = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${final} Edition`;
}
