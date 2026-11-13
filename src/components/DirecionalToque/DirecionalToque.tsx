import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import './direcional-toque.css'

export interface Direcao8 {
  direita: number
  cima: number
}

interface Props {
  aoMudar: (direcao: Direcao8) => void
  rotulo: string
  // Arte opcional: base do direcional e uma seta apontando para cima (as outras são giradas).
  imagemBase?: string | null
  imagemSeta?: string | null
}

// Fração do raio a partir da qual um eixo liga. Abaixo disso o dedo está no "centro morto";
// com os dois eixos acima, sai a diagonal.
const LIMIAR = 0.33
const PARADO: Direcao8 = { direita: 0, cima: 0 }

/**
 * Direcional de 8 direções para toque. Arrastar o dedo sem soltar troca a direção, como num
 * controle de verdade; o dedo pode sair da área que o direcional continua com ele.
 */
export function DirecionalToque({ aoMudar, rotulo, imagemBase, imagemSeta }: Props) {
  const [atual, setAtual] = useState<Direcao8>(PARADO)
  const dedo = useRef<number | null>(null)

  function atualizar(evento: PointerEvent<HTMLDivElement>) {
    const caixa = evento.currentTarget.getBoundingClientRect()
    const raio = caixa.width / 2
    const nx = (evento.clientX - (caixa.left + raio)) / raio
    const ny = -(evento.clientY - (caixa.top + caixa.height / 2)) / raio
    const nova = {
      direita: nx > LIMIAR ? 1 : nx < -LIMIAR ? -1 : 0,
      cima: ny > LIMIAR ? 1 : ny < -LIMIAR ? -1 : 0,
    }
    if (nova.direita !== atual.direita || nova.cima !== atual.cima) {
      setAtual(nova)
      aoMudar(nova)
    }
  }

  function soltar() {
    dedo.current = null
    setAtual(PARADO)
    aoMudar(PARADO)
  }

  const estilo = {
    ...(imagemBase ? { '--imagem-base': `url(${imagemBase})` } : {}),
    ...(imagemSeta ? { '--imagem-seta': `url(${imagemSeta})` } : {}),
  } as CSSProperties

  return (
    <div
      className={`direcional-toque${imagemBase ? ' direcional-toque--arte' : ''}${imagemSeta ? ' direcional-toque--seta-arte' : ''}`}
      style={estilo}
      role="group"
      aria-label={rotulo}
      onPointerDown={(e) => {
        if (dedo.current !== null) return
        dedo.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        atualizar(e)
      }}
      onPointerMove={(e) => {
        if (dedo.current === e.pointerId) atualizar(e)
      }}
      onPointerUp={(e) => {
        if (dedo.current === e.pointerId) soltar()
      }}
      onPointerCancel={(e) => {
        if (dedo.current === e.pointerId) soltar()
      }}
    >
      {(['cima', 'direita', 'baixo', 'esquerda'] as const).map((lado) => {
        const ligado =
          (lado === 'cima' && atual.cima === 1) ||
          (lado === 'baixo' && atual.cima === -1) ||
          (lado === 'direita' && atual.direita === 1) ||
          (lado === 'esquerda' && atual.direita === -1)
        return (
          <span
            key={lado}
            className={`direcional-toque__seta direcional-toque__seta--${lado}${ligado ? ' direcional-toque__seta--ligada' : ''}`}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )
}
