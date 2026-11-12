import {
  desenharQuadroDaFolha,
  type Folha,
  SPRITE_TUTOR_CORRENDO as CORRIDA,
  SPRITE_TUTOR_PULANDO as PULO,
  SPRITE_TUTOR_SLIDE as SLIDE,
  type Arte,
} from '../imagens/index.ts'

// Tutor da arte: folhas da corrida, do pulo com pouso desajeitado e do slide. (x, base) em pixels CSS:
// o ponto dos pés. É só desenho: o tutor não tem caixa de colisão.

// Altura do quadro inteiro no mundo, em metros.
// 3,51 = 1,95 × 1,8: ajustado a olho para casar com o cenário de cidade.
const ALTURA_CORRIDA_M = 3.51
// Mesma escala da corrida: 3,51 m × 88/94, porque a cabeça mede 88 px na folha da corrida e 94 px
// na do pulo. Medir pela cabeça evita o salto de tamanho na troca de folha.
const ALTURA_PULO_M = 3.29
// Mesma conta para o slide: a cabeça mede 97 px nesta folha.
const ALTURA_SLIDE_M = 3.18
// As pernas esticadas deixam o tronco atrás do centro do quadro. Este avanço põe o tronco do slide
// onde estava o da corrida (medido nas folhas); sem ele, o corpo recua ao abaixar.
const AVANCO_SLIDE_M = 0.21

// Sem a folha do pulo (ainda carregando): o quadro da corrida com os dois pés fora do chão.
const QUADRO_NO_AR_CORRIDA = 3

// Quadros da folha do pulo, um salto de quem vem correndo e não tem jeito para a coisa:
// 0 último passo, empurrando o chão; 1 subindo com o joelho alto; 2 no alto, pernas abertas;
// 3 descendo; 4 chegando ao chão, com o pé na frente; 5 e 6 a mão apoiada no chão;
// 7 a mão saindo, tronco deitado; 8 tropeçando; 9 quase de volta à corrida.
const QUADRO_IMPULSO = 0
const QUADRO_SUBINDO = 1
const QUADRO_ALTO = 2
const QUADRO_DESCENDO = 3
const QUADRO_CHEGANDO = 4
// Velocidades verticais (m/s) que separam os quadros do ar. VEL_PULO é 13: o pulo vai de +13 a -13.
const VY_PERTO_DO_ALTO = 5
const VY_CHEGANDO = -9
// Quantos metros antes do ponto do pulo ele dá o último passo. Curto de propósito: quem pula
// correndo não para para agachar.
export const ANTECIPACAO_PULO_M = 0.7
// Queda mais rápida que isto (m/s) acaba com a mão no chão: ~0,6 m de queda. Descer do capô de um
// carro ou sair de uma rampa baixa não pode virar tombo.
const VY_POUSO_DESAJEITADO = -7
// Pouso: [quadro, segundos]. A mão fica mais tempo no chão, que é a graça do movimento.
const POUSO: readonly (readonly [number, number])[] = [
  [QUADRO_CHEGANDO, 0.05],
  [5, 0.09],
  [6, 0.09],
  [7, 0.07],
  [8, 0.07],
  [9, 0.06],
]

// Slide: os 2 primeiros quadros descem para o chão pelo relógio e voltam ao contrário no fim, para
// a troca com a corrida não ser um salto de altura. Os demais deslizam em loop, no ritmo da distância.
const QUADROS_DESCIDA = 2
const SEGUNDOS_POR_QUADRO_DESCIDA = 0.06
const QUADROS_LOOP_SLIDE = SLIDE.quadros - QUADROS_DESCIDA

export interface OpcoesTutorSprite {
  // Um ciclo (2π) percorre os 10 quadros: duas passadas, uma de cada perna.
  fase: number
  noAr: boolean
  abaixado: boolean
  vy: number
  // Metros até o ponto da pista em que ele sai do chão, se estiver logo à frente.
  metrosAtePulo: number | null
}

// O pouso dura pelo relógio real, não pela distância: o tombo não deve encurtar com a velocidade.
let estavaNoAr = false
let vyNoAr = 0
let instantePouso: number | null = null
let estavaAbaixado = false
let instanteAbaixou = 0
let instanteLevantou: number | null = null

function indiceDoCiclo(fase: number, quadros: number) {
  const ciclo = fase / (Math.PI * 2)
  return ((Math.floor(ciclo * quadros) % quadros) + quadros) % quadros
}

