# Parecer do juiz — 5 temas da 4ª Edição (28/10/2026)

> Este arquivo é o parecer GERAL (todas as seções fechadas em 28/10). Cada spec tem, no fim, a seção «## Ajustes obrigatórios do juiz»,
> que VENCE o spec onde os dois discordarem. Onde este parecer e a seção do spec discordarem, vale a
> seção do spec (é a mais específica). Os ajustes de cada time estão no fim do spec dele.

## 1. Cores dos times (fechado)

| Time | Cor do time (`tema.cor`) | Contraste no fundo #0f0b07 | Vizinho mais perto |
|---|---|---|---|
| Fãs de Rosca | **#FFA3C8** (rosa do glacê) | 10,6:1 | Furiosos 18,8 |
| Os 5 Furiosos | **#E27CFE** (saiu #D98BFF: 7,8 do lilás da rota SUP) | 8,0:1 | Rosca 18,8; GdB 23,0 |
| So ADC | **#FF6A55** (saiu #FF6B7A: 5,6 do vermelho da rota ADC) | 7,0:1 | Rosca 24,5 |
| Os 5 Sem Ping | **#3DFF8F** | 14,8:1 | QM 30,2 |
| Desorganização | **#FFE14D** (o OURO do leão coroado; o rosa #FFB3C7 estava a 5,2 do rosa da Rosca) | 15,1:1 | Sem Ping 31,4 |

Matriz ΔE2000 completa (calc/final.py): menor entre as novas 18,8 (Rosca×Furiosos); menor nova×fixa
23,0 (Furiosos×GdB); todas ≥ 15. Cores de rota/elo mais perto (só referência, a regra é entre times):
Furiosos 10,3 de Mestre/SUP, So ADC 11,1 de ADC, Sem Ping 11,5 de Esmeralda, Desorg 11,8 de Ouro —
aceitável (o site nunca põe a cor do time como rótulo de rota/elo).

Onde a cor do time aparece DENTRO do tema (conferido no código dos designers): `tema.cor` só alimenta
`corDoTime` (tabela, calendário, listas), nunca a página temática. Então:
- **Fãs de Rosca e Os 5 Sem Ping:** a cor não mudou; nada a trocar.
- **Os 5 Furiosos:** `#D98BFF` só existe em `tema.cor` e no teste → `#E27CFE` nos dois. Os roxos da
  página (`primaria #9B5CFF`, `neon #C77DFF`, metal) ficam.
- **So ADC:** `#FF6B7A` está em 18 lugares (CSS, SVG, data-URI, teste). Troca SÓ em `tema.cor` e no
  teste (`#FF6A55`); o coral da CENA (`neon`, `--coral`, penas, «So», fita) FICA `#FF6B7A`, porque o
  `#FF6A55` cairia a ΔE 7,7 do cobre do contraluz (`#E2734A`) e as penas sumiriam no pôr do sol.
- **Desorganização:** `#FFB3C7` sai de `tema.cor` e do teste (`#FFE14D`); o algodão-doce rosa da
  plateia fica como tom de cena (deixa de ser «a cor do time»). O ouro do leão já é a família da
  página (frisos, folha de ouro do título).

## 2. Nomes de @keyframes ÚNICOS em components/times (fechado)

O teste `tests/times/temas-sem-opacidade.test.ts` junta os keyframes de TODOS os módulos num `Map`
por nome: o último arquivo lido vence, e o teste passa a conferir o corpo errado. Repetidos hoje:
`faixaAbre` (boteco + academia), `haloNasce` (boteco + academia + album), `lascaVoa` (academia +
estande). Regra para os 5: **todo @keyframes novo tem nome que não existe em nenhum outro arquivo de
components/times** — nem no módulo da ficha do próprio tema (se a ficha precisa da mesma animação,
declare-a com outro nome, ex.: `oculosDoAdmFicha`). Conferência antes do commit (tem de sair vazio):

