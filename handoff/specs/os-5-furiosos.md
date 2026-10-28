# OS 5 FURIOSOS: projeto, «A Figurinha Brilhante» (cenário `album`)

Não editei nada no repositório. Antes de escrever, li o sistema no worktree `C:\LeagueOfBronze-precos`
(`lib/temas/*`, `components/times/*` com `cenarios/`, os quatro testes de `tests/times/`, o stub de fontes,
`lib/draft/times.ts`, `lib/design.ts`, `app/globals.css`) e as três especificações finais anteriores. Olhei o
pôster original, o recorte quadrado, o `-cartaz` e as cinco fotos, e fotografei os três temas no ar e a página
atual do time (`ref\`).

**Já prototipado e medido no Chromium** (Playwright do cache `e41f203b7505f1fb`), em duas etapas: uma maquete
para decidir a cena e, depois, **um harness com o CSS REAL da base** (cópias de `tema.module.css` e
`ficha.module.css`) mais os dois módulos dos Anexos C e D, compilados como CSS Modules pelo mesmo lightningcss
do build, com o DOM igual ao dos componentes (`pagina-do-time-com-tema.tsx`, `ficha-do-jogador-com-tema.tsx`) e
as peças do Anexo A. Os números abaixo são do harness, isto é, da especificação como está escrita:

| verificação | resultado |
|---|---|
| regras dos testes da casa (`temas-sem-opacidade`, `link-da-carta`, `css-do-build`) aplicadas aos Anexos C e D | verde: nada que esconda em conteúdo, sem fill-mode/delay em conteúdo, caminho do link limpo, translate 6→6 / rotate 7→7 / scale 2→2 depois do minificador; o `content: … / ""` sobrevive |
| quadro 0 (todas as animações pausadas em 0 ms) | selo «OS 5» × kicker/créditos, nome × balão, balão × chips: nada; **selo × letras: 0 pixel de tinta em comum** de 320 a 1920 |
| tinta do FURIOSOS dentro da coluna (fim) | sim, de 320 a 1920 (medida em pixels, não em caixa) |
| figurinhas clicáveis inteiras (`elementFromPoint`, grade 6×8 em cada carta) | 48/48 nas cinco, em 1440, 1024, 768, 390, 360 e 320; nenhuma carta encostando na outra |
| rolagem horizontal | zero de 320 a 2560 (página e ficha) |
| pacotinho e repetidas dentro da tela | sim em todas as larguras (folga mínima de 8 px no pacotinho e 10 px nas repetidas) |
| pacotinho: selo SABOR MEIO ROXO | dentro do pacote, sem encostar no escudo nem no nome, de 320 a 1440 |
| ficha | nick em 2 linhas nos quatro nomes de duas palavras e 1 em Satoshi; kicker × nick, nick × chips, título × estatísticas: nada, no quadro 0 e no fim |
| métrica da fonte | 3 casas, canvas a 1000 px; soma das letras = palavra medida, com `font-kerning: none` |
| contraste | todos os pares de texto ≥ 6,9:1 (tabela na seção 9) |
| tamanho | `album.module.css` 7,3 KB gzip (29,7 KB minificado) + `album-ficha.module.css` 2,2 KB gzip |

**Defeitos que o harness achou e que já estão corrigidos aqui** (a maquete escondia): a tira rasgada caía embaixo
do pacote (`.enfPacote > svg` vencia `.enfRasgo` por especificidade); no quadro 0 o F e o U, erguidos, passavam
por baixo do selo «OS 5»; de 900 a 1359 px a repetida da esquerda saía até 54 px da tela; no computador o balão
ficava centrado; no celular o nome do rodapé era empurrado para a direita.

**Onde está tudo** (pasta do time: `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\os-5-furiosos\`):
- `prototipo\entrada.html` — o herói animado (a entrada inteira, com os valores finais desta especificação).
- `prototipo\pagina.html` — a página estática com elenco e pacotinho; `prototipo\ficha.html?j=<slug>` — a ficha.
- Prints: `prototipo\r1440-4000.png` e `prototipo\r390-4000.png` (fim da entrada), `prototipo\folha-r1440.png` e
  `prototipo\folha-r390.png` (quadros 0 / 900 / 1300 / 4000 ms), `prototipo\p-1440.png` (página, a versão do
  holográfico ainda forte), `prototipo\e-390-elenco.png`, `prototipo\e-768-elenco.png`,
  `prototipo\f-peidei-1440.png`, `prototipo\f-gabriel-390.png`.
- Medidas: `medidas\lilita-1000.json` (avanços), `medidas\cor.cjs` e `medidas\contraste.cjs`.
- Scripts que mediram (reaproveitáveis): `prototipo\quadros.cjs` (quadro a quadro), `prototipo\sobreposicao.cjs`
  (quadro 0), `prototipo\layout.cjs` (12 janelas), `prototipo\pacote.cjs` (bordas).
- **Harness com o CSS real:** `verificacao\harness\` — `gerar.cjs` (compila os quatro CSS e gera `index.html`),
  `montar.js` (o DOM: `index.html` é a página; `index.html?j=<slug>` é a ficha) e as medições `medir.cjs`,
  `tinta4.cjs` (tinta selo × letras e tinta × coluna), `resto2.cjs` (figurinhas clicáveis, fichas),
  `repetidas.cjs` e `tabela.cjs`. Prints: `vitrine-heroi.png`, `vitrine-elenco.png`, `vitrine-ficha.png`.
  `verificacao\regras.cjs` extrai os Anexos C e D desta especificação e aplica as regras dos três testes.

---

## 0. Antes de implementar (dados e avisos)

1. **O time já está certo no banco** (conferido em produção, 27/10): nome `OS 5 FURIOSOS`, slug `os-5-furiosos`,
   id `arcana`, escudo `/teams/os-5-furiosos.webp`, fotos `/players/<slug>-4a.webp`. Rotas (`role1`): TOP BETY
   CLARAO (Ouro, 4 pts) · SEL SAMUEL VENÂNCIO (Platina, 5) · MID Satoshi (Platina, 5) · ADC gabriel bontempo
   (Diamante, 8) · SUP Peidei caldinho (Diamante, 8, **capitão**). 30 pts de elenco.
2. **Nome real = nick nos cinco**: o rodapé da figurinha repete o nick e a ficha não mostra `nomeReal`. Nada a
   fazer; com nome real, o rodapé quebra entre palavras (seção 7).
3. **O `-cartaz` (896×1100) não entra no tema, de propósito.** O quadrado já tem a faixa «OS 5 FURIOSOS» e os
   cinco; a figurinha da foto do time é 1:1 (a base inteira — escudo, cartela, ficha — usa o quadrado), e
   esconder o `<img>` da base para pintar o cartaz por cima seria gambiarra. Os logos da Riot/LoL Esports
   continuam fora do site.
4. **O pedido do Lucas sobre o Lula** («não precisa separar do Lula, deixa os dois juntos, de zoeira») é sobre a
   foto do Bobbie Goods (So ADC Bronze Clube), não sobre este time. Aqui vale o mesmo espírito: as cinco artes
   entram inteiras, como vieram — o Yasuo atrás do Satoshi e o Peidei dentro da Lulu ficam juntos.

---

## 1. Conceito em uma linha, e o porquê

**«A Figurinha Brilhante»: a página do time no álbum de figurinhas do campeonato — o pôster é a figurinha
BRILHANTE (a foto do time), os cinco são as figurinhas «5F», o nome é colado no tapa (bafo) e o capitão é a
brilhante; a página fecha no pacotinho «nas bancas».**

De onde vem cada parte:
- **O escudo não é brasão: é a FOTO DO TIME.** Os cinco posando de camisa azul com o «5F» no peito, num palco de
  campeonato — exatamente a figurinha «foto do time» de um álbum. Eles se apresentam como time profissional
  («TEAM ESPORTS»); o álbum trata isso com a seriedade de colecionador e a zoeira de bronze.
- **As cinco fotos são artes de skin**, retratos verticais ricos: viram figurinhas 5:7, a moldura impressa do
  álbum em volta. O «5F» da camisa vira o código das figurinhas: **5F 1** (foto do time) a **5F 6** (o capitão).
- **«Tem um gosto meio roxo!»** — a plaquinha da Lulu do capitão, que aparece no pôster E na foto dele — dá a
  cor do álbum (a página impressa é roxa), o balão de fala embaixo do nome e o selo do pacotinho
  **«SABOR MEIO ROXO»**. Na figurinha do capitão a própria plaquinha aparece inteira (foco escolhido para isso).
- **«Furiosos»** vira gesto: as letras são adesivos colados no TAPA, uma a uma — o **bafo** do recreio (bater
  figurinha para virar).
- **2026 é ano de Copa**: o grupo inteiro viveu a febre do álbum — «brilhante», «repetida», «falta uma», «nas
  bancas», «troco repetida». É a zoeira mais brasileira disponível, e cola no material do time sem forçar.

---

## 2. Os três conceitos considerados, e por que este venceu

**A. «A Figurinha Brilhante» (álbum de figurinhas) — ESCOLHIDO.** Descrito acima.

**B. «Escolha seu Lutador» (fliperama, jogo de luta dos anos 90).** OS 5 FURIOSOS como jogo de luta (Fatal Fury
ecoa no nome): tela de seleção com as cinco artes, cursor «P1», tela de VS, «INSIRA A FICHA» (trocadilho com o
«FICHA →» do site), capitão = **CHEFÃO**, cartela «CONTINUE? 9…». Rende muito em vídeo. Perdeu porque: a
linguagem de fliperama (CRT, pixel, HUD de jogo) disputa terreno com o **OS 5 SEM PING** (internet, lag, tela);
ignora a foto do time e a piada do roxo; e o «VS» clássico precisa esconder conteúdo no quadro 0 (o letreiro que
entra batendo), o que a regra da casa proíbe.

**C. «O Telão da Final» (a arena do próprio pôster).** O palco de campeonato com treliças, refletores, o telão
«MATCH 00:37» e o anel de LED. É a leitura óbvia, e o pôster já É essa cena (a página viraria o pôster
ampliado). Os cones de refletor já estão na RX e nas luminárias dos Galácticos, e a piada é fraca («time
profissional» sem contraponto).

**Por que A venceu:**
- **Distinção dos outros sete:** é o único mundo de PAPEL e COLECIONÁVEL. RX (tempestade, cromo, cinema), QM
  (serra, lua, trem), GdB (bar, chope, lousa, TV de futebol), Fãs de Rosca (academia, ferro, rosca), So ADC
  Bronze (brasão de bronze, atiradores), 5 Sem Ping (internet, Poro, lag), Desorganização (leão, realeza preta e
  dourada). Paleta roxo + lima + holográfico: ninguém usa; sem ouro, sem azul elétrico, sem metal. Nada de
  futebol na tela (sem bola, campo ou camisa): só a cultura do álbum.
- **O vídeo:** a página VIRA, a figurinha desce da mão e COLA (estouro de brilhos), «OS 5» e as oito letras
  entram no tapa, o balão pula, uma faixa holográfica atravessa a foto; rolando, as vagas impressas aparecem
  VAZIAS e as figurinhas colam nelas; o pacotinho cai e o selo carimba.
- **Custo:** médio e seguro. Tudo é transform/opacidade em peças pequenas (o holográfico é um cone de cor
  GIRANDO atrás da foto, não pintura animada), sem `@property`, sem chão em perspectiva, sem líquido. Um único
  efeito 3D (a folha que vira), numa camada só.

**Por que não é nenhum tema anterior recolorido:**

| | RX | QM | GdB | **5F** |
|---|---|---|---|---|
| Lugar | tempestade ao ar livre | serra à noite | dentro do bar | **a página do álbum, de noite, debaixo do abajur** |
| Luz | raio frio | lua e farol | lâmpada âmbar + neon | **brilho holográfico sobre roxo; magenta e azul do palco do pôster, impressos** |
| Material do título | cromo | ouro com bisel | chope enchendo | **adesivo de vinil roxo com recorte creme, letra por letra, girado** |
| Fontes | Exo 2 itálico + Permanent Marker | Bungee + Special Elite | Knewave + Kalam | **Lilita One + Baloo 2** |
| Herói | texto à esquerda, chão espelhado | escudo à esquerda, trilhos | eixo único, tríptico, balcão | **colagem plana: figurinha na vaga impressa (colada torta), pacotinho rasgado atrás, selo «OS 5» em cima do nome; sem chão nem horizonte** |
| Entrada do escudo | cai e o chão treme | chega e freia | brinde | **é COLADO: desce da mão, achata e solta brilhos** |
| Câmera | zoom | grua | travelling | **a página vira** |
| Elenco | créditos | trem | bolachas na lousa (giradas, fita crepe) | **figurinhas 5F 2–6 retas, coladas nas vagas que aparecem antes** |
| Capitão | coroa | roda alada | caneco coroado | **a BRILHANTE: moldura holográfica girando + selo-estrela de 16 pontas** |
| Cartela | «em cartaz» | bilhete carimbado | TV + plaquinha | **o pacotinho «nas bancas» com o selo SABOR MEIO ROXO** |
| Moldura | barras de cinema | faixas de latão | varal + listras | **picote do álbum em cima, fita holográfica embaixo** |

Também não colide com a página `/cartas` do site (cartinhas de regra com moldura colorida): aqui são
figurinhas de álbum (papel creme, vaga impressa, código), nunca cartas de baralho.

---

## 3. Tema (dados)

### 3.1 Fontes (conferidas no `font-data.json` do Next instalado)

- **`Lilita One`** — `weights ["400"]`, `styles ["normal"]`, subsets `latin`, `latin-ext`. Título (FURIOSOS),
  selo «OS 5», nicks (carta, ficha, companheiros), números dos chips e das estatísticas, títulos de seção, nome
  da cartela, códigos 5F, etiqueta de rota, placa BRILHANTE, selo do pacotinho. Letra gorda de adesivo (a das
  figurinhas de jogo de celular): o recorte creme em volta fica limpo porque a fonte é estática (sem contornos
  sobrepostos — o problema que a RX teve com a Exo 2 variável).
  - Só tem 400: o `.raiz` declara `--tm-titulo-estilo: normal`, `--tm-titulo-peso: 400`,
    `--tm-titulo-peso-medio: 400` e `font-synthesis: none`.
  - **Tem kerning** (AV, WA, LT, «SATOSHI» 3,963 com kerning × 3,988 sem). Título, nick da carta e nick da ficha
    declaram `font-kerning: none` e `font-variant-ligatures: none`: assim a soma das letras é exatamente a
    largura (conferido nas 14 palavras medidas).
  - Medidas (canvas, 1000 px): altura das maiúsculas 0,70 em; acentos (Â Ã É Í Ó Ú) sobem a 0,91 em; Ç e Q descem
    0,18 em; ascendente 0,92; descendente 0,22. FURIOSOS = 4,573 em; OS 5 = 1,939; BONTEMPO = 5,106 (a palavra
    mais larga do elenco); W = 0,953 (a letra mais larga).
  - Não repete nenhuma fonte dos temas e não é a Anton/Chakra Petch do site.
- **`Baloo 2`** — variável, `wght` 400–800, `styles ["normal"]`, subsets `latin`, `latin-ext`, `devanagari`,
  `vietnamese`. Carrega a variável inteira (sem `weight`, um arquivo só); usa 500, 700 e 800. O IMPRESSO do álbum:
  balão do lema (800), aviso (700), nome no rodapé (700), rótulos das estatísticas (700), fecho (700), nota (500),
  destino do pacotinho (800), textos dos SVG. Redonda, amiga, ótimos acentos. Nenhum tema usa um impresso
  redondo assim (RX marcador, QM máquina de escrever, GdB giz).

**Reserva da Lilita One** (regra 5): `@font-face "Lilita One Caixa Alta"` = Arial local a **66%**. A maior razão
Arial/Lilita entre TODOS os caracteres medidos é 1,4787 (o espaço: 0,278 contra 0,188 em); nas maiúsculas, 1,3668
(É). A 66%, a Arial fica mais estreita que a Lilita One em todo caractere (pior caso 0,976), então a largura medida
vale para as duas e o título nunca sai cortado enquanto a fonte carrega.

### 3.2 Cores (`cores` → `--tm-*`; contraste WCAG calculado)

| token | hex | papel | contraste |
|---|---|---|---|
| `breu` | `#12081F` | noite roxa; fundo da página | — |
| `ceu` | `#1E0D3A` | o meio da página impressa | — |
| `abismo` | `#2A1260` | miolo das figurinhas e das estatísticas, chip do capitão | texto 14,7 · prata 12,1 |
| `royal` | `#5B2BD6` | faixa do nome na figurinha, hover dos botões | creme sobre ela 7,1 |
| `primaria` | `#9B5CFF` | o roxo do vinil: aros e fios (nunca texto pequeno) | 5,0 no breu |
| `neon` | `#C77DFF` | borda do OP.GG | 7,2 no breu |
| `arco` | `#E2C6FF` | anel de foco | 12,7 no breu · 11,7 na página · 10,2 no abismo |
| `nucleo` | `#FFFFFF` | miolo dos brilhos | — |
| `texto` | `#FFF8EE` | branco-papel | 18,4 no breu · 17,0 na página · 13,9 na folha do quadro 0 |
| `prata` | `#E9DEFF` | apoio forte, nome no rodapé | 15,1 · 12,1 no abismo · 11,4 na folha |
| `apoio` | `#BBA9E0` | rótulos, créditos, aviso, data | 9,1 no breu · 8,4 na página · 7,3 no abismo · 6,9 na folha |
| `acento` | `#C8F54A` | o LIMA do adesivo: «APRESENTA», «FICHA →», selo OS 5, códigos, selo do pacotinho | 15,4 no breu · 12,3 no abismo · 11,6 na folha |
| `tinta` | `#1B0B3A` | tinta sobre lima, creme e placas claras | 14,4 na lima · 16,9 no creme · 13,0 na placa · ≥ 12,7 no holográfico claro |
| `icone` | `#D7B8FF` | ícone de rota no escuro (chips da ficha) | 11,3 no breu · 9,0 no abismo |

**Cores só do cenário** (variáveis no `.raiz` do módulo; não viram tokens):

| peça | cores |
|---|---|
| papel da figurinha (recorte) | `--papel #FFFDF8` → `--papel-sombra #E9DFCC`; recorte das letras `--creme #FFF6E6` |
| vaga impressa | `--vaga #33196A`, tracejado `rgba(255,246,230,.32)` |
| folha anterior (quadro 0) | `--folha #2C2442` (`#332A4C` → `#241D38`) |
| luzes do pôster, impressas | `--magenta 255 79 176`, `--azul 74 134 255` (sempre com alfa ≤ 0,24) |
| holográfico | `--holo-1 #FF7AD9`, `--holo-2 #FFD36E`, `--holo-3 #B8FF6A`, `--holo-4 #6AF2FF`, `--holo-5 #8A7DFF`; claro (placas): `#FFD0F1 → #FFF3C4 → #D9FFB8 → #C9F8FF → #D9D2FF` |
| moldura impressa da figurinha | `#4B22A6` → `#2A1260` com listras a 135° de `rgba(255,255,255,.04)` |
| rótulo do pacotinho | `#1A0B33` com fio lima a 50% |

### 3.3 Metal (o VINIL ROXO do adesivo)

| luz | alto | meio | sombra | fundo | volta | base | placa |
|---|---|---|---|---|---|---|---|
| `#F7EEFF` | `#DDBDFF` | `#A56BFF` | `#4A1A9E` | `#7A3AEA` | `#C79CFF` | `#5B22C2` | `#E6D2FF` |

- O rosto das letras é `meio → fundo → base → sombra` (de cima para baixo). **Nunca começar mais claro que o
  `meio`**: o `alto` contra o recorte creme dá 1,5:1 e a letra some no topo; o `meio` dá 3,2:1, e a `sombra`,
  10,1:1. A silhueta inteira (recorte creme contra a página) dá 16,7:1.
- `luz` e `placa`: o chip de pontos e o topo das placas claras (`--tm-placa-topo: var(--tm-metal-luz)`).

### 3.4 Nome

- **`prefixo: "OS 5"`** → assinatura «OS 5», marca «FURIOSOS» (`partesDoNome` corta pelo texto digitado: «Os 5
  Furiosos» dá «Os 5» + «Furiosos»).
- **`letraPorLetra: true`**: cada letra é um adesivo (seção 6).
- No desenho, a assinatura fica EM CIMA da marca (`flex-direction: column-reverse` no `.tituloVisual`): lê-se
  «OS 5 / FURIOSOS» na ordem do nome. O `h1` continua lendo «OS 5 FURIOSOS» uma vez (o visual é aria-hidden).

### 3.5 Cor do time no resto do site: **`#D98BFF`** (o roxo-orquídea da plaquinha acesa)

Distância de cor (ΔE2000) para os outros sete times da 4ª, com as cores de hoje:

| CHAMA (Desorganização) `#ef7d34` | ÁUREA `#e0b13c` | VERDANTE `#3fb27f` | SEIVA `#8fc23f` | RX `#4DA3FF` | QM `#3EE6F2` | GdB `#B4C2FF` |
|---|---|---|---|---|---|---|
| 46,5 | 61,2 | 47,1 | 78,0 | 31,1 | 44,1 | **19,5** (a menor) |

- Contraste de 8,4:1 no `#100d07` do site.
- O roxo é o único matiz que nenhum dos quatro times novos deve pedir (dourado, laranja/amarelo, bronze, azul ou
  verde). Se algum deles cair perto, a alternativa medida é `#E08CFF` (mais rosado; ΔE 20,2 para o GdB, 8,7:1).
- Hoje o time aparece no site com o `#9a6ae0` da ARCANA: o tema troca, mantendo o roxo que o grupo já conhece.

### 3.6 Cenário: **`album`** (chave nova, uma palavra, sem acento)

### 3.7 Textos (`lib/i18n/messages/paginas-home.ts`, chaves planas depois das dos Galácticos, em pt e en)

| papel | chave | pt | en |
|---|---|---|---|
| `lema` | `temaFuriososLema` | Tem um gosto meio roxo! | It tastes kinda purple! |
| `estrelando` | `temaFuriososFigurinhas` | FIGURINHAS DO TIME | TEAM STICKERS |
| `aviso` | `temaFuriososAviso` | Falta uma: a da taça. | Still missing one: the trophy. |
| `capitao` | `temaFuriososCapitao` | BRILHANTE | SHINY |
| `emCartaz` | `temaFuriososBancas` | NAS BANCAS {periodo} | ON NEWSSTANDS {periodo} |
| `destino` | `temaFuriososPacotinho` | PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE | PACK OF 5 STICKERS · 1 SHINY |
| `carimbo` | `temaFuriososSabor` | SABOR MEIO ROXO | SABOR MEIO ROXO (fica em pt: a base marca o carimbo com `lang="pt-BR"`) |
| `fecho` | `temaFuriososFecho` | Troco repetida por vitória. | Will trade duplicates for wins. |
| `companheiros` | `temaFuriososCompleteOTime` | COMPLETE O TIME | COMPLETE THE TEAM |

- A cartela lê «4ª EDIÇÃO · NAS BANCAS DE 13 DE NOVEMBRO A 6 DE DEZEMBRO».
- «BRILHANTE» é só visual: o leitor de tela ouve «CAPITÃO» (`RotuloDoCapitao` da base).
- Textos fixos dos SVG decorativos (aria-hidden, só em pt, como o neon dos Galácticos): «5F 1», «FOTO DO TIME»,
  «5F», «FIGURINHAS».

### 3.8 Fotos

Retratos que preenchem a moldura (`object-fit: cover`), **sem `formato: "medalhao"`** e **sem `proporcao`** (nenhuma
é deitada). A carta é 5:7, o retrato da ficha 4:5 e o companheiro um quadrado de 56 px: o foco abaixo acerta o
rosto nos TRÊS recortes (conferido nos prints).

| jogador | imagem | foco | por quê |
|---|---|---|---|
| (padrão) | — | `50% 25%` | |
| `bety-clarao` | 1341×1600 (0,84) | `55% 30%` | rosto a 54% × 22%; o livro em chamas embaixo |
| `samuel-venancio` | 1200×1600 (0,75) | `50% 20%` | a cartola inteira na ficha; rosto a 32% |
| `satoshi` | 1068×1600 (0,67) | `50% 30%` | o Yasuo atrás (10–45%) e o rosto (40%) juntos; a lâmina embaixo |
| `gabriel-bontempo` | 880×1600 (0,55) | `50% 8%` | a frase «Eu não sou intrigante» no alto e o rosto (39%) |
| `peidei-caldinho` | 901×1600 (0,56) | `50% 22%` | **a plaquinha «Tem um gosto meio roxo!» inteira** e o rosto (47–55%), também no quadrado do companheiro |

### 3.9 Arquivos de dados (código)

**`lib/temas/os-5-furiosos.ts` (novo):**

```ts
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 FURIOSOS — «A Figurinha Brilhante» (27/10/2026).
 *
 * O "escudo" deles é um PÔSTER: a foto oficial do time, os cinco de camisa azul com o «5F» no peito
 * num palco de campeonato, e a plaquinha «Tem um gosto meio roxo!» da Lulu do capitão. As cinco fotos
 * são artes de skin. A página é a página do time no álbum de figurinhas do campeonato: o pôster é a
 * figurinha BRILHANTE (aro holográfico), cada jogador é uma figurinha «5F n», o nome é colado no tapa
 * (bafo) e o capitão é a brilhante. Fecha no pacotinho «nas bancas». O roxo é o da plaquinha; o lima,
 * o do adesivo. Nada de futebol na tela: só a cultura do álbum.
 */
export const TEMA_OS_5_FURIOSOS: TemaDoTime = {
  slug: "os-5-furiosos",
  fontes: { titulo: "lilita-one", assinatura: "baloo-2" },
  cores: {
    breu: "#12081F",
    ceu: "#1E0D3A",
    abismo: "#2A1260",
    royal: "#5B2BD6",
    primaria: "#9B5CFF",
    neon: "#C77DFF",
    arco: "#E2C6FF",
    nucleo: "#FFFFFF",
    texto: "#FFF8EE",
    prata: "#E9DEFF",
    apoio: "#BBA9E0",
    acento: "#C8F54A",
    tinta: "#1B0B3A",
    icone: "#D7B8FF",
  },
  // O "metal" é o vinil roxo do adesivo. O rosto das letras nunca começa mais claro que o `meio`.
  metal: {
    luz: "#F7EEFF",
    alto: "#DDBDFF",
    meio: "#A56BFF",
    sombra: "#4A1A9E",
    fundo: "#7A3AEA",
    volta: "#C79CFF",
    base: "#5B22C2",
    placa: "#E6D2FF",
  },
  prefixo: "OS 5",
  letraPorLetra: true,
  // O roxo-orquídea da plaquinha acesa: ΔE ≥ 19,5 de todos os outros sete (o mais perto é o lavanda
  // dos Galácticos) e 8,4:1 no fundo do site. Hoje o time sai com o #9a6ae0 da ARCANA.
  cor: "#D98BFF",
  cenario: "album",
  textos: {
    lema: "temaFuriososLema",
    estrelando: "temaFuriososFigurinhas",
    aviso: "temaFuriososAviso",
    capitao: "temaFuriososCapitao",
    emCartaz: "temaFuriososBancas",
    destino: "temaFuriososPacotinho",
    carimbo: "temaFuriososSabor",
    fecho: "temaFuriososFecho",
    companheiros: "temaFuriososCompleteOTime",
  },
  // Retratos (artes de skin), não avatares: o foco acerta o rosto na carta 5:7, na ficha 4:5 e no
  // quadrado do companheiro.
  fotos: {
    focoPadrao: "50% 25%",
    foco: {
      "bety-clarao": "55% 30%",
      "samuel-venancio": "50% 20%", // a cartola inteira
      satoshi: "50% 30%", // o Yasuo atrás e o rosto
      "gabriel-bontempo": "50% 8%", // «Eu não sou intrigante» no alto
      "peidei-caldinho": "50% 22%", // a plaquinha «Tem um gosto meio roxo!» inteira
    },
  },
};
```

**`lib/temas/tipos.ts`:** `ChaveDeFonte` ganha `| "lilita-one" | "baloo-2"`; `Cenario` ganha `| "album"`.

**`lib/temas/registro.ts`:** importar `TEMA_OS_5_FURIOSOS` e pôr no fim de `TEMAS`.

**`lib/temas/metricas.ts`** (a Lilita One entra; a Knewave fica igual):

```ts
/**
 * Lilita One (Os 5 Furiosos), medida no Chromium a 1000 px com `fontKerning = "none"` (27/10/2026). A
 * fonte TEM kerning: o título e os nicks do tema desligam (`font-kerning: none`) e aí a soma das letras
 * é a palavra (FURIOSOS 4,573 em pelos dois caminhos). Espaçamento de 0,06 em (o recorte creme de uma
 * letra não encosta na tinta da vizinha). Sobra: o recorte (0,16 em de traço → 0,08 de cada lado), o giro
 * de até 4° das letras do título (~0,07 em) e folga.
 */
const LILITA_ONE: MetricasDaFonte = {
  avancos: {
    A: 0.655, B: 0.594, C: 0.561, D: 0.616, E: 0.493, F: 0.472, G: 0.621, H: 0.644, I: 0.429,
    J: 0.462, K: 0.62, L: 0.435, M: 0.907, N: 0.648, O: 0.696, P: 0.57, Q: 0.706, R: 0.59,
    S: 0.531, T: 0.502, U: 0.628, V: 0.661, W: 0.953, X: 0.683, Y: 0.615, Z: 0.563,
    Á: 0.655, À: 0.655, Â: 0.655, Ã: 0.655, Ä: 0.655, É: 0.488, È: 0.488, Ê: 0.488, Ë: 0.488,
    Í: 0.432, Ì: 0.432, Î: 0.432, Ï: 0.432, Ó: 0.696, Ò: 0.696, Ô: 0.696, Õ: 0.696, Ö: 0.696,
    Ú: 0.628, Ù: 0.628, Û: 0.628, Ü: 0.628, Ç: 0.546, Ñ: 0.657,
    0: 0.639, 1: 0.406, 2: 0.525, 3: 0.528, 4: 0.598, 5: 0.524, 6: 0.575, 7: 0.5, 8: 0.57, 9: 0.565,
    " ": 0.188, ".": 0.229, ",": 0.305, "-": 0.525, _: 0.636, "'": 0.301, "!": 0.287, "?": 0.584,
    "&": 0.667, "+": 0.602, "·": 0.309, "#": 0.833, "@": 0.867, "(": 0.43, ")": 0.422, "/": 0.573,
    ":": 0.277, "%": 0.798, "©": 0.693, "®": 0.701, Æ: 0.917, Œ: 0.877, Þ: 0.595, Ø: 0.696,
  },
  padrao: 1, // o mais largo medido é o W (0,953); CJK e o ㅤ dos nicks caem em outra fonte, ~1 em
  espacamento: 0.06,
  sobra: 0.3,
};

export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = {
  knewave: KNEWAVE,
  "lilita-one": LILITA_ONE,
};
```

Valores que o teste novo deve conferir (calculados com a tabela acima):
- `maiorPalavraEm("FURIOSOS")` = **5,353** (4,573 + 8 × 0,06 + 0,3).
- `larguraDoNickEm`: BETY CLARAO **4,252** (2 linhas: 4,252/6,944 = 0,61 < 0,62) · SAMUEL VENÂNCIO **5,571**
  (2 linhas) · Satoshi **4,708** (1 palavra) · gabriel bontempo **5,886** (2 linhas) · Peidei caldinho **5,464**
  (2 linhas: 5,464/9,102 = 0,60).
- `--maior-palavra-em` do elenco = **5,886** (BONTEMPO). «VENÂNCIO» em NFD dá o mesmo que em NFC.

**`components/times/fontes-dos-temas.ts`:**

```ts
import { Baloo_2, Bungee, Exo_2, Kalam, Knewave, Lilita_One, Permanent_Marker, Special_Elite } from "next/font/google";

// Os 5 Furiosos: a letra gorda de adesivo e o impresso redondo do álbum. A reserva é uma Arial
// ENCOLHIDA a 66% (@font-face em cenarios/album.module.css): mais estreita que a Lilita One em todo
// caractere medido, então a largura do título nunca estoura enquanto a fonte carrega.
const lilitaOne = Lilita_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Lilita One Caixa Alta"],
});

// Variável (400–800) num arquivo só: o tema usa 500, 700 e 800.
const baloo2 = Baloo_2({
  subsets: ["latin"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

// em FONTES_DOS_TEMAS: "lilita-one": lilitaOne, "baloo-2": baloo2,
```

**`components/times/cenarios/index.ts`:** `album: ALBUM` (import de `cenarios/album`).

**`tests/stubs/next-font-google.ts`:** `export const Lilita_One = fonte; export const Baloo_2 = fonte;`

**`app/globals.css`** (depois da regra da Queijo Minas): o cabeçalho no roxo da página, com o fio lima do picote.

```css
/* Os 5 Furiosos: a noite roxa do álbum e o fio lima do picote. */
body:has([data-tema="os-5-furiosos"]) #lob-cabecalho {
  background: linear-gradient(180deg, rgba(18, 8, 31, 0.95), rgba(18, 8, 31, 0.84)) !important;
  border-bottom-color: rgba(200, 245, 74, 0.28) !important;
}
```

---

## 4. A cena do herói (computador e celular)

### 4.1 Camadas, de trás para frente

**Palco (sticky, a tela toda, dentro da câmera):**
1. `enfPagina` — a página impressa do álbum: degradê `#170A2D → céu → #1A0B33 → breu`, com três luzes impressas:
   magenta no alto à esquerda (8% 14%), azul no alto à direita (92% 10%) — as luzes vermelha e azul do palco do
   pôster — e um roxo subindo do pé.
2. `enfRaios` — raios impressos (cone repetido de 4° claro / 8° vazio, alfa 0,055), centrados ATRÁS DA
   FIGURINHA: `calc(50% + min(355px, 27vw)) 56%` a partir de 900 px (é onde o centro do escudo cai em toda largura,
   porque o contêiner é centrado e vai até 1280); `50% 35%` abaixo de 900. Máscara radial (6% → 62%). Parado.
3. `enfReticula` — retícula de pontos (1,1 px a cada 11 px, alfa 0,14), forte embaixo à esquerda, some em diagonal.
4. `enfCincoF` — um «5F» GIGANTE só de contorno (Lilita One, traço de 1,2 px a 7,5% de alfa), saindo do canto de
   baixo à esquerda: 78vh de altura (46vh abaixo de 600). É a marca d'água da página.
5. `enfLuz` — o abajur: uma poça quente (`rgba(255,232,200,.09)`) no alto à esquerda.
6. `enfFolhaSombra` + `enfFolha` — **a folha anterior do álbum**, que cobre tudo no quadro 0 e VIRA (seção 5).
   Papel `#332A4C → #2C2442 → #241D38` com retícula fraca e uma grade de vagas vazias (linhas de 2 px a 7%).
7. Base: `enfVinheta` e `enfGrao` (sem mudança).

**Moldura (no padding do herói e da ficha; `--barra` vira `clamp(14px, 2.4vw, 32px)`):**
- `enfPicote` (em cima, altura `--barra`): a margem do álbum (`#140928 → #1B0C34`) com a fileira de furos do
  picote (círculos de 3 px a cada 12 px, 7 px acima da borda) e um fio lima de 1 px embaixo. Entra deslizando da
  direita junto com a folha.
- `enfFitaHolo` (embaixo, 5 px): uma fita holográfica (o arco-íris do brilhante, repetido) que é COLADA da esquerda
  para a direita e depois corre devagar (10 s).

**Bloco do escudo (de trás para frente; `--escudo` = E):**
1. `enfHalo` — brilho holográfico difuso: círculo de 1,8E, roxo `rgba(199,125,255,.42)` → ciano → rosa → nada.
2. `enfVaga` — **a vaga impressa da foto do time**, do tamanho da figurinha e deslocada (−6%, −5%): a figurinha
   foi colada torta e a vaga aparece em L no alto à esquerda (cerca de 0,06E de borda). `--vaga` com fio escuro e
   um tracejado creme (2 px, inset 2,2%) que só aparece na parte descoberta.
3. `RotuloDaVaga` — a etiqueta impressa 14 px abaixo: caixinha lima «5F 1» (Lilita, tinta) e «FOTO DO TIME» (Baloo
   800, apoio). Embaixo à esquerda (alinhada com a vaga, `left: −6%`) abaixo de 900; à direita a partir de 900.
4. `Pacotinho` — o pacote de figurinhas RASGADO, atrás da figurinha:
   - corpo de papel laminado (degradê `#3A1A7A → #8E5BFF → #F2E6FF → #7E44F0 → #2A1060`) com serrilhado em cima e
     embaixo, rótulo escuro com «5F» lima grande e «FIGURINHAS» creme;
   - dois VERSOS de figurinha saindo da boca (roxo com borda creme de 3 px, o de trás com «5F»);
   - a TIRA rasgada (lilás `#B88CFF`) que voa na entrada;
   - posição: abaixo de 900, atrás do canto de BAIXO à DIREITA (`right: −20%; bottom: −8%; width: 0,36E; rotate:
     13°`); de 900 a 1359, atrás do canto de CIMA à direita (`right: −12%; top: −12%; width: 0,34E; rotate: 16°`);
     a partir de 1360, `right: −24%; width: 0,40E`. Medido: a borda direita fica 8 a 25 px dentro da tela em todas
     as larguras; nunca invade a coluna do texto.
5. `enfSombra` (peça `Chao`) — a sombra da figurinha no papel: borrão radial do tamanho dela, que vai de LONGE e
   fraca (a figurinha na mão) a PERTO e escura (colada).
6. **A figurinha (o `.escudo` da base)**, com o `NoEscudo` dentro (anda com ela):
   - `enfAro` (z −2, inset −2,4%): **o aro holográfico** — um cone arco-íris (`--holo`) GIRANDO atrás da foto,
     visível só na borda (14 s por volta). É «a brilhante».
   - `enfPapel` (z −1, inset −0,7%): o papel creme do adesivo, que também preenche os cantos transparentes do webp.
   - a foto (`<img>` da base, intocada).
   - `enfBafo` (z −3): o ar que sai de baixo quando ela cola (anel creme/lilás que cresce e some).
   - `enfFaixa` (z 1, `mix-blend-mode: color-dodge`): uma faixa arco-íris estreita, inclinada 18°, a 32% de
     opacidade, que atravessa a foto logo depois da colada e depois a cada 7 s — o reflexo do papel brilhante.
   - `enfVerniz` (z 1): o verniz parado (um brilho a 125° no canto de cima à esquerda).
   - `enfEstouro` ×6 (z 3): estrelas de 4 pontas que estouram dos cantos e dos meios de cima e de baixo na colada.
   - `enfBrilho` ×4 (×3 no celular) (z 3): estrelas que piscam depois, nos cantos.

**Bloco do texto:**
1. `kicker` «4ª EDIÇÃO · LEAGUE OF BRONZE **APRESENTA**» (base; «APRESENTA» em lima) — parado.
2. `nomesDoElenco` (a partir de 600) — parado.
3. **título**: o selo «OS 5» (pílula lima com recorte creme, girada −7°, com dois brilhinhos) EM CIMA e à esquerda,
   e FURIOSOS em oito adesivos de vinil roxo com recorte creme, cada um num giro (seção 6).
4. `lema`: o **balão de fala** «Tem um gosto meio roxo!» (papel, tinta, Baloo 800), com o rabinho embaixo à
   esquerda, girado −1,5°.
5. `chips`: pílulas de adesivo (seção 6).

### 4.2 Composição por largura

- **≥ 900 (duas colunas, a base):** texto à esquerda (`minmax(0, 1.12fr)`), figurinha à direita
  (`minmax(300px, .88fr)`), centradas na altura (`min-height` da base). E = `clamp(280px, min(27vw, 46svh), 400px)`;
  bloco do escudo com margem 0,10E em cima e 0,20E embaixo (a etiqueta da vaga mora ali); o bloco de texto sem as
  margens que a RX usa para o chão (zeradas). Sem tremor na grade (`animation-name: none`): quem bate é a figurinha.
  O balão encosta à esquerda, com o título (`margin-inline: 0` declarado DEPOIS da regra do balão: mesma
  especificidade).
- **600–899 (uma coluna, centrada):** E = `clamp(240px, min(40vw, 36svh), 300px)`.
- **≤ 599 (uma coluna, centrada; o celular NÃO é o computador encolhido):** E = `clamp(200px, 60vw, 250px)`;
  margem 0,08E em cima e 0,24E embaixo. O pacotinho sai pelo canto de BAIXO à direita (no computador, pelo de
  CIMA), a etiqueta da vaga fica à esquerda, os raios se centram em 50% 35%, o «5F» gigante encolhe para 46vh, o
  4º brilho some. O selo «OS 5» continua à ESQUERDA do FURIOSOS (não centrado), a pílula do OP.GG ocupa a linha
  inteira (regra da base) e o chip do capitão vira texto corrido abaixo de 420 px se o nick for longo.

### 4.3 Geometria medida (fim da entrada; cabeçalho de 70 px na maquete)

Título: `--tam = clamp(40px, 100cqi / 5,353, máx)`; máx = 120 px abaixo de 600, `min(150px, 18svh)` de 600 a 1023,
`min(176px, 20svh)` a partir de 1024. O selo «OS 5» = `max(22px, 0,34 × tam)`.

| janela | E | FURIOSOS | OS 5 | fim do nome / balão / chips | etiqueta da vaga | dobra |
|---|---|---|---|---|---|---|
| 1920×1080 | 400 | 123,9 | 42,1 | 669 / 743 / 811 | 824 | ✓ tudo |
| **1440×810 (vídeo)** | 373 | 124,4 | 42,3 | 569 / 643 / 712 | 712 | ✓ tudo |
| 1440×900 | 389 | 124,4 | 42,3 | 614 / 688 / 757 | 764 | ✓ |
| 1366×768 | 353 | 124,6 | 42,4 | 548 / 620 / 689 | 681 | ✓ |
| 1024×768 | 280 | 98,9 | 33,6 | 493 / 556 / 676 | 632 | ✓ |
| 768×1024 | 300 | 134,5 | 45,7 | 840 / 899 / 958 | 528 | ✓ |
| 600×960 | 240 | 103,1 | 35,1 | 710 / 769 / 882 | 455 | ✓ |
| 430×932 | 250 | 73,9 | 25,1 | 643 / 701 / 873 | 464 | ✓ |
| **405×720 (vídeo)** | 243 | 69,6 | 23,7 | 627 / **686** / 857 | 456 | figurinha, nome e balão ✓ |
| 390×844 | 234 | 66,9 | 22,7 | 611 / 670 / 841 | 447 | ✓ |
| 360×780 | 216 | 61,3 | 22,0 | 594 / 652 / 824 | 427 | figurinha, nome e balão ✓ |
| 320×640 | 200 | 53,8 | 22,0 | 566 / 624 / 795 | 410 | figurinha, nome e balão ✓ |

Medido no harness (cabeçalho de 70 px). Tinta do FURIOSOS no fim (x, em pixels): 1440 → 104–733 numa coluna
104–770; 390 → 21–359 em 16–374; 320 → 19–293 em 16–304.

---

## 5. A entrada (o "filme" de 0 a 2,2 s) e o que fica vivo

**Quadro 0 (o pôster, conferido em print e por retângulos):** a folha anterior do álbum cobre a página (cinza-
roxo com vagas vazias); a figurinha inteira, na mão — 5% à esquerda, 8% acima, girada −7°, 7% maior, com a sombra
longe; o pacotinho fechado com a tira; o selo «OS 5» e as oito letras um pouco maiores (106–108%) e girados
(legíveis, sem encostar em nada: zero pixel de tinta em comum entre selo e letras, medido); o balão um pouco menor
e mais embaixo; os chips 14 px abaixo. Nenhum enfeite por cima do conteúdo. Prints:
`verificacao\harness\vitrine-heroi.png` (fim e quadro 0, 1440 e 390, com o CSS real).

### 5.1 Linha do tempo do herói (ms)

| ms | conteúdo (só transform; espera dentro do keyframe) | enfeite (aria-hidden) |
|---|---|---|
| 0–1600 | — | câmera `ajeitaAlbum`: o álbum é ajeitado na mesa (−1,2°, 105% → reto) |
| 0–1000 | — | **a folha VIRA** (`folhaVira`): parada até 100, gira pela lombada (borda esquerda) de 0° a −100° em perspectiva de 1800 px; some ao passar de −90° (~850). Escurece ao virar (`folhaEscurece`); a sombra dela varre a página da direita para a esquerda (`sombraDaFolha`). O picote desliza da direita junto. |
| 0–1400 | — | halo nasce (escala 0,7 → 1); depois respira 6 s (1 ↔ 1,06) |
| 0–1300 | — | o pacotinho balança (+5° → −2° → 0) |
| 144–900 | — | **a tira do pacotinho RASGA** e voa para cima à esquerda girando −38° e sumindo |
| 312–1300 | — | os dois versos saem da boca do pacote (28% → 0) |
| 330–1100 | — | a fita holográfica de baixo é colada da esquerda para a direita |
| 0–600 parada · 600–825 desce · **825 COLA** · 1020 rebote · 1500 fim | **figurinha `colaFoto`** | sombra `sombraCola`: longe e fraca até 600, encosta aos 825 |
| 810–1500 | — | bafo: o anel de ar cresce de 0,9 a 1,22 e some |
| **825–1500 (pico 990)** | — | **estouro**: 6 estrelas saem dos cantos e meios, crescem e somem girando — **flash 1** |
| 840–2100, depois a cada 7 s | — | faixa holográfica atravessa a foto |
| 1000 → | — | o aro holográfico gira (14 s por volta, sem parar) |
| 0–840 parado · 840–980 desce · **980 bate** · 1400 fim | **selo «OS 5» `bafoSelo`** | — |
| **~1600, depois a cada 6 s** | — | os dois brilhinhos do selo piscam juntos — **flash 2** |
| F: parada até 900, **bate aos 1050**, fim 1500 · U 1120 · R 1190 · I 1260 · O 1330 · S 1400 · O 1470 · **S 1540** (fim 2200) | **as oito letras `bafo`**, em cascata pela DURAÇÃO (`1500ms + i × 100ms`; batida a 70%) | — |
| 0–1480 parado · **1720 estoura** · 2000 fim | **balão `balaoPula`** | — |
| 0–1260 parado · 1800 fim | chips (`.sobe` da base, `--i: 3`) | — |
| **2400, 3600, 4800, 6000** e daí a cada 4,8 s cada | — | os 4 brilhos da figurinha piscam (período comum 4,8 s, um a cada 1,2 s) |

**Estado final:** a página roxa impressa com raios atrás da figurinha; a figurinha reta na vaga, com a vaga em L
aparecendo no alto à esquerda; aro arco-íris girando; pacotinho aberto com os dois versos para fora; «OS 5» na
pílula lima; FURIOSOS em adesivos girados (−4°, 3°, −2°, 4°, −3°, 2°, −4°, 3°); balão; chips.

**O que fica vivo (desktop 10 laços; celular 9):** aro (14 s), faixa holográfica (7 s), 4 brilhos (4,8 s),
halo (6 s), fita de baixo (10 s), 2 brilhinhos do selo (6 s). Tudo transform ou opacidade em peças pequenas; o único
`mix-blend-mode` é o da faixa (~0,34E). Na página toda somam-se 5 (aro e faixa do capitão, selo girando, halo do
capitão, brilho do pacotinho): 15 laços em 1440, contra 44 dos Galácticos.

### 5.2 Keyframes da entrada (os de conteúdo vão para a lista do teste)

```css
/* figurinha: na mão → desce acelerando → COLA (achata) → rebote → reta */
@keyframes colaFoto {
  0%, 40% {
    transform: translate3d(-5%, -8%, 0) rotate(-7deg) scale(1.07);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  55% {
    transform: translate3d(0.4%, 0.6%, 0) rotate(0.8deg) scale(0.975);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  68% {
    transform: rotate(-0.3deg) scale(1.012);
  }
  100% {
    transform: none;
  }
}
/* cada letra: suspensa e girada → cai → achata no papel (bafo) → quica → no giro dela */
@keyframes bafo {
  0%, 60% {
    transform: translate3d(0, -0.03em, 0) rotate(7deg) scale(1.08);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  70% {
    transform: translate3d(0, 0.02em, 0) scale(1.06, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  80% {
    transform: scale(0.97, 1.04);
  }
  90% {
    transform: scale(1.01);
  }
  100% {
    transform: none;
  }
}
/* o selo OS 5: mesmo tapa, mais curto; o recuo em % do próprio selo */
@keyframes bafoSelo {
  0%, 60% {
    transform: translate3d(-4%, -6%, 0) rotate(-3deg) scale(1.06);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  70% {
    transform: translate3d(0, 4%, 0) scale(1.08, 0.88);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  80% {
    transform: scale(0.97, 1.03);
  }
  100% {
    transform: none;
  }
}
/* o balão de fala estoura */
@keyframes balaoPula {
  0%, 74% {
    transform: translate3d(0, 10px, 0) scale(0.9) rotate(-5deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1.2);
  }
  86% {
    transform: scale(1.04) rotate(0.6deg);
  }
  100% {
    transform: none;
  }
}
```

No quadro 0 o selo quase não se mexe (recua 4%, sobe 6% da própria altura, gira −3° a mais, 106%): mais erguido,
ele encostava nos créditos; e as letras crescem a partir de perto do topo das maiúsculas (`transform-origin: 50% 20%`
no `.letra`), para baixo, longe do selo (os dois medidos: zero pixel de tinta em comum). Por isso também o `kicker`
e os créditos não têm `.sobe` (como nos Galácticos), o título ganha `margin-top: max(18px, 0,2 × tam)` e o selo,
`margin-bottom: max(10px, 0,14 × tam)`.

---

## 6. Título

- **Marca = oito adesivos de vinil.** Cada `.letra` (base) é um `inline-grid` com o eco e o cromo na MESMA célula:
  - **eco = o recorte creme**: `color` e `-webkit-text-stroke: 0.16em` em `--creme`, com sombra curta
    (`0 .05em 0 rgba(27,11,58,.55)`) e sombra solta (`0 .1em .14em rgba(0,0,0,.5)`). O traço é centrado no
    contorno: o cromo por cima esconde a metade de dentro, sobra 0,08 em de papel em volta da letra.
  - **cromo = o vinil**: `background-clip: text` com `meio 0 29% → fundo 48% → base 64% → sombra 75% 100%`. As
    porcentagens são da caixa da letra (1,54 em com o padding): topo das maiúsculas a 29%, linha de base a 75%;
    o acento (a 15,6%) fica no `meio`. Cor sólida `--tm-metal-meio` antes do `background-clip` (a tinta garantida).
  - padding `.3em .14em .24em` com margem negativa igual em eco e cromo: o `background-clip` nunca corta acento.
  - **giro estático por letra** (`rotate`, a propriedade individual, no `.letra`): −4°, 3°, −2°, 4°, −3°, 2°, −4°, 3°
    por `:nth-child(8n + k)` dentro da `.palavra`. Coladas na fúria, ninguém alinhou.
  - `letter-spacing: .06em`, `font-kerning: none`, `font-variant-ligatures: none`, `line-height: 1`; a `.palavra`
    não quebra (`nowrap`); a `.marca` quebra entre palavras se o time um dia tiver nome de duas.
  - Entrada: `bafo` no `.letra` (a cascata sai da duração). Sem brilho passando no título (o reflexo animado é
    gesto da RX): o brilho do tema mora na figurinha.
- **Assinatura «OS 5» = o selo lima.** O `.pincel` vira pílula: fundo `--tm-acento`, tinta, Lilita
  `max(22px, .34 × tam)`, `padding .16em .5em .1em`, recorte creme de `.1em` (box-shadow) e sombra; `transform:
  rotate(-7deg)` (só `transform` nessa regra). Fica em cima e à esquerda (`align-self: flex-start`), entra antes das
  letras (`bafoSelo`). **Folga embaixo: `max(10px, 0,14 × tam)`.** Com ela e com o pivô das letras perto do topo
  das maiúsculas (`transform-origin: 50% 20%`: no quadro 0 a letra cresce para BAIXO), a tinta do selo e a das
  letras não têm nenhum pixel em comum, nem no quadro 0 (medido de 320 a 1920; com o pivô no meio e sem a folga,
  o selo cobria o topo do F e do U). O `TracoDoNome` são **dois brilhinhos** (estrelas de 4 pontas branca e creme) no canto de cima
  à direita da pílula (`top: −.5em; right: −.55em; 1,3 em`), que piscam juntos aos 1,6 s e a cada 6 s.
- Tamanho: pela largura MEDIDA (`--largura-em` = 5,353, que a base já calcula com a métrica da fonte).

---

## 7. Elenco: as figurinhas

**Título e aviso.** «FIGURINHAS DO TIME» em Lilita creme `clamp(24px, 2.8vw, 38px)`, com o `::after` da base virando
uma LINHA DE RECORTE tracejada (traços creme de 10 px a cada 16). Embaixo, «Falta uma: a da taça.» em Baloo 700,
apoio, com uma bolinha lima de «!» antes (`::before`, `content: "!" / ""`).

**Ordem:** BETY CLARAO (TOP), SAMUEL VENÂNCIO (SEL), Satoshi (MID), gabriel bontempo (ADC) e Peidei caldinho (SUP,
capitão) por último — a base já faz.

**A figurinha (ganchos):**
| peça | o que vira |
|---|---|
| `.casca` | sem animação própria (`animation: none`, vence as duas da base); raio 12 px (o anel de foco acompanha); **`::before` = a VAGA impressa** atrás, deslocada (−6 px, −6 px), `--vaga` com fio creme a 10%; `counter-increment: figurinha` |
| `.elenco` | `counter-reset: figurinha 1` (a 1ª é a «5F 2»: a 5F 1 é a foto do time); `row-gap: 34px` de 600 a 1023 (o selo do capitão) |
| `.carta` | o papel do adesivo: 2 px de borda creme (`--papel → --papel-sombra`), raio 12, sem `clip-path`, `container-type: inline-size`; **é ela que anima a colada** (a vaga e a sombra ficam paradas) |
| `.miolo` | a moldura impressa: `padding: 6px 6px 0`, raio 10, listras a 135° sobre `#4B22A6 → abismo`, `overflow: hidden` |
| `.foto` | **5:7** (figurinha), raio 6; `img` sem filtro; foco por jogador (3.8) |
| `.enfGradacao` | verniz no canto de cima à esquerda + escurecido embaixo (para a faixa do nome) |
| `.enfRotaGigante` | some (o contorno gigante é gesto da RX) |
| `.enfVarredura` | o reflexo do hover da base, mantido (branco a 20%) |
| `.sobreFoto` | `padding: 8px 8px 0` (sem position: link) |
| `.topo` | etiqueta de rota à esquerda, crista de elo 34 px à direita (a sombra já vem inline do `EloCrest`) |
| `.etiquetaRota` | pílula lima com recorte creme (2 px), Lilita 10,5 px, tinta; o ícone em tinta (`--tm-icone: var(--tm-tinta)`) |
| `.identidade` | **a faixa do nome**, de ponta a ponta da foto (`margin: 0 -8px`): `royal → #3A1A90` (só background/margin/padding: link) |
| `.nick` | creme sólido (o degradê da base sai: `background: none; -webkit-text-fill-color: currentColor`), sombra curta, `letter-spacing .02em`, `font-kerning: none`, `text-wrap: balance`; tamanho `clamp(15px, (100cqi − 24px) / --maior-palavra-em, 24px)` = 24 px em quase tudo, 23 em 360, 19,5 em 320 (BONTEMPO cabe; SAMUEL VENÂNCIO e BETY CLARAO quebram em 2 linhas). **Sem filter/transform/position** |
| `.placaCapitao` | «✦ BRILHANTE»: pílula holográfica clara (`--holo-claro`), tinta (≥ 12,7:1), Lilita 10 px, recorte creme |
| `.rodape` | a linha impressa da figurinha: **`::before` = o código «5F 2…5F 6»** (caixinha creme, Lilita 11 px, tinta; `content: "5F " counter(figurinha) / ""`), o nome (Baloo 700 12 px, prata, quebra entre palavras) e «FICHA →» (Lilita 11 px, lima, 12,3:1); `flex-wrap: wrap` e `justify-content: flex-start` (a base usa `space-between`, que com a quebra jogava o nome para a direita): sem espaço, o «FICHA →» desce em vez de cortar o nome |
| `.mono` | lima |

**O capitão, «a BRILHANTE»:**
- `.cascaCapitao .carta`: papel de 3 px com **um cone arco-íris girando por baixo** (`::before`, inset −40%, 14 s;
  `overflow: hidden` e `isolation: isolate` na carta): a moldura brilha e anda.
- miolo um tom mais vivo (`#6A2FD0 → #2E1170`), faixa `fundo → #4B1FB0`.
- `.enfVarredura` vira faixa arco-íris em `color-dodge` que passa a cada 7 s (2º plano: o reflexo do hover some só
  no capitão).
- `.enfHaloCarta`: halo holográfico que respira (o `haloRespira` da base, com as cores do tema).
- **Insígnia grande (`SeloBrilhante`)**: estrela de 16 pontas creme (o recorte), estrela de 16 pontas holográfica
  por dentro (degradê `#FF7AD9 → #FFD36E → #B8FF6A → #6AF2FF → #8A7DFF`) e uma estrela de 4 pontas branca com
  contorno tinta no meio. 56 px (48 no celular), `top: −30px` (−26), gira devagar (30 s por volta, a partir de −8°).
  Distinta da coroa (RX), da roda alada (QM) e do caneco (GdB).
- **Insígnia pequena (`Brilho4`)**: estrela de 4 pontas côncava chapada (`currentColor`): lima nos chips, tinta nas
  placas, lima ao lado da rota nos companheiros.

**A colada por rolagem** (`animation-timeline: view()` na `.carta`; sem suporte, pelo relógio):

```css
@keyframes figurinhaCola {
  from { transform: translate3d(-4px, 18px, 0) scale(1.04); }
  70% { transform: translate3d(0, 1px, 0) scale(0.985); }
  to { transform: none; }
}
@keyframes figurinhaColaRelogio {
  0%, 60% {
    transform: translate3d(-4px, 18px, 0) scale(1.04);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  80% {
    transform: translate3d(0, 1px, 0) scale(0.985);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  100% { transform: none; }
}
```
- Faixa de rolagem: `entry 0% → entry calc(60% + col × 12%)` abaixo de 1024; `entry 0% → entry calc(50% + i × 8%)`
  a partir de 1024 (cascata da esquerda para a direita). Relógio: `calc(2000ms + i × 140ms)`.
- **De baixo**, como aprenderam os Galácticos (de cima, a figurinha que entra cobriria o rodapé da linha anterior).
  No quadro 0 do relógio: 4 px + 3,5 px da escala < 10 px de vão no celular; na vertical, as duas linhas descem
  juntas (−2 px de folga).
- A VAGA (o `::before` da casca) fica parada: rolando, as vagas aparecem VAZIAS e as figurinhas descem e colam nelas.
- A sombra (`.enfHaloCarta` das não-capitãs) faz a mesma colada pela rolagem dela: de longe e fraca a encostada.
- **Hover/foco "descolando"** (mouse fino): a casca não sobe mais; a CARTA sobe 7 px e gira −1,2° (transição de
  `translate` e `rotate`), a sombra se afasta (4 px, 10 px, 104%), a vaga fica. O capitão segue erguido 14 px a
  partir de 1024 (a base), sem os −22 px do hover.

**Grade:** a da base (2 colunas → 3 + 2 → 5). **Celular: o capitão DEITADO** na largura toda: foto 5:7 à esquerda
(com a plaquinha da Lulu), à direita a placa BRILHANTE, o nick em até 2 linhas (`clamp(20px, (52cqi − 22px) /
--maior-palavra-em, 30px)`) e o rodapé embaixo; selo a 24% da esquerda; `margin-top: 26px` (`.sobreFoto` vira
`display: contents`, como nos Galácticos). Prints com o CSS real: `verificacao\harness\vitrine-elenco.png` (1440 e
390, com o pacotinho); 48/48 pontos clicáveis em cada figurinha de 320 a 1440.

---

## 8. Cartela (o pacotinho) e ficha do jogador

### 8.1 Cartela: «o pacotinho nas bancas»

- `enfLinhaCromo`: duas linhas de recorte tracejadas com a estrelinha lima no meio.
- **`.cartelaCorpo` = o pacote de figurinhas**, em pé: `width: min(100%, 400px)`, `padding: 58px 22px 50px`
  (54/16/46 no celular), papel laminado `#4A1FA8 → #24104F → #3A1888 → #1E0C40`, **serrilhado em cima e embaixo por
  `mask` estática** (dentes de 8 px a cada 16 px: `conic-gradient` repetido; o texto fica no padding, a máscara
  nunca toca nele). Entra pela rolagem caindo 28 px e girando −3° (`pacoteCai`, `entry 10% → 70%`).
- `NaCartela` (atrás do texto): o **rótulo escuro** (`#1A0B33`, raio 14, fio lima a 50%, inset 40/14/32 px), o
  **brilho do laminado** (faixa arco-íris fraca que atravessa a cada 9 s) e o **picote de abrir** (tracejado creme a
  24 px do topo).
- Texto (z 1): escudo 72 px (60 no celular), «OS 5 FURIOSOS» em Lilita creme `clamp(26px, 3vw, 34px)`,
  «PACOTINHO COM 5 FIGURINHAS · 1 BRILHANTE» (Baloo 800 13 px, lima, 14,6:1 no rótulo), «4ª EDIÇÃO · NAS BANCAS DE
  13 DE NOVEMBRO A 6 DE DEZEMBRO» (base, apoio, 8,7:1; 2 linhas no celular).
- **`.cartelaCarimbo` = o selo «SABOR MEIO ROXO»**: círculo lima de 86 px (72 no celular) com recorte creme, Lilita
  14 px (12) em tinta (14,4:1), no canto de cima à direita DENTRO do pacote (`top/right: 12px`; a máscara cortaria
  o que saísse), girado 12°. Carimba pela rolagem (`carimbaSabor`: 160% e −20° → 94% e 4° → reto;
  `entry 30% → cover 45%`). Não encosta no escudo nem no nome em nenhuma largura (escudo centrado; selo à direita
  acima do nome).
- `cartelaFecho` «Troco repetida por vitória.» em Baloo 700 16 px, prata. Links da base.

```css
@keyframes pacoteCai {
  from { transform: translate3d(0, 28px, 0) rotate(-3deg); }
  to { transform: none; }
}
@keyframes carimbaSabor {
  from { transform: scale(1.6) rotate(-20deg); }
  70% { transform: scale(0.94) rotate(4deg); }
  to { transform: none; }
}
```

### 8.2 Ficha (`/jogadores/[slug]`): «a figurinha ampliada»

- **Mesmo palco e mesma moldura**: a página também vira, o picote e a fita também entram.
- **Retrato = a figurinha grande**: `.retratoCasca` `min(100% − 56px, 400px)` abaixo de 900, `min(100%, 440px)`
  acima (`margin-top: 28px`; capitão 44 px), **sem a animação da base** (quem anda é o `.retrato`);
  `.retrato` = papel de 3 px, raio 18, sombra grande, `overflow: hidden`, `isolation: isolate`, entra por
  `colaRetrato` (o mesmo tapa da foto do time, em px). `.retratoMiolo` **4:5 em TODA largura** (a base faria 4:3 de
  600 a 899 e cortaria as artes), moldura impressa de 10 px, foto com raio 9.
- `AtrasDoRetrato`: a **vaga** do retrato (deslocada −14 px, −12 px, tracejada) e **duas «repetidas»** — versos de
  figurinha (roxo, borda creme, «5F» lima) abertos em leque atrás, um à esquerda (−10°) e um à direita (8°), 56% da
  largura a partir de 1360 px; abaixo disso 50%, ±7° e só −6% para fora, e de 900 a 1279 o retrato estreita para
  `min(100% − 48px, 440px)` (a coluna do retrato encosta na borda da tela: sem isso, em 1024 a repetida da esquerda
  saía 54 px da tela). Medido: dentro da tela de 320 a 2560, folga mínima de 10 px. Abrem saindo de trás
  (`repetidaAbre`).
- `.topo` some (rota e elo estão nos chips ao lado, como nos Galácticos): a arte fica livre e as frases das fotos
  («Eu não sou intrigante», a plaquinha da Lulu) aparecem inteiras.
- Capitão: o mesmo **cone arco-íris girando** por baixo do papel (`.retratoCapitao .retrato::before`), a
  `.enfVarreduraLenta` da base vira faixa arco-íris em `color-dodge`, a **placa «✦ BRILHANTE»** holográfica no canto
  de baixo à esquerda, e o **selo-estrela de 84 px** no canto de CIMA À DIREITA (`top −40px; right −20px`, 64 px e
  −30/−10 abaixo de 900), girando devagar.
- **Nick = adesivo grande**: `.nickVisual` em `inline-grid` (eco e cromo na mesma célula), o mesmo recorte creme e o
  mesmo vinil do título, `letter-spacing .06em`, `font-kerning: none`, `text-wrap: balance`, girado −2° (estático),
  entra no tapa (`bafoNick`, batida aos 930 ms, depois da colada do retrato aos 825). Tamanho pela largura medida:
  `clamp(30px, 100cqi / --largura-nick-em, 96px)` abaixo de 900 e `clamp(40px, …, 124px)` acima.

| coluna | BETY CLARAO (4,252) | SAMUEL VENÂNCIO (5,571) | Satoshi (4,708) | gabriel bontempo (5,886) | Peidei caldinho (5,464) |
|---|---|---|---|---|---|
| 1440 (~652 px) | 124 / 2 linhas | 117 / 2 | 124 / 1 | 111 / 2 | 119 / 2 |
| 390 (358 px) | 84 / 2 | 64 / 2 | 76 / 1 | 61 / 2 | 65,5 / 2 |

- `kicker` (escudo 28 px com raio 6, nome do time, temporada): sem `.sobe` (o nick erguido no quadro 0 encostaria).
- Chips: as mesmas pílulas do herói, alinhadas à esquerda.
- «PERFORMANCE NO CAMPEONATO» em Lilita creme 18–22 px com a linha de recorte; **sem `.sobe`** (como nos Galácticos:
  desceria para cima da 1ª linha de estatísticas).
- **Estatísticas = oito adesivos de número**: quadradinhos violeta (`#3A1A80 → abismo`) com recorte creme de 2 px e
  um brilho de 2 px no topo; valor em Lilita creme `clamp(22px, 2.4vw, 30px)` (14,7:1), rótulo em Baloo 700 10,5 px
  maiúsculo, apoio (7,3:1). Entram estourando (`adesivoPop`, com a duração em cascata do `.sobe` da base: o 1º aos
  ~1,6 s, o 8º aos ~1,95 s); no quadro 0 estão 6 px abaixo e a 92%, nunca encostando no título.
- **Companheiros («COMPLETE O TIME»)**: mini-figurinhas deitadas — faixa `#4B22A6 → abismo` com recorte creme de
  2 px, foto quadrada de 56 px (44 no celular) com raio 8 e borda creme, rota em Lilita 11 px lima, nick em Lilita
  15 px (13 no celular). Hover: o recorte fica lima e a figurinha sobe 3 px (a base).

```css
@keyframes colaRetrato {
  0%, 40% {
    transform: translate3d(-18px, -26px, 0) rotate(-6deg) scale(1.05);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  55% {
    transform: translate3d(1px, 2px, 0) rotate(0.6deg) scale(0.98);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  68% { transform: rotate(-0.3deg) scale(1.01); }
  100% { transform: none; }
}
@keyframes bafoNick {
  0%, 50% {
    transform: translate3d(-0.03em, -0.06em, 0) rotate(5deg) scale(1.08);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  62% {
    transform: translate3d(0, 0.02em, 0) scale(1.05, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  74% { transform: scale(0.98, 1.03); }
  86% { transform: scale(1.01); }
  100% { transform: none; }
}
@keyframes adesivoPop {
  0%, 70% {
    transform: translate3d(0, 6px, 0) scale(0.92);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1.2);
  }
  84% { transform: scale(1.04); }
  93% { transform: scale(0.99); }
  100% { transform: none; }
}
```

---

## 9. Movimento reduzido, contraste, foco, flashes, riscos, testes e vídeo

**Movimento reduzido.** O `.raiz *` da base para tudo e fica o pôster FINAL: página roxa com raios, figurinha reta
na vaga, aro arco-íris parado, pacotinho aberto com os versos para fora, letras nos giros delas, balão, chips; o
capitão com a moldura arco-íris parada e o selo parado; na ficha, as repetidas abertas. Somem (`display: none`) o
que só faz sentido em movimento: **a folha** e a sombra dela (o estilo PARADO da folha já é "virada", invisível —
e ainda assim some), a tira rasgada, o estouro, o bafo, a faixa holográfica, os brilhos, o brilho do pacotinho.

**Contraste (WCAG):**

| texto e fundo | razão |
|---|---|
| texto no breu / na página / na folha do quadro 0 | 18,4 / 17,0 / 13,9 |
| apoio no breu / na página / no abismo / na folha | 9,1 / 8,4 / 7,3 / 6,9 |
| lima no breu / no abismo / no rótulo do pacote | 15,4 / 12,3 / 14,6 |
| tinta na lima / no creme / na placa / no holográfico claro | 14,4 / 16,9 / 13,0 / ≥ 12,7 |
| creme na faixa do nome (royal) / na faixa escura | 7,1 / 11,3 |
| prata no rodapé | 12,1 |
| ícone no abismo / no breu | 9,0 / 11,3 |
| anel de foco no breu / página / abismo | 12,7 / 11,7 / 10,2 |
| vinil do título contra o recorte: topo (`meio`) / pé (`sombra`) | 3,2 / 10,1 (letra de 54 a 135 px) |
| recorte creme na página (a silhueta) | 16,7 |
| cor do time no site | 8,4 |

`forced-colors`: eco escondido, cromo em `CanvasText`, aro/faixa/moldura arco-íris escondidos.
`prefers-contrast: more`: cromo branco sólido sem o recorte (o eco some, como na base), faixa holográfica escondida
— é preciso declarar no tema (`.raiz .cromo` ganha de `.cromo` da base e deixaria a letra transparente).

**Foco (Tab):** voltar → OP.GG → as cinco figurinhas → calendário → todos os times. Anel `2px solid #E2C6FF` com
offset 3–4 px, sempre em fundo escuro (≥ 10,2:1). Na figurinha o anel fica na CASCA (raio 12) e a carta "descola"
7 px no foco também. Nada focável tem máscara (as pílulas são `::before`; a máscara do pacotinho está no corpo da
cartela, que não é focável).

**Leitor de tela:** o `h1` lê «OS 5 FURIOSOS» uma vez; letras, selo, brilhos, pacotinho e etiqueta são aria-hidden;
«BRILHANTE» é aria-hidden e lê-se «CAPITÃO» (placa, chip, companheiro); o código «5F n» e o «!» do aviso usam texto
alternativo vazio (`content: … / ""`); o carimbo sai com `lang="pt-BR"` (base).

**Flashes (pequenos; nunca mais de 2 por segundo):** o estouro da colada (pico 0,99 s), os dois brilhinhos do selo
juntos (1,6 s e a cada 6 s), e os quatro brilhos da figurinha num período COMUM de 4,8 s com picos a 2,4 / 3,6 /
4,8 / 6,0 s (um a cada 1,2 s, nunca dois juntos). Em qualquer janela de 1 s: no máximo um brilho + um selo. Não
contam: a folha (só sai), a faixa holográfica (desliza, 32% de opacidade), o aro (gira), o halo (escala).

**Riscos e como evitar:**
1. **lightningcss e o `translate`.** Nenhuma regra mistura `transform:` literal com `translate/rotate/scale`
   individuais. Os brilhos se centram por `margin` negativa (não `translate`), porque o estado parado deles é
   `transform: scale(0)`. A faixa holográfica gira DENTRO do `transform` (`rotate(18deg) translateX(…)`).
   `tests/times/css-do-build.test.ts` confere.
2. **Keyframes por módulo.** CSS Modules põe hash nos keyframes: o que a ficha usa (`seloGiraFicha`,
   `aroGiraFicha`, `repetidaAbre`, `colaRetrato`, `bafoNick`, `adesivoPop`) é declarado em
   `album-ficha.module.css`, não emprestado do outro módulo.
3. **Propriedade empatada entre os dois módulos.** Peças com classe dos dois (kicker, chips, heroi) só ganham
   propriedade num deles; regras só do herói são `.raiz .blocoTexto …`, só da ficha `.raiz .texto …`.
4. **A folha 3D no palco sticky:** uma camada só, `backface-visibility: hidden` (com `-webkit-`), perspectiva no
   próprio `transform`. Conferir no Safari que ela some ao passar de 90° e que, parada, está virada.
5. **`content: … / ""`** (texto alternativo do gerado): Chrome 77+, Safari 17.4+, Firefox 128+. Onde não houver,
   a declaração é inválida e o código simplesmente não aparece. Conferir no build que o lightningcss mantém a
   declaração; se cair, usar `content: "5F " counter(figurinha)` (o leitor leria «5F 2», curto e inofensivo).
6. **Fonte carregando:** a reserva a 66% é menor e mais estreita: o título nunca estoura (medido para todo
   caractere). `display: swap`, `preload: false`.
7. **Recorte creme sobre a tinta da vizinha:** cada letra gira (é um contexto de empilhamento), então o recorte
   da letra seguinte pinta por cima da anterior se encostar. Com `.06em` de espaçamento, no fim não encosta; no
   quadro 0 (letras 8% maiores) no máximo o papel de uma encosta no papel da outra — conferido nos prints. O selo
   «OS 5» tem folga própria (seção 6) e nunca toca a tinta das letras.
8. **Especificidade contra a própria peça:** um seletor de filho (`.enfPacote > svg`) vence a classe de um filho
   (`.enfRasgo`). Peça com regra própria tem classe própria (`enfCorpoPacote`); nada de `> svg` genérico.
9. **Dívida de CSS:** cada tema soma ~9–11 KB gzip em TODA página `/times` e `/jogadores` (anotado nos
   Galácticos; orçamento sugerido 30 KB). Este tema soma 9,5 KB (7,3 + 2,2, medido); com os cinco times novos o
   orçamento estoura: vale abrir a tarefa de carregar o CSS do cenário por tema.
10. **Fotos de IA com texto** (a frase do Gabriel, a plaquinha do Peidei): na CARTA a etiqueta de rota e a crista
   podem cobrir uma ponta da frase; na FICHA ficam livres (o `.topo` some).

**Testes:**
- `tests/times/temas-sem-opacidade.test.ts`: acrescentar à lista de entradas `"colaFoto", "bafo", "bafoSelo",
  "balaoPula", "figurinhaCola", "figurinhaColaRelogio", "pacoteCai", "carimbaSabor", "seloGira", "colaRetrato",
  "bafoNick", "adesivoPop", "seloGiraFicha"`. A leitura recursiva já pega os dois módulos novos.
- **Novo `tests/times/tema-os-5-furiosos.test.tsx`** (no molde do dos Galácticos):
  - registro: achado pelo slug; `arcana` sozinho dá `null`; `corDoTime` dá `#D98BFF` com slug e `#9a6ae0` sem;
  - nome: `partesDoNome("OS 5 FURIOSOS", "OS 5")` e em caixa mista; os 9 textos em pt e en (carimbo igual em en);
  - métricas: os valores da seção 3.9 (5,353; 4,252; 5,571; 4,708; 5,886; 5,464; `--maior-palavra-em` 5,886; NFD);
    Knewave e a RX/QM continuam como estão;
  - página: `h1` lido uma vez, 8 `.letra`, `--largura-em:5.353`; ordem BETY, SAMUEL, Satoshi, gabriel, Peidei; os
    textos presentes; «CAPITÃO» para o leitor e nunca «BRILHANTE» lido; `data-cenario="album"`, SEM `data-fotos`;
    `enfFolha`, `enfVaga`, `enfPacote`, `enfAro` presentes e nada de `enfLousa`/`enfLua`/`enfCoroa`/`enfGrade`;
    enfeites aria-hidden (o único texto é o de SVG decorativo: «5F 1», «FOTO DO TIME», «5F», «FIGURINHAS»);
  - RX, QM e GdB: HTML sem nenhuma peça do álbum;
  - ficha: `h1` uma vez com `--largura-nick-em:5.464` (Peidei), 4 companheiros, «COMPLETE O TIME», «CAPITÃO» no
    link do capitão, `enfVagaRetrato` e duas `enfRepetida`.
- `link-da-carta` e `css-do-build` passam sem mudança (o módulo novo entra sozinho na varredura).
- `npx vitest run tests/times`, `npx tsc --noEmit`, `npm run lint`, `npm run build` (toda rota `ƒ`).

**No navegador (build de produção local, não o dev):** quadro 0 pausando tudo (página e ficha); estouro horizontal
por JS de 320 a 2560; tinta do FURIOSOS dentro da coluna; pacotinho dentro da tela (900, 1024, 1359, 1360, 320);
selo «OS 5» × créditos no quadro 0; figurinhas: vaga aparecendo antes, colada pela rolagem, capitão deitado no
celular; cartela: selo dentro do pacote, sem encostar no escudo nem no nome; ficha: retrato 4:5 em 600–899,
repetidas dentro da tela (1024, 1279, 1280, 1359, 1360), nick ≤ 2 linhas; movimento reduzido, `forced-colors`, `prefers-contrast: more`; aba em 2º
plano; Safari (folha 3D, `background-clip: text` no recorte, `color-dodge`); Firefox sem `view()` (relógio). E as
comparações de RX, QM e GdB com `.sim/comparar-paginas.cjs` antes e depois.

**Vídeo (de produção, depois do deploy):**
- `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador <saida>.mp4 os-5-furiosos peidei-caldinho` e o
  mesmo com `celular` (1440×810 e 405×720, medidos acima).
- **Roteiro:** 0–1 s a folha do álbum vira, a tira do pacotinho rasga e voa; 0,6–1,5 s a FOTO DO TIME desce da mão e
  cola (estouro de brilhos, bafo), o selo «OS 5» bate, as oito letras de FURIOSOS colam no tapa uma a uma; 1,7 s o
  balão «Tem um gosto meio roxo!» estoura; 2,1 s a faixa arco-íris atravessa a foto; 3–7 s aro girando, brilhos
  piscando; 7–11 s rolagem lenta: as vagas vazias aparecem e as figurinhas colam nelas, a BRILHANTE do Peidei com a
  moldura girando, a plaquinha da Lulu e o selo-estrela; 11–13 s o pacotinho cai e carimba SABOR MEIO ROXO, «Troco
  repetida por vitória.»; fecho com 4 s da ficha do Peidei: a página vira, o retrato cola na vaga com as repetidas
  abrindo atrás, PEIDEI / CALDINHO bate em duas linhas, as estatísticas estouram.

---

## Anexo A — `components/times/cenarios/album.tsx` (novo)

```tsx
import type { CSSProperties } from "react";

import a from "@/components/times/cenarios/album.module.css";
import af from "@/components/times/cenarios/album-ficha.module.css";
import {
  Brilho4,
  BrilhoNoSelo,
  CincoF,
  Pacotinho,
  RotuloDaVaga,
  SeloBrilhante,
  VersoDeFigurinha,
} from "@/components/times/cenarios/ornamentos-album";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** O estouro quando a figurinha cola (uma vez): x, y (% do escudo), lado (px), deriva x/y (px). */
const ESTOURO: readonly (readonly [string, string, number, number, number])[] = [
  ["2%", "2%", 26, -14, -14],
  ["98%", "2%", 30, 14, -14],
  ["98%", "98%", 22, 14, 14],
  ["2%", "98%", 26, -14, 14],
  ["50%", "-1%", 18, 0, -18],
  ["50%", "101%", 18, 0, 18],
];

/**
 * Os brilhos que piscam na figurinha: x, y, lado (px), atraso (s). Período COMUM de 4,8 s com picos a
 * 2,4 / 3,6 / 4,8 / 6,0 s (o pico é 82% do ciclo: atraso = pico − 3,936 s): nunca dois no mesmo 1,2 s.
 * No celular, os três primeiros (o 4º é o último filho do escudo: `:last-child` some).
 */
const BRILHOS: readonly (readonly [string, string, number, number])[] = [
  ["97%", "4%", 30, -1.536],
  ["3%", "95%", 22, -0.336],
  ["-5%", "30%", 16, 0.864],
  ["104%", "66%", 18, 2.064],
];

/**
 * Cenário "album" — OS 5 FURIOSOS, «A Figurinha Brilhante»: a página do time no álbum de figurinhas,
 * de noite, debaixo do abajur. A folha anterior vira; o pôster (a FOTO DO TIME) desce da mão e cola na
 * vaga impressa, torta, soltando brilhos — o aro holográfico gira, uma faixa arco-íris atravessa; o
 * pacotinho rasgado mostra os versos; «OS 5» e as letras de FURIOSOS são colados no tapa (bafo). O
 * elenco são as figurinhas 5F 2–6 coladas nas vagas; o capitão é a BRILHANTE; a página fecha no
 * pacotinho «nas bancas» com o selo SABOR MEIO ROXO.
 */
export const ALBUM: CenarioDoTema = {
  classes: a,
  classesDaFicha: af,
  Fundo: () => (
    <>
      <div className={a.enfPagina} />
      <div className={a.enfRaios} />
      <div className={a.enfReticula} />
      <CincoF className={a.enfCincoF} />
      <div className={a.enfLuz} />
      <div className={a.enfFolhaSombra} />
      <div className={a.enfFolha} />
    </>
  ),
  // O picote da margem do álbum em cima e a fita holográfica colada embaixo.
  Moldura: () => (
    <>
      <span className={a.enfPicote} aria-hidden="true" />
      <span className={a.enfFitaHolo} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={a.enfHalo} aria-hidden="true" />
      <span className={a.enfVaga} aria-hidden="true" />
      <RotuloDaVaga className={a.enfRotuloVaga} />
      <Pacotinho className={a.enfPacote} id="furiosos-pacote" />
    </>
  ),
  NoEscudo: () => (
    <>
      <span className={a.enfAro} aria-hidden="true">
        <span className={a.enfAroGira} />
      </span>
      <span className={a.enfPapel} aria-hidden="true" />
      <span className={a.enfBafo} aria-hidden="true" />
      <span className={a.enfFaixa} aria-hidden="true" />
      <span className={a.enfVerniz} aria-hidden="true" />
      {ESTOURO.map(([x, y, t, dx, dy]) => (
        <span
          key={`estouro-${x}-${y}`}
          className={a.enfEstouro}
          aria-hidden="true"
          style={{ "--x": x, "--y": y, "--t": `${t}px`, "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties}
        />
      ))}
      {BRILHOS.map(([x, y, t, atraso]) => (
        <span
          key={`brilho-${x}-${y}`}
          className={a.enfBrilho}
          aria-hidden="true"
          style={{ "--x": x, "--y": y, "--t": `${t}px`, "--atraso": `${atraso}s` } as CSSProperties}
        />
      ))}
    </>
  ),
  // A sombra da figurinha no papel (longe na mão, encostada depois de colar).
  Chao: () => <span className={a.enfSombra} aria-hidden="true" />,
  Insignia: ({ className, id }) => <SeloBrilhante className={className} id={id} />,
  InsigniaMini: ({ className }) => <Brilho4 className={className} />,
  TracoDoNome: ({ className }) => <BrilhoNoSelo className={className} />,
  // As duas repetidas abertas em leque e a vaga do retrato (de trás para a frente).
  AtrasDoRetrato: () => (
    <>
      <VersoDeFigurinha className={cx(af.enfRepetida, af.enfRepetida1)} id="furiosos-repetida-1" />
      <VersoDeFigurinha className={cx(af.enfRepetida, af.enfRepetida2)} id="furiosos-repetida-2" />
      <span className={af.enfVagaRetrato} aria-hidden="true" />
    </>
  ),
  NaCartela: () => (
    <>
      <span className={a.enfBrilhoPacote} aria-hidden="true" />
      <span className={a.enfPicotePacote} aria-hidden="true" />
      <span className={a.enfRotuloPacote} aria-hidden="true" />
    </>
  ),
};
```

## Anexo B — `components/times/cenarios/ornamentos-album.tsx` (novo)

```tsx
import a from "@/components/times/cenarios/album.module.css";

/*
 * Os ornamentos SVG do cenário "album" (Os 5 Furiosos). Todos são ENFEITE: aria-hidden, focusable=false,
 * ids com prefixo. Os <text> («5F», «FOTO DO TIME», «FIGURINHAS») são impressão decorativa do álbum,
 * dentro de enfeite aria-hidden, como o neon dos Galácticos. As fontes vêm do CSS (classes
 * enfFonteTitulo/enfFonteAssinatura); o tamanho vem do atributo fontSize.
 */

type ComClasse = Readonly<{ className?: string }>;

/** Estrela de 16 pontas: o recorte creme (R 49, r 41) e o miolo holográfico (R 43, r 35), viewBox 100. */
const SELO_CREME =
  "M50 1L58 9.8L68.8 4.7L72.8 15.9L84.6 15.4L84.1 27.2L95.3 31.2L90.2 42L99 50L90.2 58L95.3 68.8L84.1 72.8L84.6 84.6L72.8 84.1L68.8 95.3L58 90.2L50 99L42 90.2L31.2 95.3L27.2 84.1L15.4 84.6L15.9 72.8L4.7 68.8L9.8 58L1 50L9.8 42L4.7 31.2L15.9 27.2L15.4 15.4L27.2 15.9L31.2 4.7L42 9.8Z";
const SELO_HOLO =
  "M50 7L56.8 15.7L66.5 10.3L69.4 20.9L80.4 19.6L79.1 30.6L89.7 33.5L84.3 43.2L93 50L84.3 56.8L89.7 66.5L79.1 69.4L80.4 80.4L69.4 79.1L66.5 89.7L56.8 84.3L50 93L43.2 84.3L33.5 89.7L30.6 79.1L19.6 80.4L20.9 69.4L10.3 66.5L15.7 56.8L7 50L15.7 43.2L10.3 33.5L20.9 30.6L19.6 19.6L30.6 20.9L33.5 10.3L43.2 15.7Z";
/** Estrela de 4 pontas côncava (o brilho), viewBox 100. */
const BRILHO_4 = "M50 20L57 43L80 50L57 57L50 80L43 57L20 50L43 43Z";
/** O pacotinho (viewBox 200×280): serrilhado de 4 em 4 (dentes de 8) em cima (22/30) e embaixo (262/270). */
const CORPO_PACOTE =
  "M4 30 L8 22 L12 30 L16 22 L20 30 L24 22 L28 30 L32 22 L36 30 L40 22 L44 30 L48 22 L52 30 L56 22 L60 30 L64 22 L68 30 L72 22 L76 30 L80 22 L84 30 L88 22 L92 30 L96 22 L100 30 L104 22 L108 30 L112 22 L116 30 L120 22 L124 30 L128 22 L132 30 L136 22 L140 30 L144 22 L148 30 L152 22 L156 30 L160 22 L164 30 L168 22 L172 30 L176 22 L180 30 L184 22 L188 30 L192 22 L196 30 L196 262 L192 270 L188 262 L184 270 L180 262 L176 270 L172 262 L168 270 L164 262 L160 270 L156 262 L152 270 L148 262 L144 270 L140 262 L136 270 L132 262 L128 270 L124 262 L120 270 L116 262 L112 270 L108 262 L104 270 L100 262 L96 270 L92 262 L88 270 L84 262 L80 270 L76 262 L72 270 L68 262 L64 270 L60 262 L56 270 L52 262 L48 270 L44 262 L40 270 L36 262 L32 270 L28 262 L24 270 L20 262 L16 270 L12 262 L8 270 L4 262 Z";
/** A tira que rasga: do topo (y 6) até o mesmo serrilhado do corpo, no mesmo viewBox. */
const TIRA =
  "M4 6 L196 6 L196 30 L192 22 L188 30 L184 22 L180 30 L176 22 L172 30 L168 22 L164 30 L160 22 L156 30 L152 22 L148 30 L144 22 L140 30 L136 22 L132 30 L128 22 L124 30 L120 22 L116 30 L112 22 L108 30 L104 22 L100 30 L96 22 L92 30 L88 22 L84 30 L80 22 L76 30 L72 22 L68 30 L64 22 L60 30 L56 22 L52 30 L48 22 L44 30 L40 22 L36 30 L32 22 L28 30 L24 22 L20 30 L16 22 L12 30 L8 22 L4 30 Z";

/** O «5F» gigante impresso na página: só o contorno (o traço vem do CSS). */
export function CincoF({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <text x="0" y="86">
        5F
      </text>
    </svg>
  );
}

/** A etiqueta impressa embaixo da vaga da foto do time: «5F 1» na caixinha lima e «FOTO DO TIME». */
export function RotuloDaVaga({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 190 20" aria-hidden="true" focusable="false">
      <rect width="44" height="20" rx="4" fill="#C8F54A" />
      <text className={a.enfFonteTitulo} x="22" y="15" textAnchor="middle" fontSize="14" fill="#1B0B3A">
        5F 1
      </text>
      <text className={a.enfFonteAssinatura} x="54" y="15" fontSize="12" letterSpacing="1.6" fill="#BBA9E0">
        FOTO DO TIME
      </text>
    </svg>
  );
}

/**
 * O pacotinho rasgado atrás da figurinha. De trás para a frente: os dois VERSOS (saem da boca na
 * entrada), o corpo laminado com o rótulo «5F / FIGURINHAS», e a TIRA rasgada (voa na entrada). Os três
 * SVG têm o mesmo viewBox: a tira encaixa no serrilhado do corpo.
 */
export function Pacotinho({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <div className={className} aria-hidden="true">
      <span className={a.enfVersos}>
        <svg viewBox="0 0 200 280" aria-hidden="true" focusable="false">
          <rect x="34" y="-6" width="118" height="150" rx="8" fill="#2B1460" stroke="#FFF6E6" strokeWidth="3" transform="rotate(-9 90 70)" />
          <g transform="rotate(6 110 60)">
            <rect x="52" y="-18" width="118" height="150" rx="8" fill="#3A1C7E" stroke="#FFF6E6" strokeWidth="3" />
            <text className={a.enfFonteTitulo} x="111" y="40" textAnchor="middle" fontSize="34" fill="#C8F54A">
              5F
            </text>
          </g>
        </svg>
      </span>
      <svg className={a.enfCorpoPacote} viewBox="0 0 200 280" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-laminado`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3A1A7A" />
            <stop offset=".35" stopColor="#8E5BFF" />
            <stop offset=".5" stopColor="#F2E6FF" />
            <stop offset=".62" stopColor="#7E44F0" />
            <stop offset="1" stopColor="#2A1060" />
          </linearGradient>
        </defs>
        <path d={CORPO_PACOTE} fill={`url(#${id}-laminado)`} stroke="#1A0838" strokeWidth="2" />
        <rect x="22" y="72" width="156" height="150" rx="10" fill="#1A0B33" fillOpacity=".9" />
        <text className={a.enfFonteTitulo} x="100" y="152" textAnchor="middle" fontSize="78" fill="#C8F54A">
          5F
        </text>
        <text className={a.enfFonteAssinatura} x="100" y="196" textAnchor="middle" fontSize="17" letterSpacing="2" fill="#FFF6E6">
          FIGURINHAS
        </text>
      </svg>
      <svg className={a.enfRasgo} viewBox="0 0 200 280" aria-hidden="true" focusable="false">
        <path d={TIRA} fill="#B88CFF" stroke="#1A0838" strokeWidth="2" />
      </svg>
    </div>
  );
}

