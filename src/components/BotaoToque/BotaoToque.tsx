import { useState, type CSSProperties, type ReactNode } from 'react'
import './botao-toque.css'

interface Props {
  // Letra, símbolo ou ícone do botão quando não há arte.
  rotulo: ReactNode
  descricao: string
  aoApertar: () => void
  // Para botão de segurar (correr): chamado quando o dedo sai, cancela ou desliza para fora.
  aoSoltar?: () => void
  variante?: 'primario' | 'secundario' | 'perigo'
  imagem?: string | null
  imagemApertado?: string | null
  // Tecla do computador que faz o mesmo (selo pequeno no canto) e o `aria-keyshortcuts`.
  tecla?: string | null
  atalhos?: string
}

/**
 * Botão redondo de controle. Dispara no pressionar (pointerdown), não no soltar: o click do
 * navegador espera o dedo subir e, no celular, isso atrasa a ação.
 */
export function BotaoToque({ rotulo, descricao, aoApertar, aoSoltar, variante = 'primario', imagem, imagemApertado, tecla, atalhos }: Props) {
  const [apertado, setApertado] = useState(false)
  const soltar = () => {
    if (!apertado) return
    setApertado(false)
    aoSoltar?.()
  }
  const arte = apertado && imagemApertado ? imagemApertado : imagem
  const estilo = (arte ? { '--imagem': `url(${arte})` } : {}) as CSSProperties
  return (
    <button
      type="button"
      className={`botao-toque botao-toque--${variante}${arte ? ' botao-toque--arte' : ''}${apertado ? ' botao-toque--apertado' : ''}`}
      style={estilo}
      aria-label={descricao}
      aria-keyshortcuts={atalhos}
      // Teclado e leitor de tela chegam pelo click; o toque já disparou no pointerdown.
      onClick={(e) => {
        if (e.detail === 0) aoApertar()
      }}
      onPointerDown={(e) => {
        e.preventDefault()
        setApertado(true)
        aoApertar()
      }}
      onPointerUp={soltar}
      onPointerCancel={soltar}
      onPointerLeave={soltar}
    >
      {!arte && <span aria-hidden="true">{rotulo}</span>}
      {tecla && (
        <span className="botao-toque__tecla" aria-hidden="true">
          {tecla}
        </span>
      )}
    </button>
  )
}
