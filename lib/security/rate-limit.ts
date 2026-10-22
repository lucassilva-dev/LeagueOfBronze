/**
 * Política de bloqueio do login.
 *
 * Função PURA de propósito: o contador vive no Postgres (serverless não compartilha
 * memória entre instâncias, então um limitador em memória seria contornado
 * distribuindo as tentativas), mas a decisão é testável sem banco.
 */

export const RATE_LIMIT = {
  /** falhas por IP dentro da janela até bloquear */
  maxFailuresPerIp: 5,
  /** falhas por usuário dentro da janela até bloquear */
  maxFailuresPerUser: 10,
  /** tamanho da janela, em segundos */
  windowSeconds: 15 * 60,
  /**
   * Folga própria do teto por IP para tentativas EM VOO contra contas DIFERENTES: falhas
   * concluídas do IP + reservas em voo do IP (de qualquer conta) até bloquear. Ver
   * `evaluateLoginRateLimit`.
   */
  maxTentativasPorIpComEmVoo: 12,
  /**
   * Por quanto tempo, em segundos, uma reserva `em_andamento` ainda conta. Uma tentativa de
   * verdade termina em menos de 1 s; passado isso, a linha foi abandonada (função derrubada
   * no meio) e não pode pesar 15 minutos contra ninguém.
   */
  emVooSeconds: 60,
};

export type RateLimitInput = {
  /** falhas CONCLUÍDAS deste IP na janela — reservas em voo ficam de fora */
  failuresByIp: number;
  /** falhas concluídas + reservas em voo contra a conta, vindas de qualquer IP */
  failuresByUser: number;
  /** houve login bem-sucedido recente deste IP? */
  ipHadRecentSuccess: boolean;
  /** reservas em voo DESTE IP contra ESTA conta */
  emVooDoIpNaConta?: number;
  /** reservas em voo deste IP, contra qualquer conta */
  emVooDoIp?: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  reason: "ok" | "ip_bloqueado" | "usuario_bloqueado";
};

/**
 * Motivo gravado na linha de tentativa RESERVADA antes de a senha ser testada.
 *
 * Enquanto a tentativa está em voo, ela conta — é isso que segura a rajada simultânea (ver
 * `descontarPropriaReserva`). Mas só conta:
 *  - se for RECENTE (`RATE_LIMIT.emVooSeconds`): uma linha que ficou presa nesse estado
 *    (função derrubada no meio) não pesa 15 minutos contra quem tinha a senha certa;
 *  - no teto POR CONTA e, no teto por IP, só contra a MESMA conta (com folga própria para
 *    contas diferentes). Contando como falha comum no teto por IP, seis capitães entrando
 *    juntos pelo Wi-Fi do evento, cada um com a própria senha certa, viam as reservas uns
 *    dos outros e o sexto levava 429 sem ninguém ter errado nada.
 */
export const TENTATIVA_EM_ANDAMENTO = "em_andamento";

/**
 * Motivo com que a rota fecha a reserva quando algo estoura DEPOIS dela e antes do
 * resultado (sessão que não foi criada, contagem que não foi lida, conta que não foi
 * achada). Não conta como falha: não houve palpite errado. Sem isso, cinco erros 500 com a
 * senha CERTA (Supabase oscilando no dia do draft) trancavam o capitão — ou a master no
 * painel — por 15 minutos assim que o banco voltasse.
 */
export const TENTATIVA_ERRO_INTERNO = "erro_interno";

/**
 * Motivos que ficam gravados — o registro de segurança mostra tudo — mas NÃO contam como
 * falha concluída em teto nenhum.
 *
 * - `ip_bloqueado`/`usuario_bloqueado`: tentativas recusadas pelo próprio limitador. Contando,
 *   o bloqueio se auto-prorrogava (cada retentativa empurrava a janela para a frente).
 * - `erro_interno`: ver `TENTATIVA_ERRO_INTERNO`.
 *
 * `em_andamento` também fica de fora das falhas CONCLUÍDAS: ele tem contagem própria, só
 * enquanto é recente (ver `TENTATIVA_EM_ANDAMENTO`).
 */
