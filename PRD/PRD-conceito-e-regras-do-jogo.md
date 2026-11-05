# PRD — Conceito e regras do jogo

**Projeto:** Hora do Banho
**Status:** regras r4 implementadas no motor; valores de balanceamento ainda sem teste com pessoas
**Definições:** André · **Redação:** Claude
**Data:** 02/11/2026

---

## 1. O jogo em uma frase

Corrida infinita (endless runner) 2D para todos os públicos: o jogador é um **cachorro** fugindo
do **tutor**, que quer dar banho nele. A velocidade só aumenta. Quem vai mais longe, com mais
ossinhos, sobe no ranking.

**Inspiração de gênero:** corridas infinitas de celular. A pista, os cenários, os personagens e a
arte são próprios do Hora do Banho; não é recriação de nenhum jogo existente.

## 2. Decisões tomadas

| Tema | Decisão |
| --- | --- |
| Quem o jogador controla | O cachorro. O tutor é o perseguidor, controlado pelo jogo. |
| Visão | 2D lateral com **falso 3D em 3 camadas** (fundo, meio, pista). As camadas são só visuais (parallax); o cachorro corre numa linha só. |
| Controles | **Pular** e **abaixar**. Nada de trocar de faixa. |
| Obstáculos | O cachorro pode **subir e correr em cima** de carros, bancos, chafarizes, marquises. Bater de frente encerra. Rios e buracos são vãos: cair encerra. Placas, galhos e toldos só passam abaixado. |
| Pontuação | **Distância + coletáveis** (ossinhos e ossinhos de ouro). |
| Lama e lenços | Poça de lama suja o cachorro e o deixa mais lento, e o tutor se aproxima. Lenço limpa um pouco e o cachorro volta a abrir distância. |
| Cenários | **Sequência fixa e igual para todos**: cidade → parque → rio → centro, e recomeça. Os obstáculos dentro de cada cenário mudam a cada partida. |
| Velocidade | Cresce até um **teto alto**. Depois disso, a dificuldade sobe pela densidade de obstáculos. |
| Público | Todas as idades. |

## 3. Regras

### 3.1 Movimento

- O cachorro corre sozinho para a direita.
- **Pular:** só a partir do chão (ou de cima de um obstáculo). Altura máxima ≈ 2,1 m.
- **Abaixar no chão:** o cachorro fica baixo por 0,6 s.
- **Abaixar no ar:** mergulho, cai rápido e já pousa abaixado. Serve para encaixar um pulo
  seguido de uma placa baixa.

### 3.2 Obstáculos por tipo

| Tipo | Exemplos | O que acontece |
| --- | --- | --- |
| Sólido | carro, ônibus, cavalete, caixa, chafariz, canteiro, banca, tora, pedra, marquise | Bater de frente = fim. Dá para pousar e correr em cima. |
| Teto | placa, galho, toldo, viga de ponte, andaime | Só passa abaixado. Encostar em pé = fim. |
| Vão | rio, lago, buraco de obra, bueiro | Sem chão. Cair = fim. |
| Rampa | rampa de madeira (cidade) | Não bate. O cachorro sobe correndo e, no alto, sai lançado. Pular na rampa vai mais longe. Às vezes vem um buraco logo depois: o lançamento sozinho atravessa. |
| Poça de lama | — | +1 de sujeira (máximo 5). Dá para pular por cima. |

### 3.3 Coletáveis

| Item | Efeito |
| --- | --- |
| Ossinho 🦴 | +10 pontos. Muitas vezes em linha no chão ou em cima de carros. |
| Ossinho de ouro | +50 pontos. Fica em lugar difícil: em cima do chafariz, na marquise, no meio do rio. |
| Lenço 🧻 | −1 de sujeira. |

### 3.4 O tutor

- Corre um pouco mais devagar que um cachorro limpo (97% da velocidade base).
- Cada nível de sujeira deixa o cachorro 4% mais lento. **Com 1 de sujeira o tutor já começa a se
  aproximar.**
- A distância entre os dois (vantagem) começa em 12 m e vai no máximo a 20 m.
- Vantagem zero: o tutor pegou, fim de partida.

### 3.5 Fim de partida

Três jeitos, sem vida extra:

