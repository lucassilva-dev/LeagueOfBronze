# Handoff: Rebrand "Reforjado" — League of Bronze

## Overview
Nova identidade visual completa para o site do campeonato **League of Bronze** (rastreador amador de LoL, séries MD3/MD5). Substitui a antiga cara "broadcast navy/azul-royal/dourado + Orbitron + escudo hexagonal" por uma identidade **quente, de forja**: carvão + ember (laranja-brasa) + bronze metálico, com uma faísca de lima elétrica para "ao vivo". Logo nova (**Coroa Brasa**), tipografia nova (**Anton + Space Grotesk + Sora**) e um sistema de motion (contadores, cascatas, transições de página).

O objetivo é **aplicar essa identidade na branch existente** (Next.js App Router + TS + Tailwind + Framer Motion + TanStack Table), reaproveitando os componentes que já existem.

## About the Design Files
Os arquivos em `prototypes/` são **referências de design criadas em HTML** (protótipos que mostram aparência e comportamento pretendidos), **não** código de produção pra copiar direto. A tarefa é **recriar esses designs no ambiente real do repositório** (Next.js/React/Tailwind), usando os padrões e libs que o projeto já tem (Framer Motion, lucide-react, TanStack Table, componentes em `components/ui/` e `components/`).

- `prototypes/Site.dc.html` — o produto novo navegável (8 telas). **Referência principal.**
- `prototypes/Nova Identidade.dc.html` — guia de marca (logo, paleta, tipografia).
- `prototypes/code-samples.js` — componentes de motion **reais** em React+TS+Framer Motion (Reveal, AnimatedCounter, AnimatedCard, ChampionPanel, MatchVersusCard, PodiumTop3, AnimatedBarChart). Prontos pra adaptar.
- `assets/coroa-brasa-icon.svg` — o logo novo (self-contained).
- `tokens/` — trechos prontos pra colar: `globals.snippet.css`, `tailwind.config.snippet.ts`, `layout.fonts.snippet.tsx`.

> Os protótipos usam um runtime próprio (não abrem "cru" no navegador sem esse runtime); leia-os como **fonte de referência** (o markup/lógica é legível) ou abra as versões vivas no projeto de origem.

## Fidelity
**Alta fidelidade (hifi).** Cores, tipografia, espaçamento, motion e copy são finais. Recriar pixel-perfect usando as libs do repositório.

---

## Design Tokens

### Cores (hex + HSL triplet p/ Tailwind)
| Token | Hex | HSL triplet | Uso |
|---|---|---|---|
| `bg` | `#120C0A` | `15 12% 6%` | canvas / base |
| `panel` | `#1B120E` | `22 22% 9%` | superfície de card |
| `panel-2` | `#241812` | `20 20% 12%` | input / inset |
| `text` | `#F8F0E7` | `33 55% 94%` | texto (creme) |
| `muted` | `#AD9A8B` | `27 15% 62%` | secundário |
| `border` | — | `25 15% 20%` | hairline (use com /alpha) |
| **`accent` (ember)** | `#FF6A2B` | `18 100% 58%` | ação, dados, foco |
| **`accent-2` (bronze)** | `#C88A45` | `32 52% 53%` | honra, campeão, final |
| `lime` | `#CBFF3E` | `76 100% 62%` | "AO VIVO", alerta |
| `success` | `#5BE59A` | `152 72% 63%` | vitória / saldo + |
| `danger` | `#FF6B6B` | `0 100% 71%` | derrota / saldo − |

**Gradientes-assinatura:**
- Ember: `linear-gradient(103deg, #E23D1E 0%, #FF6A2B 46%, #FFC061 100%)`
- Bronze: `linear-gradient(135deg, #F3D08A 0%, #C88A45 48%, #7C4E22 100%)`
- Fundo do app (fixed): `radial-gradient(120% 70% at 50% -8%, rgba(255,106,43,.12), transparent 46%), radial-gradient(80% 50% at 90% 6%, rgba(203,255,62,.045), transparent 50%), linear-gradient(180deg,#16100D,#0E0906)`

### Tipografia
- **Anton** (`--font-display`, 400) — impacto de pôster. **Só** em números grandes/heros: placar `3–1`, "BRONZE" no hero, KPIs. UPPERCASE natural.
- **Space Grotesk** (`--font-heading`, 500/600/700) — títulos de página, rótulos UPPERCASE (`letter-spacing:.16em`), nomes de time, números de tabela.
- **Sora** (`--font-body`, 400/600/700) — corpo, botões, UI. Legível de 12px.
- Escala hero: `clamp(30px,5.4vw,54px)`; título de seção `clamp(26px,4vw,40px)`; eyebrow 11–12px `.22em` uppercase.

### Espaçamento / raios / motion
- Raios: 8 (chip) / 12 (botão, input, nav) / 16–22 (cards) / 9999 (pill).
- Coluna central: `max-width: 1160px`, gutter 22–24px.
- **Motion:** micro 200ms · transição de página 280–340ms · entrada de card 450–550ms · contador 900–1300ms · easing padrão `cubic-bezier(.2,.8,.2,1)`. Respeitar `prefers-reduced-motion`.

