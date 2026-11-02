# PRD — Fronteiras arquiteturais e blindagem do motor

**Projeto:** THE IMMORTAL
**Repo:** `aquinowag/theimmortal`
**Status:** pronto para execução
**Autor:** Wag
**Contexto:** auditoria da estrutura feita em 31/07/2026 sobre o estado real do `main`
**Emendas:** 31/07/2026, após verificação das travas contra o código. Sete pontos
ajustados — marcados com **[emenda]** ao longo do texto. Nenhuma decisão original foi
revertida; o que mudou foi precisão de escopo e uma conclusão de §10 que deixou de valer
com card e ranking entrando no lançamento.

---

## 1. Por que este PRD existe

A arquitetura do projeto já está boa. O motor está isolado da UI, os golden tests
existem, o save tem migrations versionadas e o PWA está configurado. Este PRD **não**
é uma reestruturação — é a colocação das travas que impedem essa arquitetura de se
degradar nos próximos três meses de iteração acelerada até o GP de São Paulo.

O risco não é o código de hoje. É o de outubro, depois de cem commits sob pressão de
prazo, quando ninguém mais lembra qual era a regra.

**Princípio que orienta tudo abaixo:** convenção que não é verificada por máquina não
é convenção, é intenção. Toda regra deste documento precisa virar lint, teste ou
falhar no CI.

**[emenda] Relação com o plano de reestruturação.** Existe um plano maior, já aprovado,
que extrai `packages/core` e sobe a API como Worker separado. Os seis PRs deste
documento vêm **antes** dele, e não conflitam: a Fase 1 aqui (barrel do motor) é
literalmente o primeiro passo de extrair um pacote — um pacote precisa de superfície
pública de qualquer jeito. Card e ranking são escopo de lançamento, então `packages/core`
e `worker/` acontecem antes de novembro, depois destes seis PRs.

---

## 2. O que NÃO deve ser mexido

Explicitamente fora de escopo. Não refatorar, não "melhorar de passagem":

- `vite.config.ts` e a configuração do PWA — está correta.
- `src/data/carreiraStorage.ts` — as migrations v1→v6 estão certas. Só há mudanças
  pontuais autorizadas, descritas na Fase 4.
- `.github/workflows/ci.yml` — só acrescentar step, nunca reescrever.
- `tests/*.golden.test.ts` e os snapshots. **Se um snapshot quebrar durante este
  trabalho, o refactor está errado — não atualize o snapshot.** Isso é regra dura:
  o snapshot é o contrato de balanceamento do jogo.
- `packages/fast-ds` — design system, escopo próprio.

**[emenda] Acoplamento a conhecer antes de começar.** O golden master de carreira
(`tests/carreira.golden.test.ts`) importa de `scripts/simulate-carreira-completa.ts`,
que importa de `src/features/carreira/adapters/`. O contrato de balanceamento hoje
atravessa `features/`. Consequência prática: um PR que mexa nesses adapters pode quebrar
snapshot **sem que o motor tenha mudado**. Se isso acontecer, a leitura correta não é
"o balanceamento mudou" nem "atualize o snapshot" — é que a cadeia de dependência está
torta, e o §10A trata disso.

---

## 3. Fase 1 — Barrel do motor (fronteira de saída)

### Problema
`src/engine/` não tem `index.ts`. Hoje a UI importa arquivos internos do motor por
caminho profundo (`engine/corrida/...`, `engine/mercado/...`). Isso significa que
qualquer reorganização interna do motor quebra a UI, e que não existe superfície
pública definida — tudo é público por acidente.

### Entregável
Criar `src/engine/index.ts` exportando **apenas** o que a UI legitimamente consome.

**Como decidir o que entra:** rodar um levantamento de todos os imports de `engine/`
feitos de fora de `src/engine/` (ou seja, em `src/features/`, `src/screens/`,
`src/components/`, `src/data/`, `scripts/`, `tests/`). O que é importado de fora hoje,
entra no barrel. O que não é, permanece interno.

Depois, reescrever todos os imports externos para apontar para o barrel.

