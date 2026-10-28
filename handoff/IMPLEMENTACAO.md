# Implementação dos 5 temas — instruções comuns (League of Bronze, 28/10/2026)

Você implementa UM tema, num worktree só seu, em paralelo com outros 4 implementadores (um por time).
O resultado vai para produção e vira vídeo para o grupo do campeonato: tem de ficar LINDO no computador e
no celular, e fiel ao spec. Escreva tudo em português do Brasil (comentários, textos, commit).

## O que ler antes de escrever código
1. `BRIEF.md` (nesta pasta): o pedido do Lucas e as 13 regras da casa. São duras — várias viraram teste.
2. O SEU spec: `<pasta do time>\spec.md`. No FIM dele há a seção «## Ajustes obrigatórios do juiz»: ela
   VENCE o spec onde os dois discordarem. Leia também `juiz.md` (o parecer geral).
3. O código/protótipo que o designer já escreveu (a pasta do time: `codigo\`, `final\`, `prototipo\`,
   `lab\`, `harness\`…). Comece dele quando existir — mas ele foi testado numa cópia do repo, não nos
   dados nem na base de agora: confira tudo de novo e aplique os ajustes do juiz.
4. O modelo de implementação no repo: `components/times/cenarios/boteco.tsx`, `ornamentos-boteco.tsx`,
   `boteco.module.css`, `boteco-ficha.module.css` e `tests/times/tema-galacticos-do-bar.test.tsx`; a base
   comum `components/times/pagina-do-time-com-tema.tsx`, `ficha-do-jogador-com-tema.tsx`,
   `tema.module.css`, `ficha.module.css`, `cenarios/tipos.ts`, `util.ts`; e `lib/temas/*.ts`.

## O que a BASE COMUM já fez (commit da base, já no seu branch)
- `lib/temas/tipos.ts`: as chaves do seu cenário (`Cenario`) e das suas fontes (`ChaveDeFonte`).
- `components/times/fontes-dos-temas.ts`: as suas fontes declaradas no next/font, com a variável
  (`--tm-fonte-titulo` / `--tm-fonte-assinatura`) e, quando há reserva, `adjustFontFallback: false` +
  `fallback: ["<Nome da Reserva>"]` — o `@font-face` dessa reserva (local Arial/Impact com `size-adjust`,
  MAIS ESTREITA que a fonte em todo caractere) mora no SEU módulo CSS, como o «Knewave Caixa Alta» em
  `boteco.module.css`. `tests/stubs/next-font-google.ts` já exporta as suas fontes.
- `lib/temas/registro.ts` já importa o seu `TEMA_…` de `lib/temas/<slug>.ts` (um esqueleto com a cor
  final, as fontes e o cenário; você o reescreve inteiro).
- `components/times/cenarios/index.ts` já importa o seu cenário de `cenarios/<cenario>.tsx` (esqueleto
  com peças vazias e um `<cenario>.module.css` só com um comentário; você reescreve os dois).
- `lib/i18n/messages/temas/<slug>.ts`: o SEU bloco de textos (`definir({ pt: {}, en: {} })`), já
  espalhado em `paginasHome` — as chaves que você puser ali viram `keyof PaginasHomeTextos` e servem em
  `tema.textos`. Prefixe as chaves com o time (ex.: `temaRoscaLema`).
- `app/globals.css`: o cabeçalho do site escurecido no tom do seu tema
  (`body:has([data-tema="<slug>"]) #lob-cabecalho`).
- `tests/times/link-da-carta.test.ts` já espera o seu `<cenario>.module.css`.
- `tests/times/temas-sem-opacidade.test.ts` tem um bloco seu, entre as linhas `// ↓ <Time>` e
  `// ↑ <Time>`: liste ALI os nomes dos @keyframes de ENTRADA do conteúdo (o que move texto, escudo,
  cartas, retrato, nick) — o teste confere que animam transform e nada que esconda.
- `lib/temas/metricas.ts` tem um bloco seu entre `// ↓ <Time>` e `// ↑ <Time>`: a constante da métrica
  da sua fonte de título começa `undefined`; troque pela métrica MEDIDA (a do designer, se a fonte não
  mudou, ou meça de novo: Chromium, canvas `measureText` a 100 px com o woff2 que o next/font baixa,
  `fontKerning = "none"` se a fonte tiver kerning — e então o título e os nicks levam
  `font-kerning: none`). Sem métrica, o título fica sem `--largura-em` (veja como a base usa).

## Os arquivos que são SEUS (só estes)
- `lib/temas/<slug>.ts`
- `lib/i18n/messages/temas/<slug>.ts`
- `components/times/cenarios/<cenario>.tsx`, `<cenario>.module.css`, `<cenario>-ficha.module.css`,
  `ornamentos-<cenario>.tsx` (e outros arquivos NOVOS com o prefixo do seu cenário, se precisar)
- `tests/times/tema-<slug>.test.tsx` (novo)
- o SEU bloco em `lib/temas/metricas.ts` e em `tests/times/temas-sem-opacidade.test.ts` (só entre as
  suas duas linhas-marcador; não mexa nas linhas-marcador nem fora delas)

NÃO edite mais nada: nem a base comum (pagina/ficha com tema, tema.module.css, ficha.module.css,
cenarios/tipos.ts, util.ts, registro.ts, index.ts, tipos.ts, fontes-dos-temas.ts, globals.css, o stub),
nem os outros temas, nem `next.config.ts` no commit. Se achar indispensável mudar a base, NÃO mude: ache
a saída dentro do seu cenário (ganchos `.raiz .peca`, peças, CSS) e descreva a mudança desejada no
retorno. Os outros 4 implementadores estão mexendo nos arquivos deles ao mesmo tempo, em outros
worktrees — o seu branch só será juntado no fim.

## Dados, fotos e servidor
- O seu worktree tem `leagueofbronze.json` com os dados de PRODUÇÃO (marcado skip-worktree): nunca o
  edite nem commite. Fotos: `public/players/<slug-do-jogador>-4a.webp`; escudo:
  `public/teams/<slug>.webp`. Não mexa nas imagens (se uma imagem precisar de tratamento, diga no retorno).
- Servidor de desenvolvimento, em segundo plano, a partir do SEU worktree:
  `npx next dev --webpack -p <porta>` (a porta é sua; nunca use a de outro). Páginas: `/times/<slug>`,
  `/jogadores/<slug-do-jogador>` (as 5 fichas), `/jogadores`, `/times`, `/tabela` e `/calendario` (a cor do time).
  No fim, PARE o servidor (mate a árvore do processo: `taskkill /PID <pid> /T /F`) — não deixe nada rodando.
- Playwright: `require("C:/Users/Lucas Oliveira/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright")`.
  Ferramentas da casa em `.sim/` (no worktree; não versionadas): `medir-tema.cjs <url> [marca]` (estouro,
  título na coluna, fator da fonte, nicks), `captura.cjs`, `comparar-paginas.cjs`. Salve prints e scripts em
  `<pasta do time>\impl\` (nunca dentro do repo).

## Regras que já derrubaram o site (o teste pega algumas; as outras, só você)
- Conteúdo (texto, escudo, cartas, fotos, nick) anima SÓ transform. Opacidade/filter/visibility/clip-path
  animados só em enfeite com classe `.enf…` (aria-hidden, sem texto). Sem `animation-delay` e sem
  `animation-fill-mode` no conteúdo: a espera mora dentro do keyframe (`0%, 40% { … }`).
- QUADRO 0 = PÔSTER: congele tudo no tempo 0 (`document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0 })`)
  e confira que nada de conteúdo está coberto, cortado ou fora da tela; o mesmo no fim. `prefers-reduced-motion:
  reduce` para tudo (a base já tem o bloco `.raiz *`; enfeites seus que dependem de animação para aparecer têm de
  ficar visíveis/coerentes parados).
- O minificador do build (lightningcss) APAGA `translate:` numa regra que também tenha `transform:` literal
  (o dev não minifica — o teste `css-do-build` pega). Recuo vai dentro do transform.
- Nome de `@keyframes` ÚNICO em toda a pasta components/times (os testes da casa juntam os keyframes de
  todos os módulos num mapa por nome: um `haloNasce` repetido faz o teste conferir o keyframe de OUTRO tema).
  Já existem, entre outros: faixaAbre, haloNasce, brinde, pincelada, carimbo, sobe, tremor… — confira com
  `grep -rhoE "@keyframes [A-Za-z0-9_-]+" components/times | sort | uniq -d` (tem de sair vazio) e, na dúvida,
  prefixe com o seu cenário. A base ganhou um teste que falha com qualquer nome repetido.
- A carta do elenco é clicável inteira: nada no caminho `.identidade/.sobreFoto/.nick/.link` com filter,
  transform/translate/rotate/scale, position, clip-path, mask, contain, content-visibility, transform-style,
  will-change de transform. Confira com `elementFromPoint` numa grade de pontos de cada carta.
- Ganchos sempre `.raiz .peca` (um nível acima da base). Nunca a mesma propriedade, com a mesma
  especificidade, em dois módulos no mesmo elemento (a ficha soma tema.module.css + ficha.module.css: a ordem
  dos CSS no build muda e o empate decide diferente). Nada de @layer.
- Contraste: texto ≥ 4,5:1 (rótulos pequenos também); título grande ≥ 3:1 com contorno/eco.
- 320 a 2560 px sem rolagem horizontal; o celular (≤ 599) NÃO é o computador encolhido; nick da ficha em ≤ 2
  linhas e nunca partido no meio da palavra; título nunca cortado (inclusive enquanto a fonte carrega — teste
  com a fonte bloqueada: a reserva tem de caber).
- Flashes ≤ 2 por segundo e pequenos. Infinitas: poucas, só transform/opacity. Entrada do elenco por rolagem
  (`animation-timeline: view()`) com fallback de relógio. Celular a 60 fps.
- Tudo o que o cenário desenha é SVG/CSS próprio (sem imagens externas, sem marca registrada da Riot).

## Verificação (antes de commitar) — com prints em `<pasta do time>\impl\`
1. `/times/<slug>` em 320, 360, 390, 414, 600, 768, 1024, 1280, 1440, 1920 e 2560: sem estouro horizontal
   (`scrollWidth <= innerWidth`), título inteiro dentro do herói, quadro 0 e quadro final legíveis (prints do
   herói em 1440 e 390, nos dois quadros; e do elenco e da cartela). Movimento reduzido: nenhuma animação rodando.
2. As 5 fichas (`/jogadores/<slug>`) em 1440 e 390: retrato com o rosto enquadrado (`fotos.foco`), nick ≤ 2
   linhas, companheiros, voltar. Print de 2 fichas (uma no computador, outra no celular).
3. Cartas: clique em toda a área (grade de `elementFromPoint`) leva à ficha certa.
4. Console sem erro nem aviso de hidratação. Contraste dos textos medido.
5. Testes: escreva `tests/times/tema-<slug>.test.tsx` (no molde do da Galácticos: dados do tema, nome
   partido, textos nos dois idiomas, métrica, cor do time, renderização da página e da ficha). Rode
   `npx vitest run tests/times`, depois a suíte inteira `npx vitest run`, `npx tsc --noEmit` e
   `npx eslint` nos seus arquivos. Tudo verde (se algo fora do seu tema falhar, diga qual e por quê).
6. Build de PRODUÇÃO no seu worktree (pare o dev antes — os dois usam a mesma `.next`): ponha
   TEMPORARIAMENTE `turbopack: { root: "C:/" }` no `next.config.ts` (o worktree usa node_modules por junção),
   `npx next build`, `npx next start -p <porta+10>`, repita os itens 1 e 3 no build (o CSS minificado e a ordem
   dos CSS mudam), pare o servidor e DESFAÇA o next.config.ts (`git checkout -- next.config.ts`).

## Commit
`git add` SÓ os seus arquivos (caminhos explícitos; nunca `-A`/`.`), um commit no seu branch, mensagem em
português no formato `feat(times): tema <Nome do time> «<Conceito>»` + um parágrafo curto. PROIBIDO
qualquer linha de coautoria ou atribuição (nada de `Co-Authored-By`, nada de «Generated with»): regra
absoluta do dono do repo. Não faça push, merge nem rebase; não toque nos outros worktrees.
