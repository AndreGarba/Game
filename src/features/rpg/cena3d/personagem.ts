import * as THREE from 'three'
import type { Aparencia } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'

// Personagem low-poly de caixas, com quadris e ombros como pivôs: o passo é girar pernas e
// braços em x. Frente para +z. Uns 1,8 m de altura.

export interface Personagem {
  raiz: THREE.Group
  corpo: THREE.Group
  pernas: [THREE.Group, THREE.Group]
  bracos: [THREE.Group, THREE.Group]
  // Ângulo atual em y, suavizado até o alvo.
  angulo: number
  anel?: THREE.Mesh
}

const ALTURA_QUADRIL = 0.78
const ALTURA_OMBRO = 1.34

function membro(f: Fabrica, cor: string, ponta: string, largura: number, comprimento: number, pontaAltura: number): THREE.Group {
  const pivo = new THREE.Group()
  pivo.add(
    f.caixa(largura, comprimento, largura * 1.1, f.material(cor), { y: -comprimento }),
    f.caixa(largura * 1.05, pontaAltura, largura * 1.4, f.material(ponta), { y: -comprimento - pontaAltura * 0.6, z: 0.03 }),
  )
  return pivo
}

// Braço de camiseta: manga curta na cor da camisa, pele até a mão e tatuagens em tinta. Cada lado
// tem um desenho, e as peças de tinta saem um pouco para fora do braço para não piscarem com a
// pele (z-fighting). Grossas de propósito: na câmera isométrica um braço tem poucos pixels.
// Sem tinta (`mangaCurta`), é só a manga curta e a pele.
function bracoTatuado(f: Fabrica, a: Aparencia, tinta: string | null, lado: -1 | 1): THREE.Group {
  const pivo = new THREE.Group()
  const l = 0.15
  const comprimento = 0.5
  const manga = 0.16
  const pele = f.material(a.pele)
  pivo.add(
    f.caixa(l * 1.18, manga, l * 1.25, f.material(a.camisa), { y: -manga }),
    f.caixa(l, comprimento - manga, l * 1.1, pele, { y: -comprimento }),
    f.caixa(l * 1.05, 0.14, l * 1.4, pele, { y: -comprimento - 0.084, z: 0.03 }),
  )
  if (!tinta) return pivo
  const t = f.material(tinta)
  const anel = (y: number, altura: number) => f.caixa(l + 0.012, altura, l * 1.1 + 0.012, t, { y: -y })
  if (a.tatuagemPequena) {
    // Uma marca só, na face de fora do braço direito, logo abaixo da manga.
    if (lado > 0) pivo.add(f.caixa(0.012, 0.07, l * 0.45, t, { x: l / 2 + 0.006, y: -0.27 }))
  } else if (lado < 0) {
    // Esquerdo: duas faixas no antebraço e uma no bíceps.
    pivo.add(anel(0.24, 0.035), anel(0.36, 0.06), anel(0.45, 0.035))
  } else {
    // Direito: desenho grande na face de fora, uma faixa no bíceps e outra no pulso.
    pivo.add(
      f.caixa(0.012, 0.2, l * 0.8, t, { x: l / 2 + 0.006, y: -0.42 }),
      f.caixa(0.012, 0.06, l * 0.5, f.material(a.pele), { x: l / 2 + 0.013, y: -0.33 }),
      f.caixa(l * 1.1 + 0.012, 0.06, 0.012, t, { y: -0.35, z: (l * 1.1) / 2 + 0.006 }),
      anel(0.25, 0.05),
      anel(0.47, 0.03),
    )
  }
  return pivo
}

// Estampa no peito: texto em canvas, fundo transparente, numa placa colada na frente do tronco.
function estampa(f: Fabrica, texto: string, cor: string, largura: number): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 80
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = cor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '900 64px system-ui, sans-serif'
  ctx.fillText(texto, 128, 44, 244)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  const placa = f.plano(largura, (largura * 80) / 256, f.materialComTextura(textura, { transparente: true }))
  placa.castShadow = false
  return placa
}

// Estampa sem texto: faixa de setas em cima, moldura e três chamas de blocos (a do meio maior).
function estampaChamas(f: Fabrica, chama: string, moldura: string, lado: number): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = moldura
  for (let i = 0; i < 6; i++) {
    const x = 14 + i * 17
    ctx.beginPath()
    ctx.moveTo(x, 4)
    ctx.lineTo(x + 12, 13)
    ctx.lineTo(x, 22)
    ctx.lineTo(x + 5, 13)
    ctx.closePath()
    ctx.fill()
  }
  ctx.lineWidth = 8
  ctx.strokeStyle = moldura
  ctx.strokeRect(14, 28, 100, 94)
  ctx.fillStyle = chama
  const labareda = (cx: number, base: number, largura: number, altura: number) => {
    ctx.beginPath()
    ctx.moveTo(cx - largura / 2, base)
    ctx.lineTo(cx - largura / 2, base - altura * 0.55)
    ctx.lineTo(cx - largura / 4, base - altura * 0.75)
    ctx.lineTo(cx, base - altura)
    ctx.lineTo(cx + largura / 4, base - altura * 0.7)
    ctx.lineTo(cx + largura / 2, base - altura * 0.5)
    ctx.lineTo(cx + largura / 2, base)
    ctx.closePath()
    ctx.fill()
  }
  labareda(38, 110, 30, 50)
  labareda(90, 110, 30, 58)
  labareda(64, 116, 40, 80)
  const textura = new THREE.CanvasTexture(canvas)
  textura.colorSpace = THREE.SRGBColorSpace
  const placa = f.plano(lado, lado, f.materialComTextura(textura, { transparente: true }))
  placa.castShadow = false
  return placa
}

