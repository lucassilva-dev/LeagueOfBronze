# /stats cinemático — «A Forja»

> Documento de direção da nova página de estatísticas. Conceito, storyboard ato a ato,
> decisões técnicas e orçamento de performance. As seções 0 a 6 foram escritas ANTES do código
> (20/11/2026) e ficam como o plano original; as seções 7 a 10 foram escritas ao fim: onde está
> cada coisa, o que mudou no caminho, o que foi verificado, as limitações e as próximas ideias.

## 0. O que foi conferido antes de desenhar

| Item apontado | O que há de fato (produção, 20/11) | O que a página nova faz |
| --- | --- | --- |
| Força dos times: «EQUIPE RX sem pontuação, QUEIJO MINAS ausente» | **Não é falha de dado.** Os 8 times estão na tela, RX e Queijo Minas com 27 pts cada. Três times seguidos têm o mesmo «27 pts», e um leitor de texto que junta linhas repetidas perde duas delas. | Cada molde tem nome + número próprios e `aria-label` completo («EQUIPE RX: 27 pontos de elenco»); a visão em tabela lista os 8, um por linha. |
| Top jogadores: valor do gabriel bontempo não aparece | **Não é falha de dado.** Ele aparece com 8 pts (5º). Mesma causa: cinco «8» seguidos. | Cada carta leva o valor num selo próprio, com rótulo acessível. |
| Ranking com 39 linhas para 40 jogadores | **Real, e correto:** só entra quem já jogou. Falta o Lelei de Ozorio (Queijo Minas), que ainda não entrou em jogo. | Vai escrito na tela: «39 de 40 já entraram em jogo · ainda no banco: …», com o nome clicável. |
| 5 rotas em Melhor por rota | **Confirmado:** Topo, Selva, Meio, Atirador, Suporte. | As cinco viram os cinco canais do Rift. |
| (achado extra) Sobretítulo «pré-torneio» | Desatualizado: há 26 jogos lançados. | O sobretítulo passa a sair do dado (jogos e séries disputados). |

Dados lidos: `getServerDataset()` → `tournament_state` (Supabase, `DATA_PROVIDER=supabase` em
produção; `local` no dev lê `leagueofbronze.json`). A rota é `force-dynamic` (exigência da CSP
com nonce), sem cache nem revalidação: cada visita lê o banco uma vez (`cache()` do React
junta metadados e página). Nada disso muda — a página nova só troca a camada visual.

## 1. Conceito

**A FORJA.** Tudo que acontece no campeonato é cunhado em bronze. A página é uma oficina de
fundição: o metal sai da fornalha branco de quente, é batido na bigorna, escorre pelos canais,
enche os moldes dos times e esfria. Visual, movimento e som contam essa mesma história:

- **o que ainda não foi revelado está FRIO** (ferro escuro, baixo contraste) — nunca invisível;
- **a revelação é uma MARTELADA**: a peça esquenta (ferro → brasa → ouro), bate no lugar e solta
  faísca, com um «clang»;
- **o respiro é o metal ESFRIANDO**: o brilho baixa, o número fica.

É a identidade atual do site (Bronze Hextech: carvão `#100d07`, bronze `#c98a4b`, ouro
`#f0c88a`, Anton + Chakra Petch) com a temperatura que faltava: brasa `#ff6a2b`, branco-quente
`#fff3dc` e o teal `#57d8cb` só onde o metal encontra a água.

**O protagonista 3D é um só: o medalhão.** Uma moeda de bronze que nasce derretida na abertura,
leva o emblema do campeonato a marteladas, muda de metal conforme os elos sobem (Ferro → Mestre)
e é recunhada com o escudo de cada time quando o time entra em cena. Um objeto bem feito em vez
de oito cenas medianas.

**Humor.** Os microtextos seguem o «MECÂNICA DUVIDOSA · ENTRETENIMENTO IMACULADO»: «só 2 Bronzes
de verdade num campeonato chamado League of Bronze», «fidelidade zero a campeão»… Sempre tirados
do dado, nunca de uma pessoa.

## 2. Regras de transmissão (valem na página inteira)

A página passa ao vivo, comprimida. Não existe modo de transmissão: é a mesma página.

