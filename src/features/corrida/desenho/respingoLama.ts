// Respingo de lama na "lente" quando o cachorro pisa numa poça: manchas nas bordas da tela que
// estouram, ficam um instante e escorrem para baixo sumindo.
// Só desenho: o motor não sabe que ele existe, então pode usar relógio real e trigonometria.
//
// O gatilho é a sujeira subir entre um quadro e outro, lida do estado; nada muda no motor.
// Coordenadas em fração da tela (0 a 1), para valer igual em qualquer tamanho de moldura.

import type { EstadoPartida } from '../../../engine/index.ts'
import { COR } from './paleta.ts'

interface Gota {
  // Deslocamento a partir do centro da mancha, em raios da mancha.
  dx: number
  dy: number
  raio: number
}

interface Escorrido {
  // Posição horizontal em raios a partir do centro; largura em raios.
  dx: number
  largura: number
  // Comprimento final, em raios: cresce enquanto a mancha escorre.
  comprimento: number
}

interface Mancha {
  // Centro em fração da tela; pode ficar um pouco para fora, colado na borda.
  x: number
  y: number
  // Raio em fração da altura da tela.
  raio: number
  // Raio de cada lobo do contorno, em fração do raio: dá a borda irregular de respingo.
  lobos: number[]
  rotacao: number
  gotas: Gota[]
  escorridos: Escorrido[]
  // Atraso do estouro, em segundos: as manchas não aparecem todas no mesmo quadro.
  atraso: number
  // Quanto escorre até sumir, em fração da altura.
  queda: number
}

const MANCHAS_POR_RESPINGO = 9
// Estouro, tempo parado e escorrido, em segundos.
const ESTOURO_S = 0.12
const PARADO_S = 0.35
const ESCORRE_S = 1.3
const VIDA_S = ESTOURO_S + PARADO_S + ESCORRE_S
// Respingos seguidos (duas poças coladas) não acumulam sem limite.
const MAX_MANCHAS = MANCHAS_POR_RESPINGO * 3
const OPACIDADE = 0.92

let manchas: { m: Mancha; idade: number }[] = []
let sujeiraAnterior: number | null = null
let tickAnterior = -1
let ultimoInstante: number | null = null

// Variação sem Math.random() (proibido fora do rng do motor): hash inteiro de um contador.
let semente = 7
function sorte(): number {
  semente = (semente + 0x6d2b79f5) | 0
  let h = Math.imul(semente ^ (semente >>> 15), 1 | semente)
  h ^= h + Math.imul(h ^ (h >>> 7), 61 | h)
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296
}
const entre = (a: number, b: number) => a + sorte() * (b - a)

/**
 * Um ponto no perímetro da tela, puxado para os cantos e para as laterais: o centro fica livre
 * para o jogador continuar vendo a pista.
 */
function pontoNaBorda(): { x: number; y: number } {
  const lado = Math.floor(sorte() * 4)
  // Ao longo do lado, mais perto das pontas (cantos) que do meio.
  const t = sorte()
  const aoLongo = t < 0.5 ? 0.5 * Math.pow(2 * t, 1.8) : 1 - 0.5 * Math.pow(2 * (1 - t), 1.8)
  // Um pouco para dentro ou para fora da borda.
  const fora = entre(-0.04, 0.06)
  switch (lado) {
    case 0:
      return { x: -fora * 0.6, y: aoLongo }
    case 1:
      return { x: 1 + fora * 0.6, y: aoLongo }
    case 2:
      return { x: aoLongo, y: -fora }
    default:
      return { x: aoLongo, y: 1 + fora }
  }
}

function novaMancha(indice: number): Mancha {
  const { x, y } = pontoNaBorda()
  const nLobos = 9 + Math.floor(sorte() * 5)
  const lobos = Array.from({ length: nLobos }, () => entre(0.7, 1.15))
  const gotas: Gota[] = Array.from({ length: 3 + Math.floor(sorte() * 4) }, () => {
    const ang = sorte() * Math.PI * 2
    const dist = entre(1.25, 2.1)
    return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, raio: entre(0.08, 0.22) }
  })
  const escorridos: Escorrido[] = Array.from({ length: 1 + Math.floor(sorte() * 3) }, () => ({
    dx: entre(-0.55, 0.55),
    largura: entre(0.16, 0.3),
    comprimento: entre(1.1, 2.6),
  }))
  return {
    x,
    y,
    // As primeiras são as grandes; as outras completam em volta.
    raio: indice < 3 ? entre(0.13, 0.19) : entre(0.06, 0.11),
    lobos,
    rotacao: sorte() * Math.PI * 2,
    gotas,
    escorridos,
    atraso: entre(0, 0.08),
    queda: entre(0.08, 0.16),
  }
}

