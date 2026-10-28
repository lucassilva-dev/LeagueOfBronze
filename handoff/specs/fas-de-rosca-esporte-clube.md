# FÃS DE ROSCA ESPORTE CLUBE: projeto final, «Dia de Braço» (cenário `academia`)

> **A academia do time às 6h da manhã, onde as anilhas são roscas.** O escudo faz a rosca direta. FÃS DE e ROSCA são massa de rosquinha com glacê de morango e granulado; no computador ficam dos dois lados do escudo, como no próprio escudo. O elenco são crachás de sócio pendurados no gancho, a cartela é o saco de pão do pós-treino e a ficha é a selfie no espelho da academia.

Não editei nada em `C:\LeagueOfBronze-precos`. Antes de desenhar, li o sistema inteiro:
- `lib/temas/*` e `components/times/*` (os três cenários, a base `tema.module.css`/`ficha.module.css` e os componentes de página e ficha);
- `tests/times/*` e `tests/stubs/next-font-google.ts`;
- `lib/i18n/messages/paginas-home.ts`, `lib/design.ts` e `lib/draft/times.ts`;
- `app/globals.css` (o preflight do Tailwind e as fontes Anton e Chakra Petch do site) e `proxy.ts` (a CSP `font-src 'self'`).

Também olhei o escudo (o recortado e o original sobre concreto) e as 5 fotos, conferi os dados do time em produção e fotografei os três temas que já estão no ar.

