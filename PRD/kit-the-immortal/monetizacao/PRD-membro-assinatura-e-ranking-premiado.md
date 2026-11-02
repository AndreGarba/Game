# PRD — Membro IMMORTAL (assinatura) + Ranking premiado

**Status:** proposta · **Data:** 31/10/2026 · **Autor:** Zé (Claude) para o Wag
**Escopo:** assinatura "Membro" na web, no Android (TWA) e no iOS (casca WKWebView), entitlement
único no Supabase, tela "Seja Membro", ajustes na tela de ranking e premiação semanal/mensal.

> **Leia a seção 2 antes de tudo.** Premiar o ranking com algo de valor real e exigir assinatura
> para concorrer tem implicação legal no Brasil e choca com regra das duas lojas. O PRD foi
> desenhado para a gente lançar o Membro já e deixar o prêmio de valor real atrás de uma chave,
> liberada só depois do parecer jurídico.

---

## 1. Contexto e objetivo

A ideia do Wag: premiar o 1º do ranking do mês com um prêmio maior e dar prêmios menores para os
melhores da semana. Para concorrer, o jogador precisa ser **membro** (assinatura). O ranking passa
a mostrar quem é membro e quem não é.

Objetivos:

1. Criar receita recorrente que não depende de anúncio.
2. Dar ao ranking um motivo forte para voltar toda semana.
3. Fazer isso de um jeito seguro — para o jogador (pagamento pelas lojas e por gateway confiável)
   e para a GAS Games (regra das lojas, lei de promoções, fraude no score).

Estado atual relevante (investigado no repo `main@d0815fd` e no banco em 31/10/2026):

- **Não existe nada de assinatura/IAP/pagamento** no repo nem no banco. Só AdMob (recompensado +
  intersticial, `PRD-reroll-recompensado.md`).
- Ranking: `src/features/ranking/RankingScreen.tsx`, abas **Mês · Semana · Por carreira**
  (`SegmentedControl`), "Dia" oculta por `app_config.ranking_diario_visivel`. Dados só por RPC no
  schema `jogadores` (`ranking_agregado`, `ranking_por_carreira`, `ranking_vizinhanca`,
  `minha_posicao_no_recorte`, `minha_posicao_no_ranking`). Linhas com `DriversTable variante="ranking"`.
- Mês/Semana **somam todas as carreiras** do período (já existe conta com 90 carreiras).
- Rivais simulados (`jogadores.rivais_ranking`, 40 rivais) entram abaixo do 1º real em Mês/Semana,
  controlados por `app_config.rivais_ativos` e `rivais_visiveis`.
- Só conta não anônima entra no ranking (1.669 usuários: 1.502 anônimos, 167 com conta).
- Score gravado pela edge function `validar-ranking` → RPC `jogadores.registrar_ranking`
  (service_role). **Hoje o score é fraudável** — ver seção 6.
- **Seed semanal compartilhada não existe** (cada carreira tem seed própria; tabela `temporadas`
  proposta no `PRD-backend-sorteio-ranking.md` não foi criada).
- Casca Android (`android/`, TWA do PWABuilder) já tem Activities nativas chamadas por
  `intent://` (padrão do `AnuncioActivity`). Casca iOS (`ios/IMMORTAL/`) já tem pontes JS↔Swift
  com `WKScriptMessageHandlerWithReply` (`Anuncios.swift`, `autenticarApple` etc.), limitadas ao
  documento principal em `theimmortal.com.br`. As duas cascas são extensíveis para cobrança.

---

## 2. Bloqueio legal e de loja (decidir antes de premiar)

### 2.1 O que pesa contra "pagar para concorrer a prêmio"

| Frente | O que diz | Efeito no modelo "só membro concorre" |
|---|---|---|
| **Lei 5.768/71 + Portaria SPA/MF nº 1.818/2026** (em vigor desde 29/06/2026) | Distribuição de prêmio em sorteio, vale-brinde, concurso ou operação assemelhada exige autorização prévia da Secretaria de Prêmios e Apostas (SPA/MF). A exceção (concurso exclusivamente cultural, artístico, desportivo ou recreativo) só vale **sem sorte, sem pagamento e sem vínculo com compra de serviço**. | Prêmio condicionado a assinatura sai da exceção → **precisa de autorização da SPA**. Multa de até 100% do valor dos prêmios, suspensão e proibição por até 2 anos. |
| **Google Play** — política de jogos, concursos e apostas com dinheiro real | Não permite apps que deixem o usuário "participar usando dinheiro real" para ganhar prêmio, fora dos programas de apostas licenciadas. | Assinatura que dá direito a disputar prêmio = participar com dinheiro real. **Risco alto de remoção do app.** |
| **Apple** — diretriz 5.3 | Concurso precisa ser patrocinado pelo desenvolvedor, ter regulamento oficial no app e deixar claro que a Apple não patrocina. Jogo de habilidade com dinheiro real exige licença e geo-restrição (5.3.4). | Pago para concorrer tende a cair em 5.3.4. Há caso recente (mai/2026) de app **gratuito** de palpites com prêmios rejeitado por 5.3.4. |
| **Lei 14.790/2023 (apostas)** | Regula apostas de quota fixa e só permite operadores licenciados. | Pagar para concorrer a prêmio em dinheiro pode ser lido como aposta. Ponto para o advogado. |
| **Sorte no jogo** | O sorteio de lendas e a simulação têm aleatoriedade, e hoje cada carreira tem seed própria. | Enfraquece o argumento "concurso de habilidade" até para o modelo gratuito. A seed semanal compartilhada (seção 7.4) ajuda. |

