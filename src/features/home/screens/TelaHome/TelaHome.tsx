import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JanelaConfiguracoes } from '../../../configuracoes/JanelaConfiguracoes/JanelaConfiguracoes.tsx'
import { useVoltarNativoEmCamadas } from '../../../navegacao/useVoltarNativoEmCamadas.ts'
import { PainelRanking } from '../../../ranking/PainelRanking.tsx'
import { IMAGENS_HOME } from '../../imagens/index.ts'
import './tela-home.css'

export function TelaHome({ aoJogar }: { aoJogar: () => void }) {
  const { t } = useTranslation()
  const aoJogarRef = useRef(aoJogar)
  aoJogarRef.current = aoJogar
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [efeitosProntos, setEfeitosProntos] = useState(false)
  const [rankingAberto, setRankingAberto] = useState(false)
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false)
  const configuracoesAbertasRef = useRef(false)
  configuracoesAbertasRef.current = configuracoesAbertas
  const botaoConfiguracoesRef = useRef<HTMLButtonElement>(null)

  useVoltarNativoEmCamadas(configuracoesAbertas, () => {
    setConfiguracoesAbertas(false)
    botaoConfiguracoesRef.current?.focus({ preventScroll: true })
  })

  // Espaço/Enter jogam sem precisar de foco no botão: autoFocus desenharia o anel de foco até no toque.
  // Com a janela de configurações aberta, as teclas são dela (Espaço liga e desliga o switch).
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (configuracoesAbertasRef.current) return
      if (evento.code !== 'Space' && evento.code !== 'Enter') return
      // Com foco num botão, a tecla é dele: sem isto, abrir o ranking pelo teclado começaria a partida.
      if (evento.target instanceof Element && evento.target.closest('button')) return
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
      <div className="tela-home__icones">
        <button
          ref={botaoConfiguracoesRef}
          className="tela-home__icone"
          onClick={() => setConfiguracoesAbertas(true)}
          aria-label={t('home.configuracoes')}
          aria-haspopup="dialog"
        >
          <img src={IMAGENS_HOME.iconeConfiguracoes} alt="" draggable={false} />
        </button>
        <button
          className="tela-home__icone"
          onClick={() => setRankingAberto((aberto) => !aberto)}
          aria-label={t('ranking.titulo')}
          aria-expanded={rankingAberto}
        >
          <img src={IMAGENS_HOME.iconeRanking} alt="" draggable={false} />
        </button>
      </div>
      {rankingAberto && <PainelRanking />}
      {configuracoesAbertas && <JanelaConfiguracoes />}
    </div>
  )
}
