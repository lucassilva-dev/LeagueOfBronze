// Trava de build: aqui trafega hash de senha e e-mail de terceiros.
import "server-only";

import { createSupabaseAdminClient } from "@/lib/data-store";
import { gerarSenhaProvisoria, hashPassword } from "@/lib/security/password";
import {
  contarDasLinhas,
  LINHAS_DA_CONTAGEM,
  MOTIVOS_QUE_NAO_CONTAM,
  RATE_LIMIT,
  TENTATIVA_EM_ANDAMENTO,
  TENTATIVA_LIBERADA_PELA_ORGANIZACAO,
  valorDoFiltroOu,
  type RateLimitInput,
} from "@/lib/security/rate-limit";

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

/**
 * Senha nova e epoch novo num UPDATE SÓ.
 *
 * Eram duas escritas (senha, depois `revogarTudoDoJogador`). Se o banco oscilasse entre
 * elas, a senha já tinha mudado, o epoch não subia e a rota respondia "não foi possível
 * trocar a senha" — quem invadiu continuava logado, e o dono, tentando de novo com a
 * senha antiga como "atual", recebia "senha atual incorreta". Junto, ou as duas coisas
 * acontecem, ou nenhuma (é o que o `/api/admin/senha` já fazia).
 *
 * O update é condicionado ao `session_epoch` LIDO pela rota (o epoch novo é `epochLido + 1`),
 * do mesmo jeito que `redefinirSenhaJogador`. Sem a condição, uma redefinição da
 * organização que caísse entre a leitura da conta e esta gravação (a janela tem dois
 * scrypt) era desfeita em silêncio: a provisória entregue à organização não abria a conta,
 * a troca obrigatória sumia e o epoch ficava no MESMO número da redefinição — o cookie
 * emitido pela troca sobrevivia a ela.
 *
 * Devolve false quando a conta mudou no meio (0 linhas): nada foi gravado, e quem chamou
 * não pode emitir sessão nova.
 */
