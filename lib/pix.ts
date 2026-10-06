/**
 * "Pix copia e cola" — o BR Code estático do Banco Central, o mesmo texto que vai dentro
 * do QR code.
 *
 * Formato: uma sequência de campos TLV (id de 2 dígitos, tamanho de 2 dígitos, valor),
 * fechada por um CRC16 de 4 dígitos hexadecimais (campo 63). Referência: "Manual de
 * Padrões para Iniciação do Pix", do Banco Central — o teste deste arquivo usa o exemplo
 * oficial do manual para provar a conta.
 *
 * Sem dependência e sem nada de servidor: o formulário roda isto no navegador.
 *
 * Nome e cidade do recebedor são campos OBRIGATÓRIOS do formato, mas não são eles que a
 * pessoa confere ao pagar: o app do banco consulta a chave no DICT e mostra o titular de
 * verdade antes de confirmar. Por isso eles podem ser o nome do campeonato e uma cidade
 * genérica sem enganar ninguém.
 */

const GUI_PIX = "br.gov.bcb.pix";

/** Limites do formato (em caracteres). */
const LIMITE = { nome: 25, cidade: 15, descricao: 72, campo: 99 } as const;

export type CobrancaPix = Readonly<{
  /** A chave como está cadastrada: aleatória (UUID), e-mail, CPF/CNPJ ou telefone (+55…). */
  chave: string;
  /** Em centavos. Sem valor, quem paga digita. */
  valorCentavos?: number;
  /** Aparece no app de quem paga, em alguns bancos. */
  descricao?: string;
  nomeRecebedor: string;
  cidade: string;
}>;

/** Campo TLV. O tamanho é contado em caracteres — por isso tudo passa por `ascii` antes. */
function campo(id: string, valor: string): string {
  if (valor.length > LIMITE.campo) throw new Error(`Campo ${id} do Pix passou de ${LIMITE.campo} caracteres.`);
  return `${id}${String(valor.length).padStart(2, "0")}${valor}`;
}

/**
 * Só ASCII imprimível, sem acento: o tamanho declarado em cada campo é em caracteres, e um
 * "ç" que um leitor conte como 2 bytes desalinha o resto do código inteiro.
 */
function ascii(texto: string, maximo: number): string {
  return texto
    // Os ordinais não se decompõem em letra + acento: sem isto, "4ª" virava "4".
    .replace(/ª/g, "a")
    .replace(/º/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximo);
}

/** CRC16-CCITT (polinômio 0x1021, início 0xFFFF), como o Banco Central especifica. */
export function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function pixCopiaECola(c: CobrancaPix): string {
  const chave = c.chave.trim();
  if (!chave) throw new Error("Chave Pix vazia.");

  // Conta da chave (26): o identificador do Pix, a chave e, se couber, a descrição.
  const base = campo("00", GUI_PIX) + campo("01", chave);
  const espaco = LIMITE.campo - base.length - 4; // 4 = id + tamanho do campo 02
  const descricao = c.descricao ? ascii(c.descricao, Math.min(LIMITE.descricao, Math.max(0, espaco))) : "";
  const conta = base + (descricao ? campo("02", descricao) : "");

  const nome = ascii(c.nomeRecebedor, LIMITE.nome);
  const cidade = ascii(c.cidade, LIMITE.cidade);
  if (!nome || !cidade) throw new Error("Nome e cidade do recebedor são obrigatórios no Pix.");

  let valor = "";
  if (c.valorCentavos !== undefined) {
    if (!Number.isInteger(c.valorCentavos) || c.valorCentavos <= 0) {
      throw new Error("O valor do Pix precisa ser um número inteiro e positivo de centavos.");
    }
    valor = campo("54", (c.valorCentavos / 100).toFixed(2));
  }

  const semCrc =
    campo("00", "01") + // versão do formato
    campo("26", conta) +
    campo("52", "0000") + // categoria do recebedor: não informada
    campo("53", "986") + // moeda: real
    valor +
    campo("58", "BR") +
    campo("59", nome) +
    campo("60", cidade) +
    campo("62", campo("05", "***")) + // sem identificador de transação (Pix estático)
    "6304";

  return semCrc + crc16(semCrc);
}

/**
 * O Pix da inscrição: a chave da edição, o valor da taxa e a identificação do campeonato.
 * Um lugar só, para a tela de inscrição recebida e a "Minha inscrição" gerarem exatamente
 * o mesmo código.
 */
export function pixDaInscricao(chave: string, valorCentavos: number): string {
  return pixCopiaECola({
    chave,
    valorCentavos,
    descricao: "Inscricao League of Bronze",
    nomeRecebedor: "LEAGUE OF BRONZE",
    cidade: "BRASIL",
  });
}
