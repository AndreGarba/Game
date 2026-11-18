import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { ELENCO } from '../../../../engine/rpg/index.ts'
import { densidadeDoJogo } from '../../../jogo/densidade.ts'
import { digitando } from '../../../jogo/useControlesJogo.ts'
import { tocarEfeito } from '../../../som/efeitosSonoros.ts'
import { criarVitrine, desenharRetratos } from '../../cena3d/vitrine.ts'
import { urlDaArte } from '../../visual/slotsDeArte.ts'
import './tela-selecao.css'

// Retrato desenhado em 3D quando o slot `retratos/<id>` não tem arquivo (proporção 4 : 5).
const RETRATO_LARGURA = 320
const RETRATO_ALTURA = 400

interface TextosDoPersonagem {
  nome: string
  titulo: string
  descricao: string
}

const TECLAS_ANTERIOR = new Set(['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW'])
const TECLAS_PROXIMO = new Set(['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS'])
const TECLAS_CONFIRMAR = new Set(['Space', 'Enter', 'NumpadEnter', 'KeyE'])
const TECLAS_VOLTAR = new Set(['Escape', 'KeyQ', 'Backspace'])

/**
 * Seleção de personagens, entre a home e o RPG. Setas (ou toque no card) escolhem, A/Enter ou o
 * botão confirmam; B/Esc e o Voltar são `history.back()`: a camada é de quem abriu.
 */
export function TelaSelecao({ aoEscolher }: { aoEscolher: (personagem: string) => void }) {
  const { t } = useTranslation()
  const textos = t('rpg.elenco', { returnObjects: true }) as unknown as Record<string, TextosDoPersonagem>
  const [indice, setIndice] = useState(0)
  const [retratos, setRetratos] = useState<Record<string, string>>({})
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const vitrineRef = useRef<ReturnType<typeof criarVitrine> | null>(null)
  const indiceRef = useRef(indice)
  indiceRef.current = indice
  const aoEscolherRef = useRef(aoEscolher)
  aoEscolherRef.current = aoEscolher
  const escolhido = ELENCO[indice]!

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const vitrine = criarVitrine(canvas)
    vitrineRef.current = vitrine
    const ajustar = () => vitrine.redimensionar(canvas.clientWidth, canvas.clientHeight, densidadeDoJogo())
    ajustar()
    const observador = new ResizeObserver(ajustar)
    observador.observe(canvas)
    vitrine.mostrar(ELENCO[indiceRef.current]!.visual)
    vitrine.ligar()
    const semArte = ELENCO.filter((p) => !urlDaArte('retratos', p.id))
    if (semArte.length > 0) {
      const porVisual = desenharRetratos(
        semArte.map((p) => p.visual),
        RETRATO_LARGURA,
        RETRATO_ALTURA,
      )
      setRetratos(Object.fromEntries(semArte.map((p) => [p.id, porVisual[p.visual]!])))
    }
    return () => {
      observador.disconnect()
      vitrine.destruir()
      vitrineRef.current = null
    }
  }, [])

  useEffect(() => {
    vitrineRef.current?.mostrar(escolhido.visual)
  }, [escolhido.visual])

  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (digitando(evento) || evento.repeat) return
      const emBotao = evento.target instanceof Element && evento.target.closest('button')
      const total = ELENCO.length
      if (TECLAS_ANTERIOR.has(evento.code)) {
        evento.preventDefault()
        setIndice((i) => (i - 1 + total) % total)
      } else if (TECLAS_PROXIMO.has(evento.code)) {
        evento.preventDefault()
        setIndice((i) => (i + 1) % total)
      } else if (TECLAS_CONFIRMAR.has(evento.code) && !emBotao) {
        evento.preventDefault()
        confirmar(indiceRef.current)
      } else if (TECLAS_VOLTAR.has(evento.code)) {
        evento.preventDefault()
        history.back()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  function confirmar(i: number) {
    tocarEfeito('moeda')
    aoEscolherRef.current(ELENCO[i]!.id)
  }

  return (
    <div className="tela-selecao">
      <div className="tela-selecao__palco">
        <canvas ref={canvasRef} className="tela-selecao__vitrine" aria-hidden="true" />
        <div className="tela-selecao__botoes">
          <button className="botao botao--primario botao--grande tela-selecao__confirmar" onClick={() => confirmar(indice)}>
            {t('selecao.confirmar', { nome: textos[escolhido.id]?.nome })}
          </button>
          <button className="botao tela-selecao__voltar" onClick={() => history.back()}>
            {t('selecao.voltar')}
          </button>
        </div>
      </div>
      <div className="tela-selecao__painel">
        <h1 className="tela-selecao__titulo">{t('selecao.titulo')}</h1>
        <p className="tela-selecao__nome">{textos[escolhido.id]?.nome}</p>
        <div className="tela-selecao__cards" role="radiogroup" aria-label={t('selecao.titulo')}>
          {ELENCO.map((p, i) => {
            const imagem = urlDaArte('retratos', p.id) ?? retratos[p.id]
            return (
              <button
                key={p.id}
                className={`tela-selecao__card${i === indice ? ' tela-selecao__card--escolhido' : ''}`}
                role="radio"
                aria-checked={i === indice}
                onClick={() => (i === indice ? confirmar(i) : setIndice(i))}
              >
                <span
                  className="tela-selecao__retrato"
                  style={imagem ? ({ '--imagem': `url(${imagem})` } as CSSProperties) : undefined}
                  aria-hidden="true"
                />
                <span className="tela-selecao__card-nome">{textos[p.id]?.nome}</span>
                <span className="tela-selecao__card-titulo">{textos[p.id]?.titulo}</span>
              </button>
            )
          })}
        </div>
        <div className="tela-selecao__perfil" aria-live="polite">
          <p className="tela-selecao__titulo-personagem">{textos[escolhido.id]?.titulo}</p>
          <p className="tela-selecao__descricao">{textos[escolhido.id]?.descricao}</p>
        </div>
        <p className="tela-selecao__dica">{t('selecao.dica')}</p>
      </div>
    </div>
  )
}