**Já está implementado e verificado**, numa cópia do repo com os arquivos novos por cima (`harness\`). Os arquivos dos apêndices são os que rodaram, byte a byte.

| verificação | resultado |
|---|---|
| `vitest run`, suíte inteira | 249 arquivos e 2718 testes: 2714 ok, 4 pulados, **0 falhas**. A mesma cópia sem o tema dá 2676 testes, 0 falhas: nenhuma falha nova. |
| `vitest run tests/times` | 7 arquivos, 160 testes. Inclui o novo `tema-fas-de-rosca.test.tsx` e os 3 testes de CSS da casa, que agora leem os módulos novos. |
| `tsc --noEmit` | 0 erros |
| `eslint components/times lib/temas tests/times tests/stubs lib/i18n/messages/paginas-home.ts` | limpo |
| lightningcss com CSS Modules `pure` (alvos Chrome 111, Safari 16.4, Firefox 111) | compila sem aviso; nenhum `translate`, `rotate` ou `scale` descartado |
| render REAL (Vite servindo os componentes do repo com o tema, dados de teste) | 12 larguras da página, de 320 a 2560, e as 5 fichas em 6 larguras: `scrollWidth == innerWidth` em todas |
| quadro 0 (todas as animações pausadas em 0) e movimento reduzido | pôster legível; com movimento reduzido, 0 animações rodando |

**Onde está cada coisa** (tudo dentro de `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\fas-de-rosca-esporte-clube\`):
- `codigo\`: os 6 arquivos novos, nos mesmos caminhos do repo, prontos para copiar (também estão nos apêndices B a G).
- `alteracoes.diff`: o diff dos 9 arquivos existentes que mudam (também no apêndice A).
- `prints-reais\`: prints do render real.
  - quadro final, quadro 0 e movimento reduzido;
  - página inteira em pt e em en;
  - folhas de quadros da entrada (`quadros-pagina-1440x810.jpg`, `quadros-pagina-405x720.jpg`, `quadros-vidotti-agiota-1440x900.jpg`);
  - fichas.
- `previa.jpg`: herói no computador e no celular, crachás e ficha numa imagem só.
- `prototipo\`: o protótipo estático em que o desenho foi feito (a base real copiada, mais o CSS do cenário).
- `ferramentas\`:
  - `metricas.cjs` mede a fonte;
  - `cor.cjs` calcula ΔE2000 e contraste;
  - `validar-css.cjs` roda as regras dos testes de CSS nos módulos novos;
  - `validar-tsx.cjs` monta cada peça do cenário e confere enfeites e ids;
  - `real.cjs`, `quadros-reais.cjs` e `medir-real.cjs` tiram prints e medidas do render real;
  - `aplicar_no_harness.py` é a lista exata de mudanças.
- `harness\`: a cópia do repo com o tema.
  - Tirei a junção do `node_modules`, para ninguém apagar o `node_modules` do repo sem querer.
  - Para rodar de novo, recrie a junção: `cmd /c mklink /J harness\node_modules C:\LeagueOfBronze-precos\node_modules`.
  - Depois rode `node node_modules\vitest\vitest.mjs run` ou `node node_modules\typescript\bin\tsc --noEmit`. O vitest dele guarda o cache em `harness\.cache-vitest`.
  - O render real sobe com `node render\servidor.mjs` (porta 4561; `?j=<slug>` abre a ficha e `?en=1` abre em inglês).
  - **Nunca** use `rm -rf` na pasta com a junção recriada: tire a junção primeiro com `cmd /c rmdir harness\node_modules`.

**Avisos:**
- **O recado do Lucas** («não precisa separar do Lula, deixa os dois juntos e de zoeira») é sobre a foto do **bobbie-goods**, de outro time. Nenhuma foto dos Fãs de Rosca foi recortada nem trocada: as 5 entram como estão em `public/players/*-4a.webp`.
- **Dados (painel): nada a mudar.** Conferi em produção em 27/10:
  - o time já se chama `FÃS DE ROSCA ESPORTE CLUBE`, com slug `fas-de-rosca-esporte-clube` e id `seiva`;
  - escudo e fotos já estão no ar (commit `1266ffa`);
  - as rotas são Tapa de Doido TOP, vidotti agiota SEL (capitão), D1elzera MID, OmegaFuria ADC e SaborEnergetico SUP; o total de elenco é 29 pts;
  - o nome real é igual ao nick nos 5: a ficha não mostra nome real, e no crachá o rodapé repete o nick como assinatura (é de propósito).
- **Transparência:** as primeiras rodadas do vitest no harness regravaram o cache de tempos `node_modules\.vite\vitest\…\results.json`. É o mesmo arquivo que qualquer `npx vitest` regrava, e outros agentes também estavam mexendo nele. Depois disso, o cache passou a ficar dentro do harness. Nenhum arquivo versionado do repo foi tocado.

---

## 1. O conceito

**«Dia de Braço»:** a academia do time às 6h, onde as anilhas são roscas.

**Por quê:**
- **O escudo é exatamente isso.** Um braço suado faz ROSCA DIRETA numa barra cujas anilhas são ROSCAS com granulado: o trocadilho do nome em uma imagem. Há ainda o halter do «FUNDADO 2026», a faixa ESPORTE CLUBE e os ramos de trigo, que são a farinha da rosca. O original está sobre concreto, como parede de academia.
- **O escudo empilha «FÃS DE / (o braço) / ROSCA».** A página de computador repete esse arranjo em tamanho de parede: «FÃS DE (escudo) ROSCA».
- **As fotos são de academia.**
  - D1elzera faz a pose de duplo bíceps no vestiário, com os armários vermelhos e azuis atrás.
  - SaborEnergetico tirou a clássica selfie no espelho da academia, de onde vem a ficha.
  - Tapa de Doido, vidotti e OmegaFuria estão de óculos escuros e chapéu, num dia de sol: daí a luz das 6h entrando pelo basculante.
- **As piadas:**
  - «Ninguém pula dia de braço» e «tá pago» são os memes de academia mais conhecidos do Brasil;
  - o capitão é «vidotti **agiota**», então vira o PERSONAL que cobra juros da mensalidade;
  - os ramos de trigo viram o «Contém glúten» do rótulo de padaria.
  - O duplo sentido do nome fica na cabeça do grupo: a página brinca com rosca de academia e rosca de padaria e não precisa dizer mais nada.

## 2. Os três conceitos considerados

**A. «Dia de Braço», a academia do time às 6h: escolhido (9/10).**
- **Gestos novos no site:**
  - o escudo faz a rosca (sobe em arco, segura tremendo e dá um pump);
  - o nome em massa de rosquinha com glacê e granulado;
  - «FÃS DE (escudo) ROSCA» numa linha só;
  - a fita métrica que corre pelo teto;
  - os crachás balançando no gancho;
  - o saco de pão com o adesivo TÁ PAGO;
  - a selfie no espelho com as mãos de magnésio na parede;
  - as estatísticas na pilha de placas de aparelho.
- **Rende no vídeo:** em 2,4 s acontecem a fita, o magnésio, a rosca com tremor e pump, as letras inflando uma a uma e as anilhas entrando na barrinha. Cada uma dessas batidas se lê sozinha.
- **Custo médio:**
  - só CSS 2D e SVG chapado;
  - nenhuma partícula além de 10 grãos de poeira;
  - nenhum 3D;
  - nenhuma pintura animada no título (o glacê é parado).

**B. «Projeto Verão», a academia da orla ao nascer do sol (7/10).**
- **Fortes:**
  - seria o único tema de dia;
  - casa com os óculos escuros e chapéus de 3 fotos;
  - «pegar um bronze» em League of BRONZE;
  - o campeonato termina em dezembro, que é o projeto verão.
- **Fracos:**
  - o escudo é academia e padaria, não praia: nada nele explica a orla;
  - o gesto central, o sol nascendo atrás do escudo, é a lua da Queijo Minas com outra cor;
  - céu e mar puxam para o azul e o ciano da RX e da QM.
- **O que entrou:** a luz do amanhecer entra pelo basculante, com raios de sol e poeira.

**C. «Whey Sabor Rosca», a página como rótulo de suplemento (6/10).**
- **Fortes:**
  - engraçadíssimo: a ficha vira «Informação nutricional»;
  - os nicks parecem sabores («Sabor Energético», «Ômega Fúria»);
  - o «CONTÉM GLÚTEN» do rótulo.
- **Fracos:**
  - a forma é propaganda e embalagem, justamente o «corporativo» que o briefing recusa;
  - pede muito texto que a estrutura não tem onde pôr;
  - o pote girando é clichê de comercial e fica perto de marcas reais.
- **O que entrou:** «Contém glúten» virou o fecho, e a balança de sabores ficou na pilha de placas.

**Ideia recusada antes das três: a padaria pura.** Comércio por dentro, à noite, com comanda e um líquido enchendo as letras: é o boteco dos Galácticos com farinha.

**Por que A não é nenhum tema anterior**, e por que foge dos quatro que estão sendo desenhados agora:

| | RX | QM | GdB | **Fãs de Rosca** |
|---|---|---|---|---|
| Lugar | tempestade ao ar livre | serra à noite | dentro do bar, à noite | **academia às 6h, com a luz do sol entrando** |
| Luz | raio frio | lua e farol ciano | lâmpada âmbar e neon azul | **raios de sol diagonais com poeira de magnésio** |
| Material do título | cromo | ouro com bisel | chope que enche | **massa de rosquinha com glacê de morango e granulado (parado)** |
| Composição do herói | texto à esquerda, escudo à direita | escudo à esquerda, texto à direita | tríptico na parede e o nome embaixo | **«FÃS DE (escudo) ROSCA» numa linha, como no escudo** |
| Fontes | Exo 2 itálico e Permanent Marker | Bungee e Special Elite | Knewave e Kalam | **Sofia Sans Extra Condensed 900 itálico e Kaushan Script** |
| Entrada do escudo | cai e o chão treme | chega e freia | brinde | **rosca direta: sobe em arco, treme segurando e dá um pump** |
| Chão | espelho com grade | trilhos | balcão de madeira | **piso de borracha com granulado** |
| Câmera | zoom | grua | travelling pela porta | **o celular endireitando (giro de −1,4°)** |
| Elenco | créditos | trem | bolachas na lousa | **crachás de sócio no gancho, balançando** |
| Capitão | coroa | roda alada | caneco coroado | **PERSONAL: halter de ouro com anilhas de rosca** |
| Cartela | «em cartaz» | bilhete carimbado | TV do bar | **saco de pão do pós-treino com adesivo redondo** |
| Moldura | barras de cinema | faixas de latão | varal e listra da camisa | **fita métrica no teto e faixa de segurança rosa** |
| Cor do time | `#4DA3FF` | `#3EE6F2` | `#B4C2FF` | **`#FFA3C8` (rosa glacê)** |

Os quatro que estão sendo desenhados agora:
- **Os 5 Furiosos:** arena de e-sports, telão e skins. Não uso tela, LED nem palco.
- **So ADC Bronze Clube:** brasão de bronze. Não uso metal nobre nem heráldica.
- **Os 5 Sem Ping:** internet e Poro. Nada de glitch nem azul.
- **Desorganização:** leão e realeza preta e dourada. Nada de preto com ouro. O amarelo do escudo só aparece na fita métrica e no halter, e a cor do time é rosa.

## 3. O tema (dados)

### 3.1 Fontes (conferidas no `font-data.json` do Next instalado)

| papel | família | o que o font-data diz | o que o tema pede | por quê |
|---|---|---|---|---|
| título (`--tm-fonte-titulo`) | **Sofia Sans Extra Condensed** | pesos 1 a 1000 e `variable`; estilos `normal` e `italic`; subsets latin, latin-ext, cyrillic, greek | `weight: "900"`, `style: "italic"`, `subsets: ["latin"]` | É a condensada preta itálica do panfleto de academia, com o inclinado do ROSCA do escudo. É estreita, e isso importa: SABORENERGETICO tem 15 letras numa palavra só e define o tamanho dos 5 nicks dos crachás. |
| assinatura (`--tm-fonte-assinatura`) | **Kaushan Script** | peso `400` só; `normal`; subsets latin e latin-ext | `weight: "400"`, `subsets: ["latin"]` | O pincel do panfleto de academia («venha treinar!»). Usada só de 15 px para cima: «esporte clube», lema, aviso, assinatura do crachá, destino e fecho. |

- **Nenhuma das proibidas** (Exo 2, Permanent Marker, Bungee, Special Elite, Knewave, Kalam), e **nenhuma é do site** (Anton e Chakra Petch).
- **Acentos:** Ã, Ç, É e Õ estão no subset `latin`; conferido no render (FÃS, «Ninguém… braço», «Contém glúten»).
- **Chaves novas** em `ChaveDeFonte`: `"sofia-extra-condensada"` e `"kaushan"`.
- No `fontes-dos-temas.ts` (apêndice A), a Sofia vem com `adjustFontFallback: false` e `fallback: ["Rosca Reserva Impact", "Rosca Reserva"]`.
- **Pesos:** o `.raiz` do cenário declara `--tm-titulo-estilo: italic`, `--tm-titulo-peso: 900`, `--tm-titulo-peso-medio: 900` e `font-synthesis: none`.

**Medidas da Sofia XC 900 itálico** (Chromium, canvas `measureText` a 100 px, woff2 do Google Fonts, `fontKerning = "none"`):
- **Altura:** maiúsculas 0,66 em; Ã a 0,83 em e Ä a 0,86 em da linha de base; Ç e Q descem 0,19 em.
- **Caixa da fonte:** sobe 0,90 em e desce 0,30 em.
- **Larguras:** I e J têm só 0,21 em; W 0,632; M 0,57; o resto das maiúsculas fica entre 0,38 e 0,47.
- **Tinta além do avanço:**
  - à direita, até 0,083 em nas maiúsculas sem acento (Y) e até 0,15 em no Ï;
  - à esquerda, até 0,07 em (J).
- **Palavras:** ROSCA tem 2,219 em de avanço; «FÃS DE», 2,204 em (com o espaço de 0,123). As duas metades do nome medem o mesmo, e é isso que deixa o escudo cair exatamente no vão (seção 6).
- **Kaushan:** «Esporte Clube» tem 5,50 em; a caixa sobe 1,08 em e desce 0,37 em.

### 3.2 A métrica (`lib/temas/metricas.ts`)

A tabela `SOFIA_EXTRA_CONDENSADA` está no apêndice A: 84 caracteres (as 26 maiúsculas, 24 acentuadas, 10 algarismos e 24 sinais e letras raras, como Æ, Œ, Þ e Ø), `padrao: 1`, `espacamento: 0.02` e `sobra: 0.36`.
- **De onde vem a sobra de 0,36:** 0,15 de tinta à direita (Ï), mais 0,07 à esquerda (J), mais o contorno do eco de 0,1 em, mais 0,04 de folga.
- **O padrão de 1,0:** o caractere mais largo medido é o «ㅤ» dos nicks de LoL, que sai de outra fonte com 1,0 em.

Valores que viram teste:

| texto | função | valor |
|---|---|---|
| `FÃS DE ROSCA` (marca) | `maiorPalavraEm` | **2,679** (ROSCA; FÃS 1,655, DE 1,246) |
| `FÃS DE` | `larguraEm` | 2,684 |
| `ㅤ` | `larguraEm` | 1,38 |
| Tapa de Doido | `larguraDoNickEm` | **3,185** (TAPA DE / DOIDO; numa linha seria 5,48) |
| vidotti agiota | `larguraDoNickEm` | **3,087** (VIDOTTI / AGIOTA) |
| D1elzera · OmegaFuria · SaborEnergetico | `larguraDoNickEm` | 3,775 · 4,847 · **6,92** (uma palavra: nunca parte) |
| elenco | `--maior-palavra-em` | **6,92** (SABORENERGETICO) |

O título e os nicks usam `font-kerning: none`, então a soma das letras é a palavra (como na Knewave).

### 3.3 A reserva mais estreita (enquanto a Sofia chega)

O `@font-face` mora no topo de `academia.module.css`. São duas famílias, porque uma só não serve a todo aparelho:
- **`"Rosca Reserva Impact"`:** `local("Impact")` com `size-adjust: 63%` (Windows e Mac).
  - A Impact a 63% fica mais estreita que a Sofia em toda maiúscula, acento, algarismo e pontuação da tabela; o J é o pior (63,7%). Só o ® passaria (47,5%), e ele não aparece em nome nem nick.
  - ROSCA na reserva dá 1,68 em, contra 2,219 da Sofia.
- **`"Rosca Reserva"`:** `local()` de Arial, ArialMT, Helvetica, Helvetica Neue, Arimo, Liberation Sans e Roboto, com `size-adjust: 40%`.
  - A Arial a 40% fica mais estreita em todos os 84 caracteres da tabela (o pior é o J, a 42,2%); a margem é para Helvetica e Roboto.
- **O preço:** enquanto a fonte não chega, o título sai pequeno, a meio corpo. Nunca sai cortado, porque o `font-size` é calculado pela largura da Sofia. Com `display: swap`, ela troca assim que carrega.

### 3.4 Cores (`cores` → `--tm-*`; contraste WCAG calculado)

| token | hex | papel neste tema | contraste |
|---|---|---|---|
| `breu` | `#120E11` | parede na sombra, fundo da página | (fundo) |
| `ceu` | `#1E181C` | parede alta, sob os basculantes | (fundo) |
| `abismo` | `#2A1420` | chocolate-ameixa: chip do personal, fundo das fotos | texto 15,9 |
| `royal` | `#8E2E5E` | framboesa: hover do VOLTAR e do OP.GG | texto sobre ele 7,2 |
| `primaria` | `#FF8EC3` | glacê de morango: faixa de glacê dos crachás, adesivo, bordas (nunca texto pequeno) | tinta sobre ele 8,2 |
| `neon` | `#FF5EA8` | rosa vivo: contorno do OP.GG, ponteiro do relógio | 6,8 no breu |
| `arco` | `#FFD23F` | **anel de foco**, amarelo da fita métrica | 13,3 no breu · 12,1 no céu |
| `nucleo` | `#FFF6FA` | miolo dos brilhos | (enfeite) |
| `texto` | `#FFF4EC` | açúcar: texto principal | 17,7 breu · 16,1 céu · 15,9 abismo |
| `prata` | `#EADBE3` | lema, nome real | 14,4 breu · 13,3 no piso |
| `apoio` | `#BCA9B5` | kicker, créditos, aviso, rótulos | 8,7 breu · 5,4 na parede com raio de sol (pior) |
| `acento` | `#FF9FCB` | «APRESENTA», destaques | 10,1 breu · 6,3 com raio |
| `tinta` | `#2B1408` | chocolate: texto em crachá, placa, saco | 17,4 no crachá · 11,8 na placa · 9,2 no adesivo · 6,9 no kraft |
| `icone` | `#FFB8D9` | ícone de rota no escuro | 12,0 breu · 10,8 abismo |

**Cores do cenário** (variáveis no `.raiz` de `academia.module.css`):

| variável | hex | onde |
|---|---|---|
| `--giz` | `#F4EFEA` | magnésio, arcos da rosca, relógio, poeira |
| `--fita` / `--fita-tinta` | `#FFD23F` / `#1C1206` | fita métrica (régua da moldura e sublinhados) |
| `--borracha` | `#141113` | piso de borracha |
| `--massa-luz` / `--massa-borda` | `#FFD9A0` / `#C27A36` | a massa da rosca no título (a borda é a linha de base) |
| `--kraft` / `--kraft-tinta` | `#C99A62` / `#3B2412` | saco de pão e a data impressa nele (5,7) |
| `--cartao` | `#FFFFFF` | o plástico do crachá |
| `--caneta` | `#A8326A` | «FICHA →» e a rota dos parceiros (6,3 no branco) |

O granulado tem cinco cores: branco, `#7FD3FF`, `#FFE45C`, `#8BE08A` e `#FFB067`.

### 3.5 Metal: a rosquinha (mesma estrutura de `MetalDoTema`)

| luz | alto | meio | sombra | fundo | volta | base | placa |
|---|---|---|---|---|---|---|---|
| `#FFF0F7` | `#FFB3D6` | `#F577B1` | `#A3366C` | `#E6A04F` | `#FFD79A` | `#B2692E` | `#FFC4DF` |

- **A sequência:** luz, alto, meio e sombra são o glacê de morango; fundo, volta e base são a massa frita; placa é o rosa claro do chip de pontos.
- **Onde a base usa:** placas, chip de pontos, retrato, rodapé do crachá do capitão e a tinta garantida do título (o sólido `meio` antes do `background-clip`).

### 3.6 Cor do time: **`#FFA3C8`**, o rosa do glacê

- **Contraste:** 10,5:1 sobre o `#100d07` do site.
- **ΔE2000 para as outras sete de hoje:**

  | | RX | QM | GdB | CHAMA | ÁUREA | VERDANTE | ARCANA |
  |---|---|---|---|---|---|---|---|
  | cor | `#4DA3FF` | `#3EE6F2` | `#B4C2FF` | `#ef7d34` | `#e0b13c` | `#3fb27f` | `#9a6ae0` |
  | ΔE | 39,4 | 61,6 | 26,3 | 34,0 | 46,6 | 63,1 | 27,8 |

- **Folga contra o que os outros quatro podem escolher:**
  - ouro de leão: 46 a 49;
  - bronze: 35 a 38;
  - vermelho furioso: 22;
  - magenta neon: 18;
  - roxo de arena: 28.
- **Por que não o amarelo do escudo:**
  - `#FFD21F` fica a ΔE 9,5 da ÁUREA e a 4,6 de um dourado de leão;
  - `#FFE94D` fica a 14,8 e 8,9.
  - O amarelo mora na fita métrica, no halter e no foco. O rosa é a zoeira: glacê de morango numa academia de marombeiro.

### 3.7 O nome

| campo | valor | efeito |
|---|---|---|
| `sufixo` | `"ESPORTE CLUBE"` | `partesDoNome("FÃS DE ROSCA ESPORTE CLUBE")` dá marca **FÃS DE ROSCA** e assinatura **ESPORTE CLUBE** |
| `letraPorLetra` | `true` | 3 `.palavra` e 10 `.letra` (F, Ã, S, D, E, R, O, S, C, A) com `--i` de 0 a 9 |
| `prefixo` | (nenhum) | |

No escudo, «FÃS DE» e «ROSCA» são grandes e «ESPORTE CLUBE» é a faixa pequena. Com o sufixo, a página faz o mesmo.

### 3.8 Textos (`lib/i18n/messages/paginas-home.ts`, depois dos dos Galácticos, em pt e en)

| papel | chave | pt | en |
|---|---|---|---|
| `lema` | `temaRoscaLema` | Ninguém aqui pula dia de braço. | Nobody here skips arm day. |
| `estrelando` | `temaRoscaSocios` | SÓCIOS EM DIA | PAID-UP MEMBERS |
| `aviso` | `temaRoscaAviso` | Mensalidade atrasada? Acerta com o personal (ele cobra juros). | Behind on your dues? Settle up with the coach (he charges interest). |
| `capitao` | `temaRoscaCapitao` | PERSONAL | COACH |
| `emCartaz` | `temaRoscaQuentinho` | QUENTINHO {periodo} | FRESH OUT OF THE OVEN {periodo} |
| `destino` | `temaRoscaPedido` | Pós-treino: 5 roscas pra viagem. | Post-workout: 5 donuts to go. |
| `carimbo` | `temaRoscaTaPago` | TÁ PAGO | TÁ PAGO (fica em pt; a página marca `lang="pt-BR"`) |
| `fecho` | `temaRoscaFecho` | Contém glúten. E braço demais. | Contains gluten. And way too much arm. |
| `companheiros` | `temaRoscaParceiros` | PARCEIROS DE TREINO | GYM BUDDIES |

**O que cada piada carrega:**
- **5 roscas:** são os 5 jogadores.
- **«ele cobra juros»:** é o agiota do nick do capitão. Se o capitão mudar, a piada ainda funciona (personal que cobra juros).
- **TÁ PAGO:** o treino feito, a conta paga e a dívida com o agiota quitada, tudo junto.
- **No site:** a data da cartela sai como «4ª EDIÇÃO · QUENTINHO DE 13 DE NOVEMBRO A 6 DE DEZEMBRO».

### 3.9 Fotos (selfies de celular: retrato que preenche a moldura, **sem** `formato: "medalhao"`, sem `proporcao`)

`focoPadrao: "50% 28%"`. Os focos por jogador foram conferidos recortando cada foto em 4:5 (crachá e ficha), 1:1 (parceiros) e 3:2:

| slug | foto | `foco` | o que enquadra |
|---|---|---|---|
| `tapa-de-doido` | 1200×1600, chapéu de palha, óculos espelhados, sol | `58% 22%` | aba do chapéu, óculos e barba inteiros; em 1:1 vai do chapéu ao peito |
| `vidotti-agiota` | 900×1600 (9:16), bucket estampado, óculos rosa | `48% 36%` | o chapéu (um pouco cortado em cima) e o rosto até a barba; é o que mais sobra em altura |
| `d1elzera` | 1600×1600, duplo bíceps no vestiário | `47% 40%` | em 4:5, o corte lateral pega o rosto no centro e os dois punhos; os cotovelos saem um pouco |
| `omegafuria` | 1184×1600, touca, óculos azuis, tenda colorida | `50% 26%` | da touca ao queixo, com a tenda colorida atrás |
| `saborenergetico` | 768×984 (a original tinha 256 px), selfie no espelho | `47% 12%` | da cabeça ao celular. É a mais fraca: o espelho da ficha (reflexos) disfarça a maciez |

Na ficha, o tema faz o retrato **4:5 em toda largura**, inclusive de 600 a 899, onde a base faria 4:3. Assim um foco só serve para carta, ficha e parceiros.

### 3.10 Arquivos

| arquivo | o quê |
|---|---|
| `lib/temas/fas-de-rosca-esporte-clube.ts` | **novo**: o tema (apêndice B) |
| `components/times/cenarios/academia.tsx` | **novo**: o cenário (apêndice C) |
| `components/times/cenarios/ornamentos-academia.tsx` | **novo**: os SVG (apêndice D) |
| `components/times/cenarios/academia.module.css` | **novo**: página (apêndice E) |
| `components/times/cenarios/academia-ficha.module.css` | **novo**: ficha (apêndice F) |
| `tests/times/tema-fas-de-rosca.test.tsx` | **novo**: o teste do tema (apêndice G) |
| `lib/temas/tipos.ts` | +2 chaves de fonte; cenário `"academia"` |
| `components/times/fontes-dos-temas.ts` | Sofia (com as reservas) e Kaushan |
| `lib/temas/metricas.ts` | tabela da Sofia; `METRICAS["sofia-extra-condensada"]` |
| `lib/temas/registro.ts` | `TEMA_FAS_DE_ROSCA` na lista |
| `components/times/cenarios/index.ts` | `academia: ACADEMIA` |
| `lib/i18n/messages/paginas-home.ts` | 9 chaves em pt e en |
| `tests/stubs/next-font-google.ts` | `Sofia_Sans_Extra_Condensed`, `Kaushan_Script` |
| `tests/times/temas-sem-opacidade.test.ts` | +12 keyframes de entrada do conteúdo |
| `tests/times/link-da-carta.test.ts` | `academia.module.css` na lista conferida |

Os outros quatro times que estão sendo desenhados agora mexem nos mesmos arquivos compartilhados: `tipos.ts`, `fontes-dos-temas.ts`, `registro.ts`, `cenarios/index.ts`, `paginas-home.ts`, o stub e a lista do teste de opacidade. Todas as mudanças daqui são acréscimos em linhas próprias, para o merge ser só juntar.

---

## 4. A cena do herói

### 4.1 Três composições (o celular NÃO é o computador encolhido)

- **Celular (≤599): pôster vertical.**
  - Ordem:
    1. voltar e relógio;
    2. o escudo no meio do magnésio;
    3. o piso de borracha;
    4. o kicker no piso;
    5. **FÃS DE** pequeno (0,58 do tamanho) em cima;
    6. **ROSCA** grande embaixo, como no escudo;
    7. «esporte clube» com a barrinha;
    8. lema;
    9. chips (o OP.GG na largura toda, regra da base).
  - Sem janelas: os raios entram de fora da tela, pelo canto de cima à direita.
  - `--escudo = clamp(190px, min(58vw, 34svh), 250px)`; margens do bloco do escudo de 0,08E em cima e 0,15E embaixo.
- **Tablet (600 a 1023): o mesmo empilhado, maior.**
  - `--escudo = clamp(230px, min(36vw, 30svh), 290px)`.
  - O gancho desfaz as 2 colunas que a base abre em 900 e mantém um eixo só.
- **Computador (≥1024, e só com `:has()` e o nome que bateu com o sufixo): a faixa «FÃS DE (escudo) ROSCA».**
  - `--escudo = clamp(230px, min(22vw, 36svh), 340px)` e `--folga = clamp(18px, 2.4vw, 34px)`.
  - `.blocoTexto` vira `display: contents`, e a grade fica com 5 linhas:
    1. kicker;
    2. créditos;
    3. o h1 e o escudo na **mesma célula**;
    4. lema;
    5. chips.
  - FÃS DE e ROSCA no mesmo tamanho, nos dois lados do escudo.
  - «esporte clube» embaixo do escudo, já no piso.
  - A grade é o contêiner das unidades `cqi` do título.
  - O h1, o kicker, os créditos, o lema e os chips ganham `position: relative; z-index: 2`, acima do bloco do escudo (z-index 1).
- **Sem `:has()`** (Firefox < 121, Safari < 15.4), **ou se o nome do time mudar** e o sufixo não casar: o computador fica com o empilhado do tablet.

### 4.2 Camadas, de trás para frente

| # | peça do cenário | elemento | o que desenha | cor | onde e quanto |
|---|---|---|---|---|---|
| 1 | `Fundo` | `.enfParede` | parede de blocos: degradê, juntas horizontais a cada 46 px (branco 2,2%), faixa pintada rosa a 64–67% da altura com fio de giz, poça quente a 74% / 0 | `ceu` → `#18131A` → `breu`; faixa `rgba(255,142,195,.07)` | o palco inteiro |
| 2 | `Fundo` | `.enfJanelas` › 4 `.enfJanela` | basculantes: moldura de 4 px, 3×2 vidros (montantes de 4 px), vidro em degradê de madrugada; o 3º tem o sol nascendo (disco a 58% / 118%) | moldura `#2A2328`; vidro `#FFE3CF` → `#FFC1C9` → `#F79BBD`; brilho 46 px a 22%; opacidade .5 | **só ≥1024**: topo 2,5%, `right: calc(4vw + 86px)`, `width: min(54vw, 760px)`, altura `clamp(64px, 12vh, 116px)`, vão de 2,6% |
| 3 | `Fundo` | `.enfRaios` | três faixas de luz a 118° (do alto à direita para baixo à esquerda), em 33–44%, 47–58% e 61–69% da diagonal, com máscara que some aos 88% da altura | `rgba(255,200,160,.07–.16)` | o palco, mais 12% à direita |
| 4 | `Fundo` | `.enfPoeira` › 10 `.enfPo` | poeira de magnésio boiando nos raios (2 a 4 px, com brilho) | `#FFE9D6` | `--x/--y` na tabela `POEIRA`; **5 abaixo de 900 px** |
| 5 | `Fundo` | `.enfRelogio` | relógio de parede: aro de 6, 12 marcas, ponteiro das horas no 6, dos minutos no 12, segundos rosa andando, miolo de rosquinha | face `--giz`, aro `#2A2328`, segundos `#FF5EA8`, miolo `#FF8EC3` | topo `clamp(12px, 3vh, 30px)`, direita `clamp(14px, 3vw, 44px)`, lado `clamp(40px, 4.4vw, 64px)`; no celular fica ao lado do VOLTAR |
| 6 | base | `.enfVinheta`, `.enfGrao` | vinheta e grão da base | | |
| 7 | `Moldura` | `.enfFita` › `.enfTrena` e `.enfFitaTira` | **fita métrica** no teto: régua amarela (SVG 2600×24; `<pattern>` de traços de mm, meio cm com 8 e cm com 11; números 1 a 64 em Chakra Petch 700 10 px), bordas em ouro escuro, saindo da **trena** (caixa redonda escura com miolo amarelo) presa na borda esquerda | `#FFE17A` → `#FFD23F` → `#E6B300`; traços `#1C1206`; borda `#8A6A00` | no padding de cima (`--barra`): altura `clamp(12px, 2vw, 24px)` centrada na faixa; a fita começa em 1,1× a altura; trena de 2,4× a altura a −0,9× |
| 8 | `Moldura` | `.enfFaixaSeguranca` | faixa de segurança da plataforma, listrada a −45° | `#FF8EC3` / `#1A1316`, 12 px cada | rodapé do herói, altura `clamp(8px, 1.1vw, 14px)` |
| 9 | `AtrasDoEscudo` | `.enfHaloEscudo` | contraluz quente atrás do escudo | `rgba(255,190,150,.30)` → `rgba(255,142,195,.12)` → transparente | 190% do escudo, centro a 48% |
| 10 | `AtrasDoEscudo` | `.enfMagnesio` › 5 `.enfNuvem` e 6 `.enfLasca` | a **nuvem de magnésio** da palma (5 bolhas radiais, proporção 1,4) e lascas de giz de 4 px voando cerca de 100 px | `--giz` a .85 → .4 → 0 | caixa do −35% ao 135% na largura, de 50% a 116% do escudo na altura |
| 11 | `AtrasDoEscudo` | `.enfArcos` › 2 `.enfArco` | os **arcos da rosca**: dois traços de giz (2,8 e 1,5 px) no caminho da subida, à direita do escudo | `--giz` | `left: 46%`, `right: −16%`, `top: −6%`, `bottom: 0` |
| 12 | (estrutura) | `.escudo` › img | o escudo (640 px recortado) | | E × E |
| 13 | `NoEscudo` | 4 `.enfSuor` | **gotas de suor** voando do bíceps (gota azul-clara com brilho e contorno fino) | `#FFF` → `#D8F1FF` → `#8FD0F2` | 3,4% do escudo, saindo de 30–52% / 44–55% |
| 14 | `NoEscudo` | `.enfBrilho` | **brilho do bíceps**: estrela de quatro pontas | `#FFFAF2` | 13% do escudo, no bíceps (34% / 41%) |
| 15 | `Chao` | `.enfPiso` › `.enfSombraEscudo` e `.enfMarcaMagnesio` | **piso de borracha**: degradê escuro, granulado de 5 cores (ladrilho de 46×34 px, 30–45%), fio de giz no rodapé e poça de sol; mais a sombra elíptica do escudo e a mancha de magnésio no chão | `#1C171A` → `--borracha` → `breu` | começa a 93% do escudo, 200vw de largura, 0,9E de altura, máscara desde 55%; sombra 0,82E × 0,09E; mancha 1,3E × 0,16E |
| 16 | (estrutura) | kicker, créditos, h1, lema, chips | textos (seção 6) | | z-index 2 no computador |

### 4.3 Medidas (render real, final, com a barra do site de 70/64 px; y em px da página)

| janela | E | ROSCA / FÃS DE | «esporte clube» | tinta do título (x) | fim do «esporte clube» (y) | lema (y) | chips (y) | dobra |
|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 340 | 153,8 / 153,8 | 52 | 379–1553 | 704 | 716–758 | 781–825 | 1080 ✓ |
| 1440×900 | 317 | 158,1 / 158,1 | 52 | 140–1313 | 680 | 693–735 | 758–802 | 900 ✓ |
| **1440×810 (vídeo)** | 292 | 162,8 / 162,8 | 52 | 141–1312 | 655 | 668–710 | **732–776** | 810 ✓ herói inteiro |
| 1366×768 | 276 | 166,1 / 166,1 | 52 | 105–1275 | 637 | 650–691 | 714–758 | 768 ✓ |
| 1024×768 | 230 | 130,1 / 130,1 | 44,2 | 54–981 | 548 | 561–592 | 613–657 | 768 ✓ |
| 768×1024 | 276 | 150 / 87 | 51 | 195–585 | 859 | 865–900 | 913–957 | 1024 ✓ |
| 600×960 | 230 | 150 / 87 | 51 | 111–501 | 792 | 796–831 | 843–941 | 960 ✓ |
| 430×932 | 249 | 112 / 65 | 38,1 | 74–365 | 708 | 712–748 | 760–916 | 932 ✓ |
| **405×720 (vídeo)** | 235 | 112 / 65 | 38,1 | 62–352 | **690** | 694–729 | 741–897 | 720: título e «esporte clube» ✓ |
| 390×844 | 226 | 112 / 65 | 38,1 | 54–345 | 678 | 682–718 | 730–886 | 844 |
| 360×780 | 209 | 112 / 65 | 38,1 | 39–330 | 669 | 673–708 | 721–877 | 780 |
| 320×640 | 190 | 107,5 / 62,4 | 36,6 | 25–304 | 636 | 641–674 | 687–843 | 640: título e «esporte clube» ✓ |

`scrollWidth == innerWidth` em todas, incluindo 2560×1440 (que fica igual a 1920: o contêiner é de no máximo 1280).

---

## 5. A entrada (o "filme" de 0 a 2,4 s)

**Quadro 0 (pôster, conferido em print com tudo pausado em 0):**
- a academia na penumbra, com os basculantes a 18% e os raios a 25%;
- a fita ainda dentro da trena (fora da tela);
- o escudo inteiro, 5% abaixo, 2% à direita, girado 6° e a 97% do tamanho;
- as 10 letras a 80% do tamanho, encolhidas para a linha de base;
- «esporte clube» 0,6 em à esquerda e inclinado (`skewX(−12°)`), com a barrinha a 20% e sem anilhas;
- lema e chips 14 px abaixo (`.sobe` da base);
- kicker e créditos parados, sem `.sobe`, como nos Galácticos, para nunca encostarem em nada.

Nada de conteúdo coberto ou cortado: a borda de baixo do escudo e o «esporte clube» não se tocam, e o h1 está acima do escudo de qualquer jeito.

| ms | conteúdo (só transform 2D, sem delay nem fill-mode; a espera mora no keyframe) | enfeite (aria-hidden) |
|---|---|---|
| 0–1600 | | **câmera** `camNivela`: `rotate(−1.4deg) scale(1.07) translateY(1.2%)` → nada, com `cubic-bezier(.16,1,.3,1)` («o celular endireitando») |
| 0–900 | | **fita** `fitaPuxa`: parada até 72 ms (8%) em `translateX(−101%)`; passa do ponto (+1,2%) aos 648; recua (−0,4%) aos 774; assenta aos 900 |
| 0–1000 | | **faixa de segurança** `faixaAbre`: `scaleX(0)` até 100 ms, abre do centro |
| 0–2200 | | **basculantes** `janelaClareia` (.18 → .5); **raios** `solNasce` (opacidade .25 → 1 e `translateX(−4%) rotate(−2deg)` → nada) |
| 102–1700 | | **magnésio** `magnesioEstoura`: parado até 102 ms; **pico aos 442 ms** (opacidade .5, escala 1); depois deriva e fica de névoa a .16 |
| 110–1100 | | **lascas de giz** `lascaVoa`: voam cerca de 100 px e somem |
| 0–1400 | | **halo** `haloNasce` (.3 → 1; escala .85 → 1) |
| 238–1700 | | **mancha de magnésio** no chão `marcaAparece` (0 → 1 aos 680 → .8) |
| **0–2400** | **escudo: `roscaDireta`** (linear, com a curva por keyframe; origem 30% 92%): parado até 288 ms (12%); sobe em arco até o alto aos **912** (`translate(0,−3%) rotate(−3deg) scale(1.02)`, `cubic-bezier(.45,0,.25,1)`); **treme segurando** de 912 a 1200 (−2,3° / −3,5° / −2,4° / −3,1° a cada 72 ms); assenta (+0,5°, 0,6% abaixo) aos 1440 e repousa aos 1608; **pump** `scale(1.035)` aos 1800 e `scale(.994)` aos 1968; repousa aos 2112 | **sombra** `sombraRosca` junto com ele (escala 1,06 → .8 no alto → 1,04 no pump → 1) |
| 308–1400 | | **arcos da rosca** `arcoRisca`: aparecem aos 420, se desenham (`stroke-dashoffset`) até 868 e somem até 1400 (o 2º termina aos 1500) |
| 864–1488 | | **suor** `suorVoa`: as 4 gotas nascem aos 936 e voam para fora até 1488 |
| **972** | | **brilho do bíceps** `brilhoBiceps` (escala 0 → 1,1 → 0, girando): **flash 2** (pequeno) |
| 725–1970 | **letras** `letraInfla` (duração `1250ms + --i × 80ms`; parada até 34%; `scale(1.09)` a 58%, `.97` a 70%, `1.015` a 82%; origem 50% 88%): as 10 letras **inflam uma a uma**, F aos 725, Ã 771, S 818, D 864, E 911, R 957, O 1003, S 1050, C 1096 e A aos **1143**; todas assentam até 1970 | |
| 988–1900 | **«esporte clube»** `entraClube`: parada até 988 ms (52%); desliza com o pincel (passa 0,04 em aos 1558) e assenta aos 1900 | **barra** `barraCresce` (`scaleX` .2 → 1,03 aos 1406 → 1); **anilha esquerda** `anilhaEntraEsq` entra girando aos 1349 e trava aos 1596; **direita** `anilhaEntraDir` aos 1425 e trava aos 1653 |
| 1225–1800 | **lema** e **chips** sobem (`.sobe` da base: 1750 e 1800 ms) | |
| 2200 → | | raios respiram (`raiosRespiram`, 9 s, .78 ↔ 1) |
| 2400 + 9300 → | | o bíceps brilha de novo aos ~11,7 s e depois a cada 10 s (`brilhoBicepsDeNovo`) |

**Rolando a página** (`animation-timeline: view()`; sem suporte, pelo relógio, com a espera no keyframe):
- **os crachás balançam no gancho** (`crachaBalanca`, pêndulo com origem 38 px acima da carta: −6° → 3,6° → −1,8° → 0,7° → 0), de `entry 0%` até `entry (70% + col × 12%)`. Sem `view()`, `crachaBalancaRelogio` dura `1800ms + i × 150ms`, parado até 40%;
- **o halter de ouro balança** (`halterBalanca`, −24° → 9° → −3° → 0), de `entry 0%` a `entry 90%`, e fica parado sem `view()`;
- **o saco de pão pousa** (`sacoPousa`, 22 px acima e −3° → 3 px e 0,6° → 0), de `entry 10%` a `entry 70%`;
- **o adesivo cola** (`adesivoCola`, escala 1,5 e −24° → .94 → 1,03 → 0), de `entry 30%` a `cover 45%`.

**Na ficha** (relógio):
- **o espelho chega** (`espelhoChega`, 1500 ms; parado até 270);
- **as mãos de magnésio batem na parede** (`maoBate`, 1000 e 1250 ms; picos aos ~400 e ~500 ms);
- **o flash da selfie aos 690 ms** (`flashSelfie`: estrela de 18% do retrato sobre o espelho);
- **o nick infla** (`nickInfla`, 1300 ms: parado até 390; 1,05 aos 806);
- kicker e chips sobem (`.sobe`);
- **as placas da pilha caem** uma a uma (`placaEmpilha` com a duração em cascata do `.sobe`, de 1900 a 2320 ms; caem 9 px até 56% e quicam);
- **o pino rosa entra na primeira placa** (`pinoEntra`, 2400 ms; parado até 1872).

**O que fica vivo depois (laços):**

| peça | animação | quantidade |
|---|---|---|
| raios | `raiosRespiram` (9 s, opacidade) | 1 |
| poeira | `poeiraFlutua` (16 a 24 s, transform e opacidade) | 10 no computador, 5 abaixo de 900 px |
| relógio | `ponteiroGira` (60 s em 60 passos) | 1 |
| brilho do bíceps | `brilhoBicepsDeNovo` (10 s) | 1 |
| crachá do capitão | halo (base, `haloRespira` 3,2 s) | 1 |
| ficha | halo do retrato (3,6 s) e varredura lenta (8 s), os dois da base | 2 |

- **Totais:** página com **14 laços no computador** e 9 no celular; ficha com 2. Tudo é transform ou opacidade em peças pequenas ou compostas.
- **Pintura parada:** o glacê e o granulado do título não animam (sem repintura). O filtro de pó das mãos é parado. Nenhum `mix-blend-mode` novo. Nenhum `will-change`.

**Flashes** (no máximo 2 por segundo; todos pequenos):
- **na entrada:**
  - o magnésio aos 442 ms: suave, sobe em 340 ms e desce em 1,2 s, a 50% no máximo, numa área de cerca de 1,7E × 0,66E. Conto como flash por segurança;
  - o brilho do bíceps aos 972 ms (13% do escudo).
  - Na janela de 0,44 a 1,44 s são **2**. Depois, um brilho a cada 10 s.
- **ficha:** o flash da selfie aos 690 ms, **1**.
- **Não contam:**
  - basculantes e raios (só sobem a luz);
  - a respiração dos raios (22%, em 9 s);
  - as mãos (sobem e assentam).

---

## 6. O título

**A marca (FÃS DE ROSCA): massa de rosquinha com glacê de morango e granulado.**
- **Cada letra é uma rosca.** O `.cromo` de cada `.letra` (`background-clip: text`) tem três camadas, de cima para baixo:
  1. **granulado:** ladrilho SVG de 0,9 em × 100% com 6 confeitos de 3,4 unidades nas 5 cores, só na faixa do glacê (28 a 46% da caixa), `repeat-x` e deslocado `−0,29em × --i`;
  2. **glacê:** ladrilho SVG de 1,1 em × 100%. Tem o degradê `#FFE3F0` → `#FFB3D6` → `#FF8EC3` → `#E9649F`, a borda ondulada a 49–54% da caixa e dois pingos que descem até 64–68%, mais um brilho branco curvo logo abaixo do topo das maiúsculas (cerca de 30%). `repeat-x`, deslocado `−0,37em × --i`: cada letra pega um trecho diferente dos pingos;
  3. **massa:** `#FFD9A0` até 46%, `#FFD79A` a 52%, `#E6A04F` a 63%, `#C27A36` a 74% (a linha de base), `#B2692E` a 86% e `#8E4A1C`.
- **A caixa da letra** tem 1,42 em: respiro de 0,3, linha de 0,9 e respiro de 0,22. O topo das maiúsculas fica a 27,5% e a linha de base a 74%.
- **A tinta garantida** é o `color: var(--tm-metal-meio)` (`#F577B1`) antes do `background-clip`.
- **O eco** (atrás de toda a marca, porque `.marca` é `isolate`) é o contorno de chocolate: `#2B1408` com `-webkit-text-stroke: .1em`, mais a sombra `0 .08em 0 #120700`, `0 .14em .2em` preto a 55% e um halo rosa de `.34em` a 30%.
- **Contraste do pior ponto:** a massa na linha de base dá 5,6:1 no breu e 3,5:1 sobre a parede iluminada pelo raio de sol. O glacê mais escuro dá 6,2:1. O contorno de chocolate ajuda na silhueta.

**Tamanhos:**
- **Até 1023:** `--tam = clamp(44px, 100cqi / --largura-em, máx)`, com máximo de 112 px abaixo de 600 e de `min(150px, 17svh)` de 600 a 1023.
  - Com assinatura (o nome bateu), `.marca` fica em `0.58 × tam` (FÃS DE) e `.palavra:last-child` (ROSCA) vira `display: block` com `font-size: var(--tam)`.
  - A linha de FÃS DE tem a altura da própria fonte (o *strut* é o da `.marca`), então não sobra vão.
- **A partir de 1024 (com `:has`):** `--tam = clamp(60px, (100cqi − E − 2·folga) / (2 · --largura-em), 172px)`, e FÃS DE e ROSCA ficam no mesmo tamanho.
  - `.palavra:last-child` tem `margin-left: calc(E + 2·folga − 0.123em)`: o vão do meio é o escudo.
  - A marca desce `0.6·folga + E/2 − 0.42·tam`, e as maiúsculas ficam centradas no escudo (o centro delas está a 0,42 em da caixa de 0,9 em).
- **Sempre:** `line-height: .9`, `letter-spacing: .02em`, `margin-top: .14em` (o til do Ã sobe a 0,83 em), `font-kerning: none` e `font-variant-ligatures: none`.

**A assinatura (ESPORTE CLUBE): o pincel com a barrinha.**
- **O texto:**
  - Kaushan Script 400 em **minúsculas** (`text-transform: lowercase`): «esporte clube», de assinatura de panfleto;
  - tamanho `clamp(26px, 0.34·tam, 52px)`, girado −4°;
  - creme `#FFF1DA`, com sombra de chocolate `0 .05em 0` e outra `0 .1em .2em` preta a 60% (15,9:1 no piso).
  - O leitor de tela lê o nome inteiro pelo `somenteLeitor` da base.
- **O `TracoDoNome` é a BARRINHA**, inteira enfeite, atrás do texto e girada junto:
  - uma barra cromada de 0,12 em de altura logo abaixo da linha de base;
  - duas **anilhas de rosca** em três quartos (SVG 62×90 de 0,56 em × 0,82 em): massa dourada, glacê de morango com pingos, 4 confeitos, o furo com a ponta da barra cromada e contorno de chocolate.
- **No computador**, a assinatura fica embaixo do escudo: `margin-top: E/2 − 0.48·tam + 0.4·folga`.

---

## 7. O elenco: crachás de sócio no gancho

**«SÓCIOS EM DIA»** (o `.estrelando`):
- Sofia 900 itálico, `clamp(26px, 3.2vw, 44px)`, em `texto`;
- o `::after` vira **fita métrica**: amarela, com traço de mm a cada 5 px e de cm a cada 25 px, sumindo à direita.
- O aviso fica em Kaushan, `clamp(16px, 1.4vw, 19px)`, em `apoio` (8,7:1).

**`AtrasDoElenco`: o muro pintado.**
- Duas linhas em SVG, «FOCO · FORÇA · FÉ» e «& ROSCA», a 200 unidades num viewBox de 1600×440.
- É **só o contorno**: traço de 2,4 px de giz a 7,5%, centrado a 56% da seção, com largura `min(160%, 1760px)`.
- No celular, a 300% de largura: só aparece um pedaço do muro atrás das cartas.
- `.conteiner` ganha `position: relative; z-index: 1`, sempre acima do muro.
- É o «Foco, força e fé» de parede de academia, com o «& ROSCA» do time.

**A grade:**
- `padding-top` de 54 px (64 no computador) e `row-gap` de 58 px: espaço para os ganchos de toda linha;
- 5 colunas a partir de 1024, 3+2 de 600 a 1023 e 2 no celular, onde o capitão ocupa a largura toda (regras da base).

**Cada carta, gancho por gancho:**

| peça | o gancho faz |
|---|---|
| `.casca` | pêndulo com `transform-origin: 50% −38px` (o gancho). Giro parado alternado: −1,2°, 0,8°, −0,5° e 1,1°, pela metade no celular; o capitão fica em 0°. `border-radius: 16px`, para o anel de foco acompanhar. **Hover:** sobe 4 px e gira 1,6° a mais. No computador, o capitão sobe 18 px no hover, porque a base já o ergue 14 |
| `.casca::before` | o **gancho e o cordão**: SVG de 46×48 a −44 px, com pino cromado, dois cordões rosa (`#FF8EC3` sobre `#7A1F48`) e presilha de metal. No capitão é só o cordão (34 px), que sai do halter |
| `.carta` | o **plástico do crachá**: branco `#FFF` → `#FFF4F9` → `#FBE3EE` a 160°, `border-radius: 16px`, `padding: 18px 7px 7px`. A **fenda do cordão** é uma elipse de 34×8 em `#3A2A32` no topo, centrada. Sombra `0 18px 30px −16px`; `container-type: inline-size` |
| `.miolo` | raio 10, branco, `padding-top: 15px`, com a **faixa de glacê com pingos** (SVG de 22 px, `#FF8EC3`) no alto. Linhas: foto / identidade (centrada no espaço que sobra) / rodapé |
| `.foto` | **4:5**, `margin: 0 8px`, raio 8, passe-partout branco de 2 px e fio de chocolate a 22%. A foto usa `object-position: var(--foco)` e `saturate(1.05) contrast(1.02)` |
| `.enfGradacao` | verniz de laminado (branco a 20% num canto) e sombra de chocolate a 28% embaixo |
| `.enfRotaGigante` | escondida |
| `.enfVarredura` | **faixa holográfica** rosa e azul no hover (o selo do crachá) |
| `.topo` | sobre a foto. A `.etiquetaRota` é uma pílula de chocolate `#2B1408` com o texto creme (15,6:1) e o ícone `icone`; a crista de elo tem 34 px |
| `.identidade` | sem posição nem filtro (a carta continua clicável inteira): só `grid-area`, `align-self` e `z-index`. `.placaCapitao` é uma pílula `#FF8EC3` com «PERSONAL» em chocolate (8,2:1) e o halter mini |
| `.nick` | Sofia 900 itálico em **chocolate** `#2B1408` (17,4:1), com uma sombra rosa de impressão em duas cores (`0 .07em 0 #FF8EC3`). Tamanho `clamp(15px, (100cqi − 20px) / --maior-palavra-em, 28px)`; uma linha em toda largura medida |
| `.rodape` | a **assinatura do sócio**: o `.nome` em Kaushan 15 px de chocolate sobre a linha de assinatura (1 px a 35%) e o **código de barras** (62% × 6 px) embaixo. O `.ficha` («FICHA →») vai em Sofia 12 px na cor `--caneta` (6,3:1) |
| **capitão** (`.cascaCapitao`) | o **crachá BLACK**: plástico `#2F262C` → `#120D10` → `#241C21`, borda interna rosa de 1,5 px, faixa de **glacê de mel** (`#FFD79A`), anel rosa na foto, nick creme com sombra framboesa (16,8:1), «FICHA →» `#FFB8D9` (11,7:1) e código de barras dourado. A **insígnia** (halter de ouro) tem 66 px a −62 px (54 px a −52 no celular). O halo da base em rosa e amarelo |
| celular, `.cascaLarga` | o capitão vira **cartão deitado**: foto 4:5 à esquerda (0,82fr), identidade e assinatura à direita; o nick fica em `clamp(20px, (56cqi − 24px)/--maior, 34px)` |

**A insígnia (`Insignia`)** é um SVG de 120×120:
- **halter de ouro** girado −14°, com barra dourada (`#FFF3B0` → `#FFD23F` → `#A87400`) e serrilhado;
- duas **anilhas de rosca de pé** (19×64): massa com metade de glacê rosa e um pingo, mais dois confeitos;
- travas douradas;
- estrela de quatro pontas no alto à direita;
- contorno de chocolate de 2,5 px.

A **`InsigniaMini`** é um halter chapado em `currentColor` (24×24, com barra e duas anilhas de cada lado). Vai nos chips, na placa, na cartela e nos parceiros.

**Medidas** (render real, depois da entrada):

| largura | arranjo | crachá (largura × altura) | nick | capitão |
|---|---|---|---|---|
| 1440 | 5 colunas | 232–241 × 409–414 | 28 px, 1 linha (SABORENERGETICO inclusive) | erguido 14 px |
| 1024 | 5 colunas | 181–188 × 338–341 | 21,2 px | |
| 768 | 3+2 | 231–239 × 382–412 | 28 px | |
| 600 | 3+2 | 175–181 × 303–332 | 20,3 px | |
| 390 | 2 colunas | 175–177 × 302–317 | 20,2 px | deitado 358×214, nick 24,4 px |
| 360 | 2 colunas | 160–162 × 294–295 | 18,1 px | 328×199, nick 21,9 px |
| 320 | 2 colunas | 140–142 × 266–267 | 15,2 px | 288×178, nick 20 px |

**Quadro 0 do elenco:**
- **com `view()`:** antes de entrar na tela os crachás estão retos; ao entrar, giram −6°. É a mesma direção em toda a linha, então eles andam em paralelo e nunca convergem.
- **pelo relógio:** começam todos em −6° (o 0% é igual para todos) e assentam em cascata.

---

## 8. A cartela e a ficha

### 8.1 A cartela: o saco de pão do pós-treino

| peça | gancho / enfeite | o que é |
|---|---|---|
| `.enfLinhaCromo` | gancho | duas réguas de fita métrica (8 px, com traços de mm, apagando nas pontas) e o halter mini amarelo de 26 px no meio |
| `.cartelaCorpo` | gancho | o **saco de papel kraft**. Largura `min(100%, 400px)`, ou `min(100% − 24px, 340px)` no celular; `padding: 70px 26px 40px`, ou `66px 26px 34px`. Fundo, por camadas: kraft `#D1A46D` → `#C99A62` → `#B88A52`, fibras a 93° e a 178°, **sanfonas** laterais (16 px de cada lado, marrom a 22%) e a **dobra** a 54–58 px (vinco marrom a 35% e brilho branco a 12%). Sombra `drop-shadow(0 22px 26px rgba(0,0,0,.7))`, parada |
| `.cartelaCorpo::before` | gancho | a **boca serrilhada**: 9 px de dentes de papel (cônico) acima da borda reta. Sem máscara, para a sombra valer |
| `NaCartela` → `.enfMancha` | enfeite | a **mancha de gordura** da rosca: 34% do saco, a 18% da direita e 16% de baixo, girada −18°, marrom a 28% → 12% |
| `.cartelaEscudo` | gancho | o escudo impresso, de 84 px |
| `.cartelaNome` | gancho | Sofia 900 itálico, `clamp(28px, 3vw, 38px)`, chocolate, em maiúsculas: «FÃS DE ROSCA ESPORTE CLUBE» em 2 linhas (6,9:1 no kraft) |
| `.cartelaDestino` | gancho | Kaushan 17 px em chocolate: «Pós-treino: 5 roscas pra viagem.» |
| `.cartelaData` | gancho | fonte do site, 11 px, `letter-spacing: .16em` (.12 no celular), `--kraft-tinta` (5,7:1): «4ª EDIÇÃO · QUENTINHO DE 13 DE NOVEMBRO A 6 DE DEZEMBRO» |
| `.cartelaCarimbo` | gancho | o **adesivo redondo** que fecha o saco, com «TÁ PAGO»: 84 px (72 no celular), no alto à direita sobre a dobra (`top: 26px; right: −10px`; no celular `top: 18px; right: 6px`, dentro da tela), girado 10°. Disco `#FF9FCB` com anel branco, borda rosa e brilho; texto Sofia 19 px (16 no celular) em chocolate (9,2:1). Fica fora do texto do saco |
| `.cartelaFecho` | gancho | Kaushan 17 px em `apoio`: «Contém glúten. E braço demais.» |

### 8.2 A ficha: a selfie no espelho da academia

O palco e a moldura (fita e faixa) são os mesmos da página.

| peça | o que é |
|---|---|
| `.retratoCasca` | largura `min(100% − 48px, 430px)` a partir de 900, ou `min(100% − 40px, 360px)` abaixo; `margin-top: 34px` (70 no capitão, que leva o halter em cima). Entrada `espelhoChega` |
| `.enfHaloRetrato` | halo quente redondo, `inset: −14%` |
| `AtrasDoRetrato` → `.enfMaos` | **duas mãos de magnésio na parede**, atrás do espelho: SVG de mão de 42% de largura, uma a −24% / 6% girada −26°, a outra a −22% / 52% girada 22° e espelhada. Pó de giz: `feTurbulence` 0,85 vira furos, mais um desfoque de 0,9, tudo parado. Opacidade final .26; entram batendo (`maoBate`) |
| `AtrasDoRetrato` → `.enfFlash` | o **flash da selfie**: estrela de 18% a 66% / 14%, acima do espelho, uma vez |
| `.retrato` | a **moldura de alumínio do espelho**: `padding: 11px`, raio 8, alumínio escovado a 135° (`#F4F7FA` → `#9AA3AD` → `#E8EDF1` → `#7D8690` → `#DFE5EA`) com riscos verticais e **quatro parafusos** nos cantos. Sombra `0 30px 60px −28px` |
| `.retratoMiolo` | `aspect-ratio: var(--proporcao, 4 / 5)` **em toda largura**, raio 3, fundo `#1A1418` |
| `.enfGradacao` | os **reflexos do espelho**, parados: duas faixas brancas a 115° (15% e 7%) e uma sombra embaixo. A varredura lenta da base passa a cada 8 s |
| `.topo` | rota (a pílula de chocolate da página) e crista de elo de 52 px, sobre a foto |
| `.placa` | só no capitão: pílula `#FF8EC3` com «PERSONAL» em chocolate, embaixo à esquerda |
| `.coroaDoRetrato` | o halter de ouro, 96 px a −66 px |
| `.nickVisual` | `inline-grid`, com eco e cromo na mesma célula (`> *`); `line-height: .95`, `margin-top: .22em`, `text-wrap: balance`, `font-kerning: none`. Tamanho `clamp(30px, 100cqi / --largura-nick-em, 104px)` abaixo de 900 e `clamp(42px, …, 136px)` a partir de 900. **O glacê é por linha** (`> :last-child`): ladrilhos de 0,95 em de altura, a altura da linha, começando no respiro de 0,3 em. Cada linha de «TAPA DE / DOIDO» tem o seu glacê. O topo das maiúsculas fica a 12% da linha e a base a 82% |
| `.nomeReal` | Kaushan 18 px (não aparece neste time: nome igual ao nick) |
| chips | rota e elo no estilo do personal (chocolate com borda rosa), pontos no rosa com granulado e OP.GG em contorno rosa |
| `.performance` | Sofia 900 itálico, `clamp(20px, 2vw, 26px)`, em `texto`, sem `.sobe` (não desce sobre as placas no quadro 0); o `::after` é a fita métrica |
| `.estatistica` | a **pilha de placas de aparelho**: placa de ferro `#3A3238` → `#2A2428` → `#1E191D`, raio 6, brilho em cima e sombra embaixo, **furo do pino** no alto ao centro. O valor vai em Sofia 900 itálico `clamp(22px, 2.4vw, 30px)` em `texto` (14:1); o rótulo, 9,5 px em `apoio` (6,9:1) |
| `.estatisticas::before` | o **pino rosa** (haste cromada e puxador `#FF5EA8`) que entra na primeira placa |
| parceiros | «PARCEIROS DE TREINO» com a fita. **Crachás pequenos**: brancos com a faixa de glacê de 12 px, raio 10, sombra; foto de 56 px (46 no celular) com raio 8 e passe-partout; rota em `--caneta` (6,3:1); nick Sofia 16 px (13,5 no celular) em chocolate. No hover ganham anel rosa |

**Nick da ficha** (render real):

| largura (coluna) | Tapa de Doido | D1elzera | OmegaFuria | SaborEnergetico | vidotti agiota |
|---|---|---|---|---|---|
| 1440 (654) | 136 px / 2 linhas | 136 / 1 | 134,9 / 1 | 94,5 / 1 | 136 / 2 |
| 1024 (520) | 136 / 2 | 136 / 1 | 107,3 / 1 | 75,1 / 1 | 136 / 2 |
| 768 (720) | 104 / 1 | 104 / 1 | 104 / 1 | 104 / 1 | 104 / 1 |
| 390 (358) | 104 / 2 | 94,8 / 1 | 73,9 / 1 | 51,7 / 1 | 104 / 2 |
| 360 (328) | 103 / 2 | 86,9 / 1 | 67,7 / 1 | 47,4 / 1 | 104 / 2 |
| 320 (288) | 90,4 / 2 | 76,3 / 1 | 59,4 / 1 | 41,6 / 1 | 93,3 / 2 |

O retrato mede 428 px em 1440, 377 em 1024, 360 em 768, 317 em 390 e 248 em 320. `scrollWidth == innerWidth` em todas.

---

## 9. Movimento reduzido, contraste, foco, riscos, testes e vídeo

### Movimento reduzido

O bloco da base (`.raiz *`, `animation: none !important`) para tudo, e fica o **pôster final**:
- fita esticada, basculantes e raios acesos;
- escudo em repouso, letras cheias e glacê;
- barrinha com as duas anilhas;
- crachás retos no gancho;
- saco com o adesivo;
- espelho reto, mãos a .26, placas empilhadas e pino dentro.

O cenário ainda **esconde** o que só faz sentido em movimento: arcos, suor, brilho do bíceps, lascas e poeira na página, e o flash na ficha. Conferido em print: 0 animações rodando.

### Contraste

Tudo calculado; os textos ficam em ≥ 4,5:1 e o título em ≥ 3:1.

| texto e fundo | razão |
|---|---|
| açúcar (`texto`) no breu, no céu, no abismo | 17,7 · 16,1 · 15,9 |
| `prata` (lema) no breu, no piso | 14,4 · 13,3 |
| `apoio` (kicker, aviso) no breu, na parede com raio de 16%, na névoa de magnésio de 16% | 8,7 · **5,4** · 5,0 |
| `acento` (APRESENTA) no breu, com raio | 10,1 · 6,3 |
| «esporte clube» (creme) no piso | 15,9 |
| nick do crachá (chocolate no branco), do capitão (creme no black) | 17,4 · 16,8 |
| «FICHA →» e rota dos parceiros (`--caneta` no branco) | 6,3 |
| etiqueta de rota (creme no chocolate) · placa PERSONAL (chocolate no rosa) | 15,6 · 8,2 |
| chip de pontos (chocolate no rosa claro e no rosa) | 15,8 · 8,2 |
| nome no saco · data no kraft · adesivo | 6,9 · 5,7 · 9,2 |
| valor e rótulo da placa de ferro | 14,0 · 6,9 |
| título: massa na linha de base no breu e com raio de sol · glacê mais escuro | 5,6 · **3,5** · 6,2 |
| cor do time no site | 10,5 |

- **`forced-colors`:** a face do título e o nick viram `CanvasText`, e o eco e a barrinha somem.
- **`prefers-contrast: more`:** o glacê vira rosa sólido `#FFB3D6`, com o contorno de chocolate.

### Foco

- **O anel é `arco` (`#FFD23F`), de 2 px**, com afastamento de 3 a 4 px e **sempre sobre o fundo escuro** (13,3:1). Vale para VOLTAR, chips e links da cartela.
- **No crachá**, o anel fica na `.casca`: raio 16, por fora do plástico branco (nunca amarelo sobre branco). O gancho fica acima.
- **Nos parceiros**, o anel também fica sobre o escuro.
- **Nada focável recebe máscara ou filtro.**
- **A ordem do Tab não muda** (o `display: contents` não reordena nada): voltar → OP.GG → os 5 crachás → links da cartela.

### Leitor de tela

- O `h1` lê «FÃS DE ROSCA ESPORTE CLUBE» uma vez; as 10 letras, a barrinha e o halter são aria-hidden.
- «PERSONAL» é aria-hidden: o leitor ouve «CAPITÃO» na placa, no chip e nos parceiros (o `RotuloDoCapitao` da base).
- O adesivo «TÁ PAGO» sai com `lang="pt-BR"`.
- Os números da fita e o muro pintado são `<text>` dentro de SVG em enfeite aria-hidden, como o letreiro dos Galácticos.

### Riscos e como evitar

1. **A faixa do computador depende de `:has()`** e do sufixo casar. Sem um dos dois, o computador fica empilhado: legível, só menos bonito.
   - Se o Lucas renomear o time, escreva o novo sufixo no tema.
   - Se o nome novo não terminar em «ESPORTE CLUBE», o título vira o nome inteiro no mesmo tamanho, quebrando entre palavras.
2. **O rosa.** É escolha de propósito: a zoeira, e o amarelo do escudo colide com ÁUREA e DESORGANIZAÇÃO (seção 3.6). Se o Lucas não gostar, trocar `cor` é uma linha; a página não muda.
3. **A reserva da fonte a 40%** deixa o título pequeno por um instante, no primeiro carregamento sem cache. É o preço de nunca cortar.
4. **SaborEnergetico tem a foto mais fraca** (256 px de origem). No espelho da ficha, a 360–428 px, fica macia. Se ele mandar outra, basta trocar o arquivo.
5. **Safari:**
   - o `background-clip: text` com três camadas mais a `scale()` 2D por letra está certo: **nada de `translate3d` ou `scale3d` no título** (lição da QM);
   - o `@supports selector(:has(*))` funciona no Safari 15.4 ou mais novo;
   - `container-type` na grade e na carta também.
   - Conferir num iPhone antes do vídeo.
6. **Firefox sem `view()`:** crachás pelo relógio, saco e adesivo parados, halter parado. Tudo legível.
7. **Tamanho do HTML:**
   - a fita usa `<pattern>` (cerca de 3 KB, não 650 linhas);
   - o glacê é um ladrilho em `url("data:…")` no CSS, não SVG por letra;
   - o halter tem 2 KB.
8. **Os outros 4 temas mexem nos mesmos arquivos compartilhados** (seção 3.10): é só juntar. Se outro time também escolher Sofia ou Kaushan, compartilhem a chave e não declarem duas vezes.
9. **O minificador:**
   - nenhuma regra mistura `translate:` com `transform:` literal; os enfeites centrados usam `left/top` com `calc`;
   - o teste `css-do-build` passou nos módulos novos.

### Testes (todos verdes no harness)

- **Novo `tests/times/tema-fas-de-rosca.test.tsx`** (apêndice G):
  - **registro:** o tema é achado pelo slug; `seiva` sozinho dá `null`; a cor é `#FFA3C8`, e sem slug fica o `#8fc23f` da SEIVA. O nome parte pelo sufixo nas duas caixas. Os textos saem em pt e en (COACH, PAID-UP MEMBERS, TÁ PAGO igual).
  - **métricas:** 2,679, inclusive com o acento decomposto; 2,684; 1,38; os 5 nicks (3,185 · 3,087 · 3,775 · 4,847 · 6,92). A Knewave continua 5,86; RX e QM seguem sem métrica.
  - **página:**
    - `h1` lido uma vez, com 10 letras, 3 palavras e `--largura-em:2.679`;
    - a ordem Tapa de Doido, D1elzera, OmegaFuria, SaborEnergetico, vidotti agiota;
    - `--maior-palavra-em:6.92` e `--foco:58% 22%`;
    - os 7 textos presentes; «CAPITÃO» para o leitor e nunca «PERSONAL»; o adesivo em `lang="pt-BR"`;
    - `data-cenario="academia"`, sem `data-fotos`, com `enfFita`, `enfMuro` e `enfMancha`, e nada dos outros cenários;
    - mais de 25 enfeites, todos aria-hidden e sem texto.
  - **RX, QM e GdB:** sem fita, muro, saco nem mãos.
  - **ficha:** `h1` com `--largura-nick-em:3.087`; os 4 parceiros e «PARCEIROS DE TREINO»; «CAPITÃO» no link do capitão; `enfMaos` e `enfFlash` presentes; enfeites limpos.
- **`temas-sem-opacidade.test.ts`:** +12 keyframes de entrada do conteúdo:
  - `roscaDireta`, `letraInfla`, `entraClube`;
  - `crachaBalanca`, `crachaBalancaRelogio`, `halterBalanca`;
  - `sacoPousa`, `adesivoCola`;
  - `espelhoChega`, `nickInfla`, `placaEmpilha`, `pinoEntra`.
  
  Todos animam só transform; a leitura recursiva já pega os módulos novos.
- **`link-da-carta.test.ts`:** confere `academia.module.css` (verde: nada no caminho do link tem position, transform ou filtro).
- **`css-do-build.test.ts`:** 9 módulos; nenhum `translate`, `rotate` ou `scale` descartado.
- **Os testes da RX, da QM e dos Galácticos ficam sem nenhuma alteração**, verdes.
- **Antes do merge:** `npx vitest run`, `npx tsc --noEmit`, `npm run lint` e `npm run build` (toda rota sai `ƒ`). O build do Next ainda não foi rodado; o lightningcss em modo `pure`, com os alvos do Next, passou.

### Checklist no navegador (depois de integrar)

- **Quadro 0:** rodar `document.getAnimations().forEach(a => { if (a.timeline instanceof DocumentTimeline) { a.pause(); a.currentTime = 0 } })` e tirar o print. As animações por rolagem não aceitam tempo e ficam como estão.
- **Larguras 360, 390, 1024 e 1440:** o título numa linha só no computador e em duas no celular; o Ã inteiro; os crachás balançando; o saco com o adesivo; a ficha com o nick em no máximo 2 linhas.
- **Também:** movimento reduzido, `forced-colors` e `prefers-contrast: more`; aba em segundo plano (abrir, sair e voltar sem nada preso); Safari no iPhone; Firefox.
- **RX, QM e GdB:** prints antes e depois com `.sim/comparar-paginas.cjs`.

### Vídeo (pedido do Lucas)

**Como gravar:** de **produção**, depois do deploy:
- `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador fas-de-rosca-pc.mp4 fas-de-rosca-esporte-clube d1elzera`
- o mesmo com `celular`.
- O script usa 1440×810 e 405×720, as duas medidas acima: no computador cabe o herói inteiro; no celular, o escudo, o título e o «esporte clube».

**Roteiro:**
- **0–2,5 s:**
  - o celular endireita e a fita corre pelo teto;
  - os basculantes clareiam e os raios entram;
  - o magnésio estoura e o escudo faz a rosca;
  - ele treme segurando, o suor voa e o bíceps brilha;
  - as letras inflam uma a uma;
  - o «esporte clube» desliza e as anilhas travam na barrinha;
  - vem o pump.
- **2,5–7 s:** poeira nos raios e o relógio andando, nas 6 em ponto.
- **7–11 s:** rolagem lenta até os crachás, que balançam no gancho, com o PERSONAL no crachá black e o halter balançando.
- **11–13 s:** o saco de pão pousa e o adesivo TÁ PAGO cola; aparece o «Contém glúten».
- **Fecho com 4 s da ficha do D1elzera:** a pose de bíceps no espelho, as mãos de magnésio, o flash da selfie, o nick glaceado e as placas caindo na pilha com o pino. Alternativa: `vidotti-agiota`, pelo halter de ouro e pelo nick de duas linhas.

---

## Apêndices: o código que rodou no harness

Os arquivos novos estão também em `codigo\`, nos mesmos caminhos do repo.

### A. As mudanças nos 9 arquivos existentes (`alteracoes.diff`)

```diff
diff --git a/lib/temas/tipos.ts b/lib/temas/tipos.ts
index 2d16455..f4f2f17 100644
--- a/lib/temas/tipos.ts
+++ b/lib/temas/tipos.ts
@@ -11,8 +11,16 @@ import type { PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
 
 /** As fontes que um tema pode pedir (components/times/fontes-dos-temas.ts carrega cada uma). */
-export type ChaveDeFonte = "exo2-italico" | "permanent-marker" | "bungee" | "special-elite" | "knewave" | "kalam";
+export type ChaveDeFonte =
+  | "exo2-italico"
+  | "permanent-marker"
+  | "bungee"
+  | "special-elite"
+  | "knewave"
+  | "kalam"
+  | "sofia-extra-condensada"
+  | "kaushan";
 
 /** Os cenários prontos (components/times/cenarios: um componente e um CSS module por cenário). */
-export type Cenario = "tempestade" | "estacao" | "boteco";
+export type Cenario = "tempestade" | "estacao" | "boteco" | "academia";
 
 /** Os textos que um tema troca ou acrescenta na página e na ficha (o lema, o "A BORDO"…). */
diff --git a/components/times/fontes-dos-temas.ts b/components/times/fontes-dos-temas.ts
index 97c9c20..b524bef 100644
--- a/components/times/fontes-dos-temas.ts
+++ b/components/times/fontes-dos-temas.ts
@@ -1,3 +1,12 @@
-import { Bungee, Exo_2, Kalam, Knewave, Permanent_Marker, Special_Elite } from "next/font/google";
+import {
+  Bungee,
+  Exo_2,
+  Kalam,
+  Kaushan_Script,
+  Knewave,
+  Permanent_Marker,
+  Sofia_Sans_Extra_Condensed,
+  Special_Elite,
+} from "next/font/google";
 
 import type { ChaveDeFonte } from "@/lib/temas/tipos";
@@ -66,4 +75,28 @@ const kalam = Kalam({
 });
 
+// Fãs de Rosca: a condensada preta itálica do panfleto de academia (o FÃS DE ROSCA e os nicks) e
+// o pincel do "esporte clube". A reserva são DUAS famílias mais estreitas que a Sofia em todo
+// caractere (@font-face em cenarios/academia.module.css): Impact a 63% onde houver (Windows, Mac)
+// e Arial/Helvetica/Roboto a 40% no resto — a largura medida (lib/temas/metricas.ts) vale para
+// as três e o título nunca sai cortado enquanto a fonte chega.
+const sofiaExtraCondensada = Sofia_Sans_Extra_Condensed({
+  subsets: ["latin"],
+  weight: "900",
+  style: "italic",
+  variable: "--tm-fonte-titulo",
+  display: "swap",
+  preload: false,
+  adjustFontFallback: false,
+  fallback: ["Rosca Reserva Impact", "Rosca Reserva"],
+});
+
+const kaushan = Kaushan_Script({
+  subsets: ["latin"],
+  weight: "400",
+  variable: "--tm-fonte-assinatura",
+  display: "swap",
+  preload: false,
+});
+
 export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string }>> = {
   "exo2-italico": exo2Italico,
@@ -73,3 +106,5 @@ export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string
   knewave,
   kalam,
+  "sofia-extra-condensada": sofiaExtraCondensada,
+  kaushan,
 };