1. **Batida** de frente num sólido ou num teto.
2. **Queda** num vão.
3. **Pego** pelo tutor.

### 3.6 Pontuação

`pontos = metros + 10 × ossinhos + 50 × ossinhos de ouro`

### 3.7 Cenários

| Ordem | Cenário | Comprimento | Obstáculos típicos |
| --- | --- | --- | --- |
| 1 | Cidade | 800 m | todos os obstáculos com arte (r4): carros, rampa, placas, toldos, buraco de obra, marquise, e também galho, chafariz, canteiro, tora, viga, pedras no rio, ônibus, banca, andaime e bueiro |
| 2 | Parque | 1.000 m | galhos, poças duplas, chafariz, canteiros, lago |
| 3 | Rio | 1.000 m | rios, pedras no meio do rio, toras, viga baixa de ponte |
| 4 | Centro | 1.200 m | ônibus, bancas, andaimes, bueiros, placa seguida de poça |

Depois do centro, a sequência recomeça na cidade. Todos os cenários também têm cavaletes, caixas,
poças, linhas de ossinhos e lenços.

### 3.8 Dificuldade

- Velocidade: começa em 8 m/s e se aproxima de 20 m/s sem passar.
- Degraus de dificuldade aos 0, 250, 800 e 2.000 m. Cada degrau libera obstáculos novos e encurta
  o respiro entre um trecho e outro (de ~2 s no começo para ~0,7 s).

## 4. Decisões em aberto

1. **Batida e queda encerram na hora.** Alternativa: tropeço que só custa vantagem e deixa o tutor
   decidir o fim.
2. **Seed do ranking:** sorteada pelo servidor a cada partida, ou uma seed do dia igual para todos.
3. **Valores:** pontos, velocidades, sujeira e vantagem são primeira tentativa. Precisam de teste
   com pessoas.
4. Conta, data e âncora de lançamento.

## 5. Referência de balanceamento

**r4 (05/11/2026):** a cidade passa a sortear todos os obstáculos que têm arte, também galho,
chafariz, canteiro, tora, viga, pedras no rio, ônibus, banca, andaime e bueiro. Os outros
cenários não mudam. 30 partidas do bot, até 5 minutos cada: mediana de 3.765 m (r3: 3.720 m),
23 pegos e 7 no limite (igual a r3), sem batida, queda ou divergência de replay.

**r3 (05/11/2026):** rampa nova (3 × 1,2 m) na cidade, em dois moldes: rampa com linha de
ossinhos no arco do lançamento (desde o começo) e rampa seguida de buraco, com ossinho de ouro
no meio do salto (a partir de 250 m). 30 partidas do bot, até 5 minutos cada:

| | r2 | r3 |
| --- | --- | --- |
| Distância (mediana) | 3.748 m | 3.720 m |
| Ossinhos de ouro (mediana) | 14 | 17 |
| Fim | 22 pegos, 8 no limite | 23 pegos, 7 no limite |

Nenhuma batida nem queda na rampa: o lançamento sozinho atravessa o buraco do molde.

**r2 (05/11/2026):** banco (1,6 × 0,5 m) virou cavalete (1,7 × 0,8 m) e lixeira (0,7 × 0,9 m) virou
caixa (1,2 × 1 m), para os obstáculos terem o tamanho da referência de arte. 30 partidas do bot,
até 5 minutos cada:

| | r1 | r2 |
| --- | --- | --- |
| Distância (mediana) | 3.733 m | 3.748 m |
| Pontos (mediana) | 6.481 | 6.773 |
| Ossinhos (mediana) | 206 | 233,5 |
| Fim | 22 pegos, 8 no limite de 5 min | 22 pegos, 8 no limite de 5 min |

Para o bot, que é o teto de habilidade, nada muda: os dois obstáculos continuam fáceis de pular
(o pulo chega a 2,1 m). Para uma pessoa, a caixa mais larga pede pulo um pouco mais cedo.

**r1:** o bot de simulação joga olhando o futuro, melhor que qualquer pessoa. Em 10 partidas de até
10 minutos: mediana de 4,3 km, entre 3,2 e 9,4 km. Em 8 das 10 o tutor alcançou, porque alguns
trechos do centro obrigam a pisar na lama. Isso garante que toda partida termina, mesmo para quem
nunca erra um pulo.