```
grep -rhoE "@keyframes +[A-Za-z0-9_-]+" components/times --include=*.module.css | sort | uniq -d
```

Como os 5 trabalham em paralelo, use o PREFIXO do cenário nos nomes que são genéricos (`halo…`,
`faixa…`, `brilho…`, `pisca…`, `sobe…`, `balanca…`): ex. `haloAcademia`, `faixaAbreAcademia`,
`lascaVoaEstande`. Nomes já bem específicos do conceito (`roscaDireta`, `saltoDoLeao`) ficam.
Lembre de atualizar a lista do seu bloco em `temas-sem-opacidade.test.ts` com os nomes finais.

## 3. Fonte de título do Os 5 Sem Ping: **Unbounded 800** (fechado)

- Lilita One fica SÓ com os Furiosos (o vinil gordo das figurinhas nasceu dela; lá ela é o material).
  Sem Ping troca para **Unbounded**, a geométrica LARGA de interface — o «título de app» de chamada
  de voz, que conversa com a Sora da interface sem ser techno itálico (Exo 2/RX) nem bloco de
  letreiro (Bungee/QM). Conferida no font-data.json do Next instalado: pesos 200–900 + `variable`
  (eixo wght 200–900), só `normal`, subsets cyrillic, cyrillic-ext, latin, latin-ext, vietnamese;
  tem Ã Ç É Õ Ê (juiz-trabalho/calc/unbounded-row.png). Não repete nenhuma das 8 identidades
  (folha juiz-trabalho/lado-a-lado.png).
- **Peso 800, não 900** (juiz-trabalho/t3/gel.png): com o adesivo de gel do spec (traço branco +
  anel escuro), a 900 fecha os olhos do P, R, A e G nos nicks de 20–30 px; a 800 fica aberta e
  ainda gorda. Um peso só para título E nicks (a métrica é por fonte): o `.raiz` declara
  `--tm-titulo-peso: 800; --tm-titulo-peso-medio: 800; --tm-titulo-estilo: normal;
  font-synthesis: none` (sem o 800 explícito o nick sairia no 800 e o título no 900 da base, e a
  métrica medida no 800 estouraria).
- Dados: chave `unbounded`, export `Unbounded`, `weights` não declarado (o next/font baixa a
  variável, um arquivo: 800 do título e o que mais precisar), `styles ["normal"]`, `subsets
  ["latin"]`, `fallback: ["Sem Ping Reserva"]`, `adjustFontFallback: false` (a base já declara
  exatamente isso em fontes-dos-temas.ts — nada a mudar lá).
- **Reserva `Sem Ping Reserva`** (no `chamada.module.css`): Arial Bold local a **85%**, com
  `font-weight: 100 900` (cobre qualquer peso pedido: sem negrito sintético, que alargaria):
  medido no Chromium (juiz-trabalho/t3/medir.cjs), a maior razão Arial Bold/Unbounded 800 é 1,154
  (o `_`; espaço 1,149; `·` 1,041; `1` 1,037); a 85% fica ≤ 0,981 em TODO caractere.
  `src: local("Arial Bold"), local("Arial-BoldMT"), local("Helvetica Bold"), local("Helvetica-Bold"),
  local("Liberation Sans Bold"), local("LiberationSans-Bold"), local("Arimo Bold"), local("Arimo-Bold"),
  local("Roboto Bold"), local("Roboto-Bold")`. A «Lilita Caixa Alta» do spec SAI.
