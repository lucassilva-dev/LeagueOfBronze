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

// ---------------------------------------------------------------- chave

/** Os dígitos verificadores de CPF/CNPJ: soma ponderada, resto de 11, "< 2 vira 0". */
function digitoVerificador(digitos: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((t, peso, i) => t + Number(digitos[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function cpfValido(d: string): boolean {
  if (!/^\d{11}$/.test(d) || /^(\d)\1{10}$/.test(d)) return false;
  return (
    digitoVerificador(d, [10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[9]) &&
    digitoVerificador(d, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[10])
  );
}

function cnpjValido(d: string): boolean {
  if (!/^\d{14}$/.test(d) || /^(\d)\1{13}$/.test(d)) return false;
  return (
    digitoVerificador(d, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[12]) &&
    digitoVerificador(d, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(d[13])
  );
}

const EVP = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ChavePixNormalizada = { ok: true; chave: string } | { ok: false; motivo: string };

/**
 * A chave Pix no formato do DICT — o único que o app do banco aceita dentro do QR.
 *
 * O BR Code leva a chave crua (campo 26/01), e o banco procura exatamente aquele texto:
 * «(11) 98765-4321» ou «123.456.789-09» geravam um QR que o app recusava, e «11987654321»
 * sem o +55 era procurado como CPF. Aqui só entram transformações sem chute — tirar a
 * pontuação de CPF/CNPJ e de telefone que já começa com +55, minúsculas em e-mail e chave
 * aleatória. O que é ambíguo (telefone sem +55, CPF com dígito errado) é RECUSADO com o
 * motivo, para quem cadastra corrigir — nunca adivinhado.
 */
export function normalizarChavePix(bruta: string): ChavePixNormalizada {
  const chave = bruta.trim();
  if (!chave) return { ok: false, motivo: "Chave Pix vazia." };

  if (chave.includes("@")) {
    const email = chave.toLowerCase();
    if (!EMAIL.test(email) || email.length > 77) return { ok: false, motivo: "Chave Pix: e-mail inválido." };
    return { ok: true, chave: email };
  }

  if (EVP.test(chave.toLowerCase())) return { ok: true, chave: chave.toLowerCase() };

  const semPontuacao = chave.replace(/[\s.\-/()]/g, "");
  if (semPontuacao.startsWith("+")) {
    if (/^\+55\d{10,11}$/.test(semPontuacao)) return { ok: true, chave: semPontuacao };
    return {
      ok: false,
      motivo: "Chave Pix de telefone: use +55, o DDD e o número, só com dígitos (ex.: +5511987654321).",
    };
  }

  if (/^\d+$/.test(semPontuacao)) {
    if (semPontuacao.length === 11 && cpfValido(semPontuacao)) return { ok: true, chave: semPontuacao };
    if (semPontuacao.length === 14 && cnpjValido(semPontuacao)) return { ok: true, chave: semPontuacao };
    return {
      ok: false,
      motivo:
        "Chave Pix: se for telefone, comece com +55 (ex.: +5511987654321); se for CPF ou CNPJ, confira os números.",
    };
  }

  return {
    ok: false,
    motivo: "Chave Pix inválida: use telefone com +55, CPF/CNPJ, e-mail ou a chave aleatória do banco.",
  };
}

export function pixCopiaECola(c: CobrancaPix): string {
  // A chave cadastrada antes da validação (ver `normalizarChavePix`) ainda pode estar
  // pontuada: o que dá para normalizar sem chute é normalizado aqui também, no QR.
  const normalizada = normalizarChavePix(c.chave);
  const chave = normalizada.ok ? normalizada.chave : c.chave.trim();
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
