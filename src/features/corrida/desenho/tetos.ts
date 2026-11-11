// Tetos da cidade (r10): tudo vem do muro do fundo. Letreiro, varal, buganvília e vasos ficam
// presos nele, de `y` até o alto dele; a árvore fica atrás e só o galho passa para a frente.
//
// A arte (ChatGPT) é `imagens/objetos/<visual>.webp` e ocupa a caixa de colisão; a árvore também
// desenha o que fica acima do muro. Como foi pedida: PRD/referencias/cenarios/prompts-tetos.md.
// Enquanto o sprite carrega, cada um é desenhado aqui em vetor, com contorno escuro.
import type { Arte } from '../imagens/index.ts'
import { COR } from './paleta.ts'

/** Tudo em pixels da tela. `muroY` é o alto do muro, `baseY` a borda de baixo da colisão. */
export interface CaixaTeto {
  x: number
  l: number
  topoY: number
  baseY: number
  muroY: number
  /** Pixels por metro. */
  u: number
  /** Id do elemento: varia os detalhes sem sorteio no motor. */
  semente: number
}

// Mesmo hash inteiro do desenhar da cena: variação estável a cada quadro, sem Math.random.
function sorte(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function contorno(ctx: CanvasRenderingContext2D, u: number) {
  ctx.strokeStyle = COR.contorno
  ctx.lineWidth = Math.max(1.5, u * 0.045)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
}

function bola(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, cor: string) {
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = cor
  ctx.fill()
  ctx.stroke()
}

function retangulo(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number, cor: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, l, a, Math.min(r, l / 2, a / 2))
  ctx.fillStyle = cor
  ctx.fill()
  ctx.stroke()
}

// Chapa de metal com dois parafusos, presa na face do muro, com a borda de cima no alto dele.
function fixacao(ctx: CanvasRenderingContext2D, cx: number, topoY: number, u: number) {
  const l = u * 0.3
  const a = u * 0.15
  contorno(ctx, u)
  retangulo(ctx, cx - l / 2, topoY, l, a, u * 0.03, COR.metal)
  ctx.fillStyle = COR.metalClaro
  for (const dx of [-0.3, 0.3]) {
    ctx.beginPath()
    ctx.arc(cx + dx * l, topoY + a / 2, u * 0.03, 0, Math.PI * 2)
    ctx.fill()
  }
}

// Barra de ferro do alto do muro, de onde pendem letreiro, varal e vasos.
function barra(ctx: CanvasRenderingContext2D, x: number, l: number, y: number, u: number) {
  contorno(ctx, u)
  retangulo(ctx, x, y, l, u * 0.08, u * 0.04, COR.metal)
}

function osso(ctx: CanvasRenderingContext2D, cx: number, cy: number, l: number, u: number, cor: string) {
  const r = l * 0.13
  contorno(ctx, u)
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) bola(ctx, cx + dx * (l / 2 - r), cy + dy * r * 0.8, r, cor)
  ctx.beginPath()
  ctx.rect(cx - l / 2 + r, cy - r * 0.75, l - 2 * r, r * 1.5)
  ctx.fillStyle = cor
  ctx.fill()
  // Contorno só nas bordas de cima e de baixo: as pontas já têm o das bolas.
  ctx.beginPath()
  ctx.moveTo(cx - l / 2 + r * 1.6, cy - r * 0.75)
  ctx.lineTo(cx + l / 2 - r * 1.6, cy - r * 0.75)
  ctx.moveTo(cx - l / 2 + r * 1.6, cy + r * 0.75)
  ctx.lineTo(cx + l / 2 - r * 1.6, cy + r * 0.75)
  ctx.stroke()
}

/** Placa de pet shop num braço de ferro preso no alto do muro. */
function letreiro(ctx: CanvasRenderingContext2D, c: CaixaTeto) {
  const { x, l, topoY, baseY, u } = c
  barra(ctx, x, l, topoY + u * 0.06, u)
  // Voluta do braço, do lado de quem chega.
  ctx.beginPath()
  ctx.arc(x + u * 0.16, topoY + u * 0.26, u * 0.12, -Math.PI / 2, Math.PI * 1.2)
  ctx.lineWidth = u * 0.06
  ctx.strokeStyle = COR.contorno
  ctx.stroke()
  fixacao(ctx, x + l * 0.8, topoY, u)
  const placaY = topoY + u * 0.42
  ctx.strokeStyle = COR.metal
  ctx.lineWidth = u * 0.035
  for (const f of [0.25, 0.75]) {
    ctx.beginPath()
    ctx.moveTo(x + l * f, topoY + u * 0.14)
    ctx.lineTo(x + l * f, placaY)
    ctx.stroke()
  }
  contorno(ctx, u)
  retangulo(ctx, x + l * 0.02, placaY, l * 0.96, baseY - placaY, u * 0.14, COR.azulPlaca)
  retangulo(ctx, x + l * 0.09, placaY + u * 0.08, l * 0.82, baseY - placaY - u * 0.16, u * 0.1, COR.creme)
  osso(ctx, x + l / 2, (placaY + baseY) / 2, l * 0.6, u, COR.toalhas[3]!)
}

