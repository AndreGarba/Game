// Elenco jogável: o escolhido vira o jogador; quem não foi escolhido anda pelo mapa numa cena
// sorteada pela semente, como figurante de aparência fixa, sem conversa, e leva soco.
import { describe, expect, it } from 'vitest'
import { CENAS, type Entrada, type EstadoMundo, type IdCena } from '../src/engine/rpg/index.ts'
import { CENAS_DO_ELENCO, ELENCO, PERSONAGEM_PADRAO } from '../src/engine/rpg/elenco.ts'
import { TICKS_SOCO_IMPACTO } from '../src/engine/rpg/constantes.ts'
import { criarMundo, passoMundo } from '../src/engine/rpg/mundo.ts'
import { APARENCIAS } from '../src/features/rpg/visual/paleta.ts'
import en from '../src/locales/en/jogo.json'
import es from '../src/locales/es/jogo.json'
import pt from '../src/locales/pt/jogo.json'

const PARADO: Entrada = { dx: 0, dz: 0, correr: false, interagir: false, voltar: false, socar: false }

// Primeira semente em que `id` cai na cena pedida.
function sementeCom(id: string, cena: IdCena, personagem: string): number {
  for (let s = 1; s < 500; s++) if (criarMundo(s, personagem).elencoNoMapa[id] === cena) return s
  throw new Error(`nenhuma semente põe ${id} em ${cena}`)
}

// Entra na cena pela primeira porta que leva até ela, saindo de onde a porta fica.
function entrarEm(e: EstadoMundo, destino: IdCena) {
  const { c, p } = Object.values(CENAS)
    .flatMap((c) => c.portas.map((p) => ({ c, p })))
    .find(({ p }) => p.destino.cena === destino)!
  e.cena = c.id
  e.jogador.x = p.x + p.largura / 2
  e.jogador.z = p.z + p.profundidade / 2
  passoMundo(e, { ...PARADO, interagir: true })
  expect(e.cena).toBe(destino)
}

const doElenco = (e: EstadoMundo) => e.figurantes.filter((f) => f.elenco !== null)

describe('elenco jogável', () => {
  it('todo personagem tem aparência na paleta e nome nos três idiomas; ids únicos', () => {
    expect(new Set(ELENCO.map((p) => p.id)).size).toBe(ELENCO.length)
    expect(ELENCO.length).toBeGreaterThanOrEqual(2)
    for (const p of ELENCO) {
      expect(APARENCIAS[p.visual], p.id).toBeDefined()
      for (const locale of [pt, en, es]) expect((locale.rpg.elenco as Record<string, string>)[p.id], p.id).toBeTruthy()
    }
  })

  it('sem escolha, joga com o padrão (Rici); id desconhecido também cai no padrão', () => {
    expect(PERSONAGEM_PADRAO).toBe('rici')
    expect(criarMundo().personagem).toBe('rici')
    expect(criarMundo().jogador.visual).toBe('rici')
    expect(criarMundo(1, 'ninguem').personagem).toBe('rici')
  })

  it('escolhendo o Garba: ele é o jogador e o Rici vai para uma cena do mapa', () => {
    const e = criarMundo(42, 'garba')
    expect(e.personagem).toBe('garba')
    expect(e.jogador.visual).toBe('garba')
    expect(Object.keys(e.elencoNoMapa)).toEqual(['rici'])
    expect(CENAS_DO_ELENCO).toContain(e.elencoNoMapa.rici)
  })

  it('a cena de quem não foi escolhido sai da semente: a mesma repete, e em 200 sementes passa por todas', () => {
    expect(criarMundo(7, 'garba').elencoNoMapa).toEqual(criarMundo(7, 'garba').elencoNoMapa)
    const vistas = new Set<IdCena>()
    for (let s = 1; s <= 200; s++) vistas.add(criarMundo(s, 'garba').elencoNoMapa.rici!)
    expect([...vistas].sort()).toEqual([...CENAS_DO_ELENCO].sort())
  })

  it('os cartões não mudam com a escolha: mesma semente, mesmos esconderijos', () => {
    expect(criarMundo(99, 'garba').cartoes).toEqual(criarMundo(99, 'rici').cartoes)
  })

  it('na cena dele, o Rici anda a pé com a aparência fixa; nas outras, não aparece', () => {
    const s = sementeCom('rici', 'rua', 'garba')
    const e = criarMundo(s, 'garba')
    expect(doElenco(e)).toHaveLength(1)
    expect(doElenco(e)[0]).toMatchObject({ id: 'elenco_rici', visual: 'rici', elenco: 'rici', veiculo: null })
    entrarEm(e, 'agencia')
    expect(doElenco(e)).toHaveLength(0)
  })

  it('a cena é a mesma a partida inteira: sai e volta, e ele está lá de novo', () => {
    const s = sementeCom('rici', 'agencia', 'garba')
    const e = criarMundo(s, 'garba')
    expect(doElenco(e)).toHaveLength(0)
    for (let volta = 0; volta < 3; volta++) {
      entrarEm(e, 'agencia')
      expect(doElenco(e).map((f) => f.id)).toEqual(['elenco_rici'])
      entrarEm(e, 'rua')
      expect(doElenco(e)).toHaveLength(0)
    }
    expect(e.elencoNoMapa).toEqual({ rici: 'agencia' })
  })

  it('anda como os outros: sai do lugar, nunca vira alvo do A e leva soco', () => {
    const s = sementeCom('garba', 'rua', 'rici')
    const e = criarMundo(s, 'rici')
    const garba = () => e.figurantes.find((f) => f.elenco === 'garba')!
    const [x0, z0] = [garba().x, garba().z]
    let afastou = 0
    for (let t = 0; t < 1800; t++) {
      passoMundo(e, PARADO)
      afastou = Math.max(afastou, Math.abs(garba().x - x0) + Math.abs(garba().z - z0))
      expect(e.alvo?.id ?? '').not.toBe('elenco_garba')
    }
    expect(afastou).toBeGreaterThan(1)
    // Na frente do jogador, parado: o soco derruba.
    const g = garba()
    Object.assign(e.jogador, { x: 30, z: 12.6, dirX: 1, dirZ: 0 })
    Object.assign(g, { x: 30.7, z: 12.6, xAnterior: 30.7, zAnterior: 12.6, alvoX: 30.7, alvoZ: 12.6, espera: 10_000, andando: false })
    passoMundo(e, { ...PARADO, socar: true })
    for (let t = 1; t < TICKS_SOCO_IMPACTO; t++) passoMundo(e, PARADO)
    expect(g.tombo).toBe(1)
  })
})
