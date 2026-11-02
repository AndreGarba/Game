# PRD — Telas de Erro

**Autor:** André (com Claude Code)
**Responsável pela implementação:** Claude Code
**Status:** Em definição. Cataloga o estado atual e registra a primeira decisão (§3). O
resto do levantamento (§2) e as pendências (§5) ainda não têm decisão.
**Data:** 21/09/2026

---

## 1. Objetivo

O tratamento de erro do jogo cresceu tela por tela, decisão por decisão, sem um catálogo
central — cada feature resolveu offline/falha/validação do jeito que fez sentido no
momento (ver §2). Este documento existe para:

1. Listar todo estado de erro que o jogo pode mostrar hoje, com o tratamento atual.
2. Registrar, daqui pra frente, a decisão de produto para cada categoria nova — em vez de
   cada PR decidir isoladamente.

Não é uma proposta de reescrever o que já funciona. `PRD-suporte-offline-minimo.md` já
resolveu (Fases A/B/C, 16/09/2026) o padrão de offline-vs-falha-de-servidor nas telas que
carregam lista (Ranking, Carreiras) — este documento não repete aquele trabalho, só
referencia.

---

## 2. Levantamento — estado atual (21/09/2026)

### 2.1 Erro fatal (React quebrou de vez)
`ErroFatalScreen` (`src/features/erro/ErroFatalScreen.tsx`), acionada pelo error boundary
`DiagnosticoErro` em `src/main.tsx`. Única tela que substitui o app inteiro — título em
português, stack técnico escondido em `<details>`, botão "Recarregar".

### 2.2 Listagens remotas (Ranking, Carreiras)
Padrão consolidado pela `PRD-suporte-offline-minimo.md`: `status: 'erro'` distingue
offline (copy "precisa de internet") de online-mas-falhou ("tenta de novo em instantes"),
via `useConexao`. Ranking também tem estado de cache velho rotulado com data, e estado de
recorte vazio (filtro sem resultado, não é erro). Carreiras tem um terceiro estado no
detalhe individual — "retrato indisponível" — quando só o fetch do retrato falha.

### 2.3 Fluxos de criação/carreira (bloco inline, não tela cheia)
- Sorteio (`SorteioScreen.tsx`): `state.erro` substitui a fase de sorteio por mensagem +
  "Tentar novamente".
- Virada de temporada / aceitar oferta (`erroMercado`, `useCarreiraFlow.ts`): parágrafo
  inline em `JanelaContratosScreen` e `FimDeTemporadaScreen`. Não trava a carreira (Fase C
  do PRD de offline resolveu com cache de circuitos/NPCs).
- Ambiente do circuito em `CorridaAoVivo`: **não vira tela**, por decisão de produto — dado
  decorativo, falha cai em `AMBIENTE_PADRAO` silenciosamente.

### 2.4 Autenticação
Cada tela (Login, Criar conta, Esqueci senha, Alterar senha) tem seu próprio
`mapearErro(mensagem)` que classifica a mensagem do Supabase e mostra copy pt-BR fixa
(nunca `error.message` cru): credenciais inválidas, e-mail em uso, senha fraca, muitas
tentativas, captcha (Turnstile) falho, desconhecido. `AvisoIdentidadeJaVinculada` é aviso
de conflito, não erro.

### 2.5 Gravação de dados do jogador
- `ResumoFinalCarreira`: falha ao gravar pontuação/posição vira `'—'` **sem mensagem nem
  retry** — fallback silencioso, não tela de erro.
- Submissão ao ranking (`validar-ranking`): ver §2.6 — nenhum dos códigos tem tratamento
  distinto na UI hoje.
- Migração de carreira anônima → conta: falha **não tem tela**, decisão de produto
  explícita de migrar em silêncio (`migracaoAnonima.ts`).

### 2.6 Códigos de erro das Edge Functions (`validar-ranking`)
Levantado direto do código (`supabase/functions/validar-ranking/index.ts` e `nucleo.ts`):

| HTTP | Código | Descrição |
|---|---|---|
| 503 | `CONFIGURACAO_AUSENTE` | variáveis de ambiente obrigatórias não configuradas |
| 405 | `METODO_NAO_PERMITIDO` | use POST |
| 500 | `ERRO_INESPERADO` | exceção não prevista |
| 503 | `RATE_LIMIT_INDISPONIVEL` | não foi possível verificar o limite de chamadas |
| 429 | `RATE_LIMIT` | muitas chamadas — tenta de novo mais tarde |
| 401 | `NAO_AUTENTICADO` | sem token de sessão / sessão inválida ou expirada |
| 403 | `CONTA_ANONIMA` | crie uma conta pra entrar no ranking global |
| 400 | `JSON_INVALIDO` | corpo da requisição não é JSON válido |
| 400 | `CARREIRA_ID_AUSENTE` | carreiraId é obrigatório |
| 502 | `FALHA_POSTGRES` | mensagem crua do erro do Postgres |
| 404 | `CARREIRA_NAO_ENCONTRADA` | carreira não encontrada |
| 403 | `NAO_E_DONO_DA_CARREIRA` | esta carreira não pertence a você |
| 502 | `DIFICULDADE_SEM_MULTIPLICADOR` | dificuldade sem multiplicador cadastrado |
| 422 | `VALIDACAO_DIVERGENTE` | payload fora da faixa plausível (validação atual, não é replay) |

