import { entre, escolher, inteiroEntre, type EstadoRng } from '../rng.ts'
import { bloqueios, livre, moverCaixa } from './colisao.ts'
import {
  ESPERA_FIGURANTE_MAX,
  ESPERA_FIGURANTE_MIN,
  ESPERA_PATINETE_MAX,
  ESPERA_PATINETE_MIN,
  PASSO_FIGURANTE,
  RAIO_FIGURANTE,
  TENTATIVAS_LUGAR,
  TICKS_MAX_TRAJETO,
  VEL_FIGURANTE,
  VEL_PATINETE,
} from './constantes.ts'
import type { Cena, Figurante, GrupoFigurantes, Retangulo } from './tipos.ts'

// Gente andando à toa: cada figurante sorteia um ponto livre da área do grupo, vai até lá
// desviando dos móveis, para um pouco e sorteia outro. Tudo pelo rng do estado: o mesmo log de
// entradas dá as mesmas pessoas nos mesmos lugares.

// |v| aproximado sem raiz (octógono, erro < 8%): basta para a velocidade parecer constante.
function norma(a: number, b: number): number {
  const x = a < 0 ? -a : a
  const z = b < 0 ? -b : b
  return x > z ? x + 0.4142 * z : z + 0.4142 * x
}

function pontoLivre(rng: EstadoRng, area: Retangulo, obstaculos: Retangulo[]): { x: number; z: number } | null {
  const r = RAIO_FIGURANTE
  for (let i = 0; i < TENTATIVAS_LUGAR; i++) {
    const x = entre(rng, area.x + r, area.x + area.largura - r)
    const z = entre(rng, area.z + r, area.z + area.profundidade - r)
    if (livre(x, z, r, obstaculos)) return { x, z }
  }
  return null
}

function sortearAlvo(f: Figurante, grupo: GrupoFigurantes, rng: EstadoRng, obstaculos: Retangulo[]) {
  const p = pontoLivre(rng, grupo.area, obstaculos)
  f.alvoX = p ? p.x : f.x
  f.alvoZ = p ? p.z : f.z
  f.ticksNoTrajeto = 0
}

function esperar(f: Figurante, rng: EstadoRng) {
  f.espera = f.veiculo
    ? inteiroEntre(rng, ESPERA_PATINETE_MIN, ESPERA_PATINETE_MAX)
    : inteiroEntre(rng, ESPERA_FIGURANTE_MIN, ESPERA_FIGURANTE_MAX)
  f.andando = false
}

export function criarFigurantes(cena: Cena, rng: EstadoRng): Figurante[] {
  const obstaculos = bloqueios(cena)
  const saida: Figurante[] = []
  ;(cena.figurantes ?? []).forEach((grupo, g) => {
    for (let i = 0; i < grupo.quantidade; i++) {
      const p = pontoLivre(rng, grupo.area, obstaculos)
      if (!p) continue
      const f: Figurante = {
        id: `${cena.id}_figurante_${saida.length}`,
        visual: escolher(rng, grupo.visuais),
        veiculo: grupo.veiculo ?? null,
        grupo: g,
        x: p.x,
        z: p.z,
        xAnterior: p.x,
        zAnterior: p.z,
        alvoX: p.x,
        alvoZ: p.z,
        espera: 0,
        ticksNoTrajeto: 0,
        dirX: 0,
        dirZ: 1,
        andando: false,
        fasePasso: 0,
      }
      sortearAlvo(f, grupo, rng, obstaculos)
      saida.push(f)
    }
  })
  return saida
}

export function passoFigurantes(figurantes: Figurante[], cena: Cena, rng: EstadoRng): void {
  if (figurantes.length === 0) return
  const obstaculos = bloqueios(cena)
  for (const f of figurantes) {
    f.xAnterior = f.x
    f.zAnterior = f.z
    const grupo = cena.figurantes?.[f.grupo]
    if (!grupo) continue
    if (f.espera > 0) {
      f.espera -= 1
      if (f.espera === 0) sortearAlvo(f, grupo, rng, obstaculos)
      continue
    }
    const vel = f.veiculo ? VEL_PATINETE : VEL_FIGURANTE
    const a = f.alvoX - f.x
    const b = f.alvoZ - f.z
    const n = norma(a, b)
    if (n <= vel) {
      esperar(f, rng)
      continue
    }
    const px = (vel * a) / n
    const pz = (vel * b) / n
    const novo = moverCaixa(cena, obstaculos, RAIO_FIGURANTE, f.x, f.z, px, pz)
    const andou = norma(novo.x - f.x, novo.z - f.z)
    f.x = novo.x
    f.z = novo.z
    f.ticksNoTrajeto += 1
    // Preso atrás de um móvel (ou andando demais): para um pouco e tenta outro caminho.
    if (andou < vel * 0.3 || f.ticksNoTrajeto > TICKS_MAX_TRAJETO) {
      esperar(f, rng)
      continue
    }
    f.andando = true
    f.dirX = px
    f.dirZ = pz
    f.fasePasso += PASSO_FIGURANTE
  }
}
