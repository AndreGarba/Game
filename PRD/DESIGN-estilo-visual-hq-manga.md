# DESIGN — Estilo visual: HQ com pegada de mangá

**Projeto:** Hora do Banho
**Status:** direção de arte inicial; ainda sem peças finais nem design system
**Definições:** André · **Redação:** Claude
**Data:** 02/11/2026
**Depende de:** [PRD-conceito-e-regras-do-jogo.md](PRD-conceito-e-regras-do-jogo.md),
[PRD-tela-de-corrida.md](PRD-tela-de-corrida.md)

> **Aviso (05/11/2026):** na corrida, o cachorro segue o asset pintado
> [referencias/cachorro-andando.webp](referencias/cachorro-andando.webp) (shih tzu creme, pelo
> comprido, peitoral preto e vermelho). A animação usa a folha de galope
> [referencias/cachorro-correndo.png](referencias/cachorro-correndo.png), gerada no ChatGPT com o
> prompt de [referencias/prompt-cachorro-correndo.md](referencias/prompt-cachorro-correndo.md) e
> recortada por `scripts/sprites/recortar-corrida.py`. Decisão do André: fidelidade ao asset vale
> mais que os itens "realismo" e "gradiente suave" da seção 8 para o personagem. Abaixar ainda não
> tem quadros próprios.

---

## 1. O jogo em uma frase

Corrida infinita 2D para todas as idades: o cachorro foge do tutor, que vem com a esponja na mão
para dar banho, pulando e se abaixando por cidade, parque, rio e centro, cada vez mais rápido. Lama
deixa o cachorro mais lento e o tutor chega mais perto; lenços limpam; ossinhos e ossinhos de ouro
valem pontos. O tom é de comédia doméstica.

## 2. Direção

A interface parece uma página de quadrinho cômico. A energia e a expressão vêm do mangá; a cor
chapada e o contorno grosso vêm da HQ ocidental. O efeito é uma perseguição de desenho animado:
exagerada, rápida e engraçada, nunca assustadora.

Este documento vale para **elementos de imagem da interface** (telas de início, pausa e fim,
placar, botões, ícones, ilustrações). O desenho do canvas da corrida segue a mesma direção quando
for refeito; hoje ele é vetor simples (ver PRD da tela de corrida, seção 5).

## 3. Traço

- Contorno preto grosso com variação de peso: mais grosso na borda externa, fino nos detalhes.
- Pouco detalhe interno. A forma precisa ler bem num ícone de 48 px.

## 4. Cor e sombra

- Cores chapadas e saturadas, com no máximo uma sombra dura por elemento.
- Retícula de pontos (halftone) para sombras, fundos de painel e brilhos, como no mangá impresso.
- A paleta de cada cenário vem do jogo (cidade, parque, rio, centro). Hoje as cores estão em
  `desenho/paleta.ts` (canvas) e `src/estilos/tokens.css` (interface, provisório).

## 5. Movimento e impacto

- Linhas de velocidade e de foco atrás de títulos e telas de destaque.
- Onomatopeias desenhadas como letreiro (TCHIBUM!, SPLASH!, BOING!), com letra torta, contorno e
  sombra deslocada. São copy: moram em `src/locales/`, uma por idioma, e não são gravadas na imagem.
- Explosão em estrela ou nuvem de impacto para "Novo recorde!" e para o fim de partida.

## 6. Personagens

- Expressões exageradas de mangá: olhos enormes, gota de suor, veia de raiva, olhar em pânico com
  espiral.
- **Cachorro:** travesso e esperto, nunca sofrendo de verdade.
- **Tutor:** determinado e cômico, nunca ameaçador.

## 7. Elementos de interface

| Elemento | Forma |
| --- | --- |
| Placar, pausa, tela de fim | Painel de quadrinho com borda grossa e cantos levemente inclinados |
| Dicas ("Lama te deixa lento!") | Balão de fala |
| Avisos | Balão de grito, com borda serrilhada |
| Botões | Recorte de HQ: contorno, sombra dura deslocada; afunda ao toque |
| Ícones (osso, osso de ouro, lenço, lama) | Mesmo traço dos personagens |

## 8. O que evitar

- Gradiente suave, realismo, 3D renderizado ou visual de anime sério.
- Sangue, violência e lágrimas de tristeza.
- Copiar personagens ou o traço reconhecível de obras existentes.
- Texto dentro da imagem: quebra a tradução (pt/en/es).

## 9. Prompt base para gerar imagens

> Ilustração estilo HQ cômica com influência de mangá, contorno preto grosso com variação de peso,
> cores chapadas saturadas, sombras em retícula halftone, linhas de velocidade, expressão
> exagerada, fundo transparente, leitura clara em tamanho pequeno, para todas as idades, sem texto.
> [elemento: ...]

## 10. Pendências

1. Paleta final e tokens no design system (substitui os tokens provisórios).
2. Fonte de letreiro para onomatopeias e títulos, com acentos do pt e es.
3. Folha de modelo do cachorro e do tutor (frente, perfil, expressões).
