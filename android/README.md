# Casca Android (Capacitor)

APK que embute o build do jogo (`dist/`): roda sem site publicado e sem internet. Hoje serve para
**teste em aparelho**. O plano do `CLAUDE.md` para loja continua sendo uma casca fina (TWA) sobre o
site publicado; quando ela existir, decidir se esta casca fica ou sai.

## Gerar o APK de teste

Pré-requisitos no PC (uma vez):

- JDK 21 (Temurin): `winget install EclipseAdoptium.Temurin.21.JDK`
- Android SDK em `C:\Android\Sdk`. O `local.properties` aponta para lá e não é versionado.

**Caminho com acento:** o plugin Android do Gradle recusa projeto em caminho com caractere fora do
ASCII (o "é" de `C:\Users\André`). Em vez de mover o projeto ou desligar a checagem, o build roda
por uma letra de drive temporária (`subst`), e o cache do Gradle fica em `C:\Android\gradle`:

```powershell
subst H: 'C:\Users\André\Desktop\Projetos\Code\Hora do Banho'
$env:JAVA_HOME = 'C:\Program Files\Eclipse Adoptium\jdk-21.0.13.9-hotspot'
$env:GRADLE_USER_HOME = 'C:\Android\gradle'
Set-Location H:\
npm run android:apk
subst H: /d
```

Sai em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Instalar no celular

Copiar o `app-debug.apk` para o celular (cabo, Drive, WhatsApp para si mesmo), abrir pelo
gerenciador de arquivos e permitir "instalar apps desconhecidos" para o app que abriu o arquivo.

## O que a casca faz

- Paisagem travada (`sensorLandscape`) e tela cheia imersiva (`MainActivity`).
- Ícone e splash gerados da arte da home (provisórios, até haver ícone de verdade).
- APK de **debug**: assinado com a chave de debug do PC. Não serve para a Play Store; release exige
  chave de upload (ver `CLAUDE.md`, Lojas e anúncios).
