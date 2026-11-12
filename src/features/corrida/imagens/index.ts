// Arte da corrida. Cenário da cidade em 7 camadas de parallax, geradas por IA a partir da
// referência de arte do jogo e preparadas por `scripts/arte/preparar_camada.py` (recorte, emenda
// horizontal e WebP). Parque, bairro japonês e beco abandonado têm 5 camadas cada, geradas no
// ChatGPT com a cena da cidade (PRD/referencias/cena-cidade.jpg) como referência de estilo; os
// pedidos estão em PRD/referencias/cenarios/prompts.md. Peças do HUD vêm do Figma "Hora do banho",
// frame 7960:8725.
import type { IdCenario } from '../../../engine/index.ts'
import { fracaoDaArteNaTela } from '../densidade.ts'
import cachorroCorrendo from './cachorro-correndo.webp'
import cachorroSlide from './cachorro-slide.webp'
import ceu from './cidade/ceu.webp'
import skyline from './cidade/skyline.webp'
import bairro from './cidade/bairro.webp'
import casas from './cidade/casas.webp'
import muro from './cidade/muro.webp'
import piso from './cidade/piso.webp'
import pista from './cidade/pista.webp'
import parqueFundo from './parque/fundo.webp'
import parqueMeio from './parque/meio.webp'
import parquePerto from './parque/perto.webp'
import parqueFrente from './parque/frente.webp'
import parqueChao from './parque/chao.webp'
import japaoFundo from './japao/fundo.webp'
import japaoMeio from './japao/meio.webp'
import japaoPerto from './japao/perto.webp'
import japaoFrente from './japao/frente.webp'
import japaoChao from './japao/chao.webp'
import becoFundo from './beco/fundo.webp'
import becoMeio from './beco/meio.webp'
import becoPerto from './beco/perto.webp'
import becoFrente from './beco/frente.webp'
import becoChao from './beco/chao.webp'
import sequenciasCasas from './cidade/casas/trechos.json'
import dadosMuro from './cidade/muro/muro.json'
import distancia from './hud-distancia.webp'
import pausa from './hud-pausa.webp'
// Feito da arte de pausa, com o triângulo no lugar das barras: o mesmo selo nos dois estados.
import continuar from './hud-continuar.webp'
import moedas from './hud-moedas.webp'
import fimBanho from './fim-banho.webp'
import fimBotao from './fim-botao.webp'
import fimOsso from './fim-osso.webp'
import fimOssoOuro from './fim-osso-ouro.webp'
import fimPainel from './fim-painel.webp'
import fimSelo from './fim-selo.webp'
import tutorCorrendo from './tutor-correndo.webp'
import tutorPulando from './tutor-pulando.webp'
import tutorDeslizando from './tutor-slide.webp'
import velocidade from './hud-velocidade.webp'

// O selo de moedas veio do ChatGPT, sem texto, com os outros dois selos como referência; a folha
// original está em PRD/referencias/selo-moedas.png.
export const IMAGENS_HUD = { distancia, velocidade, moedas, pausa, continuar }

// Fim de partida: peças sem texto (a copy vem dos locales), geradas no ChatGPT com os selos do
// HUD como referência de estilo. Folha original em PRD/referencias/fim-hud.png. O banho (metade
// esquerda da tela de fim) vem de PRD/referencias/fim-banho.webp, reduzido para 960 de largura.
export const IMAGENS_FIM = { banho: fimBanho, painel: fimPainel, botao: fimBotao, osso: fimOsso, ossoOuro: fimOssoOuro, selo: fimSelo }

// Sprites dos objetos da pista, gerados na mesma conversa de IA das camadas. O nome do arquivo
// é o `visual` do elemento do motor (ou o tipo, nos coletáveis): arquivo novo em `objetos/` já
// entra no jogo, e visual sem arquivo continua em vetor. Sólidos são esticados na caixa de
// colisão, então a proporção da arte tem que acompanhar a do molde. Os obstáculos de parque,
// bairro japonês e beco vieram em folhas de 6 (PRD/referencias/cenarios/*-objetos.webp), separadas
// por `scripts/arte/recortar_grade.py`.
const ARQUIVOS_OBJETOS = import.meta.glob<string>('./objetos/*.webp', { eager: true, import: 'default' })
const APELIDOS: Record<string, string> = { osso: 'moeda-osso', ossoOuro: 'moeda-osso-ouro' }
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
// tem as árvores entre as casas. A tira foi desenhada para emendar nela mesma, com a casa amarela
// dividida entre as duas pontas: `scripts/arte/montar_casas_original.py` junta a casa, porque no
// sorteio cada ponta encosta em outra construção.
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

