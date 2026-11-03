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
Abertura GAS Games ──fim ou toque──▶ [Gire o celular] ──girou ou "Jogar na vertical"──▶ Início ──Correr──▶ Corrida ──batida/queda/pego──▶ Fim ──Correr de novo──▶ Corrida
                     │  ▲
     app em 2º plano │  │ Continuar
                     ▼  │
                    Pausa
```

| Fase | Conteúdo |
| --- | --- |
| Abertura | Animação do logo da GAS Games (~6,7 s), tela própria (`features/abertura`). Toque, clique ou tecla pulam. O jogo baixa enquanto ela toca. Som só se o navegador deixar tocar sem toque prévio; com movimento reduzido, mostra o logo pronto por 1,5 s. |
| Gire o celular | Só em celular em pé, logo depois da abertura (`features/orientacao`). Animação Lottie do celular girando, título e motivo. Girar avança sozinho; **Jogar na vertical** segue em pé, porque o jogo funciona nas duas orientações. Já deitado ou sem toque, a tela não aparece. |
| Início | Título, frase, como jogar (teclado ou toque, conforme o aparelho), dica da lama e dos lenços, botão **Correr**, recorde. O aviso de girar saiu daqui e virou a tela anterior. |
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
- **Falso 3D em 3 camadas:** fundo (silhuetas, 15% da velocidade), meio (prédios com janelas ou
  árvores, 45%) e pista (100%). Cores e paisagem mudam por cenário.
- **Chão** com marcas a cada 2 m, para dar sensação de velocidade. Vãos desenhados como água (rio
  e lago) ou buraco com cone.
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

- Esquerda: metros, ossinhos e ossinhos de ouro.
- Direita: barra **Tutor** (cheia = longe, esvazia quando ele se aproxima) e 5 bolinhas de
  **Sujeira**.
- Respeita a área segura do iPhone (notch).

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
