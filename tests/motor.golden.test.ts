// Contrato do motor: seed fixa entra, resultado fixo sai. Snapshot quebrado num refactor
// = refactor errado. Só atualize quando mudar o jogo é o objetivo declarado do PR, com
// VERSAO_REGRAS nova e a explicação do que mudou.
import { describe, expect, it } from 'vitest'
import { criarPartida, simularPartida, type ComandoLog } from '../src/engine/index.ts'
import { criarRng, proximo } from '../src/engine/rng.ts'

describe('golden master do motor', () => {
  it('rng', () => {
    const rng = criarRng(2026)
    expect(Array.from({ length: 5 }, () => proximo(rng))).toMatchSnapshot()
  })

  it('pista gerada para a seed 1', () => {
    const estado = criarPartida(1)
    expect(estado.elementos.map((e) => [e.tipo, e.visual, e.x, e.largura, e.y, e.altura])).toMatchSnapshot()
  })

  it('partidas com logs fixos', () => {
    // Pula a cada segundo e meio e abaixa entre os pulos: não é um jogador bom, é uma
    // sequência estável que atravessa pulo, mergulho, pouso e colisão.
    const log: ComandoLog[] = []
    for (let t = 30; t < 60 * 60; t += 45) log.push([t, t % 90 === 30 ? 0 : 1])
    const resultados = [1, 2, 3, 99].map((seed) => simularPartida(seed, log))
    expect(resultados).toMatchSnapshot()
  })
})
