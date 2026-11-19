import { BOCA_GOL, CAMPO, CENAS, FUNDO_GOL } from './cenas.ts'
import { bloqueios, livre } from './colisao.ts'
import {
  ALCANCE_CHUTE,
  ALCANCE_IMPACTO_CHUTE,
  ATRITO_BOLA,
  FATOR_CONDUCAO,
  FATOR_DIAGONAL,
  FREIO_BOLA,
  QUIQUE_BOLA,
  QUIQUE_REDE,
  RAIO_BOLA,
  RAIO_JOGADOR,
  TICKS_VOLTA_FORA,
  TICKS_VOLTA_GOL,
  VEL_ANDAR,
  VEL_CHUTE,
  VEL_CORRER,
  VEL_MIN_BOLA,
} from './constantes.ts'
import type { Bola, EstadoMundo, LadoDoGol, Retangulo } from './tipos.ts'

// Bola do campo de futebol. Mora no motor, como os balões: o chute e a condução dependem do
// jogador a cada tick, e o gol precisa sair igual com as mesmas entradas. Rola num plano, sem
// altura, com atrito; quica nos sólidos (traves e redes inclusive) e nas bordas do mapa. Não
// sorteia nada, então não gasta o `estado.rng`.

const CENTRO_X = CAMPO.x + CAMPO.largura / 2
const CENTRO_Z = CAMPO.z + CAMPO.profundidade / 2
const BOCA_Z0 = CENTRO_Z - BOCA_GOL / 2
const BOCA_Z1 = CENTRO_Z + BOCA_GOL / 2

let obstaculos: Retangulo[] | null = null
function obstaculosDaRua(): Retangulo[] {
  if (!obstaculos) obstaculos = bloqueios(CENAS.rua)
  return obstaculos
}

export function criarBola(): Bola {
  return { x: CENTRO_X, z: CENTRO_Z, vx: 0, vz: 0, espera: 0, aoAlcance: false, gols: 0, ultimoGol: null }
}

function aoCentro(b: Bola) {
  b.x = CENTRO_X
  b.z = CENTRO_Z
  b.vx = 0
  b.vz = 0
}

// Atrito proporcional mais um freio constante; o freio nunca inverte o sentido.
function frear(v: number): number {
  const novo = v > 0 ? v * ATRITO_BOLA - FREIO_BOLA : v * ATRITO_BOLA + FREIO_BOLA
  if (v > 0 ? novo < VEL_MIN_BOLA : novo > 0 - VEL_MIN_BOLA) return 0
  return novo
}

/** Distância "quadrada" (maior eixo) do centro do jogador ao da bola: barata e sem raiz. */
function distanciaAoJogador(estado: EstadoMundo): number {
  const j = estado.jogador
  const dx = estado.bola.x - j.x
  const dz = estado.bola.z - j.z
  return Math.max(dx < 0 ? -dx : dx, dz < 0 ? -dz : dz)
}

export function bolaAoAlcance(estado: EstadoMundo, alcance = ALCANCE_CHUTE): boolean {
  return estado.cena === 'rua' && estado.bola.espera === 0 && distanciaAoJogador(estado) <= alcance
}

// Sentido de -1, 0 ou 1 para virar o jogador para a bola: o eixo menor só conta se for ao menos
// metade do maior (senão, chutar de lado viraria diagonal).
function sentido(d: number, maior: number): number {
  const abs = d < 0 ? -d : d
  if (abs * 2 < maior) return 0
  return d < 0 ? -1 : 1
}

/**
 * Começo do chute (o R): se a bola está atrás ou do lado, o jogador vira para ela antes. A bola só
 * sai no impacto (`chutarBola`), alguns ticks depois.
 */
export function mirarNaBola(estado: EstadoMundo): void {
  const j = estado.jogador
  const dx = estado.bola.x - j.x
  const dz = estado.bola.z - j.z
  if (dx * j.dirX + dz * j.dirZ > 0) return
  const maior = Math.max(dx < 0 ? -dx : dx, dz < 0 ? -dz : dz)
  if (maior === 0) return
  j.dirX = sentido(dx, maior)
  j.dirZ = sentido(dz, maior)
}

/** Impacto do chute: a bola sai no sentido do jogador, se ainda estiver por perto. */
export function chutarBola(estado: EstadoMundo): void {
  if (!bolaAoAlcance(estado, ALCANCE_IMPACTO_CHUTE)) return
  const j = estado.jogador
  const fator = j.dirX !== 0 && j.dirZ !== 0 ? FATOR_DIAGONAL : 1
  estado.bola.vx = j.dirX * fator * VEL_CHUTE
  estado.bola.vz = j.dirZ * fator * VEL_CHUTE
}

