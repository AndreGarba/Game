import { SUJEIRA_MAX } from '../../../engine/index.ts'
import { SPRITE_CACHORRO_ANDANDO as FOLHA } from '../imagens/index.ts'

// Cachorro da arte (folha de 5 quadros andando). Coordenadas em pixels CSS da tela; (cx, base) é
// o ponto dos pés no centro da caixa de colisão.

// Altura do quadro no mundo, em metros: patas ao topo do topete.
const ALTURA_M = 1.1
// Quanto o desenho fica à frente do centro da caixa: a cabeça é a parte que bate.
const AVANCO_M = 0.12
// O ciclo de passos (2π de fase) percorre os 5 quadros uma vez.
const QUADRO_NO_AR = 1

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
  [0.35, 0.62, 0.07],
  [0.55, 0.55, 0.06],
  [0.2, 0.7, 0.06],
  [0.62, 0.78, 0.05],
  [0.8, 0.4, 0.05],
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

  const escala = (ALTURA_M * ppm) / (FOLHA.altura - FOLHA.margem)
  const l = FOLHA.largura * escala
  const a = FOLHA.altura * escala
  const margem = FOLHA.margem * escala

  ctx.save()
  ctx.translate(cx + AVANCO_M * ppm, base + margem)
  // Pulo e abaixar ainda sem quadros próprios na arte: inclina no ar e achata no chão.
  if (o.noAr) ctx.rotate(Math.max(-0.3, Math.min(0.3, -o.vy * 0.025)))
  if (o.abaixado) ctx.scale(1.12, 0.55)
  ctx.drawImage(fonte, recorteX, 0, FOLHA.largura, FOLHA.altura, -l / 2, -a, l, a)
  ctx.restore()
}
