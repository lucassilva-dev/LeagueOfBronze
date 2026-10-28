# DESORGANIZAÇÃO: especificação do tema, «O Circo da Desorganização» (cenário `picadeiro`)

Não editei nada no repositório. Li o sistema no worktree `C:\LeagueOfBronze-precos` (`lib/temas/*`, `components/times/*` com `cenarios/`, `tests/times/*`, `tests/stubs/next-font-google.ts`, `lib/design.ts`, `lib/draft/times.ts`, `lib/i18n/messages/paginas-home.ts`), olhei o escudo, o original em bandeira e as 5 fotos, vi os três temas em produção com o Playwright (prints em `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\ref\`) e conferi o elenco ao vivo em `/times/desorganizacao`.

**O que está validado (sem tocar no repo):**

| verificação | resultado |
|---|---|
| fontes no `font-data.json` do Next instalado | Smokum `["400"]` normal, `latin`/`latin-ext`; Playfair Display 400–900 + `variable`, normal e itálico, `latin`/`latin-ext` |
| métrica da Smokum (canvas `measureText` a 100 px, woff2 do Google Fonts) | tabela completa na seção 3.9; DESORGANIZAÇÃO = **5,928 em** com espaçamento e sobra |
| protótipo estático com a estrutura da página e da ficha (`C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\prototipo\`) | 12 larguras, de 320 a 1920: **zero rolagem horizontal**, título inteiro na coluna em todas |
| os CSS de referência pela lógica dos testes `temas-sem-opacidade`, `link-da-carta` e `css-do-build` (`prototipo\regras.cjs`) | **verde** nos dois módulos |
| `lightningcss` do repo (minify + cssModules) | nenhum `translate`/`rotate`/`scale` perdido; `sin()` preservado; `:has([id=tm-nick])` sem hash |
| quadro 0, fim, folha de quadros da entrada, movimento reduzido (0 animações rodando) | prints em `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\prototipo\prints\` |
| contraste WCAG de todo par de texto | menor razão: 5,3:1 (seção 9) |

**Arquivos de referência, prontos para copiar nos mesmos caminhos do repo:** `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\referencia\` (o código injetado nas seções 3.9 e 10 — o arquivo de dados, o cenário, os ornamentos e os dois CSS — é cópia byte a byte deles; os scripts do protótipo para medir de novo estão em `prototipo\`: `gerar.cjs`, `prints.cjs`, `medir-ref.cjs`, `finais.cjs`, `regras.cjs`). O teste novo (`referencia\tests\times\tema-desorganizacao.test.tsx`) foi escrito pelo padrão do da Galácticos, mas **não foi executado** (rodar exige o repo).

**Prints principais** (pasta `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\prototipo\prints\`): `final-heroi-1440-quadro0.png`, `final-heroi-1440-fim.png`, `final-heroi-405-quadro0.png`, `final-heroi-405-fim.png`, `final-heroi-320-fim.png`, `final-heroi-1440-reduzido.png`, `folha-quadros-1440.png`, `folha-quadros-390.png`, `final-elenco-1440.png`, `final-elenco-390.png`, `elenco-768-inteiro.png`, `final-cartela-1440.png`, `ref-cartela-390.png`, `ficha-nak4y-1440.png`, `ficha-nak4y-390.png`, `ficha-r-a-z-e-r-a-l-1440.png`.

### Antes de implementar (dados, no painel; não é código)
1. **O time já está certo no banco:** nome `DESORGANIZAÇÃO`, slug `desorganizacao`, id `chama` (a cor do draft é a da CHAMA, `#ef7d34`). Conferir que a imagem do time é `/teams/desorganizacao.webp` (o arquivo já está em `public/teams`, commit 1266ffa).
2. **Elenco ao vivo (conferido em 27/10):** TOP Onigami, SEL nak4y (capitão), MID R A Z E R A L, ADC GayLord, SUP THALAO; 30 pts. Fotos `/players/<slug>-4a.webp` (já no `public/players`). Os cinco estão sem nome real (o `name` é o nick): o rodapé do cartaz repete o nick em itálico e a ficha não mostra «nome real».
3. **Fotos:** vão como estão. Nenhuma tem montagem com outra pessoa (o recado do Lucas nesta rodada, «não precisa separar do Lula, deixa os dois juntos de zoeira», é de outro time: aqui não há o que separar).
4. **Cores dos outros quatro times novos:** estão sendo escolhidas agora. A cor deste tema (`#FFB3C7`) foi medida contra as sete cores de hoje e contra as escolhas prováveis deles (seção 3.5); quando as quatro saírem, rodar o ΔE de novo.

---

## 1. O conceito

**«O Circo da Desorganização»: a organização do campeonato admite que tudo isto é um circo — e que o circo é dela.** Debaixo da lona preta e vinho, o canhão de luz procura o leão coroado, ele salta para o pedestal e acorda (olhos de ouro); o nome se ORGANIZA letra por letra — menos o DES, que são os palhaços e ficam tortos para sempre. As fotos em "skin" viram os cartazes das atrações; o capitão, de venda nos olhos no banheiro, é o mestre de picadeiro de cartola.

**Por quê, peça por peça:**
- **O nome é autoironia de quem organiza** (o Lucas, dono do site, e o nak4y são da organização; o time foi montado por ela, fora do draft). "Isso aqui virou um circo" é a frase que todo organizador ouve. O tema assume a piada no primeiro segundo: o nome se organiza sozinho e só o **DES** não obedece.
- **O escudo é um leão de coroa** — a estrela de qualquer circo. A coroa vira "rei do picadeiro", o preto e o ouro viram a lona e os frisos, e o pincel branco rasgado do escudo vira a tinta de palhaço do DES.
- **As fotos são fantasias de campeão** (Sett, Yasuo, Ezreal, Thresh): no circo, cada uma é uma atração. A foto de verdade do capitão — sem camisa, venda de cinto nos olhos, punhos fechados, num banheiro — é o número de olhos vendados do mestre de picadeiro. O aviso do elenco é a frase que todo circo diz, com a piada da turma: «Não tentem isso em casa (nem no banheiro)».
- **As outras piadas de organização**: o espetáculo que começa «com 40 minutos de atraso», a tarja «SUJEITO A ATRASO» colada no cartaz, «Reclamações: falar com a organização. (Somos nós.)» e «proibido alimentar o leão» (no Brasil, "o leão" também é a Receita: quem cobra o Pix é a organização).

## 2. Os três conceitos e por que este venceu

| | 1. **O Circo da Desorganização** (escolhido) | 2. A Coletiva da Organização | 3. Torcida Desorganizada |
|---|---|---|---|
| a cena | circo à noite: lona preta e vinho, canhão de luz, pedestal, trapézios, cortina | entrevista coletiva: painel com o monograma D repetido, mesa com microfones, flashes | arquibancada à noite: o bandeirão do leão abrindo, papel picado, sinalizador de ouro |
| o gesto | o leão salta no pedestal; o nome se organiza, o DES não | as letras de acrílico do painel montadas; o DES pendurado por um parafuso | o bandeirão desenrola e tremula |
| elenco | cartazes de atração no prego | crachás de cordão balançando | carteirinhas de sócio-torcedor |
| capitão | mestre de picadeiro (cartola) | presidente da comissão | presidente da torcida (megafone) |
| piada | circo + atraso + "somos nós" + atrações | "sem perguntas" | o trocadilho torcida organizada → desorganizada |

**Por que o 1 venceu:**
- **Distinção dos outros sete.** Nenhum dos três temas no ar nem dos quatro em desenho mexe com circo. O 2 é estático e "corporativo" (o Lucas pediu nada corporativo), e os flashes de câmera brigam com a regra de ≤ 2 flashes por segundo. O 3 é arena com plateia à noite, vizinho de Os 5 Furiosos (e-sports/telão) e do "Noite de Final" que o GdB recusou, e torcida organizada carrega a conotação de briga.
- **Vídeo.** O 1 tem um roteiro de 3 segundos com começo, meio e piada: o canhão procura, o leão salta e acende os olhos, a palavra se alinha em cascata e o DES tenta, falha e cai torto. O 2 rende uma montagem de letreiro; o 3, um pano tremulando.
- **Custo.** O 1 é gradiente parado (lona, cortina, raios), quatro SVGs pequenos (cartola, pedestal, um da plateia, estrela) e transform por letra com `sin()` do índice. O 3 precisaria de um tecido que ondula de verdade (caro ou falso); o 2, de muitos flashes e reflexos.

**Não repete nenhum gesto de quem já está no ar:**

| | RX | QM | GdB | **Desorganização** |
|---|---|---|---|---|
| lugar | tempestade ao ar livre | serra à noite | dentro do bar | **dentro do circo**: lona em gomos, trapézios, picadeiro |
| composição do herói | texto à esquerda, escudo à direita | escudo à esquerda, texto à direita | escudo em cima, nome embaixo, tríptico na parede | **o CARTAZ de circo**: nome em cima, leão no pedestal no meio, faixa e bandeirolas embaixo |
| material do título | cromo | ouro com bisel em bloco | chope enchendo | **folha de ouro em letra de cartaz de madeira + DES em tinta branca de palhaço** |
| gesto do título | entra inclinado | carimba | enche de líquido | **as letras se ORGANIZAM uma a uma; o DES falha** |
| fontes | Exo 2 itálico + Permanent Marker | Bungee + Special Elite | Knewave + Kalam | **Smokum + Playfair Display itálico** |
| entrada do escudo | cai e o chão treme | chega e freia | brinde | **salto com agachada, voo, pouso amassado** |
| câmera | zoom | grua | travelling | **gira 3° e assenta** |
| atrás do escudo | coroa gigante, raio, aro | lua de queijo | letreiro, halo, TV | **raios de cartaz girando + canhão seguidor** |
| chão | espelho com grade | trilhos | balcão | **picadeiro (elipse de serragem) e pedestal listrado** |
| moldura | barras de cinema | faixas de latão | varal de flâmulas | **sanefa da lona em cima, plateia em silhueta embaixo** |
| elenco | créditos | vagões | bolachas na lousa | **cartazes de atração pendurados num prego, na frente da cortina** |
| capitão | coroa | roda alada | caneco coroado | **cartola do mestre de picadeiro** (a coroa fica só no escudo) |
| cartela | «em cartaz» | bilhete carimbado | TV + plaquinha | **o cartaz da temporada com a tarja diagonal «SUJEITO A ATRASO»** |

**Ideias recusadas no caminho:** o aro de fogo atrás do escudo (é o aro da RX); cordões de lâmpadas piscando (flash); confete ou pipoca estourando no pouso (é o leque de respingos do GdB); o nariz de palhaço sobre o D (enfeite cobrindo conteúdo); malabarismo das letras em arco (letra ilegível no meio do arco e muito caro); vermelho como cor do time (Os 5 Furiosos); dourado (ÁUREA hoje, Fãs de Rosca amanhã); marfim (é a cor do texto do site).

---

## 3. O tema (dados)

### 3.1 Fontes (conferidas em `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`)
- **Título: `Smokum`** — `weights ["400"]`, `styles ["normal"]`, subsets `latin`, `latin-ext`.
  - Letra de cartaz de madeira condensada, com serifa de laje (o "French Clarendon" dos cartazes de circo e faroeste do século 19). É a única condensada com cara de cartaz que deixa uma palavra de 14 letras grande no celular: DESORGANIZAÇÃO tem **5,558 em** de avanço na Smokum, contra 9,1 na Abril Fatface, 9,8 na Rye e 7,9 na Sancreek.
  - Acentos completos (Ã, Ç, É, Õ, Ê) desenhados na própria fonte. Medidas: maiúscula 0,75 em; acentos e til até 0,97 em acima da linha de base; cedilha 0,23 em abaixo; Q desce 0,16 em. Tinta além do avanço: ≤ 0,027 em à direita e ≤ 0,010 em à esquerda.
  - Usada em: a marca, «AS ATRAÇÕES», o nick das cartas, o nick da ficha, o número dos chips, o título PERFORMANCE, o valor das estatísticas, o nome da cartela e a tarja.
  - Só tem 400: o `.raiz` declara `--tm-titulo-peso: 400`, `--tm-titulo-estilo: normal` e `font-synthesis: none`.
- **Assinatura: `Playfair Display` itálico** — `weights ["400"…"900","variable"]`, `styles ["normal","italic"]`, subsets `cyrillic`, `latin`, `latin-ext`, `vietnamese`. Carregar `style: ["italic"]`, `weight: ["500", "700"]`, subset `latin`.
  - A voz do mestre de picadeiro: o didone itálico dos programas de espetáculo, que casa com a Smokum (Clarendon + didone é o par clássico do cartaz vitoriano). Legível a 13 px (testado).
  - Usada em: o lema na faixa, o aviso do elenco, o nome no rodapé do cartaz, o nome real da ficha, a linha de preço da cartela e o fecho.
- **Nenhuma das seis proibidas** (Exo 2, Permanent Marker, Bungee, Special Elite, Knewave, Kalam).
- **A reserva enquanto a Smokum carrega** precisa ser MAIS ESTREITA que ela em toda maiúscula (o mesmo cuidado do «Knewave Caixa Alta»). Medi a razão de largura letra a letra (maiúsculas, acentuadas e algarismos): Impact a 60% (pior caso «6», 0,606) e Arial a 48% (pior caso «Q», 0,482). Ficam duas `@font-face` no módulo (seção 10.3) e o `fallback` do next/font lista as duas, nessa ordem.

### 3.2 Cores (`cores` → `--tm-*`; contraste WCAG calculado)

| token | hex | papel neste tema | contraste |
|---|---|---|---|
| `breu` | `#0B0706` | o escuro da lona, fundo base | — |
| `ceu` | `#170A0C` | o alto da lona (reserva da base) | — |
| `abismo` | `#2A0710` | veludo na sombra (sombras coloridas, foto vazia) | — |
| `royal` | `#7E1830` | veludo aceso (hover dos botões; listra do pedestal) | texto 9,4 |
| `primaria` | `#E0B04A` | o ouro dos frisos: debruns, costuras, fio do arco, cordões de bolinhas. **Nunca texto pequeno** | — |
| `neon` | `#F2CF7A` | ouro claro: borlas, prego, tampo do pedestal | — |
| `arco` | `#FFE3A3` | anel de foco | 16,0 no breu · 12,0 na cortina |
| `nucleo` | `#FFF7E3` | o miolo do canhão de luz | — |
| `texto` | `#FFF4E0` | marfim, texto principal | 18,4 no breu · 16,7 no gomo vinho · 7,5 na faixa (ponto mais claro) |
| `prata` | `#EADBC2` | apoio forte | 14,7 no breu |
| `apoio` | `#BFAE92` | kicker, créditos, rótulos | 9,2 no breu · 8,4 no gomo vinho · 7,2 na lona iluminada |
| `acento` | `#F4C65A` | «APRESENTA», «FICHA →» no cartaz preto | 12,5 no breu · 12,2 no papel preto |
| `tinta` | `#1B0C08` | texto sobre ouro e papel | 15,3 no papel · 11,2 no pé do papel · 10,4 no ouro da placa |
| `icone` | `#FFE3A3` | ícone da rota (na fitinha carmim e nos chips) | 7,3 no carmim |

**Cores só do cenário (no CSS, variáveis do `.raiz` do módulo):**

| peça | cores |
|---|---|
| papel de cartaz | `--papel` `#F2E5C8`, `--papel-claro` `#F7ECD4`, `--papel-sombra` `#D8C49C` (gradiente radial do topo para as bordas) |
| tinta de impressão | `--tinta-cartaz` `#1B0C08` (15,3:1 no papel) |
| carmim | `--carmim` `#8C1A2E`: fitinha da rota, tarja, nome da cartela, «FICHA →», estrelas (7,3:1 no papel; 5,3:1 no pé do papel) |
| veludo | `--veludo` `#6E1426`, `--veludo-escuro` `#2A0710`; faixa do lema `#96203A → #6E1426 → #5A0F1F`; pontas da faixa `#4A0C19` |
| lona | gomo preto `#0E0807`, gomo vinho `#2C0912`, costura `#4A3013` |
| cortina | pregas `#2A0710 → #4E0D1B → #6E1426 → #521020` (período de 60 px) |
| sanefa | faixa `#5C0F20`, meia-lua `#7E1830`, debrum `#E0B04A`, borlas `#F2CF7A` |
| DES (tinta de palhaço) | `#FFFFFF → #FBF7EE → #E6DCCB` com estrias `rgba(120,96,70,.22)` |
| contorno do título | `#170805` (o `--tm-eco-base`) |
| algodão-doce da plateia | `#FFB3C7` (a cor do time: a única coisa rosa da página) |

### 3.3 Metal = folha de ouro (as 8 chaves de `MetalDoTema`)

| luz | alto | meio | sombra | fundo | volta | base | placa |
|---|---|---|---|---|---|---|---|
| `#FFF6D2` | `#F9DC8A` | `#DDA43A` | `#6A420E` | `#A8741F` | `#F5D47E` | `#B07A22` | `#E8B957` |

A estrutura é a do cromo da RX (luz → alto → meio → faixa escura do bisel → fundo → volta → luz → base), no tom do debrum do escudo. Face média sobre o fundo: 9,0:1 no breu e 8,2:1 no gomo vinho. A faixa escura do bisel (`#6A420E`, 3% da altura da letra) fica por dentro do contorno escuro e só aparece em texto de 48 px para cima.

### 3.4 Nome: sem prefixo e sem sufixo; `letraPorLetra: true`
- DESORGANIZAÇÃO é uma palavra só: `partesDoNome` devolve a marca inteira e nenhuma assinatura (o `TracoDoNome` não é usado).
- O "DES" separado é **desenho, não divisão do nome**: com `letraPorLetra`, cada letra é um `.letra` com `--i`; o CSS pega as três primeiras com `.palavra > .letra:nth-child(-n + 3)`. O leitor de tela continua ouvindo «DESORGANIZAÇÃO» uma vez (o `h1` tem o nome inteiro em `somenteLeitor`; o desenho é aria-hidden).
- Se o time mudar de nome, muda o slug e a página volta ao visual padrão (o tema é pelo slug): o `nth-child` nunca pega outro nome.

### 3.5 Cor do time no resto do site: **`#FFB3C7`, o rosa do algodão-doce**

O algodão-doce do circo (está na mão de um da plateia, a única coisa rosa da página). Lido no fundo do site (`#100d07`): **11,6:1**.

**Por que não a cor do escudo:**
- o **ouro** colava na ÁUREA, que hoje é a cor de Os 5 Sem Ping (`#e0b13c`, ΔE 4,3), e os Fãs de Rosca têm escudo dourado e laranja;
- o **marfim** do pincel fica a ΔE 7,7 do texto do site (`#f3ece0`): o nome do time na tabela pareceria texto comum.

**ΔE2000 para as outras sete cores de hoje:**

| RX `#4DA3FF` | QM `#3EE6F2` | GdB `#B4C2FF` | ÁUREA `#e0b13c` (5 Sem Ping) | VERDANTE `#3fb27f` (So ADC) | ARCANA `#9a6ae0` (5 Furiosos) | SEIVA `#8fc23f` (Fãs de Rosca) |
|---|---|---|---|---|---|---|
| 38,4 | 61,4 | **25,8** | 40,8 | 57,5 | 31,2 | 56,1 |

**Contra o que os quatro novos provavelmente vão escolher:** ouro `#F5B700` 43,2 · laranja `#FF8C1A` 34,4 · bronze `#CD7F32` 34,3 · cobre `#D2884F` 29,6 · magenta `#E040FB` 29,3 · vermelho `#FF3B3B` 28,3 · coral `#FF6F61` 21,3 · rosa forte `#FF4FA3` **19,8** · branco `#F0F6FF` 25,8 · azul-gelo `#8FD3FF` 40,8. Fica ≥ 15 de todas.

**Reservas, se o Lucas quiser outra:**
- `#FF9AA2`, o rosa-veludo: ≥ 31 das sete de hoje e 9,6:1, mas só 13,2 de um coral;
- `#F3E2B8`, o marfim-dourado do escudo: ≥ 17,7 das sete, mas 9,9 do texto do site.

### 3.6 Cenário: chave nova **`picadeiro`** (`Cenario = … | "picadeiro"`).

### 3.7 Textos (`lib/i18n/messages/paginas-home.ts`, chaves planas depois das da Galácticos, em pt e en)

| papel | chave | pt | en |
|---|---|---|---|
| `lema` | `temaDesorgLema` | Respeitável público: o espetáculo vai começar (com 40 minutos de atraso). | Ladies and gentlemen: the show is about to begin (40 minutes late). |
| `estrelando` | `temaDesorgAtracoes` | AS ATRAÇÕES | TONIGHT'S ACTS |
| `aviso` | `temaDesorgAviso` | Não tentem isso em casa (nem no banheiro). | Don't try this at home (or in the bathroom). |
| `capitao` | `temaDesorgCapitao` | MESTRE DE PICADEIRO | RINGMASTER |
| `emCartaz` | `temaDesorgSobALona` | SOB A LONA {periodo} | UNDER THE BIG TOP {periodo} |
| `destino` | `temaDesorgIngresso` | Meia-entrada para Bronze · proibido alimentar o leão | Half price for Bronze · do not feed the lion |
| `carimbo` | `temaDesorgTarja` | SUJEITO A ATRASO | SUJEITO A ATRASO (fica em pt: a página marca `lang="pt-BR"` na tarja) |
| `fecho` | `temaDesorgFecho` | Reclamações: falar com a organização. (Somos nós.) | Complaints? Talk to the organizers. (That's us.) |
| `companheiros` | `temaDesorgTrupe` | O RESTO DA TRUPE | THE REST OF THE TROUPE |

Na tela a cartela compõe «4ª EDIÇÃO · SOB A LONA DE 13 DE NOVEMBRO A 6 DE DEZEMBRO». O leitor de tela ouve «CAPITÃO» onde a tela diz «MESTRE DE PICADEIRO» (a base já faz isso com o `RotuloDoCapitao`).

### 3.8 Fotos (retratos que preenchem a moldura; nada de `formato: "medalhao"`, nada de `proporcao`)

As cinco são retratos em pé: 1200×1600 (Onigami, R A Z E R A L, THALAO), 1192×1600 (GayLord) e 1432×1600 (nak4y). O mesmo `object-position` serve à carta 4:5 com arco, à carta deitada do capitão no celular, ao retrato da ficha (4:5, e 4:3 entre 600 e 899) e ao companheiro (~72×76). Medi o rosto de cada um numa grade de 10%.

| jogador | rosto (x, y da foto) | `foco` | por quê |
|---|---|---|---|
| `focoPadrao` | — | `50% 30%` | o padrão da base |
| `onigami` | 68%, 47% | `64% 54%` | rosto à direita e no meio; no 4:3 mostra de 24% a 80% da altura (rosto, mão e peito; a academia ao fundo) |
| `nak4y` | 47%, 27% (venda); punhos a 38% | `48% 15%` | foto de corpo inteiro: no 4:5 a altura cabe toda; no 4:3 e na carta deitada mostra de 4–6% até 66–71% (rosto, venda, punhos, abdômen). A ducha higiênica e o vaso à direita aparecem — a piada do aviso |
| `r-a-z-e-r-a-l` | 55%, 30% | `55% 15%` | rosto alto e rabo de cavalo; no 4:3, de 7% a 63% (rosto e espada) |
| `gaylord` | 39%, 50% | `40% 46%` | rosto baixo e à esquerda, óculos na testa; no 4:3, de 20% a 76% |
| `thalao` | 53%, 22% | `52% 16%` | rosto no alto, lampião e foice embaixo; no 4:3, de 7% a 63% |

### 3.9 Código dos dados

**`lib/temas/tipos.ts`** (duas linhas):
```ts
export type ChaveDeFonte = "exo2-italico" | "permanent-marker" | "bungee" | "special-elite" | "knewave" | "kalam" | "smokum" | "playfair-italico";

export type Cenario = "tempestade" | "estacao" | "boteco" | "picadeiro";
```

**`lib/temas/desorganizacao.ts`** (novo):
```ts
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * DESORGANIZAÇÃO — «O Circo da Desorganização» (27/10/2026).
 *
 * É o time DA ORGANIZAÇÃO do campeonato (montado por ela, fora do draft): o nome é autoironia de
 * quem organiza. Do escudo: a cabeça de leão preta, branca e cinza de olhos de ouro, a coroa, o
 * debrum de ouro em zigue-zague e DESORGANIZAÇÃO em pincel branco rasgado, sobre uma bandeira
 * preta. A página admite: isto aqui é um circo — e o circo é nosso. O leão é a estrela que salta
 * para o pedestal sob o canhão de luz; o nome se organiza letra por letra, menos o DES (os
 * palhaços, tortos para sempre); as fotos em "skin" viram os cartazes das atrações e o capitão
 * (nak4y, de venda nos olhos) é o mestre de picadeiro de cartola. Ouro de folha, não de chope nem
 * de queijo; o vinho é veludo de circo.
 */
export const TEMA_DESORGANIZACAO: TemaDoTime = {
  slug: "desorganizacao",
  fontes: { titulo: "smokum", assinatura: "playfair-italico" },
  cores: {
    breu: "#0B0706",
    ceu: "#170A0C",
    abismo: "#2A0710",
    royal: "#7E1830",
    primaria: "#E0B04A",
    neon: "#F2CF7A",
    arco: "#FFE3A3",
    nucleo: "#FFF7E3",
    texto: "#FFF4E0",
    prata: "#EADBC2",
    apoio: "#BFAE92",
    acento: "#F4C65A",
    tinta: "#1B0C08",
    icone: "#FFE3A3",
  },
  // Folha de ouro com bisel (a estrutura do cromo da RX, no tom do debrum do escudo).
  metal: {
    luz: "#FFF6D2",
    alto: "#F9DC8A",
    meio: "#DDA43A",
    sombra: "#6A420E",
    fundo: "#A8741F",
    volta: "#F5D47E",
    base: "#B07A22",
    placa: "#E8B957",
  },
  // Sem prefixo nem sufixo: o nome é UMA palavra. O "DES" à parte é desenho (as três primeiras
  // `.letra` no CSS do cenário), não divisão do nome.
  letraPorLetra: true,
  // O rosa do ALGODÃO-DOCE do circo (o da plateia): o ouro do escudo colava na ÁUREA (#e0b13c,
  // ΔE 4,3) e o marfim do pincel, no texto do site (ΔE 7,7). Este fica a ≥ 25,8 de todos os
  // outros sete (11,6:1 no fundo do site).
  cor: "#FFB3C7",
  cenario: "picadeiro",
  textos: {
    lema: "temaDesorgLema",
    estrelando: "temaDesorgAtracoes",
    aviso: "temaDesorgAviso",
    capitao: "temaDesorgCapitao",
    emCartaz: "temaDesorgSobALona",
    destino: "temaDesorgIngresso",
    carimbo: "temaDesorgTarja",
    fecho: "temaDesorgFecho",
    companheiros: "temaDesorgTrupe",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      onigami: "64% 54%", // o rosto à direita, no meio da foto (a academia fica atrás)
      nak4y: "48% 15%", // corpo inteiro: rosto, venda e punhos no terço de cima (e o banheiro aparece)
      "r-a-z-e-r-a-l": "55% 15%", // o rosto alto e o rabo de cavalo
      gaylord: "40% 46%", // o rosto baixo e à esquerda; os óculos na testa
      thalao: "52% 16%", // o rosto no alto, o lampião embaixo
    },
  },
};
```

**`lib/temas/registro.ts`:**
```ts
import { TEMA_DESORGANIZACAO } from "@/lib/temas/desorganizacao";
// …
const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR, TEMA_DESORGANIZACAO];
```

**`components/times/fontes-dos-temas.ts`:**
```ts
import { Bungee, Exo_2, Kalam, Knewave, Permanent_Marker, Playfair_Display, Smokum, Special_Elite } from "next/font/google";

// Desorganização: a letra de cartaz de madeira (o nome no letreiro do circo) e o itálico
// didone do mestre de picadeiro. A reserva são DUAS faces locais mais estreitas que a Smokum
// (@font-face em cenarios/picadeiro.module.css): Impact a 60% e Arial a 48%.
const smokum = Smokum({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Smokum Reserva Estreita", "Smokum Reserva"],
});

const playfairItalico = Playfair_Display({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["500", "700"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});

export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string }>> = {
  "exo2-italico": exo2Italico,
  "permanent-marker": permanentMarker,
  bungee,
  "special-elite": specialElite,
  knewave,
  kalam,
  smokum,
  "playfair-italico": playfairItalico,
};
```

**`tests/stubs/next-font-google.ts`** (o stub exporta fonte por fonte):
```ts
export const Smokum = fonte;
export const Playfair_Display = fonte;
```

**`lib/temas/metricas.ts`** — a tabela medida (canvas `measureText` a 100 px no Chromium, com o woff2 do Google Fonts que o next/font baixa). A Smokum quase não tem kerning (DESORGANIZAÇÃO = 5,558 em medida; 5,567 somando letra a letra).
- `padrao: 1`: um caractere fora da tabela (o ㅤ e o CJK dos nicks) sai da fonte do sistema, com cerca de 1 em.
- `espacamento: 0.01`: o `letter-spacing` do título, do nick e do nick da ficha.
- `sobra: 0.22`. A tinta passa no máximo 0,03 em do avanço, o contorno do eco soma 0,09 em, e o D, o E e o S tortos alargam até 0,10 em. Medido: a tinta de DESORGANIZAÇÃO ocupa 5,785 em, contra 5,928 de largura calculada.

```ts
const SMOKUM: MetricasDaFonte = {
  avancos: {
    A: 0.426, B: 0.427, C: 0.388, D: 0.406, E: 0.411, F: 0.379, G: 0.378, H: 0.459, I: 0.253,
    J: 0.323, K: 0.428, L: 0.386, M: 0.577, N: 0.464, O: 0.393, P: 0.406, Q: 0.375, R: 0.433,
    S: 0.381, T: 0.354, U: 0.471, V: 0.466, W: 0.527, X: 0.462, Y: 0.453, Z: 0.39,
    Á: 0.426, À: 0.426, Â: 0.426, Ã: 0.426, Ä: 0.426, É: 0.411, È: 0.411, Ê: 0.411, Ë: 0.411,
    Í: 0.253, Ì: 0.253, Î: 0.253, Ï: 0.253, Ó: 0.393, Ò: 0.393, Ô: 0.393, Õ: 0.393, Ö: 0.393,
    Ú: 0.471, Ù: 0.471, Û: 0.471, Ü: 0.471, Ç: 0.388, Ñ: 0.464,
    0: 0.352, 1: 0.299, 2: 0.334, 3: 0.333, 4: 0.379, 5: 0.329, 6: 0.328, 7: 0.318, 8: 0.35, 9: 0.328,
    " ": 0.2, ".": 0.226, ",": 0.234, "-": 0.32, _: 0.25, "'": 0.221, "!": 0.245, "?": 0.32,
    "&": 0.422, "+": 0.35, "·": 0.226, "#": 0.409, "@": 0.587, "(": 0.293, ")": 0.293, "/": 0.33,
    ":": 0.266, "%": 0.474, "©": 0.587, "®": 0.587, Æ: 0.614, Œ: 0.623, Þ: 0.396, Ø: 0.393,
  },
  padrao: 1,
  espacamento: 0.01,
  sobra: 0.22,
};

/** As métricas pela fonte do título do tema (`tema.fontes.titulo`). */
export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = { knewave: KNEWAVE, smokum: SMOKUM };
```

Com a tabela, os valores que a página e os testes recebem:
- `maiorPalavraEm("DESORGANIZAÇÃO")` = 5,568 + 14 × 0,01 + 0,22 = **5,928**;
- maior palavra do elenco = GAYLORD, **3,165**;
- `larguraDoNickEm`: Onigami 3,034 · GayLord 3,165 · THALAO 2,724 · nak4y 2,42 · **R A Z E R A L 2,546**. Este último quebra em duas linhas, «R A Z / E R A L»: entre palavras, porque cada letra é uma palavra; uma linha só sairia com 57% do tamanho.

**`lib/i18n/messages/paginas-home.ts`** (pt, depois de `temaGalacticosMesa`):
```ts
    // Desorganização (lib/temas/desorganizacao.ts): o circo da organização do campeonato.
    temaDesorgLema: "Respeitável público: o espetáculo vai começar (com 40 minutos de atraso).",
    temaDesorgAtracoes: "AS ATRAÇÕES",
    temaDesorgAviso: "Não tentem isso em casa (nem no banheiro).",
    temaDesorgCapitao: "MESTRE DE PICADEIRO",
    temaDesorgSobALona: "SOB A LONA {periodo}",
    temaDesorgIngresso: "Meia-entrada para Bronze · proibido alimentar o leão",
    temaDesorgTarja: "SUJEITO A ATRASO",
    temaDesorgFecho: "Reclamações: falar com a organização. (Somos nós.)",
    temaDesorgTrupe: "O RESTO DA TRUPE",
```
(en, no mesmo lugar):
```ts
    temaDesorgLema: "Ladies and gentlemen: the show is about to begin (40 minutes late).",
    temaDesorgAtracoes: "TONIGHT'S ACTS",
    temaDesorgAviso: "Don't try this at home (or in the bathroom).",
    temaDesorgCapitao: "RINGMASTER",
    temaDesorgSobALona: "UNDER THE BIG TOP {periodo}",
    temaDesorgIngresso: "Half price for Bronze · do not feed the lion",
    // A tarja fica em pt nos dois idiomas (a página marca lang="pt-BR"), como o FIADO SÓ AMANHÃ.
    temaDesorgTarja: "SUJEITO A ATRASO",
    temaDesorgFecho: "Complaints? Talk to the organizers. (That's us.)",
    temaDesorgTrupe: "THE REST OF THE TROUPE",
```

**`components/times/cenarios/index.ts`:**
```ts
import { PICADEIRO } from "@/components/times/cenarios/picadeiro";
// …
export const CENARIOS: Readonly<Record<Cenario, CenarioDoTema>> = {
  tempestade: TEMPESTADE,
  estacao: ESTACAO,
  boteco: BOTECO,
  picadeiro: PICADEIRO,
};
```

---

## 4. A cena do herói

### 4.1 A composição: o CARTAZ de circo, em toda largura
Um cartaz de circo antigo tem o nome em cima, a atração no meio e os detalhes embaixo. É essa a ordem, do celular ao 1920:
1. «4ª EDIÇÃO · LEAGUE OF BRONZE APRESENTA» (kicker, `text-wrap: balance`) e os créditos (a partir de 600);
2. **DESORGANIZAÇÃO** grande;
3. o leão no pedestal, no picadeiro, com os raios e o canhão de luz atrás;
4. a faixa vinho do lema;
5. as bandeirolas (pts, mestre de picadeiro, OP.GG).

**Como:**
- `.raiz .blocoTexto { display: contents }`. Cada peça do texto vira item da `.heroiGrade` (uma coluna só, `justify-items: center`) e ganha `order`: kicker 1, créditos 2, título 3, escudo 4, lema 5, chips 6.
- A ordem do DOM (e do leitor de tela e do Tab) não muda: o escudo é imagem decorativa (`alt=""`) e o texto segue na mesma sequência.
- A consulta de contêiner do título (`100cqi`) passa para a `.heroiGrade` (`container-type: inline-size`).
- Como o `.blocoTexto` some da árvore de caixas, kicker, créditos, título e chips ganham `position: relative; z-index: 2` (os raios e o feixe moram no bloco do escudo, `z-index: 1`); o lema também.
- O `tremor` da grade sai (`animation-name: none`): quem pula é o leão.

### 4.2 As camadas, de trás para frente

**Palco (sticky, atrás de tudo; peça `Fundo`):**
1. **`enfLona`**: a lona vista de dentro. Gomos que convergem para um mastro acima da tela, num `repeating-conic-gradient` parado:
   - ≥ 900: ponto de fuga a 42% acima do topo e período de 7,26°. Cada período é gomo preto `#0E0807` (3,4°), costura `#4A3013` (0,22°), gomo vinho `#2C0912` (3,42°) e costura;
   - ≤ 899: ponto de fuga a 24% acima e período de 10,6° (gomos mais largos, que no celular leem como lona e não como listras);
   - por cima, o calor do centro (onde bate o canhão), o alto escurecido e o chão escurecido.
2. **`enfTrapezio` ×2**:
   - desenho: duas cordas (as bordas laterais, 2 px, ouro a 50%) e a barra de madeira com ponteiras de ouro (o `::after`, 9 px de altura). Largura `clamp(70px, 6,4vw, 112px)`;
   - posição: o esquerdo a 13% (44vh de corda) e o direito a 13% da direita (36vh);
   - movimento: balançam ±4° pelo alto, em 6,4 s e 7,6 s (alternate);
   - **≥ 1024 os dois; 600–1023 só o direito (a 5%, 24vh); < 600 nenhum.** Na ficha, a corda tem 20vh, para a barra não cruzar o nick (o seletor é `:has([id="tm-nick"])`).
3. A vinheta e o grão da base.

**Moldura (no padding do herói e da ficha):**
4. **`enfSanefa`** (padding de cima, altura `--barra` = `clamp(26px, 3,4vw, 46px)`): a borda da lona.
   - Ladrilho SVG 120×52 repetido em x: faixa de veludo `#5C0F20`, debrum de ouro, duas meias-luas `#7E1830` com fio de ouro e uma borla `#F2CF7A` em cada junta.
   - Sombra projetada estática. Parada.
5. **`enfPublico`** (padding de baixo, altura `--publico` = `clamp(58px, 7vw, 92px)`; o padding de baixo do herói vira `--publico + 10px`): a plateia em silhueta `#070403` com contorno quente `#3A2412`.
   - O ladrilho 480×90 tem sete pessoas: uma de cartola, uma criança no ombro, um balde de pipoca, um celular filmando (a organização gravando o vídeo) e um **algodão-doce rosa** (`#FFB3C7`, a cor do time).
   - Por cima, três **fãs de braços para cima** (`enfFa`, SVG 60×70) a 9%, 47% e 80%, que pulam no pouso do leão (dois abaixo de 900).
   - Nunca cobre conteúdo: mora no padding. No 1440×810 fica abaixo da dobra (aparece na rolagem); no celular e no tablet entra na primeira tela.

**Bloco do escudo (E = `--escudo`, sempre 1:1):**
6. **`enfRaios`** (`AtrasDoEscudo`): os raios de cartaz antigo.
   - `repeating-conic-gradient` com 24 gomos de ouro a 16% (6° acesos, 9° vazios) e máscara radial que some a 74% do raio.
   - 2,3E (1,9E no celular), centro a 47% do escudo.
   - Abrem no pouso (`scale` 0,55 → 1) e giram uma volta a cada 160 s.
7. **`enfFeixe`** (≥ 600): o facho do canhão seguidor.
   - Um trapézio (`clip-path` estático) de 1,05E de largura e 260vh de comprimento, saindo do centro do escudo a 148° (para cima e para a esquerda; o `overflow: clip` do herói corta).
   - Luz quente `rgba(255,228,170,.15) → .05 → 0`. Só a opacidade da camada sobe (0 → 0,9).
8. **`enfCanhao`**: a poça de luz, uma elipse de 1,5E × 1,3E com núcleo `rgba(255,238,196,.4)`. Entra da esquerda procurando o leão e o pega no pouso.
9. **O escudo** (`img`, `z-index: 2`) e, dentro dele (`NoEscudo`, anda com ele), **`enfOlho` ×2**: elipses de 8,5% × 5% em `screen`, ouro claro, sobre os olhos medidos no webp de 640 (42,6%, 37,3%) e (56,4%, 37,3%). Acendem no pouso e ficam a 85%.
10. **`Chão` — `enfPicadeiro`**: a caixa começa a 78% do escudo e tem 2,7E × 0,6E. Dentro dela:
    - **`enfSerragem`**: a elipse do picadeiro. Serragem em gradiente radial (`#4A3019 → #2E1C0F → #1A0F08`), meio-fio carmim (0,022E) e fio de ouro (0,03E) por `box-shadow` interno, apagando para baixo com máscara;
    - **`enfPedestal`** (SVG 200×110, largura 0,8E): o tambor de circo. Corpo com listras diagonais carmim/marfim (`pattern` girado 30°) e volume por gradiente horizontal, frisos de ouro em cima e embaixo, tampo vinho `#4A0C19` com borda `#F2CF7A` e uma estrela achatada. O tampo fica centrado a 87,6% do escudo: o pé do monograma D (o ponto opaco mais baixo, 87,5%) pousa nele. Amassa no pouso.

**O texto do herói:**
- **Kicker** e **créditos**: os da base, parados (o `.sobe` os desceria para cima do título no quadro 0);
- **Título**: seção 6;
- **Lema na faixa**:
  - o lema é uma faixa de veludo (`#96203A → #6E1426 → #5A0F1F`), Playfair itálico 500 de 15–19 px, em marfim, com `max-width: min(100% - 44px, 32em)` e `text-wrap: balance`;
  - as pontas dobradas (rabo de andorinha) são o `::before` e o `::after`, atrás da faixa, com `clip-path` parado;
  - no 1440 cabe em 2 linhas, e no 320 em 3.
- **Chips = bandeirolas**: rabo de andorinha à direita, no `::before` (nada de `clip-path` no elemento focável). Variantes:
  - pts: ouro claro → ouro, com o número em Smokum de 26 px;
  - mestre de picadeiro: vinho com fio de ouro e a cartolinha;
  - OP.GG: breu com borda de ouro de 2 px.
  - Abaixo de 420, a do capitão ocupa a linha e o texto corre em bloco (a lição do GdB); a do OP.GG ocupa a linha abaixo de 600 (base).

### 4.3 Medidas (protótipo com o CSS final, depois da entrada)

**As regras de tamanho:**
- **E**: `clamp(196px, 60vw, 250px)` abaixo de 600; `clamp(230px, min(36vw, 30svh), 290px)` de 600 a 1023; `clamp(230px, min(24vw, 32svh), 340px)` a partir de 1024.
- **Título**: `--tam = clamp(36px, 100cqi / 5,928, máx)`. O máximo é 112 px abaixo de 600, `min(150px, 16svh)` de 600 a 1023 e `min(168px, 14svh)` a partir de 1024.

Coordenadas em px da página (o cabeçalho do site, 70 px, incluído), depois da entrada:

| janela | E | título (px) | tinta do título x / coluna | título y | escudo y | faixa do lema y | bandeirolas y | fim do herói | rolagem horizontal |
|---|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 340 | 151,2 | 517–1392 / 344–1576 | 251–425 | 419 | 861–932 | 960–1004 | 1106 | não |
| **1440×810 (vídeo)** | 259 | 113,4 | 388–1044 / 104–1336 | 249–379 | 375 | 712–780 | 808–852 | 954 | não |
| 1440×900 | 288 | 126,0 | 351–1080 / 104–1336 | 249–394 | 390 | 764–832 | 860–904 | 1006 | não |
| 1366×768 | 246 | 107,5 | 368–990 / 67–1299 | 248–372 | 368 | 687–751 | 779–823 | 925 | não |
| 1024×768 | 246 | 107,5 | 197–819 / 24–1000 | 225–349 | 345 | 664–720 | 745–789 | 871 | não |
| 768×1024 | 276 | 121,5 | 28–731 / 24–744 | 222–362 | 358 | 717–773 | 792–836 | 904 | não |
| 600×960 | 230 | 93,1 | 27–566 / 24–576 | 216–324 | 321 | 620–676 | 694–792 | 860 | não |
| 430×932 | 250 | 66,7 | 19–406 / 17–413 | 195–272 | 272 | 597–653 | 671–827 | 895 | não |
| **405×720 (vídeo)** | 243 | 62,9 | 18–382 / 16–389 | 195–268 | 267 | 583–639 | 657–813 | 881 | não |
| 390×844 | 234 | 60,4 | 18–367 / 16–374 | 195–265 | 264 | 569–625 | 643–799 | 867 | não |
| 360×780 | 216 | 55,3 | 18–338 / 16–344 | 209–273 | 272 | 553–609 | 627–783 | 851 | não |
| 320×640 | 196 | 48,6 | 18–299 / 16–304 | 208–264 | 265 | 520–596 | 614–770 | 838 | não |

**A dobra:**
- No **1440×810 (vídeo)** cabem título, escudo, pedestal, picadeiro e a faixa do lema (até 780). As bandeirolas começam em 808.
- No **405×720 (vídeo)** cabem título, escudo, pedestal, faixa (até 639) e a bandeirola de pts.
- No **390×844** cabe tudo, e a plateia aparece embaixo.

**O celular NÃO é o computador encolhido:**
- sem trapézios e sem feixe; raios menores (1,9E);
- a lona com gomos mais largos e ponto de fuga mais baixo;
- a câmera gira só 2° (e escala 1,08);
- a plateia baixa (58 px), com dois fãs;
- o picadeiro mais largo que a tela (lê como a arena inteira);
- o kicker em duas linhas balanceadas;
- as bandeirolas empilhadas (a do capitão em bloco centrado abaixo de 420; a do OP.GG na largura toda);
- no elenco, o cartaz do capitão deitado na largura toda (seção 7).

---

## 5. A entrada (o "filme" de 0 a ~2,8 s)

**Quadro 0 (o pôster, conferido em print):**
- a lona à meia-luz, já girada 3° e escalada a 1,12;
- o canhão como uma poça fraca à esquerda; feixe e olhos apagados; raios fechados a 55%;
- o escudo **inteiro**, 3% abaixo e achatado (1,05 × 0,9): o leão agachado;
- **DESORGANIZAÇÃO legível, mas bagunçado**: cada letra deslocada até ±0,07 em e girada até ±8° (seno do índice), e o DES já no torto dele;
- faixa e bandeirolas 14 px abaixo.

Nenhum enfeite cobre conteúdo.

**Linha do tempo do herói (ms):**

| ms | conteúdo (só transform) | enfeite (aria-hidden) |
|---|---|---|
| 0 → 2200 | — | câmera `picadeiroGira`: rotate −3° → 0 e scale 1,12 → 1, `cubic-bezier(.16,1,.3,1)` (celular: −2° e 1,08) |
| 0 → ∞ | — | trapézios `balanca`: ±4°, 6,4 s e 7,6 s, ease-in-out alternate (≥ 600) |
| 0 → 192 | — | canhão parado à esquerda: `translate(-105%, 14%) scale(.72)`, opacidade 0,4 |
| 192 → 864 | — | **o canhão procura o leão**: atravessa até `translate(5%, -2%) scale(1.04)` e sobe a 1, `cubic-bezier(.35,0,.2,1)` |
| 0 → 420 | escudo agachado (`saltoDoLeao` 1400 ms, linear, curvas por trecho; espera dentro do keyframe, 0–30%) | — |
| 420 → 658 | **o salto**: −9% e esticado 0,96 × 1,07, `cubic-bezier(.2,.6,.35,1)` | — |
| 658 → 896 | a queda, `cubic-bezier(.55,0,.9,.45)`: **pousa aos 896** | — |
| 720 → 936 | — | feixe acende (opacidade 0 → 0,9; só sobe) |
| 752 → 1350 | **rufar**: cada letra de ORGANIZAÇÃO treme ±2° antes de se alinhar | — |
| 864 → 1200 | — | o canhão assenta no leão |
| 870 → 1500 | — | raios abrem (scale 0,55 → 1, `cubic-bezier(.2,.7,.2,1)`) e seguem girando (160 s) |
| 896 → 952 | escudo amassa (+1,5%, 1,07 × 0,9), rebate aos 1092 (−1,6%, 0,98 × 1,03) e assenta aos 1400 | pedestal amassa (`scaleY .94` aos 966; 1,015 aos 1120; repouso aos 1400) |
| 912 → 1008 | — | **olhos do leão acendem** (0 → 1; ficam a 0,85 aos 1600) |
| 930 → 1458 | — | **três da plateia pulam** (−22% aos ~1060; quique −10%; repouso ~1400) |
| **958 → 1639** | **ORGANIZAÇÃO se alinha em cascata, da esquerda para a direita**: cada letra pula reta (−0,16 em), pousa amassada (1,04 × 0,95) e assenta. Uma letra a cada 39 ms (o primeiro O aos 958, o O final aos 1350); o último repousa aos 2410 | — |
| 1225 → 1800 | faixa do lema e bandeirolas sobem (`.sobe` da base) | — |
| **1560 → 1877** | **o DES tenta**: D, E e S se endireitam e sobem (−0,12 em, 0°), um de cada vez | — |
| **2184 → 2318** | **e cai torto de novo**: passa do ponto (1,35 × o giro) e volta ao torto de repouso aos 2600–2760 | — |
| ~9900 e a cada 11 s | o DES tremelica (`rotate` 3° / −2,5° / 1°, ~1 s) | — |

**Estado final:**
- o escudo no pedestal, com o canhão em cima, o feixe e os olhos acesos e os raios girando;
- ORGANIZAÇÃO alinhado em ouro e o DES torto em branco (D −9° e +0,05 em; E +6° e −0,05 em; S −4° e +0,07 em);
- a faixa e as bandeirolas no lugar.

**O que fica vivo depois:**

| | laços |
|---|---|
| ≥ 1024 | trapézios (2), raios (1), tremelique do DES (3 letras, 1 pulso a cada 11 s) e o halo do cartaz do capitão (base, opacidade, 3,2 s) |
| celular | raios, DES e halo |
| ficha | raios do retrato e a varredura lenta da base (a cada 8 s) |

- Tudo é `transform`/`rotate`/`scale`, ou opacidade em enfeite pequeno. Nenhum `background-position` ou pintura em laço, nenhum filtro animado.
- **Flashes: nenhum.** O canhão, o feixe e os olhos só SOBEM de luz; nada pisca.

**Rolagem (`animation-timeline: view()`; sem suporte, pelo relógio com a espera dentro do keyframe):**
- **os cartazes do elenco entram balançando no prego**: −7° → +2,6° → −1° → 0, com pivô 16 px acima do topo, em `entry 0% → entry (60% + col·12%)`. Pelo relógio: `2000 + 140·i` ms, parados até 58%;
- a tarja «SUJEITO A ATRASO» **bate e cola** (escala 1,18 → 0,98 → 1, mantendo os 6°) em `entry 30% → cover 45%`. Sem suporte, fica parada.

---

## 6. O título

**Tratamento da marca:**
- **ORGANIZAÇÃO**: letra de cartaz em folha de ouro.
  - Smokum 400 em caixa alta, `letter-spacing: .01em`, `line-height: 1`, `font-kerning: none`.
  - Cada `.letra` é um `inline-grid` com o eco e o cromo na mesma célula.
  - **Eco** (atrás): contorno de tinta `#170805` por `-webkit-text-stroke: .09em`, sombra dura de 0,06 em, sombra difusa e halo vinho. Estático.
  - **Cromo** (frente): gradiente de folha de ouro recortado na letra, parado (nada de brilho correndo).
  - Folga de tinta: `padding .3em .14em .26em .06em` com margem negativa igual (til e acento até 0,97 em, cedilha até 0,23 em).
- **DES**: o mesmo desenho de letra, mas **tinta branca de palhaço**: branco → marfim com estrias secas diagonais paradas (`repeating-linear-gradient` 97°), sobre o mesmo contorno escuro. Torto de repouso: D −9° e +0,05 em, E +6° e −0,05 em, S −4° e +0,07 em. Lê como alguém que pichou "DES" no letreiro oficial — a autoironia do nome.

**A montagem:**
- **Bagunça → organização, sem JS.** O lugar bagunçado de cada letra sai do seno do índice:
  - `--dy: calc(sin(calc(var(--i) * 2.3rad + .4rad)) * .07em)`;
  - `--dr: calc(sin(calc(var(--i) * 1.7rad + 1.1rad)) * 8deg)`.
  - O keyframe `organiza` parte de `translateY(var(--dy)) rotate(var(--dr))`.
  - A cascata sai da DURAÇÃO (`1500 + 70·i` ms) e a espera mora dentro do keyframe (0–44% parado, 44–56% o rufar), sem delay.
  - Sem suporte a `sin()` (Chrome < 111, Safari < 15.4, Firefox < 108), as variáveis ficam inválidas e a letra nasce reta: degrada para um título parado.
- **O DES:**
  - keyframe `palhacos` (`2600 + 80·i` ms) para a tentativa e a queda;
  - `tremelique` (11 s, infinito) anima só a propriedade **`rotate`**, que compõe com o `transform` sem sobrescrever a entrada, e o primeiro pulso cai aos 9,9 s (90%), sem delay;
  - o torto é o **`transform` de repouso** da regra (sem fill-mode, o fim da animação devolve a ele).
- **Tamanho** pela largura MEDIDA (`--largura-em` = 5,928): 48,6 px no 320, 60,4 no 390, 107,5 no 1366, 113,4 no 1440 e 151,2 no 1920. Medido: a tinta fica dentro da coluna em todas as 12 larguras.
- `.marca`: `animation: none` (a base faria `entraMarca`) e `margin-top: .12em` para o til do Ã.
- **forced-colors**: face em `CanvasText`, eco escondido. **prefers-contrast: more**: ouro sólido `#F9DC8A`, DES branco sólido e o contorno de volta.

---

## 7. O elenco: «AS ATRAÇÕES», os cartazes pendurados na cortina

**`AtrasDoElenco` = `enfCortina`:**
- o pano de boca em pregas de veludo (gradiente parado de período 60 px), escurecido em cima e embaixo, com uma poça de luz quente no centro;
- em cima, a **`enfBambinela`**: o mesmo ladrilho da sanefa, mais escuro e sem borlas, com sombra estática;
- vai de ponta a ponta em todas as larguras;
- a seção tem `isolation: isolate` e a cortina fica a `z-index: -1` dentro dela (acima do palco).

**Título e aviso:**
- **«AS ATRAÇÕES»**: Smokum de 30–50 px em ouro `#F9DC8A` (8,7:1 na prega mais clara), centrado, entre dois cordões de lâmpadas apagadas (o `::before` e o `::after`, bolinhas de ouro a cada 14 px).
- **Aviso**: Playfair itálico de 15–18 px em `#F0DCC0` (8,8:1), centrado.

**A carta = o cartaz da atração (os ganchos):**

| peça | o que vira |
|---|---|
| `.casca` | pendurada num prego: `transform-origin: 50% -16px`; entra balançando. O `::before` desenha o **barbante em V** (dois fios de ouro de 1,6 px, 54% da largura e 22 px de altura) e o **prego** (bolinha de ouro) |
| `.carta` | o papel: gradiente radial `#F7ECD4 → #F2E5C8 → #D8C49C`, padding 5 px, raio 3, duas estrelas carmim nos cantos de cima, sombra; `clip-path: none`; `container-type: inline-size` |
| `.miolo` | linhas `auto / 1fr / auto`; fio duplo de tinta por dentro (1,5 px tinta, 4 px papel, 5 px tinta) |
| `.sobreFoto` | `display: contents` (o texto sai de cima da foto; o link esticado continua se medindo pelo `.miolo`) |
| `.foto` | a **janela em arco**: margem 22/12/0, 4:5, `border-radius: 50% 50% 3px 3px / 24% 24% 3px 3px`, fio de ouro de 2 px e de tinta de 1,5 px; foto com `saturate(.95) contrast(1.04)` parado |
| `.topo` | linha 1, por cima do topo do cartaz: a **fitinha carmim da rota** (rabo de andorinha; marfim 8,4:1; ícone `#FFE3A3`) à esquerda e a crista de elo à direita |
| `.identidade` | linha 2 (a que cresce), centrada: no capitão, a placa «MESTRE DE PICADEIRO» (fita de ouro em hexágono) e o **nick** |
| `.nick` | Smokum em tinta (15,3:1). Tamanho pela maior palavra do elenco: `clamp(17px, (100cqi − 30px) / 3,165, 34px)`. `text-wrap: balance`; quebra só entre palavras. **Sem** filter, transform nem position (`link-da-carta`) |
| `.rodape` | linha 3: fio de tinta em cima (`background`), o nome em Playfair itálico de 13 px e «FICHA →» em carmim (5,3:1 no pé do papel) |

**Tamanhos medidos:**

| largura | arranjo | cartaz | nick |
|---|---|---|---|
| 1440 | 5 colunas | ≈ 230 px | 34 px, todos numa linha (R A Z E R A L também) |
| 1024 | 5 colunas | ≈ 180 px | 34 px; R A Z E R A L ainda numa linha, no limite |
| 768 | 3 + 2 | ≈ 230 px | — |
| 390 | 2 colunas e o capitão deitado | ≈ 172 px | R A Z E R A L em «R A Z / E R A L» |

O espaço que sobra numa linha de alturas iguais vai para a linha do nick (centrado), e não vira um buraco embaixo.

**O capitão (nak4y):**
- **o cartaz da estrela**: papel preto (`#241612 → #120A08 → #0A0605`), fios e estrelas de ouro, nick em ouro `#F9DC8A` (14,6:1), nome `#F0DCC0`, «FICHA →» em acento. Sem barbante (`::before` escondido);
- **a insígnia grande é a CARTOLA** (`Cartola`, SVG 120×100):
  - copa de cetim preto com brilho vertical, tampo `#3A2D31`;
  - fita carmim `#8C1A2E` com debrum e estrela de ouro, aba curva com brilho;
  - 70 px a −52 px, girada −10°, com sombra estática; no celular, 56 px a −42 px;
- erguido 14 px a partir de 1024 (base); halo quente que respira (base);
- **celular (`cascaLarga`)**: o cartaz deitado na largura toda, com a foto em arco à esquerda (4:5) e a placa, o nick e o rodapé à direita. A cartola fica em cima, com `margin-top: 24px`.
- **`InsigniaMini` = `CartolaMini`** (24×24, `currentColor`): chips, placa, linha da cartela e companheiros.

**Entrada:** o balanço da seção 5. O quadro 0 é o cartaz inteiro girado 7° (legível); nunca escala nem some.

---

## 8. A cartela e a ficha

### 8.1 Cartela: o cartaz da temporada
- **Linha de ouro** com a cartolinha no meio (`enfLinhaCromo` da base, na cor primária).
- **`cartelaCorpo`** = o cartaz:
  - até 640 px, papel com fio duplo de tinta e sombra, padding `62px 22px 26px` (os 62 px de cima são da tarja);
  - **`NaCartela` = `enfEstrelasCartaz`**: três estrelas carmim nos cantos (o de cima à direita é da tarja).
- **Dentro do cartaz:**
  - **escudo** de 96 px;
  - **nome** em Smokum carmim de 34–52 px (7,3:1);
  - **destino** «Meia-entrada para Bronze · proibido alimentar o leão», em Playfair itálico de 14–16 px em tinta, balanceado;
  - **data** «4ª EDIÇÃO · SOB A LONA DE 13 DE NOVEMBRO A 6 DE DEZEMBRO», com um fio de tinta em cima (11,2:1), balanceada.
- **A tarja «SUJEITO A ATRASO»** (`cartelaCarimbo`, `lang="pt-BR"`):
  - papel carmim, Smokum de 15 px em marfim (8,4:1), girada 6°, no canto de cima à direita **dentro** do cartaz (nunca sobre texto, nunca fora da tela: no 320 o cartaz tem 288 px e a tarja, ~170);
  - bate e cola na rolagem.
- **Fora do cartaz:** o fecho «Reclamações: falar com a organização. (Somos nós.)» em Playfair itálico de 16 px em `#F0DCC0`, balanceado, e os links (bandeirola «VER CALENDÁRIO →» e «← TODOS OS TIMES»).

### 8.2 Ficha (`/jogadores/[slug]`) — `picadeiro-ficha.module.css`
- **Retrato = o cartaz grande da atração:**
  - `.retrato` é o papel com fio duplo (o capitão: papel preto com fios de ouro);
  - `.retratoMiolo` é a **mesma janela em arco** (raio 50%/22%), margem 16/10/10, fio de ouro;
  - largura `min(100% − 24px, 470px)`.
  - Entrada `cartazDesce` (1400 ms): pendurado no prego, chega girado −6° e 14 px acima, balança (+2,4° aos 812 ms, −0,8° aos 1092) e para. Pivô 20 px acima.
- **`AtrasDoRetrato` = `enfRaiosRetrato`**: os raios de cartaz (1,9E; 1,5E no celular) girando em 160 s. O `.enfHaloRetrato` da base vira a poça quente do canhão.
- **Rota e elo** descem para o pé da janela (o arco cortaria os cantos de cima). No capitão, «MESTRE DE PICADEIRO» é uma fita de ouro centrada logo acima deles. A **cartola** tem 96 px (80 no celular) a −66 px, e o cartaz desce 70 px.
- **Nick:**
  - Smokum em folha de ouro (os mesmos eco e cromo do título), `display: inline-grid`;
  - tamanho `100cqi / --largura-nick-em`: de 30 a 92 px abaixo de 900 e de 44 a 150 px a partir de 900. Medido: NAK4Y com 150 px no 1440 e 92 no 390; R A Z E R A L numa linha no 1440 (635 de 654 px) e em duas no 390;
  - entrada `nickOrganiza` (1500 ms): nasce torto (−3°), pula reto e assenta — o mesmo gesto do título;
  - nunca passa de duas linhas e nunca parte palavra (`larguraDoNickEm`).
- **Nome real** (quando houver): Playfair itálico de 18 px.
- **Chips**: as bandeirolas, alinhadas à esquerda.
- **«PERFORMANCE NO CAMPEONATO»**: Smokum de 20–26 px em ouro, com o cordão de bolinhas. Não sobe.
- **Estatísticas = cartazinhos pendurados**:
  - papel com fio duplo, valor em Smokum carmim de 22–30 px (7,3:1), rótulo em tinta;
  - `cartazinhoCai`: balançam do alto (−5° → +1,6° → 0), com a duração em cascata do `.sobe` da base (espera de 58%);
  - o fio de neon da base (`::before`) some.
- **«O RESTO DA TRUPE»** (companheiros) = cartazes deitados:
  - papel com fio duplo e miniatura em arco (52 × 64 px; 44 × 54 no celular) com fio de ouro;
  - rota em carmim, nick em Smokum em tinta (16 px; 14 no celular), e a cartolinha no capitão.
- **Moldura**: a mesma sanefa e a plateia no pé do herói da ficha.
- **Trapézios** curtos (20vh).

---

## 9. Movimento reduzido, contraste, foco e riscos

**Movimento reduzido** (print conferido; **0 animações rodando**): o `.raiz *` da base para tudo e fica o pôster FINAL:
- a câmera reta;
- o canhão no leão, o feixe a 0,9 e os olhos a 0,85 (opacidades declaradas nas regras);
- os raios abertos e parados;
- os trapézios parados no ângulo de repouso (−4° e +4°);
- o pedestal e a plateia parados;
- ORGANIZAÇÃO alinhado e o DES torto (o torto é o `transform` da regra);
- os cartazes retos e a tarja colada.

**Contraste (WCAG):**

| texto e fundo | razão |
|---|---|
| marfim no breu / no gomo vinho / na faixa (ponto mais claro) | 18,4 / 16,7 / 7,5 |
| apoio no breu / gomo / lona iluminada | 9,2 / 8,4 / 7,2 |
| acento no breu / no papel preto | 12,5 / 12,2 |
| aviso na prega mais clara | 8,8 |
| «AS ATRAÇÕES» na prega mais clara | 8,7 |
| tinta no papel / no pé do papel | 15,3 / 11,2 |
| carmim no papel / no pé do papel | 7,3 / 5,3 |
| marfim na fitinha e na tarja carmim | 8,4 |
| ouro do nick do capitão / nome no papel preto | 14,6 / 14,6 |
| tinta na placa de ouro | 10,4–17,6 |
| texto na bandeirola do capitão / do OP.GG | 8,4 / 18,2 |
| DES branco no breu | 18,8 |
| face do título (meio) no breu / no gomo | 9,0 / 8,2 |
| faixa do bisel (3% da letra, por dentro do contorno) | 2,3 (só em texto de 48 px para cima) |
| nota no breu | 10,5 |
| anel de foco no breu / na cortina | 16,0 / 12,0 |
| cor do time `#FFB3C7` no fundo do site | 11,6 |

**Foco do teclado** (a ordem não muda: voltar → OP.GG → 5 cartazes → calendário → todos os times):
- o anel é o da base, `2px solid #FFE3A3` com offset de 3–4 px, sempre sobre fundo escuro (lona ou cortina);
- no cartaz, o anel fica na `.casca` (sem `clip-path`), de raio 0, e acompanha o balanço;
- nada focável tem `clip-path` ou máscara: as bandeirolas e as fitinhas são `::before` ou `span`.

**Leitor de tela:**
- o `h1` lê «DESORGANIZAÇÃO» uma vez (as 14 letras, o DES e todo enfeite são aria-hidden);
- «MESTRE DE PICADEIRO» é aria-hidden, e o leitor ouve «CAPITÃO» na placa, no chip e nos companheiros (base);
- a tarja sai com `lang="pt-BR"`;
- o `display: contents` vai num `div` sem papel (sem os bugs de acessibilidade de `contents` em botão ou tabela).

**Riscos e como evitar:**

| # | risco | como evitar |
|---|---|---|
| 1 | `display: contents` no `.blocoTexto` desliga a caixa dele (`position`, `z-index`, `container-type`) | já tratado: o contêiner do título é a `.heroiGrade`; kicker, créditos, título, lema e chips ganham `position: relative; z-index: 2`. Conferir no Safari |
| 2 | `sin()` sem suporte | a letra nasce reta (variável inválida → `transform` inicial); legível |
| 3 | id em módulo CSS ganha hash | o seletor da ficha usa `[id="tm-nick"]`, e não `#tm-nick` (conferido no lightningcss) |
| 4 | o minificador some com `translate:` ao lado de `transform:` | nenhuma regra tem os dois (o feixe usa só `transform`; o canhão, o raio, o olho e o pedestal usam só as propriedades individuais); conferido: 0 perdas |
| 5 | reserva de fonte mais larga cortando o título enquanto a Smokum carrega | as duas `@font-face` (Impact a 60%, Arial a 48%) são mais estreitas em toda maiúscula; o título fica menor por um instante, nunca cortado. No Android sem Arial local, cai no `sans-serif` (o mesmo limite do GdB) |
| 6 | acento cortado pelo `background-clip: text` | folga de 0,3 em em cima e 0,26 em embaixo no eco/cromo, mais `margin-top` na marca e no nick (til a 0,97 em). Conferido em print |
| 7 | o DES sai do lugar se o nome mudar | o tema é pelo slug: nome novo, slug novo, visual padrão |
| 8 | cartas de alturas diferentes deixando buraco | a linha do nick é `1fr` e centrada |
| 9 | R A Z E R A L quebrando «R A Z / E R A L» no celular | é a regra da casa (quebra entre palavras; cada letra é palavra). Fica; se o Lucas preferir numa linha, é um ajuste no limiar só para nicks de letras soltas, fora deste tema |
| 10 | o banheiro na foto do capitão | é a piada do aviso. O `foco` mantém rosto, venda e punhos no terço de cima |
| 11 | a cor do time colidir com um dos quatro novos | `#FFB3C7` fica ≥ 19,8 das escolhas prováveis; reservas na seção 3.5. Rodar o ΔE quando saírem |
| 12 | a plateia fora da dobra no 1440×810 | é de propósito (aparece na rolagem); no celular e no tablet está na primeira tela |
| 13 | desempenho | o maior laço é a camada dos raios (2,3E, ~600 px) girando no compositor; nenhum repaint em laço; o elenco por rolagem anima só transform. No celular são 3 laços |
| 14 | o stub do `next/font` nos testes | exportar `Smokum` e `Playfair_Display` em `tests/stubs/next-font-google.ts`, senão o import quebra a suíte |

---

## 10. Os arquivos do cenário (código completo)

### 10.1 `components/times/cenarios/picadeiro.tsx` (novo)
```tsx
import p from "@/components/times/cenarios/picadeiro.module.css";
import pf from "@/components/times/cenarios/picadeiro-ficha.module.css";
import { Cartola, CartolaMini, Fa, Pedestal } from "@/components/times/cenarios/ornamentos-picadeiro";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/**
 * Cenário "picadeiro" — DESORGANIZAÇÃO, «O Circo da Desorganização»: o time da organização do
 * campeonato, que admite que tudo isto é um circo — e que o circo é deles. Debaixo da lona preta
 * e vinho, o canhão de luz procura o leão, ele salta para o pedestal e acorda (olhos de ouro); o
 * nome se organiza letra por letra — menos o DES, que são os palhaços e ficam tortos para sempre.
 * O elenco são os cartazes das atrações pendurados na cortina; o capitão é o mestre de picadeiro
 * (a cartola); a página fecha no cartaz da temporada com a tarja «SUJEITO A ATRASO».
 */
export const PICADEIRO: CenarioDoTema = {
  classes: p,
  classesDaFicha: pf,
  Fundo: () => (
    <>
      <div className={p.enfLona} />
      <div className={cx(p.enfTrapezio, p.enfTrapezioEsq)} />
      <div className={cx(p.enfTrapezio, p.enfTrapezioDir)} />
    </>
  ),
  // A sanefa da lona no padding de cima; a plateia (silhuetas) no padding de baixo.
  Moldura: () => (
    <>
      <span className={p.enfSanefa} aria-hidden="true" />
      <span className={p.enfPublico} aria-hidden="true">
        <Fa className={p.enfFa} />
        <Fa className={p.enfFa} />
        <Fa className={p.enfFa} />
      </span>
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={p.enfRaios} aria-hidden="true" />
      <span className={p.enfFeixe} aria-hidden="true" />
      <span className={p.enfCanhao} aria-hidden="true" />
    </>
  ),
  NoEscudo: () => (
    <>
      <span className={cx(p.enfOlho, p.enfOlhoEsq)} aria-hidden="true" />
      <span className={cx(p.enfOlho, p.enfOlhoDir)} aria-hidden="true" />
    </>
  ),
  // O picadeiro (serragem com meio-fio) e o pedestal onde o leão pousa.
  Chao: () => (
    <div className={p.enfPicadeiro} aria-hidden="true">
      <span className={p.enfSerragem} />
      <Pedestal className={p.enfPedestal} id="dsg-pedestal" />
    </div>
  ),
  Insignia: ({ className, id }) => <Cartola className={className} id={id} />,
  InsigniaMini: ({ className }) => <CartolaMini className={className} />,
  AtrasDoRetrato: () => <span className={pf.enfRaiosRetrato} aria-hidden="true" />,
  AtrasDoElenco: () => (
    <div className={p.enfCortina} aria-hidden="true">
      <span className={p.enfBambinela} />
    </div>
  ),
  NaCartela: () => <span className={p.enfEstrelasCartaz} aria-hidden="true" />,
};
```

### 10.2 `components/times/cenarios/ornamentos-picadeiro.tsx` (novo; todo SVG `aria-hidden`, `focusable="false"`, ids com prefixo)
```tsx
/*
 * Os ornamentos SVG do cenário "picadeiro" (Desorganização). Todos são ENFEITE: aria-hidden,
 * focusable=false, sem <text>, e os ids levam um prefixo para não colidir com outro SVG da página.
 */

type ComClasse = Readonly<{ className?: string }>;

/**
 * A insígnia do capitão: a CARTOLA do mestre de picadeiro — copa de cetim preto com brilho,
 * fita carmim com debrum e estrela de ouro, aba curva. Viewbox 120×100.
 */
export function Cartola({ className, id = "dsg-cartola" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-copa`} x1="0" x2="1">
          <stop offset="0" stopColor="#050304" />
          <stop offset=".34" stopColor="#2c2124" />
          <stop offset=".55" stopColor="#0b0708" />
          <stop offset="1" stopColor="#1c1416" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF6D2" />
          <stop offset=".5" stopColor="#E0B04A" />
          <stop offset="1" stopColor="#6A420E" />
        </linearGradient>
      </defs>
      <path d="M30 72 L33 16 Q60 9 87 16 L90 72 Q60 80 30 72 Z" fill={`url(#${id}-copa)`} stroke="#000" strokeWidth="2" />
      <path d="M33 16 Q60 9 87 16 Q60 23 33 16 Z" fill="#3a2d31" stroke="#000" strokeWidth="1.5" />
      <path d="M31 58 Q60 65 89 58 L89.6 70 Q60 78 30.4 70 Z" fill="#8C1A2E" stroke={`url(#${id}-ouro)`} strokeWidth="1.6" />
      <path d="M60 60.5 l1.9 3.9 4.3.6-3.1 3 .7 4.2-3.8-2-3.9 2 .8-4.2-3.1-3 4.3-.6z" fill={`url(#${id}-ouro)`} />
      <path d="M41 21 Q45 40 42 56" fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M6 76 Q8 70 20 70 Q60 82 100 70 Q112 70 114 76 Q112 84 96 84 Q60 94 24 84 Q8 84 6 76 Z"
        fill="#0b0809"
        stroke="#000"
        strokeWidth="2"
      />
      <path d="M14 74 Q60 88 106 74" fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2" />
    </svg>
  );
}

