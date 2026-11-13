# Casca Android (Kotlin + WebView)

Casca nativa fina: uma `MainActivity` com `WebView` que carrega o site do jogo. Mudança no jogo
vai pro ar com o deploy do site; versão nova na Play só quando a casca muda.

**Jogo novo:** troque o `applicationId`/`namespace` e a `origemProducao` em `app/build.gradle.kts`,
mova o pacote `com.example.game` para o do jogo, troque o `app_name` em `res/values/strings.xml`,
o `rootProject.name` em `settings.gradle.kts` e os ícones `res/mipmap-*` (os atuais são um quadrado
provisório). O `applicationId` não muda depois da primeira publicação na Play.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `app/build.gradle.kts` | Sabores, origens permitidas (`BuildConfig`), versão |
| `gradle/libs.versions.toml` | Versões das bibliotecas |
| `MainActivity.kt` | WebView, splash, voltar, tela cheia, tela de erro, ciclo de vida |
| `ClienteWeb.kt` | Só a origem do jogo roda dentro; o resto abre em Custom Tab. Renderizador perdido recria a tela |
| `ClienteChrome.kt` | Tela cheia de vídeo e console (só em debug) |
| `Origens.kt` | Compara origem por esquema + host + porta |

## Sabores

| Sabor | Carrega | Para quê |
| --- | --- | --- |
| `producao` | `https://game-template.example.workers.dev/` (placeholder) | O único que vai pra Play |
| `local` (só debug) | o `dist/` dentro do APK, em `https://appassets.androidplatform.net/` | Jogar sem site e sem internet, testar um build que ainda não foi publicado |

O sabor `local` tem `applicationId` com `.local` no fim: instala ao lado do de produção.

## Gerar o APK

Pré-requisitos (uma vez):

- JDK 21 (Temurin): `winget install EclipseAdoptium.Temurin.21.JDK`
- Android SDK com a plataforma `android-36`. O `local.properties` aponta para ele e não é
  versionado.

**Caminho com acento (Windows):** o plugin Android do Gradle recusa projeto em caminho com
caractere fora do ASCII (o "é" de `C:\Users\André`). Em vez de mover o projeto ou desligar a
checagem, rode o build por uma letra de drive temporária (`subst`), com o cache do Gradle fora do
perfil:

```powershell
subst H: '<caminho do projeto>'
$env:JAVA_HOME = '<pasta do JDK 21>'
$env:GRADLE_USER_HOME = 'C:\Android\gradle'
Set-Location H:\
npm run android:apk          # produção: android/app/build/outputs/apk/producao/debug/
npm run android:apk:local    # local:    android/app/build/outputs/apk/local/debug/
subst H: /d
```

O `android:apk:local` roda `npm run build` antes, porque o sabor local empacota o `dist/`.

## Instalar no celular

Copiar o APK para o celular (cabo, Drive, mensagem para si mesmo), abrir pelo gerenciador de
arquivos e permitir "instalar apps desconhecidos" para o app que abriu o arquivo. Com cabo e
depuração USB: `adb install -r <apk>`.

Para inspecionar a página dentro do app (só builds de debug): `chrome://inspect` no Chrome do PC.

## O que a casca faz hoje

- Paisagem (`sensorLandscape`) e tela cheia imersiva; usa a área do recorte da câmera.
- Splash do sistema na cor da abertura (`#f8f7fa`) até a página carregar, no máximo 4 s.
- Voltar: fecha a tela cheia de vídeo, depois `goBack()` se houver histórico, senão o padrão do
  sistema. Entregar o voltar ao site (pausa, fim de partida) exige uma ponte JS↔nativo, que ainda
  não existe.
- Sem internet na primeira abertura: tela "Sem conexão" (pt/en/es) com "Tentar de novo". Depois
  da primeira visita, o service worker do site segura o offline.
- Backup do Android leva só o `localStorage` da WebView (recorde e preferências), sem caches. O
  IndexedDB (id anônimo do ranking) fica de fora de propósito.
- Ícone provisório: quadrado na cor do jogador do jogo de exemplo.

## CI e publicação

O job `android` do CI compila `assembleProducaoDebug`, `bundleProducaoRelease` (sem assinatura) e
roda o lint. Assinatura com a chave de upload e envio à Play ainda não existem; quando existirem,
a chave fica fora do repo e publicar continua manual.
