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
function bracoTatuado(f: Fabrica, a: Aparencia, tinta: string, lado: -1 | 1): THREE.Group {
  const pivo = new THREE.Group()
  const l = 0.15
  const comprimento = 0.5
  const manga = 0.16
  const pele = f.material(a.pele)
  const t = f.material(tinta)
  pivo.add(
    f.caixa(l * 1.18, manga, l * 1.25, f.material(a.camisa), { y: -manga }),
    f.caixa(l, comprimento - manga, l * 1.1, pele, { y: -comprimento }),
    f.caixa(l * 1.05, 0.14, l * 1.4, pele, { y: -comprimento - 0.084, z: 0.03 }),
  )
  const anel = (y: number, altura: number) => f.caixa(l + 0.012, altura, l * 1.1 + 0.012, t, { y: -y })
  if (lado < 0) {
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
  if (opcoes.leve) return personagemLeve(f, a, raiz, corpo)

  const pernaE = membro(f, a.calca, a.sapato, 0.2, 0.66, 0.12)
  const pernaD = membro(f, a.calca, a.sapato, 0.2, 0.66, 0.12)
  pernaE.position.set(-0.13, ALTURA_QUADRIL, 0)
  pernaD.position.set(0.13, ALTURA_QUADRIL, 0)

  const bracoE = a.tatuagem ? bracoTatuado(f, a, a.tatuagem, -1) : membro(f, a.camisa, a.pele, 0.15, 0.5, 0.14)
  const bracoD = a.tatuagem ? bracoTatuado(f, a, a.tatuagem, 1) : membro(f, a.camisa, a.pele, 0.15, 0.5, 0.14)
  bracoE.position.set(-0.34, ALTURA_OMBRO, 0)
  bracoD.position.set(0.34, ALTURA_OMBRO, 0)

  const tronco = f.caixa(0.52, 0.62, 0.3, f.material(a.camisa), { y: ALTURA_QUADRIL - 0.04 })
  const cabeca = f.caixa(0.4, 0.4, 0.38, f.material(a.pele), { y: ALTURA_OMBRO + 0.06 })
  const cabelo = f.caixa(0.44, 0.14, 0.42, f.material(a.cabelo), { y: ALTURA_OMBRO + 0.4 })
  const nuca = f.caixa(0.44, 0.3, 0.1, f.material(a.cabelo), { y: ALTURA_OMBRO + 0.18, z: -0.17 })
  const olho = f.material('#1c1c1c')
  corpo.add(
    pernaE,
    pernaD,
    bracoE,
    bracoD,
    tronco,
    cabeca,
    cabelo,
    nuca,
    f.caixa(0.06, 0.07, 0.02, olho, { x: -0.09, y: ALTURA_OMBRO + 0.22, z: 0.2 }),
    f.caixa(0.06, 0.07, 0.02, olho, { x: 0.09, y: ALTURA_OMBRO + 0.22, z: 0.2 }),
  )
  if (a.detalhe) corpo.add(f.caixa(0.08, 0.36, 0.02, f.material(a.detalhe), { y: ALTURA_QUADRIL + 0.18, z: 0.16 }))

  // Sombra redonda embaixo: com a luz do alto, a do mapa de sombras some sob o próprio corpo.
  const sombra = f.plano(0.7, 0.7, f.guardar(new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.18 })))
  sombra.rotation.x = -Math.PI / 2
  sombra.position.y = 0.03
  sombra.receiveShadow = false
  raiz.add(sombra)
  if (opcoes.anel) {
    const anel = new THREE.Mesh(
      f.guardar(new THREE.RingGeometry(0.4, 0.5, 28)),
      f.guardar(new THREE.MeshBasicMaterial({ color: opcoes.anel, transparent: true, opacity: 0.8, depthWrite: false })),
    )
    anel.rotation.x = -Math.PI / 2
    anel.position.y = 0.035
    raiz.add(anel)
  }

  return { raiz, corpo, pernas: [pernaE, pernaD], bracos: [bracoE, bracoD], angulo: 0 }
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
