import { describe, expect, it } from "vitest";

import { forcaDoElo, rankingDeCapitaes, type CandidatoACapitao } from "@/lib/draft/capitaes";
import { embaralhar } from "@/lib/series/sorteio";

function c(
  id: string,
  elo: string,
  divisao: string | null,
  pdl: number | null,
  extra: Partial<CandidatoACapitao> = {},
): CandidatoACapitao {
  return { id, riotId: `${id}#BR1`, organizador: false, elo, eloRiot: divisao === null ? null : elo, divisao, pdl, ...extra };
}

describe("capitães pela regra da 4ª: maior elo na solo/duo, sem organizador", () => {
  it("ordena por elo, depois divisão, depois PDL", () => {
    const r = rankingDeCapitaes(
      [c("ouro", "Ouro", "I", 99), c("d4", "Diamante", "IV", 0), c("d1", "Diamante", "I", 14), c("d3", "Diamante", "III", 50), c("mestre", "Mestre", "I", 210)],
      3,
    );
    expect(r.ranking.map((x) => x.id)).toEqual(["mestre", "d1", "d3", "d4", "ouro"]);
    expect(r.escolhidos).toEqual(["mestre", "d1", "d3"]);
    expect(r.empateNoCorte).toBeNull();
  });

  it("organizador nunca é capitão, mesmo sendo o maior elo", () => {
    const r = rankingDeCapitaes(
      [c("nakay", "Mestre", "I", 210, { organizador: true }), c("a", "Diamante", "III", 50), c("b", "Diamante", "IV", 5)],
      2,
    );
    expect(r.escolhidos).toEqual(["a", "b"]);
    expect(r.organizadoresFora).toEqual(["nakay#BR1"]);
  });

  it("empate exato no corte NÃO é decidido por alfabeto: devolve o empate e não escolhe ninguém", () => {
    // O caso real de outubro: dois Esmeralda I com 75 PDL disputando a última vaga.
    const r = rankingDeCapitaes([c("x", "Diamante", "IV", 0), c("aura", "Esmeralda", "I", 75), c("parrudo", "Esmeralda", "I", 75)], 2);
    expect(r.escolhidos).toEqual([]);
    expect(r.empateNoCorte).toEqual(["aura#BR1", "parrudo#BR1"]);
  });

  it("empate DENTRO do corte não atrapalha (a ordem entre capitães é sorteada depois)", () => {
    const r = rankingDeCapitaes([c("a", "Diamante", "IV", 0), c("b", "Diamante", "IV", 0), c("z", "Ouro", "I", 10)], 2);
    expect(r.empateNoCorte).toBeNull();
    expect(new Set(r.escolhidos)).toEqual(new Set(["a", "b"]));
  });

  it("sem leitura da Riot no mesmo elo do corte, não dá para saber quem está acima: é empate", () => {
    // `sem` foi travado à mão em Diamante (a Riot mostra outro elo): divisão desconhecida.
    const sem = c("sem", "Diamante", null, null);
    const r = rankingDeCapitaes([c("d1", "Diamante", "I", 90), c("d2", "Diamante", "II", 10), sem], 2);
    expect(r.escolhidos).toEqual([]);
    expect(r.empateNoCorte).toContain("sem#BR1");
  });

  it("a leitura da Riot só desempata se for do mesmo elo que dá o preço", () => {
    // Elo travado em Platina pela organização; a Riot diz Ouro I. A divisão "I" é do Ouro.
    const f = forcaDoElo({ elo: "Platina", eloRiot: "Ouro", divisao: "I", pdl: 80 });
    expect(f.divisao).toBeNull();
    expect(f.pdl).toBeNull();
    expect(f.rotulo).toBe("Platina");
    expect(forcaDoElo({ elo: "Diamante", eloRiot: "Diamante", divisao: "II", pdl: 54 }).rotulo).toBe("Diamante II · 54 PDL");
  });

  it("diz quantos faltam quando não há candidatos fora da organização", () => {
    const r = rankingDeCapitaes([c("a", "Ouro", "I", 1), c("org", "Mestre", "I", 1, { organizador: true })], 2);
    expect(r.faltam).toBe(1);
    expect(r.escolhidos).toEqual([]);
  });
});

describe("o sorteio da ordem (embaralhar com semente)", () => {
  const lista = ["a", "b", "c", "d", "e", "f"];

  it("é uma permutação e sai igual com a mesma semente — dá para conferir", () => {
    const um = embaralhar("semente-1", "capitaes", lista);
    expect([...um].sort()).toEqual(lista);
    expect(embaralhar("semente-1", "capitaes", lista)).toEqual(um);
  });

  it("não mexe na lista de entrada", () => {
    const entrada = [...lista];
    embaralhar("qualquer", "capitaes", entrada);
    expect(entrada).toEqual(lista);
  });

  it("não é a ordem de entrada disfarçada: o primeiro da lista não fica sempre em primeiro", () => {
    // Antes do sorteio, o capitão de maior elo (o primeiro da lista) escolhia primeiro em
    // toda montagem. Em 60 sementes, ele tem de cair em mais de uma posição.
    const posicoes = new Set(Array.from({ length: 60 }, (_, i) => embaralhar(`s${i}`, "capitaes", lista).indexOf("a")));
    expect(posicoes.size).toBeGreaterThan(3);
  });

  it("rótulos diferentes dão sorteios independentes da mesma semente", () => {
    const capitaes = embaralhar("mesma", "capitaes", lista);
    const calendario = Array.from({ length: 10 }, (_, i) => embaralhar("mesma", `calendario${i}`, lista));
    expect(calendario.some((x) => x.join() !== capitaes.join())).toBe(true);
  });
});
