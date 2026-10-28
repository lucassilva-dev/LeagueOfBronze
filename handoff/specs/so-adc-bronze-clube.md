# SO ADC BRONZE CLUBE: «A Mosca Intacta» (cenário `estande`)

Não editei nada no repositório (`C:\LeagueOfBronze-precos` segue limpo, `git status` vazio). Li o sistema inteiro antes (lib/temas, components/times com os três cenários, tests/times, o stub do next/font, o `font-data.json`), olhei o escudo e as 5 fotos, vi os três temas no ar com o Playwright e medi a fonte do título no Chromium.

**O projeto já está implementado e testado num harness, sem tocar no repo.** Todo o código abaixo é o que rodou, byte a byte:

| verificação | resultado |
|---|---|
| `vitest run tests/times` numa cópia do repo com os arquivos novos | 7 arquivos, **160/160** (RX, QM e Galácticos intactos; o teste novo; opacidade, link da carta e minificador cobrindo os 2 módulos novos) |
| `vitest run` (a suíte inteira, na cópia) | 249 arquivos, 2.710 testes: 2.706 verdes e 4 pulados (como no repo). O único vermelho da 1ª rodada era o `.env.example` que eu não tinha copiado; copiado, passou |
| `tsc --noEmit` (na cópia) | 0 erros (fora os `.next/types`, que só existem depois do build) |
| `eslint` nos arquivos novos e nos de código mudados | limpo |
| regras da casa (`temas-sem-opacidade`, `link-da-carta`, lightningcss com `minify` e `cssModules`) portadas para rodar nos módulos | ✓ nos dois módulos |
| render real (Vite em SSR com `PaginaDoTimeComTema`/`FichaDoJogadorComTema` de verdade) | 13 larguras, de 320 a 2560: estouro horizontal **zero** em todas |
| quadro 0 de verdade (todas as animações congeladas desde o carregamento) | pôster legível na página e na ficha |
| movimento reduzido | pôster final, nada se mexe |
| depois dos últimos ajustes (entradas 2D, furos que aparecem no impacto, placa) | `tests/times` e `tsc` de novo: verdes |