// Rosto do elenco (o `y` das caixas é a base): barba cheia (cobre o queixo e a mandíbula, com bigode) e óculos de armação.
function detalhesDoRosto(f: Fabrica, a: Aparencia, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  if (a.barba && a.barbaRala) {
    const barba = f.material(a.barba)
    corpo.add(
      f.caixa(0.41, 0.1, 0.29, barba, { y: y + 0.06, z: 0.05 }),
      f.caixa(0.18, 0.03, 0.014, barba, { y: y + 0.17, z: 0.196 }),
    )
  } else if (a.barba) {
    const barba = f.material(a.barba)
    corpo.add(
      f.caixa(0.43, 0.17, 0.3, barba, { y: y + 0.02, z: 0.05 }),
      f.caixa(0.22, 0.045, 0.03, barba, { y: y + 0.165, z: 0.195 }),
    )
  }
  if (a.oculos) {
    const aro = f.material(a.oculos)
    const zf = 0.205
    corpo.add(f.caixa(0.34, 0.022, 0.02, aro, { y: y + 0.295, z: zf }))
    for (const lado of [-1, 1]) {
      const cx = lado * 0.09
      corpo.add(
        f.caixa(0.13, 0.018, 0.02, aro, { x: cx, y: y + 0.18, z: zf }),
        f.caixa(0.018, 0.115, 0.02, aro, { x: cx - 0.06, y: y + 0.18, z: zf }),
        f.caixa(0.018, 0.115, 0.02, aro, { x: cx + 0.06, y: y + 0.18, z: zf }),
        f.caixa(0.014, 0.022, 0.2, aro, { x: lado * 0.206, y: y + 0.295, z: 0.1 }),
      )
      if (a.lentes) corpo.add(f.caixa(0.11, 0.1, 0.012, f.material(a.lentes), { x: cx, y: y + 0.188, z: zf - 0.004 }))
    }
  }
  if (a.batom) corpo.add(f.caixa(0.12, 0.035, 0.012, f.material(a.batom), { y: y + 0.1, z: 0.196 }))
}

// Cabelo médio: a mesma calota em cima, uma franja de lado, mechas caindo dos lados até o ombro
// e a parte de trás comprida. As mechas claras saem um pouco para fora, como as tatuagens.
function cabeloAteOOmbro(f: Fabrica, a: Aparencia, mechas: string | null, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  const fio = f.material(a.cabelo)
  corpo.add(
    f.caixa(0.44, 0.14, 0.42, fio, { y: y + 0.4 }),
    f.caixa(0.3, 0.07, 0.05, fio, { x: 0.06, y: y + 0.38, z: 0.19 }),
    f.caixa(0.46, 0.52, 0.12, fio, { y: y - 0.02, z: -0.17 }),
  )
  for (const lado of [-1, 1]) corpo.add(f.caixa(0.06, 0.46, 0.3, fio, { x: lado * 0.225, y: y - 0.02, z: -0.03 }))
  if (mechas) {
    const claro = f.material(mechas)
    for (const lado of [-1, 1]) {
      corpo.add(
        f.caixa(0.012, 0.34, 0.05, claro, { x: lado * 0.261, y: y + 0.02, z: 0.06 }),
        f.caixa(0.012, 0.28, 0.04, claro, { x: lado * 0.261, y: y - 0.01, z: -0.08 }),
      )
    }
    corpo.add(
      f.caixa(0.05, 0.012, 0.3, claro, { x: -0.08, y: y + 0.54, z: -0.02 }),
      f.caixa(0.05, 0.012, 0.3, claro, { x: 0.1, y: y + 0.54, z: -0.02 }),
      f.caixa(0.08, 0.012, 0.42, claro, { y: y + 0.52, z: -0.17 }),
    )
  }
}

// Cabelo longo: calota na cor da raiz; o comprimento, de outra cor, cai dos lados da cabeça, desce
// pelas costas e passa na frente dos ombros até o peito (por fora do tronco, que é mais largo que a
// cabeça).
// Com `risca`, uma linha de pele no meio da calota e da franja: o cabelo repartido ao meio.
function cabeloComprido(f: Fabrica, a: Aparencia, pontas: string, risca: boolean, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  const raiz = f.material(a.cabelo)
  const fio = f.material(pontas)
  corpo.add(
    f.caixa(0.44, 0.14, 0.42, raiz, { y: y + 0.4 }),
    f.caixa(0.46, 0.06, 0.06, raiz, { y: y + 0.4, z: 0.19 }),
    f.caixa(0.46, 0.8, 0.12, fio, { y: y - 0.3, z: -0.17 }),
  )
  if (risca) {
    const pele = f.material(a.pele)
    corpo.add(
      f.caixa(0.03, 0.012, 0.26, pele, { y: y + 0.535, z: 0.09 }),
      f.caixa(0.03, 0.06, 0.012, pele, { y: y + 0.4, z: 0.222 }),
    )
  }
  for (const lado of [-1, 1]) {
    corpo.add(
      f.caixa(0.06, 0.4, 0.3, fio, { x: lado * 0.225, y: y + 0.02, z: -0.03 }),
      f.caixa(0.06, 0.08, 0.3, raiz, { x: lado * 0.225, y: y + 0.38, z: -0.03 }),
      f.caixa(0.11, 0.36, 0.05, fio, { x: lado * 0.19, y: y - 0.32, z: 0.165 }),
    )
  }
}

