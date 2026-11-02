import { useEffect, type RefObject } from 'react'
import type { Acao } from '../../engine/index.ts'

const TECLAS: Record<string, Acao> = {
  Space: 'pular',
  ArrowUp: 'pular',
  KeyW: 'pular',
  ArrowDown: 'abaixar',
  KeyS: 'abaixar',
}

// Distância vertical, em px, para um arrasto contar como deslize.
const LIMIAR_DESLIZE = 24

// Teclado na janela inteira; toque e mouse só sobre a área do jogo. O deslize dispara no
// meio do gesto (sem esperar soltar o dedo): em velocidade alta, 100 ms decidem a batida.
export function useControlesCorrida(area: RefObject<HTMLElement | null>, enviar: (acao: Acao) => void): void {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const acao = TECLAS[evento.code]
      if (!acao || evento.repeat) return
      evento.preventDefault()
      enviar(acao)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [enviar])

  useEffect(() => {
    const elemento = area.current
    if (!elemento) return
    let inicioY: number | null = null
    let resolvido = false

    function aoPressionar(evento: PointerEvent) {
      inicioY = evento.clientY
      resolvido = false
    }
    function aoMover(evento: PointerEvent) {
      if (inicioY === null || resolvido) return
      const dy = evento.clientY - inicioY
      if (dy <= -LIMIAR_DESLIZE) {
        resolvido = true
        enviar('pular')
      } else if (dy >= LIMIAR_DESLIZE) {
        resolvido = true
        enviar('abaixar')
      }
    }
    function aoSoltar() {
      if (inicioY !== null && !resolvido) enviar('pular')
      inicioY = null
    }

    elemento.addEventListener('pointerdown', aoPressionar)
    elemento.addEventListener('pointermove', aoMover)
    elemento.addEventListener('pointerup', aoSoltar)
    elemento.addEventListener('pointercancel', aoSoltar)
    return () => {
      elemento.removeEventListener('pointerdown', aoPressionar)
      elemento.removeEventListener('pointermove', aoMover)
      elemento.removeEventListener('pointerup', aoSoltar)
      elemento.removeEventListener('pointercancel', aoSoltar)
    }
  }, [area, enviar])
}
