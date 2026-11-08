// Parte pura da function: confere o payload e refaz a partida com o mesmo motor do jogo.
// Sem Deno nem rede aqui, para os testes do Vitest rodarem este mesmo arquivo.
import {
  LogInvalido,
  nomeValido,
  normalizarNome,
  simularPartida,
  TICKS_MAX,
  VERSAO_REGRAS,
  type ComandoLog,
  type ResultadoPartida,
} from '../../../src/engine/index.ts'

export interface PartidaValidada {
  jogadorId: string
  nome: string
  seed: number
  log: ComandoLog[]
  resultado: ResultadoPartida
}

// Versão e fraude têm códigos separados: jogo desatualizado não é trapaça.
export type ErroValidacao = 'payload_invalido' | 'nome_invalido' | 'versao_regras' | 'log_invalido'

export type Validacao = { ok: true; partida: PartidaValidada } | { ok: false; erro: ErroValidacao }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function ehComando(item: unknown): item is ComandoLog {
  return Array.isArray(item) && item.length === 2 && Number.isInteger(item[0]) && Number.isInteger(item[1])
}

export function validarPartida(corpo: unknown): Validacao {
  if (typeof corpo !== 'object' || corpo === null) return { ok: false, erro: 'payload_invalido' }
  const { jogadorId, nome, seed, versaoRegras, log } = corpo as Record<string, unknown>

  if (typeof jogadorId !== 'string' || !UUID.test(jogadorId)) return { ok: false, erro: 'payload_invalido' }
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) {
    return { ok: false, erro: 'payload_invalido' }
  }
  if (typeof versaoRegras !== 'string') return { ok: false, erro: 'payload_invalido' }
  if (versaoRegras !== VERSAO_REGRAS) return { ok: false, erro: 'versao_regras' }
  if (typeof nome !== 'string') return { ok: false, erro: 'nome_invalido' }
  const nomeLimpo = normalizarNome(nome)
  if (!nomeValido(nomeLimpo)) return { ok: false, erro: 'nome_invalido' }
  // Uma ação por tick no máximo: log maior que a partida inteira não precisa nem ser simulado.
  if (!Array.isArray(log) || log.length > TICKS_MAX || !log.every(ehComando)) {
    return { ok: false, erro: 'log_invalido' }
  }

  try {
    const resultado = simularPartida(seed, log)
    return { ok: true, partida: { jogadorId: jogadorId.toLowerCase(), nome: nomeLimpo, seed, log, resultado } }
  } catch (erro) {
    if (erro instanceof LogInvalido) return { ok: false, erro: 'log_invalido' }
    throw erro
  }
}