const CAMADAS_CIDADE: readonly Camada[] = [
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

// Cenários novos: 5 camadas. `fundo` é opaco (céu e horizonte numa imagem só); `meio`, `perto` e
// `frente` têm a base alinhada com a da cidade (o piso começa em LINHA_PISO); `chao` junta piso e
// terra. Em cada chão, `topo` põe a primeira linha cheia do piso em 241 (a arte tem tufos acima
// dela) e `altura` deixa a faixa onde o cachorro pisa com uns 21 de espessura, como a calçada.
function camadasDe(
  arte: { fundo: string; meio: string; perto: string; frente: string; chao: string },
  medidas: { fundo?: { topo: number; altura: number }; meio: number; perto: number; frente: number; chao: number; tufos: number },
): readonly Camada[] {
  return [
    { src: arte.fundo, parallax: PLANO_FUNDO, topo: 0, altura: 360, ...medidas.fundo },
    { src: arte.meio, parallax: PLANO_BAIRRO, topo: 236 - medidas.meio, altura: medidas.meio },
    { src: arte.perto, parallax: PLANO_CASAS, topo: 244 - medidas.perto, altura: medidas.perto },
    { src: arte.frente, parallax: PLANO_FRENTE, topo: 243 - medidas.frente, altura: medidas.frente },
    { src: arte.chao, parallax: PLANO_FRENTE, topo: 241 - medidas.tufos * medidas.chao, altura: medidas.chao },
  ]
}

/** Camadas de cada cenário, do fundo para a frente (parallax nunca diminui ao longo da lista). */
export const CAMADAS_POR_CENARIO: Record<IdCenario, readonly Camada[]> = {
  cidade: CAMADAS_CIDADE,
  parque: camadasDe(
    { fundo: parqueFundo, meio: parqueMeio, perto: parquePerto, frente: parqueFrente, chao: parqueChao },
    { meio: 120, perto: 250, frente: 80, chao: 145, tufos: 25 / 380 },
  ),
  bairroJapones: camadasDe(
    { fundo: japaoFundo, meio: japaoMeio, perto: japaoPerto, frente: japaoFrente, chao: japaoChao },
    // O fundo sobe e as casas de perto encolhem para o monte e o pagode aparecerem por cima dos telhados.
    { fundo: { topo: -90, altura: 400 }, meio: 110, perto: 205, frente: 125, chao: 142, tufos: 16 / 380 },
  ),
  becoAbandonado: camadasDe(
    { fundo: becoFundo, meio: becoMeio, perto: becoPerto, frente: becoFrente, chao: becoChao },
    { meio: 130, perto: 250, frente: 160, chao: 135, tufos: 29 / 380 },
  ),
}
const CENARIOS = Object.keys(CAMADAS_POR_CENARIO) as IdCenario[]

// Folha do cachorro correndo (galope): 10 quadros lado a lado (mínimo para o passo ficar suave),
// renderizados do modelo 3D (Meshy, a partir de PRD/referencias/cachorro-3d-vistas.webp) com o galope
// animado no Blender: PRD/referencias/cachorro-3d/cachorro-3d-galope.blend. O quadro 8 é o voo.
// `pes`: pixels entre a pata mais baixa da folha e a base do quadro.
export const SPRITE_CACHORRO_CORRENDO = { quadros: 10, largura: 361, altura: 320, pes: 11 } as const

// Folha do cachorro abaixado, em slide: 6 quadros (2 descendo, 4 deslizando em loop), gerada no
// ChatGPT a partir de PRD/referencias/cachorro-slide-referencia.png e recortada pelo mesmo script
// (`--quadros-minimos 6 --alfa-fundo 215`: a folha veio com um véu branco em alfa 180-196).
// `pes` medido na barriga/patas opacas (o script contou um halo quase invisível embaixo, 8 px, e o
// cachorro flutuava); 32 = 28 do contato real + 4 para o corpo encostar no chão.
export const SPRITE_CACHORRO_SLIDE = { quadros: 6, largura: 505, altura: 320, pes: 32 } as const

// Folha do tutor correndo: 10 quadros (a arte veio numa grade 5×2, lida linha por linha),
// recortados de PRD/referencias/tutor-correndo.webp pelo mesmo script.
export const SPRITE_TUTOR_CORRENDO = { quadros: 10, largura: 292, altura: 400, pes: 6 } as const

// Folha do tutor pulando: 10 quadros, do último passo ao tropeço depois do pouso, gerada no ChatGPT
// (PRD/referencias/tutor-pulo-correndo.png) e recortada com `--pes-no-rodape`: a altura do pulo vem do motor, não da arte.
export const SPRITE_TUTOR_PULANDO = { quadros: 10, largura: 348, altura: 400, pes: 6 } as const

// Folha do tutor abaixado, em slide: 6 quadros (2 descendo, 4 deslizando em loop), gerada no ChatGPT
// (PRD/referencias/tutor-slide.png) e recortada com `--quadros-minimos 6 --pes-no-rodape`.
export const SPRITE_TUTOR_SLIDE = { quadros: 6, largura: 482, altura: 400, pes: 6 } as const

/** Uma folha de quadros lado a lado, com as medidas do arquivo. */
export interface Folha {
  quadros: number
  largura: number
  altura: number
}

/**
 * Desenha o quadro `indice` da folha. A imagem pode ter sido decodificada menor que o arquivo
 * (`decodificar`), então o recorte sai do tamanho real dela, não das medidas da folha.
 */
export function desenharQuadroDaFolha(
  ctx: CanvasRenderingContext2D,
  sprite: Arte,
  folha: Folha,
  indice: number,
  x: number,
  y: number,
  l: number,
  a: number,
) {
  const largura = sprite.width / folha.quadros
  ctx.drawImage(sprite, indice * largura, 0, largura, sprite.height, x, y, l, a)
}

// Folhas com mais resolução do que a tela mostra, em fração do arquivo (com uma folga de ~20%).
// O cachorro: quadro de 320 px para 1,45 m (galope) e 1,13 m (slide), e a 720 px de altura de
// tela a 7 m por altura, 1,45 m são 149 px e 1,13 m são 116 px. A folha do galope antiga (4150 px
// de largura) também passava do lado máximo de textura.
const ESCALA_UTIL = new Map<string, number>([
  [cachorroCorrendo, 0.55],
  [cachorroSlide, 0.45],
])

/**
 * Uma imagem pronta para o canvas. `ImageBitmap` já está decodificado; o elemento `<img>` só é
 * decodificado no primeiro `drawImage`, dentro do quadro (medido: até 22 ms por imagem no desktop,
 * mais que um quadro inteiro), e `img.decode()` não muda isso para canvas. O elemento fica só
 * como reserva, para navegador sem `createImageBitmap` ou falha de rede. Os dois têm `width` e
 * `height` (num `<img>` fora do DOM, são o tamanho natural).
 */
export type Arte = ImageBitmap | HTMLImageElement

interface ArteCarregada {
  cenarios: Record<IdCenario, Arte[] | null>
  // Montagem de cada camada, no mesmo índice das camadas do cenário. A mesma peça é uma imagem
  // só, reaproveitada onde aparecer.
  montagens: Record<IdCenario, (Montagem<Arte> | null)[]>
  sprites: Map<string, Arte>
  cachorro: Arte | null
  slide: Arte | null
  tutor: Arte | null
  tutorPulo: Arte | null
  tutorSlide: Arte | null
}

let carregada: ArteCarregada | null = null
let carga: Promise<void> | null = null
let total = 0
let feitas = 0
let liberada = false
const ouvintes = new Set<() => void>()
// Rede travada não pode prender o jogador na história: passado isto a corrida abre do mesmo jeito,
// com o cenário vetorial até a arte chegar.
const ESPERA_MAXIMA_MS = 15_000

function avisar() {
  for (const ouvinte of ouvintes) ouvinte()
}

function comoElemento(src: string): Promise<Arte | null> {
  return new Promise((resolver) => {
    const imagem = new Image()
    imagem.onload = () => resolver(imagem)
    imagem.onerror = () => resolver(null)
    imagem.src = src
  })
}

// Lado máximo de textura em muitas placas de vídeo de celular Android. Acima disso o navegador
// desenha a imagem pelo processador ou em pedaços, a cada quadro.
const LADO_MAX_TEXTURA = 4096
// Reduzir menos que isto não economiza o bastante para valer a perda de nitidez.
const REDUCAO_MINIMA = 0.95

// Decodifica fora do quadro: createImageBitmap trabalha em outra thread. Já decodifica no tamanho
// em que a imagem aparece neste aparelho (`fracaoDaArteNaTela` × `escalaUtil`): 98 MB de arte
// decodificada a 2× não cabem folgados na memória de vídeo de um celular médio, e o navegador
// passa a descartar e reenviar textura no meio da corrida. Quem desenha mede pelo tamanho real da
// imagem (proporção, ou `desenharQuadroDaFolha`), nunca pelo tamanho do arquivo.
async function decodificar(src: string, escalaUtil = 1): Promise<Arte | null> {
  let arte: Arte | null = null
  try {
    if (typeof createImageBitmap === 'function') {
      const inteira = await createImageBitmap(await (await fetch(src)).blob())
      arte = inteira
      const lado = Math.max(inteira.width, inteira.height)
      const fator = Math.min(1, fracaoDaArteNaTela() * escalaUtil, LADO_MAX_TEXTURA / lado)
      if (fator < REDUCAO_MINIMA) {
        try {
          arte = await createImageBitmap(inteira, {
            resizeWidth: Math.max(1, Math.round(inteira.width * fator)),
            resizeHeight: Math.max(1, Math.round(inteira.height * fator)),
            resizeQuality: 'high',
          })
          inteira.close()
        } catch {
          arte = inteira
        }
      }
    }
  } catch {
    arte = null
  }
  arte ??= await comoElemento(src)
  feitas++
  avisar()
  return arte
}

function pecasDe<T>(m: Montagem<T>): readonly T[] {
  return m.tipo === 'trechos' ? m.trechos.flat() : [...m.repetem, ...m.destaques, ...m.conexoes]
}

/**
 * Carrega e decodifica toda a arte que o canvas da corrida usa numa volta pelos quatro cenários
 * (2000 m): camadas, peças de muro e casas, obstáculos, cachorro e tutor. A sequência de cenários
 * recomeça igual a cada volta, então os 2000 m seguintes usam as mesmas imagens, que continuam na
 * memória: não há segunda carga a fazer. Chamar cedo (na abertura): a história passa enquanto
 * isto roda por trás, e ela só libera a corrida quando `estadoDaCarga().liberada`.
 */
export function carregarArteCorrida(): Promise<void> {
  carga ??= (async () => {
    const camadas = CENARIOS.flatMap((id) => CAMADAS_POR_CENARIO[id])
    const fontes = [
      ...new Set([
        ...camadas.map((c) => c.src),
        ...camadas.flatMap((c) => (c.montagem ? pecasDe(c.montagem) : [])),
        ...Object.values(SPRITES_OBJETOS),
        cachorroCorrendo,
        cachorroSlide,
        tutorCorrendo,
        tutorPulando,
        tutorDeslizando,
      ]),
    ]
    total = fontes.length
    setTimeout(() => {
      liberada = true
      avisar()
    }, ESPERA_MAXIMA_MS)
    // HUD e fim de partida são <img> do DOM: basta o navegador já ter baixado.
    for (const src of [...Object.values(IMAGENS_HUD), ...Object.values(IMAGENS_FIM)]) void comoElemento(src)

    const prontas = new Map<string, Arte | null>()
    await Promise.all(fontes.map(async (src) => prontas.set(src, await decodificar(src, ESCALA_UTIL.get(src)))))
    const de = (src: string) => prontas.get(src) ?? null
    const todas = (srcs: readonly string[]): Arte[] | null => {
      const artes = srcs.map(de)
      return artes.every((a): a is Arte => a !== null) ? artes : null
    }
    const montar = (m: Montagem<string>): Montagem<Arte> | null => {
      if (!todas(pecasDe(m))) return null
      const arte = (src: string) => de(src)!
      if (m.tipo === 'trechos') return { tipo: 'trechos', trechos: m.trechos.map((pecas) => pecas.map(arte)) }
      return { ...m, repetem: m.repetem.map(arte), destaques: m.destaques.map(arte), conexoes: m.conexoes.map(arte) }
    }
    const porCenario = <T>(f: (id: IdCenario) => T) =>
      Object.fromEntries(CENARIOS.map((id) => [id, f(id)])) as Record<IdCenario, T>
    carregada = {
      cenarios: porCenario((id) => todas(CAMADAS_POR_CENARIO[id].map((c) => c.src))),
      montagens: porCenario((id) => CAMADAS_POR_CENARIO[id].map((c) => (c.montagem ? montar(c.montagem) : null))),
      sprites: new Map(
        Object.entries(SPRITES_OBJETOS).flatMap(([nome, src]): [string, Arte][] => {
          const arte = de(src)
          return arte ? [[nome, arte]] : []
        }),
      ),
      cachorro: de(cachorroCorrendo),
      slide: de(cachorroSlide),
      tutor: de(tutorCorrendo),
      tutorPulo: de(tutorPulando),
      tutorSlide: de(tutorDeslizando),
    }
    liberada = true
    avisar()
  })()
  return carga
}

export interface EstadoDaCarga {
  /** Quanto da arte já foi decodificado, de 0 a 1. */
  progresso: number
  /** A corrida já pode abrir: tudo decodificado, ou a espera máxima passou. */
  liberada: boolean
}

let fotoDaCarga: EstadoDaCarga = { progresso: 0, liberada: false }

/** Sempre o mesmo objeto enquanto nada muda (serve de snapshot para `useSyncExternalStore`). */
export function estadoDaCarga(): EstadoDaCarga {
  const progresso = total === 0 ? 0 : feitas / total
  if (fotoDaCarga.progresso !== progresso || fotoDaCarga.liberada !== liberada) fotoDaCarga = { progresso, liberada }
  return fotoDaCarga
}

/** Avisa a cada imagem decodificada e quando a corrida é liberada; devolve como cancelar. */
export function assinarCarga(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

// Quem desenha chama os getters abaixo a cada quadro: se ninguém pediu a carga antes, ela começa aqui.
function arte(): ArteCarregada | null {
  if (!carga) void carregarArteCorrida()
  return carregada
}

/** A folha do cachorro, ou null enquanto não carregou (o canvas desenha o cachorro vetorial). */
export function spriteCachorroPronto(): Arte | null {
  return arte()?.cachorro ?? null
}

/** A folha do slide, ou null enquanto não carregou (aí o abaixar achata o quadro do galope). */
export function spriteSlidePronto(): Arte | null {
  return arte()?.slide ?? null
}

/** A folha do pulo do tutor, ou null enquanto não carregou (aí ele pula com um quadro da corrida). */
export function spriteTutorPuloPronto(): Arte | null {
  return arte()?.tutorPulo ?? null
}

/** A folha do slide do tutor, ou null enquanto não carregou (aí o abaixar achata o quadro da corrida). */
export function spriteTutorSlidePronto(): Arte | null {
  return arte()?.tutorSlide ?? null
}

/** A folha do tutor, ou null enquanto não carregou (o canvas desenha o tutor vetorial). */
export function spriteTutorPronto(): Arte | null {
  return arte()?.tutor ?? null
}

/** As camadas do cenário, ou null enquanto não carregaram (o canvas desenha o cenário vetorial). */
export function arteCenarioPronta(id: IdCenario): Arte[] | null {
  return arte()?.cenarios[id] ?? null
}

/** Montagem da camada `i` do cenário com todas as peças carregadas, ou null (aí ela repete a imagem única). */
export function montagemDaCamada(id: IdCenario, i: number): Montagem<Arte> | null {
  return arte()?.montagens[id][i] ?? null
}

/** Sprite do objeto, ou null se não houver arte para ele (ou se ainda não carregou): vale o vetor. */
export function spriteObjeto(nome: string): Arte | null {
  return arte()?.sprites.get(APELIDOS[nome] ?? nome) ?? null
}
