# PRD — Sistema de XP (teto de potencial por experiência em pista)

**Projeto:** THE IMMORTAL
**Sistema:** Carreira → Motor de evolução do piloto (não é uma tela — é uma mecânica que atravessa `TelaTemporada`, `EstatisticasScreen` e o motor de corrida)
**Skills a consultar antes de codar:** nenhuma skill de design system — isto é engine puro + 1 exibição pequena numa tela que já existe.
**Cria:** `src/engine/corrida/boostXp.ts` + `src/engine/corrida/config/boostXpConfig.ts` + 1 campo novo em `PersonagemState`
**PRDs irmãs já commitadas:** `PRD-tela-contrato.md`, `PRD-tela-equipe.md`, `PRD-tela-treinamento.md` (as 3 telas do hub). Esta PRD é diferente das 3: não é uma tela nova, é o sistema que o Wag pediu por último, de propósito separado (ver histórico da conversa).

**Emendas:** 09/09/2026 — sistema revisado por completo após conversa de design com o Wag sobre um mecanismo de progressão estilo RPG (XP → nível → ponto de atributo). Ver **seção 12** no final deste documento — ela substitui as decisões de automatismo das seções 1, 3, 4.2, 5, 6, 7, 8 e 11 abaixo. As seções originais ficam mantidas para histórico; não usar como especificação de implementação a partir desta data.

---

## 1. Contexto **[superado pela emenda — ver §12]**

**O pedido original:** hoje o teto de cada atributo (`personagem.potenciais`) é sorteado na criação da carreira e só sobe por um motivo — título de campeão (ver achado abaixo). O Wag quer uma SEGUNDA via de subir esse teto: acumular XP disputando corridas de verdade, uma a uma (`simularProximaRodada`), nunca simulando em lote (`simularEmLotePorEtapas`). Exemplo dado: um atributo sorteado com potencial 89 poder chegar a 92 ao longo da carreira, através de XP.

**Achado importante — já existe um sistema irmão, e ele revela uma tensão de design que preciso trazer pro Wag antes de escrever qualquer número:** `engine/corrida/boostTitulo.ts` já faz exatamente "subir o teto, não o atual" — ganhar um campeonato sobe o potencial de `frieza`/`consistencia`/`gerenciamento` (nunca os outros 6), com teto vitalício de +12 (pesado por categoria, retorno decrescente por ordem do título). O comentário no próprio código explica a filosofia por trás disso, palavra por palavra:

> "...não uma quebra de teto baseada em tempo (**grind**), baseada em **CONQUISTA**."

Ou seja: o sistema existente foi desenhado deliberadamente pra **evitar** que o teto suba só por jogar muito/repetir — ele sobe por ganhar. O pedido do Wag, tomado ao pé da letra ("corrida a corrida"), é mais perto de um grind (jogar bastante) do que de uma conquista. Não vou ignorar isso nem vou recusar o pedido — a solução que proponho abaixo (§5) pondera o ganho de XP pelo RESULTADO da corrida (vitória vale muito mais que terminar de qualquer jeito), o que aproxima XP do espírito de "conquista" sem abrir mão do "corrida a corrida" que o Wag pediu.

**Isso também resolve uma preocupação de sobreposição:** como título já cobre `frieza`/`consistencia`/`gerenciamento` (o trio "mental/veterano" — o próprio comentário do código diz "ganhar título não deixa mais rápido, deixa mais preparado"), proponho que XP cubra o trio complementar: `ritmo`, `precisao`, `fisico` (o trio "mecânico/físico" — o que melhora com repetição em pista de verdade). Os dois sistemas nunca competem pelo mesmo atributo, e a divisão narrativa fica limpa: **título te deixa mais preparado mentalmente; XP te deixa mecanicamente mais refinado.**

---

## 2. Objetivo

