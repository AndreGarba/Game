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
