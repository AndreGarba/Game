# Kit de partida para um jogo novo

> **Hora do Banho, 02/11/2026:** estes PRDs foram movidos para `PRD/kit-the-immortal/` e são só
> referência. O `CLAUDE.md` e o `LICOES-LOJAS-E-ANUNCIOS.md` citados abaixo continuam na raiz do
> projeto; o `.github/` também.

Arquivos tirados do THE IMMORTAL (`GAS-games-br/theimmortal`, commit `fa60fcb`, 01/11/2026).
Ficou de fora tudo que é regra de corrida/F1. O que está aqui vale para qualquer jogo
web mobile com app nas lojas, login, ranking e anúncios.

**Comece por:** `LICOES-LOJAS-E-ANUNCIOS.md` e `CLAUDE.md`.

## Raiz

| Arquivo | Para que serve |
| --- | --- |
| `LICOES-LOJAS-E-ANUNCIOS.md` | **Novo.** Tudo o que aprendemos com lojas e AdMob e que só existia em commits, mais um checklist de lançamento. |
| `CLAUDE.md` | Manual do Claude Code pronto para o jogo novo, sem IDs nem regras do motor do IMMORTAL. Preencha os `[colchetes]`. A seção **Motor do jogo** fica para as regras do motor novo, quando ele for definido. |
| `.github/pull_request_template.md` | Modelo de PR. Copie direto. |

## lojas-e-apps/

| Arquivo | Para que serve |
| --- | --- |
| `PRD-publicacao-app-stores.md` | Plano original de PWA → Play/App Store via PWABuilder. Os checkboxes estão vazios: é o plano, não o que funcionou (isso está em `LICOES`). |
| `android-README.md` | Casca TWA: chave de upload, Play App Signing, `assetlinks.json`, workflow de envio, avaliação nativa, AdMob. O mais completo. |
| `ios-VALIDACAO-LOGIN-E-LAYOUT.md` | Login Google/Apple e layout no iPhone dentro do WKWebView. |
| `PRD-sign-in-with-apple-nativo-ios.md` | Por que e como fazer Sign in with Apple (guideline 4 da Apple). |
| `PRD-suporte-offline-minimo.md` | Offline mínimo para passar na guideline 4.2 da Apple. |

## monetizacao/

| Arquivo | Para que serve |
| --- | --- |
| `PRD-reroll-recompensado.md` | Anúncio recompensado com validação no servidor (SSV) e nonce. **Desatualizado** nas regras de intersticial e formato; vale o `LICOES`. |
| `PRD-paginas-de-conteudo-adsense.md` | Páginas de conteúdo para o site ser aprovado no AdSense. |
| `PRD-membro-assinatura-e-ranking-premiado.md` | Assinatura em web/Android/iOS com um único direito (entitlement) no Supabase, e o cuidado jurídico de ranking com prêmio. Ainda proposta. |

## arquitetura-e-backend/

| Arquivo | Para que serve |
| --- | --- |
| `PRD-arquitetura-fronteiras.md` | Motor do jogo puro e determinístico, dependências numa direção só, lint que garante isso. |
| `PRD-backend-sorteio-ranking.md` | Ranking que não confia no cliente: o app manda decisões, o servidor recalcula o resultado. Versões de regras, rate limit, Turnstile. |
| `PRD-auth-anonima-e-upgrade-conta.md` | Jogar sem conta e virar conta depois sem perder o progresso. |

## sistemas-e-ux/

| Arquivo | Para que serve |
| --- | --- |
| `PRD-telas-de-erro.md` | Mapa de erros e como mostrar cada um ao jogador. |
| `PRD-internacionalizacao-i18n.md` | pt/en/es desde o começo (fazer depois custou caro). |
| `PRD-sistema-xp.md` | Progressão por XP e níveis, com as lições de balanceamento (bola de neve). |
| `PRD-modal-conquista-desbloqueada.md` + `DESIGN-modal-conquista-desbloqueada.md` | Conquistas: regra e desenho do aviso. |

## O que fazer diferente no jogo novo (opinião)

1. Escrever o `CLAUDE.md` no dia 1, já com as seções de lojas e anúncios. No IMMORTAL elas
   nunca entraram.
2. i18n, voltar nativo e telas por pasta (`Tela.tsx` + `tela.css`) desde a primeira tela.
3. Decidir cedo o `WKAppBoundDomains` no iOS: anúncio e offline brigam ali.
4. Toda migration e toda Edge Function versionadas no repo antes de ir pro ar.
