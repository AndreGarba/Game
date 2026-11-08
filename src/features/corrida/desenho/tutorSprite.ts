import { SPRITE_TUTOR_CORRENDO as CORRIDA, SPRITE_TUTOR_PULANDO as PULO } from '../imagens/index.ts'

// Tutor da arte: folha de 10 quadros correndo e folha de 10 quadros do pulo. (x, base) em pixels
// CSS: o ponto dos pés. É só desenho: o tutor não tem caixa de colisão.

// Altura do quadro inteiro no mundo, em metros.
// 3,51 = 1,95 × 1,8: ajustado a olho para casar com o cenário de cidade.
const ALTURA_CORRIDA_M = 3.51
// Mesma escala da corrida: 3,51 m / 428 px da folha × 458 px deste quadro × 93/87, porque a cabeça
// mede 93 px na folha da corrida e 87 px na do pulo.
const ALTURA_PULO_M = 4.02

// Sem a folha do pulo (ainda carregando): o quadro da corrida com os dois pés fora do chão.
const QUADRO_NO_AR_CORRIDA = 3

// Quadros da folha do pulo, que na arte vai do ar até ficar em pé:
// 0 no alto, 1 descendo, 2 a 4 aterrissando até o agachamento, 5 a 9 levantando.
const QUADRO_ALTO = 0
const QUADRO_SUBINDO_DESCENDO = 1
// Velocidade vertical (m/s) acima da qual ele ainda está longe do alto do pulo.
const VY_PERTO_DO_ALTO = 5
// Agacha para pegar impulso: o caminho de levantar, ao contrário. Os quadros 7 a 9 ficam de fora
// porque em pé ele é bem mais alto que correndo, e a troca daria um salto.
const QUADROS_IMPULSO = [6, 5, 4] as const
// Quantos metros antes do ponto do pulo ele começa a agachar.
export const ANTECIPACAO_PULO_M = 1.2
// Aterrissa: flexiona até o agachamento e levanta de volta para a corrida.
const QUADROS_POUSO = [2, 3, 4, 5, 6] as const
const SEGUNDOS_POR_QUADRO_POUSO = 0.045

export interface OpcoesTutorSprite {
  // Um ciclo (2π) percorre os 10 quadros: duas passadas, uma de cada perna.
  fase: number
  noAr: boolean
  abaixado: boolean
  vy: number
  // Metros até o ponto da pista em que ele sai do chão, se estiver logo à frente.
  metrosAtePulo: number | null
}

// O pouso dura pelo relógio real, não pela distância: a flexão não deve encurtar com a velocidade.
let estavaNoAr = false
let instantePouso: number | null = null

function quadroDoPulo(o: OpcoesTutorSprite, agora: number): number | null {
  if (o.noAr) {
    return Math.abs(o.vy) < VY_PERTO_DO_ALTO ? QUADRO_ALTO : QUADRO_SUBINDO_DESCENDO
  }
  if (o.abaixado) return null
  if (o.metrosAtePulo !== null) {
    const progresso = 1 - o.metrosAtePulo / ANTECIPACAO_PULO_M
    const i = Math.floor(progresso * QUADROS_IMPULSO.length)
    return QUADROS_IMPULSO[Math.max(0, Math.min(QUADROS_IMPULSO.length - 1, i))]!
  }
  if (instantePouso !== null) {
    const i = Math.floor((agora - instantePouso) / SEGUNDOS_POR_QUADRO_POUSO)
    if (i < QUADROS_POUSO.length) return QUADROS_POUSO[i]!
    instantePouso = null
  }
  return null
}

export function desenharTutorSprite(
  ctx: CanvasRenderingContext2D,
  corrida: HTMLImageElement,
  pulo: HTMLImageElement | null,
  x: number,
  base: number,
  ppm: number,
  o: OpcoesTutorSprite,
) {
  const agora = performance.now() / 1000
  if (estavaNoAr && !o.noAr) instantePouso = agora
  estavaNoAr = o.noAr

  const quadroPulo = pulo ? quadroDoPulo(o, agora) : null
  let sprite = corrida
  let folha: { largura: number; altura: number; pes: number } = CORRIDA
  let alturaM = ALTURA_CORRIDA_M
  let indice: number
  if (pulo && quadroPulo !== null) {
    sprite = pulo
    folha = PULO
    alturaM = ALTURA_PULO_M
    indice = quadroPulo
  } else if (o.noAr) {
    indice = QUADRO_NO_AR_CORRIDA
  } else {
    const ciclo = o.fase / (Math.PI * 2)
    indice = ((Math.floor(ciclo * CORRIDA.quadros) % CORRIDA.quadros) + CORRIDA.quadros) % CORRIDA.quadros
  }

  const escala = (alturaM * ppm) / folha.altura
  const l = folha.largura * escala
  const a = folha.altura * escala

  ctx.save()
  ctx.translate(x, base + folha.pes * escala)
  // Abaixar ainda sem quadro próprio na arte: achata, como o tutor vetorial.
  if (o.abaixado) ctx.scale(1.15, 0.5)
  ctx.drawImage(sprite, indice * folha.largura, 0, folha.largura, folha.altura, -l / 2, -a, l, a)
  ctx.restore()
}
