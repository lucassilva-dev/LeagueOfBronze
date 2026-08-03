-- Persistência online simples do campeonato (JSON único)
-- Execute no SQL Editor do Supabase

create table if not exists public.tournament_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.tournament_state is
'Armazena o dataset completo do campeonato (JSON) para uso do site/admin.';

comment on column public.tournament_state.id is
'ID fixo do dataset (ex: leagueofbronze).';

comment on column public.tournament_state.payload is
'JSON completo validado pelo schema Zod da aplicação.';

comment on column public.tournament_state.updated_at is
'Data de atualização do registro.';

create index if not exists tournament_state_updated_at_idx
  on public.tournament_state (updated_at desc);

-- =====================================================================
-- SEGURANÇA (obrigatório — não remover)
-- =====================================================================
-- A aplicação acessa o banco com a chave service_role, que tem o atributo
-- BYPASSRLS. Portanto, ligar RLS e revogar os papéis públicos NÃO afeta o site,
-- mas remove por completo o acesso de quem tiver apenas a chave anon/publishable
-- (que é pública por natureza).
--
-- Sem isto, a tabela nasce com INSERT/UPDATE/DELETE/TRUNCATE liberados para
-- "anon" e "authenticated" via PostgREST — ou seja, qualquer pessoa com a chave
-- pública poderia apagar ou reescrever o campeonato inteiro sem passar pelo site.

alter table public.tournament_state enable row level security;
alter table public.tournament_state force  row level security;

-- Sem nenhuma policy: anon/authenticated ficam com acesso zero.
revoke all on public.tournament_state from anon, authenticated;

-- RAIZ DO PROBLEMA: o Supabase concede privilégios padrão em "public" para anon.
-- Sem as linhas abaixo, QUALQUER tabela nova criada aqui volta a nascer aberta.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;

-- Opcional: inserir dataset vazio inicial (se quiser)
-- insert into public.tournament_state (id, payload)
-- values ('leagueofbronze', '{}'::jsonb)
-- on conflict (id) do nothing;