**Onde estão as coisas** (tudo dentro de `C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\temas5\so-adc-bronze-clube\`):
- `final\` — os arquivos prontos para copiar no repo, **nos mesmos caminhos** (6 novos e 8 alterados; ver a seção 10 e os apêndices).
- `prints\` — quadro 0, fim, folhas de quadros da entrada (1440×810 e 405×720), movimento reduzido, página inteira em 1440 e 390, fichas.
- `harness\servidor.mjs` — sobe em `http://localhost:4527/time` e `/ficha/<slug>`. Para rodar, crie a junção `so-adc-bronze-clube\node_modules` → `C:\LeagueOfBronze-precos\node_modules` (`mklink /J`). **Já removi as junções**; se recriar, apague SÓ com `rmdir` (ou `[IO.Directory]::Delete(caminho, $false)`), nunca recursivo: o recursivo entra na junção e apaga o node_modules do repo.
- `copia\` — a cópia do repo usada nos testes (sem junção; pode ser apagada).
- `proto\` e `scripts\` — o protótipo estático e os scripts de medida (fontes, cores, recortes, quadros).

**Antes de implementar (dados, não é código):** o time já está certo no banco e no ar — nome `SO ADC BRONZE CLUBE`, slug `so-adc-bronze-clube`, id `verdante`, escudo `/teams/so-adc-bronze-clube.webp`, fotos `/players/<slug>-4a.webp` (commit 1266ffa) e as rotas TOP bobbie goods, SEL Famoso Parrudao (capitão), MID PRESUNTO, ADC WeSlay, SUP Caçu. Nada a mudar.

**A foto do bobbie goods com o Lula fica, os dois juntos, de zoeira (pedido do Lucas: "depois vamos mudar").** O tema enquadra as duas caras na carta (`foco` 52% 50%) e mostra a foto inteira na ficha (`proporcao` 4/3). Nenhum texto do tema fala dela, e há uma regra do tema que vale para qualquer foto (seção 9): **nenhum alvo, mira ou flecha aponta para uma foto**. Quando a foto mudar, são duas linhas no tema (seção 3.7).

---

## 1. O conceito em uma linha

**Fim de tarde no estande de arco e flecha do clube: três tiros, nenhum acerta a mosca — porque a mosca é o escudo. A única mosca acertada é a do alvo da raia do lado.**

O porquê, tirado do time:
- **ADC é o atirador.** O escudo é quase todo arco e flecha: o arco no alto com a flecha para cima, duas flechas cruzadas, a besta. O estande de arco é o lugar natural do "Só ADC" — e é esporte, não arma.
- **A piada do time é estar fora de posição:** três se inscreveram de ADC e dois foram improvisar no TOP e no MID. No estande isso vira imagem: **a terceira flecha cai na raia do vizinho** (no LoL e no tiro com arco, *lane* é raia). E crava bem na mosca... do alvo errado.
- **«MMR: ???» e «QUERENDO VENCER»** (do escudo) viram a mira duvidosa do Bronze: as flechas acertam o anel branco (1 ponto) e a palha (0). «A mosca segue intacta desde 2024» — o «EST. 2024» do escudo.
- **«Clube» e «Bronze»** viram o vocabulário de clube antigo: os louros do escudo (insígnia do capitão), a placa de bronze de inauguração com a fita cortada (cartela), o letreiro pintado.
- **As fotos são de celular, de verdade e zoeira** (touca de natação, touca de cetim, o cachorrinho, o terno vermelho, o abraço com o Lula). Elas viram as **flechas da aljava**: cada carta é uma flecha fincada no gramado.

---

## 2. Os três conceitos (e por que este venceu)

**A — «A Mosca Intacta» (estande de arco ao entardecer). ESCOLHIDO.**
- Cena: céu da hora azul com a brasa do sol já posto atrás da mata; alvo de palha no cavalete com o escudo no lugar da mosca; raias vizinhas; biruta.
- Gancho de vídeo: o tranco do disparo (a câmera e o nome vibram como corda de arco), flechas cravando com o "tóim" da haste, a terceira cravando na mosca do vizinho, a mosca do clube brilhando intacta.
- Custo: SVG chapado e CSS de transform. Nenhum filtro animado, nenhum blur, nenhuma imagem externa.

**B — «A Jaqueta do Clube» (jaqueta *varsity*).**
- Cena: as costas de uma jaqueta de clube (lã marinho, mangas de couro bronze), o escudo como patch bordado, «SO ADC» em letras de chenille em arco por cima, e os pespontos se costurando.
- Gags: o patch do capitão «C»; a cartela como etiqueta de lavagem («Composição: 100% improviso · Não lavar com tilt»).
- Por que perdeu:
  - textura de tecido convincente em CSS é cara e fica "plástica";
  - o filme é morno (costura e chenille não rendem no WhatsApp);
  - o arco e as flechas do escudo ficariam de fora;
  - e camisa/uniforme é o terreno provável do time de e-sports (OS 5 FURIOSOS).

**C — «A Disputa do Bronze» (pódio, medalha de 3º lugar).**
- Cena: o escudo como medalha de bronze balançando na fita, os louros, o pódio e o quadro de medalhas «OURO 0 · PRATA 0 · BRONZE ∞».
- Por que perdeu:
  - cerimônia com pódio e telão encosta no e-sports (FURIOSOS) e o ouro, na realeza preta e dourada (DESORGANIZAÇÃO);
  - os flashes de fotógrafo estouram o limite de 2 por segundo;
  - fala do "Bronze" e esquece o "ADC".

**Por que A venceu:**
- É a única das três sem vizinho entre os 7 times. É ao ar livre, e nenhum tema tem céu de fim de tarde. Nenhum dos quatro em andamento (academia, e-sports, internet/Poro, leão preto e dourado) passa por arco e flecha.
- É a que mais rende no vídeo: três impactos em 600 ms, todos com movimento físico legível no celular.
- Custa pouco (transform em SVG).
- Usa o escudo inteiro: arco e flechas, louros, «EST. 2024», «MMR: ???» e a plaquinha.

**Por que não é RX, QM nem Galácticos recolorido:**

| | RX | QM | Galácticos | **SO ADC** |
|---|---|---|---|---|
| Lugar | tempestade elétrica | serra à noite | dentro do boteco | **campo aberto ao entardecer (estande)** |
| Luz | raio azul | lua de queijo e farol | lâmpada âmbar e neon | **brasa do sol posto + hora azul** |
| Material do título | cromo | ouro com bisel | chope enchendo | **letreiro pintado creme com extrusão de cobre; «So» em script** |
| Fontes | Exo 2 + Permanent Marker | Bungee + Special Elite | Knewave + Kalam | **Alfa Slab One + Yellowtail** |
| Herói | texto à esquerda | escudo à esquerda | escudo em cima, nome embaixo | **NOME em cima, ALVO embaixo** (eixo invertido, por subgrade) |
| Chão | espelho com grade | trilhos | balcão | **gramado da raia e linha de tiro** |
| Entrada do escudo | cai e o chão treme | chega e freia | brinde | **cravado no alvo: sacode a cada impacto** |
| Câmera | zoom | grua | travelling | **fôlego do arqueiro: puxa e dá o tranco no disparo** |
| Elenco | créditos | vagões | bolachas na lousa | **flechas fincadas no gramado** |
| Capitão | coroa | roda alada | caneco coroado | **louros com a flecha de ouro: ARQUEIRO-CHEFE** |
| Cartela | «em cartaz» | bilhete carimbado | TV + plaquinha | **placa de bronze inaugurada (fita cortada) e «MMR: ???»** |
| Moldura | barras de cinema | faixas de latão | varal + listras | **rajada de flechinhas + linha de tiro** |

---

## 3. O tema (dados)

### 3.1 Fontes (conferidas no `font-data.json` do Next instalado)

**`Alfa Slab One`** (título):
- `weights ["400"]`, `styles ["normal"]`, subsets `latin`, `latin-ext`, `vietnamese`. Uso `latin`, que tem Ã, Ç, É.
- Slab pesada de tipo de madeira: letreiro de clube antigo.
- Onde entra: «ADC» do título, «BRONZE CLUBE», nicks (cartas, ficha, companheiros), números (chips, súmula), títulos de seção, nome da placa e «MMR: ???».
- **Só tem 400.** O `.raiz` declara `--tm-titulo-peso: 400`, `--tm-titulo-estilo: normal` e `font-synthesis: none`.
- **Tem kerning** (PARRUDAO: 6,133 em com kerning, 6,327 sem). Todo texto medido leva `font-kerning: none`, para a largura ser a soma da tabela.

**`Yellowtail`** (assinatura):
- `weights ["400"]`, subsets `latin`, `latin-ext`.
- Script esportivo retrô (o "So" da faixa do escudo).
- Onde entra: o «So» em cima do ADC, o lema, o aviso, o destino e o fecho da placa, e o nome real na ficha.
- **Nunca em caixa alta:** os textos do tema estão em caixa baixa, e o «SO» do nome vira «So» (a 2ª letra recebe `text-transform: lowercase`).

**Largura medida** (Chromium, canvas `measureText` a 100 px, woff2 do Google Fonts) → `lib/temas/metricas.ts`, `ALFA_SLAB_ONE`:
- `padrao: 1.207` (o W, o mais largo); `espacamento: 0.01`; `sobra: 0.22`.
- A sobra cobre a tinta além do avanço: a extrusão de cobre (0,088 em), o contorno (0,035 de cada lado) e uma folga.
- Resultados:
  - `maiorPalavraEm("SO ADC")` = **2,582** (ADC);
  - nicks: Famoso Parrudao **6,627** (FAMOSO / PARRUDAO), bobbie goods **4,53** (BOBBIE / GOODS), PRESUNTO **6,52**, WeSlay **5,109**, Caçu **3,291**;
  - `--maior-palavra-em` do elenco = **6,627**;
  - caractere fora da tabela (ㅤ) = 1,437.
- Vertical: maiúsculas 0,78 em; Á a 0,95; Ã a 1,00; Ç desce 0,25; ascendente 1,04; descendente 0,33.

**A reserva estreita** (como o «Knewave Caixa Alta»):
- `@font-face "Alfa Slab Caixa Alta"` = `local(Arial…)` com `size-adjust: 88%`, e `adjustFontFallback: false` + `fallback: ["Alfa Slab Caixa Alta"]` no next/font.
- Medido: mais estreita em TODA palavra testada — ADC 1,888 contra 2,362 em; PRESUNTO 4,954 contra 6,300; WMW 2,424 contra 3,587; ÃÇÉ 1,840 contra 2,241; dígitos 4,994 contra 6,705.
- Única exceção: o «·» isolado (Arial é mais larga), que nunca aparece sozinho num nick e cabe na sobra.

### 3.2 Cores (`cores` → `--tm-*`; contraste WCAG calculado)

| token | hex | papel | contraste medido |
|---|---|---|---|
| `breu` | `#070B14` | noite no alto do céu, fundo da página | — |
| `ceu` | `#122039` | azul-ardósia do meio do céu | texto 14,1 |
| `abismo` | `#0E1626` | miolo das cartas (atrás da foto) | — |
| `royal` | `#2B4C7E` | hover do OP.GG | — |
| `primaria` | `#E2734A` | cobre do pôr do sol: contraluz, fios (nunca em texto) | — |
| `neon` | `#FF6B7A` | coral das penas e do anel vermelho; halo do capitão | 7,2 no breu |
| `arco` | `#FFD3A8` | anel de foco (damasco) | 14,2 no breu · 12,8 no gramado |
| `nucleo` | `#FFF4E0` | miolo claro (brilho da mosca) | — |
| `texto` | `#F7EEDC` | creme de letreiro | 17,1 breu · 14,1 céu · 8,4 no ponto mais claro do horizonte |
| `prata` | `#E3D6BE` | aviso, nome, fecho | 12,4 gramado · 6,8 horizonte |
| `apoio` | `#B8C2D4` | kicker, créditos, nota | 11,0 breu · 10,3 alto do céu · 5,4 no ponto mais claro do horizonte |
| `acento` | `#FFB37A` | «APRESENTA», «PERFORMANCE…» | 11,2 breu · 9,3 céu |
| `tinta` | `#10131A` | texto sobre creme (placas, etiquetas) | 12,7 na placa creme · 15,7 na placa do capitão |
| `icone` | `#FFC9A0` | ícone de rota no escuro | 13,2 breu · 11,3 no companheiro |

**Cores só do cenário (ficam no CSS):**

| peça | cores |
|---|---|
| céu | `#060A12`→`#0B1324`→`#122039`→`#1C2643`→`#2D2B46`→`#4A2F38`→`#66382C` (horizonte, atrás da mata) |
| mata e serra | `#0B110E` e `#161D30` |
| alvo | branco `#EDE3CA`, preto `#1D212A`, azul `#386AA3`, vermelho `#D4463E`, dourado `#E0A83F` (embaixo do escudo); palha `#D9AD62`→`#7A5426`; cavalete `#4A2E18`/`#7A5232` |
| flechas | haste `#F3DFB8`→`#8E6337`; penas `#FF6B7A`/`#E2505F`; listras coral, creme `#F1E5CB`, marinho `#16233D`; encaixe e ponta `#C98A3E`/`#D9A066` |
| título | face `#FFFAF0`→`#E3C38F`; extrusão `#B8652F`→`#5C2E14` em 8 degraus; contorno `#0A1222`; «So» coral `#FF6B7A` com extrusão vinho `#7A1F2B` |
| gramado | `#121D15`→`#0A100C` com faixas de corte |
| carta | cedro `#C99561`→`#7E4F28`; listras coral/creme/marinho; rodapé `#0B1220` |
| placa | bronze `#6A4022`→`#351D0D`, chanfro `#B9773F`/`#E0A866`; letras `#F6D2A2` |

**Metal = o bronze do escudo e da placa** (sem quebra de bisel):

| luz | alto | meio | sombra | fundo | volta | base | placa |
|---|---|---|---|---|---|---|---|
| `#FFE9C9` | `#F2C38B` | `#C98642` | `#5A2E12` | `#8E5426` | `#E0A866` | `#9C5F2C` | `#E9B57A` |

As variáveis fixas que a RX deixa na base o `.raiz` do cenário redefine: `--tm-placa-topo #fbf3e2`, `--tm-nick-meio` = prata, `--tm-nick-base #d8c39c` (nick sobre a foto: 10,9:1 no pior ponto), `--tm-etiqueta` = tinta, `--tm-foto-fundo` = abismo, `--tm-chip-capitao` = texto, `--tm-mono` = ícone, `--tm-eco-base #0a1222`, `--tm-miolo-*`.

### 3.3 Nome: sufixo e letra por letra
- **`sufixo: "BRONZE CLUBE"`.** `partesDoNome("SO ADC BRONZE CLUBE")` → marca **«SO ADC»**, assinatura **«BRONZE CLUBE»** (testado também em caixa mista: «So ADC» / «Bronze Clube»).
- **`letraPorLetra: true`.** É o que dá as `.palavra` para o «So» virar script e para o último raio de sol correr letra a letra (`--i`).

### 3.4 Cor do time no resto do site: `#FF6B7A`, o coral do alvo e das penas

É a cor da rota ADC do site (`#E85C6A`), acesa (ΔE 5,6 dela, de propósito: «Só ADC»). Contraste **7,1:1** no `#0F0B07` do site.

| time | cor | ΔE2000 |
|---|---|---|
| DESORGANIZAÇÃO (chama) | `#EF7D34` | 23,4 |
| ARCANA | `#9A6AE0` | 32,5 |
| GALÁCTICOS | `#B4C2FF` | 37,0 |
| ÁUREA | `#E0B13C` | 42,6 |
| RX | `#4DA3FF` | 45,2 |
| SEIVA | `#8FC23F` | 64,6 |
| QUEIJO MINAS | `#3EE6F2` | 76,6 |

- O `#3FB27F` da VERDANTE (o verde do draft) sai.
- **Risco:** OS 5 FURIOSOS pode pegar um vermelho (fúria). Os vermelhos prováveis ficam a 4–15 do coral.
- **Plano B, em uma linha:** `#FF8FB1`, o rosa das penas. Fica a ≥ 28 dos sete atuais e a ≥ 15,3 de qualquer vermelho de `#FF3B30` a `#FF6B6B`, com 9,2:1 de contraste.

### 3.5 Cenário: `estande` (palavra nova; `Cenario` e `CENARIOS` ganham a chave)

### 3.6 Textos (`lib/i18n/messages/paginas-home.ts`, chaves planas depois das dos Galácticos, pt e en)

| papel | chave | pt | en |
|---|---|---|---|
| `lema` | `temaSoAdcLema` | 3 ADCs improvisados · querendo vencer | 3 improvised ADCs · trying to win |
| `estrelando` | `temaSoAdcAljava` | A ALJAVA | THE QUIVER |
| `aviso` | `temaSoAdcAviso` | Inscritos como ADC: 3 · jogando de ADC: 1. | Signed up as ADC: 3 · actually playing ADC: 1. |
| `capitao` | `temaSoAdcCapitao` | ARQUEIRO-CHEFE | HEAD ARCHER |
| `emCartaz` | `temaSoAdcEstande` | NO ESTANDE {periodo} | AT THE RANGE {periodo} |
| `destino` | `temaSoAdcFundacao` | Fundado em 2024 · 3 ADCs, 1 bot lane | Founded in 2024 · 3 ADCs, 1 bot lane |
| `carimbo` | `temaSoAdcMmr` | MMR: ??? | MMR: ??? |
| `fecho` | `temaSoAdcFecho` | A mosca segue intacta desde 2024. | The bullseye has been untouched since 2024. |
| `companheiros` | `temaSoAdcFlechas` | AS OUTRAS FLECHAS | THE OTHER ARROWS |

- O lema é a plaquinha do escudo, em caixa baixa (o script não aceita caixa alta).
- A data da placa sai «4ª EDIÇÃO · NO ESTANDE DE 13 DE NOVEMBRO A 6 DE DEZEMBRO».
- «ARQUEIRO-CHEFE» e não «mestre arqueiro»: «Mestre» é elo e confundiria com o Diamante do Parrudão.
- Na tela aparece «ARQUEIRO-CHEFE»; o leitor de tela ouve «CAPITÃO» (`RotuloDoCapitao` da base).

### 3.7 Fotos

São retratos de celular retangulares, **não** avatares: sem `formato: "medalhao"`, `object-fit: cover`. Conferi o enquadramento simulando `cover` + `object-position` em 4:5, 4:3 e 1:1 (`proto\recortes.png`).

| jogador | arquivo | `foco` | o que fica na janela |
|---|---|---|---|
| bobbie goods (TOP) | 1600×1200, **deitada** | `52% 50%` | as **duas caras**: o bobbie e o Lula, em 4:5, 4:3 e 1:1 |
| PRESUNTO (MID) | 1199×1600 | `50% 45%` | o cachorrinho lambendo o focinho e o sorriso |
| WeSlay (ADC) | 1600×1600 | `35% 15%` | o rosto e o terno vermelho (4:5 corta na horizontal; 4:3, na vertical) |
| Caçu (SUP) | 1200×1600 | `50% 18%` | a touca de cetim roxa, os óculos e o biquinho |
| Famoso Parrudao (SEL, cap.) | 900×1600, muito alta | `50% 62%` | a touca de natação inteira e a barba em 4:5; em 4:3, da faixa da touca até a boca |

- `focoPadrao: "50% 30%"`.
- **`proporcao: { "bobbie-goods": "4 / 3" }`:** a ficha mostra a foto inteira (os dois e a bandeira). O resto fica em 4:5 em **toda** largura, porque o cenário desliga o 4:3 da base em 600–899 (a touca do Parrudão sairia cortada).
- **Quando a foto do bobbie mudar:** apague as linhas `"bobbie-goods"` de `foco` e de `proporcao` (ou meça a nova). Sem proporção própria, o X das flechas da ficha volta ao ângulo de 4:5 sozinho.

### 3.8 `lib/temas/so-adc-bronze-clube.ts` (novo; completo no Apêndice A)

`fontes: { titulo: "alfa-slab-one", assinatura: "yellowtail" }`, as cores e o metal acima, `sufixo: "BRONZE CLUBE"`, `letraPorLetra: true`, `cor: "#FF6B7A"`, `cenario: "estande"`, os 9 textos e as fotos acima.

---

## 4. A cena do herói

### 4.1 O gesto de composição: o NOME em cima, o ALVO embaixo (em toda largura)

A ordem visual é kicker → créditos → **título** → **alvo com o escudo** → lema → chips. O DOM não muda.

O `.blocoTexto` vira **subgrade** (`grid-template-rows: subgrid`) de uma grade de 6 linhas do herói:
- kicker na linha 1, créditos na 2, título na 3;
- o `.blocoEscudo` na linha 4;
- lema na 5, chips na 6.

**Pegadinha resolvida (vale anotar):** um contêiner (`container-type`) tem *layout containment* e **não pode ser subgrade**. O contêiner do título (100cqi) sobe para o `.heroiGrade`, e o `.blocoTexto` vira `container-type: normal`. Como a coluna é uma só, o 100cqi continua sendo a largura dela.

- **Sem subgrid** (Chrome < 117, Safari < 16): tudo fica dentro do `@supports`, e a página cai na ordem da base (escudo em cima, nome embaixo). Fica legível.
- **≥ 1024:** o `.heroiGrade` sobe 44 px (`margin-top: -44px`). O kicker e os créditos, centrados, dividem a faixa do «VOLTAR» sem encostar: em 1024 sobram 36 px; em 1440, cerca de 190 px.

### 4.2 Camadas, de trás para a frente

**E = `--escudo`** (o escudo, 1:1):
- abaixo de 600: `clamp(168px, 50vw, 220px)`;
- de 600 a 1023: `clamp(210px, min(34vw, 30svh), 270px)`;
- a partir de 1024: `clamp(200px, min(17vw, 27svh), 290px)`.

**1. Palco (`Fundo`, *sticky*, dentro da câmera da base):**
- **`enfCeu`:** o céu da hora azul.
  - Gradiente vertical do breu (`#060A12`, alto) ao azul-ardósia (`#122039`, 44%), malva (`#2D2B46`, 60%), vinho (`#4A2F38`, 64,5%) e a **brasa** `#66382C` a 66,6%. Daí para baixo, campo escuro (`#0D1410` → `#0A100C`).
  - Mais um brilho elíptico de cobre em (50%, 67%), raio 46%×20%.
  - O ponto mais claro mede 5,4:1 com o `apoio`: nenhum texto fica ilegível passando por ele na rolagem.
- **`enfNuvem` × 3** (2 abaixo de 600):
  - estratos compridos (38vw×3,2vh em 8%/30%; 30vw×2,4vh em 58%/22%; 44vw×2,6vh em 36%/46%);
  - barriga acesa de cobre (`rgba(170,92,64,.32)`) sobre corpo azulado;
  - derivam ±3vw em 70–95 s (infinito, `alternate`).
- **`enfSerra`:** ladrilho SVG de serra baixa `#161D30`, faixa 57,5%–67,1%.
- **`enfMata`:** ladrilho SVG de copas `#0B110E`, faixa 61,6%–67,2%. Cobre a brasa no horizonte.
- A vinheta e o grão continuam os da base.

**2. Moldura** (no padding do herói e da ficha, `--barra: clamp(20px, 2.6vw, 36px)`):
- **`enfRajada`** (no alto):
  - faixa `#070B14` com fio de cobre embaixo;
  - um ladrilho de flechinhas (haste creme 55%, ponta bronze, penas coral) a cada 120 px, a 70% da altura;
  - entra da esquerda no começo do filme.
- **`enfLinhaDeTiro`** (embaixo):
  - gramado `#0C120E` com a linha creme da linha de tiro a 40% da altura;
  - divisores de raia a cada 160 px (o primeiro em 80 px);
  - parada.

**3. Atrás do escudo (`AtrasDoEscudo`, coordenadas em E a partir do centro do escudo):**
- **`enfContraluz`:**
  - disco de 3,3E, `radial-gradient` cobre (`.34`) → vinho (`.16`) → azul (`.06`);
  - parado. É o sol que acabou de se pôr atrás do alvo.
- **`enfAlvo`** (`AlvoDoClube`):
  - SVG `viewBox -92 -92 184 214` (1 unidade = 0,01E), caixa `left -42%; top -42%; 184% × 214%`. O (0,0) do SVG cai no centro do escudo.
  - **Fardo de palha:** r 92, gradiente radial dourado → palha → marrom; 72 traços de palha radiais entre r 81,5 e 91, alternando claros e escuros; borda amarrada.
  - **Face de papel com os anéis:** branco 81–73, preto 73–65, azul 65–57, vermelho 57–49, com fios finos entre as zonas. O **dourado** (r 49) fica embaixo do escudo: **o escudo É a mosca**.
  - 4 alfinetes.
  - **Cavalete:** duas pernas da frente abertas até y 122, a de trás e a travessa em y 100.
  - Diâmetro total 1,84E.
- **`enfFlecha1` e `enfFlecha2`:** flechas cravadas (`FlechaCravada`).
  - O elemento de fora fica na PONTA, com `rotate: 143.13deg` (o eixo local vai da ponta para o arqueiro, embaixo à esquerda).
  - Dentro: `enfFlechaVoo` (o voo), `enfFlechaHaste` (o tremor), o `enfFuro` e 5 `enfLasca`.
  - Caixa 0,5E × 0,15E: haste de madeira, listras pintadas (coral, creme, marinho), penas coral, encaixe de bronze.
  - **A1:** ponta em (−0,545E, −0,545E), no **anel branco** (r 0,77): 1 ponto.
  - **A2:** ponta em (0,862E, 0,12E), na **palha** à direita: 0 ponto.
  - As hastes não passam por cima do escudo: a menor distância do centro, com as penas, é 0,55E, e o escudo vai até 0,49E.
- **≥ 1024 — as raias vizinhas** (`enfVizinho`, `AlvoDaRaia`):
  - face regulamentar inteira (5 cores, mosca com a cruzinha), a 0,44 do tamanho, centro em y −0,06E;
  - `--raia: min(2,45E, 50vw − 0,5E)`, que nunca deixa o alvo passar da tela (em 1024, 412 px; em 1440, 537 px).
- **≥ 1024 — `enfFlecha3`:** a 3ª flecha, cravada **na mosca do alvo da direita** (0,3E × 0,09E).
- **≥ 1024 — `enfBiruta`:**
  - mastro de 1,5E entre o alvo da esquerda e o do clube (`left: 50% − (raia + 0,92E)/2`);
  - saco cônico listrado coral/creme (o cone é um `clip-path` **parado**).
- **< 1024 — `enfFlechaPerdida`:** a 3ª flecha (`FlechaInteira`), que passa reto por cima do alvo em y −1,1E e some pela direita.

**4. O escudo** (`.escudo`, conteúdo).
- **`NoEscudo`:** `enfBrilhoMosca`, um brilho de 4 pontas (22% do escudo) na estrela em (50%, 50,5%).

**5. O chão (`Chao`): `enfGramado`.**
- Começa em y +1,17E (os pés do cavalete pisam nele), 200vw × 2,2E.
- Sombra elíptica do cavalete, faixas de corte e máscara para sumir embaixo.
- O lema e os chips ficam **na frente** do gramado.

**6. O texto (`.blocoTexto`, z 2).** Ver a seção 6.

### 4.3 Medido no render real (depois das entradas; o cabeçalho do harness tem 69 px, como o do site)

| janela | E | ADC (fonte) | ADC (px) | escudo (y) | dobra |
|---|---|---|---|---|---|
| 2560×1440 | 290 | 160 | 378 | 586–876 | ✓ |
| 1920×1080 | 290 | 160 | 378 | 586–876 | ✓ |
| 1440×900 | 243 | 160 | 378 | 565–808 | ✓ |
| **1440×810 (vídeo)** | 219 | 145,8 | 344 | **531–750** | ✓ (810) |
| 1366×768 | 207 | 138,2 | 327 | 511–719 | ✓ |
| 1024×768 | 200 | 138,2 | 327 | 486–686 | ✓ |
| 768×1024 | 261 | 150 | 354 | 581–842 | ✓ |
| 600×960 | 210 | 150 | 354 | 555–765 | ✓ |
| 430×932 | 215 | 120 | 283 | 481–696 | ✓ |
| **405×720 (vídeo)** | 203 | 115,2 | 272 | **467–670** | ✓ (720) |
| 390×844 | 195 | 120 | 283 | 472–667 | ✓ |
| 360×780 | 180 | 120 | 283 | 481–661 | ✓ |
| 320×640 | 168 | 102,4 | 242 | 447–615 | ✓ |

- **A primeira dobra dos dois vídeos tem o nome inteiro e o escudo inteiro** com as flechas.
- O pé do alvo, o lema e os chips ficam logo abaixo (de propósito: o alvo "nasce" da borda).
- `scrollWidth == innerWidth` nas 13 janelas.

### 4.4 O celular não é o computador encolhido

**Abaixo de 600:**
- Sem raias vizinhas nem biruta.
- **O alvo ocupa a largura toda:** 1,84E ≈ 359 px em 390, de ponta a ponta. A palha encosta nas bordas e o corte é do herói (`overflow: clip`).
- O título vai a no máximo `min(120px, 16svh)`.
- A 3ª flecha não tem onde cravar: **passa reto** e sai pela direita, "para a raia do vizinho".
- Duas nuvens.
- O chip do capitão vira texto corrido quebrando entre palavras abaixo de 420; o OP.GG ocupa a linha (base).

**De 600 a 1023:** o mesmo eixo, E maior, ainda sem vizinhos.

**A partir de 1024:** o tríptico do estande (raia 1, alvo do clube, raia 3) e a biruta. O 3º tiro acerta a mosca do vizinho.

---

## 5. A entrada (o filme de 0 a ~3 s)

**Quadro 0 (o pôster; print `prints\time-1440x810-quadro0.png`, congelado desde o carregamento):**
- céu já de fim de tarde, câmera 6% mais perto;
- o NOME inteiro e legível: o ADC puxado (`skewX −7°`, `scaleX .95`) e o BRONZE CLUBE 0,25 em à esquerda;
- o escudo inteiro, 2% abaixo e girado −3°, no centro do alvo;
- alvos e raias no lugar; biruta murcha;
- **sem flechas, sem furos**, sem a rajada (fora da tela à esquerda).

Nenhum enfeite cobre conteúdo.

### Herói (ms)

| ms | conteúdo (só transform; a pintura nunca esconde) | enfeite (aria-hidden) |
|---|---|---|
| 0–700 | — | **rajada**: a faixa de flechinhas entra da esquerda (`translateX(-100%)` → 0) |
| 0–480 | o NOME é puxado como corda de arco (`corda`) | **fôlego**: a câmera aproxima (1,06 → 1,075) e desce |
| **480–544** | **o NOME SOLTA**: estica (`scaleX 1,035`, `skewX 3,5°`) | **o tranco**: a câmera volta de uma vez (escala 1, sobe 0,35%) |
| 544–1024 | o nome vibra e amortece (−1,8°, 1°, −0,4°) | — |
| 0–1500 | — | **biruta** enche (murcha até 300, passa do ponto a 930, assenta em 1500) |
| 528–**640** | o BRONZE CLUBE avança junto (576–928) | **a flecha do nome** voa da esquerda (−160vw) e **crava embaixo do BRONZE CLUBE**; vibra até 992 |
| 560–**700** | **o escudo sacode para a direita** (704: 1,2%, 1,6°) | **A1** voa da câmera (`scale 1,9` → 1) e crava no **anel branco**; furo e 5 lascas de palha; a haste vibra até 1344 (7°, −5°, 3,2°, −1,8°, 0,8°); o alvo treme |
| 859–**1000** | **o escudo sacode para a esquerda** (1008: −0,8%, −1,2°) e assenta em 1600 | **A2** crava **na palha**; furo, lascas, tremor até 1634; o alvo treme |
| 1160–**1300** | — | ≥1024: **A3 crava na MOSCA do alvo da raia da direita** (tremor até 1800); <1024: passa reto por cima do alvo (1152–1440) e some pela direita |
| 1225–1800 | lema e chips sobem (o `.sobe` da base) | — |
| **1935** | — | **a mosca intacta brilha**: estrela de 4 pontas na estrela do escudo (único flash; repete a cada 9 s) |
| 2200–3040 | **o último raio de sol** atravessa A, D e C uma vez, letra a letra (`background-position`) | — |

**Depois do filme (infinitas):**
- nuvens (3 no computador, 2 no celular), 70–95 s;
- biruta tremulando (≥1024), 2,6 s;
- brilho da mosca, 9 s;
- halo do arqueiro-chefe (o da base), 3,2 s.

São 6 no computador e 4 no celular, todas transform ou opacidade em peças pequenas. Nenhum filtro animado, nenhum blur, nenhum `mix-blend-mode`.

**Flashes:**
- **um só**: o brilho da mosca (~48 px), a cada 9 s;
- os impactos não acendem nada (são movimento);
- a rajada e a biruta não piscam.

---

## 6. O título

O nome se monta como o logo de um clube antigo:

```
        So          ← script coral (Yellowtail), 0,4 em, girado −7°
       ADC          ← letreiro creme com extrusão de cobre (Alfa Slab One)
   BRONZE CLUBE     ← caixa alta espaçada (Alfa), 0,215 do ADC
 ━━━━━━━━━━━━━━━➤   ← a flecha do nome (TracoDoNome)
```

**A marca:**
- `.marca` é `inline-flex` em coluna: as palavras empilham. O espaço entre elas é texto em branco, que não vira item flex.
- Tamanho: `--tam = clamp(44px, 100cqi / --largura-em, máx)`; com a métrica, `--largura-em: 2.582`.
- `font-kerning: none`, `letter-spacing: 0.01em`, `line-height: .9`.

**A face (`.cromo`):**
- creme de letreiro pintado (`#FFFAF0` → `#E3C38F`) por `background-clip: text`;
- **a tinta garantida (`color: #f3e3c3`) vem antes do clip**.

**A extrusão (`.eco`, atrás de toda face):**
- 8 degraus de `text-shadow` de 0,011 em, escurecendo do cobre `#B05F2C` ao `#5C2E14`;
- mais o contorno marinho (`-webkit-text-stroke: .07em #0A1222`) e uma sombra macia;
- folga de tinta: `padding .16em .18em .22em .06em` com a margem negativa igual.

**O «So»** (`.palavra:first-child:not(:last-child)`, só quando o nome tem 2 palavras ou mais):
- Yellowtail a 0,4 em, coral `#FF6B7A`, extrusão vinho curta, `rotate: -7deg` parado;
- a 2ª letra em `lowercase`, e «SO» vira «So», como na faixa do escudo;
- não entra na conta da largura: a maior palavra é o ADC.

**A assinatura:**
- «BRONZE CLUBE» em Alfa a `max(16px, 0,215 × tam)`, `letter-spacing .16em`, creme com sombra marinha;
- **a flecha do nome** (`FlechaInteira`, 122% da largura): voa da esquerda e crava embaixo dele aos 640 ms.

**A entrada:**
- `corda` (puxa, solta aos 544 ms, vibra);
- o último raio de sol, uma vez, letra a letra, com a cascata pela **duração** (`2600ms + --i × 110ms`; a espera mora no keyframe, 0–78%).
- **Tudo em transform 2D:** o `translate3d` com `background-clip:text` some no WebKit (lição da QM).

**O título no ar (contraste):**
- creme sobre o céu: 9,7:1 no pior ponto da face (`#E3C38F` no `#122039`);
- extrusão e contorno: 3,8:1 contra o céu (≥ 3, título grande);
- «So» coral no céu: 5,9:1.

---

## 7. O elenco: «A ALJAVA»

**Título e aviso:**
- «A ALJAVA» em Alfa (28–44 px) com sombra marinha.
- O fio do título da base vira **uma flecha**: penas coral à esquerda, haste creme → cobre, ponta de bronze à direita.
- O aviso é Yellowtail 19–24 px, prata: «Inscritos como ADC: 3 · jogando de ADC: 1.»

**`AtrasDoElenco`: `enfCampo`.**
- O gramado da raia (faixas de corte) começa embaixo do aviso e vai até o fim da seção.
- Em cima dele fica o céu do palco: as flechas estão fincadas no campo ao entardecer.

**A carta é uma FLECHA FINCADA no gramado** (`--pena`: 52 px; 40 abaixo de 600):

| peça (gancho) | o que vira |
|---|---|
| `.casca::before` | **as penas**: duas coral (barbas claras) e a central creme, com o encaixe de bronze no topo. `min(46%, 104px)` de largura × `--pena`, saindo de cima da carta |
| `.casca::after` | **o toco da haste** entrando num **montinho de terra**, com sombra e capim (`min(80%, 190px)` × 44 px), embaixo da carta |
| `.carta` | **tábua de cedro**: gradiente de madeira com veios, `padding 16px 4px 4px`, cantos 10/6 px; nos 16 px de cima, as **listras pintadas** da flecha (*cresting*: coral, creme, marinho). `container-type: inline-size` para o nick |
| `.miolo` | abismo, cantos 6/3 px |
| `.foto` | **retrato 4:5 em `cover`** com o `--foco` do jogador; `saturate(.96) contrast(1.04)` parado; véu escuro embaixo (`.enfGradacao`) para o nick |
| `.etiquetaRota` | **placa creme de raia** (tinta, 12,7:1) |
| `EloCrest` | o da base, no canto direito |
| `.nick` | Alfa em caixa alta, `--nick = clamp(15px, (100cqi − 28px) / 6,627, 26px)`: todas no mesmo tamanho, quebrando só entre palavras. **Sem filter, transform nem position** (o link continua esticado na carta inteira) |
| `.rodape` | faixa `#0B1220`: o nome em prata (13:1) e «FICHA →» em coral (6,8:1) |
| `.enfRotaGigante` | some (o estande não tem número de raia gigante) |

Giros parados de −0,8° e 0,9° alternados (o capitão a 0°). O pivô é o pé: são flechas tortas no chão.

**O arqueiro-chefe (o capitão, por último):**
- penas **douradas**, listras de ouro e moldura de **bronze polido**;
- **`LourosDaFlecha`** (a insígnia, `viewBox 0 0 120 100`) em volta das penas: `clamp(84px, 50%, 120px)`, a `−(pena + 34px)`.
  - A coroa de louros de bronze: dois ramos em U, 5 folhas de cada lado, em gradiente.
  - A **flecha de ouro** atravessando na diagonal: penas coral embaixo à esquerda, ponta clara em cima à direita.
  - A **estrela do escudo** no nó dos ramos.
- ≥1024: erguido 14 px (base).
- **Celular:** deitado na largura toda (`.cascaLarga` da base), com a foto em **4:3**. Cabe a touca e o rosto do Parrudão. Nick até 30 px.
- **`FlechaMini`** (24×24, `currentColor`): os dois ramos e a flecha, nos chips, placas e companheiros.

**A entrada por rolagem: a flecha cai e CRAVA.**
- De `translate(0, −30px) rotate(−2,5°)`, bate a 62% (3 px, 1,4°), vibra (−0,9°, 0,4°) e assenta.
- `animation-timeline: view()`, `entry 0% → entry 65% + coluna × 12%`.
- Sem `view()`: pelo relógio (`2000ms + --i × 150ms`, espera 0–58% dentro do keyframe).
- O "de onde" é **de cima**: 30 px, e o vão entre as linhas (`--pena + 54px`) é maior que isso. Nada encosta na fila de cima.

**Medido:**

| largura | carta | nick |
|---|---|---|
| ≥ 1366 | 237 × 340 | 26 px |
| 1024 | 185 × 276 | 21,8 px |
| 768 | 235 × 339 | 26 px |
| 600 | 178 × 268 | 20,9 px |
| 390 | 178 × 267 | 20,8 px (capitão deitado 358 × 320) |
| 360 | 162 × 248 | 18,6 px |
| 320 | 142 × 223 | 15,5 px |

FAMOSO / PARRUDAO e BOBBIE / GOODS quebram em 2 linhas; PRESUNTO cabe inteiro até em 320.

---

## 8. A cartela (a placa de bronze) e a ficha

### Cartela
- **`enfLinhaCromo`:** duas flechas mirando a insígnia mini, uma de cada lado (penas coral para fora, pontas de bronze para dentro).
- **`.cartelaCorpo` vira a PLACA DE BRONZE** de inauguração do clube:
  - bronze fundido escovado (`#6A4022` → `#351D0D`);
  - chanfro duplo por `box-shadow` inset (`#B9773F`, `#3A200E`, `#E0A866`): não ocupa layout;
  - 4 parafusos (gradientes radiais nos cantos);
  - `min(100% − 40px, 640px)`; no celular, `100% − 44px`.
- **`NaCartela`: `enfPlaca`.**
  - Dois **ramos de louro em relevo** (`Louro`, 12% de largura) nos cantos de baixo (somem abaixo de 600).
  - As **duas pontas da fita inaugural, já cortada** (`FitaCortada`: coral, rabo de andorinha, presas num anel), penduradas para fora das laterais. Nunca cobrem texto.
  - Quando a placa entra na tela, as pontas **balançam e assentam** (`fitaBalanca` por `view()`, −38° → 14° → −6° → 2° → 0). Sem `view()`, ficam paradas, penduradas.
- **O texto da placa:**

| linha | estilo | contraste |
|---|---|---|
| escudo | 84 px (64 no celular), com sombra de relevo | — |
| nome | Alfa 22–36 px, **letras em relevo** `#F6D2A2`, `text-wrap: balance` | 6,2 no bronze claro · 9 no escuro |
| destino | Yellowtail: «Fundado em 2024 · 3 ADCs, 1 bot lane» | 6 |
| data | caixa alta espaçada da base, `#E7C79F` | 5,5 |
| carimbo | **medalhão oval cunhado** «MMR: ???» (Alfa 16 px, `#FFE3BD`, aro duplo) | 6 |

- **Fora da placa:**
  - o fecho «A mosca segue intacta desde 2024.» em Yellowtail, prata;
  - os links em seta (`VER CALENDÁRIO →` em seta vazada coral, `TODOS OS TIMES` com o «VOLTAR» da base).

### Ficha (`/jogadores/[slug]`)

**O retrato: a FOTO OFICIAL DO SÓCIO.**
- Passe-partout creme de 10 px, fio marinho, **aro coral**, fio marinho, sombra longa.
- **4:5 em toda largura** (o da base é 4:3 em 600–899); o bobbie, 4:3 (`proporcao`).
- `min(100% − 96px, 400px)`; abaixo de 900, `min(100% − 80px, 330px)`. Fica com folga para as flechas.

**`AtrasDoRetrato`: as DUAS FLECHAS CRUZADAS do escudo** (`FlechaInteira`):
- atrás da foto, pontas para cima, penas embaixo;
- `rotate −54°` e `−126°`, 132% de comprimento, `inset −16% −18%`.
- **Foto deitada:** o X abre (−34°/−146°) e encurta (118%) por `:has(.retratoMiolo[style*="--proporcao"])`, para as pontas não subirem no «VOLTAR».
- **Nenhuma flecha passa NA FRENTE da foto.**

**O arqueiro-chefe na ficha:** a insígnia de 112 px a −84 px, e a placa marinho com fio coral «ARQUEIRO-CHEFE» na foto.

**O nick:**
- Alfa com a mesma extrusão de cobre do título, `100cqi / --largura-nick-em` (30–92 px; ≥ 900, 40–112 px);
- 2 linhas no máximo, só entre palavras: `inline-grid`, eco e cromo na mesma célula, `text-wrap: balance`.

| largura | Famoso Parrudao | bobbie goods | PRESUNTO | WeSlay | Caçu |
|---|---|---|---|---|---|
| 1440 | 98,7 / 2 | 112 / 2 | 100,3 / 1 | 112 / 1 | 112 / 1 |
| 1024 | 78,5 / 2 | 112 / 2 | 79,7 / 1 | 101,8 / 1 | 112 / 1 |
| 768 | 92 / 2 | 92 / 2 | 92 / 1 | 92 / 1 | 92 / 1 |
| 390 | 54 / 2 | 79 / 2 | 54,9 / 1 | 70,1 / 1 | 92 / 1 |
| 320 | 43,5 / 2 | 63,6 / 2 | 44,2 / 1 | 56,4 / 1 | 87,5 / 1 |

Em todas as larguras: dentro da coluna, sem estouro.

**Chips:** placas em seta (rota e elo em marinho com fio coral, pontos em placa creme, OP.GG em seta vazada).

**Estatísticas: a SÚMULA presa na prancheta.**
- A lista vira uma folha pautada creme, torta −0,6° (parada).
- O prendedor de metal é o `::before`.
- As células têm divisórias finas, o valor em Alfa marinho (11,6:1) e o rótulo em sépia 700 (8:1). «100%» cabe.
- **Cada número é ANOTADO:** desce 5 px e assenta, em cascata (a duração vem do `.sobe` da base). O título «PERFORMANCE NO CAMPEONATO» não sobe.

**Companheiros: «AS OUTRAS FLECHAS».**
- Cada link é **uma flecha que aponta para a ficha do outro**: penas coral à esquerda (`::before` do `li`), a foto como o encaixe, rota e nick na haste marinho, ponta de bronze à direita (`::after` do link).
- No hover a flecha **avança** 4 px.
- **Uma coluna abaixo de 600**, para FAMOSO PARRUDAO caber inteiro. O nick nunca parte no meio (`overflow-wrap: normal`; o protótipo com 2 colunas partia «PRESUN/TO»).
- 2 colunas de 600 a 899, 4 a partir de 900.

**Entrada da ficha:**
- A foto **crava**: cai 14 px girada −2°, bate aos 450–660 ms, assenta em 1500.
- A flecha cruzada A crava aos 364 ms e a B aos 504 ms (cada uma entra pelo próprio eixo, vindo de baixo, e treme).
- **O nick leva o tiro:** puxado até 420, solta aos 504 junto com a B e vibra até 840.
- Kicker, nome real e chips sobem (base); as anotações caem de 1178 a 1810.

---

## 9. Movimento reduzido, contraste, foco, leitor de tela, riscos

**Movimento reduzido** (print `prints\time-1440x810-reduzido.png`): o `.raiz *` da base para tudo e fica o **pôster FINAL**:
- flechas cravadas com os furos;
- ≥1024, a 3ª na mosca do vizinho;
- biruta cheia, fitas penduradas, flechas cruzadas no lugar, cartas no lugar.

Somem as lascas, o brilho da mosca e a flecha que passa reto (abaixo de 1024).

**Contraste (WCAG):** todo texto ≥ 4,5:1, título grande ≥ 3:1 com contorno (tabelas nas seções 3.2 e 8).
- Pior texto pequeno: `apoio` sobre o ponto mais claro do horizonte, 5,4.
- Na placa: a data, 5,5.
- Cor do time no site: 7,1.
- `forced-colors`: face e «So» em `CanvasText`, extrusão some.
- `prefers-contrast: more`: face creme sólida `#FFF6E6`, e a extrusão com contorno **continua** (ajuda).

**Foco do teclado** (base): anel `2px solid #FFD3A8` com folga de 3–4 px.
- Contra o escuro: 14,2 no breu, 12,8 no gramado. O anel da carta fica na casca, fora da madeira.
- Nada focável tem máscara: as setas dos chips são `clip-path` no `::before` e a ponta dos companheiros é `::after`.

**Leitor de tela** (teste novo):
- o `h1` lê «SO ADC BRONZE CLUBE» uma vez; as 5 letras, a flecha do nome e os enfeites ficam aria-hidden;
- «ARQUEIRO-CHEFE» é aria-hidden; o leitor ouve «CAPITÃO» na placa, no chip e nos companheiros;
- os ids dos SVG não se repetem (todos com prefixo).

**Riscos e como foram evitados:**
1. **Foto como alvo.** A regra do tema é que nenhum alvo, mira ou flecha aponta para uma foto. As fotos são as próprias flechas (cartas e companheiros) ou ficam na frente das flechas cruzadas (ficha). Os alvos só têm o escudo do clube e palha. Isso vale em dobro com a foto do bobbie, que tem uma pessoa pública. **Nenhum texto do tema comenta a foto**, e nada de bandeira ou política no cenário.
2. **Subgrade + contêiner:** resolvido subindo o contêiner (seção 4.1); sem subgrid, a ordem da base.
3. **`:has([style*="--proporcao"])`** depende do React escrever `--proporcao:4 / 3` no `style` (conferido no SSR). Se a base mudar isso, o X da foto deitada volta ao ângulo de 4:5: fica atrás da foto e só sobe um pouco mais.
4. **Kerning da Alfa:** desligado em todo texto medido. Se alguém religar, o texto fica 3% MAIS ESTREITO que a conta: nunca corta.
5. **WebKit:** `background-clip:text` com `translate3d` some; todas as entradas de conteúdo são 2D (`translate`).
6. **Minificador do build:** nenhuma regra mistura `translate:`/`rotate:`/`scale:` com `transform:` literal. Quem gira parado e quem voa são elementos diferentes: flecha → voo → haste, perdida → voo, cruzada → voo. O lightningcss conta igual antes e depois nos dois módulos.
7. **A 3ª flecha no lugar certo:** a raia vizinha e a flecha 3 usam a MESMA `--raia`, calculada no `.blocoEscudo`. O alvo nunca passa da tela.
8. **Cor:** se o FURIOSOS ficar vermelho, troque para `#FF8FB1` (seção 3.4).
9. **Quadro 0 nos prints:** `document.getAnimations()` NÃO devolve animação que já terminou (a rajada de 700 ms escapava e o "quadro 0" saía com ela no lugar). Para o pôster de verdade, congele pelo DevTools antes de carregar (`Animation.setPlaybackRate(0)` via CDP), como fazem `scripts\captura.cjs` e `quadros.cjs`.

---

## 10. Implementação

### Arquivos (todos em `final\`, nos mesmos caminhos do repo)

| | arquivo | o quê |
|---|---|---|
| novo | `lib/temas/so-adc-bronze-clube.ts` | o tema (seção 3) |
| novo | `components/times/cenarios/estande.tsx` | o cenário (peças) |
| novo | `components/times/cenarios/ornamentos-estande.tsx` | os SVG: `AlvoDoClube`, `AlvoDaRaia`, `FlechaCravada`, `FlechaInteira`, `LourosDaFlecha`, `FlechaMini`, `Louro`, `FitaCortada` |
| novo | `components/times/cenarios/estande.module.css` | página: palco, moldura, herói, título, chips, elenco, cartela |
| novo | `components/times/cenarios/estande-ficha.module.css` | ficha: retrato, flechas cruzadas, nick, súmula, companheiros |
| novo | `tests/times/tema-so-adc-bronze-clube.test.tsx` | o teste do tema (abaixo) |
| muda | `lib/temas/tipos.ts` | `ChaveDeFonte` + `"alfa-slab-one" \| "yellowtail"`; `Cenario` + `"estande"` |
| muda | `lib/temas/registro.ts` | `TEMA_SO_ADC_BRONZE_CLUBE` em `TEMAS` |
| muda | `lib/temas/metricas.ts` | `ALFA_SLAB_ONE` e a entrada em `METRICAS` |
| muda | `components/times/fontes-dos-temas.ts` | `Alfa_Slab_One` (com a reserva) e `Yellowtail` |
| muda | `components/times/cenarios/index.ts` | `estande: ESTANDE` |
| muda | `lib/i18n/messages/paginas-home.ts` | as 9 chaves `temaSoAdc*` em pt e en |
| muda | `tests/stubs/next-font-google.ts` | `Alfa_Slab_One` e `Yellowtail` |
| muda | `tests/times/temas-sem-opacidade.test.ts` | as entradas de conteúdo novas: `cravado`, `corda`, `assinaturaPuxa`, `crava`, `cravaRelogio`, `retratoCrava`, `nickAcertou`, `anota` |

- **Nenhum arquivo da base muda:** `pagina-do-time-com-tema.tsx`, `ficha-do-jogador-com-tema.tsx`, `tema.module.css`, `ficha.module.css`, `palco.tsx` e `util.ts` ficam como estão. RX, QM e Galácticos não ganham nada (o teste confere).
- **Os outros 4 temas mexem nos mesmos 8 arquivos compartilhados.** Os conflitos de merge são só de linhas acrescentadas (listas, uniões de tipo, chaves): resolva somando.

### O teste novo (`tests/times/tema-so-adc-bronze-clube.test.tsx`, verde)
- **Registro:** o slug acha o tema e `verdante` sozinho não; `corDoTime` dá `#FF6B7A` (e `#3fb27f` sem o slug); `partesDoNome` em maiúsculas e em caixa mista; textos em pt e en.
- **Métrica:** ADC 2,582; `padrao` ≥ todo avanço; ㅤ 1,437; nicks 6,627 / 4,53 / 6,52 / 5,109 / 3,291; a reserva a 88% e o `font-kerning: none` no CSS.
- **Página:**
  - `h1` lido uma vez, com 5 `.letra`, 2 `.palavra` e `--largura-em:2.582`;
  - ordem bobbie goods, PRESUNTO, WeSlay, Caçu, Famoso Parrudao, com `--maior-palavra-em:6.627`;
  - `--foco` do bobbie (52% 50%) e do Parrudão;
  - os 8 textos; «CAPITÃO» para o leitor, nunca «ARQUEIRO-CHEFE»;
  - as peças do estande presentes e nenhuma dos outros cenários;
  - mais de 30 enfeites, todos aria-hidden e sem texto;
  - ids de SVG únicos.
- **Os outros temas:** RX, QM e Galácticos sem alvo, flecha, placa nem rajada.
- **Ficha:** `h1` com `--largura-nick-em:6.627`; «AS OUTRAS FLECHAS» com os 4; a foto do bobbie com `--proporcao:4 / 3`; «CAPITÃO» no link do capitão; flechas cruzadas aria-hidden.
- **«O último raio de sol é pintura que nunca esconde»:** o keyframe só mexe em `background-position`, e há tinta sólida antes do `background-clip`.

### Verificar (como o projeto manda)
1. `npx vitest run tests/times`, `npx tsc --noEmit`, `npm run lint`, `npm run build` (toda rota `ƒ`). O build ainda não rodou: valida o `@supports (grid-template-rows: subgrid)` e o `:has()` no pipeline do Next. O lightningcss com `minify` + `cssModules` já passou nos dois módulos.
2. Prints em 360, 390, 768, 1024 e 1440: quadro 0 (congelado desde o carregamento), fim, movimento reduzido, `forced-colors`, `prefers-contrast: more`. Compare RX, QM e Galácticos antes e depois (`.sim/comparar-paginas.cjs`); o HTML deles não muda.
3. **Safari:** `background-clip:text` com o `skewX` da corda; `subgrid` (16+); `container-type` no `.heroiGrade`. **Firefox sem `view()`:** cartas pelo relógio, fitas paradas.
4. Aba em segundo plano: abrir e voltar; nada fica preso (sem fill-mode em conteúdo).

### Vídeo (pedido do Lucas)

Gravar de produção, depois do deploy: `node .sim/video-tema.cjs https://www.leagueofbronze.xyz computador <saida>.mp4 so-adc-bronze-clube famoso-parrudao` e o mesmo com `celular` (1440×810 e 405×720, medidos na seção 4.3).

**Roteiro:**
- **0–3 s:** a rajada; a câmera respira e dá o tranco; o nome vibra como corda; a flecha do nome crava; A1 no anel branco, A2 na palha; A3 na mosca do vizinho (no celular, passa reto); a mosca do clube brilha intacta; o último raio de sol no ADC.
- **3–6 s:** a biruta tremulando, as nuvens; rolagem lenta até «A ALJAVA»: as flechas-cartas cravam no gramado uma a uma, e os louros do arqueiro-chefe.
- **6–9 s:** a placa de bronze entra, as fitas cortadas balançam, «MMR: ???», «A mosca segue intacta desde 2024».
- **Fecho com 4 s da ficha do capitão (Famoso Parrudao):** a foto crava, as duas flechas cruzam, o nick leva o tiro em duas linhas, a súmula se anota.

Sugiro o capitão e não o bobbie porque a foto com o Lula é provisória ("depois vamos mudar"), e o vídeo fica para sempre no grupo. Se o Lucas quiser o bobbie, é só trocar o slug.

---

## Apêndice A — os arquivos novos (completos, como rodaram)

Cópias idênticas em `final\` (mesmo caminho do repo).

### `lib/temas/so-adc-bronze-clube.ts`

```ts
import type { TemaDoTime } from "@/lib/temas/tipos";

/**
 * SO ADC BRONZE CLUBE — «A Mosca Intacta» (27/10/2026).
 *
 * Do escudo: o brasão redondo marinho e bronze com a faixa «So ADC Bronze Clube» (sem acento, como
 * eles escreveram), o arco com a flecha para cima e as duas flechas cruzadas, a estrela no hexágono,
 * os louros, «EST. 2024», «MMR: ???» e a plaquinha «3 ADCs IMPROVISADOS • QUERENDO VENCER». A piada
 * do time: três se inscreveram como ADC (atirador) e dois tiveram de improvisar (bobbie goods no TOP,
 * PRESUNTO no MID). A página é o fim de tarde no estande de arco e flecha do clube: o escudo é a mosca
 * do alvo, as flechas acertam tudo menos ela — e a única mosca acertada é a do alvo da raia do lado.
 * O ouro aqui é BRONZE de clube (placa, louros) e o vermelho é o do alvo e das penas.
 */
export const TEMA_SO_ADC_BRONZE_CLUBE: TemaDoTime = {
  slug: "so-adc-bronze-clube",
  fontes: { titulo: "alfa-slab-one", assinatura: "yellowtail" },
  cores: {
    breu: "#070B14",
    ceu: "#122039",
    abismo: "#0E1626",
    royal: "#2B4C7E",
    primaria: "#E2734A",
    neon: "#FF6B7A",
    arco: "#FFD3A8",
    nucleo: "#FFF4E0",
    texto: "#F7EEDC",
    prata: "#E3D6BE",
    apoio: "#B8C2D4",
    acento: "#FFB37A",
    tinta: "#10131A",
    icone: "#FFC9A0",
  },
  // O "metal" é o bronze do escudo e da placa (sem a quebra de bisel: aqui ninguém é cromo).
  metal: {
    luz: "#FFE9C9",
    alto: "#F2C38B",
    meio: "#C98642",
    sombra: "#5A2E12",
    fundo: "#8E5426",
    volta: "#E0A866",
    base: "#9C5F2C",
    placa: "#E9B57A",
  },
  sufixo: "BRONZE CLUBE",
  letraPorLetra: true,
  // O coral da rota ADC aceso (o vermelho do alvo e das penas). O #3fb27f da VERDANTE era o verde do
  // draft; este fica a ≥ 23,4 de todos os outros sete (7,1:1 no fundo do site).
  cor: "#FF6B7A",
  cenario: "estande",
  textos: {
    lema: "temaSoAdcLema",
    estrelando: "temaSoAdcAljava",
    aviso: "temaSoAdcAviso",
    capitao: "temaSoAdcCapitao",
    emCartaz: "temaSoAdcEstande",
    destino: "temaSoAdcFundacao",
    carimbo: "temaSoAdcMmr",
    fecho: "temaSoAdcFecho",
    companheiros: "temaSoAdcFlechas",
  },
  fotos: {
    focoPadrao: "50% 30%",
    foco: {
      // Deitada 4:3: as DUAS caras (o bobbie e o abraço) na janela 4:5 — o Lucas quer os dois juntos.
      "bobbie-goods": "52% 50%",
      presunto: "50% 45%", // o cachorrinho e o sorriso
      weslay: "35% 15%", // o rosto e o terno vermelho
      cacu: "50% 18%", // a touca de cetim, os óculos e o biquinho
      "famoso-parrudao": "50% 62%", // a touca de natação e a barba, sob o guarda-sol
    },
    // A ficha mostra a foto inteira (os dois juntos, com a bandeira).
    proporcao: { "bobbie-goods": "4 / 3" },
  },
};
```

### `components/times/cenarios/estande.tsx`

```tsx
import type { CSSProperties } from "react";

import ef from "@/components/times/cenarios/estande-ficha.module.css";
import e from "@/components/times/cenarios/estande.module.css";
import {
  AlvoDaRaia,
  AlvoDoClube,
  FitaCortada,
  FlechaCravada,
  FlechaInteira,
  FlechaMini,
  Louro,
  LourosDaFlecha,
} from "@/components/times/cenarios/ornamentos-estande";
import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
import { cx } from "@/components/times/util";

/** As nuvens da hora azul: x, y (% do palco), largura, altura, duração (s) da deriva. */
const NUVENS: readonly (readonly [string, string, string, string, number])[] = [
  ["8%", "30%", "38vw", "3.2vh", 80],
  ["58%", "22%", "30vw", "2.4vh", 95],
  ["36%", "46%", "44vw", "2.6vh", 70],
];

/** As lascas de palha que voam em cada impacto: ângulo (graus). Uma vez. */
const LASCAS = [-150, -116, -82, -48, -14] as const;

/** Uma flecha cravada: a ponta é o lugar do elemento; o voo e o tremor animam por dentro. */
function Flecha({ classe, id }: Readonly<{ classe: string; id: string }>) {
  return (
    <span className={cx(e.enfFlecha, classe)} aria-hidden="true">
      <span className={e.enfFlechaVoo}>
        <span className={e.enfFlechaHaste}>
          <FlechaCravada id={id} />
        </span>
      </span>
      <span className={e.enfFuro} />
      {LASCAS.map((a) => (
        <span key={a} className={e.enfLasca} style={{ "--a": `${a}deg` } as CSSProperties} />
      ))}
    </span>
  );
}

/**
 * Cenário "estande" — SO ADC BRONZE CLUBE, «A Mosca Intacta»: fim de tarde no estande de arco e
 * flecha do clube. O NOME fica no alto («So» em script, ADC de letreiro com extrusão de cobre,
 * BRONZE CLUBE em cima de uma flecha) e, embaixo, o alvo de palha com o ESCUDO no lugar da mosca.
 * Três flechas: uma no anel branco, uma na palha — e a terceira na mosca... do alvo da raia do lado
 * (≥1024; no celular ela passa reto). A mosca do clube segue intacta e brilha. O elenco são flechas
 * fincadas no gramado; o capitão, o ARQUEIRO-CHEFE, leva os louros com a flecha de ouro; a página
 * fecha na placa de bronze inaugurada, «MMR: ???».
 */
export const ESTANDE: CenarioDoTema = {
  classes: e,
  classesDaFicha: ef,
  Fundo: () => (
    <>
      <div className={e.enfCeu} />
      {NUVENS.map(([x, y, w, h, dur]) => (
        <span
          key={x}
          className={e.enfNuvem}
          style={{ "--x": x, "--y": y, "--w": w, "--h": h, "--dur": `${dur}s` } as CSSProperties}
        />
      ))}
      <div className={e.enfSerra} />
      <div className={e.enfMata} />
    </>
  ),
  // A rajada de flechinhas no alto e a linha de tiro pintada embaixo.
  Moldura: () => (
    <>
      <span className={e.enfRajada} aria-hidden="true" />
      <span className={e.enfLinhaDeTiro} aria-hidden="true" />
    </>
  ),
  AtrasDoEscudo: () => (
    <>
      <span className={e.enfContraluz} aria-hidden="true" />
      <div className={cx(e.enfVizinho, e.enfVizinhoEsq)} aria-hidden="true">
        <AlvoDaRaia id="sa-raia-1" />
      </div>
      <div className={cx(e.enfVizinho, e.enfVizinhoDir)} aria-hidden="true">
        <AlvoDaRaia id="sa-raia-3" />
      </div>
      <div className={e.enfBiruta} aria-hidden="true">
        <span className={e.enfBirutaSaco} />
      </div>
      <div className={e.enfAlvo} aria-hidden="true">
        <AlvoDoClube id="sa-alvo" />
      </div>
      <Flecha classe={e.enfFlecha1} id="sa-flecha-1" />
      <Flecha classe={e.enfFlecha2} id="sa-flecha-2" />
      <Flecha classe={e.enfFlecha3} id="sa-flecha-3" />
      <span className={e.enfFlechaPerdida} aria-hidden="true">
        <span className={e.enfFlechaPerdidaVoo}>
          <FlechaInteira id="sa-flecha-perdida" />
        </span>
      </span>
    </>
  ),
  // A mosca intacta: o brilho na estrela do escudo.
  NoEscudo: () => <span className={e.enfBrilhoMosca} aria-hidden="true" />,
  // O gramado onde o cavalete pisa (sem espelho nem trilho nem balcão).
  Chao: () => <div className={e.enfGramado} aria-hidden="true" />,
  Insignia: ({ className, id }) => <LourosDaFlecha className={className} id={id} />,
  InsigniaMini: ({ className }) => <FlechaMini className={className} />,
  // A flecha embaixo do BRONZE CLUBE.
  TracoDoNome: ({ className }) => (
    <span className={className} aria-hidden="true">
      <FlechaInteira id="sa-flecha-do-nome" />
    </span>
  ),
  // As duas flechas cruzadas atrás da foto oficial (como as do escudo).
  AtrasDoRetrato: () => (
    <div className={ef.enfCruzadas} aria-hidden="true">
      <span className={cx(ef.enfCruzada, ef.enfCruzadaA)}>
        <span className={ef.enfCruzadaVoo}>
          <FlechaInteira id="sa-cruzada-a" />
        </span>
      </span>
      <span className={cx(ef.enfCruzada, ef.enfCruzadaB)}>
        <span className={ef.enfCruzadaVoo}>
          <FlechaInteira id="sa-cruzada-b" cor="#e2505f" />
        </span>
      </span>
    </div>
  ),
  // O gramado da raia atrás das flechas do elenco.
  AtrasDoElenco: () => <div className={e.enfCampo} aria-hidden="true" />,
  // O relevo da placa de bronze: os louros e as duas pontas da fita cortada.
  NaCartela: () => (
    <div className={e.enfPlaca} aria-hidden="true">
      <Louro className={cx(e.enfLouro, e.enfLouroEsq)} />
      <Louro className={cx(e.enfLouro, e.enfLouroDir)} />
      <span className={cx(e.enfFita, e.enfFitaEsq)}>
        <FitaCortada cor="#ff6b7a" />
      </span>
      <span className={cx(e.enfFita, e.enfFitaDir)}>
        <FitaCortada cor="#e2505f" />
      </span>
    </div>
  ),
};
```

### `components/times/cenarios/ornamentos-estande.tsx`

```tsx
/*
 * Os ornamentos SVG do cenário "estande" (SO ADC BRONZE CLUBE). Todos são ENFEITE: aria-hidden,
 * focusable=false, e os ids levam um prefixo (`id`) para não colidir com outro SVG da página.
 * Nenhum <text>: os números dos anéis ficaram de fora de propósito (liam como texto solto).
 * REGRA DO TEMA: nenhum alvo, mira ou flecha aponta para uma FOTO — só para o escudo do clube e para
 * os alvos de palha. (A foto do bobbie goods tem uma pessoa pública; ver o spec, seção 9.)
 */

type ComClasse = Readonly<{ className?: string }>;
type ComId = Readonly<{ id: string }>;

/** A palha do fardo: 72 traços radiais entre r 81,5 e 91 (viewBox centrado em 0,0; 1 unidade = 0,01 E). */
const PALHA = Array.from({ length: 72 }, (_, k) => {
  const a = (k / 72) * Math.PI * 2 + (k % 3) * 0.02;
  const r1 = 81.5 + (k % 4) * 0.7;
  const r2 = 91 - (k % 5) * 0.8;
  const torce = ((k % 7) - 3) * 0.05;
  return {
    d: `M${(r1 * Math.cos(a)).toFixed(1)} ${(r1 * Math.sin(a)).toFixed(1)}L${(r2 * Math.cos(a + torce)).toFixed(1)} ${(r2 * Math.sin(a + torce)).toFixed(1)}`,
    clara: k % 2 === 1,
    grossa: k % 3 === 0,
  };
});

/** Cavalete (perna de trás, duas da frente, travessa) e o fardo de palha com a borda amarrada. */
function Fardo({ id }: ComId) {
  return (
    <>
      <defs>
        <radialGradient id={`${id}-palha`} cx=".45" cy=".4" r=".62">
          <stop offset="0" stopColor="#d9ad62" />
          <stop offset=".78" stopColor="#b98a44" />
          <stop offset="1" stopColor="#7a5426" />
        </radialGradient>
        <linearGradient id={`${id}-perna`} x1="0" x2="1">
          <stop offset="0" stopColor="#4a2e18" />
          <stop offset=".45" stopColor="#7a5232" />
          <stop offset="1" stopColor="#3e2614" />
        </linearGradient>
      </defs>
      <path d="M-3 40L3 40L6 120L-6 120Z" fill="#2c1b0e" />
      <path d="M-42 50L-32 52L-54 122L-66 122Z" fill={`url(#${id}-perna)`} />
      <path d="M42 50L32 52L54 122L66 122Z" fill={`url(#${id}-perna)`} />
      <rect x="-56" y="100" width="112" height="6" rx="2" fill="#5a3a20" />
      <circle r="92" fill={`url(#${id}-palha)`} />
      <circle r="91" fill="none" stroke="#5c3e1c" strokeWidth="2" />
      {PALHA.map((p, k) => (
        <path
          key={k}
          d={p.d}
          stroke={p.clara ? "#e9c47c" : "#7d5626"}
          strokeOpacity={p.clara ? 0.55 : 0.5}
          strokeWidth={p.grossa ? 1.6 : 1.1}
          strokeLinecap="round"
        />
      ))}
      {/* a sombra da face de papel sobre a palha */}
      <circle r="81.6" fill="#000" fillOpacity=".35" />
    </>
  );
}

/** Os alfinetes que prendem a face no fardo. */
function Alfinetes() {
  return (
    <g fill="#c9ced6">
      <circle cx="-57" cy="-57" r="1.6" />
      <circle cx="57" cy="-57" r="1.6" />
      <circle cx="-57" cy="57" r="1.6" />
      <circle cx="57" cy="57" r="1.6" />
    </g>
  );
}

/**
 * O alvo do clube: os anéis branco, preto, azul e vermelho de 8 unidades; o DOURADO (r 49) fica
 * embaixo do escudo — o escudo É a mosca. viewBox −92 −92 184 214 (o cavalete pisa em y 122).
 */
export function AlvoDoClube({ id }: ComId) {
  return (
    <svg viewBox="-92 -92 184 214" aria-hidden="true" focusable="false">
      <Fardo id={id} />
      <circle r="81" fill="#ede3ca" />
      <circle r="77" fill="none" stroke="#1b1f27" strokeOpacity=".5" strokeWidth=".5" />
      <circle r="73" fill="#1d212a" />
      <circle r="69" fill="none" stroke="#ede3ca" strokeOpacity=".45" strokeWidth=".5" />
      <circle r="65" fill="#386aa3" />
      <circle r="61" fill="none" stroke="#0e1b30" strokeOpacity=".55" strokeWidth=".5" />
      <circle r="57" fill="#d4463e" />
      <circle r="53" fill="none" stroke="#5a1410" strokeOpacity=".5" strokeWidth=".5" />
      <circle r="49" fill="#e0a83f" />
      <Alfinetes />
    </svg>
  );
}

/** O alvo de uma raia vizinha: a face regulamentar inteira (5 cores, mosca com a cruzinha). */
export function AlvoDaRaia({ id }: ComId) {
  return (
    <svg viewBox="-92 -92 184 214" aria-hidden="true" focusable="false">
      <Fardo id={id} />
      <circle r="81" fill="#ede3ca" />
      <circle r="64.8" fill="#1d212a" />
      <circle r="48.6" fill="#386aa3" />
      <circle r="32.4" fill="#d4463e" />
      <circle r="16.2" fill="#e0a83f" />
      <circle r="8.1" fill="none" stroke="#7a5a1a" strokeOpacity=".6" strokeWidth=".6" />
      <path d="M-2.4 0H2.4M0 -2.4V2.4" stroke="#3a2a0a" strokeWidth=".7" />
      <Alfinetes />
    </svg>
  );
}

/** A haste de madeira (gradiente) — o mesmo para as flechas cravadas e as inteiras. */
function Haste({ id }: ComId) {
  return (
    <defs>
      <linearGradient id={`${id}-haste`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f3dfb8" />
        <stop offset=".5" stopColor="#cfa56c" />
        <stop offset="1" stopColor="#8e6337" />
      </linearGradient>
    </defs>
  );
}

/**
 * A flecha cravada: a PONTA (enterrada) em x 0, a haste com as listras pintadas (coral, creme,
 * marinho), as penas coral e o encaixe de bronze em x 100. viewBox 0 0 100 30, esticado na caixa.
 */
export function FlechaCravada({ id }: ComId) {
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <Haste id={id} />
      <rect x="0" y="13.3" width="94" height="3.4" rx="1.2" fill={`url(#${id}-haste)`} />
      <rect x="56" y="13" width="3" height="4" fill="#ff6b7a" />
      <rect x="60" y="13" width="1.6" height="4" fill="#f1e5cb" />
      <rect x="62.6" y="13" width="2" height="4" fill="#16233d" />
      <path d="M68 13.4Q78 1 95 2L95 13.4Z" fill="#ff6b7a" />
      <path d="M68 16.6Q78 29 95 28L95 16.6Z" fill="#e2505f" />
      <path d="M70 14.6H95V15.4H70Z" fill="#f1e5cb" />
      <rect x="94" y="12.2" width="6" height="5.6" rx="1.4" fill="#c98a3e" />
    </svg>
  );
}

/**
 * A flecha inteira, apontando para a DIREITA: encaixe e penas na esquerda, ponta de bronze na direita.
 * viewBox 0 0 120 30, esticado na caixa. A flecha do nome, a que passa reto e as cruzadas da ficha.
 */
export function FlechaInteira({ id, cor = "#ff6b7a" }: ComId & Readonly<{ cor?: string }>) {
  return (
    <svg viewBox="0 0 120 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <Haste id={id} />
      <rect x="0" y="12.2" width="6" height="5.6" rx="1.4" fill="#c98a3e" />
      <path d="M27 13.4Q17 1 5 2V13.4Z" fill={cor} />
      <path d="M27 16.6Q17 29 5 28V16.6Z" fill={cor} fillOpacity=".8" />
      <path d="M5 14.6H25V15.4H5Z" fill="#f1e5cb" />
      <rect x="5" y="13.3" width="98" height="3.4" rx="1.2" fill={`url(#${id}-haste)`} />
      <rect x="31" y="13" width="2" height="4" fill="#16233d" />
      <rect x="34" y="13" width="1.6" height="4" fill="#f1e5cb" />
      <rect x="36.6" y="13" width="3" height="4" fill="#ff6b7a" />
      <path d="M101 8L120 15L101 22L104 15Z" fill="#d9a066" />
      <path d="M101 8L120 15L104 15Z" fill="#f6d3a0" />
    </svg>
  );
}

/**
 * A insígnia do ARQUEIRO-CHEFE: a coroa de louros de bronze (dois ramos em U, abertos em cima), a
 * flecha de ouro atravessando na diagonal (penas coral embaixo à esquerda, ponta clara em cima à
 * direita) e a estrela do escudo no nó dos ramos. viewBox 0 0 120 100.
 */
export function LourosDaFlecha({ className, id }: ComClasse & ComId) {
  const folhasEsq: readonly (readonly [number, number, number])[] = [
    [14, 48, -70],
    [18, 64, -52],
    [28, 78, -32],
    [42, 88, -14],
  ];
  return (
    <svg className={className} viewBox="0 0 120 100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-folha`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe9c9" />
          <stop offset=".5" stopColor="#e0a866" />
          <stop offset="1" stopColor="#9c5f2c" />
        </linearGradient>
        <linearGradient id={`${id}-ouro`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#c98642" />
          <stop offset=".5" stopColor="#ffd59a" />
          <stop offset="1" stopColor="#fff4e0" />
        </linearGradient>
      </defs>
      <path d="M60 94C34 92 14 72 12 44" fill="none" stroke="#5a2e12" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 94C86 92 106 72 108 44" fill="none" stroke="#5a2e12" strokeWidth="5" strokeLinecap="round" />
      <path d="M60 94C34 92 14 72 12 44" fill="none" stroke="#9c5f2c" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M60 94C86 92 106 72 108 44" fill="none" stroke="#9c5f2c" strokeWidth="2.6" strokeLinecap="round" />
      <g fill={`url(#${id}-folha)`} stroke="#5a2e12" strokeWidth="1.2">
        {folhasEsq.map(([x, y, giro]) => (
          <g key={`${x}-${y}`}>
            <ellipse cx={x} cy={y} rx="9" ry="4.4" transform={`rotate(${giro} ${x} ${y})`} />
            <ellipse cx={120 - x} cy={y} rx="9" ry="4.4" transform={`rotate(${-giro} ${120 - x} ${y})`} />
          </g>
        ))}
        <ellipse cx="22" cy="40" rx="7" ry="3.6" transform="rotate(-20 22 40)" />
        <ellipse cx="98" cy="40" rx="7" ry="3.6" transform="rotate(20 98 40)" />
      </g>
      <path d="M24 86L92 18" stroke="#5a2e12" strokeWidth="7" strokeLinecap="round" />
      <path d="M24 86L92 18" stroke={`url(#${id}-ouro)`} strokeWidth="4" strokeLinecap="round" />
      <path d="M24 86L14 84L20 92Z M24 86L26 96L32 90Z" fill="#ff6b7a" stroke="#5a2e12" strokeWidth="1" />
      <path d="M88 10L104 4L98 20L94 22L86 14Z" fill="#ffe9c9" stroke="#5a2e12" strokeWidth="1.6" strokeLinejoin="round" />
      <path
        d="M60 66L63 74L71 74L65 79L67 87L60 82L53 87L55 79L49 74L57 74Z"
        fill="#ffe9c9"
        stroke="#5a2e12"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A mesma insígnia chapada (chips, placas, cartela, companheiros): pinta com currentColor. */
export function FlechaMini({ className }: ComClasse) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5.5 20.5C3 18 2.4 13.6 3.8 9.5" />
      <path d="M18.5 20.5C21 18 21.6 13.6 20.2 9.5" />
      <path d="M3.2 13.2l2.3-.9M3.8 17l2.3-.2M20.8 13.2l-2.3-.9M20.2 17l-2.3-.2" strokeWidth="1.4" />
      <path d="M6.5 17.5L18.5 5.5" />
      <path d="M18.5 5.5l-4.2.6M18.5 5.5l-.6 4.2" />
      <path d="M6.5 17.5l-2.2.4M6.5 17.5l-.4 2.2" />
    </svg>
  );
}

/** Um ramo de louro em relevo de bronze (placa da cartela). viewBox 0 0 60 120. */
export function Louro({ className }: ComClasse) {
  const folhas: readonly (readonly [number, number, number])[] = [
    [16, 14, -40],
    [30, 30, 40],
    [16, 46, -40],
    [30, 62, 40],
    [18, 78, -40],
    [34, 94, 40],
  ];
  return (
    <svg className={className} viewBox="0 0 60 120" aria-hidden="true" focusable="false">
      <path d="M50 116C24 98 14 64 22 8" fill="none" stroke="#2c170a" strokeWidth="3" />
      <path d="M49 115C23 97 13 63 21 7" fill="none" stroke="#9c5f2c" strokeWidth="2" />
      {folhas.map(([x, y, giro]) => (
        <ellipse key={y} cx={x} cy={y} rx="9" ry="4.5" transform={`rotate(${giro} ${x} ${y})`} fill="#7a4a25" stroke="#c98642" />
      ))}
    </svg>
  );
}

/** Uma ponta da fita da inauguração, recém-cortada (rabo de andorinha), presa num anel. viewBox 0 0 26 92. */
export function FitaCortada({ cor }: Readonly<{ cor: string }>) {
  return (
    <svg viewBox="0 0 26 92" aria-hidden="true" focusable="false">
      <circle cx="13" cy="5" r="4.5" fill="none" stroke="#e0a866" strokeWidth="2" />
      <path d="M8 9Q14 30 7 60L4 88L13 80L22 88L21 58Q24 30 18 9Z" fill={cor} />
      <path d="M11 12Q15 36 11 62" stroke="#fff" strokeOpacity=".35" strokeWidth="2" fill="none" />
    </svg>
  );
}
```

### `components/times/cenarios/estande.module.css`

```css
/*
 * Cenário "estande" — SO ADC BRONZE CLUBE, «A Mosca Intacta» (cenarios/estande.tsx).
 *
 * Fim de tarde no estande de arco e flecha do clube. Duas famílias de regra:
 *  - ENFEITES próprios (`.enf…`, aria-hidden, sem texto): céu da hora azul, nuvens, serra, mata,
 *    alvos (o do clube e os das raias vizinhas), flechas, biruta, gramado, rajada, linha de tiro,
 *    a placa de bronze, as fitas da inauguração.
 *  - GANCHOS: classe com o MESMO nome de uma peça da base (casca, marca, chip…), que a página soma à
 *    peça (comCenario). Sempre `.raiz` + o MESMO seletor da base: um nível acima. Nada de @layer.
 * Conteúdo só anima transform, sem delay nem fill-mode, com a espera dentro do keyframe. A única
 * pintura no conteúdo é o «último raio de sol» que atravessa o ADC uma vez (background-position,
 * nunca esconde). Flashes: só o brilho da mosca (1,9 s e a cada 9 s, pequeno).
 * Nenhuma regra mistura `translate:`/`rotate:`/`scale:` com um `transform:` literal (o lightningcss
 * do build descartaria a propriedade individual): quem gira parado e quem voa são elementos diferentes.
 */

/* A reserva da Alfa Slab One (fontes-dos-temas.ts: `fallback`), enquanto ela não chega ou se falhar:
   Arial a 88% é MAIS ESTREITA que a Alfa em toda letra, dígito e acento (medido: ADC 1,888 contra
   2,362 em; PRESUNTO 4,954 contra 6,300; WMW 2,424 contra 3,587), então a largura medida
   (lib/temas/metricas.ts) vale para as duas e o título nunca sai cortado. */
@font-face {
  font-family: "Alfa Slab Caixa Alta";
  src: local("Arial"), local("ArialMT"), local("Helvetica"), local("Helvetica Neue"), local("Roboto"), local("Arimo"), local("Liberation Sans");
  size-adjust: 88%;
}

/* ======================================================================= raiz */
.raiz {
  --tm-titulo-estilo: normal;
  --tm-titulo-peso: 400;
  --tm-titulo-peso-medio: 400;
  /* Os tons que na RX são fixos (tema.module.css guarda os dela como padrão). */
  --tm-placa-topo: #fbf3e2;
  --tm-nick-meio: var(--tm-prata);
  --tm-nick-base: #d8c39c;
  --tm-valor-base: #2a3550;
  --tm-etiqueta: var(--tm-tinta);
  --tm-foto-fundo: var(--tm-abismo);
  --tm-chip-capitao: var(--tm-texto);
  --tm-mono: var(--tm-icone);
  --tm-eco-base: #0a1222;
  --tm-miolo-topo: var(--tm-abismo);
  --tm-miolo-base: #070b14;
  /* Do cenário: contorno do letreiro, extrusão de cobre, papel, coral das penas, gramado. */
  --contorno: #0a1222;
  --extrusao: #b8652f;
  --papel: #f1e5cb;
  --coral: #ff6b7a;
  --gramado: #101a13;
  font-synthesis: none;
}

/* ======================================================================= palco: a hora azul */
/* O fôlego do arqueiro: a câmera puxa (tensão) e dá o tranco no disparo, aos 544 ms. */
@keyframes folego {
  0% {
    transform: scale(1.06) translate3d(0, 1%, 0);
    animation-timing-function: cubic-bezier(0.3, 0, 0.6, 1);
  }
  30% {
    transform: scale(1.075) translate3d(0, 1.3%, 0);
    animation-timing-function: cubic-bezier(0.1, 0.9, 0.2, 1);
  }
  34% {
    transform: scale(1) translate3d(0, -0.35%, 0);
    animation-timing-function: cubic-bezier(0.3, 0, 0.3, 1);
  }
  44% {
    transform: translate3d(0, 0.15%, 0);
  }
  56%,
  100% {
    transform: none;
  }
}
.raiz .enfCamera {
  animation: folego 1600ms linear;
}

/* O céu: breu lá em cima, azul-ardósia, malva e a brasa do sol que já se pôs atrás da mata.
   O ponto mais claro (#66382C) fica atrás da mata; o texto mais fraco (apoio) dá 5,4:1 nele. */
.enfCeu {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(46% 20% at 50% 67%, rgba(150, 74, 46, 0.55), rgba(110, 58, 42, 0.22) 55%, transparent 80%),
    linear-gradient(180deg, #060a12 0%, #0b1324 24%, #122039 44%, #1c2643 54%, #2d2b46 60%, #4a2f38 64.5%, #66382c 66.6%, #0d1410 67%, #0a100c 100%);
}
/* Nuvens compridas (estrato), com a barriga acesa de cobre; derivam devagar. */
.enfNuvem {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--w);
  height: var(--h);
  border-radius: 50%;
  background:
    radial-gradient(60% 55% at 50% 72%, rgba(170, 92, 64, 0.32), transparent 72%),
    radial-gradient(50% 60% at 40% 40%, rgba(58, 66, 104, 0.55), transparent 75%);
  /* var() no shorthand atrapalha o CSS Modules: longhands */
  animation-name: nuvemDeriva;
  animation-duration: var(--dur);
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
}
@keyframes nuvemDeriva {
  from {
    transform: translateX(-3vw);
  }
  to {
    transform: translateX(3vw);
  }
}
/* A serra ao longe e a mata na linha do horizonte (ladrilhos SVG, parados). */
.enfSerra {
  position: absolute;
  left: 0;
  right: 0;
  top: 57.5%;
  height: 9.6%;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 60' width='600' height='60' preserveAspectRatio='none'%3E%3Cpath d='M0 60V38Q60 22 120 30T250 20Q330 8 400 26T520 24Q570 18 600 30V60Z' fill='%23161d30'/%3E%3C/svg%3E") 0 100% / 600px 100% repeat-x;
}
.enfMata {
  position: absolute;
  left: 0;
  right: 0;
  top: 61.6%;
  height: 5.6%;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 360 40' width='360' height='40' preserveAspectRatio='none'%3E%3Cpath d='M0 40V28Q8 18 16 26Q22 12 32 22Q38 8 48 20Q56 14 62 24Q70 16 78 26Q86 6 98 18Q106 12 112 24Q120 18 128 28Q138 20 146 26Q152 10 164 20Q172 14 178 24Q188 4 200 18Q208 10 216 22Q226 16 232 26Q240 20 250 28Q258 14 268 22Q276 8 288 20Q296 16 302 26Q312 18 320 24Q328 10 340 20Q348 14 356 26L360 28V40Z' fill='%230b110e'/%3E%3C/svg%3E") 0 100% / 360px 100% repeat-x;
}

/* ======================================================================= moldura */
/* A faixa do herói e da ficha (aqui, e não em .raiz: a base declara --barra em .raiz). */
.raiz .heroi {
  --barra: clamp(20px, 2.6vw, 36px);
}
/* A rajada: uma fila de flechinhas atravessa o topo da tela no começo do filme. */
.enfRajada {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  z-index: 3;
  height: var(--barra);
  pointer-events: none;
  background:
    linear-gradient(#c56a3c, #c56a3c) 0 100% / 100% 1px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 24' width='120' height='24'%3E%3Cpath d='M14 12H92' stroke='%23f1e5cb' stroke-opacity='.55' stroke-width='1.6'/%3E%3Cpath d='M92 7L104 12L92 17Z' fill='%23d9a066'/%3E%3Cpath d='M14 12L6 6H16L22 12L16 18H6Z' fill='%23ff6b7a' fill-opacity='.85'/%3E%3C/svg%3E") 0 50% / auto 70% repeat-x,
    #070b14;
  animation: rajada 700ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes rajada {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: none;
  }
}
/* A linha de tiro pintada no gramado, com os divisores das raias (parada). */
.enfLinhaDeTiro {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  height: calc(var(--barra) * 0.6);
  pointer-events: none;
  background:
    linear-gradient(#efe4cc, #efe4cc) 0 40% / 100% 2px no-repeat,
    repeating-linear-gradient(90deg, #efe4cc 0 2px, transparent 2px 160px) 80px 0 / 100% 40% no-repeat,
    #0c120e;
  box-shadow: 0 -10px 18px -10px rgba(0, 0, 0, 0.8);
}

/* ======================================================================= herói: o eixo invertido */
/* O NOME em cima e o ALVO embaixo, em toda largura (a RX põe o texto à esquerda; a QM, à direita;
   os Galácticos, o escudo em cima do nome). Sem o tremor da base: quem treme é o alvo. */
.raiz .heroiGrade {
  --escudo: clamp(168px, 50vw, 220px);
  grid-template-columns: minmax(0, 1fr);
  justify-items: center;
  text-align: center;
  animation-name: none;
}
@media (min-width: 600px) and (max-width: 1023px) {
  .raiz .heroiGrade {
    --escudo: clamp(210px, min(34vw, 30svh), 270px);
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
  /* .blocoTexto: só no herói (a ficha também tem .chips, em outro módulo). */
  .raiz .blocoTexto .chips {
    justify-content: center;
  }
  .raiz .lema {
    margin-inline: auto;
  }
}
/* ≥1024: o kicker sobe para a altura do «VOLTAR» (centrado, não encosta nele). */
@media (min-width: 1024px) {
  .raiz .heroiGrade {
    --escudo: clamp(200px, min(17vw, 27svh), 290px);
    margin-top: -44px;
  }
}
/* A ordem visual (o DOM não muda): kicker, créditos, NOME, ALVO, lema, chips. O texto vira SUBGRADE
   da grade do herói e o bloco do escudo cai na linha 4. Um contêiner (contain: layout) não pode ser
   subgrade: o contêiner do título sobe para a grade (100cqi continua sendo a largura da coluna).
   Sem subgrid (navegador antigo): o escudo fica em cima do nome, como na base — legível. */
@supports (grid-template-rows: subgrid) {
  .raiz .heroiGrade {
    grid-template-rows: repeat(6, auto);
    container-type: inline-size;
  }
  .raiz .blocoTexto {
    container-type: normal;
    grid-column: 1;
    grid-row: 1 / -1;
    display: grid;
    grid-template-rows: subgrid;
    justify-items: center;
    margin: 0;
  }
  .raiz .blocoTexto > .kicker {
    grid-row: 1;
  }
  .raiz .blocoTexto > .nomesDoElenco {
    grid-row: 2;
  }
  .raiz .blocoTexto > .titulo {
    grid-row: 3;
  }
  .raiz .blocoTexto > .lema {
    grid-row: 5;
  }
  .raiz .blocoTexto > .chips {
    grid-row: 6;
  }
  .raiz .blocoEscudo {
    grid-column: 1;
    grid-row: 4;
  }
}
/* O alvo passa 0,42 E acima do escudo e o cavalete pisa a 1,22 E do centro. */
.raiz .blocoEscudo {
  margin-top: calc(var(--escudo) * 0.44);
  margin-bottom: calc(var(--escudo) * 0.8);
}
@media (min-width: 900px) {
  .raiz .blocoEscudo {
    margin-top: calc(var(--escudo) * 0.44);
    margin-bottom: calc(var(--escudo) * 0.8);
  }
  .raiz .blocoTexto {
    margin: 0;
  }
}

/* -------------------------------------------- o escudo: a mosca do alvo, cravado no centro */
/* Quadro 0: 2% abaixo, girado −3°. Sacode nos dois impactos (700 ms à esquerda, 1000 ms à direita). */
@keyframes cravado {
  0%,
  40% {
    transform: translate(0, 2%) rotate(-3deg) scale(0.97);
    animation-timing-function: cubic-bezier(0.3, 0, 0.6, 1);
  }
  44% {
    transform: translate(1.2%, 0) rotate(1.6deg) scale(1.01);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  53% {
    transform: rotate(-0.9deg);
  }
  63% {
    transform: translate(-0.8%, 0) rotate(-1.2deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  72% {
    transform: rotate(0.5deg);
  }
  84% {
    transform: rotate(-0.2deg);
  }
  100% {
    transform: none;
  }
}
.raiz .escudo {
  transform-origin: 50% 50%;
  animation: cravado 1600ms linear;
}

/* A contraluz do pôr do sol atrás do alvo (parada). */
.enfContraluz {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: 330%;
  aspect-ratio: 1;
  translate: -50% -50%;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(closest-side, rgba(176, 86, 52, 0.34), rgba(120, 60, 46, 0.16) 46%, rgba(40, 40, 80, 0.06) 64%, transparent 74%);
}
/* O alvo do clube: fardo de palha, face de papel e cavalete. SVG de viewBox −92 −92 184 214
   (1 unidade = 0,01 E): o centro do SVG cai no centro do escudo. */
.enfAlvo {
  position: absolute;
  left: -42%;
  top: -42%;
  z-index: 0;
  width: 184%;
  height: 214%;
  pointer-events: none;
  transform-origin: 50% 43%;
  animation: alvoTreme 1600ms linear;
}
.enfAlvo svg,
.enfVizinho svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
@keyframes alvoTreme {
  0%,
  43.6% {
    transform: none;
  }
  45% {
    transform: translate3d(0.6%, -0.2%, 0) rotate(0.8deg);
  }
  52% {
    transform: rotate(-0.5deg);
  }
  62.4% {
    transform: none;
  }
  64% {
    transform: translate3d(-0.5%, 0, 0) rotate(-0.7deg);
  }
  72% {
    transform: rotate(0.3deg);
  }
  84%,
  100% {
    transform: none;
  }
}

/* -------------------------------------------- as flechas cravadas */
/* Posição (a PONTA) e giro parados no elemento de fora; o voo e o tremor animam por dentro. O eixo
   local +x vai da ponta para o arqueiro (143,13° = embaixo à esquerda): o voo vem de lá. */
.enfFlecha {
  position: absolute;
  z-index: 1;
  left: calc(50% + var(--x) * 100%);
  top: calc(50% + var(--y) * 100%);
  width: calc(var(--escudo) * 0.5);
  height: calc(var(--escudo) * 0.15);
  margin-top: calc(var(--escudo) * -0.075);
  transform-origin: 0 50%;
  rotate: 143.13deg;
  pointer-events: none;
}
.enfFlechaVoo,
.enfFlechaHaste {
  position: absolute;
  inset: 0;
  transform-origin: 0 50%;
}
.enfFlechaHaste svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
/* A1: anel branco, em cima à esquerda (1 ponto), aos 700 ms. A2: na palha, à direita (0), aos 1000. */
.enfFlecha1 {
  --x: -0.545;
  --y: -0.545;
}
.enfFlecha2 {
  --x: 0.862;
  --y: 0.12;
}
.enfFlecha1 .enfFlechaVoo {
  animation: voo1 1000ms linear;
}
.enfFlecha1 .enfFlechaHaste {
  animation: treme1 1600ms linear;
}
.enfFlecha2 .enfFlechaVoo {
  animation: voo2 1300ms linear;
}
.enfFlecha2 .enfFlechaHaste {
  animation: treme2 1900ms linear;
}
@keyframes voo1 {
  0%,
  56% {
    transform: translateX(180vmax) scale(1.9);
  }
  70%,
  100% {
    transform: none;
  }
}
@keyframes voo2 {
  0%,
  66.1% {
    transform: translateX(180vmax) scale(1.9);
  }
  76.9%,
  100% {
    transform: none;
  }
}
/* O «tóim»: a haste vibra pela ponta, amortecendo em ~650 ms. */
@keyframes treme1 {
  0%,
  43.75% {
    transform: none;
  }
  48% {
    transform: rotate(7deg);
  }
  54% {
    transform: rotate(-5deg);
  }
  60% {
    transform: rotate(3.2deg);
  }
  67% {
    transform: rotate(-1.8deg);
  }
  75% {
    transform: rotate(0.8deg);
  }
  84%,
  100% {
    transform: none;
  }
}
@keyframes treme2 {
  0%,
  52.6% {
    transform: none;
  }
  56% {
    transform: rotate(-7deg);
  }
  61% {
    transform: rotate(5deg);
  }
  66% {
    transform: rotate(-3.2deg);
  }
  72% {
    transform: rotate(1.8deg);
  }
  79% {
    transform: rotate(-0.8deg);
  }
  86%,
  100% {
    transform: none;
  }
}
/* O furo na face e as lascas de palha que voam no impacto (uma vez). */
.enfFuro {
  position: absolute;
  left: 0;
  top: 50%;
  width: calc(var(--escudo) * 0.05);
  aspect-ratio: 1.4;
  translate: -50% -50%;
  border-radius: 50%;
  background: radial-gradient(closest-side, #0b0805 45%, rgba(11, 8, 5, 0.4) 70%, transparent);
  /* o furo só existe depois do tiro: aparece no impacto (a mesma duração das lascas) */
  animation-name: furoAparece;
  animation-duration: var(--dur-lasca);
  animation-timing-function: linear;
}
@keyframes furoAparece {
  0%,
  46% {
    scale: 0;
  }
  47%,
  100% {
    scale: 1;
  }
}
.enfLasca {
  position: absolute;
  left: 0;
  top: 50%;
  width: calc(var(--escudo) * 0.035);
  height: 2px;
  border-radius: 2px;
  background: #e8c27a;
  opacity: 0;
  rotate: var(--a);
  animation-name: lascaVoa;
  animation-duration: var(--dur-lasca);
  animation-timing-function: cubic-bezier(0.1, 0.6, 0.3, 1);
}
.enfFlecha1 {
  --dur-lasca: 1500ms;
}
.enfFlecha2 {
  --dur-lasca: 2150ms;
}
.enfFlecha3 {
  --dur-lasca: 2800ms;
}
/* Parada até 46% (= o impacto em cada duração: 700, 1000 e 1300 ms). */
@keyframes lascaVoa {
  0%,
  46% {
    transform: none;
    opacity: 0;
  }
  47% {
    opacity: 1;
  }
  100% {
    transform: translateX(calc(var(--escudo) * 0.22)) rotate(160deg);
    opacity: 0;
  }
}

/* A3 abaixo de 1024: passa por cima do alvo e some pela direita (foi para a raia do vizinho). */
.enfFlechaPerdida {
  position: absolute;
  z-index: 1;
  left: 50%;
  top: calc(50% - var(--escudo) * 1.1);
  width: calc(var(--escudo) * 0.42);
  height: calc(var(--escudo) * 0.11);
  margin-left: calc(var(--escudo) * -0.21);
  rotate: -3deg;
  pointer-events: none;
}
.enfFlechaPerdidaVoo {
  position: absolute;
  inset: 0;
  transform: translateX(120vw); /* parada: fora da tela (movimento reduzido e depois do filme) */
  animation: passaReto 1800ms linear;
}
.enfFlechaPerdida svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
@keyframes passaReto {
  0%,
  64% {
    transform: translateX(-120vw);
  }
  80%,
  100% {
    transform: translateX(120vw);
  }
}

/* ≥1024: as raias vizinhas (alvos mais longe, 0,44 do tamanho) e a biruta entre o alvo e a raia 1.
   O 3º tiro (A3) acerta a MOSCA... do alvo do vizinho. --raia nunca deixa o alvo passar da tela. */
.enfVizinho,
.enfFlecha3,
.enfBiruta {
  display: none;
}
@media (min-width: 1024px) {
  .raiz .blocoEscudo {
    --raia: min(var(--escudo) * 2.45, 50vw - var(--escudo) * 0.5);
  }
  .enfFlechaPerdida {
    display: none;
  }
  .enfVizinho {
    display: block;
    position: absolute;
    z-index: 0;
    top: calc(50% - var(--escudo) * 0.06 - var(--escudo) * 0.4048);
    width: calc(var(--escudo) * 0.8096);
    height: calc(var(--escudo) * 0.9416);
    pointer-events: none;
  }
  .enfVizinhoEsq {
    left: calc(50% - var(--raia) - var(--escudo) * 0.4048);
  }
  .enfVizinhoDir {
    left: calc(50% + var(--raia) - var(--escudo) * 0.4048);
  }
  .enfFlecha3 {
    display: block;
    left: calc(50% + var(--raia));
    top: calc(50% - var(--escudo) * 0.06);
    width: calc(var(--escudo) * 0.3);
    height: calc(var(--escudo) * 0.09);
    margin-top: calc(var(--escudo) * -0.045);
  }
  .enfFlecha3 .enfFlechaVoo {
    animation: voo3 1600ms linear;
  }
  .enfFlecha3 .enfFlechaHaste {
    animation: treme3 2000ms linear;
  }
  .enfBiruta {
    display: block;
    position: absolute;
    z-index: 0;
    left: calc(50% - (var(--raia) + var(--escudo) * 0.92) / 2);
    top: calc(50% - var(--escudo) * 0.95);
    width: calc(var(--escudo) * 0.42);
    height: calc(var(--escudo) * 1.5);
    pointer-events: none;
  }
  /* o mastro */
  .enfBiruta::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    border-radius: 2px;
    background: linear-gradient(90deg, #2a3142, #59627a);
  }
}
@keyframes voo3 {
  0%,
  72.5% {
    transform: translateX(180vmax) scale(1.6);
  }
  81.25%,
  100% {
    transform: none;
  }
}
@keyframes treme3 {
  0%,
  65% {
    transform: none;
  }
  68.5% {
    transform: rotate(6deg);
  }
  73% {
    transform: rotate(-4deg);
  }
  78% {
    transform: rotate(2.4deg);
  }
  84% {
    transform: rotate(-1deg);
  }
  90%,
  100% {
    transform: none;
  }
}
/* A biruta: listras coral e creme; enche no começo e tremula para sempre (devagar). A forma de
   cone é um clip-path PARADO. */
.enfBirutaSaco {
  position: absolute;
  left: 3px;
  top: 3%;
  width: 100%;
  height: 17%;
  transform-origin: 0 50%;
  clip-path: polygon(0 0, 100% 22%, 100% 78%, 0 100%);
  background: repeating-linear-gradient(90deg, #ff6b7a 0 20%, #f1e5cb 20% 40%);
  box-shadow: inset 0 -6px 8px rgba(0, 0, 0, 0.35);
  animation: birutaEnche 1500ms cubic-bezier(0.2, 0.8, 0.2, 1), birutaTremula 2.6s ease-in-out 1500ms infinite alternate;
}
@keyframes birutaEnche {
  0%,
  20% {
    transform: scaleX(0.3) skewY(28deg);
  }
  62% {
    transform: scaleX(1.06) skewY(-4deg);
  }
  80% {
    transform: scaleX(0.97) skewY(2deg);
  }
  100% {
    transform: none;
  }
}
@keyframes birutaTremula {
  from {
    transform: rotate(-2deg);
  }
  to {
    transform: rotate(3deg) scaleX(0.95);
  }
}

/* -------------------------------------------- no escudo: a mosca intacta brilha */
/* A estrela do escudo (50%, 50,5%): um brilho de 4 pontas aos 1,9 s e a cada 9 s. */
.enfBrilhoMosca {
  position: absolute;
  left: 50%;
  top: 50.5%;
  z-index: 2;
  width: 22%;
  aspect-ratio: 1;
  translate: -50% -50%;
  pointer-events: none;
  background:
    linear-gradient(#fff6e6, #fff6e6) 50% 50% / 100% 5% no-repeat,
    linear-gradient(#fff6e6, #fff6e6) 50% 50% / 5% 100% no-repeat,
    radial-gradient(closest-side, #fff, rgba(255, 210, 160, 0.5) 30%, transparent 62%);
  -webkit-mask: radial-gradient(closest-side, #000 26%, transparent);
  mask: radial-gradient(closest-side, #000 26%, transparent);
  /* `scale`/`rotate` e não `transform` (o `translate:` sumiria no build). */
  scale: 0;
  animation: moscaBrilha 9s ease-out infinite;
}
@keyframes moscaBrilha {
  0%,
  20% {
    scale: 0;
    rotate: 0deg;
  }
  21.5% {
    scale: 1.2;
    rotate: 45deg;
  }
  25%,
  100% {
    scale: 0;
    rotate: 90deg;
  }
}

/* -------------------------------------------- o chão: o gramado onde o cavalete pisa */
.enfGramado {
  position: absolute;
  left: 50%;
  top: calc(50% + var(--escudo) * 1.17);
  z-index: 0;
  width: 200vw;
  margin-left: -100vw;
  height: calc(var(--escudo) * 2.2);
  pointer-events: none;
  background:
    radial-gradient(calc(var(--escudo) * 0.9) calc(var(--escudo) * 0.09) at 50% calc(var(--escudo) * 0.07), rgba(0, 0, 0, 0.6), transparent) no-repeat,
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.018) 0 calc(var(--escudo) * 0.16), transparent calc(var(--escudo) * 0.16) calc(var(--escudo) * 0.32)),
    linear-gradient(180deg, transparent 0, #121d15 calc(var(--escudo) * 0.06), #0e1711 40%, #0a100c);
  -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
  mask-image: linear-gradient(180deg, #000 55%, transparent);
}

/* ======================================================================= texto do herói */
/* O kicker e os créditos NÃO sobem: 14 px para baixo no quadro 0 encostariam no «So». */
.raiz .blocoTexto .kicker,
.raiz .nomesDoElenco {
  text-wrap: balance;
  animation-name: none;
}
.raiz .blocoTexto .kicker {
  margin-bottom: 4px;
}
.raiz .nomesDoElenco {
  position: relative;
  z-index: 1;
  margin-bottom: 10px;
}

/* -------------------------------------------- título: «So» em script, ADC de letreiro, BRONZE CLUBE na flecha */
/* Pela largura MEDIDA da maior palavra (--largura-em, lib/temas/metricas.ts): ADC = 2,582 em com o
   espaçamento e a tinta da extrusão. Sem a métrica, um fator generoso. */
.raiz .tituloVisual {
  --tm-titulo-max: min(120px, 16svh);
  --tam: clamp(44px, calc(100cqi / var(--largura-em, calc(var(--letras) * 0.9))), var(--tm-titulo-max));
}
@media (min-width: 600px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(150px, 17svh);
  }
}
@media (min-width: 1024px) {
  .raiz .tituloVisual {
    --tm-titulo-max: min(160px, 18svh);
  }
}
/* A corda: o nome é puxado como a corda do arco e SOLTA aos 544 ms (o tranco da câmera), vibra e para. */
@keyframes corda {
  0%,
  30% {
    transform: translate(-0.03em, 0) scaleX(0.95) skewX(-7deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  34% {
    transform: translate(0.015em, 0) scaleX(1.035) skewX(3.5deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  40% {
    transform: scaleX(0.985) skewX(-1.8deg);
  }
  47% {
    transform: scaleX(1.01) skewX(1deg);
  }
  55% {
    transform: skewX(-0.4deg);
  }
  64%,
  100% {
    transform: none;
  }
}
/* As palavras empilham (flex em coluna; o espaço entre elas não vira item). */
.raiz .marca {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: var(--tam);
  line-height: 0.9;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  font-kerning: none; /* a Alfa TEM kerning: a largura medida é a soma das letras */
  font-variant-ligatures: none;
  transform-origin: 50% 70%;
  animation: corda 1600ms linear;
}
.raiz .palavra {
  display: inline-block;
  white-space: nowrap;
}
.raiz .letra {
  display: inline-grid;
}
.raiz .letra > * {
  grid-area: 1 / 1;
}
/* Folga de tinta: a extrusão desce e vai para a direita 0,088 em, o contorno passa 0,035 em. */
.raiz .eco,
.raiz .cromo {
  padding: 0.16em 0.18em 0.22em 0.06em;
  margin: -0.16em -0.18em -0.22em -0.06em;
}
/* A extrusão de cobre (8 degraus de 0,011 em, escurecendo) com o contorno marinho. Estática, ATRÁS
   de toda face (.marca é isolate). */
.raiz .eco {
  position: static;
  inset: auto;
  z-index: -1;
  color: var(--extrusao);
  -webkit-text-stroke: 0.07em var(--contorno);
  text-shadow:
    0.011em 0.011em 0 #b05f2c,
    0.022em 0.022em 0 #a25628,
    0.033em 0.033em 0 #944e24,
    0.044em 0.044em 0 #864620,
    0.055em 0.055em 0 #783e1c,
    0.066em 0.066em 0 #6a3618,
    0.077em 0.077em 0 #5c2e14,
    0.088em 0.088em 0 var(--contorno),
    0.1em 0.12em 0.14em rgba(0, 0, 0, 0.55);
  user-select: none;
}
/* A face: creme de letreiro pintado. A tinta garantida vem antes do background-clip. */
.raiz .cromo {
  color: #f3e3c3;
}
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .raiz .cromo {
    background-image:
      linear-gradient(100deg, transparent 42%, rgba(255, 214, 170, 0.75) 50%, transparent 58%),
      linear-gradient(180deg, #fffaf0 0%, #f8ebcf 40%, #efd9b0 74%, #e3c38f 100%);
    background-size: 260% 100%, 100% 100%;
    background-repeat: no-repeat;
    background-position: 160% 0, 0 0;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    -webkit-text-stroke: 0;
    /* O último raio de sol atravessa UMA vez, letra a letra (cascata pela duração; --i da letra). */
    animation: ultimoRaio 2600ms linear;
    animation-duration: calc(2600ms + var(--i, 0) * 110ms);
  }
}
@keyframes ultimoRaio {
  0%,
  78% {
    background-position: 160% 0, 0 0;
  }
  100% {
    background-position: -60% 0, 0 0;
  }
}
/* «So»: a primeira palavra (quando há mais de uma) vira um script coral pequeno, inclinado, em cima
   do ADC — como o "So" da faixa do escudo. Só a 1ª letra fica maiúscula. */
.raiz .palavra:first-child:not(:last-child) {
  font-family: var(--tm-fonte-assinatura), cursive;
  font-size: 0.4em;
  line-height: 1.05;
  letter-spacing: 0;
  rotate: -7deg;
  margin-bottom: -0.02em;
}
.raiz .palavra:first-child:not(:last-child) .letra:not(:first-child) {
  text-transform: lowercase;
}
.raiz .palavra:first-child:not(:last-child) .eco {
  color: #7a1f2b;
  -webkit-text-stroke: 0.1em var(--contorno);
  text-shadow: 0.03em 0.05em 0 var(--contorno);
}
.raiz .palavra:first-child:not(:last-child) .cromo {
  background: none;
  color: var(--coral);
  -webkit-text-fill-color: var(--coral);
  animation: none;
}

/* BRONZE CLUBE: caixa alta da Alfa, espaçada, puxada pela flecha que crava embaixo (640 ms). */
@keyframes assinaturaPuxa {
  0%,
  36% {
    transform: translate(-0.25em, 0);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  48% {
    transform: translate(0.04em, 0);
  }
  58%,
  100% {
    transform: none;
  }
}
.raiz .assinatura {
  margin-top: 0.1em;
  animation: assinaturaPuxa 1600ms linear;
}
.raiz .pincel {
  transform: none;
  padding: 0 0.2em;
  font: 400 max(16px, calc(var(--tam) * 0.215)) / 1.1 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
  letter-spacing: 0.16em;
  margin-right: -0.16em;
  text-transform: uppercase;
  font-kerning: none;
  color: var(--tm-texto);
  text-shadow: 0 0.09em 0 var(--contorno), 0 0 0.5em rgba(6, 10, 18, 0.9);
}
/* A flecha do nome (TracoDoNome): voa da esquerda e crava embaixo do BRONZE CLUBE aos 640 ms. */
.raiz .assinatura .enfTraco {
  display: block;
  width: 122%;
  height: max(10px, calc(var(--tam) * 0.1));
  margin: 0.12em 0 0 -11%;
  transform-origin: 100% 50%;
  animation: flechaDoNome 1600ms linear;
}
.enfTraco svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
@keyframes flechaDoNome {
  0%,
  33% {
    transform: translateX(-160vw);
  }
  40% {
    transform: translateX(0.6%);
  }
  44% {
    transform: rotate(-1.4deg);
  }
  49% {
    transform: rotate(1deg);
  }
  55% {
    transform: rotate(-0.5deg);
  }
  62%,
  100% {
    transform: none;
  }
}

/* -------------------------------------------- o lema, em script, no gramado */
.raiz .lema {
  margin-top: 0;
  max-width: 24ch;
  font: 400 clamp(22px, 2.2vw, 30px) / 1.2 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0;
  color: var(--tm-texto);
  text-shadow: 0 2px 0 #050806, 0 0 14px rgba(5, 8, 6, 0.9);
}

/* -------------------------------------------- chips: placas em forma de flecha (→) */
/* A ponta é um clip-path PARADO no ::before (o chip focável não leva máscara). */
.raiz .chip {
  padding: 0 26px 0 16px;
}
.raiz .chip::before {
  transform: none;
  border-radius: 3px;
  clip-path: polygon(0 0, calc(100% - 13px) 0, 100% 50%, calc(100% - 13px) 100%, 0 100%);
}
/* Pontos: a placa creme de pontuação. */
.raiz .chipPts::before {
  background: linear-gradient(180deg, #fbf3e2, #e7d3ad);
  box-shadow: none;
}
/* O arqueiro-chefe (e rota/elo na ficha): marinho com o fio coral à esquerda. */
.raiz .chipCapitao::before {
  background: #16233d;
  border: 0;
  box-shadow: inset 3px 0 0 var(--coral);
}
/* OP.GG: a seta vazada (coral por fora, breu por dentro: o ::after é o miolo). */
.raiz .chipOpgg::before {
  border: 0;
  background: var(--coral);
}
.raiz .chipOpgg::after {
  content: "";
  position: absolute;
  inset: 2px;
  z-index: -1;
  border-radius: 2px;
  pointer-events: none;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%);
  background: #0a1222;
  transition: background-color 0.2s ease;
}
.raiz .chipOpgg:hover::before {
  background: var(--coral);
}
.raiz .chipOpgg:hover::after {
  background: var(--tm-royal);
}
/* «ARQUEIRO-CHEFE · FAMOSO PARRUDAO» mede ~295 px: abaixo de 420 vira texto corrido, quebrando entre
   palavras (nunca no meio). */
@media (max-width: 419px) {
  .raiz .blocoTexto .chipCapitao {
    flex: 1 1 100%;
    display: block;
    padding-block: 12px;
    line-height: 1.6;
    white-space: normal;
    overflow-wrap: normal;
    text-wrap: balance;
    text-align: center;
  }
  .raiz .blocoTexto .chipCapitao > svg {
    display: inline-block;
    vertical-align: -3px;
    margin-right: 8px;
  }
}

/* ======================================================================= elenco: «A ALJAVA» */
/* As cartas são flechas fincadas no gramado: penas em cima (::before), toco da haste e montinho de
   terra embaixo (::after). --pena é a altura das penas. */
.raiz .elencoSecao {
  --pena: 52px;
  padding-top: clamp(28px, 4vw, 52px);
  padding-bottom: clamp(70px, 8vw, 110px);
}
@media (max-width: 599px) {
  .raiz .elencoSecao {
    --pena: 40px;
  }
}
/* O gramado da raia atrás das cartas (AtrasDoElenco): começa embaixo do título e do aviso. */
.enfCampo {
  position: absolute;
  z-index: -1;
  left: 0;
  right: 0;
  top: clamp(150px, 15vw, 200px);
  bottom: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(180deg, rgba(255, 255, 255, 0.022) 0 46px, transparent 46px 92px),
    linear-gradient(180deg, transparent 0, #101a13 70px, #0d1610 60%, #0a100c);
}
.raiz .estrelando {
  font: 400 clamp(28px, 3.2vw, 44px) / 1 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
  letter-spacing: 0.04em;
  font-kerning: none;
  color: var(--tm-texto);
  text-shadow: 0 0.08em 0 var(--contorno), 0 0 0.6em rgba(5, 8, 14, 0.8);
}
/* O fio do título vira uma flecha: penas à esquerda, ponta à direita. */
.raiz .estrelando::after {
  height: 14px;
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 18 14'%3E%3Cpath d='M0 1L18 7L0 13L4 7Z' fill='%23d9a066'/%3E%3C/svg%3E") 100% 50% / 18px 14px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 14'%3E%3Cpath d='M0 0L12 7L0 14H10L22 7L10 0Z' fill='%23ff6b7a'/%3E%3C/svg%3E") 0 50% / 30px 14px no-repeat,
    linear-gradient(90deg, #efe4cc, #cfa56c) 20px 50% / calc(100% - 34px) 2px no-repeat;
}
.raiz .aviso {
  margin: -4px 0 calc(var(--pena) + 30px);
  font: 400 clamp(19px, 1.8vw, 24px) / 1.25 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0;
  color: var(--tm-prata);
  text-shadow: 0 2px 8px rgba(5, 8, 14, 0.9);
}
/* ≥1024 o arqueiro-chefe está na 1ª fila, erguido 14 px, com os louros em cima das penas. */
@media (min-width: 1024px) {
  .raiz .aviso {
    margin-bottom: calc(var(--pena) + 56px);
  }
}
.raiz .elenco {
  row-gap: calc(var(--pena) + 54px);
  padding-top: 0;
}
@media (min-width: 1024px) {
  .raiz .elenco {
    padding-top: 0;
  }
}

/* A entrada: a flecha cai e CRAVA (pivô no pé), por rolagem; sem view(), pelo relógio. */
@keyframes crava {
  from {
    transform: translate(0, -30px) rotate(-2.5deg);
  }
  62% {
    transform: translate(0, 3px) rotate(1.4deg);
  }
  74% {
    transform: rotate(-0.9deg);
  }
  86% {
    transform: rotate(0.4deg);
  }
  to {
    transform: none;
  }
}
@keyframes cravaRelogio {
  0%,
  58% {
    transform: translate(0, -30px) rotate(-2.5deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.4);
  }
  76% {
    transform: translate(0, 3px) rotate(1.4deg);
  }
  84% {
    transform: rotate(-0.9deg);
  }
  92% {
    transform: rotate(0.4deg);
  }
  100% {
    transform: none;
  }
}
.raiz .casca {
  --giro: 0deg;
  rotate: var(--giro); /* estático; a entrada é transform */
  transform-origin: 50% 100%;
  border-radius: 10px; /* o anel de foco acompanha a carta */
  animation-name: cravaRelogio;
  animation-duration: calc(2000ms + var(--i, 0) * 150ms);
  animation-timing-function: linear;
}
@supports (animation-timeline: view()) {
  .raiz .casca {
    animation: crava linear; /* o shorthand primeiro: ele zera a timeline */
    animation-timeline: view();
    animation-range: entry 0% entry calc(65% + var(--col, 0) * 12%);
  }
}
.raiz .casca:nth-child(odd) {
  --giro: -0.8deg;
}
.raiz .casca:nth-child(even) {
  --giro: 0.9deg;
}
.raiz .cascaCapitao:nth-child(n) {
  --giro: 0deg;
}
/* As penas (coral; a do meio, creme) e o encaixe de bronze, em cima da carta. */
.raiz .casca::before {
  content: "";
  position: absolute;
  z-index: 1;
  left: 50%;
  bottom: calc(100% - 4px);
  width: min(46%, 104px);
  height: var(--pena);
  translate: -50% 0;
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80' preserveAspectRatio='none'%3E%3Crect x='55' y='8' width='10' height='72' fill='%23f1e5cb'/%3E%3Cpath d='M55 78C48 72 24 54 18 20L55 12Z' fill='%23ff6b7a'/%3E%3Cpath d='M65 78C72 72 96 54 102 20L65 12Z' fill='%23e2505f'/%3E%3Cpath d='M50 66L30 40M52 52L26 28M53 38L28 18M70 66L90 40M68 52L94 28M67 38L92 18' stroke='%23fff' stroke-opacity='.28' stroke-width='1.6'/%3E%3Crect x='52' y='0' width='16' height='12' rx='3' fill='%23c98a3e'/%3E%3Cpath d='M56 0L60 7L64 0Z' fill='%235a2e12'/%3E%3C/svg%3E") 50% 100% / 100% 100% no-repeat;
}
/* O toco da haste entrando no montinho de terra, com a sombra e o capim. */
.raiz .casca::after {
  content: "";
  position: absolute;
  z-index: -1;
  left: 50%;
  top: calc(100% - 6px);
  width: min(80%, 190px);
  height: 44px;
  translate: -50% 0;
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 44' preserveAspectRatio='none'%3E%3Cellipse cx='100' cy='34' rx='92' ry='9' fill='%23000' fill-opacity='.5'/%3E%3Crect x='94' y='0' width='12' height='32' fill='%23a46d3c'/%3E%3Crect x='94' y='0' width='4' height='32' fill='%23c99561'/%3E%3Cpath d='M38 34Q100 14 162 34Q100 42 38 34Z' fill='%234a3522'/%3E%3Cpath d='M54 31Q100 18 146 31' fill='none' stroke='%237a5a38' stroke-width='3' stroke-linecap='round'/%3E%3Cpath d='M30 38l5-14 3 14M46 39l2-10 4 10M150 38l5-15 2 15M166 39l3-10 2 10M70 40l3-9 2 9M128 40l2-9 4 9' fill='none' stroke='%23284330' stroke-width='3' stroke-linecap='round'/%3E%3C/svg%3E") 50% 0 / 100% 100% no-repeat;
}
/* A carta: tábua de cedro, com as listras pintadas (cresting: coral, creme, marinho) no alto. */
.raiz .carta {
  container-type: inline-size;
  clip-path: none;
  padding: 16px 4px 4px;
  border-radius: 10px 10px 6px 6px;
  background:
    linear-gradient(180deg, var(--coral) 0 5px, #f1e5cb 5px 8px, #16233d 8px 12px, transparent 12px) 0 2px / 100% 16px no-repeat,
    repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.07) 0 2px, transparent 2px 9px),
    linear-gradient(180deg, #c99561, #a46d3c 55%, #7e4f28);
  box-shadow: inset 0 0 0 1px rgba(255, 230, 190, 0.25), 0 16px 26px -14px rgba(0, 0, 0, 0.85);
}
.raiz .miolo {
  clip-path: none;
  overflow: hidden;
  border-radius: 6px 6px 3px 3px;
  background: var(--tm-abismo);
}
.raiz .foto img {
  filter: saturate(0.96) contrast(1.04); /* estático: as fotos já são de celular */
}
.raiz .enfGradacao {
  background: linear-gradient(180deg, rgba(7, 11, 20, 0.55) 0%, transparent 22%, transparent 50%, rgba(7, 11, 20, 0.94) 100%);
}
.raiz .enfRotaGigante {
  display: none;
}
/* A rota numa placa creme de raia. */
.raiz .etiquetaRota {
  border: 0;
  border-radius: 3px;
  padding: 4px 8px;
  background: linear-gradient(180deg, #fbf3e2, #e7d3ad);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  --tm-icone: var(--tm-tinta);
}
/* O nick pela palavra mais larga do ELENCO, medida (--maior-palavra-em: PARRUDAO = 6,627 em):
   todas as cartas no mesmo tamanho, quebrando só entre palavras. SEM filter, transform nem
   position (o nick é o pai do link: a carta inteira continua clicável). */
.raiz .nick {
  --nick: clamp(15px, calc((100cqi - 28px) / var(--maior-palavra-em, 7.2)), 26px);
  overflow-wrap: anywhere; /* como a base: um nick de palavra única gigante parte em vez de vazar */
  text-wrap: balance;
  line-height: 1.02;
  letter-spacing: 0.01em;
  font-kerning: none;
  padding: 0.1em 0.1em 0.12em 0;
  text-shadow: none;
}
.raiz .placaCapitao {
  border-radius: 3px;
  padding: 4px 9px 3px;
  background: #ffe9c9;
  color: var(--tm-tinta); /* 15,7:1 */
}
.raiz .rodape {
  border-top: 0;
  padding: 9px 11px 10px;
  background: #0b1220;
}
.raiz .nome {
  color: var(--tm-prata); /* 13:1 */
}
.raiz .ficha {
  color: var(--coral); /* 6,8:1 */
  font-weight: 700;
}
/* O arqueiro-chefe: penas douradas, cresting de ouro, moldura de bronze polido e os louros com a
   flecha de ouro em volta das penas. */
.raiz .cascaCapitao::before {
  background-image: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 80' preserveAspectRatio='none'%3E%3Crect x='55' y='8' width='10' height='72' fill='%23fff4e0'/%3E%3Cpath d='M55 78C48 72 24 54 18 20L55 12Z' fill='%23f2c38b'/%3E%3Cpath d='M65 78C72 72 96 54 102 20L65 12Z' fill='%23d99a52'/%3E%3Cpath d='M50 66L30 40M52 52L26 28M53 38L28 18M70 66L90 40M68 52L94 28M67 38L92 18' stroke='%23fff' stroke-opacity='.4' stroke-width='1.6'/%3E%3Crect x='52' y='0' width='16' height='12' rx='3' fill='%23ffe9c9'/%3E%3Cpath d='M56 0L60 7L64 0Z' fill='%235a2e12'/%3E%3C/svg%3E");
}
.raiz .cascaCapitao .carta {
  background:
    linear-gradient(180deg, #f2c38b 0 5px, #fff4e0 5px 8px, #16233d 8px 12px, transparent 12px) 0 2px / 100% 16px no-repeat,
    linear-gradient(160deg, #ffe9c9, #e0a866 30%, #9c5f2c 60%, #f2c38b);
}
.raiz .coroaDoCapitao {
  width: clamp(84px, 50%, 120px);
  top: calc(-1 * var(--pena) - 34px);
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.6));
}
/* No tablet o capitão divide a linha com outra carta: só afasta as linhas. */
@media (min-width: 600px) and (max-width: 1023px) {
  .raiz .elenco {
    row-gap: calc(var(--pena) + 64px);
  }
}
/* Celular: o arqueiro-chefe na largura toda, foto 4:3 (a touca e o rosto do Parrudão cabem). */
@media (max-width: 599px) {
  .raiz .cascaLarga .foto {
    aspect-ratio: 4 / 3;
  }
  .raiz .cascaLarga .nick {
    --nick: clamp(20px, calc((100cqi - 28px) / var(--maior-palavra-em, 7.2)), 30px);
  }
}

/* ======================================================================= cartela: a placa de bronze */
.raiz .cartela {
  padding-top: clamp(28px, 4vw, 48px);
}
/* Duas flechas mirando a insígnia, uma de cada lado. */
.raiz .enfLinhaCromo {
  max-width: 560px;
  color: #f2c38b;
}
.raiz .enfLinhaCromo::before,
.raiz .enfLinhaCromo::after {
  height: 12px;
}
.raiz .enfLinhaCromo::before {
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12'%3E%3Cpath d='M0 1L16 6L0 11L3 6Z' fill='%23d9a066'/%3E%3C/svg%3E") 100% 50% / 16px 12px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 12'%3E%3Cpath d='M0 0L10 6L0 12H9L19 6L9 0Z' fill='%23ff6b7a'/%3E%3C/svg%3E") 0 50% / 26px 12px no-repeat,
    linear-gradient(90deg, #efe4cc, #cfa56c) 18px 50% / calc(100% - 30px) 2px no-repeat;
}
.raiz .enfLinhaCromo::after {
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12'%3E%3Cpath d='M16 1L0 6L16 11L13 6Z' fill='%23d9a066'/%3E%3C/svg%3E") 0 50% / 16px 12px no-repeat,
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 12'%3E%3Cpath d='M26 0L16 6L26 12H17L7 6L17 0Z' fill='%23ff6b7a'/%3E%3C/svg%3E") 100% 50% / 26px 12px no-repeat,
    linear-gradient(90deg, #cfa56c, #efe4cc) 12px 50% / calc(100% - 30px) 2px no-repeat;
}
.raiz .enfLinhaCromo svg {
  width: 30px;
}
/* A placa: bronze fundido escovado, borda chanfrada (box-shadow, não ocupa layout), 4 parafusos. */
.raiz .cartelaCorpo {
  isolation: isolate;
  width: min(100% - 40px, 640px);
  margin: 0 auto 26px;
  padding: clamp(22px, 4vw, 34px) clamp(18px, 6vw, 64px) clamp(22px, 3.4vw, 30px);
  border-radius: 8px;
  background:
    radial-gradient(circle at 18px 18px, #f2c38b 0 3px, #5a3418 3.5px 5px, transparent 5.5px),
    radial-gradient(circle at calc(100% - 18px) 18px, #f2c38b 0 3px, #5a3418 3.5px 5px, transparent 5.5px),
    radial-gradient(circle at 18px calc(100% - 18px), #f2c38b 0 3px, #5a3418 3.5px 5px, transparent 5.5px),
    radial-gradient(circle at calc(100% - 18px) calc(100% - 18px), #f2c38b 0 3px, #5a3418 3.5px 5px, transparent 5.5px),
    repeating-linear-gradient(90deg, rgba(255, 220, 170, 0.035) 0 1px, transparent 1px 4px),
    radial-gradient(120% 90% at 30% 20%, #6a4022, #4a2a14 55%, #351d0d);
  box-shadow: inset 0 0 0 3px #b9773f, inset 0 0 0 5px #3a200e, inset 0 0 0 7px #e0a866, inset 0 0 0 8px #5a3418, 0 26px 48px -22px #000;
}
/* O relevo da placa (NaCartela): os louros nos cantos de baixo e as fitas cortadas nos lados. */
.enfPlaca {
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}
.enfLouro {
  position: absolute;
  bottom: 10%;
  width: 12%;
  height: auto;
}
.enfLouroEsq {
  left: 3%;
}
.enfLouroDir {
  right: 3%;
  transform: scaleX(-1);
}
@media (max-width: 599px) {
  .enfLouro {
    display: none;
  }
}
.enfFita {
  position: absolute;
  top: 18px;
  width: 26px;
  height: 92px;
  pointer-events: none;
}
.enfFitaEsq {
  left: -24px;
}
.enfFitaDir {
  right: -24px;
  transform: scaleX(-1);
}
.enfFita svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform-origin: 50% 5%;
}
/* Quando a placa entra na tela, as duas pontas da fita (recém-cortada) balançam e assentam. */
@supports (animation-timeline: view()) {
  .enfFita svg {
    animation: fitaBalanca linear;
    animation-timeline: view();
    animation-range: entry 10% cover 45%;
  }
}
@keyframes fitaBalanca {
  from {
    transform: rotate(-38deg);
  }
  40% {
    transform: rotate(14deg);
  }
  65% {
    transform: rotate(-6deg);
  }
  85% {
    transform: rotate(2deg);
  }
  to {
    transform: none;
  }
}
.raiz .cartelaEscudo {
  width: 84px;
  height: 84px;
  margin-bottom: 8px;
  filter: drop-shadow(0 4px 0 #2a170a) drop-shadow(0 0 10px rgba(0, 0, 0, 0.5)); /* estático */
}
/* As letras em relevo: luz em cima à esquerda, sombra embaixo à direita. */
.raiz .cartelaNome {
  font: 400 clamp(22px, 3vw, 36px) / 1.05 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
  letter-spacing: 0.03em;
  font-kerning: none;
  text-wrap: balance;
  color: #f6d2a2; /* 6,2:1 no bronze claro; 9:1 no escuro */
  text-shadow: -1px -1px 0 rgba(255, 236, 205, 0.35), 1px 2px 0 #1e1006, 0 4px 10px rgba(0, 0, 0, 0.45);
}
.raiz .cartelaDestino {
  margin-top: 10px;
  font: 400 clamp(19px, 2vw, 23px) / 1.25 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0;
  color: #f0cfa4; /* 6:1 */
}
.raiz .cartelaData {
  margin: 12px 0 14px;
  color: #e7c79f; /* 5,5:1 no bronze mais claro */
  text-shadow: 1px 1px 0 #1e1006;
}
/* «MMR: ???»: o medalhão oval cunhado na placa. */
.raiz .cartelaCarimbo {
  margin: 0;
  padding: 8px 18px 7px;
  border-radius: 999px;
  background: radial-gradient(120% 120% at 40% 30%, #7a4a25, #4a2a14);
  box-shadow: inset 0 0 0 2px #e0a866, inset 0 0 0 4px #3a200e, 0 3px 0 #1e1006;
  color: #ffe3bd; /* 6:1 */
  font: 400 16px / 1 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
  letter-spacing: 0.1em;
}
.raiz .cartelaFecho {
  margin: 0 0 20px;
  font: 400 clamp(19px, 1.8vw, 22px) / 1.3 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0;
  color: var(--tm-prata);
  text-shadow: 0 2px 8px rgba(5, 8, 14, 0.9);
}
/* Time sem escudo: a placa não muda (o nome sobe). Celular: a placa estreita para as fitas caberem. */
@media (max-width: 599px) {
  .raiz .cartelaCorpo {
    width: calc(100% - 44px);
  }
  .raiz .cartelaEscudo {
    width: 64px;
    height: 64px;
  }
}

/* ======================================================================= celular e acessibilidade */
@media (max-width: 599px) {
  .enfNuvem:nth-child(n + 4) {
    display: none;
  }
}
/* O bloco da base (.raiz * { animation: none !important }) já para tudo: fica o pôster FINAL —
   flechas cravadas, biruta cheia, fitas penduradas. Aqui só some o que só faz sentido em movimento. */
@media (prefers-reduced-motion: reduce) {
  .enfLasca,
  .enfBrilhoMosca,
  .enfFlechaPerdida {
    display: none;
  }
}
@media (forced-colors: active) {
  .raiz .cromo,
  .raiz .palavra:first-child:not(:last-child) .cromo {
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
    -webkit-text-fill-color: #fff6e6;
  }
  .raiz .eco {
    /* o contorno marinho e a extrusão ajudam aqui: a base os esconde */
    display: block;
  }
}
```

### `components/times/cenarios/estande-ficha.module.css`

```css
/*
 * A ficha do jogador no cenário "estande": a FOTO OFICIAL DO SÓCIO (passe-partout creme, fio coral)
 * com duas flechas cruzadas atrás, como no escudo; o nick em letreiro com extrusão de cobre; as
 * estatísticas numa SÚMULA presa na prancheta; os companheiros viram FLECHAS que apontam para a ficha
 * deles. Mesmas regras: `.raiz` + o seletor da base; conteúdo só transform. Peças com classe dos DOIS
 * módulos do cenário (kicker, chips, heroi): nada aqui repete propriedade que estande.module.css
 * declara nelas com a mesma especificidade.
 */

/* ------------------------------------------------------------------ retrato */
/* Crava como as cartas: cai 14 px girado −2°, bate (1,1°) e assenta. Quadro 0: inteiro e legível. */
@keyframes retratoCrava {
  0%,
  30% {
    transform: translate(0, -14px) rotate(-2deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.4);
  }
  44% {
    transform: translate(0, 3px) rotate(1.1deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  56% {
    transform: rotate(-0.6deg);
  }
  70% {
    transform: rotate(0.25deg);
  }
  100% {
    transform: none;
  }
}
/* As flechas cruzadas passam 16–18% para fora da foto: a casca deixa esse respiro dos lados. */
.raiz .retratoCasca {
  width: min(100% - 96px, 400px);
  margin-top: 56px;
  margin-bottom: 40px;
  transform-origin: 50% 100%;
  animation: retratoCrava 1500ms linear;
}
@media (max-width: 899px) {
  .raiz .retratoCasca {
    width: min(100% - 80px, 330px);
  }
}
/* Os louros com a flecha de ouro em cima (112 px). */
.raiz .retratoCapitao {
  margin-top: 92px;
}
.raiz .enfHaloRetrato {
  inset: -14%;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(176, 86, 52, 0.36), rgba(120, 60, 46, 0.14) 55%, transparent);
}
/* A foto oficial: passe-partout creme, fio marinho, aro coral, fio marinho. */
.raiz .retrato {
  clip-path: none;
  padding: 10px;
  border-radius: 4px;
  background: linear-gradient(180deg, #f6ecd6, #e9d9b6);
  box-shadow: inset 0 0 0 1px #c9b48c, 0 0 0 2px #10131a, 0 0 0 5px #ff6b7a, 0 0 0 7px #10131a, 0 34px 60px -28px #000;
}
/* 4:5 em TODA largura (a base faz 4:3 em 600–899: a touca do Parrudão sairia cortada); a foto
   deitada (fotos.proporcao) continua valendo. */
.raiz .retratoMiolo {
  clip-path: none;
  border-radius: 2px;
  aspect-ratio: var(--proporcao, 4 / 5);
}
@media (min-width: 600px) and (max-width: 899px) {
  .raiz .retratoMiolo {
    aspect-ratio: var(--proporcao, 4 / 5);
  }
}
.raiz .retratoMiolo > img {
  filter: saturate(0.96) contrast(1.04); /* estático */
}
.raiz .enfGradacao {
  background: linear-gradient(180deg, rgba(7, 11, 20, 0.45) 0%, transparent 24%, transparent 70%, rgba(7, 11, 20, 0.7) 100%);
}
.raiz .placa {
  border-radius: 3px;
  background: #16233d;
  color: #f7eedc; /* 13,6:1 */
  box-shadow: inset 3px 0 0 #ff6b7a;
  font-size: 10.5px;
}
.raiz .coroaDoRetrato {
  width: 112px;
  top: -84px;
  filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.6)); /* estático */
}

/* As duas flechas cruzadas atrás da foto (AtrasDoRetrato): pontas para cima, penas embaixo. Cada uma
   entra pelo próprio eixo, vindo de baixo, e crava com um tremor (A aos 364 ms, B aos 504 ms). */
.enfCruzadas {
  position: absolute;
  inset: -16% -18%;
  z-index: -1;
  pointer-events: none;
}
.enfCruzada {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 132%;
  height: 9%;
  translate: -50% -50%;
}
.enfCruzadaA {
  rotate: -54deg;
}
.enfCruzadaB {
  rotate: -126deg;
}
/* Foto deitada (só quem tem fotos.proporcao no tema): o X abre e encurta para não subir no «VOLTAR». */
.raiz .retratoCasca:has(.retratoMiolo[style*="--proporcao"]) .enfCruzada {
  width: 118%;
}
.raiz .retratoCasca:has(.retratoMiolo[style*="--proporcao"]) .enfCruzadaA {
  rotate: -34deg;
}
.raiz .retratoCasca:has(.retratoMiolo[style*="--proporcao"]) .enfCruzadaB {
  rotate: -146deg;
}
.enfCruzadaVoo {
  position: absolute;
  inset: 0;
}
.enfCruzada svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.enfCruzadaA .enfCruzadaVoo {
  animation: cruzaA 1400ms linear;
}
.enfCruzadaB .enfCruzadaVoo {
  animation: cruzaB 1400ms linear;
}
@keyframes cruzaA {
  0%,
  14% {
    transform: translateX(-150%);
    animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
  }
  26% {
    transform: translateX(1.5%);
  }
  32% {
    transform: rotate(1.6deg);
  }
  39% {
    transform: rotate(-1deg);
  }
  47% {
    transform: rotate(0.4deg);
  }
  56%,
  100% {
    transform: none;
  }
}
@keyframes cruzaB {
  0%,
  24% {
    transform: translateX(-150%);
    animation-timing-function: cubic-bezier(0.4, 0, 1, 1);
  }
  36% {
    transform: translateX(1.5%);
  }
  42% {
    transform: rotate(-1.6deg);
  }
  49% {
    transform: rotate(1deg);
  }
  57% {
    transform: rotate(-0.4deg);
  }
  66%,
  100% {
    transform: none;
  }
}

/* ------------------------------------------------------------------ texto */
.raiz .escudoMini {
  width: 30px;
  height: 30px;
}
/* O nick leva o tiro: puxado (−6° de inclinação), solta aos 504 ms (a 2ª flecha crava) e vibra. 2D. */
@keyframes nickAcertou {
  0%,
  30% {
    transform: translate(-0.03em, 0) scaleX(0.96) skewX(-6deg);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  36% {
    transform: translate(0.012em, 0) scaleX(1.03) skewX(3deg);
    animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1);
  }
  43% {
    transform: skewX(-1.4deg);
  }
  51% {
    transform: skewX(0.7deg);
  }
  60%,
  100% {
    transform: none;
  }
}
/* Pela largura MEDIDA do nick em até duas linhas (--largura-nick-em, lib/temas/metricas.ts):
   FAMOSO / PARRUDAO = 6,627 em; BOBBIE / GOODS = 4,53 em; PRESUNTO = 6,52 em numa linha. */
.raiz .nickVisual {
  display: inline-grid; /* eco e cromo na mesma célula: quebram igual */
  line-height: 0.95;
  letter-spacing: 0.01em;
  font-kerning: none;
  font-variant-ligatures: none;
  overflow-wrap: break-word;
  text-wrap: balance;
  margin-top: 0.12em;
  margin-bottom: 0.14em;
  font-size: clamp(30px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.95))), 92px);
  transform-origin: 30% 80%;
  animation: nickAcertou 1400ms linear;
}
@media (min-width: 900px) {
  .raiz .nickVisual {
    font-size: clamp(40px, calc(100cqi / var(--largura-nick-em, calc(var(--maior-palavra, 6) * 0.95))), 112px);
  }
}
/* Eco e cromo na MESMA célula (são peças do outro módulo: `> *`). */
.raiz .nickVisual > * {
  grid-area: 1 / 1;
}
.raiz .nomeReal {
  font: 400 20px / 1.3 var(--tm-fonte-assinatura), cursive;
  letter-spacing: 0;
}
/* .texto: só na ficha (a página centra os chips do herói em .blocoTexto). */
.raiz .texto .chips {
  justify-content: flex-start;
}

/* ------------------------------------------------------------------ a súmula */
/* O título NÃO sobe (14 px no quadro 0 encostariam na prancheta). */
.raiz .performance {
  font: 400 clamp(15px, 1.4vw, 18px) / 1 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
  letter-spacing: 0.08em;
  color: var(--tm-acento); /* 11:1 */
  animation-name: none;
}
.raiz .performance::after {
  height: 12px;
  background:
    url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 12'%3E%3Cpath d='M0 1L16 6L0 11L3 6Z' fill='%23d9a066'/%3E%3C/svg%3E") 100% 50% / 16px 12px no-repeat,
    linear-gradient(90deg, #efe4cc, #cfa56c) 0 50% / calc(100% - 12px) 2px no-repeat;
}
/* A folha pautada, presa na prancheta (o prendedor é o ::before), levemente torta (estático). */
.raiz .estatisticas {
  position: relative;
  gap: 0;
  padding: 22px 10px 10px;
  border-radius: 4px;
  rotate: -0.6deg;
  background:
    repeating-linear-gradient(180deg, transparent 0 23px, rgba(22, 35, 61, 0.1) 23px 24px),
    linear-gradient(180deg, #f6ecd6, #ecdcba);
  box-shadow: 0 18px 30px -16px #000, inset 0 0 0 1px #c9b48c;
}
.raiz .estatisticas::before {
  content: "";
  position: absolute;
  left: 50%;
  top: -12px;
  width: 92px;
  height: 24px;
  translate: -50% 0;
  border-radius: 5px;
  background: linear-gradient(180deg, #d8dde6, #8f97a6);
  box-shadow: inset 0 -3px 0 rgba(0, 0, 0, 0.25), 0 3px 6px rgba(0, 0, 0, 0.4);
}
/* Cada número é ANOTADO: desce 5 px e assenta, em cascata (a duração vem do .sobe da base). */
@keyframes anota {
  0%,
  62% {
    transform: translate(0, -5px) scale(1.04);
    animation-timing-function: cubic-bezier(0.5, 0, 0.9, 0.5);
  }
  78% {
    transform: translate(0, 1px) scale(0.99);
  }
  100% {
    transform: none;
  }
}
/* O item também tem o .sobe da base (0,1,0): esta regra (0,2,0) troca o keyframe e fica com a
   duração em cascata dele. */
.raiz .estatistica {
  padding: 10px 2px 9px;
  border: 0;
  border-right: 1px solid rgba(22, 35, 61, 0.22);
  border-bottom: 1px solid rgba(22, 35, 61, 0.22);
  border-radius: 0;
  background: none;
  animation-name: anota;
  animation-timing-function: linear;
}
.raiz .estatistica:nth-child(4n) {
  border-right: 0;
}
.raiz .estatistica:nth-child(n + 5) {
  border-bottom: 0;
}
.raiz .estatistica::before {
  display: none;
}
.raiz .valor {
  padding: 0;
  background: none;
  color: #16233d; /* 11,6:1 no papel */
  -webkit-text-fill-color: #16233d;
  font: 400 clamp(20px, 2.2vw, 28px) / 1 var(--tm-fonte-titulo), "Alfa Slab Caixa Alta", serif;
}
.raiz .rotulo {
  color: #4a3a22; /* 8:1 */
  font-weight: 700;
  letter-spacing: 0.1em;
}

/* ------------------------------------------------------------------ companheiros: flechas */
/* As penas (::before do li) à esquerda, a ponta de bronze (::after do link) à direita: a flecha
   aponta para a ficha do companheiro. O link continua retangular (o foco é o anel dele). */
.raiz .companheiros {
  gap: 14px 30px;
}
.raiz .companheiro {
  padding-left: 22px;
  padding-right: 22px;
}
.raiz .companheiro::before {
  content: "";
  position: absolute;
  z-index: 1;
  left: 0;
  top: 50%;
  width: 30px;
  height: 40px;
  translate: 0 -50%;
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 40'%3E%3Cpath d='M30 17L8 2H0L14 17Z' fill='%23ff6b7a'/%3E%3Cpath d='M30 23L8 38H0L14 23Z' fill='%23e2505f'/%3E%3Crect x='6' y='18' width='24' height='4' fill='%23f1e5cb'/%3E%3C/svg%3E") 0 50% / 100% 100% no-repeat;
}
.raiz .companheiroLink {
  position: relative;
  overflow: visible;
  min-height: 70px;
  border: 0;
  border-radius: 6px 0 0 6px;
  background: linear-gradient(180deg, #1b2a47, #121d33);
  box-shadow: 0 10px 20px -12px #000, inset 0 0 0 1px rgba(255, 211, 168, 0.12);
}
.raiz .companheiroLink::after {
  content: "";
  position: absolute;
  left: 100%;
  top: 0;
  bottom: 0;
  width: 22px;
  pointer-events: none;
  background: url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 22 70' preserveAspectRatio='none'%3E%3Cpath d='M0 0L22 35L0 70Z' fill='%23d9a066'/%3E%3Cpath d='M0 0L22 35L0 35Z' fill='%23f6d3a0'/%3E%3C/svg%3E") 0 0 / 100% 100% no-repeat;
}
/* A flecha avança (no lugar de subir, como na base). */
.raiz .companheiroLink:hover {
  border-color: transparent;
  translate: 4px 0;
}
.raiz .companheiroFoto {
  flex: 0 0 64px;
  overflow: hidden;
  border-radius: 6px 0 0 6px;
}
.raiz .companheiroRota {
  color: var(--tm-icone); /* 11,3:1 */
}
.raiz .companheiroNick {
  color: var(--tm-texto);
  font-size: 16px;
  font-kerning: none;
  overflow-wrap: normal; /* nunca no meio da palavra */
  text-wrap: balance;
}
/* Celular: UMA coluna (a flecha comprida; FAMOSO PARRUDAO inteiro). */
@media (max-width: 599px) {
  .raiz .companheiros {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .raiz .companheiroFoto {
    flex-basis: 50px;
  }
  .raiz .companheiroNick {
    font-size: 15px;
  }
}
```

### `tests/times/tema-so-adc-bronze-clube.test.tsx`

```tsx
// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FichaDoJogadorComTema } from "@/components/times/ficha-do-jogador-com-tema";
import { PaginaDoTimeComTema } from "@/components/times/pagina-do-time-com-tema";
import { resolveElo, resolveRole } from "@/lib/design";
import { MESSAGES } from "@/lib/i18n/messages";
import type { DesignPlayer, DesignTeam } from "@/lib/roster";
import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
import { METRICAS, larguraDoNickEm, larguraEm, maiorPalavraEm } from "@/lib/temas/metricas";
import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
import { corDoTime, partesDoNome, temaDoTime, textoDoTema } from "@/lib/temas/registro";
import { TEMA_SO_ADC_BRONZE_CLUBE } from "@/lib/temas/so-adc-bronze-clube";
import type { TemaDoTime } from "@/lib/temas/tipos";

/*
 * A página temática do SO ADC BRONZE CLUBE (27/10/2026), «A Mosca Intacta»: o estande de arco e
 * flecha. O que o leitor de tela lê, os textos, a ordem do elenco, a largura MEDIDA da Alfa Slab One,
 * a regra dos enfeites — e que os outros três temas não ganharam nada do estande.
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
    elo: "Esmeralda",
    eloMeta: resolveElo("Esmeralda"),
    pts: 6,
    role1: role,
    roleMeta: resolveRole(role),
    teamId: "verdante",
    teamName: "SO ADC BRONZE CLUBE",
    teamSlug: "so-adc-bronze-clube",
    teamColor: "#FF6B7A",
    reserva: false,
    saiu: false,
    noElenco: true,
    ...extra,
  } as DesignPlayer;
}

const ROSTER = [
  jogador("bobbie-goods", "bobbie goods", "TOP"),
  jogador("famoso-parrudao", "Famoso Parrudao", "JUNG", { captain: true }),
  jogador("presunto", "PRESUNTO", "MID"),
  jogador("weslay", "WeSlay", "ADC"),
  jogador("cacu", "Caçu", "SUP"),
];
const TIME: DesignTeam = {
  id: "verdante",
  name: "SO ADC BRONZE CLUBE",
  slug: "so-adc-bronze-clube",
  color: "#FF6B7A",
  imageUrl: "/teams/so-adc-bronze-clube.webp",
  roster: ROSTER,
  captain: ROSTER[1]!,
  total: 29,
};

function paginaDoTime(tema: TemaDoTime = TEMA_SO_ADC_BRONZE_CLUBE, time: DesignTeam = TIME) {
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
      tema={TEMA_SO_ADC_BRONZE_CLUBE}
      t={t}
      tiles={[{ label: "PARTIDAS", val: "0" }]}
      opggUrl="https://op.gg/x"
      temporada="4ª Edição"
      voltar={{ href: "/times/so-adc-bronze-clube", texto: t.jogadorVoltar }}
    />,
  );
}

/** Todo elemento com classe de enfeite (CSS Modules: `_enfAlgo_hash`) é aria-hidden ou mora num. */
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

/** O texto que o leitor de tela ouve: tudo fora de aria-hidden. */
function lidoPeloLeitor(el: Element): string {
  const copia = el.cloneNode(true) as Element;
  for (const oculto of copia.querySelectorAll('[aria-hidden="true"]')) oculto.remove();
  return copia.textContent ?? "";
}

const ALFA = METRICAS["alfa-slab-one"]!;

describe("registro: o tema do SO ADC BRONZE CLUBE", () => {
  it("acha pelo slug; o id do draft (verdante) sozinho não tem tema", () => {
    expect(temaDoTime("so-adc-bronze-clube")).toBe(TEMA_SO_ADC_BRONZE_CLUBE);
    expect(temaDoTime("verdante")).toBeNull();
  });

  it("a cor do time no site é o coral do alvo; sem o slug, a verde da VERDANTE", () => {
    expect(corDoTime({ id: "verdante", slug: "so-adc-bronze-clube" })).toBe("#FF6B7A");
    expect(corDoTime({ id: "verdante", slug: "verdante" })).toBe("#3fb27f");
  });

  it("parte o nome pelo sufixo: SO ADC grande, BRONZE CLUBE embaixo", () => {
    expect(partesDoNome("SO ADC BRONZE CLUBE", undefined, "BRONZE CLUBE")).toEqual({ assinatura: "BRONZE CLUBE", marca: "SO ADC" });
    expect(partesDoNome("So ADC Bronze Clube", undefined, "BRONZE CLUBE")).toEqual({ assinatura: "Bronze Clube", marca: "So ADC" });
  });

  it("os textos do tema saem no idioma da página", () => {
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, t, "capitao")).toBe("ARQUEIRO-CHEFE");
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, MESSAGES.en.paginasHome, "estrelando")).toBe("THE QUIVER");
    expect(textoDoTema(TEMA_SO_ADC_BRONZE_CLUBE, MESSAGES.en.paginasHome, "carimbo")).toBe("MMR: ???");
  });
});

describe("a largura medida da Alfa Slab One (lib/temas/metricas.ts)", () => {
  it("ADC = 2,332 em de avanço + 3 × 0,01 + 0,22 de tinta = 2,582 em (a maior palavra do «SO ADC»)", () => {
    expect(maiorPalavraEm("SO ADC", ALFA)).toBe(2.582);
    expect(larguraEm("ADC", ALFA)).toBe(2.582);
  });

  it("o padrão é o caractere mais largo medido (o W); fora da tabela nunca estoura", () => {
    expect(ALFA.padrao).toBeGreaterThanOrEqual(Math.max(...Object.values(ALFA.avancos)));
    expect(larguraEm("ㅤ", ALFA)).toBe(1.437); // 1,207 + 0,01 + 0,22
  });

  it("nick da ficha: até duas linhas, só entre palavras", () => {
    expect(larguraDoNickEm("Famoso Parrudao", ALFA)).toBe(6.627); // FAMOSO / PARRUDAO
    expect(larguraDoNickEm("bobbie goods", ALFA)).toBe(4.53); // BOBBIE / GOODS
    expect(larguraDoNickEm("PRESUNTO", ALFA)).toBe(6.52);
    expect(larguraDoNickEm("WeSlay", ALFA)).toBe(5.109);
    expect(larguraDoNickEm("Caçu", ALFA)).toBe(3.291);
  });

  it("a reserva é mais estreita: a fonte de título pede «Alfa Slab Caixa Alta» (Arial a 88%)", () => {
    const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/estande.module.css"), "utf8");
    expect(css).toMatch(/font-family: "Alfa Slab Caixa Alta";[\s\S]*?size-adjust: 88%;/);
    // a Alfa tem kerning: todo texto medido o desliga
    expect(css).toMatch(/\.raiz \.marca \{[^}]*font-kerning: none;/);
    expect(css).toMatch(/\.raiz \.nick \{[^}]*font-kerning: none;/);
  });
});

describe("página temática do SO ADC BRONZE CLUBE", () => {
  it("o leitor de tela lê o nome uma vez; as 5 letras são aria-hidden; o título leva a largura medida", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("SO ADC BRONZE CLUBE");
    const visual = h1.querySelector('[aria-hidden="true"]')!;
    expect(visual.querySelectorAll('[class*="letra"]')).toHaveLength(5);
    expect(visual.querySelectorAll('[class*="palavra"]')).toHaveLength(2);
    expect(visual.getAttribute("style")).toContain("--largura-em:2.582");
  });

  it("o elenco: TOP, MID, ADC, SUP e o arqueiro-chefe (o capitão) por último", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const nicks = [...doc.querySelectorAll("li h3")].map((h) => h.textContent);
    expect(nicks).toEqual(["bobbie goods", "PRESUNTO", "WeSlay", "Caçu", "Famoso Parrudao"]);
    expect(doc.querySelectorAll('li a[href^="/jogadores/"]')).toHaveLength(5);
    expect(doc.querySelector("ul[data-n]")!.getAttribute("style")).toContain("--maior-palavra-em:6.627");
  });

  it("o enquadramento das fotos: as duas caras do bobbie goods na carta (o Lucas quer os dois juntos)", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const foco = (slug: string) =>
      doc.querySelector(`a[href="/jogadores/${slug}"]`)!.closest("li")!.querySelector('[style*="--foco"]')!.getAttribute("style");
    expect(foco("bobbie-goods")).toContain("--foco:52% 50%");
    expect(foco("famoso-parrudao")).toContain("--foco:50% 62%");
  });

  it("os textos do tema aparecem; ARQUEIRO-CHEFE na tela, CAPITÃO para o leitor", () => {
    const doc = new DOMParser().parseFromString(paginaDoTime(), "text/html");
    const texto = doc.body.textContent ?? "";
    for (const trecho of [
      "3 ADCs improvisados · querendo vencer",
      "A ALJAVA",
      "Inscritos como ADC: 3 · jogando de ADC: 1.",
      "ARQUEIRO-CHEFE",
      "Fundado em 2024 · 3 ADCs, 1 bot lane",
      "NO ESTANDE DE 13 DE NOVEMBRO A 6 DE DEZEMBRO",
      "MMR: ???",
      "A mosca segue intacta desde 2024.",
    ]) {
      expect(texto).toContain(trecho);
    }
    const lido = lidoPeloLeitor(doc.body);
    expect(lido).toContain("CAPITÃO");
    expect(lido).not.toContain("ARQUEIRO-CHEFE");
  });

  it("o cenário estande: alvo, raias vizinhas, flechas, gramado e a placa", () => {
    const html = paginaDoTime();
    expect(html).toContain('data-tema="so-adc-bronze-clube"');
    expect(html).toContain('data-cenario="estande"');
    expect(html).not.toContain("data-fotos"); // fotos de celular, não medalhão
    for (const peca of ["enfAlvo", "enfVizinho", "enfFlecha1", "enfFlecha2", "enfFlecha3", "enfFlechaPerdida", "enfBrilhoMosca", "enfGramado", "enfCampo", "enfPlaca", "enfFita", "enfRajada", "enfLinhaDeTiro"]) {
      expect(html).toMatch(new RegExp(peca));
    }
    expect(html).not.toMatch(/enfLousa|enfTela|enfLua|enfTrilhos|enfCoroa|enfGrade/);
  });

  it("todo enfeite é aria-hidden e sem texto; todo svg é aria-hidden", () => {
    const html = paginaDoTime();
    expect(html.match(/class="[^"]*enf[A-Z]/g)?.length ?? 0).toBeGreaterThan(30);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });

  it("os ids dos SVG não se repetem (gradientes com prefixo)", () => {
    const ids = [...paginaDoTime().matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("os outros temas não ganham nada do estande", () => {
  it.each([TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR])("$slug: sem alvo, sem flecha, sem placa", (tema) => {
    const html = paginaDoTime(tema, { ...TIME, slug: tema.slug });
    expect(html).not.toMatch(/enfAlvo|enfFlecha|enfPlaca|enfRajada/);
    expect(html).not.toContain('data-cenario="estande"');
  });
});

describe("ficha temática de um jogador do SO ADC BRONZE CLUBE", () => {
  it("o nick é o h1, lido uma vez, com a largura de duas linhas; AS OUTRAS FLECHAS com os 4 companheiros", () => {
    const doc = new DOMParser().parseFromString(ficha(), "text/html");
    const h1 = doc.querySelector("h1")!;
    expect(lidoPeloLeitor(h1)).toBe("Famoso Parrudao");
    expect(h1.querySelector('[aria-hidden="true"]')!.getAttribute("style")).toContain("--largura-nick-em:6.627");
    const companheiros = [...doc.querySelectorAll('ul a[href^="/jogadores/"]')].map((a) => a.getAttribute("href"));
    expect(companheiros).toEqual(["/jogadores/bobbie-goods", "/jogadores/presunto", "/jogadores/weslay", "/jogadores/cacu"]);
    expect(doc.body.textContent).toContain("AS OUTRAS FLECHAS");
    expect(lidoPeloLeitor(doc.body)).toContain("CAPITÃO");
  });

  it("a foto deitada do bobbie goods sai inteira (4:3) na ficha", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(doc.querySelector('[style*="--proporcao"]')!.getAttribute("style")).toContain("--proporcao:4 / 3");
  });

  it("entre os companheiros, o leitor de tela ouve quem é o capitão (os louros são só desenho)", () => {
    const doc = new DOMParser().parseFromString(ficha(ROSTER[0]!), "text/html");
    expect(lidoPeloLeitor(doc.querySelector('a[href="/jogadores/famoso-parrudao"]')!)).toContain("CAPITÃO");
  });

  it("todo enfeite é aria-hidden e sem texto (as flechas cruzadas atrás do retrato também)", () => {
    const html = ficha();
    expect(html).toMatch(/enfCruzadas/);
    expect(enfeitesSemTexto(html)).toEqual([]);
  });
});

describe("o último raio de sol é PINTURA que nunca esconde", () => {
  const css = readFileSync(path.join(process.cwd(), "components/times/cenarios/estande.module.css"), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );
  const keyframe = (nome: string) => new RegExp(`@keyframes ${nome}\\s*\\{([\\s\\S]*?)\\n\\}`).exec(css)?.[1] ?? "";

  it("ultimoRaio só mexe na posição do fundo; a face tem tinta sólida antes do background-clip", () => {
    const declaradas = [...keyframe("ultimoRaio").matchAll(/([\w-]+)\s*:/g)].map((m) => m[1]);
    expect(new Set(declaradas)).toEqual(new Set(["background-position"]));
    expect(css).toMatch(/\.raiz \.cromo \{\s*color: #f3e3c3;/);
  });
});
```

---

## Apêndice B — as mudanças nos arquivos existentes (diff unificado)

Os arquivos inteiros, já mudados, estão em `final\`. Só linhas acrescentadas, exceto as duas uniões de tipo em `tipos.ts`.

```diff
--- a/lib/temas/tipos.ts
+++ b/lib/temas/tipos.ts
@@ -10,10 +10,18 @@
 import type { PaginasHomeTextos } from "@/lib/i18n/messages/paginas-home";
 
 /** As fontes que um tema pode pedir (components/times/fontes-dos-temas.ts carrega cada uma). */
-export type ChaveDeFonte = "exo2-italico" | "permanent-marker" | "bungee" | "special-elite" | "knewave" | "kalam";
+export type ChaveDeFonte =
+  | "exo2-italico"
+  | "permanent-marker"
+  | "bungee"
+  | "special-elite"
+  | "knewave"
+  | "kalam"
+  | "alfa-slab-one"
+  | "yellowtail";
 
 /** Os cenários prontos (components/times/cenarios: um componente e um CSS module por cenário). */
-export type Cenario = "tempestade" | "estacao" | "boteco";
+export type Cenario = "tempestade" | "estacao" | "boteco" | "estande";
 
 /** Os textos que um tema troca ou acrescenta na página e na ficha (o lema, o "A BORDO"…). */
 export type PapelDoTexto =
--- a/lib/temas/registro.ts
+++ b/lib/temas/registro.ts
@@ -5,10 +5,11 @@
 import { TEMA_EQUIPE_RX } from "@/lib/temas/equipe-rx";
 import { TEMA_GALACTICOS_DO_BAR } from "@/lib/temas/galacticos-do-bar";
 import { TEMA_QUEIJO_MINAS } from "@/lib/temas/queijo-minas";
+import { TEMA_SO_ADC_BRONZE_CLUBE } from "@/lib/temas/so-adc-bronze-clube";
 import type { CoresDoTema, MetalDoTema, PapelDoTexto, TemaDoTime } from "@/lib/temas/tipos";
 
 /** Os times com página temática. Time novo: um arquivo em lib/temas e uma linha aqui. */
-const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR];
+const TEMAS: readonly TemaDoTime[] = [TEMA_EQUIPE_RX, TEMA_QUEIJO_MINAS, TEMA_GALACTICOS_DO_BAR, TEMA_SO_ADC_BRONZE_CLUBE];
 
 /** O tema do time pelo slug — ou null, e a página fica com o visual padrão do site. */
 export function temaDoTime(slug: string): TemaDoTime | null {
--- a/lib/temas/metricas.ts
+++ b/lib/temas/metricas.ts
@@ -46,8 +46,36 @@
   sobra: 0.32,
 };
 
+/**
+ * Alfa Slab One (SO ADC BRONZE CLUBE), medida em 27/10/2026 do mesmo jeito que a Knewave. ATENÇÃO: a
+ * Alfa TEM kerning (PARRUDAO: 6,133 em com kerning, 6,327 sem). O tema desliga (`font-kerning: none`
+ * no título, no nick da ficha, nos nicks das cartas e no nome da placa) e a soma das letras volta a
+ * ser a largura da palavra (ADC = 0,806 + 0,804 + 0,722 = 2,332 em).
+ */
+const ALFA_SLAB_ONE: MetricasDaFonte = {
+  avancos: {
+    A: 0.806, B: 0.775, C: 0.722, D: 0.804, E: 0.713, F: 0.632, G: 0.782, H: 0.84, I: 0.42,
+    J: 0.666, K: 0.835, L: 0.653, M: 1.143, N: 0.942, O: 0.792, P: 0.738, Q: 0.81, R: 0.8,
+    S: 0.674, T: 0.78, U: 0.781, V: 0.786, W: 1.207, X: 0.8, Y: 0.776, Z: 0.689,
+    Á: 0.806, À: 0.806, Â: 0.806, Ã: 0.806, Ä: 0.806, É: 0.713, È: 0.713, Ê: 0.713, Ë: 0.713,
+    Í: 0.42, Ì: 0.42, Î: 0.42, Ï: 0.42, Ó: 0.792, Ò: 0.792, Ô: 0.792, Õ: 0.792, Ö: 0.792,
+    Ú: 0.781, Ù: 0.781, Û: 0.781, Ü: 0.781, Ç: 0.722, Ñ: 0.942,
+    "0": 0.732, "1": 0.522, "2": 0.649, "3": 0.623, "4": 0.694, "5": 0.651, "6": 0.693, "7": 0.648, "8": 0.7, "9": 0.693,
+    " ": 0.3, ".": 0.244, ",": 0.245, "-": 0.389, "_": 0.6, "'": 0.193, "!": 0.339, "?": 0.63, "&": 0.828, "+": 0.576, "·": 0.204, "#": 0.732,
+    "@": 1.148, "(": 0.374, ")": 0.374, "/": 0.423, ":": 0.244, "%": 0.885, "©": 0.726, "®": 0.726, Æ: 1.138, Œ: 1.107, Þ: 0.762, Ø: 0.792,
+  },
+  /** O W, o mais largo medido (o ㅤ e o CJK dos nicks contam como ele). */
+  padrao: 1.207,
+  espacamento: 0.01,
+  /** A extrusão de cobre (0,088 em para a direita), o contorno (0,035 de cada lado) e a folga. */
+  sobra: 0.22,
+};
+
 /** As métricas pela fonte do título do tema (`tema.fontes.titulo`). */
-export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = { knewave: KNEWAVE };
+export const METRICAS: Readonly<Partial<Record<ChaveDeFonte, MetricasDaFonte>>> = {
+  knewave: KNEWAVE,
+  "alfa-slab-one": ALFA_SLAB_ONE,
+};
 
 /** Três casas (o erro de arredondar, < 0,0005 em, some dentro da sobra). */
 const arredonda = (n: number) => Math.round(n * 1000) / 1000;
--- a/components/times/fontes-dos-temas.ts
+++ b/components/times/fontes-dos-temas.ts
@@ -1,4 +1,4 @@
-import { Bungee, Exo_2, Kalam, Knewave, Permanent_Marker, Special_Elite } from "next/font/google";
+import { Alfa_Slab_One, Bungee, Exo_2, Kalam, Knewave, Permanent_Marker, Special_Elite, Yellowtail } from "next/font/google";
 
 import type { ChaveDeFonte } from "@/lib/temas/tipos";
 
@@ -65,6 +65,27 @@
   preload: false,
 });
 
+// SO ADC BRONZE CLUBE: o letreiro de clube (slab pesada) e o script do «So» e das frases.
+// A reserva é uma Arial ENCOLHIDA (@font-face em cenarios/estande.module.css): mais estreita que a
+// Alfa em toda letra, o título nunca sai cortado enquanto ela carrega.
+const alfaSlabOne = Alfa_Slab_One({
+  subsets: ["latin"],
+  weight: "400",
+  variable: "--tm-fonte-titulo",
+  display: "swap",
+  preload: false,
+  adjustFontFallback: false,
+  fallback: ["Alfa Slab Caixa Alta"],
+});
+
+const yellowtail = Yellowtail({
+  subsets: ["latin"],
+  weight: "400",
+  variable: "--tm-fonte-assinatura",
+  display: "swap",
+  preload: false,
+});
+
 export const FONTES_DOS_TEMAS: Readonly<Record<ChaveDeFonte, { variable: string }>> = {
   "exo2-italico": exo2Italico,
   "permanent-marker": permanentMarker,
@@ -72,4 +93,6 @@
   "special-elite": specialElite,
   knewave,
   kalam,
+  "alfa-slab-one": alfaSlabOne,
+  yellowtail,
 };
--- a/components/times/cenarios/index.ts
+++ b/components/times/cenarios/index.ts
@@ -1,4 +1,5 @@
 import { BOTECO } from "@/components/times/cenarios/boteco";
+import { ESTANDE } from "@/components/times/cenarios/estande";
 import { ESTACAO } from "@/components/times/cenarios/estacao";
 import { TEMPESTADE } from "@/components/times/cenarios/tempestade";
 import type { CenarioDoTema } from "@/components/times/cenarios/tipos";
@@ -9,4 +10,5 @@
   tempestade: TEMPESTADE,
   estacao: ESTACAO,
   boteco: BOTECO,
+  estande: ESTANDE,
 };
--- a/lib/i18n/messages/paginas-home.ts
+++ b/lib/i18n/messages/paginas-home.ts
@@ -140,6 +140,16 @@
     temaGalacticosFiado: "FIADO SÓ AMANHÃ",
     temaGalacticosFecho: "Beba com moderação · jogue sem moderação nenhuma.",
     temaGalacticosMesa: "A MESA TODA",
+    // SO ADC BRONZE CLUBE, «A Mosca Intacta» (lib/temas/so-adc-bronze-clube.ts)
+    temaSoAdcLema: "3 ADCs improvisados · querendo vencer",
+    temaSoAdcAljava: "A ALJAVA",
+    temaSoAdcAviso: "Inscritos como ADC: 3 · jogando de ADC: 1.",
+    temaSoAdcCapitao: "ARQUEIRO-CHEFE",
+    temaSoAdcEstande: "NO ESTANDE {periodo}",
+    temaSoAdcFundacao: "Fundado em 2024 · 3 ADCs, 1 bot lane",
+    temaSoAdcMmr: "MMR: ???",
+    temaSoAdcFecho: "A mosca segue intacta desde 2024.",
+    temaSoAdcFlechas: "AS OUTRAS FLECHAS",
 
     // ---------- jogadores ----------
     jogadoresTitulo: "JOGADORES",
@@ -310,6 +320,15 @@
     temaGalacticosFiado: "FIADO SÓ AMANHÃ",
     temaGalacticosFecho: "Drink responsibly · play irresponsibly.",
     temaGalacticosMesa: "THE WHOLE TABLE",
+    temaSoAdcLema: "3 improvised ADCs · trying to win",
+    temaSoAdcAljava: "THE QUIVER",
+    temaSoAdcAviso: "Signed up as ADC: 3 · actually playing ADC: 1.",
+    temaSoAdcCapitao: "HEAD ARCHER",
+    temaSoAdcEstande: "AT THE RANGE {periodo}",
+    temaSoAdcFundacao: "Founded in 2024 · 3 ADCs, 1 bot lane",
+    temaSoAdcMmr: "MMR: ???",
+    temaSoAdcFecho: "The bullseye has been untouched since 2024.",
+    temaSoAdcFlechas: "THE OTHER ARROWS",
 
     // ---------- jogadores ----------
     jogadoresTitulo: "PLAYERS",
--- a/tests/stubs/next-font-google.ts
+++ b/tests/stubs/next-font-google.ts
@@ -12,3 +12,5 @@
 export const Special_Elite = fonte;
 export const Knewave = fonte;
 export const Kalam = fonte;
+export const Alfa_Slab_One = fonte;
+export const Yellowtail = fonte;
--- a/tests/times/temas-sem-opacidade.test.ts
+++ b/tests/times/temas-sem-opacidade.test.ts
@@ -166,6 +166,15 @@
     "nickPousa",
     "tampinhaCai",
     "tampinhaGira",
+    // o SO ADC BRONZE CLUBE (cenarios/estande)
+    "cravado",
+    "corda",
+    "assinaturaPuxa",
+    "crava",
+    "cravaRelogio",
+    "retratoCrava",
+    "nickAcertou",
+    "anota",
   ])(
     "%s anima transform e nada que esconda",
     (nome) => {
```

---

## Ajustes obrigatórios do juiz

> Vencem o spec onde os dois discordarem (28/10/2026). O parecer geral está em `..\juiz.md`.
> Veredito: **aprovado com poucos ajustes** — o filme (corda, tranco, três flechas, a mosca do
> vizinho) é o que mais rende em 3 s; rodou no harness com a base real. Ajustes: a cor do time, um
> nome de keyframe e a integração com a base pronta.

### J1. Dados finais
- **`cor: "#FF6A55"`** (sai `#FF6B7A`, que ficava a ΔE 5,6 do vermelho da rota ADC `#E85C6A`: no resto
  do site — tabela, calendário, listas — o time e a rota se confundiam). Agora: 11,1 da rota ADC,
  24,5 do Fãs de Rosca (o vizinho mais perto), 7,0:1 no fundo do site. Troque em `tema.cor` e no
  teste novo (`corDoTime(...)` dá `#FF6A55` com slug e `#3fb27f` sem; os `teamColor`/`color` das
  fixtures também vão para `#FF6A55`). O «plano B `#FF8FB1`» da 3.4 morre.
- **O coral DA CENA fica `#FF6B7A`** (`neon`, `--coral`, penas, listras, o «So», a fita cortada, os
  literais `#ff6b7a`/`%23ff6b7a` dos SVG e data-URI): é tom de cenário, não a cor do time, e o
  `#FF6A55` ficaria a ΔE 7,7 do cobre do contraluz (`primaria #E2734A`) — as penas sumiriam no pôr do
  sol. Coral e cor do time ficam na mesma família (ΔE 10,3 entre eles).
- Fontes: título `alfa-slab-one` = `Alfa_Slab_One`, `weight: "400"`, `subsets: ["latin"]`,
  `adjustFontFallback: false`, `fallback: ["Alfa Slab Caixa Alta"]` (Arial local a 88%, o
  `@font-face` no topo de `estande.module.css`); assinatura `yellowtail` = `Yellowtail`,
  `weight: "400"`, `subsets: ["latin"]`. Sem mudança.
- `sufixo: "BRONZE CLUBE"`, `letraPorLetra: true`, `cenario: "estande"`, fotos como na 3.7 (com
  `proporcao: { "bobbie-goods": "4 / 3" }`: a foto com o Lula fica, de zoeira, como o Lucas pediu).
- Cabeçalho do site: fundo `rgba(7, 11, 20, 0.95)` → `rgba(7, 11, 20, 0.84)` (o `breu` do alto do
  céu), fio `rgba(226, 115, 74, 0.28)` (o cobre do pôr do sol, o mesmo fio da rajada logo abaixo).

### J2. A base comum JÁ FEZ o apêndice B — não aplique o diff
`tipos.ts`, `registro.ts`, `fontes-dos-temas.ts`, `cenarios/index.ts`, o stub e `link-da-carta` já
estão no branch. Leve só:
1. a tabela `ALFA_SLAB_ONE` (`padrao: 1.207`, `espacamento: 0.01`, `sobra: 0.22`) para o SEU bloco de
   `lib/temas/metricas.ts` (a fonte não mudou: vale a medida do designer; 2,582 / 6,627 / 4,53 /
   6,52 / 5,109 / 3,291 continuam);
2. a lista de keyframes de entrada da seção 10 para o SEU bloco de `temas-sem-opacidade.test.ts`;
3. os 9 textos para `lib/i18n/messages/temas/so-adc-bronze-clube.ts` (não `paginas-home.ts`).

### J3. Keyframe com nome único
`lascaVoa` → **`lascaVoaEstande`** (a academia também tem). Depois de juntar com os outros, o
`grep … | uniq -d` do `juiz.md` §2 tem de sair vazio.

### J4. O que fica como está (conferido)
- Laços: nuvens (3; 2 no celular), biruta (≥ 1024), brilho da mosca (9 s) e o halo da base: 6 no
  computador, 4 no celular, só transform/opacidade. Dentro do orçamento.
- O «último raio de sol» anima `background-position` no `.cromo` (uma vez, com tinta sólida antes do
  `background-clip`): é o mesmo padrão do `brilhoCromo` da base — pode.
- Os `translate3d` do spec estão em enfeites (`folego` no palco, `alvoTreme`): ok. Conteúdo é 2D.
- Movimento reduzido: o `.raiz *` da base para página e ficha (a raiz da ficha leva o `.raiz` do
  `tema.module.css`); o spec já esconde lascas, brilho e a flecha que passa reto.

### J5. Conferências no repo (o harness era uma cópia)
- Refaça a 4.3 com os dados de produção (13 larguras), o build de produção incluído: o
  `@supports (grid-template-rows: subgrid)` e o `:has([style*="--proporcao"])` só foram vistos no
  Vite, nunca no pipeline do Next — confira no `next build` que os dois sobrevivem ao minificador e
  que, sem subgrid (simule tirando o `@supports`), a página cai na ordem da base legível.
- Quadro 0 congelado DESDE o carregamento (risco 9 do spec: a rajada de 700 ms escapa do
  `getAnimations()` se o print for tirado depois): use o CDP como o `scripts\captura.cjs` do designer.
- O vídeo é do capitão (Famoso Parrudao), não do bobbie (foto provisória), como o spec sugere.
