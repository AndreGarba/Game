// A pista precisa ser passável: um jogador perfeito não pode morrer por batida ou queda
// no começo da partida. Se este teste falhar, o gerador montou um trecho impossível.
import { describe, expect, it } from 'vitest'
import { criarPartida, simularPartida, TICKS_POR_SEGUNDO } from '../src/engine/index.ts'
import { jogar } from '../scripts/bot.ts'

describe('pista passável', () => {
  it.each([1, 2, 3, 4, 5])('seed %i: bot sobrevive 60 s e o replay bate', (seed) => {
    const estado = criarPartida(seed)
    const log = jogar(estado, 60 * TICKS_POR_SEGUNDO)
    expect(estado.fim).toBeNull()

    const replay = simularPartida(seed, log)
    expect(replay.ticks).toBeGreaterThanOrEqual(estado.tick)
  })
})