// Jaqueta aberta: o tronco e as mangas na cor dela, a blusa numa faixa no meio da frente, dois
// bolsos no peito e a barra descendo até o quadril.
function jaquetaPorCima(f: Fabrica, a: Aparencia, jaqueta: { cor: string; bolso: string }, corpo: THREE.Group) {
  const pano = f.material(jaqueta.cor)
  const bolso = f.material(jaqueta.bolso)
  const topo = ALTURA_QUADRIL - 0.04 + 0.62
  corpo.add(
    f.caixa(0.17, 0.62, 0.012, f.material(a.camisa), { y: ALTURA_QUADRIL - 0.04, z: 0.151 }),
    f.caixa(0.54, 0.14, 0.32, pano, { y: ALTURA_QUADRIL - 0.16 }),
    f.caixa(0.17, 0.14, 0.012, f.material(a.camisa), { y: ALTURA_QUADRIL - 0.16, z: 0.161 }),
  )
  for (const lado of [-1, 1]) {
    corpo.add(
      f.caixa(0.11, 0.1, 0.02, bolso, { x: lado * 0.17, y: topo - 0.3, z: 0.158 }),
      f.caixa(0.03, 0.03, 0.02, f.material(a.camisa), { x: lado * 0.17, y: topo - 0.24, z: 0.165 }),
    )
  }
}

// Camisa social: gola em V aberta mostrando o pescoço, as duas pontas da gola, os botões descendo
// pela frente e o logo pequeno do lado esquerdo do peito.
function camisaDeBotao(f: Fabrica, a: Aparencia, social: { botoes: string; logo: string }, corpo: THREE.Group) {
  const topo = ALTURA_QUADRIL - 0.04 + 0.62
  const pano = f.material(a.camisa)
  const botao = f.material(social.botoes)
  corpo.add(f.caixa(0.1, 0.07, 0.012, f.material(a.pele), { y: topo - 0.07, z: 0.151 }))
  for (const lado of [-1, 1]) corpo.add(f.caixa(0.1, 0.05, 0.03, pano, { x: lado * 0.085, y: topo - 0.06, z: 0.16 }))
  for (let i = 0; i < 4; i++) corpo.add(f.caixa(0.025, 0.025, 0.012, botao, { y: topo - 0.16 - i * 0.13, z: 0.157 }))
  corpo.add(f.caixa(0.04, 0.025, 0.012, f.material(social.logo), { x: 0.14, y: topo - 0.2, z: 0.157 }))
}

// Regata: ombros de fora e decote em V de pele; o babado contorna o decote, desce pela frente e
// sai da barra, um pouco mais largo que o tronco.
function blusaRegata(f: Fabrica, a: Aparencia, corpo: THREE.Group) {
  const pele = f.material(a.pele)
  const topo = ALTURA_QUADRIL - 0.04 + 0.62
  for (const lado of [-1, 1]) corpo.add(f.caixa(0.1, 0.12, 0.31, pele, { x: lado * 0.215, y: topo - 0.115 }))
  corpo.add(f.caixa(0.16, 0.12, 0.012, pele, { y: topo - 0.12, z: 0.151 }))
  if (!a.babado) return
  const renda = f.material(a.babado)
  corpo.add(
    f.caixa(0.035, 0.15, 0.02, renda, { x: -0.095, y: topo - 0.14, z: 0.158 }),
    f.caixa(0.035, 0.15, 0.02, renda, { x: 0.095, y: topo - 0.14, z: 0.158 }),
    f.caixa(0.22, 0.03, 0.02, renda, { y: topo - 0.15, z: 0.158 }),
    f.caixa(0.04, 0.32, 0.02, renda, { x: 0.06, y: topo - 0.47, z: 0.158 }),
    f.caixa(0.56, 0.06, 0.34, renda, { y: ALTURA_QUADRIL - 0.06 }),
  )
}

// Perna de bermuda: pele até o tênis e a bermuda só na coxa, um pouco mais larga. A tatuagem é
// uma faixa na canela e um desenho na face de fora, como nos braços.
function pernaDeBermuda(f: Fabrica, a: Aparencia, lado: -1 | 1): THREE.Group {
  const pivo = new THREE.Group()
  const l = 0.2
  const comprimento = 0.66
  const coxa = 0.3
  const pele = f.material(a.pele)
  pivo.add(
    f.caixa(l * 1.08, coxa, l * 1.18, f.material(a.calca), { y: -coxa }),
    f.caixa(l * 0.85, comprimento - coxa, l * 0.95, pele, { y: -comprimento }),
    f.caixa(l * 1.05, 0.12, l * 1.4, f.material(a.sapato), { y: -comprimento - 0.072, z: 0.03 }),
  )
  if (a.tatuagemPerna) {
    const t = f.material(a.tatuagemPerna)
    pivo.add(f.caixa(l * 0.85 + 0.012, 0.04, l * 0.95 + 0.012, t, { y: -0.52 }))
    pivo.add(f.caixa(0.012, 0.16, l * 0.6, t, { x: lado * (l * 0.425 + 0.006), y: -0.48 }))
  }
  return pivo
}

