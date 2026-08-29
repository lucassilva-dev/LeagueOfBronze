// Trava de build: aqui trafega hash de senha e e-mail de terceiros.
import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";

/**
 * Tabelas de conta do jogador (`jogador_contas`, `jogador_sessoes`,
 * `jogador_login_attempts`). Espelha `lib/security/admin-store.ts` — mesmo formato de
 * sessão, mesma política de tentativas — mas em tabelas próprias.
 *
 * Por que não reaproveitar `admin_login_attempts`: o contador de bloqueio é por IP.
 * Compartilhar a tabela faria cinco erros de senha de um jogador travarem o login da
 * organização vindo do mesmo IP, e misturaria 50 jogadores no registro de segurança
 * de quem administra o campeonato.
 */

export type JogadorRow = {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
  must_change_password: boolean;
  session_epoch: number;
  disabled_at: string | null;
};

export type JogadorSessaoRow = {
  id: string;
  jogador_id: string;
  expira_em: string;
  revogada_em: string | null;
};

const CAMPOS = "id,email,display_name,password_hash,must_change_password,session_epoch,disabled_at";

// ---------------------------------------------------------------- contas

export async function acharJogadorPorEmail(email: string): Promise<JogadorRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_contas")
    .select(CAMPOS)
    // `.eq` e NÃO `.ilike`: em LIKE, `%` e `_` são curingas. Como o e-mail chega
    // aqui já em minúsculas pelo schema (e é gravado assim), a igualdade simples é
    // equivalente — e não vira padrão. Um `%` no e-mail viraria curinga.
    .eq("email", email)
    .maybeSingle<JogadorRow>();

  if (error) throw new Error(`Falha ao consultar conta: ${error.message}`);
  return data;
}

export async function acharJogadorPorId(id: string): Promise<JogadorRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_contas")
    .select(CAMPOS)
    .eq("id", id)
    .maybeSingle<JogadorRow>();

  if (error) throw new Error(`Falha ao consultar conta: ${error.message}`);
  return data;
}

/** Devolve null quando o e-mail já existe (violação 23505), em vez de estourar. */
export async function criarJogador(params: {
  email: string;
  displayName: string;
  passwordHash: string;
}): Promise<JogadorRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_contas")
    .insert({
      email: params.email,
      display_name: params.displayName,
      password_hash: params.passwordHash,
    })
    .select(CAMPOS)
    .single<JogadorRow>();

  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`Falha ao criar conta: ${error.message}`);
  }
  return data;
}

export async function trocarSenhaJogador(id: string, passwordHash: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("jogador_contas")
    .update({ password_hash: passwordHash, must_change_password: false })
    .eq("id", id);

  if (error) throw new Error(`Falha ao trocar a senha: ${error.message}`);
}

/*
 * NÃO EXISTE vínculo automático de inscrição por e-mail — e a ausência é deliberada.
 *
 * A versão anterior amarrava, no cadastro, qualquer inscrição com o mesmo e-mail que
 * ainda não tivesse conta. Como não há confirmação de e-mail (decisão consciente: a
 * verificação de verdade é a organização conferir a pessoa à mão), bastava saber o
 * e-mail de um inscrito para criar uma conta com ele e assumir a inscrição alheia —
 * vendo nome, WhatsApp e Discord da pessoa, e podendo ser capitão no lugar dela.
 *
 * A inscrição agora EXIGE sessão e nasce com `jogador_id` preenchido, então o caso
 * "inscrito sem conta" simplesmente não acontece. Se alguma linha antiga precisar ser
 * ligada a uma conta, quem faz isso é a organização pelo painel, à mão.
 */

// ---------------------------------------------------------------- sessões

export async function criarSessaoJogador(params: {
  id: string;
  jogadorId: string;
  expiraEm: Date;
  ipHash: string;
  uaHash: string;
}): Promise<void> {
  const { error } = await createSupabaseAdminClient().from("jogador_sessoes").insert({
    id: params.id,
    jogador_id: params.jogadorId,
    expira_em: params.expiraEm.toISOString(),
    ip_hash: params.ipHash,
    ua_hash: params.uaHash,
  });

  if (error) throw new Error(`Falha ao criar sessão: ${error.message}`);
}

