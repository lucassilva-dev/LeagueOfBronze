-- =====================================================================
-- TIME DEFINIDO PELA ORGANIZACAO (2026-10-24)
-- =====================================================================
-- Decisao da organizacao no dia do draft da 4a Edicao: os organizadores jogam juntos, num
-- time que ja entra PRONTO e nao participa do draft — nao escolhe e ninguem o escolhe. Os
-- outros times seguem normais, com os capitaes definidos (migracao-capitaes-definidos.sql).
--
--   inscricoes.time_definido   a rota do jogador no time definido (TOP, JUNG, MID, ADC, SUP);
--                              nulo = vai ao draft. Exatamente um time por edicao: os marcados
--                              precisam ser `jogadores_por_time`, titulares aptos, com rotas
--                              diferentes e um (so um) capitao definido entre eles — senao o
--                              sorteio recusa e a mesa mostra o porque (lib/draft/time-definido.ts).
--
-- Com o time definido valendo, a tabela de pontos e calculada so sobre quem vai ao draft
-- (sem os cinco), com um time a menos: na 4a, 7 times x 30 = 210. O time definido entra no
-- sorteio (tira nome e cor como os outros), fica fora da ordem de escolha e vai para o site
-- no «Aplicar no site» com a rota que esta aqui.
--
-- Aditivo, sem default (nulo), e o codigo le `select *`: pode entrar antes do deploy. Sem a
-- coluna, o draft segue sem time definido, como antes.
--
-- Idempotente e nos dois schemas (o ambiente de teste, lob_teste, mora no MESMO banco).
do $time_definido$
declare s text;
begin
  foreach s in array array['public', 'lob_teste'] loop
    continue when not exists (select 1 from pg_namespace where nspname = s);
    continue when to_regclass(format('%I.inscricoes', s)) is null;

    execute format($sql$
      alter table %1$I.inscricoes
        add column if not exists time_definido text;

      alter table %1$I.inscricoes
        drop constraint if exists inscricoes_time_definido_rota;
      alter table %1$I.inscricoes
        add constraint inscricoes_time_definido_rota
        check (time_definido is null or time_definido in ('TOP', 'JUNG', 'MID', 'ADC', 'SUP'));

      comment on column %1$I.inscricoes.time_definido is
        'Rota no time definido pela organizacao (2026-10-24): o time ja entra pronto e nao vai ao draft. Nulo = vai ao draft.';
    $sql$, s);
  end loop;
end
$time_definido$;

notify pgrst, 'reload schema';
