import { useEffect, useRef, useState } from 'react'

// Mesma condição do CSS que mostra o aviso: só celular em pé precisa da animação.
const CONSULTA_RETRATO = '(orientation: portrait) and (pointer: coarse)'

// Quadro em que a seta já está desenhada e o celular está no meio do giro: sozinho, explica o gesto.
const QUADRO_PARADO = 36

function useRetratoNoToque() {
  const [retrato, setRetrato] = useState(() => typeof matchMedia === 'function' && matchMedia(CONSULTA_RETRATO).matches)
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const consulta = matchMedia(CONSULTA_RETRATO)
    const aoMudar = () => setRetrato(consulta.matches)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])
  return retrato
}

export function AnimacaoGirarCelular({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const retrato = useRetratoNoToque()

  useEffect(() => {
    const container = containerRef.current
    if (!retrato || !container) return
    let cancelado = false
    let destruir: (() => void) | undefined

    // Import dinâmico: o player só baixa no aparelho que vai mostrar o aviso, fora do bundle inicial.
    void Promise.all([import('lottie-web/build/player/lottie_light'), import('./animacoes/girar-celular.json')]).then(
      ([{ default: lottie }, { default: dados }]) => {
        if (cancelado) return
        const movimentoReduzido = matchMedia('(prefers-reduced-motion: reduce)').matches
        const animacao = lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: !movimentoReduzido,
          animationData: dados,
        })
        if (movimentoReduzido) animacao.goToAndStop(QUADRO_PARADO, true)
        destruir = () => animacao.destroy()
      },
    )

    return () => {
      cancelado = true
      destruir?.()
    }
  }, [retrato])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
