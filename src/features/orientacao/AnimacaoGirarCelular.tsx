import { useEffect, useRef, useState } from 'react'

// Só celular em pé precisa do aviso: no computador e no tablet deitado a pista já cabe.
const CONSULTA_RETRATO = '(orientation: portrait) and (pointer: coarse)'

// Quadro em que a seta já está desenhada e o celular está no meio do giro: sozinho, explica o gesto.
const QUADRO_PARADO = 36

export function retratoNoToque() {
  return typeof matchMedia === 'function' && matchMedia(CONSULTA_RETRATO).matches
}

export function useRetratoNoToque() {
  const [retrato, setRetrato] = useState(retratoNoToque)
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

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
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
  }, [])

  return <div ref={containerRef} className={className} aria-hidden="true" />
}
