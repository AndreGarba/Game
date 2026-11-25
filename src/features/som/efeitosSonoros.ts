import { obterContextoAudio } from './contextoAudio.ts'

/*
 * Efeitos do jogo de exemplo, sintetizados com um oscilador. Não seguem o switch da música:
 * desligar a música não emudece o jogo. Jogo novo troca por arquivos decodificados com
 * `decodificar` (contextoAudio.ts), baixados antes da partida.
 */
export type Efeito = 'pulo' | 'moeda' | 'fim' | 'teleporte' | 'buzina'

interface Bipe {
  tipo: OscillatorType
  de: number
  para: number
  duracao: number
  volume: number
}

const BIPES: Record<Efeito, Bipe> = {
  pulo: { tipo: 'square', de: 330, para: 660, duracao: 0.12, volume: 0.08 },
  moeda: { tipo: 'triangle', de: 990, para: 1320, duracao: 0.09, volume: 0.15 },
  fim: { tipo: 'sawtooth', de: 220, para: 70, duracao: 0.45, volume: 0.12 },
  teleporte: { tipo: 'sine', de: 180, para: 1800, duracao: 0.5, volume: 0.14 },
  buzina: { tipo: 'square', de: 420, para: 390, duracao: 0.28, volume: 0.07 },
}

export function tocarEfeito(efeito: Efeito) {
  const ctx = obterContextoAudio()
  if (!ctx || ctx.state !== 'running') return
  const { tipo, de, para, duracao, volume } = BIPES[efeito]
  const agora = ctx.currentTime
  const oscilador = ctx.createOscillator()
  const ganho = ctx.createGain()
  oscilador.type = tipo
  oscilador.frequency.setValueAtTime(de, agora)
  oscilador.frequency.exponentialRampToValueAtTime(para, agora + duracao)
  ganho.gain.setValueAtTime(volume, agora)
  ganho.gain.exponentialRampToValueAtTime(0.0001, agora + duracao)
  oscilador.connect(ganho).connect(ctx.destination)
  oscilador.start(agora)
  oscilador.stop(agora + duracao + 0.02)
}
