// Arte da corrida. Cenário da cidade em 7 camadas de parallax, geradas por IA a partir da
// referência de arte do jogo e preparadas por `scripts/arte/preparar_camada.py` (recorte, emenda
// horizontal e WebP). Peças do HUD vêm do Figma "Hora do banho", frame 7960:8725.
import cachorroCorrendo from './cachorro-correndo.webp'
import ceu from './cidade/ceu.webp'
import skyline from './cidade/skyline.webp'
import bairro from './cidade/bairro.webp'
import casas from './cidade/casas.webp'
import muro from './cidade/muro.webp'
import piso from './cidade/piso.webp'
import pista from './cidade/pista.webp'
import distancia from './hud-distancia.webp'
import pausa from './hud-pausa.webp'
import tutorCorrendo from './tutor-correndo.webp'
import velocidade from './hud-velocidade.webp'

export const IMAGENS_HUD = { distancia, velocidade, pausa }

// Sprites dos objetos da pista, gerados na mesma conversa de IA das camadas. O nome do arquivo
// é o `visual` do elemento do motor (ou o tipo, nos coletáveis): arquivo novo em `objetos/` já
// entra no jogo, e visual sem arquivo continua em vetor. Sólidos são esticados na caixa de
// colisão, então a proporção da arte tem que acompanhar a do molde.
const ARQUIVOS_OBJETOS = import.meta.glob<string>('./objetos/*.webp', { eager: true, import: 'default' })
const APELIDOS: Record<string, string> = { osso: 'moeda-osso', ossoOuro: 'moeda-osso-ouro', lago: 'agua', rio: 'agua' }
// Trechos do muro, montados por `scripts/arte/montar_muro.py` (pilar da arte original + painéis
// antigos e novos). Ordem pelo nome: o sorteio da pista depende do índice.
const ARQUIVOS_TRECHOS_MURO = import.meta.glob<string>('./cidade/muro-trecho-*.webp', { eager: true, import: 'default' })
const TRECHOS_MURO = Object.keys(ARQUIVOS_TRECHOS_MURO)
  .sort()
  .map((caminho) => ARQUIVOS_TRECHOS_MURO[caminho]!)

const SPRITES_OBJETOS: Record<string, string> = Object.fromEntries(
  Object.entries(ARQUIVOS_OBJETOS).map(([caminho, src]) => [caminho.replace(/^.*\/|\.webp$/g, ''), src]),
)

/**
 * Uma camada do falso 3D. Geometria em unidades de um quadro de 360 de altura, com o chão (onde o
 * cachorro pisa) em `LINHA_CHAO`: a escala real sai da posição do chão na tela.
 */
export interface Camada {
  src: string
  /** 0 = parada, 1 = presa ao mundo do motor. */
  parallax: number
  /** Topo da arte no quadro de 360. */
  topo: number
  altura: number
  /**
   * Trechos que se alternam no lugar de repetir `src` (o muro). Cada um começa num pilar e
   * termina num painel, então emendam em qualquer ordem. `src` fica para enquanto carregam.
   */
  trechos?: readonly string[]
}

export const LINHA_CHAO = 252
// Onde começa o piso da calçada (base do muro): rio e buraco cortam a partir daqui.
export const LINHA_PISO = 242
export const FRAME_ALTURA = 360

// Do fundo para a frente, em 4 planos de movimento: fundo (céu + skyline), bairro, casas e frente
// (muro + pista). A frente anda com parallax 1, junto com a linha de corrida do motor e os
// obstáculos; os outros planos só dão profundidade.
const PLANO_FUNDO = 0.1
const PLANO_BAIRRO = 0.25
const PLANO_CASAS = 0.5
const PLANO_FRENTE = 1

