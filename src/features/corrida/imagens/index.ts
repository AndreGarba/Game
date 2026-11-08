// Arte da corrida. Cenário da cidade em 7 camadas de parallax, geradas por IA a partir da
// referência de arte do jogo e preparadas por `scripts/arte/preparar_camada.py` (recorte, emenda
// horizontal e WebP). Peças do HUD vêm do Figma "Hora do banho", frame 7960:8725.
import cachorroCorrendo from './cachorro-correndo.webp'
import cachorroSlide from './cachorro-slide.webp'
import ceu from './cidade/ceu.webp'
import skyline from './cidade/skyline.webp'
import bairro from './cidade/bairro.webp'
import casas from './cidade/casas.webp'
import muro from './cidade/muro.webp'
import piso from './cidade/piso.webp'
import pista from './cidade/pista.webp'
import sequenciasCasas from './cidade/casas/trechos.json'
import dadosMuro from './cidade/muro/muro.json'
import distancia from './hud-distancia.webp'
import pausa from './hud-pausa.webp'
import fimBanho from './fim-banho.webp'
import fimBotao from './fim-botao.webp'
import fimOsso from './fim-osso.webp'
import fimOssoOuro from './fim-osso-ouro.webp'
import fimPainel from './fim-painel.webp'
import fimSelo from './fim-selo.webp'
import tutorCorrendo from './tutor-correndo.webp'
import tutorPulando from './tutor-pulando.webp'
import velocidade from './hud-velocidade.webp'

export const IMAGENS_HUD = { distancia, velocidade, pausa }

// Fim de partida: peças sem texto (a copy vem dos locales), geradas no ChatGPT com os selos do
// HUD como referência de estilo. Folha original em PRD/referencias/fim-hud.png. O banho (metade
// esquerda da tela de fim) vem de PRD/referencias/fim-banho.webp, reduzido para 960 de largura.
export const IMAGENS_FIM = { banho: fimBanho, painel: fimPainel, botao: fimBotao, osso: fimOsso, ossoOuro: fimOssoOuro, selo: fimSelo }

// Sprites dos objetos da pista, gerados na mesma conversa de IA das camadas. O nome do arquivo
// é o `visual` do elemento do motor (ou o tipo, nos coletáveis): arquivo novo em `objetos/` já
// entra no jogo, e visual sem arquivo continua em vetor. Sólidos são esticados na caixa de
// colisão, então a proporção da arte tem que acompanhar a do molde.
const ARQUIVOS_OBJETOS = import.meta.glob<string>('./objetos/*.webp', { eager: true, import: 'default' })
const APELIDOS: Record<string, string> = { osso: 'moeda-osso', ossoOuro: 'moeda-osso-ouro', lago: 'agua', rio: 'agua' }
// Peças soltas por nome de arquivo (sem extensão), de uma pasta.
function pecasDaPasta(arquivos: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(arquivos).map(([caminho, src]) => [caminho.replace(/^.*\/|\.webp$/g, ''), src]))
}

// Muro: painéis e conexões de `scripts/arte/montar_muro.py`, todos no mesmo canvas de altura.
// A regra de montagem (repetição e conexão na troca) fica em desenharCena.ts.
const PECAS_MURO = pecasDaPasta(import.meta.glob<string>('./cidade/muro/*.webp', { eager: true, import: 'default' }))
const MONTAGEM_MURO: MontagemMuro<string> = {
  tipo: 'muro',
  repetem: dadosMuro.repetem.map((p) => PECAS_MURO[`painel-${p}`]!),
  destaques: dadosMuro.destaques.map((p) => PECAS_MURO[`painel-${p}`]!),
  conexoes: dadosMuro.conexoes.map((c) => PECAS_MURO[`conexao-${c}`]!),
  repeticao: dadosMuro.repeticao,
  chanceDestaque: dadosMuro.chanceDestaque,
}

// Casas: uma construção por trecho (`scripts/arte/montar_casas.py`), mais a tira original, que
// tem as árvores entre as casas.
const PECAS_CASAS = { ...pecasDaPasta(import.meta.glob<string>('./cidade/casas/*.webp', { eager: true, import: 'default' })), original: casas }
const MONTAGEM_CASAS: MontagemTrechos<string> = {
  tipo: 'trechos',
  trechos: sequenciasCasas.trechos.map((pecas) => pecas.map((p) => PECAS_CASAS[p as keyof typeof PECAS_CASAS]!)),
}

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
   * Peças que se alternam no lugar de repetir `src`, todas desenhadas com a altura da camada.
   * `src` fica para enquanto elas carregam.
   */
  montagem?: Montagem<string>
}

/** Sorteia trechos prontos (cada um uma lista de peças lado a lado). */
export interface MontagemTrechos<T> {
  tipo: 'trechos'
  trechos: readonly (readonly T[])[]
}
/**
 * Muro: os painéis de textura (`repetem`) se repetem lado a lado de `repeticao.min` a
 * `repeticao.max` vezes, sem conexão no meio. Os de destaque aparecem sozinhos, uma vez, com chance
 * `chanceDestaque` a cada troca (nunca dois seguidos). Toda troca de painel leva uma conexão.
 */
export interface MontagemMuro<T> {
  tipo: 'muro'
  repetem: readonly T[]
  destaques: readonly T[]
  conexoes: readonly T[]
  repeticao: { min: number; max: number }
  chanceDestaque: number
}
export type Montagem<T> = MontagemTrechos<T> | MontagemMuro<T>