diff --git a/lib/temas/metricas.ts b/lib/temas/metricas.ts
index 15ab9ab..71c61aa 100644
--- a/lib/temas/metricas.ts
+++ b/lib/temas/metricas.ts
@@ -47,6 +47,34 @@ const KNEWAVE: MetricasDaFonte = {
 };
 
+/**
+ * Sofia Sans Extra Condensed 900 itálico (Fãs de Rosca), medida no Chromium em 27/10/2026 com o
+ * woff2 do Google Fonts (canvas `measureText` a 100 px, `fontKerning = "none"`): o título e o
+ * nick usam `font-kerning: none`, então a soma das letras é a palavra. A tinta: o itálico passa
+ * até 0,15 em à direita (Ï; 0,083 em nas maiúsculas sem acento, Y) e 0,07 em à esquerda (J),
+ * mais o contorno de 0,1 em do eco e uma folga. O I e o J são estreitíssimos (0,21 em).
+ */
+const SOFIA_EXTRA_CONDENSADA: MetricasDaFonte = {
+  avancos: {
+    A: 0.454, B: 0.433, C: 0.459, D: 0.459, E: 0.387, F: 0.38, G: 0.464, H: 0.47, I: 0.21, J: 0.211,
+    K: 0.453, L: 0.353, M: 0.57, N: 0.472, O: 0.462, P: 0.412, Q: 0.462, R: 0.443, S: 0.401, T: 0.396,
+    U: 0.463, V: 0.454, W: 0.632, X: 0.437, Y: 0.437, Z: 0.396,
+    Á: 0.454, À: 0.454, Â: 0.454, Ã: 0.454, Ä: 0.454, É: 0.387, È: 0.387, Ê: 0.387, Ë: 0.387,
+    Í: 0.21, Ì: 0.21, Î: 0.21, Ï: 0.21, Ó: 0.462, Ò: 0.462, Ô: 0.462, Õ: 0.462, Ö: 0.462,
+    Ú: 0.463, Ù: 0.463, Û: 0.463, Ü: 0.463, Ç: 0.459, Ñ: 0.472,
+    0: 0.43, 1: 0.376, 2: 0.392, 3: 0.402, 4: 0.445, 5: 0.409, 6: 0.429, 7: 0.4, 8: 0.433, 9: 0.428,
+    " ": 0.123, ".": 0.242, ",": 0.247, "-": 0.315, _: 0.37, "'": 0.183, "!": 0.229, "?": 0.373,
+    "&": 0.464, "+": 0.42, "·": 0.252, "#": 0.451, "@": 0.65, "(": 0.213, ")": 0.213, "/": 0.324,
+    ":": 0.232, "%": 0.727, "©": 0.509, "®": 0.372, Æ: 0.605, Œ: 0.623, Þ: 0.412, Ø: 0.462,
+  },
+  padrao: 1,
+  espacamento: 0.02,
+  sobra: 0.36,
+};
+
 /** As métricas pela fonte do título do tema (`tema.fontes.titulo`). */
