import { beforeEach, describe, expect, it, vi } from "vitest";

import type { EstadoDraft, JogadorDoDraft } from "@/lib/draft/motor";

/**
 * A transmissão, o /capitao e a mesa mostram o nick de HOJE de quem trocou de nick depois do
 * sorteio — sem o draft gravado mudar (ele guarda o declarado, que é a chave com a inscrição).
 */

const banco = vi.hoisted(() => ({
  linhas: [] as { id: string; riot_id: string; riot_id_atual: string | null; situacao?: string }[],
  leituras: 0,
  falhar: false,
}));

vi.mock("@/lib/data-store", () => ({
  ConflitoDeVersaoError: class extends Error {},
  isSupabaseConfigured: () => true,
  createSupabaseAdminClient: () => ({
    from: (tabela: string) => {
      if (tabela !== "inscricoes") throw new Error(`tabela inesperada: ${tabela}`);
      return {
        select: (colunas: string) => {
          expect(colunas).toBe("id,riot_id,riot_id_atual,situacao");
          return {
            not: () => ({
              returns: async () => {
                banco.leituras++;
                if (banco.falhar) return { data: null, error: { message: "fora do ar" } };
                return { data: banco.linhas.map((l) => ({ situacao: "apto", ...l })), error: null };
              },
            }),
          };
        },
      };
    },
  }),
}));

const { comNicksAtuais, esquecerNicksGuardados, paraPublico, recusaComNickAtual } = await import("@/lib/draft/store");

const jogador = (id: string, riotId: string, timeId: string | null): JogadorDoDraft => ({
  id,
  riotId,
  pontos: 5,
  rota1: "MID",
  rota2: "TOP",
  elo: "Ouro",
  timeId,
});

function estado(): EstadoDraft {
  return {
    fase: "encerrado",
    times: [{ id: "t1", nome: "Time 1", cor: "#fff", capitaoId: "cap" }],
    jogadores: [jogador("cap", "Capitao#BR1", "t1"), jogador("nak", "Nak4y#BR1", "t1"), jogador("pool", "Livre#BR1", null)],
    ordem: ["t1"],
    escolhaAtual: 1,
    prazoISO: null,
    orcamentoPorTime: 30,
    jogadoresPorTime: 2,
    historico: [{ escolha: 0, timeId: "t1", jogadorId: "nak", automatica: false }],
  } as unknown as EstadoDraft;
}

beforeEach(() => {
  esquecerNicksGuardados();
  banco.linhas = [];
  banco.leituras = 0;
  banco.falhar = false;
});

describe("comNicksAtuais", () => {
  it("troca o nome de quem trocou de nick, sem mexer no estado recebido", async () => {
    banco.linhas = [
      { id: "nak", riot_id: "Nak4y#BR1", riot_id_atual: "Nak4y Novo#BR1" },
      { id: "cap", riot_id: "Capitao#BR1", riot_id_atual: "Capitao#BR1" },
      { id: "pool", riot_id: "Livre#BR1", riot_id_atual: "SemTag" },
    ];
    const original = estado();
    const mostrado = await comNicksAtuais(original);

    expect(mostrado.jogadores.map((j) => j.riotId)).toEqual(["Capitao#BR1", "Nak4y Novo#BR1", "Livre#BR1"]);
    expect(mostrado.jogadores.map((j) => j.id)).toEqual(["cap", "nak", "pool"]);
    expect(original.jogadores[1]!.riotId).toBe("Nak4y#BR1");
  });

  it("a visão pública fica coerente: elenco, capitão e histórico com o mesmo nome novo", async () => {
    banco.linhas = [
      { id: "nak", riot_id: "Nak4y#BR1", riot_id_atual: "Nak4y Novo#BR1" },
      { id: "cap", riot_id: "Capitao#BR1", riot_id_atual: "Capitão Novo#BR1" },
    ];
    const publico = paraPublico(await comNicksAtuais(estado() as never), 3);

    expect(publico.times[0]!.capitaoRiotId).toBe("Capitão Novo#BR1");
    expect(publico.elencos.t1!.map((j) => j.riotId)).toEqual(["Capitão Novo#BR1", "Nak4y Novo#BR1"]);
    expect(publico.historico[0]!.riotId).toBe("Nak4y Novo#BR1");
  });

  it("ninguém trocou: devolve o MESMO estado", async () => {
    const original = estado();
    expect(await comNicksAtuais(original)).toBe(original);
  });

  it("a leitura falhou: mostra o estado como está (o draft não para por isso)", async () => {
    banco.falhar = true;
    const original = estado();
    expect(await comNicksAtuais(original)).toBe(original);
  });

  it("guarda a leitura por um minuto: a sondagem de 2 s não vira uma consulta a cada 2 s", async () => {
    await comNicksAtuais(estado());
    await comNicksAtuais(estado());
    expect(banco.leituras).toBe(1);
  });

  it("excluído e recusado não têm o nick que o robô viu na rota pública (ficou velho)", async () => {
    banco.linhas = [{ id: "nak", riot_id: "Nak4y#BR1", riot_id_atual: "Nak4y Novo#BR1", situacao: "excluido" }];
    const original = estado();
    expect(await comNicksAtuais(original)).toBe(original);
  });
});

describe("recusaComNickAtual", () => {
  it("o motor decide no estado gravado; o texto da recusa sai com o nome que a tela mostra", async () => {
    banco.linhas = [{ id: "pool", riot_id: "Livre#BR1", riot_id_atual: "Livre Novo#BR1" }];
    const recusa = await recusaComNickAtual(
      { ok: false, codigo: "saiu_do_pool", motivo: "Livre#BR1 saiu do draft.", params: { riotId: "Livre#BR1" } },
      estado(),
      "pool",
    );
    expect(recusa.motivo).toBe("Livre Novo#BR1 saiu do draft.");
    expect(recusa.params).toEqual({ riotId: "Livre Novo#BR1" });
  });
});