1. **Número-chave enorme**: Anton, `clamp(64px, 9vw, 168px)`; nada importante abaixo de 15px.
2. **Sem traço de 1px**: contornos de 2px (3px nos que carregam informação).
3. **Sem granulado**: nada de ruído nem partícula fina em tela cheia. Brasas são poucas, grandes
   e lentas; faíscas são rajadas curtas e locais. As listras e o ruído do fundo do site ficam
   cobertos nesta rota.
4. **Nada pisca mais de 3×/s**: marteladas têm intervalo mínimo de 340 ms; contagem é rolagem
   de dígito, não pisca-pisca.
5. **Texto e número saem no HTML**, com o valor final. Animação é enfeite.
6. **Controles óbvios**: rolar funciona; ←/→ e M são atalho, não requisito.

## 3. Storyboard

Cada ato é um palco de uma tela. No computador o palco **fixa** (CSS `position: sticky`) e a
cena acontece amarrada à rolagem (`--p` de 0 a 1); no celular não fixa — a cena dispara quando
entra na tela. Ritmo de todo ato: **cartão do ato (tensão) → cena (revelação) → dado parado
(respiro)**.

### Entrada — «A porta da fornalha» (só na 1ª visita)

- **Tela**: duas folhas de ferro fechadas com uma fresta de luz; emblema; «ENTRAR COM SOM» /
  «ENTRAR SEM SOM».
- **Ao clicar**: clang + grave, as folhas abrem para os lados, a abertura começa.
- **Lembrada**: cookie `lob_stats_som` (o servidor sabe na hora se desenha a porta — sem piscar);
  volume no `localStorage`.
- **Não atrasa nem esconde conteúdo**: o HTML da página inteira vem junto, embaixo. Sem JavaScript
  a porta abre por âncora (`:target`). A porta vem DEPOIS do conteúdo no HTML e marcada com
  `data-nosnippet`.

### Ato I — A FORNALHA (resumo)

- **Dado**: jogadores, pts no pool, média por time, mono champions + a nota de que pontos por elo
  são moeda de draft (texto de conformidade, legível, sempre presente).
- **Rolagem**: título «ESTATÍSTICAS» e o medalhão derretido na bigorna. Quatro marteladas: cada
  uma crava uma placa (ferro frio → ouro), o número rola do zero e o emblema ganha relevo.
- **Som**: clang por martelada, tique na contagem, chiado curto quando a nota aparece.
- **3D**: medalhão + bigorna + martelo + faíscas; câmera reage a rolagem e mouse.

### Ato II — A LIGA (distribuição por elo)

- **Dado**: jogadores por elo, de Ferro a Mestre, com os emblemas oficiais.
- **Rolagem**: os lingotes sobem um a um, da esquerda para a direita; o emblema sobe em cima
  do lingote e o número conta junto.
- **Som**: tique por unidade, baque surdo quando o lingote assenta.
- **Interação**: passar o mouse num lingote mostra QUEM é daquele elo (clicável → holofote).
- **3D**: o medalhão troca de metal a cada elo que sobe.

### Ato III — OS MOLDES (força dos times)

- **Dado**: pts de elenco dos 8 times + campanha (séries V–D) e o elenco de cada um.
- **Rolagem**: o bronze derretido enche o molde de cada time até a pontuação; ao encher, esfria
  na cor do time.
- **Som**: despejo (ruído grave que afina), chiado ao esfriar.
- **Identidade**: escudo cunhado num medalhão, nome na fonte e no metal do tema do time, aura
  na cor dele, os 5 jogadores em volta.
- **3D**: o medalhão é recunhado com o escudo de cada time.

### Ato IV — AS PEÇAS RARAS (top jogadores por valor)

- **Dado**: os 8 mais caros do draft (mesma regra de hoje).
- **Rolagem**: um molde de areia selado trinca, racha e solta as 8 cartas, que chegam em brasa
  e esfriam no foil do time.
- **Som**: trinca, estalo, sopro de carta, clang no nº 1.
- **Interação**: carta 3D holográfica (inclina com o mouse, foil nas cores do time); clique vira
  a carta: estatísticas + arte do campeão mais jogado; botão de holofote e de VS.

### Ato V — OS CANAIS (melhor por rota)

