import { z } from "zod";

import { resolveElo, resolveRole } from "@/lib/design";

/**
 * Validação da inscrição da 4ª Edição.
 *
 * A decisão que governa este arquivo: **o cliente nunca informa quantos pontos vale.**
 * O formulário do design enviava `pontos: EM[elo].p` calculado no navegador, o que
 * permitiria mandar `elo: Ferro, pontos: 15`. Como ponto é o preço do jogador no
 * draft, isso é adulteração direta do sorteio. Aqui o jogador declara só o ELO, e
 * `pontosDoElo()` deriva o valor a partir da mesma tabela que o site usa.
 */

// ---------------------------------------------------------------- limites

export const LIMITES_INSCRICAO = {
  nick: 32,
  tag: 8,
  nome: 120,
  email: 254,
  discord: 64,
  whatsapp: 24,
  texto: 500,
} as const;

const texto = (max: number) => z.string().trim().min(1).max(max);

// ---------------------------------------------------------------- elo e rota

/**
 * Pontos a partir do elo, pela mesma tabela do site (`lib/design.ts`).
 * Devolve `null` para elo desconhecido — quem chama decide se é erro.
 */
export function pontosDoElo(elo: string): number | null {
  return resolveElo(elo)?.pts ?? null;
}

/**
 * Chave canônica da rota (TOP/JUNG/MID/ADC/SUP) a partir de qualquer alias.
 *
 * Devolve `meta.key`, NÃO `meta.short`. A diferença só aparece na selva, onde a chave
 * é "JUNG" e o rótulo curto é "SEL" — e gravar "SEL" produzia um valor que nem o
 * `resolveRole` do próprio site reconhece (jungler saía com a pílula genérica "Rota",
 * sem ícone e no fim da ordenação) nem este schema aceita de volta numa reedição.
 */
export function rotaCanonica(rota: string): string | null {
  const meta = resolveRole(rota);
  return meta.key === "" ? null : meta.key;
}

/**
 * Elo aceito. O formulário manda o rótulo em português ("Grão-Mestre"); os aliases
 * de `lib/design.ts` resolvem isso, então não duplicamos a lista aqui — se a tabela
 * de elos mudar num lugar só, este schema acompanha.
 */
const eloField = z
  .string()
  .trim()
  .min(1, "Informe o elo.")
  .max(24)
  .refine((v) => resolveElo(v) !== null, "Elo não reconhecido.");

const rotaField = z
  .string()
  .trim()
  .min(1, "Informe a rota.")
  .max(24)
  .refine((v) => rotaCanonica(v) !== null, "Rota não reconhecida.");

// ---------------------------------------------------------------- Riot ID

/**
 * O Riot ID é `Nome#TAG`. Guardamos nick e tag separados porque a coluna `riot_id`
 * no banco é gerada por concatenação — assim o índice de unicidade não depende de o
 * cliente montar a string do jeito certo.
 */
const nickField = z
  .string()
  .trim()
  .min(3, "O nick precisa de ao menos 3 caracteres.")
  .max(LIMITES_INSCRICAO.nick)
  .refine((v) => !v.includes("#"), "Não inclua o # aqui — a tag vai no campo ao lado.");

