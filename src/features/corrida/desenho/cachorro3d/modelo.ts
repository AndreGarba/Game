import {
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
  type Material,
} from 'three'
import { bolaDePelo, cordaDePelo } from './pelo.ts'

// Cachorro peludo creme (shih tzu) de PRD/referencias/cachorro-andando.webp, montado em
// código. Unidades em metros, como o motor: pés em y = 0, olhando para +x, centro da caixa de
// colisão (CACHORRO_LARGURA = 0,9 m) em x = 0.

export const COR_3D = {
  pelo: '#efe2c9',
  peloPonta: '#fdf8ee',
  peloOrelha: '#e6d3b1',
  peloOrelhaPonta: '#f8eedd',
  barba: '#8f8274',
  barbaPonta: '#c9bba6',
  nariz: '#1c1715',
  olho: '#140e0c',
  brilho: '#ffffff',
  lingua: '#e27682',
  peitoral: '#1d1517',
  peitoralDetalhe: '#b3262f',
  lama: '#6e4828',
} as const

export interface Perna {
  coxa: Group
  canela: Group
  dianteira: boolean
}

export interface ModeloCachorro {
  raiz: Group
  corpo: Group
  cabeca: Group
  orelhas: [Group, Group]
  rabo: Group
  lingua: Mesh
  pernas: Perna[]
  manchas: Mesh[]
  materialPelo: MeshStandardMaterial
  descartar(): void
}