Criar um segundo mecanismo de elevação de teto (`personagem.potenciais`), independente do de título, que sobe `ritmo`/`precisao`/`fisico` conforme o jogador acumula XP disputando corridas individualmente (nunca em lote), com ganho por corrida proporcional ao resultado (vitória > pódio > pontos > fora dos pontos > DNF), até um teto vitalício análogo ao de título. Expor esse progresso em algum lugar visível pro jogador (proposta: `EstatisticasScreen`, ver §6).

**[emenda 09/09]** Objetivo revisado — ver §12. XP não sobe mais teto sozinho; alimenta um sistema de Nível com gasto manual pelo jogador.

---

## 3. Comparação com o sistema de título (referência de design) **[coluna "Boost de XP" superada — ver §12]**

| | Boost de Título (existe) | Boost de XP (esta PRD) |
|---|---|---|
| Atributos afetados | `frieza`, `consistencia`, `gerenciamento` | `ritmo`, `precisao`, `fisico` |
| Gatilho | Ser campeão da categoria (1x por temporada, no fechamento) | Toda corrida disputada individualmente (não em lote) |
| Ganho | Decrescente por ORDEM do título (+4/+3/+2/+2/+1), pesado por categoria | Por RESULTADO da corrida (§5), sem peso de categoria nesta v1 (ver §8) |
| Teto vitalício | +12 (soma pesada) | +12 nesta proposta (mesma ordem de grandeza — ver §8) |
| Onde mora | `engine/corrida/boostTitulo.ts` | `engine/corrida/boostXp.ts` (novo, mesma pasta — ver §7) |

---

## 4. Modelo de dados

### 4.1 Novo — em `PersonagemState`

```ts
export interface PersonagemState {
  // ...campos existentes
  /** Soma bruta de XP ganho corrida a corrida (só rodadas disputadas individualmente,
   * nunca em lote — ver §5.3). Capado em `TETO_XP_CARREIRA` (não cresce além do que tem
   * efeito mecânico, ver §8 sobre deixar crescer por "sabor" além do teto). Alimenta
   * `aplicarBoostXp`, que sobe `potenciais.ritmo`/`.precisao`/`.fisico` — nunca
   * `atributosAtuais` diretamente (mesmo princípio do boost de título: sobe o TETO). */
  experienciaAcumulada: number
}
```

Opcional/com default 0 pelo mesmo motivo defensivo do resto do projeto (saves antigos).

### 4.2 Novo — config (`engine/corrida/config/boostXpConfig.ts`, espelhando `boostTituloConfig.ts`) **[valores superados — ver §12.2]**

```ts
export const ATRIBUTOS_BOOST_XP: AtributoNome[] = ['ritmo', 'precisao', 'fisico']

export const TETO_BOOST_XP_CARREIRA = 12 // mesma ordem de grandeza do título — revisável, ver §8

export const XP_POR_RESULTADO = {
  vitoria: 0.5,
  podio: 0.3, // 2º/3º
  pontos: 0.15, // dentro da zona de pontos, fora do pódio
  foraDosPontos: 0.05, // terminou, sem pontuar
  dnf: 0, // não conta — mesmo espírito de PRESTIGIO_PERDA_DNF em prestigio.ts, mas sem ficar negativo aqui
}
```

Com esses números, um piloto que corre uma temporada inteira (~20 corridas) vencendo tudo ganharia 20 × 0,5 = 10 XP — quase o teto de 12 numa única temporada de domínio total. Um piloto mediano, pontuando às vezes, leva várias temporadas pra chegar no teto. Bate com o exemplo do próprio Wag (89 → 92 ao longo da carreira, não em uma temporada só).

---

## 5. Regras de negócio **[substituídas — ver §12]**

### 5.1 Ganho de XP por corrida

Depois de cada corrida **disputada individualmente** (ver §5.3), calcular o XP pela tabela de `XP_POR_RESULTADO` a partir da posição final do jogador naquela sessão (mesma fonte de dado que `calcularGanhoReputacao` já usa — `ResultadoSessao`), somar em `experienciaAcumulada` (capado em `TETO_BOOST_XP_CARREIRA`), e aplicar o delta resultante em `potenciais` via `aplicarBoostXp` (§7).

