import { describe, expect, it } from "vitest";

import { alertasDoInscrito, type InscritoParaAlerta } from "@/lib/inscricoes/alertas";
import { linkDeCobranca, listaDeQuemFaltaPagar, mensagemDeCobranca, numeroParaWhatsApp } from "@/lib/inscricoes/cobranca";
import { foraDaCobranca } from "@/lib/inscricoes/pagamento";
import { AUTOR_RIOT } from "@/lib/riot/decidir";

const AGORA = Date.parse("2026-10-07T12:00:00.000Z");
const CONFIG = { inicio_campeonato: null, min_ranqueadas: 5 };

describe("cobrança pelo WhatsApp", () => {
  it("aceita os formatos que chegam do formulário e recusa o resto", () => {
    expect(numeroParaWhatsApp("(11) 98765-4321")).toBe("5511987654321");
    expect(numeroParaWhatsApp("+55 11 98765-4321")).toBe("5511987654321");
    expect(numeroParaWhatsApp("1133334444")).toBe("551133334444");
    expect(numeroParaWhatsApp("987654321")).toBeNull();
    expect(numeroParaWhatsApp("44 20 7946 0958 123")).toBeNull();
    expect(numeroParaWhatsApp(null)).toBeNull();
  });

  it("a mensagem leva valor, prazo, o Pix pronto e o link do PRÓPRIO site", () => {
    const texto = mensagemDeCobranca({
      riotId: "Fulano#BR1",
      valorCentavos: 3000,
      chavePix: "123e4567-e89b-12d3-a456-426614174000",
      venceEm: "2026-10-19T15:00:00.000Z",
      origem: "https://teste-league-of-bronze.vercel.app",
    });
    expect(texto).toContain("Oi, Fulano!");
    expect(texto).toMatch(/R\$\s?30,00/);
    expect(texto).toContain("19/10");
    expect(texto).toMatch(/^000201/m); // o BR Code começa assim
    expect(texto).toContain("https://teste-league-of-bronze.vercel.app/minha-inscricao");
  });

  it("sem número válido não há link", () => {
    expect(
      linkDeCobranca({ whatsapp: "abc", riotId: "X#Y", valorCentavos: 3000, chavePix: null, venceEm: null, origem: "https://x" }),
    ).toBeNull();
    expect(
      linkDeCobranca({ whatsapp: "11987654321", riotId: "X#Y", valorCentavos: 3000, chavePix: null, venceEm: null, origem: "https://x" }),
    ).toMatch(/^https:\/\/wa\.me\/5511987654321\?text=/);
  });

  it("a lista para o grupo leva só Riot ID e prazo — nada de contato", () => {
    const texto = listaDeQuemFaltaPagar(
      [
        { riotId: "B#2", venceEm: "2026-10-20T00:00:00.000Z" },
        { riotId: "A#1", venceEm: "2026-10-19T12:00:00.000Z" },
      ],
      3000,
    );
    expect(texto.indexOf("A#1")).toBeLessThan(texto.indexOf("B#2"));
    expect(texto).not.toMatch(/@|wa\.me|\(\d{2}\)/);
  });
});

describe("cobrança que morreu com a inscrição", () => {
  it("recusado ou desistente que não pagou sai da cobrança — quem pagou, não", () => {
    expect(foraDaCobranca("recusado", "aguardando")).toBe(true);
    expect(foraDaCobranca("desistiu", "aguardando")).toBe(true);
    expect(foraDaCobranca("recusado", "pago")).toBe(false);
    expect(foraDaCobranca("pendente", "aguardando")).toBe(false);
  });
});

function inscrito(over: Partial<InscritoParaAlerta> = {}): InscritoParaAlerta {
  return {
    riot_id: "Fulano#BR1",
    situacao: "pendente",
    organizador: false,
    elo_declarado: "Ouro",
    elo_verificado: null,
    ...over,
  };
}

const ok = ["a", "b", "d", "e", "f", "m"].map((item) => ({ item, estado: "ok" }));

function codigos(over: Partial<Parameters<typeof alertasDoInscrito>[0]> = {}) {
  return alertasDoInscrito({
    inscrito: inscrito(),
    conferencias: ok,
    pagamento: { estado: "pago" },
    config: CONFIG,
    agoraMs: AGORA,
    ...over,
  }).map((a) => a.codigo);
}