Mais um em `migrar-carreiras-anonimas`: `409 LIMITE_DE_CARREIRAS`.

**Nota de precisão:** `PRD-backend-sorteio-ranking.md` (§"Comportamento de
`validar-ranking`") descreve `409 RULESET_DIVERGENTE` como parte do contrato — mas isso é
o desenho da **Fase D (replay do motor no servidor), ainda adiada**
(`PRD-suporte-offline-minimo.md` §6, risco 6). O código não existe em lugar nenhum do
backend hoje; `422 VALIDACAO_DIVERGENTE` hoje cobre só validação de faixa, não comparação
de pontuação via replay.

### 2.7 Infraestrutura / plataforma (sem tela — recuperação automática)
Chunk ausente pós-deploy e service worker novo se resolvem com reload automático da aba
(`main.tsx`). 404 de asset real cai no `public/404.html` estático do Cloudflare Workers,
mas o app não tem router — inalcançável por navegação dentro do jogo.

### 2.8 Save local corrompido
Não é tela de erro — `lerCarreiraSalva()` retorna `null` (mesmo tratamento de "sem save").

---

## 3. Decisão — erros técnicos de infraestrutura vão para uma tela de erro genérico

**Decidido em 21/09/2026.** Os seguintes status HTTP, quando retornados por uma Edge
Function, são tratados com uma **tela de erro genérico** (mesmo componente/copy para
todos, sem distinguir o código):

- `405` — método não permitido
- `500` — erro inesperado
- `503` — configuração ausente / rate limit indisponível
- `429` — rate limit
- `401` — não autenticado
- `400` — JSON inválido / campo obrigatório ausente
- `502` — falha no Postgres / dado de referência ausente

**Racional:** são falhas de infraestrutura ou de contrato técnico entre cliente e
servidor — nenhuma delas é algo que o jogador causou nem que ele resolve escolhendo uma
ação diferente. Não há copy específica que ajude mais do que "algo falhou, tenta de novo".
É a mesma lógica que já rege o `ErroFatalScreen`: erro sem ação útil do jogador não merece
uma tela sob medida.

### 3.1 Onde o componente mora — `src/components/EstadoErro.tsx`

**Decidido em 21/09/2026.** Ao lado de `EstadoCarregando` (`src/components/EstadoCarregando.tsx`),
não em `features/erro/`.

`EstadoCarregando` já resolveu exatamente este problema, um ciclo atrás — o próprio
docblock do componente conta a história: Ranking, Carreiras, detalhe de carreira e início
de temporada cada um esperava rede do seu jeito (ícone parado, texto puro, Tailwind cru),
até virar um bloco único — spinner + texto — que qualquer tela cheia ou trecho de um fluxo
consome sem redesenhar. Erro genérico é o mesmo problema, do outro lado do fetch: hoje
cada call site improvisa (parágrafo inline no Sorteio, fallback mudo em
`ResumoFinalCarreira`, nada em outros). `EstadoErro` (texto + botão "Tentar de novo" +
`preencher?: boolean`, mesma forma de `EstadoCarregando`) é a versão desse bloco para
"falhou" em vez de "carregando".

Por que não `features/erro/`, onde `ErroFatalScreen` já mora: os dois resolvem problemas
de natureza diferente, não o mesmo problema em dois lugares.

- **`ErroFatalScreen`** é chamada por `main.tsx`, fora da árvore de qualquer feature — é o
  que sobra quando o React já não consegue renderizar nada. Tela cheia, sempre, por
  construção; é a exceção de "tela de feature única" (como `splash/`, `home/`) porque tem
  exatamente um chamador, o error boundary do app.
- **`EstadoErro`** é chamado de dentro de telas que continuam de pé — o resto do app
  renderizou normal, só uma parte (Sorteio, `JanelaContratosScreen`, `ResumoFinalCarreira`,
  uma futura listagem) não conseguiu buscar ou gravar algo. Múltiplos chamadores, cada um
  decidindo se usa cheio (`preencher`) ou como bloco inline dentro do próprio layout — a
  mesma flexibilidade que `EstadoCarregando` já tem hoje.

Um componente que só sabe renderizar "texto + botão de retry", sem saber o que é
`erroMercado` ou `pontuacaoRemoto`, é exatamente o perfil de `components/` na regra dura
nº 3 (folha, sem conhecimento de domínio) — quem decide a copy e o que "tentar de novo"
faz é o call site em `features/`, não o componente.

### 3.2 Copy e visual — de referência de design (21/09/2026)

Forma mais rica do que `EstadoCarregando` (que só tem `texto`): ilustração, título e
subtítulo separados, botão.

| Elemento | Conteúdo |
|---|---|
| Rótulo pequeno acima da ilustração | "Red Flag" (vermelho) |
| Ilustração | bandeira vermelha de corrida, dentro de um círculo escuro — asset em `packages/fast-ds/src/assets/ilustracao-bandeira-vermelha/` (`IlustracaoBandeiraVermelha`), recebido em 21/09/2026; `race-actions` (`packages/fast-ds/src/components/race-actions/`) tem um banner de "bandeira vermelha" pro evento em corrida, mas é outra peça (banner pequeno, não ilustração central) — não foi reaproveitado |
| Título | "Carreira interrompida" |
| Subtítulo | "Tivemos um problema inesperado, tente novamente para voltar pra corrida" |
| Botão | "Tentar novamente" (secondary/outline) |
| Layout | tela cheia, conteúdo centralizado no meio, botão fixado embaixo — o caso `preencher` de `EstadoErro` |

**Sobre o escopo da copy:** "Carreira interrompida" / "voltar pra corrida" só faz sentido
porque o §4 já tira Ranking, Carreiras e as telas de auth desta decisão — o que sobra em
escopo (Sorteio, `JanelaContratosScreen`, `FimDeTemporadaScreen`, `ResumoFinalCarreira`)
está sempre dentro de uma carreira em andamento. `titulo`/`texto`/`textoBotao` continuam
prop do componente, não hardcoded nele (mesmo princípio do `texto` de `EstadoCarregando`)
— isto é a copy que os call sites em escopo vão passar, não uma copy fixa do componente.
Se algum dia este componente for chamado fora de uma carreira, quem chama passa outra copy;
o componente em si permanece burro.

**Implementado em 21/09/2026:** `EstadoErro` (`src/components/EstadoErro.tsx`) e o asset da
ilustração (`IlustracaoBandeiraVermelha`, `packages/fast-ds/src/assets/ilustracao-bandeira-vermelha/`).

## 4. Fora desta decisão — continuam com tratamento específico

Estes **não** entram na tela genérica, porque cada um tem uma ação ou uma implicação
diferente para o jogador:

- **`403 CONTA_ANONIMA`** — tem CTA próprio (criar conta), não é "erro", é um requisito.
- **`403 NAO_E_DONO_DA_CARREIRA`** / **`404 CARREIRA_NAO_ENCONTRADA`** — não deveriam
  acontecer por ação normal do jogador; se acontecerem, é sinal de outra coisa (sessão
  trocada, carreira apagada) que uma mensagem genérica esconderia.
- **`409 LIMITE_DE_CARREIRAS`** (`migrar-carreiras-anonimas`) e o futuro
  **`409 RULESET_DIVERGENTE`** (ainda não implementado, §2.6) — cada um tem copy própria
  planejada, por serem situações que o jogador pode entender e agir (ou pelo menos não
  devem ser confundidas com fraude).
- **`422 VALIDACAO_DIVERGENTE`** — quando a Fase D (replay) existir, isto passa a
  significar possível fraude; nunca deve compartilhar copy com falha de infraestrutura.
- **Offline vs. falha de servidor** nas listagens (Ranking, Carreiras) — `useConexao` já
  resolve isso com copy distinta (§2.2); esta decisão não se sobrepõe àquele padrão.
- **Erros de autenticação** (§2.4) — cada tela já tem mensagens específicas por campo;
  continuam como estão.

---

## 5. Pendências

Registrado aqui para não perder o fio; nenhum destes itens tem decisão ainda.

- [x] ~~Onde a tela de erro genérico mora~~ — decidido, §3.1: `src/components/EstadoErro.tsx`.
      Resolve de quebra a pergunta "tela cheia ou inline": não é uma coisa fixa, é
      `preencher?: boolean` decidido por quem chama, igual `EstadoCarregando`.
- [x] ~~Copy exata do componente~~ — decidido, §3.2: "Carreira interrompida" / "Tivemos um
      problema inesperado, tente novamente para voltar pra corrida" / "Tentar novamente",
      com ilustração de bandeira vermelha.
- [x] ~~Componente e asset da ilustração~~ — implementado em 21/09/2026: `EstadoErro`
      (§3.1) e `IlustracaoBandeiraVermelha` (§3.2).
- [ ] Quais call sites hoje **não tratam nada** desses códigos e precisam ser conectados —
      pelo menos `ResumoFinalCarreira` (§2.5), que hoje cai em `'—'` silencioso para
      qualquer falha, incluindo estas.
- [ ] `409 RULESET_DIVERGENTE` não implementado no backend (§2.6) — fora do escopo deste
      documento (é a Fase D da `PRD-backend-sorteio-ranking.md`), mas fica registrado
      porque afeta §4.
