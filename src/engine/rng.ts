// Único lugar do projeto onde nasce aleatoriedade da partida. O estado do gerador é um
// inteiro guardado dentro do EstadoPartida: assim a partida pode ser clonada, salva e
// reproduzida no servidor sem perder a sequência.

export interface EstadoRng {
  s: number
}

export function criarRng(seed: number): EstadoRng {
  return { s: seed >>> 0 }
}

// mulberry32: só operações inteiras de 32 bits, idênticas em qualquer motor JS.
export function proximo(rng: EstadoRng): number {
  rng.s = (rng.s + 0x6d2b79f5) >>> 0
  let t = rng.s
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function inteiroEntre(rng: EstadoRng, min: number, max: number): number {
  return min + Math.floor(proximo(rng) * (max - min + 1))
}

export function entre(rng: EstadoRng, min: number, max: number): number {
  return min + proximo(rng) * (max - min)
}

export function escolher<T>(rng: EstadoRng, itens: readonly T[]): T {
  const item = itens[Math.floor(proximo(rng) * itens.length)]
  if (item === undefined) throw new Error('escolher: lista vazia')
  return item
}
