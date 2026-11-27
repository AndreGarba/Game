// Troca de personagem no meio da partida: muda só quem o jogador é. Cena, posição, direção,
// cartões, tempo e o resto do estado ficam; o antigo e o novo trocam de lugar no mapa, sem sorteio.
import { describe, expect, it } from 'vitest'
import { trocarPersonagem, type Entrada, type EstadoMundo, type IdCena } from '../src/engine/rpg/index.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false, chutar: false, clicarLivia: false }

function sementeCom(id: string, cena: IdCena, personagem: string): number {
  for (let s = 1; s < 500; s++) if (criarMundo(s, personagem).elencoNoMapa[id] === cena) return s
  throw new Error(`nenhuma semente põe ${id} em ${cena}`)
}

// Anda um pouco em diagonal e revista onde estiver, para o estado ter história antes da troca.
function jogar(e: EstadoMundo, ticks: number) {
  for (let t = 0; t < ticks; t++) passoMundo(e, { ...PARADO, dx: t % 120 < 60 ? 1 : 0, dz: t % 200 < 100 ? 1 : -1, interagir: t % 90 === 0 })
}

// O estado sem o que a troca muda de propósito (quem joga, onde o elenco anda e os figurantes).
const semQuem = (e: EstadoMundo) => {
  const { personagem: _p, elencoNoMapa: _m, figurantes: _f, jogador, ...resto } = structuredClone(e)
  const { visual: _v, ...corpo } = jogador
  return { ...resto, jogador: corpo }
}

describe('trocar de personagem', () => {
  it('mantém cena, posição, direção, cartões, tempo e o resto do estado', () => {
    const e = criarMundo(5, 'rici')
    jogar(e, 900)
    const antes = structuredClone(e)
    expect(trocarPersonagem(e, 'garba')).toBe(true)
    expect(e.personagem).toBe('garba')
    expect(e.jogador.visual).toBe('garba')
    expect(e.jogador).toMatchObject({ x: antes.jogador.x, z: antes.jogador.z, dirX: antes.jogador.dirX, dirZ: antes.jogador.dirZ })
    expect(e.cena).toBe(antes.cena)
    expect(e.tick).toBe(antes.tick)
    expect(e.cartoes).toEqual(antes.cartoes)
    expect(semQuem(e)).toEqual(semQuem(antes))
  })

  it('o antigo vai para a cena onde o novo andava, e o novo sai do mapa', () => {
    const s = sementeCom('garba', 'agencia', 'rici')
    const e = criarMundo(s, 'rici')
    trocarPersonagem(e, 'garba')
    expect(e.elencoNoMapa.garba).toBeUndefined()
    expect(e.elencoNoMapa.rici).toBe('agencia')
    expect(Object.keys(e.elencoNoMapa).sort()).toEqual(Object.keys(criarMundo(s, 'garba').elencoNoMapa).sort())
  })

  it('se o novo estava nesta cena, o antigo assume o lugar dele ali mesmo', () => {
    const s = sementeCom('garba', 'rua', 'rici')
    const e = criarMundo(s, 'rici')
    jogar(e, 300)
    const garba = e.figurantes.find((f) => f.elenco === 'garba')!
    const { x, z } = garba
    trocarPersonagem(e, 'garba')
    expect(e.figurantes.filter((f) => f.elenco === 'garba')).toHaveLength(0)
    expect(e.figurantes.find((f) => f.elenco === 'rici')).toMatchObject({ id: 'elenco_rici', visual: 'rici', x, z })
    // O mundo segue andando normalmente depois da troca.
    jogar(e, 300)
    expect(e.figurantes.filter((f) => f.elenco === 'rici')).toHaveLength(1)
  })

  it('é determinística: a mesma troca no mesmo estado dá o mesmo mundo', () => {
    const a = criarMundo(11, 'fernanda')
    const b = criarMundo(11, 'fernanda')
    jogar(a, 600)
    jogar(b, 600)
    trocarPersonagem(a, 'rogerio')
    trocarPersonagem(b, 'rogerio')
    jogar(a, 600)
    jogar(b, 600)
    expect(a).toEqual(b)
  })

  it('ida e volta devolve o elenco ao lugar de antes', () => {
    const e = criarMundo(21, 'rici')
    const mapa = { ...e.elencoNoMapa }
    trocarPersonagem(e, 'rogerio')
    trocarPersonagem(e, 'rici')
    expect(e.personagem).toBe('rici')
    expect(e.elencoNoMapa).toEqual(mapa)
  })

  it('id desconhecido ou o mesmo personagem não mexe em nada', () => {
    const e = criarMundo(3, 'garba')
    const antes = structuredClone(e)
    expect(trocarPersonagem(e, 'garba')).toBe(false)
    expect(trocarPersonagem(e, 'ninguem')).toBe(false)
    expect(e).toEqual(antes)
  })
})
