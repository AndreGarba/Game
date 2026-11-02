# Lições de lojas e anúncios (aprendidas no THE IMMORTAL, out/nov 2026)

Estas lições estavam espalhadas em commits e PRs, sem documento próprio. Cada item diz o que
quebrou, por quê e a regra que fica. Referências (#nnn) são PRs do repositório
`GAS-games-br/theimmortal`.

## Arquitetura que funcionou

- **Jogo web + casca nativa fina.** O jogo é um PWA (site instalável). A Play recebe uma casca
  TWA (Trusted Web Activity, gerada pelo PWABuilder); a App Store recebe uma casca WKWebView.
  Mudança no jogo vai pro ar com o deploy do site, sem nova versão na loja. Versão nova de loja
  só quando muda a casca: ícone, permissões, SDK nativo, integração nova.
- **Anúncio é nativo, não web.** O AdMob só monetiza o app aprovado com o SDK nativo; o SDK H5
  foi descartado. O site pede o anúncio à casca e a casca mostra por cima do jogo.
  - Android: o site navega pra `intent://anuncio?...` → `AnuncioActivity`. Não há canal de volta:
    o resultado chega pelo servidor (SSV, abaixo) e a página consulta quando volta a ficar visível.
  - iOS: ponte JS `mostrarAnuncio` que devolve uma Promise resolvida quando o anúncio fecha (#333, #334).
- **A casca avisa o site o que ela sabe fazer** por query string na abertura
  (`?anuncios_nativos=1`, `?avaliacao_nativa=1`, `notificacoes_nativas=1`, `privacidade_ads=1`).
  Casca antiga não manda nada e o site cai no comportamento antigo. Nunca presuma a capacidade.

## Recompensa só no servidor (SSV)

- **Nada é concedido no aparelho.** O site cria um nonce (128 bits, 10 min, preso ao contexto da
  recompensa), passa pra casca, e o AdMob chama uma Edge Function (`admob-ssv`) com o nonce. Ela
  confere a assinatura ECDSA do Google e grava. O site só lê o nonce.
- **O bloco de anúncio (ad unit) precisa estar na lista da função SSV.** Bloco que não está na
  lista é ignorado em silêncio: o jogador assiste e não ganha nada. Aconteceu 3 vezes (#320,
  #331, e o bloco Android `…/4744676664` no #375). Regra: **bloco novo no AdMob = PR que adiciona
  o ID na lista do SSV, antes de publicar a casca.** O ID vira constante no código, não variável
  de ambiente: não é segredo (vai no app) e assim passa por revisão.
- **Logar todo callback ignorado, com o motivo** (#319). Sem isso o desencontro é invisível.
- **Tempo esgotado esperando o callback é "pendente", não "cancelado".** O crédito aparece na
  próxima abertura quando o callback atrasado chegar.
- Funções chamadas pelo Google ou por cron rodam com `verify_jwt: false` e se defendem por
  assinatura/segredo. Redeploy com o default `true` quebra tudo sem erro visível.

## Formatos e regras de exibição

- **Intersticial premiado (`RewardedInterstitialAd`) exige uma tela de aviso antes**, com opção
  de recusar. Regra do formato do Google (#367).
- Ao trocar de formato, trocar também os **IDs de teste** do build Debug pros do formato novo.
- **Primeira carreira/partida do aparelho sem anúncio** (#366). Jogador antigo é marcado como
  veterano pra não ganhar uma partida inteira sem anúncio depois da atualização.
- Intersticial com frequência baixa e previsível. "1 a cada 3 corridas" virou anúncio toda hora
  quando o jogo ficou mais rápido; hoje é sorteio de 50% por carreira, no máximo 2 (#374).
  Regra de frequência deve contar por partida/sessão, não por ação que pode ficar mais rápida.
- Recompensas cosméticas (capacetes) por N anúncios, com o progresso na conta, no servidor (#346).
  Na web, sem anúncio, o sheet explica que o desbloqueio é no app.
- Mensagem ao jogador nunca mostra o motivo técnico ("código 3: No ad to show"); o motivo vai
  pro console (#344). Durante o diagnóstico, mostrar o motivo ajudou a achar o bug do iOS.

## Consentimento e privacidade

- **UMP** (formulário de consentimento do Google) antes do primeiro anúncio onde a lei exigir.
  Criar as mensagens em AdMob → Privacidade e mensagens. Um item "Privacidade de anúncios" no
  Perfil reabre o formulário.
- **iOS: ATT** (pedido de rastreamento da Apple) também antes do anúncio (#333).
- Política de privacidade atualizada a cada dado novo coletado (notificações: #326).

## Armadilhas do iOS (WKWebView)

- **`WKAppBoundDomains` bloqueia o AdMob.** Com a lista declarada, o WebKit impede injeção de
  script em todo WKWebView do app, inclusive o do SDK de anúncio. Sintoma: anúncio morre em
  "tempo esgotado" depois do consentimento. Tirar a lista resolveu, mas **o iOS perdeu o cache
  offline (Service Worker)** dentro do app (#337). Decida isso no dia 1 do próximo jogo.
- Build Release falha se faltar algum secret `ADMOB_IOS_*` (de propósito: nunca publicar com ID
  de teste ou sem anúncio sem perceber).
- Push no iOS via Firebase: só liga com o `GoogleService-Info.plist` real (#321).
- Revisão da Apple: guideline 4.2 (minimum functionality: push + offline ajudam), guideline 4
  (Sign in with Apple obrigatório se houver login social), 5.1.2 (consentimento de dados em
  ranking público). Ver os PRDs desta pasta.
- Testar sempre em aparelho físico via TestFlight; o simulador não pega metade disso.

## Armadilhas do Android (TWA)

- **`window.open` pro próprio domínio reabre o app** em vez da página (o domínio inteiro é app
  link). Páginas do próprio site abrem na mesma janela dentro do app (#317).
- `assetlinks.json` precisa das duas impressões digitais: a chave do Google (Play App Signing) e
  a de upload. Pacote regerado com chave nova faz a barra de URL voltar a aparecer.
- Regerar a casca no PWABuilder sempre com **Signing key: None**; a assinatura é do workflow.
- Android 13+: pedir `POST_NOTIFICATIONS` pela janela nativa na primeira abertura, e não repetir
  o pedido com um sheet web logo depois (#312, #318).
- In-App Review: a Play pode não mostrar a janela e não avisa. Se o fluxo voltar em < 1,5 s,
  abrir a página da loja.

## Lojas e distribuição

- Página `/baixar` que manda iOS pra App Store e Android pra Play, com `utm` (#362).
- Coletar números diários das lojas e do AdMob num banco (Edge Functions + cron) desde o
  lançamento; sem histórico não há como medir nada depois.
- Reservar 2–3 semanas de buffer antes da data de lançamento pra rejeições da Apple.

## Checklist de lançamento (resumo prático)

1. PWA: Service Worker ativo em produção (conferir no DevTools, não só no código), manifest com
   `screenshots`, ícones 192/512/maskable, `prefer_related_applications: false`.
2. Contas: Google Play (US$ 25 único), Apple Developer (US$ 99/ano), AdMob, Firebase.
3. Android: casca TWA, Play App Signing, chave de upload em 2 cofres, `assetlinks.json`,
   workflow de envio, IARC.
4. iOS: casca WKWebView, decidir `WKAppBoundDomains` x anúncios, Sign in with Apple, push,
   offline mínimo, ATT, TestFlight em aparelho real.
5. Anúncios: blocos criados → IDs na lista do SSV → secrets nas cascas → UMP configurado →
   teste com IDs de teste → publicar.
6. Privacidade: política publicada cobrindo anúncios, notificações e conta.
