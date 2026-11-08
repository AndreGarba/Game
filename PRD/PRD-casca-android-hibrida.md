# PRD — Casca Android híbrida (Kotlin + WebView + ponte)

**Projeto:** Hora do Banho
**Status:** aprovado pelo André em 07/11/2026 (D1–D5 como propostas); PR 1 (casca mínima) feito
**Definições:** André · **Redação:** Claude
**Data:** 07/11/2026
**Substitui:** o plano de casca TWA do `CLAUDE.md` (Stack, "Lojas e anúncios" item 7) e a casca
Capacitor de teste em `android/`

---

## 1. Objetivo

Publicar o Hora do Banho na Play como uma casca nativa fina em **Kotlin**, com uma `WebView`
própria que carrega o site de produção e uma **ponte JS↔nativo** para o que o navegador não faz.
Mudança no jogo continua indo pro ar com o deploy do site; versão nova na Play só quando a casca
muda (ponte, permissão, SDK nativo).

### Por que não TWA

O `CLAUDE.md` planejava TWA, como no THE IMMORTAL. Lá, a falta de ponte JS custou caro: dado
passado pela URL (`#fcm=`) que só chegava depois de reabrir o app, push com o domínio do Chrome no
cabeçalho, versão da casca invisível pro site e uma `Activity` aberta por intent a cada anúncio
(`intent://anuncio`), sem canal de volta (`LICOES-LOJAS-E-ANUNCIOS.md`). Com WebView própria, o
site pergunta e recebe resposta.

### Por que não ficar no Capacitor

A casca de hoje (`android/`, Capacitor 8) embute o `dist/` no APK. Serviu para testar no aparelho
antes de haver site; agora o site está no ar. Capacitor também é WebView com ponte, mas traz um
runtime, um esquema `https://localhost` e um ciclo `cap sync` que a casca fina não precisa. A casca
Kotlin tem uma `Activity`, um cliente e uma ponte: dá para ler inteira numa revisão.

**Decisão a confirmar (D1):** a casca Kotlin **substitui** `android/` (Capacitor sai, junto com
`capacitor.config.ts`, `@capacitor/*` e o script `android:apk`). Para continuar testando sem site,
o build de debug ganha um sabor `local` que serve o `dist/` dos assets pelo `WebViewAssetLoader`
(ver §3.1). Alternativa: manter o Capacitor numa pasta à parte até a casca nova estar na Play.

---

## 2. Dados do projeto

| Campo | Valor | Origem |
| --- | --- | --- |
| Nome do app | Hora do Banho | `capacitor.config.ts` |
| `applicationId` | `br.com.gasgames.horadobanho` | já usado no APK de teste; **definitivo depois da primeira publicação** |
| URL de produção | `https://horadobanho.aquinoweb-wag.workers.dev` | `CLAUDE.md` |
| URL de preview | nenhuma hoje | — |
| Domínio próprio | a definir | — |
| Backend | Supabase (projeto ainda não criado) | `CLAUDE.md` |
| `minSdk` / `targetSdk` | 24 / 36 | `android/variables.gradle` |
| Orientação | `sensorLandscape`, tela cheia imersiva | casca atual |
| Cor de fundo/splash | `#f8f7fa` (primeiro quadro da abertura) | `capacitor.config.ts` |
| Ícone e splash | provisórios, gerados da arte da home | `android/app/src/main/res` |

**Decisões a confirmar (D2):** o que entra agora.

| Recurso | Proposta | Motivo |
| --- | --- | --- |
| Push (FCM) | **não agora** | Sem backend e sem conta, não há para quem mandar nem o que dizer. Volta junto com ranking/desafio diário. |
| Anúncios (AdMob) | **sim, depois da casca mínima** | `CLAUDE.md` já prevê; depende de SSV no Supabase, que ainda não existe. |
| Compra/assinatura | **não** | Nada a vender hoje. |
| Login social | **não** | Ranking começa com id anônimo (`CLAUDE.md`, anti-fraude). |
| Avaliação e atualização in-app | **sim** | Não dependem de backend. |

Se D2 for aprovado assim, a ordem de PRs da §7 pula push e compras.

---

## 3. Arquitetura