/** Varal preso no muro com toalhas e um roupão: o banho anda atrás do cachorro. */
function varal(ctx: CanvasRenderingContext2D, c: CaixaTeto) {
  const { x, l, topoY, baseY, u, semente } = c
  const ropeY = topoY + u * 0.16
  const flecha = u * 0.12
  // Corda em parábola entre os dois braços.
  const yCorda = (t: number) => ropeY + flecha * 4 * t * (1 - t)
  contorno(ctx, u)
  for (const f of [0.04, 0.96]) {
    retangulo(ctx, x + l * f - u * 0.04, topoY, u * 0.08, u * 0.22, u * 0.03, COR.metal)
    fixacao(ctx, x + l * f, topoY, u)
  }
  ctx.beginPath()
  ctx.moveTo(x + l * 0.04, ropeY)
  ctx.quadraticCurveTo(x + l / 2, ropeY + flecha * 2, x + l * 0.96, ropeY)
  ctx.strokeStyle = COR.creme
  ctx.lineWidth = u * 0.03
  ctx.stroke()
  // Peças de roupa lado a lado, todas chegando na borda de baixo da colisão.
  const pecas = [0.17, 0.2, 0.15, 0.17, 0.13]
  const vao = (0.9 - pecas.reduce((s, p) => s + p, 0)) / (pecas.length - 1)
  let t = 0.05
  pecas.forEach((p, i) => {
    const px = x + l * t
    const pl = l * p
    const topo = yCorda(t + p / 2)
    const cor = COR.toalhas[(i + semente) % COR.toalhas.length]!
    contorno(ctx, u)
    if (i === 1) {
      // Roupão: ombros mais largos que a barra, com faixa na cintura.
      ctx.beginPath()
      ctx.moveTo(px + pl * 0.15, topo)
      ctx.lineTo(px + pl * 0.85, topo)
      ctx.lineTo(px + pl, topo + (baseY - topo) * 0.35)
      ctx.lineTo(px + pl * 0.9, baseY)
      ctx.lineTo(px + pl * 0.1, baseY)
      ctx.lineTo(px, topo + (baseY - topo) * 0.35)
      ctx.closePath()
      ctx.fillStyle = COR.toalhas[2]!
      ctx.fill()
      ctx.stroke()
      retangulo(ctx, px + pl * 0.05, topo + (baseY - topo) * 0.45, pl * 0.9, u * 0.08, u * 0.03, COR.creme)
      ctx.beginPath()
      ctx.moveTo(px + pl / 2, topo)
      ctx.lineTo(px + pl / 2, baseY)
      ctx.stroke()
    } else {
      retangulo(ctx, px, topo, pl, baseY - topo, u * 0.05, cor)
      // Barra de franja embaixo e duas listras.
      ctx.fillStyle = i % 2 === 0 ? COR.listra : COR.creme
      for (const f of [0.68, 0.78]) ctx.fillRect(px + u * 0.03, topo + (baseY - topo) * f, pl - u * 0.06, u * 0.05)
      if (i === pecas.length - 1) osso(ctx, px + pl / 2, topo + (baseY - topo) * 0.38, pl * 0.7, u, COR.creme)
    }
    // Prendedores.
    for (const f of [0.18, 0.82]) retangulo(ctx, px + pl * f - u * 0.025, topo - u * 0.07, u * 0.05, u * 0.14, u * 0.02, COR.madeira)
    t += p + vao
  })
}

