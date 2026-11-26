// Caneta de Mounjaro: só a mesa da rosquinha dá a caneta, o efeito dura TICKS_CANETA e acaba
// sozinho; depois a mesa volta a ser alvo. O desenho (afinar e voltar com mola) também é conferido.
import { describe, expect, it } from 'vitest'
import { CENAS, MESA_DA_CANETA, TICKS_CANETA, TICKS_POR_SEGUNDO, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import { ESCONDERIJOS, ehEsconderijo } from '../src/engine/rpg/cartoes.ts'
import { bloqueios, livre } from '../src/engine/rpg/colisao.ts'
import { RAIO_JOGADOR } from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo, trocarPersonagem } from '../src/engine/rpg/mundo.ts'
import { escalaDoFino } from '../src/features/rpg/cena3d/fino.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false }
const apertarA = (e: EstadoMundo) => passoMundo(e, { ...PARADO, interagir: true })
const esperar = (e: EstadoMundo, ticks: number) => {
  for (let i = 0; i < ticks; i++) passoMundo(e, PARADO)
}

const CENA = CENAS[MESA_DA_CANETA.cena]

// No escritório do PAN, sem figurantes, com os cartões já revistados (o A não pega outro objeto).
function noEscritorio(semente = 4321): EstadoMundo {
  const e = criarMundo(semente)
  e.cena = MESA_DA_CANETA.cena
  e.figurantes = []
  for (const esc of ESCONDERIJOS) e.cartoes.revistados[esc.chave] = true
  return e
}

// Um lugar livre de onde o A pega o sólido `id` (grade de 10 cm perto dele), ou null.
function lugarDiante(e: EstadoMundo, id: string): [number, number] | null {
  const s = CENA.solidos.find((x) => x.id === id)!
  const obstaculos = bloqueios(CENA)
  for (let x = s.x - 1.2; x <= s.x + s.largura + 1.2; x += 0.1) {
    for (let z = s.z - 1.2; z <= s.z + s.profundidade + 1.2; z += 0.1) {
      if (x < RAIO_JOGADOR || z < RAIO_JOGADOR || x > CENA.largura - RAIO_JOGADOR || z > CENA.profundidade - RAIO_JOGADOR) continue
      if (!livre(x, z, RAIO_JOGADOR, obstaculos)) continue
      const teste = structuredClone(e)
      teste.jogador.x = x
      teste.jogador.z = z
      passoMundo(teste, PARADO)
      if (teste.alvo?.id === id) return [x, z]
    }
  }
  return null
}

function dianteDaMesa(semente?: number): EstadoMundo {
  const e = noEscritorio(semente)
  ;[e.jogador.x, e.jogador.z] = lugarDiante(e, MESA_DA_CANETA.id)!
  passoMundo(e, PARADO)
  return e
}

