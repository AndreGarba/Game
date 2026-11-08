import { describe, expect, it } from 'vitest'
import { validarPartida } from '../supabase/functions/registrar-partida/validar.ts'
import { NOME_MAX, nomeValido, normalizarNome, simularPartida, VERSAO_REGRAS } from '../src/engine/index.ts'

const base = {
  jogadorId: '3f6c1a2e-9b7d-4c1e-8a5f-0d2b4e6f8a10',
  nome: 'Pipoca',
  seed: 42,
  versaoRegras: VERSAO_REGRAS,
  log: [
    [30, 0],
    [95, 1],
  ],
}

describe('validarPartida', () => {
  it('refaz a partida com o motor em vez de aceitar placar', () => {
    const validacao = validarPartida({ ...base, distancia: 999_999, pontos: 999_999 })
    expect(validacao.ok).toBe(true)
    if (!validacao.ok) return
    expect(validacao.partida.resultado).toEqual(simularPartida(42, [[30, 0], [95, 1]]))
    expect(validacao.partida.resultado.distancia).toBeLessThan(999_999)
  })

  it('recusa por versão com código próprio, não como fraude', () => {
    expect(validarPartida({ ...base, versaoRegras: 'r0' })).toEqual({ ok: false, erro: 'versao_regras' })
  })

  it('recusa log fora de ordem, código desconhecido ou formato errado', () => {
    for (const log of [[[10, 0], [10, 1]], [[10, 2]], [[10]], 'nada', [[-1, 0]]]) {
      expect(validarPartida({ ...base, log })).toEqual({ ok: false, erro: 'log_invalido' })
    }
  })

  it('recusa id que não é uuid e seed fora de 32 bits', () => {
    expect(validarPartida({ ...base, jogadorId: 'abc' })).toEqual({ ok: false, erro: 'payload_invalido' })
    expect(validarPartida({ ...base, seed: 2 ** 32 })).toEqual({ ok: false, erro: 'payload_invalido' })
    expect(validarPartida({ ...base, seed: 1.5 })).toEqual({ ok: false, erro: 'payload_invalido' })
    expect(validarPartida(null)).toEqual({ ok: false, erro: 'payload_invalido' })
  })

  it('grava o nome normalizado e recusa nome vazio ou longo', () => {
    const validacao = validarPartida({ ...base, nome: '  Pi​poca   da  Silva ' })
    expect(validacao.ok && validacao.partida.nome).toBe('Pipoca da Silva')
    expect(validarPartida({ ...base, nome: '   ' })).toEqual({ ok: false, erro: 'nome_invalido' })
    expect(validarPartida({ ...base, nome: 'x'.repeat(NOME_MAX + 1) })).toEqual({ ok: false, erro: 'nome_invalido' })
  })
})

describe('nome do jogador', () => {
  it('conta emoji como um caractere, igual ao char_length do Postgres', () => {
    expect(nomeValido('🐶'.repeat(NOME_MAX))).toBe(true)
    expect(nomeValido('🐶'.repeat(NOME_MAX + 1))).toBe(false)
  })

  it('tira caractere de controle', () => {
    expect(normalizarNome('Bo\u0000b\n')).toBe('Bob')
  })
})
