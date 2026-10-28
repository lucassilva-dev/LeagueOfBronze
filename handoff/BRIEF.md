# Briefing — 5 páginas temáticas novas (League of Bronze, 27/10/2026)

## O pedido do Lucas (dono do site)
Cada time do campeonato ganha a PÁGINA DO TIME (/times/<slug>) e a FICHA DE CADA JOGADOR (/jogadores/<slug>)
com a cara dele: cores, fontes, cenário, efeitos "de cinema". Palavras dele: "cada time tem sua própria
identidade" — nada de recolorir um tema anterior. Tem de ficar LINDO no computador E no celular. Depois de
cada time sai um vídeo (página do time + ficha de um jogador) para ele mandar no grupo do WhatsApp — então a
entrada animada do herói é a vitrine. O público é o grupo de amigos do campeonato (LoL, elo Bronze/Prata):
humor de zoeira, piadas internas do escudo, nada corporativo.

Já existem 3 temas (NÃO repetir conceito, paleta, fonte nem gesto de composição):
- EQUIPE RX — «A Coroa Elétrica»: tempestade elétrica, cromo, raios azuis, coroa; Exo 2 itálico + Permanent Marker.
  Ver https://www.leagueofbronze.xyz/times/equipe-rx (cenário `tempestade`).
- QUEIJO MINAS — «O Expresso da Lua de Queijo»: noite na serra mineira, lua de queijo, maria-fumaça, trilhos,
  farol ciano, elenco como trem, bilhete; Bungee + Special Elite. /times/queijo-minas (cenário `estacao`).
- GALÁCTICOS DO BAR — «O Bar da Resenha»: boteco à noite, chope enchendo as letras, neon «RESENHA», TV do jogo,
  lousa tática, bolachas de chope; Knewave + Kalam. /times/galacticos-do-bar (cenário `boteco`).
As especificações finais deles (formato e nível de detalhe esperados) estão em
C:\Users\LUCASO~1\AppData\Local\Temp\claude\C--LeagueOfBronze\97331e1f-11a4-4d55-b7c3-07676378ef3e\scratchpad\
projeto-rx-final.md, qm-final.md e gdb-final.md (o da Galácticos é o mais completo; é longo — leia o sumário e
as seções que precisar).

## O sistema (worktree C:\LeagueOfBronze-precos, Next.js 16, React 19, CSS Modules)
Leia antes de projetar:
- lib/temas/tipos.ts (o que um tema declara), lib/temas/galacticos-do-bar.ts (exemplo), lib/temas/registro.ts,
  lib/temas/metricas.ts (largura MEDIDA da fonte do título).
- components/times/cenarios/tipos.ts (as PEÇAS que um cenário entrega: Fundo, Moldura, AtrasDoEscudo, NoEscudo,
  Chao, Insignia, InsigniaMini, TracoDoNome, AtrasDoRetrato, AtrasDoElenco, NaCartela + GANCHOS de CSS).
- components/times/pagina-do-time-com-tema.tsx e ficha-do-jogador-com-tema.tsx (a ESTRUTURA é fixa e comum:
  herói com escudo + título (marca grande + assinatura pequena via prefixo/sufixo) + chips (pts, capitão,
  OP.GG); elenco de 5 cartas (capitão por último, com insígnia); cartela final; ficha com retrato, nick,
  chips, estatísticas e «companheiros»). O cenário NÃO muda a estrutura/semântica: só pinta e encena.
- components/times/cenarios/boteco.tsx + ornamentos-boteco.tsx + boteco.module.css + boteco-ficha.module.css
  (o cenário mais recente: é o modelo de implementação).
