# PRD: Sign in with Apple nativo no app iOS (App Review, Guideline 4)

**Status:** rascunho para aprovação do Wag.
- 12/10/2026, v1: recomendava a Opção A.
- 12/10/2026, emenda: **decisão do Wag pela Opção B** (nativo, `ASAuthorizationAppleIDProvider`).

**Alvo:** build iOS `1.0.1` (TestFlight via `ios-release.yml`). O fluxo novo só existe dentro do app iOS. Web, PWA e Android não mudam.

---

## 1. Problema e evidências

A Apple rejeitou o build `1.0 (12)` em 12/10/2026 pela Guideline 4 (Design):

> "users are required to provide their name and/or email address after using Sign in with Apple even though that information is already provided by the Authentication Services framework."

- **Nenhuma tela do jogo pede nome ou e-mail depois do login.** O username sai do servidor (`garantirPerfil`). O Supabase grava o `full_name` da Apple: as contas "John Apple" das revisões de 07/10 e 09/10 estão em `auth.users` com o nome.
- **O revisor parou na página da Apple.** Logs de auth de 12/10, 10:01 UTC: o IP da Apple `17.64.126.208` chamou `/authorize?provider=apple` e nunca houve `/callback`.
- **Causa provável: a Apple roda dentro do WKWebView.** `appleid.apple.com` e `idmsa.apple.com` estão em `authOrigins` (`ios/IMMORTAL/Settings.swift`) e em `WKAppBoundDomains` (`Info.plist`), então `decidePolicyFor` (`WebView.swift`) mantém a navegação no WebView. Ali não há acesso ao Apple ID do aparelho, e a Apple mostra o formulário web (e-mail e senha). Foi isso que o revisor leu como "pedir e-mail".
- **O Google não tem o problema.** Ele usa a ponte nativa `autenticarGoogle` com `ASWebAuthenticationSession` (PR #191).

## 2. Opções e decisão

**Opção A: `ASWebAuthenticationSession` para a Apple.** Muda pouco e não toca no servidor. Mas não há documento da Apple garantindo que essa folha mostre o Sign in with Apple nativo (Face ID) em `appleid.apple.com`. Dependeria de medição no TestFlight, com risco de mais uma rodada de revisão. Fontes:
- [Apple Support 102379](https://support.apple.com/en-us/102379)
- [WebKit: Face ID e Touch ID na web](https://webkit.org/blog/11312/meet-face-id-and-touch-id-for-the-web/)

**Opção B: `ASAuthorizationAppleIDProvider` + `ASAuthorizationController`.** É a API que a Apple documenta para Sign in with Apple em app ([WWDC19, What's New in Authentication](https://developer.apple.com/videos/play/wwdc2019/516/)). Mostra a folha do sistema com Face ID e Touch ID por construção.

**Decisão (Wag, 12/10): Opção B.** É o caminho que a Apple espera, e a aprovação não depende de uma hipótese. O preço está nesta emenda: Edge Functions, uma migration e config no Supabase e no Apple Developer, tudo aplicado pelo Wag depois do merge (§7).

| | A | **B (escolhida)** |
|---|---|---|
| Folha nativa | Provável, não documentada | Garantida pela API |
| Exclusão de conta (5.1.1(v)) | Sem mudança | Troca de `authorizationCode` no servidor + `client_id` por token (§4.3) |
| Migração de carreira anônima | Sem mudança | Mesmo mecanismo. A retomada dispara pelo `onAuthStateChange` (§3) |
| Conta já vinculada | Sem mudança | O erro chega na hora e precisa de tratamento novo (§3.3) |
| Nome | Supabase grava | `updateUser` com o nome que a Apple entrega só no 1º login |
| Produção | Nada | 1 migration, 3 Edge Functions, provider Apple no Supabase, capability no App ID |

## 3. Fluxos ponta a ponta (só no app iOS ≥ 1.0.1)

**Detecção:** o JS usa o caminho nativo só se existir `window.webkit.messageHandlers.autenticarApple`. Esse handler só existe no build 1.0.1 ou superior. Sem ele, quando o provedor é Apple, `vincularProvedorOAuth` e `loginComProvedorOAuth` seguem exatamente como hoje (OAuth web). Isso vale para web, Android e o build 1.0 (12).

**Ponte (Swift ↔ JS), comum aos fluxos:**
1. O JS gera um `nonce` bruto com `crypto.getRandomValues` (32 bytes, hex) e envia `{ nonceHash: sha256hex(nonce) }` para `autenticarApple`.
2. O Swift aplica as mesmas checagens de origem da ponte do Google (`isMainFrame`, `https`, host do `rootUrl`, uma sessão por vez). Depois monta `ASAuthorizationAppleIDProvider().createRequest()` com `requestedScopes = [.fullName, .email]` e `nonce = nonceHash`, e chama `performRequests()`. O `presentationAnchor` é a janela do `ViewController`.
3. O Swift responde:
   - sucesso: `{ estado: 'concluido', identityToken, authorizationCode, nome: { dado, familia } | null }` (os tokens em `String` UTF-8);
   - `ASAuthorizationError.canceled`: `{ estado: 'cancelado' }`;
   - qualquer outro erro: mensagem genérica, sem tokens no log.

### 3.1 Login (`LoginScreen` → `loginComProvedorOAuth('apple', session)`)

1. Ponte → folha nativa → Face ID. Cancelar aqui não arma nada.
2. A migração da carreira anônima segue o **login por e-mail**, não o OAuth web: a sessão anônima ainda existe quando a folha fecha. Por isso `prepararMigracaoAnonima(session)` (síncrona, usa o access token como credencial, sem ticket) roda logo antes do login, e `migrarCarreirasAnonimas()` logo depois. Em caso de erro, `cancelarMigracaoAnonima()`.
3. `supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken, nonce })`. Isso cria a conta se for a primeira vez.
4. A função devolve `concluido: true`, e a tela chama `onLoginSuccess`, como no login por e-mail (não há redirect que troque a página).
5. Pós-login (`posLoginAppleNativo`, nunca lança):
   - Se veio `nome` e `user_metadata.full_name` está vazio → `updateUser({ data: { full_name, name } })`. **Portão do nome:** o `App` chama `garantirPerfil` assim que a conta deixa de ser anônima, e o servidor deriva o username do nome existente naquele momento. `segurarNomeApple()` fecha um portão antes do login, e o efeito do `App` espera `aguardarNomeApple()` antes de chamar `garantirPerfil`. Sem isso, a conta nova nasceria com username tirado do e-mail privado da Apple.
   - `functions.invoke('guardar-token-apple', { body: { authorizationCode } })` (§4.3). O código vale 5 minutos e é de uso único, por isso vai logo após o login.

### 3.2 Criar conta (sessão anônima com carreira → `vincularProvedorOAuth('apple', session)`)

1. Sessão anônima → ponte → folha nativa.
2. `supabase.auth.linkIdentity({ provider: 'apple', token: identityToken, nonce })`, a variante com id token, presente na `@supabase/auth-js` 2.110.2 instalada (`linkIdentityIdToken`). A identidade Apple é anexada ao **mesmo user_id**, e carreiras e ranking ficam com ele sem migração.
3. Pós-login igual a §3.1.5.
4. **Fallback por erro síncrono** que não seja "já vinculada" (ex.: manual linking desligado): cai em `loginComProvedorOAuth('apple')`, mantendo a regra atual, e isso reabre a folha. Não reaproveitamos o token, porque o nonce é de uso único.

### 3.3 "Essa Apple já tem conta" (Criar conta)

No fluxo web esse erro chega na URL de volta. No nativo, `linkIdentity` devolve o erro **na hora** (`identity_already_exists` / 422). O código atual o trataria como falha síncrona e faria login direto, sem o aviso. Mudança:
- `erroRetornoOAuth.ts` ganha `registrarErroOAuthImediato(provedor, codigo, descricao)`, que preenche o mesmo estado que `capturarErroRetornoOAuth` preenche no boot e notifica quem assina.
- O `App` mostra `AvisoIdentidadeJaVinculada` como hoje. "Entrar nessa conta" → `loginComProvedorOAuth('apple')` → §3.1, com a folha de novo: um toque a mais, aceitável.

### 3.4 Cancelamento

`{ estado: 'cancelado' }` → `{ error: null }`. O spinner some, a sessão anônima continua e o ticket de migração emitido no Login expira sozinho (já é o comportamento do cancelamento no Google).

### 3.5 Usuário sem Apple ID no aparelho

A folha do sistema mostra o login do Apple ID, e esse é o comportamento padrão da Apple, que o revisor aceita. Não é o formulário dentro do app.

## 4. Arquivos

### 4.1 iOS
- `ios/IMMORTAL/WebView.swift`: novo handler `autenticarApple` (`addScriptMessageHandler`, com reply) + extensão `ASAuthorizationControllerDelegate` / `ASAuthorizationControllerPresentationContextProviding`. A ponte `autenticarGoogle` fica intacta.
- `ios/IMMORTAL/Settings.swift`: tira `appleid.apple.com` e `idmsa.apple.com` de `authOrigins`.
- `ios/IMMORTAL/Info.plist`: tira os mesmos dois de `WKAppBoundDomains` e atualiza o comentário. O WebView nunca mais renderiza o formulário da Apple.
- `ios/IMMORTAL/Entitlements/Entitlements.plist`: `com.apple.developer.applesignin = [Default]`.

### 4.2 Cliente (TS)
- `src/data/oauthAppleIOS.ts` (novo): `obterPonteAppleIOS()`, `gerarNonce()`, `autenticarAppleNativo()`, `posLoginAppleNativo()`.
- `src/data/oauthProvedor.ts`: os ramos Apple-nativo em `vincularProvedorOAuth` e `loginComProvedorOAuth`.
- `src/data/erroRetornoOAuth.ts`: `registrarErroOAuthImediato`.
- `src/data/tokenApple.ts`: sem mudança de lógica. No fluxo nativo a sessão não tem `provider_refresh_token`, então ele simplesmente não faz nada.
- Testes: `tests/oauthAppleIOS.test.ts` (ponte mockada: concluído, cancelado, resposta inválida, nonce enviado como hash) e `tests/oauthProvedor.test.ts` (Apple sem ponte = fluxo web inalterado; login nativo; vínculo nativo; já vinculada → aviso, não login; fallback síncrono; Google intocado).
- Copy nova só se surgir mensagem de erro em tela, e então nos três `locales`.

### 4.3 Servidor (arquivos no PR, aplicação pelo Wag)

**O motivo:** o token emitido no app pertence ao `client_id` **`br.com.theimmortal`** (bundle). O da web e do Android pertence a **`br.com.theimmortal.web`** (Services ID). A Apple só revoga com o mesmo `client_id` que emitiu.

- **Migration** `supabase/migrations/<versão>_tokens_apple_client_id.sql`: `client_id text not null default 'br.com.theimmortal.web'` em `jogadores.tokens_apple` e em `jogadores.revogacoes_apple_pendentes`. O default deixa as linhas existentes corretas. A RPC `jogadores.reivindicar_revogacoes_apple` é recriada (drop + create, porque o tipo de retorno muda) para devolver também `client_id`, com os mesmos grants. As permissões e a RLS das tabelas não mudam.
- **`guardar-token-apple`** (`verify_jwt: true`): aceita `{ refreshToken }` como hoje (grava `client_id` web) **ou** `{ authorizationCode }`. No segundo caso, faz `POST https://appleid.apple.com/auth/token` com `grant_type=authorization_code`, `client_id=br.com.theimmortal` e client secret assinado com a `.p8` (`sub` = bundle), e grava o `refresh_token` devolvido com `client_id` = bundle. Mantém a checagem "identidade mais recente é Apple". Nunca loga código nem token.
- **`revogarApple.ts`** (as duas cópias, `excluir-conta/` e `revogar-apple-pendentes/`): `revogarRefreshTokenApple(refreshToken, clientId)`. O client secret é assinado com `sub = clientId`. A geração do client secret passa a ser usada também pela `guardar-token-apple`, o que dá uma terceira cópia idêntica. `tests/revogarApple.copias.test.ts` passa a conferir as três.
- **`excluir-conta`** (`verify_jwt: true`): lê `client_id` junto do token, repassa à revogação e grava o `client_id` na fila quando a revogação falhar.
- **`revogar-apple-pendentes`** (`verify_jwt: false`, chamada pelo cron): lê e repassa `client_id`.
- Os cabeçalhos dos `index.ts` mantêm o `verify_jwt` declarado.
- Build/esbuild: essas funções não estão nos `build:*`. O deploy é como foi feito em 30/09.

### 4.4 O que não muda

O site visível (telas, copy, CSS), o fluxo web e Android do Sign in with Apple, o Google em todas as plataformas, `sortear`, `validar-ranking`, `simular-rival`, `emitir-ticket-migracao`, `migrar-carreiras-anonimas` e o save local.

## 5. Configuração (só listar, o Wag executa)

**Apple Developer**
1. Identifiers → App ID `br.com.theimmortal` → habilitar **Sign in with Apple** ("Enable as a primary App ID").
2. Keys: a chave `.p8` atual (`APPLE_KEY_ID`) precisa ter Sign in with Apple com o **primary App ID** `br.com.theimmortal` agrupado. Se ela estiver associada a outro App ID, a troca do código devolve `invalid_client`. Conferir em Keys → a chave → Configure.
3. O perfil de provisionamento é regenerado pelo `-allowProvisioningUpdates` do `ios-release.yml` (cloud signing). Se o build falhar por entitlement, o item 1 não foi feito.

**Supabase (painel)**
4. Authentication → Providers → Apple → **Client IDs**: acrescentar `br.com.theimmortal` **depois** de `br.com.theimmortal.web` (lista separada por vírgula). O fluxo OAuth web continua com o Services ID. Conferir login web com Apple logo depois (T8).
5. "Allow manual linking": já ligado (o Criar conta via `linkIdentity` depende disso hoje).
6. Secrets `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`: já existem no projeto. A `guardar-token-apple` passa a usá-los também, sem secret novo.

## 6. Plano de testes

**Automático:** `npm run lint && npm run typecheck && npm run test:all && npm run build`, com os testes de §4.2 e a cópia tripla de §4.3. O Swift não tem teste automatizado no repo (não há Mac): a cobertura é o TestFlight.

**TestFlight (iPhone real, build 1.0.1, depois de §7 passos 1 a 5):**

| # | Roteiro | Aceite |
|---|---|---|
| T1 | Login → "Entrar com Apple" (Apple que já tem conta) | Folha do sistema com Face ID, **sem e-mail nem senha**, e volta logado na conta certa |
| T2 | App novo, 1 temporada sem conta → Criar conta → Apple nova | Folha nativa, volta logado, a carreira segue na lista, mesmo user_id. No banco: `full_name` preenchido e linha em `tokens_apple` com `client_id = br.com.theimmortal` |
| T3 | Criar conta com Apple que já tem conta | `AvisoIdentidadeJaVinculada`. "Entrar nessa conta" → folha de novo → logado, carreira migrada |
| T4 | Login com Apple nova, vindo de carreira anônima | Conta criada, carreira migrada pelo ticket |
| T5 | Cancelar a folha (Login e Criar conta) | Volta à tela sem spinner preso e sem erro, e a sessão anônima segue |
| T6 | Conta Apple (T2) → Perfil → Deletar conta | Log da `excluir-conta`: `revogado`. Em Ajustes → Apple ID → Iniciar sessão com a Apple, o app some da lista |
| T7 | Google no app | Igual a hoje |
| T8 | Web e Android: login com Apple, e deletar uma conta Apple criada pela web | Igual a hoje; revogação `revogado` com o `client_id` web |

**Critério de aceite:** "Entrar com Apple" abre a folha nativa com Face ID, sem formulário de e-mail ou senha, e volta logado no Login, no Criar conta (vindo de sessão anônima com carreira) e no cancelamento. A exclusão de conta continua revogando.

## 7. Ordem de entrada em produção (tudo pelo Wag, depois do merge)

A ordem importa: cliente novo antes do servidor faz a revogação perder tokens, e servidor antes da migration quebra a exclusão.

1. **Migration** (`supabase db push`).
2. **Edge Functions**: `revogar-apple-pendentes` (`verify_jwt: false`), `excluir-conta` (`true`), `guardar-token-apple` (`true`). As três são compatíveis com o cliente atual. Depois, comparar `list_edge_functions` contra o repo.
3. **Supabase Auth**: Client IDs (§5.4). **Apple Developer**: §5.1 e §5.2.
4. **Merge do site** → Workers Builds. O TS novo só age com `autenticarApple`, então não muda nada na web, no Android nem no build 1.0 (12) em revisão.
5. **`ios-release.yml` com `versao: 1.0.1`** → TestFlight → roteiro §6.
6. Com T1 a T8 verdes, enviar o 1.0.1 para revisão com o texto de §8.

## 8. Rascunho para a Apple (inglês)

**Resolution Center reply:**

> Hello,
>
> Thank you for the review. The app never asks for a name or email after Sign in with Apple: the name comes from the Authentication Services response and the username is generated automatically.
>
> What you saw was Apple's own web sign-in form ("Sign in with Apple ID", asking for the Apple ID email and password). In build 1.0 (12), Sign in with Apple ran inside the app's web view, which has no access to the device's Apple ID, so Apple showed its web form instead of the system sheet.
>
> In build 1.0.1, Sign in with Apple uses the native Authentication Services framework (ASAuthorizationAppleIDProvider). Tapping "Sign in with Apple" opens the system sheet with Face ID / Touch ID, and the user returns to the app signed in. No additional information is requested.
>
> Thank you.

**App Review notes (build 1.0.1):**

> Sign in with Apple uses the native Authentication Services sheet. To test: open the app, tap the profile icon > "Sign in with Apple" (or "Create account" > Apple) and confirm with Face ID / Touch ID. The app does not ask for name or email afterwards. The game can also be played without an account. Account deletion is in Profile > Delete account and revokes the Sign in with Apple token.

---

## Fontes

- Apple Support, How to use Sign in with Apple: https://support.apple.com/en-us/102379
- WebKit, Meet Face ID and Touch ID for the Web: https://webkit.org/blog/11312/meet-face-id-and-touch-id-for-the-web/
- WWDC19, What's New in Authentication: https://developer.apple.com/videos/play/wwdc2019/516/
