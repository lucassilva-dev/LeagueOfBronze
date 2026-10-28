# OS 5 SEM PING — «A Call que Nunca Cai» (cenário `chamada`)

Especificação do tema do time OS 5 SEM PING (slug `os-5-sem-ping`, id interno `aurea`). Não editei nada no repositório. Li no worktree `C:\LeagueOfBronze-precos`:
- `lib/temas/*`;
- `components/times/*`, inclusive `cenarios/` (o `boteco` inteiro foi o modelo);
- `tests/times/*` e `tests/stubs/next-font-google.ts`;
- `lib/design.ts`, `lib/draft/times.ts`, `lib/roster.ts`, `app/globals.css`, `app/layout.tsx`;
- as chaves de `lib/i18n/messages/paginas-home.ts`;
- a prévia do dataset;
- as três especificações anteriores.

Também olhei o escudo (o recortado e o original) e as 5 fotos, e capturei os 3 temas em produção, que estão em `ref\`.

**O que foi verificado de verdade, e não só desenhado:**

| verificação | como | resultado |
|---|---|---|
| fontes existem e com quais pesos | `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json` | Lilita One `["400"]`, Sora `100–800 + variable`, ambas `latin` e `latin-ext` |
| largura da Lilita One | Chromium, canvas `measureText` a 100 px, woff2 do Google Fonts | tabela completa na seção 3.1; **tem kerning** (precisa de `font-kerning: none`) |
| reserva mais estreita | Arial e Arial Bold medidas contra a Lilita, caractere por caractere | Arial Bold a **70%** é mais estreita em todo caractere (o pior é o L: 1,404×, que a 70% vira 0,983×) |
| contraste (WCAG) | script próprio | todos os textos ≥ 7,7:1; tabela na seção 9 |
| ΔE2000 da cor do time | script próprio, conferido contra os números da GdB (16,6 / 27,5 / 44,2… batem) | **#3DFF8F**: ≥ 18,5 de todas as cores de time de hoje |
| pontos do escudo | `sharp` no webp de 640 px + grade de 5% | óculos, língua, origem do Wi-Fi e letreiro medidos (seção 4.3) |
| enquadramento das fotos | recortes `cover` gerados em 4:5, 3:2, 4:3 e 1:1 | foco por jogador (seção 3.7) |
| composição | maquete estática em HTML (pôster final) com escudo, fotos e fontes reais, medida no Chromium em 12 janelas | zero estouro horizontal de 320 a 1920; título na 1ª dobra em todas; a janela da call inteira cabe em 1440×810 |

**Onde estão os arquivos** (tudo em `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\os-5-sem-ping\`):

| o quê | arquivo |
|---|---|
| maquete da página (pôster final) | `lab\maquete.html` |
| maquete da ficha | `lab\ficha.html` (com `?j=goom-gum` e outros slugs) |
| quadros do vídeo | `lab\m5-1440x810.png` e `lab\m5-405x720.png` |
| as 12 janelas medidas | `lab\m5-<largura>x<altura>.png` |
| elenco e cartela | `lab\m3-1440-baixo.png` e `lab\m3-390-baixo.png` |
| ficha | `lab\f-giripoca-1440.png` e `lab\f-goom-gum-390.png` |
| recortes das fotos | `lab\recortes.png` |
| escudo com grade de 5% | `lab\escudo-grade.png` |
| fontes comparadas | `lab\fontes.png` |
| medidas da Lilita | `lab\lilita-medidas.json` |
| scripts para medir de novo | `lab\medir-maquete.cjs`, `lab\medir-fonte.cjs`, `lab\cores.cjs`, `lab\pixel.cjs`, `lab\recortes.cjs` |
| prints dos 3 temas no ar | `ref\` |

**Antes de implementar (dados, no painel):**
- O time já está no site como OS 5 SEM PING, com slug `os-5-sem-ping` e id `aurea`, e as fotos estão em `public/players/<slug>-4a.webp` (commit 1266ffa).
- Elenco, na ordem da página (rotas pela base; o capitão vai por último): **GOOM GUM** (TOP), **Nikiti** (JUNG/SEL), **N4firida agiota** (MID), **Miva** (SUP) e **Giripoca** (ADC, capitão).
- O nick no banco é `N4firida  agiota`, com DOIS espaços. As métricas partem por `\s+` e o HTML colapsa o espaço, então funciona. Se quiser, dá para normalizar no painel.
- **Fotos usadas como vieram**: nenhum recorte tira ninguém de cena. O foco só enquadra o rosto, como o Lucas pediu hoje («deixa os dois juntos e de zoera, depois vamos mudar»).

---

## 1. Conceito em uma linha, e o porquê

**«A Call que Nunca Cai»: a call de madrugada do time, todo mundo de câmera ligada. A entrada TRAVA de propósito (999 ms, rodinha, o escudo pulando), conecta em 0 ms e o poro bota os óculos pixelados («deal with it»). O sinal do escudo continua num leque de Wi-Fi gigante.**

**De onde vem cada coisa:**
- **Do escudo:**
  - o poro de óculos escuros e língua de fora é a atitude: de boa, zoeiro, o "deal with it";
  - o Wi-Fi de três arcos em cima é o sinal cheio;
  - o contorno azul-elétrico fica só no escudo, de propósito (ver por que não é a RX, abaixo).
- **Do nome:** "sem ping" é zero de lag. O avesso é a piada que todo mundo do grupo já viveu: 999 ms, "caiu a net", a rodinha que não sai. A página faz as duas coisas: trava e depois fica perfeita.
- **Das fotos:** são cinco fotos REAIS de celular (Giripoca na selfie com a mão no queixo, GOOM GUM de pernas para cima na piscina de bolinhas, Miva no letreiro do Rock in Rio, N4firida de blazer na escada, Nikiti de chapéu de palha tomando chope). É exatamente o que aparece numa call com a câmera ligada: cada um no seu rolê. **As fotos viram as câmeras da call.** É o único conceito em que essas cinco fotos fazem sentido juntas, sem precisar de moldura de época, medalhão ou sépia.
- **O "5" do nome** são as 5 barras de sinal: uma por jogador. Elas aparecem no selo "OS 5", no status da call e no rodapé das cartas.

**Por que não é nenhum dos outros sete:**

| | RX | QM | GdB | **Os 5 Sem Ping** |
|---|---|---|---|---|
| Mundo | tempestade ao ar livre | serra à noite | dentro do bar | **dentro de uma call** (interface, não lugar) |
| Paleta | azul-elétrico e cromo | marinho, ouro de queijo e ciano | âmbar e royal | **verde do sinal + menta + rosa da língua do poro**, sobre um preto esverdeado |
| Título | Exo 2 itálico, cromo | Bungee, ouro com bisel | Knewave enchendo de chope | **Lilita One**, adesivo de gel verde com contorno branco e escuro (o mesmo do letreiro do escudo) |
| Assinatura | Permanent Marker | Special Elite | Kalam (giz) | **Sora**: a fonte de interface do app |
| Herói | texto à esquerda | escudo à esquerda | eixo único com tríptico | **a janela da call** emoldura o herói inteiro; **diagonal**: escudo e leque no alto à direita, nome embaixo à esquerda como legenda de câmera, controles da call embaixo |
| Entrada | cai, chão treme | chega, freia | brinde | **trava e conecta** (degraus, fantasmas, contagem de ping) |
| Elenco | créditos | trem | bolachas na lousa | **galeria da call**: cinco câmeras |
| Capitão | coroa | roda alada | caneco coroado | **óculos pixelados** («ADM DA CALL») |
| Cartela | em cartaz | bilhete | TV do bar | **chamada encerrada**: ★★★★★ e adesivo «999 ms? Nunca nem vi.» |

Os outros quatro novos:
- **Fãs de Rosca:** academia, rosca, ouro e laranja.
- **Os 5 Furiosos:** e-sports, telão e skins. Lá é arena de palco, aqui é a call caseira.
- **So ADC Bronze Clube:** brasão de bronze e marinho.
- **Desorganização:** leão, preto e dourado.

Nenhum deles é verde, nenhum é interface e nenhum usa o gesto "travar e conectar".

---

## 2. Os três conceitos considerados

**A) «A Call que Nunca Cai» (cenário `chamada`): ESCOLHIDO.** É a call de madrugada:
- a janela da câmera do anfitrião (o poro) com o anel verde de quem está falando;
- o status com ping, rodinha e barras;
- os controles (microfone, câmera, compartilhar, botão vermelho de desligar);
- o leque de Wi-Fi continuando o sinal do escudo;
- o elenco como galeria de câmeras, e a cartela como "chamada encerrada".

**B) «Na Nuvem» (cenário `nuvem`).** De dia, acima das nuvens: nuvens que são poros (brancas e peludas), o leque de Wi-Fi como arco-íris, o escudo subindo como "upload" e as fotos como "backup na nuvem" com barras de envio.
- **A favor:** seria o único tema claro do site inteiro.
- **Contra:**
  - é o terceiro céu (RX e QM já têm);
  - a piada é fraca: "upload" não é "ping", e as fotos não têm motivo para estar na nuvem;
  - página clara exige inverter o contraste de TODAS as peças da base, que foi desenhada para fundo escuro, e destoa do cabeçalho e do rodapé escuros do site;
  - fundo claro com brilho "de cinema" vira página de SaaS, e o pedido é "nada corporativo".

**C) «A Lan do Bairro» (cenário `lanhouse`).** A lan house de 2006 à noite: lâmpadas fluorescentes, monitores CRT, cadeira de plástico, faixa «INTERNET BANDA LARGA», as 5 máquinas, a comanda da lan com «TEMPO RESTANTE» e o «caiu a net, tio!».
- **A favor:** muita alma e nostalgia do grupo.
- **Contra:**
  - é o segundo interior noturno (o bar da GdB já é);
  - monitor ligando é o gesto da TV da GdB;
  - telas e computadores encostam no e-sports dos Furiosos;
  - é o mais caro: móveis, monitores e cadeiras em SVG;
  - para parte do grupo, "lan house" lembra internet RUIM, o contrário do nome.

| | distinção dos outros 7 | rende no vídeo | custo para fazer bem | nota |
|---|---|---|---|---|
| **A) Call** | total: mundo de interface, verde e rosa, gesto próprio | trava → conecta → óculos caem (3 s com piada e clímax) | baixo a médio: CSS e uns 12 SVGs pequenos; **nenhuma mudança na estrutura** da página | **9** |
| B) Nuvem | paleta única, mas é o 3º céu | bonito, pouco engraçado | médio a alto: inverter contraste de tudo | 6 |
| C) Lan | lugar novo, mas interior noturno e telas | engraçado, mas com o gesto da TV da GdB | alto | 7 |

**O que foi recusado de propósito, e por quê:**
- **título "techno itálico" como o letreiro do escudo:** é o mesmo gênero da Exo 2 da RX, e a página ia parecer RX;
- **paleta azul:** RX, QM e GdB já são azuis (#4DA3FF, #3EE6F2, #B4C2FF). O azul fica no escudo;
- **anel girando em volta do escudo** como "rodinha de carregamento": é o `enfArco` da RX. A rodinha daqui é pequena e mora no status;
- **anéis de choque se expandindo:** são as `enfOnda` da RX. O leque daqui acende arco por arco, como o ícone de Wi-Fi procurando sinal;
- **brilho periódico nas lentes:** é o "pato dá aquela olhada" da GdB. Aqui há UM brilho, só quando os óculos pousam;
- **letreiro de neon, TV ligando, "AO VIVO":** são da GdB;
- **mosaico ou pixelado por cima do escudo para "travar":** cobriria conteúdo no quadro 0. Quem trava é o movimento, não um véu;
- **fonte "glitch" no título:** o time é SEM ping, então o nome em repouso tem de estar limpo;
- **pings do mapa do LoL ("?", "!") e o dinossauro do Chrome:** são desenho da Riot e do Google;
- **cara de MSN, Discord, Zoom ou Meet:** a call é genérica, desenho nosso. Nada de borboleta, roxo-Discord ou logo.

---

## 3. Tema (dados)

### 3.1 Fontes (conferidas no `font-data.json` do Next instalado)

- **Título e nicks: `Lilita One`.**
  - `weights ["400"]`, `styles ["normal"]`, subsets `latin` e `latin-ext` (acentos completos: Ã, Ç, É, Õ…).
  - **Por quê:** é o traço gordinho e arredondado de jogo casual de celular. O poro é redondo e fofo, e com contorno branco e escuro vira o mesmo "adesivo" do letreiro do escudo, sem ser o gênero techno da RX.
  - É condensada o bastante para "N4FIRIDA AGIOTA" e "GIRIPOCA" caberem grandes nas cartas.
  - Só tem 400. Por isso o `.raiz` declara `--tm-titulo-peso: 400`, `--tm-titulo-peso-medio: 400`, `--tm-titulo-estilo: normal` e `font-synthesis: none` (como a GdB).
- **Assinatura e interface: `Sora`.**
  - `weights 100–800 + variable`, subsets `latin` e `latin-ext`; carregar a variável, sem `weight`.
  - Usos: 800 no selo «OS 5»; 700 nos chips, etiquetas, «FICHA →» e placa; 600 no kicker e no nome real; 500 no lema, aviso e fecho.
  - **Por quê:** é uma fonte geométrica de interface de app. O texto miúdo da página inteira passa a "falar app de call" (a base herda a Chakra Petch do site).
  - O `.raiz` do cenário declara `font-family: var(--tm-fonte-assinatura), system-ui, sans-serif`, e tudo que é texto de interface herda.
- **Monoespaçada só em duas peças:** a contagem de ping do status e a linha de terminal da cartela usam a pilha do SISTEMA (`ui-monospace, "Cascadia Mono", Consolas, "SF Mono", Menlo, "Roboto Mono", monospace`). Nada baixa (CSP `font-src 'self'`), e o "Consolas" é o próprio cmd do Windows onde todo mundo já rodou `ping`.

**A largura MEDIDA da Lilita One** (Chromium, `measureText` a 100 px, woff2 do Google Fonts, 27/10/2026), para `lib/temas/metricas.ts`:
- **Tem kerning:**
  - AGIOTA: 3,558 sem e 3,533 com;
  - MIVA: 2,652 sem e 2,612 com;
  - pares AV −0,04, PA −0,06 e LT −0,035.

  Por isso o título, os nicks e o número dos chips declaram `font-kerning: none` e `font-variant-ligatures: none`. Sem kerning, a soma das letras dá a palavra exata (SEM PING = 4,387 pelos dois caminhos).
- **Tinta além do avanço:** no máximo 0,025 em (Y). Vertical:
  - Á sobe a 0,91 em da linha de base;
  - altura das maiúsculas 0,70; ascendente 0,92; descendente 0,22; Q desce 0,18.
- **`sobra` = 0,32 em:** 2 × (0,05 da metade do traço branco + 0,065 do anel escuro) + 0,025 de tinta de cada lado + folga. É o que o contorno do adesivo come.
- **`espacamento` = 0,01 em** (o `letter-spacing` do título e do nick).
- **`padrao` = 1:** o caractere mais largo medido é o W, com 0,953. O ㅤ e o CJK dos nicks caem na reserva a 1,0.

```ts
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
  padrao: 1,
  espacamento: 0.01,
  sobra: 0.32,
};
export const METRICAS = { knewave: KNEWAVE, "lilita-one": LILITA_ONE };
```

**Valores que saem (viram teste):**

| texto | função | valor |
|---|---|---|
| `SEM PING` (a marca) | `maiorPalavraEm` | **2,628** (PING; SEM = 2,281) |
| `ㅤ` | `larguraEm` | 1,33 |
| `Giripoca` | `larguraDoNickEm` / maior palavra | **4,951** (1 palavra) |
| `N4firida  agiota` | `larguraDoNickEm` | **4,837**: N4FIRIDA / AGIOTA em 2 linhas (1 linha daria 8,653; 4,837 / 8,653 = 0,559 < 0,62) |
| `GOOM GUM` | `larguraDoNickEm` | **3,28**: GOOM / GUM em 2 linhas (5,664 numa só; 0,579 < 0,62) |
| `Nikiti` / `Miva` | `larguraDoNickEm` | 3,437 / 3,012 |
| elenco | `--maior-palavra-em` | **4,951** (GIRIPOCA) |

**A reserva mais estreita** (enquanto a Lilita carrega ou se falhar), com o mesmo esquema da «Knewave Caixa Alta»:
- Medida caractere por caractere, a Arial Bold é até 1,404× mais larga que a Lilita (o pior é o L) e a Arial regular até 1,370× (o "1").
- A 70%, a Arial Bold fica ≤ 0,983× em TODO caractere, então a largura medida vale para as duas e o título nunca sai cortado.
- Declarar em `cenarios/chamada.module.css`:

```css
@font-face {
  font-family: "Lilita Caixa Alta";
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Helvetica Bold"), local("Helvetica-Bold"),
    local("Liberation Sans Bold"), local("LiberationSans-Bold"), local("Arimo Bold"), local("Arimo-Bold"),
    local("Roboto Bold"), local("Roboto-Bold");
  font-weight: 400;
  size-adjust: 70%;
}
```

**`components/times/fontes-dos-temas.ts`** (acrescentar):

```ts
import { Bungee, Exo_2, Kalam, Knewave, Lilita_One, Permanent_Marker, Sora, Special_Elite } from "next/font/google";

