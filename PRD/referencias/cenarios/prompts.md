# Arte de parque, bairro japonês e beco abandonado

Geradas no ChatGPT em 2026-11-10/11, numa conversa só ("Gerar fundo parque"), com
[../cena-cidade.jpg](../cena-cidade.jpg) anexada como referência de estilo. Essa imagem é a cena
da cidade montada com as camadas e os objetos do jogo.

## Abertura da conversa (vale para todas as peças)

> Estou fazendo um jogo endless runner 2D de um cachorro fugindo do banho. A imagem anexa é a cena
> do cenário "cidade" já pronta e define o estilo: cartoon com contorno escuro, cores saturadas,
> sombreado simples, vista lateral reta (sem perspectiva). Vou pedir, uma por vez, peças separadas
> de novos cenários, sempre exatamente nesse estilo. Regras para todas as peças: sem texto, sem
> pessoas, sem animais, sem carros; vista lateral reta; a imagem precisa emendar nela mesma na
> horizontal (o que sai pela borda direita continua na esquerda), porque vai repetir lado a lado
> como camada de parallax.

## As 6 peças de cada cenário

| Peça | Formato pedido | O que é |
| --- | --- | --- |
| `fundo` | opaca; 3:1 (2172×724) quando tem elemento único | céu e horizonte distante |
| `meio` | fundo transparente, faixa na metade de baixo | construções ou árvores a média distância |
| `perto` | fundo transparente, 1536×1024, base opaca contínua | o que fica logo atrás da pista |
| `frente` | fundo transparente, faixa encostada na base | muro ou cerca colado na pista |
| `chao` | faixa em corte lateral na base, resto vazio | piso fino no topo, borda e terra |
| `objetos` | fundo transparente, grade 3×2, bem separados | 6 obstáculos vistos de lado, sem sombra |

O fundo com elemento único (lua, monte) tem que ser panorâmico: num quadro 3:2 a tira repete a cada
540 unidades do quadro de 360, menos que a largura da tela (780), e a lua apareceria duas vezes.

## Conteúdo pedido

**Parque** (dia): céu azul com colinas arborizadas e prédios ao longe; árvores com coreto e postes;
árvores grandes com parquinho, banco e poste sobre gramado; cerca viva alternando com cerca rústica
e pilaretes de pedra; caminho de saibro com borda de grama. Objetos: banco de praça, lixeira de
ripas, carrinho de pipoca, carrinho de mão com pá, cortador de grama, gangorra inclinada (rampa).

**Bairro japonês** (fim de tarde): céu pêssego e rosa com monte nevado, pagode e cerejeiras; casas
de telha cinza-azulada com templo, bambus e postes; lojinha de lámen, casa com shoji, torii e
cerejeira; muro de reboco branco com telhas alternando com cerca de bambu; calçada de lajes de
pedra com pétalas. Objetos: lanterna de pedra (tōrō), yatai, barris de saquê, bonsai num
banquinho, riquixá, canteiro de jardim zen.

**Beco abandonado** (começo de noite, clima de desenho, nada assustador): céu azul-petróleo com lua
cheia, galpões e caixas d'água; prédios de tijolo com varais e escadas de incêndio; fundos de
prédio com janelas tapadas, porta de enrolar e poste aceso; muro de tijolo com tapume, alambrado e
grafite só de desenhos; paralelepípedo e asfalto rachado. Objetos: caçamba de lixo, pilha de
pneus, sofá rasgado, tambor enferrujado, carrinho de supermercado, sacos de lixo com caixas.

## Buracos

Uma folha só para os quatro cenários ([buracos.webp](buracos.webp)): três formas opacas do
interior do buraco (pequeno 1:1, médio 2:1, grande 3,5:1, mesma altura), com o topo quase reto, os
cantos de cima lascados e os lados tortos e dentados, terra marrom com raízes e cano escurecendo
até quase preto. Sem calçada nem piso desenhado: o jogo desenha a forma por cima do chão do
cenário, que continua em volta. A primeira tentativa, com a calçada quebrada em volta, ficou
parecendo uma ilha flutuante e com um piso que não era o de cada cenário.

## Do arquivo do ChatGPT para o jogo

```bash
# camadas: recorte vertical, emenda horizontal e WebP
python scripts/arte/preparar_camada.py fundo.png  src/features/corrida/imagens/<cenario>/fundo.webp  --altura 720 --opaca
python scripts/arte/preparar_camada.py meio.png   src/features/corrida/imagens/<cenario>/meio.webp   --altura 400 --busca 0.06 --emenda 0.05
python scripts/arte/preparar_camada.py perto.png  src/features/corrida/imagens/<cenario>/perto.webp  --altura 640 --busca 0.04 --emenda 0.04
python scripts/arte/preparar_camada.py frente.png src/features/corrida/imagens/<cenario>/frente.webp --altura 380 --busca 0.1 --emenda 0.04
python scripts/arte/preparar_camada.py chao.png   src/features/corrida/imagens/<cenario>/chao.webp   --altura 380 --emenda 0.05
# o chão do parque veio opaco, com fundo branco: antes, python scripts/arte/tirar_fundo.py
# obstáculos: um arquivo por objeto, com o nome do `visual` do motor
python scripts/arte/recortar_grade.py objetos.png src/features/corrida/imagens/objetos --folga 10 nome:altura ...
python scripts/arte/recortar_grade.py buracos.png src/features/corrida/imagens/objetos buraco-pequeno:360 buraco-medio:360 buraco-grande:360
```

Camada regerada = medir de novo a linha onde o piso fica cheio (`tufos` em
`src/features/corrida/imagens/index.ts`). Obstáculo regerado = conferir a proporção contra a medida
do molde em `src/engine/cenarios.ts`, porque o sprite é esticado na caixa de colisão.
