# Relatórios dos 5 implementadores (28/10/2026)

Cada tema foi implementado num worktree próprio, conferido no `next dev` e num `next build` local com os dados de produção, e commitado (um commit por tema, hoje em `tema/5-times-4a`). Abaixo, o que cada implementador devolveu. Os caminhos de prints (C:/Users/...) são da máquina local e não vieram junto.

Observação comum: nos worktrees, `leagueofbronze.json` tinha os dados de PRODUÇÃO, e por isso 5 arquivos de teste (paginas-4a, security/dataset-scopes, security/schema-limits, capitao-no-site, desempate-da-tabela — 49 testes) falharam LÁ. Com o arquivo versionado eles passam: na branch integrada a suíte inteira passou (2927 testes; só 2 testes do admin instáveis sob carga, que passam sozinhos).


## Fãs de Rosca Esporte Clube (`fas-de-rosca-esporte-clube`) — commit original dc2ca22

### O que ficou pronto
O tema «Dia de Braço» (cenário academia) está inteiro no branch tema/fas-de-rosca-esporte-clube, num commit só (dc2ca22), sem linha de coautoria. Foi feito a partir do código do designer, com os ajustes do juiz.

- **Herói.** Tem a parede de blocos, os basculantes (só a partir de 1024), os raios de sol e a poeira de magnésio. O relógio marca 6h em ponto. A fita métrica sai da trena no teto e a faixa de segurança rosa fica no pé.
- **Entrada.** A câmera endireita, a fita corre pelo teto e o magnésio estoura. O escudo faz a rosca direta (sobe em arco, treme segurando e dá um pump), o suor voa e o bíceps brilha.
- **Título.** FÃS DE ROSCA vem letra por letra, em massa de rosquinha com glacê e granulado, e as letras inflam em cascata. No computador fica na faixa «FÃS DE (escudo) ROSCA»; no celular fica empilhado, com FÃS DE em 0,58 do tamanho. Embaixo vem «esporte clube» em Kaushan, sobre a barrinha com duas anilhas de rosca que travam nas pontas.
- **Chips.** Etiquetas de academia: pontos em rosa com granulado, PERSONAL e OP.GG.
- **Elenco.** «SÓCIOS EM DIA» tem a fita métrica de sublinhado e o aviso do personal que cobra juros. Atrás fica o muro pintado «FOCO · FORÇA · FÉ / & ROSCA». São 5 crachás de sócio no gancho, que balançam ao entrar pela rolagem (com uma versão por relógio quando o navegador não tem `view()`). O capitão (vidotti agiota) é o PERSONAL: crachá black e halter de ouro balançando; no celular o crachá dele fica deitado.
- **Cartela.** O saco de pão kraft com a boca serrilhada e a mancha de gordura. Tem o adesivo TÁ PAGO (que cola pela rolagem), a data «QUENTINHO …» e o fecho «Contém glúten. E braço demais.».
- **Fichas dos 5.** Selfie no espelho de alumínio com as mãos de magnésio na parede e o flash da selfie. O nick é glaceado e infla na entrada. As estatísticas são uma pilha de placas que caem uma a uma, com o pino rosa entrando na primeira. Os PARCEIROS DE TREINO aparecem como crachás pequenos.
- **Arquivos.** Os textos pt/en estão em `lib/i18n/messages/temas/fas-de-rosca-esporte-clube.ts`. A métrica da Sofia Sans Extra Condensed foi para o meu bloco em `metricas.ts`. Os 13 keyframes de entrada estão no meu bloco do teste de opacidade. O teste novo é `tests/times/tema-fas-de-rosca-esporte-clube.test.tsx`, com 28 testes.

### Desvios do spec (e por quê)
- Juiz, J3 (nomes repetidos): renomeei faixaAbre para faixaAbreAcademia, haloNasce para haloAcademia e lascaVoa para lascaVoaAcademia. Para não colidir com os 4 temas feitos em paralelo, também troquei cinco nomes genéricos: barraCresce para barrinhaCresce, marcaAparece para marcaDeMagnesio, poeiraFlutua para poeiraDeMagnesio, ponteiroGira para ponteiroDosSegundos e fitaPuxa para trenaPuxa. O grep de nomes repetidos sai vazio.
- Juiz, J4 (laços): cortei a raiosRespiram. A POEIRA ficou com 6 grãos (x 8%, 35%, 58%, 74%, 90% e 14%), e no celular (até 599 px) só os 3 primeiros. Resultado no herói: 8 laços no computador e 5 no celular.
- Além do spec: escondi a poeira na ficha, com `.raiz:has([aria-labelledby="tm-nick"]) .enfPoeira { display: none }`. O palco é o mesmo da página e a ficha ficava com 9 laços (7 no celular), acima do teto de 4 do juiz. Agora tem 3: o ponteiro mais o halo e a varredura do retrato, que são da base.
- Tirei todo o 3D do cenário. camNivela, solNasce, poeiraDeMagnesio e trenaPuxa passaram de translate3d para translate 2D. O juiz aceitava 3D em enfeite sem texto, mas a fita tem números em SVG <text>; converti tudo por uniformidade, sem mudança visível.
- `.raiz .miolo { position: static }`: agora o crachá inteiro abre a ficha. No código do designer, a faixa de 18 px da fenda do cordão e a moldura de 7 px do plástico não eram clicáveis (49 de 81 pontos da grade em cada carta). Agora são 81 de 81. O link-da-carta continua verde, porque o miolo não está no caminho que ele confere.
- Escudo no celular: troquei `min(58vw, 34svh)` por `min(58vw, 30svh)`. Em 405×720, a medida do vídeo, o lema era cortado ao meio pela borda de baixo (703–739); agora fica em 680–716 e os chips começam em 728, inteiros abaixo da dobra. A mudança só pega celular baixo (405×720, 375×667); em 390×844, 360×780 e 414×896 o escudo não muda.
- Lema: troquei a subida do `.sobe` pelo keyframe novo `lemaPincela`, que entra de lado como pincel (translateX(-0,5em) skewX(-10deg) até nada, com a duração e a curva do `.sobe`). Com isso, no quadro 0 de 405×720 o lema já está inteiro na dobra; com os 14 px de subida, ele ficava meio para fora. Pus o nome na lista do meu bloco em temas-sem-opacidade.
- No meu bloco de metricas.ts, a constante passou a ser tipada `MetricasDaFonte`, sem o `| undefined`. A tabela é a do designer, sem mudança; 2,679 conferido no teste.
- O teste se chama tema-fas-de-rosca-esporte-clube.test.tsx (J2) e cresceu em relação ao do designer. Dados: elenco com os elos de produção e os 9 textos nos dois idiomas. Página: acento decomposto e os 5 focos. CSS: nada de 3D, a lista exata de laços (só enfeite, só transform/opacidade), poeira 6/3/0, o que some no movimento reduzido, as reservas da fonte batendo com fontes-dos-temas.ts e o miolo sem posição.

### Verificação medida
Tudo medido no repo, com o leagueofbronze.json de produção, no dev (porta 3111) e de novo no build (`next build` com Turbopack, porta 3121).

- **Estouro:** `scrollWidth == innerWidth` em 15 janelas, de 320×640 a 2560×1440, nos dois. O título inteiro fica dentro do herói em todas.
- **Fonte bloqueada (só a reserva Impact a 63%):** o título nunca corta (320, 390, 1024 e 1440 no build; mais 360, 768 e 1920 no dev). Na faixa do computador as metades encolhem e o escudo continua no vão.
- **Vão do escudo no computador** (onde termina FÃS DE / o escudo / onde começa ROSCA, em px):
  - 1024: 371 / 397–627 / 653;
  - 1280: 467 / 499–781 / 814;
  - 1440×810: 539 / 574–866 / 902;
  - 1920: 755 / 790–1130 / 1166.
