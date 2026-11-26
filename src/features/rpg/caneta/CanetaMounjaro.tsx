import { useId } from 'react'
import { COR_CANETA as C } from '../visual/paleta.ts'
import './caneta-mounjaro.css'

// Caneta de Mounjaro deitada, em SVG: tampa à esquerda, faixa da dose, janelinha do remédio e o
// botão roxo na ponta de trás. Só desenho do aviso; o nome vem da copy (`rpg.caneta.nome`).
function Desenho() {
  const id = useId()
  return (
    <svg className="caneta-mounjaro__svg" viewBox="0 0 320 80" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.brilho} />
          <stop offset="0.45" stopColor={C.corpo} />
          <stop offset="1" stopColor={C.sombra} />
        </linearGradient>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.sombra} />
          <stop offset="1" stopColor={C.tampa} />
        </linearGradient>
      </defs>
      <rect x="6" y="14" width="78" height="52" rx="18" fill={`url(#${id}t)`} stroke={C.contorno} strokeWidth="3" />
      <rect x="76" y="10" width="196" height="60" rx="22" fill={`url(#${id}c)`} stroke={C.contorno} strokeWidth="3" />
      <rect x="92" y="10" width="16" height="60" fill={C.faixa} />
      <rect x="124" y="26" width="70" height="28" rx="10" fill={C.janela} stroke={C.contorno} strokeWidth="2.5" />
      <rect x="132" y="31" width="34" height="6" rx="3" fill={C.brilho} fillOpacity="0.7" />
      <rect x="264" y="20" width="22" height="40" rx="8" fill={C.sombra} stroke={C.contorno} strokeWidth="3" />
      <rect x="282" y="26" width="30" height="28" rx="10" fill={C.botao} stroke={C.contorno} strokeWidth="3" />
    </svg>
  )
}

/** A caneta balançando com mola, como o cartão girando no aviso de achado. */
export function CanetaBalancando({ classe = '' }: { classe?: string }) {
  return (
    <div className={`caneta-mounjaro ${classe}`} aria-hidden="true">
      <div className="caneta-mounjaro__balanco">
        <Desenho />
      </div>
    </div>
  )
}