/** A cartola chapada (chips, placas, cartela, companheiros): pinta com currentColor. 24×24. */
export function CartolaMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M7 17 7.8 4.6Q12 3.4 16.2 4.6L17 17Z" />
      <path d="M7.2 13.2Q12 14.2 16.8 13.2L16.9 15.4Q12 16.4 7.1 15.4Z" fillOpacity=".4" />
      <path d="M2.5 18.2Q12 22.4 21.5 18.2Q20.8 16.6 19 16.8Q12 19.4 5 16.8Q3.2 16.6 2.5 18.2Z" />
    </svg>
  );
}

/**
 * O pedestal de circo (o tambor onde o leão pousa): corpo cilíndrico com listras diagonais carmim
 * e marfim, volume por gradiente, frisos de ouro em cima e embaixo, tampo vinho com estrela.
 * Viewbox 200×110: o tampo é a elipse (100, 24) 92×13; a base, (100, 88).
 */
export function Pedestal({ className, id = "dsg-pedestal" }: ComClasse & Readonly<{ id?: string }>) {
  return (
    <svg className={className} viewBox="0 0 200 110" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`${id}-listras`} width="24" height="24" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
          <rect width="24" height="24" fill="#7E1830" />
          <rect width="12" height="24" fill="#EADBC2" />
        </pattern>
        <linearGradient id={`${id}-volume`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity=".62" />
          <stop offset=".3" stopColor="#fff" stopOpacity=".14" />
          <stop offset=".55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".66" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" x2="1">
          <stop offset="0" stopColor="#6A420E" />
          <stop offset=".3" stopColor="#F9DC8A" />
          <stop offset=".6" stopColor="#DDA43A" />
          <stop offset="1" stopColor="#6A420E" />
        </linearGradient>
      </defs>
      <ellipse cx="100" cy="100" rx="98" ry="9" fill="#000" fillOpacity=".55" />
      <path d="M8 24V88A92 13 0 0 0 192 88V24Z" fill={`url(#${id}-listras)`} />
      <path d="M8 24V88A92 13 0 0 0 192 88V24Z" fill={`url(#${id}-volume)`} />
      <path d="M8 80A92 13 0 0 0 192 80V90A92 13 0 0 1 8 90Z" fill={`url(#${id}-ouro)`} />
      <path d="M8 24A92 13 0 0 0 192 24V33A92 13 0 0 1 8 33Z" fill={`url(#${id}-ouro)`} />
      <ellipse cx="100" cy="24" rx="92" ry="13" fill="#4A0C19" stroke="#F2CF7A" strokeWidth="2" />
      <path d="M100 18.6l2.5 2.4 5.6.3-4.1 1.9 1.3 2.6-5.3-1.3-5.3 1.3 1.3-2.6-4.1-1.9 5.6-.3z" fill="#E0B04A" />
    </svg>
  );
}

