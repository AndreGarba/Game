// Arte da corrida: Figma "Hora do banho", frame 7960:8725, em WebP. Cenário na resolução original;
// peças do HUD recortadas da folha de sprites nas mesmas regiões que o frame usa.
import cachorroAndando from './cachorro-andando.webp'
import calcada from './calcada.webp'
import casas from './casas.webp'
import ceu from './ceu.webp'
import distancia from './hud-distancia.webp'
import pausa from './hud-pausa.webp'
import velocidade from './hud-velocidade.webp'

export const IMAGENS_CENARIO = { ceu, casas, calcada }
export const IMAGENS_HUD = { distancia, velocidade, pausa }

// Folha do cachorro andando: 5 quadros lado a lado, recortados de
// PRD/referencias/cachorro-andando.webp por scripts/sprites/recortar-cachorro.py. Em cada
// quadro as patas encostam na base e o focinho na borda direita (4 px de margem).
export const SPRITE_CACHORRO_ANDANDO = { quadros: 5, largura: 409, altura: 307, margem: 4 } as const

type ArteCenario = Record<keyof typeof IMAGENS_CENARIO, HTMLImageElement>

let arte: ArteCenario | null = null
let cachorro: HTMLImageElement | null = null

function criar(src: string) {
  const imagem = new Image()
  imagem.src = src
  return imagem
}

/** Cria as imagens uma vez; chamar cedo (na abertura) faz a corrida já abrir com a arte pronta. */
export function preCarregarImagensCenario(): ArteCenario {
  if (!arte) {
    arte = { ceu: criar(ceu), casas: criar(casas), calcada: criar(calcada) }
    Object.values(IMAGENS_HUD).forEach(criar)
    cachorro = criar(cachorroAndando)
  }
  return arte
}

/** A folha do cachorro, ou null enquanto não carregou (o canvas desenha o cachorro vetorial). */
export function spriteCachorroPronto(): HTMLImageElement | null {
  preCarregarImagensCenario()
  return cachorro && cachorro.complete && cachorro.naturalWidth > 0 ? cachorro : null
}

/** As três camadas, ou null enquanto alguma não carregou (o canvas desenha o cenário vetorial). */
export function arteCenarioPronta(): ArteCenario | null {
  const a = preCarregarImagensCenario()
  return a.ceu.complete && a.casas.complete && a.calcada.complete && a.ceu.naturalWidth > 0 ? a : null
}
