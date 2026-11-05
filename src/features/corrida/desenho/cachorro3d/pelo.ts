import { BufferAttribute, BufferGeometry, Color, ConeGeometry, IcosahedronGeometry, Quaternion, Vector3 } from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'

// Geometria de pelo: esfera deformada por ruído (os tufos grandes) com mechas cônicas espetadas
// por cima (o contorno desfiado). Tudo determinístico: o cachorro tem que ser o mesmo a cada
// abertura do jogo, e Math.random() fica proibido fora do rng do motor.

export function hash3(x: number, y: number, z: number, semente: number): number {
  let h = Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ semente
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296
}

function suave(t: number) {
  return t * t * (3 - 2 * t)
}

// Ruído de valor 3D em [0, 1].
function ruido(x: number, y: number, z: number, semente: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = suave(x - ix)
  const fy = suave(y - iy)
  const fz = suave(z - iz)
  let total = 0
  for (let dz = 0; dz < 2; dz++)
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 2; dx++) {
        const peso = (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy) * (dz ? fz : 1 - fz)
        total += peso * hash3(ix + dx, iy + dy, iz + dz, semente)
      }
  return total
}

function fbm(x: number, y: number, z: number, semente: number): number {
  return (
    ruido(x, y, z, semente) * 0.55 +
    ruido(x * 2.1, y * 2.1, z * 2.1, semente + 17) * 0.3 +
    ruido(x * 4.3, y * 4.3, z * 4.3, semente + 31) * 0.15
  )
}

export interface OpcoesPelo {
  raio: readonly [number, number, number]
  cor: string
  // Cor das pontas do pelo; a raiz fica um pouco mais escura que `cor`.
  corPonta?: string
  detalhe?: number
  // Quanto os tufos saltam para fora, em fração do raio.
  volume?: number
  frequencia?: number
  // Pelo que pende: puxa para baixo a metade de baixo da forma (orelhas, barriga, barba).
  caimento?: number
  mechas?: number
  mechaComprimento?: number
  mechaLargura?: number
  // Quanto as mechas apontam para o chão em vez de para fora.
  mechaCaimento?: number
  // Mechas só onde dir·filtro >= filtroMin (ex.: só na parte de baixo).
  filtro?: readonly [number, number, number]
  filtroMin?: number
  fluxo?: readonly [number, number, number]
  semente?: number
}

function definirCores(geo: BufferGeometry, cor: (p: Vector3, i: number) => Color) {
  const pos = geo.getAttribute('position')
  const cores = new Float32Array(pos.count * 3)
  const p = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const c = cor(p, i)
    cores[i * 3] = c.r
    cores[i * 3 + 1] = c.g
    cores[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new BufferAttribute(cores, 3))
}

const CIMA = new Vector3(0, 1, 0)