/** Buganvília transbordando do alto do muro e caindo em cortina. */
function buganvilia(ctx: CanvasRenderingContext2D, c: CaixaTeto) {
  const { x, l, topoY, baseY, u, semente } = c
  contorno(ctx, u)
  // Massa de folhas por trás das flores, para a cortina não ficar vazada.
  ctx.beginPath()
  ctx.roundRect(x + u * 0.05, topoY, l - u * 0.1, (baseY - topoY) * 0.82, u * 0.2)
  ctx.fillStyle = COR.folhaEscura
  ctx.fill()
  ctx.stroke()
  const fios = Math.max(4, Math.round(l / (u * 0.28)))
  for (let i = 0; i < fios; i++) {
    const fx = x + ((i + 0.5) * l) / fios
    // Pontas na borda de baixo da colisão, com pouca variação: o que se vê é o que bate.
    const fim = baseY - u * 0.1
    let y = topoY + u * 0.05 + sorte(semente * 31 + i) * u * 0.1
    for (let k = 0; y <= fim; k++) {
      const s = sorte(semente * 7 + i * 13 + k)
      const dx = (s - 0.5) * u * 0.2
      const flor = sorte(semente * 3 + i * 17 + k) < 0.7
      const r = u * (flor ? 0.09 + s * 0.06 : 0.08)
      bola(ctx, fx + dx, y, r, flor ? (s < 0.5 ? COR.florA : COR.florB) : COR.folhaClara)
      y += u * (0.1 + sorte(semente * 5 + i * 19 + k) * 0.12)
    }
  }
  // Ramo grosso por cima do muro, de onde tudo cai.
  retangulo(ctx, x - u * 0.05, topoY - u * 0.1, l + u * 0.1, u * 0.22, u * 0.11, COR.folha)
  for (let i = 0; i < fios; i++) bola(ctx, x + ((i + 0.5) * l) / fios, topoY - u * 0.08, u * 0.1, i % 2 ? COR.florB : COR.folhaClara)
}

/** Três vasos de samambaia pendurados num trilho preso no muro. */
function vasos(ctx: CanvasRenderingContext2D, c: CaixaTeto) {
  const { x, l, topoY, baseY, u } = c
  barra(ctx, x, l, topoY + u * 0.04, u)
  for (const f of [0.1, 0.5, 0.9]) fixacao(ctx, x + l * f, topoY, u)
  const vasoY = topoY + u * 0.42
  const altVaso = u * 0.3
  for (const f of [1 / 6, 1 / 2, 5 / 6]) {
    const cx = x + l * f
    ctx.strokeStyle = COR.metal
    ctx.lineWidth = u * 0.025
    for (const d of [-0.18, 0, 0.18]) {
      ctx.beginPath()
      ctx.moveTo(cx, topoY + u * 0.12)
      ctx.lineTo(cx + d * u, vasoY)
      ctx.stroke()
    }
    // Samambaia: frondes da boca do vaso até a borda de baixo, cobrindo a largura do vaso e o vão
    // até o vizinho.
    const meia = l / 6
    for (let k = -3; k <= 3; k++) {
      const pontaX = cx + (k / 3) * meia * 0.95
      const sobe = vasoY + u * 0.02
      contorno(ctx, u)
      ctx.beginPath()
      ctx.moveTo(cx + k * u * 0.04, sobe)
      ctx.quadraticCurveTo(cx + (pontaX - cx) * 1.2, sobe + u * 0.1, pontaX, baseY - u * 0.04)
      ctx.lineWidth = u * 0.12
      ctx.strokeStyle = COR.contorno
      ctx.stroke()
      ctx.lineWidth = u * 0.07
      ctx.strokeStyle = k % 2 ? COR.folha : COR.folhaClara
      ctx.stroke()
    }
    contorno(ctx, u)
    ctx.beginPath()
    ctx.moveTo(cx - u * 0.24, vasoY)
    ctx.lineTo(cx + u * 0.24, vasoY)
    ctx.lineTo(cx + u * 0.17, vasoY + altVaso)
    ctx.lineTo(cx - u * 0.17, vasoY + altVaso)
    ctx.closePath()
    ctx.fillStyle = COR.terracota
    ctx.fill()
    ctx.stroke()
    retangulo(ctx, cx - u * 0.27, vasoY - u * 0.02, u * 0.54, u * 0.09, u * 0.03, COR.terracotaEscura)
    for (const d of [-0.12, 0.1]) bola(ctx, cx + d * u, vasoY + altVaso * 0.6, u * 0.05, COR.creme)
  }
}

/**
 * Árvore atrás do muro: o tronco nasce no alto dele (o resto fica escondido), a copa vai para o
 * alto e um galho atravessa para a frente, com uma cortina de folhas até a borda de baixo.
 */