### 5.2 Distribuição entre os 3 atributos

Mesma lógica de água-e-represa que `boostTitulo.ts` já usa (`distribuirBoostAtributos`) — proponho **extrair essa função pra aceitar a lista de atributos como parâmetro** em vez de duplicar a lógica, e os dois sistemas (título e XP) chamam a mesma função genérica com listas diferentes. Evita 2 cópias quase idênticas do mesmo algoritmo.

### 5.3 O que NÃO gera XP **[revertido pela emenda — ver §12.3: lote agora gera 20% do XP normal]**

- **Simulação em lote** (`simularEmLotePorEtapas` — "Simular 5 rounds", "Simular temporada completa"): zero XP. É a regra central do pedido do Wag — sem isso, o botão de lote vira estritamente melhor que jogar corrida a corrida, o que mataria o propósito do sistema.
- **DNF:** zero XP (ver tabela). Terminar mal ainda conta pra reputação (que já pune DNF), mas XP não soma nem desconta.
- Sessões de qualifying — só a corrida em si conta (mesmo escopo de `calcularGanhoReputacao`, que soma pole como bônus mas não como sessão própria).

---

## 6. Onde aparece pro jogador **[superado — ver §12.8]**

Proposta: `EstatisticasScreen.tsx` (tela que já existe, hoje pequena — 860 bytes, só um wrapper de `EstatisticasCarreiraDetalhe`). Adicionar uma linha/card "Desenvolvimento em pista" com uma barra `experienciaAcumulada / TETO_BOOST_XP_CARREIRA` — mesma linguagem visual que o card de Prestígio da PRD de Contrato, pra manter consistência entre os 2 indicadores de "progresso de carreira" que não são OVR.

**Fora de escopo desta v1:** um popup/notificação no momento em que o teto sobe de fato (ex.: "Ritmo: seu potencial subiu pra 92!") — fica como ideia de v2, mas sinalizar aqui porque conquistas (`conquistas.ts`) e notícias (`noticias/`) já têm um padrão de popup pra eventos de carreira que poderia ser reaproveitado depois.

---

## 7. Integração com o motor — exceção deliberada ao "não mexer em `engine/corrida/`" **[precisa nova investigação — ver §12.8]**

As 3 PRDs de tela desta rodada (Contrato/Equipe/Treinamento) declararam explicitamente "nenhuma mudança em `src/engine/corrida/`". Esta PRD é a exceção, e por um motivo específico: o sistema irmão que ela espelha (`boostTitulo.ts`) **já mora lá**, não em `engine/mercado/`. Isso faz sentido — subir o teto de atributo por resultado de corrida é claramente um conceito de "motor de corrida", não de "mercado" (contratos/ofertas). Então:

- **Novo:** `engine/corrida/boostXp.ts`, espelhando a forma de `boostTitulo.ts` (`aplicarBoostXp(potenciaisAtuais, experienciaAntes, ganhoDestaCorrida)` → `Record<AtributoNome, number>`), função pura.
- **Refatoração pequena:** extrair `distribuirBoostAtributos` de `boostTitulo.ts` pra um utilitário compartilhado (`distribuirBoostPorLista` ou nome similar) que aceite a lista de atributos-alvo como parâmetro, usado pelos dois sistemas.
- **`useCarreiraFlow.ts`:** logo depois de `calcularGanhoReputacao` ser chamado (mesmo ponto, já lê `ResultadoSessao` da corrida que acabou de rodar), calcular o ganho de XP pela mesma sessão e chamar `aplicarBoostXp`. **Só nesse caminho** — nunca no caminho de `simularEmLotePorEtapas` (§5.3).
- Nenhuma mudança em `simularCorrida.ts`/`evolucao.ts` — eles continuam lendo `potenciais` como já leem hoje; XP só muda QUEM escreve nesse campo, não como ele é lido.

