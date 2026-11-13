import * as THREE from 'three'
import type { Solido } from '../../../engine/rpg/index.ts'
import { COR_CARRO, COR_OBJETO as C, COR_PREDIO, COR_TELHADO } from '../visual/paleta.ts'
import type { Fabrica } from './fabrica.ts'
import { fachadaProcedural, lateralProcedural, texturaDoSlot } from './texturas.ts'

// Um construtor por `visual` do mapa. Cada um monta o modelo no espaço local: base em y = 0,
// centrado, frente para +z, comprimento `l` em x e profundidade `p` em z. Quem chama gira pelo
// `giro` do sólido e põe no lugar. Visual sem construtor vira caixa cinza: dá para mapear antes
// de modelar.

type Construtor = (f: Fabrica, l: number, a: number, p: number, variante: string | undefined) => THREE.Object3D

function grupo(...filhos: THREE.Object3D[]): THREE.Group {
  const g = new THREE.Group()
  g.add(...filhos)
  return g
}

const predio: Construtor = (f, l, a, p, variante = 'residencial') => {
  const cores = COR_PREDIO[variante] ?? COR_PREDIO.residencial!
  const arteFachada = texturaDoSlot('fachadas', variante)
  const frente = f.materialComTextura(arteFachada ?? f.guardar(fachadaProcedural(variante, l, a)))
  const lado = f.materialComTextura(f.guardar(lateralProcedural(variante, p, a)))
  const teto = f.material(COR_TELHADO)
  const base = f.material(cores.parede)
  // Ordem do BoxGeometry: +x, −x, +y, −y, +z, −z.
  const corpo = f.caixa(l, a, p, [lado, lado, teto, base, frente, base])
  const borda = f.material(cores.detalhe)
  const e = 0.25
  return grupo(
    corpo,
    // Platibanda: só a borda do telhado, para o teto continuar aparecendo de cima.
    f.caixa(l + 0.1, 0.35, e, borda, { y: a, z: p / 2 - e / 2 + 0.05 }),
    f.caixa(l + 0.1, 0.35, e, borda, { y: a, z: -p / 2 + e / 2 - 0.05 }),
    f.caixa(e, 0.35, p, borda, { x: l / 2 - e / 2 + 0.05, y: a }),
    f.caixa(e, 0.35, p, borda, { x: -l / 2 + e / 2 - 0.05, y: a }),
    f.caixa(1.2, 0.7, 1, f.material(C.metal), { x: l * 0.25, y: a, z: -p * 0.2 }),
  )
}

const carro: Construtor = (f, l, a, p, variante = 'vermelho') => {
  const pintura = f.material(COR_CARRO[variante] ?? COR_CARRO.vermelho!)
  const vidro = f.material(C.vidro)
  const g = grupo(
    f.caixa(l, a * 0.42, p, pintura, { y: a * 0.18 }),
    f.caixa(l * 0.52, a * 0.36, p * 0.9, vidro, { x: -l * 0.06, y: a * 0.6 }),
    f.caixa(l * 0.5, a * 0.06, p * 0.92, pintura, { x: -l * 0.06, y: a * 0.94 }),
    f.caixa(0.08, 0.16, 0.32, f.material(C.farol, { emissivo: true }), { x: l / 2, y: a * 0.38, z: p * 0.3 }),
    f.caixa(0.08, 0.16, 0.32, f.material(C.farol, { emissivo: true }), { x: l / 2, y: a * 0.38, z: -p * 0.3 }),
  )
  const pneu = f.material(C.pneu)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const roda = f.cilindro(0.34, 0.26, pneu, 10)
      roda.rotation.x = Math.PI / 2
      roda.position.set(sx * l * 0.32, 0.34, sz * (p / 2 - 0.1))
      g.add(roda)
    }
  }
  return g
}

const arvore: Construtor = (f, _l, a) => {
  const tronco = f.cilindro(0.16, a * 0.45, f.material(C.tronco), 6)
  tronco.position.y = a * 0.225
  const copa = f.bola(1.25, f.material(C.folha))
  copa.position.y = a * 0.62
  const copa2 = f.bola(0.85, f.material(C.folhaClara))
  copa2.position.set(0.35, a * 0.85, 0.2)
  return grupo(tronco, copa, copa2)
}

const poste: Construtor = (f, _l, a) => {
  const haste = f.cilindro(0.08, a, f.material(C.metalEscuro), 6)
  haste.position.y = a / 2
  return grupo(
    haste,
    f.caixa(0.1, 0.1, 1.1, f.material(C.metalEscuro), { y: a - 0.1, z: 0.5 }),
    f.caixa(0.3, 0.15, 0.4, f.material(C.lampada, { emissivo: true }), { y: a - 0.25, z: 1 }),
  )
}

