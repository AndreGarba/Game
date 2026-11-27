// Livia, a NPC do campo: fica sempre no campo, rouba de quem conduz andando e faz gol, fica para
// trás de quem corre, defende o chute que vem nela e deixa passar o do canto, cai com o soco e
// conversa pelo A ou pelo clique, com as seis falas em sequência. Não gasta o rng nem esconde cartão.
import { describe, expect, it } from 'vitest'
import pt from '../src/locales/pt/jogo.json'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import { CAMPO, ELENCO, ESCONDERIJOS, type Entrada, type EstadoMundo } from '../src/engine/rpg/index.ts'
import {
  RAIO_LIVIA,
  TICKS_REACAO_LIVIA,
  TICKS_SOCO_IMPACTO,
  TICKS_TOMBO,
} from '../src/engine/rpg/constantes.ts'
import { FALAS_LIVIA } from '../src/engine/rpg/livia.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false, clicarLivia: false }
const CX = CAMPO.x + CAMPO.largura / 2
const CZ = CAMPO.z + CAMPO.profundidade / 2
const LINHA_DIREITA = CAMPO.x + CAMPO.largura
const FALAS = ['Palmeiras', 'Verdão', 'Palmeiras', 'Vai Palmeiras', 'Mancha Verde', 'Palestra Itália']

const passo = (e: EstadoMundo, entrada: Partial<Entrada> = {}) => passoMundo(e, { ...PARADO, ...entrada })
const esperar = (e: EstadoMundo, ticks: number) => {
  for (let i = 0; i < ticks; i++) passo(e)
}

function rua(semente = 7): EstadoMundo {
  const e = criarMundo(semente)
  e.figurantes = []
  return e
}

function dentroDoCampo(e: EstadoMundo): boolean {
  const l = e.livia
  return (
    l.x >= CAMPO.x + RAIO_LIVIA &&
    l.x <= CAMPO.x + CAMPO.largura - RAIO_LIVIA &&
    l.z >= CAMPO.z + RAIO_LIVIA &&
    l.z <= CAMPO.z + CAMPO.profundidade - RAIO_LIVIA
  )
}

// Bola presa a `dist` da linha do gol direito (e `desvio` em z do centro), com o jogador longe:
// a Livia vem da meta direita e assenta onde espera sem lance. Depois, o jogador encosta na bola.
function antesDoChute(dist: number, desvio: number, dz: number): EstadoMundo {
  const e = rua()
  e.livia.x = LINHA_DIREITA - 0.8
  e.livia.z = CZ
  const bx = LINHA_DIREITA - dist
  const bz = CZ + desvio
  e.jogador.x = bx - 10
  e.jogador.z = bz
  for (let i = 0; i < 300; i++) {
    Object.assign(e.bola, { x: bx, z: bz, vx: 0, vz: 0 })
    passo(e)
  }
  Object.assign(e.jogador, { x: bx - 0.45, z: bz - 0.45 * dz, dirX: 1, dirZ: dz })
  return e
}

// Chuta e espera até a defesa, o gol ou a bola parar fora.
function chutar(e: EstadoMundo): 'defesa' | 'gol' | 'nada' {
  passo(e, { chutar: true })
  for (let i = 0; i < 200; i++) {
    passo(e)
    if (e.livia.defesas > 0) return 'defesa'
    if (e.bola.ultimoGol) return 'gol'
  }
  return 'nada'
}

