# Preparação do reroll recompensado

O primeiro novo sorteio é gratuito. Do segundo em diante, o modo de desenvolvimento
oferece um anúncio simulado. A contagem usa as tentativas já persistidas nas rodadas,
portanto não reinicia ao trocar de rodada ou recarregar a criação.
Não concede tentativas adicionais: os limites por dificuldade e a sequência seedada
continuam intactos. Produção mantém o botão e o comportamento atuais, sem publicidade.

## Fluxo de demonstração

- O botão só habilita após a revelação, com tentativas disponíveis.
- O diálogo permite simular recompensa, cancelamento e indisponibilidade.
- Cancelar, Escape e voltar nativo fecham sem executar o sorteio.
- Recompensa confirmada executa o reroll uma vez; cliques concorrentes são bloqueados.
- Durante anúncio e requisição, a escolha de atributos fica inativa.
- Falha de rede preserva um crédito em memória enquanto a tela estiver montada.
  O próximo clique repete somente o sorteio. Atualizar/sair da tela perde esse crédito.

## Anúncio real (26/10/2026)

O anúncio é nativo do AdMob, mostrado pela casca Android por cima do TWA — o SDK H5 foi
descartado porque o app aprovado no AdMob só monetiza com o SDK nativo.

- **Quem mostra:** `BotaoNovoSorteio` escolhe entre o anúncio real (casca com
  `?anuncios_nativos=1`), a demonstração (dev server) e o botão simples (web e casca antiga).
- **Ida:** `intent://anuncio?tipo=recompensado&nonce=…&uid=…` → `AnuncioActivity`
  (`android/`), que roda o consentimento UMP e mostra o anúncio.
- **Volta:** sem resultado direto (o TWA não tem canal de volta). O AdMob chama a Edge Function
  `admob-ssv` com o nonce (validação no servidor, assinatura ECDSA do Google), e a página consulta
  o nonce na `recompensa-anuncio` quando volta a ficar visível — por até 20 s, com
  "Confirmando recompensa…". Tempo esgotado é `pendente`, não `cancelado`: o crédito aparece na
  próxima abertura da tela, quando o callback atrasado chegar.
- **Nonce:** 128 bits, 10 min, preso a `(seed, ordem do reroll pago)` — uma recompensa vale pra
  um reroll de um sorteio. Não há conta durante a criação, então não há JWT pra amarrar.
- **Servidor:** com `app_config.reroll_exige_anuncio` ligado, `sortear` recusa o 2º e o 3º reroll
  sem nonce recompensado (`402 ANUNCIO_NECESSARIO`). **Desligado (padrão), nada muda.**

**Decisão pendente antes de ligar a chave:** a web sem a casca não tem como assistir. Ligada, quem
joga no navegador perde o 2º e o 3º reroll. Ligar só depois de a versão da casca com anúncio
estar publicada, e decidindo se isso vale pra web.

## Intersticial "Entre corridas"

No "Continuar" do fim da rodada, por cima do hub. Máximo 1 a cada 3 corridas, 3 min de intervalo,
nunca nos 3 min depois de um recompensado, nunca na primeira sessão do dia, nunca ao fechar o app
nem na criação de piloto. Regra em `src/features/anuncios/regraIntersticial.ts`.

## Regra de produto (revista em 26/10/2026)

- **1 reroll grátis por janela de tempo, por aparelho** — não mais "o primeiro de cada carreira".
  A janela é `app_config.reroll_gratis_janela_horas` (padrão **24**, virando à meia-noite de
  Brasília; 6 = 00h/06h/12h/18h), editável no Table Editor sem deploy.
- Os demais rerolls da carreira são com anúncio. Quem já usou o grátis do dia paga os 3.
- Teto de **3 rerolls por carreira**, como antes; ampliar exige revisão do servidor.
- Nunca 2 grátis na mesma carreira, nem se a janela virar no meio da criação — é também o teto
  do servidor (`sortear/anuncios.ts`), que aceita no máximo 1 reroll sem anúncio por seed.
- A janela é contada no cliente (`localStorage`): a criação roda sem conta, então não há
  identidade confiável pra contar no servidor. Apagar os dados do app devolve o grátis do dia;
  o servidor continua impedindo mais de 1 grátis por carreira.
- Regra em `src/features/criacao/rerollGratis.ts`.