// Os 5 Sem Ping: o título gordinho de jogo casual (o poro é redondo) e a fonte de interface da call.
// A reserva é uma Arial Bold a 70% (@font-face em cenarios/chamada.module.css): mais estreita que a
// Lilita em todo caractere (o pior, o L, dá 1,404×; a 70%, 0,983×).
const lilitaOne = Lilita_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--tm-fonte-titulo",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Lilita Caixa Alta"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--tm-fonte-assinatura",
  display: "swap",
  preload: false,
});
// …e no mapa: "lilita-one": lilitaOne, sora,
```

Outras mudanças necessárias:
- **`lib/temas/tipos.ts`:** `ChaveDeFonte` ganha `"lilita-one" | "sora"`, e `Cenario` ganha `"chamada"`.
- **`tests/stubs/next-font-google.ts`:** acrescentar `export const Lilita_One = fonte;` e `export const Sora = fonte;`. **Sem isso todo teste que importa a página quebra.**

### 3.2 Cores (`cores` → `--tm-*`)

| token | hex | papel | contraste |
|---|---|---|---|
| `breu` | `#040907` | preto esverdeado: fundo base, véu das fotos | — |
| `ceu` | `#08130E` | meio do palco | — |
| `abismo` | `#0C1C15` | miolo das cartas, fundo das fotos vazias ("câmera desligada") | texto 17,2 |
| `royal` | `#0F6A3C` | verde fundo: hover dos botões, poças de luz | texto 6,5 |
| `primaria` | `#3DFF8F` | **o verde do sinal**: anel de quem fala, arcos, bordas, placa do capitão. Nunca texto pequeno | tinta sobre ele 14,3 |
| `neon` | `#7DFFB5` | texto verde pequeno: «0 ms», «FICHA →», «PERFORMANCE», linha de terminal | 16,1 no breu · 15,2 na janela · 16,3 no terminal |
| `arco` | `#B9FFDA` | anel de foco | 17,5 / 16,6 / 15,4 (breu, janela, abismo) |
| `nucleo` | `#F0FFF7` | brilho do ✦, ponto de luz | — |
| `texto` | `#F3FFF8` | texto principal, nick na pílula | 19,5 no breu · 9,5 na pílula do nick sobre foto BRANCA (pior caso) |
| `prata` | `#D2E6DA` | nome real, lema | 13,5 no abismo · 14,5 na janela |
| `apoio` | `#93B3A3` | kicker, créditos, aviso, fecho, rótulos | 8,8 no breu · 8,3 na janela · 7,7 no abismo |
| `acento` | `#FF8DB4` | **o rosa da língua do poro**: «APRESENTA», selo «OS 5», adesivo da cartela | 9,3 no breu · 9,1 no vidro |
| `tinta` | `#03140B` | texto sobre verde e placas claras | 14,3 no verde · 15,0 na placa · 18,5 na luz |
| `icone` | `#8FF5C0` | ícone de rota | 15,3 no breu · 7,7 no vidro sobre foto branca |

**Cores só do cenário** (variáveis no `.raiz` de `chamada.module.css`):

| variável | valor | uso |
|---|---|---|
| `--contorno` | `#021A0C` | anel escuro do adesivo do título e do nick |
| `--menta` | `#CFFFE5` | núcleo dos arcos, contorno dos óculos pixelados |
| `--vidro` | `rgba(5, 14, 10, 0.78)` | pílulas de interface: voltar, status, etiqueta de rota, chip do capitão, selo |
| `--borda` | `rgba(61, 255, 143, 0.24)` | fio das pílulas e da janela |
| `--rosa` | `#FF5FA2` | luz de recorte rosa atrás do escudo (só gradiente) |
| `--desliga` | `#E5323F` | botão vermelho de desligar (ícone branco 4,3:1, não-texto) |
| `--ping-ruim` | `#FF5A68` | «999 ms» (6,5:1 no vidro) |
| `--ping-medio` | `#FFC247` | ping caindo (12,2:1) |
| `--terminal` | `#020604` | faixa de terminal da cartela |
| `--adesivo` | `#2A0612` | texto do adesivo rosa (8,6:1 no `#FF8DB4`) |

### 3.3 Metal (o título é GEL de ícone de app, não metal)

A estrutura é a de `MetalDoTema`, sem a quebra de bisel da RX. O gradiente do título é próprio (seção 6), e as chaves alimentam o que a base usa: placas, chip de pontos, nick da ficha e moldura da carta do capitão.

| luz | alto | meio | sombra | fundo | volta | base | placa |
|---|---|---|---|---|---|---|---|
| `#F4FFF9` | `#C2FFDF` | `#49F59B` | `#0D7A40` | `#16A957` | `#7BF7B4` | `#0A5E30` | `#9BF8C8` |

### 3.4 Cor do time no resto do site: **`#3DFF8F`** (o verde do sinal bom)

Tem 14,8:1 sobre o `#0f0b07` do site.

| outra cor | ΔE2000 |
|---|---|
| EQUIPE RX (tema) `#4DA3FF` | 54,2 |
| QUEIJO MINAS (tema) `#3EE6F2` | 30,2 |
| GALÁCTICOS (tema) `#B4C2FF` | 46,4 |
| CHAMA (Desorganização hoje) `#ef7d34` | 61,8 |
| VERDANTE (draft) `#3fb27f` | 19,6 |
| ARCANA (draft) `#9a6ae0` | 59,7 |
| SEIVA (draft) `#8fc23f` | 18,5 |
| ÁUREA (a nossa hoje) `#e0b13c` | 38,0 |
| *palpites para os 4 novos:* ouro `#E8B83A` / laranja `#FFB347` / bronze `#D08A4E` / roxo `#B57CFF` / vermelho `#FF5A6E` | 37,6 / 45,4 / 51,3 / 57,6 / 83,5 |

- **Por que verde:**
  - os quatro escudos novos são ouro e laranja (Rosca), arena azul, vermelha e roxa (Furiosos), bronze e marinho (So ADC) e preto e dourado (Desorganização);
  - o azul já tem três donos;
  - verde é o "online", o "ping bom", a barrinha cheia.
- **Atenção:** a cor de ELO "Esmeralda" (`#2ecc71`) fica a ΔE 11,5. Não é cor de time, então não há regra, mas vale o Lucas saber.

### 3.5 Nome, letras, cenário

- **`prefixo: "OS 5"`.**
  - `partesDoNome("OS 5 SEM PING", "OS 5")` dá `{ assinatura: "OS 5", marca: "SEM PING" }`.
  - Em caixa mista, `"Os 5 Sem Ping"` dá `"Os 5"` + `"Sem Ping"` (o CSS põe em maiúsculas).
  - A marca é "SEM PING" grande; "OS 5" vira o selo com as 5 barras de sinal, POR CIMA da marca (CSS `order: -1`; o DOM não muda).
- **`letraPorLetra: true`.** Cada letra é um PACOTE que chega fora de ordem (seção 6). São 7 letras.
- **`cenario: "chamada"`.** Chave nova; o componente é `components/times/cenarios/chamada.tsx`.

### 3.6 Textos (`lib/i18n/messages/paginas-home.ts`, depois das chaves da GdB, em pt e en)

| papel | chave | pt | en |
|---|---|---|---|
| `lema` | `temaSemPingLema` | Câmera ligada, microfone aberto, ping zero. | Cameras on, mics open, zero ping. |
| `estrelando` | `temaSemPingCameras` | CÂMERAS LIGADAS | CAMERAS ON |
| `aviso` | `temaSemPingAviso` | Ninguém travou. Ainda. | Nobody's frozen. Yet. |
| `capitao` | `temaSemPingCapitao` | ADM DA CALL | CALL ADMIN |
| `emCartaz` | `temaSemPingConectados` | CONECTADOS {periodo} | ONLINE {periodo} |
| `destino` | `temaSemPingEncerrada` | Chamada encerrada · quedas: 0 · ping médio: 0 ms | Call ended · drops: 0 · average ping: 0 ms |
| `carimbo` | `temaSemPingNuncaNemVi` | 999 ms? Nunca nem vi. | 999 ms? Nunca nem vi. (fica em pt: a página marca `lang="pt-BR"`, como o FIADO da GdB) |
| `fecho` | `temaSemPingFecho` | Travou? Tira da tomada e conta até dez. | Lagging? Unplug it and count to ten. |
| `companheiros` | `temaSemPingMesmaCall` | NA MESMA CALL | IN THE SAME CALL |

O que sai na tela:
- cartela em pt: «4ª EDIÇÃO · CONECTADOS DE 13 DE NOVEMBRO A 6 DE DEZEMBRO»;
- em en: «4TH EDITION · ONLINE FROM NOVEMBER 13 TO DECEMBER 6»;
- «ADM DA CALL» é aria-hidden; o leitor de tela ouve «CAPITÃO» (`RotuloDoCapitao` da base).

### 3.7 Fotos (retratos de celular, NÃO medalhão)

- Sem `formato`: as fotos preenchem a moldura (`object-fit: cover`, como RX e QM).
- `focoPadrao: "50% 30%"`.
- Todas as fotos são estreitas (largura < 4/5 da altura), menos a do GOOM GUM. Por isso o x quase nunca importa: o corte 4:5 pega a largura toda.

| jogador | arquivo (px) | o que tem | `foco` | conferido em `lab\recortes.png` |
|---|---|---|---|---|
| GOOM GUM | 1600×1593 (quadrada) | pernas para cima, tênis verdes, bolinhas rosa, letreiro amarelo espelhado | `50% 50%` | 4:5 pega os dois tênis e as almofadas; 1:1 inteira |
| Nikiti | 1200×1600 | chapéu de palha, óculos, copo de chope na boca | `50% 52%` | do chapéu ao copo em todos os cortes |
| N4firida agiota | 900×1600 | selfie inclinada de blazer, rosto à direita, escada com corrimão dourado | `50% 47%` | rosto inteiro em 4:5, 4:3 e 1:1 |
| Miva | 1200×1600 | corpo inteiro, letreiro do Rock in Rio atrás | `50% 50%` | letreiro + ela em 4:5 e 4:3; em 1:1 o rosto fica pequeno (é foto de corpo inteiro) |
| Giripoca (capitão) | 984×1600 | selfie, mão no queixo, janela azul atrás | `50% 25%` | 4:5 do cabelo à mão; **3:2 (a carta deitada do capitão no celular)**: do topo da testa ao queixo |

- **`proporcao: { "goom-gum": "1 / 1" }`.** A foto é quadrada, então na ficha sai INTEIRA, com a piscina toda, inclusive de 600 a 899, onde o padrão seria 4:3.
- Os outros ficam no 4:5 da base.

### 3.8 `lib/temas/os-5-sem-ping.ts` (novo)

