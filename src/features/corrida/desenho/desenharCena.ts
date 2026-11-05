import {
  cenarioEm,
  CACHORRO_LARGURA,
  VANTAGEM_MAX,
  type Elemento,
} from '../../../engine/index.ts'
import type { PontoRastro, QuadroCorrida } from '../controladorCorrida.ts'
import { arteCenarioPronta, spriteCachorroPronto, spriteTutorPronto } from '../imagens/index.ts'
import { COR, PALETA_CENARIO } from './paleta.ts'
import { desenharCachorroSprite } from './cachorroSprite.ts'
import { desenharTutorSprite } from './tutorSprite.ts'
import { desenharCachorro, desenharTutor } from './personagens.ts'

// Desenho puro: lê o estado, nunca o altera. As 3 camadas do falso 3D (fundo, meio, pista)
// andam a velocidades diferentes; só a pista corresponde ao mundo do motor.

const PARALLAX_FUNDO = 0.15
const PARALLAX_MEIO = 0.45
// Onde o cachorro fica na tela, em fração da largura.
const POSICAO_CACHORRO = 0.28

interface Camera {
  ppm: number
  x0: number
  chaoY: number
  largura: number
  altura: number
}

// Hash inteiro para variar prédios e árvores sem aleatoriedade: o cenário de fundo tem que
// ser o mesmo a cada quadro.
function hash(n: number): number {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  h ^= h >>> 13
  h = Math.imul(h, 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function sx(cam: Camera, x: number): number {
  return (x - cam.x0) * cam.ppm
}
function sy(cam: Camera, y: number): number {
  return cam.chaoY - y * cam.ppm
}

function retanguloArredondado(ctx: CanvasRenderingContext2D, x: number, y: number, l: number, a: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, l, a, Math.min(r, l / 2, a / 2))
  ctx.fill()
}

function emoji(ctx: CanvasRenderingContext2D, texto: string, x: number, y: number, tamanho: number, virar = false) {
  ctx.save()
  ctx.font = `${tamanho}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.translate(x, y)
  if (virar) ctx.scale(-1, 1)
  ctx.fillText(texto, 0, 0)
  ctx.restore()
}

/*
 * Cenário do Figma (frame 7960:8725, 780 × 360), em unidades do frame. A escala sai da linha do
 * chão: a arte vai do topo da tela até a calçada, como no design. Em paisagem dá altura/360; em pé,
 * com o chão no meio da tela, a arte encolhe junto.
 */
const FRAME_ALTURA = 360
const METROS_NA_ALTURA = 7
// Onde a calçada encontra as casas, medido na arte.
const LINHA_CHAO = 322
const CEU = { x: -7, largura: 794, altura: 447 }
const CASAS = { y: -18, largura: 781, altura: 440 }
const CALCADA = { y: -20, largura: 784, altura: 441 }
// Cor da base da calçada, para o que sobrar abaixo da arte em tela de pé.
const CALCADA_BASE = 'rgb(190, 164, 152)'

function desenharCenarioArte(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  xCamera: number,
  arte: NonNullable<ReturnType<typeof arteCenarioPronta>>,
) {
  const escala = cam.chaoY / LINHA_CHAO

  // Céu parado: tem sol, que repetido viraria dois. Cobre a largura toda mesmo em tela mais larga
  // que o frame.
  const escalaCeu = Math.max(escala, cam.largura / (CEU.largura + CEU.x))
  ctx.drawImage(arte.ceu, CEU.x * escalaCeu, 0, CEU.largura * escalaCeu, CEU.altura * escalaCeu)

  // Calçada presa ao mundo, como os obstáculos: a arte emenda sozinha, então só repete.
  const larguraCalcada = CALCADA.largura * escala
  const deslocCalcada = ((cam.x0 * cam.ppm) % larguraCalcada + larguraCalcada) % larguraCalcada
  const yCalcada = CALCADA.y * escala
  for (let x = -deslocCalcada; x < cam.largura; x += larguraCalcada) {
    ctx.drawImage(arte.calcada, x, yCalcada, larguraCalcada, CALCADA.altura * escala)
  }
  const baseCalcada = yCalcada + CALCADA.altura * escala
  if (baseCalcada < cam.altura) {
    ctx.fillStyle = CALCADA_BASE
    ctx.fillRect(0, baseCalcada - 1, cam.largura, cam.altura - baseCalcada + 1)
  }

  // Casas no meio do parallax. As bordas da arte não emendam: uma cópia sim, outra espelhada.
  const larguraCasas = CASAS.largura * escala
  const deslocCasas = xCamera * cam.ppm * PARALLAX_MEIO
  const yCasas = CASAS.y * escala
  for (let i = Math.floor(deslocCasas / larguraCasas); i * larguraCasas - deslocCasas < cam.largura; i++) {
    const x = i * larguraCasas - deslocCasas
    if (i % 2 === 0) {
      ctx.drawImage(arte.casas, x, yCasas, larguraCasas, CASAS.altura * escala)
    } else {
      ctx.save()
      ctx.translate(x + larguraCasas, yCasas)
      ctx.scale(-1, 1)
      ctx.drawImage(arte.casas, 0, 0, larguraCasas, CASAS.altura * escala)
      ctx.restore()
    }
  }
}

/** Cenário vetorial: vale só nos primeiros quadros, enquanto a arte do Figma ainda carrega. */
function desenharFundo(ctx: CanvasRenderingContext2D, cam: Camera, xCamera: number) {
  const paleta = PALETA_CENARIO[cenarioEm(xCamera)]
  const ceu = ctx.createLinearGradient(0, 0, 0, cam.chaoY)
  ceu.addColorStop(0, paleta.ceuTopo)
  ceu.addColorStop(1, paleta.ceuBase)
  ctx.fillStyle = ceu
  ctx.fillRect(0, 0, cam.largura, cam.altura)

  // Camada do fundo: silhuetas largas.
  const passoFundo = 4 * cam.ppm
  const deslocFundo = xCamera * cam.ppm * PARALLAX_FUNDO
  const primeiroFundo = Math.floor(deslocFundo / passoFundo) - 1
  ctx.fillStyle = paleta.fundo
  for (let i = primeiroFundo; i * passoFundo - deslocFundo < cam.largura + passoFundo; i++) {
    const alturaSilhueta = (2.5 + hash(i) * 4) * cam.ppm
    retanguloArredondado(ctx, i * passoFundo - deslocFundo, cam.chaoY - alturaSilhueta, passoFundo * 0.92, alturaSilhueta, cam.ppm * 0.6)
  }

  // Camada do meio: casas, árvores ou prédios com janelas.
  const passoMeio = 3.2 * cam.ppm
  const deslocMeio = xCamera * cam.ppm * PARALLAX_MEIO
  const primeiroMeio = Math.floor(deslocMeio / passoMeio) - 1
  const cenario = cenarioEm(xCamera)
  for (let i = primeiroMeio; i * passoMeio - deslocMeio < cam.largura + passoMeio; i++) {
    const x = i * passoMeio - deslocMeio
    const h = hash(i * 7 + 3)
    if (cenario === 'parque' || cenario === 'rio') {
      const raio = (0.8 + h * 0.7) * cam.ppm
      ctx.fillStyle = COR.madeiraEscura
      ctx.fillRect(x + passoMeio / 2 - cam.ppm * 0.12, cam.chaoY - raio * 2.2, cam.ppm * 0.24, raio * 2.2)
      ctx.fillStyle = h > 0.5 ? paleta.meio : paleta.meioDetalhe
      ctx.beginPath()
      ctx.arc(x + passoMeio / 2, cam.chaoY - raio * 2.4, raio, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const alturaPredio = (2 + h * (cenario === 'centro' ? 5 : 2.5)) * cam.ppm
      ctx.fillStyle = paleta.meio
      ctx.fillRect(x, cam.chaoY - alturaPredio, passoMeio * 0.88, alturaPredio)
      ctx.fillStyle = paleta.meioDetalhe
      const janela = cam.ppm * 0.35
      for (let jy = cam.chaoY - alturaPredio + janela; jy < cam.chaoY - janela * 2; jy += janela * 2) {
        for (let jx = x + janela * 0.8; jx < x + passoMeio * 0.88 - janela; jx += janela * 1.8) {
          ctx.fillRect(jx, jy, janela, janela)
        }
      }
    }
  }
}

function desenharChao(ctx: CanvasRenderingContext2D, cam: Camera, xCamera: number) {
  const paleta = PALETA_CENARIO[cenarioEm(xCamera)]
  ctx.fillStyle = paleta.chao
  ctx.fillRect(0, cam.chaoY, cam.largura, cam.altura - cam.chaoY)
  // Marcas no chão a cada 2 m: é o que dá sensação de velocidade.
  ctx.fillStyle = paleta.chaoLinha
  const primeiro = Math.floor(cam.x0 / 2) * 2
  for (let x = primeiro; sx(cam, x) < cam.largura; x += 2) {
    ctx.fillRect(sx(cam, x), cam.chaoY + cam.ppm * 0.25, cam.ppm * 0.9, cam.ppm * 0.08)
  }
}

function desenharVao(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const agua = e.visual === 'rio' || e.visual === 'lago'
  ctx.fillStyle = agua ? COR.agua : COR.buraco
  ctx.fillRect(x, cam.chaoY, l, cam.altura - cam.chaoY)
  if (agua) {
    ctx.fillStyle = COR.aguaClara
    ctx.fillRect(x, cam.chaoY + cam.ppm * 0.15, l, cam.ppm * 0.1)
  } else {
    emoji(ctx, '🚧', x - cam.ppm * 0.3, cam.chaoY, cam.ppm * 0.7)
  }
}

function desenharSolido(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const topo = sy(cam, e.y + e.altura)
  const base = sy(cam, Math.max(e.y, 0))
  const a = base - topo
  const u = cam.ppm
  switch (e.visual) {
    case 'carro': {
      ctx.fillStyle = COR.carros[e.id % COR.carros.length]!
      retanguloArredondado(ctx, x, topo + a * 0.35, l, a * 0.5, u * 0.25)
      retanguloArredondado(ctx, x + l * 0.2, topo, l * 0.55, a * 0.45, u * 0.2)
      ctx.fillStyle = COR.vidro
      retanguloArredondado(ctx, x + l * 0.26, topo + a * 0.08, l * 0.43, a * 0.27, u * 0.1)
      ctx.fillStyle = COR.pneu
      for (const fx of [0.22, 0.78]) {
        ctx.beginPath()
        ctx.arc(x + l * fx, base - a * 0.15, a * 0.17, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'onibus': {
      ctx.fillStyle = COR.onibus
      retanguloArredondado(ctx, x, topo, l, a * 0.85, u * 0.3)
      ctx.fillStyle = COR.vidro
      for (let jx = x + u * 0.4; jx < x + l - u; jx += u * 1.1) ctx.fillRect(jx, topo + a * 0.12, u * 0.8, a * 0.3)
      ctx.fillStyle = COR.pneu
      for (const fx of [0.15, 0.85]) {
        ctx.beginPath()
        ctx.arc(x + l * fx, base - a * 0.12, a * 0.14, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'banco': {
      ctx.fillStyle = COR.madeira
      ctx.fillRect(x, topo, l, a * 0.35)
      ctx.fillStyle = COR.metal
      ctx.fillRect(x + l * 0.1, topo, u * 0.1, a)
      ctx.fillRect(x + l * 0.9 - u * 0.1, topo, u * 0.1, a)
      break
    }
    case 'chafariz': {
      ctx.fillStyle = COR.pedra
      retanguloArredondado(ctx, x, topo, l, a, u * 0.2)
      ctx.fillStyle = COR.aguaClara
      ctx.fillRect(x + u * 0.15, topo, l - u * 0.3, u * 0.15)
      break
    }
    case 'pedra': {
      ctx.fillStyle = COR.pedra
      retanguloArredondado(ctx, x, topo, l, cam.altura - topo, u * 0.5)
      ctx.fillStyle = COR.pedraClara
      retanguloArredondado(ctx, x + u * 0.2, topo + u * 0.05, l * 0.4, u * 0.15, u * 0.08)
      break
    }
    case 'marquise': {
      ctx.fillStyle = COR.metal
      ctx.fillRect(x + l - u * 0.1, topo, u * 0.1, base - topo + e.y * u)
      ctx.fillStyle = COR.pedraClara
      retanguloArredondado(ctx, x, topo, l, a, u * 0.08)
      break
    }
    case 'tora': {
      ctx.fillStyle = COR.madeira
      retanguloArredondado(ctx, x, topo, l, a, a / 2)
      break
    }
    case 'canteiro': {
      ctx.fillStyle = COR.pedra
      ctx.fillRect(x, topo + a * 0.3, l, a * 0.7)
      ctx.fillStyle = COR.folha
      retanguloArredondado(ctx, x, topo, l, a * 0.45, u * 0.2)
      break
    }
    case 'banca': {
      ctx.fillStyle = COR.toldoA
      ctx.fillRect(x, topo + a * 0.2, l, a * 0.8)
      ctx.fillStyle = COR.toldoB
      ctx.fillRect(x - u * 0.1, topo, l + u * 0.2, a * 0.2)
      break
    }
    default: {
      // lixeira e qualquer sólido novo sem desenho próprio.
      ctx.fillStyle = COR.folha
      retanguloArredondado(ctx, x, topo, l, a, u * 0.12)
    }
  }
}

function desenharTeto(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const baseY = sy(cam, e.y)
  const u = cam.ppm
  switch (e.visual) {
    case 'galho': {
      ctx.fillStyle = COR.madeiraEscura
      ctx.fillRect(x + l - u * 0.3, 0, u * 0.3, baseY)
      ctx.fillRect(x, baseY - u * 0.25, l, u * 0.25)
      ctx.fillStyle = COR.folha
      for (let i = 0; i < 4; i++) {
        ctx.beginPath()
        ctx.arc(x + (l * (i + 0.5)) / 4, baseY - u * 0.4, u * 0.4, 0, Math.PI * 2)
        ctx.fill()
      }
      break
    }
    case 'toldo': {
      for (let i = 0; i * u * 0.5 < l; i++) {
        ctx.fillStyle = i % 2 === 0 ? COR.toldoA : COR.toldoB
        ctx.fillRect(x + i * u * 0.5, baseY - u * 0.5, Math.min(u * 0.5, l - i * u * 0.5), u * 0.5)
      }
      ctx.fillStyle = COR.metal
      ctx.fillRect(x, 0, u * 0.08, baseY - u * 0.5)
      ctx.fillRect(x + l - u * 0.08, 0, u * 0.08, baseY - u * 0.5)
      break
    }
    case 'viga':
    case 'andaime': {
      ctx.fillStyle = COR.metal
      ctx.fillRect(x, baseY - u * 0.4, l, u * 0.4)
      ctx.fillRect(x, 0, u * 0.15, baseY)
      ctx.fillRect(x + l - u * 0.15, 0, u * 0.15, baseY)
      break
    }
    default: {
      // placa
      ctx.fillStyle = COR.metal
      ctx.fillRect(x + l / 2 - u * 0.05, 0, u * 0.1, baseY)
      ctx.fillStyle = COR.placa
      retanguloArredondado(ctx, x, baseY - u * 0.6, l, u * 0.6, u * 0.1)
    }
  }
}

function desenharElemento(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const u = cam.ppm
  switch (e.tipo) {
    case 'solido':
      return desenharSolido(ctx, cam, e)
    case 'teto':
      return desenharTeto(ctx, cam, e)
    case 'poca': {
      if (e.usado) ctx.globalAlpha = 0.5
      ctx.fillStyle = COR.lama
      ctx.beginPath()
      ctx.ellipse(sx(cam, e.x + e.largura / 2), cam.chaoY + u * 0.05, (e.largura / 2) * u, u * 0.16, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = COR.lamaBrilho
      ctx.beginPath()
      ctx.ellipse(sx(cam, e.x + e.largura / 3), cam.chaoY, (e.largura / 6) * u, u * 0.05, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
      return
    }
    case 'osso':
    case 'ossoOuro':
    case 'lenco': {
      if (e.usado) return
      const cx = sx(cam, e.x)
      const cy = sy(cam, e.y)
      if (e.tipo === 'ossoOuro') {
        ctx.fillStyle = COR.ouroBrilho
        ctx.beginPath()
        ctx.arc(cx, cy, u * 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
      emoji(ctx, e.tipo === 'lenco' ? '🧻' : e.tipo === 'ossoOuro' ? '🏅' : '🦴', cx, cy + u * 0.22, u * 0.6)
      return
    }
    case 'vao':
      return
  }
}

const POSE_NO_CHAO: PontoRastro = { x: 0, y: 0, noChao: true, abaixado: false }

function poseNoRastro(rastro: readonly PontoRastro[], xAlvo: number): PontoRastro {
  const primeiro = rastro[0]
  if (!primeiro || xAlvo <= primeiro.x) return POSE_NO_CHAO
  // Busca binária: o rastro está em ordem crescente de x.
  let baixo = 0
  let alto = rastro.length - 1
  while (baixo < alto) {
    const meio = (baixo + alto) >> 1
    if (rastro[meio]!.x < xAlvo) baixo = meio + 1
    else alto = meio
  }
  const depois = rastro[baixo]!
  const antes = rastro[baixo - 1] ?? depois
  const t = depois.x === antes.x ? 1 : (xAlvo - antes.x) / (depois.x - antes.x)
  return { ...depois, y: antes.y + (depois.y - antes.y) * Math.min(1, Math.max(0, t)) }
}

export function desenharCena(ctx: CanvasRenderingContext2D, largura: number, altura: number, quadro: QuadroCorrida) {
  const { estado, alfa } = quadro
  const c = estado.cachorro
  const x = quadro.xAnterior + (c.x - quadro.xAnterior) * alfa
  const y = quadro.yAnterior + (c.y - quadro.yAnterior) * alfa

  // Paisagem: mostra uns 18 m de pista; em retrato a escala é limitada pela largura.
  const ppm = Math.min(altura / METROS_NA_ALTURA, largura / 18)
  // Chão na altura da calçada do Figma. Em tela vertical a escala é limitada pela largura e
  // sobraria céu demais: o chão sobe para deixar a cena no meio da tela.
  const chaoY = Math.min((altura * LINHA_CHAO) / FRAME_ALTURA, altura / 2 + 3.5 * ppm)
  const cam: Camera = { ppm, x0: x - (largura * POSICAO_CACHORRO) / ppm, chaoY, largura, altura }
  const xFim = cam.x0 + largura / ppm

  const arte = arteCenarioPronta()
  if (arte) {
    desenharCenarioArte(ctx, cam, x, arte)
  } else {
    desenharFundo(ctx, cam, x)
    desenharChao(ctx, cam, x)
  }

  const visiveis = estado.elementos.filter((e) => e.x + e.largura > cam.x0 - 1 && e.x < xFim + 1)
  for (const e of visiveis) if (e.tipo === 'vao') desenharVao(ctx, cam, e)
  for (const e of visiveis) if (e.tipo !== 'vao') desenharElemento(ctx, cam, e)

  // Tutor sempre na tela: a vantagem real (até 20 m) não cabe entre a margem e o cachorro,
  // então ela é comprimida. Vantagem máxima = colado na margem; zero = encostando no cachorro.
  const xMargem = cam.x0 + 0.3
  const xEncostado = x - 1.1
  const fracao = Math.min(1, Math.max(0, estado.vantagem / VANTAGEM_MAX))
  const xTutor = xEncostado + (xMargem - xEncostado) * fracao
  // O tutor faz o que o cachorro fez quando passou por este mesmo ponto da pista: como os
  // obstáculos estão parados no mundo, ele pula o mesmo carro e se abaixa sob a mesma placa.
  const pose = poseNoRastro(quadro.rastro, xTutor - CACHORRO_LARGURA / 2)
  const poseTutor = { fase: x * 1.6, noAr: !pose.noChao, abaixado: pose.abaixado }
  const spriteTutor = spriteTutorPronto()
  if (spriteTutor) {
    desenharTutorSprite(ctx, spriteTutor, sx(cam, xTutor), sy(cam, pose.y), ppm, poseTutor)
  } else {
    ctx.save()
    ctx.translate(sx(cam, xTutor), sy(cam, pose.y))
    ctx.scale(ppm, -ppm)
    desenharTutor(ctx, poseTutor)
    ctx.restore()
  }

  const cx = sx(cam, x + CACHORRO_LARGURA / 2)
  const base = sy(cam, y)
  if (c.noChao) {
    ctx.fillStyle = COR.sombra
    ctx.beginPath()
    ctx.ellipse(cx, base, ppm * 0.5, ppm * 0.1, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const poseCachorro = { fase: x * 2.2, noAr: !c.noChao, abaixado: c.abaixadoTicks > 0, sujeira: estado.sujeira }
  // Folha de sprites da arte; enquanto ela não carrega, o cachorro vetorial.
  const sprite = spriteCachorroPronto()
  if (sprite) {
    desenharCachorroSprite(ctx, sprite, cx, base, ppm, { ...poseCachorro, vy: c.vy })
    return
  }
  ctx.save()
  ctx.translate(cx, base)
  ctx.scale(ppm, -ppm)
  desenharCachorro(ctx, poseCachorro)
  ctx.restore()
}
