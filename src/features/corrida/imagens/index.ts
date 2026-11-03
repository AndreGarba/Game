// Arte do cenário: Figma "Hora do banho", frame 7960:8725. Mesma resolução, em WebP.
import calcada from './calcada.webp'
import casas from './casas.webp'
import ceu from './ceu.webp'

export const IMAGENS_CENARIO = { ceu, casas, calcada }

type ArteCenario = Record<keyof typeof IMAGENS_CENARIO, HTMLImageElement>

let arte: ArteCenario | null = null

/** Cria as imagens uma vez; chamar cedo (na abertura) faz a corrida já abrir com a arte pronta. */
export function preCarregarImagensCenario(): ArteCenario {
  if (!arte) {
    const criar = (src: string) => {
      const imagem = new Image()
      imagem.src = src
      return imagem
    }
    arte = { ceu: criar(ceu), casas: criar(casas), calcada: criar(calcada) }
  }
  return arte
}

/** As três camadas, ou null enquanto alguma não carregou (o canvas desenha o cenário vetorial). */
export function arteCenarioPronta(): ArteCenario | null {
  const a = preCarregarImagensCenario()
  return a.ceu.complete && a.casas.complete && a.calcada.complete && a.ceu.naturalWidth > 0 ? a : null
}