```ts
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * OS 5 SEM PING — «A Call que Nunca Cai» (27/10/2026).
 *
 * Do escudo: o poro de óculos escuros e língua de fora, o Wi-Fi de três arcos em cima, o contorno
 * azul-elétrico. Do nome: "sem ping" é zero de lag — e o avesso, 999 ms, "caiu a net". Das fotos:
 * cinco fotos de celular da vida real, que viram as câmeras ligadas de uma call. A página é a call
 * de madrugada do time: a entrada TRAVA de propósito (999 ms, rodinha, o escudo pulando), conecta
 * em 0 ms e o poro bota os óculos pixelados. O verde é o do sinal bom; o azul fica só no escudo.
 */
export const TEMA_OS_5_SEM_PING: TemaDoTime = {
  slug: "os-5-sem-ping",
  fontes: { titulo: "lilita-one", assinatura: "sora" },
  cores: {
    breu: "#040907",
    ceu: "#08130E",
    abismo: "#0C1C15",
    royal: "#0F6A3C",
    primaria: "#3DFF8F",
    neon: "#7DFFB5",
    arco: "#B9FFDA",
    nucleo: "#F0FFF7",
    texto: "#F3FFF8",
    prata: "#D2E6DA",
    apoio: "#93B3A3",
    acento: "#FF8DB4",
    tinta: "#03140B",
    icone: "#8FF5C0",
  },
  // O "metal" é o gel de ícone de app: menta no alto, o verde do sinal, verde fundo; sem bisel.
  metal: {
    luz: "#F4FFF9",
    alto: "#C2FFDF",
    meio: "#49F59B",
    sombra: "#0D7A40",
    fundo: "#16A957",
    volta: "#7BF7B4",
    base: "#0A5E30",
    placa: "#9BF8C8",
  },
  prefixo: "OS 5",
  letraPorLetra: true,
  // O verde do sinal bom: ≥ 18,5 de ΔE para as outras sete cores de time (14,8:1 no fundo do site).
  cor: "#3DFF8F",
  cenario: "chamada",
  textos: {
    lema: "temaSemPingLema",
    estrelando: "temaSemPingCameras",
    aviso: "temaSemPingAviso",
    capitao: "temaSemPingCapitao",
    emCartaz: "temaSemPingConectados",
    destino: "temaSemPingEncerrada",
    carimbo: "temaSemPingNuncaNemVi",
    fecho: "temaSemPingFecho",
    companheiros: "temaSemPingMesmaCall",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      "goom-gum": "50% 50%",
      nikiti: "50% 52%",
      "n4firida-agiota": "50% 47%",
      miva: "50% 50%",
      giripoca: "50% 25%",
    },
    // A foto do GOOM GUM é quadrada (1600×1593): na ficha sai inteira, com a piscina toda.
    proporcao: { "goom-gum": "1 / 1" },
  },
};
```

Outros arquivos:
- **`lib/temas/registro.ts`:** `TEMAS = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR, TEMA_OS_5_SEM_PING]`.
- **`components/times/cenarios/index.ts`:** `chamada: CHAMADA`.

**A estrutura da página e da ficha NÃO muda.** Tudo entra por peças e ganchos. É uma generalização mínima: tipos, fontes, métricas, registro, índice e textos.

---

## 4. A cena do herói

### 4.1 Composição

**O herói inteiro é a câmera do anfitrião:** uma janela de call com cantos redondos e o anel verde de quem está falando. Dentro dela:
- no alto, à esquerda, o «VOLTAR» da base (vira pílula);
- no alto, à direita, o status (rodinha ou ✓, contagem de ping, 5 barras);
- embaixo, no centro, os controles (microfone, câmera, compartilhar tela e o botão vermelho de desligar).

O conteúdo fica entre eles.

| faixa | arranjo |
|---|---|
| **≥ 1024** | **Diagonal.** Grade de 2 colunas (`minmax(0, 1.12fr) minmax(0, 0.88fr)`). O escudo fica na coluna 2, colado no ALTO (`align-self: start`), com o leque abrindo para cima. O texto fica na coluna 1, colado EMBAIXO (`align-self: end`), como a legenda de nome de uma câmera. O herói tem a altura da tela (`100svh` menos o cabeçalho), e a janela inteira (controles inclusive) cabe na 1ª dobra de 1366×768 a 1920×1080. |
| **600–1023** | Uma coluna. O escudo vai à DIREITA (`justify-self: end`, recuo de 4% à direita), com o leque; a legenda vai embaixo, alinhada à ESQUERDA. É a diagonal em pé. |
| **≤ 599** | Uma coluna. O escudo fica CENTRADO (não há espaço para diagonal) e a legenda embaixo, alinhada à esquerda (kicker, selo, SEM / PING, lema, chips). Não há créditos: a base esconde `.nomesDoElenco` abaixo de 600. |

É a única página temática com o texto do herói SEMPRE alinhado à esquerda, inclusive no celular.

**A janela em telas largas:** de lado ela fica em `max(clamp(8px, 1.6vw, 22px), calc(50% - 680px))`. Em 1920 isso dá uma janela de 1360 px centrada, com o fundo da call aparecendo dos lados; até ~1400 fica de ponta a ponta.

### 4.2 Camadas, de trás para frente (cada peça do `CenarioDoTema`)

| # | peça | elemento (classe) | o que desenha | onde |
|---|---|---|---|---|
| 1 | `Fundo` | `enfParede` | preto esverdeado com duas luzes: verde `rgba(61,255,143,.10)` em `40% 40% at 72% 26%` (celular: `50% 24%`) e rosa `rgba(255,95,162,.07)` em `34% 30% at 10% 82%`; vertical `#050B08` → `ceu` (45%) → `#061009` (75%) → `breu` | o palco inteiro (sticky) |
| 2 | `Fundo` | `enfDesfocadas` > 7 × `enfCamDesfocada` | **as outras câmeras da call, fora de foco:** retângulos 4:5, raio 22, `rgba(22,46,35,.26)` com `box-shadow: 0 0 34px 18px` da mesma cor (borda macia, SEM `filter: blur`). Duas são `enfCamFalando`, com anel de 2 px `rgba(61,255,143,.12)`. O conjunto deriva devagar (seção 5) | posições (x, y, largura): (2%, 14%, 11vw), (88%, 10%, 10vw, fala), (6%, 62%, 12vw), (86%, 58%, 11vw), (24%, 86%, 10vw, fala), (64%, 82%, 12vw), (44%, 4%, 9vw). Abaixo de 600 só as 4 primeiras, com 26vw |
| 3 | base | `enfVinheta`, `enfGrao` | como estão | — |
| 4 | `Moldura` | `enfJanela` | **a janela da câmera:** `inset: 10px var(--janela-x)`, raio `clamp(18px, 2vw, 28px)`. Fundo: `radial-gradient(60% 55% at 72% 30%, rgba(61,255,143,.09), transparent 70%)` (celular: `at 50% 24%`) sobre um vertical `rgba(7,19,14,.94)` → `rgba(4,11,8,.92)` 60% → `rgba(4,10,7,.95)`. Fio `inset 0 0 0 1px var(--borda)`, luz de vidro `inset 0 1px 0 rgba(255,255,255,.05)` e sombra `0 30px 80px -30px #000`. É opaca de propósito: as telas desfocadas aparecem só em volta | herói e ficha; z-index 0 |
| 5 | `Moldura` | `enfFala` | **o anel de quem fala:** mesma caixa, `box-shadow: inset 0 0 0 3px var(--tm-primaria), inset 0 0 24px rgba(61,255,143,.22), 0 0 22px rgba(61,255,143,.24)`. Opacidade de repouso 0,85 | z-index 0, ATRÁS do conteúdo (o brilho interno nunca passa por cima do texto) |
| 6 | `AtrasDoEscudo` | `enfHalo` | luz verde atrás do escudo: 190% do escudo, centro em `50% 46%`, `radial-gradient(closest-side, rgba(61,255,143,.20), rgba(61,255,143,.05) 55%, transparent 72%)` | z 0 |
| 7 | `AtrasDoEscudo` | `enfLuzRosa` | luz de recorte rosa por baixo e à esquerda: 90% do escudo em `left: -28%; top: 38%`, `radial-gradient(closest-side, rgba(255,95,162,.16), transparent 72%)` | z 0 |
| 8 | `AtrasDoEscudo` | `enfLeque` (SVG) | **o leque de Wi-Fi:** 4 arcos concêntricos com o Wi-Fi DO ESCUDO, continuando o sinal para fora (desenho na 4.3) | origem em `50% 30%` do escudo; largura 1,9E; abaixo de 600 sem o 4º arco |
| 9 | `Chao` | `enfFantasmas` > `enfFantasma1`, `enfFantasma2` | **os fantasmas do lag:** duas cópias do escudo (o `imagem` que a base passa), tingidas de verde (`filter: grayscale(1) sepia(1) hue-rotate(85deg) saturate(2.4) brightness(1.15)`, ESTÁTICO), paradas nas posições por onde o escudo "passou" | z 1 (atrás do `.escudo`, que é z 2). Abaixo de 600, só o 1 |
| 10 | base | `.escudo` | o escudo, com a entrada `travaEscudo` | z 2 |
| 11 | `NoEscudo` | `enfOculos` (SVG) | **os óculos pixelados** «deal with it», centrados nos óculos do poro | `left: 51%; top: 38.5%; width: 52%; translate: -50% -50%; rotate: -3deg` |
| 12 | `NoEscudo` | `enfBrilhoLente` | estrela de 4 pontas (✦) de 9% do escudo, no alto da lente direita | `left: 64%; top: 35%` |
| 13 | conteúdo | `.blocoTexto` | kicker, créditos, selo «OS 5», SEM / PING, lema em balão, chips | z 2 |
| 14 | base | `.voltar` | pílula de vidro | z 4 |
| 15 | `Moldura` | `enfStatus` | **status da call:** pílula de vidro de 36 px (32 abaixo de 420) com rodinha/✓, contagem de ping e 5 barras (as barras somem abaixo de 420) | `top: calc(10px + clamp(14px, 2.4vw, 30px) + 4px)`; `right: max(calc(var(--janela-x) + clamp(12px, 2vw, 26px)), calc((100% - 1280px) / 2 + clamp(16px, 4vw, 24px)))`, que alinha com a borda do conteúdo; z 5 |
| 16 | `Moldura` | `enfControles` | **os controles:** 3 botões redondos `#15281F` com fio `rgba(255,255,255,.08)` e ícone `#DFF5E8` (microfone, câmera, compartilhar) e a pílula vermelha `--desliga` com o fone branco | `left: 50%; bottom: calc(10px + clamp(12px, 1.4vw, 18px)); translate: -50% 0`; botões de `clamp(40px, 3.4vw, 48px)`, pílula de `clamp(58px, 5vw, 72px)`, vão de `clamp(8px, 1vw, 14px)`; z 3 |

**Paddings do herói** (só em `chamada.module.css`; valem para a página e para a ficha):

```css
.raiz {
  /* o recuo lateral da janela; o 50% resolve no elemento que usa (herói ou seção do elenco) */
  --janela-x: max(clamp(8px, 1.6vw, 22px), calc(50% - 680px));
}
.raiz .heroi {
  padding-top: calc(10px + clamp(14px, 2.4vw, 30px));
  padding-bottom: calc(10px + clamp(70px, 6vw, 90px)); /* os controles moram aqui */
}
```

### 4.3 Os desenhos (SVG, todos `aria-hidden="true"` e `focusable="false"`; sem ids, sem `<text>`)

**Pontos medidos no escudo (webp de 640 px, `lab\escudo-grade.png`):**
- caixa do alfa: x 5–95%, y 0–100%;
- **óculos:** lentes em x 27–76% e y 32–44%, centro (51%, 38%), lado direito ~2 px mais alto (rotação −3°);
- língua: centro (45,5%, 53%);
- **Wi-Fi do escudo:** arco de fora em x 31–69%, y 6–14%; **origem dos arcos ≈ (50%, 30%)**, atrás da cabeça;
- letreiro «OS 5 SEM PING»: y 60–92%.

**`LequeWifi`** (herói, com 4 arcos; ficha, com 2):
- `viewBox="0 0 200 102"` e centro (100, 102), o pé do SVG;
- cada arco vai de −45° a +45° da vertical: `M{100−r·0,7071} {102−r·0,7071} A r r 0 0 1 {100+r·0,7071} {102−r·0,7071}`;
- raios 42,1, 58,9, 77,9 e 98,9, que dão **0,40E, 0,56E, 0,74E e 0,94E** com o SVG em 1,9E de largura:

  | arco | `d` |
  |---|---|
  | 1 | `M70.23 72.23A42.1 42.1 0 0 1 129.77 72.23` |
  | 2 | `M58.35 60.35A58.9 58.9 0 0 1 141.65 60.35` |
  | 3 | `M44.92 46.92A77.9 77.9 0 0 1 155.08 46.92` |
  | 4 | `M30.07 32.07A98.9 98.9 0 0 1 169.93 32.07` |

- cada arco é um `<g class="enfArco enfArcoN" style="--a:N">` com três traços iguais, `fill="none"` e `stroke-linecap="round"`:
  - brilho de 12 `rgba(61,255,143,.10)`;
  - halo de 6,5 `rgba(61,255,143,.24)`;
  - núcleo de 2,4 `var(--menta)`.

  É um brilho falso, sem `filter`.
- posição: `position: absolute; left: 50%; top: 30%; width: calc(var(--escudo) * 1.9); aspect-ratio: 200 / 102; translate: -50% -100%; overflow: visible`. O pé do SVG cai na origem do Wi-Fi do escudo.

**`OculosPixel`** (o «deal with it»; herói e insígnia do capitão), em `viewBox="-1 -1 34 8"` com `shape-rendering="crispEdges"`. A arte, 32×6 e simétrica (`#` preto, `o` brilho):

```
################################
.##############################.
..##oo########....##oo########..
..###oo#######....###oo#######..
...##########......##########...
....########........########....
```

- silhueta (fill `#050505`, `stroke="#CFFFE5" stroke-width="0.6" paint-order="stroke"`, que vira um contorno de menta por FORA):
  `M0 0h32v1H0zM1 1h30v1H1zM2 2h12v1H2zM18 2h12v1H18zM2 3h12v1H2zM18 3h12v1H18zM3 4h10v1H3zM19 4h10v1H19zM4 5h8v1H4zM20 5h8v1H20z`
- brilho (fill `#FFFFFF`): `M4 2h2v1H4zM20 2h2v1H20zM5 3h2v1H5zM21 3h2v1H21z`

**`OculosMini`** (`InsigniaMini`: chips, placa, cartela, companheiros), em `viewBox="0 0 16 4"`, crispEdges, `fill="currentColor"`:

```
################
.##############.
..#####..#####..
...###....###...
```

`M0 0h16v1H0zM1 1h14v1H1zM2 2h5v1H2zM9 2h5v1H9zM3 3h3v1H3zM10 3h3v1H10z`. Largura de 20 px nos chips (`.raiz .coroaMini { width: 20px }`) e de 18 px na placa.

**`BarrasDeSinal`** (`TracoDoNome` e status): `viewBox="0 0 29 20"`, 5 `<rect class="enfBarra" style="--b:k">` com:
- `x = 6k`, `y = 16 − 4k`, `width 4.6`, `height 4 + 4k`, `rx 1.2`;
- fill `var(--tm-primaria)`.

