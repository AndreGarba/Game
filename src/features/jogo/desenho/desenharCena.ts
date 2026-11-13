import { JOGADOR_LADO, type Elemento } from '../../../engine/index.ts'
import { desenharQuadroDaFolha } from '../arte/carregarArte.ts'
import { FOLHA_JOGADOR, spriteJogador, spriteMoeda } from '../arte/index.ts'
import type { QuadroJogo } from '../controladorJogo.ts'

/*
 * Cena do jogo de exemplo em Canvas 2D. Tudo aqui é visual: pode usar trigonometria e relógio
 * real à vontade, porque nada volta para o motor. Jogo novo troca este arquivo inteiro.
 */

// Cores do canvas (não há CSS aqui). Jogo novo troca junto com a arte.
const PALETA = {
  ceuTopo: '#7cc6f2',
  ceuBase: '#d8f0ff',
  morros: '#9fd49a',
  chao: '#5b8c3a',
  terra: '#7a5230',
  bloco: '#4b5768',
  blocoTopo: '#1f2a37',
  moeda: '#e0a100',
  jogador: '#f76b15',
  contorno: '#1f2a37',
}

// Altura visível do mundo, em metros: define a escala em qualquer tamanho de tela.
const METROS_NA_ALTURA = 7
// Onde fica o chão (y = 0) e o jogador, em fração da tela.
const LINHA_CHAO = 0.78
const JOGADOR_NA_TELA = 0.22
// Parallax dos morros: andam a esta fração da velocidade da pista.
const PARALLAX_MORROS = 0.3
const LARGURA_MORRO_M = 14
// Piscar do jogador, pelo relógio real: pausado, ele continua piscando.
const PISCA_A_CADA_MS = 2600
const PISCA_DURA_MS = 140

export function desenharCena(ctx: CanvasRenderingContext2D, largura: number, altura: number, quadro: QuadroJogo) {
  const { estado, xAnterior, yAnterior, alfa } = quadro
  const escala = altura / METROS_NA_ALTURA
  const chaoY = altura * LINHA_CHAO
  const jx = xAnterior + (estado.jogador.x - xAnterior) * alfa
  const jy = yAnterior + (estado.jogador.y - yAnterior) * alfa
  // Câmera: o jogador fica parado na tela e o mundo passa.
  const origemX = largura * JOGADOR_NA_TELA - jx * escala
  const telaX = (x: number) => origemX + x * escala
  const telaY = (y: number) => chaoY - y * escala

  const ceu = ctx.createLinearGradient(0, 0, 0, chaoY)
  ceu.addColorStop(0, PALETA.ceuTopo)
  ceu.addColorStop(1, PALETA.ceuBase)
  ctx.fillStyle = ceu
  ctx.fillRect(0, 0, largura, altura)

  desenharMorros(ctx, largura, chaoY, escala, jx)

  const vaos = estado.elementos.filter((e) => e.tipo === 'vao')
  desenharChao(ctx, largura, altura, chaoY, vaos.map((v) => [telaX(v.x), telaX(v.x + v.largura)] as const))

  for (const e of estado.elementos) {
    const x = telaX(e.x)
    if (x > largura + escala * 4 || telaX(e.x + e.largura) < -escala * 4) continue
    if (e.tipo === 'bloco') desenharBloco(ctx, e, x, telaY(e.y + e.altura), escala)
    else if (e.tipo === 'moeda' && !e.usado) desenharMoeda(ctx, x, telaY(e.y), escala)
  }

  desenharJogador(ctx, telaX(jx), telaY(jy + JOGADOR_LADO), JOGADOR_LADO * escala)
}

function desenharMorros(ctx: CanvasRenderingContext2D, largura: number, chaoY: number, escala: number, jx: number) {
  const passo = LARGURA_MORRO_M * escala
  const deslocamento = (jx * PARALLAX_MORROS * escala) % passo
  ctx.fillStyle = PALETA.morros
  for (let x = -deslocamento - passo; x < largura + passo; x += passo) {
    ctx.beginPath()
    ctx.ellipse(x + passo / 2, chaoY, passo * 0.6, escala * 2.2, 0, Math.PI, 0)
    ctx.fill()
  }
}

function desenharChao(
  ctx: CanvasRenderingContext2D,
  largura: number,
  altura: number,
  chaoY: number,
  buracos: readonly (readonly [number, number])[],
) {
  ctx.fillStyle = PALETA.terra
  ctx.fillRect(0, chaoY, largura, altura - chaoY)
  ctx.fillStyle = PALETA.chao
  ctx.fillRect(0, chaoY, largura, Math.max(4, (altura - chaoY) * 0.18))
  // O vão é o céu aparecendo por baixo: recorta o chão até o fim da tela.
  const ceu = ctx.createLinearGradient(0, chaoY, 0, altura)
  ceu.addColorStop(0, PALETA.ceuBase)
  ceu.addColorStop(1, PALETA.ceuTopo)
  ctx.fillStyle = ceu
  for (const [inicio, fim] of buracos) ctx.fillRect(inicio, chaoY, fim - inicio, altura - chaoY)
}

function desenharBloco(ctx: CanvasRenderingContext2D, e: Elemento, x: number, y: number, escala: number) {
  const l = e.largura * escala
  const a = e.altura * escala
  ctx.fillStyle = PALETA.bloco
  ctx.fillRect(x, y, l, a)
  ctx.fillStyle = PALETA.blocoTopo
  ctx.fillRect(x, y, l, Math.max(2, escala * 0.08))
}

function desenharMoeda(ctx: CanvasRenderingContext2D, x: number, y: number, escala: number) {
  const lado = escala * 0.55
  const sprite = spriteMoeda()
  if (sprite) {
    ctx.drawImage(sprite, x - lado / 2, y - lado / 2, lado, lado)
    return
  }
  ctx.fillStyle = PALETA.moeda
  ctx.beginPath()
  ctx.arc(x, y, lado / 2, 0, Math.PI * 2)
  ctx.fill()
}

function desenharJogador(ctx: CanvasRenderingContext2D, x: number, y: number, lado: number) {
  const sprite = spriteJogador()
  if (sprite) {
    const piscando = performance.now() % PISCA_A_CADA_MS < PISCA_DURA_MS
    desenharQuadroDaFolha(ctx, sprite, FOLHA_JOGADOR, piscando ? 1 : 0, x, y, lado, lado)
    return
  }
  ctx.fillStyle = PALETA.jogador
  ctx.fillRect(x, y, lado, lado)
  ctx.strokeStyle = PALETA.contorno
  ctx.lineWidth = Math.max(1, lado * 0.06)
  ctx.strokeRect(x, y, lado, lado)
}
