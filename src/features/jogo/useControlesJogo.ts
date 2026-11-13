import { useEffect, type RefObject } from 'react'
import type { Acao } from '../../engine/index.ts'

// Teclas → ações do motor. Jogo novo com mais ações acrescenta aqui e no toque abaixo.
const TECLAS: Record<string, Acao> = {
  Space: 'pular',
  ArrowUp: 'pular',
  KeyW: 'pular',
}

// Campo de texto com foco (nome do ranking): Espaço e W são letras, não pulo.
export function digitando(evento: KeyboardEvent): boolean {
  const alvo = evento.target
  return alvo instanceof HTMLElement && (alvo.isContentEditable || alvo.matches('input, textarea, select'))
}

// Teclado na janela inteira; toque e mouse só sobre a área do jogo. A ação sai no pressionar, não
// no soltar: em velocidade alta, 100 ms decidem a batida.
export function useControlesJogo(area: RefObject<HTMLElement | null>, enviar: (acao: Acao) => void): void {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const acao = TECLAS[evento.code]
      if (!acao || evento.repeat || digitando(evento)) return
      evento.preventDefault()
      enviar(acao)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [enviar])

  useEffect(() => {
    const elemento = area.current
    if (!elemento) return
    const aoPressionar = () => enviar('pular')
    elemento.addEventListener('pointerdown', aoPressionar)
    return () => elemento.removeEventListener('pointerdown', aoPressionar)
  }, [area, enviar])
}
