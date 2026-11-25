import { entre, escolher, inteiroEntre, type EstadoRng } from '../rng.ts'
import { bloqueios, livre, moverCaixa } from './colisao.ts'
import {
  ESPERA_FIGURANTE_MAX,
  ESPERA_FIGURANTE_MIN,
  ESPERA_PATINETE_MAX,
  ESPERA_PATINETE_MIN,
  ESPERA_TRAVESSIA_MAX,
  ESPERA_TRAVESSIA_MIN,
  PASSO_FIGURANTE,
  RAIO_FIGURANTE,
  TENTATIVAS_LUGAR,
  TICKS_MAX_TRAJETO,
  VEL_FIGURANTE,
  VEL_PATINETE,
} from './constantes.ts'
import { arrastoDoTick, avancarTombo } from './tombo.ts'
import type { Cena, Figurante, GrupoFigurantes, Retangulo } from './tipos.ts'

// Gente andando à toa: cada figurante sorteia um ponto livre da área do grupo, vai até lá
// desviando dos móveis, para um pouco e sorteia outro. Tudo pelo rng do estado: o mesmo log de
// entradas dá as mesmas pessoas nos mesmos lugares.

// |v| aproximado sem raiz (octógono, erro < 8%): basta para a velocidade parecer constante.
export function norma(a: number, b: number): number {
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

// Travessia: o alvo fica na outra ponta da área (a outra calçada), em x sorteado.
function pontoDoOutroLado(f: Figurante, area: Retangulo, rng: EstadoRng, obstaculos: Retangulo[]): { x: number; z: number } | null {
  const r = RAIO_FIGURANTE
  const z = f.z < area.z + area.profundidade / 2 ? area.z + area.profundidade - r : area.z + r
  for (let i = 0; i < TENTATIVAS_LUGAR; i++) {
    const x = entre(rng, area.x + r, area.x + area.largura - r)
    if (livre(x, z, r, obstaculos)) return { x, z }
  }
  return null
}

function sortearAlvo(f: Figurante, grupo: GrupoFigurantes, rng: EstadoRng, obstaculos: Retangulo[]) {
  const p = (grupo.travessia ? pontoDoOutroLado(f, grupo.area, rng, obstaculos) : null) ?? pontoLivre(rng, grupo.area, obstaculos)
  f.alvoX = p ? p.x : f.x
  f.alvoZ = p ? p.z : f.z
  f.ticksNoTrajeto = 0
}

function esperar(f: Figurante, rng: EstadoRng, grupo: GrupoFigurantes | undefined) {
  f.espera = f.veiculo
    ? inteiroEntre(rng, ESPERA_PATINETE_MIN, ESPERA_PATINETE_MAX)
    : grupo?.travessia
      ? inteiroEntre(rng, ESPERA_TRAVESSIA_MIN, ESPERA_TRAVESSIA_MAX)
      : inteiroEntre(rng, ESPERA_FIGURANTE_MIN, ESPERA_FIGURANTE_MAX)
  f.andando = false
}

function novoFigurante(id: string, visual: string, elenco: string | null, grupo: GrupoFigurantes, g: number, p: { x: number; z: number }): Figurante {
  return {
    id,
    visual,
    elenco,
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
    susto: 0,
    tombo: 0,
    tomboX: 0,
    tomboZ: 0,
  }
}

/**
 * Figurantes da cena. `elenco` traz os personagens jogáveis não escolhidos que estão nesta cena
 * (id → visual): entram depois da gente comum, a pé, no primeiro grupo que anda a pé. `extras` são
 * obstáculos que mudam de lugar (os carros da rua): ninguém nasce nem anda para dentro deles.
 */
export function criarFigurantes(cena: Cena, rng: EstadoRng, elenco: { id: string; visual: string }[] = [], extras: Retangulo[] = []): Figurante[] {
  const obstaculos = [...bloqueios(cena), ...extras]
  const saida: Figurante[] = []
  ;(cena.figurantes ?? []).forEach((grupo, g) => {
    for (let i = 0; i < grupo.quantidade; i++) {
      const p = pontoLivre(rng, grupo.area, obstaculos)
      if (!p) continue
      const f = novoFigurante(`${cena.id}_figurante_${saida.length}`, escolher(rng, grupo.visuais), null, grupo, g, p)
      sortearAlvo(f, grupo, rng, obstaculos)
      saida.push(f)
    }
  })
  const g = (cena.figurantes ?? []).findIndex((grupo) => !grupo.veiculo)
  const grupo = cena.figurantes?.[g]
  if (!grupo) return saida
  for (const pessoa of elenco) {
    const p = pontoLivre(rng, grupo.area, obstaculos)
    if (!p) continue
    const f = novoFigurante(`elenco_${pessoa.id}`, pessoa.visual, pessoa.id, grupo, g, p)
    sortearAlvo(f, grupo, rng, obstaculos)
    saida.push(f)
  }
  return saida
}


export function passoFigurantes(figurantes: Figurante[], cena: Cena, rng: EstadoRng, extras: Retangulo[] = []): void {
  if (figurantes.length === 0) return
  const obstaculos = [...bloqueios(cena), ...extras]
  for (const f of figurantes) {
    f.xAnterior = f.x
    f.zAnterior = f.z
    const grupo = cena.figurantes?.[f.grupo]
    if (!grupo) continue
    // Derrubado (soco): arrastado no sentido do golpe, no chão, levanta e para um pouco.
    if (f.tombo > 0) {
      f.andando = false
      const v = arrastoDoTick(f)
      if (v > 0) {
        const novo = moverCaixa(cena, obstaculos, RAIO_FIGURANTE, f.x, f.z, f.tomboX * v, f.tomboZ * v)
        f.x = novo.x
        f.z = novo.z
      }
      if (avancarTombo(f)) esperar(f, rng, grupo)
      continue
    }
    if (f.susto > 0) f.susto -= 1
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
      esperar(f, rng, grupo)
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
      esperar(f, rng, grupo)
      continue
    }
    f.andando = true
    f.dirX = px
    f.dirZ = pz
    f.fasePasso += PASSO_FIGURANTE
  }
}
