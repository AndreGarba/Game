import { useId } from 'react'
import { COR_CARTAO as C, MARCAS_DO_CARTAO as M } from '../visual/paleta.ts'
import { ARTE_HUD } from '../visual/arteDoHud.ts'
import './cartao-ultrablue.css'

// Cartão Ultra Blue desenhado em SVG (proporção de cartão, 85,6 × 54 mm), enquanto a arte do slot
// `hud/cartao-ultrablue` não chega. Com a arte, a frente vira a imagem.

function Frente() {
  const id = useId()
  return (
    <svg className="cartao-ultrablue__svg" viewBox="0 0 856 540" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.fundoClaro} />
          <stop offset="0.55" stopColor={C.fundo} />
          <stop offset="1" stopColor={C.fundoEscuro} />
        </linearGradient>
        <pattern id={`${id}e`} width="53" height="9" patternUnits="userSpaceOnUse">
          <rect y="0" width="53" height="1.4" fill={C.escovado} />
          <rect x="11" y="4" width="42" height="1.2" fill={C.escovadoEscuro} />
          <rect y="7" width="30" height="1" fill={C.escovado} />
        </pattern>
      </defs>
      <rect width="856" height="540" rx="36" fill={`url(#${id}f)`} />
      <rect width="856" height="540" rx="36" fill={`url(#${id}e)`} />
      <rect x="3" y="3" width="850" height="534" rx="34" fill="none" stroke={C.borda} strokeOpacity="0.45" strokeWidth="4" />
      <text x="88" y="132" fill={C.texto} fontSize="40" fontWeight="600" fontFamily="system-ui, sans-serif">
        {M.produto}
      </text>
      <circle cx="540" cy="118" r="62" fill="none" stroke={C.texto} strokeWidth="4" strokeDasharray="300 90" transform="rotate(200 540 118)" />
      <text x="506" y="140" fill={C.texto} fontSize="66" fontWeight="700" fontFamily="system-ui, sans-serif">
        {M.banco}
        <tspan dx="10" fontSize="52" fontWeight="300">
          {M.bancoResto}
        </tspan>
      </text>
      <rect x="92" y="192" width="118" height="92" rx="16" fill={C.chip} />
      <path d="M92 222h38M92 254h38M172 222h38M172 254h38M130 192v92M172 192v92M130 238h42" stroke={C.chipSombra} strokeWidth="4" fill="none" />
      <path d="M240 214q12 24 0 48M258 204q18 34 0 68M276 194q24 44 0 88" stroke={C.texto} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="660" cy="410" r="62" fill={C.bandeiraEsquerda} />
      <circle cx="742" cy="410" r="62" fill={C.bandeiraDireita} fillOpacity="0.88" />
      <text x="701" y="508" fill={C.texto} fontSize="34" fontWeight="600" textAnchor="middle" fontFamily="system-ui, sans-serif">
        {M.bandeira}
      </text>
    </svg>
  )
}

function Verso() {
  return (
    <svg className="cartao-ultrablue__svg" viewBox="0 0 856 540" aria-hidden="true">
      <rect width="856" height="540" rx="36" fill={C.verso} />
      <rect y="70" width="856" height="96" fill={C.tarja} />
      <rect x="64" y="220" width="520" height="70" rx="8" fill={C.chip} fillOpacity="0.85" />
    </svg>
  )
}

/** O cartão girando no próprio eixo vertical, frente e verso. */
export function CartaoGirando({ classe = '' }: { classe?: string }) {
  return (
    <div className={`cartao-ultrablue ${classe}`} aria-hidden="true">
      <div className="cartao-ultrablue__giro">
        <div className="cartao-ultrablue__face">
          {ARTE_HUD.cartaoUltrablue ? <img className="cartao-ultrablue__svg" src={ARTE_HUD.cartaoUltrablue} alt="" /> : <Frente />}
        </div>
        <div className="cartao-ultrablue__face cartao-ultrablue__face--verso">
          <Verso />
        </div>
      </div>
    </div>
  )
}

/** Ícone do contador: o cartão deitado em perspectiva isométrica, com chip e bandeira. */
export function IconeCartao() {
  const id = useId()
  return (
    <svg className="icone-cartao" viewBox="0 0 32 24" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.fundoClaro} />
          <stop offset="1" stopColor={C.fundoEscuro} />
        </linearGradient>
      </defs>
      <path d="M2 12 L16 4 L30 12 L16 20 Z" fill={C.fundoEscuro} transform="translate(0 2)" />
      <path d="M2 12 L16 4 L30 12 L16 20 Z" fill={`url(#${id})`} stroke={C.borda} strokeWidth="0.8" />
      <path d="M9 11.2 L12 9.5 L14.6 11 L11.6 12.7 Z" fill={C.chip} />
      <circle cx="21.2" cy="14.2" r="1.6" fill={C.bandeiraEsquerda} />
      <circle cx="23" cy="13.2" r="1.6" fill={C.bandeiraDireita} fillOpacity="0.88" />
    </svg>
  )
}
