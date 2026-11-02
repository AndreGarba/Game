# PRD — Backend: sorteio protegido e ranking validado

**Projeto:** THE IMMORTAL
**Repo:** `aquinowag/theimmortal`
**Projeto Supabase:** `the-immortal` (`mnehtxhapalrvylzqfwh`, `sa-east-1`)
**Status:** decisões confirmadas pelo Wag em 31/07/2026 — pronto para execução
**Data:** 31/07/2026
**Emendas:** 31/07/2026, após verificação contra o repo, o banco e a documentação do
Supabase. Marcadas com **[emenda]**. As três decisões do §4 estão **confirmadas** com o
detalhamento registrado em cada uma.

**[emenda de 16/09/2026 — §10]** A tela de Ranking (`ranking_v2.md`) entrou, e trouxe
três coisas que este PRD não previa: a linha do ranking ganhou os eixos de filtro
(`categoria`, `dificuldade`, `registrado_em`), passou a valer **uma linha por (conta,
categoria, dificuldade) com a maior pontuação**, e a correção do mapa de dificuldade que
até então nunca gravava `lenda`. O §4.3 (formato do payload) **não** mudou — a regra de
unicidade é de armazenamento, não de contrato de submissão.

---

## 1. Objetivo

Criar a camada de servidor mínima que resolve dois problemas que não têm solução no
cliente:

1. **Proteger a base de pilotos.** Hoje `drivers` (1.003 linhas) é legível por
   qualquer um com a chave publishable, que está no bundle. Depois desta entrega, o
   cliente nunca recebe o roster completo — só os pilotos daquela carreira.
2. **Tornar o ranking confiável.** O cliente calcula o score. Sem validação
   server-side, qualquer pessoa envia o score que quiser e o ranking global —
   principal alavanca de retenção — perde sentido.

**Não-objetivo:** mover a simulação da carreira para o servidor. O jogo continua
simulando no cliente. Motivo: latência no loop de jogo, perda do modo offline do PWA
e custo que escala junto com o pico do GP de São Paulo.

---

## 2. Estado atual **[emenda: reverificado em 31/07 à noite]**

O que já existe e viabiliza esta entrega:

- `src/engine/` é TypeScript puro. Sem import de Node, sem API de browser.
- O motor recebe dados por parâmetro: `sortearRodada(pool, dificuldade, rng, excluidos)`.
  Não busca dado, não conhece o Supabase.
- `criarRngSeedado(seed)` (mulberry32) já existe e é determinístico.
- RLS ativo nas 11 tabelas. Dez com `public_read`, `sorteio_draws` com insert aberto.
  **[emenda de 01/08: `sorteio_draws` não existe mais — ver §8, dropada nos dois
  projetos.]**
  **[emenda de 04/08: são 7 tabelas + 1 view (`pilotos`), não 11. Higienização
  concluída nesta data dropou `npcs` (duplicata integral de `drivers`),
  `driver_seasons` (0 linhas, import da Jolpica nunca rodou), `legend_traits` e
  `tracos_emergentes` (sistema de traços cortado do escopo — ver
  `PRD-tracos-fora-de-escopo.md`) e `team_drivers` (ver a emenda de consolidação
  abaixo). Restam `drivers`, `teams`, `circuitos`, `career_tiers`, `rate_limit`,
  `achievements` e `atributos_ref`, todas com `public_read`. Nenhuma tabela gravável
  pelo cliente.]**
- Nenhuma Edge Function criada ainda. Não existe pasta `supabase/`.
- **[emenda]** `src/engine/index.ts` **já existe** (commit `77869e2`, PR 2 do PRD de
  fronteiras). O PR 1 da sequência do §9 está entregue.
- **[emenda]** O frontend é servido por **Cloudflare Workers static assets**
  (`wrangler.jsonc` com `assets.directory` + `not_found_handling`), não Cloudflare
  Pages.