**Conclusão:** o modelo exatamente como está na ideia (só membro concorre a prêmio de valor) é o
mais arriscado nas três frentes ao mesmo tempo. Não é impossível, mas exige advogado,
autorização da SPA pela GAS Games e, provavelmente, deixar a premiação só na web.

> **Emenda 31/10/2026 — intenção confirmada pelo Wag.** A assinatura é de **benefícios**
> (capacete diferente, selo de membro etc.) e quem é membro também participa da premiação do
> ranking. O prêmio **não é dinheiro**. Isso coloca a proposta no **modelo C** quando o prêmio for
> digital ou de reconhecimento, sem precisar do gate G0. O gate continua valendo só se o prêmio for
> um **bem ou experiência com valor de mercado** (camiseta, miniatura, ingresso, produto), porque
> a lei de promoções e as lojas olham para "precisa assinar para concorrer + prêmio com valor",
> seja dinheiro ou não. Tipo de prêmio: decisão em aberto nº 3.
>
> **Emenda 31/10/2026 — prêmios definidos (parcial).** A maior parte é digital/reconhecimento:
> **Hall da Fama, capacete de campeão, selo de campeão do mês e destaque nas redes** → modelo C,
> sem gate. O vencedor do mês também ganharia **uma miniatura (Evo Design) da McLaren do Senna**.
> Esse item é físico, com valor de mercado → **passa pelo gate G0** se for só para membros. Saídas:
> (1) parecer do advogado / autorização da SPA antes de anunciar; ou (2) a miniatura vira um prêmio
> aberto a qualquer conta (ex.: maior pontuação do mês no Geral, com a regra de estamina da seção
> 3.1), e a Liga dos Membros fica com os prêmios digitais. Na comunicação dentro do app e nas
> lojas, citar o prêmio sem usar marca registrada (McLaren, Senna) até confirmar com o advogado —
> mesma linha da decisão de não usar marcas reais nos metadados.

### 2.2 Três modelos possíveis

| Modelo | Como funciona | Risco | Observação |
|---|---|---|---|
| **A — Só membro concorre a prêmio de valor** (ideia original) | Liga premiada fechada para assinantes. | **Alto** (SPA + Google + Apple) | Só com parecer jurídico e autorização da SPA. Mesmo assim, as lojas podem barrar. |
| **B — Prêmio de valor aberto a qualquer conta; membro ganha benefícios** | Todo jogador com conta concorre de graça. Membro tem selo, cosméticos, sem intersticial, estatísticas. | **Médio** | Sem pagamento → pode caber na exceção do concurso recreativo, mas a aleatoriedade precisa ser avaliada. A Apple ainda pode pedir explicação (5.3). |
| **C — Liga dos Membros com recompensa sem valor econômico** | Liga fechada para membros, mas o prêmio é destaque: selo de campeão, capacete exclusivo, card no Instagram/WhatsApp, Hall da Fama. | **Baixo** | Lança rápido. Não é distribuição de prêmio com valor de mercado. |

**Recomendação:** lançar o **Membro + Liga dos Membros no modelo C** e, em paralelo, levar A e B
ao advogado. A arquitetura abaixo atende os três: a mudança entre eles é configuração
(`app_config`), não código novo.

Chaves propostas em `public.app_config`:

- `membro_ativo` (bool) — liga a venda e a tela "Seja Membro".
- `liga_membros_ativa` (bool) — mostra a visão "Liga" nas abas Semana/Mês.
- `liga_exige_membro` (bool) — `true` = modelos A/C; `false` = modelo B.
- `premio_valor_real_ativo` (bool) — **só liga após parecer jurídico (gate G0)**.
- `liga_top_n_carreiras` (int, padrão 5) — quantas carreiras contam por período (seção 7.2).

### 2.3 Princípio de produto que não se negocia

**Membro nunca ganha vantagem competitiva.** Nada de reroll extra, atributo, XP ou carreira a
mais que mexa no score. Pagar para pontuar mais transformaria a Liga em "pay-to-win", agravaria o
enquadramento como aposta e quebraria a filosofia anti-grind do jogo (`boostTitulo.ts`).

---

## 3. Proposta de produto: o que é ser Membro

### 3.1 Benefícios (versão 1)

| Benefício | Competitivo? | Custo de implementar |
|---|---|---|
| Disputa da **Liga dos Membros** (semanal e mensal) | Não — é o acesso ao torneio, não pontos | Médio |
| **Selo MEMBRO** no ranking e no perfil | Não | Baixo |
| **Sem anúncios** — intersticial e recompensado (emenda 31/10/2026) | Não (ver abaixo) | Baixo (`regraIntersticial.ts`, `BotaoNovoSorteio`) |
| **Estamina cheia** (futuro, quando a estamina existir) | Ver emenda abaixo | — |
| **Capacete exclusivo de membro** (e um por título de Liga) | Não | Médio (asset) |
| **Estatísticas avançadas** da carreira e histórico completo | Não | Médio |

