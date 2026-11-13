# Game Template

Base para jogos 2D web (PWA) com casca Android: motor determinístico de passo fixo, ranking por
replay no Supabase, i18n (pt/en/es), música e efeitos em Web Audio, carga de arte para canvas,
testes de golden master e deploy no Cloudflare Workers pelo CI.

O que roda hoje é um jogo de exemplo: um quadrado corre sozinho, pula blocos e vãos (toque,
Espaço, ↑ ou W) e pega moedas. Ele existe para exercitar a base; o jogo novo entra no lugar dele.

Regras de arquitetura e de processo: [`CLAUDE.md`](CLAUDE.md).

## Rodar

```bash
npm install
cp .env.example .env.local   # opcional: sem Supabase, o jogo roda e o ranking aparece fora do ar
npm run dev                  # http://localhost:5173
```

Antes de abrir PR:

```bash
npm run lint && npm run typecheck && npm run test:all && npm run build
```

Simulação de balanceamento (o bot joga sozinho, sem navegador):

```bash
npm run sim:partidas -- --partidas 30 --minutos 5
```

## Fazer um jogo novo em cima

1. **Motor** (`src/engine/`): troque `tipos.ts` (estado, elementos, `ACOES`), `constantes.ts`,
   `fisica.ts`, `moldes.ts`, `gerador.ts` e o `passo` em `partida.ts`. Mantenha as regras técnicas:
   passo fixo, só aritmética básica, aleatoriedade só pelo `rng.ts` guardado no estado, e
   `simularPartida(seed, log)` como única porta do ranking. Ponha um `VERSAO_REGRAS` novo.
2. **Bot e testes:** adapte `scripts/bot.ts` ao jogo novo, apague `tests/__snapshots__/` e
   gere os golden masters de novo (`npx vitest run -u`). `tests/motor.test.ts` e
   `tests/pista.sim.test.ts` são do exemplo: reescreva para as regras do jogo.
3. **Desenho e arte:** `src/features/jogo/desenho/desenharCena.ts` e `src/features/jogo/arte/`
   (a lista de imagens fica em `arte/index.ts`; `carregarArte.ts` é da base e não muda).
4. **Telas:** `TelaHome` e `TelaJogo` (HUD, pausa, fim). Abertura da GAS Games, pedido de girar o
   celular, configurações e ranking já funcionam.
5. **Som:** troque `trilhasExemplo.ts` por trilhas gravadas (`url` + `inicio`/`fim` do loop) e os
   efeitos em `efeitosSonoros.ts`.
6. **Copy:** `src/locales/{pt,en,es}/jogo.json`. O teste de locales acusa chave faltando.
7. **Ranking:** se o placar não for `pontos`, ajuste a migration
   `supabase/migrations/20261107024958_ranking.sql` (antes do primeiro `db push`), a Edge Function
   `supabase/functions/registrar-partida/` e `src/data/ranking.ts`.
8. **Produto:** escreva os PRDs em `PRD/` (ver `PRD/00-INDICE.md`).

## O que renomear

| Onde | Hoje | Observação |
| --- | --- | --- |
| `src/configuracao.ts` → `ID_JOGO` | `game-template` | Prefixo do `localStorage` e nome do IndexedDB. Trocar **antes** do primeiro deploy |
| `package.json` (e `package-lock.json`) → `name` | `game-template` | `npm install` atualiza o lock |
| `wrangler.jsonc` → `name` | `game-template` | Nome do Worker. Nasce com `workers_dev: false` e `preview_urls: false` |
| `vite.config.ts` → manifesto | `Game Template` | `name`, `short_name`, `description`, cores e `orientation` |
| `index.html` | `Game Template` | `<title>`, `description`, `apple-mobile-web-app-title` |
| `src/locales/*/jogo.json` | `titulo`, `subtitulo` | Nome do jogo na home, nos três idiomas |
| `android/app/build.gradle.kts` | `com.example.game` | `namespace`, `applicationId` (não muda depois da primeira publicação na Play) |
| `android/app/build.gradle.kts` → `origemProducao` | `https://game-template.example.workers.dev` | Endereço publicado do site |
| `android/app/src/main/java/com/example/game/` | pacote `com.example.game` | Mover a pasta e o `package` dos `.kt` |
| `android/app/src/main/res/values/strings.xml` → `app_name` | `Game Template` | Nome no launcher |
| `android/settings.gradle.kts` → `rootProject.name` | `GameTemplate` | |
| `TAG` em `ClienteWeb.kt` e `ClienteChrome.kt` | `GameTemplate` | Só log |
| `Tema.Jogo` (`AndroidManifest.xml`, `res/values*/temas.xml`) | `Tema.Jogo` | Opcional |
| Ícones | quadrado laranja provisório | `public/icones/*.png` e `android/app/src/main/res/mipmap-*/` |
| `.claude/launch.json` | `game-template` | Nomes das configurações |
| `src/engine/constantes.ts` → `VERSAO_REGRAS` | `exemplo-1` | Sobe a cada mudança de regra |
| `CLAUDE.md` | campos `[entre colchetes]` | Projeto Supabase, vencimento do token do Cloudflare, design system |
| Variáveis e secrets do repositório no GitHub | — | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |

Para conferir se sobrou algo: `git grep -n -i -E "game-template|game template|com\.example\.game|GameTemplate"`.

A abertura com o logo da GAS Games (`src/features/abertura/`) é da marca do estúdio, não do jogo:
fica, a menos que o jogo saia por outra marca.

## Estrutura

```
src/engine/     motor puro e determinístico (roda igual no navegador e na Edge Function)
src/features/   telas e recursos (abertura, home, jogo, ranking, configurações, música, som...)
src/data/       ranking, id do jogador, recorde, preferências
src/locales/    copy pt/en/es
scripts/        bot e simulação
tests/          golden master, regras do motor, ranking, locales, fronteiras do motor
supabase/       migration do ranking e Edge Function registrar-partida
android/        casca Kotlin + WebView (ver android/README.md)
PRD/            especificações de produto do jogo novo
```
