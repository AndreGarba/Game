import * as THREE from 'three'
import { COR_PREDIO } from '../visual/paleta.ts'
import { METROS_POR_REPETICAO, urlDaArte, type PastaArte } from '../visual/slotsDeArte.ts'

// Texturas do mundo 3D: arquivo do slot quando existe, desenho procedural quando não.

const carregador = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture | null>()

function preparar(textura: THREE.Texture): THREE.Texture {
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return textura
}

/** Textura do slot (`arte/<pasta>/<nome>.webp|png|jpg`), ou null se o arquivo não existe. */
export function texturaDoSlot(pasta: PastaArte, nome: string): THREE.Texture | null {
  const chave = `${pasta}/${nome}`
  if (cache.has(chave)) return cache.get(chave)!
  const url = urlDaArte(pasta, nome)
  const textura = url ? preparar(carregador.load(url)) : null
  cache.set(chave, textura)
  return textura
}

/** Textura de piso repetida para cobrir `largura` × `profundidade` metros. */
export function texturaDePiso(nome: string, largura: number, profundidade: number): THREE.Texture | null {
  const base = texturaDoSlot('texturas', nome)
  if (!base) return null
  // Cada faixa precisa do próprio repeat; a imagem é a mesma e o navegador não baixa de novo.
  const textura = base.clone()
  const metros = METROS_POR_REPETICAO[nome] ?? 2
  textura.wrapS = THREE.RepeatWrapping
  textura.wrapT = THREE.RepeatWrapping
  textura.repeat.set(largura / metros, profundidade / metros)
  textura.needsUpdate = true
  return textura
}

const PX_POR_METRO = 32

function canvasDe(largura: number, altura: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.round(largura))
  canvas.height = Math.max(2, Math.round(altura))
  return [canvas, canvas.getContext('2d')!]
}

function texturaDoCanvas(canvas: HTMLCanvasElement): THREE.Texture {
  return preparar(new THREE.CanvasTexture(canvas))
}

/**
 * Fachada provisória de um prédio: parede, janelas por andar e o térreo de cada tipo. A porta e a
 * placa são peças à parte, na frente da fachada.
 */
export function fachadaProcedural(variante: string, largura: number, altura: number): THREE.Texture {
  const cores = COR_PREDIO[variante] ?? COR_PREDIO.residencial!
  const w = largura * PX_POR_METRO
  const h = altura * PX_POR_METRO
  const [canvas, ctx] = canvasDe(w, h)
  const m = PX_POR_METRO
  ctx.fillStyle = cores.parede
  ctx.fillRect(0, 0, w, h)
  // Térreo e platibanda.
  ctx.fillStyle = cores.detalhe
  ctx.fillRect(0, 0, w, 0.4 * m)
  ctx.fillRect(0, h - 3.4 * m, w, 0.25 * m)

  const vitrine = variante === 'concessionaria' || variante === 'comercial'
  if (vitrine) {
    ctx.fillStyle = cores.janela
    ctx.fillRect(0.4 * m, h - 3 * m, w - 0.8 * m, 2.6 * m)
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    for (let x = 0.4 * m; x < w - 0.8 * m; x += 2.2 * m) ctx.fillRect(x, h - 3 * m, 0.12 * m, 2.6 * m)
  }

  // Andares de 3 m acima do térreo.
  const colunas = Math.max(1, Math.floor(largura / 2.2))
  const passoX = w / colunas
  for (let base = h - 3.4 * m; base > 1.2 * m; base -= 3 * m) {
    for (let c = 0; c < colunas; c++) {
      const x = c * passoX + passoX * 0.2
      ctx.fillStyle = cores.janela
      ctx.fillRect(x, base - 2.3 * m, passoX * 0.6, 1.6 * m)
      ctx.fillStyle = cores.detalhe
      ctx.fillRect(x - 0.08 * m, base - 0.7 * m, passoX * 0.6 + 0.16 * m, 0.14 * m)
    }
  }
  if (!vitrine) {
    // Janelas do térreo dos dois lados de onde a porta fica.
    ctx.fillStyle = cores.janela
    for (let c = 0; c < colunas; c++) {
      if (Math.abs(c + 0.5 - colunas / 2) < 0.8) continue
      ctx.fillRect(c * passoX + passoX * 0.2, h - 2.6 * m, passoX * 0.6, 1.4 * m)
    }
  }
  return texturaDoCanvas(canvas)
}

/** Parede lateral: só a cor e as janelas, sem térreo especial. */
export function lateralProcedural(variante: string, largura: number, altura: number): THREE.Texture {
  const cores = COR_PREDIO[variante] ?? COR_PREDIO.residencial!
  const m = PX_POR_METRO
  const [canvas, ctx] = canvasDe(largura * m, altura * m)
  ctx.fillStyle = cores.parede
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(0,0,0,0.08)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = cores.janela
  for (let base = canvas.height - 3.4 * m; base > 1.2 * m; base -= 3 * m) {
    for (let x = 1 * m; x < canvas.width - 1.4 * m; x += 2.6 * m) ctx.fillRect(x, base - 2.1 * m, 0.9 * m, 1.3 * m)
  }
  return texturaDoCanvas(canvas)
}

/** Placa com texto, enquanto a arte da placa não chega. */
export function placaProcedural(texto: string, fundo: string, cor: string): THREE.Texture {
  const [canvas, ctx] = canvasDe(512, 128)
  ctx.fillStyle = fundo
  ctx.beginPath()
  ctx.roundRect(4, 4, 504, 120, 24)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.8)'
  ctx.lineWidth = 6
  ctx.stroke()
  ctx.fillStyle = cor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let tamanho = 64
  do {
    ctx.font = `900 ${tamanho}px Nunito, system-ui, sans-serif`
    tamanho -= 4
  } while (ctx.measureText(texto).width > 460 && tamanho > 20)
  ctx.fillText(texto, 256, 68)
  return texturaDoCanvas(canvas)
}
