import { EMPURRAO_PATINETE, TICKS_ARRASTO, TICKS_CAINDO, TICKS_NO_CHAO, TICKS_TOMBO } from './constantes.ts'
import type { FaseTombo, Tombo } from './tipos.ts'

// Linha do tempo de quem cai, igual para jogador, figurante e NPC: cai, fica no chão, levanta.

export function faseDoTombo(t: Tombo): FaseTombo {
  if (t.tombo === 0) return 'de-pe'
  if (t.tombo <= TICKS_CAINDO) return 'caindo'
  if (t.tombo <= TICKS_CAINDO + TICKS_NO_CHAO) return 'no-chao'
  return 'levantando'
}

export function derrubar(t: Tombo, sentidoX: number, sentidoZ: number) {
  t.tombo = 1
  t.tomboX = sentidoX
  t.tomboZ = sentidoZ
}

// Quanto o arrasto anda neste tick, em metros (0 depois de TICKS_ARRASTO): freia até parar,
// EMPURRAO_PATINETE · (TICKS_ARRASTO + 1) / 2 no total.
export function arrastoDoTick(t: Tombo): number {
  if (t.tombo === 0 || t.tombo > TICKS_ARRASTO) return 0
  return (EMPURRAO_PATINETE * (TICKS_ARRASTO - t.tombo + 1)) / TICKS_ARRASTO
}

// Avança um tick. Devolve true no tick em que levanta (tombo volta a 0).
export function avancarTombo(t: Tombo): boolean {
  if (t.tombo === 0) return false
  if (t.tombo >= TICKS_TOMBO) {
    t.tombo = 0
    return true
  }
  t.tombo += 1
  return false
}