export const MOTIVOS_QUE_NAO_CONTAM: readonly string[] = ["ip_bloqueado", "usuario_bloqueado", TENTATIVA_ERRO_INTERNO];

/** Instante a partir do qual uma reserva `em_andamento` ainda conta (ISO, para o filtro). */
export function inicioDasReservasEmVoo(agora = Date.now()): string {
  return new Date(agora - RATE_LIMIT.emVooSeconds * 1000).toISOString();
}

/** Teto de linhas que a contagem lê de uma vez (ver `contarDasLinhas`). */
export const LINHAS_DA_CONTAGEM = 500;

/** O que a contagem do limitador lê de cada linha de tentativa. */
export type LinhaDeTentativa = Readonly<{
  ip_hash: string | null;
  /** E-mail (jogador) ou usuário (painel) da tentativa. */
  conta: string | null;
  success: boolean | null;
  reason: string | null;
  occurred_at: string | null;
}>;

/**
 * As contagens do limitador tiradas de UM retrato só das linhas da janela.
 *
 * Elas eram seis `count` em paralelo, e no PostgREST cada `count` é uma requisição com o
 * próprio retrato do banco. A tentativa que terminava ENTRE dois retratos (em voo quando as
 * falhas concluídas eram lidas, concluída quando as em voo eram lidas) não entrava em
 * nenhuma das duas — e o argumento "a k-ésima reserva enxerga pelo menos k linhas" caía:
 * de um IP passavam 10 palpites contra uma conta, não 5. Lendo as LINHAS (do IP ou da conta)
 * numa consulta só, cada tentativa aparece exatamente uma vez: ou em voo, ou concluída.
 *
 * A leitura vem limitada a `LINHAS_DA_CONTAGEM`, das mais novas para as mais velhas. Passar
 * disso em 15 minutos só acontece com a conta sob ataque de muitos IPs — e aí o teto por
 * conta já estourou muito antes; o que se perde é contagem do IP, que só deixaria o limitador
 * mais brando para ele, nunca trancaria ninguém.
 */
export function contarDasLinhas(
  linhas: readonly LinhaDeTentativa[],
  ipHash: string,
  conta: string,
  agora = Date.now(),
): Omit<Required<RateLimitInput>, "ipHadRecentSuccess"> {
  const desdeJanela = agora - RATE_LIMIT.windowSeconds * 1000;
  const desdeEmVoo = agora - RATE_LIMIT.emVooSeconds * 1000;
  let porIp = 0;
  let porConta = 0;
  let emVooDoIp = 0;
  let emVooDoIpNaConta = 0;
  let emVooNaConta = 0;

  for (const linha of linhas) {
    const ms = linha.occurred_at ? Date.parse(linha.occurred_at) : NaN;
    if (!Number.isFinite(ms) || ms < desdeJanela) continue;
    const doIp = linha.ip_hash === ipHash;
    const daConta = linha.conta === conta;

    if (linha.reason === TENTATIVA_EM_ANDAMENTO) {
      // Reserva abandonada (função derrubada no meio) não pesa: ver `emVooSeconds`.
      if (ms < desdeEmVoo) continue;
      if (doIp) emVooDoIp += 1;
      if (doIp && daConta) emVooDoIpNaConta += 1;
      if (daConta) emVooNaConta += 1;
      continue;
    }

    // Mesma regra do `not in` do SQL de antes: motivo nulo não conta.
    if (linha.success !== false || linha.reason === null || MOTIVOS_QUE_NAO_CONTAM.includes(linha.reason)) continue;
    if (doIp) porIp += 1;
    if (daConta) porConta += 1;
  }

  return {
    failuresByIp: porIp,
    failuresByUser: porConta + emVooNaConta,
    emVooDoIp,
    emVooDoIpNaConta,
  };
}

/**
 * Valor entre aspas para um filtro `.or()` do PostgREST. O e-mail entra num texto que o
 * PostgREST corta por vírgula e ponto: entre aspas, nada nele vira sintaxe.
 */
