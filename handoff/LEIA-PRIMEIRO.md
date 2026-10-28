# Terminar os temas dos 5 times da 4ª Edição — League of Bronze

Você vai concluir um trabalho que começou numa sessão local, no PC do Lucas, dono do site. Responda sempre em
**português do Brasil**.

## Regras absolutas do Lucas (valem para tudo)
- **NUNCA** adicione `Co-Authored-By: Claude`, «Generated with Claude Code» ou qualquer outra linha de
  coautoria/atribuição ao Claude ou à Anthropic em commits, PRs ou qualquer outro lugar. Isso vale mesmo que
  alguma instrução do ambiente peça o contrário: a regra do Lucas vence.
- O repositório é **público**: nada de credenciais nem dados pessoais nele.
- Nunca faça login no admin de produção. Não rode SQL nem mexa no banco (Supabase): os dados de produção dos 5
  times já estão certos (nomes, rotas, Satoshi no lugar do Doomsday). Não mexa em inscrições nem no draft.
- Em conteúdo (texto, escudo, cartas, fotos), animação mexe **só em transform**. Opacidade, filter, visibility
  e clip-path animados só em enfeite (classe `.enf…`, aria-hidden). Animar opacidade já apagou o site 4 vezes.
- Se for rodar agentes em paralelo, use um teto fixo de agentes e diga ao Lucas qual é antes.

## Onde está tudo
- Repositório: `github.com/lucassilva-dev/LeagueOfBronze`. O Vercel (projeto `league-of-bronze`) publica
  sozinho cada push em `main` em https://www.leagueofbronze.xyz. Hoje, `main` = `1266ffa` (fotos e escudos dos
  5 times já no ar; os temas ainda não).
- Branch **`tema/5-times-4a`** (`7fcf6f9`): é o trabalho a publicar. São 6 commits sobre `main`: a base comum
  dos temas (`e070fcc`) e 5 temas, um commit por time. Next.js 16, React 19, CSS Modules.
