import { z } from "zod";

import { resolveElo, resolveRole } from "@/lib/design";
import { LIMITES_INSCRICAO } from "@/lib/inscricoes/passo1";
import { TURNOS } from "@/lib/inscricoes/turnos";

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

// Moram em `passo1.ts`, que não depende de zod, porque o formulário também os usa no
// navegador. Reexportados aqui para quem já os importava deste arquivo.
export { LIMITES_INSCRICAO };

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

/**
 * Nome e sobrenome, como no grupo do WhatsApp (seção 2 do regulamento da 4ª). Obrigatório:
 * é por ele que a organização confere a regra 1 — ser do grupo e conhecido.
 */
const nomeCompletoField = z
  .string()
  .trim()
  .min(3, "Informe nome e sobrenome.")
  .max(LIMITES_INSCRICAO.nome)
  .refine((v) => v.split(/\s+/).filter(Boolean).length >= 2, "Informe nome e sobrenome.");

/**
 * O @ sai antes de gravar. O índice único do banco é sobre `lower(discord)`, e com o @ a
 * mesma pessoa passava duas vezes como "@fulano" e "fulano" — o regulamento manda o
 * Discord repetido bloquear a inscrição.
 */
const discordField = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@+/, "").trim())
  .pipe(z.string().min(1, "Informe o usuário do Discord.").max(LIMITES_INSCRICAO.discord));

/** Regra 9: ao menos um turno, sem repetição. */
const disponibilidadeField = z
  .array(z.enum(TURNOS))
  .min(1, "Marque pelo menos um turno.")
  .max(TURNOS.length)
  .transform((v) => [...new Set(v)]);

/** O que o formulário público envia. Note que `pontos` NÃO está aqui, de propósito. */
export const inscricaoPublicaSchema = z
  .object({
    nick: nickField,
    tag: tagField,
    nomeReal: nomeCompletoField,
    // `email` NÃO está aqui: vem da sessão do jogador, no servidor. Mesmo princípio
    // dos pontos — se o cliente pudesse escolher, daria para inscrever no e-mail de
    // outra pessoa e depois disputar a titularidade da inscrição.
    discord: discordField,
    whatsapp: z.string().trim().max(LIMITES_INSCRICAO.whatsapp).optional(),

    elo: eloField,
    rotaPrimaria: rotaField,
    rotaSecundaria: rotaField,
    disponibilidade: disponibilidadeField,
    // IGNORADO: na 4ª os capitães são os inscritos de maior elo na solo/duo (seção 3),
    // não voluntários — `linhaDeInscricao` grava sempre falso. Continua no schema só para
    // um `querCapitao` de tipo errado ainda ser recusado em vez de passar calado. (Quem
    // abriu o formulário antigo é tratado na rota: ele nem manda `disponibilidade`.)
    querCapitao: z.boolean().default(false),

    aceiteRegulamento: z.literal(true, { message: "É preciso aceitar o regulamento." }),
    aceiteImagem: z.literal(true, { message: "É preciso autorizar o uso de imagem (regra 17)." }),
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
    nome_real: dados.nomeReal,
    email: email.trim().toLowerCase(),
    discord: dados.discord,
    whatsapp: dados.whatsapp || null,
    elo_declarado: dados.elo,
    pontos,
    rota_primaria: rotaCanonica(dados.rotaPrimaria)!,
    rota_secundaria: rotaCanonica(dados.rotaSecundaria)!,
    disponibilidade: dados.disponibilidade,
    // Sempre falso: na 4ª ninguém se candidata a capitão (seção 3 do regulamento).
    quer_capitao: false,
    aceite_regulamento: dados.aceiteRegulamento,
    aceite_imagem: dados.aceiteImagem,
    aceite_requisitos: dados.aceiteRequisitos,
  };
}

// ---------------------------------------------------------------- conferência

export const ITENS_CONFERENCIA = ["a", "b", "d", "e", "f", "m"] as const;
export type ItemConferencia = (typeof ITENS_CONFERENCIA)[number];

/**
 * O texto de cada item, para a tela nunca deixar dois critérios parecerem o mesmo.
 *
 * As CHAVES (a, b, d, e, f, m) vêm da numeração por letra da 3ª Edição e ficam como estão:
 * estão no `check` do banco e nas conferências já gravadas. O que a organização lê é o
 * título, que cita a regra da 4ª.
 */