describe('Livia', () => {
  it('não é do elenco nem esconde cartão: não se escolhe e o sorteio dos cartões é o mesmo', () => {
    expect(ELENCO.some((p) => p.id === 'livia')).toBe(false)
    expect(ESCONDERIJOS.some((s) => s.id === 'livia')).toBe(false)
    const e = criarMundo(7)
    expect(e.cartoes).toEqual(criarMundo(7).cartoes)
  })

  it('começa dentro do campo, entre a bola no centro e o gol esquerdo', () => {
    const e = criarMundo()
    expect(dentroDoCampo(e)).toBe(true)
    expect(e.livia.x).toBeLessThan(CX)
    expect(e.livia).toMatchObject({ modo: 'meta', gols: 0, defesas: 0, ataca: null })
  })

  it('nunca sai do campo, nem com a bola saindo, gols e soco', () => {
    const e = rua()
    e.jogador.x = CX - 1
    e.jogador.z = CZ
    for (let i = 0; i < 60 * 60; i++) {
      const fase = Math.floor(i / 90) % 8
      const dx = [1, 1, 0, -1, -1, -1, 0, 1][fase]!
      const dz = [0, 1, 1, 1, 0, -1, -1, -1][fase]!
      passo(e, { dx, dz, correr: fase % 3 === 0, chutar: i % 23 === 0, socar: i % 211 === 0 })
      expect(dentroDoCampo(e), `tick ${i}`).toBe(true)
    }
  })

  it('o jogador conduz andando: ela rouba, leva a bola e faz gol no outro gol, que conta para ela', () => {
    const e = rua()
    Object.assign(e.jogador, { x: CX - 1, z: CZ, dirX: 1, dirZ: 0 })
    let roubou = false
    for (let i = 0; i < 900 && !e.bola.ultimoGol; i++) {
      passo(e, { dx: 1 })
      if (e.bola.autor === 'livia') roubou = true
    }
    expect(roubou).toBe(true)
    expect(e.bola.ultimoGol).toMatchObject({ autor: 'livia' })
    expect(e.livia.gols).toBe(1)
    // O gol dela não é do jogador e não solta o confete.
    expect(e.bola.gols).toBe(0)
    expect(e.festa).toBeNull()
  })

  it('o jogador conduz correndo: ela fica para trás e o gol é dele', () => {
    const e = rua()
    Object.assign(e.jogador, { x: CX - 1, z: CZ, dirX: 1, dirZ: 0 })
    for (let i = 0; i < 600 && !e.bola.ultimoGol; i++) passo(e, { dx: 1, correr: true })
    expect(e.bola.ultimoGol).toMatchObject({ lado: 'direito', autor: 'jogador' })
    expect(e.bola.gols).toBe(1)
    expect(e.livia.gols).toBe(0)
    expect(e.festa).not.toBeNull()
  })

  it('chute reto nela: defende, a bola volta e o lance não vira gol', () => {
    const e = antesDoChute(9, 0, 0)
    expect(chutar(e)).toBe('defesa')
    expect(e.livia.ultimaDefesa).toBe(e.tick)
    expect(e.bola.vx).toBeLessThan(0)
    // A defesa não muda o autor: a bola continua sendo do chute do jogador.
    expect(e.bola.autor).toBe('jogador')
    expect(e.bola.chutadaEm).toBeNull()
    esperar(e, 60)
    expect(e.bola.ultimoGol).toBeNull()
  })

  it('é vencível: de perto, na diagonal para o canto, a bola passa por ela', () => {
    const e = antesDoChute(5, -4, 1)
    expect(chutar(e)).toBe('gol')
    expect(e.bola.ultimoGol).toMatchObject({ lado: 'direito', autor: 'jogador' })
    expect(e.livia.defesas).toBe(0)
  })

  it(`reage ao chute: nos primeiros ${TICKS_REACAO_LIVIA} ticks fica parada`, () => {
    const e = antesDoChute(11, 2, 0)
    passo(e, { chutar: true })
    while (e.bola.chutadaEm === null) passo(e)
    // A bola saiu neste tick; até o fim da reação, ela não se mexe.
    const { x, z } = e.livia
    for (let i = 1; i < TICKS_REACAO_LIVIA; i++) {
      passo(e)
      if (e.livia.defesas > 0) break
      expect(e.livia).toMatchObject({ x, z, modo: 'defesa' })
    }
  })

  it('com o jogador fora da rua, ela não joga sozinha', () => {
    const e = rua()
    e.cena = 'agencia'
    e.bola.x = e.livia.x + 1
    esperar(e, 300)
    expect(e.bola.autor).toBeNull()
    expect(e.livia.gols).toBe(0)
  })

  it('o A perto dela abre a conversa: seis falas em sequência e ela fica parada', () => {
    const e = rua()
    Object.assign(e.jogador, { x: e.livia.x - 0.9, z: e.livia.z, dirX: 1, dirZ: 0 })
    passo(e)
    expect(e.alvo).toEqual({ id: 'livia', tipo: 'conversa' })
    passo(e, { interagir: true })
    expect(e.dialogo).toEqual({ id: 'livia', linha: 0, linhas: FALAS_LIVIA, origem: 'livia' })
    const { x, z } = e.livia
    for (let linha = 1; linha < FALAS_LIVIA; linha++) {
      passo(e, { interagir: true })
      expect(e.dialogo?.linha).toBe(linha)
      expect(e.livia).toMatchObject({ x, z, modo: 'conversa' })
    }
    passo(e, { interagir: true })
    expect(e.dialogo).toBeNull()
    // Revistar não acha nada nela (não é esconderijo).
    expect(e.cartoes.ultimaRevista).toBeNull()
  })

  it('o clique abre a conversa de longe; fora da rua ou com ela caída, não', () => {
    const e = rua()
    passo(e, { clicarLivia: true })
    expect(e.dialogo).toMatchObject({ id: 'livia', origem: 'livia' })
    const longe = rua()
    longe.cena = 'agencia'
    passo(longe, { clicarLivia: true })
    expect(longe.dialogo).toBeNull()
    const caida = rua()
    caida.livia.tombo = 1
    passo(caida, { clicarLivia: true })
    expect(caida.dialogo).toBeNull()
  })

  it.each([
    ['pt', pt],
    ['en', en],
    ['es', es],
  ] as const)('%s: as falas são as mesmas seis nos três idiomas, e o nome é Livia', (_, idioma) => {
    expect(idioma.rpg.dialogos.livia).toEqual(FALAS)
    expect(idioma.rpg.nomes.livia).toBe('Livia')
  })

  it('o soco a derruba: solta a bola, não conversa no chão, levanta e volta a jogar', () => {
    const e = rua()
    Object.assign(e.jogador, { x: CX - 1, z: CZ, dirX: 1, dirZ: 0 })
    for (let i = 0; i < 400 && e.bola.autor !== 'livia'; i++) passo(e, { dx: 1 })
    expect(e.livia.ataca).not.toBeNull()
    // Encosta nela, virado para ela, e soca.
    Object.assign(e.jogador, { x: e.livia.x - 0.7, z: e.livia.z, dirX: 1, dirZ: 0 })
    passo(e, { socar: true })
    esperar(e, TICKS_SOCO_IMPACTO)
    expect(e.livia).toMatchObject({ modo: 'caida', ataca: null, chute: 0 })
    expect(e.livia.tombo).toBeGreaterThan(0)
    passo(e)
    expect(e.alvo?.id).not.toBe('livia')
    esperar(e, TICKS_TOMBO)
    expect(e.livia.tombo).toBe(0)
    expect(dentroDoCampo(e)).toBe(true)
    passo(e)
    expect(e.livia.modo).not.toBe('caida')
  })

  it('não gasta o rng: cartões, figurantes e o gerador saem iguais com ela fora do lance', () => {
    const jogar = (comLivia: boolean) => {
      const e = criarMundo(11)
      if (!comLivia) e.livia.recarga = Number.MAX_SAFE_INTEGER
      for (let i = 0; i < 60 * 20; i++) passo(e, { dz: 1, correr: i > 300 })
      return e
    }
    const com = jogar(true)
    const sem = jogar(false)
    expect(com.rng).toEqual(sem.rng)
    expect(com.cartoes).toEqual(sem.cartoes)
  })

  it('mesma semente e mesmas entradas, mesma Livia', () => {
    const jogar = () => {
      const e = rua(3)
      Object.assign(e.jogador, { x: CX - 1, z: CZ })
      for (let i = 0; i < 1200; i++) passo(e, { dx: i % 200 < 120 ? 1 : -1, dz: i % 90 < 30 ? 1 : 0, correr: i % 300 < 150, chutar: i % 41 === 0 })
      return { livia: e.livia, bola: e.bola }
    }
    expect(jogar()).toEqual(jogar())
  })
})
