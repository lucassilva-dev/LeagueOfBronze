import { describe, expect, it } from "vitest";

import { proximaVersaoDoRascunho } from "@/components/admin/shared";

/**
 * A regra que decide se o rascunho pode adotar a versão que o sorteio ao vivo devolveu.
 *
 * O sorteio grava por conta própria, então a versão do servidor avança e todo "Salvar"
 * seguinte cairia em 409. Adotar a versão nova resolve isso — mas só quando a rota
 * partiu da MESMA versão que este rascunho tem.
 *
 * ⚠ O caso que importa é o DIVERGENTE. Um teste que só exercitasse o caso convergente
 * passaria verde com o defeito dentro (adotar a versão sempre), porque nesse caminho os
 * dois comportamentos coincidem. Por isso os dois casos estão aqui.
 */
describe("versão do rascunho depois de um sorteio ao vivo", () => {
  it("ADOTA a versão nova quando a rota partiu da versão que o rascunho tem", () => {
    // Caso normal: ninguém salvou no meio. Sem isto, o Salvar seguinte cai em 409 à toa.
    expect(proximaVersaoDoRascunho("V1", "V1", "V2")).toBe("V2");
  });

  it("MANTÉM a versão antiga quando outra pessoa salvou no meio", () => {
    /*
     * O rascunho está em V1; outra pessoa salvou e o servidor foi para V2; a rota do
     * sorteio leu V2 e gravou V3.
     *
     * Adotar V3 aqui carimbaria um rascunho com dados de V1 como se fosse V3: a trava de
     * concorrência do PUT deixaria de disparar e o Salvar seguinte apagaria em silêncio o
     * que a outra pessoa gravou. Mantendo V1, o Salvar cai em 409 e quem edita escolhe.
     */
    expect(proximaVersaoDoRascunho("V1", "V2", "V3")).toBe("V1");
  });

  it("não mexe na versão quando a rota não informou as duas pontas", () => {
    // Resposta antiga ou incompleta não pode ser motivo para mexer na trava.
    expect(proximaVersaoDoRascunho("V1", undefined, "V3")).toBe("V1");
    expect(proximaVersaoDoRascunho("V1", "V1", undefined)).toBe("V1");
    expect(proximaVersaoDoRascunho("V1", undefined, undefined)).toBe("V1");
  });
});