O reroll recompensado continua igual para todos (ele mexe no resultado da carreira).

> **Emenda 31/10/2026 — sem anúncios e estamina.**
>
> - **Membro não vê nenhum anúncio.** No reroll recompensado, o membro recebe a recompensa
>   direto, sem assistir, mas com **os mesmos limites** de quem assiste (teto de 3 rerolls por
>   carreira e regras do `sortear`). Assim pular o anúncio é conveniência, não vantagem: o não
>   membro chega ao mesmo número de rerolls assistindo. No servidor, `sortear` aceita o reroll
>   pago quando `eh_membro(uid)` for verdadeiro, no lugar do nonce do anúncio.
> - **Estamina cheia para membro (futuro).** Dentro da Liga não desequilibra, porque todos que
>   disputam são membros. Mas, se algum prêmio for aberto a não membros (modelo B), estamina
>   ilimitada vira vantagem competitiva paga e o prêmio volta a ficar arriscado. Regra: prêmio
>   aberto a todos ⇒ a pontuação desse prêmio só conta carreiras até o limite de estamina de um
>   jogador comum no período. Detalhar no PRD da estamina.
> - Para as lojas, assinatura que remove anúncios e dá cosméticos é um modelo comum e aceito,
>   desde que vendida pelo IAP/Play Billing (seção 4) e com a tela de compra completa (seção 8).
>   Isso não resolve a questão do prêmio físico, que é separada (seção 2, emenda do prêmio).

### 3.2 Plano e preço (sugestão — decisão do Wag)

- **Mensal**, porque casa com o ciclo do ranking mensal. Anual fica para depois.
- **Sugestão: R$ 9,90/mês** (há esse ponto de preço na App Store e no Google Play). Mesmo preço
  em todas as plataformas no lançamento, para não criar comparação dentro do app.
- Sem período grátis na v1 (evita gente assinando só para disputar uma semana e cancelando).

### 3.3 Exige conta

A assinatura fica presa ao `auth.uid()` de uma conta **não anônima** (Google, Apple ou e-mail),
porque o benefício principal (Liga) é baseado em conta e porque precisa sobreviver a troca de
aparelho. Fluxo: jogador anônimo toca em "Assinar" → tela de criar conta/login existente
(`src/features/auth/`) → volta para a tela de Membro.

---

## 4. Arquitetura de pagamentos por plataforma

### 4.1 Regra de ouro

Cada plataforma vende **só pelo seu próprio meio**, e o status de membro é **um só** no Supabase:

```
            ┌───────────────┐   ┌────────────────┐   ┌──────────────────┐
  iOS app → │ StoreKit 2    │   │ Play Billing   │ ← │ Android app (TWA)│
            └──────┬────────┘   └───────┬────────┘   └──────────────────┘
                   │ JWS da transação   │ purchaseToken
                   ▼                    ▼
        ┌───────────────────────────────────────────┐      ┌───────────┐
        │ Edge functions (verificam no servidor)    │ ◄─── │ Asaas     │ ← navegador
        │ + notificações das lojas / webhook Asaas  │      │ (cartão + │
        └───────────────────┬───────────────────────┘      │ Pix Aut.) │
                            ▼                              └───────────┘
               jogadores.assinaturas  →  jogadores.eh_membro(uid)
                            ▼
           RPCs do ranking e do app leem "membro: true/false"
```

- **No app iOS:** só compra pela Apple. Nada de preço da web nem link para o site.
- **No app Android:** só Google Play Billing (obrigatório para bem digital vendido na Play).
- **No navegador:** checkout web.
- Quem assinou numa plataforma é membro em todas (a Apple permite acessar no app algo comprado
  fora, desde que o app não direcione para a compra externa).

### 4.2 Taxas (referência de out/2026 — confirmar nos consoles)

| Plataforma | Meio | Taxa da plataforma |
|---|---|---|
| iOS (loja Brasil) | Apple In-App Purchase | **10% + 5% de processamento = 15%** no Small Business Program (e em assinaturas após o 1º ano). Fora do programa: 21% + 5%. |
| iOS (loja Brasil) | Link para pagar no site | 10% (Small Business) + taxa do gateway. Proibido para menores de 18 → **não vale a pena para nós**, ficamos no IAP. |
| Android | Google Play Billing | Taxa de serviço da Play para assinaturas (15% — confirmar no Play Console). Faturamento alternativo dentro do app ainda não está disponível no Brasil. |
| Web | Asaas (ou Mercado Pago) | Só a taxa do gateway (Pix e cartão — ver tabela do gateway). |

**Ação manual (Wag):** inscrever a conta Apple no **App Store Small Business Program** antes de
vender. Sem isso a taxa sobe para 26%.

### 4.3 iOS — StoreKit 2 na casca

- Nova ponte Swift **`Assinatura.swift`** em `ios/IMMORTAL/`, no mesmo molde do `Anuncios.swift`
  (`WKScriptMessageHandlerWithReply`, aceita só o documento principal em `theimmortal.com.br`).
