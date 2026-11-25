// Manifestantes do vão livre do MASP: cercam e seguem o jogador na área do MASP, voltam para o
// vão quando ele sai, não prendem ninguém, não descem para o asfalto e não gastam o rng.
import { describe, expect, it } from 'vitest'
import { MANIFESTACAO, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { RAIO_FIGURANTE } from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false }
const andar = (e: EstadoMundo, dx: number, dz: number, ticks: number, correr = false) => {
  for (let i = 0; i < ticks; i++) passoMundo(e, { ...PARADO, dx, dz, correr })
}

// Calçada na frente do MASP, sem carros nem figurantes no caminho.
function naFrenteDoMasp(): EstadoMundo {
  const e = criarMundo()
  e.figurantes = []
  e.carros = []
  e.jogador.x = 84
  e.jogador.z = 9.6
  return e
}

const longe = (e: EstadoMundo) =>
  Math.max(...e.manifestantes.map((m) => Math.max(Math.abs(m.x - e.jogador.x), Math.abs(m.z - e.jogador.z))))

describe('manifestantes do MASP', () => {
  it('começam parados no vão, cada um com o seu cartaz', () => {
    const e = criarMundo()
    expect(e.protesto).toBe(false)
    expect(e.manifestantes.map((m) => [m.x, m.z])).toEqual(MANIFESTACAO.casas.map((c) => [c.x, c.z]))
    expect(new Set(e.manifestantes.map((m) => m.placa)).size).toBe(e.manifestantes.length)
    andar(e, 0, 0, 60)
    expect(e.manifestantes.every((m) => !m.andando)).toBe(true)
  })

  it('o jogador chega perto do MASP e eles o cercam; ele anda e eles vão atrás', () => {
    const e = naFrenteDoMasp()
    andar(e, 0, 0, 120)
    expect(e.protesto).toBe(true)
    expect(longe(e)).toBeLessThan(2)
    andar(e, -1, 0, 90)
    andar(e, 0, 0, 90)
    expect(e.jogador.x).toBeLessThan(80)
    expect(longe(e)).toBeLessThan(2)
  })

  it('saiu da área do MASP, voltam cada um para a sua casa no vão', () => {
    const e = naFrenteDoMasp()
    andar(e, 0, 0, 120)
    e.jogador.x = 40
    andar(e, 0, 0, 900)
    expect(e.protesto).toBe(false)
    expect(e.manifestantes.map((m) => [m.x, m.z])).toEqual(MANIFESTACAO.casas.map((c) => [c.x, c.z]))
  })

  it('não descem para o asfalto, nem com o jogador no meio da avenida', () => {
    const e = naFrenteDoMasp()
    const borda = MANIFESTACAO.limite.z + MANIFESTACAO.limite.profundidade
    for (let i = 0; i < 240; i++) {
      passoMundo(e, { ...PARADO, dz: i < 60 ? 1 : 0 })
      for (const m of e.manifestantes) expect(m.z + RAIO_FIGURANTE).toBeLessThanOrEqual(borda + 1e-9)
    }
  })

  it('não prendem o jogador nem mudam a partida: rng, cartões, figurantes e caminho iguais sem eles', () => {
    const roteiro = (e: EstadoMundo) => {
      e.jogador.x = 84
      e.jogador.z = 9.6
      andar(e, 0, 0, 60)
      andar(e, -1, -1, 80)
      andar(e, 1, 0, 120, true)
      andar(e, 0, 1, 40)
      andar(e, -1, 0, 200)
    }
    const com = criarMundo(7)
    const sem = criarMundo(7)
    sem.manifestantes = []
    roteiro(com)
    roteiro(sem)
    expect(com.jogador).toEqual(sem.jogador)
    expect(com.rng).toEqual(sem.rng)
    expect(com.cartoes).toEqual(sem.cartoes)
    expect(com.figurantes).toEqual(sem.figurantes)
    expect(com.carros).toEqual(sem.carros)
  })

  it('é determinístico: a mesma entrada dá os mesmos manifestantes', () => {
    const a = naFrenteDoMasp()
    const b = naFrenteDoMasp()
    for (const e of [a, b]) {
      andar(e, 1, 0, 100)
      andar(e, -1, 1, 50)
      andar(e, 0, 0, 30)
    }
    expect(a.manifestantes).toEqual(b.manifestantes)
  })
})