// Cachecol: uma volta larga no pescoço e as duas pontas caindo na frente, sobre a jaqueta.
function cachecol(f: Fabrica, cor: string, corpo: THREE.Group) {
  const la = f.material(cor)
  const topo = ALTURA_QUADRIL - 0.04 + 0.62
  corpo.add(f.caixa(0.42, 0.1, 0.34, la, { y: topo - 0.06 }))
  for (const lado of [-1, 1]) corpo.add(f.caixa(0.08, 0.5, 0.03, la, { x: lado * 0.07, y: topo - 0.52, z: 0.165 }))
}

// Boné: copa justa no alto da cabeça e a aba saindo para a frente.
function bone(f: Fabrica, b: { cor: string; aba: string; marca?: string }, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  corpo.add(
    f.caixa(0.45, 0.16, 0.43, f.material(b.cor), { y: y + 0.42 }),
    f.caixa(0.4, 0.03, 0.18, f.material(b.aba), { y: y + 0.42, z: 0.27 }),
  )
  if (b.marca) corpo.add(f.caixa(0.08, 0.1, 0.012, f.material(b.marca), { y: y + 0.46, z: 0.221 }))
}

// Cacheado: tufos em cima e na frente da calota, saindo um pouco dela.
function cachos(f: Fabrica, a: Aparencia, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  const fio = f.material(a.cabelo)
  for (const x of [-0.14, 0, 0.14]) {
    for (const z of [-0.12, 0.03, 0.16]) corpo.add(f.caixa(0.12, 0.06, 0.12, fio, { x: x + z * 0.15, y: y + 0.52, z }))
    corpo.add(f.caixa(0.1, 0.07, 0.04, fio, { x: x + 0.03, y: y + 0.42, z: 0.22 }))
  }
}

// Grisalho nas laterais da barba cheia, na frente e nos lados da mandíbula, longe da boca.
function fiosGrisalhos(f: Fabrica, cor: string, corpo: THREE.Group) {
  const y = ALTURA_OMBRO
  const fio = f.material(cor)
  for (const lado of [-1, 1]) {
    corpo.add(
      f.caixa(0.04, 0.1, 0.012, fio, { x: lado * 0.17, y: y + 0.05, z: 0.206 }),
      f.caixa(0.012, 0.1, 0.06, fio, { x: lado * 0.221, y: y + 0.05, z: 0.12 }),
    )
  }
}

// Puffer: uma capa mais larga que o tronco, com as costuras dos gomos em volta; aberta, a
// camiseta aparece numa faixa no meio, com o bloco da estampa.
function jaquetaPuffer(f: Fabrica, a: Aparencia, p: NonNullable<Aparencia['puffer']>, corpo: THREE.Group) {
  const base = ALTURA_QUADRIL - 0.08
  const gomo = f.material(p.gomos)
  corpo.add(f.caixa(0.57, 0.66, 0.35, f.material(p.cor), { y: base }))
  for (let i = 1; i <= 3; i++) corpo.add(f.caixa(0.58, 0.02, 0.36, gomo, { y: base + i * 0.16 }))
  corpo.add(f.caixa(0.44, 0.07, 0.36, f.material(p.cor), { y: base + 0.62 }))
  if (!p.aberta) return
  corpo.add(f.caixa(0.15, 0.6, 0.012, f.material(a.camisa), { y: base + 0.02, z: 0.178 }))
  if (p.estampa) corpo.add(f.caixa(0.1, 0.16, 0.012, f.material(p.estampa), { y: base + 0.2, z: 0.186 }))
}

// Vestido longo: a saia desce do quadril até o tornozelo, um pouco mais larga na barra, e o
// decote em V de pele no peito.
function vestidoLongo(f: Fabrica, a: Aparencia, cor: string, corpo: THREE.Group) {
  const pano = f.material(cor)
  const pele = f.material(a.pele)
  const topo = ALTURA_QUADRIL - 0.04 + 0.62
  corpo.add(
    f.caixa(0.54, 0.6, 0.34, pano, { y: 0.18 }),
    f.caixa(0.58, 0.08, 0.38, pano, { y: 0.12 }),
    f.caixa(0.15, 0.09, 0.012, pele, { y: topo - 0.09, z: 0.151 }),
    f.caixa(0.08, 0.07, 0.012, pele, { y: topo - 0.16, z: 0.151 }),
  )
}

export interface OpcoesPersonagem {
  // Figurante: menos peças e sem sombra no mapa (só a redonda), para caber muitos no celular.
  leve?: boolean
  // Altura dos pés (em cima do patinete).
  elevacao?: number
  // Anel colorido no chão, para achar o jogador no meio da cena.
  anel?: string
}