function respingar() {
  for (let i = 0; i < MANCHAS_POR_RESPINGO; i++) manchas.push({ m: novaMancha(i), idade: 0 })
  if (manchas.length > MAX_MANCHAS) manchas = manchas.slice(manchas.length - MAX_MANCHAS)
}

// Pula um pouco além do tamanho final e assenta, como lama que bate e espirra.
function estouro(t: number): number {
  const c = 1.9
  const u = t - 1
  return 1 + (c + 1) * u * u * u + c * u * u
}

/** Contorno irregular da mancha, com curvas entre os lobos para não parecer polígono. */
function contorno(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, m: Mancha) {
  const n = m.lobos.length
  const ponto = (i: number) => {
    const a = m.rotacao + (i / n) * Math.PI * 2
    const rr = r * m.lobos[i % n]!
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr] as const
  }
  const [x0, y0] = ponto(0)
  const [x1, y1] = ponto(1)
  ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2)
  for (let i = 1; i <= n; i++) {
    const [px, py] = ponto(i)
    const [qx, qy] = ponto(i + 1)
    ctx.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2)
  }
  ctx.closePath()
}

function desenharMancha(ctx: CanvasRenderingContext2D, m: Mancha, idade: number, largura: number, altura: number) {
  const t = idade - m.atraso
  if (t <= 0) return
  const escala = t < ESTOURO_S ? estouro(t / ESTOURO_S) : 1
  // 0 até começar a escorrer, 1 no fim da vida.
  const e = Math.min(1, Math.max(0, (t - ESTOURO_S - PARADO_S) / ESCORRE_S))
  // Escorre devagar no começo e ganha velocidade, como lama pesada descendo pelo vidro.
  const descida = e * e * m.queda * altura
  const alpha = OPACIDADE * (1 - e * e * (3 - 2 * e))
  if (alpha <= 0.01) return

  const r = m.raio * altura * escala
  const cx = m.x * largura
  const cy = m.y * altura + descida

  ctx.globalAlpha = alpha
  // Corpo: mancha, gotas soltas em volta e os escorridos que crescem para baixo.
  ctx.fillStyle = COR.lama
  ctx.beginPath()
  contorno(ctx, cx, cy, r, m)
  for (const g of m.gotas) {
    const gx = cx + g.dx * r
    const gy = cy + g.dy * r
    ctx.moveTo(gx + g.raio * r, gy)
    ctx.arc(gx, gy, g.raio * r, 0, Math.PI * 2)
  }
  ctx.fill()
  for (const s of m.escorridos) {
    const w = s.largura * r
    const xs = cx + s.dx * r
    // O escorrido já sai um pouco do contorno no estouro e se alonga enquanto desce.
    const comprimento = r * (0.5 + s.comprimento * (0.3 + 0.7 * e))
    ctx.beginPath()
    ctx.moveTo(xs - w / 2, cy)
    ctx.lineTo(xs - w / 2, cy + comprimento)
    // Gota na ponta, um pouco mais larga que o filete.
    ctx.arc(xs, cy + comprimento, w * 0.62, Math.PI, 0, true)
    ctx.lineTo(xs + w / 2, cy)
    ctx.closePath()
    ctx.fill()
  }
  // Brilho úmido no alto da mancha, deslocado para a luz que vem de cima.
  ctx.fillStyle = COR.lamaBrilho
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.25, cy - r * 0.3, r * 0.42, r * 0.24, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 240, 220, 0.35)'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.14, r * 0.07, -0.5, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Lê a sujeira do estado (subiu = pisou na lama), avança o relógio e desenha os respingos por
 * cima de tudo. Chamar depois de desenhar a cena, a cada quadro.
 */
export function desenharRespingoLama(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  estado: EstadoPartida,
) {
  // Partida nova: o tick volta para trás e os respingos da anterior somem.
  if (estado.tick < tickAnterior) {
    manchas = []
    sujeiraAnterior = null
  }
  tickAnterior = estado.tick
  if (sujeiraAnterior !== null && estado.sujeira > sujeiraAnterior) respingar()
  sujeiraAnterior = estado.sujeira

  const agora = performance.now() / 1000
  // Aba em segundo plano: não envelhece tudo de uma vez.
  const dt = ultimoInstante === null ? 0 : Math.min(0.05, agora - ultimoInstante)
  ultimoInstante = agora
  if (manchas.length === 0) return

  ctx.save()
  for (const item of manchas) {
    item.idade += dt
    desenharMancha(ctx, item.m, item.idade, largura, altura)
  }
  ctx.restore()
  manchas = manchas.filter((item) => item.idade - item.m.atraso < VIDA_S)
}
