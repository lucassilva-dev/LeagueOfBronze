# League of Bronze (Site do Campeonato)

Site moderno para acompanhar campeonato amador de League of Legends em formato MD3, com:

- tabela calculada por séries
- partidas e detalhe por jogo
- páginas de times e jogadores
- leaderboards (kills, KDA, MVPs, assists)
- painel `/admin` com JSON local (CRUD + import/export)

## Stack

- Next.js (App Router) + TypeScript
- TailwindCSS (componentes estilo shadcn/ui)
- Framer Motion
- TanStack Table
- Zod
- Vitest (testes de cálculo)

## Requisitos (Windows)

- Node.js 20+ (recomendado)
- npm 10+

## Instalação

```powershell
cd C:\SiteCampeonato
npm install
Copy-Item .env.example .env.local
```

Edite `C:\SiteCampeonato\.env.local` e defina:

```env
ADMIN_PASSWORD=sua-senha-forte-aqui
```

## Rodar em desenvolvimento

```powershell
npm run dev
```

Abra:

- Público: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`

## Scripts

```powershell
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
npm run test:coverage
npm run sonar
```

## Sonar via CLI

O projeto agora tem configuracao de scanner em `sonar-project.properties` e usa o pacote oficial `@sonar/scan`.

Antes de rodar, defina as variaveis no terminal:

```powershell
$env:SONAR_HOST_URL="http://localhost:9000"
$env:SONAR_TOKEN="seu-token"
```

Se o projeto no Sonar usar outra chave, ajuste `sonar.projectKey` em `sonar-project.properties`.

Fluxo recomendado:

```powershell
npm run test:coverage
npm run sonar
```

## Como funciona o JSON local (Fase 1)

- O arquivo base é `leagueofbronze.json` na raiz do projeto.
- A UI pública lê esse arquivo.
- O `/admin` salva no mesmo arquivo (com validação Zod).
- `tournament.lastUpdatedISO` é atualizado automaticamente ao salvar.
- `standingsSeed` só é usado quando `seriesMatches` estiver vazio.
- Assim que existir 1 série em `seriesMatches`, a tabela passa a ser calculada só pelas séries.

## Admin online (grátis) com Supabase

Agora o projeto suporta persistência online via Supabase sem mudar as telas do admin.

### Como funciona

- `DATA_PROVIDER=local` -> usa `leagueofbronze.json`
- `DATA_PROVIDER=supabase` -> usa tabela `tournament_state` no Supabase
- Se `DATA_PROVIDER` estiver vazio e as chaves do Supabase existirem, o app usa Supabase automaticamente

### Passo a passo (Supabase)

1. Crie um projeto no Supabase (plano Free).
2. Abra `SQL Editor`.
3. Execute o SQL de `supabase/schema.sql`.
4. Configure as variáveis de ambiente:

```env
DATA_PROVIDER=supabase
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SEU_SERVICE_ROLE_KEY
SUPABASE_DATASET_ROW_ID=leagueofbronze
ADMIN_PASSWORD=sua-senha
```

5. Rode o projeto e entre em `/admin`.
6. Use a aba `Importar/Exportar` para importar seu `leagueofbronze.json` inicial.

Depois disso, as alterações feitas no admin ficam persistidas online no Supabase.

## Regras implementadas

- MD3 (melhor de 3)
- Pontuação por série: vitória = 3, derrota = 0
- Tabela calculada por séries completas (quando algum time atinge 2 vitórias)
- Desempate:
1. Pontos
2. Séries vencidas
3. Saldo de jogos
4. Confronto direto (apenas empate entre 2 times)
5. Ordem alfabética

## Responsividade (mobile)

- Layout mobile-first
- Cards e grids adaptáveis
- Tabelas com versão em cards no mobile (onde faz sentido) + scroll horizontal controlado
- Foco visível e contraste de tema dark

## Admin (Fase 1)

Painel `/admin` com:

- login por senha via `ADMIN_PASSWORD`
- CRUD de times
- CRUD de jogadores
- CRUD de séries MD3
- lançamento de games e K/D/A por jogador
- import/export de JSON
- preview de classificação recalculada

Observação:

- A proteção de senha é simples (intencional), adequada para uso local/grupo.

## Testes

Executa testes de:

- cálculo de classificação
- desempate com confronto direto
- leaderboards / MVP

```powershell
npm run test
```

## Build local

```powershell
npm run build
npm run start
```

## Deploy (Vercel)

### Importante sobre JSON local

Em Vercel, escrita em arquivo local **não é persistente** entre execuções/deploys.

Isso significa:

- leitura pública funciona
- `/admin` com gravação em arquivo local **não é confiável em produção**

Para produção, use `DATA_PROVIDER=supabase` (já suportado neste projeto).

## Fase 2 (Supabase) — instruções de implementação

Objetivo: substituir o JSON local por Postgres + Auth, mantendo a mesma lógica de cálculo em `/lib`.

### Tabelas sugeridas (equivalentes ao schema)

- `tournaments`
- `teams`
- `players`
- `series_matches`
- `series_games`
- `series_game_player_stats`

### Mapeamento

- `series_matches`: `id`, `tournament_id`, `date`, `team_a_id`, `team_b_id`
- `series_games`: `id`, `series_match_id`, `game_number`, `winner_team_id`, `duration_min`, `mvp_player_id`
- `series_game_player_stats`: `id`, `series_game_id`, `player_id`, `champion`, `kills`, `deaths`, `assists`

### Auth / Admin

- Supabase Auth (email/senha ou magic link)
- RLS habilitado
- política de escrita restrita a admins
- leitura pública liberada para páginas públicas (ou via server-side only)

### Estratégia recomendada

1. Criar adapter `lib/data-source.ts` com interface comum (`readDataset`/`writeDataset` equivalente).
2. Manter `lib/tournament.ts` (cálculos) sem dependência do banco.
3. Implementar rotas do admin usando Supabase server client.
4. Migrar `/admin` para persistir no Postgres.
5. Manter export JSON como backup.

### Deploy em produção (recomendado)

- Vercel (app Next)
- Supabase (Postgres + Auth)
- ENV no Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

## Estrutura principal

- `app/` rotas públicas + admin + API routes
- `components/` UI e painéis
- `lib/schema.ts` validação Zod
- `lib/tournament.ts` cálculos (tabela/stats/MVPs)
- `lib/data-store.ts` leitura/escrita do JSON local
- `tests/` testes de cálculo