---

## 8. Fora de escopo **[revisado parcialmente — ver §12]**

- Peso por categoria no ganho de XP (F1 valer mais que F3, como o título já faz) — nesta v1 todo XP vale igual, não importa a categoria. Simplificação deliberada; pode virar v2 se o Wag achar que uma vitória de F3 não deveria valer o mesmo que uma de F1. **[continua fora de escopo após a emenda]**
- Deixar `experienciaAcumulada` crescer além do teto só por "sabor" (mostrar "47 XP" mesmo o efeito saturando em 12) — nesta v1 o campo para de contar no teto. Ver §9.4 se quiser essa camada estética depois. **[não se aplica mais do mesmo jeito — não há teto vitalício de XP na versão com Nível, só thresholds crescentes, ver §12.4]**
- Popup/notificação no momento em que o teto sobe (§6). **[continua fora de escopo]**
- Qualquer interação entre XP e o Treinamento (`PRD-tela-treinamento.md`) — são sistemas independentes: Treinamento é temporário (1 corrida), XP é permanente (teto). Não misturar. **[Treinamento foi deprecada — ver `PRD-tela-treinamento.md`. Esta nota fica sem efeito.]**
- Qualquer mudança em `simularCorrida.ts` ou `evolucao.ts` além de continuarem lendo `potenciais` como já leem. **[continua fora de escopo]**

## 9. Riscos e perguntas em aberto **[resolvidos pela conversa que gerou a emenda — ver §12]**

1. **A tensão "conquista vs. grind" (§1)** é a decisão mais importante desta PRD — não é só uma nota de rodapé. Se o Wag preferir manter XP mais próximo do espírito "conquista" do sistema de título, os números de `XP_POR_RESULTADO` deveriam ter uma diferença ainda maior entre vitória e "terminou sem pontuar" (hoje é 10x: 0,5 vs 0,05) — fácil de recalibrar, mas quero validar a direção antes.
2. **+12 de teto pra XP, igual ao de título** (§4.2) é ponto de partida — os dois sistemas juntos poderiam render até +8 de OVR combinados (título + XP), quase o dobro do que título sozinho rende hoje. Confirmar se essa é a escala que o Wag quer pro fim de uma carreira longa.
3. **Onde exibir (§6)** — proponho `EstatisticasScreen`, mas é a tela mais simples das que existem hoje; se o Wag preferir um lugar mais visível (ex.: dentro do card de OVR na própria `TelaTemporada`), é uma troca pequena.
4. **Overflow estético além do teto** (§8) — decisão de v2, não bloqueia esta implementação.
5. **Extração de `distribuirBoostAtributos`** (§7) — é uma refatoração em `boostTitulo.ts`, arquivo que já está em produção. Confirmar que não há teste de snapshot/golden master (`scripts/simulate-carreira-completa.ts` foi citado em buscas anteriores) que dependa do nome interno da função antes de renomear/mover.

## 10. Plano de implementação sugerido (commits) **[substituído — ver `PRD-tela-atributos.md` §9 pro plano atualizado]**

1. **Tipos:** `experienciaAcumulada` em `PersonagemState`.
2. **Config:** `engine/corrida/config/boostXpConfig.ts` (§4.2).
3. **Refatoração:** extrair `distribuirBoostAtributos` de `boostTitulo.ts` pra utilitário compartilhado, sem mudar comportamento (cobrir com o teste existente antes/depois, se houver).
4. **Engine:** `engine/corrida/boostXp.ts` com `aplicarBoostXp` (§7), usando o utilitário extraído no passo 3.
5. **Hook:** `useCarreiraFlow.ts` — chamar `aplicarBoostXp` só no caminho de corrida individual, nunca no de lote.
6. **UI:** pequeno acréscimo em `EstatisticasScreen.tsx`/`EstatisticasCarreiraDetalhe` (§6).
7. **Manual:** nenhuma tarefa de Supabase — estado local.