- **1ª dobra do vídeo:** em 1440×810 nada é cortado (chips em 737–781). Em 405×720 nada é cortado no quadro 0 nem no fim (lema em 680–716, chips a partir de 728).
- **Quadro 0** (congelado desde o carregamento, com CDP `setPlaybackRate(0)`) **e quadro final:** legíveis em 1440×810, 1440×900, 405×720 e 390×844, com prints.
- **Movimento reduzido:** 0 animações na página e na ficha. Fica o pôster final, com as mãos a 0,26, o pino dentro e o flash escondido.
- **Laços infinitos:** na página, 9 no computador (8 do herói mais o halo do capitão) e 6 no celular (5 mais o halo). Na ficha, 3.
- **Clique das cartas:** grade de 9×9 pontos com `elementFromPoint` em 6 larguras (1440, 1024, 768, 390, 360, 320). Deu 81 de 81 no miolo, 81 de 81 na carta inteira e 81 de 81 na faixa de plástico de cima, no dev e no build. A única exceção são 9 pontos do canto de cima do 1º crachá em 1440, que caem fora da carta girada.
- **Fichas:** as 5 em 7 larguras (1440, 1024, 768, 600, 390, 360, 320):
  - nick em no máximo 2 linhas e nunca partido no meio da palavra;
  - retrato 4:5 com o foco de cada um;
  - os 4 parceiros e o voltar para o elenco;
  - sem estouro.
- **Contraste medido** (os pixels de verdade atrás das letras):
  - página: o menor é 4,6:1 (a data de 11 px no kraft); depois vêm créditos 4,8 e kicker 4,9; o resto vai de 5,0 a 17,4;
  - ficha: o menor é 5,1:1;
  - título: a massa contra o contorno de chocolate dá 5,1:1 (calculado).
- **Console:** sem erro nem aviso de hidratação no dev e no build. Os únicos erros são os do teste de propósito com a fonte bloqueada.
- **CSS minificado:** o build sai sem aviso. Os `translate:` e `rotate:` do cenário sobrevivem no CSS minificado, e não há translate3d no cenário nem raiosRespiram.
- **Em inglês** (1440 e 360): os 8 textos aparecem, sem estouro.
- **Resto do site:** /times, /jogadores, /tabela e /calendario abrem sem erro; a cor #FFA3C8 aparece em /times e /jogadores. RX, QM e GdB renderizam sem classes da academia.
- **Acessibilidade:** forced-colors e prefers-contrast: more conferidos em print. O anel de foco tem 2 px #FFD23F com afastamento de 4 px na casca, e a ordem do Tab é voltar, OP.GG e depois os crachás.

### Testes
- **vitest tests/times:** 7 arquivos, 195 testes, 0 falhas. O novo tema-fas-de-rosca-esporte-clube.test.tsx tem 28.
- **vitest suíte inteira:** 249 arquivos e 2753 testes; 2700 ok, 4 pulados, 49 falhas.
  - As 49 estão todas nos 5 arquivos que leem o leagueofbronze.json da raiz: paginas-4a 30, security/dataset-scopes 13, capitao-no-site 4, desempate-da-tabela 1, security/schema-limits 1.
  - O motivo: o worktree tem o JSON de produção (8 times, 4ª Edição) e os testes esperam o commitado (6 times, 3ª Edição). Nada vem do tema.
  - Na 1ª rodada, 3 testes do admin estouraram os 20 s com a máquina carregada; rodados sozinhos, passaram (18 de 18).
- **npx tsc --noEmit:** 0 erros.
- **npx eslint nos 7 arquivos .ts/.tsx do tema:** limpo.
- **Nomes de keyframe repetidos em components/times:** o grep sai vazio.

### Mudanças na base que ele sugeriu (NÃO feitas)
- `next.config.ts`: Acrescentar `agentRules: false`, ou pôr AGENTS.md e CLAUDE.md no .gitignore. — O `next dev` do Next 16.3 cria AGENTS.md e CLAUDE.md na raiz do worktree toda vez que sobe. Os arquivos ficam sem versão, e o AGENTS.md diz para commitá-los. Apaguei os dois antes do commit, mas os outros implementadores podem levá-los junto sem querer.
- `tests/paginas-4a.test.tsx, tests/security/dataset-scopes.test.ts, tests/security/schema-limits.test.ts, tests/capitao-no-site.test.ts, tests/desempate-da-tabela.test.ts`: Ler um fixture versionado (por exemplo tests/fixtures/terceira-edicao.json) em vez do leagueofbronze.json da raiz. — Nos worktrees, o leagueofbronze.json é o de produção (8 times, 4ª Edição, marcado skip-worktree), e esses 5 arquivos esperam o commitado (6 times, 3ª Edição). Dá 49 falhas na suíte inteira que não têm nada a ver com os temas.

### Pendências
- Vídeo do celular (405×720): grave a ficha do vidotti-agiota, que é a única das 5 sem nada cortado na 1ª dobra. Na do D1elzera, o nick fica cortado ao meio pela borda de baixo (689–782); nas do Tapa, do OmegaFuria e do SaborEnergetico também. No vídeo do computador (1440×810) use o D1elzera: o dele, o do OmegaFuria e o do SaborEnergetico não têm nada cortado. O do vidotti e o do Tapa, com nick de 2 linhas, têm o retrato cortado embaixo. Comandos: `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador fas-de-rosca-pc.mp4 fas-de-rosca-esporte-clube d1elzera` e `node .sim/video-tema.cjs https://www.leagueofbronze.xyz celular fas-de-rosca-cel.mp4 fas-de-rosca-esporte-clube vidotti-agiota`.
- Conferi só no Chromium. Falta ver no Safari/iPhone (`:has`, `background-clip: text` com escala 2D, `view()`) e no Firefox (sem `view()`, os crachás balançam pelo relógio), além dos 60 fps num celular de verdade.
- Foto do SaborEnergetico: é a mais fraca (768×984, ampliada de uma original de 256 px) e fica macia no espelho da ficha, com 300 a 410 px. Não mexi em nenhuma imagem; se ele mandar outra, ela precisa do tratamento de sempre (.sim/fotos-tratar.cjs).
- Depois de juntar com os outros 4 temas, rode de novo `grep -rhoE "@keyframes +[A-Za-z0-9_-]+" components/times --include=*.module.css | sort | uniq -d` e o teste de nomes repetidos. Hoje nenhum dos meus nomes aparece nos specs nem nos worktrees dos outros.
- Contraste: a data no saco (11 px, cor do kraft escuro sobre o kraft) mede 4,6:1. Passa, mas está perto do limite de 4,5.
- Servidores: parei os dois (as portas 3111 e 3121 estão livres e não sobrou nenhum processo do worktree). O next.config.ts foi desfeito (`git checkout`). Apaguei o AGENTS.md e o CLAUDE.md que o `next dev` criou. A pasta .next do worktree ficou com o build de produção, que não é versionado. Não fiz push, merge nem rebase.


## Os 5 Furiosos (`os-5-furiosos`) — commit original 12b78c3

### O que ficou pronto
Tema inteiro do OS 5 FURIOSOS, «A Figurinha Brilhante» (cenário album), commitado no branch tema/os-5-furiosos. Os 9 arquivos do commit são só meus: lib/temas/os-5-furiosos.ts, lib/i18n/messages/temas/os-5-furiosos.ts, components/times/cenarios/album.tsx, ornamentos-album.tsx, album.module.css, album-ficha.module.css, tests/times/tema-os-5-furiosos.test.tsx e os meus blocos em lib/temas/metricas.ts e tests/times/temas-sem-opacidade.test.ts.

DADOS: paleta e metal do spec. Cor do time #E27CFE (J1). Prefixo "OS 5", letra por letra. Lilita One + Baloo 2. 9 textos em pt e en. Foco de cada uma das 5 fotos. A tabela LILITA_ONE medida pelo designer está em metricas.ts (FURIOSOS = 5,353 em).

CENA (palco): página impressa roxa com raios atrás da figurinha, retícula, «5F» gigante só de contorno, abajur e a folha anterior que vira em 3D (é a única peça 3D, um enfeite). Moldura: o picote em cima e a fita holográfica embaixo.

ENTRADA:
- 0–1 s: a folha vira e a tira do pacotinho rasga.
- 825 ms: a foto do time desce da mão e cola torta na vaga impressa, com bafo, estouro de 6 estrelas e a faixa arco-íris. Atrás dela, o pacotinho aberto com os versos.
- 980 ms: o selo lima «OS 5» bate.
- 1050–1540 ms: as 8 letras-adesivo de FURIOSOS batem em cascata.
- 1720 ms: o balão «Tem um gosto meio roxo!» pula; depois sobem os chips.

TÍTULO: selo de vinil lima girado −7° com dois brilhinhos. FURIOSOS em adesivos de vinil roxo com recorte creme e giros estáticos.

ELENCO: figurinhas 5F 2–6 com a vaga impressa por trás; elas colam pela rolagem (view()) ou pelo relógio quando não há suporte. O capitão é a BRILHANTE: cone holográfico girando e selo-estrela de 16 pontas; no celular a carta dele fica deitada.