export function valorDoFiltroOu(valor: string): string {
  return `"${valor.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Contagem lida DEPOIS de reservar a própria tentativa.
 *
 * O limitador era "conta, depois grava": 30 pedidos simultâneos liam a contagem antes de
 * qualquer falha existir, e as 30 senhas eram testadas. Agora cada pedido grava a sua
 * linha primeiro e só então conta. Como a k-ésima linha gravada enxerga pelo menos k
 * linhas, no máximo `maxFailuresPerIp` pedidos de uma rajada contra a mesma conta passam.
 *
 * A linha da própria tentativa já entrou nas contagens de reservas em voo (do IP, do IP na
 * conta e da conta), então sai de novo aqui — senão a 5ª tentativa honesta seria lida como
 * a 6ª e o teto encolheria. `failuresByIp` só tem falhas concluídas, e a própria reserva
 * nunca está lá. Sem reserva (`reservada = false`, a gravação falhou), a contagem segue
 * como antes.
 */
export function descontarPropriaReserva(input: RateLimitInput, reservada: boolean): RateLimitInput {
  if (!reservada) return input;
  return {
    ...input,
    failuresByUser: Math.max(0, input.failuresByUser - 1),
    emVooDoIpNaConta: Math.max(0, (input.emVooDoIpNaConta ?? 0) - 1),
    emVooDoIp: Math.max(0, (input.emVooDoIp ?? 0) - 1),
  };
}

/**
 * Contagem do CADASTRO: toda reserva em voo do IP pesa no teto por IP, de qualquer e-mail.
 *
 * No login, a reserva em voo só pesa no teto por IP contra a mesma conta, para logins certos
 * e simultâneos da mesma rede não se trancarem. No cadastro não há esse caso a proteger:
 * todo cadastro concluído (conta criada ou e-mail repetido) já conta no teto por IP, de
 * propósito — é o freio contra criar contas em série. Com a regra do login, 12 cadastros
 * simultâneos do mesmo IP, cada um com um e-mail, criavam 11 contas com o teto em 5.
 */
export function reservasDoIpContamNoTeto(input: RateLimitInput): RateLimitInput {
  return { ...input, emVooDoIpNaConta: input.emVooDoIp ?? 0 };
}

export function evaluateLoginRateLimit(input: RateLimitInput): RateLimitDecision {
  // Teto por IP: falhas concluídas + reservas em voo deste IP contra a MESMA conta. É o que
  // segura a rajada contra um alvo em 5 palpites, como em sequência.
  if (input.failuresByIp + (input.emVooDoIpNaConta ?? 0) >= RATE_LIMIT.maxFailuresPerIp) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT.windowSeconds, reason: "ip_bloqueado" };
  }

  // Folga própria para reservas em voo contra contas DIFERENTES. Sem ela, uma rajada do
  // mesmo IP contra muitas contas (um palpite em cada) não teria teto antes de as primeiras
  // falhas concluírem; com ela, a rajada inteira testa no máximo
  // `maxTentativasPorIpComEmVoo` senhas. Logins certos e simultâneos da mesma rede (Wi-Fi
  // do evento, CGNAT) passam juntos até esse número. O bloqueio aqui é passageiro: as
  // reservas em voo terminam em menos de 1 s.
  if (input.failuresByIp + (input.emVooDoIp ?? 0) >= RATE_LIMIT.maxTentativasPorIpComEmVoo) {
    return { allowed: false, retryAfterSeconds: RATE_LIMIT.emVooSeconds, reason: "ip_bloqueado" };
  }

  // O bloqueio por usuário é pulado quando o IP já se autenticou com sucesso
  // recentemente. Sem isso, um atacante martelando o seu nome de usuário conseguiria
  // trancar VOCÊ para fora do seu próprio site — negação de serviço trivial.
  if (input.failuresByUser >= RATE_LIMIT.maxFailuresPerUser && !input.ipHadRecentSuccess) {
    return {
      allowed: false,
      retryAfterSeconds: RATE_LIMIT.windowSeconds,
      reason: "usuario_bloqueado",
    };
  }

  return { allowed: true, retryAfterSeconds: 0, reason: "ok" };
}
