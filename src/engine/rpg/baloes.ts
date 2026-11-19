import { entre, inteiroEntre } from '../rng.ts'
import { CENAS } from './cenas.ts'
import { bloqueios, livre, moverCaixa } from './colisao.ts'
import {
  ALTURA_EMPURRAO,
  ALTURA_SOLTURA_MAX,
  ALTURA_SOLTURA_MIN,
  ATRITO_AR_BALAO,
  ATRITO_CHAO_BALAO,
  BALOES_POR_FESTA,
  ESPALHAR_BALOES,
  FATOR_DIAGONAL,
  GRAVIDADE_BALAO,
  IMPULSO_BALAO,
  MAX_BALOES,
  QUEDA_MAX_BALAO,
  RAIO_BALAO,
  RAIO_JOGADOR,
  TENTATIVAS_LUGAR,
  VEL_EMPURRAO_BALAO,
  VEL_MIN_BALAO,
} from './constantes.ts'
import type { Balao, EstadoMundo, IdCena, Retangulo } from './tipos.ts'

// Balões de festa: caem ao fechar um quadro de entregas, ficam no chão da cena e voam quando o
// jogador anda contra eles. Moram no motor (e não só no desenho) porque dependem da posição do
// jogador a cada tick e precisam repetir igual com a mesma semente e as mesmas entradas, como o
// resto do mundo. Só aritmética básica; o sorteio de onde caem e da cor é do `estado.rng`.

// Quantas cores o desenho tem para sortear (paleta `COR_BALOES`).
export const CORES_BALAO = 6

const OBSTACULOS = new Map<IdCena, Retangulo[]>()
function obstaculosDe(cena: IdCena): Retangulo[] {
  let r = OBSTACULOS.get(cena)
  if (!r) {
    r = bloqueios(CENAS[cena])
    OBSTACULOS.set(cena, r)
  }
  return r
}

/** Solta BALOES_POR_FESTA balões acima do jogador, em lugares livres do chão. */
export function soltarBaloes(estado: EstadoMundo): void {
  const cena = CENAS[estado.cena]
  const obstaculos = obstaculosDe(cena.id)
  const { x: jx, z: jz } = estado.jogador
  for (let i = 0; i < BALOES_POR_FESTA; i++) {
    for (let tentativa = 0; tentativa < TENTATIVAS_LUGAR; tentativa++) {
      const x = jx + entre(estado.rng, -ESPALHAR_BALOES, ESPALHAR_BALOES)
      const z = jz + entre(estado.rng, -ESPALHAR_BALOES, ESPALHAR_BALOES)
      const dentro = x >= RAIO_BALAO && x <= cena.largura - RAIO_BALAO && z >= RAIO_BALAO && z <= cena.profundidade - RAIO_BALAO
      if (!dentro || !livre(x, z, RAIO_BALAO, obstaculos)) continue
      estado.baloes.push({
        id: estado.proximoBalao,
        cena: cena.id,
        cor: inteiroEntre(estado.rng, 0, CORES_BALAO - 1),
        x,
        z,
        y: entre(estado.rng, ALTURA_SOLTURA_MIN, ALTURA_SOLTURA_MAX),
        vx: 0,
        vz: 0,
        vy: 0,
      })
      estado.proximoBalao += 1
      break
    }
  }
  if (estado.baloes.length > MAX_BALOES) estado.baloes.splice(0, estado.baloes.length - MAX_BALOES)
}

function frear(v: number, atrito: number): number {
  const novo = v * atrito
  return novo < VEL_MIN_BALAO && novo > -VEL_MIN_BALAO ? 0 : novo
}

// O jogador andando que encosta (quadrado contra quadrado, como o atropelamento) num balão baixo
// o manda na direção do passo e para cima. Parado, derrubado ou com o balão no alto, nada.
function empurrar(estado: EstadoMundo, b: Balao) {
  const j = estado.jogador
  if (!j.andando || j.tombo > 0 || b.y > ALTURA_EMPURRAO) return
  const alcance = RAIO_JOGADOR + RAIO_BALAO
  const dx = b.x - j.x
  const dz = b.z - j.z
  if (dx >= alcance || -dx >= alcance || dz >= alcance || -dz >= alcance) return
  const fator = j.dirX !== 0 && j.dirZ !== 0 ? FATOR_DIAGONAL : 1
  b.vx = j.dirX * fator * VEL_EMPURRAO_BALAO
  b.vz = j.dirZ * fator * VEL_EMPURRAO_BALAO
  if (b.vy < IMPULSO_BALAO) b.vy = IMPULSO_BALAO
}

/** Um tick dos balões. Só os da cena atual são empurrados; parado no chão não gasta nada. */
export function passoBaloes(estado: EstadoMundo): void {
  for (const b of estado.baloes) {
    if (b.cena === estado.cena) empurrar(estado, b)
    if (b.y === 0 && b.vx === 0 && b.vz === 0 && b.vy === 0) continue
    // Sobe com o impulso, a gravidade freia e ele desce devagar até o chão.
    b.vy -= GRAVIDADE_BALAO
    if (b.vy < -QUEDA_MAX_BALAO) b.vy = -QUEDA_MAX_BALAO
    b.y += b.vy
    if (b.y <= 0) {
      b.y = 0
      b.vy = 0
    }
    if (b.vx !== 0 || b.vz !== 0) {
      const novo = moverCaixa(CENAS[b.cena], obstaculosDe(b.cena), RAIO_BALAO, b.x, b.z, b.vx, b.vz)
      // Bateu numa parede ou móvel: perde a velocidade daquele eixo.
      if (novo.x !== b.x + b.vx) b.vx = 0
      if (novo.z !== b.z + b.vz) b.vz = 0
      b.x = novo.x
      b.z = novo.z
    }
    const atrito = b.y === 0 ? ATRITO_CHAO_BALAO : ATRITO_AR_BALAO
    b.vx = frear(b.vx, atrito)
    b.vz = frear(b.vz, atrito)
  }
}