**Ícones da call** (fill `currentColor`, cor `#DFF5E8`):
- **microfone** (`0 0 16 20`): `rect x4 y0 w8 h13 rx4` + `path "M1 9a7 7 0 0 0 14 0"` (stroke 2, sem fill) + `rect x7 y15 w2 h4`;
- **câmera** (`0 0 24 16`): `rect x0 y1 w16 h14 rx3` + `path "M17 6l7-4v12l-7-4z"`;
- **tela** (`0 0 24 20`): `rect x1 y1 w22 h14 rx2` (stroke 2) + `path "M12 12V5M8.5 8.5L12 5l3.5 3.5M7 19h10"` (stroke 2, ponta redonda);
- **fone de desligar** (`0 0 28 12`, branco): `path "M2 8c7-6 17-6 24 0l-3 3-4-2v-3c-3-1-7-1-10 0v3l-4 2z"`;
- **✓ do status** (`0 0 16 16`, cor `--tm-primaria`): `circle cx8 cy8 r7` (stroke 2) + `path "M4.6 8.2l2.3 2.3 4.6-4.8"` (stroke 2, ponta e junção redondas);
- **rodinha:** é um `span` de 16 px, `border: 2px solid rgba(255,90,104,.3); border-top-color: var(--ping-ruim); border-radius: 50%`;
- **estrela da cartela** (`0 0 24 24`, `--tm-primaria`): `M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 16.9l-5.8 3.2 1.4-6.4-4.9-4.4 6.5-.7z`;
- **✦ da lente** (`0 0 20 20`, `--tm-nucleo`): `M10 0C10.8 7 13 9.2 20 10C13 10.8 10.8 13 10 20C9.2 13 7 10.8 0 10C7 9.2 9.2 7 10 0Z`.

**Microfone no nick das cartas e barras no «FICHA →»:** são `::before` com `mask` de data-URI (SVG do microfone; 5 barras), pintados com `--tm-primaria`. Pseudoelemento não entra no caminho do link (o teste `link-da-carta` ignora `::before`).

### 4.4 Medidas (maquete medida no Chromium, depois das entradas; cabeçalho do site de 70 px)

**E = `--escudo` (1:1):**
- ≤ 599: `clamp(176px, min(56vw, 31svh), 250px)`, margem de cima 0,30E e de baixo 0,06E;
- 600–1023: `clamp(240px, min(38vw, 30svh), 300px)`, margem de cima 0,42E e de baixo 0,04E;
- ≥ 1024: `clamp(280px, min(26vw, 44svh), 420px)`, margem de cima 0,38E e de baixo 0.

**Grade ≥ 1024:**

```css
.raiz .heroiGrade {
  animation-name: none; /* sem o tremor da base: quem trava é o escudo */
  min-height: max(500px, calc(100svh - 154px - clamp(14px, 2.4vw, 30px) - clamp(70px, 6vw, 90px)));
}
```

Os 154 px são o cabeçalho (72) + 2 × 10 da janela + «VOLTAR» (44) + 18 de margem. Na maquete, a altura do cabeçalho do site medida nos prints foi 70 + borda; confirmar na implementação.

**Título:** `--tam: clamp(56px, calc(100cqi / var(--largura-em, 2.7)), var(--tm-titulo-max))`. O máximo é `min(120px, 14svh)` abaixo de 600, `min(150px, 16svh)` de 600 a 1023 e `min(180px, 18svh)` a partir de 1024. A marca sai SEMPRE em 2 linhas (SEM / PING): cada `.palavra` é bloco.

| janela | E | `tam` | SEM PING (y, tinta) | lema | chips | controles | fim do herói | 1ª dobra |
|---|---|---|---|---|---|---|---|---|
| 1920×1080 | 420 | 180 | 541–850 | 872–918 | 942–986 | 1014–1062 | 1090 | ✓ título e janela |
| **1440×810 (vídeo)** | 356 | 145,8 | 330–580 | 602–648 | 672–716 | 740–788 | 816 | **✓ a janela INTEIRA** |
| 1440×900 | 374 | 162 | 392–670 | 692–738 | 762–806 | 830–878 | 906 | ✓ |
| 1366×768 | 338 | 138,2 | 302–540 | 562–606 | 630–674 | 696–742 | 770 | ✓ |
| 1024×768 | 280 | 138,2 | 268–506 | 524–561 | 582–680 (2 linhas) | 700–740 | 764 | ✓ |
| 768×1024 | 292 | 150 | 690–948 | 962–999 | 1015–1059 | 1077–1117 | 1139 | ✓ título |
| 600×960 | 240 | 150 | 610–868 | 882–920 | 936–1034 | 1052–1092 | 1114 | ✓ título |
| 430×932 | 241 | 120 | 553–759 | 773–811 | 827–983 | 1001–1041 | 1063 | ✓ título |
| **405×720 (vídeo)** | 223 | 100,8 | 526–699 | 713–751 | 767–923 | 941–981 | 1003 | **✓ escudo + leque + kicker + OS 5 + SEM PING** |
| 390×844 | 218 | 118,2 | 539–742 | 756–793 | 809–965 | 983–1023 | 1045 | ✓ título |
| 360×740 | 202 | 103,6 | 514–692 | 706–763 | 779–935 | 953–993 | 1015 | ✓ título |
| 320×640 | 179 | 89,6 | 482–636 | 650–707 | 723–879 | 897–937 | 959 | ✓ título |

- Estouro horizontal (`scrollWidth`): **zero em todas**.
- O status nunca encosta no «VOLTAR»: em 320, status em x 227–300 e voltar até 202.
- Em 1920 o status termina em 1576, a mesma borda do conteúdo.

---

## 5. A entrada (o filme de 0 a ~3 s) e o que fica vivo

### 5.1 Quadro 0 (pôster legível) e quadro final

**Quadro 0** (tudo congelado no 1º quadro). Nada cobre conteúdo, nada está cortado:
- palco com a câmera a 1,06 de escala;
- janela e anel (0,35);
- status com a rodinha vermelha e **«999 ms» vermelho**; 1 barra acesa e 4 a 25%;
- arcos do leque a 12% (dá para ver o desenho apagado: "sem sinal");
- **o escudo inteiro, deslocado (−6%, +4%), girado −3° e a 0,96**;
- fantasmas e óculos pixelados invisíveis (opacidade 0: são enfeite);
- **as 7 letras um pouco fora do lugar** (até ±0,06 em na horizontal, ±0,12 em na vertical, ±5°): o nome "embaralhado" mas legível;
- selo «OS 5» 14 px à esquerda;
- lema e chips 28 px à direita (no celular, 16 px abaixo);
- controles escondidos abaixo da janela (enfeite);
- kicker e créditos parados.

**Final** (e o pôster do movimento reduzido):
- tudo no lugar; ping «0 ms» verde, ✓, 5 barras cheias;
- arcos acesos a 0,9; anel a 0,85;
- **óculos pixelados no poro**; controles na janela; fantasmas e rodinha escondidos.

### 5.2 Linha do tempo do herói (ms)

| ms | conteúdo (só transform) | enfeite (aria-hidden) |
|---|---|---|
| 0–1600 | — | `cameraTrava` no `.enfCamera`: aproxima de 1,06 para 1 com UMA congelada (parada de 480 a 880 ms: a imagem "trava" no meio do movimento) |
| **0–900** | **`travaEscudo`: o escudo trava e pula em degraus aos 180, 390 e 570 ms** (fica parado de 570 a 900) | `fantasma1` aparece aos 180 ms onde o escudo estava (0,45 → 0,25), `fantasma2` aos 390 (0,35 → 0,2); os dois somem de 900 a 1000 |
| 0–900 | `pacote`: as 7 letras dão 2 saltos secos (aos 24% e aos 44% da duração de cada uma) | `pingCai`: **999 → 734 (210) → 999 de novo, o pico (360) → 387 (480) → 120 (660) → 33 (780) → 0 (900)**; vermelho → âmbar (660) → verde (780) |
| 0–900 | — | a rodinha gira (2,5 voltas) |
| **900** | **CONECTOU** | a rodinha some (900–1000) e o ✓ entra por escala (900–1100, passa de 1,2) |
| 900–1500 | o escudo desliza para o lugar, passa 2% para cima e 1,03 de escala (1140), volta 0,6% (1320) e assenta (1500) | barras 2 → 5 do status acendem (900, 960, 1020, 1080; 180 ms cada) |
| 850–1700 | as letras deslizam para o lugar **fora de ordem** (`--embaralha`: S, P e N primeiro, E e I por último), passam 0,04 em para cima a 1,03 e assentam | — |
| 950–1250 | — | **`janelaConecta`**: o anel sobe de 0,35 a 1 (1000) e assenta em 0,85 (1250). **Flash 1** (fino, só a borda) |
| 950–1470 | — | os arcos acendem do menor para o maior (950, 1050, 1150, 1250; 220 ms cada; de 0,12 a 0,9) |
| 870–1500 | `seloConecta`: «OS 5» encaixa (de −14 px e 0,96, passa 2 px, assenta) | barras do selo acendem 2 → 5 (1000, 1060, 1120, 1180) |
| 600–1100 | — | `controlesSobem`: os controles sobem de 140% abaixo para o lugar (opacidade 0 → 1) |
| 1100–2300 | `notificacao` (a base `.sobe` com outro keyframe): lema (`--i` 2,5) e chips (`--i` 3) chegam como notificação, da direita (celular: de baixo) | — |
| **1900–2600** | — | **`oculosCaem`: os óculos pixelados CAEM no poro.** Vêm de −170% e −14°, opacidade 0 → 1 (1900–1925), pousam aos 2160 achatando para `scaleY(.9)`, quicam −3% (2340) e assentam (2600) |
| **2370–2600** | — | **`brilhoLente`: o ✦ pisca na lente direita** (escala 0 → 1,2 → 0; opacidade 0 → 1 → 0). **Flash 2** (9% do escudo) |
| 2200–2950 | — | `janelaFala`, 1ª vez: o poro "fala" (o anel faz 0,85 → 1 → 0,7 → 0,95 → 0,85; dois picos em 500 ms, amplitude ≤ 0,3) |

### 5.3 Keyframes (o essencial; todos com nomes novos, sem `delay` nem `fill-mode` no conteúdo)

```css
/* Conteúdo: o escudo trava em degraus, conecta aos 900 ms (60% de 1500) e encaixa. */
@keyframes travaEscudo {
  0% { transform: translate(-6%, 4%) rotate(-3deg) scale(0.96); animation-timing-function: steps(1, end); }
  12% { transform: translate(5%, -2%) rotate(2deg) scale(0.98); animation-timing-function: steps(1, end); }
  26% { transform: translate(-2.5%, 1.5%) rotate(-1deg) scale(0.97); animation-timing-function: steps(1, end); }
  38%, 60% { transform: translate(3%, -1%) rotate(1deg) scale(0.985); animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1); }
  76% { transform: translate(0, -2%) scale(1.03); }
  88% { transform: translate(0, 0.6%) scale(0.995); }
  100% { transform: none; }
}
.raiz .escudo {
  transform-origin: 50% 60%;
  animation: travaEscudo 1500ms linear;
}

/* Conteúdo: cada letra é um pacote — dois saltos secos e chega fora de ordem (2D: background-clip
   com translate3d some no WebKit). */
@keyframes pacote {
  0% { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); animation-timing-function: steps(1, end); }
  24% { transform: translate(calc(var(--dx) * -0.7), calc(var(--dy) * 0.5)) rotate(calc(var(--rot) * -0.6)); animation-timing-function: steps(1, end); }
  44%, 60% { transform: translate(calc(var(--dx) * 0.45), calc(var(--dy) * -0.4)) rotate(calc(var(--rot) * 0.3)); animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1); }
  82% { transform: translate(0, -0.04em) scale(1.03); }
  100% { transform: none; }
}
.raiz .letra {
  --dx: -0.06em; --dy: -0.12em; --rot: -5deg; --embaralha: 0;
  display: inline-grid;
  transform-origin: 50% 70%;
  animation-name: pacote;
  animation-duration: calc(1450ms + var(--embaralha) * 110ms + var(--i, 0) * 20ms);
  animation-timing-function: linear;
}
.raiz .letra:nth-child(3n + 2) { --dx: 0.05em; --dy: 0.1em; --rot: 4deg; --embaralha: 2; }
.raiz .letra:nth-child(3n) { --dx: -0.03em; --dy: -0.07em; --rot: 3deg; --embaralha: 1; }
.raiz .letra > * { grid-area: 1 / 1; }

/* Conteúdo: o selo OS 5 encaixa. */
@keyframes seloConecta {
  0%, 58% { transform: translate(-14px, 0) scale(0.96); animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1); }
  72% { transform: translate(2px, 0) scale(1.02); }
  100% { transform: none; }
}

/* Conteúdo: o .sobe da base vira notificação (da direita; no celular, de baixo). */
@keyframes notificacao {
  0%, 58% { transform: translate(var(--nx, 28px), var(--ny, 0px)); animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1); }
  84% { transform: translate(calc(var(--nx, 28px) * -0.1), 0); }
  100% { transform: none; }
}
.raiz .sobe {
  animation-name: notificacao;
  animation-duration: calc(1900ms + var(--i, 0) * 120ms);
  animation-timing-function: linear;
}
@media (max-width: 599px) {
  .raiz { --nx: 0px; --ny: 16px; }
}
.raiz .blocoTexto .kicker,
.raiz .nomesDoElenco { animation-name: none; } /* parados, como na GdB */
.raiz .marca { animation-name: none; }          /* sem a entraMarca da base */
.raiz .heroiGrade { animation-name: none; }     /* sem o tremor */

/* Enfeite: a contagem do ping. Contador de CSS sobre uma propriedade inteira registrada. */
@property --ping {
  syntax: "<integer>";
  inherits: false;
  initial-value: 0;
}
.enfPing {
  counter-reset: ping var(--ping);
  min-width: 6ch;
  color: var(--tm-neon);
  font: 700 13px/1 ui-monospace, "Cascadia Mono", Consolas, "SF Mono", Menlo, "Roboto Mono", monospace;
  font-variant-numeric: tabular-nums;
  animation-name: pingCai, pingOscila;
  animation-duration: 1500ms, 7s;
  animation-timing-function: linear, linear;
  animation-delay: 0s, 3s; /* enfeite pode esperar */
  animation-iteration-count: 1, infinite;
}
.enfPing::after { content: counter(ping) " ms"; }
@keyframes pingCai {
  0% { --ping: 999; color: var(--ping-ruim); animation-timing-function: steps(1, end); }
  14% { --ping: 734; color: var(--ping-ruim); animation-timing-function: steps(1, end); }
  24% { --ping: 999; color: var(--ping-ruim); animation-timing-function: steps(1, end); }
  32% { --ping: 387; color: var(--ping-ruim); animation-timing-function: steps(1, end); }
  44% { --ping: 120; color: var(--ping-medio); animation-timing-function: linear; }
  52% { --ping: 33; color: var(--ping-medio); }
  60%, 100% { --ping: 0; color: var(--tm-neon); }
}
/* "Ninguém é perfeito": de 7 em 7 s, 1 ms por 280 ms. */
@keyframes pingOscila {
  0%, 90% { --ping: 0; animation-timing-function: steps(1, end); }
  91%, 95% { --ping: 1; animation-timing-function: steps(1, end); }
  96%, 100% { --ping: 0; }
}

/* Enfeite: a câmera da página dá UMA travada no meio do zoom (nada de tremer a tela). */
@keyframes cameraTrava {
  0% { transform: scale(1.06); animation-timing-function: cubic-bezier(0.3, 0, 0.6, 1); }
  30%, 55% { transform: scale(1.04); animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
  100% { transform: none; }
}
.raiz .enfCamera { animation: cameraTrava 1600ms linear; }
```