```
┌────────────────────────── MainActivity (Kotlin) ──────────────────────────┐
│ SplashScreen (core-splashscreen) ── segura até o 1º onPageFinished        │
│                                                                            │
│ WebView ── carrega ORIGEM_PRODUCAO                                         │
│  ├─ ClienteWeb (WebViewClient)    origem fora da lista → navegador/Custom Tab
│  ├─ ClienteChrome (WebChromeClient) tela cheia, console em debug           │
│  └─ PonteCasca (WebMessageListener, só nas origens permitidas)             │
│        ▲ {id, metodo, args}                    │ {tipo, dados}             │
│        │                                        ▼                          │
│   window.HoraDoBanho.postMessage        replyProxy.postMessage            │
│                                                                            │
│ OnBackPressedCallback ── goBack() → evento "voltar" → finish()            │
│ Insets ── evento "insets" com as áreas seguras em px CSS                  │
└────────────────────────────────────────────────────────────────────────────┘
                         │
                         ▼
     site: src/data/cascaAndroid.ts ── detecta a ponte; fora do app, fallback do navegador
```

### 3.1 `MainActivity` e `WebView`

- Kotlin, sem Compose. Nenhuma tela nativa nesta fase.
- Configuração: `javaScriptEnabled`, `domStorageEnabled`, `databaseEnabled`;
  `mediaPlaybackRequiresUserGesture = false` (a abertura da GAS Games tem som);
  `setSupportZoom(false)`; `WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG)`.
- **Origens permitidas** num só lugar (`BuildConfig.ORIGENS_PERMITIDAS`), lidas pelo cliente e pela
  ponte. Produção: `https://horadobanho.aquinoweb-wag.workers.dev`. Quando houver domínio próprio,
  entra na lista; a antiga sai numa versão seguinte.
- Sabores (`productFlavors`):
  - `producao`: carrega a origem de produção. É o único que vai pra Play.
  - `local` (só debug): `WebViewAssetLoader` serve o `dist/` copiado para os assets em
    `https://appassets.androidplatform.net/`, que entra na lista de origens só nesse sabor. Mantém
    o "jogar sem site" de hoje.
- `WebView` sobrevive a rotação/mudança de configuração (o manifest já declara `configChanges`), para
  não recarregar no meio de uma partida.
- `onPause`/`onResume` repassados à `WebView` (`webView.onPause()`), para o jogo pausar e o áudio
  parar com o app em segundo plano. O site já pausa por `visibilitychange`; isto garante que o
  evento dispara.
- `onRenderProcessGone`: recria a `WebView` em vez de deixar o app morrer (WebGL pode derrubar o
  renderer em aparelho fraco).

### 3.2 Navegação (`ClienteWeb`)

- Navegação para origem fora da lista abre fora: **Custom Tab** para `http(s)`, `Intent` do sistema
  para `mailto:`, `market:`, `intent:`. Nunca dentro da `WebView`.
- Login OAuth (se um dia houver): sempre Custom Tab ou Credential Manager; o Google bloqueia OAuth
  em WebView embutida. Fora do escopo agora (D2).
- Erro de rede no carregamento principal: tela de erro nativa (layout com `strings.xml`), com botão
  "tentar de novo", traduzida pt/en/es. Com o service worker ativo isso só aparece na primeira abertura sem internet.

### 3.3 Voltar nativo

Hoje o voltar do celular fecha o app (tabela "Voltar nativo" do `CLAUDE.md`, as duas linhas
**pendentes**). Fluxo da casca:

1. `webView.canGoBack()` → `goBack()`.
2. Senão, se a ponte está ativa, manda `{tipo: "voltar"}` e espera até 300 ms por
   `voltarTratado(true|false)`. `true` = o site fechou uma camada (pausa, fim, história).
3. Senão (ou sem resposta), o padrão do sistema (no Android 12+ manda o app pro fundo em vez de
   encerrar, e a volta é instantânea).

O lado do site pluga isso no hook de camadas que o `CLAUDE.md` já pede
(`useVoltarNativoEmCamadas`): a casca vira só mais uma fonte do mesmo "voltar". Esse hook é um PR
do site, não da casca, e resolve as linhas pendentes também na PWA.

### 3.4 Tela cheia, safe area e splash