export const REGRA_DO_ITEM: Record<ItemConferencia, { titulo: string; detalhe: string }> = {
  a: {
    titulo: "Membro do grupo (regra 1)",
    detalhe:
      "Está no grupo oficial (WhatsApp/Discord) e a organização conhece. Não importa desde quando: estar no grupo basta.",
  },
  b: {
    titulo: "Riot vinculada ao Discord (regra 21)",
    detalhe:
      "No Discord, vincular a conta (Configurações > Conexões) e exibir a conexão no perfil são configurações diferentes. Se o jogador não deixar visível, peça o print — não reprove sem avisar.",
  },
  d: {
    titulo: "MD5 da solo/duo (regra 3)",
    detalhe:
      "As 5 PRIMEIRAS ranqueadas da temporada, na fila solo/duo. Flex e normal não contam. Não confunda com o item (e): alguém pode ter feito a MD5 em janeiro e não jogar nada em novembro — cumpre (d) e falha (e).",
  },
  e: {
    titulo: "Partidas recentes (regra 4)",
    detalhe:
      "Mínimo de partidas na fila solo/duo nos 10 dias anteriores ao início do torneio. Normais, ARAM e flex não contam. Só é avaliável depois que a data de início existir.",
  },
  f: {
    titulo: "Não é smurf (regra 5)",
    detalhe:
      "Conta criada para jogar num elo mais baixo que o real. Critério da organização: tempo de conta, nível de invocador e histórico de elo. Guarde o retrato do que foi visto — o histórico externo muda.",
  },
  m: {
    titulo: "Riot ID informado (regra 12)",
    detalhe:
      "O nick declarado precisa bater com a conta que vai jogar. Trocar de conta ou mudar o nickname sem aviso prévio gera desclassificação da partida.",
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

export const conferenciaPatchSchema = z
  .object({
    inscricaoId: z.string().uuid(),
    item: z.enum(ITENS_CONFERENCIA),
    // Ausente PRESERVA o veredicto gravado, como a observação. Com o estado obrigatório,
    // quem só escrevia uma observação reenviava o estado da foto que tinha na tela — e
    // desfazia o veredicto que outro organizador acabara de dar.
    estado: z.enum(ESTADOS_CONFERENCIA).optional(),
    observacao: z.string().trim().max(LIMITES_INSCRICAO.texto).optional(),
    retrato: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => d.estado !== undefined || d.observacao !== undefined || d.retrato !== undefined, {
    message: "Nada para gravar.",
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
  // Quem se inscreveu quando o campo era "Nome (opcional)" pode ter mandado só o apelido.
  // Mesma regra do formulário: duas palavras; a ficha não apaga o nome de ninguém.
  nomeReal: nomeCompletoField.optional(),
  // A organização registra a disponibilidade de quem se inscreveu antes de o formulário
  // perguntar (o campo entrou depois da abertura). Vazio = não informado.
  disponibilidade: z
    .array(z.enum(TURNOS))
    .max(TURNOS.length)
    .transform((v) => [...new Set(v)])
    .optional(),
});

/**
 * O "Salvar" único da gaveta do inscrito: requisitos e ficha numa requisição só.
 *
 * Antes eram sete botões — um por requisito e outro para a ficha — e conferir 50 pessoas
 * virava 350 cliques. Cada pedaço continua com a regra que já tinha: só vai o que a tela
 * MUDOU, e campo ausente preserva o que está no banco (é isso que impede um organizador
 * de desfazer o que o outro acabou de gravar).
 *
 * A data de entrada no grupo fica de fora: a 4ª não pede tempo mínimo (regra 1), e o que
 * conta é estar no grupo — o item (a). A coluna continua no banco, só ninguém edita.
 */
const conferenciaDoLoteSchema = z
  .object({
    item: z.enum(ITENS_CONFERENCIA),
    estado: z.enum(ESTADOS_CONFERENCIA).optional(),
    observacao: z.string().trim().max(LIMITES_INSCRICAO.texto).optional(),
  })
  .refine((d) => d.estado !== undefined || d.observacao !== undefined, {
    message: "Item sem nada para gravar.",
  });

export const inscritoPatchSchema = z
  .object({
    inscricaoId: z.string().uuid(),
    conferencias: z
      .array(conferenciaDoLoteSchema)
      .max(ITENS_CONFERENCIA.length)
      // O mesmo item duas vezes não tem vencedor definido: as gravações correm juntas.
      .refine((lista) => new Set(lista.map((c) => c.item)).size === lista.length, {
        message: "Item repetido.",
      })
      .optional(),
    ficha: fichaPatchSchema.omit({ inscricaoId: true, entrouNoGrupo: true }).optional(),
  })
  .refine(
    (d) =>
      (d.conferencias?.length ?? 0) > 0 ||
      Object.values(d.ficha ?? {}).some((valor) => valor !== undefined),
    { message: "Nada para gravar." },
  );

export type InscritoPatch = z.infer<typeof inscritoPatchSchema>;

/**
 * O porquê de uma recusa do "Salvar tudo", em português e apontando o campo.
 *
 * Com um botão por requisito, a falha ficava no botão que a pessoa acabou de clicar e já
 * dizia onde estava o problema. Num salvamento único, "Alterações inválidas." deixava a
 * pessoa sem saber o que corrigir. Só cita o caminho e o limite — nada do que foi enviado
 * volta na resposta, a não ser a letra do item, e só se for uma letra conhecida.
 */
export function motivoDaRecusaDoInscrito(caminho: readonly PropertyKey[], dados: unknown): string {
  const [parte, posicao, campo] = caminho;

  if (parte === "conferencias" && typeof posicao === "number" && campo === "observacao") {
    const item = (dados as { conferencias?: { item?: unknown }[] } | null)?.conferencias?.[posicao]?.item;
    const letra =
      typeof item === "string" && (ITENS_CONFERENCIA as readonly string[]).includes(item)
        ? ` (${item.toUpperCase()})`
        : "";
    return `A observação do requisito${letra} passa de ${LIMITES_INSCRICAO.texto} caracteres.`;
  }
  if (parte === "ficha" && posicao === "observacao") {
    return `A observação da ficha passa de ${LIMITES_INSCRICAO.texto} caracteres.`;
  }
  if (parte === "ficha" && posicao === "nomeReal") {
    return `Nome: use nome e sobrenome, com até ${LIMITES_INSCRICAO.nome} caracteres.`;
  }
  return "Alterações inválidas.";
}

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
