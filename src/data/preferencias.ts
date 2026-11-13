// Preferências do aparelho. Ficam no localStorage, que o backup da casca Android leva para o
// aparelho novo: quem desligou a música não quer ouvir de novo depois de trocar de celular.
import { ID_JOGO } from '../configuracao.ts'

const CHAVE_MUSICA = `${ID_JOGO}:musica`

type Ouvinte = () => void
const ouvintes = new Set<Ouvinte>()

// Modo privado ou armazenamento cheio: a escolha vale só até fechar o jogo.
let musicaSemArmazenamento: boolean | null = null

/** Música começa ligada; só um '0' gravado desliga. Valor estranho conta como ligada. */
export function lerMusicaLigada(): boolean {
  if (musicaSemArmazenamento !== null) return musicaSemArmazenamento
  try {
    return localStorage.getItem(CHAVE_MUSICA) !== '0'
  } catch {
    return true
  }
}

export function definirMusicaLigada(ligada: boolean) {
  try {
    localStorage.setItem(CHAVE_MUSICA, ligada ? '1' : '0')
    musicaSemArmazenamento = null
  } catch {
    musicaSemArmazenamento = ligada
  }
  for (const ouvinte of ouvintes) ouvinte()
}

/**
 * Avisa quando a preferência muda. É o que o tocador da música de fundo vai assinar para parar
 * ou voltar na hora em que o switch muda. Devolve a função que cancela a assinatura.
 */
export function assinarMusica(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
