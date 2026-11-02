import {
  ABAIXAR_TICKS,
  CACHORRO_LARGURA,
  DT,
  GRAVIDADE,
  LIMITE_QUEDA,
  PONTOS_OSSO,
  PONTOS_OSSO_OURO,
  PONTOS_POR_METRO,
  RAIO_COLETAVEL,
  SUJEIRA_MAX,
  TICKS_MAX,
  TOLERANCIA_POUSO,
  TRECHO_INICIAL_LIVRE,
  TUTOR_FATOR,
  VANTAGEM_INICIAL,
  VANTAGEM_MAX,
  VEL_MERGULHO,
  VEL_PULO,
  VERSAO_REGRAS,
} from './constantes.ts'
import { alturaCachorro, multiplicadorSujeira, velocidadeBase } from './fisica.ts'
import { atualizarPista } from './gerador.ts'
import { criarRng } from './rng.ts'
import type { Acao, Cachorro, ComandoLog, Elemento, EstadoPartida, MotivoFim, ResultadoPartida } from './tipos.ts'

export function criarPartida(seed: number): EstadoPartida {
  const estado: EstadoPartida = {
    versaoRegras: VERSAO_REGRAS,
    seed: seed >>> 0,
    tick: 0,
    rng: criarRng(seed),
    cachorro: { x: 0, y: 0, vy: 0, noChao: true, abaixadoTicks: 0 },
    sujeira: 0,
    vantagem: VANTAGEM_INICIAL,
    ossos: 0,
    ossosOuro: 0,
    lencos: 0,
    elementos: [],
    proximoId: 1,
    geradoAte: TRECHO_INICIAL_LIVRE,
    fim: null,
  }
  atualizarPista(estado)
  return estado
}

function sobrepoeEmX(c: Cachorro, e: Elemento): boolean {
  return c.x < e.x + e.largura && c.x + CACHORRO_LARGURA > e.x
}

function topo(e: Elemento): number {
  return e.y + e.altura
}

// Maior altura em que o cachorro pode se apoiar agora: o chão (se não estiver sobre um
// vão) ou o topo de um sólido que ele estava acima no tick anterior.
function alturaDoSuporte(estado: EstadoPartida, yAnterior: number): number | null {
  const c = estado.cachorro
  const centro = c.x + CACHORRO_LARGURA / 2
  let suporte: number | null = null
  let sobreVao = false
  for (const e of estado.elementos) {
    if (e.tipo === 'vao' && centro >= e.x && centro <= e.x + e.largura) sobreVao = true
    if (e.tipo === 'solido' && sobrepoeEmX(c, e) && topo(e) <= yAnterior + TOLERANCIA_POUSO) {
      suporte = suporte === null ? topo(e) : Math.max(suporte, topo(e))
    }
  }
  if (!sobreVao) suporte = suporte === null ? 0 : Math.max(suporte, 0)
  return suporte
}

function tocaColetavel(c: Cachorro, e: Elemento): boolean {
  const altura = alturaCachorro(c)
  const px = Math.min(Math.max(e.x, c.x), c.x + CACHORRO_LARGURA)
  const py = Math.min(Math.max(e.y, c.y), c.y + altura)
  const dx = e.x - px
  const dy = e.y - py
  return dx * dx + dy * dy <= RAIO_COLETAVEL * RAIO_COLETAVEL
}

function bateu(c: Cachorro, e: Elemento): boolean {
  if (!sobrepoeEmX(c, e)) return false
  const altura = alturaCachorro(c)
  if (e.tipo === 'solido') return c.y < topo(e) - TOLERANCIA_POUSO && c.y + altura > e.y
  if (e.tipo === 'teto') return c.y + altura > e.y && c.y < topo(e)
  return false
}

function encerrar(estado: EstadoPartida, motivo: MotivoFim): void {
  estado.fim = { motivo, tick: estado.tick }
}

