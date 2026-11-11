# Arte dos tetos da cidade (r10)

Os obstáculos de passar abaixado da cidade agora vêm do muro do fundo. Placa, toldo, galho, viga e
andaime vinham do céu e foram trocados (r10). A arte foi gerada no ChatGPT em 2026-11-11, na mesma
conversa da arte dos cenários ("Gerar fundo parque"; ver [prompts.md](prompts.md)), uma peça por
pedido. Os PNGs vieram com fundo transparente; o recorte e a conversão para `.webp` estão em
`src/features/corrida/imagens/objetos/`.

Enquanto o sprite carrega, o jogo desenha a peça em vetor (`src/features/corrida/desenho/tetos.ts`).

## Abertura da leva

> Agora uma nova leva: obstáculos da CIDADE que o cachorro passa ABAIXADO. Todos ficam junto do
> muro de tijolo que aparece atrás da calçada da cena da cidade (o muro NÃO entra no desenho). Mesmo
> estilo de sempre: cartoon com contorno escuro grosso, cores saturadas, sombreado simples, vista
> lateral reta. Fundo TRANSPARENTE, sem sombra, sem chão, sem texto, sem pessoas, sem animais. Vou
> pedir uma peça por vez.

## As peças

A proporção pedida é a da caixa de colisão, porque o jogo estica a imagem até ela.

| Arquivo | Proporção pedida | Pedido (resumo) |
| --- | --- | --- |
| `arvore.webp` | 1 × 2 | Árvore atrás do muro: copa redonda na metade de cima, tronco grosso do lado direito cortado reto (abaixo dele o tronco fica atrás do muro) e um galho que sai para a esquerda e cai para a frente com uma cortina de folhas tipo chorão até a borda de baixo. |
| `letreiro.webp` | 4 × 5 | Letreiro de pet shop: braço de ferro trabalhado com voluta no alto, duas correntes e uma placa de madeira azul com miolo creme e um ossinho branco, encostando na borda de baixo. |
| `varal.webp` | 8 × 3 | Varal: dois braços de ferro nas pontas de cima, corda com leve barriga e, presos com prendedores, toalhas azul, amarela, branca listrada e verde, um roupão rosa e uma toalhinha de cachorro com estampa de osso. |
| `buganvilia.webp` | 2 × 1 | Faixa de galhos no alto, como se transbordasse do muro, e uma cortina densa de buganvília rosa e magenta até a borda de baixo. |
| `vasos.webp` | 5 × 3 | Trilho de ferro no alto e três vasos de barro em correntes curtas, transbordando de samambaias com florzinhas brancas e amarelas até a borda de baixo. |

## Como o jogo encaixa

- Letreiro, varal, buganvília e vasos ocupam a caixa de colisão inteira, de 0,6 m até o alto do
  muro (2,1 m, `TOPO_TETO`).
- Árvore: o tronco veio cortado a 0,326 da altura, contando de baixo (`ARVORE_CORTE_DE_BAIXO` em
  `tetos.ts`), e não a 3/8 como foi pedido. Por isso o jogo desenha a árvore em dois pedaços. Abaixo
  do corte, a folhagem ocupa da borda de baixo da colisão até o alto do muro, e o corte cai no muro.
  Acima dele, a copa mantém a proporção da arte na largura da colisão. Se a arte for refeita, meça o
  corte de novo.
