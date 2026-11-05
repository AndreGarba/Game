import { SPRITE_TUTOR_CORRENDO as FOLHA } from '../imagens/index.ts'

// Tutor da arte (folha de 10 quadros correndo). (x, base) em pixels CSS: o ponto dos pés.

// Altura do quadro inteiro no mundo, em metros. É só desenho: o tutor não tem caixa de colisão.
// 3,51 = 1,95 × 1,8: ajustado a olho para casar com o cenário de cidade.
const ALTURA_QUADRO_M = 3.51
// No ar: o quadro com os dois pés fora do chão.
const QUADRO_NO_AR = 3

export interface OpcoesTutorSprite {
  // Um ciclo (2π) percorre os 10 quadros: duas passadas, uma de cada perna.
  fase: number
  noAr: boolean
  abaixado: boolean
}

export function desenharTutorSprite(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLImageElement,
  x: number,
  base: number,
  ppm: number,
  o: OpcoesTutorSprite,
) {
  const ciclo = o.fase / (Math.PI * 2)
  const indice = o.noAr ? QUADRO_NO_AR : ((Math.floor(ciclo * FOLHA.quadros) % FOLHA.quadros) + FOLHA.quadros) % FOLHA.quadros
  const escala = (ALTURA_QUADRO_M * ppm) / FOLHA.altura
  const l = FOLHA.largura * escala
  const a = FOLHA.altura * escala

  ctx.save()
  ctx.translate(x, base + FOLHA.pes * escala)
  // Abaixar ainda sem quadro próprio na arte: achata, como o tutor vetorial.
  if (o.abaixado) ctx.scale(1.15, 0.5)
  ctx.drawImage(sprite, indice * FOLHA.largura, 0, FOLHA.largura, FOLHA.altura, -l / 2, -a, l, a)
  ctx.restore()
}
