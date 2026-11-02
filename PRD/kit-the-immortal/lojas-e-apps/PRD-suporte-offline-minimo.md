# PRD — Suporte Offline Mínimo (guideline 4.2 da Apple)

**Autor:** Wag (com Zé/Claude)
**Responsável pela implementação:** Claude Code
**Status:** Aprovada e **implementada (Fases A, B e C) em 16/09/2026**. Pendente: verificação em device iOS e as App Review Notes (§9).
**Data:** 16/09/2026

---

## 1. Objetivo

Reduzir o risco de reprovação do pacote iOS — wrapper WKWebView gerado pelo PWABuilder,
apontando para theimmortal.com.br — na **guideline 4.2 (minimum functionality)**, garantindo
que o app nunca *pareça um site quebrado dentro de um app* quando o iPhone estiver sem
conexão.

O alvo **não é offline completo**. É offline mínimo e crível: abrir, mostrar marca, explicar
o estado em português, e deixar jogável aquilo que já é jogável sem rede.

Continuação direta de `PRD-publicacao-app-stores.md` §4 ("Reforço específico para iOS").
Aquele documento tratava o Service Worker como pendência aberta de prioridade alta; a §2
deste mostra, **com medição em produção**, que essa parte está resolvida — e que o problema
mudou de lugar. O risco de 4.2 hoje não é o app não abrir offline. É o que ele mostra depois
de abrir.

---

## 2. Estado atual — medido em produção, não suposto

### 2.1 O Service Worker está ativo e o app shell abre offline

| O que | Resultado | Como foi medido |
|---|---|---|
| `/sw.js` em produção | `200`, 5760 bytes, com `skipWaiting`, `clientsClaim` e `NavigationRoute` | `curl https://theimmortal.com.br/sw.js` |
| Registro no cliente | `navigator.serviceWorker.controller` = `true`, `scope: /`, estado `activated` | JS no console, em theimmortal.com.br |
| Precache | **62 recursos únicos, completo** — nenhuma entrada do manifest do SW ausente do cache | diff entre as URLs do `sw.js` e as chaves de `caches.open(...)` |
| Shell servível sem rede | `index.html` `200 text/html`, `index-*.js` `200`, `es-*.js` `200`, `index-*.css` `200`, 12 `woff2` | `caches.match(url, {ignoreSearch:true})` para cada recurso |
| Fallback de navegação | `registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")))` | leitura do `sw.js` de produção |
| Manifest | completo — `id`, `screenshots` (4), `launch_handler`, `prefer_related_applications`, ícones 192/512/maskable | `curl .../manifest.webmanifest` |

**Conclusão medida:** uma navegação offline resolve pelo `NavigationRoute` para o
`index.html` do precache, e o bundle, o CSS e as fontes saem do mesmo precache. **O app não
abre em tela branca hoje.** A logo, os fundos (`background.png`, `background-resultado.png`)
e os logos das equipes de F3 também estão no precache — a Home e o Setup renderizam
completos, com arte, sem rede.

