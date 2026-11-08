import {
  CACHORRO_ALTURA_ABAIXADO,
  CACHORRO_ALTURA_EM_PE,
  SUJEIRA_MAX,
  VANTAGEM_MAX,
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

// Distância do tutor em cada nível de sujeira: com SUJEIRA_MAX = 3 e VANTAGEM_MAX = 20, são
// 20, 15, 10 e 5 m. Passar de SUJEIRA_MAX dá zero: é o tutor alcançando.
export function vantagemTutor(sujeira: number): number {
  return VANTAGEM_MAX * (1 - sujeira / (SUJEIRA_MAX + 1))
}

export function alturaCachorro(c: Cachorro): number {
  return c.abaixadoTicks > 0 ? CACHORRO_ALTURA_ABAIXADO : CACHORRO_ALTURA_EM_PE
}
