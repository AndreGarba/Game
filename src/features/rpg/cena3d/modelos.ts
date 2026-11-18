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

// Variante `pan`: balcão branco com a faixa ciano da marca.
const balcao: Construtor = (f, l, a, p, variante) => {
  const pan = variante === 'pan'
  return grupo(
    f.caixa(l, a - 0.06, p, f.material(pan ? C.mesaBranca : C.balcao)),
    f.caixa(l + 0.1, 0.06, p + 0.1, f.material(pan ? C.mesaBranca : C.balcaoTampo), { y: a - 0.06 }),
    f.caixa(l * 0.9, pan ? 0.14 : 0.08, 0.02, f.material(pan ? C.ciano : C.balcaoTampo), { y: a * 0.5, z: p / 2 + 0.01 }),
  )
}

const mesa: Construtor = (f, l, a, p, variante) => {
  const branca = variante === 'reuniao' || variante === 'atendimento'
  const madeira = f.material(branca ? C.mesaBranca : C.madeiraClara)
  const pe = f.material(C.metalEscuro)
  const g = grupo(f.caixa(l, 0.06, p, madeira, { y: a - 0.06 }))
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(f.caixa(0.06, a - 0.06, 0.06, pe, { x: sx * (l / 2 - 0.08), z: sz * (p / 2 - 0.08) }))
  if (variante === 'computador' || variante === 'atendimento') {
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
  if (variante === 'atendimento') g.add(f.caixa(0.5, 0.02, 0.06, f.material(C.ciano), { y: a, x: 0.6, z: p * 0.3 }))
  if (variante === 'reuniao') {
    g.add(f.caixa(0.3, 0.02, 0.22, f.material(C.metalEscuro), { y: a, x: -0.5 }), f.caixa(0.2, 0.02, 0.28, f.material('#ffffff'), { y: a, x: 0.4 }))
    // Cadeiras de malha dos dois lados.
    for (const x of [-l / 3, 0, l / 3]) for (const sz of [-1, 1]) g.add(cadeiraDeMalha(f, x, sz * (p / 2 - 0.05), sz < 0 ? 0 : Math.PI))
  }
  if (variante === 'vendas') {
    g.add(
      f.caixa(0.4, 0.02, 0.3, f.material('#ffffff'), { y: a, x: -0.3 }),
      f.caixa(0.35, 0.25, 0.03, f.material(C.tela), { y: a, x: 0.4, z: -0.2 }),
    )
  }
  return g
}

const cadeira: Construtor = (f, l, a, p, variante) => {
  const estofado = f.material(variante === 'pan' ? C.ciano : C.estofadoEscuro)
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

const sofa: Construtor = (f, l, a, p, variante) => {
  const tecido = f.material(variante === 'pan' ? C.ciano : C.estofado)
  const escuro = f.material(variante === 'pan' ? C.azulPan : C.estofadoEscuro)
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

// Totem de senha da agência: coluna marinho com tela e a fresta do papel (no PAN, ciano e branco).
const totem: Construtor = (f, l, a, p, variante) => {
  const pan = variante === 'pan'
  return grupo(
    f.caixa(l, a, p, f.material(pan ? C.ciano : C.marinho)),
    f.caixa(l * 0.8, a * 0.3, 0.02, f.material(C.telaLigada, { emissivo: true }), { y: a * 0.6, z: p / 2 + 0.01 }),
    f.caixa(l * 0.5, 0.04, 0.02, f.material(pan ? '#ffffff' : C.dourado), { y: a * 0.4, z: p / 2 + 0.01 }),
  )
}

// Caixa eletrônico: gabinete azul-escuro com tela, teclado e a faixa ciano no topo.
const caixaEletronico: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a, p, f.material(C.azulPan)),
    f.caixa(l, 0.18, p + 0.02, f.material(C.ciano), { y: a - 0.18 }),
    f.caixa(l * 0.7, 0.32, 0.02, f.material(C.telaLigada, { emissivo: true }), { y: a * 0.62, z: p / 2 + 0.01 }),
    f.caixa(l * 0.8, 0.06, 0.22, f.material(C.metal), { y: a * 0.5, z: p / 2 + 0.08 }),
    f.caixa(l * 0.35, 0.03, 0.02, f.material(C.metalEscuro), { y: a * 0.4, z: p / 2 + 0.01 }),
  )

// Parede de vidro adesivado (sala de reunião): vidro leitoso com a faixa fosca na altura dos olhos.
const vidroAdesivado: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a, p, f.material(C.vidroAdesivado, { transparente: 0.4 })),
    f.caixa(l + 0.01, 0.9, p + 0.01, f.material('#ffffff', { transparente: 0.8 }), { y: 0.8 }),
    f.caixa(l + 0.04, 0.06, p + 0.02, f.material(C.metalEscuro), { y: a - 0.06 }),
    f.caixa(l + 0.04, 0.06, p + 0.02, f.material(C.metalEscuro)),
  )

// TV de parede da sala de reunião: só a tela, presa alto na parede do fundo.
const tv: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, l * 0.56, p * 0.5, f.material(C.tela), { y: a - l * 0.56, z: -p * 0.2 }),
    f.caixa(l * 0.92, l * 0.5, 0.01, f.material(C.ciano, { emissivo: true }), { y: a - l * 0.53, z: p * 0.1 }),
  )

