import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { JanelaConfiguracoes } from '../../../configuracoes/JanelaConfiguracoes/JanelaConfiguracoes.tsx'
import { useCargaDaArte } from '../../../jogo/useCargaDaArte.ts'
import { useVoltarNativoEmCamadas } from '../../../navegacao/useVoltarNativoEmCamadas.ts'
import { PainelRanking } from '../../../ranking/PainelRanking.tsx'
import './tela-home.css'

export function TelaHome({ aoJogar }: { aoJogar: () => void }) {
  const { t } = useTranslation()
  const carga = useCargaDaArte()
  const podeJogar = carga.liberada
  const aoJogarRef = useRef(aoJogar)
  aoJogarRef.current = aoJogar
  const podeJogarRef = useRef(podeJogar)
  podeJogarRef.current = podeJogar
  const [rankingAberto, setRankingAberto] = useState(false)
  const [configuracoesAbertas, setConfiguracoesAbertas] = useState(false)
  const configuracoesAbertasRef = useRef(false)
  configuracoesAbertasRef.current = configuracoesAbertas
  const botaoConfiguracoesRef = useRef<HTMLButtonElement>(null)

  useVoltarNativoEmCamadas(configuracoesAbertas, () => {
    setConfiguracoesAbertas(false)
    botaoConfiguracoesRef.current?.focus({ preventScroll: true })
  })
  useVoltarNativoEmCamadas(rankingAberto, () => setRankingAberto(false))

  // Espaço/Enter jogam sem precisar de foco no botão: autoFocus desenharia o anel de foco até no toque.
  // Com a janela de configurações aberta, as teclas são dela (Espaço liga e desliga o switch).
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (configuracoesAbertasRef.current || !podeJogarRef.current) return
      if (evento.code !== 'Space' && evento.code !== 'Enter') return
      // Com foco num botão, a tecla é dele: sem isto, abrir o ranking pelo teclado começaria a partida.
      if (evento.target instanceof Element && evento.target.closest('button')) return
      evento.preventDefault()
      aoJogarRef.current()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div className="tela-home">
      <div className="tela-home__centro">
        <h1 className="tela-home__titulo">{t('titulo')}</h1>
        <p className="tela-home__subtitulo">{t('subtitulo')}</p>
        <button className="botao botao--primario botao--grande" onClick={aoJogar} disabled={!podeJogar}>
          {podeJogar ? t('home.jogar') : t('home.carregando', { porcento: Math.round(carga.progresso * 100) })}
        </button>
        <p className="tela-home__dica">{t('home.comoJogar')}</p>
      </div>
      <div className="tela-home__icones">
        <button
          ref={botaoConfiguracoesRef}
          className="botao botao--icone"
          onClick={() => setConfiguracoesAbertas(true)}
          aria-label={t('home.configuracoes')}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">⚙</span>
        </button>
        <button
          className="botao botao--icone"
          onClick={() => (rankingAberto ? history.back() : setRankingAberto(true))}
          aria-label={t('ranking.titulo')}
          aria-expanded={rankingAberto}
        >
          <span aria-hidden="true">🏆</span>
        </button>
      </div>
      {rankingAberto && <PainelRanking />}
      {configuracoesAbertas && <JanelaConfiguracoes />}
    </div>
  )
}
