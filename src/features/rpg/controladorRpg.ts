import { criarMundo, DT, passoMundo, type Entrada, type EstadoMundo } from '../../engine/rpg/index.ts'
import type { QuadroRpg } from './cena3d/renderizador.ts'

// Liga o mundo (passo fixo de 60 ticks/s) ao requestAnimationFrame, como o controlador do jogo de
// exemplo: tempo real acumulado vira ticks, e o desenho interpola entre o tick anterior e o atual.

export type AcaoBotao = 'interagir' | 'voltar' | 'socar'

export interface OpcoesControladorRpg {
  desenhar(quadro: QuadroRpg, instante: number): void
  // Direção segurada agora, já em eixos do mundo.
  direcao(): { dx: number; dz: number }
  // Botão de correr (ou Shift) segurado agora.
  correndo(): boolean
  // Só quando muda o que o HUD mostra (alvo, diálogo, cena, cartões): o React não renderiza a 60 fps.
  aoMudarHud(estado: EstadoMundo): void
  // Semente da partida (esconde os cartões e sorteia os figurantes). Sem ela, uma nova por carga.
  semente?: number
  // Personagem do elenco escolhido na seleção.
  personagem?: string
}

const MAX_TICKS_POR_QUADRO = 5

// Cada vez que o jogo carrega, os cartões vão para outros lugares. Math.random fica fora do jogo.
function sementeNova(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0]!
}

function assinaturaDoHud(e: EstadoMundo): string {
  const dialogo = e.dialogo ? `${e.dialogo.id}:${e.dialogo.linha}` : ''
  return `${e.cena}|${e.alvo?.id ?? ''}|${dialogo}|${e.cartoes.achados}|${e.cartoes.ultimaRevista?.tick ?? ''}`
}

export function criarControladorRpg(opcoes: OpcoesControladorRpg) {
  const estado = criarMundo(opcoes.semente ?? sementeNova(), opcoes.personagem)
  let fila: AcaoBotao[] = []
  let xAnterior = estado.jogador.x
  let zAnterior = estado.jogador.z
  let acumulado = 0
  let ultimoInstante: number | null = null
  let quadroPedido: number | null = null
  let rodando = true
  let ultimaAssinatura = ''

  function quadro(instante: number) {
    quadroPedido = requestAnimationFrame(quadro)
    if (ultimoInstante !== null && rodando) {
      acumulado = Math.min(acumulado + (instante - ultimoInstante) / 1000, MAX_TICKS_POR_QUADRO * DT)
      while (acumulado >= DT) {
        const { dx, dz } = opcoes.direcao()
        // Um botão por tick: dois toques no mesmo quadro viram ticks seguidos.
        const botao = fila.shift()
        const entrada: Entrada = {
          dx,
          dz,
          correr: opcoes.correndo(),
          interagir: botao === 'interagir',
          voltar: botao === 'voltar',
          socar: botao === 'socar',
        }
        xAnterior = estado.jogador.x
        zAnterior = estado.jogador.z
        passoMundo(estado, entrada)
        acumulado -= DT
      }
      const assinatura = assinaturaDoHud(estado)
      if (assinatura !== ultimaAssinatura) {
        ultimaAssinatura = assinatura
        opcoes.aoMudarHud(estado)
      }
    }
    ultimoInstante = instante
    opcoes.desenhar({ estado, xAnterior, zAnterior, alfa: rodando ? acumulado / DT : 1 }, instante)
  }

  return {
    estado,
    pausar() {
      rodando = false
      fila = []
    },
    continuar() {
      rodando = true
    },
    enviar(acao: AcaoBotao) {
      if (rodando) fila.push(acao)
    },
    ligar() {
      opcoes.aoMudarHud(estado)
      if (quadroPedido === null) quadroPedido = requestAnimationFrame(quadro)
    },
    desligar() {
      if (quadroPedido !== null) cancelAnimationFrame(quadroPedido)
      quadroPedido = null
      ultimoInstante = null
    },
  }
}

export type ControladorRpg = ReturnType<typeof criarControladorRpg>