CARTELA: pacotinho serrilhado com rótulo e brilho, e o selo SABOR MEIO ROXO carimbado pela rolagem.

FICHA DOS 5: o retrato é a figurinha ampliada em 4:5, colada na vaga, com duas repetidas atrás. Nick em adesivo grande, no máximo 2 linhas. Estatísticas em adesivos, companheiros em mini-figurinhas. O capitão tem o cone e o selo.

AJUSTES DO JUIZ:
- J1: cor #E27CFE.
- J3: haloNasce→haloAlbum, pisca→piscaAlbum.
- J4: translate3d→translate em todos os keyframes de conteúdo.
- J5: 2 brilhos; cortados haloDoAlbum, fitaCorre, o laço do brilho do selo e holoPassa. Ficam 8 laços na página.
- J6: o «OS 5» continua adesivo.
- J7: medidas refeitas no repo.

No fim: next.config.ts desfeito, servidores parados, worktree limpo.

### Desvios do spec (e por quê)
- Renomeei mais keyframes do que o J3 pede. Pela regra §2 do juiz (nomes genéricos «faixa…/brilho…» levam o prefixo do cenário; há 4 temas sendo feitos em paralelo): estoura→estouraAlbum, aroGira→aroGiraAlbum (página e capitão), faixaPassa→faixaPassaAlbum, brilhoDoSelo→brilhoDoSeloAlbum, seloGira→seloGiraAlbum, aroGiraFicha→aroGiraAlbumFicha e seloGiraFicha→seloGiraAlbumFicha. A lista do meu bloco no teste de opacidade usa os nomes finais. O grep de repetidos sai vazio.
- Serrilhado do pacotinho da cartela: no Anexo C o conic-gradient da máscara deixava o ladrilho inteiro opaco e a borda saía reta, também no harness do designer. Corrigi a cunha opaca para apontar para dentro do ladrilho, e o teste novo confere.
- Como agora os dentes existem, o selo SABOR MEIO ROXO desceu 2 px (top 14 px no computador, 12 no celular), para os vãos do serrilhado não morderem o aro creme.
- Chips do herói: margin-top de 36 px até 599 px e de 28 px de 600 a 899. Em 405×720 (vídeo do celular) o 1º chip saía cortado ao meio pela dobra (ia de 705 a 749, com a dobra em 720) — já acontecia na geometria do spec. Agora a dobra mostra figurinha, nome e balão, e os chips ficam inteiros abaixo. Também resolve o rabinho do balão, que encostava no chip.
- Quadro 0 do herói: abaixo de 900 px a figurinha ficou a 0,11E do topo (era 0,08E). Girada na mão, ela passava a 1–3 px do «voltar» e encostava nele em 320; agora sobram 6 px ou mais.
- Quadro 0 da ficha: colaRetrato começa em translate(−6px, −26px) em vez de −18 px. O canto girado do retrato saía 1–3 px da tela em 390–430 e em 1024; agora sobram 9 px ou mais. Giro e escala ficaram iguais.
- Os créditos (nomesDoElenco) ganharam text-wrap: balance: em ~1024 a 2ª linha levava só «CALDINHO».
- Sem o fitaCorre (J5), o ::before da fita holográfica deixou de ter 200% de largura (passou a inset: 0). Os brilhinhos do selo usam a mesma animação de 6 s, sem infinite (J5): pico aos 1,6 s; parados ficam em scale 0, inclusive no movimento reduzido.
- O teste novo vai além da lista do spec. Ele também confere o CSS: 2D nos keyframes de conteúdo, os laços infinitos permitidos, o serrilhado, a reserva de 66% e o font-kerning: none. No corDoTime ele espera #E27CFE (J1), não o #D98BFF do spec.

### Verificação medida
Tudo medido no dev (3112) e no build de produção (3122). Quadro 0 congelado desde o carregamento (CDP Animation.setPlaybackRate 0).

ESTOURO HORIZONTAL: zero na página, em 2560, 1920, 1440×810, 1440×900, 1366, 1280, 1024, 768, 600, 430, 414, 405, 390, 375, 360 e 320. Zero também nas 5 fichas, em 1440, 1024, 768, 600, 390, 360 e 320.

TÍTULO:
- No fim, a tinta do FURIOSOS fica dentro da coluna em todas as larguras: 1440: 104–733 em 104–770; 390: 21–359 em 16–374; 320: 19–293 em 16–304.
- No quadro 0 ela entra até 8 px na margem do contêiner, sempre dentro da tela.
- Selo «OS 5» × letras: 0 px de tinta em comum, no quadro 0 e no fim, de 320 a 2560.

DOBRAS DO VÍDEO: em 1440×810 e 405×720 nenhum componente cortado, no quadro 0 nem no fim (antes da correção o 1º chip era cortado em 405×720).

QUADRO 0:
- Figurinha a 6 px ou mais do «voltar» (320–899).
- Retrato da ficha a 9 px ou mais da borda.
- Nick da ficha a 2 px ou mais da borda (9 ou mais no fim).
- Repetidas a 12 px ou mais.
- A folha mora no palco, atrás do conteúdo.

CARTAS: 48/48 pontos (grade 6×8 de elementFromPoint) nas 5 cartas, em 11 larguras de 1920 a 320, no dev e no build. Cliques de verdade na foto, na faixa do nome e no «FICHA →» abrem a ficha certa. Nenhuma carta encosta na outra.

FICHAS (5 jogadores × 7 larguras × quadro 0 e fim):
- Nick em no máximo 2 linhas e nunca partido no meio da palavra (Satoshi em 1 linha).
- Nenhuma sobreposição kicker×nick, nick×chips ou título×estatísticas.
- 4 companheiros; voltar → /times/os-5-furiosos; selo do capitão na tela; foco das fotos aplicado.

MOVIMENTO REDUZIDO: 0 animações na página e nas fichas; folha em display:none; 11/11 enfeites de movimento escondidos; pôster final aceso.

LAÇOS INFINITOS RODANDO (build): herói 4 (no computador e no celular), elenco 3, cartela 1 — total 8. Ficha do capitão 4; as outras fichas 2.

CONTRASTE medido no pixel (texto escondido, fundo real atrás dele, pior caso):
- Mínimo 5,7:1: o nick do capitão na faixa roxa.
- Todo o resto 6,7:1 ou mais, inclusive os rótulos pequenos (6,8:1 ou mais).

FONTE BLOQUEADA: a reserva «Lilita One Caixa Alta» cabe de 320 a 1440 (título na coluna, nicks sem vazar).

CONSOLE: sem erro, aviso ou erro de hidratação em 10 rotas (página do tema, 5 fichas, /times, /jogadores, /tabela, /calendario), em 1440 e 390, no dev e no build.

COR DO TIME: #E27CFE aparece em /times e /jogadores. Em /tabela e /calendario nenhuma cor de time é pintada hoje (nem a da RX nem a dos Galácticos).

WEBKIT 26.4 E FIREFOX 139 (build):
- A folha some depois de 90° (a partir de 1000 ms).
- As letras e o nick têm tinta, inclusive o roxo do vinil (o background-clip), em todos os quadros.
- No Firefox (sem view()) as cartas entram pelo relógio e terminam paradas e clicáveis.

BUILD DE PRODUÇÃO: next build ok (todas as rotas ƒ). O serrilhado se mantém no CSS minificado.

COMPARAÇÃO COM O SITE NO AR (.sim/comparar-paginas.cjs, site no ar × meu build):
- RX e Queijo Minas: 0,000% de diferença em 1440, 1024, 390 e 360.
- Galácticos: 0,000%, menos 0,133% no herói em 1024, só dentro da imagem do escudo. Deve ser reamostragem/subpixel da imagem: nenhum seletor do álbum alcança o boteco.

### Testes
tests/times: 7 arquivos, 194 testes verdes. São 27 novos em tests/times/tema-os-5-furiosos.test.tsx; temas-sem-opacidade, link-da-carta e css-do-build passam com os módulos novos.

O teste novo pega a regressão: voltei o translate3d no bafo, a cor #D98BFF e o laço do brilho do selo, e falharam exatamente os 3 testes certos. Os arquivos foram restaurados.

Suíte inteira (npx vitest run): 2752 testes, 2699 verdes, 49 falhas, 4 pulados. As 49 falhas estão em 5 arquivos fora do tema (capitao-no-site, desempate-da-tabela, paginas-4a, security/dataset-scopes, security/schema-limits). Todos leem o leagueofbronze.json do disco, que no worktree é o de produção (8 times; o do repo tem 6). Com as minhas mudanças em stash, os mesmos 5 arquivos dão as mesmas 49 falhas (49 de 124).

