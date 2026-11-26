import { inteiroEntre, type EstadoRng } from '../rng.ts'
import { CENAS, MESA_DA_CANETA } from './cenas.ts'
import { TOTAL_CARTOES } from './constantes.ts'
import type { Cartoes, IdCena } from './tipos.ts'

// Cartões Ultra Blue escondidos pelo mapa. Esconderijo é todo sólido que não é prédio nem parede e
// todo NPC, de todas as cenas. Figurante não esconde cartão: os de uma cena são sorteados de novo a cada
// troca de cena, e o cartão sumiria junto com quem o carregava.

export interface Esconderijo {
  chave: string
  cena: IdCena
  id: string
  tipo: 'solido' | 'npc'
}

export function chaveDoEsconderijo(cena: IdCena, id: string): string {
  return `${cena}:${id}`
}

// Prédio é parede de rua, não objeto: revistar a fachada inteira não faz sentido; o vidro da sala
// de reunião do PAN e a parede do fundo do feirão também são parede. O muro do beco fica atrás da
// lixeira, fora do alcance do A (`tests/rpg.cartoes.test.ts` confere o alcance). Quadro de
// entregas não esconde cartão: o A nele abre a modal, e um cartão aparecendo junto disputaria a
// tela com ela. Gol e rede também ficam fora: o campo é para jogar bola. Fora da lista, quadros e
// gols não mudam onde a mesma semente esconde os 26 cartões. Pilares e hall do MASP são o prédio.
const NAO_ESCONDE = new Set(['predio', 'muro', 'vidro-adesivado', 'parede-feirao', 'quadro-entregas', 'gol', 'rede-gol', 'pilar-masp', 'masp-hall'])

// A mesa da rosquinha guarda a caneta de Mounjaro: cartão ali disputaria o mesmo A com ela.
export function ehMesaDaCaneta(cena: IdCena, id: string): boolean {
  return cena === MESA_DA_CANETA.cena && id === MESA_DA_CANETA.id
}

function listarEsconderijos(): Esconderijo[] {
  const saida: Esconderijo[] = []
  for (const cena of Object.values(CENAS)) {
    for (const s of cena.solidos) {
      if (!NAO_ESCONDE.has(s.visual) && !ehMesaDaCaneta(cena.id, s.id)) saida.push({ chave: chaveDoEsconderijo(cena.id, s.id), cena: cena.id, id: s.id, tipo: 'solido' })
    }
    for (const n of cena.npcs) saida.push({ chave: chaveDoEsconderijo(cena.id, n.id), cena: cena.id, id: n.id, tipo: 'npc' })
  }
  return saida
}

// Ordem fixa (a das cenas no mapa): a mesma semente esconde os cartões nos mesmos lugares.
export const ESCONDERIJOS: readonly Esconderijo[] = listarEsconderijos()

const CHAVES = new Set(ESCONDERIJOS.map((e) => e.chave))

export function ehEsconderijo(cena: IdCena, id: string): boolean {
  return CHAVES.has(chaveDoEsconderijo(cena, id))
}

// Fisher–Yates parcial: TOTAL_CARTOES esconderijos distintos, no máximo um cartão em cada.
export function esconderCartoes(rng: EstadoRng): Cartoes {
  const chaves = ESCONDERIJOS.map((e) => e.chave)
  const escondidos: Record<string, true> = {}
  for (let i = 0; i < TOTAL_CARTOES; i++) {
    const j = inteiroEntre(rng, i, chaves.length - 1)
    const escolhida = chaves[j]!
    chaves[j] = chaves[i]!
    chaves[i] = escolhida
    escondidos[escolhida] = true
  }
  return { escondidos, revistados: {}, achados: 0, ultimaRevista: null, concluidoEm: null }
}

// Revista o esconderijo no tick atual. Já revistado não dá outro cartão (nem conta de novo).
export function revistar(cartoes: Cartoes, cena: IdCena, id: string, tick: number): void {
  const chave = chaveDoEsconderijo(cena, id)
  if (!CHAVES.has(chave) || cartoes.revistados[chave]) return
  cartoes.revistados[chave] = true
  const achou = cartoes.escondidos[chave] === true
  if (achou) {
    cartoes.achados += 1
    if (cartoes.achados === TOTAL_CARTOES) cartoes.concluidoEm = tick
  }
  cartoes.ultimaRevista = { cena, id, achou, tick }
}
