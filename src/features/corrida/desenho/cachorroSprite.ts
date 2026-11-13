import { ABAIXAR_TICKS } from '../../../engine/index.ts'
import {
  desenharQuadroDaFolha,
  SPRITE_CACHORRO_CORRENDO as CORRIDA,
  SPRITE_CACHORRO_PULO as PULO,
  SPRITE_CACHORRO_SLIDE as SLIDE,
  type Arte,
} from '../imagens/index.ts'

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
// 1,32 = 1,2 × 1,1: ajustado a olho para casar com o cenário de cidade. A folha 3D tem mais folga
// em cima e embaixo (o corpo balança no galope), e o cachorro ocupa ~10% menos do quadro: 1,45 o
// deixa do mesmo tamanho na tela (medido no comprimento do corpo, no quadro do voo).
const ALTURA_QUADRO_M = 1.45
// A folha do slide foi montada com os mesmos pixels por metro da do galope.
const ALTURA_SLIDE_M = ALTURA_QUADRO_M
// A folha do pulo tem os mesmos pixels por metro; é só um pouco mais alta.
const ALTURA_PULO_M = (ALTURA_QUADRO_M * PULO.altura) / CORRIDA.altura
// Quanto o desenho fica à frente do centro da caixa: a cabeça é a parte que bate.
const AVANCO_M = 0.05
// O recorte da folha do pulo fica 4,6 cm atrás do do galope (medido nos renders): sem isto, o
// cachorro dá um passinho para a frente ao sair do chão.
const AVANCO_PULO_M = -0.046

// Pulo: o cachorro sai do chão no mesmo tick do comando, então o impulso é o começo da subida.
// Os quadros do ar saem da velocidade vertical (VEL_PULO é 13: vai de +13 a -13); o pulo duplo
// volta a +13 e mostra o impulso de novo.
const QUADRO_IMPULSO = 0
const QUADRO_SUBINDO = 1
const QUADRO_ALTO = 2
const QUADRO_DESCENDO = 3
const QUADRO_CHEGANDO = 4
const VY_IMPULSO = 10
const VY_PERTO_DO_ALTO = 4
const VY_CHEGANDO = -9
// Queda mais lenta que isto (m/s) não amortece: descer de uma caixa baixa não pede o pouso inteiro.
const VY_POUSO = -6
// Pouso: [quadro, segundos], pelo relógio real (não encurta com a velocidade).
const POUSO: readonly (readonly [number, number])[] = [
  [5, 0.06],
  [6, 0.08],
  [7, 0.06],
]
let estavaNoAr = false
let vyNoAr = 0
let instantePouso: number | null = null
// Um ciclo de passos (2π de fase) percorre os quadros da folha uma vez.
// No ar: o quadro do voo esticado, com as quatro patas fora do chão.
const QUADRO_NO_AR = 8
// Slide: os 2 primeiros quadros descem para o chão, um a cada TICKS_DESCIDA ticks do abaixar; depois
// os quadros 2 a 5 deslizam em loop, no ritmo da distância corrida.
const QUADROS_DESCIDA = 2
const TICKS_DESCIDA = 5
// No slide o desenho escorrega um pouco para a frente e, ao voltar a correr, volta ao lugar. Só
// desenho: a caixa de colisão do motor não anda. Suavizado pelo relógio real, para ir e voltar
// sem salto.
const AVANCO_SLIDE_M = 0.45
const RAPIDEZ_AVANCO = 9
let avancoSlide = 0
let ultimoInstante: number | null = null

export interface OpcoesSprite {
  fase: number
  noAr: boolean
  abaixado: boolean
  // Ticks que faltam do abaixar (abaixadoTicks do motor): dizem há quanto tempo ele começou.
  ticksAbaixado: number
  vy: number
}

function indiceDoCiclo(fase: number, quadros: number) {
  const ciclo = fase / (Math.PI * 2)
  return ((Math.floor(ciclo * quadros) % quadros) + quadros) % quadros
}

function quadroDoPulo(o: OpcoesSprite, agora: number): number | null {
  if (o.noAr) {
    if (o.vy > VY_IMPULSO) return QUADRO_IMPULSO
    if (o.vy > VY_PERTO_DO_ALTO) return QUADRO_SUBINDO
    if (o.vy > -VY_PERTO_DO_ALTO) return QUADRO_ALTO
    return o.vy > VY_CHEGANDO ? QUADRO_DESCENDO : QUADRO_CHEGANDO
  }
  if (instantePouso === null) return null
  let fim = 0
  for (const [quadro, segundos] of POUSO) {
    fim += segundos
    if (agora - instantePouso < fim) return quadro
  }
  instantePouso = null
  return null
}

export function desenharCachorroSprite(
  ctx: CanvasRenderingContext2D,
  corrida: Arte,
  slide: Arte | null,
  pulo: Arte | null,
  cx: number,
  base: number,
  ppm: number,
  o: OpcoesSprite,
) {
  const agora = performance.now() / 1000
  if (estavaNoAr && !o.noAr && vyNoAr < VY_POUSO) instantePouso = agora
  estavaNoAr = o.noAr
  if (o.noAr) vyNoAr = o.vy

  const deslizando = o.abaixado && slide !== null
  // Abaixar (no chão ou mergulhando no ar) tem a vez sobre o pulo e corta o pouso.
  if (o.abaixado) instantePouso = null
  const quadroPulo = pulo && !o.abaixado ? quadroDoPulo(o, agora) : null
  let sprite = corrida
  let folha: Folha = CORRIDA
  let alturaM = ALTURA_QUADRO_M
  let avancoM = AVANCO_M
  let indice: number
  if (pulo && quadroPulo !== null) {
    sprite = pulo
    folha = PULO
    alturaM = ALTURA_PULO_M
    avancoM = AVANCO_M + AVANCO_PULO_M
    indice = quadroPulo
  } else if (deslizando) {
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
  const escala = (alturaM * ppm) / folha.altura
  const l = folha.largura * escala
  const a = folha.altura * escala

  const dt = ultimoInstante === null ? 0 : Math.min(0.1, agora - ultimoInstante)
  ultimoInstante = agora
  const alvo = deslizando ? AVANCO_SLIDE_M : 0
  avancoSlide += (alvo - avancoSlide) * (1 - Math.exp(-RAPIDEZ_AVANCO * dt))

  ctx.save()
  ctx.translate(cx + (avancoM + avancoSlide) * ppm, base + folha.pes * escala)
  // Folha do pulo ainda carregando: o quadro do voo inclina no ar (o mergulho já usa o slide).
  if (o.noAr && !deslizando && quadroPulo === null) ctx.rotate(Math.max(-0.25, Math.min(0.25, -o.vy * 0.02)))
  // Sem a folha do slide (ainda carregando), o abaixar achata o galope como antes.
  if (o.abaixado && !deslizando) ctx.scale(1.12, 0.55)
  desenharQuadroDaFolha(ctx, sprite, folha, indice, -l / 2, -a, l, a)
  ctx.restore()
}
