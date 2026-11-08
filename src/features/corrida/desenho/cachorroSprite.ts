import { ABAIXAR_TICKS, SUJEIRA_MAX } from '../../../engine/index.ts'
import { SPRITE_CACHORRO_CORRENDO as CORRIDA, SPRITE_CACHORRO_SLIDE as SLIDE } from '../imagens/index.ts'

// Cachorro da arte: folha de 10 quadros de galope e folha de 6 quadros de slide (abaixado).
// Coordenadas em pixels CSS da tela; (cx, base) é o ponto dos pés no centro da caixa de colisão.

interface Folha {
  quadros: number
  largura: number
  altura: number
  pes: number
}

// Altura do quadro inteiro no mundo, em metros. O quadro tem folga para o quique do galope, então
// o cachorro em si fica um pouco menor que isto.
// 1,32 = 1,2 × 1,1: ajustado a olho para casar com o cenário de cidade.
const ALTURA_QUADRO_M = 1.32
// A folha do slide veio com o cachorro ~1,5× maior que a do galope (medido no comprimento do
// corpo, no quadro 1, que ainda é pose de corrida). Esta altura põe os dois na mesma escala.
const ALTURA_SLIDE_M = 1.13
// Quanto o desenho fica à frente do centro da caixa: a cabeça é a parte que bate.
const AVANCO_M = 0.05
// Um ciclo de passos (2π de fase) percorre os quadros da folha uma vez.
// No ar: o quadro do voo esticado, com as quatro patas fora do chão.
const QUADRO_NO_AR = 8
// Slide: os 2 primeiros quadros descem para o chão, um a cada TICKS_DESCIDA ticks do abaixar; depois
// os quadros 2 a 5 deslizam em loop, no ritmo da distância corrida.
const QUADROS_DESCIDA = 2
const TICKS_DESCIDA = 5

export interface OpcoesSprite {
  fase: number
  noAr: boolean
  abaixado: boolean
  // Ticks que faltam do abaixar (abaixadoTicks do motor): dizem há quanto tempo ele começou.
  ticksAbaixado: number
  vy: number
  sujeira: number
}

// Lama numa camada à parte: 'source-atop' só pinta onde há cachorro, sem sujar o cenário.
let camada: HTMLCanvasElement | null = null

const MANCHAS: readonly (readonly [number, number, number])[] = [
  // [x, y, raio] em fração do quadro (0..1, y para baixo)
  [0.38, 0.6, 0.06],
  [0.55, 0.5, 0.05],
  [0.25, 0.68, 0.05],
  [0.6, 0.72, 0.045],
  [0.75, 0.32, 0.045],
]

function quadroComLama(sprite: HTMLImageElement, folha: Folha, indice: number, sujeira: number): CanvasImageSource {
  if (sujeira <= 0) return sprite
  camada ??= document.createElement('canvas')
  camada.width = folha.largura
  camada.height = folha.altura
  const c = camada.getContext('2d')
  if (!c) return sprite
  c.clearRect(0, 0, folha.largura, folha.altura)
  c.drawImage(sprite, indice * folha.largura, 0, folha.largura, folha.altura, 0, 0, folha.largura, folha.altura)
  c.globalCompositeOperation = 'source-atop'
  c.fillStyle = 'rgba(110, 72, 40, 0.85)'
  for (const [mx, my, r] of MANCHAS.slice(0, Math.min(SUJEIRA_MAX, sujeira))) {
    c.beginPath()
    c.ellipse(mx * folha.largura, my * folha.altura, r * folha.altura * 1.6, r * folha.altura * 1.2, 0.3, 0, Math.PI * 2)
    c.fill()
  }
  // Pelo inteiro um pouco mais marrom conforme suja.
  c.fillStyle = `rgba(120, 85, 50, ${(sujeira / SUJEIRA_MAX) * 0.3})`
  c.fillRect(0, 0, folha.largura, folha.altura)
  c.globalCompositeOperation = 'source-over'
  return camada
}

function indiceDoCiclo(fase: number, quadros: number) {
  const ciclo = fase / (Math.PI * 2)
  return ((Math.floor(ciclo * quadros) % quadros) + quadros) % quadros
}

export function desenharCachorroSprite(
  ctx: CanvasRenderingContext2D,
  corrida: HTMLImageElement,
  slide: HTMLImageElement | null,
  cx: number,
  base: number,
  ppm: number,
  o: OpcoesSprite,
) {
  const deslizando = o.abaixado && slide !== null
  let sprite = corrida
  let folha: Folha = CORRIDA
  let alturaM = ALTURA_QUADRO_M
  let indice: number
  if (deslizando) {
    sprite = slide
    folha = SLIDE
    alturaM = ALTURA_SLIDE_M
    const decorrido = ABAIXAR_TICKS - o.ticksAbaixado
    // No ar o abaixar vira mergulho e não conta os ticks: fica no quadro de quase tocar o chão.
    if (o.noAr) indice = QUADROS_DESCIDA - 1
    else if (decorrido < QUADROS_DESCIDA * TICKS_DESCIDA) indice = Math.floor(decorrido / TICKS_DESCIDA)
    else indice = QUADROS_DESCIDA + indiceDoCiclo(o.fase, SLIDE.quadros - QUADROS_DESCIDA)
  } else {
    indice = o.noAr ? QUADRO_NO_AR : indiceDoCiclo(o.fase, CORRIDA.quadros)
  }
  const fonte = quadroComLama(sprite, folha, indice, o.sujeira)
  const recorteX = fonte === sprite ? indice * folha.largura : 0

  const escala = (alturaM * ppm) / folha.altura
  const l = folha.largura * escala
  const a = folha.altura * escala

  ctx.save()
  ctx.translate(cx + AVANCO_M * ppm, base + folha.pes * escala)
  // Pulo ainda sem quadros próprios: inclina no ar (o mergulho abaixado já usa o slide).
  if (o.noAr && !deslizando) ctx.rotate(Math.max(-0.25, Math.min(0.25, -o.vy * 0.02)))
  // Sem a folha do slide (ainda carregando), o abaixar achata o galope como antes.
  if (o.abaixado && !deslizando) ctx.scale(1.12, 0.55)
  ctx.drawImage(fonte, recorteX, 0, folha.largura, folha.altura, -l / 2, -a, l, a)
  ctx.restore()
}
