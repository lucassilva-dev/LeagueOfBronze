import { describe, expect, it } from "vitest";

import {
  anguloDeParada,
  anguloLivre,
  anguloNoFreio,
  fatiaDoIndice,
  fatiaNoPonteiro,
  fatiasCruzadas,
  passoDaFatia,
  pinturaDasFatias,
  planejarFreio,
  posicaoDoRotulo,
  velocidadeLivre,
} from "@/lib/series/roda";

/**
 * A conta que a roda e o freio precisam compartilhar.
 *
 * O defeito que estes testes impedem não é uma exceção — é uma roda que para "quase" no
 * resultado certo. Numa transmissão ao vivo isso é pior do que não ter roda: o servidor
 * gravou lado azul para um time e a tela mostrou o outro.
 */

/** Onde o meio da fatia `i` foi parar depois de girar `giro`. 0° é o ponteiro. */
const meioDepoisDoGiro = (i: number, total: number, giro: number) =>
  (fatiaDoIndice(i, total).meio + giro) % 360;

describe("o freio encosta a fatia certa no ponteiro", () => {
  it("para qualquer quantidade de fatias e qualquer vencedora", () => {
    for (const total of [2, 3, 6, 8, 10, 12]) {
      for (let indice = 0; indice < total; indice += 1) {
        const parada = anguloDeParada({ giroAtual: 0, indice, total });
        // Tolerância de ponto flutuante, não de posição: 1e-9, não "meio grau".
        expect(meioDepoisDoGiro(indice, total, parada), `fatia ${indice} de ${total}`).toBeCloseTo(
          0,
          9,
        );
      }
    }
  });

  it("continua encostando mesmo partindo de um giro qualquer", () => {
    // A roda já está girando livre quando a resposta chega — o ângulo de partida é um
    // número grande e arbitrário, não zero.
    for (const giroAtual of [0, 37, 420, 1_260, 8_431.7, 100_000]) {
      const parada = anguloDeParada({ giroAtual, indice: 4, total: 8 });
      expect(meioDepoisDoGiro(4, 8, parada)).toBeCloseTo(0, 9);
    }
  });
});

describe("a roda nunca anda de ré", () => {
  it("a parada é sempre à frente, com voltas de sobra para a freada ter curso", () => {
    for (const giroAtual of [0, 1, 359, 360, 361, 5_000, 123_456.9]) {
      for (const total of [2, 8]) {
        for (let indice = 0; indice < total; indice += 1) {
          const parada = anguloDeParada({ giroAtual, indice, total });
          // Andar de ré entregaria o jogo: quem olha veria a roda "procurar" o resultado.
          expect(parada).toBeGreaterThan(giroAtual);
          expect(parada - giroAtual).toBeGreaterThanOrEqual(3 * 360);
        }
      }
    }
  });
});

describe("as fatias cobrem a roda inteira, sem sobra nem buraco", () => {
  it("uma fatia termina exatamente onde a próxima começa", () => {
    const total = 7;
    for (let i = 0; i < total - 1; i += 1) {
      expect(fatiaDoIndice(i, total).fim).toBeCloseTo(fatiaDoIndice(i + 1, total).inicio, 9);
    }
    expect(fatiaDoIndice(total - 1, total).fim).toBeCloseTo(360, 9);
  });

  it("a pintura declara os mesmos limites que a conta do freio", () => {
    // Se o gradiente e o freio discordarem, a roda para no lugar errado — e é exatamente
    // esse desencontro que existir uma função só evita.
    const pintura = pinturaDasFatias(["#a", "#b", "#c", "#d"]);
    for (let i = 0; i < 4; i += 1) {
      const { inicio, fim } = fatiaDoIndice(i, 4);
      expect(pintura).toContain(`${inicio.toFixed(3)}deg ${fim.toFixed(3)}deg`);
    }
  });

  it("não divide por zero quando não há fatia nenhuma", () => {
    expect(passoDaFatia(0)).toBe(360);
    expect(Number.isFinite(anguloDeParada({ giroAtual: 0, indice: 0, total: 0 }))).toBe(true);
  });
});

describe("o rótulo nasce virado para fora", () => {
  it("cada fatia planta o rótulo no seu quadrante", () => {
    // Com 4 fatias os meios caem em 45°, 135°, 225° e 315° — um por quadrante, no
    // sentido horário a partir do topo. Nenhum meio cai exatamente no topo, e é por isso
    // que a conta tem de ser trigonométrica e não "a primeira fica em cima".
    const [ne, se, so, no] = [0, 1, 2, 3].map((i) => posicaoDoRotulo(i, 4, 0.3));

    expect(ne!.esquerda).toBeGreaterThan(50);
    expect(ne!.topo).toBeLessThan(50);

    expect(se!.esquerda).toBeGreaterThan(50);
    expect(se!.topo).toBeGreaterThan(50);

    expect(so!.esquerda).toBeLessThan(50);
    expect(so!.topo).toBeGreaterThan(50);

    expect(no!.esquerda).toBeLessThan(50);
    expect(no!.topo).toBeLessThan(50);
  });

  it("o rótulo fica no raio pedido, nem no centro nem na borda", () => {
    const p = posicaoDoRotulo(1, 8, 0.33);
    const distancia = Math.hypot(p.esquerda - 50, p.topo - 50);
    expect(distancia).toBeCloseTo(33, 6);
  });

  it("a rotação do texto acompanha o meio da fatia", () => {
    expect(posicaoDoRotulo(1, 4, 0.3).rotacao).toBeCloseTo(fatiaDoIndice(1, 4).meio, 9);
  });
});

