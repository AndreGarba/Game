# PRD — Conceito e regras do jogo

**Projeto:** Hora do Banho
**Status:** regras r10 implementadas no motor (ver seção 5); valores de balanceamento ainda sem teste com pessoas
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
| Lama e lenços | Cada poça de lama suja o cachorro e traz o tutor um degrau para mais perto, onde ele fica. A 4ª poça encerra a partida. Lenço limpa uma poça e o tutor recua um degrau. |
| Cenários | **Sequência fixa e igual para todos**: cidade → parque → rio → centro, e recomeça. Os obstáculos dentro de cada cenário mudam a cada partida. |
| Velocidade | Cresce até um **teto alto**. Depois disso, a dificuldade sobe pela densidade de obstáculos. |
| Público | Todas as idades. |

## 3. Regras

### 3.1 Movimento

- O cachorro corre sozinho para a direita.
- **Pular:** só a partir do chão (ou de cima de um obstáculo). Altura máxima ≈ 2,1 m. **Pulo duplo** (r7): repetir o gesto no ar dá um segundo pulo, uma vez por pulo; no alto do primeiro, chega a ≈ 4,2 m.
- **Abaixar no chão:** o cachorro fica baixo por 0,6 s.
- **Abaixar no ar:** mergulho, cai rápido e já pousa abaixado. Serve para encaixar um pulo
  seguido de uma placa baixa.

### 3.2 Obstáculos por tipo

| Tipo | Exemplos | O que acontece |
| --- | --- | --- |
| Sólido | carro, cavalete, caixa, chafariz, canteiro, banca, tora, pedra, marquise | Bater de frente = fim. Dá para pousar e correr em cima. |
| Teto | letreiro, varal, buganvília, vasos pendurados, árvore atrás do muro (só na cidade) | Vem do muro do fundo. Os presos no muro vão de 0,6 m até o alto dele (2,1 m): passa abaixado ou com pulo duplo por cima. A árvore só passa abaixado (copa em cima). Encostar = fim. |
| Vão | rio, lago, buraco de obra, bueiro | Sem chão. Cair = fim. |
| Rampa | rampa de madeira (cidade) | Não bate. O cachorro sobe correndo e, no alto, sai lançado. Pular na rampa vai mais longe. Às vezes vem um buraco logo depois: o lançamento sozinho atravessa. |
| Poça de lama | — | +1 de sujeira. O cachorro aguenta 3; a 4ª encerra a partida. Dá para pular por cima. |

### 3.3 Coletáveis

| Item | Efeito |
| --- | --- |
| Ossinho 🦴 | +10 pontos. Muitas vezes em linha no chão ou em cima de carros. |
| Ossinho de ouro | +50 pontos. Fica em lugar difícil: em cima do chafariz, na marquise, no meio do rio. |
| Lenço 🧻 | −1 de sujeira. |

### 3.4 O tutor

- A distância entre os dois (vantagem) depende só da sujeira: 20 m limpo, 15 m com 1 lama, 10 m com
  2 e 5 m com 3. Entre uma lama e outra, **a distância não muda**.
- A lama não deixa o cachorro mais lento.
- A 4ª lama é o tutor alcançando: fim de partida.
- Lenço devolve uma lama: o tutor recua um degrau.

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
| 1 | Cidade | 800 m | todos os obstáculos com arte (r4): carros, rampa, placas, toldos, buraco de obra, marquise, e também galho, chafariz, canteiro, tora, viga, pedras no rio, banca, andaime e bueiro (o ônibus saiu em r5) |
| 2 | Parque | 1.000 m | galhos, poças duplas, chafariz, canteiros, lago |
| 3 | Rio | 1.000 m | rios, pedras no meio do rio, toras, viga baixa de ponte |
| 4 | Centro | 1.200 m | bancas, andaimes, bueiros, placa seguida de poça |

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

**r10 (11/11/2026):** a pedido do André, os tetos da cidade deixam de vir do céu e passam a vir do
muro do fundo. Placa, toldo, galho, viga e andaime foram trocados por obstáculos que fazem sentido
com o muro, nas mesmas larguras e posições:

