// Arte da corrida: Figma "Hora do banho", frame 7960:8725, em WebP. Cenário na resolução original;
// peças do HUD recortadas da folha de sprites nas mesmas regiões que o frame usa.
import cachorroCorrendo from './cachorro-correndo.webp'
import calcada from './calcada.webp'
import casas from './casas.webp'
import ceu from './ceu.webp'
import distancia from './hud-distancia.webp'
import pausa from './hud-pausa.webp'
import velocidade from './hud-velocidade.webp'

export const IMAGENS_CENARIO = { ceu, casas, calcada }
export const IMAGENS_HUD = { distancia, velocidade, pausa }

// Folha do cachorro correndo (galope): 10 quadros lado a lado (mínimo para o passo ficar suave), recortados de
// PRD/referencias/cachorro-correndo.png (gerada no ChatGPT com o prompt em
// PRD/referencias/prompt-cachorro-correndo.md) por scripts/sprites/recortar-corrida.py.
// `pes`: pixels entre a pata mais baixa da folha e a base do quadro.
export const SPRITE_CACHORRO_CORRENDO = { quadros: 10, largura: 413, altura: 320, pes: 11 } as const

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
    cachorro = criar(cachorroCorrendo)
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
