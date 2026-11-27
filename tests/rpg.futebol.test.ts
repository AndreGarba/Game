// Campo de futebol na rua: o campo não fecha caminho, o R chuta só perto da bola, o gol conta e
// solta a festa, a bola volta ao centro depois do gol ou de sair, quica na trave e o jogador a
// conduz andando. Cartões continuam os mesmos.
import { describe, expect, it } from 'vitest'
import { BOCA_GOL, CAMPO, CENAS, ESCONDERIJOS, TOTAL_CARTOES, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { POSICAO_INICIAL } from '../src/engine/rpg/cenas.ts'
import { bloqueios, livre } from '../src/engine/rpg/colisao.ts'
import {
  RAIO_JOGADOR,
  TICKS_CHUTE,
  TICKS_CHUTE_IMPACTO,
  TICKS_VOLTA_FORA,
  TICKS_VOLTA_GOL,
} from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false, clicarLivia: false }
const chutar = (e: EstadoMundo) => passoMundo(e, { ...PARADO, chutar: true })
const esperar = (e: EstadoMundo, ticks: number) => {
  for (let i = 0; i < ticks; i++) passoMundo(e, PARADO)
}
const CENTRO = { x: CAMPO.x + CAMPO.largura / 2, z: CAMPO.z + CAMPO.profundidade / 2 }

// Rua sem figurantes, jogador e bola onde o teste quiser. A Livia fica fora do lance (não toca na
// bola): as regras dela estão em rpg.livia.test.ts.
function noCampo(jogador: { x: number; z: number; dirX: number; dirZ: number }, bola: { x: number; z: number }): EstadoMundo {
  const e = criarMundo(7)
  e.figurantes = []
  e.livia.recarga = Number.MAX_SAFE_INTEGER
  Object.assign(e.jogador, jogador)
  e.bola.x = bola.x
  e.bola.z = bola.z
  return e
}

function esperarGol(e: EstadoMundo, ticks = 200): boolean {
  for (let i = 0; i < ticks; i++) {
    passoMundo(e, PARADO)
    if (e.bola.gols > 0) return true
  }
  return false
}