| Antes | Agora | Altura da colisão |
| --- | --- | --- |
| placa | letreiro de pet shop num braço de ferro | 0,6 m até o alto do muro |
| andaime | varal com toalhas e roupão | 0,6 m até o alto do muro |
| toldo | buganvília caindo do muro | 0,6 m até o alto do muro |
| viga | vasos de samambaia num trilho | 0,6 m até o alto do muro |
| galho | árvore atrás do muro com o galho caindo para a frente | 0,6 m até o céu |

O alto do muro é o alto dos painéis (`TOPO_TETO`, 2,1 m). Nos quatro presos no muro, além de passar
abaixado, dá para passar por cima com o pulo duplo; o pico do pulo simples (2,11 m) mal encosta e
não atravessa. A árvore tem tronco e copa acima do galho e só passa abaixado. A arte foi
gerada no ChatGPT (`referencias/cenarios/prompts-tetos.md`). A pista de cada
seed não muda; mudam só os visuais e a altura dos tetos. 30 partidas do bot, até 5 minutos cada:

| | r9 | r10 |
| --- | --- | --- |
| Distância (mediana) | 4.139 m (teto de 5 min) | 4.139 m (teto de 5 min) |
| Pontos (mediana) | 6.649 | 6.654 |
| Ossinhos (mediana) | 227,5 | 227,5 |
| Ossinhos de ouro (mediana) | 4 | 4 |
| Fim | 30 no limite | 30 no limite |

Sem batida, queda, pego ou divergência de replay. Para o bot quase nada muda: ele já passava
abaixado por todos os tetos. A mudança é para quem joga, porque a arte agora mostra espaço livre
acima do teto e o motor concorda com ela.

**r9 (11/11/2026):** a sequência passa a ser cidade → parque → bairro japonês → beco abandonado,
500 m cada (antes: cidade 800, parque 1000, rio 1000, centro 1200). A primeira versão da r9 trocava
a cada 1000 m; o André pediu 500 m no mesmo PR. Uma volta pelos quatro cenários passa a ter 2 km. Também no mesmo PR, a pedido
do André, saem os vãos de água (rio, lago e o rio com pedra no meio) e o buraco ganha três
tamanhos (pequeno, médio e grande, este só a partir do nível 2) nos quatro cenários. Rio e centro saem. Os três
cenários novos têm arte e obstáculos próprios e nenhum obstáculo de teto; a cidade não muda. A
pista dos primeiros 500 m de cada seed continua igual à da r8. 30 partidas do bot, até 5 minutos
cada:

| | r8 | r9 |
| --- | --- | --- |
| Distância (mediana) | 4.139 m (teto de 5 min) | 4.139 m (teto de 5 min) |
| Pontos (mediana) | 6.554 | 6.649 |
| Ossinhos (mediana) | 206 | 227,5 |
| Ossinhos de ouro (mediana) | 8 | 4 |
| Fim | 12 pegos, 18 no limite | 30 no limite |

Sem batida, queda, pego ou divergência de replay. Os pegos da r8 vinham do centro, onde placa
seguida de poça forçava lama; sem teto, o bot desvia de toda poça. Para o bot a r9 é mais fácil, e
o teto de 5 minutos não deixa medir quanto. A primeira tentativa da r9 teve 8 batidas em 30: yatai
(2,8 m) e caçamba (2,33 m) eram caixas retas. Ganharam o contorno da arte em `perfis.ts`, como o
carro, e o carrinho de pipoca baixou de 2,8 para 2,6 m.

**r8 (08/11/2026):** a lama deixa de frear o cachorro e de trazer o tutor aos poucos. Cada poça
coloca o tutor num degrau fixo (20, 15, 10 e 5 m) e a 4ª encerra a partida como `pego`. Lenço
continua tirando 1 de sujeira, então recua o tutor um degrau e devolve uma poça. A pista de cada
seed não muda. 30 partidas do bot, até 5 minutos cada:

| | r7 | r8 |
| --- | --- | --- |
| Distância (mediana) | 3.610 m | 4.139 m (teto de 5 min) |
| Pontos (mediana) | 5.946 | 6.554 |
| Ossinhos (mediana) | 188,5 | 206 |
| Ossinhos de ouro (mediana) | 8 | 8 |
| Fim | 22 pegos, 8 no limite | 12 pegos, 18 no limite |

