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

-- Opcional: inserir dataset vazio inicial (se quiser)
-- insert into public.tournament_state (id, payload)
-- values ('leagueofbronze', '{}'::jsonb)
-- on conflict (id) do nothing;