/** A insígnia do capitão: o selo da BRILHANTE (16 pontas creme, miolo holográfico, brilho de 4 pontas). */
export function SeloBrilhante({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-holo`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF7AD9" />
          <stop offset=".3" stopColor="#FFD36E" />
          <stop offset=".5" stopColor="#B8FF6A" />
          <stop offset=".7" stopColor="#6AF2FF" />
          <stop offset="1" stopColor="#8A7DFF" />
        </linearGradient>
      </defs>
      <path d={SELO_CREME} fill="#FFF6E6" />
      <path d={SELO_HOLO} fill={`url(#${id}-holo)`} />
      <path d={BRILHO_4} fill="#FFFFFF" stroke="#1B0B3A" strokeWidth="3" strokeLinejoin="round" />
    </svg>
  );
}

/** A mesma insígnia, chapada e pequena: a estrela de 4 pontas (pinta com currentColor). */
export function Brilho4({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 1.5L14.6 9.4L22.5 12L14.6 14.6L12 22.5L9.4 14.6L1.5 12L9.4 9.4Z" fill="currentColor" />
    </svg>
  );
}

/** Os dois brilhinhos no canto do selo «OS 5» (o TracoDoNome). */
export function BrilhoNoSelo({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path className={a.enfBrilhoSeloA} d="M24 2L26.6 11.4L36 14L26.6 16.6L24 26L21.4 16.6L12 14L21.4 11.4Z" fill="#FFFFFF" />
      <path className={a.enfBrilhoSeloB} d="M9 22L10.3 26.7L15 28L10.3 29.3L9 34L7.7 29.3L3 28L7.7 26.7Z" fill="#FFF6E6" />
    </svg>
  );
}

/** O verso de uma figurinha (as «repetidas» da ficha): roxo listrado, borda creme, «5F» lima. 5:7. */
export function VersoDeFigurinha({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 100 140" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-listras`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="12" fill="#FFFFFF" fillOpacity=".05" />
        </pattern>
      </defs>
      <rect x="3" y="3" width="94" height="134" rx="10" fill="#3A1C7E" stroke="#FFF6E6" strokeWidth="6" />
      <rect x="3" y="3" width="94" height="134" rx="10" fill={`url(#${id}-listras)`} />
      <text className={a.enfFonteTitulo} x="50" y="84" textAnchor="middle" fontSize="44" fill="#C8F54A">
        5F
      </text>
    </svg>
  );
}
```

## Anexo C — `components/times/cenarios/album.module.css` (novo, completo)

```css
/*
 * Cenário "album" — OS 5 FURIOSOS, «A Figurinha Brilhante» (cenarios/album.tsx).
 *
 * Duas famílias de regra:
 *  - ENFEITES (`.enf…`, aria-hidden, sem texto de conteúdo): página impressa, folha que vira, picote,
 *    fita holográfica, vaga, pacotinho, aro holográfico, faixa de brilho, brilhos, rótulo do pacotinho.
 *  - GANCHOS: `.raiz` + o MESMO seletor da base (comCenario). Nada de @layer.
 * Conteúdo só anima transform, sem delay nem fill-mode, com a espera dentro do keyframe. Nenhuma regra
 * mistura `transform:` literal com translate/rotate/scale (o lightningcss do build descarta o individual).
 * Flashes (pequenos, ≤ 2 por segundo): o estouro da colada (0,99 s), os brilhinhos do selo (1,6 s e a
 * cada 6 s) e os quatro brilhos da figurinha (picos a 2,4 / 3,6 / 4,8 / 6,0 s, período comum de 4,8 s).
 */

/* A reserva da Lilita One (fontes-dos-temas.ts: `fallback`): Arial a 66% é MAIS ESTREITA que ela em todo
   caractere medido (pior caso o espaço: 0,278 × 0,66 = 0,183 contra 0,188 em; É 0,440 contra 0,488). */
@font-face {
  font-family: "Lilita One Caixa Alta";
  src: local("Arial"), local("ArialMT"), local("Helvetica"), local("Helvetica Neue"), local("Roboto"), local("Arimo"), local("Liberation Sans");
  size-adjust: 66%;
}

/* ======================================================================= raiz */
.raiz {
  --tm-titulo-estilo: normal;
  --tm-titulo-peso: 400;
  --tm-titulo-peso-medio: 400;
  /* Os tons que na RX são fixos (tema.module.css guarda os dela como padrão). */
  --tm-placa-topo: var(--tm-metal-luz);
  --tm-nick-meio: var(--tm-prata);
  --tm-nick-base: var(--tm-metal-alto);
  --tm-valor-base: var(--tm-metal-alto);
  --tm-etiqueta: var(--tm-tinta);
  --tm-foto-fundo: var(--tm-abismo);
  --tm-chip-capitao: var(--tm-texto);
  --tm-mono: var(--tm-acento);
  /* Do cenário: papel, vaga, folha anterior, luzes do pôster, holográfico. */
  --creme: #fff6e6;
  --papel: #fffdf8;
  --papel-sombra: #e9dfcc;
  --vaga: #33196a;
  --folha: #2c2442;
  --magenta: 255 79 176;
  --azul: 74 134 255;
  --holo-1: #ff7ad9;
  --holo-2: #ffd36e;
  --holo-3: #b8ff6a;
  --holo-4: #6af2ff;
  --holo-5: #8a7dff;
  --holo: conic-gradient(from 0deg, var(--holo-1), var(--holo-2), var(--holo-3), var(--holo-4), var(--holo-5), var(--holo-1));
  --holo-claro: linear-gradient(90deg, #ffd0f1, #fff3c4 30%, #d9ffb8 55%, #c9f8ff 78%, #d9d2ff);
  font-synthesis: none;
}
.enfFonteTitulo {
  font-family: var(--tm-fonte-titulo), "Arial Black", sans-serif;
}
.enfFonteAssinatura {
  font-family: var(--tm-fonte-assinatura), Arial, sans-serif;
  font-weight: 800;
}

/* ======================================================================= palco: a página do álbum */
/* A câmera: o álbum é ajeitado na mesa (a RX dá zoom; a QM desce de grua; o GdB entra pela porta). */
@keyframes ajeitaAlbum {
  from {
    transform: rotate(-1.2deg) scale(1.05);
  }
  to {
    transform: none;
  }
}
.raiz .enfCamera {
  animation: ajeitaAlbum 1600ms cubic-bezier(0.16, 1, 0.3, 1);
}
/* A página impressa: as luzes vermelha (magenta) e azul do palco do pôster, e o roxo subindo do pé. */
.enfPagina {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 46% at 8% 14%, rgb(var(--magenta) / 0.22), transparent 70%),
    radial-gradient(56% 46% at 92% 10%, rgb(var(--azul) / 0.24), transparent 70%),
    radial-gradient(70% 50% at 50% 112%, rgba(155, 92, 255, 0.2), transparent 70%),
    linear-gradient(180deg, #170a2d 0%, var(--tm-ceu) 34%, #1a0b33 72%, var(--tm-breu) 100%);
}
/* Raios impressos, centrados atrás da figurinha (o contêiner é centrado e vai até 1280: o centro do
   escudo cai em 50% + min(355px, 27vw) a partir de 900). Parados. */
.enfRaios {
  --cx: calc(50% + min(355px, 27vw));
  --cy: 56%;
  position: absolute;
  inset: 0;
  background: repeating-conic-gradient(from 0deg at var(--cx) var(--cy), rgba(220, 190, 255, 0.055) 0 4deg, transparent 4deg 12deg);
  -webkit-mask: radial-gradient(circle at var(--cx) var(--cy), #000 0 6%, transparent 62%);
  mask: radial-gradient(circle at var(--cx) var(--cy), #000 0 6%, transparent 62%);
}
@media (max-width: 899px) {
  .enfRaios {
    --cx: 50%;
    --cy: 35%;
  }
}
.enfReticula {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(233, 210, 255, 0.14) 0 1.1px, transparent 1.6px) 0 0 / 11px 11px;
  -webkit-mask: linear-gradient(200deg, transparent 40%, #000 92%);
  mask: linear-gradient(200deg, transparent 40%, #000 92%);
}
.enfCincoF {
  position: absolute;
  left: -3vw;
  bottom: -14vh;
  height: 78vh;
  width: auto;
  overflow: visible;
}
.enfCincoF text {
  font-family: var(--tm-fonte-titulo), "Arial Black", sans-serif;
  font-size: 100px;
  fill: none;
  stroke: rgba(220, 190, 255, 0.075);
  stroke-width: 1.2px;
}
@media (max-width: 599px) {
  .enfCincoF {
    height: 46vh;
    bottom: -8vh;
  }
}
/* O abajur. */
.enfLuz {
  position: absolute;
  inset: 0;
  background: radial-gradient(42% 36% at 28% 20%, rgba(255, 232, 200, 0.09), transparent 72%);
}
/* A folha anterior do álbum: cobre a página no quadro 0 e VIRA pela lombada (a borda esquerda). O estilo
   PARADO é a folha já virada (invisível): movimento reduzido e fim da entrada mostram a página. */
.enfFolha {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
  -webkit-backface-visibility: hidden;
  backface-visibility: hidden;
  background:
    radial-gradient(circle, rgba(230, 220, 255, 0.1) 0 1.1px, transparent 1.6px) 0 0 / 11px 11px,
    linear-gradient(90deg, rgba(0, 0, 0, 0.35), transparent 6%),
    linear-gradient(180deg, #332a4c, var(--folha) 60%, #241d38);
  transform: perspective(1800px) rotateY(-100deg);
  animation: folhaVira 1000ms cubic-bezier(0.5, 0, 0.35, 1);
}
/* As vagas vazias da página anterior (grade de linhas fracas). */
.enfFolha::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(90deg, transparent 0 4%, rgba(255, 255, 255, 0.07) 4% calc(4% + 2px), transparent calc(4% + 2px) 22%),
    repeating-linear-gradient(180deg, transparent 0 8%, rgba(255, 255, 255, 0.07) 8% calc(8% + 2px), transparent calc(8% + 2px) 34%);
}
.enfFolha::after {
  content: "";
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.55));
  animation: folhaEscurece 1000ms cubic-bezier(0.5, 0, 0.35, 1);
}
@keyframes folhaVira {
  0%,
  10% {
    transform: perspective(1800px) rotateY(0deg);
  }
  100% {
    transform: perspective(1800px) rotateY(-100deg);
  }
}
@keyframes folhaEscurece {
  0%,
  10% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
/* A sombra que a folha joga na página nova, varrendo da direita para a esquerda. */
.enfFolhaSombra {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 40%;
  background: linear-gradient(90deg, transparent, rgba(5, 0, 12, 0.45) 70%, transparent);
  transform: translateX(110%);
  animation: sombraDaFolha 1000ms cubic-bezier(0.5, 0, 0.35, 1);
}
@keyframes sombraDaFolha {
  0%,
  10% {
    transform: translateX(30%);
  }
  100% {
    transform: translateX(-260%);
  }
}

/* ======================================================================= moldura */
/* (aqui, e não em .raiz: a base declara --barra em .raiz com a mesma especificidade) */
.raiz .heroi {
  --barra: clamp(14px, 2.4vw, 32px);
}
/* O picote da margem do álbum: furos a cada 12 px e o fio lima. Desliza junto com a folha. */
.enfPicote {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 3;
  height: var(--barra);
  pointer-events: none;
  background:
    radial-gradient(circle 3px at 50% calc(100% - 7px), var(--tm-breu) 0 2.4px, transparent 3px) 0 0 / 12px 100% repeat-x,
    linear-gradient(var(--tm-acento), var(--tm-acento)) 0 calc(100% - 1px) / 100% 1px no-repeat,
    linear-gradient(180deg, #140928, #1b0c34);
  animation: picoteEntra 1000ms cubic-bezier(0.5, 0, 0.35, 1);
}
@keyframes picoteEntra {
  0%,
  10% {
    transform: translateX(100%);
  }
  100% {
    transform: none;
  }
}
/* A fita holográfica embaixo: colada da esquerda, depois corre devagar. */
.enfFitaHolo {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  height: 5px;
  overflow: hidden;
  pointer-events: none;
  transform-origin: 0 50%;
  animation: fitaCola 1100ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.enfFitaHolo::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 200%;
  background: linear-gradient(90deg, var(--holo-1), var(--holo-2), var(--holo-3), var(--holo-4), var(--holo-5), var(--holo-1), var(--holo-2), var(--holo-3), var(--holo-4), var(--holo-5), var(--holo-1));
  animation: fitaCorre 10s linear infinite;
}
@keyframes fitaCola {
  0%,
  30% {
    transform: scaleX(0);
  }
  100% {
    transform: none;
  }
}
@keyframes fitaCorre {
  to {
    transform: translateX(-50%);
  }
}

/* ======================================================================= herói: a colagem */
/* Sem tremor (quem bate é a figurinha). */
.raiz .heroiGrade {
  --escudo: clamp(200px, 60vw, 250px);
  animation-name: none;
}
.raiz .blocoEscudo {
  margin-top: calc(var(--escudo) * 0.08);
  margin-bottom: calc(var(--escudo) * 0.24);
}
@media (min-width: 600px) and (max-width: 899px) {
  .raiz .heroiGrade {
    --escudo: clamp(240px, min(40vw, 36svh), 300px);
  }
}
@media (min-width: 900px) {
  .raiz .heroiGrade {
    --escudo: clamp(280px, min(27vw, 46svh), 400px);
    grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr);
  }
  .raiz .blocoEscudo {
    margin-top: calc(var(--escudo) * 0.1);
    margin-bottom: calc(var(--escudo) * 0.2);
  }
  /* As margens da base são do chão espelhado da RX. */
  .raiz .blocoTexto {
    margin-top: 0;
    margin-bottom: 0;
  }
}

/* -------------------------------------------- atrás do escudo: halo, vaga, etiqueta, pacotinho */
.enfHalo {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: 180%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(199, 125, 255, 0.42), rgba(106, 242, 255, 0.09) 46%, rgba(255, 122, 217, 0.08) 60%, transparent 72%);
  animation: haloNasce 1400ms cubic-bezier(0.16, 1, 0.3, 1), haloDoAlbum 6s ease-in-out 1400ms infinite alternate;
}
@keyframes haloNasce {
  from {
    transform: scale(0.7);
  }
  to {
    transform: none;
  }
}
@keyframes haloDoAlbum {
  from {
    scale: 1;
  }
  to {
    scale: 1.06;
  }
}
/* A vaga impressa da FOTO DO TIME: colada torta, a vaga aparece em L no alto à esquerda. */
.enfVaga {
  position: absolute;
  inset: 0;
  z-index: 0;
  translate: -6% -5%;
  border-radius: 12%;
  pointer-events: none;
  background: var(--vaga);
  box-shadow: inset 0 0 0 1px rgba(10, 4, 20, 0.7);
}
.enfVaga::before {
  content: "";
  position: absolute;
  inset: 2.2%;
  border-radius: 10.5%;
  border: 2px dashed rgba(255, 246, 230, 0.32);
}
.enfRotuloVaga {
  position: absolute;
  left: -6%;
  top: calc(100% + 14px);
  z-index: 0;
  height: 20px;
  width: auto;
  overflow: visible;
  pointer-events: none;
}
@media (min-width: 900px) {
  .enfRotuloVaga {
    left: auto;
    right: 0;
  }
}
/* O pacotinho rasgado: canto de BAIXO à direita no celular, de CIMA à direita no computador. */
.enfPacote {
  position: absolute;
  z-index: 0;
  right: -20%;
  bottom: -8%;
  width: 36%;
  rotate: 13deg;
  pointer-events: none;
  animation: pacoteBalanca 1300ms cubic-bezier(0.2, 0.8, 0.3, 1);
}
@media (min-width: 900px) {
  .enfPacote {
    right: -12%;
    bottom: auto;
    top: -12%;
    width: 34%;
    rotate: 16deg;
  }
}
@media (min-width: 1360px) {
  .enfPacote {
    right: -24%;
    width: 40%;
  }
}
@keyframes pacoteBalanca {
  0%,
  14% {
    transform: rotate(5deg);
  }
  40% {
    transform: rotate(-2deg);
  }
  100% {
    transform: none;
  }
}
/* O corpo tem classe PRÓPRIA: um `.enfPacote > svg` (0,1,1) venceria o `.enfRasgo` (0,1,0) e a tira cairia
   embaixo do pacote, em vez de por cima (achado no harness com o CSS real). */
.enfCorpoPacote {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
.enfVersos {
  position: absolute;
  inset: 0;
  animation: versosSaem 1300ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.enfVersos > svg {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}
@keyframes versosSaem {
  0%,
  24% {
    transform: translateY(28%);
  }
  100% {
    transform: none;
  }
}
.enfRasgo {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: auto;
  overflow: visible;
  opacity: 0;
  transform-origin: 50% 6%;
  animation: rasgoVoa 900ms cubic-bezier(0.3, 0.7, 0.4, 1);
}
@keyframes rasgoVoa {
  0%,
  16% {
    transform: none;
    opacity: 1;
  }
  100% {
    transform: translate(-34%, -30%) rotate(-38deg);
    opacity: 0;
  }
}

/* -------------------------------------------- a figurinha: COLA na vaga */
@keyframes colaFoto {
  0%,
  40% {
    transform: translate3d(-5%, -8%, 0) rotate(-7deg) scale(1.07);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  55% {
    transform: translate3d(0.4%, 0.6%, 0) rotate(0.8deg) scale(0.975);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  68% {
    transform: rotate(-0.3deg) scale(1.012);
  }
  100% {
    transform: none;
  }
}
.raiz .escudo {
  transform-origin: 50% 50%;
  animation: colaFoto 1500ms linear;
}
/* O aro holográfico: um cone arco-íris girando ATRÁS da foto, visível só na borda. */
.enfAro {
  position: absolute;
  inset: -2.4%;
  z-index: -2;
  border-radius: 12.6%;
  overflow: hidden;
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}
.enfAroGira {
  position: absolute;
  inset: -35%;
  background: var(--holo);
  animation: aroGira 14s linear infinite;
}
@keyframes aroGira {
  to {
    transform: rotate(360deg);
  }
}
/* O papel creme do adesivo (preenche os cantos transparentes do webp). */
.enfPapel {
  position: absolute;
  inset: -0.7%;
  z-index: -1;
  border-radius: 11.8%;
  pointer-events: none;
  background: linear-gradient(160deg, var(--papel), var(--papel-sombra));
}
/* O ar que sai de baixo na colada. */
.enfBafo {
  position: absolute;
  inset: -4%;
  z-index: -3;
  border-radius: 15%;
  pointer-events: none;
  opacity: 0;
  box-shadow: 0 0 0 2px rgba(255, 246, 230, 0.45), 0 0 22px 6px rgba(226, 198, 255, 0.28);
  animation: bafoSopra 1500ms cubic-bezier(0.15, 0.7, 0.2, 1);
}
@keyframes bafoSopra {
  0%,
  54% {
    transform: scale(0.9);
    opacity: 0;
  }
  57% {
    opacity: 0.8;
  }
  100% {
    transform: scale(1.22);
    opacity: 0;
  }
}
/* O reflexo do papel brilhante: faixa arco-íris estreita (color-dodge, só clareia), logo depois da
   colada e a cada 7 s. A inclinação mora DENTRO do transform. */
.enfFaixa {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 11.25%;
  overflow: hidden;
  pointer-events: none;
  mix-blend-mode: color-dodge;
}
.enfFaixa::before {
  content: "";
  position: absolute;
  top: -25%;
  bottom: -25%;
  left: 0;
  width: 34%;
  opacity: 0.32;
  background: linear-gradient(90deg, transparent, var(--holo-1) 22%, var(--holo-2) 36%, var(--holo-3) 50%, var(--holo-4) 64%, var(--holo-5) 78%, transparent);
  transform: rotate(18deg) translateX(-120%);
  animation: faixaPassa 7s cubic-bezier(0.4, 0, 0.3, 1) infinite;
}
@keyframes faixaPassa {
  0%,
  12% {
    transform: rotate(18deg) translateX(-120%);
  }
  30%,
  100% {
    transform: rotate(18deg) translateX(330%);
  }
}
.enfVerniz {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 11.25%;
  pointer-events: none;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.2) 0 11%, transparent 26%, transparent 74%, rgba(255, 255, 255, 0.07) 85%, transparent);
}
/* Estrelas de 4 pontas (forma por clip-path ESTÁTICO). Centradas por margem negativa: o estado parado é
   transform: scale(0), e um translate na mesma regra sumiria no build. */
.enfEstouro,
.enfBrilho {
  position: absolute;
  left: var(--x);
  top: var(--y);
  z-index: 3;
  width: var(--t);
  height: var(--t);
  margin: calc(var(--t) / -2) 0 0 calc(var(--t) / -2);
  pointer-events: none;
  clip-path: polygon(50% 0, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0 50%, 39% 39%);
  background: radial-gradient(closest-side, #fff 0 40%, #f3e8ff 70%, #d9c2ff);
  transform: scale(0);
}
.enfEstouro {
  animation: estoura 1500ms cubic-bezier(0.2, 0.8, 0.3, 1);
}
@keyframes estoura {
  0%,
  55% {
    transform: translate(0, 0) scale(0);
  }
  66% {
    transform: translate(var(--dx), var(--dy)) scale(1.1);
  }
  100% {
    transform: translate(calc(var(--dx) * 1.6), calc(var(--dy) * 1.6)) scale(0) rotate(45deg);
  }
}
/* var() no shorthand atrapalha o CSS Modules: longhands. Atraso só em enfeite. */
.enfBrilho {
  animation-name: pisca;
  animation-duration: 4.8s;
  animation-timing-function: ease-in-out;
  animation-delay: var(--atraso);
  animation-iteration-count: infinite;
}
@keyframes pisca {
  0%,
  70%,
  100% {
    transform: scale(0) rotate(0deg);
  }
  82% {
    transform: scale(1) rotate(0deg);
  }
  90% {
    transform: scale(0.4) rotate(30deg);
  }
}
@media (max-width: 599px) {
  .enfBrilho:last-child {
    display: none;
  }
}
/* A sombra no papel (peça Chao): longe e fraca na mão, encostada depois da colada. */
.enfSombra {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: 12%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(5, 0, 12, 0.75), rgba(5, 0, 12, 0.45) 70%, transparent);
  transform: translate(2%, 3%) scale(1.04);
  animation: sombraCola 1500ms linear;
}
@keyframes sombraCola {
  0%,
  40% {
    transform: translate(9%, 12%) scale(1.12);
    opacity: 0.45;
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  55%,
  100% {
    transform: translate(2%, 3%) scale(1.04);
    opacity: 1;
  }
}

/* ======================================================================= texto do herói */
/* Kicker e créditos não sobem (o .sobe da base os desceria 14 px no quadro 0, em cima do selo). Vale
   também para o kicker da ficha (o nick erguido encostaria). */
.raiz .kicker {
  text-wrap: balance;
  animation-name: none;
}
.raiz .nomesDoElenco {
  animation-name: none;
}

/* -------------------------------------------- título: OS 5 em cima, FURIOSOS em adesivos */
/* Pela largura MEDIDA da maior palavra (--largura-em, lib/temas/metricas.ts): FURIOSOS = 5,353 em. */
.raiz .tituloVisual {
  --tm-titulo-max: 120px;
  --tam: clamp(40px, calc(100cqi / var(--largura-em, calc(var(--letras) * 0.7))), var(--tm-titulo-max));
  flex-direction: column-reverse;
  margin-top: max(18px, calc(var(--tam) * 0.2));
}
@media (min-width: 600px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(150px, 18svh);
  }
}
@media (min-width: 900px) {
  .raiz .tituloVisual {
    align-items: flex-start;
  }
}
@media (min-width: 1024px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(176px, 20svh);
  }
}
.raiz .marca {
  font-size: var(--tam);
  line-height: 1;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: normal;
  font-kerning: none;
  font-variant-ligatures: none;
  padding: 0 0.1em 0 0.04em;
  animation: none;
}
.raiz .palavra {
  display: inline-block;
  white-space: nowrap;
}
@keyframes bafo {
  0%,
  60% {
    transform: translate3d(0, -0.03em, 0) rotate(7deg) scale(1.08);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  70% {
    transform: translate3d(0, 0.02em, 0) scale(1.06, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  80% {
    transform: scale(0.97, 1.04);
  }
  90% {
    transform: scale(1.01);
  }
  100% {
    transform: none;
  }
}
/* Cada letra é um adesivo: giro estático (rotate) + a colada (transform). A cascata sai da DURAÇÃO:
   batida a 70% → F aos 1050 ms, cada letra 70 ms depois; a 8ª aos 1540. */
.raiz .letra {
  display: inline-grid;
  rotate: var(--giro, 0deg);
  transform-origin: 50% 20%; /* pivô perto do topo das maiúsculas: no quadro 0 a letra cresce para BAIXO, longe do selo */
  animation-name: bafo;
  animation-duration: calc(1500ms + var(--i, 0) * 100ms);
  animation-timing-function: linear;
}
.raiz .letra > * {
  grid-area: 1 / 1;
}
.raiz .letra:nth-child(8n + 1) {
  --giro: -4deg;
}
.raiz .letra:nth-child(8n + 2) {
  --giro: 3deg;
}
.raiz .letra:nth-child(8n + 3) {
  --giro: -2deg;
}
.raiz .letra:nth-child(8n + 4) {
  --giro: 4deg;
}
.raiz .letra:nth-child(8n + 5) {
  --giro: -3deg;
}
.raiz .letra:nth-child(8n + 6) {
  --giro: 2deg;
}
.raiz .letra:nth-child(8n + 7) {
  --giro: -4deg;
}
.raiz .letra:nth-child(8n) {
  --giro: 3deg;
}
/* Folga de tinta para o recorte e os acentos (o background-clip nunca corta o Â). */
.raiz .eco,
.raiz .cromo {
  padding: 0.3em 0.14em 0.24em;
  margin: -0.3em -0.14em -0.24em;
}
/* O RECORTE creme: traço de 0,16 em centrado no contorno; o cromo esconde a metade de dentro. */
.raiz .eco {
  position: static;
  inset: auto;
  z-index: auto;
  color: var(--creme);
  -webkit-text-stroke: 0.16em var(--creme);
  text-shadow: 0 0.05em 0 rgba(27, 11, 58, 0.55), 0 0.1em 0.14em rgba(0, 0, 0, 0.5);
  user-select: none;
}
/* A tinta garantida: vinil sólido. */
.raiz .cromo {
  color: var(--tm-metal-meio);
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  /* O vinil: na caixa da letra (1,54 em) o topo das maiúsculas fica a 29% e a linha de base a 75%. */
  .raiz .cromo {
    background-image: linear-gradient(180deg, var(--tm-metal-meio) 0 29%, var(--tm-metal-fundo) 48%, var(--tm-metal-base) 64%, var(--tm-metal-sombra) 75% 100%);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: 0 0;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: none;
  }
}

/* -------------------------------------------- OS 5: o selo lima */
@keyframes bafoSelo {
  0%,
  60% {
    transform: translate3d(-4%, -6%, 0) rotate(-3deg) scale(1.06);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  70% {
    transform: translate3d(0, 4%, 0) scale(1.08, 0.88);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  80% {
    transform: scale(0.97, 1.03);
  }
  100% {
    transform: none;
  }
}
.raiz .assinatura {
  align-self: flex-start;
  margin: 0 0 max(10px, calc(var(--tam) * 0.14)) 0.04em; /* a folga que o quadro 0 pede: tinta em comum com as letras = 0 (medido de 320 a 1440) */
  animation: bafoSelo 1400ms linear;
}
.raiz .pincel {
  transform: rotate(-7deg);
  padding: 0.16em 0.5em 0.1em;
  border-radius: 999px;
  background: var(--tm-acento);
  color: var(--tm-tinta);
  font: 400 max(22px, calc(var(--tam) * 0.34)) / 1 var(--tm-fonte-titulo), "Arial Black", sans-serif;
  letter-spacing: 0.05em;
  font-kerning: none;
  text-shadow: none;
  box-shadow: 0 0 0 0.1em var(--creme), 0 0.12em 0.18em rgba(0, 0, 0, 0.45);
}
/* Os dois brilhinhos do selo (TracoDoNome): no canto de cima à direita. */
.raiz .assinatura .enfTraco {
  position: absolute;
  top: -0.5em;
  right: -0.55em;
  width: 1.3em;
  height: 1.3em;
  margin: 0;
  font-size: max(22px, calc(var(--tam) * 0.34));
  animation: none;
}
.enfBrilhoSeloA,
.enfBrilhoSeloB {
  transform-box: fill-box;
  transform-origin: center;
  transform: scale(0);
  animation: brilhoDoSelo 6s ease-out infinite;
}
/* 1º pico aos 1,6 s (26,7% de 6 s), os dois juntos: um flash só. */
@keyframes brilhoDoSelo {
  0%,
  22% {
    transform: scale(0) rotate(0deg);
  }
  26.7% {
    transform: scale(1.15) rotate(20deg);
  }
  32%,
  100% {
    transform: scale(0) rotate(45deg);
  }
}

/* -------------------------------------------- o lema: balão de fala */
@keyframes balaoPula {
  0%,
  74% {
    transform: translate3d(0, 10px, 0) scale(0.9) rotate(-5deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1.2);
  }
  86% {
    transform: scale(1.04) rotate(0.6deg);
  }
  100% {
    transform: none;
  }
}
.raiz .lema {
  position: relative;
  width: fit-content;
  max-width: min(100%, 24em);
  margin: clamp(20px, 2.4vw, 28px) auto 0;
  padding: 0.62em 1.1em 0.56em;
  border-radius: 22px;
  background: var(--papel);
  color: var(--tm-tinta);
  font: 800 clamp(15px, 1.25vw, 18px) / 1.2 var(--tm-fonte-assinatura), Arial, sans-serif;
  letter-spacing: 0.01em;
  text-wrap: balance;
  rotate: -1.5deg; /* estático; a entrada é transform */
  box-shadow: 0 0 0 4px var(--creme), 0 0 0 6px rgba(27, 11, 58, 0.55), 0 12px 22px -10px #000;
  animation: balaoPula 2000ms linear;
}
/* No computador o balão encosta à esquerda, com o título (DEPOIS da regra acima: mesma especificidade). */
@media (min-width: 900px) {
  .raiz .lema {
    margin-inline: 0;
  }
}
/* O rabinho do balão (forma por clip-path estático). */
.raiz .lema::after {
  content: "";
  position: absolute;
  left: 30px;
  top: calc(100% - 2px);
  width: 22px;
  height: 18px;
  background: var(--papel);
  clip-path: polygon(0 0, 100% 0, 8% 100%);
}

/* -------------------------------------------- chips: pílulas de adesivo */
.raiz .chip::before {
  transform: none;
  border-radius: 12px;
}
.raiz .chipPts::before {
  rotate: -2deg;
  background: linear-gradient(180deg, var(--tm-metal-luz), var(--tm-metal-placa));
  box-shadow: 0 0 0 3px var(--creme), 0 6px 14px -6px #000;
}
.raiz .chipCapitao::before {
  border: 0;
  background: var(--tm-abismo);
  box-shadow: inset 0 0 0 1px rgba(200, 245, 74, 0.55);
}
.raiz .chipCapitao .coroaMini {
  color: var(--tm-acento);
}
.raiz .chipOpgg::before {
  border: 2px solid var(--tm-neon);
  background: rgba(18, 8, 31, 0.55);
}
.raiz .chipOpgg:hover::before {
  background: var(--tm-royal);
}
/* Nick de capitão longo: o chip vira texto corrido (em bloco, não flex: a leitura não zigue-zagueia). */
@media (max-width: 419px) {
  .raiz .blocoTexto .chipCapitao {
    flex: 1 1 100%;
    display: block;
    padding-block: 12px;
    line-height: 1.6;
    white-space: normal;
    overflow-wrap: anywhere;
    text-wrap: balance;
    text-align: center;
  }
  .raiz .blocoTexto .chipCapitao > svg {
    display: inline-block;
    vertical-align: -3px;
    margin-right: 8px;
  }
}

/* ======================================================================= elenco: as figurinhas */
.raiz .elencoSecao {
  padding-bottom: clamp(56px, 7vw, 96px);
}
.raiz .estrelando {
  margin-top: clamp(8px, 1.4vw, 18px);
  font-size: clamp(24px, 2.8vw, 38px);
  letter-spacing: 0.04em;
  color: var(--creme);
}
/* A linha de recorte. */
.raiz .estrelando::after {
  height: 2px;
  background: repeating-linear-gradient(90deg, rgba(255, 246, 230, 0.55) 0 10px, transparent 10px 16px);
}
.raiz .aviso {
  margin-top: -10px;
  font: 700 clamp(14px, 1.2vw, 16px) / 1.4 var(--tm-fonte-assinatura), Arial, sans-serif;
  color: var(--tm-apoio);
}
.raiz .aviso::before {
  content: "!" / "";
  display: inline-grid;
  place-items: center;
  width: 18px;
  height: 18px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--tm-acento);
  color: var(--tm-tinta);
  font: 400 13px / 1 var(--tm-fonte-titulo), sans-serif;
  vertical-align: 1px;
}
/* A 1ª figurinha é a 5F 2 (a 5F 1 é a foto do time, lá em cima). */
.raiz .elenco {
  counter-reset: figurinha 1;
}
@media (min-width: 600px) and (max-width: 1023px) {
  .raiz .elenco {
    row-gap: 34px; /* o selo do capitão */
  }
}
/* A casca fica parada (vence as duas animações da base): quem anda é a carta. O ::before é a VAGA. */
.raiz .casca {
  counter-increment: figurinha;
  border-radius: 12px; /* o anel de foco acompanha */
  animation: none;
}
.raiz .casca::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  translate: -6px -6px;
  border-radius: 12px;
  pointer-events: none;
  background: var(--vaga);
  box-shadow: inset 0 0 0 1px rgba(10, 4, 20, 0.7), inset 0 0 0 4px rgba(255, 246, 230, 0.1);
}
/* A colada: de baixo (de cima, cobriria o rodapé da linha anterior), achata e assenta. */
@keyframes figurinhaCola {
  from {
    transform: translate3d(-4px, 18px, 0) scale(1.04);
  }
  70% {
    transform: translate3d(0, 1px, 0) scale(0.985);
  }
  to {
    transform: none;
  }
}
@keyframes figurinhaColaRelogio {
  0%,
  60% {
    transform: translate3d(-4px, 18px, 0) scale(1.04);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  80% {
    transform: translate3d(0, 1px, 0) scale(0.985);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  100% {
    transform: none;
  }
}
/* O papel do adesivo. */
.raiz .carta {
  container-type: inline-size;
  clip-path: none;
  padding: 2px;
  border-radius: 12px;
  background: linear-gradient(160deg, var(--papel), var(--papel-sombra));
  animation-name: figurinhaColaRelogio;
  animation-duration: calc(2000ms + var(--i, 0) * 140ms);
  animation-timing-function: linear;
}
@supports (animation-timeline: view()) {
  .raiz .carta {
    animation: figurinhaCola linear; /* o shorthand primeiro: ele zera a timeline */
    animation-timeline: view();
    animation-range: entry 0% entry calc(60% + var(--col, 0) * 12%);
  }
}
@media (min-width: 1024px) {
  @supports (animation-timeline: view()) {
    .raiz .carta {
      animation-range: entry 0% entry calc(50% + var(--i, 0) * 8%);
    }
  }
}
/* A moldura impressa da figurinha. */
.raiz .miolo {
  clip-path: none;
  overflow: hidden;
  border-radius: 10px;
  padding: 6px 6px 0;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0 5px, transparent 5px 10px),
    linear-gradient(180deg, #4b22a6, var(--tm-abismo));
}
.raiz .foto {
  aspect-ratio: 5 / 7;
  border-radius: 6px;
  background: var(--tm-abismo);
}
.raiz .foto img {
  filter: none;
}
.raiz .enfGradacao {
  border-radius: 6px;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.18) 0 10%, transparent 26%),
    linear-gradient(180deg, transparent 52%, rgba(18, 8, 31, 0.5) 78%, rgba(18, 8, 31, 0.88) 100%);
}
.raiz .enfRotaGigante {
  display: none;
}
/* O texto sobre a foto (sem position: o link esticado se mede pelo .miolo). */
.raiz .sobreFoto {
  padding: 8px 8px 0;
}
.raiz .etiquetaRota {
  --tm-icone: var(--tm-tinta);
  border: 0;
  border-radius: 999px;
  padding: 4px 8px 3px 7px;
  background: var(--tm-acento);
  color: var(--tm-tinta);
  font: 400 10.5px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.06em;
  box-shadow: 0 0 0 2px var(--creme), 0 2px 6px rgba(0, 0, 0, 0.45);
}
/* A faixa do nome, de ponta a ponta da foto. Só fundo, margem e padding (caminho do link). */
.raiz .identidade {
  margin: 0 -8px;
  padding: 8px 10px 9px;
  gap: 5px;
  background: linear-gradient(90deg, var(--tm-royal), #3a1a90 70%, rgba(58, 26, 144, 0.92));
}
/* O nick pela palavra mais larga do ELENCO, medida (--maior-palavra-em: BONTEMPO = 5,886 em). SEM
   filter, transform, position: é o pai do link da carta. */
.raiz .nick {
  --nick: clamp(15px, calc((100cqi - 24px) / var(--maior-palavra-em, 7)), 24px);
  padding: 0.08em 0.1em 0.06em 0;
  margin-right: 0;
  background: none;
  -webkit-text-fill-color: currentColor;
  color: var(--creme);
  letter-spacing: 0.02em;
  line-height: 1.02;
  font-kerning: none;
  font-variant-ligatures: none;
  text-wrap: balance;
  text-shadow: 0 2px 0 rgba(27, 11, 58, 0.6);
}
.raiz .placaCapitao {
  border-radius: 999px;
  padding: 3px 9px 2px;
  background: var(--holo-claro);
  color: var(--tm-tinta);
  font: 400 10px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.08em;
  box-shadow: 0 0 0 1.5px var(--creme);
}
.raiz .placaCapitao .coroaMini {
  width: 12px;
}
/* A linha impressa: código 5F n, nome, «FICHA →». Sem espaço, o «FICHA →» desce. */
.raiz .rodape {
  flex-wrap: wrap;
  justify-content: flex-start; /* a base usa space-between: com quebra, o nome ia para a direita */
  gap: 4px 6px;
  padding: 7px 4px 8px;
  border-top: 0;
}
.raiz .rodape::before {
  content: "5F " counter(figurinha) / "";
  flex: 0 0 auto;
  padding: 3px 6px 2px;
  border-radius: 4px;
  background: var(--creme);
  color: var(--tm-tinta);
  font: 400 11px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.04em;
}
.raiz .nome {
  overflow: visible;
  white-space: normal;
  text-overflow: clip;
  overflow-wrap: break-word;
  color: var(--tm-prata);
  font: 700 12px / 1.15 var(--tm-fonte-assinatura), Arial, sans-serif;
}
.raiz .ficha {
  margin-left: auto;
  color: var(--tm-acento);
  font: 400 11px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.06em;
}
/* A sombra da figurinha (o halo da base). Cola junto com a carta, pela rolagem dela. */
.raiz .enfHaloCarta {
  inset: 10px -2px -8px 8px;
  border-radius: 14px;
  background: radial-gradient(closest-side, rgba(5, 0, 12, 0.7), rgba(5, 0, 12, 0.35) 70%, transparent);
  transform: none;
}
@keyframes sombraFigurinha {
  from {
    transform: translate(8px, 22px) scale(1.06);
    opacity: 0.35;
  }
  70% {
    transform: translate(2px, 4px);
    opacity: 0.9;
  }
  to {
    transform: none;
    opacity: 1;
  }
}
@supports (animation-timeline: view()) {
  .raiz .casca:not(.cascaCapitao) .enfHaloCarta {
    animation: sombraFigurinha linear;
    animation-timeline: view();
    animation-range: entry 0% entry calc(60% + var(--col, 0) * 12%);
  }
}
/* Hover/foco: a figurinha DESCOLA (a casca, a vaga e o anel ficam). */
@media (hover: hover) and (pointer: fine) {
  .raiz .casca:hover,
  .raiz .casca:has(.link:focus-visible) {
    translate: none;
  }
  .raiz .carta {
    transition: translate 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), rotate 0.28s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .raiz .casca:hover .carta,
  .raiz .casca:has(.link:focus-visible) .carta {
    translate: 0 -7px;
    rotate: -1.2deg;
  }
  .raiz .casca:hover .enfHaloCarta,
  .raiz .casca:has(.link:focus-visible) .enfHaloCarta {
    transform: translate(4px, 10px) scale(1.04);
  }
}
@media (hover: hover) and (pointer: fine) and (min-width: 1024px) {
  .raiz .cascaCapitao:hover,
  .raiz .cascaCapitao:has(.link:focus-visible) {
    translate: 0 -14px; /* o erguido da base, sem os −22 px */
  }
}

/* -------------------------------------------- o capitão: a BRILHANTE */
/* A moldura arco-íris anda: um cone girando por baixo do papel, visível nos 3 px da borda. */
.raiz .cascaCapitao .carta {
  overflow: hidden;
  isolation: isolate;
  padding: 3px;
  background: var(--papel);
}
.raiz .cascaCapitao .carta::before {
  content: "";
  position: absolute;
  inset: -40%;
  z-index: -1;
  background: var(--holo);
  animation: aroGira 14s linear infinite;
}
.raiz .cascaCapitao .miolo {
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0 5px, transparent 5px 10px),
    linear-gradient(180deg, #6a2fd0, #2e1170);
}
.raiz .cascaCapitao .identidade {
  background: linear-gradient(90deg, var(--tm-metal-fundo), #4b1fb0 70%);
}
.raiz .cascaCapitao .enfHaloCarta {
  background: radial-gradient(closest-side, rgba(199, 125, 255, 0.55), rgba(106, 242, 255, 0.18) 60%, transparent);
}
/* O papel brilhante: a faixa arco-íris passa a cada 7 s (o reflexo do hover fica com os outros). */
.raiz .cascaCapitao .enfVarredura {
  inset: -10% -80%;
  mix-blend-mode: color-dodge;
  background: linear-gradient(100deg, transparent 38%, rgba(255, 122, 217, 0.5) 44%, rgba(255, 211, 110, 0.5) 48%, rgba(184, 255, 106, 0.5) 52%, rgba(106, 242, 255, 0.5) 56%, transparent 62%);
  animation: holoPassa 7s cubic-bezier(0.3, 0.1, 0.2, 1) infinite;
}
@keyframes holoPassa {
  0%,
  55% {
    transform: translateX(-100%);
  }
  80%,
  100% {
    transform: translateX(100%);
  }
}
/* O selo-estrela girando devagar (a partir de −8°). */
@keyframes seloGira {
  from {
    transform: rotate(-8deg);
  }
  to {
    transform: rotate(352deg);
  }
}
.raiz .coroaDoCapitao {
  width: 56px;
  top: -30px;
  filter: drop-shadow(0 6px 8px rgba(0, 0, 0, 0.55));
  animation: seloGira 30s linear infinite;
}
@media (max-width: 599px) {
  .raiz .coroaDoCapitao {
    width: 48px;
    top: -26px;
  }
}

/* Celular: o capitão DEITADO na largura toda (foto à esquerda, texto à direita). */
@media (max-width: 599px) {
  .raiz .cascaLarga {
    margin-top: 26px;
  }
  .raiz .cascaLarga .miolo {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr);
    grid-template-rows: 1fr auto;
    padding: 6px;
  }
  .raiz .cascaLarga .foto {
    grid-area: 1 / 1 / 3 / 2;
    aspect-ratio: 5 / 7;
  }
  .raiz .cascaLarga .sobreFoto {
    display: contents;
  }
  .raiz .cascaLarga .topo {
    grid-area: 1 / 1;
    align-self: start;
    z-index: 2;
    padding: 8px;
  }
  .raiz .cascaLarga .identidade {
    grid-area: 1 / 2;
    align-self: end;
    z-index: 2;
    margin: 0;
    padding: 12px 6px 6px 12px;
    background: none;
  }
  .raiz .cascaLarga .rodape {
    grid-area: 2 / 2;
    padding: 6px 6px 6px 12px;
  }
  .raiz .cascaLarga .nick {
    --nick: clamp(20px, calc((100cqi * 0.52 - 22px) / var(--maior-palavra-em, 7)), 30px);
  }
  .raiz .cascaLarga .coroaDoCapitao {
    left: 24%;
  }
}

/* ======================================================================= cartela: o pacotinho */
.raiz .enfLinhaCromo {
  color: var(--tm-acento);
}
.raiz .enfLinhaCromo::before,
.raiz .enfLinhaCromo::after {
  height: 2px;
  background: repeating-linear-gradient(90deg, rgba(255, 246, 230, 0.55) 0 8px, transparent 8px 14px);
}
.raiz .enfLinhaCromo svg {
  width: 20px;
}
@keyframes pacoteCai {
  from {
    transform: translate3d(0, 28px, 0) rotate(-3deg);
  }
  to {
    transform: none;
  }
}
/* O pacote em pé: papel laminado com serrilhado em cima e embaixo (máscara ESTÁTICA, dentes de 8 px; o
   texto mora no padding e a máscara nunca toca nele). */
.raiz .cartelaCorpo {
  isolation: isolate;
  width: min(100%, 400px);
  margin: 0 auto 40px;
  padding: 58px 22px 50px;
  background: linear-gradient(160deg, #4a1fa8, #24104f 45%, #3a1888 70%, #1e0c40);
  -webkit-mask:
    conic-gradient(from -45deg at 50% 0, #0000 0 90deg, #000 0) 50% 0 / 16px 8px repeat-x,
    linear-gradient(#000, #000) 0 8px / 100% calc(100% - 16px) no-repeat,
    conic-gradient(from 135deg at 50% 100%, #0000 0 90deg, #000 0) 50% 100% / 16px 8px repeat-x;
  mask:
    conic-gradient(from -45deg at 50% 0, #0000 0 90deg, #000 0) 50% 0 / 16px 8px repeat-x,
    linear-gradient(#000, #000) 0 8px / 100% calc(100% - 16px) no-repeat,
    conic-gradient(from 135deg at 50% 100%, #0000 0 90deg, #000 0) 50% 100% / 16px 8px repeat-x;
}
@supports (animation-timeline: view()) {
  .raiz .cartelaCorpo {
    animation: pacoteCai linear;
    animation-timeline: view();
    animation-range: entry 10% entry 70%;
  }
}
/* NaCartela: o brilho do laminado, o picote de abrir e o rótulo escuro (atrás do texto). */
.enfBrilhoPacote {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.enfBrilhoPacote::before {
  content: "";
  position: absolute;
  top: -20%;
  bottom: -20%;
  left: 0;
  width: 40%;
  background: linear-gradient(100deg, transparent, rgba(255, 122, 217, 0.22) 30%, rgba(255, 211, 110, 0.2) 45%, rgba(106, 242, 255, 0.22) 60%, transparent);
  transform: rotate(14deg) translateX(-130%);
  animation: pacoteBrilha 9s cubic-bezier(0.4, 0, 0.3, 1) infinite;
}
@keyframes pacoteBrilha {
  0%,
  50% {
    transform: rotate(14deg) translateX(-130%);
  }
  80%,
  100% {
    transform: rotate(14deg) translateX(330%);
  }
}
.enfPicotePacote {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 24px;
  z-index: 0;
  height: 2px;
  pointer-events: none;
  background: repeating-linear-gradient(90deg, rgba(255, 246, 230, 0.5) 0 6px, transparent 6px 10px);
}
.enfRotuloPacote {
  position: absolute;
  inset: 40px 14px 32px;
  z-index: 0;
  border-radius: 14px;
  pointer-events: none;
  background: #1a0b33;
  box-shadow: inset 0 0 0 2px rgba(200, 245, 74, 0.5);
}
.raiz .cartelaEscudo,
.raiz .cartelaNome,
.raiz .cartelaDestino,
.raiz .cartelaData {
  position: relative;
  z-index: 1;
}
.raiz .cartelaEscudo {
  width: 72px;
  height: 72px;
  margin: 0 auto 10px;
}
.raiz .cartelaNome {
  color: var(--creme);
  font-size: clamp(26px, 3vw, 34px);
  letter-spacing: 0.03em;
  text-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
}
.raiz .cartelaDestino {
  margin: 10px 0 0;
  font: 800 13px / 1.3 var(--tm-fonte-assinatura), Arial, sans-serif;
  letter-spacing: 0.06em;
  color: var(--tm-acento); /* 14,6:1 no rótulo */
}
.raiz .cartelaData {
  margin: 8px 6px 0;
  line-height: 1.5;
  letter-spacing: 0.2em;
}
/* O selo SABOR MEIO ROXO: DENTRO do pacote (a máscara cortaria o que saísse), no canto de cima à direita. */
@keyframes carimbaSabor {
  from {
    transform: scale(1.6) rotate(-20deg);
  }
  70% {
    transform: scale(0.94) rotate(4deg);
  }
  to {
    transform: none;
  }
}
.raiz .cartelaCarimbo {
  position: absolute;
  z-index: 2;
  top: 12px;
  right: 12px;
  display: grid;
  place-items: center;
  width: 86px;
  height: 86px;
  margin: 0;
  padding: 10px;
  border-radius: 50%;
  rotate: 12deg;
  background: var(--tm-acento);
  color: var(--tm-tinta); /* 14,4:1 */
  font: 400 14px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.02em;
  text-align: center;
  box-shadow: 0 0 0 3px var(--creme), 0 6px 12px -6px #000;
}
@supports (animation-timeline: view()) {
  .raiz .cartelaCarimbo {
    animation: carimbaSabor linear;
    animation-timeline: view();
    animation-range: entry 30% cover 45%;
  }
}
.raiz .cartelaFecho {
  margin: 0 0 20px;
  font: 700 16px / 1.4 var(--tm-fonte-assinatura), Arial, sans-serif;
  letter-spacing: 0.01em;
  color: var(--tm-prata);
}
@media (max-width: 599px) {
  .raiz .cartelaCorpo {
    padding: 54px 16px 46px;
  }
  .raiz .cartelaEscudo {
    width: 60px;
    height: 60px;
  }
  .raiz .cartelaCarimbo {
    top: 10px;
    right: 10px;
    width: 72px;
    height: 72px;
    font-size: 12px;
  }
}

/* ======================================================================= acessibilidade */
/* O bloco da base (.raiz * { animation: none !important }) para tudo: vira o pôster final. Aqui só
   some o que só faz sentido em movimento. */
@media (prefers-reduced-motion: reduce) {
  .enfFolha,
  .enfFolhaSombra,
  .enfRasgo,
  .enfEstouro,
  .enfBafo,
  .enfFaixa,
  .enfBrilho,
  .enfBrilhoPacote {
    display: none;
  }
}
@media (forced-colors: active) {
  .raiz .cromo {
    background: none;
    -webkit-text-fill-color: CanvasText;
    color: CanvasText;
  }
  .raiz .eco,
  .enfAro,
  .enfFaixa,
  .raiz .cascaCapitao .carta::before {
    display: none;
  }
}
/* A base esconde o eco e pinta o cromo de branco; o gancho do tema venceria e deixaria a letra
   transparente: o tema declara de novo. */
@media (prefers-contrast: more) {
  .raiz .cromo {
    background: none;
    -webkit-text-fill-color: #fff;
  }
  .enfFaixa {
    display: none;
  }
}
```

## Anexo D — `components/times/cenarios/album-ficha.module.css` (novo, completo)

```css
/*
 * A ficha do jogador no cenário "album": o retrato é a figurinha ampliada colada na vaga, com duas
 * repetidas abertas atrás; o nick é um adesivo grande; as estatísticas, adesivos de número; os
 * companheiros, mini-figurinhas. Mesmas regras: `.raiz` + o seletor da base; conteúdo só transform.
 * Keyframes daqui são DAQUI (o CSS Modules põe hash por arquivo). Peças com classe dos DOIS módulos
 * (kicker, chips, heroi): nada aqui repete propriedade que album.module.css declara nelas.
 */

/* ------------------------------------------------------------------ retrato: a figurinha grande */
@keyframes colaRetrato {
  0%,
  40% {
    transform: translate3d(-18px, -26px, 0) rotate(-6deg) scale(1.05);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  55% {
    transform: translate3d(1px, 2px, 0) rotate(0.6deg) scale(0.98);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  68% {
    transform: rotate(-0.3deg) scale(1.01);
  }
  100% {
    transform: none;
  }
}
/* A casca fica (a vaga e as repetidas são dela); quem cola é o .retrato. */
.raiz .retratoCasca {
  width: min(100% - 56px, 400px);
  margin-top: 28px;
  animation: none;
}
@media (min-width: 900px) {
  .raiz .retratoCasca {
    width: min(100%, 440px);
  }
}
/* De 900 a 1279 a coluna do retrato encosta na borda da tela: o retrato estreita para as repetidas
   caberem (em 1024, a da esquerda saía 54 px da tela — medido no harness). */
@media (min-width: 900px) and (max-width: 1279px) {
  .raiz .retratoCasca {
    width: min(100% - 48px, 440px);
  }
}
.raiz .retratoCapitao {
  margin-top: 44px;
}
.raiz .enfHaloRetrato {
  inset: -8%;
  z-index: -4;
  border-radius: 30px;
  background: radial-gradient(closest-side, rgba(199, 125, 255, 0.4), rgba(106, 242, 255, 0.1) 60%, transparent);
}
.raiz .retrato {
  isolation: isolate;
  overflow: hidden;
  clip-path: none;
  padding: 3px;
  border-radius: 18px;
  background: linear-gradient(160deg, var(--papel), var(--papel-sombra));
  box-shadow: 0 26px 40px -22px #000;
  animation: colaRetrato 1500ms linear;
}
/* A BRILHANTE: o cone arco-íris girando por baixo do papel. */
.raiz .retratoCapitao .retrato {
  background: var(--papel);
}
@keyframes aroGiraFicha {
  to {
    transform: rotate(360deg);
  }
}
.raiz .retratoCapitao .retrato::before {
  content: "";
  position: absolute;
  inset: -40%;
  z-index: -1;
  background: var(--holo);
  animation: aroGiraFicha 14s linear infinite;
}
/* 4:5 em TODA largura (a base faz 4:3 de 600 a 899 e cortaria as artes). */
.raiz .retratoMiolo {
  clip-path: none;
  aspect-ratio: var(--proporcao, 4 / 5);
  border-radius: 15px;
  background:
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0 6px, transparent 6px 12px),
    linear-gradient(180deg, #4b22a6, var(--tm-abismo));
}
.raiz .retratoMiolo > img {
  inset: 10px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  border-radius: 9px;
  filter: none;
}
.raiz .enfGradacao {
  inset: 10px;
  border-radius: 9px;
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.18) 0 9%, transparent 24%),
    linear-gradient(180deg, transparent 64%, rgba(18, 8, 31, 0.6));
}
.raiz .enfVarreduraLenta {
  background: linear-gradient(100deg, transparent 42%, rgba(255, 255, 255, 0.16) 50%, transparent 58%);
}
.raiz .retratoCapitao .enfVarreduraLenta {
  mix-blend-mode: color-dodge;
  background: linear-gradient(100deg, transparent 38%, rgba(255, 122, 217, 0.45) 44%, rgba(255, 211, 110, 0.45) 48%, rgba(184, 255, 106, 0.45) 52%, rgba(106, 242, 255, 0.45) 56%, transparent 62%);
}
/* Rota e elo já estão nos chips: a arte fica livre (as frases das fotos aparecem inteiras). */
.raiz .topo {
  display: none;
}
.raiz .placa {
  left: 20px;
  bottom: 20px;
  border-radius: 999px;
  padding: 6px 12px 5px;
  background: var(--holo-claro);
  color: var(--tm-tinta);
  font: 400 12px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.08em;
  box-shadow: 0 0 0 2px var(--creme), 0 6px 12px -6px #000;
}
@keyframes seloGiraFicha {
  from {
    transform: rotate(12deg);
  }
  to {
    transform: rotate(372deg);
  }
}
/* O selo-estrela no canto de CIMA À DIREITA, girando devagar. */
.raiz .coroaDoRetrato {
  width: 84px;
  top: -40px;
  left: auto;
  right: -20px;
  translate: none;
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.6));
  animation: seloGiraFicha 30s linear infinite;
}
@media (max-width: 899px) {
  .raiz .coroaDoRetrato {
    width: 64px;
    top: -30px;
    right: -10px;
  }
}
/* AtrasDoRetrato: a vaga deslocada e as duas repetidas em leque (saem de trás na entrada). */
.enfVagaRetrato {
  position: absolute;
  inset: 0;
  z-index: -2;
  translate: -14px -12px;
  border-radius: 20px;
  pointer-events: none;
  background: var(--vaga);
  box-shadow: inset 0 0 0 1px rgba(10, 4, 20, 0.7);
}
.enfVagaRetrato::before {
  content: "";
  position: absolute;
  inset: 8px;
  border-radius: 14px;
  border: 2px dashed rgba(255, 246, 230, 0.3);
}
@keyframes repetidaAbre {
  0%,
  30% {
    transform: translateX(var(--anda)) rotate(var(--volta));
  }
  100% {
    transform: none;
  }
}
.enfRepetida {
  position: absolute;
  z-index: -3;
  top: 6%;
  width: 56%;
  height: auto;
  pointer-events: none;
  filter: drop-shadow(0 16px 20px rgba(0, 0, 0, 0.55)); /* estático */
  animation: repetidaAbre 1600ms cubic-bezier(0.2, 0.8, 0.3, 1);
}
.enfRepetida1 {
  --anda: 40%;
  --volta: 10deg;
  left: -12%;
  rotate: -10deg;
}
.enfRepetida2 {
  --anda: -40%;
  --volta: -8deg;
  right: -12%;
  top: 14%;
  rotate: 8deg;
}
/* As repetidas grandes só a partir de 1360 (em 1280 a da esquerda saía 8 px da tela). */
@media (max-width: 1359px) {
  .enfRepetida {
    width: 50%;
  }
  .enfRepetida1 {
    --volta: 7deg;
    left: -6%;
    rotate: -7deg;
  }
  .enfRepetida2 {
    --volta: -6deg;
    right: -6%;
    rotate: 6deg;
  }
}

/* ------------------------------------------------------------------ texto */
.raiz .escudoMini {
  border-radius: 6px;
}
/* O nick: o adesivo grande, colado no tapa. 2D. */
@keyframes bafoNick {
  0%,
  50% {
    transform: translate3d(-0.03em, -0.06em, 0) rotate(5deg) scale(1.08);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  62% {
    transform: translate3d(0, 0.02em, 0) scale(1.05, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  74% {
    transform: scale(0.98, 1.03);
  }
  86% {
    transform: scale(1.01);
  }
  100% {
    transform: none;
  }
}
/* Pela largura MEDIDA do nick em até duas linhas (--largura-nick-em): PEIDEI / CALDINHO = 5,464 em. */
.raiz .nickVisual {
  display: inline-grid; /* eco e cromo na mesma célula: quebram igual */
  line-height: 0.98;
  letter-spacing: 0.06em;
  font-kerning: none;
  font-variant-ligatures: none;
  overflow-wrap: break-word;
  text-wrap: balance;
  margin-top: 0.22em; /* o acento sobe a 0,91 em */
  margin-bottom: 0.08em;
  rotate: -2deg; /* estático */
  font-size: clamp(30px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.75))), 96px);
  transform-origin: 20% 80%;
  animation: bafoNick 1500ms linear;
}
@media (min-width: 900px) {
  .raiz .nickVisual {
    font-size: clamp(40px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.75))), 124px);
  }
}
.raiz .nickVisual > * {
  grid-area: 1 / 1;
}
.raiz .nomeReal {
  font: 700 15px / 1.35 var(--tm-fonte-assinatura), Arial, sans-serif;
  letter-spacing: 0.02em;
}
.raiz .texto .chips {
  justify-content: flex-start;
}
/* O título não sobe (desceria em cima da 1ª linha de estatísticas). */
.raiz .performance {
  font: 400 clamp(18px, 1.8vw, 22px) / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.04em;
  color: var(--creme);
  animation-name: none;
}
.raiz .performance::after {
  height: 2px;
  background: repeating-linear-gradient(90deg, rgba(255, 246, 230, 0.5) 0 10px, transparent 10px 16px);
}
/* Estatísticas: adesivos de número. O item também tem o .sobe da base (0,1,0): esta regra (0,2,0) troca
   o keyframe e fica com a duração em cascata dele. */
@keyframes adesivoPop {
  0%,
  70% {
    transform: translate3d(0, 6px, 0) scale(0.92);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1.2);
  }
  84% {
    transform: scale(1.04);
  }
  93% {
    transform: scale(0.99);
  }
  100% {
    transform: none;
  }
}
.raiz .estatisticas {
  gap: 12px 8px;
}
.raiz .estatistica {
  gap: 6px;
  padding: 12px 4px 10px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, #3a1a80, var(--tm-abismo));
  box-shadow: 0 0 0 2px var(--creme), 0 10px 16px -10px #000;
  animation-name: adesivoPop;
  animation-timing-function: linear;
}
.raiz .estatistica::before {
  left: 22%;
  right: 22%;
  top: 5px;
  height: 2px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.22);
}
.raiz .valor {
  padding: 0;
  background: none;
  -webkit-text-fill-color: currentColor;
  color: var(--creme); /* 14,7:1 */
  font: 400 clamp(22px, 2.4vw, 30px) / 1 var(--tm-fonte-titulo), sans-serif;
}
.raiz .rotulo {
  font: 700 10.5px / 1.15 var(--tm-fonte-assinatura), Arial, sans-serif;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.raiz .nota {
  font: 500 12px / 1.5 var(--tm-fonte-assinatura), Arial, sans-serif;
}

/* ------------------------------------------------------------------ companheiros: mini-figurinhas */
.raiz .companheiros {
  gap: 12px 10px;
}
.raiz .companheiroLink {
  align-items: center;
  min-height: 76px;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(90deg, #4b22a6, var(--tm-abismo));
  box-shadow: 0 0 0 2px var(--creme), 0 10px 18px -10px #000;
}
.raiz .companheiroLink:hover {
  box-shadow: 0 0 0 2px var(--tm-acento), 0 14px 22px -10px #000;
}
.raiz .companheiroFoto {
  flex: 0 0 56px;
  height: 56px;
  margin: 10px 0 10px 10px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--creme);
}
.raiz .companheiroRota {
  --tm-icone: var(--tm-acento);
  color: var(--tm-acento);
  font: 400 11px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.08em;
}
.raiz .companheiroNick {
  font-size: 15px;
  letter-spacing: 0.02em;
  overflow-wrap: break-word;
}
@media (max-width: 599px) {
  .raiz .companheiroFoto {
    flex-basis: 44px;
    height: 44px;
    margin: 8px 0 8px 8px;
  }
  .raiz .companheiroTexto {
    padding: 10px 8px;
  }
  .raiz .companheiroNick {
    font-size: 13px;
  }
}
```

**Notas de implementação dos anexos:**
- `album.module.css` tem ~1.560 linhas formatadas (7,3 KB gzip; nenhum SVG em data URI); `album-ficha.module.css`,
  ~380 (2,2 KB gzip).
- O `.raiz .letra:nth-child(8n + k)` conta DENTRO da `.palavra` (a base envolve cada palavra): se o time mudar
  de nome, os giros só se repetem.
- O `.raiz .casca:not(.cascaCapitao)` usa a classe `cascaCapitao` DESTE módulo (o elemento tem as duas, a da base
  e a do cenário, pelo `comCenario`).
- `--holo` e `--holo-claro` são declaradas no `.raiz` do `album.module.css` e herdadas pela ficha (custom
  property não ganha hash).
- A estrela pequena do capitão nos companheiros (`InsigniaMini` na `companheiroRota`) pinta com `currentColor`:
  sai lima.

---

## Ajustes obrigatórios do juiz

> Vencem o spec onde os dois discordarem (28/10/2026). O parecer geral está em `..\juiz.md`.
> Veredito: **aprovado com ajustes** — conceito forte e bem medido no harness. Os ajustes são: a cor,
> a lição do WebKit (2D no conteúdo), metade dos laços infinitos e a integração com a base pronta.
> Lilita One fica com este time (o Os 5 Sem Ping trocou para Unbounded).

### J1. Dados finais
- **`cor: "#E27CFE"`** (sai `#D98BFF`, que ficava a ΔE 7,8 do lilás da rota SUP no resto do site).
  Vizinhos: Fãs de Rosca `#FFA3C8` a 18,8; Galácticos `#B4C2FF` a 23,0; 8,0:1 no fundo do site. A cor
  só vive em `tema.cor` (o `corDoTime` do resto do site): os roxos de DENTRO da página (`primaria
  #9B5CFF`, `neon #C77DFF`, o metal) ficam como estão. Troque também no teste novo:
  `corDoTime(...)` dá `#E27CFE` com slug e `#9a6ae0` (ARCANA) sem.
- Fontes: título `lilita-one` = `Lilita_One`, `weight: "400"`, `subsets: ["latin"]`,
  `adjustFontFallback: false`, `fallback: ["Lilita One Caixa Alta"]` (Arial local a 66%, o
  `@font-face` no topo de `album.module.css`); assinatura `baloo-2` = `Baloo_2` variável (sem
  `weight`), `subsets: ["latin"]`. Sem mudança.
- `prefixo: "OS 5"`, `letraPorLetra: true`, `cenario: "album"`.
- Cabeçalho do site: fundo `rgba(18, 8, 31, 0.95)` → `rgba(18, 8, 31, 0.84)`, fio
  `rgba(200, 245, 74, 0.28)` (o da seção 3.9; a base põe em `globals.css`).

### J2. A base comum JÁ FEZ a parte compartilhada da seção 3.9
Não edite `tipos.ts`, `registro.ts`, `fontes-dos-temas.ts`, `cenarios/index.ts`, o stub nem
`globals.css`. Leve só:
1. a tabela `LILITA_ONE` (espacamento 0,06, sobra 0,3, padrao 1) para o SEU bloco de
   `lib/temas/metricas.ts` (a fonte não mudou: vale a medida do designer; os valores-teste 5,353 /
   4,252 / 5,571 / 4,708 / 5,886 / 5,464 continuam);
2. a lista de keyframes de entrada da seção 9 para o SEU bloco de `temas-sem-opacidade.test.ts`
   (com os nomes de J3);
3. os 9 textos para `lib/i18n/messages/temas/os-5-furiosos.ts` (não `paginas-home.ts`).

### J3. Keyframes com nome único
`haloNasce` → **`haloAlbum`** (o nome já existe no boteco e na academia) e `pisca` → **`piscaAlbum`**
(genérico demais para 8 cenários). O `grep … | uniq -d` do `juiz.md` §2 tem de sair vazio.

### J4. Conteúdo em 2D (a lição do WebKit da Queijo Minas)
`translate3d` + `background-clip: text` some no Safari. As letras (`.cromo` com `background-clip`)
e o nick da ficha usam `bafo` e `bafoNick` com `translate3d`: **troque por `translate(x, y)` em
TODOS os keyframes de conteúdo** (`colaFoto`, `bafo`, `bafoSelo`, `balaoPula`, `figurinhaCola`,
`figurinhaColaRelogio`, `pacoteCai`, `colaRetrato`, `bafoNick`, `adesivoPop`) — mesma curva, mesmo
desenho, `translate3d(a, b, 0)` vira `translate(a, b)`. O 3D fica SÓ na folha que vira (enfeite do
palco, sem texto; `backface-visibility: hidden` com o `-webkit-`).

### J5. Laços infinitos: de 15 para 8 na página (o vídeo não perde nada)
O spec conta 10 no herói e 5 no resto. Fica assim:
- **herói (4):** o aro holográfico (`aroGira`, 14 s), a faixa holográfica que atravessa a foto
  (`faixaPassa`, 7 s; o `color-dodge` fica, é pequena) e **2 brilhos** (não 4): fique com os dois
  primeiros de `BRILHOS` (97%/4% e 3%/95%, cantos opostos, 1,2 s um do outro); tire os outros dois e
  a regra `.enfBrilho:last-child { display: none }` do celular (já são 2 em toda largura).
- **cortados no herói:** `haloDoAlbum` (o halo só nasce e fica parado; uma camada de 1,8E respirando
  6% não aparece no vídeo), `fitaCorre` (a fita de 5 px fica parada depois de colada) e o
  `brilhoDoSelo` infinito — os dois brilhinhos do selo piscam UMA vez (a mesma animação, sem
  `infinite`: pico aos 1,6 s e somem).
- **elenco (3):** o cone do capitão (`aroGira` no `::before`), o selo-estrela girando (`seloGira`) e
  o halo da base. **Corte `holoPassa`** (a segunda faixa em `color-dodge` no capitão): a moldura que
  gira já é «a brilhante»; o `.enfVarredura` do capitão volta a ser o reflexo de hover da base, igual
  ao das outras figurinhas (apague a regra `.raiz .cascaCapitao .enfVarredura` e o keyframe).
- **cartela (1):** `pacoteBrilha` fica.
- **ficha:** `aroGiraFicha` e `seloGiraFicha` + os 2 da base (o `color-dodge` da varredura lenta do
  capitão fica).
- Atualize as contas da seção 5.1/9 nos comentários e confira de novo «no máximo 2 flashes por
  segundo» (fica mais folgado).

### J6. O «OS 5» é o ADESIVO (decisão dos dois «OS 5», `juiz.md` §4)
Fica como está na seção 6: pílula de vinil lima com recorte creme, girada −7°, `bafoSelo`. É o único
dos dois «OS 5» que é objeto (gira, tem recorte, sombra e brilho); o do Os 5 Sem Ping virou texto de
interface sem cápsula. Não o centralize no celular.

### J7. Conferências no repo (o harness era uma cópia)
- Refaça as medidas da seção 4.3 com os dados de produção e o CSS da base de agora (o
  `pagina-do-time-com-tema.tsx` mudou depois do harness: o «voltar» da ficha acompanha o caminho de
  entrada e `/jogadores` abre a ficha com o tema).
- Quadro 0: a folha anterior mora no palco (atrás do conteúdo) — confira no print que ela não passa
  por cima da figurinha nem do título em nenhuma largura; e que, parada (movimento reduzido), ela
  some (`display: none`).
- Safari/iPhone: a folha 3D some ao passar de 90° e as letras não piscam vazias (J4).
- O peso do CSS (risco 9 do spec) NÃO é tarefa sua agora: está anotado no parecer como mudança
  futura da base.