function arvore(ctx: CanvasRenderingContext2D, c: CaixaTeto) {
  const { x, l, baseY, muroY, u, semente } = c
  const troncoX = x + l * 0.86
  const copaY = muroY - u * 2.2
  contorno(ctx, u)
  // Copa: bolas escuras atrás, claras na frente; o tronco vem por cima delas para não sumir.
  for (const [dx, dy, r, cor] of [
    [-0.9, 0.2, 0.75, COR.folhaEscura],
    [0.6, 0.15, 0.7, COR.folhaEscura],
    [-0.2, -0.45, 0.8, COR.folhaEscura],
    [-0.5, 0.1, 0.6, COR.folha],
    [0.3, -0.2, 0.65, COR.folha],
    [-0.1, 0.35, 0.55, COR.folhaClara],
  ] as const)
    bola(ctx, troncoX + dx * u, copaY + dy * u, r * u, cor)
  // Corte reto no alto do muro: o resto do tronco está atrás dele.
  retangulo(ctx, troncoX - u * 0.18, copaY + u * 0.5, u * 0.36, muroY - copaY - u * 0.5, u * 0.04, COR.tronco)
  // Galho: sai do tronco acima do muro, faz um arco por cima dele e cai para a pista.
  const p0 = { x: troncoX, y: muroY - u * 1.1 }
  const c1 = { x: x + l * 0.5, y: muroY - u * 1.6 }
  const c2 = { x: x + l * 0.05, y: muroY - u * 0.9 }
  const p3 = { x: x + l * 0.12, y: baseY - u * 0.45 }
  const noGalho = (t: number) => {
    const m = 1 - t
    return {
      x: m * m * m * p0.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p3.x,
      y: m * m * m * p0.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p3.y,
    }
  }
  const galho = new Path2D()
  galho.moveTo(p0.x, p0.y)
  galho.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p3.x, p3.y)
  // Raminhos pendurados no galho, cada um com um cacho de folhas até a borda de baixo.
  const raminhos = Math.max(3, Math.round(l / (u * 0.45)))
  const pontas: { x: number; y: number }[] = []
  for (let i = 0; i < raminhos; i++) {
    const de = noGalho(0.3 + (0.7 * i) / raminhos)
    const ate = { x: x + ((i + 0.5) * l) / raminhos, y: baseY - u * 0.3 }
    galho.moveTo(de.x, de.y)
    galho.quadraticCurveTo(ate.x, de.y, ate.x, ate.y)
    pontas.push(ate)
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.lineWidth = u * 0.2
  ctx.strokeStyle = COR.contorno
  ctx.stroke(galho)
  ctx.lineWidth = u * 0.12
  ctx.strokeStyle = COR.tronco
  ctx.stroke(galho)
  // Folhas em cima do arco (o tronco fica à mostra entre o muro e a copa) e ao longo de cada
  // raminho, como um chorão: a folhagem é o que bate, até a borda de baixo.
  contorno(ctx, u)
  for (let k = 0; k < 6; k++) {
    const p = noGalho(0.35 + k * 0.11)
    const s = sorte(semente * 11 + k)
    bola(ctx, p.x + (s - 0.5) * u * 0.2, p.y - u * 0.1, u * (0.13 + s * 0.05), k % 2 ? COR.folha : COR.folhaClara)
  }
  pontas.forEach((p, i) => {
    const de = noGalho(0.3 + (0.7 * i) / raminhos)
    for (let y = Math.max(de.y + u * 0.15, muroY - u * 0.5), k = 0; y <= baseY - u * 0.12; y += u * 0.15, k++) {
      const s = sorte(semente * 23 + i * 7 + k)
      bola(ctx, p.x + (s - 0.5) * u * 0.22, y, u * (0.1 + s * 0.05), k % 3 === 1 ? COR.folhaClara : COR.folha)
    }
  })
}

const DESENHOS: Record<string, (ctx: CanvasRenderingContext2D, c: CaixaTeto) => void> = {
  letreiro,
  varal,
  buganvilia,
  vasos,
  arvore,
}

/**
 * Na arte da árvore (ChatGPT), o tronco é cortado reto a esta fração da altura, contando de baixo:
 * abaixo do corte só há a folhagem do galho. Medido na imagem; arte nova = medir de novo.
 */
const ARVORE_CORTE_DE_BAIXO = 0.326

// A folhagem abaixo do corte ocupa a colisão inteira, da borda de baixo ao alto do muro, para o
// corte cair no muro; acima dele a copa segue a proporção da arte, na largura da colisão.
function arvoreComArte(ctx: CanvasRenderingContext2D, c: CaixaTeto, sprite: Arte) {
  const { width: w, height: h } = sprite
  const corte = Math.round(h * (1 - ARVORE_CORTE_DE_BAIXO))
  ctx.drawImage(sprite, 0, corte, w, h - corte, c.x, c.muroY, c.l, c.baseY - c.muroY)
  const copa = (corte / w) * c.l
  ctx.drawImage(sprite, 0, 0, w, corte, c.x, c.muroY - copa, c.l, copa + 1)
}

export function desenharTeto(ctx: CanvasRenderingContext2D, visual: string, c: CaixaTeto, sprite: Arte | null) {
  ctx.save()
  if (sprite) {
    if (visual === 'arvore') {
      arvoreComArte(ctx, c, sprite)
    } else {
      ctx.drawImage(sprite, c.x, c.topoY, c.l, c.baseY - c.topoY)
    }
  } else {
    ;(DESENHOS[visual] ?? letreiro)(ctx, c)
  }
  ctx.restore()
}