describe("pontos de atenção", () => {
  it("nada de errado: nenhum alerta", () => {
    expect(codigos()).toEqual([]);
  });

  it("troca de Riot ID, sem confundir caixa diferente com troca", () => {
    expect(codigos({ inscrito: inscrito({ riot_id_atual: "Outro#BR1" }) })).toContain("nick_trocado");
    expect(codigos({ inscrito: inscrito({ riot_id_atual: "fulano#br1" }) })).not.toContain("nick_trocado");
    expect(codigos({ inscrito: inscrito({ riot_id: "Famoso Parrudao#6969", riot_id_atual: "Famoso Parrudão#6969" }) })).not.toContain(
      "nick_trocado",
    );
  });

  it("declarou 2+ pontos de diferença da Riot: aponta o fato", () => {
    expect(codigos({ inscrito: inscrito({ elo_declarado: "Ouro", elo_riot: "Diamante" }) })).toContain("declarou_diferente");
    expect(codigos({ inscrito: inscrito({ elo_declarado: "Ouro", elo_riot: "Platina" }) })).not.toContain("declarou_diferente");
  });

  it("elo travado diferente do que a Riot mostra", () => {
    expect(
      codigos({ inscrito: inscrito({ elo_fonte: "organizacao", elo_verificado: "Ouro", elo_riot: "Prata" }) }),
    ).toContain("elo_travado_diverge");
  });

  it("apto com requisito ruim (o sistema não rebaixa sozinho)", () => {
    const ruim = ok.map((c) => (c.item === "b" ? { ...c, estado: "recusado" } : c));
    expect(codigos({ inscrito: inscrito({ situacao: "apto" }), conferencias: ruim })).toContain("apto_com_requisito");
  });

  it("caixa: organizador cobrado, recusado pago, desistente com pagamento — cada um com sua ação", () => {
    const org = alertasDoInscrito({
      inscrito: inscrito({ organizador: true }),
      conferencias: ok,
      pagamento: { estado: "aguardando" },
      config: CONFIG,
      agoraMs: AGORA,
    });
    expect(org.find((a) => a.codigo === "organizador_cobrado")?.acaoPagamento).toBe("isento");

    const recusado = alertasDoInscrito({
      inscrito: inscrito({ situacao: "recusado" }),
      conferencias: ok,
      pagamento: { estado: "pago" },
      config: CONFIG,
      agoraMs: AGORA,
    });
    expect(recusado.find((a) => a.codigo === "recusado_pago")?.acaoPagamento).toBe("estorno_devido");

    expect(codigos({ inscrito: inscrito({ situacao: "desistiu" }), pagamento: { estado: "declarado" } })).toContain(
      "desistiu_com_pagamento",
    );
    // Desistente: sem botão — o regulamento não define reembolso.
    const desistiu = alertasDoInscrito({
      inscrito: inscrito({ situacao: "desistiu" }),
      conferencias: ok,
      pagamento: { estado: "pago" },
      config: CONFIG,
      agoraMs: AGORA,
    });
    expect(desistiu.find((a) => a.codigo === "desistiu_com_pagamento")?.acaoPagamento).toBeUndefined();
  });

  it("(e) aprovado à mão com a Riot contando menos que o mínimo, depois do início", () => {
    const config = { inicio_campeonato: "2026-10-05T00:00:00.000Z", min_ranqueadas: 5 };
    const humano = ok.map((c) => (c.item === "e" ? { ...c, conferido_por: "lucas" } : c));
    expect(codigos({ inscrito: inscrito({ riot_partidas_janela: 2 }), conferencias: humano, config })).toContain(
      "e_abaixo_do_minimo",
    );
    // Se foi o robô que aprovou, a contagem dele é a mesma — não há o que apontar.
    const robo = ok.map((c) => (c.item === "e" ? { ...c, conferido_por: AUTOR_RIOT } : c));
    expect(codigos({ inscrito: inscrito({ riot_partidas_janela: 2 }), conferencias: robo, config })).not.toContain(
      "e_abaixo_do_minimo",
    );
  });
});