export function criarPersonagem(f: Fabrica, a: Aparencia, opcoes: OpcoesPersonagem = {}): Personagem {
  const raiz = new THREE.Group()
  const corpo = new THREE.Group()
  const suporte = new THREE.Group()
  suporte.position.y = opcoes.elevacao ?? 0
  suporte.add(corpo)
  raiz.add(suporte)
  if (a.bonecoDeNeve) return bonecoDeNeve(f, a, a.bonecoDeNeve, raiz, corpo, opcoes)
  if (opcoes.leve) return personagemLeve(f, a, raiz, corpo)

  const pernaE = a.bermuda ? pernaDeBermuda(f, a, -1) : membro(f, a.calca, a.sapato, 0.2, 0.66, 0.12)
  const pernaD = a.bermuda ? pernaDeBermuda(f, a, 1) : membro(f, a.calca, a.sapato, 0.2, 0.66, 0.12)
  pernaE.position.set(-0.13, ALTURA_QUADRIL, 0)
  pernaD.position.set(0.13, ALTURA_QUADRIL, 0)
  if (a.solado) {
    for (const perna of [pernaE, pernaD]) perna.add(f.caixa(0.22, 0.04, 0.3, f.material(a.solado), { y: -0.66 - 0.072 - 0.02, z: 0.03 }))
  }

  const manga = a.puffer ? a.puffer.cor : a.jaquetaAberta ? a.jaquetaAberta.cor : a.regata ? a.pele : a.camisa
  const larguraBraco = a.puffer ? 0.19 : a.jaquetaAberta ? 0.17 : 0.15
  const curta = a.tatuagem || a.mangaCurta
  const bracoE = curta ? bracoTatuado(f, a, a.tatuagem ?? null, -1) : membro(f, manga, a.pele, larguraBraco, 0.5, 0.14)
  const bracoD = curta ? bracoTatuado(f, a, a.tatuagem ?? null, 1) : membro(f, manga, a.pele, larguraBraco, 0.5, 0.14)
  if (a.unhas) {
    const esmalte = f.material(a.unhas)
    for (const braco of [bracoE, bracoD]) braco.add(f.caixa(0.13, 0.035, 0.012, esmalte, { y: -0.58, z: 0.033 + larguraBraco * 0.7 }))
  }
  if (a.puffer) {
    const gomo = f.material(a.puffer.gomos)
    for (const braco of [bracoE, bracoD]) for (const y of [-0.17, -0.34]) braco.add(f.caixa(0.2, 0.02, 0.22, gomo, { y }))
  }
  bracoE.position.set(-0.34, ALTURA_OMBRO, 0)
  bracoD.position.set(0.34, ALTURA_OMBRO, 0)
  if (a.relogio) bracoE.add(f.caixa(0.18, 0.06, 0.19, f.material(a.relogio), { y: -0.44 }))

  const tronco = f.caixa(0.52, 0.62, 0.3, f.material(a.jaquetaAberta?.cor ?? a.camisa), { y: ALTURA_QUADRIL - 0.04 })
  const cabeca = f.caixa(0.4, 0.4, 0.38, f.material(a.pele), { y: ALTURA_OMBRO + 0.06 })
  const cabelo = f.caixa(0.44, 0.14, 0.42, f.material(a.cabelo), { y: ALTURA_OMBRO + 0.4 })
  const nuca = f.caixa(0.44, 0.3, 0.1, f.material(a.cabelo), { y: ALTURA_OMBRO + 0.18, z: -0.17 })
  const olho = f.material('#1c1c1c')
  corpo.add(pernaE, pernaD, bracoE, bracoD, tronco, cabeca)
  for (const lado of [-1, 1]) {
    // Amendoado: mais largo e mais baixo, reto. Inclinar o canto de fora deixa o rosto bravo.
    if (a.olhosAmendoados) corpo.add(f.caixa(0.08, 0.025, 0.02, olho, { x: lado * 0.09, y: ALTURA_OMBRO + 0.2425, z: 0.2 }))
    else corpo.add(f.caixa(0.06, 0.07, 0.02, olho, { x: lado * 0.09, y: ALTURA_OMBRO + 0.22, z: 0.2 }))
  }
  if (a.cabeloLongo) cabeloComprido(f, a, a.cabeloLongo.pontas, a.cabeloLongo.risca ?? false, corpo)
  else if (a.cabeloOmbro) cabeloAteOOmbro(f, a, a.cabeloOmbro.mechas, corpo)
  else if (!a.careca) corpo.add(cabelo, nuca)
  if (a.cacheado) cachos(f, a, corpo)
  if (a.jaquetaAberta) jaquetaPorCima(f, a, a.jaquetaAberta, corpo)
  if (a.puffer) jaquetaPuffer(f, a, a.puffer, corpo)
  if (a.vestido) vestidoLongo(f, a, a.vestido, corpo)
  if (a.camisaSocial) camisaDeBotao(f, a, a.camisaSocial, corpo)
  if (a.cachecol) cachecol(f, a.cachecol, corpo)
  if (a.bone) bone(f, a.bone, corpo)
  if (a.sorriso) {
    corpo.add(
      f.caixa(0.2, 0.075, 0.01, olho, { y: ALTURA_OMBRO + 0.09, z: 0.192 }),
      f.caixa(0.17, 0.045, 0.012, f.material(a.sorriso), { y: ALTURA_OMBRO + 0.115, z: 0.196 }),
    )
  }
  if (a.regata) blusaRegata(f, a, corpo)
  if (a.brincos) {
    const ouro = f.material(a.brincos)
    for (const lado of [-1, 1]) corpo.add(f.caixa(0.035, 0.04, 0.03, ouro, { x: lado * 0.2, y: ALTURA_OMBRO + 0.12, z: 0.135 }))
  }
  detalhesDoRosto(f, a, corpo)
  if (a.barba && a.barbaGrisalha) fiosGrisalhos(f, a.barbaGrisalha, corpo)
  if (a.estampa) {
    const placa = estampa(f, a.estampa.texto, a.estampa.cor, 0.36)
    placa.position.set(0, ALTURA_QUADRIL + 0.42, 0.151)
    corpo.add(placa)
  }
  if (a.estampaChamas) {
    const placa = estampaChamas(f, a.estampaChamas.chama, a.estampaChamas.moldura, 0.38)
    placa.position.set(0, ALTURA_QUADRIL + 0.33, 0.151)
    corpo.add(placa)
  }
  if (a.detalhe) corpo.add(f.caixa(0.08, 0.36, 0.02, f.material(a.detalhe), { y: ALTURA_QUADRIL + 0.18, z: 0.16 }))

  // Sombra redonda embaixo: com a luz do alto, a do mapa de sombras some sob o próprio corpo.
  const sombra = f.plano(0.7, 0.7, f.guardar(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 })))
  sombra.rotation.x = -Math.PI / 2
  sombra.position.y = 0.03
  sombra.receiveShadow = false
  raiz.add(sombra)
  let anel: THREE.Mesh | undefined
  if (opcoes.anel) {
    anel = new THREE.Mesh(
      f.guardar(new THREE.RingGeometry(0.4, 0.5, 28)),
      f.guardar(new THREE.MeshBasicMaterial({ color: opcoes.anel, transparent: true, opacity: 0.8, depthWrite: false })),
    )
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.035
    raiz.add(anel)
  }

  return { raiz, corpo, pernas: [pernaE, pernaD], bracos: [bracoE, bracoD], angulo: 0, anel }
}

