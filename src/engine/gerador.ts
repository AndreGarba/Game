import { DESCARTAR_ATRAS, GERAR_A_FRENTE } from './constantes.ts'
import { alcancePulo, velocidadeBase } from './fisica.ts'
import { MOLDES, type Molde } from './moldes.ts'
import { entre, proximo, type EstadoRng } from './rng.ts'
import type { EstadoPartida } from './tipos.ts'

// Dificuldade sobe por degraus de distância: libera moldes novos e encurta o respiro.
const DEGRAUS_NIVEL = [0, 250, 800] as const

// Respiro entre trechos, em segundos de corrida na velocidade base daquele ponto.
const FOLGA_POR_NIVEL: readonly (readonly [number, number])[] = [
  [1.2, 2],
  [0.9, 1.5],
  [0.75, 1.2],
]

export function nivelEm(x: number): number {
  let nivel = 0
  DEGRAUS_NIVEL.forEach((inicio, i) => {
    if (x >= inicio) nivel = i
  })
  return nivel
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

// Garante pista até GERAR_A_FRENTE à frente do jogador e descarta o que ficou para trás.
export function atualizarPista(estado: EstadoPartida): void {
  const alvo = estado.jogador.x + GERAR_A_FRENTE
  while (estado.geradoAte < alvo) {
    const x = estado.geradoAte
    const nivel = nivelEm(x)
    const molde = sortearMolde(estado.rng, MOLDES, nivel)
    const { comprimento, itens } = molde.montar({ rng: estado.rng, nivel, alcance: alcancePulo(x) })
    for (const it of itens) {
      estado.elementos.push({ ...it, x: x + it.x, id: estado.proximoId++, usado: false })
    }
    const [folgaMin, folgaMax] = FOLGA_POR_NIVEL[nivel]!
    estado.geradoAte = x + comprimento + velocidadeBase(x) * entre(estado.rng, folgaMin, folgaMax)
  }

  const limite = estado.jogador.x - DESCARTAR_ATRAS
  if (estado.elementos.some((e) => e.x + e.largura < limite)) {
    estado.elementos = estado.elementos.filter((e) => e.x + e.largura >= limite)
  }
}
