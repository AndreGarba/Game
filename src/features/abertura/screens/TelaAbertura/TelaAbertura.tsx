import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { LogoGas } from '../../logoGas/index.ts'
import urlSom from '../../logoGas/gas-logo-som.mp3'
import './tela-abertura.css'

// Uma aba que volta do segundo plano entrega um delta enorme; sem teto, a abertura pularia para o fim.
const DELTA_MAX = 0.1
// Com movimento reduzido, mostra só o logo pronto, por este tempo.
const ESPERA_MOVIMENTO_REDUZIDO_MS = 1500

const toqueNaTela = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches

/**
 * A animação é quadrada. Em vez de tarja, as margens repetem a última coluna (ou linha) de pixels
 * da borda do quadrado: o fundo muda de cor e ganha brilho ao longo da abertura, e assim a emenda
 * acompanha cada quadro.
 */
function desenharQuadro(ctx: CanvasRenderingContext2D, logo: LogoGas, largura: number, altura: number) {
  const fonte = logo.canvas
  const tamanho = fonte.width
  const lado = Math.min(largura, altura)
  const x = (largura - lado) / 2
  const y = (altura - lado) / 2
  if (largura > altura) {
    ctx.drawImage(fonte, 0, 0, 1, tamanho, 0, 0, x + 1, altura)
    ctx.drawImage(fonte, tamanho - 1, 0, 1, tamanho, x + lado - 1, 0, x + 1, altura)
  } else if (altura > largura) {
    ctx.drawImage(fonte, 0, 0, tamanho, 1, 0, 0, largura, y + 1)
    ctx.drawImage(fonte, 0, tamanho - 1, tamanho, 1, 0, y + lado - 1, largura, y + 1)
  }
  logo.render(ctx, { x, y, width: lado, height: lado })
}

export function TelaAbertura({ aoTerminar }: { aoTerminar: () => void }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aoTerminarRef = useRef(aoTerminar)
  aoTerminarRef.current = aoTerminar
  const pularRef = useRef<() => void>(() => {})

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let encerrado = false
    let logo: LogoGas | null = null
    let quadro = 0
    let anterior: number | null = null
    let espera: ReturnType<typeof setTimeout> | undefined
    const som = new Audio(urlSom)

    const encerrar = () => {
      if (encerrado) return
      encerrado = true
      som.pause()
      aoTerminarRef.current()
    }
    pularRef.current = encerrar

    let largura = 0
    let altura = 0
    const ajustarTamanho = () => {
      const dpr = window.devicePixelRatio || 1
      largura = canvas.clientWidth
      altura = canvas.clientHeight
      canvas.width = Math.round(largura * dpr)
      canvas.height = Math.round(altura * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    ajustarTamanho()
    const observador = new ResizeObserver(ajustarTamanho)
    observador.observe(canvas)

    const laco = (agora: number) => {
      if (!logo) return
      const delta = anterior === null ? 0 : Math.min(DELTA_MAX, (agora - anterior) / 1000)
      anterior = agora
      logo.update(delta)
      if (encerrado) return
      desenharQuadro(ctx, logo, largura, altura)
      quadro = requestAnimationFrame(laco)
    }

    // Resolução interna pelo lado do quadrado na tela: celular não precisa desenhar 1080 px.
    const dpr = window.devicePixelRatio || 1
    const tamanho = Math.max(360, Math.min(1080, Math.round(Math.min(largura, altura) * dpr)))

    import('../../logoGas/index.ts')
      .then(({ criarLogoGas }) => criarLogoGas({ size: tamanho, onComplete: encerrar }))
      .then((criado) => {
        if (encerrado) {
          criado.destroy()
          return
        }
        logo = criado
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
          logo.seek(logo.duration)
          desenharQuadro(ctx, logo, largura, altura)
          espera = setTimeout(encerrar, ESPERA_MOVIMENTO_REDUZIDO_MS)
          return
        }
        logo.play()
        // Sem toque anterior, o navegador costuma bloquear o som: a abertura segue muda.
        som.play().catch(() => {})
        quadro = requestAnimationFrame(laco)
      })
      // Abertura quebrada não pode segurar o jogo.
      .catch(encerrar)

    const aoMudarVisibilidade = () => {
      anterior = null
      if (document.hidden) som.pause()
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    window.addEventListener('keydown', encerrar)

    return () => {
      encerrado = true
      cancelAnimationFrame(quadro)
      clearTimeout(espera)
      observador.disconnect()
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      window.removeEventListener('keydown', encerrar)
      som.pause()
      logo?.destroy()
    }
  }, [])

  return (
    <div className="tela-abertura">
      <canvas
        ref={canvasRef}
        className="tela-abertura__canvas"
        role="img"
        aria-label={t('abertura.marca')}
        onPointerUp={() => pularRef.current()}
      />
      <p className="tela-abertura__pular">{toqueNaTela ? t('abertura.pularToque') : t('abertura.pularTeclado')}</p>
    </div>
  )
}