export function bolaDePelo(o: OpcoesPelo): BufferGeometry {
  const [rx, ry, rz] = o.raio
  const semente = o.semente ?? 1
  const volume = o.volume ?? 0.16
  const freq = o.frequencia ?? 2.6
  const caimento = o.caimento ?? 0
  const base = new Color(o.cor)
  const ponta = new Color(o.corPonta ?? o.cor)
  const raiz = base.clone().multiplyScalar(0.8)
  const tmp = new Color()

  const esfera = new IcosahedronGeometry(1, o.detalhe ?? 5)
  esfera.deleteAttribute('normal')
  esfera.deleteAttribute('uv')
  const corpo = mergeVertices(esfera)
  const pos = corpo.getAttribute('position')
  const ruidos = new Float32Array(pos.count)
  const v = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const f = fbm(v.x * freq + 11, v.y * freq + 23, v.z * freq + 5, semente)
    ruidos[i] = f
    const r = 1 + volume * (f - 0.45) * 2
    const pende = caimento * Math.max(0, -v.y) * (0.6 + f)
    pos.setXYZ(i, v.x * rx * r, v.y * ry * r - pende, v.z * rz * r)
  }
  corpo.computeVertexNormals()
  definirCores(corpo, (p, i) => {
    // Embaixo um pouco mais escuro: imita a sombra entre os fios.
    const altura = Math.min(1, Math.max(0, (p.y / ry + 1) / 2))
    return tmp.copy(raiz).lerp(ponta, ruidos[i]! * 0.7 + altura * 0.3)
  })

  const partes: BufferGeometry[] = [corpo]
  const total = o.mechas ?? 0
  const comprimento = o.mechaComprimento ?? Math.min(rx, ry, rz) * 0.45
  const largura = o.mechaLargura ?? comprimento * 0.5
  // Para onde o pelo escorre: para trás e para baixo, como penteado pelo vento da corrida.
  const fluxo = new Vector3(...(o.fluxo ?? [-0.45, -1, 0])).normalize()
  const filtro = o.filtro ? new Vector3(...o.filtro).normalize() : null
  const q = new Quaternion()
  const dir = new Vector3()
  const ponto = new Vector3()
  const apontar = new Vector3()
  // Espiral de Fibonacci com variação: mechas espalhadas por igual, sem padrão visível.
  for (let k = 0; k < total; k++) {
    const t = (k + 0.5) / total
    const jitter = hash3(k, 7, 3, semente) - 0.5
    const y = 1 - 2 * t + jitter * 0.04
    const raioAnel = Math.sqrt(Math.max(0, 1 - y * y))
    const ang = k * 2.399963 + jitter * 0.8
    dir.set(Math.cos(ang) * raioAnel, y, Math.sin(ang) * raioAnel)
    if (filtro && dir.dot(filtro) < (o.filtroMin ?? 0)) continue
    const f = fbm(dir.x * freq + 11, dir.y * freq + 23, dir.z * freq + 5, semente)
    const r = 1 + volume * (f - 0.45) * 2
    const pende = caimento * Math.max(0, -dir.y) * (0.6 + f)
    ponto.set(dir.x * rx * r * 0.8, dir.y * ry * r * 0.8 - pende, dir.z * rz * r * 0.8)
    const escala = 0.65 + hash3(k, 1, 9, semente) * 0.7
    const h = comprimento * escala
    const mecha = new ConeGeometry(largura * (0.7 + escala * 0.3), h, 7, 1)
    mecha.deleteAttribute('uv')
    mecha.translate(0, h / 2, 0)
    const baseMecha = tmp.copy(raiz).lerp(ponta, 0.35 + f * 0.3).clone()
    const pontaMecha = baseMecha.clone().lerp(ponta, 0.6)
    definirCores(mecha, (p) => (p.y > h * 0.99 ? tmp.copy(pontaMecha) : tmp.copy(baseMecha)))
    apontar
      .set(dir.x / rx, dir.y / ry, dir.z / rz)
      .normalize()
      .addScaledVector(fluxo, (o.mechaCaimento ?? 0.5) * 1.6)
      .normalize()
    q.setFromUnitVectors(CIMA, apontar)
    mecha.applyQuaternion(q)
    mecha.translate(ponto.x, ponto.y, ponto.z)
    partes.push(mecha)
  }
  // ConeGeometry vem indexada como a esfera depois do mergeVertices: dá para fundir tudo.
  const fundida = mergeGeometries(partes)
  for (const g of partes) g.dispose()
  return fundida
}

// Um arco de bolas de pelo (rabo enrolado, peitoral do pelo): segue os pontos dados.
export function cordaDePelo(
  pontos: readonly (readonly [number, number, number])[],
  raios: readonly number[],
  opcoes: Omit<OpcoesPelo, 'raio'>,
): BufferGeometry {
  const partes = pontos.map(([x, y, z], i) => {
    const r = raios[i] ?? raios[raios.length - 1]!
    const g = bolaDePelo({ ...opcoes, raio: [r, r, r], semente: (opcoes.semente ?? 1) + i * 13, detalhe: opcoes.detalhe ?? 3 })
    g.translate(x, y, z)
    return g
  })
  const fundida = mergeGeometries(partes)
  for (const g of partes) g.dispose()
  return fundida
}
