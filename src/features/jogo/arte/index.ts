// Arte do canvas do jogo de exemplo. Jogo novo troca os arquivos e a lista; o carregador fica.
import { artePronta, carregarArte, type Arte, type Folha } from './carregarArte.ts'
import jogador from './jogador.svg'
import moeda from './moeda.svg'

export const FOLHA_JOGADOR: Folha = { quadros: 2 }

const ARTE_DO_JOGO = [jogador, moeda]

export function carregarArteDoJogo(): Promise<void> {
  return carregarArte(ARTE_DO_JOGO)
}

export const spriteJogador = (): Arte | null => artePronta(jogador)
export const spriteMoeda = (): Arte | null => artePronta(moeda)