npx tsc --noEmit: 0 erros.

npx eslint nos 7 arquivos .ts/.tsx do tema: 0 problemas.

grep de @keyframes repetidos em components/times: vazio.

### Mudanças na base que ele sugeriu (NÃO feitas)
- `tests/capitao-no-site.test.ts, tests/desempate-da-tabela.test.ts, tests/paginas-4a.test.tsx, tests/security/dataset-scopes.test.ts, tests/security/schema-limits.test.ts`: Ler um fixture versionado (por exemplo tests/fixtures ou o conteúdo de HEAD:leagueofbronze.json) em vez do leagueofbronze.json do disco. — Nos worktrees, o leagueofbronze.json é o de produção (8 times, 40 jogadores, 28 séries) e está marcado skip-worktree. Esses 5 arquivos supõem o dataset da 3ª (6/30/16) e dão 49 falhas, iguais com e sem o tema (conferido com as mudanças em stash).
- `next.config.ts`: agentRules: false — O next dev 16.3 cria AGENTS.md e CLAUDE.md sem versionar em cada worktree onde roda; os meus eu apaguei depois de usar. Os outros 4 implementadores vão ganhar os mesmos arquivos.
- `components/times/pagina-do-time-com-tema.tsx`: Nos créditos (nomesDoElenco), juntar as palavras de cada nick com espaço inseparável (U+00A0) e só depois juntar os nicks com « · ». — Do jeito atual a linha pode quebrar no meio de um nick («PEIDEI / CALDINHO» em ~1024). No tema eu só amenizei com text-wrap: balance.

### Pendências
- O vídeo para o grupo (.sim/video-tema.cjs, computador e celular, com o Peidei) só pode ser gravado depois do merge e do deploy; não é este passo.
- O Safari foi conferido no WebKit 26.4 do Playwright, não num iPhone de verdade. O Playwright do cache espera outra revisão de navegador e não baixei nada: usei o WebKit e o Firefox já instalados. Para rodar no localhost, só no teste, tirei o cabeçalho CSP do documento: o upgrade-insecure-requests do site faz o WebKit pedir https://localhost.
- Fora do tema: /tabela e /calendario hoje não pintam a cor de nenhum time. O #E27CFE só aparece em /times e /jogadores. Se a ideia era ver a cor também ali, isso fica com a base.
- Fora do tema: na suíte inteira, 49 testes em 5 arquivos falham por causa do dataset de produção do worktree (mudança sugerida na base).
- Os 2 arquivos gerados pelo next dev (AGENTS.md e CLAUDE.md, sem versionar) foram apagados. A pasta .next do build continua no worktree (está no .gitignore).


## So ADC Bronze Clube (`so-adc-bronze-clube`) — commit original 90f6cd8

### O que ficou pronto
O tema SO ADC BRONZE CLUBE «A Mosca Intacta» (cenário «estande») está inteiro e commitado no branch tema/so-adc-bronze-clube do worktree C:\LeagueOfBronze-tema-soadc, sem nenhuma linha de coautoria.

- Herói: céu da hora azul com nuvens, serra e mata, a rajada de flechinhas no alto e a linha de tiro embaixo. O NOME fica em cima: «So» em Yellowtail coral sobre o ADC de letreiro em Alfa Slab One com extrusão de cobre, e BRONZE CLUBE sobre a flecha do nome. O ALVO de palha fica embaixo, com o escudo no lugar da mosca. A partir de 1024 px aparecem as raias vizinhas e a biruta.
- Entrada: a corda é puxada e solta aos 544 ms, com o tranco da câmera. A flecha do nome crava; A1 crava no anel branco e A2 na palha, com furo e lascas. A3 crava na mosca do alvo vizinho; abaixo de 1024 px ela passa reto. A mosca do clube brilha e o último raio de sol corre letra a letra.
- Chips: placas em seta (pontos, ARQUEIRO-CHEFE · Famoso Parrudao, OP.GG).
- Elenco «A ALJAVA»: as cartas são flechas fincadas no gramado, entrando por rolagem com fallback de relógio. O capitão (Famoso Parrudao) vem por último, com os louros e a flecha de ouro; no celular ele ocupa a largura toda, com foto 4:3.
- Cartela: placa de bronze com louros, as duas pontas da fita cortada, o «MMR: ???» e o fecho.
- Fichas dos 5: foto oficial do sócio em passe-partout com as duas flechas cruzadas atrás. O nick leva o tiro e fica em até 2 linhas. A súmula vem presa na prancheta e os companheiros «AS OUTRAS FLECHAS» viram flechas.
- Dados: lib/temas/so-adc-bronze-clube.ts com cor #FF6A55 e fotos com foco por jogador. A foto do bobbie goods fica inteira (4:3) na ficha e mostra as duas pessoas na carta, e nenhum texto fala dela.
- Textos pt/en ficaram em lib/i18n/messages/temas/so-adc-bronze-clube.ts. A métrica ALFA_SLAB_ONE (a do designer, conferida de novo no navegador) e os 8 keyframes de entrada ficaram só entre os marcadores do meu bloco.
- Teste novo: tests/times/tema-so-adc-bronze-clube.test.tsx, com 32 casos.

### Desvios do spec (e por quê)
- J1: a cor do time #FF6A55 entrou só em tema.cor e no teste (fixtures teamColor/color também). O coral da cena (neon, --coral, penas, «So», fita) continua #FF6B7A; o teste confere isso e confere que #ff6a55 não aparece no CSS do cenário.
- J3: o keyframe lascaVoa virou lascaVoaEstande. O grep de keyframes repetidos em components/times sai vazio, e nenhum dos meus nomes aparece nas especificações e protótipos dos outros 4 times.
- Carta clicável: com o código do designer, só 63 de 99 pontos de cada carta abriam a ficha; as listras de 16 px no alto e a moldura de cedro de 4 px não abriam. Pus `.raiz .miolo { position: static }`, e o ::after do link agora se mede pela .carta. Resultado: 99/99 em 6 larguras, no dev e no build.
- Fallback sem subgrid: a partir de 900 px a base põe o escudo numa 2ª coluna, e a raia vizinha e a biruta caíam atrás do título e dos créditos. Pus antes do @supports uma regra que deixa alvo e nome numa coluna só (alvo em cima, nome embaixo). Com subgrid nada muda.
- Companheiros na ficha: em 1024 px, PARRUDAO e PRESUNTO vazavam pela ponta da flecha nas 4 colunas da base. De 900 a 1199 px ficam agora em 2 colunas.
- Contraste do nick nas cartas: com o véu do designer (escuro só a partir de 50%), o pior ponto era 4,7:1 em 1440 px e 3,2:1 no capitão em 390 px, sobre o rosto claro. O véu agora começa em 42% (e mais cedo na carta larga do capitão no celular). O pior ponto subiu para 8,9:1 (em 1024 px).
- Orçamento de laços da ficha (no máximo 4, pelo juiz.md): a ficha rodava 5 no computador (3 nuvens, mais o halo e o reflexo da base). Agora a ficha mostra 2 nuvens: as nuvens levam também a classe do módulo da ficha.
- Título da seção que quebra no celular: «AS OUTRAS FLECHAS» perdia a flecha do fio em 390 px. Agora a flecha desce para a linha de baixo (flex-wrap no .estrelando, e o ::after com flex: 1 1 64px).
- Os comentários de código sobre a foto do bobbie goods ficaram neutros; nenhum texto da página fala dela.
- Removi AGENTS.md e CLAUDE.md, que o `next dev` gerou sozinho no worktree. Eram artefatos meus, não versionados; o worktree ficou limpo.

### Verificação medida
Medido no dev (porta 3113) e de novo no build de produção (next build com o turbopack.root temporário, depois next start na porta 3123). Os números foram idênticos nos dois.

