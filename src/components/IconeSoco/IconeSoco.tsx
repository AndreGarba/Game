import './icone-soco.css'

/** Punho fechado visto de frente (quatro nós dos dedos sobre a mão e o polegar), na cor do texto. */
export function IconeSoco() {
  return (
    <svg className="icone-soco" viewBox="0 0 24 24" width="1.4em" height="1.4em" fill="currentColor" aria-hidden="true">
      <rect x="4" y="5" width="3.8" height="7" rx="1.9" />
      <rect x="8.2" y="4" width="3.8" height="8" rx="1.9" />
      <rect x="12.4" y="4.4" width="3.8" height="7.6" rx="1.9" />
      <rect x="16.6" y="5.6" width="3.6" height="6.6" rx="1.8" />
      <path d="M4 10.6h16.2v3.5c0 3.6-2.9 6.4-6.4 6.4h-3.6C6.8 20.5 4 17.6 4 14.1z" />
      <path className="icone-soco__polegar" d="M5.4 12.4h7.4a1.8 1.8 0 0 1 0 3.6H8" />
    </svg>
  )
}
