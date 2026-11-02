# PRD — Novo Visual do Modal de Conquista Desbloqueada

**Projeto:** THE IMMORTAL
**Tela:** `ConquistaPopup` — modal global, montado em `CarreiraFlow.tsx`, fora do `switch` de telas
**Anexo obrigatório para o Claude Code:** este PRD + `PRD/design/DESIGN-modal-conquista-desbloqueada.md` (frame "Carreira - Conqusitas", node Figma `6881:30074`)
**Skills a consultar antes de codar:** `/fast-ds-components` (Tag, Footer, BottomSheet), `/fast-ds-tokens`
**Status:** investigação + proposta — 3 decisões visuais em aberto para o Wag antes do código final (§6)

---

## 1. Contexto

O Wag pediu pra substituir o visual atual de `ConquistaPopup.tsx` (`src/features/carreira/components/ConquistaPopup.tsx`) pelo especificado em `DESIGN.md`. Não é uma tela nova — o componente já existe, já está com a lógica de fila/dispensa funcionando (`state.conquistasParaMostrar`, `marcarConquistaVista`); este PRD é só sobre a troca do miolo visual (markup + componentes DS), mantendo o comportamento.

O design não é um retoque incremental do que existe — muda a **forma** do modal (de diálogo centralizado pra bottom sheet) e troca componentes soltos em Tailwind por componentes `fast-ds` reais. Por isso vale uma PRD investigativa, não só uma tarefa de handoff direto: há divergências estruturais entre o Figma e o componente DS mais próximo (`BottomSheet`) que precisam de decisão do Wag antes de fechar o código (§6).

## 2. Objetivo

Trocar o markup solto/Tailwind de `ConquistaPopup` pelos componentes `fast-ds` corretos (`BottomSheet` + `Tag` + `Footer`, via `/fast-ds-components`), reproduzindo o layout de `DESIGN.md` (bottom sheet 360×500 sobre overlay 90% preto, cantos superiores arredondados) — sem mudar quando o popup aparece, a fila de conquistas, ou como ele é dispensado.

## 3. Investigação — o que já existe hoje

### 3.1 Implementação atual (`ConquistaPopup.tsx`)

Diálogo centralizado (`fixed inset-0 flex items-center justify-center`, overlay `bg-black/85`), card `max-w-sm` com borda e `rounded-2xl`. Header horizontal (`justify-between`, borda inferior) com "Conquista desbloqueada" à esquerda e o **texto** da raridade à direita (`COR_RARIDADE`, mapa de 6 cores Tailwind — não é um componente `Tag`, é `<span>` colorido). Ícone é um **emoji** (`iconeConquista`, `text-5xl`), nome em `font-display uppercase`, descrição em `text-sm text-neutral-400`, contexto de origem (evento/ano ou só ano) opcional abaixo da descrição, botão "Continuar" é um `<button>` solto com `bg-primary rounded-full`.

Consumo: `state.conquistasParaMostrar[0]` (fila, 1 por vez), `marcarConquistaVista()` (dispatch `CONQUISTA_VISTA`) avança a fila. `origem.tipo` é `'rodada' | 'fim_temporada' | 'contrato' | 'encerramento'` — só os dois primeiros têm dado de contexto pra exibir (`eventoNome`/`ano` ou só `ano`); os outros dois (`contrato`, `encerramento`) não renderizam a linha de contexto hoje.

Montagem: `<ConquistaPopup />` fica em `CarreiraFlowInner`, fora do `switch` de telas — aparece por cima de qualquer tela. É o único lugar do código que usa esse componente (`search_code` não trouxe outro import).

`raridade` (`conquistas.ts`) tem **6 valores**: `comum | incomum | rara | epica | lendaria | impossivel`.

### 3.2 O design pede uma bottom sheet, não um diálogo centralizado

O HTML do `DESIGN.md` mostra: overlay preto 90% cobrindo o frame inteiro (360×800), e "Card Equipe" **ancorado embaixo** — 360×500 fixo, `border-radius: 24px 24px 0px 0px` (só os cantos de cima), fundo `Grayscale/gray-700`. Isso bate **exatamente** com `BottomSheet` do `fast-ds` (`packages/fast-ds/src/components/bottom-sheet/bottom-sheet.styled.css`): overlay `color-mix(preto 90%, transparent)`, painel `border-radius: var(--radius-xxlarge) var(--radius-xxlarge) 0 0`, fundo `--color-gray-700`, entra com `translateY(100%) → 0`. Não é o `Modal` centralizado que `ModalNovoRegulamento.tsx`/o PRD do rádio usam pra outros casos — a assinatura visual aqui (ancorado embaixo, cantos só de cima) é de `BottomSheet`.

