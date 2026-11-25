import type { DirecaoTela } from './direcao.ts'

// Fonte única das teclas do RPG: quem lê o teclado (`useControlesRpg`) e quem mostra a tecla no
// botão da tela (teclas escritas no HUD, `aria-keyshortcuts`) partem destas listas. A ordem importa: o botão
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

// Nome curto no botão. Só o Espaço tem nome por idioma; os outros são o que está escrito na tecla.
function nomeNoBotao(codigo: string, espaco: string): string {
  if (codigo === 'Space') return espaco
  if (codigo === 'Escape') return 'Esc'
  return SETAS[codigo] ?? nomeAria(codigo)
}

function semRepetir(nomes: string[]): string[] {
  return [...new Set(nomes)]
}

/** O que o botão mostra com teclado: as primeiras teclas do comando, uma por linha ("Espaço", "E"). */
export function teclasDoComando(comando: ComandoComTecla, espaco: string, quantas = 2): string[] {
  return semRepetir(TECLAS[comando].map((c) => nomeNoBotao(c, espaco))).slice(0, quantas)
}

export type LadoDoDirecional = 'cima' | 'baixo' | 'esquerda' | 'direita'

function ladoDaTecla([eixo, valor]: [keyof DirecaoTela, number]): LadoDoDirecional {
  if (eixo === 'cima') return valor > 0 ? 'cima' : 'baixo'
  return valor > 0 ? 'direita' : 'esquerda'
}

/** Cada lado do direcional com a letra e a seta do teclado, como "W ↑". */
export function teclasDoDirecional(): Record<LadoDoDirecional, string> {
  const porLado: Record<LadoDoDirecional, string[]> = { cima: [], baixo: [], esquerda: [], direita: [] }
  const codigos = Object.keys(TECLAS_DIRECAO).sort((x, y) => Number(x in SETAS) - Number(y in SETAS))
  for (const codigo of codigos) porLado[ladoDaTecla(TECLAS_DIRECAO[codigo]!)].push(SETAS[codigo] ?? nomeAria(codigo))
  return {
    cima: porLado.cima.join(' '),
    baixo: porLado.baixo.join(' '),
    esquerda: porLado.esquerda.join(' '),
    direita: porLado.direita.join(' '),
  }
}

/** O que a tecla aperta no HUD: um comando, um lado do direcional, ou nada. */
export function oQueATeclaAperta(codigo: string): { comando: ComandoComTecla } | { lado: LadoDoDirecional } | null {
  const direcao = TECLAS_DIRECAO[codigo]
  if (direcao) return { lado: ladoDaTecla(direcao) }
  for (const comando of Object.keys(TECLAS) as ComandoComTecla[]) {
    if ((TECLAS[comando] as readonly string[]).includes(codigo)) return { comando }
  }
  return null
}

export function atalhosDoComando(comando: ComandoComTecla): string {
  return semRepetir(TECLAS[comando].map(nomeAria)).join(' ')
}
