// Contrato do motor: seed fixa entra, resultado fixo sai. Snapshot quebrado num refactor
// = refactor errado. Só atualize quando mudar o jogo é o objetivo declarado do PR, com
// VERSAO_REGRAS nova e a explicação do que mudou.
import { describe, expect, it } from 'vitest'
import { criarPartida, simularPartida, type ComandoLog } from '../src/engine/index.ts'
import { criarRng, proximo } from '../src/engine/rng.ts'
import { jogar } from '../scripts/bot.ts'

describe('golden master do motor', () => {
  it('rng', () => {
    const rng = criarRng(2026)
    expect(Array.from({ length: 5 }, () => proximo(rng))).toMatchSnapshot()
  })

  it('pista gerada para a seed 1', () => {
    const estado = criarPartida(1)
    expect(estado.elementos.map((e) => [e.tipo, e.x, e.largura, e.y, e.altura])).toMatchSnapshot()
  })

  it('partidas com logs fixos', () => {
    // Pula a cada 0,75 s: não é um jogador bom, é uma sequência estável que atravessa pulo,
    // pouso, moeda e o fim da partida.
    const log: ComandoLog[] = []
    for (let t = 30; t < 60 * 60; t += 45) log.push([t, 0])
    const resultados = [1, 2, 3, 99].map((seed) => simularPartida(seed, log))
    expect(resultados).toMatchSnapshot()
  })

  it('partida do bot por 30 s', () => {
    // Cobre pouso em bloco, vãos e a troca de nível com um log que não termina cedo.
    const estado = criarPartida(7)
    const log = jogar(estado, 30 * 60)
    expect({ log, resultado: simularPartida(7, log) }).toMatchSnapshot()
  })
})