- Estouro horizontal: zero em 15 tamanhos, de 320x640 a 2560x1440 (incluindo 1440x810 e 405x720). O título fica inteiro dentro do herói e da tela no quadro 0 e no fim.
- Dobra do vídeo: em 1440x810 e 405x720 nenhum componente do herói é cortado ao meio. Em 390, 414 e 600 px o lema começa na borda de baixo, e em 320x640 o escudo passa 2 px da dobra; isso não é a medida do vídeo.
- Quadro 0: congelado desde o carregamento (CDP Animation.setPlaybackRate 0). Pôster legível, sem flechas nem rajada; o quadro final tem tudo cravado.
- Clique das cartas: grade de 99 pontos com elementFromPoint, girada junto com a carta. 99/99 nas 5 cartas em 1440, 1024, 768, 390, 360 e 320, no dev e no build. Clique de verdade na foto e no rodapé leva à ficha certa.
- Fichas: 5 jogadores em 11 larguras no build (55/55 OK). Nick em no máximo 2 linhas, nunca partido no meio, dentro da coluna. Retrato com o foco certo; a do bobbie em 4:3. Companheiros sem vazamento e o voltar funciona.
- Movimento reduzido: 0 animações rodando na página e nas fichas; lascas, brilho e a flecha que passa reto ficam escondidos e sobra o pôster final.
- Laços infinitos: página com 6 no computador (5 no herói) e 4 no celular; ficha com 4.
- Contraste medido nos pixels, no build: todo texto ≥ 6,2:1 no pior ponto. Exemplos: nick das cartas 8,9:1, FICHA → 6,8:1, MMR 6,2:1, apoio 10,6:1. O ADC fica 16,2:1 contra o contorno; contra o cobre da extrusão que fica escondida atrás da face dá 3,7:1, acima dos 3:1 exigidos para título grande.
- Fonte bloqueada (reserva Arial a 88%): título e nicks cabem em 320, 390, 1024 e 1440. A métrica medida no navegador bate com a tabela (ADC 2,332, PARRUDAO 6,327, W 1,207).
- Simulações no build: sem subgrid, a ordem fica legível em 4 larguras; sem view(), as cartas entram pelo relógio e as fitas ficam paradas. O CSS minificado mantém o @supports(subgrid), o :has([style*=--proporcao]), o @font-face da reserva e o miolo static.
- Outros temas: RX, Queijo Minas e Galácticos ficaram pixel a pixel iguais à produção (0,000% de diferença).
- Inglês renderiza com os 9 textos. A cor #FF6A55 aparece em /times e /jogadores; /tabela e /calendario mostram o time, mas não pintam o nome com a cor de nenhum time.
- Console sem erro e sem aviso de hidratação em todas as páginas medidas.
- Os dois servidores foram parados (taskkill da árvore) e nenhum processo do worktree ficou rodando. O next.config.ts foi desfeito com git checkout.

### Testes
- `npx vitest run tests/times`: 7 arquivos, 190/190 verdes. O tema-so-adc-bronze-clube.test.tsx tem 32 casos, sendo 4 novos sobre as correções feitas no navegador; com cada correção revertida, esses 4 falham.
- Suíte inteira (`npx vitest run`): 249 arquivos, 244 verdes e 5 vermelhos; 2.748 testes, sendo 2.695 verdes, 49 vermelhos e 4 pulados.
- Os 5 vermelhos são paginas-4a, security/dataset-scopes, capitao-no-site, security/schema-limits e desempate-da-tabela. Todos leem leagueofbronze.json da raiz, que neste worktree tem os dados de produção, e esperam o dataset da 3ª Edição. Rodando com uma cópia do dataset commitado, 4 desses arquivos passam inteiros; o desempate-da-tabela lê o arquivo pelo caminho do próprio teste, então não deu para conferir com a cópia. Nenhum desses testes importa o tema.
- `npx tsc --noEmit`: 0 erros.
- `npx eslint` nos 7 arquivos de código e teste do tema: limpo.
- grep de @keyframes repetidos em components/times: vazio.

### Mudanças na base que ele sugeriu (NÃO feitas)
- `next.config.ts`: `agentRules: false`, se a opção existir nesta versão do Next — O `next dev` do Next 16.3 cria AGENTS.md e CLAUDE.md na raiz de cada worktree a cada vez que sobe; é sujeira que pode acabar entrando num commit de outro implementador.
- `components/times/ficha.module.css`: Os companheiros só irem para 4 colunas a partir de ~1200 px, ou o nick deles ganhar uma largura medida, como o nick da ficha (--largura-nick-em) — Com nicks largos numa fonte pesada, 4 colunas entre 900 e 1199 px deixam ~90 px de texto e o nick vaza. Resolvi no meu módulo, mas os outros temas podem cair no mesmo problema.
- `tests/security/dataset-scopes.test.ts, tests/paginas-4a.test.tsx, tests/capitao-no-site.test.ts, tests/security/schema-limits.test.ts, tests/desempate-da-tabela.test.ts`: Ler o dataset da 3ª Edição de um arquivo de fixture próprio, e não do leagueofbronze.json da raiz — Nos worktrees o leagueofbronze.json tem os dados de produção (skip-worktree) e esses 5 arquivos falham sem nenhuma relação com o tema. Com o dataset commitado, 4 deles passam; o desempate-da-tabela lê o arquivo pelo caminho do próprio teste, então não deu para conferir com a cópia.

### Pendências
- Safari/WebKit e Firefox de verdade não foram testados: o WebKit e o Firefox instalados no ms-playwright (webkit-2182, firefox-1488) não batem com a versão do Playwright (pede webkit-2359 e firefox-1543), e baixar os navegadores exige permissão. O comportamento sem subgrid e sem view() foi simulado no Chromium. Vale abrir num iPhone depois do deploy (background-clip:text com o skewX da corda).
- O vídeo (node .sim/video-tema.cjs ... so-adc-bronze-clube famoso-parrudao, computador e celular) fica para depois do deploy, gravado de produção e com o capitão, como o juiz pediu.
- Quando a foto do bobbie goods mudar, basta apagar as linhas "bobbie-goods" de fotos.foco e de fotos.proporcao em lib/temas/so-adc-bronze-clube.ts (ou medir a foto nova) e ajustar o teste que espera --foco:52% 50% e --proporcao:4 / 3.
- Os 5 arquivos de teste que leem o leagueofbronze.json da raiz falham neste worktree (dados de produção), sem relação com o tema; ver mudancasNaBaseDesejadas.
- O branch não foi juntado (nem push, merge ou rebase), como pedido: o merge com os outros 4 temas fica para o fim.


## Os 5 Sem Ping (`os-5-sem-ping`) — commit original 9461267

### O que ficou pronto
O tema «A Call que Nunca Cai» está inteiro, no commit 9461267 do branch tema/os-5-sem-ping, com só os meus 9 arquivos e nenhuma linha de coautoria.

**Herói (a câmera do anfitrião):**
- Fundo com 7 câmeras desfocadas que derivam.
- A janela da call com o anel de quem fala (conecta aos 950 ms e depois "fala" a cada 10 s).
- O status (rodinha, ✓, contagem 999 → 734 → 999 → 0 ms por @property + counter(), 5 barras).
- Os controles (microfone, câmera, tela e o botão vermelho de desligar).
- O leque de Wi-Fi saindo da origem do Wi-Fi do escudo.
- O halo verde, a luz rosa e os 2 fantasmas do lag.
- Os óculos pixelados «deal with it», que caem no poro e ficam, e o ✦ na lente.

**A entrada:**
- O escudo trava em degraus (travaEscudo).
- As letras chegam como pacotes fora de ordem (pacoteDaCall).
- O «OS 5» encaixa (seloConecta).
- O lema e os chips chegam como notificação.
- A câmera da página dá uma travada (cameraTrava).

**Título:** SEM / PING em Unbounded 800, num adesivo de gel (traço branco de 0,08 em, anel escuro e line-height 0,91). O «OS 5» é texto de interface sem cápsula: 5 barras + Sora 800 rosa, alinhado à tinta do S. O lema é um balão de chat; os chips são pílulas.

**Elenco «CÂMERAS LIGADAS»:**
- Cartas-câmera com borda de vidro e pílula de nick com microfone.
- Anel de quem fala no hover; entrada por rolagem com fallback pelo relógio; malha de pontos atrás.
- O capitão é o ADM DA CALL: borda verde, anel falando sem parar, óculos que caem na carta, placa verde.

**Cartela:** «chamada encerrada» com o fone vermelho, ★★★★★ acendendo pela rolagem, linha de terminal com cursor e o adesivo «999 ms? Nunca nem vi.» com lang pt-BR.

**Ficha (a câmera fixada):**
- A mesma janela, o retrato com o anel sempre falando e 2 arcos de sinal saindo de cima.
- O nick no mesmo gel, que conecta com trancos.
- Painéis de estatística com o gráfico de ping reto.
- «NA MESMA CALL», com os óculos do ADM caindo pelo relógio.

