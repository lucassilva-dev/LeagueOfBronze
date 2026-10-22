-- =====================================================================
-- LOGIN DA ORGANIZAÇÃO — contas, sessões e tentativas de login
-- Execute no SQL Editor do Supabase, DEPOIS de schema.sql e ANTES de
-- schema-4a-edicao.sql.
-- =====================================================================
--
-- ORDEM PARA RECRIAR O BANCO DO ZERO (restauração, ambiente novo):
--   1. schema.sql            → tournament_state e o fechamento padrão de privilégios
--   2. schema-admin.sql      → este arquivo
--   3. schema-4a-edicao.sql  → inscrição, conferência, dinheiro e draft da 4ª
--   4. a primeira conta master: `node scripts/criar-admin.mjs` imprime o insert
--
-- Por que este arquivo existe: as três tabelas abaixo foram criadas direto no banco de
-- produção e nunca entraram no repositório. Recriar o banco a partir daqui deixava a
-- organização sem login — e o schema-4a-edicao.sql abortava inteiro (é uma transação só)
-- no `alter table public.admin_users`.
--
-- As colunas são exatamente as que o código usa: lib/security/admin-store.ts,
-- app/api/admin/users/**, app/api/admin/senha e scripts/criar-admin.mjs.
--
-- PRODUÇÃO NÃO PRECISA DESTE ARQUIVO: lá as tabelas já existem. Tudo aqui é
-- `if not exists`, então rodá-lo num banco que já as tem não recria nem apaga nada.
--
-- Segurança: o mesmo padrão da tournament_state — RLS ligado E forçado, zero policies,
-- revoke explícito. Só a chave de serviço (no servidor) enxerga estas tabelas; com a
-- chave pública, ninguém lê hash de senha nem sessão.

-- ---------------------------------------------------------------- contas
-- Nome de usuário sempre em minúsculas: o login compara com igualdade simples (ver
-- `normalizarUsuario`), e a restrição garante o lado do banco. A mesma restrição é
-- (re)aplicada pelo schema-4a-edicao.sql nos bancos antigos.
--
-- `session_epoch` sobe a cada troca de senha / desativação: todo cookie emitido com o
-- valor antigo deixa de valer na hora. `must_change_password` nasce falso para a conta
-- master criada pelo script; a conta criada pelo painel nasce verdadeira (senha
-- provisória).
create table if not exists public.admin_users (
  id                   uuid primary key default gen_random_uuid(),
  username             text not null unique,
  display_name         text not null,
  password_hash        text not null,
  must_change_password boolean not null default false,
  is_master            boolean not null default false,
  scopes               text[] not null default '{}',
  disabled_at          timestamptz,
  session_epoch        integer not null default 0,
  password_updated_at  timestamptz,
  created_at           timestamptz not null default now(),
  constraint admin_users_username_minusculo check (username = lower(username))
);

comment on table public.admin_users is
'Contas da organizacao. Senha em scrypt com pepper (ADMIN_PASSWORD_PEPPER); nunca em claro.';

-- ---------------------------------------------------------------- sessões
-- O id é o `sid` do cookie assinado (randomUUID). Apagar a conta apaga as sessões dela —
-- a rota de remover usuário faz um `delete` simples.
create table if not exists public.admin_sessions (
  id             uuid primary key,
  user_id        uuid not null references public.admin_users(id) on delete cascade,
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,
  revoked_at     timestamptz,
  revoked_reason text,
  ip_hash        text,
  ua_hash        text
);

create index if not exists admin_sessions_user_idx
  on public.admin_sessions (user_id, expires_at desc);

-- ---------------------------------------------------------------- tentativas de login
-- Alimenta o bloqueio por IP e por usuário (ver `getRecentAttemptCounts`). IP só em hash
-- com pepper, nunca em claro. Separada de jogador_login_attempts de propósito: o erro de
-- senha de um jogador não pode travar o login da organização no mesmo IP.
create table if not exists public.admin_login_attempts (
  id          bigserial primary key,
  occurred_at timestamptz not null default now(),
  username    text,
  ip_hash     text not null,
  success     boolean not null,
  reason      text not null
);

create index if not exists admin_login_attempts_ip_idx
  on public.admin_login_attempts (ip_hash, occurred_at desc);
create index if not exists admin_login_attempts_username_idx
  on public.admin_login_attempts (username, occurred_at desc);

-- =====================================================================
-- SEGURANÇA (obrigatório — não remover)
-- =====================================================================
alter table public.admin_users          enable row level security;
alter table public.admin_users          force  row level security;
alter table public.admin_sessions       enable row level security;
alter table public.admin_sessions       force  row level security;
alter table public.admin_login_attempts enable row level security;
alter table public.admin_login_attempts force  row level security;

-- Zero policies: anon e authenticated não alcançam nada. (A sequência do id fica fechada
-- pelo `alter default privileges` do schema.sql; não é citada aqui pelo nome para o
-- arquivo continuar rodando num banco antigo em que o id tenha outro tipo.)
revoke all on public.admin_users          from anon, authenticated;
revoke all on public.admin_sessions       from anon, authenticated;
revoke all on public.admin_login_attempts from anon, authenticated;
