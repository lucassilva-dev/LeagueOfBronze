import QRCode from "qrcode";

/**
 * Um QR code em SVG, desenhado a partir da matriz — sem imagem, sem `data:`, sem
 * `dangerouslySetInnerHTML`. Funciona igual no servidor e no navegador.
 *
 * Fundo branco com margem de 4 módulos: é o que os leitores esperam. Sobre o fundo escuro
 * do site, um QR "invertido" (claro sobre escuro) falha em vários apps de banco.
 */
export function QrCode({
  texto,
  tamanho = 220,
  rotulo,
}: Readonly<{ texto: string; tamanho?: number; rotulo: string }>) {
  const { modules } = QRCode.create(texto, { errorCorrectionLevel: "M" });
  const margem = 4;
  const lado = modules.size + margem * 2;

  // Um caminho só, um quadradinho por módulo escuro: leve de desenhar e nítido em
  // qualquer escala (`crispEdges`).
  let d = "";
  for (let linha = 0; linha < modules.size; linha++) {
    for (let coluna = 0; coluna < modules.size; coluna++) {
      if (modules.get(linha, coluna)) d += `M${coluna + margem} ${linha + margem}h1v1h-1z`;
    }
  }

  return (
    <svg
      role="img"
      aria-label={rotulo}
      viewBox={`0 0 ${lado} ${lado}`}
      width={tamanho}
      height={tamanho}
      shapeRendering="crispEdges"
      style={{ display: "block", maxWidth: "100%", height: "auto", borderRadius: 6 }}
    >
      <rect width={lado} height={lado} fill="#ffffff" />
      <path d={d} fill="#000000" />
    </svg>
  );
}