**[emenda] Levantamento já feito.** São 70 linhas de import em 35 arquivos. A superfície
é dominada por tipos: `corrida/types` (21 ocorrências) e `types` (15) sozinhos são mais
da metade. Isso é bom sinal — significa que a UI consome sobretudo o vocabulário do
domínio, não a mecânica.

### Critério de aceite
- `src/engine/index.ts` existe e re-exporta funções e tipos, sem lógica própria.
- Nenhum arquivo fora de `src/engine/` importa um caminho profundo de engine.
- `npm run test:all` passa sem alterar nenhum snapshot.
- `npm run typecheck` limpo.

### Observação
`scripts/` e `tests/` **podem** importar caminhos profundos, se necessário — são
consumidores privilegiados do motor, não da aplicação. Mas prefira o barrel também
neles quando não custar nada.

---

## 4. Fase 2 — Travas de lint

### Problema
`.oxlintrc.json` tem duas regras. As invariantes que sustentam o jogo — determinismo
do RNG e pureza do motor — não são verificadas por nada.

### Entregável

Acrescentar ao `.oxlintrc.json` (sem remover as regras existentes):

**Trava A — RNG único.**
`Math.random()` só pode existir dentro de `src/engine/rng.ts`. Em qualquer outro
arquivo do projeto é erro de lint.

Motivo: o ranking semanal com seed compartilhada exige que a mesma seed produza
exatamente a mesma carreira em qualquer dispositivo. Uma única chamada a
`Math.random()` fora do rng quebra isso silenciosamente — não dá erro, não quebra
teste, só produz rankings incomparáveis.

**[emenda] A trava acusa duas violações reais hoje. As duas têm correção, e a trava
fica absoluta — sem exceção.**

- `src/data/gerarId.ts:14` — fallback de UUID para quando `crypto.randomUUID()` não
  existe. O motivo documentado é legítimo (contexto não-seguro, ex.: testar no celular
  via `http://192.168.x.x`), mas a solução está errada: `crypto.getRandomValues()`
  funciona em contexto não-seguro. Só `randomUUID` e `subtle` exigem HTTPS. Trocar
  remove o `Math.random()` sem perder o fallback.
- `src/features/criacao/components/usePilotoRevelado.ts:34` — animação que cicla nomes
  durante a revelação do sorteio. Cosmético, não toca simulação. Passar a usar
  `rngPadrao` do motor satisfaz a regra e é o que o CLAUDE.md já manda fazer.

**Trava B — motor puro.**
Arquivos dentro de `src/engine/` não podem importar:
- `react`, `react-dom`, nem nada de `packages/fast-ds`
- `src/data/`, `src/features/`, `src/screens/`, `src/components/`
- APIs de browser: `localStorage`, `sessionStorage`, `window`, `document`, `fetch`

Motivo: o motor precisa rodar em Node (os `scripts/sim:*` dependem disso) e precisa
ser determinístico. Qualquer uma dessas dependências mata uma das duas propriedades.
Com a API como deployable separado, há um terceiro motivo: o mesmo código roda no
Worker para recalcular o legado server-side.

**[emenda] Verificado: o motor passa limpo hoje.** Zero ocorrências de qualquer item
da lista. Mas há uma dependência externa que a trava não menciona e precisa ser
decidida: cinco arquivos de `src/engine/mercado/` importam tipos de
`src/types/carreira.ts`. São `import type`, apagados por `verbatimModuleSyntax`, então
não existe dependência em runtime — mas a afirmação "o motor não conhece ninguém" é
falsa enquanto isso existir. Duas saídas: declarar `src/types/` exceção explícita da
trava, ou mover `types/carreira.ts` (185 linhas de modelo de domínio) para dentro do
motor. A segunda é a certa; até acontecer, a trava permite `src/types/` e **só** ele,
e só em `import type`.

**Trava C — direção de dependência.**

**[emenda] A trava original só restringia `src/data/`, o que deixa passar a violação
que existe. Matriz completa:**

