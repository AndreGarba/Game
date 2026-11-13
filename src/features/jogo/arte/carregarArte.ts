import { fracaoDaArteNaTela } from '../densidade.ts'

/**
 * Uma imagem pronta para o canvas. `ImageBitmap` já está decodificado; o elemento `<img>` só é
 * decodificado no primeiro `drawImage`, dentro do quadro (medido: até 22 ms por imagem no desktop,
 * mais que um quadro inteiro), e `img.decode()` não muda isso para canvas. O elemento fica só
 * como reserva, para navegador sem `createImageBitmap`, formato que ele não decodifica (SVG) ou
 * falha de rede. Os dois têm `width` e `height` (num `<img>` fora do DOM, são o tamanho natural).
 */
export type Arte = ImageBitmap | HTMLImageElement

// Lado máximo de textura em muitas placas de vídeo de celular Android. Acima disso o navegador
// desenha a imagem pelo processador ou em pedaços, a cada quadro.
const LADO_MAX_TEXTURA = 4096
// Reduzir menos que isto não economiza o bastante para valer a perda de nitidez.
const REDUCAO_MINIMA = 0.95
// Rede travada não pode prender o jogador fora do jogo: passado isto a carga é liberada do mesmo
// jeito, e o canvas desenha o vetor de reserva até a arte chegar.
const ESPERA_MAXIMA_MS = 15_000

const prontas = new Map<string, Arte | null>()
const pedidas = new Map<string, Promise<Arte | null>>()
const ouvintes = new Set<() => void>()
let tempoEsgotado = false
let espera: ReturnType<typeof setTimeout> | undefined

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

// Decodifica fora do quadro: createImageBitmap trabalha em outra thread. Já decodifica no tamanho
// em que a imagem aparece neste aparelho (`fracaoDaArteNaTela` × `escalaUtil`): arte decodificada
// a 2× demais não cabe folgada na memória de vídeo de um celular médio. Por isso quem desenha mede
// pelo tamanho real da imagem (proporção, ou `desenharQuadroDaFolha`), nunca pelo do arquivo.
async function decodificar(src: string, escalaUtil: number): Promise<Arte | null> {
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
  prontas.set(src, arte)
  avisar()
  return arte
}

/**
 * Baixa e decodifica as imagens do canvas antes de elas serem desenhadas. Chamar cedo (na
 * abertura); chamar de novo com as mesmas imagens não baixa nada. `escalaUtil` (por src) é para
 * folhas com mais resolução do que a tela mostra. Imagem nova do canvas entra por aqui, nunca por
 * `new Image()` solto.
 */
export function carregarArte(fontes: readonly string[], escalaUtil?: ReadonlyMap<string, number>): Promise<void> {
  espera ??= setTimeout(() => {
    tempoEsgotado = true
    avisar()
  }, ESPERA_MAXIMA_MS)
  const promessas = fontes.map((src) => {
    let promessa = pedidas.get(src)
    if (!promessa) {
      promessa = decodificar(src, escalaUtil?.get(src) ?? 1)
      pedidas.set(src, promessa)
    }
    return promessa
  })
  avisar()
  return Promise.all(promessas).then(() => {})
}

/** A imagem decodificada, ou null enquanto não carregou (ou se falhou): o canvas desenha o vetor. */
export function artePronta(src: string): Arte | null {
  return prontas.get(src) ?? null
}

export interface EstadoDaCarga {
  /** Quanto da arte pedida já foi decodificado, de 0 a 1. */
  progresso: number
  /** O jogo já pode abrir: tudo decodificado, ou a espera máxima passou. */
  liberada: boolean
}

let fotoDaCarga: EstadoDaCarga = { progresso: 0, liberada: false }

/** Sempre o mesmo objeto enquanto nada muda (serve de snapshot para `useSyncExternalStore`). */
export function estadoDaCarga(): EstadoDaCarga {
  const total = pedidas.size
  const progresso = total === 0 ? 0 : prontas.size / total
  const liberada = (total > 0 && prontas.size === total) || tempoEsgotado
  if (fotoDaCarga.progresso !== progresso || fotoDaCarga.liberada !== liberada) fotoDaCarga = { progresso, liberada }
  return fotoDaCarga
}

/** Avisa a cada imagem decodificada e quando a carga é liberada; devolve como cancelar. */
export function assinarCarga(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export interface Folha {
  quadros: number
}

/**
 * Desenha o quadro `indice` de uma folha de sprites em linha. A imagem pode ter sido decodificada
 * menor que o arquivo, então o recorte sai do tamanho real dela, não das medidas do arquivo.
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
