-- =====================================================================
-- 4ª EDIÇÃO — DADOS: PRAZO ÚNICO E FILA DE RESERVA NOS PAGAMENTOS JÁ ABERTOS (2026-10-23)
-- =====================================================================
-- Ajuste de DADOS (não de estrutura), decisões D3 e D6 do Lucas (2026-10-22), já com o
-- formato de 8 times de 5 = 40 vagas (b31e43f). Rode DEPOIS do bloco «fila de reserva, prazo
-- único e recado» de schema-4a-edicao.sql — a coluna edicao_config.prazo_pagamento_ate tem
-- de existir — e ANTES do fim do prazo (01/11/2026 02:59:59 UTC).
--
-- O que faz, em public e lob_teste (o site de teste mora no MESMO banco):
--
--  1. edicao_config.prazo_pagamento_ate = 2026-11-01T02:59:59Z, o fim de 31/10/2026 em
--     Brasília (D3). Daí em diante o gatilho `abrir_pendencias_da_inscricao` dá esse prazo a
--     quem se inscreve, e `prazoDoChamado` (lib/inscricoes/fila.ts) ao reserva chamado.
--  2. Recalcula `vence_em` de todo pagamento EM ABERTO (aguardando ou declarado) segundo a
--     fila de AGORA (D6):
--       titular  → 2026-11-01T02:59:59Z
--       reserva  → nulo (reserva só paga se for chamado, D2)
--     Pago, isento, estorno_devido, estornado e cancelado NÃO são tocados. Inscrição fora
--     da conta (recusado, desistiu, excluido) também não: a cobrança dela já não vale
--     (`foraDaCobranca`), e mexer no prazo dela não muda nada para ninguém.
--  3. Uma linha de auditoria por pagamento alterado (`prazo_alinhado_com_a_fila`, com o
--     lugar e o prazo de antes) e uma para a configuração (`config`, como o painel grava).
--
-- A FILA aqui é a MESMA de `montarFila` (lib/inscricoes/fila.ts), em SQL:
--   ativos      = situacao fora de ('recusado','desistiu','excluido')  (`estaFora`)
--   titulares   = TODOS os organizadores ativos que não estão em «sobra»
--               + os primeiros não organizadores (fora de «sobra») por ordem de inscrição
--                 (`criado_em`, depois `id`), até completar max_times × jogadores_por_time
--   reservas    = o resto dos não organizadores + quem está em «sobra» (organizador ou não)
--
-- GUARDAS (qualquer uma falha = nada é gravado em NENHUM dos dois schemas):
--   - a coluna prazo_pagamento_ate existe (a migração entrou antes);
--   - max_times × jogadores_por_time = 40 (8 times de 5). Outro número quer dizer que a
--     configuração não é a que a organização decidiu: confira antes de alinhar o caixa;
--   - ainda não passou do prazo. Depois dele, este alinhamento poria titulares chamados
--     da fila (que têm agora + 48 h) de volta num prazo vencido — quem decide a partir daí
--     é o painel (D5, «passar a vaga ao 1º da fila», com confirmação).
--
-- IDEMPOTENTE: só grava onde o valor é diferente do alvo. Rodar de novo não muda nada e
-- não escreve auditoria nenhuma. Schema inexistente (ou sem as tabelas da 4ª) é pulado.
--
-- Prévia (só leitura) do que vai mudar em public — rode antes, se quiser conferir:
--
--   with ativos as (
--     select id, situacao, coalesce(organizador, false) as org, criado_em
--       from public.inscricoes
--      where situacao not in ('recusado', 'desistiu', 'excluido')
--   ), cfg as (
--     select max_times * jogadores_por_time as vagas from public.edicao_config where id = 1
--   ), orgs as (
--     select count(*) as n from ativos where situacao <> 'sobra' and org
--   ), candidatos as (
--     select id, row_number() over (order by criado_em, id) as ordem
--       from ativos where situacao <> 'sobra' and not org
--   ), lugar as (
--     select a.id,
--            case when a.situacao = 'sobra' then 'reserva'
--                 when a.org then 'titular'
--                 when c.ordem <= greatest(0, (select vagas from cfg) - (select n from orgs)) then 'titular'
--                 else 'reserva' end as tipo
--       from ativos a left join candidatos c on c.id = a.id
--   )
--   select i.riot_id, i.criado_em, l.tipo, p.estado, p.vence_em as antes,
--          case l.tipo when 'titular' then timestamptz '2026-11-01T02:59:59Z' end as depois
--     from lugar l
--     join public.inscricoes i on i.id = l.id
--     join public.inscricao_pagamentos p on p.inscricao_id = l.id
--    where p.estado in ('aguardando', 'declarado')
--    order by l.tipo desc, i.criado_em, i.id;
do $dados_fila_e_prazo$
declare
  s          text;
  v_ate      constant timestamptz := timestamptz '2026-11-01T02:59:59Z';
  v_vagas    integer;
  v_config   integer;
  v_pagos    integer;
