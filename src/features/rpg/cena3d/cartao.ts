import * as THREE from 'three'
import { COR_CARTAO as C, MARCAS_DO_CARTAO as M } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'
import { texturaDoSlot } from './texturas.ts'

// Cartão Ultra Blue em 3D: placa fina low-poly com a frente texturizada (arte do slot
// `hud/cartao-ultrablue` ou o desenho procedural abaixo), verso com a tarja e borda prata.
// Num cartão de verdade (85,6 mm) ele sumiria no mapa: aqui tem 1,3 m, para ler de longe.

export const LARGURA_CARTAO = 1.3
const ALTURA_CARTAO = (LARGURA_CARTAO * 54) / 85.6
const ESPESSURA_CARTAO = 0.03

function frenteProcedural(): THREE.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 323
  const ctx = canvas.getContext('2d')!
  const fundo = ctx.createLinearGradient(0, 0, 512, 323)
  fundo.addColorStop(0, C.fundoClaro)
  fundo.addColorStop(0.55, C.fundo)
  fundo.addColorStop(1, C.fundoEscuro)
  ctx.fillStyle = fundo
  ctx.fillRect(0, 0, 512, 323)
  // Metal escovado: riscos horizontais de comprimento e brilho variados, sempre os mesmos.
  for (let y = 0; y < 323; y += 3) {
    const x = (y * 37) % 160
    ctx.fillStyle = y % 2 === 0 ? C.escovado : C.escovadoEscuro
    ctx.fillRect(x - 40, y, 220 + ((y * 53) % 300), 1)
  }
  ctx.fillStyle = C.texto
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 24px system-ui, sans-serif'
  ctx.fillText(M.produto, 52, 80)
  ctx.font = '700 40px system-ui, sans-serif'
  ctx.fillText(M.banco, 326, 84)
  const largBtg = ctx.measureText(M.banco).width
  ctx.font = '300 31px system-ui, sans-serif'
  ctx.fillText(M.bancoResto, 332 + largBtg, 84)
  ctx.strokeStyle = C.texto
  ctx.lineWidth = 2.5
  ctx.beginPath()
  ctx.arc(348, 71, 37, Math.PI * 0.75, Math.PI * 2.35)
  ctx.stroke()
  // Chip e o símbolo de aproximação.
  ctx.fillStyle = C.chip
  ctx.beginPath()
  ctx.roundRect(55, 115, 70, 55, 9)
  ctx.fill()
  ctx.strokeStyle = C.chipSombra
  ctx.lineWidth = 2.5
  ctx.beginPath()
  for (const y of [133, 152]) {
    ctx.moveTo(55, y)
    ctx.lineTo(78, y)
    ctx.moveTo(102, y)
    ctx.lineTo(125, y)
  }
  ctx.moveTo(78, 115)
  ctx.lineTo(78, 170)
  ctx.moveTo(102, 115)
  ctx.lineTo(102, 170)
  ctx.stroke()
  ctx.strokeStyle = C.texto
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  for (const [i, r] of [10, 18, 26].entries()) {
    ctx.beginPath()
    ctx.arc(140 + i * 2, 142, r, -0.6, 0.6)
    ctx.stroke()
  }
  // Bandeira: dois círculos que se cruzam, em cinza.
  ctx.fillStyle = C.bandeiraEsquerda
  ctx.beginPath()
  ctx.arc(396, 246, 37, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 0.88
  ctx.fillStyle = C.bandeiraDireita
  ctx.beginPath()
  ctx.arc(445, 246, 37, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.fillStyle = C.texto
  ctx.font = '600 20px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(M.bandeira, 420, 305)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  textura.anisotropy = 4
  return textura
}

/** Grupo do cartão, de pé (frente para +z), centrado na origem. */
export function criarCartao3d(fabrica: Fabrica): THREE.Group {
  const grupo = new THREE.Group()
  const slot = texturaDoSlot('hud', 'cartao-ultrablue')
  const frente = slot ? new THREE.MeshLambertMaterial({ map: slot }) : fabrica.materialComTextura(frenteProcedural())
  if (slot) fabrica.guardar(frente)
  // Um pouco de brilho próprio: o cartão aparece mesmo na sombra de um prédio.
  frente.emissive = new THREE.Color(C.fundoEscuro)
  const borda = fabrica.material(C.borda, { emissivo: true })
  const verso = fabrica.material(C.verso)
  const corpo = fabrica.caixa(LARGURA_CARTAO, ALTURA_CARTAO, ESPESSURA_CARTAO, [borda, borda, borda, borda, frente, verso], {
    y: -ALTURA_CARTAO / 2,
  })
  corpo.castShadow = false
  const tarja = fabrica.caixa(LARGURA_CARTAO, ALTURA_CARTAO * 0.17, 0.004, fabrica.material(C.tarja), {
    y: ALTURA_CARTAO * 0.2,
    z: -ESPESSURA_CARTAO / 2 - 0.002,
  })
  tarja.castShadow = false
  grupo.add(corpo, tarja)
  grupo.visible = false
  return grupo
}
