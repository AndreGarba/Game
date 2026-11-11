import type { Elemento } from './tipos.ts'

// Contorno de cima de alguns sólidos, para o cachorro andar por cima seguindo a forma da arte
// (subir o vidro traseiro do carro, descer o para-brisa) em vez de uma caixa reta.
// Pontos [x, y] em fração da caixa de colisão: x de 0 (lado por onde o cachorro chega) a 1,
// y de 0 (base) a 1 (topo da caixa). Medidos no sprite de cada objeto, coluna a coluna, e
// simplificados. Sólido sem perfil continua uma caixa.
export const PERFIS: Readonly<Record<string, readonly (readonly [number, number])[]>> = {
  // A traseira fica do lado de quem chega: porta-malas, vidro traseiro, teto, para-brisa, capô.
  carro: [
    [0, 0.62],
    [0.1, 0.66],
    [0.3, 1],
    [0.6, 1],
    [0.76, 0.64],
    [0.96, 0.55],
    [1, 0.42],
  ],
  tora: [
    [0, 0.55],
    [0.1, 0.75],
    [0.5, 0.8],
    [0.9, 0.82],
    [1, 0.55],
  ],
  // Borda da bacia (a caixa de colisão já para nela; o jato fica acima).
  chafariz: [
    [0, 0.8],
    [0.1, 1],
    [0.9, 1],
    [1, 0.8],
  ],
  banca: [
    [0, 0.83],
    [0.15, 0.98],
    [0.85, 0.98],
    [1, 0.83],
  ],
  // r9: obstáculos altos dos cenários novos. Como caixa reta, a parede da frente ficava acima do
  // que dá para subir no respiro entre dois trechos; o contorno da arte começa mais baixo.
  // Toldo do carrinho de pipoca; a alça fica do lado de quem sai.
  pipoqueiro: [
    [0, 0.88],
    [0.15, 0.97],
    [0.25, 1],
    [0.8, 1],
    [0.92, 0.89],
    [1, 0.49],
  ],
  // Motor baixo na frente, guidão no alto atrás.
  cortador: [
    [0, 0.21],
    [0.15, 0.3],
    [0.25, 0.5],
    [0.5, 0.57],
    [0.75, 0.99],
    [1, 0.93],
  ],
  // Chapéu da lanterna de pedra, com a ponta no meio.
  lanterna: [
    [0, 0.77],
    [0.3, 0.85],
    [0.5, 1],
    [0.7, 0.85],
    [1, 0.78],
  ],
  // Beiral do telhado da barraca.
  yatai: [
    [0, 0.67],
    [0.05, 0.84],
    [0.15, 0.98],
    [0.87, 0.98],
    [0.95, 0.84],
    [1, 0.4],
  ],
  // Pirâmide: um barril em cima de dois.
  barris: [
    [0, 0.31],
    [0.15, 0.53],
    [0.25, 0.9],
    [0.5, 0.99],
    [0.75, 0.9],
    [0.85, 0.53],
    [1, 0.39],
  ],
  // Capota arredondada e os varais baixos na frente.
  riquixa: [
    [0, 0.31],
    [0.03, 0.85],
    [0.15, 0.96],
    [0.3, 1],
    [0.65, 0.92],
    [0.75, 0.31],
    [1, 0.18],
  ],
  // Tampa da caçamba, com as alças laterais mais baixas.
  cacamba: [
    [0, 0.55],
    [0.05, 0.8],
    [0.15, 0.97],
    [0.85, 0.97],
    [0.95, 0.8],
    [1, 0.55],
  ],
  // Braços mais baixos que o encosto.
  sofa: [
    [0, 0.55],
    [0.08, 0.69],
    [0.15, 0.93],
    [0.85, 0.97],
    [0.92, 0.69],
    [1, 0.57],
  ],
  // Monte de sacos com as caixas no alto.
  sacos_de_lixo: [
    [0, 0.11],
    [0.15, 0.58],
    [0.35, 0.96],
    [0.65, 1],
    [0.85, 0.63],
    [1, 0.17],
  ],
}

export function temPerfil(e: Elemento): boolean {
  return e.tipo === 'solido' && PERFIS[e.visual] !== undefined
}

function fracaoX(e: Elemento, x: number): number {
  return Math.min(1, Math.max(0, (x - e.x) / e.largura))
}

// Altura da superfície de cima do sólido no x dado (preso às bordas do sólido).
// Só aritmética básica: o servidor refaz a partida e precisa chegar no mesmo número.
export function alturaSuperficie(e: Elemento, x: number): number {
  const perfil = PERFIS[e.visual]
  if (!perfil) return e.y + e.altura
  const f = fracaoX(e, x)
  for (let i = 1; i < perfil.length; i++) {
    const [x1, y1] = perfil[i]!
    if (f <= x1) {
      const [x0, y0] = perfil[i - 1]!
      const t = x1 === x0 ? 1 : (f - x0) / (x1 - x0)
      return e.y + e.altura * (y0 + (y1 - y0) * t)
    }
  }
  return e.y + e.altura * perfil[perfil.length - 1]![1]
}
