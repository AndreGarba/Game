import {
  codigoDaAcao,
  criarPartida,
  DT,
  passo,
  type Acao,
  type ComandoLog,
  type EstadoPartida,
} from '../../engine/index.ts'

// Liga o motor (passo fixo) ao relógio do navegador (requestAnimationFrame, taxa variável).
// O tempo real vira ticks por acumulação; o desenho interpola entre o tick anterior e o atual.

export interface QuadroJogo {
  estado: EstadoPartida
  // Posição do jogador no tick anterior, para interpolar o desenho.
  xAnterior: number
  yAnterior: number
  // 0..1: quanto do próximo tick já passou no relógio real.
  alfa: number
}

export interface OpcoesControlador {
  desenhar(quadro: QuadroJogo): void
  // Chamado poucas vezes por segundo, para o HUD em React não renderizar a 60 fps.
  aoAtualizarHud(estado: EstadoPartida): void
  aoTerminar(estado: EstadoPartida, log: readonly ComandoLog[]): void
}

// Depois de uma pausa longa (aba em segundo plano), não tenta recuperar o tempo perdido.
const MAX_TICKS_POR_QUADRO = 5
const TICKS_ENTRE_HUD = 6

export function novaSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!
}

export function criarControladorJogo(opcoes: OpcoesControlador) {
  let estado = criarPartida(novaSeed())
  let log: ComandoLog[] = []
  let fila: Acao[] = []
  let xAnterior = 0
  let yAnterior = 0
  let acumulado = 0
  let ultimoInstante: number | null = null
  let quadroPedido: number | null = null
  let rodando = false

  function quadro(instante: number) {
    quadroPedido = requestAnimationFrame(quadro)
    if (ultimoInstante !== null && rodando) {
      acumulado = Math.min(acumulado + (instante - ultimoInstante) / 1000, MAX_TICKS_POR_QUADRO * DT)
      while (acumulado >= DT && !estado.fim) {
        // Uma ação por tick: dois toques no mesmo quadro viram ticks seguidos.
        const acao = fila.shift() ?? null
        if (acao) log.push([estado.tick, codigoDaAcao(acao)])
        xAnterior = estado.jogador.x
        yAnterior = estado.jogador.y
        passo(estado, acao)
        acumulado -= DT
        if (estado.tick % TICKS_ENTRE_HUD === 0) opcoes.aoAtualizarHud(estado)
      }
      if (estado.fim) {
        rodando = false
        opcoes.aoAtualizarHud(estado)
        opcoes.aoTerminar(estado, log)
      }
    }
    ultimoInstante = instante
    opcoes.desenhar({ estado, xAnterior, yAnterior, alfa: rodando ? acumulado / DT : 1 })
  }

  return {
    iniciar() {
      estado = criarPartida(novaSeed())
      log = []
      fila = []
      xAnterior = 0
      yAnterior = 0
      acumulado = 0
      rodando = true
      opcoes.aoAtualizarHud(estado)
    },
    pausar() {
      rodando = false
      fila = []
    },
    continuar() {
      if (!estado.fim) rodando = true
    },
    enviar(acao: Acao) {
      if (rodando) fila.push(acao)
    },
    ligar() {
      if (quadroPedido === null) quadroPedido = requestAnimationFrame(quadro)
    },
    desligar() {
      if (quadroPedido !== null) cancelAnimationFrame(quadroPedido)
      quadroPedido = null
      ultimoInstante = null
    },
    get rodando() {
      return rodando
    },
  }
}

export type ControladorJogo = ReturnType<typeof criarControladorJogo>