-export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = { knewave: KNEWAVE };
+export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = {
+  knewave: KNEWAVE,
+  "sofia-extra-condensada": SOFIA_EXTRA_CONDENSADA,
+};
 
 /** Três casas (o erro de arredondar, < 0,0005 em, some dentro da sobra). */
diff --git a/lib/temas/registro.ts b/lib/temas/registro.ts
index a7402b0..16f0a3a 100644
--- a/lib/temas/registro.ts
+++ b/lib/temas/registro.ts
@@ -4,4 +4,5 @@ import { teamColor } from "@/lib/design";
 import type { PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
 import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
+import { TEMA_FAS_DE_ROSCA } from "@/lib/temas/fas-de-rosca-esporte-clube";
 import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
 import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
@@ -9,5 +10,5 @@ import type { CoresDoTema, MetalDoTema, PapelDoTexto, TemaDoTime } from "@/lib/t
 
 /** Os times com página temática. Time novo: um arquivo em lib/temas e uma linha aqui. */
-const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR];
+const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR, TEMA_FAS_DE_ROSCA];
 
 /** O tema do time pelo slug — ou null, e a página fica com o visual padrão do site. */
diff --git a/components/times/cenarios/index.ts b/components/times/cenarios/index.ts
index 11afb58..1b0c0cf 100644
--- a/components/times/cenarios/index.ts
+++ b/components/times/cenarios/index.ts
@@ -1,2 +1,3 @@
+import { ACADEMIA } from "@/components/times/cenarios/academia";
 import { BOTECO } from "@/components/times/cenarios/boteco";
 import { ESTACAO } from "@/components/times/cenarios/estacao";
@@ -10,3 +11,4 @@ export const CENARIOS: Readonly<Record<Cenario, CenarioDoTema>> = {
   estacao: ESTACAO,
   boteco: BOTECO,
+  academia: ACADEMIA,
 };
