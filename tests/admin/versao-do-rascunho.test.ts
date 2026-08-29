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
    expect(proximaVersaoDoRascunho(1, 1, 2)).toBe(2);
  });

  it("MANTÉM a versão antiga quando outra pessoa salvou no meio", () => {
    /*
     * O rascunho está na versão 1; outra pessoa salvou e o servidor foi para 2; a rota
     * do sorteio leu 2 e gravou 3.
     *
     * Adotar 3 aqui carimbaria um rascunho com dados da versão 1 como se fosse a 3: a
     * trava do PUT deixaria de disparar e o Salvar seguinte apagaria em silêncio o que a
     * outra pessoa gravou. Mantendo 1, o Salvar cai em 409 e quem edita escolhe.
     */
    expect(proximaVersaoDoRascunho(1, 2, 3)).toBe(1);
  });

  it("não mexe na versão quando a rota não informou as duas pontas", () => {
    // Resposta antiga ou incompleta não pode ser motivo para mexer na trava.
    expect(proximaVersaoDoRascunho(1, undefined, 3)).toBe(1);
    expect(proximaVersaoDoRascunho(1, 1, undefined)).toBe(1);
    expect(proximaVersaoDoRascunho(1, undefined, undefined)).toBe(1);
    // Rascunho ainda sem versão (antes do primeiro GET) não vira número por acidente.
    expect(proximaVersaoDoRascunho(null, 1, 2)).toBeNull();
  });
});
