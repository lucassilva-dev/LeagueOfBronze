-- =====================================================================
-- PREÇO DO DRAFT POR DIVISÃO: CONGELAR TAMBÉM A DIVISÃO E O PDL (2026-10-22)
-- =====================================================================
-- A partir da 4a Edicao a tabela de pontos do draft e calculada a partir do pool
-- (lib/draft/precos.ts): o preco de cada jogador depende do elo E da divisao (Prata III
-- custa diferente de Prata I) e, no Mestre, da faixa de PDL. `congelarElos` so congelava o
-- elo (tier); o robo da Riot continua atualizando `riot_divisao` e `riot_pdl` todo dia, e
-- com o preco por divisao isso bastava para a tabela mudar DEPOIS de divulgada.
--
--   divisao_congelada   a divisao lida na Riot no dia do congelamento ('I'..'IV'). Nula
--                       quando a leitura era de OUTRO tier (elo travado a mao pela
--                       organizacao) ou nao havia leitura: o preco fica no meio do elo.
--   pdl_congelado       o PDL lido no mesmo dia (no Mestre+ e ele que da a faixa de preco).
--
-- Gravadas SO por `congelarElos`, junto com `elo_congelado`, e lidas pelo draft so quando
-- a inscricao esta congelada. Tudo aditivo e anulavel, e o codigo le `select *`: a migracao
-- pode (e deve) entrar ANTES do deploy. Sem ela, o botao «Congelar» e o cron recusam com
-- erro de coluna inexistente — e nada fica congelado pela metade, porque a primeira linha
-- ja falha.
--
-- Idempotente (pode rodar de novo) e nos dois schemas: o ambiente de teste (lob_teste) mora
-- no MESMO banco e precisa das mesmas colunas. O grant de tabela do service_role cobre
-- colunas novas, entao nao ha grant a repetir.
do $precos_por_divisao$
declare s text;
begin
  foreach s in array array['public', 'lob_teste'] loop
    continue when not exists (select 1 from pg_namespace where nspname = s);
    continue when to_regclass(format('%I.inscricoes', s)) is null;
    execute format($sql$
      alter table %1$I.inscricoes
        add column if not exists divisao_congelada text,
        add column if not exists pdl_congelado     integer;

      alter table %1$I.inscricoes drop constraint if exists inscricoes_divisao_congelada_valida;
      alter table %1$I.inscricoes add constraint inscricoes_divisao_congelada_valida
        check (divisao_congelada is null or divisao_congelada in ('I', 'II', 'III', 'IV'));

      alter table %1$I.inscricoes drop constraint if exists inscricoes_pdl_congelado_valido;
      alter table %1$I.inscricoes add constraint inscricoes_pdl_congelado_valido
        check (pdl_congelado is null or pdl_congelado >= 0);

      comment on column %1$I.inscricoes.divisao_congelada is
        'Divisao (I-IV) lida na Riot no congelamento, so quando a leitura era do mesmo tier de elo_congelado. Nula = meio do elo no preco do draft.';
      comment on column %1$I.inscricoes.pdl_congelado is
        'PDL lido na Riot no congelamento (mesma regra de divisao_congelada). No Mestre+ define a faixa de preco do draft.';
    $sql$, s);
  end loop;
end
$precos_por_divisao$;

-- O PostgREST guarda o esquema em cache: sem recarregar, o primeiro «Congelar» depois da
-- migracao ainda pode responder "coluna inexistente".
notify pgrst, 'reload schema';
