import { RAIO_NPC } from './constantes.ts'
import type { Cena, Retangulo } from './tipos.ts'

// Colisão de quadrado contra retângulos no chão, a mesma para o jogador e para os figurantes.

// Tudo que bloqueia na cena, já como retângulo: sólidos e o quadrado de cada NPC.
export function bloqueios(cena: Cena): Retangulo[] {
  const saida: Retangulo[] = cena.solidos.slice()
  for (const npc of cena.npcs) {
    saida.push({ x: npc.x - RAIO_NPC, z: npc.z - RAIO_NPC, largura: 2 * RAIO_NPC, profundidade: 2 * RAIO_NPC })
  }
  return saida
}

export function sobrepoe(x: number, z: number, raio: number, r: Retangulo): boolean {
  return x + raio > r.x && x - raio < r.x + r.largura && z + raio > r.z && z - raio < r.z + r.profundidade
}

export function livre(x: number, z: number, raio: number, obstaculos: Retangulo[]): boolean {
  for (const r of obstaculos) if (sobrepoe(x, z, raio, r)) return false
  return true
}

// Um eixo de cada vez: batendo de quina, desliza pela parede em vez de grudar.
export function moverCaixa(
  cena: Cena,
  obstaculos: Retangulo[],
  raio: number,
  x0: number,
  z0: number,
  passoX: number,
  passoZ: number,
): { x: number; z: number } {
  let x = Math.min(Math.max(x0 + passoX, raio), cena.largura - raio)
  for (const r of obstaculos) {
    if (!sobrepoe(x, z0, raio, r)) continue
    x = passoX > 0 ? r.x - raio : r.x + r.largura + raio
  }
  // Empurrado para fora de um e para dentro de outro (dois móveis colados): fica onde estava.
  if (!livre(x, z0, raio, obstaculos)) x = x0
  let z = Math.min(Math.max(z0 + passoZ, raio), cena.profundidade - raio)
  for (const r of obstaculos) {
    if (!sobrepoe(x, z, raio, r)) continue
    z = passoZ > 0 ? r.z - raio : r.z + r.profundidade + raio
  }
  if (!livre(x, z, raio, obstaculos)) z = z0
  return { x, z }
}