**Dados e textos:**
- Cor #3DFF8F e prefixo OS 5.
- Foco das fotos por jogador, e proporção 1:1 para o GOOM GUM.
- 9 textos em pt e en.

**Métrica:** a Unbounded 800 foi MEDIDA com o woff2 variável que o next/font serve na página. Dá PING 3,14 em, W 1,375 e padrao 1,4. A reserva «Sem Ping Reserva» (Arial Bold a 85%, peso 100–900) foi conferida: a pior razão é o `_` com 1,154, que a 85% vira 0,981.

**Arquivos:**
- lib/temas/os-5-sem-ping.ts
- lib/i18n/messages/temas/os-5-sem-ping.ts
- o bloco UNBOUNDED de lib/temas/metricas.ts
- components/times/cenarios/chamada.tsx, ornamentos-chamada.tsx, chamada.module.css (1.758 linhas) e chamada-ficha.module.css (345)
- tests/times/tema-os-5-sem-ping.test.tsx (26 testes)
- o meu bloco de keyframes em tests/times/temas-sem-opacidade.test.ts

### Desvios do spec (e por quê)
- Pacotes das letras: animo o eco e o cromo de cada letra, e não a .letra como no spec. Com a letra animada ela vira contexto de empilhamento e o contorno branco de uma letra passaria por cima da face da vizinha durante a entrada; assim todos os ecos (z −1) ficam atrás de todos os cromos o tempo todo.
- Anel de quem fala nas cartas: em repouso fica em scale(0.85), não 0,97. Com inset −4px, a 0,97 o anel e o brilho sobravam para fora da carta (medido de 139 a 232 px de largura).
- O 4º arco do leque só aparece a partir de 1024 px (o spec só o tirava abaixo de 600). Entre 600 e 1023 o escudo encosta na direita e o arco de fora passava da borda da janela.
- Margem de cima do escudo a partir de 1024: max(0,38E, 0,68E − 62px − clamp(14px, 2,4vw, 30px)). Com o escudo de 420 px (1920 e 2560) o ápice do 4º arco ficava 17 px acima da janela; agora sobram de 13 a 17 px em todas as larguras.
- Escudo no celular: clamp(176px, min(56vw, 28svh), 250px) (o spec usava 31svh). O 28svh só pesa em tela baixa. Em 405×720 (o quadro do vídeo) o balão do lema cabe inteiro e os chips ficam inteiros abaixo da dobra; com 31svh o lema era cortado (704–741).
- Notificação no celular vem de 8 px abaixo (spec: 16) e o respiro mínimo do lema é 12 px (spec: 14). Assim, em 405×720, o lema não cruza a dobra nem no quadro 0 (fica em 680–718).
- Altura mínima do herói com 152 px em vez de 154: o cabeçalho do site mede 70 px, não 72. Em 1440×810 a janela termina exatamente na dobra.
- Marca deslocada 0,1 em para a direita (margin-left): com o título alinhado à esquerda, o contorno do adesivo (0,105 em) saía da coluna e encostava no anel da janela no celular. A sobra de 0,34 em da métrica paga os dois lados. A linha do «OS 5» ficou com margem de 0,09 × tam para alinhar à tinta branca do S.
- «OS 5» entra de −6 px abaixo de 1024 (spec: −14), porque no celular o conteúdo fica a 8 px do anel da janela. Na 1ª palavra, o S e o M sobem menos no quadro 0 (−0,05 e −0,04 em, contra −0,12 e −0,07) para não encostarem na linha do «OS 5».
- O gradiente do gel repete por linha (background-size: 100% 0,91em, repeat-y, posição 0 0,16em). Assim cada linha do nick da ficha (N4FIRIDA / AGIOTA, GOOM / GUM) ganha o mesmo gel das letras do título.
- «CÂMERAS LIGADAS» usa clamp(19px, 5,4vw, 34px) (o juiz pediu clamp(22px, 2,6vw, 34px)): com isso cabe numa linha de 320 a 2560; com o valor do juiz quebrava em 320.
- Rodapé das câmeras: quando a carta tem até 215 px (container query), o nome vai em cima e o «FICHA →» embaixo. Sem isso o nome saía como «N4firida agi…». O microfone só sai da pílula nas cartas de 2 colunas abaixo de 400 px; a carta deitada do capitão continua com ele.
- Ficha, retrato: 440 px no máximo (spec: 460), com margem de cima de 66 px a partir de 900 e de 40 px abaixo. A origem do leque passou a ser 17,5% da LARGURA (15% no celular), o que vale também para a foto quadrada do GOOM GUM, e o leque tem 110% de largura no celular. Os arcos passavam por baixo do «VOLTAR» e do status. Em 1440×810 o retrato inteiro, com o anel, ainda cabe na 1ª dobra (242–798).
- Ficha com no máximo 4 laços: a janela de lá não roda o janelaFala (quem fala é o retrato), via o seletor .raiz [aria-labelledby="tm-nick"] > .enfFala. O reflexo enfVarreduraLenta da base fica escondido. Ficam 2 arcos + deriva + falaFixado.
- Companheiros: uma coluna abaixo de 400 px e nick em 12 px abaixo de 600 (13 px acima). O número das estatísticas é dimensionado pela largura do painel (cqi), para um futuro «100%» ou «12,50» não estourar.
- Detalhes menores: o ping ocupa um espaço fixo de 6ch alinhado à direita (a pílula não pula durante a contagem); a classe dos arcos chama enfArcoWifi, não enfArco, para não confundir com o enfArco da RX; a data da cartela usa text-wrap: balance.

### Verificação medida
Medido no dev (3114) e no build de produção (3124), com os mesmos números nos dois.

**Estouro horizontal:** scrollWidth igual a innerWidth em 15 janelas, de 320×640 a 2560×1440.

**Título:**
- SEM / PING sempre em 2 linhas e dentro da coluna, de 81,8 px (320) a 180 px (1920 em diante).
- Com as fontes BLOQUEADAS (só a reserva), título, nicks das cartas e nick da ficha cabem nas 4 larguras testadas.

**1ª dobra do vídeo:**
- 1440×810: a janela inteira cabe, controles inclusive (o herói termina em 810).
- 405×720: escudo, leque, kicker, OS 5, SEM / PING e o balão do lema inteiros (672–710); os chips ficam inteiros abaixo (726). No quadro 0 o lema fica em 680–718.

**Arcos e status:** o núcleo dos arcos fica dentro da janela nas 17 larguras testadas (13–17 px de folga em cima a partir de 1024). O status nunca encosta no «VOLTAR» (8 px em 320).

**Quadro 0 e final:** congelados desde o carregamento (CDP Animation.setPlaybackRate 0). Prints em 1440×810, 405×720 e 390×844, nos dois quadros: tudo legível, nada coberto. Quadros do filme a 450, 1000 e 2050 ms conferidos (trava com fantasmas e 999 ms, conectou com 0 ms e o anel aceso, óculos caindo).

**Movimento reduzido:** 0 animações rodando na página e na ficha; vira o pôster final (óculos no poro, 0 ms, arcos acesos, controles no lugar).

**Clique das cartas:** grade de 7×9 pontos com elementFromPoint, a 8 px da borda, dá 63/63 em cada uma das 5 cartas, em 1440, 1024, 768, 390 e 320, no dev e no build. Um clique real no rodapé leva a /jogadores/n4firida-agiota. Os pontos a 3–6 px do canto caem fora do arredondamento de 18 px; é geometria do canto, não falha do link.

**Fichas (5 jogadores × 6 larguras):**
- Nick em até 2 linhas e nunca partido no meio da palavra: N4FIRIDA / AGIOTA e GOOM / GUM.
- Foco das fotos certo, sem estouro, arcos dentro da janela.
- O nick de DOIS espaços aparece como «N4FIRIDA AGIOTA» / «N4firida agiota» na página e na ficha.

**Contraste (WCAG, fundos compostos):**
- O menor texto é 6,4:1 («999 ms» no vidro).
- Nick na pílula sobre foto branca: 9,5:1; etiqueta de rota: 9,9:1; apoio: 7,7 a 8,8:1.
- Não-texto: o fone branco do botão vermelho de desligar dá 4,3:1 (o mínimo é 3).

**Outros modos:** forced-colors e prefers-contrast: more conferidos em print. O S e o E se encostam sem o contorno branco; é o desenho da fonte, não corte.

**Console:** sem erro nem aviso de hidratação (página e 5 fichas, no dev e no build).