function quadroDoSlide(o: OpcoesTutorSprite, agora: number): number | null {
  if (o.abaixado) {
    // No ar o abaixar vira mergulho: fica no quadro de quase tocar o chão.
    if (o.noAr) return QUADROS_DESCIDA - 1
    const i = Math.floor((agora - instanteAbaixou) / SEGUNDOS_POR_QUADRO_DESCIDA)
    return i < QUADROS_DESCIDA ? i : QUADROS_DESCIDA + indiceDoCiclo(o.fase, QUADROS_LOOP_SLIDE)
  }
  if (instanteLevantou === null) return null
  const i = Math.floor((agora - instanteLevantou) / SEGUNDOS_POR_QUADRO_DESCIDA)
  // Um pulo logo depois do slide tem a vez: ele já precisa dos quadros de impulso.
  if (i >= QUADROS_DESCIDA || o.noAr || o.metrosAtePulo !== null) {
    instanteLevantou = null
    return null
  }
  return QUADROS_DESCIDA - 1 - i
}

function quadroDoPouso(decorrido: number): number | null {
  let fim = 0
  for (const [quadro, segundos] of POUSO) {
    fim += segundos
    if (decorrido < fim) return quadro
  }
  return null
}

function quadroDoPulo(o: OpcoesTutorSprite, agora: number): number | null {
  if (o.noAr) {
    if (o.vy > VY_PERTO_DO_ALTO) return QUADRO_SUBINDO
    if (o.vy > -VY_PERTO_DO_ALTO) return QUADRO_ALTO
    return o.vy > VY_CHEGANDO ? QUADRO_DESCENDO : QUADRO_CHEGANDO
  }
  if (o.metrosAtePulo !== null) return QUADRO_IMPULSO
  if (instantePouso !== null) {
    const quadro = quadroDoPouso(agora - instantePouso)
    if (quadro !== null) return quadro
    instantePouso = null
  }
  return null
}

export function desenharTutorSprite(
  ctx: CanvasRenderingContext2D,
  corrida: Arte,
  pulo: Arte | null,
  slide: Arte | null,
  x: number,
  base: number,
  ppm: number,
  o: OpcoesTutorSprite,
) {
  const agora = performance.now() / 1000
  if (estavaNoAr && !o.noAr && vyNoAr < VY_POUSO_DESAJEITADO) instantePouso = agora
  estavaNoAr = o.noAr
  if (o.noAr) vyNoAr = o.vy
  if (o.abaixado && !estavaAbaixado) {
    instanteAbaixou = agora
    instanteLevantou = null
  }
  if (!o.abaixado && estavaAbaixado) instanteLevantou = agora
  estavaAbaixado = o.abaixado

  const quadroSlide = slide ? quadroDoSlide(o, agora) : null
  // Abaixado sem a folha do slide (ainda carregando), o quadro da corrida achata mais abaixo.
  const quadroPulo = pulo && quadroSlide === null && !o.abaixado ? quadroDoPulo(o, agora) : null
  let sprite = corrida
  let folha: Folha & { pes: number } = CORRIDA
  let alturaM = ALTURA_CORRIDA_M
  let avancoM = 0
  let indice: number
  if (slide && quadroSlide !== null) {
    sprite = slide
    folha = SLIDE
    alturaM = ALTURA_SLIDE_M
    avancoM = AVANCO_SLIDE_M
    indice = quadroSlide
  } else if (pulo && quadroPulo !== null) {
    sprite = pulo
    folha = PULO
    alturaM = ALTURA_PULO_M
    indice = quadroPulo
  } else if (o.noAr) {
    indice = QUADRO_NO_AR_CORRIDA
  } else {
    indice = indiceDoCiclo(o.fase, CORRIDA.quadros)
  }

  const escala = (alturaM * ppm) / folha.altura
  const l = folha.largura * escala
  const a = folha.altura * escala

  ctx.save()
  ctx.translate(x + avancoM * ppm, base + folha.pes * escala)
  // Folha do slide ainda carregando: achata, como o tutor vetorial.
  if (o.abaixado && quadroSlide === null) ctx.scale(1.15, 0.5)
  desenharQuadroDaFolha(ctx, sprite, folha, indice, -l / 2, -a, l, a)
  ctx.restore()
}
