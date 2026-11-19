import type { DirecaoTela } from './direcao.ts'

// Fonte única das teclas do RPG: quem lê o teclado (`useControlesRpg`) e quem mostra a tecla no
// botão da tela (selos do HUD, `aria-keyshortcuts`) partem destas listas. A ordem importa: o selo
// mostra as primeiras.

export const TECLAS_DIRECAO: Record<string, [eixo: keyof DirecaoTela, valor: number]> = {
  ArrowUp: ['cima', 1],
  ArrowLeft: ['direita', -1],
  ArrowDown: ['cima', -1],
  ArrowRight: ['direita', 1],
  KeyW: ['cima', 1],
  KeyA: ['direita', -1],
  KeyS: ['cima', -1],
  KeyD: ['direita', 1],
}

export const TECLAS = {
  a: ['Space', 'KeyE', 'Enter', 'NumpadEnter'],
  b: ['Escape', 'KeyQ', 'Backspace'],
  correr: ['ShiftLeft', 'ShiftRight'],
  soco: ['KeyF', 'KeyJ'],
  trocar: ['KeyC'],
  chute: ['KeyR'],
} as const satisfies Record<string, readonly string[]>

export type ComandoComTecla = keyof typeof TECLAS

const SETAS: Record<string, string> = { ArrowUp: '↑', ArrowLeft: '←', ArrowDown: '↓', ArrowRight: '→' }

// Nome da tecla como o `aria-keyshortcuts` espera (sem lado: Shift, Enter).
function nomeAria(codigo: string): string {
  if (codigo.startsWith('Key')) return codigo.slice(3)
  if (codigo.startsWith('Shift')) return 'Shift'
  if (codigo === 'NumpadEnter') return 'Enter'
  return codigo
}

// Nome curto no selo. Só o Espaço tem nome por idioma; os outros são o que está escrito na tecla.
function nomeNoSelo(codigo: string, espaco: string): string {
  if (codigo === 'Space') return espaco
  if (codigo === 'Escape') return 'Esc'
  return SETAS[codigo] ?? nomeAria(codigo)
}

function semRepetir(nomes: string[]): string[] {
  return [...new Set(nomes)]
}

/** Texto do selo: as duas primeiras teclas do comando, como "Espaço / E". */
export function seloDoComando(comando: ComandoComTecla, espaco: string, quantas = 2): string {
  return semRepetir(TECLAS[comando].map((c) => nomeNoSelo(c, espaco)))
    .slice(0, quantas)
    .join(' / ')
}

/** Selo do direcional: as setas juntas e as letras juntas, "↑←↓→ / WASD". */
export function seloDoDirecional(): string {
  const codigos = Object.keys(TECLAS_DIRECAO)
  const setas = codigos.filter((c) => SETAS[c]).map((c) => SETAS[c])
  const letras = codigos.filter((c) => !SETAS[c]).map((c) => nomeAria(c))
  return `${setas.join('')} / ${letras.join('')}`
}

export function atalhosDoComando(comando: ComandoComTecla): string {
  return semRepetir(TECLAS[comando].map(nomeAria)).join(' ')
}
