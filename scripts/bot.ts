// Jogador automático para simulações de balanceamento. Não faz parte do jogo: serve para
// responder "a pista é passável?" e "até onde um jogador bom chega?" em volume.
// Joga olhando o futuro (clona o estado e testa), então é um teto de habilidade, não
// um jogador médio.
import { codigoDaAcao, passo, type Acao, type ComandoLog, type EstadoPartida } from '../src/engine/index.ts'

const HORIZONTE = 90
const REACAO = 18
const PENALIDADE_SUJAR = 30

interface Avaliacao {
  valor: number
  // Primeiro tick (relativo) em que algo ruim acontece seguindo sem agir.
  problemaEm: number
}

function seguirSemAgir(estado: EstadoPartida, ticks: number): Avaliacao {
  const sim = structuredClone(estado)
  const sujeiraInicial = sim.sujeira
  for (let t = 0; t < ticks; t++) {
    const sujeiraAntes = sim.sujeira
    passo(sim, null)
    if (sim.fim) return { valor: t, problemaEm: t }
    if (sim.sujeira > sujeiraAntes) {
      const restante = seguirSemAgir(sim, ticks - t - 1)
      return {
        valor: t + 1 + restante.valor - PENALIDADE_SUJAR * (sim.sujeira - sujeiraInicial),
        problemaEm: t,
      }
    }
  }
  return { valor: ticks, problemaEm: ticks }
}

function avaliar(estado: EstadoPartida, ticks: number, profundidade: number): number {
  const base = seguirSemAgir(estado, ticks)
  if (base.problemaEm >= ticks || profundidade === 0) return base.valor
  let melhor = base.valor
  const inicio = Math.max(0, base.problemaEm - 25)
  const sim = structuredClone(estado)
  for (let t = 0; t < inicio; t++) passo(sim, null)
  for (let t = inicio; t < base.problemaEm; t += 2) {
    for (const acao of acoesPossiveis(sim)) {
      const tentativa = structuredClone(sim)
      passo(tentativa, acao)
      if (tentativa.fim) continue
      melhor = Math.max(melhor, t + 1 + avaliar(tentativa, ticks - t - 1, profundidade - 1))
    }
    passo(sim, null)
    if (sim.fim) break
    passo(sim, null)
    if (sim.fim) break
  }
  return melhor
}

function acoesPossiveis(estado: EstadoPartida): Acao[] {
  const c = estado.cachorro
  return c.noChao || c.puloDuplo ? ['pular', 'abaixar'] : ['abaixar']
}

export function decidir(estado: EstadoPartida): Acao | null {
  const semAgir = seguirSemAgir(estado, HORIZONTE)
  if (semAgir.problemaEm > REACAO) return null
  // Esperar também é uma opção, mas avaliada a partir do tick seguinte: senão "esperar"
  // empata com "agir agora" (a busca agiria no tick 0) e o bot adia até ser tarde.
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
