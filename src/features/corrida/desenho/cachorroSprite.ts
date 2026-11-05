import { SUJEIRA_MAX } from '../../../engine/index.ts'
import { SPRITE_CACHORRO_CORRENDO as FOLHA } from '../imagens/index.ts'

// Cachorro da arte (folha de 10 quadros de galope). Coordenadas em pixels CSS da tela; (cx, base)
// é o ponto dos pés no centro da caixa de colisão.

// Altura do quadro inteiro no mundo, em metros. O quadro tem folga para o quique do galope, então
// o cachorro em si fica um pouco menor que isto.
// 1,32 = 1,2 × 1,1: ajustado a olho para casar com o cenário de cidade.
const ALTURA_QUADRO_M = 1.32
// Quanto o desenho fica à frente do centro da caixa: a cabeça é a parte que bate.
const AVANCO_M = 0.05
// Um ciclo de passos (2π de fase) percorre os quadros da folha uma vez.
// No ar: o quadro do voo esticado, com as quatro patas fora do chão.
const QUADRO_NO_AR = 8

export interface OpcoesSprite {
  fase: number
  noAr: boolean
  abaixado: boolean
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

function quadroComLama(sprite: HTMLImageElement, indice: number, sujeira: number): CanvasImageSource {
  if (sujeira <= 0) return sprite
  camada ??= document.createElement('canvas')
  camada.width = FOLHA.largura
  camada.height = FOLHA.altura
  const c = camada.getContext('2d')
  if (!c) return sprite
  c.clearRect(0, 0, FOLHA.largura, FOLHA.altura)
  c.drawImage(sprite, indice * FOLHA.largura, 0, FOLHA.largura, FOLHA.altura, 0, 0, FOLHA.largura, FOLHA.altura)
  c.globalCompositeOperation = 'source-atop'
  c.fillStyle = 'rgba(110, 72, 40, 0.85)'
  for (const [mx, my, r] of MANCHAS.slice(0, Math.min(SUJEIRA_MAX, sujeira))) {
    c.beginPath()
    c.ellipse(mx * FOLHA.largura, my * FOLHA.altura, r * FOLHA.largura * 1.3, r * FOLHA.largura, 0.3, 0, Math.PI * 2)
    c.fill()
  }
  // Pelo inteiro um pouco mais marrom conforme suja.
  c.fillStyle = `rgba(120, 85, 50, ${(sujeira / SUJEIRA_MAX) * 0.3})`
  c.fillRect(0, 0, FOLHA.largura, FOLHA.altura)
  c.globalCompositeOperation = 'source-over'
  return camada
}

export function desenharCachorroSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  cx: number,
  base: number,
  ppm: number,
  o: OpcoesSprite,
) {
  const ciclo = o.fase / (Math.PI * 2)
  const indice = o.noAr ? QUADRO_NO_AR : ((Math.floor(ciclo * FOLHA.quadros) % FOLHA.quadros) + FOLHA.quadros) % FOLHA.quadros
  const fonte = quadroComLama(sprite, indice, o.sujeira)
  const recorteX = fonte === sprite ? indice * FOLHA.largura : 0

  const escala = (ALTURA_QUADRO_M * ppm) / FOLHA.altura
  const l = FOLHA.largura * escala
  const a = FOLHA.altura * escala

  ctx.save()
  ctx.translate(cx + AVANCO_M * ppm, base + FOLHA.pes * escala)
  // Pulo e abaixar ainda sem quadros próprios na arte: inclina no ar e achata no chão.
  if (o.noAr) ctx.rotate(Math.max(-0.25, Math.min(0.25, -o.vy * 0.02)))
  if (o.abaixado) ctx.scale(1.12, 0.55)
  ctx.drawImage(fonte, recorteX, 0, FOLHA.largura, FOLHA.altura, -l / 2, -a, l, a)
  ctx.restore()
}