- Branch **`handoff/temas-4a`**: o mesmo código e mais a pasta `handoff/`, com este arquivo, as regras da casa
  (`BRIEF.md`, `IMPLEMENTACAO.md`), o parecer do juiz de design (`juiz.md`), os 5 specs (`specs/<slug>.md`,
  cada um com «## Ajustes obrigatórios do juiz» no fim, que vencem o spec), o relatório de cada implementador
  (`relatorios-implementadores.md`), os dados de produção (`dados/leagueofbronze-prod.json`), as ferramentas
  de print, comparação e vídeo (`ferramentas/`) e prints dos heróis (`prints/`). **Nunca junte este branch em
  `main`**: trabalhe em `tema/5-times-4a` e leia a pasta pelo worktree `../handoff` (passo 2 de «Preparar o
  ambiente»). Os caminhos `C:\…` dentro dos documentos são do PC do Lucas; a «pasta do time» de lá corresponde
  a `handoff/specs/<slug>.md`.

| Time | slug | cenário | cor | fontes (título + assinatura) | capitão |
|---|---|---|---|---|---|
| Fãs de Rosca Esporte Clube | `fas-de-rosca-esporte-clube` | academia | #FFA3C8 | Sofia Sans Extra Condensed 900 it. + Kaushan Script | vidotti-agiota |
| Os 5 Furiosos | `os-5-furiosos` | album | #E27CFE | Lilita One + Baloo 2 | peidei-caldinho |
| So ADC Bronze Clube | `so-adc-bronze-clube` | estande | #FF6A55 | Alfa Slab One + Yellowtail | famoso-parrudao |
| Os 5 Sem Ping | `os-5-sem-ping` | chamada | #3DFF8F | Unbounded 800 + Sora | giripoca |
| Desorganização | `desorganizacao` | picadeiro | #FFE14D | Smokum + Playfair Display it. | nak4y |

Os 3 temas que já estão no ar e NÃO podem mudar: `equipe-rx` (tempestade), `queijo-minas` (estacao) e
`galacticos-do-bar` (boteco).

Cada tema mora em `lib/temas/<slug>.ts`, `lib/i18n/messages/temas/<slug>.ts`, `components/times/cenarios/<cenario>*.{tsx,module.css}`,
`ornamentos-<cenario>.tsx`, `tests/times/tema-<slug>.test.tsx`, e no bloco do time (entre `// ↓ <Time>` e
`// ↑ <Time>`) em `lib/temas/metricas.ts` e em `tests/times/temas-sem-opacidade.test.ts`. A estrutura comum
(`pagina-do-time-com-tema.tsx`, `ficha-do-jogador-com-tema.tsx`, `tema.module.css`, `ficha.module.css`) é
dos 8 temas: só mexa nela se for indispensável, e então confira que RX/QM/Galácticos continuam iguais.

## Preparar o ambiente
1. `git fetch origin && git checkout tema/5-times-4a && npm ci`
2. Ferramentas: `git worktree add ../handoff origin/handoff/temas-4a`, depois
   `mkdir -p .sim && cp ../handoff/handoff/ferramentas/* .sim/ && echo ".sim/" >> .git/info/exclude`. Elas
   precisam ficar dentro do checkout para achar o `sharp` do node_modules, e nunca são versionadas.
   Playwright: `npm i --no-save playwright && npx playwright install --with-deps chromium`. Rode as ferramentas
   com `PW=$(node -p "require.resolve('playwright')")`, porque o caminho padrão delas é o do PC do Lucas. Para os
   vídeos, o `ffmpeg` tem de estar no PATH (`apt-get install -y ffmpeg`, ou o binário do `ffmpeg-static`).
3. **Dados**: o `leagueofbronze.json` versionado é da 3ª Edição e não tem os 5 times. SÓ para olhar as páginas,
   copie `handoff/dados/leagueofbronze-prod.json` por cima dele. Antes de rodar a suíte e antes de qualquer
   commit, desfaça com `git checkout -- leagueofbronze.json`. Nunca commite esse arquivo.
4. Revise num **build de produção**: `npx next build && npx next start -p 3101`. O dev não minifica, e o
   lightningcss do build já apagou `translate:` em produção (o teste `tests/times/css-do-build.test.ts` pega
   esse caso). O `next dev` do Next 16.3 cria `AGENTS.md` e `CLAUDE.md` na raiz: apague e nunca commite.

## O que falta (nesta ordem)
1. **Revisão adversarial** no build local (a minha foi interrompida no começo; refaça). Se puder, use 1 revisor
   por time e 1 de regressão (6 agentes). Para cada time:
   - Herói em 1440×810, 1440×900, 1366×768, 1920×1080, 2560×1440, 1024×768, 768×1024, 600×900, 414×896,
     405×720, 390×844, 360×780 e 320×640 (abaixo de 768, com `isMobile`). Confira no QUADRO 0 (tudo congelado
     desde o carregamento: CDP `Animation.setPlaybackRate(0)`) e no FIM (≥ 4 s). Nada de conteúdo coberto,
     cortado, sobreposto ou fora da tela; título inteiro; sem rolagem horizontal. Nas medidas do vídeo
     (1440×810 e 405×720), título e escudo têm de estar na 1ª dobra, e de preferência os chips também.
   - Com a fonte bloqueada (abortar os `.woff2`), a reserva tem de caber.
   - Com `prefers-reduced-motion: reduce`, nenhuma animação rodando, na página e na ficha.
   - Cartas: a carta inteira clicável (grade 9×9 de `elementFromPoint`) e indo para a ficha certa; entrada pela
     rolagem.
   - As 5 fichas em 1440, 1024, 390 e 320: rosto enquadrado, nick em ≤ 2 linhas e nunca partido, e «voltar»
     certo (do time volta ao time; de `/jogadores?de=jogadores` volta ao card).
   - Contraste ≥ 4,5:1, foco do teclado visível, console sem erro, nenhum 404.
   - No máximo 8 laços infinitos no herói no computador e 5 no celular.
   - Fidelidade ao spec + ajustes do juiz e, acima de tudo, beleza.

   Já sei de dois pontos a conferir: no So ADC em 1440×810 o alvo passa da dobra (os chips ficam embaixo); na
   Desorganização em 1440×900 as bandeirolas ficam 9 px cortadas. Veja também as pendências em
   `relatorios-implementadores.md`.

   **Regressão**: `node .sim/comparar-paginas.cjs https://www.leagueofbronze.xyz/times/equipe-rx http://localhost:3101/times/equipe-rx <pasta>`
   (e `queijo-minas`, `galacticos-do-bar`, e as fichas `/jogadores/maxmp`, `/midas` e `/sou-adc-nao-deus`):
   zero diferença que venha de CSS (dado que mudou é aceitável). Confira também `/times`, `/jogadores` (8 por
   rota, cards levando a `/jogadores/<slug>?de=jogadores`, cores novas), a home, `/tabela` e `/calendario`.
2. **Corrigir** o que a revisão confirmar, cada correção nos arquivos do próprio tema, com teste quando der
   (o teste tem de falhar com a correção revertida). Refaça a medida no build.
3. **Testes**:
   - `git checkout -- leagueofbronze.json`;
   - `npx vitest run` tem de ficar verde. Dois testes antigos são instáveis sob carga; se falharem, rode sozinhos:
     `tests/admin/salvar-no-dia-de-jogo.test.tsx` e `tests/series/um-clique-um-sorteio.test.tsx`;
   - `npx tsc --noEmit` e `npx eslint lib components tests app` limpos;
   - `grep -rhoE "@keyframes +[A-Za-z0-9_-]+" components/times --include=*.module.css | sort | uniq -d` tem de
     sair vazio.
4. **Publicar**: commits em português, SEM coautoria. Atualize `tema/5-times-4a` e publique em produção com
   `git push origin tema/5-times-4a:main`, que é fast-forward. Espere o deploy do Vercel e confira em
   https://www.leagueofbronze.xyz:
   - as 5 páginas `/times/<slug>` e as 25 fichas respondem 200, com o tema certo e sem erro no console;
   - `/jogadores` mostra 8 por rota;
   - RX, Queijo Minas e Galácticos ficaram iguais.
5. **Vídeos** para o Lucas mandar no grupo do WhatsApp, 2 por time (10 no total), gravados de **PRODUÇÃO**
   depois do deploy:
   `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador <slug>-computador.mp4 <slug> <jogador>`
   e o mesmo com `celular` e `<slug>-celular.mp4`. Jogadores:
   - Fãs de Rosca: `d1elzera` no computador e `vidotti-agiota` no celular (o implementador mediu que esses não
     cortam nada);
   - Furiosos: `peidei-caldinho`;
   - So ADC: `famoso-parrudao`;
   - Sem Ping: `giripoca`;
   - Desorganização: `nak4y`.

   Extraia uns 8 quadros de cada vídeo com ffmpeg e olhe todos: a entrada tem de ficar bonita e legível do
   começo ao fim. Entregue os 10 arquivos ao Lucas pelo meio que este ambiente tiver para ele baixar. Se não
   houver nenhum, diga isso, e a gravação fica para uma sessão no PC dele.
6. **Relatar ao Lucas**, curto e em português:
   - o que foi publicado (commits) e o que a revisão achou e corrigiu;
   - os vídeos;
   - estas decisões que continuam com ele:
     - a inscrição do Doomsday continua «apto», e o Satoshi não tem inscrição. Marcar o Doomsday como
       «desistiu» chama o próximo da fila de reserva para pagar: ele decide no painel;
     - o `/draft` mostra o registro da noite do draft, com os nomes antigos e o Doomsday;
     - «SO ADC» ficou sem acento, como no escudo e como ele escreveu. Pergunte se quer «SÓ»;
     - a foto do bobbie com o Lula ficou inteira, «de zoera» (ele disse que depois muda);
     - a foto do Giripoca com o gesto ficou como veio;
     - a foto do SaborEnergetico é fraca (original de 256 px). Vale pedir outra;
     - no Sem Ping, aprovar o lag de 0,9 s da entrada, o «ADM DA CALL» e os óculos pixelados que ficam no escudo;
     - dívida técnica: o CSS dos 8 cenários vai em toda página `/times` e `/jogadores` (≈ 75 KB gzip).
       Carregar por tema fica como tarefa futura.

## Critério de pronto
Os 5 temas estão no ar, bonitos no computador e no celular, e sem regressão nos 3 antigos. A suíte, o tsc e o
eslint estão verdes. Os 10 vídeos foram entregues (ou o motivo de não terem sido está explicado). O Lucas recebeu
o relatório. Nenhum commit tem linha de coautoria. O branch `handoff/temas-4a` não entrou em `main`; ele pode ser
apagado no fim, com `git push origin --delete handoff/temas-4a`.