| De | Não pode importar |
|---|---|
| `src/engine/` | tudo, exceto `src/types/` em `import type` (ver Trava B) |
| `src/data/` | `features/`, `screens/`, `components/` |
| `src/components/` | `features/`, `screens/`, `data/` |
| `src/features/` | `screens/` |

A seta aponta numa direção só: `screens → features → data → engine`, com
`components/` como folha fora da cadeia.

Violação real hoje: `src/components/CardPiloto.tsx:2` importa `LABEL_ATRIBUTO` e
`COR_TEXTO_FAIXA` de `features/criacao/atributoLabels`. Um "componente burro" que
conhece domínio. Corrigir junto — ou o componente deixa de conhecer os labels
(recebe por prop), ou ele deixa de ser burro e vai para `features/`.

### Implementação
Se o oxlint da versão instalada não suportar alguma dessas travas nativamente
(especialmente restrição de import por diretório), **não force**. Implemente como um
script de verificação em `scripts/verificar-fronteiras.ts`, adicione um npm script
`lint:fronteiras`, e chame no CI. O importante é falhar no CI, não a ferramenta.

### Critério de aceite
- As três travas falham quando violadas deliberadamente (teste manual: introduza uma
  violação, confirme que quebra, reverta).
- `npm run lint` passa no código atual. **Se alguma trava acusar violação real no
  código existente, corrija o código — não relaxe a trava.** Documente no PR o que
  foi encontrado.
- CI executa a verificação.

---

## 5. Fase 3 — Um domicílio por tipo de arquivo

### Problema
Screens moram em dois lugares:
- `src/screens/` → só `SplashScreen.tsx`
- `src/features/carreira/screens/` → as sete telas reais do jogo

Isso é ambíguo por acidente histórico, não por decisão. Daqui a dois meses ninguém
sabe onde criar a próxima tela.

### Decisão
**Screens pertencem à feature.** Cada tela vive em `src/features/<feature>/screens/`.
`src/screens/` na raiz deixa de existir.

`SplashScreen` não é de carreira — é bootstrap da aplicação. Mover para
`src/features/splash/` junto com `useSplashBootstrap.ts` e `splash-screen.css`.
**[emenda]** Nome decidido pelo Wag em 31/07: `splash`, não `bootstrap`.

### Entregável
- Criar `src/features/splash/` com os três arquivos vindos de `src/screens/`.
- Remover `src/screens/`.
- Atualizar imports em `App.tsx` e onde mais aparecer.

**[emenda] Ajuste na Trava B junto com esta fase.** A Trava B (PR 3) lista
`src/screens/` como diretório proibido, e este PR o apaga. Ao fechar este PR, remova
`src/screens/` da lista da trava — senão fica uma regra citando um caminho que não
existe, que é ruído para quem ler daqui a dois meses.

### Critério de aceite
- `src/screens/` não existe mais.
- App roda: splash aparece, carreira inicia, snapshots intactos.

---

## 6. Fase 4 — Higiene do storage

### Problema A — chave legada
`carreiraStorage.ts` usa `CHAVE_STORAGE = 'thesenna:carreira'`. Nome do projeto
antigo. Cosmético, mas o projeto já se chama THE IMMORTAL em todo o resto.

### Decisão
Renomear para `theimmortal:carreira`, **com migração de chave**, não com troca seca.

Ao ler: se a chave nova não existir mas a antiga existir, ler da antiga, gravar na
nova, remover a antiga. Depois seguir o fluxo de migrations normal.

Isso é obrigatório: existe gente com carreira em andamento no localStorage. Troca seca
apaga a carreira de todo mundo, e sem conta não há recuperação.

**[emenda de 31/07] São duas chaves, não uma.** `src/data/anonId.ts` usa
`'the-senna:anon-id'` — prefixo diferente do outro (`the-senna:` vs `thesenna:`), e
não citado na versão original. Migrar para `theimmortal:anon-id` na mesma passada,
com a mesma lógica de leitura-e-regravação. Perder essa chave não apaga carreira, mas
quebra a continuidade da telemetria do jogador: ele vira um usuário novo em
`sorteio_draws`, e a série histórica do funil de criação fica com um degrau falso.