- **Métrica: o implementador MEDE DE NOVO** (Chromium, canvas a 100 px, o woff2 VARIÁVEL que o
  next/font baixa, `ctx.font = "800 100px …"`, `fontKerning = "none"`: a Unbounded TEM kerning —
  AGIOTA 5,085 sem × 4,895 com). O título, os nicks e o número dos chips ficam com
  `font-kerning: none; font-variant-ligatures: none` (como o spec já pedia). Pré-medida do juiz
  (Google Fonts, 28/10; juiz-trabalho/t3/unbounded-medidas.json) para conferir a ordem de grandeza:
  altura das maiúsculas 0,75 em; Ã/Õ sobem a 0,99 em; Ç desce 0,26; tinta além do avanço ≤ 0,024 em
  nas letras (o Í solta 0,098 à direita); W = 1,375 (o mais largo); SEM 2,915, PING 3,14,
  GIRIPOCA 6,271, N4FIRIDA 6,144, AGIOTA 5,085, GOOM 4,165, NIKITI 3,78, MIVA 3,545 (sem kerning).
  `espacamento: 0.01`; `sobra: 0.34` (2 × (0,04 do traço branco de 0,08 + 0,065 do anel) + 0,098 do
  Í + folga); `padrao: 1.4` (o caractere de fora da tabela conta como o W, arredondado para cima).
  O título fica 20–38% mais largo que na Lilita: no computador o `--tam` continua preso no máximo
  (`18svh`), no celular cai ~10–18% (320 px: ~74 px de `--tam` em vez de 89,6). Os nicks das cartas
  encolhem ~25% (GIRIPOCA vira a palavra-guia com ~6,7 em): abaixo de 400 px o microfone sai da
  pílula do nick (J2 do spec), e o nick mais largo tem de caber inteiro com ≥ 15 px em 320, 360 e 390.

## 4. Os dois «OS 5»: cada um com a lógica do seu mundo (fechado)

Hoje os dois specs fazem o MESMO gesto: pílula acima e à esquerda da marca. Decisão:
- **Os 5 Furiosos — o «OS 5» é um OBJETO: um adesivo.** Fica como o spec desenhou (pílula lima de
  vinil com recorte creme, girada −7°, colada no tapa com `bafoSelo`, dois brilhinhos): é o mesmo
  material das letras, e no álbum tudo o que é nome é adesivo. Ele é o único dos dois que gira,
  tem sombra e tem recorte.
- **Os 5 Sem Ping — o «OS 5» deixa de ser selo: vira TEXTO DE INTERFACE, sem cápsula.** A linha de
  status da sala, como o nome da sala numa call: as 5 barras de sinal PRIMEIRO (à esquerda,
  `order: -1` no `.enfTraco`, o DOM não muda) e «OS 5» depois, em Sora 800 rosa (`--tm-acento`),
  `letter-spacing: 0.16em`, SEM fundo, sem fio, sem raio, sem rotação, na linha acima do SEM e
  alinhado à tinta do S. A entrada (`seloConecta`, só translate) e as barras acendendo ficam.
  Motivo extra: o herói do Sem Ping já tem pílula de VOLTAR, pílula de status, balão do lema e
  chips — o selo era a quinta cápsula no mesmo quadro.
- Resultado: um é adesivo colado (físico, torto, brilhante), o outro é rótulo de software (plano,
  reto, aceso). Nenhum dos dois centraliza no celular (os dois specs já alinham à esquerda).

## 5. Regras que valem para os 5 (fechado)

1. **A base comum já está no branch.** Os diffs/apêndices dos designers que mexem em arquivo
   compartilhado (`tipos.ts`, `registro.ts`, `fontes-dos-temas.ts`, `cenarios/index.ts`, o stub,
   `link-da-carta`, `globals.css`, `paginas-home.ts`) NÃO se aplicam. Do material compartilhado, cada
   um leva só: a métrica para o SEU bloco de `metricas.ts`, a lista de keyframes de entrada para o SEU
   bloco de `temas-sem-opacidade.test.ts` e os textos para `lib/i18n/messages/temas/<slug>.ts`. O
   teste novo se chama `tests/times/tema-<slug>.test.tsx`.
2. **Métrica:** a fonte de título não mudou em 4 dos 5 — vale a tabela MEDIDA do designer (Rosca,
   Furiosos, So ADC, Desorganização). Só o Os 5 Sem Ping mede de novo (Unbounded 800, §3).