describe('caneta de Mounjaro', () => {
  it('a mesa da caneta é uma bancada do escritório do PAN, com a rosquinha, e não esconde cartão', () => {
    const mesa = CENA.solidos.find((s) => s.id === MESA_DA_CANETA.id)
    expect(mesa).toMatchObject({ visual: 'bancada', variante: 'rosquinha' })
    expect(ehEsconderijo(MESA_DA_CANETA.cena, MESA_DA_CANETA.id)).toBe(false)
    // Só ela tem rosquinha.
    const comRosquinha = Object.values(CENAS).flatMap((c) => c.solidos.filter((s) => s.variante === 'rosquinha').map((s) => `${c.id}:${s.id}`))
    expect(comRosquinha).toEqual([`${MESA_DA_CANETA.cena}:${MESA_DA_CANETA.id}`])
    // Em nenhuma semente cai cartão nela.
    for (let s = 1; s <= 50; s++) expect(Object.keys(criarMundo(s).cartoes.escondidos)).not.toContain(`${MESA_DA_CANETA.cena}:${MESA_DA_CANETA.id}`)
  })

  it('o A na mesa acha a caneta: fino por TICKS_CANETA, sem mexer nos cartões nem no rng', () => {
    const e = dianteDaMesa()
    expect(e.alvo).toEqual({ id: MESA_DA_CANETA.id, tipo: 'revistar' })
    const cartoes = structuredClone(e.cartoes)
    const rng = structuredClone(e.rng)
    apertarA(e)
    expect(e.caneta).toBe(e.tick)
    expect(e.jogador.fino).toBe(TICKS_CANETA)
    expect(e.cartoes).toEqual(cartoes)
    expect(e.rng).toEqual(rng)
    expect(e.dialogo).toBeNull()
  })

  it('dura 4 s em ticks; durante o efeito a mesa não é alvo e o A não renova; depois, acha de novo', () => {
    expect(TICKS_CANETA).toBe(4 * TICKS_POR_SEGUNDO)
    const e = dianteDaMesa()
    apertarA(e)
    const achou = e.tick
    // Fino no tick do achado e nos TICKS_CANETA − 1 seguintes, com o A apertado em todos.
    for (let i = 1; i < TICKS_CANETA; i++) {
      expect(e.alvo?.id).not.toBe(MESA_DA_CANETA.id)
      apertarA(e)
      expect(e.caneta).toBe(achou)
      expect(e.jogador.fino).toBe(TICKS_CANETA - i)
    }
    passoMundo(e, PARADO)
    expect(e.jogador.fino).toBe(0)
    expect(e.tick).toBe(achou + TICKS_CANETA)
    // No tick em que acaba, a mesa já volta a ser alvo.
    expect(e.alvo).toEqual({ id: MESA_DA_CANETA.id, tipo: 'revistar' })
    esperar(e, 30)
    expect(e.jogador.fino).toBe(0)
    apertarA(e)
    expect(e.caneta).toBe(e.tick)
    expect(e.jogador.fino).toBe(TICKS_CANETA)
  })

  it('nenhum outro sólido do escritório dá a caneta', () => {
    for (const s of CENA.solidos) {
      if (s.id === MESA_DA_CANETA.id) continue
      const e = noEscritorio()
      // Os esconderijos voltam a valer: o A revista o sólido, como no jogo.
      e.cartoes.revistados = {}
      const lugar = lugarDiante(e, s.id)
      if (!lugar) continue
      ;[e.jogador.x, e.jogador.z] = lugar
      passoMundo(e, PARADO)
      apertarA(e)
      expect(e.caneta, s.id).toBeNull()
      expect(e.jogador.fino, s.id).toBe(0)
    }
  })

  it('o efeito conta parado, de diálogo aberto e depois de trocar de personagem', () => {
    const e = dianteDaMesa()
    apertarA(e)
    expect(trocarPersonagem(e, 'garba')).toBe(true)
    expect(e.jogador.fino).toBe(TICKS_CANETA)
    e.dialogo = { id: 'dev_pan', linha: 0, linhas: 3, origem: 'dev_pan' }
    esperar(e, TICKS_CANETA)
    expect(e.jogador.fino).toBe(0)
  })

  it('determinístico: a mesma partida repete o mesmo estado', () => {
    const rodar = () => {
      const e = dianteDaMesa(99)
      apertarA(e)
      esperar(e, 100)
      passoMundo(e, { ...PARADO, dx: 1 })
      esperar(e, TICKS_CANETA)
      apertarA(e)
      return e
    }
    expect(rodar()).toEqual(rodar())
  })
})

describe('caneta de Mounjaro no desenho', () => {
  const quase = (a: number, b: number) => Math.abs(a - b) < 1e-3

  it('começa normal, afina com mola e fica fino até o fim dos TICKS_CANETA', () => {
    expect(escalaDoFino(-1)).toEqual({ largura: 1, altura: 1, profundidade: 1 })
    expect(escalaDoFino(0)).toEqual({ largura: 1, altura: 1, profundidade: 1 })
    const assentado = escalaDoFino(TICKS_CANETA - 1)
    expect(assentado.largura).toBeLessThan(0.15)
    expect(assentado.altura).toBeGreaterThan(1)
    // A mola passa do alvo: fica mais fino que o assentado logo no começo.
    const passou = Math.min(...Array.from({ length: 60 }, (_, t) => escalaDoFino(t).largura))
    expect(passou).toBeLessThan(assentado.largura)
    expect(passou).toBeGreaterThan(0)
  })

  it('volta ao normal com outra mola (alarga além do normal antes de assentar) e para em 1', () => {
    const antes = escalaDoFino(TICKS_CANETA - 0.001)
    const depois = escalaDoFino(TICKS_CANETA)
    expect(quase(antes.largura, depois.largura)).toBe(true)
    const volta = Array.from({ length: 60 }, (_, t) => escalaDoFino(TICKS_CANETA + t))
    expect(Math.max(...volta.map((v) => v.largura))).toBeGreaterThan(1)
    expect(Math.min(...volta.map((v) => v.altura))).toBeLessThan(1)
    expect(escalaDoFino(TICKS_CANETA + 2 * TICKS_POR_SEGUNDO)).toEqual({ largura: 1, altura: 1, profundidade: 1 })
  })
})
