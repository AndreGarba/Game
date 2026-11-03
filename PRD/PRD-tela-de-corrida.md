# PRD — Tela de corrida

**Projeto:** Hora do Banho
**Status:** primeira versão jogável no navegador; falta teste em celular real
**Definições:** André · **Redação:** Claude
**Data:** 02/11/2026
**Depende de:** [PRD-conceito-e-regras-do-jogo.md](PRD-conceito-e-regras-do-jogo.md),
[PRD-motor-e-ranking-por-replay.md](PRD-motor-e-ranking-por-replay.md)

---

## 1. Objetivo

A tela onde se joga: desenha a partida, recebe pulo e abaixar, mostra placar e perigo, e leva do
início ao fim de uma partida e de volta para a próxima.

## 2. Fluxo

```
Abertura GAS Games ──fim ou toque──▶ [Gire o celular] ──girou ou "Jogar na vertical"──▶ Home ──Jogar──▶ História ──toque ou Pular──▶ Corrida ──batida/queda/pego──▶ Fim ──Correr de novo──▶ Corrida
                     │  ▲
     app em 2º plano │  │ Continuar
                     ▼  │
                    Pausa
```

| Fase | Conteúdo |
| --- | --- |
| Abertura | Animação do logo da GAS Games (~6,7 s), tela própria (`features/abertura`). Toque, clique ou tecla pulam. O jogo baixa enquanto ela toca. Som só se o navegador deixar tocar sem toque prévio; com movimento reduzido, mostra o logo pronto por 1,5 s. |
| Gire o celular | Só em celular em pé, logo depois da abertura (`features/orientacao`). Animação Lottie do celular girando, título e motivo. Girar avança sozinho; **Jogar na vertical** segue em pé, porque o jogo funciona nas duas orientações. Já deitado ou sem toque, a tela não aparece. |
| História | Frame Story do Figma (7954:8586), `features/historia`: página de HQ com 4 quadros (Pipoca sonhando com churrasco → tutor chama para o banho → "não mesmo!" → foge pela porta). Um quadro de cada vez, a cada 1,8 s, com estouro e clarão; o balão estoura logo depois. Toque (ou Espaço/Enter) adianta o quadro; com a página completa, toque vai para a corrida (trava de 0,7 s contra toque acidental). **Pular** (ou Esc) vai direto. Falas traduzidas, na fonte Luckiest Guy. Com movimento reduzido, a página aparece inteira. |
| Home | Frame Home do Figma "Hora do banho" (7953:8401): azulejos, espuma, logo "A Hora do Banho" e botão **JOGAR** (`features/home`). Jogar (ou Espaço/Enter) começa a corrida direto. Efeitos em Three.js (`features/home/efeitos`): gotas que escorrem pelos azulejos aos trancos, refratando a imagem, gotas paradas que surgem e evaporam, e vapor subindo da espuma. Sem WebGL, ou enquanto o Three.js baixa, ficam as imagens estáticas; com movimento reduzido, um quadro parado. Substitui o antigo cartão de início, que tinha como jogar, a dica da lama e o recorde: esses textos ficaram sem lugar na tela por enquanto. |
| Corrida | Canvas em tela cheia + placar. |
| Pausa | Automática quando o app vai para segundo plano. Botão **Continuar**. |
| Fim | Motivo do fim, pontos, distância, ossinhos, ossinhos de ouro, recorde ou "Novo recorde!", botão **Correr de novo**. |

Espaço e Enter também iniciam, continuam e reiniciam.

## 3. Controles

| Ação | Teclado | Toque |
| --- | --- | --- |
| Pular | Espaço, ↑ ou W | toque, ou deslizar para cima |
| Abaixar | ↓ ou S | deslizar para baixo |

- O deslize dispara **no meio do gesto**, ao passar de 24 px, sem esperar soltar o dedo. Em
  velocidade alta, 100 ms decidem uma batida.
- O toque simples conta ao soltar o dedo.
- No máximo uma ação por tick: dois toques no mesmo quadro viram ticks seguidos.
- Toda ação vai para o log de decisões com o tick em que foi aplicada (base do ranking por
  replay).

## 4. Relógio e desenho

- O controlador (`controladorCorrida.ts`) converte o tempo do `requestAnimationFrame` em ticks de
  1/60 s. Depois de uma pausa longa, recupera no máximo 5 ticks por quadro em vez de "teletransportar".
- O desenho interpola a posição do cachorro entre o tick anterior e o atual: fica suave em telas
  de 90 e 120 Hz.
- O placar em React atualiza a cada 6 ticks (10 vezes por segundo), não a cada quadro.

