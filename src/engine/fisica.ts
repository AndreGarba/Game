import { GRAVIDADE, VEL_INICIAL, VEL_K, VEL_MAX, VEL_PULO } from './constantes.ts'

// Só aritmética básica (+ - * /): Math.pow, exp e trigonometria podem variar entre
// motores JS e o servidor precisa chegar no mesmo número que o celular.
export function velocidadeBase(x: number): number {
  const d = Math.max(0, x)
  return VEL_MAX - ((VEL_MAX - VEL_INICIAL) * VEL_K) / (VEL_K + d)
}

export const TEMPO_DE_AR = (2 * VEL_PULO) / GRAVIDADE

// Distância horizontal de um pulo saindo do chão em x.
export function alcancePulo(x: number): number {
  return velocidadeBase(x) * TEMPO_DE_AR
}
