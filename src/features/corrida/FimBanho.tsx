import { useEffect, useRef } from 'react'
import { IMAGENS_FIM } from './imagens/index.ts'

/**
 * Imagem do banho no fim da partida, com bolhas e névoa por cima. Three.js baixa à parte; até lá,
 * e se o aparelho não tiver WebGL, fica só a imagem.
 */
export function FimBanho() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelado = false
    let destruir: (() => void) | undefined
    import('./efeitos/cenaBanho.ts')
      .then(({ criarCenaBanho }) => {
        // O canvas tem um contexto WebGL só: a montagem cancelada do StrictMode não pode criar
        // renderer aqui, senão o destruir dela derruba o contexto da montagem que ficou.
        if (cancelado) return
        destruir = criarCenaBanho(canvas).destruir
      })
      .catch(() => {})
    return () => {
      cancelado = true
      destruir?.()
    }
  }, [])

  return (
    <div className="fim-banho">
      <img className="fim-banho__imagem" src={IMAGENS_FIM.banho} alt="" draggable={false} />
      <canvas ref={canvasRef} className="fim-banho__efeitos" aria-hidden="true" />
    </div>
  )
}
