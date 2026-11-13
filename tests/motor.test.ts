import { describe, expect, it } from 'vitest'
import {
  criarPartida,
  LogInvalido,
  passo,
  PONTOS_MOEDA,
  pontuacao,
  simularPartida,
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
  while (!estado.fim && estado.jogador.x < x) passo(estado, acaoEm?.(estado) ?? null)
}

// Pula uma vez, quando a frente do jogador chega a `x`.
const pularEm = (x: number) => (e: EstadoPartida) => (e.jogador.noChao && e.jogador.x >= x && e.jogador.y === 0 ? 'pular' : null)

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

describe('física', () => {
  it('pula, sobe e volta ao chão', () => {
    const estado = partidaCom([])
    passo(estado, 'pular')
    expect(estado.jogador.noChao).toBe(false)
    let maior = 0
    while (!estado.jogador.noChao) {
      passo(estado, null)
      maior = Math.max(maior, estado.jogador.y)
    }
    expect(maior).toBeGreaterThan(2)
    expect(maior).toBeLessThan(2.2)
    expect(estado.jogador.y).toBe(0)
  })

  it('pular no ar não faz nada', () => {
    const estado = partidaCom([])
    passo(estado, 'pular')
    for (let i = 0; i < 5; i++) passo(estado, null)
    const vy = estado.jogador.vy
    passo(estado, 'pular')
    expect(estado.jogador.vy).toBeLessThan(vy)
  })

  it('bate de frente num bloco sem pular', () => {
    const estado = partidaCom([{ tipo: 'bloco', x: 10, largura: 1, y: 0, altura: 1 }])
    correrAte(estado, 20)
    expect(estado.fim?.motivo).toBe('batida')
  })

  it('pula por cima de um bloco', () => {
    const estado = partidaCom([{ tipo: 'bloco', x: 10, largura: 1, y: 0, altura: 1 }])
    correrAte(estado, 20, pularEm(8))
    expect(estado.fim).toBeNull()
  })

  it('pousa em cima de um bloco largo e segue correndo', () => {
    const estado = partidaCom([{ tipo: 'bloco', x: 10, largura: 6, y: 0, altura: 1 }])
    correrAte(estado, 14, pularEm(8.5))
    expect(estado.fim).toBeNull()
    expect(estado.jogador.y).toBe(1)
    expect(estado.jogador.noChao).toBe(true)
    correrAte(estado, 20)
    expect(estado.jogador.y).toBe(0)
  })

  it('cai no vão sem pular', () => {
    const estado = partidaCom([{ tipo: 'vao', x: 10, largura: 2, y: 0, altura: 0 }])
    correrAte(estado, 30)
    expect(estado.fim?.motivo).toBe('queda')
  })

  it('atravessa o vão pulando', () => {
    const estado = partidaCom([{ tipo: 'vao', x: 10, largura: 2, y: 0, altura: 0 }])
    correrAte(estado, 30, pularEm(9))
    expect(estado.fim).toBeNull()
  })
})

describe('moedas e pontos', () => {
  it('pega cada moeda uma vez e soma na pontuação', () => {
    const estado = partidaCom([
      { tipo: 'moeda', x: 5, largura: 0, y: 0.4, altura: 0 },
      { tipo: 'moeda', x: 7, largura: 0, y: 0.4, altura: 0 },
      // Alta demais para quem não pula.
      { tipo: 'moeda', x: 9, largura: 0, y: 3, altura: 0 },
    ])
    correrAte(estado, 12)
    expect(estado.moedas).toBe(2)
    expect(pontuacao(estado)).toBe(12 + 2 * PONTOS_MOEDA)
  })
})

describe('determinismo e log', () => {
  it('mesma seed gera a mesma pista', () => {
    expect(criarPartida(42).elementos).toEqual(criarPartida(42).elementos)
    expect(criarPartida(42).elementos).not.toEqual(criarPartida(43).elementos)
  })

  it('replay do mesmo log dá o mesmo resultado', () => {
    const log = [[60, 0], [200, 0], [300, 0]] as const
    expect(simularPartida(7, log)).toEqual(simularPartida(7, log))
  })

  it('structuredClone copia a partida inteira, rng incluído', () => {
    const original = criarPartida(5)
    const copia = structuredClone(original)
    for (let i = 0; i < 600; i++) {
      passo(original, i % 50 === 0 ? 'pular' : null)
      passo(copia, i % 50 === 0 ? 'pular' : null)
    }
    expect(copia).toEqual(original)
  })

  it('recusa log fora de ordem, repetido ou com código desconhecido', () => {
    expect(() => simularPartida(1, [[10, 0], [5, 0]])).toThrow(LogInvalido)
    expect(() => simularPartida(1, [[10, 0], [10, 0]])).toThrow(LogInvalido)
    expect(() => simularPartida(1, [[10, 1]])).toThrow(LogInvalido)
    expect(() => simularPartida(1, [[10, 0.5]])).toThrow(LogInvalido)
  })
})