const banco: Construtor = (f, l, _a, p) => {
  const madeira = f.material(C.madeira)
  const ferro = f.material(C.metalEscuro)
  return grupo(
    f.caixa(l, 0.08, p * 0.8, madeira, { y: 0.42 }),
    f.caixa(l, 0.35, 0.08, madeira, { y: 0.55, z: -p / 2 + 0.04 }),
    f.caixa(0.08, 0.42, p * 0.7, ferro, { x: -l / 2 + 0.2 }),
    f.caixa(0.08, 0.42, p * 0.7, ferro, { x: l / 2 - 0.2 }),
  )
}

const lixeira: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a * 0.85, p, f.material(C.lixeira)),
    f.caixa(l + 0.06, a * 0.15, p + 0.06, f.material(C.metalEscuro), { y: a * 0.85 }),
  )

const muro: Construtor = (f, l, a, p) => f.caixa(l, a, p, f.material(C.muro))

const balcao: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a - 0.06, p, f.material(C.balcao)),
    f.caixa(l + 0.1, 0.06, p + 0.1, f.material(C.balcaoTampo), { y: a - 0.06 }),
    f.caixa(l * 0.9, 0.08, 0.02, f.material(C.balcaoTampo), { y: a * 0.5, z: p / 2 + 0.01 }),
  )

const mesa: Construtor = (f, l, a, p, variante) => {
  const madeira = f.material(C.madeiraClara)
  const pe = f.material(C.metalEscuro)
  const g = grupo(f.caixa(l, 0.06, p, madeira, { y: a - 0.06 }))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(f.caixa(0.06, a - 0.06, 0.06, pe, { x: sx * (l / 2 - 0.08), z: sz * (p / 2 - 0.08) }))
  if (variante === 'computador') {
    g.add(
      f.caixa(0.7, 0.45, 0.05, f.material(C.tela), { y: a + 0.1, z: -p * 0.25 }),
      f.caixa(0.62, 0.36, 0.01, f.material(C.telaLigada, { emissivo: true }), { y: a + 0.15, z: -p * 0.25 + 0.03 }),
      f.caixa(0.08, 0.1, 0.08, f.material(C.tela), { y: a, z: -p * 0.25 }),
      f.caixa(0.5, 0.03, 0.18, f.material(C.metalEscuro), { y: a, z: p * 0.1 }),
    )
  }
  if (variante === 'designer') {
    // Dois monitores largos e uma mesa digitalizadora com caneta.
    for (const x of [-0.5, 0.5]) {
      g.add(
        f.caixa(0.9, 0.5, 0.05, f.material(C.tela), { x, y: a + 0.12, z: -p * 0.3 }),
        f.caixa(0.82, 0.42, 0.01, f.material(x < 0 ? '#f08a5d' : '#7bd389', { emissivo: true }), { x, y: a + 0.16, z: -p * 0.3 + 0.03 }),
        f.caixa(0.08, 0.12, 0.08, f.material(C.tela), { x, y: a, z: -p * 0.3 }),
      )
    }
    g.add(
      f.caixa(0.6, 0.03, 0.4, f.material(C.mesaDigital), { x: 0.2, y: a, z: p * 0.15 }),
      f.caixa(0.04, 0.03, 0.3, f.material('#ffffff'), { x: 0.6, y: a + 0.03, z: p * 0.15 }),
    )
  }
  if (variante === 'vendas') {
    g.add(
      f.caixa(0.4, 0.02, 0.3, f.material('#ffffff'), { y: a, x: -0.3 }),
      f.caixa(0.35, 0.25, 0.03, f.material(C.tela), { y: a, x: 0.4, z: -0.2 }),
    )
  }
  return g
}

const cadeira: Construtor = (f, l, a, p) => {
  const estofado = f.material(C.estofadoEscuro)
  return grupo(
    f.caixa(l * 0.9, 0.1, p * 0.9, estofado, { y: 0.42 }),
    f.caixa(l * 0.9, a - 0.5, 0.08, estofado, { y: 0.52, z: -p / 2 + 0.08 }),
    f.cilindro(0.04, 0.42, f.material(C.metalEscuro), 5).translateY(0.21),
  )
}

const armario: Construtor = (f, l, a, p) => {
  const g = grupo(f.caixa(l, a, p, f.material(C.metal)))
  for (const x of [-l / 4, l / 4]) g.add(f.caixa(l / 2 - 0.06, a - 0.1, 0.02, f.material(C.metalEscuro), { x, y: 0.05, z: p / 2 }))
  return g
}