- Mensagens expostas ao JS (`window.webkit.messageHandlers.<nome>.postMessage(...)` → Promise):
  - `assinaturaProdutos` → lista de produtos (`Product.products(for:)`), com preço formatado.
  - `assinaturaComprar({ produtoId, appAccountToken })` → `product.purchase(options:
    [.appAccountToken(uuid)])`; devolve a **transação assinada (JWS)** ou `cancelada` / `pendente`.
  - `assinaturaRestaurar` → `AppStore.sync()` + `Transaction.currentEntitlements`.
  - `assinaturaGerenciar` → `AppStore.showManageSubscriptions(in:)`.
- `appAccountToken` = o próprio `user_id` (UUID do Supabase). É isso que amarra a compra à conta.
- A casca também escuta `Transaction.updates` ao abrir o app e repassa transações novas ao JS.
- A página envia o JWS para a edge function `assinatura-apple`, que **verifica a assinatura no
  servidor** (cadeia de certificados da Apple / App Store Server API) antes de gravar.
- **App Store Server Notifications V2** apontando para a edge function `apple-notificacoes`
  (renovação, cancelamento, reembolso, cobrança falhou, expirou).
- Sem Mac: o build segue pelo `.github/workflows/ios-release.yml`; teste no iPhone via TestFlight
  com conta Sandbox. Incluir capability **In-App Purchase** no app (App Store Connect + entitlements
  conferidos no workflow).
- Exigências da Apple na tela de compra (3.1.2): nome do plano, duração, preço, renovação
  automática, botão **Restaurar compra**, links para **Termos de uso (EULA)** e **Privacidade**.

### 4.4 Android — Play Billing pela casca nativa

O TWA não devolve resultado direto para a página, então seguimos o padrão que já funciona no
anúncio recompensado:

- Nova **`AssinaturaActivity`** em `android/app/src/main/java/br/com/theimmortal/twa/`, usando a
  **Play Billing Library** direto (mais previsível que a Digital Goods API dentro do TWA e igual
  ao modelo do `AnuncioActivity`).
- **Ida:** `intent://assinatura?acao=comprar&produto=membro_mensal&conta=<hash>` →
  Activity abre o fluxo da Play com `setObfuscatedAccountId(<hash do user_id>)`.
- **Volta:** a Activity envia o `purchaseToken` para a edge function `assinatura-google` (com o
  hash da conta) e fecha. A página, ao voltar a ficar visível, consulta `minha_assinatura()` por até
  20 s ("Confirmando assinatura…"). Esgotou = `pendente`, não erro — igual ao recompensado.
- Servidor: `assinatura-google` valida o token em `purchases.subscriptionsv2.get` (Google Play
  Developer API, conta de serviço), **reconhece a compra (acknowledge)** em até 3 dias e grava.
- **RTDN** (notificações em tempo real) via Pub/Sub com push para a edge function `google-rtdn`.
- "Restaurar": a Activity faz `queryPurchasesAsync` e reenvia os tokens ativos.
- "Gerenciar": abre `https://play.google.com/store/account/subscriptions?sku=membro_mensal&package=br.com.theimmortal.twa`.
- A página só mostra o botão de compra Android quando a casca anunciar suporte (novo parâmetro
  `?assinatura_nativa=1`, igual ao `?anuncios_nativos=1`). Casca antiga → esconde a venda.

### 4.5 Web — Asaas (cartão + Pix Automático)

- **Gateway sugerido: Asaas**, porque tem assinatura no cartão e **Pix Automático** (o jogador
  autoriza uma vez por QR Code e as cobranças seguintes são debitadas sozinhas), com webhooks.
  Alternativa equivalente: Mercado Pago. Stripe só se a gente quiser RevenueCat Web (seção 4.7).
- Edge function `assinatura-web-checkout`: cria cliente + assinatura no Asaas com
  `externalReference = user_id` e devolve a URL de pagamento / QR Code.
- Edge function `asaas-webhook`: valida o token do webhook, grava eventos e atualiza o status.
- Cancelar pela web: botão na tela "Gerenciar" chama `assinatura-web-cancelar`.
- Nenhum dado de cartão passa pelo nosso código (checkout hospedado do Asaas).

### 4.6 Detecção de plataforma (cliente)

Novo módulo `src/data/assinatura/plataforma.ts`:

| Sinal | Plataforma | Vende por |
|---|---|---|
| Ponte `assinaturaProdutos` disponível em `window.webkit.messageHandlers` | iOS casca | StoreKit |
| `?assinatura_nativa=1` presente (casca Android nova) | Android casca | Play Billing |
| Casca iOS/Android **sem** suporte (versão antiga) | casca antiga | **não vende**; mostra status se já for membro |
| Nenhum dos anteriores | navegador | Asaas |

### 4.7 Fazer na mão ou usar RevenueCat?

| | Próprio (Supabase) | RevenueCat |
|---|---|---|
| Verificação Apple/Google | Escrevemos as edge functions | Pronto |
| TWA Android | Funciona com a Activity | Precisa mandar o token pela API REST deles — sem ganho real |
| Web com Pix | Asaas direto | Só Stripe/Paddle — **sem Pix Automático** |
| Custo | Zero | Grátis até US$ 2,5 mil/mês de receita, depois % |
| Dependência | Nenhuma | Mais um fornecedor |