- components/times/tema.module.css e ficha.module.css (a base: classes que os ganchos `.raiz .peca` sobrescrevem).
- tests/times/*.test.ts* (as regras que viram teste).

## Regras da casa (duras — viram teste ou já derrubaram o site)
1. Animação de CONTEÚDO (texto, escudo, cartas, fotos) só mexe em TRANSFORM (translate/rotate/scale). Opacidade,
   filter, visibility e clip-path animados SÓ em ENFEITE (`.enf…`, aria-hidden, sem texto). Animar opacidade
   já apagou o site 4 vezes.
2. Conteúdo sem animation-fill-mode e sem animation-delay: a espera mora DENTRO do keyframe (0%,40% {parado}).
3. QUADRO 0 = PÔSTER LEGÍVEL: com tudo congelado no primeiro quadro, nada de conteúdo coberto, cortado ou
   fora da tela. Também no fim. E em `prefers-reduced-motion` tudo para (pôster aceso).
4. Flashes ≤ 2 por segundo e pequenos. Nada de tela inteira piscando.
5. Responsivo de 320 a 2560 px sem rolagem horizontal; nick da ficha em no máximo 2 linhas e nunca partido no
   meio da palavra; título nunca cortado (a largura da fonte é MEDIDA, ver metricas.ts, e a fonte de título
   precisa de uma reserva @font-face MAIS ESTREITA que ela para o carregamento — ver o «Knewave Caixa Alta»).
6. A carta do elenco é clicável inteira (um `::after` do link esticado até o `.miolo`): nada no caminho
   `.identidade/.sobreFoto/.nick/.link` pode ter filter, transform, position, clip-path, mask, contain,
   content-visibility, will-change de transform (tests/times/link-da-carta.test.ts).
7. O minificador do build (lightningcss) APAGA `translate:` numa regra que também tenha `transform:` literal:
   recuo vai dentro do transform, ou só propriedades individuais (tests/times/css-do-build.test.ts).
8. Nenhuma propriedade empatada (mesma especificidade) entre módulos diferentes no mesmo elemento; ganchos sempre
   `.raiz .peca`. Nada de @layer.
9. Contraste: texto ≥ 4,5:1 (rótulos pequenos ≥ 4,5:1 também); título grande ≥ 3:1 com contorno/eco.
10. Desempenho: só transform/opacity nas animações infinitas; poucas infinitas; entrada do elenco por rolagem
    (animation-timeline: view()) com fallback de relógio; celular a 60 fps.
11. Fontes só via next/font/google (CSP font-src 'self'): confira que a família existe em
    C:\LeagueOfBronze-precos\node_modules\next\dist\compiled\@next\font\dist\google\font-data.json e quais pesos
    tem. Não reusar Exo 2, Permanent Marker, Bungee, Special Elite, Knewave, Kalam. Preferir família com bons
    acentos (Ã, Ç, É…) — os nomes têm Ã e Ç.
12. Tudo que o cenário desenha é SVG/CSS próprio (sem imagens externas, sem fontes de ícone, sem marcas
    registradas da Riot). Pode usar as fotos e o escudo do time.
13. `cor` do tema = a cor do time no resto do site (tabela, calendário, listas): clara o bastante para texto no
    fundo escuro (#0f0b07 aprox.), e DISTANTE (ΔE2000 ≥ 15) das outras sete cores de time.
    Já ocupadas: RX #4DA3FF, Queijo Minas #3EE6F2, Galácticos #B4C2FF.

## O que entregar (um arquivo: <pasta do time>\spec.md)
Uma especificação que um implementador sênior consiga seguir sem adivinhar nada, no formato das anteriores:
1. Conceito em uma linha + o porquê (tirado do escudo, das fotos, do nome e das piadas do time).
2. Os 3 conceitos que você considerou (curtos) e por que o escolhido venceu — pense em distinção dos outros
   7 times, em quanto ele rende no vídeo, e em quanto custa implementar bem.
3. Tema (dados): fontes (título/assinatura, pesos, confirmadas no font-data.json), cores (todas as chaves de
   CoresDoTema com hex e o papel de cada uma; contraste dos textos medido), metal (as 8 chaves), prefixo OU
   sufixo, letraPorLetra?, cor do time (com ΔE para as outras), chave do cenário (uma palavra nova), textos
   (cada PapelDoTexto usado, com a frase em PT e EN — com a piada do time), fotos (focoPadrao, foco por
   jogador olhando cada foto: object-position que acerta o rosto; proporção se alguma for deitada; medalhão
   só se forem avatares redondos).
4. Cena do herói, desktop e celular: camadas de trás para frente, cada peça do cenário que você usa, o que
   cada uma desenha (o bastante para desenhar o SVG), cores, tamanhos relativos, onde fica em ≥1024 e em
   ≤599 (o celular NÃO é o desktop encolhido).
5. A entrada (o "filme" de 0 a ~3 s): linha do tempo com cada animação (peça, propriedade, de→para, duração,
   curva, onde fica a espera dentro do keyframe) e o estado final; o que fica vivo depois (infinitas, poucas).
6. Título: tratamento da marca e da assinatura (como a marca se monta: letra por letra? pincel? carimbo?).
7. Elenco: forma da carta (o gancho de CSS de cada peça da carta), moldura da foto, etiqueta de rota, nick,
   rodapé, o capitão (insígnia grande desenhada), a entrada por rolagem, AtrasDoElenco se usar.
8. Cartela final e ficha do jogador (retrato, AtrasDoRetrato, nick, chips, estatísticas, companheiros).
9. Movimento reduzido, contraste, foco do teclado, o que pode dar errado (riscos) e como evitar.
Escreva em português do Brasil.