// Escala das camadas de frente em relação à referência de arte: muro (com as conexões) e casas
// 1,5× maiores, como pediu o André, mantendo a base de cada uma no lugar.
const ESCALA_MURO = 1.5
const ESCALA_CASAS = 1.5
// Na arte original o muro tem 260 px = 80 unidades do quadro, com a base em 243. O canvas das
// peças novas tem a altura do pilar mais a folga dos enfeites (lâmpada, vaso, bola) em cima.
const ALTURA_MURO = ((80 * dadosMuro.alturaCanvas) / 260) * ESCALA_MURO
const ALTURA_CASAS = 195 * ESCALA_CASAS

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
  { src: casas, parallax: PLANO_CASAS, topo: 240 - ALTURA_CASAS, altura: ALTURA_CASAS, montagem: MONTAGEM_CASAS },
  // Medidas da referência de arte (quadro de 360): o muro fica recuado, com a base em 242; entre
  // ele e o meio-fio corre o piso da calçada (242 a 260), onde o cachorro pisa (252); o meio-fio
  // começa em 260 e a terra embaixo dele.
  { src: muro, parallax: PLANO_FRENTE, topo: 243 - ALTURA_MURO, altura: ALTURA_MURO, montagem: MONTAGEM_MURO },
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

// Folha do cachorro abaixado, em slide: 6 quadros (2 descendo, 4 deslizando em loop), gerada no
// ChatGPT a partir de PRD/referencias/cachorro-slide-referencia.png e recortada pelo mesmo script
// (`--quadros-minimos 6 --alfa-fundo 215`: a folha veio com um véu branco em alfa 180-196).
// `pes` medido na barriga/patas opacas (o script contou um halo quase invisível embaixo, 8 px, e o
// cachorro flutuava); 32 = 28 do contato real + 4 para o corpo encostar no chão.
export const SPRITE_CACHORRO_SLIDE = { quadros: 6, largura: 505, altura: 320, pes: 32 } as const

// Folha do tutor correndo: 10 quadros (a arte veio numa grade 5×2, lida linha por linha),
// recortados de PRD/referencias/tutor-correndo.webp pelo mesmo script.
export const SPRITE_TUTOR_CORRENDO = { quadros: 10, largura: 292, altura: 400, pes: 6 } as const

// Folha do tutor pulando: 10 quadros, do ar até ficar em pé (PRD/referencias/tutor-pulando.webp),
// recortados com `--pes-no-rodape`: a altura do pulo vem do motor, não da arte.
export const SPRITE_TUTOR_PULANDO = { quadros: 10, largura: 228, altura: 400, pes: 6 } as const

let arte: HTMLImageElement[] | null = null
let sprites: Map<string, HTMLImageElement> | null = null
let cachorro: HTMLImageElement | null = null
let slide: HTMLImageElement | null = null
let tutor: HTMLImageElement | null = null
let tutorPulo: HTMLImageElement | null = null
// Montagem de cada camada já com as imagens, no mesmo índice de CAMADAS_CIDADE. A mesma peça é
// uma imagem só, reaproveitada onde aparecer.
let montagens: (Montagem<HTMLImageElement> | null)[] | null = null

function criar(src: string) {
  const imagem = new Image()
  imagem.src = src
  return imagem
}

/** Cria as imagens uma vez; chamar cedo (na abertura) faz a corrida já abrir com a arte pronta. */
export function preCarregarImagensCenario(): HTMLImageElement[] {
  if (!arte) {
    arte = CAMADAS_CIDADE.map((c) => criar(c.src))
    const cache = new Map<string, HTMLImageElement>()
    const imagem = (src: string) => cache.get(src) ?? cache.set(src, criar(src)).get(src)!
    montagens = CAMADAS_CIDADE.map((c): Montagem<HTMLImageElement> | null => {
      const m = c.montagem
      if (!m) return null
      if (m.tipo === 'trechos') return { tipo: 'trechos', trechos: m.trechos.map((pecas) => pecas.map(imagem)) }
      return {
        ...m,
        repetem: m.repetem.map(imagem),
        destaques: m.destaques.map(imagem),
        conexoes: m.conexoes.map(imagem),
      }
    })
    sprites = new Map(Object.entries(SPRITES_OBJETOS).map(([nome, src]) => [nome, criar(src)]))
    Object.values(IMAGENS_HUD).forEach(criar)
    Object.values(IMAGENS_FIM).forEach(criar)
    cachorro = criar(cachorroCorrendo)
    slide = criar(cachorroSlide)
    tutor = criar(tutorCorrendo)
    tutorPulo = criar(tutorPulando)
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

/** A folha do slide, ou null enquanto não carregou (aí o abaixar achata o quadro do galope). */
export function spriteSlidePronto(): HTMLImageElement | null {
  preCarregarImagensCenario()
  return pronta(slide)
}

/** A folha do pulo do tutor, ou null enquanto não carregou (aí ele pula com um quadro da corrida). */
export function spriteTutorPuloPronto(): HTMLImageElement | null {
  preCarregarImagensCenario()
  return pronta(tutorPulo)
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

/** Montagem da camada `i` com todas as peças carregadas, ou null (aí ela repete a imagem única). */
export function montagemDaCamada(i: number): Montagem<HTMLImageElement> | null {
  preCarregarImagensCenario()
  const m = montagens?.[i]
  if (!m) return null
  const pecas = m.tipo === 'trechos' ? m.trechos.flat() : [...m.repetem, ...m.destaques, ...m.conexoes]
  return pecas.every((p) => p.complete && p.naturalWidth > 0) ? m : null
}

/** Sprite do objeto, ou null se não houver arte para ele (ou se ainda não carregou): vale o vetor. */
export function spriteObjeto(nome: string): HTMLImageElement | null {
  preCarregarImagensCenario()
  const imagem = sprites?.get(APELIDOS[nome] ?? nome)
  return imagem && imagem.complete && imagem.naturalWidth > 0 ? imagem : null
}
