import {
  cenarioEm,
  CACHORRO_LARGURA,
  TOPO_TETO,
  trechoDoCenarioEm,
  VANTAGEM_MAX,
  vantagemTutor,
  velocidadeBase,
  type Elemento,
  type IdCenario,
} from '../../../engine/index.ts'
import type { PontoRastro, QuadroCorrida } from '../controladorCorrida.ts'
import {
  arteCenarioPronta,
  CAMADAS_POR_CENARIO,
  FRAME_ALTURA,
  LINHA_CHAO,
  LINHA_PISO,
  spriteCachorroPronto,
  spriteSlidePronto,
  spriteObjeto,
  spriteTutorPronto,
  spriteTutorPuloPronto,
  spriteTutorSlidePronto,
  montagemDaCamada,
  type Arte,
  type Montagem,
} from '../imagens/index.ts'
import { COR, PALETA_CENARIO } from './paleta.ts'
import { desenharCachorroSprite } from './cachorroSprite.ts'
import { atualizarPoeira, desenharPoeira } from './poeira.ts'
import { ANTECIPACAO_PULO_M, desenharTutorSprite } from './tutorSprite.ts'
import type { PoseTutorSom } from '../som/sonsCorrida.ts'
import { desenharCachorro, desenharTutor } from './personagens.ts'
import { desenharTeto as desenharTetoDoMuro, type CaixaTeto } from './tetos.ts'

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
 * Cenário em camadas (`CAMADAS_POR_CENARIO`), em unidades de um quadro de 360 de altura. A escala sai
 * da linha do chão: em paisagem dá altura/360; em pé, com o chão no meio da tela, a arte encolhe
 * junto.
 */
const METROS_NA_ALTURA = 7
// Cor da terra da pista, para o que sobrar abaixo da arte em tela de pé.
const TERRA_BASE = 'rgb(74, 46, 32)'

// Peças de uma camada ao longo da pista (muro, casas), em unidades do quadro de 360 (não depende
// da tela). O sorteio é determinístico pelo índice do grupo e fica guardado aos poucos conforme a
// corrida avança, então o mesmo ponto da pista mostra sempre a mesma coisa. Cada camada tem a sua.
// ORIGEM empurra a pista para valores positivos: a câmera começa um pouco antes do x = 0.
const ORIGEM_TRECHOS = 100_000

interface Sequencia {
  inicio: number[]
  peca: Arte[]
  grupos: number
  // Índice do último trecho sorteado (casas), para não repetir em seguida.
  ultimo: number
  // Último painel do muro e se ele foi um destaque.
  ultimoPainel: Arte | null
  destaqueAntes: boolean
}
// Uma por camada de cada cenário (`cenario:indice`).
const sequencias = new Map<string, Sequencia>()

function sorte(k: number, camada: number, sal: number) {
  return hash(k * 13 + sal * 101 + camada * 7919)
}

// Acrescenta o próximo grupo de peças da regra da camada.
function proximoGrupo(seq: Sequencia, camada: number, m: Montagem<Arte>): Arte[] {
  const k = seq.grupos++
  if (m.tipo === 'trechos') {
    let v = Math.floor(sorte(k, camada, 1) * m.trechos.length)
    if (v === seq.ultimo) v = (v + 1) % m.trechos.length
    seq.ultimo = v
    return [...m.trechos[v]!]
  }
  // Muro: toda troca de painel começa com uma conexão sorteada. Às vezes (nunca duas seguidas)
  // entra um destaque sozinho; senão, uma textura repetida de min a max vezes, colada, sem
  // conexão no meio. O painel novo nunca é igual ao anterior.
  const conexao = m.conexoes[Math.floor(sorte(k, camada, 4) * m.conexoes.length)]!
  const destaque = !seq.destaqueAntes && sorte(k, camada, 5) < m.chanceDestaque
  const lista = destaque ? m.destaques : m.repetem
  let i = Math.floor(sorte(k, camada, 2) * lista.length)
  if (lista[i] === seq.ultimoPainel) i = (i + 1) % lista.length
  const painel = lista[i]!
  seq.ultimoPainel = painel
  seq.destaqueAntes = destaque
  if (destaque) return [conexao, painel]
  const { min, max } = m.repeticao
  const vezes = min + Math.floor(sorte(k, camada, 3) * (max - min + 1))
  return [conexao, ...Array.from({ length: vezes }, () => painel)]
}