- Imersivo como hoje (barras escondidas, aparecem com deslize). Edge-to-edge é obrigatório no
  `targetSdk` 35+.
- Os insets do recorte da câmera (`displayCutout`) e das barras transitórias vão pro site no evento
  `insets` (`{topo, direita, baixo, esquerda}` em px CSS). O `cascaAndroid.ts` grava como
  `--casca-inset-*` no `:root`, e a `.moldura-celular` soma isso ao `env(safe-area-inset-*)`, que a
  WebView do Android nem sempre preenche.
- Splash: `core-splashscreen`, fundo `#f8f7fa`, segura até o primeiro `onPageFinished` (teto de 4 s,
  para não prender o jogador numa rede lenta). Depois a abertura do próprio site assume.

---

## 4. Ponte JS↔nativo

### 4.1 Transporte e segurança

- **`WebViewCompat.addWebMessageListener`** (AndroidX WebKit), objeto `window.HoraDoBanho`, com
  `allowedOriginRules` = `ORIGENS_PERMITIDAS`. A WebView só injeta o objeto nessas origens, inclusive
  em iframes. Não usamos `addJavascriptInterface`: ele expõe o objeto para qualquer página que a
  WebView carregar.
- **Origem conferida em cada mensagem** (`sourceOrigin` no `onPostMessage`), não só na injeção.
  Mensagem de origem fora da lista é descartada e logada em debug.
- Recurso ausente (`WebViewFeature.WEB_MESSAGE_LISTENER` falso, WebView muito antiga): a casca **não
  expõe ponte** e o site roda como no navegador. Nada quebra; só falta o extra.
- Nenhum método devolve segredo. A casca não guarda chave de API, `service_role` nem token de
  usuário.
- Entrada do JS é não confiável: JSON com no máximo 8 KB, `metodo` numa lista fechada, cada
  argumento validado em tipo e tamanho (texto de compartilhar ≤ 500 caracteres, URL só `https` e
  só das origens permitidas). Inválido → resposta `{ok: false, erro: "invalido"}`.

### 4.2 Formato

- JS → nativo: `{id, metodo, args}`. `id` é um contador do site para casar a resposta.
- Nativo → JS: sempre `{tipo, dados}`.
  - Resposta: `{tipo: "resposta", dados: {id, ok, valor | erro}}`.
  - Evento: `{tipo: "<evento>", dados: {...}}`.
- Códigos de erro fechados: `invalido`, `indisponivel` (recurso não existe nesta casca/aparelho),
  `cancelado`, `falhou`. Mensagem técnica vai só pro console.

### 4.3 Métodos

| Método | Retorno | PR | Notas |
| --- | --- | --- | --- |
| `versaoCasca()` | `{versionName, versionCode, capacidades: string[]}` | 2 | `capacidades` substitui a query string do `CLAUDE.md` ("a casca anuncia o que sabe fazer"): `["voltar", "insets", "compartilhar", ...]`. Site nunca presume um método fora da lista. |
| `voltarTratado(tratado: boolean)` | — | 2 | Resposta ao evento `voltar`. |
| `compartilhar(texto, url?)` | `{ok}` | 2 | Share sheet nativo. Imagem fica fora até haver card de placar (§8). |
| `vibrar(ms)` | — | 2 | Opcional, ≤ 200 ms. Batida/queda. Só se o André quiser; `navigator.vibrate` já funciona na WebView. |
| `avaliar()` | `{mostrou: boolean}` | 5 | Play In-App Review. A Play pode não mostrar e não avisa: voltou em < 1,5 s → site oferece abrir a página da loja (lição do THE IMMORTAL). |
| `anuncio(tipo, nonce?)` | `{resultado: "fechou" \| "recompensa_pendente" \| "indisponivel"}` | 4 | Ver §5. |
| `privacidadeAnuncios()` | — | 4 | Reabre o formulário UMP (item no Perfil). |
| `tokenPush()` / `pedirPermissaoNotificacao()` | — | — | Fora (D2). Desenho pronto em §8 para quando voltar. |
| `comprar` / `assinar` | — | — | Fora (D2). |