- **Dado**: melhor KDA de cada rota entre quem jogou (top 3 por rota).
- **Rolagem**: o Rift como molde visto de cima; o metal corre pelos canais e acende uma rota por
  vez — Topo, Selva, Meio, Atirador, Suporte —, e o craque de cada uma surge no nó.
- **Som**: sopro do metal correndo, clang quando o nó acende.

### Ato VI — A BIGORNA (ranking de jogadores)

- **Dado**: ranking por Abates / KDA / MVPs / Assistências / Mortes, com inversão de ordem.
- **Sem fixar**: é lista para ler. Pódio do top 3 com tratamento próprio; do 4º em diante,
  linhas que **trocam de lugar animadas (FLIP)** ao mudar o critério; os números rolam como
  odômetro.
- **Na tela**: «39 de 40 já entraram em jogo · ainda no banco: …».
- **Som**: catraca na reordenação, clang ao assentar.

### Ato VII — O ARSENAL (campeões)

- **Dado**: Mais jogados / Mais banidos / Presença / Winrate / KDA (ícones do Data Dragon).
- **Cena**: órbita 3D (CSS) com os ícones dimensionados pela métrica; o nº 1 no centro com a
  splash art em parallax ao fundo. A lista ranqueada fica ao lado, legível.
- **Interação**: trocar de aba reorganiza a órbita; passar o mouse pausa e mostra o campeão.

### Ato VIII — A TÊMPERA (duração das partidas)

- **Dado**: todos os jogos com tempo, numa régua de minutos — «O ATROPELO» numa ponta, «O ÉPICO»
  na outra — e as listas de mais longas / mais rápidas.
- **Rolagem**: uma frente de calor varre a régua e acende os jogos na cor de quem venceu.
- **Som**: tique por jogo, clang nas pontas, chiado final (o metal na água).

### Fecho — O RESFRIAMENTO

- Portas para `/jogadores`, `/times`, `/partidas`; «ver como tabela»; assinatura do campeonato.
- **3D**: o medalhão mergulha, sobe vapor.

### Interações novas (prioridade 2)

- **Holofote**: clicar em qualquer jogador abre a carta dele em destaque (View Transitions API,
  com queda para animação simples), posições no ranking, campeões e link para a ficha.
- **Modo VS**: 2 jogadores ou 2 times lado a lado, como tela de luta. Atalho das próximas séries
  do calendário e link compartilhável (`?vs=`), pensado para o caster abrir antes da partida.
- **Atalhos**: ← / → viajam entre os atos (a cena se monta sozinha no caminho); M liga/desliga o
  som; Esc fecha. Nenhuma tecla do navegador é tomada (Espaço, PageDown, Alt+← seguem livres).

## 4. Identidade dos times

A paleta de cada time **já existe** em `lib/temas/<slug>.ts` (cores, metal, fontes, escudo) e é
a mesma da página do time e do show do sorteio. A /stats lê dali (`identidadeDoTime`), não cria
outro mapa. Onde o jogador aparece, ele carrega: anel e aura na cor do time, escudo cunhado,
foil da carta nas cores `cor / neon / arco`, e o nome do time na fonte do tema.

Para ajustar a cor de um time: `lib/temas/<slug>.ts` (`cor`, `cores.neon`, `cores.arco`,
`metal`). Vale para o site todo.

## 5. Decisões técnicas