**Build:** o CSS minificado mantém todos os translate/rotate, o @property --ping e o @font-face.

**Keyframes:** o `grep … | uniq -d` sai vazio.

**Laços:** herói com 6 no computador e 4 no celular; ficha com 4.

**Cor do time:** #3DFF8F aparece em /times e /jogadores. Em /tabela e /calendario nenhum time com escudo usa a cor (vale para os 8).

**Não verificado:** WebKit e Firefox reais. Os builds instalados não batem com esta versão do Playwright e o launch trava. Os fallbacks estão no CSS: sem @property a contagem termina em 0 ms; sem view() as entradas vão pelo relógio e as estrelas ficam acesas.

### Testes
vitest tests/times: 7 arquivos e 190 testes, todos verdes (o novo tema-os-5-sem-ping.test.tsx tem 26). Suíte inteira (npx vitest run): 249 arquivos, 244 verdes e 5 vermelhos; 2695 testes passam, 49 falham e 4 são pulados. As 49 falhas estão em 5 arquivos que leem leagueofbronze.json direto e quebram com os dados de produção do worktree; nenhum importa o tema. npx tsc --noEmit: 0 erros. npx eslint nos 7 arquivos .ts/.tsx do tema: 0 problemas.

### Mudanças na base que ele sugeriu (NÃO feitas)
- `tests/capitao-no-site.test.ts, tests/desempate-da-tabela.test.ts, tests/paginas-4a.test.tsx, tests/security/dataset-scopes.test.ts, tests/security/schema-limits.test.ts`: Ler a versão commitada do dataset (um fixture em tests/ ou `git show HEAD:leagueofbronze.json`) em vez do `leagueofbronze.json` da pasta de trabalho. — Os worktrees têm o arquivo com os dados de PRODUÇÃO (4ª Edição, 8 times e 40 jogadores; o commitado é a 3ª, com 6 e 30). Esses 5 arquivos (49 testes) falham na suíte inteira sem nenhuma relação com o tema.
- `components/times/tema.module.css`: Trocar `.cascaLarga .nick { --nick: 28px }` (bloco max-width: 599px) por `:where(.cascaLarga) .nick { --nick: 28px }`. — Com especificidade (0,2,0), essa regra empata com o gancho `.raiz .nick { --nick: … }` de qualquer cenário na carta deitada do capitão no celular, e quem vence passa a depender da ordem dos CSS no build. Aqui eu contornei com `.raiz .cascaLarga .nick` (0,3,0), mas os próximos temas podem cair nisso.

### Pendências
- Safari/WebKit e Firefox não foram vistos em navegador de verdade: os builds instalados não batem com esta versão do Playwright. Vale conferir no iPhone que a contagem do ping termina em «0 ms» e que as letras com background-clip e transform 2D aparecem; no Firefox (sem view()), que as câmeras e os óculos do ADM entram pelo relógio.
- O vídeo (node .sim/video-tema.cjs … os-5-sem-ping giripoca, computador e celular) tem de ser gravado de produção depois do merge e do deploy.
- Continuam com o Lucas as decisões da seção 11 do spec: o lag de 0,9 s na entrada, o «ADM DA CALL», os óculos pixelados que pousam e ficam no escudo, e a foto do Giripoca com o dedo do meio, que fica como veio, de zoeira.
- A suíte inteira tem 49 falhas em 5 arquivos que leem leagueofbronze.json (dados de produção no worktree), sem relação com o tema; ver mudancasNaBaseDesejadas.
- Há um AGENTS.md e um CLAUDE.md não versionados no worktree que não são meus; ficaram fora do commit.


## Desorganização (`desorganizacao`) — commit original 0f8b996

### O que ficou pronto
O tema «O Circo da Desorganização» (cenário picadeiro) está inteiro no branch tema/desorganizacao.