/** Um da primeira fila, de braços para cima (pula no TÁ-DÁ). Silhueta com contorno quente. 60×70. */
export function Fa({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 60 70" aria-hidden="true" focusable="false">
        <g fill="#0b0705" stroke="#3a2412" strokeWidth="1.2">
          <path d="M4 70Q8 46 30 44Q52 46 56 70Z" />
          <circle cx="30" cy="30" r="12" />
          <path d="M11 53 4 22 10 20 18 49Z" />
          <path d="M49 53 56 22 50 20 42 49Z" />
          <circle cx="6" cy="19" r="4" />
          <circle cx="54" cy="19" r="4" />
        </g>
      </svg>
    </span>
  );
}
```

### 10.3 `components/times/cenarios/picadeiro.module.css` (novo, completo)
```css
/*
 * Cenário "picadeiro" — DESORGANIZAÇÃO, «O Circo da Desorganização» (cenarios/picadeiro.tsx).
 *
 * Duas famílias de regra (como no boteco):
 *  - ENFEITES próprios (`.enf…`, aria-hidden, sem texto): lona, trapézios, sanefa, plateia,
 *    raios, feixe, canhão de luz, olhos do leão, picadeiro, pedestal, cortina, estrelas do cartaz.
 *  - GANCHOS: classe com o MESMO nome de uma peça da base, sempre `.raiz` + o seletor da base.
 *    Nada de @layer.
 * Conteúdo só anima transform (o tremelique do DES anima `rotate`, também transformação), sem
 * delay nem fill-mode, com a espera dentro do keyframe. Nenhum flash: o que acende só SOBE
 * (canhão, feixe, olhos).
 */

