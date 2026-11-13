import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { assinarMusica, definirMusicaLigada, lerMusicaLigada } from '../../../data/preferencias.ts'
import './janela-configuracoes.css'

/**
 * Janela de configurações, por cima da tela que a abriu. Quem abre cuida do voltar nativo
 * (`useVoltarNativoEmCamadas`); daqui, fechar é sempre `history.back()`.
 */
export function JanelaConfiguracoes() {
  const { t } = useTranslation()
  const musica = useSyncExternalStore(assinarMusica, lerMusicaLigada)

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== 'Escape') return
      evento.preventDefault()
      history.back()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  return (
    <div className="janela-configuracoes__veu" onClick={(e) => e.target === e.currentTarget && history.back()}>
      <div className="janela-configuracoes" role="dialog" aria-modal="true" aria-labelledby="janela-configuracoes-titulo">
        <h2 id="janela-configuracoes-titulo" className="janela-configuracoes__titulo">
          {t('configuracoes.titulo')}
        </h2>
        <button className="botao botao--icone janela-configuracoes__fechar" onClick={() => history.back()} aria-label={t('configuracoes.fechar')}>
          <span aria-hidden="true">✕</span>
        </button>

        <div className="janela-configuracoes__opcao">
          <span className="janela-configuracoes__rotulo" id="janela-configuracoes-musica">
            {t('configuracoes.musica')}
            <small>{t('configuracoes.musicaDetalhe')}</small>
          </span>
          <button
            className="interruptor"
            role="switch"
            aria-checked={musica}
            aria-labelledby="janela-configuracoes-musica"
            onClick={() => definirMusicaLigada(!musica)}
            autoFocus
          >
            <span className="interruptor__pino" />
          </button>
        </div>
      </div>
    </div>
  )
}