**Recomendação: próprio**, com o Supabase como fonte da verdade. O ganho do RevenueCat é menor
no nosso caso (TWA + Pix) e a lógica de entitlement é pequena.

---

## 5. Modelo de dados

```sql
-- Uma linha por assinatura externa (uma conta pode ter mais de uma, ex.: assinou na web e no iOS)
create table jogadores.assinaturas (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  plataforma        text not null check (plataforma in ('apple','google','asaas')),
  id_externo        text not null,          -- originalTransactionId | purchaseToken | id da assinatura Asaas
  produto           text not null,          -- 'membro_mensal'
  status            text not null check (status in
                      ('ativa','em_carencia','pendente','cancelada_ativa','expirada','reembolsada')),
  expira_em         timestamptz,
  renovacao_auto    boolean not null default true,
  ambiente          text not null default 'producao' check (ambiente in ('producao','sandbox')),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  unique (plataforma, id_externo)
);

-- Log bruto e imutável de tudo que chegou (notificações, webhooks, verificações)
create table jogadores.eventos_assinatura (
  id            bigint generated always as identity primary key,
  plataforma    text not null,
  id_externo    text,
  user_id       uuid,
  tipo          text not null,
  payload       jsonb not null,
  recebido_em   timestamptz not null default now()
);

-- Fonte única da verdade
create function jogadores.eh_membro(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from jogadores.assinaturas a
    where a.user_id = p_user
      and a.ambiente = 'producao'
      and a.status in ('ativa','em_carencia','cancelada_ativa')
      and (a.expira_em is null or a.expira_em > now())
  );
$$;
```

- `cancelada_ativa` = cancelou a renovação mas ainda está dentro do período pago (continua membro).
- **Nenhum GRANT de escrita** para `anon`/`authenticated`. Só as edge functions (service_role)
  escrevem. O cliente lê pela RPC `jogadores.minha_assinatura()` (status, plataforma, expira_em).
- Sandbox não conta como membro em produção (evita assinatura de teste da Apple/Google valendo).
- Contas de teste do time: liberar por `app_config.membros_cortesia` (lista de user_ids) dentro de
  `eh_membro`, para não precisar de assinatura real.
- `excluir-conta` já existente: apagar `assinaturas` em cascata e avisar o usuário para cancelar
  na loja (exclusão de conta não cancela assinatura da Apple/Google).

### Premiação

```sql
create table jogadores.premiacoes (
  id            uuid primary key default gen_random_uuid(),
  periodo       text not null check (periodo in ('semana','mes')),
  inicio        timestamptz not null,
  fim           timestamptz not null,
  posicao       int not null,
  user_id       uuid not null references auth.users(id),
  pontuacao     numeric not null,
  premio        text not null,
  status        text not null default 'apurado'
                check (status in ('apurado','auditado','desclassificado','contatado','entregue')),
  observacao    text,
  criado_em     timestamptz not null default now(),
  unique (periodo, inicio, posicao)
);
```

---

## 6. Anti-fraude — pré-requisito para qualquer prêmio

Hoje dá para inflar o score. Com prêmio em jogo, alguém vai tentar. Vetores confirmados no
código:

1. **Conquistas repetidas somam sem limite** em `validar-ranking/nucleo.ts`
   (`payload.conquistasDesbloqueadas.reduce(...)` sem deduplicar nem limitar tamanho).
2. **`legendScore` vem do cliente** — só a faixa 0–3000 é checada.
3. **Dificuldade, status e categoria vêm da linha de `carreiras`**, que o próprio jogador escreve
   (basta gravar `dificuldade='lenda'` para ganhar ×1.6).
4. **`registrar_ranking_das_carreiras`** (migração de conta) copia `carreiras.pontuacao` sem
   validar, com data vinda de `atualizado_em`, que o cliente define.
5. **Reenviar o mesmo `carreiraId`** com outra pontuação atualiza `registrado_em` para agora
   (leva carreira antiga para o mês atual).
6. **Rate limit por IP usa `x-forwarded-for`**, que o cliente forja; sem limite por conta; sem
   barreira contra várias contas.
7. **Turnstile no `validar-ranking`** está no `CLAUDE.md`, mas não existe no código.

Correções (Fase 0):

- Deduplicar conquistas e limitar à lista real de `conquistas` do banco; recalcular o bônus no
  servidor a partir de `jogadores.conquistas_desbloqueadas`, não do payload.
- Gravar **dificuldade e seed no servidor no momento do sorteio** (o `sortear` já passa por todo
  draft) e usar esse registro no `validar-ranking`, nunca a linha de `carreiras`.
- `registrado_em` só é definido na **primeira** gravação; reenvio não muda o período. Pontuação
  só pode ser regravada se for a mesma (idempotência).
- `registrar_ranking_das_carreiras` passa a reaproveitar só carreiras já validadas, ou fica fora
  da Liga.
- Rate limit por `user_id` (como `learnings.md` já recomenda) + Turnstile de verdade.
- **Auditoria do pódio antes de pagar:** re-simular no servidor (seed + decisões do jogador) as
  carreiras do Top 10 da Liga. Enquanto a Fase D do `PRD-backend-sorteio-ranking.md` não existir,
  a auditoria pode ser semiautomática (script) + manual, e o regulamento prevê desclassificação.