**Eventos nativo → JS:** `voltar`, `insets`, `pausa`/`retomada` (redundante com
`visibilitychange`, só se o teste mostrar que ele falha na WebView), `anuncioPronto` (o pré-carregado
terminou de carregar, para o site mostrar ou esconder o botão de recompensa).

**Atualização in-app** (Play In-App Updates) roda **só na casca**, sem método: no `onCreate`,
modo flexível; imediato quando a prioridade no Play Console for ≥ 4.

### 4.4 Lado do site

- `src/data/cascaAndroid.ts`: detecta `window.HoraDoBanho`, faz o `postMessage`, casa resposta por
  `id` (timeout de 5 s → `indisponivel`), expõe funções tipadas e um assinante de eventos. Fica em
  `data/` porque toca em `window` (motor continua puro).
- Cada função tem fallback do navegador: `compartilhar` → `navigator.share` → copiar link;
  `avaliar` → sem botão; `anuncio` → `indisponivel`.
- Nenhum texto de UI vem da casca. A página de erro de rede da §3.2 é a única copy nativa, com
  `strings.xml` em pt/en/es.

---

## 5. Anúncios (AdMob) — PR 4

Segue `CLAUDE.md` "Lojas e anúncios" e `LICOES-LOJAS-E-ANUNCIOS.md`; o que muda é o transporte.

- `MobileAds.initialize` no boot, depois do consentimento **UMP** (formulário antes do primeiro
  pedido de anúncio onde a lei exigir).
- `MobileAds.registerWebView(webView)` para o AdMob reconhecer o conteúdo web.
- **Pré-carregamento em segundo plano**: um anúncio de cada formato carregado assim que o SDK sobe
  e recarregado logo depois de cada exibição. `show()` instantâneo; carregar só quando o jogador
  pede é o que deixa o anúncio lento.
- Recompensa **só pelo servidor (SSV)**: o site cria o nonce, passa em `anuncio("recompensado",
  nonce)`, a casca põe no `ServerSideVerificationOptions.customData`. A casca devolve no máximo
  `recompensa_pendente`; quem concede é a Edge Function. **Bloqueante:** precisa da function SSV e
  do Supabase, que não existem ainda.
- IDs de bloco: constantes no código; os de teste no sabor debug; release falha sem os secrets reais.
- Formato e frequência (intersticial por partida, primeira partida sem anúncio, aviso antes do
  intersticial premiado) são decisão de produto em PRD de monetização próprio, não deste.

---

## 6. Armazenamento, backup e build

### 6.1 Dados do jogador

- O `localStorage` da WebView é **do app**: não é o mesmo do Chrome. Quem jogou na PWA e instala o
  app começa sem recorde. Hoje o único dado é `horadobanho:recorde` (`src/data/recorde.ts`), então é
  aceitável. Quando houver conta/ranking, o servidor é a fonte e o local vira cache, como o próprio
  arquivo já diz.
- O APK Capacitor de teste grava em `https://localhost`; o recorde de teste se perde na troca.
  Só afeta testadores.
- Gravação nunca lança (já é assim em `recorde.ts`). Regra para qualquer save novo.
- `allowBackup` ligado com `dataExtractionRules`/`fullBackupContent` em `res/xml`: entra o storage
  da WebView (o recorde vale a pena ir junto para o aparelho novo); sai qualquer id anônimo de
  telemetria ou ranking, para não clonar identidade entre aparelhos. O id do ranking mora no
  IndexedDB (`src/data/jogador.ts`), que as regras de backup não incluem; o nome digitado fica no
  `localStorage` e vai junto.

### 6.2 Build e publicação

- Kotlin 2.x, AGP 8.x, Gradle wrapper versionado, Java 21. Mantém o contorno do `subst` para o
  caminho com acento (`android/README.md`).