// Avança exatamente um tick. Muta o estado recebido: quem precisa preservar o anterior
// (bot, replay de teste) clona antes com structuredClone.
export function passo(estado: EstadoPartida, acao: Acao | null): void {
  if (estado.fim) return
  const c = estado.cachorro

  if (acao === 'pular' && c.noChao) {
    c.vy = VEL_PULO
    c.noChao = false
    c.abaixadoTicks = 0
  } else if (acao === 'abaixar') {
    c.abaixadoTicks = ABAIXAR_TICKS
    if (!c.noChao) c.vy = Math.min(c.vy, VEL_MERGULHO)
  }

  const base = velocidadeBase(c.x)
  const v = base * multiplicadorSujeira(estado.sujeira)
  estado.vantagem = Math.min(VANTAGEM_MAX, estado.vantagem + (v - base * TUTOR_FATOR) * DT)

  const yAnterior = c.y
  c.x += v * DT
  c.vy -= GRAVIDADE * DT
  c.y += c.vy * DT

  const suporte = alturaDoSuporte(estado, yAnterior)
  if (suporte !== null && c.y <= suporte && c.vy <= 0) {
    c.y = suporte
    c.vy = 0
    c.noChao = true
  } else {
    c.noChao = false
  }
  // No ar o abaixar não se gasta: o mergulho já pousa abaixado.
  if (c.noChao && c.abaixadoTicks > 0) c.abaixadoTicks--

  for (const e of estado.elementos) {
    if (bateu(c, e)) {
      encerrar(estado, 'batida')
      break
    }
    if (e.usado) continue
    if (e.tipo === 'poca') {
      if (c.noChao && c.y === 0 && sobrepoeEmX(c, e)) {
        e.usado = true
        estado.sujeira = Math.min(SUJEIRA_MAX, estado.sujeira + 1)
      }
    } else if ((e.tipo === 'lenco' || e.tipo === 'osso' || e.tipo === 'ossoOuro') && tocaColetavel(c, e)) {
      e.usado = true
      if (e.tipo === 'lenco') {
        estado.lencos++
        estado.sujeira = Math.max(0, estado.sujeira - 1)
      } else if (e.tipo === 'osso') estado.ossos++
      else estado.ossosOuro++
    }
  }

  if (!estado.fim && c.y < LIMITE_QUEDA) encerrar(estado, 'queda')
  if (!estado.fim && estado.vantagem <= 0) encerrar(estado, 'pego')

  estado.tick++
  if (!estado.fim) atualizarPista(estado)
}

export function distancia(estado: EstadoPartida): number {
  return Math.floor(estado.cachorro.x)
}

export function pontuacao(estado: EstadoPartida): number {
  return (
    distancia(estado) * PONTOS_POR_METRO + estado.ossos * PONTOS_OSSO + estado.ossosOuro * PONTOS_OSSO_OURO
  )
}

export function resultado(estado: EstadoPartida): ResultadoPartida {
  return {
    versaoRegras: estado.versaoRegras,
    seed: estado.seed,
    ticks: estado.tick,
    distancia: distancia(estado),
    ossos: estado.ossos,
    ossosOuro: estado.ossosOuro,
    lencos: estado.lencos,
    pontos: pontuacao(estado),
    motivo: estado.fim?.motivo ?? 'tempoEsgotado',
  }
}

export function codigoDaAcao(acao: Acao): 0 | 1 {
  return acao === 'pular' ? 0 : 1
}

export function acaoDoCodigo(codigo: 0 | 1): Acao {
  return codigo === 0 ? 'pular' : 'abaixar'
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
    if (codigo !== 0 && codigo !== 1) throw new LogInvalido(`código desconhecido: ${String(codigo)}`)
    tickAnterior = tick
  }

  const estado = criarPartida(seed)
  let i = 0
  while (!estado.fim && estado.tick < TICKS_MAX) {
    const comando = log[i]
    let acao: Acao | null = null
    if (comando && comando[0] === estado.tick) {
      acao = acaoDoCodigo(comando[1])
      i++
    }
    passo(estado, acao)
  }
  return resultado(estado)
}