## 11. Critérios de aceite **[substituídos — ver `PRD-tela-atributos.md` §10]**

- [ ] `experienciaAcumulada` só sobe em corridas disputadas individualmente — simular em lote nunca altera esse campo.
- [ ] DNF não gera XP; vitória gera mais XP que qualquer outro resultado.
- [ ] O ganho de XP nunca escreve em `atributosAtuais` — só em `potenciais.ritmo`/`.precisao`/`.fisico`.
- [ ] `experienciaAcumulada` nunca passa de `TETO_BOOST_XP_CARREIRA`.
- [ ] Título e XP não competem pelo mesmo atributo (conjuntos disjuntos: `frieza/consistencia/gerenciamento` vs. `ritmo/precisao/fisico`).
- [ ] `distribuirBoostAtributos` extraída sem quebrar o comportamento existente de `boostTitulo.ts` (mesmo resultado pra qualquer entrada testada antes da refatoração).
- [ ] Progresso de XP visível em `EstatisticasScreen` (ou onde o Wag decidir, §9.3).
- [ ] Nenhuma mudança em `simularCorrida.ts`/`evolucao.ts` além de continuarem lendo `potenciais` normalmente.

---

_PRD gerada a partir da investigação de `engine/corrida/boostTitulo.ts` + `boostTituloConfig.ts` (sistema irmão já existente, usado como molde direto) + `engine/types.ts` (lista de 9 atributos) + a conversa original sobre o pedido de XP, incluindo a tensão de filosofia "conquista vs. grind" encontrada nos comentários do próprio código-fonte._

---

## 12. EMENDA — 09/09/2026 — Sistema de Nível substitui a aplicação automática

**Contexto:** revisão feita em conversa de design com o Wag, motivada pelo pedido de um sistema de progressão estilo RPG (XP → nível → ponto de atributo escolhido manualmente pelo jogador — referência dada pelo próprio Wag: sistemas de leveling tipo Homem-Aranha, "subi de nível, ganhei um ponto, fui lá e melhorei meu atributo de lançar teia"). Esta emenda substitui as decisões de automatismo das seções 1, 3, 4.2, 5, 6, 7, 8 e 11 acima. As seções originais continuam no documento só para histórico — não usar como especificação de implementação a partir desta data.

### 12.1 O que muda, resumo

O XP deixa de aplicar boost sozinho, sem escolha do jogador, num trio fixo de atributos. Em vez de escrever direto em `potenciais.ritmo/.precisao/.fisico` via `aplicarBoostXp` toda vez que acumula, o XP agora alimenta um sistema de **Nível**: ao bater um threshold, o jogador ganha um **Ponto de Nível**, que ele gasta manualmente, escolhendo entre os 9 atributos.

### 12.2 Nova tabela de XP por resultado (rescalada, corrida individual)

| Resultado | XP |
|---|---|
| Vitória | 500 |
| Pódio (2º/3º) | 300 |
| Pontos (fora do pódio) | 150 |
| Fora dos pontos | 50 |
| DNF | 0 |

A proporção entre resultados é a mesma da tabela original (§4.2) — só a escala mudou (×1000), pra dar sensação de números "de jogo" em vez de frações.

### 12.3 Corrida simulada em lote agora gera XP — reversão explícita de §5.3

**Regra original revertida:** §5.3 dizia "simulação em lote = zero XP, é a regra central do pedido". Decisão nova: corrida em lote (`simularEmLotePorEtapas`) também gera XP, só que a **20%** da tabela acima:

| Resultado | XP (lote, 20%) |
|---|---|
| Vitória | 100 |
| Pódio | 60 |
| Pontos | 30 |
| Fora dos pontos | 10 |
| DNF | 0 |