> Os itens 🔴 de `PRD-publicacao-app-stores.md` §4 ("investigar e corrigir o Service Worker
> em produção") podem ser considerados **fechados**. O que resolveu foi a combinação de
> `injectRegister: 'inline'` (09/09) e `skipWaiting`/`clientsClaim` explícitos (13/09), ambos
> já documentados em `vite.config.ts`.

### 2.2 A premissa mudou

O briefing desta investigação partia de "hoje o PWA não funciona offline". Isso era verdade
em 08/09, quando o scan do PWABuilder não achava Service Worker nenhum. **Não é mais.** O
que sobrou é diferente — e, para a review da Apple, pior: o app abre, e então mostra telas
de erro técnico em inglês.

### 2.3 O que o motor já garante de graça

`src/engine/` é puro e determinístico (regra dura nº 2) e o save mora no `localStorage`.
O calendário da temporada — incluindo `numeroVoltas`, `tempoVoltaReferenciaS`, `perdaPitS` e
`janelasPneu` — é buscado **uma vez, na abertura da temporada**, e persistido dentro de
`temporada.calendario` (`adapters/iniciarCarreira.ts:126`,
`adapters/iniciarProximaTemporada.ts:107`).

Ou seja: **correr uma temporada já começada não depende de rede.** Essa é a base do argumento
de 4.2, e ela já existe — só está escondida atrás dos defeitos da §3.

---

## 3. O que realmente quebra offline hoje

Ordenado por risco na review, não por esforço.

### 3.1 🔴 Tela vermelha de diagnóstico sobre o app inteiro

`src/main.tsx` registra `window.addEventListener('unhandledrejection')` e `('error')` que
substituem o `#root` inteiro por um painel `#1a0000`, monoespaçado, com título em português
e **stack trace em inglês**. Está marcado `TEMP DIAGNÓSTICO — Remover depois` no próprio
código.

**Medido em produção:** uma rejeição não tratada realmente pinta a tela — o `#root` foi
substituído por `Promise rejeitada sem tratamento` + stack.

**E existe um caminho offline que chega lá:** `CorridaAoVivo.tsx:185` chama
`fetchAmbienteCircuito(...).then(...)` **sem `.catch`**, e `circuitosRepository.ts:100` faz
`throw` em qualquer erro, inclusive falha de rede. Sem conexão, **no meio de uma corrida ao
vivo**, a promise rejeita e o jogo vira um painel de debug vermelho.

Ironia: o componente já tem `AMBIENTE_PADRAO` como fallback ("clima neutro") para o intervalo
em que a busca ainda não resolveu. O dado é **decorativo** — o comentário do próprio
repository diz que nada disso entra no resultado, que o motor já decidiu. Um erro cosmético
derruba a tela inteira.

*Para um revisor da Apple que liga o modo avião durante uma corrida, esta é a pior coisa que
o app pode fazer.*

### 3.2 🔴 Mensagem de erro técnica, em inglês, direto na tela

**Medido em produção** (fetch bloqueado, simulando modo avião pós-boot), ao tocar em
"Começar sorteio":

> Erro: chamarSortearRemoto: Failed to send a request to the Edge Function

Levou ~18 segundos e 8 tentativas de rede até aparecer.

Não é um caso isolado — é um **padrão**. `useCarreiraFlow.ts` faz
`setErroMercado(e instanceof Error ? e.message : ...)` em dois lugares (`1110`, `1136`),
então offline a virada de temporada e o aceite de oferta mostram, respectivamente:

- `fetchCircuitosCategoria: falha ao buscar circuitos — TypeError: Failed to fetch`
- `fetchNpcsSombra: ...`

São strings internas de diagnóstico, escritas para quem programa, exibidas para quem joga.
Num jogo em português, para público brasileiro.

### 3.3 🟠 Ranking: 16 segundos de spinner antes de qualquer feedback

**Medido:** offline, a tela de Ranking fica em `Carregando ranking…` por ~16s (4 tentativas)
antes de mostrar *"Não deu pra carregar o ranking agora. Tenta de novo em instantes."*

A mensagem final é boa. O problema é o tempo até ela, e o fato de ela atribuir a falha ao
servidor (*"tenta de novo em instantes"*) quando a causa é o aparelho estar sem rede — o
jogador tenta de novo, espera mais 16s, e recebe a mesma coisa.

### 3.4 🟠 O app não tem noção nenhuma de conectividade

`grep` por `navigator.onLine`, `addEventListener('online'|'offline')` em `src/` e
`packages/fast-ds/src/`: **zero ocorrências**. Nenhuma tela sabe distinguir "o servidor
falhou" de "o aparelho está sem rede", e nenhuma reage a voltar a ficar online.

É a raiz comum de 3.2 e 3.3: sem esse sinal, todo caminho de rede só tem um vocabulário —
tentar, falhar, repetir.

### 3.5 🟡 A virada de temporada trava a carreira

`fecharTemporada` depende de `fetchNpcsSombra` (`useCarreiraFlow.ts:770`) e
`fetchCircuitosCategoria` (`:919`); `aceitarOferta` depende de `fetchCircuitosCategoria`
(`:1121`). Os dois estão em `try/catch` — não produzem a tela vermelha —, mas offline a
carreira **para na virada de ano** e não tem como continuar.

Correr a temporada atual funciona. Terminá-la e começar a próxima, não.

### 3.6 🟡 Retratos e logos fora do precache

`runtimeCaching` com `CacheFirst` cacheia retratos de piloto e logos ao aparecerem em tela
pela primeira vez. Quem instalar o app e ficar offline antes de ver uma tela com retratos
verá imagens quebradas.

**Isto é de propósito e não deve ser desfeito sem cuidado:** são ~10,8MB; precacheá-los fez o
SW levar segundos para ativar e foi exatamente o que produziu o "sem Service Worker" no scan
do PWABuilder em 08/09 (`vite.config.ts`, `globIgnores`). Os logos de equipe de F3 — os que
aparecem na criação — **já estão** no precache.

---

## 4. Solução proposta

Três fases, com corte claro do que bloqueia a submissão.

### Fase A — Não parecer quebrado *(bloqueia a submissão iOS)*

**A1. Aposentar o capturador TEMP de erro.**
Remover os dois `addEventListener` de `main.tsx` (já marcados `TEMP`) ou fechá-los atrás de
`import.meta.env.DEV`. No lugar, um fallback de marca usando tokens do `fast-ds`: título em
português, botão "Recarregar", e o detalhe técnico — se mantido — atrás de um `<details>`
fechado, nunca como conteúdo principal. Mesmo tratamento para o `DiagnosticoErro`
(error boundary), que hoje tem o mesmo visual de debug.

**A2. Fechar a rejeição de `CorridaAoVivo`.**
`.catch(() => {})` em `CorridaAoVivo.tsx:185` — o `useState` já nasce em `AMBIENTE_PADRAO`,
então falhar passa a cair no fallback que o componente já tem. Uma linha.

**A3. `useConexao` — dar ao app o sinal que falta.**
Hook novo em `src/components/useConexao.ts`, ao lado do precedente `useRolarParaTopo.ts`:
`navigator.onLine` + listeners de `online`/`offline`. Mora em `components/` porque não
conhece domínio nenhum (regra dura nº 3 — `components/` é folha).

**A4. Copy de rede em português, e falha rápida.**
Nenhum `e.message` chega à tela. Nos três pontos (sorteio, `erroMercado`, ranking):

- offline → *"Você está sem conexão. O sorteio precisa de internet para começar."* (e variantes)
- online mas falhou → a copy atual, que já é boa
- offline → **não tentar 4x**: falhar de imediato e oferecer "Tentar de novo"

Isso sozinho apaga 3.2 e 3.3.

### Fase B — Parecer um app *(recomendado antes de submeter)*

**B1. Banner de offline, de marca.**
`Toast`/banner do `fast-ds` dirigido pelo `useConexao`, e um empty-state dedicado nas telas
que dependem de rede. O app não tem router — não é uma rota nova, é estado.

**B2. Leitura offline do que já foi carregado.**
Guardar o último payload bem-sucedido de **Ranking** (top-14 por aba) e **Carreiras**
(histórico) no `localStorage` e renderizar em modo leitura quando offline, com etiqueta
*"atualizado em <data>"*.

Chaves **novas e separadas** — `theimmortal:cache-ranking`, `theimmortal:cache-carreiras` —
seguindo o prefixo `theimmortal:` já usado por `carreirasPendentesStorage.ts`. Por não
fazerem parte de `CarreiraState`, **não exigem migration de storage**: a v8 planejada
(seed + `decisoes[]`) continua intocada, respeitando "migration por motivo, não por lote".

Escrita e leitura ficam em `data/` (regra dura nº 3). O cache de Carreiras é conteúdo de
conta: **limpar no `signOut`**.

**B3. Nota de review, não código.**
O argumento mais forte contra 4.2 não é offline — é que **a simulação roda no aparelho**. O
motor é puro e determinístico por regra de arquitetura; nenhum resultado de corrida depende
de ida ao servidor. Isso deve estar escrito nas *App Review Notes*, com um roteiro de
reprodução: abrir, criar piloto, ligar o modo avião, correr a temporada inteira.

Custo zero de implementação, e é a única parte deste PRD que fala diretamente com o critério
que a Apple aplica.

### Fase C — Deixar a carreira terminar offline

> **Como foi escrito:** *"Resolver 3.5 exige adiantar, enquanto há rede, os circuitos e NPCs da
> próxima temporada e persistí-los no save. Isso muda o shape de `CarreiraState` → exige
> migration de storage → precisa ser coordenado com a v8 já planejada. **Recomendação: não
> empacotar aqui.**"*
>
> **Como foi feito (16/09/2026):** implementada, por um caminho mais barato que dispensa a
> migration. O parágrafo acima fica como registro da decisão original.

O destino é o mesmo — os circuitos e NPCs da próxima temporada disponíveis offline —, mas
**nada disso entra no save**. O que guarda é o cache de leitura da Fase B, com uma chave por
parâmetro (`theimmortal:cache-circuitos:<categoria>`, `theimmortal:cache-npcs:<ano>`):

- `fetchCircuitosCategoria`, `fetchNpcsSombra` e `fetchGridCategoria` gravam no cache a cada
  leitura bem-sucedida e, **quando offline**, respondem do cache em vez de falhar.
- `prefetchViradaDeTemporada` aquece esse cache uma vez por temporada, com rede, com o que a
  virada vai pedir. Sem esse warm-up o cache estaria sempre vazio no momento em que serve:
  `fetchNpcsSombra(ano+1)` só é chamado NA virada.

Três motivos para preferir isto ao que estava escrito:

1. **Sem migration.** Nada muda em `CarreiraState`, então a v8 planejada (seed + `decisoes[]`)
   segue intocada e a regra "migration por motivo, não por lote" não é forçada.
2. **Sem tocar nos adapters.** A proposta original mexeria em `iniciarProximaTemporada`, e
   `tests/carreira.golden.test.ts` depende dele através de `scripts/simulate-carreira-completa.ts`
   — o acoplamento que o CLAUDE.md sinaliza como quebrador de snapshot sem o motor ter mudado.
   Os goldens passaram sem alteração.
3. **O motor não é chamado no prefetch.** `categoriasAlvoParaOfertas` diria exatamente quais
   categorias podem aparecer nas ofertas, mas recebe `rng`: chamá-la fora do fluxo consumiria a
   sequência seedada e mudaria a carreira (regra dura nº 1). O prefetch usa o superconjunto
   estático `CATEGORIAS_SEMENTE` — mais downloads (~16KB no total), zero risco.

**O fallback vale só offline, de propósito.** Dado de referência alimenta o motor; trocá-lo
silenciosamente por uma versão velha num erro qualquer mudaria o resultado simulado sem
ninguém pedir. Online, falha continua sendo falha. E o cache tem validade de 7 dias — ver o
risco 6 da §6.

**O que continua exigindo rede:** criar uma carreira nova (§7), e a primeira virada de
temporada de quem ficou offline antes de qualquer warm-up. Nesses casos vale a mensagem da
Fase A, que explica em português o que falta.

---

## 5. O que precisa ser construído

### Fase A — bloqueia submissão
- [x] Remover (ou fechar em `DEV`) os handlers `TEMP` de `error`/`unhandledrejection` em `src/main.tsx`
- [x] Re-skinnar `DiagnosticoErro` com tokens do `fast-ds`; detalhe técnico em `<details>` fechado
- [x] `.catch` em `fetchAmbienteCircuito` (`CorridaAoVivo.tsx:185`)
- [x] Criar `src/components/useConexao.ts`
- [x] Copy pt-BR + falha rápida offline no sorteio (`useCriacaoFlow`)
- [x] Copy pt-BR + falha rápida offline no `erroMercado` (`useCarreiraFlow:1110`, `:1136`) — nunca `e.message`
- [x] Copy pt-BR + falha rápida offline no Ranking
- [x] Varredura: nenhum `.then()` sobre função de `data/` que dê `throw` sem `.catch` no call site

### Fase B — recomendado
- [x] Banner/Toast de offline via `useConexao`
- [x] Cache de leitura do Ranking (`theimmortal:cache-ranking`) + etiqueta de data
- [x] Cache de leitura de Carreiras (`theimmortal:cache-carreiras`) + limpeza no `signOut`
- [ ] Escrever as App Review Notes (Wag) — **rascunho pronto na §9**, falta colar no App Store Connect

### Fase C — implementada
- [x] Cache + fallback offline em `fetchCircuitosCategoria`, `fetchNpcsSombra` e `fetchGridCategoria`
- [x] `prefetchViradaDeTemporada` aquecendo o cache uma vez por temporada, com rede
- [x] Validade de 7 dias no cache de referência, e fallback restrito ao estado offline
- [x] Corrigir `WKAppBoundDomains` no `Info.plist` do wrapper iOS (ver §6.1) — sem isso nada disto roda no app

### Verificação
- [ ] Modo avião em device físico iOS, dentro do wrapper — não só no Safari (`PRD-publicacao-app-stores.md` §4 já pede isso)
- [ ] Percorrer: abrir offline → Home → Setup → sorteio (erro legível) → Ranking (erro legível) → carreira salva → corrida completa
- [ ] `npm run lint && npm run typecheck && npm run test:all && npm run build`

---

## 6. Riscos e decisões em aberto

1. ~~**O Service Worker só funciona no wrapper se o App-Bound Domains estiver configurado.**~~
   **CONFIRMADO E CORRIGIDO em 16/09/2026.** O risco era real e já estava materializado no
   projeto iOS que entrou pelo #147: o `Info.plist` declarava

   ```xml
   <key>WKAppBoundDomains</key>
   <array>
     <string>theimmortal.com.br/?source=pwa</string>   <!-- ← inválido -->
   </array>
   ```

   Entradas de `WKAppBoundDomains` têm que ser **domínio puro** — sem scheme, sem path, sem
   query. O que estava lá é o valor de `rootUrl` (`Settings.swift`) colado no lugar errado; note
   que o `allowedOrigins`, duas linhas abaixo no mesmo arquivo, já usava a forma certa
   (`["theimmortal.com.br"]`). Entrada inválida é **ignorada em silêncio** pelo WebKit, e com
   `limitsNavigationsToAppBoundDomains = true` (`WebView.swift:20`) a lista efetivamente vazia
   tira o Service Worker do `WKWebView`: **todo o precache da §2.1 e todo o trabalho das Fases
   A, B e C ficariam invisíveis dentro do app**, mesmo funcionando na web e no Android.

   É a mesma família do `security_invoker`, do `config.toml` e do `deno.lock`: proteção que
   parece instalada e não protege. Corrigido para `theimmortal.com.br`.

   **Ainda não medido:** a correção segue a forma documentada pela Apple, mas não foi
   verificada em device — só um build do Xcode com modo avião prova. Continua valendo o item de
   verificação em device da §5.

2. **App-Bound Domains bloqueia navegação para domínio fora da lista** — a falha é literal:
   "App-bound domain failure". O login OAuth navega para `accounts.google.com`, e o Turnstile
   carrega iframe de `challenges.cloudflare.com`. **Risco identificado, não medido**, e fora
   do escopo deste PRD — mas é o mesmo pacote, e precisa de teste em device físico antes da
   submissão. Pode virar item do PRD de publicação.

3. **O critério de 4.2 é subjetivo.** Vale o que já está escrito em
   `PRD-publicacao-app-stores.md` §6.4: mesmo com tudo isto, não há garantia de aprovação na
   primeira submissão. Este PRD reduz risco; não o elimina.

4. **Não precachear retratos para "melhorar" o offline.** Ver 3.6 — já quebrou uma vez.

6. **O cache de referência da Fase C vira risco quando o replay no motor existir.** Hoje a
   `validar-ranking` grava a pontuação **sem re-simular a carreira** — o replay é a Fase D da
   `PRD-backend-sorteio-ranking.md` §10, adiada —, então simular com circuitos cacheados não
   diverge de nada. Quando esse replay entrar, uma temporada simulada com dado de referência
   velho pode não bater com o que o servidor recalcular, e divergência é contada como **fraude**
   (`422 VALIDACAO_DIVERGENTE`), não como atrito de deploy. Duas travas já no lugar: validade de
   7 dias, e fallback só no estado offline. Quem for implementar a Fase D precisa decidir o que
   fazer com carreiras avançadas offline — provavelmente amarrar o cache ao `snapshotVersao`,
   que ainda não existe em código.

5. **Duas divergências entre `CLAUDE.md` e o código**, notadas durante a investigação e que
   não afetam este PRD, mas afetam quem ler a doc: `carreiraStorage.ts` está em
   `VERSAO_ATUAL = 22` (a doc diz v7), e `USA_SORTEAR_REMOTO` tem default **`true`**
   (`!== 'false'`), enquanto a doc diz que "nasce `false`". O comportamento medido em
   produção confirma o remoto ligado (o erro de sorteio vem de `chamarSortearRemoto`).

---

## 7. Fora de escopo

- **Push notifications.** Listadas em `PRD-publicacao-app-stores.md` §4 como reforço de 4.2, e
  continuam fazendo sentido — mas exigem VAPID, secret e Edge Function nova. **PRD próprio.**
- **Offline completo.** A criação de personagem não pode funcionar offline por decisão de
  segurança: o pool de 855 pilotos não vai para o bundle, e é por isso que `sortear` é Edge
  Function. Qualquer proposta de "sortear offline" contraria `CLAUDE.md` §Segurança.
- **Qualquer mudança de backend** — sem Edge Function nova, sem migration, sem schema.
- **Fila de escrita offline-first** (submeter ranking/carreira sem rede e sincronizar depois).
  Já existe um precedente parcial em `carreirasPendentesStorage.ts`; estendê-lo é outro
  trabalho.
- **Mudança no shape de `CarreiraState`** — a Fase C foi implementada sem ela; ver §4.

---

## 8. Referência técnica rápida

```ts
// src/components/useConexao.ts — folha, sem conhecimento de domínio (regra dura nº 3)
export function useConexao(): { online: boolean } {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const paraOnline = () => setOnline(true)
    const paraOffline = () => setOnline(false)
    window.addEventListener('online', paraOnline)
    window.addEventListener('offline', paraOffline)
    return () => {
      window.removeEventListener('online', paraOnline)
      window.removeEventListener('offline', paraOffline)
    }
  }, [])
  return { online }
}
```

```ts
// CorridaAoVivo.tsx:185 — o fallback já existe, só não é alcançado em caso de falha
fetchAmbienteCircuito(sessao.circuitoId, categoria)
  .then((resultado) => { if (!cancelado) setAmbiente(resultado) })
  .catch(() => {
    // Ambiente é decorativo: o motor já decidiu o resultado. Falhar aqui mantém
    // AMBIENTE_PADRAO, que é o mesmo estado de antes da busca resolver.
  })
```

**Como reproduzir as medições da §2 e da §3** (foi assim que este PRD foi escrito):

```js
// no console de theimmortal.com.br — precache completo e servível sem rede
const chaves = await caches.keys()
const c = await caches.open(chaves.find(k => k.includes('precache')))
const itens = (await c.keys()).map(r => r.url.replace(location.origin, ''))
await caches.match('/index.html', { ignoreSearch: true })  // → 200 text/html

// modo avião pós-boot, sem tocar no aparelho
window.fetch = () => Promise.reject(new TypeError('Failed to fetch'))
```

---

## 9. Rascunho das App Review Notes (item B3)

Texto para colar no campo *Notes* do App Store Connect. Escrito em inglês porque é o que a
equipe de review lê. **Falta o Wag revisar e colar** — o conteúdo abaixo é rascunho, não foi
submetido.

> THE IMMORTAL is a motorsport career simulator. The race simulation engine runs entirely
> on-device: given the same starting seed, a full career plays out identically with no server
> involvement. No race result is decided by a network call.
>
> The app works offline. To verify:
>
> 1. Open the app and start a career (creating a driver draws from our historical driver
>    database, so this first step needs a connection).
> 2. Enable Airplane Mode.
> 3. Keep playing: race through the season, review results, standings and contracts. Everything
>    continues to work, because the season is simulated locally and the save lives on the device.
> 4. Open Ranking or Careers while offline — the app shows the last loaded data, clearly labeled
>    with when it was retrieved, instead of an error.
>
> A connection is required only for features that are inherently online: the global leaderboard,
> the cross-device career history, and starting a brand-new career (the driver pool is
> server-side and is not shipped in the app).
>
> There is no account requirement to play. Sign-in is optional and only needed to sync career
> history across devices.

Dois pontos de honestidade que o texto acima respeita de propósito, e que devem continuar
respeitados se ele for reescrito: a criação de personagem **não** funciona offline (§7), e o
que as telas remotas mostram sem rede é **dado cacheado e rotulado**, não dado ao vivo.