function desenharMontagem(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  escala: number,
  chave: string,
  indice: number,
  camada: { parallax: number; topo: number; altura: number },
  montagem: Montagem<Arte>,
) {
  const { parallax, topo, altura } = camada
  const largura = (p: Arte) => (p.width / p.height) * altura
  const u0 = (cam.x0 * cam.ppm * parallax) / escala + ORIGEM_TRECHOS
  const u1 = u0 + cam.largura / escala
  let seq = sequencias.get(chave)
  if (!seq) {
    seq = { inicio: [0], peca: [], grupos: 0, ultimo: -1, ultimoPainel: null, destaqueAntes: false }
    sequencias.set(chave, seq)
  }
  while (seq.inicio[seq.inicio.length - 1]! <= u1) {
    for (const p of proximoGrupo(seq, indice, montagem)) {
      seq.peca.push(p)
      seq.inicio.push(seq.inicio[seq.inicio.length - 1]! + largura(p))
    }
  }
  // Primeira peça visível: busca binária nos inícios.
  let baixo = 0
  let alto = seq.peca.length - 1
  while (baixo < alto) {
    const meio = (baixo + alto + 1) >> 1
    if (seq.inicio[meio]! <= u0) baixo = meio
    else alto = meio - 1
  }
  for (let k = baixo; k < seq.peca.length && seq.inicio[k]! < u1; k++) {
    const p = seq.peca[k]!
    // Arredondar e sobrar 1 px evita fresta entre peças com escala fracionária.
    ctx.drawImage(p, Math.floor((seq.inicio[k]! - u0) * escala), topo * escala, Math.ceil(largura(p) * escala) + 1, altura * escala)
  }
}

/** Uma camada de um cenário, pronta para desenhar. */
interface CamadaNaTela {
  cenario: IdCenario
  indice: number
  camada: (typeof CAMADAS_POR_CENARIO)[IdCenario][number]
  imagem: Arte
}

function desenharCamada(ctx: CanvasRenderingContext2D, cam: Camera, escala: number, c: CamadaNaTela) {
  const { camada, imagem, indice } = c
  const montagem = montagemDaCamada(c.cenario, indice)
  if (montagem) {
    desenharMontagem(ctx, cam, escala, `${c.cenario}:${indice}`, indice, camada, montagem)
    return
  }
  const altura = camada.altura * escala
  const largura = (imagem.width / imagem.height) * altura
  const y = camada.topo * escala
  // parallax 1 = mesma velocidade dos obstáculos; as tiras emendam, então só repetem.
  const desloc = ((cam.x0 * cam.ppm * camada.parallax) % largura + largura) % largura
  // Arredondar evita a fresta de 1 px entre cópias com escala fracionária.
  for (let x = -desloc; x < cam.largura; x += largura) {
    ctx.drawImage(imagem, Math.floor(x), y, Math.ceil(largura) + 1, altura)
  }
  if (indice === 0 && y + altura < cam.chaoY) {
    // Tela de pé: o céu não chega no chão. Estica a última linha dele.
    ctx.drawImage(imagem, 0, imagem.height - 1, imagem.width, 1, 0, y + altura - 1, cam.largura, cam.chaoY)
  }
}

// Troca de cenário. Cada camada troca num ponto da tela que depende do parallax dela: todas as
// fronteiras se alinham embaixo do cachorro no instante em que ele cruza a divisa, e as camadas
// de trás (mais lentas) começam a trocar antes e terminam depois. A troca é um esfumado, não um
// corte: largura em unidades do quadro de 360, maior no fundo (um céu vira outro) que na frente.
const ESFUMADO_FUNDO = 160
const ESFUMADO_FRENTE = 50
let rascunho: HTMLCanvasElement | null = null