diff --git a/lib/i18n/messages/paginas-home.ts b/lib/i18n/messages/paginas-home.ts
index 341a953..924cde5 100644
--- a/lib/i18n/messages/paginas-home.ts
+++ b/lib/i18n/messages/paginas-home.ts
@@ -141,4 +141,14 @@ export const paginasHome = definir({
     temaGalacticosFecho: "Beba com moderação · jogue sem moderação nenhuma.",
     temaGalacticosMesa: "A MESA TODA",
+    // Fãs de Rosca (lib/temas/fas-de-rosca-esporte-clube.ts): a academia do time às 6h.
+    temaRoscaLema: "Ninguém aqui pula dia de braço.",
+    temaRoscaSocios: "SÓCIOS EM DIA",
+    temaRoscaAviso: "Mensalidade atrasada? Acerta com o personal (ele cobra juros).",
+    temaRoscaCapitao: "PERSONAL",
+    temaRoscaQuentinho: "QUENTINHO {periodo}",
+    temaRoscaPedido: "Pós-treino: 5 roscas pra viagem.",
+    temaRoscaTaPago: "TÁ PAGO",
+    temaRoscaFecho: "Contém glúten. E braço demais.",
+    temaRoscaParceiros: "PARCEIROS DE TREINO",
 
     // ---------- jogadores ----------
@@ -311,4 +321,14 @@ export const paginasHome = definir({
     temaGalacticosFecho: "Drink responsibly · play irresponsibly.",
     temaGalacticosMesa: "THE WHOLE TABLE",
+    temaRoscaLema: "Nobody here skips arm day.",
+    temaRoscaSocios: "PAID-UP MEMBERS",
+    temaRoscaAviso: "Behind on your dues? Settle up with the coach (he charges interest).",
+    temaRoscaCapitao: "COACH",
+    temaRoscaQuentinho: "FRESH OUT OF THE OVEN {periodo}",
+    temaRoscaPedido: "Post-workout: 5 donuts to go.",
+    // Fica em português, como o «FIADO SÓ AMANHÃ»: a página marca lang="pt-BR" no carimbo.
+    temaRoscaTaPago: "TÁ PAGO",
+    temaRoscaFecho: "Contains gluten. And way too much arm.",
+    temaRoscaParceiros: "GYM BUDDIES",
 
     // ---------- jogadores ----------
diff --git a/tests/stubs/next-font-google.ts b/tests/stubs/next-font-google.ts
index 831619e..11a469f 100644
--- a/tests/stubs/next-font-google.ts
+++ b/tests/stubs/next-font-google.ts
@@ -13,2 +13,4 @@ export const Special_Elite = fonte;
 export const Knewave = fonte;
 export const Kalam = fonte;
+export const Sofia_Sans_Extra_Condensed = fonte;
+export const Kaushan_Script = fonte;
diff --git a/tests/times/temas-sem-opacidade.test.ts b/tests/times/temas-sem-opacidade.test.ts
index 919f644..aa49317 100644
--- a/tests/times/temas-sem-opacidade.test.ts
+++ b/tests/times/temas-sem-opacidade.test.ts
@@ -167,4 +167,17 @@ describe("os keyframes de entrada do conteúdo", () => {
     "tampinhaCai",
     "tampinhaGira",
+    // os Fãs de Rosca (cenarios/academia)
+    "roscaDireta",
+    "letraInfla",
+    "entraClube",
+    "crachaBalanca",
+    "crachaBalancaRelogio",
+    "halterBalanca",
+    "sacoPousa",
+    "adesivoCola",
+    "espelhoChega",
+    "nickInfla",
+    "placaEmpilha",
+    "pinoEntra",
   ])(
     "%s anima transform e nada que esconda",
diff --git a/tests/times/link-da-carta.test.ts b/tests/times/link-da-carta.test.ts
index 8632440..ceb7432 100644
--- a/tests/times/link-da-carta.test.ts
+++ b/tests/times/link-da-carta.test.ts
@@ -112,4 +112,4 @@ describe.each(ARQUIVOS)("$nome", ({ css }) => {
 
 it("achou os módulos da página do time", () => {
-  expect(ARQUIVOS.map((a) => path.basename(a.nome))).toEqual(expect.arrayContaining(["tema.module.css", "boteco.module.css", "estacao.module.css"]));
+  expect(ARQUIVOS.map((a) => path.basename(a.nome))).toEqual(expect.arrayContaining(["tema.module.css", "boteco.module.css", "estacao.module.css", "academia.module.css"]));
 });
```

### B. `lib/temas/fas-de-rosca-esporte-clube.ts` (novo)

```ts
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * FÃS DE ROSCA ESPORTE CLUBE — «Dia de Braço» (27/10/2026).
 *
 * Do escudo: o braço suado fazendo ROSCA DIRETA numa barra cujas anilhas são ROSCAS (rosquinhas
 * com granulado) — o trocadilho é o time —, «FÃS DE / ROSCA» em amarelo com contorno preto, a
 * faixa ESPORTE CLUBE, o halter do «FUNDADO 2026» e os ramos de trigo (a farinha da rosca).
 * Das fotos: a pose de bíceps no vestiário e a selfie no espelho da academia.
 * A página é a academia do time às 6h: o escudo faz a rosca direta, o nome é massa de rosquinha
 * com glacê de morango e granulado (e, no computador, fica dos dois lados do escudo, como no
 * escudo), o elenco são crachás de sócio no gancho, o capitão é o PERSONAL do halter de ouro, a
 * cartela é o saco de pão do pós-treino e a ficha é a selfie no espelho.
 * O amarelo do escudo fica na fita métrica e no halter; o rosa do glacê é a cor do time (o
 * amarelo ficava a ΔE < 15 da ÁUREA e do dourado da DESORGANIZAÇÃO).
 */
export const TEMA_FAS_DE_ROSCA: TemaDoTime = {
  slug: "fas-de-rosca-esporte-clube",
  fontes: { titulo: "sofia-extra-condensada", assinatura: "kaushan" },
  cores: {
    breu: "#120E11",
    ceu: "#1E181C",
    abismo: "#2A1420",
    royal: "#8E2E5E",
    primaria: "#FF8EC3",
    neon: "#FF5EA8",
    arco: "#FFD23F",
    nucleo: "#FFF6FA",
    texto: "#FFF4EC",
    prata: "#EADBE3",
    apoio: "#BCA9B5",
    acento: "#FF9FCB",
    tinta: "#2B1408",
    icone: "#FFB8D9",
  },
  // O "metal" é a rosquinha: glacê de morango em cima (luz, alto, meio, sombra) e massa frita
  // embaixo (fundo, volta, base). `placa` é o rosa claro das placas e chips de pontos.
  metal: {
    luz: "#FFF0F7",
    alto: "#FFB3D6",
    meio: "#F577B1",
    sombra: "#A3366C",
    fundo: "#E6A04F",
    volta: "#FFD79A",
    base: "#B2692E",
    placa: "#FFC4DF",
  },
  sufixo: "ESPORTE CLUBE",
  letraPorLetra: true,
  // O rosa do glacê: ΔE2000 ≥ 26 de todas as outras sete cores de hoje (10,5:1 no fundo do site).
  cor: "#FFA3C8",
  cenario: "academia",
  textos: {
    lema: "temaRoscaLema",
    estrelando: "temaRoscaSocios",
    aviso: "temaRoscaAviso",
    capitao: "temaRoscaCapitao",
    emCartaz: "temaRoscaQuentinho",
    destino: "temaRoscaPedido",
    carimbo: "temaRoscaTaPago",
    fecho: "temaRoscaFecho",
    companheiros: "temaRoscaParceiros",
  },
  // Selfies de celular (retrato que preenche a moldura, sem medalhão). Enquadramento conferido em
  // 4:5 (carta e ficha), 1:1 (companheiros) e 3:2 em cada foto.
  fotos: {
    focoPadrao: "50% 28%",
    foco: {
      "tapa-de-doido": "58% 22%",
      "vidotti-agiota": "48% 36%",
      d1elzera: "47% 40%",
      omegafuria: "50% 26%",
      saborenergetico: "47% 12%",
    },
  },
};
```

### C. `components/times/cenarios/academia.tsx` (novo)

```tsx
import type { CSSProperties } from "react";

import a from "@/components/times/cenarios/academia.module.css";
import af from "@/components/times/cenarios/academia-ficha.module.css";
import {
  ArcosDaRosca,
  Barrinha,
  BrilhoDeQuatroPontas,
  FitaMetrica,
  HalterDeOuro,
  HalterMini,
  MaosDeMagnesio,
  MuroPintado,
  Relogio,
} from "@/components/times/cenarios/ornamentos-academia";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";

/** A poeira de magnésio nos raios: x, y, diâmetro (px), duração (s), atraso NEGATIVO, deriva x/y (px). */
const POEIRA: readonly (readonly [string, string, number, number, number, number, number])[] = [
  ["8%", "22%", 3, 18, -3, 60, 120],
  ["22%", "40%", 2, 22, -11, -40, 160],
  ["35%", "18%", 3, 16, -6, 70, 140],
  ["48%", "34%", 2, 20, -14, -50, 130],
  ["58%", "26%", 4, 19, -2, 40, 170],
  ["66%", "46%", 2, 23, -9, -60, 110],
  ["74%", "20%", 3, 17, -12, 50, 150],
  ["84%", "38%", 2, 21, -5, -30, 140],
  ["90%", "28%", 3, 24, -16, 40, 120],
  ["14%", "52%", 2, 18, -7, 60, 100],
];

/** A nuvem de magnésio da palma: centro x/y (% da nuvem), diâmetro (% da nuvem), deriva final x/y. */
const NUVENS: readonly (readonly [string, string, string, string, string])[] = [
  ["50%", "40%", "46%", "-8%", "-6%"],
  ["30%", "55%", "40%", "-14%", "4%"],
  ["70%", "55%", "40%", "12%", "4%"],
  ["40%", "75%", "36%", "-6%", "10%"],
  ["62%", "74%", "34%", "8%", "10%"],
];

/** As lascas de giz que voam na palma: deslocamento final x/y (px). Uma vez. */
const LASCAS: readonly (readonly [number, number])[] = [
  [-90, -60],
  [-60, -90],
  [-20, -110],
  [30, -100],
  [70, -70],
  [95, -40],
];

/** O suor que voa do bíceps no alto da rosca: origem x/y (% do escudo), deriva x/y (% do escudo), giro. */
const SUOR: readonly (readonly [string, string, string, string, string])[] = [
  ["38%", "48%", "-34%", "-30%", "-30deg"],
  ["46%", "44%", "-12%", "-44%", "-8deg"],
  ["52%", "55%", "22%", "-26%", "24deg"],
  ["30%", "52%", "-40%", "-6%", "-50deg"],
];

/**
 * Cenário "academia" — FÃS DE ROSCA ESPORTE CLUBE, «Dia de Braço»: a academia do time às 6h. A
 * câmera endireita (o celular nivelando), a fita métrica corre pelo teto, os basculantes clareiam
 * e os raios de sol entram com a poeira de magnésio. O escudo bate o magnésio, faz a ROSCA
 * DIRETA (sobe, segura tremendo, assenta) e dá um pump; o suor voa e o bíceps brilha. FÃS DE e
 * ROSCA são rosquinha com glacê de morango e granulado, letra por letra, inflando; o «esporte
 * clube» carrega a barrinha com duas anilhas de rosca. O elenco são crachás de sócio no gancho
 * (o capitão, o PERSONAL, no crachá black pendurado no halter de ouro); a cartela é o saco de
 * pão do pós-treino com o adesivo TÁ PAGO; a ficha é a selfie no espelho da academia.
 */
export const ACADEMIA: CenarioDoTema = {
  classes: a,
  classesDaFicha: af,
  Fundo: () => (
    <>
      <div className={a.enfParede} />
      <div className={a.enfJanelas}>
        {[0, 1, 2, 3].map((k) => (
          <span key={k} className={a.enfJanela} />
        ))}
      </div>
      <div className={a.enfRaios} />
      <div className={a.enfPoeira}>
        {POEIRA.map(([x, y, d, dur, atraso, dx, dy]) => (
          <span
            key={`${x}-${y}`}
            className={a.enfPo}
            style={
              {
                "--x": x,
                "--y": y,
                "--d": `${d}px`,
                "--dur": `${dur}s`,
                "--atraso": `${atraso}s`,
                "--dx": `${dx}px`,
                "--dy": `${dy}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={a.enfRelogio}>
        <Relogio />
      </div>
    </>
  ),
  // A fita métrica esticada no teto (sai da trena na borda esquerda) e a faixa de segurança rosa
  // da plataforma no pé do herói.
  Moldura: () => (
    <>
      <div className={a.enfFita} aria-hidden="true">
        <span className={a.enfTrena} />
        <span className={a.enfFitaTira}>
          <FitaMetrica />
        </span>
      </div>
      <span className={a.enfFaixaSeguranca} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={a.enfHaloEscudo} aria-hidden="true" />
      <div className={a.enfMagnesio} aria-hidden="true">
        {NUVENS.map(([x, y, d, dx, dy]) => (
          <span key={`${x}-${y}`} className={a.enfNuvem} style={{ "--x": x, "--y": y, "--d": d, "--dx": dx, "--dy": dy } as CSSProperties} />
        ))}
        {LASCAS.map(([dx, dy]) => (
          <span key={`${dx}-${dy}`} className={a.enfLasca} style={{ "--dx": `${dx}px`, "--dy": `${dy}px` } as CSSProperties} />
        ))}
      </div>
      <div className={a.enfArcos} aria-hidden="true">
        <ArcosDaRosca />
      </div>
    </>
  ),
  NoEscudo: () => (
    <>
      {SUOR.map(([sx, sy, dx, dy, r]) => (
        <span
          key={`${sx}-${sy}`}
          className={a.enfSuor}
          aria-hidden="true"
          style={{ "--sx": sx, "--sy": sy, "--dx": dx, "--dy": dy, "--r": r } as CSSProperties}
        />
      ))}
      <span className={a.enfBrilho} aria-hidden="true">
        <BrilhoDeQuatroPontas />
      </span>
    </>
  ),
  // O piso de borracha com granulado (sem espelho: o espelho é da RX), a sombra do escudo e a
  // marca de magnésio no chão.
  Chao: () => (
    <div className={a.enfPiso} aria-hidden="true">
      <span className={a.enfSombraEscudo} />
      <span className={a.enfMarcaMagnesio} />
    </div>
  ),
  Insignia: ({ className, id }) => <HalterDeOuro className={className} id={id} />,
  InsigniaMini: ({ className }) => <HalterMini className={className} />,
  TracoDoNome: ({ className }) => <Barrinha className={className} />,
  AtrasDoRetrato: () => (
    <>
      <MaosDeMagnesio />
      <span className={af.enfFlash} aria-hidden="true">
        <BrilhoDeQuatroPontas />
      </span>
    </>
  ),
  AtrasDoElenco: () => (
    <div className={a.enfMuro} aria-hidden="true">
      <MuroPintado />
    </div>
  ),
  // A mancha de gordura da rosca no papel do saco (o resto do saco é o .cartelaCorpo).
  NaCartela: () => <span className={a.enfMancha} aria-hidden="true" />,
};
```

### D. `components/times/cenarios/ornamentos-academia.tsx` (novo)

```tsx
import a from "@/components/times/cenarios/academia.module.css";
import af from "@/components/times/cenarios/academia-ficha.module.css";
import { cx } from "@/components/times/util";

/*
 * Os ornamentos SVG do cenário "academia" (Fãs de Rosca). Todos são ENFEITE: aria-hidden,
 * focusable=false, e os ids levam o prefixo `fr-` (ou o `id` que a página passa à insígnia) para
 * não colidir com outro SVG da página. Os únicos <text> são os números da fita métrica e o muro
 * pintado, dentro de SVG em enfeite aria-hidden: são cenário, não conteúdo.
 */

type ComClasse = Readonly<{ className?: string }>;

/** Os números da fita: 1 a 64 cm, um a cada 40 unidades (1 unidade = 1 px na fita de 24 px). */
const CENTIMETROS = Array.from({ length: 64 }, (_, k) => k + 1);

/**
 * A fita métrica da moldura: amarela, risquinhos de milímetro, meio centímetro e centímetro (um
 * <pattern>, para o SVG não carregar 650 linhas) e os números. 2600 unidades de largura: cobre
 * 2560 px com a fita na altura máxima (24 px); `meet` + `width: auto` mantêm a escala.
 */
export function FitaMetrica() {
  return (
    <svg viewBox="0 0 2600 24" preserveAspectRatio="xMinYMin meet" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="fr-fita" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe17a" />
          <stop offset=".55" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#e6b300" />
        </linearGradient>
        <pattern id="fr-fita-tracos" width="40" height="24" patternUnits="userSpaceOnUse">
          <path
            d="M0.7 0V11M4 0V4.5M8 0V4.5M12 0V4.5M16 0V4.5M20 0V8M24 0V4.5M28 0V4.5M32 0V4.5M36 0V4.5"
            stroke="#1c1206"
            strokeWidth="0.9"
          />
          <path d="M0.7 0V11" stroke="#1c1206" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="2600" height="24" fill="url(#fr-fita)" />
      <rect width="2600" height="24" fill="url(#fr-fita-tracos)" />
      <rect width="2600" height="1.5" fill="#8a6a00" />
      <rect y="22.5" width="2600" height="1.5" fill="#8a6a00" />
      {CENTIMETROS.map((cm) => (
        <text key={cm} x={cm * 40 + 1.5} y="21">
          {cm}
        </text>
      ))}
    </svg>
  );
}

/** O relógio de parede: 6h em ponto (ponteiro das horas no 6, dos minutos no 12), segundos andando. */
export function Relogio() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="46" fill="#f4efea" stroke="#2a2328" strokeWidth="6" />
      {Array.from({ length: 12 }, (_, k) => (
        <line
          key={k}
          x1="50"
          y1="9"
          x2="50"
          y2={k % 3 === 0 ? 18 : 14}
          stroke="#2a2328"
          strokeWidth={k % 3 === 0 ? 4 : 2.4}
          strokeLinecap="round"
          transform={`rotate(${k * 30} 50 50)`}
        />
      ))}
      <line x1="50" y1="50" x2="50" y2="74" stroke="#2a2328" strokeWidth="6" strokeLinecap="round" />
      <line x1="50" y1="50" x2="50" y2="18" stroke="#2a2328" strokeWidth="4" strokeLinecap="round" />
      <g className={a.enfPonteiro}>
        <line x1="50" y1="58" x2="50" y2="14" stroke="#ff5ea8" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="50" cy="50" r="5.5" fill="#ff8ec3" stroke="#2a2328" strokeWidth="2" />
      <circle cx="50" cy="50" r="2" fill="#2a2328" />
    </svg>
  );
}

/** Os arcos de giz da rosca, à direita do escudo: desenhados por stroke-dashoffset e somem. */
export function ArcosDaRosca() {
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <path className={a.enfArco} pathLength={1} d="M70 96C92 80 98 52 84 22" />
      <path className={cx(a.enfArco, a.enfArco2)} pathLength={1} d="M84 98C104 78 108 46 94 14" />
    </svg>
  );
}

/** A estrela de quatro pontas: o brilho do bíceps e o flash da selfie. */
export function BrilhoDeQuatroPontas() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <path d="M20 0C21 13 27 19 40 20C27 21 21 27 20 40C19 27 13 21 0 20C13 19 19 13 20 0Z" fill="#fffaf2" />
      <circle cx="20" cy="20" r="4" fill="#fff" />
    </svg>
  );
}

/** Uma anilha de rosca em três quartos: massa dourada, glacê de morango, granulado, o furo com a barra. */
function AnilhaDeRosca({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 62 90" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-massa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd79a" />
          <stop offset=".6" stopColor="#e6a04f" />
          <stop offset="1" stopColor="#b2692e" />
        </linearGradient>
        <linearGradient id={`${id}-glace`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3f0" />
          <stop offset=".5" stopColor="#ff9fcb" />
          <stop offset="1" stopColor="#e9649f" />
        </linearGradient>
      </defs>
      <ellipse cx="31" cy="45" rx="27" ry="42" fill={`url(#${id}-massa)`} stroke="#2b1408" strokeWidth="3" />
      <path
        d="M8 40C6 18 18 6 31 6C45 6 56 18 54 40C54 46 50 47 49 43C48 38 45 40 45 46C45 52 40 52 40 46C40 40 36 38 33 42C30 46 26 44 25 40C24 36 20 36 18 42C16 48 12 49 11 44C10 41 9 41 8 40Z"
        fill={`url(#${id}-glace)`}
        stroke="#2b1408"
        strokeWidth="2"
      />
      <g strokeLinecap="round" strokeWidth="2.6">
        <path d="M18 18l4-3" stroke="#fff" />
        <path d="M38 14l1 5" stroke="#7fd3ff" />
        <path d="M44 26l4 2" stroke="#ffe45c" />
        <path d="M14 30l2 4" stroke="#8be08a" />
      </g>
      <ellipse cx="31" cy="49" rx="8" ry="13" fill="#3a2a32" stroke="#2b1408" strokeWidth="2.4" />
      <rect x="27" y="44" width="8" height="10" rx="2" fill="#c9ced4" />
    </svg>
  );
}

/**
 * O traço do nome: a BARRINHA embaixo do «esporte clube» — barra cromada e duas anilhas de
 * rosca que deslizam para as pontas na entrada (enfeite inteiro; o texto é o do .pincel).
 */
export function Barrinha({ className }: ComClasse) {
  return (
    <span className={className} aria-hidden="true">
      <span className={a.enfBarra} />
      <AnilhaDeRosca className={cx(a.enfAnilha, a.enfAnilhaEsq)} id="fr-anilha-e" />
      <AnilhaDeRosca className={cx(a.enfAnilha, a.enfAnilhaDir)} id="fr-anilha-d" />
    </span>
  );
}

/** As anilhas do halter de ouro (de pé): x, largura. Glacê na metade de cima, com um pingo. */
const PLACAS: readonly (readonly [number, number])[] = [
  [10, 19],
  [91, 19],
];

/** A insígnia do capitão (o PERSONAL): halter de ouro com anilhas de rosca, inclinado, e um brilho. */
export function HalterDeOuro({ className, id }: ComClasse & Readonly<{ id: string }>) {
  return (
    <svg className={className} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-ouro`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff3b0" />
          <stop offset=".45" stopColor="#ffd23f" />
          <stop offset="1" stopColor="#a87400" />
        </linearGradient>
        <linearGradient id={`${id}-glace`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe3f0" />
          <stop offset=".55" stopColor="#ff8ec3" />
          <stop offset="1" stopColor="#c2457e" />
        </linearGradient>
        <linearGradient id={`${id}-massa`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd79a" />
          <stop offset="1" stopColor="#b2692e" />
        </linearGradient>
      </defs>
      <g transform="rotate(-14 60 60)">
        <rect x="32" y="55" width="56" height="10" rx="5" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2.5" />
        <path d="M42 57v6M48 57v6M54 57v6M60 57v6M66 57v6M72 57v6M78 57v6" stroke="#a87400" strokeWidth="1.6" />
        {PLACAS.map(([x, w]) => (
          <g key={x}>
            <rect x={x} y="28" width={w} height="64" rx={w / 2} fill={`url(#${id}-massa)`} stroke="#2b1408" strokeWidth="2.6" />
            <path
              d={`M${x + 1.5} ${28 + w / 2}C${x + 1.5} 31 ${x + w - 1.5} 31 ${x + w - 1.5} ${28 + w / 2}V54C${x + w - 1.5} 58 ${x + w * 0.62} 58 ${x + w * 0.62} 54C${x + w * 0.5} 50 ${x + w * 0.38} 60 ${x + 1.5} 56Z`}
              fill={`url(#${id}-glace)`}
            />
            <path d={`M${x + 5} 38l3-3M${x + 11} 44l1 4`} stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        ))}
        <rect x="28" y="50" width="7" height="20" rx="2" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2" />
        <rect x="85" y="50" width="7" height="20" rx="2" fill={`url(#${id}-ouro)`} stroke="#2b1408" strokeWidth="2" />
      </g>
      <path d="M98 10C99 18 102 21 110 22C102 23 99 26 98 34C97 26 94 23 86 22C94 21 97 18 98 10Z" fill="#fffaf2" />
    </svg>
  );
}

/** O halter chapado (chips, placa, cartela, companheiros): pinta com currentColor. */
export function HalterMini({ className }: ComClasse) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <rect x="6.5" y="10.8" width="11" height="2.4" rx="1.2" />
      <rect x="2.2" y="6" width="3.2" height="12" rx="1.6" />
      <rect x="5" y="8" width="2.6" height="8" rx="1.3" />
      <rect x="18.6" y="6" width="3.2" height="12" rx="1.6" />
      <rect x="16.4" y="8" width="2.6" height="8" rx="1.3" />
    </svg>
  );
}

const MAO =
  "M30 118C14 104 10 84 14 66L18 44C19 38 27 38 27 45L28 62L31 18C32 10 41 10 41 18L42 56L46 10C47 2 56 2 56 10L56 56L61 16C62 8 71 9 70 17L68 60L76 34C78 27 87 29 85 37L76 78C72 98 62 112 50 118Z";

/** As duas mãos de magnésio na parede, atrás do espelho da ficha (pó: um desfoque parado). */
export function MaosDeMagnesio() {
  return (
    <span className={af.enfMaos} aria-hidden="true">
      {[1, 2].map((k) => (
        <svg key={k} className={cx(af.enfMao, k === 1 ? af.enfMao1 : af.enfMao2)} viewBox="0 0 100 120" aria-hidden="true" focusable="false">
          <defs>
            {/* Pó de giz: ruído que fura a mão (parado: o filtro é calculado uma vez) e borda macia. */}
            <filter id={`fr-po-${k}`} x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={k * 7} result="ruido" />
              <feColorMatrix in="ruido" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.4 -0.7" result="furos" />
              <feComposite in="SourceGraphic" in2="furos" operator="in" result="po" />
              <feGaussianBlur in="po" stdDeviation="0.9" />
            </filter>
          </defs>
          <path d={MAO} fill="#f4efea" filter={`url(#fr-po-${k})`} />
        </svg>
      ))}
    </span>
  );
}

/** O muro pintado atrás dos crachás: FOCO · FORÇA · FÉ / & ROSCA, só o contorno, a 7,5% de giz. */
export function MuroPintado() {
  return (
    <svg viewBox="0 0 1600 440" aria-hidden="true" focusable="false">
      <text x="800" y="190" textAnchor="middle" fontSize="200">
        FOCO · FORÇA · FÉ
      </text>
      <text x="800" y="400" textAnchor="middle" fontSize="200">
        &amp; ROSCA
      </text>
    </svg>
  );
}
```

### E. `components/times/cenarios/academia.module.css` (novo)

```css
/*
 * Cenário "academia" — FÃS DE ROSCA ESPORTE CLUBE, «Dia de Braço» (cenarios/academia.tsx).
 *
 * A academia do time às 6h: parede de blocos cor de ameixa, basculantes com a madrugada rosada,
 * raios de sol com poeira de magnésio, o relógio nas 6 em ponto, piso de borracha com granulado.
 * O escudo faz a ROSCA DIRETA (sobe, segura tremendo, assenta e dá um pump); FÃS DE e ROSCA são
 * massa de rosquinha com glacê de morango e granulado e, no computador, ficam dos dois lados do
 * escudo, como no próprio escudo. O elenco são crachás de sócio no gancho; a cartela, o saco de
 * pão do pós-treino; a ficha (academia-ficha.module.css), a selfie no espelho da academia.
 *
 * Duas famílias de regra, como nos outros cenários:
 *  - ENFEITES próprios (`.enf…`, aria-hidden, sem texto fora de SVG);
 *  - GANCHOS `.raiz .peca` com o nome das peças de tema.module.css. Nada de @layer.
 * Conteúdo só anima transform (scale/rotate/translate 2D no título: background-clip:text), sem
 * delay nem fill-mode, com a espera dentro do keyframe. Flashes (pequenos): a nuvem de magnésio
 * (~0,44 s, suave), o brilho do bíceps (~0,97 s e a cada 10 s) e, na ficha, o flash da selfie.
 */

/* ===================================================== reserva da fonte do título (mais estreita) */
@font-face {
  font-family: "Rosca Reserva Impact";
  src: local("Impact");
  size-adjust: 63%;
}
@font-face {
  font-family: "Rosca Reserva";
  src: local("Arial"), local("ArialMT"), local("Helvetica"), local("Helvetica Neue"), local("Arimo"), local("Liberation Sans"), local("Roboto");
  size-adjust: 40%;
}

/* ===================================================== raiz */
.raiz {
  --tm-titulo-estilo: italic;
  --tm-titulo-peso: 900;
  --tm-titulo-peso-medio: 900;
  --tm-placa-topo: var(--tm-metal-luz);
  --tm-nick-meio: var(--tm-metal-alto);
  --tm-nick-base: var(--tm-metal-meio);
  --tm-valor-base: var(--tm-metal-meio);
  --tm-etiqueta: var(--tm-texto);
  --tm-foto-fundo: var(--tm-abismo);
  --tm-chip-capitao: var(--tm-texto);
  --tm-mono: var(--tm-icone);
  --tm-eco-base: #2b1408;
  --giz: #f4efea;
  --fita: #ffd23f;
  --fita-tinta: #1c1206;
  --borracha: #141113;
  --massa-luz: #ffd9a0;
  --massa-borda: #c27a36;
  --kraft: #c99a62;
  --kraft-tinta: #3b2412;
  --cartao: #ffffff;
  --caneta: #a8326a;
  font-synthesis: none;
}

/* ===================================================== palco: a academia às 6h */
@keyframes camNivela {
  from {
    transform: rotate(-1.4deg) scale(1.07) translate3d(0, 1.2%, 0);
  }
  to {
    transform: none;
  }
}
.raiz .enfCamera {
  transform-origin: 50% 65%;
  animation: camNivela 1600ms cubic-bezier(0.16, 1, 0.3, 1);
}

/* A parede de blocos pintada: cinza-ameixa, juntas horizontais, a faixa rosa da academia. */
.enfParede {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(60% 46% at 74% 0%, rgba(255, 196, 160, 0.15), transparent 70%),
    linear-gradient(180deg, transparent 0 64%, rgba(255, 142, 195, 0.07) 64% 66.4%, rgba(244, 239, 234, 0.06) 66.4% 66.8%, transparent 66.8%),
    repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.022) 0 1px, transparent 1px 46px),
    linear-gradient(180deg, var(--tm-ceu) 0%, #18131a 48%, var(--tm-breu) 100%);
}

/* As janelas basculantes no alto (só ≥1024): a madrugada rosada entrando. */
.enfJanelas {
  position: absolute;
  top: 2.5%;
  right: calc(4vw + 86px);
  display: none;
  gap: 2.6%;
  width: min(54vw, 760px);
  height: clamp(64px, 12vh, 116px);
}
@media (min-width: 1024px) {
  .enfJanelas {
    display: flex;
  }
}
.enfJanela {
  flex: 1;
  border: 4px solid #2a2328;
  border-radius: 3px;
  background:
    linear-gradient(90deg, transparent calc(33.3% - 2px), #2a2328 calc(33.3% - 2px) calc(33.3% + 2px), transparent calc(33.3% + 2px) calc(66.6% - 2px), #2a2328 calc(66.6% - 2px) calc(66.6% + 2px), transparent calc(66.6% + 2px)),
    linear-gradient(180deg, transparent calc(50% - 2px), #2a2328 calc(50% - 2px) calc(50% + 2px), transparent calc(50% + 2px)),
    linear-gradient(180deg, #ffe3cf 0%, #ffc1c9 55%, #f79bbd 100%);
  box-shadow: 0 0 46px rgba(255, 190, 160, 0.22);
  opacity: 0.5;
  animation: janelaClareia 2200ms ease-out;
}
.enfJanela:nth-child(3) {
  background:
    linear-gradient(90deg, transparent calc(33.3% - 2px), #2a2328 calc(33.3% - 2px) calc(33.3% + 2px), transparent calc(33.3% + 2px) calc(66.6% - 2px), #2a2328 calc(66.6% - 2px) calc(66.6% + 2px), transparent calc(66.6% + 2px)),
    linear-gradient(180deg, transparent calc(50% - 2px), #2a2328 calc(50% - 2px) calc(50% + 2px), transparent calc(50% + 2px)),
    radial-gradient(circle at 58% 118%, #fffaf0 0 16%, #ffd8b0 26%, transparent 52%),
    linear-gradient(180deg, #ffe3cf 0%, #ffc1c9 55%, #f79bbd 100%);
}
@keyframes janelaClareia {
  from {
    opacity: 0.18;
  }
  to {
    opacity: 0.5;
  }
}

/* Os raios de sol do basculante, em diagonal, com a poeira de magnésio boiando. */
.enfRaios {
  position: absolute;
  inset: 0 -12% 0 0;
  background: linear-gradient(118deg, transparent 0 33%, rgba(255, 200, 160, 0.11) 36%, rgba(255, 200, 160, 0.16) 39.5%, transparent 43.5%, transparent 47%, rgba(255, 200, 160, 0.09) 50%, rgba(255, 200, 160, 0.13) 54%, transparent 58%, transparent 61%, rgba(255, 200, 160, 0.1) 64%, transparent 69%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.75) 45%, transparent 88%);
  mask-image: linear-gradient(180deg, #000 0%, rgba(0, 0, 0, 0.75) 45%, transparent 88%);
  transform-origin: 80% 0;
  animation: solNasce 2200ms cubic-bezier(0.3, 0.1, 0.2, 1), raiosRespiram 9s ease-in-out 2200ms infinite;
}
@keyframes solNasce {
  from {
    opacity: 0.25;
    transform: translate3d(-4%, 0, 0) rotate(-2deg);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes raiosRespiram {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.78;
  }
}
.enfPoeira {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.enfPo {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--d);
  height: var(--d);
  border-radius: 50%;
  background: #ffe9d6;
  box-shadow: 0 0 6px rgba(255, 220, 190, 0.6);
  opacity: 0;
  animation-name: poeiraFlutua;
  animation-duration: var(--dur);
  animation-timing-function: linear;
  animation-delay: var(--atraso);
  animation-iteration-count: infinite;
}
@keyframes poeiraFlutua {
  0% {
    transform: translate3d(0, 0, 0);
    opacity: 0;
  }
  15% {
    opacity: 0.85;
  }
  80% {
    opacity: 0.6;
  }
  100% {
    transform: translate3d(var(--dx), var(--dy), 0);
    opacity: 0;
  }
}
@media (max-width: 899px) {
  .enfPo:nth-child(n + 6) {
    display: none;
  }
}

/* O relógio de parede: 6h em ponto, o ponteiro dos segundos andando. */
.enfRelogio {
  position: absolute;
  top: clamp(12px, 3vh, 30px);
  right: clamp(14px, 3vw, 44px);
  width: clamp(40px, 4.4vw, 64px);
  aspect-ratio: 1;
}
.enfRelogio svg {
  display: block;
  width: 100%;
  height: 100%;
}
.enfPonteiro {
  transform-box: view-box;
  transform-origin: 50px 50px;
  animation: ponteiroGira 60s steps(60) infinite;
}
@keyframes ponteiroGira {
  to {
    transform: rotate(360deg);
  }
}

/* ===================================================== moldura: a fita métrica e a faixa de segurança */
.enfFita {
  --fita-h: clamp(12px, 2vw, 24px);
  position: absolute;
  z-index: 3;
  top: max(0px, calc((var(--barra) - var(--fita-h)) / 2));
  left: 0;
  right: 0;
  height: var(--fita-h);
  overflow: hidden;
  pointer-events: none;
}
.enfFitaTira {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--fita-h) * 1.1);
  width: max-content;
  animation: fitaPuxa 900ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
.enfFitaTira svg {
  display: block;
  height: 100%;
  width: auto;
}
.enfFitaTira text {
  font: 700 10px var(--font-body), "Chakra Petch", sans-serif;
  fill: var(--fita-tinta);
}
@keyframes fitaPuxa {
  0%,
  8% {
    transform: translate3d(-101%, 0, 0);
  }
  72% {
    transform: translate3d(1.2%, 0, 0);
  }
  86% {
    transform: translate3d(-0.4%, 0, 0);
  }
  100% {
    transform: none;
  }
}
/* A caixa da trena, presa na borda esquerda (parada). */
.enfTrena {
  position: absolute;
  z-index: 1;
  left: calc(var(--fita-h) * -0.9);
  top: 50%;
  width: calc(var(--fita-h) * 2.4);
  aspect-ratio: 1;
  margin-top: calc(var(--fita-h) * -1.2);
  border-radius: 50%;
  background: radial-gradient(circle at 62% 50%, var(--fita) 0 22%, #2a2328 23% 60%, #3a3238 61% 100%);
  box-shadow: inset 0 0 0 2px #4a4046, 2px 0 6px rgba(0, 0, 0, 0.6);
}
.enfFaixaSeguranca {
  position: absolute;
  z-index: 3;
  left: 0;
  right: 0;
  bottom: 0;
  height: clamp(8px, 1.1vw, 14px);
  background: repeating-linear-gradient(-45deg, #ff8ec3 0 12px, #1a1316 12px 24px);
  box-shadow: 0 -1px 0 rgba(255, 255, 255, 0.08);
  pointer-events: none;
  animation: faixaAbre 1000ms cubic-bezier(0.7, 0, 0.2, 1);
}
@keyframes faixaAbre {
  0%,
  10% {
    transform: scaleX(0);
  }
  100% {
    transform: none;
  }
}

/* ===================================================== herói: empilhado no celular; «FÃS DE (escudo) ROSCA» no computador */
.raiz .heroiGrade {
  --escudo: clamp(190px, min(58vw, 34svh), 250px);
  --folga: clamp(18px, 2.4vw, 34px);
  animation-name: none;
}
.raiz .blocoEscudo {
  margin-top: calc(var(--escudo) * 0.08);
  margin-bottom: calc(var(--escudo) * 0.15);
}
@media (min-width: 600px) and (max-width: 1023px) {
  .raiz .heroiGrade {
    --escudo: clamp(230px, min(36vw, 30svh), 290px);
  }
}
@media (min-width: 900px) {
  .raiz .heroiGrade {
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    justify-items: center;
    text-align: center;
    gap: 0;
    min-height: 0;
  }
  .raiz .blocoEscudo {
    grid-column: 1;
    grid-row: 1;
    justify-self: center;
    margin-top: calc(var(--escudo) * 0.1);
    margin-bottom: calc(var(--escudo) * 0.2);
  }
  .raiz .blocoTexto {
    grid-column: 1;
    grid-row: 2;
    margin: 0;
  }
  .raiz .blocoTexto .chips {
    justify-content: center;
  }
  .raiz .lema {
    margin-inline: auto;
  }
}
@media (min-width: 1024px) {
  .raiz .heroiGrade {
    --escudo: clamp(230px, min(22vw, 36svh), 340px);
  }
}
/* ≥1024: «FÃS DE (escudo) ROSCA» numa linha só, como no escudo. Só quando o nome bate com o
   escudo (há assinatura: o sufixo ESPORTE CLUBE casou) e o navegador entende :has(); senão o
   herói fica empilhado como no tablet. O bloco de texto some como caixa (display: contents): o
   kicker, os créditos, o título, o lema e os chips viram linhas da grade, e o escudo divide a
   linha 3 com o título. A grade vira o contêiner das unidades cqi do título. */
@supports selector(:has(*)) {
  @media (min-width: 1024px) {
    .raiz .heroiGrade:has(.assinatura) {
      container-type: inline-size;
    }
    .raiz .heroiGrade:has(.assinatura) .blocoTexto {
      display: contents;
    }
    .raiz .heroiGrade:has(.assinatura) .kicker,
    .raiz .heroiGrade:has(.assinatura) .nomesDoElenco,
    .raiz .heroiGrade:has(.assinatura) .lema,
    .raiz .heroiGrade:has(.assinatura) .chips {
      position: relative;
      z-index: 2; /* acima do escudo, do magnésio e do piso (o bloco do escudo é z-index 1) */
    }
    .raiz .heroiGrade:has(.assinatura) .kicker {
      grid-row: 1;
    }
    .raiz .heroiGrade:has(.assinatura) .nomesDoElenco {
      grid-row: 2;
    }
    .raiz .heroiGrade:has(.assinatura) .titulo {
      position: relative;
      z-index: 2;
      grid-row: 3;
      grid-column: 1;
      width: 100%;
    }
    .raiz .heroiGrade:has(.assinatura) .blocoEscudo {
      grid-row: 3;
      grid-column: 1;
      align-self: start;
      margin: calc(var(--folga) * 0.6) 0 0;
    }
    .raiz .heroiGrade:has(.assinatura) .lema {
      grid-row: 4;
    }
    .raiz .heroiGrade:has(.assinatura) .chips {
      grid-row: 5;
    }
  }
}

/* ===================================================== escudo: a ROSCA DIRETA */
@keyframes roscaDireta {
  0%,
  12% {
    transform: translate(2%, 5%) rotate(6deg) scale(0.97);
    animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
  }
  38% {
    transform: translate(0, -3%) rotate(-3deg) scale(1.02);
    animation-timing-function: linear;
  }
  41% {
    transform: translate(0, -3%) rotate(-2.3deg) scale(1.02);
  }
  44% {
    transform: translate(0, -3%) rotate(-3.5deg) scale(1.02);
  }
  47% {
    transform: translate(0, -3%) rotate(-2.4deg) scale(1.02);
  }
  50% {
    transform: translate(0, -3%) rotate(-3.1deg) scale(1.02);
    animation-timing-function: cubic-bezier(0.3, 0, 0.2, 1);
  }
  60% {
    transform: translate(0, 0.6%) rotate(0.5deg) scale(0.995);
    animation-timing-function: ease-out;
  }
  67% {
    transform: none;
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  75% {
    transform: scale(1.035);
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  82% {
    transform: scale(0.994);
  }
  88%,
  100% {
    transform: none;
  }
}
.raiz .escudo {
  --biceps-x: 34%;
  --biceps-y: 41%;
  transform-origin: 30% 92%;
  animation: roscaDireta 2400ms linear;
}

/* -------- atrás do escudo: contraluz, nuvem de magnésio, arcos da rosca */
.enfHaloEscudo {
  position: absolute;
  left: 50%;
  top: 48%;
  z-index: 0;
  width: 190%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(255, 190, 150, 0.3), rgba(255, 142, 195, 0.12) 55%, transparent 75%);
  animation: haloNasce 1400ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
@keyframes haloNasce {
  from {
    opacity: 0.3;
    transform: scale(0.85);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.enfMagnesio {
  position: absolute;
  z-index: 0;
  left: -35%;
  right: -35%;
  top: 50%;
  height: 66%;
  pointer-events: none;
}
.enfNuvem {
  position: absolute;
  left: calc(var(--x) - var(--d) / 2);
  top: calc(var(--y) - var(--d) * 0.36);
  width: var(--d);
  aspect-ratio: 1.4;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(244, 239, 234, 0.85), rgba(244, 239, 234, 0.4) 48%, transparent 74%);
  opacity: 0.16;
  transform: translate(var(--dx), var(--dy)) scale(1.25);
  animation: magnesioEstoura 1700ms cubic-bezier(0.2, 0.7, 0.3, 1);
}
@keyframes magnesioEstoura {
  0%,
  6% {
    opacity: 0;
    transform: scale(0.3);
  }
  26% {
    opacity: 0.5;
    transform: scale(1);
  }
  100% {
    opacity: 0.16;
    transform: translate(var(--dx), var(--dy)) scale(1.25);
  }
}
.enfLasca {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--giz);
  opacity: 0;
  animation: lascaVoa 1100ms cubic-bezier(0.15, 0.7, 0.3, 1);
}
@keyframes lascaVoa {
  0%,
  10% {
    opacity: 0;
    transform: translate(0, 0);
  }
  18% {
    opacity: 0.9;
  }
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.5);
  }
}
.enfArcos {
  position: absolute;
  z-index: 1;
  left: 46%;
  right: -16%;
  top: -6%;
  bottom: 0;
  overflow: visible;
  pointer-events: none;
}
.enfArcos svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}
.enfArco {
  fill: none;
  stroke: var(--giz);
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  opacity: 0;
  animation: arcoRisca 1400ms cubic-bezier(0.4, 0, 0.2, 1);
}
.enfArco2 {
  stroke-width: 1.5;
  animation-duration: 1500ms;
}
@keyframes arcoRisca {
  0%,
  22% {
    stroke-dashoffset: 1;
    opacity: 0;
  }
  30% {
    opacity: 0.85;
  }
  62% {
    stroke-dashoffset: 0;
    opacity: 0.8;
  }
  100% {
    stroke-dashoffset: 0;
    opacity: 0;
  }
}

/* -------- no escudo: o suor e o brilho do bíceps */
.enfSuor {
  position: absolute;
  z-index: 3;
  left: var(--sx);
  top: var(--sy);
  width: 3.4%;
  aspect-ratio: 0.72;
  border-radius: 50% 50% 50% 50% / 64% 64% 36% 36%;
  background: radial-gradient(circle at 36% 30%, #fff 0 16%, #d8f1ff 30%, #8fd0f2 78%);
  box-shadow: 0 0 0 1px rgba(27, 58, 77, 0.55);
  opacity: 0;
  animation: suorVoa 2400ms cubic-bezier(0.2, 0.6, 0.3, 1);
}
@keyframes suorVoa {
  0%,
  36% {
    opacity: 0;
    transform: translate(0, 0) scale(0.4);
  }
  39% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }
  62%,
  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) rotate(var(--r)) scale(0.75);
  }
}
.enfBrilho {
  position: absolute;
  z-index: 3;
  left: calc(var(--biceps-x) - 6.5%);
  top: calc(var(--biceps-y) - 6.5%);
  width: 13%;
  aspect-ratio: 1;
  transform: scale(0);
  pointer-events: none;
  animation: brilhoBiceps 2400ms linear, brilhoBicepsDeNovo 10s linear 2400ms infinite;
}
.enfBrilho svg {
  display: block;
  width: 100%;
  height: 100%;
}
@keyframes brilhoBiceps {
  0%,
  37% {
    transform: scale(0) rotate(0);
  }
  40.5% {
    transform: scale(1.1) rotate(40deg);
  }
  46%,
  100% {
    transform: scale(0) rotate(90deg);
  }
}
@keyframes brilhoBicepsDeNovo {
  0%,
  90% {
    transform: scale(0);
  }
  93% {
    transform: scale(0.9) rotate(45deg);
  }
  97%,
  100% {
    transform: scale(0) rotate(90deg);
  }
}

/* -------- o chão: piso de borracha com granulado, a sombra e a marca de magnésio */
.enfPiso {
  position: absolute;
  z-index: 0;
  top: 93%;
  left: 50%;
  width: 200vw;
  margin-left: -100vw;
  height: calc(var(--escudo) * 0.9);
  pointer-events: none;
  background:
    radial-gradient(ellipse 30% 46% at 50% 0%, rgba(255, 200, 160, 0.16), transparent 70%),
    linear-gradient(180deg, rgba(244, 239, 234, 0.12) 0 1px, transparent 1px),
    radial-gradient(circle at 12% 22%, rgba(255, 142, 195, 0.45) 0 1.4px, transparent 1.9px) 0 0 / 46px 34px,
    radial-gradient(circle at 63% 71%, rgba(244, 239, 234, 0.34) 0 1.2px, transparent 1.7px) 0 0 / 46px 34px,
    radial-gradient(circle at 81% 18%, rgba(127, 211, 255, 0.34) 0 1.2px, transparent 1.7px) 0 0 / 46px 34px,
    radial-gradient(circle at 36% 58%, rgba(255, 210, 63, 0.34) 0 1.2px, transparent 1.7px) 0 0 / 46px 34px,
    radial-gradient(circle at 92% 88%, rgba(139, 224, 138, 0.3) 0 1.1px, transparent 1.6px) 0 0 / 46px 34px,
    linear-gradient(180deg, #1c171a, var(--borracha) 40%, var(--tm-breu));
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
  mask-image: linear-gradient(180deg, #000 55%, transparent);
}
.enfSombraEscudo {
  position: absolute;
  left: 50%;
  top: 0;
  width: calc(var(--escudo) * 0.82);
  height: calc(var(--escudo) * 0.09);
  margin: calc(var(--escudo) * -0.045) 0 0 calc(var(--escudo) * -0.41);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(0, 0, 0, 0.75), transparent);
  animation: sombraRosca 2400ms linear;
}
@keyframes sombraRosca {
  0%,
  12% {
    transform: scaleX(1.06);
    animation-timing-function: cubic-bezier(0.45, 0, 0.25, 1);
  }
  38% {
    transform: scaleX(0.8);
  }
  60% {
    transform: scaleX(1.01);
  }
  75% {
    transform: scaleX(1.04);
  }
  88%,
  100% {
    transform: none;
  }
}
.enfMarcaMagnesio {
  position: absolute;
  left: 50%;
  top: 2%;
  width: calc(var(--escudo) * 1.3);
  height: calc(var(--escudo) * 0.16);
  margin-left: calc(var(--escudo) * -0.65);
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(244, 239, 234, 0.16), transparent);
  animation: marcaAparece 1700ms ease-out;
}
@keyframes marcaAparece {
  0%,
  14% {
    opacity: 0;
  }
  40% {
    opacity: 1;
  }
  100% {
    opacity: 0.8;
  }
}

/* ===================================================== texto do herói */
.raiz .kicker {
  text-wrap: balance;
}
.raiz .blocoTexto .kicker {
  animation-name: none;
}
.raiz .nomesDoElenco {
  position: relative;
  z-index: 1;
  animation-name: none;
}

/* -------- o título: FÃS DE ROSCA de massa com glacê de morango e granulado */
.raiz .tituloVisual {
  --tm-titulo-max: 112px;
  --tam: clamp(44px, calc(100cqi / var(--largura-em, 2.72)), var(--tm-titulo-max));
}
@media (min-width: 600px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(150px, 17svh);
  }
}
.raiz .marca {
  font-size: var(--tam);
  line-height: 0.9;
  letter-spacing: 0.02em;
  margin-top: 0.14em;
  text-transform: uppercase;
  font-kerning: none;
  font-variant-ligatures: none;
  animation-name: none;
}
.raiz .palavra {
  display: inline-block;
  white-space: nowrap;
}
/* O nome que bate com o escudo (FÃS DE + ROSCA, com a assinatura ESPORTE CLUBE): FÃS DE menor em
   cima, ROSCA grande embaixo — como no escudo. */
.raiz .tituloVisual:has(.assinatura) .marca {
  font-size: calc(var(--tam) * 0.58);
}
.raiz .tituloVisual:has(.assinatura) .palavra:last-child {
  display: block;
  font-size: var(--tam);
}
/* ≥1024 (com :has): FÃS DE e ROSCA no mesmo tamanho, dos dois lados do escudo. As duas metades
   medem o mesmo (FÃS DE 2,684 em, ROSCA 2,679 em): o vão do meio cai exatamente no escudo.
   A linha das maiúsculas fica centrada no escudo (topo das maiúsculas a 0,09 em da caixa de
   0,9 em; centro delas a 0,42 em). O espaço entre DE e ROSCA (0,123 em) sai da margem. */
@supports selector(:has(*)) {
  @media (min-width: 1024px) {
    .raiz .tituloVisual:has(.assinatura) {
      --tam: clamp(60px, calc((100cqi - var(--escudo) - 2 * var(--folga)) / (2 * var(--largura-em, 2.72))), 172px);
      width: 100%;
    }
    .raiz .tituloVisual:has(.assinatura) .marca {
      font-size: var(--tam);
      margin-top: calc(var(--folga) * 0.6 + var(--escudo) * 0.5 - var(--tam) * 0.42);
    }
    .raiz .tituloVisual:has(.assinatura) .palavra:last-child {
      display: inline-block;
      margin-left: calc(var(--escudo) + 2 * var(--folga) - 0.123em);
    }
    /* esporte clube embaixo do escudo, no piso */
    .raiz .tituloVisual:has(.assinatura) .assinatura {
      margin-top: calc(var(--escudo) * 0.5 - var(--tam) * 0.48 + var(--folga) * 0.4);
    }
  }
}
.raiz .letra {
  display: inline-grid;
  transform-origin: 50% 88%;
  animation-name: letraInfla;
  animation-duration: calc(1250ms + var(--i, 0) * 80ms);
  animation-timing-function: linear;
}
.raiz .letra > * {
  grid-area: 1 / 1;
}
@keyframes letraInfla {
  0%,
  34% {
    transform: scale(0.8);
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  58% {
    transform: scale(1.09);
    animation-timing-function: cubic-bezier(0.3, 0, 0.4, 1);
  }
  70% {
    transform: scale(0.97);
  }
  82% {
    transform: scale(1.015);
  }
  100% {
    transform: none;
  }
}
.raiz .eco,
.raiz .cromo {
  padding: 0.3em 0.2em 0.22em 0.12em;
  margin: -0.3em -0.2em -0.22em -0.12em;
}
.raiz .eco {
  position: static;
  inset: auto;
  z-index: -1;
  color: var(--tm-eco-base);
  -webkit-text-stroke: 0.1em var(--tm-eco-base);
  text-shadow:
    0 0.08em 0 #120700,
    0 0.14em 0.2em rgba(0, 0, 0, 0.55),
    0 0 0.34em rgba(255, 94, 168, 0.3);
  user-select: none;
}
.raiz .cromo {
  color: var(--tm-metal-meio);
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .raiz .cromo {
    background-image: linear-gradient(180deg, var(--tm-metal-luz) 0%, var(--tm-metal-alto) 30%, var(--tm-metal-meio) 50%, var(--massa-luz) 52%, var(--tm-metal-fundo) 70%, var(--massa-borda) 100%);
    background-size: 100% 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 0;
    animation: none;
  }
  /* A letra é uma rosca: massa dourada embaixo, glacê de morango escorrendo por cima, granulado.
     Caixa da letra = 1,42 em (0,3 + 0,9 + 0,22): topo das maiúsculas a 27,5%, linha de base a 74%. */
  .raiz .letra .cromo {
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 142' preserveAspectRatio='none'%3E%3Cg fill='none' stroke-linecap='round' stroke-width='3.4'%3E%3Cpath d='M10 45l6-3' stroke='%23fff'/%3E%3Cpath d='M34 40l2 7' stroke='%237fd3ff'/%3E%3Cpath d='M58 49l7 2' stroke='%23ffe45c'/%3E%3Cpath d='M20 59l2 6' stroke='%238be08a'/%3E%3Cpath d='M46 61l6-3' stroke='%23fff'/%3E%3Cpath d='M76 56l5 4' stroke='%23ffb067'/%3E%3C/g%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 110 142' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='.35' stop-color='%23ffe3f0'/%3E%3Cstop offset='.52' stop-color='%23ffb3d6'/%3E%3Cstop offset='.78' stop-color='%23ff8ec3'/%3E%3Cstop offset='.97' stop-color='%23e9649f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23g)' d='M0 0H110V70C110 74 106 76 103 73C100 70 98 74 98 80V86C98 91 92 91 92 86V78C92 73 87 71 83 74C79 77 76 72 71 72C66 72 64 77 60 76C56 75 55 70 50 70C45 70 44 76 44 82V90C44 96 37 96 37 90V80C37 74 32 72 28 74C24 76 20 72 15 72C10 72 8 76 5 76C2 76 0 73 0 70Z'/%3E%3Cpath d='M8 44C16 40 26 40 34 42' fill='none' stroke='%23fff' stroke-opacity='.55' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E"),
      linear-gradient(180deg, var(--massa-luz) 0%, var(--massa-luz) 46%, var(--tm-metal-volta) 52%, var(--tm-metal-fundo) 63%, var(--massa-borda) 74%, var(--tm-metal-base) 86%, #8e4a1c 100%);
    background-size: 0.9em 100%, 1.1em 100%, 100% 100%;
    background-repeat: repeat-x, repeat-x, no-repeat;
    background-position: calc(var(--i, 0) * -0.29em) 0, calc(var(--i, 0) * -0.37em) 0, 0 0;
  }
}

/* -------- esporte clube: pincel em minúsculas, na barrinha com duas anilhas de rosca */
@keyframes entraClube {
  0%,
  52% {
    transform: translate(-0.6em, 0) skewX(-12deg);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  82% {
    transform: translate(0.04em, 0) skewX(1deg);
  }
  100% {
    transform: none;
  }
}
.raiz .assinatura {
  position: relative;
  isolation: isolate;
  margin-top: calc(var(--tam) * 0.02);
  padding-bottom: 0.5em;
  font-size: clamp(26px, calc(var(--tam) * 0.34), 52px);
  animation: entraClube 1900ms linear;
}
.raiz .pincel {
  transform: rotate(-4deg);
  padding: 0 0.5em;
  font: 400 1em / 1.05 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0.01em;
  text-transform: lowercase;
  color: #fff1da;
  text-shadow: 0 0.05em 0 #2b1408, 0 0.1em 0.2em rgba(0, 0, 0, 0.6);
}
.raiz .assinatura .enfTraco {
  position: absolute;
  z-index: -1;
  left: -0.1em;
  right: -0.1em;
  bottom: 0.02em;
  width: auto;
  height: 0.84em;
  margin: 0;
  transform: rotate(-4deg);
  animation: none;
}
.enfBarra {
  position: absolute;
  left: 0.4em;
  right: 0.4em;
  top: calc(50% - 0.06em);
  height: 0.12em;
  border-radius: 0.06em;
  background: linear-gradient(180deg, #f6f8fa, #b9c0c8 45%, #6f7780 60%, #d7dde2);
  box-shadow: 0 0.04em 0.08em rgba(0, 0, 0, 0.6);
  transform-origin: 50% 50%;
  animation: barraCresce 1900ms linear;
}
@keyframes barraCresce {
  0%,
  56% {
    transform: scaleX(0.2);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  74% {
    transform: scaleX(1.03);
  }
  100% {
    transform: none;
  }
}
.enfAnilha {
  position: absolute;
  top: 50%;
  width: 0.56em;
  height: 0.82em;
  margin-top: -0.41em;
  overflow: visible;
}
.enfAnilhaEsq {
  left: 0;
  animation: anilhaEntraEsq 1900ms linear;
}
.enfAnilhaDir {
  right: 0;
  animation: anilhaEntraDir 1900ms linear;
}
@keyframes anilhaEntraEsq {
  0%,
  70% {
    transform: translateX(-1em) rotate(-30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  71% {
    opacity: 1;
  }
  84% {
    transform: translateX(0.07em) rotate(5deg);
  }
  92% {
    transform: translateX(-0.02em);
  }
  100% {
    transform: none;
  }
}
@keyframes anilhaEntraDir {
  0%,
  74% {
    transform: translateX(1em) rotate(30deg);
    opacity: 0;
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  75% {
    opacity: 1;
  }
  87% {
    transform: translateX(-0.07em) rotate(-5deg);
  }
  94% {
    transform: translateX(0.02em);
  }
  100% {
    transform: none;
  }
}

/* -------- lema */
.raiz .lema {
  max-width: 30ch;
  margin-top: clamp(10px, 1.6vw, 18px);
  font: 400 clamp(18px, 1.7vw, 24px) / 1.3 var(--tm-fonte-assinatura), cursive;
  color: var(--tm-prata);
  text-wrap: balance;
  rotate: -2deg;
}

/* -------- chips: etiquetas de academia (cantos de 10 px) */
.raiz .chip::before {
  transform: none;
  border-radius: 10px;
}
.raiz .chipPts::before {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='44'%3E%3Cg fill='none' stroke-linecap='round' stroke-width='3'%3E%3Cpath d='M8 9l6-2' stroke='%23fff'/%3E%3Cpath d='M30 6l2 6' stroke='%237fd3ff'/%3E%3Cpath d='M47 10l6 1' stroke='%23ffe45c'/%3E%3Cpath d='M19 34l5-3' stroke='%238be08a'/%3E%3Cpath d='M41 35l5 3' stroke='%23fff'/%3E%3C/g%3E%3C/svg%3E") 0 0 / 60px 44px,
    linear-gradient(180deg, var(--tm-metal-luz), var(--tm-metal-placa) 60%, var(--tm-primaria));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7), 0 6px 18px -6px rgba(255, 94, 168, 0.55);
}
.raiz .chipCapitao::before {
  background: var(--tm-abismo);
  border: 1px solid rgba(255, 142, 195, 0.6);
}
.raiz .chipOpgg::before {
  border: 2px solid var(--tm-neon);
  background: rgba(18, 14, 17, 0.55);
}
.raiz .chipOpgg:hover::before {
  background: var(--tm-royal);
}
.raiz .chipCapitao .coroaMini {
  width: 18px;
  color: var(--tm-icone);
}

/* ===================================================== elenco: os crachás de sócio no gancho */
.raiz .elencoSecao {
  padding-bottom: clamp(56px, 7vw, 96px);
}
.raiz .elencoSecao .conteiner {
  position: relative;
  z-index: 1;
}
.raiz .estrelando {
  font-size: clamp(26px, 3.2vw, 44px);
  letter-spacing: 0.02em;
}
/* A fita métrica sublinha (o mesmo desenho da moldura). */
.raiz .estrelando::after {
  height: clamp(10px, 1.1vw, 14px);
  border-radius: 2px;
  background:
    repeating-linear-gradient(90deg, var(--fita-tinta) 0 1px, transparent 1px 5px) 0 0 / 100% 40% no-repeat,
    repeating-linear-gradient(90deg, var(--fita-tinta) 0 1.5px, transparent 1.5px 25px) 0 0 / 100% 70% no-repeat,
    linear-gradient(180deg, #ffe17a, var(--fita) 60%, #e6b300);
  -webkit-mask-image: linear-gradient(90deg, #000 70%, transparent);
  mask-image: linear-gradient(90deg, #000 70%, transparent);
}
.raiz .aviso {
  margin-top: -6px;
  font: 400 clamp(16px, 1.4vw, 19px) / 1.35 var(--tm-fonte-assinatura), cursive;
  color: var(--tm-apoio);
}
/* O muro pintado atrás dos crachás: FOCO · FORÇA · FÉ / & ROSCA, a 7% de giz. */
.enfMuro {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.enfMuro svg {
  position: absolute;
  left: 50%;
  top: 56%;
  width: min(160%, 1760px);
  height: auto;
  translate: -50% -50%;
  overflow: visible;
}
.enfMuro text {
  font-family: var(--tm-fonte-titulo), sans-serif;
  font-style: italic;
  font-weight: 900;
  fill: none;
  stroke: rgba(244, 239, 234, 0.075);
  stroke-width: 2.4px;
}
@media (max-width: 599px) {
  .enfMuro svg {
    width: 300%;
    top: 50%;
  }
}

.raiz .elenco {
  padding-top: 54px;
  row-gap: 58px;
}
@media (min-width: 1024px) {
  .raiz .elenco {
    padding-top: 64px;
  }
}

@keyframes crachaBalanca {
  from {
    transform: rotate(-6deg);
  }
  38% {
    transform: rotate(3.6deg);
  }
  62% {
    transform: rotate(-1.8deg);
  }
  82% {
    transform: rotate(0.7deg);
  }
  to {
    transform: none;
  }
}
@keyframes crachaBalancaRelogio {
  0%,
  40% {
    transform: rotate(-6deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  62% {
    transform: rotate(3.6deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  77% {
    transform: rotate(-1.8deg);
  }
  89% {
    transform: rotate(0.7deg);
  }
  100% {
    transform: none;
  }
}
.raiz .casca {
  --giro: 0deg;
  rotate: calc(var(--giro) * var(--giro-escala, 1));
  transform-origin: 50% -38px;
  border-radius: 16px;
  animation-name: crachaBalancaRelogio;
  animation-duration: calc(1800ms + var(--i, 0) * 150ms);
  animation-timing-function: linear;
}
@supports (animation-timeline: view()) {
  .raiz .casca {
    animation: crachaBalanca linear;
    animation-timeline: view();
    animation-range: entry 0% entry calc(70% + var(--col, 0) * 12%);
  }
}
.raiz .casca:nth-child(4n + 1) {
  --giro: -1.2deg;
}
.raiz .casca:nth-child(4n + 2) {
  --giro: 0.8deg;
}
.raiz .casca:nth-child(4n + 3) {
  --giro: -0.5deg;
}
.raiz .casca:nth-child(4n) {
  --giro: 1.1deg;
}
.raiz .cascaCapitao:nth-child(n) {
  --giro: 0deg;
}
@media (max-width: 599px) {
  .raiz .casca {
    --giro-escala: 0.5;
  }
}
/* O gancho na parede e o cordão do crachá. */
.raiz .casca::before {
  content: "";
  position: absolute;
  z-index: 5;
  top: -44px;
  left: 50%;
  width: 46px;
  height: 48px;
  margin-left: -23px;
  pointer-events: none;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 46 48'%3E%3Cdefs%3E%3CradialGradient id='p' cx='.38' cy='.34' r='.7'%3E%3Cstop offset='0' stop-color='%23ffffff'/%3E%3Cstop offset='.5' stop-color='%23b9c0c8'/%3E%3Cstop offset='1' stop-color='%234d545c'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cpath d='M19 9L14 40M27 9L32 40' stroke='%237a1f48' stroke-width='7' stroke-linecap='round'/%3E%3Cpath d='M19 9L14 40M27 9L32 40' stroke='%23ff8ec3' stroke-width='4.4' stroke-linecap='round'/%3E%3Ccircle cx='23' cy='8' r='6.5' fill='url(%23p)' stroke='%232a2328' stroke-width='1.5'/%3E%3Crect x='11' y='36' width='24' height='10' rx='3' fill='%23c9ced4' stroke='%233a3f45' stroke-width='1.5'/%3E%3Crect x='17' y='39' width='12' height='4' rx='2' fill='%233a3f45'/%3E%3C/svg%3E") center / contain no-repeat;
}
.raiz .cascaCapitao::before {
  top: -30px;
  height: 34px;
  background-position: center bottom;
  background-size: 46px 48px;
}
@media (hover: hover) and (pointer: fine) {
  .raiz .casca {
    transition: translate 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), rotate 0.4s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .raiz .casca:hover,
  .raiz .casca:has(.link:focus-visible) {
    translate: 0 -4px;
    rotate: calc(var(--giro) * var(--giro-escala, 1) + 1.6deg);
  }
}
@media (hover: hover) and (pointer: fine) and (min-width: 1024px) {
  .raiz .cascaCapitao:hover,
  .raiz .cascaCapitao:has(.link:focus-visible) {
    translate: 0 -18px; /* a base ergue o capitão 14 px: o hover sobe mais 4, nunca desce */
  }
}
/* O crachá: plástico branco com a fenda do cordão em cima. */
.raiz .carta {
  container-type: inline-size;
  clip-path: none;
  padding: 18px 7px 7px;
  border-radius: 16px;
  background:
    radial-gradient(closest-side, #3a2a32 88%, transparent) 50% 5px / 34px 8px no-repeat,
    linear-gradient(160deg, #ffffff, #fff4f9 55%, #fbe3ee);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8), 0 0 0 1px rgba(43, 20, 8, 0.25), 0 18px 30px -16px rgba(0, 0, 0, 0.9);
}
.raiz .miolo {
  clip-path: none;
  overflow: hidden;
  border-radius: 10px;
  grid-template-rows: auto 1fr auto;
  padding-top: 15px;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 22' preserveAspectRatio='none'%3E%3Cpath fill='%23ff8ec3' d='M0 0H120V10C120 13 117 14 115 12C113 10 111 12 111 15V17C111 20 107 20 107 17V13C107 11 104 10 102 12C99 14 97 11 93 11C89 11 88 15 85 15C82 15 81 11 77 11C73 11 72 16 72 19V20C72 22 68 22 68 20V15C68 12 65 11 62 12C58 13 56 10 52 10C48 10 47 14 44 14C41 14 39 10 35 11C31 12 30 16 30 18C30 21 26 21 26 18V15C26 12 23 11 20 12C16 13 14 10 10 10C6 10 5 13 3 13C1 13 0 12 0 10Z'/%3E%3C/svg%3E") top / 100% 22px no-repeat,
    var(--cartao);
}
.raiz .sobreFoto {
  display: contents;
}
.raiz .foto {
  grid-row: 1;
  aspect-ratio: 4 / 5;
  margin: 0 8px;
  border-radius: 8px;
  background: var(--tm-abismo);
  box-shadow: 0 0 0 2px var(--cartao), 0 0 0 3px rgba(43, 20, 8, 0.22);
}
.raiz .foto img {
  filter: saturate(1.05) contrast(1.02);
}
.raiz .enfGradacao {
  background: linear-gradient(128deg, rgba(255, 255, 255, 0.2), transparent 32%), linear-gradient(180deg, transparent 70%, rgba(43, 20, 8, 0.28));
}
.raiz .enfRotaGigante {
  display: none;
}
.raiz .enfVarredura {
  inset: -10% -70%;
  background: linear-gradient(100deg, transparent 42%, rgba(255, 179, 214, 0.32) 48%, rgba(127, 211, 255, 0.28) 52%, transparent 58%);
}
.raiz .topo {
  grid-area: 1 / 1;
  align-self: start;
  z-index: 2;
  padding: 7px 15px;
}
.raiz .etiquetaRota {
  border: 0;
  border-radius: 999px;
  padding: 4px 8px 4px 7px;
  background: #2b1408;
  color: #fff1da;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
}
.raiz .identidade {
  grid-area: 2 / 1;
  align-self: center;
  z-index: 2;
  align-items: center;
  text-align: center;
  gap: 5px;
  padding: 9px 8px 4px;
}
.raiz .nick {
  --nick: clamp(15px, calc((100cqi - 20px) / var(--maior-palavra-em, 7)), 28px);
  background: none;
  -webkit-text-fill-color: currentColor;
  color: #2b1408;
  text-shadow: 0 0.07em 0 #ff8ec3;
  line-height: 1;
  letter-spacing: 0.02em;
  font-kerning: none;
  text-wrap: balance;
  padding: 0.04em 0.1em 0.08em;
  margin-right: 0;
}
.raiz .placaCapitao {
  border-radius: 999px;
  padding: 4px 10px 3px;
  background: #ff8ec3;
  color: #2b1408;
}
.raiz .mono {
  border-color: rgba(43, 20, 8, 0.4);
  color: #2b1408;
}
/* O rodapé é a assinatura do sócio, sobre a linha, e o código de barras. */
.raiz .rodape {
  grid-area: 3 / 1;
  align-items: flex-end;
  flex-wrap: wrap;
  row-gap: 2px;
  border-top: 0;
  margin: 6px 12px 0;
  padding: 6px 0 16px;
  background:
    linear-gradient(90deg, rgba(43, 20, 8, 0.35), rgba(43, 20, 8, 0.35)) 0 calc(100% - 13px) / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, #2b1408 0 2px, transparent 2px 3px, #2b1408 3px 4px, transparent 4px 7px, #2b1408 7px 10px, transparent 10px 12px) 0 100% / 62% 6px no-repeat;
}
.raiz .nome {
  overflow: visible;
  white-space: normal;
  text-overflow: clip;
  overflow-wrap: break-word;
  color: #2b1408;
  font: 400 15px / 1.15 var(--tm-fonte-assinatura), cursive;
}
.raiz .ficha {
  margin-left: auto;
  color: var(--caneta);
  font: italic 900 12px / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.06em;
}
/* O capitão: o crachá BLACK, pendurado no halter de ouro. */
.raiz .cascaCapitao .carta {
  background:
    radial-gradient(closest-side, #000 88%, transparent) 50% 5px / 34px 8px no-repeat,
    linear-gradient(160deg, #2f262c, #120d10 55%, #241c21);
  box-shadow: inset 0 0 0 1.5px rgba(255, 142, 195, 0.75), 0 0 0 1px #000, 0 22px 36px -16px rgba(0, 0, 0, 0.95);
}
.raiz .cascaCapitao .miolo {
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 22' preserveAspectRatio='none'%3E%3Cpath fill='%23ffd79a' d='M0 0H120V10C120 13 117 14 115 12C113 10 111 12 111 15V17C111 20 107 20 107 17V13C107 11 104 10 102 12C99 14 97 11 93 11C89 11 88 15 85 15C82 15 81 11 77 11C73 11 72 16 72 19V20C72 22 68 22 68 20V15C68 12 65 11 62 12C58 13 56 10 52 10C48 10 47 14 44 14C41 14 39 10 35 11C31 12 30 16 30 18C30 21 26 21 26 18V15C26 12 23 11 20 12C16 13 14 10 10 10C6 10 5 13 3 13C1 13 0 12 0 10Z'/%3E%3C/svg%3E") top / 100% 22px no-repeat,
    #161115;
}
.raiz .cascaCapitao .foto {
  box-shadow: 0 0 0 2px #161115, 0 0 0 3.5px #ff8ec3;
}
.raiz .cascaCapitao .nick {
  color: #fff1da;
  text-shadow: 0 0.07em 0 #c2457e;
}
.raiz .cascaCapitao .nome {
  color: #fff1da;
}
.raiz .cascaCapitao .ficha {
  color: #ffb8d9;
}
.raiz .cascaCapitao .rodape {
  background:
    linear-gradient(90deg, rgba(255, 241, 218, 0.4), rgba(255, 241, 218, 0.4)) 0 calc(100% - 13px) / 100% 1px no-repeat,
    repeating-linear-gradient(90deg, #ffd79a 0 2px, transparent 2px 3px, #ffd79a 3px 4px, transparent 4px 7px, #ffd79a 7px 10px, transparent 10px 12px) 0 100% / 62% 6px no-repeat;
}
.raiz .cascaCapitao .enfHaloCarta {
  background: radial-gradient(closest-side, rgba(255, 142, 195, 0.45), rgba(255, 210, 63, 0.14) 60%, transparent);
}
.raiz .coroaDoCapitao {
  width: 66px;
  top: -62px;
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 12px rgba(255, 210, 63, 0.4));
}
/* O halter de ouro balança quando o crachá do capitão entra na tela (sem view(), fica parado: um
   relógio aqui terminaria antes de alguém rolar até o elenco). */
@supports (animation-timeline: view()) {
  .raiz .coroaDoCapitao {
    animation: halterBalanca linear;
    animation-timeline: view();
    animation-range: entry 0% entry 90%;
  }
}
@keyframes halterBalanca {
  0%,
  30% {
    transform: rotate(-24deg);
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  60% {
    transform: rotate(9deg);
  }
  80% {
    transform: rotate(-3deg);
  }
  100% {
    transform: none;
  }
}
@media (max-width: 599px) {
  .raiz .coroaDoCapitao {
    width: 54px;
    top: -52px;
  }
}
/* Celular: o capitão em crachá DEITADO (cartão black), foto à esquerda. */
@media (max-width: 599px) {
  .raiz .cascaLarga .miolo {
    grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
    grid-template-rows: 1fr auto;
    padding-top: 15px;
  }
  .raiz .cascaLarga .foto {
    grid-area: 1 / 1 / 3 / 2;
    aspect-ratio: 4 / 5;
    margin: 0 0 8px 8px;
  }
  .raiz .cascaLarga .topo {
    grid-area: 1 / 1 / 3 / 2;
    padding: 6px 6px 6px 14px;
  }
  .raiz .cascaLarga .identidade {
    grid-area: 1 / 2;
    align-self: center;
    align-items: flex-start;
    text-align: left;
    padding: 8px 12px 4px 12px;
  }
  .raiz .cascaLarga .rodape {
    grid-area: 2 / 2;
    margin: 0 12px 0 12px;
  }
  .raiz .cascaLarga .nick {
    --nick: clamp(20px, calc((100cqi * 0.56 - 24px) / var(--maior-palavra-em, 7)), 34px);
  }
}

/* ===================================================== cartela: o saco de pão do pós-treino */
.raiz .enfLinhaCromo {
  color: var(--fita);
}
.raiz .enfLinhaCromo::before,
.raiz .enfLinhaCromo::after {
  height: 8px;
  border-radius: 2px;
  background:
    repeating-linear-gradient(90deg, var(--fita-tinta) 0 1px, transparent 1px 5px) 0 0 / 100% 40% no-repeat,
    linear-gradient(180deg, #ffe17a, var(--fita) 60%, #e6b300);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 30%, #000 70%, transparent);
}
.raiz .enfLinhaCromo svg {
  width: 26px;
}
@keyframes sacoPousa {
  from {
    transform: translate(0, -22px) rotate(-3deg);
  }
  70% {
    transform: translate(0, 3px) rotate(0.6deg);
  }
  to {
    transform: none;
  }
}
.raiz .cartelaCorpo {
  width: min(100%, 400px);
  margin: 9px auto 26px;
  padding: 70px 26px 40px;
  color: var(--tm-tinta);
  background:
    linear-gradient(180deg, transparent 0 54px, rgba(59, 36, 18, 0.35) 54px 56px, rgba(255, 255, 255, 0.12) 56px 58px, transparent 58px),
    linear-gradient(90deg, rgba(59, 36, 18, 0.22) 0 16px, transparent 16px calc(100% - 16px), rgba(59, 36, 18, 0.22) calc(100% - 16px)),
    repeating-linear-gradient(93deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 7px),
    repeating-linear-gradient(178deg, rgba(59, 36, 18, 0.05) 0 1px, transparent 1px 5px),
    linear-gradient(180deg, #d1a46d, var(--kraft) 40%, #b88a52);
  filter: drop-shadow(0 22px 26px rgba(0, 0, 0, 0.7));
}
/* A boca serrilhada do saco: dentes de papel acima da borda reta (sem máscara, para a sombra valer). */
.raiz .cartelaCorpo::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -9px;
  height: 9px;
  background: conic-gradient(from 135deg at 50% 0, #d1a46d 90deg, #0000 0) 50% 0 / 16px 9px repeat-x;
}
@supports (animation-timeline: view()) {
  .raiz .cartelaCorpo {
    animation: sacoPousa linear;
    animation-timeline: view();
    animation-range: entry 10% entry 70%;
  }
}
.enfMancha {
  position: absolute;
  right: 18%;
  bottom: 16%;
  width: 34%;
  aspect-ratio: 1.2;
  border-radius: 46% 54% 40% 60%;
  background: radial-gradient(closest-side, rgba(110, 70, 30, 0.28), rgba(110, 70, 30, 0.12) 60%, transparent);
  rotate: -18deg;
  pointer-events: none;
}
.raiz .cartelaEscudo {
  width: 84px;
  height: 84px;
  margin: 0 auto 10px;
  filter: drop-shadow(0 2px 0 rgba(59, 36, 18, 0.4));
}
.raiz .cartelaNome {
  font-size: clamp(28px, 3vw, 38px);
  line-height: 0.95;
  color: var(--tm-tinta);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.raiz .cartelaDestino {
  margin: 12px 0 0;
  font: 400 17px / 1.3 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0.01em;
  color: var(--tm-tinta);
}
.raiz .cartelaData {
  margin: 10px 0 0;
  color: var(--kraft-tinta);
  letter-spacing: 0.16em;
  line-height: 1.6;
}
/* O adesivo redondo que fecha o saco: TÁ PAGO. */
.raiz .cartelaCarimbo {
  position: absolute;
  z-index: 2;
  top: 26px;
  right: -10px;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0;
  padding: 10px;
  border-radius: 50%;
  rotate: 10deg;
  background:
    radial-gradient(circle at 34% 28%, rgba(255, 255, 255, 0.55), transparent 32%),
    radial-gradient(closest-side, #ff9fcb 0 76%, #fff 77% 82%, #ff8ec3 83%);
  box-shadow: 0 6px 12px -4px rgba(0, 0, 0, 0.55);
  color: var(--tm-tinta);
  font: italic 900 19px / 0.95 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.02em;
  text-align: center;
  white-space: normal;
}
@keyframes adesivoCola {
  from {
    transform: scale(1.5) rotate(-24deg);
  }
  55% {
    transform: scale(0.94) rotate(3deg);
  }
  75% {
    transform: scale(1.03);
  }
  to {
    transform: none;
  }
}
@supports (animation-timeline: view()) {
  .raiz .cartelaCarimbo {
    animation: adesivoCola linear;
    animation-timeline: view();
    animation-range: entry 30% cover 45%;
  }
}
.raiz .cartelaFecho {
  margin: 4px 0 22px;
  font: 400 17px / 1.4 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0.01em;
  color: var(--tm-apoio);
}
@media (max-width: 599px) {
  .raiz .cartelaCorpo {
    width: min(100% - 24px, 340px);
    padding: 66px 26px 34px;
  }
  .raiz .cartelaData {
    letter-spacing: 0.12em;
  }
  .raiz .cartelaCarimbo {
    width: 72px;
    height: 72px;
    top: 18px;
    right: 6px;
    font-size: 16px;
  }
}

/* ===================================================== celular e acessibilidade */
@media (prefers-reduced-motion: reduce) {
  .enfArcos,
  .enfSuor,
  .enfBrilho,
  .enfLasca,
  .enfPoeira {
    display: none;
  }
}
@media (forced-colors: active) {
  .raiz .cromo,
  .raiz .letra .cromo {
    background: none;
    -webkit-text-fill-color: CanvasText;
    color: CanvasText;
  }
  .raiz .eco,
  .raiz .assinatura .enfTraco {
    display: none;
  }
}
@media (prefers-contrast: more) {
  .raiz .cromo,
  .raiz .letra .cromo {
    background: none;
    -webkit-text-fill-color: #ffb3d6;
  }
  .raiz .eco {
    display: block;
  }
}
```

### F. `components/times/cenarios/academia-ficha.module.css` (novo)

```css
/*
 * A ficha do jogador no cenário "academia" (cenarios/academia.tsx: classesDaFicha). Peças de
 * ficha.module.css com o gancho `.raiz .peca`; eco e cromo do nick são de OUTRO módulo (o da
 * página), então o glacê do nick mira `.nickVisual > :last-child`, como o boteco faz com `> *`.
 * A ficha é a SELFIE NO ESPELHO da academia: moldura de alumínio, reflexos, o flash do celular,
 * as mãos de magnésio na parede; o nick de rosca glaceada; as estatísticas na pilha de placas.
 */

/* ------------------------------------------------------------------ retrato: a selfie no espelho */
@keyframes espelhoChega {
  0%,
  18% {
    transform: translate(-16px, 10px) rotate(-2.5deg) scale(0.97);
    animation-timing-function: cubic-bezier(0.2, 0.7, 0.3, 1);
  }
  62% {
    transform: rotate(0.6deg);
  }
  80% {
    transform: rotate(-0.2deg);
  }
  100% {
    transform: none;
  }
}
.raiz .retratoCasca {
  width: min(100% - 48px, 430px);
  margin-top: 34px;
  animation: espelhoChega 1500ms linear;
}
.raiz .retratoCapitao {
  margin-top: 70px;
}
@media (max-width: 899px) {
  .raiz .retratoCasca {
    width: min(100% - 40px, 360px);
  }
}
.raiz .enfHaloRetrato {
  inset: -14%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(255, 190, 150, 0.26), rgba(255, 142, 195, 0.12) 60%, transparent);
}
/* A moldura de alumínio escovado com quatro parafusos. */
.raiz .retrato {
  clip-path: none;
  padding: 11px;
  border-radius: 8px;
  background:
    radial-gradient(circle at 12px 12px, #4d545c 0 2.6px, #e8edf1 3.2px, transparent 4px),
    radial-gradient(circle at calc(100% - 12px) 12px, #4d545c 0 2.6px, #e8edf1 3.2px, transparent 4px),
    radial-gradient(circle at 12px calc(100% - 12px), #4d545c 0 2.6px, #e8edf1 3.2px, transparent 4px),
    radial-gradient(circle at calc(100% - 12px) calc(100% - 12px), #4d545c 0 2.6px, #e8edf1 3.2px, transparent 4px),
    repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0 1px, transparent 1px 3px),
    linear-gradient(135deg, #f4f7fa, #9aa3ad 22%, #e8edf1 45%, #7d8690 70%, #dfe5ea);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.6), 0 0 0 1px #1a1418, 0 30px 60px -28px #000;
}
.raiz .retratoMiolo {
  clip-path: none;
  aspect-ratio: var(--proporcao, 4 / 5);
  border-radius: 3px;
  background: #1a1418;
}
.raiz .retratoMiolo > img {
  filter: saturate(1.04) contrast(1.03);
}
/* Os reflexos do espelho (parados) e a sombra de baixo. */
.raiz .enfGradacao {
  background:
    linear-gradient(115deg, transparent 0 16%, rgba(255, 255, 255, 0.15) 16% 24%, transparent 24% 29%, rgba(255, 255, 255, 0.07) 29% 31.5%, transparent 31.5%),
    linear-gradient(180deg, transparent 70%, rgba(18, 14, 17, 0.5));
}
.raiz .topo {
  top: 12px;
  left: 12px;
  right: 12px;
}
.raiz .placa {
  left: 14px;
  bottom: 14px;
  border-radius: 999px;
  padding: 5px 12px 4px;
  background: #ff8ec3;
  color: #2b1408;
}
.raiz .coroaDoRetrato {
  width: 96px;
  top: -66px;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)) drop-shadow(0 0 14px rgba(255, 210, 63, 0.4));
}
/* As mãos de magnésio na parede, atrás do espelho, e o flash da selfie. */
.enfMaos {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.enfMao {
  position: absolute;
  width: 42%;
  height: auto;
  opacity: 0.26;
  animation-name: maoBate;
  animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
}
.enfMao1 {
  left: -24%;
  top: 6%;
  rotate: -26deg;
  animation-duration: 1000ms;
}
.enfMao2 {
  right: -22%;
  top: 52%;
  rotate: 22deg;
  scale: -1 1;
  animation-duration: 1250ms;
}
@keyframes maoBate {
  0%,
  22% {
    opacity: 0;
    transform: scale(1.35);
  }
  40% {
    opacity: 0.38;
    transform: scale(0.95);
  }
  100% {
    opacity: 0.26;
    transform: none;
  }
}
.enfFlash {
  position: absolute;
  z-index: 4;
  left: 66%;
  top: 14%;
  width: 18%;
  aspect-ratio: 1;
  transform: scale(0);
  pointer-events: none;
  animation: flashSelfie 1500ms linear;
}
.enfFlash svg {
  display: block;
  width: 100%;
  height: 100%;
}
@keyframes flashSelfie {
  0%,
  40% {
    transform: scale(0);
  }
  46% {
    transform: scale(1.2) rotate(30deg);
  }
  56%,
  100% {
    transform: scale(0) rotate(60deg);
  }
}

/* ------------------------------------------------------------------ texto */
.raiz .escudoMini {
  width: 30px;
  height: 30px;
}
@keyframes nickInfla {
  0%,
  30% {
    transform: scale(0.86);
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  62% {
    transform: scale(1.05);
  }
  80% {
    transform: scale(0.99);
  }
  100% {
    transform: none;
  }
}
/* O nick pela largura MEDIDA em até duas linhas (--largura-nick-em): TAPA DE / DOIDO = 3,185 em. */
.raiz .nickVisual {
  display: inline-grid;
  line-height: 0.95;
  letter-spacing: 0.02em;
  font-kerning: none;
  overflow-wrap: break-word;
  text-wrap: balance;
  margin-top: 0.22em;
  margin-bottom: 0.08em;
  font-size: clamp(30px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.5))), 104px);
  transform-origin: 0 90%;
  animation: nickInfla 1300ms linear;
}
@media (min-width: 900px) {
  .raiz .nickVisual {
    font-size: clamp(42px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.5))), 136px);
  }
}
.raiz .nickVisual > * {
  grid-area: 1 / 1;
}
/* O glacê do nick é por LINHA: o ladrilho tem a altura de uma linha (0,95 em), começando no topo
   do conteúdo (0,3 em de respiro). Topo das maiúsculas a 12% da linha, linha de base a 82%. */
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .raiz .nickVisual > :last-child {
    background-image:
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 95' preserveAspectRatio='none'%3E%3Cg fill='none' stroke-linecap='round' stroke-width='3.2'%3E%3Cpath d='M10 20l6-3' stroke='%23fff'/%3E%3Cpath d='M34 15l2 7' stroke='%237fd3ff'/%3E%3Cpath d='M58 24l7 2' stroke='%23ffe45c'/%3E%3Cpath d='M20 33l2 6' stroke='%238be08a'/%3E%3Cpath d='M46 35l6-3' stroke='%23fff'/%3E%3Cpath d='M76 30l5 4' stroke='%23ffb067'/%3E%3C/g%3E%3C/svg%3E"),
      url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 110 95' preserveAspectRatio='none'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='0' y2='1'%3E%3Cstop offset='.12' stop-color='%23ffe3f0'/%3E%3Cstop offset='.38' stop-color='%23ffb3d6'/%3E%3Cstop offset='.72' stop-color='%23ff8ec3'/%3E%3Cstop offset='.98' stop-color='%23e9649f'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath fill='url(%23g)' d='M0 0H110V44C110 48 106 50 103 47C100 44 98 48 98 54V60C98 65 92 65 92 60V52C92 47 87 45 83 48C79 51 76 46 71 46C66 46 64 51 60 50C56 49 55 44 50 44C45 44 44 50 44 56V64C44 70 37 70 37 64V54C37 48 32 46 28 48C24 50 20 46 15 46C10 46 8 50 5 50C2 50 0 47 0 44Z'/%3E%3Cpath d='M8 20C16 16 26 16 34 18' fill='none' stroke='%23fff' stroke-opacity='.55' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E"),
      linear-gradient(180deg, var(--massa-luz) 0%, var(--massa-luz) 44%, var(--tm-metal-volta) 50%, var(--tm-metal-fundo) 64%, var(--massa-borda) 82%, var(--tm-metal-base) 92%, #8e4a1c 100%);
    background-size: 0.9em 0.95em, 1.1em 0.95em, 100% 0.95em;
    background-repeat: repeat, repeat, repeat-y;
    background-position: 0 0.3em, 0 0.3em, 0 0.3em;
  }
}
.raiz .nomeReal {
  font: 400 18px / 1.3 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0.01em;
}
.raiz .texto .chips {
  justify-content: flex-start;
}
.raiz .performance {
  font: italic 900 clamp(20px, 2vw, 26px) / 1 var(--tm-fonte-titulo), sans-serif;
  letter-spacing: 0.03em;
  color: var(--tm-texto);
  animation-name: none;
}
.raiz .performance::after {
  height: 10px;
  border-radius: 2px;
  background:
    repeating-linear-gradient(90deg, var(--fita-tinta) 0 1px, transparent 1px 5px) 0 0 / 100% 40% no-repeat,
    repeating-linear-gradient(90deg, var(--fita-tinta) 0 1.5px, transparent 1.5px 25px) 0 0 / 100% 70% no-repeat,
    linear-gradient(180deg, #ffe17a, var(--fita) 60%, #e6b300);
  -webkit-mask-image: linear-gradient(90deg, #000 70%, transparent);
  mask-image: linear-gradient(90deg, #000 70%, transparent);
}

/* ------------------------------------------------------------------ estatísticas: a pilha de placas */
@keyframes placaEmpilha {
  0%,
  56% {
    transform: translateY(-9px);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  72% {
    transform: translateY(2px) scaleY(0.97);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  86% {
    transform: translateY(-1px);
  }
  100% {
    transform: none;
  }
}
.raiz .estatisticas {
  position: relative;
  gap: 10px 8px;
}
.raiz .estatistica {
  gap: 4px;
  padding: 16px 4px 10px;
  border: 0;
  border-radius: 6px;
  background:
    radial-gradient(circle at 50% 8px, #0b090a 0 3.4px, #595058 4.2px, transparent 5px),
    linear-gradient(180deg, #3a3238 0%, #2a2428 42%, #1e191d 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -2px 0 rgba(0, 0, 0, 0.5), 0 6px 12px -6px #000;
  animation-name: placaEmpilha;
  animation-timing-function: linear;
}
.raiz .estatistica::before {
  display: none;
}
.raiz .valor {
  padding: 0;
  background: none;
  color: var(--tm-texto);
  -webkit-text-fill-color: var(--tm-texto);
  font: italic 900 clamp(22px, 2.4vw, 30px) / 1 var(--tm-fonte-titulo), sans-serif;
}
.raiz .rotulo {
  font-size: 9.5px;
  letter-spacing: 0.1em;
  color: var(--tm-apoio);
}
/* O pino rosa da pilha, entrando na primeira placa. */
.raiz .estatisticas::before {
  content: "";
  position: absolute;
  z-index: 2;
  top: 3px;
  left: calc(12.5% - 4px);
  width: 34px;
  height: 10px;
  border-radius: 5px;
  background:
    radial-gradient(circle at 28px 5px, #ffe3f0 0 2px, #ff5ea8 2.5px 5px, transparent 5.5px),
    linear-gradient(180deg, #e9eef2, #8a9099) 0 3px / 26px 4px no-repeat;
  pointer-events: none;
  animation: pinoEntra 2400ms linear;
}
@keyframes pinoEntra {
  0%,
  78% {
    transform: translateX(26px);
    animation-timing-function: cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  92% {
    transform: translateX(-2px);
  }
  100% {
    transform: none;
  }
}

/* ------------------------------------------------------------------ companheiros: crachás pequenos */
.raiz .companheiros {
  gap: 12px 10px;
}
.raiz .companheiroLink {
  align-items: center;
  min-height: 74px;
  border: 0;
  border-radius: 10px;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 22' preserveAspectRatio='none'%3E%3Cpath fill='%23ff8ec3' d='M0 0H120V10C120 13 117 14 115 12C113 10 111 12 111 15V17C111 20 107 20 107 17V13C107 11 104 10 102 12C99 14 97 11 93 11C89 11 88 15 85 15C82 15 81 11 77 11C73 11 72 16 72 19V20C72 22 68 22 68 20V15C68 12 65 11 62 12C58 13 56 10 52 10C48 10 47 14 44 14C41 14 39 10 35 11C31 12 30 16 30 18C30 21 26 21 26 18V15C26 12 23 11 20 12C16 13 14 10 10 10C6 10 5 13 3 13C1 13 0 12 0 10Z'/%3E%3C/svg%3E") top / 100% 12px no-repeat,
    var(--cartao);
  color: var(--tm-tinta);
  box-shadow: 0 0 0 1px rgba(43, 20, 8, 0.25), 0 10px 20px -10px #000;
}
.raiz .companheiroLink:hover {
  border-color: transparent;
  box-shadow: 0 0 0 2px var(--tm-neon), 0 10px 20px -10px #000;
}
.raiz .companheiroFoto {
  flex: 0 0 56px;
  height: 56px;
  margin: 12px 0 8px 10px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 0 2px var(--cartao), 0 0 0 3px rgba(43, 20, 8, 0.25);
}
.raiz .companheiroRota {
  --tm-icone: var(--caneta);
  color: var(--caneta);
}
.raiz .companheiroNick {
  color: var(--tm-tinta);
  font-size: 16px;
  letter-spacing: 0.02em;
  overflow-wrap: break-word;
}
@media (max-width: 599px) {
  .raiz .companheiroFoto {
    flex-basis: 46px;
    height: 46px;
    margin: 12px 0 8px 8px;
  }
  .raiz .companheiroTexto {
    padding: 12px 8px 8px;
  }
  .raiz .companheiroNick {
    font-size: 13.5px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .enfFlash {
    display: none;
  }
}
```

### G. `tests/times/tema-fas-de-rosca.test.tsx` (novo)

```tsx
// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_FAS_DE_ROSCA } from "@/lib/temas/fas-de-rosca-esporte-clube";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática dos Fãs de Rosca (27/10/2026), «Dia de Braço»: a academia do time às 6h. O
 * primeiro tema com o nome PARTIDO EM DOIS TAMANHOS (FÃS DE menor, ROSCA grande; no computador,
 * dos dois lados do escudo) e o segundo com a largura do título medida (Sofia Sans Extra
 * Condensed). Confere o leitor de tela, os textos, a ordem do elenco, as métricas, a regra dos
 * enfeites e que RX, Queijo Minas e Galácticos não ganharam nada disso.
 */

const t = MESSAGES.pt.paginasHome;

function jogador(slug: string, nick: string, role: string, extra: Partial<DesignPlayer> = {}): DesignPlayer {
  return {
    id: slug,
    slug,
    nick: `${nick}#BR1`,
    displayNick: nick,
    name: nick,
    imageUrl: `/players/${slug}-4a.webp`,
    mono: false,
    captain: false,
    elo: "Prata",
    eloMeta: resolveElo("Prata"),
    pts: 5,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "seiva",
    teamName: "FÃS DE ROSCA ESPORTE CLUBE",
    teamSlug: "fas-de-rosca-esporte-clube",
    teamColor: "#FFA3C8",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("tapa-de-doido", "Tapa de Doido", "TOP"),
  jogador("vidotti-agiota", "vidotti agiota", "JUNG", { captain: true }),
  jogador("d1elzera", "D1elzera", "MID"),
  jogador("omegafuria", "OmegaFuria", "ADC"),
  jogador("saborenergetico", "SaborEnergetico", "SUP"),
];
const TIME: DesignTeam = {
  id: "seiva",
  name: "FÃS DE ROSCA ESPORTE CLUBE",
  slug: "fas-de-rosca-esporte-clube",
  color: "#FFA3C8",
  imageUrl: "/teams/fas-de-rosca-esporte-clube.webp",
  roster: ROSTER,
  captain: ROSTER[1]!,
  total: 29,
};

function paginaDoTime(tema: TemaDoTime = TEMA_FAS_DE_ROSCA, time: DesignTeam = TIME) {
  return renderToStaticMarkup(
    <PaginaDoTimeComTema
      team={time}
      tema={tema}
      t={t}
      multiOpGg={{ ok: true, url: "https://op.gg/multisearch" } as never}
      temporada="4ª Edição"
      periodo="de 13 de novembro a 6 de dezembro"
    />,
  );
}

function ficha(player: DesignPlayer = ROSTER[1]!) {
  return renderToStaticMarkup(
    <FichaDoJogadorComTema
      player={player}
      team={TIME}
      tema={TEMA_FAS_DE_ROSCA}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/fas-de-rosca-esporte-clube", texto: t.jogadorVoltar }}
    />,
  );
}

function enfeitesSemTexto(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const problemas: string[] = [];
  for (const el of doc.querySelectorAll("[class]")) {
    if (!/(^|\s|_)enf[A-Z]/.test(el.getAttribute("class") ?? "")) continue;
    if (!el.closest('[aria-hidden="true"]')) problemas.push(`${el.tagName} sem aria-hidden: ${el.getAttribute("class")}`);
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim()).join("");
    if (texto && !el.closest("svg")) problemas.push(`${el.tagName} com texto: ${texto}`);
  }
  for (const svg of doc.querySelectorAll("svg")) {
    if (!svg.closest('[aria-hidden="true"]')) problemas.push("svg sem aria-hidden");
  }
  return problemas;
}

function lidoPeloLeitor(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  for (const oculto of copia.querySelectorAll('[aria-hidden="true"]')) oculto.remove();
  return copia.textContent ?? "";
}

const SOFIA = METRICAS["sofia-extra-condensada"]!;

describe("registro: o tema dos Fãs de Rosca", () => {
  it("acha pelo slug; o id do draft (seiva) sozinho não tem tema", () => {
    expect(temaDoTime("fas-de-rosca-esporte-clube")).toBe(TEMA_FAS_DE_ROSCA);
    expect(temaDoTime("seiva")).toBeNull();
  });

  it("a cor do time no site é o rosa do glacê; sem o slug, a da SEIVA", () => {
    expect(corDoTime({ id: "seiva", slug: "fas-de-rosca-esporte-clube" })).toBe("#FFA3C8");
    expect(corDoTime({ id: "seiva", slug: "seiva" })).toBe("#8fc23f");
  });

  it("parte o nome pelo sufixo, em qualquer caixa: FÃS DE ROSCA grande, ESPORTE CLUBE embaixo", () => {
    expect(partesDoNome("FÃS DE ROSCA ESPORTE CLUBE", undefined, "ESPORTE CLUBE")).toEqual({
      assinatura: "ESPORTE CLUBE",
      marca: "FÃS DE ROSCA",
    });
    expect(partesDoNome("Fãs de Rosca Esporte Clube", undefined, "ESPORTE CLUBE")).toEqual({
      assinatura: "Esporte Clube",
      marca: "Fãs de Rosca",
    });
  });

  it("os textos do tema saem no idioma da página", () => {
    expect(textoDoTema(TEMA_FAS_DE_ROSCA, t, "capitao")).toBe("PERSONAL");
    expect(textoDoTema(TEMA_FAS_DE_ROSCA, MESSAGES.en.paginasHome, "estrelando")).toBe("PAID-UP MEMBERS");
    expect(textoDoTema(TEMA_FAS_DE_ROSCA, MESSAGES.en.paginasHome, "carimbo")).toBe("TÁ PAGO");
  });
});

describe("a largura medida da Sofia Sans Extra Condensed (lib/temas/metricas.ts)", () => {
  it("ROSCA = 2,219 em de avanço + 5 × 0,02 + 0,36 de tinta = 2,679 em; FÃS DE mede quase o mesmo", () => {
    expect(maiorPalavraEm("FÃS DE ROSCA", SOFIA)).toBe(2.679);
    expect(maiorPalavraEm("FÃS DE ROSCA", SOFIA)).toBe(2.679); // o acento decomposto vira um só
    expect(larguraEm("FÃS DE", SOFIA)).toBe(2.684);
  });

  it("caractere fora da tabela conta como o mais largo medido (nunca estoura)", () => {
    expect(larguraEm("ㅤ", SOFIA)).toBe(1.38); // 1 + 0,02 + 0,36
    expect(SOFIA.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(SOFIA.avancos)));
  });

  it("nick da ficha: até duas linhas, só entre palavras", () => {
    expect(larguraDoNickEm("Tapa de Doido", SOFIA)).toBe(3.185); // TAPA DE / DOIDO
    expect(larguraDoNickEm("vidotti agiota", SOFIA)).toBe(3.087); // VIDOTTI / AGIOTA
    expect(larguraDoNickEm("D1elzera", SOFIA)).toBe(3.775);
    expect(larguraDoNickEm("OmegaFuria", SOFIA)).toBe(4.847);
    expect(larguraDoNickEm("SaborEnergetico", SOFIA)).toBe(6.92); // uma palavra: nunca parte
  });

  it("a Knewave dos Galácticos continua igual; RX e Queijo Minas seguem sem métrica", () => {
    expect(maiorPalavraEm("Galácticos", METRICAS.knewave!)).toBe(5.86);
    expect(METRICAS[TEMA_EQUIPE_RX.fontes.titulo]).toBeUndefined();
    expect(METRICAS[TEMA_QUEIJO_MINAS.fontes.titulo]).toBeUndefined();
  });
});

describe("página temática dos Fãs de Rosca", () => {
  it("o leitor de tela lê o nome uma vez; as 10 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("FÃS DE ROSCA ESPORTE CLUBE");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(10);
    expect(visual.querySelectorAll('[class*="palavra"]')).toHaveLength(3);
    expect(visual.getAttribute("style")).toContain("--largura-em:2.679");
    expect(visual.textContent).toContain("ESPORTE CLUBE");
  });

  it("o elenco: TOP, MID, ADC, SUP e o personal (o capitão) por último, cada um no seu enquadramento", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    expect([...doc.querySelectorAll("li h3")].map((h) => h.textContent)).toEqual([
      "Tapa de Doido",
      "D1elzera",
      "OmegaFuria",
      "SaborEnergetico",
      "vidotti agiota",
    ]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:6.92");
    expect(paginaDoTime()).toContain("--foco:58% 22%");
  });

  it("os textos do tema aparecem; PERSONAL na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "SÓCIOS EM DIA",
      "PERSONAL",
      "Ninguém aqui pula dia de braço.",
      "Mensalidade atrasada? Acerta com o personal (ele cobra juros).",
      "Pós-treino: 5 roscas pra viagem.",
      "QUENTINHO DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "Contém glúten. E braço demais.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("PERSONAL");
    const carimbo = [...doc.querySelectorAll("p")].find((p) => p.textContent === "TÁ PAGO")!;
    expect(carimbo.getAttribute("lang")).toBe("pt-BR");
  });

  it("o cenário academia: fita na moldura, muro atrás do elenco, mancha no saco; retratos sem medalhão", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="fas-de-rosca-esporte-clube"');
    expect(html).toContain('data-cenario="academia"');
    expect(html).not.toContain("data-fotos");
    expect(html).toMatch(/enfFita/);
    expect(html).toMatch(/enfMuro/);
    expect(html).toMatch(/enfMancha/);
    expect(html).not.toMatch(/enfLousa|enfTela|enfCoroa|enfGrade|enfLua|enfTrilhos/);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(25);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("os outros temas não ganham nada da academia", () => {
  it.each([
    ["equipe-rx", TEMA_EQUIPE_RX, "EQUIPE RX"],
    ["queijo-minas", TEMA_QUEIJO_MINAS, "QUEIJO MINAS"],
    ["galacticos-do-bar", TEMA_GALACTICOS_DO_BAR, "Galácticos do Bar"],
  ] as const)("%s: sem fita, muro nem saco", (_slug, tema, nome) => {
    const html = paginaDoTime(tema, { ...TIME, name: nome, slug: tema.slug });
    expect(html).not.toMatch(/enfFita|enfMuro|enfMancha|enfMaos/);
  });
});

describe("ficha temática de um jogador dos Fãs de Rosca", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; PARCEIROS DE TREINO com os 4 outros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("vidotti agiota");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:3.087");
    expect([...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"))).toEqual([
      "/jogadores/tapa-de-doido",
      "/jogadores/d1elzera",
      "/jogadores/omegafuria",
      "/jogadores/saborenergetico",
    ]);
    expect(doc.body.textContent).toContain("PARCEIROS DE TREINO");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("entre os parceiros, o leitor de tela ouve quem é o capitão (o halter é só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/vidotti-agiota"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (as mãos de magnésio e o flash também)", () => {
    const html = ficha();
    expect(html).toMatch(/enfMaos/);
    expect(html).toMatch(/enfFlash/);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});
```

---

## Ajustes obrigatórios do juiz

> Vencem o spec onde os dois discordarem (28/10/2026). O parecer geral está em `..\juiz.md`.
> Veredito: **aprovado com poucos ajustes** — o spec mais maduro dos cinco (rodou no harness com a
> base real). Os ajustes abaixo são de integração e de desempenho; o desenho fica como está.

### J1. Dados finais (confirmados; a base comum já declarou assim)
- `cor: "#FFA3C8"` (rosa do glacê). Vizinho mais perto: Os 5 Furiosos `#E27CFE` a ΔE 18,8; GdB 26,3;
  10,6:1 no fundo do site. Nada a trocar no código do designer (a cor não mudou).
- Fontes: título `sofia-extra-condensada` = `Sofia_Sans_Extra_Condensed`, `weight: "900"`,
  `style: "italic"`, `subsets: ["latin"]`, `adjustFontFallback: false`,
  `fallback: ["Rosca Reserva Impact", "Rosca Reserva"]`; assinatura `kaushan` = `Kaushan_Script`,
  `weight: "400"`, `subsets: ["latin"]`. Os dois `@font-face` das reservas (Impact 63%, Arial 40%)
  moram no topo de `academia.module.css`, como no apêndice E.
- `sufixo: "ESPORTE CLUBE"`, `letraPorLetra: true`, `cenario: "academia"`.
- Cabeçalho do site (a base põe em `app/globals.css`): fundo `rgba(18, 14, 17, 0.95)` →
  `rgba(18, 14, 17, 0.84)` (o `breu` da parede), fio `rgba(255, 142, 195, 0.26)` (o glacê; amarelo
  não, porque a fita métrica amarela corre logo abaixo dele).

### J2. A base comum JÁ FEZ o apêndice A — não aplique `alteracoes.diff`
`tipos.ts`, `fontes-dos-temas.ts`, `registro.ts`, `cenarios/index.ts`, o stub, `link-da-carta` e o
esqueleto de `lib/temas/fas-de-rosca-esporte-clube.ts` já estão no branch. Do apêndice A você só leva:
1. a tabela `SOFIA_EXTRA_CONDENSADA` (com `padrao: 1`, `espacamento: 0.02`, `sobra: 0.36`) para o
   SEU bloco de `lib/temas/metricas.ts`, trocando o `undefined` (a fonte não mudou: vale a medida do
   designer — confira só que `maiorPalavraEm("FÃS DE ROSCA")` dá 2,679 no teste);
2. os nomes dos keyframes de entrada do conteúdo para o SEU bloco de `temas-sem-opacidade.test.ts`
   (a lista de 12 do spec; nenhum deles é renomeado em J3).
- Os 9 textos vão para `lib/i18n/messages/temas/fas-de-rosca-esporte-clube.ts` (o arquivo do time,
  `definir({ pt, en })`), NÃO para `paginas-home.ts`. As chaves `temaRosca…` ficam como estão.
- O teste novo é `tests/times/tema-fas-de-rosca-esporte-clube.test.tsx` (nome pelo slug; o
  conteúdo é o do apêndice G).

### J3. Nomes de @keyframes únicos (o teste junta todos num Map por nome)
Renomeie (declaração e uso): `faixaAbre` → `faixaAbreAcademia` (já existe no boteco),
`haloNasce` → `haloAcademia` (boteco e álbum), `lascaVoa` → `lascaVoaAcademia` (estande).
Antes do commit, `grep -rhoE "@keyframes +[A-Za-z0-9_-]+" components/times --include=*.module.css | sort | uniq -d`
tem de sair vazio (rode de novo depois de juntar: os outros 4 estão criando nomes agora).

### J4. Desempenho: menos laços no herói (o vídeo não mostra a diferença)
- **Corte `raiosRespiram`**: é uma camada do tamanho do palco variando 22% de opacidade em 9 s — não
  aparece num vídeo de 15 s e custa memória de compositor no celular. Os raios ficam acesos parados
  depois do `solNasce` (o mesmo `.enfRaios`, só sem o segundo nome na `animation`).
- **Poeira: 6 grãos no computador e 3 abaixo de 600** (hoje 10 e 5). Tire 4 linhas de `POEIRA`
  (fique com as de x 8%, 35%, 58%, 74%, 90% e 14%, que cobrem os três raios) e troque o
  `.enfPo:nth-child(n + 6)` de < 900 por `n + 4` em ≤ 599 (de 600 a 899 ficam os 6).
- Resultado: herói com 8 laços no computador (6 grãos, ponteiro, bíceps) e 5 no celular; mais o halo
  do capitão (base) no elenco e os 2 da base na ficha. Tudo transform/opacidade, sem `filter` nem
  blend animado.

### J5. Conferências que o implementador faz (no repo, não no harness)
- O harness rodou com dados de teste: refaça as medidas da seção 4.3 com o `leagueofbronze.json` de
  produção (as 12 larguras; o título «FÃS DE (escudo) ROSCA» inteiro dentro do herói e o escudo no
  vão em 1024, 1280, 1440 e 1920; empilhado abaixo de 1024).
- Fonte bloqueada (as duas reservas): o título nunca cortado, inclusive na faixa do computador, onde
  as duas metades dependem da largura medida (a reserva é mais estreita: as metades encolhem e o vão
  do escudo continua o mesmo).
- Movimento reduzido na FICHA também: a raiz da ficha leva o `.raiz` do `tema.module.css`, então o
  `.raiz *` da base já para tudo; confira que as mãos (0,26), o espelho, as placas e o pino ficam no
  estado final e que o flash some (o spec já esconde).
- Safari/iPhone: sem `translate3d`/`scale3d` em nada que tenha `background-clip: text` dentro (o
  título e o nick já obedecem; o `camNivela` 3D mora no palco, que não tem texto).
