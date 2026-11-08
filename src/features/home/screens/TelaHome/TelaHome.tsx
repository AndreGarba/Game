import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PainelRanking } from '../../../ranking/PainelRanking.tsx'
import { IMAGENS_HOME } from '../../imagens/index.ts'
import './tela-home.css'

export function TelaHome({ aoJogar }: { aoJogar: () => void }) {
  const { t } = useTranslation()
  const aoJogarRef = useRef(aoJogar)
  aoJogarRef.current = aoJogar
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [efeitosProntos, setEfeitosProntos] = useState(false)

  // Espaço/Enter jogam sem precisar de foco no botão: autoFocus desenharia o anel de foco até no toque.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.code !== 'Space' && evento.code !== 'Enter') return
      evento.preventDefault()
      aoJogarRef.current()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  // Gotas e vapor em WebGL. Three.js baixa à parte; até lá, e se o aparelho não tiver WebGL,
  // ficam as imagens estáticas por baixo do canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cancelamento = new AbortController()
    let destruir: (() => void) | undefined
    import('../../efeitos/cenaAgua.ts')
      .then(({ criarCenaAgua }) => criarCenaAgua(canvas, IMAGENS_HOME, cancelamento.signal))
      .then((cena) => {
        if (cancelamento.signal.aborted) {
          cena.destruir()
          return
        }
        destruir = cena.destruir
        setEfeitosProntos(true)
      })
      .catch(() => {})
    return () => {
      cancelamento.abort()
      destruir?.()
    }
  }, [])

  return (
    <div className="tela-home">
      <img className="tela-home__azulejos" src={IMAGENS_HOME.azulejos} alt="" draggable={false} />
      <img className="tela-home__espuma" src={IMAGENS_HOME.espuma} alt="" draggable={false} />
      <canvas
        ref={canvasRef}
        className={`tela-home__efeitos${efeitosProntos ? ' tela-home__efeitos--prontos' : ''}`}
        aria-hidden="true"
      />
      <h1 className="tela-home__titulo">
        <img className="tela-home__logo" src={IMAGENS_HOME.logo} alt={t('titulo')} draggable={false} />
      </h1>
      <button className="tela-home__jogar" onClick={aoJogar} aria-label={t('home.jogar')}>
        <img className="tela-home__jogar-sprite" src={IMAGENS_HOME.botoes} alt="" draggable={false} />
      </button>
      <PainelRanking />
    </div>
  )
}