Os outros, todos de enfeite (podem usar opacidade, `delay` e `fill-mode: backwards`):

| keyframe | o que faz |
|---|---|
| `rodinha` | 900 ms: `rotate` 0 → 900° e opacidade 1 até 92%, 0 no fim. Repouso: `opacity: 0; visibility: hidden` |
| `checkAparece` | 0–60% `scale(0)` e opacidade 0; 75% `scale(1.2)` e 1; 100% `none` |
| `barraAcende` | opacidade 0,25 → 1 em 180 ms. `animation-delay: calc(var(--atraso-barras) + (var(--b) - 1) * 60ms)` e `fill-mode: backwards`. `--atraso-barras` vale 900 ms no `.enfStatus` e 1000 ms no `.assinatura .enfTraco`. A barra 0 não anima |
| `arcoAcende` | 0,12 → 0,9 em 220 ms, com `delay: calc(950ms + var(--a) * 100ms)` e `backwards`, encadeado com `arcoPinga` |
| `arcoPinga` | 8 s, infinito, `delay: calc(3s + var(--a) * 120ms)`: 0–86% 0,9; 90% 1; 95% 0,55; 100% 0,9. **O sinal "pinga" do centro para fora** |
| `fantasma1` / `fantasma2` | 1500 ms. Opacidade e `visibility` com `steps(1, end)` nos degraus do escudo: 1 aparece aos 12% (0,45) e cai a 0,25 aos 38%; 2 aparece aos 26% (0,35) e cai a 0,2 aos 38%; os dois somem de 60 a 66%. Repouso: `opacity: 0; visibility: hidden`. Posição estática no próprio `transform` da regra (que não tem `translate:`): 1 em `translate(-6%, 4%) rotate(-3deg) scale(.96)`, 2 em `translate(5%, -2%) rotate(2deg) scale(.98)` |
| `janelaConecta` | 1500 ms: 0–60% 0,35; 66% 1; 83% 0,85 |
| `janelaFala` | 10 s, infinito, `delay: 2.2s`: 0% 0,85; 2,5% 1; 5% 0,7; 7,5% 0,95; 10–100% 0,85. Dois picos em 1 s, a cada 10 s |
| `controlesSobem` | 1100 ms: 0–54% `translateY(140%)` e opacidade 0; 100% `none` e 1 |
| `oculosCaem` | 2600 ms: 0–73% `translateY(-170%) rotate(-14deg)` e opacidade 0; 74% opacidade 1; 83% `translateY(6%) scaleY(.9)`; 90% `translateY(-3%)`; 100% `none`. O `translate` e o `rotate` de posição ficam nas propriedades individuais da regra; o keyframe só usa `transform` |
| `brilhoLente` | 2600 ms: 0–91% `scale(0)` e opacidade 0; 94% `scale(1.2)` e 1; 100% `scale(0)` e 0 |
| `deriva` | 40 s, infinito, `alternate`, no `.enfDesfocadas`: `translate(0, 0)` → `translate(-1.5%, 1%)`. Abaixo de 600: `animation: none` |

### 5.4 O que fica vivo depois de 3 s (poucos laços, só transform e opacidade)

| laço | período | peça | custo |
|---|---|---|---|
| `arcoPinga` | 8 s | 4 arcos (2 na ficha) | opacidade |
| `pingOscila` | 7 s | 1 contador | repinta 2 vezes 13 px de texto |
| `deriva` | 40 s | 1 camada (≥ 600) | transform |
| `janelaFala` | 10 s | 1 anel | opacidade |
| `falaAdm` | 4,2 s | anel do capitão (elenco e ficha) | opacidade |

São 5 laços. No celular são 4 (sem `deriva`). Nenhum `filter` animado, nenhum blur, nenhum `will-change`.

### 5.5 Flashes (≤ 2 por segundo, todos pequenos)

- **Na entrada há só 2:**
  1. o anel da janela conectando (950–1250 ms), uma borda de 3 px;
  2. o ✦ na lente (2370–2600 ms), 9% do escudo.

  Eles ficam a 1,4 s um do outro.
- **Não contam:**
  - a rodinha, o ✓ e as barras (ícones de 16 px, só acendem);
  - os arcos (só sobem);
  - os controles (sobem);
  - a contagem de ping (troca de cor de 13 px de texto);
  - a "fala" do anel (amplitude de 0,3 numa borda).
- Depois da entrada: `janelaFala` dá 2 picos suaves a cada 10 s, e o pulso dos arcos (0,9 → 1 → 0,55) vem a cada 8 s.

---

## 6. Título

**A marca «SEM PING»:**
- **Material:** adesivo de gel verde, como ícone de app. É o MESMO tratamento do letreiro do escudo (preenchimento + contorno branco + contorno escuro), trocando o azul pelo verde.
- **Pilha de cada letra** (`.letra` em `inline-grid`, eco e cromo na mesma célula; `.marca` é `isolate` na base, então TODOS os ecos ficam atrás de TODOS os cromos e os contornos se fundem num adesivo só):

```css
.raiz .eco,
.raiz .cromo {
  padding: 0.16em 0.12em 0.14em 0.06em; /* Á sobe a 0,91 em; a caixa de 0,86 só cobre 0,78 acima da base */
  margin: -0.16em -0.12em -0.14em -0.06em;
}
.raiz .eco {
  position: static;
  inset: auto;
  z-index: -1;
  color: #fff;
  -webkit-text-stroke: 0.1em #fff; /* o contorno BRANCO */
  text-shadow: /* o anel ESCURO, por fora do branco, e a sombra; estático */
    0.045em 0.045em 0 var(--contorno), -0.045em 0.045em 0 var(--contorno),
    0.045em -0.045em 0 var(--contorno), -0.045em -0.045em 0 var(--contorno),
    0.065em 0 0 var(--contorno), -0.065em 0 0 var(--contorno),
    0 0.065em 0 var(--contorno), 0 -0.065em 0 var(--contorno),
    0 0.12em 0 var(--contorno), 0 0.18em 0.22em rgba(0, 0, 0, 0.55),
    0 0 0.45em rgba(61, 255, 143, 0.28);
  user-select: none;
}
.raiz .cromo { color: var(--tm-metal-meio); } /* a tinta garantida */
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .raiz .cromo {
    background-image:
      linear-gradient(180deg, rgba(255, 255, 255, 0.42) 0%, rgba(255, 255, 255, 0.12) 40%, rgba(255, 255, 255, 0) 41%),
      linear-gradient(180deg, var(--tm-metal-alto) 8%, var(--tm-metal-meio) 44%, var(--tm-metal-fundo) 72%, var(--tm-metal-base) 90%, var(--tm-metal-volta) 100%);
    background-size: 100% 100%, 100% 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: none; /* sem o brilhoCromo da base */
  }
}
```

- **A "faixa de gel":** o branco a 0,42 → 0,12 até 40% da altura da letra, com borda seca aos 41%, é o reflexo de botão Y2K. Sem varredura periódica: com letra por letra ela passaria em todas ao mesmo tempo, e conteúdo não pode ter `delay`. O título vivo é o leque, não as letras.
- **Corpo da marca:**
  - `font-size: var(--tam)`, `line-height: 0.86` (as duas linhas se encostam pelo contorno e viram um adesivo único);
  - `letter-spacing: 0.01em`, `text-transform: uppercase`, `font-kerning: none`, `font-variant-ligatures: none`;
  - `.raiz .palavra { display: block; width: fit-content; white-space: nowrap }`: SEM numa linha e PING na outra, sempre alinhadas à esquerda;
  - `.raiz .tituloVisual { align-items: flex-start }`.
- **Como a marca se monta:** pacotes chegando fora de ordem, em degraus, durante o lag, e encaixando quando conecta (seção 5). É o único título do site que se monta "pela internet".

**A assinatura «OS 5»** é um selo de status:

```css
.raiz .assinatura {
  order: -1; /* em cima da marca; o DOM não muda */
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5em;
  margin: 0 0 0.42em 0.04em;
  padding: 0.34em 0.78em 0.34em 0.82em;
  border-radius: 999px;
  font-size: max(15px, calc(var(--tam) * 0.15));
  background: var(--vidro);
  box-shadow: inset 0 0 0 1px rgba(255, 141, 180, 0.5);
  animation: seloConecta 1500ms linear;
}
.raiz .pincel {
  transform: none;
  font: 800 1em / 1 var(--tm-fonte-assinatura), system-ui, sans-serif;
  letter-spacing: 0.16em;
  color: var(--tm-acento); /* o rosa da língua do poro, 9,1:1 no vidro */
  text-shadow: none;
}
.raiz .assinatura .enfTraco { /* as 5 barras (TracoDoNome) */
  --atraso-barras: 1000ms;
  display: block;
  width: auto;
  height: 0.92em;
  margin: 0;
  animation: none;
  transform: none;
}
```

`.lema` é o **balão de chat do anfitrião**:
- `width: fit-content; max-width: min(100%, 30em)`;
- `margin: clamp(14px, 1.8vw, 22px) 0 0`;
- `padding: 0.62em 1em 0.66em`;
- `border-radius: 18px 18px 18px 5px` (o rabinho embaixo, à esquerda);
- fundo `--vidro` com fio `--borda`;
- Sora 500, `clamp(14px, 1.2vw, 17px)/1.4`, cor `prata`, `text-wrap: balance`;
- `::before`: um ponto verde de 8 px com brilho (o "online"), sem texto.

**Chips** (`.chip::before` sem o `skewX` da base, raio de 12 px):

| chip | fundo | texto |
|---|---|---|
| pontos | `luz` → `placa`, fio branco interno, brilho verde embaixo | `tinta`; o número em Lilita 24 px |
| capitão | `--vidro` + `--borda` | `texto`, com os óculos mini de 20 px |
| OP.GG | fio de 2 px `--tm-primaria`, fundo `rgba(4,9,7,.55)` | `texto`; hover com fundo `royal` |

- Abaixo de 600 o OP.GG ocupa a linha (regra da base).
- Abaixo de 420, o chip do capitão vai a 100% com `white-space: normal`. «ADM DA CALL · Giripoca» tem ~210 px e cabe em 320, mas fica protegido para nick longo.
- `.chips` e `.lema` sempre alinhados à esquerda (`justify-content: flex-start; margin-inline: 0`).

---

## 7. Elenco: «CÂMERAS LIGADAS» (a galeria da call)

**Ordem:** GOOM GUM (TOP), Nikiti (SEL), N4firida agiota (MID), Miva (SUP) e Giripoca (ADC, capitão) por último. A grade é a da base: 5 colunas a partir de 1024, 3 + 2 de 600 a 1023, 2 colunas e o capitão deitado na largura toda abaixo de 600.

**Título e aviso:**
- `.estrelando`: Lilita `clamp(26px, 2.8vw, 38px)`, `texto`, `letter-spacing: 0.02em`;
- `::before`: ponto verde de 12 px com anel `0 0 0 4px rgba(61,255,143,.18)` (o "online");
- `::after`: o fio da base em verde;
- `.aviso`: Sora 500 13,5 px, `apoio`.

**`AtrasDoElenco` → `enfMalha`:**
- é a malha de pontos da interface da call: `radial-gradient(circle, rgba(61,255,143,.08) 1.2px, transparent 1.6px) 0 0 / 22px 22px`, com máscara radial `70% 60% at 50% 45%`;
- mais uma luz verde `rgba(61,255,143,.10)` atrás da coluna do capitão: à direita em ≥ 1024, embaixo no celular;
- `position: absolute; inset: 0 var(--janela-x); z-index: -1` (atrás do texto e das cartas, dentro do `.conteudo`, como a lousa da GdB). Estática.

**A carta = uma câmera** (ganchos; nada no caminho `.identidade/.sobreFoto/.nick/.link` ganha `filter`, `transform`, `position`, `clip-path`, `mask` ou `contain`):

| peça | gancho |
|---|---|
| `.casca` | `border-radius: 18px` (o anel de foco acompanha); entrada `entraNaCall` |
| `.carta` | `clip-path: none; border-radius: 18px; padding: 1px; container-type: inline-size;` borda de vidro `linear-gradient(160deg, rgba(255,255,255,.16), rgba(255,255,255,.04) 40%, rgba(61,255,143,.2))` |
| `.miolo` | `clip-path: none; border-radius: 17px; overflow: hidden; background: var(--tm-abismo)` |
| `.foto` | 4:5 (base); `.foto img { filter: none }` (a cor da câmera de verdade; a base dessatura) |
| `.enfGradacao` | `linear-gradient(180deg, rgba(4,9,7,.6) 0%, transparent 20%, transparent 56%, rgba(4,9,7,.88) 100%)` |
| `.enfRotaGigante` | `display: none` |
| `.sobreFoto` | a da base: o texto POR CIMA da foto, como numa call |
| `.etiquetaRota` | pílula de vidro (`border: 0; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); border-radius: 999px`), `--tm-etiqueta: var(--tm-texto)`, Sora 700 9,5 px |
| `EloCrest` | o da base, 34 px, no canto direito |
| `.nick` | **a legenda da câmera:** pílula `rgba(4,10,7,.76)` com raio 10, `display: inline-flex; align-items: center; gap: .32em; max-width: 100%; padding: .22em .5em .16em .42em`, Lilita `var(--nick)/1.05`, `texto`, `text-wrap: balance`, `font-kerning: none`. No `@supports` da base, desfazer o `background-clip: text` (`-webkit-background-clip: border-box; background-clip: border-box; -webkit-text-fill-color: currentColor`). `::before`: o microfone verde (máscara, `.6em × .76em`) |
| `--nick` | `clamp(14px, calc((100cqi - 20px) / (var(--maior-palavra-em, 5.2) + 1.84)), 26px)`. O 1,84 em é o microfone + vão + respiro da pílula. Na carta deitada do capitão (< 600): até 30 px |
| `.placaCapitao` | pílula `--tm-primaria`, texto `tinta` (14,3:1), Sora 800 9,5 px, óculos mini de 18 px |
| `.mono` | pílula com fio e texto `icone` |
| `.rodape` | barra fina: fio de cima `rgba(255,255,255,.06)`, padding `10px 12px 11px`. `.nome` em Sora 600 12 px `prata`. `.ficha` em Sora 700 9,5 px `neon`, com `::before` das 5 barras |
| `.fotoVazia` | **"câmera desligada":** o ícone de rota dentro de um círculo `rgba(61,255,143,.08)` de 46% da carta e, no canto, um ícone de câmera riscada (máscara, `apoio`) |