export const CAMADAS_CIDADE: readonly Camada[] = [
  { src: ceu, parallax: PLANO_FUNDO, topo: 0, altura: 360 },
  { src: skyline, parallax: PLANO_FUNDO, topo: 16, altura: 180 },
  { src: bairro, parallax: PLANO_BAIRRO, topo: 62, altura: 122 },
  { src: casas, parallax: PLANO_CASAS, topo: 45, altura: 195 },
  // Medidas da referência de arte (quadro de 360): o muro fica recuado, com a base em 242; entre
  // ele e o meio-fio corre o piso da calçada (242 a 260), onde o cachorro pisa (252); o meio-fio
  // começa em 260 e a terra embaixo dele.
  { src: muro, parallax: PLANO_FRENTE, topo: 163, altura: 80, trechos: TRECHOS_MURO },
  // O piso tem tufos de grama no fundo: a faixa de laje começa a 36% da arte.
  { src: piso, parallax: PLANO_FRENTE, topo: 232, altura: 28 },
  // A borda de cima do meio-fio fica a 10,7% da arte (os tufos de grama ficam acima dela).
  { src: pista, parallax: PLANO_FRENTE, topo: 247, altura: 125 },
]

// Folha do cachorro correndo (galope): 10 quadros lado a lado (mínimo para o passo ficar suave), recortados de
// PRD/referencias/cachorro-correndo.png (gerada no ChatGPT com o prompt em
// PRD/referencias/prompt-cachorro-correndo.md) por scripts/sprites/recortar-corrida.py.
// `pes`: pixels entre a pata mais baixa da folha e a base do quadro.
export const SPRITE_CACHORRO_CORRENDO = { quadros: 10, largura: 415, altura: 320, pes: 11 } as const

// Folha do tutor correndo: 10 quadros (a arte veio numa grade 5×2, lida linha por linha),
// recortados de PRD/referencias/tutor-correndo.webp pelo mesmo script.
export const SPRITE_TUTOR_CORRENDO = { quadros: 10, largura: 292, altura: 400, pes: 6 } as const

let arte: HTMLImageElement[] | null = null
let sprites: Map<string, HTMLImageElement> | null = null
let cachorro: HTMLImageElement | null = null
let tutor: HTMLImageElement | null = null
// Imagens dos trechos de cada camada que tem `trechos`, no mesmo índice de CAMADAS_CIDADE.
let trechos: (HTMLImageElement[] | null)[] | null = null

function criar(src: string) {
  const imagem = new Image()
  imagem.src = src
  return imagem
}

/** Cria as imagens uma vez; chamar cedo (na abertura) faz a corrida já abrir com a arte pronta. */
export function preCarregarImagensCenario(): HTMLImageElement[] {
  if (!arte) {
    arte = CAMADAS_CIDADE.map((c) => criar(c.src))
    trechos = CAMADAS_CIDADE.map((c) => (c.trechos ? c.trechos.map(criar) : null))
    sprites = new Map(Object.entries(SPRITES_OBJETOS).map(([nome, src]) => [nome, criar(src)]))
    Object.values(IMAGENS_HUD).forEach(criar)
    cachorro = criar(cachorroCorrendo)
    tutor = criar(tutorCorrendo)
  }
  return arte
}

function pronta(imagem: HTMLImageElement | null) {
  return imagem && imagem.complete && imagem.naturalWidth > 0 ? imagem : null
}

/** A folha do cachorro, ou null enquanto não carregou (o canvas desenha o cachorro vetorial). */
export function spriteCachorroPronto(): HTMLImageElement | null {
  preCarregarImagensCenario()
  return pronta(cachorro)
}

/** A folha do tutor, ou null enquanto não carregou (o canvas desenha o tutor vetorial). */
export function spriteTutorPronto(): HTMLImageElement | null {
  preCarregarImagensCenario()
  return pronta(tutor)
}

/** As camadas, ou null enquanto alguma não carregou (o canvas desenha o cenário vetorial). */
export function arteCenarioPronta(): HTMLImageElement[] | null {
  const a = preCarregarImagensCenario()
  return a.every((i) => i.complete && i.naturalWidth > 0) ? a : null
}

/** Trechos da camada `i` já carregados, ou null (aí ela repete a imagem única). */
export function trechosDaCamada(i: number): HTMLImageElement[] | null {
  preCarregarImagensCenario()
  const lista = trechos?.[i]
  return lista && lista.length > 0 && lista.every((t) => t.complete && t.naturalWidth > 0) ? lista : null
}

/** Sprite do objeto, ou null se não houver arte para ele (ou se ainda não carregou): vale o vetor. */
export function spriteObjeto(nome: string): HTMLImageElement | null {
  preCarregarImagensCenario()
  const imagem = sprites?.get(APELIDOS[nome] ?? nome)
  return imagem && imagem.complete && imagem.naturalWidth > 0 ? imagem : null
}