| Decisão | Por quê |
| --- | --- |
| **Uma dependência nova: `three`** (sem R3F, drei, postprocessing à parte) | A cena é UM canvas fixo de fundo, dirigido pela rolagem, com um laço próprio. Em three puro eu controlo esse laço (pausa, DPR, degraus de qualidade) sem reconciliador por cima, e o bloom vem dos `examples/jsm` do próprio pacote. R3F + drei + postprocessing somariam ~3 pacotes e ~90 KB gz para uma árvore que não é declarativa. O «PerformanceMonitor» é um amostrador de 40 linhas. |
| **Sem GSAP e sem Lenis** | O projeto já tem `framer-motion` (FLIP do ranking, microinterações). Fixar é CSS `sticky` (funciona sem JS). O «scrub» é um diretor próprio (um `requestAnimationFrame`) que escreve `--p` suavizado nos atos visíveis. Rolagem continua NATIVA — nada de scroll-jacking, barra de rolagem e busca do navegador intactas. |
| **Dado = DOM/SVG/CSS; WebGL = palco** | Texto e número no HTML (LCP, SEO, leitor de tela, nitidez no stream). Se o WebGL faltar ou cair de qualidade, a página perde clima, não conteúdo. |
| **Estado de repouso = revelado** | Regra da casa (animar opacidade já apagou o site 4×). Sem JS, com movimento reduzido ou se o diretor travar, tudo aparece no estado final. Os estados «frios» só existem sob `[data-cine="armado"]`, ligado por um diretor que está rodando; um vigia desarma se o laço parar. Conteúdo nunca anima opacidade: só transform, cor e recorte. |
| **Som 100% sintetizado** | Web Audio sobre a mesa que o show do sorteio já usa (`lib/series/mesa-de-som.ts`): nenhum arquivo, nada para a CSP (`media-src 'self'`) barrar. |
| **Sem modelo 3D nem HDR** | `connect-src 'self'` e `img-src` sem `blob:` barram loaders de glTF/HDR de CDN. Geometria procedural; ambiente gerado por PMREM de uma cena de softboxes; relevo do emblema e dos escudos tirado das próprias imagens do site (mapa de altura → normal map em canvas). |
| **Cartas e órbita em CSS 3D** | Nítidas, acessíveis (cada carta/ícone é um botão), aceleradas por compositor e iguais com ou sem WebGL. A arte dos campeões entra como `<img>` (CSP já libera o Data Dragon). |
| **Tela de entrada por cookie** | Só o servidor consegue decidir ANTES do primeiro quadro se a porta aparece; com `localStorage` a página piscaria. |
| **Visão em tabela = `?modo=tabela`** | Renderizada no servidor, sem 3D, linkável, funciona sem JS. |

### Carta de jogador

Já existem `components/lob/player-card.tsx` (carta 4:5 de /jogadores e /times) e
`components/lob/tcg-card.tsx` (inclinação + brilho das cartinhas de /cartas). A carta
holográfica **evolui as duas**: o motor de inclinação sai do `TcgCard` para um gancho
compartilhado (`components/lob/inclinacao.ts`), que o `TcgCard` passa a usar, e a carta nova
(`components/stats/carta-do-jogador.tsx`) mantém a anatomia do `PlayerCard` (rota, elo, capitão,
nick em Anton, time no rodapé) com foil, verso e arte do campeão.

## 6. Orçamento de performance

| Item | Meta |
| --- | --- |
| FPS | 60 a 1080p em notebook gamer de entrada; nunca abaixo de 45 sem cair um degrau |
| LCP | texto do título (HTML); não depende de 3D nem de fonte de time |
| CLS | ~0 (palcos com altura fixa; fontes de time com caixa reservada) |
| JS da rota (sem three) | ≤ 90 KB gz além do que o site já carrega |
| `three` | só nesta rota, `import()` depois do primeiro quadro, e só se houver WebGL, janela de 1280×560 para cima (onde há roteiro de rolagem) e movimento liberado |
| Canvas | 1 só; DPR ≤ 1,5; pausa com aba oculta e nos atos de leitura |
| Degraus | **alta** (DPR 1,5, bloom, 4×MSAA) → **média** (DPR 1,25, bloom) → **baixa** (DPR 1, sem pós) → **2D** (fundo CSS + faíscas em canvas 2D). O monitor mede o quadro e desce sozinho; sobe no máximo uma vez. |
| Partículas | faíscas em rajadas curtas e grossas (até 64 por golpe); brasas: 8 a 14, grandes e lentas, só no terço de baixo da tela |
| DOM por quadro | só `--p` nos atos visíveis; nada de `filter`/`box-shadow` animado em área grande |
| Imagens | fotos e ícones com `loading="lazy"` e tamanho declarado; arte de campeão só quando a carta vira |
| Som | 0 bytes de rede |

Celular e máquina fraca: mesmo conteúdo e mesmo desenho; sem fixar, sem 3D pesado (2D), menos
partículas. `prefers-reduced-motion`: estado final de tudo, sem scrub, sem câmera, sem contagem;
som continua disponível.

## 7. Onde está cada coisa