// Boneco de neve com os mesmos pivôs dos outros: as pernas são dois tocos de neve que saem por
// baixo da bola de baixo no passo, e os braços de galho balançam no ombro. O galho abre para fora
// num grupo de dentro, porque `zerarPoses` zera o z do pivô a cada quadro.
function bonecoDeNeve(
  f: Fabrica,
  a: Aparencia,
  b: NonNullable<Aparencia['bonecoDeNeve']>,
  raiz: THREE.Group,
  corpo: THREE.Group,
  opcoes: OpcoesPersonagem,
): Personagem {
  const neve = f.material(b.neve)
  const carvao = f.material(b.carvao)
  const galho = f.material(b.galho)
  const bola = (raio: number, y: number) => {
    const m = new THREE.Mesh(f.guardar(new THREE.IcosahedronGeometry(raio, 1)), neve)
    m.position.y = y
    m.castShadow = true
    m.receiveShadow = true
    return m
  }
  const pernas = [-1, 1].map((lado) => {
    const pivo = new THREE.Group()
    pivo.position.set(lado * 0.14, 0.34, 0)
    pivo.add(f.caixa(0.18, 0.34, 0.24, neve, { y: -0.34, z: 0.04 }))
    return pivo
  }) as [THREE.Group, THREE.Group]
  const bracos = [-1, 1].map((lado) => {
    const pivo = new THREE.Group()
    pivo.position.set(lado * 0.27, 1.12, 0)
    const aberto = new THREE.Group()
    aberto.rotation.z = lado * 0.9
    const graveto = f.caixa(0.03, 0.14, 0.03, galho, { x: lado * 0.04, y: -0.4, z: 0.02 })
    graveto.rotation.z = lado * -0.7
    aberto.add(f.caixa(0.045, 0.5, 0.045, galho, { y: -0.5 }), graveto)
    pivo.add(aberto)
    return pivo
  }) as [THREE.Group, THREE.Group]
  const cenoura = new THREE.Mesh(f.guardar(new THREE.ConeGeometry(0.045, 0.22, 6)), f.material(b.cenoura))
  cenoura.rotation.x = Math.PI / 2
  cenoura.position.set(0, 1.42, 0.3)
  corpo.add(...pernas, ...bracos, bola(0.42, 0.44), bola(0.31, 0.98), bola(0.24, 1.44), cenoura)
  for (const lado of [-1, 1]) {
    corpo.add(f.caixa(0.06, 0.06, 0.04, carvao, { x: lado * 0.09, y: 1.48, z: 0.2 }))
    corpo.add(f.caixa(0.035, 0.035, 0.03, carvao, { x: lado * 0.075, y: 1.32, z: 0.205 }))
  }
  corpo.add(f.caixa(0.035, 0.035, 0.03, carvao, { y: 1.3, z: 0.215 }))
  for (const [y, z] of [[1.1, 0.27], [0.97, 0.3], [0.84, 0.28], [0.6, 0.39]] as const) {
    corpo.add(f.caixa(0.06, 0.06, 0.04, carvao, { y, z }))
  }
  if (a.cachecol) {
    const la = f.material(a.cachecol)
    corpo.add(
      f.caixa(0.44, 0.08, 0.42, la, { y: 1.2 }),
      f.caixa(0.09, 0.3, 0.03, la, { x: 0.1, y: 0.94, z: 0.27 }),
    )
  }
  const sombra = f.plano(0.9, 0.9, f.guardar(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 })))
  sombra.rotation.x = -Math.PI / 2
  sombra.position.y = 0.03
  sombra.receiveShadow = false
  raiz.add(sombra)
  let anel: THREE.Mesh | undefined
  if (opcoes.anel) {
    anel = new THREE.Mesh(
      f.guardar(new THREE.RingGeometry(0.5, 0.6, 28)),
      f.guardar(new THREE.MeshBasicMaterial({ color: opcoes.anel, transparent: true, opacity: 0.8, depthWrite: false })),
    )
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.035
    raiz.add(anel)
  }
  return { raiz, corpo, pernas, bracos, angulo: 0, anel }
}

