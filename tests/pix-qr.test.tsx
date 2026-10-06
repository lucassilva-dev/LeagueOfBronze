import jsQR from "jsqr";
import QRCode from "qrcode";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PagamentoPix } from "@/components/pix/pagamento-pix";
import { QrCode } from "@/components/pix/qr-code";
import { MESSAGES } from "@/lib/i18n/messages";
import { pixDaInscricao } from "@/lib/pix";

/**
 * O QR que a tela DESENHA tem de ser lido de volta — por um decodificador que não é o
 * mesmo código que o gerou.
 *
 * O risco concreto: o componente monta o SVG à mão a partir da matriz. Trocar linha por
 * coluna na hora de desenhar produz um QR espelhado, que parece perfeito na tela e que o
 * app do banco não lê. Só ler a imagem de volta pega isso.
 */

const CHAVE = "97f2ba4a-cd26-4639-92ba-94a65a7d4eaa";

/** Rasteriza o SVG do componente (só o que ele desenha: quadradinhos de 1 módulo). */
function lerQrDoSvg(svg: string): string | null {
  const lado = Number(/viewBox="0 0 (\d+) (\d+)"/.exec(svg)?.[1]);
  const escala = 8;
  const largura = lado * escala;
  const pixels = new Uint8ClampedArray(largura * largura * 4).fill(255); // fundo branco

  const caminho = /<path d="([^"]+)"/.exec(svg)?.[1] ?? "";
  for (const [, x, y] of caminho.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    for (let dy = 0; dy < escala; dy++) {
      for (let dx = 0; dx < escala; dx++) {
        const i = ((Number(y) * escala + dy) * largura + (Number(x) * escala + dx)) * 4;
        pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
      }
    }
  }
  return jsQR(pixels, largura, largura)?.data ?? null;
}

describe("o QR do Pix é legível", () => {
  it("o desenho volta a ser exatamente o código Pix da inscrição", () => {
    const codigo = pixDaInscricao(CHAVE, 3000);
    const svg = renderToStaticMarkup(<QrCode texto={codigo} rotulo="Pix" />);
    expect(lerQrDoSvg(svg)).toBe(codigo);
  });

  it("na orientação certa: cada módulo no lugar da matriz, não espelhado", () => {
    // Ler de volta não basta: o jsQR (como vários leitores) também lê o QR espelhado, e o
    // teste acima passava com linha e coluna trocadas. Nem todo app de banco é tão
    // tolerante. A matriz da biblioteca é linha (y) × coluna (x), e é assim que os
    // renderizadores dela mesma a leem.
    const codigo = pixDaInscricao(CHAVE, 3000);
    const svg = renderToStaticMarkup(<QrCode texto={codigo} rotulo="Pix" />);
    const desenhados = new Set(
      [...(/<path d="([^"]+)"/.exec(svg)?.[1] ?? "").matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(
        ([, x, y]) => `${x},${y}`,
      ),
    );

    const { modules } = QRCode.create(codigo, { errorCorrectionLevel: "M" });
    const esperados = new Set<string>();
    for (let linha = 0; linha < modules.size; linha++) {
      for (let coluna = 0; coluna < modules.size; coluna++) {
        if (modules.get(linha, coluna)) esperados.add(`${coluna + 4},${linha + 4}`);
      }
    }
    expect(desenhados).toEqual(esperados);
  });

  it("um texto curto também (outro tamanho de matriz)", () => {
    const svg = renderToStaticMarkup(<QrCode texto="LoB" rotulo="teste" />);
    expect(lerQrDoSvg(svg)).toBe("LoB");
  });
});

describe("o bloco de pagamento", () => {
  const t = MESSAGES.pt.inscricao;

  it("mostra o QR, o copia e cola com os R$ 30,00 e a chave", () => {
    const html = renderToStaticMarkup(<PagamentoPix t={t} chave={CHAVE} valorCentavos={3000} />);
    const codigo = pixDaInscricao(CHAVE, 3000);

    expect(html).toContain("<svg");
    expect(html).toContain(codigo); // o copia e cola, inteiro
    expect(codigo).toContain("540530.00"); // o valor dentro do código
    expect(html).toContain(CHAVE);
    expect(html).toContain(t.pixCopiarCodigo);
    expect(html).not.toMatch(/\{valor\}/);
  });

  it("chave que não gera código não derruba a tela — sobra a chave para copiar", () => {
    const html = renderToStaticMarkup(<PagamentoPix t={t} chave="   " valorCentavos={3000} />);
    expect(html).not.toContain("<svg");
    expect(html).toContain(t.pixCopiar);
  });

  it("existe em inglês", () => {
    const html = renderToStaticMarkup(
      <PagamentoPix t={MESSAGES.en.inscricao} chave={CHAVE} valorCentavos={3000} />,
    );
    expect(html).toContain(MESSAGES.en.inscricao.pixCopiarCodigo);
    expect(html).not.toMatch(/\{valor\}/);
  });
});
