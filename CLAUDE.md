# Hora do Banho

Corrida infinita (endless runner) 2D para todos os públicos. O jogador é o **cachorro**, que foge
do tutor para não tomar banho: pula e se abaixa por cidade, parque, rio e centro, cada vez mais
rápido. Cada lama traz o tutor um degrau para mais perto e a 4ª encerra a partida; lenços limpam.
Ossinhos e ossinhos de ouro valem pontos. Quem vai mais longe, com mais ossos, sobe no ranking.

Sessão curta: termina na primeira batida, queda ou quando o tutor alcança. Público livre, todas as idades. Conta, data e âncora de
lançamento: **a definir**.

> **Antes de qualquer coisa:** o Claude abre PR e para. Merge, deploy e mudança em produção
> são sempre do André — ver
> [Merge, deploy e produção](#merge-deploy-e-produção-são-do-andré--nunca-do-claude).

> Este arquivo nasceu do `CLAUDE.md` do THE IMMORTAL, sem os IDs e as regras do motor daquele
> jogo. As regras de processo vêm de erros reais que custaram caro lá. Campos entre `[colchetes]`
> são para preencher.

---

## Stack

- **Frontend:** React + Vite + Tailwind
- **Design system:** [pasta/pacote do DS — a definir]
- **Backend:** Supabase, região `sa-east-1` — projeto `hora-do-banho`, `[ID DO PROJETO — a definir]`.
  **Ainda não foi criado:** custa US$ 10/mês na organização do André, que adiou a criação em
  2026-11-08. O `the-immortal`, único projeto da conta, é de outro jogo: não usar. O job `deploy`
  lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` das variáveis do repositório; sem elas,
  o site sai sem ranking e nada acusa.
- **Hospedagem:** Cloudflare Workers static assets. Configure o fallback de rota com
  cuidado: um fallback que responde `200 text/html` para qualquer caminho também responde assim
  para `/assets/<hash>.js` de um deploy antigo, e o `import()` do chunk falha com erro de MIME em
  vez de 404. Se o app não tem router, prefira `404-page`.
  Worker `horadobanho`, configurado em `wrangler.jsonc` com `404-page` (o app não tem router).
  Publica pelo job `deploy` do CI, só em push na `main` e depois do `verificar`. Secrets do
  repositório: `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`. No ar desde 2026-11-07 em
  <https://horadobanho.aquinoweb-wag.workers.dev>. Domínio próprio: a definir.
  O token é de conta (`github-deploy-horadobanho`, template "Edit Cloudflare Workers") e
  **vence em 2027-11-06**. Vencido, o job `deploy` falha com erro de autenticação e o site fica
  parado na última versão, sem aviso para o jogador: gere outro antes e troque o secret. Token de
  conta não consegue descobrir a conta sozinho, por isso o `CLOUDFLARE_ACCOUNT_ID` é obrigatório.
- **API:** Supabase Edge Functions (`supabase/functions/`), na mesma região do banco.
- **Testes:** Vitest, com golden master no motor
- **Lint:** oxlint
- **PWA:** `vite-plugin-pwa`, `registerType: 'autoUpdate'`
- **Cascas das lojas:** `android/` (Kotlin + WebView própria + ponte JS↔nativo) e `ios/`
  (WKWebView, ainda não existe). Ver [Lojas e anúncios](#lojas-e-anúncios) e
  `PRD/PRD-casca-android-hibrida.md`. **Não usar TWA:** sem ponte JS, no THE IMMORTAL tudo virou
  parâmetro de URL e intent sem resposta. O sabor `producao` carrega o site publicado e é o único
  que vai pra Play; o `local` (só debug) embute o `dist/` para testar sem site
  (`android/README.md`).

Comunicação e nomes de arquivo/função em **português**. Comentário explica *por quê*, não *o quê*.

---

## Estrutura

```
src/
├─ engine/        motor do jogo — puro, determinístico (ver "Motor do jogo")
├─ data/          repositories, cliente Supabase, storage local, telemetria
├─ features/      domínio + estado + telas de cada área do jogo
├─ components/    componentes burros, sem conhecimento de domínio
├─ types/         tipos compartilhados de domínio
├─ i18n/          detecção de idioma e init do i18next
├─ locales/       copy da UI, {pt,en,es}/<namespace>.json
scripts/          simulações headless, fixtures, save de teste
tests/            golden masters do motor
supabase/         migrations versionadas, seeds, RLS e functions/
android/ ios/     cascas das lojas
PRD/              especificações de produto
```

---

## Motor do jogo

Regras do motor ficam **nesta seção**. Regra de motor espalhada por outras seções é regra que
alguém deixa de ler. Versão atual das regras: `VERSAO_REGRAS = 'r8'`.

### O jogo, como o motor vê

- Mundo 2D lateral. As 3 camadas do falso 3D são **só visuais** (parallax): o motor tem uma
  linha de corrida, com altura. Unidades: metros e segundos.
- O cachorro corre sozinho; o jogador só tem duas ações: **pular** e **abaixar** (no chão: fica
  baixo por `ABAIXAR_TICKS`; no ar: mergulho rápido e pousa abaixado). Pular no ar é o **pulo
  duplo** (r7): uma vez por pulo, dá de novo `VEL_PULO`; volta a valer ao tocar o chão. O log não
  distingue os dois: é o mesmo código `0`.
- Velocidade base `v(d) = VEL_MAX - (VEL_MAX - VEL_INICIAL)·VEL_K/(VEL_K + d)`: cresce rápido no
  começo e se aproxima do teto sem passar. A dificuldade continua subindo pelos degraus de
  `nivelEm` (moldes novos e menos respiro entre trechos).
- Elementos da pista (`src/engine/tipos.ts`):
  - `solido` (carro, caixa, cavalete, chafariz, marquise): bater de frente encerra; dá para pousar e correr
    em cima. Os que têm **perfil** (`src/engine/perfis.ts`: carro, tora, chafariz, banca) têm o
    topo no contorno da arte, e o cachorro sobe e desce por ele grudado; parede do contorno ainda
    bate. Os tamanhos seguem a régua do tutor (r5): 1 m de verdade = 1,79 m do jogo.
  - `teto` (placa, galho, toldo): só passa abaixado.
  - `vao` (rio, buraco, bueiro): sem chão; cair encerra.
  - `rampa`: sobe de 0 até `altura` ao longo da largura; não bate. O cachorro anda grudado na
    superfície com `vy = velocidade·inclinação` e, ao passar do fim, sai lançado com essa
    velocidade. Pular na rampa funciona normalmente.
  - `poca` (lama): +1 de sujeira. `lenco`: −1 de sujeira. `osso` / `ossoOuro`: pontos.
- **Tutor (r8):** a distância é um degrau fixo por nível de sujeira (`vantagemTutor`: 20, 15, 10 e
  5 m), sem aproximação gradual, e a lama não freia o cachorro. Ele aguenta `SUJEIRA_MAX` (3)
  poças; a seguinte é `pego`. Lenço tira 1 de sujeira: o tutor recua um degrau e sobra mais uma
  poça. A largura de vãos e poças segue `FATOR_ALCANCE_PISTA`, para a pista de cada seed não mudar.
- **Fim:** `batida`, `queda` ou `pego`. Não existe vida extra.
- **Pontuação:** `metros·PONTOS_POR_METRO + ossos·PONTOS_OSSO + ossosOuro·PONTOS_OSSO_OURO`.
- **Cenários:** sequência fixa e igual para todos (`SEQUENCIA_CENARIOS`: cidade → parque → rio →
  centro, e recomeça). Os obstáculos de cada trecho são sorteados pela seed da partida dentro dos
  moldes daquele cenário (`src/engine/cenarios.ts`).

### Regras técnicas

- **Passo fixo de 60 ticks/s.** `passo(estado, acao)` avança exatamente um tick; o motor nunca
  recebe "tempo decorrido". A UI acumula o tempo real e chama `passo` quantas vezes precisar.
- **Só aritmética básica na simulação** (`+ − × ÷`, `Math.floor/min/max/imul`). `Math.pow`, `exp`
  e trigonometria podem dar resultados diferentes entre motores JS, e o servidor precisa chegar
  no mesmo número que o celular. Animação e desenho podem usar o que quiserem: ficam na UI.
- **Aleatoriedade só em `src/engine/rng.ts`** (mulberry32, inteiros de 32 bits). O estado do rng
  mora dentro do `EstadoPartida`, que é dado puro: `structuredClone` copia a partida inteira (o
  bot de simulação depende disso). `Math.random()` fora do rng é proibido. Para ids,
  `crypto.getRandomValues()`. *Pendente: trava de lint para isso.*
- **Ranking por replay:** o cliente envia seed + log de decisões (`ComandoLog`: `[tick, 0 pular |
  1 abaixar]`), nunca o placar. `simularPartida(seed, log)` refaz a partida inteira e é a mesma
  função no navegador e na Edge Function. Log fora de ordem, tick repetido ou código desconhecido
  lança `LogInvalido`. Partidas acima de `TICKS_MAX` (30 min) são inválidas.
- **Motor puro:** não importa UI, DS, `data/`, `features/`; não toca em `localStorage`, `window`,
  `document` ou `fetch`. Imports internos com extensão `.ts` explícita (Node e Deno rodam direto).
- **Dependência numa direção só:** `screens → features → data → engine`. `components/` é folha.
- **Consumo pelo barrel** (`src/engine/index.ts`); só `scripts/` e `tests/` importam por dentro.

### Balanceamento e testes

- Toda constante de balanceamento mora em `src/engine/constantes.ts`. Mudou uma → sobe
  `VERSAO_REGRAS`, roda a simulação e mostra o antes/depois no PR.
- `tests/motor.golden.test.ts` é **contrato**: seed fixa entra, resultado fixo sai. Snapshot que
  quebra num refactor significa refactor errado. Só se atualiza quando mudar o jogo é o objetivo
  declarado, junto com `VERSAO_REGRAS` nova.
- `tests/pista.sim.test.ts` garante que a pista é passável: o bot sobrevive 60 s em várias seeds.
  Falhou = o gerador montou um trecho impossível.
- **Balanceamento se valida com simulação em volume**, não com uma partida no navegador:
  `npm run sim:partidas -- --partidas 30 --minutos 5`. O bot (`scripts/bot.ts`) olha o futuro e
  joga melhor que qualquer pessoa: é o teto de habilidade, não o jogador médio. A simulação também
  reproduz cada log com `simularPartida` e acusa divergência de determinismo.
- Referência r8 (30 partidas do bot, 5 min cada): mediana 4,1 km, 12 de 30 pegos e 18 no limite.
  A mediana bate no teto de 5 min, então não mede até onde o bot iria.
- Referência r7 (30 partidas do bot, 5 min cada): mediana 3,6 km, 22 de 30 pegos e 8 no limite.
  r5 e r6 ficaram iguais em distância (3,6 km); detalhe em `PRD/PRD-conceito-e-regras-do-jogo.md` §5.
- Referência r4 (30 partidas do bot, 5 min cada): mediana 3,8 km, 23 de 30 pegos pelo tutor e 7
  no limite de tempo. Referência r3: mediana 3,7 km, 23 pegos e 7 no limite. Referência r2: mediana 3,7 km, 22 pegos e 8 no limite. Referência r1 (10 partidas do bot, 10 min cada): mediana 4,3 km; 8 de 10 terminam com o tutor
  alcançando, porque alguns trechos do centro forçam lama.

### Decisões em aberto

- Batida e queda encerram na hora. Alternativa: tropeço que só custa vantagem.
- A seed de partida para o ranking: sorteada pelo servidor a cada partida (protege contra
  escolher seed fácil) ou seed diária igual para todos.
- Valores de pontos, velocidades e sujeira são primeira tentativa, sem teste com pessoas.

---

## Save do jogador

[Onde mora o save: `localStorage`, conta, ambos.]

Se houver save local versionado (`VERSAO_ATUAL` + migrations encadeadas `migrarV<n>ParaV<n+1>`):

1. Mudou o formato do estado salvo → incrementa a versão e escreve a migration com defaults neutros.
2. **Nunca mude o formato sem migration.** Alguém está no meio de uma partida agora.
3. **Migration por motivo, não por lote.** Não pegue carona numa migration que existe por outro
   motivo. E não reserve número de versão com antecedência: ele envelhece.
4. Guarda de versão futura (save mais novo que o jogo → trata como inexistente) existe porque
   rollback de deploy é real. Não remova.
5. Validação de forma depois das migrations: campo obrigatório ausente → `null`, como save
   corrompido, em vez de crashar numa tela aleatória.
6. Renomear chave do `localStorage` só por uma função compartilhada que lê a antiga, grava a nova
   e remove a antiga.

---

## Supabase: migrations

### Toda migration aplicada precisa do arquivo no mesmo PR

`apply_migration` (MCP) grava no banco mas **não escreve arquivo no repo**. Aplicar sem versionar
faz banco e repositório divergirem em silêncio. Toda sessão que aplicar migration ou rodar DDL
termina comparando `list_migrations` contra a pasta:

```bash
# versões só no banco — qualquer linha impressa aqui é arquivo faltando
comm -23 <(echo "$VERSOES_DO_list_migrations" | sort) <(ls supabase/migrations | sed -E 's/^([0-9]{14})_.*/\1/' | sort)
```

O nome do arquivo é `<version>_<name>.sql` com a versão **exata** do ledger
(`supabase_migrations.schema_migrations`). Timestamp inventado é pior que arquivo ausente: o
`db push` tenta reaplicar.

### Migration vai pro ar pelo CLI, não pelo MCP

`apply_migration` grava a versão da hora do apply, não a do nome do arquivo, e cada migration
pedia um segundo PR só pra renomear. `supabase db push` grava a versão do nome do arquivo.

**O Claude:** escreve a migration com `date -u +%Y%m%d%H%M%S` (maior que a última versão do
ledger) e põe no corpo do PR, como tarefa manual do André:

```powershell
npx supabase@[versão] db push --db-url $env:SUPABASE_DB_URL --dry-run
npx supabase@[versão] db push --db-url $env:SUPABASE_DB_URL
```

O `--dry-run` tem que listar **exatamente** as migrations do PR. Lista a mais = arquivo sem
versão no ledger: pare e pergunte. `SUPABASE_DB_URL` vive só na sessão do terminal, nunca no repo.

### DDL por `execute_sql` é invisível

O setdiff compara versões; DDL rodado direto por `execute_sql` não registra versão nenhuma e
passa limpo. **Use `apply_migration`/arquivo para qualquer DDL.** A checagem que pega DDL
escapado é reconstruir: criar uma **branch do Supabase** (reaplica a pasta num banco vazio) e
comparar `information_schema.columns` contra produção. Faça isso cedo e de vez em quando: no
projeto anterior, a pasta "reconstruía o schema" no papel e falhou em 54 de 87 migrations quando
alguém finalmente testou.

---

## Supabase: Edge Functions

- **Edge Function é exceção.** Só vira function o que exige dado que o cliente não pode ter, ou
  o que precisa ser verdade sem confiar no cliente (validação, rate limit, recompensa). O resto
  roda no navegador: latência, offline e custo dependem disso.
- **Function também consome schema.** Ao dropar tabela/coluna, procure nas functions também.
- **JWT do chamador: use `auth.getUser(token)`, nunca `global.headers` do `createClient`.** O
  supabase-js já semeia `Authorization` com a chave anon; um `authorization` minúsculo vira um
  segundo header, os valores são concatenados e o Auth server recusa tudo com
  `401 no_authorization`, sem log de usuário. Parece "sessão expirada" e não é.
- **`verify_jwt` é decisão de produto e só sobrevive no repo.** A ferramenta de deploy tem
  default `true`: redeploy sem o valor certo troca a autenticação em silêncio. **Todo `index.ts`
  declara no cabeçalho o `verify_jwt` esperado.** Funções chamadas por cron, pelo Google (SSV) ou
  sem sessão rodam com `false` e se defendem por assinatura, segredo no Vault ou rate limit.

| Função | `verify_jwt` | Defesa |
| --- | --- | --- |
| `registrar-partida` | `false` | Sem login: refaz a partida com o motor (seed + log), nunca aceita placar; rate limit por IP (`contar_envio_ip`, 10/min). Turnstile pendente. |

- **Toda sessão que deployar function termina comparando produção contra o repo:**

```bash
# slugs em produção sem pasta no repo — qualquer linha impressa aqui é função órfã
comm -23 <(echo "$SLUGS_DO_list_edge_functions" | sort) <(ls supabase/functions | sort)
```

- **Versão do supabase-js pinada no specifier do import** (`jsr:@supabase/supabase-js@x.y.z`),
  nunca `@2` solto: cada deploy resolveria uma versão diferente sem ninguém decidir. `deno.lock`
  não resolve, porque não sobe no deploy.
- Segredos (`service_role`, tokens de API) só como secret de function ou no Vault. Nunca em
  migration, nunca no bundle.

---

## Custo de IA (se houver IA em runtime)

- Teto de chamadas por sessão/partida definido em PRD, não por evento.
- Prompt caching obrigatório no contexto estável.
- Todo caminho com fallback estático: API fora do ar não pode travar o jogo.
- IA nunca influencia o resultado do motor; ela descreve.
- Nunca no precache do service worker. Chave nunca no bundle.

---

## Ranking e anti-fraude (se houver ranking)

- O payload carrega **decisões, nunca resultados**. O servidor recalcula rodando o mesmo motor.
- Versões separadas: formato do payload, dados de referência, e regras (hash das constantes de
  balanceamento gerado no build, com teste que falha se a constante mudar sem a versão mudar).
- Rejeição por versão ≠ rejeição por fraude: códigos de erro distintos, contados separados.
- Id anônimo gerado no cliente é só agrupamento de telemetria, nunca segurança. Defesa real:
  rate limit por IP + captcha (ex.: Turnstile) no servidor.
- Tabela de ranking não legível direto pelo cliente quando houver jogadores simulados: leitura
  só por RPC `security definer`.
- **Como está hoje:** `public.ranking` guarda uma linha por jogador com a partida **mais longa**
  (empate: mais pontos), mais seed + log para auditoria. O jogador é um id anônimo do aparelho, no
  **IndexedDB**, não no `localStorage`: o backup da casca Android leva o `localStorage` da WebView
  para o aparelho novo, e o id clonado faria dois aparelhos gravarem como o mesmo jogador. O cliente lê pela RPC `ranking_top` (sem `jogador_id`: com ele, qualquer um gravaria
  no lugar de outro) e grava só pela Edge Function `registrar-partida`, que chama
  `registrar_partida` com `service_role`. A regra do nome (`normalizarNome`/`nomeValido`) mora no
  motor para valer igual no navegador e na function. Sem `VITE_SUPABASE_URL` no build, o ranking
  some da tela e o jogo segue.
- **Pendentes:** seed emitida pelo servidor (hoje o cliente sorteia), Turnstile, filtro de nome
  ofensivo, e o que fazer com o ranking quando `VERSAO_REGRAS` mudar (hoje mistura versões).

---

## Lojas e anúncios

O jogo é web; as lojas recebem cascas finas. Mudança no jogo vai pro ar com o deploy do site.
Versão nova de loja só quando a casca muda (ícone, permissões, SDK nativo). Detalhes e checklist:
`android/README.md`, `ios/README.md` e `LICOES-LOJAS-E-ANUNCIOS.md`.

1. **A casca anuncia o que sabe fazer.** No Android, pela ponte: `versaoCasca()` devolve a lista
   de `capacidades` (PR 2 da casca). Sem a ponte, ou sem a capacidade na lista, o site assume
   casca antiga ou navegador. Nunca presuma a capacidade.
2. **Recompensa só no servidor (SSV).** Nonce criado pelo site, AdMob chama a Edge Function, que
   confere a assinatura do Google. Nada é concedido no aparelho.
3. **Bloco de anúncio novo = PR que adiciona o ID na lista da função SSV, antes de publicar a
   casca.** Bloco fora da lista é ignorado em silêncio: o jogador assiste e não ganha. ID de bloco
   é constante no código (não é segredo), não variável de ambiente. Todo callback ignorado é
   logado com o motivo.
4. **Intersticial premiado exige tela de aviso antes**, com opção de recusar. Trocar de formato
   = trocar também os IDs de teste do Debug.
5. **Frequência de intersticial conta por partida/sessão**, não por ação que pode ficar mais rápida.
   Primeira partida do aparelho sem anúncio.
6. **iOS: `WKAppBoundDomains` bloqueia o SDK do AdMob.** Tirar a lista libera o anúncio e mata o
   cache offline no WKWebView. Decisão a tomar e registrar aqui: [decisão].
7. **Android: dentro da WebView só roda a origem do jogo** (`BuildConfig.ORIGENS_PERMITIDAS`,
   lida pelo `ClienteWeb` e pela ponte). Link para fora abre em Custom Tab. Domínio novo entra na
   lista **antes** de o site mudar de endereço, senão o app abre o próprio jogo numa aba externa.
8. Consentimento: UMP antes do primeiro anúncio onde a lei exigir; no iOS também ATT. Item no
   Perfil reabre o formulário.
9. Build Release das cascas falha se faltar secret de anúncio: nunca publicar com ID de teste.
10. Chave de upload Android em dois cofres fora do repo. Play App Signing ligado. `assetlinks.json`
    só se houver App Links verificados, e então com as duas impressões digitais.

---

## Comandos

```bash
npm run dev
npm run lint            # lint + verificador de fronteiras
npm run typecheck
npm run test            # golden master do motor
npm run test:all
npm run build
```

**Antes de abrir qualquer PR:**
```bash
npm run lint && npm run typecheck && npm run test:all && npm run build
```

**Testes contra fixtures não provam que o banco funciona.** Mantenha smokes que batem no Postgres
real com a chave publishable (a mesma do navegador), fora da suíte padrão. São o único jeito de
pegar uma RLS que fecha demais. E um smoke que codifica o mundo antes da mudança não é portão:
reescreva a asserção para valer nos dois regimes.

---

## Segurança

- `.env` e `.mcp.json` no `.gitignore`. Versionado só `.env.example` (e, se precisar, um
  `.env.production` com **apenas** URL e chave publishable).
- A chave do frontend é a publishable. A proteção real é RLS.
- **Tabela nova nasce com RLS.** `WITH CHECK (true)` em INSERT é ausência de política.
- **Tabela gravável nasce com zero política de INSERT/UPDATE para o cliente.** Quem escreve é
  Edge Function com `service_role`. Nunca "abre e aperta depois".
- **Sempre `with (security_invoker = true)` em todo `create or replace view`.** O replace descarta
  a opção sem aviso e a view passa a atravessar a RLS. Selo `UNRESTRICTED` no painel = alarme.
- Rodar o advisor de segurança do Supabase depois de cada migration.

**Família de erro a reconhecer:** proteção que parece instalada e não protege (`security_invoker`
perdido, `config.toml` que o deploy nunca lê, `deno.lock` que não sobe). É pior que ausência de
proteção, porque ninguém procura mais.

---

## Internacionalização

Português, inglês e espanhol (pt/en/es) desde a primeira tela. Fallback: português.

- Nenhum texto de UI literal no JSX nem em `features/`. Copy em `src/locales/{..}/<ns>.json`.
- O idioma-fonte gera o tipo das chaves: chave inexistente não compila. Teste confere que toda
  chave existe em todos os idiomas, com as mesmas variáveis.
- O motor não tem idioma. Traduz na exibição, não no dado gravado.
- Número e ordinal por `toLocaleString(localeAtual())`; contagem por plural do i18next
  (`{ count }`, com `_zero` quando o zero existe).

---

## Estilo

- CSS via tokens do DS. Sem hex, px de espaçamento ou font-size soltos. Token novo nasce no DS.
- Sem `style={{...}}` para valor de design. Exceção: valor calculado em runtime, passado como
  custom property (`style={{ '--progresso': v }}`) com a regra no `.css`.
- Toda tela em `features/*/screens/` tem pasta própria com `Tela.tsx` + `tela.css`.
- Componente que conhece conceito do domínio pertence a `features/`, não a `components/`.
- Antes de escrever componente novo, verifique o DS.
- Bottom sheet, não navegação cheia, para detalhe no meio do fluxo.
- **Sem router, troca de tela precisa resetar o scroll** (hook no componente que decide a tela).
- **O jogo é sempre desenhado na proporção de celular deitado (780 × 360, 19,5:9).** `App.tsx`
  envolve tudo na `.moldura-celular` (`global.css`), o maior retângulo nessa proporção que cabe na
  janela; o resto vira faixa. A moldura define `--altura-tela`, e toda tela mede o resto pelo
  próprio contêiner (`cqh`/`cqw`, `clientWidth`). Tela nova não usa `vw`/`vh`, `window.inner*` nem
  `position: fixed`: tudo isso escapa da moldura.
- **Altura de tela é `var(--altura-tela, 100svh)`**, não `100svh` puro: somado ao padding de
  safe-area, o documento fica maior que a tela no iPhone. No desktop o erro não aparece.

---

## Voltar nativo

Sem router e sem nada empurrado na History API, o voltar do celular **fecha o app**, inclusive
com um bottom sheet aberto. Desde a primeira tela:

- Um hook de camadas (ex.: `useVoltarNativoEmCamadas`) com **pilha única no módulo**, não por
  instância: um voltar é entregue só a quem está no topo.
- O botão de voltar **em tela** chama `history.back()`, não o callback de fechar direto.
- Toda tela ou camada nova que abre por cima de outra entra na tabela abaixo.

| Camada | Como |
| --- | --- |
| Pausa e fim de partida (sobreposições da `TelaCorrida`) | **pendente:** ainda não entram no histórico; o voltar do celular fecha o app |
| História e corrida abertas pela home (`App.tsx`) | **pendente:** o voltar do celular fecha o app em vez de voltar para a home |

Nada disso aparece em lint, typecheck ou CI, nem no desktop. Só no celular, na PWA instalada.
Verificação manual: abrir a camada, ler `history.length`, chamar `history.back()`.

---

## Merge, deploy e produção são do André — nunca do Claude

O Claude abre PR e para ali. Vale em qualquer ferramenta (git, `gh`, MCP do GitHub, MCP do
Supabase, `wrangler`, API do Cloudflare). No projeto anterior, sessões do Claude mergearam PRs
sozinhas (uma 2 minutos depois de aberta, antes do CI) e aplicaram migrations em produção antes
do merge. Nada disso derruba CI, por isso vira regra escrita.

1. **Nunca mergear PR**, nem com auto-merge. Permissão não passa de uma sessão para outra.
2. **Nunca fazer deploy manual.** O único caminho é merge na `main` → build automático.
3. **Nada em produção no Supabase antes do merge**, e só com pedido explícito na sessão. A
   aplicação vai no corpo do PR como tarefa manual, com o passo a passo.
4. **Nunca commitar na `main`** nem `push --force` em branch com PR aberto.
5. **Não reaproveitar branch de PR já mergeado** (squash não leva os commits; dá conflito).
6. Commit e PR não anunciam produção como fato consumado.

Se uma tarefa parecer exigir quebrar uma destas regras, pare e pergunte.

---

## Ao trabalhar neste repo

- PRDs em `PRD/` são a fonte da verdade de produto. Leia o relevante antes de implementar.
- PRDs também são registro histórico: instrução de conexão dentro de um PRD é superada por este
  arquivo. Documento obsoleto leva aviso no topo; o corpo não é reescrito.
- Mudança que afeta balanceamento: rode a simulação e mostre o antes/depois.
- Na dúvida entre duas arquiteturas, escolha a que mantém o motor puro.
- Toda lição que custou um ciclo de depuração vira parágrafo neste arquivo, com o porquê.