const sofa: Construtor = (f, l, a, p) => {
  const tecido = f.material(C.estofado)
  const escuro = f.material(C.estofadoEscuro)
  return grupo(
    f.caixa(l, a * 0.5, p, tecido),
    f.caixa(l, a * 0.55, p * 0.25, escuro, { y: a * 0.45, z: -p * 0.375 }),
    f.caixa(0.18, a * 0.75, p, escuro, { x: -l / 2 + 0.09 }),
    f.caixa(0.18, a * 0.75, p, escuro, { x: l / 2 - 0.09 }),
  )
}

const planta: Construtor = (f, _l, a) => {
  const vaso = f.cilindro(0.22, a * 0.35, f.material(C.vaso), 7)
  vaso.position.y = a * 0.175
  const folhas = f.bola(0.4, f.material(C.folha))
  folhas.position.y = a * 0.7
  const folhas2 = f.bola(0.28, f.material(C.folhaClara))
  folhas2.position.set(0.12, a * 0.92, 0.05)
  return grupo(vaso, folhas, folhas2)
}

const bebedouro: Construtor = (f, l, a, p) => {
  const galao = f.cilindro(0.16, 0.4, f.material(C.agua, { transparente: 0.75 }), 10)
  galao.position.y = a - 0.2
  return grupo(
    f.caixa(l * 0.8, a - 0.4, p * 0.8, f.material('#ffffff')),
    f.caixa(0.12, 0.06, 0.04, f.material(C.metalEscuro), { y: a * 0.55, z: p * 0.4 }),
    galao,
  )
}

const mesinha: Construtor = (f, l, a, p) =>
  grupo(f.caixa(l, 0.05, p, f.material(C.madeira), { y: a - 0.05 }), f.caixa(l * 0.6, a - 0.05, p * 0.6, f.material(C.madeira)))

// Totem de senha da agência: coluna marinho com tela e a fresta do papel.
const totem: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a, p, f.material(C.marinho)),
    f.caixa(l * 0.8, a * 0.3, 0.02, f.material(C.telaLigada, { emissivo: true }), { y: a * 0.6, z: p / 2 + 0.01 }),
    f.caixa(l * 0.5, 0.04, 0.02, f.material(C.dourado), { y: a * 0.4, z: p / 2 + 0.01 }),
  )

// Divisória de vidro com moldura: separa as baias da área dos designers sem esconder ninguém.
const divisoria: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a, p, f.material(C.vidroDivisoria, { transparente: 0.45 })),
    f.caixa(l + 0.04, 0.08, p, f.material(C.metalEscuro), { y: a - 0.08 }),
    f.caixa(l + 0.04, 0.08, p, f.material(C.metalEscuro)),
  )

// Moodboard: painel de cortiça com recortes coloridos e post-its.
const moodboard: Construtor = (f, l, a, p) => {
  const g = grupo(f.caixa(l, a - 0.5, p, f.material(C.cortica), { y: 0.5 }))
  const cores = ['#f08a5d', '#7bd389', '#5b8def', '#f2c94c', '#c2386b', '#ffffff', C.postIts, '#9b6bd6']
  let i = 0
  for (let x = -l / 2 + 0.45; x < l / 2 - 0.3; x += 0.62) {
    for (const y of [0.85, 1.35, 1.8]) {
      const largura = 0.3 + ((i * 7) % 3) * 0.08
      g.add(f.caixa(largura, 0.32, 0.02, f.material(cores[i % cores.length]!), { x, y, z: p / 2 + 0.01 }))
      i += 1
    }
  }
  return g
}

const pufe: Construtor = (f, l, a, p, variante) => {
  const bola = f.bola(Math.min(l, p) * 0.55, f.material(variante === 'b' ? C.pufe2 : C.pufe))
  bola.scale.y = a / (Math.min(l, p) * 1.1)
  bola.position.y = a / 2
  return grupo(bola)
}

const CONSTRUTORES: Record<string, Construtor> = {
  totem,
  divisoria,
  moodboard,
  pufe,
  predio,
  carro,
  arvore,
  poste,
  banco,
  lixeira,
  muro,
  balcao,
  mesa,
  cadeira,
  armario,
  sofa,
  planta,
  bebedouro,
  mesinha,
}

/** Modelo do sólido já girado e posto no lugar do mapa. */
export function modeloDoSolido(f: Fabrica, s: Solido): THREE.Object3D {
  const giro = s.giro ?? 0
  // O retângulo do mapa já é o de depois do giro; o modelo local é o de antes.
  const [l, p] = giro % 2 === 1 ? [s.profundidade, s.largura] : [s.largura, s.profundidade]
  const construtor = CONSTRUTORES[s.visual]
  const modelo = construtor ? construtor(f, l, s.altura, p, s.variante) : f.caixa(l, s.altura, p, f.material('#9a9a9a'))
  modelo.rotation.y = (giro * Math.PI) / 2
  modelo.position.set(s.x + s.largura / 2, 0, s.z + s.profundidade / 2)
  return modelo
}
