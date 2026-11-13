import type { EstadoRng } from './rng.ts'

// Ações que o jogador pode mandar. O código no log é o índice nesta lista: ação nova entra no
// fim, nunca no meio, senão logs antigos passam a significar outra coisa.
export const ACOES = ['pular'] as const
export type Acao = (typeof ACOES)[number]

// Formato compacto do log que vai para o servidor: [tick, índice da ação em ACOES].
export type ComandoLog = readonly [tick: number, codigo: number]

// bloco: caixa que bloqueia de frente e aceita pouso em cima.
// vao:   sem chão entre x e x+largura; cair encerra.
// moeda: coletável pontual centrado em (x, y).
export type TipoElemento = 'bloco' | 'vao' | 'moeda'

export interface Elemento {
  id: number
  tipo: TipoElemento
  x: number
  largura: number
  y: number
  altura: number
  // Coletável já pego.
  usado: boolean
}

export interface Jogador {
  x: number
  y: number
  vy: number
  noChao: boolean
}

export type MotivoFim = 'batida' | 'queda'

// Dado puro: structuredClone copia a partida inteira (o bot e os testes dependem disso).
export interface EstadoPartida {
  versaoRegras: string
  seed: number
  tick: number
  rng: EstadoRng
  jogador: Jogador
  moedas: number
  elementos: Elemento[]
  proximoId: number
  geradoAte: number
  fim: { motivo: MotivoFim; tick: number } | null
}

export interface ResultadoPartida {
  versaoRegras: string
  seed: number
  ticks: number
  distancia: number
  moedas: number
  pontos: number
  motivo: MotivoFim | 'tempoEsgotado'
}
