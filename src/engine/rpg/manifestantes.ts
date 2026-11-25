import { CENAS, MANIFESTACAO } from './cenas.ts'
import { bloqueios, moverCaixa, sobrepoe } from './colisao.ts'
import { caixasDosCarros } from './carros.ts'
import {
  PASSO_FIGURANTE,
  RAIO_FIGURANTE,
  TICKS_DESVIO_MANIFESTANTE,
  VEL_MANIFESTANTE,
  VEL_MANIFESTANTE_VOLTA,
} from './constantes.ts'
import { norma } from './figurantes.ts'
import type { EstadoMundo, Manifestante } from './tipos.ts'

// Manifestantes do vão livre do MASP. Parados na frente do vão, com cartazes; o jogador chegou na
// área do MASP, eles fazem uma roda em volta dele e o seguem; saiu, voltam cada um para a sua
// casa. Moram no motor (seguem o jogador a cada tick), não sorteiam nada (não gastam o
// `estado.rng`: cartões e figurantes saem iguais) e é só `+ − × ÷`.
//
// Não prendem o jogador: ele os atravessa, como aos figurantes. Eles batem nos sólidos e nos
// carros, mas o alvo de cada um nunca passa do `limite` (a calçada), então não descem para o
// asfalto. Não conversam, não apanham e não escondem cartão.

// Vagas da roda em volta do jogador, a ~1,3 m, de 60 em 60° (escritas à mão: sem trigonometria).
const RODA: readonly [number, number][] = [
  [1.3, 0],
  [0.65, 1.125],
  [-0.65, 1.125],
  [-1.3, 0],
  [-0.65, -1.125],
  [0.65, -1.125],
]

// Parado a menos disso do alvo (a vaga caiu dentro de um poste, ou do hall), fica onde está em vez
// de contornar: senão ficaria dançando em volta da vaga.
const PERTO_DO_ALVO = 0.6

export function criarManifestantes(): Manifestante[] {
  return MANIFESTACAO.casas.map((c, i) => ({
    id: i,
    visual: MANIFESTACAO.visuais[i % MANIFESTACAO.visuais.length]!,
    placa: i,
    casaX: c.x,
    casaZ: c.z,
    x: c.x,
    z: c.z,
    xAnterior: c.x,
    zAnterior: c.z,
    dirX: 0,
    dirZ: 1,
    andando: false,
    fasePasso: 0,
    desvio: 0,
    ladoDesvio: i % 2 === 0 ? 1 : -1,
  }))
}

function prender(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v
}

export function passoManifestantes(estado: EstadoMundo): void {
  const j = estado.jogador
  const rua = CENAS.rua
  estado.protesto = estado.cena === 'rua' && sobrepoe(j.x, j.z, 0, MANIFESTACAO.area)
  const obstaculos = [...bloqueios(rua), ...caixasDosCarros(estado), ...MANIFESTACAO.paredes]
  const { limite, vao } = MANIFESTACAO
  const r = RAIO_FIGURANTE
  for (const m of estado.manifestantes) {
    m.xAnterior = m.x
    m.zAnterior = m.z
    const [ox, oz] = RODA[m.id % RODA.length]!
    let alvoX = m.casaX
    let alvoZ = m.casaZ
    if (estado.protesto) {
      alvoX = prender(j.x + ox, limite.x + r, limite.x + limite.largura - r)
      alvoZ = prender(j.z + oz, limite.z + r, limite.z + limite.profundidade - r)
      if (alvoZ < vao.z + vao.profundidade) {
        alvoX = prender(alvoX, vao.x + r, vao.x + vao.largura - r)
        alvoZ = prender(alvoZ, vao.z + r, vao.z + vao.profundidade)
      }
    }
    const vel = estado.protesto ? VEL_MANIFESTANTE : VEL_MANIFESTANTE_VOLTA
    const a = alvoX - m.x
    const b = alvoZ - m.z
    const n = norma(a, b)
    m.andando = false
    if (n > vel) {
      const px = (vel * a) / n
      const pz = (vel * b) / n
      const dentro = (p: { x: number; z: number }) => p.z + r <= limite.z + limite.profundidade
      const andou = (p: { x: number; z: number }) => dentro(p) && (p.x !== m.x || p.z !== m.z)
      // Travado num poste ou pilar (o passo reto não sai do lugar): anda de lado um tempo, e troca
      // de lado se aquele também estiver fechado.
      let novo = { x: m.x, z: m.z }
      if (m.desvio === 0) {
        novo = moverCaixa(rua, obstaculos, r, m.x, m.z, px, pz)
        if (!andou(novo) && n > PERTO_DO_ALVO) m.desvio = TICKS_DESVIO_MANIFESTANTE
      }
      if (m.desvio > 0) {
        m.desvio--
        novo = moverCaixa(rua, obstaculos, r, m.x, m.z, -pz * m.ladoDesvio, px * m.ladoDesvio)
        if (!andou(novo)) {
          m.ladoDesvio = -m.ladoDesvio
          novo = moverCaixa(rua, obstaculos, r, m.x, m.z, -pz * m.ladoDesvio, px * m.ladoDesvio)
        }
        if (!dentro(novo)) novo = { x: m.x, z: m.z }
      }
      m.andando = novo.x !== m.x || novo.z !== m.z
      m.x = novo.x
      m.z = novo.z
    } else if (n > 0) {
      m.desvio = 0
      const novo = moverCaixa(rua, obstaculos, r, m.x, m.z, a, b)
      m.x = novo.x
      m.z = novo.z
    }
    if (m.andando) {
      m.dirX = a
      m.dirZ = b
      m.fasePasso += PASSO_FIGURANTE
    } else if (estado.protesto) {
      // Na roda, de frente para o jogador.
      m.dirX = j.x - m.x
      m.dirZ = j.z - m.z
    } else {
      m.dirX = 0
      m.dirZ = 1
    }
  }
}
