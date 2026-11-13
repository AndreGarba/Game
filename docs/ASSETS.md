# Arte do RPG isométrico — o que desenhar no ChatGPT

O protótipo roda sem nenhuma imagem: prédios, chão, placas e HUD saem de cores e desenhos
provisórios feitos em código. Cada imagem desta lista **substitui** um desses provisórios. Não há
código para mudar: basta salvar o arquivo com o nome exato na pasta indicada e rodar o jogo de
novo (`npm run dev` recarrega sozinho; o build de produção pega na próxima publicação).

```
src/features/rpg/arte/
├─ texturas/   chão e paredes (repetem como azulejo)
├─ fachadas/   frente dos prédios da rua
├─ placas/     letreiros em cima das portas
├─ portas/     portas da rua
└─ hud/        botões, direcional, caixa de diálogo
```

Regras que valem para tudo:

- **Formato:** `.webp` (preferido, menor), `.png` ou `.jpg`. Se houver dois com o mesmo nome, vale
  o `.webp`.
- **Nome:** exatamente o da tabela, em minúsculas e com hífen. Nome errado = o jogo ignora em
  silêncio e continua com o provisório.
- **Tamanho máximo:** 4096 px de lado (limite de textura de muito celular Android). Os tamanhos
  sugeridos abaixo já cabem com folga.
- **Proporção importa mais que o tamanho:** a imagem é esticada para a peça. Proporção diferente
  da tabela sai achatada ou espichada.
- **Transparência:** só onde a tabela diz "sim" (PNG ou WebP com alfa). Nas outras, fundo
  opaco.
- **Palavras não são traduzidas dentro de imagem:** tudo que for texto de verdade o jogo escreve
  por cima, em pt/en/es.
- Personagens, carros e móveis são modelos 3D low-poly feitos em código, não imagens. As cores
  deles ficam em `src/features/rpg/visual/paleta.ts` (roupa de cada NPC, cor de cada carro,
  madeira, estofado etc.) e mudam ali.

---

## 1. Fachadas (`fachadas/`)

A frente de cada prédio da rua, de frente, **sem perspectiva** (como uma foto tirada reto de
frente), do chão até o topo da parede. A câmera vê a fachada inclinada; a imagem vai plana. **Não
desenhe a porta nem a placa**: são peças separadas, coladas na frente da fachada, no meio do
térreo. Deixe ali parede lisa ou vitrine.

| Arquivo | Prédio | Proporção (L × A) | Tamanho sugerido | Transparência |
| --- | --- | --- | --- | --- |
| `escritorio` | Escritório (porta azul) | 1 : 1 (10 × 10 m) | 1024 × 1024 | não |
| `concessionaria` | Loja de veículos (vitrine) | 2,15 : 1 (14 × 6,5 m) | 1792 × 832 | não |
| `residencial` | Prédio residencial à esquerda | 0,61 : 1 (5,5 × 9 m) | 704 × 1152 | não |
| `comercial` | Prédio comercial à direita | 0,96 : 1 (11,5 × 12 m) | 1472 × 1536 | não |

As laterais e o telhado continuam com a cor da paleta (`COR_PREDIO` e `COR_TELHADO`).

Prompt de exemplo:
> Fachada frontal de um prédio de escritórios de 3 andares, vista totalmente de frente, sem
> perspectiva e sem céu, estilo cartoon low-poly com cores chapadas, janelas azuis em grade,
> térreo com parede lisa no centro (sem porta e sem letreiro). Imagem quadrada, a parede ocupa a
> imagem inteira.

## 2. Placas (`placas/`)

Letreiro em cima da porta. **O texto da imagem não é traduzido**: placa com palavra aparece igual
em pt, en e es. Para o jogo multilíngue, prefira logotipo/marca (ex.: "Horizonte", um carro
estilizado) a palavras como "ESCRITÓRIO". Sem a imagem, o jogo escreve a palavra traduzida.

| Arquivo | Onde | Proporção | Tamanho sugerido | Transparência |
| --- | --- | --- | --- | --- |
| `escritorio` | Acima da porta do escritório | 4 : 1 (3,6 × 0,9 m) | 1024 × 256 | sim (recorte da placa) |
| `concessionaria` | Acima da porta da loja | 4 : 1 (6,4 × 1,6 m) | 1024 × 256 | sim |

## 3. Portas (`portas/`)

A folha da porta, de frente. O batente colorido em volta já existe no jogo.

| Arquivo | Proporção | Tamanho sugerido | Transparência |
| --- | --- | --- | --- |
| `porta-escritorio` | 0,52 : 1 (1,2 × 2,3 m) | 520 × 1000 | sim, se tiver vidro |
| `porta-concessionaria` | 0,7 : 1 (1,6 × 2,3 m) | 700 × 1000 | sim, se tiver vidro |

## 4. Texturas de chão e parede (`texturas/`)