export function criarModeloCachorro(): ModeloCachorro {
  const geometrias: BufferGeometry[] = []
  const materiais: Material[] = []
  const geo = <T extends BufferGeometry>(g: T) => {
    geometrias.push(g)
    return g
  }
  const mat = <T extends Material>(m: T) => {
    materiais.push(m)
    return m
  }

  // Cor de verdade fica nos vértices; a cor do material tinge tudo (é por ela que a lama entra).
  const materialPelo = mat(new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 }))
  const pelo = (g: BufferGeometry) => new Mesh(geo(g), materialPelo)

  const raiz = new Group()
  const corpo = new Group()
  corpo.position.set(0, 0.5, 0)
  raiz.add(corpo)

  // Tronco: barril peludo com franja na barriga.
  const tronco = pelo(
    bolaDePelo({
      raio: [0.4, 0.24, 0.22],
      cor: COR_3D.pelo,
      corPonta: COR_3D.peloPonta,
      // Saia de pelo comprido: esconde metade das pernas, como no shih tzu da referência.
      caimento: 0.17,
      mechas: 280,
      mechaComprimento: 0.13,
      mechaCaimento: 0.75,
      semente: 3,
    }),
  )
  corpo.add(tronco)
  const peito = pelo(
    bolaDePelo({ raio: [0.21, 0.25, 0.21], cor: COR_3D.pelo, corPonta: COR_3D.peloPonta, caimento: 0.08, mechas: 120, mechaComprimento: 0.1, semente: 5 }),
  )
  peito.position.set(0.25, 0.02, 0)
  corpo.add(peito)
  const garupa = pelo(
    bolaDePelo({ raio: [0.22, 0.23, 0.21], cor: COR_3D.pelo, corPonta: COR_3D.peloPonta, caimento: 0.06, mechas: 110, mechaComprimento: 0.1, semente: 7 }),
  )
  garupa.position.set(-0.27, 0.03, 0)
  corpo.add(garupa)

  // Peitoral preto com estampa vermelha: anel no peito e alça diagonal sobre o ombro.
  const materialPeitoral = mat(new MeshStandardMaterial({ color: COR_3D.peitoral, roughness: 0.55 }))
  const materialDetalhe = mat(new MeshStandardMaterial({ color: COR_3D.peitoralDetalhe, roughness: 0.5 }))
  const anel = new Mesh(geo(new TorusGeometry(0.235, 0.028, 8, 40)), materialPeitoral)
  anel.rotation.set(0, Math.PI / 2, 0.42)
  anel.position.set(0.17, 0.02, 0)
  corpo.add(anel)
  const anelDetalhe = new Mesh(geo(new TorusGeometry(0.236, 0.012, 6, 40)), materialDetalhe)
  anelDetalhe.rotation.copy(anel.rotation)
  anelDetalhe.position.copy(anel.position)
  anelDetalhe.scale.setScalar(1.04)
  corpo.add(anelDetalhe)
  const colar = new Mesh(geo(new TorusGeometry(0.17, 0.025, 8, 36)), materialPeitoral)
  colar.rotation.set(0, Math.PI / 2, -0.5)
  colar.position.set(0.36, 0.12, 0)
  corpo.add(colar)
  const colarDetalhe = new Mesh(geo(new TorusGeometry(0.172, 0.011, 6, 36)), materialDetalhe)
  colarDetalhe.rotation.copy(colar.rotation)
  colarDetalhe.position.copy(colar.position)
  colarDetalhe.scale.setScalar(1.05)
  corpo.add(colarDetalhe)

  // Pernas: duas peças (coxa e canela) para dobrar o joelho no passo. Pivôs no ombro e no quadril.
  const pernas: Perna[] = []
  const posicoesPerna: [number, number, boolean][] = [
    [0.27, 0.12, true],
    [0.27, -0.12, true],
    [-0.27, 0.12, false],
    [-0.27, -0.12, false],
  ]
  posicoesPerna.forEach(([x, z, dianteira], i) => {
    const coxa = new Group()
    coxa.position.set(x, -0.08, z)
    const pelagemCoxa = pelo(
      bolaDePelo({
        raio: [0.1, 0.15, 0.095],
        cor: COR_3D.pelo,
        corPonta: COR_3D.peloPonta,
        caimento: 0.03,
        mechas: 45,
        mechaComprimento: 0.07,
        mechaCaimento: 0.85,
        detalhe: 4,
        semente: 20 + i,
      }),
    )
    pelagemCoxa.position.set(0, -0.1, 0)
    coxa.add(pelagemCoxa)
    const canela = new Group()
    canela.position.set(0, -0.2, 0)
    coxa.add(canela)
    const pelagemCanela = pelo(
      bolaDePelo({
        raio: [0.08, 0.1, 0.075],
        cor: COR_3D.pelo,
        corPonta: COR_3D.peloPonta,
        caimento: 0.03,
        mechas: 34,
        mechaComprimento: 0.06,
        mechaCaimento: 0.9,
        detalhe: 4,
        semente: 30 + i,
      }),
    )
    pelagemCanela.position.set(0, -0.08, 0)
    canela.add(pelagemCanela)
    const pata = pelo(
      bolaDePelo({ raio: [0.075, 0.05, 0.065], cor: COR_3D.pelo, corPonta: COR_3D.peloPonta, volume: 0.08, detalhe: 3, semente: 40 + i }),
    )
    pata.position.set(0.025, -0.17, 0)
    canela.add(pata)
    corpo.add(coxa)
    pernas.push({ coxa, canela, dianteira })
  })

  // Cabeça: crânio grande e redondo, focinho curto, barba acinzentada, orelhas compridas.
  const cabeca = new Group()
  cabeca.position.set(0.4, 0.2, 0)
  corpo.add(cabeca)
  const cranio = pelo(
    bolaDePelo({
      raio: [0.23, 0.22, 0.22],
      cor: COR_3D.pelo,
      corPonta: COR_3D.peloPonta,
      volume: 0.2,
      caimento: 0.04,
      mechas: 170,
      mechaComprimento: 0.09,
      mechaCaimento: 0.55,
      // Cara com pelo curto: sem mechas na frente, senão cobrem olhos e focinho.
      filtro: [-1, 0, 0],
      filtroMin: -0.35,
      semente: 50,
    }),
  )
  cranio.position.set(0.05, 0.13, 0)
  cabeca.add(cranio)
  const topete = pelo(
    bolaDePelo({ raio: [0.15, 0.09, 0.14], cor: COR_3D.peloPonta, corPonta: '#ffffff', volume: 0.25, mechas: 60, mechaComprimento: 0.08, mechaCaimento: 0.9, fluxo: [-1, -0.3, 0], semente: 51 }),
  )
  topete.position.set(0.02, 0.31, 0)
  topete.rotation.z = 0.25
  cabeca.add(topete)
  const focinho = pelo(
    bolaDePelo({ raio: [0.1, 0.085, 0.11], cor: COR_3D.pelo, corPonta: COR_3D.peloPonta, volume: 0.12, detalhe: 4, mechas: 40, mechaComprimento: 0.05, semente: 52 }),
  )
  focinho.position.set(0.24, 0.06, 0)
  cabeca.add(focinho)
  const barba = pelo(
    bolaDePelo({
      raio: [0.09, 0.08, 0.1],
      cor: COR_3D.barba,
      corPonta: COR_3D.barbaPonta,
      caimento: 0.06,
      detalhe: 4,
      mechas: 50,
      mechaComprimento: 0.06,
      mechaCaimento: 0.9,
      semente: 53,
    }),
  )
  barba.position.set(0.26, -0.01, 0)
  cabeca.add(barba)
  // Bochechas: o "bigode" comprido que desce dos lados do focinho.
  for (const lado of [1, -1]) {
    const bochecha = pelo(
      bolaDePelo({
        raio: [0.08, 0.09, 0.07],
        cor: COR_3D.pelo,
        corPonta: COR_3D.peloPonta,
        caimento: 0.07,
        detalhe: 4,
        mechas: 45,
        mechaComprimento: 0.08,
        mechaCaimento: 1,
        fluxo: [-0.3, -1, 0],
        semente: 54 + lado,
      }),
    )
    bochecha.position.set(0.19, 0.02, 0.12 * lado)
    cabeca.add(bochecha)
  }

  const nariz = new Mesh(geo(new SphereGeometry(0.042, 16, 12)), mat(new MeshStandardMaterial({ color: COR_3D.nariz, roughness: 0.3 })))
  nariz.scale.set(0.9, 0.8, 1.1)
  nariz.position.set(0.37, 0.09, 0)
  cabeca.add(nariz)

  const materialOlho = mat(new MeshStandardMaterial({ color: COR_3D.olho, roughness: 0.12 }))
  const materialBrilho = mat(new MeshBasicMaterial({ color: COR_3D.brilho }))
  for (const lado of [1, -1]) {
    const olho = new Mesh(geo(new SphereGeometry(0.042, 16, 12)), materialOlho)
    olho.scale.set(0.8, 1, 1)
    olho.position.set(0.245, 0.155, 0.105 * lado)
    cabeca.add(olho)
    const brilho = new Mesh(geo(new SphereGeometry(0.011, 8, 6)), materialBrilho)
    brilho.position.set(0.275, 0.175, 0.118 * lado)
    cabeca.add(brilho)
  }

  // Língua de fora, balança com o passo.
  const lingua = new Mesh(geo(new CapsuleGeometry(0.034, 0.07, 4, 10)), mat(new MeshStandardMaterial({ color: COR_3D.lingua, roughness: 0.4 })))
  lingua.scale.set(1, 1, 0.55)
  lingua.position.set(0.31, -0.07, 0.05)
  lingua.rotation.z = 0.35
  cabeca.add(lingua)

  const orelhas: Group[] = []
  for (const lado of [1, -1]) {
    const orelha = new Group()
    orelha.position.set(0.0, 0.23, 0.17 * lado)
    const pelagem = pelo(
      bolaDePelo({
        raio: [0.09, 0.2, 0.06],
        cor: COR_3D.peloOrelha,
        corPonta: COR_3D.peloOrelhaPonta,
        volume: 0.2,
        caimento: 0.08,
        mechas: 80,
        mechaComprimento: 0.09,
        mechaCaimento: 0.9,
        semente: 60 + lado,
      }),
    )
    pelagem.position.set(-0.01, -0.17, 0.03 * lado)
    orelha.add(pelagem)
    cabeca.add(orelha)
    orelhas.push(orelha)
  }

  // Rabo: pluma enrolada por cima do lombo.
  const rabo = new Group()
  rabo.position.set(-0.42, 0.12, 0)
  corpo.add(rabo)
  const plumas = cordaDePelo(
    [
      [0, 0, 0],
      [-0.06, 0.1, 0],
      [-0.06, 0.21, 0],
      [0.0, 0.29, 0],
      [0.09, 0.3, 0],
      [0.15, 0.24, 0],
    ],
    [0.08, 0.1, 0.12, 0.12, 0.11, 0.09],
    { cor: COR_3D.pelo, corPonta: COR_3D.peloPonta, volume: 0.25, mechas: 40, mechaComprimento: 0.09, mechaCaimento: 1, fluxo: [-0.6, -1, 0], detalhe: 3, semente: 70 },
  )
  rabo.add(pelo(plumas))

  // Lama: uma mancha por nível de sujeira, sempre no mesmo lugar.
  const materialLama = mat(new MeshStandardMaterial({ color: COR_3D.lama, roughness: 1 }))
  const posicoesLama: [Group, number, number, number, number][] = [
    [corpo, -0.15, -0.12, 0.2, 0.09],
    [corpo, 0.12, 0.05, 0.22, 0.08],
    [corpo, -0.32, 0.12, 0.18, 0.08],
    [corpo, 0.2, -0.18, 0.18, 0.07],
    [cabeca, 0.12, 0.25, 0.17, 0.07],
  ]
  const manchas = posicoesLama.map(([pai, x, y, z, r], i) => {
    const mancha = new Mesh(geo(bolaDePelo({ raio: [r, r * 0.7, r * 0.35], cor: COR_3D.lama, volume: 0.3, detalhe: 3, semente: 80 + i })), materialLama)
    mancha.position.set(x, y, z)
    mancha.visible = false
    pai.add(mancha)
    return mancha
  })

  raiz.traverse((o) => {
    o.frustumCulled = false
  })

  return {
    raiz,
    corpo,
    cabeca,
    orelhas: orelhas as [Group, Group],
    rabo,
    lingua,
    pernas,
    manchas,
    materialPelo,
    descartar() {
      for (const g of geometrias) g.dispose()
      for (const m of materiais) m.dispose()
    },
  }
}

export const TINTA_LIMPA = new Color('#ffffff')
export const TINTA_SUJA = new Color('#b39478')
