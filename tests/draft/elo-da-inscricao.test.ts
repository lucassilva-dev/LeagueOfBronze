import { describe, expect, it } from "vitest";

import {
  eloDoJogadorDaInscricao,
  eloQueVale,
  leituraParaCongelar,
  temEloReconhecido,
  type CamposDeElo,
} from "@/lib/draft/elo-da-inscricao";
import { classeDoElo } from "@/lib/draft/precos";

/**
 * A fotografia do elo que o draft usa (preço e capitães). Depois do congelamento, só as
 * colunas congeladas contam — o que o robô da Riot lê de manhã não muda mais nada.
 */

const base: CamposDeElo = {
  elo_declarado: "Prata",
  elo_verificado: "Ouro",
  elo_congelado: null,
  elo_riot: "Ouro",
  riot_divisao: "II",
  riot_pdl: 61,
};

describe("eloDoJogadorDaInscricao", () => {
  it("sem congelar: o elo que vale e a última leitura da Riot", () => {
    expect(eloDoJogadorDaInscricao(base)).toEqual({ elo: "Ouro", eloRiot: "Ouro", divisao: "II", pdl: 61 });
  });

  it("congelado: só as colunas congeladas, mesmo que a Riot diga outra coisa hoje", () => {
    const congelada = { ...base, elo_congelado: "Ouro", divisao_congelada: "III", pdl_congelado: 7, riot_divisao: "I", riot_pdl: 99 };
    expect(eloDoJogadorDaInscricao(congelada)).toEqual({ elo: "Ouro", eloRiot: "Ouro", divisao: "III", pdl: 7 });
    expect(classeDoElo(eloDoJogadorDaInscricao(congelada)).rotulo).toBe("Ouro III");
  });

  it("congelado sem divisão (outro tier na Riot, ou antes da migração): meio do elo", () => {
    const semLeitura = { ...base, elo_congelado: "Ouro", divisao_congelada: null, pdl_congelado: null };
    expect(eloDoJogadorDaInscricao(semLeitura)).toEqual({ elo: "Ouro", eloRiot: null, divisao: null, pdl: null });
    // Banco sem as colunas novas: o `select *` simplesmente não as traz.
    expect(eloDoJogadorDaInscricao({ ...base, elo_congelado: "Ouro" }).eloRiot).toBeNull();
    expect(classeDoElo(eloDoJogadorDaInscricao(semLeitura)).rotulo).toBe("Ouro");
  });

  it("Mestre congelado leva o PDL: a faixa de preço não anda depois", () => {
    const mestre = { ...base, elo_verificado: "Mestre", elo_congelado: "Mestre", divisao_congelada: "I", pdl_congelado: 208, riot_pdl: 650 };
    expect(classeDoElo(eloDoJogadorDaInscricao(mestre)).rotulo).toBe("Mestre · 200–299 PDL");
  });

  it("o elo que vale: congelado, senão verificado, senão declarado", () => {
    expect(eloQueVale({ elo_congelado: "Platina", elo_verificado: "Ouro", elo_declarado: "Prata" })).toBe("Platina");
    expect(eloQueVale({ elo_congelado: null, elo_verificado: "Ouro", elo_declarado: "Prata" })).toBe("Ouro");
    expect(eloQueVale({ elo_congelado: null, elo_verificado: null, elo_declarado: "Prata" })).toBe("Prata");
    expect(temEloReconhecido({ elo_congelado: null, elo_verificado: "Lata", elo_declarado: "Prata" })).toBe(false);
  });
});

describe("leituraParaCongelar", () => {
  it("mesmo tier: guarda divisão (normalizada) e PDL", () => {
    expect(leituraParaCongelar({ elo: "Prata", eloRiot: "prata", divisao: " ii ", pdl: 75 })).toEqual({
      divisao_congelada: "II",
      pdl_congelado: 75,
    });
  });

  it("outro tier, sem leitura ou elo desconhecido: nada", () => {
    const nada = { divisao_congelada: null, pdl_congelado: null };
    expect(leituraParaCongelar({ elo: "Ouro", eloRiot: "Platina", divisao: "I", pdl: 80 })).toEqual(nada);
    expect(leituraParaCongelar({ elo: "Ouro", eloRiot: null, divisao: "I", pdl: 80 })).toEqual(nada);
    expect(leituraParaCongelar({ elo: "Lata", eloRiot: "Lata", divisao: "I", pdl: 80 })).toEqual(nada);
  });

  it("valores que o banco recusaria viram nulo, em vez de derrubar o congelamento", () => {
    expect(leituraParaCongelar({ elo: "Ouro", eloRiot: "Ouro", divisao: "V", pdl: -3 })).toEqual({
      divisao_congelada: null,
      pdl_congelado: null,
    });
    expect(leituraParaCongelar({ elo: "Ouro", eloRiot: "Ouro", divisao: "I", pdl: 12.5 }).pdl_congelado).toBeNull();
  });
});