// O `#` sai ANTES de medir. Na ordem inversa ele contava para o mínimo, e "#A"
// passava como se tivesse dois caracteres — gravando o Riot ID "Nick#A".
const tagField = z
  .string()
  .trim()
  .transform((v) => v.replace(/^#/, ""))
  .pipe(
    z
      .string()
      .min(2, "A tag precisa de ao menos 2 caracteres.")
      .max(LIMITES_INSCRICAO.tag)
      .regex(/^[A-Za-z0-9]+$/, "A tag usa só letras e números."),
  );

// ---------------------------------------------------------------- inscrição

/** O que o formulário público envia. Note que `pontos` NÃO está aqui, de propósito. */
export const inscricaoPublicaSchema = z
  .object({
    nick: nickField,
    tag: tagField,
    nomeReal: z.string().trim().max(LIMITES_INSCRICAO.nome).optional(),
    // `email` NÃO está aqui: vem da sessão do jogador, no servidor. Mesmo princípio
    // dos pontos — se o cliente pudesse escolher, daria para inscrever no e-mail de
    // outra pessoa e depois disputar a titularidade da inscrição.
    discord: texto(LIMITES_INSCRICAO.discord),
    whatsapp: z.string().trim().max(LIMITES_INSCRICAO.whatsapp).optional(),

    elo: eloField,
    rotaPrimaria: rotaField,
    rotaSecundaria: rotaField,
    querCapitao: z.boolean().default(false),

    aceiteRegulamento: z.literal(true, { message: "É preciso aceitar o regulamento." }),
    aceiteImagem: z.literal(true, { message: "É preciso autorizar o uso de imagem (regra s)." }),
    aceiteRequisitos: z.literal(true, { message: "É preciso confirmar que cumpre os requisitos." }),
  })
  .refine((d) => rotaCanonica(d.rotaPrimaria) !== rotaCanonica(d.rotaSecundaria), {
    message: "A rota secundária precisa ser diferente da primária.",
    path: ["rotaSecundaria"],
  });

export type InscricaoPublica = z.infer<typeof inscricaoPublicaSchema>;

/**
 * Converte o que veio do formulário na linha que vai ao banco.
 *
 * Os dois valores que o cliente NÃO fornece entram aqui: os pontos, derivados do elo,
 * e o e-mail, que vem da sessão de quem está enviando.
 */
export function linhaDeInscricao(dados: InscricaoPublica, email: string) {
  const pontos = pontosDoElo(dados.elo);
  if (pontos === null) {
    // O schema já barrou, então chegar aqui significa que a tabela de elos mudou
    // sob os nossos pés. Falhar alto é melhor do que gravar preço errado.
    throw new Error(`Elo sem pontuação definida: ${dados.elo}`);
  }

  return {
    nick: dados.nick,
    tag: dados.tag.toUpperCase(),
    nome_real: dados.nomeReal || null,
    email: email.trim().toLowerCase(),
    discord: dados.discord,
    whatsapp: dados.whatsapp || null,
    elo_declarado: dados.elo,
    pontos,
    rota_primaria: rotaCanonica(dados.rotaPrimaria)!,
    rota_secundaria: rotaCanonica(dados.rotaSecundaria)!,
    quer_capitao: dados.querCapitao,
    aceite_regulamento: dados.aceiteRegulamento,
    aceite_imagem: dados.aceiteImagem,
    aceite_requisitos: dados.aceiteRequisitos,
  };
}

// ---------------------------------------------------------------- conferência

export const ITENS_CONFERENCIA = ["a", "b", "d", "e", "f", "m"] as const;
export type ItemConferencia = (typeof ITENS_CONFERENCIA)[number];

/** O texto de cada item, para a tela nunca deixar dois critérios parecerem o mesmo. */
export const REGRA_DO_ITEM: Record<ItemConferencia, { titulo: string; detalhe: string }> = {
  a: {
    titulo: "Tempo de grupo",
    detalhe:
      "Está no grupo oficial (Discord/WhatsApp) há pelo menos o mínimo definido, contado antes da abertura das inscrições. O WhatsApp não tem data de entrada auditável — para quem só está lá, alguém da organização precisa atestar à mão.",
  },
  b: {
    titulo: "Riot vinculada ao Discord",
    detalhe:
      "No Discord, vincular a conta e exibir a conexão no perfil são configurações diferentes. Se o jogador não deixar visível, peça o print — não reprove sem avisar.",
  },
  d: {
    titulo: "Colocação concluída",
    detalhe:
      "São as 5 PRIMEIRAS ranqueadas da temporada, na fila solo/duo. Flex e normal não contam. Não confunda com o item (e): alguém pode ter feito a colocação em janeiro e não jogar nada em outubro — cumpre (d) e falha (e).",
  },
  e: {
    titulo: "Atividade ranqueada recente",
    detalhe:
      "Mínimo de partidas na fila solo/duo dentro dos 30 dias anteriores ao início. Normais, ARAM e flex não contam. Só é avaliável depois que a data de início existir.",
  },
  f: {
    titulo: "Não é smurf",
    detalhe:
      "Conta criada para jogar num elo mais baixo que o real. Critério da organização: tempo de conta, nível de invocador e histórico de elo. Guarde o retrato do que foi visto — o histórico externo muda.",
  },
  m: {
    titulo: "Riot ID informado",
    detalhe:
      "O nick declarado precisa bater com a conta que vai jogar. Jogar com conta diferente, sem aviso, dá W.O. para o time.",
  },
};

export const ESTADOS_CONFERENCIA = [
  "pendente",
  "ok",
  "provisorio",
  "risco",
  "recusado",
  "nao_avaliavel",
  "excecao",
] as const;
export type EstadoConferencia = (typeof ESTADOS_CONFERENCIA)[number];

export const conferenciaPatchSchema = z.object({
  inscricaoId: z.string().uuid(),
  item: z.enum(ITENS_CONFERENCIA),
  estado: z.enum(ESTADOS_CONFERENCIA),
  observacao: z.string().trim().max(LIMITES_INSCRICAO.texto).optional(),
  retrato: z.record(z.string(), z.unknown()).optional(),
});

// ---------------------------------------------------------------- pagamento

export const ESTADOS_PAGAMENTO = [
  "aguardando",
  "declarado",
  "pago",
  "isento",
  "estorno_devido",
  "estornado",
  "cancelado",
] as const;
export type EstadoPagamento = (typeof ESTADOS_PAGAMENTO)[number];

/** Rótulo de cada estado. "declarado" e "pago" nunca podem ser colapsados. */
export const ROTULO_PAGAMENTO: Record<EstadoPagamento, string> = {
  aguardando: "Aguardando pagamento",
  declarado: "Declarado pelo jogador",
  pago: "Pago e conferido",
  isento: "Isento (organização)",
  estorno_devido: "Estorno devido",
  estornado: "Estornado",
  cancelado: "Cancelado sem pagamento",
};

export const pagamentoPatchSchema = z.object({
  inscricaoId: z.string().uuid(),
  estado: z.enum(ESTADOS_PAGAMENTO),
  observacao: z.string().trim().max(LIMITES_INSCRICAO.texto).optional(),
});

// ---------------------------------------------------------------- ficha e configuração

/**
 * O que a organização pode mudar numa inscrição.
 *
 * `pontos` NÃO está aqui, de propósito — nem vindo de um admin. O preço do jogador
 * continua derivado do elo no servidor (ver `atualizarInscricao`); aceitá-lo aqui
 * abriria pela porta dos fundos exatamente o que o formulário público fecha.
 */
export const fichaPatchSchema = z.object({
  inscricaoId: z.string().uuid(),
  situacao: z.enum(["pendente", "apto", "recusado", "desistiu", "sobra"]).optional(),
  observacao: z.string().trim().max(LIMITES_INSCRICAO.texto).nullable().optional(),
  organizador: z.boolean().optional(),
  eloVerificado: z
    .string()
    .trim()
    .max(24)
    .refine((v) => v === "" || resolveElo(v) !== null, "Elo não reconhecido.")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  // `YYYY-MM-DD`, como a coluna `date` do Postgres espera.
  entrouNoGrupo: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use o formato AAAA-MM-DD.")
    .nullable()
    .optional(),
});

/** Data-âncora: string ISO ou nulo. Nulo é estado legítimo — "ainda não decidimos". */
const dataOpcional = z.string().trim().datetime({ offset: true }).nullable().optional();

export const configPatchSchema = z.object({
  inscricoes_abertas: z.boolean().optional(),
  abertura_inscricoes: dataOpcional,
  fechamento_inscricoes: dataOpcional,
  prazo_vinculo_riot: dataOpcional,
  congelamento_elo: dataOpcional,
  data_draft: dataOpcional,
  inicio_campeonato: dataOpcional,
  jogadores_por_time: z.number().int().min(1).max(10).optional(),
  orcamento_por_time: z.number().int().min(1).max(999).optional(),
  min_ranqueadas: z.number().int().min(0).max(999).optional(),
  dias_no_grupo: z.number().int().min(0).max(3650).optional(),
  prazo_pagamento_dias: z.number().int().min(1).max(365).optional(),
  segundos_por_escolha: z.number().int().min(5).max(600).optional(),
  taxa_centavos: z.number().int().min(0).max(1_000_000).optional(),
  pct_campeao: z.number().int().min(0).max(100).optional(),
  chave_pix: z.string().trim().max(140).nullable().optional(),
  responsavel_financeiro: z.string().trim().max(120).nullable().optional(),
});

// ---------------------------------------------------------------- janela

export type EstadoJanela = "aberta" | "ainda_nao_abriu" | "encerrada" | "indisponivel";

/**
 * Em que ponto da janela de inscrição estamos.
 *
 * Função pura, com o "agora" recebido, por dois motivos: dá para testar as bordas sem
 * mexer no relógio, e a página não precisa chamar `Date.now()` durante a renderização
 * — o que, num componente, é leitura de valor instável.
 *
 * "ainda não abriu" e "encerrada" são estados diferentes porque a resposta que a
 * pessoa precisa é diferente: um pede paciência, o outro pede falar com a organização.
 * O que manda é a chave `inscricoes_abertas`; a data só distingue os dois avisos.
 */
export function estadoDaJanela(
  config: { inscricoes_abertas: boolean; fechamento_inscricoes: string | null } | null,
  agoraMs: number = Date.now(),
): EstadoJanela {
  if (!config) return "indisponivel";
  if (config.inscricoes_abertas) return "aberta";

  if (config.fechamento_inscricoes) {
    const fim = new Date(config.fechamento_inscricoes).getTime();
    if (Number.isFinite(fim) && fim < agoraMs) return "encerrada";
  }
  return "ainda_nao_abriu";
}

// ---------------------------------------------------------------- times

/**
 * Quantos times cabem, a partir de quem foi aprovado.
 *
 * NÃO existe teto de inscrições nesta edição: a organização aceita até bater o
 * mínimo, mirando ~50 pessoas. Então o número de times é derivado, nunca fixo — o
 * design entregue tinha 6 times cravados no código, o que não vale mais.
 *
 * A sobra são os aprovados que ficaram de fora quando os times fecharam. Não é fila
 * com ordem: a organização resolve na conversa do grupo.
 */
export function distribuirTimes(aprovados: number, jogadoresPorTime = 5) {
  if (jogadoresPorTime <= 0) throw new Error("jogadoresPorTime precisa ser positivo.");
  const times = Math.floor(aprovados / jogadoresPorTime);
  return { times, vagas: times * jogadoresPorTime, sobra: aprovados - times * jogadoresPorTime };
}

/**
 * O draft cabe no orçamento? Cada time tem `orcamentoPorTime` pontos, e o capitão
 * já sai desse mesmo bolo. Se a soma dos aprovados passar do teto, não há como
 * montar os elencos — e é melhor a organização saber disso antes do sorteio.
 */
export function viabilidadeDeOrcamento(
  pontosDosAprovados: readonly number[],
  jogadoresPorTime = 5,
  orcamentoPorTime = 30,
) {
  const { times, vagas, sobra } = distribuirTimes(pontosDosAprovados.length, jogadoresPorTime);
  // Só os que entram contam para o teto; a sobra fica de fora dos times.
  const maisBaratos = [...pontosDosAprovados].sort((a, b) => a - b).slice(0, vagas);
  const total = maisBaratos.reduce((soma, p) => soma + p, 0);
  const teto = times * orcamentoPorTime;
  return { times, vagas, sobra, total, teto, cabe: total <= teto, folga: teto - total };
}