function personagemLeve(f: Fabrica, a: Aparencia, raiz: THREE.Group, corpo: THREE.Group): Personagem {
  const membroLeve = (cor: string, largura: number, comprimento: number, x: number, y: number) => {
    const pivo = new THREE.Group()
    pivo.add(f.caixa(largura, comprimento, largura * 1.1, f.material(cor), { y: -comprimento }))
    pivo.position.set(x, y, 0)
    return pivo
  }
  const pernaE = membroLeve(a.calca, 0.2, 0.76, -0.13, ALTURA_QUADRIL)
  const pernaD = membroLeve(a.calca, 0.2, 0.76, 0.13, ALTURA_QUADRIL)
  const bracoE = membroLeve(a.camisa, 0.15, 0.62, -0.34, ALTURA_OMBRO)
  const bracoD = membroLeve(a.camisa, 0.15, 0.62, 0.34, ALTURA_OMBRO)
  corpo.add(
    pernaE,
    pernaD,
    bracoE,
    bracoD,
    f.caixa(0.52, 0.62, 0.3, f.material(a.detalhe ?? a.camisa), { y: ALTURA_QUADRIL - 0.04 }),
    f.caixa(0.4, 0.4, 0.38, f.material(a.pele), { y: ALTURA_OMBRO + 0.06 }),
    f.caixa(0.44, 0.16, 0.42, f.material(a.cabelo), { y: ALTURA_OMBRO + 0.38, z: -0.02 }),
  )
  corpo.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false
  })
  const sombra = f.plano(0.7, 0.7, f.material('#000000', { transparente: 0.18 }))
  sombra.rotation.x = -Math.PI / 2
  sombra.position.y = 0.03
  sombra.receiveShadow = false
  raiz.add(sombra)
  return { raiz, corpo, pernas: [pernaE, pernaD], bracos: [bracoE, bracoD], angulo: 0 }
}

/** Patinete elétrico, frente para +z: prancha, duas rodas, guidão. Fica na raiz do personagem. */
export function criarPatinete(f: Fabrica, cor: string, detalhe: string): THREE.Group {
  const g = new THREE.Group()
  const quadro = f.material(cor)
  const roda = f.material('#141414')
  g.add(
    f.caixa(0.18, 0.06, 0.9, quadro, { y: 0.1 }),
    f.caixa(0.1, 0.16, 0.16, roda, { y: 0.02, z: 0.42 }),
    f.caixa(0.1, 0.16, 0.16, roda, { y: 0.02, z: -0.42 }),
    f.caixa(0.06, 1.05, 0.06, quadro, { y: 0.12, z: 0.46 }),
    f.caixa(0.56, 0.05, 0.05, quadro, { y: 1.15, z: 0.46 }),
    f.caixa(0.19, 0.02, 0.5, f.material(detalhe), { y: 0.16 }),
  )
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = false
  })
  return g
}

/** Ângulo em y para olhar na direção (dx, dz) do mundo. */
export function anguloDaDirecao(dx: number, dz: number): number {
  return Math.atan2(dx, dz)
}

/**
 * Pose do quadro. `fase` em radianos (o passo), `andando` liga o balanço, `tempo` em segundos faz
 * a respiração de quem está parado, `dt` suaviza o giro. Correndo, a passada abre mais, os braços
 * dobram mais e o corpo inclina para a frente.
 */
export function animarPersonagem(
  p: Personagem,
  fase: number,
  andando: boolean,
  tempo: number,
  anguloAlvo: number,
  dt: number,
  correndo = false,
) {
  const balanco = andando ? Math.sin(fase) : 0
  const perna = correndo ? 1 : 0.7
  const braco = correndo ? 1.1 : 0.6
  p.pernas[0].rotation.x = balanco * perna
  p.pernas[1].rotation.x = -balanco * perna
  p.bracos[0].rotation.x = -balanco * braco
  p.bracos[1].rotation.x = balanco * braco
  const inclinacao = correndo ? 0.22 : 0
  p.corpo.rotation.x += (inclinacao - p.corpo.rotation.x) * Math.min(1, dt * 10)
  p.corpo.position.y = andando ? Math.abs(Math.cos(fase)) * (correndo ? 0.11 : 0.06) : Math.sin(tempo * 2.2) * 0.012

  let delta = anguloAlvo - p.angulo
  delta = Math.atan2(Math.sin(delta), Math.cos(delta))
  p.angulo += delta * Math.min(1, dt * 14)
  p.raiz.rotation.y = p.angulo
}

