# Android — The Immortal

Projeto TWA (Trusted Web Activity) gerado pelo PWABuilder em 06/10/2026 com **Include source
code** habilitado e **Signing key: None**. É só uma casca: o conteúdo é o site
`https://theimmortal.com.br/`, então mudança no jogo vai pro ar com o deploy do site, sem nova
versão na Play. Nova versão só é necessária quando muda a casca (ícone, cores, nome, permissões,
SDK alvo, integração nativa).

- Identificador: `br.com.theimmortal.twa`
- Site: `https://theimmortal.com.br/` — entrada: `/?source=pwa`
- Android mínimo: API 24; compile/target: API 36.

## Publicar uma versão nova

Pela aba **Actions** do GitHub → **Android — enviar pra Google Play** → **Run workflow**:

| Campo | O que é |
| --- | --- |
| `versao` | Versão que aparece na loja (`versionName`), ex. `2.1.3`. |
| `trilha` | `production` (loja) ou `internal` (teste interno). |
| `lancar` | Desmarcado: a versão fica como **rascunho** na Play Console e alguém clica em lançar lá. Marcado: vai direto pra revisão e é lançada pra 100% quando aprovada. |
| `version_code` | Deixe vazio. O automático é `1 + número do run` e só cresce. Preencha só se a Play recusar o número. |

O workflow gera o AAB, assina com a chave de upload, **confere que a assinatura é a do app
publicado** antes de enviar, sobe pra Play com o `mapping.txt` e guarda o AAB no run por 30
dias (pra subir à mão se a API falhar).

Em PR que mexe em `android/**` o mesmo workflow roda só o build e a conferência — nunca envia.

## Chave de upload

O app usa **Play App Signing**: quem assina o que chega no celular é a chave do Google
(`6C:BA:68…` no `assetlinks.json`). A nossa é só a **chave de upload** (`CA:E9:FC…`), gerada pelo
PWABuilder em 09/09/2026 — `signing.keystore`, alias `theimmortal`, senhas no
`signing-key-info.txt` que veio no mesmo pacote.

**Ela não está neste repositório e não pode estar.** Mora em dois lugares: nos secrets do GitHub
(abaixo) e num cofre fora do computador (gerenciador de senhas ou Drive). Se as duas cópias se
perderem, a saída é pedir **redefinição da chave de upload** na Play Console (Configuração →
Integridade do app → Assinatura de apps), que leva alguns dias — o app continua o mesmo, porque a
chave que identifica o app é a do Google.

Gerar um pacote novo no PWABuilder com "Create new" cria uma chave diferente, que a Play recusa.
Se precisar regerar o projeto, use **Signing key: None** (como este) — a assinatura é do workflow.

### Secrets do repositório (Settings → Secrets and variables → Actions)

| Secret | Conteúdo |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | O `signing.keystore` em base64. |
| `ANDROID_KEYSTORE_PASSWORD` | "Key store password" do `signing-key-info.txt`. |
| `ANDROID_KEY_PASSWORD` | "Key password" do `signing-key-info.txt`. |
| `PLAY_SERVICE_ACCOUNT_JSON` | JSON inteiro da chave da conta de serviço do Google Cloud com acesso à Play Console. |

