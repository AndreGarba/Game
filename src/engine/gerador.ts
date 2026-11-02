import {
  DESCARTAR_ATRAS,
  GERAR_A_FRENTE,
  GRAVIDADE,
  PENALIDADE_SUJEIRA,
  SUJEIRA_MAX,
  VEL_PULO,
} from './constantes.ts'
import { cenarioEm, MOLDES_POR_CENARIO, type Molde } from './cenarios.ts'
import { velocidadeBase } from './fisica.ts'
import { entre, proximo, type EstadoRng } from './rng.ts'
import type { EstadoPartida } from './tipos.ts'

// Dificuldade sobe por degraus de distância: libera moldes novos e encurta o respiro.
const DEGRAUS_NIVEL = [0, 250, 800, 2000] as const

// Respiro entre trechos, em segundos de corrida na velocidade base daquele ponto.
const FOLGA_POR_NIVEL: readonly (readonly [number, number])[] = [
  [1.4, 2.2],
  [1.0, 1.6],
  [0.75, 1.2],
  [0.55, 0.9],
]

export function nivelEm(x: number): number {
  let nivel = 0
  DEGRAUS_NIVEL.forEach((inicio, i) => {
    if (x >= inicio) nivel = i
  })
  return nivel
}

const TEMPO_DE_AR = (2 * VEL_PULO) / GRAVIDADE
const PIOR_MULTIPLICADOR = 1 - SUJEIRA_MAX * PENALIDADE_SUJEIRA

export function alcancePulo(x: number): number {
  return velocidadeBase(x) * PIOR_MULTIPLICADOR * TEMPO_DE_AR
}

function sortearMolde(rng: EstadoRng, moldes: readonly Molde[], nivel: number): Molde {
  const disponiveis = moldes.filter((m) => m.nivelMin <= nivel)
  const total = disponiveis.reduce((soma, m) => soma + m.peso, 0)
  let alvo = proximo(rng) * total
  for (const m of disponiveis) {
    alvo -= m.peso
    if (alvo < 0) return m
  }
  return disponiveis[disponiveis.length - 1]!
}

// Garante pista até GERAR_A_FRENTE à frente do cachorro e descarta o que ficou para trás.
export function atualizarPista(estado: EstadoPartida): void {
  const alvo = estado.cachorro.x + GERAR_A_FRENTE
  while (estado.geradoAte < alvo) {
    const x = estado.geradoAte
    const nivel = nivelEm(x)
    const molde = sortearMolde(estado.rng, MOLDES_POR_CENARIO[cenarioEm(x)], nivel)
    const { comprimento, itens } = molde.montar({ rng: estado.rng, nivel, alcance: alcancePulo(x) })
    for (const it of itens) {
      estado.elementos.push({ ...it, x: x + it.x, id: estado.proximoId++, usado: false })
    }
    const [folgaMin, folgaMax] = FOLGA_POR_NIVEL[nivel]!
    estado.geradoAte = x + comprimento + velocidadeBase(x) * entre(estado.rng, folgaMin, folgaMax)
  }

  const limite = estado.cachorro.x - DESCARTAR_ATRAS
  if (estado.elementos.length > 0 && estado.elementos[0]!.x + estado.elementos[0]!.largura < limite) {
    estado.elementos = estado.elementos.filter((e) => e.x + e.largura >= limite)
  }
}
