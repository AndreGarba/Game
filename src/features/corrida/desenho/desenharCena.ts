import {
  cenarioEm,
  CACHORRO_LARGURA,
  VANTAGEM_MAX,
  type Elemento,
} from '../../../engine/index.ts'
import type { PontoRastro, QuadroCorrida } from '../controladorCorrida.ts'
import {
  arteCenarioPronta,
  CAMADAS_CIDADE,
  FRAME_ALTURA,
  LINHA_CHAO,
  LINHA_PISO,
  spriteCachorroPronto,
  spriteObjeto,
  spriteTutorPronto,
} from '../imagens/index.ts'
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
 * Cenário em camadas (`CAMADAS_CIDADE`), em unidades de um quadro de 360 de altura. A escala sai
 * da linha do chão: em paisagem dá altura/360; em pé, com o chão no meio da tela, a arte encolhe
 * junto.
 */
const METROS_NA_ALTURA = 7
// Cor da terra da pista, para o que sobrar abaixo da arte em tela de pé.
const TERRA_BASE = 'rgb(74, 46, 32)'

function desenharCenarioArte(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  arte: NonNullable<ReturnType<typeof arteCenarioPronta>>,
) {
  const escala = cam.chaoY / LINHA_CHAO
  // O céu é a primeira camada e é opaco; se a tela for mais alta que a arte, a cor de cima dele
  // completa.
  ctx.fillStyle = TERRA_BASE
  ctx.fillRect(0, 0, cam.largura, cam.altura)

  CAMADAS_CIDADE.forEach((camada, i) => {
    const imagem = arte[i]!
    const altura = camada.altura * escala
    const largura = (imagem.naturalWidth / imagem.naturalHeight) * altura
    const y = camada.topo * escala
    // parallax 1 = mesma velocidade dos obstáculos; as tiras emendam, então só repetem.
    const desloc = ((cam.x0 * cam.ppm * camada.parallax) % largura + largura) % largura
    // Arredondar evita a fresta de 1 px entre cópias com escala fracionária.
    for (let x = -desloc; x < cam.largura; x += largura) {
      ctx.drawImage(imagem, Math.floor(x), y, Math.ceil(largura) + 1, altura)
    }
    if (i === 0 && y + altura < cam.chaoY) {
      // Tela de pé: o céu não chega no chão. Estica a última linha dele.
      ctx.drawImage(imagem, 0, imagem.naturalHeight - 1, imagem.naturalWidth, 1, 0, y + altura - 1, cam.largura, cam.chaoY)
    }
  })
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

// A arte dos obstáculos foi feita para a cidade: nos outros cenários eles continuam em vetor
// até ganharem arte própria. Coletáveis (ossos e lenço) usam o sprite em qualquer cenário.
function spriteDe(e: Elemento, nome: string): HTMLImageElement | null {
  return cenarioEm(e.x) === 'cidade' ? spriteObjeto(nome) : null
}

function desenharVao(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const agua = e.visual === 'rio' || e.visual === 'lago'
  // O vão corta o piso inteiro da calçada, desde a base do muro: senão o piso parece passar por
  // cima da água.
  const topo = (cam.chaoY * LINHA_PISO) / LINHA_CHAO
  const textura = spriteDe(e, agua ? 'agua' : 'buraco')
  if (textura) {
    // A textura repete na horizontal, presa ao mundo, para a água não "andar" com a câmera.
    const altura = cam.altura - topo
    const largura = (textura.naturalWidth / textura.naturalHeight) * altura
    ctx.save()
    ctx.beginPath()
    ctx.rect(x, topo, l, altura)
    ctx.clip()
    const inicio = x - ((((e.x * cam.ppm) % largura) + largura) % largura)
    for (let tx = inicio; tx < x + l; tx += largura) ctx.drawImage(textura, Math.floor(tx), topo, Math.ceil(largura) + 1, altura)
    ctx.restore()
  } else {
    ctx.fillStyle = agua ? COR.agua : COR.buraco
    ctx.fillRect(x, topo, l, cam.altura - topo)
    if (agua) {
      ctx.fillStyle = COR.aguaClara
      ctx.fillRect(x, cam.chaoY + cam.ppm * 0.15, l, cam.ppm * 0.1)
    }
  }
  if (agua) return
  // Cone de obra na beira do buraco: avisa antes de o buraco aparecer inteiro.
  const cone = spriteDe(e, 'cone')
  if (cone) {
    const a = cam.ppm * 0.75
    const lc = (cone.naturalWidth / cone.naturalHeight) * a
    ctx.drawImage(cone, x - lc * 0.9, cam.chaoY - a, lc, a)
  } else {
    emoji(ctx, '🚧', x - cam.ppm * 0.3, cam.chaoY, cam.ppm * 0.7)
  }
}

// Parte da arte que fica acima do topo da colisão: o jato do chafariz não é onde o cachorro
// pisa, a borda da bacia é.
const ARTE_ACIMA_DO_TOPO: Record<string, number> = { chafariz: 0.4 }

function desenharSolido(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const topo = sy(cam, e.y + e.altura)
  const base = sy(cam, Math.max(e.y, 0))
  const a = base - topo
  const u = cam.ppm
  const sprite = spriteDe(e, e.visual)
  if (sprite && e.visual === 'pedra') {
    ctx.drawImage(sprite, x, topo, l, (sprite.naturalHeight / sprite.naturalWidth) * l)
    return
  }
  if (sprite && e.y > 0) {
    // Plataforma suspensa (marquise): sem sombra no chão. A laje fica no topo da colisão e as
    // mãos-francesas penduram abaixo dela, na proporção da arte.
    ctx.drawImage(sprite, x, topo, l, (sprite.naturalHeight / sprite.naturalWidth) * l)
    return
  }
  if (sprite) {
    // Sombra de contato: sem ela o objeto parece flutuar sobre a calçada.
    ctx.fillStyle = COR.sombra
    ctx.beginPath()
    ctx.ellipse(x + l / 2, base, l * 0.55, u * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    const acima = ARTE_ACIMA_DO_TOPO[e.visual] ?? 0
    const h = a / (1 - acima)
    ctx.drawImage(sprite, x, base - h, l, h)
    return
  }
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
    case 'cavalete': {
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

const LINHA_DE_ESTICAR: Record<string, number> = { galho: 0.25 }

function desenharTeto(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const baseY = sy(cam, e.y)
  const u = cam.ppm
  const sprite = spriteDe(e, e.visual)
  if (sprite) {
    // O teto vai até o céu no motor: a arte tem que chegar no alto da tela, senão parece que dá
    // para pular por cima.
    const a = (sprite.naturalHeight / sprite.naturalWidth) * l
    const topo = baseY - a
    ctx.drawImage(sprite, x, topo, l, a)
    // A linha esticada tem que ser só "coluna" (poste, tronco, parede): no galho, as folhas do
    // topo da arte virariam riscos, então estica uma linha mais abaixo, só de tronco.
    const fracao = LINHA_DE_ESTICAR[e.visual] ?? 0
    const yEsticar = topo + fracao * a
    if (yEsticar > 0) {
      const linha = Math.floor(fracao * sprite.naturalHeight)
      ctx.drawImage(sprite, 0, linha, sprite.naturalWidth, 2, x, 0, l, yEsticar + 1)
    }
    return
  }
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
    case 'rampa': {
      const x = sx(cam, e.x)
      const l = e.largura * u
      const a = e.altura * u
      const sprite = spriteDe(e, 'rampa')
      ctx.fillStyle = COR.sombra
      ctx.beginPath()
      ctx.ellipse(x + l * 0.6, cam.chaoY, l * 0.5, u * 0.09, 0, 0, Math.PI * 2)
      ctx.fill()
      if (sprite) {
        ctx.drawImage(sprite, x, cam.chaoY - a, l, a)
      } else {
        ctx.fillStyle = COR.madeira
        ctx.beginPath()
        ctx.moveTo(x, cam.chaoY)
        ctx.lineTo(x + l, cam.chaoY - a)
        ctx.lineTo(x + l, cam.chaoY)
        ctx.fill()
      }
      return
    }
    case 'poca': {
      const lama = spriteDe(e, 'lama')
      if (lama) {
        if (e.usado) ctx.globalAlpha = 0.5
        const l = e.largura * u
        const a = (lama.naturalHeight / lama.naturalWidth) * l
        ctx.drawImage(lama, sx(cam, e.x), cam.chaoY - a * 0.55, l, a)
        ctx.globalAlpha = 1
        return
      }
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
      const moeda = spriteObjeto(e.tipo)
      if (moeda) {
        // A moeda de ouro é maior: tem que se destacar na fila de moedas comuns.
        const d = u * (e.tipo === 'ossoOuro' ? 0.95 : e.tipo === 'lenco' ? 0.7 : 0.65)
        const l = (moeda.naturalWidth / moeda.naturalHeight) * d
        ctx.drawImage(moeda, cx - l / 2, cy - d / 2, l, d)
        return
      }
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
    desenharCenarioArte(ctx, cam, arte)
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
