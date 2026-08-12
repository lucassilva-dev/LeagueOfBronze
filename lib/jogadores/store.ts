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
    // equivalente — e não vira padrão. Ver o comentário em vincularInscricaoPorEmail.
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

/**
 * Amarra a inscrição já enviada à conta recém-criada, pelo e-mail.
 *
 * O formulário de inscrição é público e não exige conta — alguém pode se inscrever
 * hoje e criar a conta na véspera do draft. Sem isto, essa pessoa nunca veria a
 * própria inscrição em /minha-inscricao, e não poderia ser capitã.
 */
export async function vincularInscricaoPorEmail(jogadorId: string, email: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("inscricoes")
    .update({ jogador_id: jogadorId })
    // ⚠ NUNCA `.ilike` aqui. Em LIKE, `%` casa com qualquer coisa: quem se
    // cadastrasse com o e-mail "%@gmail.com" reivindicaria de uma vez TODAS as
    // inscrições do Gmail ainda sem conta — e passaria a ver os dados delas em
    // /minha-inscricao. O e-mail ja vem em minusculas do schema, entao `.eq` basta.
    .eq("email", email)
    .is("jogador_id", null);

  // Vínculo é conveniência: se falhar, a conta continua válida e a organização
  // consegue ligar as duas à mão. Não pode derrubar o cadastro.
  if (error) console.error("[jogadores] falha ao vincular inscrição", error.message);
}

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

  const [porIp, porEmail, sucessoConhecido] = await Promise.all([
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .gte("occurred_at", janela),
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("email", email)
      .eq("success", false)
      .gte("occurred_at", janela),
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", true)
      .gte("occurred_at", janelaConfianca),
  ]);

  return {
    failuresByIp: porIp.count ?? 0,
    failuresByUser: porEmail.count ?? 0,
    ipHadRecentSuccess: (sucessoConhecido.count ?? 0) > 0,
  };
}
