// Regras de cenário da r9: a sequência troca a cada 1000 m e os cenários novos só têm obstáculos
// próprios, nenhum deles vindo do teto.
import { describe, expect, it } from 'vitest'
import { cenarioEm, SEQUENCIA_CENARIOS, trechoDoCenarioEm } from '../src/engine/index.ts'
import { MOLDES_POR_CENARIO } from '../src/engine/cenarios.ts'
import { criarRng } from '../src/engine/rng.ts'

describe('sequência de cenários', () => {
  it('cidade, parque, bairro japonês e beco, 1000 m cada, e recomeça', () => {
    expect(SEQUENCIA_CENARIOS.map((c) => c.id)).toEqual(['cidade', 'parque', 'bairroJapones', 'becoAbandonado'])
    expect([0, 999, 1000, 1999, 2000, 2999, 3000, 3999, 4000].map(cenarioEm)).toEqual([
      'cidade',
      'cidade',
      'parque',
      'parque',
      'bairroJapones',
      'bairroJapones',
      'becoAbandonado',
      'becoAbandonado',
      'cidade',
    ])
  })

  it('o trecho bate com cenarioEm, também na segunda volta e antes da largada', () => {
    expect(trechoDoCenarioEm(-5)).toEqual({ id: 'cidade', inicio: 0, fim: 1000 })
    expect(trechoDoCenarioEm(2500)).toEqual({ id: 'bairroJapones', inicio: 2000, fim: 3000 })
    expect(trechoDoCenarioEm(5000)).toEqual({ id: 'parque', inicio: 5000, fim: 6000 })
    for (const x of [0, 1, 999.9, 1000, 3999, 4000, 7321]) expect(trechoDoCenarioEm(x).id).toBe(cenarioEm(x))
  })
})

describe('obstáculos dos cenários novos', () => {
  const novos = ['parque', 'bairroJapones', 'becoAbandonado'] as const
  // Todo molde montado várias vezes, no nível mais alto: os sorteios internos mudam os itens.
  const visuaisDe = (cenario: (typeof novos)[number], tipo?: string) => {
    const rng = criarRng(7)
    const visuais = new Set<string>()
    for (const molde of MOLDES_POR_CENARIO[cenario]) {
      for (let i = 0; i < 20; i++) {
        for (const item of molde.montar({ rng, nivel: 3, alcance: 6 }).itens) {
          if (!tipo || item.tipo === tipo) visuais.add(item.visual)
        }
      }
    }
    return visuais
  }

  it.each(novos)('%s não tem nada vindo do teto', (cenario) => {
    expect([...visuaisDe(cenario, 'teto')]).toEqual([])
  })

  it('cada sólido só aparece no próprio cenário', () => {
    const [parque, japao, beco] = novos.map((c) => visuaisDe(c, 'solido'))
    const repetidos = [...parque!].filter((v) => japao!.has(v) || beco!.has(v)).concat([...japao!].filter((v) => beco!.has(v)))
    expect(repetidos).toEqual([])
  })
})