### Setup (colar na branch)
1. `tokens/globals.snippet.css` → `app/globals.css` (substitui `:root` e `body`).
2. `tokens/tailwind.config.snippet.ts` → `theme.extend` do `tailwind.config.ts`.
3. `tokens/layout.fonts.snippet.tsx` → `app/layout.tsx` (remove Orbitron/Rajdhani).
4. `assets/coroa-brasa-icon.svg` → `app/icon.svg` e `public/lol-icon.svg`.

---

## Screens / Views
Mapeamento direto para as rotas existentes:

| Tela (protótipo) | Rota / componente atual | O que muda |
|---|---|---|
| Home | `app/page.tsx` + `PageHero` | Hero com badge "AO VIVO" lima, título Space Grotesk, banda de campeão em bronze com placar contando, stats, últimas séries |
| Tabela | `app/tabela` + `StandingsPageClient` | Linhas em cascata (stagger 60ms), Top 3 com **troféu bronze**, líder com glow ember, saldo colorido, **pontos em Anton contando** |
| Partidas | `app/partidas` + `SeriesSummaryCard` | Lista de séries; a **Grande Final** ganha tratamento bronze (`.lob-champion`); placar Anton |
| Detalhe de série | `app/partidas/[id]` | Header com placar grande, "jogo a jogo" (vencedor ember, MVP, duração), tabela de destaques K/D/A |
| Estatísticas | `app/stats` + `StatsPageClient` | SegmentedControl de métrica; **pódio Top 3** + **ranking de barras que desliza** (transform translateY) e recolore ao trocar métrica; líder em bronze, resto em ember |
| Perfil de time | `app/times/[slug]` | Crest, posição, pontos/séries/saldo em Anton, elenco clicável, séries do time |
| Perfil de jogador | `app/jogadores/[slug]` | Nick grande, grade de stats (Abates ember, KDA bronze, etc.) |
| Admin | `app/admin` | Portão de senha + form "Lançar nova série" (selects de time, etapa, formato, placar) que adiciona a série |

**Componente central (SeriesSummaryCard / MatchVersusCard):** time A entra da esquerda (`x:-60→0`), time B da direita, VS/placar no centro (pop), bolinhas MD3/MD5 acendem por resultado, vencedor com glow, selo MVP. Ver `code-samples.js` → `MatchVersusCard`.

---

## Interactions & Behavior
- **Nav:** tabs no header; ativo = pill ember (`bg-accent/16` + ring + glow). Transição de página: `opacity 0→1, y 14→0, blur 7→0`, 340ms, ao trocar de rota (envolver conteúdo com Framer Motion `key={pathname}`).
- **Contadores:** rolam 0→N ao entrar em vista, `tabular-nums` (sem layout shift), pt-BR. Ver `AnimatedCounter` em `code-samples.js`. **Importante:** garanta valor final mesmo sem rAF (aba em segundo plano) — o protótipo usa fallback por `setTimeout`.
- **Tabela → cascata:** stagger 60ms por linha (`whileInView`, `once:true`).
- **Estatísticas → troca de métrica:** linhas mantêm identidade (key por jogador) e deslizam via `transform` para a nova posição; números re-rolam.
- **Hover em cards:** `translateY(-4px)` + glow (spring, stiffness ~320).
- **Admin:** senha simples (qualquer valor no protótipo — trocar por auth real); form valida times diferentes; ao lançar, a série entra na lista.
- **prefers-reduced-motion:** desliga starfield/loops, mostra estado final imediatamente.

## State Management
- `page`/rota ativa; `metric` (kills|kda|mvps|assists|deaths) para Estatísticas; estado do form do admin `{teamA, teamB, stage, format, scoreA, scoreB}`; `reducedMotion`.
- Contadores: valor animado por chave; dados reais vêm de `lib/tournament.ts` (cálculo de tabela/leaderboards) — **manter essa lógica**, só trocar a camada visual.

## Assets
- `assets/coroa-brasa-icon.svg` — logo novo (coroa em bronze, faísca ember). Original, criado para este rebrand (não é marca da Riot). Vai em `app/icon.svg` + `public/lol-icon.svg`. No lockup: 30–34px dentro de um quadrado ~40px, com o wordmark "LEAGUE OF BRONZE" em Space Grotesk 700 `letter-spacing:.14em`.
- Ícones: **lucide-react** (já no projeto) — crown, trophy, swords, skull, arrow-right, chevron-left, clock, lock, download.
- Sem fotografia. Textura = os washes radiais quentes.

## Files (protótipos de referência neste bundle)
- `prototypes/Site.dc.html` — produto completo (todas as 8 telas + admin funcional).
- `prototypes/Nova Identidade.dc.html` — logo (3 conceitos), paleta, tipografia.
- `prototypes/code-samples.js` — 7 componentes de motion React+TS+Framer Motion prontos.
- Versões vivas/interativas estão no projeto de origem (mesmos nomes).
