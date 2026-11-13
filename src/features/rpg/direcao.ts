// Direção da tela → direção do mundo. Com a câmera isométrica (vinda de +x, +z), "para cima na
// tela" é andar para −x e −z ao mesmo tempo, e "para a direita" é +x e −z. Somando os dois e
// ficando só com o sinal, as 8 direções do d-pad viram as 8 do mundo; a diagonal de cada uma o
// motor já normaliza.

export interface DirecaoTela {
  // −1 esquerda, 1 direita.
  direita: number
  // −1 baixo, 1 cima.
  cima: number
}

const sinal = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0)

export function direcaoNoMundo({ direita, cima }: DirecaoTela): { dx: number; dz: number } {
  return { dx: sinal(direita - cima), dz: sinal(-direita - cima) }
}
