// gas-logo.js é o pacote da animação da GAS Games, copiado sem alteração: atualizar = substituir o
// arquivo. Ele se registra em globalThis.GasGamesLogo; este módulo só dá tipo a essa API.
import './gas-logo.js'

export interface AreaLogo {
  x: number
  y: number
  width: number
  height: number
  fit?: 'contain' | 'stretch'
}

export interface LogoGas {
  readonly canvas: HTMLCanvasElement
  readonly duration: number
  readonly elapsed: number
  readonly isPlaying: boolean
  play(opcoes?: { restart?: boolean }): LogoGas
  pause(): LogoGas
  seek(segundos: number): LogoGas
  update(deltaSegundos: number): LogoGas
  render(ctx: CanvasRenderingContext2D, area: AreaLogo): LogoGas
  destroy(): void
}

interface OpcoesLogo {
  speed?: number
  size?: number
  onComplete?: (logo: LogoGas) => void
}

declare global {
  var GasGamesLogo: { create(opcoes?: OpcoesLogo): Promise<LogoGas> }
}

// A faixa de som foi exportada para esta velocidade; mudar uma exige mudar a outra.
export const VELOCIDADE_LOGO = 1.2

export function criarLogoGas(opcoes: Omit<OpcoesLogo, 'speed'>): Promise<LogoGas> {
  return globalThis.GasGamesLogo.create({ ...opcoes, speed: VELOCIDADE_LOGO })
}