Base64 do keystore direto pra área de transferência (PowerShell):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\caminho\signing.keystore")) | Set-Clipboard
```

## Compilar localmente

Abrir esta pasta no Android Studio (ele instala o SDK pedido). A partir de `android/`:

```powershell
.\gradlew.bat assembleDebug
.\gradlew.bat bundleRelease
```

Sem as variáveis `ANDROID_KEYSTORE_PATH`/`ANDROID_KEYSTORE_PASSWORD`/`ANDROID_KEY_ALIAS`/
`ANDROID_KEY_PASSWORD`, o release sai sem assinatura — serve pra conferir que compila.

Chaves, senhas, `local.properties`, APKs, AABs e caches ficam fora do Git (`android/.gitignore`).
O `public/.well-known/assetlinks.json` já tem as duas impressões digitais certas; não substitua
pelo de um pacote gerado sem assinatura ou com chave nova — a barra de URL do Chrome volta a
aparecer dentro do app.

## Avaliação nativa (In-App Review)

O convite de avaliação do fim de carreira e o "Avaliar o App" do Perfil abrem a janela de estrelas
da Play por cima do jogo:

1. A `LauncherActivity` abre o site com `?avaliacao_nativa=1` — é assim que o site sabe que a
   casca tem a avaliação (`src/data/cascaAndroid.ts`). Casca antiga não manda, e o convite
   continua levando pra página da Play.
2. O site navega pra `intent://avaliar#Intent;scheme=theimmortal;package=br.com.theimmortal.twa;…`
   (`pedirAvaliacao` em `src/features/perfil/linksExternos.ts`).
3. O Chrome entrega à `AvaliacaoActivity`, transparente, que chama a Play In-App Review API e
   fecha quando a janela fecha. Se o pedido à Play falhar, abre a página da loja.

A Play decide sozinha se mostra a janela (cota por usuário; quem já avaliou costuma não ver de
novo) e não avisa quando não mostra — o `launchReviewFlow` completa com sucesso nos dois casos.
Num botão fixo como o do Perfil, isso seria um toque que não abre nada. Por isso a activity mede
quanto o fluxo durou: se voltou em menos de 1,5 s (`TEMPO_MINIMO_JANELA_MS`), a janela não
apareceu e ela abre a página da loja. É heurística — quem fechar a janela num reflexo também cai
na loja.

Casca anterior a esta mudança (2.1.3, versionCode 5) não tem esse fallback: lá, "não mostrou" é
toque sem resposta.

**Testar:** a janela só aparece em app instalado pela Play. Na trilha `internal` ela aparece,
mas o envio da nota pode ficar desabilitado — o que vale conferir é a janela abrir e o jogo
continuar onde estava ao fechar.

## Anúncios (AdMob)

O jogo é web, mas os anúncios são nativos: o site navega pra `theimmortal://anuncio?…` e a
`AnuncioActivity` mostra o anúncio por cima do TWA (mesmo desenho da `AvaliacaoActivity`).

| Build | App ID | Blocos |
| --- | --- | --- |
| `debug` | de teste do Google | de teste do Google (recompensado `…/5224354917`, intersticial `…/1033173712`) |
| `release` | real (`ca-app-pub-4839638174505369~4709508913`) | secrets `ADMOB_REWARDED_ID` e `ADMOB_INTERSTITIAL_ID` |

Sem os dois secrets o release compila normalmente e sai **sem anúncio**: a `LauncherActivity` só
manda `anuncios_nativos=1` pro site quando o ID do recompensado existe. Nunca cai nos IDs de teste.

- **Recompensado:** a recompensa não é concedida no aparelho. O AdMob chama a Edge Function
  `admob-ssv` (validação no servidor) com o `nonce` que o site passou, e o site consulta o nonce
  ao voltar. Ativar a validação no servidor no bloco, com a URL da função.
- **Consentimento (UMP):** o formulário aparece antes do primeiro anúncio onde a lei exigir
  (mensagens criadas no AdMob → Privacidade e mensagens). `theimmortal://privacidade` reabre o
  formulário. A `LauncherActivity` manda `privacidade_ads=1` lendo o status **em cache** do UMP,
  sem rede, pra não segurar a abertura: na primeira abertura ainda não há cache, então o item de
  privacidade do Perfil só aparece a partir da segunda. Aceito de propósito.
- **Testar num aparelho:** `./gradlew installDebug` mostra anúncios de teste. Pra testar o
  formulário de consentimento fora da UE, registrar o aparelho como dispositivo de teste em
  Privacidade e mensagens.
- `AnuncioActivity` é `exported` (o Chrome precisa entregar o intent), então qualquer app pode
  chamá-la: ela valida `tipo`, `nonce` e `uid` e fecha sem carregar nada se algo não bater.