- **Dados** (lib/temas/desorganizacao.ts): paleta vinho e folha de ouro, cor do time #FFE14D, sem prefixo nem sufixo, letraPorLetra, os 9 papéis de texto e o foco das 5 fotos.
- **Textos** (lib/i18n/messages/temas/desorganizacao.ts): os 9, em pt e en; a tarja fica em pt nos dois idiomas.
- **Métrica**: tabela SMOKUM no meu bloco de metricas.ts (padrao 1, espacamento 0,01, sobra 0,22). DESORGANIZAÇÃO = 5,928 em, GAYLORD = 3,165, R A Z E R A L = 2,546.
- **Cena**:
  - lona em gomos e dois trapézios (computador; só o direito de 600 a 1023; nenhum no celular);
  - sanefa com borlas em cima; embaixo a plateia em silhueta, com o algodão-doce rosa (#FFB3C7 fica como tom de cena) e 3 fãs que pulam no pouso;
  - atrás do escudo: raios de cartaz girando, o feixe do canhão (≥ 600) e a poça de luz que procura o leão;
  - os olhos do leão (blend screen) dentro do escudo;
  - o picadeiro de serragem e o pedestal listrado.
- **Entrada**:
  - a câmera gira −3° (−2° no celular) e assenta;
  - o leão salta em 2D e pousa aos 896 ms; olhos e feixe acendem (só sobem de luz);
  - ORGANIZAÇÃO se alinha em cascata; o DES tenta, cai torto de novo e tremelica aos ~4,2 s, depois a cada 11 s.
- **Título**: Smokum 400 letra por letra, ouro com bisel e contorno escuro. O DES em tinta branca de palhaço com estrias, torto como transform de repouso.
- **Chips**: bandeirolas em rabo de andorinha (pts, mestre de picadeiro, OP.GG).
- **Elenco** «AS ATRAÇÕES»:
  - cortina de veludo com bambinela; cartazes de papel pendurados no prego, que entram balançando por view() (sem suporte, pelo relógio);
  - janela em arco, fitinha carmim da rota, nick em tinta;
  - o capitão nak4y no cartaz preto com a CARTOLA; deitado na largura toda no celular.
- **Cartela**: o cartaz da temporada com estrelas, a tarja «SUJEITO A ATRASO» girada 6° (bate e cola por view()) e o fecho «Reclamações… (Somos nós.)».
- **Ficha** (as 5):
  - cartaz grande em arco (o do capitão é preto, com a cartola), raios atrás;
  - nick em folha de ouro que se organiza; até 2 linhas, R A Z / E R A L no celular;
  - cartazinhos de estatística, «O RESTO DA TRUPE» em cartazes deitados, a sanefa e a plateia.
- **Testes**: tests/times/tema-desorganizacao.test.tsx (33 casos) e a lista de keyframes no meu bloco de temas-sem-opacidade.test.ts.

### Desvios do spec (e por quê)
- Prefixei os nomes genéricos de keyframe, além do J3 (balanca → trapezioBalanca), para não colidir quando os 8 temas forem juntados: vibra → plateiaPula, raiosAbrem/raiosGiram → raiosDoCartazAbrem/raiosDoCartazGiram, feixeAcende → feixeDoCanhaoAcende, olhoAcende → olhoDoLeaoAcende, raiosDoRetrato → raiosDoCartazNaFicha.
- Escondi a sigla gigante vazada da base (.raiz .enfRotaGigante { display: none }). O protótipo não a desenhava e, no repo, o contorno «ADC/TOP» passava por cima do rosto do GayLord. A rota continua na fitinha carmim.
- Celular (< 600): row-gap de 20 px entre as bandeirolas. No 405×720 do vídeo a do mestre de picadeiro aparecia 6 px cortada pela borda (regra 8). Agora a de pontos fica inteira (660–704; 674–718 no quadro 0) e a do capitão inteira abaixo da dobra (724).
- J5, completado: no mesmo @media (≥ 1024 px e altura ≤ 860) o padding de baixo do herói passou de --publico + 10px para --publico + 30px. No 1440×810 as cabeças da plateia apareciam 6 px na borda; agora a plateia começa em 824 e os fãs, no pulo, chegam a 814. As bandeirolas ficam em 750–794.
- Ficha: o giro do cartazDesce virou a variável --giro-do-cartaz, −6° no computador e −2,5° abaixo de 600 px. A −6°, no quadro 0, o canto do cartaz saía 17 px da tela no 405×720 e 6 px no 320.
- Ficha: a poça de luz (o .enfHaloRetrato da base) ficou parada, com opacidade 0,8 e animation: none. No computador a ficha tinha 5 laços (2 trapézios, halo, raios e varredura); o orçamento é ≤ 4.
- Ficha: clareei a nota (#cdb99a → #e0d0b4) e o kicker (apoio → #d8c7aa). Medidos na costura de ouro sob a luz quente, davam 4,5:1 e 4,8:1; agora dão ≥ 5,6 e ≥ 6,2.
- Pus font-kerning: none e font-variant-ligatures: none nos nicks das cartas e da ficha, porque a métrica é a soma dos avanços.
- Destino da cartela com espaço fixo ( ) antes do «·», em pt e en: no celular o «·» abria a 2ª linha. O teste acompanha.
- Reescrevi e ampliei o teste do designer (que nunca tinha rodado):
- cor e fixtures em #FFE14D;
- checagens dos ajustes J3 a J6;
- as reservas de fonte e a versão em inglês;
- a cartola só no capitão e o D-E-S nas três primeiras letras.

### Verificação medida
Tudo medido no dev (3115) e de novo no build de produção (3125), com o leagueofbronze.json de produção.

- **Estouro**: nenhum em 15 tamanhos (320×640 a 2560×1440), no dev e no build.
- **Título**: a tinta fica dentro da coluna e da tela em todos os tamanhos, no quadro 0 e no fim. --tam vai de 48,6 px (320) a 168 px (2560).
- **Pé do D**: fica a −0,2/−0,3 px do tampo do pedestal em 320, 390, 1024 e 1440 (em todos os tamanhos medidos).
- **Dobra do vídeo**:
  - 1440×810: lema 655–722, bandeirolas 750–794 (764–808 no quadro 0), plateia a partir de 824 (os fãs no pulo, 814);
  - 405×720: lema 586–642, pts 660–704 (674–718 no quadro 0), mestre de picadeiro em 724, inteiro abaixo da dobra.
- **Quadro 0** (CDP Animation.setPlaybackRate 0 desde o carregamento) **e fim**: título legível e bagunçado no quadro 0. Nenhum enfeite cobre conteúdo (elementFromPoint com os enfeites tocáveis). O único aviso é a caixa transparente de padding do cromo sobre o kicker, conferida em print ampliado: a tinta não encosta.
- **Folha de quadros** (0 a 4,4 s) em 1440 e 405: salto, pouso, cascata, DES tenta, cai e tremelica.
- **Clique das cartas**: 63/63 pontos em cada uma das 5 cartas, em 320, 390, 768, 1024, 1440 e 1920 (dev e build). O clique real no rodapé abre /jogadores/onigami.
- **Fichas** (5, em 1440 e 390): nick em 1 linha, e R A Z E R A L em 2 no celular. Nick na coluna, 4 companheiros, voltar ok, cartola longe do voltar. No quadro 0 (1440×810, 405×720, 390, 320, 560) o cartaz fica na tela.
- **Movimento reduzido**: 0 animações na página e na ficha (1440 e 390, dev e build). Fica o pôster final: DES torto, canhão no leão, feixe e olhos acesos.
- **forced-colors e prefers-contrast: more**: título dentro da coluna.
- **Fonte bloqueada** (só as reservas Impact 60% e Arial 48%): título e nicks cabem em 320, 390, 768, 1440 e 1920.
- **Recuos simulados no Chromium**:
  - sem view(): cartazes pelo relógio, legíveis a −7°, e tarja parada a 6°;
  - sem sin(): letras retas no quadro 0, DES torto.
- **Contraste medido** (pior pixel do fundo real atrás de cada texto, no build):
  - página ≥ 5,2:1 (a linha de créditos decorativa); «FICHA →» 5,3, kicker 5,4, lema 8,5, fitinhas e tarja 8,4, «AS ATRAÇÕES» 8,7;
  - fichas ≥ 5,6:1.
- **Laços vivos**: herói 6 e página 7 no computador, 5 no celular; ficha 4 no computador e 2 no celular. Só transform/opacidade; nenhum flash.
- **Console**: sem erro e sem aviso de hidratação (time, 5 fichas, /times, /jogadores, /tabela, /calendario).
- **Cor do time #FFE14D**: aparece em /times (faixa do card) e /jogadores (5 nomes). /tabela e /calendario não pintam a cor de nenhum time com escudo, nem a dos outros.
- **Inglês**: sem estouro em 320, 390 e 1440; o destino quebra «Half price for Bronze · / do not feed the lion».
- **Build de produção**:
  - next build ok, todas as rotas ƒ;
  - prints do herói dev × build idênticos (no máximo 0,004% dos pixels diferem);
  - métrica conferida com o woff2 servido pelo build: 84 caracteres, diferença máxima 0,0002 em; DESORGANIZAÇÃO = 5,567 em sem kerning.
- **Keyframes repetidos** (grep … | uniq -d): nenhum.
- Servidores parados (3115 e 3125 livres) e next.config.ts desfeito.

### Testes
- **npx vitest run tests/times**: 7 arquivos e 196 testes, todos verdes (tema-desorganizacao.test.tsx tem 33).
- **Mutantes**: com cada correção revertida, o teste do tema falha nos 6 casos (cor rosa, balanca, translate3d no salto, sem o @media de tela baixa, tremelique aos 90%, DES sem o torto de repouso).
- **Suíte inteira** (npx vitest run): 244 arquivos verdes e 5 com falha (49 testes): capitao-no-site, desempate-da-tabela, paginas-4a, security/dataset-scopes e security/schema-limits.
  - Os 5 leem leagueofbronze.json do cwd, que neste worktree são os dados de produção (skip-worktree).
  - Rodando com o dataset versionado (git show HEAD) num cwd à parte, 48 das 49 passam. A restante (desempate «3ª Edição… 6 times») falha porque o próprio arquivo versionado já tem 8 times.
  - Nenhuma toca o tema.
- **npx tsc --noEmit**: 0 erros.
- **npx eslint** nos 7 arquivos .ts/.tsx do tema: 0 problemas.

### Mudanças na base que ele sugeriu (NÃO feitas)
- `next.config.ts (ou .gitignore)`: Pôr agentRules: false no next.config, ou ignorar AGENTS.md e CLAUDE.md no .gitignore. — O next dev 16.3 gera AGENTS.md e CLAUDE.md na raiz de cada worktree onde roda. Aqui ficaram como arquivos não rastreados; não commitei.
- `tests/capitao-no-site.test.ts, tests/desempate-da-tabela.test.ts, tests/paginas-4a.test.tsx, tests/security/dataset-scopes.test.ts, tests/security/schema-limits.test.ts`: Ler um dataset fixo (fixture versionada), não o leagueofbronze.json do cwd. Atualizar o teste de desempate «3ª Edição… 6 times». — Esses 5 arquivos somam 49 falhas em qualquer worktree com os dados de produção (o arquivo é skip-worktree). Mesmo com o dataset versionado, o teste de desempate falha, porque o arquivo do repo já tem 8 times.
- `components/times/tema.module.css`: Opcional: os keyframes de conteúdo sobe, entraCarta e entraCartaRolagem passarem para 2D (translate em vez de translate3d, sem perspective). — A regra 5.3 do juiz proíbe 3D em conteúdo. Neste tema não atrapalha: nada com background-clip: text fica dentro de um .sobe, e as cartas usam os keyframes do cenário. Mas um tema futuro pode tropeçar.

### Pendências
- AGENTS.md e CLAUDE.md estão não rastreados na raiz do worktree (gerados pelo next dev 16.3). Não commitei nem apaguei; podem ser removidos à vontade.
- Não testei em Safari/WebKit nem em Firefox de verdade: os navegadores do Playwright não estão instalados, e instalar exige baixar arquivos. Simulei no Chromium a falta de view() e de sin(). Falta conferir no Safari: display: contents no bloco de texto, background-clip: text com rotate e sin() (16.4+).
- O vídeo (node .sim/video-tema.cjs <prod> computador|celular <saida>.mp4 desorganizacao nak4y) fica para depois do deploy.
- Fora dos tamanhos do vídeo: no 1440×900 as bandeirolas ficam 9 px cortadas pela dobra (o juiz pediu para não mexer nesse tamanho). No 1366×768 isso só acontece no quadro 0; o lema fica inteiro.
- R A Z E R A L quebra em «R A Z / E R A L» no cartaz e na ficha do celular. É a regra da casa (quebra só entre palavras) e o spec mantém.
- Depois de juntar os 5 branches, rodar de novo o grep … | uniq -d dos keyframes e a suíte tests/times.
- O .next do worktree ficou com o build de produção. O next.config.ts já foi desfeito (git checkout).