/** Sessão válida = existe, não revogada e não expirada. */
export async function acharSessaoAtiva(sessaoId: string): Promise<JogadorSessaoRow | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_sessoes")
    .select("id,jogador_id,expira_em,revogada_em")
    .eq("id", sessaoId)
    .maybeSingle<JogadorSessaoRow>();

  if (error) throw new Error(`Falha ao consultar sessão: ${error.message}`);
  if (!data) return null;
  if (data.revogada_em) return null;
  if (new Date(data.expira_em).getTime() <= Date.now()) return null;
  return data;
}

export async function revogarSessaoJogador(sessaoId: string, razao: string): Promise<void> {
  await createSupabaseAdminClient()
    .from("jogador_sessoes")
    .update({ revogada_em: new Date().toISOString(), revogada_razao: razao })
    .eq("id", sessaoId)
    .is("revogada_em", null);
}

/**
 * "Sair de todos os dispositivos". A organização usa isto quando um capitão suspeita
 * de invasão — todo token assinado com o epoch antigo para de valer na hora, sem
 * precisar caçar sessão por sessão.
 */
export async function revogarTudoDoJogador(jogadorId: string): Promise<void> {
  const cliente = createSupabaseAdminClient();
  const { data, error } = await cliente
    .from("jogador_contas")
    .select("session_epoch")
    .eq("id", jogadorId)
    .maybeSingle<{ session_epoch: number }>();

  if (error) throw new Error(`Falha ao ler a conta: ${error.message}`);
  if (!data) return;

  const { error: erroUpdate } = await cliente
    .from("jogador_contas")
    .update({ session_epoch: data.session_epoch + 1 })
    .eq("id", jogadorId);

  if (erroUpdate) throw new Error(`Falha ao revogar sessões: ${erroUpdate.message}`);

  await cliente
    .from("jogador_sessoes")
    .update({ revogada_em: new Date().toISOString(), revogada_razao: "revogacao_geral" })
    .eq("jogador_id", jogadorId)
    .is("revogada_em", null);
}

// ---------------------------------------------------------------- tentativas

export async function registrarTentativaJogador(params: {
  email: string | null;
  ipHash: string;
  success: boolean;
  reason: string;
}): Promise<void> {
  const { error } = await createSupabaseAdminClient().from("jogador_login_attempts").insert({
    email: params.email?.slice(0, 254) ?? null,
    ip_hash: params.ipHash,
    success: params.success,
    reason: params.reason,
  });

  if (error) console.error("[jogadores] falha ao registrar tentativa:", error.message);
}

export async function contarTentativasJogador(
  email: string,
  ipHash: string,
): Promise<{ failuresByIp: number; failuresByUser: number; ipHadRecentSuccess: boolean }> {
  const cliente = createSupabaseAdminClient();
  const janela = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const janelaConfianca = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  /*
   * Mesma regra do login da organização (ver `getRecentAttemptCounts`): tentativa
   * RECUSADA pelo limitador fica gravada, mas não conta como falha. Sem isso o
   * bloqueio se auto-prorroga — cada retentativa entra na janela de 15 minutos e a
   * empurra para a frente, e o bloqueio por IP não tem a válvula do
   * `ipHadRecentSuccess`.
   *
   * Aqui o estrago é maior do que no painel: quem fica trancado é um CAPITÃO, e um
   * capitão que não consegue entrar durante o draft perde todas as escolhas dele
   * para o cronômetro.
   */
  const naoContaComoFalha = ["ip_bloqueado", "usuario_bloqueado"];

  const [porIp, porEmail, sucessoConhecido] = await Promise.all([
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .notIn("reason", naoContaComoFalha)
      .gte("occurred_at", janela),
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("success", false)
      .notIn("reason", naoContaComoFalha)
      .gte("occurred_at", janela),
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", true)
      .gte("occurred_at", janelaConfianca),
  ]);

  /*
   * FALHA FECHADA, pelo mesmo motivo de `getRecentAttemptCounts`: com o erro ignorado,
   * um `count` nulo virava `0` e o limitador liberava toda tentativa — o freio de força
   * bruta do login dos jogadores desligado em silêncio.
   */
  const falha = porIp.error ?? porEmail.error ?? sucessoConhecido.error;
  if (falha) {
    throw new Error(`Falha ao conferir as tentativas de login: ${falha.message}`);
  }

  return {
    failuresByIp: porIp.count ?? 0,
    failuresByUser: porEmail.count ?? 0,
    ipHadRecentSuccess: (sucessoConhecido.count ?? 0) > 0,
  };
}