// Desenha a camada com um degradê de opacidade na horizontal: `alfaEsquerda` até `x0`, o
// contrário depois de `x1`. Passa por um canvas à parte, porque a máscara apagaria o que já está
// na tela.
function desenharCamadaEsfumada(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  escala: number,
  c: CamadaNaTela,
  x0: number,
  x1: number,
  alfaEsquerda: 0 | 1,
) {
  const tela = ctx.canvas
  rascunho ??= document.createElement('canvas')
  if (rascunho.width !== tela.width || rascunho.height !== tela.height) {
    rascunho.width = tela.width
    rascunho.height = tela.height
  }
  const r = rascunho.getContext('2d')
  if (!r) return
  r.setTransform(1, 0, 0, 1, 0, 0)
  r.globalCompositeOperation = 'source-over'
  r.clearRect(0, 0, rascunho.width, rascunho.height)
  r.setTransform(ctx.getTransform())
  desenharCamada(r, cam, escala, c)
  const mascara = r.createLinearGradient(x0, 0, x1, 0)
  mascara.addColorStop(0, `rgba(0, 0, 0, ${alfaEsquerda})`)
  mascara.addColorStop(1, `rgba(0, 0, 0, ${1 - alfaEsquerda})`)
  r.globalCompositeOperation = 'destination-in'
  r.fillStyle = mascara
  r.fillRect(0, 0, cam.largura, cam.altura)
  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.drawImage(rascunho, 0, 0)
  ctx.restore()
}

function camadasDoCenario(id: IdCenario): CamadaNaTela[] | null {
  const arte = arteCenarioPronta(id)
  if (!arte) return null
  return CAMADAS_POR_CENARIO[id].map((camada, indice) => ({ cenario: id, indice, camada, imagem: arte[indice]! }))
}

