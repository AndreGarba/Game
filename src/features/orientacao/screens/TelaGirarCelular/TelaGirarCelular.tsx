import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimacaoGirarCelular, useRetratoNoToque } from '../../AnimacaoGirarCelular.tsx'
import './tela-girar-celular.css'

/** Pede para deitar o celular. Girar avança sozinho; o jogo também funciona em pé, então dá para seguir assim. */
export function TelaGirarCelular({ aoTerminar }: { aoTerminar: () => void }) {
  const { t } = useTranslation()
  const retrato = useRetratoNoToque()
  const aoTerminarRef = useRef(aoTerminar)
  aoTerminarRef.current = aoTerminar

  useEffect(() => {
    if (!retrato) aoTerminarRef.current()
  }, [retrato])

  return (
    <div className="tela-girar-celular">
      <AnimacaoGirarCelular className="tela-girar-celular__animacao" />
      <h1 className="tela-girar-celular__titulo">{t('orientacao.titulo')}</h1>
      <p className="tela-girar-celular__texto">{t('orientacao.texto')}</p>
      <button className="tela-girar-celular__botao" onClick={aoTerminar}>
        {t('orientacao.continuarEmPe')}
      </button>
    </div>
  )
}