| O quê | Onde |
| --- | --- |
| A página (servidor): dados, textos, cookie da porta, `?vs=`, `?modo=tabela` | `app/stats/page.tsx` |
| O retrato dos dados (um objeto só, das mesmas funções do resto do site) | `lib/stats/forja.ts` |
| Textos novos, PT e EN | `lib/i18n/messages/forja.ts` |
| O diretor da rolagem (`--p`, marcas, pinos, viagem entre atos, vigia) | `components/stats/diretor.ts` |
| O provedor (som, faíscas, atalhos, holofote, VS, trava de rolagem) | `components/stats/provedor.tsx` |
| Os atos | `components/stats/atos/*.tsx` + `*.module.css` |
| Peças comuns (cartão do ato, odômetro, medalhão, rosto, nome do time) | `components/stats/pecas.tsx`, `forja.module.css` |
| A carta holográfica do jogador | `components/stats/carta-do-jogador.tsx`, `carta.module.css` |
| O motor de inclinação das cartas (também da cartinha de /cartas) | `components/lob/inclinacao.ts` |
| A cena 3D (three.js, um canvas) | `components/stats/cena/` |
| Painel de bordo e porta da fornalha | `components/stats/painel.tsx`, `porta.tsx`, `camadas.module.css` |
| Holofote e modo VS (telas cheias em `<dialog>`) | `components/stats/holofote.tsx`, `versus.tsx`, `tela-cheia.tsx` |
| A visão em tabela | `components/stats/planilha.tsx` |
| Os sons (todos sintetizados) | `lib/stats/som-da-forja.ts` |
| Testes | `tests/stats/` (dados, regras de CSS, página como o servidor a entrega) |

### Onde ajustar

- **Cores, metal e fonte de um time**: `lib/temas/<slug>.ts` (vale para o site todo: página do
  time, show do sorteio e /stats). No modo VS, o par de cores sai de `candidatasDePalco`
  (`lib/series/identidade-do-time.ts`) pela distância perceptual (`coresDoConfronto`).
- **Cores da Forja** (ouro, bronze, brasa, teal) e **tamanhos de transmissão** (`--num-g`,
  `--rotulo`, `--texto`, `--traco`): o topo de `components/stats/forja.module.css`.
- **Volume**: `VOLUME_PADRAO` em `lib/stats/som-da-forja.ts` (0,55 de propósito: a narração vem
  por cima). Cada efeito tem o seu ganho no mesmo arquivo. O volume escolhido pela pessoa fica
  no `localStorage` (`lob-stats-volume`); ligado/desligado, no cookie `lob_stats_som`.
- **Intensidade do 3D**: `components/stats/cena/cena-da-forja.ts` — `NIVEIS` (DPR, bloom,
  brasas por degrau), `POSES` (onde e de que tamanho a peça fica em cada ato), o bloom em
  `aplicarNivel` (força, raio, limiar) e `CALOR_POR_GOLPE`/`RELEVO_POR_GOLPE` (o quanto cada
  martelada esfria e marca). Para travar um degrau num teste: `/stats?3d=alta|media|baixa`;
  `/stats?3d=0` desliga.
- **Faíscas de tela**: `provedor.tsx` (quantidade, força, espessura, `vida` e `apagaEm`).
- **Ritmo de cada ato**: os `data-marca` nos atos (em que ponto da rolagem cada peça bate) e o
  `--trilho` do ato no CSS (quantas telas de rolagem ele dura).
- **O que cada ato toca**: `data-som` no próprio elemento (`"estalo carta@180"`: o `@` é o
  atraso em ms).

## 8. O que mudou na implementação

- **O protagonista 3D é o próprio emblema**, recortado e fundido em relevo (altura, normal e um
  mapa de brasa tirados da imagem), e não uma moeda com o emblema cunhado. Sem bigorna, martelo
  nem chão na cena: viravam polígono solto. O canvas é transparente e compõe sobre o fundo da
  página. A peça acompanha a história inteira: derrete e leva as marteladas (I), troca de metal
  (II), é recunhada com cada escudo (III), esquenta com o molde que trinca (IV), pega a cor da
  rota que acende (V), é temperada com a régua (VIII) e termina fria (fecho).
- **O roteiro de rolagem vale de 1280×560 para cima** (o plano dizia 1024). Abaixo disso as oito
  pilhas da Liga e as linhas dos Canais não cabem sem cortar nome: a página corre em fluxo, com o
  desenho de tablet. A cena 3D só carrega onde há roteiro.
