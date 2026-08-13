-- =====================================================================
-- 4ª EDIÇÃO — INSCRIÇÃO, CONFERÊNCIA, DINHEIRO E DRAFT
-- Execute no SQL Editor do Supabase, DEPOIS de schema.sql.
-- =====================================================================
--
-- Por que estas tabelas existem, em vez de mais campos no JSON do campeonato:
-- o dataset é UM documento com trava de concorrência global (lastUpdatedISO).
-- Duas pessoas se inscrevendo ao mesmo tempo colidiriam, e o histórico precisa
-- ser append-only. Inscrição tem ciclo de vida próprio e escrita concorrente,
-- então vira tabela — mesmo padrão que admin_users já usa.
--
-- REGRA DURA: e-mail, WhatsApp e Discord NUNCA cruzam para o dataset público.
-- Quando o draft fecha, migram apenas nick, rotas, elo e time.
--
-- REGRA DESTE ARQUIVO: ele tem de poder ser rodado de novo, do começo ao fim, sem
-- erro. Tudo aqui é `if not exists` / `on conflict do nothing` / `create or replace` /
-- `drop ... if exists` antes de criar. Um único comando não idempotente derruba o
-- script inteiro (é uma transação só) e desfaz também o que já tinha passado.
--
-- Segurança: todas seguem o padrão da tournament_state — RLS ligado E forçado,
-- zero policies, revoke explícito. O "alter default privileges" do schema.sql já
-- fecha por padrão, mas repetimos por tabela para não depender da ordem em que
-- os comandos foram aplicados neste banco.

-- ---------------------------------------------------------------- configuração
create table if not exists public.edicao_config (
  id                     smallint primary key default 1 check (id = 1),
  nome                   text not null default '4a Edicao',

  -- Datas-âncora. Ficam NULAS de propósito enquanto a organização não decide:
  -- as regras (a), (d) e (e) são calculadas a partir delas, e o painel mostra
  -- "aguardando definição" em vez de um veredicto sobre data vazia.
  abertura_inscricoes    timestamptz,
  fechamento_inscricoes  timestamptz,
  prazo_vinculo_riot     timestamptz,
  congelamento_elo       timestamptz,
  data_draft             timestamptz,
  inicio_campeonato      timestamptz,
  inscricoes_abertas     boolean not null default false,

  -- Parâmetros do regulamento. Configuráveis porque a regra (t) permite ajustar
  -- antes do início. NÃO existe teto de inscrições: o número de times é derivado
  -- dos aprovados (piso(aprovados / jogadores_por_time)).
  jogadores_por_time     smallint not null default 5  check (jogadores_por_time between 1 and 10),
  orcamento_por_time     smallint not null default 30 check (orcamento_por_time > 0),
  min_ranqueadas         smallint not null default 5  check (min_ranqueadas >= 0),
  dias_no_grupo          smallint not null default 60 check (dias_no_grupo >= 0),
  prazo_pagamento_dias   smallint not null default 14 check (prazo_pagamento_dias > 0),
  segundos_por_escolha   smallint not null default 60 check (segundos_por_escolha > 0),
  taxa_centavos          integer  not null default 2000 check (taxa_centavos >= 0),
  pct_campeao            smallint not null default 70 check (pct_campeao between 0 and 100),

  chave_pix              text,
  responsavel_financeiro text,
  atualizado_em          timestamptz not null default now()
);

comment on table public.edicao_config is
'Linha unica com os parametros da edicao. Datas nulas = ainda nao decididas; o painel nao avalia criterio que dependa de data vazia.';

