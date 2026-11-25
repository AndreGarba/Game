// Hash inteiro (mulberry32 de um passo) para sortear efeitos do desenho sem guardar estado nem
// usar Math.random: a mesma semente desenha sempre o mesmo confete ou as mesmas faíscas.
export function ruido(n: number): number {
  let t = (n + 0x6d2b79f5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