## 5. Cena

- **Câmera:** cachorro a 28% da largura. Mostra cerca de 18 m de pista. Em tela vertical, a escala
  é limitada pela largura e o chão sobe para a cena ficar no meio.
- **Falso 3D em 3 camadas, com a arte do Figma** (frame 7960:8725, `features/corrida/imagens`):
  céu com sol e cidade ao fundo (parado: o sol repetido viraria dois), fileira de casas (45% da
  velocidade, cópias alternadas espelhadas porque as bordas da arte não emendam) e calçada (presa
  à pista, 100%). O chão fica na altura da calçada do Figma (322 de 360). A mesma arte vale para
  os quatro cenários até existir arte de parque, rio e centro. Enquanto a arte carrega, vale o
  cenário vetorial antigo, com cores por cenário.
- **Calçada:** as faixas de sombra da arte andam com a pista e dão a sensação de velocidade. Vãos
  desenhados como água (rio e lago) ou buraco com cone.
- **Obstáculos** desenhados em vetor, cada um com forma própria (carro com rodas e vidro, ônibus,
  banco, chafariz, toldo listrado, galho com folhas, placa amarela...).
- **Coletáveis:** ossinho 🦴, ossinho de ouro 🏅 com brilho, lenço 🧻.

### 5.1 Cachorro

Desenhado em vetor (o emoji ficava quase invisível no canvas): corpo, cabeça, orelha, focinho,
língua, rabo abanando e pernas que alternam conforme a distância percorrida. No ar, as pernas
esticam. Abaixado, o corpo achata. Cada nível de sujeira acrescenta uma mancha de lama no corpo.

### 5.2 Tutor

- **Sempre na tela**, correndo atrás do cachorro com a esponja na mão.
- A vantagem real (até 20 m) não cabe entre a margem e o cachorro, então é **comprimida**:
  vantagem máxima = tutor colado na margem esquerda; vantagem zero = esponja encostando no
  cachorro.
- **Repete os movimentos do cachorro.** O controlador guarda o rastro dos últimos 240 ticks
  (posição, altura, se estava no chão, se estava abaixado). O tutor faz o que o cachorro fez
  quando passou por aquele mesmo ponto da pista. Como os obstáculos estão parados no mundo, ele
  pula o mesmo banco, sobe no mesmo carro e se agacha sob o mesmo toldo.
- É só visual: quem decide se o tutor pega continua sendo a vantagem calculada pelo motor.

## 6. Placar (HUD)

- Selos do Figma (frame 7960:8725), recortados da folha de sprites do HUD: **Distância** em metros
  e **Velocidade** em km/h no alto à esquerda, botão de **pausa** no alto à direita. A arte traz
  zeros desenhados ("0000 m", "00 km/h"): uma placa creme cobre os zeros e o valor ao vivo vai por
  cima, na fonte Luckiest Guy, com zeros à esquerda como placar de fliperama.
- Velocidade = a do motor de fato: `velocidadeBase(x) × multiplicadorSujeira(sujeira)`, em km/h
  (de 29 a 72). A lama baixa o número na hora.
- O botão de pausa abre a mesma pausa de quando o app vai para segundo plano, e some enquanto o
  jogo está pausado.
- Tutor, sujeira e ossinhos não estão no frame. Decisão do André: continuam no cartão de antes,
  abaixo da pausa (barra **Tutor**, cheia = longe; 5 bolinhas de **Sujeira**; 🦴 e 🏅).
- Medidas em 1/360 da altura, como o frame; em tela mais estreita que o frame, pela largura.
  Respeita a área segura do iPhone (notch).

## 7. Idiomas

Português, inglês e espanhol desde esta primeira tela, escolhidos pelo idioma do aparelho, com
português como reserva. Textos em `src/locales/{pt,en,es}/jogo.json`; números formatados pelo
idioma.

## 8. Recorde

Guardado no aparelho (`localStorage`, chave `horadobanho:recorde`). Em modo privado ou sem espaço,
vale só na sessão. Quando houver conta e ranking, passa a ser só um cache.

## 9. Pendências

1. **Voltar do celular:** hoje fecha o app em vez de sair da pausa ou da tela de fim (registrado
   no CLAUDE.md, seção Voltar nativo).
2. Testar em celular real: sensação de velocidade, tamanho dos obstáculos em tela vertical,
   resposta do toque.
3. PWA (instalar como app e funcionar offline).
4. Envio da partida para o ranking.
5. Som e música.
6. Design system: as cores do canvas estão em `desenho/paleta.ts` e as da interface em tokens
   provisórios (`src/estilos/tokens.css`).