insert into public.edicao_config (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- contas de jogador
-- Espelha admin_users, sem escopos: jogador não tem permissão administrativa.
-- Existe para o painel do capitão — a escolha do draft é validada contra ESTA
-- sessão no servidor, nunca contra um campo enviado no corpo da requisição.
create table if not exists public.jogador_contas (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  display_name  text not null,
  password_hash text not null,
  session_epoch integer not null default 0,
  disabled_at   timestamptz,
  criado_em     timestamptz not null default now()
);

create unique index if not exists jogador_contas_email_key
  on public.jogador_contas (lower(email));

create table if not exists public.jogador_sessoes (
  id             uuid primary key,
  jogador_id     uuid not null references public.jogador_contas(id) on delete cascade,
  criada_em      timestamptz not null default now(),
  expira_em      timestamptz not null,
  revogada_em    timestamptz,
  revogada_razao text,
  ip_hash        text,
  ua_hash        text
);

create index if not exists jogador_sessoes_jogador_idx
  on public.jogador_sessoes (jogador_id, expira_em desc);

-- ---------------------------------------------------------------- inscrições
create table if not exists public.inscricoes (
  id              uuid primary key default gen_random_uuid(),
  criado_em       timestamptz not null default now(),
  jogador_id      uuid references public.jogador_contas(id) on delete set null,

  nick            text not null,
  tag             text not null,
  riot_id         text generated always as (nick || '#' || tag) stored,
  nome_real       text,
  email           text not null,
  discord         text not null,
  whatsapp        text,

  -- Elo: três valores distintos de propósito. O declarado é a palavra do jogador,
  -- o verificado é o que a organização viu, e o congelado é o que vale no draft.
  elo_declarado   text not null,
  elo_verificado  text,
  elo_congelado   text,
  congelado_em    timestamptz,

  -- Pontos NUNCA vêm do cliente: são derivados do elo pelo servidor.
  pontos          smallint not null check (pontos between 0 and 15),

  rota_primaria   text not null,
  rota_secundaria text not null,
  quer_capitao    boolean not null default false,
  entrou_no_grupo date,

  aceite_regulamento boolean not null default false,
  aceite_imagem      boolean not null default false,
  aceite_requisitos  boolean not null default false,

  -- Situação geral. Derivada das conferências, materializada para consulta rápida.
  -- "sobra" = aprovado, mas ficou de fora quando os times fecharam (resto da
  -- divisão por jogadores_por_time). Não é fila com ordem — a organização decide.
  situacao        text not null default 'pendente'
                  check (situacao in ('pendente','apto','recusado','desistiu','sobra')),
  organizador     boolean not null default false,
  observacao      text,

  -- Origem da inscrição, para limitar envio em massa no formulário público.
  -- Hash com pepper, nunca o IP em claro — mesmo tratamento de admin_login_attempts.
  ip_hash         text,

  atualizado_em   timestamptz not null default now()
);

create index if not exists inscricoes_ip_hash_idx
  on public.inscricoes (ip_hash, criado_em desc);

-- Duplicidade é o problema número um do controle por planilha.
create unique index if not exists inscricoes_riot_id_key on public.inscricoes (lower(riot_id));
create unique index if not exists inscricoes_discord_key on public.inscricoes (lower(discord));
create unique index if not exists inscricoes_email_key   on public.inscricoes (lower(email));

comment on column public.inscricoes.pontos is
'Derivado do elo pelo servidor. Nunca aceitar este valor vindo do cliente: ponto e o preco do jogador no draft.';

-- ---------------------------------------------------------------- conferências
-- Uma linha por inscrito x item do regulamento. Elegibilidade NÃO é um sim/não:
-- alguém pode estar aprovado em cinco itens e pendente num.
--   a = tempo de grupo | b = Riot vinculada ao Discord | d = colocação concluída
--   e = mínimo de ranqueadas | f = não é smurf | m = Riot ID informado
create table if not exists public.inscricao_conferencias (
  id                  uuid primary key default gen_random_uuid(),
  inscricao_id        uuid not null references public.inscricoes(id) on delete cascade,
  item                text not null check (item in ('a','b','d','e','f','m')),
  estado              text not null default 'pendente'
                      check (estado in ('pendente','ok','provisorio','risco','recusado','nao_avaliavel','excecao')),
  observacao          text,

  -- "Retrato do que foi visto": o histórico externo muda, e sem isso ninguém
  -- consegue depois justificar por que aprovou ou recusou.
  retrato             jsonb,

  conferido_por       text,
  conferido_em        timestamptz,
  segundo_organizador text,
  atualizado_em       timestamptz not null default now(),
  unique (inscricao_id, item)
);

comment on column public.inscricao_conferencias.estado is
'nao_avaliavel = falta a data que este item usa. Marcar aprovado sem base e pior do que nao marcar.';

-- ---------------------------------------------------------------- pagamentos
create table if not exists public.inscricao_pagamentos (
  id             uuid primary key default gen_random_uuid(),
  inscricao_id   uuid not null references public.inscricoes(id) on delete cascade unique,
  estado         text not null default 'aguardando'
                 check (estado in ('aguardando','declarado','pago','isento','estorno_devido','estornado','cancelado')),
  valor_centavos integer not null default 2000 check (valor_centavos >= 0),
  declarado_em   timestamptz,
  conferido_por  text,
  conferido_em   timestamptz,
  estornado_em   timestamptz,
  vence_em       timestamptz,
  observacao     text,
  atualizado_em  timestamptz not null default now()
);

comment on column public.inscricao_pagamentos.estado is
'"declarado" e a palavra do jogador; "pago" e alguem da organizacao ter aberto o extrato. Nunca colapsar os dois.';

-- ---------------------------------------------------------------- auditoria
-- Append-only: com 2-3 organizadores, "achei que voce ja tinha conferido" e o
-- modo de falha numero um.
create table if not exists public.inscricao_auditoria (
  id           bigserial primary key,
  ocorrido_em  timestamptz not null default now(),
  inscricao_id uuid references public.inscricoes(id) on delete set null,
  autor        text not null,
  acao         text not null,
  detalhe      jsonb
);

create index if not exists inscricao_auditoria_inscricao_idx
  on public.inscricao_auditoria (inscricao_id, ocorrido_em desc);

create index if not exists inscricao_auditoria_feed_idx
  on public.inscricao_auditoria (ocorrido_em desc);

-- ---------------------------------------------------------------- draft
-- `revisao` sustenta TODA a concorrencia do draft: a gravacao e condicionada a ela
-- (update ... where revisao = <a que eu li>), porque dez capitaes e o cronometro
-- escrevem na mesma linha ao mesmo tempo. Sem a coluna, duas escolhas simultaneas se
-- sobrescrevem e uma some sem erro nenhum.
create table if not exists public.draft_estado (
  id            smallint primary key default 1 check (id = 1),
  estado        jsonb,
  revisao       integer not null default 0,
  atualizado_em timestamptz not null default now()
);

-- Para bancos criados antes de a coluna existir.
alter table public.draft_estado add column if not exists revisao integer not null default 0;

insert into public.draft_estado (id) values (1) on conflict (id) do nothing;

-- =====================================================================
-- SEGURANÇA (obrigatório — não remover)
-- =====================================================================
alter table public.edicao_config           enable row level security;
alter table public.edicao_config           force  row level security;
alter table public.jogador_contas          enable row level security;
alter table public.jogador_contas          force  row level security;
alter table public.jogador_sessoes         enable row level security;
alter table public.jogador_sessoes         force  row level security;
alter table public.inscricoes              enable row level security;
alter table public.inscricoes              force  row level security;
alter table public.inscricao_conferencias  enable row level security;
alter table public.inscricao_conferencias  force  row level security;
alter table public.inscricao_pagamentos    enable row level security;
alter table public.inscricao_pagamentos    force  row level security;
alter table public.inscricao_auditoria     enable row level security;
alter table public.inscricao_auditoria     force  row level security;
alter table public.draft_estado            enable row level security;
alter table public.draft_estado            force  row level security;

-- Zero policies em todas: anon e authenticated não alcançam nada.
--
-- A inscrição pública NÃO grava direto no banco — passa por POST /api/inscricao,
-- que valida, deriva os pontos a partir do elo e aplica teto de tamanho. Abrir
-- insert para "anon" seria caminho aberto para encher a tabela, e permitiria
-- enviar pontos que não correspondem ao elo declarado.
--
-- A transmissão do draft também é servida pelo nosso servidor
-- (GET /api/draft/estado, sondagem a cada 2s). Não há leitura direta do banco
-- pelo navegador: a CSP tem connect-src 'self' e bloquearia o websocket do
-- Supabase Realtime de qualquer forma.
revoke all on public.edicao_config          from anon, authenticated;
revoke all on public.jogador_contas         from anon, authenticated;
revoke all on public.jogador_sessoes        from anon, authenticated;
revoke all on public.inscricoes             from anon, authenticated;
revoke all on public.inscricao_conferencias from anon, authenticated;
revoke all on public.inscricao_pagamentos   from anon, authenticated;
revoke all on public.inscricao_auditoria    from anon, authenticated;
revoke all on public.draft_estado           from anon, authenticated;

-- =====================================================================
-- ATOMICIDADE: as pendencias nascem junto com a inscricao
-- =====================================================================
-- Sem isto, criar uma inscricao eram TRES chamadas separadas do servidor
-- (inscricao, 6 conferencias, pagamento). Se a segunda falhasse, sobrava uma
-- inscricao meio-criada: sem linha de pagamento, ela nao aparece na fila do
-- caixa, e ninguem descobre ate a pessoa cobrar. Aqui roda tudo dentro da MESMA
-- transacao do insert. De quebra, vale tambem para linha inserida a mao no SQL
-- Editor.
--
-- SECURITY INVOKER (o padrao) de proposito: a funcao roda como service_role, que
-- ja tem BYPASSRLS. Marcar como DEFINER daria privilegio sem necessidade.
create or replace function public.abrir_pendencias_da_inscricao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  cfg public.edicao_config%rowtype;
begin
  select * into cfg from public.edicao_config where id = 1;

  -- Mesma lista de ITENS_CONFERENCIA em lib/inscricoes/schema.ts e do check
  -- da coluna. Criar as 6 agora (em vez de na primeira conferencia) e o que
  -- deixa a matriz do painel mostrar o que falta desde o dia 1.
  insert into public.inscricao_conferencias (inscricao_id, item)
  select new.id, item from unnest(array['a','b','d','e','f','m']) as item
  on conflict (inscricao_id, item) do nothing;

  insert into public.inscricao_pagamentos (inscricao_id, valor_centavos, vence_em)
  values (
    new.id,
    coalesce(cfg.taxa_centavos, 2000),
    now() + (coalesce(cfg.prazo_pagamento_dias, 14) || ' days')::interval
  )
  on conflict (inscricao_id) do nothing;

  return new;
end;
$$;

drop trigger if exists inscricoes_abrir_pendencias on public.inscricoes;
create trigger inscricoes_abrir_pendencias
  after insert on public.inscricoes
  for each row execute function public.abrir_pendencias_da_inscricao();

-- =====================================================================
-- LOGIN DO JOGADOR: tentativas e troca de senha
-- =====================================================================
-- Tabela SEPARADA de admin_login_attempts de proposito. Se as duas dividissem
-- o contador, cinco erros de senha de um jogador travariam o login de admin do
-- mesmo IP, e o registro de seguranca da organizacao ficaria misturado com o
-- de 50 jogadores.
create table if not exists public.jogador_login_attempts (
  id          bigserial primary key,
  occurred_at timestamptz not null default now(),
  email       text,
  ip_hash     text not null,
  success     boolean not null,
  reason      text not null
);

create index if not exists jogador_login_attempts_ip_idx
  on public.jogador_login_attempts (ip_hash, occurred_at desc);
create index if not exists jogador_login_attempts_email_idx
  on public.jogador_login_attempts (lower(email), occurred_at desc);

-- Senha redefinida pela organizacao nasce temporaria: o jogador troca no
-- primeiro acesso. Sem isto, quem redefine continua sabendo a senha do outro.
alter table public.jogador_contas
  add column if not exists must_change_password boolean not null default false;

alter table public.jogador_login_attempts enable row level security;
alter table public.jogador_login_attempts force  row level security;
revoke all on public.jogador_login_attempts from anon, authenticated;

-- =====================================================================
-- E-MAIL SEMPRE EM MINUSCULAS
-- =====================================================================
-- O codigo procura conta e vincula inscricao com igualdade simples (`.eq`) em vez
-- de `ilike`, porque em LIKE o `%` e o `_` sao curingas: quem se cadastrasse com o
-- e-mail "%@gmail.com" reivindicaria de uma vez todas as inscricoes do Gmail ainda
-- sem conta. A igualdade so equivale a busca sem diferenciar maiusculas se o dado
-- gravado ja estiver em minusculas. O schema Zod garante na entrada; isto garante
-- no banco, inclusive para linha inserida a mao pelo SQL Editor.
-- O `drop ... if exists` antes de cada `add` NAO e enfeite: o PostgreSQL nao tem
-- `add constraint if not exists`, e sem ele rodar este arquivo uma segunda vez aborta
-- em "constraint already exists". Como o SQL Editor executa o script como UMA
-- transacao, o abort desfaz tudo o que veio antes — inclusive o gatilho criado mais
-- acima. O operador veria um erro de constraint duplicada, que parece inofensivo, e o
-- gatilho continuaria sem existir.
alter table public.jogador_contas
  drop constraint if exists jogador_contas_email_minusculo;
alter table public.jogador_contas
  add constraint jogador_contas_email_minusculo check (email = lower(email)) not valid;
alter table public.jogador_contas validate constraint jogador_contas_email_minusculo;

alter table public.inscricoes
  drop constraint if exists inscricoes_email_minusculo;
alter table public.inscricoes
  add constraint inscricoes_email_minusculo check (email = lower(email)) not valid;
alter table public.inscricoes validate constraint inscricoes_email_minusculo;

-- Mesma razao, para o login da organizacao (ver `normalizarUsuario`).
alter table public.admin_users
  drop constraint if exists admin_users_username_minusculo;
alter table public.admin_users
  add constraint admin_users_username_minusculo check (username = lower(username)) not valid;
alter table public.admin_users validate constraint admin_users_username_minusculo;