/* As reservas da Smokum (fontes-dos-temas.ts: `fallback`), MAIS ESTREITAS que ela em toda
   maiúscula, acento e algarismo (canvas, 27/10): Impact × 0,60 (pior caso: «6», 0,606) e Arial
   × 0,48 (pior caso: «Q», 0,482). A largura medida (lib/temas/metricas.ts) vale para as três. */
@font-face {
  font-family: "Smokum Reserva Estreita";
  src: local("Impact"), local("Impact Regular");
  size-adjust: 60%;
}
@font-face {
  font-family: "Smokum Reserva";
  src: local("Arial"), local("ArialMT"), local("Helvetica"), local("Helvetica Neue"), local("Roboto"), local("Arimo"), local("Liberation Sans");
  size-adjust: 48%;
}

/* ======================================================================= raiz */
.raiz {
  --tm-titulo-estilo: normal;
  --tm-titulo-peso: 400;
  --tm-titulo-peso-medio: 400;
  --tm-placa-topo: var(--tm-metal-luz);
  --tm-nick-meio: var(--tm-metal-alto);
  --tm-nick-base: var(--tm-metal-meio);
  --tm-valor-base: var(--tm-metal-meio);
  --tm-etiqueta: var(--tm-texto);
  --tm-foto-fundo: #1c0f0c;
  --tm-chip-capitao: var(--tm-texto);
  --tm-mono: var(--carmim);
  --tm-eco-base: #170805;
  /* Do cenário: papel de cartaz, tinta de impressão, carmim, veludo, tinta de palhaço. */
  --papel: #f2e5c8;
  --papel-claro: #f7ecd4;
  --papel-sombra: #d8c49c;
  --tinta-cartaz: #1b0c08;
  --carmim: #8c1a2e;
  --veludo: #6e1426;
  --veludo-escuro: #2a0710;
  --ouro-fio: #e0b04a;
  --palhaco: #fbf7ee;
  font-synthesis: none;
}