3. **Conteúdo em 2D.** Nenhum `translate3d`/`scale3d`/`rotate3d`/`perspective` em keyframe ou regra de
   CONTEÚDO (texto, escudo, cartas, retrato, nick), nem em ancestral de `background-clip: text` ou de
   `mix-blend-mode`. 3D só em enfeite sem texto (a folha do álbum, a câmera do palco). É a lição do
   WebKit da Queijo Minas: `translate3d` + `background-clip: text` some no Safari.
4. **Laços infinitos (orçamento):** no herói, ≤ 8 no computador e ≤ 5 no celular (contando cada
   elemento animado); a página inteira ≤ 12; a ficha ≤ 4. Só transform/opacidade (nada de animar
   propriedade registrada, `background-position`, `filter` ou cor em laço). Contagem final aprovada
   no herói (computador/celular): Rosca 8/5 · Furiosos 4/4 · So ADC 5/3 · Sem Ping 6/4 ·
   Desorganização 6/4 (cada spec diz o que cortar para chegar lá).
5. **Nomes de keyframe únicos** (§2) — conferir com o `grep … | uniq -d` antes do commit.
6. **Movimento reduzido:** o bloco `.raiz *` do `tema.module.css` para a página E a ficha (a raiz da
   ficha leva o `.raiz` da base e o `.raiz` do módulo de página do cenário — conferido em
   `ficha-do-jogador-com-tema.tsx`). O que só aparece animando tem de ter o estado final na própria
   regra; o que só faz sentido em movimento (lascas, brilhos, flechas voando, rodinha) vai a
   `display: none` no `@media (prefers-reduced-motion: reduce)` do cenário. Print das duas.
7. **Quadro 0 de verdade:** congelar DESDE o carregamento (CDP `Animation.setPlaybackRate(0)`, como o
   `scripts\captura.cjs` do So ADC) — o `document.getAnimations()` depois do load perde as animações
   curtas que já terminaram. Print do quadro 0 e do fim em 1440×810 e 405×720 (as medidas do vídeo).
8. **A 1ª dobra do vídeo (1440×810 e 405×720):** nenhum componente do herói cortado AO MEIO pela
   borda de baixo (ou cabe inteiro, ou fica inteiro abaixo). Hoje só a Desorganização falha (J5 dela).
9. **Tudo é medido de novo no repo**, com o `leagueofbronze.json` de produção e o build de produção
   (os harnesses e protótipos dos designers rodaram com dados de teste e cópias da base).
10. **Escopo:** os quatro com código estão dentro do envelope (CSS 1.505–2.004 linhas, TSX 173–423);
    nenhum corte de escopo além dos de desempenho. O Os 5 Sem Ping é escrito do zero: mesmo envelope
    (~2.000 linhas de CSS somando página e ficha).

## 6. Mudanças na base comum (fora dos arquivos de cada tema)

Aprovadas (indispensáveis; nenhuma muda RX, QM ou GdB):
- `app/globals.css` — as 5 regras do cabeçalho (`body:has([data-tema="<slug>"]) #lob-cabecalho`, no
  formato da Queijo Minas), com os valores do §7.
- `tests/times/temas-sem-opacidade.test.ts` — um `it` novo, fora dos blocos dos times: «nenhum
  @keyframes com o mesmo nome em dois módulos» (o `Map` do teste esconde a colisão; hoje a base
  sozinha não tem repetidos, então ele passa no branch da base e pega cada tema que repetir).
- Nada mais: `fontes-dos-temas.ts` (com a Unbounded e a «Sem Ping Reserva»), `tipos.ts`,
  `registro.ts`, `cenarios/index.ts`, o stub, `metricas.ts` (blocos) e os esqueletos já estão como
  devem.