**[emenda de 04/08 — consolidação `drivers`/`pilotos`, Fases 1 e 2.]** O vínculo
piloto→equipe deixou de morar em `team_drivers` e passou a ser a coluna
`drivers.equipe_id` (FK para `teams`, exposta na view `pilotos` como `equipe_id`).
Populada por backfill da própria `team_drivers` da season 2026: 170/170 vínculos,
zero divergências, zero FK órfã. `team_drivers` foi dropada depois que
`rivaisRepository.fetchGridCategoria` e `scripts/gerar-fixtures.ts` migraram (PR #18).
Consequências para este PRD: (a) o predicado de RLS da Fase B muda — ver §7; (b) a
dimensão `season` não existe mais no banco, que guarda só o grid inicial de 2026 (o
motor evolui as trocas de equipe em memória via `avancarMundoSombra`, como já era);
(c) `fetchGridCategoria` perdeu o parâmetro `season` e saiu de 3 queries para 2.
**Fase 3 pendente:** padronizar o schema inteiro em PT-BR, dropar a view `pilotos` e
renomear a tabela `drivers` para `pilotos`.

**[emenda] Correção da premissa Deno.** "Roda em Deno hoje, sem adaptação" é falso no
detalhe que importa: o Deno exige extensão explícita em import relativo, e os imports
internos do motor são **122 sem extensão, 0 com** (`from './rng'`). A doc do Supabase
usa sempre `from '../_shared/transform.ts'`. A correção é mecânica e segura —
`allowImportingTsExtensions` já está ligado nos 4 tsconfigs, Vite e tsc aceitam `.ts`
no import hoje, e o golden master prova que nada mudou. Vira a **Fase A0** abaixo.
Como a doc só exemplifica compartilhamento via `_shared/` dentro de
`supabase/functions/`, importar `../../src/engine/index.ts` de uma function precisa de
smoke test no dia 1 (function `ping` que importa o barrel e devolve a `rulesetVersao`)
antes de construir o `sortear`.

**[emenda] Cosmético:** o pool do sorteio lê 855 linhas (`categoria='f1'`), não as
1.003 da base inteira.

---

## 3. Decisões de arquitetura (fechadas)

### 3.1 Repositório único

O motor é importado pelo cliente **e** pelas Edge Functions, do mesmo caminho. Repo
separado significaria duas cópias do motor divergindo — e ranking que rejeita carreira
legítima ou aceita carreira forjada.

### 3.2 Hospedagem: Supabase Edge Functions **[confirmado pelo Wag em 31/07]**

Não Cloudflare Workers. Razões:

- A função `sortear` lê a base do Postgres. Na Edge Function isso é chamada interna,
  colocada com o banco em `sa-east-1`. Num Worker seria salto pela internet.
- A chave `service_role` permanece num fornecedor só.
- Runtime Deno importa o motor como TypeScript direto, sem passo de build (após a
  Fase A0).

**Custo aceito:** domínio distinto (`<ref>.supabase.co/functions/v1/...`), logo CORS
explícito. O Cloudflare Worker de assets continua servindo só o frontend estático.

**[emenda]** Esta decisão substitui a escolha anterior de um Worker separado para a
API (registrada no plano de reestruturação e no CLAUDE.md — ambos atualizados). O
**card PNG/OG** é workload diferente (geração de imagem, cache de CDN) e fica como
decisão separada para quando entrar — as opções são satori/resvg em Edge Function ou
um Worker dedicado só para isso.

### 3.3 O motor é a fronteira

Ambas as funções importam de `src/engine/index.ts`. Nenhuma delas reimplementa regra
de jogo. Se uma fórmula precisar mudar, muda no motor e as duas pontas mudam juntas.

---

## 4. Decisões abertas — **[emenda: todas confirmadas pelo Wag em 31/07/2026]**

### 4.1 Autenticação — CONFIRMADO: anônimo, com defesa em camadas

`verify_jwt: false` nas duas funções. Sem conta, sem login. Pedir cadastro antes de
jogar mata a conversão de um jogo viral de 5 minutos, e a premissa "sem conta" é do
produto desde o começo.

**Detalhamento confirmado:**

- **`sortear`:** rate limit **por IP** (limite duro) + instrumentação por `anon_id` e
  IP (contadores de uso, observabilidade). Reavaliar o aperto se a telemetria mostrar
  raspagem. 20 chamadas/hora — uma sessão normal faz 1 sorteio + no máximo 1 reroll,
  então 20 é folga larga para o legítimo e teto duro para raspagem (nesse ritmo,
  extrair 855 pilotos leva semanas, sem saber se o conjunto fechou).

  **[emenda de 05/09/2026]** Teto revisto de **20/h para 300/h**. Na prática, 20/h
  media "quantas chamadas UMA criação de carreira faz", não "quantas vezes por hora
  um jogador legítimo pode querer criar/recriar carreira" — e um jogador testando
  builds diferentes, ou atrás de um IP compartilhado (wifi, CGNAT) com outro jogador
  ativo, esbarrava em 429 sem fazer nada indevido. O vetor que este limite de fato
  protege é raspagem em massa do roster via script variando seeds, não o volume de
  uso de um jogador — e o reroll dentro de uma mesma seed já tem teto próprio,
  verificado sempre no servidor independente deste rate limit
  (`TETO_REROLL_POR_DIFICULDADE` em `nucleo.ts`). 300/h mantém a raspagem lenta o
  bastante para não compensar (as faixas raras de `PROBABILIDADES_FAIXA`, com
  probabilidade tão baixa quanto 0.5%, ainda exigem várias horas de tráfego
  constante) e fica bem acima de qualquer padrão humano. Mecanismo inalterado (RPC
  atômica, janela de hora UTC cheia, falha fechada em 503). Ver o comentário em
  `TETO_RATE_LIMIT_POR_HORA`, `supabase/functions/sortear/index.ts`.
- **`validar-ranking`:** rate limit + **Cloudflare Turnstile**. A submissão é 1× por
  carreira, então o atrito é zero — e barra farm de script no leaderboard.
- **`anon_id` não é identidade.** É gerado no cliente e serve só como agrupamento de
  telemetria. Nenhuma decisão de segurança pode se apoiar nele — quem manda o campo é
  o cliente, logo qualquer um manda o que quiser. (Registrado também no CLAUDE.md.)

Implementar contagem em tabela (`rate_limit`, com `chave`, `janela`, `contagem`), não
em memória — Edge Function não tem estado entre invocações.

### 4.2 Reroll e seed — CONFIRMADO: reroll dentro do fluxo do rng, teto do GDD

Hoje o sorteio usa `rngPadrao`, que é `Math.random()`. O sorteio atual não é
reproduzível. **[emenda]** E não é só o sorteio: a **carreira inteira** não é —
`rngPadrao` aparece em 14 pontos de `useCarreiraFlow`, `iniciarCarreira` e
`useCriacaoFlow` (ver Fase E).

**Mecânica confirmada:** o reroll consome o **próximo valor da mesma sequência
seedada**. A sequência de sorteios de uma seed é fixa; rerrolar apenas avança nela.
Dois jogadores com a mesma seed que rerrolem o mesmo número de vezes veem o mesmo
resultado. O motor já suporta — `pickPilotoDaFaixa` recebe `excluidos` e o `rng` é
sequencial (assinatura verificada).

**Teto confirmado: o do GDD §4 — Amador 1 reroll, Pro 0.** A sugestão original de "3
para todos" contradizia a fonte da verdade de produto. O ranking já filtra por
modo × dificuldade, então o teto diferente por modo não quebra comparabilidade dentro
de cada filtro. **[emenda]** Divergência pré-existente a corrigir na fiação: o código
hoje dá 1 reroll para todo mundo, inclusive no Pro (`criacaoReducer.ts`,
`rerollTokens: 1` fixo).

**[emenda] Interatividade:** o reroll acontece DURANTE a criação — o jogador vê o
piloto e decide. Logo cada reroll é **uma nova chamada** a `sortear` com o mesmo
`seed` e `rerolls: n+1`; o servidor reaplica a sequência avançada e devolve o estado
atual do draft. O jogador não consegue espiar adiante (o servidor só devolve o
presente), e o custo fica em 1 + teto chamadas por criação — dentro do rate limit.

**[emenda de 02/08 — corrige a premissa acima, agora que a Fase A está implementada
e deployada: o servidor NÃO devolve "o presente" rodada a rodada — `sortear`
devolve as 9 rodadas inteiras numa resposta só (é assim que garante "mesma seed ⇒
mesmo resultado": o motor roda o draft completo internamente, não expõe estado
parcial).** Isso muda o que "reroll" significa na prática:

- Rerolar a rodada N é **uma segunda chamada** a `sortear`, mesma seed, agora com
  `rerollNaRodada: N`. Como o rng é sequencial e determinístico, as rodadas `1..N-1`
  saem *idênticas* à primeira chamada (o prefixo da sequência não muda) — só
  `N..9` é recalculado (uma chamada extra de rng é consumida em N, deslocando tudo
  depois).
- Isso é **invisível na revelação rodada a rodada** (a tela só mostra o que já foi
  revelado; o que muda é o que ainda nem apareceu) — mas é uma mudança real de
  semântica: reroll deixa de ser "refaz só esta escolha" e passa a ser "recalcula
  tudo a partir daqui", ainda que o jogador não perceba a diferença visualmente.
- **Decisão pendente, de propósito:** a tela de criação vai ser reescrita a partir
  do Figma em breve — mexer na lógica de reroll agora significa refazer depois.
  Fica pra decidir junto com o desenho da tela nova (BLOCO 1, item 4 — "cliente
  passa a consumir `sortear`" — ainda não iniciado).

### 4.3 Formato do log de decisões — CONFIRMADO: array compacto + 3 eixos de versão

Este é o contrato mais caro de mudar do projeto, porque o app Kotlin vai herdá-lo.

```
{
  formatoVersao: 1,        // estrutura deste payload
  snapshotVersao: 7,       // versão dos dados de referência (pilotos/equipes/circuitos)
  rulesetVersao: "a3f9c2", // [emenda] hash das constantes de balanceamento — ver abaixo
  seed: 1837462,
  rerolls: 1,
  decisoes: [
    { t: "treino", pt: [2, 1, 0, 1, 1] },
    { t: "contrato", eq: "equipe_id", dur: 2 },
    ...
  ]
}
```

Princípios do formato (originais, mantidos):

- **Só decisão, nunca resultado.** O cliente não manda "terminei em 3º" — manda o que
  escolheu. O servidor deriva o resto. Resultado no payload é superfície de fraude.
- **Chaves curtas.** O payload cresce com a carreira e trafega em 4G.
- **Teto de tamanho.** Payload acima do limite conhecido é rejeitado antes de
  qualquer processamento.

**[emenda] O terceiro eixo: `rulesetVersao`, derivada — nunca escrita à mão.**

O formato original versionava estrutura e dados, mas não as **regras**. Mudar uma
constante de balanceamento entre a partida e a validação faria o servidor rejeitar
carreira legítima — a mesma classe de bug que o próprio §4.3 aponta para o snapshot,
aplicada a código.

Detalhamento confirmado pelo Wag:

- `rulesetVersao` é um **hash calculado no build** sobre as constantes de
  balanceamento — `engine/config/`, `engine/corrida/config/` e (emenda desta revisão)
  `engine/mercado/config/`, porque os pesos de desejabilidade e legado são regra de
  jogo tanto quanto os de corrida. Nunca é escrita à mão.
- **Teste que falha se as constantes mudarem sem a versão mudar:** o hash gerado fica
  commitado (`src/engine/version.ts`); um teste recalcula e compara. Constante mudou →
  teste vermelho até rodar o script de regeneração. O bump vira deliberado sem ser
  manual. (Par com o golden master: o hash guarda as constantes, os snapshots guardam
  a lógica.)
- **Rejeição por divergência de versão retorna erro distinto de rejeição por
  fraude** — ex.: `409 RULESET_DIVERGENTE` vs `422 VALIDACAO_DIVERGENTE`. Os dois
  casos precisam ser separáveis no log: um mede atrito de deploy, o outro mede ataque.
- Mudança de balanceamento só aterrissa **na virada da temporada semanal** — a
  cadência do ranking dá a janela de deploy natural.

**[emenda] Tabela `temporadas`.** "Seed pertence a uma temporada aberta" (§8) implica
uma tabela que o schema original não tinha. É ela que fixa o contrato de cada semana:
`{ id, seed, snapshot_versao, ruleset_versao, abre_em, fecha_em }`. A linha de
`ranking` referencia `temporada_id`.

---

## 5. Escopo — Fase A0 **[emenda: nova]** — extensões `.ts` + smoke test

Pré-requisito da Fase A, descoberto na verificação (§2):

1. Codemod adicionando `.ts` aos 122 imports relativos internos do motor (e ao
   barrel). Zero mudança de comportamento; golden master prova.
2. `supabase/functions/ping/` — function mínima que importa `src/engine/index.ts` e
   devolve `{ rulesetVersao }`. Prova a cadeia de import no Deno real com um endpoint
   descartável, antes de construir o `sortear` em cima de uma premissa não testada.

**Pronto quando:** `supabase functions serve` responde o ping localmente com a versão
correta, e todos os gates passam (`lint`, `typecheck`, `test:all`, `build`, snapshots
intactos).

---

## 6. Escopo — Fase A: `sortear`

Primeira função de verdade. Não cria tabela, não exige migration, não toca em save.
Se der errado, reverte e o jogo continua funcionando como hoje.

### Contrato

**Entrada:** `seed`, `dificuldade`, `rerollNaRodada`, `anonId`
**Saída:** os 9 pilotos sorteados (com faixa de raridade). **Nunca o roster completo.**

**[emenda de 02/08 — correção de modelo, achada ao ligar o cliente na função pela
primeira vez, não só um ajuste de código]** A saída documentada acima (na versão
original desta seção) incluía `potencialMedio`, `ovrInicial` e as equipes de F3
oferecidas. Removido — `sortear` só existe pra proteger o roster de 855 pilotos;
nenhum desses três valores depende do roster, e o jogador ainda nem escolheu nada
no momento em que a função responde. A tela de criação deixa o jogador escolher
**livremente** qual dos 9 atributos do piloto sorteado quer roubar a cada rodada
(só não repete atributo já escolhido) — a versão anterior do núcleo fixava cada
rodada a um atributo de `ATRIBUTOS` numa ordem pré-definida e calculava os três
valores em cima dessa suposição, que nunca bateria com a escolha real do jogador.
Ver o comentário no topo de `supabase/functions/sortear/nucleo.ts` e a nova regra
"Edge Function é exceção, não padrão" no CLAUDE.md. `potencialMedio`/OVR/equipes
continuam 100% cliente, como já funcionam hoje — zero mudança aí.

**[emenda de 01/08] `rerolls: number` (escalar) virou `rerollNaRodada: number | null`.**
Um contador solto não basta pro servidor reconstruir a sequência determinística — ele
sabe QUANTOS rerolls houve, mas não ONDE na sequência de 9 rodadas o valor extra de
`rng()` foi consumido, e "reroll consome o próximo valor da mesma sequência" (§4.2)
só funciona sabendo o índice exato. Com o teto confirmado em 1 (Amador) / 0 (Pro), o
campo veio natural como índice único (0-8) ou `null` — não `number[]`, que só faria
sentido se o teto fosse >1. Implementado e testado em `supabase/functions/sortear/`.

**[emenda de 01/08] `anonId` aqui é só instrumentação de rate limit (§4.1), não
identidade — e o campo em si é uma decisão em aberto: o gerador client-side que
existia (`src/data/anonId.ts`) foi removido junto com `sorteio_draws` (§8), porque o
único motivo dele era rotular linhas de telemetria que não existem mais. Quando a
Fase A for de fato ligada ao cliente, decidir ali: reintroduzir um gerador parecido
só para rate limit, ou usar outro sinal (IP já cobre o limite duro sozinho).**

### Comportamento

1. Verifica rate limit (por IP). Estourou, responde 429.
2. Lê `drivers` do Postgres, monta o `BandedPool` (`buildBandedPool`, já no barrel).
3. Cria o rng com `criarRngSeedado(seed)`.
4. Chama `sortearRodada` o número de vezes necessário, respeitando `excluidos` e o
   número de rerolls (teto por modo: Amador 1, Pro 0).
5. Devolve apenas o subconjunto.

**[emenda] Não grava telemetria — `sorteio_draws` foi dropada (§8), não substituída
por uma versão server-side. Determinístico + server-side, uma linha por sorteio virou
redundante: `(seed, dificuldade, rerolls)` já reconstrói o sorteio inteiro sob demanda,
e a validação de distribuição roda melhor via `npm run sim:sorteio` — volume ilimitado,
sem depender de amostra de produção.**

### Critério de aceite

- Mesma seed + mesma dificuldade + mesmo `rerollNaRodada` ⇒ resposta idêntica.
- A resposta não contém nenhum piloto fora do elenco daquela carreira.
- Teste no repo comparando a saída da função com a saída do motor rodado localmente
  com a mesma seed. Se divergir, alguma lógica foi reimplementada no servidor.
- CORS liberando apenas o domínio de produção e a origem de desenvolvimento.
  **[emenda] `theimmortal.com.br` era placeholder meu, nunca confirmado — o código
  não fixa domínio nenhum (`ORIGENS_PERMITIDAS` nasce vazia de propósito, ver
  `index.ts`). Preencher quando o domínio real existir.**

**[emenda de 02/08 — latência observada, medida pelo servidor (`execution_time_ms`
do log, não RTT de rede do cliente de teste):** 2 chamadas reais contra
`the-immortal` — **~2.3s a primeira (cold), ~1.3s a segunda (quente, mesmo
isolate)**. Alto pra uma query + cálculo em memória; hipótese não confirmada:
`verificarRateLimit` é um round-trip de Postgres SEQUENCIAL e separado da query
de pilotos (tem que resolver antes, por design — fail-closed), então cada chamada
faz no mínimo 2 idas ao Postgres, não 1. Não investigado a fundo ainda — registra
aqui pra não virar suposição otimista quando a tela nova depender dessa latência
pra UX (cada reroll é uma chamada nova).**

**[emenda de 02/08 — status: deployado em produção (`the-immortal`) e verificado
contra Postgres real. Ver BLOCO 1 item 3 abaixo.]**

`supabase/functions/sortear/`:
- `nucleo.ts` — determinístico, sem Postgres/fetch/`Deno.serve`. Importa do barrel do
  motor, não reimplementa nada. **Critério de aceite verificado nos dois runtimes:**
  - Node: `tests/sortear.nucleo.test.ts`, 13 casos. O de paridade não chama `nucleo.ts`
    duas vezes — RE-DERIVA o resultado esperado direto dos primitivos do motor (mesma
    ordem de chamada que o cliente faz), então pegaria de verdade uma reimplementação
    divergente. Confirmado ao vivo: quebrei `nucleo.ts` de propósito (pulei um
    `excluidos.add`), 6 testes viraram vermelhos na hora, revertido depois.
  - Deno: `deno check supabase/functions/sortear/nucleo.ts` limpo (Deno 2.9.4, via
    `npx deno`, sem Docker).
- `index.ts` — casca HTTP. **[emenda de 02/08 — BLOCO 1, item 2: os 3 `TODO(token)`
  fechados, com falha fechada]:**
  - **Rate limit real:** tabela `rate_limit` (`chave`, `janela`, `contagem`) +
    RPC `incrementar_rate_limit` (upsert atômico, `EXECUTE` restrito a
    `service_role`) — migration `create_rate_limit_table`, aplicada em
    `the-immortal` e versionada em `supabase/migrations/`. Teto 20/h por IP (PRD
    §4.1), janela = hora UTC cheia. Falha do RPC (rede, etc.) fecha a falha —
    devolve 503, não deixa passar. **[emenda de 05/09: teto revisto para 300/h —
    ver §4.1.]**
  - **CORS:** `ORIGENS_PERMITIDAS` preenchida com `theimmortal.com.br`,
    `www.theimmortal.com.br` e `http://localhost:5173`. O domínio do Workers
    (`*.workers.dev`) fica de fora de propósito — o subdomínio real da conta
    Cloudflare ainda não foi confirmado, e um valor inventado seria pior que
    nenhum. Adicionar quando existir.
  - **Configuração ausente ⇒ 503 na inicialização:** `SUPABASE_URL`/
    `SUPABASE_SERVICE_ROLE_KEY` lidos e validados uma vez no cold start do
    módulo — sem eles, todo request recebe 503 antes de tentar Postgres ou rate
    limit, em vez de um 500 genérico no meio do caminho.
  - **Leitura do Postgres:** query não mais "escrita espelhando" — importa
    `sorteioQuerySpec.ts` (mesmo módulo do cliente, ver item 1 do BLOCO 1).

**[emenda de 02/08 — BLOCO 1, item 3: `deno check`, deploy e verificação — feito]**

- **`deno check` (as duas coisas antes travadas):** a causa real não era falta de
  ambiente — era o Deno auto-detectar o `node_modules` da raiz (do npm, do
  frontend) e tentar resolver a dependência interna do jsr (`npm:@supabase/
  realtime-js@2.111.0`) contra a versão errada (2.110.2, a que o frontend usa).
  Corrigido com `supabase/functions/sortear/deno.json`
  (`{"nodeModulesDir": "none"}`) — isola a resolução de módulos da function do
  `node_modules` do resto do repo. `deno check` limpo nos dois arquivos depois
  disso; `deno.lock` gerado e versionado junto, pra essa resolução não voltar a
  variar sozinha no futuro.
- **Deploy:** a function importa o motor inteiro (52 arquivos de `src/engine/`,
  porque `nucleo.ts` consome o barrel) — mandar cada arquivo separado pro
  `deploy_edge_function` é fonte de erro (fácil esquecer um) e caro. Em vez
  disso, `npm run build:sortear` (novo script, usa `esbuild`, já dependência do
  Vite) empacota `index.ts` + tudo que ele importa num único
  `supabase/functions/sortear/_dist/index.bundle.js` (12.6kb, gerado — não
  versionado, está no `.gitignore`), mantendo só `jsr:@supabase/supabase-js@2`
  como import externo (Deno resolve isso por conta própria). Deploy dos 2
  arquivos (`index.bundle.js` + `deno.json`) via MCP, `verify_jwt: false`
  (decisão de produto, §4.1 — a defesa é o rate limit, não JWT). Status
  `ACTIVE` na primeira tentativa.
- **Verificação contra Postgres real (o critério de aceite da fase inteira):**
  seed `424242`, dificuldade `facil`, reroll na rodada 3 — chamado ao mesmo
  tempo contra `nucleo.ts` rodando local (buscando o pool ao vivo) e contra a
  function deployada via HTTP real (`POST /functions/v1/sortear`). **Resultado
  byte-a-byte idêntico** nas 9 rodadas, `potencialMedio`, `ovrInicial` e
  `equipesOferecidas`. Log da function confirma `200` na chamada, sem erro.

**[emenda de 01/08 — bloqueador achado e corrigido]:** nem `fetchPilotosParaSorteio`
(`pilotosRepository.ts`) nem a query espelhada em `index.ts` tinham `ORDER BY` com
desempate explícito. `buildBandedPool` preserva a ordem de chegada dentro de cada
faixa, e `pickPilotoDaFaixa` sorteia por **índice** nessa lista (`pickUniform`) —
então "mesma seed ⇒ resposta idêntica" só vale se o Postgres devolver as linhas
sempre na mesma ordem, o que SQL não garante sem coluna de desempate. Achado ao
regenerar `pilotos-f1.snapshot.json` durante a sincronização do filtro `eh_npc`
(commit `a54bd2b`): mesmos 855 pilotos, mesmos valores de campo, ordem diferente — e
3 casos de `tests/sorteio.golden.test.ts` quebraram na hora. Não era risco só de
fixture local — nenhuma das duas queries de produção (cliente, Edge Function) tinha
desempate, mas o impacto era sobre trabalho em andamento, não sobre o jogo
publicado: o cliente shipado ainda usa `rngPadrao` (não seedado), então ninguém
dependia de "mesma seed ⇒ mesmo resultado" no jogo real. O buraco bloqueava
especificamente a Fase A, a Fase E e a Fase D — as três existem pra reproduzir um
sorteio a partir de uma seed.

**Corrigido:** `.order('geral', {ascending: false}).order('id', {ascending: true})`
nas três queries que montam o pool (`pilotosRepository.ts`, `gerar-fixtures.ts`,
`sortear/index.ts`) — `geral DESC` é só o critério "principal" (não muda o
sorteio, que reagrupa por faixa de qualquer jeito), `id ASC` é o desempate que
precisa ser estável. Validado: fixture regenerada duas vezes seguidas contra o
Postgres real, diff byte-a-byte idêntico entre as duas rodadas — a ordem agora é
reprodutível, não mais um acidente de como o Postgres devolveu daquela vez.
Consequência esperada e aceita: o resultado do sorteio mudou para seeds já usadas
(o desempate anterior era outro acidente de ordem, não uma escolha), então os 3
snapshots de `tests/sorteio.golden.test.ts` foram atualizados — atualização
legítima por motivo declarado, exatamente o caso que o CLAUDE.md prevê.

**[emenda] Miudeza de UX que muda junto:** a animação de revelação
(`usePilotoRevelado`) cicla nomes do pool no cliente. Sem o pool, precisa de lista
estática de nomes-isca ou de nomes na resposta do `sortear`.

---

## 7. Escopo — Fase B: fechar `public_read` **[emenda: reescopo]**

Só depois de `sortear` estar em produção e o cliente não ler mais o pool.

**A versão original subestimava o que o cliente lê continuamente.** Não é só o setup:
**cada virada de temporada** busca 5 grids + npcs + circuitos
(`useCarreiraFlow.ts:265-276`), porque a simulação local precisa dos atributos dos
rivais. E `numerosRepository` lê `pilotos` na criação. Revogar `public_read` de
`drivers` quebraria o loop do jogo, não só o sorteio.

**Abordagem emendada — filtro por linha, não revogação:**

- `drivers`: política de SELECT com predicado `equipe_id IS NOT NULL`. **[emenda de
  04/08: o predicado original era `id IN (SELECT driver_id FROM team_drivers WHERE
  season = <atual>)`. `team_drivers` foi dropada e o vínculo virou a coluna
  `drivers.equipe_id` — o predicado novo dá exatamente o mesmo conjunto, sem
  subconsulta.]** Os 170 pilotos de grid (informação essencialmente pública)
  continuam legíveis; os 883 históricos com atributos curados — o ativo real —
  ficam protegidos.
- Números ocupados: view estreita (`numeros_ocupados`: `numero`, `piloto`) com grant
  próprio, ou os números entram na resposta do `sortear`.
- `circuitos`, `teams`, `career_tiers`: continuam `public_read` — o loop do jogo
  consome. **[emenda de 04/08: `npcs` saiu desta lista — a tabela foi dropada; os
  NPCs vivem em `drivers.is_npc` e são lidos pela view `pilotos` com `eh_npc`.]**

**[emenda de 04/08 — atenção ao portão desta fase.]** A segunda condição da primeira
linha ("o cliente não ler mais o pool") **ainda não foi cumprida**: o item 8.ii da
sequência (§11) está pausado de propósito e `USA_SORTEAR_REMOTO` nasce `false`
(`sortearRemoto.ts`), então o cliente continua lendo o pool direto do Postgres.
Aplicar a política hoje quebraria três caminhos, não um: `fetchPilotosParaSorteio`
(os 558 pilotos do pool com `equipe_id` nulo), `fetchDetalhesPiloto` (mesma
população) e `fetchNpcsSombra` (os 50 NPCs, também com `equipe_id` nulo). A Fase B
segue corretamente bloqueada pelo 8.ii.

Reversível com um comando SQL. Executar em horário de baixo tráfego e verificar o app
imediatamente depois — inclusive **uma virada de temporada completa**, não só a tela
inicial.

---

## 8. Escopo — Fase C: dropar `sorteio_draws` **[emenda de 01/08: decisão revista — feito]**

**Decisão anterior** (apertar a política `WITH CHECK (true)` numa janela de transição,
depois revogar o INSERT do cliente) **foi substituída**: em vez de proteger a tabela,
ela é removida.

**Motivo:** o sorteio vai virar determinístico e server-side (Fase A). Cada linha de
`sorteio_draws` guardava o resultado de UM sorteio — mas `(seed, dificuldade,
rerolls)` já reconstrói esse resultado inteiro sob demanda, então a linha é
redundante por definição a partir da Fase A. E a validação de distribuição (o motivo
original da tabela — comparar produção contra `PRD/THE-SENNA-GDD-v2.md` §3.3) sai
melhor rodando `npm run sim:sorteio` direto: volume ilimitado (milhões de sorteios
por rodada, contra uma amostra finita de produção), sem esperar tráfego real
acumular, sem PII nenhuma envolvida.

**Verificado antes do drop** (a barra que qualquer DROP TABLE precisa passar neste
projeto): zero `SELECT` em `sorteio_draws` no código-fonte inteiro — o único uso era
o `INSERT` em `telemetryRepository.ts`, removido no mesmo commit — e zero view
dependente nos dois projetos Supabase.

**Feito** — `drop table sorteio_draws` aplicado via migration nos dois projetos:
`dzfgukpzennuiorlixlu` (289 linhas, é o que `.env` local aponta hoje) e
`mnehtxhapalrvylzqfwh` (27 linhas, "the-immortal", o canônico do CLAUDE.md). Código
removido junto: `src/data/telemetryRepository.ts`, `src/data/anonId.ts` (ficou órfão —
seu único consumidor era a telemetria), e o campo `sessaoCriacaoId` em
`CriacaoState`/`criacaoReducer.ts` (só existia pra rotular essas linhas).

**O que isso muda na regra de segurança geral** (CLAUDE.md): não há mais dívida de
`WITH CHECK (true)` pra registrar — o schema inteiro volta a ser **read-only** do
lado do cliente. Qualquer tabela gravável futura (`ranking`, `rate_limit`) nasce
escrevendo **só via Edge Function com `service_role`**, nunca com INSERT do cliente
aberto — a política desde o primeiro dia, não uma migração de política depois.

**Tabela `npcs` — rollback, não órfã permanente [emenda de 01/08]:** a migração de
NPCs para `drivers.is_npc` (auditoria de 01/08, Fase 1+2 — ver 11.i) tirou `npcs` de
uso: sorteio e grid agora leem de `pilotos`/`drivers`. A tabela **continua existindo**
nos dois projetos Supabase de propósito — é o caminho de rollback caso a migração
precise ser revertida. **Critério de descarte:** dropar `npcs` depois que a Fase A
estiver deployada e validada em produção. Tabela órfã sem prazo vira permanente; este
critério é o prazo.

**[emenda de 04/08 — critério cumprido, `npcs` dropada.]** A Fase A está deployada e
verificada contra Postgres real desde 02/08, então o prazo acima venceu. Antes do
drop, conferência campo a campo nos 50 registros contra `drivers`: `full_name`,
`given_name`, `family_name`, `code`, `nationality`, `potential`, `archetype` e
`ovr_initial` → `drivers.ovr` — **zero divergências, zero órfãos**. Migration
`drop_tabela_npcs_duplicada`. Os NPCs seguem em `drivers.is_npc` (50 linhas), lidos
pela view `pilotos` com `eh_npc`, que é como `fetchNpcsSombra` sempre leu.

---

## 9. Escopo — Fase E **[emenda: nova]** — determinismo no cliente

**A versão original não tinha fase para o lado cliente — e a Fase D depende
inteiramente dele.** Para o `validar-ranking` reproduzir uma carreira, o cliente
precisa antes:

1. **Save v8** **[emenda: era v7 nesta versão do PRD — a numeração mudou quando a Fase
   4 de fronteiras (chave + validação) consumiu o v7 primeiro, em 01/08. Uma migration
   por motivo — ver §11]:** gravar `seed`, o **log de decisões** (formato do §4.3) e a
   **posição na sequência do RNG** (para retomar sessão no meio da carreira — mulberry32
   avança por replay ou por contador de chamadas; carreira inteira consome poucos
   milhares de valores, fast-forward é barato).
2. **Trocar `rngPadrao` por rng seedado do save** nos 14 call sites de
   `useCarreiraFlow`, `iniciarCarreira` e `useCriacaoFlow`.
3. **Capturar cada decisão** (treino, contrato, aposentadoria...) no log, no momento
   do dispatch.
4. **[emenda de 01/08 — bloqueador, não nice-to-have]** Decidir e implementar como
   `avancarMundoSombra` consome `NpcSombra.atributos` (real desde a migração
   `npcs`→`drivers.is_npc`, ver auditoria de 01/08) ANTES desta fase. Hoje o assento
   ainda é preenchido por `sintetizarAtributosNpc(npc.ovrInicial, npc.potencial,
   npc.archetype, rng)` — síntese que consome `rng()` de um jeito que qualquer um
   dos 3 desenhos possíveis (usar `atributos` real + sintetizar só `potenciais`
   reaproveitando `gerarPerfilComAssinatura`; tratar NPC como já no teto,
   `potenciais = atributos`; ou escalar o perfil real pela razão
   `potencial/ovrInicial`) muda — cada um consome `rng()` em pontos diferentes, ou
   não consome nenhum extra (a opção "já no teto" elimina uma chamada de
   `gerarPerfilComAssinatura` que hoje existe). Isso é exatamente o tipo de mudança
   que os itens 1-3 acima criam infraestrutura pra proteger — decidir DEPOIS de
   `rulesetVersao` congelar, ou depois de existir uma temporada semanal com ranking
   registrado, invalida silenciosamente toda pontuação anterior (mesma seed passa a
   produzir carreira diferente). **`rulesetVersao` (§4.3) não deve congelar com essa
   decisão pendente.** Decisão em avaliação pelo Wag; ver commit `bfa30c8`.

Pré-requisitos já cumpridos: instância única do fluxo (corrigida na Fase 3 da
reestruturação — sem isso, 4 instâncias consumiam o RNG fora de ordem e o
determinismo era falso) e a guarda de save de versão futura.

**Detalhe no caminho:** `iniciarCarreira.ts:5` importa **valor** de `data/`
(`gerarId`, não-determinístico por natureza). IDs de entidades da carreira precisam
sair da seed ou do índice — id aleatório quebra o replay bit a bit.

**[emenda de 01/08] Quando a decisão do item 4 entrar:** vai mudar o RESULTADO da
simulação de propósito (é o objetivo — NPCs deixam de ter perfil sintético e passam
a usar dado real). **Isso é um dos casos legítimos de atualizar golden snapshot**
(`CLAUDE.md` — "Golden tests: contrato, não teste de regressão"): o PR que
implementar precisa quebrar `tests/carreira.golden.test.ts` de propósito, atualizar
o snapshot, e explicar no PR o que mudou no jogo e por quê — não é regressão, é
mudança de balanceamento declarada.

---

## 10. Escopo — Fase D: `ranking` + `validar-ranking`

Última fase por ser a que tem mais decisão de produto embutida.

**[emenda] Pré-requisito não listado na versão original: a extração da orquestração
de carreira (§10A do PRD de fronteiras).** A revalidação roda o arco inteiro da
carreira no servidor. Hoje essa orquestração mora em `useCarreiraFlow.ts` — um hook
React, inimportável em Deno — e o simulador de carreira carrega uma **cópia própria**
(`fecharTemporadaTeste`), o que viola o §3.3 deste mesmo PRD. Extrair
`fecharTemporada` + adapters para o motor deixa de ser "depois do lançamento" e vira
bloqueador desta fase.

### Tabela `ranking`

RLS com **leitura pública** (o ranking é para ser visto) e **nenhuma política de
INSERT ou UPDATE**. O cliente não escreve. A Edge Function escreve com
`service_role`, que ignora RLS por definição.

Campos mínimos: `anon_id`, `temporada_id` **[emenda]**, `seed`, `snapshot_versao`,
`ruleset_versao` **[emenda]**, `pontuacao`, `apelido`, `criado_em`. Índice para o
ranking da temporada semanal.

**[emenda de 16/09/2026] Três campos a mais, porque a tela passou a filtrar:
`categoria`, `dificuldade` e `registrado_em`.** A spec da tela de Ranking
(`ranking_v2.md`) tem um filtro de 3 eixos — categoria, dificuldade e período — e
nenhum deles existia na linha. Ficam desnormalizados aqui, não num join com
`jogadores.carreiras`, pelo mesmo motivo dos campos de exibição
(`desnormalizar_identidade_de_exibicao_no_ranking`): `carreiras` tem RLS por dono, então
o cliente não lê a linha alheia, e abrir `carreiras` pra leitura pública exporia o save
inteiro (`resumo_final` incluso) pra alimentar um filtro de tela.

- `categoria` guarda o **bucket do ranking**, não o `categoria_atual` cru da carreira:
  `wec_hypercar` e `wec_gt3` colapsam em `'wec'`. O colapso acontece na ESCRITA
  (`bucketDeCategoria` em `validar-ranking/nucleo.ts`) porque é o que faz a regra de
  unicidade abaixo dizer a verdade — o filtro oferece "WEC" como UMA opção, e um índice
  único não sabe que dois valores deveriam contar como um. `f2`/`f3` entram no
  vocabulário mesmo sem opção correspondente no filtro (que só oferece Formula 1/WEC/Indy,
  de propósito: o ranking olha pro topo da pirâmide) — jogar fora a categoria real de
  quem parou na F3 pra caber numa UI seria perder dado por conta de tela.
- `registrado_em` é **quando aquela pontuação entrou**, não quando a linha foi tocada
  pela última vez (isso `atualizado_em` já faz, e ele anda em qualquer update, inclusive
  em backfill). Só avança junto com uma pontuação que substitua a anterior — reenviar a
  mesma carreira não pode rejuvenescer a linha, senão o filtro de período mente.

**[emenda de 16/09/2026] Uma linha por (conta, categoria, dificuldade) — sempre a maior
pontuação.** Decisão de produto que a versão original não tinha: a mesma conta não pode
ocupar várias posições do mesmo recorte. Vale o recorde dela naquele par; carreira pior
não entra, e carreira melhor SUBSTITUI a anterior (a perdedora deixa de ter linha).

Mora em índice único `(user_id, categoria, dificuldade)`, não na disciplina do código de
escrita — código de escrita pode ser reintroduzido errado, constraint não. Quem aplica é
a função `jogadores.registrar_ranking`, um `insert ... on conflict (user_id, categoria,
dificuldade) do update ... where excluded.pontuacao > alvo.pontuacao`:

- **Statement único, não "lê, compara, grava" na Edge Function.** O teste e a escrita
  acontecem na mesma linha travada, então duas carreiras encerrando ao mesmo tempo não se
  atropelam. Sem isso a corrida esbarraria no índice único e viraria `23505` na cara do
  jogador, no fim de carreira — um momento em que ele não tem o que fazer com o erro.
- **Empate não substitui.** Na dúvida vale o registro mais antigo, que é o mesmo
  desempate que a listagem usa pra ordenar.
- A função devolve `{ pontuacao_vigente, substituiu }`: quando a nova é barrada, o
  cliente ainda sabe qual recorde continua valendo, em vez de a tela fingir que nada
  aconteceu.

**[emenda de 16/09/2026] A ordenação da listagem precisa de desempate explícito.** A tela
pagina por `range()` (20 por vez, ver `ranking_v2.md`), e `order by pontuacao desc`
sozinho não é uma ordem total: duas linhas empatadas podem sair em ordem diferente a cada
consulta, e aí a mesma conta aparece duas vezes — ou some — na fronteira entre páginas.
Empate existe de verdade na base. A ordem é `(pontuacao desc, registrado_em, id)`, e está
copiada letra por letra em `rankingRemoto.ts` e na RPC `jogadores.ranking_vizinhanca`; se
as duas divergirem, a posição que a tela mostra no rodapé fixo deixa de bater com a
posição da mesma linha na lista.

### Fórmula de `pontuacao` **[emenda]**

```
legend_score_ajustado = legend_score * (triplice_coroa ? 2 : 1)
pontuacao = (legend_score_ajustado + bonus_conquistas) * multiplicador_dificuldade
```

- `legend_score` = `LegadoFinal.legendScore` de `calcularLegado()`
  (`src/engine/mercado/legado.ts`) — recalibrado (retorno decrescente via `Math.sqrt` em
  vitórias/pódios/poles, limiares de `career_tiers` refeitos via `npm run sim:legado`)
  pra que uma carreira não chegue ao tier máximo só por acumular temporadas; ver commit da
  recalibração. Quem implementar esta fase não deve herdar suposição de escala antiga —
  o `legendScore` típico caiu bastante (de dezenas de milhares pra a casa de 150-700 numa
  carreira completa).
- **Tríplice Coroa dobra o `legend_score`** **[emenda]** — `personagem.joiasVencidas` com
  Mônaco + Indy 500 + Le Mans, as 3 (mesmo critério da conquista `triplice_coroa`). Vale só
  pro **ranking global**, não pro tier de carreira: `career_tiers`/"O IMORTAL" continuam
  sem gate de Tríplice Coroa (decisão da recalibração acima — GDD v2 §16 descrevia o topo
  como "tipicamente via Tríplice Coroa ou legado extraordinário", não como requisito, e a
  recalibração manteve os dois caminhos abertos). "O Imortal" é sobre a carreira em si; o
  multiplicador é sobre competir no ranking contra outros jogadores — são coisas
  diferentes. Regra nova desta revisão (decisão de produto, 12/09/2026); nenhuma PRD
  anterior documentava um multiplicador de ranking pra Tríplice Coroa (`GDD v2` §16 e
  `BRIEFING-CLAUDE-CODE-the-fenomeno.md` só falam do tier, não do ranking).
- `bonus_conquistas` = soma de `achievements.pontos_ranking` das conquistas desbloqueadas
  na carreira (`20260830211534_move_ranking_score_into_achievements.sql`) — escala por
  raridade (comum=1 … impossível=80), calibrada só pro caminho F1 ("Fase 1" da mesma
  migration; vale reconferir a proporção contra a escala nova de `legend_score` quando
  calibrar o resto). **A categoria `joias` inteira (`triplice_coroa`, `a_joia_da_coroa`,
  `rei_do_ovalo`, `sobreviver_24_horas`, `coroa_incompleta`) está com `pontos_ranking =
  NULL`** — deixada de propósito pra depois (comentário da migration). O multiplicador
  acima É a calibração de `triplice_coroa` — quando calibrar o resto de `joias`, não dar
  bônus aditivo de novo pra `triplice_coroa` também (duplicaria a recompensa da mesma
  conquista por dois mecanismos); as demais (joias individuais, coroa incompleta) continuam
  livres pra ganhar um valor aditivo normal.
- `multiplicador_dificuldade` vem de `public.dificuldade_multiplicadores`
  (`20260905233540_add_dificuldade_e_multiplicadores.sql`): amador=1.0, pro=1.4, lenda=1.6.

  **[emenda de 16/09/2026] Até esta data os três valores existiam na tabela mas só dois
  eram alcançáveis, e pelo rótulo errado.** `mapearDificuldadeParaBanco`
  (`src/data/pontuacaoRemoto.ts`) mandava `facil`+`normal` → `amador` e `pro` → `pro`:
  deslocado um degrau em relação aos três modos que a criação de personagem oferece
  (Amador/Pro/Lenda = `facil`/`normal`/`pro`). Ou seja, `lenda` nunca recebia ninguém,
  quem jogou "Lenda" entrava no ranking como `pro` e quem jogou "Pro" como `amador`.

  Passou despercebido porque nenhuma tela mostrava a dificuldade gravada — o filtro da
  `ranking_v2.md` é a primeira que mostra, e com o mapa torto ele nunca bateria com o modo
  que o jogador escolheu. Corrigido pra 1:1.

  **Consequência assumida (decisão de produto, 16/09/2026):** carreiras NOVAS em Pro
  passam a valer 1.4x (eram 1.0x) e em Lenda 1.6x (eram 1.4x). As linhas já publicadas em
  `jogadores.ranking` **não** foram recalculadas — pontuação de carreira encerrada é
  história, não estado. Quem comparar o leaderboard antes e depois desta data está
  comparando duas escalas.

Hoje esta fórmula só existe em comentário SQL
(`20260910185547_add_ranking_score_breakdown_columns.sql`, que ainda não conhece o
multiplicador de Tríplice Coroa) — documentada aqui porque `validar-ranking` (Fase D)
ainda vai precisar implementá-la.

### Comportamento de `validar-ranking`

1. Rate limit + Turnstile.
2. Valida o payload: `formatoVersao` conhecida, tamanho dentro do teto, rerolls
   dentro do teto do modo, seed pertence a uma temporada aberta.
3. **[emenda]** Compara `rulesetVersao` do payload com a da temporada. Divergiu →
   `409 RULESET_DIVERGENTE` (erro distinto de fraude, separável no log).
4. Reproduz a carreira rodando o motor com a seed, o snapshot e o log de decisões.
5. Compara a pontuação derivada com a enviada. Divergiu → `422 VALIDACAO_DIVERGENTE`,
   rejeita e loga.
6. Bateu, grava em `ranking`.

**[emenda de 16/09/2026] O passo 6 não é mais "grava", é "grava se for a melhor".** Passa
pela `jogadores.registrar_ranking` (ver a regra de unicidade acima), que pode aceitar a
carreira como legítima e ainda assim não mexer na linha, porque o recorde anterior da
mesma especificação é maior. **"Validou" e "entrou no ranking" deixaram de ser a mesma
coisa** — quem for implementar a Fase D completa, ou o app Kotlin, não pode tratar
`200 OK` como "minha pontuação está publicada": é `substituiu` na resposta que diz isso.

**[emenda de 16/09/2026] Categoria e dificuldade saem da CARREIRA, nunca do payload.**
São metade da chave de unicidade, e um cliente que escolhesse a própria chave escolheria
contra quem ele compete — bastaria declarar "lenda/indy" pra estrear em primeiro num
recorte vazio. Mesma família do princípio do §4.3 ("só decisão, nunca resultado"),
aplicada a um campo que o §4.3 não previa porque ele ainda não existia.

### Critério de aceite

- Carreira legítima é aceita.
- Payload com pontuação adulterada é rejeitado **com o código de fraude**.
- Payload com ruleset antigo é rejeitado **com o código de divergência** — os dois
  casos contáveis separadamente no log.
- Payload com mais rerolls que o teto do modo é rejeitado.
- Teste de ponta a ponta: simula carreira no cliente, envia, confirma que entrou.

**[emenda de 16/09/2026] Aceite da regra de unicidade** — os quatro casos, medidos contra
o Postgres em 16/09 antes de a regra entrar em produção:

- Carreira **pior** na mesma especificação: aceita, não substitui, resposta devolve a
  pontuação vigente.
- Carreira **melhor**: substitui, e a carreira anterior deixa de ter linha — a conta
  continua com exatamente uma.
- **Empate**: não substitui.
- Especificação **nova** (outra categoria ou outra dificuldade): cria linha própria, sem
  tocar nas outras.

Ainda **não** verificado de ponta a ponta: uma carreira encerrando de verdade pela Edge
Function nova, com sessão logada. A RPC foi medida direto no banco; o que falta é o
caminho inteiro do app até ela.

---

## 11. Sequência de execução **[emenda: mesclada com o PRD de fronteiras]**

| # | Entrega | Origem | Estado |
|---|---------|--------|--------|
| 1 | CLAUDE.md + PRDs emendados | fronteiras PR 1 | **feito** (`b7bf71b`) |
| 2 | Barrel do motor | fronteiras PR 2 = backend PR 1 | **feito** (`77869e2`) |
| 3 | Travas de lint (agora proteção de produção, ver §12) | fronteiras PR 3 | **feito** (`3372cc8`) |
| 4 | Fase A0 — extensões `.ts` no grafo + `ping-smoke` em Deno real | backend | **feito** (`c812a09`, `3051e85` — deploy validado, function apagada depois) |
| 5 | Screens → `features/splash` **[nome corrigido: splash, não bootstrap]** | fronteiras PR 4 | **feito** (`7fe127f`) |
| 6 | Narração: lugar reservado + fallback | fronteiras PR 6 | **feito** (`55dc328`) — adiantada, sem dependência das outras |
| 7 | Storage: chave da carreira + validação de forma **[versão v7 — ver nota. A chave de anon-id deixou de existir na linha 9, não migrou]** | fronteiras PR 5 | **feito** (`1d0948e`) |
| 7b | `main.tsx` sem guarda de HMR (`createRoot` dobrado) + validação de forma estendida a `temporada.rivais/calendario/equipes` e `personagem.atributosAtuais` | achado investigando o storage | **feito** (`1d0948e` + este commit) |
| 8 | Fase A — `sortear` | backend | **feito — deployado em produção e verificado contra Postgres real**, ver §6. **8.i, achado e corrigido:** faltava desempate explícito no `ORDER BY` do pool (cliente e Edge Function) — corrigido nas duas queries + no gerador de fixtures, snapshot de `sorteio.golden.test.ts` atualizado por motivo declarado |
| 8.ii | Cliente passa a consumir `sortear` (em vez de ler `drivers` direto) | backend, BLOCO 1 item 4 | **pausado de propósito, não bloqueador técnico** — a tela de criação vai ser reescrita a partir do Figma, e mexer na lógica de reroll agora significa refazer depois. Implicação do reroll determinístico (rodada N reroleda mantém `1..N-1`, reescreve `N..9`) registrada em §4.2 — decisão de UX fica pra quando a tela nova for desenhada. Também é o passo com risco de produção (troca a fonte de dados do fluxo de criação ao vivo): merece sessão própria com fallback planejado, não emendar na mesma sessão da Fase A. **[emenda de 04/08: este item é o portão da Fase B (linha 10) — enquanto estiver pausado, a política de RLS não pode ser aplicada. Ver §7.]** |
| 9 | Fase C — dropar `sorteio_draws` **[decisão revista: drop, não "apertar política" — ver §8]** | backend | **feito** — nos dois projetos Supabase |
| 9b | Auditoria de NPC (Fase 1+2): `is_npc` explícito no sorteio, grid migrado de `npcs` pra `pilotos` | auditoria de 01/08 | **feito** (`bfa30c8`) — consumo em `avancarMundoSombra` fica pendente, ver 11.i |
| 9c | `.env`/`.env.example` definitivos apontando pro `the-immortal`, sem swap temporário | auditoria de 01/08 | **feito** — este commit |
| 9d | **[emenda de 04/08]** Higienização do schema: drop de `npcs`, `driver_seasons`, `legend_traits`, `tracos_emergentes` e da coluna `team_drivers.car_number` (cópia exata de `drivers.car_number`) | higienização de 04/08 | **feito** — 5 migrations, racional no SQL de cada uma |
| 9e | **[emenda de 04/08]** Consolidação `drivers`/`pilotos`, Fases 1 e 2: coluna `drivers.equipe_id` + backfill + view atualizada; consumidores migrados e `team_drivers` dropada | consolidação de 04/08 | **feito** (PR #18). **Fase 3 pendente:** schema inteiro em PT-BR, drop da view `pilotos`, rename de `drivers` para `pilotos` |
| 10 | Fase B — filtro por linha em `drivers` **[emenda de 04/08: predicado agora é `equipe_id IS NOT NULL` — ver §7]** | backend | **bloqueada pelo 8.ii** |
| 11 | Fase E — determinismo no cliente **[versão v8, não v7 — corrigido]** | backend | **11.i, novo bloqueador:** decisão de como `avancarMundoSombra` consome `NpcSombra.atributos` — ver §9 item 4. Em avaliação pelo Wag |
| 12 | §10A — orquestração de carreira → motor | fronteiras/plano | bloqueia a D |
| 13 | Fase D — `ranking` + `validar-ranking` | backend | |

**Nota sobre a linha 7 (decidida pelo Wag em 01/08/2026):** o risco "alto" do save só
vale depois do lançamento — hoje só existem dois saves reais (Wag e Renan), e é
justamente por isso que a mudança de storage teve que entrar agora, enquanto é barata.
`VERSAO_ATUAL` foi a 7 (era 6): `migrarV6ParaV7` não muda o formato de `CarreiraState`
— é o checkpoint pós-higiene de storage (chave renomeada + validação de forma). A
Fase E (linha 11, `seed` + `decisoes[]`) fica reservada pra v8, migration separada por
motivo — infraestrutura de storage numa, dado de domínio na outra.

**Em todo PR:** `npm run lint && npm run typecheck && npm run test:all && npm run build`
passando, e nenhum snapshot de golden test alterado. Snapshot quebrado durante este
trabalho significa que lógica de jogo mudou — o que não é objetivo de nenhuma fase.

---

## 12. Riscos

**O motor precisa continuar rodando em Deno.** Após a Fase A0, roda. Um `import` de
Node introduzido por descuido no futuro quebra o servidor silenciosamente. Mitigação:
a trava de lint de motor puro (PRD de fronteiras, Fase 2) deixa de ser higiene e passa
a ser proteção de produção.

**Divergência entre plataformas.** Se o app Kotlin tiver motor próprio no futuro, os
dois precisam produzir resultado idêntico bit a bit a partir da mesma seed. Isso é
caro e se decide antes, não depois. Alternativa a considerar: o Kotlin também chama
`sortear` e `validar-ranking`, e simula localmente com a mesma lógica portada e
coberta pelos mesmos golden tests.

**Prazo.** Estamos a três meses do GP de São Paulo, com a reescrita de 40 telas em
paralelo. As fases A0 a C são pequenas e independentes da reescrita. A **Fase E é a
maior do lado cliente** e a D é a maior do lado servidor — se algo precisar ser
cortado, é a dupla E+D que vira "lançar sem ranking global e habilitar depois", não
as outras.

---

## Emenda — 07/10/2026: Tríplice Coroa vira bônus fixo no legado (P01, Progressão)

**Substitui o "Tríplice Coroa dobra o `legend_score`" desta seção — que nunca foi implementado.**
O corpo acima continua como registro da decisão da época.

- A Tríplice Coroa (Mônaco + Indy 500 + Le Mans, `joiasVencidas`) soma **+60** fixos ao
  `legendScore`, uma única vez; **2 de 3 soma +20** (não acumula com o +60). Constantes
  `BONUS_TRIPLICE_COROA`/`BONUS_COROA_INCOMPLETA` em `src/engine/mercado/config/legadoConfig.ts`.
  Dobrar o score inteiro dava pouco a um piloto fraco e centenas de pontos a uma carreira
  longa; o fixo é previsível e mostrável na tela.
- Junto, WEC e Indy passam a pontuar com bloco próprio: raiz própria de
  vitórias/pódios/poles por categoria, título em raiz (`√títulos × 40 × peso`), pesos
  Hypercar/Indy 0.4 e GT3 0.25. F3/F2/F1 seguem na mesma raiz de antes, e uma carreira só de F1 dá
  o mesmo `legendScore`, ponto a ponto. Calibrado no `sim:legado`: a primeira proposta (0.6 com
  título linear) levava 94,5% das carreiras simuladas ao tier 11.
- O que esta seção previa sobre a categoria `joias` continua valendo e agora vale nos dois lados:
  `pontos_ranking` segue NULL, e o cliente (`calcularBonusConquistas`) passou a somar 0 pra
  `joias`/`lenda`/`multiplo_indy`/`multiplo_lemans`, igual ao servidor — antes ele somava
  pela raridade e o "Pontos de legado" da tela não batia com o ranking.
- `validar-ranking` não muda (recebe o `legendScore` pronto). Carreiras já gravadas são
  recalculadas por `scripts/recalcular-pontuacao-legado.ts`, rodado à mão depois do deploy.