export async function trocarSenhaJogador(id: string, passwordHash: string, epochLido: number): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_contas")
    .update({ password_hash: passwordHash, must_change_password: false, session_epoch: epochLido + 1 })
    .eq("id", id)
    .eq("session_epoch", epochLido)
    .select("id");

  if (error) throw new Error(`Falha ao trocar a senha: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Recuperação de senha pela organização — o único caminho, porque o site não envia
 * e-mail.
 *
 * Gera uma senha provisória forte, grava o hash, liga `must_change_password` e sobe o
 * `session_epoch` NO MESMO UPDATE: toda sessão aberta com a senha antiga cai na hora
 * (inclusive a de quem tivesse descoberto a senha esquecida). A provisória volta UMA vez,
 * para a organização repassar; o banco só guarda o hash.
 *
 * O update é condicionado ao epoch lido. Sem isso, uma troca de senha do próprio jogador
 * que caísse entre a leitura e a escrita subiria o epoch para o MESMO número — e a
 * sessão que ela acabou de emitir sobreviveria à redefinição.
 *
 * Devolve null quando a conta não existe.
 */
export async function redefinirSenhaJogador(
  alvo: { id: string } | { email: string },
  pepper: string,
): Promise<{ conta: JogadorRow; senhaProvisoria: string } | null> {
  const senhaProvisoria = gerarSenhaProvisoria();
  const passwordHash = await hashPassword(senhaProvisoria, pepper);
  const cliente = createSupabaseAdminClient();

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const conta = "id" in alvo ? await acharJogadorPorId(alvo.id) : await acharJogadorPorEmail(alvo.email);
    if (!conta) return null;

    const novoEpoch = conta.session_epoch + 1;
    const { data, error } = await cliente
      .from("jogador_contas")
      .update({ password_hash: passwordHash, must_change_password: true, session_epoch: novoEpoch })
      .eq("id", conta.id)
      .eq("session_epoch", conta.session_epoch)
      .select("id");

    if (error) throw new Error(`Falha ao redefinir a senha: ${error.message}`);
    if (!data || data.length === 0) continue; // o epoch mudou no meio: relê e tenta de novo

    // Já não valem pelo epoch; marcar as linhas é só para o registro dizer por quê.
    await revogarSessoesDoJogador(conta.id, "senha_redefinida").catch((e: unknown) =>
      console.error("[jogadores] senha redefinida, mas as sessões não foram marcadas:", e),
    );

    return {
      conta: { ...conta, password_hash: passwordHash, must_change_password: true, session_epoch: novoEpoch },
      senhaProvisoria,
    };
  }

  throw new Error("A conta mudou durante a redefinição da senha. Tente de novo.");
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

/**
 * Renovação deslizante: estende a validade de uma sessão AINDA ATIVA.
 *
 * O `.is("revogada_em", null)` impede ressuscitar sessão encerrada por logout ou pela
 * organização no intervalo entre conferir a identidade e renovar. Devolve false quando a
 * escrita falhou ou não achou sessão ativa — aí não há cookie novo para emitir. Renovar
 * é conforto, nunca pode derrubar quem chamou.
 */
export async function renovarSessaoJogador(sessaoId: string, expiraEm: Date): Promise<boolean> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_sessoes")
    .update({ expira_em: expiraEm.toISOString() })
    .eq("id", sessaoId)
    .is("revogada_em", null)
    .select("id");

  if (error) {
    console.error("[jogadores] falha ao renovar sessão:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Marca como revogadas todas as linhas de sessão ainda abertas do jogador. */
export async function revogarSessoesDoJogador(jogadorId: string, razao: string): Promise<void> {
  const { error } = await createSupabaseAdminClient()
    .from("jogador_sessoes")
    .update({ revogada_em: new Date().toISOString(), revogada_razao: razao })
    .eq("jogador_id", jogadorId)
    .is("revogada_em", null);

  if (error) throw new Error(`Falha ao revogar sessões: ${error.message}`);
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

/** Linha de tentativa gravada ANTES de testar a senha; null quando a gravação falhou. */
export type ReservaDeTentativa = { id: number | string } | null;

/**
 * Grava a tentativa como "em andamento" ANTES de contar e de testar a senha.
 *
 * É o que fecha a rajada simultânea: ver `descontarPropriaReserva` em
 * lib/security/rate-limit.ts. A rota conta DEPOIS desta chamada e desconta a própria linha.
 *
 * Se a gravação falhar, devolve null e a rota segue exatamente como antes da reserva
 * existir (conta sem descontar e registra no fim). Não estoura de propósito: a leitura da
 * contagem logo em seguida já falha fechada se o banco estiver fora, e uma falha só de
 * escrita não pode deixar todo mundo sem login.
 */
export async function reservarTentativaJogador(params: {
  email: string | null;
  ipHash: string;
}): Promise<ReservaDeTentativa> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_login_attempts")
    .insert({
      email: params.email?.slice(0, 254) ?? null,
      ip_hash: params.ipHash,
      success: false,
      reason: TENTATIVA_EM_ANDAMENTO,
    })
    .select("id")
    .single<{ id: number | string }>();

  if (error || !data) {
    console.error("[jogadores] falha ao reservar tentativa:", error?.message ?? "sem id");
    return null;
  }
  return { id: data.id };
}

/**
 * Fecha a tentativa reservada com o resultado de verdade. Recusada pelo limitador vira
 * `ip_bloqueado`/`usuario_bloqueado` (que não contam como falha — senão o bloqueio se
 * auto-prorrogaria); senha errada vira falha; sucesso vira sucesso. Erro do servidor
 * depois da reserva vira `erro_interno` (o `finally` das rotas), que também não conta.
 *
 * Sem reserva, grava a linha agora, como antes.
 */
export async function concluirTentativaJogador(
  reserva: ReservaDeTentativa,
  params: { email: string | null; ipHash: string; success: boolean; reason: string },
): Promise<void> {
  if (!reserva) return registrarTentativaJogador(params);

  const { error } = await createSupabaseAdminClient()
    .from("jogador_login_attempts")
    .update({ success: params.success, reason: params.reason })
    .eq("id", reserva.id);

  if (error) console.error("[jogadores] falha ao concluir tentativa:", error.message);
}

/**
 * Motivo da linha que o cadastro concluído grava (success:false, ver
 * app/api/conta/cadastro). Conta no teto por IP e vale como selo do par (e-mail, IP) em
 * `contarTentativasJogador`.
 */
export const TENTATIVA_CADASTRO = "cadastro";

type LinhaLidaJogador = {
  ip_hash: string | null;
  email: string | null;
  success: boolean | null;
  reason: string | null;
  occurred_at: string | null;
};

export async function contarTentativasJogador(email: string, ipHash: string): Promise<Required<RateLimitInput>> {
  const cliente = createSupabaseAdminClient();
  const janela = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const janelaConfianca = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  /*
   * Mesma regra do login da organização (ver `getRecentAttemptCounts`): tentativa
   * RECUSADA pelo limitador fica gravada, mas não conta como falha. Sem isso o
   * bloqueio se auto-prorroga — cada retentativa entra na janela de 15 minutos e a
   * empurra para a frente, e o bloqueio por IP não tem a válvula do
   * `ipHadRecentSuccess`. `erro_interno` (reserva fechada por erro do servidor) também
   * não conta: não houve palpite.
   *
   * Aqui o estrago é maior do que no painel: quem fica trancado é um CAPITÃO, e um
   * capitão que não consegue entrar durante o draft perde todas as escolhas dele
   * para o cronômetro.
   *
   * `em_andamento` (tentativa reservada, ver `reservarTentativaJogador`) tem contagem
   * própria e só enquanto é recente: entra no teto por conta, e no teto por IP só contra
   * a mesma conta (ver `evaluateLoginRateLimit`). A linha da própria requisição é
   * descontada pela rota.
   */
  const [janelaLida, sucessoConhecido] = await Promise.all([
    // UM retrato só das linhas da janela (do IP ou da conta): ver `contarDasLinhas`.
    cliente
      .from("jogador_login_attempts")
      .select("ip_hash, email, success, reason, occurred_at")
      .or(`ip_hash.eq.${valorDoFiltroOu(ipHash)},email.eq.${valorDoFiltroOu(email)}`)
      .gte("occurred_at", janela)
      .order("occurred_at", { ascending: false })
      .limit(LINHAS_DA_CONTAGEM),
    // O selo de "IP confiável" vale para o PAR (conta, IP), não para o IP. Preso só ao
    // IP, bastava entrar na própria conta descartável de um endereço para desligar, dali,
    // o teto por conta de qualquer OUTRO jogador. A válvula continua cumprindo o que
    // promete: quem já entrou NESTA conta deste IP não é trancado por quem martela o
    // e-mail dela.
    //
    // O CADASTRO concluído daquele par também é prova de posse: quem criou a conta naquele
    // IP não pode ser trancado fora dela por terceiros que sabem o e-mail — antes do
    // primeiro login, era só o que ela tinha. A linha 'cadastro' é gravada com
    // success:false de propósito (ela conta no teto POR IP, e isso não muda); aqui ela é
    // aceita só como selo do próprio par, então um cadastro descartável não sela outra conta.
    //
    // Fica numa consulta à parte (30 dias): só alimenta a válvula, não o teto.
    cliente
      .from("jogador_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("email", email)
      .or(`success.eq.true,reason.eq.${TENTATIVA_CADASTRO}`)
      .gte("occurred_at", janelaConfianca),
  ]);

  /*
   * FALHA FECHADA, pelo mesmo motivo de `getRecentAttemptCounts`: com o erro ignorado,
   * uma contagem vazia virava `0` e o limitador liberava toda tentativa — o freio de força
   * bruta do login dos jogadores desligado em silêncio.
   */
  const falha = janelaLida.error ?? sucessoConhecido.error;
  if (falha) {
    throw new Error(`Falha ao conferir as tentativas de login: ${falha.message}`);
  }

  const linhas = ((janelaLida.data ?? []) as LinhaLidaJogador[]).map((l) => ({ ...l, conta: l.email }));
  return {
    ...contarDasLinhas(linhas, ipHash, email),
    ipHadRecentSuccess: (sucessoConhecido.count ?? 0) > 0,
  };
}

// ---------------------------------------------------------------- liberar login (organização)

/**
 * A falha que trava a CONTA e que o botão «Liberar login» pode liberar: palpite errado
 * concluído (senha errada, conta inexistente…). Ficam de fora o que já não conta
 * (`MOTIVOS_QUE_NAO_CONTAM`), a reserva em voo (tem contagem própria e some em 60 s) e o
 * cadastro — ele é o selo de posse do par (e-mail, IP), e apagá-lo tiraria do dono a
 * válvula que o protege.
 */
export function falhaLiberavel(linha: Readonly<{ success: boolean | null; reason: string | null }>): boolean {
  if (linha.success !== false || linha.reason === null) return false;
  if (linha.reason === TENTATIVA_EM_ANDAMENTO || linha.reason === TENTATIVA_CADASTRO) return false;
  return !MOTIVOS_QUE_NAO_CONTAM.includes(linha.reason);
}

/** Início da janela do limitador (15 min), em ISO, para o filtro. */
function inicioDaJanela(agoraMs: number): string {
  return new Date(agoraMs - RATE_LIMIT.windowSeconds * 1000).toISOString();
}

/**
 * Quantas falhas recentes (janela do limitador) cada conta tem — o número que o painel
 * mostra ANTES do «Liberar login». Uma leitura só, de todas as falhas da janela; e-mail em
 * minúsculas (é como as contas são gravadas).
 */
export async function falhasRecentesPorEmail(agoraMs = Date.now()): Promise<Map<string, number>> {
  const { data, error } = await createSupabaseAdminClient()
    .from("jogador_login_attempts")
    .select("email, success, reason, occurred_at")
    .eq("success", false)
    .gte("occurred_at", inicioDaJanela(agoraMs))
    .order("occurred_at", { ascending: false })
    .limit(LINHAS_DA_CONTAGEM * 4);

  if (error) throw new Error(`Falha ao ler as tentativas de login: ${error.message}`);
  const porEmail = new Map<string, number>();
  for (const linha of (data ?? []) as { email: string | null; success: boolean | null; reason: string | null }[]) {
    if (!linha.email || !falhaLiberavel(linha)) continue;
    const email = linha.email.toLowerCase();
    porEmail.set(email, (porEmail.get(email) ?? 0) + 1);
  }
  return porEmail;
}

/**
 * «Liberar login» (decisão F): as falhas recentes da conta deste e-mail passam a
 * `liberado_pela_organizacao`, que não conta contra a CONTA — mas continua contando para o
 * IP de onde cada uma veio (`contarDasLinhas`): o IP do atacante segue bloqueado.
 *
 * Lê as linhas e troca só as que lidas eram liberáveis, pelo id e com `success = false` na
 * mesma instrução. Devolve quantas foram liberadas.
 */
export async function liberarLoginDaConta(email: string, agoraMs = Date.now()): Promise<number> {
  const cliente = createSupabaseAdminClient();
  const alvo = email.trim().toLowerCase();
  const { data, error } = await cliente
    .from("jogador_login_attempts")
    .select("id, success, reason")
    .eq("email", alvo)
    .eq("success", false)
    .gte("occurred_at", inicioDaJanela(agoraMs));

  if (error) throw new Error(`Falha ao ler as tentativas de login: ${error.message}`);
  const ids = ((data ?? []) as { id: number | string; success: boolean | null; reason: string | null }[])
    .filter(falhaLiberavel)
    .map((l) => l.id);
  if (ids.length === 0) return 0;

  const { data: trocadas, error: erroUpdate } = await cliente
    .from("jogador_login_attempts")
    .update({ reason: TENTATIVA_LIBERADA_PELA_ORGANIZACAO })
    .in("id", ids)
    .eq("email", alvo)
    .eq("success", false)
    .select("id");

  if (erroUpdate) throw new Error(`Falha ao liberar o login: ${erroUpdate.message}`);
  return trocadas?.length ?? 0;
}