Não aprovada agora (anotar como tarefa futura): carregar o CSS de cada cenário só na página do seu
time (`cenarios/index.ts` importa os 8 estaticamente: ~8–10 KB gzip por tema em TODA página `/times`
e `/jogadores`, ~75 KB com os 8). É mudança de arquitetura na base e mexeria nos 3 temas no ar.

## 7. Dados finais por time (para a base e para os implementadores)

| time | cenário | cor | título (chave · export · peso/estilo · reserva) | assinatura | nome | cabeçalho (topo → baixo · fio) |
|---|---|---|---|---|---|---|
| Fãs de Rosca | `academia` | `#FFA3C8` | `sofia-extra-condensada` · `Sofia_Sans_Extra_Condensed` · 900 itálico · «Rosca Reserva Impact», «Rosca Reserva» | `kaushan` · `Kaushan_Script` 400 | sufixo ESPORTE CLUBE | `rgba(18,14,17,.95)` → `rgba(18,14,17,.84)` · `rgba(255,142,195,.26)` |
| Os 5 Furiosos | `album` | `#E27CFE` | `lilita-one` · `Lilita_One` · 400 · «Lilita One Caixa Alta» | `baloo-2` · `Baloo_2` variável | prefixo OS 5 (adesivo) | `rgba(18,8,31,.95)` → `rgba(18,8,31,.84)` · `rgba(200,245,74,.28)` |
| So ADC Bronze Clube | `estande` | `#FF6A55` | `alfa-slab-one` · `Alfa_Slab_One` · 400 · «Alfa Slab Caixa Alta» | `yellowtail` · `Yellowtail` 400 | sufixo BRONZE CLUBE | `rgba(7,11,20,.95)` → `rgba(7,11,20,.84)` · `rgba(226,115,74,.28)` |
| Os 5 Sem Ping | `chamada` | `#3DFF8F` | `unbounded` · `Unbounded` variável · **800** · «Sem Ping Reserva» | `sora` · `Sora` variável | prefixo OS 5 (texto de interface) | `rgba(4,9,7,.95)` → `rgba(4,9,7,.84)` · `rgba(61,255,143,.24)` |
| Desorganização | `picadeiro` | `#FFE14D` | `smokum` · `Smokum` · 400 · «Smokum Reserva Estreita», «Smokum Reserva» | `playfair-italico` · `Playfair_Display` itálico 500/700 | sem prefixo/sufixo | `rgba(11,7,6,.95)` → `rgba(11,7,6,.84)` · `rgba(224,176,74,.30)` |

Todas com `subsets: ["latin"]`, `display: "swap"`, `preload: false`; as de título com
`adjustFontFallback: false` + `fallback` (a reserva `@font-face` mora no módulo CSS do cenário).

## 8. Veredito por time (detalhe na seção «Ajustes obrigatórios do juiz» de cada spec)

- **Fãs de Rosca** — aprovado com poucos ajustes: 3 keyframes renomeados, `raiosRespiram` cortado,
  poeira 10 → 6 (3 no celular).
- **Os 5 Furiosos** — aprovado com ajustes: cor `#E27CFE`, conteúdo em 2D (`bafo`/`bafoNick` com
  `translate3d` sumiriam no Safari), laços de 15 → 8, `haloNasce`/`pisca` renomeados.
- **So ADC Bronze Clube** — aprovado com poucos ajustes: cor `#FF6A55` só no `tema.cor` (o coral da
  cena fica), `lascaVoa` renomeado.
- **Os 5 Sem Ping** — aprovado com troca grande: Unbounded 800 no lugar da Lilita One (métrica nova,
  reserva nova, traço 0,08, `line-height` 0,91, nick sem microfone < 400 px), «OS 5» sem cápsula,
  `pingOscila` cortado, 5 keyframes genéricos + o da ficha renomeados.
- **Desorganização** — aprovado com ajustes: cor `#FFE14D`, herói inteiro em 1440×810, tremelique na
  hora do vídeo, `saltoDoLeao` em 2D, `balanca` renomeado, o teste rodar pela 1ª vez.
