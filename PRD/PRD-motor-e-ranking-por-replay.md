# PRD — Motor da corrida e ranking por replay

**Projeto:** Hora do Banho
**Status:** motor implementado (`src/engine/`, regras `r4`); servidor do ranking ainda não existe
**Definições:** André · **Redação:** Claude
**Data:** 02/11/2026
**Depende de:** [PRD-conceito-e-regras-do-jogo.md](PRD-conceito-e-regras-do-jogo.md)

---

## 1. Objetivo

Um motor que roda a partida inteira sem saber que existe tela, e que dá **exatamente o mesmo
resultado** no celular, no navegador e no servidor. É isso que permite um ranking em que o
servidor não precisa acreditar no placar que o aparelho diz ter feito.

## 2. Princípios

1. **Passo fixo de 60 ticks por segundo.** `passo(estado, acao)` avança um tick. O motor nunca
   recebe "tempo decorrido": quem converte relógio em ticks é a tela.
2. **Determinismo.** Mesma seed + mesmas ações nos mesmos ticks = mesmo resultado, em qualquer
   aparelho.
   - Na simulação, só aritmética básica (`+ − × ÷`, `Math.floor/min/max/imul`). `Math.pow`, `exp`
     e trigonometria podem variar entre motores JS.
   - Aleatoriedade só em `src/engine/rng.ts` (mulberry32, inteiros de 32 bits). O estado do
     gerador mora dentro da partida.
3. **Estado é dado puro.** `EstadoPartida` não tem função nem classe: `structuredClone` copia a
   partida inteira. O bot de simulação depende disso, e um save de partida em andamento também
   dependeria.
4. **Motor puro.** Não importa React, `data/` nem `features/`; não toca em `window`, `document`,
   `localStorage` nem `fetch`. Roda direto no Node (simulações) e no Deno (Edge Function). Imports
   internos com extensão `.ts`.
5. **Superfície pública pelo barrel** `src/engine/index.ts`.

## 3. Arquitetura

| Arquivo | Responsabilidade |
| --- | --- |
| `constantes.ts` | Todo número de balanceamento e `VERSAO_REGRAS`. |
| `tipos.ts` | `EstadoPartida`, `Elemento`, `Acao`, `ComandoLog`, `ResultadoPartida`. |
| `rng.ts` | Gerador de números aleatórios. |
| `fisica.ts` | Velocidade base, distância do tutor por nível de sujeira, altura do cachorro. |
| `cenarios.ts` | Sequência de cenários e os **moldes** de trecho de cada um. |
| `gerador.ts` | Monta a pista sob demanda, à frente do cachorro, e descarta o que ficou para trás. |
| `partida.ts` | `criarPartida`, `passo`, colisões, coleta, fim, pontuação e `simularPartida`. |

### 3.1 Um tick, em ordem

1. Aplica a ação do tick (pular ou abaixar), se houver.
2. Calcula a velocidade do cachorro.
3. Move o cachorro e aplica gravidade.
4. Resolve o apoio: chão, ou topo de um sólido que o cachorro estava acima no tick anterior
   (folga de 15 cm para o pouso). Sobre um vão não há chão.
5. Colisões: sólido de frente ou teto = batida. Poça pisada no chão = +1 sujeira; a 4ª = pego. Coletáveis.
6. Abaixo de −2 m = queda.
7. Gera mais pista se preciso.

### 3.2 Geração da pista

- A pista existe só até 150 m à frente do cachorro; os primeiros 40 m são livres.
- Cada trecho é um **molde** sorteado entre os do cenário atual, liberado pelo degrau de
  dificuldade (0, 250, 800, 2.000 m) e com peso próprio.
- Larguras de vãos e poças são calculadas por 80% do alcance do pulo (`FATOR_ALCANCE_PISTA`), para
  todo vão ser pulável.
- Entre um trecho e outro há um respiro medido em segundos de corrida, que encurta com a
  dificuldade.

## 4. Ranking por replay

O aparelho **nunca envia o placar**. Envia:

- a **seed** da partida;
- o **log de decisões**: lista de `[tick, código]`, com `0 = pular` e `1 = abaixar`.

O servidor roda `simularPartida(seed, log)`, a mesma função do jogo, e obtém distância, ossinhos e
pontos por conta própria.

Validação do log (`LogInvalido`):

- ticks em ordem estritamente crescente (no máximo uma ação por tick);
- código diferente de 0 e 1;
- tick além de `TICKS_MAX` (30 minutos de partida).

### 4.1 Ainda a construir

- ~~Edge Function `validar-partida`~~ feita como `registrar-partida` (ver CLAUDE.md, "Ranking e
  anti-fraude").
- De onde vem a seed (ver decisão em aberto no PRD de conceito). Sem seed emitida pelo servidor,
  dá para testar seeds até achar uma pista fácil.
- Versão das regras no payload: partida enviada com `VERSAO_REGRAS` diferente da do servidor é
  rejeitada **por versão**, com código de erro diferente de fraude.
- Rate limit por IP e captcha (Turnstile), como no kit.

## 5. Balanceamento e testes

| O quê | Onde | Para quê |
| --- | --- | --- |
| Testes de regra | `tests/motor.test.ts` | velocidade, pulo, pouso em sólido, teto, vão, lama, lenço, tutor, determinismo, log inválido |
| Golden master | `tests/motor.golden.test.ts` | **contrato**: rng, pista da seed 1 e partidas com log fixo. Snapshot só muda junto com `VERSAO_REGRAS` nova. |
| Pista passável | `tests/pista.sim.test.ts` | o bot sobrevive 60 s em 5 seeds e o replay confere |
| Simulação em volume | `npm run sim:partidas -- --partidas 30 --minutos 5` | distâncias, motivos de fim e checagem de determinismo de cada log |

O bot (`scripts/bot.ts`) testa o futuro clonando o estado. Ele é o teto de habilidade, não o
jogador médio.

**Regra:** mudou uma constante de `constantes.ts` → sobe `VERSAO_REGRAS`, roda a simulação e
mostra o antes/depois no PR.

## 6. Pendências técnicas

- Trava de lint que proíbe `Math.random()` fora de `rng.ts` e imports de navegador dentro de
  `src/engine/`.
- Hash das constantes gerado no build, com teste que falha se uma constante mudar sem
  `VERSAO_REGRAS` mudar.
