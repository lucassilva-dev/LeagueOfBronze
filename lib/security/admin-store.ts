import { createHash } from "node:crypto";

import { createSupabaseAdminClient } from "@/lib/data-store";
import {
  contarDasLinhas,
  LINHAS_DA_CONTAGEM,
  TENTATIVA_EM_ANDAMENTO,
  valorDoFiltroOu,
  type RateLimitInput,
} from "@/lib/security/rate-limit";

/**
 * Acesso às tabelas de autenticação (admin_users / admin_sessions / admin_login_attempts).
 * Todas têm RLS ligado e ZERO privilégios para os papéis públicos — só a chave de
 * serviço (usada aqui, no servidor) enxerga.
 */

export type AdminUserRow = {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  must_change_password: boolean;
  is_master: boolean;
  scopes: string[];
  disabled_at: string | null;
  session_epoch: number;
};

export type AdminSessionRow = {
  id: string;
  user_id: string;
  expires_at: string;
  revoked_at: string | null;
};

/** Nunca guardamos IP em claro — só um hash com sal do ambiente. */
export function hashIp(ip: string): string {
  const pepper = process.env.LOGIN_IP_PEPPER ?? process.env.ADMIN_SESSION_SECRET ?? "sem-pepper";
  return createHash("sha256").update(`${ip}|${pepper}`).digest("hex").slice(0, 32);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "desconhecido";
}

/**
 * Nome de usuário na forma em que ele é comparado: sem espaços nas pontas e em
 * minúsculas.
 *
 * Aqui houve duas versões erradas antes desta. A primeira usava `ilike` cru, e em
 * LIKE o `%` casa com qualquer coisa e o `_` com um caractere — então "ana_b"
 * encontrava "anaXb". A segunda escapava `\`, `%` e `_`, mas ainda errava no `*`: o
 * PostgREST troca `*` por `%` no servidor, DEPOIS do nosso escape, e não existe
 * escape que sobreviva a essa troca.
 *
 * A saída não é escapar melhor — é parar de usar padrão onde se quer igualdade. O
 * nome é normalizado dos dois lados (aqui e na criação) e comparado com `=`, o que
 * mantém a busca insensível a maiúsculas sem que caractere nenhum tenha significado
 * especial. A restrição `admin_users_username_minusculo` no banco garante o outro lado.
 */
export function normalizarUsuario(valor: string): string {
  return valor.trim().toLowerCase();
}

export async function findUserByUsername(username: string): Promise<AdminUserRow | null> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_users")
    .select("id,username,display_name,password_hash,must_change_password,is_master,scopes,disabled_at,session_epoch")
    .eq("username", normalizarUsuario(username))
    .maybeSingle<AdminUserRow>();

  if (error) throw new Error(`Falha ao consultar usuários: ${error.message}`);
  return data ?? null;
}

export async function findUserById(id: string): Promise<AdminUserRow | null> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_users")
    .select("id,username,display_name,password_hash,must_change_password,is_master,scopes,disabled_at,session_epoch")
    .eq("id", id)
    .maybeSingle<AdminUserRow>();

  if (error) throw new Error(`Falha ao consultar usuário: ${error.message}`);
  return data ?? null;
}

export async function countUsers(): Promise<number> {
  const client = createSupabaseAdminClient();
  const { count, error } = await client
    .from("admin_users")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error(`Falha ao contar usuários: ${error.message}`);
  return count ?? 0;
}

export async function createSession(params: {
  id: string;
  userId: string;
  expiresAt: Date;
  ipHash: string;
  uaHash: string;
}): Promise<void> {
  const client = createSupabaseAdminClient();
  const { error } = await client.from("admin_sessions").insert({
    id: params.id,
    user_id: params.userId,
    expires_at: params.expiresAt.toISOString(),
    ip_hash: params.ipHash,
    ua_hash: params.uaHash,
  });
  if (error) throw new Error(`Falha ao criar sessão: ${error.message}`);
}

/** Sessão válida = existe, não revogada e não expirada. */
export async function findActiveSession(sessionId: string): Promise<AdminSessionRow | null> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_sessions")
    .select("id,user_id,expires_at,revoked_at")
    .eq("id", sessionId)
    .maybeSingle<AdminSessionRow>();

  if (error) throw new Error(`Falha ao consultar sessão: ${error.message}`);
  if (!data) return null;
  if (data.revoked_at) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

export async function revokeSession(sessionId: string, reason: string): Promise<void> {
  const client = createSupabaseAdminClient();
  await client
    .from("admin_sessions")
    .update({ revoked_at: new Date().toISOString(), revoked_reason: reason })
    .eq("id", sessionId)
    .is("revoked_at", null);
}

export async function recordLoginAttempt(params: {
  username: string | null;
  ipHash: string;
  success: boolean;
  reason: string;
}): Promise<void> {
  const client = createSupabaseAdminClient();
  // Registrar não pode derrubar o login; falha aqui é apenas logada.
  const { error } = await client.from("admin_login_attempts").insert({
    // Normalizado na gravação também: o contador procura por igualdade, então
    // "Razeral" gravado e "razeral" procurado deixariam de casar e o bloqueio por
    // usuário nunca dispararia.
    username: params.username ? normalizarUsuario(params.username).slice(0, 120) : null,
    ip_hash: params.ipHash,
    success: params.success,
    reason: params.reason,
  });
  if (error) console.error("[security] falha ao registrar tentativa de login:", error.message);
}