describe("o tique bate uma vez por fatia que cruza", () => {
  it("conta as fatias entre dois ângulos", () => {
    // 8 fatias = 45° cada. De 0° a 100° cruzaram as bordas de 45° e 90°.
    expect(fatiasCruzadas(0, 100, 8)).toBe(2);
    expect(fatiasCruzadas(0, 44, 8)).toBe(0);
    expect(fatiasCruzadas(0, 360, 8)).toBe(8);
  });

  it("não bate para trás nem quando o ângulo não anda", () => {
    expect(fatiasCruzadas(100, 100, 8)).toBe(0);
    expect(fatiasCruzadas(200, 100, 8)).toBe(0);
  });
});

describe("o giro contínuo do show (arranque, giro livre e freio sem tranco)", () => {
  const giro = { velocidade: 0.8, arranqueMs: 600 };

  it("o arranque sai do repouso e emenda no giro livre sem salto de velocidade", () => {
    expect(anguloLivre(giro, 0)).toBe(0);
    expect(velocidadeLivre(giro, 0)).toBe(0);
    expect(velocidadeLivre(giro, 600)).toBeCloseTo(0.8, 9);
    // A posição é contínua na emenda (mesmo valor por qualquer um dos lados).
    expect(anguloLivre(giro, 599.999)).toBeCloseTo(anguloLivre(giro, 600.001), 2);
    // Depois do arranque, anda 0,8°/ms.
    expect(anguloLivre(giro, 2600) - anguloLivre(giro, 1600)).toBeCloseTo(800, 6);
  });

  it("o freio termina com o meio da fatia sorteada no ponteiro — para qualquer partida", () => {
    for (const total of [2, 5, 7]) {
      for (let indice = 0; indice < total; indice += 1) {
        for (const giroAtual of [0, 13.7, 359.9, 1_234.5, 98_765.4]) {
          const freio = planejarFreio({ giroAtual, velocidade: 0.8, indice, total, duracaoAlvo: 3200 });
          const final = anguloNoFreio(freio, freio.duracao);
          expect(final).toBe(freio.parada);
          expect(meioDepoisDoGiro(indice, total, final)).toBeCloseTo(0, 9);
          expect(fatiaNoPonteiro(final, total), `${indice}/${total} de ${giroAtual}`).toBe(indice);
        }
      }
    }
  });

  it("começa na velocidade em que a roda estava e só desacelera (nunca anda de ré)", () => {
    const freio = planejarFreio({ giroAtual: 4_321, velocidade: 0.8, indice: 3, total: 5, duracaoAlvo: 3200 });
    const passo = 0.5;
    const v0 = (anguloNoFreio(freio, passo) - anguloNoFreio(freio, 0)) / passo;
    expect(v0).toBeCloseTo(0.8, 2);

    let anterior = anguloNoFreio(freio, 0);
    let velocidadeAnterior = Infinity;
    for (let ms = 20; ms <= freio.duracao; ms += 20) {
      const agora = anguloNoFreio(freio, ms);
      const velocidade = (agora - anterior) / 20;
      expect(agora).toBeGreaterThanOrEqual(anterior);
      expect(velocidade).toBeLessThanOrEqual(velocidadeAnterior + 1e-9);
      anterior = agora;
      velocidadeAnterior = velocidade;
    }
  });

  it("a duração fica perto da pedida e a freada tem ao menos uma volta", () => {
    for (const giroAtual of [0, 77, 3_000.25]) {
      for (const velocidade of [0.5, 0.8, 1.1]) {
        const freio = planejarFreio({ giroAtual, velocidade, indice: 1, total: 5, duracaoAlvo: 3200 });
        expect(freio.parada - freio.inicio).toBeGreaterThanOrEqual(360);
        // Uma volta a mais ou a menos muda a duração em (p+1)·360/v — a escolhida é a mais perto.
        const umaVolta = ((freio.potencia + 1) * 360) / velocidade;
        expect(Math.abs(freio.duracao - 3200)).toBeLessThanOrEqual(umaVolta / 2 + 1e-6);
      }
    }
  });

  it("a fatia sob o ponteiro acompanha o giro", () => {
    // 4 fatias: parada em 0°, o ponteiro está na fronteira entre a 3ª (270–360) e a 0ª.
    expect(fatiaNoPonteiro(360 - fatiaDoIndice(2, 4).meio, 4)).toBe(2);
    expect(fatiaNoPonteiro(anguloDeParada({ giroAtual: 0, indice: 1, total: 4 }), 4)).toBe(1);
  });
});
