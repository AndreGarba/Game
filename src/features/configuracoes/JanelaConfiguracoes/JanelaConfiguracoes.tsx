import '@fontsource/luckiest-guy/latin-400.css'
import { useEffect, useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import { assinarMusica, definirMusicaLigada, lerMusicaLigada } from '../../../data/preferencias.ts'
import { IMAGENS_CONFIGURACOES } from '../imagens/index.ts'
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
        <img className="janela-configuracoes__painel" src={IMAGENS_CONFIGURACOES.painel} alt="" draggable={false} />
        <h2 id="janela-configuracoes-titulo" className="janela-configuracoes__titulo">
          {t('configuracoes.titulo')}
        </h2>
        <button className="janela-configuracoes__fechar" onClick={() => history.back()} aria-label={t('configuracoes.fechar')}>
          <img src={IMAGENS_CONFIGURACOES.fechar} alt="" draggable={false} />
        </button>

        <div className="janela-configuracoes__opcao">
          <img
            className="janela-configuracoes__icone"
            src={musica ? IMAGENS_CONFIGURACOES.musicaLigada : IMAGENS_CONFIGURACOES.musicaDesligada}
            alt=""
            draggable={false}
          />
          <span className="janela-configuracoes__rotulo" id="janela-configuracoes-musica">
            {t('configuracoes.musica')}
            <small>{t('configuracoes.musicaDetalhe')}</small>
          </span>
          {/* O estado aparece só na arte (cor do trilho e lado do pino); quem usa leitor de tela ouve o aria-checked. */}
          <button
            className="interruptor"
            role="switch"
            aria-checked={musica}
            aria-labelledby="janela-configuracoes-musica"
            onClick={() => definirMusicaLigada(!musica)}
            autoFocus
          >
            <img className="interruptor__trilho interruptor__trilho--ligado" src={IMAGENS_CONFIGURACOES.trilhoLigado} alt="" draggable={false} />
            <img className="interruptor__trilho interruptor__trilho--desligado" src={IMAGENS_CONFIGURACOES.trilhoDesligado} alt="" draggable={false} />
            <img className="interruptor__pino" src={IMAGENS_CONFIGURACOES.pino} alt="" draggable={false} />
          </button>
        </div>
      </div>
    </div>
  )
}