**Chão:** vista de cima, reto (sem perspectiva), quadrada e **sem emenda** (*seamless*/*tileable*:
a borda direita continua na esquerda, a de cima na de baixo). O jogo repete a imagem como azulejo;
a coluna "cobre" diz quantos metros do chão uma cópia ocupa (o personagem tem 1,8 m), para acertar
a escala do desenho (tamanho do ladrilho, da pedra, das folhas de grama).

| Arquivo | Onde | Cobre | Tamanho sugerido | Transparência |
| --- | --- | --- | --- | --- |
| `grama` | Canteiros e fundo da rua | 4 × 4 m | 512 × 512 | não |
| `calcada` | Calçadas | 2 × 2 m | 512 × 512 | não |
| `asfalto` | Rua (as faixas brancas são desenhadas por cima) | 4 × 4 m | 512 × 512 | não |
| `piso-escritorio` | Chão do escritório | 2 × 2 m | 512 × 512 | não |
| `piso-concessionaria` | Chão da loja | 3 × 3 m | 512 × 512 | não |
| `tapete` | Tapetes dos interiores | 3 × 3 m | 512 × 512 | não |
| `plataforma` | Base dos carros em exposição | 5 × 5 m | 512 × 512 | não |

**Paredes dos interiores:** uma imagem por sala, **esticada** em cada parede (não repete). A parede
do fundo é a mais visível.

| Arquivo | Sala | Proporção | Tamanho sugerido | Transparência |
| --- | --- | --- | --- | --- |
| `parede-escritorio` | Escritório (parede de 12 × 3 m) | 4 : 1 | 2048 × 512 | não |
| `parede-concessionaria` | Loja (parede de 18 × 3 m) | 6 : 1 | 2400 × 400 | não |

Prompt de exemplo:
> Textura seamless (sem emenda) de calçada de pedra portuguesa, vista exatamente de cima, sem
> sombra direcional, cores suaves, estilo cartoon. Quadrada, 512 × 512.

## 5. HUD (`hud/`)

Tudo com **fundo transparente**. Os botões levam o próprio símbolo desenhado ("A", "B", "II"):
com arte, o jogo mostra só a imagem. A caixa de diálogo e o balão vão **sem texto nenhum**: as
falas e os avisos são escritos por cima, traduzidos. Desenhe com margem de ~4% dentro da imagem,
para a sombra não ser cortada.

| Arquivo | O quê | Proporção | Tamanho sugerido | Na tela (quadro 780 × 360) |
| --- | --- | --- | --- | --- |
| `direcional-base` | Base redonda do direcional (sem as setas) | 1 : 1 | 512 × 512 | 120 px |
| `direcional-seta` | **Uma** seta apontando para **cima** (o jogo gira para os outros lados e acende a apertada) | 1 : 1 | 128 × 128 | 34 px |
| `botao-a` | Botão A (interagir), solto | 1 : 1 | 256 × 256 | 58 px |
| `botao-a-apertado` | Botão A apertado (opcional) | 1 : 1 | 256 × 256 | 58 px |
| `botao-b` | Botão B (voltar/menu), solto | 1 : 1 | 256 × 256 | 58 px |
| `botao-b-apertado` | Botão B apertado (opcional) | 1 : 1 | 256 × 256 | 58 px |
| `botao-correr` | Botão de correr (segurar), solto | 1 : 1 | 256 × 256 | 58 px |
| `botao-correr-apertado` | Botão de correr segurado (opcional) | 1 : 1 | 256 × 256 | 58 px |
| `botao-pausa` | Botão de pausa (canto superior direito) | 1 : 1 | 128 × 128 | 40 px |
| `caixa-dialogo` | Moldura da caixa de fala (o texto vai por cima, à esquerda) | ~4,3 : 1 | 1600 × 370 | ~470 × 110 px |
| `balao-acao` | Balão do aviso "A  Entrar: …" (pílula) | ~5 : 1 | 1000 × 200 | ~260 × 44 px |

A caixa de diálogo e o balão são **esticados** para a largura do texto: mantenha o miolo liso e
os enfeites nas bordas, e bordas finas (esticar engrossa borda desigual).

Prompt de exemplo:
> Botão redondo de videogame para celular, verde, com a letra A branca no centro, estilo cartoon
> com contorno escuro e leve brilho em cima, fundo transparente, sem sombra fora do círculo,
> 256 × 256.

---

## O que ainda não é imagem (próximos passos)

- **Personagens, carros e móveis** são modelos de caixas feitos em código
  (`src/features/rpg/cena3d/personagem.ts` e `modelos.ts`). Para trocar por arte, o caminho é um
  modelo 3D (`.glb`) por peça, não imagem 2D: fica para depois do protótipo.
- **Céu, luz e sombra** são cores e intensidades em `paleta.ts` (`COR_CEU`, `LUZ`).
- Ícones do app e da loja: `public/icones/` e `android/app/src/main/res/mipmap-*/` (ver `README.md`).