**O anel de quem fala (`.enfHaloCarta`):**
- `inset: -4px; border-radius: 21px; background: none; box-shadow: 0 0 0 2px var(--tm-primaria), 0 0 18px rgba(61,255,143,.35)`;
- em repouso fica `transform: scale(0.97)`, escondido atrás da carta. No hover e no foco vai a `scale(1)`: a base já faz a transição de `transform`, e aparece o anel de 4 px. **Passou o mouse, a pessoa "falou".** Nada de transição de opacidade;
- **quando a carta entra na call**, o anel pisca uma vez: `anelEntra` (enfeite), `animation-timeline: view()`, `from { transform: scale(1) } 70% { transform: scale(1) } to { transform: scale(.97) }`.

**A entrada (por rolagem; sem `view()`, pelo relógio):**

```css
@keyframes entraNaCall {
  from { transform: translate(0, 26px) scale(0.94); }
  70% { transform: translate(0, -3px) scale(1.01); }
  to { transform: none; }
}
@keyframes entraNaCallRelogio {
  0%, 58% { transform: translate(0, 26px) scale(0.94); animation-timing-function: cubic-bezier(0.2, 0.9, 0.25, 1); }
  84% { transform: translate(0, -3px) scale(1.01); }
  100% { transform: none; }
}
.raiz .casca {
  animation-name: entraNaCallRelogio;
  animation-duration: calc(1900ms + var(--i, 0) * 140ms);
  animation-timing-function: linear;
}
@supports (animation-timeline: view()) {
  .raiz .casca {
    animation: entraNaCall linear; /* o shorthand primeiro: ele zera a timeline */
    animation-timeline: view();
    animation-range: entry 0% entry calc(62% + var(--col, 0) * 12%);
  }
}
@media (min-width: 1024px) {
  @supports (animation-timeline: view()) {
    .raiz .casca { animation-range: entry 0% entry calc(50% + var(--i, 0) * 8%); }
  }
}
```

**O capitão (ADM DA CALL):**
- **borda da carta verde:** `.raiz .cascaCapitao .carta { background: linear-gradient(160deg, var(--tm-metal-luz), var(--tm-primaria) 40%, var(--tm-metal-sombra) 75%, var(--tm-metal-volta)) }`;
- **o anel SEMPRE à vista** (`scale(1)`), com `falaAdm` (enfeite, 4,2 s, infinito; opacidade 0,55 → 1 → 0,7 → 0,95 → 0,55). É uma fala irregular: **o ADM não para de falar.** Sem `anelEntra`;
- **a insígnia são os óculos pixelados grandes,** POR CIMA da carta, que caem quando ela entra:
  - o `Insignia` do cenário devolve `<span className={className} aria-hidden="true"><OculosPixel className={cx(ch.enfOculosQueCaem, chf.enfOculosQueCaem)} /></span>`. O `span` herda a posição da base (`coroaDoCapitao`/`coroaDoRetrato`); o SVG interno é enfeite e pode ter opacidade no quadro 0;
  - `.raiz .coroaDoCapitao { width: 104px; top: -22px; rotate: -6deg; filter: drop-shadow(0 8px 10px rgba(0,0,0,.7)) }` (< 600: 92 px a −20 px). A regra NÃO tem `transform:`: o `translate: -50% 0` da base sobrevive no build;
  - `.raiz .coroaDoCapitao .enfOculosQueCaem` (página, rolagem): `oculosDoAdm` com `animation-timeline: view(); animation-range: entry 10% entry 90%`. Keyframes: `from { transform: translateY(-44px) rotate(-22deg); opacity: 0 } 30% { opacity: 1 } 75% { transform: translateY(4px) rotate(2deg) } to { transform: none; opacity: 1 }`. Sem `view()`: `oculosDoAdmRelogio`, 2600 ms pelo relógio, com espera até 70%. A animação fica SÓ debaixo de `.coroaDoCapitao`; a ficha tem a dela;
- espaço para os óculos:
  - ≥ 1024: o `padding-top` do `.elenco` vai a 34 px (o capitão sobe 14 pela base);
  - 600–1023: `row-gap: 40px`;
  - < 600: `.cascaCapitao { margin-top: 26px }`.

Medidas da maquete:

| largura | arranjo | carta | nick |
|---|---|---|---|
| 1440 | 5 colunas, vão 18 | 232 × 327 | 26 px: N4FIRIDA / AGIOTA em 2 linhas, o resto em 1 |
| 1024 | 5 colunas | 181 × 263 | 25,6 px; GOOM / GUM em 2 |
| 768 | 3 + 2 | 231 × 325 | 26 px |
| 390 | 2 colunas | 173 × 253 | 24 px |
| 390, capitão deitado | — | 358 × 276 | 26 px |
| 320 | 2 colunas | 138 × 209 | 17 px |
| 320, capitão | — | 288 × 230 | — |

---

## 8. Cartela final e ficha do jogador

### 8.1 Cartela: «chamada encerrada»

- **`.enfLinhaCromo`:** dois fios verdes `linear-gradient(90deg, transparent, rgba(61,255,143,.5), transparent)` com os óculos mini (`--tm-primaria`, 22 px) no meio.
- **`.cartelaCorpo`** é o cartão de fim de chamada:
  - `max-width: 560px; margin: 0 auto 26px; padding: 26px clamp(18px, 3vw, 30px) 24px; border-radius: 24px`;
  - fundo `linear-gradient(180deg, rgba(14,32,24,.96), rgba(6,15,11,.96))`;
  - `box-shadow: inset 0 0 0 1px var(--borda), 0 30px 70px -30px #000`;
  - entrada `encerra` (conteúdo, rolagem: `translate(0, 18px) scale(.97)` → `none`).
- **`NaCartela` → `enfEncerrada`:** coluna centrada com vão de 12.
  - `enfFone`: círculo de 58 px `--desliga` com o fone branco de 30 px e anel `0 0 0 6px rgba(229,50,63,.16)`;
  - `enfEstrelas`: 5 estrelas verdes de 26 px. **Avalie a chamada: ★★★★★** (5 estrelas, 5 jogadores);
  - as estrelas acendem em cascata por rolagem: `estrelaAcende` (enfeite), `scale(.4)` e 0,25 → `scale(1.15)` → `none` e 1, com `animation-range: entry calc(20% + var(--k) * 8%) cover 40%`. Sem `view()`, ficam acesas.
- **`.cartelaEscudo`:** 64 px, centrado.
- **`.cartelaNome`:** Lilita `clamp(26px, 3vw, 34px)`, `texto`, maiúsculas.
- **`.cartelaDestino`** é a **linha de terminal**:
  - `width: fit-content; max-width: 100%; margin: 12px auto 0; padding: 8px 12px; border-radius: 8px`;
  - fundo `--terminal` e fio `rgba(61,255,143,.18)`;
  - a pilha mono do sistema, 12,5 px/1,45, cor `neon` (16,3:1), `text-align: left`;
  - `::after`: um cursor de bloco ESTÁTICO de `.55em × 1em` em `neon` (sem piscar: piscar seria um flash a mais).
- **`.cartelaData`:** Sora 600 11 px `apoio`, `letter-spacing: .24em`; `::before` com um ponto verde estático.
- **`.cartelaCarimbo`** é o **adesivo rosa** «999 ms? Nunca nem vi.» (`lang="pt-BR"`, da base):
  - `position: absolute; right: -10px; top: -16px` (< 600: `right: 8px; top: -24px`);
  - `padding: 9px 14px 8px; border-radius: 12px 12px 4px 12px`;
  - fundo `acento`, texto `--adesivo` (8,6:1), Lilita 15 px;
  - `rotate: 6deg` (propriedade individual), sombra `0 8px 18px -6px rgba(0,0,0,.6)`;
  - entrada `colaAdesivo` (conteúdo, rolagem): `from { transform: rotate(16deg) scale(1.3) translate(10px, -8px) } 70% { transform: rotate(-2deg) scale(.96) } to { transform: none }`;
  - fica no canto de cima do cartão, por fora do texto: o ícone do fone começa 26 px abaixo da borda e o adesivo termina antes, mesmo no quadro 0 (conferido a 360).
- **`.cartelaFecho`:** Sora 500 14 px/1,5 `apoio`.
- **Links:** o chip OP.GG (VER CALENDÁRIO) e o voltar em pílula. O `::after` da base escurece para `#100d07` no pé.

### 8.2 Ficha (`/jogadores/[slug]`)

A mesma janela da call (`Moldura`), com status e controles: é a câmera **FIXADA** em tela cheia.

**`chamada-ficha.module.css`:**
- **`.retratoCasca`:** `max-width: min(100%, 460px)`; abaixo de 900, `min(100% - 24px, 400px)`.
- **`.retrato`:** `clip-path: none; padding: 1px; border-radius: 22px`, borda de vidro como a da carta.
- **`.retratoMiolo`:** `clip-path: none; border-radius: 21px`. A proporção é a da base (`--proporcao`; 1:1 no GOOM GUM). `> img { filter: none }`.
- **`.enfHaloRetrato`** é **o anel de quem fala, sempre à vista**:
  - `inset: -6px; border-radius: 27px; background: none; box-shadow: 0 0 0 3px var(--tm-primaria), 0 0 30px rgba(61,255,143,.4)`;
  - `animation: falaFixado 4.6s linear infinite`, uma fala irregular como a do ADM (no lugar do `haloRetrato` da base).
- **`AtrasDoRetrato` → `enfAtrasRetrato`:**
  - luz verde suave (`radial-gradient` de 130%);
  - **2 arcos de Wi-Fi** (`LequeWifi` com `quantos={2}`, classe `enfLequeRetrato`) com origem em `50% 14%` da casca e largura 135%. Os ápices ficam 0,11W e 0,22W ACIMA do retrato (51 e 103 px em 1440): o sinal "sai" da câmera fixada;
  - z −1, dentro do `isolate` da casca;
  - acendem como no herói (950 e 1050 ms).
- **`.coroaDoRetrato`** (o capitão): os óculos de 128 px a −26 px, `rotate: -6deg` (< 600: 104 px a −22 px). O `.enfOculosQueCaem` aqui (classe de `chamada-ficha.module.css`) cai PELO RELÓGIO: `oculosDoAdmRelogio` de 2600 ms, com espera até 70% (1,82 s). Por isso o SVG leva as DUAS classes, uma de cada módulo. **O `@keyframes` é DECLARADO DE NOVO em `chamada-ficha.module.css`:** o CSS Modules dá escopo local aos nomes de keyframe, e um módulo não enxerga o do outro.
- **`.placa`:** a pílula verde «ADM DA CALL» (como na carta, 10,5 px).
- **`.topo`:** o da base (rota em pílula de vidro, crista de 52 px).
- **`.enfGradacao`:** as mesmas vinhetas da carta.
- **`.retratoCasca` entra com `fixaRetrato`** (conteúdo, 1300 ms), "fixando a câmera":
  - 0–35% em `translate(-14px, 10px) scale(.94)`, com `steps(1, end)`;
  - 35–50% em `translate(6px, -4px) scale(.98)`;
  - desliza até `none` aos 100%.
- **Nick (`.nickVisual`):**
  - `display: inline-grid` e `.nickVisual > * { grid-area: 1 / 1 }` (eco e cromo na mesma célula, como na GdB). O eco e o cromo usam os MESMOS ganchos do título (adesivo de gel);
  - `font-size: clamp(30px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * .7))), 104px)`, e a partir de 900 o máximo é 132 px;
  - `line-height: .9`, maiúsculas, `font-kerning: none`;
  - `animation: nickConecta 1300ms linear`: 0–30% `translate(-.04em, .03em)` com `steps(1, end)`; 30–45% `translate(.03em, -.02em)` com `steps(1, end)`; desliza até `none`.

  | jogador | 1440 (coluna 654) | 390 (coluna 358) |
  |---|---|---|
  | Giripoca | 132 px, 1 linha | 72,3 px |
  | N4firida agiota | 132 px, **N4FIRIDA / AGIOTA** | 74 px, 2 linhas |
  | GOOM GUM | 132 px, **GOOM / GUM** | 104 px, 2 linhas |
  | Nikiti | 132 px | 104 px |
  | Miva | 132 px | 104 px |

  Nunca passa de 2 linhas e nunca parte palavra (conferido de 360 a 1440).
- **`.nomeReal`:** Sora 600 14 px `prata`.
- **As notificações da ficha vêm DE BAIXO:** `.raiz .texto { --nx: 0px; --ny: 14px }`. Da direita, o último chip e a 4ª tampinha passariam da coluna no quadro 0.
- **Chips:** os mesmos do herói.
- **`.performance`:** Sora 700 11 px `neon`, `letter-spacing: .2em`. Leva `::before` (ponto verde) e o `::after` da base em verde. Não sobe: o `.sobe` desceria o título para baixo das estatísticas no quadro 0.
- **`.estatistica`** é um **painel de estatística da conexão**:
  - vidro `--vidro`, raio 12, fio `rgba(255,255,255,.07)`;
  - o `::before` da base vira **o gráfico de ping, uma linha RETA** (o ping é zero): data-URI `M0 6 L14 6 L16 5 L18 6 L46 6 L48 4 L50 6 L100 6`, stroke `#3DFF8F` a 0,35, `left: 14%; right: 14%; top: 8px; height: 8px`;
  - `.valor` em Lilita `clamp(22px, 2.4vw, 30px)` `texto`, desfazendo o `background-clip` da base;
  - `.rotulo` em Sora 600 8,5 px `apoio`.
- **Companheiros, «NA MESMA CALL» (a faixa de câmeras da call):**
  - `.companheiroLink`: raio 14, `--vidro`, fio `rgba(255,255,255,.08)`; no hover, a borda fica `--tm-primaria` (transição de `border-color`, nomeada);
  - foto de 72 px com `cover` e o foco do tema;
  - `.companheiroRota` em Sora 700 9,5 px `icone`;
  - `.companheiroNick` em Lilita 15 px maiúsculas, `overflow-wrap: anywhere`;
  - o capitão leva os óculos mini (base: InsigniaMini + «CAPITÃO» para o leitor de tela).