### 3.3 `BottomSheet` sempre renderiza um header com botão de fechar — o Figma não tem nenhum header

`bottom-sheet.template.tsx` monta, sem condicional: `<Header tipo="close" titulo={titulo} onFechar={onFechar} />` antes do conteúdo. `titulo` é opcional, mas a barra do `Header` (com o botão X) **sempre aparece**, mesmo com `titulo` vazio. O Figma não tem nenhuma camada de header/close nesse frame — o card começa direto no conteúdo (Tag + "Conquista desbloqueada"). Usar `BottomSheet` como está introduz um X no topo que não existe no design. Ver decisão §6.1.

`BottomSheet` também fecha com Esc e clique no overlay (`onFechar` disparado nos dois casos, via `useBottomSheet`/`aoClicarPainel` com `stopPropagation` no painel) — isso não existe hoje no `ConquistaPopup` atual (só "Continuar" fecha). `onFechar` é prop obrigatória da interface (`BottomSheetProps`), então precisa de um handler mesmo se a intenção for só reaproveitar `marcarConquistaVista`.

### 3.4 Tag do fast-ds tem 5 estilos; a raridade do jogo tem 6

`Tag` (`/fast-ds-components` → `tag.md`) aceita `estilo: 'gold' | 'epic' | 'rare' | 'common' | 'default'` + `destaque: boolean` (`true` = preenchido, `false` = contorno — o Figma usa `Highlight=False`, ou seja `destaque={false}`, pra "Raro"). `RaridadeConquista` tem 6 valores (`comum, incomum, rara, epica, lendaria, impossivel`) — não há mapeamento 1:1 pronto. Ver decisão §6.2.

### 3.5 O "ícone" central do Figma não é nenhum componente da Anatomia — e não corresponde ao sistema de ícone do jogo

A camada `Group 5` (141×147, 3 polígonos sobrepostos em `Primary/secondary-200`, `Primary/primary` e branco) **não aparece na tabela de Anatomia** do `DESIGN.md` (que só lista `Tag`, `Footer`, `Button`, e os dois ícones ocultos `Toggle`/`AV`) — ao contrário de `Tag`/`Footer`, que são explicitamente mapeados pra componentes DS, `Group 5` não tem `data-component` nenhum no HTML extraído. Tudo indica que é uma forma de placeholder do Figma (silhueta de troféu/emblema genérica), não uma peça de conteúdo real por conquista.

Isso conflita com `iconeConquista()` (`conquistas.ts`), que hoje escolhe um **emoji por conquista** (ex. `🏆` primeira vitória, `👑` O IMORTAL, `🐐` O Recordista) — é o único elemento visual que varia por conquista individual hoje, e o design não tem onde encaixar essa variação (o polígono é fixo, sem prop de conteúdo). Ver decisão §6.3.

### 3.6 Linha de contexto (evento/ano) não existe no design

`ConquistaPopup` atual mostra, abaixo da descrição, `{eventoNome} · {ano}` (origem `'rodada'`) ou só `{ano}` (origem `'fim_temporada'`) — informação real (em que corrida/temporada a conquista saiu), não decorativa. O `DESIGN.md` não tem nenhuma camada equivalente — a Anatomia vai direto de "Subiu da F3 para F2" (descrição) pro Footer. Ver decisão §6.4.

### 3.7 O que o design system já cobre sem gap