/** Desenha o cenário em arte; devolve false se a arte de algum cenário à vista ainda não carregou. */
function desenharCenarioArte(ctx: CanvasRenderingContext2D, cam: Camera): boolean {
  const escala = cam.chaoY / LINHA_CHAO
  const ancora = cam.largura * POSICAO_CACHORRO
  const xCachorro = cam.x0 + ancora / cam.ppm
  const trecho = trechoDoCenarioEm(xCachorro)
  // A divisa mais próxima: a que ficou para trás ou a que vem pela frente. A largada (x = 0) não
  // é divisa: não existe cenário antes dela.
  const atras = xCachorro - trecho.inicio < trecho.fim - xCachorro
  const divisa = atras ? trecho.inicio : trecho.fim
  const antes = divisa > 0 ? camadasDoCenario(cenarioEm(divisa - 1)) : []
  const depois = camadasDoCenario(cenarioEm(divisa))
  if (!antes || !depois) return false

  // O céu é a primeira camada e é opaco; se a tela for mais alta que a arte, a cor de cima dele
  // completa.
  ctx.fillStyle = TERRA_BASE
  ctx.fillRect(0, 0, cam.largura, cam.altura)

  // Do fundo para a frente, misturando os dois cenários pela profundidade; no empate, o que está
  // saindo vai por baixo.
  const fila = [...antes.map((c) => ({ c, sai: true })), ...depois.map((c) => ({ c, sai: false }))].sort(
    (a, b) => a.c.camada.parallax - b.c.camada.parallax,
  )
  for (const { c, sai } of fila) {
    const p = c.camada.parallax
    const xDivisa = ancora + (divisa - xCachorro) * cam.ppm * p
    const esfumado = (p < 1 ? ESFUMADO_FUNDO : ESFUMADO_FRENTE) * escala
    if (sai) {
      // Inteira até a divisa; some no esfumado depois dela (por baixo do cenário que entra).
      if (xDivisa + esfumado <= 0) continue
      if (xDivisa >= cam.largura) desenharCamada(ctx, cam, escala, c)
      else desenharCamadaEsfumada(ctx, cam, escala, c, xDivisa, xDivisa + esfumado, 1)
    } else {
      // Aparece no esfumado antes da divisa; inteira depois dela.
      if (xDivisa - esfumado >= cam.largura) continue
      // Na largada não há cenário anterior para misturar: a cidade entra inteira, sem esfumado.
      if (xDivisa <= 0 || divisa <= 0) desenharCamada(ctx, cam, escala, c)
      else desenharCamadaEsfumada(ctx, cam, escala, c, xDivisa - esfumado, xDivisa, 0)
    }
  }
  return true
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
    if (cenario === 'parque') {
      const raio = (0.8 + h * 0.7) * cam.ppm
      ctx.fillStyle = COR.madeiraEscura
      ctx.fillRect(x + passoMeio / 2 - cam.ppm * 0.12, cam.chaoY - raio * 2.2, cam.ppm * 0.24, raio * 2.2)
      ctx.fillStyle = h > 0.5 ? paleta.meio : paleta.meioDetalhe
      ctx.beginPath()
      ctx.arc(x + passoMeio / 2, cam.chaoY - raio * 2.4, raio, 0, Math.PI * 2)
      ctx.fill()
    } else {
      const alturaPredio = (2 + h * (cenario === 'becoAbandonado' ? 5 : 2.5)) * cam.ppm
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

// Buraco: só o interior escuro, desenhado por cima do chão de qualquer cenário (o piso de cada um
// continua em volta). Três sprites em proporções diferentes; vale o de proporção mais próxima da
// do vão, para esticar pouco. A arte passa um pouco das bordas da colisão: os lados são
// irregulares, e sem a sobra ficaria piso inteiro dentro do vão, onde o cachorro cai.
const SPRITES_BURACO = ['buraco-pequeno', 'buraco-medio', 'buraco-grande'] as const
const SOBRA_BURACO = 0.08

function spriteDoBuraco(proporcao: number): Arte | null {
  let melhor: Arte | null = null
  let distancia = Number.POSITIVE_INFINITY
  for (const nome of SPRITES_BURACO) {
    const s = spriteObjeto(nome)
    if (!s) continue
    const d = Math.abs(Math.log(s.width / s.height / proporcao))
    if (d < distancia) {
      melhor = s
      distancia = d
    }
  }
  return melhor
}

function desenharVao(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const escala = cam.chaoY / LINHA_CHAO
  // O buraco corta o piso inteiro, desde a base do muro, e desce até o fim do quadro de 360.
  const topo = LINHA_PISO * escala
  const altura = (FRAME_ALTURA - LINHA_PISO) * escala
  const x0 = x - l * SOBRA_BURACO
  const largura = l * (1 + 2 * SOBRA_BURACO)
  const sprite = spriteDoBuraco(largura / altura)
  if (sprite) {
    ctx.drawImage(sprite, x0, topo, largura, altura)
    // Tela de pé: o chão continua abaixo do quadro, e o fundo do buraco também.
    if (topo + altura < cam.altura) {
      const resto = cam.altura - topo - altura + 1
      ctx.drawImage(sprite, 0, sprite.height - 1, sprite.width, 1, x0, topo + altura - 1, largura, resto)
    }
  } else {
    ctx.fillStyle = COR.buraco
    ctx.fillRect(x, topo, l, cam.altura - topo)
  }
  // Cone de obra na beira do buraco, só na cidade: avisa antes de o buraco aparecer inteiro.
  if (cenarioEm(e.x) !== 'cidade') return
  const cone = spriteObjeto('cone')
  if (cone) {
    // Cone de 70 cm em tamanho real, na mesma régua dos obstáculos (ESCALA_REAL em cenarios.ts).
    const a = cam.ppm * 1.25
    const lc = (cone.width / cone.height) * a
    ctx.drawImage(cone, x0 - lc * 0.9, cam.chaoY - a, lc, a)
  } else {
    emoji(ctx, '🚧', x0 - cam.ppm * 0.3, cam.chaoY, cam.ppm * 0.7)
  }
}

// Parte da arte que fica acima do topo da colisão: o jato do chafariz não é onde o cachorro
// pisa, a borda da bacia é.
const ARTE_ACIMA_DO_TOPO: Record<string, number> = { chafariz: 0.4, jardim_zen: 0.55 }

function desenharSolido(ctx: CanvasRenderingContext2D, cam: Camera, e: Elemento) {
  const x = sx(cam, e.x)
  const l = e.largura * cam.ppm
  const topo = sy(cam, e.y + e.altura)
  const base = sy(cam, Math.max(e.y, 0))
  const a = base - topo
  const u = cam.ppm
  const sprite = spriteObjeto(e.visual)
  if (sprite && e.y > 0) {
    // Plataforma suspensa (marquise): sem sombra no chão. A laje fica no topo da colisão e as
    // mãos-francesas penduram abaixo dela, na proporção da arte.
    ctx.drawImage(sprite, x, topo, l, (sprite.height / sprite.width) * l)
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
  const baseY = sy(cam, e.y)
  // r10: o teto vem do muro do fundo. A colisão acaba no alto dele (a árvore vai até o céu).
  const caixa: CaixaTeto = {
    x: sx(cam, e.x),
    l: e.largura * cam.ppm,
    baseY,
    topoY: Math.max(sy(cam, e.y + e.altura), sy(cam, TOPO_TETO)),
    muroY: sy(cam, TOPO_TETO),
    u: cam.ppm,
    semente: e.id,
  }
  desenharTetoDoMuro(ctx, e.visual, caixa, spriteObjeto(e.visual))
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
      const sprite = spriteObjeto(e.visual)
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
      const lama = spriteObjeto('lama')
      if (lama) {
        if (e.usado) ctx.globalAlpha = 0.5
        const l = e.largura * u
        const a = (lama.height / lama.width) * l
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
        const l = (moeda.width / moeda.height) * d
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

const POSE_NO_CHAO: PontoRastro = { x: 0, y: 0, vy: 0, noChao: true, abaixado: false }

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

// Metros até o próximo ponto do rastro em que o cachorro saiu do chão, se estiver dentro do limite.
// O tutor refaz o caminho do cachorro, então o pulo dele já está no rastro antes de acontecer: dá
// para dar o passo de impulso antes de sair do chão, o que o cachorro não pode (ele depende do toque do jogador).
function metrosAtePuloNoRastro(rastro: readonly PontoRastro[], xAlvo: number, limite: number): number | null {
  // De trás para a frente, sem parar no primeiro: o que vale é o pulo mais próximo.
  let metros: number | null = null
  for (let i = rastro.length - 1; i > 0; i--) {
    const p = rastro[i]!
    const anterior = rastro[i - 1]!
    if (anterior.x <= xAlvo) break
    if (!p.noChao && anterior.noChao && p.x - xAlvo <= limite) metros = p.x - xAlvo
  }
  return metros
}

/** Câmera que segue o cachorro em `x` (metros) numa tela de `largura` × `altura` px. */
function cameraPara(x: number, largura: number, altura: number): Camera {
  // Paisagem: mostra uns 18 m de pista; em retrato a escala é limitada pela largura.
  const ppm = Math.min(altura / METROS_NA_ALTURA, largura / 18)
  // Chão na altura da calçada do Figma. Em tela vertical a escala é limitada pela largura e
  // sobraria céu demais: o chão sobe para deixar a cena no meio da tela.
  const chaoY = Math.min((altura * LINHA_CHAO) / FRAME_ALTURA, altura / 2 + 3.5 * ppm)
  return { ppm, x0: x - (largura * POSICAO_CACHORRO) / ppm, chaoY, largura, altura }
}

/**
 * Centro do cachorro na tela, em fração da largura e da altura (0 a 1). A tela de fim fecha o
 * círculo da transição em cima dele.
 */
export function posicaoCachorroNaTela(estado: QuadroCorrida['estado'], largura: number, altura: number) {
  const c = estado.cachorro
  const cam = cameraPara(c.x, largura, altura)
  return {
    x: sx(cam, c.x + CACHORRO_LARGURA / 2) / largura,
    y: sy(cam, c.y + CACHORRO_LARGURA / 2) / altura,
  }
}

// Fração da tela percorrida por segundo. No motor a distância do tutor muda de uma vez; na tela,
// um salto de vários metros pareceria teletransporte, então ele corre até o lugar novo.
const VELOCIDADE_FRACAO_TUTOR = 0.6
let fracaoTutor: number | null = null
let instanteTutor = 0
let xUltimoTutor = 0

function fracaoTutorNaTela(alvo: number, xCachorro: number): number {
  const agora = performance.now()
  // Partida nova (x voltou para trás) ou primeiro quadro: começa no lugar, sem deslizar.
  if (fracaoTutor === null || xCachorro < xUltimoTutor) fracaoTutor = alvo
  const passoMax = (VELOCIDADE_FRACAO_TUTOR * (agora - instanteTutor)) / 1000
  fracaoTutor += Math.max(-passoMax, Math.min(passoMax, alvo - fracaoTutor))
  instanteTutor = agora
  xUltimoTutor = xCachorro
  return fracaoTutor
}

/**
 * Desenha o quadro e devolve a pose do tutor que acabou de ir para a tela: ela só existe aqui
 * (sai do rastro e da compressão da distância), e os passos e o pouso dele seguem a animação.
 */
export function desenharCena(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  quadro: QuadroCorrida,
): { tutor: PoseTutorSom } {
  const { estado, alfa } = quadro
  const c = estado.cachorro
  const x = quadro.xAnterior + (c.x - quadro.xAnterior) * alfa
  const y = quadro.yAnterior + (c.y - quadro.yAnterior) * alfa

  const cam = cameraPara(x, largura, altura)
  const ppm = cam.ppm
  const xFim = cam.x0 + largura / ppm

  if (!desenharCenarioArte(ctx, cam)) {
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
  const fracao = fracaoTutorNaTela(Math.min(1, Math.max(0, vantagemTutor(estado.sujeira) / VANTAGEM_MAX)), c.x)
  const xTutor = xEncostado + (xMargem - xEncostado) * fracao
  // O tutor faz o que o cachorro fez quando passou por este mesmo ponto da pista: como os
  // obstáculos estão parados no mundo, ele pula o mesmo carro e se abaixa sob o mesmo letreiro.
  const pose = poseNoRastro(quadro.rastro, xTutor - CACHORRO_LARGURA / 2)
  const xNoRastro = xTutor - CACHORRO_LARGURA / 2
  const poseTutor = {
    fase: x * 1.6,
    noAr: !pose.noChao,
    abaixado: pose.abaixado,
    vy: pose.vy,
    metrosAtePulo: pose.noChao ? metrosAtePuloNoRastro(quadro.rastro, xNoRastro, ANTECIPACAO_PULO_M) : null,
  }

  // Poeira atrás dos dois, desenhada antes deles para ficar por baixo dos corpos.
  const velocidade = velocidadeBase(c.x)
  atualizarPoeira({
    cachorro: { x: x + CACHORRO_LARGURA * 0.15, y, noChao: c.noChao, velocidade, escala: 1 },
    tutor: { x: xTutor - 0.35, y: pose.y, noChao: pose.noChao, velocidade, escala: 1.4 },
  })
  desenharPoeira(ctx, (m) => sx(cam, m), (m) => sy(cam, m), ppm)

  const spriteTutor = spriteTutorPronto()
  if (spriteTutor) {
    desenharTutorSprite(
      ctx,
      spriteTutor,
      spriteTutorPuloPronto(),
      spriteTutorSlidePronto(),
      sx(cam, xTutor),
      sy(cam, pose.y),
      ppm,
      poseTutor,
    )
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
  const tutor: PoseTutorSom = { noChao: pose.noChao, abaixado: pose.abaixado, fase: poseTutor.fase }
  const poseCachorro = { fase: x * 2.2, noAr: !c.noChao, abaixado: c.abaixadoTicks > 0 }
  // Folha de sprites da arte; enquanto ela não carrega, o cachorro vetorial.
  const sprite = spriteCachorroPronto()
  if (sprite) {
    desenharCachorroSprite(ctx, sprite, spriteSlidePronto(), cx, base, ppm, {
      ...poseCachorro,
      ticksAbaixado: c.abaixadoTicks,
      vy: c.vy,
    })
    return { tutor }
  }
  ctx.save()
  ctx.translate(cx, base)
  ctx.scale(ppm, -ppm)
  desenharCachorro(ctx, poseCachorro)
  ctx.restore()
  return { tutor }
}
