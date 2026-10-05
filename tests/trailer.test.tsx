import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Trailer4a } from "@/components/trailer-4a";

const html = renderToStaticMarkup(<Trailer4a aria="Trailer" semSuporte="sem suporte" />);

describe("trailer da 4ª Edição", () => {
  it("tem os dois formatos, e nenhum toca nem baixa sozinho", () => {
    const videos = html.match(/<video[^>]*>/g) ?? [];
    expect(videos).toHaveLength(2);
    for (const v of videos) {
      expect(v).toContain('preload="none"');
      expect(v).toContain("controls");
      expect(v).not.toMatch(/autoplay/i);
    }
    expect(html).toContain('class="lob-trailer-largo"');
    expect(html).toContain('class="lob-trailer-alto"');
  });

  // Vídeo que não existe vira um player preto em produção, sem erro nenhum no build.
  it("todo arquivo que o componente aponta existe em /public", () => {
    const caminhos = [...html.matchAll(/(?:src|poster)="(\/trailer\/[^"]+)"/g)].map((m) => m[1]);
    expect(caminhos).toHaveLength(4);
    for (const c of caminhos) {
      const arquivo = path.join(process.cwd(), "public", c);
      expect(existsSync(arquivo), c).toBe(true);
      expect(statSync(arquivo).size, c).toBeGreaterThan(10_000);
      // O GitHub avisa acima de 50 MB e RECUSA o push acima de 100 MB — e sem push não há deploy.
      expect(statSync(arquivo).size, c).toBeLessThan(50 * 1024 * 1024);
    }
  });

  it("a imagem de prévia do /trailer existe no tamanho que os apps de mensagem usam", () => {
    const og = path.join(process.cwd(), "public", "trailer", "og.jpg");
    expect(existsSync(og)).toBe(true);
    // Cabeçalho JPEG: largura e altura do primeiro marcador SOF.
    const buf = readFileSync(og);
    let i = 2;
    while (i < buf.length) {
      const marcador = buf[i + 1];
      const tam = buf.readUInt16BE(i + 2);
      if (marcador >= 0xc0 && marcador <= 0xc2) {
        expect([buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]).toEqual([1200, 630]);
        return;
      }
      i += 2 + tam;
    }
    throw new Error("og.jpg sem cabeçalho de quadro JPEG");
  });
});