| Peça do design | Componente `fast-ds` | Observação |
|---|---|---|
| Overlay + card ancorado embaixo, 90% preto, cantos de cima | `BottomSheet` | Ver §3.2/§3.3 — bate visualmente, mas traz um header que o Figma não tem. |
| "Raro" (Tag, `Style=Rare, Highlight=False`) | `Tag` `estilo="rare" destaque={false}` | Ver §3.4 pro resto da escala de raridade. |
| Footer "Continuar" (`Type=1 Action`) | `Footer tipo="acoes" acaoPrimaria={{ texto: 'Continuar', onClick: marcarConquistaVista }}` (via `acaoPrimaria` do `BottomSheet`, não um `<Footer>` solto) | `Button` da Anatomia (#3) é a instância que o próprio `Footer`/`AcaoFooter` já renderiza por dentro — não é uma peça separada a montar. |
| "Icon Left"/"Icon Right" (`Toggle`/`AV`) | — | Marcados `visible: false` na própria Anatomia — não existe `Toggle` no `fast-ds` (mesma constatação já feita no PRD do rádio de Safety Car), mas como a camada está oculta neste estado, não é um gap a resolver agora. |
| Textos (nome, descrição, "Conquista desbloqueada") | `<h2>`/`<p>`/`<span>` com tokens de `/fast-ds-tokens` | Sem componente DS dedicado — igual hoje, só trocando as classes Tailwind por tokens (`Heading/Medium/Bold`, `Body/Medium/Regular`, `Body/Small/Bold`). |

## 4. Comportamento proposto

Sem mudança de **quando** o popup aparece ou **como a fila avança** — só o miolo visual:

- `ConquistaPopup` passa a renderizar um `<BottomSheet>` no lugar do `<div className="fixed inset-0 ...">` atual.
- Conteúdo do `BottomSheet` (children): bloco com `Tag` (raridade) + "Conquista desbloqueada", ícone central, nome, descrição, e — se a decisão do §6.4 mantiver — a linha de contexto de origem.
- `acaoPrimaria` do `BottomSheet`: `{ texto: 'Continuar', onClick: marcarConquistaVista }`.
- `onFechar` do `BottomSheet`: mesmo handler (`marcarConquistaVista`) — dispensar do jeito que for (botão, Esc, ou clique fora) tem o mesmo efeito de "vista", igual ao raciocínio de `ModalNovoRegulamento` ("o aviso tem uma ação só e é a mesma coisa que fechar").
- Nenhuma mudança em `carreiraReducer.ts`, `useCarreiraFlow.ts` ou na detecção de conquistas (`conquistas.ts`) — isso é 100% visual.

## 5. Fora de escopo

- Qualquer mudança em **quando**/**quais** conquistas disparam (`detectarConquistasRodada`, `detectarConquistasFimDeTemporada`, etc.) — fora de escopo total.
- Mudar a fila de popups (mostrar mais de 1 por vez, reordenar por raridade, etc.) — não pedido.
- Criar ilustração/arte nova por conquista (mudaria o escopo de "trocar visual" pra "produção de assets") — a menos que o Wag decida isso no §6.3.
- Alterar `ConquistasBadges.tsx`/`TrofeusCarreira.tsx` (telas de resumo de carreira que também mostram conquistas, mas noutro layout) — fora de escopo, não fazem parte deste design.

## 6. Riscos e decisões em aberto (Wag decide)

1. **Header/X do `BottomSheet` que o Figma não tem (§3.3).** Duas opções:
   - **(A) Usar `BottomSheet` como está**, aceitando o header com X no topo (ganha de graça: Esc fecha, clique fora fecha, e reaproveita o componente DS em vez de reconstruir a casca do zero). Diferença visual pequena (uma barra fina + X) contra o ganho de reuso.
   - **(B) Construir a casca manualmente** (overlay + painel com o CSS exato do `BottomSheet`, sem `Header`), pra fidelidade 100% ao Figma — perde Esc/clique-fora de graça (precisaria reimplementar) e foge da convenção do projeto de "nunca recriar componente do design system com markup solto" (`DESIGN.md`, regra de implementação).
   Recomendo (A) — mesmo espírito de manter DS antes de fidelidade pixel-perfeita, e o X é um padrão de dispensa que o jogador já reconhece de outras bottom sheets do jogo — mas a escolha final é do Wag.
2. **Mapeamento de raridade → `estilo` do `Tag` (§3.4).** `Tag` só tem 5 estilos pras 6 raridades do jogo. Proposta:
   | Raridade | `estilo` | `destaque` |
   |---|---|---|
   | `comum` | `common` | `false` |
   | `incomum` | `default` | `false` |
   | `rara` | `rare` | `false` (bate com o Figma) |
   | `epica` | `epic` | `false` |
   | `lendaria` | `gold` | `false` |
   | `impossivel` | `gold` | `true` (preenchido — reserva o único visual "mais forte" que sobra pro tier mais raro do jogo) |
   Confirmar com o Wag antes de codar — é uma escolha de balanceamento visual, não uma dedução técnica.
3. **O que entra no lugar do `Group 5` (polígonos) (§3.5).** Como não é um componente DS nem está na Anatomia, três caminhos: manter o emoji atual de `iconeConquista()` (zero trabalho novo, mas não usa a forma do Figma); usar a forma de "emblema" do Figma só como moldura fixa (SVG estático, sem variar por conquista — mesmo tratamento que o PRD do rádio deu pra "onda de rádio", ilustração decorativa sem dado real por trás); ou pedir arte nova por conquista/raridade ao Wag (escopo maior, fora deste PRD). Recomendo manter o emoji — é a única coisa que hoje diferencia uma conquista da outra visualmente — mas fica pro Wag decidir.

   **Resolvido em 12/09/2026:** o terceiro caminho (arte nova) aconteceu — pacote de 68 ícones
   3D comissionados, um por conquista (`packages/fast-ds/src/assets/conquistas`). A moldura
   de hexágonos do Figma virou `EmblemaConquista.tsx` (compartilhada com a tela final de
   carreira, que até então usava um losango diferente pra badge de conquista) com o ícone
   real centralizado por cima; conquista sem arte ainda (12 das 68, mecânica não implementada)
   continua caindo no emoji de `iconeConquista()`.
4. **Linha de contexto de origem (evento/ano) (§3.6).** Manter (abaixo da descrição, mesmo texto de hoje) ou remover pra bater 100% com o Figma? Recomendo manter — é informação real, não decorativa, e sua ausência não parece intencional (o design não tem sequer um espaço reservado pra ela, sugerindo que simplesmente não foi contemplada no frame do Figma, não que foi removida de propósito).

## 7. Plano de implementação sugerido

1. Wag decide os 3 pontos do §6. O resto assume as recomendações acima — se qualquer uma mudar, ajustar antes de codar.
2. Reescrever `ConquistaPopup.tsx`: `BottomSheet` (`onFechar`/`acaoPrimaria` = `marcarConquistaVista`) envolvendo o conteúdo (`Tag` + textos + ícone), tokens de `/fast-ds-tokens` no lugar das classes Tailwind atuais.
3. Ajustar o mapeamento `COR_RARIDADE`/`LABEL_RARIDADE` atual pra virar o mapeamento raridade → `estilo`/`destaque` do `Tag` (tabela do §6.2), mantendo `LABEL_RARIDADE` pro texto dentro da própria `Tag` (a Tag já mostra o texto como `children`, ex. `<Tag estilo="rare">Raro</Tag>`).
4. Nenhuma mudança em `conquistas.ts`, `carreiraReducer.ts`, `useCarreiraFlow.ts` ou `CarreiraFlow.tsx` — só o arquivo do componente.
5. Teste manual: disparar uma conquista de cada raridade (ou mockar `state.conquistasParaMostrar` temporariamente) pra conferir as 6 cores/`estilo`s do Tag lado a lado.

## 8. Critérios de aceite

- [ ] `ConquistaPopup` usa `BottomSheet`, `Tag` e `Footer` (via `acaoPrimaria`) do `fast-ds` — nenhum componente do design system recriado com HTML/CSS solto.
- [ ] Nenhum valor de cor/espaçamento/tipografia hardcoded — tudo resolvido via `/fast-ds-tokens`.
- [ ] Fila de conquistas, `marcarConquistaVista` e o gate de Fast Mode (`state.conquistasParaMostrar.length > 0` pausa o turbo) continuam funcionando exatamente como hoje.
- [ ] As 6 raridades (`comum` a `impossivel`) renderizam com o mapeamento de `Tag` decidido no §6.2, sem nenhuma caindo num estilo não mapeado.
- [ ] Decisão do Wag nos 3 pontos do §6 refletida no código (header do BottomSheet, ícone central, linha de contexto).
- [ ] Sem regressão de acessibilidade: `BottomSheet` já cuida de `role="dialog"`/`aria-modal`/trava de scroll — confirmar que `aria-label` (via `titulo`, se usado) descreve a conquista pro leitor de tela.

---

_PRD gerado a partir de `PRD/design/DESIGN-modal-conquista-desbloqueada.md` (frame "Carreira - Conqusitas", node `6881:30074`) e da investigação do código-fonte de `GAS-games-br/theimmortal` (`ConquistaPopup.tsx`, `conquistas.ts`, `useCarreiraFlow.ts`, `fast-ds`). As 3 decisões do §6 ficam para o Wag antes de fechar a implementação._