---

## 9. Movimento reduzido, contraste, foco, riscos

**Movimento reduzido:**
- o bloco da base (`.raiz * { animation: none !important; transition: none !important }`) para tudo e deixa o **pôster final**: todos os estados de repouso SÃO o final;
- o `--ping` tem `initial-value: 0`, então aparece «0 ms»;
- a rodinha, os fantasmas e o ✦ ficam com `opacity: 0; visibility: hidden` em repouso;
- os óculos ficam no poro, os arcos a 0,9, o anel a 0,85;
- por garantia, acrescentar `@media (prefers-reduced-motion: reduce) { .enfFantasmas, .enfRodinha, .enfBrilhoLente { display: none } }`.

**Foco e teclado:**
- ordem do Tab: voltar → OP.GG → as 5 cartas → calendário → todos os times;
- anel `2px solid var(--tm-arco)` (`#B9FFDA`): 17,5 no breu, 16,6 na janela, 15,4 no abismo. O `outline` acompanha o raio da pílula e da carta (`.casca` com `border-radius: 18px`);
- nada focável tem máscara ou `clip-path`: as pílulas são `::before` ou `background`.

**Leitor de tela:**
- o `h1` lê «OS 5 SEM PING» uma vez; as 7 letras, o selo visual, as barras e os óculos são aria-hidden;
- «ADM DA CALL» é aria-hidden: lê-se «CAPITÃO» na placa, no chip e nos companheiros;
- o adesivo sai com `lang="pt-BR"`;
- a contagem «999 → 0 ms» é conteúdo de `::after` dentro de um enfeite aria-hidden: não é lida e não é texto no DOM.

**`forced-colors: active`:**
- `.cromo` e `.nick` viram `CanvasText`;
- o eco some;
- o fundo das pílulas de nick vira `Canvas`;
- o leque e os óculos ficam como estão (são SVG de enfeite).

**`prefers-contrast: more`:**
- a face das letras vira `#7DFFB5` sólido;
- **o eco FICA** (o branco + o anel escuro dão 20:1 contra o fundo; a base o esconderia): `.raiz .eco { display: block }`;
- a pílula do nick vai a `rgba(0,0,0,.92)`.

**Contraste (WCAG, calculado):**

| texto e fundo | razão |
|---|---|
| texto no breu / na janela / no abismo | 19,5 / 18,5 / 17,2 |
| texto no vidro sobre foto BRANCA / AMARELA (pior caso das etiquetas) | 9,9 / 11,4 |
| nick na pílula sobre foto branca | 9,5 |
| prata no abismo / na janela | 13,5 / 14,5 |
| apoio no breu / na janela / no abismo | 8,8 / 8,3 / 7,7 |
| acento («APRESENTA», «OS 5») no breu / no vidro | 9,3 / 9,1 |
| tinta na placa verde / na placa clara | 14,3 / 15,0 |
| neon no breu / no terminal | 16,1 / 16,3 |
| ícone de rota no vidro sobre branco | 7,7 |
| «999 ms» / âmbar no vidro | 6,5 / 12,2 |
| adesivo | 8,6 |
| contorno branco do título no breu | 20,1 |
| face mais escura do gel contra o contorno branco | 7,9 |
| cor do time no site | 14,8 |
| não-texto: anel verde na janela / botão de desligar | 14,3 / 4,4 |

**Riscos e como evitar:**

| risco | como evitar |
|---|---|
| **O lag parecer defeito de verdade** | É curto (900 ms), em degraus grandes e nítidos, com os fantasmas, o «999 ms» vermelho e a rodinha dizendo "é de propósito". A resolução é instantânea e lisa (0 ms, ✓, anel, arcos). A câmera do palco NÃO treme: só congela uma vez. Conferir no vídeo com o Lucas antes de publicar. |
| `@property` inteiro + `counter()` | Chromium ≥ 85, Safari ≥ 16.4 e Firefox ≥ 128 animam liso. Sem suporte, o valor vira discreto (pula no meio de cada trecho) e termina em «0 ms»: legível. **Conferir no Safari** que o `::after` acompanha a contagem; se não acompanhar, termina em 0 do mesmo jeito. |
| `background-clip: text` com animação nas letras | Só transformações 2D (`translate`, `rotate`, `scale`). `translate3d` some no WebKit, a lição da QM. |
| lightningcss apagando `translate:` | Nenhuma regra tem `translate:` E `transform:` literal: `enfLeque`, `enfOculos`, `enfControles`, `enfHalo` e `coroaDoCapitao` usam as propriedades individuais, e os keyframes, só `transform`. Nenhum keyframe mistura os dois. O teste `css-do-build` cobre. |
| Carta deixar de ser clicável inteira | O `.nick` ganha só fundo, raio, padding e `display: inline-flex`. O microfone é `::before`. `.identidade` e `.sobreFoto` ficam como na base. O teste `link-da-carta` cobre. |
| Propriedade empatada entre módulos | `.raiz .heroi`, `.raiz .kicker`, `.raiz .chips` e afins moram SÓ em `chamada.module.css`. `chamada-ficha.module.css` só mexe em peças de `ficha.module.css` (`grade`, `retrato…`, `nickVisual`, `estatistica`, `companheiro…`) e na sua `.raiz` (sem repetir propriedade). |
| Fantasmas pesados no celular | Um só abaixo de 600. `filter` estático, `visibility: hidden` fora da entrada (não pintam depois). |
| Reserva da fonte | Arial Bold a 70% é a mais estreita medida. Se nenhuma `local()` existir, cai na genérica a 100% (mesmo risco aceito na GdB). |
| Cabeçalho do site com outra altura | O herói "do tamanho da tela" usa 72 px de cabeçalho. Se mudar, os controles descem um pouco, sem cortar nada. |
| A foto do Giripoca | Tem o dedo do meio no queixo. Na carta deitada do capitão, no celular (3:2), o gesto fica no centro de baixo. É a foto que o time mandou e o Lucas quer zoeira, então fica. Se um dia quiser esconder, `foco: "50% 12%"` tira o gesto do 3:2, mas o 4:5 da carta e da ficha continua mostrando. |

---

## 10. Arquivos e testes

**Novos:**
1. `lib/temas/os-5-sem-ping.ts` (seção 3.8).
2. `components/times/cenarios/ornamentos-chamada.tsx`: `LequeWifi`, `OculosPixel`, `OculosMini`, `BarrasDeSinal`, `IconeMicrofone`, `IconeCamera`, `IconeTela`, `Fone`, `Check`, `Estrela`, `BrilhoLente` (seção 4.3).
3. `components/times/cenarios/chamada.tsx` (`Estrela` aceita `className` e `style`; `BrilhoLente` é o SVG do ✦):

```tsx
/** As outras câmeras da call, fora de foco: x, y (% do palco), largura (vw), falando? */
const TELAS = [
  ["2%", "14%", 11, false], ["88%", "10%", 10, true], ["6%", "62%", 12, false], ["86%", "58%", 11, false],
  ["24%", "86%", 10, true], ["64%", "82%", 12, false], ["44%", "4%", 9, false],
] as const;

export const CHAMADA: CenarioDoTema = {
  classes: ch,
  classesDaFicha: chf,
  Fundo: () => (
    <>
      <div className={ch.enfParede} />
      <div className={ch.enfDesfocadas}>
        {TELAS.map(([x, y, w, fala]) => (
          <span key={`${x}-${y}`} className={cx(ch.enfCamDesfocada, fala && ch.enfCamFalando)}
            style={{ "--x": x, "--y": y, "--w": `${w}vw` } as CSSProperties} />
        ))}
      </div>
    </>
  ),
  Moldura: () => (
    <>
      <span className={ch.enfJanela} aria-hidden="true" />
      <span className={ch.enfFala} aria-hidden="true" />
      <span className={ch.enfStatus} aria-hidden="true">
        <span className={ch.enfRodinha} />
        <Check className={ch.enfCheck} />
        <span className={ch.enfPing} />
        <BarrasDeSinal className={ch.enfBarrasStatus} />
      </span>
      <span className={ch.enfControles} aria-hidden="true">
        <span className={ch.enfBotao}><IconeMicrofone /></span>
        <span className={ch.enfBotao}><IconeCamera /></span>
        <span className={ch.enfBotao}><IconeTela /></span>
        <span className={cx(ch.enfBotao, ch.enfDesliga)}><Fone /></span>
      </span>
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={ch.enfHalo} aria-hidden="true" />
      <span className={ch.enfLuzRosa} aria-hidden="true" />
      <LequeWifi className={ch.enfLeque} />
    </>
  ),
  NoEscudo: () => (
    <>
      <OculosPixel className={ch.enfOculos} />
      <BrilhoLente className={ch.enfBrilhoLente} />
    </>
  ),
  // Os fantasmas do lag: duas cópias do escudo, atrás dele (z 1).
  Chao: ({ imagem }) =>
    imagem ? (
      <span className={ch.enfFantasmas} aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={cx(ch.enfFantasma, ch.enfFantasma1)} src={imagem} alt="" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={cx(ch.enfFantasma, ch.enfFantasma2)} src={imagem} alt="" />
      </span>
    ) : null,
  // A posição vem da base (coroaDoCapitao/coroaDoRetrato); o SVG é enfeite e leva a classe dos dois módulos.
  Insignia: ({ className }) => (
    <span className={className} aria-hidden="true">
      <OculosPixel className={cx(ch.enfOculosQueCaem, chf.enfOculosQueCaem)} />
    </span>
  ),
  InsigniaMini: ({ className }) => <OculosMini className={className} />,
  TracoDoNome: ({ className }) => <BarrasDeSinal className={className} />,
  AtrasDoRetrato: () => (
    <span className={chf.enfAtrasRetrato} aria-hidden="true">
      <LequeWifi className={chf.enfLequeRetrato} quantos={2} />
    </span>
  ),
  AtrasDoElenco: () => <span className={ch.enfMalha} aria-hidden="true" />,
  NaCartela: () => (
    <span className={ch.enfEncerrada} aria-hidden="true">
      <span className={ch.enfFone}><Fone /></span>
      <span className={ch.enfEstrelas}>
        {[0, 1, 2, 3, 4].map((k) => <Estrela key={k} className={ch.enfEstrela} style={{ "--k": k } as CSSProperties} />)}
      </span>
    </span>
  ),
};
```

4. `components/times/cenarios/chamada.module.css`, com 4 grupos:
   - `@font-face` «Lilita Caixa Alta» e `@property --ping`;
   - **raiz:** `--tm-titulo-estilo: normal; --tm-titulo-peso: 400; --tm-titulo-peso-medio: 400; --tm-placa-topo: var(--tm-metal-luz); --tm-etiqueta: var(--tm-texto); --tm-foto-fundo: var(--tm-abismo); --tm-chip-capitao: var(--tm-texto); --tm-mono: var(--tm-icone); --tm-eco-base: #021a0c; --tm-valor-base: var(--tm-metal-meio)`, mais as variáveis do cenário da 3.2, `font-family: var(--tm-fonte-assinatura), system-ui, sans-serif` e `font-synthesis: none`;
   - os enfeites e os ganchos das seções 4 a 8;
   - os blocos de movimento reduzido, `forced-colors` e `prefers-contrast` da seção 9.
5. `components/times/cenarios/chamada-ficha.module.css` (seção 8.2).
6. `tests/times/tema-os-5-sem-ping.test.tsx`, no molde do da GdB. Confere:

   **registro**
   - `temaDoTime("os-5-sem-ping")` é o tema, e `temaDoTime("aurea")` dá `null`;
   - `corDoTime({ id: "aurea", slug: "os-5-sem-ping" })` dá `#3DFF8F`, e sem o slug dá `#e0b13c`;
   - `partesDoNome("OS 5 SEM PING", "OS 5")` dá `{ assinatura: "OS 5", marca: "SEM PING" }`, e em caixa mista `"Os 5"` + `"Sem Ping"`;
   - textos em pt e en, e `carimbo` igual nos dois («999 ms? Nunca nem vi.»).

   **métricas**
   - `maiorPalavraEm("SEM PING")` = 2,628;
   - `larguraEm("ㅤ")` = 1,33;
   - `padrao ≥ max(avancos)`;
   - `larguraDoNickEm`: N4firida agiota 4,837, GOOM GUM 3,28, Giripoca 4,951, Nikiti 3,437, Miva 3,012;
   - RX e QM continuam sem métrica.

   **página**
   - `h1` lido uma vez («OS 5 SEM PING»), com 7 `.letra` e `--largura-em:2.628`;
   - ordem GOOM GUM, Nikiti, N4firida agiota, Miva, Giripoca, com `--maior-palavra-em:4.951`;
   - todos os textos presentes, inclusive «CONECTADOS DE 13 DE NOVEMBRO A 6 DE DEZEMBRO»;
   - «CAPITÃO» lido e nunca «ADM DA CALL»;
   - adesivo com `lang="pt-BR"`;
   - `data-cenario="chamada"`, SEM `data-fotos`;
   - presentes `enfJanela`, `enfStatus`, `enfControles`, `enfLeque`, `enfOculos`, `enfFantasma`, `enfMalha` e `enfEncerrada`;
   - ausentes `enfCoroa`, `enfGrade`, `enfLua`, `enfTrilhos`, `enfLousa`, `enfTelaCartela` e `enfLetreiro` (nenhuma classe daqui começa com `enfTela`: as câmeras do fundo são `enfCamDesfocada`);
   - mais de 30 enfeites, todos aria-hidden e sem texto.

   **RX, QM e GdB**
   - HTML sem `enfLeque` nem `enfJanela`.

   **ficha (Giripoca)**
   - `h1` lido uma vez, com `--largura-nick-em:4.951`;
   - os 4 companheiros e «NA MESMA CALL»;
   - «CAPITÃO» no link do capitão;
   - `enfAtrasRetrato` presente e enfeites limpos;
   - GOOM GUM com `--proporcao:1 / 1`.

   **«o ping é enfeite que nunca esconde»** (lê o CSS)
   - `@property --ping` com `syntax: "<integer>"` e `initial-value: 0`;
   - `pingCai` e `pingOscila` só declaram `--ping` e `color`;
   - `.enfPing` tem `counter-reset: ping var(--ping)`.

