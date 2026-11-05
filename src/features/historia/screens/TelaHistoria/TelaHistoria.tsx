import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import '@fontsource/luckiest-guy/latin-400.css'
import { IMAGENS_HISTORIA as img } from '../../imagens/index.ts'
import './tela-historia.css'

const TOTAL_QUADROS = 4
// Ritmo de leitura: tempo para o quadro entrar, o balão estourar e dar para ler.
const INTERVALO_MS = 1800
const PRIMEIRO_MS = 300
const TRAVA_FIM_MS = 700
// Medidas do frame Story no Figma.
const LARGURA_PALCO = 780
const ALTURA_PALCO = 360

const movimentoReduzido = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A história em quatro quadros, um de cada vez, como numa página de HQ. Toque adianta o próximo
 * quadro; com todos na tela, toque segue para a corrida. "Pular" vai direto.
 */
export function TelaHistoria({ aoTerminar }: { aoTerminar: () => void }) {
  const { t } = useTranslation()
  const telaRef = useRef<HTMLDivElement>(null)
  const [escala, setEscala] = useState(1)
  const [visiveis, setVisiveis] = useState(() => (movimentoReduzido() ? TOTAL_QUADROS : 0))
  const completa = visiveis >= TOTAL_QUADROS

  // O palco tem o tamanho do Figma e escala inteiro para caber na tela, como uma página de revista.
  useEffect(() => {
    const tela = telaRef.current
    if (!tela) return
    const ajustar = () => setEscala(Math.min(tela.clientWidth / LARGURA_PALCO, tela.clientHeight / ALTURA_PALCO))
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(tela)
    return () => observador.disconnect()
  }, [])

  // Avança sozinho; um toque reinicia a contagem a partir do quadro que apareceu.
  useEffect(() => {
    if (completa) return
    const espera = setTimeout(() => setVisiveis((v) => v + 1), visiveis === 0 ? PRIMEIRO_MS : INTERVALO_MS)
    return () => clearTimeout(espera)
  }, [visiveis, completa])

  // Quem toca rápido para adiantar quadros não pode cair na corrida sem ver o último.
  const completaEmRef = useRef(0)
  useEffect(() => {
    if (completa) completaEmRef.current = performance.now()
  }, [completa])

  const avancar = useCallback(() => {
    if (!completa) setVisiveis((v) => v + 1)
    else if (performance.now() - completaEmRef.current > TRAVA_FIM_MS) aoTerminar()
  }, [completa, aoTerminar])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.code === 'Escape') aoTerminar()
      else if (evento.code === 'Space' || evento.code === 'Enter') avancar()
      else return
      evento.preventDefault()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [avancar, aoTerminar])

  const quadro = (n: number) => `tela-historia__quadro tela-historia__quadro--${n}${visiveis >= n ? ' tela-historia__quadro--visivel' : ''}`

  return (
    <div ref={telaRef} className="tela-historia" onClick={avancar}>
      <div className="tela-historia__palco" style={{ '--escala': escala } as CSSProperties}>
        {/* Coordenadas do Figma: o frame foi desenhado em pé e girado, então a folha também. */}
        <div className="tela-historia__folha">
          <div className={quadro(1)}>
            <div className="tela-historia__arte tela-historia__arte--1">
              <img src={img.quadroDormindo} alt="" draggable={false} />
            </div>
            <div className="tela-historia__balao tela-historia__balao--1">
              <img className="tela-historia__fundo-balao--1" src={img.fundoBalao1} alt="" />
              <img className="tela-historia__imagem-balao--1" src={img.balaoPensamento} alt="" />
              <p className="tela-historia__fala tela-historia__fala--1">{t('historia.sonho')}</p>
            </div>
          </div>

          <div className={quadro(2)}>
            <div className="tela-historia__arte tela-historia__arte--2">
              <img src={img.quadroPorta} alt="" draggable={false} />
            </div>
            <div className="tela-historia__balao tela-historia__balao--2">
              <img className="tela-historia__fundo-balao--2" src={img.fundoBalao2} alt="" />
              <img className="tela-historia__imagem-balao--2" src={img.balaoFala} alt="" />
              <p className="tela-historia__fala tela-historia__fala--2">{t('historia.chamado')}</p>
            </div>
          </div>

          <div className={quadro(3)}>
            <div className="tela-historia__arte tela-historia__arte--3">
              <img src={img.quadroFuga} alt="" draggable={false} />
            </div>
            <div className="tela-historia__balao tela-historia__balao--3">
              <img className="tela-historia__fundo-balao--3" src={img.fundoBalao3} alt="" />
              <img className="tela-historia__imagem-balao--3" src={img.balaoPensamento} alt="" />
              <p className="tela-historia__fala tela-historia__fala--3">{t('historia.recusa')}</p>
            </div>
          </div>

          <div className={quadro(4)}>
            <div className="tela-historia__arte tela-historia__arte--4">
              <img src={img.quadroRua} alt="" draggable={false} />
            </div>
            <div className="tela-historia__balao tela-historia__balao--4">
              <img className="tela-historia__fundo-balao--4" src={img.fundoBalao4} alt="" />
              <img className="tela-historia__imagem-balao--4" src={img.balaoFala} alt="" />
              <p className="tela-historia__fala tela-historia__fala--4">{t('historia.grito')}</p>
            </div>
          </div>

          <img className="tela-historia__divisoria--1" src={img.divisoria1} alt="" />
          <img className="tela-historia__divisoria--2" src={img.divisoria2} alt="" />
        </div>
      </div>

      {completa ? (
        <p className="tela-historia__continuar">{t('historia.continuar')}</p>
      ) : (
        <button
          className="tela-historia__pular"
          onClick={(evento) => {
            evento.stopPropagation()
            aoTerminar()
          }}
        >
          {t('historia.pular')}
        </button>
      )}
    </div>
  )
}
