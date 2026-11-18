import { useEffect, useState } from 'react'

// Selos de tecla nos botões do HUD só para quem tem teclado. Começa pelo aparelho (mouse ou
// trackpad: hover e ponteiro fino) e depois segue o uso: qualquer tecla liga (tablet com teclado),
// um toque na tela desliga (notebook com tela de toque, usado com o dedo). No celular nunca aparece.
const CONSULTA = '(hover: hover) and (pointer: fine)'

export function useTemTeclado(): boolean {
  const [temTeclado, setTemTeclado] = useState(() => typeof matchMedia === 'function' && matchMedia(CONSULTA).matches)

  useEffect(() => {
    const aoTeclar = () => setTemTeclado(true)
    const aoTocar = (evento: PointerEvent) => {
      if (evento.pointerType === 'touch') setTemTeclado(false)
    }
    window.addEventListener('keydown', aoTeclar)
    window.addEventListener('pointerdown', aoTocar)
    return () => {
      window.removeEventListener('keydown', aoTeclar)
      window.removeEventListener('pointerdown', aoTocar)
    }
  }, [])

  return temTeclado
}
