import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compara dois segredos sem vazar, pelo tempo de resposta, quanto do valor bateu.
 *
 * Os dois lados passam pelo SHA-256 antes do `timingSafeEqual`: ele exige buffers do
 * mesmo tamanho, e recusar na hora quando o tamanho difere contaria a quem testa de fora
 * quantos caracteres o segredo tem. Com o hash, todo palpite custa o mesmo.
 */
export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
