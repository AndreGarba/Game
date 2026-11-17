import { escolher, type EstadoRng } from '../rng.ts'
import { CENAS } from './cenas.ts'
import type { IdCena } from './tipos.ts'

// Personagens jogáveis. Personagem novo entra só com dados: uma linha aqui, a aparência em
// `APARENCIAS` (paleta.ts, mesma chave do `visual`), o nome em `rpg.elenco.<id>` nos três idiomas
// e, se quiser, o retrato em `arte/retratos/<id>`. Quem não é escolhido anda pelo mapa como
// figurante de aparência fixa, numa cena sorteada a cada partida.

export interface PersonagemJogavel {
  id: string
  visual: string
}

export const ELENCO: readonly PersonagemJogavel[] = [
  { id: 'rici', visual: 'rici' },
  { id: 'garba', visual: 'garba' },
]

export const PERSONAGEM_PADRAO = ELENCO[0]!.id

export function personagemDoElenco(id: string): PersonagemJogavel {
  return ELENCO.find((p) => p.id === id) ?? ELENCO[0]!
}

// Cenas com gente andando a pé: é onde um personagem do elenco pode aparecer.
export const CENAS_DO_ELENCO: readonly IdCena[] = Object.values(CENAS)
  .filter((c) => (c.figurantes ?? []).some((g) => !g.veiculo))
  .map((c) => c.id)

/**
 * Cena de cada personagem não escolhido, pelo rng da partida. Fica a partida inteira na mesma
 * cena (a posição é sorteada de novo a cada entrada, como a dos outros figurantes).
 */
export function espalharElenco(escolhido: string, rng: EstadoRng): Record<string, IdCena> {
  const saida: Record<string, IdCena> = {}
  for (const p of ELENCO) if (p.id !== escolhido) saida[p.id] = escolher(rng, CENAS_DO_ELENCO)
  return saida
}
