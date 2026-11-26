import { TICKS_CANETA, TICKS_POR_SEGUNDO } from '../../../engine/rpg/index.ts'

// Caneta de Mounjaro no desenho: o boneco afina com squash and stretch numa mola amortecida, fica
// fino enquanto o motor conta TICKS_CANETA e volta ao normal com outra mola. Só escala do corpo:
// o motor não sabe de largura, e a colisão continua a mesma.

// Largura e profundidade com o efeito assentado (fração do normal). A largura é a extrema.
const LARGURA_FINO = 0.12
const PROFUNDIDADE_FINO = 0.55
// Quanto o boneco fica mais alto, fino, e quanto estica (ou achata, na volta) no balanço.
const ALTURA_FINO = 0.15
const ESTICA_MOLA = 0.14
// Mola: amortecimento (1/s) e frequência (rad/s). Passa uns 25% do alvo e assenta em ~0,7 s.
const AMORTECIMENTO = 7
const FREQUENCIA = 16
// Depois disso a mola já parou (e^-8,4 ≈ 0,0002): volta à escala 1 e para de calcular.
const SEGUNDOS_DE_VOLTA = 1.2

export interface EscalaDoCorpo {
  largura: number
  altura: number
  profundidade: number
}

const NORMAL: EscalaDoCorpo = { largura: 1, altura: 1, profundidade: 1 }

function escala(k: number, balanco: number): EscalaDoCorpo {
  return {
    largura: LARGURA_FINO ** k,
    profundidade: PROFUNDIDADE_FINO ** k,
    altura: Math.max(0.5, 1 + ALTURA_FINO * k + ESTICA_MOLA * balanco),
  }
}

/**
 * Escala do corpo `ticks` depois de achar a caneta (fracionário: o tick do desenho com o `alfa`).
 * `k` vai de 0 (normal) a 1 (fino) pela mola; potência e não reta, para a largura nunca passar de
 * zero quando a mola passa do alvo (e virar um boneco largo e achatado quando passa na volta).
 */
export function escalaDoFino(ticks: number): EscalaDoCorpo {
  if (ticks < 0) return NORMAL
  const afinando = ticks < TICKS_CANETA
  const s = (afinando ? ticks : ticks - TICKS_CANETA) / TICKS_POR_SEGUNDO
  if (!afinando && s >= SEGUNDOS_DE_VOLTA) return NORMAL
  const amortece = Math.exp(-AMORTECIMENTO * s)
  const mola = 1 - amortece * Math.cos(FREQUENCIA * s)
  const balanco = amortece * Math.sin(FREQUENCIA * s)
  return afinando ? escala(mola, balanco) : escala(1 - mola, -balanco)
}