Sem batida, queda ou divergência de replay. Os 12 pegos acontecem no centro, a partir de 3.125 m.
O bot sobe porque olha o futuro e pula quase toda poça evitável; 18 de 30 param no teto de 5 minutos,
então a mediana de distância não mede até onde ele iria. Para uma pessoa, o limite de 3 poças deve
pesar mais do que no bot: falta testar com jogadores.

**r7 (05/11/2026):** o pulo volta ao de r4 (2,1 m, 0,65 s no ar; `VEL_PULO` 13, `GRAVIDADE` 40,
mergulho −18) e entra o **pulo duplo**: repetir o gesto de pular no ar dá de novo `VEL_PULO`, uma
vez por pulo. No alto do primeiro, chega a ≈ 4,2 m. O carro passa dos dois jeitos: com pulo
simples o cachorro pousa no porta-malas e sobe o vidro traseiro pelo contorno; com o duplo cai
direto no teto. Os ossinhos de ouro do chafariz (5,2 m) e da marquise (5,3 m) foram
reposicionados para continuarem exigindo sair de cima do objeto. 30 partidas do bot, até 5 minutos
cada:

| | r6 | r7 |
| --- | --- | --- |
| Distância (mediana) | 3.635 m | 3.610 m |
| Pontos (mediana) | 5.826 | 5.946 |
| Ossinhos (mediana) | 183 | 188,5 |
| Ossinhos de ouro (mediana) | 7,5 | 8 |
| Fim | 22 pegos, 8 no limite | 22 pegos, 8 no limite |

Sem batida, queda ou divergência de replay.

**r6 (05/11/2026):** carro, tora, chafariz e banca ganham **contorno** (`src/engine/perfis.ts`),
medido no sprite. Em cima deles, o cachorro segue a forma: no carro, pousa no porta-malas, sobe o
vidro traseiro até o teto (2,6 m), desce o para-brisa até o capô e cai no fim. A traseira é parede:
quem chega pelo chão sem pular bate. Os outros sólidos continuam caixas. 30 partidas do bot, até
5 minutos cada:

| | r5 | r6 |
| --- | --- | --- |
| Distância (mediana) | 3.635 m | 3.635 m |
| Pontos (mediana) | 5.851 | 5.826 |
| Ossinhos de ouro (mediana) | 9,5 | 7,5 |
| Fim | 22 pegos, 8 no limite | 22 pegos, 8 no limite |

Sem batida, queda ou divergência de replay.

**r5 (05/11/2026):** obstáculos em tamanho real, na régua do tutor (a arte dele mede 3,2 m no
jogo e representa 1,8 m, então 1 m real = 1,79 m do jogo): carro 7,8 × 2,6 m, cavalete
3,8 × 1,79 m, caixa 1,27 × 1,07 m, tora 1,66 × 0,81 m, canteiro 4,5 × 0,81 m, chafariz 5,4 × 1,07 m
(borda da bacia), banca 4,3 × 2,86 m (quiosque baixo), marquise a 4,2 m de altura. O comprimento
de cada um sai da proporção da arte. Os tetos não mudam, porque a altura deles é a do cachorro
abaixado. O **ônibus saiu**: com 5,4 m de altura, não cabe em pulo nenhum. Para passar por cima do
carro, o pulo subiu de 2,1 para 3,24 m (`VEL_PULO` 13 → 18, `GRAVIDADE` 40 → 50, mergulho −18 → −22),
com 0,72 s no ar (r4: 0,65 s). 30 partidas do bot, até 5 minutos cada:

| | r4 | r5 |
| --- | --- | --- |
| Distância (mediana) | 3.765 m | 3.635 m |
| Pontos (mediana) | 6.881 | 5.851 |
| Ossinhos (mediana) | 218,5 | 183 |
| Ossinhos de ouro (mediana) | 18,5 | 9,5 |
| Fim | 23 pegos, 7 no limite | 22 pegos, 8 no limite |

Sem batida, queda ou divergência de replay. Os ossinhos de ouro caem pela metade: os do chafariz
e da marquise ficaram mais altos e o bot alcança menos. Para uma pessoa, o carro vira plataforma
(7,8 m não se atravessa num pulo só): pula em cima, corre e pula para descer.

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
