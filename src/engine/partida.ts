import {
  DT,
  GRAVIDADE,
  JOGADOR_LADO,
  LIMITE_QUEDA,
  PONTOS_MOEDA,
  PONTOS_POR_METRO,
  RAIO_COLETAVEL,
  TICKS_MAX,
  TOLERANCIA_POUSO,
  TRECHO_INICIAL_LIVRE,
  VEL_PULO,
  VERSAO_REGRAS,
} from './constantes.ts'
import { velocidadeBase } from './fisica.ts'
import { atualizarPista } from './gerador.ts'
import { criarRng } from './rng.ts'
import {
  ACOES,
  type Acao,
  type ComandoLog,
  type Elemento,
  type EstadoPartida,
  type Jogador,
  type MotivoFim,
  type ResultadoPartida,
} from './tipos.ts'

export function criarPartida(seed: number): EstadoPartida {
  const estado: EstadoPartida = {
    versaoRegras: VERSAO_REGRAS,
    seed: seed >>> 0,
    tick: 0,
    rng: criarRng(seed),
    jogador: { x: 0, y: 0, vy: 0, noChao: true },
    moedas: 0,
    elementos: [],
    proximoId: 1,
    geradoAte: TRECHO_INICIAL_LIVRE,
    fim: null,
  }
  atualizarPista(estado)
  return estado
}

function sobrepoeEmX(j: Jogador, e: Elemento): boolean {
  return j.x < e.x + e.largura && j.x + JOGADOR_LADO > e.x
}

function topo(e: Elemento): number {
  return e.y + e.altura
}

// Maior altura em que o jogador pode se apoiar agora: o chão (se o centro não estiver sobre um
// vão) ou o topo de um bloco que ele estava acima no tick anterior. null = nada embaixo.
function suporteAtual(estado: EstadoPartida, yAnterior: number): number | null {
  const j = estado.jogador
  const centro = j.x + JOGADOR_LADO / 2
  let suporte: number | null = null
  let sobreVao = false
  for (const e of estado.elementos) {
    if (e.tipo === 'vao' && centro >= e.x && centro <= e.x + e.largura) sobreVao = true
    if (e.tipo === 'bloco' && sobrepoeEmX(j, e) && topo(e) <= yAnterior + TOLERANCIA_POUSO) {
      suporte = Math.max(suporte ?? topo(e), topo(e))
    }
  }
  if (!sobreVao) suporte = Math.max(suporte ?? 0, 0)
  return suporte
}

function tocaColetavel(j: Jogador, e: Elemento): boolean {
  const px = Math.min(Math.max(e.x, j.x), j.x + JOGADOR_LADO)
  const py = Math.min(Math.max(e.y, j.y), j.y + JOGADOR_LADO)
  const dx = e.x - px
  const dy = e.y - py
  return dx * dx + dy * dy <= RAIO_COLETAVEL * RAIO_COLETAVEL
}

function bateu(j: Jogador, e: Elemento): boolean {
  if (e.tipo !== 'bloco' || !sobrepoeEmX(j, e)) return false
  return j.y < topo(e) - TOLERANCIA_POUSO && j.y + JOGADOR_LADO > e.y
}

function encerrar(estado: EstadoPartida, motivo: MotivoFim): void {
  estado.fim = { motivo, tick: estado.tick }
}

// Avança exatamente um tick. Muta o estado recebido: quem precisa preservar o anterior
// (bot, replay de teste) clona antes com structuredClone.
export function passo(estado: EstadoPartida, acao: Acao | null): void {
  if (estado.fim) return
  const j = estado.jogador

  if (acao === 'pular' && j.noChao) {
    j.vy = VEL_PULO
    j.noChao = false
  }

  const yAnterior = j.y
  j.x += velocidadeBase(j.x) * DT
  j.vy -= GRAVIDADE * DT
  j.y += j.vy * DT

  const suporte = suporteAtual(estado, yAnterior)
  if (suporte !== null && j.y <= suporte && j.vy <= 0) {
    j.y = suporte
    j.vy = 0
    j.noChao = true
  } else {
    j.noChao = false
  }

  for (const e of estado.elementos) {
    if (bateu(j, e)) {
      encerrar(estado, 'batida')
      break
    }
    if (e.tipo === 'moeda' && !e.usado && tocaColetavel(j, e)) {
      e.usado = true
      estado.moedas++
    }
  }

  if (!estado.fim && j.y < LIMITE_QUEDA) encerrar(estado, 'queda')

  estado.tick++
  if (!estado.fim) atualizarPista(estado)
}

export function distancia(estado: EstadoPartida): number {
  return Math.floor(estado.jogador.x)
}

export function pontuacao(estado: EstadoPartida): number {
  return distancia(estado) * PONTOS_POR_METRO + estado.moedas * PONTOS_MOEDA
}

export function resultado(estado: EstadoPartida): ResultadoPartida {
  return {
    versaoRegras: estado.versaoRegras,
    seed: estado.seed,
    ticks: estado.tick,
    distancia: distancia(estado),
    moedas: estado.moedas,
    pontos: pontuacao(estado),
    motivo: estado.fim?.motivo ?? 'tempoEsgotado',
  }
}

export function codigoDaAcao(acao: Acao): number {
  return ACOES.indexOf(acao)
}

export function acaoDoCodigo(codigo: number): Acao | undefined {
  return ACOES[codigo]
}

export class LogInvalido extends Error {}

// O que o servidor roda: mesma seed + mesmas decisões = mesmo resultado, sem confiar
// no placar que o aparelho diz ter feito.
export function simularPartida(seed: number, log: readonly ComandoLog[]): ResultadoPartida {
  let tickAnterior = -1
  for (const [tick, codigo] of log) {
    if (!Number.isInteger(tick) || tick <= tickAnterior || tick >= TICKS_MAX) {
      throw new LogInvalido(`tick fora de ordem ou de faixa: ${tick}`)
    }
    if (!Number.isInteger(codigo) || acaoDoCodigo(codigo) === undefined) {
      throw new LogInvalido(`código desconhecido: ${String(codigo)}`)
    }
    tickAnterior = tick
  }

  const estado = criarPartida(seed)
  let i = 0
  while (!estado.fim && estado.tick < TICKS_MAX) {
    const comando = log[i]
    let acao: Acao | null = null
    if (comando && comando[0] === estado.tick) {
      acao = acaoDoCodigo(comando[1])!
      i++
    }
    passo(estado, acao)
  }
  return resultado(estado)
}
