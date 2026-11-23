import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { localeAtual } from '../../../i18n/index.ts'
import { slidesDoQuadro, type SlideDasEntregas } from './slidesDasEntregas.ts'
import './modal-entregas.css'

interface ItemEntrega {
  titulo: string
  texto: string
}

interface ConteudoDoQuadro {
  local: string
  // Lista de { titulo, texto } nos três idiomas, para quadro sem imagem.
  itens?: ItemEntrega[]
  // Texto alternativo de cada slide, pelo nome do arquivo sem extensão.
  slides?: Record<string, string>
}

/**
 * Modal "Entregas 2026" de um quadro de avisos, na tela toda. Quadro com imagens em
 * `arte/entregas/<id>/` mostra os slides; senão, os `itens` de `rpg.entregas.quadros.<id>`; sem
 * nenhum dos dois, o aviso de conteúdo provisório (lista vazia no JSON não serve: vira `never[]`
 * no tipo das chaves e estoura o typecheck).
 * Fechar é `history.back()`: a camada do voltar nativo é quem fecha o quadro no mundo.
 */
export function ModalEntregas({ quadro }: { quadro: string }) {
  const { t } = useTranslation()
  const quadros = t('rpg.entregas.quadros', { returnObjects: true }) as unknown as Record<string, ConteudoDoQuadro>
  const conteudo = quadros[quadro]
  const itens = Array.isArray(conteudo?.itens) ? conteudo.itens : []
  const slides = slidesDoQuadro(quadro)

  let corpo
  if (slides.length > 0) corpo = <Slides slides={slides} textos={conteudo?.slides ?? {}} />
  else if (itens.length > 0) {
    corpo = (
      <ul className="modal-entregas__itens">
        {itens.map((item, i) => (
          <li key={i} className="modal-entregas__item">
            <h3 className="modal-entregas__item-titulo">{item.titulo}</h3>
            <p className="modal-entregas__item-texto">{item.texto}</p>
          </li>
        ))}
      </ul>
    )
  } else corpo = <p className="modal-entregas__provisorio">{t('rpg.entregas.provisorio')}</p>

  return (
    <div className={`modal-entregas${slides.length > 0 ? ' modal-entregas--slides' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-entregas-titulo">
      <header className="modal-entregas__topo">
        <div className="modal-entregas__cabecalho">
          <h2 id="modal-entregas-titulo" className="modal-entregas__titulo">
            {t('rpg.entregas.titulo')}
          </h2>
          {conteudo?.local && <p className="modal-entregas__local">{conteudo.local}</p>}
        </div>
        <button className="botao botao--icone modal-entregas__fechar" onClick={() => history.back()} aria-label={t('rpg.entregas.fechar')} autoFocus>
          ✕
        </button>
      </header>
      <div className={`modal-entregas__quadro${slides.length > 0 ? ' modal-entregas__quadro--slides' : ''}`}>{corpo}</div>
    </div>
  )
}

// Um slide por vez, na largura toda: a trilha rola na horizontal com encaixe por slide (arrastar
// no toque), e as setas da tela e ← → do teclado andam um de cada vez.
function Slides({ slides, textos }: { slides: SlideDasEntregas[]; textos: Record<string, string> }) {
  const { t } = useTranslation()
  const trilhaRef = useRef<HTMLDivElement>(null)
  const [atual, setAtual] = useState(0)
  const total = slides.length
  const numero = (n: number) => n.toLocaleString(localeAtual())

  const irPara = (i: number) => {
    const trilha = trilhaRef.current
    if (!trilha) return
    const destino = Math.max(0, Math.min(total - 1, i))
    const suave = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    trilha.scrollTo({ left: destino * trilha.clientWidth, behavior: suave ? 'smooth' : 'auto' })
  }
  const irParaRef = useRef(irPara)
  irParaRef.current = irPara
  const atualRef = useRef(atual)
  atualRef.current = atual

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') irParaRef.current(atualRef.current + 1)
      else if (e.key === 'ArrowLeft') irParaRef.current(atualRef.current - 1)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [])

  const aoRolar = () => {
    const trilha = trilhaRef.current
    if (trilha && trilha.clientWidth > 0) setAtual(Math.round(trilha.scrollLeft / trilha.clientWidth))
  }

  return (
    <div className="modal-entregas__slides" aria-roledescription={t('rpg.entregas.carrossel')}>
      <div ref={trilhaRef} className="modal-entregas__trilha" onScroll={aoRolar}>
        {slides.map((s, i) => (
          <figure
            key={s.nome}
            className="modal-entregas__slide"
            role="group"
            aria-roledescription={t('rpg.entregas.slide')}
            aria-label={t('rpg.entregas.posicao', { atual: numero(i + 1), total: numero(total) })}
          >
            <img className="modal-entregas__imagem" src={s.url} alt={textos[s.nome] ?? ''} decoding="async" draggable={false} />
          </figure>
        ))}
      </div>
      {total > 1 && (
        <>
          <button
            className="botao botao--icone modal-entregas__seta modal-entregas__seta--anterior"
            onClick={() => irPara(atual - 1)}
            disabled={atual === 0}
            aria-label={t('rpg.entregas.anterior')}
          >
            ‹
          </button>
          <button
            className="botao botao--icone modal-entregas__seta modal-entregas__seta--proximo"
            onClick={() => irPara(atual + 1)}
            disabled={atual === total - 1}
            aria-label={t('rpg.entregas.proximo')}
          >
            ›
          </button>
          <div className="modal-entregas__pontos">
            {slides.map((s, i) => (
              <button
                key={s.nome}
                className={`modal-entregas__ponto${i === atual ? ' modal-entregas__ponto--atual' : ''}`}
                onClick={() => irPara(i)}
                aria-label={t('rpg.entregas.posicao', { atual: numero(i + 1), total: numero(total) })}
                aria-current={i === atual}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
