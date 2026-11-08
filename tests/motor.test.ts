import { describe, expect, it } from 'vitest'
import {
  criarPartida,
  LogInvalido,
  passo,
  simularPartida,
  SUJEIRA_MAX,
  VEL_INICIAL,
  VEL_MAX,
  vantagemTutor,
  velocidadeBase,
  alturaSuperficie,
  CACHORRO_LARGURA,
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
  it('pulo duplo: o segundo pular no ar funciona uma vez; o terceiro não', () => {
    const estado = partidaCom([])
    passo(estado, 'pular')
    for (let i = 0; i < 10; i++) passo(estado, null)
    const vyAntes = estado.cachorro.vy
    passo(estado, 'pular')
    expect(estado.cachorro.vy).toBeGreaterThan(vyAntes)
    const vyDuplo = estado.cachorro.vy
    passo(estado, 'pular')
    expect(estado.cachorro.vy).toBeLessThan(vyDuplo)
  })

  it('pulo duplo volta a valer depois de pousar', () => {
    const estado = partidaCom([])
    passo(estado, 'pular')
    passo(estado, 'pular')
    while (!estado.cachorro.noChao) passo(estado, null)
    expect(estado.cachorro.puloDuplo).toBe(true)
  })

  it('pulo duplo sobe acima do pulo simples', () => {
    const simples = partidaCom([])
    const duplo = partidaCom([])
    passo(simples, 'pular')
    passo(duplo, 'pular')
    let maxSimples = 0
    let maxDuplo = 0
    for (let i = 0; i < 90; i++) {
      passo(simples, null)
      // No alto do primeiro pulo, pula de novo.
      passo(duplo, i === 19 ? 'pular' : null)
      maxSimples = Math.max(maxSimples, simples.cachorro.y)
      maxDuplo = Math.max(maxDuplo, duplo.cachorro.y)
    }
    expect(maxSimples).toBeLessThan(2.2)
    expect(maxDuplo).toBeGreaterThan(4)
  })

  it('bate de frente num sólido sem pular', () => {
    const estado = partidaCom([{ tipo: 'solido', x: 10, largura: 2, y: 0, altura: 1.2, visual: 'carro' }])
    correrAte(estado, 20)
    expect(estado.fim?.motivo).toBe('batida')
  })

  it('pousa em cima do sólido e segue correndo', () => {
    // Caixa: sólido sem perfil, topo reto.
    const estado = partidaCom([{ tipo: 'solido', x: 10, largura: 6, y: 0, altura: 1.2, visual: 'caixa' }])
    // Sai em x ≈ 8 e pousa por volta de 13; o carro vai até 16.
    correrAte(estado, 15, (e) => (e.cachorro.x > 8 && e.cachorro.noChao && e.cachorro.y === 0 ? 'pular' : null))
    expect(estado.fim).toBeNull()
    expect(estado.cachorro.y).toBe(1.2)
  })

  it('carro: bate de frente na traseira sem pular', () => {
    const estado = partidaCom([{ tipo: 'solido', x: 10, largura: 7.8, y: 0, altura: 2.6, visual: 'carro' }])
    correrAte(estado, 12)
    expect(estado.fim?.motivo).toBe('batida')
  })

  it('carro: anda por cima seguindo o contorno e desce do outro lado', () => {
    const carro = { tipo: 'solido' as const, x: 10, largura: 7.8, y: 0, altura: 2.6, visual: 'carro' }
    const estado = partidaCom([carro])
    // Começa em pé no porta-malas.
    estado.cachorro.x = 10.2
    estado.cachorro.y = alturaSuperficie({ ...carro, id: 1, usado: false }, 10.2 + CACHORRO_LARGURA / 2)
    const alturas: number[] = []
    while (!estado.fim && estado.cachorro.x < 22) {
      passo(estado, null)
      alturas.push(estado.cachorro.y)
    }
    expect(estado.fim).toBeNull()
    // Sobe o vidro traseiro até o teto (2,6 m), sem lançamento acima dele.
    expect(Math.max(...alturas)).toBeCloseTo(2.6, 5)
    // No capô está bem abaixo do teto; depois do carro, de volta ao chão.
    const noCapo = alturas[Math.floor(alturas.length * 0.5)]!
    expect(noCapo).toBeLessThan(2.6)
    expect(estado.cachorro.y).toBe(0)
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

  const pocas = (quantidade: number) =>
    Array.from({ length: quantidade }, (_, i) => ({
      tipo: 'poca' as const,
      x: 5 + i * 5,
      largura: 2,
      y: 0,
      altura: 0,
      visual: 'poca',
    }))

  it('cada lama deixa o tutor um degrau mais perto, sempre na mesma distância', () => {
    expect([0, 1, 2, 3, 4].map(vantagemTutor)).toEqual([20, 15, 10, 5, 0])
  })

  it('sujeira não freia o cachorro nem encerra a partida sozinha', () => {
    const limpo = partidaCom([])
    const sujo = partidaCom([])
    sujo.sujeira = SUJEIRA_MAX
    correrAte(limpo, 2000)
    correrAte(sujo, 2000)
    expect(sujo.fim).toBeNull()
    expect(sujo.tick).toBe(limpo.tick)
  })

  it('aguenta 3 lamas; a 4ª encerra a partida como pego', () => {
    const tres = partidaCom(pocas(3))
    correrAte(tres, 40)
    expect(tres.sujeira).toBe(SUJEIRA_MAX)
    expect(tres.fim).toBeNull()

    const quatro = partidaCom(pocas(4))
    correrAte(quatro, 40)
    expect(quatro.fim?.motivo).toBe('pego')
    expect(vantagemTutor(quatro.sujeira)).toBe(0)
  })

  it('lenço devolve uma lama: o tutor recua um degrau e a conta volta a caber', () => {
    const estado = partidaCom([
      ...pocas(3),
      { tipo: 'lenco', x: 22, largura: 0, y: 0.45, altura: 0, visual: 'lenco' },
      { tipo: 'poca', x: 26, largura: 2, y: 0, altura: 0, visual: 'poca' },
    ])
    correrAte(estado, 40)
    expect(estado.sujeira).toBe(SUJEIRA_MAX)
    expect(estado.fim).toBeNull()
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