**Alterados (mínimo):**
- `lib/temas/tipos.ts` (2 uniões);
- `lib/temas/metricas.ts` (`LILITA_ONE` + mapa);
- `lib/temas/registro.ts` (uma linha);
- `components/times/cenarios/index.ts` (uma linha);
- `components/times/fontes-dos-temas.ts` (2 fontes);
- `lib/i18n/messages/paginas-home.ts` (9 chaves × 2 idiomas);
- `tests/stubs/next-font-google.ts` (`Lilita_One`, `Sora`);
- **`tests/times/temas-sem-opacidade.test.ts`:** acrescentar à lista de entradas `"travaEscudo", "pacote", "seloConecta", "notificacao", "entraNaCall", "entraNaCallRelogio", "fixaRetrato", "nickConecta", "colaAdesivo", "encerra"`. Todos animam `transform` e nada que esconda. Os outros keyframes são de enfeite: o último seletor de cada regra começa com `.enf`.
- **NÃO mexer** em `pagina-do-time-com-tema.tsx`, `ficha-do-jogador-com-tema.tsx`, `tema.module.css` nem `ficha.module.css`. RX, QM e GdB têm de sair com o HTML idêntico.

**Rodar:**
- `npx vitest run tests/times`, `npx tsc --noEmit`, `npm run lint` e `npm run build`;
- conferir no build o `@property`, o `@font-face` e os `translate`/`rotate`.

**Em cada largura (navegador de verdade, estouro medido por JS):**
- `scrollWidth == innerWidth` de 320 a 2560;
- SEM / PING em 2 linhas inteiras, sem corte, com o contorno inteiro;
- a primeira dobra com escudo + SEM PING (1440×810 e 405×720 do vídeo; a janela inteira em 1440×810);
- status sem encostar no voltar;
- nick do elenco ≤ 2 linhas;
- capitão deitado < 600;
- adesivo fora do texto;
- ficha com nick ≤ 2 linhas e sem partir palavra.

**Em qualquer largura:**
- **quadro 0:** `document.getAnimations().forEach(a => { a.pause(); a.currentTime = 0; })` e print. Na página e na ficha; nada coberto, cortado ou fora da tela;
- movimento reduzido (pôster final), `forced-colors`, `prefers-contrast: more`;
- aba em segundo plano e volta;
- Safari: a contagem, o `background-clip` com `rotate` 2D nas letras, `paint-order` no SVG dos óculos;
- Firefox sem `view()`: cartas e óculos do capitão pelo relógio, estrelas acesas, adesivo parado;
- RX, QM e GdB: prints antes e depois (`.sim/comparar-paginas.cjs`) e os testes deles sem mudança.

**Vídeo (pedido do Lucas):** gravar de produção depois do deploy, com `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador <saida>.mp4 os-5-sem-ping giripoca` e o mesmo com `celular`. O roteiro:

| trecho | o que aparece |
|---|---|
| **0–0,9 s, TRAVOU** | 999 ms vermelho, a rodinha, o escudo pulando com os fantasmas, o pico de volta a 999, as letras embaralhadas |
| **0,9–1,6 s, CONECTOU** | 0 ms, ✓, as barras enchem, o anel verde acende, o leque acende de dentro para fora, as letras chegam fora de ordem, o OS 5 encaixa |
| **1,9–2,6 s, DEAL WITH IT** | os óculos pixelados caem no poro e o ✦ pisca |
| 3–7 s | o leque "pinga", o ping oscila para 1 ms e volta, as câmeras de fundo derivam |
| 7–11 s | rolagem até CÂMERAS LIGADAS: as câmeras entram na call com o anel piscando, os óculos do ADM caem e o anel dele fala sem parar |
| 11–13 s | chamada encerrada: as estrelas acendem uma a uma e o adesivo «999 ms? Nunca nem vi.» cola |
| fecho (4 s da ficha do Giripoca) | a câmera fixando com um tranco, o anel falando, os óculos caindo e o nick conectando |

---

## 11. Decisões que ficam com o Lucas

1. **O lag de 0,9 s na entrada.** É a piada central. Se no vídeo parecer travamento de verdade, encurtar para 600 ms é tirar um degrau (o de 38%).
2. **«ADM DA CALL»** como título do capitão. As alternativas eram «O ROTEADOR» (todo mundo se conecta por ele) e «DONO DO WI-FI» (mais engraçado, mas repete o «DONO DO CANECO» da GdB).
3. **Os óculos pixelados POUSAM e FICAM no escudo** (cobrem os óculos originais do poro, também pretos). Se preferir o logo intacto no fim, os óculos somem (opacidade) aos 3,2 s, mudando só um keyframe.
4. **A foto do Giripoca** (o dedo do meio). Fica como veio, de zoeira; ver o risco na seção 9.
5. **Cor do time `#3DFF8F`.** É o único verde dos oito. Se algum dos outros quatro designers também for de verde, o menor ΔE aqui ainda é 18,5 contra tudo o que existe hoje.

---

## Ajustes obrigatórios do juiz

> Vencem o spec onde os dois discordarem (28/10/2026). O parecer geral está em `..\juiz.md`.
> Veredito: **aprovado com uma troca grande e ajustes** — o conceito (a call que trava e conecta) é o
> mais original dos cinco. A troca: **a fonte do título deixa de ser a Lilita One** (os Furiosos já a
> usam como material das figurinhas) e passa a ser a **Unbounded 800**. O resto do desenho fica.
> Este spec só tem protótipo (`lab\`): o código é escrito do zero a partir dele + destes ajustes.

### J1. Dados finais
- `cor: "#3DFF8F"` (sem mudança; vizinho mais perto Queijo Minas a ΔE 30,2; 14,8:1).
- `fontes: { titulo: "unbounded", assinatura: "sora" }` — `Unbounded` variável (sem `weight`),
  `subsets: ["latin"]`, `adjustFontFallback: false`, `fallback: ["Sem Ping Reserva"]`; `Sora` variável
  (sem `weight`), `subsets: ["latin"]`. A base JÁ declara as duas assim (e o stub): não mexa.
- `prefixo: "OS 5"`, `letraPorLetra: true`, `cenario: "chamada"`, fotos como na 3.7 (com
  `proporcao: { "goom-gum": "1 / 1" }`).
- Cabeçalho do site: fundo `rgba(4, 9, 7, 0.95)` → `rgba(4, 9, 7, 0.84)` (o `breu`), fio
  `rgba(61, 255, 143, 0.24)` (o `--borda` da janela). A base põe em `globals.css`.

### J2. A fonte do título: Unbounded 800 (substitui TODA menção à Lilita One no spec)
- Onde o spec diz «Lilita» (título, nicks da carta, nick da ficha, `.estrelando`, número dos
  chips, `.cartelaNome`, `.cartelaCarimbo`, `.valor` das estatísticas, `.companheiroNick`), leia
  `var(--tm-fonte-titulo)` a **800**. No `.raiz`: `--tm-titulo-estilo: normal; --tm-titulo-peso: 800;
  --tm-titulo-peso-medio: 800; font-synthesis: none` (não 400). Peso único: a métrica é medida no 800
  e vale para título e nicks.
- A Unbounded é ~20–37% mais larga que a Lilita. Tamanhos fixos que estavam no limite da caixa
  descem: número do chip de pontos 24 → **20 px**; adesivo «999 ms? Nunca nem vi.» 15 → **13 px**;
  `.companheiroNick` 15 → **13 px**; `.estrelando` `clamp(22px, 2.6vw, 34px)`; `.cartelaNome`
  `clamp(22px, 2.6vw, 30px)` (quebra entre palavras no celular, nunca no meio). Tudo que é medido
  (`--tam`, `--nick`, `--largura-nick-em`) se ajusta sozinho pela métrica.
- **A reserva** «Lilita Caixa Alta» sai; no topo de `chamada.module.css`:

  ```css
  @font-face {
    font-family: "Sem Ping Reserva";
    src: local("Arial Bold"), local("Arial-BoldMT"), local("Helvetica Bold"), local("Helvetica-Bold"),
      local("Liberation Sans Bold"), local("LiberationSans-Bold"), local("Arimo Bold"), local("Arimo-Bold"),
      local("Roboto Bold"), local("Roboto-Bold");
    font-weight: 100 900; /* cobre o 800 pedido: nada de negrito sintético, que alargaria */
    size-adjust: 85%;
  }
  ```

  (Medido pelo juiz: a maior razão Arial Bold/Unbounded 800 é 1,154, no `_`; a 85% fica ≤ 0,981 em
  todo caractere. Se a sua medida der outra pior razão R, use `size-adjust` = 100/R − 1, em %.)
- **A métrica é SUA**: meça (Chromium, canvas a 100 px, o woff2 variável que o next/font baixa,
  `ctx.font = "800 100px <família>"`, `fontKerning = "none"`) as mesmas 84 chaves da tabela da
  Knewave e ponha no bloco `UNBOUNDED` de `lib/temas/metricas.ts`, com `espacamento: 0.01`,
  `sobra: 0.34` (2 × (0,04 da metade do traço branco + 0,065 do anel escuro) + 0,098 de tinta do Í
  + folga) e `padrao` = o maior avanço medido arredondado para cima (o W dá ~1,375 → `1.4`). A
  Unbounded TEM kerning: título, nicks e números com `font-kerning: none` e
  `font-variant-ligatures: none` (o spec já pede). Pré-medida do juiz para conferir a ordem de
  grandeza (Google Fonts, `juiz-trabalho\t3\unbounded-medidas.json`): PING 3,14 em de avanço, então
  `maiorPalavraEm("SEM PING")` ≈ 3,52; Giripoca ≈ 6,69; N4firida agiota ≈ 6,56 (2 linhas);
  GOOM GUM ≈ 4,55 (2 linhas); Nikiti ≈ 4,18; Miva ≈ 3,93. Os números do teste (seção 10) saem da
  SUA tabela, não destes.
- **O traço do adesivo de gel** (seção 6) fica mais fino para os olhos das letras não fecharem:
  `-webkit-text-stroke: 0.08em #fff` (era 0,1); o anel escuro (`text-shadow`) igual.
  `line-height` da `.marca` **0,91** (era 0,86: as maiúsculas da Unbounded têm 0,75 em, contra
  0,70; a 0,86 o PING invade o SEM). Padding de eco/cromo `.16em .12em .14em .06em` serve (Ã sobe a
  0,99 em, dentro da caixa de 1,0; o Í solta 0,098 à direita). `--tam`:
  `clamp(56px, calc(100cqi / var(--largura-em, 3.6)), var(--tm-titulo-max))` (só o padrão muda).
- **Nick das cartas:** `--nick: clamp(13px, calc((100cqi - 20px) / (var(--maior-palavra-em, 6.7) + 1.84)), 26px)`;
  **abaixo de 400 px o microfone sai da pílula** (`.raiz .nick::before { display: none }`) e a conta
  usa `+ 0.92` no lugar de `+ 1.84` — sem isso o GIRIPOCA fica com ~13,8 px em 320 e estoura a
  pílula. Meça em 320, 360 e 390: o nick mais largo inteiro dentro da pílula, ≥ 15 px.

### J3. O «OS 5» vira texto de interface, sem cápsula (decisão dos dois «OS 5», `juiz.md` §4)
Na regra `.raiz .assinatura` da seção 6: `background: none; box-shadow: none; padding: 0;
border-radius: 0;` (ficam `display: inline-flex; align-items: center; gap: 0.5em; order: -1;
margin: 0 0 0.42em 0.04em; font-size: max(15px, calc(var(--tam) * 0.15)); animation: seloConecta
1500ms linear`). As 5 barras vêm ANTES do texto: `.raiz .assinatura .enfTraco { order: -1; }` (o DOM
não muda). «OS 5» em Sora 800, `--tm-acento`, `letter-spacing: 0.16em` (9,3:1 no breu). É a linha de
status da sala — o selo-objeto é o dos Furiosos.

### J4. Cortes de desempenho e de regra
- **Corte `pingOscila`**: é laço infinito de propriedade registrada (`--ping`) + `counter()` —
  roda no thread principal o tempo todo, e a regra da casa só aceita transform/opacidade em laço. O
  status fica em «0 ms» depois do `pingCai` (que é de uma vez só e fica). Tire do roteiro do vídeo
  «o ping oscila para 1 ms» e do teste «pingOscila só declara…».
- Laços que ficam: `arcoPinga` (4 arcos; 3 no celular; 2 na ficha), `derivaDaCall` (≥ 600),
  `janelaFala`, `falaAdm` (capitão) e `falaFixado` (ficha). Herói: 6 no computador, 4 no celular.
- Fantasmas: 2 no computador, 1 abaixo de 600 (como está). O `filter` deles é estático (ok).

### J5. Keyframes com nome único
Os genéricos ganham o nome do cenário: `deriva` → `derivaDaCall`, `pacote` → `pacoteDaCall`,
`rodinha` → `rodinhaDaCall`, `notificacao` → `notificacaoDaCall`, `encerra` → `encerraCall`.
O `oculosDoAdmRelogio` NÃO é declarado duas vezes com o mesmo nome: em `chamada-ficha.module.css`
ele se chama **`oculosDoAdmFicha`** (o teste junta todos os módulos num Map por nome). A lista do
seu bloco em `temas-sem-opacidade.test.ts` leva os nomes novos (`travaEscudo`, `pacoteDaCall`,
`seloConecta`, `notificacaoDaCall`, `entraNaCall`, `entraNaCallRelogio`, `fixaRetrato`,
`nickConecta`, `colaAdesivo`, `encerraCall`). Confira com o `grep … | uniq -d` do `juiz.md` §2.

### J6. Integração com a base pronta
- Não edite `tipos.ts`, `fontes-dos-temas.ts`, `registro.ts`, `index.ts`, o stub nem `globals.css`
  (a seção 10 «Alterados» já está feita pela base, com a Unbounded no lugar da Lilita).
- Textos: em `lib/i18n/messages/temas/os-5-sem-ping.ts` (não `paginas-home.ts`).
- Métrica e lista de keyframes: só nos SEUS blocos.

### J7. O que medir de novo (a maquete era com a Lilita)
- A tabela 4.4 inteira: em 1440×810 a janela inteira (controles inclusive) na 1ª dobra; em 405×720
  escudo + leque + kicker + OS 5 + SEM / PING na 1ª dobra; 320 sem estouro; SEM e PING sempre em 2
  linhas inteiras com o contorno; o status nunca encosta no VOLTAR.
- Com a fonte BLOQUEADA (só a reserva): título e nicks inteiros.
- Ficha: nick ≤ 2 linhas nos 5 (N4FIRIDA / AGIOTA, GOOM / GUM), nunca partido.
- Quadro 0 da página e da ficha; movimento reduzido nas duas (os óculos ficam no poro, o ping em
  «0 ms», rodinha/fantasmas/✦ escondidos; a ficha também para, porque a raiz dela leva o `.raiz` do
  `tema.module.css`).
- Safari: `@property --ping` + `counter()` termina em «0 ms»; letras com `background-clip` e
  transform 2D (nada de `translate3d` em conteúdo).