// Cadeira de escritório de malha branca, centrada em (x, z), com o encosto para o lado de `angulo`.
function cadeiraDeMalha(f: Fabrica, x: number, z: number, angulo: number): THREE.Group {
  const malha = f.material(C.malha)
  const cadeira = grupo(
    f.caixa(0.5, 0.08, 0.48, malha, { y: 0.44 }),
    f.caixa(0.48, 0.5, 0.06, malha, { y: 0.55, z: -0.24 }),
    f.cilindro(0.035, 0.44, f.material(C.metal), 5).translateY(0.22),
    f.caixa(0.5, 0.04, 0.08, f.material(C.metal), { y: 0.02 }),
    f.caixa(0.08, 0.04, 0.5, f.material(C.metal), { y: 0.02 }),
  )
  cadeira.rotation.y = angulo
  cadeira.position.set(x, 0, z)
  return cadeira
}

// Bancada do open office (foto de referência): tampo branco comprido, dois monitores pretos por
// lugar dos dois lados, cadeiras de malha branca e uma planta no meio. O retângulo do mapa inclui
// a fila de cadeiras de cada lado.
const bancada: Construtor = (f, l, a, p) => {
  const tampo = f.material(C.mesaBranca)
  const pe = f.material(C.mesaBranca)
  const tela = f.material(C.tela)
  const profundidadeTampo = p - 1.1
  const g = grupo(f.caixa(l, 0.05, profundidadeTampo, tampo, { y: a - 0.05 }))
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      g.add(f.caixa(0.06, a - 0.05, 0.06, pe, { x: sx * (l / 2 - 0.1), z: sz * (profundidadeTampo / 2 - 0.08) }))
    }
  }
  // Painel do meio, onde os monitores se apoiam de costas uns para os outros.
  g.add(f.caixa(l - 0.2, 0.28, 0.03, f.material(C.malha), { y: a }))
  const lugares = Math.max(1, Math.floor(l / 1.2))
  const passo = l / lugares
  for (let i = 0; i < lugares; i++) {
    const x = -l / 2 + passo * (i + 0.5)
    for (const sz of [-1, 1]) {
      for (const dx of [-0.24, 0.24]) {
        g.add(
          f.caixa(0.44, 0.28, 0.03, tela, { x: x + dx, y: a + 0.12, z: sz * 0.1 }),
          f.caixa(0.06, 0.12, 0.06, tela, { x: x + dx, y: a, z: sz * 0.1 }),
        )
      }
      g.add(f.caixa(0.36, 0.02, 0.12, f.material(C.metalEscuro), { x, y: a, z: sz * 0.36 }))
      g.add(cadeiraDeMalha(f, x, sz * (profundidadeTampo / 2 + 0.3), sz < 0 ? 0 : Math.PI))
    }
    if (i === Math.floor(lugares / 2)) {
      const folhas = f.bola(0.2, f.material(C.folha))
      folhas.position.set(x + passo / 2, a + 0.45, 0)
      g.add(f.cilindro(0.08, 0.2, f.material('#ffffff'), 6).translateX(x + passo / 2).translateY(a + 0.1), folhas)
    }
  }
  return g
}

// Copa: bancada branca com a cafeteira, xícaras e a frente ciano.
const cafe: Construtor = (f, l, a, p) =>
  grupo(
    f.caixa(l, a - 0.05, p, f.material(C.mesaBranca)),
    f.caixa(l + 0.04, 0.05, p + 0.04, f.material(C.tela), { y: a - 0.05 }),
    f.caixa(l * 0.96, a * 0.5, 0.02, f.material(C.ciano), { y: a * 0.2, z: p / 2 + 0.01 }),
    f.caixa(0.35, 0.45, 0.3, f.material(C.metalEscuro), { x: -l * 0.25, y: a, z: -p * 0.1 }),
    f.caixa(0.1, 0.1, 0.1, f.material('#ffffff'), { x: l * 0.1, y: a }),
    f.caixa(0.1, 0.1, 0.1, f.material('#ffffff'), { x: l * 0.25, y: a, z: 0.1 }),
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

// Tenda de feirão: lona branca com faixa azul em quatro pés e uma mesa de vendas embaixo.
const tenda: Construtor = (f, l, a, p) => {
  const pe = f.material(C.metal)
  const g = grupo(
    f.caixa(l, 0.12, p, f.material(C.lona), { y: a - 0.5 }),
    f.caixa(l * 0.6, 0.4, p, f.material(C.lona), { y: a - 0.4 }),
    f.caixa(l + 0.02, 0.22, 0.04, f.material(C.lonaFaixa), { y: a - 0.62, z: p / 2 }),
    f.caixa(l * 0.5, 0.75, 0.7, f.material(C.madeiraClara), { z: p * 0.15 }),
  )
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(f.caixa(0.08, a - 0.4, 0.08, pe, { x: (sx * (l - 0.1)) / 2, z: (sz * (p - 0.1)) / 2 }))
  return g
}

// Poste do portal: o painel do letreiro vem de `letreiros`, por cima dos dois postes.
const postePortal: Construtor = (f, l, a, p) => grupo(f.caixa(l, a, p, f.material(C.lonaFaixa)))

// Bandeira de feirão ("wind banner"): mastro fino e a vela alta de um lado só.
const bandeira: Construtor = (f, l, a, _p, variante) => {
  const vela = f.material(variante === 'branca' ? C.lona : C.lonaFaixa)
  return grupo(
    f.caixa(l * 0.3, a, l * 0.3, f.material(C.metal)),
    f.caixa(0.04, a * 0.7, 0.55, vela, { y: a * 0.28, z: 0.3 }),
    f.caixa(0.03, a * 0.1, 0.4, f.material(variante === 'branca' ? C.lonaFaixa : C.lona), { y: a * 0.75, z: 0.3 }),
  )
}

const CONSTRUTORES: Record<string, Construtor> = {
  'caixa-eletronico': caixaEletronico,
  'vidro-adesivado': vidroAdesivado,
  tv,
  bancada,
  cafe,
  tenda,
  'poste-portal': postePortal,
  bandeira,
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