begin
  if now() >= v_ate then
    raise exception 'O prazo de pagamento (%) ja passou: este alinhamento nao roda mais. Use o painel (D5).', v_ate;
  end if;

  foreach s in array array['public', 'lob_teste'] loop
    continue when not exists (select 1 from pg_namespace where nspname = s);
    if to_regclass(format('%I.edicao_config', s)) is null
       or to_regclass(format('%I.inscricoes', s)) is null
       or to_regclass(format('%I.inscricao_pagamentos', s)) is null
       or to_regclass(format('%I.inscricao_auditoria', s)) is null then
      raise notice '%: sem as tabelas da 4a Edicao, pulado.', s;
      continue;
    end if;

    if not exists (
      select 1 from information_schema.columns
       where table_schema = s and table_name = 'edicao_config' and column_name = 'prazo_pagamento_ate'
    ) then
      raise exception '%: falta a coluna edicao_config.prazo_pagamento_ate. Rode antes o bloco «fila de reserva, prazo unico e recado» de supabase/schema-4a-edicao.sql.', s;
    end if;

    execute format('select max_times * jogadores_por_time from %I.edicao_config where id = 1', s) into v_vagas;
    if v_vagas is distinct from 40 then
      raise exception '%: max_times x jogadores_por_time = % (esperado 40, 8 times de 5). Nada foi gravado: confira a Configuracao da edicao.', s, coalesce(v_vagas::text, 'nulo');
    end if;

    -- 1. O prazo único na configuração (com a auditoria que o painel grava ao salvar).
    execute format($sql$
      with antes as (
        select prazo_pagamento_ate as valor from %1$I.edicao_config where id = 1
      ), mudou as (
        update %1$I.edicao_config
           set prazo_pagamento_ate = %2$L::timestamptz, atualizado_em = now()
         where id = 1
           and prazo_pagamento_ate is distinct from %2$L::timestamptz
        returning id
      )
      insert into %1$I.inscricao_auditoria (autor, acao, detalhe)
      select 'automático', 'config',
             jsonb_build_object(
               'antes',  jsonb_build_object('prazo_pagamento_ate', (select valor from antes)),
               'depois', jsonb_build_object('prazo_pagamento_ate', %2$L::timestamptz),
               'origem', 'supabase/dados-4a-fila-e-prazo.sql')
        from mudou;
    $sql$, s, v_ate);
    get diagnostics v_config = row_count;

    -- 2 e 3. O prazo de cada pagamento em aberto segundo a fila, com auditoria por linha.
    execute format($sql$
      with ativos as (
        select id, situacao, coalesce(organizador, false) as org, criado_em
          from %1$I.inscricoes
         where situacao not in ('recusado', 'desistiu', 'excluido')
      ), orgs as (
        select count(*) as n from ativos where situacao <> 'sobra' and org
      ), candidatos as (
        select id, row_number() over (order by criado_em, id) as ordem
          from ativos
         where situacao <> 'sobra' and not org
      ), lugar as (
        select a.id,
               case
                 when a.situacao = 'sobra' then 'reserva'
                 when a.org then 'titular'
                 when c.ordem <= greatest(0, %3$s - (select n from orgs)) then 'titular'
                 else 'reserva'
               end as tipo
          from ativos a
          left join candidatos c on c.id = a.id
      ), alvo as (
        select p.inscricao_id,
               l.tipo,
               p.vence_em as antes,
               case l.tipo when 'titular' then %2$L::timestamptz end as depois
          from %1$I.inscricao_pagamentos p
          join lugar l on l.id = p.inscricao_id
         where p.estado in ('aguardando', 'declarado')
      ), mudou as (
        update %1$I.inscricao_pagamentos p
           set vence_em = a.depois, atualizado_em = now()
          from alvo a
         where p.inscricao_id = a.inscricao_id
           and p.estado in ('aguardando', 'declarado')
           and p.vence_em is distinct from a.depois
        returning p.inscricao_id, a.tipo, a.antes, a.depois
      )
      insert into %1$I.inscricao_auditoria (inscricao_id, autor, acao, detalhe)
      select inscricao_id, 'automático', 'prazo_alinhado_com_a_fila',
             jsonb_build_object(
               'lugar', tipo,
               'prazoAnterior', antes,
               'prazoNovo', depois,
               'origem', 'supabase/dados-4a-fila-e-prazo.sql')
        from mudou;
    $sql$, s, v_ate, v_vagas);
    get diagnostics v_pagos = row_count;

    raise notice '%: configuracao % (0 = ja estava), % pagamento(s) em aberto com o prazo alinhado a fila.',
      s, v_config, v_pagos;
  end loop;
end
$dados_fila_e_prazo$;