- Assinatura: chave de upload da Play **fora do repo**, em dois cofres; Play App Signing ligado.
- `.github/workflows/android-release.yml`: disparo manual (`workflow_dispatch`) com `versionCode` e
  `versionName` de entrada; `bundleProducaoRelease`; AAB como artefato. **Publicar na Play é
  manual, do André.** Secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_SENHA`,
  `ANDROID_CHAVE_ALIAS`, `ANDROID_CHAVE_SENHA` (e, no PR 4, os IDs do AdMob).
- CI de PR: `assembleProducaoDebug` + `lint` do Android, junto do job `verificar`.
- `assetlinks.json`: **não precisa** nesta fase (sem App Links verificados). Volta se houver deep
  link de notificação ou de compartilhamento abrindo o app.
- Faixas: teste interno → produção em rollout 5% → 20% → 100%, olhando crash e ANR no Play Console.
  A Play não deixa voltar `versionCode`: rollback é versão nova.
- Classificação etária (IARC): livre; declarar anúncios quando o PR 4 entrar.

---

## 7. Ordem de entrega (PRs pequenos)

Cada PR diz o que foi testado e como, e roda o build Gradle (ou diz que o ambiente não deixou).

1. **Casca mínima:** Kotlin no lugar do Capacitor (D1), WebView, origens, `ClienteWeb`, voltar
   (passos 1 e 3), imersivo, splash, sabores `producao`/`local`, página de erro, CI de build.
   Atualiza `CLAUDE.md` (Stack, Lojas item 7) e `android/README.md`.
2. **Ponte:** `PonteCasca`, `versaoCasca` com capacidades, `voltar`/`voltarTratado`, `insets`,
   `compartilhar`; `src/data/cascaAndroid.ts` com fallback e testes do lado do site.
3. ~~Push~~ — fora (D2).
4. **Anúncios:** só depois do Supabase e da function SSV existirem.
5. ~~Compras~~ — fora (D2).
6. **Avaliação e atualização:** In-App Review + In-App Updates. Pode vir antes do 4.

Separado da casca, no site: hook de camadas do voltar (§3.3) e soma dos `--casca-inset-*` na
moldura (§3.4).

---

## 8. Riscos a medir

| Risco | Como medir | Plano B |
| --- | --- | --- |
| **WebGL/three.js e animações na WebView** (`cenaAgua.ts`, Lottie da abertura) | Partida de 5 min em aparelho fraco (Android 8–10, 2–3 GB) comparando FPS no Chrome e na casca; `chrome://inspect` → Performance. | Mesmo código roda nos dois; se a WebView ficar abaixo, `hardwareAccelerated` explícito e efeito d'água reduzido por detecção de GPU. `onRenderProcessGone` cobre o crash. |
| **Service worker/PWA dentro da WebView** | Conferir no `chrome://inspect` que o SW registra na origem de produção; abrir em modo avião depois da 1ª visita. | Sem SW, a página de erro de rede segura a primeira abertura offline; o sabor `local` continua existindo para teste. |
| **Cota de storage** | Hoje desprezível (um número). Medir `navigator.storage.estimate()` quando houver save maior. | Gravação que nunca lança + versão enxuta (`CLAUDE.md`, Save). |
| **Política do AdMob em WebView** | Revisar a política de "conteúdo web em app" antes do PR 4; `registerWebView` é o caminho oficial. | Anúncio só em tela nativa por cima, nunca dentro do HTML. |
| **OAuth em WebView** | Não se aplica agora (sem login). | Custom Tab/Credential Manager se entrar login. |
| **WebView desatualizada** (minSdk 24 sem update do Play) | `WebViewCompat.getCurrentWebViewPackage()` na telemetria do `versaoCasca`. | Sem `WEB_MESSAGE_LISTENER`, sem ponte: site como navegador. |
| **Troca de domínio** (workers.dev → próprio) | — | Duas origens na lista por uma versão; storage é por origem, então o recorde local não segue (aceitável enquanto for só recorde). |
| **Áudio sem gesto** | Abertura toca som na 1ª abertura do app? | `mediaPlaybackRequiresUserGesture = false` já resolve; se não, a abertura cai no modo mudo que já existe. |

---

## 9. Para aprovar

- **D1:** Kotlin substitui o Capacitor em `android/`, com sabor `local` para testar sem site.
- **D2:** push e compras fora; anúncios depois do backend; avaliação e atualização entram.
- **D3:** `applicationId` `br.com.gasgames.horadobanho` é definitivo (não muda depois da Play).
- **D4:** ponte por `WebMessageListener` com nome `window.HoraDoBanho`.
- **D5:** sem `assetlinks.json` nesta fase.