// Andando contra a bola (quadrado contra quadrado, como o atropelamento), ela sai na frente.
function conduzir(estado: EstadoMundo) {
  const j = estado.jogador
  const b = estado.bola
  if (estado.cena !== 'rua' || !j.andando || j.tombo > 0) return
  const alcance = RAIO_JOGADOR + RAIO_BOLA
  const dx = b.x - j.x
  const dz = b.z - j.z
  if (dx >= alcance || -dx >= alcance || dz >= alcance || -dz >= alcance) return
  const fator = (j.dirX !== 0 && j.dirZ !== 0 ? FATOR_DIAGONAL : 1) * (j.correndo ? VEL_CORRER : VEL_ANDAR) * FATOR_CONDUCAO
  // Só acelera: a bola que já vai mais rápido para o mesmo lado (um chute) segue o chute.
  const vx = j.dirX * fator
  const vz = j.dirZ * fator
  if (vx !== 0 && (vx > 0 ? b.vx < vx : b.vx > vx)) b.vx = vx
  if (vz !== 0 && (vz > 0 ? b.vz < vz : b.vz > vz)) b.vz = vz
}

// Move um eixo; bateu (sólido ou borda do mapa), fica onde estava e volta com QUIQUE_BOLA.
function moverEixo(b: Bola, eixo: 'x' | 'z') {
  const v = eixo === 'x' ? b.vx : b.vz
  if (v === 0) return
  const x = eixo === 'x' ? b.x + v : b.x
  const z = eixo === 'z' ? b.z + v : b.z
  const rua = CENAS.rua
  const dentro = x >= RAIO_BOLA && x <= rua.largura - RAIO_BOLA && z >= RAIO_BOLA && z <= rua.profundidade - RAIO_BOLA
  if (dentro && livre(x, z, RAIO_BOLA, obstaculosDaRua())) {
    b.x = x
    b.z = z
    return
  }
  const quique = naAreaDoGol(b) ? QUIQUE_REDE : QUIQUE_BOLA
  if (eixo === 'x') b.vx = 0 - b.vx * quique
  else b.vz = 0 - b.vz * quique
}

function naBoca(b: Bola): boolean {
  return b.z > BOCA_Z0 && b.z < BOCA_Z1
}

// Entre as traves e atrás da linha (ou cruzando-a).
function naAreaDoGol(b: Bola): boolean {
  return naBoca(b) && (b.x < CAMPO.x || b.x > CAMPO.x + CAMPO.largura) && b.x > CAMPO.x - FUNDO_GOL && b.x < CAMPO.x + CAMPO.largura + FUNDO_GOL
}

// Inteira depois da linha, entre as traves: gol. Ainda na área do gol (cruzando a linha): nada.
function golDe(b: Bola): LadoDoGol | null {
  if (!naBoca(b)) return null
  if (b.x + RAIO_BOLA < CAMPO.x && b.x > CAMPO.x - FUNDO_GOL) return 'esquerdo'
  if (b.x - RAIO_BOLA > CAMPO.x + CAMPO.largura && b.x < CAMPO.x + CAMPO.largura + FUNDO_GOL) return 'direito'
  return null
}

function foraDoCampo(b: Bola): boolean {
  if (naAreaDoGol(b)) return false
  return b.x < CAMPO.x || b.x > CAMPO.x + CAMPO.largura || b.z < CAMPO.z || b.z > CAMPO.z + CAMPO.profundidade
}

/** Um tick da bola: condução, rolagem com quique, gol ou saída, e a volta ao centro. */
export function passoBola(estado: EstadoMundo): void {
  const b = estado.bola
  if (b.espera > 0) {
    b.espera -= 1
    if (b.espera === 0) aoCentro(b)
  } else conduzir(estado)
  if (b.vx !== 0 || b.vz !== 0) {
    moverEixo(b, 'x')
    moverEixo(b, 'z')
    b.vx = frear(b.vx)
    b.vz = frear(b.vz)
  }
  if (b.espera === 0) {
    const lado = golDe(b)
    if (lado) {
      b.gols += 1
      b.ultimoGol = { tick: estado.tick, lado }
      b.espera = TICKS_VOLTA_GOL
      estado.festa = { cena: 'rua', x: b.x, z: b.z, tick: estado.tick }
    } else if (foraDoCampo(b)) b.espera = TICKS_VOLTA_FORA
  }
  b.aoAlcance = bolaAoAlcance(estado)
}
