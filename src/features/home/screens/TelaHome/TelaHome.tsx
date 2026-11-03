import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IMAGENS_HOME } from '../../imagens/index.ts'
import './tela-home.css'

export function TelaHome({ aoJogar }: { aoJogar: () => void }) {
  const { t } = useTranslation()
  const aoJogarRef = useRef(aoJogar)
  aoJogarRef.current = aoJogar

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

  return (
    <div className="tela-home">
      <img className="tela-home__azulejos" src={IMAGENS_HOME.azulejos} alt="" draggable={false} />
      <img className="tela-home__espuma" src={IMAGENS_HOME.espuma} alt="" draggable={false} />
      <h1 className="tela-home__titulo">
        <img className="tela-home__logo" src={IMAGENS_HOME.logo} alt={t('titulo')} draggable={false} />
      </h1>
      <button className="tela-home__jogar" onClick={aoJogar} aria-label={t('home.jogar')}>
        <img className="tela-home__jogar-sprite" src={IMAGENS_HOME.botoes} alt="" draggable={false} />
      </button>
    </div>
  )
}