- Membro é pessoal: uma pessoa = uma conta na Liga (regulamento + checagem de padrão suspeito).

---

## 7. Ranking

### 7.1 Estrutura da tela

- Abas atuais mantidas: **Mês · Semana · Por carreira** (`SegmentedControl`).
- Em **Mês** e **Semana**, novo seletor secundário **Liga · Geral** (`SegmentedControl`,
  `largura="fill"`), visível só com `liga_membros_ativa`. Padrão: **Liga**.
  - **Liga:** só membros (ou todos com conta, se `liga_exige_membro = false`). **Sem rivais.**
    Topo com faixa de prêmios do período ("1º do mês: …", "Top 3 da semana: …") e link
    **Regulamento** (abre `BottomSheet` com resumo + link para a página completa).
  - **Geral:** como hoje (com rivais, se ligados), agora com o selo de membro nas linhas.
- **Por carreira:** sem mudança além do selo.

### 7.2 Pontuação da Liga

- Soma das **N melhores carreiras do período** (`liga_top_n_carreiras`, padrão 5), não de todas.
  Motivo: hoje quem joga 90 carreiras ganha por volume; com N limitado vence quem joga melhor,
  diminui o efeito de fraude por volume e respeita o anti-grind.
- Nova RPC `jogadores.ranking_liga(p_periodo, p_inicio, p_limite, p_offset)` — `security definer`,
  filtra `eh_membro`, exclui rivais, aplica top-N, desempate por quem chegou primeiro à pontuação.
- Nova RPC `jogadores.minha_posicao_na_liga(p_periodo)`.
- RPCs existentes (`ranking_agregado`, `ranking_por_carreira`, `ranking_vizinhanca`,
  `minha_posicao_*`) ganham a coluna **`membro boolean`** (via `eh_membro`).
- Viradas: as mesmas de hoje (semana: domingo 0h; mês: dia 1º 0h, horário de Brasília).

### 7.3 Linha do ranking com selo

- `DriversTable variante="ranking"` ganha prop opcional **`membro?: boolean`** no fast-ds. Visual:
  `Tag estilo="gold" destaque={false}` com "MEMBRO" (ou ícone `Star` pequeno se não couber no
  celular). **Desenhar no Figma antes** (decisão do Wag).
- Na Liga, as posições premiadas mostram ícone `EmojiEvents` ao lado da posição.
- Card "Sua posição":
  - membro → posição na Liga + quanto falta para a zona de prêmio;
  - não membro → posição no Geral + CTA "Seja membro para disputar a Liga" → tela de Membro.

### 7.4 Seed semanal compartilhada (recomendado para a Liga)

O `CLAUDE.md` (regra 1) já diz que o ranking semanal deveria ter seed compartilhada, mas ela não
existe. Para a Liga, todos receberem o mesmo sorteio de lendas na semana deixa a disputa mais
justa e reforça o argumento de habilidade (seção 2.1). Proposta: PRD próprio, implementando a
tabela `temporadas` já desenhada no `PRD-backend-sorteio-ranking.md` §4.3. Não bloqueia a v1 no
modelo C; **é recomendado antes do modelo A/B**.

### 7.5 Apuração e entrega

1. Virada do período → cron `apurar-liga` grava o Top em `jogadores.premiacoes` (`apurado`).
2. Até 48 h de auditoria (seção 6) → `auditado` ou `desclassificado` (próximo sobe).
3. Contato pelo e-mail da conta (Resend, remetente `no-reply@theimmortal.com.br`) → `contatado`.
4. Entrega → `entregue`. Prazo para o ganhador responder: definir no regulamento (ex.: 15 dias).
5. Anúncio público: tela "Campeões" (Hall da Fama) + post no Instagram/WhatsApp do jogo, com
   autorização do ganhador para usar o apelido.

O painel admin ganha uma lista de `premiacoes` com as ações acima.

### 7.6 Regulamento

Página `theimmortal.com.br/regulamento` + resumo no `BottomSheet`. Conteúdo mínimo: quem pode
participar (idade, conta, membro ou não), período e horário de corte, como a pontuação é
calculada, prêmios, auditoria e desclassificação, entrega, e (exigência da Apple) que **Apple e
Google não patrocinam nem têm envolvimento** com a promoção. Texto final revisado pelo advogado.

---

## 8. Tela "Seja Membro"

Arquivo sugerido: `src/features/membro/MembroScreen.tsx` (+ `membro-screen.css`). Rota própria.

**Pontos de entrada:** CTA no ranking, item no menu/perfil, e um convite discreto na tela final
da carreira. **Nunca** no meio de uma corrida.

**Anatomia (fast-ds):**