**Motivo da reversão:** sem isso, jogadores que usam bastante `simularEmLotePorEtapas` ficariam travados pra sempre no nível 0, sem nenhuma via de progressão. O desconto de 80% preserva corrida individual como a via preferencial (5x mais rápida), sem zerar o progresso de quem simula.

DNF continua sem gerar XP em nenhum dos dois caminhos.

### 12.4 Curva de nível — threshold crescente (substitui o teto vitalício `TETO_BOOST_XP_CARREIRA`)

| Nível | XP necessário (incremento) | XP acumulado total |
|---|---|---|
| 1 | 1.000 | 1.000 |
| 2 | +1.500 | 2.500 |
| 3 | +2.000 | 4.500 |
| 4 | +2.500 | 7.000 |
| 5 | +3.000 | 10.000 |
| 6 | +3.500 | 13.500 |
| 7 | +4.000 | 17.500 |

Ponto de partida, revisável em playtesting. Meta de design: **5 a 8 Pontos de Nível possíveis numa carreira completa** de domínio (múltiplas temporadas, múltiplas categorias — F3→F2→F1→segunda vida). Um piloto mediano deve fechar a carreira com bem menos pontos que isso. Diferente do modelo anterior (teto fixo de +12), não há limite superior de XP acumulável — a curva simplesmente fica cada vez mais difícil.

### 12.5 Cada nível libera 1 Ponto de Nível

Moeda nova e separada do XP bruto (`experienciaAcumulada` continua existindo como o contador cru; `pontosDisponiveis` é o saldo gasto pelo jogador). Pode subir mais de um nível numa corrida só, se o ganho de XP ultrapassar mais de um threshold.

### 12.6 Gasto manual, sem restrição de atributo e sem cap

- **Livre escolha entre os 9 atributos** — não fica mais restrito ao trio `ritmo/precisao/fisico` (§1/§3 originais). O trio de título (`frieza/consistencia/gerenciamento`) também pode receber pontos de nível — os dois sistemas não competem porque um é automático e o outro é escolha explícita do jogador, não porque os conjuntos são disjuntos.
- **Sem cap por atributo** — decisão explícita do Wag: todos os `pontosDisponiveis` podem ir pro mesmo atributo, sem limite de distribuição forçada.

### 12.7 Efeito do ponto: sobe teto E atual juntos

Diferente de todo o resto do motor (título e o boost automático de XP original só sobem `potenciais`, deixando o atual evoluir até lá organicamente pela evolução normal entre temporadas), o Ponto de Nível sobe **`potenciais.<atributo>` E `atributosAtuais.<atributo>` ao mesmo tempo, +1 cada, permanente**. Decisão deliberada: garante que o efeito é sentido na próxima corrida (sensação de RPG imediato que motivou o pedido) e que o ponto nunca é "desperdiçado" batendo num teto mais baixo que o próprio valor atual.

### 12.8 Onde o jogador gasta o ponto

Nova tela **"Atributos"** — ver `PRD-tela-atributos.md` (PRD nova, criada junto com esta emenda). Ela substitui por completo a tela de Treinamento (`PRD-tela-treinamento.md`, deprecada na mesma data — ver nota no topo daquele documento). Não é mais `EstatisticasScreen` como propunha o §6 original.

### 12.9 Sistema de título não muda

Continua exatamente como está hoje: automático, só teto (`potenciais`), só `frieza/consistencia/gerenciamento`. Sistema paralelo ao Sistema de Nível, sem conflito — ver `PRD-tela-atributos.md` pra regras completas e plano de implementação.

### 12.10 Itens não resolvidos por esta emenda