- **As Peças Raras** saem do molde numa esteira horizontal que corre com a rolagem.
- **Holofote e modo VS são `<dialog>` modais** (camada de cima do navegador): cobrem o cabeçalho
  do site, prendem o foco e fecham no Esc sem código próprio. A porta da fornalha é uma camada
  comum, porque precisa vir no HTML do servidor.
- **O painel de bordo é uma âncora `sticky` no fim da página.** No computador ela não tem altura
  (o trilho dos atos e os comandos se penduram nela, nas margens); no celular e no tablet é uma
  barra encaixada no pé da tela — som, VS, tabela, o ato em que a pessoa está e as setas de ato.
  Vai embora junto com a página: nunca cobre o rodapé do site.
- **No celular e no tablet**: a Liga deita (uma faixa por elo, com os nicks por extenso), a
  régua da Têmpera corre de lado, as cartas ocupam quase a tela, critérios e abas viram fileiras
  que correm de lado. Sem roteiro de rolagem e sem 3D; o conteúdo é o mesmo.
- **O monitor de desempenho mede por tempo de relógio** (janelas de 1,5 s), não por quadros.
- **A rota não tem `loading.tsx`.** Com ele, o Next entrega a página dentro de um bloco escondido
  que só um script revela: sem JavaScript sobraria o «carregando» para sempre. A /stats sai
  inteira no HTML, na ordem do documento (é o que faz a porta abrir por âncora).
- **No modo VS**, valor de draft e pontos de elenco ficam fora da luta (moeda de draft não é
  quesito), e nos times a metade direita da tela é o rota a rota.
- **A cartinha de /cartas** passou a usar o motor de inclinação compartilhado e ganhou foil.

### Verificação (20/11/2026)

- **Build, lint e typecheck**: `next build` passa; `tsc --noEmit` limpo; `eslint` limpo no
  repositório (o `npm run lint` local só acusa os scripts de `.sim/`, que não são versionados).
- **Testes**: a suíte inteira passa (274 arquivos, 3389 testes), 168 deles da /stats: dados,
  regras de CSS (nada de opacidade animada em conteúdo, nada de `translate:` solto, nenhum texto
  abaixo de 15px fora das telas pequenas) e a página como o servidor a entrega, em PT e em EN.
- **Console**: nenhum erro e nenhum aviso (de hidratação inclusive) no build de produção, em
  todos os percursos — página, porta, holofote, VS, tabela, celular, inglês. Com movimento
  reduzido, só no modo de desenvolvimento, o framer-motion escreve um aviso informativo.
- **Quadros por segundo** (`.sim/stats/fps.cjs`): build de produção, 1920×1080, Chromium com a
  placa de verdade (GeForce RTX 3050 de notebook, tela a 75 Hz), rolando cada ato por 5 s com a
  cena 3D no degrau «alta»:

  | Ato | qps médio | p95 | pior quadro |
  | --- | --- | --- | --- |
  | Fornalha | 74 | 13,5 ms | 67 ms |
  | Liga | 74 | 13,5 ms | 40 ms |
  | Moldes | 71 | 13,5 ms | 80 ms |
  | Peças Raras | 72 | 13,5 ms | 53 ms |
  | Canais | 73 | 13,5 ms | 53 ms |
  | Bigorna, Arsenal, Têmpera, Fecho | 75 | 13,5 ms | 13,8 ms |
  | Carta 3D com o ponteiro em cima | 75 | 13,5 ms | 13,5 ms |

  Os quadros lentos que sobram são da PRIMEIRA vez que um ato com muitas fotos entra na tela
  (ver «Limitações»).
- **Interações no computador** (`.sim/stats/interacoes.cjs`, 34 conferências no build): ← →
  viajam entre os atos, o trilho salta para qualquer ato, Espaço continua sendo do navegador, M
  liga e desliga o som e lembra no cookie; o holofote abre no clique, → passa para o vizinho,
  Esc fecha e o foco volta para quem abriu; o VS abre pelo botão e pelo endereço, monta a luta
  num clique a partir das próximas séries e limpa o endereço ao fechar; a porta aparece só na
  primeira visita; sem JavaScript o conteúdo aparece e a âncora tira a porta; a tabela funciona
  sem JavaScript.
