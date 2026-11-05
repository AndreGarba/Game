import { describe, expect, it } from 'vitest'
import {
  criarPartida,
  LogInvalido,
  passo,
  simularPartida,
  SUJEIRA_MAX,
  VEL_INICIAL,
  VEL_MAX,
  velocidadeBase,
  type Acao,
  type Elemento,
  type EstadoPartida,
} from '../src/engine/index.ts'

// Partida com pista montada à mão: a geração automática fica desligada.
function partidaCom(elementos: Omit<Elemento, 'id' | 'usado'>[]): EstadoPartida {
  const estado = criarPartida(1)
  estado.elementos = elementos.map((e, i) => ({ ...e, id: i + 1, usado: false }))
  estado.geradoAte = Number.POSITIVE_INFINITY
  return estado
}

function correrAte(estado: EstadoPartida, x: number, acaoEm?: (e: EstadoPartida) => Acao | null): void {
  while (!estado.fim && estado.cachorro.x < x) passo(estado, acaoEm?.(estado) ?? null)
}

describe('velocidade', () => {
  it('começa em VEL_INICIAL, cresce e nunca passa de VEL_MAX', () => {
    expect(velocidadeBase(0)).toBe(VEL_INICIAL)
    let anterior = 0
    for (const d of [0, 100, 1000, 10_000, 1_000_000]) {
      const v = velocidadeBase(d)
      expect(v).toBeGreaterThan(anterior)
      expect(v).toBeLessThan(VEL_MAX)
      anterior = v
    }
  })
})

describe('rampa', () => {
  const RAMPA = { tipo: 'rampa', x: 10, largura: 3, y: 0, altura: 1.2, visual: 'rampa' } as const

  it('sobe pela rampa sem pular, sem bater', () => {
    const estado = partidaCom([RAMPA])
    correrAte(estado, 11)
    expect(estado.fim).toBeNull()
    expect(estado.cachorro.noChao).toBe(true)
    expect(estado.cachorro.y).toBeGreaterThan(0.3)
    expect(estado.cachorro.y).toBeLessThan(1.2)
  })

  it('sai lançado no fim da rampa e volta ao chão', () => {
    const estado = partidaCom([RAMPA])
    let maiorAltura = 0
    let saiuLancado = false
    while (!estado.fim && estado.cachorro.x < 25) {
      passo(estado, null)
      maiorAltura = Math.max(maiorAltura, estado.cachorro.y)
      if (!estado.cachorro.noChao && estado.cachorro.x > 12 && estado.cachorro.vy > 0) saiuLancado = true
    }
    expect(estado.fim).toBeNull()
    expect(saiuLancado).toBe(true)
    expect(maiorAltura).toBeGreaterThan(1.2)
    expect(estado.cachorro.y).toBe(0)
    expect(estado.cachorro.noChao).toBe(true)
  })

  it('pular no meio da rampa sai da superfície', () => {
    const estado = partidaCom([RAMPA])
    correrAte(estado, 11)
    passo(estado, 'pular')
    passo(estado, null)
    expect(estado.cachorro.noChao).toBe(false)
  })

  it('o lançamento atravessa um buraco curto logo depois da rampa', () => {
    const estado = partidaCom([RAMPA, { tipo: 'vao', x: 13.3, largura: 1.3, y: 0, altura: 0, visual: 'buraco' }])
    correrAte(estado, 20)
    expect(estado.fim).toBeNull()
  })
})

describe('física', () => {
  it('pular no ar não faz nada', () => {
    const estado = partidaCom([])
    passo(estado, 'pular')
    const vy = estado.cachorro.vy
    passo(estado, 'pular')
    expect(estado.cachorro.vy).toBeLessThan(vy)
  })

  it('bate de frente num sólido sem pular', () => {
    const estado = partidaCom([{ tipo: 'solido', x: 10, largura: 2, y: 0, altura: 1.2, visual: 'carro' }])
    correrAte(estado, 20)
    expect(estado.fim?.motivo).toBe('batida')
  })

  it('pousa em cima do sólido e segue correndo', () => {
    const estado = partidaCom([{ tipo: 'solido', x: 10, largura: 6, y: 0, altura: 1.2, visual: 'carro' }])
    // r5: o pulo vai mais longe (sai em x ≈ 8 e pousa perto de 14); o carro vai até 16.
    correrAte(estado, 15, (e) => (e.cachorro.x > 8 && e.cachorro.noChao && e.cachorro.y === 0 ? 'pular' : null))
    expect(estado.fim).toBeNull()
    expect(estado.cachorro.y).toBe(1.2)
  })

  it('teto: bate em pé, passa abaixado', () => {
    const teto = { tipo: 'teto' as const, x: 10, largura: 2, y: 0.6, altura: 100, visual: 'placa' }
    const emPe = partidaCom([teto])
    correrAte(emPe, 15)
    expect(emPe.fim?.motivo).toBe('batida')

    const abaixado = partidaCom([teto])
    correrAte(abaixado, 15, (e) => (e.cachorro.x > 8 && e.cachorro.abaixadoTicks === 0 ? 'abaixar' : null))
    expect(abaixado.fim).toBeNull()
  })

  it('cai no vão sem pular', () => {
    const estado = partidaCom([{ tipo: 'vao', x: 10, largura: 3, y: 0, altura: 0, visual: 'rio' }])
    correrAte(estado, 30)
    expect(estado.fim?.motivo).toBe('queda')
  })
})

describe('sujeira, lenço e tutor', () => {
  it('poça suja uma vez, lenço limpa uma vez', () => {
    const estado = partidaCom([
      { tipo: 'poca', x: 5, largura: 2, y: 0, altura: 0, visual: 'poca' },
      { tipo: 'lenco', x: 12, largura: 0, y: 0.45, altura: 0, visual: 'lenco' },
    ])
    correrAte(estado, 9)
    expect(estado.sujeira).toBe(1)
    correrAte(estado, 15)
    expect(estado.sujeira).toBe(0)
    expect(estado.lencos).toBe(1)
  })

  it('cachorro sujo perde vantagem até ser pego', () => {
    const estado = partidaCom([])
    estado.sujeira = SUJEIRA_MAX
    correrAte(estado, 100_000)
    expect(estado.fim?.motivo).toBe('pego')
  })

  it('cachorro limpo não é pego', () => {
    const estado = partidaCom([])
    correrAte(estado, 2000)
    expect(estado.fim).toBeNull()
  })
})

describe('determinismo e log', () => {
  it('mesma seed gera a mesma pista', () => {
    expect(criarPartida(42).elementos).toEqual(criarPartida(42).elementos)
    expect(criarPartida(42).elementos).not.toEqual(criarPartida(43).elementos)
  })

  it('replay do mesmo log dá o mesmo resultado', () => {
    const log = [[60, 0], [200, 1], [300, 0]] as const
    expect(simularPartida(7, log)).toEqual(simularPartida(7, log))
  })

  it('recusa log fora de ordem, repetido ou com código desconhecido', () => {
    expect(() => simularPartida(1, [[10, 0], [5, 0]])).toThrow(LogInvalido)
    expect(() => simularPartida(1, [[10, 0], [10, 1]])).toThrow(LogInvalido)
    expect(() => simularPartida(1, [[10, 2 as 0]])).toThrow(LogInvalido)
  })
})