/** Linha de tentativa gravada ANTES de testar a senha; null quando a gravação falhou. */
export type ReservaDeTentativaAdmin = { id: number | string } | null;

/**
 * Grava a tentativa como "em andamento" ANTES de contar e de testar a senha — o mesmo
 * fechamento de rajada do login de jogador (ver `descontarPropriaReserva` em
 * lib/security/rate-limit.ts). Sem ele, 25 pedidos simultâneos testavam 25 senhas da
 * conta master, contra 5 em sequência.
 *
 * Falha de gravação devolve null e a rota volta ao fluxo antigo (conta sem descontar,
 * registra no fim): uma falha só de escrita não pode trancar a organização fora do
 * painel. A leitura da contagem, logo depois, continua falhando fechada.
 */
export async function reservarTentativaAdmin(params: {
  username: string | null;
  ipHash: string;
}): Promise<ReservaDeTentativaAdmin> {
  const client = createSupabaseAdminClient();
  const { data, error } = await client
    .from("admin_login_attempts")
    .insert({
      username: params.username ? normalizarUsuario(params.username).slice(0, 120) : null,
      ip_hash: params.ipHash,
      success: false,
      reason: TENTATIVA_EM_ANDAMENTO,
    })
    .select("id")
    .single<{ id: number | string }>();

  if (error || !data) {
    console.error("[security] falha ao reservar tentativa de login:", error?.message ?? "sem id");
    return null;
  }
  return { id: data.id };
}

/**
 * Fecha a tentativa reservada com o resultado de verdade; sem reserva, grava agora. Erro do
 * servidor depois da reserva vira `erro_interno` (o `finally` das rotas), que não conta.
 */
export async function concluirTentativaAdmin(
  reserva: ReservaDeTentativaAdmin,
  params: { username: string | null; ipHash: string; success: boolean; reason: string },
): Promise<void> {
  if (!reserva) return recordLoginAttempt(params);

  const client = createSupabaseAdminClient();
  const { error } = await client
    .from("admin_login_attempts")
    .update({ success: params.success, reason: params.reason })
    .eq("id", reserva.id);

  if (error) console.error("[security] falha ao concluir tentativa de login:", error.message);
}

/** As contagens que `evaluateLoginRateLimit` lê, todas preenchidas. */
export type AttemptCounts = Required<RateLimitInput>;

type LinhaLidaAdmin = {
  ip_hash: string | null;
  username: string | null;
  success: boolean | null;
  reason: string | null;
  occurred_at: string | null;
};

export async function getRecentAttemptCounts(
  username: string,
  ipHash: string,
): Promise<AttemptCounts> {
  const client = createSupabaseAdminClient();
  const janela = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const janelaConfianca = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const usuario = normalizarUsuario(username);

  /*
   * As tentativas RECUSADAS pelo próprio limitador não contam como falha.
   *
   * Elas continuam gravadas — o registro de segurança precisa mostrar que houve
   * marteladas — mas ficam de fora da contagem, senão o bloqueio se auto-prorroga:
   * cada retentativa durante o bloqueio grava uma falha nova com `occurred_at = now()`,
   * que entra na janela de 15 minutos e empurra a janela para a frente. Quem errou a
   * senha cinco vezes e continuou tentando ficava trancado para SEMPRE, sem nada no
   * banco explicando por quê — e o bloqueio por IP não tem a válvula de escape do
   * `ipHadRecentSuccess`, que só vale para o bloqueio por usuário.
   *
   * Essas tentativas também nunca chegaram a testar uma senha, então não são
   * evidência de um palpite novo. O mesmo vale para `erro_interno` (reserva fechada por
   * erro do servidor depois dela): sem isso, cinco erros 500 com a senha CERTA trancavam a
   * master fora do painel por 15 minutos.
   *
   * `em_andamento` (tentativa reservada, ver `reservarTentativaAdmin`) tem contagem
   * própria e só enquanto é recente: entra no teto por usuário, e no teto por IP só contra
   * o mesmo usuário (ver `evaluateLoginRateLimit`) — a organização entrando junta da mesma
   * rede não se tranca. A linha da própria requisição é descontada pela rota.
   */
  const [janelaLida, sucessoConhecido] = await Promise.all([
    // UM retrato só das linhas da janela (do IP ou do usuário): ver `contarDasLinhas`.
    client
      .from("admin_login_attempts")
      .select("ip_hash, username, success, reason, occurred_at")
      .or(`ip_hash.eq.${valorDoFiltroOu(ipHash)},username.eq.${valorDoFiltroOu(usuario)}`)
      .gte("occurred_at", janela)
      .order("occurred_at", { ascending: false })
      .limit(LINHAS_DA_CONTAGEM),
    // Selo preso ao PAR (usuário, IP): preso só ao IP, o login certo de QUALQUER conta
    // de admin (uma limitada, de ajudante) reabria dali os palpites contra a master. Fica
    // numa consulta à parte (30 dias): só alimenta a válvula, não o teto.
    client
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("username", usuario)
      .eq("success", true)
      .gte("occurred_at", janelaConfianca),
  ]);

  const falha = janelaLida.error ?? sucessoConhecido.error;
  if (falha) {
    throw new Error(`Falha ao conferir as tentativas de login: ${falha.message}`);
  }

  const linhas = ((janelaLida.data ?? []) as LinhaLidaAdmin[]).map((l) => ({ ...l, conta: l.username }));
  return {
    ...contarDasLinhas(linhas, ipHash, usuario),
    ipHadRecentSuccess: (sucessoConhecido.count ?? 0) > 0,
  };
}