describe('campo de futebol', () => {
  it('o campo inteiro é chão livre e os gols ficam fora das linhas, sem fechar a calçada', () => {
    const obstaculos = bloqueios(CENAS.rua)
    for (let x = CAMPO.x + RAIO_JOGADOR; x <= CAMPO.x + CAMPO.largura - RAIO_JOGADOR; x += 0.5) {
      for (let z = CAMPO.z + RAIO_JOGADOR; z <= CAMPO.z + CAMPO.profundidade - RAIO_JOGADOR; z += 0.5) {
        expect(livre(x, z, RAIO_JOGADOR, obstaculos)).toBe(true)
      }
    }
    for (const s of CENAS.rua.solidos.filter((s) => s.id.startsWith('gol_'))) {
      expect(s.z).toBeGreaterThan(20)
      expect(s.x + s.largura <= CAMPO.x || s.x >= CAMPO.x + CAMPO.largura).toBe(true)
    }
    // Da calçada da frente, na altura do meio-campo, andando reto (+z) chega ao centro.
    const e = criarMundo(7)
    e.figurantes = []
    e.jogador.x = CENTRO.x
    e.jogador.z = POSICAO_INICIAL.z
    for (let i = 0; i < 60 * 8; i++) passoMundo(e, { ...PARADO, dz: 1 })
    expect(e.jogador.z).toBeGreaterThan(CENTRO.z)
  })

  it('gol e rede não escondem cartão: continuam 26 cartões e 149 esconderijos (a mesa da caneta também não esconde)', () => {
    expect(TOTAL_CARTOES).toBe(26)
    expect(ESCONDERIJOS).toHaveLength(149)
    expect(ESCONDERIJOS.some((s) => s.id.startsWith('gol_'))).toBe(false)
  })

  it('a partida começa com a bola parada no centro', () => {
    const e = criarMundo()
    expect(e.bola).toMatchObject({ x: CENTRO.x, z: CENTRO.z, vx: 0, vz: 0, gols: 0, ultimoGol: null })
  })

  it('longe da bola, o R não faz nada', () => {
    const e = noCampo({ x: 30, z: 28, dirX: 1, dirZ: 0 }, CENTRO)
    passoMundo(e, PARADO)
    expect(e.bola.aoAlcance).toBe(false)
    chutar(e)
    expect(e.jogador.chute).toBe(0)
    esperar(e, 30)
    expect(e.bola).toMatchObject({ x: CENTRO.x, z: CENTRO.z, vx: 0, vz: 0 })
  })

  it('perto da bola, o R chuta: o jogador para, a bola sai no impacto e rola até parar', () => {
    const bola = { x: CAMPO.x + 6, z: CENTRO.z }
    const e = noCampo({ x: bola.x - 0.5, z: bola.z, dirX: 1, dirZ: 0 }, bola)
    passoMundo(e, PARADO)
    expect(e.bola.aoAlcance).toBe(true)
    chutar(e)
    expect(e.jogador.chute).toBe(1)
    esperar(e, TICKS_CHUTE_IMPACTO - 2)
    expect(e.bola.vx).toBe(0)
    passoMundo(e, PARADO)
    expect(e.bola.vx).toBeGreaterThan(0.25)
    esperar(e, TICKS_CHUTE)
    expect(e.jogador.chute).toBe(0)
    esperar(e, 400)
    expect(e.bola.vx).toBe(0)
    expect(e.bola.x).toBeGreaterThan(bola.x + 15)
    expect(e.bola.x).toBeLessThan(CAMPO.x + CAMPO.largura)
    expect(e.bola.gols).toBe(0)
  })

  it('com a bola atrás, o jogador vira para ela antes de chutar', () => {
    const e = noCampo({ x: CENTRO.x + 0.5, z: CENTRO.z, dirX: 1, dirZ: 0 }, CENTRO)
    chutar(e)
    expect(e.jogador.dirX).toBe(-1)
    esperar(e, TICKS_CHUTE_IMPACTO)
    expect(e.bola.vx).toBeLessThan(0)
  })

  for (const lado of ['esquerdo', 'direito'] as const) {
    it(`gol no ${lado}: conta, solta o confete e a bola volta ao centro`, () => {
      const sinal = lado === 'esquerdo' ? -1 : 1
      const linha = lado === 'esquerdo' ? CAMPO.x : CAMPO.x + CAMPO.largura
      const bola = { x: linha - sinal * 5, z: CENTRO.z }
      const e = noCampo({ x: bola.x - sinal * 0.5, z: bola.z, dirX: sinal, dirZ: 0 }, bola)
      chutar(e)
      expect(esperarGol(e)).toBe(true)
      expect(e.bola.ultimoGol?.lado).toBe(lado)
      expect(e.festa).toMatchObject({ cena: 'rua', tick: e.bola.ultimoGol!.tick })
      // Fica na rede e, passado o tempo, volta ao centro parada; não conta gol de novo.
      esperar(e, TICKS_VOLTA_GOL)
      expect(e.bola.gols).toBe(1)
      expect(e.bola).toMatchObject({ x: CENTRO.x, z: CENTRO.z, vx: 0, vz: 0, espera: 0 })
    })
  }

  it('bola na trave quica de volta e não é gol', () => {
    const z = CENTRO.z - BOCA_GOL / 2 - 0.05
    const e = noCampo({ x: CENTRO.x, z: 26, dirX: 0, dirZ: 1 }, { x: CAMPO.x + 3, z })
    e.bola.vx = -0.2
    esperar(e, 40)
    expect(e.bola.vx).toBeGreaterThan(0)
    expect(e.bola.gols).toBe(0)
  })

  it('bola que sai pela lateral volta ao centro depois de TICKS_VOLTA_FORA', () => {
    const e = noCampo({ x: 30, z: 26, dirX: 0, dirZ: 1 }, { x: CENTRO.x, z: CAMPO.z + CAMPO.profundidade - 1 })
    e.bola.vz = 0.2
    let saiu = -1
    for (let i = 0; i < 40 && saiu < 0; i++) {
      passoMundo(e, PARADO)
      if (e.bola.espera > 0) saiu = i
    }
    expect(saiu).toBeGreaterThanOrEqual(0)
    expect(e.bola.z).toBeGreaterThan(CAMPO.z + CAMPO.profundidade)
    esperar(e, TICKS_VOLTA_FORA)
    expect(e.bola).toMatchObject({ x: CENTRO.x, z: CENTRO.z, vx: 0, vz: 0 })
    expect(e.bola.gols).toBe(0)
  })

  it('andando contra a bola, o jogador a conduz na frente', () => {
    const e = noCampo({ x: CENTRO.x - 1, z: CENTRO.z, dirX: 1, dirZ: 0 }, CENTRO)
    for (let i = 0; i < 120; i++) passoMundo(e, { ...PARADO, dx: 1 })
    expect(e.bola.x).toBeGreaterThan(e.jogador.x)
    expect(e.bola.x).toBeGreaterThan(CENTRO.x + 5)
    expect(e.bola.x - e.jogador.x).toBeLessThan(3)
  })

  it('mesma semente e mesmas entradas, mesma bola', () => {
    const jogar = () => {
      const e = noCampo({ x: CENTRO.x - 0.5, z: CENTRO.z - 0.4, dirX: 1, dirZ: 1 }, CENTRO)
      chutar(e)
      for (let i = 0; i < 300; i++) passoMundo(e, { ...PARADO, dx: i % 50 < 25 ? 1 : 0, chutar: i % 37 === 0 })
      return e.bola
    }
    expect(jogar()).toEqual(jogar())
  })
})