**[emenda de 01/08 — decisão revertida, mas por um motivo diferente do previsto.**
A migração da chave de anon-id foi implementada em `1d0948e` como descrito acima —
mas ficou obsoleta no mesmo dia: `sorteio_draws` foi **dropada**, não protegida (ver
`PRD-backend-sorteio-ranking.md` §8 — o sorteio virando determinístico e server-side
tornou cada linha de telemetria redundante). `anonId.ts` e a migração de chave dele
foram removidos junto, já que a telemetria era seu único consumidor. A migração da
chave de **carreira** continua de pé — é ela que protege save de jogador real, o
motivo original deste problema. O aprendizado que fica: nem toda dívida documentada
precisa ser paga do jeito planejado — às vezes o código ao redor muda e a dívida
inteira deixa de existir.**

### Problema B — migrations sem validação
As funções `migrarV*` recebem `any` e o retorno é castado para `CarreiraState` sem
verificação. Um save parcialmente corrompido (campo faltando, tipo errado) passa pelo
cast e só quebra em runtime, numa tela aleatória, difícil de rastrear.

### Decisão
Adicionar uma validação de forma **no final** de `lerCarreiraSalva()`, depois de todas
as migrations: verificar que os campos obrigatórios de topo existem e têm o tipo certo
(`versao`, `personagem`, `temporada`, `contratoAtual`, `historico`, `statusCarreira`).

Se falhar, retornar `null` — mesmo tratamento do save corrompido. É melhor o jogador
perder a carreira na abertura, com o jogo funcionando, do que crashar no meio da
temporada.

Não introduzir dependência de validação (zod etc.) para isso. Uma função manual de
~20 linhas resolve e não pesa no bundle mobile.

### Critério de aceite
- Save gravado com a chave antiga é lido, migrado e regravado na chave nova — para as
  duas chaves.
- Save com campo obrigatório removido retorna `null` em vez de crashar.
- Adicionar teste em `tests/` cobrindo os casos acima.

---

## 7. Fase 5 — Lugar reservado para a narração

### Contexto
A narração por IA ainda não existe no código. Quando entrar, ela é o item de custo
mais crítico do projeto: na configuração errada, o custo por sessão excede a receita
por sessão e crescer passa a destruir valor.

Não implemente a narração agora. **Reserve o lugar certo**, para que quando ela entrar,
entre estruturada.

### Entregável
Criar `src/data/narracao/` com:

- `README.md` interno documentando as invariantes:
  - máximo de **3 chamadas por carreira** (não por corrida, não por temporada)
  - prompt caching obrigatório no bloco de contexto estável
  - todo caminho de chamada precisa de fallback para narração estática
  - a narração **nunca** entra no precache do service worker
  - nenhuma chamada de narração pode influenciar o resultado da simulação — o motor
    decide, a narração descreve. Se a narração falhar, o resultado é idêntico.
  - **[emenda]** a chave da API nunca vai para o bundle: a chamada sai do Worker, com
    a chave em secret. Nada com prefixo `VITE_`.
- `fallback.ts` com as narrações estáticas por tipo de evento (vitória, pódio,
  abandono, título, aposentadoria). Isso é útil hoje e é o caminho de degradação
  amanhã.

### Critério de aceite
- Diretório criado, `fallback.ts` funcional e coberto por teste.
- Nenhuma chamada de rede introduzida nesta fase.

---

## 8. Fase 6 — CLAUDE.md

Criar `CLAUDE.md` na raiz do repo.

Ele documenta as regras acima em formato que o Claude Code lê a cada sessão. Sem ele,
as travas de lint pegam a violação depois do fato; com ele, ela não é escrita.

**[emenda] Correções aplicadas na versão commitada:**
- Hospedagem é **Cloudflare Workers static assets**, não Cloudflare Pages. São produtos
  diferentes, com fluxos de deploy diferentes. O `wrangler.jsonc` da raiz usa
  `assets.directory` e `not_found_handling`.
- Estrutura passa a citar `worker/` e `supabase/`, marcados como ainda inexistentes,
  para ninguém inventar um terceiro lugar para eles.
- A regra 2 ganha a exceção de `src/types/` (ver Fase 2), senão afirma algo falso.
- A regra 3 explicita onde `components/` entra na cadeia.
- A seção de segurança registra a dívida real: `sorteio_draws` tem
  `WITH CHECK (true)`, exatamente o caso que o próprio documento condena.

---

## 9. Sequência e formato de entrega

Executar em **seis PRs separados**, nesta ordem. Não juntar.

| PR | Fase | Risco | Por quê nesta ordem |
|----|------|-------|---------------------|
| 1 | Fase 6 — CLAUDE.md | nulo | Estabelece as regras antes de qualquer código mudar |
| 2 | Fase 1 — barrel | baixo | Define a superfície pública antes de travar imports |
| 3 | Fase 2 — travas de lint | médio | Pode revelar violações reais no código atual |
| 4 | Fase 3 — screens | baixo | Movimentação de arquivo, sem lógica |
| 5 | Fase 4 — storage | **alto** | Mexe em save de jogador real. Merece PR isolado e revisão atenta |
| 6 | Fase 5 — narração | baixo | Estrutura nova, não toca em nada existente |

**Regra em todos os PRs:** `npm run lint && npm run typecheck && npm run test:all &&
npm run build` passando, e **nenhum snapshot de golden test alterado**.

Se um PR exigir alterar snapshot, pare e reporte antes de prosseguir — significa que
o comportamento do motor mudou, o que não é objetivo de nenhuma fase deste documento.

---

## 10. Fora de escopo, mas registrado

**A) Orquestração de carreira mora na UI.**
`carreiraReducer.ts`, `conquistas.ts`, `estatisticasCarreira.ts` e
`prestigioCircuitos.ts` estão em `features/carreira/`, mas são regra de jogo, não de
interface. O motor tem `corrida/` e `mercado/`, não tem `carreira/`.