/* ======================================================================= palco */
/* A câmera entra GIRANDO de leve, como quem roda no picadeiro (a RX dá zoom, a QM desce de
   grua, o GdB faz travelling). */
@keyframes picadeiroGira {
  from {
    transform: rotate(-3deg) scale(1.12);
  }
  to {
    transform: none;
  }
}
@keyframes picadeiroGiraCelular {
  from {
    transform: rotate(-2deg) scale(1.08);
  }
  to {
    transform: none;
  }
}
.raiz .enfCamera {
  animation: picadeiroGira 2200ms cubic-bezier(0.16, 1, 0.3, 1);
}
@media (max-width: 599px) {
  .raiz .enfCamera {
    animation-name: picadeiroGiraCelular;
  }
}

/* A lona por dentro: gomos preto e vinho que convergem para o mastro (acima da tela), com
   costura de ouro; o centro esquenta onde o canhão bate. Estático. */
.enfLona {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 46% at 50% 56%, rgba(255, 206, 130, 0.13), transparent 72%),
    radial-gradient(130% 70% at 50% -6%, rgba(0, 0, 0, 0.82), transparent 62%),
    linear-gradient(180deg, transparent 62%, rgba(0, 0, 0, 0.66) 100%),
    repeating-conic-gradient(from 0deg at 50% -42%, #0e0807 0deg 3.4deg, #4a3013 3.4deg 3.62deg, #2c0912 3.62deg 7.04deg, #4a3013 7.04deg 7.26deg);
}
@media (max-width: 899px) {
  .enfLona {
    background:
      radial-gradient(80% 40% at 50% 48%, rgba(255, 206, 130, 0.13), transparent 72%),
      radial-gradient(150% 60% at 50% -4%, rgba(0, 0, 0, 0.82), transparent 62%),
      linear-gradient(180deg, transparent 62%, rgba(0, 0, 0, 0.66) 100%),
      repeating-conic-gradient(from 0deg at 50% -24%, #0e0807 0deg 5deg, #4a3013 5deg 5.3deg, #2c0912 5.3deg 10.3deg, #4a3013 10.3deg 10.6deg);
  }
}

/* Os trapézios: duas cordas (as bordas) e a barra de madeira com ponteiras de ouro (::after).
   Balançam devagar pelo alto. ≥1024 os dois; 600–1023 só o direito; celular nenhum. */
.enfTrapezio {
  position: absolute;
  top: 0;
  width: clamp(70px, 6.4vw, 112px);
  height: 44vh;
  border-inline: 2px solid rgba(201, 162, 74, 0.5);
  transform-origin: 50% 0;
  animation: balanca 6.4s ease-in-out infinite alternate;
}
.enfTrapezio::after {
  content: "";
  position: absolute;
  left: -7px;
  right: -7px;
  bottom: -5px;
  height: 9px;
  border-radius: 5px;
  background:
    radial-gradient(circle at 5px 50%, #f2cf7a 0 4px, transparent 4.5px),
    radial-gradient(circle at calc(100% - 5px) 50%, #f2cf7a 0 4px, transparent 4.5px),
    linear-gradient(180deg, #8a5426, #4a2a12);
  box-shadow: 0 6px 10px -4px rgba(0, 0, 0, 0.7);
}
.enfTrapezioEsq {
  left: 13%;
  transform: rotate(-4deg); /* o repouso (movimento reduzido) */
}
.enfTrapezioDir {
  right: 13%;
  height: 36vh;
  transform: rotate(4deg);
  animation-duration: 7.6s;
  animation-direction: alternate-reverse;
}
@keyframes balanca {
  from {
    transform: rotate(-4deg);
  }
  to {
    transform: rotate(4deg);
  }
}
/* Na ficha a coluna do texto fica à direita: trapézios curtos, acima do nick. O h1 da ficha
   tem id="tm-nick" (atributo, e não #id: id em módulo CSS ganha hash). */
.raiz:has([id="tm-nick"]) .enfTrapezio {
  height: 20vh;
}
@media (max-width: 1023px) {
  .enfTrapezioEsq {
    display: none;
  }
  .enfTrapezioDir {
    right: 5%;
    height: 24vh;
  }
}
@media (max-width: 599px) {
  .enfTrapezio {
    display: none;
  }
}

/* ======================================================================= moldura */
/* A faixa do herói (e da ficha) ganha altura para a sanefa; o padding de baixo vira a boca de
   cena onde a plateia senta (aqui, e não em .raiz: a base declara --barra em .raiz). */
.raiz .heroi {
  --barra: clamp(26px, 3.4vw, 46px);
  --publico: clamp(58px, 7vw, 92px);
  padding-bottom: calc(var(--publico) + 10px);
}
/* A sanefa da lona: veludo, debrum de ouro, recortes em meia-lua e borlas. Parada. */
.enfSanefa {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 3;
  height: var(--barra);
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 52' width='120' height='52'%3E%3Crect width='120' height='18' fill='%235C0F20'/%3E%3Cpath d='M0 18.5Q30 50 60 18.5Q90 50 120 18.5Z' fill='%237E1830'/%3E%3Cpath d='M0 18.5Q30 50 60 18.5Q90 50 120 18.5' fill='none' stroke='%23E0B04A' stroke-width='2'/%3E%3Crect y='15.5' width='120' height='3' fill='%23E0B04A'/%3E%3Cpath d='M60 19l-3.4 12q3.4 5.5 6.8 0z' fill='%23F2CF7A'/%3E%3Cpath d='M0 19l-3.4 12q3.4 5.5 6.8 0zM120 19l-3.4 12q3.4 5.5 6.8 0z' fill='%23F2CF7A'/%3E%3C/svg%3E") 50% 0 / auto 100% repeat-x;
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.55)); /* estático */
}
/* A plateia: silhuetas na boca de cena (o padding de baixo do herói, nunca sobre conteúdo).
   Cartola, criança no ombro, balde de pipoca, um celular filmando e — a única coisa rosa da
   página — um ALGODÃO-DOCE: o rosa que é a cor do time no resto do site. */
.enfPublico {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  height: var(--publico);
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 90' width='480' height='90'%3E%3Cg fill='%23070403' stroke='%233a2412' stroke-width='1.4'%3E%3Cpath d='M2 90Q6 62 32 60Q58 62 62 90Z'/%3E%3Ccircle cx='32' cy='45' r='15'/%3E%3Cpath d='M68 90Q72 66 96 64Q120 66 124 90Z'/%3E%3Ccircle cx='96' cy='50' r='14'/%3E%3Cpath d='M84 39h24v-20h-24zM78 41h36v-4h-36z'/%3E%3Cpath d='M132 90Q136 60 162 58Q188 60 192 90Z'/%3E%3Ccircle cx='162' cy='44' r='15'/%3E%3Cpath d='M150 31Q153 20 162 19Q171 20 174 31Z'/%3E%3Ccircle cx='162' cy='12' r='8'/%3E%3Cpath d='M200 90Q204 64 228 62Q252 64 256 90Z'/%3E%3Ccircle cx='228' cy='48' r='15'/%3E%3Cpath d='M246 34h16l-3 22h-10z'/%3E%3Ccircle cx='249' cy='32' r='3.5'/%3E%3Ccircle cx='255' cy='30' r='3.5'/%3E%3Ccircle cx='260' cy='33' r='3'/%3E%3Cpath d='M266 90Q270 60 296 58Q322 60 326 90Z'/%3E%3Ccircle cx='296' cy='43' r='16'/%3E%3Cpath d='M309 66l9-34' stroke-width='2.2'/%3E%3Cpath d='M334 90Q338 66 360 64Q382 66 386 90Z'/%3E%3Ccircle cx='360' cy='50' r='14'/%3E%3Cpath d='M372 66l12-34 6 2-11 33z'/%3E%3Crect x='380' y='16' width='12' height='19' rx='2'/%3E%3Cpath d='M396 90Q400 62 426 60Q452 62 456 90Z'/%3E%3Ccircle cx='426' cy='45' r='15'/%3E%3C/g%3E%3Cg fill='%23FFB3C7' fill-opacity='.9'%3E%3Ccircle cx='318' cy='24' r='9'/%3E%3Ccircle cx='327' cy='28' r='7.5'/%3E%3Ccircle cx='310' cy='29' r='7'/%3E%3Ccircle cx='320' cy='32' r='7'/%3E%3C/g%3E%3C/svg%3E") 0 100% / auto 100% repeat-x;
}
/* Três da primeira fila pulam no TÁ-DÁ (o leão pousa aos 896 ms). Celular: dois. */
.enfFa {
  position: absolute;
  bottom: -2px;
  width: calc(var(--publico) * 0.78);
  height: calc(var(--publico) * 0.92);
  transform-origin: 50% 100%;
  animation: vibra 1500ms linear;
}
.enfFa svg {
  display: block;
  width: 100%;
  height: 100%;
}
.enfFa:nth-child(1) {
  left: 9%;
}
.enfFa:nth-child(2) {
  left: 47%;
  animation-duration: 1560ms;
}
.enfFa:nth-child(3) {
  left: 80%;
  animation-duration: 1620ms;
}
@keyframes vibra {
  0%,
  62% {
    transform: none;
  }
  68% {
    transform: translateY(-22%);
  }
  76% {
    transform: translateY(2%);
  }
  82% {
    transform: translateY(-10%);
  }
  90%,
  100% {
    transform: none;
  }
}
@media (max-width: 899px) {
  .enfFa:nth-child(3) {
    display: none;
  }
}

/* ======================================================================= herói: o CARTAZ */
/* A ordem de um cartaz de circo, em TODA largura: o nome em cima, o leão no pedestal no meio,
   a faixa do lema e as bandeirolas embaixo. O bloco de texto vira `contents` e cada peça vai
   para a sua linha (a ordem do DOM e do leitor de tela não muda: o escudo é decorativo). A
   consulta de contêiner do título passa para a grade. */
.raiz .heroiGrade {
  --escudo: clamp(196px, 60vw, 250px);
  container-type: inline-size;
  animation-name: none; /* sem tremor: quem pula é o leão */
}
.raiz .blocoTexto {
  display: contents;
}
.raiz .blocoTexto .kicker {
  order: 1;
  position: relative;
  z-index: 2;
  text-wrap: balance;
  animation-name: none; /* o .sobe o desceria 14 px para cima do título no quadro 0 */
}
.raiz .nomesDoElenco {
  order: 2;
  position: relative;
  z-index: 2;
  animation-name: none;
}
.raiz .titulo {
  order: 3;
  position: relative;
  z-index: 2;
}
.raiz .blocoEscudo {
  order: 4;
  margin-top: calc(var(--escudo) * 0.02);
  margin-bottom: calc(var(--escudo) * 0.3); /* o pedestal e o picadeiro moram aqui */
}
.raiz .lema {
  order: 5;
}
.raiz .blocoTexto .chips {
  order: 6;
  position: relative;
  z-index: 2;
  justify-content: center;
}
@media (min-width: 600px) and (max-width: 1023px) {
  .raiz .heroiGrade {
    --escudo: clamp(230px, min(36vw, 30svh), 290px);
  }
}
@media (min-width: 900px) {
  .raiz .heroiGrade {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    align-items: start;
    text-align: center;
    gap: 0;
    min-height: 0;
  }
  .raiz .blocoEscudo {
    grid-column: 1;
    grid-row: auto;
    justify-self: center;
  }
}
@media (min-width: 1024px) {
  .raiz .heroiGrade {
    --escudo: clamp(230px, min(24vw, 32svh), 340px);
    margin-top: 6px;
  }
}

/* -------------------------------------------- atrás do escudo: raios, feixe, canhão */
/* Os raios de cartaz antigo: 24 gomos de ouro translúcido, abrem no pouso e giram (160 s). */
.enfRaios {
  position: absolute;
  left: 50%;
  top: 47%;
  z-index: 0;
  width: 230%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: repeating-conic-gradient(from 0deg, rgba(240, 196, 100, 0.16) 0deg 6deg, transparent 6deg 15deg);
  -webkit-mask: radial-gradient(closest-side, #000 14%, rgba(0, 0, 0, 0.55) 42%, transparent 74%);
  mask: radial-gradient(closest-side, #000 14%, rgba(0, 0, 0, 0.55) 42%, transparent 74%);
  animation: raiosAbrem 1500ms cubic-bezier(0.2, 0.7, 0.2, 1), raiosGiram 160s linear infinite;
}
@keyframes raiosAbrem {
  0%,
  58% {
    scale: 0.55;
  }
  100% {
    scale: 1;
  }
}
@keyframes raiosGiram {
  to {
    rotate: 360deg;
  }
}
@media (max-width: 599px) {
  .enfRaios {
    width: 190%;
  }
}
/* O feixe do canhão seguidor, do alto à esquerda até o leão (≥600). Forma por clip-path
   ESTÁTICO; só a opacidade da camada sobe. */
.enfFeixe {
  display: none;
}
@media (min-width: 600px) {
  .enfFeixe {
    display: block;
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: 0;
    width: calc(var(--escudo) * 1.05);
    height: 260vh;
    transform-origin: 50% 0;
    transform: translateX(-50%) rotate(148deg);
    pointer-events: none;
    background: linear-gradient(180deg, rgba(255, 228, 170, 0.15), rgba(255, 228, 170, 0.05) 45%, transparent 80%);
    clip-path: polygon(0 0, 100% 0, 58% 100%, 42% 100%);
    opacity: 0.9;
    animation: feixeAcende 1200ms linear;
  }
}
@keyframes feixeAcende {
  0%,
  60% {
    opacity: 0;
  }
  78%,
  100% {
    opacity: 0.9;
  }
}
/* A poça de luz: entra pela esquerda procurando o leão e PEGA ele no pouso (864 ms). */
.enfCanhao {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: 150%;
  aspect-ratio: 1.15;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 238, 196, 0.4), rgba(255, 214, 140, 0.15) 55%, rgba(255, 214, 140, 0.05) 72%, transparent 82%);
  animation: canhaoProcura 1200ms linear;
}
@keyframes canhaoProcura {
  0%,
  16% {
    transform: translate(-105%, 14%) scale(0.72);
    opacity: 0.4;
    animation-timing-function: cubic-bezier(0.35, 0, 0.2, 1);
  }
  72% {
    transform: translate(5%, -2%) scale(1.04);
    opacity: 1;
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  100% {
    transform: none;
    opacity: 1;
  }
}

/* -------------------------------------------- o escudo: o SALTO do leão */
/* Agachado (quadro 0: o escudo inteiro, 3% abaixo e achatado a 90%), salta, cai no pedestal
   aos 896 ms, amassa, quica e assenta. Pivô no pé do monograma D (87% da caixa). */
@keyframes saltoDoLeao {
  0%,
  30% {
    transform: translate3d(0, 3%, 0) scale(1.05, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.6, 0.35, 1);
  }
  47% {
    transform: translate3d(0, -9%, 0) scale(0.96, 1.07);
    animation-timing-function: cubic-bezier(0.55, 0, 0.9, 0.45);
  }
  64% {
    transform: none;
  }
  68% {
    transform: translate3d(0, 1.5%, 0) scale(1.07, 0.9);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  78% {
    transform: translate3d(0, -1.6%, 0) scale(0.98, 1.03);
  }
  88% {
    transform: scale(1.01, 0.99);
  }
  100% {
    transform: none;
  }
}
.raiz .escudo {
  /* Pontos medidos no webp de 640 px (opaco: x 0,5–99,7%, y 12,7–87,5%). */
  --olho-esq-x: 42.6%;
  --olho-dir-x: 56.4%;
  --olho-y: 37.3%;
  transform-origin: 50% 87%;
  animation: saltoDoLeao 1400ms linear;
}
/* O leão "acorda" no pouso: os olhos de ouro acendem (só sobe a luz) e ficam a 85%. */
.enfOlho {
  position: absolute;
  top: var(--olho-y);
  z-index: 1;
  width: 8.5%;
  aspect-ratio: 1.7;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  mix-blend-mode: screen; /* camada pequena */
  background: radial-gradient(closest-side, rgba(255, 240, 170, 0.95), rgba(255, 190, 60, 0.5) 45%, transparent 76%);
  opacity: 0.85;
  animation: olhoAcende 1600ms linear;
}
.enfOlhoEsq {
  left: var(--olho-esq-x);
}
.enfOlhoDir {
  left: var(--olho-dir-x);
}
@keyframes olhoAcende {
  0%,
  57% {
    opacity: 0;
  }
  63% {
    opacity: 1;
  }
  100% {
    opacity: 0.85;
  }
}

/* -------------------------------------------- chão: o picadeiro e o pedestal */
/* A caixa do chão começa a 78% do escudo: o tampo do pedestal (elipse) fica centrado a 87,6%,
   onde pousa o pé do D; o picadeiro (serragem com meio-fio carmim e fio de ouro) em volta. */
.enfPicadeiro {
  position: absolute;
  left: 50%;
  top: 78%;
  z-index: 0;
  width: calc(var(--escudo) * 2.7);
  height: calc(var(--escudo) * 0.6);
  translate: -50% 0;
  pointer-events: none;
}
.enfSerragem {
  position: absolute;
  left: 0;
  right: 0;
  top: 28%;
  height: 72%;
  border-radius: 50%;
  background: radial-gradient(closest-side, #4a3019 0%, #2e1c0f 62%, #1a0f08 92%, transparent 100%);
  box-shadow: inset 0 0 0 calc(var(--escudo) * 0.022) var(--carmim), inset 0 0 0 calc(var(--escudo) * 0.03) var(--ouro-fio);
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
  mask-image: linear-gradient(180deg, #000 55%, transparent);
}
.enfPedestal {
  position: absolute;
  left: 50%;
  top: 0;
  width: calc(var(--escudo) * 0.8);
  height: auto;
  translate: -50% 0;
  transform-origin: 50% 100%;
  animation: pedestalAmortece 1400ms linear;
}
@keyframes pedestalAmortece {
  0%,
  64% {
    transform: none;
  }
  69% {
    transform: scaleY(0.94);
  }
  80% {
    transform: scaleY(1.015);
  }
  100% {
    transform: none;
  }
}

/* ======================================================================= título: ORGANIZAÇÃO + o DES */
/* Pela largura MEDIDA da maior palavra (--largura-em; DESORGANIZAÇÃO = 5,927 em na Smokum, com
   espaçamento e sobra). Sem a métrica, um fator conservador. */
.raiz .tituloVisual {
  --tm-titulo-max: 112px;
  --tam: clamp(36px, calc(100cqi / var(--largura-em, calc(var(--letras) * 0.48))), var(--tm-titulo-max));
}
@media (min-width: 600px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(150px, 16svh);
  }
}
@media (min-width: 1024px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(168px, 14svh);
  }
}
.raiz .marca {
  font-size: var(--tam);
  line-height: 1;
  letter-spacing: 0.01em;
  margin-top: 0.12em; /* o til do Ã sobe a 0,97 em */
  white-space: normal;
  text-transform: uppercase;
  font-kerning: none;
  font-variant-ligatures: none;
  animation: none; /* quem se mexe são as letras */
}
.raiz .palavra {
  display: inline-block;
  white-space: nowrap;
}
/* Cada letra nasce num lugar "bagunçado" (seno do índice: determinístico, sem JS; sem suporte
   a sin() as variáveis ficam inválidas e a letra nasce reta) e se ORGANIZA em cascata. */
.raiz .letra {
  display: inline-grid;
  --dy: calc(sin(calc(var(--i) * 2.3rad + 0.4rad)) * 0.07em);
  --dr: calc(sin(calc(var(--i) * 1.7rad + 1.1rad)) * 8deg);
  animation-name: organiza;
  animation-duration: calc(1500ms + var(--i, 0) * 70ms);
  animation-timing-function: linear;
}
.raiz .letra > * {
  grid-area: 1 / 1;
}
/* O DES (as três primeiras letras): os palhaços. O torto é o REPOUSO; tentam se alinhar depois
   da cascata, caem de volta e tremelicam a cada 11 s (`rotate`, que compõe com o transform). */
.raiz .palavra > .letra:nth-child(-n + 3) {
  transform: translateY(var(--y)) rotate(var(--r));
  animation-name: palhacos, tremelique;
  animation-duration: calc(2600ms + var(--i, 0) * 80ms), 11s;
  animation-timing-function: linear, linear;
  animation-iteration-count: 1, infinite;
}
.raiz .palavra > .letra:nth-child(1) {
  --y: 0.05em;
  --r: -9deg;
}
.raiz .palavra > .letra:nth-child(2) {
  --y: -0.05em;
  --r: 6deg;
}
.raiz .palavra > .letra:nth-child(3) {
  --y: 0.07em;
  --r: -4deg;
}
@keyframes organiza {
  0%,
  44% {
    transform: translateY(var(--dy)) rotate(var(--dr));
  }
  48% {
    transform: translateY(var(--dy)) rotate(calc(var(--dr) + 2deg));
  }
  52% {
    transform: translateY(var(--dy)) rotate(calc(var(--dr) - 2deg));
  }
  56% {
    transform: translateY(var(--dy)) rotate(var(--dr));
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  68% {
    transform: translateY(-0.16em) rotate(0deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  78% {
    transform: translateY(0.02em) scale(1.04, 0.95);
  }
  88% {
    transform: translateY(-0.02em) scale(0.99, 1.01);
  }
  100% {
    transform: none;
  }
}
@keyframes palhacos {
  0%,
  60% {
    transform: translateY(var(--y)) rotate(var(--r));
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  68% {
    transform: translateY(-0.12em) rotate(0deg);
  }
  73% {
    transform: translateY(-0.1em) rotate(calc(var(--r) * -0.3));
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  84% {
    transform: translateY(0.03em) rotate(calc(var(--r) * 1.35));
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  100% {
    transform: translateY(var(--y)) rotate(var(--r));
  }
}
@keyframes tremelique {
  0%,
  90% {
    rotate: 0deg;
  }
  92% {
    rotate: 3deg;
  }
  94.5% {
    rotate: -2.5deg;
  }
  97% {
    rotate: 1deg;
  }
  100% {
    rotate: 0deg;
  }
}
/* Folga de tinta: til e acento até 0,97 em, cedilha até 0,23 em abaixo da linha de base. */
.raiz .eco,
.raiz .cromo {
  padding: 0.3em 0.14em 0.26em 0.06em;
  margin: -0.3em -0.14em -0.26em -0.06em;
}
/* O contorno de tinta de impressão (estático, atrás de toda face; .marca é isolate). */
.raiz .eco {
  position: static;
  inset: auto;
  z-index: -1;
  color: var(--tm-eco-base);
  -webkit-text-stroke: 0.09em var(--tm-eco-base);
  text-shadow: 0 0.06em 0 #000, 0 0.12em 0.2em rgba(0, 0, 0, 0.65), 0 0 0.45em rgba(140, 26, 46, 0.5);
  user-select: none;
}
/* A tinta garantida: ouro sólido. */
.raiz .cromo {
  color: var(--tm-metal-meio);
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  /* Folha de ouro com bisel: a caixa tem 1,56 em (0,3 + 1 + 0,26); as maiúsculas vão de 26% a
     74% dela, a faixa escura cai no meio (51–54%). Parada (nada de brilho correndo). */
  .raiz .cromo {
    background-image: linear-gradient(180deg, var(--tm-metal-luz) 22%, var(--tm-metal-alto) 32%, var(--tm-metal-meio) 47%, var(--tm-metal-sombra) 51%, var(--tm-metal-fundo) 54%, var(--tm-metal-volta) 64%, var(--tm-metal-luz) 69%, var(--tm-metal-base) 78%);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 0;
    animation: none;
  }
  /* O DES: tinta branca de palhaço, pincelada seca (estrias paradas). */
  .raiz .palavra > .letra:nth-child(-n + 3) > .cromo {
    background-image:
      repeating-linear-gradient(97deg, transparent 0 0.05em, rgba(120, 96, 70, 0.22) 0.05em 0.065em, transparent 0.065em 0.12em),
      linear-gradient(180deg, #fff 24%, var(--palhaco) 52%, #e6dccb 76%);
  }
}

/* -------------------------------------------- o lema na FAIXA de cartaz */
.raiz .lema {
  position: relative;
  z-index: 2;
  width: fit-content;
  max-width: min(100% - 44px, 32em);
  margin: 0 auto;
  padding: 0.5em 1.3em 0.55em;
  background: linear-gradient(180deg, #96203a, var(--veludo) 62%, #5a0f1f);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16), inset 0 -2px 0 rgba(0, 0, 0, 0.25), 0 12px 22px -12px #000;
  color: var(--tm-texto); /* 7,5:1 no ponto mais claro da faixa */
  font: italic 500 clamp(15px, 1.25vw, 19px) / 1.35 var(--tm-fonte-assinatura), Georgia, serif;
  text-wrap: balance;
}
/* As pontas dobradas da faixa (atrás dela; recorte em rabo de andorinha estático). */
.raiz .lema::before,
.raiz .lema::after {
  content: "";
  position: absolute;
  top: 0.42em;
  bottom: -0.42em;
  z-index: -1;
  width: 1.5em;
  background: #4a0c19;
}
.raiz .lema::before {
  right: calc(100% - 0.55em);
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, 0.5em 50%);
}
.raiz .lema::after {
  left: calc(100% - 0.55em);
  clip-path: polygon(0 0, 100% 0, calc(100% - 0.5em) 50%, 100% 100%, 0 100%);
}

/* -------------------------------------------- chips: bandeirolas de picadeiro */
/* Rabo de andorinha à direita, no ::before (nada de clip-path no elemento focável). */
.raiz .chip {
  padding-right: 28px;
}
.raiz .chip::before {
  transform: none;
  border-radius: 0;
  clip-path: polygon(0 0, 100% 0, calc(100% - 11px) 50%, 100% 100%, 0 100%);
}
.raiz .chipPts::before {
  background: linear-gradient(180deg, var(--tm-metal-luz), var(--tm-metal-placa));
  box-shadow: none;
}
.raiz .chipNumero {
  font: 400 26px / 1 var(--tm-fonte-titulo), sans-serif;
}
.raiz .chipCapitao::before {
  background: linear-gradient(180deg, #8a1c34, #5a0f1f);
  border: 0;
  box-shadow: inset 0 0 0 1px rgba(224, 176, 74, 0.75);
}
.raiz .chipOpgg::before {
  border: 0;
  background: rgba(11, 7, 6, 0.72);
  box-shadow: inset 0 0 0 2px var(--tm-primaria);
}
.raiz .chipOpgg:hover::before {
  background: #3a0a14;
}
/* «MESTRE DE PICADEIRO · nak4y» passa de ~270 px: abaixo de 420 a bandeirola ocupa a linha e o
   texto corre em bloco (com flex, cada pedaço quebrava na própria coluna — lição do GdB). */
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

/* ======================================================================= elenco: a cortina */
.raiz .elencoSecao {
  isolation: isolate;
  padding-top: clamp(70px, 8vw, 104px);
  padding-bottom: clamp(56px, 6vw, 88px);
}
/* O pano de boca: veludo em pregas (gradiente parado), com a bambinela de ouro em cima. */
.enfCortina {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background:
    linear-gradient(180deg, rgba(0, 0, 0, 0.5) 0%, transparent 16%, transparent 80%, rgba(0, 0, 0, 0.72) 100%),
    radial-gradient(60% 40% at 50% 46%, rgba(255, 206, 130, 0.1), transparent 70%),
    repeating-linear-gradient(90deg, #2a0710 0px, #4e0d1b 16px, #6e1426 28px, #521020 42px, #2a0710 60px);
}
.enfBambinela {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: clamp(36px, 4.4vw, 56px);
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 52' width='120' height='52'%3E%3Crect width='120' height='18' fill='%233A0812'/%3E%3Cpath d='M0 18.5Q30 50 60 18.5Q90 50 120 18.5Z' fill='%235C0F20'/%3E%3Cpath d='M0 18.5Q30 50 60 18.5Q90 50 120 18.5' fill='none' stroke='%23E0B04A' stroke-width='2'/%3E%3Crect y='15.5' width='120' height='3' fill='%23E0B04A'/%3E%3C/svg%3E") 50% 0 / auto 100% repeat-x;
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.6)); /* estático */
}
/* «AS ATRAÇÕES» em letra de cartaz, entre dois cordões de lâmpadas apagadas (bolinhas). */
.raiz .estrelando {
  justify-content: center;
  font: 400 clamp(30px, 3.6vw, 50px) / 1 var(--tm-fonte-titulo), "Arial Black", sans-serif;
  letter-spacing: 0.04em;
  color: var(--tm-metal-alto); /* 8,7:1 na prega mais clara */
  text-shadow: 0 0.05em 0 #000, 0 0 0.4em rgba(0, 0, 0, 0.6);
}
.raiz .estrelando::before,
.raiz .estrelando::after {
  content: "";
  flex: 0 1 clamp(40px, 12vw, 160px);
  height: 10px;
  background: radial-gradient(circle at 50% 50%, var(--tm-primaria) 0 3px, transparent 3.5px) 0 50% / 14px 10px repeat-x;
}
.raiz .aviso {
  text-align: center;
  margin: -4px auto clamp(26px, 3vw, 40px);
  font: italic 500 clamp(15px, 1.2vw, 18px) / 1.4 var(--tm-fonte-assinatura), Georgia, serif;
  color: #f0dcc0; /* 8,8:1 na prega mais clara */
  text-wrap: balance;
}

/* -------------------------------------------- as cartas: CARTAZES de atração */
/* Pendurados num prego: entram balançando (por rolagem; sem suporte, pelo relógio, com a
   espera dentro do keyframe). O quadro 0 é o cartaz inteiro, girado 7°. */
@keyframes cartazBalanca {
  from {
    transform: rotate(-7deg) translateY(-6px);
  }
  55% {
    transform: rotate(2.6deg);
  }
  78% {
    transform: rotate(-1deg);
  }
  to {
    transform: none;
  }
}
@keyframes cartazBalancaRelogio {
  0%,
  58% {
    transform: rotate(-7deg) translateY(-6px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
  }
  80% {
    transform: rotate(2.6deg);
  }
  91% {
    transform: rotate(-1deg);
  }
  100% {
    transform: none;
  }
}
.raiz .casca {
  transform-origin: 50% -16px; /* o prego */
  animation-name: cartazBalancaRelogio;
  animation-duration: calc(2000ms + var(--i, 0) * 140ms);
  animation-timing-function: linear;
}
@supports (animation-timeline: view()) {
  .raiz .casca {
    animation: cartazBalanca linear; /* o shorthand primeiro: ele zera a timeline */
    animation-timeline: view();
    animation-range: entry 0% entry calc(60% + var(--col, 0) * 12%);
  }
}
/* O barbante em V até o prego (o cartaz do capitão não tem: a cartola vai em cima). */
.raiz .casca::before {
  content: "";
  position: absolute;
  z-index: 5;
  top: -18px;
  left: 50%;
  width: 54%;
  height: 22px;
  translate: -50% 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% 3px, #f2cf7a 0 2.6px, #6a4a12 3px, transparent 3.6px) 50% 0 / 10px 10px no-repeat,
    linear-gradient(to top right, transparent calc(50% - 1px), #c9a24a calc(50% - 1px) calc(50% + 0.6px), transparent calc(50% + 0.6px)) 0 0 / 50% 100% no-repeat,
    linear-gradient(to top left, transparent calc(50% - 1px), #c9a24a calc(50% - 1px) calc(50% + 0.6px), transparent calc(50% + 0.6px)) 100% 0 / 50% 100% no-repeat;
}
.raiz .cascaCapitao::before {
  display: none;
}
.raiz .elenco {
  padding-top: 26px;
  row-gap: 40px;
}
/* O papel do cartaz: marfim com sombra nas bordas, fio duplo de tinta e duas estrelas carmim. */
.raiz .carta {
  container-type: inline-size;
  clip-path: none;
  padding: 5px;
  border-radius: 3px;
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%238C1A2E'/%3E%3C/svg%3E") 8px 8px / 9px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%238C1A2E'/%3E%3C/svg%3E") calc(100% - 8px) 8px / 9px no-repeat,
    radial-gradient(120% 90% at 50% 0%, var(--papel-claro), var(--papel) 60%, var(--papel-sombra));
  box-shadow: 0 16px 28px -14px rgba(0, 0, 0, 0.9), inset 0 0 0 1px rgba(27, 12, 8, 0.25);
}
.raiz .miolo {
  clip-path: none;
  grid-template-rows: auto 1fr auto;
  background: none;
  box-shadow: inset 0 0 0 1.5px var(--tinta-cartaz), inset 0 0 0 4px var(--papel), inset 0 0 0 5px var(--tinta-cartaz);
}
/* O texto sai de cima da foto (o link esticado continua se medindo pelo .miolo; .identidade
   fica SEM position). */
.raiz .sobreFoto {
  display: contents;
}
/* A janela em ARCO (a porta do picadeiro), com fio de ouro e fio de tinta. */
.raiz .foto {
  margin: 22px 12px 0;
  aspect-ratio: 4 / 5;
  border-radius: 50% 50% 3px 3px / 24% 24% 3px 3px;
  background: var(--tm-foto-fundo);
  box-shadow: 0 0 0 2px var(--ouro-fio), 0 0 0 3.5px var(--tinta-cartaz);
}
.raiz .foto img {
  filter: saturate(0.95) contrast(1.04); /* estático */
}
.raiz .enfGradacao {
  background: linear-gradient(180deg, transparent 70%, rgba(27, 12, 8, 0.28));
}
.raiz .enfHaloCarta {
  background: radial-gradient(closest-side, rgba(255, 214, 140, 0.4), rgba(224, 176, 74, 0.12) 60%, transparent);
}
.raiz .topo {
  grid-area: 1 / 1;
  align-self: start;
  z-index: 2;
  padding: 7px 8px 0;
}
/* A etiqueta da rota vira uma fitinha carmim com rabo de andorinha. */
.raiz .etiquetaRota {
  --tm-icone: #ffe3a3; /* 7,3:1 no carmim */
  border: 0;
  border-radius: 0;
  padding: 4px 12px 4px 8px;
  background: var(--carmim);
  clip-path: polygon(0 0, 100% 0, calc(100% - 6px) 50%, 100% 100%, 0 100%);
  color: #fff4e0; /* 8,4:1 */
}
.raiz .identidade {
  grid-area: 2 / 1;
  z-index: 2;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 4px;
  padding: 10px 10px 2px;
}
/* O nick em tinta de impressão: todos no tamanho da MAIOR palavra do elenco (medida); quebra só
   entre palavras. SEM filter/transform/position (ver tests/times/link-da-carta.test.ts). */
.raiz .nick {
  --nick: clamp(17px, calc((100cqi - 30px) / var(--maior-palavra-em, 4)), 34px);
  color: var(--tinta-cartaz); /* 15,3:1 no papel */
  letter-spacing: 0.01em;
  line-height: 1.02;
  padding: 0.08em 0.06em 0.04em;
  margin-right: 0;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .raiz .nick {
    background: none;
    -webkit-text-fill-color: currentColor;
  }
}
.raiz .placaCapitao {
  padding: 3px 12px 3px 10px;
  border-radius: 0;
  background: linear-gradient(180deg, var(--tm-metal-luz), var(--tm-metal-placa));
  color: var(--tm-tinta);
  clip-path: polygon(6px 0, calc(100% - 6px) 0, 100% 50%, calc(100% - 6px) 100%, 6px 100%, 0 50%);
  text-wrap: balance;
}
/* O rodapé do cartaz: fio de tinta, o nome em itálico e «FICHA →» em carmim. */
.raiz .rodape {
  grid-area: 3 / 1;
  border-top: 0;
  padding: 6px 12px 12px;
  flex-wrap: wrap;
  justify-content: center;
  row-gap: 2px;
  column-gap: 10px;
  background: linear-gradient(var(--tinta-cartaz), var(--tinta-cartaz)) 50% 0 / calc(100% - 24px) 1px no-repeat;
}
.raiz .nome {
  color: var(--tinta-cartaz);
  font: italic 500 13px / 1.25 var(--tm-fonte-assinatura), Georgia, serif;
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
  overflow-wrap: break-word;
  text-align: center;
}
.raiz .ficha {
  color: var(--carmim); /* 5,3:1 no pé do papel */
  font-weight: 700;
}
/* O capitão: o cartaz da ESTRELA (papel preto, tinta de ouro) e a cartola por cima. */
.raiz .cascaCapitao .carta {
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%23E0B04A'/%3E%3C/svg%3E") 8px 8px / 9px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%23E0B04A'/%3E%3C/svg%3E") calc(100% - 8px) 8px / 9px no-repeat,
    radial-gradient(120% 90% at 50% 0%, #241612, #120a08 60%, #0a0605);
  box-shadow: 0 0 0 1px #6a4a12, 0 18px 34px -14px #000;
}
.raiz .cascaCapitao .miolo {
  box-shadow: inset 0 0 0 1.5px var(--ouro-fio), inset 0 0 0 4px #120a08, inset 0 0 0 5px var(--ouro-fio);
}
.raiz .cascaCapitao .nick {
  color: var(--tm-metal-alto); /* 14,6:1 no papel preto */
}
.raiz .cascaCapitao .nome {
  color: #f0dcc0;
}
.raiz .cascaCapitao .ficha {
  color: var(--tm-acento);
}
.raiz .cascaCapitao .rodape {
  background-image: linear-gradient(var(--ouro-fio), var(--ouro-fio));
}
.raiz .coroaDoCapitao {
  width: 70px;
  top: -52px;
  rotate: -10deg;
  filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.6)); /* estático */
}
@media (max-width: 599px) {
  .raiz .coroaDoCapitao {
    width: 56px;
    top: -42px;
  }
  .raiz .cascaCapitao {
    margin-top: 24px;
  }
  /* Celular: o cartaz da estrela DEITADO na largura toda (foto à esquerda, texto à direita). */
  .raiz .cascaLarga .miolo {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    grid-template-rows: auto 1fr auto;
  }
  .raiz .cascaLarga .foto {
    grid-area: 1 / 1 / 4 / 2;
    aspect-ratio: 4 / 5;
    margin: 12px 0 12px 12px;
    align-self: center;
  }
  .raiz .cascaLarga .topo {
    grid-area: 1 / 1 / 2 / 3;
  }
  .raiz .cascaLarga .identidade {
    grid-area: 2 / 2;
    align-self: center;
    padding: 34px 10px 4px;
  }
  .raiz .cascaLarga .rodape {
    grid-area: 3 / 2;
  }
  .raiz .cascaLarga .nick {
    --nick: clamp(22px, calc((100cqi * 0.5 - 24px) / var(--maior-palavra-em, 4)), 34px);
  }
}

/* ======================================================================= cartela: o cartaz da temporada */
.raiz .enfLinhaCromo {
  color: var(--tm-primaria);
}
.raiz .cartelaCorpo {
  max-width: 640px;
  margin: 0 auto 30px;
  padding: 62px 22px 26px;
  background: radial-gradient(120% 90% at 50% 0%, var(--papel-claro), var(--papel) 60%, var(--papel-sombra));
  box-shadow: inset 0 0 0 2px var(--tinta-cartaz), inset 0 0 0 6px var(--papel), inset 0 0 0 7px var(--tinta-cartaz), 0 30px 60px -24px #000;
  color: var(--tinta-cartaz);
}
/* As estrelas dos cantos (a peça NaCartela): três — o canto de cima à direita é da tarja. */
.enfEstrelasCartaz {
  position: absolute;
  inset: 14px;
  z-index: 0;
  pointer-events: none;
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%238C1A2E'/%3E%3C/svg%3E") 0 0 / 12px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%238C1A2E'/%3E%3C/svg%3E") 0 100% / 12px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M5 0l1.2 3.6H10L7 5.8l1.1 3.7L5 7.3 1.9 9.5 3 5.8 0 3.6h3.8z' fill='%238C1A2E'/%3E%3C/svg%3E") 100% 100% / 12px no-repeat;
}
.raiz .cartelaEscudo {
  position: relative;
  z-index: 1;
  width: 96px;
  height: 96px;
  margin-bottom: 4px;
}
.raiz .cartelaNome {
  position: relative;
  z-index: 1;
  font: 400 clamp(34px, 6vw, 52px) / 1 var(--tm-fonte-titulo), "Arial Black", sans-serif;
  color: var(--carmim); /* 7,3:1 */
  text-transform: uppercase;
}
.raiz .cartelaDestino {
  position: relative;
  z-index: 1;
  margin-top: 10px;
  font: italic 500 clamp(14px, 1.3vw, 16px) / 1.4 var(--tm-fonte-assinatura), Georgia, serif;
  letter-spacing: 0.01em;
  color: var(--tinta-cartaz);
  text-wrap: balance;
}
.raiz .cartelaData {
  position: relative;
  z-index: 1;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--tinta-cartaz);
  color: var(--tinta-cartaz); /* 11,2:1 no pé do papel */
  letter-spacing: 0.2em;
  text-wrap: balance;
}
/* A TARJA colada na diagonal do canto: «SUJEITO A ATRASO». Fica DENTRO do cartaz (o padding de
   cima de 62 px é dela), nunca por cima do texto. Bate e cola quando o cartaz entra na tela. */
@keyframes tarjaCola {
  from {
    transform: rotate(6deg) scale(1.18) translateY(-6px);
  }
  60% {
    transform: rotate(6deg) scale(0.98);
  }
  to {
    transform: rotate(6deg);
  }
}
.raiz .cartelaCarimbo {
  position: absolute;
  z-index: 2;
  top: 14px;
  right: 14px;
  margin: 0;
  padding: 7px 16px 6px;
  background: var(--carmim);
  color: #fff4e0; /* 8,4:1 */
  font: 400 15px / 1 var(--tm-fonte-titulo), "Arial Black", sans-serif;
  letter-spacing: 0.08em;
  transform: rotate(6deg);
  box-shadow: 0 4px 10px -4px rgba(0, 0, 0, 0.7), inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}
@supports (animation-timeline: view()) {
  .raiz .cartelaCarimbo {
    animation: tarjaCola linear;
    animation-timeline: view();
    animation-range: entry 30% cover 45%;
  }
}
.raiz .cartelaFecho {
  margin: 0 0 22px;
  font: italic 500 16px / 1.45 var(--tm-fonte-assinatura), Georgia, serif;
  letter-spacing: 0.01em;
  color: #f0dcc0;
  text-wrap: balance;
}

/* ======================================================================= acessibilidade */
/* O bloco da base (.raiz * { animation: none !important }) já para tudo: fica o pôster FINAL
   (canhão no leão, feixe e olhos acesos, raios parados, ORGANIZAÇÃO alinhado, DES torto). */
@media (forced-colors: active) {
  .raiz .cromo,
  .raiz .palavra > .letra:nth-child(-n + 3) > .cromo {
    background: none;
    -webkit-text-fill-color: CanvasText;
    color: CanvasText;
  }
  .raiz .eco {
    display: none;
  }
}
@media (prefers-contrast: more) {
  .raiz .cromo {
    background: none;
    -webkit-text-fill-color: #f9dc8a;
  }
  .raiz .palavra > .letra:nth-child(-n + 3) > .cromo {
    background: none;
    -webkit-text-fill-color: #ffffff;
  }
  .raiz .eco {
    display: inline-block; /* o contorno escuro ajuda aqui: a base o esconde */
  }
}
```

### 10.4 `components/times/cenarios/picadeiro-ficha.module.css` (novo, completo)
```css
/*
 * A ficha do jogador no cenário "picadeiro": o retrato é o CARTAZ GRANDE da atração (papel
 * marfim, janela em arco, raios de cartaz girando atrás), o nick em folha de ouro, as
 * estatísticas em cartazinhos pendurados e os companheiros («O RESTO DA TRUPE») em cartazes
 * deitados. Mesmas regras: `.raiz` + o seletor da base; conteúdo só transform.
 * Peças com classe dos DOIS módulos do cenário (heroi, kicker, chips): nada aqui repete
 * propriedade que picadeiro.module.css declara nelas com a mesma especificidade.
 */

/* ------------------------------------------------------------------ retrato: o cartaz grande */
/* Pendurado no prego: chega girado 6° e balança até parar. O quadro 0 é o cartaz inteiro. */
@keyframes cartazDesce {
  0%,
  16% {
    transform: rotate(-6deg) translateY(-14px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
  }
  58% {
    transform: rotate(2.4deg);
  }
  78% {
    transform: rotate(-0.8deg);
  }
  100% {
    transform: none;
  }
}
.raiz .retratoCasca {
  width: min(100% - 24px, 470px);
  margin-top: 26px;
  transform-origin: 50% -20px;
  animation: cartazDesce 1400ms linear;
}
.raiz .retratoCapitao {
  margin-top: 70px; /* a cartola em cima */
}
/* A poça do canhão de luz atrás do cartaz (a base anima a opacidade: é enfeite). */
.raiz .enfHaloRetrato {
  inset: -14%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 228, 170, 0.26), rgba(255, 206, 130, 0.08) 60%, transparent);
}
/* Os raios de cartaz antigo atrás do retrato (a peça AtrasDoRetrato): giram em 160 s. */
.enfRaiosRetrato {
  position: absolute;
  left: 50%;
  top: 45%;
  z-index: -1;
  width: 190%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: repeating-conic-gradient(from 0deg, rgba(240, 196, 100, 0.14) 0deg 6deg, transparent 6deg 15deg);
  -webkit-mask: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.5) 45%, transparent 72%);
  mask: radial-gradient(closest-side, #000 20%, rgba(0, 0, 0, 0.5) 45%, transparent 72%);
  animation: raiosDoRetrato 160s linear infinite;
}
@keyframes raiosDoRetrato {
  to {
    rotate: 360deg;
  }
}
@media (max-width: 599px) {
  .enfRaiosRetrato {
    width: 150%;
  }
}
.raiz .coroaDoRetrato {
  width: 96px;
  top: -66px;
  rotate: -10deg;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)); /* estático */
}
@media (max-width: 599px) {
  .raiz .coroaDoRetrato {
    width: 80px;
    top: -56px;
  }
}
/* O papel do cartaz (o capitão: papel preto e fios de ouro). */
.raiz .retrato {
  clip-path: none;
  padding: 7px;
  border-radius: 3px;
  background: radial-gradient(120% 90% at 50% 0%, #f7ecd4, #f2e5c8 60%, #d8c49c);
  box-shadow: inset 0 0 0 1.5px #1b0c08, inset 0 0 0 5px #f2e5c8, inset 0 0 0 6px #1b0c08, 0 30px 60px -24px #000;
}
.raiz .retratoCapitao .retrato {
  background: radial-gradient(120% 90% at 50% 0%, #241612, #120a08 60%, #0a0605);
  box-shadow: inset 0 0 0 1.5px #e0b04a, inset 0 0 0 5px #120a08, inset 0 0 0 6px #e0b04a, 0 30px 60px -24px #000;
}
/* A janela em arco (o mesmo arco das cartas, em grande). */
.raiz .retratoMiolo {
  clip-path: none;
  margin: 16px 10px 10px;
  border-radius: 50% 50% 3px 3px / 22% 22% 3px 3px;
  background: #1c0f0c;
  box-shadow: 0 0 0 2px #e0b04a, 0 0 0 3.5px #1b0c08;
}
.raiz .retratoMiolo > img {
  filter: saturate(0.95) contrast(1.04); /* estático */
}
.raiz .enfGradacao {
  background: linear-gradient(180deg, transparent 62%, rgba(11, 7, 6, 0.55));
}
/* Rota e elo descem para o pé da janela (o arco cortaria os cantos de cima). */
.raiz .topo {
  top: auto;
  bottom: 14px;
  align-items: center;
}
/* «MESTRE DE PICADEIRO» numa fita de ouro no pé do arco, acima da rota e do elo. */
.raiz .placa {
  left: 50%;
  bottom: 60px;
  translate: -50% 0;
  border-radius: 0;
  padding: 6px 16px 5px;
  background: linear-gradient(180deg, var(--tm-metal-luz), var(--tm-metal-placa));
  color: var(--tm-tinta); /* 10,4:1 */
  clip-path: polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%);
  white-space: nowrap;
}

/* ------------------------------------------------------------------ texto */
.raiz .escudoMini {
  width: 30px;
  height: 30px;
}
/* O nick se ORGANIZA: nasce torto, dá o pulinho e assenta (2D: background-clip:text no WebKit). */
@keyframes nickOrganiza {
  0%,
  40% {
    transform: translateY(0.04em) rotate(-3deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  60% {
    transform: translateY(-0.08em) rotate(0.6deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  74% {
    transform: translateY(0.01em) scale(1.02, 0.98);
  }
  100% {
    transform: none;
  }
}
/* Pela largura MEDIDA do nick em até duas linhas (--largura-nick-em; "R A Z E R A L" = 2,547 em,
   em duas linhas). Tetos: 92 px abaixo de 900 e 150 px a partir de 900. */
.raiz .nickVisual {
  display: inline-grid; /* eco e cromo na mesma célula: quebram igual */
  line-height: 1;
  margin-top: 0.22em; /* o til do Ã e o acento sobem a 0,97 em */
  letter-spacing: 0.01em;
  text-wrap: balance;
  overflow-wrap: break-word;
  font-size: clamp(30px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.48))), 92px);
  transform-origin: 20% 90%;
  animation: nickOrganiza 1500ms linear;
}
@media (min-width: 900px) {
  .raiz .nickVisual {
    font-size: clamp(44px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.48))), 150px);
  }
}
.raiz .nickVisual > * {
  grid-area: 1 / 1;
}
.raiz .nomeReal {
  font: italic 500 18px / 1.3 var(--tm-fonte-assinatura), Georgia, serif;
  letter-spacing: 0.01em;
  color: #f0dcc0;
}
.raiz .texto .chips {
  justify-content: flex-start;
}
/* O título da seção NÃO sobe (o .sobe da base o desceria para cima dos cartazinhos). */
.raiz .performance {
  font: 400 clamp(20px, 2vw, 26px) / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.04em;
  color: var(--tm-metal-alto);
  animation-name: none;
}
.raiz .performance::after {
  height: 10px;
  background: radial-gradient(circle at 50% 50%, var(--tm-primaria) 0 2.5px, transparent 3px) 0 50% / 12px 10px repeat-x;
}
/* Estatísticas: cartazinhos pendurados (o item também tem o .sobe da base: esta regra troca o
   keyframe e fica com a duração em cascata dele). */
@keyframes cartazinhoCai {
  0%,
  58% {
    transform: rotate(-5deg) translateY(-6px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
  }
  80% {
    transform: rotate(1.6deg);
  }
  100% {
    transform: none;
  }
}
.raiz .estatisticas {
  gap: 10px 8px;
}
.raiz .estatistica {
  padding: 12px 4px 10px;
  border: 0;
  border-radius: 2px;
  background: radial-gradient(120% 90% at 50% 0%, #f7ecd4, #f2e5c8 60%, #d8c49c);
  box-shadow: inset 0 0 0 1px #1b0c08, inset 0 0 0 3px #f2e5c8, inset 0 0 0 4px #1b0c08, 0 8px 14px -8px #000;
  transform-origin: 50% -6px;
  animation-name: cartazinhoCai;
  animation-timing-function: linear;
}
.raiz .estatistica::before {
  display: none; /* o fio de neon da base */
}
.raiz .valor {
  padding: 0;
  background: none;
  color: #8c1a2e; /* 7,3:1 */
  -webkit-text-fill-color: #8c1a2e;
  font: 400 clamp(22px, 2.3vw, 30px) / 1 var(--tm-fonte-titulo), sans-serif;
}
.raiz .rotulo {
  color: #1b0c08;
  font-weight: 700;
}
.raiz .nota {
  color: #cdb99a; /* 10,5:1 */
}

/* ------------------------------------------------------------------ companheiros: a trupe */
.raiz .companheiroLink {
  align-items: center;
  border: 0;
  border-radius: 2px;
  background: radial-gradient(120% 90% at 50% 0%, #f7ecd4, #f2e5c8 60%, #d8c49c);
  box-shadow: inset 0 0 0 1px #1b0c08, inset 0 0 0 3px #f2e5c8, inset 0 0 0 4px #1b0c08, 0 10px 18px -10px #000;
  color: #1b0c08;
}
.raiz .companheiroLink:hover {
  border-color: transparent;
}
.raiz .companheiroFoto {
  flex: 0 0 52px;
  height: 64px;
  margin: 8px 0 8px 10px;
  overflow: hidden;
  border-radius: 50% 50% 2px 2px / 30% 30% 2px 2px;
  background: #1c0f0c;
  box-shadow: 0 0 0 1.5px #e0b04a, 0 0 0 2.5px #1b0c08;
}
.raiz .companheiroRota {
  --tm-icone: #8c1a2e;
  color: #8c1a2e;
}
.raiz .companheiroNick {
  color: #1b0c08;
  font-size: 16px;
  letter-spacing: 0.01em;
  overflow-wrap: break-word;
}
@media (max-width: 599px) {
  .raiz .companheiroFoto {
    flex-basis: 44px;
    height: 54px;
    margin: 8px 0 8px 8px;
  }
  .raiz .companheiroTexto {
    padding: 10px 8px;
  }
  .raiz .companheiroNick {
    font-size: 14px;
  }
}
```

---

## 11. Testes

- **`tests/times/temas-sem-opacidade.test.ts`**: acrescentar à lista de entradas do conteúdo `"saltoDoLeao", "organiza", "palhacos", "cartazBalanca", "cartazBalancaRelogio", "tarjaCola", "cartazDesce", "nickOrganiza", "cartazinhoCai"`.
  - `tremelique` **não** entra na lista: anima `rotate`, e não `transform`.
  - A leitura recursiva já pega os dois módulos novos (rodei a mesma lógica: verde).
- **`tests/times/link-da-carta.test.ts`** e **`css-do-build.test.ts`**: nada a mudar. Rodei a mesma lógica nos módulos novos: 7 regras no caminho do link conferidas; `translate` 6 = 6, `rotate` 7 = 7, `scale` 2 = 2 (página) e 2/2/0 (ficha).
- **Novo `tests/times/tema-desorganizacao.test.tsx`** (em `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\desorganizacao\referencia\tests\times\`; **não executado**). O que confere:
  - **registro**: o tema é achado pelo slug; `chama` sozinho dá `null`; `corDoTime` dá `#FFB3C7` e, sem o slug, `#ef7d34`;
  - **nome**: `partesDoNome` devolve a marca inteira, sem assinatura;
  - **textos**: «MESTRE DE PICADEIRO» / «RINGMASTER»; a tarja «SUJEITO A ATRASO» nos dois idiomas;
  - **métrica**: `maiorPalavraEm` = 5,928 (também com o acento decomposto); ㅤ = 1,23; `larguraDoNickEm` dá R A Z E R A L 2,546, Onigami 3,034, GayLord 3,165, THALAO 2,724 e nak4y 2,42;
  - **página**:
    - `h1` lido uma vez, com 14 `.letra` e `--largura-em:5.928`;
    - ordem Onigami, R A Z E R A L, GayLord, THALAO, nak4y, com `--maior-palavra-em:3.165`;
    - os sete textos presentes; «CAPITÃO» para o leitor e nunca «MESTRE DE PICADEIRO»; tarja com `lang="pt-BR"`;
    - `data-cenario="picadeiro"`, sem `data-fotos`; `enfCortina`, `enfPedestal`, `enfCanhao` e `enfEstrelasCartaz` presentes; nenhum enfeite de outro cenário;
    - mais de 20 enfeites, todos aria-hidden e sem texto;
  - **RX, QM e GdB** sem cortina, pedestal, canhão nem sanefa;
  - **ficha**: `h1` lido uma vez, com `--largura-nick-em:2.42`; os 4 companheiros e «O RESTO DA TRUPE»; `enfRaiosRetrato` presente; enfeites limpos;
  - **CSS**: o DES declara o torto como `transform` de repouso e `animation-name: palhacos, tremelique`; `tremelique` só declara `rotate`; `organiza` termina em `transform: none`.
- **`tema-equipe-rx`, `tema-queijo-minas` e `tema-galacticos-do-bar` sem nenhuma alteração**, e verdes. Pela regra da casa, rodar o teste de regressão com a correção revertida.
- Rodar `npx vitest run tests/times`, `npx tsc --noEmit`, `npm run lint` e `npm run build` (toda rota tem de sair `ƒ`). Comparar o HTML de RX, QM e GdB antes e depois (idêntico: o que muda é registro, fontes e cenário novos).

## 12. Lista de verificação e vídeo

**Em cada largura (navegador de verdade, estouro medido por JS):** 1920, 1440×810, 1366×768, 1024, 768, 600, 430, 405×720, 390, 360 e 320. Conferir:
- `scrollWidth == innerWidth`;
- a tinta do título dentro da coluna;
- til e cedilha inteiros;
- o pé do D pousado no tampo do pedestal;
- a faixa com as pontas dentro da coluna;
- a bandeirola do capitão em bloco abaixo de 420;
- os cartazes com o arco inteiro, o nick só quebrando entre palavras e o capitão deitado no celular;
- a tarja dentro do cartaz;
- a ficha com nick ≤ 2 linhas e a cartola sem encostar no «VOLTAR».

**Em qualquer largura:**
- **Quadro 0**: `document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; })` e print, na página e na ficha;
- **movimento reduzido**, `forced-colors` e `prefers-contrast: more`;
- **aba em segundo plano**: abrir, trocar de aba e voltar (nada preso);
- **Safari**: `display: contents` no bloco de texto, `background-clip: text` com `rotate`, `sin()` (16.4+);
- **Firefox sem `view()`**: cartazes pelo relógio e tarja parada;
- **RX, QM e GdB**: prints antes e depois em 360, 390, 1024 e 1440.

**Vídeo** (gravar de produção, depois do deploy):
- `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador <saida>.mp4 desorganizacao nak4y`, e o mesmo com `celular`;
- o script usa 1440×810 e 405×720, medidos acima.

**Roteiro:**
- **0–0,9 s**: a lona gira e assenta; o canhão procura da esquerda; as letras bagunçadas tremem (rufar); o leão agacha e salta.
- **0,9 s — TÁ-DÁ**: pousa no pedestal dentro da luz, os olhos acendem, os raios abrem, o pedestal amassa e a primeira fila pula.
- **1,0–1,6 s**: ORGANIZAÇÃO se alinha letra por letra.
- **1,6–2,3 s**: o DES tenta se endireitar… e cai torto de novo (a piada).
- **2,3–5 s**: a faixa «Respeitável público… (com 40 minutos de atraso)», os trapézios balançando e os raios girando.
- **5–10 s**: rolagem lenta até a cortina; os cartazes entram balançando no prego, até o cartaz preto do mestre de picadeiro de cartola (o nak4y de venda no banheiro) e o aviso «nem no banheiro».
- **10–13 s**: o cartaz da temporada, a tarja «SUJEITO A ATRASO» batendo e «Reclamações: falar com a organização. (Somos nós.)».
- **Fecho com 4 s da ficha do nak4y**: o cartaz grande descendo no prego, a cartola, NAK4Y se organizando e os cartazinhos caindo.

---

## Ajustes obrigatórios do juiz

> Vencem o spec onde os dois discordarem (28/10/2026). O parecer geral está em `..\juiz.md`.
> Veredito: **aprovado com ajustes** — o circo da organização é a melhor piada interna dos cinco e o
> «DES» torto é um gesto de título que ninguém tem. Ajustes: a cor do time, a dobra do vídeo no
> computador, o tremelique na hora certa do vídeo, 2D no conteúdo e um nome de keyframe. O teste do
> designer NUNCA rodou: rode.

### J1. Dados finais
- **`cor: "#FFE14D"`** — o OURO do leão coroado (sai o rosa `#FFB3C7`, que ficava a ΔE 5,2 do rosa dos
  Fãs de Rosca `#FFA3C8`). Vizinho mais perto: Os 5 Sem Ping `#3DFF8F` a 31,4; 15,1:1 no fundo do site.
  O medo do designer com o ouro (a ÁUREA `#e0b13c`) não vale mais: a ÁUREA era a cor de rascunho dos
  Os 5 Sem Ping, que agora saem com o verde do tema deles (todo time tem tema e `corDoTime` usa o do
  tema). Troque em `tema.cor`, reescreva o comentário dele (o «rosa do ALGODÃO-DOCE… ÁUREA» não vale
  mais) e no teste: `corDoTime(...)` dá `#FFE14D` com slug e `#ef7d34` (CHAMA) sem; as fixtures
  `teamColor`/`color` também vão para `#FFE14D`.
- **O algodão-doce rosa da plateia FICA** (`#FFB3C7` no data-URI da `enfPublico`): é tom de cena,
  um ponto de cor na silhueta — só deixa de ser «a cor do time» (corrija a legenda da tabela 3.2 no
  comentário do CSS, se houver).
- Fontes: título `smokum` = `Smokum`, `weight: "400"`, `subsets: ["latin"]`,
  `adjustFontFallback: false`, `fallback: ["Smokum Reserva Estreita", "Smokum Reserva"]` (Impact 60% e
  Arial 48%, os dois `@font-face` no topo de `picadeiro.module.css`); assinatura `playfair-italico` =
  `Playfair_Display`, `style: ["italic"]`, `weight: ["500", "700"]`, `subsets: ["latin"]`. Sem mudança.
- Sem prefixo e sem sufixo, `letraPorLetra: true`, `cenario: "picadeiro"`, fotos como na 3.8.
- Cabeçalho do site: fundo `rgba(11, 7, 6, 0.95)` → `rgba(11, 7, 6, 0.84)` (o `breu` da lona), fio
  `rgba(224, 176, 74, 0.30)` (o ouro dos frisos; a sanefa com debrum de ouro vem logo abaixo).

### J2. A base comum JÁ FEZ a parte compartilhada da 3.9
Não edite `tipos.ts`, `registro.ts`, `fontes-dos-temas.ts`, `cenarios/index.ts`, o stub nem
`globals.css`. Leve só: a tabela `SMOKUM` (`padrao: 1`, `espacamento: 0.01`, `sobra: 0.22`) para o
SEU bloco de `lib/temas/metricas.ts` (a fonte não mudou; 5,928 / 3,165 / 2,546 continuam); a lista
de keyframes da seção 11 para o SEU bloco de `temas-sem-opacidade.test.ts`; os 9 textos para
`lib/i18n/messages/temas/desorganizacao.ts` (não `paginas-home.ts`). O teste novo do designer
(`referencia\tests\times\tema-desorganizacao.test.tsx`) nunca foi executado: rode e conserte o que
falhar ANTES de mexer no CSS.

### J3. Keyframe com nome único
`balanca` (os trapézios) → **`trapezioBalanca`** (genérico demais para 8 cenários). O
`grep … | uniq -d` do `juiz.md` §2 tem de sair vazio.

### J4. Conteúdo em 2D
`saltoDoLeao` usa `translate3d`: troque por `translate(0, 3%)`, `translate(0, -9%)` etc. (mesmas
curvas). É conteúdo, e dentro do escudo há os olhos em `mix-blend-mode: screen` — 3D no ancestral
de blend/`background-clip` é a lição do WebKit da Queijo Minas. 3D só em enfeite.

### J5. A dobra do vídeo no computador (1440×810)
Na 4.3 as bandeirolas começam em y 808 numa tela de 810: no 1º quadro do vídeo aparece um fio de
2 px delas, cortado pela borda. Para telas baixas, o cartaz encolhe um pouco e o herói cabe inteiro:

```css
/* depois dos @media (min-width: 1024px) que já declaram os dois (mesma especificidade, vence a ordem) */
@media (min-width: 1024px) and (max-height: 860px) {
  .raiz .heroiGrade {
    --escudo: clamp(200px, 27svh, 300px);
  }
  .raiz .tituloVisual {
    --tm-titulo-max: min(168px, 13svh);
  }
}
```

Meça em 1440×810: as bandeirolas INTEIRAS acima de 804 px (a conta dá ~760–804). Em 1440×900,
1920×1080 e 2560×1440 nada muda (a consulta não pega). Em 1366×768 o herói continua mais alto que
a tela — tudo bem, desde que a faixa do lema fique inteira na 1ª dobra.

### J6. O tremelique do DES na hora do vídeo
Hoje o 1º tremelique cai aos 9,9 s (90% de 11 s): no vídeo a câmera já desceu para o elenco e a
piada se perde. Mude só os tempos do keyframe (o mesmo `rotate`, mesma amplitude), para o 1º pulso
cair aos ~4,2 s, com o herói ainda na tela, e repetir a cada 11 s:
`0%, 38% { rotate: 0deg } 40% { rotate: 3deg } 42.5% { rotate: -2.5deg } 45% { rotate: 1deg } 47%, 100% { rotate: 0deg }`.
(O `palhacos` termina aos ~2,8 s: os dois nunca se cruzam.) Atualize o roteiro: «2,3–5 s … e o DES
tremelica de novo».

### J7. O que fica como está (conferido)
- Laços: trapézios (2, ≥ 1024; 1 de 600 a 1023), raios (160 s), o tremelique (3 letras) e o halo da
  base: 7 no computador, 5 no celular; ficha com os raios do retrato e a varredura da base. Só
  transform/opacidade. Nenhum flash.
- Movimento reduzido: o `.raiz *` da base para a página E a ficha (a raiz da ficha leva o `.raiz` do
  `tema.module.css`); o pôster final do spec (DES torto, canhão no leão, olhos a 0,85) é o estado das
  regras, sem animação.
- `sin()` com fallback reto, `[id="tm-nick"]` sem hash, `display: contents` em `div`: ok.
- Refaça a 4.3 no repo com os dados de produção (o protótipo tinha o cabeçalho simulado) e confira
  o pé do D pousado no tampo do pedestal em 320, 390, 1024 e 1440.
