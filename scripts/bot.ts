// Jogador automático para simulações de balanceamento. Não faz parte do jogo: serve para
// responder "a pista é passável?" e "até onde um jogador bom chega?" em volume.
// Joga olhando o futuro (clona o estado e testa), então é um teto de habilidade, não
// um jogador médio. Jogo novo adapta `acoesPossiveis` e, se houver, a penalidade de cada evento.
import { ACOES, codigoDaAcao, passo, type Acao, type ComandoLog, type EstadoPartida } from '../src/engine/index.ts'

const HORIZONTE = 90
const REACAO = 18

// Ticks até a partida acabar seguindo sem agir (ou `ticks`, se não acabar).
function seguirSemAgir(estado: EstadoPartida, ticks: number): number {
  const sim = structuredClone(estado)
  for (let t = 0; t < ticks; t++) {
    passo(sim, null)
    if (sim.fim) return t
  }
  return ticks
}

function acoesPossiveis(estado: EstadoPartida): readonly Acao[] {
  return estado.jogador.noChao ? ACOES : []
}

// Quantos ticks dá para sobreviver dentro de `ticks`, agindo no máximo `profundidade` vezes.
function avaliar(estado: EstadoPartida, ticks: number, profundidade: number): number {
  const base = seguirSemAgir(estado, ticks)
  if (base >= ticks || profundidade === 0) return base
  let melhor = base
  const sim = structuredClone(estado)
  for (let t = 0; t < base; t++) {
    for (const acao of acoesPossiveis(sim)) {
      const tentativa = structuredClone(sim)
      passo(tentativa, acao)
      if (tentativa.fim) continue
      melhor = Math.max(melhor, t + 1 + avaliar(tentativa, ticks - t - 1, profundidade - 1))
      if (melhor >= ticks) return melhor
    }
    passo(sim, null)
    if (sim.fim) break
  }
  return melhor
}

export function decidir(estado: EstadoPartida): Acao | null {
  if (seguirSemAgir(estado, HORIZONTE) > REACAO) return null
  // Esperar também é uma opção, avaliada a partir do tick seguinte: senão "esperar" empata com
  // "agir agora" (a busca agiria no tick 0) e o bot adia até ser tarde.
  let melhorAcao: Acao | null = null
  let melhorValor = -Infinity
  const esperando = structuredClone(estado)
  passo(esperando, null)
  if (!esperando.fim) melhorValor = 1 + avaliar(esperando, HORIZONTE - 1, 1)
  for (const acao of acoesPossiveis(estado)) {
    const sim = structuredClone(estado)
    passo(sim, acao)
    if (sim.fim) continue
    const valor = 1 + avaliar(sim, HORIZONTE - 1, 1)
    if (valor > melhorValor) {
      melhorValor = valor
      melhorAcao = acao
    }
  }
  return melhorAcao
}

// Joga uma partida inteira e devolve o log no formato que o servidor recebe.
export function jogar(estado: EstadoPartida, limiteTicks: number): ComandoLog[] {
  const log: ComandoLog[] = []
  while (!estado.fim && estado.tick < limiteTicks) {
    const acao = decidir(estado)
    if (acao) log.push([estado.tick, codigoDaAcao(acao)])
    passo(estado, acao)
  }
  return log
}