**[emenda] A investigação pedida está respondida: `simulate-carreira-completa.ts` não
duplica lógica — ele atravessa a fronteira.** Importa
`src/features/carreira/adapters/iniciarProximaTemporada` direto, e é o único dos quatro
simuladores que sai do motor. Desde que o golden master passou a importar desse script,
o contrato de balanceamento do jogo depende de código que mora em `features/` (ver §2).

**[emenda] A conclusão "depois do lançamento" não vale mais para tudo.** Com card e
ranking em novembro, o Worker gera o card com os badges de conquista — e o catálogo das
56 conquistas está em `features/carreira/conquistas.ts`. Um Worker não importa de
`features/`. Então **pelo menos o catálogo de `conquistas.ts` precisa sair antes do
lançamento**, junto com `calcularLegado` (esse já está em `engine/mercado/`, ok).

O resto — `carreiraReducer.ts`, `estatisticasCarreira.ts` — pode esperar: o primeiro é
estado de UI legítimo, o segundo é misto e só a parte de agregação é domínio.

**B) `src/components/ui.tsx` como arquivo guarda-chuva.**
Nome genérico convida a virar depósito. Além disso, com `packages/fast-ds` existindo,
`src/components/` deveria ser quase vazio — só wrappers específicos do jogo. Vale
auditar o que está em `ui.tsx` e ver o que deveria ter nascido no design system.

**[emenda] Auditoria feita, por contagem de consumidores.** `ui.tsx` tem cinco
componentes: `Kicker` (21 arquivos), `PillButton` (11) e `SelectableCard` (3) são
usados nos dois fluxos; `SectionLabel` e `InfoTooltip` só em `criacao`. Dos cinco,
`PillButton` duplica o `Button` do fast-ds e `SelectableCard` duplica `Card` +
`RadioButton`. `CardPiloto.tsx` tem **um** consumidor só — foi promovido cedo demais
para `components/`, e é a origem da violação de Trava C citada na Fase 2.