- **Interações no celular** (`.sim/stats/interacoes-celular.cjs`, 18 conferências com toque): a
  barra encaixada no pé da tela com botões de 44px, as setas de ato, o som, o holofote abrindo
  no topo, a luta do VS cabendo na largura sem nome cortado, a porta com os dois botões à vista,
  a barra acima do rodapé no fim da página, e nenhuma rolagem lateral.
- **Texto cortado** (`.sim/stats/cortes.cjs` e `celular.cjs`): nenhuma reticência e nenhum
  elemento fora da tela em 320, 360, 390, 820, 1024, 1100, 1280, 1366, 1536, 1920 e 2560 px.
- **Prints** ato a ato em 1920×1080, 1280×720 e 390×844, com movimento reduzido e em inglês.
- **Duas rodadas de crítica de direção de arte**: a primeira minha; a segunda de um agente que
  só viu os prints (34 telas, 25 achados). O que procedia está nos commits
  `fix(stats): … rodada de crítica`; o que ficou de fora está logo abaixo.

## 9. Limitações conhecidas

- **Fotos dos jogadores são pesadas** (cerca de 7 MB somadas, sem miniaturas). Na primeira vez
  que os Moldes ou as Peças Raras entram na tela, decodificar as fotos custa alguns quadros.
  O conserto de verdade é gerar miniaturas no envio da foto; `next/image` resolveria, mas gasta
  a cota de otimização de imagem da Vercel.
- **A forja é mais forte nos atos I a V.** Do ranking em diante (Bigorna, Arsenal, Têmpera) o
  dado manda e a metáfora fica no acabamento — barra de metal, vergalhão, duotom de bronze. A
  crítica pediu cada dado como um objeto forjado; isso é redesenho de ato, não ajuste.
- **O emblema 3D é um relevo tirado da imagem**, não uma malha modelada: de perto, a borda da
  silhueta tem a resolução da textura (512px). Martelo e bigorna não existem na cena.
- **A cena 3D não roda** abaixo de 1280×560, com movimento reduzido, com economia de dados ou
  sem WebGL: fica o fundo 2D e o emblema em imagem. O conteúdo é o mesmo.
- **Não existe «modo transmissão»** (decisão do pedido: é a mesma página para todos). O
  cabeçalho do site e o painel de bordo aparecem no vídeo.
- **Os quatro números da abertura são os do pedido** (jogadores, pontos no pool, média por time,
  mono champions). A crítica preferia jogos e abates ali; eles estão na faixa logo abaixo.
- **O som precisa de um gesto.** Quem volta com o som ligado só ouve depois do primeiro clique
  ou tecla (regra dos navegadores); o painel avisa («CLIQUE PARA O SOM»).
- **View Transitions** (o rosto que vira a carta do holofote) só existem em navegadores
  recentes; nos outros o holofote abre direto.
- **Os números rolam do zero.** Quem para a rolagem no meio de uma cena vê, apagado, o zero de
  um número que ainda não foi cravado.
- **O modo VS compara totais**, não médias por jogo: quem jogou mais séries leva vantagem em
  abates e assistências.
- **Nick muito largo ainda leva reticências.** Os quarenta de hoje cabem; um nick de 16 letras
  maiúsculas e largas numa edição futura seria cortado no lingote (o toque ou o ponteiro mostra
  o nome inteiro).
- **O fps foi medido numa máquina só** (a de cima). Em placa integrada vale o monitor de
  desempenho, que baixa a qualidade sozinho e, no limite, desliga o 3D.
- **/tabela e /cartas ainda têm `loading.tsx`**: sem JavaScript elas mostram só o esqueleto.
  Era assim antes e ficou fora deste trabalho.

## 10. Próximas ideias

- Miniaturas das fotos geradas no envio (resolve a primeira limitação e alivia o celular).
- Cada dado do ranking em diante como objeto forjado: pódio em lingotes numerados, arsenal como
  peças na parede da oficina, moedas maiores na Têmpera.
- VS com médias por jogo e o confronto direto jogo a jogo (campeões, durações).
- Momentos do Hall da Fama (viradas, recordes) como um ato próprio.
- Um «modo narrador»: a mesma página com as viagens entre atos temporizadas, para o caster só
  falar.
- Emblema modelado em malha (chanfro de verdade), com martelo e bigorna.
- Levar a carta holográfica para /jogadores e /times.
