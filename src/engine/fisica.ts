import {
  CACHORRO_ALTURA_ABAIXADO,
  CACHORRO_ALTURA_EM_PE,
  PENALIDADE_SUJEIRA,
  VEL_INICIAL,
  VEL_K,
  VEL_MAX,
} from './constantes.ts'
import type { Cachorro } from './tipos.ts'

// Só aritmética básica (+ - * /): Math.pow, exp e trigonometria podem variar entre
// motores JS e o servidor precisa chegar no mesmo número que o celular.
export function velocidadeBase(x: number): number {
  const d = Math.max(0, x)
  return VEL_MAX - ((VEL_MAX - VEL_INICIAL) * VEL_K) / (VEL_K + d)
}

export function multiplicadorSujeira(sujeira: number): number {
  return 1 - sujeira * PENALIDADE_SUJEIRA
}

export function alturaCachorro(c: Cachorro): number {
  return c.abaixadoTicks > 0 ? CACHORRO_ALTURA_ABAIXADO : CACHORRO_ALTURA_EM_PE
}
