-- =====================================================================
-- CAPITAES DEFINIDOS PELA ORGANIZACAO E CAPITAO SEM PRECO (2026-10-23)
-- =====================================================================
-- Decisao da organizacao na vespera do draft da 4a Edicao:
--
--  1. Os 8 capitaes sao DEFINIDOS pela organizacao (nao mais "o maior elo sem organizador").
--     Pode ser organizador: quem define e a organizacao. A marca fica na inscricao:
--
--       inscricoes.capitao          true = capita definida pela organizacao. Gravada SO pela
--                                   mesa do draft (POST /api/admin/draft, acao "capitaes",
--                                   escopo draft:conduzir, recusada com o draft ja sorteado e
--                                   registrada na auditoria). O sorteio pelo metodo
--                                   "definidos" usa exatamente estes; com o numero errado, ele
--                                   recusa e a mesa avisa.
--
--  2. CAPITAO NAO TEM PRECO: ele nao sai do orcamento, e todo time tem os mesmos 30 pontos
--     para as 4 escolhas (sem compensar a forca do capitao, de proposito). A tabela de pontos
--     e calculada so sobre quem vai ser escolhido (os 32 que nao sao capitaes), com a soma
--     exata 8 x 30 = 240 (lib/draft/tabela-que-fecha.ts). Configuracao da edicao:
--
--       edicao_config.capitao_com_preco   false (o padrao) = capitao sem preco, a decisao da
--                                         4a. true = o modelo ate a 3a, com o capitao pago
--                                         pelo orcamento — fica para edicoes futuras, e o
--                                         codigo mantem os dois caminhos.
--
-- Tudo aditivo, com default, e o codigo le `select *`: a migracao pode (e deve) entrar ANTES
-- do deploy. Sem ela, o painel segue com os capitaes da regra e o capitao sem preco (o codigo
-- trata a coluna ausente como `false`), e «Salvar capitaes» recusa com o recado de rodar este
-- arquivo.
--
-- Idempotente (pode rodar de novo) e nos dois schemas: o ambiente de teste (lob_teste) mora
-- no MESMO banco e precisa das mesmas colunas. O grant de tabela do service_role cobre
-- colunas novas, entao nao ha grant a repetir.
do $capitaes_definidos$
declare s text;
begin
  foreach s in array array['public', 'lob_teste'] loop
    continue when not exists (select 1 from pg_namespace where nspname = s);

    if to_regclass(format('%I.inscricoes', s)) is not null then
      execute format($sql$
        alter table %1$I.inscricoes
          add column if not exists capitao boolean not null default false;

        comment on column %1$I.inscricoes.capitao is
          'Capita definida pela organizacao (2026-10-23). Gravada so pela mesa do draft (acao capitaes); o sorteio pelo metodo definidos usa estas.';
      $sql$, s);
    end if;

    if to_regclass(format('%I.edicao_config', s)) is not null then
      execute format($sql$
        alter table %1$I.edicao_config
          add column if not exists capitao_com_preco boolean not null default false;

        comment on column %1$I.edicao_config.capitao_com_preco is
          'false (padrao, 4a Edicao) = capitao sem preco: cada time tem o orcamento inteiro para as escolhas e a tabela e so de quem vai ser escolhido. true = capitao pago pelo orcamento (modelo ate a 3a).';
      $sql$, s);
    end if;
  end loop;
end
$capitaes_definidos$;

-- O PostgREST guarda o esquema em cache: sem recarregar, o primeiro «Salvar capitaes» depois
-- da migracao ainda pode responder "coluna inexistente".
notify pgrst, 'reload schema';