// Meia espessura do corpo deitado: sem ela, o tronco afunda pela metade no chão.
const ERGUER_DEITADO = 0.2

/**
 * Atropelado, por cima da pose de `animarPersonagem`. `queda` vai de 0 (de pé) a 1 (deitado de
 * costas, para trás, pelos pés). Caindo, os braços sobem e uma perna chuta; no chão, braços
 * abertos e respiração; levantando, os braços empurram o chão.
 */
export function animarTombo(
  p: Personagem,
  fase: 'caindo' | 'no-chao' | 'levantando',
  queda: number,
  tempo: number,
  // Altura dos pés de pé (piloto no patinete): deitado, ele fica no chão, não na prancha.
  elevacao = 0,
) {
  p.corpo.rotation.x = (-Math.PI / 2) * queda
  p.corpo.position.y = (ERGUER_DEITADO - elevacao) * queda + (fase === 'no-chao' ? Math.sin(tempo * 3) * 0.01 : 0)
  const abrir = fase === 'levantando' ? 0.25 * queda : 0.55 * queda
  const bracoX = fase === 'levantando' ? 0.7 * queda : -2.6 * queda
  p.bracos[0].rotation.set(bracoX, 0, -abrir)
  p.bracos[1].rotation.set(bracoX, 0, abrir)
  const chute = fase === 'caindo' ? 0.9 * queda : fase === 'no-chao' ? 0.25 : 0.3 * queda
  p.pernas[0].rotation.set(-chute, 0, -0.12 * queda)
  p.pernas[1].rotation.set(-0.15 * queda, 0, 0.12 * queda)
}

// `animarPersonagem` só mexe em x: o abrir de braços e pernas do tombo e o giro do tronco do
// soco precisam voltar a zero.
export function zerarPoses(p: Personagem) {
  for (const m of [...p.bracos, ...p.pernas]) m.rotation.z = 0
  p.corpo.rotation.y = 0
}

// Braço puxado para trás (x > 0) e o soco esticado para a frente, na altura do ombro.
const BRACO_PUXADO = 0.9
const BRACO_ESTICADO = -1.65
const GIRO_PUXADO = 0.4
const GIRO_GOLPE = -0.35
// Fração do golpe gasta esticando; o resto recolhe.
const FRACAO_ESTICAR = 0.25

/**
 * Soco, por cima de `animarPersonagem`. `preparo` é a fração do puxar o braço (0 a 1) até o
 * impacto; depois, `golpe` vai de 0 a 1: estica rápido e recolhe. O outro braço fica na guarda.
 */
export function animarSoco(p: Personagem, preparo: number, golpe: number) {
  const [guarda, punho] = p.bracos
  if (golpe <= 0) {
    punho.rotation.x = BRACO_PUXADO * preparo
    p.corpo.rotation.y = GIRO_PUXADO * preparo
    guarda.rotation.x = -0.7 * preparo
    return
  }
  if (golpe < FRACAO_ESTICAR) {
    const u = golpe / FRACAO_ESTICAR
    punho.rotation.x = BRACO_PUXADO + (BRACO_ESTICADO - BRACO_PUXADO) * u
    p.corpo.rotation.y = GIRO_PUXADO + (GIRO_GOLPE - GIRO_PUXADO) * u
  } else {
    const u = 1 - (golpe - FRACAO_ESTICAR) / (1 - FRACAO_ESTICAR)
    punho.rotation.x = BRACO_ESTICADO * u
    p.corpo.rotation.y = GIRO_GOLPE * u
  }
  guarda.rotation.x = -0.7
}

// Chute: a perna direita vai para trás (rotação x positiva leva o pé para -z), dispara para a
// frente no impacto e volta; o corpo inclina para trás e os braços abrem para equilibrar.
const PERNA_ATRAS = 0.8
const PERNA_CHUTE = -1.35
const INCLINA_CHUTE = -0.12

/** `t` de 0 a 1 no chute inteiro; `impacto` é a fração de `t` em que o pé encontra a bola. */
export function animarChute(p: Personagem, t: number, impacto: number) {
  const perna = p.pernas[1]
  let angulo: number
  if (t < impacto) angulo = PERNA_ATRAS * (t / impacto)
  else {
    const u = (t - impacto) / (1 - impacto)
    // Estica rápido no primeiro terço e recolhe devagar.
    angulo = u < 0.3 ? PERNA_ATRAS + (PERNA_CHUTE - PERNA_ATRAS) * (u / 0.3) : PERNA_CHUTE * (1 - (u - 0.3) / 0.7)
  }
  perna.rotation.x = angulo
  p.pernas[0].rotation.x = 0
  const abre = Math.sin(Math.PI * t)
  p.bracos[0].rotation.z = -0.6 * abre
  p.bracos[1].rotation.z = 0.6 * abre
  p.bracos[0].rotation.x = 0.4 * abre
  p.bracos[1].rotation.x = -0.3 * abre
  p.corpo.rotation.x = INCLINA_CHUTE * abre
}
