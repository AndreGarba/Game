import { useState, type CSSProperties, type ReactNode } from 'react'
import './botao-toque.css'

interface Props {
  // Letra, símbolo ou ícone do botão quando não há arte nem teclas.
  rotulo: ReactNode
  descricao: string
  aoApertar: () => void
  // Para botão de segurar (correr): chamado quando o dedo sai, cancela ou desliza para fora.
  aoSoltar?: () => void
  variante?: 'primario' | 'secundario' | 'perigo'
  imagem?: string | null
  imagemApertado?: string | null
  // Teclas do computador que fazem o mesmo, uma por linha. Com elas, o botão mostra só as teclas,
  // no lugar do rótulo e da arte (a arte traz a letra do toque desenhada).
  teclas?: string[] | null
  atalhos?: string
}

/**
 * Botão redondo de controle. Dispara no pressionar (pointerdown), não no soltar: o click do
 * navegador espera o dedo subir e, no celular, isso atrasa a ação.
 */
export function BotaoToque({ rotulo, descricao, aoApertar, aoSoltar, variante = 'primario', imagem, imagemApertado, teclas, atalhos }: Props) {
  const [apertado, setApertado] = useState(false)
  const soltar = () => {
    if (!apertado) return
    setApertado(false)
    aoSoltar?.()
  }
  const comTeclas = !!teclas && teclas.length > 0
  const arte = comTeclas ? null : apertado && imagemApertado ? imagemApertado : imagem
  const estilo = (arte ? { '--imagem': `url(${arte})` } : {}) as CSSProperties
  return (
    <button
      type="button"
      className={`botao-toque botao-toque--${variante}${arte ? ' botao-toque--arte' : ''}${apertado ? ' botao-toque--apertado' : ''}${comTeclas ? ' botao-toque--teclas' : ''}`}
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
      {comTeclas ? (
        <span className="botao-toque__teclas" aria-hidden="true">
          {teclas.map((tecla) => (
            <span key={tecla}>{tecla}</span>
          ))}
        </span>
      ) : (
        !arte && <span aria-hidden="true">{rotulo}</span>
      )}
    </button>
  )
}