- `Header` com voltar.
- Topo: `LogoJogo` + título "Membro IMMORTAL" + uma linha de proposta ("Dispute a Liga dos
  Membros e jogue sem intervalos").
- Lista de benefícios (seção 3.1) com ícones do fast-ds (`EmojiEvents`, `Star`,
  `SportsMotorsports`…).
- Bloco de preço: "R$ 9,90/mês · renova automaticamente · cancele quando quiser". Preço vem da
  loja no iOS/Android (nunca escrito à mão no app).
- `Footer tipo="acoes"`: primária **"Assinar por R$ 9,90/mês"**; secundária **"Restaurar compra"**
  (só iOS/Android).
- Texto legal pequeno com links: Termos de uso, Privacidade, Regulamento da Liga.

**Estados:**

| Estado | O que aparece |
|---|---|
| Carregando produtos | botão com `carregando` |
| Sem conta (anônimo) | botão "Criar conta para assinar" → fluxo de auth → volta |
| Comprando | botão travado + "Confirmando assinatura…" |
| Pendente (Pix aguardando, compra pendente na Play, Ask to Buy) | "Pagamento em processamento — avisamos quando confirmar" |
| Ativo | selo MEMBRO, "Membro até dd/mm", botão **Gerenciar assinatura** |
| Ativo em outra plataforma | "Sua assinatura é gerenciada no App Store / Google Play / site" (sem botão de compra) |
| Cancelada mas ativa | "Acesso até dd/mm" + opção de reativar na plataforma de origem |
| Expirada / cobrança falhou | aviso + CTA para regularizar na plataforma de origem |
| Casca antiga sem suporte | "Atualize o app para assinar" (sem link para a web no iOS) |
| `membro_ativo = false` | tela inacessível; CTAs escondidos |

**Gerenciar assinatura:** iOS → `assinaturaGerenciar`; Android → link da Play (seção 4.4); web →
`BottomSheet` com "Cancelar renovação" chamando `assinatura-web-cancelar`.

---

## 9. Fases e commits (para o Claude Code)

> Merge na `main`, deploy e mudanças em produção ficam com o Wag (regra do `CLAUDE.md`).

**Fase 0 — Anti-fraude do ranking** (pré-requisito do prêmio; pode rodar em paralelo à Fase 1)

1. `validar-ranking`: deduplicar e limitar conquistas; bônus recalculado no servidor.
2. `sortear` grava dificuldade + seed por carreira no servidor; `validar-ranking` passa a usar esse
   registro.
3. `registrar_ranking`: `registrado_em` imutável após a 1ª gravação; regravação idempotente.
4. `registrar_ranking_das_carreiras`: só carreiras validadas.
5. Rate limit por `user_id` + Turnstile no `validar-ranking`.
6. Testes cobrindo cada vetor da seção 6.

**Fase 1 — Entitlement + web + tela de Membro**

1. Migration: `assinaturas`, `eventos_assinatura`, `premiacoes`, `eh_membro`, `minha_assinatura`,
   chaves de `app_config` (tudo desligado).
2. Edge functions `assinatura-web-checkout`, `asaas-webhook`, `assinatura-web-cancelar`.
3. `src/data/assinatura/` (plataforma, cliente das RPCs, estado).
4. `MembroScreen` + rota + pontos de entrada (escondidos com `membro_ativo = false`).
5. Coluna `membro` nas RPCs de ranking + prop `membro` no `DriversTable variante="ranking"`
   (depois do Figma).
6. Benefício "sem anúncios": membro pula o intersticial (`regraIntersticial.ts`) e recebe o
   reroll recompensado sem assistir (`BotaoNovoSorteio` + `sortear` aceitando `eh_membro` no
   lugar do nonce), com os mesmos limites de reroll.

**Fase 2 — Android (Play Billing)**

1. `AssinaturaActivity` + Play Billing Library + `?assinatura_nativa=1`.
2. Edge functions `assinatura-google` e `google-rtdn`.
3. Restaurar/gerenciar. Build pelo `android-release.yml`.

**Fase 3 — iOS (StoreKit 2)**

1. `Assinatura.swift` + registro das pontes + capability In-App Purchase no workflow.
2. Edge functions `assinatura-apple` e `apple-notificacoes`.
3. Restaurar/gerenciar. Build pelo `ios-release.yml` → TestFlight Sandbox.

**Fase 4 — Liga dos Membros**

1. RPCs `ranking_liga` e `minha_posicao_na_liga`.
2. Seletor Liga · Geral, faixa de prêmios, `BottomSheet` do regulamento, card "Sua posição".
3. Cron `apurar-liga`, tela Campeões, painel admin de premiações.
4. Página `/regulamento`.
5. `premio_valor_real_ativo` continua desligado até o gate G0.

**Gate G0 (jurídico)** — liberar prêmio de valor real só com parecer escrito do advogado sobre o
modelo escolhido (A ou B) e, se exigido, autorização da SPA.

---

## 10. Tarefas manuais (Wag)

- [ ] Advogado: parecer sobre modelos A/B (Lei 5.768, Portaria SPA/MF 1.818/2026, Lei 14.790) e
      revisão do regulamento.
- [ ] Contador: definir quem fatura (GAS Games? sociedade do THE IMMORTAL com Garba e Leonardo?),
      CNPJ, nota fiscal e impostos sobre a receita das lojas e da web.
- [ ] Apple: aceitar o **Paid Apps Agreement**, dados bancários e fiscais; inscrever no
      **Small Business Program**; criar o grupo de assinatura e o produto `membro_mensal`;
      configurar **App Store Server Notifications V2** (URL da `apple-notificacoes`); gerar chave da
      App Store Server API; criar conta Sandbox de teste.
- [ ] Google: perfil de pagamentos; criar a assinatura `membro_mensal` no Play Console; criar conta
      de serviço com acesso à Google Play Developer API; tópico Pub/Sub + push para a `google-rtdn`;
      adicionar licenças de teste.
- [ ] Asaas: abrir conta (CNPJ), ativar Pix Automático, gerar chave de API e token de webhook.
- [ ] Supabase: secrets das edge functions (chaves Apple, conta de serviço Google, Asaas).
- [ ] Figma: tela "Seja Membro", selo no `DriversTable`, seletor Liga · Geral, faixa de prêmios.
- [ ] Definir preço, prêmios e orçamento de premiação.
- [ ] Atualizar Termos de uso e Política de Privacidade (pagamento, dados compartilhados com
      Apple/Google/Asaas).

---

## 11. Fora de escopo

- Plano anual, período grátis, cupom, presente.
- Link para compra na web dentro do app iOS (opção do acordo Apple × CADE; fica para depois, e
  não pode ser mostrada a menores de 18).
- Faturamento alternativo no Google Play (não disponível no Brasil hoje).
- Re-simulação completa no servidor para todas as carreiras (Fase D do PRD de backend) — aqui só a
  auditoria do pódio.
- Seed semanal compartilhada (PRD próprio, seção 7.4).
- Ranking por país.

---

## 12. Riscos

| Risco | Mitigação |
|---|---|
| Lojas recusarem/removerem por concurso com prêmio | Modelo C na v1; regulamento com aviso de não patrocínio; prêmio de valor só após G0 |
| Fraude no score com prêmio em jogo | Fase 0 + auditoria do pódio + regulamento com desclassificação |
| Membro sentir que pagou e "não ganhou nada" | Benefícios não dependem de vencer (sem anúncio, selo, capacete, estatísticas) |
| Pagamento confirmado na loja mas não no nosso banco | Notificações da loja + webhook + cron de reconciliação diário + "Restaurar compra" |
| Assinatura dupla (web + iOS) | `eh_membro` aceita várias; tela mostra onde cada uma é gerenciada e alerta a duplicidade |
| Build iOS sem Mac | Já resolvido via GitHub Actions; teste no TestFlight Sandbox |
| Liga vazia no começo (poucos membros) | `liga_exige_membro = false` temporário ou prêmio só a partir de X membros (regulamento) |
| Prazo do GP de SP | Lançar no GP só o que já estiver pronto (provável: web + tela + selo); lojas exigem revisão do produto IAP |

---

## 13. Decisões em aberto (Wag)

1. **Modelo de premiação:** ~~A, B ou C?~~ **Decidido em 31/10/2026: C** (assinatura de
   benefícios; membro participa da premiação; prêmio não é dinheiro).
2. **Preço:** R$ 9,90/mês ou outro valor?
3. **Prêmios:** digitais definidos em 31/10/2026 (Hall da Fama, capacete e selo de campeão,
   destaque nas redes). **Em aberto:** a miniatura da McLaren do Senna para o 1º do mês — só
   membros com parecer jurídico, ou prêmio aberto a qualquer conta? E qual o prêmio da semana?
4. **Benefícios da v1:** ~~confirmar~~ **Decidido em 31/10/2026:** membro sem nenhum anúncio
   (intersticial e recompensado), capacete e selo de membro. Estamina cheia entra quando a
   estamina existir.
5. **Gateway web:** Asaas ou Mercado Pago?
6. **Quem fatura:** GAS Games ou outra estrutura com os sócios do THE IMMORTAL?
7. **Liga conta N melhores carreiras:** N = 5?
8. **Ordem das plataformas:** web → Android → iOS (sugerido pela facilidade de teste) ou iOS
   antes por ser o público principal?

---

## Fontes consultadas (31/10/2026)

- Google Play — Jogos, concursos e apostas com dinheiro real:
  https://support.google.com/googleplay/android-developer/answer/9877032
- Apple — App Store Review Guidelines (5.3, 3.1): https://developer.apple.com/app-store/review/guidelines/
- Apple — mudanças no iOS no Brasil (jun/2026):
  https://www.apple.com/newsroom/2026/06/apple-announces-changes-to-ios-in-brazil/
- Fórum Apple — app gratuito de palpites com prêmios rejeitado (5.3.4):
  https://developer.apple.com/forums/thread/825845
- Cescon Barrieu — Portaria SPA/MF nº 1.818/2026: https://cesconbarrieu.com.br/portaria-promocoes-comerciais/
- Lei 5.768/71: https://www.planalto.gov.br/ccivil_03/leis/l5768compilado.htm
- PagBrasil — faturamento alternativo do Google Play no Brasil:
  https://www.pagbrasil.com/blog/markets/gaming/google-play-alternative-billing-in-brazil-a-guide-to-d2c-monetization-on-android/
- Asaas — Pix Automático × Assinaturas: https://docs.asaas.com/docs/diferença-entre-pix-automático-e-assinaturas
- Chrome — Play Billing em TWA: https://developer.chrome.com/docs/android/trusted-web-activity/play-billing
- PWABuilder — IAP em PWAs no iOS: https://blog.pwabuilder.com/posts/you-won't-believe-how-we-enabled-in-app-purchases-for-pwas-on-ios