- Nome exato dos novos campos de estado (manter `experienciaAcumulada` ou renomear; onde mora `pontosDisponiveis`/`nivelAtual`) — decisão de implementação, ver `PRD-tela-atributos.md` §4.
- Se a refatoração de `distribuirBoostAtributos` proposta no §7 original ainda faz sentido — provavelmente não do jeito descrito, já que não há mais distribuição automática entre 3 atributos: o gasto agora é 1 ponto = 1 atributo escolhido pelo jogador, não uma função de distribuição ponderada. **[Resolvido 09/09 — ver `PRD-tela-atributos.md` §6]:** não faz mais sentido. `aplicarPontoDeNivel` é atribuição direta (1 ponto → 1 atributo escolhido), não uma distribuição ponderada entre vários. `distribuirBoostAtributos` continua uso exclusivo de `boostTitulo.ts`, sem necessidade de extração/compartilhamento.

---

## Emenda — 29/10/2026: curva de nível recalibrada (passo 500 → 4.500)

A tabela do §12.4 (1.000, 1.500, ..., 4.000) era ponto de partida. Medido no laço headless com o
grid e o pool de NPCs de produção, uma carreira de domínio fechava com **22 a 28 Pontos de Nível**
— 3x a meta deste PRD (5 a 8). Como o ponto sobe atributo e teto juntos (§12.7), sem limite, isso
virou bola de neve: quem ganhava ficava mais forte e os pontos anulavam o declínio depois dos 34.
Caso real que disparou a revisão: 17 títulos de F1 seguidos, campeão aos 40 anos com OVR 88.

O passo da progressão foi multiplicado por 9 (`PASSO_XP_NIVEL = 4500` em
`engine/corrida/config/nivelConfig.ts`): nível 1 em 9.000 XP, nível 2 em +13.500, e assim por
diante. A mesma carreira de domínio fecha com 6-7 pontos. `XP_POR_RESULTADO` e o desconto de
lote (§12.3) não mudaram. Nível nunca desce: save com nível acima da curva nova fica onde está e
volta a subir quando o XP alcançar.

## Emenda — 31/10/2026: lote volta ao ritmo de antes (passo 4.500 → 1.000, lote 0,2 → 0,4)

A emenda de 29/10 mediu os 22-28 pontos no laço headless, que joga toda corrida com o XP inteiro
(fator 1). Quem simula em lote (§12.3, fator 0,2) nunca esteve nesse patamar: com o passo 500 fechava
uma carreira de domínio com ~9 pontos, já dentro da meta. Multiplicar o passo por 9 resolveu quem
assiste e travou quem simula — no app, depois de 9 rodadas simuladas o piloto tinha 310 XP de 9.000,
e sem ponto a tela de Atributos esconde o − e o + (parecia que não dava pra aplicar).

O que o jogador sente é a razão entre o desconto do lote e o passo, então os dois andam juntos:
`PASSO_XP_NIVEL = 1000` e `FATOR_XP_LOTE = 0.4`. Simular em lote fica idêntico a antes de 29/10
(0,2/500 = 0,4/1.000); assistir à rodada rende 2,5x o XP do lote (era 5x), o que segura a bola de
neve de quem joga tudo.

Pontos de Nível na carreira inteira, mediana de 30 carreiras por perfil no laço headless (mundo das
fixtures, idade inicial 17), assistindo × simulando:

| Perfil (potencial) | Antes de 29/10 | 29/10 | 31/10 |
| --- | --- | --- | --- |
| Fraco (65) | 12 × 4 | 3 × 1 | 8 × 4 |
| Mediano (74) | 13 × 5 | 3 × 1 | 9 × 5 |
| Bom (82) | 17 × 7 | 5 × 1 | 12 × 7 |
| Forte (88) | 20 × 8 | 5 × 2 | 13 × 8 |
| Domínio (92) | 21 × 9 | 6 × 2 | 15 × 9 |
| Temporadas até o 1º ponto, simulando | 1-2 | 9-20 | 1-2 |

`XP_POR_RESULTADO` não mudou. Nível nunca desce, e a curva nova é mais baixa que a de 29/10: quem
acumulou XP desde então recebe os pontos que ficaram para trás na próxima rodada.
